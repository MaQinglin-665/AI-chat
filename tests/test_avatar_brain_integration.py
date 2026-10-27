"""Fake-provider integration; never consumes credentials or real model calls."""
import inspect
import json

import pytest

import llm_runtime
from avatar_brain import AvatarBrain
from avatar_brain_protocol import OPEN, CLOSE, filter_stream
from test_app_chat_route import RouteRecorder, _handle
from test_avatar_brain import config, decision, world


def runtime_dependencies(fn, cfg, raw, calls):
    deps = {name: (lambda *a, **kw: None) for name in inspect.signature(fn).parameters if name.endswith("_fn")}
    def provider(*args, **kwargs):
        calls.append(args)
        return raw
    def stream(*args, **kwargs):
        calls.append(args)
        return iter(raw)  # single-character fragments exercise split private delimiters
    deps.update(load_config_fn=lambda: cfg,
                build_reply_llm_cfg_fn=lambda cfg, raw: raw,
                build_base_prompt_fn=lambda *a, **kw: ("Existing persona", []),
                build_prompt_with_style_fn=lambda cfg, message, history, prompt, **kw: prompt,
                merge_prompt_with_memory_fn=lambda left, right: left + "\n" + right,
                apply_character_runtime_prompt_contract_fn=lambda cfg, prompt: prompt,
                get_tools_settings_fn=lambda cfg: {},
                should_use_work_tools_fn=lambda *a, **kw: False,
                build_openai_messages_fn=lambda **kw: [{"role": "system", "content": kw["prompt"]},
                                                     {"role": "user", "content": kw["user_message"]}])
    if fn is llm_runtime.call_llm_impl:
        deps.update(should_reply_fn=lambda *a, **kw: True,
                    call_openai_compatible_fn=provider,
                    finalize_assistant_reply_fn=lambda cfg, llm, provider, user, history, text, **kw: text)
    else:
        deps.update(iter_openai_chat_stream_fn=stream,
                    iter_openai_responses_stream_fn=lambda *a: pytest.fail("extra model request"),
                    call_llm_fn=lambda *a, **kw: pytest.fail("extra model request"))
    return deps


@pytest.mark.parametrize("streaming", [False, True])
@pytest.mark.parametrize("suffix", ["valid", "invalid", "missing"])
def test_reply_route_same_call_actions_and_identical_visible_text(streaming, suffix):
    cfg, calls, records = config(), [], []
    cfg["thinking"] = {"enabled": False}
    service = AvatarBrain(lambda: cfg, lambda *a: pytest.fail("proactive during reply"), lambda *a: records.append(a))
    service.update_world(world())
    visible = "我过来沙发这边坐。\n"
    raw = visible
    if suffix == "valid":
        raw += OPEN + json.dumps(decision()) + CLOSE
    elif suffix == "invalid":
        raw += OPEN + '{"actions":[{"type":"execute","path":"private"}]}' + CLOSE
    def reply(user, history, *, config, **kwargs):
        return llm_runtime.call_llm_impl(user, history, config=config,
                                       **runtime_dependencies(llm_runtime.call_llm_impl, config, raw, calls))
    def stream(user, history, *, config, **kwargs):
        chunks = llm_runtime.call_llm_stream_impl(user, history, config=config,
                                                **runtime_dependencies(llm_runtime.call_llm_stream_impl, config, raw, calls))
        yield from filter_stream(chunks, config)
    recorder = RouteRecorder()
    _handle("/api/chat_stream" if streaming else "/api/chat", {"message": "过来沙发这边坐",
            "client_capabilities": {"delivered_turn_receipt_v1": True}}, recorder,
            avatar_brain_service=service, load_config_func=lambda: cfg,
            call_llm_func=reply, call_llm_stream_func=stream)
    payload = recorder.sse[-1] if streaming else recorder.json[-1]["data"]
    assert payload["reply"] == visible
    assert len(calls) == 1
    assert "Existing persona" in calls[0][1][0]["content"]
    assert "World:" in calls[0][1][0]["content"]
    assert recorder.exceptions == []
    assert records == [] and recorder.remembered == []
    recorder.commit_latest_delivery()
    assert recorder.remembered[-1]["reply"] == visible
    if suffix == "missing":
        assert "avatar_brain" not in payload
    else:
        assert len(payload["avatar_brain"]["actions"]) == (2 if suffix == "valid" else 0)
    if streaming:
        assert "".join(p["text"] for p in recorder.sse if p["type"] == "delta") == visible


def test_http_auth_world_proactive_poll_ack_flow(monkeypatch):
    import app
    import app_avatar_brain
    from test_api_health import _run_server_with_config, _post_json, _build_test_config
    cfg = _build_test_config()
    cfg.update(config())
    cfg["server"]["require_api_token"] = True
    monkeypatch.setenv("TAFFY_API_TOKEN_TEST", "avatar-test-token")
    calls, records = [], []
    def model(*args):
        calls.append(args)
        return json.dumps(decision())
    service = AvatarBrain(lambda: cfg, model, lambda cfg, text: records.append(text))
    monkeypatch.setattr(service, "start", lambda: None)
    monkeypatch.setattr(app_avatar_brain, "_service", service)
    headers = {"X-Taffy-Token": "avatar-test-token"}
    with _run_server_with_config(monkeypatch, cfg) as base:
        root = base + "/api/avatar/brain/"
        for route in ("world", "think", "poll", "ack"):
            assert _post_json(root + route, {})[0] == 401
            assert _post_json(root + route, {}, {**headers, "Origin": "https://untrusted.example"})[0] == 403
        assert calls == []
        assert _post_json(root + "world", world(extra="x" * 5000), headers)[0] == 413
        status, payload = _post_json(root + "world", world(path="private"), headers)
        assert status == 200 and "path" not in payload["world"]
        status, payload = _post_json(root + "think", {}, headers)
        assert status == 200 and payload["decision"]["status"] == "planned"
        plan = payload["decision"]
        assert records == [] and len(calls) == 1
        assert _post_json(root + "poll", {}, headers)[1]["plans"][0] == plan
        assert _post_json(root + "ack", {"id": plan["id"], "speech_delivered": True, "action_indices": [0]}, headers)[1]["recorded"] == 2
        assert _post_json(root + "ack", {"id": plan["id"], "speech_delivered": True}, headers)[1]["recorded"] == 0
        assert len(records) == 2


def test_proactive_provider_uses_only_environment_key_and_no_tools(monkeypatch):
    import app_avatar_brain
    import llm_client
    calls = []
    cfg = config()
    cfg["llm"]["api_key"] = "private-do-not-use"
    def provider(llm, messages):
        calls.append((llm, messages))
        return json.dumps(decision())
    monkeypatch.setattr(llm_client, "call_openai_compatible", provider)
    app_avatar_brain.call_model(cfg, "bounded world", "idle")
    assert "api_key" not in calls[0][0]
    assert calls[0][0]["api_key_env"] == "TEST_ONLY_ENV"
    assert calls[0][0]["max_tokens"] == 480
    assert "private-do-not-use" not in json.dumps(calls)


@pytest.mark.parametrize("streaming", [False, True])
def test_control_only_reply_reports_error_instead_of_empty_bubble(streaming):
    cfg, calls = config(), []
    cfg["thinking"] = {"enabled": False}
    service = AvatarBrain(lambda: cfg, lambda *a: '', lambda *a: None)
    service.update_world(world())
    raw = '<abstain /> </abstain>' + OPEN + json.dumps(decision()) + CLOSE
    def reply(user, history, *, config, **kwargs):
        deps = runtime_dependencies(llm_runtime.call_llm_impl, config, raw, calls)
        deps['diagnose_llm_exception_fn'] = lambda exc, cfg: exc
        return llm_runtime.call_llm_impl(user, history, config=config, **deps)
    def stream(user, history, *, config, **kwargs):
        yield from filter_stream(iter(raw), config)
    recorder = RouteRecorder()
    _handle('/api/chat_stream' if streaming else '/api/chat', {'message':'你好'}, recorder,
            avatar_brain_service=service, load_config_func=lambda:cfg,
            call_llm_func=reply, call_llm_stream_func=stream)
    if streaming:
        assert any(p.get('type') == 'error' for p in recorder.sse)
        assert not any(p.get('type') == 'done' for p in recorder.sse)
    else:
        assert recorder.json[-1]['status'] == 500
        assert 'reply' not in recorder.json[-1]['data']
