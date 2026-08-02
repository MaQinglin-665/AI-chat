"""AstrBot transport plugin for the local Xinyu desktop pet.

The plugin intentionally has no LLM, persona, memory, tools, or TTS logic.
It queues OneBot events for the desktop pet's outbound polling client and only
relays the text returned by that client.  Set both variables in the AstrBot
container before enabling it:

    TAFFY_QQ_BRIDGE_ENABLED=1
    TAFFY_QQ_BRIDGE_TOKEN=<long random value>

For a server bound to 127.0.0.1 and exposed only with Tailscale Serve, set
TAFFY_QQ_BRIDGE_AUTH_MODE=tailnet instead. This disables the shared secret;
never use it for a public or LAN-reachable endpoint.
"""

from __future__ import annotations

import asyncio
import inspect
import json
import os
import time
import uuid
from pathlib import Path

from astrbot.api import logger
from astrbot.api.event import AstrMessageEvent, MessageChain, filter
from astrbot.api.star import Context, Star, register
try:  # AstrBot 4.26+ public web helper module.
    from astrbot.api.web import error_response, json_response, request
except ModuleNotFoundError:  # AstrBot 4.25.x keeps plugin web APIs on Quart.
    from quart import jsonify, request

    def json_response(payload):
        return jsonify(payload)

    def error_response(message, status_code=400):
        response = jsonify({"ok": False, "error": str(message)})
        response.status_code = status_code
        return response


PLUGIN_NAME = "astrbot_plugin_taffy_qq_bridge"
QUEUE_PATH = Path(__file__).resolve().parent / "data" / "queue.json"
LEASE_SECONDS = 45
MAX_QUEUE_ITEMS = 1000


@register(PLUGIN_NAME, "Xinyu Desktop Pet contributors", "Cloud QQ transport for the local desktop pet brain.", "0.1.0")
class TaffyQQDesktopBridge(Star):
    def __init__(self, context: Context):
        super().__init__(context)
        self._lock = asyncio.Lock()
        self.context.register_web_api(f"/{PLUGIN_NAME}/poll", self.poll, ["GET"], "Poll queued QQ events")
        self.context.register_web_api(f"/{PLUGIN_NAME}/reply", self.reply, ["POST"], "Reply to one queued QQ event")
        self.context.register_web_api(f"/{PLUGIN_NAME}/send", self.send, ["POST"], "Send a proactive QQ text message")
        logger.info("Taffy QQ bridge registered three Web API routes.")

    @staticmethod
    def _enabled() -> bool:
        return os.environ.get("TAFFY_QQ_BRIDGE_ENABLED", "").strip().lower() in {"1", "true", "yes", "on"}

    @staticmethod
    def _token_ok() -> bool:
        if os.environ.get("TAFFY_QQ_BRIDGE_AUTH_MODE", "token").strip().lower() == "tailnet":
            return True
        expected = os.environ.get("TAFFY_QQ_BRIDGE_TOKEN", "").strip()
        actual = str(request.headers.get("Authorization", "") or "").strip()
        return bool(expected) and actual == f"Bearer {expected}"

    async def _require_token(self):
        if not self._enabled():
            return error_response("Taffy QQ bridge is disabled", status_code=503)
        if not self._token_ok():
            return error_response("Unauthorized", status_code=401)
        return None

    @staticmethod
    async def _request_json_body():
        """Read JSON from both AstrBot's new helper and Quart-backed v4.25.x."""
        getter = getattr(request, "get_json", None)
        if callable(getter):
            try:
                payload = getter(silent=True)
            except TypeError:
                payload = getter()
            if inspect.isawaitable(payload):
                payload = await payload
        else:
            payload = request.json(default={})
            if inspect.isawaitable(payload):
                payload = await payload
        return payload if isinstance(payload, dict) else {}

    @staticmethod
    def _read_queue():
        try:
            payload = json.loads(QUEUE_PATH.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError):
            payload = {}
        events = payload.get("events") if isinstance(payload, dict) else []
        # A partially written or older queue may contain `events: null`.
        # Treat that as an empty queue instead of breaking the polling route.
        if not isinstance(events, list):
            return []
        return [event for event in events if isinstance(event, dict)]

    @staticmethod
    def _write_queue(events):
        QUEUE_PATH.parent.mkdir(parents=True, exist_ok=True)
        temporary = QUEUE_PATH.with_suffix(".tmp")
        temporary.write_text(json.dumps({"events": events[-MAX_QUEUE_ITEMS:]}, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        temporary.replace(QUEUE_PATH)

    @filter.platform_adapter_type(filter.PlatformAdapterType.AIOCQHTTP)
    @filter.event_message_type(filter.EventMessageType.ALL)
    async def queue_onebot_message(self, event: AstrMessageEvent):
        if not self._enabled():
            return
        # Stop AstrBot's own LLM path. The local desktop pet is the only brain.
        event.should_call_llm(False)
        event.stop_event()
        group_id = str(event.get_group_id() or "").strip()
        payload = {
            "event_id": str(getattr(event.message_obj, "message_id", "") or uuid.uuid4()),
            "umo": str(event.unified_msg_origin or "").strip(),
            "chat_type": "group" if group_id else "private",
            "group_id": group_id,
            "sender_id": str(event.get_sender_id() or "").strip(),
            "sender_name": str(event.get_sender_name() or "").strip()[:80],
            "text": str(event.get_message_outline() or event.message_str or "").strip()[:4000],
            "timestamp_ms": int(getattr(event.message_obj, "timestamp", 0) or time.time()) * 1000,
            "lease_until_ms": 0,
        }
        if not payload["umo"] or not payload["text"]:
            return
        async with self._lock:
            events = self._read_queue()
            if any(item.get("event_id") == payload["event_id"] for item in events):
                return
            events.append(payload)
            self._write_queue(events)

    async def poll(self):
        denied = await self._require_token()
        if denied:
            return denied
        now_ms = int(time.time() * 1000)
        async with self._lock:
            events = self._read_queue()
            selected = []
            for event in events:
                if len(selected) >= 10:
                    break
                if int(event.get("lease_until_ms") or 0) > now_ms:
                    continue
                event["lease_until_ms"] = now_ms + LEASE_SECONDS * 1000
                selected.append({key: value for key, value in event.items() if key != "lease_until_ms"})
            self._write_queue(events)
        return json_response({"ok": True, "events": selected})

    async def reply(self):
        denied = await self._require_token()
        if denied:
            return denied
        payload = await self._request_json_body()
        event_id = str(payload.get("event_id", "") or "").strip()
        text = str(payload.get("text", "") or "").strip()[:4000]
        if not event_id or not text:
            return error_response("event_id and text are required", status_code=400)
        async with self._lock:
            events = self._read_queue()
            item = next((event for event in events if event.get("event_id") == event_id), None)
            if not item:
                return json_response({"ok": True, "already_delivered": True})
            umo = str(item.get("umo", "") or "").strip()
            if not umo:
                return error_response("queued event has no UMO", status_code=400)
            await self.context.send_message(umo, MessageChain().message(text))
            self._write_queue([event for event in events if event.get("event_id") != event_id])
        return json_response({"ok": True})

    async def send(self):
        denied = await self._require_token()
        if denied:
            return denied
        payload = await self._request_json_body()
        umo = str(payload.get("umo", "") or "").strip()
        text = str(payload.get("text", "") or "").strip()[:4000]
        if not umo or not text:
            return error_response("umo and text are required", status_code=400)
        await self.context.send_message(umo, MessageChain().message(text))
        logger.info("Taffy QQ bridge sent a proactive text message.")
        return json_response({"ok": True})
