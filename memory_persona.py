import json
import re
from datetime import datetime


LEGACY_MANUAL_PERSONA_CARD_FIELDS = (
    "identity",
    "user_preferences",
    "user_dislikes",
    "common_topics",
    "reply_style",
    "companionship_style",
)

MANUAL_PERSONA_CARD_FIELDS = (
    "character_name",
    "user_alias",
    "personality_tags",
    "speaking_style",
    "catchphrases",
    "likes",
    "dislikes",
    "initiative_level",
    "relationship_role",
    *LEGACY_MANUAL_PERSONA_CARD_FIELDS,
)

MANUAL_PERSONA_CARD_LIMITS = {
    "character_name": 80,
    "user_alias": 80,
    "personality_tags": 220,
    "speaking_style": 360,
    "catchphrases": 220,
    "likes": 400,
    "dislikes": 320,
    "initiative_level": 24,
    "relationship_role": 24,
    "identity": 180,
    "user_preferences": 400,
    "user_dislikes": 300,
    "common_topics": 320,
    "reply_style": 360,
    "companionship_style": 360,
}

PERSONA_RELATIONSHIP_ROLES = (
    "学习搭子",
    "桌面伙伴",
    "情绪陪伴",
    "工作助手",
)

PERSONA_INITIATIVE_LEVELS = (
    "低",
    "适中",
    "高",
    "很高",
)


def default_normalize_text(value, max_len=220):
    if isinstance(value, (list, tuple, set)):
        value = ", ".join(str(item).strip() for item in value if str(item).strip())
    text = re.sub(r"\s+", " ", str(value or "")).strip()
    return text[: max(0, int(max_len or 0))]


def _normalize_value(value, max_len=240, normalize_text_func=None):
    normalize = normalize_text_func or default_normalize_text
    if isinstance(value, (list, tuple, set)):
        value = ", ".join(str(item).strip() for item in value if str(item).strip())
    return normalize(value, max_len=max_len)


def is_regression_persona_placeholder(value):
    return bool(re.fullmatch(r"回归检查-\d+", str(value or "").strip()))


def is_legacy_only_persona_text(value):
    parts = [part.strip() for part in re.split(r"[;；]", str(value or "").strip()) if part.strip()]
    if not parts:
        return False
    return all(
        re.fullmatch(r"主动程度[:：]\s*(?:低|适中|高|很高)\s*", part)
        or re.fullmatch(r"关系定位[:：]\s*(?:桌面伙伴|学习搭子|情绪陪伴|工作助手)\s*", part)
        for part in parts
    )


def normalize_persona_relationship_role(value, normalize_text_func=None):
    text = _normalize_value(
        value,
        max_len=MANUAL_PERSONA_CARD_LIMITS["relationship_role"],
        normalize_text_func=normalize_text_func,
    )
    if not text:
        return ""
    if text in PERSONA_RELATIONSHIP_ROLES:
        return text
    if any(keyword in text for keyword in ("学习", "搭子")):
        return PERSONA_RELATIONSHIP_ROLES[0]
    if any(keyword in text for keyword in ("桌面", "伙伴")):
        return PERSONA_RELATIONSHIP_ROLES[1]
    if any(keyword in text for keyword in ("情绪", "陪伴", "安慰")):
        return PERSONA_RELATIONSHIP_ROLES[2]
    if any(keyword in text for keyword in ("工作", "助手", "效率")):
        return PERSONA_RELATIONSHIP_ROLES[3]
    lowered = text.lower()
    if any(keyword in lowered for keyword in ("study", "learn")):
        return PERSONA_RELATIONSHIP_ROLES[0]
    if any(keyword in lowered for keyword in ("desktop", "partner")):
        return PERSONA_RELATIONSHIP_ROLES[1]
    if any(keyword in lowered for keyword in ("emotion", "companion", "support")):
        return PERSONA_RELATIONSHIP_ROLES[2]
    if any(keyword in lowered for keyword in ("work", "assistant", "productivity")):
        return PERSONA_RELATIONSHIP_ROLES[3]
    return ""


def normalize_persona_initiative_level(value, normalize_text_func=None):
    text = _normalize_value(
        value,
        max_len=MANUAL_PERSONA_CARD_LIMITS["initiative_level"],
        normalize_text_func=normalize_text_func,
    )
    if not text:
        return ""
    direct_map = {
        "低": PERSONA_INITIATIVE_LEVELS[0],
        "较低": PERSONA_INITIATIVE_LEVELS[0],
        "被动": PERSONA_INITIATIVE_LEVELS[0],
        "少打扰": PERSONA_INITIATIVE_LEVELS[0],
        "适中": PERSONA_INITIATIVE_LEVELS[1],
        "中": PERSONA_INITIATIVE_LEVELS[1],
        "平衡": PERSONA_INITIATIVE_LEVELS[1],
        "一般": PERSONA_INITIATIVE_LEVELS[1],
        "高": PERSONA_INITIATIVE_LEVELS[2],
        "较高": PERSONA_INITIATIVE_LEVELS[2],
        "主动": PERSONA_INITIATIVE_LEVELS[2],
        "很高": PERSONA_INITIATIVE_LEVELS[3],
        "超高": PERSONA_INITIATIVE_LEVELS[3],
    }
    if text in direct_map:
        return direct_map[text]
    lowered = text.lower()
    if "low" in lowered:
        return PERSONA_INITIATIVE_LEVELS[0]
    if "very high" in lowered or "ultra" in lowered:
        return PERSONA_INITIATIVE_LEVELS[3]
    if "high" in lowered:
        return PERSONA_INITIATIVE_LEVELS[2]
    if "mid" in lowered or "medium" in lowered:
        return PERSONA_INITIATIVE_LEVELS[1]
    if "主动" in text:
        return PERSONA_INITIATIVE_LEVELS[2]
    if "低打扰" in text:
        return PERSONA_INITIATIVE_LEVELS[0]
    return text


def extract_alias_from_identity(identity, normalize_text_func=None):
    text = str(identity or "").strip()
    if not text:
        return ""
    patterns = (
        r"(?:叫我|称呼我|喊我)([^\s,，。；;、]{1,20})",
        r"(?:用户称呼|称呼用户)\s*[:：]\s*([^\s,，。；;、]{1,20})",
    )
    for pattern in patterns:
        match = re.search(pattern, text)
        if match:
            return _normalize_value(
                match.group(1),
                max_len=MANUAL_PERSONA_CARD_LIMITS["user_alias"],
                normalize_text_func=normalize_text_func,
            )
    return ""


def _compose_legacy_identity(card, normalize_text_func=None):
    parts = []
    character_name = str(card.get("character_name", "")).strip()
    user_alias = str(card.get("user_alias", "")).strip()
    if character_name:
        parts.append(f"角色名：{character_name}")
    if user_alias:
        parts.append(f"用户称呼：{user_alias}")
    return _normalize_value(
        "; ".join(parts),
        max_len=MANUAL_PERSONA_CARD_LIMITS["identity"],
        normalize_text_func=normalize_text_func,
    )


def _compose_legacy_reply_style(card, normalize_text_func=None):
    parts = []
    speaking_style = str(card.get("speaking_style", "")).strip()
    catchphrases = str(card.get("catchphrases", "")).strip()
    if speaking_style:
        parts.append(speaking_style)
    if catchphrases:
        parts.append(f"口头禅：{catchphrases}")
    return _normalize_value(
        "; ".join(parts),
        max_len=MANUAL_PERSONA_CARD_LIMITS["reply_style"],
        normalize_text_func=normalize_text_func,
    )


def _compose_legacy_companionship_style(card, normalize_text_func=None):
    parts = []
    personality_tags = str(card.get("personality_tags", "")).strip()
    initiative_level = str(card.get("initiative_level", "")).strip()
    relationship_role = str(card.get("relationship_role", "")).strip()
    if personality_tags:
        parts.append(f"性格标签：{personality_tags}")
    if initiative_level:
        parts.append(f"主动程度：{initiative_level}")
    if relationship_role:
        parts.append(f"关系定位：{relationship_role}")
    return _normalize_value(
        "; ".join(parts),
        max_len=MANUAL_PERSONA_CARD_LIMITS["companionship_style"],
        normalize_text_func=normalize_text_func,
    )


def normalize_manual_persona_card(card, normalize_text_func=None):
    src = card if isinstance(card, dict) else {}
    if any(is_regression_persona_placeholder(src.get(key, "")) for key in ("character_name", "identity")):
        src = {}
    normalized = {}
    for key in MANUAL_PERSONA_CARD_FIELDS:
        if key == "relationship_role":
            normalized[key] = normalize_persona_relationship_role(
                src.get(key, ""), normalize_text_func=normalize_text_func
            )
            continue
        if key == "initiative_level":
            normalized[key] = normalize_persona_initiative_level(
                src.get(key, ""), normalize_text_func=normalize_text_func
            )
            continue
        max_len = MANUAL_PERSONA_CARD_LIMITS.get(key, 240)
        value = _normalize_value(src.get(key, ""), max_len=max_len, normalize_text_func=normalize_text_func)
        if is_regression_persona_placeholder(value):
            value = ""
        if key in {"personality_tags", "companionship_style"} and is_legacy_only_persona_text(value):
            value = ""
        normalized[key] = value

    identity = str(normalized.get("identity", "")).strip()
    companionship_style = str(normalized.get("companionship_style", "")).strip()

    if not normalized.get("character_name") and identity:
        normalized["character_name"] = _normalize_value(
            identity,
            max_len=MANUAL_PERSONA_CARD_LIMITS["character_name"],
            normalize_text_func=normalize_text_func,
        )
    if not normalized.get("user_alias") and identity:
        normalized["user_alias"] = extract_alias_from_identity(identity, normalize_text_func=normalize_text_func)
    if not normalized.get("likes"):
        normalized["likes"] = normalized.get("user_preferences", "") or normalized.get("common_topics", "")
    if not normalized.get("dislikes"):
        normalized["dislikes"] = normalized.get("user_dislikes", "")
    if not normalized.get("speaking_style"):
        normalized["speaking_style"] = normalized.get("reply_style", "")
    if (
        not normalized.get("personality_tags")
        and companionship_style
        and not is_legacy_only_persona_text(companionship_style)
    ):
        normalized["personality_tags"] = _normalize_value(
            companionship_style,
            max_len=MANUAL_PERSONA_CARD_LIMITS["personality_tags"],
            normalize_text_func=normalize_text_func,
        )
    if not normalized.get("relationship_role") and companionship_style:
        normalized["relationship_role"] = normalize_persona_relationship_role(
            companionship_style, normalize_text_func=normalize_text_func
        )
    if not normalized.get("initiative_level") and companionship_style:
        normalized["initiative_level"] = normalize_persona_initiative_level(
            companionship_style, normalize_text_func=normalize_text_func
        )
    if not normalized.get("initiative_level"):
        normalized["initiative_level"] = PERSONA_INITIATIVE_LEVELS[1]

    if not normalized.get("identity"):
        normalized["identity"] = _compose_legacy_identity(normalized, normalize_text_func=normalize_text_func)
    if not normalized.get("user_preferences"):
        normalized["user_preferences"] = _normalize_value(
            normalized.get("likes", ""),
            max_len=MANUAL_PERSONA_CARD_LIMITS["user_preferences"],
            normalize_text_func=normalize_text_func,
        )
    if not normalized.get("user_dislikes"):
        normalized["user_dislikes"] = _normalize_value(
            normalized.get("dislikes", ""),
            max_len=MANUAL_PERSONA_CARD_LIMITS["user_dislikes"],
            normalize_text_func=normalize_text_func,
        )
    if not normalized.get("common_topics") and normalized.get("likes"):
        normalized["common_topics"] = _normalize_value(
            normalized.get("likes", ""),
            max_len=MANUAL_PERSONA_CARD_LIMITS["common_topics"],
            normalize_text_func=normalize_text_func,
        )
    if not normalized.get("reply_style"):
        normalized["reply_style"] = _compose_legacy_reply_style(normalized, normalize_text_func=normalize_text_func)
    if not normalized.get("companionship_style"):
        normalized["companionship_style"] = _compose_legacy_companionship_style(
            normalized, normalize_text_func=normalize_text_func
        )

    normalized["updated_at"] = str(src.get("updated_at", "")).strip()
    return normalized


def load_manual_persona_card(path, normalize_text_func=None):
    if not path.exists():
        return normalize_manual_persona_card({}, normalize_text_func=normalize_text_func)
    try:
        data = json.loads(path.read_text(encoding="utf-8-sig"))
    except Exception:
        return normalize_manual_persona_card({}, normalize_text_func=normalize_text_func)
    return normalize_manual_persona_card(
        data if isinstance(data, dict) else {},
        normalize_text_func=normalize_text_func,
    )


def save_manual_persona_card(path, card, normalize_text_func=None, now_func=None):
    safe = normalize_manual_persona_card(card, normalize_text_func=normalize_text_func)
    now = now_func() if callable(now_func) else datetime.now()
    safe["updated_at"] = now.isoformat(timespec="seconds")
    tmp_path = path.with_suffix(".tmp")
    tmp_path.write_text(json.dumps(safe, ensure_ascii=False, indent=2), encoding="utf-8")
    tmp_path.replace(path)
    return safe


def build_manual_persona_card_block(card):
    mapping = [
        ("character_name", "角色名"),
        ("user_alias", "用户称呼"),
        ("personality_tags", "性格标签"),
        ("speaking_style", "说话风格"),
        ("catchphrases", "口头禅"),
        ("likes", "喜欢的事物"),
        ("dislikes", "不喜欢的事物"),
        ("initiative_level", "主动程度"),
        ("relationship_role", "关系定位"),
    ]
    lines = []
    for key, label in mapping:
        value = str(card.get(key, "")).strip()
        if value:
            lines.append(f"- {label}: {value}")
    if not lines:
        return ""
    return (
        "以下是用户手动填写的人设卡（高优先级，回答时尽量遵守；如与用户最新明确指令冲突，以最新指令为准）：\n"
        + "\n".join(lines)
    )


def load_wakeup_summary(path):
    if not path.exists():
        return ""
    try:
        data = json.loads(path.read_text(encoding="utf-8-sig"))
    except Exception:
        return ""
    return str(data.get("summary", "")).strip()


def save_wakeup_summary(path, summary, item_count, now_func=None):
    now = now_func() if callable(now_func) else datetime.now()
    payload = json.dumps(
        {
            "summary": str(summary or "").strip(),
            "item_count": int(item_count or 0),
            "updated_at": now.isoformat(timespec="seconds"),
        },
        ensure_ascii=False,
        indent=2,
    )
    tmp_path = path.with_suffix(".tmp")
    tmp_path.write_text(payload, encoding="utf-8")
    tmp_path.replace(path)


def load_json_summary(path):
    if not path.exists():
        return {}
    try:
        data = json.loads(path.read_text(encoding="utf-8-sig"))
    except Exception:
        return {}
    return data if isinstance(data, dict) else {}


def save_json_summary(path, payload):
    safe = payload if isinstance(payload, dict) else {}
    tmp_path = path.with_suffix(".tmp")
    tmp_path.write_text(json.dumps(safe, ensure_ascii=False, indent=2), encoding="utf-8")
    tmp_path.replace(path)


def build_summary_block(path, prefix, looks_garbled_func, looks_stagey_func):
    data = load_json_summary(path)
    summary = str(data.get("summary", "")).strip()
    if not summary:
        return ""
    if looks_garbled_func(summary) or looks_stagey_func(summary):
        return ""
    return f"{prefix}{summary}"


def build_wakeup_summary_block(path, looks_garbled_func, looks_stagey_func):
    summary = load_wakeup_summary(path)
    if not summary:
        return ""
    if looks_garbled_func(summary) or looks_stagey_func(summary):
        return ""
    return f"关于用户的长期画像：{summary}"


def build_dialogue_excerpt(items, limit=60, normalize_text_func=None):
    normalize = normalize_text_func or default_normalize_text
    sample = items[-max(1, int(limit)) :]
    return "\n\n".join(
        f"[{str(item.get('ts', ''))[:10]}] 用户：{normalize(item.get('user', ''), 80)}\n"
        f"Taffy：{normalize(item.get('assistant', ''), 100)}"
        for item in sample
        if isinstance(item, dict)
    )
