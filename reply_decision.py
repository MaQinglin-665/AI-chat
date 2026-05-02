import random


def should_reply(user_message, config, is_auto=False, random_fn=None):
    """Decide whether the pet should reply to this message."""
    safe_config = config if isinstance(config, dict) else {}
    decision_cfg = safe_config.get("decision", {})
    if not decision_cfg.get("enabled", True):
        return True

    msg = str(user_message or "").strip().lower()

    # Always reply to direct address or questions.
    always_keywords = decision_cfg.get(
        "always_reply_keywords",
        [
            "\u99a8\u8bed",
            "\u99a8\u8bedai",
            "xinyu",
            "\u5854\u83f2",
            "taffy",
            "?",
            "\uff1f",
            "\u5e2e\u6211",
            "\u544a\u8bc9\u6211",
        ],
    )
    for kw in always_keywords:
        if str(kw or "").lower() in msg:
            return True

    # In non-auto mode (user explicitly typed), always reply.
    if not is_auto:
        return True

    silence_keywords = decision_cfg.get(
        "silence_keywords",
        ["嗯", "哦", "ok", "好的", "知道了"],
    )
    for kw in silence_keywords:
        if msg == str(kw or "").lower():
            return False

    prob = float(decision_cfg.get("silence_probability", 0.15))
    rand = random_fn or random.random
    if rand() < prob:
        return False

    return True
