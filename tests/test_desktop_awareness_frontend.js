"use strict";

const assert = require("assert");
const { createController } = require("../web/autoChatController.js");

const state = {};
const controller = createController({
  state,
  windowObject: {
    performance: { now: () => 0 },
    setTimeout,
    clearTimeout
  },
  documentObject: {}
});

const baseline = new Array(144).fill(10);
const tinyChange = baseline.slice();
tinyChange[0] = 11;
const sceneChange = baseline.map((value, index) => index < 50 ? value + 8 : value);

assert.strictEqual(controller.desktopFingerprintChanged(baseline, tinyChange), false);
assert.strictEqual(controller.desktopFingerprintChanged(baseline, sceneChange), true);
assert.strictEqual(controller.desktopFingerprintChanged(null, sceneChange), false);

{
  const now = Date.now();
  const continuityState = {
    autoChatEnabled: true,
    observeAutonomousEnabled: true,
    chatRecords: [
      { role: "assistant", content: "之前的话。", timestamp: now - 2000 },
      { role: "user", content: "请只回复这一段：嗯，那就随便来吧。你最近在折腾什么呢？", timestamp: now }
    ],
    conversationLastUserAt: now,
    conversationLastAssistantAt: now - 2000,
    conversationLastHandledUserAt: 0,
    autoChatTuning: {}
  };
  const continuityController = createController({
    state: continuityState,
    windowObject: { performance: { now: () => 0 }, setTimeout, clearTimeout },
    documentObject: {}
  });
  const anchor = continuityController.getConversationContinuityAnchor();
  assert.ok(anchor && anchor.text.includes("你最近在折腾什么"), "an unanswered user turn should remain the top conversational anchor");
  assert.strictEqual(continuityController.hasConversationPriority(), true, "desktop awareness must yield to unfinished conversation");
  const context = continuityController.analyzeAutoChatContext();
  assert.strictEqual(context.primaryReason, "unanswered_user");
  assert.strictEqual(context.conversationContinuity, true);
  const prompt = continuityController.buildAutoChatPrompt(context);
  assert.ok(prompt.includes("Latest conversational anchor"));
  assert.ok(prompt.includes("Continue primarily in Chinese"), "automatic continuity should inherit Chinese instead of forcing English");
  assert.ok(!prompt.includes("Reply in English only"));

  continuityState.conversationLastHandledUserAt = now;
  assert.strictEqual(continuityController.getConversationContinuityAnchor(), null, "a deliberately handled silent or replied turn must not be retried");

  const desktopPrompt = continuityController.buildAutoChatPrompt({
    desktopAwarenessTrigger: true,
    primaryReason: "desktop_change",
    reasons: ["desktop_change"],
    topicHint: ""
  });
  assert.ok(desktopPrompt.includes("private attention wake"));
  assert.ok(desktopPrompt.includes("observe_screen"));
  assert.ok(desktopPrompt.includes("choose private silence"));
  assert.ok(desktopPrompt.includes("do not ask permission merely to look"));
  assert.ok(!desktopPrompt.includes("The local desktop scene changed; decide whether looking would be useful"));
}

console.log("[OK] autonomous desktop awareness frontend tests");
