(function (root) {
  "use strict";

  function normalizeStringList(value) {
    return Array.isArray(value)
      ? value.map((item) => String(item || "").trim()).filter(Boolean)
      : [];
  }

  function safeObject(value) {
    return value && typeof value === "object" && !Array.isArray(value) ? value : {};
  }

  function buildBackendEntryView(state = {}) {
    const summary = state.followupReadinessBackendEntrySummary;
    const safeSummary = safeObject(summary);
    const guardContract = safeObject(safeSummary.guard_contract);
    const executionPreview = safeObject(safeSummary.entry_execution_preview);
    return {
      loaded: summary && typeof summary === "object",
      loading: state.followupReadinessBackendEntryLoading === true,
      error: String(state.followupReadinessBackendEntryError || ""),
      readOnly: safeSummary.read_only === true,
      skeletonOnly: safeSummary.skeleton_only === true,
      defaultOffBaseline: safeSummary.default_off_baseline === true,
      configuredEnabled: safeSummary.configured_enabled === true,
      configuredReturnMetadata: safeSummary.configured_return_metadata === true,
      configuredDemoStable: safeSummary.configured_demo_stable === true,
      configuredPersonaOverrideEnabled: safeSummary.configured_persona_override_enabled === true,
      explicitEnableRequired: safeSummary.explicit_enable_required === true,
      automaticRuntimeConnected: safeSummary.automatic_runtime_connected === true,
      schedulerDefaultChanged: safeSummary.scheduler_default_changed === true,
      configWriteEnabled: safeSummary.config_write_enabled === true,
      runtimeCueEnabled: safeSummary.runtime_cue_enabled === true,
      live2dEnabled: safeSummary.live2d_enabled === true,
      ttsEnabled: safeSummary.tts_enabled === true,
      entryReady: safeSummary.entry_ready === true,
      blockedReasons: normalizeStringList(safeSummary.blocked_reasons),
      guardContractReadOnly: guardContract.read_only === true,
      guardContractFailClosed: guardContract.fail_closed === true,
      guardContractRequiredChecks: normalizeStringList(guardContract.required_checks),
      guardContractDisallowedActions: normalizeStringList(guardContract.disallowed_actions),
      guardContractRollbackSteps: normalizeStringList(guardContract.rollback),
      guardContractOperatorConfirmation: String(guardContract.operator_confirmation || ""),
      previewReadOnly: executionPreview.read_only === true,
      previewDryRun: executionPreview.dry_run === true,
      previewAccepted: executionPreview.accepted === true,
      previewWouldExecute: executionPreview.would_execute === true,
      previewRequestType: String(executionPreview.request_type || ""),
      previewRequestedAction: String(executionPreview.requested_action || ""),
      previewBlockedReasons: normalizeStringList(executionPreview.blocked_reasons),
      nextAction: String(safeSummary.next_action || ""),
      lastRefreshAt: Number(state.followupReadinessBackendEntryLastRefreshAt || 0),
      lastSuccessAt: Number(state.followupReadinessBackendEntryLastSuccessAt || 0)
    };
  }

  function buildPreviewCardData(snapshotInput = null, helpers = {}) {
    const snapshot = safeObject(snapshotInput);
    const followup = safeObject(snapshot.followup);
    const silence = safeObject(snapshot.silence);
    const scheduler = safeObject(snapshot.proactiveScheduler);
    const getCharacterState = typeof helpers.getCharacterState === "function"
      ? helpers.getCharacterState
      : () => ({ label: "n/a", mood: "n/a" });
    const getScenarioLabel = typeof helpers.getScenarioLabel === "function" ? helpers.getScenarioLabel : () => "";
    const characterState = safeObject(getCharacterState(followup, silence, scheduler));
    const selected = safeObject(followup.selectedReaction);
    const candidate = safeObject(selected.candidate);
    const scenarioLabel = getScenarioLabel() || "\u672a\u9009\u62e9";
    const candidateText = String(candidate.text || followup.characterPreview || "").trim() || "n/a";
    const tone = String(selected.preferredTone || candidate.tone || safeObject(followup.characterCue).tone || "n/a");
    const policy = String(followup.policy || "n/a");
    const blockedReasons = Array.isArray(followup.blockedReasons) ? followup.blockedReasons.slice() : [];
    return {
      scenarioLabel,
      characterLabel: String(characterState.label || "n/a"),
      characterMood: String(characterState.mood || "n/a"),
      pending: followup.pending === true,
      topicHint: String(followup.topicHint || "").trim(),
      eligible: followup.eligible === true,
      blockedReasons,
      policy,
      tone,
      selectedIndex: Number.isFinite(Number(selected.index)) ? Number(selected.index) : -1,
      candidateText,
      blocked: blockedReasons.length ? blockedReasons.join(",") : "none"
    };
  }

  function buildManualConfirmationData(input = {}) {
    const data = safeObject(input.previewData);
    const snapshot = safeObject(input.snapshot);
    const silence = safeObject(snapshot.silence);
    const scheduler = safeObject(snapshot.proactiveScheduler);
    const helpers = safeObject(input.helpers);
    const normalizeToken = typeof helpers.normalizeToken === "function"
      ? helpers.normalizeToken
      : (value) => String(value || "").replace(/\s+/g, " ").trim();
    const buildKey = typeof helpers.buildKey === "function" ? helpers.buildKey : () => "";
    const dismissedKeys = input.dismissedKeys instanceof Set ? input.dismissedKeys : new Set();
    const candidateText = data.candidateText === "n/a"
      ? ""
      : normalizeToken(data.candidateText);
    const hasCandidate = !!candidateText;
    const blockedReasons = []
      .concat(Array.isArray(data.blockedReasons) ? data.blockedReasons : [])
      .concat(Array.isArray(silence.blockedReasons) ? silence.blockedReasons : [])
      .concat(Array.isArray(scheduler.blockedReasons) ? scheduler.blockedReasons : []);
    const key = buildKey({
      topicHint: data.topicHint,
      policy: data.policy,
      candidateText
    });
    const dismissed = !!key && dismissedKeys.has(key);
    const hidden = data.pending !== true || !hasCandidate;
    const available = hidden !== true
      && data.eligible === true
      && silence.eligibleForSilenceFollowup === true
      && scheduler.eligibleForSchedulerTick === true
      && blockedReasons.length === 0;
    const blocked = hidden !== true && !available;
    const status = hidden
      ? "hidden"
      : dismissed
        ? "dismissed"
        : available
          ? "available"
          : "blocked";
    return {
      ...data,
      candidateText,
      hasCandidate,
      blockedReasons,
      key,
      dismissed,
      hidden,
      available,
      blocked,
      status,
      silenceEligible: silence.eligibleForSilenceFollowup === true,
      schedulerEligible: scheduler.eligibleForSchedulerTick === true
    };
  }

  function buildManualConfirmationDebugPayload(confirmation = {}, result = "", helpers = {}) {
    const sanitizeText = typeof helpers.sanitizeText === "function"
      ? helpers.sanitizeText
      : (value) => String(value || "");
    const blockedSummary = Array.isArray(confirmation.blockedReasons)
      ? confirmation.blockedReasons.join(",")
      : "";
    const policy = String(confirmation.policy || "");
    const error = [policy, blockedSummary].filter(Boolean).join(";");
    return {
      text: String(confirmation.topicHint || ""),
      result: sanitizeText(result || confirmation.status || "", 80),
      error: sanitizeText(error, 140)
    };
  }

  const api = {
    buildBackendEntryView,
    buildPreviewCardData,
    buildManualConfirmationData,
    buildManualConfirmationDebugPayload
  };

  const ns = (root.TaffyModules = root.TaffyModules || {});
  ns.followupReadinessPanelModel = api;

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
}(typeof globalThis !== "undefined" ? globalThis : window));
