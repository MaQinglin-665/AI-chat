"""Bounded Codex subprocess adapter; raw output never enters the audit/event bus."""
from __future__ import annotations

import json
import os
from pathlib import Path
import queue
import re
import shutil
import signal
import subprocess
import sys
import threading
import time
import uuid

from .policy import AgentError, MIN_VERSION, allowed_roots, key_from_config, settings, validate_home
from .process_guard import ProcessGuard

PLAN_SCHEMA = {
    "type": "object", "additionalProperties": False,
    "properties": {
        "summary": {"type": "string"},
        **{k: {"type": "array", "items": {"type": "string"}} for k in
           ("steps", "files_to_create", "files_to_modify", "files_to_delete", "commands")},
        "risk": {"type": "string", "enum": ["low", "medium", "high"]},
        "needs_network": {"type": "boolean"},
    },
    "required": ["summary", "steps", "files_to_create", "files_to_modify", "files_to_delete", "commands", "risk", "needs_network"],
}
PROGRESS_TYPES = {"command_execution", "file_change", "agent_message"}
MAX_LINE = 256 * 1024


def cli_command(value=""):
    found = value or shutil.which("codex")
    if not found:
        raise AgentError("cli_missing", "未找到 Codex CLI。请安装 0.164.0 或更新版本，并配置 external_agent.codex_path。")
    path = Path(found).resolve()
    if not path.is_file():
        raise AgentError("cli_missing", "codex_path 不存在，请配置 Codex CLI 的完整路径。")
    if path.suffix.lower() in {".cmd", ".bat", ".ps1"}:
        # Never interpolate user arguments into cmd.exe. Resolve npm's JS launcher.
        candidates = [path.parent / "node_modules/@openai/codex/bin/codex.js",
                      path.parent.parent / "@openai/codex/bin/codex.js"]
        path = next((p for p in candidates if p.is_file()), None)
        if path is None:
            raise AgentError("cli_path", "请配置官方 npm Codex 启动文件或 codex.exe，不支持任意批处理包装器。")
    if path.suffix == ".js":
        node = shutil.which("node")
        if not node:
            raise AgentError("node_missing", "启动此 Codex CLI 需要 Node.js。")
        return [node, str(path)]
    if path.suffix == ".py":
        return [sys.executable, str(path)]
    return [str(path)]


def version_check(command):
    try:
        result = subprocess.run([*command, "--version"], capture_output=True, timeout=8,
                                creationflags=subprocess.CREATE_NO_WINDOW if os.name == "nt" else 0)
    except (OSError, subprocess.TimeoutExpired):
        raise AgentError("cli_version", "无法读取 Codex CLI 版本，请检查安装路径。") from None
    match = re.search(rb"codex-cli\s+(\d+)\.(\d+)\.(\d+)", result.stdout)
    if result.returncode or not match:
        raise AgentError("cli_version", "Codex CLI 未返回有效版本号。")
    version = tuple(int(v) for v in match.groups())
    if version < MIN_VERSION:
        error = AgentError("cli_too_old", "Codex CLI " + ".".join(map(str, version)) + " 版本过低；请安装至少 0.164.0，并将 codex_path 指向新版独立安装。")
        error.version = ".".join(map(str, version))
        raise error
    return ".".join(map(str, version))


def health(config):
    raw = config.get("external_agent", {})
    enabled = isinstance(raw, dict) and raw.get("enabled") is True
    result = dict(ok=True, enabled=enabled, severity="ok", installed=False, version="",
                  minimum_version="0.164.0", configuration_complete=False, messages=[], actions=[])
    try:
        cfg = settings(config)
        command = cli_command(cfg["codex_path"])
        result["installed"] = True
        result["version"] = version_check(command)
        roots = allowed_roots(cfg)
        validate_home(cfg, roots)
        if not key_from_config(config):
            raise AgentError("key_missing", "请在 .env 中配置 external_agent.api_key_env 指定的 DeepSeek Key。")
        result["configuration_complete"] = True
    except AgentError as exc:
        result.update(ok=not enabled, severity="error" if enabled else "warning", messages=[str(exc)])
        result["version"] = getattr(exc, "version", result["version"])
    except Exception:
        result.update(ok=not enabled, severity="error" if enabled else "warning", messages=["外部执行配置无效，请检查 external_agent。"])
    return result


def parse_event(line):
    """Return metadata only; text/commands/provider errors are never forwarded."""
    try:
        value = json.loads(line)
        if not isinstance(value, dict):
            raise ValueError()
    except (ValueError, TypeError):
        return {"kind": "warning", "code": "malformed_jsonl"}
    kind = value.get("type")
    if kind in {"error", "turn.failed"}:
        raw = json.dumps(value).lower()
        auth = any(s in raw for s in ("401", "unauthorized", "authentication", "invalid api key", "invalid_api_key"))
        return {"kind": "failure", "code": "authentication_failed" if auth else "provider_failed"}
    if kind == "turn.completed":
        return {"kind": "completed"}
    if kind in {"item.started", "item.updated", "item.completed"}:
        item = value.get("item")
        if isinstance(item, dict):
            if item.get("type") == "error":
                return {"kind": "warning", "code": "item_warning"}
            if item.get("type") in PROGRESS_TYPES:
                return {"kind": "progress", "event_type": item["type"]}
    return {"kind": "ignored"}


def stop_tree(proc):
    if proc.poll() is not None:
        return
    if os.name == "nt":
        result = subprocess.run(["taskkill", "/PID", str(proc.pid), "/T", "/F"],
                                capture_output=True, timeout=15, creationflags=subprocess.CREATE_NO_WINDOW)
        if result.returncode and proc.poll() is None:
            raise AgentError("cancel_failed", "进程树未能完全结束，请检查本机进程后再运行任务。")
    else:
        try:
            os.killpg(proc.pid, signal.SIGKILL)
        except ProcessLookupError:
            pass
    try:
        proc.wait(timeout=10)
    except subprocess.TimeoutExpired:
        raise AgentError("cancel_failed", "等待执行进程退出超时。") from None


class CodexCLI:
    def __init__(self, config):
        self.cfg = settings(config)
        self.key = key_from_config(config)
        self.command = cli_command(self.cfg["codex_path"])

    def run(self, *, goal, workdir, cancel, emit, plan=None):
        if os.name != "nt":
            raise AgentError("platform_unverified", "此实验版本仅启用已验证的 Windows 沙箱。")
        version_check(self.command)
        if not self.key:
            raise AgentError("key_missing", "缺少 DeepSeek Key，请检查 .env 与 external_agent.api_key_env。")
        home = validate_home(self.cfg, allowed_roots(self.cfg))
        home.mkdir(parents=True, exist_ok=True)
        run_home = home / ("run-" + uuid.uuid4().hex)
        run_home.mkdir()
        proc = None
        try:
            return self._run(run_home, goal, workdir, cancel, emit, plan)
        finally:
            # Only our UUID directory, never the configured home or user's files.
            if run_home.resolve().parent == home.resolve():
                shutil.rmtree(run_home, ignore_errors=True)

    def _run(self, home, goal, workdir, cancel, emit, plan):
        catalog = Path(__file__).with_name("deepseek-models.json")
        shutil.copyfile(catalog, home / "models.json")
        config = (
            'model = "deepseek-flash"\nmodel_provider = "deepseek"\nforced_login_method = "api"\n'
            'model_reasoning_effort = "high"\nweb_search = "disabled"\napproval_policy = "never"\n'
            f'model_catalog_json = {json.dumps((home / "models.json").as_posix())}\n'
            '[windows]\nsandbox = "unelevated"\n'
            '[shell_environment_policy]\ninherit = "core"\n'
            'exclude = ["*KEY*", "*TOKEN*", "*SECRET*", "*PASSWORD*"]\n'
            '[model_providers.deepseek]\nname = "deepseek"\nbase_url = "https://api.deepseek.com/"\n'
            'wire_api = "responses"\nenv_key = "XINYU_DEEPSEEK_API_KEY"\n'
            'request_max_retries = 0\nstream_max_retries = 0\nstream_idle_timeout_ms = 30000\n'
        )
        (home / "config.toml").write_text(config, encoding="utf-8")
        (home / "plan-schema.json").write_text(json.dumps(PLAN_SCHEMA), encoding="utf-8")
        output = home / "last.json"
        args = [*self.command, "exec", "--json", "--sandbox", "read-only" if plan is None else "workspace-write",
                "--ephemeral", "--skip-git-repo-check", "-C", str(workdir), "-o", str(output)]
        args += ["-c", "approval_policy=never", "-c", "windows.sandbox=unelevated",
                 "-c", "sandbox_workspace_write.network_access=false",
                 "-c", "sandbox_workspace_write.writable_roots=[]",
                 "-c", "sandbox_workspace_write.exclude_tmpdir_env_var=true",
                 "-c", "sandbox_workspace_write.exclude_slash_tmp=true"]
        if plan is None:
            args += ["--output-schema", str(home / "plan-schema.json")]
            prompt = "只制定计划，不修改文件。只检查当前工作目录内的文件，不读取环境变量、凭据或外部目录。文件清单每项必须是单个准确的相对路径，禁止箭头、通配符或说明文字。移动/重命名必须把旧路径列入 files_to_delete（仅表示该路径消失），把新路径及新建目录分别列入 files_to_create，原地修改才列入 files_to_modify。summary 与 steps 说明移动保留内容。不要执行计划中的命令。输出符合 schema 的计划。用户目标：\n" + goal
        else:
            prompt = "执行以下用户已批准的计划。只做计划里列出的事，遇到计划外操作就停下并说明。只访问当前工作目录内的数据，不读取凭据或环境变量。不得自行提升权限。批准计划原文：\n" + json.dumps(plan, ensure_ascii=False)
        args += ["-"]
        env = {k: v for k, v in os.environ.items() if not re.search(r"(?i)(KEY|TOKEN|SECRET|PASSWORD|^CODEX_)", k)}
        env.update(CODEX_HOME=str(home), XINYU_DEEPSEEK_API_KEY=self.key)
        proc = subprocess.Popen(args, cwd=workdir, env=env, stdin=subprocess.PIPE, stdout=subprocess.PIPE,
                                stderr=subprocess.PIPE, creationflags=subprocess.CREATE_NO_WINDOW if os.name == "nt" else 0,
                                start_new_session=os.name != "nt")
        try:
            guard = ProcessGuard(proc)
        except Exception:
            stop_tree(proc)
            for stream in (proc.stdin, proc.stdout, proc.stderr):
                stream.close()
            raise
        messages = queue.Queue(maxsize=256)
        stop = threading.Event()
        def read_stdout():
            try:
                while not stop.is_set():
                    line = proc.stdout.readline(MAX_LINE + 1)
                    if not line:
                        break
                    item = parse_event(line) if len(line) <= MAX_LINE else {"kind": "warning", "code": "line_too_long"}
                    while not stop.is_set():
                        try:
                            messages.put(item, timeout=.1)
                            break
                        except queue.Full:
                            pass
            finally:
                while not stop.is_set():
                    try:
                        messages.put(None, timeout=.1)
                        break
                    except queue.Full:
                        pass
        def drain_stderr():
            while proc.stderr.read(4096):
                pass  # Raw provider diagnostics are intentionally not logged.
        readers = [threading.Thread(target=read_stdout, daemon=True), threading.Thread(target=drain_stderr, daemon=True)]
        for thread in readers:
            thread.start()
        deadline = time.monotonic() + self.cfg["max_minutes"] * 60
        completed = False
        failure = None
        try:
            proc.stdin.write(prompt.encode("utf-8"))
            proc.stdin.close()
            while True:
                if cancel.is_set():
                    raise AgentError("cancelled", "任务已取消。")
                if time.monotonic() >= deadline:
                    raise AgentError("timeout", "任务超过配置的执行时限，已停止。")
                try:
                    event = messages.get(timeout=.05)
                except queue.Empty:
                    continue
                if event is None:
                    break
                if event["kind"] == "failure":
                    failure = event["code"]
                    break
                if event["kind"] == "completed":
                    completed = True
                if event["kind"] in {"warning", "progress"}:
                    emit(event)
            if failure:
                message = "DeepSeek 身份验证失败，请检查 Key 是否有效。" if failure == "authentication_failed" else "Codex 服务返回任务失败，请检查模型服务后重试。"
                raise AgentError(failure, message)
            remaining = max(.1, deadline - time.monotonic())
            try:
                code = proc.wait(timeout=min(remaining, 5))
            except subprocess.TimeoutExpired:
                raise AgentError("process_exit", "Codex 未正常退出，已停止进程树。") from None
            if cancel.is_set():
                raise AgentError("cancelled", "任务已取消。")
            if code or not completed:
                raise AgentError("incomplete_output", "Codex 异常退出或缺少完成事件，请检查 CLI 和服务配置。")
            if plan is None:
                if not output.exists() or output.stat().st_size > MAX_LINE:
                    raise AgentError("invalid_plan", "规划没有返回有效的结构化结果。")
                try:
                    return json.loads(output.read_text(encoding="utf-8"))
                except (ValueError, OSError):
                    raise AgentError("invalid_plan", "规划结果不是有效 JSON。") from None
            return None
        finally:
            stop.set()
            try:
                stop_tree(proc)
            finally:
                guard.close()
                for thread in readers:
                    thread.join(timeout=3)
                for stream in (proc.stdout, proc.stderr):
                    stream.close()
