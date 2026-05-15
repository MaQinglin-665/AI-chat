(function (root) {
  "use strict";

  function buildReport(snapshot = {}) {
    const data = snapshot && typeof snapshot === "object" ? snapshot : {};
    const memory = data.memory && typeof data.memory === "object" ? data.memory : {};
    const short = data.short_memory && typeof data.short_memory === "object" ? data.short_memory : {};
    const core = data.core_memory && typeof data.core_memory === "object" ? data.core_memory : {};
    const learning = data.learning && typeof data.learning === "object" ? data.learning : {};
    const review = learning.review_status && typeof learning.review_status === "object" ? learning.review_status : {};
    const diagnostics = learning.diagnostics && typeof learning.diagnostics === "object" ? learning.diagnostics : {};
    const extraction = learning.last_extraction && typeof learning.last_extraction === "object" ? learning.last_extraction : {};
    const shortUpdate = short.last_update && typeof short.last_update === "object" ? short.last_update : {};
    const shortConsolidation = short.last_consolidation && typeof short.last_consolidation === "object" ? short.last_consolidation : {};
    const coreExtraction = core.last_extraction && typeof core.last_extraction === "object" ? core.last_extraction : {};
    const coreCorrection = core.last_correction && typeof core.last_correction === "object" ? core.last_correction : {};
    const last = memory.last_selection && typeof memory.last_selection === "object" ? memory.last_selection : {};
    const lines = [
      "Memory/Learning Debug:",
      `memory.enabled=${memory.enabled === true}`,
      `memory.mem0=${memory.mem0_enabled === true}`,
      `memory.count=${Number(memory.memory_count || 0)}`,
      `short.enabled=${short.enabled === true}`,
      `short.count=${Number(short.count || 0)}`,
      `short.turnIndex=${Number(short.turn_index || 0)}`,
      `short.injectCount=${Number(short.inject_count || 0)}`,
      `short.ttlTurns=${Number(short.ttl_turns || 0)}`,
      `short.consolidation=${short.consolidation_enabled === true}`,
      `short.consolidationMinSupport=${Number(short.consolidation_min_support || 0)}`,
      `short.updateStatus=${String(shortUpdate.status || "(none)")}`,
      `short.updateReason=${String(shortUpdate.reason || "(none)")}`,
      `short.updateStored=${Number(shortUpdate.stored || 0)}`,
      `short.updateMerged=${Number(shortUpdate.merged || 0)}`,
      `short.consolidateStatus=${String(shortConsolidation.status || "(none)")}`,
      `short.consolidateReason=${String(shortConsolidation.reason || "(none)")}`,
      `short.consolidateStored=${Number(shortConsolidation.stored || 0)}`,
      `short.consolidateMerged=${Number(shortConsolidation.merged || 0)}`,
      `core.enabled=${core.enabled === true}`,
      `core.extraction=${core.extraction_enabled === true}`,
      `core.correction=${core.correction_enabled === true}`,
      `core.count=${Number(core.count || 0)}`,
      `core.injectCount=${Number(core.inject_count || 0)}`,
      `core.minImportance=${Number(core.min_importance || 0)}`,
      `core.minConfidence=${Number(core.min_confidence || 0)}`,
      `core.extractStatus=${String(coreExtraction.status || "(none)")}`,
      `core.extractReason=${String(coreExtraction.reason || "(none)")}`,
      `core.extractAction=${String(coreExtraction.action || "(none)")}`,
      `core.extractStored=${Number(coreExtraction.stored || 0)}`,
      `core.extractMerged=${Number(coreExtraction.merged || 0)}`,
      `core.correctStatus=${String(coreCorrection.status || "(none)")}`,
      `core.correctReason=${String(coreCorrection.reason || "(none)")}`,
      `core.correctAction=${String(coreCorrection.action || "(none)")}`,
      `core.correctChanged=${Number(coreCorrection.core_changed || 0)}`,
      `review.candidatesEnabled=${review.candidates_enabled === true}`,
      `review.samplesEnabled=${review.samples_enabled === true}`,
      `review.promptInjection=${review.prompt_injection_enabled === true}`,
      `review.effectiveLimit=${Number(review.prompt_inject_effective_limit || 0)}`,
      `review.pending=${Number(review.pending_review_count || 0)}`,
      `review.activeSamples=${Number(review.active_sample_count || 0)}`,
      `review.promptEligible=${Number(review.prompt_eligible_sample_count || 0)}`,
      `review.candidatesAffectPrompt=${review.candidates_affect_prompt === true}`,
      `review.requiresPromotion=${review.requires_user_promotion === true}`,
      `review.sensitiveFilter=${review.sensitive_filter_enabled === true}`,
      `review.localOnly=${review.local_only === true}`,
      `review.inputScope=${String(review.input_scope || "(unknown)")}`,
      `last.reason=${String(last.reason || "(none)")}`,
      `last.message=${String(last.message || "")}`,
      `last.explicit=${last.explicit_memory_intent === true}`,
      `last.specific=${last.is_specific_memory_query === true}`,
      `last.lightweight=${last.is_lightweight_checkin === true}`,
      `last.candidates=${Number(last.candidate_count || 0)}`,
      `last.selected=${Array.isArray(last.selected) ? last.selected.length : 0}`,
      `last.skipped=${Array.isArray(last.memory_skipped) ? last.memory_skipped.length : 0}`,
      `last.shortSkipped=${Array.isArray(last.short_memories_skipped) ? last.short_memories_skipped.length : 0}`,
      `last.coreSkipped=${Array.isArray(last.core_memories_skipped) ? last.core_memories_skipped.length : 0}`,
      `last.learningReason=${String(last.learning_reason || "(none)")}`,
      `last.learningSamples=${Number(last.learning_samples_considered || 0)}`,
      `last.learningSelected=${Array.isArray(last.learning_samples_selected) ? last.learning_samples_selected.length : 0}`,
      `extract.status=${String(extraction.status || "(none)")}`,
      `extract.reason=${String(extraction.reason || "(none)")}`,
      `extract.action=${String(extraction.action || "(none)")}`,
      `extract.category=${String(extraction.category || "(none)")}`,
      `extract.score=${Number(extraction.score || 0)}`,
      `extract.confidence=${Number(extraction.confidence || 0)}`,
      `learning.candidates=${Number(learning.candidates_count || 0)}`,
      `learning.samples=${Number(learning.samples_count || 0)}`,
      `learning.degraded=${learning.degraded_mode === true}`,
      `learning.degradedReason=${String(diagnostics.degraded_reason || "(none)")}`,
      `learning.turns=${Number(learning.turn_count || 0)}`,
      `learning.currentWindow=${Number(diagnostics.current_window_size || 0)}`,
      `learning.currentAvgConfidence=${Number(diagnostics.current_window_avg_confidence || 0)}`,
      `learning.currentSignalCoverage=${Number(diagnostics.current_window_signal_coverage || 0)}`,
      `learning.suspectedGarbled=${Number(diagnostics.garbled_count || 0)}`
    ];
    const selected = Array.isArray(last.selected) ? last.selected.slice(0, 5) : [];
    if (selected.length) {
      lines.push("Selected memory:");
      selected.forEach((item, idx) => {
        lines.push(`${idx + 1}. [${item.source || "selected"}] ${item.user || ""} => ${item.assistant || ""}`);
      });
    }
    const shortSelected = Array.isArray(last.short_memories_selected) ? last.short_memories_selected.slice(0, 5) : [];
    if (shortSelected.length) {
      lines.push("Selected short-term memories:");
      shortSelected.forEach((item, idx) => {
        lines.push(`${idx + 1}. relevance=${Number(item.relevance || 0)} [${item.kind || "short"}] ${item.text || item.id || ""}`);
      });
    }
    const recentShort = Array.isArray(short.recent) ? short.recent.slice(-3) : [];
    if (recentShort.length) {
      lines.push("Recent short-term memories:");
      recentShort.forEach((item, idx) => {
        lines.push(`${idx + 1}. [${item.kind || "short"}] ${item.text || item.id || ""}`);
      });
    }
    const coreSelected = Array.isArray(last.core_memories_selected) ? last.core_memories_selected.slice(0, 5) : [];
    if (coreSelected.length) {
      lines.push("Selected core memories:");
      coreSelected.forEach((item, idx) => {
        lines.push(`${idx + 1}. relevance=${Number(item.relevance || 0)} [${item.category || item.kind || "memory"}] ${item.text || item.id || ""}`);
      });
    }
    const skipped = [
      ...(Array.isArray(last.short_memories_skipped) ? last.short_memories_skipped : []),
      ...(Array.isArray(last.core_memories_skipped) ? last.core_memories_skipped : []),
      ...(Array.isArray(last.memory_skipped) ? last.memory_skipped : [])
    ].slice(0, 8);
    if (skipped.length) {
      lines.push("Skipped memory candidates:");
      skipped.forEach((item, idx) => {
        lines.push(`${idx + 1}. reason=${item.reason || "(none)"} score=${Number(item.score || 0)} [${item.source || "memory"}] ${item.text || item.id || ""}`);
      });
    }
    const recentCore = Array.isArray(core.recent) ? core.recent.slice(-3) : [];
    if (recentCore.length) {
      lines.push("Recent core memories:");
      recentCore.forEach((item, idx) => {
        lines.push(`${idx + 1}. [${item.category || item.kind || "memory"}] ${item.text || item.id || ""}`);
      });
    }
    const learningSelected = Array.isArray(last.learning_samples_selected) ? last.learning_samples_selected.slice(0, 5) : [];
    if (learningSelected.length) {
      lines.push("Selected learning samples:");
      learningSelected.forEach((item, idx) => {
        lines.push(`${idx + 1}. relevance=${Number(item.relevance || 0)} ${item.compressed_pattern || item.user_preview || item.id || ""}`);
      });
    }
    if (extraction.status || extraction.reason || extraction.candidate_id) {
      lines.push("Last learning extraction:");
      lines.push(
        `${extraction.status || "(none)"} ${extraction.action || ""} ${extraction.candidate_id || ""} category=${extraction.category || "(none)"} score=${Number(extraction.score || 0)} confidence=${Number(extraction.confidence || 0)} reason=${extraction.reason || "(none)"}`
      );
    }
    const relevant = Array.isArray(last.relevant_candidates) ? last.relevant_candidates.slice(0, 5) : [];
    if (relevant.length) {
      lines.push("Relevant candidates:");
      relevant.forEach((item, idx) => {
        lines.push(`${idx + 1}. score=${Number(item.score || 0)} ${item.user || ""}`);
      });
    }
    const recentAudit = Array.isArray(learning.recent_audit) ? learning.recent_audit.slice(-3) : [];
    if (recentAudit.length) {
      lines.push("Recent learning audit:");
      recentAudit.forEach((item, idx) => {
        lines.push(`${idx + 1}. ${item.action || item.event || item.id || "(event)"}`);
      });
    }
    const healthWindows = Array.isArray(diagnostics.health_windows) ? diagnostics.health_windows.slice(-3) : [];
    if (healthWindows.length) {
      lines.push("Learning health windows:");
      healthWindows.forEach((item, idx) => {
        lines.push(
          `${idx + 1}. avgConfidence=${Number(item.avg_confidence || 0)} candidateRate=${Number(item.candidate_in_rate || 0)} signalCoverage=${Number(item.signal_coverage || 0)} ended=${String(item.window_ended_at || "")}`
        );
      });
    }
    const latestEvent = diagnostics.latest_event && typeof diagnostics.latest_event === "object" ? diagnostics.latest_event : {};
    if (latestEvent.event || latestEvent.reason) {
      lines.push(
        `Latest learning event: ${String(latestEvent.event || "(event)")} reason=${String(latestEvent.reason || "(none)")} at=${String(latestEvent.ts || "")}`
      );
    }
    const garbledExamples = Array.isArray(diagnostics.garbled_examples) ? diagnostics.garbled_examples.slice(0, 3) : [];
    if (garbledExamples.length) {
      lines.push("Suspected garbled learning examples:");
      garbledExamples.forEach((item, idx) => {
        lines.push(`${idx + 1}. ${item.user_preview || item.assistant_preview || item.compressed_pattern || item.id || "(item)"}`);
      });
    }
    return lines.join("\n");
  }

  const api = {
    buildReport
  };

  root.TaffyMemoryDebugReport = api;
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : window);
