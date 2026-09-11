import json
import pytest
from galgame_context import sanitize_galgame_context
from galgame_director import DirectionDecoder, directed_stream
from galgame_director import direction_llm_config
from llm_client import get_openai_tuning


def test_direction_budget_accounts_for_metadata_without_changing_saved_config():
    saved = {"max_output_tokens": 220, "allow_high_output_tokens": False}
    request = direction_llm_config(saved)
    assert get_openai_tuning(request)["max_output_tokens"] == 2048
    assert saved == {"max_output_tokens": 220, "allow_high_output_tokens": False}


def context(**kwargs):
    return sanitize_galgame_context({"enabled": True, "character": "deepblue", **kwargs})


def line(**kwargs):
    return json.dumps({"text": "我在听。", "emotion": "neutral", "sprite": "listening", **kwargs}, ensure_ascii=False) + "\n"


def test_fragmented_json_is_not_exposed_and_sentence_is_immediate():
    cfg = {}
    tail = []
    def source():
        raw = line()
        yield raw[:10]
        yield raw[10:]
        tail.append(True)
        yield line(text="慢慢说。")
    output = directed_stream([source], context(), "你好", cfg)
    assert next(output) == "我在听。"
    assert tail == []
    assert cfg["_galgame_stream_segments"][0]["performance"]["sprite"] == "listening"
    assert list(output) == ["慢慢说。"]


def test_scene_requires_arrival_evidence_confidence_and_unlocked_context():
    raw = line(scene="park-spring", transition="arrival", evidence="我们已经到公园了", confidence=.95)
    assert DirectionDecoder(context(), "我们已经到公园了").feed(raw)[0]["scene"] == "park-spring"
    for ctx, message, overrides in [
        (context(scene_locked=True), "我们已经到公园了", {}),
        (context(), "明天想去公园", {}),
        (context(), "我们已经到公园了", {"transition": "stay"}),
        (context(), "我们已经到公园了", {"confidence": .4}),
        (context(), "我们已经到公园了", {"scene": "../../private"}),
    ]:
        value = json.loads(raw); value.update(overrides)
        assert DirectionDecoder(ctx, message).feed(json.dumps(value)+"\n")[0]["scene"] is None


def test_one_scene_change_per_turn_and_actual_character_pose_allowlist():
    decoder = DirectionDecoder(context(character="claude"), "到公园了，之后到了书店")
    first = decoder.feed(line(scene="park-spring", transition="arrival", confidence=1, evidence="到公园了"))[0]
    assert first["performance"]["sprite"] == "neutral"
    second = decoder.feed(line(scene="bookstore", transition="arrival", confidence=1, evidence="到了书店"))[0]
    assert second["scene"] is None


@pytest.mark.parametrize("message", ["还没到公园", "如果到公园就好了", "她说到公园了", "昨天到公园了", "明天计划到公园"])
def test_non_event_cannot_be_forced_by_high_confidence_arrival_label(message):
    result = DirectionDecoder(context(), message).feed(line(scene="park-spring", transition="arrival", confidence=1, evidence="到公园"))
    assert result[0]["scene"] is None


def test_no_retry_after_visible_sentence_and_no_raw_json_on_failure():
    retried = []
    def bad():
        yield line()
        raise RuntimeError("network")
    def other():
        retried.append(True)
        yield line(text="重复的话。")
    output = directed_stream([bad, other], context(), "", {})
    assert next(output) == "我在听。"
    with pytest.raises(RuntimeError): next(output)
    assert retried == []
    assert list(directed_stream([lambda: iter(["bad json\n"]), other], context(), "", {})) == ["重复的话。"]


def test_route_emits_direction_before_final_reply_and_does_not_rewrite_it():
    from test_app_chat_route import RouteRecorder, _handle
    recorder = RouteRecorder()
    def stream(*args, config, **kwargs):
        yield from directed_stream([lambda: iter([line(), line(text="慢慢说。")])], config["_galgame_context"], "你好", config)
    _handle("/api/chat_stream", {"message": "你好", "galgame": {"enabled": True, "character": "deepblue"}}, recorder,
            call_llm_stream_func=stream,
            finalize_assistant_reply_func=lambda *args, **kwargs: pytest.fail("directed text cannot be rewritten"))
    assert recorder.sse[0]["galgame"]["index"] == 0
    assert recorder.sse[1]["galgame"]["index"] == 1
    assert recorder.sse[-1]["reply"] == "我在听。慢慢说。"


def test_real_runtime_selects_direction_protocol_before_provider_stream():
    from llm_runtime import call_llm_stream_impl
    seen = []
    cfg = {"llm": {"provider": "openai"}, "_galgame_context": context()}
    def messages(**kwargs):
        seen.append(kwargs["prompt"])
        return [{"role": "system", "content": kwargs["prompt"]}]
    output = call_llm_stream_impl("你好", [], config=cfg,
        load_config_fn=lambda: cfg,
        build_reply_llm_cfg_fn=lambda config, raw: raw,
        ensure_llm_auth_ready_fn=lambda config: None,
        build_base_prompt_fn=lambda *args, **kwargs: ("base", []),
        build_prompt_with_style_fn=lambda config, message, history, prompt, **kwargs: prompt,
        build_reply_language_block_fn=lambda config: "language",
        merge_prompt_with_memory_fn=lambda left, right: left + right,
        build_demo_stable_reply_behavior_block_fn=lambda config: "",
        apply_character_runtime_prompt_contract_fn=lambda config, prompt: prompt,
        get_tools_settings_fn=lambda config: {},
        should_use_work_tools_fn=lambda *args, **kwargs: False,
        call_llm_fn=lambda *args, **kwargs: pytest.fail("unexpected buffered fallback"),
        split_text_for_stream_fn=lambda text: [text],
        build_openai_messages_fn=messages,
        iter_openai_chat_stream_fn=lambda *args: iter([line()]),
        iter_openai_responses_stream_fn=lambda *args: pytest.fail("unexpected retry"))
    assert list(output) == ["我在听。"]
    assert "JSONL" in seen[0]
    assert cfg["_galgame_stream_segments"][0]["text"] == "我在听。"
