from http import HTTPStatus


CONFIG_GET_ROUTES = {
    "/api/first_run/status",
    "/config.json",
    "/api/config/switch",
    "/api/config/reload",
}

CONFIG_POST_RAW_JSON_ROUTES = {
    "/api/first_run/configure_llm",
    "/api/config/switch",
    "/api/config/reload",
}

CONFIG_POST_PERF_ROUTES = {
    "/api/config/switch/test_llm",
    "/api/config/switch/test_tts",
    "/api/config/switch/validate_live2d",
    "/api/llm_probe",
}

CONFIG_POST_ROUTES = CONFIG_POST_RAW_JSON_ROUTES | CONFIG_POST_PERF_ROUTES


def _safe_body_dict(body):
    return body if isinstance(body, dict) else {}


def handle_config_get_route(
    path_only,
    *,
    send_json_func,
    load_config_func,
    sanitize_client_config_func,
    build_first_run_status_payload_func,
    build_config_switch_payload_func,
    reload_runtime_config_func,
    log_backend_exception_func,
    diagnostic_payload_func,
):
    if path_only == "/api/first_run/status":
        try:
            config = load_config_func()
            send_json_func(build_first_run_status_payload_func(config))
        except Exception as exc:
            log_backend_exception_func("CONFIG", exc, extra="GET /api/first_run/status failed")
            send_json_func(
                {"ok": False, **diagnostic_payload_func(exc)},
                status=HTTPStatus.INTERNAL_SERVER_ERROR,
            )
        return

    if path_only == "/config.json":
        try:
            config = load_config_func()
            send_json_func(sanitize_client_config_func(config))
        except Exception as exc:
            log_backend_exception_func("CONFIG", exc, extra="GET /config.json failed")
            send_json_func(
                diagnostic_payload_func(exc),
                status=HTTPStatus.INTERNAL_SERVER_ERROR,
            )
        return

    if path_only == "/api/config/switch":
        try:
            config = load_config_func()
            send_json_func(build_config_switch_payload_func(config))
        except Exception as exc:
            log_backend_exception_func("CONFIG", exc, extra="GET /api/config/switch failed")
            send_json_func(
                diagnostic_payload_func(exc),
                status=HTTPStatus.INTERNAL_SERVER_ERROR,
            )
        return

    if path_only == "/api/config/reload":
        try:
            send_json_func(reload_runtime_config_func())
        except Exception as exc:
            log_backend_exception_func("CONFIG", exc, extra="GET /api/config/reload failed")
            send_json_func(
                {"ok": False, **diagnostic_payload_func(exc)},
                status=HTTPStatus.INTERNAL_SERVER_ERROR,
            )


def _handle_first_run_configure_llm(
    body,
    *,
    send_json_func,
    load_config_func,
    reload_runtime_config_func,
    configure_first_run_llm_func,
    build_first_run_status_payload_func,
    diagnostic_error_type,
    log_backend_exception_func,
    diagnostic_payload_func,
):
    body = _safe_body_dict(body)
    try:
        saved = configure_first_run_llm_func(body)
        try:
            reload_snapshot = reload_runtime_config_func()
        except Exception as reload_exc:
            log_backend_exception_func(
                "CONFIG",
                reload_exc,
                extra="POST /api/first_run/configure_llm reload failed",
            )
            reload_snapshot = {"ok": False, **diagnostic_payload_func(reload_exc)}
        status_payload = build_first_run_status_payload_func(load_config_func())
        send_json_func(
            {
                **status_payload,
                "saved": saved.get("saved", {}),
                "reload": reload_snapshot,
            },
            status=HTTPStatus.OK,
        )
    except diagnostic_error_type as exc:
        send_json_func(
            {"ok": False, **diagnostic_payload_func(exc)},
            status=HTTPStatus.BAD_REQUEST,
        )
    except Exception as exc:
        log_backend_exception_func("CONFIG", exc, extra="POST /api/first_run/configure_llm failed")
        send_json_func(
            {"ok": False, **diagnostic_payload_func(exc)},
            status=HTTPStatus.INTERNAL_SERVER_ERROR,
        )


def _handle_config_switch_update(
    body,
    *,
    send_json_func,
    load_config_func,
    reload_runtime_config_func,
    save_config_switch_update_func,
    build_config_switch_payload_func,
    diagnostic_error_type,
    log_backend_exception_func,
    diagnostic_payload_func,
):
    body = _safe_body_dict(body)
    try:
        saved = save_config_switch_update_func(body)
        try:
            reload_snapshot = reload_runtime_config_func()
        except Exception as reload_exc:
            log_backend_exception_func(
                "CONFIG",
                reload_exc,
                extra="POST /api/config/switch reload failed",
            )
            reload_snapshot = {"ok": False, **diagnostic_payload_func(reload_exc)}
        current = build_config_switch_payload_func(load_config_func())
        send_json_func(
            {
                **current,
                "saved": saved.get("saved", {}),
                "reload": reload_snapshot,
            },
            status=HTTPStatus.OK,
        )
    except diagnostic_error_type as exc:
        send_json_func(
            {"ok": False, **diagnostic_payload_func(exc)},
            status=HTTPStatus.BAD_REQUEST,
        )
    except Exception as exc:
        log_backend_exception_func("CONFIG", exc, extra="POST /api/config/switch failed")
        send_json_func(
            {"ok": False, **diagnostic_payload_func(exc)},
            status=HTTPStatus.INTERNAL_SERVER_ERROR,
        )


def _handle_config_reload(
    *,
    send_json_func,
    reload_runtime_config_func,
    log_backend_exception_func,
    diagnostic_payload_func,
):
    try:
        send_json_func(reload_runtime_config_func())
    except Exception as exc:
        log_backend_exception_func("CONFIG", exc, extra="POST /api/config/reload failed")
        send_json_func(
            {"ok": False, **diagnostic_payload_func(exc)},
            status=HTTPStatus.INTERNAL_SERVER_ERROR,
        )


def _handle_config_switch_test_llm(
    body,
    *,
    perf_headers,
    send_json_func,
    load_config_func,
    build_config_switch_test_config_func,
    run_lightweight_llm_probe_func,
    diagnose_llm_exception_func,
    diagnostic_payload_func,
):
    try:
        probe_config = build_config_switch_test_config_func(body, load_config_func())
        payload = run_lightweight_llm_probe_func(probe_config)
        send_json_func(payload, status=HTTPStatus.OK, extra_headers=perf_headers)
    except Exception as exc:
        cfg = {}
        try:
            cfg = build_config_switch_test_config_func(body, load_config_func()).get("llm", {})
        except Exception:
            cfg = {}
        diagnosed = diagnose_llm_exception_func(exc, cfg)
        safe = diagnostic_payload_func(diagnosed)
        safe["ok"] = False
        safe["probe"] = "config_switch_llm_lightweight"
        send_json_func(
            safe,
            status=HTTPStatus.INTERNAL_SERVER_ERROR,
            extra_headers=perf_headers,
        )


def _handle_config_switch_validate_live2d(
    body,
    *,
    perf_headers,
    send_json_func,
    validate_config_switch_live2d_update_func,
    diagnostic_error_type,
    log_backend_exception_func,
    diagnostic_payload_func,
):
    try:
        payload = validate_config_switch_live2d_update_func(
            body.get("live2d", body) if isinstance(body, dict) else {}
        )
        send_json_func(payload, status=HTTPStatus.OK, extra_headers=perf_headers)
    except diagnostic_error_type as exc:
        send_json_func(
            {"ok": False, **diagnostic_payload_func(exc)},
            status=HTTPStatus.BAD_REQUEST,
            extra_headers=perf_headers,
        )
    except Exception as exc:
        log_backend_exception_func("CONFIG", exc, extra="POST /api/config/switch/validate_live2d failed")
        send_json_func(
            {"ok": False, **diagnostic_payload_func(exc)},
            status=HTTPStatus.INTERNAL_SERVER_ERROR,
            extra_headers=perf_headers,
        )


def _handle_config_switch_test_tts(
    body,
    *,
    perf_trace_id,
    perf_headers,
    send_json_func,
    send_audio_func,
    load_config_func,
    build_config_switch_test_config_func,
    synthesize_tts_audio_func,
    guess_audio_content_type_func,
    diagnostic_error_type,
    log_backend_exception_func,
    diagnostic_payload_func,
):
    try:
        test_config = build_config_switch_test_config_func(body, load_config_func())
        tts_body = body.get("tts", {}) if isinstance(body, dict) and isinstance(body.get("tts"), dict) else {}
        text = str(body.get("text", "") if isinstance(body, dict) else "").strip()
        if not text:
            text = "这是一句语音测试。"
        audio = synthesize_tts_audio_func(
            text,
            voice_override=tts_body.get("voice"),
            prosody={},
            perf_trace_id=perf_trace_id,
            config_override=test_config,
        )
        if not audio:
            send_json_func(
                {"ok": False, "error": "TTS returned empty audio."},
                status=HTTPStatus.SERVICE_UNAVAILABLE,
                extra_headers=perf_headers,
            )
            return
        send_audio_func(
            audio,
            content_type=guess_audio_content_type_func(audio),
            extra_headers=perf_headers,
        )
    except diagnostic_error_type as exc:
        send_json_func(
            {"ok": False, **diagnostic_payload_func(exc)},
            status=HTTPStatus.BAD_REQUEST,
            extra_headers=perf_headers,
        )
    except Exception as exc:
        log_backend_exception_func("TTS", exc, extra="POST /api/config/switch/test_tts failed")
        send_json_func(
            {"ok": False, **diagnostic_payload_func(exc)},
            status=HTTPStatus.INTERNAL_SERVER_ERROR,
            extra_headers=perf_headers,
        )


def _handle_llm_probe(
    *,
    perf_headers,
    send_json_func,
    load_config_func,
    run_lightweight_llm_probe_func,
    diagnose_llm_exception_func,
    diagnostic_payload_func,
):
    try:
        probe_config = load_config_func()
        payload = run_lightweight_llm_probe_func(probe_config)
        send_json_func(payload, status=HTTPStatus.OK, extra_headers=perf_headers)
    except Exception as exc:
        cfg = {}
        try:
            cfg = load_config_func().get("llm", {})
        except Exception:
            cfg = {}
        diagnosed = diagnose_llm_exception_func(exc, cfg)
        safe = diagnostic_payload_func(diagnosed)
        safe["ok"] = False
        safe["probe"] = "llm_lightweight"
        send_json_func(
            safe,
            status=HTTPStatus.INTERNAL_SERVER_ERROR,
            extra_headers=perf_headers,
        )


def handle_config_post_route(
    path_only,
    body,
    *,
    perf_trace_id="",
    perf_headers=None,
    send_json_func,
    send_audio_func,
    load_config_func,
    reload_runtime_config_func,
    configure_first_run_llm_func,
    build_first_run_status_payload_func,
    save_config_switch_update_func,
    build_config_switch_payload_func,
    build_config_switch_test_config_func,
    validate_config_switch_live2d_update_func,
    run_lightweight_llm_probe_func,
    synthesize_tts_audio_func,
    guess_audio_content_type_func,
    diagnose_llm_exception_func,
    diagnostic_error_type,
    log_backend_exception_func,
    diagnostic_payload_func,
):
    if path_only == "/api/first_run/configure_llm":
        _handle_first_run_configure_llm(
            body,
            send_json_func=send_json_func,
            load_config_func=load_config_func,
            reload_runtime_config_func=reload_runtime_config_func,
            configure_first_run_llm_func=configure_first_run_llm_func,
            build_first_run_status_payload_func=build_first_run_status_payload_func,
            diagnostic_error_type=diagnostic_error_type,
            log_backend_exception_func=log_backend_exception_func,
            diagnostic_payload_func=diagnostic_payload_func,
        )
        return

    if path_only == "/api/config/switch":
        _handle_config_switch_update(
            body,
            send_json_func=send_json_func,
            load_config_func=load_config_func,
            reload_runtime_config_func=reload_runtime_config_func,
            save_config_switch_update_func=save_config_switch_update_func,
            build_config_switch_payload_func=build_config_switch_payload_func,
            diagnostic_error_type=diagnostic_error_type,
            log_backend_exception_func=log_backend_exception_func,
            diagnostic_payload_func=diagnostic_payload_func,
        )
        return

    if path_only == "/api/config/reload":
        _handle_config_reload(
            send_json_func=send_json_func,
            reload_runtime_config_func=reload_runtime_config_func,
            log_backend_exception_func=log_backend_exception_func,
            diagnostic_payload_func=diagnostic_payload_func,
        )
        return

    if path_only == "/api/config/switch/test_llm":
        _handle_config_switch_test_llm(
            body,
            perf_headers=perf_headers,
            send_json_func=send_json_func,
            load_config_func=load_config_func,
            build_config_switch_test_config_func=build_config_switch_test_config_func,
            run_lightweight_llm_probe_func=run_lightweight_llm_probe_func,
            diagnose_llm_exception_func=diagnose_llm_exception_func,
            diagnostic_payload_func=diagnostic_payload_func,
        )
        return

    if path_only == "/api/config/switch/validate_live2d":
        _handle_config_switch_validate_live2d(
            body,
            perf_headers=perf_headers,
            send_json_func=send_json_func,
            validate_config_switch_live2d_update_func=validate_config_switch_live2d_update_func,
            diagnostic_error_type=diagnostic_error_type,
            log_backend_exception_func=log_backend_exception_func,
            diagnostic_payload_func=diagnostic_payload_func,
        )
        return

    if path_only == "/api/config/switch/test_tts":
        _handle_config_switch_test_tts(
            body,
            perf_trace_id=perf_trace_id,
            perf_headers=perf_headers,
            send_json_func=send_json_func,
            send_audio_func=send_audio_func,
            load_config_func=load_config_func,
            build_config_switch_test_config_func=build_config_switch_test_config_func,
            synthesize_tts_audio_func=synthesize_tts_audio_func,
            guess_audio_content_type_func=guess_audio_content_type_func,
            diagnostic_error_type=diagnostic_error_type,
            log_backend_exception_func=log_backend_exception_func,
            diagnostic_payload_func=diagnostic_payload_func,
        )
        return

    if path_only == "/api/llm_probe":
        _handle_llm_probe(
            perf_headers=perf_headers,
            send_json_func=send_json_func,
            load_config_func=load_config_func,
            run_lightweight_llm_probe_func=run_lightweight_llm_probe_func,
            diagnose_llm_exception_func=diagnose_llm_exception_func,
            diagnostic_payload_func=diagnostic_payload_func,
        )
