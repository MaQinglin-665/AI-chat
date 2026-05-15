from http import HTTPStatus


CHAT_ROUTES = {"/api/chat", "/api/chat_stream"}
PRE_FINALIZED_STREAM_SENTINEL = "\x00PRE_FINALIZED\x00"


def _resolve_llm_provider(llm_cfg):
    provider = str(llm_cfg.get("provider", "") or "").strip().lower()
    if provider:
        return provider
    base_url = str(llm_cfg.get("base_url", "") or "").strip().lower()
    return "ollama" if "11434" in base_url else "openai"


def _safe_recent_history(config, history, *, get_history_summary_settings_func, sanitize_history_func):
    settings = get_history_summary_settings_func(config)
    keep_recent = int(settings.get("keep_recent_messages", 8))
    return sanitize_history_func(history, max_items=keep_recent)


def _build_chat_config(
    body,
    chat_config,
    user_message,
    *,
    sanitize_input_modality_func,
    clean_experience_text_func,
    sanitize_character_experience_profile_func,
    sanitize_auto_thought_burst_func,
    sanitize_conversation_context_func,
):
    is_auto = bool(body.get("auto", False))
    input_modality = sanitize_input_modality_func(
        body.get("input_modality") if isinstance(body, dict) else None,
        is_auto=is_auto,
    )
    resolved = dict(chat_config or {})
    resolved["_input_modality"] = input_modality

    auto_kind = clean_experience_text_func(body.get("auto_kind"), 40).lower()
    character_experience_profile = sanitize_character_experience_profile_func(
        body.get("character_experience_profile")
    )
    if character_experience_profile:
        resolved = dict(resolved or {})
        resolved["_character_experience_profile"] = character_experience_profile
    if is_auto and auto_kind == "thought_burst":
        resolved = dict(resolved or {})
        resolved["_character_auto_kind"] = "thought_burst"
        resolved["_character_auto_thought_burst"] = sanitize_auto_thought_burst_func(
            body.get("auto_thought_burst")
        )

    conversation_context = sanitize_conversation_context_func(
        body.get("conversation_context") if isinstance(body, dict) else None,
        user_message,
    )
    if conversation_context:
        resolved = dict(resolved or {})
        resolved["_conversation_context"] = conversation_context
    return resolved


def _remember_reply(
    config,
    user_message,
    reply,
    *,
    is_auto,
    remember_interaction_func,
):
    try:
        remember_interaction_func(config, user_message, reply, is_auto=is_auto)
    except Exception:
        pass


def _handle_chat_stream_request(
    body,
    chat_config,
    user_message,
    history,
    image_data_url,
    *,
    is_auto,
    force_tools,
    perf_trace_id,
    perf_started_ms,
    begin_sse_func,
    send_sse_func,
    call_llm_stream_func,
    finalize_assistant_reply_func,
    apply_demo_stable_identity_fallback_func,
    apply_character_runtime_reply_func,
    apply_character_brain_reply_text_func,
    remember_interaction_func,
    update_character_brain_session_state_func,
    build_character_brain_response_payload_func,
    get_history_summary_settings_func,
    sanitize_history_func,
    diagnose_llm_exception_func,
    log_backend_exception_func,
    log_backend_perf_func,
    diagnostic_payload_func,
    perf_now_ms_func,
):
    del body
    begin_sse_func(perf_trace_id)

    full_parts = []
    already_finalized = False
    first_delta_ms = -1
    delta_chunks = 0
    delta_chars = 0
    llm_started_ms = perf_now_ms_func()
    try:
        for chunk in call_llm_stream_func(
            user_message,
            history,
            image_data_url=image_data_url,
            is_auto=is_auto,
            force_tools=force_tools,
            config=chat_config,
        ):
            if not isinstance(chunk, str) or not chunk:
                continue
            if chunk == PRE_FINALIZED_STREAM_SENTINEL:
                already_finalized = True
                continue
            full_parts.append(chunk)
            delta_chunks += 1
            delta_chars += len(chunk)
            if first_delta_ms < 0:
                first_delta_ms = perf_now_ms_func() - llm_started_ms
            send_sse_func({"type": "delta", "text": chunk})
        final_reply = "".join(full_parts).strip()
        runtime_meta = None
        finalize_started_ms = perf_now_ms_func()
        if final_reply and not already_finalized:
            llm_cfg = chat_config.get("llm", {})
            final_reply = finalize_assistant_reply_func(
                chat_config,
                llm_cfg,
                _resolve_llm_provider(llm_cfg),
                user_message,
                _safe_recent_history(
                    chat_config,
                    history,
                    get_history_summary_settings_func=get_history_summary_settings_func,
                    sanitize_history_func=sanitize_history_func,
                ),
                final_reply,
                is_auto=is_auto,
            )
        final_reply = apply_demo_stable_identity_fallback_func(
            chat_config, user_message, final_reply
        )
        finalize_ms = perf_now_ms_func() - finalize_started_ms
        runtime_started_ms = perf_now_ms_func()
        final_reply, runtime_meta = apply_character_runtime_reply_func(
            chat_config,
            final_reply,
        )
        final_reply = apply_character_brain_reply_text_func(
            chat_config,
            user_message,
            final_reply,
        )
        if final_reply:
            _remember_reply(
                chat_config,
                user_message,
                final_reply,
                is_auto=is_auto,
                remember_interaction_func=remember_interaction_func,
            )
        update_character_brain_session_state_func(
            chat_config,
            user_message,
            history,
            assistant_reply=final_reply,
        )
        runtime_ms = perf_now_ms_func() - runtime_started_ms
        done_payload = {"type": "done", "reply": final_reply}
        if runtime_meta is not None:
            done_payload["character_runtime"] = runtime_meta
        brain_payload = build_character_brain_response_payload_func(chat_config)
        if brain_payload is not None:
            done_payload["character_brain"] = brain_payload
        send_sse_func(done_payload)
        log_backend_perf_func(
            "CHAT_STREAM",
            perf_trace_id,
            stage="response_sent",
            first_delta_ms=first_delta_ms,
            llm_ms=perf_now_ms_func() - llm_started_ms,
            finalize_ms=finalize_ms,
            runtime_ms=runtime_ms,
            delta_chunks=delta_chunks,
            delta_chars=delta_chars,
            reply_chars=len(final_reply or ""),
            total_ms=perf_now_ms_func() - perf_started_ms,
            pre_finalized=already_finalized,
        )
    except Exception as exc:
        diagnosed = diagnose_llm_exception_func(exc, chat_config.get("llm", {}))
        log_backend_exception_func("CHAT_STREAM", diagnosed, extra="/api/chat_stream failed")
        log_backend_perf_func(
            "CHAT_STREAM",
            perf_trace_id,
            stage="fail",
            total_ms=perf_now_ms_func() - perf_started_ms,
            error_type=type(exc).__name__,
        )
        send_sse_func(
            {
                "type": "error",
                "error": diagnostic_payload_func(diagnosed).get("error", ""),
            }
        )


def _handle_chat_request(
    chat_config,
    user_message,
    history,
    image_data_url,
    *,
    is_auto,
    force_tools,
    perf_trace_id,
    perf_started_ms,
    perf_headers,
    send_json_func,
    call_llm_func,
    apply_demo_stable_identity_fallback_func,
    apply_character_runtime_reply_func,
    apply_character_brain_reply_text_func,
    remember_interaction_func,
    update_character_brain_session_state_func,
    build_character_brain_response_payload_func,
    diagnose_llm_exception_func,
    log_backend_exception_func,
    log_backend_perf_func,
    diagnostic_payload_func,
    perf_now_ms_func,
):
    try:
        llm_started_ms = perf_now_ms_func()
        reply = call_llm_func(
            user_message,
            history,
            image_data_url=image_data_url,
            is_auto=is_auto,
            force_tools=force_tools,
            config=chat_config,
        )
        reply = apply_demo_stable_identity_fallback_func(
            chat_config, user_message, reply
        )
        llm_ms = perf_now_ms_func() - llm_started_ms
        runtime_started_ms = perf_now_ms_func()
        reply, runtime_meta = apply_character_runtime_reply_func(chat_config, reply)
        reply = apply_character_brain_reply_text_func(chat_config, user_message, reply)
        runtime_ms = perf_now_ms_func() - runtime_started_ms
        _remember_reply(
            chat_config,
            user_message,
            reply,
            is_auto=is_auto,
            remember_interaction_func=remember_interaction_func,
        )
        update_character_brain_session_state_func(
            chat_config,
            user_message,
            history,
            assistant_reply=reply,
        )
        payload = {"reply": str(reply or "")}
        if runtime_meta is not None:
            payload["character_runtime"] = runtime_meta
        brain_payload = build_character_brain_response_payload_func(chat_config)
        if brain_payload is not None:
            payload["character_brain"] = brain_payload
        send_json_func(payload, extra_headers=perf_headers)
        log_backend_perf_func(
            "CHAT",
            perf_trace_id,
            stage="response_sent",
            llm_ms=llm_ms,
            runtime_ms=runtime_ms,
            total_ms=perf_now_ms_func() - perf_started_ms,
            reply_chars=len(str(reply or "")),
        )
    except Exception as exc:
        diagnosed = diagnose_llm_exception_func(exc, chat_config.get("llm", {}))
        log_backend_exception_func("CHAT", diagnosed, extra="/api/chat failed")
        log_backend_perf_func(
            "CHAT",
            perf_trace_id,
            stage="fail",
            total_ms=perf_now_ms_func() - perf_started_ms,
            error_type=type(exc).__name__,
        )
        send_json_func(
            diagnostic_payload_func(diagnosed),
            status=HTTPStatus.INTERNAL_SERVER_ERROR,
            extra_headers=perf_headers,
        )


def handle_chat_route(
    path_only,
    body,
    *,
    perf_trace_id,
    perf_started_ms,
    client_to_server_ms,
    perf_headers,
    send_json_func,
    begin_sse_func,
    send_sse_func,
    load_config_func,
    sanitize_input_modality_func,
    clean_experience_text_func,
    sanitize_character_experience_profile_func,
    sanitize_auto_thought_burst_func,
    sanitize_conversation_context_func,
    ensure_character_brain_decision_func,
    call_llm_func,
    call_llm_stream_func,
    finalize_assistant_reply_func,
    apply_demo_stable_identity_fallback_func,
    apply_character_runtime_reply_func,
    apply_character_brain_reply_text_func,
    remember_interaction_func,
    update_character_brain_session_state_func,
    build_character_brain_response_payload_func,
    get_history_summary_settings_func,
    sanitize_history_func,
    diagnose_llm_exception_func,
    log_backend_exception_func,
    log_backend_perf_func,
    diagnostic_payload_func,
    perf_now_ms_func,
):
    try:
        chat_config = load_config_func()
    except Exception as exc:
        log_backend_exception_func("CONFIG", exc, extra=f"POST {path_only} load_config failed")
        send_json_func(
            diagnostic_payload_func(exc),
            status=HTTPStatus.INTERNAL_SERVER_ERROR,
        )
        return

    user_message = str(body.get("message", "")).strip()
    history = body.get("history", [])
    image_data_url = body.get("image_data_url", "")
    is_auto = bool(body.get("auto", False))
    force_tools = bool(body.get("force_tools", False))
    chat_config = _build_chat_config(
        body,
        chat_config,
        user_message,
        sanitize_input_modality_func=sanitize_input_modality_func,
        clean_experience_text_func=clean_experience_text_func,
        sanitize_character_experience_profile_func=sanitize_character_experience_profile_func,
        sanitize_auto_thought_burst_func=sanitize_auto_thought_burst_func,
        sanitize_conversation_context_func=sanitize_conversation_context_func,
    )

    if not user_message:
        send_json_func(
            {"error": "message cannot be empty."},
            status=HTTPStatus.BAD_REQUEST,
            extra_headers=perf_headers,
        )
        return

    if not isinstance(history, list):
        history = []
    if image_data_url is None:
        image_data_url = ""
    if not isinstance(image_data_url, str):
        send_json_func(
            {"error": "image_data_url must be a string."},
            status=HTTPStatus.BAD_REQUEST,
            extra_headers=perf_headers,
        )
        return

    log_backend_perf_func(
        "CHAT",
        perf_trace_id,
        stage="request_received",
        route="chat_stream" if path_only == "/api/chat_stream" else "chat",
        client_to_server_ms=client_to_server_ms,
        user_chars=len(user_message),
        history_items=len(history),
        has_image=bool(image_data_url),
        is_auto=is_auto,
    )

    chat_config = ensure_character_brain_decision_func(
        chat_config,
        user_message,
        history,
        is_auto=is_auto,
    )

    if path_only == "/api/chat_stream":
        _handle_chat_stream_request(
            body,
            chat_config,
            user_message,
            history,
            image_data_url,
            is_auto=is_auto,
            force_tools=force_tools,
            perf_trace_id=perf_trace_id,
            perf_started_ms=perf_started_ms,
            begin_sse_func=begin_sse_func,
            send_sse_func=send_sse_func,
            call_llm_stream_func=call_llm_stream_func,
            finalize_assistant_reply_func=finalize_assistant_reply_func,
            apply_demo_stable_identity_fallback_func=apply_demo_stable_identity_fallback_func,
            apply_character_runtime_reply_func=apply_character_runtime_reply_func,
            apply_character_brain_reply_text_func=apply_character_brain_reply_text_func,
            remember_interaction_func=remember_interaction_func,
            update_character_brain_session_state_func=update_character_brain_session_state_func,
            build_character_brain_response_payload_func=build_character_brain_response_payload_func,
            get_history_summary_settings_func=get_history_summary_settings_func,
            sanitize_history_func=sanitize_history_func,
            diagnose_llm_exception_func=diagnose_llm_exception_func,
            log_backend_exception_func=log_backend_exception_func,
            log_backend_perf_func=log_backend_perf_func,
            diagnostic_payload_func=diagnostic_payload_func,
            perf_now_ms_func=perf_now_ms_func,
        )
        return

    _handle_chat_request(
        chat_config,
        user_message,
        history,
        image_data_url,
        is_auto=is_auto,
        force_tools=force_tools,
        perf_trace_id=perf_trace_id,
        perf_started_ms=perf_started_ms,
        perf_headers=perf_headers,
        send_json_func=send_json_func,
        call_llm_func=call_llm_func,
        apply_demo_stable_identity_fallback_func=apply_demo_stable_identity_fallback_func,
        apply_character_runtime_reply_func=apply_character_runtime_reply_func,
        apply_character_brain_reply_text_func=apply_character_brain_reply_text_func,
        remember_interaction_func=remember_interaction_func,
        update_character_brain_session_state_func=update_character_brain_session_state_func,
        build_character_brain_response_payload_func=build_character_brain_response_payload_func,
        diagnose_llm_exception_func=diagnose_llm_exception_func,
        log_backend_exception_func=log_backend_exception_func,
        log_backend_perf_func=log_backend_perf_func,
        diagnostic_payload_func=diagnostic_payload_func,
        perf_now_ms_func=perf_now_ms_func,
    )
