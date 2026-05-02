import json
import os

from config import OPENAI_DEFAULT_BASE_URL, OPENAI_DEFAULT_KEY_ENV, OPENAI_DEFAULT_MODEL
from llm_client import call_openai_compatible, get_openai_tuning, http_post_json, is_local_url
from llm_response_utils import (
    convert_messages_to_responses_input,
    extract_response_output_text,
    normalize_text_content,
)
from tool_calling_helpers import (
    build_chat_completions_tool_defs as _build_chat_completions_tool_defs,
    build_responses_tool_defs as _build_responses_tool_defs,
    inject_tool_intro as _inject_tool_intro,
    parse_tool_args,
    render_tool_execution_summary as _render_tool_execution_summary,
)
from tools import WORK_TOOL_DEFS, _openai_auth_headers, execute_work_tool, get_tools_settings


TOOL_META_MARKER = "[[TAFFY_TOOL_META]]"
TOOL_INTRO = (
    "When user asks for file/code/command/image tasks, use tools. "
    "For regular chat, reply directly without tools. "
    "Always explain briefly what you changed after tool actions."
)


def render_tool_execution_summary(tool_payloads, max_chars=1800):
    return _render_tool_execution_summary(
        tool_payloads,
        max_chars=max_chars,
        tool_meta_marker=TOOL_META_MARKER,
    )


def build_responses_tool_defs():
    return _build_responses_tool_defs(WORK_TOOL_DEFS)


def build_chat_completions_tool_defs():
    return _build_chat_completions_tool_defs(WORK_TOOL_DEFS)


def inject_tool_intro(messages: list) -> list:
    return _inject_tool_intro(messages, TOOL_INTRO)


def call_openai_chat_completions_with_tools(
    llm_cfg,
    config,
    messages,
    *,
    get_tools_settings_fn=get_tools_settings,
    call_openai_compatible_fn=call_openai_compatible,
    get_openai_tuning_fn=get_openai_tuning,
    is_local_url_fn=is_local_url,
    http_post_json_fn=http_post_json,
    execute_work_tool_fn=execute_work_tool,
):
    tools_settings = get_tools_settings_fn(config)
    if not tools_settings.get("enabled", False):
        return call_openai_compatible_fn(llm_cfg, messages)

    base_url = str(llm_cfg.get("base_url", OPENAI_DEFAULT_BASE_URL)).rstrip("/")
    model = llm_cfg.get("model", OPENAI_DEFAULT_MODEL)
    key_env = llm_cfg.get("api_key_env", OPENAI_DEFAULT_KEY_ENV)
    temperature = float(llm_cfg.get("temperature", 0.7))
    tuning = get_openai_tuning_fn(llm_cfg)

    headers = {}
    api_key = str(llm_cfg.get("api_key", "")).strip() or os.environ.get(key_env, "").strip()
    if api_key:
        headers["Authorization"] = f"Bearer {api_key}"
    elif not is_local_url_fn(base_url):
        raise RuntimeError(
            f"Missing API key. Please set environment variable: {key_env}."
        )

    convo = inject_tool_intro(messages)

    chat_tools = build_chat_completions_tool_defs()
    if not chat_tools:
        return call_openai_compatible_fn(llm_cfg, messages)

    executed_payloads = []
    for _ in range(8):
        payload = {
            "model": model,
            "messages": convo,
            "temperature": temperature,
            "frequency_penalty": tuning["frequency_penalty"],
            "presence_penalty": tuning["presence_penalty"],
            "stream": False,
            "max_tokens": tuning["max_output_tokens"],
            "tools": chat_tools,
            "tool_choice": "required" if not executed_payloads else "auto",
        }
        data = http_post_json_fn(
            f"{base_url}/chat/completions", payload, headers=headers, timeout=90
        )
        choices = data.get("choices") or []
        if not choices:
            break
        message = choices[0].get("message", {}) or {}
        content = normalize_text_content(message.get("content", ""))
        tool_calls = message.get("tool_calls") or []

        if not tool_calls:
            if content:
                return content
            break

        assistant_msg = {"role": "assistant", "tool_calls": tool_calls}
        if content:
            assistant_msg["content"] = content
        convo.append(assistant_msg)

        tool_outputs_added = 0
        for tc in tool_calls:
            if not isinstance(tc, dict):
                continue
            call_id = str(tc.get("id", "")).strip()
            fn = tc.get("function") if isinstance(tc.get("function"), dict) else {}
            fn_name = str(fn.get("name", "")).strip()
            fn_args = parse_tool_args(fn.get("arguments"))
            if not call_id or not fn_name:
                continue
            try:
                result = execute_work_tool_fn(
                    fn_name,
                    fn_args,
                    config,
                    llm_cfg,
                    http_post_json_fn=http_post_json_fn,
                    is_local_url_fn=is_local_url_fn,
                )
                tool_payload = {
                    "ok": True,
                    "tool": fn_name,
                    "args": fn_args,
                    "result": result,
                }
            except Exception as exc:
                tool_payload = {
                    "ok": False,
                    "tool": fn_name,
                    "args": fn_args,
                    "error": str(exc),
                }
            executed_payloads.append(tool_payload)
            convo.append(
                {
                    "role": "tool",
                    "tool_call_id": call_id,
                    "content": json.dumps(tool_payload, ensure_ascii=False),
                }
            )
            tool_outputs_added += 1
        if not tool_outputs_added:
            break

    if executed_payloads:
        return render_tool_execution_summary(
            executed_payloads,
            max_chars=tools_settings.get("max_command_output_chars", 14000),
        )

    return call_openai_compatible_fn(llm_cfg, messages)


def call_openai_compatible_with_tools(
    llm_cfg,
    config,
    messages,
    *,
    get_tools_settings_fn=get_tools_settings,
    call_openai_compatible_fn=call_openai_compatible,
    get_openai_tuning_fn=get_openai_tuning,
    is_local_url_fn=is_local_url,
    http_post_json_fn=http_post_json,
    execute_work_tool_fn=execute_work_tool,
):
    try:
        return call_openai_chat_completions_with_tools(
            llm_cfg,
            config,
            messages,
            get_tools_settings_fn=get_tools_settings_fn,
            call_openai_compatible_fn=call_openai_compatible_fn,
            get_openai_tuning_fn=get_openai_tuning_fn,
            is_local_url_fn=is_local_url_fn,
            http_post_json_fn=http_post_json_fn,
            execute_work_tool_fn=execute_work_tool_fn,
        )
    except Exception:
        pass

    tools_settings = get_tools_settings_fn(config)
    if not tools_settings.get("enabled", False):
        return call_openai_compatible_fn(llm_cfg, messages)

    base_url, headers = _openai_auth_headers(llm_cfg, is_local_url_fn)
    model = llm_cfg.get("model", OPENAI_DEFAULT_MODEL)
    temperature = float(llm_cfg.get("temperature", 0.7))
    tuning = get_openai_tuning_fn(llm_cfg)

    convo = inject_tool_intro(messages)

    responses_tools = build_responses_tool_defs()
    if not responses_tools:
        return call_openai_compatible_fn(llm_cfg, messages)

    next_input = convert_messages_to_responses_input(convo)
    previous_response_id = None
    executed_payloads = []

    for _ in range(8):
        payload = {
            "model": model,
            "input": next_input,
            "temperature": temperature,
            "frequency_penalty": tuning["frequency_penalty"],
            "presence_penalty": tuning["presence_penalty"],
            "max_output_tokens": tuning["max_output_tokens"],
            "tools": responses_tools,
            "tool_choice": "required" if not executed_payloads else "auto",
            "text": {
                "format": {"type": "text"},
                "verbosity": tuning["verbosity"],
            },
        }
        if tuning["reasoning_effort"]:
            payload["reasoning"] = {"effort": tuning["reasoning_effort"]}
        if previous_response_id:
            payload["previous_response_id"] = previous_response_id
        try:
            data = http_post_json_fn(
                f"{base_url}/responses", payload, headers=headers, timeout=150
            )
        except Exception:
            if executed_payloads:
                return render_tool_execution_summary(
                    executed_payloads,
                    max_chars=tools_settings.get("max_command_output_chars", 14000),
                )
            return call_openai_compatible_fn(llm_cfg, messages)
        resp_id = str(data.get("id", "")).strip()
        if resp_id:
            previous_response_id = resp_id

        outputs = data.get("output") if isinstance(data, dict) else []
        tool_calls = []
        if isinstance(outputs, list):
            for item in outputs:
                if not isinstance(item, dict):
                    continue
                if str(item.get("type", "")).strip() == "function_call":
                    tool_calls.append(item)

        if not tool_calls:
            content = extract_response_output_text(data) if isinstance(data, dict) else ""
            if content:
                return content
            break

        next_input = []
        for tc in tool_calls:
            call_id = str(tc.get("call_id", "")).strip()
            fn_name = str(tc.get("name", "")).strip()
            fn_args = parse_tool_args(tc.get("arguments"))
            try:
                result = execute_work_tool_fn(
                    fn_name,
                    fn_args,
                    config,
                    llm_cfg,
                    http_post_json_fn=http_post_json_fn,
                    is_local_url_fn=is_local_url_fn,
                )
                tool_payload = {
                    "ok": True,
                    "tool": fn_name,
                    "args": fn_args,
                    "result": result,
                }
            except Exception as exc:
                tool_payload = {
                    "ok": False,
                    "tool": fn_name,
                    "args": fn_args,
                    "error": str(exc),
                }
            if not call_id:
                continue
            executed_payloads.append(tool_payload)
            next_input.append(
                {
                    "type": "function_call_output",
                    "call_id": call_id,
                    "output": json.dumps(tool_payload, ensure_ascii=False),
                }
            )
        if not next_input:
            break

    if executed_payloads:
        return render_tool_execution_summary(
            executed_payloads,
            max_chars=tools_settings.get("max_command_output_chars", 14000),
        )

    return call_openai_compatible_fn(llm_cfg, messages)
