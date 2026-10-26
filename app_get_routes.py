"""GET dispatch separated from server transport; context is supplied per request."""
def dispatch_get(self, context):
    CONFIG_GET_ROUTES = context["CONFIG_GET_ROUTES"]
    HTTPStatus = context["HTTPStatus"]
    _BEHAVIOR_DECISION_CURSOR = context["_BEHAVIOR_DECISION_CURSOR"]
    _COMPANION_EVENT_BUS = context["_COMPANION_EVENT_BUS"]
    _diagnostic_payload = context["_diagnostic_payload"]
    _get_qq_bridge_runtime = context["_get_qq_bridge_runtime"]
    _log_backend_exception = context["_log_backend_exception"]
    agent_actions = context["agent_actions"]
    build_qq_identity_public_payload = context["build_qq_identity_public_payload"]
    companion_decision = context["companion_decision"]
    decide_behavior = context["decide_behavior"]
    get_core_memories_for_review = context["get_core_memories_for_review"]
    get_knowledge_status = context["get_knowledge_status"]
    get_learning_candidates_for_review = context["get_learning_candidates_for_review"]
    get_learning_samples_for_review = context["get_learning_samples_for_review"]
    get_local_asr_warmup_status = context["get_local_asr_warmup_status"]
    get_memory_debug_snapshot = context["get_memory_debug_snapshot"]
    get_proactive_material = context["get_proactive_material"]
    get_relationship_state_for_client = context["get_relationship_state_for_client"]
    get_short_term_memories_for_review = context["get_short_term_memories_for_review"]
    growth_history = context["growth_history"]
    life_status = context["life_status"]
    load_config = context["load_config"]
    load_manual_persona_card = context["load_manual_persona_card"]
    path_only = self.path.split("?", 1)[0]
    if path_only == "/healthz":
        self._send_json(self._build_health_payload(detailed=False))
        return
    if self._reject_disallowed_origin(path_only):
        return
    if self._reject_invalid_api_token(path_only):
        return
    if path_only in {"/api/avatar", "/api/avatar/model.vrm"} or path_only.startswith("/api/avatar/live2d/"):
        import avatar_assets
        avatar_assets.dispatch(self, load_config(), context["ROOT_DIR"], path_only)
        return
    if context["app_external_agent"].handles(path_only):
        context["app_external_agent"].dispatch(self, "GET", path_only,
            context["external_agent"].get_manager(config_loader=lambda: load_config(), bus=_COMPANION_EVENT_BUS))
        return
    if path_only in CONFIG_GET_ROUTES:
        self._handle_config_get_route(path_only)
        return
    if path_only == "/api/health":
        self._send_json(self._build_health_payload(detailed=True))
        return
    if path_only == "/api/agent/actions":
        self._send_json(agent_actions.public_state())
        return
    if path_only == "/api/qq/identity":
        try:
            payload = build_qq_identity_public_payload(load_config())
            payload["runtime"] = _get_qq_bridge_runtime().status()
            self._send_json(payload)
        except Exception as exc:
            _log_backend_exception("QQ", exc, extra="GET /api/qq/identity failed")
            self._send_json({"ok": False, **_diagnostic_payload(exc)}, status=HTTPStatus.INTERNAL_SERVER_ERROR)
        return
    if path_only == "/api/qq/identity/history":
        try:
            runtime = _get_qq_bridge_runtime()
            self._send_json({"ok": True, "items": runtime.store.audit()})
        except Exception as exc:
            _log_backend_exception("QQ", exc, extra="GET /api/qq/identity/history failed")
            self._send_json({"ok": False, **_diagnostic_payload(exc)}, status=HTTPStatus.INTERNAL_SERVER_ERROR)
        return
    if path_only == "/api/asr/status":
        self._send_json(get_local_asr_warmup_status())
        return
    if path_only == "/api/character_runtime/backend_entry":
        try:
            self._send_json(self._build_character_runtime_backend_entry_payload())
        except Exception as exc:
            _log_backend_exception("CONFIG", exc, extra="GET /api/character_runtime/backend_entry failed")
            self._send_json(
                _diagnostic_payload(exc),
                status=HTTPStatus.INTERNAL_SERVER_ERROR,
            )
        return
    if path_only == "/api/runtime/restart":
        self._send_json(
            {"ok": False, "error": "Method not allowed. Please use POST."},
            status=HTTPStatus.METHOD_NOT_ALLOWED,
        )
        return
    if path_only == "/api/persona_card":
        self._send_json(load_manual_persona_card())
        return
    if path_only == "/api/relationship_state":
        try:
            cfg = load_config()
            self._send_json(get_relationship_state_for_client(cfg))
        except Exception as exc:
            _log_backend_exception("RELATIONSHIP", exc, extra="GET /api/relationship_state failed")
            self._send_json(
                {"ok": False, **_diagnostic_payload(exc)},
                status=HTTPStatus.INTERNAL_SERVER_ERROR,
            )
        return
    if path_only == "/api/learning/candidates":
        try:
            cfg = load_config()
            self._send_json(get_learning_candidates_for_review(cfg))
        except Exception as exc:
            _log_backend_exception("MEMORY", exc, extra="GET /api/learning/candidates failed")
            self._send_json(
                {"ok": False, **_diagnostic_payload(exc)},
                status=HTTPStatus.INTERNAL_SERVER_ERROR,
            )
        return
    if path_only == "/api/learning/samples":
        try:
            cfg = load_config()
            self._send_json(get_learning_samples_for_review(cfg))
        except Exception as exc:
            _log_backend_exception("MEMORY", exc, extra="GET /api/learning/samples failed")
            self._send_json(
                {"ok": False, **_diagnostic_payload(exc)},
                status=HTTPStatus.INTERNAL_SERVER_ERROR,
            )
        return
    if path_only == "/api/memory/core":
        try:
            cfg = load_config()
            self._send_json(get_core_memories_for_review(cfg))
        except Exception as exc:
            _log_backend_exception("MEMORY", exc, extra="GET /api/memory/core failed")
            self._send_json(
                {"ok": False, **_diagnostic_payload(exc)},
                status=HTTPStatus.INTERNAL_SERVER_ERROR,
            )
        return
    if path_only == "/api/memory/short":
        try:
            cfg = load_config()
            self._send_json(get_short_term_memories_for_review(cfg))
        except Exception as exc:
            _log_backend_exception("MEMORY", exc, extra="GET /api/memory/short failed")
            self._send_json(
                {"ok": False, **_diagnostic_payload(exc)},
                status=HTTPStatus.INTERNAL_SERVER_ERROR,
            )
        return
    if path_only == "/api/memory/debug":
        try:
            cfg = load_config()
            self._send_json(get_memory_debug_snapshot(cfg))
        except Exception as exc:
            _log_backend_exception("MEMORY", exc, extra="GET /api/memory/debug failed")
            self._send_json(
                {"ok": False, **_diagnostic_payload(exc)},
                status=HTTPStatus.INTERNAL_SERVER_ERROR,
            )
        return
    if path_only == "/api/knowledge/status":
        try:
            self._send_json(get_knowledge_status(load_config()))
        except Exception as exc:
            _log_backend_exception("KNOWLEDGE", exc, extra="GET /api/knowledge/status failed")
            self._send_json({"ok": False, **_diagnostic_payload(exc)}, status=HTTPStatus.INTERNAL_SERVER_ERROR)
        return
    if path_only == "/api/life/proactive":
        try:
            cfg = load_config()
            payload = get_proactive_material(cfg)
            director = decide_behavior(cfg, _COMPANION_EVENT_BUS.snapshot(), life_material=payload)
            director = _BEHAVIOR_DECISION_CURSOR.consume(director)
            payload["behavior_director"] = director
            # Disabled keeps every legacy proactive decision unchanged. When
            # explicitly enabled, the director can only suppress an existing
            # automatic attempt; it never manufactures a reason to speak.
            if director.get("reason") != "disabled" and director.get("action") != "prepare_proactive":
                payload["has_material"] = False
                payload.setdefault("reasons", []).append(f"behavior_director:{director.get('reason', 'hold')}")
            self._send_json(payload)
        except Exception as exc:
            _log_backend_exception("LIFE", exc, extra="GET /api/life/proactive failed")
            self._send_json({"ok": False, **_diagnostic_payload(exc)}, status=HTTPStatus.INTERNAL_SERVER_ERROR)
        return
    if path_only == "/api/life/history":
        self._send_json({"ok": True, "items": growth_history(load_config())}); return
    if path_only == "/api/life/status":
        payload = life_status(load_config()); payload["decision"] = companion_decision(load_config()); self._send_json(payload); return
    if path_only == "/api/behavior/status":
        cfg = load_config()
        snapshot = _COMPANION_EVENT_BUS.snapshot()
        self._send_json({
            "ok": True,
            "event_snapshot": snapshot,
            "director": decide_behavior(cfg, snapshot, life_material=get_proactive_material(cfg)),
        })
        return
    return context["SimpleHTTPRequestHandler"].do_GET(self)
