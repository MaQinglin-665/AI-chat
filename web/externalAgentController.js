(function (root) {
  "use strict";
  const terminal = new Set(["completed", "failed", "cancelled", "expired"]);
  const labels = { planning: "正在规划", awaiting_approval: "等待你的批准", executing: "正在执行", completed: "执行结束", failed: "未能完成", cancelled: "已取消", expired: "计划已过期" };
  function isDelegation(text) { return /^(?:请)?(?:帮我去做|交给馨语去做|帮我(?:把.+)?整理)/.test(String(text).trim()); }
  function speechFor(task) {
    const plan = task.plan || {};
    if (task.changes?.out_of_plan_count) return "核对时发现了计划外的文件变更，请先查看单独列出的清单；这次不能当作完全按计划完成。";
    if (task.status === "completed" && task.changes?.planned_not_observed && Object.values(task.changes.planned_not_observed).some(items => items.length)) return "执行结束了，但有些计划中的变更没有观察到，请检查结果清单。";
    if (task.verification_error) return "这次没能完整核对文件变更，请查看结果，暂时不要把它当作已核验完成。";
    if (task.status === "awaiting_approval") return `我打算新增 ${plan.files_to_create.length} 项、修改 ${plan.files_to_modify.length} 项、删除 ${plan.files_to_delete.length} 项，请查看完整计划，再决定是否批准。`;
    return { planning: "我先看看怎么做，等你批准后再动手。", executing: "收到，我开始按你批准的计划执行。", completed: "执行结束了，实际变更已经列出来，我们一起看看。", failed: `这次没能完成。${task.error?.message || "请查看错误说明。"}`, cancelled: "任务已停止，已发生的文件变更请查看核对结果。", expired: "这份计划已经过期，需要重新规划。" }[task.status];
  }
  function createNarrator({ state, speak, emotion = () => {} }) {
    const spoken = new Set();
    let pending = null, speaking = false;
    function busy() { return speaking || state.micOpen || state.recognitionActive || state.micQueueWorking || state.localAsrSending || state.isSending || state.chatInFlight || state.chatBusy || state.ttsContextSpeaking || state.streamSpeakWorking || (state.ttsAudio && !state.ttsAudio.paused) || state.ttsServerRequestScopes?.length || state.isSpeaking; }
    async function flush() {
      if (!pending || busy() || !state.speakingEnabled) return;
      const task = pending, key = `${task.id}:${task.status}`;
      if (spoken.has(key)) { pending = null; return; }
      pending = null;
      spoken.add(key); // At most once per phase, including failed playback; never replay stale speech.
      speaking = true;
      try { emotion(task.status); await speak(speechFor(task), { interrupt: false, preserveTurnPlaybackGeneration: true, source: "external_agent" }); }
      catch (_) { /* Visible task result remains available when speech is unavailable. */ }
      finally { speaking = false; }
    }
    return { update(task) { if (task) pending = task; return flush(); }, flush, busy };
  }
  function renderTask(doc, container, task) {
    container.replaceChildren();
    const add = (tag, text, cls = "") => { const el = doc.createElement(tag); el.textContent = text; el.className = cls; container.appendChild(el); return el; };
    const list = (title, items, danger = false) => {
      add("h4", title, danger ? "external-agent-danger" : "");
      const ul = add("ul", "", danger ? "external-agent-danger" : "");
      for (const value of items?.length ? items : ["无"]) { const li = doc.createElement("li"); li.textContent = value; ul.appendChild(li); }
    };
    if (!task) return;
    add("h3", labels[task.status] || task.status);
    add("p", task.workdir);
    if (task.plan) {
      add("p", task.plan.summary);
      if (task.plan.risk === "high") add("p", "高风险：请仔细核对每一项操作。", "external-agent-danger");
      if (task.plan.needs_network) add("p", "计划需要网络：当前执行环境可能拒绝联网，批准不会放宽网络限制。", "external-agent-danger");
      list("步骤", task.plan.steps);
      list("将删除的文件 / 目录", task.plan.files_to_delete, true);
      list("将修改的文件", task.plan.files_to_modify);
      list("将新增的文件 / 目录", task.plan.files_to_create);
      list("将执行的命令", task.plan.commands);
    }
    if (task.error) add("p", task.error.message, "external-agent-danger");
    if (task.verification_error) add("p", task.verification_error, "external-agent-danger");
    if (task.changes) {
      add("h3", "执行前后核对");
      for (const [key, title] of [["created", "实际新增"], ["modified", "实际修改"], ["deleted", "实际删除"]]) list(title, task.changes[key], key === "deleted");
      const missing = task.changes.planned_not_observed;
      if (missing && Object.values(missing).some(items => items.length)) {
        for (const [key, title] of [["created", "计划新增但未观察到"], ["modified", "计划修改但未观察到"], ["deleted", "计划删除但未观察到"]]) list(title, missing[key]);
      }
      if (task.changes.out_of_plan_count) {
        add("h3", "计划外变更（out_of_plan）：需要你检查", "external-agent-danger");
        for (const [key, title] of [["created", "计划外新增"], ["modified", "计划外修改"], ["deleted", "计划外删除"]]) list(title, task.changes.out_of_plan[key], true);
      }
    }
    add("p", `进度事件 ${task.progress_count || 0} · 警告 ${task.warning_count || 0}`);
  }
  function createController({ document: doc = root.document, authFetch, state, speak, emotion, interval = root.setInterval }) {
    const modal = doc.getElementById("external-agent-modal");
    if (!modal) return null;
    const el = id => doc.getElementById(`external-agent-${id}`);
    let task = null, requestBusy = false, polling = false, rendered = "";
    const narrator = createNarrator({ state, speak, emotion });
    async function api(suffix = "", body) {
      const response = await authFetch(`/api/agent/task${suffix}`, body === undefined ? {} : { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await response.json();
      if (!response.ok || !data.ok) throw new Error(data.error || "任务服务暂不可用");
      return data;
    }
    function draw() {
      const signature = JSON.stringify(task);
      if (signature !== rendered) { renderTask(doc, el("result"), task); rendered = signature; }
      el("approve").hidden = task?.status !== "awaiting_approval";
      el("cancel").hidden = !task || terminal.has(task.status);
      el("approve").disabled = requestBusy;
      el("cancel").disabled = requestBusy || !!task?.cancel_requested;
      el("create").disabled = requestBusy || !!(task && !terminal.has(task.status)) || !el("workdir").value;
      if (task) narrator.update(task);
    }
    async function run(action) {
      if (requestBusy) return;
      requestBusy = true; el("error").textContent = ""; draw();
      try { task = (await action()).task; }
      catch (error) { el("error").textContent = error.message; }
      finally { requestBusy = false; draw(); }
    }
    async function open(goal = "") {
      modal.hidden = false;
      if (goal) el("goal").value = goal;
      el("error").textContent = "";
      try {
        const data = await api();
        el("workdir").replaceChildren();
        for (const path of data.allowed_roots) { const opt = doc.createElement("option"); opt.value = path; opt.textContent = path; el("workdir").appendChild(opt); }
        task = data.tasks.find(row => !terminal.has(row.status)) || task;
      } catch (error) { el("error").textContent = error.message; }
      draw(); el("goal").focus();
    }
    el("btn").addEventListener("click", () => open());
    el("close").addEventListener("click", () => { modal.hidden = true; });
    el("create").addEventListener("click", () => run(() => api("", { goal: el("goal").value, workdir: el("workdir").value })));
    el("approve").addEventListener("click", () => task && run(() => api(`/${task.id}/approve`, {})));
    el("cancel").addEventListener("click", () => task && run(() => api(`/${task.id}/cancel`, {})));
    modal.addEventListener("keydown", event => { if (event.key === "Escape") modal.hidden = true; });
    interval(async () => {
      narrator.flush();
      if (!task || terminal.has(task.status) || polling || requestBusy) return;
      polling = true;
      try { task = (await api(`/${task.id}`)).task; draw(); }
      catch (error) { el("error").textContent = error.message; }
      finally { polling = false; }
    }, 1000);
    return { open, offerDelegation(text) { if (!isDelegation(text)) return false; open(text); return true; } };
  }
  const api = { createController, createNarrator, renderTask, isDelegation, speechFor };
  root.TaffyExternalAgent = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
