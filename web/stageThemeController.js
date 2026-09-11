(function (root) {
  "use strict";

  const STORAGE_KEY = "taffy.stage-room.v1";
  const SCENES = Object.freeze(["morning", "day", "dusk", "night"]);
  const MODES = Object.freeze(["auto", ...SCENES]);
  const SCENE_META = Object.freeze({
    morning: Object.freeze({ label: "清晨", baseRoom: "day" }),
    day: Object.freeze({ label: "白天", baseRoom: "day" }),
    dusk: Object.freeze({ label: "黄昏", baseRoom: "day" }),
    night: Object.freeze({ label: "夜晚", baseRoom: "night" })
  });
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

  function resolveAutomaticScene(dateLike) {
    const date = dateLike instanceof Date ? dateLike : new Date(dateLike);
    const hour = date.getHours();
    if (hour >= 5 && hour < 9) return "morning";
    if (hour >= 9 && hour < 17) return "day";
    if (hour >= 17 && hour < 20) return "dusk";
    return "night";
  }

  function resolveBaseRoom(scene) {
    return SCENE_META[String(scene || "")]?.baseRoom || "night";
  }

  function resolveAutomaticRoom(dateLike) {
    return resolveBaseRoom(resolveAutomaticScene(dateLike));
  }

  function resolveStoredPreference(rawValue, dateLike) {
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
    return { mode, selectedLocalDate };
  }

  function getNextTransitionAt(dateLike, mode = "auto") {
    const now = dateLike instanceof Date ? new Date(dateLike.getTime()) : new Date(dateLike);
    const next = new Date(now.getTime());
    if (normalizeMode(mode) !== "auto") return null;
    const hour = now.getHours();
    if (hour < 5) {
      next.setHours(5, 0, 0, 0);
    } else if (hour < 9) {
      next.setHours(9, 0, 0, 0);
    } else if (hour < 17) {
      next.setHours(17, 0, 0, 0);
    } else if (hour < 20) {
      next.setHours(20, 0, 0, 0);
    } else {
      next.setDate(next.getDate() + 1);
      next.setHours(5, 0, 0, 0);
    }
    return next;
  }

  function formatLocalTime(dateLike) {
    const date = dateLike instanceof Date ? dateLike : new Date(dateLike);
    return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
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
    let effectiveScene = "night";
    let effectiveRoom = "night";
    let transitionTimer = 0;
    let clockTimer = 0;
    let started = false;
    let boundModeButtons = [];
    let boundMenuToggle = null;
    let menuOpen = false;

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

    function updateControls(currentDate = now()) {
      const buttons = documentObject?.querySelectorAll?.("[data-stage-theme-mode]") || [];
      for (const button of buttons) {
        const active = normalizeMode(button.dataset?.stageThemeMode) === preference.mode;
        button.setAttribute?.("aria-pressed", active ? "true" : "false");
        button.classList?.toggle?.("is-active", active);
      }
      const sceneMeta = SCENE_META[effectiveScene] || SCENE_META.night;
      const status = documentObject?.querySelector?.("#stage-time-status");
      status?.setAttribute?.("data-scene", effectiveScene);
      status?.setAttribute?.(
        "aria-label",
        `${sceneMeta.label}场景，本地时间 ${formatLocalTime(currentDate)}${preference.mode === "auto" ? "，自动切换" : "，手动锁定"}`
      );
      const label = documentObject?.querySelector?.("#stage-time-label");
      const clock = documentObject?.querySelector?.("#stage-time-clock");
      if (label) label.textContent = sceneMeta.label;
      if (clock) clock.textContent = formatLocalTime(currentDate);

      const menu = documentObject?.querySelector?.("#stage-scene-menu");
      if (menu) menu.hidden = !menuOpen;
      const toggle = documentObject?.querySelector?.("#scene-btn");
      toggle?.setAttribute?.("aria-expanded", menuOpen ? "true" : "false");
      toggle?.setAttribute?.("aria-label", menuOpen ? "收起场景选择" : "打开场景选择");
    }

    function emitChange(previousRoom, source) {
      const view = documentObject?.defaultView || root;
      const detail = Object.freeze({
        version: 2,
        mode: preference.mode,
        scene: effectiveScene,
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
      if (!target) return;
      const delay = Math.min(2147483000, Math.max(250, target.getTime() - current.getTime() + 80));
      transitionTimer = setTimeoutFn(() => {
        transitionTimer = 0;
        refresh("clock");
      }, delay);
    }

    function scheduleClock() {
      if (clockTimer && typeof clearTimeoutFn === "function") clearTimeoutFn(clockTimer);
      clockTimer = 0;
      if (typeof setTimeoutFn !== "function") return;
      const current = now();
      const delay = Math.max(250, 60000 - (current.getSeconds() * 1000 + current.getMilliseconds()) + 40);
      clockTimer = setTimeoutFn(() => {
        clockTimer = 0;
        updateControls(now());
        scheduleClock();
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
      const previousScene = effectiveScene;
      effectiveScene = preference.mode === "auto"
        ? resolveAutomaticScene(current)
        : preference.mode;
      effectiveRoom = resolveBaseRoom(effectiveScene);
      const body = documentObject?.body;
      if (body) {
        body.dataset.stageRoom = effectiveRoom;
        body.dataset.stageScene = effectiveScene;
        body.dataset.stageRoomMode = preference.mode;
      }
      try {
        setTitleBarTheme?.(effectiveRoom);
      } catch (_) {
        // Native title-bar theming is optional outside Electron.
      }
      updateControls(current);
      scheduleTransition();
      scheduleClock();
      if (previousScene !== effectiveScene || previousRoom !== effectiveRoom || source === "start" || source === "manual") {
        emitChange(previousRoom, source);
      }
      return { mode: preference.mode, scene: effectiveScene, room: effectiveRoom };
    }

    function setMode(nextMode) {
      const mode = normalizeMode(nextMode);
      preference = {
        mode,
        selectedLocalDate: mode === "auto" ? "" : getLocalDateKey(now())
      };
      menuOpen = false;
      writePreference();
      return refresh("manual");
    }

    function setMenuOpen(open) {
      menuOpen = open === true;
      updateControls(now());
      return menuOpen;
    }

    function handleMenuToggleClick(event) {
      event?.preventDefault?.();
      event?.stopPropagation?.();
      if (!menuOpen && typeof root.setAdvancedActionsExpanded === "function") {
        root.setAdvancedActionsExpanded(false);
      }
      setMenuOpen(!menuOpen);
    }

    function handleDocumentPointerDown(event) {
      if (!menuOpen) return;
      if (event?.target?.closest?.("#stage-scene-menu, #scene-btn")) return;
      setMenuOpen(false);
    }

    function handleDocumentKeyDown(event) {
      if (menuOpen && String(event?.key || "") === "Escape") setMenuOpen(false);
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
      boundMenuToggle?.removeEventListener?.("click", handleMenuToggleClick);
      boundMenuToggle = documentObject?.querySelector?.("#scene-btn") || null;
      boundMenuToggle?.addEventListener?.("click", handleMenuToggleClick);
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
        scene: effectiveScene,
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
      documentObject?.addEventListener?.("pointerdown", handleDocumentPointerDown);
      documentObject?.addEventListener?.("keydown", handleDocumentKeyDown);
      return refresh("start");
    }

    function stop() {
      started = false;
      documentObject?.removeEventListener?.("visibilitychange", handleVisibilityChange);
      documentObject?.removeEventListener?.("pointerdown", handleDocumentPointerDown);
      documentObject?.removeEventListener?.("keydown", handleDocumentKeyDown);
      for (const button of boundModeButtons) {
        button.removeEventListener?.("click", handleModeButtonClick);
      }
      boundModeButtons = [];
      boundMenuToggle?.removeEventListener?.("click", handleMenuToggleClick);
      boundMenuToggle = null;
      if (transitionTimer && typeof clearTimeoutFn === "function") {
        clearTimeoutFn(transitionTimer);
      }
      transitionTimer = 0;
      if (clockTimer && typeof clearTimeoutFn === "function") clearTimeoutFn(clockTimer);
      clockTimer = 0;
    }

    return {
      start,
      stop,
      refresh,
      setMode,
      setMenuOpen,
      getInteractionAnchor,
      getState: () => Object.freeze({ mode: preference.mode, scene: effectiveScene, room: effectiveRoom })
    };
  }

  const api = {
    STORAGE_KEY,
    SCENES,
    MODES,
    SCENE_META,
    INTERACTION_ANCHORS,
    normalizeMode,
    getLocalDateKey,
    resolveAutomaticScene,
    resolveBaseRoom,
    resolveAutomaticRoom,
    resolveStoredPreference,
    getNextTransitionAt,
    formatLocalTime,
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
