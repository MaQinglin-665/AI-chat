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
    const runConversationFollowupDebug = typeof deps.runConversationFollowupDebug === "function" ? deps.runConversationFollowupDebug : async () => false;
    const runProactiveSchedulerManualTick = typeof deps.runProactiveSchedulerManualTick === "function" ? deps.runProactiveSchedulerManualTick : async () => false;
    const runConversationSilenceFollowupDryRun = typeof deps.runConversationSilenceFollowupDryRun === "function" ? deps.runConversationSilenceFollowupDryRun : async () => false;
    const runConversationFollowupPendingFixture = typeof deps.runConversationFollowupPendingFixture === "function" ? deps.runConversationFollowupPendingFixture : async () => false;
    const rehearseConversationFollowupPending = typeof deps.rehearseConversationFollowupPending === "function" ? deps.rehearseConversationFollowupPending : () => null;
    const clearConversationFollowupRehearsal = typeof deps.clearConversationFollowupRehearsal === "function" ? deps.clearConversationFollowupRehearsal : () => null;
    const getFollowupRehearsalScenario = typeof deps.getFollowupRehearsalScenario === "function" ? deps.getFollowupRehearsalScenario : () => null;
    const getFollowupRehearsalScenarioLabel = typeof deps.getFollowupRehearsalScenarioLabel === "function" ? deps.getFollowupRehearsalScenarioLabel : () => null;
    const buildGrayAutoFollowupReadinessStatus = typeof deps.buildGrayAutoFollowupReadinessStatus === "function" ? deps.buildGrayAutoFollowupReadinessStatus : () => null;
    const buildGrayAutoFollowupDryRunStatus = typeof deps.buildGrayAutoFollowupDryRunStatus === "function" ? deps.buildGrayAutoFollowupDryRunStatus : () => null;
    const buildGrayAutoFollowupTrialPreflight = typeof deps.buildGrayAutoFollowupTrialPreflight === "function" ? deps.buildGrayAutoFollowupTrialPreflight : () => null;
    const buildGrayAutoFollowupTrialEventSummary = typeof deps.buildGrayAutoFollowupTrialEventSummary === "function" ? deps.buildGrayAutoFollowupTrialEventSummary : () => null;
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
    const formatFollowupReactionCandidateSummary = typeof deps.formatFollowupReactionCandidateSummary === "function" ? deps.formatFollowupReactionCandidateSummary : () => null;
    const getFollowupCharacterStateDebugView = typeof deps.getFollowupCharacterStateDebugView === "function" ? deps.getFollowupCharacterStateDebugView : () => null;
    const localizeReplyCharacterValue = typeof deps.localizeReplyCharacterValue === "function" ? deps.localizeReplyCharacterValue : () => null;
    const buildAssistantReplyCharacterExpressionCue = typeof deps.buildAssistantReplyCharacterExpressionCue === "function" ? deps.buildAssistantReplyCharacterExpressionCue : () => null;
    const buildAssistantReplyCharacterCueCandidate = typeof deps.buildAssistantReplyCharacterCueCandidate === "function" ? deps.buildAssistantReplyCharacterCueCandidate : () => null;
    const normalizeRuntimeVoiceStyle = typeof deps.normalizeRuntimeVoiceStyle === "function" ? deps.normalizeRuntimeVoiceStyle : () => null;
    const runtimeVoiceStyleToTalkStyle = typeof deps.runtimeVoiceStyleToTalkStyle === "function" ? deps.runtimeVoiceStyleToTalkStyle : async () => false;
    const isReplyCueAutoApplyEnabled = typeof deps.isReplyCueAutoApplyEnabled === "function" ? deps.isReplyCueAutoApplyEnabled : () => null;
    const startFollowupCharacterChipRefresh = typeof deps.startFollowupCharacterChipRefresh === "function" ? deps.startFollowupCharacterChipRefresh : () => null;

    function buildFollowupReadinessBackendEntryView() {
      const summary = state.followupReadinessBackendEntrySummary;
      const safeSummary = summary && typeof summary === "object" ? summary : {};
      const blockedReasons = Array.isArray(safeSummary.blocked_reasons)
        ? safeSummary.blocked_reasons.map((item) => String(item || "").trim()).filter(Boolean)
        : [];
      const guardContract = safeSummary.guard_contract && typeof safeSummary.guard_contract === "object"
        ? safeSummary.guard_contract
        : {};
      const requiredChecks = Array.isArray(guardContract.required_checks)
        ? guardContract.required_checks.map((item) => String(item || "").trim()).filter(Boolean)
        : [];
      const disallowedActions = Array.isArray(guardContract.disallowed_actions)
        ? guardContract.disallowed_actions.map((item) => String(item || "").trim()).filter(Boolean)
        : [];
      const rollbackSteps = Array.isArray(guardContract.rollback)
        ? guardContract.rollback.map((item) => String(item || "").trim()).filter(Boolean)
        : [];
      const executionPreview = safeSummary.entry_execution_preview && typeof safeSummary.entry_execution_preview === "object"
        ? safeSummary.entry_execution_preview
        : {};
      const previewBlockedReasons = Array.isArray(executionPreview.blocked_reasons)
        ? executionPreview.blocked_reasons.map((item) => String(item || "").trim()).filter(Boolean)
        : [];
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
        blockedReasons,
        guardContractReadOnly: guardContract.read_only === true,
        guardContractFailClosed: guardContract.fail_closed === true,
        guardContractRequiredChecks: requiredChecks,
        guardContractDisallowedActions: disallowedActions,
        guardContractRollbackSteps: rollbackSteps,
        guardContractOperatorConfirmation: String(guardContract.operator_confirmation || ""),
        previewReadOnly: executionPreview.read_only === true,
        previewDryRun: executionPreview.dry_run === true,
        previewAccepted: executionPreview.accepted === true,
        previewWouldExecute: executionPreview.would_execute === true,
        previewRequestType: String(executionPreview.request_type || ""),
        previewRequestedAction: String(executionPreview.requested_action || ""),
        previewBlockedReasons,
        nextAction: String(safeSummary.next_action || ""),
        lastRefreshAt: Number(state.followupReadinessBackendEntryLastRefreshAt || 0),
        lastSuccessAt: Number(state.followupReadinessBackendEntryLastSuccessAt || 0)
      };
    }

    function buildFollowupReadinessBackendEntryCardText() {
      const view = buildFollowupReadinessBackendEntryView();
      return typeof FOLLOWUP_READINESS_VIEW.buildBackendEntryCardText === "function"
        ? FOLLOWUP_READINESS_VIEW.buildBackendEntryCardText(view, { joinReasons: joinReadinessReasons })
        : "后端入口摘要（只读）\n状态：未获取";
    }

    async function refreshFollowupReadinessBackendEntrySummary(force = false) {
      if (typeof window === "undefined") {
        return null;
      }
      const existingPromise = state.followupReadinessBackendEntryRefreshPromise;
      if (!force && existingPromise) {
        return existingPromise;
      }
      const now = Date.now();
      const lastRefreshAt = Number(state.followupReadinessBackendEntryLastRefreshAt || 0);
      if (!force && lastRefreshAt > 0 && now - lastRefreshAt < 30000) {
        return state.followupReadinessBackendEntrySummary;
      }
      state.followupReadinessBackendEntryLoading = true;
      state.followupReadinessBackendEntryError = "";
      state.followupReadinessBackendEntryLastRefreshAt = now;
      const promise = (async () => {
        try {
          const resp = await authFetch("/api/character_runtime/backend_entry", { cache: "no-store" });
          const payload = await resp.json().catch(() => ({}));
          if (!resp.ok || !payload || payload.ok === false) {
            const message = String(payload?.error || payload?.message || `HTTP ${resp.status}`);
            throw new Error(message);
          }
          state.followupReadinessBackendEntrySummary = payload && typeof payload.character_runtime_backend_entry === "object"
            ? payload.character_runtime_backend_entry
            : null;
          state.followupReadinessBackendEntryError = "";
          state.followupReadinessBackendEntryLastSuccessAt = Date.now();
          return state.followupReadinessBackendEntrySummary;
        } catch (error) {
          state.followupReadinessBackendEntrySummary = null;
          state.followupReadinessBackendEntryError = String(error?.message || error || "failed to load /api/character_runtime/backend_entry");
          return null;
        } finally {
          state.followupReadinessBackendEntryLoading = false;
          state.followupReadinessBackendEntryRefreshPromise = null;
          if (state.followupReadinessVisible) {
            updateFollowupReadinessPanel();
          }
        }
      })();
      state.followupReadinessBackendEntryRefreshPromise = promise;
      return promise;
    }

    function updateFollowupReadinessBackendEntryCard() {
      if (!state.followupReadinessBackendEntryCard) {
        return;
      }
      state.followupReadinessBackendEntryCard.textContent = buildFollowupReadinessBackendEntryCardText();
      void refreshFollowupReadinessBackendEntrySummary();
    }

    function buildFollowupReadinessReport() {
      const snapshot = getTTSDebugSnapshot();
      const mode = snapshot.conversationMode || {};
      const followup = snapshot.followup || {};
      const silence = snapshot.silence || {};
      const scheduler = snapshot.proactiveScheduler || {};
      const backendEntry = buildFollowupReadinessBackendEntryView();
      const characterState = buildFollowupCharacterState(followup, silence, scheduler);
      const grayReadiness = buildGrayAutoFollowupReadinessStatus(snapshot);
      const grayDryRun = buildGrayAutoFollowupDryRunStatus(snapshot);
      const grayPreflight = buildGrayAutoFollowupTrialPreflight(snapshot);
      const grayEventSummary = buildGrayAutoFollowupTrialEventSummary(12);
      const switchesReady = mode.enabled === true
        && mode.proactiveEnabled === true
        && mode.proactiveSchedulerEnabled === true;
      const grayAutoEnabled = mode.grayAutoEnabled === true;
      const grayAutoTrialEnabled = mode.grayAutoTrialEnabled === true;
      const automaticGatesReady = switchesReady && grayAutoEnabled && grayAutoTrialEnabled;
      const grayTrialArmed = grayAutoEnabled && grayAutoTrialEnabled;
      const rehearsalBlockedReason = getConversationFollowupRehearsalBlockedReason();
      const rehearsalScenarioLabel = getFollowupRehearsalScenarioLabel(state.followupRehearsalScenarioId);
      const lines = [
        "\u7eed\u8bdd\u72b6\u6001",
        "",
        "\u6458\u8981",
        buildFollowupReadinessFriendlySummary(followup, silence, scheduler),
        `\u7070\u5ea6\u51c6\u5907\uff1a${grayReadiness.ready === true ? "\u53ef\u89c2\u5bdf\u5230\u81ea\u52a8\u89e6\u53d1\u6761\u4ef6\u5df2\u6ee1\u8db3" : "\u6682\u4e0d\u53ef\u81ea\u52a8\u89e6\u53d1"}  \u72b6\u6001\uff1a${grayReadiness.status}`,
        `\u89d2\u8272\u72b6\u6001\uff1a${characterState.label}  \u5fc3\u60c5\uff1a${characterState.mood}`,
        `\u72b6\u6001\u8bf4\u660e\uff1a${characterState.description}`,
        `\u9762\u677f\u9884\u6f14\uff1a${state.followupRehearsalActive === true ? "\u5df2\u5f00\u542f" : "\u672a\u5f00\u542f"}${rehearsalScenarioLabel ? `  \u573a\u666f\uff1a${rehearsalScenarioLabel}` : ""}  \u53ef\u9884\u6f14\uff1a${rehearsalBlockedReason ? "\u5426" : "\u662f"}${rehearsalBlockedReason ? `  \u539f\u56e0\uff1a${rehearsalBlockedReason}` : ""}`,
        `\u7070\u5ea6\u81ea\u52a8\u7eed\u8bdd\uff1a${grayAutoEnabled ? "\u5df2\u663e\u5f0f\u542f\u7528" : "\u672a\u542f\u7528\uff08\u9ed8\u8ba4\u5173\u95ed\uff09"}${grayAutoEnabled ? "" : "  \u81ea\u52a8\u8f6e\u8be2\u4f1a\u4fdd\u6301\u5173\u95ed"}`,
        `\u8bd5\u8fd0\u884c\u603b\u95f8\uff1a${grayAutoTrialEnabled ? "\u5df2\u663e\u5f0f\u542f\u7528" : "\u672a\u542f\u7528\uff08\u9ed8\u8ba4\u5173\u95ed\uff09"}${grayAutoTrialEnabled ? "" : "  \u81ea\u52a8\u8f6e\u8be2\u4f1a\u4fdd\u6301\u5173\u95ed"}`,
        `\u8bd5\u8fd0\u884c armed\uff1a${grayTrialArmed ? "\u662f" : "\u5426"}  polling=${scheduler.pollTimerActive === true ? "on" : "off"}`,
        automaticGatesReady
          ? "\u4e94\u5c42\u81ea\u52a8\u8f6e\u8be2\u5f00\u5173\u90fd\u5df2\u5f00\u542f\uff0c\u4f46\u4ecd\u4f1a\u7ee7\u7eed\u53d7\u5b89\u9759\u7a97\u53e3\u3001\u51b7\u5374\u3001\u6b21\u6570\u4e0a\u9650\u548c\u7b56\u7565\u4fdd\u62a4\u3002"
          : "\u5f53\u524d\u4ecd\u6709\u81ea\u52a8\u8f6e\u8be2\u5f00\u5173\u672a\u5f00\u542f\uff0c\u6240\u4ee5\u4e0d\u4f1a\u81ea\u52a8\u7eed\u8bdd\u3002",
        `\u540e\u7aef\u5165\u53e3\uff1a${backendEntry.loading ? "\u52a0\u8f7d\u4e2d" : backendEntry.loaded ? (backendEntry.entryReady === true ? "\u5df2\u63a5\u5165" : "\u9aa8\u67b6\u672a\u5c31\u7eea") : "\u672a\u83b7\u53d6"}  \u53ea\u8bfb\uff1a${backendEntry.loaded ? formatReadinessBool(backendEntry.readOnly) : "\u672a\u786e\u8ba4"}  \u9ed8\u8ba4\u5173\u95ed\uff1a${backendEntry.loaded ? formatReadinessBool(backendEntry.defaultOffBaseline) : "\u672a\u786e\u8ba4"}`,
        `\u540e\u7aef\u963b\u585e\uff1a${backendEntry.loaded ? joinReadinessReasons(backendEntry.blockedReasons) : "n/a"}  \u7ed3\u8bba\uff1a${backendEntry.loaded ? (backendEntry.nextAction || "n/a") : "\u5148\u53ea\u8bfb\u62c9\u53d6 /api/character_runtime/backend_entry \u6458\u8981"} `,
        "",
        "\u5f53\u524d\u5f00\u5173",
        `\u4f1a\u8bdd\u6a21\u5f0f\uff1a${formatReadinessBool(mode.enabled)}`,
        `\u4e3b\u52a8\u7eed\u8bdd\uff1a${formatReadinessBool(mode.proactiveEnabled)}`,
        `\u8c03\u5ea6\u5668\uff1a${formatReadinessBool(mode.proactiveSchedulerEnabled)}`,
        `\u7070\u5ea6\u81ea\u52a8\u7eed\u8bdd\uff1a${formatReadinessBool(mode.grayAutoEnabled)}  \u8f6e\u8be2\u95e8\u7981\uff1a${joinReadinessReasons(scheduler.pollingBlockedReasons)}`,
        `\u8bd5\u8fd0\u884c\u603b\u95f8\uff1a${formatReadinessBool(mode.grayAutoTrialEnabled)}`,
        `\u8bd5\u8fd0\u884c armed\uff1a${grayTrialArmed ? "true" : "false"}  polling=${scheduler.pollTimerActive === true ? "true" : "false"}`,
        `\u8bd5\u8fd0\u884c\u6b21\u6570\uff1a${Number(mode.grayAutoTrialSessionTriggerCount || 0)}/${Number(mode.grayAutoTrialMaxTriggersPerSession ?? 1)}`,
        `\u7070\u5ea6 readiness\uff1a${grayReadiness.ready === true ? "\u901a\u8fc7" : "\u963b\u585e"}  \u5019\u9009\uff1a${grayReadiness.candidateReady === true ? "\u901a\u8fc7" : "\u963b\u585e"}  \u8f6e\u8be2\uff1a${grayReadiness.pollingReady === true ? "\u901a\u8fc7" : "\u963b\u585e"}`,
        `\u7070\u5ea6\u963b\u585e\u539f\u56e0\uff1a${explainReadinessReasons(grayReadiness.blockedReasons)}`,
        `\u7070\u5ea6 dry-run\uff1a${grayDryRun.wouldAttemptTrigger === true ? "\u82e5\u8f6e\u8be2\u68c0\u67e5\u53d1\u751f\uff0c\u4f1a\u5c1d\u8bd5\u89e6\u53d1" : "\u82e5\u8f6e\u8be2\u68c0\u67e5\u53d1\u751f\uff0c\u4ecd\u4f1a\u963b\u6b62"}  wouldPoll=${grayDryRun.wouldPollCheck === true ? "true" : "false"}`,
        `\u8bd5\u8fd0\u884c preflight\uff1a${grayPreflight.status}  gates=${grayPreflight.gatesReady === true ? "pass" : joinReadinessReasons(grayPreflight.gateBlockedReasons)}`,
        `\u8bd5\u8fd0\u884c\u4e8b\u4ef6\uff1a${grayEventSummary.totalPollEvents} \u6761  last=${grayEventSummary.last?.stage || "none"}/${grayEventSummary.lastTrialStatus}`,
        "",
        "\u5982\u4f55\u8c03\u6574",
        "1. \u6253\u5f00 config.local.json\u3002",
        "2. \u4fee\u6539 conversation_mode \u91cc\u7684 enabled / proactive_enabled / proactive_scheduler_enabled / gray_auto_enabled / gray_auto_trial_enabled\u3002",
        "3. \u4fdd\u5b58\u540e\u91cd\u542f\u5e94\u7528\u751f\u6548\u3002",
        "4. \u5982\u679c\u60f3\u7acb\u523b\u505c\u7528\u81ea\u52a8\u7eed\u8bdd\uff0c\u5173\u95ed\u4efb\u610f\u4e00\u4e2a\u5f00\u5173\u5373\u53ef\uff1bgray_auto_enabled \u548c gray_auto_trial_enabled \u9ed8\u8ba4\u90fd\u4e3a false\u3002",
        "",
        "\u5b89\u5168\u9ed8\u8ba4",
        "\u9ed8\u8ba4\u4e0d\u4e3b\u52a8\u89c2\u5bdf\u684c\u9762\uff0c\u4e0d\u8bfb\u6587\u4ef6\uff0c\u4e0d\u8c03\u7528\u5de5\u5177\uff0c\u4e0d\u6267\u884c\u547d\u4ee4\u3002",
        "\u7070\u5ea6\u81ea\u52a8\u7eed\u8bdd\u9700\u8981\u663e\u5f0f\u6253\u5f00 gray_auto_enabled \u548c gray_auto_trial_enabled\uff0c\u5e76\u4e14\u53ea\u4f1a\u5728\u591a\u5c42 guard \u5168\u90e8\u901a\u8fc7\u540e\u5c1d\u8bd5\uff0c\u4f1a\u907f\u5f00\u5df2\u6536\u53e3\u7684\u8bdd\u9898\u3002",
        "",
        "\u7eed\u8bdd\u8be6\u60c5",
        `\u5f85\u5904\u7406\uff1a${followup.pending === true ? "\u662f" : "\u5426"}  \u7b56\u7565\uff1a${followup.policy || "n/a"}  \u53ef\u89e6\u53d1\uff1a${followup.eligible === true ? "\u662f" : "\u5426"}`,
        `\u8bdd\u9898\uff1a${followup.topicHint || "\uff08\u7a7a\uff09"}`,
        `\u89d2\u8272\u8bed\u6c14\uff1a${followup.characterCue?.tone || "n/a"}  \u60c5\u7eea\uff1a${followup.characterCue?.emotion || "n/a"} / ${followup.characterCue?.action || "n/a"}`,
        `\u672c\u5730\u9884\u89c8\uff1a${followup.characterPreview || "n/a"}`,
        `\u9009\u62e9\u7b56\u7565\uff1a${followup.selectedReaction?.reason || "n/a"}  tone=${followup.selectedReaction?.preferredTone || "n/a"}  index=${Number.isFinite(Number(followup.selectedReaction?.index)) ? Number(followup.selectedReaction.index) : -1}`,
        `\u5019\u9009\u77ed\u53e5\uff1a${formatFollowupReactionCandidateSummary(followup.reactionCandidates)}`,
        `\u963b\u585e\u539f\u56e0\uff1a${explainReadinessReasons(followup.blockedReasons)}`,
        `\u539f\u59cb\u539f\u56e0\uff1a${joinReadinessReasons(followup.blockedReasons)}`,
        `\u66f4\u65b0\u65f6\u95f4\uff1a${formatReadinessMs(followup.updatedAgeMs)}  \u5b89\u9759\u9608\u503c\uff1a${formatReadinessMs(mode.silenceFollowupMinMs)}`,
        "",
        "\u5b89\u9759\u7a97\u53e3",
        `\u53ef\u89e6\u53d1\uff1a${silence.eligibleForSilenceFollowup === true ? "\u662f" : "\u5426"}  \u7b56\u7565\uff1a${silence.followupPolicy || "n/a"}`,
        `\u963b\u585e\u539f\u56e0\uff1a${explainReadinessReasons(silence.blockedReasons)}`,
        `\u539f\u59cb\u539f\u56e0\uff1a${joinReadinessReasons(silence.blockedReasons)}`,
        `\u8ddd\u79bb\u7528\u6237\u53d1\u8a00\uff1a${formatReadinessMs(silence.lastUserAgeMs)}  \u8ddd\u79bb\u8bed\u97f3\u7ed3\u675f\uff1a${formatReadinessMs(silence.lastTtsFinishedAgeMs)}`,
        "",
        "\u8c03\u5ea6\u5668",
        `\u53ef\u89e6\u53d1\uff1a${scheduler.eligibleForSchedulerTick === true ? "\u662f" : "\u5426"}  \u8f6e\u8be2\uff1a${scheduler.pollTimerActive === true ? "\u5f00" : "\u5173"}  \u4e0a\u6b21\u8f6e\u8be2\uff1a${scheduler.pollLastResult || "n/a"}`,
        `\u963b\u585e\u539f\u56e0\uff1a${explainReadinessReasons(scheduler.blockedReasons)}`,
        `\u539f\u59cb\u539f\u56e0\uff1a${joinReadinessReasons(scheduler.blockedReasons)}`,
        `\u51b7\u5374\u5269\u4f59\uff1a${formatReadinessMs(scheduler.cooldownRemainingMs)}  \u6b21\u6570\uff1a${Number(scheduler.proactiveCountInWindow || 0)}/${Number(scheduler.maxFollowupsPerWindow || 0)}`,
        "",
        "\u5b89\u5168\u8bf4\u660e",
        "\u8fd9\u4e2a\u9762\u677f\u53ea\u8bfb\uff1a\u4e0d\u4f1a\u4fee\u6539\u914d\u7f6e\u3001\u89e6\u53d1\u7eed\u8bdd\u3001\u542f\u52a8\u8f6e\u8be2\u3001\u622a\u56fe\u3001\u5de5\u5177\u8c03\u7528\u3001\u6587\u4ef6\u8bbf\u95ee\u3001TTS\u3001fetch \u6216 LLM\u3002"
      ];
      return lines.join("\n");
    }

    function buildFollowupReadinessPreviewCardText() {
      const data = buildFollowupReadinessPreviewCardData();
      return typeof FOLLOWUP_READINESS_VIEW.buildPreviewCardText === "function"
        ? FOLLOWUP_READINESS_VIEW.buildPreviewCardText(data)
        : "";
    }

    function buildFollowupRehearsalScenarioCompareRows() {
      return FOLLOWUP_REHEARSAL_SCENARIOS.map((scenario) => {
        const policy = buildConversationFollowupPolicy({
          reason: scenario.reason,
          topicHint: scenario.topicHint
        });
        const plan = {
          reason: scenario.reason,
          topicHint: scenario.topicHint,
          followupPolicy: policy.type,
          updatedAgeMs: state.conversationMode?.silenceFollowupMinMs || 180000
        };
        const candidates = buildConversationFollowupReactionCandidates(plan);
        const selected = selectConversationFollowupReactionCandidate(plan, candidates);
        const candidate = String(selected.candidate?.text || "n/a").replace(/\s+/g, " ").trim();
        return {
          id: scenario.id,
          label: scenario.label,
          policy: policy.type,
          tone: selected.preferredTone || "n/a",
          selectedIndex: selected.index,
          candidateText: candidate
        };
      });
    }

    function buildFollowupRehearsalScenarioCompareText() {
      const rows = buildFollowupRehearsalScenarioCompareRows();
      return typeof FOLLOWUP_READINESS_VIEW.buildScenarioCompareText === "function"
        ? FOLLOWUP_READINESS_VIEW.buildScenarioCompareText(rows)
        : "";
    }

    function buildFollowupReadinessPreviewCopyBundleText() {
      const data = buildFollowupReadinessPreviewCardData();
      return typeof FOLLOWUP_READINESS_VIEW.buildPreviewCopyBundleText === "function"
        ? FOLLOWUP_READINESS_VIEW.buildPreviewCopyBundleText(data)
        : "";
    }

    function buildFollowupReadinessPreviewJsonText() {
      const data = buildFollowupReadinessPreviewCardData();
      return typeof FOLLOWUP_READINESS_VIEW.buildPreviewJsonText === "function"
        ? FOLLOWUP_READINESS_VIEW.buildPreviewJsonText(data)
        : "{}";
    }

    function buildFollowupReadinessPreviewOneLineText() {
      const data = buildFollowupReadinessPreviewCardData();
      return typeof FOLLOWUP_READINESS_VIEW.buildPreviewOneLineText === "function"
        ? FOLLOWUP_READINESS_VIEW.buildPreviewOneLineText(data)
        : "";
    }

    function buildFollowupReadinessPreviewCardData(snapshotInput = null) {
      const snapshot = snapshotInput && typeof snapshotInput === "object"
        ? snapshotInput
        : getTTSDebugSnapshot();
      const followup = snapshot.followup || {};
      const silence = snapshot.silence || {};
      const scheduler = snapshot.proactiveScheduler || {};
      const characterState = buildFollowupCharacterState(followup, silence, scheduler);
      const selected = followup.selectedReaction && typeof followup.selectedReaction === "object"
        ? followup.selectedReaction
        : null;
      const scenarioLabel = getFollowupRehearsalScenarioLabel(state.followupRehearsalScenarioId) || "\u672a\u9009\u62e9";
      const candidateText = String(selected?.candidate?.text || followup.characterPreview || "").trim() || "n/a";
      const tone = String(selected?.preferredTone || selected?.candidate?.tone || followup.characterCue?.tone || "n/a");
      const policy = String(followup.policy || "n/a");
      const blocked = Array.isArray(followup.blockedReasons) && followup.blockedReasons.length
        ? followup.blockedReasons.join(",")
        : "none";
      return {
        scenarioLabel,
        characterLabel: String(characterState.label || "n/a"),
        characterMood: String(characterState.mood || "n/a"),
        pending: followup.pending === true,
        topicHint: String(followup.topicHint || "").trim(),
        eligible: followup.eligible === true,
        blockedReasons: Array.isArray(followup.blockedReasons) ? followup.blockedReasons.slice() : [],
        policy,
        tone,
        selectedIndex: Number.isFinite(Number(selected?.index)) ? Number(selected.index) : -1,
        candidateText,
        blocked
      };
    }

    function normalizeFollowupManualConfirmationToken(value = "") {
      return typeof FOLLOWUP_READINESS_VIEW.normalizeManualConfirmationToken === "function"
        ? FOLLOWUP_READINESS_VIEW.normalizeManualConfirmationToken(value)
        : String(value || "").replace(/\s+/g, " ").trim();
    }

    function buildFollowupManualConfirmationKey(input = {}) {
      return typeof FOLLOWUP_READINESS_VIEW.buildManualConfirmationKey === "function"
        ? FOLLOWUP_READINESS_VIEW.buildManualConfirmationKey(input)
        : "";
    }

    function buildFollowupManualConfirmationData() {
      const snapshot = getTTSDebugSnapshot();
      const data = buildFollowupReadinessPreviewCardData(snapshot);
      const silence = snapshot.silence || {};
      const scheduler = snapshot.proactiveScheduler || {};
      const candidateText = data.candidateText === "n/a"
        ? ""
        : normalizeFollowupManualConfirmationToken(data.candidateText);
      const hasCandidate = !!candidateText;
      const blockedReasons = []
        .concat(Array.isArray(data.blockedReasons) ? data.blockedReasons : [])
        .concat(Array.isArray(silence.blockedReasons) ? silence.blockedReasons : [])
        .concat(Array.isArray(scheduler.blockedReasons) ? scheduler.blockedReasons : []);
      const key = buildFollowupManualConfirmationKey({
        topicHint: data.topicHint,
        policy: data.policy,
        candidateText
      });
      const dismissed = !!key
        && state.followupManualConfirmationDismissedKeys instanceof Set
        && state.followupManualConfirmationDismissedKeys.has(key);
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

    function getFollowupManualConfirmationStatusLabel(status = "hidden") {
      return typeof FOLLOWUP_READINESS_VIEW.getManualConfirmationStatusLabel === "function"
        ? FOLLOWUP_READINESS_VIEW.getManualConfirmationStatusLabel(status)
        : "隐藏";
    }

    function buildFollowupManualConfirmationDebugPayload(confirmation = {}, result = "") {
      const blockedSummary = Array.isArray(confirmation.blockedReasons)
        ? confirmation.blockedReasons.join(",")
        : "";
      const policy = String(confirmation.policy || "");
      const error = [policy, blockedSummary].filter(Boolean).join(";");
      return {
        text: String(confirmation.topicHint || ""),
        result: sanitizeTTSDebugText(result || confirmation.status || "", 80),
        error: sanitizeTTSDebugText(error, 140)
      };
    }

    function recordFollowupManualConfirmationVisibleEvent(confirmation = {}) {
      const visible = confirmation.hidden !== true && confirmation.dismissed !== true;
      if (!visible) {
        state.followupManualConfirmationLastVisibleEventKey = "";
        return;
      }
      const eventKey = [
        confirmation.key || "manual_confirmation",
        confirmation.status || "unknown"
      ].join("::");
      if (state.followupManualConfirmationLastVisibleEventKey === eventKey) {
        return;
      }
      state.followupManualConfirmationLastVisibleEventKey = eventKey;
      recordTTSDebugEvent(
        "conversation_followup_manual_confirmation_preview_shown",
        buildFollowupManualConfirmationDebugPayload(confirmation)
      );
    }

    function updateFollowupManualConfirmationControls() {
      const actions = state.followupReadinessManualActions;
      const statusNode = state.followupReadinessManualStatus;
      const confirmBtn = state.followupReadinessManualConfirmBtn;
      const dismissBtn = state.followupReadinessManualDismissBtn;
      const reviewBtn = state.followupReadinessManualReviewBtn;
      if (!actions || !statusNode || !confirmBtn || !dismissBtn || !reviewBtn) {
        return;
      }
      const confirmation = buildFollowupManualConfirmationData();
      const visible = confirmation.hidden !== true && confirmation.dismissed !== true;
      actions.style.display = visible ? "flex" : "none";
      statusNode.style.display = visible ? "block" : "none";
      if (!visible) {
        return;
      }
      const blockedSummary = explainReadinessReasons(confirmation.blockedReasons);
      const approving = state.followupManualConfirmationApproving === true;
      confirmBtn.disabled = confirmation.available !== true;
      if (approving) {
        confirmBtn.disabled = true;
      }
      confirmBtn.textContent = approving
        ? "\u6267\u884c\u4e2d"
        : confirmation.available === true ? "\u786e\u8ba4" : "\u4e0d\u53ef\u786e\u8ba4";
      confirmBtn.title = confirmation.available === true
        ? "\u91cd\u65b0\u68c0\u67e5\u5b88\u536b\u540e\u624b\u52a8\u6267\u884c\u7eed\u8bdd"
        : `\u5f53\u524d\u4e0d\u6ee1\u8db3\u786e\u8ba4\u6761\u4ef6\uff1a${blockedSummary}`;
      dismissBtn.disabled = !confirmation.key;
      dismissBtn.title = "\u4ec5\u672c\u5730\u9690\u85cf\u5f53\u524d\u786e\u8ba4\u5361\u7247\uff0c\u4e0d\u4f1a\u6539\u52a8 scheduler/pending/config";
      reviewBtn.disabled = false;
      reviewBtn.title = "\u6253\u5f00\u6216\u805a\u7126\u7eed\u8bdd\u8be6\u60c5\u62a5\u544a";
      statusNode.textContent = `\u786e\u8ba4\u72b6\u6001\uff1a${getFollowupManualConfirmationStatusLabel(confirmation.status)}  guard\uff1a${confirmation.available === true ? "\u5df2\u901a\u8fc7\uff08\u53ef\u624b\u52a8\u6267\u884c\uff09" : blockedSummary}`;
    }

    async function handleFollowupManualConfirmClick(button = null) {
      if (state.followupManualConfirmationApproving === true) {
        setStatus("\u7eed\u8bdd\u786e\u8ba4\u6b63\u5728\u6267\u884c\u4e2d");
        return false;
      }
      const confirmation = buildFollowupManualConfirmationData();
      if (confirmation.available !== true) {
        const blockedSummary = explainReadinessReasons(confirmation.blockedReasons);
        setStatus(`\u5f53\u524d\u4e0d\u53ef\u786e\u8ba4\uff1a${blockedSummary}`);
        recordTTSDebugEvent(
          "conversation_followup_manual_confirmation_blocked",
          buildFollowupManualConfirmationDebugPayload(
            confirmation,
            confirmation.blockedReasons.join(",") || "guard_blocked"
          )
        );
        updateFollowupReadinessPanel();
        return false;
      }
      recordTTSDebugEvent(
        "conversation_followup_manual_confirmation_approval_started",
        buildFollowupManualConfirmationDebugPayload(confirmation, "approval_started")
      );
      state.followupManualConfirmationApproving = true;
      updateFollowupManualConfirmationControls();
      setStatus("\u6b63\u5728\u624b\u52a8\u786e\u8ba4\u7eed\u8bdd...");
      try {
        const freshConfirmation = buildFollowupManualConfirmationData();
        if (freshConfirmation.available !== true) {
          const blockedSummary = explainReadinessReasons(freshConfirmation.blockedReasons);
          setStatus(`\u786e\u8ba4\u524d\u5b88\u536b\u5df2\u963b\u6b62\uff1a${blockedSummary}`);
          recordTTSDebugEvent(
            "conversation_followup_manual_confirmation_blocked",
            buildFollowupManualConfirmationDebugPayload(
              freshConfirmation,
              freshConfirmation.blockedReasons.join(",") || "guard_blocked"
            )
          );
          return false;
        }
        recordTTSDebugEvent(
          "conversation_followup_manual_confirmation_approved",
          buildFollowupManualConfirmationDebugPayload(freshConfirmation, "guard_passed")
        );
        const result = await runConversationFollowupDebug();
        if (result?.ok === true) {
          if (freshConfirmation.key && state.followupManualConfirmationDismissedKeys instanceof Set) {
            state.followupManualConfirmationDismissedKeys.delete(freshConfirmation.key);
          }
          recordTTSDebugEvent(
            "conversation_followup_manual_confirmation_execution_succeeded",
            buildFollowupManualConfirmationDebugPayload(freshConfirmation, result?.reason || "executed")
          );
          setStatus("\u624b\u52a8\u786e\u8ba4\u7eed\u8bdd\u5df2\u6267\u884c");
          return true;
        }
        recordTTSDebugEvent(
          "conversation_followup_manual_confirmation_execution_failed",
          buildFollowupManualConfirmationDebugPayload(freshConfirmation, result?.reason || "not_executed")
        );
        setStatus(`\u624b\u52a8\u786e\u8ba4\u7eed\u8bdd\u672a\u6267\u884c\uff1a${result?.reason || "unknown"}`);
        return false;
      } catch (err) {
        recordTTSDebugEvent(
          "conversation_followup_manual_confirmation_execution_failed",
          buildFollowupManualConfirmationDebugPayload(confirmation, "exception")
        );
        setStatus(`\u624b\u52a8\u786e\u8ba4\u7eed\u8bdd\u5931\u8d25\uff1a${err?.message || err}`);
        return false;
      } finally {
        state.followupManualConfirmationApproving = false;
        updateFollowupReadinessPanel();
      }
    }

    function dismissFollowupManualConfirmation(button = null) {
      const confirmation = buildFollowupManualConfirmationData();
      if (!confirmation.key) {
        setStatus("\u5f53\u524d\u6ca1\u6709\u53ef\u5ffd\u7565\u7684\u786e\u8ba4\u9879");
        return false;
      }
      state.followupManualConfirmationDismissedKeys.add(confirmation.key);
      recordTTSDebugEvent(
        "conversation_followup_manual_confirmation_dismissed",
        buildFollowupManualConfirmationDebugPayload(confirmation, "dismissed")
      );
      if (button) {
        const previous = button.textContent;
        button.textContent = "\u5df2\u5ffd\u7565";
        window.setTimeout(() => {
          button.textContent = previous || "\u5ffd\u7565";
        }, 1200);
      }
      updateFollowupReadinessPanel();
      setStatus("\u5df2\u5ffd\u7565\u5f53\u524d\u786e\u8ba4\u9884\u89c8\uff08\u4ec5\u672c\u5730\u5185\u5b58\uff09");
      return true;
    }

    function reviewFollowupManualConfirmationDetails() {
      const confirmation = buildFollowupManualConfirmationData();
      recordTTSDebugEvent(
        "conversation_followup_manual_confirmation_review_details",
        buildFollowupManualConfirmationDebugPayload(confirmation, confirmation.status || "review")
      );
      toggleFollowupReadinessPanel(true);
      updateFollowupReadinessPanel();
      if (state.followupReadinessBody && typeof state.followupReadinessBody.scrollIntoView === "function") {
        state.followupReadinessBody.scrollIntoView({ block: "start", behavior: "smooth" });
      }
      setStatus("\u5df2\u805a\u7126\u7eed\u8bdd\u8be6\u60c5\u533a\u57df");
    }

    function updateFollowupReadinessPreviewCard() {
      if (!state.followupReadinessCard) {
        return;
      }
      const confirmation = buildFollowupManualConfirmationData();
      if (confirmation.hidden === true || confirmation.dismissed === true) {
        state.followupReadinessCard.style.display = "none";
        return;
      }
      state.followupReadinessCard.style.display = "block";
      state.followupReadinessCard.textContent = buildFollowupReadinessPreviewCardText();
    }

    function updateFollowupManualConfirmationPreviewCard() {
      if (!state.followupReadinessConfirmationCard) {
        return;
      }
      const data = buildFollowupManualConfirmationData();
      recordFollowupManualConfirmationVisibleEvent(data);
      state.followupReadinessConfirmationCard.style.display = data.hidden === true || data.dismissed === true ? "none" : "block";
      if (data.hidden === true || data.dismissed === true) {
        state.followupReadinessConfirmationCard.textContent = "";
        return;
      }
      state.followupReadinessConfirmationCard.textContent = typeof FOLLOWUP_READINESS_VIEW.buildManualConfirmationPreviewText === "function"
        ? FOLLOWUP_READINESS_VIEW.buildManualConfirmationPreviewText(data, {
          explainReasons: explainReadinessReasons,
          joinReasons: joinReadinessReasons
        })
        : "";
    }

    function buildGrayAutoTrialStatusCardText() {
      const snapshot = getTTSDebugSnapshot();
      const mode = snapshot.conversationMode || {};
      const scheduler = snapshot.proactiveScheduler || {};
      const preflight = buildGrayAutoFollowupTrialPreflight(snapshot);
      const session = buildGrayAutoTrialSessionState();
      const events = buildGrayAutoFollowupTrialEventSummary(8);
      const armed = mode.grayAutoEnabled === true && mode.grayAutoTrialEnabled === true;
      const polling = scheduler.pollTimerActive === true;
      return typeof FOLLOWUP_READINESS_VIEW.buildGrayAutoTrialStatusCardText === "function"
        ? FOLLOWUP_READINESS_VIEW.buildGrayAutoTrialStatusCardText(
          { preflight, session, events, armed, polling },
          { explainReasons: explainReadinessReasons }
        )
        : "";
    }

    function updateGrayAutoTrialStatusCard() {
      if (!state.followupReadinessTrialCard) {
        return;
      }
      state.followupReadinessTrialCard.textContent = buildGrayAutoTrialStatusCardText();
    }

    function buildGrayAutoTrialAuditSummary(limit = 24) {
      const snapshot = getTTSDebugSnapshot();
      const mode = snapshot.conversationMode || {};
      const scheduler = snapshot.proactiveScheduler || {};
      const safeLimit = Number.isFinite(Number(limit))
        ? Math.max(4, Math.min(80, Math.round(Number(limit))))
        : 24;
      const preflight = buildGrayAutoFollowupTrialPreflight(snapshot);
      const session = buildGrayAutoTrialSessionState();
      const events = buildGrayAutoFollowupTrialEventSummary(safeLimit);
      return typeof GRAY_TRIAL_READINESS_MODEL.buildAuditSummary === "function"
        ? GRAY_TRIAL_READINESS_MODEL.buildAuditSummary({
          preflight,
          session,
          events,
          armed: mode.grayAutoEnabled === true && mode.grayAutoTrialEnabled === true,
          polling: scheduler.pollTimerActive === true
        }, { now: () => Date.now() })
        : {
          readOnly: true,
          generatedAt: Date.now(),
          status: preflight.status,
          armed: mode.grayAutoEnabled === true && mode.grayAutoTrialEnabled === true,
          polling: scheduler.pollTimerActive === true,
          session,
          dryRun: preflight.dryRun,
          blockedReasons: Array.isArray(preflight.dryRun?.blockedReasons) ? preflight.dryRun.blockedReasons.slice() : [],
          events
        };
    }

    function buildGrayAutoTrialAuditSummaryText(limit = 24) {
      const audit = buildGrayAutoTrialAuditSummary(limit);
      return typeof FOLLOWUP_READINESS_VIEW.buildGrayAutoTrialAuditSummaryText === "function"
        ? FOLLOWUP_READINESS_VIEW.buildGrayAutoTrialAuditSummaryText(audit, { joinReasons: joinReadinessReasons })
        : "";
    }

    function buildGrayAutoTrialPreRunChecklist(snapshotInput = null) {
      const snapshot = snapshotInput && typeof snapshotInput === "object"
        ? snapshotInput
        : getTTSDebugSnapshot();
      const mode = snapshot.conversationMode || {};
      const scheduler = snapshot.proactiveScheduler || {};
      const preflight = buildGrayAutoFollowupTrialPreflight(snapshot);
      const session = buildGrayAutoTrialSessionState();
      return typeof GRAY_TRIAL_READINESS_MODEL.buildPreRunChecklist === "function"
        ? GRAY_TRIAL_READINESS_MODEL.buildPreRunChecklist(
          { mode, scheduler, preflight, session },
          { explainReasons: explainReadinessReasons }
        )
        : {
          readOnly: true,
          status: preflight.status,
          readyForWatchedTrial: false,
          readyForTriggerObservation: preflight.status === "ready_for_local_trial",
          armed: mode.grayAutoEnabled === true && mode.grayAutoTrialEnabled === true,
          polling: scheduler.pollTimerActive === true,
          session,
          blockedReasons: [],
          items: [],
          nextAction: "Complete required checklist items before a real controlled trial."
        };
    }

    function buildGrayAutoTrialPreRunChecklistText() {
      const checklist = buildGrayAutoTrialPreRunChecklist();
      return typeof FOLLOWUP_READINESS_VIEW.buildGrayAutoTrialPreRunChecklistText === "function"
        ? FOLLOWUP_READINESS_VIEW.buildGrayAutoTrialPreRunChecklistText(checklist)
        : "";
    }

    function buildGrayAutoTrialTimeline(limit = 32) {
      return typeof GRAY_TRIAL_READINESS_MODEL.buildTimeline === "function"
        ? GRAY_TRIAL_READINESS_MODEL.buildTimeline(state.ttsDebugEvents, {
          limit,
          parseResult: parseGrayTrialPollEventResult,
          sanitizeText: sanitizeTTSDebugText
        })
        : {
          readOnly: true,
          limit: 0,
          total: 0,
          last: null,
          hasArm: false,
          hasStop: false,
          hasDisarm: false,
          hasTriggerSuccess: false,
          hasTriggerBlocked: false,
          entries: []
        };
    }

    function buildGrayAutoTrialTimelineText(limit = 32) {
      const timeline = buildGrayAutoTrialTimeline(limit);
      return typeof FOLLOWUP_READINESS_VIEW.buildGrayAutoTrialTimelineText === "function"
        ? FOLLOWUP_READINESS_VIEW.buildGrayAutoTrialTimelineText(timeline)
        : "";
    }

    function buildGrayAutoTrialOutcome(limit = 48) {
      const timeline = buildGrayAutoTrialTimeline(limit);
      const checklist = buildGrayAutoTrialPreRunChecklist();
      const snapshot = getTTSDebugSnapshot();
      const preflight = buildGrayAutoFollowupTrialPreflight(snapshot);
      const session = buildGrayAutoTrialSessionState();
      return typeof GRAY_TRIAL_READINESS_MODEL.buildOutcome === "function"
        ? GRAY_TRIAL_READINESS_MODEL.buildOutcome(
          { timeline, checklist, preflight, session },
          { explainReason: explainReadinessReason }
        )
        : {
          readOnly: true,
          outcome: "not_started",
          severity: "info",
          summary: "No gray trial control or polling events are visible yet.",
          nextAction: "Open the readiness panel, review the runbook, then arm only during a watched local test.",
          status: preflight.status,
          armed: checklist.armed === true,
          polling: checklist.polling === true,
          session,
          timeline: { total: timeline.total, lastStage: timeline.last?.stage || "none" },
          rootCauses: []
        };
    }

    function buildGrayAutoTrialOutcomeText(limit = 48) {
      const result = buildGrayAutoTrialOutcome(limit);
      return typeof FOLLOWUP_READINESS_VIEW.buildGrayAutoTrialOutcomeText === "function"
        ? FOLLOWUP_READINESS_VIEW.buildGrayAutoTrialOutcomeText(result)
        : "";
    }

    function buildGrayAutoTrialGoNoGoDecision(limit = 48) {
      const outcome = buildGrayAutoTrialOutcome(limit);
      const checklist = buildGrayAutoTrialPreRunChecklist();
      const timeline = buildGrayAutoTrialTimeline(limit);
      return typeof GRAY_TRIAL_READINESS_MODEL.buildGoNoGoDecision === "function"
        ? GRAY_TRIAL_READINESS_MODEL.buildGoNoGoDecision({ outcome, checklist, timeline })
        : {
          readOnly: true,
          decision: "NO_GO",
          reason: "Required pre-run checklist items are not complete.",
          nextAction: "Do not run a real controlled trial yet; complete the checklist or Disarm.",
          outcome: outcome.outcome,
          severity: outcome.severity,
          status: outcome.status,
          readyForWatchedTrial: checklist.readyForWatchedTrial === true,
          readyForTriggerObservation: checklist.readyForTriggerObservation === true,
          missingRequired: [],
          rootCauses: outcome.rootCauses || [],
          timeline: { total: timeline.total, lastStage: timeline.last?.stage || "none" },
          guardrails: []
        };
    }

    function buildGrayAutoTrialGoNoGoDecisionText(limit = 48) {
      const decision = buildGrayAutoTrialGoNoGoDecision(limit);
      return typeof FOLLOWUP_READINESS_VIEW.buildGrayAutoTrialGoNoGoDecisionText === "function"
        ? FOLLOWUP_READINESS_VIEW.buildGrayAutoTrialGoNoGoDecisionText(decision)
        : "";
    }

    function buildGrayAutoTrialSignoffPackage(limit = 48) {
      const decision = buildGrayAutoTrialGoNoGoDecision(limit);
      const outcome = buildGrayAutoTrialOutcome(limit);
      const checklist = buildGrayAutoTrialPreRunChecklist();
      const timeline = buildGrayAutoTrialTimeline(limit);
      return typeof GRAY_TRIAL_READINESS_MODEL.buildSignoffPackage === "function"
        ? GRAY_TRIAL_READINESS_MODEL.buildSignoffPackage(
          { decision, outcome, checklist, timeline },
          { now: () => Date.now() }
        )
        : {
          readOnly: true,
          trialId: ["gray-trial", decision.outcome, timeline.last?.seq || 0, Date.now()].join("-"),
          decision: decision.decision,
          outcome: outcome.outcome,
          severity: outcome.severity,
          stageRecommendation: "Not ready for the next phase.",
          summary: outcome.summary,
          nextAction: decision.nextAction,
          missingRequired: decision.missingRequired,
          rootCauses: decision.rootCauses,
          timeline: decision.timeline,
          manualChecks: [],
          signoff: { tester: "", reviewedAt: "", approvedForNextPhase: false, notes: "" },
          checklistReady: checklist.readyForWatchedTrial === true
        };
    }

    function buildGrayAutoTrialSignoffPackageText(limit = 48) {
      const pkg = buildGrayAutoTrialSignoffPackage(limit);
      return typeof FOLLOWUP_READINESS_VIEW.buildGrayAutoTrialSignoffPackageText === "function"
        ? FOLLOWUP_READINESS_VIEW.buildGrayAutoTrialSignoffPackageText(pkg)
        : "";
    }

    function buildGrayAutoTrialCharacterCuePreview(limit = 48) {
      const signoff = buildGrayAutoTrialSignoffPackage(limit);
      const outcome = buildGrayAutoTrialOutcome(limit);
      return typeof GRAY_TRIAL_CHARACTER_MODEL.buildCharacterCuePreview === "function"
        ? GRAY_TRIAL_CHARACTER_MODEL.buildCharacterCuePreview(
          { signoff, outcome },
          { buildRuntimeHint: buildFollowupCharacterRuntimeHint }
        )
        : {
          readOnly: true,
          decision: String(signoff.decision || "NO_GO"),
          outcome: String(outcome.outcome || "not_started"),
          label: "先安静待着",
          mood: "idle",
          tone: "quiet",
          description: "当前不适合进入试跑，角色保持安静与待命。",
          sample: "我先安静待着，等你准备好了再说。",
          runtimeHint: buildFollowupCharacterRuntimeHint({ label: "先安静待着", tone: "quiet" }),
          stageRecommendation: signoff.stageRecommendation,
          nextAction: signoff.nextAction,
          safety: { noEventEmission: true, noRuntimeHintEmission: true, noLive2DMove: true, noTts: true, noModelCall: true, noFetch: true, noPollingStart: true, noFollowupExecution: true, noConfigWrites: true }
        };
    }

    function buildGrayAutoTrialCharacterCuePreviewText(limit = 48) {
      const preview = buildGrayAutoTrialCharacterCuePreview(limit);
      return typeof GRAY_TRIAL_CHARACTER_VIEW.buildCharacterCuePreviewText === "function"
        ? GRAY_TRIAL_CHARACTER_VIEW.buildCharacterCuePreviewText(preview)
        : "";
    }

    function buildGrayAutoTrialCharacterCueHandoffChecklist(limit = 48) {
      const preview = buildGrayAutoTrialCharacterCuePreview(limit);
      const signoff = buildGrayAutoTrialSignoffPackage(limit);
      const now = Date.now();
      let normalizedRuntimeHint = null;
      let runtimeHintValid = false;
      try {
        normalizedRuntimeHint = normalizeCharacterRuntimeMetadataForFrontend(preview.runtimeHint);
        runtimeHintValid = !!normalizedRuntimeHint;
      } catch (_) {
        normalizedRuntimeHint = null;
      }
      const lastHintAt = Number(state.followupCharacterRuntimeLastHintAt || 0);
      const recentRuntimeEmission = lastHintAt > 0 && now - lastHintAt < 30000;
      const safety = preview.safety || {};
      const allowedDecisions = ["NO_GO", "WATCH_ONLY", "GO_FOR_WATCHED_TRIAL", "REVIEW_AFTER_SUCCESS"];
      const items = [
        {
          key: "preview_read_only",
          label: "角色预览仍是只读",
          required: true,
          ok: preview.readOnly === true
            && safety.noRuntimeHintEmission === true
            && safety.noLive2DMove === true
            && safety.noTts === true,
          note: "预览只能描述角色表现，不能发出真实 runtime hint。"
        },
        {
          key: "runtime_hint_shape",
          label: "runtime hint 形状可被前端规范化",
          required: true,
          ok: runtimeHintValid,
          note: runtimeHintValid
            ? `emotion=${normalizedRuntimeHint.emotion || "n/a"} action=${normalizedRuntimeHint.action || "n/a"} live2d_hint=${normalizedRuntimeHint.live2d_hint || "n/a"}`
            : "当前 runtime metadata normalizer 不可用，或预览 hint 被拒绝。"
        },
        {
          key: "decision_boundary_visible",
          label: "Go/No-Go 边界可见",
          required: true,
          ok: allowedDecisions.includes(preview.decision),
          note: `decision=${preview.decision} outcome=${preview.outcome}`
        },
        {
          key: "manual_signoff_required",
          label: "人工签收仍未自动批准",
          required: true,
          ok: signoff.signoff?.approvedForNextPhase === false,
          note: "approvedForNextPhase=false，不能自动进入真实角色动作。"
        },
        {
          key: "no_recent_runtime_emission",
          label: "最近没有新的真实角色 hint 压力",
          required: false,
          ok: !recentRuntimeEmission,
          note: recentRuntimeEmission
            ? `lastHintAgeMs=${Math.max(0, now - lastHintAt)}`
            : "没有 30 秒内的新 followup_character_runtime_hint。"
        },
        {
          key: "scheduler_unchanged",
          label: "scheduler 与续话执行未被接入",
          required: true,
          ok: safety.noPollingStart === true
            && safety.noFollowupExecution === true
            && safety.noModelCall === true
            && safety.noFetch === true
            && safety.noConfigWrites === true,
          note: "接入前检查不 arm/reset、不启动 polling、不触发续话、不写配置。"
        },
        {
          key: "runtime_emission_gate",
          label: "灰度续话自动角色动作仍需显式开关",
          required: true,
          ok: false,
          note: "灰度续话 automatic emission 仍关闭；助手回复 cue 自动应用只受 auto_apply_reply_cue 显式开关控制。"
        }
      ];
      const blockingRequired = items.filter((item) => item.required === true && item.ok !== true);
      const readyForImplementationPlanning = blockingRequired.every((item) => item.key === "runtime_emission_gate");
      return {
        readOnly: true,
        status: blockingRequired.length > 0 ? "preview_only" : "ready_for_explicit_handoff",
        readyForImplementationPlanning,
        manualEmitGateAvailable: true,
        readyForRuntimeEmission: false,
        decision: preview.decision,
        outcome: preview.outcome,
        label: preview.label,
        tone: preview.tone,
        runtimeHint: preview.runtimeHint,
        normalizedRuntimeHint,
        items,
        blockingRequired,
        nextAction: readyForImplementationPlanning
          ? "Use the manual emit gate only with the exact confirmation phrase; keep automatic emission closed."
          : "Keep this as preview-only; resolve required checklist items before adding any real character emission path.",
        safety: {
          noEventEmission: true,
          noRuntimeHintEmission: true,
          noLive2DMove: true,
          noTts: true,
          noModelCall: true,
          noFetch: true,
          noPollingStart: true,
          noFollowupExecution: true,
          noConfigWrites: true
        }
      };
    }

    function buildGrayAutoTrialCharacterCueHandoffChecklistText(limit = 48) {
      const checklist = buildGrayAutoTrialCharacterCueHandoffChecklist(limit);
      const manualEmitStatus = getGrayAutoTrialCharacterCueManualEmitStatus();
      return typeof GRAY_TRIAL_CHARACTER_VIEW.buildCharacterCueHandoffChecklistText === "function"
        ? GRAY_TRIAL_CHARACTER_VIEW.buildCharacterCueHandoffChecklistText(checklist, manualEmitStatus)
        : "";
    }

    function getGrayAutoTrialCharacterCueManualEmitStatus() {
      const count = Number(state.grayAutoTrialCharacterCueManualEmitCount || 0);
      const lastEmitAt = Number(state.grayAutoTrialCharacterCueLastManualEmitAt || 0);
      const lastEmit = state.grayAutoTrialCharacterCueLastManualEmit || null;
      const lastBackendBridge = state.grayAutoTrialCharacterCueLastBackendBridge || null;
      const lastRuntimeDispatch = state.followupCharacterRuntimeLastDispatch || null;
      const lastRuntimeApply = state.followupCharacterRuntimeLastApply || null;
      const lastReplyCandidate = state.followupCharacterRuntimeLastReplyCandidate || null;
      return {
        readOnly: true,
        count: Number.isFinite(count) ? Math.max(0, Math.round(count)) : 0,
        lastEmitAt,
        lastEmit,
        lastBackendBridge,
        lastRuntimeDispatch,
        lastRuntimeApply,
        lastReplyCandidate
      };
    }

    function buildGrayAutoTrialCharacterCueManualEmitStatusText() {
      const status = getGrayAutoTrialCharacterCueManualEmitStatus();
      return typeof GRAY_TRIAL_CHARACTER_VIEW.buildCharacterCueManualEmitStatusText === "function"
        ? GRAY_TRIAL_CHARACTER_VIEW.buildCharacterCueManualEmitStatusText(status)
        : "";
    }

    function buildGrayAutoTrialCharacterManualCueStatusCardText() {
      const status = getGrayAutoTrialCharacterCueManualEmitStatus();
      const autoApply = state.followupCharacterRuntimeLastReplyAutoApply || null;
      const selectedPreset = getSelectedGrayAutoTrialCharacterCuePresetKey();
      const preset = resolveGrayAutoTrialCharacterCuePreset({ presetKey: selectedPreset }, {
        label: "",
        tone: "",
        runtimeHint: {}
      });
      return typeof GRAY_TRIAL_CHARACTER_VIEW.buildCharacterManualCueStatusCardText === "function"
        ? GRAY_TRIAL_CHARACTER_VIEW.buildCharacterManualCueStatusCardText({
          status,
          autoApply,
          autoApplyReplyCueEnabled: state.characterRuntimeAutoApplyReplyCue === true,
          selectedPreset,
          preset
        })
        : "";
    }

    function buildGrayAutoTrialCharacterCueManualEmitRecap(limit = 24) {
      const safeLimit = Number.isFinite(Number(limit))
        ? Math.max(1, Math.min(80, Math.round(Number(limit))))
        : 24;
      const status = getGrayAutoTrialCharacterCueManualEmitStatus();
      const manualEmitStages = new Set([
        "conversation_followup_gray_auto_trial_character_cue_manual_emit",
        "conversation_followup_character_reply_cue_candidate_manual_emit"
      ]);
      const events = state.ttsDebugEvents
        .filter((event) => event && manualEmitStages.has(event.stage))
        .slice(-safeLimit);
      const lastEvent = events.length ? events[events.length - 1] : null;
      const lastEmit = status.lastEmit || null;
      const normalized = lastEmit?.runtimeHint || null;
      const lastRuntimeDispatch = status.lastRuntimeDispatch || lastEmit?.runtimeDispatch || null;
      const lastRuntimeApply = status.lastRuntimeApply || lastEmit?.runtimeApply || null;
      const accepted = !!lastEmit && !!normalized && status.count > 0;
      const source = String(lastEmit?.source || (lastEmit?.presetKey === "reply_candidate" ? "assistant_reply_candidate" : "manual_preset"));
      const lastBackendBridge = status.lastBackendBridge || lastEmit?.backendBridge || null;
      const replyCandidate = status.lastReplyCandidate || null;
      const replyCandidateSent = source === "assistant_reply_candidate"
        && !!replyCandidate
        && lastEmit?.replyCandidateGeneratedAt === replyCandidate.generatedAt;
      return {
        readOnly: true,
        status: accepted ? "emitted" : "not_emitted",
        count: status.count,
        lastEmitAt: status.lastEmitAt,
        lastEmit,
        source,
        lastBackendBridge,
        lastRuntimeDispatch,
        lastRuntimeApply,
        replyCandidate,
        replyCandidateSent,
        lastEvent,
        recentEvents: events,
        accepted,
        summary: accepted
          ? `Last manual cue emitted from ${source}: ${lastEmit.label || "n/a"} / ${lastEmit.tone || "n/a"}.`
          : "No confirmed gray trial character cue manual emit has been recorded in this renderer session.",
        nextAction: accepted
          ? "Review the visible character response before deciding whether to refine the role-expression strategy."
          : "Use the manual emit gate only during a watched local test if you need a real character runtime cue.",
        safety: {
          noNewRuntimeHintEmission: true,
          noLive2DMove: true,
          noTts: true,
          noModelCall: true,
          noFetch: true,
          noPollingStart: true,
          noFollowupExecution: true,
          noConfigWrites: true
        }
      };
    }

    function buildGrayAutoTrialCharacterCueManualEmitRecapText(limit = 24) {
      const recap = buildGrayAutoTrialCharacterCueManualEmitRecap(limit);
      return typeof GRAY_TRIAL_CHARACTER_VIEW.buildCharacterCueManualEmitRecapText === "function"
        ? GRAY_TRIAL_CHARACTER_VIEW.buildCharacterCueManualEmitRecapText(recap)
        : "";
    }

    function buildGrayAutoTrialCharacterExpressionStrategyDraft(limit = 24) {
      const preview = buildGrayAutoTrialCharacterCuePreview(limit);
      const checklist = buildGrayAutoTrialCharacterCueHandoffChecklist(limit);
      const recap = buildGrayAutoTrialCharacterCueManualEmitRecap(limit);
      return typeof GRAY_TRIAL_CHARACTER_MODEL.buildExpressionStrategyDraft === "function"
        ? GRAY_TRIAL_CHARACTER_MODEL.buildExpressionStrategyDraft(
          { preview, checklist, recap },
          { buildRuntimeHint: buildFollowupCharacterRuntimeHint }
        )
        : {
          readOnly: true,
          status: "draft_only",
          decision: preview.decision,
          outcome: preview.outcome,
          activeRuleKey: "",
          activeRule: null,
          rules: [],
          manualEmitAccepted: recap.accepted === true,
          readyForImplementationPlanning: checklist.readyForImplementationPlanning === true,
          readyForAutomaticRuntime: false,
          nextAction: "Review the draft rules and one manual emit recap before deciding whether to create a separate strategy implementation task."
        };
    }

    function buildGrayAutoTrialCharacterExpressionStrategyDraftText(limit = 24) {
      const draft = buildGrayAutoTrialCharacterExpressionStrategyDraft(limit);
      return typeof GRAY_TRIAL_CHARACTER_VIEW.buildExpressionStrategyDraftText === "function"
        ? GRAY_TRIAL_CHARACTER_VIEW.buildExpressionStrategyDraftText(draft)
        : "";
    }

    function buildGrayAutoTrialCharacterExpressionStrategyReviewPackage(limit = 24) {
      const strategy = buildGrayAutoTrialCharacterExpressionStrategyDraft(limit);
      const recap = buildGrayAutoTrialCharacterCueManualEmitRecap(limit);
      const checklist = buildGrayAutoTrialCharacterCueHandoffChecklist(limit);
      const signoff = buildGrayAutoTrialSignoffPackage(limit);
      const activeRule = strategy.activeRule || {};
      const missing = [];
      if (strategy.rules.length < 5) {
        missing.push({
          key: "rule_coverage",
          reason: "strategy draft should cover the five minimum expression states"
        });
      }
      if (checklist.readyForImplementationPlanning !== true) {
        missing.push({
          key: "handoff_checklist",
          reason: "handoff checklist is not ready for implementation planning"
        });
      }
      if (recap.accepted !== true) {
        missing.push({
          key: "manual_emit_recap",
          reason: "no accepted manual cue emit has been reviewed in this renderer session"
        });
      }
      if (signoff.signoff?.approvedForNextPhase !== false) {
        missing.push({
          key: "manual_signoff_boundary",
          reason: "manual signoff boundary must remain false before automatic runtime"
        });
      }
      const goNoGo = missing.length === 0
        ? "READY_FOR_SEPARATE_IMPLEMENTATION_TASK"
        : "NO_GO_FOR_AUTOMATIC_RUNTIME";
      return {
        readOnly: true,
        status: "review_package",
        goNoGo,
        decision: strategy.decision,
        outcome: strategy.outcome,
        activeRuleKey: strategy.activeRuleKey,
        activeRule,
        ruleCount: strategy.rules.length,
        manualEmitAccepted: recap.accepted === true,
        checklistReady: checklist.readyForImplementationPlanning === true,
        approvedForNextPhase: false,
        missing,
        nextAction: goNoGo === "READY_FOR_SEPARATE_IMPLEMENTATION_TASK"
          ? "Create a separate, explicitly gated implementation task; keep automatic runtime disabled by default."
          : "Keep reviewing with manual emit and recap before implementing automatic role-expression behavior.",
        safety: {
          noRuntimeHintEmission: true,
          noLive2DMove: true,
          noTts: true,
          noModelCall: true,
          noFetch: true,
          noPollingStart: true,
          noFollowupExecution: true,
          noConfigWrites: true,
          readyForAutomaticRuntime: false
        }
      };
    }

    function buildGrayAutoTrialCharacterExpressionStrategyReviewPackageText(limit = 24) {
      const review = buildGrayAutoTrialCharacterExpressionStrategyReviewPackage(limit);
      return typeof GRAY_TRIAL_CHARACTER_VIEW.buildExpressionStrategyReviewPackageText === "function"
        ? GRAY_TRIAL_CHARACTER_VIEW.buildExpressionStrategyReviewPackageText(review)
        : "";
    }


    function buildGrayAutoTrialCharacterAutoRuntimeSafetyPlan(limit = 24) {
      const review = buildGrayAutoTrialCharacterExpressionStrategyReviewPackage(limit);
      const strategy = buildGrayAutoTrialCharacterExpressionStrategyDraft(limit);
      const recap = buildGrayAutoTrialCharacterCueManualEmitRecap(limit);
      const checklist = buildGrayAutoTrialCharacterCueHandoffChecklist(limit);
      return typeof GRAY_TRIAL_AUTO_RUNTIME_SWITCH_MODEL.buildSafetyPlan === "function"
        ? GRAY_TRIAL_AUTO_RUNTIME_SWITCH_MODEL.buildSafetyPlan({ review, strategy, recap, checklist })
        : {
          readOnly: true,
          status: "blocked_for_auto_runtime",
          canPlanRollout: false,
          goNoGo: review.goNoGo,
          decision: review.decision,
          outcome: review.outcome,
          strategyStatus: strategy.status,
          ruleCount: Array.isArray(strategy.rules) ? strategy.rules.length : 0,
          manualEmitAccepted: recap.accepted === true,
          checklistReady: checklist.readyForImplementationPlanning === true,
          gates: [],
          blockingRequired: [{ key: "switch_model_unavailable", note: "auto runtime switch model unavailable" }],
          rolloutStages: [],
          nextAction: "Keep automatic character runtime disabled."
        };
    }

    function buildGrayAutoTrialCharacterAutoRuntimeSafetyPlanText(limit = 24) {
      const plan = buildGrayAutoTrialCharacterAutoRuntimeSafetyPlan(limit);
      return typeof GRAY_TRIAL_CHARACTER_VIEW.buildAutoRuntimeSafetyPlanText === "function"
        ? GRAY_TRIAL_CHARACTER_VIEW.buildAutoRuntimeSafetyPlanText(plan)
        : "";
    }

    function buildGrayAutoTrialCharacterAutoRuntimeDryRun(limit = 24) {
      const plan = buildGrayAutoTrialCharacterAutoRuntimeSafetyPlan(limit);
      const strategy = buildGrayAutoTrialCharacterExpressionStrategyDraft(limit);
      const review = buildGrayAutoTrialCharacterExpressionStrategyReviewPackage(limit);
      return typeof GRAY_TRIAL_CHARACTER_MODEL.buildAutoRuntimeDryRun === "function"
        ? GRAY_TRIAL_CHARACTER_MODEL.buildAutoRuntimeDryRun({ plan, strategy, review })
        : {
          readOnly: true,
          status: "blocked",
          wouldEmit: false,
          wouldSelectRule: false,
          selectedRuleKey: "",
          selectedRule: null,
          runtimeHint: null,
          blockedReasons: ["character_model_unavailable"],
          planStatus: plan.status,
          goNoGo: review.goNoGo,
          dryRunOnly: true,
          nextAction: "Keep automatic runtime disabled; resolve blockers before implementation."
        };
    }

    function buildGrayAutoTrialCharacterAutoRuntimeDryRunText(limit = 24) {
      const dryRun = buildGrayAutoTrialCharacterAutoRuntimeDryRun(limit);
      return typeof GRAY_TRIAL_CHARACTER_VIEW.buildAutoRuntimeDryRunText === "function"
        ? GRAY_TRIAL_CHARACTER_VIEW.buildAutoRuntimeDryRunText(dryRun)
        : "";
    }


    function buildGrayAutoTrialCharacterAutoRuntimeExplicitSwitchPlan(limit = 24) {
      const plan = buildGrayAutoTrialCharacterAutoRuntimeSafetyPlan(limit);
      const dryRun = buildGrayAutoTrialCharacterAutoRuntimeDryRun(limit);
      const review = buildGrayAutoTrialCharacterExpressionStrategyReviewPackage(limit);
      const session = buildGrayAutoTrialSessionState();
      return typeof GRAY_TRIAL_AUTO_RUNTIME_SWITCH_MODEL.buildExplicitSwitchPlan === "function"
        ? GRAY_TRIAL_AUTO_RUNTIME_SWITCH_MODEL.buildExplicitSwitchPlan({ plan, dryRun, review, session })
        : {
          readOnly: true,
          status: "blocked_until_explicit_switch_task",
          proposedSwitchKey: "gray_auto_followup_character_runtime_enabled",
          proposedDefault: false,
          switchExists: false,
          wouldEnable: false,
          automaticRuntimeConnected: false,
          wouldEmit: false,
          planStatus: plan.status,
          dryRunStatus: dryRun.status,
          goNoGo: review.goNoGo,
          requirements: [],
          blockingRequired: [{ key: "switch_model_unavailable", note: "auto runtime switch model unavailable" }],
          proposedRuntimeStates: [],
          nextAction: "Keep automatic character runtime disabled."
        };
    }

    function buildGrayAutoTrialCharacterAutoRuntimeExplicitSwitchPlanText(limit = 24) {
      const switchPlan = buildGrayAutoTrialCharacterAutoRuntimeExplicitSwitchPlan(limit);
      return typeof GRAY_TRIAL_CHARACTER_VIEW.buildExplicitSwitchPlanText === "function"
        ? GRAY_TRIAL_CHARACTER_VIEW.buildExplicitSwitchPlanText(switchPlan)
        : "";
    }


    function buildGrayAutoTrialCharacterAutoRuntimeExplicitSwitchReviewPackage(limit = 24) {
      const switchPlan = buildGrayAutoTrialCharacterAutoRuntimeExplicitSwitchPlan(limit);
      const review = buildGrayAutoTrialCharacterExpressionStrategyReviewPackage(limit);
      const dryRun = buildGrayAutoTrialCharacterAutoRuntimeDryRun(limit);
      const plan = buildGrayAutoTrialCharacterAutoRuntimeSafetyPlan(limit);
      return typeof GRAY_TRIAL_AUTO_RUNTIME_SWITCH_MODEL.buildExplicitSwitchReviewPackage === "function"
        ? GRAY_TRIAL_AUTO_RUNTIME_SWITCH_MODEL.buildExplicitSwitchReviewPackage({ switchPlan, review, dryRun, plan })
        : {
          readOnly: true,
          status: "blocked_for_explicit_switch_task",
          goNoGo: "NO_GO_FOR_AUTOMATIC_RUNTIME",
          switchPlanStatus: switchPlan.status,
          switchPlanDefault: switchPlan.proposedDefault === false,
          strategyGoNoGo: review.goNoGo,
          dryRunStatus: dryRun.status,
          dryRunWouldSelectRule: dryRun.wouldSelectRule === true,
          planStatus: plan.status,
          requirements: switchPlan.requirements || [],
          blockingRequired: switchPlan.blockingRequired || [],
          missing: [{ key: "switch_model_unavailable", reason: "auto runtime switch model unavailable" }],
          approvedForNextPhase: false,
          nextAction: "Keep the explicit switch read-only."
        };
    }

    function buildGrayAutoTrialCharacterAutoRuntimeExplicitSwitchReviewPackageText(limit = 24) {
      const reviewPackage = buildGrayAutoTrialCharacterAutoRuntimeExplicitSwitchReviewPackage(limit);
      return typeof GRAY_TRIAL_CHARACTER_VIEW.buildExplicitSwitchReviewPackageText === "function"
        ? GRAY_TRIAL_CHARACTER_VIEW.buildExplicitSwitchReviewPackageText(reviewPackage)
        : "";
    }


    function buildGrayAutoTrialCharacterAutoRuntimeSwitchAcceptancePackage(limit = 24) {
      const reviewPackage = buildGrayAutoTrialCharacterAutoRuntimeExplicitSwitchReviewPackage(limit);
      const switchPlan = buildGrayAutoTrialCharacterAutoRuntimeExplicitSwitchPlan(limit);
      const dryRun = buildGrayAutoTrialCharacterAutoRuntimeDryRun(limit);
      return typeof GRAY_TRIAL_AUTO_RUNTIME_SWITCH_MODEL.buildSwitchAcceptancePackage === "function"
        ? GRAY_TRIAL_AUTO_RUNTIME_SWITCH_MODEL.buildSwitchAcceptancePackage({ reviewPackage, switchPlan, dryRun })
        : {
          readOnly: true,
          status: "acceptance_not_ready",
          goNoGo: "NO_GO_FOR_AUTOMATIC_RUNTIME",
          implementationReady: false,
          approvedForNextPhase: false,
          reviewGoNoGo: reviewPackage.goNoGo,
          switchPlanStatus: switchPlan.status,
          dryRunStatus: dryRun.status,
          acceptanceChecks: [],
          blockingRequired: [{ key: "switch_model_unavailable", verify: "auto runtime switch model unavailable" }],
          manualVerificationRequired: true,
          nextAction: "Keep automatic runtime disabled now."
        };
    }

    function buildGrayAutoTrialCharacterAutoRuntimeSwitchAcceptancePackageText(limit = 24) {
      const acceptance = buildGrayAutoTrialCharacterAutoRuntimeSwitchAcceptancePackage(limit);
      return typeof GRAY_TRIAL_CHARACTER_VIEW.buildSwitchAcceptancePackageText === "function"
        ? GRAY_TRIAL_CHARACTER_VIEW.buildSwitchAcceptancePackageText(acceptance)
        : "";
    }

    function getGrayAutoTrialCharacterAutoRuntimeExplicitSwitchEnabled() {
      return state.grayAutoTrialCharacterAutoRuntimeExplicitSwitchEnabled === true;
    }

    function getGrayAutoTrialCharacterAutoRuntimeExplicitSwitchState() {
      return {
        enabled: getGrayAutoTrialCharacterAutoRuntimeExplicitSwitchEnabled(),
        lastAction: String(state.grayAutoTrialCharacterAutoRuntimeExplicitSwitchLastAction || ""),
        lastReason: String(state.grayAutoTrialCharacterAutoRuntimeExplicitSwitchLastReason || ""),
        updatedAt: Number(state.grayAutoTrialCharacterAutoRuntimeExplicitSwitchUpdatedAt || 0),
        rollbackAt: Number(state.grayAutoTrialCharacterAutoRuntimeExplicitSwitchRollbackAt || 0),
        rollbackReason: String(state.grayAutoTrialCharacterAutoRuntimeExplicitSwitchRollbackReason || "")
      };
    }


    function buildGrayAutoTrialCharacterAutoRuntimeExplicitSwitchControl(limit = 24) {
      const acceptance = buildGrayAutoTrialCharacterAutoRuntimeSwitchAcceptancePackage(limit);
      const switchState = getGrayAutoTrialCharacterAutoRuntimeExplicitSwitchState();
      return typeof GRAY_TRIAL_AUTO_RUNTIME_SWITCH_MODEL.buildExplicitSwitchControl === "function"
        ? GRAY_TRIAL_AUTO_RUNTIME_SWITCH_MODEL.buildExplicitSwitchControl({ acceptance, switchState })
        : {
          readOnly: true,
          status: switchState.enabled ? "enabled_local_flag_only" : "blocked",
          enabled: switchState.enabled,
          canEnable: false,
          canDisable: true,
          switchKey: "gray_auto_followup_character_runtime_enabled",
          requiredConfirm: "ENABLE_GRAY_AUTO_TRIAL_CHARACTER_AUTO_RUNTIME_SWITCH",
          disabledReason: "acceptance_not_ready",
          blockedReasons: ["switch_model_unavailable"],
          acceptanceStatus: acceptance.status,
          acceptanceGoNoGo: acceptance.goNoGo,
          acceptanceReady: false,
          manualVerificationRequired: true,
          autoRuntimeConnected: false,
          lastAction: switchState.lastAction,
          lastReason: switchState.lastReason,
          updatedAt: switchState.updatedAt,
          rollbackAt: switchState.rollbackAt,
          rollbackReason: switchState.rollbackReason,
          defaultOffBaseline: true,
          nextAction: "Keep the switch off."
        };
    }

    function buildGrayAutoTrialCharacterAutoRuntimeExplicitSwitchControlText(limit = 24) {
      const control = buildGrayAutoTrialCharacterAutoRuntimeExplicitSwitchControl(limit);
      return typeof GRAY_TRIAL_CHARACTER_VIEW.buildExplicitSwitchControlText === "function"
        ? GRAY_TRIAL_CHARACTER_VIEW.buildExplicitSwitchControlText(control)
        : "";
    }


    function buildGrayAutoTrialCharacterAutoRuntimeSwitchControlDiagnostics(limit = 24) {
      const control = buildGrayAutoTrialCharacterAutoRuntimeExplicitSwitchControl(limit);
      const acceptance = buildGrayAutoTrialCharacterAutoRuntimeSwitchAcceptancePackage(limit);
      return typeof GRAY_TRIAL_AUTO_RUNTIME_SWITCH_MODEL.buildSwitchControlDiagnostics === "function"
        ? GRAY_TRIAL_AUTO_RUNTIME_SWITCH_MODEL.buildSwitchControlDiagnostics({ control, acceptance })
        : {
          readOnly: true,
          status: "blocked_explained",
          enabled: control.enabled,
          canEnable: false,
          canDisable: control.canDisable,
          disabledReason: control.disabledReason,
          blockedReasons: control.blockedReasons || [],
          blockerDetails: [],
          acceptanceBlocking: [],
          operatorChecklist: [],
          nextAction: "Keep the switch off."
        };
    }

    function buildGrayAutoTrialCharacterAutoRuntimeSwitchControlDiagnosticsText(limit = 24) {
      const diagnostics = buildGrayAutoTrialCharacterAutoRuntimeSwitchControlDiagnostics(limit);
      return typeof GRAY_TRIAL_CHARACTER_VIEW.buildSwitchControlDiagnosticsText === "function"
        ? GRAY_TRIAL_CHARACTER_VIEW.buildSwitchControlDiagnosticsText(diagnostics)
        : "";
    }


    function buildGrayAutoTrialCharacterAutoRuntimeExplicitSwitchRollbackPackage(limit = 24) {
      const control = buildGrayAutoTrialCharacterAutoRuntimeExplicitSwitchControl(limit);
      const diagnostics = buildGrayAutoTrialCharacterAutoRuntimeSwitchControlDiagnostics(limit);
      const switchState = getGrayAutoTrialCharacterAutoRuntimeExplicitSwitchState();
      return typeof GRAY_TRIAL_AUTO_RUNTIME_SWITCH_MODEL.buildExplicitSwitchRollbackPackage === "function"
        ? GRAY_TRIAL_AUTO_RUNTIME_SWITCH_MODEL.buildExplicitSwitchRollbackPackage({ control, diagnostics, switchState })
        : {
          readOnly: true,
          ok: true,
          status: switchState.enabled ? "rollback_ready" : "default_off",
          enabled: switchState.enabled,
          canRollback: switchState.enabled,
          defaultOffBaseline: true,
          switchKey: control.switchKey,
          controlStatus: control.status,
          diagnosticsStatus: diagnostics.status,
          rollbackAt: switchState.rollbackAt,
          rollbackReason: switchState.rollbackReason,
          rollbackRecorded: Number(switchState.rollbackAt || 0) > 0,
          lastAction: control.lastAction,
          lastReason: control.lastReason,
          nextAction: "Keep the switch default-off.",
          steps: []
        };
    }

    function buildGrayAutoTrialCharacterAutoRuntimeExplicitSwitchRollbackPackageText(limit = 24) {
      const rollback = buildGrayAutoTrialCharacterAutoRuntimeExplicitSwitchRollbackPackage(limit);
      return typeof GRAY_TRIAL_CHARACTER_VIEW.buildExplicitSwitchRollbackPackageText === "function"
        ? GRAY_TRIAL_CHARACTER_VIEW.buildExplicitSwitchRollbackPackageText(rollback)
        : "";
    }


    function buildGrayAutoTrialCharacterAutoRuntimeFinalPreflight(limit = 24) {
      const plan = buildGrayAutoTrialCharacterAutoRuntimeExplicitSwitchPlan(limit);
      const review = buildGrayAutoTrialCharacterAutoRuntimeExplicitSwitchReviewPackage(limit);
      const acceptance = buildGrayAutoTrialCharacterAutoRuntimeSwitchAcceptancePackage(limit);
      const control = buildGrayAutoTrialCharacterAutoRuntimeExplicitSwitchControl(limit);
      const diagnostics = buildGrayAutoTrialCharacterAutoRuntimeSwitchControlDiagnostics(limit);
      const rollback = buildGrayAutoTrialCharacterAutoRuntimeExplicitSwitchRollbackPackage(limit);
      return typeof GRAY_TRIAL_AUTO_RUNTIME_SWITCH_MODEL.buildFinalPreflight === "function"
        ? GRAY_TRIAL_AUTO_RUNTIME_SWITCH_MODEL.buildFinalPreflight({ plan, review, acceptance, control, diagnostics, rollback })
        : {
          readOnly: true,
          ok: false,
          status: "blocked_for_handoff",
          goNoGo: "NO_GO_FOR_AUTOMATIC_RUNTIME",
          implementationReady: false,
          separateImplementationTaskReady: false,
          defaultOffBaseline: true,
          automaticRuntimeConnected: false,
          manualVerificationRequired: true,
          chain: {},
          gates: [],
          blockingRequired: [{ key: "switch_model_unavailable", note: "auto runtime switch model unavailable" }],
          nextAction: "Keep the chain read-only."
        };
    }

    function buildGrayAutoTrialCharacterAutoRuntimeFinalPreflightText(limit = 24) {
      const preflight = buildGrayAutoTrialCharacterAutoRuntimeFinalPreflight(limit);
      return typeof GRAY_TRIAL_CHARACTER_VIEW.buildFinalPreflightText === "function"
        ? GRAY_TRIAL_CHARACTER_VIEW.buildFinalPreflightText(preflight)
        : "";
    }


    function buildGrayAutoTrialCharacterAutoRuntimeSeparateImplementationDraft(limit = 24) {
      const preflight = buildGrayAutoTrialCharacterAutoRuntimeFinalPreflight(limit);
      return typeof GRAY_TRIAL_AUTO_RUNTIME_SWITCH_MODEL.buildSeparateImplementationDraft === "function"
        ? GRAY_TRIAL_AUTO_RUNTIME_SWITCH_MODEL.buildSeparateImplementationDraft({ preflight })
        : {
          readOnly: true,
          ok: false,
          status: "blocked_for_draft",
          defaultOffBaseline: true,
          automaticRuntimeConnected: false,
          implementationStarted: false,
          chainReady: false,
          preflightStatus: preflight.status,
          preflightReady: false,
          implementationModules: [],
          safetyBoundaries: [],
          verificationPlan: [],
          nextAction: "Do not wire automatic runtime yet."
        };
    }

    function buildGrayAutoTrialCharacterAutoRuntimeSeparateImplementationDraftText(limit = 24) {
      const draft = buildGrayAutoTrialCharacterAutoRuntimeSeparateImplementationDraft(limit);
      return typeof GRAY_TRIAL_CHARACTER_VIEW.buildSeparateImplementationDraftText === "function"
        ? GRAY_TRIAL_CHARACTER_VIEW.buildSeparateImplementationDraftText(draft)
        : "";
    }

    function enableGrayAutoTrialCharacterAutoRuntimeExplicitSwitch(input = {}) {
      const safeInput = input && typeof input === "object" ? input : {};
      const confirm = String(safeInput.confirm || "").trim();
      const requiredConfirm = "ENABLE_GRAY_AUTO_TRIAL_CHARACTER_AUTO_RUNTIME_SWITCH";
      if (confirm !== requiredConfirm) {
        return {
          ok: false,
          reason: "confirmation_required",
          requiredConfirm,
          safety: {
            noRuntimeHintEmission: true,
            noLive2DMove: true,
            noTts: true,
            noConfigWrites: true
          }
        };
      }
      const control = buildGrayAutoTrialCharacterAutoRuntimeExplicitSwitchControl();
      if (control.canEnable !== true) {
        return {
          ok: false,
          reason: "acceptance_not_ready",
          blockedReasons: control.blockedReasons,
          safety: {
            noRuntimeHintEmission: true,
            noLive2DMove: true,
            noTts: true,
            noConfigWrites: true
          }
        };
      }
      state.grayAutoTrialCharacterAutoRuntimeExplicitSwitchEnabled = true;
      state.grayAutoTrialCharacterAutoRuntimeExplicitSwitchUpdatedAt = Date.now();
      state.grayAutoTrialCharacterAutoRuntimeExplicitSwitchLastAction = "enable";
      state.grayAutoTrialCharacterAutoRuntimeExplicitSwitchLastReason = "";
      recordTTSDebugEvent("conversation_followup_gray_auto_trial_explicit_switch_enabled", {
        enabled: true,
        switchKey: "gray_auto_followup_character_runtime_enabled"
      });
      updateFollowupReadinessPanel();
      return {
        ok: true,
        enabled: true,
        switchKey: "gray_auto_followup_character_runtime_enabled",
        safety: {
          noRuntimeHintEmission: true,
          noLive2DMove: true,
          noTts: true,
          noConfigWrites: true,
          noSchedulerChange: true,
          noFollowupExecution: true,
          noPollingStart: true
        }
      };
    }

    function disableGrayAutoTrialCharacterAutoRuntimeExplicitSwitch(reason = "manual_disable") {
      state.grayAutoTrialCharacterAutoRuntimeExplicitSwitchEnabled = false;
      state.grayAutoTrialCharacterAutoRuntimeExplicitSwitchUpdatedAt = Date.now();
      state.grayAutoTrialCharacterAutoRuntimeExplicitSwitchLastAction = "disable";
      state.grayAutoTrialCharacterAutoRuntimeExplicitSwitchLastReason = String(reason || "manual_disable");
      recordTTSDebugEvent("conversation_followup_gray_auto_trial_explicit_switch_disabled", {
        enabled: false,
        reason: String(reason || "manual_disable"),
        switchKey: "gray_auto_followup_character_runtime_enabled"
      });
      updateFollowupReadinessPanel();
      return {
        ok: true,
        enabled: false,
        switchKey: "gray_auto_followup_character_runtime_enabled",
        safety: {
          noRuntimeHintEmission: true,
          noLive2DMove: true,
          noTts: true,
          noConfigWrites: true,
          noSchedulerChange: true,
          noFollowupExecution: true,
          noPollingStart: true
        }
      };
    }

    function rollbackGrayAutoTrialCharacterAutoRuntimeExplicitSwitch(reason = "manual_rollback") {
      const rollbackReason = String(reason || "manual_rollback");
      const now = Date.now();
      state.grayAutoTrialCharacterAutoRuntimeExplicitSwitchEnabled = false;
      state.grayAutoTrialCharacterAutoRuntimeExplicitSwitchUpdatedAt = now;
      state.grayAutoTrialCharacterAutoRuntimeExplicitSwitchLastAction = "rollback";
      state.grayAutoTrialCharacterAutoRuntimeExplicitSwitchLastReason = rollbackReason;
      state.grayAutoTrialCharacterAutoRuntimeExplicitSwitchRollbackAt = now;
      state.grayAutoTrialCharacterAutoRuntimeExplicitSwitchRollbackReason = rollbackReason;
      recordTTSDebugEvent("conversation_followup_gray_auto_trial_explicit_switch_rollback", {
        enabled: false,
        reason: rollbackReason,
        switchKey: "gray_auto_followup_character_runtime_enabled"
      });
      updateFollowupReadinessPanel();
      return {
        ok: true,
        enabled: false,
        switchKey: "gray_auto_followup_character_runtime_enabled",
        rollbackAt: now,
        rollbackReason,
        safety: {
          noRuntimeHintEmission: true,
          noLive2DMove: true,
          noTts: true,
          noConfigWrites: true,
          noSchedulerChange: true,
          noFollowupExecution: true,
          noPollingStart: true
        }
      };
    }

    function emitGrayAutoTrialCharacterCueManually(input = {}) {
      const safeInput = input && typeof input === "object" ? input : {};
      const confirm = String(safeInput.confirm || "").trim();
      const requiredConfirm = "EMIT_GRAY_AUTO_TRIAL_CHARACTER_CUE";
      if (confirm !== requiredConfirm) {
        return {
          ok: false,
          reason: "confirmation_required",
          requiredConfirm,
          safety: {
            noEventEmission: true,
            noSchedulerChange: true,
            noFollowupExecution: true,
            noConfigWrites: true
          }
        };
      }
      const checklist = buildGrayAutoTrialCharacterCueHandoffChecklist();
      if (checklist.readyForImplementationPlanning !== true) {
        return {
          ok: false,
          reason: "handoff_checklist_not_ready",
          checklistStatus: checklist.status,
          blockingRequired: Array.isArray(checklist.blockingRequired) ? checklist.blockingRequired.slice() : [],
          safety: {
            noEventEmission: true,
            noSchedulerChange: true,
            noFollowupExecution: true,
            noConfigWrites: true
          }
        };
      }
      const cuePreset = resolveGrayAutoTrialCharacterCuePreset(safeInput, checklist);
      let normalized = null;
      try {
        normalized = handleCharacterRuntimeMetadata(cuePreset.runtimeHint);
      } catch (_) {
        normalized = null;
      }
      if (!normalized) {
        return {
          ok: false,
          reason: "runtime_hint_rejected",
          checklistStatus: checklist.status,
          safety: {
            noSchedulerChange: true,
            noFollowupExecution: true,
            noConfigWrites: true
          }
        };
      }
      const count = getGrayAutoTrialCharacterCueManualEmitStatus().count + 1;
      state.grayAutoTrialCharacterCueManualEmitCount = count;
      state.grayAutoTrialCharacterCueLastManualEmitAt = Date.now();
      state.grayAutoTrialCharacterCueLastManualEmit = {
        decision: checklist.decision,
        outcome: checklist.outcome,
        label: cuePreset.label,
        tone: cuePreset.tone,
        presetKey: cuePreset.key,
        presetDescription: cuePreset.description,
        runtimeHint: normalized,
        runtimeDispatch: state.followupCharacterRuntimeLastDispatch || null,
        runtimeApply: state.followupCharacterRuntimeLastApply || null
      };
      recordTTSDebugEvent("conversation_followup_gray_auto_trial_character_cue_manual_emit", {
        text: String(cuePreset.label || ""),
        result: [`count:${count}`, `preset:${cuePreset.key}`, `decision:${checklist.decision}`, `outcome:${checklist.outcome}`].join(";"),
        error: String(normalized.emotion || "")
      });
      updateFollowupReadinessPanel();
      return {
        ok: true,
        count,
        decision: checklist.decision,
        outcome: checklist.outcome,
        label: cuePreset.label,
        tone: cuePreset.tone,
        presetKey: cuePreset.key,
        presetDescription: cuePreset.description,
        runtimeHint: normalized,
        checklistStatus: checklist.status,
        safety: {
          readOnly: false,
          explicitConfirmationRequired: true,
          noSchedulerChange: true,
          noFollowupExecution: true,
          noConfigWrites: true
        }
      };
    }

    async function previewGrayAutoTrialCharacterCueBackendBridge(checklist = null) {
      const safeChecklist = checklist && typeof checklist === "object"
        ? checklist
        : buildGrayAutoTrialCharacterCueHandoffChecklist();
      const requestBody = {
        type: "automatic_character_runtime",
        action: "emit_runtime_cue"
      };
      let payload = null;
      try {
        const resp = await authFetch("/api/character_runtime/backend_entry/preview", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(requestBody),
          cache: "no-store"
        });
        payload = await resp.json().catch(() => ({}));
        if (!resp.ok) {
          throw new Error(payload?.error || `HTTP ${resp.status}`);
        }
      } catch (error) {
        const failed = {
          ok: false,
          reason: "backend_preview_failed",
          error: String(error?.message || error || "unknown"),
          requestBody,
          label: safeChecklist.label || "",
          tone: safeChecklist.tone || "",
          backendNoop: false,
          wouldExecute: false,
          dispatched: false,
          safety: {
            noSchedulerChange: true,
            noFollowupExecution: true,
            noConfigWrites: true,
            noTts: true
          }
        };
        state.grayAutoTrialCharacterCueLastBackendBridge = failed;
        recordTTSDebugEvent("conversation_followup_gray_auto_trial_character_cue_backend_bridge", {
          text: String(safeChecklist.label || ""),
          result: "failed",
          error: failed.error
        });
        return failed;
      }
      const preview = payload && typeof payload.character_runtime_backend_entry_preview === "object"
        ? payload.character_runtime_backend_entry_preview
        : {};
      const adapter = payload && typeof payload.character_runtime_backend_entry_adapter_preview === "object"
        ? payload.character_runtime_backend_entry_adapter_preview
        : {};
      const backendNoop = adapter.noop === true
        && adapter.adapter_ready === false
        && adapter.executed === false
        && adapter.dispatched === false
        && adapter.dispatch_target === "none";
      const wouldExecute = preview.would_execute === true || adapter.would_execute === true;
      const bridge = {
        ok: backendNoop && !wouldExecute,
        reason: backendNoop && !wouldExecute ? "backend_preview_noop_confirmed" : "backend_preview_not_safe",
        requestBody,
        label: safeChecklist.label || "",
        tone: safeChecklist.tone || "",
        backendNoop,
        accepted: preview.accepted === true || adapter.accepted === true,
        wouldExecute,
        dispatched: adapter.dispatched === true,
        preview,
        adapter,
        safety: {
          backendExecutionDisabled: adapter.executed !== true,
          backendDispatchDisabled: adapter.dispatched !== true,
          noSchedulerChange: true,
          noFollowupExecution: true,
          noConfigWrites: true,
          noTts: true
        }
      };
      state.grayAutoTrialCharacterCueLastBackendBridge = bridge;
      recordTTSDebugEvent("conversation_followup_gray_auto_trial_character_cue_backend_bridge", {
        text: String(safeChecklist.label || ""),
        result: bridge.reason,
        error: bridge.ok ? "" : "blocked"
      });
      return bridge;
    }

    function getSelectedGrayAutoTrialCharacterCuePresetKey() {
      const select = state.followupReadinessTrialCharacterCuePresetSelect;
      return normalizeGrayAutoTrialCharacterCuePresetKey(select && typeof select.value === "string" ? select.value : "auto");
    }

    async function emitGrayAutoTrialCharacterCueViaManualBridge(input = {}) {
      const safeInput = input && typeof input === "object" ? input : {};
      const confirm = String(safeInput.confirm || "").trim();
      const requiredConfirm = "EMIT_GRAY_AUTO_TRIAL_CHARACTER_CUE";
      if (confirm !== requiredConfirm) {
        return {
          ok: false,
          reason: "confirmation_required",
          requiredConfirm,
          safety: {
            noEventEmission: true,
            noSchedulerChange: true,
            noFollowupExecution: true,
            noConfigWrites: true
          }
        };
      }
      const checklist = buildGrayAutoTrialCharacterCueHandoffChecklist();
      const cuePreset = resolveGrayAutoTrialCharacterCuePreset(safeInput, checklist);
      const backendBridge = await previewGrayAutoTrialCharacterCueBackendBridge(checklist);
      if (backendBridge.ok !== true) {
        return {
          ok: false,
          reason: backendBridge.reason || "backend_bridge_blocked",
          backendBridge,
          checklistStatus: checklist.status,
          safety: {
            noEventEmission: true,
            noSchedulerChange: true,
            noFollowupExecution: true,
            noConfigWrites: true,
            noTts: true
          }
        };
      }
      const result = emitGrayAutoTrialCharacterCueManually({
        ...safeInput,
        presetKey: cuePreset.key
      });
      if (result && typeof result === "object") {
        result.backendBridge = backendBridge;
      }
      if (result?.ok === true && state.grayAutoTrialCharacterCueLastManualEmit) {
        state.grayAutoTrialCharacterCueLastManualEmit.backendBridge = backendBridge;
      }
      return result;
    }

    async function emitLastReplyCharacterCueCandidateViaManualBridge(input = {}) {
      const safeInput = input && typeof input === "object" ? input : {};
      const confirm = String(safeInput.confirm || "").trim();
      const requiredConfirm = "SEND_REPLY_CHARACTER_CUE_CANDIDATE";
      if (confirm !== requiredConfirm) {
        return {
          ok: false,
          reason: "confirmation_required",
          requiredConfirm,
          safety: {
            noEventEmission: true,
            noSchedulerChange: true,
            noFollowupExecution: true,
            noConfigWrites: true,
            noTts: true
          }
        };
      }
      const candidate = state.followupCharacterRuntimeLastReplyCandidate || null;
      if (!candidate || candidate.eligibleForManualSend !== true || !candidate.runtimeHint) {
        return {
          ok: false,
          reason: "no_reply_candidate",
          safety: {
            noEventEmission: true,
            noSchedulerChange: true,
            noFollowupExecution: true,
            noConfigWrites: true,
            noTts: true
          }
        };
      }
      const backendBridge = await previewGrayAutoTrialCharacterCueBackendBridge({
        label: candidate.textPreview || "assistant_reply_candidate",
        tone: candidate.tone || "idle"
      });
      if (backendBridge.ok !== true) {
        return {
          ok: false,
          reason: backendBridge.reason || "backend_bridge_blocked",
          backendBridge,
          safety: {
            noEventEmission: true,
            noSchedulerChange: true,
            noFollowupExecution: true,
            noConfigWrites: true,
            noTts: true
          }
        };
      }
      let normalized = null;
      try {
        normalized = handleCharacterRuntimeMetadata(candidate.runtimeHint);
      } catch (_) {
        normalized = null;
      }
      if (!normalized) {
        return {
          ok: false,
          reason: "runtime_hint_rejected",
          backendBridge,
          safety: {
            noSchedulerChange: true,
            noFollowupExecution: true,
            noConfigWrites: true,
            noTts: true
          }
        };
      }
      const count = getGrayAutoTrialCharacterCueManualEmitStatus().count + 1;
      state.grayAutoTrialCharacterCueManualEmitCount = count;
      state.grayAutoTrialCharacterCueLastManualEmitAt = Date.now();
      state.grayAutoTrialCharacterCueLastManualEmit = {
        source: "assistant_reply_candidate",
        decision: "MANUAL_REPLY_CANDIDATE_SEND",
        outcome: "MANUAL_ONLY",
        label: candidate.textPreview || "",
        tone: candidate.tone || "",
        presetKey: "reply_candidate",
        presetDescription: "assistant_reply_candidate",
        replyCandidateGeneratedAt: candidate.generatedAt || 0,
        runtimeHint: normalized,
        runtimeDispatch: state.followupCharacterRuntimeLastDispatch || null,
        runtimeApply: state.followupCharacterRuntimeLastApply || null,
        backendBridge
      };
      recordTTSDebugEvent("conversation_followup_character_reply_cue_candidate_manual_emit", {
        text: String(candidate.textPreview || ""),
        result: [`count:${count}`, `tone:${candidate.tone || ""}`, "source:assistant_reply_candidate"].join(";"),
        error: String(normalized.emotion || "")
      });
      updateFollowupReadinessPanel();
      return {
        ok: true,
        count,
        label: candidate.textPreview || "",
        tone: candidate.tone || "",
        source: "assistant_reply_candidate",
        runtimeHint: normalized,
        backendBridge,
        safety: {
          readOnly: false,
          explicitConfirmationRequired: true,
          manualOnly: true,
          noSchedulerChange: true,
          noFollowupExecution: true,
          noConfigWrites: true,
          noTts: true
        }
      };
    }

    function updateGrayAutoTrialPreRunChecklistCard() {
      if (!state.followupReadinessTrialChecklistCard) {
        return;
      }
      state.followupReadinessTrialChecklistCard.textContent = buildGrayAutoTrialPreRunChecklistText();
    }

    function updateGrayAutoTrialTimelineCard() {
      if (!state.followupReadinessTrialTimelineCard) {
        return;
      }
      state.followupReadinessTrialTimelineCard.textContent = buildGrayAutoTrialTimelineText(18);
    }

    function updateGrayAutoTrialOutcomeCard() {
      if (!state.followupReadinessTrialOutcomeCard) {
        return;
      }
      state.followupReadinessTrialOutcomeCard.textContent = buildGrayAutoTrialOutcomeText(48);
    }

    function updateGrayAutoTrialDecisionCard() {
      if (!state.followupReadinessTrialDecisionCard) {
        return;
      }
      state.followupReadinessTrialDecisionCard.textContent = buildGrayAutoTrialGoNoGoDecisionText(48);
    }

    function updateGrayAutoTrialSignoffCard() {
      if (!state.followupReadinessTrialSignoffCard) {
        return;
      }
      state.followupReadinessTrialSignoffCard.textContent = buildGrayAutoTrialSignoffPackageText(48);
    }

    function updateGrayAutoTrialCharacterCard() {
      if (!state.followupReadinessTrialCharacterCard) {
        return;
      }
      state.followupReadinessTrialCharacterCard.textContent = buildGrayAutoTrialCharacterCuePreviewText(48);
    }

    function updateGrayAutoTrialCharacterHandoffCard() {
      if (!state.followupReadinessTrialCharacterHandoffCard) {
        return;
      }
      state.followupReadinessTrialCharacterHandoffCard.textContent = buildGrayAutoTrialCharacterCueHandoffChecklistText(48);
    }

    function updateGrayAutoTrialCharacterRecapCard() {
      if (!state.followupReadinessTrialCharacterRecapCard) {
        return;
      }
      state.followupReadinessTrialCharacterRecapCard.textContent = buildGrayAutoTrialCharacterCueManualEmitRecapText(24);
    }

    function updateGrayAutoTrialCharacterManualCueStatusCard() {
      if (!state.followupReadinessTrialCharacterManualCueStatusCard) {
        return;
      }
      state.followupReadinessTrialCharacterManualCueStatusCard.textContent = buildGrayAutoTrialCharacterManualCueStatusCardText();
    }

    function updateReplyCharacterCueCandidateManualSendButton() {
      const button = state.followupReadinessTrialSendReplyCueCandidateBtn;
      if (!button) {
        return;
      }
      const candidate = state.followupCharacterRuntimeLastReplyCandidate || null;
      const hint = candidate?.runtimeHint || null;
      const available = candidate?.eligibleForManualSend === true && !!hint;
      button.disabled = !available;
      button.textContent = available ? "\u53d1\u9001\u56de\u590dcue" : "\u65e0\u56de\u590dcue";
      button.title = available
        ? [
          "\u9700\u8981\u8f93\u5165 SEND_REPLY_CHARACTER_CUE_CANDIDATE\uff1b\u53ea\u624b\u52a8\u53d1\u9001\u4e0a\u4e00\u6761\u52a9\u624b\u56de\u590d\u7684\u5019\u9009 runtime cue",
          `candidate tone=${candidate.tone || "n/a"} mood=${candidate.mood || "n/a"} emotion=${hint.emotion || "n/a"} action=${hint.action || "n/a"}`
        ].join("\n")
        : "\u6682\u65e0\u52a9\u624b\u56de\u590d\u5019\u9009 cue\uff1b\u5148\u5b8c\u6210\u4e00\u6b21\u52a9\u624b\u56de\u590d\u540e\u518d\u624b\u52a8\u53d1\u9001\u3002";
    }

    function updateGrayAutoTrialCharacterStrategyCard() {
      if (!state.followupReadinessTrialCharacterStrategyCard) {
        return;
      }
      state.followupReadinessTrialCharacterStrategyCard.textContent = buildGrayAutoTrialCharacterExpressionStrategyDraftText(24);
    }

    function updateGrayAutoTrialCharacterReviewCard() {
      if (!state.followupReadinessTrialCharacterReviewCard) {
        return;
      }
      state.followupReadinessTrialCharacterReviewCard.textContent = buildGrayAutoTrialCharacterExpressionStrategyReviewPackageText(24);
    }

    function updateGrayAutoTrialCharacterAutoPlanCard() {
      if (!state.followupReadinessTrialCharacterAutoPlanCard) {
        return;
      }
      state.followupReadinessTrialCharacterAutoPlanCard.textContent = buildGrayAutoTrialCharacterAutoRuntimeSafetyPlanText(24);
    }

    function updateGrayAutoTrialCharacterDryRunCard() {
      if (!state.followupReadinessTrialCharacterDryRunCard) {
        return;
      }
      state.followupReadinessTrialCharacterDryRunCard.textContent = buildGrayAutoTrialCharacterAutoRuntimeDryRunText(24);
    }

    function updateGrayAutoTrialCharacterSwitchPlanCard() {
      if (!state.followupReadinessTrialCharacterSwitchPlanCard) {
        return;
      }
      state.followupReadinessTrialCharacterSwitchPlanCard.textContent = buildGrayAutoTrialCharacterAutoRuntimeExplicitSwitchPlanText(24);
    }

    function updateGrayAutoTrialCharacterSwitchReviewCard() {
      if (!state.followupReadinessTrialCharacterSwitchReviewCard) {
        return;
      }
      state.followupReadinessTrialCharacterSwitchReviewCard.textContent = buildGrayAutoTrialCharacterAutoRuntimeExplicitSwitchReviewPackageText(24);
    }

    function updateGrayAutoTrialCharacterSwitchAcceptanceCard() {
      if (!state.followupReadinessTrialCharacterSwitchAcceptanceCard) {
        return;
      }
      state.followupReadinessTrialCharacterSwitchAcceptanceCard.textContent = buildGrayAutoTrialCharacterAutoRuntimeSwitchAcceptancePackageText(24);
    }

    function updateGrayAutoTrialCharacterSwitchControlCard() {
      if (!state.followupReadinessTrialCharacterSwitchControlCard) {
        return;
      }
      const control = buildGrayAutoTrialCharacterAutoRuntimeExplicitSwitchControl();
      state.followupReadinessTrialCharacterSwitchControlCard.textContent = buildGrayAutoTrialCharacterAutoRuntimeExplicitSwitchControlText(24);
      if (state.followupReadinessTrialCharacterSwitchEnableBtn) {
        state.followupReadinessTrialCharacterSwitchEnableBtn.disabled = control.canEnable !== true;
        state.followupReadinessTrialCharacterSwitchEnableBtn.title = control.canEnable === true
          ? "\u9700\u8981\u8f93\u5165 ENABLE_GRAY_AUTO_TRIAL_CHARACTER_AUTO_RUNTIME_SWITCH\uff1b\u53ea\u5207\u6362\u672c\u5730\u6807\u8bb0"
          : "\u9a8c\u6536\u5c1a\u672a\u5c31\u7eea\uff0c\u663e\u5f0f\u5f00\u5173\u4ecd\u4fdd\u6301\u5173\u95ed";
      }
      if (state.followupReadinessTrialCharacterSwitchDisableBtn) {
        state.followupReadinessTrialCharacterSwitchDisableBtn.disabled = control.enabled !== true;
        state.followupReadinessTrialCharacterSwitchDisableBtn.title = "\u5173\u95ed\u672c\u5730\u663e\u5f0f\u5f00\u5173\u6807\u8bb0\uff0c\u4e0d\u6539 scheduler/config";
      }
      if (state.followupReadinessTrialCharacterSwitchRollbackBtn) {
        state.followupReadinessTrialCharacterSwitchRollbackBtn.disabled = control.enabled !== true;
        state.followupReadinessTrialCharacterSwitchRollbackBtn.title = control.enabled === true
          ? "\u6062\u590d\u672c\u5730\u663e\u5f0f\u5f00\u5173\u5230\u9ed8\u8ba4\u5173\u95ed\uff0c\u4e0d\u6539 scheduler/config"
          : "\u5f53\u524d\u5df2\u662f\u9ed8\u8ba4\u5173\u95ed";
      }
    }

    function updateGrayAutoTrialCharacterSwitchDiagnosticsCard() {
      if (!state.followupReadinessTrialCharacterSwitchDiagnosticsCard) {
        return;
      }
      state.followupReadinessTrialCharacterSwitchDiagnosticsCard.textContent = buildGrayAutoTrialCharacterAutoRuntimeSwitchControlDiagnosticsText(24);
    }

    function updateGrayAutoTrialCharacterSwitchRollbackCard() {
      if (!state.followupReadinessTrialCharacterSwitchRollbackCard) {
        return;
      }
      state.followupReadinessTrialCharacterSwitchRollbackCard.textContent = buildGrayAutoTrialCharacterAutoRuntimeExplicitSwitchRollbackPackageText(24);
    }

    function updateGrayAutoTrialCharacterSwitchFinalPreflightCard() {
      if (!state.followupReadinessTrialCharacterSwitchFinalPreflightCard) {
        return;
      }
      state.followupReadinessTrialCharacterSwitchFinalPreflightCard.textContent = buildGrayAutoTrialCharacterAutoRuntimeFinalPreflightText(24);
    }

    function updateGrayAutoTrialCharacterImplementationDraftCard() {
      if (!state.followupReadinessTrialCharacterImplementationDraftCard) {
        return;
      }
      state.followupReadinessTrialCharacterImplementationDraftCard.textContent = buildGrayAutoTrialCharacterAutoRuntimeSeparateImplementationDraftText(24);
    }

    function promptGrayAutoTrialPhrase(phrase, actionLabel) {
      if (typeof window === "undefined" || typeof window.prompt !== "function") {
        return false;
      }
      const input = window.prompt(`${actionLabel}\n\nType ${phrase} to continue.`, "");
      return String(input || "").trim() === phrase;
    }

    function updateGrayAutoTrialControlPanel() {
      const statusNode = state.followupReadinessTrialStatus;
      if (!statusNode) {
        return;
      }
      const snapshot = getTTSDebugSnapshot();
      const mode = snapshot.conversationMode || {};
      const scheduler = snapshot.proactiveScheduler || {};
      const preflight = buildGrayAutoFollowupTrialPreflight(snapshot);
      const session = buildGrayAutoTrialSessionState();
      const armed = mode.grayAutoEnabled === true && mode.grayAutoTrialEnabled === true;
      const polling = scheduler.pollTimerActive === true;
      statusNode.textContent = [
        `\u8bd5\u8fd0\u884c\u63a7\u5236\uff1astatus=${preflight.status} armed=${armed ? "true" : "false"} polling=${polling ? "true" : "false"}`,
        `session=${session.count}/${session.max} remaining=${session.remaining} blocked=${explainReadinessReasons(preflight.dryRun?.blockedReasons || preflight.gateBlockedReasons)}`,
        "\u63d0\u793a\uff1aArm \u548c Reset \u9700\u8981\u8f93\u5165\u786e\u8ba4\u77ed\u8bed\uff1bStop/Disarm \u662f\u5b89\u5168\u6536\u53e3\u52a8\u4f5c\u3002"
      ].join("\n");
      if (state.followupReadinessTrialArmBtn) {
        state.followupReadinessTrialArmBtn.disabled = armed;
      }
      if (state.followupReadinessTrialDisarmBtn) {
        state.followupReadinessTrialDisarmBtn.disabled = !armed && !polling;
      }
      if (state.followupReadinessTrialResetBtn) {
        state.followupReadinessTrialResetBtn.disabled = session.count <= 0 && session.reached !== true;
      }
      const switchControl = buildGrayAutoTrialCharacterAutoRuntimeExplicitSwitchControl();
      if (state.followupReadinessTrialCharacterSwitchEnableBtn) {
        state.followupReadinessTrialCharacterSwitchEnableBtn.disabled = switchControl.canEnable !== true;
        state.followupReadinessTrialCharacterSwitchEnableBtn.title = switchControl.canEnable === true
          ? "\u9700\u8981\u8f93\u5165 ENABLE_GRAY_AUTO_TRIAL_CHARACTER_AUTO_RUNTIME_SWITCH\uff1b\u53ea\u5207\u6362\u672c\u5730\u6807\u8bb0"
          : "\u9a8c\u6536\u5305\u5c1a\u672a\u5c31\u7eea\uff0c\u663e\u5f0f\u5f00\u5173\u4ecd\u4fdd\u6301\u5173\u95ed";
      }
      if (state.followupReadinessTrialCharacterSwitchDisableBtn) {
        state.followupReadinessTrialCharacterSwitchDisableBtn.disabled = switchControl.enabled !== true;
        state.followupReadinessTrialCharacterSwitchDisableBtn.title = "\u5173\u95ed\u672c\u5730\u663e\u5f0f\u5f00\u5173\u6807\u8bb0\uff1b\u4e0d\u6539 scheduler/config";
      }
      if (state.followupReadinessTrialCharacterSwitchRollbackBtn) {
        state.followupReadinessTrialCharacterSwitchRollbackBtn.disabled = switchControl.enabled !== true;
        state.followupReadinessTrialCharacterSwitchRollbackBtn.title = switchControl.enabled === true
          ? "\u6062\u590d\u672c\u5730\u663e\u5f0f\u5f00\u5173\u5230\u9ed8\u8ba4\u5173\u95ed\uff1b\u4e0d\u6539 scheduler/config"
          : "\u5f53\u524d\u5df2\u662f\u9ed8\u8ba4\u5173\u95ed";
      }
    }

    function handleGrayAutoTrialArmClick(button = null) {
      if (!promptGrayAutoTrialPhrase("ARM_GRAY_AUTO_TRIAL", "\u542f\u52a8\u672c\u5730\u53d7\u63a7\u7070\u5ea6\u81ea\u52a8\u8bd5\u8fd0\u884c")) {
        setStatus("\u7070\u5ea6\u8bd5\u8fd0\u884c Arm \u5df2\u53d6\u6d88\uff1a\u786e\u8ba4\u77ed\u8bed\u4e0d\u5339\u914d");
        return false;
      }
      const result = armGrayAutoTrialSession({ confirm: "ARM_GRAY_AUTO_TRIAL" });
      updateFollowupReadinessPanel();
      setStatus(result?.ok === true
        ? "\u7070\u5ea6\u8bd5\u8fd0\u884c\u5df2 Arm\uff08\u4ec5\u672c\u5730\u5185\u5b58\uff09"
        : `\u7070\u5ea6\u8bd5\u8fd0\u884c Arm \u5931\u8d25\uff1a${result?.reason || "unknown"}`);
      if (button) {
        button.blur();
      }
      return result?.ok === true;
    }

    function handleGrayAutoTrialStopClick(button = null) {
      const result = stopGrayAutoTrialSession("panel_emergency_stop");
      updateFollowupReadinessPanel();
      setStatus("\u7070\u5ea6\u8bd5\u8fd0\u884c\u5df2 Emergency Stop\uff0c\u672c\u6b21 session \u5df2\u5c01\u53e3");
      if (button) {
        button.blur();
      }
      return result;
    }

    function handleGrayAutoTrialDisarmClick(button = null) {
      const result = disarmGrayAutoTrialSession("panel_disarm");
      updateFollowupReadinessPanel();
      setStatus("\u7070\u5ea6\u8bd5\u8fd0\u884c\u5df2 Disarm\uff0c\u5185\u5b58\u95e8\u7981\u5df2\u5173\u95ed");
      if (button) {
        button.blur();
      }
      return result;
    }

    function handleGrayAutoTrialResetClick(button = null) {
      if (!promptGrayAutoTrialPhrase("RESET_GRAY_AUTO_TRIAL_SESSION", "\u91cd\u7f6e\u672c\u6b21\u7070\u5ea6\u8bd5\u8fd0\u884c\u8ba1\u6570")) {
        setStatus("\u7070\u5ea6\u8bd5\u8fd0\u884c Reset \u5df2\u53d6\u6d88\uff1a\u786e\u8ba4\u77ed\u8bed\u4e0d\u5339\u914d");
        return false;
      }
      const result = resetGrayAutoTrialSessionTriggerCount();
      updateFollowupReadinessPanel();
      setStatus("\u7070\u5ea6\u8bd5\u8fd0\u884c session \u8ba1\u6570\u5df2\u91cd\u7f6e\uff08\u4e0d\u542f\u52a8 polling\uff09");
      if (button) {
        button.blur();
      }
      return result?.reset === true;
    }

    async function handleGrayAutoTrialCharacterCueManualEmitClick(button = null) {
      if (!promptGrayAutoTrialPhrase("EMIT_GRAY_AUTO_TRIAL_CHARACTER_CUE", "\u624b\u52a8\u8bd5\u53d1\u7070\u5ea6\u8bd5\u8fd0\u884c\u89d2\u8272 runtime cue")) {
        setStatus("\u89d2\u8272 cue \u8bd5\u53d1\u5df2\u53d6\u6d88\uff1a\u786e\u8ba4\u77ed\u8bed\u4e0d\u5339\u914d");
        return false;
      }
      if (button) {
        button.disabled = true;
      }
      setStatus("\u89d2\u8272 cue \u540e\u7aef\u9884\u68c0\u4e2d\uff1a\u53ea\u8d70 preview/no-op adapter");
      try {
        const result = await emitGrayAutoTrialCharacterCueViaManualBridge({
          confirm: "EMIT_GRAY_AUTO_TRIAL_CHARACTER_CUE",
          presetKey: getSelectedGrayAutoTrialCharacterCuePresetKey()
        });
        updateFollowupReadinessPanel();
        setStatus(result?.ok === true
          ? `\u89d2\u8272 cue \u5df2\u624b\u52a8\u8bd5\u53d1\uff08count=${result.count}\uff0cbackend=no-op confirmed\uff09`
          : `\u89d2\u8272 cue \u8bd5\u53d1\u5931\u8d25\uff1a${result?.reason || "unknown"}`);
        return result?.ok === true;
      } finally {
        if (button) {
          button.disabled = false;
          button.blur();
        }
      }
    }

    async function handleReplyCharacterCueCandidateManualSendClick(button = null) {
      if (!promptGrayAutoTrialPhrase("SEND_REPLY_CHARACTER_CUE_CANDIDATE", "\u624b\u52a8\u53d1\u9001\u4e0a\u4e00\u6761\u52a9\u624b\u56de\u590d\u5019\u9009\u89d2\u8272 cue")) {
        setStatus("\u56de\u590d\u5019\u9009 cue \u624b\u52a8\u53d1\u9001\u5df2\u53d6\u6d88\uff1a\u786e\u8ba4\u77ed\u8bed\u4e0d\u5339\u914d");
        return false;
      }
      updateReplyCharacterCueCandidateManualSendButton();
      if (button) {
        button.disabled = true;
      }
      setStatus("\u56de\u590d\u5019\u9009 cue \u540e\u7aef\u9884\u68c0\u4e2d\uff1a\u53ea\u8d70 preview/no-op adapter");
      try {
        const result = await emitLastReplyCharacterCueCandidateViaManualBridge({
          confirm: "SEND_REPLY_CHARACTER_CUE_CANDIDATE"
        });
        updateFollowupReadinessPanel();
        setStatus(result?.ok === true
          ? `\u56de\u590d\u5019\u9009 cue \u5df2\u624b\u52a8\u53d1\u9001\uff08count=${result.count}\uff0cbackend=no-op confirmed\uff09`
          : `\u56de\u590d\u5019\u9009 cue \u624b\u52a8\u53d1\u9001\u5931\u8d25\uff1a${result?.reason || "unknown"}`);
        return result?.ok === true;
      } finally {
        updateReplyCharacterCueCandidateManualSendButton();
        if (button) {
          button.blur();
        }
      }
    }

    function handleGrayAutoTrialCharacterAutoRuntimeSwitchEnableClick(button = null) {
      if (!promptGrayAutoTrialPhrase("ENABLE_GRAY_AUTO_TRIAL_CHARACTER_AUTO_RUNTIME_SWITCH", "\u542f\u7528\u672c\u5730\u81ea\u52a8\u89d2\u8272 runtime \u663e\u5f0f\u5f00\u5173\u6807\u8bb0")) {
        setStatus("\u663e\u5f0f\u5f00\u5173\u542f\u7528\u5df2\u53d6\u6d88\uff1a\u786e\u8ba4\u77ed\u8bed\u4e0d\u5339\u914d");
        return false;
      }
      const result = enableGrayAutoTrialCharacterAutoRuntimeExplicitSwitch({
        confirm: "ENABLE_GRAY_AUTO_TRIAL_CHARACTER_AUTO_RUNTIME_SWITCH"
      });
      setStatus(result?.ok === true
        ? "\u663e\u5f0f\u5f00\u5173\u672c\u5730\u6807\u8bb0\u5df2\u542f\u7528\uff08\u81ea\u52a8 runtime \u4ecd\u672a\u63a5\u5165\uff09"
        : `\u663e\u5f0f\u5f00\u5173\u542f\u7528\u88ab\u963b\u6b62\uff1a${result?.reason || "unknown"}`);
      if (button) {
        button.blur();
      }
      return result?.ok === true;
    }

    function handleGrayAutoTrialCharacterAutoRuntimeSwitchDisableClick(button = null) {
      const result = disableGrayAutoTrialCharacterAutoRuntimeExplicitSwitch("panel_disable");
      setStatus("\u663e\u5f0f\u5f00\u5173\u672c\u5730\u6807\u8bb0\u5df2\u5173\u95ed");
      if (button) {
        button.blur();
      }
      return result?.ok === true;
    }

    function handleGrayAutoTrialCharacterAutoRuntimeSwitchRollbackClick(button = null) {
      const result = rollbackGrayAutoTrialCharacterAutoRuntimeExplicitSwitch("panel_rollback");
      setStatus(result?.ok === true
        ? "\u5df2\u56de\u6536\u5230\u9ed8\u8ba4\u5173\u95ed\uff08\u4ec5\u672c\u5730\u5185\u5b58\uff09"
        : `\u56de\u6536\u5931\u8d25\uff1a${result?.reason || "unknown"}`);
      if (button) {
        button.blur();
      }
      return result?.ok === true;
    }

    async function copyGrayAutoTrialAuditSummaryToClipboard(button = null) {
      try {
        await writeTextToClipboard(buildGrayAutoTrialAuditSummaryText(30));
        setStatus("\u7070\u5ea6\u8bd5\u8fd0\u884c\u5ba1\u8ba1\u6458\u8981\u5df2\u590d\u5236");
        if (button) {
          const previous = button.textContent;
          button.textContent = "\u5df2\u590d\u5236";
          window.setTimeout(() => {
            button.textContent = previous || "\u590d\u5236\u5ba1\u8ba1";
          }, 1200);
        }
        return true;
      } catch (_) {
        setStatus("\u590d\u5236\u7070\u5ea6\u8bd5\u8fd0\u884c\u5ba1\u8ba1\u6458\u8981\u5931\u8d25");
        return false;
      }
    }

    async function copyGrayAutoTrialTimelineToClipboard(button = null) {
      try {
        await writeTextToClipboard(buildGrayAutoTrialTimelineText(40));
        setStatus("\u7070\u5ea6\u8bd5\u8fd0\u884c\u65f6\u95f4\u7ebf\u5df2\u590d\u5236");
        if (button) {
          const previous = button.textContent;
          button.textContent = "\u5df2\u590d\u5236";
          window.setTimeout(() => {
            button.textContent = previous || "\u590d\u5236\u65f6\u95f4\u7ebf";
          }, 1200);
        }
        return true;
      } catch (_) {
        setStatus("\u590d\u5236\u7070\u5ea6\u8bd5\u8fd0\u884c\u65f6\u95f4\u7ebf\u5931\u8d25");
        return false;
      }
    }

    async function copyGrayAutoTrialDecisionToClipboard(button = null) {
      try {
        await writeTextToClipboard(buildGrayAutoTrialGoNoGoDecisionText(48));
        setStatus("\u7070\u5ea6\u8bd5\u8fd0\u884c Go/No-Go \u5df2\u590d\u5236");
        if (button) {
          const previous = button.textContent;
          button.textContent = "\u5df2\u590d\u5236";
          window.setTimeout(() => {
            button.textContent = previous || "\u590d\u5236\u51b3\u7b56";
          }, 1200);
        }
        return true;
      } catch (_) {
        setStatus("\u590d\u5236 Go/No-Go \u51b3\u7b56\u5931\u8d25");
        return false;
      }
    }

    async function copyGrayAutoTrialSignoffToClipboard(button = null) {
      try {
        await writeTextToClipboard(buildGrayAutoTrialSignoffPackageText(48));
        setStatus("\u7070\u5ea6\u8bd5\u8fd0\u884c\u7b7e\u6536\u5305\u5df2\u590d\u5236");
        if (button) {
          const previous = button.textContent;
          button.textContent = "\u5df2\u590d\u5236";
          window.setTimeout(() => {
            button.textContent = previous || "\u590d\u5236\u7b7e\u6536";
          }, 1200);
        }
        return true;
      } catch (_) {
        setStatus("\u590d\u5236\u7070\u5ea6\u8bd5\u8fd0\u884c\u7b7e\u6536\u5305\u5931\u8d25");
        return false;
      }
    }

    async function copyGrayAutoTrialCharacterCuePreviewToClipboard(button = null) {
      try {
        await writeTextToClipboard(buildGrayAutoTrialCharacterCuePreviewText(48));
        setStatus("\u7070\u5ea6\u8bd5\u8fd0\u884c\u89d2\u8272\u9884\u89c8\u5df2\u590d\u5236");
        if (button) {
          const previous = button.textContent;
          button.textContent = "\u5df2\u590d\u5236";
          window.setTimeout(() => {
            button.textContent = previous || "\u590d\u5236\u89d2\u8272\u9884\u89c8";
          }, 1200);
        }
        return true;
      } catch (_) {
        setStatus("\u590d\u5236\u7070\u5ea6\u8bd5\u8fd0\u884c\u89d2\u8272\u9884\u89c8\u5931\u8d25");
        return false;
      }
    }

    async function copyGrayAutoTrialCharacterCueHandoffChecklistToClipboard(button = null) {
      try {
        await writeTextToClipboard(buildGrayAutoTrialCharacterCueHandoffChecklistText(48));
        setStatus("\u7070\u5ea6\u8bd5\u8fd0\u884c\u89d2\u8272\u63a5\u5165\u68c0\u67e5\u5df2\u590d\u5236");
        if (button) {
          const previous = button.textContent;
          button.textContent = "\u5df2\u590d\u5236";
          window.setTimeout(() => {
            button.textContent = previous || "\u590d\u5236\u63a5\u5165\u68c0\u67e5";
          }, 1200);
        }
        return true;
      } catch (_) {
        setStatus("\u590d\u5236\u7070\u5ea6\u8bd5\u8fd0\u884c\u89d2\u8272\u63a5\u5165\u68c0\u67e5\u5931\u8d25");
        return false;
      }
    }

    async function copyGrayAutoTrialCharacterCueManualEmitRecapToClipboard(button = null) {
      try {
        await writeTextToClipboard(buildGrayAutoTrialCharacterCueManualEmitRecapText(24));
        setStatus("\u7070\u5ea6\u8bd5\u8fd0\u884c\u89d2\u8272 cue \u8bd5\u53d1\u56de\u770b\u5df2\u590d\u5236");
        if (button) {
          const previous = button.textContent;
          button.textContent = "\u5df2\u590d\u5236";
          window.setTimeout(() => {
            button.textContent = previous || "\u590d\u5236\u56de\u770b";
          }, 1200);
        }
        return true;
      } catch (_) {
        setStatus("\u590d\u5236\u7070\u5ea6\u8bd5\u8fd0\u884c\u89d2\u8272 cue \u8bd5\u53d1\u56de\u770b\u5931\u8d25");
        return false;
      }
    }

    async function copyGrayAutoTrialCharacterExpressionStrategyDraftToClipboard(button = null) {
      try {
        await writeTextToClipboard(buildGrayAutoTrialCharacterExpressionStrategyDraftText(24));
        setStatus("\u7070\u5ea6\u8bd5\u8fd0\u884c\u89d2\u8272\u8868\u73b0\u7b56\u7565\u8349\u6848\u5df2\u590d\u5236");
        if (button) {
          const previous = button.textContent;
          button.textContent = "\u5df2\u590d\u5236";
          window.setTimeout(() => {
            button.textContent = previous || "\u590d\u5236\u7b56\u7565";
          }, 1200);
        }
        return true;
      } catch (_) {
        setStatus("\u590d\u5236\u7070\u5ea6\u8bd5\u8fd0\u884c\u89d2\u8272\u8868\u73b0\u7b56\u7565\u8349\u6848\u5931\u8d25");
        return false;
      }
    }

    async function copyGrayAutoTrialCharacterExpressionStrategyReviewPackageToClipboard(button = null) {
      try {
        await writeTextToClipboard(buildGrayAutoTrialCharacterExpressionStrategyReviewPackageText(24));
        setStatus("\u7070\u5ea6\u8bd5\u8fd0\u884c\u89d2\u8272\u8868\u73b0\u7b56\u7565\u8bc4\u5ba1\u5305\u5df2\u590d\u5236");
        if (button) {
          const previous = button.textContent;
          button.textContent = "\u5df2\u590d\u5236";
          window.setTimeout(() => {
            button.textContent = previous || "\u590d\u5236\u8bc4\u5ba1";
          }, 1200);
        }
        return true;
      } catch (_) {
        setStatus("\u590d\u5236\u7070\u5ea6\u8bd5\u8fd0\u884c\u89d2\u8272\u8868\u73b0\u7b56\u7565\u8bc4\u5ba1\u5305\u5931\u8d25");
        return false;
      }
    }

    async function copyGrayAutoTrialCharacterAutoRuntimeSafetyPlanToClipboard(button = null) {
      try {
        await writeTextToClipboard(buildGrayAutoTrialCharacterAutoRuntimeSafetyPlanText(24));
        setStatus("\u7070\u5ea6\u8bd5\u8fd0\u884c\u81ea\u52a8\u89d2\u8272\u8868\u73b0\u63a5\u5165\u8ba1\u5212\u5df2\u590d\u5236");
        if (button) {
          const previous = button.textContent;
          button.textContent = "\u5df2\u590d\u5236";
          window.setTimeout(() => {
            button.textContent = previous || "\u590d\u5236\u8ba1\u5212";
          }, 1200);
        }
        return true;
      } catch (_) {
        setStatus("\u590d\u5236\u7070\u5ea6\u8bd5\u8fd0\u884c\u81ea\u52a8\u89d2\u8272\u8868\u73b0\u63a5\u5165\u8ba1\u5212\u5931\u8d25");
        return false;
      }
    }

    async function copyGrayAutoTrialCharacterAutoRuntimeDryRunToClipboard(button = null) {
      try {
        await writeTextToClipboard(buildGrayAutoTrialCharacterAutoRuntimeDryRunText(24));
        setStatus("\u7070\u5ea6\u8bd5\u8fd0\u884c\u81ea\u52a8\u89d2\u8272\u8868\u73b0 dry-run \u5df2\u590d\u5236");
        if (button) {
          const previous = button.textContent;
          button.textContent = "\u5df2\u590d\u5236";
          window.setTimeout(() => {
            button.textContent = previous || "\u590d\u5236 dry-run";
          }, 1200);
        }
        return true;
      } catch (_) {
        setStatus("\u590d\u5236\u7070\u5ea6\u8bd5\u8fd0\u884c\u81ea\u52a8\u89d2\u8272\u8868\u73b0 dry-run \u5931\u8d25");
        return false;
      }
    }

    async function copyGrayAutoTrialCharacterAutoRuntimeSwitchPlanToClipboard(button = null) {
      try {
        await writeTextToClipboard(buildGrayAutoTrialCharacterAutoRuntimeExplicitSwitchPlanText(24));
        setStatus("\u7070\u5ea6\u8bd5\u8fd0\u884c\u81ea\u52a8\u89d2\u8272\u8868\u73b0\u663e\u5f0f\u5f00\u5173\u8ba1\u5212\u5df2\u590d\u5236");
        if (button) {
          const previous = button.textContent;
          button.textContent = "\u5df2\u590d\u5236";
          window.setTimeout(() => {
            button.textContent = previous || "\u590d\u5236\u5f00\u5173\u8ba1\u5212";
          }, 1200);
        }
        return true;
      } catch (_) {
        setStatus("\u590d\u5236\u7070\u5ea6\u8bd5\u8fd0\u884c\u81ea\u52a8\u89d2\u8272\u8868\u73b0\u663e\u5f0f\u5f00\u5173\u8ba1\u5212\u5931\u8d25");
        return false;
      }
    }

    async function copyGrayAutoTrialCharacterAutoRuntimeSwitchReviewToClipboard(button = null) {
      try {
        await writeTextToClipboard(buildGrayAutoTrialCharacterAutoRuntimeExplicitSwitchReviewPackageText(24));
        setStatus("\u7070\u5ea6\u8bd5\u8fd0\u884c\u81ea\u52a8\u89d2\u8272\u8868\u73b0\u663e\u5f0f\u5f00\u5173\u8bc4\u5ba1\u5305\u5df2\u590d\u5236");
        if (button) {
          const previous = button.textContent;
          button.textContent = "\u5df2\u590d\u5236";
          window.setTimeout(() => {
            button.textContent = previous || "\u590d\u5236\u8bc4\u5ba1";
          }, 1200);
        }
        return true;
      } catch (_) {
        setStatus("\u590d\u5236\u7070\u5ea6\u8bd5\u8fd0\u884c\u81ea\u52a8\u89d2\u8272\u8868\u73b0\u663e\u5f0f\u5f00\u5173\u8bc4\u5ba1\u5305\u5931\u8d25");
        return false;
      }
    }

    async function copyGrayAutoTrialCharacterAutoRuntimeSwitchAcceptanceToClipboard(button = null) {
      try {
        await writeTextToClipboard(buildGrayAutoTrialCharacterAutoRuntimeSwitchAcceptancePackageText(24));
        setStatus("\u7070\u5ea6\u8bd5\u8fd0\u884c\u81ea\u52a8\u89d2\u8272\u8868\u73b0\u663e\u5f0f\u5f00\u5173\u9a8c\u6536\u5305\u5df2\u590d\u5236");
        if (button) {
          const previous = button.textContent;
          button.textContent = "\u5df2\u590d\u5236";
          window.setTimeout(() => {
            button.textContent = previous || "\u590d\u5236\u9a8c\u6536";
          }, 1200);
        }
        return true;
      } catch (_) {
        setStatus("\u590d\u5236\u7070\u5ea6\u8bd5\u8fd0\u884c\u81ea\u52a8\u89d2\u8272\u8868\u73b0\u663e\u5f0f\u5f00\u5173\u9a8c\u6536\u5305\u5931\u8d25");
        return false;
      }
    }

    async function copyGrayAutoTrialCharacterAutoRuntimeSwitchControlToClipboard(button = null) {
      try {
        await writeTextToClipboard(buildGrayAutoTrialCharacterAutoRuntimeExplicitSwitchControlText(24));
        setStatus("\u7070\u5ea6\u8bd5\u8fd0\u884c\u81ea\u52a8\u89d2\u8272\u8868\u73b0\u663e\u5f0f\u5f00\u5173\u63a7\u5236\u5df2\u590d\u5236");
        if (button) {
          const previous = button.textContent;
          button.textContent = "\u5df2\u590d\u5236";
          window.setTimeout(() => {
            button.textContent = previous || "\u590d\u5236\u72b6\u6001";
          }, 1200);
        }
        return true;
      } catch (_) {
        setStatus("\u590d\u5236\u7070\u5ea6\u8bd5\u8fd0\u884c\u81ea\u52a8\u89d2\u8272\u8868\u73b0\u663e\u5f0f\u5f00\u5173\u63a7\u5236\u5931\u8d25");
        return false;
      }
    }

    async function copyGrayAutoTrialCharacterAutoRuntimeSwitchDiagnosticsToClipboard(button = null) {
      try {
        await writeTextToClipboard(buildGrayAutoTrialCharacterAutoRuntimeSwitchControlDiagnosticsText(24));
        setStatus("\u7070\u5ea6\u8bd5\u8fd0\u884c\u81ea\u52a8\u89d2\u8272\u8868\u73b0\u663e\u5f0f\u5f00\u5173\u8bca\u65ad\u5df2\u590d\u5236");
        if (button) {
          const previous = button.textContent;
          button.textContent = "\u5df2\u590d\u5236";
          window.setTimeout(() => {
            button.textContent = previous || "\u590d\u5236\u8bca\u65ad";
          }, 1200);
        }
        return true;
      } catch (_) {
        setStatus("\u590d\u5236\u7070\u5ea6\u8bd5\u8fd0\u884c\u81ea\u52a8\u89d2\u8272\u8868\u73b0\u663e\u5f0f\u5f00\u5173\u8bca\u65ad\u5931\u8d25");
        return false;
      }
    }

    async function copyGrayAutoTrialCharacterAutoRuntimeSwitchRollbackToClipboard(button = null) {
      try {
        await writeTextToClipboard(buildGrayAutoTrialCharacterAutoRuntimeExplicitSwitchRollbackPackageText(24));
        setStatus("\u7070\u5ea6\u8bd5\u8fd0\u884c\u81ea\u52a8\u89d2\u8272\u8868\u73b0\u663e\u5f0f\u5f00\u5173\u56de\u6536\u5305\u5df2\u590d\u5236");
        if (button) {
          const previous = button.textContent;
          button.textContent = "\u5df2\u590d\u5236";
          window.setTimeout(() => {
            button.textContent = previous || "\u590d\u5236\u56de\u6536";
          }, 1200);
        }
        return true;
      } catch (_) {
        setStatus("\u590d\u5236\u7070\u5ea6\u8bd5\u8fd0\u884c\u81ea\u52a8\u89d2\u8272\u8868\u73b0\u56de\u6536\u5305\u5931\u8d25");
        return false;
      }
    }

    async function copyGrayAutoTrialCharacterAutoRuntimeFinalPreflightToClipboard(button = null) {
      try {
        await writeTextToClipboard(buildGrayAutoTrialCharacterAutoRuntimeFinalPreflightText(24));
        setStatus("\u7070\u5ea6\u8bd5\u8fd0\u884c\u81ea\u52a8\u89d2\u8272\u8868\u73b0\u6700\u7ec8\u9884\u68c0\u5df2\u590d\u5236");
        if (button) {
          const previous = button.textContent;
          button.textContent = "\u5df2\u590d\u5236";
          window.setTimeout(() => {
            button.textContent = previous || "\u590d\u5236\u9884\u68c0";
          }, 1200);
        }
        return true;
      } catch (_) {
        setStatus("\u590d\u5236\u7070\u5ea6\u8bd5\u8fd0\u884c\u81ea\u52a8\u89d2\u8272\u8868\u73b0\u6700\u7ec8\u9884\u68c0\u5931\u8d25");
        return false;
      }
    }

    async function copyGrayAutoTrialCharacterAutoRuntimeSeparateImplementationDraftToClipboard(button = null) {
      try {
        await writeTextToClipboard(buildGrayAutoTrialCharacterAutoRuntimeSeparateImplementationDraftText(24));
        setStatus("\u7070\u5ea6\u8bd5\u8fd0\u884c\u81ea\u52a8\u89d2\u8272\u8868\u73b0\u5b9e\u73b0\u8349\u6848\u5df2\u590d\u5236");
        if (button) {
          const previous = button.textContent;
          button.textContent = "\u5df2\u590d\u5236";
          window.setTimeout(() => {
            button.textContent = previous || "\u590d\u5236\u8349\u6848";
          }, 1200);
        }
        return true;
      } catch (_) {
        setStatus("\u590d\u5236\u7070\u5ea6\u8bd5\u8fd0\u884c\u81ea\u52a8\u89d2\u8272\u8868\u73b0\u5b9e\u73b0\u8349\u6848\u5931\u8d25");
        return false;
      }
    }

    function updateFollowupReadinessScenarioCompare() {
      if (!state.followupReadinessCompare) {
        return;
      }
      state.followupReadinessCompare.textContent = "";
      const title = document.createElement("div");
      title.textContent = "\u573a\u666f\u5bf9\u6bd4\uff08\u672c\u5730\u9884\u6f14\uff0c\u4e0d\u5199\u5165\u72b6\u6001\uff09";
      title.style.cssText = "font:700 12px/1.3 system-ui,sans-serif;color:#1f3768;margin-bottom:8px;";
      state.followupReadinessCompare.appendChild(title);
      buildFollowupRehearsalScenarioCompareRows().forEach((row) => {
        const item = document.createElement("div");
        item.style.cssText = [
          "display:grid",
          "grid-template-columns:minmax(72px,.8fr) minmax(88px,.9fr) minmax(72px,.7fr) minmax(0,2.4fr)",
          "gap:8px",
          "align-items:start",
          "padding:7px 0",
          "border-top:1px solid rgba(93,128,195,.16)"
        ].join(";");
        if (row.id === state.followupRehearsalScenarioId) {
          item.style.background = "rgba(232,255,243,.42)";
        }
        const cells = [
          row.id === state.followupRehearsalScenarioId ? `${row.label} *` : row.label,
          `policy=${row.policy}`,
          `tone=${row.tone} #${row.selectedIndex}`,
          row.candidateText
        ];
        cells.forEach((text, index) => {
          const cell = document.createElement("span");
          cell.textContent = text;
          cell.style.cssText = index === 3
            ? "white-space:normal;color:#263d70;"
            : "white-space:normal;color:#465b84;";
          item.appendChild(cell);
        });
        state.followupReadinessCompare.appendChild(item);
      });
    }

    function createFollowupReadinessActionGroup(labelText, buttons = []) {
      const group = document.createElement("div");
      group.style.cssText = [
        "display:flex",
        "align-items:center",
        "gap:6px",
        "flex-wrap:wrap",
        "padding:6px 8px",
        "border:1px solid rgba(93,128,195,.18)",
        "border-radius:12px",
        "background:rgba(255,255,255,.44)"
      ].join(";");
      const label = document.createElement("span");
      label.textContent = labelText;
      label.style.cssText = "font:700 11px/1.2 system-ui,sans-serif;color:#54688f;margin-right:2px;";
      group.appendChild(label);
      buttons.forEach((button) => group.appendChild(button));
      return group;
    }

    function createFollowupReadinessCollapsibleActionGroup(labelText, buttons = [], open = false) {
      const details = document.createElement("details");
      details.open = open === true;
      details.style.cssText = [
        "padding:6px 8px",
        "border:1px solid rgba(93,128,195,.16)",
        "border-radius:12px",
        "background:rgba(255,255,255,.34)"
      ].join(";");
      const summary = document.createElement("summary");
      summary.textContent = labelText;
      summary.style.cssText = [
        "cursor:pointer",
        "font:700 11px/1.2 system-ui,sans-serif",
        "color:#54688f",
        "list-style-position:inside"
      ].join(";");
      const body = createFollowupReadinessActionGroup("", buttons);
      body.style.marginTop = "6px";
      const label = body.querySelector("span");
      if (label) {
        label.remove();
      }
      details.appendChild(summary);
      details.appendChild(body);
      return details;
    }

    function ensureFollowupReadinessPanel() {
      if (state.followupReadinessPanel || typeof document === "undefined") {
        return state.followupReadinessPanel;
      }
      const panel = document.createElement("div");
      panel.id = "followup-readiness-panel";
      panel.style.cssText = [
        "position:fixed",
        "left:14px",
        "bottom:14px",
        "z-index:99998",
        "width:min(460px,calc(100vw - 28px))",
        "max-height:56vh",
        "overflow:auto",
        "padding:14px",
        "border:1px solid rgba(88,117,170,.36)",
        "border-radius:18px",
        "background:rgba(244,248,255,.94)",
        "color:#24385f",
        "font:12px/1.5 Consolas,Menlo,monospace",
        "box-shadow:0 18px 45px rgba(54,70,110,.22)",
        "backdrop-filter:blur(12px)",
        "white-space:pre-wrap",
        "display:none"
      ].join(";");
      const head = document.createElement("div");
      head.style.cssText = "display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:10px;";
      const title = document.createElement("strong");
      title.textContent = "续话状态";
      title.style.cssText = "font:700 14px/1.2 system-ui,sans-serif;color:#1f3768;";
      const actionBar = document.createElement("div");
      actionBar.style.cssText = [
        "display:flex",
        "flex-direction:column",
        "align-items:stretch",
        "gap:8px",
        "margin:0 0 10px"
      ].join(";");
      const copy = document.createElement("button");
      copy.type = "button";
      copy.textContent = "复制";
      copy.style.cssText = "border:0;border-radius:999px;padding:5px 10px;background:#eef4ff;color:#263d70;cursor:pointer;";
      copy.addEventListener("click", () => {
        copyFollowupReadinessReportToClipboard(copy);
      });
      const copySelected = document.createElement("button");
      copySelected.type = "button";
      copySelected.textContent = "\u590d\u5236\u77ed\u53e5";
      copySelected.title = "\u590d\u5236\u5f53\u524d\u9009\u4e2d\u7684\u672c\u5730\u7eed\u8bdd\u77ed\u53e5";
      copySelected.style.cssText = "border:0;border-radius:999px;padding:5px 10px;background:#eafaf2;color:#18583f;cursor:pointer;";
      copySelected.addEventListener("click", () => {
        copyFollowupReadinessSelectedTextToClipboard(copySelected);
      });
      const copySummary = document.createElement("button");
      copySummary.type = "button";
      copySummary.textContent = "\u590d\u5236\u6458\u8981";
      copySummary.title = "\u590d\u5236\u9884\u6f14\u5361\u7247\u4e2d\u7684\u7b80\u8981\u8c03\u8bd5\u4fe1\u606f";
      copySummary.style.cssText = "border:0;border-radius:999px;padding:5px 10px;background:#eef4ff;color:#263d70;cursor:pointer;";
      copySummary.addEventListener("click", () => {
        copyFollowupReadinessPreviewSummaryToClipboard(copySummary);
      });
      const copyBundle = document.createElement("button");
      copyBundle.type = "button";
      copyBundle.textContent = "\u590d\u5236\u5bf9\u6bd4\u5305";
      copyBundle.title = "\u4e00\u6b21\u590d\u5236\u5f53\u524d\u77ed\u53e5\u4e0e\u9884\u6f14\u6458\u8981";
      copyBundle.style.cssText = "border:0;border-radius:999px;padding:5px 10px;background:#e9f2ff;color:#1f4378;cursor:pointer;";
      copyBundle.addEventListener("click", () => {
        copyFollowupReadinessPreviewCopyBundleToClipboard(copyBundle);
      });
      const copyJson = document.createElement("button");
      copyJson.type = "button";
      copyJson.textContent = "\u590d\u5236JSON";
      copyJson.title = "\u590d\u5236\u5f53\u524d\u9884\u6f14\u5361\u7247\u7684\u7ed3\u6784\u5316 JSON \u5feb\u7167";
      copyJson.style.cssText = "border:0;border-radius:999px;padding:5px 10px;background:#edf1ff;color:#2d3f7e;cursor:pointer;";
      copyJson.addEventListener("click", () => {
        copyFollowupReadinessPreviewJsonToClipboard(copyJson);
      });
      const copyOneLine = document.createElement("button");
      copyOneLine.type = "button";
      copyOneLine.textContent = "\u590d\u5236\u4e00\u884c";
      copyOneLine.title = "\u590d\u5236\u5f53\u524d\u9884\u6f14\u7b80\u8981\u7684\u5355\u884c\u6587\u672c";
      copyOneLine.style.cssText = "border:0;border-radius:999px;padding:5px 10px;background:#f1f6ff;color:#32497f;cursor:pointer;";
      copyOneLine.addEventListener("click", () => {
        copyFollowupReadinessPreviewOneLineToClipboard(copyOneLine);
      });
      const copyTemplate = document.createElement("button");
      copyTemplate.type = "button";
      copyTemplate.textContent = "复制模板";
      copyTemplate.style.cssText = "border:0;border-radius:999px;padding:5px 10px;background:#fff7d6;color:#5b4211;cursor:pointer;";
      copyTemplate.addEventListener("click", () => {
        copyFollowupConfigTemplateToClipboard(copyTemplate);
      });
      const rehearsalButtons = FOLLOWUP_REHEARSAL_SCENARIOS.map((scenario) => {
        const button = document.createElement("button");
        button.type = "button";
        button.textContent = scenario.label;
        button.title = "\u4ec5\u8bbe\u7f6e\u672c\u5730\u5185\u5b58\u7eed\u8bdd\u72b6\u6001\uff0c\u4e0d\u8bf7\u6c42\u6a21\u578b\u6216\u8bed\u97f3";
        button.style.cssText = "border:0;border-radius:999px;padding:5px 10px;background:#e8fff3;color:#18583f;cursor:pointer;";
        button.dataset.scenario = scenario.id;
        button.addEventListener("click", () => {
          runFollowupReadinessPanelRehearsal(button, scenario.id);
        });
        return button;
      });
      const clearRehearsal = document.createElement("button");
      clearRehearsal.type = "button";
      clearRehearsal.textContent = "\u6e05\u9664\u9884\u6f14";
      clearRehearsal.title = "\u6062\u590d\u9884\u6f14\u524d\u7684\u672c\u5730 pending \u72b6\u6001";
      clearRehearsal.style.cssText = "border:0;border-radius:999px;padding:5px 10px;background:#f1f4fb;color:#33415f;cursor:pointer;";
      clearRehearsal.addEventListener("click", () => {
        clearFollowupReadinessPanelRehearsal(clearRehearsal);
      });
      const trialArm = document.createElement("button");
      trialArm.type = "button";
      trialArm.textContent = "Arm \u8bd5\u8fd0\u884c";
      trialArm.title = "\u9700\u8981\u8f93\u5165 ARM_GRAY_AUTO_TRIAL\uff1b\u53ea\u4fee\u6539\u672c\u5730\u5185\u5b58\u95e8\u7981";
      trialArm.style.cssText = "border:0;border-radius:999px;padding:5px 10px;background:#fff3d8;color:#694411;cursor:pointer;";
      trialArm.addEventListener("click", () => {
        handleGrayAutoTrialArmClick(trialArm);
      });
      const trialStop = document.createElement("button");
      trialStop.type = "button";
      trialStop.textContent = "Emergency Stop";
      trialStop.title = "\u7acb\u523b\u5c01\u53e3\u672c\u6b21\u8bd5\u8fd0\u884c session";
      trialStop.style.cssText = "border:0;border-radius:999px;padding:5px 10px;background:#ffe6e3;color:#7b221d;cursor:pointer;";
      trialStop.addEventListener("click", () => {
        handleGrayAutoTrialStopClick(trialStop);
      });
      const trialDisarm = document.createElement("button");
      trialDisarm.type = "button";
      trialDisarm.textContent = "Disarm";
      trialDisarm.title = "\u5173\u95ed\u672c\u5730\u5185\u5b58\u7070\u5ea6\u95e8\u7981\u5e76\u505c\u6b62 polling";
      trialDisarm.style.cssText = "border:0;border-radius:999px;padding:5px 10px;background:#e9f2ff;color:#1f4378;cursor:pointer;";
      trialDisarm.addEventListener("click", () => {
        handleGrayAutoTrialDisarmClick(trialDisarm);
      });
      const trialReset = document.createElement("button");
      trialReset.type = "button";
      trialReset.textContent = "Reset Session";
      trialReset.title = "\u9700\u8981\u8f93\u5165 RESET_GRAY_AUTO_TRIAL_SESSION\uff1b\u4e0d\u542f\u52a8 polling";
      trialReset.style.cssText = "border:0;border-radius:999px;padding:5px 10px;background:#f1f4fb;color:#33415f;cursor:pointer;";
      trialReset.addEventListener("click", () => {
        handleGrayAutoTrialResetClick(trialReset);
      });
      const trialCopyAudit = document.createElement("button");
      trialCopyAudit.type = "button";
      trialCopyAudit.textContent = "\u590d\u5236\u5ba1\u8ba1";
      trialCopyAudit.title = "\u590d\u5236\u672c\u6b21\u7070\u5ea6\u8bd5\u8fd0\u884c\u7684\u7b80\u8981\u5ba1\u8ba1\u6458\u8981";
      trialCopyAudit.style.cssText = "border:0;border-radius:999px;padding:5px 10px;background:#eef4ff;color:#263d70;cursor:pointer;";
      trialCopyAudit.addEventListener("click", () => {
        copyGrayAutoTrialAuditSummaryToClipboard(trialCopyAudit);
      });
      const trialCopyTimeline = document.createElement("button");
      trialCopyTimeline.type = "button";
      trialCopyTimeline.textContent = "\u590d\u5236\u65f6\u95f4\u7ebf";
      trialCopyTimeline.title = "\u590d\u5236\u672c\u6b21\u7070\u5ea6\u8bd5\u8fd0\u884c\u63a7\u5236\u548c polling \u4e8b\u4ef6\u65f6\u95f4\u7ebf";
      trialCopyTimeline.style.cssText = "border:0;border-radius:999px;padding:5px 10px;background:#edf1ff;color:#2d3f7e;cursor:pointer;";
      trialCopyTimeline.addEventListener("click", () => {
        copyGrayAutoTrialTimelineToClipboard(trialCopyTimeline);
      });
      const trialCopyDecision = document.createElement("button");
      trialCopyDecision.type = "button";
      trialCopyDecision.textContent = "\u590d\u5236\u51b3\u7b56";
      trialCopyDecision.title = "\u590d\u5236\u7070\u5ea6\u8bd5\u8fd0\u884c Go/No-Go \u51b3\u7b56\u5305";
      trialCopyDecision.style.cssText = "border:0;border-radius:999px;padding:5px 10px;background:#fff6dd;color:#684914;cursor:pointer;";
      trialCopyDecision.addEventListener("click", () => {
        copyGrayAutoTrialDecisionToClipboard(trialCopyDecision);
      });
      const trialCopySignoff = document.createElement("button");
      trialCopySignoff.type = "button";
      trialCopySignoff.textContent = "\u590d\u5236\u7b7e\u6536";
      trialCopySignoff.title = "\u590d\u5236\u7070\u5ea6\u8bd5\u8fd0\u884c\u7b7e\u6536\u6a21\u677f";
      trialCopySignoff.style.cssText = "border:0;border-radius:999px;padding:5px 10px;background:#fff9e8;color:#6b5018;cursor:pointer;";
      trialCopySignoff.addEventListener("click", () => {
        copyGrayAutoTrialSignoffToClipboard(trialCopySignoff);
      });
      const trialCopyCharacter = document.createElement("button");
      trialCopyCharacter.type = "button";
      trialCopyCharacter.textContent = "\u590d\u5236\u89d2\u8272\u9884\u89c8";
      trialCopyCharacter.title = "\u590d\u5236\u7070\u5ea6\u8bd5\u8fd0\u884c\u540e\u7684\u53ea\u8bfb\u89d2\u8272\u8868\u73b0\u9884\u89c8";
      trialCopyCharacter.style.cssText = "border:0;border-radius:999px;padding:5px 10px;background:#eef8f2;color:#20513a;cursor:pointer;";
      trialCopyCharacter.addEventListener("click", () => {
        copyGrayAutoTrialCharacterCuePreviewToClipboard(trialCopyCharacter);
      });
      const trialCopyCharacterHandoff = document.createElement("button");
      trialCopyCharacterHandoff.type = "button";
      trialCopyCharacterHandoff.textContent = "\u590d\u5236\u63a5\u5165\u68c0\u67e5";
      trialCopyCharacterHandoff.title = "\u590d\u5236\u7070\u5ea6\u8bd5\u8fd0\u884c\u89d2\u8272\u8868\u73b0\u63a5\u5165\u524d\u53ea\u8bfb\u68c0\u67e5";
      trialCopyCharacterHandoff.style.cssText = "border:0;border-radius:999px;padding:5px 10px;background:#f1fff6;color:#22513a;cursor:pointer;";
      trialCopyCharacterHandoff.addEventListener("click", () => {
        copyGrayAutoTrialCharacterCueHandoffChecklistToClipboard(trialCopyCharacterHandoff);
      });
      const trialCopyCharacterRecap = document.createElement("button");
      trialCopyCharacterRecap.type = "button";
      trialCopyCharacterRecap.textContent = "\u590d\u5236\u56de\u770b";
      trialCopyCharacterRecap.title = "\u590d\u5236\u6700\u8fd1\u4e00\u6b21\u89d2\u8272 cue \u624b\u52a8\u8bd5\u53d1\u56de\u770b";
      trialCopyCharacterRecap.style.cssText = "border:0;border-radius:999px;padding:5px 10px;background:#eef9ff;color:#1d4b64;cursor:pointer;";
      trialCopyCharacterRecap.addEventListener("click", () => {
        copyGrayAutoTrialCharacterCueManualEmitRecapToClipboard(trialCopyCharacterRecap);
      });
      const trialCopyCharacterStrategy = document.createElement("button");
      trialCopyCharacterStrategy.type = "button";
      trialCopyCharacterStrategy.textContent = "\u590d\u5236\u7b56\u7565";
      trialCopyCharacterStrategy.title = "\u590d\u5236\u53ea\u8bfb\u89d2\u8272\u8868\u73b0\u7b56\u7565\u8349\u6848";
      trialCopyCharacterStrategy.style.cssText = "border:0;border-radius:999px;padding:5px 10px;background:#f4f5ff;color:#343f75;cursor:pointer;";
      trialCopyCharacterStrategy.addEventListener("click", () => {
        copyGrayAutoTrialCharacterExpressionStrategyDraftToClipboard(trialCopyCharacterStrategy);
      });
      const trialCopyCharacterReview = document.createElement("button");
      trialCopyCharacterReview.type = "button";
      trialCopyCharacterReview.textContent = "\u590d\u5236\u8bc4\u5ba1";
      trialCopyCharacterReview.title = "\u590d\u5236\u89d2\u8272\u8868\u73b0\u7b56\u7565\u8bc4\u5ba1\u5305";
      trialCopyCharacterReview.style.cssText = "border:0;border-radius:999px;padding:5px 10px;background:#fff7ea;color:#614517;cursor:pointer;";
      trialCopyCharacterReview.addEventListener("click", () => {
        copyGrayAutoTrialCharacterExpressionStrategyReviewPackageToClipboard(trialCopyCharacterReview);
      });
      const trialCopyCharacterAutoPlan = document.createElement("button");
      trialCopyCharacterAutoPlan.type = "button";
      trialCopyCharacterAutoPlan.textContent = "\u590d\u5236\u8ba1\u5212";
      trialCopyCharacterAutoPlan.title = "\u590d\u5236\u81ea\u52a8\u89d2\u8272\u8868\u73b0\u63a5\u5165\u8ba1\u5212";
      trialCopyCharacterAutoPlan.style.cssText = "border:0;border-radius:999px;padding:5px 10px;background:#eef0ff;color:#303b74;cursor:pointer;";
      trialCopyCharacterAutoPlan.addEventListener("click", () => {
        copyGrayAutoTrialCharacterAutoRuntimeSafetyPlanToClipboard(trialCopyCharacterAutoPlan);
      });
      const trialCopyCharacterDryRun = document.createElement("button");
      trialCopyCharacterDryRun.type = "button";
      trialCopyCharacterDryRun.textContent = "\u590d\u5236 dry-run";
      trialCopyCharacterDryRun.title = "\u590d\u5236\u81ea\u52a8\u89d2\u8272\u8868\u73b0 dry-run";
      trialCopyCharacterDryRun.style.cssText = "border:0;border-radius:999px;padding:5px 10px;background:#eff8ff;color:#254b6a;cursor:pointer;";
      trialCopyCharacterDryRun.addEventListener("click", () => {
        copyGrayAutoTrialCharacterAutoRuntimeDryRunToClipboard(trialCopyCharacterDryRun);
      });
      const trialCopyCharacterSwitchPlan = document.createElement("button");
      trialCopyCharacterSwitchPlan.type = "button";
      trialCopyCharacterSwitchPlan.textContent = "\u590d\u5236\u5f00\u5173\u8ba1\u5212";
      trialCopyCharacterSwitchPlan.title = "\u590d\u5236\u81ea\u52a8\u89d2\u8272\u8868\u73b0\u663e\u5f0f\u5f00\u5173\u8ba1\u5212";
      trialCopyCharacterSwitchPlan.style.cssText = "border:0;border-radius:999px;padding:5px 10px;background:#fff3e8;color:#68401f;cursor:pointer;";
      trialCopyCharacterSwitchPlan.addEventListener("click", () => {
        copyGrayAutoTrialCharacterAutoRuntimeSwitchPlanToClipboard(trialCopyCharacterSwitchPlan);
      });
      const trialCopyCharacterSwitchReview = document.createElement("button");
      trialCopyCharacterSwitchReview.type = "button";
      trialCopyCharacterSwitchReview.textContent = "\u590d\u5236\u8bc4\u5ba1";
      trialCopyCharacterSwitchReview.title = "\u590d\u5236\u81ea\u52a8\u89d2\u8272\u8868\u73b0\u663e\u5f0f\u5f00\u5173\u8bc4\u5ba1\u5305";
      trialCopyCharacterSwitchReview.style.cssText = "border:0;border-radius:999px;padding:5px 10px;background:#fff0dd;color:#6b451f;cursor:pointer;";
      trialCopyCharacterSwitchReview.addEventListener("click", () => {
        copyGrayAutoTrialCharacterAutoRuntimeSwitchReviewToClipboard(trialCopyCharacterSwitchReview);
      });
      const trialCopyCharacterSwitchAcceptance = document.createElement("button");
      trialCopyCharacterSwitchAcceptance.type = "button";
      trialCopyCharacterSwitchAcceptance.textContent = "\u590d\u5236\u9a8c\u6536";
      trialCopyCharacterSwitchAcceptance.title = "\u590d\u5236\u81ea\u52a8\u89d2\u8272\u8868\u73b0\u663e\u5f0f\u5f00\u5173\u9a8c\u6536\u5305";
      trialCopyCharacterSwitchAcceptance.style.cssText = "border:0;border-radius:999px;padding:5px 10px;background:#fff6dc;color:#654a18;cursor:pointer;";
      trialCopyCharacterSwitchAcceptance.addEventListener("click", () => {
        copyGrayAutoTrialCharacterAutoRuntimeSwitchAcceptanceToClipboard(trialCopyCharacterSwitchAcceptance);
      });
      const trialCopyCharacterSwitchControl = document.createElement("button");
      trialCopyCharacterSwitchControl.type = "button";
      trialCopyCharacterSwitchControl.textContent = "\u590d\u5236\u72b6\u6001";
      trialCopyCharacterSwitchControl.title = "\u590d\u5236\u81ea\u52a8\u89d2\u8272\u8868\u73b0\u663e\u5f0f\u5f00\u5173\u63a7\u5236\u72b6\u6001";
      trialCopyCharacterSwitchControl.style.cssText = "border:0;border-radius:999px;padding:5px 10px;background:#fff9e6;color:#6a4c19;cursor:pointer;";
      trialCopyCharacterSwitchControl.addEventListener("click", () => {
        copyGrayAutoTrialCharacterAutoRuntimeSwitchControlToClipboard(trialCopyCharacterSwitchControl);
      });
      const trialCopyCharacterSwitchDiagnostics = document.createElement("button");
      trialCopyCharacterSwitchDiagnostics.type = "button";
      trialCopyCharacterSwitchDiagnostics.textContent = "\u590d\u5236\u8bca\u65ad";
      trialCopyCharacterSwitchDiagnostics.title = "\u590d\u5236\u81ea\u52a8\u89d2\u8272\u8868\u73b0\u663e\u5f0f\u5f00\u5173\u8bca\u65ad";
      trialCopyCharacterSwitchDiagnostics.style.cssText = "border:0;border-radius:999px;padding:5px 10px;background:#fff4d2;color:#6b4814;cursor:pointer;";
      trialCopyCharacterSwitchDiagnostics.addEventListener("click", () => {
        copyGrayAutoTrialCharacterAutoRuntimeSwitchDiagnosticsToClipboard(trialCopyCharacterSwitchDiagnostics);
      });
      const trialCopyCharacterSwitchRollback = document.createElement("button");
      trialCopyCharacterSwitchRollback.type = "button";
      trialCopyCharacterSwitchRollback.textContent = "\u590d\u5236\u56de\u6536";
      trialCopyCharacterSwitchRollback.title = "\u590d\u5236\u81ea\u52a8\u89d2\u8272\u8868\u73b0\u663e\u5f0f\u5f00\u5173\u56de\u6536\u5305";
      trialCopyCharacterSwitchRollback.style.cssText = "border:0;border-radius:999px;padding:5px 10px;background:#ffeedd;color:#6a3f1b;cursor:pointer;";
      trialCopyCharacterSwitchRollback.addEventListener("click", () => {
        copyGrayAutoTrialCharacterAutoRuntimeSwitchRollbackToClipboard(trialCopyCharacterSwitchRollback);
      });
      const trialCopyCharacterFinalPreflight = document.createElement("button");
      trialCopyCharacterFinalPreflight.type = "button";
      trialCopyCharacterFinalPreflight.textContent = "\u590d\u5236\u9884\u68c0";
      trialCopyCharacterFinalPreflight.title = "\u590d\u5236\u81ea\u52a8\u89d2\u8272\u8868\u73b0\u6700\u7ec8\u9884\u68c0\u5305";
      trialCopyCharacterFinalPreflight.style.cssText = "border:0;border-radius:999px;padding:5px 10px;background:#ffe9cf;color:#704117;cursor:pointer;";
      trialCopyCharacterFinalPreflight.addEventListener("click", () => {
        copyGrayAutoTrialCharacterAutoRuntimeFinalPreflightToClipboard(trialCopyCharacterFinalPreflight);
      });
      const trialCopyCharacterImplementationDraft = document.createElement("button");
      trialCopyCharacterImplementationDraft.type = "button";
      trialCopyCharacterImplementationDraft.textContent = "\u590d\u5236\u8349\u6848";
      trialCopyCharacterImplementationDraft.title = "\u590d\u5236\u81ea\u52a8\u89d2\u8272\u8868\u73b0\u5b9e\u73b0\u8349\u6848";
      trialCopyCharacterImplementationDraft.style.cssText = "border:0;border-radius:999px;padding:5px 10px;background:#eef6ff;color:#1d4b64;cursor:pointer;";
      trialCopyCharacterImplementationDraft.addEventListener("click", () => {
        copyGrayAutoTrialCharacterAutoRuntimeSeparateImplementationDraftToClipboard(trialCopyCharacterImplementationDraft);
      });
      const trialEnableCharacterSwitch = document.createElement("button");
      trialEnableCharacterSwitch.type = "button";
      trialEnableCharacterSwitch.textContent = "\u542f\u7528\u5f00\u5173";
      trialEnableCharacterSwitch.title = "\u9700\u8981\u8f93\u5165 ENABLE_GRAY_AUTO_TRIAL_CHARACTER_AUTO_RUNTIME_SWITCH\uff1b\u53ea\u5207\u6362\u672c\u5730\u6807\u8bb0";
      trialEnableCharacterSwitch.style.cssText = "border:0;border-radius:999px;padding:5px 10px;background:#ffe7c8;color:#6b4014;cursor:pointer;";
      trialEnableCharacterSwitch.addEventListener("click", () => {
        handleGrayAutoTrialCharacterAutoRuntimeSwitchEnableClick(trialEnableCharacterSwitch);
      });
      const trialDisableCharacterSwitch = document.createElement("button");
      trialDisableCharacterSwitch.type = "button";
      trialDisableCharacterSwitch.textContent = "\u5173\u95ed\u5f00\u5173";
      trialDisableCharacterSwitch.title = "\u4ec5\u5173\u95ed\u672c\u5730\u663e\u5f0f\u5f00\u5173\u6807\u8bb0\uff0c\u4e0d\u6539 scheduler/config";
      trialDisableCharacterSwitch.style.cssText = "border:0;border-radius:999px;padding:5px 10px;background:#f1f4fb;color:#33415f;cursor:pointer;";
      trialDisableCharacterSwitch.addEventListener("click", () => {
        handleGrayAutoTrialCharacterAutoRuntimeSwitchDisableClick(trialDisableCharacterSwitch);
      });
      const trialRollbackCharacterSwitch = document.createElement("button");
      trialRollbackCharacterSwitch.type = "button";
      trialRollbackCharacterSwitch.textContent = "\u56de\u5230\u9ed8\u8ba4\u5173\u95ed";
      trialRollbackCharacterSwitch.title = "\u6062\u590d\u672c\u5730\u663e\u5f0f\u5f00\u5173\u5230\u9ed8\u8ba4\u5173\u95ed\uff0c\u4e0d\u6539 scheduler/config";
      trialRollbackCharacterSwitch.style.cssText = "border:0;border-radius:999px;padding:5px 10px;background:#ffe4d3;color:#6f3b17;cursor:pointer;";
      trialRollbackCharacterSwitch.addEventListener("click", () => {
        handleGrayAutoTrialCharacterAutoRuntimeSwitchRollbackClick(trialRollbackCharacterSwitch);
      });
      const trialEmitCharacter = document.createElement("button");
      trialEmitCharacter.type = "button";
      trialEmitCharacter.textContent = "\u8bd5\u53d1\u89d2\u8272cue";
      trialEmitCharacter.title = "\u9700\u8981\u8f93\u5165 EMIT_GRAY_AUTO_TRIAL_CHARACTER_CUE\uff1b\u53ea\u6309\u624b\u52a8\u9884\u8bbe\u8bd5\u53d1 runtime cue \u4e00\u6b21";
      trialEmitCharacter.style.cssText = "border:0;border-radius:999px;padding:5px 10px;background:#e7fff1;color:#174d35;cursor:pointer;";
      trialEmitCharacter.addEventListener("click", () => {
        handleGrayAutoTrialCharacterCueManualEmitClick(trialEmitCharacter);
      });
      const trialSendReplyCueCandidate = document.createElement("button");
      trialSendReplyCueCandidate.type = "button";
      trialSendReplyCueCandidate.textContent = "\u53d1\u9001\u56de\u590dcue";
      trialSendReplyCueCandidate.title = "\u9700\u8981\u8f93\u5165 SEND_REPLY_CHARACTER_CUE_CANDIDATE\uff1b\u53ea\u624b\u52a8\u53d1\u9001\u4e0a\u4e00\u6761\u52a9\u624b\u56de\u590d\u7684\u5019\u9009 runtime cue";
      trialSendReplyCueCandidate.style.cssText = "border:0;border-radius:999px;padding:5px 10px;background:#fff5d7;color:#6a4514;cursor:pointer;";
      trialSendReplyCueCandidate.addEventListener("click", () => {
        handleReplyCharacterCueCandidateManualSendClick(trialSendReplyCueCandidate);
      });
      const trialCharacterCuePreset = document.createElement("select");
      trialCharacterCuePreset.title = "\u624b\u52a8\u89d2\u8272 cue \u9884\u8bbe\uff1b\u4ec5\u5f71\u54cd\u786e\u8ba4\u540e\u7684\u672c\u5730\u8bd5\u53d1";
      trialCharacterCuePreset.style.cssText = [
        "border:1px solid rgba(74,121,93,.24)",
        "border-radius:999px",
        "padding:5px 8px",
        "background:#f8fffb",
        "color:#174d35",
        "font:12px/1.2 system-ui,sans-serif"
      ].join(";");
      listGrayAutoTrialCharacterCuePresets().forEach((preset) => {
        const option = document.createElement("option");
        option.value = preset.key;
        option.textContent = preset.label;
        option.title = preset.description;
        trialCharacterCuePreset.appendChild(option);
      });
      const manualConfirm = document.createElement("button");
      manualConfirm.type = "button";
      manualConfirm.textContent = "\u786e\u8ba4";
      manualConfirm.style.cssText = "border:0;border-radius:999px;padding:5px 10px;background:#e8fff3;color:#18583f;cursor:pointer;";
      manualConfirm.addEventListener("click", () => {
        handleFollowupManualConfirmClick(manualConfirm);
      });
      const manualDismiss = document.createElement("button");
      manualDismiss.type = "button";
      manualDismiss.textContent = "\u5ffd\u7565";
      manualDismiss.style.cssText = "border:0;border-radius:999px;padding:5px 10px;background:#f1f4fb;color:#33415f;cursor:pointer;";
      manualDismiss.addEventListener("click", () => {
        dismissFollowupManualConfirmation(manualDismiss);
      });
      const manualReview = document.createElement("button");
      manualReview.type = "button";
      manualReview.textContent = "\u67e5\u770b\u8be6\u60c5";
      manualReview.style.cssText = "border:0;border-radius:999px;padding:5px 10px;background:#e9f2ff;color:#1f4378;cursor:pointer;";
      manualReview.addEventListener("click", () => {
        reviewFollowupManualConfirmationDetails();
      });
      const manualActions = createFollowupReadinessActionGroup("\u786e\u8ba4", [
        manualConfirm,
        manualDismiss,
        manualReview
      ]);
      const trialActions = createFollowupReadinessActionGroup("\u8bd5\u8fd0\u884c", [
        trialArm,
        trialStop,
        trialDisarm,
        trialReset
      ]);
      const recoveryActions = createFollowupReadinessActionGroup("\u6536\u53e3", [
        trialDisableCharacterSwitch,
        trialRollbackCharacterSwitch
      ]);
      const materialActions = createFollowupReadinessCollapsibleActionGroup("\u6750\u6599", [
        trialCopyAudit,
        trialCopyTimeline,
        trialCopyDecision,
        trialCopySignoff,
        trialCopyCharacter,
        trialCopyCharacterHandoff,
        trialCopyCharacterRecap,
        trialCopyCharacterStrategy,
        trialCopyCharacterReview,
        trialCopyCharacterAutoPlan,
        trialCopyCharacterDryRun,
        trialCopyCharacterSwitchPlan,
        trialCopyCharacterSwitchReview,
        trialCopyCharacterSwitchAcceptance,
        trialCopyCharacterSwitchControl,
        trialCopyCharacterSwitchDiagnostics,
        trialCopyCharacterSwitchRollback,
        trialCopyCharacterFinalPreflight,
        trialCopyCharacterImplementationDraft,
        copySelected,
        copySummary,
        copyBundle,
        copyJson,
        copyOneLine,
        copy,
        copyTemplate
      ]);
      const advancedLocalActions = createFollowupReadinessCollapsibleActionGroup("\u9ad8\u98ce\u9669\u672c\u5730\u5165\u53e3", [
        trialEnableCharacterSwitch,
        trialCharacterCuePreset,
        trialEmitCharacter,
        trialSendReplyCueCandidate
      ]);
      advancedLocalActions.title = "\u9ed8\u8ba4\u6536\u8d77\uff1b\u4ec5\u7528\u4e8e\u672c\u5730\u4e13\u9879\u8bd5\u9a8c\uff0c\u4e0d\u8fde\u63a5 automatic runtime";
      const manualStatus = document.createElement("div");
      manualStatus.style.cssText = [
        "margin:0 0 10px",
        "padding:8px 10px",
        "border:1px solid rgba(93,128,195,.2)",
        "border-radius:12px",
        "background:rgba(255,255,255,.58)",
        "font:12px/1.45 system-ui,sans-serif",
        "color:#2a416f"
      ].join(";");
      const trialStatus = document.createElement("div");
      trialStatus.style.cssText = [
        "margin:0 0 10px",
        "padding:8px 10px",
        "border:1px solid rgba(116,127,155,.22)",
        "border-radius:12px",
        "background:rgba(248,251,255,.66)",
        "font:12px/1.45 system-ui,sans-serif",
        "color:#30466f",
        "white-space:pre-wrap"
      ].join(";");
      const close = document.createElement("button");
      close.type = "button";
      close.textContent = "隐藏";
      close.style.cssText = "border:0;border-radius:999px;padding:5px 10px;background:#dce8ff;color:#263d70;cursor:pointer;";
      close.addEventListener("click", () => {
        state.followupReadinessVisible = false;
        updateFollowupReadinessPanel();
      });
      head.appendChild(title);
      head.appendChild(close);
      actionBar.appendChild(manualActions);
      actionBar.appendChild(trialActions);
      actionBar.appendChild(recoveryActions);
      actionBar.appendChild(createFollowupReadinessActionGroup("\u9884\u6f14", rehearsalButtons.concat(clearRehearsal)));
      actionBar.appendChild(materialActions);
      actionBar.appendChild(advancedLocalActions);
      const card = document.createElement("pre");
      card.style.cssText = [
        "margin:0 0 10px",
        "padding:10px 12px",
        "border:1px solid rgba(93,128,195,.24)",
        "border-radius:14px",
        "background:rgba(255,255,255,.62)",
        "white-space:pre-wrap",
        "font:12px/1.55 Consolas,Menlo,monospace",
        "color:#20345d"
      ].join(";");
      const confirmationCard = document.createElement("pre");
      confirmationCard.style.cssText = [
        "margin:0 0 10px",
        "padding:10px 12px",
        "border:1px solid rgba(88,137,111,.28)",
        "border-radius:14px",
        "background:rgba(238,255,246,.58)",
        "white-space:pre-wrap",
        "font:12px/1.55 Consolas,Menlo,monospace",
        "color:#1f4c39",
        "display:none"
      ].join(";");
      const trialCard = document.createElement("pre");
      trialCard.style.cssText = [
        "margin:0 0 10px",
        "padding:10px 12px",
        "border:1px solid rgba(108,126,164,.26)",
        "border-radius:14px",
        "background:rgba(248,251,255,.74)",
        "white-space:pre-wrap",
        "font:12px/1.55 Consolas,Menlo,monospace",
        "color:#263d70"
      ].join(";");
      const checklistCard = document.createElement("pre");
      checklistCard.style.cssText = [
        "margin:0 0 10px",
        "padding:10px 12px",
        "border:1px solid rgba(87,143,112,.28)",
        "border-radius:14px",
        "background:rgba(240,255,247,.62)",
        "white-space:pre-wrap",
        "font:12px/1.55 Consolas,Menlo,monospace",
        "color:#1f4c39"
      ].join(";");
      const timelineCard = document.createElement("pre");
      timelineCard.style.cssText = [
        "margin:0 0 10px",
        "padding:10px 12px",
        "border:1px solid rgba(116,127,155,.24)",
        "border-radius:14px",
        "background:rgba(255,255,255,.54)",
        "white-space:pre-wrap",
        "font:12px/1.55 Consolas,Menlo,monospace",
        "color:#2f3f61"
      ].join(";");
      const outcomeCard = document.createElement("pre");
      outcomeCard.style.cssText = [
        "margin:0 0 10px",
        "padding:10px 12px",
        "border:1px solid rgba(139,116,78,.26)",
        "border-radius:14px",
        "background:rgba(255,250,238,.72)",
        "white-space:pre-wrap",
        "font:12px/1.55 Consolas,Menlo,monospace",
        "color:#4f3d22"
      ].join(";");
      const decisionCard = document.createElement("pre");
      decisionCard.style.cssText = [
        "margin:0 0 10px",
        "padding:10px 12px",
        "border:1px solid rgba(160,128,64,.28)",
        "border-radius:14px",
        "background:rgba(255,252,241,.78)",
        "white-space:pre-wrap",
        "font:12px/1.55 Consolas,Menlo,monospace",
        "color:#53401f"
      ].join(";");
      const signoffCard = document.createElement("pre");
      signoffCard.style.cssText = [
        "margin:0 0 10px",
        "padding:10px 12px",
        "border:1px solid rgba(160,128,64,.24)",
        "border-radius:14px",
        "background:rgba(255,253,245,.78)",
        "white-space:pre-wrap",
        "font:12px/1.55 Consolas,Menlo,monospace",
        "color:#594520"
      ].join(";");
      const characterCard = document.createElement("pre");
      characterCard.style.cssText = [
        "margin:0 0 10px",
        "padding:10px 12px",
        "border:1px solid rgba(88,137,111,.26)",
        "border-radius:14px",
        "background:rgba(240,255,247,.66)",
        "white-space:pre-wrap",
        "font:12px/1.55 Consolas,Menlo,monospace",
        "color:#1f4c39"
      ].join(";");
      const characterHandoffCard = document.createElement("pre");
      characterHandoffCard.style.cssText = [
        "margin:0 0 10px",
        "padding:10px 12px",
        "border:1px solid rgba(88,137,111,.22)",
        "border-radius:14px",
        "background:rgba(247,255,250,.7)",
        "white-space:pre-wrap",
        "font:12px/1.55 Consolas,Menlo,monospace",
        "color:#254d39"
      ].join(";");
      const characterRecapCard = document.createElement("pre");
      characterRecapCard.style.cssText = [
        "margin:0 0 10px",
        "padding:10px 12px",
        "border:1px solid rgba(77,132,158,.22)",
        "border-radius:14px",
        "background:rgba(241,251,255,.72)",
        "white-space:pre-wrap",
        "font:12px/1.55 Consolas,Menlo,monospace",
        "color:#244b5f"
      ].join(";");
      const characterManualCueStatusCard = document.createElement("pre");
      characterManualCueStatusCard.style.cssText = [
        "margin:0 0 10px",
        "padding:10px 12px",
        "border:1px solid rgba(64,145,112,.24)",
        "border-radius:14px",
        "background:rgba(238,255,248,.78)",
        "white-space:pre-wrap",
        "font:12px/1.55 Consolas,Menlo,monospace",
        "color:#1d4f3b"
      ].join(";");
      const characterStrategyCard = document.createElement("pre");
      characterStrategyCard.style.cssText = [
        "margin:0 0 10px",
        "padding:10px 12px",
        "border:1px solid rgba(95,101,166,.22)",
        "border-radius:14px",
        "background:rgba(247,248,255,.72)",
        "white-space:pre-wrap",
        "font:12px/1.55 Consolas,Menlo,monospace",
        "color:#303865"
      ].join(";");
      const characterReviewCard = document.createElement("pre");
      characterReviewCard.style.cssText = [
        "margin:0 0 10px",
        "padding:10px 12px",
        "border:1px solid rgba(156,116,54,.24)",
        "border-radius:14px",
        "background:rgba(255,250,241,.76)",
        "white-space:pre-wrap",
        "font:12px/1.55 Consolas,Menlo,monospace",
        "color:#4f3d1f"
      ].join(";");
      const characterAutoPlanCard = document.createElement("pre");
      characterAutoPlanCard.style.cssText = [
        "margin:0 0 10px",
        "padding:10px 12px",
        "border:1px solid rgba(95,103,171,.24)",
        "border-radius:14px",
        "background:rgba(242,244,255,.76)",
        "white-space:pre-wrap",
        "font:12px/1.55 Consolas,Menlo,monospace",
        "color:#2f3969"
      ].join(";");
      const characterDryRunCard = document.createElement("pre");
      characterDryRunCard.style.cssText = [
        "margin:0 0 10px",
        "padding:10px 12px",
        "border:1px solid rgba(77,132,158,.24)",
        "border-radius:14px",
        "background:rgba(241,250,255,.76)",
        "white-space:pre-wrap",
        "font:12px/1.55 Consolas,Menlo,monospace",
        "color:#24485f"
      ].join(";");
      const characterSwitchPlanCard = document.createElement("pre");
      characterSwitchPlanCard.style.cssText = [
        "margin:0 0 10px",
        "padding:10px 12px",
        "border:1px solid rgba(169,116,58,.24)",
        "border-radius:14px",
        "background:rgba(255,247,239,.78)",
        "white-space:pre-wrap",
        "font:12px/1.55 Consolas,Menlo,monospace",
        "color:#5d3a1d"
      ].join(";");
      const characterSwitchReviewCard = document.createElement("pre");
      characterSwitchReviewCard.style.cssText = [
        "margin:0 0 10px",
        "padding:10px 12px",
        "border:1px solid rgba(173,112,50,.24)",
        "border-radius:14px",
        "background:rgba(255,244,231,.8)",
        "white-space:pre-wrap",
        "font:12px/1.55 Consolas,Menlo,monospace",
        "color:#603a19"
      ].join(";");
      const characterSwitchAcceptanceCard = document.createElement("pre");
      characterSwitchAcceptanceCard.style.cssText = [
        "margin:0 0 10px",
        "padding:10px 12px",
        "border:1px solid rgba(166,126,42,.24)",
        "border-radius:14px",
        "background:rgba(255,249,226,.8)",
        "white-space:pre-wrap",
        "font:12px/1.55 Consolas,Menlo,monospace",
        "color:#5d4616"
      ].join(";");
      const characterSwitchControlCard = document.createElement("pre");
      characterSwitchControlCard.style.cssText = [
        "margin:0 0 10px",
        "padding:10px 12px",
        "border:1px solid rgba(170,122,43,.24)",
        "border-radius:14px",
        "background:rgba(255,251,234,.84)",
        "white-space:pre-wrap",
        "font:12px/1.55 Consolas,Menlo,monospace",
        "color:#5e4518"
      ].join(";");
      const characterSwitchDiagnosticsCard = document.createElement("pre");
      characterSwitchDiagnosticsCard.style.cssText = [
        "margin:0 0 10px",
        "padding:10px 12px",
        "border:1px solid rgba(172,132,45,.24)",
        "border-radius:14px",
        "background:rgba(255,248,220,.82)",
        "white-space:pre-wrap",
        "font:12px/1.55 Consolas,Menlo,monospace",
        "color:#5f4615"
      ].join(";");
      const characterSwitchRollbackCard = document.createElement("pre");
      characterSwitchRollbackCard.style.cssText = [
        "margin:0 0 10px",
        "padding:10px 12px",
        "border:1px solid rgba(190,112,62,.24)",
        "border-radius:14px",
        "background:rgba(255,242,232,.82)",
        "white-space:pre-wrap",
        "font:12px/1.55 Consolas,Menlo,monospace",
        "color:#653b1c"
      ].join(";");
      const characterSwitchFinalPreflightCard = document.createElement("pre");
      characterSwitchFinalPreflightCard.style.cssText = [
        "margin:0 0 10px",
        "padding:10px 12px",
        "border:1px solid rgba(194,132,52,.26)",
        "border-radius:14px",
        "background:rgba(255,246,234,.84)",
        "white-space:pre-wrap",
        "font:12px/1.55 Consolas,Menlo,monospace",
        "color:#694219"
      ].join(";");
      const characterImplementationDraftCard = document.createElement("pre");
      characterImplementationDraftCard.style.cssText = [
        "margin:0 0 10px",
        "padding:10px 12px",
        "border:1px solid rgba(87,124,165,.24)",
        "border-radius:14px",
        "background:rgba(241,248,255,.82)",
        "white-space:pre-wrap",
        "font:12px/1.55 Consolas,Menlo,monospace",
        "color:#24425e"
      ].join(";");
      const backendEntryCard = document.createElement("pre");
      backendEntryCard.style.cssText = [
        "margin:0 0 10px",
        "padding:10px 12px",
        "border:1px solid rgba(87,124,165,.22)",
        "border-radius:14px",
        "background:rgba(242,247,255,.8)",
        "white-space:pre-wrap",
        "font:12px/1.55 Consolas,Menlo,monospace",
        "color:#23405f"
      ].join(";");
      const body = document.createElement("pre");
      body.style.cssText = "margin:0;white-space:pre-wrap;";
      const compare = document.createElement("div");
      compare.style.cssText = [
        "margin:0 0 10px",
        "padding:10px 12px",
        "border:1px solid rgba(93,128,195,.18)",
        "border-radius:14px",
        "background:rgba(255,255,255,.46)",
        "font:12px/1.55 Consolas,Menlo,monospace",
        "color:#263d70"
      ].join(";");
      panel.appendChild(head);
      panel.appendChild(actionBar);
      panel.appendChild(manualStatus);
      panel.appendChild(trialStatus);
      panel.appendChild(card);
      panel.appendChild(confirmationCard);
      panel.appendChild(trialCard);
      panel.appendChild(checklistCard);
      panel.appendChild(timelineCard);
      panel.appendChild(outcomeCard);
      panel.appendChild(decisionCard);
      panel.appendChild(signoffCard);
      panel.appendChild(characterCard);
      panel.appendChild(characterHandoffCard);
      panel.appendChild(characterRecapCard);
      panel.appendChild(characterManualCueStatusCard);
      panel.appendChild(characterStrategyCard);
      panel.appendChild(characterReviewCard);
      panel.appendChild(characterAutoPlanCard);
      panel.appendChild(characterDryRunCard);
      panel.appendChild(characterSwitchPlanCard);
      panel.appendChild(characterSwitchReviewCard);
      panel.appendChild(characterSwitchAcceptanceCard);
      panel.appendChild(characterSwitchControlCard);
      panel.appendChild(characterSwitchDiagnosticsCard);
      panel.appendChild(characterSwitchRollbackCard);
      panel.appendChild(characterSwitchFinalPreflightCard);
      panel.appendChild(characterImplementationDraftCard);
      panel.appendChild(backendEntryCard);
      panel.appendChild(compare);
      panel.appendChild(body);
      document.body.appendChild(panel);
      state.followupReadinessPanel = panel;
      state.followupReadinessCard = card;
      state.followupReadinessConfirmationCard = confirmationCard;
      state.followupReadinessTrialCard = trialCard;
      state.followupReadinessTrialChecklistCard = checklistCard;
      state.followupReadinessTrialTimelineCard = timelineCard;
      state.followupReadinessTrialOutcomeCard = outcomeCard;
      state.followupReadinessTrialDecisionCard = decisionCard;
      state.followupReadinessTrialSignoffCard = signoffCard;
      state.followupReadinessTrialCharacterCard = characterCard;
      state.followupReadinessTrialCharacterHandoffCard = characterHandoffCard;
      state.followupReadinessTrialCharacterRecapCard = characterRecapCard;
      state.followupReadinessTrialCharacterManualCueStatusCard = characterManualCueStatusCard;
      state.followupReadinessTrialCharacterStrategyCard = characterStrategyCard;
      state.followupReadinessTrialCharacterReviewCard = characterReviewCard;
      state.followupReadinessTrialCharacterAutoPlanCard = characterAutoPlanCard;
      state.followupReadinessTrialCharacterDryRunCard = characterDryRunCard;
      state.followupReadinessTrialCharacterSwitchPlanCard = characterSwitchPlanCard;
      state.followupReadinessTrialCharacterSwitchReviewCard = characterSwitchReviewCard;
      state.followupReadinessTrialCharacterSwitchAcceptanceCard = characterSwitchAcceptanceCard;
      state.followupReadinessTrialCharacterSwitchControlCard = characterSwitchControlCard;
      state.followupReadinessTrialCharacterSwitchDiagnosticsCard = characterSwitchDiagnosticsCard;
      state.followupReadinessTrialCharacterSwitchRollbackCard = characterSwitchRollbackCard;
      state.followupReadinessTrialCharacterSwitchFinalPreflightCard = characterSwitchFinalPreflightCard;
      state.followupReadinessTrialCharacterImplementationDraftCard = characterImplementationDraftCard;
      state.followupReadinessBackendEntryCard = backendEntryCard;
      state.followupReadinessCompare = compare;
      state.followupReadinessBody = body;
      state.followupReadinessManualActions = manualActions;
      state.followupReadinessManualStatus = manualStatus;
      state.followupReadinessManualConfirmBtn = manualConfirm;
      state.followupReadinessManualDismissBtn = manualDismiss;
      state.followupReadinessManualReviewBtn = manualReview;
      state.followupReadinessTrialActions = trialActions;
      state.followupReadinessTrialStatus = trialStatus;
      state.followupReadinessTrialArmBtn = trialArm;
      state.followupReadinessTrialStopBtn = trialStop;
      state.followupReadinessTrialDisarmBtn = trialDisarm;
      state.followupReadinessTrialResetBtn = trialReset;
      state.followupReadinessTrialCopyAuditBtn = trialCopyAudit;
      state.followupReadinessTrialCopyTimelineBtn = trialCopyTimeline;
      state.followupReadinessTrialCopyDecisionBtn = trialCopyDecision;
      state.followupReadinessTrialCopySignoffBtn = trialCopySignoff;
      state.followupReadinessTrialCopyCharacterBtn = trialCopyCharacter;
      state.followupReadinessTrialCopyCharacterHandoffBtn = trialCopyCharacterHandoff;
      state.followupReadinessTrialCopyCharacterRecapBtn = trialCopyCharacterRecap;
      state.followupReadinessTrialCopyCharacterStrategyBtn = trialCopyCharacterStrategy;
      state.followupReadinessTrialCopyCharacterReviewBtn = trialCopyCharacterReview;
      state.followupReadinessTrialCopyCharacterAutoPlanBtn = trialCopyCharacterAutoPlan;
      state.followupReadinessTrialCopyCharacterDryRunBtn = trialCopyCharacterDryRun;
      state.followupReadinessTrialCopyCharacterSwitchPlanBtn = trialCopyCharacterSwitchPlan;
      state.followupReadinessTrialCopyCharacterSwitchReviewBtn = trialCopyCharacterSwitchReview;
      state.followupReadinessTrialCopyCharacterSwitchAcceptanceBtn = trialCopyCharacterSwitchAcceptance;
      state.followupReadinessTrialCopyCharacterSwitchControlBtn = trialCopyCharacterSwitchControl;
      state.followupReadinessTrialCopyCharacterSwitchDiagnosticsBtn = trialCopyCharacterSwitchDiagnostics;
      state.followupReadinessTrialCopyCharacterSwitchRollbackBtn = trialCopyCharacterSwitchRollback;
      state.followupReadinessTrialCopyCharacterSwitchFinalPreflightBtn = trialCopyCharacterFinalPreflight;
      state.followupReadinessTrialCopyCharacterImplementationDraftBtn = trialCopyCharacterImplementationDraft;
      state.followupReadinessTrialCharacterSwitchEnableBtn = trialEnableCharacterSwitch;
      state.followupReadinessTrialCharacterSwitchDisableBtn = trialDisableCharacterSwitch;
      state.followupReadinessTrialCharacterSwitchRollbackBtn = trialRollbackCharacterSwitch;
      state.followupReadinessTrialEmitCharacterBtn = trialEmitCharacter;
      state.followupReadinessTrialSendReplyCueCandidateBtn = trialSendReplyCueCandidate;
      state.followupReadinessTrialCharacterCuePresetSelect = trialCharacterCuePreset;
      return panel;
    }

    function updateFollowupReadinessPanel() {
      if (!state.followupReadinessVisible) {
        if (state.followupReadinessPanel) {
          state.followupReadinessPanel.style.display = "none";
        }
        if (state.followupReadinessRefreshTimer) {
          clearInterval(state.followupReadinessRefreshTimer);
          state.followupReadinessRefreshTimer = 0;
        }
        return;
      }
      const panel = ensureFollowupReadinessPanel();
      if (!panel) {
        return;
      }
      if (!state.followupReadinessRefreshTimer) {
        state.followupReadinessRefreshTimer = window.setInterval(() => {
          if (!state.followupReadinessVisible) {
            updateFollowupReadinessPanel();
            return;
          }
          updateFollowupReadinessPreviewCard();
          updateFollowupManualConfirmationPreviewCard();
          updateGrayAutoTrialStatusCard();
          updateGrayAutoTrialPreRunChecklistCard();
          updateGrayAutoTrialTimelineCard();
          updateGrayAutoTrialOutcomeCard();
          updateGrayAutoTrialDecisionCard();
          updateGrayAutoTrialSignoffCard();
          updateGrayAutoTrialCharacterCard();
          updateGrayAutoTrialCharacterHandoffCard();
          updateGrayAutoTrialCharacterRecapCard();
          updateGrayAutoTrialCharacterManualCueStatusCard();
          updateGrayAutoTrialCharacterStrategyCard();
          updateGrayAutoTrialCharacterReviewCard();
          updateGrayAutoTrialCharacterAutoPlanCard();
          updateGrayAutoTrialCharacterDryRunCard();
          updateGrayAutoTrialCharacterSwitchPlanCard();
          updateGrayAutoTrialCharacterSwitchReviewCard();
          updateGrayAutoTrialCharacterSwitchAcceptanceCard();
          updateGrayAutoTrialCharacterSwitchControlCard();
          updateGrayAutoTrialCharacterSwitchDiagnosticsCard();
          updateGrayAutoTrialCharacterSwitchRollbackCard();
          updateGrayAutoTrialCharacterSwitchFinalPreflightCard();
          updateGrayAutoTrialCharacterImplementationDraftCard();
          updateReplyCharacterCueCandidateManualSendButton();
          updateFollowupReadinessBackendEntryCard();
          updateGrayAutoTrialControlPanel();
          updateFollowupManualConfirmationControls();
          updateFollowupReadinessScenarioCompare();
          if (state.followupReadinessBody) {
            state.followupReadinessBody.textContent = buildFollowupReadinessReport();
          }
        }, 1000);
      }
      panel.style.display = "block";
      updateFollowupReadinessPreviewCard();
      updateFollowupManualConfirmationPreviewCard();
      updateGrayAutoTrialStatusCard();
      updateGrayAutoTrialPreRunChecklistCard();
      updateGrayAutoTrialTimelineCard();
      updateGrayAutoTrialOutcomeCard();
      updateGrayAutoTrialDecisionCard();
      updateGrayAutoTrialSignoffCard();
      updateGrayAutoTrialCharacterCard();
      updateGrayAutoTrialCharacterHandoffCard();
      updateGrayAutoTrialCharacterRecapCard();
      updateGrayAutoTrialCharacterManualCueStatusCard();
      updateGrayAutoTrialCharacterStrategyCard();
      updateGrayAutoTrialCharacterReviewCard();
      updateGrayAutoTrialCharacterAutoPlanCard();
      updateGrayAutoTrialCharacterDryRunCard();
      updateGrayAutoTrialCharacterSwitchPlanCard();
      updateGrayAutoTrialCharacterSwitchReviewCard();
      updateGrayAutoTrialCharacterSwitchAcceptanceCard();
      updateGrayAutoTrialCharacterSwitchControlCard();
      updateGrayAutoTrialCharacterSwitchDiagnosticsCard();
      updateGrayAutoTrialCharacterSwitchRollbackCard();
      updateGrayAutoTrialCharacterSwitchFinalPreflightCard();
      updateGrayAutoTrialCharacterImplementationDraftCard();
      updateReplyCharacterCueCandidateManualSendButton();
      updateFollowupReadinessBackendEntryCard();
      updateGrayAutoTrialControlPanel();
      updateFollowupManualConfirmationControls();
      updateFollowupReadinessScenarioCompare();
      if (state.followupReadinessBody) {
        state.followupReadinessBody.textContent = buildFollowupReadinessReport();
      }
    }

    function toggleFollowupReadinessPanel(force = null) {
      state.followupReadinessVisible = force === null ? !state.followupReadinessVisible : !!force;
      updateFollowupReadinessPanel();
      return state.followupReadinessVisible;
    }

    function buildFollowupConfigTemplate() {
      return [
        "{",
        '  "conversation_mode": {',
        '    "enabled": true,',
        '    "proactive_enabled": true,',
        '    "proactive_scheduler_enabled": true,',
        '    "gray_auto_enabled": false,',
        '    "gray_auto_trial_enabled": false,',
        '    "gray_auto_trial_max_triggers_per_session": 1,',
        '    "proactive_cooldown_ms": 600000,',
        '    "proactive_warmup_ms": 120000,',
        '    "proactive_poll_interval_ms": 60000,',
        '    "max_followups_per_window": 1,',
        '    "silence_followup_min_ms": 180000',
        "  }",
        "}"
      ].join("\n");
    }

    async function writeTextToClipboard(text) {
      const value = String(text || "");
      if (navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
        await navigator.clipboard.writeText(value);
        return;
      }
      const textarea = document.createElement("textarea");
      textarea.value = value;
      textarea.setAttribute("readonly", "true");
      textarea.style.cssText = "position:fixed;left:-9999px;top:-9999px;opacity:0;";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      textarea.remove();
    }

    async function copyFollowupReadinessReportToClipboard(button = null) {
      const report = buildFollowupReadinessReport();
      try {
        await writeTextToClipboard(report);
        setStatus("续话状态已复制");
        if (button) {
          const previous = button.textContent;
          button.textContent = "已复制";
          window.setTimeout(() => {
            button.textContent = previous || "复制";
          }, 1200);
        }
        return true;
      } catch (err) {
        setStatus("复制失败，可手动选择面板文字复制");
        return false;
      }
    }

    async function copyFollowupReadinessSelectedTextToClipboard(button = null) {
      const data = buildFollowupReadinessPreviewCardData();
      try {
        await writeTextToClipboard(data.candidateText === "n/a" ? "" : data.candidateText);
        setStatus("\u5df2\u590d\u5236\u7eed\u8bdd\u77ed\u53e5");
        if (button) {
          const previous = button.textContent;
          button.textContent = "\u5df2\u590d\u5236";
          window.setTimeout(() => {
            button.textContent = previous || "\u590d\u5236\u77ed\u53e5";
          }, 1200);
        }
        return true;
      } catch (_) {
        setStatus("\u590d\u5236\u77ed\u53e5\u5931\u8d25");
        return false;
      }
    }

    async function copyFollowupReadinessPreviewSummaryToClipboard(button = null) {
      try {
        await writeTextToClipboard(buildFollowupReadinessPreviewCardText());
        setStatus("\u5df2\u590d\u5236\u7eed\u8bdd\u9884\u6f14\u6458\u8981");
        if (button) {
          const previous = button.textContent;
          button.textContent = "\u5df2\u590d\u5236";
          window.setTimeout(() => {
            button.textContent = previous || "\u590d\u5236\u6458\u8981";
          }, 1200);
        }
        return true;
      } catch (_) {
        setStatus("\u590d\u5236\u9884\u6f14\u6458\u8981\u5931\u8d25");
        return false;
      }
    }

    async function copyFollowupReadinessPreviewCopyBundleToClipboard(button = null) {
      try {
        await writeTextToClipboard(buildFollowupReadinessPreviewCopyBundleText());
        setStatus("已复制续话对比包");
        if (button) {
          const previous = button.textContent;
          button.textContent = "已复制";
          window.setTimeout(() => {
            button.textContent = previous || "复制对比包";
          }, 1200);
        }
        return true;
      } catch (_) {
        setStatus("复制续话对比包失败");
        return false;
      }
    }

    async function copyFollowupReadinessPreviewJsonToClipboard(button = null) {
      try {
        await writeTextToClipboard(buildFollowupReadinessPreviewJsonText());
        setStatus("已复制续话预演JSON");
        if (button) {
          const previous = button.textContent;
          button.textContent = "已复制";
          window.setTimeout(() => {
            button.textContent = previous || "复制JSON";
          }, 1200);
        }
        return true;
      } catch (_) {
        setStatus("复制续话预演JSON失败");
        return false;
      }
    }

    async function copyFollowupReadinessPreviewOneLineToClipboard(button = null) {
      try {
        await writeTextToClipboard(buildFollowupReadinessPreviewOneLineText());
        setStatus("已复制续话一行摘要");
        if (button) {
          const previous = button.textContent;
          button.textContent = "已复制";
          window.setTimeout(() => {
            button.textContent = previous || "复制一行";
          }, 1200);
        }
        return true;
      } catch (_) {
        setStatus("复制续话一行摘要失败");
        return false;
      }
    }

    async function copyFollowupConfigTemplateToClipboard(button = null) {
      try {
        await writeTextToClipboard(buildFollowupConfigTemplate());
        setStatus("续话配置模板已复制");
        if (button) {
          const previous = button.textContent;
          button.textContent = "已复制";
          window.setTimeout(() => {
            button.textContent = previous || "复制模板";
          }, 1200);
        }
        return true;
      } catch (err) {
        setStatus("复制模板失败，可手动查看面板说明");
        return false;
      }
    }

    return {
      buildFollowupReadinessBackendEntryView,
      buildFollowupReadinessBackendEntryCardText,
      refreshFollowupReadinessBackendEntrySummary,
      updateFollowupReadinessBackendEntryCard,
      buildFollowupReadinessReport,
      buildFollowupReadinessPreviewCardText,
      buildFollowupRehearsalScenarioCompareRows,
      buildFollowupRehearsalScenarioCompareText,
      buildFollowupReadinessPreviewCopyBundleText,
      buildFollowupReadinessPreviewJsonText,
      buildFollowupReadinessPreviewOneLineText,
      buildFollowupReadinessPreviewCardData,
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
      buildGrayAutoTrialAuditSummary,
      buildGrayAutoTrialAuditSummaryText,
      buildGrayAutoTrialPreRunChecklist,
      buildGrayAutoTrialPreRunChecklistText,
      buildGrayAutoTrialTimeline,
      buildGrayAutoTrialTimelineText,
      buildGrayAutoTrialOutcome,
      buildGrayAutoTrialOutcomeText,
      buildGrayAutoTrialGoNoGoDecision,
      buildGrayAutoTrialGoNoGoDecisionText,
      buildGrayAutoTrialSignoffPackage,
      buildGrayAutoTrialSignoffPackageText,
      buildGrayAutoTrialCharacterCuePreview,
      buildGrayAutoTrialCharacterCuePreviewText,
      buildGrayAutoTrialCharacterCueHandoffChecklist,
      buildGrayAutoTrialCharacterCueHandoffChecklistText,
      getGrayAutoTrialCharacterCueManualEmitStatus,
      buildGrayAutoTrialCharacterCueManualEmitStatusText,
      buildGrayAutoTrialCharacterManualCueStatusCardText,
      buildGrayAutoTrialCharacterCueManualEmitRecap,
      buildGrayAutoTrialCharacterCueManualEmitRecapText,
      buildGrayAutoTrialCharacterExpressionStrategyDraft,
      buildGrayAutoTrialCharacterExpressionStrategyDraftText,
      buildGrayAutoTrialCharacterExpressionStrategyReviewPackage,
      buildGrayAutoTrialCharacterExpressionStrategyReviewPackageText,
      buildGrayAutoTrialCharacterAutoRuntimeSafetyPlan,
      buildGrayAutoTrialCharacterAutoRuntimeSafetyPlanText,
      buildGrayAutoTrialCharacterAutoRuntimeDryRun,
      buildGrayAutoTrialCharacterAutoRuntimeDryRunText,
      buildGrayAutoTrialCharacterAutoRuntimeExplicitSwitchPlan,
      buildGrayAutoTrialCharacterAutoRuntimeExplicitSwitchPlanText,
      buildGrayAutoTrialCharacterAutoRuntimeExplicitSwitchReviewPackage,
      buildGrayAutoTrialCharacterAutoRuntimeExplicitSwitchReviewPackageText,
      buildGrayAutoTrialCharacterAutoRuntimeSwitchAcceptancePackage,
      buildGrayAutoTrialCharacterAutoRuntimeSwitchAcceptancePackageText,
      getGrayAutoTrialCharacterAutoRuntimeExplicitSwitchEnabled,
      getGrayAutoTrialCharacterAutoRuntimeExplicitSwitchState,
      buildGrayAutoTrialCharacterAutoRuntimeExplicitSwitchControl,
      buildGrayAutoTrialCharacterAutoRuntimeExplicitSwitchControlText,
      buildGrayAutoTrialCharacterAutoRuntimeSwitchControlDiagnostics,
      buildGrayAutoTrialCharacterAutoRuntimeSwitchControlDiagnosticsText,
      buildGrayAutoTrialCharacterAutoRuntimeExplicitSwitchRollbackPackage,
      buildGrayAutoTrialCharacterAutoRuntimeExplicitSwitchRollbackPackageText,
      buildGrayAutoTrialCharacterAutoRuntimeFinalPreflight,
      buildGrayAutoTrialCharacterAutoRuntimeFinalPreflightText,
      buildGrayAutoTrialCharacterAutoRuntimeSeparateImplementationDraft,
      buildGrayAutoTrialCharacterAutoRuntimeSeparateImplementationDraftText,
      enableGrayAutoTrialCharacterAutoRuntimeExplicitSwitch,
      disableGrayAutoTrialCharacterAutoRuntimeExplicitSwitch,
      rollbackGrayAutoTrialCharacterAutoRuntimeExplicitSwitch,
      emitGrayAutoTrialCharacterCueManually,
      previewGrayAutoTrialCharacterCueBackendBridge,
      getSelectedGrayAutoTrialCharacterCuePresetKey,
      emitGrayAutoTrialCharacterCueViaManualBridge,
      emitLastReplyCharacterCueCandidateViaManualBridge,
      updateGrayAutoTrialPreRunChecklistCard,
      updateGrayAutoTrialTimelineCard,
      updateGrayAutoTrialOutcomeCard,
      updateGrayAutoTrialDecisionCard,
      updateGrayAutoTrialSignoffCard,
      updateGrayAutoTrialCharacterCard,
      updateGrayAutoTrialCharacterHandoffCard,
      updateGrayAutoTrialCharacterRecapCard,
      updateGrayAutoTrialCharacterManualCueStatusCard,
      updateReplyCharacterCueCandidateManualSendButton,
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
      updateGrayAutoTrialControlPanel,
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
      updateFollowupReadinessPanel,
      toggleFollowupReadinessPanel,
      buildFollowupConfigTemplate,
      writeTextToClipboard,
      copyFollowupReadinessReportToClipboard,
      copyFollowupReadinessSelectedTextToClipboard,
      copyFollowupReadinessPreviewSummaryToClipboard,
      copyFollowupReadinessPreviewCopyBundleToClipboard,
      copyFollowupReadinessPreviewJsonToClipboard,
      copyFollowupReadinessPreviewOneLineToClipboard,
      copyFollowupConfigTemplateToClipboard
    };
  }

  const api = { createController };
  root.TaffyFollowupReadinessPanelController = api;
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof window !== "undefined" ? window : globalThis);
