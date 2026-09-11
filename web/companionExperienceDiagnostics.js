(function (root) {
  "use strict";

  const MAX_TURNS = 12;
  const ALLOWED_PAYLOAD_FIELDS = new Set([
    "mode", "ttsProvider", "status", "elapsedMs", "fromApiHeadersMs",
    "fromBlobReadyMs", "fromSpeakStartMs", "result", "reason", "error"
  ]);

  function sanitizeToken(value, maxLength = 80) {
    return String(value || "")
      .replace(/[\r\n\t]+/g, " ")
      .replace(/[^a-zA-Z0-9_.:\-/ ]/g, "")
      .trim()
      .slice(0, maxLength);
  }

  function createCollector(options = {}) {
    const now = typeof options.now === "function" ? options.now : () => root.performance?.now?.() || Date.now();
    const turns = [];
    const byTrace = new Map();

    function getTurn(traceId, atMs) {
      const key = sanitizeToken(traceId, 96);
      if (!key || key === "(none)") return null;
      let turn = byTrace.get(key);
      if (!turn) {
        turn = {
          traceId: key,
          startedAtMs: atMs,
          stages: Object.create(null),
          meta: Object.create(null),
          outcome: "active"
        };
        byTrace.set(key, turn);
        turns.push(turn);
        while (turns.length > MAX_TURNS) {
          const removed = turns.shift();
          if (removed) byTrace.delete(removed.traceId);
        }
      }
      return turn;
    }

    function record(scope, stage, payload = {}) {
      const atMs = Number(now()) || 0;
      const turn = getTurn(payload.traceId, atMs);
      if (!turn) return null;
      const safeScope = sanitizeToken(scope, 16) || "unknown";
      const safeStage = sanitizeToken(stage, 48) || "event";
      const stageKey = `${safeScope}.${safeStage}`;
      if (!turn.stages[stageKey]) {
        turn.stages[stageKey] = {
          atMs,
          elapsedMs: Math.max(0, Math.round(atMs - turn.startedAtMs))
        };
      }
      for (const field of ALLOWED_PAYLOAD_FIELDS) {
        if (!(field in payload)) continue;
        if (/Ms$/.test(field) || field === "status") {
          const number = Number(payload[field]);
          if (Number.isFinite(number)) turn.meta[field] = Math.round(number);
        } else {
          turn.meta[field] = sanitizeToken(payload[field]);
        }
      }
      if (safeStage === "send_click") {
        turn.startedAtMs = atMs;
        turn.stages[stageKey].elapsedMs = 0;
      } else if (safeStage === "interrupted") {
        turn.outcome = "cancelled";
      } else if (safeStage === "fail" || safeStage === "speak_fail") {
        turn.outcome = "failed";
      } else if (safeStage === "audio_play_end" || safeStage === "browser_play_end" || safeStage === "context_play_end") {
        turn.outcome = turn.meta.result === "fail" ? "failed" : "played";
      } else if (safeStage === "done" && turn.outcome === "active") {
        turn.outcome = "text_done";
      }
      return turn;
    }

    function snapshot() {
      return turns.map((turn) => ({
        traceId: turn.traceId,
        startedAtMs: turn.startedAtMs,
        stages: Object.fromEntries(Object.entries(turn.stages).map(([key, value]) => [key, { ...value }])),
        meta: { ...turn.meta },
        outcome: turn.outcome
      }));
    }

    function clear() {
      turns.splice(0, turns.length);
      byTrace.clear();
    }

    return { record, snapshot, clear };
  }

  function stageMs(turn, ...keys) {
    for (const key of keys) {
      const value = Number(turn?.stages?.[key]?.elapsedMs);
      if (Number.isFinite(value)) return `${Math.round(value)}ms`;
    }
    return "--";
  }

  function buildReport(turns = []) {
    const recent = Array.isArray(turns) ? turns.slice(-8).reverse() : [];
    const lines = [
      "Companion experience latency (text-free)",
      "headers | first text | reply ready | TTS ready | first sound | playback end"
    ];
    if (!recent.length) {
      lines.push("No measured turns yet.");
      return lines.join("\n");
    }
    recent.forEach((turn, index) => {
      lines.push(
        `#${recent.length - index} ${turn.outcome || "active"}`,
        [
          stageMs(turn, "chat.api_headers"),
          stageMs(turn, "chat.first_text_render"),
          stageMs(turn, "chat.reply_ready"),
          stageMs(turn, "tts.response_ok"),
          stageMs(turn, "tts.audio_play_start", "tts.browser_play_start", "tts.context_play_start"),
          stageMs(turn, "tts.audio_play_end", "tts.browser_play_end", "tts.context_play_end")
        ].join(" | "),
        `mode=${turn.meta?.mode || "--"} provider=${turn.meta?.ttsProvider || "--"} result=${turn.meta?.result || turn.meta?.reason || "--"}`
      );
    });
    return lines.join("\n");
  }

  const collector = createCollector();
  let panelVisible = false;
  let panel = null;
  let panelBody = null;

  function updatePanel() {
    if (!panelVisible) return null;
    if (!panel) {
      const created = root.TaffyDebugPanelController?.createDebugPanel?.({
        documentObject: root.document,
        id: "companion-experience-diagnostics-panel",
        title: "Experience Latency",
        width: 540,
        onHide: () => togglePanel(false)
      }) || null;
      panel = created?.panel || null;
      panelBody = created?.body || null;
    }
    if (panelBody) panelBody.textContent = buildReport(collector.snapshot());
    if (panel) panel.style.display = "block";
    return panel;
  }

  function togglePanel(force = null) {
    panelVisible = force === null ? !panelVisible : force === true;
    if (!panelVisible) {
      if (panel) panel.style.display = "none";
      return false;
    }
    updatePanel();
    return true;
  }

  const api = {
    createCollector,
    buildReport,
    record(scope, stage, payload) {
      const result = collector.record(scope, stage, payload);
      updatePanel();
      return result;
    },
    snapshot: () => collector.snapshot(),
    clear: () => collector.clear(),
    togglePanel
  };

  root.TaffyCompanionExperienceDiagnostics = api;
  root.__AI_CHAT_EXPERIENCE_DIAGNOSTICS__ = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
