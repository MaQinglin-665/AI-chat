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
  const anchoredContext = controller.buildConversationAwarenessContext(state.conversationAwarenessPending);
  assert.strictEqual(anchoredContext.conversationAnchor, "我刚才只是忽然想到这件事。", "deferred reconsideration should retain the full conversational anchor");
  assert.ok(!controller.buildAutoChatPrompt(anchoredContext).includes("Reply in English only"));

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

  const mindState = {
    autoChatEnabled: true,
    autoChatDispatchInFlight: false,
    naturalConversation: { enabled: true },
    lastUserMessageAt: now,
    conversationLastAssistantAt: now,
    chatRecords: [
      { role: "user", content: "我其实还没说完。", timestamp: now },
      { role: "assistant", content: "嗯，我在听。", timestamp: now }
    ],
    autoChatTuning: {}
  };
  const mindController = autoChatController.createController({
    state: mindState,
    windowObject,
    documentObject: { activeElement: null },
    getInteractionMindDecision: async (snapshot) => ({
      enabled: true,
      decision: {
        action: "ask_followup",
        confidence: 0.91,
        interaction_open: true,
        reason_code: "unfinished_meaning",
        topic_anchor: snapshot.latest_user,
        utterance_intent: "顺着对方没说完的意思追问",
        wait_ms: 8000
      }
    })
  });
  const replyQueued = mindController.queueConversationAwareness({
    userText: "我其实还没说完。",
    mode: "reply",
    userTimestamp: now
  });
  const mindDecision = await mindController.consultInteractionMind(
    mindController.buildConversationAwarenessContext(mindState.conversationAwarenessPending),
    "interaction_pulse"
  );
  const minded = mindController.applyInteractionMindDecision({}, mindDecision);
  assert.strictEqual(replyQueued.queued, true, "a normal reply should keep a bounded interaction pulse alive");
  assert.strictEqual(minded.shouldTrigger, true);
  assert.strictEqual(minded.mindAction, "ask_followup");
  assert.ok(minded.mindUtteranceIntent.includes("追问"));

  const interruptRequests = [];
  mindState.localAsrSpeeching = true;
  mindState.localAsrStreamingPreviewText = "等一下，这里真正关键的是后半段";
  const interruptController = autoChatController.createController({
    state: mindState,
    windowObject,
    documentObject: { activeElement: null },
    requestAssistantReply: async (_prompt, options) => {
      interruptRequests.push(options);
      return true;
    }
  });
  const interruptSnapshot = interruptController.buildInteractionMindSnapshot({}, "live_speech");
  assert.strictEqual(interruptSnapshot.latest_user, mindState.localAsrStreamingPreviewText, "live partial speech should ground a possible interruption");
  await interruptController.dispatchAutoChatContext(interruptController.applyInteractionMindDecision({}, {
    action: "interrupt",
    confidence: 0.93,
    interaction_open: true,
    reason_code: "useful_followup",
    topic_anchor: "后半段",
    utterance_intent: "只抢一句高度相关的短反应"
  }));
  assert.strictEqual(interruptRequests.length, 1, "a high-confidence mind interruption may pass the user-speaking gate");
  mindState.localAsrSpeeching = false;

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
