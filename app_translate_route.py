from http import HTTPStatus


TRANSLATE_SYSTEM_PROMPT = (
    "You are a translator. Translate the user's text to "
    "Simplified Chinese. Output ONLY the translation — "
    "no explanation, no quotation marks."
)


def build_translate_messages(text):
    return [
        {
            "role": "system",
            "content": TRANSLATE_SYSTEM_PROMPT,
        },
        {"role": "user", "content": text},
    ]


def handle_translate_request(
    body,
    *,
    send_json_func,
    load_config_func,
    call_ollama_func,
    call_openai_compatible_func,
    diagnose_llm_exception_func,
    log_backend_notice_func,
    diagnostic_payload_func,
):
    payload = body if isinstance(body, dict) else {}
    text = str(payload.get("text", "")).strip()
    if not text:
        send_json_func({"error": "text is empty"})
        return

    llm_cfg = {}
    try:
        cfg = load_config_func()
        llm_cfg = cfg.get("llm", {}) if isinstance(cfg, dict) else {}
        translate_cfg = dict(llm_cfg)
        translate_cfg["max_output_tokens"] = 120
        translate_cfg["temperature"] = 0.2
        messages = build_translate_messages(text)
        provider = str(llm_cfg.get("provider", "ollama")).lower()
        if provider == "ollama":
            result = call_ollama_func(translate_cfg, messages)
        else:
            result = call_openai_compatible_func(translate_cfg, messages)
        translated = str(result or "").strip() or text
        send_json_func(
            {
                "translated": translated,
                "translated_text": translated,
                "degraded": False,
                "fallback": False,
            }
        )
    except Exception as exc:
        diagnosed = diagnose_llm_exception_func(exc, llm_cfg)
        log_backend_notice_func(
            "TRANSLATE",
            diagnosed,
            extra="/api/translate degraded to passthrough",
        )
        safe_error = str(diagnostic_payload_func(diagnosed).get("error", "") or "").strip()
        send_json_func(
            {
                "translated": text,
                "translated_text": text,
                "degraded": True,
                "fallback": True,
                "error": safe_error or "translate unavailable",
            },
            status=HTTPStatus.OK,
        )
