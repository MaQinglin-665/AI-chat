(function (root) {
  "use strict";

  function call(fn, ...args) {
    return typeof fn === "function" ? fn(...args) : undefined;
  }

  function bindElectronSubtitleEvents(deps = {}) {
    const windowObject = deps.windowObject || root;
    const state = deps.state || {};
    const electronAPI = windowObject?.electronAPI;
    if (!electronAPI || typeof electronAPI.onSubtitle !== "function") {
      return false;
    }
    electronAPI.onSubtitle(({ id, en, zh }) => {
      state.subtitleId = id;
      if (!state.subtitleEnabled) {
        call(deps.clearSubtitleDOM, id, true);
        return;
      }
      call(deps.applySubtitleDOM, en || "", zh || "");
    });
    if (typeof electronAPI.onSubtitleHide === "function") {
      electronAPI.onSubtitleHide(({ id }) => {
        call(deps.clearSubtitleDOM, id);
      });
    }
    return true;
  }

  function bindCharacterRuntimeUpdateEvent(deps = {}) {
    const windowObject = deps.windowObject || root;
    const state = deps.state || {};
    if (!windowObject || typeof windowObject.addEventListener !== "function") {
      return false;
    }
    windowObject.addEventListener("character-runtime:update", (event) => {
      try {
        const metadata = event?.detail || null;
        const appliedEmotion = call(deps.applyCharacterRuntimeEmotionToLive2D, metadata);
        const appliedAction = call(deps.applyCharacterRuntimeActionToLive2D, metadata);
        const applyFeedback = {
          at: Date.now(),
          uiView: String(state.uiView || ""),
          emotion: String(metadata?.emotion || ""),
          action: String(metadata?.action || ""),
          appliedEmotion,
          appliedAction,
          modelReady: !!state.model,
          expressionEnabled: !!state.expressionEnabled,
          motionEnabled: !!state.motionEnabled
        };
        state.followupCharacterRuntimeLastApply = applyFeedback;
        call(deps.updateReplyCharacterChip);
        try {
          windowObject.__AI_CHAT_LAST_CHARACTER_RUNTIME_APPLY__ = applyFeedback;
        } catch (_) {
          // Diagnostics are optional.
        }
      } catch (_) {
        // Keep runtime bridge isolated from chat main flow.
      }
    });
    return true;
  }

  function bindRuntimeEvents(deps = {}) {
    bindElectronSubtitleEvents(deps);
    bindCharacterRuntimeUpdateEvent(deps);
  }

  const api = {
    bindRuntimeEvents,
    bindElectronSubtitleEvents,
    bindCharacterRuntimeUpdateEvent
  };

  root.TaffyRuntimeEventBinder = api;

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof window !== "undefined" ? window : globalThis);
