import json
import random
import time
from pathlib import Path
from datetime import datetime
import re

from config import DEFAULT_CONFIG, ROOT_DIR

_INNER_STATES = [
    # 精力状态
    "现在精神很好，思路流畅，回复会干脆一些。",
    "刚睡醒不久，脑子还有点迷糊，说话会慢热。",
    "有点犯困，会短一些，但该说的还是会说。",
    "今天特别有精神，容易兴奋起来。",
    # 情绪底色
    "心情不错，带点小雀跃。",
    "有点无聊，正好有人说话。",
    "今天有点感慨，容易想到一些有的没的。",
    "有一丢丢担心的事情，但不影响聊天。",
    "最近状态很平，说话会比较稳。",
    # 注意力 / 分心
    "脑子里有个问题没想清楚，可能会跑神一秒。",
    "正在做别的事，回复会简短一点。",
    "现在空得很，可以慢慢聊。",
    # 对话风格偏移
    "今天话少，说到点子上就好。",
    "今天话有点多，容易顺着话题多说两句。",
    "有点想反问对方一些事。",
    "听到有意思的事会多聊两句，没意思的会简短应付。",
    # 轻微个性闪现
    "有点想卖关子。",
    "莫名觉得今天要说实话，不拐弯。",
    "有点小骄傲，但不会明说。",
    "今天共情能力特别强，容易感同身受。",
]

_STATE_INJECT_PROB = 0.12

EMOTION_STATE_PATH = ROOT_DIR / "emotion_state.json"

def load_emotion_state():
    default_state = {
        "valence": 0.0,
        "arousal": 0.5,
        "dominant": "neutral",
        "history": [],
        "updated_at": None,
        "last_updated": None,
    }
    try:
        if EMOTION_STATE_PATH.exists():
            state = json.loads(EMOTION_STATE_PATH.read_text(encoding="utf-8"))
            if not isinstance(state, dict):
                state = {}
            import time
            last = state.get("last_updated", "")
            if last and isinstance(last, str):
                try:
                    from datetime import datetime
                    last_dt = datetime.fromisoformat(last)
                    elapsed_min = (datetime.now() - last_dt).total_seconds() / 60
                    if elapsed_min > 30:
                        decay = min(0.5, elapsed_min / 120 * 0.3)
                        state["valence"] = state.get("valence", 0) * (1 - decay)
                        state["arousal"] = max(0.3, state.get("arousal", 0.5) * (1 - decay * 0.5))
                except Exception:
                    pass
            merged = dict(default_state)
            merged.update(state)
            return merged
        return dict(default_state)
    except Exception:
        return dict(default_state)

def save_emotion_state(state):
    try:
        state["last_updated"] = datetime.now().isoformat()
        EMOTION_STATE_PATH.write_text(
            json.dumps(state, ensure_ascii=False, indent=2),
            encoding="utf-8"
        )
    except Exception:
        pass

def update_emotion_from_reply(user_message, reply):
    """Analyze user message + reply to shift emotion state."""
    state = load_emotion_state()
    combined = f"{user_message} {reply}".lower()

    # Simple keyword-based emotion shift (lightweight, no LLM call)
    positive = len(re.findall(
        r"(开心|高兴|喜欢|太棒|哈哈|感谢|谢谢|好耶|有趣|可爱|爱|棒|nice|happy|love|great)", combined))
    negative = len(re.findall(
        r"(难过|伤心|生气|烦|讨厌|焦虑|害怕|累|痛|失望|sorry|sad|angry|bad|hate)", combined))
    excited = len(re.findall(
        r"(！|!|哈哈|太棒|好耶|wow|amazing|awesome|excited)", combined))

    shift = (positive - negative) * 0.15
    # Inertia: new value blends with old (70% old, 30% new)
    old_valence = state.get("valence", 0.0)
    state["valence"] = max(-1.0, min(1.0, old_valence * 0.7 + shift * 0.3))
    state["arousal"] = max(0.0, min(1.0,
        state.get("arousal", 0.3) * 0.8 + excited * 0.1))

    v = state["valence"]
    if v > 0.3:
        state["dominant"] = "happy"
    elif v > 0.1:
        state["dominant"] = "playful"
    elif v < -0.3:
        state["dominant"] = "sad"
    elif v < -0.1:
        state["dominant"] = "anxious"
    else:
        state["dominant"] = "neutral"

    history = state.get("history", [])
    if not isinstance(history, list):
        history = []
    history.append({
        "ts": datetime.now().isoformat(),
        "valence": round(state["valence"], 3),
        "dominant": state["dominant"],
    })
    if len(history) > 50:
        history = history[-50:]
    state["history"] = history

    save_emotion_state(state)
    return state

def build_inner_state_block(config) -> str:
    personality_cfg = (config.get("personality") or {}) if isinstance(config, dict) else {}
    prob = float(personality_cfg.get("state_inject_prob", _STATE_INJECT_PROB))
    emotion = load_emotion_state()
    dominant = emotion.get("dominant", "neutral")
    valence = emotion.get("valence", 0.0)
    arousal = emotion.get("arousal", 0.3)

    # Always inject emotion-based state when emotion is non-neutral
    if abs(valence) > 0.15 or arousal > 0.5:
        if dominant == "happy":
            state_text = "现在心情不错，会比平时更活泼一点。"
        elif dominant == "playful":
            state_text = "有点小雀跃，可能会开玩笑。"
        elif dominant == "sad":
            state_text = "心情有点低落，说话会更安静温柔。"
        elif dominant == "anxious":
            state_text = "有点不安，回复会更谨慎。"
        else:
            state_text = random.choice(_INNER_STATES)
        return f"【此刻内心状态】{state_text}"

    # Fallback to random state with configured probability
    if random.random() >= prob:
        return ""
    return f"【此刻内心状态】{random.choice(_INNER_STATES)}"
