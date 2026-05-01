import json


def normalize_character_profile_string(value, fallback):
    if isinstance(value, str):
        text = value.strip()
        if text:
            return text
    return str(fallback or "").strip()


def normalize_character_profile_list(value, fallback):
    fallback_items = [str(x or "").strip() for x in (fallback or []) if isinstance(x, str) and str(x or "").strip()]
    if not isinstance(value, list):
        return fallback_items
    out = []
    for item in value:
        if not isinstance(item, str):
            continue
        text = item.strip()
        if not text:
            continue
        out.append(text)
    return out or fallback_items


def normalize_character_profile_config(raw, default_profile):
    safe = raw if isinstance(raw, dict) else {}
    defaults = default_profile
    return {
        "name": normalize_character_profile_string(safe.get("name"), defaults["name"]),
        "persona": normalize_character_profile_string(safe.get("persona"), defaults["persona"]),
        "tone": normalize_character_profile_string(safe.get("tone"), defaults["tone"]),
        "style_notes": normalize_character_profile_list(safe.get("style_notes"), defaults["style_notes"]),
        "response_guidelines": normalize_character_profile_list(
            safe.get("response_guidelines"), defaults["response_guidelines"]
        ),
        "style_boundaries": normalize_character_profile_list(
            safe.get("style_boundaries"), defaults["style_boundaries"]
        ),
        "interaction_examples": normalize_character_profile_list(
            safe.get("interaction_examples"), defaults["interaction_examples"]
        ),
        "default_emotion": normalize_character_profile_string(
            safe.get("default_emotion"), defaults["default_emotion"]
        ),
        "default_action": normalize_character_profile_string(safe.get("default_action"), defaults["default_action"]),
        "allowed_emotions": normalize_character_profile_list(
            safe.get("allowed_emotions"), defaults["allowed_emotions"]
        ),
        "allowed_actions": normalize_character_profile_list(
            safe.get("allowed_actions"), defaults["allowed_actions"]
        ),
        "allowed_voice_styles": normalize_character_profile_list(
            safe.get("allowed_voice_styles"), defaults["allowed_voice_styles"]
        ),
    }


def load_character_profile_config(path, default_profile):
    safe_default = normalize_character_profile_config(default_profile, default_profile)
    try:
        if not path.exists():
            return safe_default
        parsed = json.loads(path.read_text(encoding="utf-8"))
        return normalize_character_profile_config(parsed, default_profile)
    except Exception:
        return safe_default


def build_character_runtime_prompt_contract(profile, default_profile):
    profile = normalize_character_profile_config(profile, default_profile)
    profile_name = str(profile.get("name", default_profile["name"]) or default_profile["name"]).strip()
    persona = str(profile.get("persona", default_profile["persona"]) or default_profile["persona"]).strip()
    tone = str(profile.get("tone", default_profile["tone"]) or default_profile["tone"]).strip()
    style_notes = normalize_character_profile_list(
        profile.get("style_notes"), default_profile["style_notes"]
    )
    response_guidelines = normalize_character_profile_list(
        profile.get("response_guidelines"), default_profile["response_guidelines"]
    )
    style_boundaries = normalize_character_profile_list(
        profile.get("style_boundaries"), default_profile["style_boundaries"]
    )
    interaction_examples = normalize_character_profile_list(
        profile.get("interaction_examples"), default_profile["interaction_examples"]
    )
    style_notes_text = " | ".join(style_notes[:3])
    response_guidelines_text = " | ".join(response_guidelines[:3])
    style_boundaries_text = " | ".join(style_boundaries[:3])
    interaction_examples_text = " | ".join(interaction_examples[:3])
    allowed_emotions = profile.get("allowed_emotions", default_profile["allowed_emotions"])
    allowed_actions = profile.get("allowed_actions", default_profile["allowed_actions"])
    allowed_voice_styles = profile.get("allowed_voice_styles", default_profile["allowed_voice_styles"])
    emotion_schema = "|".join([str(x or "").strip() for x in allowed_emotions if str(x or "").strip()])
    action_schema = "|".join([str(x or "").strip() for x in allowed_actions if str(x or "").strip()])
    voice_schema = "|".join([str(x or "").strip() for x in allowed_voice_styles if str(x or "").strip()])
    emotion_schema = emotion_schema or "|".join(default_profile["allowed_emotions"])
    action_schema = action_schema or "|".join(default_profile["allowed_actions"])
    voice_schema = voice_schema or "|".join(default_profile["allowed_voice_styles"])
    return (
        "Character profile:\n"
        f"- Name: {profile_name}\n"
        f"- Persona: {persona}\n"
        f"- Tone: {tone}\n"
        f"- Style notes: {style_notes_text}\n"
        f"- Response guidelines: {response_guidelines_text}\n"
        f"- Style boundaries: {style_boundaries_text}\n"
        f"- Interaction examples: {interaction_examples_text}\n"
        f"- Allowed emotions: {emotion_schema}\n"
        f"- Allowed actions: {action_schema}\n"
        f"- Allowed voice styles: {voice_schema}\n"
        "Character Runtime output contract:\n"
        "- Respond with a single JSON object only.\n"
        "- Do not wrap JSON in Markdown code blocks.\n"
        "- Do not add explanations outside JSON.\n"
        "- Keep the reply natural, concise, expressive, and task-useful.\n"
        "- Use light playful/teasing flavor only when appropriate; do not force it every reply.\n"
        "- Avoid generic-assistant phrasing, but also avoid overly dramatic/cute or roleplay-heavy phrasing.\n"
        "- Select emotion/action/voice_style from the allowed lists above.\n"
        "- If uncertain, use emotion=neutral, action=none, voice_style=neutral.\n"
        "Schema:\n"
        "{\n"
        '  "text": "final user-facing reply",\n'
        f'  "emotion": "{emotion_schema}",\n'
        f'  "action": "{action_schema}",\n'
        '  "intensity": "low|normal|high",\n'
        f'  "voice_style": "{voice_schema}"\n'
        "}\n"
        'The "text" field is the only text shown to the user.'
    )


def apply_character_runtime_prompt_contract(
    config,
    prompt,
    *,
    get_character_runtime_settings_func,
    build_contract_func,
    merge_prompt_with_memory_func,
):
    settings = get_character_runtime_settings_func(config)
    if not settings.get("enabled", False):
        return prompt
    contract = build_contract_func()
    safe_prompt = str(prompt or "")
    if not safe_prompt:
        return contract
    return merge_prompt_with_memory_func(safe_prompt, contract)
