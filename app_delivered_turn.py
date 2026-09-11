"""One-shot, process-local delivery receipts for assistant-turn persistence."""

from __future__ import annotations

from collections import OrderedDict
import secrets
import threading
import time


DEFAULT_DELIVERY_TTL_SECONDS = 300.0
DEFAULT_MAX_PENDING_DELIVERIES = 96
MAX_DELIVERY_ID_LENGTH = 128


class DeliveredTurnRegistry:
    """Hold uncommitted assistant turns until the current renderer confirms delivery.

    Entries intentionally live only in process memory. A restart, expiry, eviction, or
    missing acknowledgement leaves the turn uncommitted rather than inventing shared
    history that the user may never have seen. Completed outcomes remain briefly so a
    client can safely retry after losing an acknowledgement response.
    """

    def __init__(
        self,
        *,
        ttl_seconds=DEFAULT_DELIVERY_TTL_SECONDS,
        max_entries=DEFAULT_MAX_PENDING_DELIVERIES,
        now_func=time.monotonic,
        token_func=secrets.token_urlsafe,
    ):
        self._ttl_seconds = max(0.1, float(ttl_seconds or DEFAULT_DELIVERY_TTL_SECONDS))
        self._max_entries = max(1, int(max_entries or DEFAULT_MAX_PENDING_DELIVERIES))
        self._now_func = now_func
        self._token_func = token_func
        self._lock = threading.RLock()
        # Receipt commits can update shared character-session state. Serialize the
        # whole callback, rather than merely registry lookup, so two delivered turns
        # cannot both derive state from the same previous session snapshot.
        self._commit_lock = threading.RLock()
        self._entries = OrderedDict()
        self._outcomes = OrderedDict()

    @staticmethod
    def _normalize_delivery_id(value):
        if not isinstance(value, str):
            return ""
        delivery_id = value.strip()
        if not delivery_id or len(delivery_id) > MAX_DELIVERY_ID_LENGTH:
            return ""
        if not all(char.isascii() and (char.isalnum() or char in "_-") for char in delivery_id):
            return ""
        return delivery_id

    def _record_outcome_locked(self, delivery_id, status, now):
        self._outcomes.pop(delivery_id, None)
        self._outcomes[delivery_id] = {
            "expires_at": now + self._ttl_seconds,
            "status": str(status or "unknown"),
        }
        while len(self._outcomes) > self._max_entries:
            self._outcomes.popitem(last=False)

    def _prune_locked(self, now):
        expired = [
            delivery_id
            for delivery_id, entry in self._entries.items()
            if float(entry["expires_at"]) <= now
        ]
        for delivery_id in expired:
            self._entries.pop(delivery_id, None)
            self._record_outcome_locked(delivery_id, "expired", now)
        expired_outcomes = [
            delivery_id
            for delivery_id, outcome in self._outcomes.items()
            if float(outcome["expires_at"]) <= now
        ]
        for delivery_id in expired_outcomes:
            self._outcomes.pop(delivery_id, None)

    @staticmethod
    def _outcome_payload(status):
        safe_status = str(status or "unknown")
        if safe_status == "committed":
            return {"ok": True, "status": "already_committed"}
        return {"ok": False, "status": safe_status}

    def stage(self, commit_func):
        """Stage one commit callable and return its opaque acknowledgement token."""
        if not callable(commit_func):
            return ""
        now = float(self._now_func())
        with self._lock:
            self._prune_locked(now)
            while len(self._entries) >= self._max_entries:
                evicted_id, _entry = self._entries.popitem(last=False)
                self._record_outcome_locked(evicted_id, "evicted", now)
            for _ in range(8):
                delivery_id = self._normalize_delivery_id(self._token_func(24))
                if (
                    delivery_id
                    and delivery_id not in self._entries
                    and delivery_id not in self._outcomes
                ):
                    self._entries[delivery_id] = {
                        "expires_at": now + self._ttl_seconds,
                        "commit": commit_func,
                    }
                    return delivery_id
        return ""

    def acknowledge(self, delivery_id):
        """Commit one staged turn at most once and preserve a retryable outcome.

        ``committed`` and ``already_committed`` are the only successful outcomes.
        Unknown, expired, evicted, invalid, and failed receipts deliberately remain
        non-success so a renderer never mistakes an uncommitted turn for delivery.
        """
        normalized = self._normalize_delivery_id(delivery_id)
        if not normalized:
            return {"ok": False, "status": "invalid"}
        with self._commit_lock:
            now = float(self._now_func())
            with self._lock:
                self._prune_locked(now)
                outcome = self._outcomes.get(normalized)
                if isinstance(outcome, dict):
                    return self._outcome_payload(outcome.get("status"))
                entry = self._entries.pop(normalized, None)
                if not entry:
                    return {"ok": False, "status": "unknown"}
            try:
                entry["commit"]()
            except Exception:
                # The closure may have applied a partial legacy memory side effect.
                # Do not re-run it automatically; report the failure honestly and
                # retain the result for duplicate acknowledgements.
                with self._lock:
                    self._record_outcome_locked(normalized, "commit_failed", float(self._now_func()))
                return {"ok": False, "status": "commit_failed"}
            with self._lock:
                self._record_outcome_locked(normalized, "committed", float(self._now_func()))
            return {"ok": True, "status": "committed"}

    def clear(self):
        # Wait for an active callback before clearing. Once this method returns,
        # an acknowledgement from the prior runtime cannot mutate local state.
        with self._commit_lock:
            with self._lock:
                self._entries.clear()
                self._outcomes.clear()

    def pending_count(self):
        now = float(self._now_func())
        with self._lock:
            self._prune_locked(now)
            return len(self._entries)
