(function (root) {
  "use strict";

  function buildReport(snapshot = {}) {
    const data = snapshot && typeof snapshot === "object" ? snapshot : {};
    const memory = data.memory && typeof data.memory === "object" ? data.memory : {};
    const learning = data.learning && typeof data.learning === "object" ? data.learning : {};
    const diagnostics = learning.diagnostics && typeof learning.diagnostics === "object" ? learning.diagnostics : {};
    const last = memory.last_selection && typeof memory.last_selection === "object" ? memory.last_selection : {};
    const lines = [
      "Memory/Learning Debug:",
      `memory.enabled=${memory.enabled === true}`,
      `memory.mem0=${memory.mem0_enabled === true}`,
      `memory.count=${Number(memory.memory_count || 0)}`,
      `last.reason=${String(last.reason || "(none)")}`,
      `last.message=${String(last.message || "")}`,
      `last.explicit=${last.explicit_memory_intent === true}`,
      `last.specific=${last.is_specific_memory_query === true}`,
      `last.lightweight=${last.is_lightweight_checkin === true}`,
      `last.candidates=${Number(last.candidate_count || 0)}`,
      `last.selected=${Array.isArray(last.selected) ? last.selected.length : 0}`,
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
