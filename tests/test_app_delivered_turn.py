import threading
import time

from app_delivered_turn import DeliveredTurnRegistry


def test_delivery_registry_commits_exactly_once_and_ignores_duplicates():
    committed = []
    registry = DeliveredTurnRegistry(
        ttl_seconds=30,
        max_entries=4,
        now_func=lambda: 10.0,
        token_func=lambda _size: "delivery_receipt_0123456789abcd",
    )

    delivery_id = registry.stage(lambda: committed.append("turn"))

    assert delivery_id == "delivery_receipt_0123456789abcd"
    assert registry.acknowledge(delivery_id) == {"ok": True, "status": "committed"}
    assert registry.acknowledge(delivery_id) == {"ok": True, "status": "already_committed"}
    assert registry.acknowledge("unknown_delivery_0123456789") == {"ok": False, "status": "unknown"}
    assert committed == ["turn"]


def test_delivery_registry_expires_and_evicts_without_committing():
    now = {"value": 0.0}
    token_values = iter(
        [
            "delivery_receipt_0123456789aaaa",
            "delivery_receipt_0123456789bbbb",
            "delivery_receipt_0123456789cccc",
        ]
    )
    committed = []
    registry = DeliveredTurnRegistry(
        ttl_seconds=2,
        max_entries=1,
        now_func=lambda: now["value"],
        token_func=lambda _size: next(token_values),
    )

    first = registry.stage(lambda: committed.append("first"))
    second = registry.stage(lambda: committed.append("second"))
    assert registry.acknowledge(first) == {"ok": False, "status": "evicted"}
    assert registry.acknowledge(second) == {"ok": True, "status": "committed"}

    expiring = registry.stage(lambda: committed.append("expired"))
    now["value"] = 3.0
    assert registry.acknowledge(expiring) == {"ok": False, "status": "expired"}
    assert committed == ["second"]


def test_delivery_registry_consumes_failed_commit_without_retrying():
    calls = []
    registry = DeliveredTurnRegistry(
        token_func=lambda _size: "delivery_receipt_0123456789failed",
    )

    def fail_once():
        calls.append("attempt")
        raise RuntimeError("partial commit risk")

    delivery_id = registry.stage(fail_once)

    assert registry.acknowledge(delivery_id) == {"ok": False, "status": "commit_failed"}
    assert registry.acknowledge(delivery_id) == {"ok": False, "status": "commit_failed"}
    assert calls == ["attempt"]


def test_delivery_registry_serializes_concurrent_commit_callbacks():
    token_values = iter(
        [
            "delivery_receipt_0123456789first",
            "delivery_receipt_0123456789second",
        ]
    )
    registry = DeliveredTurnRegistry(token_func=lambda _size: next(token_values))
    started = threading.Event()
    release_first = threading.Event()
    order = []
    results = []

    def first_commit():
        order.append("first_started")
        started.set()
        assert release_first.wait(timeout=2)
        order.append("first_finished")

    def second_commit():
        order.append("second_started")
        order.append("second_finished")

    first_id = registry.stage(first_commit)
    second_id = registry.stage(second_commit)
    first_thread = threading.Thread(target=lambda: results.append(registry.acknowledge(first_id)))
    second_thread = threading.Thread(target=lambda: results.append(registry.acknowledge(second_id)))

    first_thread.start()
    assert started.wait(timeout=2)
    second_thread.start()
    time.sleep(0.03)
    assert order == ["first_started"]
    release_first.set()
    first_thread.join(timeout=2)
    second_thread.join(timeout=2)

    assert order == ["first_started", "first_finished", "second_started", "second_finished"]
    assert sorted(results, key=lambda value: value["status"]) == [
        {"ok": True, "status": "committed"},
        {"ok": True, "status": "committed"},
    ]


def test_delivery_registry_clear_waits_for_an_inflight_commit():
    registry = DeliveredTurnRegistry(token_func=lambda _size: "delivery_receipt_0123456789clear")
    started = threading.Event()
    release = threading.Event()
    cleared = threading.Event()
    committed = []

    def commit():
        started.set()
        assert release.wait(timeout=2)
        committed.append("done")

    delivery_id = registry.stage(commit)
    ack_result = []
    ack_thread = threading.Thread(target=lambda: ack_result.append(registry.acknowledge(delivery_id)))
    clear_thread = threading.Thread(target=lambda: (registry.clear(), cleared.set()))
    ack_thread.start()
    assert started.wait(timeout=2)
    clear_thread.start()
    time.sleep(0.03)
    assert cleared.is_set() is False
    release.set()
    ack_thread.join(timeout=2)
    clear_thread.join(timeout=2)

    assert committed == ["done"]
    assert ack_result == [{"ok": True, "status": "committed"}]
    assert cleared.is_set() is True
    assert registry.acknowledge(delivery_id) == {"ok": False, "status": "unknown"}
