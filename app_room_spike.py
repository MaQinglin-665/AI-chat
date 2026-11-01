"""Opt-in intent for the local Godot room. All model output is data."""
import json
import math
import threading
import time

from app_avatar_brain import call_model
from avatar_brain_context import build_context, clean_text

LABELS = {"sofa": ["sit", "look"], "chair": ["sit"], "desk": ["look"],
          "shelf": ["look"], "book": ["look", "pick_up"], "window": ["look"]}
EVENTS = {"entered", "near", "left", "sat", "stood", "spoke", "gave", "idle"}
LOCK = threading.Lock()


def point(p):
    if not isinstance(p, list) or len(p) != 3 or not all(
            type(x) in (float, int) and math.isfinite(x) and abs(x) <= 20 for x in p):
        raise ValueError("invalid point")
    return [round(x, 2) for x in p]


def validate(raw, visible):
    action = raw.get("action")
    target = raw.get("target")
    if action in ("idle", "approach_user", "follow_user", "stop_follow", "stand_up"):
        return {"action": action}
    if action == "go_to" and isinstance(target, list):
        try:
            x, _, z = point(target)
        except ValueError:
            return {"action": "idle"}
        if abs(x) <= 4 and abs(z) <= 3.5:
            return {"action": action, "target": [x, 0, z]}
    if isinstance(target, str) and (
            (action in ("go_to", "look_at") and target in {*visible, "user"})
            or (action == "sit_on" and "sit" in visible.get(target, []))):
        return {"action": action, "target": target}
    if action == "gesture" and raw.get("name") in ("nod", "wave"):
        return {"action": action, "name": raw["name"]}
    if action == "say" and isinstance(raw.get("text"), str):
        return {"action": "say", "text": clean_text(raw["text"], 100),
                "emotion": "happy" if raw.get("emotion") == "happy" else "neutral"}
    return {"action": "idle"}


def decide(cfg, payload):
    reason = payload["event"]
    if reason not in EVENTS:
        raise ValueError("invalid event")
    visible = {k: LABELS[k] for k in payload["objects"] if k in LABELS}
    world = {key: point(payload[key]) for key in ("user", "ai", "user_forward", "ai_forward")}
    world.update(distance=round(math.dist(world["user"], world["ai"]), 2), objects=visible,
                 gaze=payload.get("gaze") if payload.get("gaze") in {*visible, "companion"} else "",
                 user_state=payload.get("user_state") if payload.get("user_state") in ("sit","walk","typing") else "stand",
                 ai_state=payload.get("ai_state") if payload.get("ai_state") in ("walking","sitting") else "idle",
                 recent=[x for x in payload.get("recent", [])[-6:] if x in EVENTS])
    prompt = ("你和用户同在房间。根据事件和感知选择一个自然的意图。只输出JSON对象。"
              "action 可为 go_to,approach_user,follow_user,stop_follow,look_at,sit_on,stand_up,say,gesture,idle。"
              "target 为可见物件名、user 或 go_to 的房间内三维坐标；sit_on 仅限座位。"
              "say 带 text 和 emotion，gesture 带 name (wave/nod)。可以自行决定保持安静。"
              + json.dumps(world, ensure_ascii=False) + build_context(cfg, payload.get("history", [])))
    result = call_model(cfg, prompt, reason)
    return validate(json.loads(result.strip().removeprefix("```json").removesuffix("```")), visible)


def dispatch(handler, cfg):
    if cfg.get("room_spike", {}).get("enabled") is not True:
        handler.close_connection = True
        return handler._send_json({"error":"disabled"}, status=404)
    if not handler._get_security_settings().get("require_api_token"):
        handler.close_connection = True
        return handler._send_json({"error":"token_required"}, status=403)
    try:
        size = int(handler.headers.get("Content-Length", "0"))
        if not 0 < size <= 8192:
            raise ValueError()
        payload = json.loads(handler.rfile.read(size))
        if not isinstance(payload, dict):
            raise ValueError()
    except (ValueError, UnicodeError):
        handler.close_connection = True
        return handler._send_json({"error":"invalid_world"}, status=400)
    if not LOCK.acquire(blocking=False):
        return handler._send_json({"error":"busy"}, status=429)
    start = time.monotonic()
    try:
        intent = decide(cfg, payload)
        handler._send_json({"intent":intent,"latency_ms":round((time.monotonic()-start)*1000)})
    except Exception:
        handler._send_json({"intent":{"action":"idle"},"error":"decision_unavailable"}, status=503)
    finally:
        LOCK.release()
