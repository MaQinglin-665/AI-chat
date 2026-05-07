(function (root) {
  "use strict";

  function normalizeLimit(limit, min = 1, max = 100, fallback = 24) {
    return Number.isFinite(Number(limit))
      ? Math.max(min, Math.min(max, Math.round(Number(limit))))
      : fallback;
  }

  function buildAuditSummary(input = {}, options = {}) {
    const preflight = input.preflight || {};
    const dryRun = preflight.dryRun || {};
    const now = typeof options.now === "function" ? options.now : Date.now;
    return {
      readOnly: true,
      generatedAt: now(),
      status: preflight.status,
      armed: input.armed === true,
      polling: input.polling === true,
      session: input.session || {},
      dryRun,
      blockedReasons: Array.isArray(dryRun.blockedReasons) ? dryRun.blockedReasons.slice() : [],
      events: input.events || {},
      safety: {
        defaultOffRequired: true,
        explicitArmConfirmationRequired: true,
        resetConfirmationRequired: true,
        emergencyStopAvailable: true,
        noDesktopObservation: true,
        noFileAccess: true,
        noToolCalls: true,
        noConfigWrites: true,
        noModelOrTtsCall: true
      }
    };
  }

  function buildPreRunChecklist(input = {}, options = {}) {
    const mode = input.mode || {};
    const scheduler = input.scheduler || {};
    const preflight = input.preflight || {};
    const session = input.session || {};
    const explainReasons = typeof options.explainReasons === "function"
      ? options.explainReasons
      : (reasons) => Array.isArray(reasons) && reasons.length ? reasons.join(",") : "none";
    const armed = mode.grayAutoEnabled === true && mode.grayAutoTrialEnabled === true;
    const polling = scheduler.pollTimerActive === true;
    const blockedReasons = Array.isArray(preflight.dryRun?.blockedReasons)
      ? preflight.dryRun.blockedReasons.slice()
      : Array.isArray(preflight.gateBlockedReasons) ? preflight.gateBlockedReasons.slice() : [];
    const items = [
      {
        key: "runbook_visible",
        label: "Runbook and panel guidance are available",
        ok: true,
        required: true,
        note: "Use the runbook before a real controlled trial."
      },
      {
        key: "explicit_arm",
        label: "Trial is explicitly armed",
        ok: armed,
        required: true,
        note: armed ? "In-memory gray trial gates are open." : "Use Arm only after typing the confirmation phrase."
      },
      {
        key: "polling_observable",
        label: "Polling state is visible",
        ok: true,
        required: true,
        note: polling ? "Polling timer is active." : "Polling timer is currently off."
      },
      {
        key: "session_cap",
        label: "Session cap still allows a trial",
        ok: session.reached !== true && Number(session.max || 0) > 0,
        required: true,
        note: `session=${session.count}/${session.max}; remaining=${session.remaining}`
      },
      {
        key: "emergency_stop",
        label: "Emergency stop is available",
        ok: true,
        required: true,
        note: "Use Emergency Stop first if anything feels wrong."
      },
      {
        key: "disarm",
        label: "Disarm is available",
        ok: true,
        required: true,
        note: "Disarm closes in-memory gray gates and stops polling."
      },
      {
        key: "runtime_guards",
        label: "Runtime guards allow trigger observation",
        ok: preflight.status === "ready_for_local_trial",
        required: false,
        note: preflight.status === "ready_for_local_trial"
          ? "A poll would be allowed to attempt a trigger if it runs."
          : explainReasons(blockedReasons)
      },
      {
        key: "manual_watch",
        label: "Manual watch is required",
        ok: true,
        required: true,
        note: "Keep the trial watched; automatic follow-up is not promoted to normal use."
      }
    ];
    const requiredReady = items
      .filter((item) => item.required === true)
      .every((item) => item.ok === true);
    return {
      readOnly: true,
      status: preflight.status,
      readyForWatchedTrial: requiredReady,
      readyForTriggerObservation: preflight.status === "ready_for_local_trial",
      armed,
      polling,
      session,
      blockedReasons,
      items,
      nextAction: requiredReady
        ? preflight.status === "ready_for_local_trial"
          ? "Watch the trial; keep Emergency Stop and Disarm ready."
          : "The control surface is ready, but runtime guards still block an automatic trigger."
        : "Complete required checklist items before a real controlled trial."
    };
  }

  function buildTimeline(eventsInput = [], options = {}) {
    const safeLimit = normalizeLimit(options.limit, 6, 100, 32);
    const parseResult = typeof options.parseResult === "function" ? options.parseResult : () => ({});
    const sanitizeText = typeof options.sanitizeText === "function"
      ? options.sanitizeText
      : (value) => String(value || "");
    const events = Array.isArray(eventsInput) ? eventsInput : [];
    const relevant = events
      .filter((event) => {
        const stage = String(event?.stage || "");
        return stage.startsWith("conversation_followup_gray_auto_trial_")
          || stage === "conversation_followup_gray_auto_dry_run_checked"
          || stage.startsWith("proactive_scheduler_poll_");
      })
      .slice(-safeLimit);
    const entries = relevant.map((event) => {
      const stage = String(event?.stage || "");
      const parsed = parseResult(event?.result || "");
      const category = stage.startsWith("proactive_scheduler_poll_")
        ? "poll"
        : stage === "conversation_followup_gray_auto_dry_run_checked" ? "dry_run" : "control";
      return {
        seq: Number(event?.seq || 0),
        ageMs: Number(event?.ageMs || 0),
        stage,
        category,
        result: parsed.base || sanitizeText(event?.result || "", 160),
        trialStatus: parsed.trialStatus || "",
        gates: parsed.gates || "",
        wouldPoll: parsed.wouldPoll,
        wouldTrigger: parsed.wouldTrigger,
        blocked: sanitizeText(event?.error || "", 180),
        text: sanitizeText(event?.text || "", 120)
      };
    });
    const last = entries.length ? entries[entries.length - 1] : null;
    return {
      readOnly: true,
      limit: safeLimit,
      total: entries.length,
      last,
      hasArm: entries.some((entry) => entry.stage === "conversation_followup_gray_auto_trial_armed"),
      hasStop: entries.some((entry) => entry.stage === "conversation_followup_gray_auto_trial_emergency_stop"),
      hasDisarm: entries.some((entry) => entry.stage === "conversation_followup_gray_auto_trial_disarmed"),
      hasTriggerSuccess: entries.some((entry) => entry.stage === "proactive_scheduler_poll_trigger_success"),
      hasTriggerBlocked: entries.some((entry) => entry.stage === "proactive_scheduler_poll_trigger_blocked"),
      entries
    };
  }

  function buildOutcome(input = {}, options = {}) {
    const timeline = input.timeline || {};
    const checklist = input.checklist || {};
    const preflight = input.preflight || {};
    const session = input.session || {};
    const explainReason = typeof options.explainReason === "function"
      ? options.explainReason
      : (reason) => String(reason || "");
    const entries = Array.isArray(timeline.entries) ? timeline.entries : [];
    const last = timeline.last || null;
    let outcome = "not_started";
    let severity = "info";
    let summary = "No gray trial control or polling events are visible yet.";
    let nextAction = "Open the readiness panel, review the runbook, then arm only during a watched local test.";
    if (timeline.hasTriggerSuccess) {
      outcome = "success";
      severity = "success";
      summary = "A controlled automatic follow-up trigger succeeded.";
      nextAction = "Confirm the session cap stopped further triggers, then Disarm after review.";
    } else if (timeline.hasStop) {
      outcome = "stopped";
      severity = "safe";
      summary = "Emergency Stop sealed the current trial session.";
      nextAction = "Review the timeline, then Disarm if the trial is still armed.";
    } else if (timeline.hasDisarm) {
      outcome = "disarmed";
      severity = "safe";
      summary = "The gray trial was disarmed and polling should be off.";
      nextAction = "Review audit/timeline output before deciding whether another watched trial is needed.";
    } else if (timeline.hasTriggerBlocked) {
      outcome = "trigger_blocked";
      severity = "warn";
      summary = "A poll attempted to trigger, but the trigger path was blocked.";
      nextAction = "Inspect the latest blocked reason and keep the session watched before retrying.";
    } else if (entries.some((entry) => entry.stage === "proactive_scheduler_poll_ready")) {
      outcome = "ready_observed";
      severity = "warn";
      summary = "Polling observed a ready state, but no trigger success is recorded yet.";
      nextAction = "Keep Emergency Stop visible and continue watching for trigger success or blocked events.";
    } else if (entries.some((entry) => entry.stage === "proactive_scheduler_poll_blocked")) {
      outcome = "blocked";
      severity = "info";
      summary = "Polling is visible but currently blocked by gates or runtime guards.";
      nextAction = "Use the root-cause suggestions before retrying; do not bypass guards.";
    } else if (timeline.hasArm && checklist.readyForWatchedTrial !== true) {
      outcome = "setup_incomplete";
      severity = "warn";
      summary = "The trial was armed, but required pre-run checklist items are not all satisfied.";
      nextAction = "Fix required checklist items or Disarm before continuing.";
    } else if (timeline.hasArm) {
      outcome = "armed_waiting";
      severity = "info";
      summary = "The trial is armed and waiting for polling/runtime guard progress.";
      nextAction = "Watch the timeline and use Emergency Stop if anything feels wrong.";
    }
    const blockedReasons = Array.from(new Set([
      ...(Array.isArray(checklist.blockedReasons) ? checklist.blockedReasons : []),
      ...(Array.isArray(preflight.dryRun?.blockedReasons) ? preflight.dryRun.blockedReasons : []),
      ...(last?.blocked ? String(last.blocked).split(",").map((item) => item.trim()).filter(Boolean) : [])
    ]));
    const rootCauses = blockedReasons.length
      ? blockedReasons.slice(0, 8).map((reason) => ({
        reason,
        explanation: explainReason(reason)
      }))
      : [];
    return {
      readOnly: true,
      outcome,
      severity,
      summary,
      nextAction,
      status: preflight.status,
      armed: checklist.armed === true,
      polling: checklist.polling === true,
      session,
      timeline: {
        total: timeline.total,
        lastStage: last?.stage || "none",
        hasArm: timeline.hasArm,
        hasStop: timeline.hasStop,
        hasDisarm: timeline.hasDisarm,
        hasTriggerSuccess: timeline.hasTriggerSuccess,
        hasTriggerBlocked: timeline.hasTriggerBlocked
      },
      rootCauses,
      safety: {
        readOnly: true,
        noEventEmission: true,
        noPollingStart: true,
        noFollowupExecution: true,
        noConfigWrites: true
      }
    };
  }

  function buildGoNoGoDecision(input = {}) {
    const outcome = input.outcome || {};
    const checklist = input.checklist || {};
    const timeline = input.timeline || {};
    const requiredItems = Array.isArray(checklist.items)
      ? checklist.items.filter((item) => item.required === true)
      : [];
    const missingRequired = requiredItems.filter((item) => item.ok !== true);
    let decision = "NO_GO";
    let reason = "Required pre-run checklist items are not complete.";
    let nextAction = "Do not run a real controlled trial yet; complete the checklist or Disarm.";
    if (outcome.outcome === "success") {
      decision = "REVIEW_AFTER_SUCCESS";
      reason = "A successful trigger is visible; review cap, timeline, and disarm state before another attempt.";
      nextAction = "Copy audit/timeline, confirm session cap, then Disarm if still armed.";
    } else if (outcome.outcome === "stopped" || outcome.outcome === "disarmed") {
      decision = "NO_GO";
      reason = `Trial is ${outcome.outcome}; do not continue without a fresh explicit decision.`;
      nextAction = "Review the timeline and only reset/arm again during a watched local test.";
    } else if (missingRequired.length === 0 && outcome.outcome === "armed_waiting") {
      decision = "GO_FOR_WATCHED_TRIAL";
      reason = "Required safety controls are visible and the trial is armed, but it still needs manual watch.";
      nextAction = "Keep Emergency Stop and Disarm visible while watching the timeline.";
    } else if (missingRequired.length === 0 && outcome.outcome === "ready_observed") {
      decision = "GO_FOR_WATCHED_TRIAL";
      reason = "A ready poll state was observed, but no trigger success is recorded yet.";
      nextAction = "Continue watching for trigger success or blocked events; stop immediately if behavior feels wrong.";
    } else if (missingRequired.length === 0 && (outcome.outcome === "blocked" || outcome.outcome === "trigger_blocked")) {
      decision = "WATCH_ONLY";
      reason = "The trial surface is safe, but guards or trigger checks are blocking.";
      nextAction = "Do not bypass guards; inspect root causes before retrying.";
    } else if (missingRequired.length === 0 && outcome.outcome === "not_started") {
      decision = "WATCH_ONLY";
      reason = "The panel is ready for review, but no trial has been explicitly armed.";
      nextAction = "Arm only after a fresh human decision and confirmation phrase.";
    }
    return {
      readOnly: true,
      decision,
      reason,
      nextAction,
      outcome: outcome.outcome,
      severity: outcome.severity,
      status: outcome.status,
      readyForWatchedTrial: checklist.readyForWatchedTrial === true,
      readyForTriggerObservation: checklist.readyForTriggerObservation === true,
      missingRequired: missingRequired.map((item) => ({
        key: item.key,
        label: item.label,
        note: item.note
      })),
      rootCauses: outcome.rootCauses,
      timeline: {
        total: timeline.total,
        lastStage: timeline.last?.stage || "none",
        hasTriggerSuccess: timeline.hasTriggerSuccess,
        hasTriggerBlocked: timeline.hasTriggerBlocked,
        hasStop: timeline.hasStop,
        hasDisarm: timeline.hasDisarm
      },
      guardrails: [
        "Keep automatic follow-up default-off outside local controlled testing.",
        "Arm only with explicit human confirmation.",
        "Keep Emergency Stop and Disarm visible during a watched trial.",
        "Do not bypass cooldown, silence, policy, busy/speaking, window, or session-cap guards.",
        "No desktop observation, screenshots, file access, shell execution, tool calls, backend APIs, or config writes."
      ]
    };
  }

  function buildSignoffPackage(input = {}, options = {}) {
    const decision = input.decision || {};
    const outcome = input.outcome || {};
    const checklist = input.checklist || {};
    const timeline = input.timeline || {};
    const now = typeof options.now === "function" ? options.now : Date.now;
    const trialId = [
      "gray-trial",
      decision.outcome,
      timeline.last?.seq || 0,
      now()
    ].join("-");
    const manualChecks = [
      "Emergency Stop button was visible during the trial.",
      "Disarm button was visible during the trial.",
      "No desktop observation, screenshots, file access, shell execution, tool calls, backend APIs, or config writes were introduced.",
      "Session cap behavior was reviewed.",
      "Timeline and audit output were copied before any retry.",
      "A human explicitly approved any new Arm action."
    ];
    const stageRecommendation = decision.decision === "REVIEW_AFTER_SUCCESS"
      ? "Ready to review for the next phase after manual sign-off."
      : decision.decision === "GO_FOR_WATCHED_TRIAL"
        ? "Ready only for a watched local trial, not normal use."
        : "Not ready for the next phase.";
    return {
      readOnly: true,
      trialId,
      decision: decision.decision,
      outcome: outcome.outcome,
      severity: outcome.severity,
      stageRecommendation,
      summary: outcome.summary,
      nextAction: decision.nextAction,
      missingRequired: decision.missingRequired,
      rootCauses: decision.rootCauses,
      timeline: decision.timeline,
      manualChecks,
      signoff: {
        tester: "",
        reviewedAt: "",
        approvedForNextPhase: false,
        notes: ""
      },
      safety: {
        readOnly: true,
        clipboardOnlyAfterClick: true,
        noEventEmission: true,
        noPollingStart: true,
        noFollowupExecution: true,
        noConfigWrites: true
      },
      checklistReady: checklist.readyForWatchedTrial === true
    };
  }

  const api = {
    normalizeLimit,
    buildAuditSummary,
    buildPreRunChecklist,
    buildTimeline,
    buildOutcome,
    buildGoNoGoDecision,
    buildSignoffPackage
  };

  root.TaffyGrayTrialReadinessModel = api;
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : window);
