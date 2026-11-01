"""Opt-in intent for the local Godot room. All model output is data."""
import json
import math
import re
import threading
import time

from llm_streaming import iter_openai_chat_stream
from avatar_brain_context import clean_text

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


PHYSICAL = {"go_to", "approach_user", "follow_user", "stop_follow", "look_at",
            "sit_on", "stand_up", "gesture", "idle"}
STATUS = {"none", "accepted", "running", "completed", "failed", "interrupted"}
NEEDS = {"energy", "boredom", "curiosity", "closeness", "solitude"}


def step(raw, visible):
    # Providers sometimes spell a whitelisted step as go_to(window).
    # Parse only this tiny grammar. Never evaluate model-generated text.
    if isinstance(raw, str):
        match = re.fullmatch(r"([a-z_]+)(?:\(([a-z_]+|[0-9]{1,2})\)|:([a-z_]+|[0-9]{1,2}))?", raw.strip())
        if not match:
            raise ValueError("invalid action syntax")
        kind, paren, colon = match.groups()
        arg = paren or colon
        raw = {"action":kind}
        if arg:
            raw[{"idle":"seconds","gesture":"name"}.get(kind,"target")] = arg
    if not isinstance(raw, dict) or raw.get("action") not in PHYSICAL:
        raise ValueError("invalid action")
    result = validate(raw, visible)
    if result["action"] != raw["action"]:
        raise ValueError("invalid target")
    if result["action"] == "idle":
        result["seconds"] = max(1, min(12, int(raw.get("seconds", 3))))
    return result


def receipt(raw):
    if not isinstance(raw, dict):
        return {}
    allowed = {"action": PHYSICAL, "target": set(LABELS) | {"user"}, "status": STATUS,
               "reason": {"occupied", "unreachable", "input", "timeout", "unavailable", "ok"}}
    return {k:raw[k] for k, choices in allowed.items()
            if isinstance(raw.get(k), str) and raw[k] in choices}


def snapshot(payload):
    objects = payload.get("objects", [])
    visible = {name: LABELS[name] for name in objects if name in LABELS}
    state = {k: point(payload[k]) for k in ("user", "ai")}
    state["objects"] = visible
    state["ai_state"] = payload.get("ai_state") if payload.get("ai_state") in ("walking","sitting","standing") else "idle"
    state["user_state"] = payload.get("user_state") if payload.get("user_state") in ("walk","sit","typing") else "stand"
    state["needs"] = {k:round(max(0,min(1,float(v))),1) for k,v in payload.get("needs",{}).items() if k in NEEDS}
    state["last_move_sec"] = min(3600,max(0,int(payload.get("last_move_sec",0))))
    for key in ("ai_near","user_near"):
        state[key] = payload.get(key) if payload.get(key) in LABELS else ""
    state["last"] = receipt(payload.get("last"))
    goal = payload.get("goal") or {}
    state["goal"] = receipt(goal)
    if isinstance(goal, dict) and isinstance(goal.get("steps"), list):
        state["goal"]["steps"] = [receipt(v) for v in goal["steps"][:5]]
        state["goal"]["step"] = receipt(goal.get("step"))
    state["receipts"] = [receipt(r) for r in payload.get("receipts", [])[-16:]]
    state["recent"] = [receipt(r) for r in payload.get("activity",[])[-3:]]
    return state


def chat_context(payload):
    try:
        state = snapshot(payload)
    except (TypeError, KeyError, ValueError, AttributeError):
        return ""
    return ("你和用户正以化身共处可互动的虚拟房间。根据已接下的目标和执行回执回答。"
            "只承诺已经接下的步骤，未完成时用将来时。" + json.dumps(
                {k:state[k] for k in ("user","ai","ai_near","user_near","ai_state","user_state","goal","last")}, ensure_ascii=False))


POLICY = """你是虚拟房间里的馨语。按需求、事件和回执决定下一步，用户请求优先。重复待机时寻找值得做的事。
只输出JSON {thought:短理由,action:第一步,say:可选短句,goal:可选后续步骤数组}。说与做独立。
完整示例 {"thought":"想看看外面","action":{"action":"go_to","target":"window"},"goal":[{"action":"look_at","target":"window"},{"action":"idle","seconds":3}]}。可选 go_to/look_at/sit_on(target)、approach_user/follow_user/stop_follow/stand_up、gesture(name:nod或wave)、idle(seconds)。
坐旁边用go_to(sofa),sit_on(sofa)；看窗外用go_to(window),look_at(window),idle。只使用state.objects中的物件或user。"""


def call_model(cfg, prompt, reason):
    # Reuse the normal transport and provider options. Keep the static instruction
    # first for prefix caching. Only the bounded state is encoded per call.
    llm = dict(cfg.get("llm") or {})
    llm.pop("api_key", None)
    llm.update(max_output_tokens=200, request_timeout=15, retry_on_length=False)
    return "".join(iter_openai_chat_stream(llm, [{"role":"system","content":POLICY},
        {"role":"user","content":json.dumps(prompt, ensure_ascii=False, separators=(",",":"))}]))


def decide(cfg, payload):
    reason = payload["event"]
    if reason not in EVENTS:
        raise ValueError("invalid event")
    state = snapshot(payload)
    user = clean_text(payload.get("message",""),150) if reason == "spoke" else ""
    prompt = {"trigger":reason, "state":state}
    if user:
        prompt["user_request"] = user
    raw = json.loads(call_model(cfg, prompt, reason).strip().removeprefix("```json").removesuffix("```"))
    first_raw = raw["action"]
    if isinstance(first_raw,str) and first_raw in PHYSICAL:
        first_raw = {**raw, "action":first_raw}
    first = step(first_raw, state["objects"])
    tail = raw.get("goal") or []
    if not isinstance(tail,list) or len(tail)>4: raise ValueError("invalid goal")
    steps = [step(item,state["objects"]) for item in tail]
    if steps and steps[0] == first: steps.pop(0)
    return {"action":first,"goal":steps,"say":clean_text(raw.get("say",""),100),
            "thought":clean_text(raw.get("thought",""),60)}


# Keep one bounded snapshot for the single local room. A different client or
# a missing acknowledgement must send a complete snapshot before using deltas.
_cache = (None, 0, {})


def unpack(packet):
    global _cache
    session, version, previous = _cache
    ident = packet.get("session")
    if not isinstance(ident, str) or not 1 <= len(ident) <= 48:
        raise ValueError("invalid room")
    if packet.get("base") == 0:
        previous = {}
        version = 0
    elif ident != session or packet.get("base") != version:
        raise LookupError("resync")
    fields = {"ai","user","objects","ai_state","user_state","needs","last_move_sec","goal","last","activity","receipts","ai_near","user_near"}
    world = {**previous, **{k:v for k,v in packet["changes"].items() if k in fields}}
    snapshot(world)
    _cache = (ident, version+1, world)
    return {**world,"message":packet.get("message",""),"event":packet["event"]}, version+1


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
        world, version = unpack(payload)
        intent = decide(cfg, world)
        handler._send_json({"version":version,"intent":intent,"latency_ms":round((time.monotonic()-start)*1000)})
    except LookupError:
        handler._send_json({"error":"resync"},status=409)
    except Exception:
        handler._send_json({"intent":{"action":"idle"},"error":"decision_unavailable"}, status=503)
    finally:
        LOCK.release()
