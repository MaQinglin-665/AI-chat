(function (root) {
  "use strict";

  const DEVELOPER_FEATURE_SCRIPTS = [
    "./character-runtime-debug-bridge.js",
    "./live2d-expression-tuning.js",
    "./ttsDebugReport.js",
    "./translateDebugReport.js",
    "./memoryDebugReport.js",
    "./grayTrialReadinessModel.js",
    "./grayTrialCharacterModel.js",
    "./grayTrialAutoRuntimeSwitchModel.js",
    "./followupReadinessView.js",
    "./grayTrialCharacterView.js"
  ];

  function readStorageFlag(storage) {
    if (!storage || typeof storage.getItem !== "function") {
      return "";
    }
    try {
      return String(storage.getItem("taffy.devFeatures") || storage.getItem("aiChat.devFeatures") || "");
    } catch (_) {
      return "";
    }
  }

  function isEnabledValue(value) {
    return /^(1|true|yes|on|dev)$/i.test(String(value || "").trim());
  }

  function isDeveloperFeatureModeEnabled(env = {}) {
    const location = env.location || root.location || {};
    const storage = env.localStorage || root.localStorage || null;
    const search = String(location.search || "");
    const params = typeof URLSearchParams === "function"
      ? new URLSearchParams(search)
      : null;
    const queryValue = params
      ? (params.get("dev") || params.get("debug") || params.get("developer"))
      : "";
    return isEnabledValue(queryValue) || isEnabledValue(readStorageFlag(storage));
  }

  function writeScriptTag(doc, src) {
    if (!doc || typeof doc.write !== "function") {
      return false;
    }
    doc.write(`<script src="${src}"><\/script>`);
    return true;
  }

  function installDeveloperFeatureScripts(doc = root.document, options = {}) {
    const scripts = Array.isArray(options.scripts) ? options.scripts : DEVELOPER_FEATURE_SCRIPTS;
    const enabled = options.enabled === true || (options.enabled !== false && isDeveloperFeatureModeEnabled());
    root.__TAFFY_DEV_FEATURES_ENABLED__ = enabled;
    if (!enabled) {
      return { enabled: false, scripts: [] };
    }
    const installed = [];
    scripts.forEach((src) => {
      if (writeScriptTag(doc, src)) {
        installed.push(src);
      }
    });
    return { enabled: true, scripts: installed };
  }

  function applyDeveloperFeatureVisibility(doc = root.document, options = {}) {
    if (!doc || typeof doc.querySelectorAll !== "function") {
      return 0;
    }
    const enabled = options.enabled === true || (options.enabled !== false && isDeveloperFeatureModeEnabled());
    const elements = Array.from(doc.querySelectorAll("[data-dev-feature]"));
    elements.forEach((el) => {
      el.hidden = !enabled;
      if (enabled) {
        el.removeAttribute("aria-hidden");
      } else {
        el.setAttribute("aria-hidden", "true");
      }
    });
    return elements.length;
  }

  const api = {
    DEVELOPER_FEATURE_SCRIPTS,
    isDeveloperFeatureModeEnabled,
    installDeveloperFeatureScripts,
    applyDeveloperFeatureVisibility
  };

  root.TaffyDevFeatureLoader = api;

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }

  if (typeof document !== "undefined" && !root.__TAFFY_DEV_FEATURE_LOADER_SKIP_AUTO__) {
    applyDeveloperFeatureVisibility(document);
    installDeveloperFeatureScripts(document);
  }
})(typeof window !== "undefined" ? window : globalThis);
