(function (root) {
  "use strict";

  const SUPPORTED_EMOTIONS = new Set([
    "neutral",
    "happy",
    "playful",
    "sad",
    "anxious",
    "angry",
    "surprised",
    "annoyed",
    "thinking"
  ]);

  const SUPPORTED_ACTIONS = new Set([
    "none",
    "wave",
    "nod",
    "shake_head",
    "think",
    "happy_idle",
    "surprised"
  ]);

  const SUPPORTED_INTENSITY = new Set(["low", "normal", "high"]);

  function normalizeEmotionValue(value) {
    const key = String(value || "").trim().toLowerCase();
    return SUPPORTED_EMOTIONS.has(key) ? key : "neutral";
  }

  function normalizeActionValue(value) {
    let key = String(value || "").trim().toLowerCase();
    if (key === "shake-head") {
      key = "shake_head";
    } else if (key === "thinking" || key === "ponder" || key === "pondering") {
      key = "think";
    }
    return SUPPORTED_ACTIONS.has(key) ? key : "none";
  }

  function normalizeIntensityValue(value) {
    const key = String(value || "").trim().toLowerCase();
    return SUPPORTED_INTENSITY.has(key) ? key : "normal";
  }

  function normalizeSafeString(value) {
    if (typeof value !== "string") {
      return "";
    }
    return String(value || "").trim().toLowerCase();
  }

  function normalizeMetadataForFrontend(raw) {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
      return null;
    }
    const out = {};
    let hasRuntimeField = false;
    if (Object.prototype.hasOwnProperty.call(raw, "emotion")) {
      hasRuntimeField = true;
      out.emotion = normalizeEmotionValue(raw.emotion);
    }
    if (Object.prototype.hasOwnProperty.call(raw, "action")) {
      hasRuntimeField = true;
      out.action = normalizeActionValue(raw.action);
    }
    if (Object.prototype.hasOwnProperty.call(raw, "intensity")) {
      hasRuntimeField = true;
      out.intensity = normalizeIntensityValue(raw.intensity);
    }
    for (const key of ["live2d_hint", "voice_style"]) {
      const value = normalizeSafeString(raw[key]);
      if (value) {
        hasRuntimeField = true;
        out[key] = value;
      }
    }
    return hasRuntimeField ? out : null;
  }

  const api = {
    normalizeMetadataForFrontend,
    normalizeEmotionValue,
    normalizeActionValue,
    normalizeIntensityValue
  };

  root.TaffyCharacterRuntime = api;

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
}(typeof globalThis !== "undefined" ? globalThis : window));
