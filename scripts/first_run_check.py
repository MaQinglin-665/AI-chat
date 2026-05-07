#!/usr/bin/env python3
"""First-run preflight checks for local users.

This script is intentionally read-only:
- it does not create or modify config files
- it does not call external provider APIs
- it does not print secrets
"""

from __future__ import annotations

import importlib.util
import os
import shutil
import socket
import subprocess
import sys
import urllib.error
import urllib.request
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from config import (  # noqa: E402
    API_TOKEN_DEFAULT_ENV,
    CONFIG_PATH,
    DEFAULT_CONFIG,
    DiagnosticError,
    EXAMPLE_CONFIG_PATH,
    LOCAL_CONFIG_PATH,
    SERVER_TTS_PROVIDERS,
    load_config,
    redact_sensitive_text,
    resolve_live2d_model_path,
    validate_live2d_model_path,
)


REQUIRED_PATHS = [
    "electron",
    "web",
    "tests",
    "scripts",
    "package.json",
    "requirements.txt",
    "requirements-dev.txt",
    "config.example.json",
]


class Reporter:
    def __init__(self) -> None:
        self.failures: list[str] = []
        self.warnings: list[str] = []

    def pass_(self, message: str) -> None:
        print(f"[PASS] {message}")

    def warn(self, message: str) -> None:
        self.warnings.append(message)
        print(f"[WARN] {message}")

    def fail(self, message: str) -> None:
        self.failures.append(message)
        print(f"[FAIL] {message}")

    def info(self, message: str) -> None:
        print(f"[INFO] {message}")

    def finish(self) -> int:
        print("")
        if self.failures:
            print(
                f"First-run preflight failed: {len(self.failures)} blocker(s), "
                f"{len(self.warnings)} warning(s)."
            )
            print("Fix the [FAIL] items first, then rerun this script.")
            return 1
        print(f"First-run preflight passed with {len(self.warnings)} warning(s).")
        if self.warnings:
            print("You can start the app after reviewing the [WARN] items.")
        else:
            print("You can start the app now.")
        return 0


def _run_version(command: list[str]) -> tuple[int, str]:
    exe = shutil.which(command[0])
    if exe:
        suffix = Path(exe).suffix.lower()
        if suffix == ".ps1":
            command = ["powershell", "-NoProfile", "-ExecutionPolicy", "Bypass", "-File", exe, *command[1:]]
        else:
            command = [exe, *command[1:]]
    try:
        proc = subprocess.run(
            command,
            cwd=str(ROOT),
            capture_output=True,
            text=True,
            encoding="utf-8",
            errors="replace",
            check=False,
            timeout=8,
        )
        out = (proc.stdout or proc.stderr or "").strip().splitlines()
        return int(proc.returncode), (out[0].strip() if out else "")
    except Exception as exc:
        return 1, str(exc)


def _parse_major_minor(version_text: str) -> tuple[int, int] | None:
    import re

    match = re.search(r"(\d+)\.(\d+)", str(version_text or ""))
    if not match:
        return None
    return int(match.group(1)), int(match.group(2))


def _safe_dict(value: Any) -> dict[str, Any]:
    return value if isinstance(value, dict) else {}


def _has_env_or_inline_secret(cfg: dict[str, Any], inline_key: str, env_key: str) -> bool:
    inline = str(cfg.get(inline_key, "") or "").strip()
    env_name = str(cfg.get(env_key, "") or "").strip()
    return bool(inline or (env_name and str(os.environ.get(env_name, "") or "").strip()))


def check_project_files(r: Reporter) -> None:
    print("\n== Project Files ==")
    for rel in REQUIRED_PATHS:
        path = ROOT / rel
        if path.exists():
            r.pass_(f"Found {rel}")
        else:
            r.fail(f"Missing {rel}. Download the current main branch source again.")

    if CONFIG_PATH.exists():
        r.pass_("Found config.json")
    else:
        r.warn("config.json not found. Copy config.example.json to config.json before first launch.")

    if LOCAL_CONFIG_PATH.exists():
        r.pass_("Found config.local.json for local overrides")
    else:
        r.info("config.local.json not found. This is OK; use it for private local overrides if needed.")

    gitignore = ROOT / ".gitignore"
    if gitignore.exists() and "config.local.json" in gitignore.read_text(encoding="utf-8", errors="replace"):
        r.pass_("config.local.json is ignored by git")
    else:
        r.warn("Could not confirm config.local.json is ignored by git.")


def check_tools(r: Reporter) -> None:
    print("\n== Tools ==")
    current = sys.version_info
    if current >= (3, 10):
        r.pass_(f"Python runtime OK: {sys.version.split()[0]}")
    else:
        r.fail(f"Python 3.10+ is required. Detected: {sys.version.split()[0]}")

    code, node_version = _run_version(["node", "--version"])
    if code == 0:
        parsed = _parse_major_minor(node_version)
        if parsed and parsed[0] >= 18:
            r.pass_(f"Node.js detected: {node_version}")
            if parsed[0] >= 24:
                r.warn("Node.js 20 or 22 LTS is recommended for Electron projects.")
        else:
            r.fail(f"Node.js 18+ is required. Detected: {node_version or 'unknown'}")
    else:
        r.fail("Node.js command not found. Install Node.js 18+.")

    code, npm_version = _run_version(["npm", "--version"])
    if code == 0:
        r.pass_(f"npm detected: {npm_version}")
    else:
        r.warn("npm command not found. npm install cannot run without it.")

    if importlib.util.find_spec("pytest"):
        r.pass_("pytest is installed")
    else:
        r.warn("pytest is not installed. Run: python -m pip install -r requirements-dev.txt")

    if (ROOT / "node_modules").exists():
        r.pass_("node_modules exists")
    else:
        r.warn("node_modules not found. Run: npm install")


def load_runtime_config(r: Reporter) -> dict[str, Any] | None:
    print("\n== Config Load ==")
    if not EXAMPLE_CONFIG_PATH.exists():
        r.fail("config.example.json is missing; cannot load defaults.")
        return None
    try:
        cfg = load_config()
        r.pass_("Merged config loaded")
        return cfg if isinstance(cfg, dict) else {}
    except DiagnosticError as exc:
        payload = exc.to_payload()
        r.fail(f"{payload.get('reason', 'Config error')} {payload.get('solution', '')}".strip())
    except Exception as exc:
        r.fail(redact_sensitive_text(f"Config load failed: {exc}"))
    return None


def check_live2d(r: Reporter, cfg: dict[str, Any]) -> None:
    print("\n== Live2D ==")
    raw_model_path = str(cfg.get("model_path", "") or "").strip()
    if not raw_model_path:
        r.fail("model_path is empty. Set it to a .model3.json file under web/models.")
        return
    resolved = resolve_live2d_model_path(raw_model_path)
    try:
        validate_live2d_model_path(cfg)
        display = str(resolved.relative_to(ROOT)) if resolved and resolved.exists() else raw_model_path
        r.pass_(f"Live2D model path OK: {display}")
    except DiagnosticError as exc:
        payload = exc.to_payload()
        r.fail(f"{payload.get('reason', '')} {payload.get('solution', '')}".strip())


def check_server(r: Reporter, cfg: dict[str, Any]) -> None:
    print("\n== Local Server ==")
    server_cfg = _safe_dict(cfg.get("server"))
    host = str(server_cfg.get("host", DEFAULT_CONFIG["server"]["host"]) or "127.0.0.1").strip()
    try:
        port = int(server_cfg.get("port", DEFAULT_CONFIG["server"]["port"]))
    except (TypeError, ValueError):
        r.fail("server.port is not a valid integer.")
        return
    if port < 0 or port > 65535:
        r.fail(f"server.port is outside valid range: {port}")
        return
    r.pass_(f"Server target: {host}:{port}")
    if port != 0:
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
            sock.settimeout(0.5)
            try:
                sock.bind((host, port))
                r.pass_("Configured server port is available")
            except OSError:
                health_url = f"http://{host}:{port}/healthz"
                try:
                    with urllib.request.urlopen(health_url, timeout=1.5) as resp:
                        if int(resp.status) == 200:
                            r.warn(
                                f"Configured server port is already in use, but {health_url} is healthy. "
                                "An existing backend/app may already be running."
                            )
                        else:
                            r.fail(
                                f"Configured server port is already in use and health check returned HTTP {resp.status}: "
                                f"{host}:{port}"
                            )
                except (urllib.error.URLError, TimeoutError, OSError) as exc:
                    r.fail(
                        f"Configured server port is already in use and health check failed: "
                        f"{host}:{port} ({redact_sensitive_text(str(exc))})"
                    )

    require_token = bool(server_cfg.get("require_api_token", False))
    token_env = str(server_cfg.get("api_token_env", API_TOKEN_DEFAULT_ENV) or API_TOKEN_DEFAULT_ENV).strip()
    token_configured = bool(
        str(server_cfg.get("api_token", "") or "").strip()
        or (token_env and str(os.environ.get(token_env, "") or "").strip())
    )
    if require_token and not token_configured:
        r.fail(f"server.require_api_token=true but token is missing. Set env {token_env}.")
    elif require_token:
        r.pass_("API token is required and configured")
    else:
        r.warn("API token is not required. Keep this local-only unless you know why.")


def check_llm(r: Reporter, cfg: dict[str, Any]) -> None:
    print("\n== LLM ==")
    llm_cfg = _safe_dict(cfg.get("llm"))
    provider = str(llm_cfg.get("provider", "") or "").strip().lower()
    model = str(llm_cfg.get("model", "") or "").strip()
    base_url = str(llm_cfg.get("base_url", "") or "").strip()
    if not provider:
        r.fail("llm.provider is empty.")
        return
    r.pass_(f"LLM provider configured: {provider}")
    if model:
        r.pass_(f"LLM model configured: {model}")
    else:
        r.fail("llm.model is empty.")
    if base_url:
        r.pass_("LLM base_url configured")
    elif provider not in {"ollama"}:
        r.warn("llm.base_url is empty; provider defaults may be used.")

    if provider in {"openai", "openai-compatible", "openai_compatible"}:
        env_name = str(llm_cfg.get("api_key_env", "OPENAI_API_KEY") or "OPENAI_API_KEY").strip()
        if _has_env_or_inline_secret(llm_cfg, "api_key", "api_key_env"):
            source = "inline config" if str(llm_cfg.get("api_key", "") or "").strip() else f"env {env_name}"
            r.pass_(f"LLM API key is configured via {source}")
        else:
            r.fail(f"LLM API key is missing. Set env {env_name} or configure a local-only key.")
    elif provider == "ollama":
        r.warn("Ollama provider selected. Make sure Ollama is running locally before chat.")
    else:
        r.warn(f"Unknown/custom LLM provider '{provider}'. First chat may need manual verification.")


def check_tts(r: Reporter, cfg: dict[str, Any]) -> None:
    print("\n== TTS ==")
    tts_cfg = _safe_dict(cfg.get("tts"))
    provider = str(tts_cfg.get("provider", "browser") or "browser").strip().lower()
    if provider == "browser":
        r.pass_("TTS provider is browser; good first-run default")
        return
    if provider in SERVER_TTS_PROVIDERS:
        r.warn(f"TTS provider is {provider}; make sure the local/server TTS service is running.")
        if provider == "gpt_sovits":
            url = str(tts_cfg.get("gpt_sovits_api_url", "") or "").strip()
            if url:
                r.pass_("GPT-SoVITS API URL is configured")
            else:
                r.fail("GPT-SoVITS provider selected but gpt_sovits_api_url is empty.")
            if not bool(tts_cfg.get("allow_browser_fallback", False)):
                r.warn("Browser fallback is disabled for server TTS.")
        return
    r.warn(f"Unknown/custom TTS provider '{provider}'. Voice may need manual verification.")


def check_safety_defaults(r: Reporter, cfg: dict[str, Any]) -> None:
    print("\n== Safety Defaults ==")
    runtime_cfg = _safe_dict(cfg.get("character_runtime"))
    observe_cfg = _safe_dict(cfg.get("observe"))
    tools_cfg = _safe_dict(cfg.get("tools"))

    if bool(runtime_cfg.get("enabled", False)):
        r.warn("character_runtime.enabled=true. This is fine for demos, but default first-run should be off.")
    else:
        r.pass_("Character Runtime is disabled by default path")

    if bool(runtime_cfg.get("return_metadata", False)):
        r.warn("character_runtime.return_metadata=true. Keep this opt-in for demos/debugging.")
    else:
        r.pass_("Character Runtime metadata is opt-in/off")

    if bool(runtime_cfg.get("auto_apply_reply_cue", False)):
        r.warn("character_runtime.auto_apply_reply_cue=true. Keep automatic reply cue application local and opt-in.")
    else:
        r.pass_("Character Runtime reply cue auto-apply is opt-in/off")

    attach_mode = str(observe_cfg.get("attach_mode", "manual") or "manual").strip().lower()
    if attach_mode == "always":
        r.warn("observe.attach_mode=always. Desktop screenshots may attach automatically.")
    else:
        r.pass_("Desktop observation attach mode is not automatic")

    if bool(observe_cfg.get("auto_chat_enabled", False)) or bool(observe_cfg.get("allow_auto_chat", False)):
        r.warn("Auto chat is enabled/allowed. Keep it off for first-run baseline.")
    else:
        r.pass_("Auto chat is disabled")

    if bool(tools_cfg.get("allow_shell", False)):
        r.fail("tools.allow_shell=true. Disable shell access for first-run/public safety.")
    elif bool(tools_cfg.get("enabled", False)):
        r.warn("tools.enabled=true. Tool calling should remain opt-in and carefully reviewed.")
    else:
        r.pass_("Tool calling is disabled")


def main() -> int:
    print("Taffy AI Desktop Pet first-run preflight")
    print(f"Root: {ROOT}")
    reporter = Reporter()
    check_project_files(reporter)
    check_tools(reporter)
    cfg = load_runtime_config(reporter)
    if cfg is not None:
        check_live2d(reporter, cfg)
        check_server(reporter, cfg)
        check_llm(reporter, cfg)
        check_tts(reporter, cfg)
        check_safety_defaults(reporter, cfg)
    return reporter.finish()


if __name__ == "__main__":
    sys.exit(main())
