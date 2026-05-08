(function (root) {
  "use strict";

  function call(fn, ...args) {
    return typeof fn === "function" ? fn(...args) : undefined;
  }

  function clampNumber(value, min, max) {
    const n = Number(value);
    if (!Number.isFinite(n)) {
      return min;
    }
    return Math.max(min, Math.min(max, n));
  }

  function moveWindowBy(state = {}, dx, dy, deps = {}) {
    const windowObject = deps.windowObject || root;
    if (!state.desktopCanMoveWindow || state.windowLocked) {
      return false;
    }
    const ix = Math.round(dx);
    const iy = Math.round(dy);
    if (ix === 0 && iy === 0) {
      return false;
    }
    try {
      if (state.desktopBridge === "electron") {
        windowObject.electronAPI?.moveWindowBy?.(ix, iy);
        return true;
      }
      if (state.desktopBridge === "pywebview") {
        windowObject.pywebview?.api?.drag_window?.(ix, iy);
        return true;
      }
    } catch (_) {
      // ignore bridge failures
    }
    return false;
  }

  function endWindowDragSession(state = {}, deps = {}) {
    const windowObject = deps.windowObject || root;
    if (state.desktopBridge !== "electron" || !windowObject.electronAPI) {
      return false;
    }
    if (typeof windowObject.electronAPI.endWindowDrag !== "function") {
      return false;
    }
    try {
      windowObject.electronAPI.endWindowDrag();
      return true;
    } catch (_) {
      return false;
    }
  }

  function stopWindowDrag(state = {}, deps = {}) {
    const documentObject = deps.documentObject || root.document;
    state.windowDragSessionRaf = 0;
    if (state.windowDragRaf) {
      call(deps.cancelAnimationFrame, state.windowDragRaf);
      state.windowDragRaf = 0;
    }
    state.windowDragActive = false;
    state.windowDragDx = 0;
    state.windowDragDy = 0;
    state.dragWindowAccumX = 0;
    state.dragWindowAccumY = 0;
    documentObject?.body?.classList?.remove("dragging-window");
    documentObject?.documentElement?.classList?.remove("dragging-window");
    if (state.model) {
      call(deps.clampModelVisibleInViewport, state.model);
    }
    endWindowDragSession(state, deps);
  }

  function finalizeDesktopDrag(state = {}, deps = {}) {
    const dx = Math.round(state.dragWindowAccumX || 0);
    const dy = Math.round(state.dragWindowAccumY || 0);
    state.dragWindowAccumX = 0;
    state.dragWindowAccumY = 0;
    if (!dx && !dy) {
      return false;
    }
    const performanceObject = deps.performanceObject || root.performance || { now: () => Date.now() };
    state.suspendRelayoutUntil = performanceObject.now() + 520;
    moveWindowBy(state, dx, dy, deps);
    setTimeout(() => {
      call(deps.placeModel);
    }, 30);
    return true;
  }

  function isPointInModelDragHotzone(x, y, bounds) {
    if (!bounds) {
      return false;
    }
    const left = Number(bounds.left);
    const right = Number(bounds.right);
    const top = Number(bounds.top);
    const bottom = Number(bounds.bottom);
    if (
      !Number.isFinite(left) || !Number.isFinite(right) ||
      !Number.isFinite(top) || !Number.isFinite(bottom) ||
      !Number.isFinite(x) || !Number.isFinite(y)
    ) {
      return false;
    }
    const width = right - left;
    const height = bottom - top;
    if (width <= 0 || height <= 0) {
      return false;
    }
    const centerX = (left + right) * 0.5;
    const yRatio = clampNumber((y - top) / height, 0, 1);
    let halfWidthRatio = 0.22;
    if (yRatio < 0.22) {
      halfWidthRatio = 0.20 + (yRatio / 0.22) * 0.03;
    } else if (yRatio < 0.64) {
      halfWidthRatio = 0.23 + ((yRatio - 0.22) / 0.42) * 0.13;
    } else {
      halfWidthRatio = 0.24 - ((yRatio - 0.64) / 0.36) * 0.05;
    }
    const halfWidth = clampNumber(width * halfWidthRatio, 10, width * 0.48);
    return Math.abs(x - centerX) <= halfWidth;
  }

  const api = {
    moveWindowBy,
    endWindowDragSession,
    stopWindowDrag,
    finalizeDesktopDrag,
    isPointInModelDragHotzone
  };

  root.TaffyDesktopWindowController = api;

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof window !== "undefined" ? window : globalThis);
