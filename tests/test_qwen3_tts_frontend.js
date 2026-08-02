"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const chatSource = fs.readFileSync(path.join(root, "web", "chat.js"), "utf8");
const queueSource = fs.readFileSync(path.join(root, "web", "streamTtsQueueController.js"), "utf8");
const playbackSource = fs.readFileSync(path.join(root, "web", "ttsPlaybackController.js"), "utf8");
const configSource = fs.readFileSync(path.join(root, "web", "appConfigController.js"), "utf8");
const replySource = fs.readFileSync(path.join(root, "web", "chatReplyController.js"), "utf8");
const electronSource = fs.readFileSync(path.join(root, "electron", "main.js"), "utf8");

assert.ok(
  chatSource.includes('p === "qwen3_tts"'),
  "Qwen3-TTS must be treated as a server TTS provider"
);
assert.ok(
  queueSource.includes('state.ttsProvider === "qwen3_tts"')
    && queueSource.includes("state.qwen3TtsStreamPlayback !== false"),
  "Qwen3-TTS must use the cancellable incremental PCM queue"
);
assert.ok(
  playbackSource.includes("const streamProviderEnabled")
    && playbackSource.includes('state.ttsProvider === "qwen3_tts"'),
  "Qwen3-TTS playback must share the generation-fenced stream transport"
);
assert.ok(
  configSource.includes("qwen3_tts_stream_playback")
    && configSource.includes("qwen3_tts_reply_continuity"),
  "sanitized Qwen3-TTS stream and reply-continuity capabilities must reach frontend state"
);
assert.ok(
  electronSource.includes("startManagedLocalTtsService")
    && electronSource.includes('provider !== "qwen3_tts"')
    && electronSource.includes("auto_start_local_provider"),
  "Electron managed TTS autostart must be explicitly gated to Qwen3-TTS"
);
assert.ok(
  electronSource.includes("stopManagedLocalTtsService")
    && electronSource.includes("managedQwenTtsProc.kill()"),
  "Electron must release the Qwen3-TTS process it owns on shutdown"
);
assert.ok(
  !electronSource.includes("api_v2.py"),
  "Electron must never autostart the GPT-SoVITS API"
);
assert.ok(
  replySource.includes("function canStreamBeforeCompanionTurnFinalizes()")
    && replySource.includes('String(state.ttsProvider || "").toLowerCase() === "qwen3_tts"')
    && replySource.includes("state.qwen3TtsReplyContinuity === false")
    && replySource.includes("&& !canStreamBeforeCompanionTurnFinalizes()"),
  "Qwen should wait for the finalized reply by default and retain legacy early sentence streaming only as an opt-out"
);
assert.ok(
  replySource.includes("const qwenContinuousReply")
    && replySource.includes('`${context.mode || "direct"}_continuous_reply`'),
  "Qwen should collapse a voice timeline into one continuous synthesis request by default"
);

console.log("Qwen3-TTS frontend checks passed.");
