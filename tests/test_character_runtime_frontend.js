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
  /function finishSpeechAnimation\(\)\s*\{[\s\S]*?state\.speechAnimUntil\s*=\s*now\s*\+\s*releaseMs;/.test(source),
  "natural speech completion should shorten the mouth animation to a release window"
);
assert.ok(
  source.includes("ttsAudioRawLevel: 0"),
  "speech animation should keep raw audio level state for audio-driven mouth shapes"
);
assert.ok(
  /state\.ttsAudioAnalyser\.smoothingTimeConstant\s*=\s*0\.12;/.test(source),
  "TTS audio analyser should react quickly enough for mouth closures"
);
assert.ok(
  /const hasLiveAudio\s*=\s*audioPlaying && !!state\.ttsAudioAnalyser;/.test(source),
  "mouth animation should prefer live audio when an analyser is available"
);
assert.ok(
  /if \(hasLiveAudio\) \{[\s\S]*?const voiced = rawLevel > 0\.035[\s\S]*?target = 0;[\s\S]*?state\.speechMouthOpen = 0;[\s\S]*?return state\.speechMouthOpen;/.test(source),
  "live audio mouth path should close quickly when voice energy drops"
);
assert.ok(
  source.includes("const closureDip = clampNumber(closureGate")
    && source.includes("const rhythmGate = clampNumber")
    && source.includes("const closureCap = clampNumber"),
  "live audio mouth path should add rhythmic closure dips during fast speech"
);
assert.ok(
  source.includes("voiceRecent = now - Number(state.ttsAudioLastVoiceAt || 0) < 58")
    && source.includes("0.62 + visemeOpen * 0.48 - closureDip")
    && source.includes("0.045 + liveLevel * 0.16 + rawLevel * 0.1"),
  "fast live audio mouth path should keep closure valleys visible"
);
assert.ok(
  source.includes("const _translationInFlight = new Map();"),
  "chat and subtitle translations should share in-flight requests"
);
assert.ok(
  source.includes("function _normalizeChatTranslationKey(text)")
    && source.includes("_translationInFlight.get(cacheKey)")
    && source.includes("_translationInFlight.set(cacheKey, task)"),
  "chat translation cache/in-flight keys should normalize punctuation spacing variants"
);
assert.ok(
  /async function _fetchTranslation\(text, capturedId\)\s*\{[\s\S]*?_readChatTranslationCache\(safe\)[\s\S]*?_fetchChatTranslation\(safe\)/.test(source),
  "subtitle translation should reuse the chat translation cache/request path"
);
assert.ok(
  source.includes("function normalizeAssistantVisibleText(text)")
    && source.includes("const visibleReply = normalizeAssistantVisibleText(parsedReply.visibleText);"),
  "final assistant text should normalize English sentence boundaries before display and translation"
);
assert.ok(
  source.includes('translationEl.textContent = "中译：翻译中...";'),
  "assistant messages should show an immediate translation placeholder"
);
assert.ok(
  source.includes("const _CHAT_TRANSLATE_TIMEOUT_MS = 60000;"),
  "assistant translation should allow slow local LLM translation to finish"
);
assert.ok(
  source.includes('translationEl.textContent = "中译：翻译暂时不可用";'),
  "assistant messages should show a visible translation failure instead of disappearing"
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
assert.ok(
  /progressTimer\s*=\s*window\.setInterval\(async \(\) => \{[\s\S]*?performance\.now\(\) - lastProgressAt < 2800[\s\S]*?playAudioByContext\(blob,\s*debugContext\)/.test(source),
  "server TTS should fall back when HTML audio stops advancing"
);
assert.ok(
  /fallbackTimer\s*=\s*window\.setTimeout\(resolveOnce,[\s\S]*?durationMs \+ 900/.test(source),
  "AudioContext fallback should not leave speaking state stuck if onended is missed"
);
assert.ok(
  source.includes("function hasQueuedStreamSpeakItem(sessionId)"),
  "stream speech queue should be able to detect queued tail segments"
);
assert.ok(
  source.includes("function shouldSerializeStreamTTSRequests()")
    && source.includes('state.ttsProvider === "gpt_sovits"')
    && source.includes("if (!shouldSerializeStreamTTSRequests())")
    && source.includes("provider: state.ttsProvider || \"\""),
  "GPT-SoVITS realtime stream speech should serialize eager requests and use provider-aware segmentation"
);
assert.ok(
  source.includes("stream_speak_idle_wait_ms")
    && source.includes("state.streamSpeakIdleWaitMs = Number.isFinite(streamIdleWaitCfg)")
    && source.includes("Math.max(30, Math.min(220, Number(state.streamSpeakIdleWaitMs) || 90))"),
  "stream speech queue should support a shorter configurable idle wait"
);
assert.ok(
  /current\s*=\s*next\s*\|\|\s*await waitNextStreamSpeakItem\([\s\S]*?state\.chatBusy \? idleWaitMs : 180/.test(source),
  "stream speech queue should re-check for tail segments after each audio segment plays"
);
assert.ok(
  /finally \{[\s\S]*?state\.streamSpeakWorking = false;[\s\S]*?hasQueuedStreamSpeakItem\(activeSession\)[\s\S]*?runStreamSpeakQueue\(\)/.test(source),
  "stream speech queue should restart itself if a segment arrived while it was finishing"
);
assert.ok(
  source.includes("function buildTTSDebugReport()"),
  "chat.js should expose a TTS debug report for voice playback diagnosis"
);
assert.ok(
  source.includes('text.toLowerCase() === "/ttsdebug"'),
  "local commands should include /ttsdebug for copyable playback state"
);
assert.ok(
  source.includes("function installTTSDebugBridge()"),
  "window debug bridge should expose TTS playback state to developer tools"
);
assert.ok(
  source.includes("function buildTranslateDebugReport()")
    && source.includes('text.toLowerCase() === "/translatedebug"'),
  "chat.js should expose /translatedebug for copyable translation timing state"
);
assert.ok(
  source.includes("function buildMemoryDebugReport(")
    && source.includes('text.toLowerCase() === "/memorydebug"')
    && source.includes('learningFetchJson("/api/memory/debug")')
    && source.includes("learningTabDebug")
    && source.includes("learningDebugPanel")
    && source.includes("learning.degradedReason=")
    && source.includes("Learning health windows:"),
  "chat.js should expose memory/learning chain debug state"
);
assert.ok(
  source.includes('appendMessage("assistant", buildTranslateDebugReport(), { enableTranslation: false })')
    && source.includes('appendMessage("assistant", "Translation debug panel enabled.", { enableTranslation: false })'),
  "translation debug command responses should not recursively trigger assistant translation"
);
assert.ok(
  source.includes("function installTranslateDebugBridge()")
    && source.includes("__AI_CHAT_DEBUG_TRANSLATE__"),
  "window debug bridge should expose translation timing state to developer tools"
);
assert.ok(
  source.includes('recordTranslateDebugEvent("request_start"')
    && source.includes('recordTranslateDebugEvent("request_ok"')
    && source.includes('recordTranslateDebugEvent("cache_hit"'),
  "translation requests should record start, completion, and cache-hit events"
);
assert.ok(
  source.includes('recordTTSDebugEvent("audio_play_start"')
    && source.includes('recordTTSDebugEvent("audio_done"')
    && source.includes('function recordTTSAudioEvent(stage, audio, debugContext = {}, extra = {})')
    && source.includes('recordTTSAudioEvent("audio_waiting"')
    && source.includes('recordTTSAudioEvent("audio_stalled"'),
  "server audio playback should record start, completion, and HTMLAudioElement lifecycle events"
);
assert.ok(
  source.includes('recordTTSDebugEvent("stream_enqueue"')
    && source.includes('recordTTSDebugEvent("stream_request_ok"'),
  "stream speech queue should record enqueue and TTS request completion events"
);
assert.ok(
  source.includes("ttsPlaybackGeneration: 0")
    && source.includes("function isCurrentTTSPlaybackGeneration(generation)")
    && source.includes('recordTTSDebugEvent("audio_stale_skip"')
    && source.includes('recordTTSDebugEvent("browser_stale_skip"')
    && source.includes('recordTTSDebugEvent("speak_fallback_stale_skip"')
    && source.includes("ttsContextBufferSource: null")
    && source.includes("state.ttsContextBufferSource.stop(0)"),
  "TTS playback should ignore stale audio and fallback from earlier chat turns"
);
assert.ok(
  /const requestedGeneration = Number\(opts\.playbackGeneration \|\| state\.ttsPlaybackGeneration \|\| 0\);[\s\S]*?if \(!isCurrentTTSPlaybackGeneration\(requestedGeneration\)\)[\s\S]*?stopAllAudioPlayback\(\);[\s\S]*?const playbackGeneration = Number\(state\.ttsPlaybackGeneration \|\| 0\);[\s\S]*?speakOnceWithVoice\(text, v, \{ force, playbackGeneration \}\)/.test(source),
  "browser TTS fallback should reject stale generations before starting a fresh browser utterance"
);
assert.ok(
  source.includes("ttsAudioPlaybackToken: 0")
    && source.includes("const audioPlaybackToken = Number(state.ttsAudioPlaybackToken || 0) + 1")
    && source.includes("function speakOnceWithVoice(text, voice, opts = {})")
    && source.includes("const force = typeof opts === \"object\" ? !!opts.force : !!opts")
    && source.includes("const isCurrentHtmlAudioPlayback = () => ("),
  "HTMLAudio and browser TTS paths should keep per-playback ownership guards"
);
assert.ok(
  /const streamSpeakSession = Date\.now\(\);[\s\S]*?const useStreamSpeak = shouldUseStreamSpeak\(\);[\s\S]*?stopAllAudioPlayback\(\);[\s\S]*?state\.streamSpeakSession = streamSpeakSession;/.test(source),
  "starting a new assistant request should always invalidate previous audio playback"
);

console.log("Character runtime frontend checks passed.");
