import json

import pytest

import asr


class _FakeRecognizer:
    def __init__(self, payload):
        self.payload = payload
        self.words_enabled = False

    def SetWords(self, enabled):
        self.words_enabled = bool(enabled)

    def AcceptWaveform(self, _piece):
        return False

    def Result(self):
        return "{}"

    def FinalResult(self):
        return json.dumps(self.payload)


class _FakeVosk:
    def __init__(self, payloads):
        self.payloads = payloads
        self.model_calls = []

    def Model(self, path):
        self.model_calls.append(str(path))
        return str(path)

    def KaldiRecognizer(self, model, _sample_rate):
        key = str(model).replace("\\", "/").rsplit("/", 1)[-1]
        return _FakeRecognizer(self.payloads[key])


@pytest.fixture(autouse=True)
def _clear_vosk_cache():
    asr._VOSK_MODELS.clear()
    yield
    asr._VOSK_MODELS.clear()


def _result(text, confidence):
    words = [
        {"word": token, "conf": confidence}
        for token in str(text).split()
        if token
    ]
    return {"text": text, "result": words}


def test_extract_vosk_text_preserves_english_spacing_and_compacts_only_cjk():
    assert asr.extract_vosk_text('{"text":"hello world 你 好"}') == "hello world 你好"
    assert asr.extract_vosk_text('{"text":"你 好 hello world"}') == "你好 hello world"


def test_auto_mode_selects_higher_confidence_whole_utterance(tmp_path, monkeypatch):
    zh = tmp_path / "zh"
    en = tmp_path / "en"
    zh.mkdir()
    en.mkdir()
    fake_vosk = _FakeVosk(
        {
            "zh": _result("你 好", 0.44),
            "en": _result("hello world", 0.91),
        }
    )
    monkeypatch.setattr(asr, "vosk", fake_vosk)

    result = asr.transcribe_pcm16_with_vosk_result(
        b"x" * 4000,
        asr_config={
            "input_language_mode": "auto",
            "vosk_model_paths": {"zh-CN": str(zh), "en-US": str(en)},
        },
    )

    assert result == {
        "raw_text": "hello world",
        "detected_language": "en-US",
        "confidence": 0.91,
        "language_selection_ambiguous": False,
    }
    assert len(fake_vosk.model_calls) == 2


def test_auto_mode_keeps_existing_chinese_path_when_english_model_is_missing(tmp_path, monkeypatch):
    zh = tmp_path / "zh"
    zh.mkdir()
    missing_en = tmp_path / "missing-en"
    fake_vosk = _FakeVosk({"zh": _result("你 好", 0.88)})
    monkeypatch.setattr(asr, "vosk", fake_vosk)

    result = asr.transcribe_pcm16_with_vosk_result(
        b"x" * 4000,
        asr_config={
            "input_language_mode": "auto",
            "vosk_model_paths": {"zh-CN": str(zh), "en-US": str(missing_en)},
        },
    )

    assert result["raw_text"] == "你好"
    assert result["detected_language"] == "zh-CN"
    assert result["language_selection_ambiguous"] is False
    assert len(fake_vosk.model_calls) == 1


def test_auto_mode_uses_alias_path_when_default_canonical_path_is_blank(tmp_path, monkeypatch):
    zh = tmp_path / "zh"
    en = tmp_path / "en"
    zh.mkdir()
    en.mkdir()
    fake_vosk = _FakeVosk({"zh": _result("你 好", 0.35), "en": _result("hello", 0.93)})
    monkeypatch.setattr(asr, "vosk", fake_vosk)

    result = asr.transcribe_pcm16_with_vosk_result(
        b"x" * 4000,
        asr_config={
            "input_language_mode": "auto",
            # Mirrors a deep-merged older/local config: canonical default is
            # present but blank, while the user supplied the supported alias.
            "vosk_model_paths": {"zh-CN": str(zh), "en-US": "", "en": str(en)},
        },
    )

    assert result["raw_text"] == "hello"
    assert result["detected_language"] == "en-US"


def test_auto_mode_marks_near_tied_cross_language_candidates_ambiguous(tmp_path, monkeypatch):
    zh = tmp_path / "zh"
    en = tmp_path / "en"
    zh.mkdir()
    en.mkdir()
    fake_vosk = _FakeVosk({"zh": _result("你 好", 0.82), "en": _result("hello world", 0.84)})
    monkeypatch.setattr(asr, "vosk", fake_vosk)

    result = asr.transcribe_pcm16_with_vosk_result(
        b"x" * 4000,
        asr_config={
            "input_language_mode": "auto",
            "vosk_model_paths": {"zh-CN": str(zh), "en-US": str(en)},
        },
    )

    assert result["raw_text"] == "你好"
    assert result["detected_language"] == "zh-CN"
    assert result["language_selection_ambiguous"] is True


def test_explicit_english_mode_requires_a_local_english_model(tmp_path, monkeypatch):
    monkeypatch.setattr(asr, "vosk", _FakeVosk({}))

    with pytest.raises(RuntimeError, match="English Vosk model is unavailable"):
        asr.transcribe_pcm16_with_vosk_result(
            b"x" * 4000,
            asr_config={
                "input_language_mode": "en",
                "vosk_model_paths": {"en-US": str(tmp_path / "missing-en")},
            },
        )


def test_missing_model_error_does_not_echo_a_private_local_path(tmp_path, monkeypatch):
    monkeypatch.setattr(asr, "vosk", _FakeVosk({}))
    missing = tmp_path / "private-model-location"

    with pytest.raises(RuntimeError) as exc_info:
        asr.get_vosk_model(missing)

    assert str(missing) not in str(exc_info.value)


def test_model_load_failure_does_not_echo_configured_private_path(tmp_path, monkeypatch):
    zh = tmp_path / "private-model-location"
    zh.mkdir()

    class _FailingVosk:
        def Model(self, path):
            raise RuntimeError(f"could not load {path}")

    monkeypatch.setattr(asr, "vosk", _FailingVosk())

    with pytest.raises(RuntimeError) as exc_info:
        asr.transcribe_pcm16_with_vosk_result(
            b"x" * 4000,
            asr_config={"input_language_mode": "zh", "vosk_model_paths": {"zh-CN": str(zh)}},
        )

    assert str(zh) not in str(exc_info.value)
    assert "zh-CN Vosk model is unavailable" in str(exc_info.value)


def test_regular_file_is_not_reported_as_a_usable_vosk_model(tmp_path):
    model_file = tmp_path / "not-a-model.txt"
    model_file.write_text("not a Vosk directory", encoding="utf-8")

    availability = asr.get_vosk_model_availability(
        {"vosk_model_paths": {"en-US": str(model_file)}}
    )

    assert availability["languages"]["en-US"]["configured"] is True
    assert availability["languages"]["en-US"]["available"] is False


def test_vosk_models_are_cached_by_local_path(tmp_path, monkeypatch):
    zh = tmp_path / "zh"
    en = tmp_path / "en"
    zh.mkdir()
    en.mkdir()
    fake_vosk = _FakeVosk({"zh": _result("你 好", 0.9), "en": _result("hello", 0.9)})
    monkeypatch.setattr(asr, "vosk", fake_vosk)

    assert asr.get_vosk_model(zh) == str(zh)
    assert asr.get_vosk_model(zh) == str(zh)
    assert asr.get_vosk_model(en) == str(en)
    assert asr.get_vosk_model(en) == str(en)

    assert fake_vosk.model_calls == [str(zh), str(en)]


def test_vosk_model_cache_is_bounded_when_local_model_paths_change(tmp_path, monkeypatch):
    paths = []
    for name in ("zh", "en", "replacement"):
        item = tmp_path / name
        item.mkdir()
        paths.append(item)
    fake_vosk = _FakeVosk({name: _result(name, 0.9) for name in ("zh", "en", "replacement")})
    monkeypatch.setattr(asr, "vosk", fake_vosk)

    for path in paths:
        asr.get_vosk_model(path)

    assert len(asr._VOSK_MODELS) == asr.MAX_VOSK_MODEL_CACHE
    assert str(paths[0]) not in asr._VOSK_MODELS.values()
    asr.get_vosk_model(paths[0])
    assert fake_vosk.model_calls == [str(path) for path in paths] + [str(paths[0])]


def test_short_pcm_skips_model_loading(monkeypatch):
    fake_vosk = _FakeVosk({})
    monkeypatch.setattr(asr, "vosk", fake_vosk)

    assert asr.transcribe_pcm16_with_vosk_result(b"too short") == {
        "raw_text": "",
        "detected_language": "",
        "confidence": 0.0,
        "language_selection_ambiguous": False,
    }
    assert fake_vosk.model_calls == []


def test_preload_vosk_models_warms_only_available_configured_languages(tmp_path, monkeypatch):
    zh = tmp_path / "zh"
    zh.mkdir()
    missing_en = tmp_path / "missing-en"
    fake_vosk = _FakeVosk({"zh": _result("你好", 0.9)})
    monkeypatch.setattr(asr, "vosk", fake_vosk)

    loaded = asr.preload_vosk_models(
        {
            "input_language_mode": "auto",
            "vosk_model_paths": {"zh-CN": str(zh), "en-US": str(missing_en)},
        }
    )

    assert loaded == ("zh-CN",)
    assert fake_vosk.model_calls == [str(zh)]
