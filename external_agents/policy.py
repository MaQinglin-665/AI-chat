"""Configuration and path policy shared by health checks and execution."""
import os
from pathlib import Path
import re
import tempfile
from urllib.parse import urlsplit

PROJECT = Path(__file__).resolve().parents[1]
MIN_VERSION = (0, 164, 0)


class AgentError(ValueError):
    def __init__(self, code, message, status=400):
        super().__init__(message)
        self.code, self.status = code, status


def default_home():
    base = Path(os.environ.get("LOCALAPPDATA") or Path.home() / "AppData" / "Local")
    return str(base / "XinyuDesktopPet" / "external-agent" / "codex")


def defaults():
    return dict(enabled=False, provider="codex_cli", codex_path="", codex_home=default_home(),
                api_key_env="DEEPSEEK_API_KEY", model="deepseek-flash", allowed_roots=[], max_minutes=15, plan_ttl_minutes=15)


def inside(path, root):
    return path == root or root in path.parents


def resolve_path(value, *, exists=False):
    if not isinstance(value, str) or not value.strip() or "\x00" in value:
        raise AgentError("invalid_path", "请填写有效的绝对路径。")
    path = Path(os.path.expandvars(value)).expanduser()
    if not path.is_absolute() or ".." in path.parts or (os.name == "nt" and (str(path).startswith("\\\\") or ":" in str(path)[2:])):
        raise AgentError("invalid_path", "只接受本机绝对路径，不接受路径穿越、网络路径或备用数据流。")
    try:
        path = path.resolve(strict=exists)
    except (OSError, RuntimeError):
        raise AgentError("invalid_path", "路径不存在或无法解析符号链接。") from None
    return path


def protected(path):
    if path == Path(path.anchor) or inside(PROJECT, path) or inside(path, PROJECT):
        return True
    user = Path.home().resolve()
    if inside(user, path):
        return True
    for value in (os.environ.get("SystemRoot"), os.environ.get("ProgramFiles"), os.environ.get("ProgramFiles(x86)"), os.environ.get("ProgramData")):
        if value and (inside(path, Path(value).resolve()) or inside(Path(value).resolve(), path)):
            return True
    return False


def settings(config):
    raw = config.get("external_agent", {})
    if not isinstance(raw, dict):
        raise AgentError("invalid_config", "external_agent 配置必须是对象。")
    result = defaults()
    result.update(raw)
    if result["provider"] != "codex_cli" or result["model"] != "deepseek-flash":
        raise AgentError("unsupported_provider", "本版本只支持 codex_cli 与 deepseek-flash。")
    for key in ("max_minutes", "plan_ttl_minutes"):
        value = result[key]
        if isinstance(value, bool) or not isinstance(value, (float, int)) or not 0 < value <= 120:
            raise AgentError("invalid_config", f"{key} 必须在 0 到 120 分钟之间。")
    return result


def allowed_roots(cfg):
    raw = cfg.get("allowed_roots")
    if not isinstance(raw, list) or not raw:
        raise AgentError("roots_required", "请先显式配置 external_agent.allowed_roots。")
    roots = []
    for value in raw:
        p = resolve_path(value, exists=True)
        if not p.is_dir() or protected(p):
            raise AgentError("protected_path", "不能授权磁盘根目录、用户主目录、系统目录、本项目或其上级目录。")
        roots.append(p)
    return roots


def validate_home(cfg, roots=()):
    home = resolve_path(cfg.get("codex_home") or default_home())
    original = Path(os.environ.get("CODEX_HOME") or Path.home() / ".codex").resolve()
    forbidden = [PROJECT, Path(tempfile.gettempdir()).resolve(), Path.home() / ".codex", original]
    if home == Path(home.anchor) or home == Path.home().resolve() or any(inside(home, p) or inside(p, home) for p in forbidden) or any(inside(home, p) or inside(p, home) for p in roots):
        raise AgentError("unsafe_codex_home", "codex_home 必须独立于系统临时目录、仓库、工作目录和用户现有 Codex 配置。")
    return home


def validate_workdir(value, cfg):
    roots = allowed_roots(cfg)
    path = resolve_path(value, exists=True)
    if not path.is_dir() or protected(path) or not any(inside(path, p) for p in roots):
        raise AgentError("workdir_denied", "工作目录不在已授权范围内，或属于受保护路径。")
    validate_home(cfg, roots)
    return path


def key_from_config(config):
    external = config.get("external_agent", {})
    external = external if isinstance(external, dict) else {}
    key = os.environ.get(str(external.get("api_key_env") or "DEEPSEEK_API_KEY"), "").strip()
    if key:
        return key
    llm = config.get("llm", {})
    if not isinstance(llm, dict):
        return ""
    try:
        if urlsplit(str(llm.get("base_url") or "")).hostname != "api.deepseek.com":
            return ""
    except ValueError:
        return ""
    return str(llm.get("api_key") or os.environ.get(str(llm.get("api_key_env") or "DEEPSEEK_API_KEY"), "")).strip()


def redact(text, key=""):
    value = str(text)
    if key:
        value = value.replace(key, "[REDACTED]")
    return re.sub(r"(?i)(?:sk-[\w-]{8,}|Bearer\s+\S+)", "[REDACTED]", value)
