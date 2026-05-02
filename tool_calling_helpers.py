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


def render_tool_execution_summary(tool_payloads, max_chars=1800, tool_meta_marker="[[TAFFY_TOOL_META]]"):
    if not isinstance(tool_payloads, list) or not tool_payloads:
        return ""
    lines = ["我已经帮你执行了这次工具任务。"]
    for idx, payload in enumerate(tool_payloads[:4], start=1):
        if not isinstance(payload, dict):
            continue
        tool_name = str(payload.get("tool", "")).strip() or "unknown_tool"
        if payload.get("ok"):
            result = payload.get("result") if isinstance(payload.get("result"), dict) else {}
            if tool_name == "write_file":
                lines.append(f"{idx}. 已写入文件：{result.get('path', '')}")
            elif tool_name == "replace_in_file":
                lines.append(
                    f"{idx}. 已修改文件：{result.get('path', '')}，替换 {int(result.get('replacements', 0) or 0)} 处。"
                )
            elif tool_name == "read_file":
                lines.append(f"{idx}. 已读取文件：{result.get('path', '')}")
            elif tool_name == "list_files":
                lines.append(f"{idx}. 已列出文件，共 {int(result.get('count', 0) or 0)} 项。")
            elif tool_name == "search_text":
                lines.append(f"{idx}. 已完成文本搜索，命中 {int(result.get('count', 0) or 0)} 条。")
            elif tool_name == "run_command":
                lines.append(
                    f"{idx}. 已执行命令，退出码 {int(result.get('exit_code', 0) or 0)}。"
                )
            elif tool_name == "generate_image":
                lines.append("{}. 已生成图片。".format(idx))
            else:
                result_text = json.dumps(result, ensure_ascii=False)
                lines.append(f"{idx}. {tool_name} 成功：{result_text[:220]}")
        else:
            err = str(payload.get("error", "unknown error"))
            lines.append(f"{idx}. {tool_name} 失败：{err[:260]}")
    text = "\n".join(lines)
    safe_text = _truncate_text(text, max_chars)
    meta = build_tool_meta_payload(tool_payloads)
    if not meta.get("items"):
        return safe_text
    return f"{safe_text}\n{tool_meta_marker}{json.dumps(meta, ensure_ascii=False, separators=(',', ':'))}"


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
