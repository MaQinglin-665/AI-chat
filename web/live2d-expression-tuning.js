(function (root) {
  "use strict";

  const STYLE_EXPRESSION_PROFILE = {
    comfort: {
      mouthForm: 0.14,
      cheek: 0.18,
      eyeSmile: 0.16,
      browY: 0.05,
      browAngle: 0.03,
      headX: -0.35,
      headY: 0.2,
      bodyX: -0.25,
      floatScale: 0.92
    },
    clear: {
      mouthForm: -0.05,
      cheek: 0.03,
      eyeSmile: 0.02,
      browY: 0.08,
      browAngle: -0.06,
      headX: 0.18,
      headY: -0.14,
      bodyX: 0.24,
      floatScale: 0.82
    },
    playful: {
      mouthForm: 0.28,
      cheek: 0.32,
      eyeSmile: 0.26,
      browY: 0.02,
      browAngle: 0.06,
      headX: 0.56,
      headY: -0.1,
      bodyX: 0.36,
      floatScale: 1.18
    },
    steady: {
      mouthForm: -0.12,
      cheek: -0.02,
      eyeSmile: 0.0,
      browY: -0.05,
      browAngle: -0.12,
      headX: -0.08,
      headY: -0.18,
      bodyX: -0.24,
      floatScale: 0.74
    },
    neutral: {
      mouthForm: 0.04,
      cheek: 0.06,
      eyeSmile: 0.05,
      browY: 0.0,
      browAngle: 0.0,
      headX: 0.0,
      headY: 0.0,
      bodyX: 0.0,
      floatScale: 1.0
    }
  };

  const RUNTIME_EMOTION_EXPRESSION_TUNING = {
    happy: {
      pulseBoost: 0.72,
      pulseDurationMs: 420,
      holdMs: 1900,
      weight: 1.18
    },
    sad: {
      pulseBoost: 1.02,
      pulseDurationMs: 680,
      holdMs: 2600,
      weight: 1.42
    },
    angry: {
      pulseBoost: 0.7,
      pulseDurationMs: 400,
      holdMs: 1800,
      weight: 1.16
    },
    surprised: {
      pulseBoost: 1.12,
      pulseDurationMs: 560,
      holdMs: 2100,
      weight: 1.42
    },
    idle: {
      pulseBoost: 0.36,
      pulseDurationMs: 240,
      holdMs: 900,
      weight: 1.0
    }
  };

  function getStyleExpressionProfile(style) {
    const key = String(style || "neutral").trim().toLowerCase();
    return STYLE_EXPRESSION_PROFILE[key] || STYLE_EXPRESSION_PROFILE.neutral;
  }

  function getRuntimeEmotionExpressionTuning(mood) {
    const key = String(mood || "idle");
    return RUNTIME_EMOTION_EXPRESSION_TUNING[key] || RUNTIME_EMOTION_EXPRESSION_TUNING.idle;
  }

  const api = {
    STYLE_EXPRESSION_PROFILE,
    RUNTIME_EMOTION_EXPRESSION_TUNING,
    getStyleExpressionProfile,
    getRuntimeEmotionExpressionTuning
  };

  root.TaffyLive2DExpressionTuning = api;

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
}(typeof globalThis !== "undefined" ? globalThis : window));
