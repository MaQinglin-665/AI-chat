#!/usr/bin/env node
"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const chatState = require(path.join(ROOT, "web", "chatState.js"));
const chatControllerDelegates = require(path.join(ROOT, "web", "chatControllerDelegates.js"));
const chatReplyController = require(path.join(ROOT, "web", "chatReplyController.js"));
const localAsrController = require(path.join(ROOT, "web", "localAsrController.js"));
const performanceTimelineController = require(path.join(ROOT, "web", "performanceTimelineController.js"));
const INDEX_HTML = path.join(ROOT, "web", "index.html");

function makeAbortController(counter) {
  return {
    signal: { aborted: false },
    abort() {
      counter.count += 1;
      this.signal.aborted = true;
    }
  };
}

function makeReplyController(state, events, counters = {}) {
  return chatReplyController.createController({
    state,
    ui: {},
    windowObject: { setTimeout, clearTimeout, AbortController },
    performanceObject: { now: () => 100 },
    stopAllAudioPlayback: () => { counters.stopped = (counters.stopped || 0) + 1; },
    discardQueuedStreamSpeakItems: () => { counters.discarded = (counters.discarded || 0) + 1; },
    clearPerformanceTimelineTimers: () => { counters.clearedTimeline = (counters.clearedTimeline || 0) + 1; },
    clearThinkingMotionTimer: () => { counters.clearedThinking = (counters.clearedThinking || 0) + 1; },
    recordTTSDebugEvent: (event, payload) => events.push({ event, payload }),
    setStatus: (text) => events.push({ event: "status", payload: String(text || "") })
  });
}

{
  const html = fs.readFileSync(INDEX_HTML, "utf8");
  assert.ok(
    html.indexOf("./chatControllerDelegates.js") > -1 && html.indexOf("./chatControllerDelegates.js") < html.indexOf("./chat.js"),
    "chat controller delegate helper should load before chat.js"
  );
  let created = 0;
  const fallback = { fallback: true };
  const getter = chatControllerDelegates.createLazyControllerGetter({
    fallback,
    canCreate: () => true,
    create: () => {
      created += 1;
      return { answer: () => "ok" };
    }
  });

  assert.strictEqual(getter().answer(), "ok", "chat controller getter should create the controller lazily");
  assert.strictEqual(getter().answer(), "ok", "chat controller getter should reuse the same controller");
  assert.strictEqual(created, 1, "chat controller delegate should not recreate after first access");
  assert.strictEqual(
    chatControllerDelegates.invoke(getter, "answer", []),
    "ok",
    "chat controller delegate should call controller methods"
  );
  assert.strictEqual(
    chatControllerDelegates.createLazyControllerGetter({ fallback, canCreate: () => false })(),
    fallback,
    "chat controller getter should preserve fallback behavior when creation is unavailable"
  );
}

{
  const state = chatState.createInitialState();
  const events = [];
  const counters = {};
  const aborts = { count: 0 };
  state.chatBusy = true;
  state.activeChatTurnId = 41;
  state.chatAbortController = makeAbortController(aborts);
  state.ttsContextSpeaking = true;
  state.activeAssistantDraftText = "Important: do not put API keys or tokens into logs.";
  state.activeAssistantTurnStartedAt = Date.now();
  state.characterBrainLastDecision = {
    intent: "task_help",
    conversation_director: {
      interruption_policy: "finish_key_sentence_before_yield",
      reply_move: "answer"
    }
  };
  state.activeAssistantSpeechPlan = {
    interruption_policy: "finish_key_sentence_before_yield",
    intent: "task_help",
    reply_move: "answer",
    segments: [
      {
        index: 1,
        text: "Important: do not put API keys or tokens into logs.",
        role: "key",
        protected: true,
        reason: "text_signal",
        estimated_ms: 1800
      }
    ]
  };
  state.activeAssistantSpeechSegmentIndex = 1;
  state.activeAssistantSpeechSegmentRole = "key";
  state.activeAssistantSpeechSegmentStartedAt = Date.now();

  const controller = makeReplyController(state, events, counters);
  assert.strictEqual(
    controller.handleUserSpeechStart({ reason: "local_asr_speech_start" }),
    false,
    "voice barge-in should let protected key speech finish first"
  );
  assert.strictEqual(state.chatBusy, true, "protected voice barge-in should not cancel active reply");
  assert.strictEqual(aborts.count, 0, "protected voice barge-in should not abort the request");
  assert.ok(events.some((item) => item.event === "important_speech_protected"), "protected barge-in should be debuggable");

  assert.strictEqual(
    controller.interruptActiveChatTurn("manual_text_input", { bypassProtection: true }),
    true,
    "manual text input should still be able to interrupt when explicitly forced"
  );
  assert.strictEqual(state.chatBusy, false, "forced text interruption should clear active turn");
  assert.strictEqual(aborts.count, 1, "forced text interruption should abort stale request");
  assert.strictEqual(counters.stopped, 1, "forced text interruption should stop stale audio");
}

{
  const state = chatState.createInitialState();
  const sent = [];
  state.micOpen = true;
  state.history = [{ role: "assistant", content: "We are tuning Live2D, ASR, and GPT-SoVITS." }];
  state.asrHotwordRules = [{ source: "live 2 d", target: "Live2D" }];
  state.asrSemanticCorrectionEnabled = true;
  state.asrLowConfidenceConfirmEnabled = true;
  state.asrLowConfidenceThreshold = 0.48;
  state.voiceTurnMergeWindowMs = 0;
  state.voiceTurnHoldIncompleteEnabled = false;
  const controller = localAsrController.createController({
    state,
    ui: { chatInput: { value: "" } },
    windowObject: { setTimeout, clearTimeout },
    requestAssistantReply: async (text, opts) => sent.push({ text, opts }),
    handleUserSpeechStart: () => true,
    updateMicButton: () => {},
    updateMicMeter: () => {},
    setStatus: () => {}
  });

  controller.sendAsrTranscript("please fix live 2 d motion timing", {
    source: "voice_transcript",
    interruptReason: "voice_transcript"
  });

  setImmediate(() => {
    assert.strictEqual(sent.length, 1, "ASR voice turn should be sent into the chat path");
    assert.ok(sent[0].text.includes("Live2D"), "ASR hotword/context correction should restore Live2D");
    assert.strictEqual(sent[0].opts.inputModality, "voice", "ASR turns should stay marked as voice");
    assert.strictEqual(sent[0].opts.interruptActive, true, "ASR turns should be able to interrupt stale assistant speech");
    console.log("[OK] Free chat regression tests passed.");
  });
}

{
  const brain = {
    intent: "question",
    opening_move: "answer_first",
    reaction_mode: "task_snap",
    spontaneity: 2,
    voice_director: {
      delivery: "curious_clear",
      pace: "measured",
      pause_profile: "thoughtful",
      segment_style: "thoughtful_beats",
      pre_pause_ms: 40,
      inter_segment_pause_ms: 170,
      max_segments: 3
    },
    motion_director: {
      pre_reaction: "head_tilt",
      speech_start: "curious_speech_start",
      speech_beats: ["tiny_nod"],
      post_settle: "settle_idle"
    }
  };
  const replyText = "First, we keep the key sentence intact. Then we answer the new interruption. Finally, we settle the motion.";
  const voiceTimeline = performanceTimelineController.buildVoiceTimeline({
    replyText,
    brainSnapshot: brain,
    runtimeMetadata: { emotion: "thinking", voice_style: "curious" },
    talkStyle: "curious"
  });
  assert.ok(voiceTimeline.segments.length >= 2, "voice director should split multi-beat replies");
  assert.ok(voiceTimeline.segments.length <= 3, "voice director should respect max segment count");
  assert.strictEqual(voiceTimeline.pace, "measured", "voice timeline should preserve backend pace");

  const motionTimeline = performanceTimelineController.buildPerformanceTimeline({
    replyText,
    brainSnapshot: brain,
    runtimeMetadata: { emotion: "thinking", voice_style: "curious" },
    ttsEnabled: true,
    talkStyle: "curious"
  });
  const summary = performanceTimelineController.toPublicTimelineSummary(motionTimeline);
  assert.strictEqual(summary.motion.pre, "head_tilt", "Live2D pre-reaction should follow motion director");
  assert.strictEqual(summary.motion.speech, "curious_speech_start", "Live2D speech start should follow motion director");
  assert.deepStrictEqual(summary.motion.beats, ["tiny_nod"], "Live2D speech beats should remain director-driven");
}
