"""Explicitly requested, single-task external execution and approval lifecycle."""
from __future__ import annotations

import copy
import json
from pathlib import Path
import threading
import time
import uuid

import agent_actions
import shared_experience
from external_agents.file_manifest import snapshot, compare, planned_moves
from companion_events import CompanionEventBus
from external_agents.codex_cli import CodexCLI, PLAN_SCHEMA
from external_agents.policy import AgentError, inside, key_from_config, redact, settings, validate_workdir

TERMINAL = {"completed", "failed", "cancelled", "expired"}


def validate_plan(plan, workdir, key):
    if not isinstance(plan, dict) or set(plan) != set(PLAN_SCHEMA["required"]):
        raise AgentError("invalid_plan", "计划字段不完整，请重新规划。")
    if not isinstance(plan["summary"], str) or not plan["summary"].strip() or len(plan["summary"]) > 500:
        raise AgentError("invalid_plan", "计划摘要为空或过长。")
    if plan["risk"] not in {"low", "medium", "high"} or not isinstance(plan["needs_network"], bool):
        raise AgentError("invalid_plan", "计划风险或网络声明无效。")
    for field in ("steps", "files_to_create", "files_to_modify", "files_to_delete", "commands"):
        values = plan[field]
        if not isinstance(values, list) or len(values) > 100 or any(not isinstance(v, str) or len(v) > 2000 for v in values):
            raise AgentError("invalid_plan", "计划清单格式无效或过长。")
        if field.startswith("files_"):
            for value in values:
                target = Path(value)
                if (not value or any(ord(c) < 32 or c in '<>:"|?*' for c in value)
                        or target.is_absolute() or ".." in target.parts):
                    raise AgentError("plan_path_denied", "计划中的文件必须使用工作目录内的相对路径。")
                try:
                    resolved = (workdir / target).resolve()
                except (OSError, RuntimeError):
                    raise AgentError("plan_path_denied", "计划中的路径无法安全解析。") from None
                if not inside(resolved, workdir) or resolved == workdir:
                    raise AgentError("plan_path_denied", "计划中的路径超出了工作目录。")
    text = json.dumps(plan, ensure_ascii=False)
    if len(text) > 24000 or (key and key in text):
        raise AgentError("invalid_plan", "计划过大或包含凭据信息，已拒绝。")
    return json.loads(redact(text, key))


class ExternalAgentManager:
    def __init__(self, config_loader, *, adapter_factory=CodexCLI, actions=agent_actions, bus=None, clock=time.time):
        self.config_loader, self.adapter_factory = config_loader, adapter_factory
        self.actions, self.bus, self.clock = actions, bus or CompanionEventBus(), clock
        self.lock = threading.RLock()
        self.tasks = {}
        self.active = None

    def _config(self):
        config = copy.deepcopy(self.config_loader())
        cfg = settings(config)
        if cfg["enabled"] is not True:
            raise AgentError("disabled", "外部执行功能尚未开启。", 403)
        return config, cfg

    def _public(self, task):
        return copy.deepcopy({k: v for k, v in task.items() if not k.startswith("_")})

    def _task(self, task_id):
        task = self.tasks.get(task_id)
        if task is None:
            raise AgentError("task_missing", "任务不存在。", 404)
        if task["status"] == "awaiting_approval" and self.clock() >= task["expires_at"]:
            self.actions.consume_pending(task["confirmation_id"])
            self._transition(task, "expired")
            self.active = None
            task.pop("_config", None)
            task.pop("_goal", None)
        return task

    def _counts(self, task):
        plan = task.get("plan") or {}
        return {"create_count": len(plan.get("files_to_create", [])), "modify_count": len(plan.get("files_to_modify", [])),
                "delete_count": len(plan.get("files_to_delete", []))}

    def _publish(self, task, event):
        self.bus.publish(event, {"task_id": task["id"], "phase": task["status"], **self._counts(task),
                                 "progress_count": task["progress_count"], "warning_count": task["warning_count"]})

    def _transition(self, task, state, error=None):
        task["status"] = state
        task["updated_at"] = self.clock()
        if error:
            task["error"] = {"code": error.code, "message": str(error)}
            if error.detail:
                task["error"]["detail"] = {"type": str(error.detail.get("type", ""))[:40], "http_status": error.detail.get("http_status"),
                    "message": redact(error.detail.get("message", ""), key_from_config(task.get("_config", {})), paths=True)[:200]}
        self.actions.append_audit({"tool": "external_agent_task", "summary": task["goal_summary"],
                                   "args": {"task_id": task["id"], **self._counts(task)}}, status=state,
                                  result={**self._counts(task), **({"changes": task["changes"]} if "changes" in task else {})})
        if state in {"awaiting_approval", "completed", "failed", "cancelled"}:
            self._publish(task, "agent_task_" + state)

    def create_task(self, goal, workdir):
        config, cfg = self._config()
        if not isinstance(goal, str) or not goal.strip() or len(goal) > 8000:
            raise AgentError("invalid_goal", "任务描述不能为空，且不得超过 8000 字符。")
        work = validate_workdir(workdir, cfg)
        key = key_from_config(config)
        if key and key in goal:
            raise AgentError("goal_contains_key", "任务描述不能包含 API Key。")
        with self.lock:
            if self.active:
                self._task(self.active)
            if self.active:
                raise AgentError("busy", "已有任务正在规划、等待批准或执行，请先完成或取消。", 409)
            while len(self.tasks) >= 100:
                self.tasks.pop(next(iter(self.tasks)))
            task_id = uuid.uuid4().hex
            task = dict(id=task_id, status="planning", goal_summary=redact(goal[:160], key), workdir=str(work),
                        plan=None, confirmation_id=None, created_at=self.clock(), updated_at=self.clock(),
                        progress_count=0, warning_count=0, warnings=[], cancel_requested=False,
                        _cancel=threading.Event(), _config=config, _goal=goal)
            self.tasks[task_id] = task
            self.active = task_id
            try:
                self._transition(task, "planning")
            except Exception:
                self.active = None
                self.tasks.pop(task_id)
                raise AgentError("audit_failed", "无法写入审批审计，未启动任务。", 500) from None
            self._start(task, planning=True)
            return self._public(task)

    def _start(self, task, *, planning):
        worker = threading.Thread(target=self._worker, args=(task, planning), daemon=True)
        task["_worker"] = worker
        worker.start()

    def _worker(self, task, planning):
        def emit(event):
            with self.lock:
                if task["status"] in TERMINAL:
                    return
                if event["kind"] == "warning":
                    task["warning_count"] += 1
                    code = event.get("code", "item_warning")
                    if code in {"item_warning", "malformed_jsonl", "line_too_long"} and code not in task["warnings"]:
                        task["warnings"].append(code)
                else:
                    task["progress_count"] += 1
                self._publish(task, "agent_task_progress")
        before = None
        work = None
        try:
            config, cfg = self._config()
            work = validate_workdir(task["workdir"], cfg)
            if task["_cancel"].is_set():
                raise AgentError("cancelled", "任务已取消。")
            if not planning:
                before = snapshot(work)
                task["_manifest_before"] = before
            # Use the configuration approved for this phase, not later model/key changes.
            result = self.adapter_factory(task["_config"]).run(goal=task["_goal"], workdir=work,
                    cancel=task["_cancel"], emit=emit, plan=None if planning else task["plan"])
            with self.lock:
                if task["_cancel"].is_set():
                    raise AgentError("cancelled", "任务已取消。")
                if planning:
                    task["plan"] = validate_plan(result, work, key_from_config(task["_config"]))
                    task["planned_moves"] = planned_moves(task["plan"])
                    self._publish(task, "agent_task_planned")
                    counts = self._counts(task)
                    summary = f'{task["plan"]["summary"]}；修改 {counts["modify_count"]} 个，删除 {counts["delete_count"]} 个'
                    pending = self.actions.create_pending("external_agent_task", {"task_id": task["id"], **counts},
                        "external_agent_explicit_approval", summary,
                        ttl_minutes=cfg["plan_ttl_minutes"])
                    task["confirmation_id"] = pending["id"]
                    task["expires_at"] = self.clock() + cfg["plan_ttl_minutes"] * 60
                    task["approval_warnings"] = {"deletes": [p for p in task["plan"]["files_to_delete"] if p not in {m["from"] for m in task["planned_moves"]}],
                        "high_risk": task["plan"]["risk"] == "high", "needs_network": task["plan"]["needs_network"]}
                    self._transition(task, "awaiting_approval")
                    timer = threading.Timer(cfg["plan_ttl_minutes"] * 60, self._expire, args=(task["id"],))
                    timer.daemon = True
                    task["_timer"] = timer
                    timer.start()
                else:
                    self._verify_files(task, work, before)
                    before = None
                    self._transition(task, "completed")
                    try:
                        task["shared_experience_recorded"] = bool(shared_experience.record_from_core_candidates(
                            task["_config"], [{"kind": "episodic", "category": "recent_event",
                            "text": "一起完成了外部任务：" + task["goal_summary"][:90]}])) if not task["changes"]["out_of_plan_count"] and not any(task["changes"]["planned_not_observed"].values()) else False
                    except Exception:
                        task["shared_experience_recorded"] = False
        except Exception as exc:
            error = exc if isinstance(exc, AgentError) else AgentError("execution_failed", "外部任务未能完成，请检查本机配置后重试。")
            with self.lock:
                if before is not None and error.code == "cancel_failed":
                    task["verification_error"] = "进程清理未确认完成，无法提供稳定的执行后文件核对结果。"
                elif before is not None:
                    try:
                        self._verify_files(task, work, before)
                    except AgentError as verification_error:
                        task["verification_error"] = str(verification_error)
                # Release the single-task slot only after adapter cleanup finishes.
                state = "cancelled" if error.code == "cancelled" else "failed"
                try:
                    self._transition(task, state, error)
                except Exception:
                    task.update(status="failed", error={"code": "audit_failed", "message": "审计写入失败，任务已停止。"})
        finally:
            with self.lock:
                if task["status"] in TERMINAL and self.active == task["id"] and task.get("error", {}).get("code") != "cancel_failed":
                    self.active = None
                if task["status"] in TERMINAL:
                    task.pop("_config", None)
                    task.pop("_goal", None)

    def _verify_files(self, task, work, before):
        after = snapshot(work)
        task["_manifest_after"] = after
        task["changes"] = json.loads(redact(json.dumps(compare(before, after, task["plan"]), ensure_ascii=False),
                                           key_from_config(task["_config"])))

    def _expire(self, task_id):
        with self.lock:
            if task_id in self.tasks:
                self._task(task_id)

    def get_task(self, task_id):
        self._config()
        with self.lock:
            return self._public(self._task(task_id))

    def list_tasks(self):
        self._config()
        with self.lock:
            return [self._public(self._task(k)) for k in self.tasks]

    def approve(self, task_id):
        config, cfg = self._config()
        with self.lock:
            task = self._task(task_id)
            if task["status"] != "awaiting_approval":
                raise AgentError("not_awaiting_approval", "任务不在等待批准状态。", 409)
            work = validate_workdir(task["workdir"], cfg)
            validate_plan(task["plan"], work, key_from_config(config))
            if not self.actions.consume_pending(task["confirmation_id"]):
                self._transition(task, "cancelled")
                self.active = None
                raise AgentError("approval_missing", "审批已拒绝、消费或过期，请重新创建任务。", 409)
            task["_timer"].cancel()
            task["_config"] = config
            try:
                self._transition(task, "executing")
            except Exception:
                task.update(status="failed", error={"code": "audit_failed", "message": "审计写入失败，未开始执行。"})
                self.active = None
                task.pop("_config", None)
                task.pop("_goal", None)
                raise AgentError("audit_failed", "审计写入失败，未开始执行。", 500) from None
            self._start(task, planning=False)
            return self._public(task)

    def cancel(self, task_id):
        self._config()
        with self.lock:
            task = self._task(task_id)
            if task["status"] in TERMINAL:
                return self._public(task)
            task["cancel_requested"] = True
            task["_cancel"].set()
            if task["status"] == "awaiting_approval":
                self.actions.consume_pending(task["confirmation_id"])
                task["_timer"].cancel()
                self._transition(task, "cancelled")
                self.active = None
                task.pop("_config", None)
                task.pop("_goal", None)
            return self._public(task)


_manager = None
_manager_lock = threading.Lock()


def get_manager(config_loader=None, bus=None):
    global _manager
    with _manager_lock:
        if _manager is None:
            from config import load_config
            _manager = ExternalAgentManager(config_loader or load_config, bus=bus)
        return _manager


def create_task(goal, workdir):
    return get_manager().create_task(goal, workdir)


def get_task(task_id):
    return get_manager().get_task(task_id)


def approve(task_id):
    return get_manager().approve(task_id)


def cancel(task_id):
    return get_manager().cancel(task_id)


def list_tasks():
    return get_manager().list_tasks()
