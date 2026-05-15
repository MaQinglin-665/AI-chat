(function (root) {
  "use strict";

  function createController(factory, createDeps, current) {
    if (!current && factory && typeof factory.createController === "function") {
      return factory.createController(typeof createDeps === "function" ? createDeps() : {});
    }
    return current || factory;
  }

  function createBoundary(deps = {}) {
    let expressionController = null;
    let runtimeController = null;
    let layoutController = null;

    function getLive2DExpressionController() {
      expressionController = createController(
        deps.live2dExpressionController,
        deps.createExpressionDeps,
        expressionController
      );
      return expressionController || deps.live2dExpressionController;
    }

    function getLive2DRuntimeController() {
      runtimeController = createController(
        deps.live2dRuntimeController,
        deps.createRuntimeDeps,
        runtimeController
      );
      return runtimeController || deps.live2dRuntimeController;
    }

    function getLive2DLayoutController() {
      layoutController = createController(
        deps.live2dLayoutController,
        deps.createLayoutDeps,
        layoutController
      );
      return layoutController || deps.live2dLayoutController;
    }

    return {
      getLive2DExpressionController,
      getLive2DRuntimeController,
      getLive2DLayoutController
    };
  }

  function hasController(factory) {
    return factory && typeof factory.createController === "function";
  }

  function createBoundaryIfAvailable(deps = {}, current = null) {
    if (current) {
      return current;
    }
    if (
      hasController(deps.live2dExpressionController)
      || hasController(deps.live2dRuntimeController)
      || hasController(deps.live2dLayoutController)
    ) {
      return createBoundary(deps);
    }
    return null;
  }

  const api = { createBoundary, createBoundaryIfAvailable };
  root.TaffyChatLive2DBoundary = api;

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
}(typeof globalThis !== "undefined" ? globalThis : window));
