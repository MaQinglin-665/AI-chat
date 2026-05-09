#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const assert = require("assert");

const CHAT_JS = path.resolve(__dirname, "..", "web", "chat.js");
const INDEX_HTML = path.resolve(__dirname, "..", "web", "index.html");
const BASE_CSS = path.resolve(__dirname, "..", "web", "base.css");
const CHAT_STATE_JS = path.resolve(__dirname, "..", "web", "chatState.js");
const CHAT_DOM_JS = path.resolve(__dirname, "..", "web", "chatDom.js");
const STORAGE_CONTROLLER_JS = path.resolve(__dirname, "..", "web", "storageController.js");
const DEBUG_PANEL_CONTROLLER_JS = path.resolve(__dirname, "..", "web", "debugPanelController.js");
const CHAT_MESSAGE_CONTROLLER_JS = path.resolve(__dirname, "..", "web", "chatMessageController.js");
const ONBOARDING_CONTROLLER_JS = path.resolve(__dirname, "..", "web", "onboardingController.js");
const PERSONA_AVATAR_CONTROLLER_JS = path.resolve(__dirname, "..", "web", "personaAvatarController.js");
const REMINDER_SCHEDULE_CONTROLLER_JS = path.resolve(__dirname, "..", "web", "reminderScheduleController.js");
const EMOTION_STATS_CONTROLLER_JS = path.resolve(__dirname, "..", "web", "emotionStatsController.js");
const LOCAL_ASR_CONTROLLER_JS = path.resolve(__dirname, "..", "web", "localAsrController.js");
const AUTO_CHAT_CONTROLLER_JS = path.resolve(__dirname, "..", "web", "autoChatController.js");
const RUNTIME_METADATA_CONTROLLER_JS = path.resolve(__dirname, "..", "web", "runtimeMetadataController.js");
const DIAGNOSTICS_RUNTIME_CONTROLLER_JS = path.resolve(__dirname, "..", "web", "diagnosticsRuntimeController.js");
const FOLLOWUP_DEBUG_CONTROLLER_JS = path.resolve(__dirname, "..", "web", "followupDebugController.js");
const GRAY_TRIAL_REPORT_CONTROLLER_JS = path.resolve(__dirname, "..", "web", "grayTrialReportController.js");
const GRAY_TRIAL_CHARACTER_PANEL_CONTROLLER_JS = path.resolve(__dirname, "..", "web", "grayTrialCharacterPanelController.js");
const FOLLOWUP_READINESS_PANEL_CONTROLLER_JS = path.resolve(__dirname, "..", "web", "followupReadinessPanelController.js");
const SPEECH_TEXT_JS = path.resolve(__dirname, "..", "web", "speechText.js");
const ATTACHMENT_MODEL_JS = path.resolve(__dirname, "..", "web", "attachmentModel.js");
const ATTACHMENT_CONTROLLER_JS = path.resolve(__dirname, "..", "web", "attachmentController.js");
const CHAT_TRANSLATION_SERVICE_JS = path.resolve(__dirname, "..", "web", "chatTranslationService.js");
const SUBTITLE_CONTROLLER_JS = path.resolve(__dirname, "..", "web", "subtitleController.js");
const SPEECH_STYLE_CONTROLLER_JS = path.resolve(__dirname, "..", "web", "speechStyleController.js");
const EMOTION_MOOD_CONTROLLER_JS = path.resolve(__dirname, "..", "web", "emotionMoodController.js");
const ACTION_PLAN_CONTROLLER_JS = path.resolve(__dirname, "..", "web", "actionPlanController.js");
const MOTION_RUNTIME_CONTROLLER_JS = path.resolve(__dirname, "..", "web", "motionRuntimeController.js");
const VOICE_RUNTIME_CONTROLLER_JS = path.resolve(__dirname, "..", "web", "voiceRuntimeController.js");
const STREAM_TTS_QUEUE_CONTROLLER_JS = path.resolve(__dirname, "..", "web", "streamTtsQueueController.js");
const TTS_PLAYBACK_CONTROLLER_JS = path.resolve(__dirname, "..", "web", "ttsPlaybackController.js");
const CHAT_API_JS = path.resolve(__dirname, "..", "web", "chatApi.js");
const CHAT_REPLY_CONTROLLER_JS = path.resolve(__dirname, "..", "web", "chatReplyController.js");
const PERFORMANCE_AUDIT_CONTROLLER_JS = path.resolve(__dirname, "..", "web", "performanceAuditController.js");
const PERFORMANCE_TIMELINE_CONTROLLER_JS = path.resolve(__dirname, "..", "web", "performanceTimelineController.js");
const WAKE_WORD_CONTROLLER_JS = path.resolve(__dirname, "..", "web", "wakeWordController.js");
const APP_CONFIG_CONTROLLER_JS = path.resolve(__dirname, "..", "web", "appConfigController.js");
const APP_STARTUP_CONTROLLER_JS = path.resolve(__dirname, "..", "web", "appStartupController.js");
const LEARNING_REVIEW_API_JS = path.resolve(__dirname, "..", "web", "learningReviewApi.js");
const LEARNING_REVIEW_MODEL_JS = path.resolve(__dirname, "..", "web", "learningReviewModel.js");
const LEARNING_REVIEW_VIEW_JS = path.resolve(__dirname, "..", "web", "learningReviewView.js");
const LEARNING_REVIEW_BINDER_JS = path.resolve(__dirname, "..", "web", "learningReviewBinder.js");
const LEARNING_REVIEW_CONTROLLER_JS = path.resolve(__dirname, "..", "web", "learningReviewController.js");
const PANEL_CONTROL_BINDER_JS = path.resolve(__dirname, "..", "web", "panelControlBinder.js");
const ADVANCED_ACTION_BINDER_JS = path.resolve(__dirname, "..", "web", "advancedActionBinder.js");
const CHAT_INPUT_BINDER_JS = path.resolve(__dirname, "..", "web", "chatInputBinder.js");
const DESKTOP_CONTROL_BINDER_JS = path.resolve(__dirname, "..", "web", "desktopControlBinder.js");
const DESKTOP_WINDOW_CONTROLLER_JS = path.resolve(__dirname, "..", "web", "desktopWindowController.js");
const LIVE2D_LAYOUT_CONTROLLER_JS = path.resolve(__dirname, "..", "web", "live2dLayoutController.js");
const LIVE2D_EXPRESSION_CONTROLLER_JS = path.resolve(__dirname, "..", "web", "live2dExpressionController.js");
const LIVE2D_RUNTIME_CONTROLLER_JS = path.resolve(__dirname, "..", "web", "live2dRuntimeController.js");
const RUNTIME_EVENT_BINDER_JS = path.resolve(__dirname, "..", "web", "runtimeEventBinder.js");
const CHARACTER_RUNTIME_JS = path.resolve(__dirname, "..", "web", "characterRuntime.js");
const CHARACTER_TUNING_JS = path.resolve(__dirname, "..", "web", "characterTuning.js");
const CHARACTER_BRAIN_DEBUG_JS = path.resolve(__dirname, "..", "web", "characterBrainDebug.js");
const CHARACTER_EXPERIENCE_CONTROLLER_JS = path.resolve(__dirname, "..", "web", "characterExperienceController.js");
const CHARACTER_DIAGNOSTICS_CONTROLLER_JS = path.resolve(__dirname, "..", "web", "characterDiagnosticsController.js");
const DOCTOR_DIAGNOSTICS_JS = path.resolve(__dirname, "..", "web", "doctorDiagnostics.js");
const CHARACTER_REPLY_CUE_JS = path.resolve(__dirname, "..", "web", "characterReplyCue.js");
const TTS_DEBUG_REPORT_JS = path.resolve(__dirname, "..", "web", "ttsDebugReport.js");
const TRANSLATE_DEBUG_REPORT_JS = path.resolve(__dirname, "..", "web", "translateDebugReport.js");
const MEMORY_DEBUG_REPORT_JS = path.resolve(__dirname, "..", "web", "memoryDebugReport.js");
const TOOL_META_VIEW_JS = path.resolve(__dirname, "..", "web", "toolMetaView.js");
const LOCAL_COMMAND_REGISTRY_JS = path.resolve(__dirname, "..", "web", "localCommandRegistry.js");
const LOCAL_COMMAND_EXECUTOR_JS = path.resolve(__dirname, "..", "web", "localCommandExecutor.js");
const REMINDER_UTILS_JS = path.resolve(__dirname, "..", "web", "reminderUtils.js");
const SCHEDULE_LIST_VIEW_JS = path.resolve(__dirname, "..", "web", "scheduleListView.js");
const SCHEDULE_FORM_MODEL_JS = path.resolve(__dirname, "..", "web", "scheduleFormModel.js");
const DEV_FEATURE_LOADER_JS = path.resolve(__dirname, "..", "web", "devFeatureLoader.js");
const GRAY_TRIAL_READINESS_MODEL_JS = path.resolve(__dirname, "..", "web", "grayTrialReadinessModel.js");
const GRAY_TRIAL_CHARACTER_MODEL_JS = path.resolve(__dirname, "..", "web", "grayTrialCharacterModel.js");
const GRAY_TRIAL_AUTO_RUNTIME_SWITCH_MODEL_JS = path.resolve(__dirname, "..", "web", "grayTrialAutoRuntimeSwitchModel.js");
const FOLLOWUP_READINESS_VIEW_JS = path.resolve(__dirname, "..", "web", "followupReadinessView.js");
const GRAY_TRIAL_CHARACTER_VIEW_JS = path.resolve(__dirname, "..", "web", "grayTrialCharacterView.js");
const source = fs.readFileSync(CHAT_JS, "utf8");
const indexSource = fs.readFileSync(INDEX_HTML, "utf8");
const baseCssSource = fs.readFileSync(BASE_CSS, "utf8");
const chatStateSource = fs.readFileSync(CHAT_STATE_JS, "utf8");
const chatDomSource = fs.readFileSync(CHAT_DOM_JS, "utf8");
const storageControllerSource = fs.readFileSync(STORAGE_CONTROLLER_JS, "utf8");
const debugPanelControllerSource = fs.readFileSync(DEBUG_PANEL_CONTROLLER_JS, "utf8");
const chatMessageControllerSource = fs.readFileSync(CHAT_MESSAGE_CONTROLLER_JS, "utf8");
const onboardingControllerSource = fs.readFileSync(ONBOARDING_CONTROLLER_JS, "utf8");
const personaAvatarControllerSource = fs.readFileSync(PERSONA_AVATAR_CONTROLLER_JS, "utf8");
const reminderScheduleControllerSource = fs.readFileSync(REMINDER_SCHEDULE_CONTROLLER_JS, "utf8");
const emotionStatsControllerSource = fs.readFileSync(EMOTION_STATS_CONTROLLER_JS, "utf8");
const localAsrControllerSource = fs.readFileSync(LOCAL_ASR_CONTROLLER_JS, "utf8");
const autoChatControllerSource = fs.readFileSync(AUTO_CHAT_CONTROLLER_JS, "utf8");
const runtimeMetadataControllerSource = fs.readFileSync(RUNTIME_METADATA_CONTROLLER_JS, "utf8");
const diagnosticsRuntimeControllerSource = fs.readFileSync(DIAGNOSTICS_RUNTIME_CONTROLLER_JS, "utf8");
const followupDebugControllerSource = fs.readFileSync(FOLLOWUP_DEBUG_CONTROLLER_JS, "utf8");
const grayTrialReportControllerSource = fs.readFileSync(GRAY_TRIAL_REPORT_CONTROLLER_JS, "utf8");
const grayTrialCharacterPanelControllerSource = fs.readFileSync(GRAY_TRIAL_CHARACTER_PANEL_CONTROLLER_JS, "utf8");
const followupReadinessPanelControllerSource = fs.readFileSync(FOLLOWUP_READINESS_PANEL_CONTROLLER_JS, "utf8");
const speechTextSource = fs.readFileSync(SPEECH_TEXT_JS, "utf8");
const attachmentModelSource = fs.readFileSync(ATTACHMENT_MODEL_JS, "utf8");
const attachmentControllerSource = fs.readFileSync(ATTACHMENT_CONTROLLER_JS, "utf8");
const chatTranslationServiceSource = fs.readFileSync(CHAT_TRANSLATION_SERVICE_JS, "utf8");
const subtitleControllerSource = fs.readFileSync(SUBTITLE_CONTROLLER_JS, "utf8");
const speechStyleControllerSource = fs.readFileSync(SPEECH_STYLE_CONTROLLER_JS, "utf8");
const emotionMoodControllerSource = fs.readFileSync(EMOTION_MOOD_CONTROLLER_JS, "utf8");
const actionPlanControllerSource = fs.readFileSync(ACTION_PLAN_CONTROLLER_JS, "utf8");
const motionRuntimeControllerSource = fs.readFileSync(MOTION_RUNTIME_CONTROLLER_JS, "utf8");
const voiceRuntimeControllerSource = fs.readFileSync(VOICE_RUNTIME_CONTROLLER_JS, "utf8");
const streamTtsQueueControllerSource = fs.readFileSync(STREAM_TTS_QUEUE_CONTROLLER_JS, "utf8");
const ttsPlaybackControllerSource = fs.readFileSync(TTS_PLAYBACK_CONTROLLER_JS, "utf8");
const chatApiSource = fs.readFileSync(CHAT_API_JS, "utf8");
const chatReplyControllerSource = fs.readFileSync(CHAT_REPLY_CONTROLLER_JS, "utf8");
const performanceAuditControllerSource = fs.readFileSync(PERFORMANCE_AUDIT_CONTROLLER_JS, "utf8");
const performanceTimelineControllerSource = fs.readFileSync(PERFORMANCE_TIMELINE_CONTROLLER_JS, "utf8");
const wakeWordControllerSource = fs.readFileSync(WAKE_WORD_CONTROLLER_JS, "utf8");
const appConfigControllerSource = fs.readFileSync(APP_CONFIG_CONTROLLER_JS, "utf8");
const appStartupControllerSource = fs.readFileSync(APP_STARTUP_CONTROLLER_JS, "utf8");
const learningReviewApiSource = fs.readFileSync(LEARNING_REVIEW_API_JS, "utf8");
const learningReviewModelSource = fs.readFileSync(LEARNING_REVIEW_MODEL_JS, "utf8");
const learningReviewViewSource = fs.readFileSync(LEARNING_REVIEW_VIEW_JS, "utf8");
const learningReviewBinderSource = fs.readFileSync(LEARNING_REVIEW_BINDER_JS, "utf8");
const learningReviewControllerSource = fs.readFileSync(LEARNING_REVIEW_CONTROLLER_JS, "utf8");
const panelControlBinderSource = fs.readFileSync(PANEL_CONTROL_BINDER_JS, "utf8");
const advancedActionBinderSource = fs.readFileSync(ADVANCED_ACTION_BINDER_JS, "utf8");
const chatInputBinderSource = fs.readFileSync(CHAT_INPUT_BINDER_JS, "utf8");
const desktopControlBinderSource = fs.readFileSync(DESKTOP_CONTROL_BINDER_JS, "utf8");
const desktopWindowControllerSource = fs.readFileSync(DESKTOP_WINDOW_CONTROLLER_JS, "utf8");
const live2dLayoutControllerSource = fs.readFileSync(LIVE2D_LAYOUT_CONTROLLER_JS, "utf8");
const live2dExpressionControllerSource = fs.readFileSync(LIVE2D_EXPRESSION_CONTROLLER_JS, "utf8");
const live2dRuntimeControllerSource = fs.readFileSync(LIVE2D_RUNTIME_CONTROLLER_JS, "utf8");
const runtimeEventBinderSource = fs.readFileSync(RUNTIME_EVENT_BINDER_JS, "utf8");
const tuningSource = fs.readFileSync(CHARACTER_TUNING_JS, "utf8");
const characterBrainDebugSource = fs.readFileSync(CHARACTER_BRAIN_DEBUG_JS, "utf8");
const characterExperienceControllerSource = fs.readFileSync(CHARACTER_EXPERIENCE_CONTROLLER_JS, "utf8");
const characterDiagnosticsControllerSource = fs.readFileSync(CHARACTER_DIAGNOSTICS_CONTROLLER_JS, "utf8");
const doctorSource = fs.readFileSync(DOCTOR_DIAGNOSTICS_JS, "utf8");
const replyCueSource = fs.readFileSync(CHARACTER_REPLY_CUE_JS, "utf8");
const ttsDebugSource = fs.readFileSync(TTS_DEBUG_REPORT_JS, "utf8");
const translateDebugSource = fs.readFileSync(TRANSLATE_DEBUG_REPORT_JS, "utf8");
const memoryDebugSource = fs.readFileSync(MEMORY_DEBUG_REPORT_JS, "utf8");
const toolMetaViewSource = fs.readFileSync(TOOL_META_VIEW_JS, "utf8");
const localCommandRegistrySource = fs.readFileSync(LOCAL_COMMAND_REGISTRY_JS, "utf8");
const localCommandExecutorSource = fs.readFileSync(LOCAL_COMMAND_EXECUTOR_JS, "utf8");
const reminderUtilsSource = fs.readFileSync(REMINDER_UTILS_JS, "utf8");
const scheduleListViewSource = fs.readFileSync(SCHEDULE_LIST_VIEW_JS, "utf8");
const scheduleFormModelSource = fs.readFileSync(SCHEDULE_FORM_MODEL_JS, "utf8");
const devFeatureLoaderSource = fs.readFileSync(DEV_FEATURE_LOADER_JS, "utf8");
const grayTrialReadinessModelSource = fs.readFileSync(GRAY_TRIAL_READINESS_MODEL_JS, "utf8");
const grayTrialCharacterModelSource = fs.readFileSync(GRAY_TRIAL_CHARACTER_MODEL_JS, "utf8");
const grayTrialAutoRuntimeSwitchModelSource = fs.readFileSync(GRAY_TRIAL_AUTO_RUNTIME_SWITCH_MODEL_JS, "utf8");
const followupReadinessViewSource = fs.readFileSync(FOLLOWUP_READINESS_VIEW_JS, "utf8");
const grayTrialCharacterViewSource = fs.readFileSync(GRAY_TRIAL_CHARACTER_VIEW_JS, "utf8");
const followupFeatureSource = [
  source,
  chatReplyControllerSource,
  followupDebugControllerSource,
  grayTrialReportControllerSource,
  grayTrialCharacterPanelControllerSource,
  followupReadinessPanelControllerSource
].join("\n");
const chatState = require(CHAT_STATE_JS);
const chatDom = require(CHAT_DOM_JS);
const storageController = require(STORAGE_CONTROLLER_JS);
const debugPanelController = require(DEBUG_PANEL_CONTROLLER_JS);
const chatMessageController = require(CHAT_MESSAGE_CONTROLLER_JS);
const onboardingController = require(ONBOARDING_CONTROLLER_JS);
const personaAvatarController = require(PERSONA_AVATAR_CONTROLLER_JS);
const reminderScheduleController = require(REMINDER_SCHEDULE_CONTROLLER_JS);
const emotionStatsController = require(EMOTION_STATS_CONTROLLER_JS);
const localAsrController = require(LOCAL_ASR_CONTROLLER_JS);
const autoChatController = require(AUTO_CHAT_CONTROLLER_JS);
const runtimeMetadataController = require(RUNTIME_METADATA_CONTROLLER_JS);
const diagnosticsRuntimeController = require(DIAGNOSTICS_RUNTIME_CONTROLLER_JS);
const followupDebugController = require(FOLLOWUP_DEBUG_CONTROLLER_JS);
const grayTrialReportController = require(GRAY_TRIAL_REPORT_CONTROLLER_JS);
const grayTrialCharacterPanelController = require(GRAY_TRIAL_CHARACTER_PANEL_CONTROLLER_JS);
const followupReadinessPanelController = require(FOLLOWUP_READINESS_PANEL_CONTROLLER_JS);
const runtime = require(CHARACTER_RUNTIME_JS);
const attachmentModel = require(ATTACHMENT_MODEL_JS);
const attachmentController = require(ATTACHMENT_CONTROLLER_JS);
const chatTranslationService = require(CHAT_TRANSLATION_SERVICE_JS);
const subtitleController = require(SUBTITLE_CONTROLLER_JS);
const speechStyleController = require(SPEECH_STYLE_CONTROLLER_JS);
const emotionMoodController = require(EMOTION_MOOD_CONTROLLER_JS);
const actionPlanController = require(ACTION_PLAN_CONTROLLER_JS);
const motionRuntimeController = require(MOTION_RUNTIME_CONTROLLER_JS);
const voiceRuntimeController = require(VOICE_RUNTIME_CONTROLLER_JS);
const streamTtsQueueController = require(STREAM_TTS_QUEUE_CONTROLLER_JS);
const ttsPlaybackController = require(TTS_PLAYBACK_CONTROLLER_JS);
const chatApi = require(CHAT_API_JS);
const chatReplyController = require(CHAT_REPLY_CONTROLLER_JS);
const performanceAuditController = require(PERFORMANCE_AUDIT_CONTROLLER_JS);
const performanceTimelineController = require(PERFORMANCE_TIMELINE_CONTROLLER_JS);
const wakeWordController = require(WAKE_WORD_CONTROLLER_JS);
const appConfigController = require(APP_CONFIG_CONTROLLER_JS);
const appStartupController = require(APP_STARTUP_CONTROLLER_JS);
const learningReviewApi = require(LEARNING_REVIEW_API_JS);
const learningReviewModel = require(LEARNING_REVIEW_MODEL_JS);
const learningReviewView = require(LEARNING_REVIEW_VIEW_JS);
const learningReviewBinder = require(LEARNING_REVIEW_BINDER_JS);
const learningReviewController = require(LEARNING_REVIEW_CONTROLLER_JS);
const panelControlBinder = require(PANEL_CONTROL_BINDER_JS);
const advancedActionBinder = require(ADVANCED_ACTION_BINDER_JS);
const chatInputBinder = require(CHAT_INPUT_BINDER_JS);
const desktopControlBinder = require(DESKTOP_CONTROL_BINDER_JS);
const desktopWindowController = require(DESKTOP_WINDOW_CONTROLLER_JS);
const live2dLayoutController = require(LIVE2D_LAYOUT_CONTROLLER_JS);
const live2dExpressionController = require(LIVE2D_EXPRESSION_CONTROLLER_JS);
const live2dRuntimeController = require(LIVE2D_RUNTIME_CONTROLLER_JS);
const runtimeEventBinder = require(RUNTIME_EVENT_BINDER_JS);
const tuning = require(CHARACTER_TUNING_JS);
const characterBrainDebug = require(CHARACTER_BRAIN_DEBUG_JS);
const characterExperienceController = require(CHARACTER_EXPERIENCE_CONTROLLER_JS);
const characterDiagnosticsController = require(CHARACTER_DIAGNOSTICS_CONTROLLER_JS);
const doctorDiagnostics = require(DOCTOR_DIAGNOSTICS_JS);
const replyCue = require(CHARACTER_REPLY_CUE_JS);
const ttsDebugReport = require(TTS_DEBUG_REPORT_JS);
const translateDebugReport = require(TRANSLATE_DEBUG_REPORT_JS);
const memoryDebugReport = require(MEMORY_DEBUG_REPORT_JS);
const toolMetaView = require(TOOL_META_VIEW_JS);
const localCommandRegistry = require(LOCAL_COMMAND_REGISTRY_JS);
const localCommandExecutor = require(LOCAL_COMMAND_EXECUTOR_JS);
const reminderUtils = require(REMINDER_UTILS_JS);
const scheduleListView = require(SCHEDULE_LIST_VIEW_JS);
const scheduleFormModel = require(SCHEDULE_FORM_MODEL_JS);
const devFeatureLoader = require(DEV_FEATURE_LOADER_JS);
const grayTrialReadinessModel = require(GRAY_TRIAL_READINESS_MODEL_JS);
const grayTrialCharacterModel = require(GRAY_TRIAL_CHARACTER_MODEL_JS);
const grayTrialAutoRuntimeSwitchModel = require(GRAY_TRIAL_AUTO_RUNTIME_SWITCH_MODEL_JS);
const followupReadinessView = require(FOLLOWUP_READINESS_VIEW_JS);
const grayTrialCharacterView = require(GRAY_TRIAL_CHARACTER_VIEW_JS);

function toPlainObject(value) {
  return JSON.parse(JSON.stringify(value));
}

function createMemoryStorage(initial = {}) {
  const data = { ...initial };
  return {
    getItem(key) {
      return Object.prototype.hasOwnProperty.call(data, key) ? data[key] : null;
    },
    setItem(key, value) {
      data[key] = String(value);
    },
    removeItem(key) {
      delete data[key];
    },
    dump() {
      return { ...data };
    }
  };
}

{
  const initialState = chatState.createInitialState();
  assert.strictEqual(initialState.observeDesktop, false, "state helper should keep desktop observation disabled by default");
  assert.strictEqual(initialState.conversationMode.grayAutoTrialEnabled, false, "state helper should keep gray trial disabled by default");
  assert.strictEqual(initialState.speakingEnabled, true, "state helper should preserve voice default");
  assert.strictEqual(typeof chatDom.createUI, "function", "chat DOM helper should expose UI mapping");
  assert.strictEqual(typeof storageController.loadChatHistory, "function", "storage controller should expose chat history loading");
  assert.strictEqual(typeof storageController.saveCharacterBrainSnapshot, "function", "storage controller should save last character brain snapshot");
  assert.strictEqual(typeof storageController.loadCharacterBrainSnapshot, "function", "storage controller should load last character brain snapshot");
  assert.strictEqual(typeof debugPanelController.updateDebugPanel, "function", "debug panel controller should expose panel updates");
  assert.strictEqual(typeof chatMessageController.createController, "function", "chat message controller should expose a factory");
  assert.strictEqual(typeof onboardingController.createController, "function", "onboarding controller should expose a factory");
  assert.strictEqual(typeof personaAvatarController.createController, "function", "persona/avatar controller should expose a factory");
  assert.strictEqual(typeof reminderScheduleController.createController, "function", "reminder/schedule controller should expose a factory");
  assert.strictEqual(typeof emotionStatsController.createController, "function", "emotion stats controller should expose a factory");
  assert.strictEqual(typeof localAsrController.createController, "function", "local ASR controller should expose a factory");
  assert.strictEqual(typeof autoChatController.createController, "function", "auto chat controller should expose a factory");
  assert.strictEqual(typeof runtimeMetadataController.createController, "function", "runtime metadata controller should expose a factory");
  assert.strictEqual(typeof diagnosticsRuntimeController.createController, "function", "diagnostics runtime controller should expose a factory");
  assert.strictEqual(typeof followupDebugController.createController, "function", "followup debug controller should expose a factory");
  assert.strictEqual(typeof grayTrialReportController.createController, "function", "gray trial report controller should expose a factory");
  assert.strictEqual(typeof grayTrialCharacterPanelController.createController, "function", "gray trial character panel controller should expose a factory");
  assert.strictEqual(typeof followupReadinessPanelController.createController, "function", "followup readiness panel controller should expose a factory");
  assert.strictEqual(typeof speechStyleController.createController, "function", "speech style controller should expose a factory");
  assert.strictEqual(typeof emotionMoodController.createController, "function", "emotion/mood controller should expose a factory");
  assert.strictEqual(typeof actionPlanController.createController, "function", "action plan controller should expose a factory");
  assert.deepStrictEqual(actionPlanController.getMotionCueTags("side-eye").slice(0, 3), ["head", "eye", "side"], "action plan controller should expose safe motion cue tags");
  assert.deepStrictEqual(actionPlanController.getMotionCueFallbackGroups("embarrassed-recovery").slice(0, 2), ["FlickDown", "Idle"], "action plan controller should expose concrete fallback groups for director cues");
  assert.strictEqual(actionPlanController.getMotionCueFamily("tiny-nod"), "nod", "action plan controller should expose public motion cue families");
  assert.strictEqual(typeof motionRuntimeController.createController, "function", "motion runtime controller should expose a factory");
  assert.strictEqual(typeof voiceRuntimeController.createController, "function", "voice runtime controller should expose a factory");
  assert.strictEqual(typeof streamTtsQueueController.createController, "function", "stream TTS queue controller should expose a factory");
  assert.strictEqual(typeof ttsPlaybackController.createController, "function", "TTS playback controller should expose a factory");
  assert.strictEqual(typeof chatReplyController.createController, "function", "chat reply controller should expose a factory");
  assert.strictEqual(typeof wakeWordController.createController, "function", "wake word controller should expose a factory");
  assert.strictEqual(typeof appConfigController.createController, "function", "app config controller should expose a factory");
  assert.strictEqual(typeof appStartupController.createController, "function", "app startup controller should expose startup orchestration");
}

{
  const actionState = {
    availableMotionGroups: ["Idle", "HeadTilt", "SideEyePose", "FlickDown", "Tap"],
    motionComboEnabled: false,
    actionLastAt: {}
  };
  const controller = actionPlanController.createController({
    state: actionState,
    performanceObject: { now: () => 1000 },
    normalizeTalkStyle: (style) => String(style || "neutral"),
    detectMood: (text) => String(text || "idle"),
    getMotionIntensityPreset: () => ({ listenChance: 1, comboChance: 0 }),
    pickMoodMotionGroups: () => []
  });
  const headTiltPlan = controller.buildActionPlan("listen", {
    style: "steady",
    mood: "idle",
    motionCue: "head_tilt",
    motionRole: "pre_reaction",
    motionTags: ["tilt"]
  });
  assert.ok(headTiltPlan.length >= 1, "motion cue action plan should produce a lightweight step");
  assert.strictEqual(headTiltPlan[0].motionCue, "head_tilt", "action plan steps should carry the director motion cue");
  assert.strictEqual(headTiltPlan[0].motionRole, "pre_reaction", "action plan steps should carry the timeline motion role");
  assert.strictEqual(headTiltPlan[0].motionFamily, "head_tilt", "action plan steps should carry the director motion family");
  assert.ok(headTiltPlan[0].groups.includes("HeadTilt"), "motion cue tags should help select matching Live2D groups");
  const recoveryPlan = controller.buildActionPlan("listen", {
    style: "neutral",
    mood: "idle",
    motionCue: "embarrassed_recovery",
    motionRole: "pre_reaction"
  });
  assert.strictEqual(recoveryPlan[0].groups[0], "FlickDown", "concrete cue fallback should prefer a matching Live2D group before generic semantic groups");
}

{
  const controller = autoChatController.createController({
    state: {
      observeDesktop: true,
      desktopCanCapture: true,
      observeAllowAutoChat: false,
      observeAttachMode: "intent",
      autoChatTuning: {}
    },
    constants: {
      VISION_INTENT_RE: /screen|desktop/i,
      AUTO_CHAT_STYLE_NOTES: ["soft"]
    }
  });
  const gate = controller.buildAutoChatBrainGate({
    primaryReason: "long_silence",
    silentMinutes: 120,
    topicHint: "demo"
  });
  const prompt = controller.buildAutoChatPrompt({
    primaryReason: "long_silence",
    silentMinutes: 120,
    topicHint: "demo topic"
  });

  assert.strictEqual(gate.intent, "low_interrupt_checkin", "auto chat should be gated through low-interruption brain intent");
  assert.strictEqual(gate.maxSentences, 1, "auto chat brain gate should keep proactive bubbles to one sentence");
  assert.strictEqual(gate.canIgnore, true, "auto chat brain gate should make proactive bubbles ignorable");
  assert.strictEqual(gate.singleSentence, true, "auto chat brain gate should force one-line delivery");
  assert.strictEqual(gate.allowDesktopObservation, false, "auto chat brain gate should not allow desktop observation");
  assert.strictEqual(gate.allowFileRead, false, "auto chat brain gate should not allow file reads");
  assert.strictEqual(gate.allowShell, false, "auto chat brain gate should not allow shell execution");
  assert.strictEqual(gate.allowToolCall, false, "auto chat brain gate should not allow tool calls");
  assert.ok(prompt.includes("low_interrupt_checkin") && prompt.includes("no desktop observation") && prompt.includes("no shell"), "auto chat prompt should carry the brain safety guard");
  assert.ok(prompt.includes("Reply in English only.") && prompt.includes("Use exactly one short sentence."), "auto chat prompt should preserve the English one-line character setting");
  assert.ok(!/[\u4e00-\u9fff]/.test(prompt), "auto chat prompt should not mix Chinese instructions into the English-only character output path");
  assert.ok(controller.buildAutoChatTriggerExplanation({ primaryReason: "long_silence", topicHint: "demo" }).includes("demo"), "auto chat should expose a compact trigger explanation");
  assert.strictEqual(controller.shouldAttachDesktopImage("look at the screen", true), false, "auto chat should not attach desktop images without explicit auto permission");
  assert.strictEqual(controller.shouldAttachDesktopImage("look at the screen", false), true, "manual chat may attach desktop images when observation is already enabled");
}

{
  const sessionStorage = createMemoryStorage();
  const stateForBrainStorage = {
    characterBrainLastUpdatedAt: 12345,
    characterBrainLastDecision: {
      intent: "comfort",
      reply_style: "comfort",
      style_beat: "room_anchor",
      style_beat_guide: "private prompt hint",
      reaction_mode: "soft_anchor",
      reaction_mode_guide: "private reaction hint",
      banter_level: 0,
      opening_move: "soft_anchor",
      reply_shape: "two_beat",
      spontaneity: 0,
      question_policy: "none",
      performance_bit: "room_anchor",
      performance_bit_guide: "private bit hint",
      energy: "calm",
      attention: "focused",
      relationship: "desktop_companion",
      max_sentences: 3,
      emotion: "sad",
      action: "none",
      intensity: "low",
      voice_style: "soft",
      performance_execution: {
        reply_shape: "two_beat",
        question_policy: "none",
        removed_followup: true,
        removed_unsafe_bit: false,
        removed_context_bleed: true,
        shortened: true,
        used_bit: false,
        final_sentences: 2,
        stage_callback_added: true,
        stage_callback_suppressed: "",
        stage_callback_bit: "cursor_side_eye",
        private_prompt: "SECRET"
      },
      performance_timeline: {
        enabled: true,
        pre: "soft_anchor",
        speech: "soft_speech_start",
        beats: 0,
        post: "soft_idle",
        motion: { pre: "soft_stillness", speech: "soft_speech_start", beats: [], post: "soft_idle" },
        suppressed: ["motion_disallowed"],
        private_prompt: "SECRET"
      },
      voice_timeline: {
        enabled: true,
        delivery: "soft_low",
        pace: "slow",
        pause_profile: "gentle",
        segment_style: "short_soft",
        segments: 2,
        pre_pause_ms: 120,
        inter_segment_pause_ms: 360,
        fallback_reason: "none",
        suppressed: ["comfort_no_voice_bits"],
        private_prompt: "SECRET"
      },
      performance_audit: {
        enabled: true,
        status: "settled",
        intent: "comfort",
        timeline: { pre: "soft_anchor", speech: "soft_speech_start", beats: 0, post: "soft_idle", suppressed: ["motion_disallowed"] },
        actual: { pre: "soft_anchor", speech: "soft_speech_start", beats: 0, post: "soft_idle", action_dispatches: 0, pulse_dispatches: 2 },
        motion: {
          planned: { pre: "soft_stillness", speech: "soft_speech_start", beats: [], post: "soft_idle" },
          actual: { pre: "soft_stillness", speech: "soft_speech_start", beats: [], post: "soft_idle", dispatches: 0, failed_dispatches: 0, pulse_only: 2, last_group: "FlickDown", last_cue: "soft_stillness", last_family: "soft_stillness", settle_result: "idle_returned" },
          suppressed: ["motion_disallowed"]
        },
        tts: { started: true, finished: true, mode: "direct" },
        voice: { delivery: "soft_low", pace: "slow", pause_profile: "gentle", segment_style: "short_soft", planned_segments: 2, spoken_segments: 2, failed_segments: 0, last_segment_index: 2, pre_pause_ms: 120, inter_segment_pause_ms: 360, mode: "direct_segmented", fallback_reason: "none" },
        early_reaction: { enabled: true, intent: "comfort", pre: "soft_stillness", actual: "dispatched", action: "none", motion_cue: "soft_stillness", pulse: true, reason: "safe_pre_llm_reaction", suppressed: ["motion_disallowed"], latency_ms: 42, target_latency_ms: 500, latency_status: "ok", updated_at: 12340 },
        settled: true,
        private_prompt: "SECRET"
      },
      output_constraints: {
        max_sentences: 3,
        allow_followup_question: false,
        clarify_only_when_needed: false,
        allow_teasing: false,
        allow_motion: false,
        voice_style: "soft"
      },
      improv: {
        stance: "soft_hold",
        chaos_level: 0,
        callback_policy: "none",
        agenda: "hold_the_room_still",
        private_prompt: "SECRET"
      },
      stage_memory: {
        current_bit: "room_anchor",
        recent_callback: "cursor_side_eye",
        correction_state: "none",
        agenda: "hold_the_room_still",
        turns_since_callback: 2,
        raw_history: "SECRET"
      },
      safety_clamp: {
        level: "safe_scene",
        reason: "comfort",
        bit_guide: "SECRET"
      },
      motion_director: {
        pre_reaction: "eyes_down_soft",
        speech_start: "soft_speech_start",
        speech_beats: ["SECRET", "tiny_nod"].slice(1),
        correction_reaction: "none",
        post_settle: "soft_idle",
        suppressed_reasons: ["motion_disallowed", "comfort_no_extra_motion"],
        private_prompt: "SECRET"
      },
      voice_director: {
        delivery: "soft_low",
        pace: "slow",
        pause_profile: "gentle",
        segment_style: "short_soft",
        pre_pause_ms: 120,
        inter_segment_pause_ms: 360,
        max_segments: 2,
        suppressed_reasons: ["comfort_no_voice_bits"],
        private_prompt: "SECRET"
      },
      feedback_effects: ["shorter_replies"],
      continuity: {
        last_intent: "comfort",
        last_topic: "emotional_support",
        mood_baseline: "concerned",
        energy: "calm",
        relationship_tone: "gentle",
        recent_user_need: "reassurance",
        same_need_turns: 2,
        updated_at: 99,
        decay: "fresh"
      },
      history_tail: "raw history api_key=SECRET",
      directive: "private prompt"
    }
  };
  storageController.saveCharacterBrainSnapshot(stateForBrainStorage, {
    windowObject: { sessionStorage }
  });
  const stored = sessionStorage.dump()[storageController.STORAGE_KEYS.characterBrainLastDecision];
  assert.ok(stored, "character brain snapshot should be stored in sessionStorage");
  assert.ok(
    !stored.includes("history_tail")
      && !stored.includes("SECRET")
      && !stored.includes("directive")
      && !stored.includes("private prompt hint")
      && !stored.includes("private reaction hint")
      && !stored.includes("private bit hint")
      && !stored.includes("private_prompt"),
    "stored character brain snapshot should not include private fields"
  );
  const restored = { characterBrainLastDecision: null, characterBrainLastUpdatedAt: 0 };
  storageController.loadCharacterBrainSnapshot(restored, {
    windowObject: { sessionStorage }
  });
  assert.strictEqual(restored.characterBrainLastUpdatedAt, 12345, "character brain snapshot should restore update time");
  assert.strictEqual(restored.characterBrainLastDecision.intent, "comfort", "character brain snapshot should restore public intent");
  assert.strictEqual(restored.characterBrainLastDecision.style_beat, "room_anchor", "character brain snapshot should restore public style beat");
  assert.strictEqual(restored.characterBrainLastDecision.style_beat_guide, undefined, "character brain snapshot should not persist private style guidance");
  assert.strictEqual(restored.characterBrainLastDecision.reaction_mode, "soft_anchor", "character brain snapshot should restore public reaction mode");
  assert.strictEqual(restored.characterBrainLastDecision.reaction_mode_guide, undefined, "character brain snapshot should not persist private reaction guidance");
  assert.strictEqual(restored.characterBrainLastDecision.banter_level, 0, "character brain snapshot should restore compact banter level");
  assert.strictEqual(restored.characterBrainLastDecision.opening_move, "soft_anchor", "character brain snapshot should restore public opening move");
  assert.strictEqual(restored.characterBrainLastDecision.reply_shape, "two_beat", "character brain snapshot should restore public reply shape");
  assert.strictEqual(restored.characterBrainLastDecision.spontaneity, 0, "character brain snapshot should restore public spontaneity");
  assert.strictEqual(restored.characterBrainLastDecision.question_policy, "none", "character brain snapshot should restore public question policy");
  assert.strictEqual(restored.characterBrainLastDecision.performance_bit, "room_anchor", "character brain snapshot should restore public performance bit");
  assert.strictEqual(restored.characterBrainLastDecision.performance_bit_guide, undefined, "character brain snapshot should not persist private bit guidance");
  assert.strictEqual(restored.characterBrainLastDecision.performance_execution.removed_followup, true, "character brain snapshot should restore public execution summary");
  assert.strictEqual(restored.characterBrainLastDecision.performance_execution.removed_context_bleed, true, "character brain snapshot should restore context bleed execution summary");
  assert.strictEqual(restored.characterBrainLastDecision.performance_execution.stage_callback_added, true, "character brain snapshot should restore public stage callback status");
  assert.strictEqual(restored.characterBrainLastDecision.performance_execution.stage_callback_bit, "cursor_side_eye", "character brain snapshot should restore public stage callback bit");
  assert.strictEqual(restored.characterBrainLastDecision.performance_execution.private_prompt, undefined, "character brain snapshot should not persist private execution fields");
  assert.strictEqual(restored.characterBrainLastDecision.performance_timeline.pre, "soft_anchor", "character brain snapshot should restore public timeline summary");
  assert.strictEqual(restored.characterBrainLastDecision.performance_timeline.beats, 0, "character brain snapshot should restore compact timeline beat count");
  assert.strictEqual(restored.characterBrainLastDecision.performance_timeline.motion.pre, "soft_stillness", "character brain snapshot should restore public planned motion cue");
  assert.strictEqual(restored.characterBrainLastDecision.performance_timeline.private_prompt, undefined, "character brain snapshot should not persist private timeline fields");
  assert.strictEqual(restored.characterBrainLastDecision.voice_timeline.delivery, "soft_low", "character brain snapshot should restore public voice timeline summary");
  assert.strictEqual(restored.characterBrainLastDecision.voice_timeline.segments, 2, "character brain snapshot should restore compact voice segment count");
  assert.strictEqual(restored.characterBrainLastDecision.voice_timeline.private_prompt, undefined, "character brain snapshot should not persist private voice timeline fields");
  assert.strictEqual(restored.characterBrainLastDecision.performance_audit.actual.post, "soft_idle", "character brain snapshot should restore public audit summary");
  assert.strictEqual(restored.characterBrainLastDecision.performance_audit.motion.actual.settle_result, "idle_returned", "character brain snapshot should restore public motion settle audit");
  assert.strictEqual(restored.characterBrainLastDecision.performance_audit.motion.actual.last_group, "FlickDown", "character brain snapshot should restore public actual motion group");
  assert.strictEqual(restored.characterBrainLastDecision.performance_audit.motion.actual.last_family, "soft_stillness", "character brain snapshot should restore public actual motion family");
  assert.strictEqual(restored.characterBrainLastDecision.performance_audit.early_reaction.motion_cue, "soft_stillness", "character brain snapshot should restore public early motion cue");
  assert.deepStrictEqual(restored.characterBrainLastDecision.performance_audit.early_reaction.suppressed, ["motion_disallowed"], "character brain snapshot should restore public early suppression reasons");
  assert.strictEqual(restored.characterBrainLastDecision.performance_audit.early_reaction.latency_status, "ok", "character brain snapshot should restore public early latency status");
  assert.strictEqual(restored.characterBrainLastDecision.performance_audit.early_reaction.target_latency_ms, 500, "character brain snapshot should restore public early latency target");
  assert.strictEqual(restored.characterBrainLastDecision.performance_audit.tts.finished, true, "character brain snapshot should restore public TTS audit state");
  assert.strictEqual(restored.characterBrainLastDecision.performance_audit.voice.spoken_segments, 2, "character brain snapshot should restore public voice audit state");
  assert.strictEqual(restored.characterBrainLastDecision.performance_audit.voice.segment_style, "short_soft", "character brain snapshot should restore public voice segment style");
  assert.strictEqual(restored.characterBrainLastDecision.performance_audit.voice.inter_segment_pause_ms, 360, "character brain snapshot should restore public voice pause timing");
  assert.strictEqual(restored.characterBrainLastDecision.performance_audit.private_prompt, undefined, "character brain snapshot should not persist private audit fields");
  assert.strictEqual(restored.characterBrainLastDecision.improv.stance, "soft_hold", "character brain snapshot should restore public improv stance");
  assert.strictEqual(restored.characterBrainLastDecision.improv.private_prompt, undefined, "character brain snapshot should not persist private improv fields");
  assert.strictEqual(restored.characterBrainLastDecision.stage_memory.current_bit, "room_anchor", "character brain snapshot should restore public stage memory");
  assert.strictEqual(restored.characterBrainLastDecision.stage_memory.raw_history, undefined, "character brain snapshot should not persist raw stage memory fields");
  assert.strictEqual(restored.characterBrainLastDecision.safety_clamp.level, "safe_scene", "character brain snapshot should restore public safety clamp");
  assert.strictEqual(restored.characterBrainLastDecision.safety_clamp.bit_guide, undefined, "character brain snapshot should not persist private safety clamp fields");
  assert.strictEqual(restored.characterBrainLastDecision.motion_director.pre_reaction, "eyes_down_soft", "character brain snapshot should restore public motion director plan");
  assert.deepStrictEqual(restored.characterBrainLastDecision.motion_director.suppressed_reasons, ["motion_disallowed", "comfort_no_extra_motion"], "character brain snapshot should restore compact motion suppressions");
  assert.strictEqual(restored.characterBrainLastDecision.motion_director.private_prompt, undefined, "character brain snapshot should not persist private motion fields");
  assert.strictEqual(restored.characterBrainLastDecision.voice_director.delivery, "soft_low", "character brain snapshot should restore public voice director plan");
  assert.deepStrictEqual(restored.characterBrainLastDecision.voice_director.suppressed_reasons, ["comfort_no_voice_bits"], "character brain snapshot should restore compact voice suppressions");
  assert.strictEqual(restored.characterBrainLastDecision.voice_director.private_prompt, undefined, "character brain snapshot should not persist private voice fields");
  assert.strictEqual(restored.characterBrainLastDecision.continuity.recent_user_need, "reassurance", "character brain snapshot should restore compact continuity");
  assert.strictEqual(restored.characterBrainLastDecision.output_constraints.allow_motion, false, "character brain snapshot should restore safe output constraints");
  assert.strictEqual(restored.characterBrainLastDecision.history_tail, undefined, "restored character brain snapshot should stay public-only");
}

{
  const brainReport = characterBrainDebug.buildBrainDebugReport(
    {
      intent: "comfort",
      reply_style: "comfort",
      style_beat: "room_anchor",
      reaction_mode: "soft_anchor",
      banter_level: 0,
      opening_move: "soft_anchor",
      reply_shape: "two_beat",
      spontaneity: 0,
      question_policy: "none",
      performance_bit: "room_anchor",
      energy: "calm",
      attention: "focused",
      relationship: "desktop_companion",
      max_sentences: 3,
      emotion: "sad",
      action: "none",
      intensity: "low",
      voice_style: "soft",
      performance_execution: {
        reply_shape: "two_beat",
        question_policy: "none",
        removed_followup: true,
        removed_unsafe_bit: false,
        removed_context_bleed: false,
        shortened: true,
        used_bit: false,
        final_sentences: 2,
        stage_callback_added: false,
        stage_callback_suppressed: "none",
        stage_callback_bit: "room_anchor"
      },
      performance_timeline: {
        enabled: true,
        pre: "soft_anchor",
        speech: "soft_speech_start",
        beats: 0,
        post: "soft_idle",
        motion: { pre: "soft_stillness", speech: "soft_speech_start", beats: [], post: "soft_idle" },
        suppressed: ["motion_disallowed"],
        private_prompt: "SECRET"
      },
      voice_timeline: {
        enabled: true,
        delivery: "soft_low",
        pace: "slow",
        pause_profile: "gentle",
        segment_style: "short_soft",
        segments: 2,
        pre_pause_ms: 120,
        inter_segment_pause_ms: 360,
        fallback_reason: "none",
        suppressed: ["comfort_no_voice_bits"],
        private_prompt: "SECRET"
      },
      performance_audit: {
        enabled: true,
        status: "settled",
        intent: "comfort",
        timeline: { pre: "soft_anchor", speech: "soft_speech_start", beats: 0, post: "soft_idle" },
        actual: { pre: "soft_anchor", speech: "soft_speech_start", beats: 0, post: "soft_idle", action_dispatches: 0, pulse_dispatches: 2 },
        motion: {
          planned: { pre: "soft_stillness", speech: "soft_speech_start", beats: [], post: "soft_idle" },
          actual: { pre: "soft_stillness", speech: "soft_speech_start", beats: [], post: "soft_idle", dispatches: 0, failed_dispatches: 0, pulse_only: 2, last_group: "FlickDown", last_cue: "soft_stillness", last_family: "soft_stillness", settle_result: "idle_returned" },
          suppressed: ["motion_disallowed"]
        },
        tts: { started: true, finished: true, mode: "direct" },
        voice: { delivery: "soft_low", pace: "slow", pause_profile: "gentle", segment_style: "short_soft", planned_segments: 2, spoken_segments: 2, failed_segments: 0, last_segment_index: 2, pre_pause_ms: 120, inter_segment_pause_ms: 360, mode: "direct_segmented", fallback_reason: "none" },
        early_reaction: { enabled: true, intent: "comfort", pre: "soft_stillness", actual: "dispatched", action: "none", motion_cue: "soft_stillness", pulse: true, reason: "safe_pre_llm_reaction", suppressed: ["motion_disallowed"], latency_ms: 42, target_latency_ms: 500, latency_status: "ok" },
        settled: true,
        private_prompt: "SECRET"
      },
      output_constraints: {
        max_sentences: 3,
        allow_followup_question: false,
        clarify_only_when_needed: false,
        allow_teasing: false,
        allow_motion: false,
        voice_style: "soft"
      },
      improv: {
        stance: "soft_hold",
        chaos_level: 0,
        callback_policy: "none",
        agenda: "hold_the_room_still"
      },
      stage_memory: {
        current_bit: "room_anchor",
        recent_callback: "",
        correction_state: "none",
        agenda: "hold_the_room_still",
        mini_agenda: "hold_the_room_still",
        callback_cooldown_turns: 0,
        last_callback_at: 0,
        turns_since_callback: 1
      },
      safety_clamp: {
        level: "safe_scene",
        reason: "comfort"
      },
      motion_director: {
        pre_reaction: "soft_stillness",
        speech_start: "soft_speech_start",
        speech_beats: [],
        correction_reaction: "none",
        post_settle: "soft_idle",
        suppressed_reasons: ["motion_disallowed", "comfort_no_extra_motion"]
      },
      voice_director: {
        delivery: "soft_low",
        pace: "slow",
        pause_profile: "gentle",
        segment_style: "short_soft",
        pre_pause_ms: 120,
        inter_segment_pause_ms: 360,
        max_segments: 2,
        suppressed_reasons: ["comfort_no_voice_bits"]
      },
      feedback_effects: ["shorter_replies", "less_generic_tone"],
      continuity: {
        last_intent: "comfort",
        last_topic: "emotional_support",
        mood_baseline: "concerned",
        energy: "calm",
        relationship_tone: "gentle",
        recent_user_need: "reassurance",
        same_need_turns: 2,
        decay: "fresh"
      }
    },
    { updatedAt: Date.now() }
  );
  assert.ok(
    brainReport.includes("角色大脑状态")
      && brainReport.includes("当前判断：安慰")
      && brainReport.includes("反馈影响")
      && brainReport.includes("不会触发语音、动作、桌面观察、工具调用或 shell"),
    "character brain debug report should be readable and clearly side-effect-free"
  );
  assert.ok(
    brainReport.includes("\u8fde\u7eed\u6027\u72b6\u6001") && brainReport.includes("reassurance"),
    "character brain debug report should include compact continuity state"
  );
  assert.ok(
    brainReport.includes("\u8f93\u51fa\u7ea6\u675f") && brainReport.includes("\u8ffd\u95ee\uff1a\u907f\u514d"),
    "character brain debug report should include compact output constraints"
  );
  assert.ok(
    brainReport.includes("Style beat: room_anchor"),
    "character brain debug report should include the public style beat"
  );
  assert.ok(
    brainReport.includes("Reaction: soft_anchor"),
    "character brain debug report should include the public reaction mode"
  );
  assert.ok(
    brainReport.includes("Performance: opening=soft_anchor")
      && brainReport.includes("Spontaneity: 0/3")
      && brainReport.includes("Question policy: none"),
    "character brain debug report should include compact public performance controls"
  );
  assert.ok(
    brainReport.includes("Execution")
      && brainReport.includes("removed_followup=yes")
      && brainReport.includes("shortened=yes")
      && brainReport.includes("stage_callback=none")
      && brainReport.includes("bit=room_anchor"),
    "character brain debug report should include compact public execution summary"
  );
  assert.ok(
    brainReport.includes("Timeline")
      && brainReport.includes("pre=soft_anchor")
      && brainReport.includes("beats=0")
      && brainReport.includes("suppressed=motion_disallowed"),
    "character brain debug report should include compact public timeline summary"
  );
  assert.ok(
    brainReport.includes("Voice Director")
      && brainReport.includes("delivery=soft_low")
      && brainReport.includes("segment=short_soft")
      && brainReport.includes("suppressed=comfort_no_voice_bits"),
    "character brain debug report should include compact public voice director summary"
  );
  assert.ok(
    brainReport.includes("Voice Timeline")
      && brainReport.includes("segments=2")
      && brainReport.includes("pause=gentle")
      && brainReport.includes("fallback=none"),
    "character brain debug report should include compact public voice timeline summary"
  );
  assert.ok(
    brainReport.includes("Actual")
      && brainReport.includes("status=settled")
      && brainReport.includes("dispatches=action:0/pulse:2")
      && brainReport.includes("settle=yes")
      && brainReport.includes("voice=soft_low/slow")
      && brainReport.includes("segment=short_soft")
      && brainReport.includes("pause=gentle")
      && brainReport.includes("segments=2/2"),
    "character brain debug report should include compact actual performance audit"
  );
  assert.ok(
    brainReport.includes("failed=0")
      && brainReport.includes("last=2")
      && brainReport.includes("voice_pause=pre:120ms/inter:360ms"),
    "character brain debug report should include voice segment execution details"
  );
  assert.ok(
    brainReport.includes("Motion Actual")
      && brainReport.includes("planned=soft_stillness/soft_speech_start/none/soft_idle")
      && brainReport.includes("actual=soft_stillness/soft_speech_start/none/soft_idle")
      && brainReport.includes("failed=0")
      && brainReport.includes("last_group=FlickDown")
      && brainReport.includes("family=soft_stillness")
      && brainReport.includes("settle=idle_returned"),
    "character brain debug report should include planned vs actual motion audit"
  );
  assert.ok(
    brainReport.includes("Improv")
      && brainReport.includes("stance=soft_hold")
      && brainReport.includes("chaos=0/3")
      && brainReport.includes("Stage memory")
      && brainReport.includes("bit=room_anchor")
      && brainReport.includes("cooldown=0")
      && brainReport.includes("Safety clamp")
      && brainReport.includes("level=safe_scene"),
    "character brain debug report should include public improv and stage memory summaries"
  );
  assert.ok(
    brainReport.includes("Motion Director")
      && brainReport.includes("pre=soft_stillness")
      && brainReport.includes("post=soft_idle")
      && brainReport.includes("suppressed=motion_disallowed, comfort_no_extra_motion")
      && brainReport.includes("removed_context=no"),
    "character brain debug report should include compact public motion director summary"
  );
  assert.ok(
    brainReport.includes("Early Reaction")
      && brainReport.includes("pre=soft_stillness")
      && brainReport.includes("actual=dispatched")
      && brainReport.includes("cue=soft_stillness")
      && brainReport.includes("latency=42ms/500ms")
      && brainReport.includes("status=ok")
      && brainReport.includes("suppressed=motion_disallowed"),
    "character brain debug report should include early pre-reaction execution summary"
  );
  assert.ok(
    !brainReport.includes("SECRET") && !brainReport.includes("private_prompt"),
    "character brain debug report should not leak private timeline fields"
  );
}

{
  assert.strictEqual(typeof performanceAuditController.createController, "function", "performance audit controller should expose a runtime adapter");
  const auditState = { characterBrainLastDecision: { intent: "casual" } };
  const audit = performanceAuditController.createController({
    state: auditState,
    windowObject: {},
    perfLog: () => {}
  });
  audit.startPerformanceAudit({
    traceId: "trace_demo",
    sessionId: 7,
    brainSnapshot: { intent: "casual" },
    timelineSummary: {
      pre: "micro_reaction",
      speech: "expressive_speech_start",
      beats: 1,
      post: "settle_idle",
      motion: { pre: "micro_pulse", speech: "expressive_speech_start", beats: ["head_tilt"], post: "settle_idle" }
    },
    voiceSummary: { delivery: "dry_playful", pace: "measured", pause_profile: "dry_beat", segment_style: "two_beat", segments: 3, pre_pause_ms: 80, inter_segment_pause_ms: 220, mode: "direct_segmented", fallback_reason: "none" },
    earlyReactionSummary: { enabled: true, intent: "casual", pre: "micro_pulse", actual: "dispatched", action: "listen", motion_cue: "micro_pulse", pulse: true, reason: "safe_pre_llm_reaction", latency_ms: 120, target_latency_ms: 500, latency_status: "ok" }
  });
  audit.recordPerformanceAuditEvent("voice_plan", { delivery: "dry_playful", pace: "measured", pause_profile: "dry_beat", segment_style: "two_beat", segments: 3, pre_pause_ms: 80, inter_segment_pause_ms: 220, mode: "direct_segmented", fallback_reason: "none" });
  audit.recordPerformanceAuditEvent("timeline_phase", { phase: "preReaction", name: "micro_reaction", action: "listen", pulse: true, motion_cue: "micro_pulse", motion_role: "pre_reaction" });
  audit.recordPerformanceAuditEvent("motion_dispatch", { motion_cue: "micro_pulse", motion_role: "pre_reaction", motion_family: "micro_reaction", action: "listen", group: "Flick", ok: true });
  audit.recordPerformanceAuditEvent("timeline_phase", { phase: "speechStart", name: "expressive_speech_start", action: "talk", pulse: true, motion_cue: "expressive_speech_start", motion_role: "speech_start" });
  audit.recordPerformanceAuditEvent("motion_dispatch", { motion_cue: "expressive_speech_start", motion_role: "speech_start", motion_family: "speech_start", action: "talk", group: "Tap", ok: true });
  audit.recordPerformanceAuditEvent("timeline_phase", { phase: "speechBeat", name: "speech_beat", action: "talk", pulse: true, motion_cue: "head_tilt", motion_role: "speech_beat" });
  audit.recordPerformanceAuditEvent("motion_dispatch", { motion_cue: "head_tilt", motion_role: "speech_beat", motion_family: "head_tilt", action: "talk", group: "HeadTilt", ok: true });
  audit.recordPerformanceAuditEvent("motion_dispatch", { motion_cue: "side_eye", motion_role: "speech_beat", motion_family: "side_eye", action: "talk", group: "none", ok: false });
  audit.recordPerformanceAuditEvent("tts_start", { mode: "direct_segmented" });
  audit.recordPerformanceAuditEvent("tts_segment", { mode: "direct_segmented", index: 1, segments: 3, ok: true });
  audit.recordPerformanceAuditEvent("tts_segment", { mode: "direct_segmented", index: 2, segments: 3, ok: false });
  audit.recordPerformanceAuditEvent("tts_segment", { mode: "direct_segmented", index: 3, segments: 3, ok: true });
  audit.recordPerformanceAuditEvent("tts_end", { mode: "direct_segmented", ok: true });
  audit.recordPerformanceAuditEvent("timeline_phase", { phase: "postSettle", name: "settle_idle", action: "idle", pulse: true, motion_cue: "settle_idle", motion_role: "post_settle" });
  audit.recordPerformanceAuditEvent("motion_dispatch", { motion_cue: "settle_idle", motion_role: "post_settle", motion_family: "settle", action: "idle", group: "Idle", ok: true });
  const auditSummary = auditState.characterBrainLastDecision.performance_audit;
  assert.strictEqual(auditSummary.actual.pre, "micro_reaction", "audit should record actual pre-reaction dispatch");
  assert.strictEqual(auditSummary.actual.speech, "expressive_speech_start", "audit should record actual speech-start dispatch");
  assert.strictEqual(auditSummary.actual.beats, 1, "audit should count actual speech beats");
  assert.strictEqual(auditSummary.actual.post, "settle_idle", "audit should record actual post-settle dispatch");
  assert.strictEqual(auditSummary.tts.finished, true, "audit should record direct TTS completion");
  assert.strictEqual(auditSummary.voice.planned_segments, 3, "audit should record planned voice segments");
  assert.strictEqual(auditSummary.voice.spoken_segments, 2, "audit should record actual spoken voice segments");
  assert.strictEqual(auditSummary.voice.failed_segments, 1, "audit should record failed voice segments separately");
  assert.strictEqual(auditSummary.voice.last_segment_index, 3, "audit should record the last attempted voice segment index");
  assert.strictEqual(auditSummary.voice.segment_style, "two_beat", "audit should record public voice segment style");
  assert.strictEqual(auditSummary.voice.pause_profile, "dry_beat", "audit should record public voice pause profile");
  assert.strictEqual(auditSummary.voice.pre_pause_ms, 80, "audit should record public voice pre-pause");
  assert.strictEqual(auditSummary.voice.inter_segment_pause_ms, 220, "audit should record public voice inter-segment pause");
  assert.strictEqual(auditSummary.voice.fallback_reason, "none", "audit should record voice fallback reason");
  assert.strictEqual(auditSummary.early_reaction.pre, "micro_pulse", "audit should carry early pre-reaction summary");
  assert.strictEqual(auditSummary.early_reaction.motion_cue, "micro_pulse", "audit should carry public early motion cue");
  assert.strictEqual(auditSummary.early_reaction.latency_status, "ok", "audit should carry public early latency status");
  assert.strictEqual(auditSummary.early_reaction.target_latency_ms, 500, "audit should carry public early latency target");
  assert.strictEqual(auditSummary.motion.planned.pre, "micro_pulse", "audit should record planned motion cue");
  assert.strictEqual(auditSummary.motion.actual.pre, "micro_pulse", "audit should record actual motion cue");
  assert.deepStrictEqual(auditSummary.motion.actual.beats, ["head_tilt"], "audit should record actual motion beat cues");
  assert.strictEqual(auditSummary.motion.actual.dispatches, 4, "audit should count actual motion dispatch events");
  assert.strictEqual(auditSummary.motion.actual.failed_dispatches, 1, "audit should count failed motion dispatch events");
  assert.strictEqual(auditSummary.motion.actual.last_group, "Idle", "audit should record the last actual Live2D motion group");
  assert.strictEqual(auditSummary.motion.actual.last_cue, "settle_idle", "audit should record the last actual motion cue");
  assert.strictEqual(auditSummary.motion.actual.last_family, "settle", "audit should record the last actual motion family");
  assert.ok(auditSummary.motion.suppressed.includes("side_eye"), "audit should keep failed motion cues visible as suppressions");
  assert.strictEqual(auditSummary.motion.actual.settle_result, "idle_returned", "audit should record motion settle result");
  assert.strictEqual(auditSummary.settled, true, "audit should mark settle after post phase");
  assert.strictEqual(auditSummary.raw_history, undefined, "audit summary should not expose raw history");
}

{
  assert.strictEqual(typeof performanceTimelineController.buildPerformanceTimeline, "function", "performance timeline controller should build timeline plans");
  assert.strictEqual(typeof performanceTimelineController.buildVoiceTimeline, "function", "performance timeline controller should build voice timeline plans");
  assert.strictEqual(typeof performanceTimelineController.buildVoiceSpeechSegments, "function", "performance timeline controller should build voice speech segments");
  assert.strictEqual(typeof performanceTimelineController.applyVoiceDirectorProsody, "function", "performance timeline controller should apply voice director prosody");
  assert.strictEqual(typeof performanceTimelineController.buildEarlyPreReactionPlan, "function", "performance timeline controller should build early pre-reactions");
  assert.strictEqual(typeof performanceTimelineController.executeEarlyPreReactionPlan, "function", "performance timeline controller should execute early pre-reactions");
  assert.strictEqual(typeof performanceTimelineController.createController, "function", "performance timeline controller should expose a runtime adapter");
  const earlyQuestion = performanceTimelineController.buildEarlyPreReactionPlan({
    text: "What are you doing?",
    motionEnabled: true,
    expressionEnabled: true,
    nowMs: 1000
  });
  assert.strictEqual(earlyQuestion.enabled, true, "safe question should allow an early pre-reaction");
  assert.strictEqual(earlyQuestion.preReaction.name, "head_tilt", "questions should map to a head-tilt pre-reaction");
  const earlyComfort = performanceTimelineController.buildEarlyPreReactionPlan({
    text: "I feel bad.",
    motionEnabled: true,
    expressionEnabled: true,
    nowMs: 2000
  });
  assert.strictEqual(earlyComfort.preReaction.name, "soft_stillness", "comfort should map to soft stillness before LLM");
  const earlySuppressed = performanceTimelineController.buildEarlyPreReactionPlan({
    text: "/braindebug",
    speakingNow: true,
    nowMs: 2100
  });
  assert.strictEqual(earlySuppressed.enabled, false, "local commands and active TTS should suppress early reactions");
  assert.ok(earlySuppressed.suppressed.includes("local_command") && earlySuppressed.suppressed.includes("tts_active"));
  const earlyCalls = [];
  const earlySummary = performanceTimelineController.executeEarlyPreReactionPlan(earlyQuestion, {
    text: "What are you doing?",
    style: "steady",
    mood: "thinking",
    enqueueActionIntent: (intent) => earlyCalls.push(["action", intent]),
    triggerExpressionPulse: (style) => earlyCalls.push(["pulse", style])
  });
  assert.strictEqual(earlySummary.actual, "dispatched", "early reaction execution should report dispatch");
  assert.strictEqual(earlySummary.motion_cue, "head_tilt", "early reaction summary should expose public motion cue");
  assert.ok(earlySummary.latency_ms >= 0, "early reaction summary should expose dispatch latency");
  assert.strictEqual(earlySummary.target_latency_ms, 500, "early reaction summary should expose the visible latency target");
  assert.ok(["ok", "slow"].includes(earlySummary.latency_status), "early reaction summary should classify dispatch latency");
  assert.ok(earlyCalls.some((item) => item[0] === "pulse") && earlyCalls.some((item) => item[0] === "action"), "early reaction should pulse and enqueue safe motion");
  const earlySuppressedSummary = performanceTimelineController.executeEarlyPreReactionPlan(earlySuppressed);
  assert.strictEqual(earlySuppressedSummary.actual, "suppressed", "suppressed early reaction should report actual suppression");
  assert.strictEqual(earlySuppressedSummary.latency_status, "suppressed", "suppressed early reaction should classify latency as suppressed");
  assert.ok(earlySuppressedSummary.suppressed.includes("local_command"), "suppressed early reaction should expose public suppression reasons");
  const comfortTimeline = performanceTimelineController.buildPerformanceTimeline({
    brainSnapshot: {
      intent: "comfort",
      opening_move: "soft_anchor",
      spontaneity: 3,
      output_constraints: { allow_motion: false }
    },
    replyText: "I'm here. Tiny desk lamp mode.",
    mood: "sad",
    talkStyle: "comfort",
    ttsEnabled: true
  });
  assert.strictEqual(comfortTimeline.preReaction.name, "soft_anchor", "comfort should use a soft pre-reaction");
  assert.strictEqual(comfortTimeline.speechStart.name, "soft_speech_start", "comfort should start speech softly");
  assert.strictEqual(comfortTimeline.speechBeats.length, 0, "comfort should not add extra speech beats");
  assert.strictEqual(comfortTimeline.postSettle.name, "soft_idle", "comfort should settle back to soft idle");
  assert.ok(comfortTimeline.suppressed.includes("motion_disallowed"), "timeline should expose suppressed motion");

  const taskTimeline = performanceTimelineController.buildPerformanceTimeline({
    brainSnapshot: {
      intent: "task_help",
      opening_move: "answer_first",
      reaction_mode: "task_snap",
      spontaneity: 1
    },
    replyText: "First, open the settings panel. Then check the model field.",
    mood: "thinking",
    talkStyle: "steady",
    ttsEnabled: true
  });
  assert.strictEqual(taskTimeline.preReaction.name, "task_snap", "task requests should start with a focused snap");
  assert.strictEqual(taskTimeline.speechStart.name, "steady_speech_start", "task requests should use steady speech");
  assert.ok(taskTimeline.speechBeats.length <= 1, "spontaneity=1 should allow at most one light beat");

  const deadpanTimeline = performanceTimelineController.buildPerformanceTimeline({
    brainSnapshot: {
      intent: "casual",
      opening_move: "deadpan_aside",
      spontaneity: 3
    },
    replyText: "I am rearranging one pixel of self-respect. Very technical.",
    mood: "idle",
    talkStyle: "neutral",
    ttsEnabled: true
  });
  assert.strictEqual(deadpanTimeline.preReaction.name, "deadpan_aside", "deadpan aside should become a tiny pre-reaction");
  assert.ok(deadpanTimeline.speechBeats.length >= 1, "high spontaneity casual replies should get light speech beats");

  const closingTimeline = performanceTimelineController.buildPerformanceTimeline({
    brainSnapshot: {
      intent: "closing",
      opening_move: "no_opening",
      spontaneity: 3
    },
    replyText: "Sleep well. I'll keep the desk quiet.",
    mood: "idle",
    talkStyle: "comfort",
    ttsEnabled: true
  });
  assert.strictEqual(closingTimeline.preReaction.suppressed, true, "closing should not perform an opening bit");
  assert.strictEqual(closingTimeline.speechBeats.length, 0, "closing should not add extra beats");

  const directedTimeline = performanceTimelineController.buildPerformanceTimeline({
    brainSnapshot: {
      intent: "casual",
      opening_move: "micro_reaction",
      spontaneity: 3,
      motion_director: {
        pre_reaction: "side_eye",
        speech_start: "dry_speech_start",
        speech_beats: ["blink_pulse", "head_tilt", "side_eye"],
        correction_reaction: "none",
        post_settle: "settle_idle",
        suppressed_reasons: []
      }
    },
    replyText: "The desk is acting normal, which is how it gets you.",
    mood: "idle",
    talkStyle: "neutral",
    ttsEnabled: true
  });
  assert.strictEqual(directedTimeline.preReaction.name, "side_eye", "timeline should prefer Motion Director pre-reaction");
  assert.strictEqual(directedTimeline.speechStart.name, "dry_speech_start", "timeline should prefer Motion Director speech start");
  assert.deepStrictEqual(
    directedTimeline.speechBeats.map((beat) => beat.name),
    ["blink_pulse", "head_tilt", "side_eye"],
    "timeline should use Motion Director speech beats"
  );
  assert.strictEqual(directedTimeline.postSettle.name, "settle_idle", "timeline should prefer Motion Director post-settle");

  const summary = performanceTimelineController.toPublicTimelineSummary(deadpanTimeline);
  assert.deepStrictEqual(
    Object.keys(summary).sort(),
    ["beats", "enabled", "motion", "post", "pre", "speech", "suppressed"].sort(),
    "public timeline summary should only include safe execution fields"
  );
  assert.strictEqual(summary.motion.pre, "deadpan_aside", "public timeline summary should expose planned motion cue");

  const comfortVoiceTimeline = performanceTimelineController.buildVoiceTimeline({
    brainSnapshot: {
      intent: "comfort",
      voice_director: {
        delivery: "soft_low",
        pace: "slow",
        pause_profile: "gentle",
        segment_style: "short_soft",
        max_segments: 2,
        suppressed_reasons: ["comfort_no_voice_bits"]
      }
    },
    replyText: "I'm here. We keep the room tiny for a second.",
    ttsEnabled: true
  });
  assert.strictEqual(comfortVoiceTimeline.delivery, "soft_low", "comfort voice timeline should use soft delivery");
  assert.ok(comfortVoiceTimeline.segments.length <= 2, "comfort voice timeline should stay compact");
  const miniRantVoiceTimeline = performanceTimelineController.buildVoiceTimeline({
    brainSnapshot: {
      intent: "casual",
      reply_shape: "mini_rant",
      voice_director: {
        delivery: "dry_playful",
        pace: "varied",
        pause_profile: "beat",
        segment_style: "mini_rant_beats",
        max_segments: 3
      }
    },
    replyText: "The desk is suspicious. The cursor knows something. I am filing a tiny report.",
    ttsEnabled: true
  });
  assert.ok(miniRantVoiceTimeline.segments.length <= 3, "mini-rant voice timeline should cap speech beats");
  const plannedSpeechSegments = performanceTimelineController.buildVoiceSpeechSegments(
    "One. Two. Three.",
    miniRantVoiceTimeline
  );
  assert.deepStrictEqual(plannedSpeechSegments, ["One.", "Two.", "Three."], "voice speech segmentation should preserve ordered spoken segments without storing them in public summary");
  const mergedSpeechSegments = performanceTimelineController.buildVoiceSpeechSegments(
    "One. Two. Three. Four.",
    {
      enabled: true,
      segment_style: "mini_rant_beats",
      max_segments: 3,
      voice_director: { segment_style: "mini_rant_beats", max_segments: 3 }
    }
  );
  assert.deepStrictEqual(mergedSpeechSegments, ["One.", "Two.", "Three. Four."], "voice segmentation should merge tail sentences instead of dropping them");
  const oneLinerSegments = performanceTimelineController.buildVoiceSpeechSegments(
    "Go sleep. I'll keep the pixels under questionable supervision.",
    {
      enabled: true,
      segment_style: "one_liner",
      max_segments: 1,
      voice_director: { segment_style: "one_liner", max_segments: 1 }
    }
  );
  assert.deepStrictEqual(oneLinerSegments, ["Go sleep. I'll keep the pixels under questionable supervision."], "one-liner voice style should keep the full reply in one segment");
  const voiceSummary = performanceTimelineController.toPublicVoiceTimelineSummary(comfortVoiceTimeline);
  assert.deepStrictEqual(
    Object.keys(voiceSummary).sort(),
    ["delivery", "enabled", "fallback_reason", "inter_segment_pause_ms", "pace", "pause_profile", "pre_pause_ms", "segment_style", "segments", "suppressed"].sort(),
    "public voice timeline summary should not include raw speech text"
  );
  const softProsody = performanceTimelineController.applyVoiceDirectorProsody(
    { speed_ratio: 1.08, pitch_ratio: 1.01, volume_ratio: 1.0 },
    comfortVoiceTimeline.voice_director
  );
  assert.ok(softProsody.speed_ratio < 1.08, "soft voice director should slow speech down");
  assert.ok(softProsody.volume_ratio < 1.0, "soft voice director should lower volume slightly");
}

{
  const calls = [];
  const fakeWindow = {
    __AI_CHAT_LAST_PERFORMANCE_TIMELINE__: null,
    setTimeout(fn) {
      calls.push(["timer"]);
      fn();
      return 1;
    },
    clearTimeout() {}
  };
  const timelineState = {
    characterBrainLastDecision: { intent: "casual" },
    streamSpeakSession: 42,
    performanceTimelineTimers: []
  };
  const controller = performanceTimelineController.createController({
    state: timelineState,
    windowObject: fakeWindow,
    enqueueActionIntent: (intent, context) => calls.push(["action", intent, context.style]),
    triggerExpressionPulse: (style, boost) => calls.push(["pulse", style, boost]),
    maybePlayTalkGesture: (text, style) => calls.push(["gesture", style]),
    perfLog: () => {}
  });
  const timeline = controller.buildPerformanceTimeline({
    brainSnapshot: { intent: "casual", opening_move: "micro_reaction", spontaneity: 1 },
    replyText: "Yep. The cursor blinked with opinions.",
    mood: "idle",
    talkStyle: "neutral",
    ttsEnabled: true
  });
  const publicSummary = controller.rememberPerformanceTimeline(timeline);
  assert.strictEqual(timelineState.characterBrainLastDecision.performance_timeline.pre, publicSummary.pre, "controller should attach public timeline to the brain snapshot");
  const earlyPublicSummary = controller.rememberEarlyPreReaction(
    controller.executeEarlyPreReactionPlan(
      controller.buildEarlyPreReactionPlan({ text: "You were wrong.", nowMs: 1234 }),
      { text: "You were wrong.", style: "neutral", mood: "idle" }
    )
  );
  assert.strictEqual(earlyPublicSummary.pre, "embarrassed_recovery", "controller should remember early correction reactions");
  assert.strictEqual(timelineState.earlyPreReactionLastSummary.pre, "embarrassed_recovery", "controller should store public early reaction summary");
  const voicePublicSummary = controller.rememberVoiceTimeline(controller.buildVoiceTimeline({
    brainSnapshot: {
      intent: "casual",
      voice_director: { delivery: "dry_playful", pace: "measured", pause_profile: "dry_beat", segment_style: "two_beat", max_segments: 2 }
    },
    replyText: "Yep. The cursor blinked with opinions.",
    ttsEnabled: true
  }));
  assert.strictEqual(timelineState.characterBrainLastDecision.voice_timeline.delivery, voicePublicSummary.delivery, "controller should attach public voice timeline to the brain snapshot");
  controller.executePerformanceTimelinePhase(timeline, "preReaction", { text: "hi", style: "neutral", mood: "idle", sessionId: 42 });
  controller.schedulePerformanceTimelineSpeechBeats(timeline, { text: "hi", style: "neutral", mood: "idle", sessionId: 42 });
  assert.ok(calls.some((item) => item[0] === "pulse"), "timeline execution should trigger expression pulses");
  assert.ok(calls.some((item) => item[0] === "action"), "timeline execution should enqueue safe action intents");
  assert.ok(calls.some((item) => item[0] === "gesture"), "timeline beats should use lightweight talk gestures");
}

{
  const profile = characterExperienceController.rebuildProfile([
    { rating: "bad", note: "reply too long", emotion: "thinking", action: "think", voiceStyle: "neutral" },
    { rating: "good", emotion: "happy", action: "happy_idle", voiceStyle: "cheerful" },
    { rating: "bad", note: "too generic", emotion: "neutral", action: "none", voiceStyle: "neutral" }
  ]);
  const requestProfile = characterExperienceController.buildRequestProfile(profile);
  assert.strictEqual(profile.stats.total, 3, "character experience profile should count recent feedback");
  assert.ok(
    requestProfile.style_directives.some((line) => line.includes("1-3 natural short sentences")),
    "character experience profile should turn long-reply feedback into a next-turn style directive"
  );
  assert.ok(
    requestProfile.avoid_directives.some((line) => line.includes("customer-service phrasing")),
    "character experience profile should turn generic feedback into an avoid directive"
  );
}

{
  const profile = characterExperienceController.rebuildProfile([
    { rating: "bad", issue: "motion_too_much", emotion: "happy", action: "happy_idle", voiceStyle: "cheerful" },
    { rating: "bad", issue: "voice_mismatch", emotion: "neutral", action: "none", voiceStyle: "neutral" }
  ]);
  const requestProfile = characterExperienceController.buildRequestProfile(profile);
  assert.ok(
    requestProfile.style_directives.some((line) => line.includes("lower intensity action cues")),
    "specific motion feedback should become next-turn motion guidance"
  );
  assert.ok(
    requestProfile.style_directives.some((line) => line.includes("voice_style")),
    "specific voice feedback should become next-turn voice guidance"
  );
  assert.deepStrictEqual(
    requestProfile.recent_feedback.map((item) => item.issue),
    ["motion_too_much", "voice_mismatch"],
    "specific cue reasons should stay compact in the request profile"
  );
}

assert.strictEqual(
  devFeatureLoader.isDeveloperFeatureModeEnabled({ location: { search: "?dev=1" }, localStorage: null }),
  true,
  "developer feature loader should enable optional diagnostics through the dev query flag"
);
{
  const writes = [];
  const result = devFeatureLoader.installDeveloperFeatureScripts({
    write: (html) => writes.push(html)
  }, {
    enabled: true,
    scripts: ["./example-dev.js"]
  });
  assert.deepStrictEqual(
    result,
    { enabled: true, scripts: ["./example-dev.js"] },
    "developer feature loader should report injected scripts"
  );
  assert.strictEqual(
    writes[0],
    '<script src="./example-dev.js"><\/script>',
    "developer feature loader should inject parser-ordered script tags"
  );
}
{
  const elements = [
    { hidden: false, attrs: {}, setAttribute(k, v) { this.attrs[k] = v; }, removeAttribute(k) { delete this.attrs[k]; } }
  ];
  const count = devFeatureLoader.applyDeveloperFeatureVisibility({
    querySelectorAll: () => elements
  }, { enabled: false });
  assert.strictEqual(count, 1, "developer feature loader should find marked developer controls");
  assert.strictEqual(elements[0].hidden, true, "developer controls should be hidden by default");
  assert.strictEqual(elements[0].attrs["aria-hidden"], "true", "hidden developer controls should be removed from accessibility flow");
}
assert.ok(
  indexSource.includes('<script src="./devFeatureLoader.js"></script>')
    && indexSource.indexOf('<script src="./devFeatureLoader.js"></script>') < indexSource.indexOf('<script src="./chat.js"></script>')
    && indexSource.includes('id="followup-readiness-btn" type="button" data-dev-feature="diagnostics"')
    && indexSource.includes('id="learning-tab-debug" class="learning-tab" type="button" role="tab" aria-selected="false" data-dev-feature="diagnostics"')
    && !indexSource.includes('<script src="./grayTrialReadinessModel.js"></script>')
    && !indexSource.includes('<script src="./character-runtime-debug-bridge.js"></script>')
    && devFeatureLoaderSource.includes("DEVELOPER_FEATURE_SCRIPTS")
    && devFeatureLoaderSource.includes('"./grayTrialReadinessModel.js"')
    && devFeatureLoaderSource.includes('"./character-runtime-debug-bridge.js"'),
  "developer-only diagnostics should be routed through the optional loader before chat.js starts"
);
assert.strictEqual(
  attachmentModel.formatFileSize(1536),
  "1.5KB",
  "attachment model should format file sizes for attachment chips"
);
assert.strictEqual(
  attachmentModel.isLikelyTextFile({ name: "notes.md", type: "" }),
  true,
  "attachment model should recognize common text attachment extensions"
);
assert.ok(
  attachmentModel.buildAttachmentContextText([
    { kind: "text", name: "notes.md", size: 12, text: "hello" }
  ]).includes("notes.md"),
  "attachment model should build LLM context text for text attachments"
);
assert.strictEqual(
  typeof attachmentController.handleAttachmentFiles,
  "function",
  "attachment controller should expose file intake handling"
);
assert.ok(
  source.includes("const ATTACHMENT_MODEL = window.TaffyAttachmentModel")
    && source.includes("const ATTACHMENT_CONTROLLER = window.TaffyAttachmentController")
    && source.includes("ATTACHMENT_CONTROLLER.buildAttachmentContextText")
    && source.includes("ATTACHMENT_CONTROLLER.buildAttachmentDisplaySuffix")
    && source.includes("ATTACHMENT_CONTROLLER.handleAttachmentFiles")
    && attachmentModelSource.includes("function buildAttachmentContextText")
    && attachmentModelSource.includes("function buildAttachmentDisplaySuffix")
    && attachmentControllerSource.includes("function renderPendingAttachments")
    && attachmentControllerSource.includes("function handleAttachmentFiles")
    && indexSource.includes('<script src="./attachmentModel.js"></script>')
    && indexSource.includes('<script src="./attachmentController.js"></script>')
    && indexSource.indexOf('<script src="./attachmentModel.js"></script>') < indexSource.indexOf('<script src="./attachmentController.js"></script>')
    && indexSource.indexOf('<script src="./attachmentController.js"></script>') < indexSource.indexOf('<script src="./chat.js"></script>'),
  "chat.js should delegate attachment formatting and file intake into attachment helpers"
);
assert.deepStrictEqual(
  learningReviewApi.buildQuickSettingsPayload(1, 2),
  { quick_settings: { inject_count: 1, promotion_min_support: 2 } },
  "learning review API helper should normalize quick settings payloads"
);
assert.strictEqual(
  typeof learningReviewApi.reload,
  "function",
  "learning review API helper should expose reload flow"
);
{
  const learningState = {
    activeTab: "candidates",
    candidates: [],
    samples: [],
    selectedCandidates: new Set(["old", "a"]),
    selectedSamples: new Set(),
    sortMode: "score_desc"
  };
  learningReviewModel.applyLearningPayload(learningState, {
    candidates: [
      { id: "a", assistant_preview: "soft reply", compressed_pattern: "warm", score: 0.7, confidence: 0.6, support_count: 1 },
      { id: "b", assistant_preview: "strong reply", compressed_pattern: "direct", score: 0.9, confidence: 0.8, support_count: 2 }
    ],
    quick_settings: { inject_count: 1, promotion_min_support: 2 }
  });
  assert.strictEqual(learningState.selectedCandidates.has("old"), false, "learning model should prune stale selections");
  assert.deepStrictEqual(
    learningReviewModel.getLearningFilteredItems(learningState, { scoreMin: 0.75 }).map((item) => item.id),
    ["b"],
    "learning model should filter and sort candidate items"
  );
  assert.deepStrictEqual(
    learningState.quickSettings,
    { inject_count: 1, promotion_min_support: 2 },
    "learning model should normalize quick settings"
  );
  assert.strictEqual(
    learningReviewModel.getLearningStatusView("promoted").statusClass,
    "promoted",
    "learning model should normalize status classes for item badges"
  );
  assert.strictEqual(
    learningReviewModel.getLearningMetricViews({ score: 0.82, confidence: 0.4, support_count: 3 }).score.className,
    "is-high",
    "learning model should map metrics to stable visual levels"
  );
  assert.deepStrictEqual(
    learningReviewModel.buildSelectAllState("candidates", learningState.candidates, new Set(["a", "b"])),
    { checked: true, indeterminate: false, selectedCount: 2, canBatch: true, canPromote: true },
    "learning model should derive select-all and batch action state"
  );
  assert.ok(
    learningReviewModel.buildLearningSummaryText(learningState, 1).includes("1"),
    "learning model should build a compact review summary"
  );
  assert.strictEqual(
    typeof learningReviewView.renderLearningReviewItems,
    "function",
    "learning review view should export list rendering"
  );
  assert.strictEqual(
    typeof learningReviewBinder.bindLearningReviewControls,
    "function",
    "learning review binder should export UI event binding"
  );
  assert.strictEqual(
    typeof learningReviewController.createController,
    "function",
    "learning review controller should expose UI orchestration"
  );
  assert.strictEqual(
    typeof panelControlBinder.bindPanelControls,
    "function",
    "panel control binder should export grouped panel binding"
  );
  assert.strictEqual(
    typeof advancedActionBinder.bindAdvancedActionControls,
    "function",
    "advanced action binder should export grouped advanced action binding"
  );
  assert.strictEqual(
    typeof chatInputBinder.bindChatInputControls,
    "function",
    "chat input binder should export primary input binding"
  );
  assert.strictEqual(
    typeof desktopControlBinder.bindDesktopControlButtons,
    "function",
    "desktop control binder should export desktop button binding"
  );
  assert.strictEqual(
    typeof desktopWindowController.isPointInModelDragHotzone,
    "function",
    "desktop window controller should export model drag hit-zone checks"
  );
  assert.strictEqual(
    typeof live2dLayoutController.createController,
    "function",
    "Live2D layout controller should expose a factory"
  );
  assert.strictEqual(
    typeof live2dExpressionController.createController,
    "function",
    "Live2D expression controller should expose a factory"
  );
  assert.strictEqual(
    typeof live2dRuntimeController.createController,
    "function",
    "Live2D runtime controller should expose a factory"
  );
  assert.strictEqual(
    typeof runtimeEventBinder.bindRuntimeEvents,
    "function",
    "runtime event binder should export bridge event binding"
  );
  assert.strictEqual(
    typeof characterBrainDebug.buildBrainDebugReport,
    "function",
    "character brain debug helper should build a readable report"
  );
  assert.strictEqual(
    typeof characterExperienceController.createController,
    "function",
    "character experience controller should expose persistent feedback orchestration"
  );
  assert.strictEqual(
    typeof characterDiagnosticsController.createController,
    "function",
    "character diagnostics controller should expose voice test and tuning orchestration"
  );
}
assert.ok(
  source.includes("const CHAT_STATE = window.TaffyChatState")
    && source.includes("const state = CHAT_STATE.createInitialState()")
    && source.includes("const CHAT_DOM = window.TaffyChatDom")
    && source.includes("const ui = CHAT_DOM.createUI(document)")
    && source.includes("const STORAGE_CONTROLLER = window.TaffyStorageController")
    && source.includes("const DEBUG_PANEL_CONTROLLER = window.TaffyDebugPanelController")
    && source.includes("const CHAT_MESSAGE_CONTROLLER = window.TaffyChatMessageController")
    && source.includes("const PERSONA_AVATAR_CONTROLLER = window.TaffyPersonaAvatarController")
    && source.includes("const ONBOARDING_CONTROLLER = window.TaffyOnboardingController")
    && source.includes("const REMINDER_SCHEDULE_CONTROLLER = window.TaffyReminderScheduleController")
    && source.includes("const EMOTION_STATS_CONTROLLER = window.TaffyEmotionStatsController")
    && source.includes("const LOCAL_ASR_CONTROLLER = window.TaffyLocalAsrController")
    && source.includes("const AUTO_CHAT_CONTROLLER = window.TaffyAutoChatController")
    && source.includes("const RUNTIME_METADATA_CONTROLLER = window.TaffyRuntimeMetadataController")
    && source.includes("const DIAGNOSTICS_RUNTIME_CONTROLLER = window.TaffyDiagnosticsRuntimeController")
    && source.includes("const FOLLOWUP_DEBUG_CONTROLLER = window.TaffyFollowupDebugController")
    && source.includes("const GRAY_TRIAL_REPORT_CONTROLLER = window.TaffyGrayTrialReportController")
    && source.includes("const GRAY_TRIAL_CHARACTER_PANEL_CONTROLLER = window.TaffyGrayTrialCharacterPanelController")
    && source.includes("const FOLLOWUP_READINESS_PANEL_CONTROLLER = window.TaffyFollowupReadinessPanelController")
    && source.includes("const SPEECH_STYLE_CONTROLLER = window.TaffySpeechStyleController")
    && source.includes("const EMOTION_MOOD_CONTROLLER = window.TaffyEmotionMoodController")
    && source.includes("const ACTION_PLAN_CONTROLLER = window.TaffyActionPlanController")
    && source.includes("const MOTION_RUNTIME_CONTROLLER = window.TaffyMotionRuntimeController")
    && source.includes("const VOICE_RUNTIME_CONTROLLER = window.TaffyVoiceRuntimeController")
    && source.includes("const STREAM_TTS_QUEUE_CONTROLLER = window.TaffyStreamTtsQueueController")
    && source.includes("const TTS_PLAYBACK_CONTROLLER = window.TaffyTTSPlaybackController")
    && source.includes("const CHAT_REPLY_CONTROLLER = window.TaffyChatReplyController")
    && source.includes("const WAKE_WORD_CONTROLLER = window.TaffyWakeWordController")
    && source.includes("const APP_CONFIG_CONTROLLER = window.TaffyAppConfigController")
    && source.includes("const APP_STARTUP_CONTROLLER = window.TaffyAppStartupController")
    && source.includes("const CHARACTER_BRAIN_DEBUG = window.TaffyCharacterBrainDebug")
    && source.includes("const CHARACTER_EXPERIENCE_CONTROLLER = window.TaffyCharacterExperienceController")
    && source.includes("CHAT_MESSAGE_CONTROLLER.createController")
    && source.includes("PERSONA_AVATAR_CONTROLLER.createController")
    && source.includes("ONBOARDING_CONTROLLER.createController")
    && source.includes("REMINDER_SCHEDULE_CONTROLLER.createController")
    && source.includes("EMOTION_STATS_CONTROLLER.createController")
    && source.includes("LOCAL_ASR_CONTROLLER.createController")
    && source.includes("AUTO_CHAT_CONTROLLER.createController")
    && source.includes("RUNTIME_METADATA_CONTROLLER.createController")
    && source.includes("DIAGNOSTICS_RUNTIME_CONTROLLER.createController")
    && source.includes("FOLLOWUP_DEBUG_CONTROLLER.createController")
    && source.includes("GRAY_TRIAL_REPORT_CONTROLLER.createController")
    && source.includes("GRAY_TRIAL_CHARACTER_PANEL_CONTROLLER.createController")
    && source.includes("FOLLOWUP_READINESS_PANEL_CONTROLLER.createController")
    && source.includes("SPEECH_STYLE_CONTROLLER.createController")
    && source.includes("EMOTION_MOOD_CONTROLLER.createController")
    && source.includes("ACTION_PLAN_CONTROLLER.createController")
    && source.includes("VOICE_RUNTIME_CONTROLLER.createController")
    && source.includes("STREAM_TTS_QUEUE_CONTROLLER.createController")
    && source.includes("TTS_PLAYBACK_CONTROLLER.createController")
    && source.includes("CHAT_REPLY_CONTROLLER.createController")
    && source.includes("WAKE_WORD_CONTROLLER.createController")
    && source.includes("APP_CONFIG_CONTROLLER.createController")
    && source.includes("APP_STARTUP_CONTROLLER.createController")
    && characterBrainDebugSource.includes("function buildBrainDebugReport")
    && source.includes("CHARACTER_EXPERIENCE_CONTROLLER.createController")
    && diagnosticsRuntimeControllerSource.includes("debugPanelController.updateDebugPanel")
    && chatStateSource.includes("function createInitialState")
    && chatDomSource.includes("function createUI")
    && chatDomSource.includes("function setStatus")
    && storageControllerSource.includes("function loadChatHistory")
    && storageControllerSource.includes("function saveSubtitlePosition")
    && debugPanelControllerSource.includes("function updateDebugPanel")
    && debugPanelControllerSource.includes("function toggleDebugPanel")
    && chatMessageControllerSource.includes("function createController")
    && chatMessageControllerSource.includes("function appendMessage")
    && chatMessageControllerSource.includes("function renderChatHistoryFromState")
    && onboardingControllerSource.includes("function openOnboardingModal")
    && personaAvatarControllerSource.includes("function applyAssistantAvatar")
    && reminderScheduleControllerSource.includes("function renderScheduleList")
    && reminderScheduleControllerSource.includes("function startReminderLoop")
    && emotionStatsControllerSource.includes("function recordEmotion")
    && localAsrControllerSource.includes("function updateMicButton")
    && localAsrControllerSource.includes("function transcribeLocalPcmChunks")
    && autoChatControllerSource.includes("function startAutoChatLoop")
    && autoChatControllerSource.includes("function buildAutoChatPrompt")
    && runtimeMetadataControllerSource.includes("function handleCharacterRuntimeMetadata")
    && runtimeMetadataControllerSource.includes("function normalizeCharacterRuntimeMetadataForFrontend")
    && diagnosticsRuntimeControllerSource.includes("function recordTTSDebugEvent")
    && diagnosticsRuntimeControllerSource.includes("async function runDoctorDiagnostics")
    && diagnosticsRuntimeControllerSource.includes("async function buildMicDebugReport")
    && diagnosticsRuntimeControllerSource.includes("function installTTSDebugBridge")
    && source.includes("buildGrayAutoTrialAuditSummary")
    && !source.includes("buildGrayAutoFollowupTrialAuditSummary")
    && followupDebugControllerSource.includes("function getTTSDebugSnapshot")
    && followupDebugControllerSource.includes("function runProactiveSchedulerPollingCheck")
    && grayTrialReportControllerSource.includes("function buildGrayAutoFollowupTrialPreflight")
    && followupReadinessPanelControllerSource.includes("function buildFollowupReadinessReport")
    && followupReadinessPanelControllerSource.includes("function emitGrayAutoTrialCharacterCueViaManualBridge")
    && grayTrialCharacterPanelControllerSource.includes("function buildAssistantReplyCharacterCueCandidate")
    && followupReadinessPanelControllerSource.includes("function ensureFollowupReadinessPanel")
    && followupReadinessPanelControllerSource.includes("function updateGrayAutoTrialControlPanel")
    && speechStyleControllerSource.includes("function buildSpeechDeliveryText")
    && speechStyleControllerSource.includes("function resolveTalkStyle")
    && emotionMoodControllerSource.includes("const MOOD_KEYWORDS")
    && emotionMoodControllerSource.includes("function pickMoodMotionGroups")
    && actionPlanControllerSource.includes("function buildActionPlan")
    && actionPlanControllerSource.includes("function enqueueActionIntent")
    && motionRuntimeControllerSource.includes("function scheduleIdleMotionLoop")
    && motionRuntimeControllerSource.includes("async function tryBuiltInMotion")
    && motionRuntimeControllerSource.includes("function animateFallback")
    && motionRuntimeControllerSource.includes("function maybePlayTalkGesture")
    && voiceRuntimeControllerSource.includes("function initTTS")
    && voiceRuntimeControllerSource.includes("function switchVoice")
    && streamTtsQueueControllerSource.includes("function runStreamSpeakQueue")
    && streamTtsQueueControllerSource.includes("function scheduleFinalSpeechWatchdog")
    && ttsPlaybackControllerSource.includes("async function playAudioBlob")
    && ttsPlaybackControllerSource.includes("async function speakByServer")
    && chatReplyControllerSource.includes("async function requestAssistantReply")
    && chatReplyControllerSource.includes("async function sendChat")
    && wakeWordControllerSource.includes("function setupWakeWordRecognition")
    && wakeWordControllerSource.includes("function setupSpeechRecognition")
    && appConfigControllerSource.includes("async function loadConfig")
    && appConfigControllerSource.includes("syncProactiveSchedulerPolling")
    && appStartupControllerSource.includes("async function main")
    && appStartupControllerSource.includes("function handleBeforeUnload")
    && appStartupControllerSource.includes("function bindRuntimeBridges")
    && indexSource.includes('<script src="./chatState.js"></script>')
    && indexSource.includes('<script src="./chatDom.js"></script>')
    && indexSource.includes('<script src="./storageController.js"></script>')
    && indexSource.includes('<script src="./debugPanelController.js"></script>')
    && indexSource.includes('<script src="./chatMessageController.js"></script>')
    && indexSource.includes('<script src="./onboardingController.js"></script>')
    && indexSource.includes('<script src="./personaAvatarController.js"></script>')
    && indexSource.includes('<script src="./reminderScheduleController.js"></script>')
    && indexSource.includes('<script src="./emotionStatsController.js"></script>')
    && indexSource.includes('<script src="./localAsrController.js"></script>')
    && indexSource.includes('<script src="./autoChatController.js"></script>')
    && indexSource.includes('<script src="./runtimeMetadataController.js"></script>')
    && indexSource.includes('<script src="./diagnosticsRuntimeController.js"></script>')
    && indexSource.includes('<script src="./followupDebugController.js"></script>')
    && indexSource.includes('<script src="./grayTrialReportController.js"></script>')
    && indexSource.includes('<script src="./grayTrialCharacterPanelController.js"></script>')
    && indexSource.includes('<script src="./followupReadinessPanelController.js"></script>')
    && indexSource.includes('<script src="./speechStyleController.js"></script>')
    && indexSource.includes('<script src="./emotionMoodController.js"></script>')
    && indexSource.includes('<script src="./actionPlanController.js"></script>')
    && indexSource.includes('<script src="./motionRuntimeController.js"></script>')
    && indexSource.includes('<script src="./voiceRuntimeController.js"></script>')
    && indexSource.includes('<script src="./streamTtsQueueController.js"></script>')
    && indexSource.includes('<script src="./ttsPlaybackController.js"></script>')
    && indexSource.includes('<script src="./chatReplyController.js"></script>')
    && indexSource.includes('<script src="./wakeWordController.js"></script>')
    && indexSource.includes('<script src="./appConfigController.js"></script>')
    && indexSource.includes('<script src="./appStartupController.js"></script>')
    && indexSource.indexOf('<script src="./chatState.js"></script>') < indexSource.indexOf('<script src="./chatDom.js"></script>')
    && indexSource.indexOf('<script src="./chatDom.js"></script>') < indexSource.indexOf('<script src="./debugPanelController.js"></script>')
    && indexSource.indexOf('<script src="./debugPanelController.js"></script>') < indexSource.indexOf('<script src="./storageController.js"></script>')
    && indexSource.indexOf('<script src="./storageController.js"></script>') < indexSource.indexOf('<script src="./chatMessageController.js"></script>')
    && indexSource.indexOf('<script src="./chatMessageController.js"></script>') < indexSource.indexOf('<script src="./onboardingController.js"></script>')
    && indexSource.indexOf('<script src="./onboardingController.js"></script>') < indexSource.indexOf('<script src="./personaAvatarController.js"></script>')
    && indexSource.indexOf('<script src="./personaAvatarController.js"></script>') < indexSource.indexOf('<script src="./reminderScheduleController.js"></script>')
    && indexSource.indexOf('<script src="./reminderScheduleController.js"></script>') < indexSource.indexOf('<script src="./emotionStatsController.js"></script>')
    && indexSource.indexOf('<script src="./emotionStatsController.js"></script>') < indexSource.indexOf('<script src="./localAsrController.js"></script>')
    && indexSource.indexOf('<script src="./localAsrController.js"></script>') < indexSource.indexOf('<script src="./autoChatController.js"></script>')
    && indexSource.indexOf('<script src="./autoChatController.js"></script>') < indexSource.indexOf('<script src="./runtimeMetadataController.js"></script>')
    && indexSource.indexOf('<script src="./runtimeMetadataController.js"></script>') < indexSource.indexOf('<script src="./diagnosticsRuntimeController.js"></script>')
    && indexSource.indexOf('<script src="./diagnosticsRuntimeController.js"></script>') < indexSource.indexOf('<script src="./followupDebugController.js"></script>')
    && indexSource.indexOf('<script src="./followupDebugController.js"></script>') < indexSource.indexOf('<script src="./grayTrialReportController.js"></script>')
    && indexSource.indexOf('<script src="./grayTrialReportController.js"></script>') < indexSource.indexOf('<script src="./grayTrialCharacterPanelController.js"></script>')
    && indexSource.indexOf('<script src="./grayTrialCharacterPanelController.js"></script>') < indexSource.indexOf('<script src="./followupReadinessPanelController.js"></script>')
    && indexSource.indexOf('<script src="./subtitleController.js"></script>') < indexSource.indexOf('<script src="./speechStyleController.js"></script>')
    && indexSource.indexOf('<script src="./speechStyleController.js"></script>') < indexSource.indexOf('<script src="./emotionMoodController.js"></script>')
    && indexSource.indexOf('<script src="./emotionMoodController.js"></script>') < indexSource.indexOf('<script src="./actionPlanController.js"></script>')
    && indexSource.indexOf('<script src="./actionPlanController.js"></script>') < indexSource.indexOf('<script src="./motionRuntimeController.js"></script>')
    && indexSource.indexOf('<script src="./motionRuntimeController.js"></script>') < indexSource.indexOf('<script src="./voiceRuntimeController.js"></script>')
    && indexSource.indexOf('<script src="./voiceRuntimeController.js"></script>') < indexSource.indexOf('<script src="./streamTtsQueueController.js"></script>')
    && indexSource.indexOf('<script src="./streamTtsQueueController.js"></script>') < indexSource.indexOf('<script src="./ttsPlaybackController.js"></script>')
    && indexSource.indexOf('<script src="./ttsPlaybackController.js"></script>') < indexSource.indexOf('<script src="./chatReplyController.js"></script>')
    && indexSource.indexOf('<script src="./chatReplyController.js"></script>') < indexSource.indexOf('<script src="./wakeWordController.js"></script>')
    && indexSource.indexOf('<script src="./wakeWordController.js"></script>') < indexSource.indexOf('<script src="./appConfigController.js"></script>')
    && indexSource.indexOf('<script src="./appConfigController.js"></script>') < indexSource.indexOf('<script src="./appStartupController.js"></script>')
    && indexSource.indexOf('<script src="./appStartupController.js"></script>') < indexSource.indexOf('<script src="./chat.js"></script>')
    && indexSource.indexOf('<script src="./followupReadinessPanelController.js"></script>') < indexSource.indexOf('<script src="./chat.js"></script>')
    && indexSource.indexOf('<script src="./reminderScheduleController.js"></script>') < indexSource.indexOf('<script src="./chat.js"></script>')
    && source.includes("const LEARNING_REVIEW_API = window.TaffyLearningReviewApi")
    && source.includes("const LEARNING_REVIEW_MODEL = window.TaffyLearningReviewModel")
    && source.includes("const LEARNING_REVIEW_VIEW = window.TaffyLearningReviewView")
    && source.includes("const LEARNING_REVIEW_BINDER = window.TaffyLearningReviewBinder")
    && source.includes("const LEARNING_REVIEW_CONTROLLER = window.TaffyLearningReviewController")
    && source.includes("const PANEL_CONTROL_BINDER = window.TaffyPanelControlBinder")
    && source.includes("const ADVANCED_ACTION_BINDER = window.TaffyAdvancedActionBinder")
    && source.includes("const CHAT_INPUT_BINDER = window.TaffyChatInputBinder")
    && source.includes("const DESKTOP_CONTROL_BINDER = window.TaffyDesktopControlBinder")
    && source.includes("const DESKTOP_WINDOW_CONTROLLER = window.TaffyDesktopWindowController")
    && source.includes("const LIVE2D_LAYOUT_CONTROLLER = window.TaffyLive2DLayoutController")
    && source.includes("const LIVE2D_EXPRESSION_CONTROLLER = window.TaffyLive2DExpressionController")
    && source.includes("const LIVE2D_RUNTIME_CONTROLLER = window.TaffyLive2DRuntimeController")
    && source.includes("const MOTION_RUNTIME_CONTROLLER = window.TaffyMotionRuntimeController")
    && source.includes("const RUNTIME_EVENT_BINDER = window.TaffyRuntimeEventBinder")
    && learningReviewControllerSource.includes("model.applyLearningPayload")
    && learningReviewControllerSource.includes("model.getLearningFilteredItems")
    && learningReviewControllerSource.includes("model.buildSelectAllState")
    && learningReviewControllerSource.includes("view.renderLearningReviewItems")
    && learningReviewControllerSource.includes("api.reload")
    && source.includes("LEARNING_REVIEW_CONTROLLER.createController")
    && source.includes("function getLearningReviewController()")
    && source.includes("function renderLearningReviewList() { return getLearningReviewController().renderLearningReviewList(); }")
    && source.includes("function bindLearningReviewControls() { return getLearningReviewController().bindLearningReviewControls(); }")
    && source.includes("PANEL_CONTROL_BINDER.bindPanelControls")
    && source.includes("ADVANCED_ACTION_BINDER.bindAdvancedActionControls")
    && source.includes("CHAT_INPUT_BINDER.bindChatInputControls")
    && source.includes("DESKTOP_CONTROL_BINDER.bindDesktopControlButtons")
    && source.includes("getLive2DLayoutController().isPointInModelDragHotzone")
    && source.includes("LIVE2D_LAYOUT_CONTROLLER.createController")
    && source.includes("LIVE2D_EXPRESSION_CONTROLLER.createController")
    && source.includes("LIVE2D_RUNTIME_CONTROLLER.createController")
    && source.includes("MOTION_RUNTIME_CONTROLLER.createController")
    && source.includes("function getMotionRuntimeController()")
    && source.includes("function maybePlayTalkGesture(text, style = \"neutral\") { return getMotionRuntimeController().maybePlayTalkGesture(text, style); }")
    && source.includes("async function playEmotion(text, opts = {}) { return getMotionRuntimeController().playEmotion(text, opts); }")
    && source.includes("function getLive2DRuntimeController()")
    && source.includes("async function initLive2D() { return getLive2DRuntimeController().initLive2D(); }")
    && source.includes("RUNTIME_EVENT_BINDER.bindRuntimeEvents")
    && learningReviewApiSource.includes("function reload(")
    && learningReviewApiSource.includes("function updateEntries")
    && learningReviewModelSource.includes("function normalizeLearningReviewItem")
    && learningReviewModelSource.includes("function getLearningFilteredItems")
    && learningReviewModelSource.includes("function buildSelectAllState")
    && learningReviewModelSource.includes("function getLearningMetricViews")
    && learningReviewViewSource.includes("function renderLearningReviewItems")
    && learningReviewViewSource.includes("model.getLearningMetricViews")
    && learningReviewViewSource.includes("learning-item-actions")
    && learningReviewBinderSource.includes("function bindLearningReviewControls")
    && learningReviewBinderSource.includes("runBatchAction")
    && learningReviewBinderSource.includes("runSingleAction")
    && learningReviewControllerSource.includes("function createInitialState")
    && learningReviewControllerSource.includes("function renderLearningReviewList")
    && learningReviewControllerSource.includes("async function reloadLearningReviewData")
    && learningReviewControllerSource.includes("function bindLearningReviewControls")
    && panelControlBinderSource.includes("function bindPanelControls")
    && panelControlBinderSource.includes("function bindPersonaControls")
    && panelControlBinderSource.includes("function bindScheduleControls")
    && advancedActionBinderSource.includes("function bindAdvancedActionControls")
    && advancedActionBinderSource.includes("runDoctorAndAppendReport")
    && advancedActionBinderSource.includes("toggleChatTranslationVisibility")
    && chatInputBinderSource.includes("function bindChatInputControls")
    && chatInputBinderSource.includes("function bindKeyboardShortcuts")
    && chatInputBinderSource.includes("handleAttachmentFiles")
    && desktopControlBinderSource.includes("function bindDesktopControlButtons")
    && desktopControlBinderSource.includes("setWindowLockedFromUI")
    && desktopControlBinderSource.includes("startAutoChatLoop")
    && desktopWindowControllerSource.includes("function isPointInModelDragHotzone")
    && desktopWindowControllerSource.includes("function stopWindowDrag")
    && desktopWindowControllerSource.includes("function finalizeDesktopDrag")
    && live2dLayoutControllerSource.includes("function placeModel")
    && live2dLayoutControllerSource.includes("function isPointOverVisibleModelArea")
    && live2dLayoutControllerSource.includes("function attachDrag")
    && live2dExpressionControllerSource.includes("function updateMicroMotionLayer")
    && live2dExpressionControllerSource.includes("function getSpeechAnimationMouthOpen")
    && live2dExpressionControllerSource.includes("function applyStyleExpressionLayer")
    && live2dRuntimeControllerSource.includes("async function ensureLive2DRuntime")
    && live2dRuntimeControllerSource.includes("async function initLive2D")
    && live2dRuntimeControllerSource.includes("Live2DModel.from")
    && live2dRuntimeControllerSource.includes("patchCoreModelUpdate")
    && motionRuntimeControllerSource.includes("function isSpeechMotionActive")
    && motionRuntimeControllerSource.includes("function triggerTapMotion")
    && motionRuntimeControllerSource.includes("function playEmotion")
    && runtimeEventBinderSource.includes("function bindRuntimeEvents")
    && runtimeEventBinderSource.includes("bindElectronSubtitleEvents")
    && runtimeEventBinderSource.includes("bindCharacterRuntimeUpdateEvent")
    && indexSource.includes('<script src="./learningReviewApi.js"></script>')
    && indexSource.includes('<script src="./learningReviewModel.js"></script>')
    && indexSource.includes('<script src="./learningReviewView.js"></script>')
    && indexSource.includes('<script src="./learningReviewBinder.js"></script>')
    && indexSource.includes('<script src="./learningReviewController.js"></script>')
    && indexSource.includes('<script src="./panelControlBinder.js"></script>')
    && indexSource.includes('<script src="./advancedActionBinder.js"></script>')
    && indexSource.includes('<script src="./chatInputBinder.js"></script>')
    && indexSource.includes('<script src="./desktopControlBinder.js"></script>')
    && indexSource.includes('<script src="./desktopWindowController.js"></script>')
    && indexSource.includes('<script src="./live2dLayoutController.js"></script>')
    && indexSource.includes('<script src="./live2dExpressionController.js"></script>')
    && indexSource.includes('<script src="./live2dRuntimeController.js"></script>')
    && indexSource.includes('<script src="./motionRuntimeController.js"></script>')
    && indexSource.includes('<script src="./runtimeEventBinder.js"></script>')
    && indexSource.indexOf('<script src="./learningReviewApi.js"></script>') < indexSource.indexOf('<script src="./learningReviewModel.js"></script>')
    && indexSource.indexOf('<script src="./learningReviewModel.js"></script>') < indexSource.indexOf('<script src="./learningReviewView.js"></script>')
    && indexSource.indexOf('<script src="./learningReviewView.js"></script>') < indexSource.indexOf('<script src="./learningReviewBinder.js"></script>')
    && indexSource.indexOf('<script src="./learningReviewBinder.js"></script>') < indexSource.indexOf('<script src="./learningReviewController.js"></script>')
    && indexSource.indexOf('<script src="./learningReviewController.js"></script>') < indexSource.indexOf('<script src="./panelControlBinder.js"></script>')
    && indexSource.indexOf('<script src="./panelControlBinder.js"></script>') < indexSource.indexOf('<script src="./advancedActionBinder.js"></script>')
    && indexSource.indexOf('<script src="./advancedActionBinder.js"></script>') < indexSource.indexOf('<script src="./chatInputBinder.js"></script>')
    && indexSource.indexOf('<script src="./chatInputBinder.js"></script>') < indexSource.indexOf('<script src="./desktopControlBinder.js"></script>')
    && indexSource.indexOf('<script src="./desktopControlBinder.js"></script>') < indexSource.indexOf('<script src="./desktopWindowController.js"></script>')
    && indexSource.indexOf('<script src="./desktopWindowController.js"></script>') < indexSource.indexOf('<script src="./live2dLayoutController.js"></script>')
    && indexSource.indexOf('<script src="./live2dLayoutController.js"></script>') < indexSource.indexOf('<script src="./live2dExpressionController.js"></script>')
    && indexSource.indexOf('<script src="./motionRuntimeController.js"></script>') < indexSource.indexOf('<script src="./live2dRuntimeController.js"></script>')
    && indexSource.indexOf('<script src="./live2dExpressionController.js"></script>') < indexSource.indexOf('<script src="./live2dRuntimeController.js"></script>')
    && indexSource.indexOf('<script src="./live2dRuntimeController.js"></script>') < indexSource.indexOf('<script src="./runtimeEventBinder.js"></script>')
    && indexSource.indexOf('<script src="./runtimeEventBinder.js"></script>') < indexSource.indexOf('<script src="./chat.js"></script>'),
  "chat.js should delegate learning review normalization and list rendering into extracted helpers"
);

assert.strictEqual(
  tuning.getRehearsalPreset(0).label,
  "开心",
  "character tuning helper should expose stable rehearsal presets"
);
assert.ok(
  tuning.buildTuningReport({
    config: {
      character_runtime: { enabled: true, return_metadata: true, auto_apply_reply_cue: true },
      tts: { provider: "gpt_sovits", gpt_sovits_realtime_tts: false },
      motion: { speech_motion_strength: 1.35, expression_strength: 1 },
      llm: { max_tokens: 128 },
      assistant_prompt: "Keep replies short."
    },
    candidate: { textPreview: "hello", mood: "happy", runtimeHint: { emotion: "happy", action: "happy_idle", voice_style: "cheerful" } },
    autoApply: { applied: true, voiceStyle: "cheerful", runtimeHint: { emotion: "happy", action: "happy_idle", voice_style: "cheerful" } },
    feedback: { rating: "good", label: "good", emotion: "happy", action: "happy_idle", voiceStyle: "cheerful" },
    ttsProvider: "gpt_sovits",
    speechMotionStrength: 1.35,
    expressionStrength: 1
  }).includes("tts.gpt_sovits_ref_audio_path"),
  "character tuning helper should build a readable report with config keys"
);
assert.ok(
  typeof doctorDiagnostics.buildReport({
    checks: [{ label: "Backend", ok: true, elapsedMs: 10, detail: "ok" }],
    runtimeConfig: { enabled: true, return_metadata: true, auto_apply_reply_cue: true },
    ttsProvider: "gpt_sovits",
    streamEnabled: false,
    speakingEnabled: true
  }) === "string",
  "doctor diagnostics helper should build a readable self-check report"
);
assert.strictEqual(
  replyCue.normalizeRuntimeVoiceStyle("happy"),
  "cheerful",
  "reply cue helper should normalize mood aliases into runtime voice styles"
);
assert.strictEqual(
  replyCue.runtimeVoiceStyleToTalkStyle("cheerful", "neutral", (value) => value),
  "playful",
  "reply cue helper should map runtime voice style back to speech style"
);
assert.deepStrictEqual(
  toPlainObject(replyCue.buildAssistantReplyCharacterCueCandidate({
    text: "hello",
    mood: "happy",
    style: "playful"
  }, {
    normalizeMetadata: (metadata) => metadata,
    now: () => 1
  }).runtimeHint),
  {
    emotion: "happy",
    action: "happy_idle",
    intensity: "normal",
    voice_style: "cheerful",
    live2d_hint: "happy"
  },
  "reply cue helper should build read-only assistant reply runtime hints"
);
assert.deepStrictEqual(
  toPlainObject(replyCue.applyPerformanceControlsToRuntimeHint(
    { emotion: "happy", action: "happy_idle", intensity: "high", voice_style: "cheerful", live2d_hint: "happy" },
    { intent: "comfort", opening_move: "soft_anchor", emotion: "sad", action: "none", reply_shape: "two_beat", spontaneity: 0 }
  )),
  { emotion: "sad", action: "none", intensity: "low", voice_style: "soft", live2d_hint: "quiet" },
  "reply cue helper should map soft-anchor performance to quiet runtime delivery"
);
assert.deepStrictEqual(
  toPlainObject(replyCue.applyPerformanceControlsToRuntimeHint(
    { emotion: "happy", action: "happy_idle", intensity: "normal", voice_style: "cheerful", live2d_hint: "happy" },
    { intent: "task_help", opening_move: "answer_first", reaction_mode: "task_snap", emotion: "thinking", action: "think", reply_shape: "answer_then_bit", spontaneity: 1 }
  )),
  { emotion: "thinking", action: "think", intensity: "low", voice_style: "serious", live2d_hint: "thinking" },
  "reply cue helper should map task performance to focused thinking delivery"
);
assert.ok(
  ttsDebugReport.buildReport(
    { provider: "gpt_sovits", speakingEnabled: true, currentMs: 42, rms: 0.01234 },
    [{ seq: 1, stage: "request", atMs: 5, result: "ok" }],
    25
  ).includes("recentEvents="),
  "tts debug helper should build a readable event report"
);
assert.ok(
  translateDebugReport.buildReport({
    timeoutMs: 12000,
    cacheSize: 1,
    inFlight: 0,
    circuitOpen: false,
    circuitFailures: 0,
    circuitCooldownMs: 0,
    lastTraceId: "trace-1",
    events: [{ seq: 1, stage: "request_ok", atMs: 5, elapsedMs: 20, status: 200 }]
  }, 50).includes("Translation debug:"),
  "translation debug helper should build a readable event report"
);
assert.ok(
  memoryDebugReport.buildReport({
    memory: { enabled: true, memory_count: 2, last_selection: { reason: "explicit", selected: [{ source: "memory", user: "u", assistant: "a" }] } },
    learning: { degraded_mode: true, diagnostics: { degraded_reason: "low_signal", health_windows: [{ avg_confidence: 0.5, candidate_in_rate: 1, signal_coverage: 0.8 }] } }
  }).includes("Learning health windows:"),
  "memory debug helper should build a readable learning health report"
);
assert.ok(
  toolMetaView.getToolCardSummary({ ok: true, tool: "run_command", args: { command: "node --check web/chat.js" }, exit_code: 0 }).includes("node --check web/chat.js"),
  "tool meta view helper should build readable command summaries"
);
assert.ok(
  typeof toolMetaView.getToolCardTitle({ tool: "search_text" }) === "string",
  "tool meta view helper should localize tool card titles"
);
assert.strictEqual(localCommandRegistry.matchLocalCommand("/ttsdebug").kind, "tts_debug", "local command registry should match TTS debug commands");
assert.strictEqual(localCommandRegistry.matchLocalCommand("/translatedebug on").kind, "translate_debug_on", "local command registry should match translation debug panel commands");
assert.strictEqual(localCommandRegistry.matchLocalCommand("/testvoice").kind, "voice_test", "local command registry should match voice test aliases");
assert.strictEqual(localCommandRegistry.matchLocalCommand("/badcue long").kind, "character_feedback_bad", "local command registry should match bad character cue reasons");
assert.strictEqual(localCommandRegistry.matchLocalCommand("/goodcue warm").kind, "character_feedback_good", "local command registry should match good character cue notes");
assert.strictEqual(localCommandRegistry.matchLocalCommand("/badcuex").kind, "", "local command registry should not overmatch cue prefixes");
assert.strictEqual(
  localCommandExecutor.normalizeFeedbackCueNote({ text: "/badcue generic", alias: "/badcue" }, "bad"),
  "reply_too_generic",
  "local command executor should normalize badcue generic into a feedback issue"
);
assert.strictEqual(
  localCommandExecutor.normalizeFeedbackCueNote({ text: "/badcue motion low", alias: "/badcue" }, "bad"),
  "motion_too_little",
  "local command executor should normalize badcue motion-low into a feedback issue"
);
assert.strictEqual(reminderUtils.parseReminderWhen("10m", { now: () => 1000 }), 601000, "reminder utils should parse relative minute reminders");
assert.strictEqual(reminderUtils.normalizeReminderMode("tool"), "tool", "reminder utils should normalize reminder modes");
assert.ok(typeof reminderUtils.buildReminderTypeLabel({ mode: "assistant" }) === "string", "reminder utils should build readable reminder type labels");
assert.deepStrictEqual(
  scheduleListView.getRenderableScheduleItems([
    { id: 1, dueAt: 300, done: false, repeat: "once" },
    { id: 2, dueAt: 100, done: true, repeat: "once" },
    { id: 3, dueAt: 200, done: true, repeat: "daily" }
  ], { normalizeReminderRepeat: reminderUtils.normalizeReminderRepeat }).map((item) => item.id),
  [3, 1],
  "schedule list view should filter completed one-shot reminders and sort visible items"
);
assert.strictEqual(scheduleFormModel.buildScheduleDraft({ text: "remind me" }).reason, "missing_time", "schedule form model should report missing time before UI handling");
assert.strictEqual(
  scheduleFormModel.buildScheduleDraft({
    rawDate: "2026-05-08T08:00",
    text: "remind me",
    repeat: "daily"
  }, {
    normalizeReminderRepeat: reminderUtils.normalizeReminderRepeat,
    normalizeReminderMode: reminderUtils.normalizeReminderMode,
    shiftReminderToNextDay: reminderUtils.shiftReminderToNextDay,
    now: () => new Date(2026, 4, 8, 9, 0).getTime()
  }).dueAt,
  new Date(2026, 4, 9, 8, 0).getTime(),
  "schedule form model should advance daily reminders into the future"
);
{
  const messages = [];
  const handlers = localCommandExecutor.createLocalCommandHandlers({
    appendMessage: (role, text) => messages.push({ role, text }),
    listPendingReminders: () => [],
    formatReminderTime: () => "10:00"
  });
  handlers.reminder_list({ text: "/reminders", alias: "/reminders" });
  assert.ok(typeof messages[0]?.text === "string", "local command executor should handle reminder list output through injected dependencies");
}
{
  const feedbacks = [];
  const handlers = localCommandExecutor.createLocalCommandHandlers({
    recordCharacterPerformanceFeedback: (rating, note) => feedbacks.push({ rating, note })
  });
  handlers.character_feedback_bad({ text: "/badcue long", alias: "/badcue" });
  handlers.character_feedback_good({ text: "/goodcue warmer", alias: "/goodcue" });
  assert.deepStrictEqual(
    feedbacks,
    [
      { rating: "bad", note: "reply_too_long" },
      { rating: "good", note: "warmer" }
    ],
    "local command executor should pass lightweight cue reasons into character feedback"
  );
}
assert.ok(
  typeof followupReadinessView.buildBackendEntryCardText({
    loaded: true, readOnly: true, skeletonOnly: true, defaultOffBaseline: true, explicitEnableRequired: true,
    blockedReasons: [], guardContractRequiredChecks: [], guardContractDisallowedActions: [], guardContractRollbackSteps: [], previewBlockedReasons: []
  }) === "string",
  "follow-up readiness helper should build backend entry card text"
);
assert.ok(typeof followupReadinessView.getManualConfirmationStatusLabel("available") === "string", "follow-up readiness helper should localize manual confirmation state");
assert.ok(
  followupReadinessView.buildPreviewOneLineText({
    scenarioLabel: "happy", characterLabel: "idle", characterMood: "calm", policy: "soft", tone: "idle", selectedIndex: 0, blocked: "none", candidateText: "hello"
  }).includes("line=hello"),
  "follow-up readiness helper should build copyable one-line previews"
);
assert.strictEqual(
  followupReadinessView.buildManualConfirmationKey({ topicHint: " topic ", policy: "soft", candidateText: " hello " }),
  "topic::soft::hello",
  "follow-up readiness helper should build stable manual confirmation keys"
);
assert.ok(
  typeof followupReadinessView.buildGrayAutoTrialTimelineText({
    total: 1,
    hasArm: true,
    hasTriggerSuccess: false,
    hasStop: false,
    hasDisarm: false,
    entries: [{ seq: 1, category: "control", stage: "conversation_followup_gray_auto_trial_armed" }]
  }) === "string",
  "follow-up readiness helper should build gray trial timeline text"
);
const grayTrialTimeline = grayTrialReadinessModel.buildTimeline([
  { seq: 1, stage: "conversation_followup_gray_auto_trial_armed", result: "armed" },
  { seq: 2, stage: "proactive_scheduler_poll_trigger_success", result: "triggered" }
], {
  parseResult: (value) => ({ base: String(value || "") }),
  sanitizeText: (value) => String(value || "")
});
assert.strictEqual(
  grayTrialTimeline.hasTriggerSuccess,
  true,
  "gray trial readiness model should detect trigger success events"
);
assert.strictEqual(
  grayTrialReadinessModel.buildOutcome({
    timeline: grayTrialTimeline,
    checklist: { readyForWatchedTrial: true, armed: true, polling: true, blockedReasons: [] },
    preflight: { status: "ready_for_local_trial", dryRun: { blockedReasons: [] } },
    session: { count: 0, max: 1 }
  }).outcome,
  "success",
  "gray trial readiness model should derive outcome from timeline events"
);
assert.ok(
  grayTrialReadinessModel.buildSignoffPackage({
    decision: { decision: "REVIEW_AFTER_SUCCESS", outcome: "success", nextAction: "Review", missingRequired: [], rootCauses: [], timeline: { total: 2 } },
    outcome: { outcome: "success", severity: "success", summary: "ok" },
    checklist: { readyForWatchedTrial: true },
    timeline: grayTrialTimeline
  }, { now: () => 123 }).trialId.includes("gray-trial-success"),
  "gray trial readiness model should build stable signoff packages"
);
assert.strictEqual(
  grayTrialCharacterModel.buildCharacterCuePreview({
    signoff: { decision: "WATCH_ONLY", stageRecommendation: "Watch", nextAction: "Next" },
    outcome: { outcome: "not_started" }
  }, {
    buildRuntimeHint: ({ tone }) => ({
      emotion: "neutral",
      action: "none",
      intensity: "low",
      voice_style: "neutral",
      live2d_hint: tone
    })
  }).tone,
  "watching",
  "gray trial character model should choose cue presets from decision and outcome"
);
assert.strictEqual(
  grayTrialCharacterModel.buildExpressionStrategyDraft({
    preview: { decision: "WATCH_ONLY", outcome: "not_started" },
    checklist: { readyForImplementationPlanning: true },
    recap: { accepted: false }
  }, {
    buildRuntimeHint: ({ tone }) => ({
      emotion: "neutral",
      action: "none",
      intensity: "low",
      voice_style: "neutral",
      live2d_hint: tone
    })
  }).activeRuleKey,
  "watch_only_observe",
  "gray trial character model should select the active strategy rule"
);
assert.strictEqual(
  grayTrialCharacterModel.buildAutoRuntimeDryRun({
    plan: { canPlanRollout: false, status: "blocked_for_auto_runtime" },
    strategy: { activeRule: { key: "watch_only_observe", runtimeHint: { emotion: "thinking" } } },
    review: { goNoGo: "NO_GO_FOR_AUTOMATIC_RUNTIME" }
  }).wouldEmit,
  false,
  "gray trial character model dry-run must never emit runtime hints"
);
const grayTrialSwitchPlan = grayTrialAutoRuntimeSwitchModel.buildExplicitSwitchPlan({
  plan: { status: "blocked_for_auto_runtime" },
  dryRun: { status: "blocked", wouldSelectRule: true, wouldEmit: false },
  review: { goNoGo: "NO_GO_FOR_AUTOMATIC_RUNTIME" },
  session: { max: 1 }
});
assert.strictEqual(
  grayTrialSwitchPlan.automaticRuntimeConnected,
  false,
  "gray trial auto runtime switch model should keep automatic runtime disconnected"
);
assert.strictEqual(
  grayTrialAutoRuntimeSwitchModel.buildExplicitSwitchControl({
    acceptance: { status: "acceptance_not_ready", goNoGo: "NO_GO_FOR_AUTOMATIC_RUNTIME", manualVerificationRequired: true },
    switchState: { enabled: false }
  }).canEnable,
  false,
  "gray trial auto runtime switch model should block enabling before acceptance"
);
assert.strictEqual(
  grayTrialAutoRuntimeSwitchModel.buildSeparateImplementationDraft({
    preflight: { ok: false, separateImplementationTaskReady: false, status: "blocked_for_handoff" }
  }).automaticRuntimeConnected,
  false,
  "gray trial auto runtime switch implementation draft should remain read-only and disconnected"
);
assert.ok(
  typeof grayTrialCharacterView.buildCharacterCuePreviewText({
    decision: "NO_GO",
    outcome: "not_started",
    label: "preview",
    mood: "idle",
    tone: "quiet",
    description: "quiet",
    sample: "hello",
    runtimeHint: { emotion: "neutral", action: "none", intensity: "low", voice_style: "neutral", live2d_hint: "quiet" },
    stageRecommendation: "Not ready",
    nextAction: "Keep preview-only"
  }) === "string",
  "gray trial character helper should build character cue preview text"
);
assert.ok(
  typeof grayTrialCharacterView.buildAutoRuntimeDryRunText({
    status: "blocked",
    wouldSelectRule: true,
    selectedRuleKey: "watch_only_observe",
    planStatus: "blocked_for_auto_runtime",
    goNoGo: "NO_GO_FOR_AUTOMATIC_RUNTIME",
    runtimeHint: { emotion: "thinking", action: "think", intensity: "low", voice_style: "neutral", live2d_hint: "thinking" },
    blockedReasons: ["strategy_review_not_ready"],
    nextAction: "Keep disabled"
  }) === "string",
  "gray trial character helper should build automatic runtime dry-run text"
);

assert.strictEqual(
  runtime.normalizeMetadataForFrontend(null),
  null,
  "null metadata should be ignored"
);
assert.strictEqual(
  runtime.normalizeMetadataForFrontend({ unrelated: "value" }),
  null,
  "objects without runtime fields should be ignored"
);

assert.deepStrictEqual(
  toPlainObject(runtime.normalizeMetadataForFrontend({
    emotion: "mysterious",
    action: "dance",
    intensity: "extreme"
  })),
  {
    emotion: "neutral",
    action: "none",
    intensity: "normal"
  },
  "unknown runtime values should fall back to safe defaults"
);

assert.deepStrictEqual(
  toPlainObject(runtime.normalizeMetadataForFrontend({
    emotion: " HAPPY ",
    action: "shake-head",
    intensity: "HIGH",
    voice_style: " Warm ",
    live2d_hint: " Smile_Soft "
  })),
  {
    emotion: "happy",
    action: "shake_head",
    intensity: "high",
    voice_style: "warm",
    live2d_hint: "smile_soft"
  },
  "supported values and aliases should normalize before dispatch"
);

assert.deepStrictEqual(
  toPlainObject(runtime.normalizeMetadataForFrontend({
    emotion: 42,
    action: null,
    intensity: {}
  })),
  {
    emotion: "neutral",
    action: "none",
    intensity: "normal"
  },
  "non-string runtime fields should not leak raw values"
);

assert.ok(
  followupFeatureSource.includes("RUNTIME_METADATA_CONTROLLER.createController")
    && runtimeMetadataControllerSource.includes("characterRuntime")
    && runtimeMetadataControllerSource.includes("normalizeCharacterRuntimeMetadataForFrontend"),
  "chat.js should route Character Runtime metadata through the extracted metadata controller"
);
assert.ok(
  followupFeatureSource.includes("async function previewGrayAutoTrialCharacterCueBackendBridge")
    && followupFeatureSource.includes('authFetch("/api/character_runtime/backend_entry/preview"')
    && followupFeatureSource.includes("backend_preview_noop_confirmed"),
  "manual character cue bridge should run through the backend preview/no-op adapter before emitting"
);
assert.ok(
  followupFeatureSource.includes("async function emitGrayAutoTrialCharacterCueViaManualBridge")
    && followupFeatureSource.includes("emitGrayAutoTrialCharacterCueManually({")
    && followupFeatureSource.includes("previewGrayAutoTrialCharacterCueBackendBridge(checklist)"),
  "manual character cue bridge should keep an explicit debug entry point and reuse the existing manual emit path"
);
assert.ok(
  replyCueSource.includes("const GRAY_AUTO_TRIAL_CHARACTER_CUE_PRESETS")
    && replyCueSource.includes("happy_wave")
    && followupFeatureSource.includes("CHARACTER_REPLY_CUE.listGrayAutoTrialCharacterCuePresets")
    && followupFeatureSource.includes("trialCharacterCuePreset")
    && followupFeatureSource.includes("followupReadinessTrialCharacterCuePresetSelect"),
  "manual character cue bridge should expose explicit safe presets without automatic runtime scheduling"
);
assert.ok(
  followupFeatureSource.includes("resolveGrayAutoTrialCharacterCuePreset")
    && followupFeatureSource.includes("presetKey: getSelectedGrayAutoTrialCharacterCuePresetKey()")
    && grayTrialCharacterViewSource.includes("manualCuePreset="),
  "manual character cue emits should record the selected preset in status and recap"
);
assert.ok(
  followupFeatureSource.includes("function buildGrayAutoTrialCharacterManualCueStatusCardText")
    && followupFeatureSource.includes("followupReadinessTrialCharacterManualCueStatusCard")
    && followupFeatureSource.includes("updateGrayAutoTrialCharacterManualCueStatusCard()")
    && grayTrialCharacterViewSource.includes("backendPreview=")
    && grayTrialCharacterViewSource.includes("live2dApply="),
  "manual character cue panel should expose a dedicated read-only status card"
);
assert.ok(
  followupFeatureSource.includes("function buildAssistantReplyCharacterCueCandidate")
    && replyCueSource.includes("function buildAssistantReplyCharacterCueCandidate")
    && followupFeatureSource.includes("previewAssistantReplyCharacterCueCandidate({")
    && followupFeatureSource.includes("conversation_followup_character_reply_cue_candidate")
    && grayTrialCharacterViewSource.includes("replyCueCandidate="),
  "assistant replies should create a read-only character cue candidate without emitting it"
);
assert.ok(
  followupFeatureSource.includes("characterRuntimeAutoApplyReplyCue")
    && followupFeatureSource.includes("auto_apply_reply_cue")
    && followupFeatureSource.includes("function maybeAutoApplyAssistantReplyCharacterCueCandidate")
    && followupFeatureSource.includes("conversation_followup_character_reply_cue_candidate_auto_apply")
    && replyCueSource.includes("runtimeVoiceStyleToTalkStyle")
    && followupFeatureSource.includes("speechStyle"),
  "assistant reply cue candidates should support an explicit default-off auto-apply path into runtime dispatch and TTS style"
);
assert.ok(
  followupFeatureSource.includes("function buildReplyCharacterChipView")
    && replyCueSource.includes("function buildReplyCharacterChipView")
    && followupFeatureSource.includes("function updateReplyCharacterChip")
    && followupFeatureSource.includes("ui.replyCharacterChip")
    && indexSource.includes('id="reply-character-chip"')
    && baseCssSource.includes(".reply-character-chip[data-tone=\"applied\"]"),
  "assistant reply runtime cue should surface a readable last-reply character chip in the chat header"
);
assert.ok(
  chatStateSource.includes("chatStreamEnabled")
    && appConfigControllerSource.includes("chat_stream_enabled")
    && chatReplyControllerSource.includes("preferStream: state.conversationMode.chatStreamEnabled !== false"),
  "chat requests should support a frontend-visible switch for disabling unstable LLM streaming"
);
assert.ok(
  source.includes("async function runDoctorDiagnostics()")
    && localCommandRegistrySource.includes('kind: "doctor"')
    && localCommandRegistry.matchLocalCommand("/doctor").kind === "doctor"
    && diagnosticsRuntimeControllerSource.includes('runDoctorJsonFetch("/api/health"')
    && diagnosticsRuntimeControllerSource.includes('"/api/llm_probe"')
    && diagnosticsRuntimeControllerSource.includes("requestServerTTSBlob(")
    && diagnosticsRuntimeControllerSource.includes("doctorDiagnostics.buildReport")
    && doctorSource.includes("function buildAdvice")
    && source.includes("runDoctorAndAppendReport()")
    && diagnosticsRuntimeControllerSource.includes('row?.classList?.add("doctor-report")')
    && chatDomSource.includes("doctorBtn: documentObject.getElementById(\"doctor-btn\")")
    && indexSource.includes('id="doctor-btn"')
    && indexSource.includes('<script src="./doctorDiagnostics.js"></script>')
    && baseCssSource.includes(".message.assistant.doctor-report .content"),
  "chat.js should expose a local /doctor self-check for LLM, TTS, config, and character runtime diagnostics"
);
assert.ok(
  indexSource.includes("/ttsdebug")
    && indexSource.includes('id="voice-test-btn"')
    && indexSource.includes('id="character-rehearsal-btn"')
    && indexSource.includes('id="character-tuning-btn"'),
  "help modal should guide non-technical users through self-check, chat, voice, persona setup, and character tuning"
);
assert.ok(
  source.includes("async function runVoiceTestAndAppendReport()")
    && source.includes("getCharacterDiagnosticsController().runVoiceTestAndAppendReport()")
    && characterDiagnosticsControllerSource.includes("async function runVoiceTestAndAppendReport")
    && localCommandRegistrySource.includes('kind: "voice_test"')
    && localCommandRegistry.matchLocalCommand("/testvoice").kind === "voice_test"
    && chatDomSource.includes("voiceTestBtn: documentObject.getElementById(\"voice-test-btn\")")
    && advancedActionBinderSource.includes("ui.voiceTestBtn")
    && advancedActionBinderSource.includes("runVoiceTestAndAppendReport"),
  "voice test should be available both as a visible button and as a local command"
);
assert.ok(
  tuningSource.includes("CHARACTER_REHEARSAL_PRESETS")
    && characterDiagnosticsControllerSource.includes("characterTuning.getRehearsalPreset")
    && source.includes("async function runCharacterRehearsalAndAppendReport()")
    && characterDiagnosticsControllerSource.includes("async function runCharacterRehearsalAndAppendReport")
    && localCommandRegistrySource.includes('kind: "character_rehearsal"')
    && localCommandRegistry.matchLocalCommand("/roletest").kind === "character_rehearsal"
    && chatDomSource.includes("characterRehearsalBtn: documentObject.getElementById(\"character-rehearsal-btn\")")
    && advancedActionBinderSource.includes("runCharacterRehearsalAndAppendReport"),
  "character rehearsal should be available as a visible button and local command to test runtime expression and voice styles without LLM"
);
assert.ok(
  tuningSource.includes("function buildTuningReport")
    && source.includes("function buildCharacterTuningReport()")
    && source.includes("function runCharacterTuningAndAppendReport()")
    && characterDiagnosticsControllerSource.includes("function buildCharacterTuningReport")
    && characterDiagnosticsControllerSource.includes("function runCharacterTuningAndAppendReport")
    && localCommandRegistrySource.includes('kind: "character_tuning"')
    && localCommandRegistry.matchLocalCommand("/tuning").kind === "character_tuning"
    && chatDomSource.includes("characterTuningBtn: documentObject.getElementById(\"character-tuning-btn\")")
    && advancedActionBinderSource.includes("runCharacterTuningAndAppendReport")
    && tuningSource.includes("tts.gpt_sovits_ref_audio_path")
    && tuningSource.includes("motion.speech_motion_strength"),
  "character tuning should expose readable next-step advice and concrete config keys based on the latest runtime cue"
);
assert.ok(
  tuningSource.includes("function buildFeedbackMessage")
    && source.includes("function recordCharacterPerformanceFeedback")
    && source.includes("function handleCharacterBrainDecision")
    && source.includes("function saveCharacterBrainSnapshotToStorage")
    && source.includes("function loadCharacterBrainSnapshotFromStorage")
    && source.includes("function buildCharacterBrainDebugReport")
    && chatApi.streamAssistantReply
    && chatApiSource.includes("onCharacterBrainDecision")
    && chatReplyControllerSource.includes("onCharacterBrainDecision: handleCharacterBrainDecision")
    && chatStateSource.includes("characterBrainLastDecision")
    && localCommandRegistry.matchLocalCommand("/braindebug").kind === "brain_debug"
    && localCommandExecutorSource.includes("brain_debug")
    && localCommandExecutorSource.includes("buildCharacterBrainDebugReport")
    && appStartupControllerSource.includes("loadCharacterBrainSnapshotFromStorage")
    && storageControllerSource.includes("taffy_character_brain_last_decision_v1")
    && source.includes("function getCharacterExperienceRequestProfile")
    && chatReplyControllerSource.includes("payload.character_experience_profile")
    && characterExperienceControllerSource.includes("taffy_character_experience_v1")
    && characterExperienceControllerSource.includes("function buildRequestProfile")
    && characterDiagnosticsControllerSource.includes("characterExperienceController.recordFeedback")
    && characterDiagnosticsControllerSource.includes("characterPerformanceLastFeedback")
    && localCommandRegistry.matchLocalCommand("/goodcue").kind === "character_feedback_good"
    && localCommandRegistry.matchLocalCommand("/badcue").kind === "character_feedback_bad"
    && chatDomSource.includes("characterFeedbackGoodBtn: documentObject.getElementById(\"character-feedback-good-btn\")")
    && chatDomSource.includes("characterFeedbackBadBtn: documentObject.getElementById(\"character-feedback-bad-btn\")")
    && advancedActionBinderSource.includes("recordCharacterPerformanceFeedback"),
  "character tuning should include persistent lightweight feedback that can guide the next runtime reply"
);
assert.ok(
  chatReplyControllerSource.includes("let characterRuntimeMetadataForReply = null")
    && chatReplyControllerSource.includes("function rememberCharacterRuntimeMetadataForReply")
    && chatReplyControllerSource.includes("function normalizeRuntimeVoiceStyleForSpeech")
    && chatReplyControllerSource.includes("const finalProsodyStyle = runtimeVoiceStyle || replyCueApply?.voiceStyle || finalTalkStyle;")
    && chatReplyControllerSource.includes("function shouldSuppressGenericReplyMotion")
    && chatReplyControllerSource.includes("shouldSuppressGenericReplyMotion(characterRuntimeMetadataForReply)")
    && chatReplyControllerSource.includes("applyPerformanceControlsToRuntimeHint")
    && source.includes("normalizeRuntimeVoiceStyle,")
    && source.includes("runtimeVoiceStyleToTalkStyle,")
    && source.includes("applyPerformanceControlsToRuntimeHint,")
    && replyCueSource.includes("function applyPerformanceControlsToRuntimeHint"),
  "final reply TTS and generic reply motion should prefer backend Character Brain runtime metadata"
);
assert.ok(
  tuningSource.includes("function buildWorkflowGuide()")
    && source.includes("function buildCharacterWorkflowGuide()")
    && source.includes("function appendCharacterWorkflowGuide()")
    && characterDiagnosticsControllerSource.includes("function appendCharacterWorkflowGuide")
    && localCommandRegistrySource.includes('kind: "character_workflow"')
    && localCommandRegistry.matchLocalCommand("/roleflow").kind === "character_workflow",
  "chat should expose a readable local character workflow guide"
);
assert.ok(
  source.includes("function buildChatFailureDoctorHint(err)")
    && chatReplyControllerSource.includes("const msg = buildChatFailureDoctorHint(err);"),
  "chat failures should point users to the visible Doctor self-check instead of leaving raw errors alone"
);
assert.ok(
  followupFeatureSource.includes("function buildAssistantReplyCharacterExpressionCue")
    && replyCueSource.includes("function buildAssistantReplyCharacterExpressionCue")
    && replyCueSource.includes('reason: "warm_or_playful"')
    && replyCueSource.includes('action: "happy_idle"')
    && replyCueSource.includes('reason: "question_or_surprise"')
    && replyCueSource.includes('action: "think"')
    && followupFeatureSource.includes("expressionReason"),
  "assistant reply cue candidates should map reply mood/style into concrete allowlisted expression metadata"
);
assert.ok(
  followupFeatureSource.includes("conversation_followup_character_reply_cue_candidate")
    && replyCueSource.includes("noRuntimeCueEmission: true")
    && replyCueSource.includes("noLive2DMove: true"),
  "reply cue candidate debug API should stay preview-only and safe"
);
assert.ok(
  followupFeatureSource.includes("async function emitLastReplyCharacterCueCandidateViaManualBridge")
    && followupFeatureSource.includes("SEND_REPLY_CHARACTER_CUE_CANDIDATE")
    && followupFeatureSource.includes("conversation_followup_character_reply_cue_candidate_manual_emit")
    && followupFeatureSource.includes("previewGrayAutoTrialCharacterCueBackendBridge({"),
  "reply cue candidates should have a separate manual-only bridge with an explicit confirmation phrase"
);
assert.ok(
  /async function emitLastReplyCharacterCueCandidateViaManualBridge[\s\S]*?previewGrayAutoTrialCharacterCueBackendBridge[\s\S]*?handleCharacterRuntimeMetadata\(candidate\.runtimeHint\)/.test(followupFeatureSource),
  "reply cue candidate manual sends should pass backend preview/no-op before using the local runtime cue path"
);
assert.ok(
  /function buildGrayAutoTrialCharacterCueManualEmitRecap[\s\S]*?conversation_followup_character_reply_cue_candidate_manual_emit[\s\S]*?replyCandidateSent/.test(followupFeatureSource)
    && grayTrialCharacterViewSource.includes("replyCueCandidate=")
    && grayTrialCharacterViewSource.includes("emotion:${candidate.runtimeHint?.emotion")
    && grayTrialCharacterViewSource.includes("backendBridge=ok:"),
  "manual cue recap should include reply candidate sends, backend no-op status, and candidate sent state"
);
assert.ok(
  runtimeMetadataControllerSource.includes("followupCharacterRuntimeLastDispatch")
    && runtimeMetadataControllerSource.includes("window.__AI_CHAT_LAST_CHARACTER_RUNTIME_DISPATCH__")
    && grayTrialCharacterViewSource.includes("runtimeDispatch=local:"),
  "manual character cue feedback should expose local dispatch and model broadcast status"
);
assert.ok(
  followupFeatureSource.includes("followupCharacterRuntimeLastApply")
    && runtimeEventBinderSource.includes("__AI_CHAT_LAST_CHARACTER_RUNTIME_APPLY__")
    && grayTrialCharacterViewSource.includes("runtimeApply=emotion:"),
  "manual character cue feedback should expose Live2D apply diagnostics without adding automatic triggers"
);
assert.ok(
  /const advancedLocalActions = createFollowupReadinessCollapsibleActionGroup[\s\S]*trialEmitCharacter[\s\S]*trialSendReplyCueCandidate[\s\S]*\]\);/.test(followupFeatureSource),
  "manual character cue buttons should remain inside the collapsed high-risk local action group"
);
assert.ok(
  followupFeatureSource.includes("function updateReplyCharacterCueCandidateManualSendButton")
    && followupFeatureSource.includes("followupReadinessTrialSendReplyCueCandidateBtn")
    && followupFeatureSource.includes("button.disabled = !available")
    && followupFeatureSource.includes("candidate tone=${candidate.tone")
    && followupFeatureSource.includes("updateReplyCharacterCueCandidateManualSendButton();"),
  "reply cue candidate send button should stay disabled until a concrete candidate is available"
);
assert.ok(
  /async function handleReplyCharacterCueCandidateManualSendClick[\s\S]*?finally \{[\s\S]*?updateReplyCharacterCueCandidateManualSendButton\(\);[\s\S]*?button\.blur\(\);/.test(followupFeatureSource)
    && followupFeatureSource.includes("button.disabled = true"),
  "reply cue candidate manual send should restore button state through the availability guard"
);
assert.ok(
  live2dExpressionControllerSource.includes("function finishSpeechAnimation()")
    && source.includes("function finishSpeechAnimation() { return getLive2DExpressionController().finishSpeechAnimation(); }"),
  "natural speech completion should keep a release helper"
);
assert.ok(
  /function finishSpeechAnimation\(\)\s*\{[\s\S]*?state\.speechAnimUntil\s*=\s*now\s*\+\s*releaseMs;/.test(live2dExpressionControllerSource),
  "natural speech completion should shorten the mouth animation to a release window"
);
assert.ok(
  chatStateSource.includes("ttsAudioRawLevel: 0"),
  "speech animation should keep raw audio level state for audio-driven mouth shapes"
);
assert.ok(
  /state\.ttsAudioAnalyser\.smoothingTimeConstant\s*=\s*0\.12;/.test(live2dExpressionControllerSource),
  "TTS audio analyser should react quickly enough for mouth closures"
);
assert.ok(
  /const hasLiveAudio\s*=\s*audioPlaying && !!state\.ttsAudioAnalyser;/.test(live2dExpressionControllerSource),
  "mouth animation should prefer live audio when an analyser is available"
);
assert.ok(
  /if \(hasLiveAudio\) \{[\s\S]*?const voiced = rawLevel > 0\.035[\s\S]*?target = 0;[\s\S]*?state\.speechMouthOpen = 0;[\s\S]*?return state\.speechMouthOpen;/.test(live2dExpressionControllerSource),
  "live audio mouth path should close quickly when voice energy drops"
);
assert.ok(
  live2dExpressionControllerSource.includes("const closureDip = clampNumber(closureGate")
    && live2dExpressionControllerSource.includes("const rhythmGate = clampNumber")
    && live2dExpressionControllerSource.includes("const closureCap = clampNumber"),
  "live audio mouth path should add rhythmic closure dips during fast speech"
);
assert.ok(
  live2dExpressionControllerSource.includes("voiceRecent = now - Number(state.ttsAudioLastVoiceAt || 0) < 58")
    && live2dExpressionControllerSource.includes("0.62 + visemeOpen * 0.48 - closureDip")
    && live2dExpressionControllerSource.includes("0.045 + liveLevel * 0.16 + rawLevel * 0.1"),
  "fast live audio mouth path should keep closure valleys visible"
);
assert.ok(
  source.includes("const CHAT_TRANSLATION_SERVICE = window.TaffyChatTranslationService")
    && chatTranslationServiceSource.includes("const translationInFlight = new Map();"),
  "chat and subtitle translations should share in-flight requests"
);
assert.ok(
  source.includes("function _normalizeChatTranslationKey(text)")
    && source.includes("CHAT_TRANSLATION_SERVICE.normalizeKey")
    && chatTranslationServiceSource.includes("function normalizeKey(text)")
    && chatTranslationServiceSource.includes("translationInFlight.get(cacheKey)")
    && chatTranslationServiceSource.includes("translationInFlight.set(cacheKey, task)"),
  "chat translation cache/in-flight keys should normalize punctuation spacing variants"
);
assert.ok(
  source.includes("const SUBTITLE_CONTROLLER = window.TaffySubtitleController")
    && source.includes("SUBTITLE_CONTROLLER.fetchTranslation(text, capturedId, getSubtitleControllerDeps())")
    && source.includes("readChatTranslationCache: _readChatTranslationCache")
    && source.includes("fetchChatTranslation: _fetchChatTranslation")
    && subtitleControllerSource.includes("readChatTranslationCache")
    && subtitleControllerSource.includes("fetchChatTranslation"),
  "subtitle translation should reuse the chat translation cache/request path"
);
assert.ok(
  source.includes("function normalizeAssistantVisibleText(text)")
    && chatReplyControllerSource.includes("const visibleReply = normalizeAssistantVisibleText(parsedReply.visibleText);"),
  "final assistant text should normalize English sentence boundaries before display and translation"
);
assert.ok(
  source.includes("function stripAssistantPayloadNoise(text)")
    && runtimeMetadataControllerSource.includes("SPEECH_TEXT.stripAssistantPayloadNoise"),
  "chat visible text cleanup should reuse the shared speech metadata guard"
);
assert.ok(
  chatMessageControllerSource.includes('translationEl.textContent = "\\u4e2d\\u8bd1\\uff1a\\u7ffb\\u8bd1\\u4e2d...";'),
  "assistant messages should show an immediate translation placeholder"
);
assert.ok(
  chatTranslationServiceSource.includes("const CHAT_TRANSLATE_TIMEOUT_MS = 60000;")
    && source.includes("const _CHAT_TRANSLATE_TIMEOUT_MS = CHAT_TRANSLATION_SERVICE.CHAT_TRANSLATE_TIMEOUT_MS || 60000;"),
  "assistant translation should allow slow local LLM translation to finish"
);
assert.ok(
  chatMessageControllerSource.includes('translationEl.textContent = "\\u4e2d\\u8bd1\\uff1a\\u7ffb\\u8bd1\\u6682\\u65f6\\u4e0d\\u53ef\\u7528";'),
  "assistant messages should show a visible translation failure instead of disappearing"
);
assert.ok(
  /utterance\.onend\s*=\s*\(\)\s*=>\s*\{[\s\S]*?finishSpeechAnimation\(\);[\s\S]*?resolve\(true\);[\s\S]*?\};/.test(ttsPlaybackControllerSource),
  "browser TTS success should use graceful speech release"
);
assert.ok(
  /utterance\.onerror\s*=\s*\(\)\s*=>\s*\{[\s\S]*?endSpeechAnimation\(\);[\s\S]*?resolve\(false\);[\s\S]*?\};/.test(ttsPlaybackControllerSource),
  "browser TTS failure should still hard-stop speech animation"
);
assert.ok(
  /const done = \(ok\) => \{[\s\S]*?if \(ok\) \{[\s\S]*?finishSpeechAnimation\(\);[\s\S]*?\} else \{[\s\S]*?endSpeechAnimation\(\);[\s\S]*?\}[\s\S]*?resolve\(ok\);[\s\S]*?\};/.test(ttsPlaybackControllerSource),
  "server TTS completion should release on success and hard-stop on failure"
);
assert.ok(
  /progressTimer\s*=\s*window\.setInterval\(async \(\) => \{[\s\S]*?performance\.now\(\) - lastProgressAt < 2800[\s\S]*?playAudioByContext\(blob,\s*debugContext\)/.test(ttsPlaybackControllerSource),
  "server TTS should fall back when HTML audio stops advancing"
);
assert.ok(
  /fallbackTimer\s*=\s*window\.setTimeout\(resolveOnce,[\s\S]*?durationMs \+ 900/.test(ttsPlaybackControllerSource),
  "AudioContext fallback should not leave speaking state stuck if onended is missed"
);
assert.ok(
  streamTtsQueueControllerSource.includes("function hasQueuedStreamSpeakItem(sessionId)"),
  "stream speech queue should be able to detect queued tail segments"
);
assert.ok(
  streamTtsQueueControllerSource.includes("function ensureStreamSpeakQueueRunning(sessionId")
    && streamTtsQueueControllerSource.includes("stream_run_handoff")
    && streamTtsQueueControllerSource.includes("ensureStreamSpeakQueueRunning(sessionId, 0);"),
  "stream speech queue should hand off to a newer session after an older runner exits"
);
assert.ok(
  /function dequeueStreamSpeakItem\(sessionId\)\s*\{[\s\S]*?for \(let i = 0; i < state\.streamSpeakQueue\.length; i \+= 1\)[\s\S]*?item\.sessionId !== sessionId[\s\S]*?continue;[\s\S]*?state\.streamSpeakQueue\.splice\(i, 1\);[\s\S]*?return item;/.test(streamTtsQueueControllerSource),
  "stream speech dequeue should not drop queued items from newer sessions"
);
assert.ok(
  streamTtsQueueControllerSource.includes("function shouldSerializeStreamTTSRequests()")
    && streamTtsQueueControllerSource.includes('state.ttsProvider === "gpt_sovits"')
    && streamTtsQueueControllerSource.includes("if (!shouldSerializeStreamTTSRequests())")
    && speechStyleControllerSource.includes("provider: state.ttsProvider || \"\""),
  "GPT-SoVITS realtime stream speech should serialize eager requests and use provider-aware segmentation"
);
assert.ok(
  appConfigControllerSource.includes("stream_speak_idle_wait_ms")
    && appConfigControllerSource.includes("state.streamSpeakIdleWaitMs = Number.isFinite(streamIdleWaitCfg)")
    && streamTtsQueueControllerSource.includes("Math.max(30, Math.min(220, Number(state.streamSpeakIdleWaitMs) || 90))"),
  "stream speech queue should support a shorter configurable idle wait"
);
assert.ok(
  appConfigControllerSource.includes("gpt_sovits_timeout_sec")
    && appConfigControllerSource.includes("sovitsTimeoutMs")
    && appConfigControllerSource.includes("Math.min(90000")
    && appConfigControllerSource.includes("state.ttsServerRequestTimeoutMs"),
  "GPT-SoVITS frontend request timeout should follow backend timeout config"
);
assert.ok(
  chatStateSource.includes("streamSpeakWorkingSession: 0")
    && streamTtsQueueControllerSource.includes("stream_run_clear_stale_busy")
    && streamTtsQueueControllerSource.includes("state.streamSpeakWorkingSession = activeSession"),
  "new realtime TTS sessions should not be blocked by stale stream runners"
);
assert.ok(
  /current\s*=\s*next\s*\|\|\s*await waitNextStreamSpeakItem\([\s\S]*?state\.chatBusy \? idleWaitMs : 180/.test(streamTtsQueueControllerSource),
  "stream speech queue should re-check for tail segments after each audio segment plays"
);
assert.ok(
  /finally \{[\s\S]*?state\.streamSpeakWorking = false;[\s\S]*?hasQueuedStreamSpeakItem\(activeSession\)[\s\S]*?runStreamSpeakQueue\(\)/.test(streamTtsQueueControllerSource),
  "stream speech queue should restart itself if a segment arrived while it was finishing"
);
assert.ok(
  chatStateSource.includes("streamSpeakPlayedSession: 0")
    && streamTtsQueueControllerSource.includes("function scheduleFinalSpeechWatchdog")
    && streamTtsQueueControllerSource.includes("final_watchdog_tts")
    && chatReplyControllerSource.includes("scheduleFinalSpeechWatchdog({"),
  "final replies should have a watchdog fallback if realtime stream speech never starts playback"
);
assert.ok(
  streamTtsQueueControllerSource.includes("function discardQueuedStreamSpeakItems(sessionId)")
    && chatReplyControllerSource.includes('recordTTSDebugEvent("final_direct_tts"')
    && chatReplyControllerSource.includes("no_stream_playback_yet")
    && chatReplyControllerSource.includes("state.streamSpeakLastEnqueueSession = 0;"),
  "short final replies should use direct TTS if no realtime stream segment has started playback"
);
assert.ok(
  source.includes("const PERFORMANCE_TIMELINE_CONTROLLER = window.TaffyPerformanceTimelineController")
    && source.includes("const PERFORMANCE_AUDIT_CONTROLLER = window.TaffyPerformanceAuditController")
    && source.includes("function getPerformanceAuditController()")
    && source.includes("function getPerformanceTimelineController()")
    && source.includes("function buildPerformanceTimeline(input = {})")
    && chatStateSource.includes("performanceAuditLastSummary: null")
    && chatStateSource.includes("performanceAuditEvents: []")
    && chatStateSource.includes("performanceTimelineLastSummary: null")
    && chatStateSource.includes("performanceTimelineTimers: []")
    && chatReplyControllerSource.includes("const performanceTimeline = buildPerformanceTimeline({")
    && chatReplyControllerSource.includes("const voiceTimeline = buildVoiceTimeline({")
    && chatReplyControllerSource.includes("speakWithVoiceTimeline(")
    && chatReplyControllerSource.includes("buildVoiceSpeechSegments(")
    && chatReplyControllerSource.includes("applyVoiceDirectorProsody(")
    && chatReplyControllerSource.includes("startPerformanceAudit({")
    && chatReplyControllerSource.includes('recordPerformanceAuditEvent("tts_start"')
    && chatReplyControllerSource.includes('executePerformanceTimelinePhase(performanceTimeline, "preReaction"')
    && chatReplyControllerSource.includes('executePerformanceTimelinePhase(performanceTimeline, "speechStart"')
    && chatReplyControllerSource.includes("schedulePerformanceTimelineSpeechBeats(performanceTimeline")
    && chatReplyControllerSource.includes('executePerformanceTimelinePhase(performanceTimeline, "postSettle"')
    && performanceAuditControllerSource.includes("function sanitizePerformanceAuditSummary")
    && performanceTimelineControllerSource.includes("function buildPerformanceTimeline")
    && performanceTimelineControllerSource.includes("function buildVoiceTimeline")
    && performanceTimelineControllerSource.includes("function buildVoiceSpeechSegments")
    && performanceTimelineControllerSource.includes("function applyVoiceDirectorProsody")
    && performanceAuditControllerSource.includes("function normalizeVoiceSummary")
    && performanceTimelineControllerSource.includes("recordPerformanceAuditEvent")
    && performanceTimelineControllerSource.includes("function toPublicTimelineSummary")
    && indexSource.includes('<script src="./performanceAuditController.js"></script>')
    && indexSource.includes('<script src="./performanceTimelineController.js"></script>')
    && indexSource.indexOf('<script src="./performanceAuditController.js"></script>') < indexSource.indexOf('<script src="./performanceTimelineController.js"></script>')
    && indexSource.indexOf('<script src="./performanceTimelineController.js"></script>') < indexSource.indexOf('<script src="./chat.js"></script>'),
  "chat replies should route brain performance controls through the front-end performance timeline and audit"
);
assert.ok(
  followupFeatureSource.includes("function buildTTSDebugReport()")
    && followupFeatureSource.includes("window.TaffyTTSDebugReport?.buildReport")
    && ttsDebugSource.includes("function buildReport")
    && ttsDebugSource.includes("recentEvents=")
    && devFeatureLoaderSource.includes('"./ttsDebugReport.js"')
    && indexSource.includes('<script src="./devFeatureLoader.js"></script>'),
  "chat.js should expose a TTS debug report for voice playback diagnosis"
);
assert.ok(
  source.includes("function buildTranslateDebugReport()")
    && diagnosticsRuntimeControllerSource.includes("TaffyTranslateDebugReport?.buildReport")
    && translateDebugSource.includes("function buildReport")
    && translateDebugSource.includes("Translation debug:")
    && devFeatureLoaderSource.includes('"./translateDebugReport.js"')
    && indexSource.includes('<script src="./devFeatureLoader.js"></script>'),
  "chat.js should delegate translation debug report rendering into the extracted helper"
);
assert.ok(
  source.includes("function buildMemoryDebugReport(")
    && learningReviewControllerSource.includes("memoryDebugReport.buildReport")
    && memoryDebugSource.includes("function buildReport")
    && memoryDebugSource.includes("Learning health windows:")
    && devFeatureLoaderSource.includes('"./memoryDebugReport.js"')
    && indexSource.includes('<script src="./devFeatureLoader.js"></script>'),
  "chat.js should delegate memory debug report rendering into the extracted helper"
);
assert.ok(
  source.includes("const TOOL_META_VIEW = window.TaffyToolMetaView")
    && source.includes("TOOL_META_VIEW.renderToolMetaCards")
    && toolMetaViewSource.includes("function renderToolMetaCards")
    && toolMetaViewSource.includes("function getToolCardSummary")
    && indexSource.includes('<script src="./toolMetaView.js"></script>'),
  "chat.js should delegate tool meta card rendering into the extracted view helper"
);
assert.ok(
  source.includes("const FOLLOWUP_READINESS_VIEW = window.TaffyFollowupReadinessView")
    && followupFeatureSource.includes("FOLLOWUP_READINESS_VIEW.buildBackendEntryCardText")
    && followupFeatureSource.includes("FOLLOWUP_READINESS_VIEW.buildPreviewOneLineText")
    && source.includes("const GRAY_TRIAL_READINESS_MODEL = window.TaffyGrayTrialReadinessModel")
    && followupFeatureSource.includes("GRAY_TRIAL_READINESS_MODEL.buildTimeline")
    && grayTrialReadinessModelSource.includes("function buildGoNoGoDecision")
    && followupReadinessViewSource.includes("function buildGrayAutoTrialTimelineText")
    && followupReadinessViewSource.includes("function buildGrayAutoTrialSignoffPackageText")
    && followupReadinessViewSource.includes("function buildGrayAutoTrialStatusCardText")
    && devFeatureLoaderSource.includes('"./grayTrialReadinessModel.js"')
    && devFeatureLoaderSource.includes('"./followupReadinessView.js"')
    && indexSource.includes('<script src="./devFeatureLoader.js"></script>'),
  "follow-up readiness cards should delegate pure text rendering into the extracted view helper"
);
assert.ok(
  source.includes("const GRAY_TRIAL_CHARACTER_VIEW = window.TaffyGrayTrialCharacterView")
    && source.includes("const GRAY_TRIAL_CHARACTER_MODEL = window.TaffyGrayTrialCharacterModel")
    && source.includes("const GRAY_TRIAL_AUTO_RUNTIME_SWITCH_MODEL = window.TaffyGrayTrialAutoRuntimeSwitchModel")
    && followupFeatureSource.includes("GRAY_TRIAL_CHARACTER_MODEL.buildCharacterCuePreview")
    && followupFeatureSource.includes("GRAY_TRIAL_CHARACTER_MODEL.buildExpressionStrategyDraft")
    && followupFeatureSource.includes("GRAY_TRIAL_CHARACTER_MODEL.buildAutoRuntimeDryRun")
    && followupFeatureSource.includes("GRAY_TRIAL_AUTO_RUNTIME_SWITCH_MODEL.buildExplicitSwitchPlan")
    && followupFeatureSource.includes("GRAY_TRIAL_AUTO_RUNTIME_SWITCH_MODEL.buildFinalPreflight")
    && followupFeatureSource.includes("GRAY_TRIAL_AUTO_RUNTIME_SWITCH_MODEL.buildSeparateImplementationDraft")
    && followupFeatureSource.includes("GRAY_TRIAL_CHARACTER_VIEW.buildCharacterCuePreviewText")
    && followupFeatureSource.includes("GRAY_TRIAL_CHARACTER_VIEW.buildCharacterCueManualEmitRecapText")
    && followupFeatureSource.includes("GRAY_TRIAL_CHARACTER_VIEW.buildAutoRuntimeDryRunText")
    && followupFeatureSource.includes("GRAY_TRIAL_CHARACTER_VIEW.buildSwitchControlDiagnosticsText")
    && followupFeatureSource.includes("GRAY_TRIAL_CHARACTER_VIEW.buildSeparateImplementationDraftText")
    && grayTrialCharacterModelSource.includes("function buildCharacterCuePreview")
    && grayTrialCharacterModelSource.includes("function buildExpressionStrategyDraft")
    && grayTrialCharacterModelSource.includes("function buildAutoRuntimeDryRun")
    && grayTrialAutoRuntimeSwitchModelSource.includes("function buildExplicitSwitchPlan")
    && grayTrialAutoRuntimeSwitchModelSource.includes("function buildSwitchAcceptancePackage")
    && grayTrialAutoRuntimeSwitchModelSource.includes("function buildFinalPreflight")
    && grayTrialCharacterViewSource.includes("function buildCharacterManualCueStatusCardText")
    && grayTrialCharacterViewSource.includes("function buildExplicitSwitchPlanText")
    && grayTrialCharacterViewSource.includes("function buildSwitchAcceptancePackageText")
    && grayTrialCharacterViewSource.includes("function buildFinalPreflightText")
    && grayTrialCharacterViewSource.includes("function buildCharacterCuePreviewText")
    && devFeatureLoaderSource.includes('"./grayTrialCharacterModel.js"')
    && devFeatureLoaderSource.includes('"./grayTrialAutoRuntimeSwitchModel.js"')
    && devFeatureLoaderSource.includes('"./grayTrialCharacterView.js"')
    && indexSource.includes('<script src="./devFeatureLoader.js"></script>'),
  "gray trial character cue cards should delegate pure text rendering into the extracted view helper"
);
assert.ok(
  source.includes("const LOCAL_COMMAND_REGISTRY = window.TaffyLocalCommandRegistry")
    && source.includes("const LOCAL_COMMAND_EXECUTOR = window.TaffyLocalCommandExecutor")
    && source.includes("LOCAL_COMMAND_REGISTRY.matchLocalCommand")
    && source.includes("LOCAL_COMMAND_EXECUTOR.createLocalCommandHandlers")
    && source.includes("function getLocalCommandHandlers()")
    && source.includes("const handler = getLocalCommandHandlers()[command.kind]")
    && source.includes("const REMINDER_UTILS = window.TaffyReminderUtils")
    && source.includes("const SCHEDULE_LIST_VIEW = window.TaffyScheduleListView")
    && source.includes("const SCHEDULE_FORM_MODEL = window.TaffyScheduleFormModel")
    && reminderScheduleControllerSource.includes("REMINDER_UTILS.parseReminderWhen")
    && reminderScheduleControllerSource.includes("SCHEDULE_LIST_VIEW.renderScheduleList")
    && reminderScheduleControllerSource.includes("SCHEDULE_FORM_MODEL.buildScheduleDraft")
    && localCommandRegistry.matchLocalCommand("/ttsdebug").kind === "tts_debug"
    && localCommandRegistrySource.includes('kind: "tts_debug"')
    && localCommandExecutorSource.includes("function createLocalCommandHandlers")
    && reminderUtilsSource.includes("function parseReminderWhen")
    && scheduleListViewSource.includes("function renderScheduleList")
    && scheduleFormModelSource.includes("function buildScheduleDraft")
    && indexSource.includes('<script src="./localCommandRegistry.js"></script>')
    && indexSource.includes('<script src="./localCommandExecutor.js"></script>')
    && indexSource.includes('<script src="./reminderUtils.js"></script>')
    && indexSource.includes('<script src="./scheduleListView.js"></script>')
    && indexSource.includes('<script src="./scheduleFormModel.js"></script>')
    && indexSource.includes('<script src="./characterBrainDebug.js"></script>')
    && indexSource.includes('<script src="./characterExperienceController.js"></script>')
    && indexSource.includes('<script src="./characterDiagnosticsController.js"></script>')
    && indexSource.indexOf('<script src="./characterTuning.js"></script>') < indexSource.indexOf('<script src="./characterDiagnosticsController.js"></script>')
    && indexSource.indexOf('<script src="./characterBrainDebug.js"></script>') < indexSource.indexOf('<script src="./chat.js"></script>')
    && indexSource.indexOf('<script src="./characterExperienceController.js"></script>') < indexSource.indexOf('<script src="./characterDiagnosticsController.js"></script>')
    && indexSource.indexOf('<script src="./characterDiagnosticsController.js"></script>') < indexSource.indexOf('<script src="./chat.js"></script>'),
  "local commands should include /ttsdebug for copyable playback state"
);
assert.ok(
  source.includes("function installTTSDebugBridge()"),
  "window debug bridge should expose TTS playback state to developer tools"
);
assert.ok(
  diagnosticsRuntimeControllerSource.includes("TaffyTranslateDebugReport?.buildReport")
    && localCommandRegistry.matchLocalCommand("/translatedebug").kind === "translate_debug",
  "chat.js should expose /translatedebug for copyable translation timing state"
);
assert.ok(
  learningReviewControllerSource.includes("memoryDebugReport.buildReport")
    && localCommandRegistry.matchLocalCommand("/memorydebug").kind === "memory_debug"
    && learningReviewControllerSource.includes("api.reloadMemoryDebug")
    && learningReviewApiSource.includes('fetchJsonFn("/api/memory/debug")')
    && chatDomSource.includes("learningTabDebug")
    && chatDomSource.includes("learningDebugPanel")
    && memoryDebugSource.includes("learning.degradedReason=")
    && memoryDebugSource.includes("Learning health windows:"),
  "chat.js should expose memory/learning chain debug state"
);
assert.ok(
  localCommandExecutorSource.includes('append(deps, deps.buildTranslateDebugReport(), { enableTranslation: false })')
    && localCommandExecutorSource.includes('append(deps, "Translation debug panel enabled.", { enableTranslation: false })'),
  "translation debug command responses should not recursively trigger assistant translation"
);
assert.ok(
  source.includes("function installTranslateDebugBridge()")
    && diagnosticsRuntimeControllerSource.includes("__AI_CHAT_DEBUG_TRANSLATE__"),
  "window debug bridge should expose translation timing state to developer tools"
);
assert.ok(
  chatTranslationServiceSource.includes('recordDebug(deps, "request_start"')
    && chatTranslationServiceSource.includes('recordDebug(deps, "request_ok"')
    && chatTranslationServiceSource.includes('recordDebug(deps, "cache_hit"'),
  "translation requests should record start, completion, and cache-hit events"
);
assert.ok(
  ttsPlaybackControllerSource.includes('recordTTSDebugEvent("audio_play_start"')
    && ttsPlaybackControllerSource.includes('recordTTSDebugEvent("audio_done"')
    && source.includes('function recordTTSAudioEvent(stage, audio, debugContext = {}, extra = {})')
    && ttsPlaybackControllerSource.includes('recordTTSAudioEvent("audio_waiting"')
    && ttsPlaybackControllerSource.includes('recordTTSAudioEvent("audio_stalled"'),
  "server audio playback should record start, completion, and HTMLAudioElement lifecycle events"
);
assert.ok(
  streamTtsQueueControllerSource.includes('recordTTSDebugEvent("stream_enqueue"')
    && streamTtsQueueControllerSource.includes('recordTTSDebugEvent("stream_request_ok"'),
  "stream speech queue should record enqueue and TTS request completion events"
);
assert.ok(
  chatStateSource.includes("ttsPlaybackGeneration: 0")
    && source.includes("function isCurrentTTSPlaybackGeneration(generation)")
    && ttsPlaybackControllerSource.includes('recordTTSDebugEvent("audio_stale_skip"')
    && ttsPlaybackControllerSource.includes('recordTTSDebugEvent("browser_stale_skip"')
    && ttsPlaybackControllerSource.includes('recordTTSDebugEvent("speak_fallback_stale_skip"')
    && chatStateSource.includes("ttsContextBufferSource: null")
    && ttsPlaybackControllerSource.includes("state.ttsContextBufferSource.stop(0)"),
  "TTS playback should ignore stale audio and fallback from earlier chat turns"
);
assert.ok(
  /const requestedGeneration = Number\(opts\.playbackGeneration \|\| state\.ttsPlaybackGeneration \|\| 0\);[\s\S]*?if \(!isCurrentTTSPlaybackGeneration\(requestedGeneration\)\)[\s\S]*?stopAllAudioPlayback\(\);[\s\S]*?const playbackGeneration = Number\(state\.ttsPlaybackGeneration \|\| 0\);[\s\S]*?const browserTTSOptions = \{[\s\S]*?prosody: opts\.prosody \|\| null,[\s\S]*?voiceStyle: opts\.voiceStyle \|\| ""[\s\S]*?speakOnceWithVoice\(text, v, browserTTSOptions\)/.test(ttsPlaybackControllerSource),
  "browser TTS fallback should reject stale generations and carry prosody/style into each browser utterance"
);
assert.ok(
  chatStateSource.includes("ttsAudioPlaybackToken: 0")
    && ttsPlaybackControllerSource.includes("const audioPlaybackToken = Number(state.ttsAudioPlaybackToken || 0) + 1")
    && ttsPlaybackControllerSource.includes("function speakOnceWithVoice(text, voice, opts = {})")
    && ttsPlaybackControllerSource.includes("const force = typeof opts === \"object\" ? !!opts.force : !!opts")
    && ttsPlaybackControllerSource.includes("const isCurrentHtmlAudioPlayback = () => ("),
  "HTMLAudio and browser TTS paths should keep per-playback ownership guards"
);
assert.ok(
  /const streamSpeakSession = Date\.now\(\);[\s\S]*?const useStreamSpeak = shouldUseStreamSpeak\(\);[\s\S]*?stopAllAudioPlayback\(\);[\s\S]*?state\.streamSpeakSession = streamSpeakSession;/.test(chatReplyControllerSource),
  "starting a new assistant request should always invalidate previous audio playback"
);
assert.ok(
  source.includes("function stripAssistantPayloadNoise(text)")
    && runtimeMetadataControllerSource.includes("SPEECH_TEXT.stripAssistantPayloadNoise")
    && speechTextSource.includes("function looksLikeEmptyAssistantTextWrapperFragment(text)")
    && speechTextSource.includes("function looksLikeAssistantTextWrapperFragment(text)")
    && speechTextSource.includes("function extractAssistantPayloadText(text)")
    && speechTextSource.includes("function extractAssistantTextFromJsonLike(text)")
    && source.includes("stripAssistantPayloadNoise(src)"),
  "assistant message rendering should delegate half-open JSON wrapper cleanup to the shared speech text module"
);
assert.ok(
  source.includes("function _looksLikeBadChatTranslation(source, translated)")
    && chatTranslationServiceSource.includes("invalid_translation")
    && chatTranslationServiceSource.includes("looksLikeBadTranslation(text, value)"),
  "assistant translation should reject model answers before caching or rendering them as translations"
);
assert.ok(
  /if \(degraded \|\| badTranslation\) \{[\s\S]*?if \(!badTranslation\) \{[\s\S]*?markFailure\(\);/.test(chatTranslationServiceSource),
  "invalid model-answer translations should not open the frontend translation circuit"
);

console.log("Character runtime frontend checks passed.");
