from http import HTTPStatus


MEMORY_GET_ROUTES = {
    "/api/persona_card",
    "/api/learning/candidates",
    "/api/learning/samples",
    "/api/memory/core",
    "/api/memory/short",
    "/api/memory/debug",
}

MEMORY_POST_ROUTES = {
    "/api/persona_card",
    "/api/learning/reload",
    "/api/learning/promote",
    "/api/learning/update",
    "/api/memory/core/update",
    "/api/memory/short/update",
}


def _send_exception(
    *,
    scope,
    extra,
    exc,
    send_json_func,
    log_backend_exception_func,
    diagnostic_payload_func,
):
    log_backend_exception_func(scope, exc, extra=extra)
    send_json_func(
        {"ok": False, **diagnostic_payload_func(exc)},
        status=HTTPStatus.INTERNAL_SERVER_ERROR,
    )


def _payload_status(payload):
    return HTTPStatus.OK if payload.get("ok", True) else HTTPStatus.BAD_REQUEST


def handle_memory_get_route(
    path_only,
    *,
    send_json_func,
    load_config_func,
    load_manual_persona_card_func,
    get_learning_candidates_for_review_func,
    get_learning_samples_for_review_func,
    get_core_memories_for_review_func,
    get_short_term_memories_for_review_func,
    get_memory_debug_snapshot_func,
    log_backend_exception_func,
    diagnostic_payload_func,
):
    if path_only == "/api/persona_card":
        send_json_func(load_manual_persona_card_func())
        return True

    route_map = {
        "/api/learning/candidates": (
            get_learning_candidates_for_review_func,
            "GET /api/learning/candidates failed",
        ),
        "/api/learning/samples": (
            get_learning_samples_for_review_func,
            "GET /api/learning/samples failed",
        ),
        "/api/memory/core": (
            get_core_memories_for_review_func,
            "GET /api/memory/core failed",
        ),
        "/api/memory/short": (
            get_short_term_memories_for_review_func,
            "GET /api/memory/short failed",
        ),
        "/api/memory/debug": (
            get_memory_debug_snapshot_func,
            "GET /api/memory/debug failed",
        ),
    }
    route = route_map.get(path_only)
    if route is None:
        return False

    route_func, extra = route
    try:
        send_json_func(route_func(load_config_func()))
    except Exception as exc:
        _send_exception(
            scope="MEMORY",
            extra=extra,
            exc=exc,
            send_json_func=send_json_func,
            log_backend_exception_func=log_backend_exception_func,
            diagnostic_payload_func=diagnostic_payload_func,
        )
    return True


def handle_memory_post_route(
    path_only,
    *,
    read_json_body_func,
    send_json_func,
    load_config_func,
    save_manual_persona_card_func,
    reload_learning_review_data_func,
    promote_learning_review_candidates_func,
    update_learning_review_entries_func,
    undo_last_learning_review_action_func,
    update_core_memory_entries_func,
    update_short_term_memory_entries_func,
    log_backend_exception_func,
    diagnostic_payload_func,
):
    if path_only == "/api/learning/reload":
        _body, ok = read_json_body_func(
            allow_empty=True,
            invalid_payload={"ok": False, "error": "Invalid JSON body."},
        )
        if not ok:
            return True
        try:
            send_json_func(reload_learning_review_data_func(load_config_func()))
        except Exception as exc:
            _send_exception(
                scope="MEMORY",
                extra="POST /api/learning/reload failed",
                exc=exc,
                send_json_func=send_json_func,
                log_backend_exception_func=log_backend_exception_func,
                diagnostic_payload_func=diagnostic_payload_func,
            )
        return True

    invalid_payload = (
        {"error": "Invalid JSON body."}
        if path_only == "/api/persona_card"
        else {"ok": False, "error": "Invalid JSON body."}
    )
    body, ok = read_json_body_func(
        allow_empty=False,
        invalid_payload=invalid_payload,
    )
    if not ok:
        return True
    if not isinstance(body, dict):
        body = {}

    try:
        cfg = load_config_func()
        if path_only == "/api/persona_card":
            send_json_func(save_manual_persona_card_func(body))
            return True
        if path_only == "/api/learning/promote":
            payload = promote_learning_review_candidates_func(cfg, body.get("candidate_ids", []))
            send_json_func(payload, status=_payload_status(payload))
            return True
        if path_only == "/api/learning/update":
            action = str(body.get("action", "")).strip().lower()
            if action == "undo":
                payload = undo_last_learning_review_action_func(cfg)
            else:
                payload = update_learning_review_entries_func(
                    cfg,
                    action=action,
                    pool=body.get("pool", "candidates"),
                    ids=body.get("ids", []),
                    delta=body.get("delta", 0.0),
                    quick_settings=body.get("quick_settings", {}),
                )
            send_json_func(payload, status=_payload_status(payload))
            return True
        if path_only == "/api/memory/core/update":
            payload = update_core_memory_entries_func(
                cfg,
                action=body.get("action", ""),
                ids=body.get("ids", []),
                delta=body.get("delta", 0.0),
                patch=body.get("patch", {}),
            )
            send_json_func(payload, status=_payload_status(payload))
            return True
        if path_only == "/api/memory/short/update":
            payload = update_short_term_memory_entries_func(
                cfg,
                action=body.get("action", ""),
                ids=body.get("ids", []),
                delta=body.get("delta", 0.0),
                patch=body.get("patch", {}),
            )
            send_json_func(payload, status=_payload_status(payload))
            return True
    except Exception as exc:
        if path_only == "/api/persona_card":
            log_backend_exception_func("PERSONA", exc, extra="/api/persona_card failed")
            send_json_func(
                diagnostic_payload_func(exc),
                status=HTTPStatus.INTERNAL_SERVER_ERROR,
            )
            return True
        _send_exception(
            scope="MEMORY",
            extra=f"POST {path_only} failed",
            exc=exc,
            send_json_func=send_json_func,
            log_backend_exception_func=log_backend_exception_func,
            diagnostic_payload_func=diagnostic_payload_func,
        )
        return True

    return False
