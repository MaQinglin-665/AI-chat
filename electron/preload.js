const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  roomAvatarLabels: ()=>ipcRenderer.invoke("room-avatar-labels"),
  selectRoomAvatar: (role,reset)=>ipcRenderer.invoke("room-avatar-select",role,reset===true),
  setRoomEnabled: value=>ipcRenderer.invoke("room-toggle",value===true),
  onRoomContext: cb=>ipcRenderer.on("room-context",(_event,value)=>cb(value)),
  roomState: () => ipcRenderer.invoke("room-state"),
  openRoom: options => ipcRenderer.invoke("room-open",options),
  onRoomActive: cb => ipcRenderer.on("room-active",(_e,value)=>cb(value)),
  onRoomTurn: cb => ipcRenderer.on("room-turn",(_e,value)=>cb(value)),
  moveWindowBy: (dx, dy) => ipcRenderer.send("window-move-by", dx, dy),
  resizeWindow: (w, h) => ipcRenderer.send("window-resize", w, h),
  minimizeWindow: () => ipcRenderer.send("window-minimize"),
  setTitleBarTheme: (theme) => ipcRenderer.send("window-titlebar-theme", theme),
  beginWindowDrag: () => ipcRenderer.send("window-drag-begin"),
  endWindowDrag: () => ipcRenderer.send("window-drag-end"),
  captureDesktop: () => ipcRenderer.invoke("capture-desktop"),
  setWindowLock: (locked) => ipcRenderer.send("window-lock-set", !!locked),
  getWindowLock: () => ipcRenderer.invoke("window-lock-get"),
  getSurfaceActive: () => ipcRenderer.invoke("surface-active-get"),
  reportSurfaceReady: () => ipcRenderer.send("surface-renderer-ready"),
  reportLive2DRenderMetrics: (payload) => ipcRenderer.send("live2d-render-metrics", payload || {}),
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
  onSurfaceActiveChanged: (callback) => {
    if (typeof callback !== "function") {
      return () => {};
    }
    const handler = (_event, active) => callback(!!active);
    ipcRenderer.on("surface-active-changed", handler);
    return () => {
      try {
        ipcRenderer.removeListener("surface-active-changed", handler);
      } catch (_) {
        // ignore
      }
    };
  },
});
