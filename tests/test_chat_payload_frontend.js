#!/usr/bin/env node
"use strict";

const assert = require("assert");
const path = require("path");

const CHAT_PAYLOAD_JS = path.resolve(__dirname, "..", "web", "chatPayloadBuilder.js");
const payloadBuilder = require(CHAT_PAYLOAD_JS);

function testInputModalityNormalization() {
  assert.strictEqual(payloadBuilder.normalizeInputModality("speech"), "voice");
  assert.strictEqual(payloadBuilder.normalizeInputModality("microphone"), "voice");
  assert.strictEqual(payloadBuilder.normalizeInputModality("proactive"), "auto");
  assert.strictEqual(payloadBuilder.normalizeInputModality("unknown", "voice"), "text");
}

function testAsrContextNormalization() {
  assert.strictEqual(payloadBuilder.normalizeAsrConversationContext({ needs_confirmation: false }), null);
  assert.deepStrictEqual(
    payloadBuilder.normalizeAsrConversationContext({
      needs_confirmation: true,
      source: " local-vosk ",
      raw_text: "  raw words  ",
      final_text: " final words ",
      confidence: 9,
      confidence_reason: " probably close "
    }),
    {
      version: 1,
      source: "local-vosk",
      raw_text: "raw words",
      final_text: "final words",
      confidence: 1,
      reason: "probably close",
      needs_confirmation: true
    }
  );
}

function testBargeInPolicyClassification() {
  assert.strictEqual(payloadBuilder.classifyBargeInReplyPolicy("stop, never mind").reply_move, "yield");
  assert.strictEqual(payloadBuilder.classifyBargeInReplyPolicy("continue that thought").reply_move, "continue_topic");
  assert.strictEqual(payloadBuilder.classifyBargeInReplyPolicy("no, I meant the other one").reply_move, "repair");
}

function testPayloadBuildsManualContextWithoutMutatingInput() {
  const interruptionContext = {
    version: 1,
    reason: "user_input",
    assistant_partial: "old draft"
  };
  const result = payloadBuilder.buildAssistantRequestPayload({
    message: "continue that thought",
    history: [
      { role: "user", content: "hello", ignored: true },
      { role: "assistant", content: "hi" }
    ],
    auto: false,
    inputModality: "speech",
    forceTools: true,
    perfTraceId: "trace-1",
    clientSendTsMs: 123.4,
    interruptionContext,
    asrContext: {
      needs_confirmation: true,
      raw_text: "contin you",
      final_text: "continue",
      confidence: 0.42
    },
    imageDataUrl: "data:image/png;base64,abc",
    characterExperienceProfile: { tone: "warm" }
  });

  assert.deepStrictEqual(result.replyPolicy, {
    version: 1,
    kind: "continue",
    reply_move: "continue_topic",
    goal: "continue_only_if_user_asked",
    source: "latest_user_message"
  });
  assert.deepStrictEqual(result.payload, {
    message: "continue that thought",
    history: [
      { role: "user", content: "hello" },
      { role: "assistant", content: "hi" }
    ],
    auto: false,
    input_modality: "voice",
    force_tools: true,
    _perf_trace_id: "trace-1",
    _perf_client_send_ts_ms: 123,
    conversation_context: {
      interruption: {
        version: 1,
        reason: "user_input",
        assistant_partial: "old draft",
        reply_policy: result.replyPolicy
      },
      asr: {
        version: 1,
        source: "voice_transcript",
        raw_text: "contin you",
        final_text: "continue",
        confidence: 0.42,
        reason: "",
        needs_confirmation: true
      }
    },
    image_data_url: "data:image/png;base64,abc",
    character_experience_profile: { tone: "warm" }
  });
  assert.strictEqual(interruptionContext.reply_policy, undefined);
}

function testPayloadBuildsAutoExtras() {
  const result = payloadBuilder.buildAssistantRequestPayload({
    message: "check in",
    auto: true,
    inputModality: "text",
    forceTools: false,
    perfTraceId: "auto-1",
    clientSendTsMs: 99,
    interruptionContext: { reason: "ignored" },
    asrContext: { needs_confirmation: true, final_text: "ignored" },
    autoKind: "low_interrupt_checkin_with_extra_text_that_is_trimmed",
    autoThoughtBurst: { thought_type: "care" }
  });

  assert.strictEqual(result.replyPolicy, null);
  assert.deepStrictEqual(result.payload, {
    message: "check in",
    history: [],
    auto: true,
    input_modality: "auto",
    force_tools: false,
    _perf_trace_id: "auto-1",
    _perf_client_send_ts_ms: 99,
    auto_kind: "low_interrupt_checkin_with_extra_text_th",
    auto_thought_burst: { thought_type: "care" }
  });
}

function main() {
  testInputModalityNormalization();
  testAsrContextNormalization();
  testBargeInPolicyClassification();
  testPayloadBuildsManualContextWithoutMutatingInput();
  testPayloadBuildsAutoExtras();
  console.log("Chat payload frontend checks passed.");
}

main();
