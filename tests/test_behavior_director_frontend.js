const assert = require("assert");
const fs = require("fs");
const path = require("path");

const source = fs.readFileSync(path.join(__dirname, "..", "web", "chatReplyController.js"), "utf8");

assert.ok(source.includes('reportBehaviorEvent("tts_started"'), "actual playback start should report a behavior event");
assert.ok(source.includes('reportBehaviorEvent("tts_finished"'), "all TTS end audit paths should report a behavior event");
assert.ok(source.includes('Promise.resolve(authFetch("/api/behavior/event"'), "behavior telemetry should be fire-and-forget");
console.log("Behavior director frontend event checks passed.");
