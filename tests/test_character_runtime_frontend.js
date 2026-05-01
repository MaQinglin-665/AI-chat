#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const assert = require("assert");

const CHAT_JS = path.resolve(__dirname, "..", "web", "chat.js");
const CHARACTER_RUNTIME_JS = path.resolve(__dirname, "..", "web", "characterRuntime.js");
const source = fs.readFileSync(CHAT_JS, "utf8");
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
  source.includes("function finishSpeechAnimation()"),
  "natural speech completion should keep a release helper"
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

console.log("Character runtime frontend checks passed.");
