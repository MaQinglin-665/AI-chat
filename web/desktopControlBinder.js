(function (root) {
  "use strict";

  function call(fn, ...args) {
    return typeof fn === "function" ? fn(...args) : undefined;
  }

  function normalizeConversationLaneRole(role) {
    return role === "user" ? "user" : "assistant";
  }

  function ensureConversationLaneState(state = {}) {
    if (!state.conversationLaneCollapsed || typeof state.conversationLaneCollapsed !== "object") {
      state.conversationLaneCollapsed = { assistant: false, user: false };
    }
    if (!state.conversationLaneUnread || typeof state.conversationLaneUnread !== "object") {
      state.conversationLaneUnread = { assistant: 0, user: 0 };
    }
    for (const role of ["assistant", "user"]) {
      state.conversationLaneCollapsed[role] = state.conversationLaneCollapsed[role] === true;
      state.conversationLaneUnread[role] = Math.max(
        0,
        Math.min(99, Math.floor(Number(state.conversationLaneUnread[role]) || 0))
      );
    }
  }

  function getConversationLaneButton(ui = {}, role = "assistant") {
    return normalizeConversationLaneRole(role) === "user"
      ? ui.userLaneToggle
      : ui.assistantLaneToggle;
  }

  function saveConversationLaneState(deps = {}) {
    call(
      deps.storageController?.saveConversationLaneState,
      deps.state || {},
      { windowObject: deps.windowObject || root }
    );
  }

  function applyConversationLaneState(ui = {}, deps = {}, role = "assistant") {
    const state = deps.state || {};
    const normalizedRole = normalizeConversationLaneRole(role);
    ensureConversationLaneState(state);
    const collapsed = state.conversationLaneCollapsed[normalizedRole] === true;
    const unread = Math.max(0, Number(state.conversationLaneUnread[normalizedRole]) || 0);
    const button = getConversationLaneButton(ui, normalizedRole);
    const displayName = normalizedRole === "user" ? "我的" : "模型";
    ui.conversationRail?.classList?.toggle(`is-${normalizedRole}-lane-collapsed`, collapsed);
    if (!button) {
      return;
    }
    button.classList?.toggle("is-collapsed", collapsed);
    button.classList?.toggle("has-unread", unread > 0);
    button.setAttribute?.("aria-expanded", collapsed ? "false" : "true");
    const actionLabel = collapsed ? `展开${displayName}历史对话` : `收起${displayName}历史对话`;
    const accessibleLabel = collapsed && unread > 0
      ? `${actionLabel}，${unread}条新消息`
      : actionLabel;
    button.setAttribute?.("aria-label", accessibleLabel);
    button.setAttribute?.("title", accessibleLabel);
    if (button.dataset) {
      button.dataset.unread = unread > 0 ? String(unread) : "";
    }
    const badge = button.querySelector?.(".conversation-lane-unread");
    if (badge) {
      badge.textContent = unread > 99 ? "99+" : String(unread || "");
      badge.hidden = unread <= 0;
    }
  }

  function setConversationLaneCollapsed(ui = {}, deps = {}, role = "assistant", collapsed = false) {
    const state = deps.state || {};
    const normalizedRole = normalizeConversationLaneRole(role);
    ensureConversationLaneState(state);
    state.conversationLaneCollapsed[normalizedRole] = collapsed === true;
    if (!collapsed) {
      state.conversationLaneUnread[normalizedRole] = 0;
    }
    applyConversationLaneState(ui, deps, normalizedRole);
    saveConversationLaneState(deps);
  }

  function noteConversationLaneMessage(ui = {}, deps = {}, role = "assistant") {
    const state = deps.state || {};
    const normalizedRole = normalizeConversationLaneRole(role);
    ensureConversationLaneState(state);
    if (state.conversationLaneCollapsed[normalizedRole] !== true) {
      return false;
    }
    state.conversationLaneUnread[normalizedRole] = Math.min(
      99,
      Number(state.conversationLaneUnread[normalizedRole] || 0) + 1
    );
    applyConversationLaneState(ui, deps, normalizedRole);
    saveConversationLaneState(deps);
    return true;
  }

  function bindConversationLaneControls(ui = {}, deps = {}) {
    const state = deps.state || {};
    call(
      deps.storageController?.loadConversationLaneState,
      state,
      { windowObject: deps.windowObject || root }
    );
    ensureConversationLaneState(state);
    for (const role of ["assistant", "user"]) {
      const button = getConversationLaneButton(ui, role);
      applyConversationLaneState(ui, deps, role);
      if (!button || button.dataset?.conversationLaneBound === "1") {
        continue;
      }
      if (button.dataset) {
        button.dataset.conversationLaneBound = "1";
      }
      button.addEventListener?.("click", () => {
        setConversationLaneCollapsed(
          ui,
          deps,
          role,
          state.conversationLaneCollapsed[role] !== true
        );
      });
    }
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
    const windowObject = deps.windowObject || root;
    bindConversationLaneControls(ui, deps);
    const requestPetMode = () => {
      const api = windowObject.electronAPI;
      if (!api || typeof api.minimizeWindow !== "function") {
        call(deps.setStatus, "桌宠切换仅在桌面版可用");
        return false;
      }
      call(deps.setStatus, "正在回到桌宠");
      api.minimizeWindow();
      return true;
    };

    if (ui.petModeBtn) {
      ui.petModeBtn.addEventListener("click", requestPetMode);
    }
    windowObject.addEventListener?.("keydown", (event) => {
      if (event?.altKey !== true || event?.shiftKey !== true || String(event?.key || "").toLowerCase() !== "p") {
        return;
      }
      if (requestPetMode()) {
        event.preventDefault?.();
      }
    });

    if (ui.moreBtn) {
      ui.moreBtn.addEventListener("click", () => {
        const expanded = ui.moreBtn.getAttribute("aria-expanded") === "true";
        call(deps.setAdvancedActionsExpanded, !expanded);
      });
    }

    if (ui.conversationCollapseBtn && ui.conversationRail) {
      const setConversationRailExpanded = (expanded) => {
        const nextExpanded = expanded === true;
        ui.conversationRail.classList.toggle("is-collapsed", !nextExpanded);
        ui.conversationCollapseBtn.setAttribute("aria-expanded", nextExpanded ? "true" : "false");
        ui.conversationCollapseBtn.setAttribute("aria-label", nextExpanded ? "收起对话历史" : "展开对话历史");
        ui.conversationCollapseBtn.setAttribute("title", nextExpanded ? "收起对话历史" : "展开对话历史");
      };
      const compactStage = windowObject.matchMedia?.("(max-width: 820px)")?.matches === true;
      setConversationRailExpanded(
        ui.conversationCollapseBtn.getAttribute("aria-expanded") !== "false" && !compactStage
      );
      ui.conversationCollapseBtn.addEventListener("click", () => {
        setConversationRailExpanded(ui.conversationCollapseBtn.getAttribute("aria-expanded") !== "true");
      });
    }

    if (ui.idleBtn) {
      ui.idleBtn.addEventListener("click", () => {
        call(deps.enqueueActionIntent, "tap", { combo: true, userInitiated: true });
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
    bindUtilityControls,
    bindConversationLaneControls,
    applyConversationLaneState,
    setConversationLaneCollapsed,
    noteConversationLaneMessage
  };

  root.TaffyDesktopControlBinder = api;

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof window !== "undefined" ? window : globalThis);
