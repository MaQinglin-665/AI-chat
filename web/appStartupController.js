(function (root) {
  "use strict";

  function createController(deps = {}) {
    const state = deps.state || {};
    const window = deps.windowObject || root;
    const consoleObject = deps.consoleObject || root.console || { error: () => {} };
    const requestAnimationFrameFn =
      typeof deps.requestAnimationFrame === "function"
        ? deps.requestAnimationFrame
        : (fn) => window.setTimeout(fn, 16);
    const setStatus = typeof deps.setStatus === "function" ? deps.setStatus : () => {};
    const appendMessage = typeof deps.appendMessage === "function" ? deps.appendMessage : () => null;
    const isServerTTSProvider = typeof deps.isServerTTSProvider === "function" ? deps.isServerTTSProvider : () => false;

    async function loadStartupPreferences() {
      await deps.loadConfig?.();
      try {
        await deps.resolveApiToken?.(true);
      } catch (_) {
        // Let authFetch retry on first 401.
      }
      deps.initAssistantAvatar?.();
      deps.loadChatTranslationVisibilityFromStorage?.();
      deps.loadSubtitleEnabledFromStorage?.();
      deps.loadSubtitlePositionFromStorage?.();
      deps.loadOnboardingSeenFromStorage?.();
      await deps.loadPersonaCard?.();
    }

    function scheduleDesktopBridgeRechecks() {
      if (!state.desktopMode || state.desktopCanMoveWindow || state.windowLocked) {
        return;
      }
      window.setTimeout(() => deps.refreshDesktopBridgeReady?.(), 350);
      window.setTimeout(() => deps.refreshDesktopBridgeReady?.(), 900);
      window.setTimeout(() => deps.refreshDesktopBridgeReady?.(), 1600);
    }

    function startModelSpeechBroadcastListener() {
      try {
        const channel = new window.BroadcastChannel("taffy-speech");
        channel.onmessage = (event) => {
          const data = event.data;
          if (!data || data.type !== "speech") return;
          state._broadcastSpeechUpdatedAt = deps.performanceObject?.now?.() || Date.now();
          state.speechMouthOpen = Number(data.mouthOpen) || 0;
          state.speechAnimMood = String(data.mood || "idle");
          state.speechAnimUntil = Number(data.animUntil) || 0;
          state._broadcastSpeaking = !!data.speaking;
          state.ttsAudioLevel = Number(data.audioLevel) || 0;
          if (data.moodHoldUntil) state.moodHoldUntil = Number(data.moodHoldUntil);
        };
      } catch (_) {
        // BroadcastChannel is optional in older shells.
      }
    }

    function startChatSpeechBroadcastLoop() {
      try {
        state._speechBroadcast = new window.BroadcastChannel("taffy-speech");
        (function chatSpeechBroadcastLoop() {
          const speaking = deps.isSpeechMotionActive?.() || false;
          const mouthOpen = deps.getSpeechAnimationMouthOpen?.() || 0;
          try {
            state._speechBroadcast.postMessage({
              type: "speech",
              mouthOpen,
              mood: state.speechAnimMood || "idle",
              speaking,
              animUntil: state.speechAnimUntil || 0,
              animStartedAt: state.speechAnimStartedAt || 0,
              animDurationMs: state.speechAnimDurationMs || 0,
              audioLevel: state.ttsAudioLevel || 0,
              moodHoldUntil: state.moodHoldUntil || 0
            });
          } catch (_) {}
          requestAnimationFrameFn(chatSpeechBroadcastLoop);
        }());
      } catch (_) {
        // BroadcastChannel is optional in older shells.
      }
    }

    function startChatRuntimeShell({ broadcastSpeech = false } = {}) {
      if (!isServerTTSProvider(state.ttsProvider)) {
        deps.initTTS?.();
      }
      deps.setupSpeechRecognition?.();
      deps.bindUI?.();
      deps.startFollowupCharacterChipRefresh?.();
      deps.startReminderLoop?.();
      deps.runReminderCheck?.();
      if (broadcastSpeech) {
        startChatSpeechBroadcastLoop();
      }
    }

    function bindRuntimeBridges() {
      deps.bindRuntimeEvents?.();
      deps.installCharacterRuntimeWindowBridge?.();
      deps.installCharacterRuntimeDebugBridge?.();
      deps.installTTSDebugBridge?.();
      deps.installTranslateDebugBridge?.();
    }

    async function main() {
      setStatus("启动中...");
      try {
        deps.refreshDesktopBridgeReady?.();
        await deps.initWindowLockBridge?.();
        scheduleDesktopBridgeRechecks();
        await loadStartupPreferences();

        if (state.uiView === "model") {
          await deps.ensureLive2DRuntime?.();
          await deps.initLive2D?.();
          deps.startModelMouseGazePolling?.();
          startModelSpeechBroadcastListener();
          setStatus("待机");
          return;
        }

        if (state.uiView === "chat") {
          startChatRuntimeShell({ broadcastSpeech: true });
          setStatus("待机");
          return;
        }

        await deps.ensureLive2DRuntime?.();
        await deps.initLive2D?.();
        startChatRuntimeShell();
        if (state.model) {
          setStatus("待机");
        }
      } catch (err) {
        consoleObject.error(err);
        setStatus("启动失败");
        appendMessage("assistant", `启动错误: ${err.message}`);
      }
    }

    function handleBeforeUnload() {
      deps.closeLearningReviewDrawer?.();
      deps.resetActionSystem?.();
      deps.stopIdleMotionLoop?.();
      if (state.followupCharacterChipRefreshTimer) {
        window.clearInterval(state.followupCharacterChipRefreshTimer);
        state.followupCharacterChipRefreshTimer = 0;
      }
      deps.stopAutoChatLoop?.();
      deps.stopProactiveSchedulerPolling?.("beforeunload");
      deps.stopMicLoop?.(true);
      deps.stopWakeWordListener?.();
      if (state.reminderTimer) {
        window.clearInterval(state.reminderTimer);
        state.reminderTimer = 0;
      }
      if (typeof state.windowLockUnsubscribe === "function") {
        try {
          state.windowLockUnsubscribe();
        } catch (_) {
          // ignore
        }
        state.windowLockUnsubscribe = null;
      }
    }

    return {
      bindRuntimeBridges,
      main,
      handleBeforeUnload,
      startModelSpeechBroadcastListener,
      startChatSpeechBroadcastLoop
    };
  }

  const api = { createController };
  root.TaffyAppStartupController = api;
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof window !== "undefined" ? window : globalThis);
