import history_summary


def _history_items(count):
    return [
        {
            "role": "user" if index % 2 == 0 else "assistant",
            "content": f"message {index}",
        }
        for index in range(count)
    ]


def test_history_summary_settings_default_to_async_chat_summary():
    settings = history_summary.get_history_summary_settings({})

    assert settings["keep_recent_messages"] == 8
    assert settings["sync_summarize_on_chat"] is False


def test_build_prompt_respects_keep_recent_messages_without_twelve_item_floor():
    calls = []

    def _summarize(**kwargs):
        calls.append(kwargs)
        return ""

    base_prompt, safe_history = history_summary.build_prompt_with_history_summary(
        {
            "history_summary": {
                "enabled": True,
                "trigger_messages": 8,
                "keep_recent_messages": 6,
                "sync_summarize_on_chat": False,
            }
        },
        {},
        "ollama",
        _history_items(18),
        "base prompt",
        summarize_older_history_func=_summarize,
        merge_prompt_with_memory_func=lambda base, memory: f"{base}\n{memory}",
    )

    assert base_prompt == "base prompt"
    assert [item["content"] for item in safe_history] == [f"message {index}" for index in range(12, 18)]
    assert calls
    assert calls[0]["older_history"][0]["content"] == "message 0"
    assert calls[0]["older_history"][-1]["content"] == "message 11"
    assert calls[0]["allow_create"] is False


def test_summarize_older_history_skips_llm_creation_when_cache_misses_and_create_disabled():
    call_count = 0

    def _call_llm(*_args, **_kwargs):
        nonlocal call_count
        call_count += 1
        return "summary"

    summary = history_summary.summarize_older_history(
        {},
        "ollama",
        _history_items(12),
        allow_create=False,
        cache_lock=_DummyLock(),
        summary_cache={},
        call_openai_compatible_func=_call_llm,
        call_ollama_func=_call_llm,
    )

    assert summary == ""
    assert call_count == 0


def test_summarize_older_history_returns_cached_summary_even_when_create_disabled():
    older_history = _history_items(12)
    raw_dialogue = history_summary.serialize_history_for_summary(older_history, max_messages=96)
    cache_key = history_summary.hashlib.sha1(raw_dialogue.encode("utf-8", errors="ignore")).hexdigest()
    cache = {"key": cache_key, "summary": "cached memory"}
    call_count = 0

    def _call_llm(*_args, **_kwargs):
        nonlocal call_count
        call_count += 1
        return "new summary"

    summary = history_summary.summarize_older_history(
        {},
        "ollama",
        older_history,
        allow_create=False,
        cache_lock=_DummyLock(),
        summary_cache=cache,
        call_openai_compatible_func=_call_llm,
        call_ollama_func=_call_llm,
    )

    assert summary == "cached memory"
    assert call_count == 0


class _DummyLock:
    def __enter__(self):
        return self

    def __exit__(self, *_args):
        return False
