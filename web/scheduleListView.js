(function (root) {
  "use strict";

  function getRenderableScheduleItems(items = [], helpers = {}) {
    const normalizeRepeat = typeof helpers.normalizeReminderRepeat === "function"
      ? helpers.normalizeReminderRepeat
      : (repeat) => String(repeat || "").toLowerCase() === "daily" ? "daily" : "once";
    return (Array.isArray(items) ? items : [])
      .filter((item) => item && (!item.done || normalizeRepeat(item.repeat) === "daily"))
      .sort((a, b) => (Number(a?.dueAt) || 0) - (Number(b?.dueAt) || 0));
  }

  function renderEmptyState(container, doc) {
    const empty = doc.createElement("div");
    empty.className = "schedule-empty";
    const title = doc.createElement("div");
    title.className = "schedule-empty-title";
    title.textContent = "还没有日程";
    const desc = doc.createElement("div");
    desc.className = "schedule-empty-desc";
    desc.textContent = "你可以设置某个时间点让馨语AI桌宠主动说话、提醒你，或直接执行工具任务。";
    empty.appendChild(title);
    empty.appendChild(desc);
    container.appendChild(empty);
  }

  function renderScheduleItem(container, item, helpers, doc) {
    const normalizeMode = typeof helpers.normalizeReminderMode === "function"
      ? helpers.normalizeReminderMode
      : () => "reminder";
    const normalizeRepeat = typeof helpers.normalizeReminderRepeat === "function"
      ? helpers.normalizeReminderRepeat
      : () => "once";
    const buildTypeLabel = typeof helpers.buildReminderTypeLabel === "function"
      ? helpers.buildReminderTypeLabel
      : () => "普通提醒";
    const buildDisplayTime = typeof helpers.buildReminderDisplayTime === "function"
      ? helpers.buildReminderDisplayTime
      : () => "";

    const row = doc.createElement("div");
    row.className = "schedule-item";

    const main = doc.createElement("div");
    main.className = "schedule-item-main";

    const text = doc.createElement("div");
    text.className = "schedule-item-text";
    text.textContent = String(item.text || "").trim();

    const meta = doc.createElement("div");
    meta.className = "schedule-item-meta";

    const modeTag = doc.createElement("span");
    modeTag.className = `schedule-tag ${normalizeMode(item.mode)}`;
    modeTag.textContent = buildTypeLabel(item);

    const repeatTag = doc.createElement("span");
    repeatTag.className = "schedule-tag";
    repeatTag.textContent = normalizeRepeat(item.repeat) === "daily" ? "每天重复" : "一次";

    const time = doc.createElement("div");
    time.className = "schedule-item-time";
    time.textContent = buildDisplayTime(item);

    const delBtn = doc.createElement("button");
    delBtn.type = "button";
    delBtn.className = "schedule-delete-btn";
    delBtn.textContent = "删除";
    delBtn.addEventListener("click", () => {
      if (typeof helpers.onRemove === "function") {
        helpers.onRemove(item);
      }
    });

    meta.appendChild(modeTag);
    meta.appendChild(repeatTag);
    main.appendChild(text);
    main.appendChild(meta);
    main.appendChild(time);
    if (item.retryPaused || Number(item.retryAt) > 0) {
      const retryStatus = doc.createElement("div");
      retryStatus.className = "schedule-item-time";
      retryStatus.setAttribute("role", "status");
      retryStatus.textContent = item.retryPaused
        ? (normalizeMode(item.mode) === "tool"
          ? "执行失败或中断，自动重试已暂停；重试前请检查执行结果。"
          : "自动重试已暂停，可手动重试。")
        : `已尝试 ${Number(item.retryAttempts) || 1} 次，稍后自动重试。`;
      main.appendChild(retryStatus);
    }
    row.appendChild(main);
    const actions = doc.createElement("div");
    actions.className = "schedule-item-actions";
    if ((item.retryPaused || Number(item.retryAt) > 0) && typeof helpers.onRetry === "function") {
      const retryBtn = doc.createElement("button");
      retryBtn.type = "button";
      retryBtn.className = "schedule-delete-btn";
      retryBtn.textContent = "重试";
      retryBtn.setAttribute("aria-label", `重试日程：${String(item.text || "").trim()}`);
      retryBtn.addEventListener("click", () => helpers.onRetry(item));
      actions.appendChild(retryBtn);
    }
    actions.appendChild(delBtn);
    row.appendChild(actions);
    container.appendChild(row);
  }

  function renderScheduleList(container, items = [], helpers = {}, doc = root.document) {
    if (!container || !doc) {
      return;
    }
    container.innerHTML = "";
    const visibleItems = getRenderableScheduleItems(items, helpers);
    if (!visibleItems.length) {
      renderEmptyState(container, doc);
      return;
    }
    for (const item of visibleItems) {
      renderScheduleItem(container, item, helpers, doc);
    }
  }

  const api = {
    getRenderableScheduleItems,
    renderScheduleList
  };

  root.TaffyScheduleListView = api;
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : window);
