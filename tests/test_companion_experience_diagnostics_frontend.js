"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const diagnostics = require(path.join(root, "web", "companionExperienceDiagnostics.js"));
const devLoaderSource = fs.readFileSync(path.join(root, "web", "devFeatureLoader.js"), "utf8");
const chatSource = fs.readFileSync(path.join(root, "web", "chat.js"), "utf8");
const indexSource = fs.readFileSync(path.join(root, "web", "index.html"), "utf8");

let clock = 100;
const collector = diagnostics.createCollector({ now: () => clock });
collector.record("chat", "send_click", {
  traceId: "chat-safe-1",
  mode: "stream",
  ttsProvider: "gpt_sovits",
  messageChars: 999,
  text: "private user text must not be retained"
});
clock = 240;
collector.record("chat", "api_headers", { traceId: "chat-safe-1", status: 200 });
clock = 330;
collector.record("chat", "first_text_render", { traceId: "chat-safe-1" });
clock = 620;
collector.record("chat", "reply_ready", { traceId: "chat-safe-1" });
clock = 900;
collector.record("tts", "response_ok", { traceId: "chat-safe-1" });
clock = 980;
collector.record("tts", "audio_play_start", { traceId: "chat-safe-1" });
clock = 1600;
collector.record("tts", "audio_play_end", { traceId: "chat-safe-1", result: "ok" });

const snapshot = collector.snapshot();
assert.strictEqual(snapshot.length, 1);
assert.strictEqual(snapshot[0].outcome, "played");
assert.strictEqual(snapshot[0].stages["chat.first_text_render"].elapsedMs, 230);
assert.strictEqual(snapshot[0].stages["tts.audio_play_start"].elapsedMs, 880);
assert.strictEqual(snapshot[0].meta.mode, "stream");
assert.strictEqual(snapshot[0].meta.ttsProvider, "gpt_sovits");
assert.ok(!JSON.stringify(snapshot).includes("private user text"));
assert.ok(!Object.prototype.hasOwnProperty.call(snapshot[0].meta, "messageChars"));
assert.ok(!Object.prototype.hasOwnProperty.call(snapshot[0].meta, "text"));

const report = diagnostics.buildReport(snapshot);
assert.ok(report.includes("230ms"));
assert.ok(report.includes("880ms"));
assert.ok(report.includes("played"));
assert.ok(!report.includes("private user text"));

for (let i = 0; i < 20; i += 1) {
  clock += 10;
  collector.record("chat", "send_click", { traceId: `bounded-${i}` });
}
assert.strictEqual(collector.snapshot().length, 12, "recent-turn diagnostics must stay bounded");

assert.ok(devLoaderSource.includes('"./companionExperienceDiagnostics.js"'));
assert.ok(chatSource.includes("TaffyCompanionExperienceDiagnostics?.record?.(scope, stage, payload)"));
assert.ok(indexSource.includes('id="experience-diagnostics-btn"'));

console.log("companion experience diagnostics frontend tests passed");
