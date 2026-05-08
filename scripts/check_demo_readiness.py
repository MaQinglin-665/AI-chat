#!/usr/bin/env python3
"""Read-only public demo readiness advisory.

This script checks the merged local config for demo blockers without changing
files, calling LLM providers, printing secrets, or capturing the desktop.
"""

from __future__ import annotations

import socket
import sys
import urllib.parse
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from config import SERVER_TTS_PROVIDERS, load_config, redact_sensitive_text  # noqa: E402


RISKY_REFERENCE_NAMES = (
    "neuro-sama",
    "neurosama",
    "neuro sama",
)


class Reporter:
    def __init__(self) -> None:
        self.blockers: list[str] = []
        self.warnings: list[str] = []

    def pass_(self, message: str) -> None:
        print(f"[PASS] {message}")

    def info(self, message: str) -> None:
        print(f"[INFO] {message}")

    def warn(self, message: str) -> None:
        self.warnings.append(message)
        print(f"[WARN] {message}")

    def fail(self, message: str) -> None:
        self.blockers.append(message)
        print(f"[FAIL] {message}")

    def finish(self) -> int:
        print("")
        if self.blockers:
            print(
                f"Demo readiness has {len(self.blockers)} blocker(s) "
                f"and {len(self.warnings)} warning(s)."
            )
            print("Fix blockers before recording a public v1.4 demo.")
            return 1
        print(f"Demo readiness passed with {len(self.warnings)} warning(s).")
        if self.warnings:
            print("Review warnings before recording public material.")
        return 0


def _safe_dict(value: Any) -> dict[str, Any]:
    return value if isinstance(value, dict) else {}


def _clean(value: Any) -> str:
    return str(value or "").strip()


def _contains_risky_reference(value: Any) -> bool:
    text = _clean(value).lower()
    return any(item in text for item in RISKY_REFERENCE_NAMES)


def _parse_http_endpoint(raw_url: str, default_port: int) -> tuple[bool, str, int, str]:
    raw = _clean(raw_url)
    if not raw:
        return False, "", 0, "URL is empty"
    try:
        parts = urllib.parse.urlsplit(raw)
        port = int(parts.port or default_port)
    except ValueError as exc:
        return False, "", 0, f"URL port is invalid: {exc}"
    if parts.scheme not in {"http", "https"} or not parts.hostname:
        return False, "", 0, "URL must include http(s) scheme and host"
    if port < 1 or port > 65535:
        return False, "", 0, "URL port is outside 1-65535"
    return True, str(parts.hostname), port, ""


def _tcp_reachable(host: str, port: int, timeout_sec: float = 0.8) -> tuple[bool, str]:
    try:
        with socket.create_connection((host, int(port)), timeout=timeout_sec):
            return True, ""
    except OSError as exc:
        return False, redact_sensitive_text(str(exc))


def check_branding(cfg: dict[str, Any], r: Reporter) -> None:
    print("\n== Branding / Public Positioning ==")
    runtime = _safe_dict(cfg.get("character_runtime"))
    persona = _safe_dict(runtime.get("persona_override"))

    risky_fields = []
    for key, value in (
        ("assistant_name", cfg.get("assistant_name")),
        ("assistant_prompt", cfg.get("assistant_prompt")),
        ("character_runtime.persona_override.name", persona.get("name")),
        ("character_runtime.persona_override.style", persona.get("style")),
    ):
        if _contains_risky_reference(value):
            risky_fields.append(key)

    if risky_fields:
        r.fail(
            "Public demo config directly references Neuro-sama-like naming in: "
            + ", ".join(risky_fields)
            + ". Use an original character name/style for public material."
        )
    else:
        r.pass_("Public demo branding does not directly reuse the reference character name.")


def check_tts(cfg: dict[str, Any], r: Reporter) -> None:
    print("\n== TTS Demo Readiness ==")
    tts = _safe_dict(cfg.get("tts"))
    provider = _clean(tts.get("provider")).lower() or "browser"
    if provider == "browser":
        r.pass_("TTS provider is browser; good for baseline demo fallback.")
        return

    if provider not in SERVER_TTS_PROVIDERS:
        r.warn(f"Unknown TTS provider for readiness checks: {provider}")
        return

    if bool(tts.get("allow_browser_fallback", False)):
        r.warn("Browser TTS fallback is enabled, but the selected server TTS should still be checked before recording.")

    if provider == "gpt_sovits":
        raw_url = _clean(tts.get("gpt_sovits_api_url")) or "http://127.0.0.1:9880/tts"
        ok, host, port, error = _parse_http_endpoint(raw_url, 9880)
        if not ok:
            r.fail(f"GPT-SoVITS endpoint is invalid: {redact_sensitive_text(error)}")
            return
        reachable, reason = _tcp_reachable(host, port)
        if reachable:
            r.pass_("GPT-SoVITS endpoint is reachable.")
        else:
            r.fail(
                "GPT-SoVITS is selected but its endpoint is not reachable. "
                "Start GPT-SoVITS or switch `tts.provider` to `browser` for a baseline demo. "
                f"Detail: {reason}"
            )
        return

    r.info(f"{provider} is configured; run `/doctor` before recording to confirm audio output.")


def check_character_runtime(cfg: dict[str, Any], r: Reporter) -> None:
    print("\n== Character Runtime / Brain ==")
    runtime = _safe_dict(cfg.get("character_runtime"))
    if runtime.get("enabled") is True:
        r.pass_("Character Runtime is enabled for demo behavior.")
    else:
        r.warn("Character Runtime is disabled; v1.4 demo will feel closer to baseline chat.")

    if runtime.get("return_metadata") is True:
        r.pass_("Runtime metadata is returned, so brain/debug/cue checks can be observed.")
    else:
        r.warn("Runtime metadata is not returned; Live2D/TTS cue observability may be limited.")

    if runtime.get("auto_apply_reply_cue") is True:
        r.pass_("Reply cue auto-apply is enabled.")
    else:
        r.warn("Reply cue auto-apply is disabled; action/voice alignment may be harder to judge.")


def check_safety(cfg: dict[str, Any], r: Reporter) -> None:
    print("\n== Safety Defaults For Demo ==")
    observe = _safe_dict(cfg.get("observe"))
    tools = _safe_dict(cfg.get("tools"))
    conversation = _safe_dict(cfg.get("conversation_mode"))
    server = _safe_dict(cfg.get("server"))

    attach_mode = _clean(observe.get("attach_mode")).lower() or "manual"
    if attach_mode == "manual":
        r.pass_("Desktop observation attach_mode is manual.")
    else:
        r.fail(f"Desktop observation attach_mode is `{attach_mode}`; public demo should keep it manual/default-off.")

    if tools.get("enabled") is True:
        r.fail("Tool calling is enabled; public v1.4 demo should not require tools.")
    else:
        r.pass_("Tool calling is disabled.")

    if tools.get("allow_shell") is True:
        r.fail("Shell execution is enabled; public v1.4 demo should keep shell disabled.")
    else:
        r.pass_("Shell execution is disabled.")

    if conversation.get("proactive_enabled") is True or conversation.get("proactive_scheduler_enabled") is True:
        r.warn("Proactive companionship is enabled locally; disclose this is explicit opt-in and keep it low-interruption.")
    else:
        r.pass_("Proactive companionship is not enabled by default in this config.")

    if server.get("require_api_token") is True:
        r.pass_("Detailed local API endpoints require a token.")
    else:
        r.warn("Detailed local API endpoints do not require a token in this config.")


def main() -> int:
    cfg = load_config()
    if not isinstance(cfg, dict):
        print("[FAIL] Config did not load as an object.")
        return 1
    reporter = Reporter()
    check_branding(cfg, reporter)
    check_tts(cfg, reporter)
    check_character_runtime(cfg, reporter)
    check_safety(cfg, reporter)
    return reporter.finish()


if __name__ == "__main__":
    raise SystemExit(main())
