#!/usr/bin/env node
"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const loader = require(path.join(root, "web", "viewScriptLoader.js"));
const startup = require(path.join(root, "web", "appStartupController.js"));
const indexSource = fs.readFileSync(path.join(root, "web", "index.html"), "utf8");

assert.strictEqual(loader.resolveView({ search: "?desktop=1&view=model" }), "model");
assert.strictEqual(loader.resolveView({ search: "?view=chat" }), "chat");
assert.strictEqual(loader.isDeveloperModeEnabled({ search: "?view=model&dev=1" }, null), true);

const manifest = [
  "./chatState.js",
  "./followupReadinessPanelController.js",
  "./followupDebugController.js",
  "./grayTrialReportController.js",
  "./live2dRuntimeController.js",
  "./chat.js",
  "./app.js"
];
assert.deepStrictEqual(
  loader.selectScriptsForView(manifest, "chat"),
  manifest,
  "chat view should preserve the complete ordered manifest"
);
assert.deepStrictEqual(
  loader.selectScriptsForView(manifest, "model"),
  ["./chatState.js", "./live2dRuntimeController.js", "./chat.js", "./app.js"],
  "model view should skip chat-only diagnostics while preserving runtime order"
);
assert.ok(
  indexSource.includes('<template id="taffy-view-script-manifest">')
    && indexSource.indexOf('<script src="./app.js"></script>') < indexSource.indexOf('<script src="./viewScriptLoader.js"></script>'),
  "index should expose an inert ordered manifest before the view loader"
);

{
  const writes = [];
  const result = loader.installViewScripts({ write: (value) => writes.push(value) }, {
    view: "model",
    developerMode: false,
    scripts: manifest
  });
  assert.deepStrictEqual(result.scripts, ["./chatState.js", "./live2dRuntimeController.js", "./chat.js", "./app.js"]);
  assert.strictEqual(writes[0], '<script src="./chatState.js"><\/script>');
}

{
  const posted = [];
  let idleCallback = null;
  let idleDelay = 0;
  let animationSchedules = 0;
  class FakeBroadcastChannel {
    postMessage(payload) { posted.push(payload); }
    close() {}
  }
  const state = { uiView: "chat", speechAnimMood: "idle", speechAnimUntil: 0 };
  const controller = startup.createController({
    state,
    windowObject: { BroadcastChannel: FakeBroadcastChannel, setTimeout: () => 0, clearTimeout: () => {} },
    performanceObject: { now: () => 1000 },
    requestAnimationFrame: () => { animationSchedules += 1; return 1; },
    setTimeout(fn, delay) { idleCallback = fn; idleDelay = delay; return 2; },
    clearTimeout: () => {},
    isSpeechMotionActive: () => false,
    getSpeechAnimationMouthOpen: () => 0
  });
  controller.startChatSpeechBroadcastLoop();
  assert.strictEqual(posted.length, 1, "broadcast should publish the initial idle state once");
  assert.strictEqual(animationSchedules, 0, "idle broadcast should not use requestAnimationFrame");
  assert.strictEqual(idleDelay, 250, "idle broadcast should use the low-frequency scheduler");
  idleCallback();
  assert.strictEqual(posted.length, 1, "unchanged idle state should not be posted repeatedly");
  state.speechAnimMood = "happy";
  idleCallback();
  assert.strictEqual(posted.length, 2, "an idle state change should still be delivered");
  controller.stopChatSpeechBroadcastLoop();
}

{
  let animationSchedules = 0;
  class FakeBroadcastChannel { postMessage() {} close() {} }
  const controller = startup.createController({
    state: { uiView: "chat", speechAnimUntil: 2000 },
    windowObject: { BroadcastChannel: FakeBroadcastChannel, setTimeout: () => 0, clearTimeout: () => {} },
    performanceObject: { now: () => 1000 },
    requestAnimationFrame: () => { animationSchedules += 1; return 1; },
    isSpeechMotionActive: () => true,
    getSpeechAnimationMouthOpen: () => 0.5
  });
  controller.startChatSpeechBroadcastLoop();
  assert.strictEqual(animationSchedules, 1, "active speech should retain frame-synchronous animation updates");
  controller.stopChatSpeechBroadcastLoop();
}

async function testModelStartupProfile() {
  const calls = { config: 0, persona: 0, avatar: 0, live2d: 0 };
  const controller = startup.createController({
    state: { uiView: "model" },
    windowObject: {
      setTimeout: () => 0,
      clearTimeout: () => {},
      BroadcastChannel: class { close() {} }
    },
    loadConfig: async () => { calls.config += 1; },
    loadPersonaCard: async () => { calls.persona += 1; },
    initAssistantAvatar: () => { calls.avatar += 1; },
    ensureLive2DRuntime: async () => {},
    initLive2D: async () => { calls.live2d += 1; }
  });
  await controller.main();
  assert.deepStrictEqual(
    calls,
    { config: 1, persona: 0, avatar: 0, live2d: 1 },
    "model startup should load runtime config without initializing chat-only preferences"
  );
}

testModelStartupProfile()
  .then(() => console.log("[OK] frontend runtime efficiency tests passed"))
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
