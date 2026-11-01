(function (root) {
  "use strict";
  const terminal = new Set(["completed", "failed", "cancelled", "expired"]);
  const states = {
    planning: ["正在规划", "star", "pink"],
    awaiting_approval: ["待你审批", "hourglass", "amber"],
    executing: ["运行中", "star", "pink"],
    cancel_pending: ["正在取消", "stop", "quiet"],
    completed: ["已结束", "check", "mint"],
    failed: ["未完成", "alert", "coral"],
    cancelled: ["已取消", "stop", "quiet"],
    expired: ["计划已过期", "clock", "quiet"]
  };
  const array = value => Array.isArray(value) ? value : [];
  function files(task, actual = false) {
    const data = actual ? (task.changes || {}) : (task.plan || {});
    const moves = array(actual ? data.moved : task.planned_moves);
    const rows = moves.map(item => ({ kind: "move", from: String(item.from || ""), to: String(item.to || "") }));
    for (const [kind, key] of [["create", "created"], ["modify", "modified"], ["delete", "deleted"]]) {
      const values = array(data[actual ? key : `files_to_${kind}`]);
      for (const path of values) {
        if (moves.some(move => kind === "create" ? move.to === path : kind === "delete" ? move.from === path : false)) continue;
        rows.push({ kind, from: String(path), to: "" });
      }
    }
    return rows;
  }
  function counts(rows) {
    return Object.fromEntries(["move", "create", "modify", "delete"].map(kind => [kind, rows.filter(row => row.kind === kind).length]));
  }
  // Keep chat interception and title cleanup on the same delegation grammar.
  const delegation = /^(?:请)?(?:帮我去做|交给馨语去做|帮我(?:把.+)?整理)/;
  function isDelegation(value) { return delegation.test(String(value).trim()); }
  function shortTitle(goal) {
    const original = String(goal || "").trim();
    const content = isDelegation(original) ? original.replace(/^(?:请)?(?:帮我去做|交给馨语去做|帮我把|帮我)[\s，,:：]*/, "") : original;
    const first = content.split(/[，,。；;！!？?\n]/)[0].trim();
    const title = first.length > 18 ? `${first.slice(0, 18)}…` : first;
    // The complete goal belongs in the body, including when it is already short.
    return !title || title === original ? "任务计划" : title;
  }
  function wasApproved(task) {
    // confirmation_id exists before approval and is deliberately not evidence.
    return ["executing", "completed"].includes(task.status) || !!task.changes || !!task.verification_error;
  }
  function model(task, approved = false) {
    const status = task.cancel_requested && !terminal.has(task.status) ? "cancel_pending" : task.status;
    const rows = files(task);
    const actual = files(task, true);
    const missing = Object.values(task.changes?.planned_not_observed || {}).some(value => array(value).length);
    const needsReview = !!(task.verification_error || Number(task.changes?.out_of_plan_count) > 0 || missing);
    return { status, label: states[status] || ["状态待确认", "alert", "quiet"], terminal: terminal.has(task.status),
      rows, counts: counts(rows), actual, actualCounts: counts(actual), needsReview, large: rows.length > 10,
      canApprove: status === "awaiting_approval" && !!task.plan, canCancel: states[task.status] && !terminal.has(task.status),
      approved: approved || wasApproved(task), goal: String(task.goal_summary || task.plan?.summary || "正在准备任务计划。"),
      title: shortTitle(task.goal_summary || task.plan?.summary) };
  }
  function errorMessage(error) {
    if (error.status === 401) return "身份验证未通过，操作没有成功。计划已保留，请重新连接后刷新状态。";
    if (error.status === 403) return error.code === "disabled" ? "任务功能未启用，操作没有成功。请检查现有设置。" : "权限或请求来源校验未通过，操作没有成功。请检查连接后刷新状态。";
    if (error.status === 404) return "任务当前不可用，可能已随服务重启清除。已保留当前计划，请刷新确认。";
    if (error.status === 409) return "任务状态已变化或另有活动任务，操作没有成功。请刷新状态后查看。";
    return "未能确认任务状态，计划已保留。请检查连接后刷新；创建和批准不会自动重试。";
  }
  const api = { terminal, states, files, counts, isDelegation, shortTitle, wasApproved, model, errorMessage };
  root.TaffyTaskCardModel = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
