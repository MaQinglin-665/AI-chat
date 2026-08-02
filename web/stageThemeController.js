(function (root) {
  "use strict";

  const STORAGE_KEY = "taffy.stage-room.v1";
  const MODES = Object.freeze(["auto", "day", "night"]);
  const INTERACTION_ANCHORS = Object.freeze(["window", "microphone", "sofa", "guitar"]);

  function normalizeMode(value) {
    const mode = String(value || "").trim().toLowerCase();
    return MODES.includes(mode) ? mode : "auto";
  }

  function getLocalDateKey(dateLike) {
    const date = dateLike instanceof Date ? dateLike : new Date(dateLike);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  function resolveAutomaticRoom(dateLike) {
    const date = dateLike instanceof Date ? dateLike : new Date(dateLike);
    const hour = date.getHours();
    return hour >= 7 && hour < 19 ? "day" : "night";
  }

  function resolveStoredPreference(rawValue, dateLike) {
    const now = dateLike instanceof Date ? dateLike : new Date(dateLike);
    let value = rawValue;
    if (typeof rawValue === "string") {
      try {
        value = JSON.parse(rawValue);
      } catch (_) {
        value = null;
      }
    }
    const mode = normalizeMode(value?.mode);
    if (mode === "auto") {
      return { mode: "auto", selectedLocalDate: "" };
    }
    const selectedLocalDate = String(value?.selectedLocalDate || "");
    if (selectedLocalDate !== getLocalDateKey(now)) {
      return { mode: "auto", selectedLocalDate: "" };
    }
    return { mode, selectedLocalDate };
  }

  function getNextTransitionAt(dateLike, mode = "auto") {
    const now = dateLike instanceof Date ? new Date(dateLike.getTime()) : new Date(dateLike);
    const next = new Date(now.getTime());
    if (normalizeMode(mode) !== "auto") {
      next.setHours(24, 0, 0, 0);
      return next;
    }
    const hour = now.getHours();
    if (hour < 7) {
      next.setHours(7, 0, 0, 0);
    } else if (hour < 19) {
      next.setHours(19, 0, 0, 0);
    } else {
      next.setDate(next.getDate() + 1);
      next.setHours(7, 0, 0, 0);
    }
    return next;
  }

  function createController({
    documentObject = root.document,
    storage = root.localStorage,
    now = () => new Date(),
    setTimeoutFn = root.setTimeout?.bind(root),
    clearTimeoutFn = root.clearTimeout?.bind(root),
    setTitleBarTheme = (room) => root.electronAPI?.setTitleBarTheme?.(room)
  } = {}) {
    let preference = { mode: "auto", selectedLocalDate: "" };
    let effectiveRoom = "night";
    let transitionTimer = 0;
    let started = false;
    let boundModeButtons = [];

    function readPreference() {
      let stored = null;
      try {
        stored = storage?.getItem?.(STORAGE_KEY) || null;
      } catch (_) {
        stored = null;
      }
      preference = resolveStoredPreference(stored, now());
      if (preference.mode === "auto" && stored) {
        try {
          storage?.removeItem?.(STORAGE_KEY);
        } catch (_) {}
      }
      return preference;
    }

    function writePreference() {
      try {
        if (preference.mode === "auto") {
          storage?.removeItem?.(STORAGE_KEY);
        } else {
          storage?.setItem?.(STORAGE_KEY, JSON.stringify(preference));
        }
      } catch (_) {
        // A blocked storage backend should not prevent room rendering.
      }
    }

    function updateControls() {
      const buttons = documentObject?.querySelectorAll?.("[data-stage-theme-mode]") || [];
      for (const button of buttons) {
        const active = normalizeMode(button.dataset?.stageThemeMode) === preference.mode;
        button.setAttribute?.("aria-pressed", active ? "true" : "false");
        button.classList?.toggle?.("is-active", active);
      }
      const group = documentObject?.querySelector?.(".stage-theme-switch");
      group?.setAttribute?.(
        "aria-label",
        `直播间背景：${preference.mode === "auto" ? "自动" : preference.mode === "day" ? "日间" : "夜间"}`
      );
    }

    function emitChange(previousRoom, source) {
      const view = documentObject?.defaultView || root;
      const detail = Object.freeze({
        version: 1,
        mode: preference.mode,
        room: effectiveRoom,
        previousRoom,
        source: String(source || "refresh"),
        interactionAnchors: INTERACTION_ANCHORS
      });
      try {
        const EventCtor = view?.CustomEvent || root.CustomEvent;
        if (typeof EventCtor === "function") {
          documentObject?.dispatchEvent?.(new EventCtor("taffy:stage-room-change", { detail }));
        }
      } catch (_) {}
    }

    function scheduleTransition() {
      if (transitionTimer && typeof clearTimeoutFn === "function") {
        clearTimeoutFn(transitionTimer);
      }
      transitionTimer = 0;
      if (typeof setTimeoutFn !== "function") return;
      const current = now();
      const target = getNextTransitionAt(current, preference.mode);
      const delay = Math.min(2147483000, Math.max(250, target.getTime() - current.getTime() + 80));
      transitionTimer = setTimeoutFn(() => {
        transitionTimer = 0;
        refresh("clock");
      }, delay);
    }

    function refresh(source = "refresh") {
      const current = now();
      const latestPreference = resolveStoredPreference(preference, current);
      if (latestPreference.mode !== preference.mode) {
        preference = latestPreference;
        writePreference();
      }
      const previousRoom = effectiveRoom;
      effectiveRoom = preference.mode === "auto"
        ? resolveAutomaticRoom(current)
        : preference.mode;
      const body = documentObject?.body;
      if (body) {
        body.dataset.stageRoom = effectiveRoom;
        body.dataset.stageRoomMode = preference.mode;
      }
      try {
        setTitleBarTheme?.(effectiveRoom);
      } catch (_) {
        // Native title-bar theming is optional outside Electron.
      }
      updateControls();
      scheduleTransition();
      if (previousRoom !== effectiveRoom || source === "start" || source === "manual") {
        emitChange(previousRoom, source);
      }
      return { mode: preference.mode, room: effectiveRoom };
    }

    function setMode(nextMode) {
      const mode = normalizeMode(nextMode);
      preference = {
        mode,
        selectedLocalDate: mode === "auto" ? "" : getLocalDateKey(now())
      };
      writePreference();
      return refresh("manual");
    }

    function handleModeButtonClick(event) {
      const button = event?.currentTarget || event?.target?.closest?.("[data-stage-theme-mode]");
      if (!button) return;
      event?.preventDefault?.();
      event?.stopPropagation?.();
      setMode(button.dataset.stageThemeMode);
    }

    function bindModeButtons() {
      for (const button of boundModeButtons) {
        button.removeEventListener?.("click", handleModeButtonClick);
      }
      boundModeButtons = Array.from(
        documentObject?.querySelectorAll?.("[data-stage-theme-mode]") || []
      );
      for (const button of boundModeButtons) {
        button.addEventListener?.("click", handleModeButtonClick);
      }
    }

    function handleVisibilityChange() {
      if (documentObject?.hidden !== true) {
        readPreference();
        refresh("visibility");
      }
    }

    function getInteractionAnchor(name) {
      const normalizedName = String(name || "").trim().toLowerCase();
      if (!INTERACTION_ANCHORS.includes(normalizedName)) return null;
      const node = documentObject?.querySelector?.(`[data-stage-anchor="${normalizedName}"]`);
      const scene = documentObject?.querySelector?.(".stage-scene");
      if (!node || !scene || typeof node.getBoundingClientRect !== "function") return null;
      const nodeRect = node.getBoundingClientRect();
      const sceneRect = scene.getBoundingClientRect();
      if (!sceneRect.width || !sceneRect.height) return null;
      const x = nodeRect.left + nodeRect.width / 2;
      const y = nodeRect.top + nodeRect.height / 2;
      return Object.freeze({
        version: 1,
        name: normalizedName,
        room: effectiveRoom,
        x,
        y,
        normalizedX: (x - sceneRect.left) / sceneRect.width,
        normalizedY: (y - sceneRect.top) / sceneRect.height
      });
    }

    function start() {
      if (started) return refresh("refresh");
      started = true;
      readPreference();
      bindModeButtons();
      documentObject?.addEventListener?.("visibilitychange", handleVisibilityChange);
      return refresh("start");
    }

    function stop() {
      started = false;
      documentObject?.removeEventListener?.("visibilitychange", handleVisibilityChange);
      for (const button of boundModeButtons) {
        button.removeEventListener?.("click", handleModeButtonClick);
      }
      boundModeButtons = [];
      if (transitionTimer && typeof clearTimeoutFn === "function") {
        clearTimeoutFn(transitionTimer);
      }
      transitionTimer = 0;
    }

    return {
      start,
      stop,
      refresh,
      setMode,
      getInteractionAnchor,
      getState: () => Object.freeze({ mode: preference.mode, room: effectiveRoom })
    };
  }

  const api = {
    STORAGE_KEY,
    MODES,
    INTERACTION_ANCHORS,
    normalizeMode,
    getLocalDateKey,
    resolveAutomaticRoom,
    resolveStoredPreference,
    getNextTransitionAt,
    createController
  };

  root.TaffyStageThemeController = api;
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }

  if (root.document) {
    const boot = () => {
      if (root.__taffyStageThemeController) return;
      root.__taffyStageThemeController = createController();
      root.__taffyStageThemeController.start();
    };
    if (root.document.readyState === "loading") {
      root.document.addEventListener("DOMContentLoaded", boot, { once: true });
    } else {
      boot();
    }
  }
})(typeof window !== "undefined" ? window : globalThis);
