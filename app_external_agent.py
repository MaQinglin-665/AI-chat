"""External task routes, called only after the existing origin/token guards."""
import re
from external_agents.policy import AgentError


def handles(path):
    return path == "/api/agent/task" or path.startswith("/api/agent/task/")


def dispatch(handler, method, path, manager):
    try:
        manager._config()  # Disabled means deny even malformed/unknown task routes.
        match = re.fullmatch(r"/api/agent/task(?:/([a-f0-9]{32})(?:/(approve|cancel))?)?", path)
        if not match:
            raise AgentError("route_missing", "接口不存在。", 404)
        task_id, action = match.groups()
        if method == "GET" and task_id and not action:
            task = manager.get_task(task_id)
        elif method == "POST" and not task_id:
            body, ok = handler._read_json_body(invalid_payload={"ok": False, "error": "Invalid JSON body."}, path_only=path)
            if not ok:
                return
            if not isinstance(body, dict):
                raise AgentError("invalid_body", "请求体必须是对象。")
            task = manager.create_task(body.get("goal"), body.get("workdir"))
        elif method == "POST" and action:
            task = getattr(manager, action)(task_id)
        else:
            raise AgentError("route_missing", "接口不存在。", 404)
        handler._send_json({"ok": True, "task": task}, status=202 if method == "POST" else 200)
    except AgentError as exc:
        handler._send_json({"ok": False, "code": exc.code, "error": str(exc)}, status=exc.status)
    except Exception:
        handler._send_json({"ok": False, "code": "external_agent_error", "error": "外部任务服务暂不可用。"}, status=500)
