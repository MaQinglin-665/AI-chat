(function(root) {
  "use strict";

  function createLazyControllerGetter(options = {}) {
    let instance = null;
    const fallback = options.fallback || {};
    return function getLazyController() {
      if (!instance) {
        const canCreate = typeof options.canCreate === "function" ? options.canCreate() : true;
        if (canCreate && typeof options.create === "function") {
          instance = options.create();
        }
      }
      return instance || fallback;
    };
  }

  function invoke(getController, methodName, args = [], fallback) {
    const controller = typeof getController === "function" ? getController() : getController;
    const method = controller && controller[methodName];
    if (typeof method === "function") {
      return method.apply(controller, Array.isArray(args) ? args : []);
    }
    if (typeof fallback === "function") {
      return fallback();
    }
    return fallback;
  }

  const api = {
    createLazyControllerGetter,
    invoke
  };

  root.TaffyChatControllerDelegates = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
