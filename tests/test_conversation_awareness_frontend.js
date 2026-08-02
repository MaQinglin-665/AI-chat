const assert = require("assert");
const autoChatController = require("../web/autoChatController.js");

async function run() {
  const timers = [];
  const requests = [];
  const now = Date.now();
  const state = {
    autoChatEnabled: true,
    autoChatDispatchInFlight: false,
    naturalConversation: { enabled: true },
    naturalConversationDecision: null,
    lastUserMessageAt: now,
    conversationLastAssistantAt: 0,
    chatRecords: [],
    autoChatTuning: {}
  };
  const windowObject = {
    setTimeout(callback, delay) {
      timers.push({ callback, delay });
      return timers.length;
    },
    clearTimeout() {}
  };
  const controller = autoChatController.createController({
    state,
    windowObject,
    documentObject: { activeElement: null },
    requestAssistantReply: async (_prompt, options) => {
      requests.push(options);
      state.naturalConversationDecision = {
        version: 1,
        mode: "silence",
        thinking_level: "quick",
        thinking_delay_ms: 650,
        reaction: ""
      };
      return true;
    },
    constants: {
      CONVERSATION_AWARENESS_PULSE_MIN_MS: 1000,
      CONVERSATION_AWARENESS_PULSE_MAX_MS: 1000
    }
  });

  const queued = controller.queueConversationAwareness({
    userText: "我刚才只是忽然想到这件事。",
    mode: "defer",
    reaction: "thinking",
    userTimestamp: now
  });
  assert.strictEqual(queued.queued, true, "a deferred voice turn should enter awareness while active companionship is on");
  assert.ok(state.conversationAwarenessPending, "the short-lived candidate should remain inspectable in memory");
  assert.ok(timers.length > 0, "awareness should schedule a lightweight pulse");

  state.conversationAwarenessTimer = 0;
  state.conversationAwarenessPending.dueAt = Date.now() - 1;
  await controller.runConversationAwarenessPulse();
  assert.strictEqual(requests.length, 1, "an idle due candidate should be reconsidered once");
  assert.strictEqual(requests[0].naturalParticipation, true, "reconsideration must preserve the model's right to remain silent");
  assert.strictEqual(state.autoChatInterjectionLastOk, false, "a silent reconsideration must not be counted as spoken proactive success");
  assert.strictEqual(state.conversationAwarenessPending, null, "a final silence should close the candidate");
  assert.strictEqual(state.conversationAwarenessLastResult, "quiet:silence");

  state.conversationAwarenessTimer = 0;
  controller.queueConversationAwareness({
    userText: "这个念头也许待会再说。",
    mode: "defer",
    userTimestamp: Date.now()
  });
  state.conversationAwarenessTimer = 0;
  state.conversationAwarenessPending.dueAt = Date.now() - 1;
  state.lastUserMessageAt = Date.now() + 1000;
  await controller.runConversationAwarenessPulse();
  assert.strictEqual(requests.length, 1, "newer user speech should supersede a stale candidate before another model call");
  assert.strictEqual(state.conversationAwarenessPending, null);
  assert.strictEqual(state.conversationAwarenessLastResult, "superseded_by_user");

  state.autoChatEnabled = false;
  const disabled = controller.queueConversationAwareness({
    userText: "关闭以后不该继续想。",
    mode: "defer"
  });
  assert.strictEqual(disabled.queued, false, "active companionship remains the hard opt-in gate");
}

run().then(() => {
  console.log("conversation awareness frontend tests passed");
}).catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
