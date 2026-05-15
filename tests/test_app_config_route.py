from http import HTTPStatus

from config import DiagnosticError
from app_config_route import handle_config_get_route, handle_config_post_route


class RouteRecorder:
    def __init__(self):
        self.json = []
        self.audio = []
        self.exceptions = []

    def send_json(self, data, status=HTTPStatus.OK, extra_headers=None):
        self.json.append({"data": data, "status": status, "headers": extra_headers})

    def send_audio(self, audio, content_type="audio/mpeg", status=HTTPStatus.OK, extra_headers=None):
        self.audio.append(
            {
                "audio": audio,
                "content_type": content_type,
                "status": status,
                "headers": extra_headers,
            }
        )

    def log_exception(self, *args, **kwargs):
        self.exceptions.append((args, kwargs))


def _diag(exc):
    if hasattr(exc, "to_payload"):
        return exc.to_payload()
    return {"error": str(exc)}


def _post_deps(recorder, **overrides):
    deps = {
        "send_json_func": recorder.send_json,
        "send_audio_func": recorder.send_audio,
        "load_config_func": lambda: {"llm": {"provider": "openai"}},
        "reload_runtime_config_func": lambda: {"ok": True, "server": {}},
        "configure_first_run_llm_func": lambda body: {"saved": {"provider": body.get("provider")}},
        "build_first_run_status_payload_func": lambda _config: {"ok": True, "llm": {"configured": True}},
        "save_config_switch_update_func": lambda _body: {"saved": {"config_saved": True}},
        "build_config_switch_payload_func": lambda _config: {"ok": True, "summary": {}},
        "build_config_switch_test_config_func": lambda body, base_config: {**base_config, **body},
        "validate_config_switch_live2d_update_func": lambda _body: {"ok": True},
        "run_lightweight_llm_probe_func": lambda _config: {"ok": True, "reply_chars": 2},
        "synthesize_tts_audio_func": lambda *_args, **_kwargs: b"ID3audio",
        "guess_audio_content_type_func": lambda _audio: "audio/mpeg",
        "diagnose_llm_exception_func": lambda exc, _cfg: exc,
        "diagnostic_error_type": DiagnosticError,
        "log_backend_exception_func": recorder.log_exception,
        "diagnostic_payload_func": _diag,
    }
    deps.update(overrides)
    return deps


def test_config_get_route_returns_sanitized_client_config():
    recorder = RouteRecorder()
    captured = {}

    handle_config_get_route(
        "/config.json",
        send_json_func=recorder.send_json,
        load_config_func=lambda: {"llm": {"api_key": "secret"}},
        sanitize_client_config_func=lambda cfg: (captured.setdefault("cfg", cfg), {"safe": True})[1],
        build_first_run_status_payload_func=lambda _config: {},
        build_config_switch_payload_func=lambda _config: {},
        reload_runtime_config_func=lambda: {},
        log_backend_exception_func=recorder.log_exception,
        diagnostic_payload_func=_diag,
    )

    assert captured["cfg"] == {"llm": {"api_key": "secret"}}
    assert recorder.json[-1] == {"data": {"safe": True}, "status": HTTPStatus.OK, "headers": None}


def test_config_post_first_run_keeps_saved_payload_when_reload_fails():
    recorder = RouteRecorder()

    def fail_reload():
        raise RuntimeError("reload failed")

    handle_config_post_route(
        "/api/first_run/configure_llm",
        {"provider": "openai-compatible"},
        **_post_deps(recorder, reload_runtime_config_func=fail_reload),
    )

    payload = recorder.json[-1]["data"]
    assert recorder.json[-1]["status"] == HTTPStatus.OK
    assert payload["saved"] == {"provider": "openai-compatible"}
    assert payload["reload"]["ok"] is False
    assert payload["reload"]["error"] == "reload failed"
    assert recorder.exceptions


def test_config_post_validate_live2d_diagnostic_error_returns_bad_request():
    recorder = RouteRecorder()

    def fail_validate(_body):
        raise DiagnosticError(
            code="bad_live2d",
            reason="bad path",
            solution="choose a model under web/models",
            config_key="model_path",
        )

    handle_config_post_route(
        "/api/config/switch/validate_live2d",
        {"live2d": {"model_path": "../secret.model3.json"}},
        perf_headers={"X-Perf-Trace-Id": "req_test"},
        **_post_deps(recorder, validate_config_switch_live2d_update_func=fail_validate),
    )

    assert recorder.json[-1]["status"] == HTTPStatus.BAD_REQUEST
    assert recorder.json[-1]["headers"] == {"X-Perf-Trace-Id": "req_test"}
    assert recorder.json[-1]["data"]["ok"] is False
    assert recorder.json[-1]["data"]["code"] == "bad_live2d"


def test_config_post_test_tts_uses_default_text_and_returns_audio():
    recorder = RouteRecorder()
    captured = {}

    def synthesize(text, voice_override=None, prosody=None, perf_trace_id="", config_override=None):
        captured.update(
            {
                "text": text,
                "voice_override": voice_override,
                "prosody": prosody,
                "perf_trace_id": perf_trace_id,
                "config_override": config_override,
            }
        )
        return b"ID3audio"

    handle_config_post_route(
        "/api/config/switch/test_tts",
        {"tts": {"voice": "draft-voice"}},
        perf_trace_id="tts_test",
        perf_headers={"X-Perf-Trace-Id": "tts_test"},
        **_post_deps(recorder, synthesize_tts_audio_func=synthesize),
    )

    assert captured["text"] == "这是一句语音测试。"
    assert captured["voice_override"] == "draft-voice"
    assert captured["prosody"] == {}
    assert captured["perf_trace_id"] == "tts_test"
    assert recorder.audio[-1]["audio"] == b"ID3audio"
    assert recorder.audio[-1]["headers"] == {"X-Perf-Trace-Id": "tts_test"}


def test_config_post_llm_probe_failure_marks_probe_payload():
    recorder = RouteRecorder()

    handle_config_post_route(
        "/api/llm_probe",
        {},
        perf_headers={"X-Perf-Trace-Id": "req_test"},
        **_post_deps(
            recorder,
            run_lightweight_llm_probe_func=lambda _config: (_ for _ in ()).throw(RuntimeError("provider down")),
        ),
    )

    assert recorder.json[-1]["status"] == HTTPStatus.INTERNAL_SERVER_ERROR
    assert recorder.json[-1]["headers"] == {"X-Perf-Trace-Id": "req_test"}
    assert recorder.json[-1]["data"] == {
        "error": "provider down",
        "ok": False,
        "probe": "llm_lightweight",
    }
