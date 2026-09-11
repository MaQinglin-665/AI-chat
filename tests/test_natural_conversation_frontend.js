const assert = require("assert");
const chatApi = require("../web/chatApi.js");
const chatState = require("../web/chatState.js");
const chatReplyController = require("../web/chatReplyController.js");

(function testDecisionNormalization() {
  const decision = chatApi.normalizeConversationDecision({
    version: 1,
    mode: "micro_reaction",
    thinking_level: "deep",
    thinking_delay_ms: 2400,
    reaction: "concerned"
  });
  assert.deepStrictEqual(decision, {
    version: 1,
    mode: "micro_reaction",
    thinking_level: "deep",
    thinking_delay_ms: 2400,
    reaction: "concerned"
  });
  assert.strictEqual(chatApi.normalizeConversationDecision({ version: 1, mode: "invalid" }), null);
})();

(function testSilentDoneEventCarriesDecisionWithoutText() {
  const decisions = [];
  const handler = chatApi.createStreamLineHandler({
    onConversationDecision: (decision) => decisions.push(decision)
  });
  const done = handler.handleDataLine(
    `data: ${JSON.stringify({
      type: "done",
      reply: "",
      conversation_decision: {
        version: 1,
        mode: "silence",
        thinking_level: "quick",
        thinking_delay_ms: 650,
        reaction: ""
      }
    })}`
  );
  assert.strictEqual(done, true);
  assert.strictEqual(handler.getReply(), "");
  assert.strictEqual(decisions.length, 1);
  assert.strictEqual(decisions[0].mode, "silence");
})();

(function testReplyStillStreamsNormally() {
  let visible = "";
  const handler = chatApi.createStreamLineHandler({
    onDelta: (text) => { visible += text; },
    onConversationDecision: () => {}
  });
  handler.handleDataLine('data: {"type":"delta","text":"想好了。"}');
  handler.handleDataLine(
    'data: {"type":"done","reply":"想好了。","conversation_decision":{"version":1,"mode":"reply","thinking_level":"normal","thinking_delay_ms":1200,"reaction":""}}'
  );
  assert.strictEqual(visible, "想好了。");
  assert.strictEqual(handler.getReply(), "想好了。");
})();

(async function testControllerFinishesSilentTurnWithoutEmptyAssistantCard() {
  const state = chatState.createInitialState();
  state.history = [];
  state.naturalConversation.enabled = true;
  state.naturalConversation.rememberAmbientContext = true;
  state.conversationMode.chatStreamEnabled = true;
  const rows = [];
  const remembered = [];
  const debug = [];
  const fakeChatApi = {
    async streamAssistantReply(_payload, _onDelta, options) {
      options.onConversationDecision({
        version: 1,
        mode: "micro_reaction",
        thinking_level: "quick",
        thinking_delay_ms: 650,
        reaction: "curious"
      });
      return "";
    }
  };
  const windowObject = {
    setTimeout,
    clearTimeout,
    AbortController,
    TaffyModules: { chatApi: fakeChatApi }
  };
  const controller = chatReplyController.createController({
    state,
    ui: {},
    windowObject,
    performanceObject: { now: () => Date.now() },
    appendMessage(role, text) {
      const row = {
        role,
        text,
        removed: false,
        dataset: {},
        classList: { add() {} },
        remove() { this.removed = true; },
        querySelector() { return null; }
      };
      rows.push(row);
      return row;
    },
    rememberMessage: (role, content) => remembered.push({ role, content }),
    recordTTSDebugEvent: (event, payload) => debug.push({ event, payload }),
    setStatus: () => {},
    stopWakeWordListener: () => {},
    pauseMicForAssistant: () => false,
    resumeMicAfterAssistant: () => false,
    clearThinkingMotionTimer: () => {},
    clearPerformanceTimelineTimers: () => {},
    clearPerformancePhase: () => {},
    publishPerformancePhase: () => true,
    enqueueActionIntent: () => true,
    updateMicButton: () => {}
  });

  const ok = await controller.requestAssistantReply("我随口说一句。", {
    inputModality: "voice",
    interruptActive: false
  });
  const assistantRow = rows.find((row) => row.role === "assistant");
  assert.strictEqual(ok, true);
  assert.strictEqual(assistantRow.removed, true);
  assert.strictEqual(remembered.some((item) => item.role === "assistant"), false);
  assert.ok(state.conversationLastHandledUserAt > 0);
  assert.strictEqual(state.naturalConversationAmbient.mode, "micro_reaction");
  assert.ok(debug.some((item) => item.event === "natural_conversation_no_reply"));
})().then(() => {
  console.log("natural conversation frontend tests passed");
}).catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
