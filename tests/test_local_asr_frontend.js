#!/usr/bin/env node
"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const CHAT_JS = path.join(ROOT, "web", "chat.js");
const CONFIG_EXAMPLE_JSON = path.join(ROOT, "config.example.json");
const VOICE_TROUBLESHOOTING_MD = path.join(ROOT, "docs", "voice-troubleshooting.md");

const source = fs.readFileSync(CHAT_JS, "utf8");
const configExample = JSON.parse(fs.readFileSync(CONFIG_EXAMPLE_JSON, "utf8"));
const voiceTroubleshooting = fs.readFileSync(VOICE_TROUBLESHOOTING_MD, "utf8");

assert.ok(
  source.includes("localAsrSpeechThreshold: 0.0035"),
  "local ASR runtime default should use the low-volume-friendly threshold"
);
assert.ok(
  /Number\(asrCfg\.speech_threshold \|\| 0\.0035\)[\s\S]*?0\.0015[\s\S]*?0\.05/.test(source),
  "config loading should preserve the lower ASR threshold range"
);
assert.ok(
  source.includes('text.toLowerCase() === "/micdebug"'),
  "chat.js should keep the /micdebug command for voice diagnostics"
);
assert.ok(
  source.includes("localAsrThresholdAutoAdjusted"),
  "low-level ASR watchdog should track one-shot threshold auto-adjustment"
);
assert.ok(
  /state\.localAsrSpeechThreshold \* 0\.62[\s\S]*?0\.0022[\s\S]*?0\.0042/.test(source),
  "low-level ASR watchdog should lower overly high thresholds conservatively"
);
assert.ok(
  /const resp = await authFetch\("\/api\/asr_pcm"/.test(source),
  "local ASR transcription should use authFetch so API token protection keeps working"
);
assert.ok(
  /headers:\s*\{\s*"Content-Type":\s*"application\/json"\s*\}/.test(source),
  "local ASR transcription should post JSON payloads"
);
assert.ok(
  source.includes("choosePreferredLocalAsrInputDevice"),
  "local ASR should choose a preferred microphone input when devices are enumerable"
);
assert.ok(
  /stereo mix\|loopback\|what u hear\|\\u7acb\\u4f53\\u58f0\\u6df7\\u97f3/.test(source),
  "local ASR device scoring should avoid stereo mix and loopback inputs"
);
assert.ok(
  /microphone\|mic\|\\u9ea6\\u514b\\u98ce\|\\u9635\\u5217/.test(source),
  "local ASR device scoring should prefer microphone-like input names"
);
assert.ok(
  source.includes("selectedInput="),
  "/micdebug should report the selected input device"
);
assert.ok(
  source.includes("selectedInputMuted="),
  "/micdebug should report whether the selected input is muted"
);
assert.ok(
  source.includes("isLocalAsrTrackMuted"),
  "local ASR should detect muted MediaStream tracks before switching inputs"
);
assert.ok(
  source.includes("diagnosis=mic_track_muted"),
  "/micdebug should explain when Electron receives a system-muted microphone track"
);
assert.ok(
  source.includes("Windows 输入设备、隐私权限或硬件静音键"),
  "local ASR should give an actionable Windows/device mute warning"
);

assert.strictEqual(
  configExample.asr.speech_threshold,
  0.0035,
  "config.example.json should match the recommended ASR threshold"
);
assert.strictEqual(
  configExample.asr.min_speech_ms,
  150,
  "config.example.json should match the recommended minimum speech duration"
);
assert.strictEqual(
  configExample.asr.max_speech_ms,
  2200,
  "config.example.json should match the recommended maximum speech duration"
);

assert.ok(
  voiceTroubleshooting.includes('"speech_threshold": 0.0035'),
  "voice troubleshooting docs should show the same ASR threshold"
);
assert.ok(
  voiceTroubleshooting.includes("/micdebug"),
  "voice troubleshooting docs should explain /micdebug"
);

console.log("Local ASR frontend checks passed.");
