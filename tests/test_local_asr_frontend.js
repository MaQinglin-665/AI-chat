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
const STAGE_CSS = path.join(ROOT, "web", "stage.css");
const PHOSPHOR_ICONS_CSS = path.join(ROOT, "web", "phosphorIcons.css");
const INDEX_HTML = path.join(ROOT, "web", "index.html");

const chatSource = fs.readFileSync(CHAT_JS, "utf8");
const chatStateSource = fs.readFileSync(CHAT_STATE_JS, "utf8");
const appConfigSource = fs.readFileSync(APP_CONFIG_CONTROLLER_JS, "utf8");
const localAsrSource = fs.readFileSync(LOCAL_ASR_CONTROLLER_JS, "utf8");
const localCommandRegistrySource = fs.readFileSync(LOCAL_COMMAND_REGISTRY_JS, "utf8");
const diagnosticsRuntimeSource = fs.readFileSync(DIAGNOSTICS_RUNTIME_CONTROLLER_JS, "utf8");
const configExample = JSON.parse(fs.readFileSync(CONFIG_EXAMPLE_JSON, "utf8"));
const voiceTroubleshooting = fs.readFileSync(VOICE_TROUBLESHOOTING_MD, "utf8");
const stageSource = fs.readFileSync(STAGE_CSS, "utf8");
const phosphorIconsSource = fs.readFileSync(PHOSPHOR_ICONS_CSS, "utf8");
const indexSource = fs.readFileSync(INDEX_HTML, "utf8");
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
  chatSource.includes("getLocalAsrController().startLocalAsrWarmupPolling()"),
  "speech-recognition setup should start visible local-model readiness polling"
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
  "local ASR should notify the chat turn controller of a non-interrupting speech candidate"
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
  localAsrSource.includes("normalizeParalinguisticContext")
    && localAsrSource.includes("sendHiddenParalinguisticCue")
    && localAsrSource.includes("hiddenUser: true"),
  "nonverbal voice cues should reach hidden model context without creating a visible user message"
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
  const state = {
    micOpen: true,
    micSession: 1,
    micQueue: [],
    micQueueWorking: false,
    history: [],
    conversationMode: { interruptTtsOnUserSpeech: true }
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

  assert.strictEqual(controller.sendHiddenParalinguisticCue({
    emotion: "happy",
    events: ["laughter"],
    cue_type: "laughter",
    voiced: true,
    voiced_ratio: 0.8,
    pitch_stability: 0.9,
    meaningful: true
  }), true, "meaningful nonverbal audio should create one hidden voice turn");
  assert.strictEqual(sent.length, 1, "hidden nonverbal audio should reach the assistant");
  assert.strictEqual(sent[0].opts.showUser, false, "the synthetic cue must not render as a user message");
  assert.strictEqual(sent[0].opts.rememberUser, false, "the synthetic cue must not enter visible conversation memory");
  assert.strictEqual(sent[0].opts.asrContext.paralinguistic.cue_type, "laughter");
}

{
  const sent = [];
  const interrupts = [];
  const timers = [];
  const state = {
    micOpen: true,
    micSession: 1,
    micQueue: [],
    micQueueWorking: false,
    history: [],
    asrHotwordRules: [],
    asrSemanticCorrectionEnabled: false,
    voiceTurnMergeWindowMs: 1200,
    voiceTurnHoldIncompleteEnabled: true,
    chatBusy: true,
    ttsContextSpeaking: true,
    conversationMode: { interruptTtsOnUserSpeech: true }
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
    handleUserSpeechStart: (input) => {
      interrupts.push(input);
      state.chatBusy = false;
      state.ttsContextSpeaking = false;
      return true;
    },
    requestAssistantReply: async (text, opts) => {
      sent.push({ text, opts });
      return true;
    }
  });

  assert.strictEqual(
    controller.sendAsrTranscript("嗯嗯", { source: "voice_transcript", startedDuringAssistant: true }),
    true,
    "a short acknowledgement should be accepted as hidden context"
  );
  assert.strictEqual(interrupts.length, 0, "a short acknowledgement must not interrupt active assistant speech");
  assert.strictEqual(sent.length, 0, "a short acknowledgement must not start a competing assistant turn");

  controller.sendAsrTranscript("不是这个方向", {
    source: "voice_transcript",
    startedDuringAssistant: true
  });
  controller.sendAsrTranscript("还要把延迟一起处理", {
    source: "voice_transcript",
    startedDuringAssistant: true
  });
  assert.strictEqual(interrupts.length, 1, "the first confirmed substantive phrase should interrupt exactly once");
  assert.strictEqual(sent.length, 0, "confirmed consecutive phrases should wait for the short merge window");
  controller.flushPendingMicTranscript();
  assert.strictEqual(sent.length, 1, "confirmed consecutive phrases should produce one merged assistant request");
  assert.ok(sent[0].text.includes("不是这个方向") && sent[0].text.includes("延迟"), "the merged request should preserve both phrases in order");
  assert.ok(sent[0].opts.asrContext?.paralinguistic, "the preceding hidden acknowledgement should remain available as private context");
  assert.strictEqual(
    sent[0].opts.preservePriorSpeech,
    true,
    "ordinary substantive continuation speech should preserve already queued assistant audio"
  );
}

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
  controller.sendAsrTranscript("maybe config", {
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
  const label = { textContent: "" };
  const attributes = {};
  const button = {
    disabled: false,
    querySelector: () => label,
    setAttribute: (name, value) => {
      attributes[name] = value;
    }
  };
  const state = {
    recognitionAvailable: false,
    localAsrAvailable: true,
    localAsrWarmupRequired: true,
    localAsrWarmupStatus: "warming",
    localAsrWarmupTimer: 0,
    asrMode: "local_vosk",
    micOpen: false,
    micToggleBusy: false,
    micSuspendDepth: 0
  };
  const controller = localAsrController.createController({
    state,
    ui: { micBtn: button },
    windowObject: { setTimeout, clearTimeout }
  });

  controller.updateMicButton();
  assert.strictEqual(button.disabled, true, "the mic must remain disabled while the local model is warming");
  assert.strictEqual(label.textContent, "语音初始化中");
  assert.strictEqual(attributes["aria-busy"], "true");

  state.localAsrWarmupStatus = "ready";
  controller.updateMicButton();
  assert.strictEqual(state.localAsrWarmupStatus, "ready");
  assert.strictEqual(button.disabled, false, "the mic should enable automatically when warmup completes");
  assert.strictEqual(label.textContent, "开麦: 关");
  controller.clearLocalAsrWarmupTimer();
}

{
  const sent = [];
  const interrupts = [];
  const state = {
    micOpen: true,
    micSession: 1,
    micQueue: [],
    micQueueWorking: false,
    micPendingTranscript: null,
    history: [],
    chatBusy: true,
    ttsContextSpeaking: false,
    streamSpeakWorking: false,
    speechPhase: "thinking",
    asrHotwordRules: [],
    asrSemanticCorrectionEnabled: false,
    voiceTurnMergeWindowMs: 1200,
    conversationMode: { interruptTtsOnUserSpeech: true }
  };
  const controller = localAsrController.createController({
    state,
    ui: { chatInput: { value: "" } },
    windowObject: { setTimeout, clearTimeout },
    handleUserSpeechStart: (input) => interrupts.push(input),
    requestAssistantReply: async (text, opts) => {
      sent.push({ text, opts });
      return true;
    }
  });

  for (const punctuationOnly of ["。", ".", "！？", "，……", "  。  "]) {
    assert.strictEqual(
      controller.sendAsrTranscript(punctuationOnly, { source: "voice_transcript", startedDuringAssistant: true }),
      false,
      `punctuation-only ASR output must be dropped: ${punctuationOnly}`
    );
  }
  assert.strictEqual(interrupts.length, 0, "punctuation-only ASR must not interrupt thinking or speech");
  assert.strictEqual(sent.length, 0, "punctuation-only ASR must not create an LLM request");
  assert.strictEqual(state.micQueue.length, 0, "punctuation-only ASR must not enter the voice queue");
  assert.strictEqual(state.micPendingTranscript, null, "punctuation-only ASR must not start a merge window");
  assert.strictEqual(state.asrLastCorrectionDebug.confidence_reason, "punctuation_only");
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
    chatBusy: true,
    asrMode: "browser",
    conversationMode: { interruptTtsOnUserSpeech: true },
    recognition: { stop() { stops += 1; } }
  };
  const controller = localAsrController.createController({
    state,
    windowObject: { setTimeout: () => 1, clearTimeout() {} }
  });

  assert.strictEqual(controller.pauseMicForAssistant(), false, "full-duplex mode should keep listening while the assistant is thinking");
  assert.strictEqual(state.micSuspendDepth, 0, "thinking must not add a microphone suspension lease in full-duplex mode");
  assert.strictEqual(stops, 0, "thinking must not stop browser recognition in full-duplex mode");
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

{
  const state = {
    micOpen: true,
    micSession: 7,
    micSuspendDepth: 0,
    localAsrSpeeching: false,
    localAsrSpeechMs: 0,
    localAsrSilenceMs: 0,
    localAsrBuffers: [],
    localAsrPreSpeechBuffers: [],
    localAsrPreSpeechMs: 0,
    localAsrManualCaptureBuffers: [],
    localAsrManualCaptureMs: 0,
    localAsrSessionTranscriptAccepted: false,
    sileroVadReady: true,
    sileroVadActive: true,
    sileroVadSessionEnabled: false,
    localAsrNoiseFloor: 0.0008,
    localAsrSpeechThreshold: 0.02,
    localAsrSilenceTriggerMs: 380,
    localAsrMinSpeechMs: 180,
    localAsrMaxSpeechMs: 4000,
    localAsrPeakRms: 0,
    localAsrLastSpeechInterruptAt: 0
  };
  const controller = localAsrController.createController({
    state,
    ui: { chatInput: { value: "" } },
    windowObject: { setTimeout, clearTimeout, Float32Array, Int16Array, Uint8Array },
    performanceObject: { now: () => 5000 }
  });

  const quietButRecordedFrame = new Float32Array(1600).fill(0.003);
  controller.handleLocalAsrFrame(quietButRecordedFrame, 16000, 7);
  assert.strictEqual(
    state.localAsrSpeeching,
    false,
    "a late Silero initialization must not replace energy detection in an already active microphone session"
  );
  assert.strictEqual(state.localAsrBuffers.length, 0, "VAD should not fabricate an automatic utterance for the quiet frame");
  const closeSnapshot = controller.snapshotPendingLocalAsr();
  assert.strictEqual(closeSnapshot.manualCapture, true, "manual close should fall back to the whole bounded recording when VAD missed speech");
  assert.ok(closeSnapshot.chunks.length > 0, "manual close fallback must retain PCM frames captured since mic open");
  assert.ok(closeSnapshot.speechMs >= 90, "manual close fallback should carry enough duration for forced transcription");

  const silenceFrame = { pcm16: new Int16Array(320), frameMs: 20, rms: 0.0002 };
  const speechFrame = { pcm16: new Int16Array(320).fill(900), frameMs: 20, rms: 0.018 };
  const trimmed = controller.trimLocalAsrManualCaptureFrames([
    ...Array(30).fill(silenceFrame),
    ...Array(10).fill(speechFrame),
    ...Array(40).fill(silenceFrame)
  ]);
  assert.ok(trimmed.length < 80, "manual-close ASR should trim long leading and trailing silence");
  assert.ok(trimmed.includes(speechFrame), "manual-close trimming must preserve the detected speech region");

  state.localAsrSessionTranscriptAccepted = true;
  const duplicateGuardSnapshot = controller.snapshotPendingLocalAsr();
  assert.strictEqual(duplicateGuardSnapshot.chunks.length, 0, "a session that already submitted speech must not resend the whole recording on close");
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
  10000,
  "config.example.json should match the recommended maximum speech duration"
);
assert.ok(
  !/body\.view-chat\s+\.mic-meter-wrap\s*\{\s*display:\s*none\s*!important;\s*\}/.test(
    fs.readFileSync(path.join(ROOT, "web", "kawaiiTheme.css"), "utf8")
  ),
  "the active chat theme must not hide live microphone level feedback"
);
assert.ok(
  /body\.view-full #mic-meter-wrap\s*\{[\s\S]*?display:\s*flex\s*!important;/.test(stageSource)
    && !/body\.view-full #mic-meter-wrap\s*\{\s*display:\s*none\s*!important;/.test(stageSource),
  "the main Live2D stage must expose live microphone level feedback"
);
assert.ok(
  indexSource.includes('id="stage-voice-feedback"')
    && indexSource.includes('id="stage-voice-meter-fill"')
    && indexSource.includes('id="stage-voice-level-value"')
    && (indexSource.match(/<i><\/i>/g) || []).length === 7
    && stageSource.includes("body.view-full .stage-voice-feedback")
    && localAsrSource.includes('ui.stageVoiceMeterFill.querySelectorAll?.("i")'),
  "the main stage composer must expose independent visible voice status and live level feedback"
);
assert.ok(
  localAsrSource.includes("ui.stageVoiceFeedback.hidden = state.micOpen !== true")
    && localAsrSource.includes('querySelectorAll?.("i")')
    && localAsrSource.includes("const profiles = [0.48, 0.82, 0.64, 1, 0.72, 0.9, 0.54]"),
  "the compact voice waveform must appear only while the mic is open and react to live level"
);
assert.ok(
  stageSource.includes(".stage-voice-wave > i:nth-child(7)")
    && stageSource.includes("@media (prefers-reduced-motion: reduce)")
    && phosphorIconsSource.includes(".stage-voice-feedback[hidden]"),
  "the colored waveform must preserve reduced-motion and hidden-state behavior"
);
assert.ok(
  /body\.view-full #stage-voice-feedback\.stage-voice-feedback\s*\{[\s\S]*?position:\s*fixed\s*!important;[\s\S]*?visibility:\s*visible\s*!important;/.test(
    phosphorIconsSource
  ),
  "the final visual layer must keep voice feedback visible in full-screen Electron layouts"
);
assert.ok(
  localAsrSource.includes("const visualFloor = 0.0015")
    && localAsrSource.includes("const visualCeiling = 0.12"),
  "the microphone meter must use an RMS-scale range so normal quiet microphones visibly move"
);
assert.ok(
  localAsrSource.includes("function hasAsrSemanticContent")
    && localAsrSource.includes('"punctuation_only"')
    && localAsrSource.includes("/[\\p{L}\\p{N}]/u"),
  "all ASR entry paths must reject punctuation-only hallucinations before interruption or chat"
);
assert.ok(
  localAsrSource.includes("没有识别到文字，请检查音量条后再说一次"),
  "an empty ASR response must be visible instead of silently disappearing"
);
assert.ok(
  localAsrSource.includes("已开麦，但没有收到音频帧")
    && localAsrSource.includes("stageVoiceRuntimeWarning")
    && localAsrSource.includes("localAsrInputDeviceLabel"),
  "the visible voice feedback must distinguish missing audio frames and identify the selected input"
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
