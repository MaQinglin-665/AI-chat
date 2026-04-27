(function () {
  const ns = (window.TaffyModules = window.TaffyModules || {});
  ns.desktopBridge = {
    refresh: () => {
      if (typeof window.refreshDesktopBridgeReady === 'function') {
        window.refreshDesktopBridgeReady();
      }
    },
    setLocked: (locked) => {
      if (typeof window.setWindowLockedFromUI === 'function') {
        window.setWindowLockedFromUI(!!locked);
      }
    }
  };
}());
