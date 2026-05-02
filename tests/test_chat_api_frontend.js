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

async function testBuildRequestInit() {
  const init = chatApi.buildChatRequestInit({ message: "hi" });
  assert.strictEqual(init.method, "POST");
  assert.strictEqual(init.headers["Content-Type"], "application/json");
  assert.deepStrictEqual(JSON.parse(init.body), { message: "hi" });
}

async function testStreamingReply() {
  const deltas = [];
  const metadata = [];
  const headers = [];
  const firstDelta = [];
  const authFetch = async (url) => {
    assert.strictEqual(url, "/api/chat_stream");
    return makeStreamResponse([
      'data: {"type":"delta","text":"hel"}\n',
      'data: {"type":"delta","text":"lo"}\n',
      'data: {"type":"done","reply":"hello","character_runtime":{"emotion":"happy"}}\n'
    ]);
  };

  const reply = await chatApi.streamAssistantReply(
    { message: "hi" },
    (delta) => deltas.push(delta),
    {
      authFetch,
      onCharacterRuntimeMetadata: (value) => metadata.push(value),
      perfHooks: {
        onApiHeaders: (value) => headers.push(value),
        onFirstDelta: (value) => firstDelta.push(value)
      },
      now: () => 123
    }
  );

  assert.strictEqual(reply, "hello");
  assert.deepStrictEqual(deltas, ["hel", "lo"]);
  assert.deepStrictEqual(metadata, [{ emotion: "happy" }]);
  assert.strictEqual(headers[0].mode, "chat_stream");
  assert.strictEqual(firstDelta.length, 1);
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
      character_runtime: { action: "wave" }
    });
  };

  const metadata = [];
  const reply = await chatApi.streamAssistantReply(
    { message: "hi" },
    (delta) => deltas.push(delta),
    {
      authFetch,
      onCharacterRuntimeMetadata: (value) => metadata.push(value),
      perfLog: () => {},
      now: () => 10
    }
  );

  assert.deepStrictEqual(urls, ["/api/chat_stream", "/api/chat"]);
  assert.strictEqual(reply, "direct reply");
  assert.deepStrictEqual(deltas, ["direct reply"]);
  assert.deepStrictEqual(metadata, [{ action: "wave" }]);
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

async function main() {
  await testBuildRequestInit();
  await testStreamingReply();
  await testStreamFetchFallback();
  await testStreamReaderErrorBeforeDeltaFallback();
  await testStreamErrorFallbackFailureKeepsDiagnostic();
  console.log("Chat API frontend checks passed.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
