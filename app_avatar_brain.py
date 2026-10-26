"""Authenticated HTTP adapter and tool-free, environment-key-only model call."""
import json
import threading

from avatar_brain import AvatarBrain
from avatar_brain_protocol import MAX_WORLD_BYTES
from avatar_brain_usage import UsageBudget, default_usage_path

ROUTES = frozenset({"/api/avatar/brain/world", "/api/avatar/brain/think",
                    "/api/avatar/brain/poll", "/api/avatar/brain/ack"})
_service = None
_lock = threading.Lock()


def call_model(config, prompt, reason):
    from companion_dialogue_policy import build_model_direct_dialogue_policy
    from llm_client import call_openai_compatible, call_ollama
    from llm_deadline import turn_budget
    from llm_runtime import resolve_runtime_provider

    cfg = dict(config.get("llm") or {})
    cfg.pop("api_key", None)  # Only llm.api_key_env is consulted by the existing client.
    cfg.update(max_tokens=480, max_output_tokens=480, allow_high_output_tokens=True,
               request_timeout=12, turn_timeout_sec=12)
    policy = build_model_direct_dialogue_policy({**config, "character_runtime": {
        **config.get("character_runtime", {}), "model_direct_reply": True}})
    # Prompt contains only bounded, privacy-filtered context, never raw history/config/tools.
    messages = [{"role": "system", "content": policy + "\n" + prompt},
                {"role": "user", "content": "Decide whether to act now. Trigger: " + reason}]

    @turn_budget
    def invoke(*, config):
        if resolve_runtime_provider(cfg) == "ollama":
            return call_ollama(cfg, messages)
        return call_openai_compatible(cfg, messages)

    return invoke(config={"llm": cfg})


def get_service(config_loader):
    global _service
    with _lock:
        if _service is None:
            from memory import remember_avatar_event
            _service = AvatarBrain(config_loader, call_model, remember_avatar_event,
                                   usage=UsageBudget(default_usage_path()))
        return _service


def dispatch(handler, path, service):
    # Called only AFTER the application's origin and token gates.
    try:
        size = int(handler.headers.get("Content-Length", "0"))
        if size < 0 or size > MAX_WORLD_BYTES:
            handler.close_connection = True
            handler._send_json({"ok": False, "error": "world_too_large"}, status=413)
            return
        raw = handler.rfile.read(size)
        body = json.loads(raw or b"{}")
        if not isinstance(body, dict):
            raise ValueError("invalid_body")
    except (ValueError, UnicodeError, RecursionError):
        handler._send_json({"ok": False, "error": "invalid_body"}, status=400)
        return
    try:
        if path.endswith("/world"):
            result = service.update_world(body)
            service.start()
        elif path.endswith("/think"):
            result = service.think(body.get("reason", "idle"))
        elif path.endswith("/ack"):
            result = service.acknowledge(body.get("id"), speech_delivered=body.get("speech_delivered"),
                                         action_indices=body.get("action_indices"))
        else:
            result = service.poll()
        handler._send_json(result)
    except (ValueError, TypeError, RecursionError):
        handler._send_json({"ok": False, "error": "invalid_world"}, status=400)
