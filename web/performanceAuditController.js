(function (root) {
  "use strict";

  function clean(value, fallback = "", maxLen = 64) {
    const text = String(value || "").replace(/\s+/g, " ").trim().toLowerCase().replace(/-/g, "_");
    return (text || fallback).slice(0, Math.max(1, Number(maxLen) || 64));
  }

  function cleanLabel(value, fallback = "", maxLen = 64) {
    const text = String(value || "").replace(/\s+/g, " ").trim();
    return (text || fallback).slice(0, Math.max(1, Number(maxLen) || 64));
  }

  function cleanInt(value, fallback = 0, min = 0, max = 9999999999999) {
    const n = Math.floor(Number(value));
    if (!Number.isFinite(n)) {
      return fallback;
    }
    return Math.max(min, Math.min(max, n));
  }

  function normalizeTimelineSummary(value = {}) {
    const raw = value && typeof value === "object" && !Array.isArray(value) ? value : {};
    return {
      pre: clean(raw.pre, "none", 48),
      speech: clean(raw.speech, "none", 48),
      beats: cleanInt(raw.beats, 0, 0, 4),
      post: clean(raw.post, "none", 48),
      suppressed: Array.isArray(raw.suppressed)
        ? raw.suppressed.map((item) => clean(item, "", 48)).filter(Boolean).slice(0, 6)
        : []
    };
  }

  function sanitizePerformanceAuditSummary(raw = null) {
    const audit = raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {};
    const timeline = normalizeTimelineSummary(audit.timeline || audit);
    return {
      enabled: audit.enabled !== false,
      status: clean(audit.status, "started", 32),
      trace_id: cleanLabel(audit.trace_id, "", 64),
      session_id: cleanInt(audit.session_id, 0, 0),
      intent: clean(audit.intent, "casual", 40),
      timeline,
      actual: {
        pre: clean(audit.actual?.pre || audit.actual_pre, "pending", 48),
        speech: clean(audit.actual?.speech || audit.actual_speech, "pending", 48),
        beats: cleanInt(audit.actual?.beats ?? audit.actual_beats, 0, 0, 8),
        post: clean(audit.actual?.post || audit.actual_post, "pending", 48),
        action_dispatches: cleanInt(audit.actual?.action_dispatches ?? audit.action_dispatches, 0, 0, 20),
        pulse_dispatches: cleanInt(audit.actual?.pulse_dispatches ?? audit.pulse_dispatches, 0, 0, 20)
      },
      tts: {
        started: audit.tts?.started === true || audit.tts_started === true,
        finished: audit.tts?.finished === true || audit.tts_finished === true,
        mode: clean(audit.tts?.mode || audit.tts_mode, "none", 32)
      },
      settled: audit.settled === true,
      suppressed: Array.isArray(audit.suppressed)
        ? audit.suppressed.map((item) => clean(item, "", 48)).filter(Boolean).slice(0, 8)
        : timeline.suppressed.slice(0, 8),
      last_event: clean(audit.last_event, "none", 48),
      updated_at: cleanInt(audit.updated_at, 0, 0)
    };
  }

  function createController(deps = {}) {
    const state = deps.state || {};
    const windowObject = deps.windowObject || root;
    const perfLog = typeof deps.perfLog === "function" ? deps.perfLog : () => {};

    function nowMs() {
      return Date.now();
    }

    function attachSummary(summary) {
      const safe = sanitizePerformanceAuditSummary(summary);
      state.performanceAuditLastSummary = safe;
      if (state.characterBrainLastDecision && typeof state.characterBrainLastDecision === "object" && !Array.isArray(state.characterBrainLastDecision)) {
        state.characterBrainLastDecision.performance_audit = safe;
      }
      try {
        windowObject.__AI_CHAT_LAST_PERFORMANCE_AUDIT__ = safe;
      } catch (_) {
        // Optional debug bridge only.
      }
      return safe;
    }

    function startPerformanceAudit(context = {}) {
      const brain = context.brainSnapshot && typeof context.brainSnapshot === "object" && !Array.isArray(context.brainSnapshot)
        ? context.brainSnapshot
        : {};
      const timeline = normalizeTimelineSummary(context.timelineSummary);
      const startedAt = nowMs();
      state.performanceAuditEvents = [];
      const summary = {
        enabled: true,
        status: "started",
        trace_id: cleanLabel(context.traceId, "", 64),
        session_id: cleanInt(context.sessionId, 0, 0),
        intent: clean(brain.intent || context.intent, "casual", 40),
        timeline,
        actual: {
          pre: "pending",
          speech: "pending",
          beats: 0,
          post: "pending",
          action_dispatches: 0,
          pulse_dispatches: 0
        },
        tts: {
          started: false,
          finished: false,
          mode: "none"
        },
        settled: false,
        suppressed: timeline.suppressed.slice(0, 8),
        last_event: "started",
        started_at: startedAt,
        updated_at: startedAt
      };
      return attachSummary(summary);
    }

    function recordPerformanceAuditEvent(kind, detail = {}) {
      const eventKind = clean(kind, "event", 48);
      const summary = state.performanceAuditLastSummary
        ? sanitizePerformanceAuditSummary(state.performanceAuditLastSummary)
        : startPerformanceAudit({});
      const phase = clean(detail.phase, "", 48);
      const name = clean(detail.name, "none", 48);
      const action = clean(detail.action, "none", 48);
      const mode = clean(detail.mode, "", 32);
      const event = {
        kind: eventKind,
        phase,
        name,
        action,
        ok: detail.ok !== false,
        suppressed: detail.suppressed === true,
        mode,
        at: nowMs()
      };
      state.performanceAuditEvents = Array.isArray(state.performanceAuditEvents) ? state.performanceAuditEvents : [];
      state.performanceAuditEvents.push(event);
      state.performanceAuditEvents = state.performanceAuditEvents.slice(-16);

      const next = {
        ...summary,
        actual: { ...summary.actual },
        tts: { ...summary.tts },
        suppressed: Array.isArray(summary.suppressed) ? summary.suppressed.slice(0, 8) : [],
        last_event: eventKind,
        updated_at: event.at
      };

      if (eventKind === "timeline_phase") {
        const value = event.suppressed ? "suppressed" : name;
        if (phase === "prereaction" || phase === "pre_reaction") next.actual.pre = value;
        else if (phase === "speechstart" || phase === "speech_start") next.actual.speech = value;
        else if (phase === "postsettle" || phase === "post_settle") {
          next.actual.post = value;
          next.settled = event.ok && !event.suppressed;
          next.status = next.settled ? "settled" : "post_pending";
        } else if (phase === "speechbeat" || phase === "speech_beat") {
          next.actual.beats = cleanInt(next.actual.beats, 0, 0, 8) + 1;
        }
        if (action && action !== "none") {
          next.actual.action_dispatches = cleanInt(next.actual.action_dispatches, 0, 0, 20) + 1;
        }
        if (detail.pulse === true) {
          next.actual.pulse_dispatches = cleanInt(next.actual.pulse_dispatches, 0, 0, 20) + 1;
        }
        if (event.suppressed && !next.suppressed.includes(name)) {
          next.suppressed.push(name);
        }
      } else if (eventKind === "tts_start") {
        next.tts.started = true;
        next.tts.mode = mode || next.tts.mode || "direct";
        next.status = "speaking";
      } else if (eventKind === "tts_end") {
        next.tts.finished = event.ok;
        next.tts.mode = mode || next.tts.mode || "direct";
        next.status = event.ok ? "speech_done" : "speech_failed";
      } else if (eventKind === "tts_handoff") {
        next.tts.started = true;
        next.tts.mode = mode || "stream";
        next.status = "stream_handoff";
      } else if (eventKind === "failure") {
        next.status = "failed";
      }

      perfLog("performance_audit", eventKind, event);
      return attachSummary(next);
    }

    function finishPerformanceAudit(extra = {}) {
      const summary = state.performanceAuditLastSummary
        ? sanitizePerformanceAuditSummary(state.performanceAuditLastSummary)
        : startPerformanceAudit({});
      return attachSummary({
        ...summary,
        status: clean(extra.status, summary.settled ? "settled" : "finished", 32),
        last_event: clean(extra.lastEvent, "finished", 48),
        updated_at: nowMs()
      });
    }

    return {
      sanitizePerformanceAuditSummary,
      startPerformanceAudit,
      recordPerformanceAuditEvent,
      finishPerformanceAudit
    };
  }

  const api = {
    sanitizePerformanceAuditSummary,
    createController
  };

  root.TaffyPerformanceAuditController = api;
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof window !== "undefined" ? window : globalThis);
