#!/usr/bin/env node
"use strict";

const assert = require("assert");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const chatState = require(path.join(ROOT, "web", "chatState.js"));
const chatReplyController = require(path.join(ROOT, "web", "chatReplyController.js"));

function makeController({
  companionTurnEnabled,
  emitTurn,
  speakingEnabled = true,
  streamAssistantReplyImpl = null,
  modelDirectReply = false,
  ttsProvider = "browser",
  requestServerTTSBlobWithRetry = null,
  playAudioBlobImpl = null,
  speakImpl = null,
  feedStreamSpeakDeltaImpl = null,
  flushStreamSpeakImpl = null,
  scheduleFinalSpeechWatchdogImpl = null,
  buildPerformanceTimelineImpl = null,
  buildVoiceTimelineImpl = null,
  buildVoiceSpeechSegmentsImpl = null,
  executePerformanceTimelinePhase = null,
  schedulePerformanceTimelineSpeechBeats = null,
  maybePlayTalkGesture = null,
  recordPerformanceAuditEvent = null,
  buildEarlyPreReactionPlanImpl = null,
  executeEarlyPreReactionPlanImpl = null,
  performanceObject = { now: () => 100 },
  setTimeoutImpl = () => 0,
  clearTimeoutImpl = () => {},
  pauseMicForAssistant = () => false,
  resumeMicAfterAssistant = () => false,
  acknowledgeDeliveredTurnImpl = null,
  deliveryAckQueue = null,
  getPendingDeliveryReceiptIds = () => []
}) {
  const state = chatState.createInitialState();
  state.companionTurnEnabled = companionTurnEnabled;
  state.modelDirectReply = modelDirectReply;
  state.ttsProvider = ttsProvider;
  state.speakingEnabled = speakingEnabled;
  state.streamSpeakEnabled = true;
  state.streamSpeakMode = "realtime";
  state.conversationMode.chatStreamEnabled = true;
  const fedDeltas = [];
  const spoken = [];
  const cues = [];
  const appliedCues = [];
  const textMotionCues = [];
  const prewarmRequests = [];
  const played = [];
  const rows = [];
  const publishedPerformancePhases = [];
  const clearedPerformancePhases = [];
  const deliveryAcks = [];
  const deliveryLifecycle = [];
  const chatApi = {
    async streamAssistantReply(_payload, onDelta, options) {
      if (typeof streamAssistantReplyImpl === "function") {
        return streamAssistantReplyImpl(_payload, onDelta, options);
      }
      onDelta("hello");
      if (emitTurn) {
        options.onCompanionTurn({
          version: 1,
          id: "chat-contract-test",
          reply_text: "hello",
          spoken_text: "hello",
          performance: {
            emotion: "playful",
            action: "wave",
            intensity: "high",
            voice_style: "teasing",
            source: "character_runtime"
          }
        });
      }
      return "hello";
    }
  };
  const windowObject = {
    AbortController,
    TaffyModules: { chatApi },
    setTimeout: setTimeoutImpl,
    clearTimeout: clearTimeoutImpl
  };
  const controller = chatReplyController.createController({
    state,
    ui: {},
    windowObject,
    performanceObject,
    createPerfTraceId: () => "chat-contract-test",
    shouldUseStreamSpeak: () => true,
    appendMessage: (_role, text) => {
      const row = { text: String(text || "") };
      rows.push(row);
      return row;
    },
    setMessageText: (row, text) => { row.text = String(text || ""); },
    finalizePendingMessageRow: (row, _role, text) => {
      row.text = String(text || "");
      deliveryLifecycle.push("finalize");
    },
    parseToolMetaFromText: (text) => ({ visibleText: String(text || ""), meta: [] }),
    normalizeAssistantVisibleText: (text) => String(text || "").trim(),
    detectMood: () => "neutral",
    resolveTalkStyle: () => "neutral",
    feedStreamSpeakDelta: (delta, sessionId, style, options) => {
      fedDeltas.push(delta);
      if (typeof feedStreamSpeakDeltaImpl === "function") {
        return feedStreamSpeakDeltaImpl(delta, sessionId, style, options, state);
      }
      return undefined;
    },
    buildPerformanceCue: (input) => {
      cues.push(input);
      return {
        source: input.performancePlan ? "companion_turn" : "default",
        emotion: input.performancePlan?.emotion || "neutral",
        action: input.performancePlan?.action || "none",
        intensity: input.performancePlan?.intensity || "medium",
        voiceStyle: input.performancePlan?.voice_style || "neutral",
        talkStyle: "playful",
        live2dMood: "happy",
        speech: { motionStrength: 1.5 }
      };
    },
    applySpeechPerformanceCue: (cue) => appliedCues.push(cue),
    triggerPerformanceCueMotion: (...args) => textMotionCues.push(args),
    buildEarlyPreReactionPlan: typeof buildEarlyPreReactionPlanImpl === "function"
      ? buildEarlyPreReactionPlanImpl
      : () => null,
    executeEarlyPreReactionPlan: typeof executeEarlyPreReactionPlanImpl === "function"
      ? executeEarlyPreReactionPlanImpl
      : () => null,
    publishPerformancePhase: (input) => {
      publishedPerformancePhases.push(input);
      return true;
    },
    clearPerformancePhase: (input) => {
      clearedPerformancePhases.push(input);
      return true;
    },
    buildPerformanceTimeline: typeof buildPerformanceTimelineImpl === "function"
      ? buildPerformanceTimelineImpl
      : () => null,
    executePerformanceTimelinePhase: typeof executePerformanceTimelinePhase === "function"
      ? executePerformanceTimelinePhase
      : () => false,
    schedulePerformanceTimelineSpeechBeats: typeof schedulePerformanceTimelineSpeechBeats === "function"
      ? schedulePerformanceTimelineSpeechBeats
      : () => 0,
    flushStreamSpeak: typeof flushStreamSpeakImpl === "function" ? flushStreamSpeakImpl : () => {},
    scheduleFinalSpeechWatchdog: typeof scheduleFinalSpeechWatchdogImpl === "function"
      ? scheduleFinalSpeechWatchdogImpl
      : () => {},
    buildVoiceTimeline: typeof buildVoiceTimelineImpl === "function"
      ? buildVoiceTimelineImpl
      : () => ({ enabled: false }),
    buildVoiceSpeechSegments: typeof buildVoiceSpeechSegmentsImpl === "function"
      ? buildVoiceSpeechSegmentsImpl
      : undefined,
    buildSpeakProsody: () => ({}),
    requestServerTTSBlobWithRetry: async (text, prosody, options) => {
      prewarmRequests.push({ text, prosody, options });
      if (typeof requestServerTTSBlobWithRetry === "function") {
        return requestServerTTSBlobWithRetry(text, prosody, options);
      }
      return { size: 1 };
    },
    playAudioBlob: async (blob, options) => {
      played.push({ blob, options });
      if (typeof playAudioBlobImpl === "function") {
        return playAudioBlobImpl(blob, options);
      }
      return true;
    },
    speak: async (text, options) => {
      spoken.push({ text, options });
      if (typeof speakImpl === "function") {
        return await speakImpl(text, options);
      }
      return true;
    },
    maybePlayTalkGesture: typeof maybePlayTalkGesture === "function" ? maybePlayTalkGesture : () => {},
    setStatus: () => {},
    stopAllAudioPlayback: () => {},
    stopWakeWordListener: () => {},
    pauseMicForAssistant,
    resumeMicAfterAssistant,
    clearThinkingMotionTimer: () => {},
    clearPerformanceTimelineTimers: () => {},
    updateMicButton: () => {},
    scheduleWakeWordStart: () => {},
    finishPerformanceAudit: () => {},
    recordPerformanceAuditEvent: typeof recordPerformanceAuditEvent === "function"
      ? recordPerformanceAuditEvent
      : () => {},
    recordTTSDebugEvent: () => {},
    deliveryAckQueue,
    getPendingDeliveryReceiptIds,
    acknowledgeDeliveredTurn: (deliveryId) => {
      deliveryLifecycle.push("ack");
      deliveryAcks.push(deliveryId);
      if (typeof acknowledgeDeliveredTurnImpl === "function") {
        return acknowledgeDeliveredTurnImpl(deliveryId);
      }
      return Promise.resolve(true);
    },
    startPerformanceAudit: () => null,
    buildChatFailureDoctorHint: () => "failed"
  });
  return {
    state,
    controller,
    fedDeltas,
    spoken,
    cues,
    appliedCues,
    textMotionCues,
    prewarmRequests,
    played,
    rows,
    publishedPerformancePhases,
    clearedPerformancePhases,
    deliveryAcks,
    deliveryLifecycle
  };
}

async function testCompanionTurnDefersRealtimeTtsUntilFinalPlan() {
  const harness = makeController({ companionTurnEnabled: true, emitTurn: true });
  const ok = await harness.controller.requestAssistantReply("hi", {
    showUser: false,
    rememberUser: false,
    rememberAssistant: false
  });

  assert.strictEqual(ok, true);
  assert.deepStrictEqual(harness.fedDeltas, [], "turn mode must not speak mutable stream deltas");
  assert.strictEqual(harness.spoken.length, 1);
  assert.strictEqual(harness.spoken[0].text, "hello");
  assert.strictEqual(harness.cues[0].performancePlan.emotion, "playful");
  assert.deepStrictEqual(harness.appliedCues, [], "speech-enabled replies should wait for actual TTS playback before applying a cue");
  assert.strictEqual(harness.spoken[0].options.performanceCue.source, "companion_turn");
  assert.strictEqual(harness.rows.at(-1).text, "hello");
}

async function testLegacyStreamKeepsRealtimeDeltaPath() {
  const harness = makeController({ companionTurnEnabled: false, emitTurn: false });
  const ok = await harness.controller.requestAssistantReply("hi", {
    showUser: false,
    rememberUser: false,
    rememberAssistant: false
  });

  assert.strictEqual(ok, true);
  assert.deepStrictEqual(harness.fedDeltas, ["hello"], "legacy mode must preserve realtime stream TTS behavior");
}

async function testTextOnlyCompanionTurnStillAppliesOneVisualCue() {
  const harness = makeController({ companionTurnEnabled: true, emitTurn: true, speakingEnabled: false });
  const ok = await harness.controller.requestAssistantReply("hi", {
    showUser: false,
    rememberUser: false,
    rememberAssistant: false
  });

  assert.strictEqual(ok, true);
  assert.strictEqual(harness.appliedCues.length, 1, "text-only reply should apply its cue without waiting for unavailable TTS");
  assert.strictEqual(harness.appliedCues[0].source, "companion_turn");
  assert.strictEqual(harness.textMotionCues.length, 1, "text-only reply should dispatch one visible cue motion");
  assert.strictEqual(harness.textMotionCues[0][0].source, "companion_turn");
  assert.ok(
    harness.state.conversationLastTtsFinishedAt > 0,
    "text-only replies should establish a delivery endpoint for low-interruption follow-ups"
  );
}

async function testEarlyPreReactionPublishesOneCompactDetachedPhase() {
  const earlyPlan = {
    enabled: true,
    updated_at: Date.now(),
    preReaction: {
      name: "thinking_nod",
      actionIntent: "thinking",
      actionStyle: "steady",
      actionMood: "thinking",
      pulseStyle: "steady",
      pulseBoost: 0.32,
      pulseDurationMs: 220,
      motionCue: "thinking_nod",
      motionRole: "pre_reaction"
    }
  };
  const harness = makeController({
    companionTurnEnabled: false,
    emitTurn: false,
    speakingEnabled: false,
    buildEarlyPreReactionPlanImpl: () => earlyPlan,
    executeEarlyPreReactionPlanImpl: () => ({ actual: "dispatched", updated_at: Date.now() })
  });
  const ok = await harness.controller.requestAssistantReply("Please think about this", {
    showUser: false,
    rememberUser: false,
    rememberAssistant: false
  });

  assert.strictEqual(ok, true);
  assert.strictEqual(harness.publishedPerformancePhases.length, 1, "one early reaction should publish one detached-model phase");
  const phase = harness.publishedPerformancePhases[0];
  assert.strictEqual(phase.phase, "pre_reaction");
  assert.strictEqual(phase.phasePlan.actionIntent, "thinking");
  assert.ok(!Object.hasOwn(phase, "text"), "chat reply should pass no user transcript into the detached performance phase");
  assert.ok(
    harness.clearedPerformancePhases.some((item) => item?.reason === "new_chat_turn")
      && harness.clearedPerformancePhases.some((item) => item?.reason === "chat_turn_finished"),
    "the detached phase should be cleared on both new-turn and completed-turn boundaries"
  );
}

async function testPendingReplyPublishesAndClearsDetachedThinkingPhase() {
  const timers = [];
  const pendingReply = deferred();
  let onDelta = null;
  const harness = makeController({
    companionTurnEnabled: false,
    emitTurn: false,
    speakingEnabled: false,
    setTimeoutImpl: (fn, ms) => {
      timers.push({ fn, ms });
      return timers.length;
    },
    clearTimeoutImpl: () => {},
    streamAssistantReplyImpl: async (_payload, receiveDelta) => {
      onDelta = receiveDelta;
      return await pendingReply.promise;
    }
  });
  const request = harness.controller.requestAssistantReply("wait with me", {
    showUser: false,
    rememberUser: false,
    rememberAssistant: false
  });
  await waitForMicrotaskCondition(
    () => typeof onDelta === "function" && timers.some((item) => item.ms === 520),
    "a pending reply should schedule its bounded thinking phase"
  );
  timers.find((item) => item.ms === 520).fn();
  assert.ok(
    harness.publishedPerformancePhases.some((item) => item.phase === "thinking_wait"),
    "a still-pending reply should mirror one compact thinking phase to the detached model"
  );

  onDelta("hello");
  pendingReply.resolve("hello");
  assert.strictEqual(await request, true);
  assert.ok(
    harness.clearedPerformancePhases.some((item) => item?.reason === "first_reply_delta"),
    "first visible reply text should clear the detached thinking phase before speech or a newer turn"
  );
}

async function testDirectSpeechTimelineWaitsForActualPlayback() {
  const pendingSpeech = deferred();
  const phases = [];
  const timeline = {
    preReaction: { name: "pre" },
    speechStart: { name: "speech" },
    postSettle: { name: "settle" }
  };
  const harness = makeController({
    companionTurnEnabled: true,
    emitTurn: true,
    buildPerformanceTimelineImpl: () => timeline,
    executePerformanceTimelinePhase: (_timeline, phaseName) => {
      phases.push(phaseName);
      return true;
    },
    speakImpl: async () => await pendingSpeech.promise
  });

  const request = harness.controller.requestAssistantReply("hi", {
    showUser: false,
    rememberUser: false,
    rememberAssistant: false
  });
  await waitForMicrotaskCondition(
    () => harness.spoken.length === 1,
    "direct reply should prepare speech before playback begins"
  );
  assert.deepStrictEqual(phases, ["preReaction"], "direct reply must not start the speech timeline while TTS is pending");

  const onPlaybackStart = harness.spoken[0].options.onPlaybackStart;
  assert.strictEqual(typeof onPlaybackStart, "function", "direct speech should forward an actual-playback callback");
  onPlaybackStart({ source: "browser_tts", playbackGeneration: harness.state.ttsPlaybackGeneration });
  onPlaybackStart({ source: "browser_tts", playbackGeneration: harness.state.ttsPlaybackGeneration });
  assert.deepStrictEqual(phases, ["preReaction", "speechStart"], "direct timeline should start exactly once at actual playback");
  assert.ok(
    harness.clearedPerformancePhases.some((item) => item?.reason === "speech_started"),
    "the detached pre-reaction phase should clear as soon as actual speech begins"
  );

  pendingSpeech.resolve(true);
  assert.strictEqual(await request, true);
  assert.deepStrictEqual(phases, ["preReaction", "speechStart", "postSettle"], "direct timeline should settle only after delivered speech completes");
}

async function testBrowserVoiceTimelinePreservesTurnGenerationAcrossSegments() {
  const phases = [];
  const preserveFlags = [];
  const playbackGenerations = [];
  const timeline = {
    preReaction: { name: "pre" },
    speechStart: { name: "speech" },
    postSettle: { name: "settle" }
  };
  const harness = makeController({
    companionTurnEnabled: true,
    emitTurn: true,
    buildPerformanceTimelineImpl: () => timeline,
    executePerformanceTimelinePhase: (_timeline, phaseName) => {
      phases.push(phaseName);
      return true;
    },
    buildVoiceTimelineImpl: () => ({
      enabled: true,
      delivery: "segmented",
      pre_pause_ms: 0,
      inter_segment_pause_ms: 0
    }),
    buildVoiceSpeechSegmentsImpl: () => ["First.", "Second."],
    speakImpl: async (_text, options) => {
      preserveFlags.push(options.preserveTurnPlaybackGeneration);
      playbackGenerations.push(options.playbackGeneration);
      options.onPlaybackStart?.({
        source: "browser_tts",
        playbackGeneration: harness.state.ttsPlaybackGeneration,
        sessionId: options.sessionId
      });
      return true;
    }
  });

  assert.strictEqual(await harness.controller.requestAssistantReply("hi", {
    showUser: false,
    rememberUser: false,
    rememberAssistant: false
  }), true);

  assert.deepStrictEqual(harness.spoken.map((item) => item.text), ["First.", "Second."]);
  assert.deepStrictEqual(preserveFlags, [true, true], "each Browser fallback segment should preserve its assistant-turn generation");
  assert.ok(
    playbackGenerations.every((generation) => generation === harness.state.ttsPlaybackGeneration),
    "all segments should be leased to the same playback generation"
  );
  assert.deepStrictEqual(phases, ["preReaction", "speechStart", "postSettle"], "segmented direct speech should start and settle its timeline exactly once");
}

async function testFailedDirectSpeechCannotStartSpeechTimelineOrGesture() {
  const phases = [];
  const gestures = [];
  const timeline = {
    preReaction: { name: "pre" },
    speechStart: { name: "speech" },
    postSettle: { name: "settle" }
  };
  const failedTimelineHarness = makeController({
    companionTurnEnabled: true,
    emitTurn: true,
    buildPerformanceTimelineImpl: () => timeline,
    executePerformanceTimelinePhase: (_timeline, phaseName) => {
      phases.push(phaseName);
      return true;
    },
    speakImpl: async () => false
  });
  assert.strictEqual(await failedTimelineHarness.controller.requestAssistantReply("hi", {
    showUser: false,
    rememberUser: false,
    rememberAssistant: false
  }), true);
  assert.deepStrictEqual(phases, ["preReaction"], "failed direct TTS must not start or settle a speech timeline");

  const pendingSpeech = deferred();
  const gestureHarness = makeController({
    companionTurnEnabled: true,
    emitTurn: true,
    maybePlayTalkGesture: (...args) => gestures.push(args),
    speakImpl: async () => await pendingSpeech.promise
  });
  const request = gestureHarness.controller.requestAssistantReply("hi", {
    showUser: false,
    rememberUser: false,
    rememberAssistant: false
  });
  await waitForMicrotaskCondition(() => gestureHarness.spoken.length === 1, "gesture test should prepare direct speech");
  assert.strictEqual(gestures.length, 0, "direct speech must not start a talk gesture before actual playback");
  gestureHarness.spoken[0].options.onPlaybackStart({
    source: "browser_tts",
    playbackGeneration: gestureHarness.state.ttsPlaybackGeneration
  });
  assert.strictEqual(gestures.length, 1, "direct speech should start its fallback gesture only at actual playback");
  pendingSpeech.resolve(true);
  assert.strictEqual(await request, true);
}

async function testLateStreamTimelineAttachesToNextActualSegment() {
  let now = 100;
  const phases = [];
  const auditEvents = [];
  const callbacks = [];
  const timeline = {
    preReaction: { name: "pre" },
    speechStart: { name: "speech" },
    postSettle: { name: "settle" }
  };
  const harness = makeController({
    companionTurnEnabled: false,
    emitTurn: false,
    performanceObject: { now: () => now },
    buildPerformanceTimelineImpl: () => timeline,
    executePerformanceTimelinePhase: (_timeline, phaseName) => {
      phases.push(phaseName);
      return true;
    },
    recordPerformanceAuditEvent: (event, payload) => auditEvents.push({ event, payload }),
    streamAssistantReplyImpl: async (_payload, onDelta) => {
      onDelta("hello");
      now = 420;
      return "hello";
    },
    feedStreamSpeakDeltaImpl: (_delta, sessionId, _style, options, state) => {
      state.streamSpeakLastEnqueueSession = sessionId;
      state.streamSpeakPlayedSession = sessionId;
      state.streamSpeakWorking = true;
      callbacks.push(options.onPlaybackStart);
      options.onPlaybackStart({
        source: "server_tts",
        playbackGeneration: state.ttsPlaybackGeneration,
        sessionId
      });
    }
  });

  assert.strictEqual(await harness.controller.requestAssistantReply("hi", {
    showUser: false,
    rememberUser: false,
    rememberAssistant: false
  }), true);
  assert.ok(callbacks.length >= 1, "stream path should receive an actual-playback callback");
  assert.ok(
    auditEvents.some((item) => item.event === "stream_timeline_wait_next_audio"),
    "late semantic plans should be auditable instead of replaying a stale speech-start pose"
  );
  assert.deepStrictEqual(phases, ["preReaction"], "a late final plan must not replay speechStart on an already-playing segment");
  callbacks[0]({
    source: "server_tts",
    playbackGeneration: harness.state.ttsPlaybackGeneration,
    sessionId: harness.state.streamSpeakSession
  });
  assert.ok(phases.includes("speechStart"), "the final stream plan should attach when the next real audio segment starts");
}

async function waitForMicrotaskCondition(predicate, message) {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    if (predicate()) {
      return;
    }
    await Promise.resolve();
  }
  assert.ok(predicate(), message);
}

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

function makeCompanionTurn(text) {
  return {
    version: 1,
    id: "chat-prewarm-test",
    reply_text: text,
    spoken_text: text,
    performance: {
      emotion: "playful",
      action: "wave",
      intensity: "high",
      voice_style: "teasing",
      source: "character_runtime"
    }
  };
}

async function testCompanionPrewarmReusesOnlyConfirmedExactPrefix() {
  const stablePrefix = "The first stable sentence is ready.";
  const finalReply = `${stablePrefix} The second part follows.`;
  const prewarmAudio = { size: 48, id: "prewarm-audio" };
  const stream = deferred();
  const prewarm = deferred();
  let streamOptions = null;
  const harness = makeController({
    companionTurnEnabled: true,
    emitTurn: false,
    modelDirectReply: true,
    ttsProvider: "gpt_sovits",
    requestServerTTSBlobWithRetry: () => prewarm.promise,
    streamAssistantReplyImpl: (_payload, onDelta, options) => {
      streamOptions = options;
      onDelta(`${stablePrefix} `);
      return stream.promise;
    }
  });

  const request = harness.controller.requestAssistantReply("hi", {
    showUser: false,
    rememberUser: false,
    rememberAssistant: false
  });
  await waitForMicrotaskCondition(
    () => harness.prewarmRequests.length === 1,
    "a stable draft sentence should begin exactly one prewarm request"
  );
  assert.strictEqual(harness.prewarmRequests[0].text, stablePrefix);
  assert.strictEqual(harness.prewarmRequests[0].options.retries, 0);
  assert.strictEqual(harness.played.length, 0, "draft audio must remain silent before the final turn");
  assert.strictEqual(harness.spoken.length, 0, "draft audio must not use normal speech before confirmation");

  prewarm.resolve(prewarmAudio);
  await Promise.resolve();
  await Promise.resolve();
  assert.strictEqual(harness.played.length, 0, "a ready blob must still remain silent before final confirmation");
  assert.strictEqual(harness.spoken.length, 0);

  streamOptions.onCompanionTurn(makeCompanionTurn(finalReply));
  stream.resolve(finalReply);
  assert.strictEqual(await request, true);
  assert.strictEqual(harness.played.length, 1, "the confirmed prefix should reuse the prefetched blob once");
  assert.strictEqual(harness.played[0].blob, prewarmAudio);
  assert.strictEqual(harness.played[0].options.text, stablePrefix);
  assert.deepStrictEqual(
    harness.spoken.map((item) => item.text),
    ["The second part follows."],
    "only the remaining canonical tail should use normal speech"
  );
}

async function testCompanionPrewarmMismatchFallsBackWithoutStaleAudio() {
  const stablePrefix = "The first stable sentence is ready.";
  const finalReply = "A different final sentence replaces the draft.";
  const stream = deferred();
  const prewarm = deferred();
  let streamOptions = null;
  const harness = makeController({
    companionTurnEnabled: true,
    emitTurn: false,
    modelDirectReply: true,
    ttsProvider: "gpt_sovits",
    requestServerTTSBlobWithRetry: () => prewarm.promise,
    streamAssistantReplyImpl: (_payload, onDelta, options) => {
      streamOptions = options;
      onDelta(`${stablePrefix} `);
      return stream.promise;
    }
  });

  const request = harness.controller.requestAssistantReply("hi", {
    showUser: false,
    rememberUser: false,
    rememberAssistant: false
  });
  await waitForMicrotaskCondition(() => harness.prewarmRequests.length === 1, "prewarm request should start");
  prewarm.resolve({ size: 48, id: "mismatched-prewarm" });
  await Promise.resolve();
  streamOptions.onCompanionTurn(makeCompanionTurn(finalReply));
  stream.resolve(finalReply);
  assert.strictEqual(await request, true);
  assert.strictEqual(harness.prewarmRequests[0].options.signal.aborted, true, "mismatched prewarm should be discarded");
  assert.strictEqual(harness.played.length, 0, "mismatched draft audio must never play");
  assert.deepStrictEqual(harness.spoken.map((item) => item.text), [finalReply]);
}

async function testFailedCompanionPrewarmUsesFinalSpeechOnce() {
  const stablePrefix = "The first stable sentence is ready.";
  const finalReply = `${stablePrefix} The second part follows.`;
  const stream = deferred();
  const prewarm = deferred();
  let streamOptions = null;
  const harness = makeController({
    companionTurnEnabled: true,
    emitTurn: false,
    modelDirectReply: true,
    ttsProvider: "gpt_sovits",
    requestServerTTSBlobWithRetry: () => prewarm.promise,
    streamAssistantReplyImpl: (_payload, onDelta, options) => {
      streamOptions = options;
      onDelta(`${stablePrefix} `);
      return stream.promise;
    }
  });

  const request = harness.controller.requestAssistantReply("hi", {
    showUser: false,
    rememberUser: false,
    rememberAssistant: false
  });
  await waitForMicrotaskCondition(() => harness.prewarmRequests.length === 1, "prewarm request should start");
  prewarm.reject(new Error("TTS unavailable"));
  streamOptions.onCompanionTurn(makeCompanionTurn(finalReply));
  stream.resolve(finalReply);
  assert.strictEqual(await request, true);
  assert.strictEqual(harness.played.length, 0, "failed prewarm must not be played");
  assert.deepStrictEqual(harness.spoken.map((item) => item.text), [finalReply]);
}

async function testInterruptedCompanionPrewarmAbortsAndLateBlobCannotPlay() {
  const stablePrefix = "The first stable sentence is ready.";
  const stream = deferred();
  const prewarm = deferred();
  const harness = makeController({
    companionTurnEnabled: true,
    emitTurn: false,
    modelDirectReply: true,
    ttsProvider: "gpt_sovits",
    requestServerTTSBlobWithRetry: () => prewarm.promise,
    streamAssistantReplyImpl: (_payload, onDelta) => {
      onDelta(`${stablePrefix} `);
      return stream.promise;
    }
  });

  const request = harness.controller.requestAssistantReply("hi", {
    showUser: false,
    rememberUser: false,
    rememberAssistant: false
  });
  await waitForMicrotaskCondition(() => harness.prewarmRequests.length === 1, "prewarm request should start");
  assert.strictEqual(harness.controller.interruptActiveChatTurn("test", { bypassProtection: true }), true);
  assert.strictEqual(harness.prewarmRequests[0].options.signal.aborted, true, "interruption should abort the owned prewarm request");
  stream.resolve(`${stablePrefix} The stale tail must not speak.`);
  assert.strictEqual(await request, false);
  prewarm.resolve({ size: 48, id: "late-prewarm" });
  await Promise.resolve();
  await Promise.resolve();
  assert.strictEqual(harness.played.length, 0, "a late aborted blob must never play");
  assert.strictEqual(harness.spoken.length, 0, "an interrupted turn must not speak a stale draft or final reply");
}

async function testInterruptedFinalSpeechReceivesChatAbortSignal() {
  let finalSpeechSignal = null;
  const harness = makeController({
    companionTurnEnabled: true,
    emitTurn: true,
    speakImpl: async (_text, options) => new Promise((resolve) => {
      finalSpeechSignal = options.signal || null;
      if (finalSpeechSignal?.aborted === true) {
        resolve(false);
        return;
      }
      finalSpeechSignal?.addEventListener("abort", () => resolve(false), { once: true });
    })
  });

  const request = harness.controller.requestAssistantReply("hi", {
    showUser: false,
    rememberUser: false,
    rememberAssistant: false
  });
  await waitForMicrotaskCondition(() => !!finalSpeechSignal, "final speech should receive a turn signal");
  assert.strictEqual(harness.controller.interruptActiveChatTurn("test", { bypassProtection: true }), true);
  assert.strictEqual(finalSpeechSignal.aborted, true, "interrupting a turn must abort its direct final-speech signal");
  assert.strictEqual(await request, false, "a cancelled final speech path must not complete the old turn");
}

async function testInterruptedSegmentPauseSettlesPromptly() {
  const harness = makeController({
    companionTurnEnabled: true,
    emitTurn: true,
    setTimeoutImpl: setTimeout,
    clearTimeoutImpl: clearTimeout,
    buildVoiceTimelineImpl: () => ({
      enabled: true,
      pre_pause_ms: 1000,
      inter_segment_pause_ms: 0
    }),
    buildVoiceSpeechSegmentsImpl: () => ["first sentence", "second sentence"]
  });
  const request = harness.controller.requestAssistantReply("hi", {
    showUser: false,
    rememberUser: false,
    rememberAssistant: false
  });

  await waitForMicrotaskCondition(
    () => Array.isArray(harness.state.performanceTimelineTimers) && harness.state.performanceTimelineTimers.length > 0,
    "segmented speech should be waiting on its pre-pause"
  );
  assert.strictEqual(harness.controller.interruptActiveChatTurn("test", { bypassProtection: true }), true);
  assert.strictEqual(await request, false, "interrupting a voice-timeline pause must settle the old turn");
  assert.strictEqual(harness.spoken.length, 0, "a cancelled pause must not advance into stale speech");
}

async function testInterruptedTurnAlwaysReleasesItsOwnMicPauseLease() {
  const pendingStreams = [];
  let micPauseDepth = 0;
  let pauseCalls = 0;
  let resumeCalls = 0;
  const harness = makeController({
    companionTurnEnabled: false,
    emitTurn: false,
    pauseMicForAssistant: () => {
      pauseCalls += 1;
      micPauseDepth += 1;
      return true;
    },
    resumeMicAfterAssistant: () => {
      resumeCalls += 1;
      micPauseDepth -= 1;
      return true;
    },
    streamAssistantReplyImpl: (_payload, onDelta) => new Promise((resolve) => {
      pendingStreams.push({ resolve, onDelta });
    })
  });

  const first = harness.controller.requestAssistantReply("first turn", {
    showUser: false,
    rememberUser: false,
    rememberAssistant: false
  });
  await waitForMicrotaskCondition(() => pauseCalls === 1 && pendingStreams.length === 1, "first turn should acquire one mic pause lease");

  const second = harness.controller.requestAssistantReply("second turn", {
    showUser: false,
    rememberUser: false,
    rememberAssistant: false,
    interruptActive: true
  });
  await waitForMicrotaskCondition(() => pauseCalls === 2 && pendingStreams.length === 2, "replacement turn should acquire a second mic pause lease");
  assert.strictEqual(micPauseDepth, 2, "two overlapping turn lifecycles should hold two independent pause leases");

  pendingStreams[0].onDelta("first reply");
  pendingStreams[0].resolve("first reply");
  await first;
  assert.strictEqual(resumeCalls, 1, "the stale interrupted turn must release its own lease");
  assert.strictEqual(micPauseDepth, 1, "stale cleanup must not resume the microphone while the replacement turn still owns a lease");

  pendingStreams[1].onDelta("second reply");
  pendingStreams[1].resolve("second reply");
  await second;
  assert.strictEqual(resumeCalls, 2, "the replacement turn should release its lease after completion");
  assert.strictEqual(micPauseDepth, 0, "all turn-owned mic pause leases should be released after the final turn completes");
}

async function testRealtimeStreamKeepsMicLeaseUntilAudibleTailSettles() {
  const audibleTail = deferred();
  let micPauseDepth = 0;
  let pauseCalls = 0;
  let resumeCalls = 0;
  const harness = makeController({
    companionTurnEnabled: false,
    emitTurn: false,
    pauseMicForAssistant: () => {
      pauseCalls += 1;
      micPauseDepth += 1;
      return true;
    },
    resumeMicAfterAssistant: () => {
      resumeCalls += 1;
      micPauseDepth -= 1;
      return true;
    },
    streamAssistantReplyImpl: async (_payload, onDelta) => {
      onDelta("Queued voice reply.");
      return "Queued voice reply.";
    },
    feedStreamSpeakDeltaImpl: (_delta, sessionId, _style, _options, state) => {
      state.streamSpeakLastEnqueueSession = sessionId;
      state.streamSpeakPlayedSession = sessionId;
      state.streamSpeakWorking = true;
    },
    scheduleFinalSpeechWatchdogImpl: () => audibleTail.promise
  });

  const request = harness.controller.requestAssistantReply("hi", {
    showUser: false,
    rememberUser: false,
    rememberAssistant: false
  });
  await waitForMicrotaskCondition(
    () => pauseCalls === 1 && harness.state.chatBusy === false,
    "the text turn should finish while its queued realtime audio tail remains active"
  );
  assert.strictEqual(resumeCalls, 0, "the microphone lease must remain held after the LLM stream finishes but before queued audio settles");
  assert.strictEqual(micPauseDepth, 1, "the stream tail should still own exactly one microphone pause lease");

  audibleTail.resolve({ status: "completed" });
  assert.strictEqual(await request, true);
  await waitForMicrotaskCondition(
    () => resumeCalls === 1,
    "settling the queued audio tail should release its owning microphone lease once"
  );
  assert.strictEqual(micPauseDepth, 0, "the microphone should resume only after the audible tail has settled");
}

async function testInterruptedStreamTailReleasesOnlyItsOwnMicPauseLease() {
  let calls = 0;
  let secondStream = null;
  let micPauseDepth = 0;
  let pauseCalls = 0;
  let resumeCalls = 0;
  const harness = makeController({
    companionTurnEnabled: false,
    emitTurn: false,
    pauseMicForAssistant: () => {
      pauseCalls += 1;
      micPauseDepth += 1;
      return true;
    },
    resumeMicAfterAssistant: () => {
      resumeCalls += 1;
      micPauseDepth -= 1;
      return true;
    },
    streamAssistantReplyImpl: (_payload, onDelta) => {
      calls += 1;
      if (calls === 1) {
        onDelta("First queued reply.");
        return Promise.resolve("First queued reply.");
      }
      return new Promise((resolve) => {
        secondStream = { resolve, onDelta };
      });
    },
    feedStreamSpeakDeltaImpl: (_delta, sessionId, _style, _options, state) => {
      if (calls !== 1) {
        return;
      }
      state.streamSpeakLastEnqueueSession = sessionId;
      state.streamSpeakPlayedSession = sessionId;
      state.streamSpeakWorking = true;
    },
    scheduleFinalSpeechWatchdogImpl: ({ signal }) => new Promise((resolve) => {
      if (signal?.aborted === true) {
        resolve({ status: "cancelled" });
        return;
      }
      signal?.addEventListener("abort", () => resolve({ status: "cancelled" }), { once: true });
    })
  });

  const first = harness.controller.requestAssistantReply("first turn", {
    showUser: false,
    rememberUser: false,
    rememberAssistant: false
  });
  await waitForMicrotaskCondition(
    () => pauseCalls === 1 && harness.state.chatBusy === false,
    "the first stream should retain its lease after text finalization"
  );

  const second = harness.controller.requestAssistantReply("second turn", {
    showUser: false,
    rememberUser: false,
    rememberAssistant: false,
    interruptActive: true
  });
  await waitForMicrotaskCondition(
    () => pauseCalls === 2 && !!secondStream,
    "a replacement turn should acquire an independent microphone pause lease"
  );
  assert.strictEqual(await first, true, "the interrupted stream shell should settle after its cancellation signal reaches the audio waiter");
  assert.strictEqual(resumeCalls, 1, "cancelling the first stream tail should release only its own lease");
  assert.strictEqual(micPauseDepth, 1, "the replacement turn must keep the microphone paused after stale-tail cleanup");

  secondStream.onDelta("Second reply.");
  secondStream.resolve("Second reply.");
  assert.strictEqual(await second, true);
  assert.strictEqual(resumeCalls, 2, "the replacement turn should release its own lease after it completes");
  assert.strictEqual(micPauseDepth, 0, "both independently owned microphone pause leases should settle cleanly");
}

async function testDeliveredReplyAcknowledgesOnlyAfterVisibleFinalization() {
  const deliveryId = "delivery_receipt_0123456789abcd";
  const harness = makeController({
    companionTurnEnabled: false,
    emitTurn: false,
    streamAssistantReplyImpl: async (_payload, onDelta, options) => {
      onDelta("Visible reply.");
      options.onDeliveryId(deliveryId);
      return "Visible reply.";
    }
  });

  assert.strictEqual(await harness.controller.requestAssistantReply("hi", {
    showUser: false,
    rememberUser: false,
    rememberAssistant: false
  }), true);
  assert.deepStrictEqual(harness.deliveryAcks, [deliveryId], "a current finalized reply should acknowledge its opaque delivery receipt exactly once");
  assert.ok(
    harness.deliveryLifecycle.indexOf("finalize") < harness.deliveryLifecycle.indexOf("ack"),
    "the delivery acknowledgement must begin only after the visible assistant row is finalized"
  );
}


async function testDeliveredReplyQueuesReceiptAndCarriesPendingBarrierIds() {
  const deliveryId = "delivery_receipt_0123456789abcd";
  const queued = [];
  let capturedPayload = null;
  let harness = null;
  const deliveryAckQueue = {
    enqueue(id) {
      queued.push(id);
      harness.deliveryLifecycle.push("queue");
      return true;
    }
  };
  harness = makeController({
    companionTurnEnabled: false,
    emitTurn: false,
    deliveryAckQueue,
    getPendingDeliveryReceiptIds: () => ["delivery_receipt_0123456789prior"],
    streamAssistantReplyImpl: async (payload, onDelta, options) => {
      capturedPayload = payload;
      onDelta("Visible reply.");
      options.onDeliveryId(deliveryId);
      return "Visible reply.";
    }
  });

  assert.strictEqual(await harness.controller.requestAssistantReply("hi", {
    showUser: false,
    rememberUser: false,
    rememberAssistant: false
  }), true);
  assert.deepStrictEqual(capturedPayload.client_capabilities, { delivered_turn_receipt_v1: true });
  assert.deepStrictEqual(capturedPayload.pending_delivery_ids, ["delivery_receipt_0123456789prior"]);
  assert.deepStrictEqual(queued, [deliveryId]);
  assert.deepStrictEqual(harness.deliveryAcks, [], "the durable queue replaces the one-shot direct ACK path");
  assert.ok(
    harness.deliveryLifecycle.indexOf("finalize") < harness.deliveryLifecycle.indexOf("queue"),
    "the retry queue must receive a receipt only after the visible row is finalized"
  );
}

async function testCancelledOrFailedDeliveryNeverBreaksVisibleChat() {
  const deliveryId = "delivery_receipt_0123456789abcd";
  let pending = null;
  const cancelledHarness = makeController({
    companionTurnEnabled: false,
    emitTurn: false,
    streamAssistantReplyImpl: (_payload, onDelta, options) => new Promise((resolve) => {
      pending = { resolve, onDelta, options };
    })
  });
  const cancelledRequest = cancelledHarness.controller.requestAssistantReply("hi", {
    showUser: false,
    rememberUser: false,
    rememberAssistant: false
  });
  await waitForMicrotaskCondition(() => !!pending, "the cancellable stream should begin before its receipt is delivered");
  assert.strictEqual(cancelledHarness.controller.interruptActiveChatTurn("test", { bypassProtection: true }), true);
  pending.options.onDeliveryId(deliveryId);
  pending.onDelta("Stale reply.");
  pending.resolve("Stale reply.");
  assert.strictEqual(await cancelledRequest, false);
  assert.deepStrictEqual(cancelledHarness.deliveryAcks, [], "a stale/cancelled turn must never acknowledge a receipt after its row is discarded");

  const failedAckHarness = makeController({
    companionTurnEnabled: false,
    emitTurn: false,
    streamAssistantReplyImpl: async (_payload, onDelta, options) => {
      onDelta("Visible despite ack failure.");
      options.onDeliveryId(deliveryId);
      return "Visible despite ack failure.";
    },
    acknowledgeDeliveredTurnImpl: async () => {
      throw new Error("ack unavailable");
    }
  });
  assert.strictEqual(await failedAckHarness.controller.requestAssistantReply("hi", {
    showUser: false,
    rememberUser: false,
    rememberAssistant: false
  }), true, "an acknowledgement failure must not fail or remove the already-visible reply");
  assert.deepStrictEqual(failedAckHarness.deliveryAcks, [deliveryId]);
  assert.strictEqual(failedAckHarness.rows.at(-1).text, "Visible despite ack failure.");
}

async function main() {
  await testCompanionTurnDefersRealtimeTtsUntilFinalPlan();
  await testLegacyStreamKeepsRealtimeDeltaPath();
  await testTextOnlyCompanionTurnStillAppliesOneVisualCue();
  await testEarlyPreReactionPublishesOneCompactDetachedPhase();
  await testPendingReplyPublishesAndClearsDetachedThinkingPhase();
  await testDirectSpeechTimelineWaitsForActualPlayback();
  await testBrowserVoiceTimelinePreservesTurnGenerationAcrossSegments();
  await testFailedDirectSpeechCannotStartSpeechTimelineOrGesture();
  await testLateStreamTimelineAttachesToNextActualSegment();
  await testCompanionPrewarmReusesOnlyConfirmedExactPrefix();
  await testCompanionPrewarmMismatchFallsBackWithoutStaleAudio();
  await testFailedCompanionPrewarmUsesFinalSpeechOnce();
  await testInterruptedCompanionPrewarmAbortsAndLateBlobCannotPlay();
  await testInterruptedFinalSpeechReceivesChatAbortSignal();
  await testInterruptedSegmentPauseSettlesPromptly();
  await testInterruptedTurnAlwaysReleasesItsOwnMicPauseLease();
  await testRealtimeStreamKeepsMicLeaseUntilAudibleTailSettles();
  await testInterruptedStreamTailReleasesOnlyItsOwnMicPauseLease();
  await testDeliveredReplyAcknowledgesOnlyAfterVisibleFinalization();
  await testDeliveredReplyQueuesReceiptAndCarriesPendingBarrierIds();
  await testCancelledOrFailedDeliveryNeverBreaksVisibleChat();
  console.log("Companion turn frontend contract checks passed.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
