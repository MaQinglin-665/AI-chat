#!/usr/bin/env node
"use strict";

const assert = require("assert");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const localAsr = require(path.join(ROOT, "web", "localAsrController.js"));
const wakeWord = require(path.join(ROOT, "web", "wakeWordController.js"));

class FakeRecognition {
  start() {}
  stop() {}
  abort() {}
}

async function main() {
  const requests = [];
  const localController = localAsr.createController({
    state: {},
    authFetch: async (url, options) => {
      requests.push({ url, options });
      return {
        ok: true,
        async json() {
          return {
            text: "fallback text",
            raw_text: "hello world",
            detected_language: "en-US",
            confidence: 0.86,
            language_selection_ambiguous: true
          };
        }
      };
    },
    windowObject: {
      btoa: (value) => Buffer.from(value, "binary").toString("base64"),
      Uint8Array,
      Int16Array,
      Float32Array,
      AbortController
    }
  });

  const transcript = await localController.transcribeLocalPcmChunks(
    [new Int16Array([1, -1, 2])],
    undefined,
    true
  );
  assert.deepStrictEqual(transcript, {
    text: "hello world",
    detectedLanguage: "en-US",
    confidence: 0.86,
    languageSelectionAmbiguous: true
  });
  assert.strictEqual(requests.length, 1);
  assert.strictEqual(requests[0].url, "/api/asr_pcm");
  const requestBody = JSON.parse(requests[0].options.body);
  assert.deepStrictEqual(Object.keys(requestBody).sort(), ["audio_base64", "sample_rate"]);
  assert.ok(requestBody.audio_base64);
  assert.strictEqual(requestBody.sample_rate, 16000);

  const sent = [];
  const ambiguityController = localAsr.createController({
    state: {
      micOpen: true,
      micSession: 1,
      micQueue: [],
      micQueueWorking: false,
      history: [],
      asrHotwordRules: [],
      asrLowConfidenceConfirmEnabled: true,
      asrLowConfidenceThreshold: 0.48,
      voiceTurnMergeWindowMs: 0
    },
    ui: { chatInput: { value: "" } },
    windowObject: { setTimeout, clearTimeout },
    requestAssistantReply: async (text, options) => {
      sent.push({ text, options });
      return true;
    }
  });
  ambiguityController.sendAsrTranscript("hello there", {
    source: "voice_transcript",
    confidence: 0.95,
    languageSelectionAmbiguous: true
  });
  assert.strictEqual(sent.length, 1);
  assert.strictEqual(
    sent[0].options.asrContext.needs_confirmation,
    true,
    "near-tied local language candidates should use the existing confirmation path"
  );
  assert.strictEqual(
    sent[0].options.asrContext.language_selection_ambiguous,
    true,
    "the confirmation context should retain the local language ambiguity marker"
  );

  const englishState = {
    asrInputLanguageMode: "en",
    wakeWordEnabled: false,
    micOpen: false,
    recognitionActive: false,
    chatBusy: false,
    micToggleBusy: false
  };
  const englishController = wakeWord.createController({
    state: englishState,
    windowObject: {
      SpeechRecognition: FakeRecognition,
      setTimeout: () => 1,
      clearTimeout() {}
    },
    navigatorObject: {}
  });
  englishController.setupSpeechRecognition();
  assert.strictEqual(englishState.recognition.lang, "en-US");

  const autoState = {
    asrInputLanguageMode: "auto",
    wakeWordEnabled: false,
    micOpen: false,
    recognitionActive: false,
    chatBusy: false,
    micToggleBusy: false
  };
  const autoController = wakeWord.createController({
    state: autoState,
    windowObject: {
      SpeechRecognition: FakeRecognition,
      setTimeout: () => 1,
      clearTimeout() {}
    },
    navigatorObject: {}
  });
  autoController.setupSpeechRecognition();
  assert.strictEqual(autoState.recognition.lang, "zh-CN");

  const browserEvents = [];
  const browserTranscripts = [];
  const browserSpeechStarts = [];
  const browserState = {
    asrInputLanguageMode: "en",
    wakeWordEnabled: false,
    micOpen: true,
    micSession: 7,
    micSuspendDepth: 0,
    micRetryCount: 0,
    recognitionActive: false,
    chatBusy: false,
    micToggleBusy: false,
    listeningPresencePhase: "idle",
    listeningPresenceSession: 0,
    listeningPresenceRevision: 0
  };
  const browserController = wakeWord.createController({
    state: browserState,
    windowObject: {
      SpeechRecognition: FakeRecognition,
      setTimeout: () => 1,
      clearTimeout() {}
    },
    navigatorObject: {},
    scheduleMicRecognitionStart: () => {},
    enqueueMicTranscript: (text, sessionId) => browserTranscripts.push({ text, sessionId }),
    handleUserSpeechStart: (input) => browserSpeechStarts.push(input),
    setListeningPresence: (phase, options = {}) => {
      browserState.listeningPresencePhase = phase;
      browserState.listeningPresenceSession = Number(options.sessionId || 0);
      browserState.listeningPresenceRevision += 1;
      browserEvents.push({ phase, options: { ...options } });
      return true;
    },
    clearListeningPresence: () => {
      browserState.listeningPresencePhase = "idle";
      browserState.listeningPresenceSession = 0;
      browserState.listeningPresenceRevision += 1;
      browserEvents.push({ phase: "idle", options: {} });
      return true;
    }
  });
  browserController.setupSpeechRecognition();
  const recognition = browserState.recognition;
  recognition.onstart();
  assert.strictEqual(browserState.listeningPresencePhase, "armed", "browser recognition start should enter quiet listening only after the microphone session is active");
  recognition.onspeechstart();
  assert.strictEqual(browserState.listeningPresencePhase, "hearing", "browser speech-start should promote the visible pose before transcript finalization");
  assert.strictEqual(browserSpeechStarts.length, 1, "browser speech-start should forward one immediate barge-in decision");
  recognition.onspeechend();
  assert.strictEqual(browserState.listeningPresencePhase, "release", "browser speech-end should settle the hearing pose");
  recognition.onresult({
    resultIndex: 0,
    results: [{ isFinal: true, 0: { transcript: "hello companion" } }]
  });
  assert.deepStrictEqual(browserTranscripts, [{ text: "hello companion", sessionId: 7 }], "browser transcript should keep its active mic session");
  assert.strictEqual(browserSpeechStarts.length, 1, "a supported browser speech-start event should prevent a duplicate transcript-time interruption");
  assert.ok(
    browserEvents.every((event) => Object.keys(event.options).every((key) => ["sessionId", "level"].includes(key))),
    "browser listening callbacks should carry compact state only, never transcript content"
  );
  recognition.onend();
  assert.strictEqual(browserState.listeningPresencePhase, "armed", "continuous browser recognition should remain quietly armed between utterances");
  browserState.micSession = 8;
  recognition.onresult({
    resultIndex: 0,
    results: [{ isFinal: true, 0: { transcript: "stale text" } }]
  });
  assert.strictEqual(browserTranscripts.length, 1, "a late browser result from an old mic session must be ignored");

  console.log("Bilingual local ASR frontend checks passed.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
