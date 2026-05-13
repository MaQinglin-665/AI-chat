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
    const buildGrayAutoFollowupTrialEventContext = typeof deps.buildGrayAutoFollowupTrialEventContext === "function" ? deps.buildGrayAutoFollowupTrialEventContext : () => null;
    const mergeProactiveSchedulerPollEventResult = typeof deps.mergeProactiveSchedulerPollEventResult === "function" ? deps.mergeProactiveSchedulerPollEventResult : () => null;
    const mergeProactiveSchedulerPollEventError = typeof deps.mergeProactiveSchedulerPollEventError === "function" ? deps.mergeProactiveSchedulerPollEventError : () => null;
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
    const parseGrayTrialPollEventResult = typeof deps.parseGrayTrialPollEventResult === "function" ? deps.parseGrayTrialPollEventResult : () => null;
    const runGrayAutoFollowupDryRunDebug = typeof deps.runGrayAutoFollowupDryRunDebug === "function" ? deps.runGrayAutoFollowupDryRunDebug : async () => false;
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

    function getGrayAutoTrialMaxTriggersPerSession(conversationMode = null) {
      const mode = conversationMode && typeof conversationMode === "object"
        ? conversationMode
        : state.conversationMode;
      const value = Number(mode?.grayAutoTrialMaxTriggersPerSession);
      return Number.isFinite(value) ? Math.max(0, Math.min(4, Math.round(value))) : 1;
    }

    function getGrayAutoTrialSessionTriggerCount() {
      const value = Number(state.grayAutoTrialSessionTriggerCount || 0);
      return Number.isFinite(value) ? Math.max(0, Math.round(value)) : 0;
    }

    function isGrayAutoTrialSessionLimitReached(conversationMode = null) {
      return getGrayAutoTrialSessionTriggerCount() >= getGrayAutoTrialMaxTriggersPerSession(conversationMode);
    }

    function incrementGrayAutoTrialSessionTriggerCount() {
      state.grayAutoTrialSessionTriggerCount = getGrayAutoTrialSessionTriggerCount() + 1;
      return state.grayAutoTrialSessionTriggerCount;
    }

    function buildGrayAutoTrialSessionState() {
      const maxTriggers = getGrayAutoTrialMaxTriggersPerSession();
      const count = getGrayAutoTrialSessionTriggerCount();
      return {
        readOnly: true,
        count,
        max: maxTriggers,
        remaining: Math.max(0, maxTriggers - count),
        reached: count >= maxTriggers,
        blockedReason: count >= maxTriggers ? "gray_auto_trial_session_limit_reached" : ""
      };
    }

    function resetGrayAutoTrialSessionTriggerCount() {
      const previous = getGrayAutoTrialSessionTriggerCount();
      state.grayAutoTrialSessionTriggerCount = 0;
      const current = buildGrayAutoTrialSessionState();
      recordTTSDebugEvent("conversation_followup_gray_auto_trial_session_reset", {
        result: `from:${previous};max:${current.max}`,
        error: current.blockedReason
      });
      return {
        ...current,
        reset: true,
        previousCount: previous,
        pollingRestarted: false
      };
    }


    function stopGrayAutoTrialSession(reason = "manual_emergency_stop") {
      const normalizedReason = sanitizeTTSDebugText(reason || "manual_emergency_stop", 80) || "manual_emergency_stop";
      const previous = buildGrayAutoTrialSessionState();
      state.grayAutoTrialSessionTriggerCount = getGrayAutoTrialMaxTriggersPerSession();
      stopProactiveSchedulerPolling("gray_auto_trial_emergency_stop");
      const current = buildGrayAutoTrialSessionState();
      recordTTSDebugEvent("conversation_followup_gray_auto_trial_emergency_stop", {
        result: ["reason:" + normalizedReason, "from:" + previous.count, "to:" + current.count, "max:" + current.max].join(";"),
        error: current.blockedReason
      });
      return {
        ...current,
        stopped: true,
        reason: normalizedReason,
        previousCount: previous.count,
        pollingRestarted: false
      };
    }

    function armGrayAutoTrialSession(input = {}) {
      const safeInput = input && typeof input === "object" ? input : {};
      const confirm = String(safeInput.confirm || "").trim();
      if (confirm !== "ARM_GRAY_AUTO_TRIAL") {
        return {
          ok: false,
          armed: false,
          reason: "confirmation_required",
          requiredConfirm: "ARM_GRAY_AUTO_TRIAL",
          pollingRestarted: false
        };
      }
      if (!state.conversationMode || typeof state.conversationMode !== "object") {
        state.conversationMode = {};
      }
      state.conversationMode.enabled = true;
      state.conversationMode.proactiveEnabled = true;
      state.conversationMode.proactiveSchedulerEnabled = true;
      state.conversationMode.grayAutoEnabled = true;
      state.conversationMode.grayAutoTrialEnabled = true;
      if (!Number.isFinite(Number(state.conversationMode.grayAutoTrialMaxTriggersPerSession))) {
        state.conversationMode.grayAutoTrialMaxTriggersPerSession = 1;
      }
      resetGrayAutoTrialSessionTriggerCount();
      syncProactiveSchedulerPolling();
      const preflight = buildGrayAutoFollowupTrialPreflight();
      const scheduler = buildProactiveSchedulerDebugSnapshot(Date.now());
      recordTTSDebugEvent("conversation_followup_gray_auto_trial_armed", {
        result: [
          `status:${preflight.status}`,
          `polling:${scheduler.pollTimerActive === true ? "active" : "inactive"}`,
          `max:${getGrayAutoTrialMaxTriggersPerSession()}`
        ].join(";"),
        error: Array.isArray(preflight.blockedReasons) ? preflight.blockedReasons.join(",") : ""
      });
      return {
        ok: true,
        armed: true,
        pollingRestarted: scheduler.pollTimerActive === true,
        preflight,
        scheduler: {
          pollTimerActive: scheduler.pollTimerActive === true,
          pollingBlockedReasons: Array.isArray(scheduler.pollingBlockedReasons) ? scheduler.pollingBlockedReasons.slice() : []
        }
      };
    }

    function disarmGrayAutoTrialSession(reason = "manual_disarm") {
      const normalizedReason = sanitizeTTSDebugText(reason || "manual_disarm", 80) || "manual_disarm";
      if (!state.conversationMode || typeof state.conversationMode !== "object") {
        state.conversationMode = {};
      }
      state.conversationMode.grayAutoEnabled = false;
      state.conversationMode.grayAutoTrialEnabled = false;
      stopProactiveSchedulerPolling("gray_auto_trial_disarmed");
      const scheduler = buildProactiveSchedulerDebugSnapshot(Date.now());
      recordTTSDebugEvent("conversation_followup_gray_auto_trial_disarmed", {
        result: [
          `reason:${normalizedReason}`,
          `polling:${scheduler.pollTimerActive === true ? "active" : "inactive"}`,
          `count:${getGrayAutoTrialSessionTriggerCount()}`,
          `max:${getGrayAutoTrialMaxTriggersPerSession()}`
        ].join(";"),
        error: Array.isArray(scheduler.pollingBlockedReasons) ? scheduler.pollingBlockedReasons.join(",") : ""
      });
      return {
        ok: true,
        armed: false,
        reason: normalizedReason,
        pollingRestarted: false,
        scheduler: {
          pollTimerActive: scheduler.pollTimerActive === true,
          pollingBlockedReasons: Array.isArray(scheduler.pollingBlockedReasons) ? scheduler.pollingBlockedReasons.slice() : []
        },
        session: buildGrayAutoTrialSessionState()
      };
    }

    function buildGrayAutoTrialRunbook() {
      return {
        readOnly: true,
        title: "Gray automatic follow-up controlled trial runbook",
        safety: [
          "Default config stays off.",
          "Use DevTools only in a local controlled test.",
          "Session cap, emergency stop, disarm, cooldown, silence, policy, busy/speaking, and window limits still apply.",
          "No desktop observation, screenshots, file access, shell execution, tool calls, backend APIs, or config writes are required."
        ],
        commands: {
          preflight: "window.__AI_CHAT_DEBUG_TTS__.grayAutoFollowupTrialPreflight()",
          events: "window.__AI_CHAT_DEBUG_TTS__.grayAutoFollowupTrialEvents()",
          session: "window.__AI_CHAT_DEBUG_TTS__.grayAutoFollowupTrialSession()",
          arm: "window.__AI_CHAT_DEBUG_TTS__.armGrayAutoFollowupTrial({ confirm: \"ARM_GRAY_AUTO_TRIAL\" })",
          stop: "window.__AI_CHAT_DEBUG_TTS__.stopGrayAutoFollowupTrial(\"manual_stop\")",
          disarm: "window.__AI_CHAT_DEBUG_TTS__.disarmGrayAutoFollowupTrial(\"manual_disarm\")",
          reset: "window.__AI_CHAT_DEBUG_TTS__.resetGrayAutoFollowupTrialSession()",
          audit: "window.__AI_CHAT_DEBUG_TTS__.grayAutoFollowupTrialAuditSummary()",
          checklist: "window.__AI_CHAT_DEBUG_TTS__.grayAutoFollowupTrialPreRunChecklist()",
          timeline: "window.__AI_CHAT_DEBUG_TTS__.grayAutoFollowupTrialTimeline()",
          outcome: "window.__AI_CHAT_DEBUG_TTS__.grayAutoFollowupTrialOutcome()",
          decision: "window.__AI_CHAT_DEBUG_TTS__.grayAutoFollowupTrialGoNoGoDecision()",
          signoff: "window.__AI_CHAT_DEBUG_TTS__.grayAutoFollowupTrialSignoffPackage()",
          statusReport: "window.__AI_CHAT_DEBUG_TTS__.followupReadiness()"
        },
        steps: [
          "Run preflight and confirm whether the trial is gated_off, runtime_guards_blocked, or ready_for_local_trial.",
          "Run arm only with the exact confirmation phrase during a local controlled test.",
          "Watch grayAutoFollowupTrialEvents() for poll_start, poll_blocked, poll_ready, and trigger events.",
          "If anything feels wrong, run stopGrayAutoFollowupTrial() immediately.",
          "After the test, run disarmGrayAutoFollowupTrial() to close in-memory gates.",
          "Use resetGrayAutoFollowupTrialSession() only when you intentionally want another capped local attempt."
        ],
        successCriteria: [
          "No automatic behavior happens before explicit arm.",
          "Poll events include trial status, gates, would_poll, and would_trigger.",
          "At most one successful automatic trigger happens with the default session cap.",
          "Emergency stop seals the session until reset.",
          "Disarm turns gray gates off and leaves config unchanged."
        ],
        rollback: [
          "Run stopGrayAutoFollowupTrial(\"rollback\").",
          "Run disarmGrayAutoFollowupTrial(\"rollback\").",
          "Restart the app if you want to clear all renderer-memory trial state."
        ]
      };
    }

    function shouldEnableProactiveSchedulerPolling() {
      const status = getProactiveSchedulerPollingGateStatus();
      return status.enabled;
    }

    function getProactiveSchedulerPollingGateStatus() {
      const conversationMode = state.conversationMode && typeof state.conversationMode === "object"
        ? state.conversationMode
        : {};
      const blockedReasons = [];
      if (conversationMode.enabled !== true) {
        blockedReasons.push("conversation_disabled");
      }
      if (conversationMode.proactiveEnabled !== true) {
        blockedReasons.push("proactive_disabled");
      }
      if (conversationMode.proactiveSchedulerEnabled !== true) {
        blockedReasons.push("scheduler_disabled");
      }
      if (conversationMode.grayAutoEnabled !== true) {
        blockedReasons.push("gray_auto_disabled");
      }
      if (conversationMode.grayAutoTrialEnabled !== true) {
        blockedReasons.push("gray_auto_trial_disabled");
      }
      if (isGrayAutoTrialSessionLimitReached(conversationMode)) {
        blockedReasons.push("gray_auto_trial_session_limit_reached");
      }
      return {
        enabled: blockedReasons.length === 0,
        blockedReasons
      };
    }

    function buildProactiveSchedulerDebugSnapshot(nowMs = Date.now()) {
      const now = Number(nowMs);
      const safeNow = Number.isFinite(now) ? now : Date.now();
      const conversationMode = state.conversationMode && typeof state.conversationMode === "object"
        ? state.conversationMode
        : {};
      const conversationEnabled = conversationMode.enabled === true;
      const proactiveEnabled = conversationMode.proactiveEnabled === true;
      const schedulerEnabled = conversationMode.proactiveSchedulerEnabled === true;
      const grayAutoEnabled = conversationMode.grayAutoEnabled === true;
      const grayAutoTrialEnabled = conversationMode.grayAutoTrialEnabled === true;
      const grayAutoTrialSessionTriggerCount = getGrayAutoTrialSessionTriggerCount();
      const grayAutoTrialMaxTriggersPerSession = getGrayAutoTrialMaxTriggersPerSession(conversationMode);
      const pollingGate = getProactiveSchedulerPollingGateStatus();
      const pollIntervalMs = Number.isFinite(Number(conversationMode.proactivePollIntervalMs))
        ? Math.max(30000, Math.min(600000, Math.round(Number(conversationMode.proactivePollIntervalMs))))
        : 60000;
      const warmupMs = Number.isFinite(Number(conversationMode.proactiveWarmupMs))
        ? Math.max(0, Math.round(Number(conversationMode.proactiveWarmupMs)))
        : 120000;
      const maxFollowupsPerWindow = Number.isFinite(Number(conversationMode.maxFollowupsPerWindow))
        ? Math.max(0, Math.round(Number(conversationMode.maxFollowupsPerWindow)))
        : 1;
      const proactiveWindowMs = Number.isFinite(Number(conversationMode.proactiveWindowMs))
        ? Math.max(0, Math.round(Number(conversationMode.proactiveWindowMs)))
        : 3600000;
      const startedAt = Number(state.proactiveSchedulerStartedAt || 0);
      const proactiveCooldownUntil = Number(state.proactiveCooldownUntil || 0);
      const proactiveWindowStartedAt = Number(state.proactiveWindowStartedAt || 0);
      const rawProactiveCountInWindow = Number.isFinite(Number(state.proactiveCountInWindow))
        ? Math.max(0, Math.round(Number(state.proactiveCountInWindow)))
        : 0;
      const proactiveInFlight = state.proactiveInFlight === true;
      const pollTimerActive = Number(state.proactivePollTimerId || 0) > 0;
      const pollingEnabled = pollingGate.enabled === true;
      const lastPollAt = Number(state.proactiveLastPollAt || 0);
      const lastPollAgeMs = lastPollAt > 0 ? Math.max(0, Math.round(safeNow - lastPollAt)) : -1;
      const lastAttemptAt = Number(state.proactiveLastAttemptAt || 0);
      const lastTriggeredAt = Number(state.proactiveLastTriggeredAt || 0);

      const startedAgeMs = startedAt > 0 ? Math.max(0, Math.round(safeNow - startedAt)) : -1;
      const warmupRemainingMs = startedAt > 0
        ? Math.max(0, Math.round(warmupMs - (safeNow - startedAt)))
        : warmupMs;
      const cooldownRemainingMs = proactiveCooldownUntil > safeNow
        ? Math.max(0, Math.round(proactiveCooldownUntil - safeNow))
        : 0;
      const rawWindowAgeMs = proactiveWindowStartedAt > 0
        ? Math.max(0, Math.round(safeNow - proactiveWindowStartedAt))
        : -1;
      const windowActive = proactiveWindowStartedAt > 0 && rawWindowAgeMs <= proactiveWindowMs;
      const windowAgeMs = windowActive ? rawWindowAgeMs : -1;
      const proactiveCountInWindow = windowActive ? rawProactiveCountInWindow : 0;
      const lastAttemptAgeMs = lastAttemptAt > 0 ? Math.max(0, Math.round(safeNow - lastAttemptAt)) : -1;
      const lastTriggeredAgeMs = lastTriggeredAt > 0 ? Math.max(0, Math.round(safeNow - lastTriggeredAt)) : -1;

      const blockedReasons = [];
      if (!conversationEnabled) {
        blockedReasons.push("conversation_disabled");
      }
      if (!proactiveEnabled) {
        blockedReasons.push("proactive_disabled");
      }
      if (!schedulerEnabled) {
        blockedReasons.push("scheduler_disabled");
      }
      if (warmupRemainingMs > 0) {
        blockedReasons.push("warmup_active");
      }
      if (cooldownRemainingMs > 0) {
        blockedReasons.push("cooldown_active");
      }
      if (proactiveInFlight) {
        blockedReasons.push("in_flight");
      }
      if (proactiveCountInWindow >= maxFollowupsPerWindow) {
        blockedReasons.push("window_limit_reached");
      }
      if (grayAutoTrialSessionTriggerCount >= grayAutoTrialMaxTriggersPerSession) {
        blockedReasons.push("gray_auto_trial_session_limit_reached");
      }

      return {
        schedulerEnabled,
        conversationEnabled,
        proactiveEnabled,
        grayAutoEnabled,
        grayAutoTrialEnabled,
        grayAutoTrialSessionTriggerCount,
        grayAutoTrialMaxTriggersPerSession,
        startedAgeMs,
        warmupRemainingMs,
        cooldownRemainingMs,
        windowAgeMs,
        proactiveCountInWindow,
        maxFollowupsPerWindow,
        proactiveInFlight,
        pollingEnabled,
        pollingBlockedReasons: Array.isArray(pollingGate.blockedReasons)
          ? pollingGate.blockedReasons.slice()
          : [],
        pollIntervalMs,
        pollTimerActive,
        lastPollAgeMs,
        pollLastResult: String(state.proactivePollLastResult || ""),
        lastAttemptAgeMs,
        lastTriggeredAgeMs,
        lastBlockedReason: String(state.proactiveLastBlockedReason || ""),
        lastResult: String(state.proactiveLastResult || ""),
        blockedReasons,
        eligibleForSchedulerTick: blockedReasons.length === 0
      };
    }

    function getTTSDebugSnapshot() {
      const audio = state.ttsAudio;
      const now = performance.now();
      const conversationMode = state.conversationMode && typeof state.conversationMode === "object"
        ? state.conversationMode
        : {};
      const followupUpdatedAt = Number(state.followupUpdatedAt || 0);
      const followupPlan = buildConversationFollowupDebugPlan(Date.now());
      const followupPolicy = buildConversationFollowupPolicy({
        reason: String(state.followupReason || ""),
        topicHint: String(state.followupTopicHint || "")
      });
      const followupCharacterCue = buildConversationFollowupCharacterCue(followupPlan);
      const followupReactionCandidates = buildConversationFollowupReactionCandidates(followupPlan);
      const followupSelectedReaction = selectConversationFollowupReactionCandidate(followupPlan, followupReactionCandidates);
      const followupCharacterPreview = followupSelectedReaction.candidate?.text || "";
      const durationMs = audio && Number.isFinite(Number(audio.duration)) && audio.duration > 0
        ? Math.round(Number(audio.duration) * 1000)
        : Number(state.ttsDebugAudioDurationMs || -1);
      const currentMs = audio ? Math.round(Number(audio.currentTime || 0) * 1000) : Number(state.ttsDebugAudioCurrentMs || 0);
      return {
        provider: state.ttsProvider,
        speakingEnabled: !!state.speakingEnabled,
        streamMode: state.streamSpeakMode,
        streamWorking: !!state.streamSpeakWorking,
        queueLen: Array.isArray(state.streamSpeakQueue) ? state.streamSpeakQueue.length : 0,
        bufferChars: String(state.streamSpeakBuffer || "").length,
        sessionId: Number(state.streamSpeakSession || 0),
        traceId: state.ttsDebugCurrentTraceId || state.activePerfTraceId || "",
        currentText: state.ttsDebugCurrentText || "",
        audioPaused: audio ? !!audio.paused : true,
        audioEnded: audio ? !!audio.ended : true,
        audioReadyState: audio ? Number(audio.readyState || 0) : -1,
        durationMs,
        currentMs,
        contextSpeaking: !!state.ttsContextSpeaking,
        mouthOpen: Number(state.speechMouthOpen || 0),
        audioLevel: Number(state.ttsAudioLevel || 0),
        rawLevel: Number(state.ttsAudioRawLevel || 0),
        rms: Number(state.ttsAudioRms || 0),
        lastVoiceAgeMs: state.ttsAudioLastVoiceAt ? Math.round(now - Number(state.ttsAudioLastVoiceAt)) : -1,
        animUntilMs: Math.round(Number(state.speechAnimUntil || 0) - now),
        animDurationMs: Number(state.speechAnimDurationMs || 0),
        mood: state.speechAnimMood || "idle",
        style: state.speechAnimStyle || state.currentTalkStyle || "neutral",
        conversationMode: {
          enabled: conversationMode.enabled === true,
          proactiveEnabled: conversationMode.proactiveEnabled === true,
          proactiveSchedulerEnabled: conversationMode.proactiveSchedulerEnabled === true,
          grayAutoEnabled: conversationMode.grayAutoEnabled === true,
          grayAutoTrialEnabled: conversationMode.grayAutoTrialEnabled === true,
          grayAutoTrialSessionTriggerCount: getGrayAutoTrialSessionTriggerCount(),
          grayAutoTrialMaxTriggersPerSession: getGrayAutoTrialMaxTriggersPerSession(conversationMode),
          proactiveCooldownMs: Number.isFinite(Number(conversationMode.proactiveCooldownMs))
            ? Math.round(Number(conversationMode.proactiveCooldownMs))
            : 600000,
          proactiveWarmupMs: Number.isFinite(Number(conversationMode.proactiveWarmupMs))
            ? Math.round(Number(conversationMode.proactiveWarmupMs))
            : 120000,
          proactiveWindowMs: Number.isFinite(Number(conversationMode.proactiveWindowMs))
            ? Math.round(Number(conversationMode.proactiveWindowMs))
            : 3600000,
          proactivePollIntervalMs: Number.isFinite(Number(conversationMode.proactivePollIntervalMs))
            ? Math.round(Number(conversationMode.proactivePollIntervalMs))
            : 60000,
          maxFollowupsPerWindow: Number.isFinite(Number(conversationMode.maxFollowupsPerWindow))
            ? Math.round(Number(conversationMode.maxFollowupsPerWindow))
            : 1,
          silenceFollowupMinMs: Number.isFinite(Number(conversationMode.silenceFollowupMinMs))
            ? Math.round(Number(conversationMode.silenceFollowupMinMs))
            : 180000,
          interruptTtsOnUserSpeech: conversationMode.interruptTtsOnUserSpeech !== false
        },
        followup: {
          pending: state.followupPending === true,
          reason: String(state.followupReason || ""),
          topicHint: String(state.followupTopicHint || ""),
          eligible: followupPlan.eligible === true,
          blockedReasons: Array.isArray(followupPlan.blockedReasons) ? followupPlan.blockedReasons.slice() : [],
          policy: followupPolicy.type,
          policyNote: followupPolicy.note,
          policyBlockedReason: String(followupPolicy.blockedReason || ""),
          characterCue: followupCharacterCue,
          characterPreview: followupCharacterPreview,
          reactionCandidates: followupReactionCandidates,
          selectedReaction: followupSelectedReaction,
          updatedAgeMs: followupUpdatedAt > 0 ? Math.max(0, Math.round(Date.now() - followupUpdatedAt)) : -1
        },
        proactiveScheduler: buildProactiveSchedulerDebugSnapshot(Date.now()),
        silence: buildConversationSilenceDebugSnapshot(Date.now()),
        lastResult: state.ttsDebugLastResult || "",
        lastError: state.ttsDebugLastError || ""
      };
    }

    function buildConversationSilenceDebugSnapshot(nowMs = Date.now()) {
      const now = Number(nowMs);
      const safeNow = Number.isFinite(now) ? now : Date.now();
      const conversationMode = state.conversationMode && typeof state.conversationMode === "object"
        ? state.conversationMode
        : {};
      const conversationEnabled = conversationMode.enabled === true;
      const proactiveEnabled = conversationMode.proactiveEnabled === true;
      const proactiveSchedulerEnabled = conversationMode.proactiveSchedulerEnabled === true;
      const followupPending = state.followupPending === true;
      const topicHint = String(state.followupTopicHint || "").trim();
      const reason = String(state.followupReason || "").trim();
      const policy = buildConversationFollowupPolicy({ reason, topicHint });
      const chatBusy = state.chatBusy === true;
      const speaking = isSpeakingNow();
      const silenceFollowupMinMs = Number.isFinite(Number(conversationMode.silenceFollowupMinMs))
        ? Math.max(0, Math.round(Number(conversationMode.silenceFollowupMinMs)))
        : 180000;
      const lastUserAt = Number(state.conversationLastUserAt || 0);
      const lastAssistantAt = Number(state.conversationLastAssistantAt || 0);
      const lastTtsFinishedAt = Number(state.conversationLastTtsFinishedAt || 0);
      const lastUserAgeMs = lastUserAt > 0 ? Math.max(0, Math.round(safeNow - lastUserAt)) : -1;
      const lastAssistantAgeMs = lastAssistantAt > 0 ? Math.max(0, Math.round(safeNow - lastAssistantAt)) : -1;
      const lastTtsFinishedAgeMs = lastTtsFinishedAt > 0 ? Math.max(0, Math.round(safeNow - lastTtsFinishedAt)) : -1;
      const silenceWindowReached = lastTtsFinishedAgeMs >= 0 && lastTtsFinishedAgeMs >= silenceFollowupMinMs;

      const blockedReasons = [];
      if (!conversationEnabled) {
        blockedReasons.push("conversation_disabled");
      }
      if (!proactiveEnabled) {
        blockedReasons.push("proactive_disabled");
      }
      if (!followupPending) {
        blockedReasons.push("no_pending_followup");
      }
      if (!topicHint) {
        blockedReasons.push("empty_topic_hint");
      }
      if (policy.type === "do_not_followup") {
        blockedReasons.push(policy.blockedReason || "policy_do_not_followup");
      }
      if (chatBusy) {
        blockedReasons.push("chat_busy");
      }
      if (speaking) {
        blockedReasons.push("speaking");
      }
      if (lastUserAgeMs < 0) {
        blockedReasons.push("no_user_activity_timestamp");
      } else if (lastUserAgeMs < silenceFollowupMinMs) {
        blockedReasons.push("user_silence_window_not_reached");
      }
      if (lastTtsFinishedAgeMs < 0) {
        blockedReasons.push("no_tts_finished_timestamp");
      } else if (lastTtsFinishedAgeMs < silenceFollowupMinMs) {
        blockedReasons.push("tts_silence_window_not_reached");
      }

      return {
        lastUserAgeMs,
        lastAssistantAgeMs,
        lastTtsFinishedAgeMs,
        silenceFollowupMinMs,
        silenceWindowReached,
        conversationEnabled,
        proactiveEnabled,
        proactiveSchedulerEnabled,
        followupPending,
        followupPolicy: policy.type,
        followupPolicyNote: policy.note,
        chatBusy,
        speaking,
        eligibleForSilenceFollowup: blockedReasons.length === 0,
        blockedReasons
      };
    }

    function buildConversationFollowupPolicy(plan) {
      const safePlan = plan && typeof plan === "object" ? plan : {};
      const reason = String(safePlan.reason || "").trim();
      const topicHint = String(safePlan.topicHint || "").replace(/\s+/g, " ").trim();
      const closingRe = /(不用|算了|没事|先这样|不聊|结束|晚安|睡了|休息|不用回|别追问|不要继续)/i;
      if (topicHint && closingRe.test(topicHint)) {
        return {
          type: "do_not_followup",
          note: "话题像是已收口或不适合继续追问，保持安静。",
          blockedReason: "policy_do_not_followup"
        };
      }
      if (reason === "question_tail") {
        return {
          type: "light_question",
          note: "上一轮以问题收尾，只允许轻轻补一个可忽略的小追问。"
        };
      }
      if (reason === "keyword_hint") {
        return {
          type: "soft_checkin",
          note: "上一轮像是在征求继续意愿，优先给低压力的可选接话。"
        };
      }
      return {
        type: "gentle_continue",
        note: "默认以自然、短句的方式轻轻续一下话题。"
      };
    }

    function buildConversationFollowupCharacterCue(plan) {
      const safePlan = plan && typeof plan === "object" ? plan : {};
      const policy = String(safePlan.followupPolicy || "gentle_continue").trim() || "gentle_continue";
      const reason = String(safePlan.reason || "followup_pending").trim() || "followup_pending";
      const cueByPolicy = {
        gentle_continue: {
          persona: "温和、好奇、有一点桌宠式陪伴感",
          tone: "像轻轻探头接一句，不像客服提醒",
          emotion: "thinking",
          action: "think",
          intensity: "low",
          voiceStyle: "soft",
          sample: "刚才那个点我还在想，要不要先轻轻放在这里？"
        },
        light_question: {
          persona: "好奇但不追着人问的小伙伴",
          tone: "只问一个可以不回答的小问题",
          emotion: "thinking",
          action: "think",
          intensity: "low",
          voiceStyle: "soft",
          sample: "我有点好奇这个点，不过你想先放着也完全可以。"
        },
        soft_checkin: {
          persona: "低压力、会看气氛的陪伴型角色",
          tone: "把选择权交给用户，不催促继续聊",
          emotion: "happy",
          action: "nod",
          intensity: "low",
          voiceStyle: "soft",
          sample: "如果你还想聊这个，我在这边慢慢听。"
        }
      };
      const cue = cueByPolicy[policy] || cueByPolicy.gentle_continue;
      return {
        ...cue,
        policy,
        reason,
        runtimeMetadataHint: {
          emotion: cue.emotion,
          action: cue.action,
          intensity: cue.intensity,
          voice_style: cue.voiceStyle
        }
      };
    }

    function buildConversationFollowupReactionCandidates(plan) {
      const safePlan = plan && typeof plan === "object" ? plan : {};
      const policy = String(safePlan.followupPolicy || "gentle_continue").trim() || "gentle_continue";
      let topicHint = String(safePlan.topicHint || "").replace(/\s+/g, " ").trim();
      if (topicHint.length > 28) {
        topicHint = `${topicHint.slice(0, 28).trim()}...`;
      }
      if (policy === "do_not_followup") {
        return [
          { text: "这个话题像是已经收口了，我先安静待着。", tone: "quiet", emotion: "neutral" },
          { text: "收到，我不追问啦，就在旁边待机。", tone: "quiet", emotion: "neutral" },
          { text: "那我先闭麦一下，有需要你再叫我。", tone: "quiet", emotion: "neutral" }
        ];
      }
      if (!topicHint) {
        return [];
      }
      if (policy === "light_question") {
        return [
          { text: `我有点好奇「${topicHint}」，不过你想先放着也完全可以。`, tone: "curious", emotion: "thinking" },
          { text: `刚才「${topicHint}」那里，我可以只问一个很小的问题吗？`, tone: "curious", emotion: "thinking" },
          { text: `「${topicHint}」这个点有点勾我，但不急，想聊再聊。`, tone: "soft", emotion: "thinking" }
        ];
      }
      if (policy === "soft_checkin") {
        return [
          { text: `如果你还想聊「${topicHint}」，我在这边慢慢听。`, tone: "soft", emotion: "happy" },
          { text: `「${topicHint}」可以先放着，我会记得这个线头。`, tone: "soft", emotion: "thinking" },
          { text: `想继续的话，我可以陪你把「${topicHint}」轻轻接下去。`, tone: "soft", emotion: "happy" }
        ];
      }
      return [
        { text: `刚才「${topicHint}」这个点我还在想，要不要先轻轻放在这里？`, tone: "gentle", emotion: "thinking" },
        { text: `我把「${topicHint}」这根线先捏在手里，你想接的时候我还在。`, tone: "gentle", emotion: "thinking" },
        { text: `关于「${topicHint}」，我有个很轻的小想法，不过不打扰你。`, tone: "gentle", emotion: "thinking" }
      ];
    }

    function selectConversationFollowupReactionCandidate(plan, candidatesInput) {
      const safePlan = plan && typeof plan === "object" ? plan : {};
      const candidates = Array.isArray(candidatesInput)
        ? candidatesInput.filter((item) => item && typeof item === "object" && String(item.text || "").trim())
        : buildConversationFollowupReactionCandidates(safePlan);
      if (!candidates.length) {
        return {
          candidate: null,
          index: -1,
          reason: "no_candidates",
          preferredTone: "",
          candidateCount: 0
        };
      }

      const policy = String(safePlan.followupPolicy || "gentle_continue").trim() || "gentle_continue";
      const reason = String(safePlan.reason || "").trim().toLowerCase();
      const updatedAgeMs = Number(safePlan.updatedAgeMs);
      let preferredTone = "gentle";
      let selectionReason = "default_gentle";

      if (policy === "do_not_followup") {
        preferredTone = "quiet";
        selectionReason = "policy_quiet";
      } else if (policy === "light_question" || reason.includes("question")) {
        preferredTone = "curious";
        selectionReason = "question_context";
      } else if (policy === "soft_checkin") {
        preferredTone = "soft";
        selectionReason = "soft_checkin_policy";
      } else if (Number.isFinite(updatedAgeMs) && updatedAgeMs >= 10 * 60 * 1000) {
        preferredTone = "soft";
        selectionReason = "long_silence_soften";
      }

      let index = candidates.findIndex((item) => String(item.tone || "") === preferredTone);
      if (index < 0) {
        index = 0;
        selectionReason = selectionReason + "_fallback_first";
      }

      return {
        candidate: candidates[index],
        index,
        reason: selectionReason,
        preferredTone,
        candidateCount: candidates.length
      };
    }

    function buildConversationFollowupDebugPlan(nowMs = Date.now()) {
      const now = Number(nowMs);
      const safeNow = Number.isFinite(now) ? now : Date.now();
      const conversationMode = state.conversationMode && typeof state.conversationMode === "object"
        ? state.conversationMode
        : {};
      const conversationEnabled = conversationMode.enabled === true;
      const proactiveEnabled = conversationMode.proactiveEnabled === true;
      const silenceFollowupMinMs = Number.isFinite(Number(conversationMode.silenceFollowupMinMs))
        ? Math.max(0, Math.round(Number(conversationMode.silenceFollowupMinMs)))
        : 180000;
      const followupPending = state.followupPending === true;
      const topicHint = String(state.followupTopicHint || "").trim();
      const reason = String(state.followupReason || "").trim();
      const followupUpdatedAt = Number(state.followupUpdatedAt || 0);
      const updatedAgeMs = followupUpdatedAt > 0
        ? Math.max(0, Math.round(safeNow - followupUpdatedAt))
        : -1;
      const policy = buildConversationFollowupPolicy({ reason, topicHint, updatedAgeMs });
      const characterCue = buildConversationFollowupCharacterCue({
        reason,
        topicHint,
        followupPolicy: policy.type,
        updatedAgeMs
      });
      const reactionCandidates = buildConversationFollowupReactionCandidates({
        reason,
        topicHint,
        followupPolicy: policy.type,
        updatedAgeMs
      });
      const selectedReaction = selectConversationFollowupReactionCandidate({
        reason,
        topicHint,
        followupPolicy: policy.type,
        updatedAgeMs
      }, reactionCandidates);
      const characterPreview = selectedReaction.candidate?.text || "";

      const blockedReasons = [];
      if (!conversationEnabled) {
        blockedReasons.push("conversation_disabled");
      }
      if (!proactiveEnabled) {
        blockedReasons.push("proactive_disabled");
      }
      if (!followupPending) {
        blockedReasons.push("no_pending_followup");
      }
      if (!topicHint) {
        blockedReasons.push("empty_topic_hint");
      }
      if (state.chatBusy) {
        blockedReasons.push("chat_busy");
      }
      if (isSpeakingNow()) {
        blockedReasons.push("speaking");
      }
      if (updatedAgeMs < 0 || updatedAgeMs < silenceFollowupMinMs) {
        blockedReasons.push("silence_window_not_reached");
      }
      if (policy.type === "do_not_followup") {
        blockedReasons.push(policy.blockedReason || "policy_do_not_followup");
      }

      return {
        eligible: blockedReasons.length === 0,
        reason,
        topicHint,
        followupPolicy: policy.type,
        followupPolicyNote: policy.note,
        characterCue,
        characterPreview,
        reactionCandidates,
        selectedReaction,
        updatedAgeMs,
        conversationEnabled,
        proactiveEnabled,
        silenceFollowupMinMs,
        blockedReasons
      };
    }

    function buildConversationFollowupDebugView(nowMs = Date.now()) {
      const plan = buildConversationFollowupDebugPlan(nowMs);
      return {
        ...plan,
        promptDraft: buildConversationFollowupPromptDraft(plan),
        characterCue: plan.characterCue || buildConversationFollowupCharacterCue(plan),
        silence: buildConversationSilenceDebugSnapshot(nowMs)
      };
    }

    function buildConversationFollowupPromptDraft(plan) {
      const safePlan = plan && typeof plan === "object" ? plan : {};
      if (safePlan.eligible !== true) {
        return "";
      }
      const reason = String(safePlan.reason || "").trim() || "followup_pending";
      const policy = String(safePlan.followupPolicy || "gentle_continue").trim() || "gentle_continue";
      const cue = safePlan.characterCue && typeof safePlan.characterCue === "object"
        ? safePlan.characterCue
        : buildConversationFollowupCharacterCue(safePlan);
      let topicHint = String(safePlan.topicHint || "").replace(/\s+/g, " ").trim();
      if (!topicHint) {
        return "";
      }
      if (topicHint.length > 80) {
        topicHint = topicHint.slice(0, 80).trim();
      }
      const policyInstruction = {
        gentle_continue: "策略：轻轻续一句，不重开新话题，不扩大问题范围。",
        light_question: "策略：如果追问，只能追一个很轻的小问题；也可以改成一句自然承接。",
        soft_checkin: "策略：强调“想聊再聊也可以”，不要催促用户继续。"
      }[policy] || "策略：轻轻续一句，不重开新话题，不扩大问题范围。";
      return [
        "你正在生成一次低打扰的主动续话，不是系统通知。",
        "请基于上一轮未收口的话题，用自然、温和的角色口吻仅输出一句可忽略的续话或轻追问。",
        "角色方向：像住在桌面边上的小伙伴，轻轻冒泡，有一点性格，但不要夸张表演。",
        `语气建议: ${cue.tone || "温和、短句、低压力"}`,
        `情绪建议: emotion=${cue.emotion || "thinking"}, action=${cue.action || "think"}, intensity=${cue.intensity || "low"}, voice_style=${cue.voiceStyle || "soft"}`,
        `参考感觉: ${cue.sample || "我刚才还在想那个点，要不要轻轻接一下？"}`,
        policyInstruction,
        "保持简短，不要催促用户立刻回复，不要连续追问，不要长篇解释。",
        "安全边界：不要读取或猜测桌面、屏幕、文件、隐私数据；不要调用工具。",
        "如果 character_runtime 要求返回元信息，只能使用允许字段 emotion/action/intensity/voice_style/live2d_hint，并把正文保持为自然中文。",
        `角色线索: ${cue.persona || "低打扰陪伴型角色"}`,
        `续话策略: ${policy}`,
        `续话原因: ${reason}`,
        `话题线索: ${topicHint}`
      ].join("\n");
    }

    function previewConversationFollowupPolicy(input = {}) {
      const safeInput = input && typeof input === "object" ? input : {};
      const reason = String(safeInput.reason || "followup_pending").trim() || "followup_pending";
      const topicHint = String(safeInput.topicHint || safeInput.text || "").replace(/\s+/g, " ").trim();
      const policy = buildConversationFollowupPolicy({ reason, topicHint });
      const characterCue = buildConversationFollowupCharacterCue({
        reason,
        topicHint,
        followupPolicy: policy.type,
        updatedAgeMs: 0
      });
      const reactionCandidates = buildConversationFollowupReactionCandidates({
        reason,
        topicHint,
        followupPolicy: policy.type,
        updatedAgeMs: 0
      });
      const selectedReaction = selectConversationFollowupReactionCandidate({
        reason,
        topicHint,
        followupPolicy: policy.type,
        updatedAgeMs: 0
      }, reactionCandidates);
      const characterPreview = selectedReaction.candidate?.text || "";
      const blockedReasons = [];
      if (!topicHint) {
        blockedReasons.push("empty_topic_hint");
      }
      if (policy.type === "do_not_followup") {
        blockedReasons.push(policy.blockedReason || "policy_do_not_followup");
      }
      const plan = {
        eligible: blockedReasons.length === 0,
        reason,
        topicHint,
        followupPolicy: policy.type,
        followupPolicyNote: policy.note,
        characterCue,
        characterPreview,
        reactionCandidates,
        selectedReaction,
        updatedAgeMs: 0,
        conversationEnabled: true,
        proactiveEnabled: true,
        silenceFollowupMinMs: 0,
        blockedReasons
      };
      return {
        ...plan,
        promptDraft: buildConversationFollowupPromptDraft(plan)
      };
    }

    function getConversationFollowupPolicyDebugText(view) {
      const policy = String(view?.followupPolicy || "").trim();
      const topicHint = String(view?.topicHint || "").trim();
      if (!policy || !topicHint) {
        return "";
      }
      if (policy === "do_not_followup") {
        return "do_not_followup:policy_do_not_followup";
      }
      const blockedReason = String(view?.followupPolicy === "do_not_followup"
        ? (view?.followupPolicyNote || "policy_do_not_followup")
        : (view?.followupPolicyNote || "")
      ).trim();
      return blockedReason ? `${policy}:${blockedReason}` : policy;
    }

    function snapshotConversationFollowupPending() {
      return {
        pending: state.followupPending === true,
        reason: String(state.followupReason || ""),
        topicHint: String(state.followupTopicHint || ""),
        updatedAt: Number(state.followupUpdatedAt || 0)
      };
    }

    function restoreConversationFollowupPending(snapshot) {
      const safe = snapshot && typeof snapshot === "object" ? snapshot : {};
      state.followupPending = safe.pending === true;
      state.followupReason = String(safe.reason || "");
      state.followupTopicHint = String(safe.topicHint || "");
      state.followupUpdatedAt = Number.isFinite(Number(safe.updatedAt))
        ? Math.max(0, Math.round(Number(safe.updatedAt)))
        : 0;
    }

    function clearConversationFollowupPending(nowMs = Date.now()) {
      const now = Number(nowMs);
      state.followupPending = false;
      state.followupReason = "";
      state.followupTopicHint = "";
      state.followupUpdatedAt = Number.isFinite(now) ? Math.max(0, Math.round(now)) : 0;
    }

    function getConversationFollowupRehearsalBlockedReason() {
      const mode = state.conversationMode && typeof state.conversationMode === "object"
        ? state.conversationMode
        : {};
      if (state.proactivePollTimerId) {
        return "polling_active";
      }
      if (mode.enabled === true && mode.proactiveEnabled === true && mode.proactiveSchedulerEnabled === true) {
        return "auto_scheduler_enabled";
      }
      return "";
    }

    function rehearseConversationFollowupPending(input = {}) {
      const blockedReason = getConversationFollowupRehearsalBlockedReason();
      if (blockedReason) {
        recordTTSDebugEvent("conversation_followup_rehearsal_blocked", {
          text: "",
          result: blockedReason,
          error: "fail_closed"
        });
        return {
          ok: false,
          reason: blockedReason,
          followup: buildConversationFollowupDebugView(Date.now())
        };
      }

      const safeInput = input && typeof input === "object" ? input : {};
      const reason = String(safeInput.reason || "followup_pending").trim() || "followup_pending";
      const topicHint = String(
        safeInput.topicHint || safeInput.text || "我们刚才聊到桌宠主动续话"
      ).replace(/\s+/g, " ").trim();
      if (!topicHint) {
        return {
          ok: false,
          reason: "empty_topic_hint",
          followup: buildConversationFollowupDebugView(Date.now())
        };
      }

      if (state.followupRehearsalActive !== true) {
        state.followupRehearsalSnapshot = snapshotConversationFollowupPending();
      }
      state.followupRehearsalActive = true;
      state.followupPending = true;
      state.followupReason = reason;
      state.followupTopicHint = topicHint;
      state.followupUpdatedAt = Date.now();

      updateFollowupCharacterChip();
      const followup = buildConversationFollowupDebugView(Date.now());
      recordTTSDebugEvent("conversation_followup_rehearsal_set", {
        text: topicHint,
        result: reason,
        error: followup.followupPolicy || ""
      });
      return {
        ok: true,
        reason: "rehearsal_set",
        followup,
        characterState: getFollowupCharacterStateDebugView()
      };
    }

    function clearConversationFollowupRehearsal() {
      if (state.followupRehearsalActive !== true) {
        return {
          ok: true,
          reason: "no_active_rehearsal",
          followup: buildConversationFollowupDebugView(Date.now())
        };
      }
      const snapshot = state.followupRehearsalSnapshot || { pending: false, reason: "", topicHint: "", updatedAt: 0 };
      restoreConversationFollowupPending(snapshot);
      state.followupRehearsalActive = false;
      state.followupRehearsalSnapshot = null;
      state.followupRehearsalScenarioId = "";
      updateFollowupCharacterChip();
      recordTTSDebugEvent("conversation_followup_rehearsal_cleared", {
        text: String(snapshot.topicHint || ""),
        result: "restored"
      });
      return {
        ok: true,
        reason: "rehearsal_cleared",
        followup: buildConversationFollowupDebugView(Date.now()),
        characterState: getFollowupCharacterStateDebugView()
      };
    }

    const FOLLOWUP_REHEARSAL_SCENARIOS = [
      {
        id: "curious_question",
        label: "\u597d\u5947\u8ffd\u95ee",
        reason: "question_tail",
        topicHint: "\u6211\u4eec\u521a\u624d\u804a\u5230\u684c\u5ba0\u4e3b\u52a8\u7eed\u8bdd"
      },
      {
        id: "soft_checkin",
        label: "\u6e29\u67d4\u63a5\u8bdd",
        reason: "soft_checkin",
        topicHint: "\u6211\u4eec\u521a\u624d\u804a\u5230\u8ba9\u89d2\u8272\u66f4\u50cf\u966a\u4f34"
      },
      {
        id: "quiet_close",
        label: "\u6536\u53e3\u5b89\u9759",
        reason: "followup_pending",
        topicHint: "\u5148\u8fd9\u6837\uff0c\u665a\u5b89"
      }
    ];

    function getFollowupRehearsalScenario(id = "") {
      const key = String(id || "").trim();
      return FOLLOWUP_REHEARSAL_SCENARIOS.find((item) => item.id === key) || FOLLOWUP_REHEARSAL_SCENARIOS[0];
    }

    function getFollowupRehearsalScenarioLabel(id = "") {
      const key = String(id || "").trim();
      const scenario = FOLLOWUP_REHEARSAL_SCENARIOS.find((item) => item.id === key);
      return scenario ? scenario.label : "";
    }

    function runFollowupReadinessPanelRehearsal(button = null, scenarioId = "") {
      const scenario = getFollowupRehearsalScenario(scenarioId);
      const result = rehearseConversationFollowupPending(scenario);
      if (result?.ok === true) {
        state.followupRehearsalScenarioId = scenario.id;
      }
      updateFollowupReadinessPanel();
      const ok = result?.ok === true;
      setStatus(ok ? `\u7eed\u8bdd\u9884\u6f14\u5df2\u5f00\u542f: ${scenario.label}` : `\u7eed\u8bdd\u9884\u6f14\u5df2\u963b\u6b62: ${result?.reason || "unknown"}`);
      if (button && typeof window !== "undefined") {
        const previous = button.textContent;
        button.textContent = ok ? "\u9884\u6f14\u4e2d" : "\u5df2\u963b\u6b62";
        window.setTimeout(() => {
          button.textContent = previous || scenario.label || "\u9884\u6f14";
        }, 1200);
      }
      return result;
    }

    function clearFollowupReadinessPanelRehearsal(button = null) {
      const result = clearConversationFollowupRehearsal();
      updateFollowupReadinessPanel();
      setStatus("\u7eed\u8bdd\u9884\u6f14\u5df2\u6e05\u9664");
      if (button && typeof window !== "undefined") {
        const previous = button.textContent;
        button.textContent = "\u5df2\u6e05\u9664";
        window.setTimeout(() => {
          button.textContent = previous || "\u6e05\u9664\u9884\u6f14";
        }, 1200);
      }
      return result;
    }

    function snapshotConversationFollowupPendingFixtureState() {
      const mode = state.conversationMode && typeof state.conversationMode === "object"
        ? { ...state.conversationMode }
        : null;
      return {
        pending: snapshotConversationFollowupPending(),
        conversationMode: mode,
        conversationLastUserAt: Number(state.conversationLastUserAt || 0),
        conversationLastAssistantAt: Number(state.conversationLastAssistantAt || 0),
        conversationLastTtsFinishedAt: Number(state.conversationLastTtsFinishedAt || 0)
      };
    }

    function restoreConversationFollowupPendingFixtureState(snapshot) {
      const safe = snapshot && typeof snapshot === "object" ? snapshot : {};
      restoreConversationFollowupPending(safe.pending);
      if (safe.conversationMode && typeof safe.conversationMode === "object") {
        state.conversationMode = { ...safe.conversationMode };
      }
      state.conversationLastUserAt = Number.isFinite(Number(safe.conversationLastUserAt))
        ? Math.max(0, Math.round(Number(safe.conversationLastUserAt)))
        : 0;
      state.conversationLastAssistantAt = Number.isFinite(Number(safe.conversationLastAssistantAt))
        ? Math.max(0, Math.round(Number(safe.conversationLastAssistantAt)))
        : 0;
      state.conversationLastTtsFinishedAt = Number.isFinite(Number(safe.conversationLastTtsFinishedAt))
        ? Math.max(0, Math.round(Number(safe.conversationLastTtsFinishedAt)))
        : 0;
    }

    function runConversationFollowupPendingFixture(input = {}) {
      const startedAt = Date.now();
      const previous = snapshotConversationFollowupPendingFixtureState();
      const safeInput = input && typeof input === "object" ? input : {};
      const reason = String(safeInput.reason || "followup_pending").trim() || "followup_pending";
      const topicHint = String(
        safeInput.topicHint || safeInput.text || "\u5148\u8fd9\u6837\uff0c\u665a\u5b89"
      ).replace(/\s+/g, " ").trim();
      let result = null;

      try {
        if (!state.conversationMode || typeof state.conversationMode !== "object") {
          state.conversationMode = {
            enabled: false,
            proactiveEnabled: false,
            proactiveSchedulerEnabled: false,
            grayAutoEnabled: false,
            grayAutoTrialEnabled: false,
            grayAutoTrialMaxTriggersPerSession: 1,
            proactiveCooldownMs: 600000,
            proactiveWarmupMs: 120000,
            proactiveWindowMs: 3600000,
            proactivePollIntervalMs: 60000,
            maxFollowupsPerWindow: 1,
            silenceFollowupMinMs: 180000,
            interruptTtsOnUserSpeech: true
          };
        }
        const silenceFollowupMinMs = Number.isFinite(Number(state.conversationMode.silenceFollowupMinMs))
          ? Math.max(0, Math.round(Number(state.conversationMode.silenceFollowupMinMs)))
          : 180000;
        const oldEnoughAt = Math.max(0, startedAt - Math.max(silenceFollowupMinMs + 1000, 30000));

        state.conversationMode.enabled = true;
        state.conversationMode.proactiveEnabled = true;
        state.conversationMode.proactiveSchedulerEnabled = true;
        state.followupPending = true;
        state.followupReason = reason;
        state.followupTopicHint = topicHint;
        state.followupUpdatedAt = oldEnoughAt;
        state.conversationLastUserAt = oldEnoughAt;
        state.conversationLastAssistantAt = oldEnoughAt;
        state.conversationLastTtsFinishedAt = oldEnoughAt;

        const preview = previewConversationFollowupPolicy({ reason, topicHint });
        const snapshotFollowup = getTTSDebugSnapshot().followup;
        const conversationFollowup = buildConversationFollowupDebugView(startedAt);
        const proactiveScheduler = buildProactiveSchedulerDebugSnapshot(startedAt);
        const policyText = getConversationFollowupPolicyDebugText(conversationFollowup);
        const silenceBlockedReasons = Array.isArray(conversationFollowup?.silence?.blockedReasons)
          ? conversationFollowup.silence.blockedReasons.slice()
          : [];

        recordTTSDebugEvent("conversation_followup_pending_fixture_checked", {
          text: topicHint,
          result: silenceBlockedReasons.join(",") || "silence_checked",
          error: policyText || reason
        });

        result = {
          ok: true,
          fixture: {
            reason,
            topicHint,
            silenceAgeMs: Math.max(0, startedAt - oldEnoughAt),
            temporaryGatesEnabled: true
          },
          preview: {
            followupPolicy: preview.followupPolicy,
            eligible: preview.eligible,
            blockedReasons: Array.isArray(preview.blockedReasons) ? preview.blockedReasons.slice() : [],
            promptDraftEmpty: !String(preview.promptDraft || "").trim()
          },
          snapshotFollowup: {
            pending: snapshotFollowup.pending,
            eligible: snapshotFollowup.eligible,
            blockedReasons: Array.isArray(snapshotFollowup.blockedReasons)
              ? snapshotFollowup.blockedReasons.slice()
              : [],
            policy: snapshotFollowup.policy,
            policyBlockedReason: snapshotFollowup.policyBlockedReason
          },
          conversationFollowup: {
            eligible: conversationFollowup.eligible,
            blockedReasons: Array.isArray(conversationFollowup.blockedReasons)
              ? conversationFollowup.blockedReasons.slice()
              : [],
            followupPolicy: conversationFollowup.followupPolicy,
            promptDraftEmpty: !String(conversationFollowup.promptDraft || "").trim(),
            silence: {
              eligibleForSilenceFollowup: conversationFollowup.silence?.eligibleForSilenceFollowup,
              blockedReasons: silenceBlockedReasons,
              followupPolicy: conversationFollowup.silence?.followupPolicy
            }
          },
          proactiveScheduler: {
            eligibleForSchedulerTick: proactiveScheduler.eligibleForSchedulerTick,
            blockedReasons: Array.isArray(proactiveScheduler.blockedReasons)
              ? proactiveScheduler.blockedReasons.slice()
              : [],
            pollTimerActive: proactiveScheduler.pollTimerActive,
            lastResult: proactiveScheduler.lastResult
          }
        };
      } catch (err) {
        const errorText = String(err?.message || err || "fixture_error");
        recordTTSDebugEvent("conversation_followup_pending_fixture_failed", {
          text: topicHint,
          result: "fixture_error",
          error: errorText
        });
        result = {
          ok: false,
          reason: "fixture_error",
          error: errorText
        };
      } finally {
        restoreConversationFollowupPendingFixtureState(previous);
      }

      const endedAt = Date.now();
      return {
        ...result,
        restored: true,
        afterRestore: {
          pending: state.followupPending === true,
          reason: String(state.followupReason || ""),
          topicHint: String(state.followupTopicHint || ""),
          conversationEnabled: state.conversationMode?.enabled === true,
          proactiveEnabled: state.conversationMode?.proactiveEnabled === true,
          proactiveSchedulerEnabled: state.conversationMode?.proactiveSchedulerEnabled === true
        },
        recentEvents: state.ttsDebugEvents.slice(-30).map((event) => ({
          type: event.type,
          text: event.text,
          result: event.result,
          error: event.error
        })),
        startedAt,
        endedAt,
        elapsedMs: Math.max(0, endedAt - startedAt)
      };
    }

    async function runConversationFollowupDebug() {
      const startedAt = Date.now();
      const plan = buildConversationFollowupDebugView(startedAt);
      const blockedSummary = Array.isArray(plan.blockedReasons) ? plan.blockedReasons.join(",") : "";
      const reasonText = String(plan.reason || "");
      const topicHintText = String(plan.topicHint || "");
      const policyText = getConversationFollowupPolicyDebugText(plan);
      const finishResult = (result) => {
        const endedAt = Date.now();
        return {
          ...result,
          plan,
          startedAt,
          endedAt,
          elapsedMs: Math.max(0, endedAt - startedAt)
        };
      };

      if (!plan.eligible || !plan.promptDraft) {
        recordTTSDebugEvent("conversation_followup_not_eligible", {
          text: topicHintText,
          result: blockedSummary || "not_eligible",
          error: policyText || reasonText
        });
        return finishResult({
          ok: false,
          reason: "not_eligible",
          consumedPending: false,
          restoredPending: false
        });
      }
      if (typeof requestAssistantReply !== "function") {
        recordTTSDebugEvent("conversation_followup_failed", {
          text: topicHintText,
          result: "no_safe_entrypoint",
          error: policyText || reasonText
        });
        return finishResult({
          ok: false,
          reason: "no_safe_entrypoint",
          consumedPending: false,
          restoredPending: false
        });
      }

      const pendingSnapshot = snapshotConversationFollowupPending();
      recordTTSDebugEvent("conversation_followup_start", {
        text: topicHintText,
        result: reasonText || "followup_pending",
        error: policyText
      });
      clearConversationFollowupPending(startedAt);
      const followupInput = `（debug/manual follow-up）\n${plan.promptDraft}`;
      try {
        const ok = await requestAssistantReply(followupInput, {
          showUser: false,
          rememberUser: false,
          rememberAssistant: true,
          auto: true,
          skipDesktopAttach: true,
          silentError: true,
          userDisplayText: "[debug/manual follow-up]"
        });

        if (ok) {
          recordTTSDebugEvent("conversation_followup_success", {
            text: topicHintText,
            result: reasonText || "followup_pending",
            error: policyText
          });
          return finishResult({
            ok: true,
            reason: "started",
            consumedPending: true,
            restoredPending: false
          });
        }

        restoreConversationFollowupPending(pendingSnapshot);
        recordTTSDebugEvent("conversation_followup_restore_pending", {
          text: sanitizeTTSDebugText(pendingSnapshot.topicHint || topicHintText),
          result: pendingSnapshot.reason || reasonText || "restore"
        });
        recordTTSDebugEvent("conversation_followup_failed", {
          text: topicHintText,
          result: "request_failed",
          error: policyText || reasonText
        });
        return finishResult({
          ok: false,
          reason: "request_failed",
          consumedPending: false,
          restoredPending: true
        });
      } catch (err) {
        restoreConversationFollowupPending(pendingSnapshot);
        const errorText = String(err?.message || err || "request_exception");
        recordTTSDebugEvent("conversation_followup_restore_pending", {
          text: sanitizeTTSDebugText(pendingSnapshot.topicHint || topicHintText),
          result: pendingSnapshot.reason || reasonText || "restore"
        });
        recordTTSDebugEvent("conversation_followup_failed", {
          text: topicHintText,
          result: "request_exception",
          error: policyText ? `${policyText};${errorText}` : errorText
        });
        return finishResult({
          ok: false,
          reason: "request_exception",
          consumedPending: false,
          restoredPending: true
        });
      }
    }

    async function runConversationSilenceFollowupDryRun() {
      const startedAt = Date.now();
      const view = buildConversationFollowupDebugView(startedAt);
      if (view?.silence?.eligibleForSilenceFollowup !== true) {
        const endedAt = Date.now();
        recordTTSDebugEvent("conversation_silence_followup_blocked", {
          text: String(view?.topicHint || ""),
          result: Array.isArray(view?.silence?.blockedReasons)
            ? view.silence.blockedReasons.join(",")
            : "silence_not_eligible",
          error: getConversationFollowupPolicyDebugText(view) || String(view?.reason || "")
        });
        return {
          ok: false,
          reason: "silence_not_eligible",
          view,
          startedAt,
          endedAt,
          elapsedMs: Math.max(0, endedAt - startedAt)
        };
      }

      recordTTSDebugEvent("conversation_silence_followup_manual_start", {
        text: String(view?.topicHint || ""),
        result: String(view?.reason || "silence_eligible"),
        error: getConversationFollowupPolicyDebugText(view)
      });
      const result = await runConversationFollowupDebug();
      return {
        ...result,
        silenceDryRun: true,
        silenceEligibleAtStart: true,
        silenceStartedAt: startedAt
      };
    }

    async function runProactiveSchedulerManualTick() {
      const startedAt = Date.now();
      const scheduler = buildProactiveSchedulerDebugSnapshot(startedAt);
      state.proactiveLastAttemptAt = startedAt;
      const finishResult = (result) => {
        const endedAt = Date.now();
        return {
          ...result,
          schedulerManualTick: true,
          schedulerStartedAt: startedAt,
          scheduler,
          startedAt,
          endedAt,
          elapsedMs: Math.max(0, endedAt - startedAt)
        };
      };

      if (scheduler.eligibleForSchedulerTick !== true) {
        const blockedReason = Array.isArray(scheduler.blockedReasons) && scheduler.blockedReasons.length
          ? scheduler.blockedReasons.join(",")
          : "scheduler_not_eligible";
        state.proactiveLastBlockedReason = blockedReason;
        state.proactiveLastResult = "blocked";
        recordTTSDebugEvent("proactive_scheduler_manual_blocked", {
          result: blockedReason
        });
        return finishResult({
          ok: false,
          reason: "scheduler_not_eligible",
          schedulerEligibleAtStart: false
        });
      }

      recordTTSDebugEvent("proactive_scheduler_manual_start", {
        result: "scheduler_eligible"
      });
      state.proactiveInFlight = true;
      try {
        const dryRunResult = await runConversationSilenceFollowupDryRun();
        const finishedAt = Date.now();
        const proactiveCooldownMs = Number.isFinite(Number(state.conversationMode?.proactiveCooldownMs))
          ? Math.max(0, Math.round(Number(state.conversationMode.proactiveCooldownMs)))
          : 600000;
        const proactiveWindowMs = Number.isFinite(Number(state.conversationMode?.proactiveWindowMs))
          ? Math.max(0, Math.round(Number(state.conversationMode.proactiveWindowMs)))
          : 3600000;

        if (dryRunResult?.ok === true) {
          const windowStart = Number(state.proactiveWindowStartedAt || 0);
          if (!(windowStart > 0) || (finishedAt - windowStart) > proactiveWindowMs) {
            state.proactiveWindowStartedAt = finishedAt;
            state.proactiveCountInWindow = 0;
          }
          state.proactiveLastTriggeredAt = finishedAt;
          state.proactiveCooldownUntil = finishedAt + proactiveCooldownMs;
          state.proactiveCountInWindow = Math.max(
            0,
            Math.round(Number(state.proactiveCountInWindow || 0))
          ) + 1;
          state.proactiveLastBlockedReason = "";
          state.proactiveLastResult = "success";
          recordTTSDebugEvent("proactive_scheduler_manual_success", {
            result: "success",
            durationMs: Number(dryRunResult?.elapsedMs || 0)
          });
          return finishResult({
            ...dryRunResult,
            ok: true,
            schedulerEligibleAtStart: true
          });
        }

        const silenceBlockedReasons = Array.isArray(dryRunResult?.view?.silence?.blockedReasons)
          ? dryRunResult.view.silence.blockedReasons.join(",")
          : "";
        const blockedReason = String(dryRunResult?.reason || silenceBlockedReasons || "manual_tick_failed");
        state.proactiveLastBlockedReason = blockedReason;
        const failedReasons = new Set(["request_failed", "request_exception", "no_safe_entrypoint"]);
        state.proactiveLastResult = failedReasons.has(String(dryRunResult?.reason || "")) ? "failed" : "blocked";
        const shortCooldownMs = Math.min(proactiveCooldownMs, 60000);
        state.proactiveCooldownUntil = finishedAt + shortCooldownMs;
        recordTTSDebugEvent("proactive_scheduler_manual_failed", {
          result: blockedReason,
          error: String(dryRunResult?.reason || "")
        });
        return finishResult({
          ...dryRunResult,
          ok: false,
          schedulerEligibleAtStart: true
        });
      } catch (err) {
        const finishedAt = Date.now();
        const proactiveCooldownMs = Number.isFinite(Number(state.conversationMode?.proactiveCooldownMs))
          ? Math.max(0, Math.round(Number(state.conversationMode.proactiveCooldownMs)))
          : 600000;
        const shortCooldownMs = Math.min(proactiveCooldownMs, 60000);
        const errorText = String(err?.message || err || "manual_tick_exception");
        state.proactiveLastBlockedReason = errorText;
        state.proactiveLastResult = "failed";
        state.proactiveCooldownUntil = finishedAt + shortCooldownMs;
        recordTTSDebugEvent("proactive_scheduler_manual_failed", {
          result: "exception",
          error: errorText
        });
        return finishResult({
          ok: false,
          reason: "manual_tick_exception",
          error: errorText,
          schedulerEligibleAtStart: true
        });
      } finally {
        state.proactiveInFlight = false;
      }
    }

    async function runProactiveSchedulerPollingCheck() {
      try {
        const injectedFailure = consumeProactiveSchedulerPollFailureInjection();
        if (injectedFailure) {
          throw new Error(injectedFailure.reason || "manual_debug_injection");
        }
        const gateStatus = getProactiveSchedulerPollingGateStatus();
        const gateTrialContext = buildGrayAutoFollowupTrialEventContext();
        if (!gateStatus.enabled) {
          const gateReason = gateStatus.blockedReasons.join(",") || "polling_disabled";
          state.proactivePollLastResult = "disabled";
          if (state.proactivePollTimerId) {
            stopProactiveSchedulerPolling(`runtime_gate_off:${gateReason}`);
          }
          recordTTSDebugEvent("proactive_scheduler_poll_blocked", {
            result: mergeProactiveSchedulerPollEventResult(gateReason, gateTrialContext),
            error: mergeProactiveSchedulerPollEventError("", gateTrialContext)
          });
          return;
        }
        const startedAt = Date.now();
        state.proactiveLastPollAt = startedAt;
        const scheduler = buildProactiveSchedulerDebugSnapshot(startedAt);
        const pollTrialContext = buildGrayAutoFollowupTrialEventContext(getTTSDebugSnapshot());
        const followupView = buildConversationFollowupDebugView(startedAt);
        const followupPolicyText = getConversationFollowupPolicyDebugText(followupView);
        if (scheduler.eligibleForSchedulerTick !== true) {
          state.proactivePollLastResult = "blocked";
          recordTTSDebugEvent("proactive_scheduler_poll_blocked", {
            text: String(followupView?.topicHint || ""),
            result: mergeProactiveSchedulerPollEventResult(
              Array.isArray(scheduler.blockedReasons) && scheduler.blockedReasons.length
                ? scheduler.blockedReasons.join(",")
                : "poll_blocked",
              pollTrialContext
            ),
            error: mergeProactiveSchedulerPollEventError(followupPolicyText, pollTrialContext)
          });
          return;
        }
        const silenceBlocked = Array.isArray(followupView?.silence?.blockedReasons)
          ? followupView.silence.blockedReasons.join(",")
          : "";
        if (followupView?.silence?.eligibleForSilenceFollowup !== true) {
          state.proactivePollLastResult = "not_ready";
          recordTTSDebugEvent("proactive_scheduler_poll_blocked", {
            text: String(followupView?.topicHint || ""),
            result: mergeProactiveSchedulerPollEventResult(silenceBlocked || "silence_not_ready", pollTrialContext),
            error: mergeProactiveSchedulerPollEventError(followupPolicyText, pollTrialContext)
          });
          return;
        }
        state.proactivePollLastResult = "ready";
        recordTTSDebugEvent("proactive_scheduler_poll_ready", {
          text: String(followupView?.topicHint || ""),
          result: mergeProactiveSchedulerPollEventResult("silence_ready", pollTrialContext),
          error: mergeProactiveSchedulerPollEventError(followupPolicyText, pollTrialContext)
        });
        if (!shouldEnableProactiveSchedulerPolling()) {
          state.proactivePollLastResult = "disabled";
          if (state.proactivePollTimerId) {
            stopProactiveSchedulerPolling("runtime_gate_off:before_trigger");
          }
          recordTTSDebugEvent("proactive_scheduler_poll_blocked", {
            text: String(followupView?.topicHint || ""),
            result: mergeProactiveSchedulerPollEventResult("runtime_gate_off_before_trigger", pollTrialContext),
            error: mergeProactiveSchedulerPollEventError(followupPolicyText, pollTrialContext)
          });
          return;
        }
        const triggerResult = await runProactiveSchedulerManualTick();
        if (triggerResult?.ok === true) {
          incrementGrayAutoTrialSessionTriggerCount();
          state.proactivePollLastResult = "triggered";
          const postTriggerTrialContext = buildGrayAutoFollowupTrialEventContext(getTTSDebugSnapshot());
          recordTTSDebugEvent("proactive_scheduler_poll_trigger_success", {
            text: String(followupView?.topicHint || ""),
            result: mergeProactiveSchedulerPollEventResult(String(triggerResult?.reason || "started"), postTriggerTrialContext),
            error: mergeProactiveSchedulerPollEventError(followupPolicyText, postTriggerTrialContext)
          });
          if (isGrayAutoTrialSessionLimitReached()) {
            stopProactiveSchedulerPolling("gray_auto_trial_session_limit_reached");
          }
          return;
        }
        state.proactivePollLastResult = "trigger_blocked";
        recordTTSDebugEvent("proactive_scheduler_poll_trigger_blocked", {
          text: String(followupView?.topicHint || ""),
          result: mergeProactiveSchedulerPollEventResult(String(triggerResult?.reason || "trigger_not_started"), pollTrialContext),
          error: mergeProactiveSchedulerPollEventError(followupPolicyText, pollTrialContext)
        });
      } catch (err) {
        state.proactivePollLastResult = "failed";
        if (state.proactivePollTimerId) {
          stopProactiveSchedulerPolling("poll_exception_fail_closed");
        }
        state.proactivePollLastResult = "failed";
        const failureTrialContext = buildGrayAutoFollowupTrialEventContext();
        recordTTSDebugEvent("proactive_scheduler_poll_failed", {
          result: mergeProactiveSchedulerPollEventResult("poll_exception", failureTrialContext),
          error: mergeProactiveSchedulerPollEventError(String(err?.message || err || "poll_exception"), failureTrialContext)
        });
      }
    }

    function normalizeProactiveSchedulerPollFailureReason(reason) {
      const text = String(reason || "manual_debug_injection")
        .replace(/[\r\n\t]+/g, " ")
        .trim()
        .slice(0, 80);
      return text || "manual_debug_injection";
    }

    function injectProactiveSchedulerPollFailureOnce(reason = "manual_debug_injection") {
      const normalizedReason = normalizeProactiveSchedulerPollFailureReason(reason);
      state.proactivePollFailureInjection = {
        reason: normalizedReason,
        createdAt: Date.now()
      };
      recordTTSDebugEvent("proactive_scheduler_poll_failure_injected", {
        result: normalizedReason
      });
      return getProactiveSchedulerFailureInjectionState();
    }

    function getProactiveSchedulerFailureInjectionState() {
      const injection = state.proactivePollFailureInjection;
      if (!injection || typeof injection !== "object") {
        return {
          active: false,
          reason: "",
          ageMs: -1
        };
      }
      const createdAt = Number(injection.createdAt || 0);
      return {
        active: true,
        reason: String(injection.reason || "manual_debug_injection"),
        ageMs: createdAt > 0 ? Math.max(0, Date.now() - createdAt) : -1
      };
    }

    function clearProactiveSchedulerFailureInjection() {
      const previous = getProactiveSchedulerFailureInjectionState();
      state.proactivePollFailureInjection = null;
      recordTTSDebugEvent("proactive_scheduler_poll_failure_injection_cleared", {
        result: previous.active ? previous.reason : "none"
      });
      return getProactiveSchedulerFailureInjectionState();
    }

    function consumeProactiveSchedulerPollFailureInjection() {
      const injection = state.proactivePollFailureInjection;
      if (!injection || typeof injection !== "object") {
        return null;
      }
      state.proactivePollFailureInjection = null;
      const consumed = {
        reason: normalizeProactiveSchedulerPollFailureReason(injection.reason),
        createdAt: Number(injection.createdAt || 0) || 0
      };
      recordTTSDebugEvent("proactive_scheduler_poll_failure_injection_consumed", {
        result: consumed.reason
      });
      return consumed;
    }

    function stopProactiveSchedulerPolling(reason = "stop") {
      const trialContext = buildGrayAutoFollowupTrialEventContext();
      const wasActive = !!state.proactivePollTimerId;
      if (state.proactivePollTimerId) {
        clearInterval(state.proactivePollTimerId);
        state.proactivePollTimerId = 0;
      }
      state.proactivePollActive = false;
      state.proactivePollActiveIntervalMs = 0;
      state.proactivePollLastResult = "disabled";
      if (wasActive || String(reason || "") === "beforeunload") {
        recordTTSDebugEvent("proactive_scheduler_poll_stop", {
          result: mergeProactiveSchedulerPollEventResult(String(reason || "stop"), trialContext),
          error: mergeProactiveSchedulerPollEventError("", trialContext)
        });
      }
    }

    function startProactiveSchedulerPolling() {
      const gateStatus = getProactiveSchedulerPollingGateStatus();
      const trialContext = buildGrayAutoFollowupTrialEventContext();
      if (!gateStatus.enabled) {
        stopProactiveSchedulerPolling(`gated_off:${gateStatus.blockedReasons.join(",") || "disabled"}`);
        recordTTSDebugEvent("proactive_scheduler_poll_blocked", {
          result: mergeProactiveSchedulerPollEventResult(gateStatus.blockedReasons.join(",") || "polling_disabled", trialContext),
          error: mergeProactiveSchedulerPollEventError("", trialContext)
        });
        return;
      }
      if (state.proactivePollTimerId) {
        return;
      }
      const intervalMs = Number.isFinite(Number(state.conversationMode?.proactivePollIntervalMs))
        ? Math.max(30000, Math.min(600000, Math.round(Number(state.conversationMode.proactivePollIntervalMs))))
        : 60000;
      state.proactivePollTimerId = window.setInterval(() => {
        void runProactiveSchedulerPollingCheck();
      }, intervalMs);
      state.proactivePollActive = true;
      state.proactivePollActiveIntervalMs = intervalMs;
      state.proactivePollLastResult = "started";
      recordTTSDebugEvent("proactive_scheduler_poll_start", {
        result: mergeProactiveSchedulerPollEventResult(`interval_ms:${intervalMs}`, trialContext),
        error: mergeProactiveSchedulerPollEventError("", trialContext)
      });
    }

    function syncProactiveSchedulerPolling() {
      const gateStatus = getProactiveSchedulerPollingGateStatus();
      const trialContext = buildGrayAutoFollowupTrialEventContext();
      if (!gateStatus.enabled) {
        stopProactiveSchedulerPolling(`sync_disabled:${gateStatus.blockedReasons.join(",") || "disabled"}`);
        recordTTSDebugEvent("proactive_scheduler_poll_blocked", {
          result: mergeProactiveSchedulerPollEventResult(gateStatus.blockedReasons.join(",") || "polling_disabled", trialContext),
          error: mergeProactiveSchedulerPollEventError("", trialContext)
        });
        return;
      }
      const desiredIntervalMs = Number.isFinite(Number(state.conversationMode?.proactivePollIntervalMs))
        ? Math.max(30000, Math.min(600000, Math.round(Number(state.conversationMode.proactivePollIntervalMs))))
        : 60000;
      const activeIntervalMs = Number.isFinite(Number(state.proactivePollActiveIntervalMs))
        ? Math.round(Number(state.proactivePollActiveIntervalMs))
        : 0;
      if (state.proactivePollTimerId && activeIntervalMs === desiredIntervalMs) {
        return;
      }
      if (state.proactivePollTimerId) {
        stopProactiveSchedulerPolling("sync_interval_change");
      }
      startProactiveSchedulerPolling();
    }

    function buildTTSDebugReport() {
      return typeof window.TaffyTTSDebugReport?.buildReport === "function"
        ? window.TaffyTTSDebugReport.buildReport(
          getTTSDebugSnapshot(),
          state.ttsDebugEvents,
          performance.now()
        )
        : "TTS debug:\nrecentEvents=none";
    }

    return {
      getGrayAutoTrialMaxTriggersPerSession,
      getGrayAutoTrialSessionTriggerCount,
      isGrayAutoTrialSessionLimitReached,
      incrementGrayAutoTrialSessionTriggerCount,
      buildGrayAutoTrialSessionState,
      resetGrayAutoTrialSessionTriggerCount,
      stopGrayAutoTrialSession,
      armGrayAutoTrialSession,
      disarmGrayAutoTrialSession,
      buildGrayAutoTrialRunbook,
      shouldEnableProactiveSchedulerPolling,
      getProactiveSchedulerPollingGateStatus,
      buildProactiveSchedulerDebugSnapshot,
      getTTSDebugSnapshot,
      buildConversationSilenceDebugSnapshot,
      buildConversationFollowupPolicy,
      buildConversationFollowupCharacterCue,
      buildConversationFollowupReactionCandidates,
      selectConversationFollowupReactionCandidate,
      buildConversationFollowupDebugPlan,
      buildConversationFollowupDebugView,
      buildConversationFollowupPromptDraft,
      previewConversationFollowupPolicy,
      getConversationFollowupPolicyDebugText,
      snapshotConversationFollowupPending,
      restoreConversationFollowupPending,
      clearConversationFollowupPending,
      getConversationFollowupRehearsalBlockedReason,
      rehearseConversationFollowupPending,
      clearConversationFollowupRehearsal,
      getFollowupRehearsalScenario,
      getFollowupRehearsalScenarioLabel,
      runFollowupReadinessPanelRehearsal,
      clearFollowupReadinessPanelRehearsal,
      snapshotConversationFollowupPendingFixtureState,
      restoreConversationFollowupPendingFixtureState,
      runConversationFollowupPendingFixture,
      runConversationFollowupDebug,
      runConversationSilenceFollowupDryRun,
      runProactiveSchedulerManualTick,
      runProactiveSchedulerPollingCheck,
      normalizeProactiveSchedulerPollFailureReason,
      injectProactiveSchedulerPollFailureOnce,
      getProactiveSchedulerFailureInjectionState,
      clearProactiveSchedulerFailureInjection,
      consumeProactiveSchedulerPollFailureInjection,
      stopProactiveSchedulerPolling,
      startProactiveSchedulerPolling,
      syncProactiveSchedulerPolling,
      buildTTSDebugReport
    };
  }

  const api = { createController };
  root.TaffyFollowupDebugController = api;
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof window !== "undefined" ? window : globalThis);
