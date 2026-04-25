(() => {
  const STORAGE_KEY_BASE = "taffy-learning-api-base";
  const DEFAULT_BASE = "http://127.0.0.1:8123";

  const ui = {
    openBtn: document.getElementById("openLearningReviewDocBtn"),
    backdrop: document.getElementById("docLearningBackdrop"),
    panel: document.getElementById("docLearningPanel"),
    closeBtn: document.getElementById("docLearningCloseBtn"),
    loadingBar: document.querySelector(".doc-learning-loading"),
    controls: document.querySelector(".doc-learning-controls"),
    apiBaseInput: document.getElementById("docLearningApiBase"),
    reloadBtn: document.getElementById("docLearningReloadBtn"),
    openRuntimeBtn: document.getElementById("docLearningOpenRuntimeBtn"),
    injectCount: document.getElementById("docLearningInjectCount"),
    minSupport: document.getElementById("docLearningMinSupport"),
    applyQuickBtn: document.getElementById("docLearningApplyQuickBtn"),
    undoBtn: document.getElementById("docLearningUndoBtn"),
    tabCandidates: document.getElementById("docLearningTabCandidates"),
    tabSamples: document.getElementById("docLearningTabSamples"),
    filterScore: document.getElementById("docLearningFilterScore"),
    filterConfidence: document.getElementById("docLearningFilterConfidence"),
    filterKeyword: document.getElementById("docLearningFilterKeyword"),
    selectAll: document.getElementById("docLearningSelectAll"),
    selectedCount: document.getElementById("docLearningSelectedCount"),
    batchDeleteBtn: document.getElementById("docLearningBatchDeleteBtn"),
    batchUpBtn: document.getElementById("docLearningBatchUpBtn"),
    batchDownBtn: document.getElementById("docLearningBatchDownBtn"),
    batchPromoteBtn: document.getElementById("docLearningBatchPromoteBtn"),
    summary: document.getElementById("docLearningSummary"),
    list: document.getElementById("docLearningList"),
    toast: document.getElementById("toast")
  };

  if (!ui.openBtn || !ui.panel || !ui.backdrop || !ui.list) {
    return;
  }

  const state = {
    activeTab: "candidates",
    loading: false,
    busy: false,
    candidates: [],
    samples: [],
    selectedCandidates: new Set(),
    selectedSamples: new Set(),
    quickSettings: {
      inject_count: 0,
      promotion_min_support: 1
    }
  };

  const statusMap = {
    active: "启用",
    kept: "保留",
    promoted: "晋升"
  };

  const showToast = (text) => {
    const msg = String(text || "").trim();
    if (!msg) return;

    if (ui.toast) {
      ui.toast.textContent = msg;
      ui.toast.classList.add("show");
      window.setTimeout(() => {
        ui.toast.classList.remove("show");
      }, 1800);
      return;
    }

    window.alert(msg);
  };

  const sanitizeBase = (raw) => {
    const value = String(raw || "").trim().replace(/\/+$/, "");
    if (!value) return DEFAULT_BASE;
    return value;
  };

  const getApiBase = () => sanitizeBase(ui.apiBaseInput?.value || DEFAULT_BASE);

  const persistBase = () => {
    try {
      window.localStorage.setItem(STORAGE_KEY_BASE, getApiBase());
    } catch (_) {
      // ignore
    }
  };

  const updateRuntimeLink = () => {
    if (!ui.openRuntimeBtn) return;
    ui.openRuntimeBtn.href = `${getApiBase()}/web/index.html`;
  };

  const setPanelBusy = (busy) => {
    state.busy = !!busy;
    ui.panel.classList.toggle("is-busy", state.busy);
    if (ui.reloadBtn) ui.reloadBtn.disabled = state.busy;
    if (ui.applyQuickBtn) ui.applyQuickBtn.disabled = state.busy;
    if (ui.undoBtn) ui.undoBtn.disabled = state.busy;
    if (ui.batchDeleteBtn) ui.batchDeleteBtn.disabled = state.busy;
    if (ui.batchUpBtn) ui.batchUpBtn.disabled = state.busy;
    if (ui.batchDownBtn) ui.batchDownBtn.disabled = state.busy;
    if (ui.batchPromoteBtn) ui.batchPromoteBtn.disabled = state.busy || state.activeTab !== "candidates";
  };

  const withBusy = async (task) => {
    if (state.busy) {
      return null;
    }
    setPanelBusy(true);
    try {
      return await task();
    } finally {
      setPanelBusy(false);
      renderList();
    }
  };

  const toScore = (value) => {
    const n = Number(value);
    if (!Number.isFinite(n)) return 0;
    return Math.max(0, Math.min(1, n));
  };

  const normalizeItem = (item, fallbackId) => {
    const safe = item && typeof item === "object" ? item : {};
    return {
      id: String(safe.id || fallbackId || "").trim(),
      assistant_preview: String(safe.assistant_preview || ""),
      compressed_pattern: String(safe.compressed_pattern || ""),
      score: toScore(safe.score),
      confidence: toScore(safe.confidence),
      support_count: Math.max(0, Number(safe.support_count || 0) || 0),
      status: String(safe.status || "active").trim().toLowerCase()
    };
  };

  const getSelectedSet = () => (
    state.activeTab === "samples" ? state.selectedSamples : state.selectedCandidates
  );

  const escapeHtml = (raw) => String(raw || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

  const getStatusLabel = (status) => statusMap[status] || status || "启用";

  const getStatusClass = (status) => {
    if (status === "kept") return "is-kept";
    if (status === "promoted") return "is-promoted";
    return "is-active";
  };

  const getCurrentSource = () => (state.activeTab === "samples" ? state.samples : state.candidates);

  const getFilteredItems = () => {
    const source = getCurrentSource();
    const minScore = toScore(ui.filterScore?.value || 0);
    const minConfidence = toScore(ui.filterConfidence?.value || 0);
    const keyword = String(ui.filterKeyword?.value || "").trim().toLowerCase();

    return source.filter((item) => {
      if (item.score < minScore) return false;
      if (item.confidence < minConfidence) return false;
      if (!keyword) return true;
      return (
        item.id.toLowerCase().includes(keyword)
        || item.assistant_preview.toLowerCase().includes(keyword)
        || item.compressed_pattern.toLowerCase().includes(keyword)
      );
    });
  };

  const refreshTabs = () => {
    const isCandidates = state.activeTab === "candidates";
    ui.tabCandidates?.classList.toggle("is-active", isCandidates);
    ui.tabSamples?.classList.toggle("is-active", !isCandidates);
    if (ui.batchPromoteBtn) {
      ui.batchPromoteBtn.disabled = state.busy || !isCandidates;
    }
  };

  const refreshSelectAll = (filteredItems) => {
    const selectedSet = getSelectedSet();
    const total = filteredItems.length;
    const selectedInView = filteredItems.filter((item) => selectedSet.has(item.id)).length;

    if (ui.selectedCount) {
      ui.selectedCount.textContent = `已选 ${selectedSet.size}`;
    }

    if (ui.selectAll) {
      ui.selectAll.checked = total > 0 && selectedInView === total;
      ui.selectAll.indeterminate = selectedInView > 0 && selectedInView < total;
      ui.selectAll.disabled = state.busy;
    }
  };

  const buildActionButton = (label, action, id, className = "") => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = label;
    btn.dataset.action = action;
    btn.dataset.id = id;
    if (className) {
      btn.classList.add(className);
    }
    if (state.busy) {
      btn.disabled = true;
    }
    return btn;
  };

  const renderList = () => {
    refreshTabs();
    const filtered = getFilteredItems();
    const selectedSet = getSelectedSet();

    ui.list.innerHTML = "";

    if (ui.summary) {
      ui.summary.textContent = state.loading
        ? "加载中..."
        : `候选 ${state.candidates.length} 条 · 正式 ${state.samples.length} 条 · 当前显示 ${filtered.length} 条`;
    }

    if (!filtered.length) {
      const empty = document.createElement("div");
      empty.className = "doc-learning-empty";
      empty.textContent = state.loading
        ? "正在加载学习样本..."
        : "当前筛选条件下没有可展示条目。";
      ui.list.appendChild(empty);
      refreshSelectAll(filtered);
      return;
    }

    for (const item of filtered) {
      const card = document.createElement("article");
      card.className = "doc-learning-item";

      const head = document.createElement("div");
      head.className = "doc-learning-item-head";

      const checkLabel = document.createElement("label");
      checkLabel.className = "doc-learning-item-check";
      const check = document.createElement("input");
      check.type = "checkbox";
      check.className = "doc-learning-check";
      check.dataset.id = item.id;
      check.checked = selectedSet.has(item.id);
      check.disabled = state.busy;

      const idText = document.createElement("span");
      idText.textContent = item.id || "未命名";

      checkLabel.appendChild(check);
      checkLabel.appendChild(idText);

      const status = document.createElement("span");
      status.className = `doc-learning-item-status ${getStatusClass(item.status)}`;
      status.textContent = getStatusLabel(item.status);

      head.appendChild(checkLabel);
      head.appendChild(status);

      const lines = document.createElement("div");
      lines.className = "doc-learning-item-lines";

      const lineA = document.createElement("p");
      lineA.className = "doc-learning-item-line";
      lineA.innerHTML = `<strong>assistant_preview：</strong>${escapeHtml(item.assistant_preview || "-")}`;

      const lineB = document.createElement("p");
      lineB.className = "doc-learning-item-line";
      lineB.innerHTML = `<strong>compressed_pattern：</strong>${escapeHtml(item.compressed_pattern || "-")}`;

      lines.appendChild(lineA);
      lines.appendChild(lineB);

      const metrics = document.createElement("div");
      metrics.className = "doc-learning-item-metrics";
      metrics.innerHTML = [
        `<span>score ${item.score.toFixed(2)}</span>`,
        `<span>confidence ${item.confidence.toFixed(2)}</span>`,
        `<span>support ${Math.max(0, item.support_count)}</span>`
      ].join("");

      const actions = document.createElement("div");
      actions.className = "doc-learning-item-actions";
      actions.appendChild(buildActionButton("保留", "keep", item.id, "is-subtle"));
      actions.appendChild(buildActionButton("删除", "delete", item.id, "danger"));
      actions.appendChild(buildActionButton("升权 +0.05", "weight_up", item.id));
      actions.appendChild(buildActionButton("降权 -0.05", "weight_down", item.id));
      if (state.activeTab === "candidates") {
        actions.appendChild(buildActionButton("晋升正式池", "promote", item.id, "is-primary"));
      }

      card.appendChild(head);
      card.appendChild(lines);
      card.appendChild(metrics);
      card.appendChild(actions);
      ui.list.appendChild(card);
    }

    refreshSelectAll(filtered);
  };

  const fetchJson = async (path, options = {}) => {
    const response = await fetch(`${getApiBase()}${path}`, options);
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || (payload && payload.ok === false)) {
      const detail = String(payload?.error || payload?.message || `HTTP ${response.status}`);
      throw new Error(detail);
    }
    return payload;
  };

  const applyPayload = (payload) => {
    const hasFullList = Array.isArray(payload?.candidates) || Array.isArray(payload?.samples);

    if (hasFullList) {
      state.candidates = (Array.isArray(payload.candidates) ? payload.candidates : [])
        .map((item, idx) => normalizeItem(item, `cand_${idx}`));
      state.samples = (Array.isArray(payload.samples) ? payload.samples : [])
        .map((item, idx) => normalizeItem(item, `sample_${idx}`));
    } else if (Array.isArray(payload?.items)) {
      const mapped = payload.items.map((item, idx) => normalizeItem(item, `item_${idx}`));
      if (state.activeTab === "samples") {
        state.samples = mapped;
      } else {
        state.candidates = mapped;
      }
    }

    state.quickSettings.inject_count = Number(payload?.quick_settings?.inject_count) >= 1 ? 1 : 0;
    state.quickSettings.promotion_min_support = Number(payload?.quick_settings?.promotion_min_support) >= 2 ? 2 : 1;

    if (ui.injectCount) {
      ui.injectCount.value = String(state.quickSettings.inject_count);
    }
    if (ui.minSupport) {
      ui.minSupport.value = String(state.quickSettings.promotion_min_support);
    }

    const candidateIds = new Set(state.candidates.map((item) => item.id));
    for (const id of Array.from(state.selectedCandidates)) {
      if (!candidateIds.has(id)) {
        state.selectedCandidates.delete(id);
      }
    }

    const sampleIds = new Set(state.samples.map((item) => item.id));
    for (const id of Array.from(state.selectedSamples)) {
      if (!sampleIds.has(id)) {
        state.selectedSamples.delete(id);
      }
    }
  };

  const reloadData = async () => withBusy(async () => {
    state.loading = true;
    renderList();
    try {
      const payload = await fetchJson("/api/learning/reload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({})
      });
      applyPayload(payload);
      if (payload?.message) {
        showToast(payload.message);
      }
    } finally {
      state.loading = false;
    }
  });

  const updateEntries = async (action, extra = {}) => withBusy(async () => {
    const payload = await fetchJson("/api/learning/update", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, ...extra })
    });
    applyPayload(payload);
    if (payload?.message) {
      showToast(payload.message);
    }
    return payload;
  });

  const promoteEntries = async (candidateIds) => withBusy(async () => {
    const payload = await fetchJson("/api/learning/promote", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        candidate_ids: Array.isArray(candidateIds) ? candidateIds : []
      })
    });
    applyPayload(payload);
    if (payload?.message) {
      showToast(payload.message);
    }
    return payload;
  });

  const runSingleAction = async (action, id) => {
    const itemId = String(id || "").trim();
    if (!itemId) return;

    const pool = state.activeTab === "samples" ? "samples" : "candidates";

    if (action === "promote") {
      await promoteEntries([itemId]);
      return;
    }
    if (action === "weight_up") {
      await updateEntries("weight", { pool, ids: [itemId], delta: 0.05 });
      return;
    }
    if (action === "weight_down") {
      await updateEntries("weight", { pool, ids: [itemId], delta: -0.05 });
      return;
    }
    if (action === "delete") {
      await updateEntries("delete", { pool, ids: [itemId] });
      return;
    }
    if (action === "keep") {
      await updateEntries("keep", { pool, ids: [itemId] });
    }
  };

  const runBatchAction = async (action) => {
    const selectedSet = getSelectedSet();
    const ids = Array.from(selectedSet);
    if (!ids.length) {
      showToast("请先勾选要操作的条目");
      return;
    }

    const pool = state.activeTab === "samples" ? "samples" : "candidates";

    if (action === "promote") {
      if (pool !== "candidates") {
        showToast("只有候选池支持批量晋升");
        return;
      }
      await promoteEntries(ids);
    } else if (action === "delete") {
      await updateEntries("delete", { pool, ids });
    } else if (action === "weight_up") {
      await updateEntries("weight", { pool, ids, delta: 0.05 });
    } else if (action === "weight_down") {
      await updateEntries("weight", { pool, ids, delta: -0.05 });
    }

    selectedSet.clear();
    renderList();
  };

  const applyQuickControls = async () => {
    const inject = Number(ui.injectCount?.value || 0) >= 1 ? 1 : 0;
    const minSupport = Number(ui.minSupport?.value || 1) >= 2 ? 2 : 1;

    await updateEntries("config", {
      quick_settings: {
        inject_count: inject,
        promotion_min_support: minSupport
      }
    });
  };

  const openPanel = async () => {
    ui.backdrop.hidden = false;
    ui.panel.hidden = false;
    ui.panel.setAttribute("aria-hidden", "false");
    document.body.classList.add("doc-learning-open");
    ui.panel.focus();

    await reloadData().catch((error) => {
      showToast(`学习审核加载失败：${error.message || error}`);
    });
  };

  const closePanel = () => {
    ui.panel.hidden = true;
    ui.backdrop.hidden = true;
    ui.panel.setAttribute("aria-hidden", "true");
    document.body.classList.remove("doc-learning-open");
  };

  const bindEvents = () => {
    ui.openBtn.addEventListener("click", (event) => {
      event.preventDefault();
      openPanel();
    });

    ui.closeBtn?.addEventListener("click", closePanel);
    ui.backdrop?.addEventListener("click", closePanel);

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && !ui.panel.hidden) {
        closePanel();
      }
    });

    ui.apiBaseInput?.addEventListener("change", () => {
      ui.apiBaseInput.value = getApiBase();
      persistBase();
      updateRuntimeLink();
    });

    ui.reloadBtn?.addEventListener("click", () => {
      persistBase();
      reloadData().catch((error) => {
        showToast(`重读失败：${error.message || error}`);
      });
    });

    ui.applyQuickBtn?.addEventListener("click", () => {
      persistBase();
      applyQuickControls().catch((error) => {
        showToast(`应用失败：${error.message || error}`);
      });
    });

    ui.undoBtn?.addEventListener("click", () => {
      persistBase();
      updateEntries("undo").catch((error) => {
        showToast(`撤销失败：${error.message || error}`);
      });
    });

    ui.tabCandidates?.addEventListener("click", () => {
      state.activeTab = "candidates";
      renderList();
    });

    ui.tabSamples?.addEventListener("click", () => {
      state.activeTab = "samples";
      renderList();
    });

    [ui.filterScore, ui.filterConfidence, ui.filterKeyword].forEach((el) => {
      el?.addEventListener("input", renderList);
    });

    ui.selectAll?.addEventListener("change", () => {
      const selectedSet = getSelectedSet();
      const filtered = getFilteredItems();
      if (ui.selectAll.checked) {
        filtered.forEach((item) => selectedSet.add(item.id));
      } else {
        filtered.forEach((item) => selectedSet.delete(item.id));
      }
      renderList();
    });

    ui.batchDeleteBtn?.addEventListener("click", () => {
      runBatchAction("delete").catch((error) => showToast(error.message || error));
    });

    ui.batchUpBtn?.addEventListener("click", () => {
      runBatchAction("weight_up").catch((error) => showToast(error.message || error));
    });

    ui.batchDownBtn?.addEventListener("click", () => {
      runBatchAction("weight_down").catch((error) => showToast(error.message || error));
    });

    ui.batchPromoteBtn?.addEventListener("click", () => {
      runBatchAction("promote").catch((error) => showToast(error.message || error));
    });

    ui.list.addEventListener("change", (event) => {
      const target = event.target;
      if (!(target instanceof HTMLInputElement) || !target.classList.contains("doc-learning-check")) {
        return;
      }

      const id = String(target.dataset.id || "").trim();
      if (!id) return;

      const selectedSet = getSelectedSet();
      if (target.checked) {
        selectedSet.add(id);
      } else {
        selectedSet.delete(id);
      }

      renderList();
    });

    ui.list.addEventListener("click", (event) => {
      const target = event.target;
      if (!(target instanceof HTMLButtonElement)) {
        return;
      }

      const action = String(target.dataset.action || "").trim();
      const id = String(target.dataset.id || "").trim();
      if (!action || !id) {
        return;
      }

      runSingleAction(action, id).catch((error) => {
        showToast(`操作失败：${error.message || error}`);
      });
    });
  };

  const bootstrap = () => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY_BASE);
      if (ui.apiBaseInput) {
        ui.apiBaseInput.value = sanitizeBase(saved || DEFAULT_BASE);
      }
    } catch (_) {
      if (ui.apiBaseInput) {
        ui.apiBaseInput.value = DEFAULT_BASE;
      }
    }

    updateRuntimeLink();
    bindEvents();
    renderList();
  };

  bootstrap();
})();
