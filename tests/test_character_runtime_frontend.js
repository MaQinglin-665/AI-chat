#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const vm = require("vm");
const assert = require("assert");

const CHAT_JS = path.resolve(__dirname, "..", "web", "chat.js");
const source = fs.readFileSync(CHAT_JS, "utf8");

function loadRuntimeMetadataHarness() {
  const startMarker = "const CHARACTER_RUNTIME_SUPPORTED_EMOTIONS";
  const endMarker = "const CHARACTER_RUNTIME_BROADCAST_CHANNEL";
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker);
  assert.ok(start >= 0, "Missing character runtime metadata constants");
  assert.ok(end > start, "Missing character runtime broadcast marker");

  const sandbox = {};
  const snippet = source.slice(start, end);
  vm.runInNewContext(
    `${snippet}
globalThis.__runtimeHarness = {
  normalizeCharacterRuntimeMetadataForFrontend,
  normalizeCharacterRuntimeEmotionValue,
  normalizeCharacterRuntimeActionValue,
  normalizeCharacterRuntimeIntensityValue
};`,
    sandbox,
    { filename: "character-runtime-metadata-harness.js" }
  );
  return sandbox.__runtimeHarness;
}

const harness = loadRuntimeMetadataHarness();

function toPlainObject(value) {
  return JSON.parse(JSON.stringify(value));
}

assert.strictEqual(
  harness.normalizeCharacterRuntimeMetadataForFrontend(null),
  null,
  "null metadata should be ignored"
);
assert.strictEqual(
  harness.normalizeCharacterRuntimeMetadataForFrontend({ unrelated: "value" }),
  null,
  "objects without runtime fields should be ignored"
);

assert.deepStrictEqual(
  toPlainObject(harness.normalizeCharacterRuntimeMetadataForFrontend({
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
  toPlainObject(harness.normalizeCharacterRuntimeMetadataForFrontend({
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
  toPlainObject(harness.normalizeCharacterRuntimeMetadataForFrontend({
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
