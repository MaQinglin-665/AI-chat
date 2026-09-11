#!/usr/bin/env node
"use strict";

const assert = require("assert");
const path = require("path");

const CHAT_API_JS = path.resolve(__dirname, "..", "web", "chatApi.js");
const chatApi = require(CHAT_API_JS);

function makeJsonResponse(status, data) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => data
  };
}

function makeStreamResponse(lines) {
  const chunks = lines.map((line) => new TextEncoder().encode(line));
  let index = 0;
  return {
    ok: true,
    status: 200,
    body: {
      getReader() {
        return {
          async read() {
            if (index >= chunks.length) {
              return { done: true, value: undefined };
            }
            return { done: false, value: chunks[index++] };
          }
        };
      }
    }
  };
}

function makeHangingStreamResponse(cancelled) {
  return {
    ok: true,
    status: 200,
    body: {
      getReader() {
        return {
          async read() {
            return await new Promise(() => {});
          },
          async cancel() {
            cancelled.value = true;
          }
        };
      }
    }
  };
}

async function testBuildRequestInit() {
  const controller = new AbortController();
  const init = chatApi.buildChatRequestInit({ message: "hi" }, { signal: controller.signal });
  assert.strictEqual(init.method, "POST");
  assert.strictEqual(init.headers["Content-Type"], "application/json");
  assert.deepStrictEqual(JSON.parse(init.body), { message: "hi" });
  assert.strictEqual(init.signal, controller.signal);
  const keepalive = chatApi.buildChatRequestInit({ delivery_id: "delivery_receipt_0123456789abcd" }, { keepalive: true });
  assert.strictEqual(keepalive.keepalive, true);
}

async function testStreamingReply() {
  const deltas = [];
  const metadata = [];
  const brain = [];
  const headers = [];
  const firstDelta = [];
  const deliveryIds = [];
  const controller = new AbortController();
  const authFetch = async (url, init) => {
    assert.strictEqual(url, "/api/chat_stream");
    assert.strictEqual(init.signal, controller.signal);
    return makeStreamResponse([
      'data: {"type":"delta","text":"hel"}\n',
      'data: {"type":"delta","text":"lo"}\n',
      'data: {"type":"done","reply":"hello","character_runtime":{"emotion":"happy"},"character_brain":{"intent":"greeting"},"delivery_id":"delivery_receipt_0123456789abcd"}\n'
    ]);
  };

  const reply = await chatApi.streamAssistantReply(
    { message: "hi" },
    (delta) => deltas.push(delta),
    {
      authFetch,
      onCharacterRuntimeMetadata: (value) => metadata.push(value),
      onCharacterBrainDecision: (value) => brain.push(value),
      onDeliveryId: (value) => deliveryIds.push(value),
      perfHooks: {
        onApiHeaders: (value) => headers.push(value),
        onFirstDelta: (value) => firstDelta.push(value)
      },
      signal: controller.signal,
      now: () => 123
    }
  );

  assert.strictEqual(reply, "hello");
  assert.deepStrictEqual(deltas, ["hel", "lo"]);
  assert.deepStrictEqual(metadata, [{ emotion: "happy" }]);
  assert.deepStrictEqual(brain, [{ intent: "greeting" }]);
  assert.deepStrictEqual(deliveryIds, ["delivery_receipt_0123456789abcd"]);
  assert.strictEqual(headers[0].mode, "chat_stream");
  assert.strictEqual(firstDelta.length, 1);
}

async function testCompanionTurnIsDeliveredOnlyWhenItMatchesCanonicalReply() {
  const deltas = [];
  const runtimeMetadata = [];
  const turns = [];
  const turn = {
    version: 1,
    id: "chat-turn-1",
    reply_text: "hello",
    spoken_text: "hello",
    mode: "reply",
    input_modality: "text",
    performance: {
      emotion: "playful",
      action: "wave",
      intensity: "high",
      voice_style: "teasing",
      source: "character_runtime"
    },
    source: "model_direct"
  };
  const reply = await chatApi.streamAssistantReply(
    { message: "hi" },
    (delta) => deltas.push(delta),
    {
      authFetch: async () => makeStreamResponse([
        'data: {"type":"delta","text":"hel"}\n',
        'data: {"type":"delta","text":"lo"}\n',
        `data: ${JSON.stringify({ type: "done", reply: "hello", turn, character_runtime: { emotion: "sad" } })}\n`
      ]),
      onCompanionTurn: (value) => turns.push(value),
      onCharacterRuntimeMetadata: (value) => runtimeMetadata.push(value)
    }
  );

  assert.strictEqual(reply, "hello");
  assert.deepStrictEqual(deltas, ["hel", "lo"]);
  assert.deepStrictEqual(turns, [turn]);
  assert.deepStrictEqual(runtimeMetadata, [], "turn clients must not dispatch legacy runtime metadata a second time");

  const invalidTurns = [];
  const fallbackMetadata = [];
  await chatApi.streamAssistantReply(
    { message: "hi" },
    () => {},
    {
      authFetch: async () => makeStreamResponse([
        `data: ${JSON.stringify({ type: "done", reply: "hello", turn: { ...turn, spoken_text: "different" }, character_runtime: { emotion: "sad" } })}\n`
      ]),
      onCompanionTurn: (value) => invalidTurns.push(value),
      onCharacterRuntimeMetadata: (value) => fallbackMetadata.push(value)
    }
  );
  assert.deepStrictEqual(invalidTurns, []);
  assert.deepStrictEqual(fallbackMetadata, [{ emotion: "sad" }]);
}

async function testDirectFallbackDeliversCompanionTurn() {
  const turns = [];
  const deliveryIds = [];
  const reply = await chatApi.streamAssistantReply(
    { message: "hi" },
    () => {},
    {
      preferStream: false,
      authFetch: async () => makeJsonResponse(200, {
        reply: "direct reply",
        turn: {
          version: 1,
          id: "chat-turn-2",
          reply_text: "direct reply",
          spoken_text: "direct reply",
          performance: null
        },
        delivery_id: "delivery_receipt_0123456789abcd"
      }),
      onCompanionTurn: (value) => turns.push(value),
      onDeliveryId: (value) => deliveryIds.push(value),
      perfLog: () => {}
    }
  );
  assert.strictEqual(reply, "direct reply");
  assert.strictEqual(turns.length, 1);
  assert.strictEqual(turns[0].id, "chat-turn-2");
  assert.deepStrictEqual(deliveryIds, ["delivery_receipt_0123456789abcd"]);
}

async function testDeliveryReceiptIgnoresNonterminalOrInvalidValues() {
  const deliveryIds = [];
  await chatApi.streamAssistantReply(
    { message: "hi" },
    () => {},
    {
      authFetch: async () => makeStreamResponse([
        'data: {"type":"delta","text":"hello","delivery_id":"delivery_receipt_0123456789abcd"}\n',
        'data: {"type":"done","reply":"hello","delivery_id":"not a receipt"}\n'
      ]),
      onDeliveryId: (value) => deliveryIds.push(value)
    }
  );
  assert.deepStrictEqual(deliveryIds, [], "only a valid terminal delivery receipt may cross the chat API boundary");
}

async function testDeliveredTurnAckIsBoundedAndTokenOnly() {
  const calls = [];
  const acknowledged = await chatApi.acknowledgeDeliveredTurn(
    async (url, init) => {
      calls.push({ url, init });
      return makeJsonResponse(200, { ok: true, status: "committed" });
    },
    "delivery_receipt_0123456789abcd"
  );
  assert.strictEqual(acknowledged, true);
  assert.strictEqual(calls.length, 1);
  assert.strictEqual(calls[0].url, "/api/chat/delivery_ack");
  assert.deepStrictEqual(JSON.parse(calls[0].init.body), {
    delivery_id: "delivery_receipt_0123456789abcd"
  });
  assert.strictEqual(
    await chatApi.acknowledgeDeliveredTurn(async () => {
      throw new Error("must not request invalid receipt");
    }, "invalid receipt"),
    false,
    "an invalid receipt must not make an acknowledgement request"
  );
  assert.strictEqual(
    await chatApi.acknowledgeDeliveredTurn(
      async () => makeJsonResponse(410, { ok: false, status: "expired" }),
      "delivery_receipt_0123456789abcd"
    ),
    false,
    "an expired receipt must never be reported as confirmed"
  );
  assert.strictEqual(
    await chatApi.acknowledgeDeliveredTurn(
      async () => makeJsonResponse(200, { ok: true, status: "already_committed" }),
      "delivery_receipt_0123456789abcd"
    ),
    true,
    "a retained completed tombstone should make a lost response safely retryable"
  );
}

function makeMemoryStorage(initial = {}) {
  const values = new Map(Object.entries(initial));
  return {
    getItem: (key) => values.has(key) ? values.get(key) : null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: (key) => values.delete(key),
    snapshot: () => Object.fromEntries(values.entries())
  };
}

async function testDeliveredTurnAckQueueRetriesTransientFailureAndPersistsOnlyReceiptMetadata() {
  const storage = makeMemoryStorage();
  const reports = [];
  let clock = 1000;
  let calls = 0;
  const queue = chatApi.createDeliveredTurnAckQueue({
    storage,
    now: () => clock,
    setTimeout: () => 0,
    clearTimeout: () => {},
    retryDelaysMs: [10],
    sender: async () => {
      calls += 1;
      return calls === 1
        ? { confirmed: false, retryable: true, outcome: "network_error" }
        : { confirmed: true, retryable: false, outcome: "committed" };
    },
    onResult: (result) => reports.push(result)
  });

  assert.strictEqual(queue.enqueue("delivery_receipt_0123456789abcd"), true);
  const stored = JSON.parse(storage.snapshot()["taffy.delivery_receipts.v1"]);
  assert.deepStrictEqual(Object.keys(stored[0]).sort(), ["attempts", "id", "nextAt", "queuedAt"]);
  assert.strictEqual(stored[0].id, "delivery_receipt_0123456789abcd");
  assert.strictEqual(await queue.runNext(), false);
  assert.deepStrictEqual(queue.getPendingIds(), ["delivery_receipt_0123456789abcd"]);
  clock += 250;
  assert.strictEqual(await queue.runNext(), true);
  assert.deepStrictEqual(queue.getPendingIds(), []);
  assert.deepStrictEqual(storage.snapshot(), {});
  assert.deepStrictEqual(reports, [{ confirmed: true, retryable: false, outcome: "committed", attempts: 2 }]);
}

async function testDeliveredTurnAckQueueRestoresAndDropsPermanentFailure() {
  const storage = makeMemoryStorage({
    "taffy.delivery_receipts.v1": JSON.stringify([{
      id: "delivery_receipt_0123456789abcd",
      queuedAt: 1000,
      attempts: 1,
      nextAt: 1000
    }])
  });
  const reports = [];
  const queue = chatApi.createDeliveredTurnAckQueue({
    storage,
    now: () => 1200,
    setTimeout: () => 0,
    clearTimeout: () => {},
    sender: async () => ({ confirmed: false, retryable: false, outcome: "expired" }),
    onResult: (result) => reports.push(result)
  });

  assert.deepStrictEqual(queue.getPendingIds(), ["delivery_receipt_0123456789abcd"]);
  assert.strictEqual(await queue.runNext(), false);
  assert.deepStrictEqual(queue.getPendingIds(), []);
  assert.deepStrictEqual(storage.snapshot(), {});
  assert.deepStrictEqual(reports, [{ confirmed: false, retryable: false, outcome: "expired", attempts: 2 }]);
}

async function testStreamFetchFallback() {
  const urls = [];
  const deltas = [];
  const authFetch = async (url) => {
    urls.push(url);
    if (url === "/api/chat_stream") {
      throw new Error("network down");
    }
    return makeJsonResponse(200, {
      reply: "direct reply",
      character_runtime: { action: "wave" },
      character_brain: { intent: "comfort" }
    });
  };

  const metadata = [];
  const brain = [];
  const reply = await chatApi.streamAssistantReply(
    { message: "hi" },
    (delta) => deltas.push(delta),
    {
      authFetch,
      onCharacterRuntimeMetadata: (value) => metadata.push(value),
      onCharacterBrainDecision: (value) => brain.push(value),
      perfLog: () => {},
      now: () => 10
    }
  );

  assert.deepStrictEqual(urls, ["/api/chat_stream", "/api/chat"]);
  assert.strictEqual(reply, "direct reply");
  assert.deepStrictEqual(deltas, ["direct reply"]);
  assert.deepStrictEqual(metadata, [{ action: "wave" }]);
  assert.deepStrictEqual(brain, [{ intent: "comfort" }]);
}

async function testStreamDisabledUsesDirectChat() {
  const urls = [];
  const deltas = [];
  const metadata = [];
  const logs = [];
  const authFetch = async (url) => {
    urls.push(url);
    return makeJsonResponse(200, {
      reply: "direct only",
      character_runtime: { emotion: "happy" }
    });
  };

  const reply = await chatApi.streamAssistantReply(
    { message: "hi" },
    (delta) => deltas.push(delta),
    {
      authFetch,
      preferStream: false,
      onCharacterRuntimeMetadata: (value) => metadata.push(value),
      perfLog: (scope, event, data) => logs.push({ scope, event, data })
    }
  );

  assert.deepStrictEqual(urls, ["/api/chat"]);
  assert.strictEqual(reply, "direct only");
  assert.deepStrictEqual(deltas, ["direct only"]);
  assert.deepStrictEqual(metadata, [{ emotion: "happy" }]);
  assert.strictEqual(logs[0].event, "stream_disabled");
}

async function testStreamReaderErrorBeforeDeltaFallback() {
  const urls = [];
  const authFetch = async (url) => {
    urls.push(url);
    if (url === "/api/chat_stream") {
      return makeStreamResponse(['data: {"type":"error","error":"bad"}\n']);
    }
    return makeJsonResponse(200, { reply: "fallback reply" });
  };

  const reply = await chatApi.streamAssistantReply(
    { message: "hi" },
    () => {},
    { authFetch, perfLog: () => {} }
  );

  assert.deepStrictEqual(urls, ["/api/chat_stream", "/api/chat"]);
  assert.strictEqual(reply, "fallback reply");
}

async function testStreamFirstDeltaTimeoutFallback() {
  const urls = [];
  const cancelled = { value: false };
  const deltas = [];
  const authFetch = async (url) => {
    urls.push(url);
    if (url === "/api/chat_stream") {
      return makeHangingStreamResponse(cancelled);
    }
    return makeJsonResponse(200, { reply: "fallback after timeout" });
  };

  const reply = await chatApi.streamAssistantReply(
    { message: "hi" },
    (delta) => deltas.push(delta),
    {
      authFetch,
      firstDeltaTimeoutMs: 5,
      perfLog: () => {}
    }
  );

  assert.deepStrictEqual(urls, ["/api/chat_stream", "/api/chat"]);
  assert.strictEqual(reply, "fallback after timeout");
  assert.deepStrictEqual(deltas, ["fallback after timeout"]);
  assert.strictEqual(cancelled.value, true);
}

async function testStreamErrorFallbackFailureKeepsDiagnostic() {
  const urls = [];
  const authFetch = async (url) => {
    urls.push(url);
    if (url === "/api/chat_stream") {
      return makeStreamResponse(['data: {"type":"error","error":"LLM diagnostic detail"}\n']);
    }
    throw new Error("Failed to fetch");
  };

  await assert.rejects(
    () => chatApi.streamAssistantReply(
      { message: "hi" },
      () => {},
      { authFetch, perfLog: () => {} }
    ),
    (err) => {
      assert.match(err.message, /LLM diagnostic detail/);
      assert.match(err.message, /Failed to fetch/);
      return true;
    }
  );
  assert.deepStrictEqual(urls, ["/api/chat_stream", "/api/chat"]);
}

async function testAbortDoesNotFallbackToDirectChat() {
  const urls = [];
  const controller = new AbortController();
  controller.abort();

  await assert.rejects(
    () => chatApi.streamAssistantReply(
      { message: "hi" },
      () => {},
      {
        authFetch: async (url) => {
          urls.push(url);
          return makeJsonResponse(200, { reply: "should not run" });
        },
        signal: controller.signal,
        perfLog: () => {}
      }
    ),
    (err) => {
      assert.strictEqual(err.name, "AbortError");
      return true;
    }
  );
  assert.deepStrictEqual(urls, []);
}

async function main() {
  await testBuildRequestInit();
  await testStreamingReply();
  await testCompanionTurnIsDeliveredOnlyWhenItMatchesCanonicalReply();
  await testDirectFallbackDeliversCompanionTurn();
  await testDeliveryReceiptIgnoresNonterminalOrInvalidValues();
  await testDeliveredTurnAckIsBoundedAndTokenOnly();
  await testDeliveredTurnAckQueueRetriesTransientFailureAndPersistsOnlyReceiptMetadata();
  await testDeliveredTurnAckQueueRestoresAndDropsPermanentFailure();
  await testStreamFetchFallback();
  await testStreamDisabledUsesDirectChat();
  await testStreamReaderErrorBeforeDeltaFallback();
  await testStreamFirstDeltaTimeoutFallback();
  await testStreamErrorFallbackFailureKeepsDiagnostic();
  await testAbortDoesNotFallbackToDirectChat();
  console.log("Chat API frontend checks passed.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
