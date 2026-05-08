(function (root) {
  "use strict";

  function createController(deps = {}) {
    const state = deps.state || {};
    const window = deps.windowObject || root;
    const navigator = deps.navigatorObject || root.navigator || {};
    const setStatus = typeof deps.setStatus === "function" ? deps.setStatus : () => {};
    const updateMicButton = typeof deps.updateMicButton === "function" ? deps.updateMicButton : () => {};
    const scheduleMicRecognitionStart = typeof deps.scheduleMicRecognitionStart === "function" ? deps.scheduleMicRecognitionStart : () => {};
    const enqueueMicTranscript = typeof deps.enqueueMicTranscript === "function" ? deps.enqueueMicTranscript : () => {};
    const toggleMicOpen = typeof deps.toggleMicOpen === "function" ? deps.toggleMicOpen : async () => {};

    function clearWakeRestartTimer() {
      if (!state.wakeRestartTimer) {
        return;
      }
      clearTimeout(state.wakeRestartTimer);
      state.wakeRestartTimer = 0;
    }

    function shouldRunWakeWordListener() {
      return (
        !!state.wakeWordEnabled &&
        !!state.recognitionAvailable &&
        !state.micToggleBusy &&
        !state.micOpen &&
        !state.recognitionActive &&
        !state.chatBusy
      );
    }

    function stopWakeWordListener(hardStop = false) {
      clearWakeRestartTimer();
      if (!state.wakeRecognition) {
        state.wakeRecognitionActive = false;
        return;
      }
      try {
        if (hardStop && typeof state.wakeRecognition.abort === "function") {
          state.wakeRecognition.abort();
        } else {
          state.wakeRecognition.stop();
        }
      } catch (_) {
        // ignore
      }
      state.wakeRecognitionActive = false;
    }

    function scheduleWakeWordStart(delayMs = 0) {
      clearWakeRestartTimer();
      if (!shouldRunWakeWordListener()) {
        return;
      }
      state.wakeRestartTimer = window.setTimeout(() => {
        state.wakeRestartTimer = 0;
        if (!shouldRunWakeWordListener() || !state.wakeRecognition || state.wakeRecognitionActive) {
          return;
        }
        try {
          state.wakeRecognition.start();
        } catch (_) {
          scheduleWakeWordStart(900);
        }
      }, Math.max(0, Number(delayMs) || 0));
    }

    function wakeTranscriptHit(text) {
      const src = String(text || "").toLowerCase();
      if (!src) {
        return false;
      }
      const words = Array.isArray(state.wakeWords) ? state.wakeWords : [];
      for (const raw of words) {
        const w = String(raw || "").trim().toLowerCase();
        if (w && src.includes(w)) {
          return true;
        }
      }
      return false;
    }

    function setupWakeWordRecognition(RecognitionCtor) {
      if (!RecognitionCtor) {
        state.wakeRecognition = null;
        state.wakeRecognitionActive = false;
        return;
      }
      const wake = new RecognitionCtor();
      wake.lang = "zh-CN";
      wake.continuous = true;
      wake.interimResults = false;
      wake.maxAlternatives = 1;
      wake.onstart = () => {
        state.wakeRecognitionActive = true;
      };
      wake.onerror = () => {
        state.wakeRecognitionActive = false;
      };
      wake.onend = () => {
        state.wakeRecognitionActive = false;
        if (shouldRunWakeWordListener()) {
          scheduleWakeWordStart(280);
        }
      };
      wake.onresult = async (event) => {
        if (!shouldRunWakeWordListener()) {
          return;
        }
        if (Date.now() < state.wakeCooldownUntil) {
          return;
        }
        for (let i = event.resultIndex || 0; i < (event.results?.length || 0); i++) {
          const result = event.results[i];
          if (!result || !result.isFinal) {
            continue;
          }
          const transcript = String(result?.[0]?.transcript || "").trim();
          if (!wakeTranscriptHit(transcript)) {
            continue;
          }
          state.wakeCooldownUntil = Date.now() + 2200;
          stopWakeWordListener(true);
          setStatus("热词已唤醒，正在开麦...");
          if (!state.micOpen) {
            await toggleMicOpen();
          }
          return;
        }
      };
      state.wakeRecognition = wake;
      scheduleWakeWordStart(700);
    }

    function setupSpeechRecognition() {
      const hasLocalAsr =
        !!(navigator.mediaDevices && typeof navigator.mediaDevices.getUserMedia === "function") &&
        !!(window.AudioContext || window.webkitAudioContext);
      state.localAsrAvailable = hasLocalAsr;

      const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!Recognition) {
        state.recognitionAvailable = false;
        state.recognition = null;
        if (hasLocalAsr) {
          state.asrMode = "local_vosk";
        }
        updateMicButton();
        return;
      }

      const recog = new Recognition();
      recog.lang = "zh-CN";
      recog.continuous = true;
      recog.interimResults = false;
      recog.maxAlternatives = 1;

      recog.onstart = () => {
        state.recognitionActive = true;
        state.micRetryCount = 0;
        if (state.micOpen && state.micSuspendDepth === 0) {
          setStatus("开麦中...");
        }
        updateMicButton();
      };
      recog.onerror = (event) => {
        state.recognitionActive = false;
        const code = String(event?.error || "");
        if (code === "not-allowed" || code === "service-not-allowed") {
          state.micOpen = false;
          setStatus("麦克风权限被拒绝");
        } else if (code === "audio-capture") {
          state.micRetryCount = Math.min(8, state.micRetryCount + 1);
          setStatus("麦克风不可用，请检查设备");
        } else if (code === "network") {
          state.micRetryCount = Math.min(8, state.micRetryCount + 1);
          setStatus("语音识别网络异常，正在重试");
        } else if (code && code !== "aborted" && code !== "no-speech") {
          state.micRetryCount = Math.min(8, state.micRetryCount + 1);
          setStatus("语音输入失败");
        }
        updateMicButton();
      };
      recog.onend = () => {
        state.recognitionActive = false;
        if (state.micOpen && state.micSuspendDepth === 0) {
          scheduleMicRecognitionStart(220);
          setStatus("开麦中...");
        } else {
          setStatus("待机");
        }
        updateMicButton();
      };
      recog.onresult = (event) => {
        for (let i = event.resultIndex || 0; i < (event.results?.length || 0); i++) {
          const result = event.results[i];
          if (!result || !result.isFinal) {
            continue;
          }
          const transcript = result?.[0]?.transcript?.trim();
          if (transcript) {
            enqueueMicTranscript(transcript, state.micSession);
          }
        }
      };

      state.recognition = recog;
      state.recognitionAvailable = true;
      if (state.localAsrAvailable) {
        // Prefer local Vosk ASR to avoid browser cloud recognition instability.
        state.asrMode = "local_vosk";
      } else {
        state.asrMode = "webspeech";
      }
      setupWakeWordRecognition(Recognition);
      updateMicButton();
    }

    return { clearWakeRestartTimer, shouldRunWakeWordListener, stopWakeWordListener, scheduleWakeWordStart, wakeTranscriptHit, setupWakeWordRecognition, setupSpeechRecognition };
  }

  const api = { createController };
  root.TaffyWakeWordController = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
