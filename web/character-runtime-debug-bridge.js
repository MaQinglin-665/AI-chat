(function (root) {
  "use strict";

  const DEBUG_BRIDGE_KEY = "__AI_CHAT_DEBUG_CHARACTER_RUNTIME__";

  const DEBUG_SAMPLES = {
    happyWave: {
      emotion: "happy",
      action: "wave",
      intensity: "normal",
      live2d_hint: "happy",
      voice_style: "cheerful"
    },
    annoyed: {
      emotion: "annoyed",
      action: "shake_head",
      intensity: "normal",
      live2d_hint: "angry",
      voice_style: "serious"
    },
    thinking: {
      emotion: "thinking",
      action: "think",
      intensity: "low",
      live2d_hint: "neutral",
      voice_style: "neutral"
    },
    surprised: {
      emotion: "surprised",
      action: "surprised",
      intensity: "high",
      live2d_hint: "surprised",
      voice_style: "cheerful"
    }
  };

  function createEmotionMetadata(emotion) {
    return { emotion: String(emotion || "") };
  }

  function createActionMetadata(action) {
    return { action: String(action || "") };
  }

  const api = {
    DEBUG_BRIDGE_KEY,
    DEBUG_SAMPLES,
    createEmotionMetadata,
    createActionMetadata
  };

  root.TaffyCharacterRuntimeDebugBridge = api;

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
}(typeof globalThis !== "undefined" ? globalThis : window));
