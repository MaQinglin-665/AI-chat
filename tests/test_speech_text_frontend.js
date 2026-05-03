#!/usr/bin/env node
"use strict";

const assert = require("assert");
const path = require("path");

const SPEECH_TEXT_JS = path.resolve(__dirname, "..", "web", "speechText.js");
const speechText = require(SPEECH_TEXT_JS);

assert.strictEqual(
  typeof speechText.normalizeEnglishBoundaries,
  "function",
  "speech text helper should export English boundary normalization"
);

assert.strictEqual(
  speechText.normalizeEnglishBoundaries("Hey there!I'm more of a night owl myself.But sure."),
  "Hey there! I'm more of a night owl myself. But sure.",
  "English boundary normalization should insert missing sentence spaces"
);

assert.strictEqual(
  speechText.sanitizeSpeakText("1. 你好！！ https://example.com [[TAFFY_TOOL_META]]{}"),
  "你好！",
  "speech sanitization should remove list markers, urls, duplicate punctuation, and tool metadata"
);

assert.strictEqual(
  speechText.colloquializeSpeakText("根据你的描述，您可以首先检查配置。"),
  "按你刚说的，你可以先说重点，检查配置。",
  "colloquialization should preserve existing wording behavior"
);

assert.strictEqual(
  speechText.buildStableSpeakText("好"),
  "",
  "very short final speech text should be skipped"
);

assert.ok(
  speechText.buildSpeechDeliveryText("这是一个用于测试自然停顿和句尾补全的长句子", "idle", "neutral", false).endsWith("。"),
  "speech delivery text should end with punctuation"
);

assert.strictEqual(
  speechText.buildSpeechDeliveryText("Hey there!I'm more of a night owl myself.", "happy", "playful", false),
  "Hey there! I'm more of a night owl myself.",
  "English speech delivery should preserve sentence-boundary spacing"
);

assert.strictEqual(
  speechText.buildSpeechDeliveryText(
    "This is a long English sentence without punctuation and it should not split inside a word",
    "idle",
    "neutral",
    false
  ),
  "This is a long English sentence without punctuation and it should not split inside a word.",
  "English speech delivery should not insert CJK pauses inside words"
);

const split = speechText.splitStreamSpeakSegments(
  "这是第一句，已经足够长可以切开。这里是第二句，还在继续",
  { flush: false, style: "neutral" }
);
assert.deepStrictEqual(
  split.segments,
  ["这是第一句，已经足够长可以切开。"],
  "stream segmentation should emit completed sentence-like chunks"
);
assert.ok(split.rest.includes("第二句"), "stream segmentation should preserve unfinished tail");

const flushed = speechText.splitStreamSpeakSegments(split.rest, { flush: true, style: "neutral" });
assert.ok(flushed.segments.length >= 1, "flush should emit remaining usable tail");
assert.strictEqual(flushed.rest, "", "flush should clear remaining buffer");

const englishSplit = speechText.splitStreamSpeakSegments(
  "Hey there! I am testing this voice path. It should speak earlier now.",
  { flush: false, style: "playful" }
);
assert.deepStrictEqual(
  englishSplit.segments,
  ["Hey there! I am testing this voice path.", "It should speak earlier now."],
  "English stream speech should avoid sending a too-short first TTS segment"
);
assert.strictEqual(
  englishSplit.rest,
  "",
  "English stream speech should preserve the remaining tail"
);

const gptSovitsEnglishSplit = speechText.splitStreamSpeakSegments(
  "Start with a quick check of your emails catching up on anything that needs attention can set a productive tone for the rest of the day.",
  { flush: false, style: "playful", provider: "gpt_sovits" }
);
assert.ok(
  gptSovitsEnglishSplit.segments.length <= 2,
  "GPT-SoVITS stream segmentation should use fewer, larger chunks for steadier voice quality"
);
assert.ok(
  gptSovitsEnglishSplit.segments.every((seg) => seg.length >= 28),
  "GPT-SoVITS stream segmentation should avoid tiny standalone chunks"
);

const prosody = speechText.buildSpeakProsody("太好了！", "happy", true, "playful");
assert.strictEqual(typeof prosody.speed_ratio, "number");
assert.strictEqual(typeof prosody.pitch_ratio, "number");
assert.strictEqual(typeof prosody.volume_ratio, "number");
assert.match(prosody.rate, /^[+-]\d+%$/);
assert.match(prosody.pitch, /^[+-]\d+Hz$/);
assert.match(prosody.volume, /^[+-]\d+%$/);

console.log("Speech text frontend checks passed.");
