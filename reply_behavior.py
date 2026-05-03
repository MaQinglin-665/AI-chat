import re


def resolve_reply_language(config):
    raw = str(
        config.get("assistant_reply_language", "")
        or config.get("reply_language", "")
        or ""
    ).strip().lower()
    if raw in {"en", "english"}:
        return "en"
    if raw in {"zh", "zh-cn", "zh_cn", "chinese"}:
        return "zh"
    return "auto"


def build_reply_language_block(config):
    lang = resolve_reply_language(config if isinstance(config, dict) else {})
    if lang == "en":
        return (
            "Reply language rule:\n"
            "- The assistant's main user-facing reply MUST be natural English.\n"
            "- Treat Chinese user messages as input only; do NOT mirror the user's Chinese language.\n"
            "- Do not include a Chinese translation in the main reply. The UI translation layer handles Chinese separately.\n"
            "- Answer the user's latest message directly and contextually before anything else.\n"
            "- Do not explain language or translation rules unless the user asks about language or translation.\n"
            "- Switch to Chinese only if the user explicitly asks: 'reply in Chinese', 'use Chinese', or equivalent."
        )
    if lang == "zh":
        return (
            "回复语言规则：\n"
            "- 默认使用简体中文自然回复。\n"
            "- 仅在用户明确要求英文时再切换英文。"
        )
    return ""


def is_demo_stable_enabled(config, get_character_runtime_settings_func):
    settings = get_character_runtime_settings_func(config if isinstance(config, dict) else {})
    return bool(settings.get("enabled", False) and settings.get("demo_stable", False))


def build_demo_stable_reply_behavior_block(config, get_character_runtime_settings_func):
    settings = get_character_runtime_settings_func(config if isinstance(config, dict) else {})
    if not bool(settings.get("enabled", False) and settings.get("demo_stable", False)):
        return ""

    rules = [
        "Keep the main reply in natural spoken English.",
        "Even when the user writes in Chinese, answer in English; do not mirror the user's Chinese.",
        "The Chinese translation layer may explain it separately; the main reply must stay English.",
        "Answer the user's latest message directly and contextually; do not drift into policy or translation explanations.",
        "For simple daily status updates such as leaving, eating, or sleeping, give a brief natural acknowledgement.",
        "Use complete sentences only, and never end with a cut-off half sentence.",
        "Usually keep replies to 2 to 3 short sentences.",
        "Keep an original desktop companion / light supervisor vibe: playful, cheeky, lightly teasing, energetic, witty, reliable.",
        "You may lightly tease or nudge the user, but do not attack the user.",
        "Do not call yourself ChatGPT.",
        "Do not claim long-term memory, learning pipelines, plugin marketplace, or other unshipped capabilities.",
    ]

    persona_override = settings.get("persona_override", {})
    if isinstance(persona_override, dict) and persona_override.get("enabled", False):
        override_name = str(persona_override.get("name", "") or "").strip()
        override_style = str(persona_override.get("style", "") or "").strip()
        if override_name:
            rules.extend(
                [
                    f"Your current name is: {override_name}.",
                    "When the user asks who you are, introduce yourself using this name.",
                    "Do not use any other character name.",
                ]
            )
        if override_style:
            rules.append(f"Keep this local persona style: {override_style}.")

    return "Reply behavior rules:\n" + "\n".join(f"- {rule}" for rule in rules)


def is_identity_question(text):
    safe = str(text or "").strip().lower()
    if not safe:
        return False
    normalized = re.sub(r"\s+", " ", safe)
    zh_hits = (
        "你是谁" in safe
        or "妳是谁" in safe
        or "你叫" in safe
        or "你是哪位" in safe
    )
    en_markers = (
        "who are you",
        "what are you",
        "what's your name",
        "what is your name",
        "your name",
        "who am i talking to",
    )
    en_hits = any(marker in normalized for marker in en_markers)
    return bool(zh_hits or en_hits)


def apply_demo_stable_identity_fallback(config, user_message, reply_text, get_character_runtime_settings_func):
    safe_reply = str(reply_text or "").strip()
    if not safe_reply:
        return safe_reply
    settings = get_character_runtime_settings_func(config if isinstance(config, dict) else {})
    if not bool(settings.get("enabled", False) and settings.get("demo_stable", False)):
        return safe_reply
    persona_override = settings.get("persona_override", {})
    if not isinstance(persona_override, dict) or not bool(persona_override.get("enabled", False)):
        return safe_reply
    override_name = str(persona_override.get("name", "") or "").strip()
    if not override_name:
        return safe_reply
    if not is_identity_question(user_message):
        return safe_reply
    if override_name.lower() in safe_reply.lower():
        return safe_reply
    return f"I'm {override_name}, your desktop companion."


def build_reply_llm_cfg(config, llm_cfg, get_character_runtime_settings_func):
    safe_cfg = dict(llm_cfg or {})
    if not is_demo_stable_enabled(config, get_character_runtime_settings_func):
        return safe_cfg

    raw_budget = safe_cfg.get("max_output_tokens", safe_cfg.get("max_tokens", 120))
    try:
        base_budget = int(raw_budget)
    except (TypeError, ValueError):
        base_budget = 120
    boosted_budget = max(600, base_budget)

    safe_cfg["max_output_tokens"] = boosted_budget
    safe_cfg["allow_high_output_tokens"] = True
    safe_cfg["retry_on_length"] = True
    safe_cfg["length_retry_max_output_tokens"] = max(boosted_budget, 900)
    return safe_cfg
