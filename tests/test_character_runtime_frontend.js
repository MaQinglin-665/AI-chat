#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const assert = require("assert");

const CHAT_JS = path.resolve(__dirname, "..", "web", "chat.js");
const INDEX_HTML = path.resolve(__dirname, "..", "web", "index.html");
const BASE_CSS = path.resolve(__dirname, "..", "web", "base.css");
const CHARACTER_RUNTIME_JS = path.resolve(__dirname, "..", "web", "characterRuntime.js");
const CHARACTER_TUNING_JS = path.resolve(__dirname, "..", "web", "characterTuning.js");
const DOCTOR_DIAGNOSTICS_JS = path.resolve(__dirname, "..", "web", "doctorDiagnostics.js");
const CHARACTER_REPLY_CUE_JS = path.resolve(__dirname, "..", "web", "characterReplyCue.js");
const TTS_DEBUG_REPORT_JS = path.resolve(__dirname, "..", "web", "ttsDebugReport.js");
const TRANSLATE_DEBUG_REPORT_JS = path.resolve(__dirname, "..", "web", "translateDebugReport.js");
const MEMORY_DEBUG_REPORT_JS = path.resolve(__dirname, "..", "web", "memoryDebugReport.js");
const TOOL_META_VIEW_JS = path.resolve(__dirname, "..", "web", "toolMetaView.js");
const LOCAL_COMMAND_REGISTRY_JS = path.resolve(__dirname, "..", "web", "localCommandRegistry.js");
const GRAY_TRIAL_READINESS_MODEL_JS = path.resolve(__dirname, "..", "web", "grayTrialReadinessModel.js");
const GRAY_TRIAL_CHARACTER_MODEL_JS = path.resolve(__dirname, "..", "web", "grayTrialCharacterModel.js");
const GRAY_TRIAL_AUTO_RUNTIME_SWITCH_MODEL_JS = path.resolve(__dirname, "..", "web", "grayTrialAutoRuntimeSwitchModel.js");
const FOLLOWUP_READINESS_VIEW_JS = path.resolve(__dirname, "..", "web", "followupReadinessView.js");
const GRAY_TRIAL_CHARACTER_VIEW_JS = path.resolve(__dirname, "..", "web", "grayTrialCharacterView.js");
const source = fs.readFileSync(CHAT_JS, "utf8");
const indexSource = fs.readFileSync(INDEX_HTML, "utf8");
const baseCssSource = fs.readFileSync(BASE_CSS, "utf8");
const tuningSource = fs.readFileSync(CHARACTER_TUNING_JS, "utf8");
const doctorSource = fs.readFileSync(DOCTOR_DIAGNOSTICS_JS, "utf8");
const replyCueSource = fs.readFileSync(CHARACTER_REPLY_CUE_JS, "utf8");
const ttsDebugSource = fs.readFileSync(TTS_DEBUG_REPORT_JS, "utf8");
const translateDebugSource = fs.readFileSync(TRANSLATE_DEBUG_REPORT_JS, "utf8");
const memoryDebugSource = fs.readFileSync(MEMORY_DEBUG_REPORT_JS, "utf8");
const toolMetaViewSource = fs.readFileSync(TOOL_META_VIEW_JS, "utf8");
const localCommandRegistrySource = fs.readFileSync(LOCAL_COMMAND_REGISTRY_JS, "utf8");
const grayTrialReadinessModelSource = fs.readFileSync(GRAY_TRIAL_READINESS_MODEL_JS, "utf8");
const grayTrialCharacterModelSource = fs.readFileSync(GRAY_TRIAL_CHARACTER_MODEL_JS, "utf8");
const grayTrialAutoRuntimeSwitchModelSource = fs.readFileSync(GRAY_TRIAL_AUTO_RUNTIME_SWITCH_MODEL_JS, "utf8");
const followupReadinessViewSource = fs.readFileSync(FOLLOWUP_READINESS_VIEW_JS, "utf8");
const grayTrialCharacterViewSource = fs.readFileSync(GRAY_TRIAL_CHARACTER_VIEW_JS, "utf8");
const runtime = require(CHARACTER_RUNTIME_JS);
const tuning = require(CHARACTER_TUNING_JS);
const doctorDiagnostics = require(DOCTOR_DIAGNOSTICS_JS);
const replyCue = require(CHARACTER_REPLY_CUE_JS);
const ttsDebugReport = require(TTS_DEBUG_REPORT_JS);
const translateDebugReport = require(TRANSLATE_DEBUG_REPORT_JS);
const memoryDebugReport = require(MEMORY_DEBUG_REPORT_JS);
const toolMetaView = require(TOOL_META_VIEW_JS);
const localCommandRegistry = require(LOCAL_COMMAND_REGISTRY_JS);
const grayTrialReadinessModel = require(GRAY_TRIAL_READINESS_MODEL_JS);
const grayTrialCharacterModel = require(GRAY_TRIAL_CHARACTER_MODEL_JS);
const grayTrialAutoRuntimeSwitchModel = require(GRAY_TRIAL_AUTO_RUNTIME_SWITCH_MODEL_JS);
const followupReadinessView = require(FOLLOWUP_READINESS_VIEW_JS);
const grayTrialCharacterView = require(GRAY_TRIAL_CHARACTER_VIEW_JS);

function toPlainObject(value) {
  return JSON.parse(JSON.stringify(value));
}

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
      assistant_prompt: "不要使用 Markdown、编号列表、标题或项目符号。默认只回复1到3句。"
    },
    candidate: { textPreview: "测试", mood: "happy", runtimeHint: { emotion: "happy", action: "happy_idle", voice_style: "cheerful" } },
    autoApply: { applied: true, voiceStyle: "cheerful", runtimeHint: { emotion: "happy", action: "happy_idle", voice_style: "cheerful" } },
    feedback: { rating: "good", label: "表现不错", emotion: "happy", action: "happy_idle", voiceStyle: "cheerful" },
    ttsProvider: "gpt_sovits",
    speechMotionStrength: 1.35,
    expressionStrength: 1
  }).includes("可检查配置项"),
  "character tuning helper should build a readable report with config keys"
);
assert.ok(
  doctorDiagnostics.buildReport({
    checks: [{ label: "后端健康", ok: true, elapsedMs: 10, detail: "本地服务响应正常。" }],
    runtimeConfig: { enabled: true, return_metadata: true, auto_apply_reply_cue: true },
    ttsProvider: "gpt_sovits",
    streamEnabled: false,
    speakingEnabled: true
  }).includes("链路自检完成：核心功能正常。"),
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
    text: "好！",
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
    memory: {
      enabled: true,
      memory_count: 2,
      last_selection: {
        reason: "explicit",
        selected: [{ source: "memory", user: "u", assistant: "a" }]
      }
    },
    learning: {
      degraded_mode: true,
      diagnostics: {
        degraded_reason: "low_signal",
        health_windows: [{ avg_confidence: 0.5, candidate_in_rate: 1, signal_coverage: 0.8 }]
      }
    }
  }).includes("Learning health windows:"),
  "memory debug helper should build a readable learning health report"
);
assert.strictEqual(
  toolMetaView.getToolCardSummary({
    ok: true,
    tool: "run_command",
    args: { command: "node --check web/chat.js" },
    exit_code: 0
  }),
  "node --check web/chat.js · 退出码 0",
  "tool meta view helper should build readable command summaries"
);
assert.strictEqual(
  toolMetaView.getToolCardTitle({ tool: "search_text" }),
  "文本搜索",
  "tool meta view helper should localize tool card titles"
);
assert.strictEqual(
  localCommandRegistry.matchLocalCommand("/ttsdebug").kind,
  "tts_debug",
  "local command registry should match TTS debug commands"
);
assert.strictEqual(
  localCommandRegistry.matchLocalCommand("/translatedebug on").kind,
  "translate_debug_on",
  "local command registry should match translation debug panel commands"
);
assert.strictEqual(
  localCommandRegistry.matchLocalCommand("/testvoice").kind,
  "voice_test",
  "local command registry should match voice test aliases"
);
assert.strictEqual(
  localCommandRegistry.matchLocalCommand("/提醒 10m 喝水").kind,
  "reminder_add",
  "local command registry should match reminder prefix commands"
);
assert.ok(
  followupReadinessView.buildBackendEntryCardText({
    loaded: true,
    readOnly: true,
    skeletonOnly: true,
    defaultOffBaseline: true,
    explicitEnableRequired: true,
    blockedReasons: [],
    guardContractRequiredChecks: [],
    guardContractDisallowedActions: [],
    guardContractRollbackSteps: [],
    previewBlockedReasons: []
  }).includes("后端入口摘要（只读）"),
  "follow-up readiness helper should build backend entry card text"
);
assert.strictEqual(
  followupReadinessView.getManualConfirmationStatusLabel("available"),
  "可确认",
  "follow-up readiness helper should localize manual confirmation state"
);
assert.ok(
  followupReadinessView.buildPreviewOneLineText({
    scenarioLabel: "测试",
    characterLabel: "刚聊完",
    characterMood: "calm",
    policy: "soft",
    tone: "idle",
    selectedIndex: 0,
    blocked: "none",
    candidateText: "我在。"
  }).includes("line=我在。"),
  "follow-up readiness helper should build copyable one-line previews"
);
assert.strictEqual(
  followupReadinessView.buildManualConfirmationKey({
    topicHint: " topic ",
    policy: "soft",
    candidateText: " hello "
  }),
  "topic::soft::hello",
  "follow-up readiness helper should build stable manual confirmation keys"
);
assert.ok(
  followupReadinessView.buildGrayAutoTrialTimelineText({
    total: 1,
    hasArm: true,
    hasTriggerSuccess: false,
    hasStop: false,
    hasDisarm: false,
    entries: [{ seq: 1, category: "control", stage: "conversation_followup_gray_auto_trial_armed" }]
  }).includes("灰度试运行时间线（只读）"),
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
  grayTrialCharacterView.buildCharacterCuePreviewText({
    decision: "NO_GO",
    outcome: "not_started",
    label: "先安静待着",
    mood: "idle",
    tone: "quiet",
    description: "保持安静",
    sample: "我先安静待着。",
    runtimeHint: { emotion: "neutral", action: "none", intensity: "low", voice_style: "neutral", live2d_hint: "quiet" },
    stageRecommendation: "Not ready",
    nextAction: "Keep preview-only"
  }).includes("灰度试运行角色表现预览（只读）"),
  "gray trial character helper should build character cue preview text"
);
assert.ok(
  grayTrialCharacterView.buildAutoRuntimeDryRunText({
    status: "blocked",
    wouldSelectRule: true,
    selectedRuleKey: "watch_only_observe",
    planStatus: "blocked_for_auto_runtime",
    goNoGo: "NO_GO_FOR_AUTOMATIC_RUNTIME",
    runtimeHint: { emotion: "thinking", action: "think", intensity: "low", voice_style: "neutral", live2d_hint: "thinking" },
    blockedReasons: ["strategy_review_not_ready"],
    nextAction: "Keep disabled"
  }).includes("自动角色表现 dry-run"),
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
  source.includes("window.TaffyCharacterRuntime"),
  "chat.js should use the extracted Character Runtime helper"
);
assert.ok(
  source.includes("async function previewGrayAutoTrialCharacterCueBackendBridge")
    && source.includes('authFetch("/api/character_runtime/backend_entry/preview"')
    && source.includes("backend_preview_noop_confirmed"),
  "manual character cue bridge should run through the backend preview/no-op adapter before emitting"
);
assert.ok(
  source.includes("async function emitGrayAutoTrialCharacterCueViaManualBridge")
    && source.includes("emitGrayAutoTrialCharacterCueManually({")
    && source.includes("grayAutoFollowupTrialCharacterCueBackendBridgePreview"),
  "manual character cue bridge should keep an explicit debug entry point and reuse the existing manual emit path"
);
assert.ok(
  replyCueSource.includes("const GRAY_AUTO_TRIAL_CHARACTER_CUE_PRESETS")
    && replyCueSource.includes("happy_wave")
    && source.includes("CHARACTER_REPLY_CUE.listGrayAutoTrialCharacterCuePresets")
    && source.includes("trialCharacterCuePreset")
    && source.includes("grayAutoFollowupTrialCharacterCuePresets"),
  "manual character cue bridge should expose explicit safe presets without automatic runtime scheduling"
);
assert.ok(
  source.includes("resolveGrayAutoTrialCharacterCuePreset")
    && source.includes("presetKey: getSelectedGrayAutoTrialCharacterCuePresetKey()")
    && grayTrialCharacterViewSource.includes("manualCuePreset="),
  "manual character cue emits should record the selected preset in status and recap"
);
assert.ok(
  source.includes("function buildGrayAutoTrialCharacterManualCueStatusCardText")
    && source.includes("followupReadinessTrialCharacterManualCueStatusCard")
    && source.includes("updateGrayAutoTrialCharacterManualCueStatusCard()")
    && grayTrialCharacterViewSource.includes("backendPreview=")
    && grayTrialCharacterViewSource.includes("live2dApply="),
  "manual character cue panel should expose a dedicated read-only status card"
);
assert.ok(
  source.includes("function buildAssistantReplyCharacterCueCandidate")
    && replyCueSource.includes("function buildAssistantReplyCharacterCueCandidate")
    && source.includes("previewAssistantReplyCharacterCueCandidate({")
    && source.includes("conversation_followup_character_reply_cue_candidate")
    && grayTrialCharacterViewSource.includes("replyCueCandidate="),
  "assistant replies should create a read-only character cue candidate without emitting it"
);
assert.ok(
  source.includes("characterRuntimeAutoApplyReplyCue")
    && source.includes("auto_apply_reply_cue")
    && source.includes("function maybeAutoApplyAssistantReplyCharacterCueCandidate")
    && source.includes("conversation_followup_character_reply_cue_candidate_auto_apply")
    && replyCueSource.includes("runtimeVoiceStyleToTalkStyle")
    && source.includes("speechStyle"),
  "assistant reply cue candidates should support an explicit default-off auto-apply path into runtime dispatch and TTS style"
);
assert.ok(
  source.includes("function buildReplyCharacterChipView")
    && replyCueSource.includes("function buildReplyCharacterChipView")
    && source.includes("function updateReplyCharacterChip")
    && source.includes("localizeReplyCharacterValue")
    && replyCueSource.includes("上一句角色表现 · 待回复")
    && source.includes("updateReplyCharacterChip(candidate, result)")
    && source.includes("ui.replyCharacterChip")
    && indexSource.includes('id="reply-character-chip"')
    && baseCssSource.includes(".reply-character-chip[data-tone=\"applied\"]"),
  "assistant reply runtime cue should surface a readable last-reply character chip in the chat header"
);
assert.ok(
  source.includes("chatStreamEnabled")
    && source.includes("chat_stream_enabled")
    && source.includes("preferStream: state.conversationMode.chatStreamEnabled !== false"),
  "chat requests should support a frontend-visible switch for disabling unstable LLM streaming"
);
assert.ok(
  source.includes('label: "刚聊完"')
    && source.includes('description: "刚刚完成一轮对话，先安静待机，不打断用户。"')
    && source.includes('"刚聊完": "idle"'),
  "follow-up chip should show a calm idle state after normal replies instead of looking stuck in thinking"
);
assert.ok(
  source.includes("async function runDoctorDiagnostics()")
    && localCommandRegistrySource.includes('kind: "doctor"')
    && localCommandRegistry.matchLocalCommand("/doctor").kind === "doctor"
    && localCommandRegistry.matchLocalCommand("/自检").kind === "doctor"
    && source.includes('runDoctorJsonFetch("/api/health"')
    && source.includes('"聊天模型"')
    && source.includes('"语音服务"')
    && source.includes("requestServerTTSBlob(")
    && source.includes("window.TaffyDoctorDiagnostics.buildReport")
    && doctorSource.includes("function buildAdvice")
    && doctorSource.includes("链路自检完成：核心功能正常。")
    && doctorSource.includes("下一步建议")
    && doctorSource.includes("GPT-SoVITS 异常")
    && doctorSource.includes("当前已关闭流式聊天")
    && source.includes("runDoctorAndAppendReport()")
    && source.includes('row?.classList?.add("doctor-report")')
    && source.includes("ui.doctorBtn")
    && indexSource.includes('id="doctor-btn"')
    && indexSource.includes('<script src="./characterReplyCue.js"></script>')
    && indexSource.includes('<script src="./doctorDiagnostics.js"></script>')
    && source.includes("ui.voiceTestBtn")
    && indexSource.includes('id="voice-test-btn"')
    && baseCssSource.includes(".message.assistant.doctor-report .content"),
  "chat.js should expose a local /doctor self-check for LLM, TTS, config, and character runtime diagnostics"
);
assert.ok(
  indexSource.includes("先做链路自检，再聊一句，最后测试语音和开麦。")
    && indexSource.includes("更多 → 链路自检")
    && indexSource.includes("更多 → 测试语音")
    && indexSource.includes("调角色味道")
    && indexSource.includes("更多 → 角色试演")
    && indexSource.includes("表现不错")
    && indexSource.includes("角色调优")
    && indexSource.includes("/ttsdebug")
    && indexSource.includes("更多 → 人设卡"),
  "help modal should guide non-technical users through self-check, chat, voice, persona setup, and character tuning"
);
assert.ok(
  source.includes("async function runVoiceTestAndAppendReport()")
    && localCommandRegistrySource.includes('kind: "voice_test"')
    && localCommandRegistry.matchLocalCommand("/testvoice").kind === "voice_test"
    && source.includes("ui.voiceTestBtn")
    && source.includes("语音测试没有成功"),
  "voice test should be available both as a visible button and as a local command"
);
assert.ok(
  tuningSource.includes("CHARACTER_REHEARSAL_PRESETS")
    && source.includes("CHARACTER_TUNING.getRehearsalPreset")
    && source.includes("async function runCharacterRehearsalAndAppendReport()")
    && localCommandRegistrySource.includes('kind: "character_rehearsal"')
    && localCommandRegistry.matchLocalCommand("/roletest").kind === "character_rehearsal"
    && source.includes("ui.characterRehearsalBtn")
    && indexSource.includes('id="character-rehearsal-btn"')
    && source.includes("角色试演的语音没有成功"),
  "character rehearsal should be available as a visible button and local command to test runtime expression and voice styles without LLM"
);
assert.ok(
  tuningSource.includes("function buildTuningReport")
    && source.includes("function buildCharacterTuningReport()")
    && source.includes("function runCharacterTuningAndAppendReport()")
    && tuningSource.includes("function addConfigKey")
    && localCommandRegistrySource.includes('kind: "character_tuning"')
    && localCommandRegistry.matchLocalCommand("/tuning").kind === "character_tuning"
    && source.includes("ui.characterTuningBtn")
    && indexSource.includes('id="character-tuning-btn"')
    && indexSource.includes('<script src="./characterTuning.js"></script>')
    && tuningSource.includes("角色调优建议")
    && tuningSource.includes("可检查配置项")
    && tuningSource.includes("tts.gpt_sovits_ref_audio_path")
    && tuningSource.includes("motion.speech_motion_strength"),
  "character tuning should expose readable next-step advice and concrete config keys based on the latest runtime cue"
);
assert.ok(
  tuningSource.includes("function buildFeedbackMessage")
    && source.includes("function recordCharacterPerformanceFeedback")
    && source.includes("characterPerformanceLastFeedback")
    && localCommandRegistry.matchLocalCommand("/goodcue").kind === "character_feedback_good"
    && localCommandRegistry.matchLocalCommand("/badcue").kind === "character_feedback_bad"
    && source.includes("ui.characterFeedbackGoodBtn")
    && source.includes("ui.characterFeedbackBadBtn")
    && indexSource.includes('id="character-feedback-good-btn"')
    && indexSource.includes('id="character-feedback-bad-btn"')
    && tuningSource.includes("最近反馈"),
  "character tuning should include lightweight local feedback for the latest runtime performance"
);
assert.ok(
  tuningSource.includes("function buildWorkflowGuide()")
    && source.includes("function buildCharacterWorkflowGuide()")
    && source.includes("function appendCharacterWorkflowGuide()")
    && localCommandRegistrySource.includes('kind: "character_workflow"')
    && localCommandRegistry.matchLocalCommand("/roleflow").kind === "character_workflow"
    && tuningSource.includes("角色闭环测试流程"),
  "chat should expose a readable local character workflow guide"
);
assert.ok(
  source.includes("function buildChatFailureDoctorHint(err)")
    && doctorSource.includes("更多 → 链路自检")
    && doctorSource.includes("输入 /doctor")
    && source.includes("const msg = buildChatFailureDoctorHint(err);"),
  "chat failures should point users to the visible Doctor self-check instead of leaving raw errors alone"
);
assert.ok(
  source.includes("function buildAssistantReplyCharacterExpressionCue")
    && replyCueSource.includes("function buildAssistantReplyCharacterExpressionCue")
    && replyCueSource.includes('reason: "warm_or_playful"')
    && replyCueSource.includes('action: "happy_idle"')
    && replyCueSource.includes('reason: "question_or_surprise"')
    && replyCueSource.includes('action: "think"')
    && source.includes("expressionReason"),
  "assistant reply cue candidates should map reply mood/style into concrete allowlisted expression metadata"
);
assert.ok(
  source.includes("grayAutoFollowupTrialCharacterReplyCueCandidate")
    && replyCueSource.includes("noRuntimeCueEmission: true")
    && replyCueSource.includes("noLive2DMove: true"),
  "reply cue candidate debug API should stay preview-only and safe"
);
assert.ok(
  source.includes("async function emitLastReplyCharacterCueCandidateViaManualBridge")
    && source.includes("SEND_REPLY_CHARACTER_CUE_CANDIDATE")
    && source.includes("conversation_followup_character_reply_cue_candidate_manual_emit")
    && source.includes("emitGrayAutoFollowupTrialCharacterReplyCueCandidateViaManualBridge"),
  "reply cue candidates should have a separate manual-only bridge with an explicit confirmation phrase"
);
assert.ok(
  /async function emitLastReplyCharacterCueCandidateViaManualBridge[\s\S]*?previewGrayAutoTrialCharacterCueBackendBridge[\s\S]*?handleCharacterRuntimeMetadata\(candidate\.runtimeHint\)/.test(source),
  "reply cue candidate manual sends should pass backend preview/no-op before using the local runtime cue path"
);
assert.ok(
  /function buildGrayAutoTrialCharacterCueManualEmitRecap[\s\S]*?conversation_followup_character_reply_cue_candidate_manual_emit[\s\S]*?replyCandidateSent/.test(source)
    && grayTrialCharacterViewSource.includes("replyCueCandidate=")
    && grayTrialCharacterViewSource.includes("emotion:${candidate.runtimeHint?.emotion")
    && grayTrialCharacterViewSource.includes("backendBridge=ok:"),
  "manual cue recap should include reply candidate sends, backend no-op status, and candidate sent state"
);
assert.ok(
  source.includes("followupCharacterRuntimeLastDispatch")
    && source.includes("window.__AI_CHAT_LAST_CHARACTER_RUNTIME_DISPATCH__")
    && grayTrialCharacterViewSource.includes("runtimeDispatch=local:"),
  "manual character cue feedback should expose local dispatch and model broadcast status"
);
assert.ok(
  source.includes("followupCharacterRuntimeLastApply")
    && source.includes("window.__AI_CHAT_LAST_CHARACTER_RUNTIME_APPLY__")
    && grayTrialCharacterViewSource.includes("runtimeApply=emotion:"),
  "manual character cue feedback should expose Live2D apply diagnostics without adding automatic triggers"
);
assert.ok(
  /const advancedLocalActions = createFollowupReadinessCollapsibleActionGroup[\s\S]*trialEmitCharacter[\s\S]*trialSendReplyCueCandidate[\s\S]*\]\);/.test(source),
  "manual character cue buttons should remain inside the collapsed high-risk local action group"
);
assert.ok(
  source.includes("function updateReplyCharacterCueCandidateManualSendButton")
    && source.includes("followupReadinessTrialSendReplyCueCandidateBtn")
    && source.includes("button.disabled = !available")
    && source.includes("candidate tone=${candidate.tone")
    && source.includes("updateReplyCharacterCueCandidateManualSendButton();"),
  "reply cue candidate send button should stay disabled until a concrete candidate is available"
);
assert.ok(
  /async function handleReplyCharacterCueCandidateManualSendClick[\s\S]*?finally \{[\s\S]*?updateReplyCharacterCueCandidateManualSendButton\(\);[\s\S]*?button\.blur\(\);/.test(source)
    && !/async function handleReplyCharacterCueCandidateManualSendClick[\s\S]*?finally \{[\s\S]*?button\.disabled = false;/.test(source),
  "reply cue candidate manual send should restore button state through the availability guard"
);
assert.ok(
  source.includes("function finishSpeechAnimation()"),
  "natural speech completion should keep a release helper"
);
assert.ok(
  /function finishSpeechAnimation\(\)\s*\{[\s\S]*?state\.speechAnimUntil\s*=\s*now\s*\+\s*releaseMs;/.test(source),
  "natural speech completion should shorten the mouth animation to a release window"
);
assert.ok(
  source.includes("ttsAudioRawLevel: 0"),
  "speech animation should keep raw audio level state for audio-driven mouth shapes"
);
assert.ok(
  /state\.ttsAudioAnalyser\.smoothingTimeConstant\s*=\s*0\.12;/.test(source),
  "TTS audio analyser should react quickly enough for mouth closures"
);
assert.ok(
  /const hasLiveAudio\s*=\s*audioPlaying && !!state\.ttsAudioAnalyser;/.test(source),
  "mouth animation should prefer live audio when an analyser is available"
);
assert.ok(
  /if \(hasLiveAudio\) \{[\s\S]*?const voiced = rawLevel > 0\.035[\s\S]*?target = 0;[\s\S]*?state\.speechMouthOpen = 0;[\s\S]*?return state\.speechMouthOpen;/.test(source),
  "live audio mouth path should close quickly when voice energy drops"
);
assert.ok(
  source.includes("const closureDip = clampNumber(closureGate")
    && source.includes("const rhythmGate = clampNumber")
    && source.includes("const closureCap = clampNumber"),
  "live audio mouth path should add rhythmic closure dips during fast speech"
);
assert.ok(
  source.includes("voiceRecent = now - Number(state.ttsAudioLastVoiceAt || 0) < 58")
    && source.includes("0.62 + visemeOpen * 0.48 - closureDip")
    && source.includes("0.045 + liveLevel * 0.16 + rawLevel * 0.1"),
  "fast live audio mouth path should keep closure valleys visible"
);
assert.ok(
  source.includes("const _translationInFlight = new Map();"),
  "chat and subtitle translations should share in-flight requests"
);
assert.ok(
  source.includes("function _normalizeChatTranslationKey(text)")
    && source.includes("_translationInFlight.get(cacheKey)")
    && source.includes("_translationInFlight.set(cacheKey, task)"),
  "chat translation cache/in-flight keys should normalize punctuation spacing variants"
);
assert.ok(
  /async function _fetchTranslation\(text, capturedId\)\s*\{[\s\S]*?_readChatTranslationCache\(safe\)[\s\S]*?_fetchChatTranslation\(safe\)/.test(source),
  "subtitle translation should reuse the chat translation cache/request path"
);
assert.ok(
  source.includes("function normalizeAssistantVisibleText(text)")
    && source.includes("const visibleReply = normalizeAssistantVisibleText(parsedReply.visibleText);"),
  "final assistant text should normalize English sentence boundaries before display and translation"
);
assert.ok(
  /function stripAssistantPayloadNoise\(text\)\s*\{[\s\S]*?SPEECH_TEXT\.stripAssistantPayloadNoise/.test(source),
  "chat visible text cleanup should reuse the shared speech metadata guard"
);
assert.ok(
  source.includes('translationEl.textContent = "中译：翻译中...";'),
  "assistant messages should show an immediate translation placeholder"
);
assert.ok(
  source.includes("const _CHAT_TRANSLATE_TIMEOUT_MS = 60000;"),
  "assistant translation should allow slow local LLM translation to finish"
);
assert.ok(
  source.includes('translationEl.textContent = "中译：翻译暂时不可用";'),
  "assistant messages should show a visible translation failure instead of disappearing"
);
assert.ok(
  /utterance\.onend\s*=\s*\(\)\s*=>\s*\{[\s\S]*?finishSpeechAnimation\(\);[\s\S]*?resolve\(true\);[\s\S]*?\};/.test(source),
  "browser TTS success should use graceful speech release"
);
assert.ok(
  /utterance\.onerror\s*=\s*\(\)\s*=>\s*\{[\s\S]*?endSpeechAnimation\(\);[\s\S]*?resolve\(false\);[\s\S]*?\};/.test(source),
  "browser TTS failure should still hard-stop speech animation"
);
assert.ok(
  /const done = \(ok\) => \{[\s\S]*?if \(ok\) \{[\s\S]*?finishSpeechAnimation\(\);[\s\S]*?\} else \{[\s\S]*?endSpeechAnimation\(\);[\s\S]*?\}[\s\S]*?resolve\(ok\);[\s\S]*?\};/.test(source),
  "server TTS completion should release on success and hard-stop on failure"
);
assert.ok(
  /progressTimer\s*=\s*window\.setInterval\(async \(\) => \{[\s\S]*?performance\.now\(\) - lastProgressAt < 2800[\s\S]*?playAudioByContext\(blob,\s*debugContext\)/.test(source),
  "server TTS should fall back when HTML audio stops advancing"
);
assert.ok(
  /fallbackTimer\s*=\s*window\.setTimeout\(resolveOnce,[\s\S]*?durationMs \+ 900/.test(source),
  "AudioContext fallback should not leave speaking state stuck if onended is missed"
);
assert.ok(
  source.includes("function hasQueuedStreamSpeakItem(sessionId)"),
  "stream speech queue should be able to detect queued tail segments"
);
assert.ok(
  source.includes("function ensureStreamSpeakQueueRunning(sessionId")
    && source.includes("stream_run_handoff")
    && source.includes("ensureStreamSpeakQueueRunning(sessionId, 0);"),
  "stream speech queue should hand off to a newer session after an older runner exits"
);
assert.ok(
  /function dequeueStreamSpeakItem\(sessionId\)\s*\{[\s\S]*?for \(let i = 0; i < state\.streamSpeakQueue\.length; i \+= 1\)[\s\S]*?item\.sessionId !== sessionId[\s\S]*?continue;[\s\S]*?state\.streamSpeakQueue\.splice\(i, 1\);[\s\S]*?return item;/.test(source),
  "stream speech dequeue should not drop queued items from newer sessions"
);
assert.ok(
  source.includes("function shouldSerializeStreamTTSRequests()")
    && source.includes('state.ttsProvider === "gpt_sovits"')
    && source.includes("if (!shouldSerializeStreamTTSRequests())")
    && source.includes("provider: state.ttsProvider || \"\""),
  "GPT-SoVITS realtime stream speech should serialize eager requests and use provider-aware segmentation"
);
assert.ok(
  source.includes("stream_speak_idle_wait_ms")
    && source.includes("state.streamSpeakIdleWaitMs = Number.isFinite(streamIdleWaitCfg)")
    && source.includes("Math.max(30, Math.min(220, Number(state.streamSpeakIdleWaitMs) || 90))"),
  "stream speech queue should support a shorter configurable idle wait"
);
assert.ok(
  source.includes("gpt_sovits_timeout_sec")
    && source.includes("sovitsTimeoutMs")
    && source.includes("Math.min(90000")
    && source.includes("state.ttsServerRequestTimeoutMs"),
  "GPT-SoVITS frontend request timeout should follow backend timeout config"
);
assert.ok(
  source.includes("streamSpeakWorkingSession: 0")
    && source.includes("stream_run_clear_stale_busy")
    && source.includes("state.streamSpeakWorkingSession = activeSession"),
  "new realtime TTS sessions should not be blocked by stale stream runners"
);
assert.ok(
  /current\s*=\s*next\s*\|\|\s*await waitNextStreamSpeakItem\([\s\S]*?state\.chatBusy \? idleWaitMs : 180/.test(source),
  "stream speech queue should re-check for tail segments after each audio segment plays"
);
assert.ok(
  /finally \{[\s\S]*?state\.streamSpeakWorking = false;[\s\S]*?hasQueuedStreamSpeakItem\(activeSession\)[\s\S]*?runStreamSpeakQueue\(\)/.test(source),
  "stream speech queue should restart itself if a segment arrived while it was finishing"
);
assert.ok(
  source.includes("streamSpeakPlayedSession: 0")
    && source.includes("function scheduleFinalSpeechWatchdog")
    && source.includes("final_watchdog_tts")
    && source.includes("scheduleFinalSpeechWatchdog({"),
  "final replies should have a watchdog fallback if realtime stream speech never starts playback"
);
assert.ok(
  source.includes("function discardQueuedStreamSpeakItems(sessionId)")
    && source.includes('recordTTSDebugEvent("final_direct_tts"')
    && source.includes("no_stream_playback_yet")
    && source.includes("state.streamSpeakLastEnqueueSession = 0;"),
  "short final replies should use direct TTS if no realtime stream segment has started playback"
);
assert.ok(
  source.includes("function buildTTSDebugReport()")
    && source.includes("window.TaffyTTSDebugReport?.buildReport")
    && ttsDebugSource.includes("function buildReport")
    && ttsDebugSource.includes("recentEvents=")
    && indexSource.includes('<script src="./ttsDebugReport.js"></script>'),
  "chat.js should expose a TTS debug report for voice playback diagnosis"
);
assert.ok(
  source.includes("function buildTranslateDebugReport()")
    && source.includes("window.TaffyTranslateDebugReport?.buildReport")
    && translateDebugSource.includes("function buildReport")
    && translateDebugSource.includes("Translation debug:")
    && indexSource.includes('<script src="./translateDebugReport.js"></script>'),
  "chat.js should delegate translation debug report rendering into the extracted helper"
);
assert.ok(
  source.includes("function buildMemoryDebugReport(")
    && source.includes("window.TaffyMemoryDebugReport?.buildReport")
    && memoryDebugSource.includes("function buildReport")
    && memoryDebugSource.includes("Learning health windows:")
    && indexSource.includes('<script src="./memoryDebugReport.js"></script>'),
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
    && source.includes("FOLLOWUP_READINESS_VIEW.buildBackendEntryCardText")
    && source.includes("FOLLOWUP_READINESS_VIEW.buildPreviewOneLineText")
    && source.includes("const GRAY_TRIAL_READINESS_MODEL = window.TaffyGrayTrialReadinessModel")
    && source.includes("GRAY_TRIAL_READINESS_MODEL.buildTimeline")
    && grayTrialReadinessModelSource.includes("function buildGoNoGoDecision")
    && followupReadinessViewSource.includes("function buildGrayAutoTrialStatusCardText")
    && followupReadinessViewSource.includes("function buildGrayAutoTrialSignoffPackageText")
    && followupReadinessViewSource.includes("灰度自动试运行状态卡（只读）")
    && indexSource.includes('<script src="./grayTrialReadinessModel.js"></script>')
    && indexSource.includes('<script src="./followupReadinessView.js"></script>'),
  "follow-up readiness cards should delegate pure text rendering into the extracted view helper"
);
assert.ok(
  source.includes("const GRAY_TRIAL_CHARACTER_VIEW = window.TaffyGrayTrialCharacterView")
    && source.includes("const GRAY_TRIAL_CHARACTER_MODEL = window.TaffyGrayTrialCharacterModel")
    && source.includes("const GRAY_TRIAL_AUTO_RUNTIME_SWITCH_MODEL = window.TaffyGrayTrialAutoRuntimeSwitchModel")
    && source.includes("GRAY_TRIAL_CHARACTER_MODEL.buildCharacterCuePreview")
    && source.includes("GRAY_TRIAL_CHARACTER_MODEL.buildExpressionStrategyDraft")
    && source.includes("GRAY_TRIAL_CHARACTER_MODEL.buildAutoRuntimeDryRun")
    && source.includes("GRAY_TRIAL_AUTO_RUNTIME_SWITCH_MODEL.buildExplicitSwitchPlan")
    && source.includes("GRAY_TRIAL_AUTO_RUNTIME_SWITCH_MODEL.buildFinalPreflight")
    && source.includes("GRAY_TRIAL_AUTO_RUNTIME_SWITCH_MODEL.buildSeparateImplementationDraft")
    && source.includes("GRAY_TRIAL_CHARACTER_VIEW.buildCharacterCuePreviewText")
    && source.includes("GRAY_TRIAL_CHARACTER_VIEW.buildCharacterCueManualEmitRecapText")
    && source.includes("GRAY_TRIAL_CHARACTER_VIEW.buildAutoRuntimeDryRunText")
    && source.includes("GRAY_TRIAL_CHARACTER_VIEW.buildSwitchControlDiagnosticsText")
    && source.includes("GRAY_TRIAL_CHARACTER_VIEW.buildSeparateImplementationDraftText")
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
    && grayTrialCharacterViewSource.includes("灰度试运行角色表现预览（只读）")
    && indexSource.includes('<script src="./grayTrialCharacterModel.js"></script>')
    && indexSource.includes('<script src="./grayTrialAutoRuntimeSwitchModel.js"></script>')
    && indexSource.includes('<script src="./grayTrialCharacterView.js"></script>'),
  "gray trial character cue cards should delegate pure text rendering into the extracted view helper"
);
assert.ok(
  source.includes("const LOCAL_COMMAND_REGISTRY = window.TaffyLocalCommandRegistry")
    && source.includes("LOCAL_COMMAND_REGISTRY.matchLocalCommand")
    && localCommandRegistry.matchLocalCommand("/ttsdebug").kind === "tts_debug"
    && localCommandRegistrySource.includes('kind: "tts_debug"')
    && indexSource.includes('<script src="./localCommandRegistry.js"></script>'),
  "local commands should include /ttsdebug for copyable playback state"
);
assert.ok(
  source.includes("function installTTSDebugBridge()"),
  "window debug bridge should expose TTS playback state to developer tools"
);
assert.ok(
  source.includes("window.TaffyTranslateDebugReport?.buildReport")
    && localCommandRegistry.matchLocalCommand("/translatedebug").kind === "translate_debug",
  "chat.js should expose /translatedebug for copyable translation timing state"
);
assert.ok(
  source.includes("window.TaffyMemoryDebugReport?.buildReport")
    && localCommandRegistry.matchLocalCommand("/memorydebug").kind === "memory_debug"
    && source.includes('learningFetchJson("/api/memory/debug")')
    && source.includes("learningTabDebug")
    && source.includes("learningDebugPanel")
    && memoryDebugSource.includes("learning.degradedReason=")
    && memoryDebugSource.includes("Learning health windows:"),
  "chat.js should expose memory/learning chain debug state"
);
assert.ok(
  source.includes('appendMessage("assistant", buildTranslateDebugReport(), { enableTranslation: false })')
    && source.includes('appendMessage("assistant", "Translation debug panel enabled.", { enableTranslation: false })'),
  "translation debug command responses should not recursively trigger assistant translation"
);
assert.ok(
  source.includes("function installTranslateDebugBridge()")
    && source.includes("__AI_CHAT_DEBUG_TRANSLATE__"),
  "window debug bridge should expose translation timing state to developer tools"
);
assert.ok(
  source.includes('recordTranslateDebugEvent("request_start"')
    && source.includes('recordTranslateDebugEvent("request_ok"')
    && source.includes('recordTranslateDebugEvent("cache_hit"'),
  "translation requests should record start, completion, and cache-hit events"
);
assert.ok(
  source.includes('recordTTSDebugEvent("audio_play_start"')
    && source.includes('recordTTSDebugEvent("audio_done"')
    && source.includes('function recordTTSAudioEvent(stage, audio, debugContext = {}, extra = {})')
    && source.includes('recordTTSAudioEvent("audio_waiting"')
    && source.includes('recordTTSAudioEvent("audio_stalled"'),
  "server audio playback should record start, completion, and HTMLAudioElement lifecycle events"
);
assert.ok(
  source.includes('recordTTSDebugEvent("stream_enqueue"')
    && source.includes('recordTTSDebugEvent("stream_request_ok"'),
  "stream speech queue should record enqueue and TTS request completion events"
);
assert.ok(
  source.includes("ttsPlaybackGeneration: 0")
    && source.includes("function isCurrentTTSPlaybackGeneration(generation)")
    && source.includes('recordTTSDebugEvent("audio_stale_skip"')
    && source.includes('recordTTSDebugEvent("browser_stale_skip"')
    && source.includes('recordTTSDebugEvent("speak_fallback_stale_skip"')
    && source.includes("ttsContextBufferSource: null")
    && source.includes("state.ttsContextBufferSource.stop(0)"),
  "TTS playback should ignore stale audio and fallback from earlier chat turns"
);
assert.ok(
  /const requestedGeneration = Number\(opts\.playbackGeneration \|\| state\.ttsPlaybackGeneration \|\| 0\);[\s\S]*?if \(!isCurrentTTSPlaybackGeneration\(requestedGeneration\)\)[\s\S]*?stopAllAudioPlayback\(\);[\s\S]*?const playbackGeneration = Number\(state\.ttsPlaybackGeneration \|\| 0\);[\s\S]*?const browserTTSOptions = \{[\s\S]*?prosody: opts\.prosody \|\| null,[\s\S]*?voiceStyle: opts\.voiceStyle \|\| ""[\s\S]*?speakOnceWithVoice\(text, v, browserTTSOptions\)/.test(source),
  "browser TTS fallback should reject stale generations and carry prosody/style into each browser utterance"
);
assert.ok(
  source.includes("ttsAudioPlaybackToken: 0")
    && source.includes("const audioPlaybackToken = Number(state.ttsAudioPlaybackToken || 0) + 1")
    && source.includes("function speakOnceWithVoice(text, voice, opts = {})")
    && source.includes("const force = typeof opts === \"object\" ? !!opts.force : !!opts")
    && source.includes("const isCurrentHtmlAudioPlayback = () => ("),
  "HTMLAudio and browser TTS paths should keep per-playback ownership guards"
);
assert.ok(
  /const streamSpeakSession = Date\.now\(\);[\s\S]*?const useStreamSpeak = shouldUseStreamSpeak\(\);[\s\S]*?stopAllAudioPlayback\(\);[\s\S]*?state\.streamSpeakSession = streamSpeakSession;/.test(source),
  "starting a new assistant request should always invalidate previous audio playback"
);
assert.ok(
  source.includes("function stripAssistantPayloadNoise(text)")
    && source.includes("function looksLikeEmptyAssistantTextWrapperFragment(text)")
    && source.includes("function looksLikeAssistantTextWrapperFragment(text)")
    && source.includes("function extractAssistantPayloadText(text)")
    && source.includes("function extractAssistantTextFromJsonLike(text)")
    && source.includes("stripAssistantPayloadNoise(src)"),
  "assistant message rendering should hide half-open JSON text wrappers before they reach the chat bubble"
);
assert.ok(
  source.includes("function _looksLikeBadChatTranslation(source, translated)")
    && source.includes("invalid_translation")
    && source.includes("_looksLikeBadChatTranslation(text, value)"),
  "assistant translation should reject model answers before caching or rendering them as translations"
);
assert.ok(
  /if \(degraded \|\| badTranslation\) \{[\s\S]*?if \(!badTranslation\) \{[\s\S]*?_markTranslationFailure\(\);/.test(source),
  "invalid model-answer translations should not open the frontend translation circuit"
);

console.log("Character runtime frontend checks passed.");
