(function (root) {
  "use strict";

  function normalizeLearningReviewItem(item, fallbackId) {
    const src = item && typeof item === "object" ? item : {};
    const itemId = String(src.id || fallbackId || "").trim();
    if (!itemId) {
      return null;
    }
    const assistantPreview = String(src.assistant_preview || "").trim();
    const userPreview = String(src.user_preview || "").trim();
    const compressedPattern = String(src.compressed_pattern || "").trim();
    if (!assistantPreview && !userPreview && !compressedPattern) {
      return null;
    }
    const scoreRaw = Number(src.score);
    const confRaw = Number(src.confidence);
    const supportRaw = Number(src.support_count);
    return {
      id: itemId,
      assistant_preview: assistantPreview,
      user_preview: userPreview,
      compressed_pattern: compressedPattern,
      score: Number.isFinite(scoreRaw) ? Math.max(0, Math.min(1, scoreRaw)) : 0,
      confidence: Number.isFinite(confRaw) ? Math.max(0, Math.min(1, confRaw)) : 0,
      support_count: Number.isFinite(supportRaw) ? Math.max(0, Math.round(supportRaw)) : 0,
      status: String(src.status || "candidate").trim() || "candidate",
      updated_at: String(src.updated_at || "").trim(),
      created_at: String(src.created_at || "").trim()
    };
  }

  function normalizeQuickSettings(input = {}) {
    return {
      inject_count: Number(input.inject_count) >= 1 ? 1 : 0,
      promotion_min_support: Number(input.promotion_min_support) >= 2 ? 2 : 1
    };
  }

  function pruneSelection(selected, items) {
    if (!(selected instanceof Set)) {
      return;
    }
    const ids = new Set((Array.isArray(items) ? items : []).map((item) => item.id));
    Array.from(selected).forEach((id) => {
      if (!ids.has(id)) {
        selected.delete(id);
      }
    });
  }

  function applyLearningPayload(state, payload) {
    const target = state && typeof state === "object" ? state : {};
    const data = payload && typeof payload === "object" ? payload : {};
    if (Array.isArray(data.candidates)) {
      target.candidates = data.candidates
        .map((item, idx) => normalizeLearningReviewItem(item, `cand_${idx}`))
        .filter(Boolean);
    }
    if (Array.isArray(data.samples)) {
      target.samples = data.samples
        .map((item, idx) => normalizeLearningReviewItem(item, `sample_${idx}`))
        .filter(Boolean);
    }
    if (data.quick_settings && typeof data.quick_settings === "object") {
      target.quickSettings = normalizeQuickSettings(data.quick_settings);
    }
    pruneSelection(target.selectedCandidates, target.candidates);
    pruneSelection(target.selectedSamples, target.samples);
    return target;
  }

  function parseLearningFilterNumber(input, fallback = 0) {
    const value = Number(input?.value ?? input);
    if (!Number.isFinite(value)) {
      return fallback;
    }
    return Math.max(0, Math.min(1, value));
  }

  function parseLearningUpdatedTime(item) {
    const t = Date.parse(String(item?.updated_at || item?.created_at || "").trim());
    return Number.isFinite(t) ? t : 0;
  }

  function compareLearningItems(a, b, sortMode = "score_desc") {
    const as = Number(a?.score || 0);
    const bs = Number(b?.score || 0);
    const ac = Number(a?.confidence || 0);
    const bc = Number(b?.confidence || 0);
    const ap = Number(a?.support_count || 0);
    const bp = Number(b?.support_count || 0);
    const at = parseLearningUpdatedTime(a);
    const bt = parseLearningUpdatedTime(b);
    if (sortMode === "confidence_desc") {
      return (bc - ac) || (bs - as) || (bp - ap) || (bt - at);
    }
    if (sortMode === "support_desc") {
      return (bp - ap) || (bs - as) || (bc - ac) || (bt - at);
    }
    if (sortMode === "updated_desc") {
      return (bt - at) || (bs - as) || (bc - ac) || (bp - ap);
    }
    return (bs - as) || (bc - ac) || (bp - ap) || (bt - at);
  }

  function getLearningFilteredItems(state, filters = {}) {
    const target = state && typeof state === "object" ? state : {};
    const tab = target.activeTab === "samples" ? "samples" : "candidates";
    const source = tab === "samples" ? target.samples : target.candidates;
    const scoreMin = parseLearningFilterNumber(filters.scoreMin, 0);
    const confidenceMin = parseLearningFilterNumber(filters.confidenceMin, 0);
    const keyword = String(filters.keyword || "").trim().toLowerCase();
    const sortMode = String(filters.sortMode || target.sortMode || "score_desc");
    return (Array.isArray(source) ? source : [])
      .filter((item) => {
        if (!item || typeof item !== "object") {
          return false;
        }
        if (Number(item.score || 0) < scoreMin) {
          return false;
        }
        if (Number(item.confidence || 0) < confidenceMin) {
          return false;
        }
        if (!keyword) {
          return true;
        }
        const haystack = `${item.user_preview || ""}\n${item.assistant_preview || ""}\n${item.compressed_pattern || ""}`.toLowerCase();
        return haystack.includes(keyword);
      })
      .sort((a, b) => compareLearningItems(a, b, sortMode));
  }

  function getLearningStatusView(status) {
    const rawStatus = String(status || "candidate").trim().toLowerCase();
    const statusClass = rawStatus.replace(/[^a-z0-9_-]/g, "") || "candidate";
    const labels = {
      candidate: "\u5019\u9009",
      active: "\u6b63\u5f0f",
      promoted: "\u5df2\u664b\u5347",
      archived: "\u5df2\u5f52\u6863"
    };
    return {
      rawStatus,
      statusClass,
      label: labels[rawStatus] || String(status || "\u5019\u9009")
    };
  }

  function getMetricLevel(value, thresholds = {}) {
    const n = Number(value || 0);
    const high = Number.isFinite(Number(thresholds.high)) ? Number(thresholds.high) : 0.8;
    const mid = Number.isFinite(Number(thresholds.mid)) ? Number(thresholds.mid) : 0.6;
    if (n >= high) return "is-high";
    if (n >= mid) return "is-mid";
    return "is-low";
  }

  function getLearningMetricViews(item) {
    const score = Number(item?.score || 0);
    const confidence = Number(item?.confidence || 0);
    const support = Math.max(0, Number(item?.support_count || 0));
    return {
      score: {
        className: getMetricLevel(score, { high: 0.8, mid: 0.6 }),
        text: `\u8bc4\u5206 ${score.toFixed(2)}`
      },
      confidence: {
        className: getMetricLevel(confidence, { high: 0.75, mid: 0.5 }),
        text: `\u7f6e\u4fe1 ${confidence.toFixed(2)}`
      },
      support: {
        className: getMetricLevel(support, { high: 3, mid: 1 }),
        text: `\u652f\u6301 ${support}`
      }
    };
  }

  function buildLearningSummaryText(state, visibleCount = 0) {
    const target = state && typeof state === "object" ? state : {};
    const candidates = Array.isArray(target.candidates) ? target.candidates.length : 0;
    const samples = Array.isArray(target.samples) ? target.samples.length : 0;
    const pool = target.activeTab === "samples" ? "\u6b63\u5f0f\u6c60" : "\u5019\u9009\u6c60";
    return `${pool}\u5f53\u524d\u663e\u793a ${Math.max(0, Number(visibleCount) || 0)} \u6761\u3002\u5019\u9009\u6c60\u7528\u6765\u5ba1\u6838\u65b0\u6c89\u6dc0\u7684\u8bb0\u5fc6\uff0c\u6b63\u5f0f\u6c60\u4f1a\u5728\u76f8\u5173\u5bf9\u8bdd\u4e2d\u53c2\u4e0e\u56de\u590d\u3002`;
  }

  function buildLearningStats(state, visibleCount = 0) {
    const target = state && typeof state === "object" ? state : {};
    const candidates = Array.isArray(target.candidates) ? target.candidates.length : 0;
    const samples = Array.isArray(target.samples) ? target.samples.length : 0;
    const selected = target.activeTab === "samples"
      ? (target.selectedSamples instanceof Set ? target.selectedSamples.size : 0)
      : (target.selectedCandidates instanceof Set ? target.selectedCandidates.size : 0);
    return {
      candidates,
      samples,
      visible: Math.max(0, Number(visibleCount) || 0),
      selected,
      activePoolLabel: target.activeTab === "samples" ? "\u6b63\u5f0f\u6c60" : "\u5019\u9009\u6c60"
    };
  }

  function buildSelectAllState(activeTab, filteredItems, selectedSet) {
    if (activeTab === "debug") {
      return {
        checked: false,
        indeterminate: false,
        selectedCount: 0,
        canBatch: false,
        canPromote: false
      };
    }
    const selected = selectedSet instanceof Set ? selectedSet : new Set();
    const visibleIds = (Array.isArray(filteredItems) ? filteredItems : []).map((item) => item.id);
    const selectedVisible = visibleIds.filter((id) => selected.has(id));
    const canBatch = selected.size > 0;
    return {
      checked: visibleIds.length > 0 && selectedVisible.length === visibleIds.length,
      indeterminate: selectedVisible.length > 0 && selectedVisible.length < visibleIds.length,
      selectedCount: selected.size,
      canBatch,
      canPromote: canBatch && activeTab === "candidates"
    };
  }

  const api = {
    applyLearningPayload,
    buildLearningSummaryText,
    buildLearningStats,
    buildSelectAllState,
    compareLearningItems,
    getLearningMetricViews,
    getLearningFilteredItems,
    getLearningStatusView,
    getMetricLevel,
    normalizeLearningReviewItem,
    normalizeQuickSettings,
    parseLearningFilterNumber,
    parseLearningUpdatedTime,
    pruneSelection
  };

  root.TaffyLearningReviewModel = api;

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof window !== "undefined" ? window : globalThis);
