(function (root) {
  "use strict";

  const PANEL_STYLE = [
    "position:fixed",
    "right:14px",
    "bottom:14px",
    "z-index:99999",
    "width:min(430px,calc(100vw - 28px))",
    "max-height:52vh",
    "overflow:auto",
    "padding:12px",
    "border:1px solid rgba(120,150,170,.45)",
    "border-radius:14px",
    "background:rgba(8,18,26,.88)",
    "color:#d8f3ff",
    "font:12px/1.45 Consolas,Menlo,monospace",
    "box-shadow:0 18px 45px rgba(0,0,0,.28)",
    "backdrop-filter:blur(10px)",
    "white-space:pre-wrap",
    "display:none"
  ].join(";");

  function createDebugPanel(options = {}) {
    const documentObject = options.documentObject || root.document;
    if (!documentObject) {
      return null;
    }
    const panel = documentObject.createElement("div");
    panel.id = String(options.id || "debug-panel");
    panel.style.cssText = PANEL_STYLE.replace("width:min(430px", `width:min(${Number(options.width) || 430}px`);

    const head = documentObject.createElement("div");
    head.style.cssText = "display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:8px;";
    const title = documentObject.createElement("strong");
    title.textContent = String(options.title || "Debug");
    title.style.cssText = "font-size:13px;color:#ffffff;";
    const close = documentObject.createElement("button");
    close.type = "button";
    close.textContent = "Hide";
    close.style.cssText = "border:0;border-radius:999px;padding:4px 9px;background:#d8f3ff;color:#10202a;cursor:pointer;";
    close.addEventListener("click", () => {
      if (typeof options.onHide === "function") {
        options.onHide();
      }
    });
    head.appendChild(title);
    head.appendChild(close);

    const body = documentObject.createElement("pre");
    body.style.cssText = "margin:0;white-space:pre-wrap;";
    panel.appendChild(head);
    panel.appendChild(body);
    documentObject.body.appendChild(panel);
    return { panel, body };
  }

  function updateDebugPanel(options = {}) {
    const state = options.state || {};
    const visibleKey = options.visibleKey;
    const panelKey = options.panelKey;
    const bodyKey = options.bodyKey;
    const timerKey = options.timerKey;
    if (!visibleKey || !panelKey || !bodyKey || !timerKey) {
      return null;
    }
    const windowObject = options.windowObject || root;
    const isVisible = !!state[visibleKey];
    if (!isVisible) {
      if (state[panelKey]) {
        state[panelKey].style.display = "none";
      }
      if (state[timerKey]) {
        clearInterval(state[timerKey]);
        state[timerKey] = 0;
      }
      return state[panelKey] || null;
    }

    if (!state[panelKey]) {
      const created = createDebugPanel(options);
      if (!created) {
        return null;
      }
      state[panelKey] = created.panel;
      state[bodyKey] = created.body;
    }

    if (!state[timerKey]) {
      state[timerKey] = windowObject.setInterval(() => {
        if (!state[visibleKey]) {
          updateDebugPanel(options);
          return;
        }
        if (state[bodyKey]) {
          state[bodyKey].textContent = typeof options.buildReport === "function" ? options.buildReport() : "";
        }
      }, Number(options.intervalMs) || 1000);
    }
    state[panelKey].style.display = "block";
    if (state[bodyKey]) {
      state[bodyKey].textContent = typeof options.buildReport === "function" ? options.buildReport() : "";
    }
    return state[panelKey];
  }

  function toggleDebugPanel(options = {}, force = null) {
    const state = options.state || {};
    const visibleKey = options.visibleKey;
    if (!visibleKey) {
      return false;
    }
    state[visibleKey] = force === null ? !state[visibleKey] : !!force;
    updateDebugPanel(options);
    return !!state[visibleKey];
  }

  const api = {
    createDebugPanel,
    updateDebugPanel,
    toggleDebugPanel
  };

  root.TaffyDebugPanelController = api;

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof window !== "undefined" ? window : globalThis);
