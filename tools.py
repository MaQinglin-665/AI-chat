import base64
import fnmatch
import os
import re
import shlex
import subprocess
import urllib.request
from datetime import datetime
from pathlib import Path

from config import (
    DEFAULT_ALLOWED_COMMAND_PREFIXES,
    DEFAULT_WORKSPACE_ROOT,
    OPENAI_DEFAULT_BASE_URL,
    OPENAI_DEFAULT_KEY_ENV,
    WEB_DIR,
)
from utils import _clamp_int, _truncate_text


WORK_INTENT_RE = re.compile(
    r"(修改|编辑|改代码|代码|脚本|文件|目录|文件夹|终端|命令|运行|执行|生成图片|画图|create image|tool|工具)",
    re.IGNORECASE,
)
GENERATED_IMAGE_DIR = WEB_DIR / "generated_images"
WORK_TOOL_DEFS = [
    {
        "type": "function",
        "function": {
            "name": "list_files",
            "description": "List files/directories under workspace path.",
            "parameters": {
                "type": "object",
                "properties": {
                    "path": {"type": "string"},
                    "recursive": {"type": "boolean"},
                    "pattern": {"type": "string"},
                    "max_entries": {"type": "integer"},
                },
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "read_file",
            "description": "Read text file content. Supports line range.",
            "parameters": {
                "type": "object",
                "properties": {
                    "path": {"type": "string"},
                    "start_line": {"type": "integer"},
                    "end_line": {"type": "integer"},
                },
                "required": ["path"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "write_file",
            "description": "Write text content to file (overwrite or append).",
            "parameters": {
                "type": "object",
                "properties": {
                    "path": {"type": "string"},
                    "content": {"type": "string"},
                    "mode": {"type": "string", "enum": ["overwrite", "append"]},
                },
                "required": ["path", "content"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "replace_in_file",
            "description": "Replace text in a file.",
            "parameters": {
                "type": "object",
                "properties": {
                    "path": {"type": "string"},
                    "find": {"type": "string"},
                    "replace": {"type": "string"},
                    "count": {"type": "integer"},
                },
                "required": ["path", "find", "replace"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "search_text",
            "description": "Search text in files under workspace.",
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {"type": "string"},
                    "path": {"type": "string"},
                    "pattern": {"type": "string"},
                    "max_results": {"type": "integer"},
                },
                "required": ["query"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "run_command",
            "description": "Run shell command in workspace (safe subset).",
            "parameters": {
                "type": "object",
                "properties": {
                    "command": {"type": "string"},
                    "cwd": {"type": "string"},
                    "timeout_sec": {"type": "integer"},
                },
                "required": ["command"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "generate_image",
            "description": "Generate image from text prompt and save to local web folder.",
            "parameters": {
                "type": "object",
                "properties": {
                    "prompt": {"type": "string"},
                    "size": {"type": "string"},
                    "filename_prefix": {"type": "string"},
                },
                "required": ["prompt"],
            },
        },
    },
]


def get_tools_settings(config):
    raw = config.get("tools", {}) if isinstance(config, dict) else {}
    root_raw = str(raw.get("workspace_root", DEFAULT_WORKSPACE_ROOT) or "").strip()
    if not root_raw:
        root_raw = DEFAULT_WORKSPACE_ROOT
    try:
        workspace_root = Path(root_raw).expanduser().resolve()
    except Exception:
        workspace_root = Path(DEFAULT_WORKSPACE_ROOT).resolve()
    if not workspace_root.exists():
        workspace_root = Path(DEFAULT_WORKSPACE_ROOT).resolve()

    allowed_raw = raw.get("allowed_command_prefixes", DEFAULT_ALLOWED_COMMAND_PREFIXES)
    allowed = []
    if isinstance(allowed_raw, list):
        for item in allowed_raw:
            token = str(item or "").strip().lower()
            if token:
                allowed.append(token)
    if not allowed:
        allowed = list(DEFAULT_ALLOWED_COMMAND_PREFIXES)
    allowed = allowed[:80]

    return {
        "enabled": bool(raw.get("enabled", True)),
        "workspace_root": workspace_root,
        # Keep shell execution opt-in by default for safer public releases.
        "allow_shell": bool(raw.get("allow_shell", False)),
        "allowed_command_prefixes": allowed,
        "shell_timeout_sec": _clamp_int(raw.get("shell_timeout_sec", 25), 25, 3, 180),
        "max_file_read_chars": _clamp_int(
            raw.get("max_file_read_chars", 24000), 24000, 1000, 200000
        ),
        "max_command_output_chars": _clamp_int(
            raw.get("max_command_output_chars", 14000), 14000, 1000, 200000
        ),
        "image_enabled": bool(raw.get("image_enabled", True)),
        "image_model": str(raw.get("image_model", "gpt-image-1") or "gpt-image-1"),
        "image_size": str(raw.get("image_size", "1024x1024") or "1024x1024"),
    }


def should_use_work_tools(user_message, tools_settings, image_data_url=None):
    if image_data_url:
        return False
    if not tools_settings.get("enabled", False):
        return False
    text = str(user_message or "").strip()
    if not text:
        return False
    if text.startswith("/tool") or text.startswith("宸ュ叿:"):
        return True
    return bool(WORK_INTENT_RE.search(text))


def _resolve_in_workspace(workspace_root, raw_path):
    root = Path(workspace_root).resolve()
    path_text = str(raw_path or "").strip()
    if not path_text:
        target = root
    else:
        cand = Path(path_text).expanduser()
        if cand.is_absolute():
            target = cand.resolve()
        else:
            target = (root / cand).resolve()
    try:
        target.relative_to(root)
    except ValueError as exc:
        raise RuntimeError(f"Path outside workspace is not allowed: {target}") from exc
    return target


def _safe_rel(workspace_root, path_obj):
    try:
        return str(path_obj.resolve().relative_to(Path(workspace_root).resolve()))
    except Exception:
        return str(path_obj)


def _normalize_command_token(token):
    t = str(token or "").strip().strip("'\"").lower()
    for suffix in (".exe", ".cmd", ".bat", ".ps1"):
        if t.endswith(suffix):
            t = t[: -len(suffix)]
            break
    return t


def _extract_first_command_token(command):
    s = str(command or "").strip()
    if not s:
        return ""
    m = re.match(r"^\s*([^\s]+)", s)
    if not m:
        return ""
    return _normalize_command_token(m.group(1))


def _split_command_args(command):
    src = str(command or "").strip()
    if not src:
        return []
    try:
        # Use Windows-compatible mode on Windows to preserve quoted paths and escaping.
        return shlex.split(src, posix=(os.name != "nt"))
    except ValueError as exc:
        raise RuntimeError(f"Invalid command syntax: {exc}") from exc


def _has_unsafe_shell_syntax(command):
    s = str(command or "")
    if not s:
        return True
    if re.search(r"[\r\n]", s):
        return True
    if re.search(r"[|;&<>`]", s):
        return True
    return False


def _is_command_allowed_by_prefix(command, allowed_prefixes):
    first = _extract_first_command_token(command)
    if not first:
        return False
    blocked_wrappers = {"cmd", "powershell", "pwsh", "bash", "sh"}
    if first in blocked_wrappers:
        return False
    allowed = {str(x or "").strip().lower() for x in (allowed_prefixes or [])}
    return first in allowed


def _is_dangerous_command(command):
    s = str(command or "").strip().lower()
    if not s:
        return True
    patterns = [
        r"(^|\s)rm\s+-rf(\s|$)",
        r"(^|\s)del(\.exe)?\s*(/f|/s|/q|/a|/p|\*)",
        r"(^|\s)erase(\s|$)",
        r"(^|\s)(rd|rmdir)(\s|$)",
        r"(^|\s)format(\s|$)",
        r"(^|\s)(shutdown|reboot|poweroff)(\s|$)",
        r"remove-item\b.+-recurse",
    ]
    return any(re.search(p, s) for p in patterns)


def tool_list_files(args, settings):
    path = _resolve_in_workspace(settings["workspace_root"], args.get("path", "."))
    recursive = bool(args.get("recursive", False))
    pattern = str(args.get("pattern", "*") or "*")
    max_entries = _clamp_int(args.get("max_entries", 120), 120, 1, 500)
    items = []
    if path.is_file():
        return {"entries": [{"path": _safe_rel(settings["workspace_root"], path), "type": "file"}]}
    if not path.exists():
        raise RuntimeError(f"Path not found: {path}")

    if recursive:
        for child in path.rglob("*"):
            rel = _safe_rel(settings["workspace_root"], child)
            name = child.name
            if not fnmatch.fnmatch(name, pattern):
                continue
            items.append({"path": rel, "type": "dir" if child.is_dir() else "file"})
            if len(items) >= max_entries:
                break
    else:
        for child in sorted(path.iterdir(), key=lambda p: (not p.is_dir(), p.name.lower())):
            if not fnmatch.fnmatch(child.name, pattern):
                continue
            rel = _safe_rel(settings["workspace_root"], child)
            items.append({"path": rel, "type": "dir" if child.is_dir() else "file"})
            if len(items) >= max_entries:
                break
    return {"entries": items, "count": len(items)}


def tool_read_file(args, settings):
    path = _resolve_in_workspace(settings["workspace_root"], args.get("path", ""))
    if not path.exists() or not path.is_file():
        raise RuntimeError(f"File not found: {path}")
    text = path.read_text(encoding="utf-8", errors="replace")
    start_line = _clamp_int(args.get("start_line", 1), 1, 1, 10_000_000)
    end_line_raw = args.get("end_line")
    lines = text.splitlines()
    if end_line_raw is None:
        selected = lines[start_line - 1 :]
    else:
        end_line = _clamp_int(end_line_raw, start_line + 220, start_line, 10_000_000)
        selected = lines[start_line - 1 : end_line]
    content = "\n".join(selected)
    return {
        "path": _safe_rel(settings["workspace_root"], path),
        "content": _truncate_text(content, settings["max_file_read_chars"]),
    }


def tool_write_file(args, settings):
    path = _resolve_in_workspace(settings["workspace_root"], args.get("path", ""))
    content = str(args.get("content", ""))
    mode = str(args.get("mode", "overwrite")).strip().lower()
    if mode not in {"overwrite", "append"}:
        mode = "overwrite"
    path.parent.mkdir(parents=True, exist_ok=True)
    if mode == "append":
        with path.open("a", encoding="utf-8", errors="replace") as f:
            f.write(content)
    else:
        path.write_text(content, encoding="utf-8")
    return {
        "path": _safe_rel(settings["workspace_root"], path),
        "mode": mode,
        "chars_written": len(content),
    }


def tool_replace_in_file(args, settings):
    path = _resolve_in_workspace(settings["workspace_root"], args.get("path", ""))
    find = str(args.get("find", ""))
    replace = str(args.get("replace", ""))
    if not path.exists() or not path.is_file():
        raise RuntimeError(f"File not found: {path}")
    if not find:
        raise RuntimeError("find cannot be empty")
    try:
        count = int(args.get("count", -1))
    except (TypeError, ValueError):
        count = -1
    text = path.read_text(encoding="utf-8", errors="replace")
    new_text = text.replace(find, replace, count if count >= 0 else -1)
    replacements = text.count(find) if count < 0 else min(text.count(find), max(0, count))
    path.write_text(new_text, encoding="utf-8")
    return {
        "path": _safe_rel(settings["workspace_root"], path),
        "replacements": replacements,
    }


def tool_search_text(args, settings):
    query = str(args.get("query", "")).strip()
    if not query:
        raise RuntimeError("query cannot be empty")
    base = _resolve_in_workspace(settings["workspace_root"], args.get("path", "."))
    pattern = str(args.get("pattern", "*") or "*")
    max_results = _clamp_int(args.get("max_results", 30), 30, 1, 200)
    results = []
    if base.is_file():
        iterable = [base]
    else:
        iterable = base.rglob("*")
    for p in iterable:
        if not p.is_file():
            continue
        if not fnmatch.fnmatch(p.name, pattern):
            continue
        try:
            text = p.read_text(encoding="utf-8", errors="replace")
        except Exception:
            continue
        for idx, line in enumerate(text.splitlines(), start=1):
            if query.lower() in line.lower():
                results.append(
                    {
                        "path": _safe_rel(settings["workspace_root"], p),
                        "line": idx,
                        "text": line.strip()[:240],
                    }
                )
                if len(results) >= max_results:
                    return {"results": results, "count": len(results)}
    return {"results": results, "count": len(results)}


def tool_run_command(args, settings):
    if not settings.get("allow_shell", True):
        raise RuntimeError("Shell tool is disabled by config.")
    command = str(args.get("command", "")).strip()
    if not command:
        raise RuntimeError("command cannot be empty")
    if _has_unsafe_shell_syntax(command):
        raise RuntimeError("Command blocked: chaining/redirection syntax is not allowed.")
    if not _is_command_allowed_by_prefix(
        command, settings.get("allowed_command_prefixes", DEFAULT_ALLOWED_COMMAND_PREFIXES)
    ):
        raise RuntimeError("Command blocked: prefix not in allowlist.")
    if _is_dangerous_command(command):
        raise RuntimeError("Command blocked by safety policy.")
    cwd = _resolve_in_workspace(
        settings["workspace_root"], args.get("cwd", ".")
    )
    if not cwd.exists() or not cwd.is_dir():
        raise RuntimeError(f"cwd is not a directory: {cwd}")
    timeout_sec = _clamp_int(
        args.get("timeout_sec", settings.get("shell_timeout_sec", 25)),
        settings.get("shell_timeout_sec", 25),
        3,
        180,
    )
    args_list = _split_command_args(command)
    if not args_list:
        raise RuntimeError("command cannot be empty")
    proc = subprocess.run(
        args_list,
        cwd=str(cwd),
        shell=False,
        capture_output=True,
        text=True,
        timeout=timeout_sec,
        encoding="utf-8",
        errors="replace",
    )
    max_chars = settings.get("max_command_output_chars", 14000)
    return {
        "cwd": _safe_rel(settings["workspace_root"], cwd),
        "exit_code": int(proc.returncode),
        "stdout": _truncate_text(proc.stdout, max_chars),
        "stderr": _truncate_text(proc.stderr, max_chars),
    }


def _openai_auth_headers(llm_cfg, is_local_url_fn):
    base_url = str(llm_cfg.get("base_url", OPENAI_DEFAULT_BASE_URL)).rstrip("/")
    key_env = llm_cfg.get("api_key_env", OPENAI_DEFAULT_KEY_ENV)
    headers = {"Content-Type": "application/json"}
    api_key = str(llm_cfg.get("api_key", "")).strip() or os.environ.get(key_env, "").strip()
    if api_key:
        headers["Authorization"] = f"Bearer {api_key}"
    elif not is_local_url_fn(base_url):
        raise RuntimeError(
            f"Missing API key. Please set environment variable: {key_env}."
        )
    return base_url, headers


def tool_generate_image(args, settings, llm_cfg, http_post_json_fn, is_local_url_fn):
    if not settings.get("image_enabled", True):
        raise RuntimeError("Image tool is disabled by config.")
    prompt = str(args.get("prompt", "")).strip()
    if not prompt:
        raise RuntimeError("prompt cannot be empty")
    base_url, headers = _openai_auth_headers(llm_cfg, is_local_url_fn)
    model = settings.get("image_model", "gpt-image-1")
    size = str(args.get("size", settings.get("image_size", "1024x1024"))).strip() or "1024x1024"
    payload = {
        "model": model,
        "prompt": prompt,
        "size": size,
        "response_format": "b64_json",
    }
    data = http_post_json_fn(
        f"{base_url}/images/generations", payload, headers=headers, timeout=120
    )
    images = data.get("data") if isinstance(data, dict) else []
    if not isinstance(images, list) or not images:
        raise RuntimeError("Image API returned empty result.")
    first = images[0] if isinstance(images[0], dict) else {}
    b64 = str(first.get("b64_json", "")).strip()
    raw = b""
    if b64:
        raw = base64.b64decode(b64)
    else:
        image_url = str(first.get("url", "")).strip()
        if image_url:
            try:
                with urllib.request.urlopen(image_url, timeout=60) as resp:
                    raw = resp.read()
            except Exception as exc:
                raise RuntimeError("Image API returned URL but download failed.") from exc
    if not raw:
        raise RuntimeError("Image API returned no usable image data.")
    GENERATED_IMAGE_DIR.mkdir(parents=True, exist_ok=True)

    # Keep generated image cache bounded to avoid unbounded disk growth.
    keep_latest = 20
    try:
        existing = sorted(
            [p for p in GENERATED_IMAGE_DIR.glob("*") if p.is_file()],
            key=lambda p: p.stat().st_mtime,
        )
        # Clean before writing new file so final count stays around keep_latest.
        for old in existing[: max(0, len(existing) - (keep_latest - 1))]:
            try:
                old.unlink(missing_ok=True)
            except TypeError:
                if old.exists():
                    old.unlink()
            except Exception:
                pass
    except Exception:
        # Cleanup should never block image generation.
        pass

    prefix = str(args.get("filename_prefix", "gen")).strip() or "gen"
    prefix = re.sub(r"[^A-Za-z0-9_-]+", "_", prefix)[:32] or "gen"
    name = f"{prefix}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.png"
    out_path = GENERATED_IMAGE_DIR / name
    out_path.write_bytes(raw)
    return {
        "image_url": f"/generated_images/{name}",
        "saved_path": str(out_path),
        "size_bytes": len(raw),
    }


def execute_work_tool(name, args, config, llm_cfg, http_post_json_fn, is_local_url_fn):
    settings = get_tools_settings(config)
    tool_name = str(name or "").strip()
    args = args if isinstance(args, dict) else {}
    if tool_name == "list_files":
        return tool_list_files(args, settings)
    if tool_name == "read_file":
        return tool_read_file(args, settings)
    if tool_name == "write_file":
        return tool_write_file(args, settings)
    if tool_name == "replace_in_file":
        return tool_replace_in_file(args, settings)
    if tool_name == "search_text":
        return tool_search_text(args, settings)
    if tool_name == "run_command":
        return tool_run_command(args, settings)
    if tool_name == "generate_image":
        return tool_generate_image(
            args,
            settings,
            llm_cfg,
            http_post_json_fn=http_post_json_fn,
            is_local_url_fn=is_local_url_fn,
        )
    raise RuntimeError(f"Unknown tool: {tool_name}")

