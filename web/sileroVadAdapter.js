(function (root) {
  "use strict";

  const DEFAULT_VAD_SCRIPT = "/runtime/vad/bundle.min.js";
  const DEFAULT_ORT_SCRIPT = "/runtime/vad/ort/ort.wasm.min.js";
  const DEFAULT_VAD_ASSET_PATH = "/runtime/vad/";
  const DEFAULT_ORT_ASSET_PATH = "/runtime/vad/ort/";
  const FAILURE_RETRY_MS = 120000;
  const scriptLoads = new Map();

  function loadScript(documentObject, src, ready) {
    if (typeof ready === "function" && ready()) {
      return Promise.resolve(true);
    }
    if (!documentObject?.createElement || !documentObject?.head?.appendChild) {
      return Promise.resolve(false);
    }
    if (scriptLoads.has(src)) {
      return scriptLoads.get(src);
    }
    const pending = new Promise((resolve) => {
      const script = documentObject.createElement("script");
      script.src = src;
      script.async = true;
      script.onload = () => resolve(typeof ready !== "function" || ready());
      script.onerror = () => resolve(false);
      documentObject.head.appendChild(script);
    });
    scriptLoads.set(src, pending);
    return pending;
  }

  function createController(deps = {}) {
    const windowObject = deps.windowObject || root;
    const documentObject = deps.documentObject || windowObject.document || root.document;
    const state = deps.state || {};
    const setStatus = typeof deps.setStatus === "function" ? deps.setStatus : () => {};
    const now = typeof deps.now === "function" ? deps.now : () => Date.now();
    let activeStream = null;
    let activeCallbacks = {};

    async function ensureRuntime() {
      if (!state.sileroVadEnabled) {
        return false;
      }
      const hasOrt = () => !!windowObject.ort;
      const hasVad = () => !!windowObject.vad?.MicVAD;
      if (!hasOrt() && !(await loadScript(documentObject, DEFAULT_ORT_SCRIPT, hasOrt))) {
        return false;
      }
      if (!hasVad() && !(await loadScript(documentObject, DEFAULT_VAD_SCRIPT, hasVad))) {
        return false;
      }
      return hasVad();
    }

    async function start(stream, callbacks = {}) {
      await stop();
      activeStream = stream || null;
      activeCallbacks = callbacks;
      if (!activeStream) {
        return false;
      }
      if (now() < Number(state.sileroVadUnavailableUntil || 0)) {
        activeCallbacks.onUnavailable?.();
        return false;
      }
      if (!(await ensureRuntime())) {
        state.sileroVadUnavailableUntil = now() + FAILURE_RETRY_MS;
        activeCallbacks.onUnavailable?.();
        return false;
      }
      const positive = Math.max(0.15, Math.min(0.9, Number(state.sileroVadPositiveThreshold) || 0.35));
      const negative = Math.max(
        0.05,
        Math.min(positive - 0.02, Number(state.sileroVadNegativeThreshold) || 0.22)
      );
      const redemptionMs = Math.max(240, Math.min(1800, Number(state.sileroVadRedemptionMs) || 420));
      try {
        let controller = state.sileroVadController;
        if (!controller) {
          controller = await windowObject.vad.MicVAD.new({
            model: "v5",
            startOnLoad: false,
            getStream: async () => activeStream,
            pauseStream: async () => {},
            resumeStream: async () => activeStream,
            baseAssetPath: DEFAULT_VAD_ASSET_PATH,
            onnxWASMBasePath: DEFAULT_ORT_ASSET_PATH,
            ortConfig: (ort) => {
              if (ort?.env?.wasm) {
                ort.env.wasm.numThreads = 1;
                ort.env.wasm.proxy = false;
              }
            },
            positiveSpeechThreshold: positive,
            negativeSpeechThreshold: negative,
            redemptionMs,
            preSpeechPadMs: 320,
            minSpeechMs: 160,
            submitUserSpeechOnPause: false,
            onSpeechStart: () => {
              state.sileroVadActive = true;
              activeCallbacks.onSpeechStart?.();
            },
            onSpeechEnd: (audio) => {
              state.sileroVadActive = false;
              activeCallbacks.onSpeechEnd?.(audio);
            },
            onVADMisfire: () => {
              state.sileroVadActive = false;
              activeCallbacks.onVADMisfire?.();
            }
          });
          state.sileroVadController = controller;
        }
        await controller.start();
        state.sileroVadUnavailableUntil = 0;
        state.sileroVadReady = true;
        state.sileroVadActive = false;
        return true;
      } catch (err) {
        const controller = state.sileroVadController;
        state.sileroVadController = null;
        state.sileroVadReady = false;
        state.sileroVadActive = false;
        state.sileroVadUnavailableUntil = now() + FAILURE_RETRY_MS;
        if (controller && typeof controller.destroy === "function") {
          try {
            await controller.destroy();
          } catch (_) {
            // A partially initialized runtime may not be destroyable.
          }
        }
        activeCallbacks.onUnavailable?.(err);
        setStatus("Silero VAD 不可用，已切换基础检测");
        return false;
      }
    }

    async function stop() {
      const controller = state.sileroVadController;
      state.sileroVadReady = false;
      state.sileroVadActive = false;
      if (!controller || typeof controller.pause !== "function") {
        return false;
      }
      try {
        await controller.pause();
      } catch (_) {
        // The shared microphone stream is owned by localAsrController.
      }
      return true;
    }

    async function destroy() {
      const controller = state.sileroVadController;
      state.sileroVadController = null;
      activeStream = null;
      activeCallbacks = {};
      state.sileroVadReady = false;
      state.sileroVadActive = false;
      if (!controller || typeof controller.destroy !== "function") {
        return false;
      }
      try {
        await controller.destroy();
      } catch (_) {
        return false;
      }
      return true;
    }

    return { ensureRuntime, start, stop, destroy };
  }

  const api = { createController };
  root.TaffySileroVadAdapter = api;
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof window !== "undefined" ? window : globalThis);
