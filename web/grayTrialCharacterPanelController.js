(function (root) {
  "use strict";

  function createController(deps = {}) {
    const state = deps.state || {};
    const ui = deps.ui || {};
    const window = deps.windowObject || root;
    const document = deps.documentObject || window.document || root.document || {};
    const performance = deps.performanceObject || window.performance || root.performance || { now: () => Date.now() };
    const FOLLOWUP_READINESS_VIEW = deps.followupReadinessView || {};
    const GRAY_TRIAL_READINESS_MODEL = deps.grayTrialReadinessModel || {};
    const GRAY_TRIAL_CHARACTER_VIEW = deps.grayTrialCharacterView || {};
    const GRAY_TRIAL_CHARACTER_MODEL = deps.grayTrialCharacterModel || {};
    const GRAY_TRIAL_AUTO_RUNTIME_SWITCH_MODEL = deps.grayTrialAutoRuntimeSwitchModel || {};
    const CHARACTER_REPLY_CUE = deps.characterReplyCue || {};
    const CHARACTER_TUNING = deps.characterTuning || {};
    const recordTTSDebugEvent = typeof deps.recordTTSDebugEvent === "function" ? deps.recordTTSDebugEvent : () => null;
    const sanitizeTTSDebugText = typeof deps.sanitizeTTSDebugText === "function" ? deps.sanitizeTTSDebugText : () => null;
    const recordTTSAudioEvent = typeof deps.recordTTSAudioEvent === "function" ? deps.recordTTSAudioEvent : () => null;
    const updateTTSDebugPanel = typeof deps.updateTTSDebugPanel === "function" ? deps.updateTTSDebugPanel : () => null;
    const requestAssistantReply = typeof deps.requestAssistantReply === "function" ? deps.requestAssistantReply : async () => false;
    const setStatus = typeof deps.setStatus === "function" ? deps.setStatus : () => null;
    const appendMessage = typeof deps.appendMessage === "function" ? deps.appendMessage : () => null;
    const buildSpeakProsody = typeof deps.buildSpeakProsody === "function" ? deps.buildSpeakProsody : () => null;
    const speak = typeof deps.speak === "function" ? deps.speak : async () => false;
    const updateSpeakButton = typeof deps.updateSpeakButton === "function" ? deps.updateSpeakButton : () => null;
    const authFetch = typeof deps.authFetch === "function" ? deps.authFetch : async () => ({ ok: false, json: async () => ({}) });
    const recordCharacterPerformanceFeedback = typeof deps.recordCharacterPerformanceFeedback === "function" ? deps.recordCharacterPerformanceFeedback : () => null;
    const handleCharacterRuntimeMetadata = typeof deps.handleCharacterRuntimeMetadata === "function" ? deps.handleCharacterRuntimeMetadata : () => null;
    const applyCharacterRuntimeEmotionToLive2D = typeof deps.applyCharacterRuntimeEmotionToLive2D === "function" ? deps.applyCharacterRuntimeEmotionToLive2D : () => null;
    const applyCharacterRuntimeActionToLive2D = typeof deps.applyCharacterRuntimeActionToLive2D === "function" ? deps.applyCharacterRuntimeActionToLive2D : () => null;
    const updateFollowupReadinessPanel = typeof deps.updateFollowupReadinessPanel === "function" ? deps.updateFollowupReadinessPanel : () => null;
    const syncProactiveSchedulerPolling = typeof deps.syncProactiveSchedulerPolling === "function" ? deps.syncProactiveSchedulerPolling : () => null;
    const buildGrayAutoFollowupTrialEventContext = typeof deps.buildGrayAutoFollowupTrialEventContext === "function" ? deps.buildGrayAutoFollowupTrialEventContext : () => null;
    const mergeProactiveSchedulerPollEventResult = typeof deps.mergeProactiveSchedulerPollEventResult === "function" ? deps.mergeProactiveSchedulerPollEventResult : () => null;
    const mergeProactiveSchedulerPollEventError = typeof deps.mergeProactiveSchedulerPollEventError === "function" ? deps.mergeProactiveSchedulerPollEventError : () => null;
    const getTTSDebugSnapshot = typeof deps.getTTSDebugSnapshot === "function" ? deps.getTTSDebugSnapshot : () => null;
    const buildConversationFollowupPromptDraft = typeof deps.buildConversationFollowupPromptDraft === "function" ? deps.buildConversationFollowupPromptDraft : () => null;
    const buildConversationFollowupDebugPlan = typeof deps.buildConversationFollowupDebugPlan === "function" ? deps.buildConversationFollowupDebugPlan : () => null;
    const getConversationFollowupPolicyDebugText = typeof deps.getConversationFollowupPolicyDebugText === "function" ? deps.getConversationFollowupPolicyDebugText : () => null;
    const buildConversationFollowupPolicy = typeof deps.buildConversationFollowupPolicy === "function" ? deps.buildConversationFollowupPolicy : () => null;
    const previewConversationFollowupPolicy = typeof deps.previewConversationFollowupPolicy === "function" ? deps.previewConversationFollowupPolicy : () => null;
    const buildConversationFollowupReactionCandidates = typeof deps.buildConversationFollowupReactionCandidates === "function" ? deps.buildConversationFollowupReactionCandidates : () => null;
    const selectConversationFollowupReactionCandidate = typeof deps.selectConversationFollowupReactionCandidate === "function" ? deps.selectConversationFollowupReactionCandidate : () => null;
    const buildConversationFollowupCharacterCue = typeof deps.buildConversationFollowupCharacterCue === "function" ? deps.buildConversationFollowupCharacterCue : () => null;
    const getGrayAutoTrialSessionTriggerCount = typeof deps.getGrayAutoTrialSessionTriggerCount === "function" ? deps.getGrayAutoTrialSessionTriggerCount : () => null;
    const buildGrayAutoTrialSessionState = typeof deps.buildGrayAutoTrialSessionState === "function" ? deps.buildGrayAutoTrialSessionState : () => null;
    const incrementGrayAutoTrialSessionTriggerCount = typeof deps.incrementGrayAutoTrialSessionTriggerCount === "function" ? deps.incrementGrayAutoTrialSessionTriggerCount : () => null;
    const isGrayAutoTrialSessionLimitReached = typeof deps.isGrayAutoTrialSessionLimitReached === "function" ? deps.isGrayAutoTrialSessionLimitReached : () => null;
    const shouldEnableProactiveSchedulerPolling = typeof deps.shouldEnableProactiveSchedulerPolling === "function" ? deps.shouldEnableProactiveSchedulerPolling : () => null;
    const getProactiveSchedulerPollingGateStatus = typeof deps.getProactiveSchedulerPollingGateStatus === "function" ? deps.getProactiveSchedulerPollingGateStatus : () => null;
    const stopGrayAutoTrialSession = typeof deps.stopGrayAutoTrialSession === "function" ? deps.stopGrayAutoTrialSession : () => null;
    const armGrayAutoTrialSession = typeof deps.armGrayAutoTrialSession === "function" ? deps.armGrayAutoTrialSession : () => null;
    const disarmGrayAutoTrialSession = typeof deps.disarmGrayAutoTrialSession === "function" ? deps.disarmGrayAutoTrialSession : () => null;
    const resetGrayAutoTrialSessionTriggerCount = typeof deps.resetGrayAutoTrialSessionTriggerCount === "function" ? deps.resetGrayAutoTrialSessionTriggerCount : () => null;
    const buildFollowupReadinessReport = typeof deps.buildFollowupReadinessReport === "function" ? deps.buildFollowupReadinessReport : () => null;
    const buildGrayAutoTrialAuditSummary = typeof deps.buildGrayAutoTrialAuditSummary === "function" ? deps.buildGrayAutoTrialAuditSummary : () => null;
    const buildGrayAutoTrialPreRunChecklist = typeof deps.buildGrayAutoTrialPreRunChecklist === "function" ? deps.buildGrayAutoTrialPreRunChecklist : () => null;
    const buildGrayAutoTrialTimeline = typeof deps.buildGrayAutoTrialTimeline === "function" ? deps.buildGrayAutoTrialTimeline : () => null;
    const buildGrayAutoTrialOutcome = typeof deps.buildGrayAutoTrialOutcome === "function" ? deps.buildGrayAutoTrialOutcome : () => null;
    const buildGrayAutoTrialGoNoGoDecision = typeof deps.buildGrayAutoTrialGoNoGoDecision === "function" ? deps.buildGrayAutoTrialGoNoGoDecision : () => null;
    const buildGrayAutoTrialSignoffPackage = typeof deps.buildGrayAutoTrialSignoffPackage === "function" ? deps.buildGrayAutoTrialSignoffPackage : () => null;
    const buildGrayAutoTrialPreRunChecklistText = typeof deps.buildGrayAutoTrialPreRunChecklistText === "function" ? deps.buildGrayAutoTrialPreRunChecklistText : () => null;
    const buildGrayAutoTrialTimelineText = typeof deps.buildGrayAutoTrialTimelineText === "function" ? deps.buildGrayAutoTrialTimelineText : () => null;
    const buildGrayAutoTrialOutcomeText = typeof deps.buildGrayAutoTrialOutcomeText === "function" ? deps.buildGrayAutoTrialOutcomeText : () => null;
    const buildGrayAutoTrialGoNoGoDecisionText = typeof deps.buildGrayAutoTrialGoNoGoDecisionText === "function" ? deps.buildGrayAutoTrialGoNoGoDecisionText : () => null;
    const buildGrayAutoTrialSignoffPackageText = typeof deps.buildGrayAutoTrialSignoffPackageText === "function" ? deps.buildGrayAutoTrialSignoffPackageText : () => null;
    const buildGrayAutoTrialCharacterCuePreviewText = typeof deps.buildGrayAutoTrialCharacterCuePreviewText === "function" ? deps.buildGrayAutoTrialCharacterCuePreviewText : () => null;
    const buildGrayAutoTrialCharacterCueHandoffChecklistText = typeof deps.buildGrayAutoTrialCharacterCueHandoffChecklistText === "function" ? deps.buildGrayAutoTrialCharacterCueHandoffChecklistText : () => null;
    const buildGrayAutoTrialCharacterCueManualEmitRecapText = typeof deps.buildGrayAutoTrialCharacterCueManualEmitRecapText === "function" ? deps.buildGrayAutoTrialCharacterCueManualEmitRecapText : () => null;
    const buildGrayAutoTrialCharacterManualCueStatusCardText = typeof deps.buildGrayAutoTrialCharacterManualCueStatusCardText === "function" ? deps.buildGrayAutoTrialCharacterManualCueStatusCardText : () => null;
    const buildGrayAutoTrialCharacterExpressionStrategyDraftText = typeof deps.buildGrayAutoTrialCharacterExpressionStrategyDraftText === "function" ? deps.buildGrayAutoTrialCharacterExpressionStrategyDraftText : () => null;
    const buildGrayAutoTrialCharacterExpressionStrategyReviewPackageText = typeof deps.buildGrayAutoTrialCharacterExpressionStrategyReviewPackageText === "function" ? deps.buildGrayAutoTrialCharacterExpressionStrategyReviewPackageText : () => null;
    const buildGrayAutoTrialCharacterAutoRuntimeSafetyPlanText = typeof deps.buildGrayAutoTrialCharacterAutoRuntimeSafetyPlanText === "function" ? deps.buildGrayAutoTrialCharacterAutoRuntimeSafetyPlanText : () => null;
    const buildGrayAutoTrialCharacterAutoRuntimeDryRunText = typeof deps.buildGrayAutoTrialCharacterAutoRuntimeDryRunText === "function" ? deps.buildGrayAutoTrialCharacterAutoRuntimeDryRunText : () => null;
    const buildGrayAutoTrialCharacterAutoRuntimeExplicitSwitchPlanText = typeof deps.buildGrayAutoTrialCharacterAutoRuntimeExplicitSwitchPlanText === "function" ? deps.buildGrayAutoTrialCharacterAutoRuntimeExplicitSwitchPlanText : () => null;
    const buildGrayAutoTrialCharacterAutoRuntimeExplicitSwitchReviewPackageText = typeof deps.buildGrayAutoTrialCharacterAutoRuntimeExplicitSwitchReviewPackageText === "function" ? deps.buildGrayAutoTrialCharacterAutoRuntimeExplicitSwitchReviewPackageText : () => null;
    const buildGrayAutoTrialCharacterAutoRuntimeSwitchAcceptancePackageText = typeof deps.buildGrayAutoTrialCharacterAutoRuntimeSwitchAcceptancePackageText === "function" ? deps.buildGrayAutoTrialCharacterAutoRuntimeSwitchAcceptancePackageText : () => null;
    const buildGrayAutoTrialCharacterAutoRuntimeExplicitSwitchControlText = typeof deps.buildGrayAutoTrialCharacterAutoRuntimeExplicitSwitchControlText === "function" ? deps.buildGrayAutoTrialCharacterAutoRuntimeExplicitSwitchControlText : () => null;
    const buildGrayAutoTrialCharacterAutoRuntimeSwitchControlDiagnosticsText = typeof deps.buildGrayAutoTrialCharacterAutoRuntimeSwitchControlDiagnosticsText === "function" ? deps.buildGrayAutoTrialCharacterAutoRuntimeSwitchControlDiagnosticsText : () => null;
    const buildGrayAutoTrialCharacterAutoRuntimeExplicitSwitchRollbackPackageText = typeof deps.buildGrayAutoTrialCharacterAutoRuntimeExplicitSwitchRollbackPackageText === "function" ? deps.buildGrayAutoTrialCharacterAutoRuntimeExplicitSwitchRollbackPackageText : () => null;
    const buildGrayAutoTrialCharacterAutoRuntimeFinalPreflightText = typeof deps.buildGrayAutoTrialCharacterAutoRuntimeFinalPreflightText === "function" ? deps.buildGrayAutoTrialCharacterAutoRuntimeFinalPreflightText : () => null;
    const buildGrayAutoTrialCharacterAutoRuntimeSeparateImplementationDraftText = typeof deps.buildGrayAutoTrialCharacterAutoRuntimeSeparateImplementationDraftText === "function" ? deps.buildGrayAutoTrialCharacterAutoRuntimeSeparateImplementationDraftText : () => null;
    const getGrayAutoTrialCharacterAutoRuntimeExplicitSwitchState = typeof deps.getGrayAutoTrialCharacterAutoRuntimeExplicitSwitchState === "function" ? deps.getGrayAutoTrialCharacterAutoRuntimeExplicitSwitchState : () => null;
    const enableGrayAutoTrialCharacterAutoRuntimeExplicitSwitch = typeof deps.enableGrayAutoTrialCharacterAutoRuntimeExplicitSwitch === "function" ? deps.enableGrayAutoTrialCharacterAutoRuntimeExplicitSwitch : () => null;
    const disableGrayAutoTrialCharacterAutoRuntimeExplicitSwitch = typeof deps.disableGrayAutoTrialCharacterAutoRuntimeExplicitSwitch === "function" ? deps.disableGrayAutoTrialCharacterAutoRuntimeExplicitSwitch : () => null;
    const rollbackGrayAutoTrialCharacterAutoRuntimeExplicitSwitch = typeof deps.rollbackGrayAutoTrialCharacterAutoRuntimeExplicitSwitch === "function" ? deps.rollbackGrayAutoTrialCharacterAutoRuntimeExplicitSwitch : () => null;
    const emitGrayAutoTrialCharacterCueViaManualBridge = typeof deps.emitGrayAutoTrialCharacterCueViaManualBridge === "function" ? deps.emitGrayAutoTrialCharacterCueViaManualBridge : async () => false;
    const emitLastReplyCharacterCueCandidateViaManualBridge = typeof deps.emitLastReplyCharacterCueCandidateViaManualBridge === "function" ? deps.emitLastReplyCharacterCueCandidateViaManualBridge : async () => false;
    const updateFollowupReadinessBackendEntryCard = typeof deps.updateFollowupReadinessBackendEntryCard === "function" ? deps.updateFollowupReadinessBackendEntryCard : () => null;
    const refreshFollowupReadinessBackendEntrySummary = typeof deps.refreshFollowupReadinessBackendEntrySummary === "function" ? deps.refreshFollowupReadinessBackendEntrySummary : async () => false;
    const updateGrayAutoTrialControlPanel = typeof deps.updateGrayAutoTrialControlPanel === "function" ? deps.updateGrayAutoTrialControlPanel : () => null;
    const updateGrayAutoTrialCharacterManualCueStatusCard = typeof deps.updateGrayAutoTrialCharacterManualCueStatusCard === "function" ? deps.updateGrayAutoTrialCharacterManualCueStatusCard : () => null;
    const updateReplyCharacterCueCandidateManualSendButton = typeof deps.updateReplyCharacterCueCandidateManualSendButton === "function" ? deps.updateReplyCharacterCueCandidateManualSendButton : () => null;
    const buildFollowupReadinessPreviewCardData = typeof deps.buildFollowupReadinessPreviewCardData === "function" ? deps.buildFollowupReadinessPreviewCardData : () => null;
    const buildFollowupReadinessPreviewCardText = typeof deps.buildFollowupReadinessPreviewCardText === "function" ? deps.buildFollowupReadinessPreviewCardText : () => null;
    const buildFollowupReadinessPreviewCopyBundleText = typeof deps.buildFollowupReadinessPreviewCopyBundleText === "function" ? deps.buildFollowupReadinessPreviewCopyBundleText : () => null;
    const buildFollowupReadinessPreviewJsonText = typeof deps.buildFollowupReadinessPreviewJsonText === "function" ? deps.buildFollowupReadinessPreviewJsonText : () => null;
    const buildFollowupReadinessPreviewOneLineText = typeof deps.buildFollowupReadinessPreviewOneLineText === "function" ? deps.buildFollowupReadinessPreviewOneLineText : () => null;
    const buildFollowupConfigTemplate = typeof deps.buildFollowupConfigTemplate === "function" ? deps.buildFollowupConfigTemplate : () => null;
    const runConversationFollowupDebug = typeof deps.runConversationFollowupDebug === "function" ? deps.runConversationFollowupDebug : async () => false;
    const runProactiveSchedulerManualTick = typeof deps.runProactiveSchedulerManualTick === "function" ? deps.runProactiveSchedulerManualTick : async () => false;
    const runConversationSilenceFollowupDryRun = typeof deps.runConversationSilenceFollowupDryRun === "function" ? deps.runConversationSilenceFollowupDryRun : async () => false;
    const runConversationFollowupPendingFixture = typeof deps.runConversationFollowupPendingFixture === "function" ? deps.runConversationFollowupPendingFixture : async () => false;
    const rehearseConversationFollowupPending = typeof deps.rehearseConversationFollowupPending === "function" ? deps.rehearseConversationFollowupPending : () => null;
    const clearConversationFollowupRehearsal = typeof deps.clearConversationFollowupRehearsal === "function" ? deps.clearConversationFollowupRehearsal : () => null;
    const getFollowupRehearsalScenario = typeof deps.getFollowupRehearsalScenario === "function" ? deps.getFollowupRehearsalScenario : () => null;
    const getFollowupRehearsalScenarioLabel = typeof deps.getFollowupRehearsalScenarioLabel === "function" ? deps.getFollowupRehearsalScenarioLabel : () => null;
    const writeTextToClipboard = typeof deps.writeTextToClipboard === "function" ? deps.writeTextToClipboard : async () => false;
    const buildGrayAutoFollowupReadinessStatus = typeof deps.buildGrayAutoFollowupReadinessStatus === "function" ? deps.buildGrayAutoFollowupReadinessStatus : () => null;
    const buildGrayAutoFollowupDryRunStatus = typeof deps.buildGrayAutoFollowupDryRunStatus === "function" ? deps.buildGrayAutoFollowupDryRunStatus : () => null;
    const buildGrayAutoFollowupTrialPreflight = typeof deps.buildGrayAutoFollowupTrialPreflight === "function" ? deps.buildGrayAutoFollowupTrialPreflight : () => null;
    const buildGrayAutoFollowupTrialEventSummary = typeof deps.buildGrayAutoFollowupTrialEventSummary === "function" ? deps.buildGrayAutoFollowupTrialEventSummary : () => null;
    const buildGrayAutoTrialAuditSummaryText = typeof deps.buildGrayAutoTrialAuditSummaryText === "function" ? deps.buildGrayAutoTrialAuditSummaryText : () => null;
    const buildFollowupReadinessBackendEntryView = typeof deps.buildFollowupReadinessBackendEntryView === "function" ? deps.buildFollowupReadinessBackendEntryView : () => null;
    const buildFollowupReadinessBackendEntryCardText = typeof deps.buildFollowupReadinessBackendEntryCardText === "function" ? deps.buildFollowupReadinessBackendEntryCardText : () => null;
    const buildFollowupReadinessFriendlySummary = typeof deps.buildFollowupReadinessFriendlySummary === "function" ? deps.buildFollowupReadinessFriendlySummary : () => null;
    const explainReadinessReason = typeof deps.explainReadinessReason === "function" ? deps.explainReadinessReason : () => null;
    const explainReadinessReasons = typeof deps.explainReadinessReasons === "function" ? deps.explainReadinessReasons : () => null;
    const joinReadinessReasons = typeof deps.joinReadinessReasons === "function" ? deps.joinReadinessReasons : () => null;
    const formatReadinessBool = typeof deps.formatReadinessBool === "function" ? deps.formatReadinessBool : () => null;
    const formatReadinessMs = typeof deps.formatReadinessMs === "function" ? deps.formatReadinessMs : () => null;
    const buildGrayAutoTrialCharacterCuePreview = typeof deps.buildGrayAutoTrialCharacterCuePreview === "function" ? deps.buildGrayAutoTrialCharacterCuePreview : () => null;
    const buildGrayAutoTrialCharacterCueHandoffChecklist = typeof deps.buildGrayAutoTrialCharacterCueHandoffChecklist === "function" ? deps.buildGrayAutoTrialCharacterCueHandoffChecklist : () => null;
    const getGrayAutoTrialCharacterCueManualEmitStatus = typeof deps.getGrayAutoTrialCharacterCueManualEmitStatus === "function" ? deps.getGrayAutoTrialCharacterCueManualEmitStatus : () => null;
    const buildGrayAutoTrialCharacterCueManualEmitRecap = typeof deps.buildGrayAutoTrialCharacterCueManualEmitRecap === "function" ? deps.buildGrayAutoTrialCharacterCueManualEmitRecap : () => null;
    const buildGrayAutoTrialCharacterExpressionStrategyDraft = typeof deps.buildGrayAutoTrialCharacterExpressionStrategyDraft === "function" ? deps.buildGrayAutoTrialCharacterExpressionStrategyDraft : () => null;
    const buildGrayAutoTrialCharacterExpressionStrategyReviewPackage = typeof deps.buildGrayAutoTrialCharacterExpressionStrategyReviewPackage === "function" ? deps.buildGrayAutoTrialCharacterExpressionStrategyReviewPackage : () => null;
    const buildGrayAutoTrialCharacterAutoRuntimeSafetyPlan = typeof deps.buildGrayAutoTrialCharacterAutoRuntimeSafetyPlan === "function" ? deps.buildGrayAutoTrialCharacterAutoRuntimeSafetyPlan : () => null;
    const buildGrayAutoTrialCharacterAutoRuntimeDryRun = typeof deps.buildGrayAutoTrialCharacterAutoRuntimeDryRun === "function" ? deps.buildGrayAutoTrialCharacterAutoRuntimeDryRun : () => null;
    const buildGrayAutoTrialCharacterAutoRuntimeExplicitSwitchPlan = typeof deps.buildGrayAutoTrialCharacterAutoRuntimeExplicitSwitchPlan === "function" ? deps.buildGrayAutoTrialCharacterAutoRuntimeExplicitSwitchPlan : () => null;
    const buildGrayAutoTrialCharacterAutoRuntimeExplicitSwitchReviewPackage = typeof deps.buildGrayAutoTrialCharacterAutoRuntimeExplicitSwitchReviewPackage === "function" ? deps.buildGrayAutoTrialCharacterAutoRuntimeExplicitSwitchReviewPackage : () => null;
    const buildGrayAutoTrialCharacterAutoRuntimeSwitchAcceptancePackage = typeof deps.buildGrayAutoTrialCharacterAutoRuntimeSwitchAcceptancePackage === "function" ? deps.buildGrayAutoTrialCharacterAutoRuntimeSwitchAcceptancePackage : () => null;
    const buildGrayAutoTrialCharacterAutoRuntimeExplicitSwitchControl = typeof deps.buildGrayAutoTrialCharacterAutoRuntimeExplicitSwitchControl === "function" ? deps.buildGrayAutoTrialCharacterAutoRuntimeExplicitSwitchControl : () => null;
    const buildGrayAutoTrialCharacterAutoRuntimeSwitchControlDiagnostics = typeof deps.buildGrayAutoTrialCharacterAutoRuntimeSwitchControlDiagnostics === "function" ? deps.buildGrayAutoTrialCharacterAutoRuntimeSwitchControlDiagnostics : () => null;
    const buildGrayAutoTrialCharacterAutoRuntimeExplicitSwitchRollbackPackage = typeof deps.buildGrayAutoTrialCharacterAutoRuntimeExplicitSwitchRollbackPackage === "function" ? deps.buildGrayAutoTrialCharacterAutoRuntimeExplicitSwitchRollbackPackage : () => null;
    const buildGrayAutoTrialCharacterAutoRuntimeFinalPreflight = typeof deps.buildGrayAutoTrialCharacterAutoRuntimeFinalPreflight === "function" ? deps.buildGrayAutoTrialCharacterAutoRuntimeFinalPreflight : () => null;
    const buildGrayAutoTrialCharacterAutoRuntimeSeparateImplementationDraft = typeof deps.buildGrayAutoTrialCharacterAutoRuntimeSeparateImplementationDraft === "function" ? deps.buildGrayAutoTrialCharacterAutoRuntimeSeparateImplementationDraft : () => null;
    const emitGrayAutoTrialCharacterCueManually = typeof deps.emitGrayAutoTrialCharacterCueManually === "function" ? deps.emitGrayAutoTrialCharacterCueManually : async () => false;
    const previewGrayAutoTrialCharacterCueBackendBridge = typeof deps.previewGrayAutoTrialCharacterCueBackendBridge === "function" ? deps.previewGrayAutoTrialCharacterCueBackendBridge : () => null;
    const getSelectedGrayAutoTrialCharacterCuePresetKey = typeof deps.getSelectedGrayAutoTrialCharacterCuePresetKey === "function" ? deps.getSelectedGrayAutoTrialCharacterCuePresetKey : () => null;
    const getGrayAutoTrialMaxTriggersPerSession = typeof deps.getGrayAutoTrialMaxTriggersPerSession === "function" ? deps.getGrayAutoTrialMaxTriggersPerSession : () => null;
    const buildGrayAutoTrialRunbook = typeof deps.buildGrayAutoTrialRunbook === "function" ? deps.buildGrayAutoTrialRunbook : () => null;
    const buildProactiveSchedulerDebugSnapshot = typeof deps.buildProactiveSchedulerDebugSnapshot === "function" ? deps.buildProactiveSchedulerDebugSnapshot : () => null;
    const buildConversationSilenceDebugSnapshot = typeof deps.buildConversationSilenceDebugSnapshot === "function" ? deps.buildConversationSilenceDebugSnapshot : () => null;
    const buildConversationFollowupDebugView = typeof deps.buildConversationFollowupDebugView === "function" ? deps.buildConversationFollowupDebugView : () => null;
    const snapshotConversationFollowupPending = typeof deps.snapshotConversationFollowupPending === "function" ? deps.snapshotConversationFollowupPending : () => null;
    const restoreConversationFollowupPending = typeof deps.restoreConversationFollowupPending === "function" ? deps.restoreConversationFollowupPending : () => null;
    const clearConversationFollowupPending = typeof deps.clearConversationFollowupPending === "function" ? deps.clearConversationFollowupPending : () => null;
    const getConversationFollowupRehearsalBlockedReason = typeof deps.getConversationFollowupRehearsalBlockedReason === "function" ? deps.getConversationFollowupRehearsalBlockedReason : () => null;
    const runFollowupReadinessPanelRehearsal = typeof deps.runFollowupReadinessPanelRehearsal === "function" ? deps.runFollowupReadinessPanelRehearsal : async () => false;
    const clearFollowupReadinessPanelRehearsal = typeof deps.clearFollowupReadinessPanelRehearsal === "function" ? deps.clearFollowupReadinessPanelRehearsal : () => null;
    const snapshotConversationFollowupPendingFixtureState = typeof deps.snapshotConversationFollowupPendingFixtureState === "function" ? deps.snapshotConversationFollowupPendingFixtureState : () => null;
    const restoreConversationFollowupPendingFixtureState = typeof deps.restoreConversationFollowupPendingFixtureState === "function" ? deps.restoreConversationFollowupPendingFixtureState : () => null;
    const runProactiveSchedulerPollingCheck = typeof deps.runProactiveSchedulerPollingCheck === "function" ? deps.runProactiveSchedulerPollingCheck : async () => false;
    const normalizeProactiveSchedulerPollFailureReason = typeof deps.normalizeProactiveSchedulerPollFailureReason === "function" ? deps.normalizeProactiveSchedulerPollFailureReason : () => null;
    const injectProactiveSchedulerPollFailureOnce = typeof deps.injectProactiveSchedulerPollFailureOnce === "function" ? deps.injectProactiveSchedulerPollFailureOnce : () => null;
    const getProactiveSchedulerFailureInjectionState = typeof deps.getProactiveSchedulerFailureInjectionState === "function" ? deps.getProactiveSchedulerFailureInjectionState : () => null;
    const clearProactiveSchedulerFailureInjection = typeof deps.clearProactiveSchedulerFailureInjection === "function" ? deps.clearProactiveSchedulerFailureInjection : () => null;
    const consumeProactiveSchedulerPollFailureInjection = typeof deps.consumeProactiveSchedulerPollFailureInjection === "function" ? deps.consumeProactiveSchedulerPollFailureInjection : () => null;
    const stopProactiveSchedulerPolling = typeof deps.stopProactiveSchedulerPolling === "function" ? deps.stopProactiveSchedulerPolling : () => null;
    const startProactiveSchedulerPolling = typeof deps.startProactiveSchedulerPolling === "function" ? deps.startProactiveSchedulerPolling : () => null;
    const buildTTSDebugReport = typeof deps.buildTTSDebugReport === "function" ? deps.buildTTSDebugReport : () => null;
    const parseGrayTrialPollEventResult = typeof deps.parseGrayTrialPollEventResult === "function" ? deps.parseGrayTrialPollEventResult : () => null;
    const runGrayAutoFollowupDryRunDebug = typeof deps.runGrayAutoFollowupDryRunDebug === "function" ? deps.runGrayAutoFollowupDryRunDebug : async () => false;
    const buildFollowupRehearsalScenarioCompareRows = typeof deps.buildFollowupRehearsalScenarioCompareRows === "function" ? deps.buildFollowupRehearsalScenarioCompareRows : () => null;
    const buildFollowupRehearsalScenarioCompareText = typeof deps.buildFollowupRehearsalScenarioCompareText === "function" ? deps.buildFollowupRehearsalScenarioCompareText : () => null;
    const normalizeFollowupManualConfirmationToken = typeof deps.normalizeFollowupManualConfirmationToken === "function" ? deps.normalizeFollowupManualConfirmationToken : () => null;
    const buildFollowupManualConfirmationKey = typeof deps.buildFollowupManualConfirmationKey === "function" ? deps.buildFollowupManualConfirmationKey : () => null;
    const buildFollowupManualConfirmationData = typeof deps.buildFollowupManualConfirmationData === "function" ? deps.buildFollowupManualConfirmationData : () => null;
    const getFollowupManualConfirmationStatusLabel = typeof deps.getFollowupManualConfirmationStatusLabel === "function" ? deps.getFollowupManualConfirmationStatusLabel : () => null;
    const buildFollowupManualConfirmationDebugPayload = typeof deps.buildFollowupManualConfirmationDebugPayload === "function" ? deps.buildFollowupManualConfirmationDebugPayload : () => null;
    const recordFollowupManualConfirmationVisibleEvent = typeof deps.recordFollowupManualConfirmationVisibleEvent === "function" ? deps.recordFollowupManualConfirmationVisibleEvent : () => null;
    const updateFollowupManualConfirmationControls = typeof deps.updateFollowupManualConfirmationControls === "function" ? deps.updateFollowupManualConfirmationControls : () => null;
    const handleFollowupManualConfirmClick = typeof deps.handleFollowupManualConfirmClick === "function" ? deps.handleFollowupManualConfirmClick : () => null;
    const dismissFollowupManualConfirmation = typeof deps.dismissFollowupManualConfirmation === "function" ? deps.dismissFollowupManualConfirmation : () => null;
    const reviewFollowupManualConfirmationDetails = typeof deps.reviewFollowupManualConfirmationDetails === "function" ? deps.reviewFollowupManualConfirmationDetails : () => null;
    const updateFollowupReadinessPreviewCard = typeof deps.updateFollowupReadinessPreviewCard === "function" ? deps.updateFollowupReadinessPreviewCard : () => null;
    const updateFollowupManualConfirmationPreviewCard = typeof deps.updateFollowupManualConfirmationPreviewCard === "function" ? deps.updateFollowupManualConfirmationPreviewCard : () => null;
    const buildGrayAutoTrialStatusCardText = typeof deps.buildGrayAutoTrialStatusCardText === "function" ? deps.buildGrayAutoTrialStatusCardText : () => null;
    const updateGrayAutoTrialStatusCard = typeof deps.updateGrayAutoTrialStatusCard === "function" ? deps.updateGrayAutoTrialStatusCard : () => null;
    const buildGrayAutoTrialCharacterCueManualEmitStatusText = typeof deps.buildGrayAutoTrialCharacterCueManualEmitStatusText === "function" ? deps.buildGrayAutoTrialCharacterCueManualEmitStatusText : () => null;
    const getGrayAutoTrialCharacterAutoRuntimeExplicitSwitchEnabled = typeof deps.getGrayAutoTrialCharacterAutoRuntimeExplicitSwitchEnabled === "function" ? deps.getGrayAutoTrialCharacterAutoRuntimeExplicitSwitchEnabled : () => null;
    const updateGrayAutoTrialPreRunChecklistCard = typeof deps.updateGrayAutoTrialPreRunChecklistCard === "function" ? deps.updateGrayAutoTrialPreRunChecklistCard : () => null;
    const updateGrayAutoTrialTimelineCard = typeof deps.updateGrayAutoTrialTimelineCard === "function" ? deps.updateGrayAutoTrialTimelineCard : () => null;
    const updateGrayAutoTrialOutcomeCard = typeof deps.updateGrayAutoTrialOutcomeCard === "function" ? deps.updateGrayAutoTrialOutcomeCard : () => null;
    const updateGrayAutoTrialDecisionCard = typeof deps.updateGrayAutoTrialDecisionCard === "function" ? deps.updateGrayAutoTrialDecisionCard : () => null;
    const updateGrayAutoTrialSignoffCard = typeof deps.updateGrayAutoTrialSignoffCard === "function" ? deps.updateGrayAutoTrialSignoffCard : () => null;
    const updateGrayAutoTrialCharacterCard = typeof deps.updateGrayAutoTrialCharacterCard === "function" ? deps.updateGrayAutoTrialCharacterCard : () => null;
    const updateGrayAutoTrialCharacterHandoffCard = typeof deps.updateGrayAutoTrialCharacterHandoffCard === "function" ? deps.updateGrayAutoTrialCharacterHandoffCard : () => null;
    const updateGrayAutoTrialCharacterRecapCard = typeof deps.updateGrayAutoTrialCharacterRecapCard === "function" ? deps.updateGrayAutoTrialCharacterRecapCard : () => null;
    const updateGrayAutoTrialCharacterStrategyCard = typeof deps.updateGrayAutoTrialCharacterStrategyCard === "function" ? deps.updateGrayAutoTrialCharacterStrategyCard : () => null;
    const updateGrayAutoTrialCharacterReviewCard = typeof deps.updateGrayAutoTrialCharacterReviewCard === "function" ? deps.updateGrayAutoTrialCharacterReviewCard : () => null;
    const updateGrayAutoTrialCharacterAutoPlanCard = typeof deps.updateGrayAutoTrialCharacterAutoPlanCard === "function" ? deps.updateGrayAutoTrialCharacterAutoPlanCard : () => null;
    const updateGrayAutoTrialCharacterDryRunCard = typeof deps.updateGrayAutoTrialCharacterDryRunCard === "function" ? deps.updateGrayAutoTrialCharacterDryRunCard : () => null;
    const updateGrayAutoTrialCharacterSwitchPlanCard = typeof deps.updateGrayAutoTrialCharacterSwitchPlanCard === "function" ? deps.updateGrayAutoTrialCharacterSwitchPlanCard : () => null;
    const updateGrayAutoTrialCharacterSwitchReviewCard = typeof deps.updateGrayAutoTrialCharacterSwitchReviewCard === "function" ? deps.updateGrayAutoTrialCharacterSwitchReviewCard : () => null;
    const updateGrayAutoTrialCharacterSwitchAcceptanceCard = typeof deps.updateGrayAutoTrialCharacterSwitchAcceptanceCard === "function" ? deps.updateGrayAutoTrialCharacterSwitchAcceptanceCard : () => null;
    const updateGrayAutoTrialCharacterSwitchControlCard = typeof deps.updateGrayAutoTrialCharacterSwitchControlCard === "function" ? deps.updateGrayAutoTrialCharacterSwitchControlCard : () => null;
    const updateGrayAutoTrialCharacterSwitchDiagnosticsCard = typeof deps.updateGrayAutoTrialCharacterSwitchDiagnosticsCard === "function" ? deps.updateGrayAutoTrialCharacterSwitchDiagnosticsCard : () => null;
    const updateGrayAutoTrialCharacterSwitchRollbackCard = typeof deps.updateGrayAutoTrialCharacterSwitchRollbackCard === "function" ? deps.updateGrayAutoTrialCharacterSwitchRollbackCard : () => null;
    const updateGrayAutoTrialCharacterSwitchFinalPreflightCard = typeof deps.updateGrayAutoTrialCharacterSwitchFinalPreflightCard === "function" ? deps.updateGrayAutoTrialCharacterSwitchFinalPreflightCard : () => null;
    const updateGrayAutoTrialCharacterImplementationDraftCard = typeof deps.updateGrayAutoTrialCharacterImplementationDraftCard === "function" ? deps.updateGrayAutoTrialCharacterImplementationDraftCard : () => null;
    const promptGrayAutoTrialPhrase = typeof deps.promptGrayAutoTrialPhrase === "function" ? deps.promptGrayAutoTrialPhrase : () => null;
    const handleGrayAutoTrialArmClick = typeof deps.handleGrayAutoTrialArmClick === "function" ? deps.handleGrayAutoTrialArmClick : () => null;
    const handleGrayAutoTrialStopClick = typeof deps.handleGrayAutoTrialStopClick === "function" ? deps.handleGrayAutoTrialStopClick : () => null;
    const handleGrayAutoTrialDisarmClick = typeof deps.handleGrayAutoTrialDisarmClick === "function" ? deps.handleGrayAutoTrialDisarmClick : () => null;
    const handleGrayAutoTrialResetClick = typeof deps.handleGrayAutoTrialResetClick === "function" ? deps.handleGrayAutoTrialResetClick : () => null;
    const handleGrayAutoTrialCharacterCueManualEmitClick = typeof deps.handleGrayAutoTrialCharacterCueManualEmitClick === "function" ? deps.handleGrayAutoTrialCharacterCueManualEmitClick : () => null;
    const handleReplyCharacterCueCandidateManualSendClick = typeof deps.handleReplyCharacterCueCandidateManualSendClick === "function" ? deps.handleReplyCharacterCueCandidateManualSendClick : () => null;
    const handleGrayAutoTrialCharacterAutoRuntimeSwitchEnableClick = typeof deps.handleGrayAutoTrialCharacterAutoRuntimeSwitchEnableClick === "function" ? deps.handleGrayAutoTrialCharacterAutoRuntimeSwitchEnableClick : () => null;
    const handleGrayAutoTrialCharacterAutoRuntimeSwitchDisableClick = typeof deps.handleGrayAutoTrialCharacterAutoRuntimeSwitchDisableClick === "function" ? deps.handleGrayAutoTrialCharacterAutoRuntimeSwitchDisableClick : () => null;
    const handleGrayAutoTrialCharacterAutoRuntimeSwitchRollbackClick = typeof deps.handleGrayAutoTrialCharacterAutoRuntimeSwitchRollbackClick === "function" ? deps.handleGrayAutoTrialCharacterAutoRuntimeSwitchRollbackClick : () => null;
    const copyGrayAutoTrialAuditSummaryToClipboard = typeof deps.copyGrayAutoTrialAuditSummaryToClipboard === "function" ? deps.copyGrayAutoTrialAuditSummaryToClipboard : () => null;
    const copyGrayAutoTrialTimelineToClipboard = typeof deps.copyGrayAutoTrialTimelineToClipboard === "function" ? deps.copyGrayAutoTrialTimelineToClipboard : () => null;
    const copyGrayAutoTrialDecisionToClipboard = typeof deps.copyGrayAutoTrialDecisionToClipboard === "function" ? deps.copyGrayAutoTrialDecisionToClipboard : () => null;
    const copyGrayAutoTrialSignoffToClipboard = typeof deps.copyGrayAutoTrialSignoffToClipboard === "function" ? deps.copyGrayAutoTrialSignoffToClipboard : () => null;
    const copyGrayAutoTrialCharacterCuePreviewToClipboard = typeof deps.copyGrayAutoTrialCharacterCuePreviewToClipboard === "function" ? deps.copyGrayAutoTrialCharacterCuePreviewToClipboard : () => null;
    const copyGrayAutoTrialCharacterCueHandoffChecklistToClipboard = typeof deps.copyGrayAutoTrialCharacterCueHandoffChecklistToClipboard === "function" ? deps.copyGrayAutoTrialCharacterCueHandoffChecklistToClipboard : () => null;
    const copyGrayAutoTrialCharacterCueManualEmitRecapToClipboard = typeof deps.copyGrayAutoTrialCharacterCueManualEmitRecapToClipboard === "function" ? deps.copyGrayAutoTrialCharacterCueManualEmitRecapToClipboard : () => null;
    const copyGrayAutoTrialCharacterExpressionStrategyDraftToClipboard = typeof deps.copyGrayAutoTrialCharacterExpressionStrategyDraftToClipboard === "function" ? deps.copyGrayAutoTrialCharacterExpressionStrategyDraftToClipboard : () => null;
    const copyGrayAutoTrialCharacterExpressionStrategyReviewPackageToClipboard = typeof deps.copyGrayAutoTrialCharacterExpressionStrategyReviewPackageToClipboard === "function" ? deps.copyGrayAutoTrialCharacterExpressionStrategyReviewPackageToClipboard : () => null;
    const copyGrayAutoTrialCharacterAutoRuntimeSafetyPlanToClipboard = typeof deps.copyGrayAutoTrialCharacterAutoRuntimeSafetyPlanToClipboard === "function" ? deps.copyGrayAutoTrialCharacterAutoRuntimeSafetyPlanToClipboard : () => null;
    const copyGrayAutoTrialCharacterAutoRuntimeDryRunToClipboard = typeof deps.copyGrayAutoTrialCharacterAutoRuntimeDryRunToClipboard === "function" ? deps.copyGrayAutoTrialCharacterAutoRuntimeDryRunToClipboard : () => null;
    const copyGrayAutoTrialCharacterAutoRuntimeSwitchPlanToClipboard = typeof deps.copyGrayAutoTrialCharacterAutoRuntimeSwitchPlanToClipboard === "function" ? deps.copyGrayAutoTrialCharacterAutoRuntimeSwitchPlanToClipboard : () => null;
    const copyGrayAutoTrialCharacterAutoRuntimeSwitchReviewToClipboard = typeof deps.copyGrayAutoTrialCharacterAutoRuntimeSwitchReviewToClipboard === "function" ? deps.copyGrayAutoTrialCharacterAutoRuntimeSwitchReviewToClipboard : () => null;
    const copyGrayAutoTrialCharacterAutoRuntimeSwitchAcceptanceToClipboard = typeof deps.copyGrayAutoTrialCharacterAutoRuntimeSwitchAcceptanceToClipboard === "function" ? deps.copyGrayAutoTrialCharacterAutoRuntimeSwitchAcceptanceToClipboard : () => null;
    const copyGrayAutoTrialCharacterAutoRuntimeSwitchControlToClipboard = typeof deps.copyGrayAutoTrialCharacterAutoRuntimeSwitchControlToClipboard === "function" ? deps.copyGrayAutoTrialCharacterAutoRuntimeSwitchControlToClipboard : () => null;
    const copyGrayAutoTrialCharacterAutoRuntimeSwitchDiagnosticsToClipboard = typeof deps.copyGrayAutoTrialCharacterAutoRuntimeSwitchDiagnosticsToClipboard === "function" ? deps.copyGrayAutoTrialCharacterAutoRuntimeSwitchDiagnosticsToClipboard : () => null;
    const copyGrayAutoTrialCharacterAutoRuntimeSwitchRollbackToClipboard = typeof deps.copyGrayAutoTrialCharacterAutoRuntimeSwitchRollbackToClipboard === "function" ? deps.copyGrayAutoTrialCharacterAutoRuntimeSwitchRollbackToClipboard : () => null;
    const copyGrayAutoTrialCharacterAutoRuntimeFinalPreflightToClipboard = typeof deps.copyGrayAutoTrialCharacterAutoRuntimeFinalPreflightToClipboard === "function" ? deps.copyGrayAutoTrialCharacterAutoRuntimeFinalPreflightToClipboard : () => null;
    const copyGrayAutoTrialCharacterAutoRuntimeSeparateImplementationDraftToClipboard = typeof deps.copyGrayAutoTrialCharacterAutoRuntimeSeparateImplementationDraftToClipboard === "function" ? deps.copyGrayAutoTrialCharacterAutoRuntimeSeparateImplementationDraftToClipboard : () => null;
    const updateFollowupReadinessScenarioCompare = typeof deps.updateFollowupReadinessScenarioCompare === "function" ? deps.updateFollowupReadinessScenarioCompare : () => null;
    const createFollowupReadinessActionGroup = typeof deps.createFollowupReadinessActionGroup === "function" ? deps.createFollowupReadinessActionGroup : () => null;
    const createFollowupReadinessCollapsibleActionGroup = typeof deps.createFollowupReadinessCollapsibleActionGroup === "function" ? deps.createFollowupReadinessCollapsibleActionGroup : () => null;
    const ensureFollowupReadinessPanel = typeof deps.ensureFollowupReadinessPanel === "function" ? deps.ensureFollowupReadinessPanel : () => null;
    const toggleFollowupReadinessPanel = typeof deps.toggleFollowupReadinessPanel === "function" ? deps.toggleFollowupReadinessPanel : () => null;
    const copyFollowupReadinessReportToClipboard = typeof deps.copyFollowupReadinessReportToClipboard === "function" ? deps.copyFollowupReadinessReportToClipboard : () => null;
    const copyFollowupReadinessSelectedTextToClipboard = typeof deps.copyFollowupReadinessSelectedTextToClipboard === "function" ? deps.copyFollowupReadinessSelectedTextToClipboard : () => null;
    const copyFollowupReadinessPreviewSummaryToClipboard = typeof deps.copyFollowupReadinessPreviewSummaryToClipboard === "function" ? deps.copyFollowupReadinessPreviewSummaryToClipboard : () => null;
    const copyFollowupReadinessPreviewCopyBundleToClipboard = typeof deps.copyFollowupReadinessPreviewCopyBundleToClipboard === "function" ? deps.copyFollowupReadinessPreviewCopyBundleToClipboard : () => null;
    const copyFollowupReadinessPreviewJsonToClipboard = typeof deps.copyFollowupReadinessPreviewJsonToClipboard === "function" ? deps.copyFollowupReadinessPreviewJsonToClipboard : () => null;
    const copyFollowupReadinessPreviewOneLineToClipboard = typeof deps.copyFollowupReadinessPreviewOneLineToClipboard === "function" ? deps.copyFollowupReadinessPreviewOneLineToClipboard : () => null;
    const copyFollowupConfigTemplateToClipboard = typeof deps.copyFollowupConfigTemplateToClipboard === "function" ? deps.copyFollowupConfigTemplateToClipboard : () => null;

    function buildFollowupCharacterState(followup, silence, scheduler) {
      if (followup?.pending !== true) {
        return {
          label: "安静陪伴",
          mood: "idle",
          description: "现在没有待续接的话题，适合安静待在桌面边上。"
        };
      }
      if (String(followup?.policy || "") === "do_not_followup") {
        return {
          label: "识趣闭麦",
          mood: "neutral",
          description: "话题像是已经收口，角色应该保持安静，不追问。"
        };
      }
      if (scheduler?.eligibleForSchedulerTick === true && silence?.eligibleForSilenceFollowup === true && followup?.eligible === true) {
        return {
          label: "有点想接话",
          mood: followup.characterCue?.emotion || "thinking",
          description: followup.characterPreview || "条件已满足，可以低打扰地轻轻续一句。"
        };
      }
      const schedulerReasons = Array.isArray(scheduler?.blockedReasons) ? scheduler.blockedReasons : [];
      if (schedulerReasons.includes("cooldown_active")) {
        return {
          label: "冷却中",
          mood: "neutral",
          description: "刚刚已经主动过一次，先让用户休息一下。"
        };
      }
      if (schedulerReasons.includes("window_limit_reached")) {
        return {
          label: "今天先收一收",
          mood: "neutral",
          description: "当前时间窗口里的主动续话次数已达上限。"
        };
      }
      const silenceReasons = Array.isArray(silence?.blockedReasons) ? silence.blockedReasons : [];
      if (silenceReasons.includes("user_silence_window_not_reached") || silenceReasons.includes("tts_silence_window_not_reached")) {
        return {
          label: "刚聊完",
          mood: "idle",
          description: "刚刚完成一轮对话，先安静待机，不打断用户。"
        };
      }
      return {
        label: "观察气氛",
        mood: followup.characterCue?.emotion || "thinking",
        description: "有待续接的话题，但还有 guard 未满足。"
      };
    }

    function formatFollowupReactionCandidateSummary(candidates) {
      const list = Array.isArray(candidates) ? candidates.filter((item) => item && item.text) : [];
      if (!list.length) {
        return "n/a";
      }
      return list.slice(0, 2).map((item, index) => `${index + 1}. ${item.text}`).join(" / ");
    }

    function previewConversationFollowupReactions(input = {}) {
      const preview = previewConversationFollowupPolicy(input);
      return {
        policy: preview.followupPolicy,
        topicHint: preview.topicHint,
        selected: preview.selectedReaction || null,
        candidates: Array.isArray(preview.reactionCandidates) ? preview.reactionCandidates.slice() : [],
        preview: preview.characterPreview || ""
      };
    }

    function getFollowupCharacterStateDebugView() {
      const followup = buildConversationFollowupDebugView(Date.now());
      return buildFollowupCharacterState(
        {
          pending: state.followupPending === true,
          policy: followup.followupPolicy,
          eligible: followup.eligible === true,
          characterCue: followup.characterCue || null,
          characterPreview: followup.characterPreview || "",
          selectedReaction: followup.selectedReaction || null
        },
        followup.silence || {},
        buildProactiveSchedulerDebugSnapshot(Date.now())
      );
    }

    function buildFollowupCharacterChipTitle(view) {
      const description = String(view?.description || "").trim();
      const selected = view?.selectedReaction && typeof view.selectedReaction === "object"
        ? view.selectedReaction
        : null;
      const selectedText = String(selected?.candidate?.text || "").trim();
      if (!selectedText) {
        return description || "\u5f53\u524d\u7eed\u8bdd\u89d2\u8272\u72b6\u6001";
      }
      const reason = String(selected?.reason || "").trim() || "n/a";
      const tone = String(selected?.preferredTone || selected?.candidate?.tone || "").trim() || "n/a";
      return [
        description || "\u5f53\u524d\u7eed\u8bdd\u89d2\u8272\u72b6\u6001",
        `\u60f3\u63a5\u7684\u4e00\u53e5\uff1a${selectedText}`,
        `\u9009\u62e9\uff1a${reason} / tone=${tone}`
      ].join("\n");
    }

    function updateFollowupCharacterChip() {
      if (!ui.followupCharacterChip) {
        return;
      }
      let view = null;
      try {
        view = getFollowupCharacterStateDebugView();
      } catch (_) {
        view = { label: "安静陪伴", mood: "idle", description: "当前续话角色状态暂不可用。" };
      }
      const label = String(view.label || "安静陪伴");
      const mood = String(view.mood || "idle");
      const description = String(view.description || "");
      const selectedReaction = view.selectedReaction && typeof view.selectedReaction === "object"
        ? view.selectedReaction
        : null;
      const tone = {
        "有点想接话": "ready",
        "冷却中": "cooldown",
        "今天先收一收": "limit",
        "识趣闭麦": "quiet",
        "刚聊完": "idle",
        "等你缓一会儿": "waiting",
        "观察气氛": "watching",
        "安静陪伴": "idle"
      }[label] || "idle";
      const chipTitle = buildFollowupCharacterChipTitle(view);
      ui.followupCharacterChip.textContent = `${label} · ${mood}`;
      ui.followupCharacterChip.title = chipTitle;
      ui.followupCharacterChip.setAttribute("aria-label", chipTitle);
      ui.followupCharacterChip.dataset.state = label;
      ui.followupCharacterChip.dataset.mood = mood;
      ui.followupCharacterChip.dataset.tone = tone;
      ui.followupCharacterChip.dataset.selectedTone = String(selectedReaction?.preferredTone || selectedReaction?.candidate?.tone || "");
      ui.followupCharacterChip.dataset.selectedIndex = Number.isFinite(Number(selectedReaction?.index))
        ? String(Number(selectedReaction.index))
        : "-1";
      maybeEmitFollowupCharacterRuntimeHint({ label, mood, tone });
    }

    function localizeReplyCharacterValue(kind, value) {
      return typeof CHARACTER_REPLY_CUE.localizeValue === "function"
        ? CHARACTER_REPLY_CUE.localizeValue(kind, value)
        : (typeof CHARACTER_TUNING.localizeValue === "function"
          ? CHARACTER_TUNING.localizeValue(kind, value)
          : String(value || "").trim().toLowerCase().replace(/_/g, " ") || "未定");
    }

    function buildReplyCharacterChipView(candidate = null, autoApply = null) {
      const safeCandidate = candidate && typeof candidate === "object"
        ? candidate
        : state.followupCharacterRuntimeLastReplyCandidate;
      const safeAutoApply = autoApply && typeof autoApply === "object"
        ? autoApply
        : state.followupCharacterRuntimeLastReplyAutoApply;
      return typeof CHARACTER_REPLY_CUE.buildReplyCharacterChipView === "function"
        ? CHARACTER_REPLY_CUE.buildReplyCharacterChipView(safeCandidate, safeAutoApply)
        : {
          text: "上一句角色表现 · 待回复",
          title: "发送一条消息后，这里会显示上一句回复触发的情绪、动作和语音风格。",
          tone: "waiting"
        };
    }

    function updateReplyCharacterChip(candidate = null, autoApply = null) {
      if (!ui.replyCharacterChip) {
        return;
      }
      const view = buildReplyCharacterChipView(candidate, autoApply);
      ui.replyCharacterChip.textContent = view.text;
      ui.replyCharacterChip.title = view.title;
      ui.replyCharacterChip.setAttribute("aria-label", view.title);
      ui.replyCharacterChip.dataset.tone = view.tone;
    }

    function buildFollowupCharacterRuntimeHint(input = {}) {
      return typeof CHARACTER_REPLY_CUE.buildFollowupCharacterRuntimeHint === "function"
        ? CHARACTER_REPLY_CUE.buildFollowupCharacterRuntimeHint(input)
        : {
          emotion: "neutral",
          action: "none",
          intensity: "low",
          voice_style: "neutral",
          live2d_hint: String(input.tone || "idle"),
          source: "followup_character_state",
          label: String(input.label || "")
        };
    }

    function normalizeGrayAutoTrialCharacterCuePresetKey(value) {
      return typeof CHARACTER_REPLY_CUE.normalizeGrayAutoTrialCharacterCuePresetKey === "function"
        ? CHARACTER_REPLY_CUE.normalizeGrayAutoTrialCharacterCuePresetKey(value)
        : "auto";
    }

    function listGrayAutoTrialCharacterCuePresets() {
      return typeof CHARACTER_REPLY_CUE.listGrayAutoTrialCharacterCuePresets === "function"
        ? CHARACTER_REPLY_CUE.listGrayAutoTrialCharacterCuePresets()
        : [];
    }

    function resolveGrayAutoTrialCharacterCuePreset(input = {}, checklist = null) {
      const safeChecklist = checklist && typeof checklist === "object"
        ? checklist
        : buildGrayAutoTrialCharacterCueHandoffChecklist();
      return typeof CHARACTER_REPLY_CUE.resolveGrayAutoTrialCharacterCuePreset === "function"
        ? CHARACTER_REPLY_CUE.resolveGrayAutoTrialCharacterCuePreset(input, safeChecklist)
        : {
          key: "auto",
          label: String(safeChecklist.label || ""),
          tone: String(safeChecklist.tone || ""),
          description: "",
          runtimeHint: { ...(safeChecklist.runtimeHint || {}) }
        };
    }

    function buildAssistantReplyCharacterExpressionCue(input = {}) {
      return typeof CHARACTER_REPLY_CUE.buildAssistantReplyCharacterExpressionCue === "function"
        ? CHARACTER_REPLY_CUE.buildAssistantReplyCharacterExpressionCue(input)
        : {
          reason: "neutral_idle",
          runtimeHint: { emotion: "neutral", action: "none", intensity: "low", voice_style: "neutral", live2d_hint: "idle" }
        };
    }

    function buildAssistantReplyCharacterCueCandidate(input = {}) {
      return typeof CHARACTER_REPLY_CUE.buildAssistantReplyCharacterCueCandidate === "function"
        ? CHARACTER_REPLY_CUE.buildAssistantReplyCharacterCueCandidate(input, {
          normalizeMetadata: normalizeCharacterRuntimeMetadataForFrontend,
          now: () => Date.now()
        })
        : {
          readOnly: true,
          source: "assistant_reply",
          generatedAt: Date.now(),
          eligibleForManualSend: false,
          autoTriggered: false,
          auto: input?.auto === true,
          mood: String(input?.mood || "idle").trim().toLowerCase(),
          style: String(input?.style || "neutral").trim().toLowerCase(),
          tone: "idle",
          expressionReason: "missing_helper",
          textPreview: String(input?.text || "").trim().slice(0, 80),
          runtimeHint: null,
          safety: { noRuntimeCueEmission: true, noLive2DMove: true, noTts: true, noSchedulerChange: true, noFollowupExecution: true, noConfigWrites: true }
        };
    }

    function previewAssistantReplyCharacterCueCandidate(input = {}) {
      const candidate = buildAssistantReplyCharacterCueCandidate(input);
      state.followupCharacterRuntimeLastReplyCandidate = candidate;
      recordTTSDebugEvent("conversation_followup_character_reply_cue_candidate", {
        text: String(candidate.textPreview || ""),
        result: `tone:${candidate.tone};mood:${candidate.mood};style:${candidate.style}`,
        error: candidate.runtimeHint ? String(candidate.runtimeHint.emotion || "") : "no_runtime_hint"
      });
      updateReplyCharacterChip(candidate);
      updateGrayAutoTrialCharacterManualCueStatusCard();
      updateReplyCharacterCueCandidateManualSendButton();
      return candidate;
    }

    function normalizeRuntimeVoiceStyle(style) {
      return typeof CHARACTER_REPLY_CUE.normalizeRuntimeVoiceStyle === "function"
        ? CHARACTER_REPLY_CUE.normalizeRuntimeVoiceStyle(style)
        : "neutral";
    }

    function runtimeVoiceStyleToTalkStyle(style, fallback = "neutral") {
      return typeof CHARACTER_REPLY_CUE.runtimeVoiceStyleToTalkStyle === "function"
        ? CHARACTER_REPLY_CUE.runtimeVoiceStyleToTalkStyle(style, fallback, normalizeTalkStyle)
        : normalizeTalkStyle(fallback);
    }

    function applyPerformanceControlsToRuntimeHint(runtimeHint = null, brainSnapshot = null) {
      return typeof CHARACTER_REPLY_CUE.applyPerformanceControlsToRuntimeHint === "function"
        ? CHARACTER_REPLY_CUE.applyPerformanceControlsToRuntimeHint(runtimeHint, brainSnapshot)
        : runtimeHint;
    }

    function isReplyCueAutoApplyEnabled() {
      const runtimeCfg = state.config?.character_runtime || {};
      return state.characterRuntimeAutoApplyReplyCue === true
        || (runtimeCfg.enabled === true && runtimeCfg.auto_apply_reply_cue === true);
    }

    function maybeAutoApplyAssistantReplyCharacterCueCandidate(candidate, context = {}) {
      if (!candidate || typeof candidate !== "object") {
        return null;
      }
      if (!isReplyCueAutoApplyEnabled()) {
        state.followupCharacterRuntimeLastReplyAutoApply = {
          at: Date.now(),
          applied: false,
          reason: "disabled"
        };
        updateReplyCharacterChip(candidate, state.followupCharacterRuntimeLastReplyAutoApply);
        return null;
      }
      const runtimeHint = candidate.runtimeHint && typeof candidate.runtimeHint === "object"
        ? candidate.runtimeHint
        : null;
      if (!runtimeHint) {
        const skipped = {
          at: Date.now(),
          applied: false,
          reason: "missing_runtime_hint",
          speechStyle: normalizeTalkStyle(context.style || candidate.style || "neutral"),
          voiceStyle: "neutral"
        };
        state.followupCharacterRuntimeLastReplyAutoApply = skipped;
        updateReplyCharacterChip(candidate, skipped);
        return skipped;
      }

      let normalized = null;
      let reason = "applied";
      try {
        normalized = handleCharacterRuntimeMetadata(runtimeHint);
      } catch (error) {
        reason = String(error?.message || error || "dispatch_failed") || "dispatch_failed";
      }
      const voiceStyle = normalizeRuntimeVoiceStyle(
        normalized?.voice_style || runtimeHint.voice_style || candidate.mood || context.mood || "neutral"
      );
      const speechStyle = runtimeVoiceStyleToTalkStyle(voiceStyle, context.style || candidate.style || "neutral");
      const result = {
        at: Date.now(),
        applied: !!normalized,
        reason: normalized ? "applied" : reason,
        voiceStyle,
        speechStyle,
        runtimeHint: normalized,
        source: "assistant_reply_candidate"
      };
      candidate.autoTriggered = !!normalized;
      state.followupCharacterRuntimeLastReplyAutoApply = result;
      try {
        window.__AI_CHAT_LAST_CHARACTER_RUNTIME_REPLY_AUTO_APPLY__ = result;
      } catch (_) {
        // Diagnostics are optional.
      }
      recordTTSDebugEvent("conversation_followup_character_reply_cue_candidate_auto_apply", {
        text: String(candidate.textPreview || ""),
        result: result.applied
          ? `voice:${voiceStyle};speechStyle:${speechStyle}`
          : `skipped:${result.reason}`,
        error: String(normalized?.emotion || runtimeHint.emotion || "")
      });
      updateReplyCharacterChip(candidate, result);
      updateGrayAutoTrialCharacterManualCueStatusCard();
      updateReplyCharacterCueCandidateManualSendButton();
      return result;
    }

    function maybeEmitFollowupCharacterRuntimeHint(input = {}) {
      if (state.uiView !== "chat") {
        return null;
      }
      const tone = String(input.tone || "idle");
      const now = Date.now();
      const changed = tone !== state.followupCharacterRuntimeLastTone;
      if (!changed) {
        return null;
      }
      const lastHintAt = Number(state.followupCharacterRuntimeLastHintAt || 0);
      if (lastHintAt > 0 && now - lastHintAt < 30000) {
        return null;
      }
      const hint = buildFollowupCharacterRuntimeHint(input);
      state.followupCharacterRuntimeLastTone = tone;
      state.followupCharacterRuntimeLastHintAt = now;
      state.followupCharacterRuntimeLastHint = hint;
      recordTTSDebugEvent("followup_character_runtime_hint", {
        text: String(input.label || ""),
        result: tone,
        error: String(hint.emotion || "")
      });
      try {
        return handleCharacterRuntimeMetadata(hint);
      } catch (_) {
        return null;
      }
    }

    function startFollowupCharacterChipRefresh() {
      updateFollowupCharacterChip();
      updateReplyCharacterChip();
      if (state.followupCharacterChipRefreshTimer || typeof window === "undefined") {
        return;
      }
      state.followupCharacterChipRefreshTimer = window.setInterval(() => {
        updateFollowupCharacterChip();
        updateReplyCharacterChip();
      }, 2000);
    }

    function buildFollowupAwareIdleMotionContext() {
      try {
        const view = getFollowupCharacterStateDebugView();
        const label = String(view?.label || "");
        if (label === "有点想接话") {
          return { combo: false, idleIntent: "thinking", idleMood: "idle", style: "clear" };
        }
        if (label === "观察气氛" || label === "等你缓一会儿") {
          return { combo: false, idleIntent: "thinking", idleMood: "idle", style: "comfort" };
        }
        if (label === "识趣闭麦" || label === "冷却中" || label === "今天先收一收") {
          return { combo: false, idleIntent: "idle", idleMood: "idle", style: "steady" };
        }
      } catch (_) {
        // Idle motion should never affect the main chat or scheduler flow.
      }
      return { combo: false, idleIntent: "idle", idleMood: "idle" };
    }

    return {
      buildFollowupCharacterState,
      formatFollowupReactionCandidateSummary,
      previewConversationFollowupReactions,
      getFollowupCharacterStateDebugView,
      buildFollowupCharacterChipTitle,
      updateFollowupCharacterChip,
      localizeReplyCharacterValue,
      buildReplyCharacterChipView,
      updateReplyCharacterChip,
      buildFollowupCharacterRuntimeHint,
      normalizeGrayAutoTrialCharacterCuePresetKey,
      listGrayAutoTrialCharacterCuePresets,
      resolveGrayAutoTrialCharacterCuePreset,
      buildAssistantReplyCharacterExpressionCue,
      buildAssistantReplyCharacterCueCandidate,
      previewAssistantReplyCharacterCueCandidate,
      normalizeRuntimeVoiceStyle,
      runtimeVoiceStyleToTalkStyle,
      applyPerformanceControlsToRuntimeHint,
      isReplyCueAutoApplyEnabled,
      maybeAutoApplyAssistantReplyCharacterCueCandidate,
      maybeEmitFollowupCharacterRuntimeHint,
      startFollowupCharacterChipRefresh,
      buildFollowupAwareIdleMotionContext
    };
  }

  const api = { createController };
  root.TaffyGrayTrialCharacterPanelController = api;
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof window !== "undefined" ? window : globalThis);
