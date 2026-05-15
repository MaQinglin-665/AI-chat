(function (root) {
  "use strict";

  function createBoundary(deps = {}) {
    let appConfigController = null;

    function getAppConfigController() {
      const factory = deps.appConfigController;
      if (!appConfigController && factory && typeof factory.createController === "function") {
        appConfigController = factory.createController(
          typeof deps.createConfigDeps === "function" ? deps.createConfigDeps() : {}
        );
      }
      return appConfigController || factory;
    }

    return { getAppConfigController };
  }

  function createBoundaryIfAvailable(deps = {}, current = null) {
    if (current) {
      return current;
    }
    const factory = deps.appConfigController;
    if (factory && typeof factory.createController === "function") {
      return createBoundary(deps);
    }
    return null;
  }

  const api = { createBoundary, createBoundaryIfAvailable };
  root.TaffyChatConfigBoundary = api;

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
}(typeof globalThis !== "undefined" ? globalThis : window));
