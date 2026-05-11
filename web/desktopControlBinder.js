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
        if (!state.observeDesktop && !state.observeDesktopConfirmSeen) {
          const ok = typeof windowObject.confirm === "function"
            ? windowObject.confirm("观察桌面会在你明确开启后读取当前屏幕画面，用来回答和桌面内容相关的问题。确定开启吗？")
            : true;
          if (!ok) {
            call(deps.setStatus, "\u684c\u9762\u89c2\u5bdf\u672a\u5f00\u542f");
            return;
          }
          state.observeDesktopConfirmSeen = true;
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
        if (!state.autoChatEnabled && !state.autoChatConfirmSeen) {
          const ok = typeof windowObject.confirm === "function"
            ? windowObject.confirm("主动陪伴会让桌宠低频主动开启话题。它默认关闭，你可以随时再点一次关掉。确定开启吗？")
            : true;
          if (!ok) {
            call(deps.setStatus, "\u4e3b\u52a8\u966a\u4f34\u672a\u5f00\u542f");
            return;
          }
          state.autoChatConfirmSeen = true;
        }
        state.autoChatEnabled = !state.autoChatEnabled;
        call(deps.updateAutoChatButton);
        if (state.autoChatEnabled) {
          call(deps.startAutoChatLoop);
          call(deps.setStatus, "\u4e3b\u52a8\u966a\u4f34\u5df2\u5f00\u542f");
        } else {
          call(deps.stopAutoChatLoop);
          call(deps.setStatus, "\u4e3b\u52a8\u966a\u4f34\u5df2\u5173\u95ed");
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
