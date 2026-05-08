(function (root) {
  "use strict";

  function createInitialState() {
    return {
      activeTab: "candidates",
      debugSnapshot: null,
      candidates: [],
      samples: [],
      selectedCandidates: new Set(),
      selectedSamples: new Set(),
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

    function isLearningReviewOpen() {
      return !!ui.learningReviewDrawer && !ui.learningReviewDrawer.hidden;
    }

    function getLearningSelectedSet(tab = state.activeTab) {
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
          ? "学习审核数据加载中..."
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

    function renderLearningReviewList() {
      if (!ui.learningReviewList) {
        return;
      }
      if (state.activeTab === "debug") {
        if (typeof view.renderLearningTabs === "function") {
          view.renderLearningTabs(ui, "debug");
        }
        refreshLearningSelectAllState([]);
        renderLearningDebugPanel();
        return;
      }
      const tab = state.activeTab === "samples" ? "samples" : "candidates";
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
        const { payload, debugPayload } = typeof api.reload === "function"
          ? await api.reload(learningFetchJson)
          : { payload: {}, debugPayload: {} };
        applyLearningPayload(payload);
        applyMemoryDebugPayload(debugPayload);
        renderLearningReviewList();
        setStatus(payload?.message || "学习审核数据已刷新");
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
        setStatus(`学习审核加载失败: ${err.message || err}`);
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

    async function runLearningSingleAction(action, itemId) {
      const tab = state.activeTab === "samples" ? "samples" : "candidates";
      const id = String(itemId || "").trim();
      if (!id) {
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
      const tab = state.activeTab === "samples" ? "samples" : "candidates";
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
      renderLearningReviewList,
      learningFetchJson,
      reloadLearningReviewData,
      reloadMemoryDebugData,
      updateLearningEntries,
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
