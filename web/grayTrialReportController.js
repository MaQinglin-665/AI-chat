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
    const updateReplyCharacterChip = typeof deps.updateReplyCharacterChip === "function" ? deps.updateReplyCharacterChip : () => null;
    const updateFollowupCharacterChip = typeof deps.updateFollowupCharacterChip === "function" ? deps.updateFollowupCharacterChip : () => null;
    const updateFollowupReadinessPanel = typeof deps.updateFollowupReadinessPanel === "function" ? deps.updateFollowupReadinessPanel : () => null;
    const syncProactiveSchedulerPolling = typeof deps.syncProactiveSchedulerPolling === "function" ? deps.syncProactiveSchedulerPolling : () => null;
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
    const buildGrayAutoTrialAuditSummaryText = typeof deps.buildGrayAutoTrialAuditSummaryText === "function" ? deps.buildGrayAutoTrialAuditSummaryText : () => null;
    const buildFollowupReadinessBackendEntryView = typeof deps.buildFollowupReadinessBackendEntryView === "function" ? deps.buildFollowupReadinessBackendEntryView : () => null;
    const buildFollowupReadinessBackendEntryCardText = typeof deps.buildFollowupReadinessBackendEntryCardText === "function" ? deps.buildFollowupReadinessBackendEntryCardText : () => null;
    const buildFollowupCharacterState = typeof deps.buildFollowupCharacterState === "function" ? deps.buildFollowupCharacterState : () => null;
    const previewConversationFollowupReactions = typeof deps.previewConversationFollowupReactions === "function" ? deps.previewConversationFollowupReactions : () => null;
    const buildFollowupCharacterChipTitle = typeof deps.buildFollowupCharacterChipTitle === "function" ? deps.buildFollowupCharacterChipTitle : () => null;
    const buildReplyCharacterChipView = typeof deps.buildReplyCharacterChipView === "function" ? deps.buildReplyCharacterChipView : () => null;
    const buildFollowupCharacterRuntimeHint = typeof deps.buildFollowupCharacterRuntimeHint === "function" ? deps.buildFollowupCharacterRuntimeHint : () => null;
    const normalizeGrayAutoTrialCharacterCuePresetKey = typeof deps.normalizeGrayAutoTrialCharacterCuePresetKey === "function" ? deps.normalizeGrayAutoTrialCharacterCuePresetKey : () => null;
    const listGrayAutoTrialCharacterCuePresets = typeof deps.listGrayAutoTrialCharacterCuePresets === "function" ? deps.listGrayAutoTrialCharacterCuePresets : () => null;
    const resolveGrayAutoTrialCharacterCuePreset = typeof deps.resolveGrayAutoTrialCharacterCuePreset === "function" ? deps.resolveGrayAutoTrialCharacterCuePreset : () => null;
    const previewAssistantReplyCharacterCueCandidate = typeof deps.previewAssistantReplyCharacterCueCandidate === "function" ? deps.previewAssistantReplyCharacterCueCandidate : () => null;
    const maybeAutoApplyAssistantReplyCharacterCueCandidate = typeof deps.maybeAutoApplyAssistantReplyCharacterCueCandidate === "function" ? deps.maybeAutoApplyAssistantReplyCharacterCueCandidate : () => null;
    const maybeEmitFollowupCharacterRuntimeHint = typeof deps.maybeEmitFollowupCharacterRuntimeHint === "function" ? deps.maybeEmitFollowupCharacterRuntimeHint : () => null;
    const buildFollowupAwareIdleMotionContext = typeof deps.buildFollowupAwareIdleMotionContext === "function" ? deps.buildFollowupAwareIdleMotionContext : () => null;
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
    const formatFollowupReactionCandidateSummary = typeof deps.formatFollowupReactionCandidateSummary === "function" ? deps.formatFollowupReactionCandidateSummary : () => null;
    const getFollowupCharacterStateDebugView = typeof deps.getFollowupCharacterStateDebugView === "function" ? deps.getFollowupCharacterStateDebugView : () => null;
    const localizeReplyCharacterValue = typeof deps.localizeReplyCharacterValue === "function" ? deps.localizeReplyCharacterValue : () => null;
    const buildAssistantReplyCharacterExpressionCue = typeof deps.buildAssistantReplyCharacterExpressionCue === "function" ? deps.buildAssistantReplyCharacterExpressionCue : () => null;
    const buildAssistantReplyCharacterCueCandidate = typeof deps.buildAssistantReplyCharacterCueCandidate === "function" ? deps.buildAssistantReplyCharacterCueCandidate : () => null;
    const normalizeRuntimeVoiceStyle = typeof deps.normalizeRuntimeVoiceStyle === "function" ? deps.normalizeRuntimeVoiceStyle : () => null;
    const runtimeVoiceStyleToTalkStyle = typeof deps.runtimeVoiceStyleToTalkStyle === "function" ? deps.runtimeVoiceStyleToTalkStyle : async () => false;
    const isReplyCueAutoApplyEnabled = typeof deps.isReplyCueAutoApplyEnabled === "function" ? deps.isReplyCueAutoApplyEnabled : () => null;
    const startFollowupCharacterChipRefresh = typeof deps.startFollowupCharacterChipRefresh === "function" ? deps.startFollowupCharacterChipRefresh : () => null;
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

    function formatReadinessBool(value) {
      return value === true ? "开" : "关";
    }

    function formatReadinessMs(value) {
      const ms = Number(value);
      if (!Number.isFinite(ms) || ms < 0) {
        return "n/a";
      }
      if (ms < 1000) {
        return `${Math.round(ms)}ms`;
      }
      if (ms < 60000) {
        return `${Math.round(ms / 1000)}s`;
      }
      return `${Math.round(ms / 60000)}m`;
    }

    function joinReadinessReasons(reasons) {
      const list = Array.isArray(reasons) ? reasons.filter(Boolean) : [];
      return list.length ? list.join(", ") : "none";
    }

    function explainReadinessReason(reason) {
      const key = String(reason || "").trim();
      const labels = {
        conversation_disabled: "会话模式未开启",
        proactive_disabled: "主动续话未开启",
        scheduler_disabled: "主动调度未开启",
        gray_auto_disabled: "灰度自动续话未显式启用",
        gray_auto_trial_disabled: "灰度自动试运行未显式启用",
        gray_auto_trial_session_limit_reached: "\u7070\u5ea6\u81ea\u52a8\u8bd5\u8fd0\u884c\u672c\u6b21\u4f1a\u8bdd\u6b21\u6570\u5df2\u8fbe\u4e0a\u9650",
        no_pending_followup: "当前没有待续接的话题",
        empty_topic_hint: "没有可继续的话题线索",
        silence_window_not_reached: "安静时间还不够",
        user_silence_window_not_reached: "用户刚刚还在互动，需要再等一会儿",
        tts_silence_window_not_reached: "语音刚结束或还没有结束记录",
        no_user_activity_timestamp: "还没有用户活动时间记录",
        no_tts_finished_timestamp: "还没有语音结束时间记录",
        policy_do_not_followup: "话题像是已经收口，所以不继续追问",
        chat_busy: "当前正在处理对话",
        speaking: "角色正在说话",
        in_flight: "已有一次主动续话正在执行",
        cooldown_active: "仍在冷却时间内",
        window_limit_reached: "当前时间窗口内续话次数已达上限",
        warmup_active: "调度器还在预热中"
      };
      return labels[key] || key || "未知原因";
    }

    function explainReadinessReasons(reasons) {
      const list = Array.isArray(reasons) ? reasons.filter(Boolean) : [];
      return list.length ? list.map(explainReadinessReason).join("；") : "没有阻塞原因";
    }

    function buildGrayAutoFollowupReadinessStatus(snapshotInput = null) {
      const snapshot = snapshotInput && typeof snapshotInput === "object"
        ? snapshotInput
        : getTTSDebugSnapshot();
      const mode = snapshot.conversationMode || {};
      const followup = snapshot.followup || {};
      const silence = snapshot.silence || {};
      const scheduler = snapshot.proactiveScheduler || {};
      const blockedSet = new Set();
      if (mode.enabled !== true) {
        blockedSet.add("conversation_disabled");
      }
      if (mode.proactiveEnabled !== true) {
        blockedSet.add("proactive_disabled");
      }
      if (mode.proactiveSchedulerEnabled !== true) {
        blockedSet.add("scheduler_disabled");
      }
      if (mode.grayAutoEnabled !== true) {
        blockedSet.add("gray_auto_disabled");
      }
      if (mode.grayAutoTrialEnabled !== true) {
        blockedSet.add("gray_auto_trial_disabled");
      }
      if (Number(mode.grayAutoTrialSessionTriggerCount || 0) >= Number(mode.grayAutoTrialMaxTriggersPerSession ?? 1)) {
        blockedSet.add("gray_auto_trial_session_limit_reached");
      }
      [
        scheduler.pollingBlockedReasons,
        followup.blockedReasons,
        silence.blockedReasons,
        scheduler.blockedReasons
      ].forEach((reasons) => {
        if (Array.isArray(reasons)) {
          reasons.filter(Boolean).forEach((reason) => blockedSet.add(String(reason)));
        }
      });
      if (followup.pending !== true) {
        blockedSet.add("no_pending_followup");
      }
      const pollingReady = scheduler.pollingEnabled === true;
      const candidateReady = followup.eligible === true
        && silence.eligibleForSilenceFollowup === true
        && scheduler.eligibleForSchedulerTick === true;
      const trialEnabled = mode.grayAutoTrialEnabled === true;
      const ready = pollingReady && candidateReady && mode.grayAutoEnabled === true && trialEnabled;
      const status = ready
        ? "ready"
        : mode.grayAutoEnabled === true && trialEnabled ? "blocked" : "default_off";
      return {
        status,
        ready,
        pollingReady,
        candidateReady,
        grayAutoEnabled: mode.grayAutoEnabled === true,
        grayAutoTrialEnabled: trialEnabled,
        grayAutoTrialSessionTriggerCount: Number(mode.grayAutoTrialSessionTriggerCount || 0),
        grayAutoTrialMaxTriggersPerSession: Number(mode.grayAutoTrialMaxTriggersPerSession ?? 1),
        blockedReasons: Array.from(blockedSet)
      };
    }

    function buildGrayAutoFollowupDryRunStatus(snapshotInput = null) {
      const snapshot = snapshotInput && typeof snapshotInput === "object"
        ? snapshotInput
        : getTTSDebugSnapshot();
      const readiness = buildGrayAutoFollowupReadinessStatus(snapshot);
      const followup = snapshot.followup || {};
      const silence = snapshot.silence || {};
      const scheduler = snapshot.proactiveScheduler || {};
      const wouldPollCheck = readiness.pollingReady === true;
      const wouldAttemptTrigger = readiness.ready === true;
      return {
        dryRun: true,
        ok: wouldAttemptTrigger,
        status: wouldAttemptTrigger ? "would_trigger" : readiness.status,
        wouldPollCheck,
        wouldAttemptTrigger,
        readiness,
        followup: {
          pending: followup.pending === true,
          eligible: followup.eligible === true,
          policy: String(followup.policy || ""),
          topicHint: String(followup.topicHint || ""),
          blockedReasons: Array.isArray(followup.blockedReasons) ? followup.blockedReasons.slice() : []
        },
        silence: {
          eligibleForSilenceFollowup: silence.eligibleForSilenceFollowup === true,
          blockedReasons: Array.isArray(silence.blockedReasons) ? silence.blockedReasons.slice() : []
        },
        scheduler: {
          pollingEnabled: scheduler.pollingEnabled === true,
          eligibleForSchedulerTick: scheduler.eligibleForSchedulerTick === true,
          pollTimerActive: scheduler.pollTimerActive === true,
          blockedReasons: Array.isArray(scheduler.blockedReasons) ? scheduler.blockedReasons.slice() : [],
          pollingBlockedReasons: Array.isArray(scheduler.pollingBlockedReasons)
            ? scheduler.pollingBlockedReasons.slice()
            : []
        }
      };
    }

    function buildGrayAutoFollowupTrialPreflight(snapshotInput = null) {
      const snapshot = snapshotInput && typeof snapshotInput === "object"
        ? snapshotInput
        : getTTSDebugSnapshot();
      const mode = snapshot.conversationMode || {};
      const readiness = buildGrayAutoFollowupReadinessStatus(snapshot);
      const dryRun = buildGrayAutoFollowupDryRunStatus(snapshot);
      const gates = [
        {
          key: "enabled",
          configKey: "conversation_mode.enabled",
          enabled: mode.enabled === true,
          blockedReason: "conversation_disabled"
        },
        {
          key: "proactive_enabled",
          configKey: "conversation_mode.proactive_enabled",
          enabled: mode.proactiveEnabled === true,
          blockedReason: "proactive_disabled"
        },
        {
          key: "proactive_scheduler_enabled",
          configKey: "conversation_mode.proactive_scheduler_enabled",
          enabled: mode.proactiveSchedulerEnabled === true,
          blockedReason: "scheduler_disabled"
        },
        {
          key: "gray_auto_enabled",
          configKey: "conversation_mode.gray_auto_enabled",
          enabled: mode.grayAutoEnabled === true,
          blockedReason: "gray_auto_disabled"
        },
        {
          key: "gray_auto_trial_enabled",
          configKey: "conversation_mode.gray_auto_trial_enabled",
          enabled: mode.grayAutoTrialEnabled === true,
          blockedReason: "gray_auto_trial_disabled"
        }
      ];
      const gateBlockedReasons = gates
        .filter((gate) => gate.enabled !== true)
        .map((gate) => gate.blockedReason);
      const sessionTriggerCount = Number(mode.grayAutoTrialSessionTriggerCount || 0);
      const sessionMaxTriggers = Number(mode.grayAutoTrialMaxTriggersPerSession ?? 1);
      const sessionLimitReached = sessionTriggerCount >= sessionMaxTriggers;
      const gatesReady = gateBlockedReasons.length === 0;
      const localTrialReady = !sessionLimitReached && gatesReady && readiness.ready === true && dryRun.wouldAttemptTrigger === true;
      const status = sessionLimitReached
        ? "session_limit_reached"
        : localTrialReady
          ? "ready_for_local_trial"
          : gatesReady ? "runtime_guards_blocked" : "gated_off";
      const nextAction = localTrialReady
        ? "Local trial may be observed; keep it opt-in, reversible, and watched."
        : gatesReady
          ? "Wait for candidate, silence window, cooldown, policy, and scheduler guards to pass."
          : "Enable all five gates only in a local test config when ready for controlled trial.";
      return {
        preflight: true,
        readOnly: true,
        ok: localTrialReady,
        status,
        gatesReady,
        gates,
        gateBlockedReasons,
        sessionLimit: {
          count: sessionTriggerCount,
          max: sessionMaxTriggers,
          reached: sessionLimitReached
        },
        readiness,
        dryRun: {
          dryRun: true,
          status: dryRun.status,
          wouldPollCheck: dryRun.wouldPollCheck === true,
          wouldAttemptTrigger: dryRun.wouldAttemptTrigger === true,
          blockedReasons: Array.isArray(readiness.blockedReasons) ? readiness.blockedReasons.slice() : []
        },
        safety: {
          defaultOffRequired: true,
          explicitGrayTrialOptInRequired: true,
          manualConfirmationPrimary: true,
          noDesktopObservationRequired: true,
          noFileAccess: true,
          noToolCalls: true,
          noConfigWrites: true,
          noModelOrTtsCall: true
        },
        nextAction
      };
    }


    function buildGrayAutoFollowupTrialEventContext(snapshotInput = null) {
      const preflight = buildGrayAutoFollowupTrialPreflight(snapshotInput);
      const gateSummary = preflight.gatesReady === true
        ? "pass"
        : preflight.gateBlockedReasons.join("|") || "none";
      const blockedReasons = Array.from(new Set([].concat(
        Array.isArray(preflight.gateBlockedReasons) ? preflight.gateBlockedReasons : [],
        Array.isArray(preflight.dryRun?.blockedReasons) ? preflight.dryRun.blockedReasons : []
      ).filter(Boolean).map((reason) => String(reason))));
      return {
        result: [
          `trial:${preflight.status}`,
          `gates:${gateSummary}`,
          `would_poll:${preflight.dryRun?.wouldPollCheck === true ? "true" : "false"}`,
          `would_trigger:${preflight.dryRun?.wouldAttemptTrigger === true ? "true" : "false"}`
        ].join(";"),
        blocked: blockedReasons.join(",")
      };
    }

    function mergeProactiveSchedulerPollEventResult(result, trialContext = null) {
      const base = String(result || "").trim();
      const extra = String(trialContext?.result || "").trim();
      return [base, extra].filter(Boolean).join(";");
    }

    function mergeProactiveSchedulerPollEventError(error, trialContext = null) {
      const base = String(error || "").trim();
      const extra = String(trialContext?.blocked || "").trim();
      return [base, extra].filter(Boolean).join(";").slice(0, 220);
    }


    function parseGrayTrialPollEventResult(result) {
      const parts = String(result || "")
        .split(";")
        .map((part) => part.trim())
        .filter(Boolean);
      const parsed = {
        raw: String(result || ""),
        base: parts.filter((part) => !/^(trial|gates|would_poll|would_trigger):/.test(part)).join(";"),
        trialStatus: "",
        gates: "",
        wouldPoll: false,
        wouldTrigger: false
      };
      parts.forEach((part) => {
        const index = part.indexOf(":");
        if (index <= 0) {
          return;
        }
        const key = part.slice(0, index);
        const value = part.slice(index + 1);
        if (key === "trial") {
          parsed.trialStatus = value;
        } else if (key === "gates") {
          parsed.gates = value;
        } else if (key === "would_poll") {
          parsed.wouldPoll = value === "true";
        } else if (key === "would_trigger") {
          parsed.wouldTrigger = value === "true";
        }
      });
      return parsed;
    }

    function buildGrayAutoFollowupTrialEventSummary(limit = 20) {
      const rawLimit = Number(limit);
      const safeLimit = Number.isFinite(rawLimit)
        ? Math.max(1, Math.min(80, Math.round(rawLimit)))
        : 20;
      const events = Array.isArray(state.ttsDebugEvents) ? state.ttsDebugEvents : [];
      const pollEvents = events
        .filter((event) => String(event?.stage || "").startsWith("proactive_scheduler_poll_"))
        .slice(-safeLimit);
      const counts = {};
      const recent = pollEvents.map((event) => {
        const parsed = parseGrayTrialPollEventResult(event?.result || "");
        const stage = String(event?.stage || "");
        counts[stage] = Number(counts[stage] || 0) + 1;
        return {
          seq: Number(event?.seq || 0),
          ageMs: Number(event?.ageMs || 0),
          stage,
          result: parsed.base,
          trialStatus: parsed.trialStatus,
          gates: parsed.gates,
          wouldPoll: parsed.wouldPoll,
          wouldTrigger: parsed.wouldTrigger,
          blocked: sanitizeTTSDebugText(event?.error || "", 180)
        };
      });
      const last = recent.length ? recent[recent.length - 1] : null;
      return {
        readOnly: true,
        limit: safeLimit,
        totalPollEvents: pollEvents.length,
        counts,
        last,
        hasPollStart: recent.some((event) => event.stage === "proactive_scheduler_poll_start"),
        hasReady: recent.some((event) => event.stage === "proactive_scheduler_poll_ready"),
        hasTriggerAttempt: recent.some((event) =>
          event.stage === "proactive_scheduler_poll_trigger_success"
          || event.stage === "proactive_scheduler_poll_trigger_blocked"
        ),
        lastTrialStatus: last?.trialStatus || "none",
        recent
      };
    }

    function runGrayAutoFollowupDryRunDebug() {
      const result = buildGrayAutoFollowupDryRunStatus();
      const blockedReasons = Array.isArray(result.readiness?.blockedReasons)
        ? result.readiness.blockedReasons.join(",")
        : "";
      recordTTSDebugEvent("conversation_followup_gray_auto_dry_run_checked", {
        text: String(result.followup?.topicHint || ""),
        result: [
          `status:${result.status}`,
          `would_poll:${result.wouldPollCheck === true ? "true" : "false"}`,
          `would_trigger:${result.wouldAttemptTrigger === true ? "true" : "false"}`
        ].join(";"),
        error: sanitizeTTSDebugText(blockedReasons, 140)
      });
      return result;
    }

    function buildFollowupReadinessFriendlySummary(followup, silence, scheduler) {
      if (followup?.eligible === true && silence?.eligibleForSilenceFollowup === true && scheduler?.eligibleForSchedulerTick === true) {
        return "可以续话：续话、安静窗口和调度器都已满足。";
      }
      if (followup?.pending !== true) {
        return "空闲：当前没有待续接的话题。";
      }
      if (String(followup?.policy || "") === "do_not_followup") {
        return "保持安静：当前话题像是已经收口，不应该继续追问。";
      }
      if (silence?.eligibleForSilenceFollowup !== true) {
        return `等待中：${explainReadinessReasons(silence?.blockedReasons)}。`;
      }
      if (scheduler?.eligibleForSchedulerTick !== true) {
        return `暂不触发：${explainReadinessReasons(scheduler?.blockedReasons)}。`;
      }
      return `暂不触发：${explainReadinessReasons(followup?.blockedReasons)}。`;
    }

    return {
      formatReadinessBool,
      formatReadinessMs,
      joinReadinessReasons,
      explainReadinessReason,
      explainReadinessReasons,
      buildGrayAutoFollowupReadinessStatus,
      buildGrayAutoFollowupDryRunStatus,
      buildGrayAutoFollowupTrialPreflight,
      buildGrayAutoFollowupTrialEventContext,
      mergeProactiveSchedulerPollEventResult,
      mergeProactiveSchedulerPollEventError,
      parseGrayTrialPollEventResult,
      buildGrayAutoFollowupTrialEventSummary,
      runGrayAutoFollowupDryRunDebug,
      buildFollowupReadinessFriendlySummary
    };
  }

  const api = { createController };
  root.TaffyGrayTrialReportController = api;
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof window !== "undefined" ? window : globalThis);
