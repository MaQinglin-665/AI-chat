(function (root) {
  "use strict";

  function call(fn, ...args) {
    return typeof fn === "function" ? fn(...args) : undefined;
  }

  function bindDesktopToggleControls(ui = {}, deps = {}) {
    const state = deps.state || {};
    const windowObject = deps.windowObject || root;

    if (ui.observeBtn) {
      ui.observeBtn.addEventListener("click", () => {
        if (!state.desktopCanCapture) {
          call(deps.setStatus, "\u684c\u9762\u89c2\u5bdf\u4e0d\u53ef\u7528");
          return;
        }
        state.observeDesktop = !state.observeDesktop;
        call(deps.updateObserveButton);
        call(deps.setStatus, state.observeDesktop ? "\u684c\u9762\u89c2\u5bdf\u5df2\u5f00\u542f" : "\u684c\u9762\u89c2\u5bdf\u5df2\u5173\u95ed");
      });
    }

    if (ui.lockBtn) {
      ui.lockBtn.addEventListener("click", () => {
        if (
          state.desktopBridge !== "electron" ||
          !windowObject.electronAPI ||
          typeof windowObject.electronAPI.setWindowLock !== "function"
        ) {
          call(deps.setStatus, "\u684c\u9762\u9501\u5b9a\u4ec5\u5728\u684c\u9762\u7248\u53ef\u7528");
          call(deps.updateLockButton);
          return;
        }
        const next = !state.windowLocked;
        call(deps.setWindowLockedFromUI, next);
        call(deps.setStatus, next ? "\u684c\u9762\u5df2\u9501\u5b9a" : "\u684c\u9762\u5df2\u89e3\u9501");
      });
    }

    if (ui.autoChatBtn) {
      ui.autoChatBtn.addEventListener("click", () => {
        state.autoChatEnabled = !state.autoChatEnabled;
        call(deps.updateAutoChatButton);
        if (state.autoChatEnabled) {
          call(deps.startAutoChatLoop);
          call(deps.setStatus, "\u81ea\u52a8\u5bf9\u8bdd\u5df2\u5f00\u542f");
        } else {
          call(deps.stopAutoChatLoop);
          call(deps.setStatus, "\u81ea\u52a8\u5bf9\u8bdd\u5df2\u5173\u95ed");
        }
      });
    }
  }

  function bindUtilityControls(ui = {}, deps = {}) {
    if (ui.moreBtn) {
      ui.moreBtn.addEventListener("click", () => {
        const expanded = ui.moreBtn.getAttribute("aria-expanded") === "true";
        call(deps.setAdvancedActionsExpanded, !expanded);
      });
    }

    if (ui.idleBtn) {
      ui.idleBtn.addEventListener("click", () => {
        call(deps.enqueueActionIntent, "tap", { combo: true });
        call(deps.scheduleIdleMotionLoop);
      });
    }
  }

  function bindDesktopControlButtons(ui = {}, deps = {}) {
    bindDesktopToggleControls(ui, deps);
    bindUtilityControls(ui, deps);
  }

  const api = {
    bindDesktopControlButtons,
    bindDesktopToggleControls,
    bindUtilityControls
  };

  root.TaffyDesktopControlBinder = api;

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof window !== "undefined" ? window : globalThis);
