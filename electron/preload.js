const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  moveWindowBy: (dx, dy) => ipcRenderer.send("window-move-by", dx, dy),
  resizeWindow: (w, h) => ipcRenderer.send("window-resize", w, h),
  beginWindowDrag: () => ipcRenderer.send("window-drag-begin"),
  endWindowDrag: () => ipcRenderer.send("window-drag-end"),
  captureDesktop: () => ipcRenderer.invoke("capture-desktop"),
  setWindowLock: (locked) => ipcRenderer.send("window-lock-set", !!locked),
  getWindowLock: () => ipcRenderer.invoke("window-lock-get"),
  getApiToken: () => ipcRenderer.invoke("get-api-token"),
  getCursorScreenPoint: () => ipcRenderer.invoke("get-cursor-screen-point"),
  getModelWindowBounds: () => ipcRenderer.invoke("get-model-window-bounds"),
  setIgnoreMouseEvents: (ignore, options) =>
    ipcRenderer.send("set-ignore-mouse-events", !!ignore, options || {}),
  setClickthrough: (ignore) =>
    ipcRenderer.send("window-set-clickthrough", !!ignore),
  sendSubtitle: (payload) => ipcRenderer.send("subtitle-show", payload),
  sendSubtitleHide: (payload) => ipcRenderer.send("subtitle-hide", payload),
  onSubtitle: (cb) => {
    const h = (_e, p) => cb(p);
    ipcRenderer.on("subtitle-show", h);
    return () => {
      try {
        ipcRenderer.removeListener("subtitle-show", h);
      } catch (_) {}
    };
  },
  onSubtitleHide: (cb) => {
    const h = (_e, p) => cb(p);
    ipcRenderer.on("subtitle-hide", h);
    return () => {
      try {
        ipcRenderer.removeListener("subtitle-hide", h);
      } catch (_) {}
    };
  },
  onWindowLockChanged: (callback) => {
    if (typeof callback !== "function") {
      return () => {};
    }
    const handler = (_event, locked) => callback(!!locked);
    ipcRenderer.on("window-lock-changed", handler);
    return () => {
      try {
        ipcRenderer.removeListener("window-lock-changed", handler);
      } catch (_) {
        // ignore
      }
    };
  },
});
