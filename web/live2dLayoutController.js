(function (root) {
  "use strict";

  function createController(deps = {}) {
    const state = deps.state || {};
    const window = deps.windowObject || root;
    const document = deps.documentObject || root.document;
    const performance = deps.performanceObject || root.performance || { now: () => Date.now() };
    const requestAnimationFrame = deps.requestAnimationFrame || root.requestAnimationFrame || ((fn) => setTimeout(() => fn(performance.now()), 16));
    const cancelAnimationFrame = deps.cancelAnimationFrame || root.cancelAnimationFrame || clearTimeout;
    const clampNumber = typeof deps.clampNumber === "function" ? deps.clampNumber : (v, min, max) => Math.min(max, Math.max(min, v));
    const desktopWindowController = deps.desktopWindowController || root.TaffyDesktopWindowController || {};
    const triggerTapMotion = typeof deps.triggerTapMotion === "function" ? deps.triggerTapMotion : () => {};
    const finalizeDesktopDrag = typeof deps.finalizeDesktopDrag === "function" ? deps.finalizeDesktopDrag : () => {};
    const stopDesktopWindowDrag = typeof deps.stopDesktopWindowDrag === "function" ? deps.stopDesktopWindowDrag : () => {};
    const tapMaxDurationMs = Number.isFinite(Number(deps.tapMaxDurationMs)) ? Number(deps.tapMaxDurationMs) : 280;
    const tapMoveThreshold = Number.isFinite(Number(deps.tapMoveThreshold)) ? Number(deps.tapMoveThreshold) : 8;

    function placeModel() {
      if (!state.model || !state.pixiApp) {
        return;
      }
      const model = state.model;
      const w = state.pixiApp.renderer.width;
      const h = state.pixiApp.renderer.height;
      if (!Number.isFinite(w) || !Number.isFinite(h) || w < 120 || h < 120) {
        return;
      }
      const sx = Math.max(0.0001, Number(model.scale?.x) || 1);
      const sy = Math.max(0.0001, Number(model.scale?.y) || 1);
      const internal = model.internalModel || {};
      const baseHeightCandidates = [
        Number(internal.originalHeight),
        Number(internal.height),
        Number(model.height) / sy,
        Number(model.height)
      ];
      const baseWidthCandidates = [
        Number(internal.originalWidth),
        Number(internal.width),
        Number(model.width) / sx,
        Number(model.width)
      ];
      const baseHeight = baseHeightCandidates.find((n) => Number.isFinite(n) && n > 1) || null;
      const baseWidth = baseWidthCandidates.find((n) => Number.isFinite(n) && n > 1) || null;

      // Fallback to a conservative scale when runtime reports odd initial size.
      let scale = 0.28;
      if (baseHeight) {
        const targetHeight = h * 0.76;
        scale = Math.max(0.08, Math.min(1.4, targetHeight / baseHeight));
      } else if (baseWidth) {
        const targetWidth = w * 0.34;
        scale = Math.max(0.08, Math.min(1.4, targetWidth / baseWidth));
      }
      scale *= state.modelConfig?.scale || 1;
      scale = Math.max(0.05, Math.min(4.0, scale));

      model.scale.set(scale);
      if (state.desktopMode && state.uiView === "model") {
        if (!Number.isFinite(state.modelPosX) || !Number.isFinite(state.modelPosY)) {
          state.modelPosX = w * 0.5;
          state.modelPosY = h * 0.9;
        }
        model.x = state.modelPosX;
        model.y = state.modelPosY;
      } else {
        model.x = w * (state.modelConfig?.x_ratio ?? 0.26);
        model.y = h * (state.modelConfig?.y_ratio ?? 0.96);
      }
      if (model.anchor && typeof model.anchor.set === "function") {
        model.anchor.set(0.5, 1.0);
      }
      model.visible = true;
      model.alpha = 1;
      if (state.desktopMode && state.uiView === "model") {
        clampModelVisibleInViewport(model);
        state.modelPosX = Number(model.x) || (w * 0.5);
        state.modelPosY = Number(model.y) || (h * 0.9);
      }
      state.layoutWidth = w;
      state.layoutHeight = h;
      state.baseTransform = {
        x: model.x,
        y: model.y,
        scale: scale,
        rotation: 0
      };
    }

    function clampModelVisibleInViewport(model) {
      if (!model || !state.pixiApp) {
        return;
      }
      const rw = Number(state.pixiApp.renderer?.width) || 0;
      const rh = Number(state.pixiApp.renderer?.height) || 0;
      if (rw < 120 || rh < 120) {
        return;
      }
      const mw = Math.max(80, Number(model.width) || rw * 0.32);
      const mh = Math.max(120, Number(model.height) || rh * 0.6);
      const marginX = Math.max(20, Math.min(rw * 0.18, mw * 0.24));
      const minX = marginX;
      const maxX = rw - marginX;
      const minY = Math.max(70, Math.min(rh * 0.6, mh * 0.28));
      const maxY = rh - 4;
      model.x = clampNumber(Number(model.x) || 0, minX, maxX);
      model.y = clampNumber(Number(model.y) || 0, minY, maxY);
      if (!model.visible) {
        model.visible = true;
      }
      if (!Number.isFinite(Number(model.alpha)) || model.alpha < 0.98) {
        model.alpha = 1;
      }
    }

    function handleWindowResize() {
      if (!state.model || !state.pixiApp) {
        return;
      }
      if (state.resizeRaf) {
        cancelAnimationFrame(state.resizeRaf);
      }
      state.resizeRaf = requestAnimationFrame(() => {
        state.resizeRaf = 0;
        const now = performance.now();
        if (state.windowDragActive || now < state.suspendRelayoutUntil) {
          return;
        }
        const rw = Number(state.pixiApp.renderer?.width) || 0;
        const rh = Number(state.pixiApp.renderer?.height) || 0;
        if (!rw || !rh) {
          return;
        }
        const dw = Math.abs(rw - state.layoutWidth);
        const dh = Math.abs(rh - state.layoutHeight);
        if (dw < 2 && dh < 2) {
          return;
        }
        placeModel();
      });
    }

    function getModelInteractiveBounds() {
      if (!state.model || !state.pixiApp) return null;
      let bounds = state._stableModelBounds;
      if (!bounds) {
        const mw = Number(state.model.width) || 0;
        const mh = Number(state.model.height) || 0;
        if (mw <= 0 || mh <= 0) return null;
        bounds = {
          left: Number(state.model.x) - mw * 0.5,
          right: Number(state.model.x) + mw * 0.5,
          top: Number(state.model.y) - mh,
          bottom: Number(state.model.y)
        };
      }
      const left = Number(bounds.left);
      const right = Number(bounds.right);
      const top = Number(bounds.top);
      const bottom = Number(bounds.bottom);
      if (
        !Number.isFinite(left) || !Number.isFinite(right) ||
        !Number.isFinite(top) || !Number.isFinite(bottom)
      ) {
        return null;
      }
      const width = right - left;
      const height = bottom - top;
      if (width < 20 || height < 20) {
        return null;
      }
      // Keep a conservative center zone for drag/click-through hit test.
      // Horizontal stays narrow; vertical is widened to include head/body/legs.
      const insetX = clampNumber(width * 0.30, 20, 180);
      const insetTop = clampNumber(height * 0.10, 8, 72);
      const insetBottom = clampNumber(height * 0.08, 6, 64);
      const hitLeft = left + insetX;
      const hitRight = right - insetX;
      const hitTop = top + insetTop;
      const hitBottom = bottom - insetBottom;
      if (hitRight - hitLeft < 20 || hitBottom - hitTop < 20) {
        return null;
      }
      return {
        left: hitLeft,
        right: hitRight,
        top: hitTop,
        bottom: hitBottom
      };
    }

    function isPointInModelDragHotzone(x, y, bounds) {
      return typeof DESKTOP_WINDOW_CONTROLLER.isPointInModelDragHotzone === "function"
        ? DESKTOP_WINDOW_CONTROLLER.isPointInModelDragHotzone(x, y, bounds, { clampNumber })
        : false;
    }

    function isPointOverVisibleModelArea(clientX, clientY) {
      if (!state.model || !state.pixiApp) return false;
      const bounds = getModelInteractiveBounds();
      if (!bounds) return false;
      const canvas = state.pixiApp.view;
      const rect = canvas.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return false;
      const renderer = state.pixiApp.renderer;
      const rw = Number(renderer?.width) || 0;
      const rh = Number(renderer?.height) || 0;
      if (rw <= 0 || rh <= 0) return false;
      const x = (clientX - rect.left) * (rw / rect.width);
      const y = (clientY - rect.top) * (rh / rect.height);
      if (!Number.isFinite(x) || !Number.isFinite(y)) return false;
      const pad = 2;
      const inStrictBounds = (
        x >= bounds.left - pad &&
        x <= bounds.right + pad &&
        y >= bounds.top - pad &&
        y <= bounds.bottom + pad
      );
      if (!inStrictBounds) return false;
      if (!isPointInModelDragHotzone(x, y, bounds)) return false;
      // Prefer runtime hit areas when available, but do not hard-reject when
      // hit areas miss while still inside strict conservative bounds.
      try {
        const hitFn = state.model && typeof state.model.hitTest === "function"
          ? state.model.hitTest.bind(state.model)
          : null;
        if (!hitFn) {
          return true;
        }
        const hit = hitFn(x, y);
        if (Array.isArray(hit)) {
          if (hit.length > 0) {
            return true;
          }
          return true;
        }
        if (typeof hit === "boolean") {
          if (hit) {
            return true;
          }
          return true;
        }
      } catch (_) {
        // Fallback to strict bounds only.
      }
      return true;
    }

    function isPointOverSubtitleDragHandle(clientX, clientY) {
      if (state.subtitleEnabled === false) {
        return false;
      }
      const handle = document.getElementById?.("subtitle-drag-handle");
      const layer = document.getElementById?.("subtitle-layer");
      if (!handle || !layer || !layer.classList?.contains("subtitle-visible")) {
        return false;
      }
      const rect = handle.getBoundingClientRect?.();
      if (!rect || rect.width <= 0 || rect.height <= 0) {
        return false;
      }
      const pad = 8;
      return (
        clientX >= rect.left - pad &&
        clientX <= rect.right + pad &&
        clientY >= rect.top - pad &&
        clientY <= rect.bottom + pad
      );
    }

    function setupClickthroughHitTest() {
      if (state.desktopBridge !== "electron") return;
      if (typeof window.electronAPI?.setClickthrough !== "function") return;
      let lastClickthrough = true;
      document.addEventListener("mousemove", (e) => {
        if (state.windowDragActive || state.subtitleDragPointerId) {
          if (lastClickthrough) {
            window.electronAPI.setClickthrough(false);
            lastClickthrough = false;
          }
          return;
        }
        const over = isPointOverVisibleModelArea(e.clientX, e.clientY)
          || isPointOverSubtitleDragHandle(e.clientX, e.clientY);
        const want = !over;
        if (want !== lastClickthrough) {
          lastClickthrough = want;
          window.electronAPI.setClickthrough(want);
        }
      });
    }

    function startModelMouseGazePolling() {
      if (state.uiView !== "model") {
        return;
      }
      if (state.mouseGazePollTimer) {
        return;
      }
      if (
        typeof window.electronAPI?.getCursorScreenPoint !== "function" ||
        typeof window.electronAPI?.getModelWindowBounds !== "function"
      ) {
        return;
      }
      let busy = false;
      state.mouseGazePollTimer = window.setInterval(async () => {
        if (busy) {
          return;
        }
        busy = true;
        try {
          const [cursor, bounds] = await Promise.all([
            window.electronAPI.getCursorScreenPoint(),
            window.electronAPI.getModelWindowBounds()
          ]);
          if (!cursor || !bounds) {
            return;
          }
          const width = Math.max(1, Number(bounds.width) || 0);
          const height = Math.max(1, Number(bounds.height) || 0);
          const centerX = Number(bounds.x) + width / 2;
          const centerY = Number(bounds.y) + height / 2;
          const relX = clampNumber((Number(cursor.x) - centerX) / (width / 2), -1, 1);
          const relY = clampNumber((Number(cursor.y) - centerY) / (height / 2), -1, 1);
          const gazeX = relX * 0.55;
          const gazeY = -relY * 0.38;
          state.mouseGazeTargetX = clampNumber(gazeX, -0.55, 0.55);
          state.mouseGazeTargetY = clampNumber(gazeY, -0.38, 0.38);
        } catch (_) {
        } finally {
          busy = false;
        }
      }, 33);
    }

function attachDrag(model) {
  if (state.useNativeWindowDrag) {
    // In model-only Electron window, rely on native drag region for stability.
    model.interactive = false;
    model.cursor = "default";
    return;
  }
  model.interactive = true;
  model.cursor = "grab";

  const maybeTriggerTapAction = () => {
    const downAt = Number(state.lastPointerDownAt) || 0;
    if (!downAt) {
      return;
    }
    const elapsed = performance.now() - downAt;
    const shouldTap = !state.pointerDragMoved && elapsed <= tapMaxDurationMs;
    state.lastPointerDownAt = 0;
    state.pointerDragMoved = false;
    if (shouldTap) {
      triggerTapMotion();
    }
  };

  model.on("pointerdown", (e) => {
    if (state.desktopMode && state.desktopBridge === "electron") {
      const ev = e?.data?.originalEvent || null;
      const cx = Number(ev?.clientX);
      const cy = Number(ev?.clientY);
      if (!Number.isFinite(cx) || !Number.isFinite(cy)) {
        return;
      }
      if (!isPointOverVisibleModelArea(cx, cy)) {
        return;
      }
    }
    const g = e.data?.global || { x: 0, y: 0 };
    state.lastPointerDownAt = performance.now();
    state.lastPointerDownGlobal = { x: Number(g.x) || 0, y: Number(g.y) || 0 };
    state.pointerDragMoved = false;
    state.windowDragActive = false;
    state.dragWindowAccumX = 0;
    state.dragWindowAccumY = 0;
    state.dragData = {
      data: e.data,
      lastGlobal: { x: g.x, y: g.y }
    };
    if (state.desktopMode) {
      document.body.classList.add("dragging-window");
      document.documentElement.classList.add("dragging-window");
      if (state.model) {
        state.model.visible = true;
        state.model.alpha = 1;
      }
    }
    // Fullscreen overlay: no window drag session needed.
    model.cursor = "grabbing";
    if (state.desktopMode && state.desktopBridge === "electron") {
      const start = state.dragData?.lastGlobal || { x: Number(g.x) || 0, y: Number(g.y) || 0 };
      const grabOffsetX = (Number(state.modelPosX) || Number(state.model?.x) || 0) - Number(start.x || 0);
      const grabOffsetY = (Number(state.modelPosY) || Number(state.model?.y) || 0) - Number(start.y || 0);
      const onDocMove = (ev) => {
        if (!state.dragData || !state.model) {
          document.removeEventListener("pointermove", onDocMove);
          return;
        }
        const canvas = state.pixiApp?.view;
        if (!canvas) return;
        const rect = canvas.getBoundingClientRect();
        if (rect.width <= 0 || rect.height <= 0) return;
        const renderer = state.pixiApp.renderer;
        const rw = Number(renderer?.width) || rect.width;
        const rh = Number(renderer?.height) || rect.height;
        const gx = (ev.clientX - rect.left) * (rw / rect.width);
        const gy = (ev.clientY - rect.top) * (rh / rect.height);
        if (!Number.isFinite(gx) || !Number.isFinite(gy)) {
          return;
        }
        state.dragData.lastGlobal = { x: gx, y: gy };
        const dxTap = Number(gx) - Number(state.lastPointerDownGlobal?.x || 0);
        const dyTap = Number(gy) - Number(state.lastPointerDownGlobal?.y || 0);
        if ((dxTap * dxTap + dyTap * dyTap) > (tapMoveThreshold * tapMoveThreshold)) {
          state.pointerDragMoved = true;
        }
        const nextX = gx + grabOffsetX;
        const nextY = gy + grabOffsetY;
        if (!Number.isFinite(nextX) || !Number.isFinite(nextY)) {
          return;
        }
        state.modelPosX = nextX;
        state.modelPosY = nextY;
        state.model.x = state.modelPosX;
        state.model.y = state.modelPosY;
        state.baseTransform.x = state.modelPosX;
        state.baseTransform.y = state.modelPosY;
        state.suspendRelayoutUntil = performance.now() + 240;
      };
      document.addEventListener("pointermove", onDocMove);
      const cleanup = () => {
        document.removeEventListener("pointermove", onDocMove);
        document.removeEventListener("pointerup", cleanup);
        window.removeEventListener("pointerup", cleanup);
      };
      document.addEventListener("pointerup", cleanup);
      window.addEventListener("pointerup", cleanup);
    } else if (!state.desktopMode) {
      // 浏览器模式：document 级监听，保证鼠标移出模型区域后拖动不中断
      state.browserDragActive = true;
      const canvas = state.pixiApp?.view;
      const scaleX = canvas
        ? (Number(state.pixiApp?.renderer?.width) || canvas.offsetWidth) /
          (canvas.getBoundingClientRect().width || 1)
        : 1;
      const scaleY = canvas
        ? (Number(state.pixiApp?.renderer?.height) || canvas.offsetHeight) /
          (canvas.getBoundingClientRect().height || 1)
        : 1;
      const grabOffsetX = (Number(state.model?.x) || 0) - (Number(g.x) || 0);
      const grabOffsetY = (Number(state.model?.y) || 0) - (Number(g.y) || 0);

      const onDocMoveBrowser = (ev) => {
        if (!state.browserDragActive || !state.model || !state.dragData) return;
        const c = state.pixiApp?.view;
        if (!c) return;
        const rect = c.getBoundingClientRect();
        if (rect.width <= 0 || rect.height <= 0) return;
        const rw = Number(state.pixiApp.renderer?.width) || rect.width;
        const rh = Number(state.pixiApp.renderer?.height) || rect.height;
        const px = (ev.clientX - rect.left) * (rw / rect.width) + grabOffsetX;
        const py = (ev.clientY - rect.top) * (rh / rect.height) + grabOffsetY;
        const dxTap = (ev.clientX - rect.left) * (rw / rect.width) -
                      Number(state.lastPointerDownGlobal?.x || 0);
        const dyTap = (ev.clientY - rect.top) * (rh / rect.height) -
                      Number(state.lastPointerDownGlobal?.y || 0);
        if ((dxTap * dxTap + dyTap * dyTap) > (tapMoveThreshold * tapMoveThreshold)) {
          state.pointerDragMoved = true;
        }
        state.model.x = px;
        state.model.y = py;
        state.baseTransform.x = px;
        state.baseTransform.y = py;
      };

      const cleanupBrowser = () => {
        state.browserDragActive = false;
        document.removeEventListener("pointermove", onDocMoveBrowser);
        document.removeEventListener("pointerup", cleanupBrowser);
        window.removeEventListener("pointerup", cleanupBrowser);
        maybeTriggerTapAction();
        model.cursor = "grab";
      };

      document.addEventListener("pointermove", onDocMoveBrowser);
      document.addEventListener("pointerup", cleanupBrowser);
      window.addEventListener("pointerup", cleanupBrowser);
    }
  });
  model.on("pointerup", () => {
    if (
      state.windowDragActive
      && state.desktopCanMoveWindow
      && state.desktopBridge !== "electron"
    ) {
      finalizeDesktopDrag();
    }
    state.dragData = null;
    stopDesktopWindowDrag();
    maybeTriggerTapAction();
    model.cursor = "grab";
  });
  model.on("pointerupoutside", () => {
    if (
      state.windowDragActive
      && state.desktopCanMoveWindow
      && state.desktopBridge !== "electron"
    ) {
      finalizeDesktopDrag();
    }
    state.dragData = null;
    stopDesktopWindowDrag();
    model.cursor = "grab";
  });
  model.on("pointercancel", () => {
    if (
      state.windowDragActive
      && state.desktopCanMoveWindow
      && state.desktopBridge !== "electron"
    ) {
      finalizeDesktopDrag();
    }
    state.dragData = null;
    stopDesktopWindowDrag();
    state.lastPointerDownAt = 0;
    state.pointerDragMoved = false;
    model.cursor = "grab";
  });

  const releaseDrag = () => {
    if (state.browserDragActive) return;
    if (!state.dragData) {
      return;
    }
    if (
      state.windowDragActive
      && state.desktopCanMoveWindow
      && state.desktopBridge !== "electron"
    ) {
      finalizeDesktopDrag();
    }
    state.dragData = null;
    stopDesktopWindowDrag();
    state.lastPointerDownAt = 0;
    state.pointerDragMoved = false;
    model.cursor = "grab";
  };
  window.addEventListener("mouseup", releaseDrag);
  window.addEventListener("blur", releaseDrag);

  model.on("pointermove", (e) => {
    if (!state.dragData) {
      return;
    }

    const globalNow = e.data?.global || state.dragData?.data?.global;
    if (globalNow) {
      const dxTap = Number(globalNow.x) - Number(state.lastPointerDownGlobal?.x || 0);
      const dyTap = Number(globalNow.y) - Number(state.lastPointerDownGlobal?.y || 0);
      if ((dxTap * dxTap + dyTap * dyTap) > (tapMoveThreshold * tapMoveThreshold)) {
        state.pointerDragMoved = true;
      }
    }

    if (state.desktopMode && state.desktopBridge === "electron") {
      // Electron desktop mode uses document-level pointermove for stable drag tracking.
      return;
    }

    const pos = state.dragData.data.getLocalPosition(state.pixiApp.stage);
    const px = Number(pos?.x);
    const py = Number(pos?.y);
    if (!Number.isFinite(px) || !Number.isFinite(py)) {
      return;
    }
    model.x = px;
    model.y = py;
    if (state.desktopMode) {
      state.modelPosX = px;
      state.modelPosY = py;
      clampModelVisibleInViewport(model);
      state.modelPosX = Number(model.x) || state.modelPosX;
      state.modelPosY = Number(model.y) || state.modelPosY;
      state.suspendRelayoutUntil = performance.now() + 180;
    }
    state.baseTransform.x = model.x;
    state.baseTransform.y = model.y;
  });

  const canvas = state.pixiApp?.view;
  if (canvas) {
    canvas.addEventListener("wheel", (e) => {
      e.preventDefault();
      if (!state.model) return;
      const factor = e.deltaY < 0 ? 1.08 : 1 / 1.08;
      const currentScale = Number(state.model.scale?.x) || 1;
      const newScale = Math.max(0.05, Math.min(4.0, currentScale * factor));
      state.model.scale.set(newScale);
      state.baseTransform.scale = newScale;
      const baseAuto = newScale / Math.max(0.001, Number(state.modelConfig?.scale) || 1);
      if (Number.isFinite(baseAuto) && baseAuto > 0) {
        state.modelConfig.scale = newScale / baseAuto;
      }
    }, { passive: false });
  }
}

    return {
      placeModel,
      clampModelVisibleInViewport,
      handleWindowResize,
      getModelInteractiveBounds,
      isPointInModelDragHotzone,
      isPointOverVisibleModelArea,
      isPointOverSubtitleDragHandle,
      attachDrag,
      setupClickthroughHitTest,
      startModelMouseGazePolling
    };
  }

  const api = { createController };
  root.TaffyLive2DLayoutController = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
