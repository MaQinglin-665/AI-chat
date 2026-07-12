#!/usr/bin/env node
"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const chatState = require(path.join(ROOT, "web", "chatState.js"));
const chatReplyController = require(path.join(ROOT, "web", "chatReplyController.js"));
const autoChatController = require(path.join(ROOT, "web", "autoChatController.js"));

{
  let perfNow = 1000;
  let stops = 0;
  const state = chatState.createInitialState();
  state.speechAnimUntil = 1300;
  const controller = chatReplyController.createController({
    state,
    ui: {},
    windowObject: { setTimeout, clearTimeout, AbortController },
    performanceObject: { now: () => perfNow },
    stopAllAudioPlayback: () => { stops += 1; }
  });

  assert.strictEqual(
    controller.handleUserSpeechStart({ reason: "local_speech_timebase_test" }),
    true,
    "a visible local speech-release window should remain interruptible even when wall and performance clocks differ"
  );
  assert.strictEqual(stops, 1, "the active visual speech window should flow through the existing interruption path");

  state.speechAnimUntil = perfNow + 80;
  assert.strictEqual(
    controller.handleUserSpeechStart({ reason: "local_speech_timebase_expired" }),
    false,
    "the existing 80ms release grace should still treat an expired visual window as idle"
  );
  assert.strictEqual(stops, 1, "an expired visual window must not trigger an extra interruption");
}

{
  let perfNow = 1000;
  const state = chatState.createInitialState();
  state.autoChatEnabled = true;
  state.lastUserMessageAt = 0;
  state.lastAutoChatAt = 0;
  state.chatRecords = [];
  state.speechAnimUntil = 1300;
  const controller = autoChatController.createController({
    state,
    documentObject: { activeElement: null },
    performanceObject: { now: () => perfNow }
  });

  assert.strictEqual(controller.shouldSkipAutoChat(), true, "auto chat must wait for the visible speech-release window");
  assert.deepStrictEqual(
    controller.getAutoCompanionSpeechGate(),
    { allowed: false, reason: "assistant_speaking" },
    "the shared companion-speech gate should see the local visual release window"
  );
  assert.deepStrictEqual(
    controller.shouldSkipTurnInterjection({}),
    { skip: true, reason: "assistant_speaking", retry: true },
    "turn interjections should retry rather than overlap a visible speech-release window"
  );

  perfNow = 1381;
  assert.strictEqual(controller.shouldSkipAutoChat(), false, "auto chat should resume only after the local speech-release window expires");
  assert.deepStrictEqual(
    controller.getAutoCompanionSpeechGate(),
    { allowed: true, reason: "" },
    "the companion-speech gate should reopen after the local visual window expires"
  );
}

{
  const state = chatState.createInitialState();
  const perfNow = 1_000_000_500;
  state.ttsContextSpeaking = true;
  state.ttsDebugAudioStartedAt = 1_000_000_000;
  state.activeAssistantSpeechPlan = {
    interruption_policy: "finish_key_sentence_before_yield",
    intent: "task_help",
    reply_move: "answer",
    segments: [{
      index: 1,
      text: "Important: keep private tokens out of logs.",
      role: "key",
      protected: true,
      reason: "test",
      estimated_ms: 2000
    }]
  };
  state.activeAssistantSpeechSegmentIndex = 1;
  state.activeAssistantSpeechSegmentRole = "key";
  const controller = chatReplyController.createController({
    state,
    ui: {},
    windowObject: { setTimeout, clearTimeout, AbortController },
    performanceObject: { now: () => perfNow }
  });

  const protection = controller.shouldProtectImportantAssistantSpeech("long_renderer_uptime");
  assert.strictEqual(protection.protect, true, "a protected key sentence should still be recognized at long renderer uptime");
  assert.strictEqual(protection.elapsedMs, 500, "performance-clock speech timestamps must not be reclassified as wall-clock timestamps after long uptime");
}

const chatSource = fs.readFileSync(path.join(ROOT, "web", "chat.js"), "utf8");
assert.ok(
  /function getAutoChatController\(\)\s*\{[\s\S]*?performanceObject:\s*performance/.test(chatSource),
  "the app-level auto-chat controller must receive the renderer performance clock"
);

console.log("[OK] Local speech timebase frontend checks passed.");
