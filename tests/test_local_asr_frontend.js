#!/usr/bin/env node
"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const CHAT_JS = path.join(ROOT, "web", "chat.js");
const CHAT_STATE_JS = path.join(ROOT, "web", "chatState.js");
const APP_CONFIG_CONTROLLER_JS = path.join(ROOT, "web", "appConfigController.js");
const LOCAL_ASR_CONTROLLER_JS = path.join(ROOT, "web", "localAsrController.js");
const LOCAL_COMMAND_REGISTRY_JS = path.join(ROOT, "web", "localCommandRegistry.js");
const DIAGNOSTICS_RUNTIME_CONTROLLER_JS = path.join(ROOT, "web", "diagnosticsRuntimeController.js");
const CONFIG_EXAMPLE_JSON = path.join(ROOT, "config.example.json");
const VOICE_TROUBLESHOOTING_MD = path.join(ROOT, "docs", "voice-troubleshooting.md");

const chatSource = fs.readFileSync(CHAT_JS, "utf8");
const chatStateSource = fs.readFileSync(CHAT_STATE_JS, "utf8");
const appConfigSource = fs.readFileSync(APP_CONFIG_CONTROLLER_JS, "utf8");
const localAsrSource = fs.readFileSync(LOCAL_ASR_CONTROLLER_JS, "utf8");
const localCommandRegistrySource = fs.readFileSync(LOCAL_COMMAND_REGISTRY_JS, "utf8");
const diagnosticsRuntimeSource = fs.readFileSync(DIAGNOSTICS_RUNTIME_CONTROLLER_JS, "utf8");
const configExample = JSON.parse(fs.readFileSync(CONFIG_EXAMPLE_JSON, "utf8"));
const voiceTroubleshooting = fs.readFileSync(VOICE_TROUBLESHOOTING_MD, "utf8");
const localAsrController = require(LOCAL_ASR_CONTROLLER_JS);

assert.ok(
  chatStateSource.includes("localAsrSpeechThreshold: 0.0035"),
  "local ASR runtime default should use the low-volume-friendly threshold"
);
assert.ok(
  /Number\(asrCfg\.speech_threshold \|\| 0\.0035\)[\s\S]*?0\.0015[\s\S]*?0\.05/.test(appConfigSource),
  "config loading should preserve the lower ASR threshold range"
);
assert.ok(
  localCommandRegistrySource.includes('{ kind: "mic_debug", aliases: ["/micdebug"] }'),
  "local command registry should keep the /micdebug command for voice diagnostics"
);
assert.ok(
  chatSource.includes("buildMicDebugReport") && chatSource.includes("matchLocalCommand(inputText)"),
  "chat.js should route local commands to the mic debug handler"
);
assert.ok(
  localAsrSource.includes("localAsrThresholdAutoAdjusted"),
  "low-level ASR watchdog should track one-shot threshold auto-adjustment"
);
assert.ok(
  chatStateSource.includes("localAsrPreSpeechBuffers: []")
    && localAsrSource.includes("LOCAL_ASR_PRE_SPEECH_MS")
    && localAsrSource.includes("pushLocalAsrPreSpeechFrame"),
  "local ASR should keep a short pre-speech buffer so opening syllables are not clipped"
);
assert.ok(
  chatStateSource.includes("localAsrLastSpeechInterruptAt: 0")
    && localAsrSource.includes("handleUserSpeechStart")
    && localAsrSource.includes('reason: "local_asr_speech_start"'),
  "local ASR should notify the chat turn controller as soon as user speech starts"
);
assert.ok(
  chatStateSource.includes('listeningPresencePhase: "idle"')
    && chatStateSource.includes("listeningPresenceRevision: 0")
    && localAsrSource.includes("function setListeningPresence")
    && localAsrSource.includes("function clearListeningPresence"),
  "local ASR should keep session/revision-bound listening presence separate from transcript delivery"
);
assert.ok(
  !/if \(state\.chatBusy\)[\s\S]*?setTimeout\(resolve, 160\)/.test(localAsrSource)
    && localAsrSource.includes('interruptReason: "voice_transcript"')
    && localAsrSource.includes('interruptReason: "voice_close_transcript"'),
  "voice transcripts should interrupt the active reply instead of waiting for chatBusy to clear"
);
assert.ok(
  localAsrSource.includes("function shouldKeepListeningDuringAssistant()")
    && localAsrSource.includes("state.conversationMode?.interruptTtsOnUserSpeech === true"),
  "hands-free ASR should remain active during assistant speech only when barge-in is explicitly enabled"
);
assert.ok(
  localAsrSource.includes('inputModality: "voice"')
    && chatSource.includes("getLocalAsrController().transcribeSnapshotAfterMicClose"),
  "ASR-generated chat turns should be marked as voice input for spoken turn-taking"
);
assert.ok(
  /state\.localAsrSpeechThreshold \* 0\.62[\s\S]*?0\.0022[\s\S]*?0\.0042/.test(localAsrSource),
  "low-level ASR watchdog should lower overly high thresholds conservatively"
);
assert.ok(
  /const resp = await authFetch\("\/api\/asr_pcm"/.test(localAsrSource),
  "local ASR transcription should use authFetch so API token protection keeps working"
);
assert.ok(
  /headers:\s*\{\s*"Content-Type":\s*"application\/json"\s*\}/.test(localAsrSource),
  "local ASR transcription should post JSON payloads"
);
assert.ok(
  /const rawText = String\(data\?\.raw_text \|\| ""\)\.trim\(\);[\s\S]*?const text = rawText \|\| String\(data\?\.text \|\| ""\)\.trim\(\);[\s\S]*?return returnMetadata \? result : result\.text;/.test(localAsrSource),
  "local ASR should prefer raw_text and retain safe backend metadata for one frontend correction pass"
);
assert.ok(
  localAsrSource.includes("choosePreferredLocalAsrInputDevice"),
  "local ASR should choose a preferred microphone input when devices are enumerable"
);
assert.ok(
  /stereo mix\|loopback\|what u hear\|\\u7acb\\u4f53\\u58f0\\u6df7\\u97f3/.test(localAsrSource),
  "local ASR device scoring should avoid stereo mix and loopback inputs"
);
assert.ok(
  /microphone\|mic\|\\u9ea6\\u514b\\u98ce\|\\u9635\\u5217/.test(localAsrSource),
  "local ASR device scoring should prefer microphone-like input names"
);
assert.ok(
  diagnosticsRuntimeSource.includes("selectedInput="),
  "/micdebug should report the selected input device"
);
assert.ok(
  diagnosticsRuntimeSource.includes("selectedInputMuted="),
  "/micdebug should report whether the selected input is muted"
);
assert.ok(
  localAsrSource.includes("isLocalAsrTrackMuted"),
  "local ASR should detect muted MediaStream tracks before switching inputs"
);
assert.ok(
  diagnosticsRuntimeSource.includes("diagnosis=mic_track_muted"),
  "/micdebug should explain when Electron receives a system-muted microphone track"
);
assert.ok(
  localAsrSource.includes("Windows 输入设备、隐私权限或硬件静音键"),
  "local ASR should give an actionable Windows/device mute warning"
);
assert.ok(
  chatSource.includes("function buildFlexibleAsrHotwordPattern")
    && chatSource.includes("join(\"\\\\s*\")")
    && chatSource.includes("toCompact.toLowerCase().startsWith(fromCompact.toLowerCase())"),
  "frontend hotword correction should match spaced CJK ASR output and avoid repeated prefix expansion"
);
assert.ok(
  chatStateSource.includes("asrSemanticCorrectionEnabled: true")
    && chatStateSource.includes("voiceTurnMergeWindowMs: 1200")
    && chatStateSource.includes("voiceTurnHoldIncompleteEnabled: true")
    && chatStateSource.includes("asrLowConfidenceConfirmEnabled: true")
    && chatStateSource.includes("asrLowConfidenceThreshold: 0.48")
    && appConfigSource.includes("semantic_correction_enabled")
    && appConfigSource.includes("voice_turn_merge_window_ms")
    && appConfigSource.includes("voice_turn_hold_incomplete_enabled")
    && appConfigSource.includes("low_confidence_confirm_enabled")
    && appConfigSource.includes("low_confidence_threshold"),
  "ASR semantic correction, merge-window, and low-confidence settings should be frontend configurable"
);
assert.ok(
  localAsrSource.includes("applyContextualAsrCorrections")
    && localAsrSource.includes("ASR_CONTEXT_TERMS")
    && localAsrSource.includes("flushPendingMicTranscript")
    && localAsrSource.includes("asrLastCorrectionDebug")
    && localAsrSource.includes("getIncompleteVoiceTurnReason")
    && localAsrSource.includes("assessAsrConfidence")
    && localAsrSource.includes("buildAsrConversationContext"),
  "local ASR should run contextual correction, merge short barge-in fragments, confirm uncertain text, and keep debug state"
);
assert.ok(
  diagnosticsRuntimeSource.includes("asrRaw=")
    && diagnosticsRuntimeSource.includes("asrHotword=")
    && diagnosticsRuntimeSource.includes("asrContext=")
    && diagnosticsRuntimeSource.includes("asrFinal=")
    && diagnosticsRuntimeSource.includes("asrConfidence=")
    && diagnosticsRuntimeSource.includes("asrConfirm=")
    && diagnosticsRuntimeSource.includes("asrWaitReason="),
  "/micdebug should show raw, hotword, contextual, final, confidence, and turn-wait ASR state"
);

{
  const sent = [];
  const timers = [];
  const state = {
    micOpen: true,
    micSession: 1,
    micQueue: [],
    micQueueWorking: false,
    history: [{ role: "assistant", content: "We are tuning Live2D, ASR, and GPT-SoVITS." }],
    asrHotwordRules: [
      { from: "心语", to: "馨语AI桌宠", regex: /心\s*语/gi }
    ],
    asrSemanticCorrectionEnabled: true,
    voiceTurnMergeWindowMs: 1200,
    voiceTurnHoldIncompleteEnabled: true,
    chatInterruptedAt: Date.now(),
    protectedInterruptionUntil: 0
  };
  const controller = localAsrController.createController({
    state,
    ui: { chatInput: { value: "" } },
    windowObject: {
      setTimeout(fn, ms) {
        timers.push({ fn, ms });
        return timers.length;
      },
      clearTimeout() {},
      btoa: (text) => Buffer.from(text, "binary").toString("base64"),
      Float32Array,
      Int16Array,
      Uint8Array
    },
    performanceObject: { now: () => 1000 },
    applyAsrHotwordCorrections: (text) => String(text || "").replace(/心\s*语/g, "馨语AI桌宠"),
    requestAssistantReply: async (text, opts) => {
      sent.push({ text, opts });
      return true;
    }
  });

  controller.enqueueMicTranscript("等一下 live to d", 1);
  controller.enqueueMicTranscript("不是心 语的问题", 1);
  assert.strictEqual(sent.length, 0, "barge-in ASR fragments should wait for the merge window");
  controller.flushPendingMicTranscript();
  assert.strictEqual(sent.length, 1, "merged ASR fragments should send as one voice turn");
  assert.ok(sent[0].text.includes("Live2D"), "contextual ASR correction should restore Live2D");
  assert.ok(sent[0].text.includes("馨语AI桌宠"), "hotword correction should still run before context correction");
  assert.ok(sent[0].text.includes("等一下") && sent[0].text.includes("不是"), "merged voice turn should preserve both fragments");
  assert.strictEqual(sent[0].opts.interruptReason, "voice_transcript", "merged ASR turn should keep the voice interrupt reason");
  assert.strictEqual(state.asrLastCorrectionDebug.merged_parts, 2, "ASR debug should record merged fragment count");
}

{
  const sent = [];
  const timers = [];
  const state = {
    micOpen: true,
    micSession: 1,
    micQueue: [],
    micQueueWorking: false,
    history: [],
    asrHotwordRules: [],
    asrSemanticCorrectionEnabled: true,
    asrLowConfidenceConfirmEnabled: true,
    asrLowConfidenceThreshold: 0.48,
    voiceTurnMergeWindowMs: 1200,
    voiceTurnHoldIncompleteEnabled: true,
    localAsrSpeechThreshold: 0.0035,
    chatInterruptedAt: 0,
    protectedInterruptionUntil: 0
  };
  const controller = localAsrController.createController({
    state,
    ui: { chatInput: { value: "" } },
    windowObject: {
      setTimeout(fn, ms) {
        timers.push({ fn, ms });
        return timers.length;
      },
      clearTimeout() {}
    },
    performanceObject: { now: () => 1200 },
    requestAssistantReply: async (text, opts) => {
      sent.push({ text, opts });
      return true;
    }
  });
  controller.sendAsrTranscript("I think the model config", {
    source: "voice_transcript",
    confidence: 0.82
  });
  assert.strictEqual(sent.length, 0, "incomplete voice turns should wait briefly before sending");
  assert.strictEqual(state.asrLastCorrectionDebug.held_for_more_speech, true, "ASR debug should mark incomplete-turn hold");
  assert.ok(state.asrLastCorrectionDebug.turn_wait_reason, "ASR debug should record why the voice turn is waiting");
  controller.sendAsrTranscript("needs a Live2D option", {
    source: "voice_transcript",
    confidence: 0.86
  });
  assert.strictEqual(sent.length, 0, "second fragment should merge into the pending voice turn");
  controller.flushPendingMicTranscript();
  assert.strictEqual(sent.length, 1, "merged incomplete voice turn should flush as one request");
  assert.ok(sent[0].text.includes("model config") && sent[0].text.includes("Live2D option"), "merged voice turn should preserve both fragments");
  assert.strictEqual(state.asrLastCorrectionDebug.merged_parts, 2, "merged incomplete voice turn should record part count");
}

{
  const sent = [];
  const timers = [];
  const state = {
    micOpen: true,
    micSession: 1,
    micQueue: [],
    micQueueWorking: false,
    history: [],
    asrHotwordRules: [],
    asrSemanticCorrectionEnabled: true,
    asrLowConfidenceConfirmEnabled: true,
    asrLowConfidenceThreshold: 0.48,
    voiceTurnMergeWindowMs: 1200,
    voiceTurnHoldIncompleteEnabled: true,
    localAsrSpeechThreshold: 0.0035,
    chatInterruptedAt: Date.now(),
    protectedInterruptionUntil: 0
  };
  const controller = localAsrController.createController({
    state,
    ui: { chatInput: { value: "" } },
    windowObject: {
      setTimeout(fn, ms) {
        timers.push({ fn, ms });
        return timers.length;
      },
      clearTimeout() {}
    },
    performanceObject: { now: () => 1500 },
    requestAssistantReply: async (text, opts) => {
      sent.push({ text, opts });
      return true;
    }
  });

  controller.sendAsrTranscript("央行等问题", {
    source: "voice_transcript",
    confidence: 0.54
  });
  assert.strictEqual(sent.length, 0, "post-interrupt ASR fragments should wait before sending");
  assert.strictEqual(timers.length, 1, "post-interrupt ASR fragment should use the merge window");
  timers.shift().fn();
  assert.strictEqual(sent.length, 0, "unreliable post-interrupt ASR fragments should not be sent to chat");

  state.chatInterruptedAt = Date.now();
  controller.sendAsrTranscript("停一下", {
    source: "voice_transcript",
    confidence: 0.8
  });
  assert.strictEqual(sent.length, 0, "clear post-interrupt stop command should still wait for the merge window");
  assert.strictEqual(timers.length, 1, "clear post-interrupt stop command should be merged before sending");
  timers.shift().fn();
  assert.strictEqual(sent.length, 1, "clear post-interrupt stop command should still be sent to chat");
  assert.strictEqual(sent[0].text, "停一下", "clear post-interrupt stop command should be preserved");
}

{
  const sent = [];
  const state = {
    micOpen: true,
    micSession: 1,
    micQueue: [],
    micQueueWorking: false,
    history: [],
    asrHotwordRules: [],
    asrSemanticCorrectionEnabled: true,
    asrLowConfidenceConfirmEnabled: true,
    asrLowConfidenceThreshold: 0.48,
    voiceTurnMergeWindowMs: 0,
    localAsrSpeechThreshold: 0.0035
  };
  const controller = localAsrController.createController({
    state,
    ui: { chatInput: { value: "" } },
    windowObject: { setTimeout, clearTimeout },
    performanceObject: { now: () => 1200 },
    requestAssistantReply: async (text, opts) => {
      sent.push({ text, opts });
      return true;
    }
  });
  controller.sendAsrTranscript("um", {
    source: "voice_transcript",
    confidence: 0.28
  });
  assert.strictEqual(sent.length, 1, "low-confidence ASR should still send a voice turn");
  assert.ok(sent[0].opts.asrContext, "low-confidence ASR should pass confirmation context to the chat request");
  assert.strictEqual(sent[0].opts.asrContext.needs_confirmation, true, "ASR context should ask the model to confirm first");
  assert.ok(sent[0].opts.asrContext.confidence < 0.48, "ASR context should expose compact confidence");
  assert.strictEqual(state.asrLastCorrectionDebug.needs_confirmation, true, "ASR debug should record confirmation routing");
}

{
  const timers = [];
  let stops = 0;
  const state = {
    recognitionAvailable: true,
    localAsrAvailable: false,
    micOpen: true,
    micKeepListening: true,
    micSuspendDepth: 0,
    micRetryCount: 0,
    micRestartTimer: 0,
    asrMode: "browser",
    conversationMode: { interruptTtsOnUserSpeech: false },
    recognition: { stop() { stops += 1; } }
  };
  const controller = localAsrController.createController({
    state,
    windowObject: {
      setTimeout(fn, ms) {
        timers.push({ fn, ms });
        return timers.length;
      },
      clearTimeout() {}
    }
  });

  assert.strictEqual(controller.pauseMicForAssistant(), true, "no-barge-in mode should acquire an assistant mic pause lease");
  assert.strictEqual(state.micSuspendDepth, 1, "no-barge-in mode should suspend recognition while the assistant speaks");
  assert.strictEqual(stops, 1, "browser recognition should stop while the assistant speaks in no-barge-in mode");
  assert.strictEqual(controller.resumeMicAfterAssistant(), true, "the owning assistant turn should release its mic pause lease");
  assert.strictEqual(state.micSuspendDepth, 0, "releasing the lease should restore the microphone depth");
  assert.strictEqual(timers.length, 1, "browser recognition should restart only after the final lease is released");
}

{
  let stops = 0;
  const state = {
    recognitionAvailable: true,
    localAsrAvailable: false,
    micOpen: true,
    micKeepListening: true,
    micSuspendDepth: 0,
    micRetryCount: 0,
    asrMode: "browser",
    conversationMode: { interruptTtsOnUserSpeech: true },
    recognition: { stop() { stops += 1; } }
  };
  const controller = localAsrController.createController({
    state,
    windowObject: { setTimeout: () => 1, clearTimeout() {} }
  });

  assert.strictEqual(controller.pauseMicForAssistant(), false, "barge-in mode should keep listening during assistant speech");
  assert.strictEqual(state.micSuspendDepth, 0, "barge-in mode should not add a suspension lease");
  assert.strictEqual(stops, 0, "barge-in mode should not stop browser recognition");
  assert.strictEqual(controller.resumeMicAfterAssistant(), false, "barge-in mode should not release a lease it never acquired");
}

{
  const sent = [];
  const state = {
    micOpen: true,
    micSession: 1,
    micQueue: [],
    micQueueWorking: false,
    history: [],
    asrHotwordRules: [],
    asrSemanticCorrectionEnabled: false,
    voiceTurnMergeWindowMs: 0,
    conversationMode: { interruptTtsOnUserSpeech: false }
  };
  const controller = localAsrController.createController({
    state,
    ui: { chatInput: { value: "" } },
    windowObject: { setTimeout, clearTimeout },
    requestAssistantReply: async (text, opts) => {
      sent.push({ text, opts });
      return true;
    }
  });

  controller.sendAsrTranscript("real user speech", { source: "voice_transcript" });
  assert.strictEqual(sent.length, 1, "a real voice turn should still reach chat after assistant mic suspension is lifted");
  assert.strictEqual(sent[0].opts.interruptTts, false, "no-barge-in voice turns must not force an active TTS interruption");
  assert.strictEqual(sent[0].opts.interruptActive, false, "no-barge-in voice turns must not cancel an active chat turn");
}

{
  const timers = [];
  const speechStarts = [];
  const state = {
    micOpen: true,
    micSession: 1,
    micSuspendDepth: 0,
    micKeepListening: false,
    recognitionAvailable: false,
    localAsrAvailable: true,
    asrMode: "local_vosk",
    conversationMode: { interruptTtsOnUserSpeech: true },
    localAsrSpeeching: false,
    localAsrSpeechMs: 0,
    localAsrSilenceMs: 0,
    localAsrBuffers: [],
    localAsrPreSpeechBuffers: [],
    localAsrPreSpeechMs: 0,
    localAsrNoiseFloor: 0.0008,
    localAsrSpeechThreshold: 0.0035,
    localAsrSilenceTriggerMs: 380,
    localAsrMinSpeechMs: 180,
    localAsrMaxSpeechMs: 4000,
    localAsrPeakRms: 0,
    localAsrLastSpeechInterruptAt: 0
  };
  const controller = localAsrController.createController({
    state,
    ui: { chatInput: { value: "" } },
    windowObject: {
      setTimeout(fn, ms) {
        timers.push({ fn, ms });
        return timers.length;
      },
      clearTimeout() {},
      Float32Array,
      Int16Array,
      Uint8Array
    },
    performanceObject: { now: () => 3000 },
    handleUserSpeechStart: (input) => speechStarts.push(input)
  });

  controller.setListeningPresence("armed", { sessionId: 1 });
  assert.strictEqual(state.listeningPresencePhase, "armed", "an open microphone should enter the quiet armed presence");
  const loudFrame = new Float32Array(320).fill(0.018);
  controller.handleLocalAsrFrame(loudFrame, 16000, 1);
  controller.handleLocalAsrFrame(loudFrame, 16000, 1);
  assert.strictEqual(state.listeningPresencePhase, "hearing", "the first VAD speech frame should enter hearing before transcript finalization");
  assert.strictEqual(speechStarts.length, 1, "one continuous VAD utterance should trigger only one barge-in decision");

  controller.handleLocalAsrFrame(new Float32Array(320), 16000, 1);
  assert.strictEqual(state.listeningPresencePhase, "release", "VAD silence should release the hearing pose before ASR network work finishes");
  const releaseTimer = timers.at(-1);
  assert.ok(releaseTimer && releaseTimer.ms >= 180, "release should use a bounded visual settle timer");
  releaseTimer.fn();
  assert.strictEqual(state.listeningPresencePhase, "armed", "a settled utterance should return to quiet listening while the microphone remains open");

  state.micSession = 2;
  controller.setListeningPresence("armed", { sessionId: 2 });
  controller.handleLocalAsrFrame(loudFrame, 16000, 1);
  assert.strictEqual(state.listeningPresenceSession, 2, "a stale VAD session must not overwrite a newer microphone presence state");
  assert.strictEqual(controller.pauseMicForAssistant(), true, "assistant pause should acquire the local microphone lease");
  assert.strictEqual(state.listeningPresencePhase, "idle", "assistant mic pause must clear the visible listening pose");
}

{
  const timers = [];
  const speechStarts = [];
  const state = {
    micOpen: true,
    micSession: 1,
    micSuspendDepth: 0,
    localAsrSending: true,
    localAsrSpeeching: true,
    localAsrSpeechMs: 260,
    localAsrSilenceMs: 420,
    localAsrBuffers: [new Int16Array(320).fill(180)],
    localAsrPendingUtterances: [],
    localAsrPreSpeechBuffers: [],
    localAsrPreSpeechMs: 0,
    localAsrNoiseFloor: 0.0008,
    localAsrSpeechThreshold: 0.0035,
    localAsrMinSpeechMs: 180,
    localAsrMaxSpeechMs: 4000,
    localAsrPeakRms: 0.02,
    localAsrLastSpeechInterruptAt: 0
  };
  const controller = localAsrController.createController({
    state,
    ui: { chatInput: { value: "" } },
    windowObject: {
      setTimeout(fn, ms) {
        timers.push({ fn, ms });
        return timers.length;
      },
      clearTimeout() {},
      Float32Array,
      Int16Array,
      Uint8Array
    },
    performanceObject: { now: () => 4200 },
    handleUserSpeechStart: (input) => speechStarts.push(input)
  });

  controller.flushLocalAsrUtterance(true, 1);
  assert.strictEqual(state.localAsrSpeeching, false, "a follow-up utterance must settle VAD even while the prior ASR request is still sending");
  assert.strictEqual(state.localAsrBuffers.length, 0, "the settled follow-up utterance should be detached from the active ASR request");
  assert.strictEqual(state.localAsrPendingUtterances.length, 1, "the detached follow-up utterance should queue for serialized transcription");
  assert.strictEqual(state.listeningPresencePhase, "release", "queued follow-up speech should release the active hearing pose instead of leaving it stuck");

  const loudFrame = new Float32Array(320).fill(0.018);
  controller.handleLocalAsrFrame(loudFrame, 16000, 1);
  assert.strictEqual(state.localAsrSpeeching, true, "new speech during a queued ASR request should start a fresh VAD utterance");
  assert.strictEqual(speechStarts.length, 1, "the fresh utterance should still receive its own barge-in decision");
}

assert.strictEqual(
  configExample.asr.speech_threshold,
  0.0035,
  "config.example.json should match the recommended ASR threshold"
);
assert.strictEqual(
  configExample.asr.min_speech_ms,
  150,
  "config.example.json should match the recommended minimum speech duration"
);
assert.strictEqual(
  configExample.asr.max_speech_ms,
  2200,
  "config.example.json should match the recommended maximum speech duration"
);
assert.strictEqual(
  configExample.conversation_mode.interrupt_tts_on_user_speech,
  true,
  "config.example.json should let user speech interrupt assistant TTS by default"
);
assert.strictEqual(
  configExample.asr.semantic_correction_enabled,
  true,
  "config.example.json should enable contextual ASR correction by default"
);
assert.strictEqual(
  configExample.asr.voice_turn_merge_window_ms,
  1200,
  "config.example.json should merge close barge-in ASR fragments briefly"
);
assert.strictEqual(
  configExample.asr.voice_turn_hold_incomplete_enabled,
  true,
  "config.example.json should briefly hold incomplete spoken turns by default"
);
assert.strictEqual(
  configExample.asr.low_confidence_confirm_enabled,
  true,
  "config.example.json should confirm uncertain ASR by default"
);
assert.strictEqual(
  configExample.asr.low_confidence_threshold,
  0.48,
  "config.example.json should expose the low-confidence ASR confirmation threshold"
);
assert.strictEqual(
  configExample.asr.input_language_mode,
  "auto",
  "config.example.json should keep local ASR in safe auto-language mode"
);
assert.deepStrictEqual(
  configExample.asr.vosk_model_paths,
  { "zh-CN": "", "en-US": "" },
  "config.example.json should leave local model paths empty until the user configures them privately"
);
assert.ok(
  chatStateSource.includes('asrInputLanguageMode: "auto"')
    && appConfigSource.includes("input_language_mode"),
  "frontend config loading should retain the safe ASR language mode without receiving model paths"
);

assert.ok(
  voiceTroubleshooting.includes('"speech_threshold": 0.0035'),
  "voice troubleshooting docs should show the same ASR threshold"
);
assert.ok(
  voiceTroubleshooting.includes("/micdebug"),
  "voice troubleshooting docs should explain /micdebug"
);

console.log("Local ASR frontend checks passed.");
