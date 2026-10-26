"""Phase-1 decision service. Produces plans; has no renderer/tool executor."""
from __future__ import annotations

from collections import OrderedDict
from contextlib import contextmanager
from copy import deepcopy
from datetime import datetime
import logging
import os
import threading
import time
import uuid

from avatar_brain_protocol import number, parse_decision, prompt, sanitize_world
from avatar_brain_context import build_context, recent_history
from avatar_brain_usage import UsageBudget

LOG = logging.getLogger(__name__)
MODE_LIMITS = {"quiet": (900, 2), "daily": (300, 6), "streamer": (60, 20)}
DEFAULT_DAILY_LIMIT = 24
WORLD_TTL = 90
PLAN_TTL = 300
TICK_SECONDS = 5
MIN_IDLE_SECONDS = 30
MAX_PLANS = 16
NAMES = {"accompany": "陪伴位", "window": "窗边", "books": "书架前", "rest": "沙发", "desk": "书桌前",
         "stretch": "伸懒腰", "yawn": "打哈欠", "hum": "轻轻摇晃", "nod": "点头", "small_nod": "轻轻点头",
         "nod_double": "点头", "wave": "挥手", "user": "用户"}


def settings(config):
    avatar = config.get("avatar") if isinstance(config, dict) else None
    raw = avatar.get("brain") if isinstance(avatar, dict) else None
    raw = raw if isinstance(raw, dict) else {}
    mode = raw.get("mode")
    mode = mode if isinstance(mode, str) and mode in MODE_LIMITS else "daily"
    return {"enabled": raw.get("enabled") is True, "mode": mode,
            "daily_limit": int(number(raw.get("daily_limit"), DEFAULT_DAILY_LIMIT, 0, 96)),
            "night_actions_only": raw.get("night_actions_only", True) is not False}


class AvatarBrain:
    def __init__(self, config_loader, model, remember, *, clock=time.monotonic,
                 day=lambda: datetime.now().date().isoformat(), usage=None, context_builder=build_context):
        self.config_loader, self.model, self.remember = config_loader, model, remember
        self.clock, self.day = clock, day
        self.usage = usage if usage is not None else UsageBudget(clock=clock, day=day)
        self.context_builder = context_builder
        self.history = []
        self.lock = threading.RLock()
        self.world = None
        self.reason = "idle"
        self.updated = -float("inf")
        self.epoch = 0
        self.busy = 0
        self.inflight = False
        self.next = 0
        self.plans = OrderedDict()
        self.stop_event = threading.Event()
        self.thread = None

    @property
    def daily(self):
        return self.usage.state["daily"]

    def observe_history(self, history, config):
        if settings(config)["enabled"]:
            cleaned = recent_history(history)
            with self.lock:
                self.history = cleaned

    def delivered_turn(self, config, user, reply, *, is_auto=False):
        if is_auto or not settings(config)["enabled"]:
            return
        with self.lock:
            self.history = recent_history([*self.history, {"role": "user", "content": user},
                                           {"role": "assistant", "content": reply}])

    def _fresh(self, now):
        return bool(self.world and now - self.updated <= WORLD_TTL and self.world["scene"] != "none")

    def _blocked(self, now):
        return (not self._fresh(now) or self.busy or self.world["typing"] or self.world["speaking"])

    def update_world(self, raw):
        world = sanitize_world(raw)
        with self.lock:
            old = self.world
            if (not old or old["scene"] != world["scene"] or old["period"] != world["period"] or world["typing"] or world["speaking"]
                    or world["idle_sec"] < old["idle_sec"]):
                self.epoch += 1
                self.plans.clear()
            self.world, self.updated = world, self.clock()
            reason = "idle"
            if old and old["period"] != world["period"]:
                reason = "period_changed"
            elif old and old["idle_sec"] >= 600 and world["idle_sec"] < MIN_IDLE_SECONDS:
                reason = "user_returned"
            self.reason = reason if reason != "idle" else self.reason
            return {"ok": True, "world": deepcopy(world), "trigger": reason}

    def start(self):
        if not settings(self.config_loader())["enabled"]:
            return
        with self.lock:
            if self.thread is not None:
                return
            self.thread = threading.Thread(target=self._loop, name="avatar-brain", daemon=True)
            self.thread.start()

    def close(self):
        self.stop_event.set()

    def _loop(self):
        while not self.stop_event.wait(TICK_SECONDS):
            try:
                self.think()
            except Exception:
                LOG.info("avatar_brain_tick_failed")

    @contextmanager
    def chat_turn(self):
        with self.lock:
            self.busy += 1
            self.epoch += 1
            if self.world:
                self.world["idle_sec"] = 0
            self.plans.clear()  # A user turn invalidates undelivered autonomous proposals.
        try:
            yield
        finally:
            with self.lock:
                self.busy -= 1

    def prepare_chat(self, config):
        # Copy only runtime dictionaries; never mutate the stored/user configuration.
        config = dict(config)
        config.pop("_avatar_brain_world", None)
        config.pop("_avatar_brain_result", None)
        with self.lock:
            if settings(config)["enabled"] and self._fresh(self.clock()) and not config.get("_galgame_context"):
                llm = config.get("llm") or {}
                # Do not break an existing inline-key-only chat configuration.
                # Such a turn keeps the legacy path, without avatar augmentation.
                if llm.get("api_key") and not os.environ.get(str(llm.get("api_key_env") or "OPENAI_API_KEY")):
                    return config
                config["_avatar_brain_world"] = deepcopy(self.world)
                config["_avatar_brain_epoch"] = self.epoch
                config["llm"] = dict(config.get("llm") or {})
                config["llm"].pop("api_key", None)
        return config

    def _prune(self, now):
        for ident in list(self.plans):
            if now - self.plans[ident]["at"] > PLAN_TTL:
                del self.plans[ident]

    def _publish(self, decision, source):
        now = self.clock()
        self._prune(now)
        while len(self.plans) >= MAX_PLANS:
            self.plans.popitem(last=False)
        ident = uuid.uuid4().hex
        plan = {"id": ident, "status": "planned", "source": source, **deepcopy(decision)}
        self.plans[ident] = {"plan": plan, "at": now, "acked": set()}
        return deepcopy(plan)

    def reply_plan(self, config):
        decision = config.get("_avatar_brain_result")
        if not isinstance(decision, dict):
            return None
        with self.lock:
            if (not settings(self.config_loader())["enabled"] or not self._fresh(self.clock())
                    or config.get("_avatar_brain_epoch") != self.epoch):
                return None
            interval = MODE_LIMITS[settings(config)["mode"]][0]
            self.next = max(self.next, self.clock() + max(interval, decision["next_think_after_sec"]))
            self.usage.defer(max(interval, decision["next_think_after_sec"]))
            return self._publish(decision, "reply")

    def poll(self):
        with self.lock:
            self._prune(self.clock())
            if not settings(self.config_loader())["enabled"] or self._blocked(self.clock()):
                return {"ok": True, "plans": []}
            return {"ok": True, "plans": [deepcopy(x["plan"]) for x in self.plans.values()
                                           if x["plan"]["status"] != "completed"]}

    def think(self, reason=None):
        """Reserve budget before the call; failure counts. Model/retrieval run outside lock."""
        config = self.config_loader()
        policy = settings(config)
        with self.lock:
            now = self.clock()
            interval, hourly = MODE_LIMITS[policy["mode"]]
            if (not policy["enabled"] or self.inflight or self._blocked(now) or now < self.next
                    or self.world["idle_sec"] < MIN_IDLE_SECONDS):
                return {"ok": True, "decision": None}
            if not self.usage.reserve(interval=interval, hourly=hourly, daily=policy["daily_limit"]):
                return {"ok": True, "decision": None}
            self.inflight = True
            epoch, world = self.epoch, deepcopy(self.world)
            history = deepcopy(self.history)
            reason = reason if isinstance(reason, str) else self.reason
            self.reason = "idle"
        try:
            try:
                context = self.context_builder(config, history)
            except Exception:
                context = ""
            text = self.model(config, prompt(world, proactive=True) + context,
                              reason if reason in {"idle", "period_changed", "user_returned"} else "idle")
            decision = parse_decision(text, world, proactive=True)
            if policy["night_actions_only"] and world["period"] == "night":
                decision["say"] = ""
            with self.lock:
                current_policy = settings(self.config_loader())
                if (epoch != self.epoch or self._blocked(self.clock()) or self.stop_event.is_set()
                        or not current_policy["enabled"]):
                    return {"ok": True, "decision": None}
                if current_policy["night_actions_only"] and self.world["period"] == "night":
                    decision["say"] = ""
                self.next = self.clock() + max(interval, decision["next_think_after_sec"])
                self.usage.defer(max(interval, decision["next_think_after_sec"]))
                if not decision["say"] and not decision["actions"]:
                    return {"ok": True, "decision": None}
                return {"ok": True, "decision": self._publish(decision, "proactive")}
        except Exception:
            # Exception text can contain provider payloads and credentials.
            LOG.info("avatar_brain_model_failed")
            return {"ok": True, "decision": None}
        finally:
            with self.lock:
                self.inflight = False

    def acknowledge(self, ident, *, speech_delivered=False, action_indices=()):
        """Only explicit delivery/completion receipts may persist real experiences."""
        if not isinstance(ident, str) or len(ident) != 32:
            return {"ok": False, "error": "unknown_plan"}
        records = []
        with self.lock:
            self._prune(self.clock())
            item = self.plans.get(ident)
            if not item or not settings(self.config_loader())["enabled"]:
                return {"ok": False, "error": "unknown_plan"}
            plan, acked = item["plan"], item["acked"]
            if speech_delivered is True and plan["say"] and "speech" not in acked:
                records.append(("speech", "主动说过：" + plan["say"]))
            indices = action_indices[:8] if isinstance(action_indices, list) else []
            for index in dict.fromkeys(x for x in indices if type(x) is int):
                if 0 <= index < len(plan["actions"]) and index not in acked:
                    action = plan["actions"][index]
                    desc = {"go_to": "走到了", "activity": "进行了活动：", "gesture": "做了动作：",
                            "look_at": "看向了", "sit": "坐下了", "stand": "站起来了", "wait": "安静等待了一会儿"}[action["type"]]
                    desc += NAMES.get(action.get("target", action.get("name")), "")
                    records.append((index, "3D世界中" + desc))
            # Claim receipts before I/O, so concurrent/repeated ACKs never duplicate history.
            acked.update(key for key, _ in records)
            if all(index in acked for index in range(len(plan["actions"]))) and (not plan["say"] or "speech" in acked):
                plan["status"] = "completed"
        for _, text in records:
            try:
                self.remember(self.config_loader(), text)
            except Exception:
                LOG.info("avatar_brain_memory_failed")
        return {"ok": True, "recorded": len(records)}
