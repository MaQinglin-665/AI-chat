const CHAT_STATE = window.TaffyChatState || {};
const state = CHAT_STATE.createInitialState();
window.__petState = state;

function createPerfTraceId(prefix = "chat") {
  const safePrefix = String(prefix || "chat").replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 12) || "chat";
  return `${safePrefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function perfLog(scope, stage, payload = {}) {
  try {
    console.info(`[perf][${scope}][${stage}]`, payload);
  } catch (_) {
    // ignore logging errors
  }
}

let diagnosticsRuntimeController = null;

function getDiagnosticsRuntimeController() {
  if (!diagnosticsRuntimeController && typeof DIAGNOSTICS_RUNTIME_CONTROLLER.createController === "function") {
    diagnosticsRuntimeController = DIAGNOSTICS_RUNTIME_CONTROLLER.createController({
      state,
      windowObject: window,
      navigatorObject: navigator,
      performanceObject: performance,
      authFetch,
      debugPanelController: DEBUG_PANEL_CONTROLLER,
      doctorDiagnostics: window.TaffyDoctorDiagnostics || {},
      chatTranslationService: CHAT_TRANSLATION_SERVICE,
      appendMessage,
      setStatus,
      isServerTTSProvider,
      requestServerTTSBlob,
      buildSpeakProsody,
      createPerfTraceId,
      buildTTSDebugReport,
      isTranslationCircuitOpen: _isTranslationCircuitOpen,
      chatTranslateTimeoutMs: _CHAT_TRANSLATE_TIMEOUT_MS,
      grayTrial: {
        getTTSDebugSnapshot,
        buildGrayAutoFollowupTrialPreflight,
        buildGrayAutoFollowupTrialEventSummary,
        buildGrayAutoTrialAuditSummary,
        buildGrayAutoTrialPreRunChecklist,
        buildGrayAutoTrialTimeline,
        buildGrayAutoTrialOutcome,
        buildGrayAutoTrialGoNoGoDecision,
        buildGrayAutoTrialSignoffPackage,
        buildFollowupReadinessReport,
        armGrayAutoTrialSession,
        stopGrayAutoTrialSession,
        disarmGrayAutoTrialSession,
        resetGrayAutoTrialSessionTriggerCount
      }
    });
  }
  return diagnosticsRuntimeController || DIAGNOSTICS_RUNTIME_CONTROLLER;
}

function sanitizeTTSDebugText(text, maxLen = 96) { return getDiagnosticsRuntimeController().sanitizeTTSDebugText(text, maxLen); }
function recordTTSDebugEvent(stage, payload = {}) { return getDiagnosticsRuntimeController().recordTTSDebugEvent(stage, payload); }
function recordTTSAudioEvent(stage, audio, debugContext = {}, extra = {}) {
  return getDiagnosticsRuntimeController().recordTTSAudioEvent(stage, audio, debugContext, extra);
}

function getFollowupControllerDeps() {
  return {
    state,
    ui,
    windowObject: window,
    documentObject: document,
    performanceObject: performance,
    followupReadinessView: FOLLOWUP_READINESS_VIEW,
    grayTrialReadinessModel: GRAY_TRIAL_READINESS_MODEL,
    grayTrialCharacterView: GRAY_TRIAL_CHARACTER_VIEW,
    grayTrialCharacterModel: GRAY_TRIAL_CHARACTER_MODEL,
    grayTrialAutoRuntimeSwitchModel: GRAY_TRIAL_AUTO_RUNTIME_SWITCH_MODEL,
    characterReplyCue: CHARACTER_REPLY_CUE,
    characterTuning: CHARACTER_TUNING,
    recordTTSDebugEvent,
    sanitizeTTSDebugText,
    recordTTSAudioEvent,
    updateTTSDebugPanel,
    requestAssistantReply,
    setStatus,
    appendMessage,
    buildSpeakProsody,
    speak,
    updateSpeakButton,
    authFetch,
    recordCharacterPerformanceFeedback,
    handleCharacterRuntimeMetadata,
    applyCharacterRuntimeEmotionToLive2D,
    applyCharacterRuntimeActionToLive2D,
    updateReplyCharacterChip,
    updateFollowupCharacterChip,
    updateFollowupReadinessPanel,
    syncProactiveSchedulerPolling,
    buildGrayAutoFollowupTrialEventContext,
    mergeProactiveSchedulerPollEventResult,
    mergeProactiveSchedulerPollEventError,
    getTTSDebugSnapshot,
    buildConversationFollowupPromptDraft,
    buildConversationFollowupDebugPlan,
    getConversationFollowupPolicyDebugText,
    buildConversationFollowupPolicy,
    previewConversationFollowupPolicy,
    buildConversationFollowupReactionCandidates,
    selectConversationFollowupReactionCandidate,
    buildConversationFollowupCharacterCue,
    getGrayAutoTrialSessionTriggerCount,
    buildGrayAutoTrialSessionState,
    incrementGrayAutoTrialSessionTriggerCount,
    isGrayAutoTrialSessionLimitReached,
    shouldEnableProactiveSchedulerPolling,
    getProactiveSchedulerPollingGateStatus,
    stopGrayAutoTrialSession,
    armGrayAutoTrialSession,
    disarmGrayAutoTrialSession,
    resetGrayAutoTrialSessionTriggerCount,
    buildFollowupReadinessReport,
    buildGrayAutoTrialAuditSummary,
    buildGrayAutoTrialPreRunChecklist,
    buildGrayAutoTrialTimeline,
    buildGrayAutoTrialOutcome,
    buildGrayAutoTrialGoNoGoDecision,
    buildGrayAutoTrialSignoffPackage,
    buildGrayAutoTrialPreRunChecklistText,
    buildGrayAutoTrialTimelineText,
    buildGrayAutoTrialOutcomeText,
    buildGrayAutoTrialGoNoGoDecisionText,
    buildGrayAutoTrialSignoffPackageText,
    buildGrayAutoTrialCharacterCuePreviewText,
    buildGrayAutoTrialCharacterCueHandoffChecklistText,
    buildGrayAutoTrialCharacterCueManualEmitRecapText,
    buildGrayAutoTrialCharacterManualCueStatusCardText,
    buildGrayAutoTrialCharacterExpressionStrategyDraftText,
    buildGrayAutoTrialCharacterExpressionStrategyReviewPackageText,
    buildGrayAutoTrialCharacterAutoRuntimeSafetyPlanText,
    buildGrayAutoTrialCharacterAutoRuntimeDryRunText,
    buildGrayAutoTrialCharacterAutoRuntimeExplicitSwitchPlanText,
    buildGrayAutoTrialCharacterAutoRuntimeExplicitSwitchReviewPackageText,
    buildGrayAutoTrialCharacterAutoRuntimeSwitchAcceptancePackageText,
    buildGrayAutoTrialCharacterAutoRuntimeExplicitSwitchControlText,
    buildGrayAutoTrialCharacterAutoRuntimeSwitchControlDiagnosticsText,
    buildGrayAutoTrialCharacterAutoRuntimeExplicitSwitchRollbackPackageText,
    buildGrayAutoTrialCharacterAutoRuntimeFinalPreflightText,
    buildGrayAutoTrialCharacterAutoRuntimeSeparateImplementationDraftText,
    getGrayAutoTrialCharacterAutoRuntimeExplicitSwitchState,
    enableGrayAutoTrialCharacterAutoRuntimeExplicitSwitch,
    disableGrayAutoTrialCharacterAutoRuntimeExplicitSwitch,
    rollbackGrayAutoTrialCharacterAutoRuntimeExplicitSwitch,
    emitGrayAutoTrialCharacterCueViaManualBridge,
    emitLastReplyCharacterCueCandidateViaManualBridge,
    updateFollowupReadinessBackendEntryCard,
    refreshFollowupReadinessBackendEntrySummary,
    updateGrayAutoTrialControlPanel,
    updateGrayAutoTrialCharacterManualCueStatusCard,
    updateReplyCharacterCueCandidateManualSendButton,
    buildFollowupReadinessPreviewCardData,
    buildFollowupReadinessPreviewCardText,
    buildFollowupReadinessPreviewCopyBundleText,
    buildFollowupReadinessPreviewJsonText,
    buildFollowupReadinessPreviewOneLineText,
    buildFollowupConfigTemplate,
    runConversationFollowupDebug,
    runProactiveSchedulerManualTick,
    runConversationSilenceFollowupDryRun,
    runConversationFollowupPendingFixture,
    rehearseConversationFollowupPending,
    clearConversationFollowupRehearsal,
    getFollowupRehearsalScenario,
    getFollowupRehearsalScenarioLabel,
    writeTextToClipboard,
    buildGrayAutoFollowupReadinessStatus,
    buildGrayAutoFollowupDryRunStatus,
    buildGrayAutoFollowupTrialPreflight,
    buildGrayAutoFollowupTrialEventSummary,
    buildGrayAutoTrialAuditSummaryText,
    buildFollowupReadinessBackendEntryView,
    buildFollowupReadinessBackendEntryCardText,
    buildFollowupReadinessFriendlySummary,
    explainReadinessReason,
    explainReadinessReasons,
    joinReadinessReasons,
    formatReadinessBool,
    formatReadinessMs,
    buildFollowupCharacterState,
    previewConversationFollowupReactions,
    buildFollowupCharacterChipTitle,
    buildReplyCharacterChipView,
    buildFollowupCharacterRuntimeHint,
    normalizeGrayAutoTrialCharacterCuePresetKey,
    listGrayAutoTrialCharacterCuePresets,
    resolveGrayAutoTrialCharacterCuePreset,
    previewAssistantReplyCharacterCueCandidate,
    maybeAutoApplyAssistantReplyCharacterCueCandidate,
    maybeEmitFollowupCharacterRuntimeHint,
    buildFollowupAwareIdleMotionContext,
    buildGrayAutoTrialCharacterCuePreview,
    buildGrayAutoTrialCharacterCueHandoffChecklist,
    getGrayAutoTrialCharacterCueManualEmitStatus,
    buildGrayAutoTrialCharacterCueManualEmitRecap,
    buildGrayAutoTrialCharacterExpressionStrategyDraft,
    buildGrayAutoTrialCharacterExpressionStrategyReviewPackage,
    buildGrayAutoTrialCharacterAutoRuntimeSafetyPlan,
    buildGrayAutoTrialCharacterAutoRuntimeDryRun,
    buildGrayAutoTrialCharacterAutoRuntimeExplicitSwitchPlan,
    buildGrayAutoTrialCharacterAutoRuntimeExplicitSwitchReviewPackage,
    buildGrayAutoTrialCharacterAutoRuntimeSwitchAcceptancePackage,
    buildGrayAutoTrialCharacterAutoRuntimeExplicitSwitchControl,
    buildGrayAutoTrialCharacterAutoRuntimeSwitchControlDiagnostics,
    buildGrayAutoTrialCharacterAutoRuntimeExplicitSwitchRollbackPackage,
    buildGrayAutoTrialCharacterAutoRuntimeFinalPreflight,
    buildGrayAutoTrialCharacterAutoRuntimeSeparateImplementationDraft,
    emitGrayAutoTrialCharacterCueManually,
    previewGrayAutoTrialCharacterCueBackendBridge,
    getSelectedGrayAutoTrialCharacterCuePresetKey,
    getGrayAutoTrialMaxTriggersPerSession,
    buildGrayAutoTrialRunbook,
    buildProactiveSchedulerDebugSnapshot,
    buildConversationSilenceDebugSnapshot,
    buildConversationFollowupDebugView,
    snapshotConversationFollowupPending,
    restoreConversationFollowupPending,
    clearConversationFollowupPending,
    getConversationFollowupRehearsalBlockedReason,
    runFollowupReadinessPanelRehearsal,
    clearFollowupReadinessPanelRehearsal,
    snapshotConversationFollowupPendingFixtureState,
    restoreConversationFollowupPendingFixtureState,
    runProactiveSchedulerPollingCheck,
    normalizeProactiveSchedulerPollFailureReason,
    injectProactiveSchedulerPollFailureOnce,
    getProactiveSchedulerFailureInjectionState,
    clearProactiveSchedulerFailureInjection,
    consumeProactiveSchedulerPollFailureInjection,
    stopProactiveSchedulerPolling,
    startProactiveSchedulerPolling,
    buildTTSDebugReport,
    parseGrayTrialPollEventResult,
    runGrayAutoFollowupDryRunDebug,
    formatFollowupReactionCandidateSummary,
    getFollowupCharacterStateDebugView,
    localizeReplyCharacterValue,
    buildAssistantReplyCharacterExpressionCue,
    buildAssistantReplyCharacterCueCandidate,
    normalizeRuntimeVoiceStyle,
    runtimeVoiceStyleToTalkStyle,
    isReplyCueAutoApplyEnabled,
    startFollowupCharacterChipRefresh,
    buildFollowupRehearsalScenarioCompareRows,
    buildFollowupRehearsalScenarioCompareText,
    normalizeFollowupManualConfirmationToken,
    buildFollowupManualConfirmationKey,
    buildFollowupManualConfirmationData,
    getFollowupManualConfirmationStatusLabel,
    buildFollowupManualConfirmationDebugPayload,
    recordFollowupManualConfirmationVisibleEvent,
    updateFollowupManualConfirmationControls,
    handleFollowupManualConfirmClick,
    dismissFollowupManualConfirmation,
    reviewFollowupManualConfirmationDetails,
    updateFollowupReadinessPreviewCard,
    updateFollowupManualConfirmationPreviewCard,
    buildGrayAutoTrialStatusCardText,
    updateGrayAutoTrialStatusCard,
    buildGrayAutoTrialCharacterCueManualEmitStatusText,
    getGrayAutoTrialCharacterAutoRuntimeExplicitSwitchEnabled,
    updateGrayAutoTrialPreRunChecklistCard,
    updateGrayAutoTrialTimelineCard,
    updateGrayAutoTrialOutcomeCard,
    updateGrayAutoTrialDecisionCard,
    updateGrayAutoTrialSignoffCard,
    updateGrayAutoTrialCharacterCard,
    updateGrayAutoTrialCharacterHandoffCard,
    updateGrayAutoTrialCharacterRecapCard,
    updateGrayAutoTrialCharacterStrategyCard,
    updateGrayAutoTrialCharacterReviewCard,
    updateGrayAutoTrialCharacterAutoPlanCard,
    updateGrayAutoTrialCharacterDryRunCard,
    updateGrayAutoTrialCharacterSwitchPlanCard,
    updateGrayAutoTrialCharacterSwitchReviewCard,
    updateGrayAutoTrialCharacterSwitchAcceptanceCard,
    updateGrayAutoTrialCharacterSwitchControlCard,
    updateGrayAutoTrialCharacterSwitchDiagnosticsCard,
    updateGrayAutoTrialCharacterSwitchRollbackCard,
    updateGrayAutoTrialCharacterSwitchFinalPreflightCard,
    updateGrayAutoTrialCharacterImplementationDraftCard,
    promptGrayAutoTrialPhrase,
    handleGrayAutoTrialArmClick,
    handleGrayAutoTrialStopClick,
    handleGrayAutoTrialDisarmClick,
    handleGrayAutoTrialResetClick,
    handleGrayAutoTrialCharacterCueManualEmitClick,
    handleReplyCharacterCueCandidateManualSendClick,
    handleGrayAutoTrialCharacterAutoRuntimeSwitchEnableClick,
    handleGrayAutoTrialCharacterAutoRuntimeSwitchDisableClick,
    handleGrayAutoTrialCharacterAutoRuntimeSwitchRollbackClick,
    copyGrayAutoTrialAuditSummaryToClipboard,
    copyGrayAutoTrialTimelineToClipboard,
    copyGrayAutoTrialDecisionToClipboard,
    copyGrayAutoTrialSignoffToClipboard,
    copyGrayAutoTrialCharacterCuePreviewToClipboard,
    copyGrayAutoTrialCharacterCueHandoffChecklistToClipboard,
    copyGrayAutoTrialCharacterCueManualEmitRecapToClipboard,
    copyGrayAutoTrialCharacterExpressionStrategyDraftToClipboard,
    copyGrayAutoTrialCharacterExpressionStrategyReviewPackageToClipboard,
    copyGrayAutoTrialCharacterAutoRuntimeSafetyPlanToClipboard,
    copyGrayAutoTrialCharacterAutoRuntimeDryRunToClipboard,
    copyGrayAutoTrialCharacterAutoRuntimeSwitchPlanToClipboard,
    copyGrayAutoTrialCharacterAutoRuntimeSwitchReviewToClipboard,
    copyGrayAutoTrialCharacterAutoRuntimeSwitchAcceptanceToClipboard,
    copyGrayAutoTrialCharacterAutoRuntimeSwitchControlToClipboard,
    copyGrayAutoTrialCharacterAutoRuntimeSwitchDiagnosticsToClipboard,
    copyGrayAutoTrialCharacterAutoRuntimeSwitchRollbackToClipboard,
    copyGrayAutoTrialCharacterAutoRuntimeFinalPreflightToClipboard,
    copyGrayAutoTrialCharacterAutoRuntimeSeparateImplementationDraftToClipboard,
    updateFollowupReadinessScenarioCompare,
    createFollowupReadinessActionGroup,
    createFollowupReadinessCollapsibleActionGroup,
    ensureFollowupReadinessPanel,
    toggleFollowupReadinessPanel,
    copyFollowupReadinessReportToClipboard,
    copyFollowupReadinessSelectedTextToClipboard,
    copyFollowupReadinessPreviewSummaryToClipboard,
    copyFollowupReadinessPreviewCopyBundleToClipboard,
    copyFollowupReadinessPreviewJsonToClipboard,
    copyFollowupReadinessPreviewOneLineToClipboard,
    copyFollowupConfigTemplateToClipboard
  };
}

const FOLLOWUP_DEBUG_CONTROLLER = window.TaffyFollowupDebugController || {};
let followupDebugController = null;

function getFollowupDebugController() {
  if (!followupDebugController && typeof FOLLOWUP_DEBUG_CONTROLLER.createController === "function") {
    followupDebugController = FOLLOWUP_DEBUG_CONTROLLER.createController(getFollowupControllerDeps());
  }
  return followupDebugController;
}

function getGrayAutoTrialMaxTriggersPerSession(conversationMode = null) {
  return getFollowupDebugController().getGrayAutoTrialMaxTriggersPerSession(conversationMode);
}

function getGrayAutoTrialSessionTriggerCount() {
  return getFollowupDebugController().getGrayAutoTrialSessionTriggerCount();
}

function isGrayAutoTrialSessionLimitReached(conversationMode = null) {
  return getFollowupDebugController().isGrayAutoTrialSessionLimitReached(conversationMode);
}

function incrementGrayAutoTrialSessionTriggerCount() {
  return getFollowupDebugController().incrementGrayAutoTrialSessionTriggerCount();
}

function buildGrayAutoTrialSessionState() {
  return getFollowupDebugController().buildGrayAutoTrialSessionState();
}

function resetGrayAutoTrialSessionTriggerCount() {
  return getFollowupDebugController().resetGrayAutoTrialSessionTriggerCount();
}

function stopGrayAutoTrialSession(reason = "manual_emergency_stop") {
  return getFollowupDebugController().stopGrayAutoTrialSession(reason);
}

function armGrayAutoTrialSession(input = {}) {
  return getFollowupDebugController().armGrayAutoTrialSession(input);
}

function disarmGrayAutoTrialSession(reason = "manual_disarm") {
  return getFollowupDebugController().disarmGrayAutoTrialSession(reason);
}

function buildGrayAutoTrialRunbook() {
  return getFollowupDebugController().buildGrayAutoTrialRunbook();
}

function shouldEnableProactiveSchedulerPolling() {
  return getFollowupDebugController().shouldEnableProactiveSchedulerPolling();
}

function getProactiveSchedulerPollingGateStatus() {
  return getFollowupDebugController().getProactiveSchedulerPollingGateStatus();
}

function buildProactiveSchedulerDebugSnapshot(nowMs = Date.now()) {
  return getFollowupDebugController().buildProactiveSchedulerDebugSnapshot(nowMs);
}

function getTTSDebugSnapshot() {
  return getFollowupDebugController().getTTSDebugSnapshot();
}

function buildConversationSilenceDebugSnapshot(nowMs = Date.now()) {
  return getFollowupDebugController().buildConversationSilenceDebugSnapshot(nowMs);
}

function buildConversationFollowupPolicy(plan) {
  return getFollowupDebugController().buildConversationFollowupPolicy(plan);
}

function buildConversationFollowupCharacterCue(plan) {
  return getFollowupDebugController().buildConversationFollowupCharacterCue(plan);
}

function buildConversationFollowupReactionCandidates(plan) {
  return getFollowupDebugController().buildConversationFollowupReactionCandidates(plan);
}

function selectConversationFollowupReactionCandidate(plan, candidatesInput) {
  return getFollowupDebugController().selectConversationFollowupReactionCandidate(plan, candidatesInput);
}

function buildConversationFollowupDebugPlan(nowMs = Date.now()) {
  return getFollowupDebugController().buildConversationFollowupDebugPlan(nowMs);
}

function buildConversationFollowupDebugView(nowMs = Date.now()) {
  return getFollowupDebugController().buildConversationFollowupDebugView(nowMs);
}

function buildConversationFollowupPromptDraft(plan) {
  return getFollowupDebugController().buildConversationFollowupPromptDraft(plan);
}

function previewConversationFollowupPolicy(input = {}) {
  return getFollowupDebugController().previewConversationFollowupPolicy(input);
}

function getConversationFollowupPolicyDebugText(view) {
  return getFollowupDebugController().getConversationFollowupPolicyDebugText(view);
}

function snapshotConversationFollowupPending() {
  return getFollowupDebugController().snapshotConversationFollowupPending();
}

function restoreConversationFollowupPending(snapshot) {
  return getFollowupDebugController().restoreConversationFollowupPending(snapshot);
}

function clearConversationFollowupPending(nowMs = Date.now()) {
  return getFollowupDebugController().clearConversationFollowupPending(nowMs);
}

function getConversationFollowupRehearsalBlockedReason() {
  return getFollowupDebugController().getConversationFollowupRehearsalBlockedReason();
}

function rehearseConversationFollowupPending(input = {}) {
  return getFollowupDebugController().rehearseConversationFollowupPending(input);
}

function clearConversationFollowupRehearsal() {
  return getFollowupDebugController().clearConversationFollowupRehearsal();
}

function getFollowupRehearsalScenario(id = "") {
  return getFollowupDebugController().getFollowupRehearsalScenario(id);
}

function getFollowupRehearsalScenarioLabel(id = "") {
  return getFollowupDebugController().getFollowupRehearsalScenarioLabel(id);
}

function runFollowupReadinessPanelRehearsal(button = null, scenarioId = "") {
  return getFollowupDebugController().runFollowupReadinessPanelRehearsal(button, scenarioId);
}

function clearFollowupReadinessPanelRehearsal(button = null) {
  return getFollowupDebugController().clearFollowupReadinessPanelRehearsal(button);
}

function snapshotConversationFollowupPendingFixtureState() {
  return getFollowupDebugController().snapshotConversationFollowupPendingFixtureState();
}

function restoreConversationFollowupPendingFixtureState(snapshot) {
  return getFollowupDebugController().restoreConversationFollowupPendingFixtureState(snapshot);
}

function runConversationFollowupPendingFixture(input = {}) {
  return getFollowupDebugController().runConversationFollowupPendingFixture(input);
}

async function runConversationFollowupDebug() {
  return getFollowupDebugController().runConversationFollowupDebug();
}

async function runConversationSilenceFollowupDryRun() {
  return getFollowupDebugController().runConversationSilenceFollowupDryRun();
}

async function runProactiveSchedulerManualTick() {
  return getFollowupDebugController().runProactiveSchedulerManualTick();
}

async function runProactiveSchedulerPollingCheck() {
  return getFollowupDebugController().runProactiveSchedulerPollingCheck();
}

function normalizeProactiveSchedulerPollFailureReason(reason) {
  return getFollowupDebugController().normalizeProactiveSchedulerPollFailureReason(reason);
}

function injectProactiveSchedulerPollFailureOnce(reason = "manual_debug_injection") {
  return getFollowupDebugController().injectProactiveSchedulerPollFailureOnce(reason);
}

function getProactiveSchedulerFailureInjectionState() {
  return getFollowupDebugController().getProactiveSchedulerFailureInjectionState();
}

function clearProactiveSchedulerFailureInjection() {
  return getFollowupDebugController().clearProactiveSchedulerFailureInjection();
}

function consumeProactiveSchedulerPollFailureInjection() {
  return getFollowupDebugController().consumeProactiveSchedulerPollFailureInjection();
}

function stopProactiveSchedulerPolling(reason = "stop") {
  return getFollowupDebugController().stopProactiveSchedulerPolling(reason);
}

function startProactiveSchedulerPolling() {
  return getFollowupDebugController().startProactiveSchedulerPolling();
}

function syncProactiveSchedulerPolling() {
  return getFollowupDebugController().syncProactiveSchedulerPolling();
}

function buildTTSDebugReport() {
  return getFollowupDebugController().buildTTSDebugReport();
}

const GRAY_TRIAL_REPORT_CONTROLLER = window.TaffyGrayTrialReportController || {};
let grayTrialReportController = null;

function getGrayTrialReportController() {
  if (!grayTrialReportController && typeof GRAY_TRIAL_REPORT_CONTROLLER.createController === "function") {
    grayTrialReportController = GRAY_TRIAL_REPORT_CONTROLLER.createController(getFollowupControllerDeps());
  }
  return grayTrialReportController;
}

function formatReadinessBool(value) {
  return getGrayTrialReportController().formatReadinessBool(value);
}

function formatReadinessMs(value) {
  return getGrayTrialReportController().formatReadinessMs(value);
}

function joinReadinessReasons(reasons) {
  return getGrayTrialReportController().joinReadinessReasons(reasons);
}

function explainReadinessReason(reason) {
  return getGrayTrialReportController().explainReadinessReason(reason);
}

function explainReadinessReasons(reasons) {
  return getGrayTrialReportController().explainReadinessReasons(reasons);
}

function buildGrayAutoFollowupReadinessStatus(snapshotInput = null) {
  return getGrayTrialReportController().buildGrayAutoFollowupReadinessStatus(snapshotInput);
}

function buildGrayAutoFollowupDryRunStatus(snapshotInput = null) {
  return getGrayTrialReportController().buildGrayAutoFollowupDryRunStatus(snapshotInput);
}

function buildGrayAutoFollowupTrialPreflight(snapshotInput = null) {
  return getGrayTrialReportController().buildGrayAutoFollowupTrialPreflight(snapshotInput);
}

function buildGrayAutoFollowupTrialEventContext(snapshotInput = null) {
  return getGrayTrialReportController().buildGrayAutoFollowupTrialEventContext(snapshotInput);
}

function mergeProactiveSchedulerPollEventResult(result, trialContext = null) {
  return getGrayTrialReportController().mergeProactiveSchedulerPollEventResult(result, trialContext);
}

function mergeProactiveSchedulerPollEventError(error, trialContext = null) {
  return getGrayTrialReportController().mergeProactiveSchedulerPollEventError(error, trialContext);
}

function parseGrayTrialPollEventResult(result) {
  return getGrayTrialReportController().parseGrayTrialPollEventResult(result);
}

function buildGrayAutoFollowupTrialEventSummary(limit = 20) {
  return getGrayTrialReportController().buildGrayAutoFollowupTrialEventSummary(limit);
}

function runGrayAutoFollowupDryRunDebug() {
  return getGrayTrialReportController().runGrayAutoFollowupDryRunDebug();
}

function buildFollowupReadinessFriendlySummary(followup, silence, scheduler) {
  return getGrayTrialReportController().buildFollowupReadinessFriendlySummary(followup, silence, scheduler);
}

const GRAY_TRIAL_CHARACTER_PANEL_CONTROLLER = window.TaffyGrayTrialCharacterPanelController || {};
let grayTrialCharacterPanelController = null;

function getGrayTrialCharacterPanelController() {
  if (!grayTrialCharacterPanelController && typeof GRAY_TRIAL_CHARACTER_PANEL_CONTROLLER.createController === "function") {
    grayTrialCharacterPanelController = GRAY_TRIAL_CHARACTER_PANEL_CONTROLLER.createController(getFollowupControllerDeps());
  }
  return grayTrialCharacterPanelController;
}

function buildFollowupCharacterState(followup, silence, scheduler) {
  return getGrayTrialCharacterPanelController().buildFollowupCharacterState(followup, silence, scheduler);
}

function formatFollowupReactionCandidateSummary(candidates) {
  return getGrayTrialCharacterPanelController().formatFollowupReactionCandidateSummary(candidates);
}

function previewConversationFollowupReactions(input = {}) {
  return getGrayTrialCharacterPanelController().previewConversationFollowupReactions(input);
}

function getFollowupCharacterStateDebugView() {
  return getGrayTrialCharacterPanelController().getFollowupCharacterStateDebugView();
}

function buildFollowupCharacterChipTitle(view) {
  return getGrayTrialCharacterPanelController().buildFollowupCharacterChipTitle(view);
}

function updateFollowupCharacterChip() {
  return getGrayTrialCharacterPanelController().updateFollowupCharacterChip();
}

function localizeReplyCharacterValue(kind, value) {
  return getGrayTrialCharacterPanelController().localizeReplyCharacterValue(kind, value);
}

function buildReplyCharacterChipView(candidate = null, autoApply = null) {
  return getGrayTrialCharacterPanelController().buildReplyCharacterChipView(candidate, autoApply);
}

function updateReplyCharacterChip(candidate = null, autoApply = null) {
  return getGrayTrialCharacterPanelController().updateReplyCharacterChip(candidate, autoApply);
}

function buildFollowupCharacterRuntimeHint(input = {}) {
  return getGrayTrialCharacterPanelController().buildFollowupCharacterRuntimeHint(input);
}

function normalizeGrayAutoTrialCharacterCuePresetKey(value) {
  return getGrayTrialCharacterPanelController().normalizeGrayAutoTrialCharacterCuePresetKey(value);
}

function listGrayAutoTrialCharacterCuePresets() {
  return getGrayTrialCharacterPanelController().listGrayAutoTrialCharacterCuePresets();
}

function resolveGrayAutoTrialCharacterCuePreset(input = {}, checklist = null) {
  return getGrayTrialCharacterPanelController().resolveGrayAutoTrialCharacterCuePreset(input, checklist);
}

function buildAssistantReplyCharacterExpressionCue(input = {}) {
  return getGrayTrialCharacterPanelController().buildAssistantReplyCharacterExpressionCue(input);
}

function buildAssistantReplyCharacterCueCandidate(input = {}) {
  return getGrayTrialCharacterPanelController().buildAssistantReplyCharacterCueCandidate(input);
}

function previewAssistantReplyCharacterCueCandidate(input = {}) {
  return getGrayTrialCharacterPanelController().previewAssistantReplyCharacterCueCandidate(input);
}

function normalizeRuntimeVoiceStyle(style) {
  return getGrayTrialCharacterPanelController().normalizeRuntimeVoiceStyle(style);
}

function runtimeVoiceStyleToTalkStyle(style, fallback = "neutral") {
  return getGrayTrialCharacterPanelController().runtimeVoiceStyleToTalkStyle(style, fallback);
}

function applyPerformanceControlsToRuntimeHint(runtimeHint = null, brainSnapshot = null) {
  return getGrayTrialCharacterPanelController().applyPerformanceControlsToRuntimeHint(runtimeHint, brainSnapshot);
}

function isReplyCueAutoApplyEnabled() {
  return getGrayTrialCharacterPanelController().isReplyCueAutoApplyEnabled();
}

function maybeAutoApplyAssistantReplyCharacterCueCandidate(candidate, context = {}) {
  return getGrayTrialCharacterPanelController().maybeAutoApplyAssistantReplyCharacterCueCandidate(candidate, context);
}

function maybeEmitFollowupCharacterRuntimeHint(input = {}) {
  return getGrayTrialCharacterPanelController().maybeEmitFollowupCharacterRuntimeHint(input);
}

function startFollowupCharacterChipRefresh() {
  return getGrayTrialCharacterPanelController().startFollowupCharacterChipRefresh();
}

function buildFollowupAwareIdleMotionContext() {
  return getGrayTrialCharacterPanelController().buildFollowupAwareIdleMotionContext();
}

const FOLLOWUP_READINESS_PANEL_CONTROLLER = window.TaffyFollowupReadinessPanelController || {};
let followupReadinessPanelController = null;

function getFollowupReadinessPanelController() {
  if (!followupReadinessPanelController && typeof FOLLOWUP_READINESS_PANEL_CONTROLLER.createController === "function") {
    followupReadinessPanelController = FOLLOWUP_READINESS_PANEL_CONTROLLER.createController(getFollowupControllerDeps());
  }
  return followupReadinessPanelController;
}

function buildFollowupReadinessBackendEntryView() {
  return getFollowupReadinessPanelController().buildFollowupReadinessBackendEntryView();
}

function buildFollowupReadinessBackendEntryCardText() {
  return getFollowupReadinessPanelController().buildFollowupReadinessBackendEntryCardText();
}

async function refreshFollowupReadinessBackendEntrySummary(force = false) {
  return getFollowupReadinessPanelController().refreshFollowupReadinessBackendEntrySummary(force);
}

function updateFollowupReadinessBackendEntryCard() {
  return getFollowupReadinessPanelController().updateFollowupReadinessBackendEntryCard();
}

function buildFollowupReadinessReport() {
  return getFollowupReadinessPanelController().buildFollowupReadinessReport();
}

function buildFollowupReadinessPreviewCardText() {
  return getFollowupReadinessPanelController().buildFollowupReadinessPreviewCardText();
}

function buildFollowupRehearsalScenarioCompareRows() {
  return getFollowupReadinessPanelController().buildFollowupRehearsalScenarioCompareRows();
}

function buildFollowupRehearsalScenarioCompareText() {
  return getFollowupReadinessPanelController().buildFollowupRehearsalScenarioCompareText();
}

function buildFollowupReadinessPreviewCopyBundleText() {
  return getFollowupReadinessPanelController().buildFollowupReadinessPreviewCopyBundleText();
}

function buildFollowupReadinessPreviewJsonText() {
  return getFollowupReadinessPanelController().buildFollowupReadinessPreviewJsonText();
}

function buildFollowupReadinessPreviewOneLineText() {
  return getFollowupReadinessPanelController().buildFollowupReadinessPreviewOneLineText();
}

function buildFollowupReadinessPreviewCardData(snapshotInput = null) {
  return getFollowupReadinessPanelController().buildFollowupReadinessPreviewCardData(snapshotInput);
}

function normalizeFollowupManualConfirmationToken(value = "") {
  return getFollowupReadinessPanelController().normalizeFollowupManualConfirmationToken(value);
}

function buildFollowupManualConfirmationKey(input = {}) {
  return getFollowupReadinessPanelController().buildFollowupManualConfirmationKey(input);
}

function buildFollowupManualConfirmationData() {
  return getFollowupReadinessPanelController().buildFollowupManualConfirmationData();
}

function getFollowupManualConfirmationStatusLabel(status = "hidden") {
  return getFollowupReadinessPanelController().getFollowupManualConfirmationStatusLabel(status);
}

function buildFollowupManualConfirmationDebugPayload(confirmation = {}, result = "") {
  return getFollowupReadinessPanelController().buildFollowupManualConfirmationDebugPayload(confirmation, result);
}

function recordFollowupManualConfirmationVisibleEvent(confirmation = {}) {
  return getFollowupReadinessPanelController().recordFollowupManualConfirmationVisibleEvent(confirmation);
}

function updateFollowupManualConfirmationControls() {
  return getFollowupReadinessPanelController().updateFollowupManualConfirmationControls();
}

async function handleFollowupManualConfirmClick(button = null) {
  return getFollowupReadinessPanelController().handleFollowupManualConfirmClick(button);
}

function dismissFollowupManualConfirmation(button = null) {
  return getFollowupReadinessPanelController().dismissFollowupManualConfirmation(button);
}

function reviewFollowupManualConfirmationDetails() {
  return getFollowupReadinessPanelController().reviewFollowupManualConfirmationDetails();
}

function updateFollowupReadinessPreviewCard() {
  return getFollowupReadinessPanelController().updateFollowupReadinessPreviewCard();
}

function updateFollowupManualConfirmationPreviewCard() {
  return getFollowupReadinessPanelController().updateFollowupManualConfirmationPreviewCard();
}

function buildGrayAutoTrialStatusCardText() {
  return getFollowupReadinessPanelController().buildGrayAutoTrialStatusCardText();
}

function updateGrayAutoTrialStatusCard() {
  return getFollowupReadinessPanelController().updateGrayAutoTrialStatusCard();
}

function buildGrayAutoTrialAuditSummary(limit = 24) {
  return getFollowupReadinessPanelController().buildGrayAutoTrialAuditSummary(limit);
}

function buildGrayAutoTrialAuditSummaryText(limit = 24) {
  return getFollowupReadinessPanelController().buildGrayAutoTrialAuditSummaryText(limit);
}

function buildGrayAutoTrialPreRunChecklist(snapshotInput = null) {
  return getFollowupReadinessPanelController().buildGrayAutoTrialPreRunChecklist(snapshotInput);
}

function buildGrayAutoTrialPreRunChecklistText() {
  return getFollowupReadinessPanelController().buildGrayAutoTrialPreRunChecklistText();
}

function buildGrayAutoTrialTimeline(limit = 32) {
  return getFollowupReadinessPanelController().buildGrayAutoTrialTimeline(limit);
}

function buildGrayAutoTrialTimelineText(limit = 32) {
  return getFollowupReadinessPanelController().buildGrayAutoTrialTimelineText(limit);
}

function buildGrayAutoTrialOutcome(limit = 48) {
  return getFollowupReadinessPanelController().buildGrayAutoTrialOutcome(limit);
}

function buildGrayAutoTrialOutcomeText(limit = 48) {
  return getFollowupReadinessPanelController().buildGrayAutoTrialOutcomeText(limit);
}

function buildGrayAutoTrialGoNoGoDecision(limit = 48) {
  return getFollowupReadinessPanelController().buildGrayAutoTrialGoNoGoDecision(limit);
}

function buildGrayAutoTrialGoNoGoDecisionText(limit = 48) {
  return getFollowupReadinessPanelController().buildGrayAutoTrialGoNoGoDecisionText(limit);
}

function buildGrayAutoTrialSignoffPackage(limit = 48) {
  return getFollowupReadinessPanelController().buildGrayAutoTrialSignoffPackage(limit);
}

function buildGrayAutoTrialSignoffPackageText(limit = 48) {
  return getFollowupReadinessPanelController().buildGrayAutoTrialSignoffPackageText(limit);
}

function buildGrayAutoTrialCharacterCuePreview(limit = 48) {
  return getFollowupReadinessPanelController().buildGrayAutoTrialCharacterCuePreview(limit);
}

function buildGrayAutoTrialCharacterCuePreviewText(limit = 48) {
  return getFollowupReadinessPanelController().buildGrayAutoTrialCharacterCuePreviewText(limit);
}

function buildGrayAutoTrialCharacterCueHandoffChecklist(limit = 48) {
  return getFollowupReadinessPanelController().buildGrayAutoTrialCharacterCueHandoffChecklist(limit);
}

function buildGrayAutoTrialCharacterCueHandoffChecklistText(limit = 48) {
  return getFollowupReadinessPanelController().buildGrayAutoTrialCharacterCueHandoffChecklistText(limit);
}

function getGrayAutoTrialCharacterCueManualEmitStatus() {
  return getFollowupReadinessPanelController().getGrayAutoTrialCharacterCueManualEmitStatus();
}

function buildGrayAutoTrialCharacterCueManualEmitStatusText() {
  return getFollowupReadinessPanelController().buildGrayAutoTrialCharacterCueManualEmitStatusText();
}

function buildGrayAutoTrialCharacterManualCueStatusCardText() {
  return getFollowupReadinessPanelController().buildGrayAutoTrialCharacterManualCueStatusCardText();
}

function buildGrayAutoTrialCharacterCueManualEmitRecap(limit = 24) {
  return getFollowupReadinessPanelController().buildGrayAutoTrialCharacterCueManualEmitRecap(limit);
}

function buildGrayAutoTrialCharacterCueManualEmitRecapText(limit = 24) {
  return getFollowupReadinessPanelController().buildGrayAutoTrialCharacterCueManualEmitRecapText(limit);
}

function buildGrayAutoTrialCharacterExpressionStrategyDraft(limit = 24) {
  return getFollowupReadinessPanelController().buildGrayAutoTrialCharacterExpressionStrategyDraft(limit);
}

function buildGrayAutoTrialCharacterExpressionStrategyDraftText(limit = 24) {
  return getFollowupReadinessPanelController().buildGrayAutoTrialCharacterExpressionStrategyDraftText(limit);
}

function buildGrayAutoTrialCharacterExpressionStrategyReviewPackage(limit = 24) {
  return getFollowupReadinessPanelController().buildGrayAutoTrialCharacterExpressionStrategyReviewPackage(limit);
}

function buildGrayAutoTrialCharacterExpressionStrategyReviewPackageText(limit = 24) {
  return getFollowupReadinessPanelController().buildGrayAutoTrialCharacterExpressionStrategyReviewPackageText(limit);
}

function buildGrayAutoTrialCharacterAutoRuntimeSafetyPlan(limit = 24) {
  return getFollowupReadinessPanelController().buildGrayAutoTrialCharacterAutoRuntimeSafetyPlan(limit);
}

function buildGrayAutoTrialCharacterAutoRuntimeSafetyPlanText(limit = 24) {
  return getFollowupReadinessPanelController().buildGrayAutoTrialCharacterAutoRuntimeSafetyPlanText(limit);
}

function buildGrayAutoTrialCharacterAutoRuntimeDryRun(limit = 24) {
  return getFollowupReadinessPanelController().buildGrayAutoTrialCharacterAutoRuntimeDryRun(limit);
}

function buildGrayAutoTrialCharacterAutoRuntimeDryRunText(limit = 24) {
  return getFollowupReadinessPanelController().buildGrayAutoTrialCharacterAutoRuntimeDryRunText(limit);
}

function buildGrayAutoTrialCharacterAutoRuntimeExplicitSwitchPlan(limit = 24) {
  return getFollowupReadinessPanelController().buildGrayAutoTrialCharacterAutoRuntimeExplicitSwitchPlan(limit);
}

function buildGrayAutoTrialCharacterAutoRuntimeExplicitSwitchPlanText(limit = 24) {
  return getFollowupReadinessPanelController().buildGrayAutoTrialCharacterAutoRuntimeExplicitSwitchPlanText(limit);
}

function buildGrayAutoTrialCharacterAutoRuntimeExplicitSwitchReviewPackage(limit = 24) {
  return getFollowupReadinessPanelController().buildGrayAutoTrialCharacterAutoRuntimeExplicitSwitchReviewPackage(limit);
}

function buildGrayAutoTrialCharacterAutoRuntimeExplicitSwitchReviewPackageText(limit = 24) {
  return getFollowupReadinessPanelController().buildGrayAutoTrialCharacterAutoRuntimeExplicitSwitchReviewPackageText(limit);
}

function buildGrayAutoTrialCharacterAutoRuntimeSwitchAcceptancePackage(limit = 24) {
  return getFollowupReadinessPanelController().buildGrayAutoTrialCharacterAutoRuntimeSwitchAcceptancePackage(limit);
}

function buildGrayAutoTrialCharacterAutoRuntimeSwitchAcceptancePackageText(limit = 24) {
  return getFollowupReadinessPanelController().buildGrayAutoTrialCharacterAutoRuntimeSwitchAcceptancePackageText(limit);
}

function getGrayAutoTrialCharacterAutoRuntimeExplicitSwitchEnabled() {
  return getFollowupReadinessPanelController().getGrayAutoTrialCharacterAutoRuntimeExplicitSwitchEnabled();
}

function getGrayAutoTrialCharacterAutoRuntimeExplicitSwitchState() {
  return getFollowupReadinessPanelController().getGrayAutoTrialCharacterAutoRuntimeExplicitSwitchState();
}

function buildGrayAutoTrialCharacterAutoRuntimeExplicitSwitchControl(limit = 24) {
  return getFollowupReadinessPanelController().buildGrayAutoTrialCharacterAutoRuntimeExplicitSwitchControl(limit);
}

function buildGrayAutoTrialCharacterAutoRuntimeExplicitSwitchControlText(limit = 24) {
  return getFollowupReadinessPanelController().buildGrayAutoTrialCharacterAutoRuntimeExplicitSwitchControlText(limit);
}

function buildGrayAutoTrialCharacterAutoRuntimeSwitchControlDiagnostics(limit = 24) {
  return getFollowupReadinessPanelController().buildGrayAutoTrialCharacterAutoRuntimeSwitchControlDiagnostics(limit);
}

function buildGrayAutoTrialCharacterAutoRuntimeSwitchControlDiagnosticsText(limit = 24) {
  return getFollowupReadinessPanelController().buildGrayAutoTrialCharacterAutoRuntimeSwitchControlDiagnosticsText(limit);
}

function buildGrayAutoTrialCharacterAutoRuntimeExplicitSwitchRollbackPackage(limit = 24) {
  return getFollowupReadinessPanelController().buildGrayAutoTrialCharacterAutoRuntimeExplicitSwitchRollbackPackage(limit);
}

function buildGrayAutoTrialCharacterAutoRuntimeExplicitSwitchRollbackPackageText(limit = 24) {
  return getFollowupReadinessPanelController().buildGrayAutoTrialCharacterAutoRuntimeExplicitSwitchRollbackPackageText(limit);
}

function buildGrayAutoTrialCharacterAutoRuntimeFinalPreflight(limit = 24) {
  return getFollowupReadinessPanelController().buildGrayAutoTrialCharacterAutoRuntimeFinalPreflight(limit);
}

function buildGrayAutoTrialCharacterAutoRuntimeFinalPreflightText(limit = 24) {
  return getFollowupReadinessPanelController().buildGrayAutoTrialCharacterAutoRuntimeFinalPreflightText(limit);
}

function buildGrayAutoTrialCharacterAutoRuntimeSeparateImplementationDraft(limit = 24) {
  return getFollowupReadinessPanelController().buildGrayAutoTrialCharacterAutoRuntimeSeparateImplementationDraft(limit);
}

function buildGrayAutoTrialCharacterAutoRuntimeSeparateImplementationDraftText(limit = 24) {
  return getFollowupReadinessPanelController().buildGrayAutoTrialCharacterAutoRuntimeSeparateImplementationDraftText(limit);
}

function enableGrayAutoTrialCharacterAutoRuntimeExplicitSwitch(input = {}) {
  return getFollowupReadinessPanelController().enableGrayAutoTrialCharacterAutoRuntimeExplicitSwitch(input);
}

function disableGrayAutoTrialCharacterAutoRuntimeExplicitSwitch(reason = "manual_disable") {
  return getFollowupReadinessPanelController().disableGrayAutoTrialCharacterAutoRuntimeExplicitSwitch(reason);
}

function rollbackGrayAutoTrialCharacterAutoRuntimeExplicitSwitch(reason = "manual_rollback") {
  return getFollowupReadinessPanelController().rollbackGrayAutoTrialCharacterAutoRuntimeExplicitSwitch(reason);
}

function emitGrayAutoTrialCharacterCueManually(input = {}) {
  return getFollowupReadinessPanelController().emitGrayAutoTrialCharacterCueManually(input);
}

async function previewGrayAutoTrialCharacterCueBackendBridge(checklist = null) {
  return getFollowupReadinessPanelController().previewGrayAutoTrialCharacterCueBackendBridge(checklist);
}

function getSelectedGrayAutoTrialCharacterCuePresetKey() {
  return getFollowupReadinessPanelController().getSelectedGrayAutoTrialCharacterCuePresetKey();
}

async function emitGrayAutoTrialCharacterCueViaManualBridge(input = {}) {
  return getFollowupReadinessPanelController().emitGrayAutoTrialCharacterCueViaManualBridge(input);
}

async function emitLastReplyCharacterCueCandidateViaManualBridge(input = {}) {
  return getFollowupReadinessPanelController().emitLastReplyCharacterCueCandidateViaManualBridge(input);
}

function updateGrayAutoTrialPreRunChecklistCard() {
  return getFollowupReadinessPanelController().updateGrayAutoTrialPreRunChecklistCard();
}

function updateGrayAutoTrialTimelineCard() {
  return getFollowupReadinessPanelController().updateGrayAutoTrialTimelineCard();
}

function updateGrayAutoTrialOutcomeCard() {
  return getFollowupReadinessPanelController().updateGrayAutoTrialOutcomeCard();
}

function updateGrayAutoTrialDecisionCard() {
  return getFollowupReadinessPanelController().updateGrayAutoTrialDecisionCard();
}

function updateGrayAutoTrialSignoffCard() {
  return getFollowupReadinessPanelController().updateGrayAutoTrialSignoffCard();
}

function updateGrayAutoTrialCharacterCard() {
  return getFollowupReadinessPanelController().updateGrayAutoTrialCharacterCard();
}

function updateGrayAutoTrialCharacterHandoffCard() {
  return getFollowupReadinessPanelController().updateGrayAutoTrialCharacterHandoffCard();
}

function updateGrayAutoTrialCharacterRecapCard() {
  return getFollowupReadinessPanelController().updateGrayAutoTrialCharacterRecapCard();
}

function updateGrayAutoTrialCharacterManualCueStatusCard() {
  return getFollowupReadinessPanelController().updateGrayAutoTrialCharacterManualCueStatusCard();
}

function updateReplyCharacterCueCandidateManualSendButton() {
  return getFollowupReadinessPanelController().updateReplyCharacterCueCandidateManualSendButton();
}

function updateGrayAutoTrialCharacterStrategyCard() {
  return getFollowupReadinessPanelController().updateGrayAutoTrialCharacterStrategyCard();
}

function updateGrayAutoTrialCharacterReviewCard() {
  return getFollowupReadinessPanelController().updateGrayAutoTrialCharacterReviewCard();
}

function updateGrayAutoTrialCharacterAutoPlanCard() {
  return getFollowupReadinessPanelController().updateGrayAutoTrialCharacterAutoPlanCard();
}

function updateGrayAutoTrialCharacterDryRunCard() {
  return getFollowupReadinessPanelController().updateGrayAutoTrialCharacterDryRunCard();
}

function updateGrayAutoTrialCharacterSwitchPlanCard() {
  return getFollowupReadinessPanelController().updateGrayAutoTrialCharacterSwitchPlanCard();
}

function updateGrayAutoTrialCharacterSwitchReviewCard() {
  return getFollowupReadinessPanelController().updateGrayAutoTrialCharacterSwitchReviewCard();
}

function updateGrayAutoTrialCharacterSwitchAcceptanceCard() {
  return getFollowupReadinessPanelController().updateGrayAutoTrialCharacterSwitchAcceptanceCard();
}

function updateGrayAutoTrialCharacterSwitchControlCard() {
  return getFollowupReadinessPanelController().updateGrayAutoTrialCharacterSwitchControlCard();
}

function updateGrayAutoTrialCharacterSwitchDiagnosticsCard() {
  return getFollowupReadinessPanelController().updateGrayAutoTrialCharacterSwitchDiagnosticsCard();
}

function updateGrayAutoTrialCharacterSwitchRollbackCard() {
  return getFollowupReadinessPanelController().updateGrayAutoTrialCharacterSwitchRollbackCard();
}

function updateGrayAutoTrialCharacterSwitchFinalPreflightCard() {
  return getFollowupReadinessPanelController().updateGrayAutoTrialCharacterSwitchFinalPreflightCard();
}

function updateGrayAutoTrialCharacterImplementationDraftCard() {
  return getFollowupReadinessPanelController().updateGrayAutoTrialCharacterImplementationDraftCard();
}

function promptGrayAutoTrialPhrase(phrase, actionLabel) {
  return getFollowupReadinessPanelController().promptGrayAutoTrialPhrase(phrase, actionLabel);
}

function updateGrayAutoTrialControlPanel() {
  return getFollowupReadinessPanelController().updateGrayAutoTrialControlPanel();
}

function handleGrayAutoTrialArmClick(button = null) {
  return getFollowupReadinessPanelController().handleGrayAutoTrialArmClick(button);
}

function handleGrayAutoTrialStopClick(button = null) {
  return getFollowupReadinessPanelController().handleGrayAutoTrialStopClick(button);
}

function handleGrayAutoTrialDisarmClick(button = null) {
  return getFollowupReadinessPanelController().handleGrayAutoTrialDisarmClick(button);
}

function handleGrayAutoTrialResetClick(button = null) {
  return getFollowupReadinessPanelController().handleGrayAutoTrialResetClick(button);
}

async function handleGrayAutoTrialCharacterCueManualEmitClick(button = null) {
  return getFollowupReadinessPanelController().handleGrayAutoTrialCharacterCueManualEmitClick(button);
}

async function handleReplyCharacterCueCandidateManualSendClick(button = null) {
  return getFollowupReadinessPanelController().handleReplyCharacterCueCandidateManualSendClick(button);
}

function handleGrayAutoTrialCharacterAutoRuntimeSwitchEnableClick(button = null) {
  return getFollowupReadinessPanelController().handleGrayAutoTrialCharacterAutoRuntimeSwitchEnableClick(button);
}

function handleGrayAutoTrialCharacterAutoRuntimeSwitchDisableClick(button = null) {
  return getFollowupReadinessPanelController().handleGrayAutoTrialCharacterAutoRuntimeSwitchDisableClick(button);
}

function handleGrayAutoTrialCharacterAutoRuntimeSwitchRollbackClick(button = null) {
  return getFollowupReadinessPanelController().handleGrayAutoTrialCharacterAutoRuntimeSwitchRollbackClick(button);
}

async function copyGrayAutoTrialAuditSummaryToClipboard(button = null) {
  return getFollowupReadinessPanelController().copyGrayAutoTrialAuditSummaryToClipboard(button);
}

async function copyGrayAutoTrialTimelineToClipboard(button = null) {
  return getFollowupReadinessPanelController().copyGrayAutoTrialTimelineToClipboard(button);
}

async function copyGrayAutoTrialDecisionToClipboard(button = null) {
  return getFollowupReadinessPanelController().copyGrayAutoTrialDecisionToClipboard(button);
}

async function copyGrayAutoTrialSignoffToClipboard(button = null) {
  return getFollowupReadinessPanelController().copyGrayAutoTrialSignoffToClipboard(button);
}

async function copyGrayAutoTrialCharacterCuePreviewToClipboard(button = null) {
  return getFollowupReadinessPanelController().copyGrayAutoTrialCharacterCuePreviewToClipboard(button);
}

async function copyGrayAutoTrialCharacterCueHandoffChecklistToClipboard(button = null) {
  return getFollowupReadinessPanelController().copyGrayAutoTrialCharacterCueHandoffChecklistToClipboard(button);
}

async function copyGrayAutoTrialCharacterCueManualEmitRecapToClipboard(button = null) {
  return getFollowupReadinessPanelController().copyGrayAutoTrialCharacterCueManualEmitRecapToClipboard(button);
}

async function copyGrayAutoTrialCharacterExpressionStrategyDraftToClipboard(button = null) {
  return getFollowupReadinessPanelController().copyGrayAutoTrialCharacterExpressionStrategyDraftToClipboard(button);
}

async function copyGrayAutoTrialCharacterExpressionStrategyReviewPackageToClipboard(button = null) {
  return getFollowupReadinessPanelController().copyGrayAutoTrialCharacterExpressionStrategyReviewPackageToClipboard(button);
}

async function copyGrayAutoTrialCharacterAutoRuntimeSafetyPlanToClipboard(button = null) {
  return getFollowupReadinessPanelController().copyGrayAutoTrialCharacterAutoRuntimeSafetyPlanToClipboard(button);
}

async function copyGrayAutoTrialCharacterAutoRuntimeDryRunToClipboard(button = null) {
  return getFollowupReadinessPanelController().copyGrayAutoTrialCharacterAutoRuntimeDryRunToClipboard(button);
}

async function copyGrayAutoTrialCharacterAutoRuntimeSwitchPlanToClipboard(button = null) {
  return getFollowupReadinessPanelController().copyGrayAutoTrialCharacterAutoRuntimeSwitchPlanToClipboard(button);
}

async function copyGrayAutoTrialCharacterAutoRuntimeSwitchReviewToClipboard(button = null) {
  return getFollowupReadinessPanelController().copyGrayAutoTrialCharacterAutoRuntimeSwitchReviewToClipboard(button);
}

async function copyGrayAutoTrialCharacterAutoRuntimeSwitchAcceptanceToClipboard(button = null) {
  return getFollowupReadinessPanelController().copyGrayAutoTrialCharacterAutoRuntimeSwitchAcceptanceToClipboard(button);
}

async function copyGrayAutoTrialCharacterAutoRuntimeSwitchControlToClipboard(button = null) {
  return getFollowupReadinessPanelController().copyGrayAutoTrialCharacterAutoRuntimeSwitchControlToClipboard(button);
}

async function copyGrayAutoTrialCharacterAutoRuntimeSwitchDiagnosticsToClipboard(button = null) {
  return getFollowupReadinessPanelController().copyGrayAutoTrialCharacterAutoRuntimeSwitchDiagnosticsToClipboard(button);
}

async function copyGrayAutoTrialCharacterAutoRuntimeSwitchRollbackToClipboard(button = null) {
  return getFollowupReadinessPanelController().copyGrayAutoTrialCharacterAutoRuntimeSwitchRollbackToClipboard(button);
}

async function copyGrayAutoTrialCharacterAutoRuntimeFinalPreflightToClipboard(button = null) {
  return getFollowupReadinessPanelController().copyGrayAutoTrialCharacterAutoRuntimeFinalPreflightToClipboard(button);
}

async function copyGrayAutoTrialCharacterAutoRuntimeSeparateImplementationDraftToClipboard(button = null) {
  return getFollowupReadinessPanelController().copyGrayAutoTrialCharacterAutoRuntimeSeparateImplementationDraftToClipboard(button);
}

function updateFollowupReadinessScenarioCompare() {
  return getFollowupReadinessPanelController().updateFollowupReadinessScenarioCompare();
}

function createFollowupReadinessActionGroup(labelText, buttons = []) {
  return getFollowupReadinessPanelController().createFollowupReadinessActionGroup(labelText, buttons);
}

function createFollowupReadinessCollapsibleActionGroup(labelText, buttons = [], open = false) {
  return getFollowupReadinessPanelController().createFollowupReadinessCollapsibleActionGroup(labelText, buttons, open);
}

function ensureFollowupReadinessPanel() {
  return getFollowupReadinessPanelController().ensureFollowupReadinessPanel();
}

function updateFollowupReadinessPanel() {
  return getFollowupReadinessPanelController().updateFollowupReadinessPanel();
}

function toggleFollowupReadinessPanel(force = null) {
  return getFollowupReadinessPanelController().toggleFollowupReadinessPanel(force);
}

function buildFollowupConfigTemplate() {
  return getFollowupReadinessPanelController().buildFollowupConfigTemplate();
}

async function writeTextToClipboard(text) {
  return getFollowupReadinessPanelController().writeTextToClipboard(text);
}

async function copyFollowupReadinessReportToClipboard(button = null) {
  return getFollowupReadinessPanelController().copyFollowupReadinessReportToClipboard(button);
}

async function copyFollowupReadinessSelectedTextToClipboard(button = null) {
  return getFollowupReadinessPanelController().copyFollowupReadinessSelectedTextToClipboard(button);
}

async function copyFollowupReadinessPreviewSummaryToClipboard(button = null) {
  return getFollowupReadinessPanelController().copyFollowupReadinessPreviewSummaryToClipboard(button);
}

async function copyFollowupReadinessPreviewCopyBundleToClipboard(button = null) {
  return getFollowupReadinessPanelController().copyFollowupReadinessPreviewCopyBundleToClipboard(button);
}

async function copyFollowupReadinessPreviewJsonToClipboard(button = null) {
  return getFollowupReadinessPanelController().copyFollowupReadinessPreviewJsonToClipboard(button);
}

async function copyFollowupReadinessPreviewOneLineToClipboard(button = null) {
  return getFollowupReadinessPanelController().copyFollowupReadinessPreviewOneLineToClipboard(button);
}

async function copyFollowupConfigTemplateToClipboard(button = null) {
  return getFollowupReadinessPanelController().copyFollowupConfigTemplateToClipboard(button);
}

function formatDoctorBytes(bytes) { return getDiagnosticsRuntimeController().formatDoctorBytes(bytes); }
async function runDoctorTimed(label, fn) { return getDiagnosticsRuntimeController().runDoctorTimed(label, fn); }
async function runDoctorJsonFetch(url, init = {}, timeoutMs = 12000) { return getDiagnosticsRuntimeController().runDoctorJsonFetch(url, init, timeoutMs); }
async function runDoctorDiagnostics() { return getDiagnosticsRuntimeController().runDoctorDiagnostics(); }
async function runDoctorAndAppendReport() { return getDiagnosticsRuntimeController().runDoctorAndAppendReport(); }
function buildChatFailureDoctorHint(err) { return getDiagnosticsRuntimeController().buildChatFailureDoctorHint(err); }
const CHARACTER_TUNING = window.TaffyCharacterTuning || {};
const CHARACTER_BRAIN_DEBUG = window.TaffyCharacterBrainDebug || {};
const CHARACTER_EXPERIENCE_CONTROLLER = window.TaffyCharacterExperienceController || {};
const CHARACTER_DIAGNOSTICS_CONTROLLER = window.TaffyCharacterDiagnosticsController || {};
const CHARACTER_REPLY_CUE = window.TaffyCharacterReplyCue || {};
const FOLLOWUP_READINESS_VIEW = window.TaffyFollowupReadinessView || {};
const GRAY_TRIAL_CHARACTER_VIEW = window.TaffyGrayTrialCharacterView || {};
const GRAY_TRIAL_READINESS_MODEL = window.TaffyGrayTrialReadinessModel || {};
const GRAY_TRIAL_CHARACTER_MODEL = window.TaffyGrayTrialCharacterModel || {};
const GRAY_TRIAL_AUTO_RUNTIME_SWITCH_MODEL = window.TaffyGrayTrialAutoRuntimeSwitchModel || {};
const TOOL_META_VIEW = window.TaffyToolMetaView || {};
const LOCAL_COMMAND_REGISTRY = window.TaffyLocalCommandRegistry || {};
const LOCAL_COMMAND_EXECUTOR = window.TaffyLocalCommandExecutor || {};
const REMINDER_UTILS = window.TaffyReminderUtils || {};
const SCHEDULE_LIST_VIEW = window.TaffyScheduleListView || {};
const SCHEDULE_FORM_MODEL = window.TaffyScheduleFormModel || {};

let characterDiagnosticsController = null;
let characterExperienceController = null;

function getCharacterExperienceController() {
  if (!characterExperienceController && typeof CHARACTER_EXPERIENCE_CONTROLLER.createController === "function") {
    characterExperienceController = CHARACTER_EXPERIENCE_CONTROLLER.createController({
      state,
      windowObject: window
    });
  }
  return characterExperienceController || CHARACTER_EXPERIENCE_CONTROLLER;
}

function getCharacterDiagnosticsController() {
  if (!characterDiagnosticsController && typeof CHARACTER_DIAGNOSTICS_CONTROLLER.createController === "function") {
    characterDiagnosticsController = CHARACTER_DIAGNOSTICS_CONTROLLER.createController({
      state,
      characterTuning: CHARACTER_TUNING,
      characterExperienceController: getCharacterExperienceController(),
      appendMessage,
      setStatus,
      buildSpeakProsody,
      speak,
      handleCharacterRuntimeMetadata,
      normalizeRuntimeVoiceStyle,
      runtimeVoiceStyleToTalkStyle,
      updateReplyCharacterChip
    });
  }
  return characterDiagnosticsController || CHARACTER_DIAGNOSTICS_CONTROLLER;
}

async function runVoiceTestAndAppendReport() { return getCharacterDiagnosticsController().runVoiceTestAndAppendReport(); }
function getNextCharacterRehearsalPreset() { return getCharacterDiagnosticsController().getNextCharacterRehearsalPreset(); }
async function runCharacterRehearsalAndAppendReport() { return getCharacterDiagnosticsController().runCharacterRehearsalAndAppendReport(); }
function getLatestCharacterPerformanceSummary() { return getCharacterDiagnosticsController().getLatestCharacterPerformanceSummary(); }
function recordCharacterPerformanceFeedback(rating = "good", note = "") { return getCharacterDiagnosticsController().recordCharacterPerformanceFeedback(rating, note); }
function loadCharacterExperienceProfile() { return getCharacterExperienceController().loadProfile(); }
function getCharacterExperienceRequestProfile() { return getCharacterExperienceController().getRequestProfile(); }
function buildCharacterExperienceSummary() { return getCharacterExperienceController().getProfileSummary(); }
function saveCharacterBrainSnapshotToStorage() {
  if (typeof STORAGE_CONTROLLER.saveCharacterBrainSnapshot === "function") {
    STORAGE_CONTROLLER.saveCharacterBrainSnapshot(state, { windowObject: window });
  }
}
function loadCharacterBrainSnapshotFromStorage() {
  if (typeof STORAGE_CONTROLLER.loadCharacterBrainSnapshot === "function") {
    return STORAGE_CONTROLLER.loadCharacterBrainSnapshot(state, { windowObject: window });
  }
  return null;
}
function handleCharacterBrainDecision(snapshot) {
  if (!snapshot || typeof snapshot !== "object" || Array.isArray(snapshot)) {
    return null;
  }
  state.characterBrainLastDecision = typeof STORAGE_CONTROLLER.sanitizeCharacterBrainSnapshot === "function"
    ? STORAGE_CONTROLLER.sanitizeCharacterBrainSnapshot(snapshot)
    : snapshot;
  state.characterBrainLastUpdatedAt = Date.now();
  saveCharacterBrainSnapshotToStorage();
  try {
    window.__AI_CHAT_LAST_CHARACTER_BRAIN__ = state.characterBrainLastDecision;
  } catch (_) {
    // Optional debug bridge only.
  }
  return state.characterBrainLastDecision;
}
function buildCharacterBrainDebugReport() {
  if (typeof CHARACTER_BRAIN_DEBUG.buildBrainDebugReport === "function") {
    return CHARACTER_BRAIN_DEBUG.buildBrainDebugReport(state.characterBrainLastDecision, {
      updatedAt: state.characterBrainLastUpdatedAt
    });
  }
  return "角色大脑状态\n\n角色大脑诊断模块暂不可用。";
}

let performanceAuditController = null;

function getPerformanceAuditController() {
  if (!performanceAuditController && typeof PERFORMANCE_AUDIT_CONTROLLER.createController === "function") {
    performanceAuditController = PERFORMANCE_AUDIT_CONTROLLER.createController({
      state,
      windowObject: window,
      perfLog
    });
  }
  return performanceAuditController || PERFORMANCE_AUDIT_CONTROLLER;
}

function startPerformanceAudit(context = {}) {
  const controller = getPerformanceAuditController();
  return typeof controller.startPerformanceAudit === "function"
    ? controller.startPerformanceAudit(context)
    : null;
}

function recordPerformanceAuditEvent(kind, detail = {}) {
  const controller = getPerformanceAuditController();
  const summary = typeof controller.recordPerformanceAuditEvent === "function"
    ? controller.recordPerformanceAuditEvent(kind, detail)
    : null;
  if (summary) {
    saveCharacterBrainSnapshotToStorage();
  }
  return summary;
}

function finishPerformanceAudit(extra = {}) {
  const controller = getPerformanceAuditController();
  const summary = typeof controller.finishPerformanceAudit === "function"
    ? controller.finishPerformanceAudit(extra)
    : null;
  if (summary) {
    saveCharacterBrainSnapshotToStorage();
  }
  return summary;
}

let performanceTimelineController = null;

function getPerformanceTimelineController() {
  if (!performanceTimelineController && typeof PERFORMANCE_TIMELINE_CONTROLLER.createController === "function") {
    performanceTimelineController = PERFORMANCE_TIMELINE_CONTROLLER.createController({
      state,
      windowObject: window,
      enqueueActionIntent,
      triggerExpressionPulse,
      maybePlayTalkGesture,
      recordPerformanceAuditEvent,
      perfLog
    });
  }
  return performanceTimelineController || PERFORMANCE_TIMELINE_CONTROLLER;
}

function buildPerformanceTimeline(input = {}) {
  const controller = getPerformanceTimelineController();
  return typeof controller.buildPerformanceTimeline === "function"
    ? controller.buildPerformanceTimeline(input)
    : null;
}

function rememberPerformanceTimeline(timeline) {
  const controller = getPerformanceTimelineController();
  return typeof controller.rememberPerformanceTimeline === "function"
    ? controller.rememberPerformanceTimeline(timeline)
    : null;
}

function buildVoiceTimeline(input = {}) {
  const controller = getPerformanceTimelineController();
  return typeof controller.buildVoiceTimeline === "function"
    ? controller.buildVoiceTimeline(input)
    : null;
}

function rememberVoiceTimeline(timeline) {
  const controller = getPerformanceTimelineController();
  return typeof controller.rememberVoiceTimeline === "function"
    ? controller.rememberVoiceTimeline(timeline)
    : null;
}

function buildVoiceSpeechSegments(text, voiceTimeline) {
  const controller = getPerformanceTimelineController();
  return typeof controller.buildVoiceSpeechSegments === "function"
    ? controller.buildVoiceSpeechSegments(text, voiceTimeline)
    : [String(text || "").trim()].filter(Boolean);
}

function applyVoiceDirectorProsody(prosody, voiceDirector) {
  const controller = getPerformanceTimelineController();
  return typeof controller.applyVoiceDirectorProsody === "function"
    ? controller.applyVoiceDirectorProsody(prosody, voiceDirector)
    : prosody;
}

function clearPerformanceTimelineTimers() {
  const controller = getPerformanceTimelineController();
  if (typeof controller.clearPerformanceTimelineTimers === "function") {
    controller.clearPerformanceTimelineTimers();
  }
}

function executePerformanceTimelinePhase(timeline, phaseName, context = {}) {
  const controller = getPerformanceTimelineController();
  return typeof controller.executePerformanceTimelinePhase === "function"
    ? controller.executePerformanceTimelinePhase(timeline, phaseName, context)
    : false;
}

function schedulePerformanceTimelineSpeechBeats(timeline, context = {}) {
  const controller = getPerformanceTimelineController();
  return typeof controller.schedulePerformanceTimelineSpeechBeats === "function"
    ? controller.schedulePerformanceTimelineSpeechBeats(timeline, context)
    : 0;
}

function buildCharacterTuningReport() { return getCharacterDiagnosticsController().buildCharacterTuningReport(); }
function runCharacterTuningAndAppendReport() { return getCharacterDiagnosticsController().runCharacterTuningAndAppendReport(); }
function buildCharacterWorkflowGuide() { return getCharacterDiagnosticsController().buildCharacterWorkflowGuide(); }
function appendCharacterWorkflowGuide() { return getCharacterDiagnosticsController().appendCharacterWorkflowGuide(); }
function ensureTTSDebugPanel() { return updateTTSDebugPanel(); }
function updateTTSDebugPanel() { return getDiagnosticsRuntimeController().updateTTSDebugPanel(); }
function toggleTTSDebugPanel(force = null) { return getDiagnosticsRuntimeController().toggleTTSDebugPanel(force); }
function sanitizeTranslateDebugText(text, maxLen = 96) { return getDiagnosticsRuntimeController().sanitizeTranslateDebugText(text, maxLen); }
function recordTranslateDebugEvent(stage, payload = {}) { return getDiagnosticsRuntimeController().recordTranslateDebugEvent(stage, payload); }
function getTranslateDebugSnapshot() { return getDiagnosticsRuntimeController().getTranslateDebugSnapshot(); }
function buildTranslateDebugReport() { return getDiagnosticsRuntimeController().buildTranslateDebugReport(); }
function ensureTranslateDebugPanel() { return updateTranslateDebugPanel(); }
function updateTranslateDebugPanel() { return getDiagnosticsRuntimeController().updateTranslateDebugPanel(); }
function toggleTranslateDebugPanel(force = null) { return getDiagnosticsRuntimeController().toggleTranslateDebugPanel(force); }
function installTTSDebugBridge() { return getDiagnosticsRuntimeController().installTTSDebugBridge(); }
function installTranslateDebugBridge() { return getDiagnosticsRuntimeController().installTranslateDebugBridge(); }
const CHAT_DOM = window.TaffyChatDom || {};
const ui = CHAT_DOM.createUI(document);

const learningReviewState =
  typeof window.TaffyLearningReviewController?.createInitialState === "function"
    ? window.TaffyLearningReviewController.createInitialState()
    : {
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

const RUNTIME_VERSION = "20260409_6";
const MAX_PENDING_ATTACHMENTS = 6;
const MAX_TEXT_ATTACHMENT_CHARS = 12000;
const MAX_TOTAL_ATTACHMENT_TEXT_CHARS = 24000;
const MAX_IMAGE_ATTACHMENT_BYTES = 6 * 1024 * 1024;
const ATTACHMENT_MODEL = window.TaffyAttachmentModel || {};
const LEARNING_REVIEW_API = window.TaffyLearningReviewApi || {};
const LEARNING_REVIEW_MODEL = window.TaffyLearningReviewModel || {};
const LEARNING_REVIEW_VIEW = window.TaffyLearningReviewView || {};
const LEARNING_REVIEW_BINDER = window.TaffyLearningReviewBinder || {};
const LEARNING_REVIEW_CONTROLLER = window.TaffyLearningReviewController || {};
const PANEL_CONTROL_BINDER = window.TaffyPanelControlBinder || {};
const ADVANCED_ACTION_BINDER = window.TaffyAdvancedActionBinder || {};
const CHAT_INPUT_BINDER = window.TaffyChatInputBinder || {};
const DESKTOP_CONTROL_BINDER = window.TaffyDesktopControlBinder || {};
const DESKTOP_WINDOW_CONTROLLER = window.TaffyDesktopWindowController || {};
const RUNTIME_EVENT_BINDER = window.TaffyRuntimeEventBinder || {};
const DEBUG_PANEL_CONTROLLER = window.TaffyDebugPanelController || {};
const STORAGE_CONTROLLER = window.TaffyStorageController || {};
const CHAT_MESSAGE_CONTROLLER = window.TaffyChatMessageController || {};
const PERSONA_AVATAR_CONTROLLER = window.TaffyPersonaAvatarController || {};
const ONBOARDING_CONTROLLER = window.TaffyOnboardingController || {};
const REMINDER_SCHEDULE_CONTROLLER = window.TaffyReminderScheduleController || {};
const EMOTION_STATS_CONTROLLER = window.TaffyEmotionStatsController || {};
const LOCAL_ASR_CONTROLLER = window.TaffyLocalAsrController || {};
const AUTO_CHAT_CONTROLLER = window.TaffyAutoChatController || {};
const RUNTIME_METADATA_CONTROLLER = window.TaffyRuntimeMetadataController || {};
const DIAGNOSTICS_RUNTIME_CONTROLLER = window.TaffyDiagnosticsRuntimeController || {};
const TEXT_ATTACHMENT_EXTS = new Set(ATTACHMENT_MODEL.TEXT_ATTACHMENT_EXTS || []);
const REMINDER_STORAGE_KEY = "taffy_reminders_v1";
const EMOTION_STORAGE_KEY = "taffy_emotion_stats_v1";
const DAILY_GREETING_STORAGE_KEY = "taffy_daily_greeting_v1";
const CHAT_HISTORY_STORAGE_KEY = "taffy_chat_history_v2";
const CHAT_TRANSLATION_VISIBILITY_STORAGE_KEY = "taffy_chat_translation_visible_v1";
const SUBTITLE_ENABLED_STORAGE_KEY = "taffy_subtitle_enabled_v1";
const SUBTITLE_POSITION_STORAGE_KEY = "taffy_subtitle_position_v1";
const ONBOARDING_SEEN_STORAGE_KEY = "taffy_onboarding_seen_v1";
const MAX_CHAT_HISTORY_RECORDS = 240;
const TOOL_META_MARKER = "[[TAFFY_TOOL_META]]";
const API_CLIENT = window.TaffyModules?.apiClient || {};
const SPEECH_TEXT = window.TaffyModules?.speechText || {};
const TTS_API = window.TaffyModules?.ttsApi || {};
const ATTACHMENT_CONTROLLER = window.TaffyAttachmentController || {};
const CHAT_TRANSLATION_SERVICE = window.TaffyChatTranslationService || {};
const SUBTITLE_CONTROLLER = window.TaffySubtitleController || {};
const SPEECH_STYLE_CONTROLLER = window.TaffySpeechStyleController || {};
const EMOTION_MOOD_CONTROLLER = window.TaffyEmotionMoodController || {};
const ACTION_PLAN_CONTROLLER = window.TaffyActionPlanController || {};
const MOTION_RUNTIME_CONTROLLER = window.TaffyMotionRuntimeController || {};
const VOICE_RUNTIME_CONTROLLER = window.TaffyVoiceRuntimeController || {};
const WAKE_WORD_CONTROLLER = window.TaffyWakeWordController || {};
const APP_CONFIG_CONTROLLER = window.TaffyAppConfigController || {};
const APP_STARTUP_CONTROLLER = window.TaffyAppStartupController || {};
const STREAM_TTS_QUEUE_CONTROLLER = window.TaffyStreamTtsQueueController || {};
const TTS_PLAYBACK_CONTROLLER = window.TaffyTTSPlaybackController || {};
const CHAT_REPLY_CONTROLLER = window.TaffyChatReplyController || {};
const PERFORMANCE_AUDIT_CONTROLLER = window.TaffyPerformanceAuditController || {};
const PERFORMANCE_TIMELINE_CONTROLLER = window.TaffyPerformanceTimelineController || {};
const LIVE2D_RUNTIME_CONTROLLER = window.TaffyLive2DRuntimeController || {};
const LIVE2D_LAYOUT_CONTROLLER = window.TaffyLive2DLayoutController || {};
const LIVE2D_EXPRESSION_CONTROLLER = window.TaffyLive2DExpressionController || {};
const PERSONA_CARD_DEFAULT = {
  identity: "",
  user_preferences: "",
  user_dislikes: "",
  common_topics: "",
  reply_style: "",
  companionship_style: "",
  updated_at: ""
};
const ASSISTANT_AVATAR_STORAGE_KEY = "taffy_assistant_avatar_v1";
const ASSISTANT_AVATAR_DEFAULT = "./assets/assistant_avatar_ref.png?v=2";
const ASSISTANT_AVATAR_MAX_BYTES = 4 * 1024 * 1024;
const ONBOARDING_STEPS = [
  {
    title: "先打个招呼",
    desc: "在输入框里发一句话，按 Enter 就可以开始聊天。",
    tip: "想先快速感受，点击下方“立即体验（推荐）”即可。"
  },
  {
    title: "语音先用轻量模式",
    desc: "默认语音是 Browser；也支持 Edge TTS。不配置 GPT-SoVITS 也能直接体验语音。",
    tip: "GPT-SoVITS 保留为高级本地音色模式，建议在本地服务稳定后再启用。"
  },
  {
    title: "默认低打扰更安全",
    desc: "首次启动 observe.attach_mode=manual，不会自动观察桌面；工具调用默认关闭。",
    tip: "如需启用 tools 或 allow_shell，请在高级配置中手动开启并注意风险。"
  },
  {
    title: "需要进阶再去配置中心",
    desc: "想自定义 LLM、TTS、工具和人设，可进入高级配置中心继续完善。",
    tip: "建议先体验基础对话，再逐项开启高级能力，排查问题更容易。"
  }
];

function clearPersistedApiToken() {
  if (typeof API_CLIENT.clearPersistedApiToken === "function") {
    return API_CLIENT.clearPersistedApiToken();
  }
  if (typeof window.clearPersistedApiToken === "function" && window.clearPersistedApiToken !== clearPersistedApiToken) {
    return window.clearPersistedApiToken();
  }
}

async function resolveApiToken(forceRefresh = false) {
  if (typeof API_CLIENT.resolveApiToken === "function") {
    return API_CLIENT.resolveApiToken(forceRefresh);
  }
  if (typeof window.resolveApiToken === "function" && window.resolveApiToken !== resolveApiToken) {
    return window.resolveApiToken(forceRefresh);
  }
  return "";
}

async function authFetch(input, init = {}) {
  if (typeof API_CLIENT.authFetch === "function") {
    return API_CLIENT.authFetch(input, init);
  }
  if (typeof window.authFetch === "function" && window.authFetch !== authFetch) {
    return window.authFetch(input, init);
  }
  return fetch(input, init);
}

function isApiRequestTarget(input) {
  if (typeof API_CLIENT.isApiRequestTarget === "function") {
    return API_CLIENT.isApiRequestTarget(input);
  }
  if (typeof window.isApiRequestTarget === "function" && window.isApiRequestTarget !== isApiRequestTarget) {
    return window.isApiRequestTarget(input);
  }
  try {
    const isRequest = typeof Request !== "undefined" && input instanceof Request;
    const raw = isRequest ? input.url : String(input || "");
    const url = new URL(raw, window.location.origin);
    return url.pathname.startsWith("/api/");
  } catch (_) {
    return false;
  }
}
const AUTO_CHAT_MIN_USER_GAP_MS = 45 * 1000;
const AUTO_CHAT_MIN_ASSISTANT_GAP_MS = 60 * 1000;
const AUTO_CHAT_MIN_BETWEEN_TRIGGERS_MS = 4 * 60 * 1000;
const AUTO_CHAT_EMO_RE = /(emo|sad|bad|tired|stressed|anxious|lonely|rough|overwhelmed|\u96be\u53d7|\u96be\u8fc7|\u7126\u8651|\u538b\u529b|\u5931\u7720|\u5fc3\u60c5\u4e0d\u597d|\u4f4e\u843d)/i;
const AUTO_CHAT_MIRROR_RE = /(what about you|your turn|you think|do you think|what do you think|\u4f60\u5462|\u90a3\u4f60|\u4f60\u89c9\u5f97|\u4f60\u600e\u4e48\u60f3)/i;
const AUTO_CHAT_TOPIC_RE = /(project|exam|work|study|code|model|deploy|plan|progress|goal|desk|desktop|cursor|\u9879\u76ee|\u8003\u8bd5|\u5de5\u4f5c|\u5b66\u4e60|\u4ee3\u7801|\u6a21\u578b|\u90e8\u7f72|\u8ba1\u5212|\u8fdb\u5ea6|\u76ee\u6807|\u684c\u9762|\u5149\u6807)/i;
const AUTO_CHAT_ASK_RE = /[?\uFF1F]\s*$/;
const AUTO_CHAT_OPEN_LOOP_RE = /(later|tomorrow|next time|after this|come back to it|drop it for now|\u5f85\u4f1a|\u7a0d\u540e|\u56de\u5934|\u660e\u5929|\u4e0b\u6b21|\u4e4b\u540e|\u518d\u804a|\u5148\u8fd9\u6837)/i;
const AUTO_CHAT_BRIEF_REPLY_RE = /^(ok|okay|sure|yeah|yep|got it|fine|good|\u55ef|\u597d|\u884c|\u6536\u5230|\u77e5\u9053\u4e86|\u5148\u8fd9\u6837)$/i;
const AUTO_CHAT_REPEAT_REASON_WINDOW_MS = 14 * 60 * 1000;
const AUTO_CHAT_REPEAT_TOPIC_WINDOW_MS = 22 * 60 * 1000;
const AUTO_CHAT_BURST_RESET_WINDOW_MS = 18 * 60 * 1000;
const AUTO_CHAT_REASON_PRIORITY = [
  "emotion_signal",
  "open_loop",
  "stage_pause",
  "followup_pending",
  "brief_ack_drop",
  "quiet_ack",
  "mirror_question",
  "topic_hot",
  "long_silence",
  "mid_silence",
  "deep_talk_pause"
];
const AUTO_CHAT_REASON_HINTS = {
  emotion_signal: "The recent tone carried an emotional signal; answer with warmth, not pressure.",
  open_loop: "The last message left a light open thread; continue it gently.",
  stage_pause: "The user left a small pause after a statement; add one live stage aside without demanding a reply.",
  followup_pending: "The previous turn had a small open loop; reconnect without restarting.",
  brief_ack_drop: "The user closed with a short acknowledgement; leave one soft bridge.",
  quiet_ack: "The user gave a quiet acknowledgement; leave one tiny companion line and stop.",
  mirror_question: "The user handed the thought back; give your stance in one line.",
  topic_hot: "The recent topic still has energy; add one small lived-in reaction.",
  long_silence: "It has been quiet for a while; speak like a small thought surfaced.",
  mid_silence: "There has been a pause; touch the thread lightly.",
  deep_talk_pause: "The previous exchange was deeper; add one calm, grounded line."
};
const AUTO_CHAT_STYLE_NOTES = [
  "Keep it casual, like a thought spoken aloud.",
  "Use a short sentence with a little personality.",
  "Stay warm without sounding like a support script.",
  "Let the line end naturally without pushing for a reply.",
  "Avoid task-notification phrasing."
];
const WAITING_VOICE_HINTS = [
  "I'm thinking, one second.",
  "Let me shape that for a moment.",
  "One second, I'm with you."
];
const MOTION_INTENSITY_PRESETS = {
  low: {
    idleIntervalScale: 1.35,
    talkChance: 0.55,
    comboChance: 0.18,
    tapChance: 0.7,
    listenChance: 0.62,
    thinkingComboChance: 0.28,
    idleComboChance: 0.16,
    replyAccentChance: 0.22,
    talkMaxBeats: 2
  },
  normal: {
    idleIntervalScale: 1.0,
    talkChance: 0.82,
    comboChance: 0.4,
    tapChance: 0.92,
    listenChance: 0.8,
    thinkingComboChance: 0.46,
    idleComboChance: 0.3,
    replyAccentChance: 0.42,
    talkMaxBeats: 3
  },
  high: {
    idleIntervalScale: 0.76,
    talkChance: 1.0,
    comboChance: 0.64,
    tapChance: 1.0,
    listenChance: 0.94,
    thinkingComboChance: 0.68,
    idleComboChance: 0.48,
    replyAccentChance: 0.62,
    talkMaxBeats: 4
  }
};
const LIVE2D_EXPRESSION_TUNING = window.TaffyLive2DExpressionTuning || {};
const STYLE_EXPRESSION_PROFILE = LIVE2D_EXPRESSION_TUNING.STYLE_EXPRESSION_PROFILE || {
  neutral: {
    mouthForm: 0.04,
    cheek: 0.06,
    eyeSmile: 0.05,
    browY: 0.0,
    browAngle: 0.0,
    headX: 0.0,
    headY: 0.0,
    bodyX: 0.0,
    floatScale: 1.0
  }
};
const RUNTIME_EMOTION_EXPRESSION_TUNING = LIVE2D_EXPRESSION_TUNING.RUNTIME_EMOTION_EXPRESSION_TUNING || {
  idle: {
    pulseBoost: 0.36,
    pulseDurationMs: 240,
    holdMs: 900,
    weight: 1.0
  }
};
const MODEL_MOTION_PROFILES = {
  hiyori_pro_t11: {
    cadence: {
      floatAmp: 1.12,
      floatSpeed: 1.08,
      idleIntervalScale: 0.9,
      talkBeatScale: 1.18
    },
    intents: {
      idle: ["Idle", "FlickDown", "Flick"],
      listen: ["Flick", "Idle", "Tap@Body"],
      thinking: ["FlickUp", "Flick", "Idle"],
      talk: ["Tap", "FlickUp", "Tap@Body", "Idle"],
      reply: ["Tap", "FlickUp", "Flick", "Tap@Body", "Idle"],
      tap: ["Tap", "Tap@Body", "FlickUp", "Flick", "Idle"]
    },
    moods: {
      happy: ["Tap", "FlickUp", "Tap@Body", "Idle"],
      sad: ["FlickDown", "Idle", "Flick"],
      angry: ["Flick@Body", "Tap@Body", "Flick", "Idle"],
      surprised: ["FlickUp", "Tap", "Flick", "Idle"],
      idle: ["Idle", "Flick", "FlickDown"]
    }
  }
};
const TAP_MOVE_THRESHOLD = 8;
const TAP_MAX_DURATION_MS = 280;
const VISION_INTENT_RE =
  /(看到|看见|桌面|屏幕|画面|截图|图里|图片|界面|识别|观察|what do you see|look at|screen|desktop|screenshot|image)/i;

function applyDisplayModeFromUrl() {
  const params = new URLSearchParams(window.location.search || "");
  const root = document.documentElement;
  const transparent = params.get("transparent") === "1";
  const alphaMode = params.get("alpha_mode") || (transparent ? "truealpha" : "none");
  const view = String(params.get("view") || "full").toLowerCase();
  state.uiView = ["model", "chat", "full"].includes(view) ? view : "full";
  root.classList.remove("view-model", "view-chat", "view-full");
  document.body.classList.remove("view-model", "view-chat", "view-full");
  root.classList.add(`view-${state.uiView}`);
  document.body.classList.add(`view-${state.uiView}`);
  if (params.get("desktop") === "1") {
    root.classList.add("desktop-mode");
    document.body.classList.add("desktop-mode");
  }
  if (transparent) {
    root.classList.add("transparent-mode");
    document.body.classList.add("transparent-mode");
    if (alphaMode === "colorkey") {
      root.classList.add("alpha-colorkey");
      document.body.classList.add("alpha-colorkey");
    } else {
      root.classList.add("alpha-true");
      document.body.classList.add("alpha-true");
    }
  }
  state.desktopMode = document.body.classList.contains("desktop-mode");
  state.alphaMode = alphaMode;
}

applyDisplayModeFromUrl();

function refreshDesktopBridgeReady() {
  const hasPyBridge =
    !!window.pywebview &&
    !!window.pywebview.api &&
    typeof window.pywebview.api.drag_window === "function";
  const hasElectronMoveBridge =
    !!window.electronAPI &&
    typeof window.electronAPI.moveWindowBy === "function";
  const hasElectronCaptureBridge =
    !!window.electronAPI &&
    typeof window.electronAPI.captureDesktop === "function";

  if (hasElectronMoveBridge || hasElectronCaptureBridge) {
    state.desktopBridge = "electron";
  } else if (hasPyBridge) {
    state.desktopBridge = "pywebview";
  } else {
    state.desktopBridge = "";
  }
  state.desktopCanMoveWindow =
    state.desktopMode &&
    !state.windowLocked &&
    (hasElectronMoveBridge || hasPyBridge);
  state.desktopCanCapture = state.desktopMode && hasElectronCaptureBridge;
  state.useNativeWindowDrag = false;
  document.body.classList.toggle("native-window-drag", !!state.useNativeWindowDrag);
  document.documentElement.classList.toggle("native-window-drag", !!state.useNativeWindowDrag);
  if (state.windowLocked && state.windowDragActive) {
    stopDesktopWindowDrag();
  }
  updateObserveButton();
  updateLockButton();
}

function moveDesktopWindowBy(dx, dy) {
  if (typeof DESKTOP_WINDOW_CONTROLLER.moveWindowBy === "function") {
    DESKTOP_WINDOW_CONTROLLER.moveWindowBy(state, dx, dy, { windowObject: window });
  }
}

function endDesktopWindowDragSession() {
  if (typeof DESKTOP_WINDOW_CONTROLLER.endWindowDragSession === "function") {
    DESKTOP_WINDOW_CONTROLLER.endWindowDragSession(state, { windowObject: window });
  }
}

function stopDesktopWindowDrag() {
  if (typeof DESKTOP_WINDOW_CONTROLLER.stopWindowDrag === "function") {
    DESKTOP_WINDOW_CONTROLLER.stopWindowDrag(state, {
      windowObject: window,
      documentObject: document,
      cancelAnimationFrame,
      clampModelVisibleInViewport
    });
  }
}

function finalizeDesktopDrag() {
  if (typeof DESKTOP_WINDOW_CONTROLLER.finalizeDesktopDrag === "function") {
    DESKTOP_WINDOW_CONTROLLER.finalizeDesktopDrag(state, {
      windowObject: window,
      performanceObject: performance,
      placeModel
    });
  }
}

function isServerTTSProvider(provider) {
  const p = String(provider || "").toLowerCase();
  return p === "edge_tts" || p === "gpt_sovits" || p === "volcengine_tts" || p === "volcengine";
}

function setStatus(text) {
  if (typeof CHAT_DOM.setStatus === "function") {
    CHAT_DOM.setStatus(ui, text);
  }
}

function safeParseJSON(raw, fallback) {
  return typeof STORAGE_CONTROLLER.safeParseJSON === "function"
    ? STORAGE_CONTROLLER.safeParseJSON(raw, fallback)
    : fallback;
}

function loadRemindersFromStorage() {
  if (typeof STORAGE_CONTROLLER.loadReminders === "function") {
    STORAGE_CONTROLLER.loadReminders(state, {
      windowObject: window,
      renderScheduleList,
      normalizeReminderMode,
      normalizeReminderRepeat,
      normalizeDailyReminderDueAt
    });
  }
}

function saveRemindersToStorage() {
  if (typeof STORAGE_CONTROLLER.saveReminders === "function") {
    STORAGE_CONTROLLER.saveReminders(state, { windowObject: window, renderScheduleList });
  }
}

function loadDailyGreetingState() {
  if (typeof STORAGE_CONTROLLER.loadDailyGreetingState === "function") {
    STORAGE_CONTROLLER.loadDailyGreetingState(state, { windowObject: window });
  }
}

function saveDailyGreetingState() {
  if (typeof STORAGE_CONTROLLER.saveDailyGreetingState === "function") {
    STORAGE_CONTROLLER.saveDailyGreetingState(state, { windowObject: window });
  }
}

let chatMessageController = null;

function getChatMessageController() {
  if (!chatMessageController && typeof CHAT_MESSAGE_CONTROLLER.createController === "function") {
    chatMessageController = CHAT_MESSAGE_CONTROLLER.createController({
      state,
      ui,
      documentObject: document,
      windowObject: window,
      maxChatHistoryRecords: MAX_CHAT_HISTORY_RECORDS,
      storageController: STORAGE_CONTROLLER,
      parseToolMetaFromText,
      renderToolMetaCards,
      fetchChatTranslation: _fetchChatTranslation,
      readChatTranslationCache: _readChatTranslationCache,
      shouldShowAssistantTranslation: _shouldShowAssistantTranslation,
      saveChatHistory: saveChatHistoryToStorage
    });
  }
  return chatMessageController;
}

function parseMessageTimestamp(value) {
  return getChatMessageController().parseMessageTimestamp(value);
}

function formatMessageTime(value) {
  return getChatMessageController().formatMessageTime(value);
}

function formatMessageDivider(value) {
  return getChatMessageController().formatMessageDivider(value);
}

function shouldInsertTimeDivider(previousTs, currentTs) {
  return getChatMessageController().shouldInsertTimeDivider(previousTs, currentTs);
}

function createTimeDivider(timestamp) {
  return getChatMessageController().createTimeDivider(timestamp);
}

function trimChatRecords(records) {
  return getChatMessageController().trimChatRecords(records);
}

function saveChatHistoryToStorage() {
  if (typeof STORAGE_CONTROLLER.saveChatHistory === "function") {
    STORAGE_CONTROLLER.saveChatHistory(state, {
      windowObject: window,
      maxChatHistoryRecords: MAX_CHAT_HISTORY_RECORDS
    });
  }
}

function saveChatTranslationVisibilityToStorage() {
  if (typeof STORAGE_CONTROLLER.saveChatTranslationVisibility === "function") {
    STORAGE_CONTROLLER.saveChatTranslationVisibility(state, { windowObject: window });
  }
}

function updateTranslationToggleButton() {
  const visible = state.chatTranslationVisible !== false;
  if (ui.translationToggleBtn) {
    ui.translationToggleBtn.classList.toggle("is-off", !visible);
    ui.translationToggleBtn.setAttribute("aria-pressed", visible ? "true" : "false");
    ui.translationToggleBtn.setAttribute("title", visible ? "隐藏会话翻译" : "显示会话翻译");
    ui.translationToggleBtn.textContent = visible ? "翻译  开" : "翻译  关";
  }
  if (ui.translationChipBtn) {
    ui.translationChipBtn.classList.toggle("is-off", !visible);
    ui.translationChipBtn.setAttribute("aria-pressed", visible ? "true" : "false");
    ui.translationChipBtn.setAttribute("title", visible ? "隐藏会话翻译" : "显示会话翻译");
    ui.translationChipBtn.textContent = visible ? "会话翻译已显示" : "会话翻译已收起";
  }
}

function toggleChatTranslationVisibility() {
  state.chatTranslationVisible = !state.chatTranslationVisible;
  applyChatTranslationVisibility();
  saveChatTranslationVisibilityToStorage();
  setStatus(state.chatTranslationVisible ? "会话翻译已显示" : "会话翻译已收起");
}

function setAdvancedActionsExpanded(expanded) {
  const open = !!expanded;
  if (ui.advancedActions) {
    ui.advancedActions.hidden = !open;
  }
  if (ui.moreBtn) {
    ui.moreBtn.setAttribute("aria-expanded", open ? "true" : "false");
    ui.moreBtn.textContent = open ? "收起" : "更多";
  }
}

function applyChatTranslationVisibility() {
  const visible = state.chatTranslationVisible !== false;
  document.body.classList.toggle("chat-translation-collapsed", !visible);
  updateTranslationToggleButton();
}

function loadChatTranslationVisibilityFromStorage() {
  if (typeof STORAGE_CONTROLLER.loadChatTranslationVisibility === "function") {
    STORAGE_CONTROLLER.loadChatTranslationVisibility(state, {
      windowObject: window,
      updateChatTranslationVisibility: applyChatTranslationVisibility
    });
  }
}

function saveSubtitleEnabledToStorage() {
  if (typeof STORAGE_CONTROLLER.saveSubtitleEnabled === "function") {
    STORAGE_CONTROLLER.saveSubtitleEnabled(state, { windowObject: window });
  }
}

function loadSubtitleEnabledFromStorage() {
  if (typeof STORAGE_CONTROLLER.loadSubtitleEnabled === "function") {
    STORAGE_CONTROLLER.loadSubtitleEnabled(state, {
      windowObject: window,
      applySubtitleEnabledState
    });
  }
}

function saveSubtitlePositionToStorage() {
  if (typeof STORAGE_CONTROLLER.saveSubtitlePosition === "function") {
    STORAGE_CONTROLLER.saveSubtitlePosition(state, { windowObject: window });
  }
}

function loadSubtitlePositionFromStorage() {
  if (typeof STORAGE_CONTROLLER.loadSubtitlePosition === "function") {
    STORAGE_CONTROLLER.loadSubtitlePosition(state, {
      windowObject: window,
      applySubtitlePositionFromState
    });
  }
}

function applySubtitlePositionFromState() {
  if (!ui.subtitleLayer) {
    return;
  }
  if (!state.subtitlePositionCustom) {
    ui.subtitleLayer.classList.remove("subtitle-pos-custom");
    ui.subtitleLayer.style.left = "";
    ui.subtitleLayer.style.top = "";
    ui.subtitleLayer.style.bottom = "";
    return;
  }
  ui.subtitleLayer.classList.add("subtitle-pos-custom");
  ui.subtitleLayer.style.left = `${Math.round(state.subtitlePositionRatioX * 1000) / 10}%`;
  ui.subtitleLayer.style.top = `${Math.round(state.subtitlePositionRatioY * 1000) / 10}%`;
  ui.subtitleLayer.style.bottom = "auto";
}

function updateSubtitleToggleButton() {
  if (!ui.subtitleToggleBtn) {
    return;
  }
  const enabled = state.subtitleEnabled !== false;
  ui.subtitleToggleBtn.classList.toggle("is-off", !enabled);
  ui.subtitleToggleBtn.setAttribute("aria-pressed", enabled ? "true" : "false");
  ui.subtitleToggleBtn.textContent = enabled ? "字幕: 开" : "字幕: 关";
}

function applySubtitleEnabledState() {
  updateSubtitleToggleButton();
  if (state.subtitleEnabled) {
    return;
  }
  hideSubtitleText();
}

function toggleSubtitleEnabled() {
  state.subtitleEnabled = !state.subtitleEnabled;
  applySubtitleEnabledState();
  saveSubtitleEnabledToStorage();
  setStatus(state.subtitleEnabled ? "字幕已开启" : "字幕已关闭");
}

function bindSubtitleDragHandle() {
  if (!ui.subtitleLayer || !ui.subtitleDragHandle) {
    return;
  }
  const onPointerMove = (event) => {
    if (!state.subtitleDragPointerId) {
      return;
    }
    if (!state.subtitleEnabled) {
      return;
    }
    const vw = Math.max(1, window.innerWidth || document.documentElement.clientWidth || 1);
    const vh = Math.max(1, window.innerHeight || document.documentElement.clientHeight || 1);
    const x = clampNumber(Number(event.clientX || 0) / vw, 0.05, 0.95);
    const y = clampNumber(Number(event.clientY || 0) / vh, 0.12, 0.92);
    state.subtitlePositionRatioX = x;
    state.subtitlePositionRatioY = y;
    state.subtitlePositionCustom = true;
    applySubtitlePositionFromState();
  };
  const endDrag = () => {
    if (!state.subtitleDragPointerId) {
      return;
    }
    state.subtitleDragPointerId = 0;
    ui.subtitleLayer.classList.remove("subtitle-dragging");
    saveSubtitlePositionToStorage();
  };
  ui.subtitleDragHandle.addEventListener("pointerdown", (event) => {
    if (!state.subtitleEnabled) {
      return;
    }
    event.preventDefault();
    state.subtitleDragPointerId = Number(event.pointerId) || 1;
    ui.subtitleLayer.classList.add("subtitle-dragging");
    try {
      ui.subtitleDragHandle.setPointerCapture(event.pointerId);
    } catch (_) {
      // ignore pointer capture failures
    }
  });
  window.addEventListener("pointermove", onPointerMove);
  window.addEventListener("pointerup", endDrag);
  window.addEventListener("pointercancel", endDrag);
}

function saveOnboardingSeenToStorage(seen) {
  if (typeof STORAGE_CONTROLLER.saveOnboardingSeen === "function") {
    STORAGE_CONTROLLER.saveOnboardingSeen(seen, { windowObject: window });
  }
}

function loadOnboardingSeenFromStorage() {
  if (typeof STORAGE_CONTROLLER.loadOnboardingSeen === "function") {
    STORAGE_CONTROLLER.loadOnboardingSeen(state, { windowObject: window });
  }
}

let onboardingController = null;

function getOnboardingController() {
  if (!onboardingController && typeof ONBOARDING_CONTROLLER.createController === "function") {
    onboardingController = ONBOARDING_CONTROLLER.createController({
      state,
      ui,
      windowObject: window,
      onboardingSteps: ONBOARDING_STEPS,
      saveOnboardingSeenToStorage
    });
  }
  return onboardingController;
}

function isHelpOpen() {
  return getOnboardingController().isHelpOpen();
}

function isOnboardingOpen() {
  return getOnboardingController().isOnboardingOpen();
}

function closeHelpModal() {
  return getOnboardingController().closeHelpModal();
}

function openHelpModal() {
  return getOnboardingController().openHelpModal();
}

function openAdvancedConfigCenter() {
  return getOnboardingController().openAdvancedConfigCenter();
}

function renderOnboardingStep() {
  return getOnboardingController().renderOnboardingStep();
}

function closeOnboardingModal(options = {}) {
  return getOnboardingController().closeOnboardingModal(options);
}

function openOnboardingModal(options = {}) {
  return getOnboardingController().openOnboardingModal(options);
}

function moveOnboardingStep(delta) {
  return getOnboardingController().moveOnboardingStep(delta);
}

function maybeAutoOpenOnboarding() {
  return getOnboardingController().maybeAutoOpenOnboarding();
}

function syncConversationHistoryFromChatRecords() {
  return getChatMessageController().syncConversationHistoryFromChatRecords();
}

function normalizeChatRecord(item) {
  return getChatMessageController().normalizeChatRecord(item);
}

function renderChatHistoryFromState() {
  return getChatMessageController().renderChatHistoryFromState();
}

function loadChatHistoryFromStorage() {
  return getChatMessageController().loadChatHistoryFromStorage();
}

let reminderScheduleController = null;

function getReminderScheduleController() {
  if (!reminderScheduleController && typeof REMINDER_SCHEDULE_CONTROLLER.createController === "function") {
    reminderScheduleController = REMINDER_SCHEDULE_CONTROLLER.createController({
      state,
      ui,
      documentObject: document,
      windowObject: window,
      reminderUtils: REMINDER_UTILS,
      scheduleListView: SCHEDULE_LIST_VIEW,
      scheduleFormModel: SCHEDULE_FORM_MODEL,
      setStatus,
      saveRemindersToStorage,
      saveDailyGreetingState,
      requestAssistantReply,
      appendMessage,
      buildSpeakProsody,
      speak,
      isHelpOpen,
      closeHelpModal,
      isOnboardingOpen,
      closeOnboardingModal,
      closePersonaPanel,
      isLearningReviewOpen,
      closeLearningReviewDrawer
    });
  }
  return reminderScheduleController;
}

function getLocalDateKey(date = new Date()) {
  return getReminderScheduleController().getLocalDateKey(date);
}

function parseReminderWhen(rawWhen) {
  return getReminderScheduleController().parseReminderWhen(rawWhen);
}

function formatReminderTime(ts) {
  return getReminderScheduleController().formatReminderTime(ts);
}

function normalizeReminderMode(mode) {
  return getReminderScheduleController().normalizeReminderMode(mode);
}

function normalizeReminderRepeat(repeat) {
  return getReminderScheduleController().normalizeReminderRepeat(repeat);
}

function normalizeDailyReminderDueAt(dueAt, now = Date.now()) {
  return getReminderScheduleController().normalizeDailyReminderDueAt(dueAt, now);
}

function shiftReminderToNextDay(dueAt) {
  return getReminderScheduleController().shiftReminderToNextDay(dueAt);
}

function buildReminderDisplayTime(item) {
  return getReminderScheduleController().buildReminderDisplayTime(item);
}

function buildReminderTypeLabel(item) {
  return getReminderScheduleController().buildReminderTypeLabel(item);
}

function buildDefaultScheduleDateTimeValue() {
  return getReminderScheduleController().buildDefaultScheduleDateTimeValue();
}

function openSchedulePanel() {
  return getReminderScheduleController().openSchedulePanel();
}

function closeSchedulePanel() {
  return getReminderScheduleController().closeSchedulePanel();
}

let personaAvatarController = null;

function getPersonaAvatarController() {
  if (!personaAvatarController && typeof PERSONA_AVATAR_CONTROLLER.createController === "function") {
    personaAvatarController = PERSONA_AVATAR_CONTROLLER.createController({
      state,
      ui,
      documentObject: document,
      windowObject: window,
      storageController: STORAGE_CONTROLLER,
      authFetch,
      setStatus,
      assistantAvatarDefault: ASSISTANT_AVATAR_DEFAULT,
      assistantAvatarMaxBytes: ASSISTANT_AVATAR_MAX_BYTES,
      personaCardDefault: PERSONA_CARD_DEFAULT,
      isHelpOpen,
      closeHelpModal,
      isOnboardingOpen,
      closeOnboardingModal,
      closeSchedulePanel,
      isLearningReviewOpen,
      closeLearningReviewDrawer
    });
  }
  return personaAvatarController;
}

function normalizeAssistantAvatarUrl(raw) {
  return getPersonaAvatarController().normalizeAssistantAvatarUrl(raw);
}

function readAssistantAvatarFromStorage() {
  return getPersonaAvatarController().readAssistantAvatarFromStorage();
}

function saveAssistantAvatarToStorage(url) {
  return getPersonaAvatarController().saveAssistantAvatarToStorage(url);
}

function avatarUrlToCssValue(url) {
  return getPersonaAvatarController().avatarUrlToCssValue(url);
}

function applyAssistantAvatar(url, options = {}) {
  return getPersonaAvatarController().applyAssistantAvatar(url, options);
}

function initAssistantAvatar() {
  return getPersonaAvatarController().initAssistantAvatar();
}

function readFileAsDataUrl(file) {
  return getPersonaAvatarController().readFileAsDataUrl(file);
}

async function setAssistantAvatarFromFile(file) {
  return getPersonaAvatarController().setAssistantAvatarFromFile(file);
}

function normalizePersonaCardData(raw) {
  return getPersonaAvatarController().normalizePersonaCardData(raw);
}

function applyPersonaCardToForm(card) {
  return getPersonaAvatarController().applyPersonaCardToForm(card);
}

function readPersonaCardFromForm() {
  return getPersonaAvatarController().readPersonaCardFromForm();
}

function applyPersonaTemplateDraft() {
  return getPersonaAvatarController().applyPersonaTemplateDraft();
}

function applyRandomPersonaDraft() {
  return getPersonaAvatarController().applyRandomPersonaDraft();
}

function resetPersonaDraft() {
  return getPersonaAvatarController().resetPersonaDraft();
}

async function loadPersonaCard() {
  return getPersonaAvatarController().loadPersonaCard();
}

function openPersonaPanel() {
  return getPersonaAvatarController().openPersonaPanel();
}

function closePersonaPanel() {
  return getPersonaAvatarController().closePersonaPanel();
}

async function savePersonaCardFromForm() {
  return getPersonaAvatarController().savePersonaCardFromForm();
}

let learningReviewController = null;

function getLearningReviewController() {
  if (!learningReviewController && typeof LEARNING_REVIEW_CONTROLLER.createController === "function") {
    learningReviewController = LEARNING_REVIEW_CONTROLLER.createController({
      learningReviewState,
      ui,
      documentObject: document,
      api: LEARNING_REVIEW_API,
      model: LEARNING_REVIEW_MODEL,
      view: LEARNING_REVIEW_VIEW,
      binder: LEARNING_REVIEW_BINDER,
      memoryDebugReport: window.TaffyMemoryDebugReport || {},
      authFetch,
      setStatus,
      isHelpOpen,
      closeHelpModal,
      isOnboardingOpen,
      closeOnboardingModal,
      closeSchedulePanel,
      closePersonaPanel
    });
  }
  return learningReviewController || LEARNING_REVIEW_CONTROLLER;
}

function isLearningReviewOpen() { return getLearningReviewController().isLearningReviewOpen(); }
function getLearningSelectedSet(tab = learningReviewState.activeTab) { return getLearningReviewController().getLearningSelectedSet(tab); }
function normalizeLearningReviewItem(item, fallbackId) { return getLearningReviewController().normalizeLearningReviewItem(item, fallbackId); }
function setLearningReviewLoading(loading) { return getLearningReviewController().setLearningReviewLoading(loading); }
function syncLearningQuickSettingsUI() { return getLearningReviewController().syncLearningQuickSettingsUI(); }
function applyLearningPayload(payload) { return getLearningReviewController().applyLearningPayload(payload); }
function applyMemoryDebugPayload(payload) { return getLearningReviewController().applyMemoryDebugPayload(payload); }
function parseLearningFilterNumber(input, fallback = 0) { return getLearningReviewController().parseLearningFilterNumber(input, fallback); }
function parseLearningUpdatedTime(item) { return getLearningReviewController().parseLearningUpdatedTime(item); }
function applyLearningHighScorePreset() { return getLearningReviewController().applyLearningHighScorePreset(); }
function resetLearningFilters() { return getLearningReviewController().resetLearningFilters(); }
function getLearningFilteredItems() { return getLearningReviewController().getLearningFilteredItems(); }
function buildMemoryDebugReport(snapshot = learningReviewState.debugSnapshot) { return getLearningReviewController().buildMemoryDebugReport(snapshot); }
function renderLearningDebugPanel() { return getLearningReviewController().renderLearningDebugPanel(); }
function refreshLearningSelectAllState(filteredItems) { return getLearningReviewController().refreshLearningSelectAllState(filteredItems); }
function renderLearningReviewList() { return getLearningReviewController().renderLearningReviewList(); }
async function learningFetchJson(url, options = {}) { return getLearningReviewController().learningFetchJson(url, options); }
async function reloadLearningReviewData() { return getLearningReviewController().reloadLearningReviewData(); }
async function reloadMemoryDebugData() { return getLearningReviewController().reloadMemoryDebugData(); }
async function updateLearningEntries(action, extra = {}) { return getLearningReviewController().updateLearningEntries(action, extra); }
async function promoteLearningEntries(candidateIds) { return getLearningReviewController().promoteLearningEntries(candidateIds); }
async function undoLearningLastStep() { return getLearningReviewController().undoLearningLastStep(); }
function openLearningReviewDrawer() { return getLearningReviewController().openLearningReviewDrawer(); }
function closeLearningReviewDrawer() { return getLearningReviewController().closeLearningReviewDrawer(); }
function toggleLearningReviewDrawer() { return getLearningReviewController().toggleLearningReviewDrawer(); }
async function runLearningSingleAction(action, itemId) { return getLearningReviewController().runLearningSingleAction(action, itemId); }
async function runLearningBatchAction(action) { return getLearningReviewController().runLearningBatchAction(action); }
async function applyLearningQuickSettings() { return getLearningReviewController().applyLearningQuickSettings(); }
function bindLearningReviewControls() { return getLearningReviewController().bindLearningReviewControls(); }
function bindPanelControls() {
  if (typeof PANEL_CONTROL_BINDER.bindPanelControls !== "function") {
    return;
  }
  PANEL_CONTROL_BINDER.bindPanelControls(ui, {
    isHelpOpen,
    openHelpModal,
    closeHelpModal,
    openOnboardingModal,
    closeOnboardingModal,
    moveOnboardingStep,
    openAdvancedConfigCenter,
    openSchedulePanel,
    closeSchedulePanel,
    saveScheduleFromForm,
    openPersonaPanel,
    closePersonaPanel,
    savePersonaCardFromForm,
    setAssistantAvatarFromFile,
    applyAssistantAvatar,
    assistantAvatarDefault: ASSISTANT_AVATAR_DEFAULT,
    applyPersonaTemplateDraft,
    applyRandomPersonaDraft,
    resetPersonaDraft,
    setStatus
  });
}

function bindAdvancedActionControls() {
  if (typeof ADVANCED_ACTION_BINDER.bindAdvancedActionControls !== "function") {
    return;
  }
  ADVANCED_ACTION_BINDER.bindAdvancedActionControls(ui, {
    toggleFollowupReadinessPanel,
    updateFollowupCharacterChip,
    runDoctorAndAppendReport,
    runVoiceTestAndAppendReport,
    runCharacterRehearsalAndAppendReport,
    runCharacterTuningAndAppendReport,
    recordCharacterPerformanceFeedback,
    toggleChatTranslationVisibility,
    toggleSubtitleEnabled,
    appendMessage,
    setStatus
  });
}

function updateSpeakButton() {
  if (!ui.speakBtn) {
    return;
  }
  ui.speakBtn.textContent = state.speakingEnabled ? "\u8bed\u97f3\u5f00" : "\u8bed\u97f3\u5173";
}

function bindChatInputControls() {
  if (typeof CHAT_INPUT_BINDER.bindChatInputControls !== "function") {
    return;
  }
  CHAT_INPUT_BINDER.bindChatInputControls(ui, {
    state,
    windowObject: window,
    sendChat,
    handleAttachmentFiles,
    toggleMicOpen,
    isOnboardingOpen,
    closeOnboardingModal,
    isHelpOpen,
    closeHelpModal,
    isLearningReviewOpen,
    closeLearningReviewDrawer,
    closePersonaPanel,
    closeSchedulePanel,
    updateSpeakButton,
    stopAllAudioPlayback,
    switchVoice,
    speak,
    setStatus
  });
}

function bindDesktopControlButtons() {
  if (typeof DESKTOP_CONTROL_BINDER.bindDesktopControlButtons !== "function") {
    return;
  }
  DESKTOP_CONTROL_BINDER.bindDesktopControlButtons(ui, {
    state,
    windowObject: window,
    updateObserveButton,
    updateLockButton,
    updateAutoChatButton,
    setWindowLockedFromUI,
    startAutoChatLoop,
    stopAutoChatLoop,
    setAdvancedActionsExpanded,
    enqueueActionIntent,
    scheduleIdleMotionLoop,
    setStatus
  });
}

function bindRuntimeEvents() {
  if (typeof RUNTIME_EVENT_BINDER.bindRuntimeEvents !== "function") {
    return;
  }
  RUNTIME_EVENT_BINDER.bindRuntimeEvents({
    state,
    windowObject: window,
    applySubtitleDOM: _applySubtitleDOM,
    clearSubtitleDOM: _clearSubtitleDOM,
    applyCharacterRuntimeEmotionToLive2D,
    applyCharacterRuntimeActionToLive2D,
    updateReplyCharacterChip
  });
}


function renderScheduleList() {
  return getReminderScheduleController().renderScheduleList();
}

function addReminder(text, dueAt, opts = {}) {
  return getReminderScheduleController().addReminder(text, dueAt, opts);
}

function listPendingReminders() {
  return getReminderScheduleController().listPendingReminders();
}

function removeReminderById(id) {
  return getReminderScheduleController().removeReminderById(id);
}

function saveScheduleFromForm() {
  return getReminderScheduleController().saveScheduleFromForm();
}

function markReminderTriggered(item) {
  return getReminderScheduleController().markReminderTriggered(item);
}

function startAssistantReminder(item) {
  return getReminderScheduleController().startAssistantReminder(item);
}

function runReminderCheck() {
  return getReminderScheduleController().runReminderCheck();
}

function runDailyGreetingCheck() {
  return getReminderScheduleController().runDailyGreetingCheck();
}

function startReminderLoop() {
  return getReminderScheduleController().startReminderLoop();
}

let emotionStatsController = null;

function getEmotionStatsController() {
  if (!emotionStatsController && typeof EMOTION_STATS_CONTROLLER.createController === "function") {
    emotionStatsController = EMOTION_STATS_CONTROLLER.createController({
      state,
      windowObject: window,
      storageKey: EMOTION_STORAGE_KEY,
      safeParseJSON
    });
  }
  return emotionStatsController;
}

function loadEmotionStats() {
  return getEmotionStatsController().loadEmotionStats();
}

function saveEmotionStats() {
  return getEmotionStatsController().saveEmotionStats();
}

function recordEmotion(mood) {
  return getEmotionStatsController().recordEmotion(mood);
}

function buildEmotionReportText() {
  return getEmotionStatsController().buildEmotionReportText();
}

async function buildMicDebugReport() { return getDiagnosticsRuntimeController().buildMicDebugReport(); }
function getLocalCommandHandlers() {
  return typeof LOCAL_COMMAND_EXECUTOR.createLocalCommandHandlers === "function"
    ? LOCAL_COMMAND_EXECUTOR.createLocalCommandHandlers({
      appendMessage,
      buildMicDebugReport,
      buildTTSDebugReport,
      runDoctorAndAppendReport,
      toggleTTSDebugPanel,
      toggleFollowupReadinessPanel,
      buildFollowupReadinessReport,
      buildTranslateDebugReport,
      toggleTranslateDebugPanel,
      reloadMemoryDebugData,
      buildMemoryDebugReport,
      buildCharacterBrainDebugReport,
      buildEmotionReportText,
      buildSpeakProsody,
      speak,
      runVoiceTestAndAppendReport,
      runCharacterRehearsalAndAppendReport,
      runCharacterTuningAndAppendReport,
      recordCharacterPerformanceFeedback,
      appendCharacterWorkflowGuide,
      listPendingReminders,
      formatReminderTime,
      removeReminderById,
      parseReminderWhen,
      addReminder
    })
    : {};
}

async function handleLocalCommand(inputText) {
  const command = typeof LOCAL_COMMAND_REGISTRY.matchLocalCommand === "function"
    ? LOCAL_COMMAND_REGISTRY.matchLocalCommand(inputText)
    : { kind: "", text: String(inputText || "").trim() };
  const text = String(command.text || inputText || "").trim();
  if (!text.startsWith("/")) {
    return false;
  }
  const handler = getLocalCommandHandlers()[command.kind];
  if (typeof handler !== "function") {
    return false;
  }
  await handler(command);
  return true;
}

function updateObserveButton() {
  if (!ui.observeBtn) {
    return;
  }
  if (!state.desktopCanCapture) {
    ui.observeBtn.disabled = true;
    ui.observeBtn.textContent = "观察桌面: 不可用";
    return;
  }
  ui.observeBtn.disabled = false;
  ui.observeBtn.textContent = state.observeDesktop ? "观察桌面: 开" : "观察桌面: 关";
}

function updateLockButton() {
  if (!ui.lockBtn) {
    return;
  }
  const available =
    state.desktopMode &&
    state.desktopBridge === "electron" &&
    window.electronAPI &&
    typeof window.electronAPI.setWindowLock === "function";
  if (!available) {
    ui.lockBtn.disabled = true;
    ui.lockBtn.textContent = "桌面锁定: 不可用";
    return;
  }
  ui.lockBtn.disabled = false;
  ui.lockBtn.textContent = state.windowLocked ? "桌面锁定: 开" : "桌面锁定: 关";
}

function applyWindowLockedState(locked, options = {}) {
  const next = !!locked;
  const force = !!options.force;
  if (!force && state.windowLocked === next) {
    updateLockButton();
    return;
  }
  state.windowLocked = next;
  if (next) {
    stopDesktopWindowDrag();
  }
  refreshDesktopBridgeReady();
}

function setWindowLockedFromUI(locked) {
  const next = !!locked;
  applyWindowLockedState(next);
  if (
    state.desktopBridge === "electron" &&
    window.electronAPI &&
    typeof window.electronAPI.setWindowLock === "function"
  ) {
    try {
      window.electronAPI.setWindowLock(next);
    } catch (_) {
      // ignore bridge failures
    }
  }
}

async function initWindowLockBridge() {
  if (state.desktopBridge !== "electron" || !window.electronAPI) {
    applyWindowLockedState(false, { force: true });
    return;
  }
  if (typeof state.windowLockUnsubscribe === "function") {
    try {
      state.windowLockUnsubscribe();
    } catch (_) {
      // ignore
    }
  }
  state.windowLockUnsubscribe = null;
  if (typeof window.electronAPI.onWindowLockChanged === "function") {
    try {
      state.windowLockUnsubscribe = window.electronAPI.onWindowLockChanged((locked) => {
        applyWindowLockedState(locked, { force: true });
      });
    } catch (_) {
      state.windowLockUnsubscribe = null;
    }
  }
  if (typeof window.electronAPI.getWindowLock === "function") {
    try {
      const locked = await window.electronAPI.getWindowLock();
      applyWindowLockedState(locked, { force: true });
      return;
    } catch (_) {
      // ignore bridge failures
    }
  }
  updateLockButton();
}

function updateAutoChatButton() {
  if (!ui.autoChatBtn) {
    return;
  }
  ui.autoChatBtn.textContent = state.autoChatEnabled ? "自动对话: 开" : "自动对话: 关";
}

function escapeRegExp(text) {
  return String(text || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function buildAsrHotwordRules(raw) {
  if (!raw || typeof raw !== "object") {
    return [];
  }
  const entries = Object.entries(raw)
    .map(([from, to]) => [String(from || "").trim(), String(to || "").trim()])
    .filter(([from, to]) => from && to);
  entries.sort((a, b) => b[0].length - a[0].length);
  return entries.map(([from, to]) => ({
    from,
    to,
    regex: new RegExp(escapeRegExp(from), "gi")
  }));
}

function applyAsrHotwordCorrections(text) {
  let out = String(text || "").trim();
  if (!out || !state.asrHotwordRules.length) {
    return out;
  }
  for (const rule of state.asrHotwordRules) {
    out = out.replace(rule.regex, rule.to);
  }
  return out.trim();
}

let localAsrController = null;

function getLocalAsrController() {
  if (!localAsrController && typeof LOCAL_ASR_CONTROLLER.createController === "function") {
    localAsrController = LOCAL_ASR_CONTROLLER.createController({
      state,
      ui,
      windowObject: window,
      navigatorObject: navigator,
      performanceObject: performance,
      authFetch,
      setStatus,
      clampNumber,
      applyAsrHotwordCorrections,
      requestAssistantReply,
      scheduleWakeWordStart,
      stopWakeWordListener,
      setupWakeWordRecognition
    });
  }
  return localAsrController;
}

function updateMicMeter(levelOverride = null) {
  return getLocalAsrController().updateMicMeter(levelOverride);
}

function updateMicButton() {
  return getLocalAsrController().updateMicButton();
}

function clearMicRestartTimer() {
  return getLocalAsrController().clearMicRestartTimer();
}

async function ensureMicPermission() {
  return getLocalAsrController().ensureMicPermission();
}

function floatToInt16(floatArray) {
  return getLocalAsrController().floatToInt16(floatArray);
}

function downsampleTo16k(floatArray, inputRate) {
  return getLocalAsrController().downsampleTo16k(floatArray, inputRate);
}

function pcmChunksToBase64(chunks) {
  return getLocalAsrController().pcmChunksToBase64(chunks);
}

async function transcribeLocalPcmChunks(chunks, signal = undefined) {
  return getLocalAsrController().transcribeLocalPcmChunks(chunks, signal);
}

function cancelLocalAsrRequest() {
  return getLocalAsrController().cancelLocalAsrRequest();
}

function updateLocalAsrMicLevelFromRms(rms) {
  return getLocalAsrController().updateLocalAsrMicLevelFromRms(rms);
}

async function ensureAudioContextRunning(ctx) {
  return getLocalAsrController().ensureAudioContextRunning(ctx);
}

function stopLocalAsrMeter() {
  return getLocalAsrController().stopLocalAsrMeter();
}

function startLocalAsrMeter(sessionId = null) {
  return getLocalAsrController().startLocalAsrMeter(sessionId);
}

function stopLocalAsrWatchdog() {
  return getLocalAsrController().stopLocalAsrWatchdog();
}

function startLocalAsrWatchdog(sessionId = null) {
  return getLocalAsrController().startLocalAsrWatchdog(sessionId);
}

async function flushLocalAsrUtterance(force = false, sessionId = null) {
  return getLocalAsrController().flushLocalAsrUtterance(force, sessionId);
}

function handleLocalAsrFrame(floatData, inputSampleRate, sessionId = null) {
  return getLocalAsrController().handleLocalAsrFrame(floatData, inputSampleRate, sessionId);
}

function clearLocalAsrGraph() {
  return getLocalAsrController().clearLocalAsrGraph();
}

function buildLocalAsrAudioConstraints(deviceId = "") {
  return getLocalAsrController().buildLocalAsrAudioConstraints(deviceId);
}

function getLocalAsrAudioTrack(stream) {
  return getLocalAsrController().getLocalAsrAudioTrack(stream);
}

function getLocalAsrTrackLabel(stream) {
  return getLocalAsrController().getLocalAsrTrackLabel(stream);
}

function isLocalAsrTrackMuted(stream) {
  return getLocalAsrController().isLocalAsrTrackMuted(stream);
}

function isDisfavoredLocalAsrInputLabel(label) {
  return getLocalAsrController().isDisfavoredLocalAsrInputLabel(label);
}

function scoreLocalAsrInputDevice(device) {
  return getLocalAsrController().scoreLocalAsrInputDevice(device);
}

function choosePreferredLocalAsrInputDevice(devices) {
  return getLocalAsrController().choosePreferredLocalAsrInputDevice(devices);
}

function rememberLocalAsrInputDevice(stream, devices = []) {
  return getLocalAsrController().rememberLocalAsrInputDevice(stream, devices);
}

async function openPreferredLocalAsrStream(media) {
  return getLocalAsrController().openPreferredLocalAsrStream(media);
}

async function startLocalAsrLoop(sessionId = null) {
  return getLocalAsrController().startLocalAsrLoop(sessionId);
}

function stopLocalAsrLoop(forceFlush = false, sessionId = null) {
  return getLocalAsrController().stopLocalAsrLoop(forceFlush, sessionId);
}

function scheduleMicRecognitionStart(delayMs = 0) {
  return getLocalAsrController().scheduleMicRecognitionStart(delayMs);
}

function stopMicLoop(manualClose = false) {
  return getLocalAsrController().stopMicLoop(manualClose);
}

async function startMicLoop() {
  return getLocalAsrController().startMicLoop();
}

function pauseMicForAssistant() {
  return getLocalAsrController().pauseMicForAssistant();
}

function resumeMicAfterAssistant() {
  return getLocalAsrController().resumeMicAfterAssistant();
}

function enqueueMicTranscript(text, sessionId = null) {
  return getLocalAsrController().enqueueMicTranscript(text, sessionId);
}

async function runMicQueue() {
  return getLocalAsrController().runMicQueue();
}

let autoChatController = null;

function getAutoChatController() {
  if (!autoChatController && typeof AUTO_CHAT_CONTROLLER.createController === "function") {
    autoChatController = AUTO_CHAT_CONTROLLER.createController({
      state,
      ui,
      documentObject: document,
      windowObject: window,
      parseMessageTimestamp,
      requestAssistantReply,
      constants: {
        AUTO_CHAT_MIN_USER_GAP_MS,
        AUTO_CHAT_MIN_ASSISTANT_GAP_MS,
        AUTO_CHAT_MIN_BETWEEN_TRIGGERS_MS,
        AUTO_CHAT_EMO_RE,
        AUTO_CHAT_MIRROR_RE,
        AUTO_CHAT_TOPIC_RE,
        AUTO_CHAT_ASK_RE,
        AUTO_CHAT_OPEN_LOOP_RE,
        AUTO_CHAT_BRIEF_REPLY_RE,
        AUTO_CHAT_REPEAT_REASON_WINDOW_MS,
        AUTO_CHAT_REPEAT_TOPIC_WINDOW_MS,
        AUTO_CHAT_BURST_RESET_WINDOW_MS,
        AUTO_CHAT_REASON_PRIORITY,
        AUTO_CHAT_REASON_HINTS,
        AUTO_CHAT_STYLE_NOTES,
        WAITING_VOICE_HINTS,
        VISION_INTENT_RE
      }
    });
  }
  return autoChatController;
}

function stopAutoChatLoop() {
  return getAutoChatController().stopAutoChatLoop();
}

function shouldSkipAutoChat() {
  return getAutoChatController().shouldSkipAutoChat();
}

function shouldPlayLatencyHint(isAuto, useStreamSpeak) {
  return getAutoChatController().shouldPlayLatencyHint(isAuto, useStreamSpeak);
}

function pickLatencyHintText() {
  return getAutoChatController().pickLatencyHintText();
}

function normalizeAutoChatTopicHint(text = "") {
  return getAutoChatController().normalizeAutoChatTopicHint(text);
}

function buildConversationFollowupTopicHint(text = "") {
  return getAutoChatController().buildConversationFollowupTopicHint(text);
}

function detectOpenLoopFollowup(text = "") {
  return getAutoChatController().detectOpenLoopFollowup(text);
}

function updateConversationFollowupState(assistantText = "") {
  return getAutoChatController().updateConversationFollowupState(assistantText);
}

function pickAutoChatPrimaryReason(reasons = []) {
  return getAutoChatController().pickAutoChatPrimaryReason(reasons);
}

function analyzeAutoChatContext() {
  return getAutoChatController().analyzeAutoChatContext();
}

function buildAutoChatPrompt(context = null) {
  return getAutoChatController().buildAutoChatPrompt(context);
}

function scheduleNextAutoChat() {
  return getAutoChatController().scheduleNextAutoChat();
}

function startAutoChatLoop() {
  return getAutoChatController().startAutoChatLoop();
}

async function captureDesktopSnapshot() {
  return getAutoChatController().captureDesktopSnapshot();
}

function shouldAttachDesktopImage(message, isAuto = false) {
  return getAutoChatController().shouldAttachDesktopImage(message, isAuto);
}

let runtimeMetadataController = null;

function getRuntimeMetadataController() {
  if (!runtimeMetadataController && typeof RUNTIME_METADATA_CONTROLLER.createController === "function") {
    runtimeMetadataController = RUNTIME_METADATA_CONTROLLER.createController({
      state,
      windowObject: window,
      performanceObject: performance,
      speechText: SPEECH_TEXT,
      characterRuntime: window.TaffyCharacterRuntime || {},
      characterRuntimeBridge: window.TaffyCharacterRuntimeBridge || {},
      characterRuntimeDebugBridge: window.TaffyCharacterRuntimeDebugBridge || {},
      live2dExpressionTuning: LIVE2D_EXPRESSION_TUNING,
      runtimeEmotionExpressionTuning: RUNTIME_EMOTION_EXPRESSION_TUNING,
      clampNumber,
      triggerExpressionPulse,
      tryBuiltInMotion
    });
  }
  return runtimeMetadataController;
}

function stripRuntimeMetadataSuffix(text) {
  return getRuntimeMetadataController().stripRuntimeMetadataSuffix(text);
}

function stripAssistantPayloadNoise(text) {
  return getRuntimeMetadataController().stripAssistantPayloadNoise(text);
}

function normalizeCharacterRuntimeMetadataForFrontend(raw) {
  return getRuntimeMetadataController().normalizeCharacterRuntimeMetadataForFrontend(raw);
}

function getCharacterRuntimeBroadcastChannel() {
  return getRuntimeMetadataController().getCharacterRuntimeBroadcastChannel();
}

function dispatchCharacterRuntimeMetadataLocally(normalized) {
  return getRuntimeMetadataController().dispatchCharacterRuntimeMetadataLocally(normalized);
}

function broadcastCharacterRuntimeMetadataToModel(normalized) {
  return getRuntimeMetadataController().broadcastCharacterRuntimeMetadataToModel(normalized);
}

function normalizeRuntimeEmotionForLive2D(emotion) {
  return getRuntimeMetadataController().normalizeRuntimeEmotionForLive2D(emotion);
}

function getRuntimeEmotionExpressionTuning(mood) {
  return getRuntimeMetadataController().getRuntimeEmotionExpressionTuning(mood);
}

function normalizeRuntimeActionForLive2D(action) {
  return getRuntimeMetadataController().normalizeRuntimeActionForLive2D(action);
}

function getLive2DMotionForAction(action) {
  return getRuntimeMetadataController().getLive2DMotionForAction(action);
}

function applyCharacterRuntimeEmotionToLive2D(metadata) {
  return getRuntimeMetadataController().applyCharacterRuntimeEmotionToLive2D(metadata);
}

function applyCharacterRuntimeActionToLive2D(metadata) {
  return getRuntimeMetadataController().applyCharacterRuntimeActionToLive2D(metadata);
}

function handleCharacterRuntimeMetadata(raw, options = {}) {
  return getRuntimeMetadataController().handleCharacterRuntimeMetadata(raw, options);
}

function installCharacterRuntimeWindowBridge() {
  return getRuntimeMetadataController().installCharacterRuntimeWindowBridge();
}

function installCharacterRuntimeDebugBridge() {
  return getRuntimeMetadataController().installCharacterRuntimeDebugBridge();
}


function renderToolMetaCards(row, meta) {
  if (typeof TOOL_META_VIEW.renderToolMetaCards === "function") {
    TOOL_META_VIEW.renderToolMetaCards(row, meta, document);
  }
}

function parseToolMetaFromText(text) {
  const raw = String(text || "");
  const idx = raw.indexOf(TOOL_META_MARKER);
  if (idx < 0) {
    return { visibleText: raw, meta: null };
  }
  const visibleText = raw.slice(0, idx).trimEnd();
  const metaRaw = raw.slice(idx + TOOL_META_MARKER.length).trim();
  if (!metaRaw) {
    return { visibleText, meta: null };
  }
  try {
    return { visibleText, meta: JSON.parse(metaRaw) };
  } catch (_) {
    return { visibleText, meta: null };
  }
}

const _CHAT_TRANSLATE_TIMEOUT_MS = CHAT_TRANSLATION_SERVICE.CHAT_TRANSLATE_TIMEOUT_MS || 60000;

function _isTranslationCircuitOpen() {
  return typeof CHAT_TRANSLATION_SERVICE._debug?.isCircuitOpen === "function"
    ? CHAT_TRANSLATION_SERVICE._debug.isCircuitOpen()
    : false;
}

function _normalizeChatTranslationKey(text) {
  return typeof CHAT_TRANSLATION_SERVICE.normalizeKey === "function"
    ? CHAT_TRANSLATION_SERVICE.normalizeKey(text)
    : String(text || "").replace(/\s+/g, " ").trim();
}

function _readChatTranslationCache(text) {
  return typeof CHAT_TRANSLATION_SERVICE.readCache === "function"
    ? CHAT_TRANSLATION_SERVICE.readCache(text)
    : "";
}

function _writeChatTranslationCache(text, translated) {
  if (typeof CHAT_TRANSLATION_SERVICE.writeCache === "function") {
    CHAT_TRANSLATION_SERVICE.writeCache(text, translated);
  }
}

function _isLikelyEnglishForChat(text) {
  return typeof CHAT_TRANSLATION_SERVICE.isLikelyEnglishForChat === "function"
    ? CHAT_TRANSLATION_SERVICE.isLikelyEnglishForChat(text)
    : false;
}

function _looksLikeBadChatTranslation(source, translated) {
  return typeof CHAT_TRANSLATION_SERVICE.looksLikeBadTranslation === "function"
    ? CHAT_TRANSLATION_SERVICE.looksLikeBadTranslation(source, translated)
    : false;
}

function _shouldShowAssistantTranslation(text) {
  return typeof CHAT_TRANSLATION_SERVICE.shouldShowAssistantTranslation === "function"
    ? CHAT_TRANSLATION_SERVICE.shouldShowAssistantTranslation(text)
    : false;
}

async function _fetchChatTranslation(text) {
  if (typeof CHAT_TRANSLATION_SERVICE.fetchTranslation !== "function") {
    return "";
  }
  return CHAT_TRANSLATION_SERVICE.fetchTranslation(text, {
    authFetch,
    createTraceId: createPerfTraceId,
    recordDebug: recordTranslateDebugEvent,
    performanceObject: performance
  });
}

function normalizeAssistantVisibleText(text) {
  const src = String(text || "");
  const safe = stripAssistantPayloadNoise(src);
  return typeof CHAT_TRANSLATION_SERVICE.normalizeAssistantVisibleText === "function"
    ? CHAT_TRANSLATION_SERVICE.normalizeAssistantVisibleText(safe, { speechText: SPEECH_TEXT })
    : safe.trim();
}

function applyMessagePayload(row, text, options = {}) {
  return getChatMessageController().applyMessagePayload(row, text, options);
}

function setMessageTimestamp(row, timestamp) {
  return getChatMessageController().setMessageTimestamp(row, timestamp);
}

function resolveAssistantDisplayName(fallbackName = "Mochi") {
  return getChatMessageController().resolveAssistantDisplayName(fallbackName);
}

function createMessageRow(role, text, options = {}) {
  return getChatMessageController().createMessageRow(role, text, options);
}

function setMessageText(row, text, options = {}) {
  return getChatMessageController().setMessageText(row, text, options);
}

function commitMessageRecord(role, text, options = {}) {
  return getChatMessageController().commitMessageRecord(role, text, options);
}

function appendMessage(role, text, options = {}) {
  return getChatMessageController().appendMessage(role, text, options);
}

function finalizePendingMessageRow(row, role, text, options = {}) {
  return getChatMessageController().finalizePendingMessageRow(row, role, text, options);
}

function rememberMessage(role, content, options = {}) {
  return getChatMessageController().rememberMessage(role, content, options);
}

function getAttachmentControllerDeps() {
  return {
    state,
    model: ATTACHMENT_MODEL,
    documentObject: document,
    textAttachmentExts: TEXT_ATTACHMENT_EXTS,
    maxPendingAttachments: MAX_PENDING_ATTACHMENTS,
    maxTextAttachmentChars: MAX_TEXT_ATTACHMENT_CHARS,
    maxTotalAttachmentTextChars: MAX_TOTAL_ATTACHMENT_TEXT_CHARS,
    maxImageAttachmentBytes: MAX_IMAGE_ATTACHMENT_BYTES,
    readFileAsDataUrl,
    renderPendingAttachments,
    setStatus
  };
}

function formatFileSize(size) {
  return typeof ATTACHMENT_CONTROLLER.formatFileSize === "function"
    ? ATTACHMENT_CONTROLLER.formatFileSize(size, getAttachmentControllerDeps())
    : String(Math.max(0, Number(size) || 0)) + "B";
}

function clearPendingAttachments() {
  state.pendingAttachments = [];
  renderPendingAttachments();
}

function removePendingAttachment(id) {
  const target = String(id || "");
  state.pendingAttachments = state.pendingAttachments.filter((item) => String(item?.id || "") !== target);
  renderPendingAttachments();
}

function renderPendingAttachments() {
  if (typeof ATTACHMENT_CONTROLLER.renderPendingAttachments !== "function") {
    return;
  }
  ATTACHMENT_CONTROLLER.renderPendingAttachments(
    ui.attachmentPreview,
    state.pendingAttachments,
    { ...getAttachmentControllerDeps(), onRemove: removePendingAttachment }
  );
}

function buildAttachmentContextText(attachments) {
  return typeof ATTACHMENT_CONTROLLER.buildAttachmentContextText === "function"
    ? ATTACHMENT_CONTROLLER.buildAttachmentContextText(attachments, getAttachmentControllerDeps())
    : "";
}

function buildAttachmentDisplaySuffix(attachments) {
  return typeof ATTACHMENT_CONTROLLER.buildAttachmentDisplaySuffix === "function"
    ? ATTACHMENT_CONTROLLER.buildAttachmentDisplaySuffix(attachments, getAttachmentControllerDeps())
    : "";
}

async function handleAttachmentFiles(fileList) {
  if (typeof ATTACHMENT_CONTROLLER.handleAttachmentFiles !== "function") {
    return;
  }
  await ATTACHMENT_CONTROLLER.handleAttachmentFiles(fileList, getAttachmentControllerDeps());
}

function sanitizeSpeakText(text) {
  if (typeof SPEECH_TEXT.sanitizeSpeakText === "function") {
    return SPEECH_TEXT.sanitizeSpeakText(text);
  }
  return parseToolMetaFromText(text).visibleText;
}

// Subtitle helpers

function getSubtitleControllerDeps() {
  return {
    state,
    documentObject: document,
    windowObject: window,
    sanitizeSpeakText,
    isSpeakingNow,
    readChatTranslationCache: _readChatTranslationCache,
    isTranslationCircuitOpen: _isTranslationCircuitOpen,
    fetchChatTranslation: _fetchChatTranslation
  };
}

async function _fetchTranslation(text, capturedId) {
  if (typeof SUBTITLE_CONTROLLER.fetchTranslation === "function") {
    return SUBTITLE_CONTROLLER.fetchTranslation(text, capturedId, getSubtitleControllerDeps());
  }
  return "";
}

function _applySubtitleDOM(enText, zhText) {
  if (typeof SUBTITLE_CONTROLLER.applySubtitleDOM === "function") {
    SUBTITLE_CONTROLLER.applySubtitleDOM(enText, zhText, getSubtitleControllerDeps());
  }
}

function _clearSubtitleDOM(id, force = false) {
  if (typeof SUBTITLE_CONTROLLER.clearSubtitleDOM === "function") {
    SUBTITLE_CONTROLLER.clearSubtitleDOM(id, force, getSubtitleControllerDeps());
  }
}

function showSubtitleText(rawText) {
  if (typeof SUBTITLE_CONTROLLER.showSubtitleText === "function") {
    SUBTITLE_CONTROLLER.showSubtitleText(rawText, getSubtitleControllerDeps());
  }
}

function hideSubtitleText() {
  if (typeof SUBTITLE_CONTROLLER.hideSubtitleText === "function") {
    SUBTITLE_CONTROLLER.hideSubtitleText(getSubtitleControllerDeps());
  }
}

// End subtitle helpers

let speechStyleControllerInstance = null;

function getSpeechStyleController() {
  if (!speechStyleControllerInstance && typeof SPEECH_STYLE_CONTROLLER.createController === "function") {
    speechStyleControllerInstance = SPEECH_STYLE_CONTROLLER.createController({ state, speechText: SPEECH_TEXT, sanitizeSpeakText });
  }
  return speechStyleControllerInstance || SPEECH_STYLE_CONTROLLER;
}

function hashText(text) {
  const controller = getSpeechStyleController();
  if (typeof controller.hashText === "function") {
    return controller.hashText(text);
  }
  const src = String(text || "");
  let hash = 0;
  for (let i = 0; i < src.length; i += 1) {
    hash = (hash * 131 + src.charCodeAt(i)) % 2147483647;
  }
  return Math.abs(hash);
}

function pickByHash(seedText, options) {
  const controller = getSpeechStyleController();
  if (typeof controller.pickByHash === "function") {
    return controller.pickByHash(seedText, options);
  }
  if (!Array.isArray(options) || options.length === 0) {
    return "";
  }
  return String(options[hashText(seedText) % options.length] || "");
}

function insertNaturalPause(seg) {
  const controller = getSpeechStyleController();
  return typeof controller.insertNaturalPause === "function" ? controller.insertNaturalPause(seg) : String(seg || "").trim();
}

function colloquializeSpeakText(text) {
  const controller = getSpeechStyleController();
  return typeof controller.colloquializeSpeakText === "function" ? controller.colloquializeSpeakText(text) : String(text || "").trim();
}

function simplifySpeechDeliveryText(text, style = "neutral", streamMode = false) {
  const controller = getSpeechStyleController();
  return typeof controller.simplifySpeechDeliveryText === "function" ? controller.simplifySpeechDeliveryText(text, style, streamMode) : String(text || "").trim();
}

function tightenMinorSpeechPauses(text, streamMode = false) {
  const controller = getSpeechStyleController();
  return typeof controller.tightenMinorSpeechPauses === "function" ? controller.tightenMinorSpeechPauses(text, streamMode) : String(text || "").replace(/\s+/g, " ").trim();
}

function normalizeTalkStyle(style) {
  const controller = getSpeechStyleController();
  return typeof controller.normalizeTalkStyle === "function" ? controller.normalizeTalkStyle(style) : "neutral";
}

function inferContextStyle(userText = "", assistantText = "", mood = "idle", isAuto = false) {
  const controller = getSpeechStyleController();
  return typeof controller.inferContextStyle === "function" ? controller.inferContextStyle(userText, assistantText, mood, isAuto) : "neutral";
}

function resolveTalkStyle(userText = "", assistantText = "", mood = "idle", isAuto = false) {
  const controller = getSpeechStyleController();
  return typeof controller.resolveTalkStyle === "function" ? controller.resolveTalkStyle(userText, assistantText, mood, isAuto) : normalizeTalkStyle(state.manualTalkStyle);
}

function buildSpeechDeliveryText(text, mood = "idle", style = "neutral", streamMode = false) {
  const controller = getSpeechStyleController();
  return typeof controller.buildSpeechDeliveryText === "function" ? controller.buildSpeechDeliveryText(text, mood, style, streamMode) : sanitizeSpeakText(text);
}

function buildStableSpeakText(text) {
  const controller = getSpeechStyleController();
  return typeof controller.buildStableSpeakText === "function" ? controller.buildStableSpeakText(text) : sanitizeSpeakText(text);
}

function splitStreamSpeakSegments(buffer, flush = false) {
  const controller = getSpeechStyleController();
  return typeof controller.splitStreamSpeakSegments === "function"
    ? controller.splitStreamSpeakSegments(buffer, flush)
    : { segments: [], rest: String(buffer || "") };
}

function textJitter(text, scale = 0.02) {
  const controller = getSpeechStyleController();
  return typeof controller.textJitter === "function" ? controller.textJitter(text, scale) : 0;
}

function buildSpeakProsody(text, mood, streamMode = false, style = "neutral") {
  const controller = getSpeechStyleController();
  if (typeof controller.buildSpeakProsody === "function") {
    return controller.buildSpeakProsody(text, mood, streamMode, style);
  }
  return { speed_ratio: 1, pitch_ratio: 1, volume_ratio: 1, rate: "+0%", pitch: "+0Hz", volume: "+0%" };
}

function waitMs(ms) {
  return new Promise((resolve) => setTimeout(resolve, Math.max(0, Number(ms) || 0)));
}

let live2dExpressionControllerInstance = null;

function getLive2DExpressionController() {
  if (!live2dExpressionControllerInstance && typeof LIVE2D_EXPRESSION_CONTROLLER.createController === "function") {
    live2dExpressionControllerInstance = LIVE2D_EXPRESSION_CONTROLLER.createController({
      state,
      windowObject: window,
      performanceObject: performance,
      clampNumber,
      sanitizeSpeakText,
      normalizeTalkStyle,
      detectMood,
      isSpeechMotionActive,
      isSpeakingNow,
      live2dExpressionTuning: LIVE2D_EXPRESSION_TUNING,
      styleExpressionProfile: STYLE_EXPRESSION_PROFILE,
      motionIntensityPresets: MOTION_INTENSITY_PRESETS,
      modelMotionProfiles: MODEL_MOTION_PROFILES
    });
  }
  return live2dExpressionControllerInstance || LIVE2D_EXPRESSION_CONTROLLER;
}

function normalizeMotionIntensity(level) { return getLive2DExpressionController().normalizeMotionIntensity(level); }
function getMotionIntensityPreset() { return getLive2DExpressionController().getMotionIntensityPreset(); }
function getStyleExpressionProfile(style) { return getLive2DExpressionController().getStyleExpressionProfile(style); }
function detectModelProfileName() { return getLive2DExpressionController().detectModelProfileName(); }
function getActiveModelMotionProfile() { return getLive2DExpressionController().getActiveModelMotionProfile(); }
function getActiveModelCadence() { return getLive2DExpressionController().getActiveModelCadence(); }
function getCoreModel() { return getLive2DExpressionController().getCoreModel(); }
function safeAddParamValue(core, id, delta, weight = 1) { return getLive2DExpressionController().safeAddParamValue(core, id, delta, weight); }
function safeSetParamValue(core, id, value, weight = 1) { return getLive2DExpressionController().safeSetParamValue(core, id, value, weight); }
function safeGetParamValue(core, id) { return getLive2DExpressionController().safeGetParamValue(core, id); }
function safeDriveParamValue(core, id, target, gain = 1) { return getLive2DExpressionController().safeDriveParamValue(core, id, target, gain); }
function triggerExpressionPulse(style = "neutral", boost = 1, durationMs = 520) { return getLive2DExpressionController().triggerExpressionPulse(style, boost, durationMs); }
function estimateSpeechAnimationDurationMs(text, style = "neutral") { return getLive2DExpressionController().estimateSpeechAnimationDurationMs(text, style); }
function beginSpeechAnimation(text, mood = "idle", style = "neutral", opts = {}) { return getLive2DExpressionController().beginSpeechAnimation(text, mood, style, opts); }
function endSpeechAnimation() { return getLive2DExpressionController().endSpeechAnimation(); }
function finishSpeechAnimation() { return getLive2DExpressionController().finishSpeechAnimation(); }
function ensureMicroMotionState(now = performance.now()) { return getLive2DExpressionController().ensureMicroMotionState(now); }
function getSmoothedMoodExpression(now = performance.now()) { return getLive2DExpressionController().getSmoothedMoodExpression(now); }
function ensureTTSAudioAnalyser(audio) { return getLive2DExpressionController().ensureTTSAudioAnalyser(audio); }
function sampleTTSAudioLevel() { return getLive2DExpressionController().sampleTTSAudioLevel(); }
function updateMicroMotionLayer() { return getLive2DExpressionController().updateMicroMotionLayer(); }
function getSpeechAnimationMouthOpen() { return getLive2DExpressionController().getSpeechAnimationMouthOpen(); }
function applyStyleExpressionLayer() { return getLive2DExpressionController().applyStyleExpressionLayer(); }

let actionPlanControllerInstance = null;

function getActionPlanController() {
  if (!actionPlanControllerInstance && typeof ACTION_PLAN_CONTROLLER.createController === "function") {
    actionPlanControllerInstance = ACTION_PLAN_CONTROLLER.createController({
      state,
      performanceObject: performance,
      normalizeTalkStyle,
      detectMood,
      clampNumber,
      waitMs,
      getMotionIntensityPreset,
      getActiveModelMotionProfile,
      pickMoodMotionGroups,
      isSpeechMotionActive,
      playEmotion,
      triggerExpressionPulse,
      recordPerformanceAuditEvent
    });
  }
  return actionPlanControllerInstance || ACTION_PLAN_CONTROLLER;
}

function uniqueMotionGroups(groups) {
  const controller = getActionPlanController();
  return typeof controller.uniqueMotionGroups === "function" ? controller.uniqueMotionGroups(groups) : (Array.isArray(groups) ? groups.filter(Boolean) : []);
}

function normalizeMotionGroupKey(name) {
  const controller = getActionPlanController();
  return typeof controller.normalizeMotionGroupKey === "function" ? controller.normalizeMotionGroupKey(name) : String(name || "").trim().toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function findSemanticMotionGroups(tags = [], limit = 8) {
  const controller = getActionPlanController();
  return typeof controller.findSemanticMotionGroups === "function" ? controller.findSemanticMotionGroups(tags, limit) : [];
}

function getSemanticMotionTags(intent, mood = "idle", style = "neutral", source = "emotion") {
  const controller = getActionPlanController();
  return typeof controller.getSemanticMotionTags === "function" ? controller.getSemanticMotionTags(intent, mood, style, source) : [];
}

function getStyleMotionGroups(style, intent) {
  const controller = getActionPlanController();
  return typeof controller.getStyleMotionGroups === "function" ? controller.getStyleMotionGroups(style, intent) : [];
}

function buildPlannedMotionGroups(style, intent, mood, source) {
  const controller = getActionPlanController();
  return typeof controller.buildPlannedMotionGroups === "function" ? controller.buildPlannedMotionGroups(style, intent, mood, source) : [];
}

function shouldThrottleActionIntent(intent, minGapMs = 700) {
  const controller = getActionPlanController();
  return typeof controller.shouldThrottleActionIntent === "function" ? controller.shouldThrottleActionIntent(intent, minGapMs) : false;
}

function clearThinkingMotionTimer() {
  const controller = getActionPlanController();
  if (typeof controller.clearThinkingMotionTimer === "function") {
    controller.clearThinkingMotionTimer();
  }
}

function resetActionSystem() {
  const controller = getActionPlanController();
  if (typeof controller.resetActionSystem === "function") {
    controller.resetActionSystem();
  }
}

function buildActionPlan(intent, context = {}) {
  const controller = getActionPlanController();
  return typeof controller.buildActionPlan === "function" ? controller.buildActionPlan(intent, context) : [];
}

function isTalkLikeActionStep(step) {
  const controller = getActionPlanController();
  return typeof controller.isTalkLikeActionStep === "function" ? controller.isTalkLikeActionStep(step) : false;
}

function hasPendingTalkLikeAction() {
  const controller = getActionPlanController();
  return typeof controller.hasPendingTalkLikeAction === "function" ? controller.hasPendingTalkLikeAction() : false;
}

function shouldSkipActionStepForSpeech(step, now = performance.now()) {
  const controller = getActionPlanController();
  return typeof controller.shouldSkipActionStepForSpeech === "function" ? controller.shouldSkipActionStepForSpeech(step, now) : false;
}

async function runActionQueue() {
  const controller = getActionPlanController();
  if (typeof controller.runActionQueue === "function") {
    await controller.runActionQueue();
  }
}

function enqueueActionIntent(intent, context = {}) {
  const controller = getActionPlanController();
  if (typeof controller.enqueueActionIntent === "function") {
    controller.enqueueActionIntent(intent, context);
  }
}


let ttsPlaybackController = null;

function getTTSPlaybackController() {
  if (!ttsPlaybackController && typeof TTS_PLAYBACK_CONTROLLER.createController === "function") {
    ttsPlaybackController = TTS_PLAYBACK_CONTROLLER.createController({
      state,
      windowObject: window,
      consoleObject: console,
      performanceObject: performance,
      authFetch,
      ttsApi: TTS_API,
      perfLog,
      setStatus,
      waitMs,
      sanitizeSpeakText,
      detectMood,
      normalizeTalkStyle,
      buildVoiceCandidates,
      initTTS,
      isServerTTSProvider,
      recordTTSDebugEvent,
      recordTTSAudioEvent,
      beginSpeechAnimation,
      finishSpeechAnimation,
      endSpeechAnimation,
      showSubtitleText,
      hideSubtitleText,
      ensureTTSAudioAnalyser,
      isCurrentTTSPlaybackGeneration,
      buildSpeakProsody,
      clampNumber
    });
  }
  return ttsPlaybackController || TTS_PLAYBACK_CONTROLLER;
}

function stopAllAudioPlayback() { return getTTSPlaybackController().stopAllAudioPlayback(); }
function speakOnceWithVoice(text, voice, opts = {}) { return getTTSPlaybackController().speakOnceWithVoice(text, voice, opts); }
function buildServerTTSPayload(cleanedText, opts = {}) { return getTTSPlaybackController().buildServerTTSPayload(cleanedText, opts); }
function isRetriableTTSError(err) { return getTTSPlaybackController().isRetriableTTSError(err); }
async function requestServerTTSBlob(text, prosody = null, requestOpts = {}) { return getTTSPlaybackController().requestServerTTSBlob(text, prosody, requestOpts); }
async function requestServerTTSBlobWithRetry(text, prosody = null, opts = {}) { return getTTSPlaybackController().requestServerTTSBlobWithRetry(text, prosody, opts); }
async function playAudioByContext(blob, debugContext = {}) { return getTTSPlaybackController().playAudioByContext(blob, debugContext); }
async function playAudioBlob(blob, opts = {}) { return getTTSPlaybackController().playAudioBlob(blob, opts); }
async function speakByServer(text, opts = {}) { return getTTSPlaybackController().speakByServer(text, opts); }
async function speakByBrowser(text, opts = {}) { return getTTSPlaybackController().speakByBrowser(text, opts); }
async function speak(text, opts = {}) { return getTTSPlaybackController().speak(text, opts); }

function isCurrentTTSPlaybackGeneration(generation) {
  return Number(generation || 0) === Number(state.ttsPlaybackGeneration || 0);
}

function clampNumber(v, min, max) {
  return Math.min(max, Math.max(min, v));
}

let streamTtsQueueController = null;

function getStreamTtsQueueController() {
  if (!streamTtsQueueController && typeof STREAM_TTS_QUEUE_CONTROLLER.createController === "function") {
    streamTtsQueueController = STREAM_TTS_QUEUE_CONTROLLER.createController({
      state,
      windowObject: window,
      consoleObject: console,
      isServerTTSProvider,
      buildSpeechDeliveryText,
      detectMood,
      buildSpeakProsody,
      recordTTSDebugEvent,
      requestServerTTSBlob,
      setStatus,
      playAudioBlob,
      isCurrentTTSPlaybackGeneration,
      splitStreamSpeakSegments,
      maybePlayTalkGesture,
      buildStableSpeakText,
      sanitizeSpeakText,
      speak
    });
  }
  return streamTtsQueueController || STREAM_TTS_QUEUE_CONTROLLER;
}

function shouldUseStreamSpeak() { return getStreamTtsQueueController().shouldUseStreamSpeak(); }
function shouldSerializeStreamTTSRequests() { return getStreamTtsQueueController().shouldSerializeStreamTTSRequests(); }
function ensureStreamSpeakBlobPromise(item) { return getStreamTtsQueueController().ensureStreamSpeakBlobPromise(item); }
function enqueueStreamSpeakSegment(text, sessionId, prosody = null, style = "neutral") { return getStreamTtsQueueController().enqueueStreamSpeakSegment(text, sessionId, prosody, style); }
function dequeueStreamSpeakItem(sessionId) { return getStreamTtsQueueController().dequeueStreamSpeakItem(sessionId); }
function hasQueuedStreamSpeakItem(sessionId) { return getStreamTtsQueueController().hasQueuedStreamSpeakItem(sessionId); }
function discardQueuedStreamSpeakItems(sessionId) { return getStreamTtsQueueController().discardQueuedStreamSpeakItems(sessionId); }
function ensureStreamSpeakQueueRunning(sessionId, delayMs = 0) { return getStreamTtsQueueController().ensureStreamSpeakQueueRunning(sessionId, delayMs); }
async function waitNextStreamSpeakItem(sessionId, waitMs = 0) { return getStreamTtsQueueController().waitNextStreamSpeakItem(sessionId, waitMs); }
async function runStreamSpeakQueue() { return getStreamTtsQueueController().runStreamSpeakQueue(); }
function feedStreamSpeakDelta(delta, sessionId, style = "neutral") { return getStreamTtsQueueController().feedStreamSpeakDelta(delta, sessionId, style); }
function flushStreamSpeak(sessionId, style = "neutral") { return getStreamTtsQueueController().flushStreamSpeak(sessionId, style); }
function scheduleFinalSpeechWatchdog(input = {}) { return getStreamTtsQueueController().scheduleFinalSpeechWatchdog(input); }


let voiceRuntimeController = null;

function getVoiceRuntimeController() {
  if (!voiceRuntimeController && typeof VOICE_RUNTIME_CONTROLLER.createController === "function") {
    voiceRuntimeController = VOICE_RUNTIME_CONTROLLER.createController({
      state, ui, windowObject: window, documentObject: document, setStatus, isServerTTSProvider, clampNumber,
      normalizeTalkStyle, detectMood, buildSpeakProsody, beginSpeechAnimation, showSubtitleText,
      finishSpeechAnimation, hideSubtitleText, endSpeechAnimation, isCurrentTTSPlaybackGeneration
    });
  }
  return voiceRuntimeController || VOICE_RUNTIME_CONTROLLER;
}

function initServerTTSVoices() { return getVoiceRuntimeController().initServerTTSVoices(); }
function scoreVoice(v) { return getVoiceRuntimeController().scoreVoice(v); }
function getSortedVoices() { return getVoiceRuntimeController().getSortedVoices(); }
function chooseTTSVoice() { return getVoiceRuntimeController().chooseTTSVoice(); }
function setActiveVoice(index) { return getVoiceRuntimeController().setActiveVoice(index); }
function buildVoiceCandidates() { return getVoiceRuntimeController().buildVoiceCandidates(); }
function initTTS() { return getVoiceRuntimeController().initTTS(); }



let live2dRuntimeController = null;

function getLive2DRuntimeController() {
  if (!live2dRuntimeController && typeof LIVE2D_RUNTIME_CONTROLLER.createController === "function") {
    live2dRuntimeController = LIVE2D_RUNTIME_CONTROLLER.createController({
      state,
      windowObject: window,
      documentObject: document,
      consoleObject: console,
      performanceObject: performance,
      runtimeVersion: RUNTIME_VERSION,
      appendMessage,
      setStatus,
      placeModel,
      attachDrag,
      setupClickthroughHitTest,
      scheduleIdleMotionLoop,
      stopIdleMotionLoop,
      setModelMotionDefinitions,
      applyStyleExpressionLayer,
      updateMicroMotionLayer,
      getStyleExpressionProfile,
      getActiveModelCadence,
      clampNumber,
      handleWindowResize
    });
  }
  return live2dRuntimeController || LIVE2D_RUNTIME_CONTROLLER;
}

function loadScript(src, isReady) { return getLive2DRuntimeController().loadScript(src, isReady); }
async function ensureLive2DRuntime() { return getLive2DRuntimeController().ensureLive2DRuntime(); }

let appConfigController = null;

function getAppConfigController() {
  if (!appConfigController && typeof APP_CONFIG_CONTROLLER.createController === "function") {
    appConfigController = APP_CONFIG_CONTROLLER.createController({
      state, ui, fetchObject: fetch, clampNumber, isServerTTSProvider, initServerTTSVoices,
      buildAsrHotwordRules, syncProactiveSchedulerPolling, startAutoChatLoop, stopAutoChatLoop,
      normalizeTalkStyle, normalizeMotionIntensity, loadChatHistoryFromStorage, loadRemindersFromStorage,
      loadDailyGreetingState, loadEmotionStats, resolveAssistantDisplayName, updateObserveButton,
      updateMicMeter, detectModelProfileName
    });
  }
  return appConfigController || APP_CONFIG_CONTROLLER;
}

async function loadConfig() { return getAppConfigController().loadConfig(); }

async function initLive2D() { return getLive2DRuntimeController().initLive2D(); }
let live2dLayoutController = null;

function getLive2DLayoutController() {
  if (!live2dLayoutController && typeof LIVE2D_LAYOUT_CONTROLLER.createController === "function") {
    live2dLayoutController = LIVE2D_LAYOUT_CONTROLLER.createController({
      state,
      windowObject: window,
      documentObject: document,
      performanceObject: performance,
      requestAnimationFrame,
      cancelAnimationFrame,
      clampNumber,
      desktopWindowController: DESKTOP_WINDOW_CONTROLLER,
      triggerTapMotion,
      finalizeDesktopDrag,
      stopDesktopWindowDrag,
      tapMaxDurationMs: TAP_MAX_DURATION_MS,
      tapMoveThreshold: TAP_MOVE_THRESHOLD
    });
  }
  return live2dLayoutController || LIVE2D_LAYOUT_CONTROLLER;
}

function placeModel() { return getLive2DLayoutController().placeModel(); }
function clampModelVisibleInViewport(model) { return getLive2DLayoutController().clampModelVisibleInViewport(model); }
function handleWindowResize() { return getLive2DLayoutController().handleWindowResize(); }
function getModelInteractiveBounds() { return getLive2DLayoutController().getModelInteractiveBounds(); }
function isPointInModelDragHotzone(x, y, bounds) { return getLive2DLayoutController().isPointInModelDragHotzone(x, y, bounds); }
function isPointOverVisibleModelArea(clientX, clientY) { return getLive2DLayoutController().isPointOverVisibleModelArea(clientX, clientY); }
function attachDrag(model) { return getLive2DLayoutController().attachDrag(model); }
function setupClickthroughHitTest() { return getLive2DLayoutController().setupClickthroughHitTest(); }
function startModelMouseGazePolling() { return getLive2DLayoutController().startModelMouseGazePolling(); }

let emotionMoodControllerInstance = null;

function getEmotionMoodController() {
  if (!emotionMoodControllerInstance && typeof EMOTION_MOOD_CONTROLLER.createController === "function") {
    emotionMoodControllerInstance = EMOTION_MOOD_CONTROLLER.createController();
  }
  return emotionMoodControllerInstance || EMOTION_MOOD_CONTROLLER;
}

function hasMoodKeyword(text, keywords) {
  const controller = getEmotionMoodController();
  return typeof controller.hasMoodKeyword === "function" ? controller.hasMoodKeyword(text, keywords) : false;
}

function detectMood(text) {
  const controller = getEmotionMoodController();
  return typeof controller.detectMood === "function" ? controller.detectMood(text) : "idle";
}

let motionRuntimeController = null;

function getMotionRuntimeController() {
  if (!motionRuntimeController && typeof MOTION_RUNTIME_CONTROLLER.createController === "function") {
    motionRuntimeController = MOTION_RUNTIME_CONTROLLER.createController({
      state,
      windowObject: window,
      performanceObject: performance,
      requestAnimationFrame,
      detectMood,
      normalizeTalkStyle,
      sanitizeSpeakText,
      clampNumber,
      getMotionIntensityPreset,
      getActiveModelCadence,
      enqueueActionIntent,
      hasPendingTalkLikeAction,
      buildFollowupAwareIdleMotionContext,
      resetActionSystem,
      pickMoodMotionGroups: (mood, source = "emotion") => {
        const controller = getEmotionMoodController();
        return typeof controller.pickMoodMotionGroups === "function" ? controller.pickMoodMotionGroups(mood, source) : ["Idle"];
      }
    });
  }
  return motionRuntimeController || MOTION_RUNTIME_CONTROLLER;
}

function extractMotionDefinitions(model = null) { return getMotionRuntimeController().extractMotionDefinitions(model); }
function getMotionCount(group) { return getMotionRuntimeController().getMotionCount(group); }
function listAvailableMotionGroups() { return getMotionRuntimeController().listAvailableMotionGroups(); }
function setModelMotionDefinitions(model) { return getMotionRuntimeController().setModelMotionDefinitions(model); }
function stopIdleMotionLoop() { return getMotionRuntimeController().stopIdleMotionLoop(); }
function isSpeakingNow() { return getMotionRuntimeController().isSpeakingNow(); }
function isSpeechMotionActive(now = performance.now()) { return getMotionRuntimeController().isSpeechMotionActive(now); }
function shouldSkipIdleMotion() { return getMotionRuntimeController().shouldSkipIdleMotion(); }
function scheduleIdleMotionLoop() { return getMotionRuntimeController().scheduleIdleMotionLoop(); }
function pickMoodMotionGroups(mood, source = "emotion") { return getMotionRuntimeController().pickMoodMotionGroups(mood, source); }
function canPlayMotion(cooldownMs = null, force = false) { return getMotionRuntimeController().canPlayMotion(cooldownMs, force); }
async function playMotionGroup(group, priority = 3) { return getMotionRuntimeController().playMotionGroup(group, priority); }
async function tryBuiltInMotion(mood, opts = {}) { return getMotionRuntimeController().tryBuiltInMotion(mood, opts); }
function animateFallback(mood, opts = {}) { return getMotionRuntimeController().animateFallback(mood, opts); }
function triggerTapMotion() { return getMotionRuntimeController().triggerTapMotion(); }
function maybePlayTalkGesture(text, style = "neutral") { return getMotionRuntimeController().maybePlayTalkGesture(text, style); }
async function playEmotion(text, opts = {}) { return getMotionRuntimeController().playEmotion(text, opts); }


function switchVoice() { return getVoiceRuntimeController().switchVoice(); }

let wakeWordController = null;

function getWakeWordController() {
  if (!wakeWordController && typeof WAKE_WORD_CONTROLLER.createController === "function") {
    wakeWordController = WAKE_WORD_CONTROLLER.createController({
      state, windowObject: window, navigatorObject: navigator, setStatus, updateMicButton,
      scheduleMicRecognitionStart, enqueueMicTranscript, toggleMicOpen
    });
  }
  return wakeWordController || WAKE_WORD_CONTROLLER;
}

function clearWakeRestartTimer() { return getWakeWordController().clearWakeRestartTimer(); }
function shouldRunWakeWordListener() { return getWakeWordController().shouldRunWakeWordListener(); }
function stopWakeWordListener(hardStop = false) { return getWakeWordController().stopWakeWordListener(hardStop); }
function scheduleWakeWordStart(delayMs = 0) { return getWakeWordController().scheduleWakeWordStart(delayMs); }
function wakeTranscriptHit(text) { return getWakeWordController().wakeTranscriptHit(text); }
function setupWakeWordRecognition(RecognitionCtor) { return getWakeWordController().setupWakeWordRecognition(RecognitionCtor); }
function setupSpeechRecognition() { return getWakeWordController().setupSpeechRecognition(); }

let chatReplyController = null;

function getChatReplyController() {
  if (!chatReplyController && typeof CHAT_REPLY_CONTROLLER.createController === "function") {
    chatReplyController = CHAT_REPLY_CONTROLLER.createController({
      state,
      ui,
      windowObject: window,
      performanceObject: performance,
      authFetch,
      createPerfTraceId,
      perfLog,
      handleCharacterRuntimeMetadata,
      handleCharacterBrainDecision,
      appendMessage,
      rememberMessage,
      detectMood,
      resolveTalkStyle,
      enqueueActionIntent,
      stopWakeWordListener,
      pauseMicForAssistant,
      resumeMicAfterAssistant,
      setStatus,
      shouldUseStreamSpeak,
      stopAllAudioPlayback,
      shouldPlayLatencyHint,
      pickLatencyHintText,
      buildSpeakProsody,
      speak,
      clearThinkingMotionTimer,
      shouldAttachDesktopImage,
      captureDesktopSnapshot,
      parseToolMetaFromText,
      setMessageText,
      feedStreamSpeakDelta,
      normalizeAssistantVisibleText,
      finalizePendingMessageRow,
      updateConversationFollowupState,
      recordEmotion,
      previewAssistantReplyCharacterCueCandidate,
      maybeAutoApplyAssistantReplyCharacterCueCandidate,
      normalizeTalkStyle,
      normalizeRuntimeVoiceStyle,
      runtimeVoiceStyleToTalkStyle,
      applyPerformanceControlsToRuntimeHint,
      buildPerformanceTimeline,
      rememberPerformanceTimeline,
      buildVoiceTimeline,
      buildVoiceSpeechSegments,
      rememberVoiceTimeline,
      applyVoiceDirectorProsody,
      clearPerformanceTimelineTimers,
      executePerformanceTimelinePhase,
      schedulePerformanceTimelineSpeechBeats,
      startPerformanceAudit,
      recordPerformanceAuditEvent,
      finishPerformanceAudit,
      persistCharacterBrainSnapshot: saveCharacterBrainSnapshotToStorage,
      triggerExpressionPulse,
      flushStreamSpeak,
      scheduleFinalSpeechWatchdog,
      buildStableSpeakText,
      maybePlayTalkGesture,
      discardQueuedStreamSpeakItems,
      recordTTSDebugEvent,
      buildChatFailureDoctorHint,
      getCharacterExperienceRequestProfile,
      scheduleWakeWordStart,
      updateMicButton,
      handleLocalCommand,
      buildAttachmentContextText,
      buildAttachmentDisplaySuffix,
      clearPendingAttachments
    });
  }
  return chatReplyController || CHAT_REPLY_CONTROLLER;
}

async function streamAssistantReply(payload, onDelta, perfHooks = null) { return getChatReplyController().streamAssistantReply(payload, onDelta, perfHooks); }
async function requestAssistantReply(text, opts = {}) { return getChatReplyController().requestAssistantReply(text, opts); }
async function sendChat() { return getChatReplyController().sendChat(); }

function snapshotPendingLocalAsr() {
  const chunks = Array.isArray(state.localAsrBuffers) ? state.localAsrBuffers.slice() : [];
  const speechMs = Number(state.localAsrSpeechMs) || 0;
  return { chunks, speechMs };
}

async function waitLocalAsrSendingDone(timeoutMs = 700) {
  const started = Date.now();
  while (state.localAsrSending && Date.now() - started < timeoutMs) {
    await new Promise((resolve) => setTimeout(resolve, 40));
  }
}

async function transcribeSnapshotAfterMicClose(snapshot) {
  if (!snapshot || !Array.isArray(snapshot.chunks) || snapshot.chunks.length === 0) {
    return false;
  }
  const minCloseMs = Math.max(90, Math.min(state.localAsrMinSpeechMs || 180, 220));
  if ((Number(snapshot.speechMs) || 0) < minCloseMs) {
    return false;
  }
  try {
    const text = await transcribeLocalPcmChunks(snapshot.chunks);
    const corrected = applyAsrHotwordCorrections(text);
    if (!corrected) {
      return false;
    }
    let spins = 0;
    while (state.chatBusy && spins < 50) {
      await new Promise((resolve) => setTimeout(resolve, 100));
      spins += 1;
    }
    if (state.chatBusy) {
      return false;
    }
    await requestAssistantReply(corrected, {
      showUser: true,
      rememberUser: true,
      auto: false,
      silentError: false
    });
    return true;
  } catch (err) {
    console.warn("transcribeSnapshotAfterMicClose failed:", err);
    return false;
  }
}

async function toggleMicOpen() {
  if (state.micToggleBusy) {
    return;
  }
  if (!(state.recognitionAvailable || state.localAsrAvailable)) {
    setStatus("语音输入不可用");
    return;
  }
  state.micToggleBusy = true;
  try {
    if (state.micOpen) {
      let closeSnapshot = null;
      if (state.asrTranscribeOnClose && state.asrMode === "local_vosk") {
        await waitLocalAsrSendingDone(700);
        closeSnapshot = snapshotPendingLocalAsr();
      }
      stopMicLoop(true);
      if (closeSnapshot) {
        setStatus("关闭中，处理最后一句...");
        await transcribeSnapshotAfterMicClose(closeSnapshot);
      }
      setStatus("开麦已关闭");
      return;
    }
    await startMicLoop();
    if (state.micOpen) {
      if (state.asrMode === "local_vosk" && state.localAsrInputMuted) {
        setStatus("麦克风轨道被系统静音，请检查 Windows 输入设备、隐私权限或硬件静音键");
      } else {
        setStatus(state.micKeepListening ? "开麦已开启（通话模式）" : "开麦已开启");
      }
    }
  } finally {
    state.micToggleBusy = false;
    updateMicButton();
  }
}

function bindUI() {
  if ("speechSynthesis" in window) {
    updateSpeakButton();
  }
  if (ui.scheduleDatetime && !ui.scheduleDatetime.value) {
    ui.scheduleDatetime.value = buildDefaultScheduleDateTimeValue();
  }
  if (ui.voiceNextBtn) {
    ui.voiceNextBtn.disabled =
      isServerTTSProvider(state.ttsProvider)
        ? state.ttsServerVoices.length <= 1
        : state.ttsVoices.length <= 1;
  }
  updateObserveButton();
  updateLockButton();
  updateAutoChatButton();
  updateTranslationToggleButton();
  applySubtitleEnabledState();
  setAdvancedActionsExpanded(false);
  updateMicButton();
  renderScheduleList();
  renderPendingAttachments();
  syncLearningQuickSettingsUI();
  renderLearningReviewList();
  applySubtitlePositionFromState();
  bindSubtitleDragHandle();
  renderOnboardingStep();

  bindChatInputControls();
  bindDesktopControlButtons();

  bindPanelControls();

  bindLearningReviewControls();

  bindAdvancedActionControls();

  setTimeout(() => {
    maybeAutoOpenOnboarding();
  }, 180);
}

let appStartupController = null;

function getAppStartupController() {
  if (!appStartupController && typeof APP_STARTUP_CONTROLLER.createController === "function") {
    appStartupController = APP_STARTUP_CONTROLLER.createController({
      state,
      windowObject: window,
      consoleObject: console,
      performanceObject: performance,
      requestAnimationFrame,
      setStatus,
      appendMessage,
      refreshDesktopBridgeReady,
      initWindowLockBridge,
      loadConfig,
      resolveApiToken,
      initAssistantAvatar,
      loadChatTranslationVisibilityFromStorage,
      loadSubtitleEnabledFromStorage,
      loadSubtitlePositionFromStorage,
      loadOnboardingSeenFromStorage,
      loadCharacterExperienceProfile,
      loadCharacterBrainSnapshotFromStorage,
      loadPersonaCard,
      ensureLive2DRuntime,
      initLive2D,
      startModelMouseGazePolling,
      isServerTTSProvider,
      initTTS,
      setupSpeechRecognition,
      bindUI,
      startFollowupCharacterChipRefresh,
      startReminderLoop,
      runReminderCheck,
      isSpeechMotionActive,
      getSpeechAnimationMouthOpen,
      bindRuntimeEvents,
      installCharacterRuntimeWindowBridge,
      installCharacterRuntimeDebugBridge,
      installTTSDebugBridge,
      installTranslateDebugBridge,
      closeLearningReviewDrawer,
      resetActionSystem,
      stopIdleMotionLoop,
      stopAutoChatLoop,
      stopProactiveSchedulerPolling,
      stopMicLoop,
      stopWakeWordListener
    });
  }
  return appStartupController || APP_STARTUP_CONTROLLER;
}

function bindRuntimeBridges() { return getAppStartupController().bindRuntimeBridges(); }
async function main() { return getAppStartupController().main(); }
function handleBeforeUnload() { return getAppStartupController().handleBeforeUnload(); }

bindRuntimeBridges();
window.addEventListener("beforeunload", handleBeforeUnload);
main();
