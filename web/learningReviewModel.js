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

  function normalizeCoreMemoryItem(item, fallbackId) {
    const src = item && typeof item === "object" ? item : {};
    const itemId = String(src.id || fallbackId || "").trim();
    const text = String(src.text || "").trim();
    if (!itemId || !text) {
      return null;
    }
    const importanceRaw = Number(src.importance);
    const confRaw = Number(src.confidence);
    const useRaw = Number(src.use_count);
    const importance = Number.isFinite(importanceRaw) ? Math.max(0, Math.min(1, importanceRaw)) : 0;
    return {
      id: itemId,
      kind: String(src.kind || "semantic").trim() || "semantic",
      category: String(src.category || "stable_fact").trim() || "stable_fact",
      text,
      source: String(src.source || "conversation").trim() || "conversation",
      status: String(src.status || "active").trim() || "active",
      importance,
      confidence: Number.isFinite(confRaw) ? Math.max(0, Math.min(1, confRaw)) : 0,
      use_count: Number.isFinite(useRaw) ? Math.max(0, Math.round(useRaw)) : 0,
      pinned: src.pinned === true,
      tags: Array.isArray(src.tags) ? src.tags.map((tag) => String(tag || "").trim()).filter(Boolean) : [],
      origin: src.origin && typeof src.origin === "object" ? src.origin : {},
      created_at: String(src.created_at || "").trim(),
      updated_at: String(src.updated_at || "").trim(),
      score: importance,
      support_count: Number.isFinite(useRaw) ? Math.max(0, Math.round(useRaw)) : 0,
      compressed_pattern: text,
      user_preview: String(src.origin?.user_preview || "").trim(),
      assistant_preview: String(src.origin?.assistant_preview || "").trim()
    };
  }

  function normalizeShortTermMemoryItem(item, fallbackId) {
    const src = item && typeof item === "object" ? item : {};
    const itemId = String(src.id || fallbackId || "").trim();
    const text = String(src.text || "").trim();
    if (!itemId || !text) {
      return null;
    }
    const salienceRaw = Number(src.salience);
    const turnRaw = Number(src.last_seen_turn);
    return {
      id: itemId,
      kind: String(src.kind || "current_topic").trim() || "current_topic",
      text,
      source: String(src.source || "conversation").trim() || "conversation",
      status: String(src.status || "active").trim() || "active",
      salience: Number.isFinite(salienceRaw) ? Math.max(0, Math.min(1, salienceRaw)) : 0,
      tags: Array.isArray(src.tags) ? src.tags.map((tag) => String(tag || "").trim()).filter(Boolean) : [],
      origin: src.origin && typeof src.origin === "object" ? src.origin : {},
      created_at: String(src.created_at || "").trim(),
      updated_at: String(src.updated_at || "").trim(),
      last_seen_turn: Number.isFinite(turnRaw) ? Math.max(0, Math.round(turnRaw)) : 0,
      ttl_turns: Number(src.ttl_turns || 0),
      score: Number.isFinite(salienceRaw) ? Math.max(0, Math.min(1, salienceRaw)) : 0,
      confidence: 1,
      support_count: Number.isFinite(turnRaw) ? Math.max(0, Math.round(turnRaw)) : 0,
      compressed_pattern: text,
      user_preview: String(src.origin?.user_preview || "").trim(),
      assistant_preview: String(src.origin?.assistant_preview || "").trim()
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
    if (Array.isArray(data.core_memories)) {
      target.coreMemories = data.core_memories
        .map((item, idx) => normalizeCoreMemoryItem(item, `core_${idx}`))
        .filter(Boolean);
    }
    if (Array.isArray(data.short_memories)) {
      target.shortMemories = data.short_memories
        .map((item, idx) => normalizeShortTermMemoryItem(item, `short_${idx}`))
        .filter(Boolean);
    }
    if (data.quick_settings && typeof data.quick_settings === "object") {
      target.quickSettings = normalizeQuickSettings(data.quick_settings);
    }
    pruneSelection(target.selectedCandidates, target.candidates);
    pruneSelection(target.selectedSamples, target.samples);
    pruneSelection(target.selectedShort, target.shortMemories);
    pruneSelection(target.selectedCore, target.coreMemories);
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
    const tab = target.activeTab === "samples" ? "samples" : (target.activeTab === "short" ? "short" : (target.activeTab === "core" ? "core" : "candidates"));
    const source = tab === "samples" ? target.samples : (tab === "short" ? target.shortMemories : (tab === "core" ? target.coreMemories : target.candidates));
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
        const haystack = `${item.user_preview || ""}\n${item.assistant_preview || ""}\n${item.compressed_pattern || ""}\n${item.text || ""}\n${item.category || ""}\n${item.kind || ""}\n${(item.tags || []).join(" ")}`.toLowerCase();
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
      pinned: "\u5df2\u56fa\u5b9a",
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
        text: `${item?.importance !== undefined ? "\u91cd\u8981" : "\u8bc4\u5206"} ${score.toFixed(2)}`
      },
      confidence: {
        className: getMetricLevel(confidence, { high: 0.75, mid: 0.5 }),
        text: `\u7f6e\u4fe1 ${confidence.toFixed(2)}`
      },
      support: {
        className: getMetricLevel(support, { high: 3, mid: 1 }),
        text: `${item?.use_count !== undefined ? "\u4f7f\u7528" : "\u652f\u6301"} ${support}`
      }
    };
  }

  function buildLearningSummaryText(state, visibleCount = 0) {
    const target = state && typeof state === "object" ? state : {};
    const candidates = Array.isArray(target.candidates) ? target.candidates.length : 0;
    const samples = Array.isArray(target.samples) ? target.samples.length : 0;
    const short = Array.isArray(target.shortMemories) ? target.shortMemories.length : 0;
    const core = Array.isArray(target.coreMemories) ? target.coreMemories.length : 0;
    const pool = target.activeTab === "samples" ? "\u6b63\u5f0f\u6c60" : (target.activeTab === "short" ? "\u77ed\u671f\u8bb0\u5fc6" : (target.activeTab === "core" ? "\u957f\u671f\u8bb0\u5fc6" : "\u5019\u9009\u6c60"));
    if (target.activeTab === "short") {
      return `${pool}\u5f53\u524d\u663e\u793a ${Math.max(0, Number(visibleCount) || 0)} \u6761\u3002\u8fd9\u91cc\u4fdd\u5b58\u5f53\u524d\u4f1a\u8bdd\u7684\u8bdd\u9898\u3001\u4efb\u52a1\u548c\u672a\u5b8c\u6210\u4e8b\u9879\uff0c\u4f1a\u968f\u8f6e\u6b21\u81ea\u7136\u8fc7\u671f\u3002`;
    }
    if (target.activeTab === "core") {
      return `${pool}\u5f53\u524d\u663e\u793a ${Math.max(0, Number(visibleCount) || 0)} \u6761\u3002\u8fd9\u91cc\u4fdd\u5b58\u7a33\u5b9a\u4e8b\u5b9e\u3001\u4e8b\u4ef6\u548c\u9879\u76ee\u8fdb\u5c55\uff0c\u4f1a\u5728\u76f8\u5173\u5bf9\u8bdd\u4e2d\u5c11\u91cf\u53c2\u4e0e\u56de\u590d\u3002`;
    }
    return `${pool}\u5f53\u524d\u663e\u793a ${Math.max(0, Number(visibleCount) || 0)} \u6761\u3002\u5019\u9009\u6c60\u7528\u6765\u5ba1\u6838\u65b0\u6c89\u6dc0\u7684\u4e92\u52a8\u504f\u597d\uff0c\u6b63\u5f0f\u6c60\u4f1a\u5728\u76f8\u5173\u5bf9\u8bdd\u4e2d\u53c2\u4e0e\u56de\u590d\u3002\u77ed\u671f\u8bb0\u5fc6 ${short} \u6761\uff0c\u957f\u671f\u8bb0\u5fc6 ${core} \u6761\u3002`;
  }

  function buildLearningStats(state, visibleCount = 0) {
    const target = state && typeof state === "object" ? state : {};
    const candidates = Array.isArray(target.candidates) ? target.candidates.length : 0;
    const samples = Array.isArray(target.samples) ? target.samples.length : 0;
    const short = Array.isArray(target.shortMemories) ? target.shortMemories.length : 0;
    const core = Array.isArray(target.coreMemories) ? target.coreMemories.length : 0;
    const selected = target.activeTab === "short"
      ? (target.selectedShort instanceof Set ? target.selectedShort.size : 0)
      : target.activeTab === "core"
      ? (target.selectedCore instanceof Set ? target.selectedCore.size : 0)
      : target.activeTab === "samples"
      ? (target.selectedSamples instanceof Set ? target.selectedSamples.size : 0)
      : (target.selectedCandidates instanceof Set ? target.selectedCandidates.size : 0);
    return {
      candidates,
      samples,
      short,
      core,
      visible: Math.max(0, Number(visibleCount) || 0),
      selected,
      activePoolLabel: target.activeTab === "samples" ? "\u6b63\u5f0f\u6c60" : (target.activeTab === "short" ? "\u77ed\u671f\u8bb0\u5fc6" : (target.activeTab === "core" ? "\u957f\u671f\u8bb0\u5fc6" : "\u5019\u9009\u6c60"))
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
    normalizeCoreMemoryItem,
    normalizeShortTermMemoryItem,
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
