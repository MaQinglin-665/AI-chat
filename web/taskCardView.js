(function (root) {
  "use strict";
  const M = root.TaffyTaskCardModel || (typeof require === "function" && require("./taskCardModel.js"));
  const art = root.TaffyTaskMascot || (typeof require === "function" && require("./taskCardMascot.js"));
  function createView({ document: doc = root.document, actions, ResizeObserverClass = root.ResizeObserver, IntersectionObserverClass = root.IntersectionObserver }) {
    const cards = new Map();
    const motionPreference = root.matchMedia?.("(prefers-reduced-motion: reduce)");
    let snapshot = { tasks: [], errors: {}, busy: false, roots: [] }, composer, composerError, composerHint, goal, workdir, generate, panel, panelBody, panelId, returnFocus;
    const make = (tag, cls, text, parent) => {
      const el = doc.createElement(tag); el.className = cls || "";
      if (text !== undefined) el.textContent = text;
      if (parent) parent.appendChild(el);
      return el;
    };
    const text = (el, value) => { if (el.textContent !== value) el.textContent = value; };
    const button = (text, fn, parent, primary = false) => {
      const b = make("button", `task-button${primary ? " task-primary" : ""}`, text, parent);
      b.type = "button"; b.addEventListener("click", fn); return b;
    };
    function lane() {
      return doc.body.classList.contains("view-full") ? doc.getElementById("assistant-chat-log") || doc.getElementById("chat-log") : doc.getElementById("chat-log");
    }
    function keepScroll(fn) {
      const target = lane(); if (!target) return;
      const atEnd = target.scrollHeight - target.clientHeight - target.scrollTop < 80;
      const previous = target.scrollTop; fn(target);
      target.scrollTop = atEnd ? target.scrollHeight : previous;
    }
    function insertAtTime(el, task) {
      keepScroll(target => {
        const time = Number(task.created_at || 0) * 1000;
        const next = [...target.children].find(row => Number(row.dataset?.timestamp || 0) > time);
        target.insertBefore(el, next || null);
      });
    }
    function syncMotion(card) {
      const reduced = motionPreference?.matches;
      card.el.dataset.animate = card.visible && !doc.hidden && !reduced && !card.model?.terminal ? "true" : "false";
    }
    const intersection = IntersectionObserverClass && new IntersectionObserverClass(entries => {
      for (const entry of entries) { const card = cards.get(entry.target.dataset.taskId); if (card) { card.visible = entry.isIntersecting; syncMotion(card); } }
    });
    function sizeCard(card, width) {
      const narrow = width < 480;
      if (card.narrow !== narrow) { card.narrow = narrow; update(card, true); }
    }
    const resize = ResizeObserverClass && new ResizeObserverClass(entries => {
      for (const entry of entries) { const card = cards.get(entry.target.dataset.taskId); if (card) sizeCard(card, entry.borderBoxSize?.[0]?.inlineSize || entry.target.getBoundingClientRect().width); }
    });
    function stats(parent, values) {
      parent.replaceChildren();
      for (const [kind, title] of [["move", "移动"], ["create", "新增"], ["modify", "修改"], ["delete", "删除"]]) {
        const value = values[kind]; const chip = make("span", `task-count${value === 0 ? " is-zero" : ""}${kind === "delete" && value > 0 ? " is-danger" : ""}`, undefined, parent);
        chip.dataset.kind = kind; chip.appendChild(art.icon(doc, kind)); make("span", "", title, chip); make("strong", "", String(value), chip);
      }
    }
    function fileList(parent, rows) {
      parent.replaceChildren();
      for (const row of rows) {
        const li = make("li", `task-file task-file-${row.kind}`, undefined, parent);
        li.appendChild(art.icon(doc, "file")); make("code", "task-path", row.from, li);
        if (row.to) { make("span", "task-file-arrow", "╌╌→", li).setAttribute("aria-label", "移动到"); li.appendChild(art.icon(doc, "folder")); make("code", "task-path", row.to, li); }
        else make("span", "task-file-kind", { create: "新增", modify: "修改", delete: "删除" }[row.kind], li);
      }
      if (!rows.length) make("li", "task-file-empty", "没有文件清单项", parent);
    }
    function warnings(parent, task, model) {
      parent.replaceChildren();
      const warn = text => make("p", "task-warning", text, parent);
      if (model.counts.delete > 0) warn(`将删除 ${model.counts.delete} 项，删除后无法从这里恢复。`);
      if (task.plan?.risk === "high") warn("高风险：请仔细核对完整计划中的每一项操作。");
      if (task.plan?.needs_network) warn("计划需要联网。批准不会放宽当前网络限制。");
      // approval_warnings is an object in the existing API, not an array of prose.
      // The plan-derived delete/risk/network strips above cover those public flags.
      if (task.error) warn(String(task.error.message || task.error) + (task.error.detail?.message ? `：${task.error.detail.message}` : ""));
      if (task.verification_error) warn(String(task.verification_error));
      if (model.needsReview) warn("执行结果需要核对，不能视为完全按计划完成。请展开查看计划外变更和未观察到项。");
      if (task.warning_count) warn(`执行期间有 ${Number(task.warning_count)} 条提示，请查看核对详情。`);
    }
    function plan(parent, task, model, full) {
      parent.replaceChildren();
      if (!task.plan) { make("p", "task-muted", "完整计划尚不可用。", parent); return; }
      const steps = make("section", "task-plan-steps", undefined, parent);
      make("h4", "", "完整计划", steps);
      const ol = make("ol", "", undefined, steps);
      for (const value of task.plan.steps || []) make("li", "", value, ol);
      make("h4", "", "文件清单", parent);
      fileList(make("ul", "task-files", undefined, parent), full ? model.rows : model.large ? model.rows.slice(0, 5) : model.rows);
      if (!full && model.large) make("p", "task-muted", `还有 ${model.rows.length - 5} 项，在详情中查看完整清单`, parent);
      make("p", "task-risk", `风险：${{ low: "低", medium: "中", high: "高" }[task.plan.risk] || "未提供"} · ${task.plan.needs_network ? "需要联网" : "不需要联网"}`, parent);
      const details = make("details", "task-commands", undefined, parent);
      make("summary", "", "技术细节：将执行的命令", details);
      for (const value of task.plan.commands || []) make("pre", "", value, details);
    }
    function result(parent, task) {
      parent.replaceChildren();
      if (!task.changes) { make("p", "task-muted", "暂未取得文件核对结果。", parent); return; }
      fileList(make("ul", "task-files", undefined, parent), M.files(task, true));
      for (const [key, title] of [["out_of_plan", "计划外变更"], ["planned_not_observed", "计划中未观察到的变更"]]) {
        const group = task.changes[key] || {};
        if (Object.values(group).some(values => Array.isArray(values) && values.length)) {
          make("h4", "task-danger-text", title, parent);
          for (const [kind, values] of Object.entries(group)) for (const value of Array.isArray(values) ? values : []) make("p", "task-warning", `${{ created: "新增", modified: "修改", deleted: "删除" }[kind] || kind}：${value}`, parent);
        }
      }
      for (const value of task.warnings || []) make("p", "task-warning", typeof value === "string" ? value : value.message || "执行期间有提示，请核对。", parent);
    }
    function createCard(task) {
      const el = make("article", "task-card"); el.dataset.taskId = task.id; el.dataset.timestamp = String(Number(task.created_at || 0) * 1000);
      const top = make("div", "task-top", undefined, el); make("span", "task-ribbon", "✦ 馨语的任务", top); const time = make("time", "task-time", "", top);
      const peek = make("div", "task-peek", undefined, el);
      const head = make("div", "task-heading", undefined, el); const title = make("h3", "", "", head); const badge = make("span", "task-status", undefined, head);
      title.tabIndex = -1;
      badge.setAttribute("aria-live", "polite");
      const summary = make("p", "task-goal", "", el);
      const dir = make("p", "task-directory", undefined, el); dir.appendChild(art.icon(doc, "folder")); make("span", "", "工作目录", dir); const path = make("code", "task-path", "", dir);
      const warn = make("div", "task-warnings", undefined, el);
      const error = make("div", "task-error", undefined, el); error.setAttribute("role", "alert");
      const illustration = make("div", "task-illustration", undefined, el);
      const progress = make("p", "task-progress", "", el); progress.setAttribute("aria-live", "off");
      const count = make("div", "task-counts", undefined, el);
      const body = make("div", "task-plan", undefined, el);
      const disclosure = make("details", "task-result", undefined, el); make("summary", "", "展开查看错误与执行详情", disclosure); const resultBody = make("div", "", undefined, disclosure);
      const footer = make("div", "task-actions", undefined, el);
      const approve = button("✦ 批准完整计划并执行", () => actions.approve(task.id), footer, true);
      const details = button("✦ 查看完整计划", () => showDetails(task.id), footer, true);
      const cancel = button("取消任务", () => actions.cancel(task.id), footer);
      const retry = button("重新规划", () => showComposer(task.goal_summary || "", task.workdir), footer);
      const refresh = button("刷新状态", () => actions.refresh(task.id), footer);
      const note = make("p", "task-note", "", el);
      const stamp = make("span", "task-stamp", "完成", el); stamp.setAttribute("aria-hidden", "true");
      const card = { el, top, time, peek, title, badge, summary, path, warn, error, illustration, progress, count, body, disclosure, resultBody, footer, approve, details, cancel, retry, refresh, note, stamp, visible: !intersection, narrow: true };
      cards.set(task.id, card); intersection?.observe(el); resize?.observe(el); return card;
    }
    function update(card, force = false) {
      const task = snapshot.tasks.find(item => item.id === card.el.dataset.taskId); if (!task) return;
      const model = M.model(task), error = snapshot.errors[task.id]; card.model = model;
      const signature = JSON.stringify([task, error, card.narrow]);
      if (force || signature !== card.signature) {
        card.signature = signature; const previousStatus = card.el.dataset.status;
        card.el.dataset.status = model.status; card.el.dataset.narrow = String(card.narrow);
        card.el.setAttribute("aria-label", `${model.title}，${model.label[0]}`);
        text(card.title, model.title);
        text(card.time, Number(task.created_at) ? new Date(task.created_at * 1000).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" }) : "");
        text(card.summary, task.plan?.summary || task.goal_summary || "正在准备任务计划。"); text(card.path, task.workdir || "未提供");
        if (previousStatus !== model.status) { card.badge.replaceChildren(art.icon(doc, model.label[1]), doc.createTextNode(model.label[0])); }
        card.badge.dataset.tone = model.label[2];
        const artSignature = `${model.status}:${!!error}:${model.counts.delete > 0}`;
        if (card.artSignature !== artSignature) {
          card.artSignature = artSignature; card.peek.replaceChildren(); card.illustration.replaceChildren();
          const drawing = art.create(doc, error ? "auth_error" : model.status, model.counts.delete > 0);
          if (model.status === "awaiting_approval" && !error) card.peek.appendChild(drawing);
          else {
            if (model.status === "executing" && !error) make("div", "task-running-track", undefined, card.illustration);
            card.illustration.appendChild(drawing);
          }
        }
        card.illustration.hidden = model.status === "awaiting_approval" && !error;
        const warningSignature = JSON.stringify([task.plan, task.error, task.verification_error, task.warning_count, model.needsReview]);
        if (card.warningSignature !== warningSignature) { card.warningSignature = warningSignature; warnings(card.warn, task, model); }
        card.error.hidden = !error; text(card.error, error?.message || "");
        card.progress.textContent = model.status === "executing" ? `正在执行你批准的计划～ 已收到 ${Number(task.progress_count) || 0} 条进度更新` : model.status === "cancel_pending" ? "已提交取消请求，正在等待执行进程停止。取消不会撤销已经发生的文件变更。" : model.status === "completed" ? (model.needsReview ? "执行已结束，文件核对有异常，请查看详情。" : task.changes ? "执行已结束，文件变化已核对。" : "执行已结束，暂未取得核对结果。") : model.status === "failed" ? "这次没有完成任务。" : model.status === "expired" ? "这份计划已过期，不能再批准。请重新生成计划。" : model.status === "cancelled" ? "任务已停止。取消不会撤销已经发生的文件变更。" : model.status === "planning" ? "正在生成计划，等待你审批后才执行。" : "计划已生成，等你决定。";
        const countValues = model.terminal && task.changes ? model.actualCounts : model.counts;
        const countSignature = JSON.stringify(countValues);
        if (card.countSignature !== countSignature) { card.countSignature = countSignature; stats(card.count, countValues); }
        const planSignature = JSON.stringify([task.plan, task.planned_moves, model.large]);
        if (card.planSignature !== planSignature) { card.planSignature = planSignature; plan(card.body, task, model, false); }
        card.body.hidden = !task.plan || (card.narrow && !model.large) || model.terminal || ["executing", "cancel_pending"].includes(model.status);
        card.body.classList.toggle("task-plan-large", model.large);
        card.count.setAttribute("aria-label", model.terminal && task.changes ? "已发生的文件变更（元数据核对）" : "计划文件变更");
        card.disclosure.hidden = !model.terminal;
        const resultSignature = JSON.stringify([task.changes, task.warnings]);
        if (resultSignature !== card.resultSignature) { card.resultSignature = resultSignature; result(card.resultBody, task); }
        card.approve.hidden = !model.canApprove || card.narrow || model.large || !!error;
        if (card.approve.hidden) card.approve.remove();
        else if (!card.approve.parentNode) card.footer.insertBefore(card.approve, card.details);
        card.details.hidden = !task.plan || model.status === "cancel_pending";
        card.details.textContent = model.large && model.canApprove ? "✦ 查看完整清单并审批" : model.status === "executing" || model.terminal ? "✦ 查看已批准的计划" : "✦ 查看完整计划";
        if (model.status === "awaiting_approval" && !card.narrow && !model.large && !error) card.details.hidden = true;
        card.cancel.hidden = !model.canCancel; card.cancel.textContent = model.status === "cancel_pending" ? "正在取消…" : "取消任务";
        card.retry.hidden = !model.terminal;
        card.refresh.hidden = !error;
        card.note.textContent = model.canApprove ? "本次批准仅适用于此完整计划。你可以继续聊天，任务会在这张卡片里更新～" : !M.states[task.status] ? "任务状态尚未识别，当前仅供查看，请刷新确认。" : "";
        card.stamp.hidden = model.status !== "completed" || model.needsReview;
      }
      for (const b of [card.approve, card.cancel, card.retry, card.refresh]) b.disabled = snapshot.busy || !!(b === card.cancel && task.cancel_requested) || !!(error && b !== card.refresh && error.status === 404);
      syncMotion(card);
    }
    function showDetails(id) {
      if (!panel) {
        panel = make("section", "task-detail-panel", undefined, doc.body); panel.setAttribute("role", "dialog"); panel.setAttribute("aria-modal", "true"); panel.setAttribute("aria-label", "审批详情");
        const top = make("header", "task-detail-top", undefined, panel);
        button("← 返回聊天", closeDetails, top); make("h2", "", "审批详情", top);
        panelBody = make("div", "task-detail-body", undefined, panel);
        panel.addEventListener("keydown", event => {
          if (event.key === "Escape") { event.preventDefault(); closeDetails(); }
          if (event.key === "Tab") {
            const all = [...panel.querySelectorAll("button, summary, [tabindex]")].filter(el => !el.disabled && el.getClientRects().length);
            const first = all[0], last = all.at(-1);
            if (event.shiftKey && doc.activeElement === first) { event.preventDefault(); last?.focus(); }
            else if (!event.shiftKey && doc.activeElement === last) { event.preventDefault(); first?.focus(); }
          }
        });
      }
      returnFocus = doc.activeElement; panelId = id; panel.hidden = false; drawPanel(true); panel.querySelector("button").focus();
    }
    function closeDetails() { if (panel) panel.hidden = true; panelId = null; returnFocus?.focus?.(); }
    function drawPanel(force = false) {
      if (!panelId) return;
      const task = snapshot.tasks.find(item => item.id === panelId); if (!task) return;
      const model = M.model(task), error = snapshot.errors[task.id];
      const signature = JSON.stringify([task.plan, task.planned_moves, task.status, task.cancel_requested, task.changes, error]);
      if (force || panel.dataset.signature !== signature) {
        const focused = doc.activeElement, wasInside = panel.contains(focused), focusedText = focused?.textContent;
        const scroll = panelBody.scrollTop;
        const openCommands = panelBody.querySelector(".task-commands")?.open;
        panel.dataset.signature = signature; panelBody.replaceChildren();
        make("h3", "", model.title, panelBody);
        make("p", "", task.goal_summary || task.plan?.summary || "", panelBody);
        make("code", "task-path", task.workdir, panelBody);
        make("p", "task-muted", "仅批准此工作目录中的完整计划。", panelBody);
        warnings(make("div", "", undefined, panelBody), task, model);
        if (error) make("p", "task-error", error.message, panelBody).setAttribute("role", "alert");
        stats(make("div", "task-counts", undefined, panelBody), model.counts);
        plan(make("div", "", undefined, panelBody), task, model, true);
        if (model.terminal) result(make("div", "", undefined, panelBody), task);
        let foot = panel.querySelector(".task-detail-actions");
        if (!foot) foot = make("footer", "task-detail-actions", undefined, panel);
        foot.replaceChildren();
        if (model.canApprove && !error) button("✦ 批准完整计划并执行", () => actions.approve(task.id), foot, true).dataset.action = "approve";
        if (model.canCancel) button(model.status === "cancel_pending" ? "正在取消…" : "取消任务", () => actions.cancel(task.id), foot).dataset.action = "cancel";
        if (error) button("刷新状态", () => actions.refresh(task.id), foot);
        make("p", "task-note", model.canApprove ? "本次批准仅适用于此完整计划。" : model.label[0], foot);
        if (openCommands) panelBody.querySelector(".task-commands").open = true;
        panelBody.scrollTop = scroll;
        if (wasInside && !focused.isConnected) ([...panel.querySelectorAll("button")].find(b => b.textContent === focusedText) || panel.querySelector("button"))?.focus();
      }
      for (const b of panel.querySelectorAll(".task-detail-actions button")) b.disabled = snapshot.busy || (b.dataset.action === "cancel" && !!task.cancel_requested) || (error?.status === 404 && !!b.dataset.action);
    }
    function showComposer(value = "", directory = "") {
      if (!composer) {
        composer = make("section", "task-composer"); composer.setAttribute("aria-label", "生成任务计划");
        make("h3", "", "交给馨语去做", composer);
        const label = make("label", "", "要做什么", composer); goal = make("textarea", "", undefined, label); goal.maxLength = 8000;
        const directoryLabel = make("label", "", "已授权工作目录", composer); workdir = make("select", "", undefined, directoryLabel);
        composerError = make("p", "task-error", "", composer); composerError.setAttribute("role", "alert");
        composerHint = make("p", "task-muted", "", composer);
        const controls = make("div", "task-actions", undefined, composer);
        generate = button("✦ 生成计划（不执行）", () => actions.create(goal.value, workdir.value), controls, true);
        button("刷新目录", () => actions.hydrate(), controls);
        button("收起", () => { composer.hidden = true; }, controls);
        button("任务管理", () => actions.openManager(goal.value), controls);
        workdir.addEventListener("change", () => drawComposer());
      }
      if (value) goal.value = value;
      composer.hidden = false; mount(); drawComposer(); if (directory) workdir.value = directory; goal.focus(); actions.hydrate();
    }
    function drawComposer() {
      if (!composer) return;
      if (JSON.stringify(snapshot.roots) !== workdir.dataset.roots) {
        const previous = workdir.value; workdir.replaceChildren();
        for (const path of snapshot.roots) { const option = make("option", "", path, workdir); option.value = path; }
        if (snapshot.roots.includes(previous)) workdir.value = previous;
        workdir.dataset.roots = JSON.stringify(snapshot.roots);
      }
      generate.disabled = snapshot.busy || !workdir.value || snapshot.tasks.some(task => !M.terminal.has(task.status));
      generate.textContent = snapshot.busy ? "正在提交…" : "✦ 生成计划（不执行）";
      composerHint.textContent = snapshot.tasks.some(task => !M.terminal.has(task.status)) ? "已有任务正在规划、等待审批或执行。请先完成或取消当前任务。" : "只生成计划，阅读后再决定是否批准。";
      composerError.textContent = snapshot.formError?.message || (!snapshot.roots.length ? "没有可用的已授权目录，请检查现有任务设置后刷新目录。" : "");
      composerError.hidden = !composerError.textContent;
    }
    function mount() {
      for (const task of snapshot.tasks) {
        const card = cards.get(task.id) || createCard(task);
        if (!card.el.isConnected || card.el.parentNode !== lane()) insertAtTime(card.el, task);
        update(card);
        if (!resize) sizeCard(card, card.el.getBoundingClientRect().width);
      }
      if (composer && !composer.hidden && !composer.isConnected) keepScroll(target => target.appendChild(composer));
    }
    const motion = () => { for (const card of cards.values()) syncMotion(card); };
    doc.addEventListener("visibilitychange", motion);
    motionPreference?.addEventListener?.("change", motion);
    return { render(value) { snapshot = value; keepScroll(() => { mount(); drawComposer(); drawPanel(); }); }, showComposer, showDetails, mount,
      created() { if (composer) composer.hidden = true; },
      reveal(id) { const card = cards.get(id), target = lane(); if (card && target) { target.scrollTop += card.el.getBoundingClientRect().top - target.getBoundingClientRect().top - 80; card.title.focus({ preventScroll: true }); } },
      dispose() { intersection?.disconnect(); resize?.disconnect(); doc.removeEventListener("visibilitychange", motion); motionPreference?.removeEventListener?.("change", motion); for (const card of cards.values()) card.el.remove(); composer?.remove(); panel?.remove(); } };
  }
  const api = { createView };
  root.TaffyTaskCardView = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
