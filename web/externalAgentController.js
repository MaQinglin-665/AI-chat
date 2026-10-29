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
    if (task.status === "awaiting_approval") return `我打算移动 ${(task.planned_moves||[]).length} 项、新增 ${plan.files_to_create.length-(task.planned_moves||[]).length} 项、修改 ${plan.files_to_modify.length} 项、删除 ${plan.files_to_delete.length-(task.planned_moves||[]).length} 项，请查看完整计划，再决定是否批准。`;
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
    return { update(task) { if (task) pending = task; return flush(); }, prime(task) { if (task) spoken.add(`${task.id}:${task.status}`); }, flush, busy };
  }
  function renderTask(doc, container, task) {
    container.replaceChildren();
    const add = (tag, text, cls = "") => { const el = doc.createElement(tag); el.textContent = text; el.className = cls; container.appendChild(el); return el; };
    const list = (title, items, danger = false) => {
      danger = danger && !!items?.length;
      add("h4", title, danger ? "external-agent-danger" : "");
      const ul = add("ul", "", danger ? "external-agent-danger" : "");
      for (const value of items?.length ? items : ["无"]) { const li = doc.createElement("li"); li.textContent = value; ul.appendChild(li); }
    };
    if (!task) return;
    const status = add("header", labels[task.status] || task.status, "external-agent-state");
    if(task.error){const error=doc.createElement("p");error.className="external-agent-danger";error.textContent=task.error.message + (task.error.detail?.message ? "："+task.error.detail.message : "");status.appendChild(error);}
    if(task.status==="failed") { const retry=doc.createElement("button");retry.type="button";retry.textContent="重新规划";retry.addEventListener("click",()=>doc.getElementById?.("external-agent-create")?.click());status.appendChild(retry); }
    add("p", task.workdir);
    if (task.plan) {
      add("p", task.plan.summary);
      if (task.plan.risk === "high") add("p", "高风险：请仔细核对每一项操作。", "external-agent-danger");
      if (task.plan.needs_network) add("p", "计划需要网络：当前执行环境可能拒绝联网，批准不会放宽网络限制。", "external-agent-danger");
      list("步骤", task.plan.steps);
      const moves=task.planned_moves || [];
      list("将移动的文件",moves.map(m=>`${m.from} → ${m.to}`));
      list("将删除的文件 / 目录", task.plan.files_to_delete.filter(p=>!moves.some(m=>m.from===p)), true);
      list("将修改的文件", task.plan.files_to_modify);
      list("将新增的文件 / 目录", task.plan.files_to_create.filter(p=>!(task.planned_moves||[]).some(m=>m.to===p)));
      const details=add("details", "");const summary=doc.createElement("summary");summary.textContent="技术细节：将执行的命令";details.appendChild(summary);
      for(const command of task.plan.commands){const pre=doc.createElement("pre");pre.textContent=command;details.appendChild(pre);}
    }

    if (task.verification_error) add("p", task.verification_error, "external-agent-danger");
    if (task.changes) {
      add("h3", "执行前后核对");
      list("观察到的移动（按文件元数据核对）",(task.changes.moved||[]).map(m=>`${m.from} → ${m.to}`));
      for (const [key, title] of [["created", "实际新增"], ["modified", "实际修改"], ["deleted", "实际删除"]]) list(title, task.changes[key].filter(p=>!(task.changes.moved||[]).some(m=>key==="deleted"?m.from===p:key==="created"?m.to===p:false)), key === "deleted");
      const missing = task.changes.planned_not_observed;
      if (missing && Object.values(missing).some(items => items.length)) {
        for (const [key, title] of [["created", "计划新增但未观察到"], ["modified", "计划修改但未观察到"], ["deleted", "计划删除但未观察到"]]) list(title, missing[key]);
      }
      if (task.changes.out_of_plan_count) {
        add("h3", "计划外变更（out_of_plan）：需要你检查", "external-agent-danger");
        for (const [key, title] of [["created", "计划外新增"], ["modified", "计划外修改"], ["deleted", "计划外删除"]]) list(title, task.changes.out_of_plan[key], true);
      }
    }
    add("p", task.status === "executing" ? "正在按批准的计划整理文件…" : task.status === "planning" ? "正在查看工作目录里的文件…" : task.status === "awaiting_approval" ? "请逐项核对计划，再决定是否批准。" : task.status === "completed" ? "执行已结束，请查看文件核对结果。" : "任务已停止，可重新规划。");
    if(task.warning_count)add("p", "执行期间有提示，请查看核对结果。");
  }
  function createController({ document: doc = root.document, authFetch, state, speak, emotion, interval = root.setInterval }) {
    const modal = doc.getElementById("external-agent-modal");
    if (!modal) return null;
    const el = id => doc.getElementById(`external-agent-${id}`);
    let task = null, requestBusy = false, polling = false, rendered = "", epoch = 0, loadingList = null;
    const tasks = new Map(), errors = new Map();
    let roots = [], formError = null;
    const taskModel = root.TaffyTaskCardModel || (typeof require === "function" && require("./taskCardModel.js"));
    const narrator = createNarrator({ state, speak, emotion });
    const subscribers = new Set();
    function snapshot() { return { tasks: [...tasks.values()].sort((a, b) => (a.created_at || 0) - (b.created_at || 0)), errors: Object.fromEntries(errors), roots: [...roots], busy: requestBusy, formError }; }
    function accept(value, silent = false) {
      if (!value || !/^[a-f0-9]{32}$/.test(value.id || "")) return;
      tasks.set(value.id, value); task = value;
      if (silent) narrator.prime(value); else narrator.update(value);
    }
    async function api(suffix = "", body) {
      const response = await authFetch(`/api/agent/task${suffix}`, body === undefined ? {} : { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      let data;
      try { data = await response.json(); } catch (_) { data = {}; }
      if (!response.ok || !data.ok) { const error = new Error("任务服务暂不可用"); error.status = response.status; error.code = data.code; throw error; }
      return data;
    }
    function report(error, id) {
      const value = { status: error.status || 0, code: error.code || "", message: taskModel.errorMessage(error) };
      if (id) errors.set(id, value); else formError = value;
      el("error").textContent = value.message;
    }
    function draw() {
      el("error").textContent = errors.get(task?.id)?.message || formError?.message || "";
      if(modal.dataset)modal.dataset.taskStatus=task?.status || "new";
      const signature = JSON.stringify(task && { ...task, progress_count: undefined, updated_at: undefined });
      if (signature !== rendered) { renderTask(doc, el("result"), task); rendered = signature; }
      el("approve").hidden = task?.status !== "awaiting_approval" || !!errors.get(task?.id);
      el("cancel").hidden = !task || terminal.has(task.status);
      el("approve").disabled = requestBusy || errors.get(task?.id)?.status === 404;
      el("approve").textContent = view && task && taskModel.model(task).large ? "查看完整清单并审批" : "批准以上完整计划并执行";
      el("cancel").disabled = requestBusy || !!task?.cancel_requested || errors.get(task?.id)?.status === 404;
      el("create").textContent = task?.status === "failed" ? "重新规划" : "生成计划（不执行）";
      el("create").disabled = requestBusy || !!(task && !terminal.has(task.status)) || !el("workdir").value;
      const value = snapshot(); view?.render(value); for (const fn of subscribers) fn(value);
    }
    async function run(action, id) {
      if (requestBusy) return;
      ++epoch; requestBusy = true; el("error").textContent = "";
      if (id) errors.delete(id); else formError = null;
      draw();
      let createdId;
      try { const data = await action(); accept(data.task); if (data.task) { errors.delete(data.task.id); if (!id) { createdId = data.task.id; view?.created(); } } }
      catch (error) { report(error, id); }
      finally { requestBusy = false; draw(); if (createdId) view?.reveal(createdId); }
    }
    async function hydrate() {
      if (requestBusy) return;
      if (loadingList) return loadingList;
      const version = epoch;
      loadingList = (async () => {
        try {
          const data = await api();
          if (version !== epoch) return;
          roots = Array.isArray(data.allowed_roots) ? data.allowed_roots : [];
          const selected = task?.id;
          for (const row of data.tasks || []) {
            // Initial recovery is silent; a known task's later phase is a real update.
            const known = tasks.get(row.id); accept(row, !known || known.status === row.status);
          }
          task = [...tasks.values()].find(row => !terminal.has(row.status)) || tasks.get(selected) || task;
          const previous = el("workdir").value;
          el("workdir").replaceChildren();
          for (const path of roots) { const opt = doc.createElement("option"); opt.value = path; opt.textContent = path; el("workdir").appendChild(opt); }
          if (roots.includes(previous)) el("workdir").value = previous;
          formError = null;
        } catch (error) { if (version === epoch) report(error); }
        finally { loadingList = null; draw(); }
      })();
      return loadingList;
    }
    async function openManager(goal = "") {
      modal.hidden = false;
      if (goal) el("goal").value = goal;
      el("error").textContent = "";
      await hydrate();
      draw(); el("goal").focus();
    }
    function create(goal, workdir) {
      if (!goal.trim() || !roots.includes(workdir) || [...tasks.values()].some(row => !terminal.has(row.status))) return;
      el("goal").value = goal; el("workdir").value = workdir;
      return run(() => api("", { goal, workdir }));
    }
    function approve(id) {
      const value = tasks.get(id);
      if (value?.status !== "awaiting_approval" || !value.plan || value.cancel_requested || errors.has(id)) return;
      return run(() => api(`/${id}/approve`, {}), id);
    }
    function cancel(id) {
      const value = tasks.get(id);
      if (!value || terminal.has(value.status) || value.cancel_requested || errors.get(id)?.status === 404) return;
      return run(() => api(`/${id}/cancel`, {}), id);
    }
    async function refresh(id) {
      if (requestBusy || polling || !tasks.has(id)) return;
      const version = epoch; polling = true;
      try {
        const value = (await api(`/${id}`)).task;
        if (version === epoch) { accept(value); errors.delete(id); draw(); }
      } catch (error) { if (version === epoch) { report(error, id); draw(); } }
      finally { polling = false; }
    }
    const view = root.TaffyTaskCardView?.createView({ document: doc, actions: { create, approve, cancel, refresh, hydrate, openManager } });
    function open(goal = "") { if (view) { modal.hidden = true; view.showComposer(goal); } else return openManager(goal); }
    el("btn").addEventListener("click", () => open());
    el("close").addEventListener("click", () => { modal.hidden = true; });
    el("create").addEventListener("click", () => create(el("goal").value, el("workdir").value));
    el("approve").addEventListener("click", () => task && (view && taskModel.model(task).large ? view.showDetails(task.id) : approve(task.id)));
    el("cancel").addEventListener("click", () => task && cancel(task.id));
    modal.addEventListener("keydown", event => { if (event.key === "Escape") modal.hidden = true; });
    interval(async () => {
      narrator.flush();
      const active = [...tasks.values()].find(row => !terminal.has(row.status));
      if (active) await refresh(active.id);
    }, 1000);
    if (view) hydrate();
    return { open, openManager, hydrate, create, approve, cancel, refresh, snapshot,
      mountCards() { view?.mount(); },
      subscribe(fn) { subscribers.add(fn); fn(snapshot()); return () => subscribers.delete(fn); },
      offerDelegation(text) { if (!isDelegation(text)) return false; open(text); return true; } };
  }
  const api = { createController, createNarrator, renderTask, isDelegation, speechFor };
  root.TaffyExternalAgent = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
