(function (root) {
  "use strict";

  const DEFAULT_MANIFEST = {
    version: 1,
    character: "hiyori_pro_t11",
    emotions: {
      thinking: {
        durationMs: 1900,
        entry: "snap",
        assets: [
          { id: "thinking-focus-lines", file: "thinking-focus-lines.png", placement: "mark thinking-focus-lines" },
          { id: "thinking-ellipsis", file: "thinking-ellipsis.png", placement: "mark thinking-ellipsis" }
        ]
      },
      angry: {
        durationMs: 1700,
        entry: "snap",
        assets: [
          { id: "angry-impact-lines", file: "angry-impact-lines.png", placement: "mark angry-impact-lines" },
          { id: "angry-mark", file: "angry-mark.png", placement: "mark angry-mark" }
        ]
      },
      surprised: {
        durationMs: 1250,
        entry: "pop",
        assets: [
          { id: "surprised-spark", file: "surprised-spark.png", placement: "mark surprised-spark" }
        ]
      }
    }
  };

  const ASSET_ANCHORS = {
    "thinking-focus-lines": { x: 0.42, y: 0.15, width: 0.10, minWidth: 44, maxWidth: 70 },
    "thinking-ellipsis": { x: 0.68, y: 0.15, width: 0.09, minWidth: 40, maxWidth: 64 },
    "angry-impact-lines": { x: 0.23, y: 0.37, width: 0.12, minWidth: 52, maxWidth: 82 },
    "angry-mark": { x: 0.62, y: 0.16, width: 0.15, minWidth: 58, maxWidth: 96 },
    "surprised-spark": { x: 0.65, y: 0.12, width: 0.13, minWidth: 52, maxWidth: 86 }
  };

  function createController(deps = {}) {
    const state = deps.state || {};
    const document = deps.documentObject || root.document;
    const performance = deps.performanceObject || root.performance || { now: () => Date.now() };
    const setTimeoutFn = deps.setTimeoutFn || root.setTimeout || setTimeout;
    const clearTimeoutFn = deps.clearTimeoutFn || root.clearTimeout || clearTimeout;
    const manifest = deps.manifest || DEFAULT_MANIFEST;
    const basePath = String(deps.basePath || "./assets/live2d-overlays/hiyori/");

    function clampNumber(value, min, max) {
      const numeric = Number(value);
      const safe = Number.isFinite(numeric) ? numeric : min;
      return Math.max(min, Math.min(max, safe));
    }

    function getLayer() {
      try {
        return document?.getElementById?.("live2d-emotion-overlay-layer") || null;
      } catch (_) {
        return null;
      }
    }

    function getViewportSize() {
      const rootElement = document?.documentElement || {};
      return {
        width: Number(root.innerWidth || rootElement.clientWidth || 0) || 0,
        height: Number(root.innerHeight || rootElement.clientHeight || 0) || 0
      };
    }

    function getCanvasRect() {
      const canvas = state.pixiApp?.view || document?.getElementById?.("live2d-canvas");
      const rect = canvas?.getBoundingClientRect?.();
      if (rect && Number(rect.width) > 0 && Number(rect.height) > 0) {
        return {
          left: Number(rect.left) || 0,
          top: Number(rect.top) || 0,
          width: Number(rect.width) || 0,
          height: Number(rect.height) || 0,
          rendererWidth: Number(state.pixiApp?.renderer?.width || canvas.width || rect.width) || Number(rect.width) || 1,
          rendererHeight: Number(state.pixiApp?.renderer?.height || canvas.height || rect.height) || Number(rect.height) || 1
        };
      }
      const viewport = getViewportSize();
      return {
        left: 0,
        top: 0,
        width: viewport.width || 1,
        height: viewport.height || 1,
        rendererWidth: viewport.width || 1,
        rendererHeight: viewport.height || 1
      };
    }

    function resolveModelBox() {
      const canvas = getCanvasRect();
      let bounds = state._stableModelBounds;
      if (!bounds && state.model) {
        const width = Number(state.model.width) || 0;
        const height = Number(state.model.height) || 0;
        const x = Number(state.model.x) || 0;
        const y = Number(state.model.y) || 0;
        if (width > 0 && height > 0) {
          bounds = {
            left: x - width * 0.5,
            right: x + width * 0.5,
            top: y - height,
            bottom: y
          };
        }
      }
      const left = Number(bounds?.left);
      const right = Number(bounds?.right);
      const top = Number(bounds?.top);
      const bottom = Number(bounds?.bottom);
      if (
        Number.isFinite(left) && Number.isFinite(right) &&
        Number.isFinite(top) && Number.isFinite(bottom) &&
        right - left > 20 && bottom - top > 20
      ) {
        const scaleX = canvas.width / Math.max(1, canvas.rendererWidth);
        const scaleY = canvas.height / Math.max(1, canvas.rendererHeight);
        return {
          left: canvas.left + left * scaleX,
          right: canvas.left + right * scaleX,
          top: canvas.top + top * scaleY,
          bottom: canvas.top + bottom * scaleY,
          width: (right - left) * scaleX,
          height: (bottom - top) * scaleY
        };
      }
      const viewport = getViewportSize();
      const width = Math.max(220, Math.min(620, viewport.width * 0.34));
      const height = Math.max(420, Math.min(920, viewport.height * 0.76));
      return {
        left: viewport.width * 0.62,
        right: viewport.width * 0.62 + width,
        top: viewport.height * 0.18,
        bottom: viewport.height * 0.18 + height,
        width,
        height
      };
    }

    function applyAssetPlacement(node, asset) {
      const anchor = ASSET_ANCHORS[asset?.id];
      if (!anchor || !node?.style) {
        return null;
      }
      const viewport = getViewportSize();
      const box = resolveModelBox();
      const width = clampNumber(box.width * anchor.width, anchor.minWidth, anchor.maxWidth);
      const half = width * 0.5;
      const rawLeft = box.left + box.width * anchor.x;
      const rawTop = box.top + box.height * anchor.y;
      const left = viewport.width
        ? clampNumber(rawLeft, half + 8, Math.max(half + 8, viewport.width - half - 8))
        : rawLeft;
      const top = viewport.height
        ? clampNumber(rawTop, half + 8, Math.max(half + 8, viewport.height - half - 8))
        : rawTop;
      node.style.left = `${Math.round(left)}px`;
      node.style.top = `${Math.round(top)}px`;
      node.style.width = `${Math.round(width)}px`;
      return { left: Math.round(left), top: Math.round(top), width: Math.round(width) };
    }

    function clearEmotionOverlay() {
      if (state.hiyoriEmotionOverlayTimer) {
        clearTimeoutFn(state.hiyoriEmotionOverlayTimer);
        state.hiyoriEmotionOverlayTimer = 0;
      }
      const layer = getLayer();
      if (layer) {
        layer.hidden = true;
        layer.setAttribute?.("aria-hidden", "true");
        layer.classList?.remove?.("is-visible");
        layer.replaceChildren?.();
      }
      state.hiyoriEmotionOverlayActive = false;
      state.hiyoriEmotionOverlayDebug = null;
    }

    function showEmotionOverlay(emotion, opts = {}) {
      const key = String(emotion || "").trim().toLowerCase();
      const config = manifest.emotions?.[key];
      const layer = getLayer();
      if (!config || !layer) {
        state.hiyoriEmotionOverlayDebug = {
          emotion: key,
          ok: false,
          reason: !config ? "missing_emotion" : "missing_layer",
          at: performance.now()
        };
        return false;
      }
      if (opts.intensity && String(opts.intensity) !== "high") {
        clearEmotionOverlay();
        return false;
      }
      const nodes = [];
      for (const asset of config.assets || []) {
        const img = document.createElement("img");
        img.className = `hiyori-emotion-overlay-asset ${asset.placement || ""}`.trim();
        img.src = `${basePath}${asset.file}`;
        img.alt = "";
        img.dataset.assetId = asset.id;
        img.setAttribute?.("aria-hidden", "true");
        const placement = applyAssetPlacement(img, asset);
        if (placement) {
          img.dataset.anchorLeft = String(placement.left);
          img.dataset.anchorTop = String(placement.top);
          img.dataset.anchorWidth = String(placement.width);
        }
        nodes.push(img);
      }
      layer.replaceChildren(...nodes);
      layer.hidden = false;
      layer.setAttribute?.("aria-hidden", "false");
      layer.classList?.add?.("is-visible");
      state.hiyoriEmotionOverlayActive = true;
      state.hiyoriEmotionOverlayDebug = {
        emotion: key,
        ok: true,
        assets: nodes.map((node) => node.dataset.assetId),
        at: performance.now()
      };
      const durationMs = Math.max(600, Math.min(3600, Number(opts.durationMs || config.durationMs) || 1600));
      state.hiyoriEmotionOverlayTimer = setTimeoutFn(clearEmotionOverlay, durationMs);
      return true;
    }

    return {
      clearEmotionOverlay,
      showEmotionOverlay
    };
  }

  const api = { createController, DEFAULT_MANIFEST };
  root.TaffyHiyoriEmotionOverlayController = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
