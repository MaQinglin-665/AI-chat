const assert = require("assert");
const path = require("path");

const adapterApi = require(path.join(__dirname, "..", "web", "sileroVadAdapter.js"));

async function run() {
  let capturedOptions = null;
  let started = 0;
  let paused = 0;
  let created = 0;
  const state = {
    sileroVadEnabled: true,
    sileroVadPositiveThreshold: 0.35,
    sileroVadNegativeThreshold: 0.22,
    sileroVadRedemptionMs: 720
  };
  const stream = {
    getTracks: () => [{
      stop: () => { throw new Error("shared stream must not be stopped"); }
    }]
  };
  const events = [];
  const windowObject = {
    ort: {},
    vad: {
      MicVAD: {
        async new(options) {
          created += 1;
          capturedOptions = options;
          let listening = false;
          return {
            async start() {
              listening = true;
              started += 1;
            },
            async pause() {
              if (!listening) return;
              listening = false;
              paused += 1;
              await options.pauseStream(stream);
            }
          };
        }
      }
    }
  };
  const controller = adapterApi.createController({ state, windowObject });
  assert.strictEqual(await controller.start(stream, {
    onSpeechStart: () => events.push("start"),
    onSpeechEnd: () => events.push("end"),
    onVADMisfire: () => events.push("misfire")
  }), true);
  assert.strictEqual(started, 1);
  assert.strictEqual(state.sileroVadReady, true);
  assert.strictEqual(capturedOptions.model, "v5");
  assert.strictEqual(capturedOptions.startOnLoad, false);
  assert.strictEqual(await capturedOptions.getStream(), stream);
  const fakeOrt = { env: { wasm: {} } };
  capturedOptions.ortConfig(fakeOrt);
  assert.strictEqual(fakeOrt.env.wasm.numThreads, 1);
  assert.strictEqual(fakeOrt.env.wasm.proxy, false);

  capturedOptions.onSpeechStart();
  assert.strictEqual(state.sileroVadActive, true);
  capturedOptions.onSpeechEnd(new Float32Array(16));
  assert.strictEqual(state.sileroVadActive, false);
  capturedOptions.onVADMisfire();
  assert.deepStrictEqual(events, ["start", "end", "misfire"]);

  assert.strictEqual(await controller.stop(), true);
  assert.strictEqual(paused, 1);
  assert.strictEqual(state.sileroVadReady, false);

  const secondStream = { getTracks: () => [] };
  assert.strictEqual(await controller.start(secondStream), true);
  assert.strictEqual(created, 1, "reopening the microphone must reuse the loaded Silero model");
  assert.strictEqual(await capturedOptions.resumeStream(), secondStream);
  assert.strictEqual(started, 2);
  await controller.stop();

  const fallbackState = { sileroVadEnabled: true };
  let fallbackNow = 1000;
  let unavailable = 0;
  const fallback = adapterApi.createController({
    state: fallbackState,
    windowObject: {},
    now: () => fallbackNow
  });
  assert.strictEqual(await fallback.start(stream, {
    onUnavailable: () => { unavailable += 1; }
  }), false);
  assert.strictEqual(fallbackState.sileroVadReady, false);
  assert.ok(fallbackState.sileroVadUnavailableUntil > fallbackNow);
  assert.strictEqual(await fallback.start(stream, {
    onUnavailable: () => { unavailable += 1; }
  }), false);
  assert.strictEqual(unavailable, 2, "cooldown fallback should remain explicit without reloading assets");
  console.log("Silero VAD adapter checks passed.");
}

run().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
