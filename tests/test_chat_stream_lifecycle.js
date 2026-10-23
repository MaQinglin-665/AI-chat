"use strict";
const assert = require("assert");
const { readStreamingReply } = require("../web/chatApi.js");
const bytes = text => new TextEncoder().encode(text);

function response(read, cancel = () => {}) {
  const stats = { cancelled: 0, released: 0 };
  return { stats, body: { getReader: () => ({ read,
    cancel() { stats.cancelled++; return cancel(); },
    releaseLock() { stats.released++; }
  }) } };
}

async function main() {
  let time = 0, reads = 0;
  const heartbeats = response(async () => {
    time += 4;
    if (++reads < 6) return { done: false, value: bytes(": heartbeat\n") };
    return { done: true };
  });
  await assert.rejects(() => readStreamingReply(heartbeats, {
    now: () => time, firstDeltaTimeoutMs: 10
  }), /no text within/);
  assert.ok(reads < 6, "heartbeats must not reset the first-text deadline");
  assert.strictEqual(heartbeats.stats.cancelled, 1);
  assert.strictEqual(heartbeats.stats.released, 1);

  const complete = response(async () => ({ done: false, value: bytes('data: {"type":"done","reply":"ok"}\n') }));
  assert.strictEqual((await readStreamingReply(complete, {})).reply, "ok");
  assert.deepStrictEqual(complete.stats, { cancelled: 1, released: 1 });

  let step = 0;
  const partial = response(async () => {
    if (step++ === 0) return { done: false, value: bytes('data: {"type":"delta","text":"half"}\n') };
    throw new Error("connection lost");
  });
  await assert.rejects(() => readStreamingReply(partial, {}), err => err.seenFirstDelta === true);
  assert.deepStrictEqual(partial.stats, { cancelled: 1, released: 1 });

  const eof = response(async () => ({ done: true }));
  await readStreamingReply(eof, {});
  assert.deepStrictEqual(eof.stats, { cancelled: 0, released: 1 });

  // Cancel itself may wait indefinitely on a broken transport; finishing must not.
  const slowCancel = response(async () => ({ done: false, value: bytes("data: [DONE]\n") }), () => new Promise(() => {}));
  let timer;
  try {
    await Promise.race([readStreamingReply(slowCancel, {}), new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error("cleanup blocked completion")), 200);
    })]);
  } finally { clearTimeout(timer); }
  assert.deepStrictEqual(slowCancel.stats, { cancelled: 1, released: 1 });

  // Exercise real reader locking and a pending read, not just the fake reader.
  let nativeCancelled = false;
  const nativeBody = new ReadableStream({
    start(controller) { controller.enqueue(bytes(": heartbeat\n")); },
    cancel() { nativeCancelled = true; }
  });
  await assert.rejects(() => readStreamingReply({ body: nativeBody }, {
    firstDeltaTimeoutMs: 20
  }), /no text within/);
  assert.strictEqual(nativeCancelled, true);
  assert.strictEqual(nativeBody.locked, false);
  console.log("Chat stream deadline and reader lifecycle passed.");
}
main().catch(error => { console.error(error); process.exitCode = 1; });
