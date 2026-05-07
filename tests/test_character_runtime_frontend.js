#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const assert = require("assert");

const CHAT_JS = path.resolve(__dirname, "..", "web", "chat.js");
const INDEX_HTML = path.resolve(__dirname, "..", "web", "index.html");
const BASE_CSS = path.resolve(__dirname, "..", "web", "base.css");
const CHARACTER_RUNTIME_JS = path.resolve(__dirname, "..", "web", "characterRuntime.js");
const source = fs.readFileSync(CHAT_JS, "utf8");
const indexSource = fs.readFileSync(INDEX_HTML, "utf8");
const baseCssSource = fs.readFileSync(BASE_CSS, "utf8");
const runtime = require(CHARACTER_RUNTIME_JS);

function toPlainObject(value) {
  return JSON.parse(JSON.stringify(value));
}

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
  source.includes("const GRAY_AUTO_TRIAL_CHARACTER_CUE_PRESETS")
    && source.includes("happy_wave")
    && source.includes("trialCharacterCuePreset")
    && source.includes("grayAutoFollowupTrialCharacterCuePresets"),
  "manual character cue bridge should expose explicit safe presets without automatic runtime scheduling"
);
assert.ok(
  source.includes("resolveGrayAutoTrialCharacterCuePreset")
    && source.includes("presetKey: getSelectedGrayAutoTrialCharacterCuePresetKey()")
    && source.includes("manualCuePreset="),
  "manual character cue emits should record the selected preset in status and recap"
);
assert.ok(
  source.includes("function buildGrayAutoTrialCharacterManualCueStatusCardText")
    && source.includes("followupReadinessTrialCharacterManualCueStatusCard")
    && source.includes("updateGrayAutoTrialCharacterManualCueStatusCard()")
    && source.includes("backendPreview=")
    && source.includes("live2dApply="),
  "manual character cue panel should expose a dedicated read-only status card"
);
assert.ok(
  source.includes("function buildAssistantReplyCharacterCueCandidate")
    && source.includes("previewAssistantReplyCharacterCueCandidate({")
    && source.includes("conversation_followup_character_reply_cue_candidate")
    && source.includes("replyCueCandidate="),
  "assistant replies should create a read-only character cue candidate without emitting it"
);
assert.ok(
  source.includes("characterRuntimeAutoApplyReplyCue")
    && source.includes("auto_apply_reply_cue")
    && source.includes("function maybeAutoApplyAssistantReplyCharacterCueCandidate")
    && source.includes("conversation_followup_character_reply_cue_candidate_auto_apply")
    && source.includes("runtimeVoiceStyleToTalkStyle")
    && source.includes("speechStyle"),
  "assistant reply cue candidates should support an explicit default-off auto-apply path into runtime dispatch and TTS style"
);
assert.ok(
  source.includes("function buildReplyCharacterChipView")
    && source.includes("function updateReplyCharacterChip")
    && source.includes("localizeReplyCharacterValue")
    && source.includes("上一句角色表现 · 待回复")
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
    && source.includes('text.toLowerCase() === "/doctor"')
    && source.includes('text === "/自检"')
    && source.includes('runDoctorJsonFetch("/api/health"')
    && source.includes('"聊天模型"')
    && source.includes('"语音服务"')
    && source.includes("requestServerTTSBlob(")
    && source.includes("function buildDoctorAdvice(checks, context = {})")
    && source.includes("链路自检完成：核心功能正常。")
    && source.includes("下一步建议")
    && source.includes("GPT-SoVITS 异常")
    && source.includes("当前已关闭流式聊天")
    && source.includes("runDoctorAndAppendReport()")
    && source.includes('row?.classList?.add("doctor-report")')
    && source.includes("ui.doctorBtn")
    && indexSource.includes('id="doctor-btn"')
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
    && source.includes('text === "/测试语音"')
    && source.includes('text.toLowerCase() === "/testvoice"')
    && source.includes("ui.voiceTestBtn")
    && source.includes("语音测试没有成功"),
  "voice test should be available both as a visible button and as a local command"
);
assert.ok(
  source.includes("CHARACTER_REHEARSAL_PRESETS")
    && source.includes("async function runCharacterRehearsalAndAppendReport()")
    && source.includes('text === "/角色试演"')
    && source.includes('text.toLowerCase() === "/roletest"')
    && source.includes("ui.characterRehearsalBtn")
    && indexSource.includes('id="character-rehearsal-btn"')
    && source.includes("角色试演的语音没有成功"),
  "character rehearsal should be available as a visible button and local command to test runtime expression and voice styles without LLM"
);
assert.ok(
  source.includes("function buildCharacterTuningReport()")
    && source.includes("function runCharacterTuningAndAppendReport()")
    && source.includes("function addUniqueCharacterTuningConfigKey")
    && source.includes('text === "/角色调优"')
    && source.includes('text.toLowerCase() === "/tuning"')
    && source.includes("ui.characterTuningBtn")
    && indexSource.includes('id="character-tuning-btn"')
    && source.includes("角色调优建议")
    && source.includes("可检查配置项")
    && source.includes("tts.gpt_sovits_ref_audio_path")
    && source.includes("motion.speech_motion_strength"),
  "character tuning should expose readable next-step advice and concrete config keys based on the latest runtime cue"
);
assert.ok(
  source.includes("function recordCharacterPerformanceFeedback")
    && source.includes("characterPerformanceLastFeedback")
    && source.includes('text === "/表现不错"')
    && source.includes('text === "/需要调整"')
    && source.includes("ui.characterFeedbackGoodBtn")
    && source.includes("ui.characterFeedbackBadBtn")
    && indexSource.includes('id="character-feedback-good-btn"')
    && indexSource.includes('id="character-feedback-bad-btn"')
    && source.includes("最近反馈"),
  "character tuning should include lightweight local feedback for the latest runtime performance"
);
assert.ok(
  source.includes("function buildCharacterWorkflowGuide()")
    && source.includes("function appendCharacterWorkflowGuide()")
    && source.includes('text === "/角色流程"')
    && source.includes('text.toLowerCase() === "/roleflow"')
    && source.includes("角色闭环测试流程"),
  "chat should expose a readable local character workflow guide"
);
assert.ok(
  source.includes("function buildChatFailureDoctorHint(err)")
    && source.includes("更多 → 链路自检")
    && source.includes("输入 /doctor")
    && source.includes("const msg = buildChatFailureDoctorHint(err);"),
  "chat failures should point users to the visible Doctor self-check instead of leaving raw errors alone"
);
assert.ok(
  source.includes("function buildAssistantReplyCharacterExpressionCue")
    && source.includes('reason: "warm_or_playful"')
    && source.includes('action: "happy_idle"')
    && source.includes('reason: "question_or_surprise"')
    && source.includes('action: "think"')
    && source.includes("expressionReason"),
  "assistant reply cue candidates should map reply mood/style into concrete allowlisted expression metadata"
);
assert.ok(
  source.includes("grayAutoFollowupTrialCharacterReplyCueCandidate")
    && source.includes("noRuntimeCueEmission: true")
    && source.includes("noLive2DMove: true"),
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
    && source.includes("replyCueCandidate=")
    && source.includes("emotion:${candidate.runtimeHint?.emotion")
    && source.includes("backendBridge=ok:"),
  "manual cue recap should include reply candidate sends, backend no-op status, and candidate sent state"
);
assert.ok(
  source.includes("followupCharacterRuntimeLastDispatch")
    && source.includes("window.__AI_CHAT_LAST_CHARACTER_RUNTIME_DISPATCH__")
    && source.includes("runtimeDispatch=local:"),
  "manual character cue feedback should expose local dispatch and model broadcast status"
);
assert.ok(
  source.includes("followupCharacterRuntimeLastApply")
    && source.includes("window.__AI_CHAT_LAST_CHARACTER_RUNTIME_APPLY__")
    && source.includes("runtimeApply=emotion:"),
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
  source.includes("function buildTTSDebugReport()"),
  "chat.js should expose a TTS debug report for voice playback diagnosis"
);
assert.ok(
  source.includes('text.toLowerCase() === "/ttsdebug"'),
  "local commands should include /ttsdebug for copyable playback state"
);
assert.ok(
  source.includes("function installTTSDebugBridge()"),
  "window debug bridge should expose TTS playback state to developer tools"
);
assert.ok(
  source.includes("function buildTranslateDebugReport()")
    && source.includes('text.toLowerCase() === "/translatedebug"'),
  "chat.js should expose /translatedebug for copyable translation timing state"
);
assert.ok(
  source.includes("function buildMemoryDebugReport(")
    && source.includes('text.toLowerCase() === "/memorydebug"')
    && source.includes('learningFetchJson("/api/memory/debug")')
    && source.includes("learningTabDebug")
    && source.includes("learningDebugPanel")
    && source.includes("learning.degradedReason=")
    && source.includes("Learning health windows:"),
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
