(function () {
  const ns = (window.TaffyModules = window.TaffyModules || {});
  ns.live2dController = {
    ensureRuntime: () => {
      if (typeof window.ensureLive2DRuntime === 'function') {
        return window.ensureLive2DRuntime();
      }
      return Promise.resolve();
    },
    init: () => {
      if (typeof window.initLive2D === 'function') {
        return window.initLive2D();
      }
      return Promise.resolve();
    }
  };
}());
