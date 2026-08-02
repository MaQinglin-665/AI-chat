from http import HTTPStatus
import time

from companion_turn_contract import is_model_direct_reply_enabled
from natural_conversation import (
    is_natural_conversation_enabled,
    parse_natural_conversation_output,
    public_natural_conversation_decision,
)


CHAT_ROUTES = {"/api/chat", "/api/chat_stream"}
PRE_FINALIZED_STREAM_SENTINEL = "\x00PRE_FINALIZED\x00"
DELIVERED_TURN_RECEIPT_CAPABILITY = "delivered_turn_receipt_v1"
MAX_PENDING_DELIVERY_RECEIPTS = 8


def _iter_natural_reply_chunks(text, max_chars=14):
    """Re-stream a buffered model-direct reply without exposing control tags."""
    source = str(text or "")
    width = max(4, min(32, int(max_chars or 14)))
    for start in range(0, len(source), width):
        chunk = source[start : start + width]
        if chunk:
            yield chunk


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
    resolved["_natural_participation"] = bool(
        is_auto and isinstance(body, dict) and body.get("natural_participation") is True
    )
    resolved["_tools_optional"] = bool(
        isinstance(body, dict) and body.get("tools_optional") is True
    )

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
    publish_event_func=None,
):
    del body
    begin_sse_func(perf_trace_id)

    full_parts = []
    natural_buffering = is_natural_conversation_enabled(chat_config)
    natural_decision = None
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
            if not natural_buffering:
                send_sse_func({"type": "delta", "text": chunk})
        model_direct_reply = is_model_direct_reply_enabled(chat_config)
        raw_stream_reply = "".join(full_parts)
        if natural_buffering:
            natural_decision = parse_natural_conversation_output(
                raw_stream_reply,
                chat_config,
            )
            raw_stream_reply = str(natural_decision.get("reply_text") or "")
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
        public_natural_decision = public_natural_conversation_decision(
            natural_decision
        )
        if natural_buffering and final_reply:
            target_delay_ms = int(
                (public_natural_decision or {}).get("thinking_delay_ms") or 0
            )
            elapsed_ms = perf_now_ms_func() - llm_started_ms
            remaining_ms = max(0, min(5000, target_delay_ms - elapsed_ms))
            if remaining_ms:
                time.sleep(remaining_ms / 1000.0)
            first_delta_ms = perf_now_ms_func() - llm_started_ms
            for visible_chunk in _iter_natural_reply_chunks(final_reply):
                send_sse_func({"type": "delta", "text": visible_chunk})
        done_payload = {"type": "done", "reply": final_reply}
        if public_natural_decision is not None:
            done_payload["conversation_decision"] = public_natural_decision
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
        delivery_id = ""
        if str(final_reply or "").strip():
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
        if final_reply and callable(publish_event_func):
            publish_event_func("assistant_reply", {"source": "chat_stream", "is_auto": is_auto, "interaction_id": perf_trace_id})
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
    publish_event_func=None,
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
        natural_decision = None
        if is_natural_conversation_enabled(chat_config):
            natural_decision = parse_natural_conversation_output(reply, chat_config)
            reply = str(natural_decision.get("reply_text") or "")
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
        public_natural_decision = public_natural_conversation_decision(
            natural_decision
        )
        if public_natural_decision is not None:
            payload["conversation_decision"] = public_natural_decision
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
        delivery_id = ""
        if str(reply or "").strip():
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
        if reply and callable(publish_event_func):
            publish_event_func("assistant_reply", {"source": "chat", "is_auto": is_auto, "interaction_id": perf_trace_id})
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
    process_desktop_qq_command_func=None,
    publish_event_func=None,
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

    if callable(publish_event_func):
        source = "auto" if is_auto else "chat"
        metadata = {"source": source, "modality": chat_config.get("_input_modality", "text"), "is_auto": is_auto, "interaction_id": perf_trace_id}
        publish_event_func("user_chat", metadata)
        if metadata["modality"] == "voice":
            publish_event_func("voice_turn", metadata)
        if isinstance(chat_config.get("_conversation_context"), dict):
            publish_event_func("desktop_observed", {"source": "chat_context", "has_context": True, "interaction_id": perf_trace_id})

    if not is_auto and callable(process_desktop_qq_command_func):
        desktop_qq_result = process_desktop_qq_command_func(user_message)
        if isinstance(desktop_qq_result, dict) and desktop_qq_result.get("matched"):
            chat_config["_qq_desktop_command_result"] = str(desktop_qq_result.get("prompt_note", ""))[:1200]

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
            publish_event_func=publish_event_func,
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
        publish_event_func=publish_event_func,
    )
