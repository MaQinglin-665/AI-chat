"use strict";
const assert = require("assert");
const { createCharacterTransition } = require("../web/galgamePresentation");
async function main() {
  const events = [], waits = []; let committed = null;
  const transition = createCharacterTransition({ wait: async (ms) => { waits.push(ms); }, showBlack: () => events.push("black"), reveal: () => events.push("reveal") });
  assert.strictEqual(await transition.transitionCharacter({ load: async () => "new-image", commit: (asset) => { committed = asset; } }), true);
  assert.strictEqual(committed, "new-image"); assert.deepStrictEqual(events, ["black", "reveal"]); assert.deepStrictEqual(waits, [210, 210]);
  events.length = 0; committed = null;
  assert.strictEqual(await transition.transitionCharacter({ load: async () => { throw new Error("missing"); }, commit: () => { committed = "bad"; } }), false);
  assert.strictEqual(committed, null, "a failed preload must retain the existing character"); assert.deepStrictEqual(events, ["black", "reveal"]);
  const pending = [], rapid = createCharacterTransition({ wait: () => Promise.resolve(), showBlack: () => {}, reveal: () => {} });
  const first = rapid.transitionCharacter({ load: () => new Promise((resolve) => pending.push(resolve)), commit: () => { throw new Error("stale transition committed"); } });
  await Promise.resolve(); await Promise.resolve(); let last = null;
  const second = rapid.transitionCharacter({ load: async () => "last-image", commit: (asset) => { last = asset; } }); pending[0]("old-image");
  assert.strictEqual(await first, false, "an older selection must never cover the last selection"); assert.strictEqual(await second, true); assert.strictEqual(last, "last-image");
  const reduced = [], reducedTransition = createCharacterTransition({ reducedMotion: () => true, wait: async (ms) => reduced.push(ms), showBlack: () => {}, reveal: () => {} });
  await reducedTransition.transitionCharacter({ load: async () => true, commit: () => {} }); assert.deepStrictEqual(reduced, [0, 0]);
  console.log("Galgame presentation transition tests passed");
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
