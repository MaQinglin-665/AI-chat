(function (root) {
  "use strict";

  function getNow(options = {}) {
    return typeof options.now === "function" ? Number(options.now()) : Date.now();
  }

  function parseReminderWhen(rawWhen, options = {}) {
    const src = String(rawWhen || "").trim().toLowerCase();
    if (!src) {
      return 0;
    }
    const now = getNow(options);
    const rel = src.match(/^(\d{1,4})\s*(s|sec|secs|second|seconds|秒|m|min|mins|minute|minutes|分|分钟|h|hr|hrs|hour|hours|时|小时)$/i);
    if (rel) {
      const amount = Math.max(1, Number(rel[1]) || 0);
      const unit = String(rel[2] || "").toLowerCase();
      if (["s", "sec", "secs", "second", "seconds", "秒"].includes(unit)) {
        return now + amount * 1000;
      }
      if (["m", "min", "mins", "minute", "minutes", "分", "分钟"].includes(unit)) {
        return now + amount * 60000;
      }
      return now + amount * 3600000;
    }
    const hm = src.match(/^(\d{1,2}):(\d{2})$/);
    if (hm) {
      const hh = Math.max(0, Math.min(23, Number(hm[1]) || 0));
      const mm = Math.max(0, Math.min(59, Number(hm[2]) || 0));
      const dt = new Date(now);
      dt.setHours(hh, mm, 0, 0);
      if (dt.getTime() <= now) {
        dt.setDate(dt.getDate() + 1);
      }
      return dt.getTime();
    }
    const full = src.match(/^(\d{4})-(\d{2})-(\d{2})\s+(\d{1,2}):(\d{2})$/);
    if (full) {
      const y = Number(full[1]) || 0;
      const mo = Math.max(1, Math.min(12, Number(full[2]) || 1)) - 1;
      const d = Math.max(1, Math.min(31, Number(full[3]) || 1));
      const hh = Math.max(0, Math.min(23, Number(full[4]) || 0));
      const mm = Math.max(0, Math.min(59, Number(full[5]) || 0));
      return new Date(y, mo, d, hh, mm, 0, 0).getTime();
    }
    return 0;
  }

  function formatReminderTime(ts, options = {}) {
    const d = new Date(Number(ts) || getNow(options));
    const pad = (n) => String(n).padStart(2, "0");
    return `${d.getMonth() + 1}-${d.getDate()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  function normalizeReminderMode(mode) {
    const safe = String(mode || "").toLowerCase();
    if (safe === "assistant") {
      return "assistant";
    }
    if (safe === "tool") {
      return "tool";
    }
    return "reminder";
  }

  function normalizeReminderRepeat(repeat) {
    return String(repeat || "").toLowerCase() === "daily" ? "daily" : "once";
  }

  function normalizeDailyReminderDueAt(dueAt, now = Date.now()) {
    const ts = Number(dueAt) || 0;
    if (!ts) {
      return 0;
    }
    if (ts > now) {
      return ts;
    }
    const src = new Date(ts);
    const today = new Date(now);
    today.setHours(src.getHours(), src.getMinutes(), 0, 0);
    return today.getTime();
  }

  function shiftReminderToNextDay(dueAt, options = {}) {
    const next = new Date(Number(dueAt) || getNow(options));
    next.setDate(next.getDate() + 1);
    return next.getTime();
  }

  function buildReminderDisplayTime(item, options = {}) {
    const repeat = normalizeReminderRepeat(item?.repeat);
    const d = new Date(Number(item?.dueAt) || getNow(options));
    const hh = String(d.getHours()).padStart(2, "0");
    const mm = String(d.getMinutes()).padStart(2, "0");
    return repeat === "daily" ? `每天 ${hh}:${mm}` : `单次 · ${formatReminderTime(item?.dueAt, options)}`;
  }

  function buildReminderTypeLabel(item) {
    const mode = normalizeReminderMode(item?.mode);
    if (mode === "assistant") {
      return "AI执行";
    }
    if (mode === "tool") {
      return "工具任务";
    }
    return "普通提醒";
  }

  const api = {
    parseReminderWhen,
    formatReminderTime,
    normalizeReminderMode,
    normalizeReminderRepeat,
    normalizeDailyReminderDueAt,
    shiftReminderToNextDay,
    buildReminderDisplayTime,
    buildReminderTypeLabel
  };

  root.TaffyReminderUtils = api;
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : window);
