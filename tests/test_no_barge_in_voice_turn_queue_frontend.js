#!/usr/bin/env node
"use strict";

const assert = require("assert");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const localAsrController = require(path.join(ROOT, "web", "localAsrController.js"));

function makeHarness({ interruptTtsOnUserSpeech = false, chatBusy = false, assistantAudioActive = false } = {}) {
  const timers = [];
  const sent = [];
  const state = {
    micOpen: true,
    micSession: 7,
    micQueue: [],
    micQueueWorking: false,
    micQueueRetryTimer: 0,
    micQueueLastDeferredAt: 0,
    micQueueLastDeferredReason: "",
    micQueueLastDroppedReason: "",
    history: [],
    asrHotwordRules: [],
    asrSemanticCorrectionEnabled: false,
    voiceTurnMergeWindowMs: 0,
    chatBusy,
    streamSpeakWorking: assistantAudioActive,
    ttsContextSpeaking: false,
    speechPhase: "idle",
    conversationMode: { interruptTtsOnUserSpeech }
  };
  const windowObject = {
    setTimeout(fn, ms) {
      const timer = { fn, ms, cleared: false };
      timers.push(timer);
      return timer;
    },
    clearTimeout(timer) {
      if (timer) {
        timer.cleared = true;
      }
    }
  };
  const controller = localAsrController.createController({
    state,
    ui: { chatInput: { value: "" } },
    windowObject,
    scheduleWakeWordStart: () => {},
    requestAssistantReply: async (text, opts) => {
      sent.push({ text, opts });
      return true;
    }
  });
  return { controller, state, timers, sent };
}

async function settleQueue() {
  for (let i = 0; i < 8; i += 1) {
    await Promise.resolve();
  }
}

async function main() {
  {
    const harness = makeHarness({ interruptTtsOnUserSpeech: false, chatBusy: true });
    harness.controller.sendAsrTranscript("first late voice turn", { source: "voice_transcript" });
    harness.controller.sendAsrTranscript("second late voice turn", { source: "voice_transcript" });

    assert.strictEqual(harness.sent.length, 0, "no-barge-in voice turns must not be dropped or dispatched while an assistant turn is busy");
    assert.strictEqual(harness.state.micQueue.length, 2, "both completed transcripts should remain queued in FIFO order");
    assert.strictEqual(harness.timers.length, 1, "one bounded retry timer should cover the queue head");
    assert.strictEqual(harness.state.micQueueLastDeferredReason, "assistant_turn_busy", "the deferred reason should remain inspectable");

    harness.state.chatBusy = false;
    harness.timers[0].fn();
    await settleQueue();

    assert.deepStrictEqual(
      harness.sent.map((item) => item.text),
      ["first late voice turn", "second late voice turn"],
      "deferred no-barge-in transcripts should dispatch once and preserve FIFO order after the assistant turn settles"
    );
    assert.ok(
      harness.sent.every((item) => item.opts.interruptActive === false && item.opts.interruptTts === false),
      "deferred no-barge-in transcripts must keep the non-interrupting request contract"
    );
    assert.ok(
      harness.sent.every((item) => item.opts.speechTurnWaitMs === 30000),
      "a deferred voice turn should wait through a bounded active speech window rather than immediately failing"
    );
  }

  {
    const harness = makeHarness({ interruptTtsOnUserSpeech: false, assistantAudioActive: true });
    harness.controller.sendAsrTranscript("wait for the audible tail", { source: "voice_transcript" });

    assert.strictEqual(harness.sent.length, 0, "no-barge-in ASR must remain queued while assistant stream/audio work is active even after chatBusy clears");
    assert.strictEqual(harness.state.micQueue.length, 1, "an ASR transcript caught during an audible tail should remain retained");
    assert.strictEqual(harness.state.micQueueLastDeferredReason, "assistant_audio_active", "audio-tail deferral should remain inspectable without exposing transcript text");

    harness.state.streamSpeakWorking = false;
    harness.timers[0].fn();
    await settleQueue();
    assert.deepStrictEqual(
      harness.sent.map((item) => item.text),
      ["wait for the audible tail"],
      "the deferred transcript should dispatch once the assistant audio/stream state settles"
    );
  }

  {
    const harness = makeHarness({ interruptTtsOnUserSpeech: false, chatBusy: true });
    harness.controller.sendAsrTranscript("discard on close", { source: "voice_transcript" });
    const retryTimer = harness.timers[0];
    assert.ok(retryTimer, "a busy no-barge-in turn should have a pending retry before manual close");

    harness.controller.stopMicLoop(true);
    retryTimer.fn();
    await settleQueue();

    assert.strictEqual(retryTimer.cleared, true, "manual microphone close should clear the pending voice retry timer");
    assert.strictEqual(harness.state.micQueue.length, 0, "manual microphone close should discard only pending queued voice turns");
    assert.strictEqual(harness.sent.length, 0, "a stale retry callback must not dispatch a closed-microphone transcript");
  }

  {
    const harness = makeHarness({ interruptTtsOnUserSpeech: false, chatBusy: true });
    harness.controller.sendAsrTranscript("expired turn", { source: "voice_transcript" });
    harness.state.micQueue[0].queuedAt = Date.now() - 30001;
    await harness.controller.runMicQueue();

    assert.strictEqual(harness.state.micQueue.length, 0, "a no-barge-in voice turn should not wait indefinitely behind a stuck assistant turn");
    assert.strictEqual(harness.state.micQueueLastDroppedReason, "no_barge_in_wait_timeout", "bounded queue expiry should be observable without retaining transcript text");
  }

  {
    const harness = makeHarness({ interruptTtsOnUserSpeech: false, chatBusy: true });
    harness.controller.sendAsrTranscript("stale session turn", { source: "voice_transcript" });
    harness.state.micSession += 1;
    await harness.controller.runMicQueue();

    assert.strictEqual(harness.state.micQueue.length, 0, "a transcript from an older microphone session must not enter a newer listening session");
    assert.strictEqual(harness.state.micQueueLastDroppedReason, "stale_mic_session", "stale microphone-session cleanup should remain inspectable without retaining transcript text");
    assert.strictEqual(harness.sent.length, 0, "a stale microphone-session transcript must never dispatch");
  }

  {
    const harness = makeHarness({ interruptTtsOnUserSpeech: true, assistantAudioActive: true });
    harness.controller.sendAsrTranscript("interrupt now", { source: "voice_transcript" });
    await settleQueue();

    assert.strictEqual(harness.sent.length, 1, "barge-in voice input must retain immediate dispatch while an assistant turn is busy");
    assert.strictEqual(harness.timers.length, 0, "barge-in voice input must not enter the no-barge-in retry queue");
    assert.strictEqual(harness.sent[0].opts.interruptActive, true, "barge-in voice input must still request active-turn interruption");
    assert.strictEqual(harness.sent[0].opts.interruptTts, true, "barge-in voice input must still request TTS interruption");
  }
}

main().then(() => {
  console.log("[OK] No-barge-in voice turn queue frontend checks passed.");
}).catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
