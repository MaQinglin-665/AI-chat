(function (root) {
  "use strict";

  function createInitialState() {
    return {
      activeTab: "candidates",
      debugSnapshot: null,
      candidates: [],
      samples: [],
      shortMemories: [],
      coreMemories: [],
      selectedCandidates: new Set(),
      selectedSamples: new Set(),
      selectedShort: new Set(),
      selectedCore: new Set(),
      quickSettings: {
        inject_count: 0,
        promotion_min_support: 1
      },
      sortMode: "score_desc",
      loading: false
    };
  }

  function createController(deps = {}) {
    const state = deps.learningReviewState || deps.state || createInitialState();
    const ui = deps.ui || {};
    const documentObject = deps.documentObject || root.document || {};
    const api = deps.api || root.TaffyLearningReviewApi || {};
    const model = deps.model || root.TaffyLearningReviewModel || {};
    const view = deps.view || root.TaffyLearningReviewView || {};
    const binder = deps.binder || root.TaffyLearningReviewBinder || {};
    const memoryDebugReport = deps.memoryDebugReport || root.TaffyMemoryDebugReport || {};
    const authFetch = typeof deps.authFetch === "function" ? deps.authFetch : async () => ({});
    const setStatus = typeof deps.setStatus === "function" ? deps.setStatus : () => {};
    const isHelpOpen = typeof deps.isHelpOpen === "function" ? deps.isHelpOpen : () => false;
    const closeHelpModal = typeof deps.closeHelpModal === "function" ? deps.closeHelpModal : () => {};
    const isOnboardingOpen = typeof deps.isOnboardingOpen === "function" ? deps.isOnboardingOpen : () => false;
    const closeOnboardingModal = typeof deps.closeOnboardingModal === "function" ? deps.closeOnboardingModal : () => {};
    const closeSchedulePanel = typeof deps.closeSchedulePanel === "function" ? deps.closeSchedulePanel : () => {};
    const closePersonaPanel = typeof deps.closePersonaPanel === "function" ? deps.closePersonaPanel : () => {};
    if (!Array.isArray(state.coreMemories)) {
      state.coreMemories = [];
    }
    if (!Array.isArray(state.shortMemories)) {
      state.shortMemories = [];
    }
    if (!(state.selectedShort instanceof Set)) {
      state.selectedShort = new Set();
    }
    if (!(state.selectedCore instanceof Set)) {
      state.selectedCore = new Set();
    }

    function isLearningReviewOpen() {
      return !!ui.learningReviewDrawer && !ui.learningReviewDrawer.hidden;
    }

    function getLearningSelectedSet(tab = state.activeTab) {
      if (tab === "short") {
        return state.selectedShort;
      }
      if (tab === "core") {
        return state.selectedCore;
      }
      return tab === "samples" ? state.selectedSamples : state.selectedCandidates;
    }

    function normalizeLearningReviewItem(item, fallbackId) {
      return typeof model.normalizeLearningReviewItem === "function"
        ? model.normalizeLearningReviewItem(item, fallbackId)
        : null;
    }

    function setLearningReviewLoading(loading) {
      state.loading = !!loading;
      if (ui.learningReviewSummary) {
        ui.learningReviewSummary.textContent = state.loading
          ? "记忆管理数据加载中..."
          : ui.learningReviewSummary.textContent;
      }
    }

    function syncLearningQuickSettingsUI() {
      if (ui.learningQuickInject) {
        ui.learningQuickInject.value = String(Number(state.quickSettings?.inject_count) >= 1 ? 1 : 0);
      }
      if (ui.learningQuickSupport) {
        ui.learningQuickSupport.value = String(Number(state.quickSettings?.promotion_min_support) >= 2 ? 2 : 1);
      }
    }

    function applyLearningPayload(payload) {
      if (typeof model.applyLearningPayload === "function") {
        model.applyLearningPayload(state, payload);
      }
      syncLearningQuickSettingsUI();
    }

    function applyMemoryDebugPayload(payload) {
      state.debugSnapshot = payload && typeof payload === "object" ? payload : null;
    }

    function parseLearningFilterNumber(input, fallback = 0) {
      return typeof model.parseLearningFilterNumber === "function"
        ? model.parseLearningFilterNumber(input, fallback)
        : fallback;
    }

    function parseLearningUpdatedTime(item) {
      return typeof model.parseLearningUpdatedTime === "function"
        ? model.parseLearningUpdatedTime(item)
        : 0;
    }

    function applyLearningHighScorePreset() {
      if (ui.learningFilterScore) {
        ui.learningFilterScore.value = "0.75";
      }
      if (ui.learningFilterConfidence) {
        ui.learningFilterConfidence.value = "0.50";
      }
      if (ui.learningSortMode) {
        ui.learningSortMode.value = "score_desc";
      }
      state.sortMode = "score_desc";
      renderLearningReviewList();
    }

    function resetLearningFilters() {
      if (ui.learningFilterScore) {
        ui.learningFilterScore.value = "0";
      }
      if (ui.learningFilterConfidence) {
        ui.learningFilterConfidence.value = "0";
      }
      if (ui.learningFilterKeyword) {
        ui.learningFilterKeyword.value = "";
      }
      if (ui.learningSortMode) {
        ui.learningSortMode.value = "score_desc";
      }
      state.sortMode = "score_desc";
      renderLearningReviewList();
    }

    function getLearningFilteredItems() {
      return typeof model.getLearningFilteredItems === "function"
        ? model.getLearningFilteredItems(state, {
          scoreMin: ui.learningFilterScore,
          confidenceMin: ui.learningFilterConfidence,
          keyword: ui.learningFilterKeyword?.value,
          sortMode: state.sortMode || ui.learningSortMode?.value || "score_desc"
        })
        : [];
    }

    function buildMemoryDebugReport(snapshot = state.debugSnapshot) {
      return typeof memoryDebugReport.buildReport === "function"
        ? memoryDebugReport.buildReport(snapshot)
        : "Memory/Learning Debug:";
    }

    function renderLearningDebugPanel() {
      if (!ui.learningDebugPanel) {
        return;
      }
      const isDebug = state.activeTab === "debug";
      if (typeof view.showLearningDebugPanel === "function") {
        view.showLearningDebugPanel(ui, isDebug);
      } else {
        ui.learningDebugPanel.hidden = !isDebug;
        if (ui.learningReviewList) {
          ui.learningReviewList.hidden = isDebug;
        }
      }
      if (!isDebug) {
        return;
      }
      ui.learningDebugPanel.textContent = buildMemoryDebugReport();
      if (ui.learningReviewSummary) {
        ui.learningReviewSummary.textContent = "Memory and learning chain debug snapshot";
      }
    }

    function refreshLearningSelectAllState(filteredItems) {
      if (!ui.learningSelectAll) {
        return;
      }
      const selectedSet = getLearningSelectedSet();
      const selectAllView = typeof model.buildSelectAllState === "function"
        ? model.buildSelectAllState(state.activeTab, filteredItems, selectedSet)
        : { checked: false, indeterminate: false, selectedCount: selectedSet.size, canBatch: selectedSet.size > 0, canPromote: false };
      ui.learningSelectAll.indeterminate = selectAllView.indeterminate === true;
      ui.learningSelectAll.checked = selectAllView.checked === true;
      if (ui.learningSelectedCount) {
        ui.learningSelectedCount.textContent = `已选 ${selectAllView.selectedCount}`;
      }
      if (ui.learningBatchDeleteBtn) ui.learningBatchDeleteBtn.disabled = !selectAllView.canBatch;
      if (ui.learningBatchUpBtn) ui.learningBatchUpBtn.disabled = !selectAllView.canBatch;
      if (ui.learningBatchDownBtn) ui.learningBatchDownBtn.disabled = !selectAllView.canBatch;
      if (ui.learningBatchPromoteBtn) {
        ui.learningBatchPromoteBtn.disabled = !selectAllView.canPromote;
      }
    }

    function updateLearningOverview(filteredItems = []) {
      const visibleCount = Array.isArray(filteredItems) ? filteredItems.length : 0;
      const stats = typeof model.buildLearningStats === "function"
        ? model.buildLearningStats(state, visibleCount)
        : {
          candidates: Array.isArray(state.candidates) ? state.candidates.length : 0,
          samples: Array.isArray(state.samples) ? state.samples.length : 0,
          short: Array.isArray(state.shortMemories) ? state.shortMemories.length : 0,
          core: Array.isArray(state.coreMemories) ? state.coreMemories.length : 0,
          visible: visibleCount,
          activePoolLabel: state.activeTab === "samples" ? "\u6b63\u5f0f\u6c60" : (state.activeTab === "short" ? "\u77ed\u671f\u8bb0\u5fc6" : (state.activeTab === "core" ? "\u957f\u671f\u8bb0\u5fc6" : "\u5019\u9009\u6c60"))
        };
      if (ui.learningStatCandidates) {
        ui.learningStatCandidates.textContent = String(stats.candidates);
      }
      if (ui.learningStatSamples) {
        ui.learningStatSamples.textContent = String(stats.samples);
      }
      if (ui.learningStatShort) {
        ui.learningStatShort.textContent = String(stats.short || 0);
      }
      if (ui.learningStatCore) {
        ui.learningStatCore.textContent = String(stats.core || 0);
      }
      if (ui.learningStatVisible) {
        ui.learningStatVisible.textContent = String(stats.visible);
      }
      if (ui.learningActivePoolLabel) {
        ui.learningActivePoolLabel.textContent = stats.activePoolLabel || "";
      }
    }

    function renderLearningReviewList() {
      if (!ui.learningReviewList) {
        return;
      }
      if (state.activeTab === "debug") {
        if (typeof view.renderLearningTabs === "function") {
          view.renderLearningTabs(ui, "debug");
        }
        refreshLearningSelectAllState([]);
        updateLearningOverview([]);
        renderLearningDebugPanel();
        return;
      }
      const tab = state.activeTab === "samples" ? "samples" : (state.activeTab === "short" ? "short" : (state.activeTab === "core" ? "core" : "candidates"));
      const filteredItems = getLearningFilteredItems();
      ui.learningReviewList.hidden = false;
      if (ui.learningDebugPanel) {
        ui.learningDebugPanel.hidden = true;
      }

      if (typeof view.renderLearningTabs === "function") {
        view.renderLearningTabs(ui, tab);
      }
      if (ui.learningReviewSummary) {
        ui.learningReviewSummary.textContent = typeof model.buildLearningSummaryText === "function"
          ? model.buildLearningSummaryText(state, filteredItems.length)
          : "";
      }
      updateLearningOverview(filteredItems);

      if (typeof view.renderLearningReviewItems === "function") {
        view.renderLearningReviewItems(ui.learningReviewList, filteredItems, {
          document: documentObject,
          model,
          selectedSet: getLearningSelectedSet(tab),
          tab
        });
      } else {
        ui.learningReviewList.innerHTML = "";
      }
      refreshLearningSelectAllState(filteredItems);
    }

    async function learningFetchJson(url, options = {}) {
      return typeof api.fetchJson === "function" ? api.fetchJson(authFetch, url, options) : {};
    }

    async function reloadLearningReviewData() {
      setLearningReviewLoading(true);
      try {
        const { payload, debugPayload, shortPayload, corePayload } = typeof api.reload === "function"
          ? await api.reload(learningFetchJson)
          : { payload: {}, debugPayload: {}, shortPayload: {}, corePayload: {} };
        applyLearningPayload(payload);
        applyLearningPayload(shortPayload);
        applyLearningPayload(corePayload);
        applyMemoryDebugPayload(debugPayload);
        renderLearningReviewList();
        setStatus(payload?.message || "记忆管理数据已刷新");
      } finally {
        setLearningReviewLoading(false);
      }
    }

    async function reloadMemoryDebugData() {
      const payload = typeof api.reloadMemoryDebug === "function"
        ? await api.reloadMemoryDebug(learningFetchJson)
        : {};
      applyMemoryDebugPayload(payload);
      renderLearningDebugPanel();
      return payload;
    }

    async function updateLearningEntries(action, extra = {}) {
      const payload = typeof api.updateEntries === "function"
        ? await api.updateEntries(learningFetchJson, action, extra)
        : {};
      applyLearningPayload(payload);
      renderLearningReviewList();
      if (payload?.message) {
        setStatus(payload.message);
      }
      return payload;
    }

    async function updateCoreMemoryEntries(action, extra = {}) {
      const payload = typeof api.updateCoreEntries === "function"
        ? await api.updateCoreEntries(learningFetchJson, action, extra)
        : {};
      applyLearningPayload(payload);
      renderLearningReviewList();
      if (payload?.message) {
        setStatus(payload.message);
      }
      return payload;
    }

    async function updateShortTermMemoryEntries(action, extra = {}) {
      const payload = typeof api.updateShortEntries === "function"
        ? await api.updateShortEntries(learningFetchJson, action, extra)
        : {};
      applyLearningPayload(payload);
      renderLearningReviewList();
      if (payload?.message) {
        setStatus(payload.message);
      }
      return payload;
    }

    async function promoteLearningEntries(candidateIds) {
      const payload = typeof api.promoteEntries === "function"
        ? await api.promoteEntries(learningFetchJson, candidateIds)
        : {};
      applyLearningPayload(payload);
      renderLearningReviewList();
      if (payload?.message) {
        setStatus(payload.message);
      }
      return payload;
    }

    async function undoLearningLastStep() {
      const payload = await updateLearningEntries("undo", {});
      setStatus(payload?.message || "已撤销上一步");
      return payload;
    }

    function openLearningReviewDrawer() {
      if (!ui.learningReviewDrawer || !ui.learningReviewBackdrop) {
        return;
      }
      if (isHelpOpen()) {
        closeHelpModal();
      }
      if (isOnboardingOpen()) {
        closeOnboardingModal();
      }
      if (ui.scheduleModal && !ui.scheduleModal.hidden) {
        closeSchedulePanel();
      }
      if (ui.personaModal && !ui.personaModal.hidden) {
        closePersonaPanel();
      }
      ui.learningReviewBackdrop.hidden = false;
      ui.learningReviewDrawer.hidden = false;
      documentObject.body?.classList?.add("learning-review-open");
      renderLearningReviewList();
      reloadLearningReviewData().catch((err) => {
        setStatus(`记忆管理加载失败: ${err.message || err}`);
      });
    }

    function closeLearningReviewDrawer() {
      if (!ui.learningReviewDrawer || !ui.learningReviewBackdrop) {
        return;
      }
      ui.learningReviewDrawer.hidden = true;
      ui.learningReviewBackdrop.hidden = true;
      documentObject.body?.classList?.remove("learning-review-open");
    }

    function toggleLearningReviewDrawer() {
      if (isLearningReviewOpen()) {
        closeLearningReviewDrawer();
        return;
      }
      openLearningReviewDrawer();
    }

    async function runLearningSingleAction(action, itemId, sourceElement = null) {
      const tab = state.activeTab === "samples" ? "samples" : (state.activeTab === "short" ? "short" : (state.activeTab === "core" ? "core" : "candidates"));
      const id = String(itemId || "").trim();
      if (!id) {
        return;
      }
      if (tab === "short") {
        if (action === "edit") {
          const card = sourceElement?.closest?.(".learning-item") || null;
          const textarea = card?.querySelector?.(".short-memory-edit") || null;
          await updateShortTermMemoryEntries("edit", { ids: [id], patch: { text: textarea?.value || "" } });
          return;
        }
        if (action === "weight_up") {
          await updateShortTermMemoryEntries("weight", { ids: [id], delta: 0.05 });
          return;
        }
        if (action === "weight_down") {
          await updateShortTermMemoryEntries("weight", { ids: [id], delta: -0.05 });
          return;
        }
        if (action === "delete") {
          await updateShortTermMemoryEntries("delete", { ids: [id] });
        }
        return;
      }
      if (tab === "core") {
        if (action === "pin" || action === "unpin") {
          await updateCoreMemoryEntries(action, { ids: [id] });
          return;
        }
        if (action === "edit") {
          const card = sourceElement?.closest?.(".learning-item") || null;
          const textarea = card?.querySelector?.(".core-memory-edit") || null;
          await updateCoreMemoryEntries("edit", { ids: [id], patch: { text: textarea?.value || "" } });
          return;
        }
        if (action === "weight_up") {
          await updateCoreMemoryEntries("weight", { ids: [id], delta: 0.05 });
          return;
        }
        if (action === "weight_down") {
          await updateCoreMemoryEntries("weight", { ids: [id], delta: -0.05 });
          return;
        }
        if (action === "delete") {
          await updateCoreMemoryEntries("delete", { ids: [id] });
        }
        return;
      }
      if (action === "promote") {
        await promoteLearningEntries([id]);
        return;
      }
      if (action === "weight_up") {
        await updateLearningEntries("weight", { pool: tab, ids: [id], delta: 0.05 });
        return;
      }
      if (action === "weight_down") {
        await updateLearningEntries("weight", { pool: tab, ids: [id], delta: -0.05 });
        return;
      }
      if (action === "delete") {
        await updateLearningEntries("delete", { pool: tab, ids: [id] });
        return;
      }
      if (action === "keep") {
        await updateLearningEntries("keep", { pool: tab, ids: [id] });
      }
    }

    async function runLearningBatchAction(action) {
      const tab = state.activeTab === "samples" ? "samples" : (state.activeTab === "short" ? "short" : (state.activeTab === "core" ? "core" : "candidates"));
      const selectedSet = getLearningSelectedSet(tab);
      const visibleIds = new Set(getLearningFilteredItems().map((item) => String(item?.id || "").trim()).filter(Boolean));
      const ids = Array.from(selectedSet).filter((id) => visibleIds.has(String(id || "").trim()));
      if (!ids.length) {
        setStatus("请先勾选当前筛选结果中的条目");
        return;
      }
      if (action === "promote") {
        if (tab !== "candidates") {
          setStatus("只有候选池支持晋升");
          return;
        }
        await promoteLearningEntries(ids);
      } else if (tab === "short" && action === "delete") {
        await updateShortTermMemoryEntries("delete", { ids });
      } else if (tab === "short" && action === "weight_up") {
        await updateShortTermMemoryEntries("weight", { ids, delta: 0.05 });
      } else if (tab === "short" && action === "weight_down") {
        await updateShortTermMemoryEntries("weight", { ids, delta: -0.05 });
      } else if (tab === "core" && action === "delete") {
        await updateCoreMemoryEntries("delete", { ids });
      } else if (tab === "core" && action === "weight_up") {
        await updateCoreMemoryEntries("weight", { ids, delta: 0.05 });
      } else if (tab === "core" && action === "weight_down") {
        await updateCoreMemoryEntries("weight", { ids, delta: -0.05 });
      } else if (action === "delete") {
        await updateLearningEntries("delete", { pool: tab, ids });
      } else if (action === "weight_up") {
        await updateLearningEntries("weight", { pool: tab, ids, delta: 0.05 });
      } else if (action === "weight_down") {
        await updateLearningEntries("weight", { pool: tab, ids, delta: -0.05 });
      }
      ids.forEach((id) => selectedSet.delete(id));
      renderLearningReviewList();
    }

    async function applyLearningQuickSettings() {
      const injectCount = Number(ui.learningQuickInject?.value || 0) >= 1 ? 1 : 0;
      const minSupport = Number(ui.learningQuickSupport?.value || 1) >= 2 ? 2 : 1;
      const payload = typeof api.buildQuickSettingsPayload === "function"
        ? api.buildQuickSettingsPayload(injectCount, minSupport)
        : { quick_settings: { inject_count: injectCount, promotion_min_support: minSupport } };
      await updateLearningEntries("config", payload);
    }

    function bindLearningReviewControls() {
      if (typeof binder.bindLearningReviewControls !== "function") {
        return;
      }
      binder.bindLearningReviewControls(ui, {
        state,
        toggleDrawer: toggleLearningReviewDrawer,
        closeDrawer: closeLearningReviewDrawer,
        undoLastStep: undoLearningLastStep,
        reload: reloadLearningReviewData,
        reloadMemoryDebug: reloadMemoryDebugData,
        applyQuickSettings: applyLearningQuickSettings,
        applyHighScorePreset: applyLearningHighScorePreset,
        resetFilters: resetLearningFilters,
        getSelectedSet: getLearningSelectedSet,
        getFilteredItems: getLearningFilteredItems,
        runBatchAction: runLearningBatchAction,
        runSingleAction: runLearningSingleAction,
        render: renderLearningReviewList,
        onError: setStatus
      });
    }

    return {
      isLearningReviewOpen,
      getLearningSelectedSet,
      normalizeLearningReviewItem,
      setLearningReviewLoading,
      syncLearningQuickSettingsUI,
      applyLearningPayload,
      applyMemoryDebugPayload,
      parseLearningFilterNumber,
      parseLearningUpdatedTime,
      applyLearningHighScorePreset,
      resetLearningFilters,
      getLearningFilteredItems,
      buildMemoryDebugReport,
      renderLearningDebugPanel,
      refreshLearningSelectAllState,
      updateLearningOverview,
      renderLearningReviewList,
      learningFetchJson,
      reloadLearningReviewData,
      reloadMemoryDebugData,
      updateLearningEntries,
      updateShortTermMemoryEntries,
      updateCoreMemoryEntries,
      promoteLearningEntries,
      undoLearningLastStep,
      openLearningReviewDrawer,
      closeLearningReviewDrawer,
      toggleLearningReviewDrawer,
      runLearningSingleAction,
      runLearningBatchAction,
      applyLearningQuickSettings,
      bindLearningReviewControls
    };
  }

  const api = {
    createInitialState,
    createController
  };

  root.TaffyLearningReviewController = api;
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof window !== "undefined" ? window : globalThis);
