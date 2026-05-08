(function (root) {
  "use strict";

  function createController(deps = {}) {
    const state = deps.state || {};
    const window = deps.windowObject || root;
    const document = deps.documentObject || window.document || root.document;
    const console = deps.consoleObject || root.console || { error() {}, log() {} };
    const performance = deps.performanceObject || window.performance || root.performance || { now: () => Date.now() };
    const runtimeVersion = String(deps.runtimeVersion || "");
    const appendMessage = typeof deps.appendMessage === "function" ? deps.appendMessage : () => {};
    const setStatus = typeof deps.setStatus === "function" ? deps.setStatus : () => {};
    const placeModel = typeof deps.placeModel === "function" ? deps.placeModel : () => {};
    const attachDrag = typeof deps.attachDrag === "function" ? deps.attachDrag : () => {};
    const setupClickthroughHitTest = typeof deps.setupClickthroughHitTest === "function" ? deps.setupClickthroughHitTest : () => {};
    const scheduleIdleMotionLoop = typeof deps.scheduleIdleMotionLoop === "function" ? deps.scheduleIdleMotionLoop : () => {};
    const stopIdleMotionLoop = typeof deps.stopIdleMotionLoop === "function" ? deps.stopIdleMotionLoop : () => {};
    const setModelMotionDefinitions = typeof deps.setModelMotionDefinitions === "function" ? deps.setModelMotionDefinitions : () => {};
    const applyStyleExpressionLayer = typeof deps.applyStyleExpressionLayer === "function" ? deps.applyStyleExpressionLayer : () => {};
    const updateMicroMotionLayer = typeof deps.updateMicroMotionLayer === "function" ? deps.updateMicroMotionLayer : () => {};
    const getStyleExpressionProfile = typeof deps.getStyleExpressionProfile === "function" ? deps.getStyleExpressionProfile : () => ({});
    const getActiveModelCadence = typeof deps.getActiveModelCadence === "function" ? deps.getActiveModelCadence : () => ({});
    const clampNumber = typeof deps.clampNumber === "function" ? deps.clampNumber : (v, min, max) => Math.min(max, Math.max(min, Number(v) || 0));
    const handleWindowResize = typeof deps.handleWindowResize === "function" ? deps.handleWindowResize : () => {};

    function loadScript(src, isReady) {
      return new Promise((resolve, reject) => {
        if (typeof isReady === "function" && isReady()) {
          resolve();
          return;
        }
        const script = document.createElement("script");
        script.src = src.includes("?") || !runtimeVersion ? src : `${src}?v=${runtimeVersion}`;
        script.async = false;
        script.onload = () => {
          if (typeof isReady === "function" && !isReady()) {
            reject(new Error(`Loaded but missing runtime object: ${src}`));
            return;
          }
          resolve();
        };
        script.onerror = () => {
          reject(new Error(`Failed to load script: ${src}`));
        };
        document.head.appendChild(script);
      });
    }

    async function ensureLive2DRuntime() {
      await loadScript(
        "/vendor/pixi.min.js",
        () => typeof window.PIXI !== "undefined"
      );

      await loadScript(
        "/vendor/live2dcubismcore.min.js",
        () =>
          typeof window.Live2DCubismCore !== "undefined" &&
          !!window.Live2DCubismCore.Version
      );

      // Fallback to official direct link if local core script gets corrupted/cached badly.
      if (
        typeof window.Live2DCubismCore === "undefined" ||
        !window.Live2DCubismCore.Version
      ) {
        await loadScript(
          "https://cubism.live2d.com/sdk-web/cubismcore/live2dcubismcore.min.js",
          () =>
            typeof window.Live2DCubismCore !== "undefined" &&
            !!window.Live2DCubismCore.Version
        );
      }

      await loadScript(
        "/vendor/cubism4.min.js",
        () =>
          !!window.PIXI &&
          !!window.PIXI.live2d &&
          !!window.PIXI.live2d.Live2DModel
      );
    }

    function showLive2DSetupGuide(statusText, guideText) {
      setStatus(statusText);
      if (state.live2dGuideShown) {
        return;
      }
      state.live2dGuideShown = true;
      appendMessage("assistant", guideText);
    }

    function patchCoreModelUpdate(model) {
      const coreModel = model.internalModel && model.internalModel.coreModel;
      if (!coreModel || typeof coreModel.update !== "function") {
        return;
      }
      const originalUpdate = coreModel.update.bind(coreModel);
      coreModel.update = function () {
        if (state.model === model && !state.dragData && !state.windowDragActive) {
          applyStyleExpressionLayer();
          updateMicroMotionLayer();
        }
        return originalUpdate();
      };
    }

    function addFloatTicker() {
      state.pixiApp.ticker.add(() => {
        if (!state.model) {
          return;
        }
        if (!state.animating && !state.windowDragActive && !state.browserDragActive) {
          const t = performance.now() / 1000;
          const styleProfile = getStyleExpressionProfile(state.currentTalkStyle || "neutral");
          const cadence = getActiveModelCadence();
          const floatScale = clampNumber(
            (Number(styleProfile.floatScale) || 1) * (Number(cadence?.floatAmp) || 1),
            0.68,
            1.36
          );
          const floatSpeed = Math.max(0.72, Math.min(1.4, Number(cadence?.floatSpeed) || 1));
          const floatY = state.baseTransform.y + Math.sin(t * 1.5 * floatSpeed) * (4 * floatScale);
          const floatRot = state.baseTransform.rotation + Math.sin(t * 1.2 * floatSpeed) * (0.02 * floatScale);
          state.model.rotation = Number.isFinite(floatRot) ? floatRot : 0;
          state.model.y = Number.isFinite(floatY) ? floatY : state.baseTransform.y;
        }
      });
    }

    function maybeTightFitDesktopWindow() {
      if (
        state.desktopMode &&
        state.uiView === "model" &&
        state.desktopBridge === "electron" &&
        state._stableModelBounds
      ) {
        const bounds = state._stableModelBounds;
        const bw = Math.round(bounds.right - bounds.left);
        const bh = Math.round(bounds.bottom - bounds.top);
        const pad = 40;
        const fitW = Math.max(200, bw + pad * 2);
        const fitH = Math.max(300, bh + pad);
        const canvas = state.pixiApp.view;
        const rect = canvas.getBoundingClientRect();
        if (rect.width > fitW * 1.15 || rect.height > fitH * 1.15) {
          if (typeof window.electronAPI?.resizeWindow === "function") {
            window.electronAPI.resizeWindow(fitW, fitH);
            setTimeout(() => { placeModel(); }, 80);
          }
        }
      }
    }

    async function initLive2D() {
      const canvas = document.getElementById("live2d-canvas");
      const rawModelPath = String(state.config?.model_path || "").trim();
      const normalizedModelPath = rawModelPath.replace(/\\/g, "/").toLowerCase();
      const live2dPathMissing = !rawModelPath || normalizedModelPath.includes("your_model");

      if (live2dPathMissing) {
        showLive2DSetupGuide(
          "未配置 Live2D 模型",
          "还没有检测到可用的 Live2D 模型。你可以先直接聊天体验；随后把模型放到 web/models 目录，并在 config.json 设置 model_path（示例：/models/hiyori/hiyori.model3.json）。"
        );
        return;
      }

      if (!window.Live2DCubismCore) {
        setStatus("CubismCore 缺失");
        appendMessage("assistant", "Cubism 核心未加载，请强制刷新（Ctrl+F5）。");
        return;
      }
      if (!window.PIXI || !window.PIXI.live2d || !window.PIXI.live2d.Live2DModel) {
        setStatus("Live2D 运行时缺失");
        appendMessage("assistant", "Live2D 运行时未加载，请强制刷新（Ctrl+F5）。");
        return;
      }
      state.pixiApp = new window.PIXI.Application({
        view: canvas,
        autoStart: true,
        resizeTo: window,
        backgroundAlpha: 0,
        antialias: true
      });

      const { Live2DModel } = window.PIXI.live2d;
      try {
        const model = await Live2DModel.from(state.config.model_path);
        state.model = model;
        window.__petModel = model;
        setModelMotionDefinitions(model);
        state.pixiApp.stage.addChild(model);
        placeModel();
        attachDrag(model);
        setupClickthroughHitTest();
        scheduleIdleMotionLoop();
        patchCoreModelUpdate(model);
        addFloatTicker();

        const i = model.internalModel || {};
        const info = `模型已就绪（${Math.round(model.width)}x${Math.round(model.height)}，动作组 ${state.availableMotionGroups.length}）`;
        console.log("[pet] model metrics", {
          width: model.width,
          height: model.height,
          internalWidth: i.width,
          internalHeight: i.height,
          originalWidth: i.originalWidth,
          originalHeight: i.originalHeight,
          x: model.x,
          y: model.y,
          scaleX: model.scale?.x,
          scaleY: model.scale?.y
        });
        maybeTightFitDesktopWindow();
        setStatus(info);
      } catch (err) {
        console.error(err);
        stopIdleMotionLoop();
        const detail = String(err?.message || err || "").trim();
        const missingFile = /not\s*found|failed\s*to\s*fetch|404|enoent/i.test(detail);
        if (missingFile) {
          showLive2DSetupGuide(
            "未找到 Live2D 模型",
            `未找到 Live2D 模型文件：${rawModelPath || "(空)"}。请确认模型文件已放在 web/models 下，并把 config.json 的 model_path 指向 .model3.json 文件。`
          );
          return;
        }
        showLive2DSetupGuide(
          "模型加载失败，请检查 model_path",
          "Live2D 初始化失败。你可以先继续使用聊天功能，再检查 model_path 是否指向可访问的 .model3.json 文件。"
        );
        return;
      }

      window.addEventListener("resize", handleWindowResize);
    }

    return {
      loadScript,
      ensureLive2DRuntime,
      initLive2D
    };
  }

  const api = { createController };
  root.TaffyLive2DRuntimeController = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
