from http import HTTPStatus

from companion_turn_contract import is_model_direct_reply_enabled


CHAT_ROUTES = {"/api/chat", "/api/chat_stream"}
PRE_FINALIZED_STREAM_SENTINEL = "\x00PRE_FINALIZED\x00"
DELIVERED_TURN_RECEIPT_CAPABILITY = "delivered_turn_receipt_v1"
MAX_PENDING_DELIVERY_RECEIPTS = 8


def _has_delivered_turn_receipt_capability(body):
    if not isinstance(body, dict):
        return False
    capabilities = body.get("client_capabilities")
    return isinstance(capabilities, dict) and capabilities.get(DELIVERED_TURN_RECEIPT_CAPABILITY) is True


def _acknowledge_pending_delivered_turns(body, acknowledge_delivered_turn_func):
    """Commit known prior visible turns before planning the next receipt-aware turn."""
    if not _has_delivered_turn_receipt_capability(body) or not callable(acknowledge_delivered_turn_func):
        return
    candidates = body.get("pending_delivery_ids") if isinstance(body, dict) else None
    if not isinstance(candidates, list):
        return
    seen = set()
    for delivery_id in candidates[:MAX_PENDING_DELIVERY_RECEIPTS]:
        if not isinstance(delivery_id, str) or delivery_id in seen:
            continue
        seen.add(delivery_id)
        try:
            acknowledge_delivered_turn_func(delivery_id)
        except Exception:
            # The standalone ACK queue will retry transient delivery failures.
            # A new chat request must not fail merely because an old receipt has
            # expired or the local process has restarted.
            continue


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


def _drop_duplicate_current_user_history_item(history, user_message):
    safe_history = list(history) if isinstance(history, list) else []
    if not safe_history:
        return safe_history
    last = safe_history[-1]
    if not isinstance(last, dict):
        return safe_history
    if str(last.get("role", "") or "").strip().lower() != "user":
        return safe_history
    if str(last.get("content", "") or "").strip() != str(user_message or "").strip():
        return safe_history
    return safe_history[:-1]


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
    interaction_id,
    remember_interaction_func,
):
    return remember_interaction_func(
        config,
        user_message,
        reply,
        is_auto=is_auto,
        interaction_id=interaction_id,
    )


def _stage_delivered_turn(
    config,
    user_message,
    history,
    reply,
    *,
    is_auto,
    interaction_id,
    remember_interaction_func,
    update_character_brain_session_state_func,
    get_history_summary_settings_func,
    sanitize_history_func,
    stage_delivered_turn_func,
    defer_until_delivery,
):
    """Commit now for legacy clients or stage a receipt-aware current renderer turn."""
    final_reply = str(reply or "")
    if not final_reply:
        return ""
    try:
        settings = get_history_summary_settings_func(config)
        keep_recent = int(settings.get("keep_recent_messages", 8))
        safe_history = sanitize_history_func(history, max_items=keep_recent)
    except Exception:
        safe_history = []

    def commit():
        _remember_reply(
            config,
            user_message,
            final_reply,
            is_auto=is_auto,
            interaction_id=interaction_id,
            remember_interaction_func=remember_interaction_func,
        )
        # The request-time session snapshot may be older than another delivered
        # turn that is acknowledged first. Start session progression from the
        # current global state while retaining this turn's own brain decision.
        session_config = dict(config) if isinstance(config, dict) else config
        if isinstance(session_config, dict):
            session_config.pop("_character_brain_session_state", None)
        update_character_brain_session_state_func(
            session_config,
            user_message,
            safe_history,
            assistant_reply=final_reply,
        )

    if not defer_until_delivery:
        # Preserve the historical API behavior for callers that cannot ACK a
        # receipt. Their writes are still best-effort and must not turn a normal
        # completed chat response into a server error.
        try:
            commit()
        except Exception:
            pass
        return ""
    if not callable(stage_delivered_turn_func):
        return ""
    try:
        return str(stage_delivered_turn_func(commit) or "")
    except Exception:
        return ""


def _build_companion_turn_safely(
    build_companion_turn_func,
    config,
    reply,
    *,
    perf_trace_id,
    is_auto,
    runtime_metadata,
    character_brain,
):
    if not callable(build_companion_turn_func):
        return None
    try:
        return build_companion_turn_func(
            config,
            reply,
            turn_id=perf_trace_id,
            is_auto=is_auto,
            input_modality=config.get("_input_modality", "text") if isinstance(config, dict) else "text",
            runtime_metadata=runtime_metadata,
            character_brain=character_brain,
        )
    except Exception:
        # The optional presentation contract must never make chat fail.
        return None


def _handle_chat_stream_request(
    body,
    chat_config,
    user_message,
    history,
    image_data_url,
    *,
    is_auto,
    force_tools,
    delivery_receipt_enabled,
    perf_trace_id,
    perf_started_ms,
    begin_sse_func,
    send_sse_func,
    call_llm_stream_func,
    finalize_assistant_reply_func,
    apply_demo_stable_identity_fallback_func,
    apply_character_runtime_reply_func,
    apply_character_brain_reply_text_func,
    build_companion_turn_func,
    remember_interaction_func,
    update_character_brain_session_state_func,
    stage_delivered_turn_func,
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
        model_direct_reply = is_model_direct_reply_enabled(chat_config)
        raw_stream_reply = "".join(full_parts)
        final_reply = raw_stream_reply if model_direct_reply else raw_stream_reply.strip()
        runtime_meta = None
        finalize_started_ms = perf_now_ms_func()
        if final_reply and not already_finalized and not model_direct_reply:
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
        if not model_direct_reply:
            final_reply = apply_demo_stable_identity_fallback_func(
                chat_config, user_message, final_reply
            )
        finalize_ms = perf_now_ms_func() - finalize_started_ms
        runtime_started_ms = perf_now_ms_func()
        if not model_direct_reply:
            final_reply, runtime_meta = apply_character_runtime_reply_func(
                chat_config,
                final_reply,
            )
            final_reply = apply_character_brain_reply_text_func(
                chat_config,
                user_message,
                final_reply,
            )
        runtime_ms = perf_now_ms_func() - runtime_started_ms
        done_payload = {"type": "done", "reply": final_reply}
        if runtime_meta is not None:
            done_payload["character_runtime"] = runtime_meta
        brain_payload = None if model_direct_reply else build_character_brain_response_payload_func(chat_config)
        if brain_payload is not None:
            done_payload["character_brain"] = brain_payload
        companion_turn = _build_companion_turn_safely(
            build_companion_turn_func,
            chat_config,
            final_reply,
            perf_trace_id=perf_trace_id,
            is_auto=is_auto,
            runtime_metadata=runtime_meta,
            character_brain=brain_payload,
        )
        if companion_turn is not None:
            done_payload["turn"] = companion_turn
        delivery_id = _stage_delivered_turn(
            chat_config,
            user_message,
            history,
            final_reply,
            is_auto=is_auto,
            interaction_id=perf_trace_id,
            remember_interaction_func=remember_interaction_func,
            update_character_brain_session_state_func=update_character_brain_session_state_func,
            get_history_summary_settings_func=get_history_summary_settings_func,
            sanitize_history_func=sanitize_history_func,
            stage_delivered_turn_func=stage_delivered_turn_func,
            defer_until_delivery=delivery_receipt_enabled,
        )
        if delivery_id:
            done_payload["delivery_id"] = delivery_id
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
    delivery_receipt_enabled,
    perf_trace_id,
    perf_started_ms,
    perf_headers,
    send_json_func,
    call_llm_func,
    apply_demo_stable_identity_fallback_func,
    apply_character_runtime_reply_func,
    apply_character_brain_reply_text_func,
    build_companion_turn_func,
    remember_interaction_func,
    update_character_brain_session_state_func,
    stage_delivered_turn_func,
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
        llm_started_ms = perf_now_ms_func()
        reply = call_llm_func(
            user_message,
            history,
            image_data_url=image_data_url,
            is_auto=is_auto,
            force_tools=force_tools,
            config=chat_config,
        )
        if not is_model_direct_reply_enabled(chat_config):
            reply = apply_demo_stable_identity_fallback_func(
                chat_config, user_message, reply
            )
        llm_ms = perf_now_ms_func() - llm_started_ms
        runtime_started_ms = perf_now_ms_func()
        model_direct_reply = is_model_direct_reply_enabled(chat_config)
        if model_direct_reply:
            runtime_meta = None
        else:
            reply, runtime_meta = apply_character_runtime_reply_func(chat_config, reply)
            reply = apply_character_brain_reply_text_func(chat_config, user_message, reply)
        runtime_ms = perf_now_ms_func() - runtime_started_ms
        payload = {"reply": str(reply or "")}
        if runtime_meta is not None:
            payload["character_runtime"] = runtime_meta
        brain_payload = None if model_direct_reply else build_character_brain_response_payload_func(chat_config)
        if brain_payload is not None:
            payload["character_brain"] = brain_payload
        companion_turn = _build_companion_turn_safely(
            build_companion_turn_func,
            chat_config,
            reply,
            perf_trace_id=perf_trace_id,
            is_auto=is_auto,
            runtime_metadata=runtime_meta,
            character_brain=brain_payload,
        )
        if companion_turn is not None:
            payload["turn"] = companion_turn
        delivery_id = _stage_delivered_turn(
            chat_config,
            user_message,
            history,
            reply,
            is_auto=is_auto,
            interaction_id=perf_trace_id,
            remember_interaction_func=remember_interaction_func,
            update_character_brain_session_state_func=update_character_brain_session_state_func,
            get_history_summary_settings_func=get_history_summary_settings_func,
            sanitize_history_func=sanitize_history_func,
            stage_delivered_turn_func=stage_delivered_turn_func,
            defer_until_delivery=delivery_receipt_enabled,
        )
        if delivery_id:
            payload["delivery_id"] = delivery_id
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
    build_companion_turn_func,
    remember_interaction_func,
    update_character_brain_session_state_func,
    stage_delivered_turn_func,
    acknowledge_delivered_turn_func,
    build_character_brain_response_payload_func,
    get_history_summary_settings_func,
    sanitize_history_func,
    diagnose_llm_exception_func,
    log_backend_exception_func,
    log_backend_perf_func,
    diagnostic_payload_func,
    perf_now_ms_func,
):
    delivery_receipt_enabled = _has_delivered_turn_receipt_capability(body)
    if delivery_receipt_enabled:
        _acknowledge_pending_delivered_turns(body, acknowledge_delivered_turn_func)
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
    history = _drop_duplicate_current_user_history_item(history, user_message)
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
            delivery_receipt_enabled=delivery_receipt_enabled,
            perf_trace_id=perf_trace_id,
            perf_started_ms=perf_started_ms,
            begin_sse_func=begin_sse_func,
            send_sse_func=send_sse_func,
            call_llm_stream_func=call_llm_stream_func,
            finalize_assistant_reply_func=finalize_assistant_reply_func,
            apply_demo_stable_identity_fallback_func=apply_demo_stable_identity_fallback_func,
            apply_character_runtime_reply_func=apply_character_runtime_reply_func,
            apply_character_brain_reply_text_func=apply_character_brain_reply_text_func,
            build_companion_turn_func=build_companion_turn_func,
            remember_interaction_func=remember_interaction_func,
            update_character_brain_session_state_func=update_character_brain_session_state_func,
            stage_delivered_turn_func=stage_delivered_turn_func,
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
        delivery_receipt_enabled=delivery_receipt_enabled,
        perf_trace_id=perf_trace_id,
        perf_started_ms=perf_started_ms,
        perf_headers=perf_headers,
        send_json_func=send_json_func,
        call_llm_func=call_llm_func,
        apply_demo_stable_identity_fallback_func=apply_demo_stable_identity_fallback_func,
        apply_character_runtime_reply_func=apply_character_runtime_reply_func,
        apply_character_brain_reply_text_func=apply_character_brain_reply_text_func,
        build_companion_turn_func=build_companion_turn_func,
        remember_interaction_func=remember_interaction_func,
        update_character_brain_session_state_func=update_character_brain_session_state_func,
        stage_delivered_turn_func=stage_delivered_turn_func,
        build_character_brain_response_payload_func=build_character_brain_response_payload_func,
        get_history_summary_settings_func=get_history_summary_settings_func,
        sanitize_history_func=sanitize_history_func,
        diagnose_llm_exception_func=diagnose_llm_exception_func,
        log_backend_exception_func=log_backend_exception_func,
        log_backend_perf_func=log_backend_perf_func,
        diagnostic_payload_func=diagnostic_payload_func,
        perf_now_ms_func=perf_now_ms_func,
    )
