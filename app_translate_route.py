from http import HTTPStatus


TRANSLATE_SYSTEM_PROMPT = (
    "Translate the user's text into natural Simplified Chinese. "
    "Return only the translation."
)

DEFAULT_TRANSLATE_TIMEOUT_SEC = 45
DEFAULT_TRANSLATE_NUM_CTX = 512


def resolve_translate_timeout_sec(llm_cfg):
    raw = (llm_cfg or {}).get("translate_timeout_sec", DEFAULT_TRANSLATE_TIMEOUT_SEC)
    try:
        value = int(raw)
    except (TypeError, ValueError):
        value = DEFAULT_TRANSLATE_TIMEOUT_SEC
    return max(10, min(120, value))


def resolve_translate_num_ctx(llm_cfg):
    raw = (llm_cfg or {}).get("translate_num_ctx", DEFAULT_TRANSLATE_NUM_CTX)
    try:
        value = int(raw)
    except (TypeError, ValueError):
        value = DEFAULT_TRANSLATE_NUM_CTX
    return max(256, min(2048, value))


def _elapsed_ms(perf_now_ms_func, started_ms):
    if not callable(perf_now_ms_func) or started_ms is None:
        return -1
    try:
        return max(0, int(perf_now_ms_func() - started_ms))
    except Exception:
        return -1


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
    perf_trace_id="translate",
    perf_started_ms=None,
    client_to_server_ms=-1,
    log_backend_perf_func=None,
    perf_now_ms_func=None,
    iter_openai_chat_stream_func=None,
):
    payload = body if isinstance(body, dict) else {}
    text = str(payload.get("text", "")).strip()
    if not text:
        send_json_func({"error": "text is empty"})
        return

    llm_cfg = {}
    status = HTTPStatus.OK
    provider = ""
    selected_model = ""
    timeout_sec = DEFAULT_TRANSLATE_TIMEOUT_SEC
    num_ctx = DEFAULT_TRANSLATE_NUM_CTX
    llm_started_ms = None
    llm_ms = -1
    try:
        cfg = load_config_func()
        llm_cfg = cfg.get("llm", {}) if isinstance(cfg, dict) else {}
        translate_cfg = dict(llm_cfg)
        provider = str(llm_cfg.get("provider", "ollama")).lower()
        selected_model = str(
            llm_cfg.get("translate_model")
            or llm_cfg.get("model")
            or ""
        ).strip()
        timeout_sec = resolve_translate_timeout_sec(llm_cfg)
        num_ctx = resolve_translate_num_ctx(llm_cfg)
        if callable(log_backend_perf_func):
            log_backend_perf_func(
                "TRANSLATE",
                perf_trace_id,
                stage="request_received",
                client_to_server_ms=client_to_server_ms,
                provider=provider,
                model=selected_model,
                text_chars=len(text),
                timeout_sec=timeout_sec,
                num_ctx=num_ctx,
            )
        translate_cfg["max_output_tokens"] = 96
        translate_cfg["max_tokens"] = 96
        translate_cfg["temperature"] = 0.1
        translate_cfg["request_timeout"] = timeout_sec
        translate_cfg["num_ctx"] = num_ctx
        translate_cfg["min_num_ctx"] = min(num_ctx, 1024)
        translate_model = str(llm_cfg.get("translate_model", "")).strip()
        if translate_model:
            translate_cfg["model"] = translate_model
        messages = build_translate_messages(text)
        if callable(perf_now_ms_func):
            llm_started_ms = perf_now_ms_func()
        if provider == "ollama":
            result = call_ollama_func(translate_cfg, messages)
        else:
            try:
                result = call_openai_compatible_func(translate_cfg, messages)
            except Exception:
                if not callable(iter_openai_chat_stream_func):
                    raise
                chunks = []
                for chunk in iter_openai_chat_stream_func(translate_cfg, messages):
                    if isinstance(chunk, str) and chunk:
                        chunks.append(chunk)
                result = "".join(chunks).strip()
                if not result:
                    raise
        llm_ms = _elapsed_ms(perf_now_ms_func, llm_started_ms)
        translated = str(result or "").strip() or text
        response = {
            "translated": translated,
            "translated_text": translated,
            "degraded": False,
            "fallback": False,
        }
    except Exception as exc:
        diagnosed = diagnose_llm_exception_func(exc, llm_cfg)
        log_backend_notice_func(
            "TRANSLATE",
            diagnosed,
            extra="/api/translate degraded to passthrough",
        )
        safe_error = str(diagnostic_payload_func(diagnosed).get("error", "") or "").strip()
        response = {
            "translated": text,
            "translated_text": text,
            "degraded": True,
            "fallback": True,
            "error": safe_error or "translate unavailable",
        }

    if callable(log_backend_perf_func):
        log_backend_perf_func(
            "TRANSLATE",
            perf_trace_id,
            stage="response_sent",
            llm_ms=llm_ms,
            total_ms=_elapsed_ms(perf_now_ms_func, perf_started_ms),
            provider=provider,
            model=selected_model,
            text_chars=len(text),
            translated_chars=len(str(response.get("translated", "") or "")),
            degraded=response.get("degraded") is True,
            fallback=response.get("fallback") is True,
            timeout_sec=timeout_sec,
            num_ctx=num_ctx,
        )
    send_json_func(response, status=status)
