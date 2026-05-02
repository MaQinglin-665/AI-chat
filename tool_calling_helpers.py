import json

from utils import _truncate_text


def parse_tool_args(raw):
    if isinstance(raw, dict):
        return raw
    text = str(raw or "").strip()
    if not text:
        return {}
    try:
        parsed = json.loads(text)
        return parsed if isinstance(parsed, dict) else {}
    except Exception:
        return {}


def build_tool_meta_payload(tool_payloads):
    items = []
    for payload in (tool_payloads or [])[:6]:
        if not isinstance(payload, dict):
            continue
        tool_name = str(payload.get("tool", "")).strip() or "unknown_tool"
        args = payload.get("args") if isinstance(payload.get("args"), dict) else {}
        result = payload.get("result") if isinstance(payload.get("result"), dict) else {}
        item = {
            "tool": tool_name,
            "ok": bool(payload.get("ok")),
        }
        if args:
            item["args"] = args
        if item["ok"]:
            if tool_name in {"write_file", "replace_in_file", "read_file"}:
                path = str(result.get("path", "")).strip()
                if path:
                    item["path"] = path
            if tool_name == "list_files":
                item["count"] = int(result.get("count", 0) or 0)
                entries = result.get("entries") if isinstance(result.get("entries"), list) else []
                item["entries"] = entries[:6]
            elif tool_name == "search_text":
                item["count"] = int(result.get("count", 0) or 0)
                matches = result.get("results") if isinstance(result.get("results"), list) else []
                item["results"] = matches[:4]
            elif tool_name == "read_file":
                item["content_preview"] = _truncate_text(result.get("content", ""), 380)
            elif tool_name == "write_file":
                item["chars_written"] = int(result.get("chars_written", 0) or 0)
                item["mode"] = str(result.get("mode", "")).strip()
            elif tool_name == "replace_in_file":
                item["replacements"] = int(result.get("replacements", 0) or 0)
            elif tool_name == "run_command":
                item["cwd"] = str(result.get("cwd", "")).strip()
                item["exit_code"] = int(result.get("exit_code", 0) or 0)
                item["stdout_preview"] = _truncate_text(result.get("stdout", ""), 280)
                item["stderr_preview"] = _truncate_text(result.get("stderr", ""), 180)
            elif tool_name == "generate_image":
                item["image_url"] = str(result.get("image_url", "")).strip()
                item["saved_path"] = str(result.get("saved_path", "")).strip()
                item["size_bytes"] = int(result.get("size_bytes", 0) or 0)
        else:
            item["error"] = str(payload.get("error", "")).strip()[:320]
        items.append(item)
    return {"items": items}


def build_responses_tool_defs(work_tool_defs):
    tools = []
    for item in work_tool_defs:
        if not isinstance(item, dict):
            continue
        fn = item.get("function")
        if not isinstance(fn, dict):
            continue
        name = str(fn.get("name", "")).strip()
        if not name:
            continue
        tools.append(
            {
                "type": "function",
                "name": name,
                "description": str(fn.get("description", "")).strip(),
                "parameters": fn.get("parameters", {"type": "object"}),
            }
        )
    return tools


def build_chat_completions_tool_defs(work_tool_defs):
    tools = []
    for item in work_tool_defs:
        if not isinstance(item, dict):
            continue
        fn = item.get("function")
        if not isinstance(fn, dict):
            continue
        name = str(fn.get("name", "")).strip()
        if not name:
            continue
        tools.append(
            {
                "type": "function",
                "function": {
                    "name": name,
                    "description": str(fn.get("description", "")).strip(),
                    "parameters": fn.get("parameters", {"type": "object"}),
                },
            }
        )
    return tools


def inject_tool_intro(messages, tool_intro):
    convo = list(messages)
    if convo and isinstance(convo[0], dict) and convo[0].get("role") == "system":
        first = dict(convo[0])
        first_content = str(first.get("content", "")).strip()
        first["content"] = f"{first_content}\n\n{tool_intro}".strip()
        convo[0] = first
    else:
        convo.insert(0, {"role": "system", "content": tool_intro})
    return convo
