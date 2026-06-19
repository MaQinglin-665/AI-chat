from http import HTTPStatus

from app_memory_route import handle_memory_get_route, handle_memory_post_route


class RouteRecorder:
    def __init__(self):
        self.json = []
        self.exceptions = []

    def send_json(self, data, status=HTTPStatus.OK, extra_headers=None):
        self.json.append({"data": data, "status": status, "headers": extra_headers})

    def log_exception(self, *args, **kwargs):
        self.exceptions.append((args, kwargs))


def _diag(exc):
    return {"error": str(exc)}


def _get_deps(recorder, **overrides):
    deps = {
        "send_json_func": recorder.send_json,
        "load_config_func": lambda: {"memory": {"enabled": True}},
        "load_manual_persona_card_func": lambda: {"name": "Mimo"},
        "get_learning_candidates_for_review_func": lambda _cfg: {"ok": True, "items": ["c1"]},
        "get_learning_samples_for_review_func": lambda _cfg: {"ok": True, "items": ["s1"]},
        "get_core_memories_for_review_func": lambda _cfg: {"ok": True, "items": ["core"]},
        "get_short_term_memories_for_review_func": lambda _cfg: {"ok": True, "items": ["short"]},
        "get_memory_debug_snapshot_func": lambda _cfg: {"ok": True, "debug": {}},
        "log_backend_exception_func": recorder.log_exception,
        "diagnostic_payload_func": _diag,
    }
    deps.update(overrides)
    return deps


def _post_deps(recorder, body=None, ok=True, **overrides):
    def read_json_body(**_kwargs):
        if not ok:
            recorder.send_json(_kwargs.get("invalid_payload"), status=HTTPStatus.BAD_REQUEST)
            return None, False
        return body if body is not None else {}, True

    deps = {
        "read_json_body_func": read_json_body,
        "send_json_func": recorder.send_json,
        "load_config_func": lambda: {"memory": {"enabled": True}},
        "save_manual_persona_card_func": lambda payload: {"saved": payload},
        "reload_learning_review_data_func": lambda _cfg: {"ok": True, "reloaded": True},
        "promote_learning_review_candidates_func": lambda _cfg, ids: {"ok": bool(ids), "ids": ids},
        "update_learning_review_entries_func": (
            lambda _cfg, action, pool, ids, delta, quick_settings: {
                "ok": True,
                "action": action,
                "pool": pool,
                "ids": ids,
                "delta": delta,
                "quick_settings": quick_settings,
            }
        ),
        "undo_last_learning_review_action_func": lambda _cfg: {"ok": True, "undo": True},
        "update_core_memory_entries_func": (
            lambda _cfg, action, ids, delta, patch: {
                "ok": True,
                "target": "core",
                "action": action,
                "ids": ids,
                "delta": delta,
                "patch": patch,
            }
        ),
        "update_short_term_memory_entries_func": (
            lambda _cfg, action, ids, delta, patch: {
                "ok": True,
                "target": "short",
                "action": action,
                "ids": ids,
                "delta": delta,
                "patch": patch,
            }
        ),
        "log_backend_exception_func": recorder.log_exception,
        "diagnostic_payload_func": _diag,
    }
    deps.update(overrides)
    return deps


def test_memory_get_persona_card_bypasses_config_load():
    recorder = RouteRecorder()

    handled = handle_memory_get_route(
        "/api/persona_card",
        **_get_deps(
            recorder,
            load_config_func=lambda: (_ for _ in ()).throw(AssertionError("unused")),
        ),
    )

    assert handled is True
    assert recorder.json[-1]["data"] == {"name": "Mimo"}


def test_memory_get_review_route_returns_diagnostic_payload_on_failure():
    recorder = RouteRecorder()

    handled = handle_memory_get_route(
        "/api/learning/candidates",
        **_get_deps(
            recorder,
            get_learning_candidates_for_review_func=lambda _cfg: (_ for _ in ()).throw(
                RuntimeError("review unavailable")
            ),
        ),
    )

    assert handled is True
    assert recorder.json[-1]["status"] == HTTPStatus.INTERNAL_SERVER_ERROR
    assert recorder.json[-1]["data"] == {"ok": False, "error": "review unavailable"}
    assert recorder.exceptions


def test_memory_post_promote_marks_payload_failure_as_bad_request():
    recorder = RouteRecorder()

    handled = handle_memory_post_route(
        "/api/learning/promote",
        **_post_deps(recorder, body={"candidate_ids": []}),
    )

    assert handled is True
    assert recorder.json[-1]["status"] == HTTPStatus.BAD_REQUEST
    assert recorder.json[-1]["data"] == {"ok": False, "ids": []}


def test_memory_post_learning_update_routes_undo_action():
    recorder = RouteRecorder()

    handled = handle_memory_post_route(
        "/api/learning/update",
        **_post_deps(recorder, body={"action": " undo "}),
    )

    assert handled is True
    assert recorder.json[-1]["status"] == HTTPStatus.OK
    assert recorder.json[-1]["data"] == {"ok": True, "undo": True}


def test_memory_post_short_update_passes_patch_payload():
    recorder = RouteRecorder()

    handled = handle_memory_post_route(
        "/api/memory/short/update",
        **_post_deps(
            recorder,
            body={"action": "pin", "ids": ["m1"], "delta": 0.2, "patch": {"priority": 3}},
        ),
    )

    assert handled is True
    assert recorder.json[-1]["data"] == {
        "ok": True,
        "target": "short",
        "action": "pin",
        "ids": ["m1"],
        "delta": 0.2,
        "patch": {"priority": 3},
    }


def test_memory_post_persona_invalid_json_keeps_legacy_error_shape():
    recorder = RouteRecorder()

    handled = handle_memory_post_route(
        "/api/persona_card",
        **_post_deps(recorder, ok=False),
    )

    assert handled is True
    assert recorder.json[-1]["status"] == HTTPStatus.BAD_REQUEST
    assert recorder.json[-1]["data"] == {"error": "Invalid JSON body."}
