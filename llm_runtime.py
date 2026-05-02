from config import OLLAMA_DEFAULT_MODEL


OPENAI_COMPATIBLE_PROVIDERS = {"openai", "openai-compatible", "openai_compatible"}
PRE_FINALIZED_STREAM_SENTINEL = "\x00PRE_FINALIZED\x00"


def resolve_runtime_provider(llm_cfg_raw):
    provider = str((llm_cfg_raw or {}).get("provider", "")).strip().lower()
    if provider:
        return provider
    base_url = str((llm_cfg_raw or {}).get("base_url", "")).strip().lower()
    return "ollama" if "11434" in base_url or "ollama" in base_url else "openai"


def build_reply_prompt(
    *,
    config,
    user_message,
    safe_history,
    base_prompt,
    is_auto,
    build_prompt_with_style_fn,
    build_reply_language_block_fn,
    merge_prompt_with_memory_fn,
    build_demo_stable_reply_behavior_block_fn,
    apply_character_runtime_prompt_contract_fn,
):
    prompt = build_prompt_with_style_fn(
        config,
        user_message,
        safe_history,
        base_prompt,
        is_auto=is_auto,
    )
    lang_block = build_reply_language_block_fn(config)
    if lang_block:
        prompt = merge_prompt_with_memory_fn(prompt, lang_block)
    stable_behavior_block = build_demo_stable_reply_behavior_block_fn(config)
    if stable_behavior_block:
        prompt = merge_prompt_with_memory_fn(prompt, stable_behavior_block)
    return apply_character_runtime_prompt_contract_fn(config, prompt)


def call_llm_impl(
    user_message,
    history,
    image_data_url=None,
    is_auto=False,
    force_tools=False,
    config=None,
    *,
    load_config_fn,
    should_reply_fn,
    build_reply_llm_cfg_fn,
    ensure_llm_auth_ready_fn,
    build_base_prompt_fn,
    generate_inner_thought_fn,
    load_emotion_state_fn,
    hour_to_period_hint_fn,
    build_prompt_with_style_fn,
    build_reply_language_block_fn,
    merge_prompt_with_memory_fn,
    build_demo_stable_reply_behavior_block_fn,
    apply_character_runtime_prompt_contract_fn,
    get_tools_settings_fn,
    build_openai_messages_fn,
    should_use_work_tools_fn,
    call_openai_compatible_with_tools_fn,
    call_openai_compatible_fn,
    finalize_assistant_reply_fn,
    update_emotion_from_reply_fn,
    wrap_vision_error_fn,
    diagnose_llm_exception_fn,
    is_likely_ollama_vision_model_fn,
    extract_base64_from_data_url_fn,
    build_ollama_messages_fn,
    call_ollama_fn,
):
    if not isinstance(config, dict):
        config = load_config_fn()
    if not should_reply_fn(user_message, config=config, is_auto=is_auto):
        return ""
    llm_cfg_raw = config.get("llm", {})
    llm_cfg = build_reply_llm_cfg_fn(config, llm_cfg_raw)
    provider = resolve_runtime_provider(llm_cfg_raw)
    ensure_llm_auth_ready_fn(llm_cfg)

    base_prompt, safe_history = build_base_prompt_fn(
        config, user_message, history, llm_cfg_raw, provider
    )

    thought = ""
    thinking_cfg = config.get("thinking", {})
    if thinking_cfg.get("enabled", True) and not is_auto:
        thought = generate_inner_thought_fn(
            llm_cfg, user_message, safe_history,
            persona_summary=base_prompt[:200],
            emotion_state=load_emotion_state_fn(),
            config=config,
        )
    if thought:
        import datetime as _datetime
        hour = _datetime.datetime.now().hour
        time_hint = hour_to_period_hint_fn(hour)
        thought_prefix = (
            f"[Inner thought for this turn]: {thought}\n"
            f"[Current local time]: {time_hint}\n"
            "Use this as soft guidance for direction, tone, length, and opening.\n"
            "Do not expose the inner thought directly, and keep the reply coherent.\n"
            "Avoid ending with a question unless it is genuinely needed.\n\n"
        )
    else:
        thought_prefix = ""

    prompt = build_reply_prompt(
        config=config,
        user_message=user_message,
        safe_history=safe_history,
        base_prompt=base_prompt,
        is_auto=is_auto,
        build_prompt_with_style_fn=build_prompt_with_style_fn,
        build_reply_language_block_fn=build_reply_language_block_fn,
        merge_prompt_with_memory_fn=merge_prompt_with_memory_fn,
        build_demo_stable_reply_behavior_block_fn=build_demo_stable_reply_behavior_block_fn,
        apply_character_runtime_prompt_contract_fn=apply_character_runtime_prompt_contract_fn,
    )
    effective_user_message = thought_prefix + user_message if thought else user_message

    tools_settings = get_tools_settings_fn(config)

    if provider in OPENAI_COMPATIBLE_PROVIDERS:
        messages = build_openai_messages_fn(
            prompt=prompt,
            safe_history=safe_history,
            user_message=effective_user_message,
            image_data_url=image_data_url,
        )
        try:
            if force_tools or should_use_work_tools_fn(user_message, tools_settings, image_data_url=image_data_url):
                raw_reply = call_openai_compatible_with_tools_fn(llm_cfg, config, messages)
            else:
                raw_reply = call_openai_compatible_fn(llm_cfg, messages)
            final = finalize_assistant_reply_fn(
                config,
                llm_cfg,
                provider,
                user_message,
                safe_history,
                raw_reply,
                is_auto=is_auto,
            )
            if final and not is_auto:
                update_emotion_from_reply_fn(user_message, final)
            return final
        except Exception as exc:
            if image_data_url:
                wrapped = wrap_vision_error_fn(exc)
                if wrapped is not exc:
                    raise wrapped from exc
            raise diagnose_llm_exception_fn(exc, llm_cfg) from exc

    if provider == "ollama":
        vision_model = str(
            llm_cfg.get("vision_model")
            or llm_cfg.get("model")
            or OLLAMA_DEFAULT_MODEL
        ).strip()
        text_model = str(
            llm_cfg.get("text_model")
            or llm_cfg.get("model")
            or OLLAMA_DEFAULT_MODEL
        ).strip()
        selected_model = vision_model if image_data_url else text_model

        if image_data_url and not is_likely_ollama_vision_model_fn(selected_model):
            raise RuntimeError(
                "Current Ollama model is text-only. Please switch to a vision model (for example: qwen2.5vl:7b)."
            )
        image_base64 = extract_base64_from_data_url_fn(image_data_url)
        messages = build_ollama_messages_fn(
            prompt=prompt,
            safe_history=safe_history,
            user_message=effective_user_message,
            image_base64=image_base64,
        )
        try:
            raw_reply = call_ollama_fn(llm_cfg, messages, model_override=selected_model)
            final = finalize_assistant_reply_fn(
                config,
                llm_cfg,
                provider,
                user_message,
                safe_history,
                raw_reply,
                is_auto=is_auto,
            )
            if final and not is_auto:
                update_emotion_from_reply_fn(user_message, final)
            return final
        except Exception as exc:
            if image_data_url:
                wrapped = wrap_vision_error_fn(exc)
                if wrapped is not exc:
                    raise wrapped from exc
            raise diagnose_llm_exception_fn(exc, llm_cfg) from exc

    raise RuntimeError(
        f"Unsupported llm.provider: {provider}. Use 'openai' or 'ollama'."
    )


def call_llm_stream_impl(
    user_message,
    history,
    image_data_url=None,
    is_auto=False,
    force_tools=False,
    config=None,
    *,
    load_config_fn,
    build_reply_llm_cfg_fn,
    ensure_llm_auth_ready_fn,
    build_base_prompt_fn,
    build_prompt_with_style_fn,
    build_reply_language_block_fn,
    merge_prompt_with_memory_fn,
    build_demo_stable_reply_behavior_block_fn,
    apply_character_runtime_prompt_contract_fn,
    get_tools_settings_fn,
    should_use_work_tools_fn,
    call_llm_fn,
    split_text_for_stream_fn,
    build_openai_messages_fn,
    iter_openai_chat_stream_fn,
    iter_openai_responses_stream_fn,
):
    if not isinstance(config, dict):
        config = load_config_fn()
    llm_cfg_raw = config.get("llm", {})
    llm_cfg = build_reply_llm_cfg_fn(config, llm_cfg_raw)
    provider = resolve_runtime_provider(llm_cfg_raw)
    ensure_llm_auth_ready_fn(llm_cfg)

    base_prompt, safe_history = build_base_prompt_fn(
        config, user_message, history, llm_cfg_raw, provider
    )
    merged_prompt = build_reply_prompt(
        config=config,
        user_message=user_message,
        safe_history=safe_history,
        base_prompt=base_prompt,
        is_auto=is_auto,
        build_prompt_with_style_fn=build_prompt_with_style_fn,
        build_reply_language_block_fn=build_reply_language_block_fn,
        merge_prompt_with_memory_fn=merge_prompt_with_memory_fn,
        build_demo_stable_reply_behavior_block_fn=build_demo_stable_reply_behavior_block_fn,
        apply_character_runtime_prompt_contract_fn=apply_character_runtime_prompt_contract_fn,
    )

    tools_settings = get_tools_settings_fn(config)

    if (
        provider in OPENAI_COMPATIBLE_PROVIDERS
        and (force_tools or should_use_work_tools_fn(user_message, tools_settings, image_data_url=image_data_url))
    ):
        reply = call_llm_fn(
            user_message,
            history,
            image_data_url=image_data_url,
            is_auto=is_auto,
            force_tools=force_tools,
            config=config,
        )
        for chunk in split_text_for_stream_fn(reply):
            yield chunk
        return

    if provider in OPENAI_COMPATIBLE_PROVIDERS:
        messages = build_openai_messages_fn(
            prompt=merged_prompt,
            safe_history=safe_history,
            user_message=user_message,
            image_data_url=image_data_url,
        )
        streamed = False

        try:
            for chunk in iter_openai_chat_stream_fn(llm_cfg, messages):
                if isinstance(chunk, str) and chunk:
                    streamed = True
                    yield chunk
        except Exception:
            streamed = False
        if streamed:
            return

        try:
            for chunk in iter_openai_responses_stream_fn(llm_cfg, messages):
                if isinstance(chunk, str) and chunk:
                    streamed = True
                    yield chunk
        except Exception:
            streamed = False
        if streamed:
            return

    reply = call_llm_fn(
        user_message,
        history,
        image_data_url=image_data_url,
        is_auto=is_auto,
        force_tools=force_tools,
        config=config,
    )
    yield PRE_FINALIZED_STREAM_SENTINEL
    for chunk in split_text_for_stream_fn(reply):
        yield chunk
