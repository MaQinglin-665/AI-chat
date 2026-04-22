const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  moveWindowBy: (dx, dy) => ipcRenderer.send("window-move-by", dx, dy),
  resizeWindow: (w, h) => ipcRenderer.send("window-resize", w, h),
  beginWindowDrag: () => ipcRenderer.send("window-drag-begin"),
  endWindowDrag: () => ipcRenderer.send("window-drag-end"),
  captureDesktop: () => ipcRenderer.invoke("capture-desktop"),
  setWindowLock: (locked) => ipcRenderer.send("window-lock-set", !!locked),
  getWindowLock: () => ipcRenderer.invoke("window-lock-get"),
  setIgnoreMouseEvents: (ignore, options) =>
    ipcRenderer.send("set-ignore-mouse-events", !!ignore, options || {}),
  setClickthrough: (ignore) =>
    ipcRenderer.send("window-set-clickthrough", !!ignore),
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
