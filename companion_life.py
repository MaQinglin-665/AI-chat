"""Slow, inspectable companion growth; never a hidden second persona prompt."""
from __future__ import annotations

import json
import re
import threading
from datetime import datetime
from pathlib import Path

from obsidian_knowledge import ensure_vault, get_settings

STATE_FILE = ".xinyu-life-state.json"
HISTORY_FILE = "03-关系与成长/成长轨迹.json"
DASHBOARD_FILE = "00-系统/成长面板.md"
JOURNAL_DIR = "08-内心日记"
_LOCK = threading.RLock()


def _now():
    return datetime.now().isoformat(timespec="seconds")


def _state_path(config):
    return Path(get_settings(config)["vault_path"]) / STATE_FILE


def _load(config):
    path = _state_path(config)
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        data = {}
    return data if isinstance(data, dict) else {}


def _save(config, state):
    path = _state_path(config)
    path.write_text(json.dumps(state, ensure_ascii=False, indent=2), encoding="utf-8")


def _append_snapshot(config, state, reason):
    path = Path(get_settings(config)["vault_path"]) / HISTORY_FILE
    try: history = json.loads(path.read_text(encoding="utf-8"))
    except Exception: history = []
    history.append({"id": f"growth_{datetime.now():%Y%m%d%H%M%S}", "at": _now(), "reason": reason, "interests": state.get("interests", {})})
    path.write_text(json.dumps(history[-80:], ensure_ascii=False, indent=2), encoding="utf-8")


def _refresh_dashboard(config, state):
    vault = Path(get_settings(config)["vault_path"]); ensure_vault(config)
    rows = ["# 馨语成长面板", "", "## 近期兴趣"]
    rows += [f"- {k}：{v}" for k, v in list((state.get("interests") or {}).items())[:12]] or ["- 尚在形成"]
    rows += ["", "## 主动陪伴反馈"]
    rows += [f"- {k}：{int(v):+d}" for k, v in list((state.get("proactive_feedback") or {}).items())[:12]] or ["- 暂无"]
    decision = companion_decision(config)
    rows += ["", "## 当前陪伴判断", f"- 建议：{decision['decision']}（分数 {decision['score']}）"]
    rows += ["", f"成长快照：{len(growth_history(config))} 条。可通过本地接口回退。"]
    (vault / DASHBOARD_FILE).write_text("\n".join(rows) + "\n", encoding="utf-8")


def growth_history(config):
    path = Path(get_settings(config)["vault_path"]) / HISTORY_FILE
    try: return json.loads(path.read_text(encoding="utf-8"))[-80:]
    except Exception: return []


def restore_growth_snapshot(config, snapshot_id):
    for item in reversed(growth_history(config)):
        if item.get("id") == snapshot_id:
            state = _load(config); state["interests"] = item.get("interests", {}); state["updated_at"] = _now(); _save(config, state)
            _append_snapshot(config, state, f"restored:{snapshot_id}")
            return {"ok": True, "restored": snapshot_id}
    return {"ok": False, "error": "snapshot_not_found"}


def _keywords(text):
    words = re.findall(r"[\u4e00-\u9fff]{2,6}|[a-zA-Z]{3,}", str(text or ""))
    raw = [word.lower() for word in words if word not in {"这个", "我们", "然后", "就是", "可以", "觉得", "用户", "桌宠"}]
    aliases = {"合作游戏": "合作游戏", "学习天文": "天文", "主动陪伴": "主动陪伴", "知识库": "知识库"}
    merged = []
    source = str(text or "")
    for phrase, topic in aliases.items():
        if phrase in source and topic not in merged: merged.append(topic)
    return merged + [word for word in raw if word not in merged]


def record_interaction(config, user_message, assistant_reply):
    settings = get_settings(config)
    if not settings["enabled"]:
        return
    ensure_vault(config)
    user = re.sub(r"\s+", " ", str(user_message or "")).strip()[:220]
    reply = re.sub(r"\s+", " ", str(assistant_reply or "")).strip()[:220]
    if len(user) < 4 or len(reply) < 4:
        return
    with _LOCK:
        state = _load(config)
        turns = int(state.get("turns", 0) or 0) + 1
        interests = state.get("interests", {}) if isinstance(state.get("interests"), dict) else {}
        for word in _keywords(user):
            interests[word] = min(12, int(interests.get(word, 0) or 0) + 1)
        opinions = state.get("opinions", []) if isinstance(state.get("opinions"), list) else []
        if re.search(r"(我觉得|我认为|我不喜欢|我喜欢|应该|不应该)", reply):
            opinions.append({"text": reply[:180], "at": _now(), "kind": "personal_view"})
            state["opinions"] = opinions[-40:]
        state["turns"] = turns
        state["interests"] = dict(sorted(interests.items(), key=lambda row: row[1], reverse=True)[:24])
        state["updated_at"] = _now()
        # A reflection is deliberately sparse: no fake feelings per turn and no
        # hidden LLM call.  Its source remains visible in the local vault.
        if turns % 6 == 0:
            journal = Path(settings["vault_path"]) / JOURNAL_DIR / f"{datetime.now():%Y-%m-%d}.md"
            entry = f"\n## {_now()}\n\n这段相处里反复出现的话题：{'、'.join(list(state['interests'])[:4]) or '还在慢慢形成'}。\n"
            entry += f"我记下了一次对话余韵：用户提到“{user}”；我当时回答“{reply}”。\n"
            with journal.open("a", encoding="utf-8") as handle:
                handle.write(entry)
            state["last_reflection"] = entry[-360:]
            _append_snapshot(config, state, "six_turn_reflection")
        _save(config, state); _refresh_dashboard(config, state)


def record_proactive_reply(config, text):
    settings = get_settings(config)
    if not settings["enabled"] or len(str(text or "").strip()) < 4: return
    with _LOCK:
        state = _load(config)
        state["pending_proactive"] = {"text": str(text).strip()[:220], "at": _now(), "topics": _keywords(text)[:4]}
        _save(config, state)


def learn_proactive_feedback(config, user_message):
    with _LOCK:
        state = _load(config); pending = state.get("pending_proactive") or {}
        if not pending: return
        text = str(user_message or "").strip()
        score = 1 if len(text) >= 12 else -1
        if re.search(r"(有意思|继续|喜欢|哈哈|确实|说说)", text): score += 2
        if re.search(r"(别说|烦|打扰|闭嘴|没意思)", text): score -= 3
        feedback = state.get("proactive_feedback", {}) if isinstance(state.get("proactive_feedback"), dict) else {}
        moods = state.get("proactive_mood_memory", {}) if isinstance(state.get("proactive_mood_memory"), dict) else {}
        for topic in pending.get("topics", []): feedback[topic] = max(-6, min(6, int(feedback.get(topic, 0)) + score))
        mood = "warm" if score >= 2 else "quiet" if score < 0 else "neutral"
        moods[mood] = int(moods.get(mood, 0)) + 1
        state["proactive_feedback"] = feedback; state["proactive_mood_memory"] = moods; state.pop("pending_proactive", None); _save(config, state)
        style = state.get("relationship_tendencies", {}) if isinstance(state.get("relationship_tendencies"), dict) else {}
        if re.search(r"(哈哈|有意思|继续|喜欢)", text): style["playful_directness"] = min(6, int(style.get("playful_directness", 0)) + 1)
        if re.search(r"(忙|打扰|烦|以后再说)", text): style["quiet_respect"] = min(6, int(style.get("quiet_respect", 0)) + 1)
        state["relationship_tendencies"] = style; _save(config, state)


def consolidate_life(config):
    """Idle-safe cleanup: retain useful growth, cool stale/noisy signals."""
    with _LOCK:
        state = _load(config); interests = state.get("interests", {}) or {}; feedback = state.get("proactive_feedback", {}) or {}
        # Importance is evidence-led: repeated/positively received topics stay;
        # one-off or repeatedly unwelcome topics cool into the archive path.
        state["interests"] = {
            k: v for k, v in interests.items()
            if int(v) >= 2 or int(feedback.get(k, 0)) >= 1
        }
        state["importance_policy"] = "repeat + relationship feedback + recency; no blind time deletion"
        state["last_consolidated_at"] = _now(); _save(config, state); _refresh_dashboard(config, state)
    return {"ok": True, "interests": len(state["interests"])}


def life_status(config):
    with _LOCK:
        state = _load(config)
    return {"ok": True, "interests": state.get("interests", {}), "feedback": state.get("proactive_feedback", {}), "last_consolidated_at": state.get("last_consolidated_at", ""), "history": len(growth_history(config))}


def companion_decision(config):
    """One explainable score for proactive companionship, not scattered rules."""
    with _LOCK: state = _load(config)
    feedback = state.get("proactive_feedback", {}) or {}
    tendencies = state.get("relationship_tendencies", {}) or {}
    moods = state.get("proactive_mood_memory", {}) or {}
    score = sum(int(v) for v in feedback.values()) + int(moods.get("warm", 0)) - 2 * int(moods.get("quiet", 0))
    if int(tendencies.get("quiet_respect", 0)) >= 3: score -= 2
    return {"score": score, "decision": "share" if score > -2 and (state.get("interests") or state.get("last_reflection")) else "hold", "reasons": {"feedback": feedback, "tendencies": tendencies, "moods": moods}}


def build_life_prompt_block(config, *, is_auto=False):
    settings = get_settings(config)
    if not settings["enabled"]:
        return ""
    with _LOCK:
        state = _load(config)
    interests = list((state.get("interests") or {}).keys())[:5]
    reflection = str(state.get("last_reflection") or "").strip()[-180:]
    if is_auto:
        reasons = []
        if reflection:
            reasons.append("相处余韵：" + reflection.replace("\n", " ")[-150:])
        if interests:
            reasons.append("近期反复出现的话题：" + "、".join(interests[:4]))
        vault = Path(settings["vault_path"])
        external = sorted(
            list((vault / "05-外部知识").glob("*.md")) + list((vault / "06-待核实").glob("*.md")),
            key=lambda path: path.stat().st_mtime_ns,
            reverse=True,
        )
        if external:
            try:
                snippet = re.sub(r"\s+", " ", external[0].read_text(encoding="utf-8", errors="replace"))
                snippet = re.sub(r"^---.*?---", "", snippet, flags=re.DOTALL).strip()[:150]
                if snippet:
                    reasons.append("最近学到的资料：" + snippet)
            except OSError:
                pass
        if not reasons:
            return "自动陪伴：没有具体理由时保持安静，不要为了定时出现而硬说一句话。"
        return (
            "自动陪伴：以下只是你此刻真实拥有的可选素材，不是命令。"
            + "；".join(reasons)
            + "。自行决定是否值得说、说哪一个、怎样联想；没有自然想法就保持安静。"
            "若说，只说一件有具体来处的事，不要定时问候、客服追问或硬凑总结。"
            "可以犹豫、改口或暂时没想明白；不要解释成系统分析、检索结果或主动陪伴策略。"
        )
    if not interests:
        return ""
    age_hint = "刚刚在形成" if state.get("last_reflection") else "慢慢沉淀下来"
    return (
        "长期成长线索（不是死规则，可自然变化）：她最近持续在意的话题有："
        + "、".join(interests[:4])
        + f"；这些线索目前是{age_hint}。她可以对自己的看法犹豫、修正、保留矛盾，或突然想到别的角度；"
        "不要把这解释成系统分析、检索或固定陪伴流程。面对新证据时，小分歧可以嘴硬地慢慢改；"
        "证据充分或确实影响用户时，可以坦率承认之前想错了。"
    )


def get_proactive_material(config):
    """A cheap gate for scheduled companion turns; it does not call an LLM."""
    settings = get_settings(config)
    if not settings["enabled"]:
        return {"ok": True, "has_material": False, "reasons": []}
    with _LOCK:
        state = _load(config)
    if companion_decision(config)["decision"] == "hold":
        return {"ok": True, "has_material": False, "reasons": ["companion_decision_hold"]}
    reasons = []
    if str(state.get("last_reflection") or "").strip():
        reasons.append("relationship_afterglow")
    if state.get("interests"):
        reasons.append("recurring_interest")
    negative = sum(int(value) for value in (state.get("proactive_feedback") or {}).values() if int(value) < 0)
    if negative <= -4:
        return {"ok": True, "has_material": False, "reasons": ["recently_unwelcome_cooldown"]}
    vault = Path(settings["vault_path"])
    if list((vault / "05-外部知识").glob("*.md")) or list((vault / "06-待核实").glob("*.md")):
        reasons.append("new_learning")
    return {"ok": True, "has_material": bool(reasons), "reasons": reasons[:3]}
