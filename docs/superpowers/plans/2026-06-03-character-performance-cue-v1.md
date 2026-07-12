# Character Performance Cue v1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a unified frontend performance cue layer so assistant runtime emotion/action/voice metadata and safe text fallback drive Live2D body motion, expression, and TTS delivery together.

**Architecture:** Add a pure renderer-side cue controller that turns `character_runtime` metadata, reply cue fallback, visible reply text, and current mood into one clamped `performanceCue`. Feed that cue into the existing chat reply pipeline, existing performance/voice timeline inputs, and the existing `beginSpeechAnimation` TTS entrypoint. Keep all current metadata fields optional and preserve old behavior when the cue controller is missing.

**Tech Stack:** Electron renderer JavaScript, existing `window.Taffy*Controller` globals, Node frontend tests, current Live2D/TTS controllers.

---

## Scope

This plan only ships `character-performance-cue-v1`: exaggerated but recoverable reply performance using current Live2D resources. It does not change backend LLM prompting, memory selection, auto conversation policy, model files, TTS assets, or private config.

## Files

- Create: `web/performanceCueController.js`
  - Pure helper. Builds one `performanceCue` object from runtime metadata, visible reply text, mood, talk style, and reply cue fallback.
- Create: `tests/test_performance_cue_frontend.js`
  - Node tests for cue normalization and source wiring.
- Modify: `scripts/run_node_tests.js`
  - Include the new frontend test in the existing Node test runner.
- Modify: `web/index.html`
  - Load `performanceCueController.js` before `performanceTimelineController.js`, `chatReplyController.js`, and `chat.js`.
- Modify: `web/live2dExpressionController.js`
  - Accept `opts.performanceCue` in `beginSpeechAnimation`, store clamped speech/body/expression tuning, and clear it safely after speech.
- Modify: `web/ttsPlaybackController.js`
  - Carry `opts.performanceCue` into all browser and server audio `beginSpeechAnimation` calls.
- Modify: `web/chat.js`
  - Expose cue builder and Live2D cue applier through `createChatReplyControllerDeps`.
- Modify: `web/chatReplyController.js`
  - Build the cue once per visible assistant reply, use cue-derived mood/style for timelines and TTS, and audit the cue.

## Cue Contract

`performanceCue` is internal renderer state. It must never be appended to visible reply text, TTS text, memory text, or user-facing debug cards except as compact audit fields.

```js
{
  version: 1,
  source: "runtime" | "reply_cue" | "text_fallback" | "default",
  emotion: "neutral" | "happy" | "playful" | "sad" | "anxious" | "angry" | "surprised" | "thinking",
  live2dMood: "idle" | "happy" | "sad" | "angry" | "surprised" | "thinking",
  action: "none" | "nod" | "think" | "happy_idle" | "wave" | "shake_head" | "surprised",
  intensity: "low" | "medium" | "high",
  talkStyle: "neutral" | "playful" | "comfort" | "steady" | "clear",
  voiceStyle: "neutral" | "soft" | "cheerful" | "teasing" | "serious" | "curious" | "warm",
  speech: {
    motionStrength: 1.48,
    bodyBoost: 1,
    beatBoost: 1,
    expressionBoost: 1,
    holdMs: 900,
    pulseBoost: 0.28,
    pulseMs: 220
  },
  timeline: {
    mood: "happy",
    style: "playful",
    gestureProfile: "bright"
  }
}
```

### Emotion Mapping

| Input emotion | Live2D mood | Default talk style | Performance feel |
| --- | --- | --- | --- |
| `neutral` | `idle` | `neutral` | Low body sway, natural blink, small mouth/body linkage |
| `happy` | `happy` | `playful` | Bright face, stronger body bounce, quicker beat impulse |
| `playful` | `happy` | `playful` | More exaggerated happy with teasing timing |
| `sad` | `sad` | `comfort` | Lower energy, slower hold, less beat bounce |
| `anxious` | `sad` | `comfort` | Small close delivery, lowered body range, nervous expression hold |
| `angry` | `angry` | `steady` | Sharp expression, firmer body motion, controlled intensity |
| `surprised` | `surprised` | `clear` | Quick pop, stronger pulse, short expressive beat |
| `thinking` | `thinking` | `clear` | Head/body thought rhythm, slower delivery, curious lift |

---

### Task 1: Pure Performance Cue Controller

**Files:**
- Create: `tests/test_performance_cue_frontend.js`
- Create: `web/performanceCueController.js`

- [x] **Step 1: Write failing cue tests**

Create `tests/test_performance_cue_frontend.js` with this full content:

```js
#!/usr/bin/env node
"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");

const PERFORMANCE_CUE_JS = path.resolve(__dirname, "..", "web", "performanceCueController.js");
const INDEX_HTML = path.resolve(__dirname, "..", "web", "index.html");
const CHAT_JS = path.resolve(__dirname, "..", "web", "chat.js");
const CHAT_REPLY_CONTROLLER_JS = path.resolve(__dirname, "..", "web", "chatReplyController.js");
const LIVE2D_EXPRESSION_CONTROLLER_JS = path.resolve(__dirname, "..", "web", "live2dExpressionController.js");
const TTS_PLAYBACK_CONTROLLER_JS = path.resolve(__dirname, "..", "web", "ttsPlaybackController.js");

const cueController = require(PERFORMANCE_CUE_JS);

assert.strictEqual(typeof cueController.buildPerformanceCue, "function");
assert.strictEqual(typeof cueController.normalizePerformanceCueEmotion, "function");
assert.strictEqual(typeof cueController.normalizePerformanceCueIntensity, "function");

{
  const cue = cueController.buildPerformanceCue({
    replyText: "太好了！",
    mood: "idle",
    talkStyle: "neutral",
    runtimeMetadata: {
      emotion: "happy",
      action: "wave",
      intensity: "high",
      voice_style: "cheerful"
    }
  });
  assert.strictEqual(cue.source, "runtime");
  assert.strictEqual(cue.emotion, "happy");
  assert.strictEqual(cue.live2dMood, "happy");
  assert.strictEqual(cue.action, "wave");
  assert.strictEqual(cue.intensity, "high");
  assert.strictEqual(cue.talkStyle, "playful");
  assert.strictEqual(cue.voiceStyle, "cheerful");
  assert.ok(cue.speech.motionStrength > 1.55);
  assert.ok(cue.speech.beatBoost > 1);
}

{
  const cue = cueController.buildPerformanceCue({
    replyText: "欸？真的假的？！",
    mood: "idle",
    talkStyle: "neutral",
    runtimeMetadata: null
  });
  assert.strictEqual(cue.source, "text_fallback");
  assert.strictEqual(cue.emotion, "surprised");
  assert.strictEqual(cue.live2dMood, "surprised");
  assert.strictEqual(cue.talkStyle, "clear");
  assert.ok(cue.speech.pulseBoost >= 0.34);
}

{
  const cue = cueController.buildPerformanceCue({
    replyText: "我先想一下……",
    mood: "thinking",
    talkStyle: "neutral",
    replyCue: {
      speechStyle: "clear",
      voiceStyle: "curious"
    }
  });
  assert.strictEqual(cue.source, "reply_cue");
  assert.strictEqual(cue.emotion, "thinking");
  assert.strictEqual(cue.live2dMood, "thinking");
  assert.strictEqual(cue.voiceStyle, "curious");
}

{
  const emotions = ["neutral", "happy", "playful", "sad", "anxious", "angry", "surprised", "thinking"];
  for (const emotion of emotions) {
    const cue = cueController.buildPerformanceCue({
      replyText: "测试",
      mood: "idle",
      talkStyle: "neutral",
      runtimeMetadata: { emotion, intensity: "medium", action: "unknown-action" }
    });
    assert.strictEqual(cue.emotion, emotion);
    assert.ok(cue.live2dMood);
    assert.strictEqual(cue.action, "none");
    assert.ok(cue.speech.motionStrength >= 0.7);
    assert.ok(cue.speech.motionStrength <= 2.2);
  }
}

{
  assert.strictEqual(cueController.normalizePerformanceCueEmotion("joy"), "happy");
  assert.strictEqual(cueController.normalizePerformanceCueEmotion("curious"), "thinking");
  assert.strictEqual(cueController.normalizePerformanceCueEmotion("bad-value"), "neutral");
  assert.strictEqual(cueController.normalizePerformanceCueIntensity("strong"), "high");
  assert.strictEqual(cueController.normalizePerformanceCueIntensity(0.2), "low");
}

if (fs.existsSync(INDEX_HTML)) {
  const indexSource = fs.readFileSync(INDEX_HTML, "utf8");
  const perfCueScript = '<script src="./performanceCueController.js"></script>';
  const timelineScript = '<script src="./performanceTimelineController.js"></script>';
  assert.ok(indexSource.includes(perfCueScript), "index should load performance cue controller");
  assert.ok(
    indexSource.indexOf(perfCueScript) < indexSource.indexOf(timelineScript),
    "performance cue controller should load before performance timeline"
  );
}

if (fs.existsSync(CHAT_JS)) {
  const source = fs.readFileSync(CHAT_JS, "utf8");
  assert.ok(source.includes("const PERFORMANCE_CUE_CONTROLLER = window.TaffyPerformanceCueController"), "chat.js should reference the cue controller global");
  assert.ok(source.includes("function buildPerformanceCue("), "chat.js should expose buildPerformanceCue wrapper");
  assert.ok(source.includes("function applySpeechPerformanceCue("), "chat.js should expose Live2D cue wrapper");
}

if (fs.existsSync(CHAT_REPLY_CONTROLLER_JS)) {
  const source = fs.readFileSync(CHAT_REPLY_CONTROLLER_JS, "utf8");
  assert.ok(source.includes("const buildPerformanceCue ="), "chat reply controller should accept cue builder dependency");
  assert.ok(source.includes("const performanceCue = buildPerformanceCue({"), "chat reply controller should build a cue for each visible reply");
  assert.ok(source.includes('recordPerformanceAuditEvent("performance_cue"'), "chat reply controller should audit the cue");
  assert.ok(source.includes("performanceCue: performanceCue || null"), "chat reply controller should pass the cue into speech");
}

if (fs.existsSync(LIVE2D_EXPRESSION_CONTROLLER_JS)) {
  const source = fs.readFileSync(LIVE2D_EXPRESSION_CONTROLLER_JS, "utf8");
  assert.ok(source.includes("function applySpeechPerformanceCue("), "Live2D expression controller should expose cue application");
  assert.ok(source.includes("opts.performanceCue"), "beginSpeechAnimation should accept cue options");
}

if (fs.existsSync(TTS_PLAYBACK_CONTROLLER_JS)) {
  const source = fs.readFileSync(TTS_PLAYBACK_CONTROLLER_JS, "utf8");
  assert.ok(source.includes("performanceCue: opts.performanceCue || null"), "TTS playback should carry cue options");
  assert.ok(source.includes("performanceCue: speechPerformanceCue"), "audio playback should pass cue into beginSpeechAnimation");
}

console.log("Performance cue frontend checks passed.");
```

- [x] **Step 2: Run the new test and verify it fails**

Run: `node tests/test_performance_cue_frontend.js`

Expected: FAIL with a module load error for `web/performanceCueController.js`.

- [x] **Step 3: Create the pure cue controller**

Create `web/performanceCueController.js` with this full content:

```js
(function (root) {
  "use strict";

  const VALID_EMOTIONS = ["neutral", "happy", "playful", "sad", "anxious", "angry", "surprised", "thinking"];
  const VALID_ACTIONS = ["none", "nod", "think", "happy_idle", "wave", "shake_head", "surprised"];
  const VALID_VOICE_STYLES = ["neutral", "soft", "cheerful", "teasing", "serious", "curious", "warm"];
  const VALID_TALK_STYLES = ["neutral", "playful", "comfort", "steady", "clear"];

  const EMOTION_PROFILES = {
    neutral: { live2dMood: "idle", talkStyle: "neutral", voiceStyle: "neutral", gestureProfile: "neutral", motionStrength: 1.22, bodyBoost: 1.0, beatBoost: 0.92, expressionBoost: 1.0, holdMs: 900, pulseBoost: 0.22, pulseMs: 190 },
    happy: { live2dMood: "happy", talkStyle: "playful", voiceStyle: "cheerful", gestureProfile: "bright", motionStrength: 1.64, bodyBoost: 1.14, beatBoost: 1.22, expressionBoost: 1.12, holdMs: 1150, pulseBoost: 0.34, pulseMs: 220 },
    playful: { live2dMood: "happy", talkStyle: "playful", voiceStyle: "teasing", gestureProfile: "bright", motionStrength: 1.82, bodyBoost: 1.22, beatBoost: 1.32, expressionBoost: 1.18, holdMs: 1200, pulseBoost: 0.38, pulseMs: 230 },
    sad: { live2dMood: "sad", talkStyle: "comfort", voiceStyle: "soft", gestureProfile: "soft", motionStrength: 0.98, bodyBoost: 0.78, beatBoost: 0.68, expressionBoost: 1.08, holdMs: 1500, pulseBoost: 0.2, pulseMs: 260 },
    anxious: { live2dMood: "sad", talkStyle: "comfort", voiceStyle: "soft", gestureProfile: "soft", motionStrength: 1.06, bodyBoost: 0.84, beatBoost: 0.78, expressionBoost: 1.14, holdMs: 1450, pulseBoost: 0.24, pulseMs: 230 },
    angry: { live2dMood: "angry", talkStyle: "steady", voiceStyle: "serious", gestureProfile: "steady", motionStrength: 1.5, bodyBoost: 1.08, beatBoost: 1.08, expressionBoost: 1.2, holdMs: 1250, pulseBoost: 0.32, pulseMs: 190 },
    surprised: { live2dMood: "surprised", talkStyle: "clear", voiceStyle: "curious", gestureProfile: "bright", motionStrength: 1.74, bodyBoost: 1.18, beatBoost: 1.28, expressionBoost: 1.24, holdMs: 1050, pulseBoost: 0.4, pulseMs: 210 },
    thinking: { live2dMood: "thinking", talkStyle: "clear", voiceStyle: "curious", gestureProfile: "curious", motionStrength: 1.34, bodyBoost: 0.96, beatBoost: 0.9, expressionBoost: 1.1, holdMs: 1300, pulseBoost: 0.26, pulseMs: 240 }
  };

  const INTENSITY_SCALE = {
    low: 0.84,
    medium: 1,
    high: 1.16
  };

  function clampNumber(value, fallback, min, max) {
    const numeric = Number(value);
    const safe = Number.isFinite(numeric) ? numeric : fallback;
    return Math.max(min, Math.min(max, safe));
  }

  function clean(value, fallback = "") {
    const text = String(value == null ? "" : value).trim();
    return text || fallback;
  }

  function key(value) {
    return clean(value).toLowerCase().replace(/-/g, "_").replace(/\s+/g, "_");
  }

  function normalizePerformanceCueEmotion(value) {
    const raw = key(value);
    const aliases = {
      idle: "neutral",
      joy: "happy",
      cheerful: "happy",
      teasing: "playful",
      worry: "anxious",
      worried: "anxious",
      nervous: "anxious",
      curious: "thinking",
      thoughtful: "thinking",
      think: "thinking",
      surprise: "surprised"
    };
    const normalized = aliases[raw] || raw;
    return VALID_EMOTIONS.includes(normalized) ? normalized : "neutral";
  }

  function normalizePerformanceCueIntensity(value) {
    if (typeof value === "number") {
      if (value >= 0.72) return "high";
      if (value <= 0.34) return "low";
      return "medium";
    }
    const raw = key(value);
    if (["high", "strong", "large", "big", "excited", "intense"].includes(raw)) return "high";
    if (["low", "soft", "small", "subtle", "calm"].includes(raw)) return "low";
    return "medium";
  }

  function normalizeAction(value) {
    const raw = key(value || "none");
    return VALID_ACTIONS.includes(raw) ? raw : "none";
  }

  function normalizeVoiceStyle(value, fallback) {
    const raw = key(value || fallback || "neutral");
    return VALID_VOICE_STYLES.includes(raw) ? raw : fallback || "neutral";
  }

  function normalizeTalkStyle(value, fallback) {
    const raw = key(value || fallback || "neutral");
    return VALID_TALK_STYLES.includes(raw) ? raw : fallback || "neutral";
  }

  function inferEmotionFromText(text, mood) {
    const source = clean(text);
    const moodEmotion = normalizePerformanceCueEmotion(mood);
    if (moodEmotion !== "neutral") return moodEmotion;
    if (!source) return "neutral";
    if (/[？?].*[！!]|[！!].*[？?]|真的假的|真的吗|不会吧|欸/.test(source)) return "surprised";
    if (/哈哈|开心|太好了|好耶|nice|great/i.test(source)) return "happy";
    if (/嘿嘿|逗你|开玩笑|哼哼/.test(source)) return "playful";
    if (/担心|焦虑|不太妙|糟糕/.test(source)) return "anxious";
    if (/难过|抱歉|对不起|遗憾/.test(source)) return "sad";
    if (/生气|别这样|不行|过分/.test(source)) return "angry";
    if (/想一下|我看看|让我想|分析一下|maybe|think/i.test(source)) return "thinking";
    return "neutral";
  }

  function buildPerformanceCue(input = {}) {
    const runtime = input.runtimeMetadata && typeof input.runtimeMetadata === "object" && !Array.isArray(input.runtimeMetadata)
      ? input.runtimeMetadata
      : null;
    const replyCue = input.replyCue && typeof input.replyCue === "object" && !Array.isArray(input.replyCue)
      ? input.replyCue
      : null;
    const runtimeEmotionRaw = runtime && runtime.emotion != null ? clean(runtime.emotion) : "";
    const runtimeEmotion = runtimeEmotionRaw ? normalizePerformanceCueEmotion(runtimeEmotionRaw) : "";
    const fallbackEmotion = inferEmotionFromText(input.replyText, input.mood);
    const replyCueHasSignal = !!(replyCue && (replyCue.speechStyle || replyCue.voiceStyle));
    const emotion = runtimeEmotion || fallbackEmotion;
    const profile = EMOTION_PROFILES[emotion] || EMOTION_PROFILES.neutral;
    const source = runtimeEmotionRaw
      ? "runtime"
      : replyCueHasSignal
        ? "reply_cue"
        : fallbackEmotion !== "neutral"
          ? "text_fallback"
          : "default";
    const intensity = normalizePerformanceCueIntensity(runtime?.intensity || input.intensity || "medium");
    const scale = INTENSITY_SCALE[intensity] || 1;
    const voiceStyle = normalizeVoiceStyle(runtime?.voice_style || replyCue?.voiceStyle || profile.voiceStyle, profile.voiceStyle);
    const talkStyle = normalizeTalkStyle(
      runtime?.voice_style ? profile.talkStyle : (replyCue?.speechStyle || input.talkStyle || profile.talkStyle),
      profile.talkStyle
    );
    const motionStrength = clampNumber(profile.motionStrength * scale, 1.48, 0.7, 2.2);
    return {
      version: 1,
      source,
      emotion,
      live2dMood: profile.live2dMood,
      action: normalizeAction(runtime?.action || input.action || "none"),
      intensity,
      talkStyle,
      voiceStyle,
      speech: {
        motionStrength: Number(motionStrength.toFixed(2)),
        bodyBoost: Number(clampNumber(profile.bodyBoost * scale, 1, 0.65, 1.45).toFixed(2)),
        beatBoost: Number(clampNumber(profile.beatBoost * scale, 1, 0.55, 1.55).toFixed(2)),
        expressionBoost: Number(clampNumber(profile.expressionBoost * scale, 1, 0.75, 1.45).toFixed(2)),
        holdMs: Math.round(clampNumber(profile.holdMs * scale, 900, 500, 2200)),
        pulseBoost: Number(clampNumber(profile.pulseBoost * scale, 0.28, 0.12, 0.62).toFixed(2)),
        pulseMs: Math.round(clampNumber(profile.pulseMs, 220, 120, 480))
      },
      timeline: {
        mood: profile.live2dMood,
        style: talkStyle,
        gestureProfile: profile.gestureProfile
      }
    };
  }

  const api = {
    EMOTION_PROFILES,
    buildPerformanceCue,
    normalizePerformanceCueEmotion,
    normalizePerformanceCueIntensity
  };

  root.TaffyPerformanceCueController = api;
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof window !== "undefined" ? window : globalThis);
```

- [x] **Step 4: Run the new test and verify pure cue behavior passes**

Run: `node tests/test_performance_cue_frontend.js`

Expected: FAIL only on source wiring assertions for `web/index.html`, `web/chat.js`, `web/chatReplyController.js`, `web/live2dExpressionController.js`, or `web/ttsPlaybackController.js`. Pure cue assertions must pass before moving on.

---

### Task 2: Register Script And Test Runner

**Files:**
- Modify: `web/index.html`
- Modify: `scripts/run_node_tests.js`

- [x] **Step 1: Load the cue controller before timeline code**

In `web/index.html`, replace this block:

```html
  <script src="./performanceAuditController.js"></script>
  <script src="./performanceTimelineController.js"></script>
```

with:

```html
  <script src="./performanceAuditController.js"></script>
  <script src="./performanceCueController.js"></script>
  <script src="./performanceTimelineController.js"></script>
```

- [x] **Step 2: Add the new test to the Node runner**

In `scripts/run_node_tests.js`, replace:

```js
  "tests/test_character_runtime_frontend.js",
  "tests/test_chat_api_frontend.js",
```

with:

```js
  "tests/test_character_runtime_frontend.js",
  "tests/test_performance_cue_frontend.js",
  "tests/test_chat_api_frontend.js",
```

- [x] **Step 3: Run the targeted test again**

Run: `node tests/test_performance_cue_frontend.js`

Expected: FAIL only on source wiring assertions that depend on chat, Live2D, or TTS changes.

---

### Task 3: Live2D Speech Cue State

**Files:**
- Modify: `web/live2dExpressionController.js`

- [x] **Step 1: Add cue normalization helpers near `estimateSpeechAnimationDurationMs`**

Insert this code after `estimateSpeechAnimationDurationMs`:

```js
    function normalizeSpeechPerformanceCue(cue = null) {
      if (!cue || typeof cue !== "object" || Array.isArray(cue)) {
        return null;
      }
      const speech = cue.speech && typeof cue.speech === "object" && !Array.isArray(cue.speech)
        ? cue.speech
        : {};
      return {
        version: 1,
        emotion: String(cue.emotion || "neutral"),
        live2dMood: String(cue.live2dMood || cue.timeline?.mood || "idle"),
        intensity: String(cue.intensity || "medium"),
        motionStrength: clampNumber(Number(speech.motionStrength) || 1.48, 0.7, 2.2),
        bodyBoost: clampNumber(Number(speech.bodyBoost) || 1, 0.65, 1.45),
        beatBoost: clampNumber(Number(speech.beatBoost) || 1, 0.55, 1.55),
        expressionBoost: clampNumber(Number(speech.expressionBoost) || 1, 0.75, 1.45),
        holdMs: Math.max(500, Math.min(2200, Math.round(Number(speech.holdMs) || 900))),
        pulseBoost: clampNumber(Number(speech.pulseBoost) || 0.28, 0.12, 0.62),
        pulseMs: Math.max(120, Math.min(480, Math.round(Number(speech.pulseMs) || 220)))
      };
    }

    function applySpeechPerformanceCue(cue = null) {
      const normalized = normalizeSpeechPerformanceCue(cue);
      if (!normalized) {
        state.speechPerformanceCue = null;
        state.speechPerformanceCueUntil = 0;
        return null;
      }
      const now = performance.now();
      state.speechPerformanceCue = normalized;
      state.speechPerformanceCueUntil = now + normalized.holdMs + 900;
      state.speechMotionStrength = normalized.motionStrength;
      state.moodHoldUntil = Math.max(Number(state.moodHoldUntil || 0), now + normalized.holdMs);
      state.moodExpressionWeight = clampNumber(
        Math.max(Number(state.moodExpressionWeight || 0), 0.42 * normalized.expressionBoost),
        0,
        1
      );
      if (normalized.pulseBoost > 0) {
        triggerExpressionPulse(normalized.live2dMood || normalized.emotion || "neutral", normalized.pulseBoost, normalized.pulseMs);
      }
      return normalized;
    }

    function getActiveSpeechPerformanceCue(now = performance.now()) {
      const cue = state.speechPerformanceCue && typeof state.speechPerformanceCue === "object"
        ? state.speechPerformanceCue
        : null;
      if (!cue || now > Number(state.speechPerformanceCueUntil || 0)) {
        return null;
      }
      return cue;
    }

    function clearSpeechPerformanceCue() {
      state.speechPerformanceCue = null;
      state.speechPerformanceCueUntil = 0;
    }
```

- [x] **Step 2: Apply cue in `beginSpeechAnimation`**

Inside `beginSpeechAnimation`, after:

```js
      state.speechAnimStyle = normalizeTalkStyle(style || state.currentTalkStyle || "neutral");
      state.speechAnimMood = String(mood || detectMood(cleaned) || "idle");
```

insert:

```js
      const speechPerformanceCue = applySpeechPerformanceCue(opts.performanceCue || null);
      if (speechPerformanceCue?.live2dMood) {
        state.speechAnimMood = speechPerformanceCue.live2dMood;
      }
```

- [x] **Step 3: Clear cue on hard speech end**

Inside `endSpeechAnimation`, after:

```js
      state.moodHoldUntil = performance.now() + 1500;
```

insert:

```js
      clearSpeechPerformanceCue();
```

- [x] **Step 4: Use cue boost in micro motion**

Inside `updateMicroMotionLayer`, after `const speechMotionStrength = ...`, insert:

```js
      const speechPerformanceCue = getActiveSpeechPerformanceCue(now);
      const speechCueBodyBoost = speechPerformanceCue ? speechPerformanceCue.bodyBoost : 1;
      const speechCueBeatBoost = speechPerformanceCue ? speechPerformanceCue.beatBoost : 1;
      const speechCueExpressionBoost = speechPerformanceCue ? speechPerformanceCue.expressionBoost : 1;
```

Then replace:

```js
      const speechMotionBoost = 0.82 + speechMotionStrength * 0.28;
```

with:

```js
      const speechMotionBoost = clampNumber((0.82 + speechMotionStrength * 0.28) * speechCueBodyBoost, 0.6, 2.4);
```

Then replace:

```js
      const beatSoftCap = 0.32 + motionBlend * 0.5;
```

with:

```js
      const beatSoftCap = clampNumber((0.32 + motionBlend * 0.5) * speechCueBeatBoost, 0.18, 1.15);
```

Then replace:

```js
      const moodGain = 0.85 + motionBlend * 0.15;
```

with:

```js
      const moodGain = clampNumber((0.85 + motionBlend * 0.15) * speechCueExpressionBoost, 0.65, 1.4);
```

- [x] **Step 5: Export the Live2D cue functions**

In the return object near the end of `web/live2dExpressionController.js`, add:

```js
      applySpeechPerformanceCue,
      clearSpeechPerformanceCue,
```

directly after `beginSpeechAnimation,`.

- [x] **Step 6: Run the targeted test**

Run: `node tests/test_performance_cue_frontend.js`

Expected: FAIL only on chat/TTS source wiring assertions.

---

### Task 4: Carry Cue Through TTS Playback

**Files:**
- Modify: `web/ttsPlaybackController.js`

- [x] **Step 1: Store cue in browser TTS options**

Inside `speakOnceWithVoice`, after:

```js
        const prosodyStyle = opts.voiceStyle || speechStyle;
```

insert:

```js
        const speechPerformanceCue = opts.performanceCue && typeof opts.performanceCue === "object"
          ? opts.performanceCue
          : null;
```

Replace:

```js
          beginSpeechAnimation(cleaned, speechMood, speechStyle);
```

with:

```js
          beginSpeechAnimation(cleaned, speechMood, speechStyle, {
            performanceCue: speechPerformanceCue
          });
```

- [x] **Step 2: Pass cue from `speakByBrowser` into each utterance**

In `browserTTSOptions`, replace:

```js
        voiceStyle: opts.voiceStyle || ""
```

with:

```js
        voiceStyle: opts.voiceStyle || "",
        performanceCue: opts.performanceCue || null
```

- [x] **Step 3: Pass cue from HTML audio playback into speech animation**

Inside `playAudioBlob`, after:

```js
      const speechStyle = normalizeTalkStyle(opts.style || state.currentTalkStyle || "neutral");
```

insert:

```js
      const speechPerformanceCue = opts.performanceCue && typeof opts.performanceCue === "object"
        ? opts.performanceCue
        : null;
```

For each `beginSpeechAnimation(speechText, speechMood, speechStyle, { ... })` call in `playAudioBlob`, add this property inside the existing options object:

```js
            performanceCue: speechPerformanceCue,
```

When the existing object has only `durationMs`, the final shape must be:

```js
          beginSpeechAnimation(speechText, speechMood, speechStyle, {
            durationMs: Number.isFinite(Number(audio.duration)) && audio.duration > 0
              ? Math.round(audio.duration * 1000)
              : undefined,
            performanceCue: speechPerformanceCue
          });
```

- [x] **Step 4: Pass cue from server TTS into `playAudioBlob`**

Inside `speakByServer`, in the `playAudioBlob(blob, { ... })` options, replace:

```js
          style: opts.style || state.currentTalkStyle || "neutral",
```

with:

```js
          style: opts.style || state.currentTalkStyle || "neutral",
          performanceCue: opts.performanceCue || null,
```

- [x] **Step 5: Run the targeted test**

Run: `node tests/test_performance_cue_frontend.js`

Expected: FAIL only on chat source wiring assertions.

---

### Task 5: Chat Boundary And Reply Wiring

**Files:**
- Modify: `web/chat.js`
- Modify: `web/chatReplyController.js`

- [x] **Step 1: Add the cue controller global in `web/chat.js`**

Near the existing controller globals in `web/chat.js`, add:

```js
const PERFORMANCE_CUE_CONTROLLER = window.TaffyPerformanceCueController || {};
```

- [x] **Step 2: Add cue wrappers in `web/chat.js`**

After `applyStyleExpressionLayer`, add:

```js
function buildPerformanceCue(input = {}) {
  return typeof PERFORMANCE_CUE_CONTROLLER.buildPerformanceCue === "function"
    ? PERFORMANCE_CUE_CONTROLLER.buildPerformanceCue(input)
    : null;
}

function applySpeechPerformanceCue(cue = null) {
  const controller = getLive2DExpressionController();
  return typeof controller.applySpeechPerformanceCue === "function"
    ? controller.applySpeechPerformanceCue(cue)
    : null;
}
```

- [x] **Step 3: Pass wrappers into chat reply deps**

Inside `createChatReplyControllerDeps()`, after:

```js
    applyPerformanceControlsToRuntimeHint,
```

insert:

```js
    buildPerformanceCue,
    applySpeechPerformanceCue,
```

- [x] **Step 4: Accept cue deps in `web/chatReplyController.js`**

After:

```js
    const applyPerformanceControlsToRuntimeHint = typeof deps.applyPerformanceControlsToRuntimeHint === "function"
      ? deps.applyPerformanceControlsToRuntimeHint
      : (runtimeHint) => runtimeHint;
```

insert:

```js
    const buildPerformanceCue = typeof deps.buildPerformanceCue === "function"
      ? deps.buildPerformanceCue
      : (input) => (typeof root.TaffyPerformanceCueController?.buildPerformanceCue === "function"
          ? root.TaffyPerformanceCueController.buildPerformanceCue(input)
          : null);
    const applySpeechPerformanceCue = typeof deps.applySpeechPerformanceCue === "function"
      ? deps.applySpeechPerformanceCue
      : () => null;
```

- [x] **Step 5: Pass cue through segmented speech**

Inside `speakPrefetchedServerVoiceSegments`, in each `playAudioBlob(blob, { ... })` call, add:

```js
          performanceCue: context.performanceCue || null,
```

Inside `speakWithVoiceTimeline`, add this near the `voiceTimeline` declaration:

```js
      const performanceCue = context.performanceCue && typeof context.performanceCue === "object"
        ? context.performanceCue
        : null;
```

Then in each `speak(segmentText, { ... })` or `speak(text, { ... })` options object inside `speakWithVoiceTimeline`, add:

```js
          performanceCue,
```

- [x] **Step 6: Build one cue per visible reply**

In `requestAssistantReply`, replace the block from:

```js
        const runtimeVoiceStyle = normalizeRuntimeVoiceStyleForSpeech(characterRuntimeMetadataForReply?.voice_style);
        const finalTalkStyle = resolveRuntimeTalkStyleForSpeech(
          runtimeVoiceStyle,
          replyCueApply?.speechStyle || baseTalkStyle
        );
        const finalProsodyStyle = runtimeVoiceStyle || replyCueApply?.voiceStyle || finalTalkStyle;
        state.currentTalkStyle = finalTalkStyle;
        state.speechAnimMood = mood;
```

with:

```js
        const performanceCue = buildPerformanceCue({
          replyText: visibleReply,
          mood,
          talkStyle: baseTalkStyle,
          runtimeMetadata: characterRuntimeMetadataForReply,
          replyCue: replyCueApply,
          characterBrain: state.characterBrainLastDecision
        });
        const runtimeVoiceStyle = normalizeRuntimeVoiceStyleForSpeech(
          performanceCue?.voiceStyle || characterRuntimeMetadataForReply?.voice_style
        );
        const finalTalkStyle = performanceCue?.talkStyle || resolveRuntimeTalkStyleForSpeech(
          runtimeVoiceStyle,
          replyCueApply?.speechStyle || baseTalkStyle
        );
        const finalProsodyStyle = runtimeVoiceStyle || performanceCue?.voiceStyle || replyCueApply?.voiceStyle || finalTalkStyle;
        const timelineMood = performanceCue?.live2dMood || mood;
        state.currentTalkStyle = finalTalkStyle;
        state.speechAnimMood = timelineMood;
        applySpeechPerformanceCue(performanceCue);
        if (performanceCue) {
          recordPerformanceAuditEvent("performance_cue", {
            source: performanceCue.source,
            emotion: performanceCue.emotion,
            live2dMood: performanceCue.live2dMood,
            action: performanceCue.action,
            intensity: performanceCue.intensity,
            talkStyle: performanceCue.talkStyle,
            voiceStyle: performanceCue.voiceStyle,
            motionStrength: performanceCue.speech?.motionStrength
          });
        }
```

- [x] **Step 7: Use cue mood/style for timelines**

In the `buildPerformanceTimeline({ ... })` input, replace:

```js
          mood,
          talkStyle: finalTalkStyle,
```

with:

```js
          mood: timelineMood,
          talkStyle: finalTalkStyle,
          performanceCue,
```

In the `buildVoiceTimeline({ ... })` input, replace:

```js
          mood,
          talkStyle: finalTalkStyle,
```

with:

```js
          mood: timelineMood,
          talkStyle: finalTalkStyle,
          performanceCue,
```

In `timelineContext`, replace:

```js
          mood,
          style: finalTalkStyle,
```

with:

```js
          mood: timelineMood,
          style: finalTalkStyle,
          performanceCue,
```

- [x] **Step 8: Pass cue into stream and direct speech calls**

In both `speakWithVoiceTimeline(..., { ... })` calls in `requestAssistantReply`, add:

```js
              performanceCue: performanceCue || null,
```

for the stream direct fallback call, and:

```js
            performanceCue: performanceCue || null,
```

for the direct call.

For `scheduleFinalSpeechWatchdog({ ... })`, replace:

```js
              mood,
```

with:

```js
              mood: timelineMood,
```

- [x] **Step 9: Run the targeted test**

Run: `node tests/test_performance_cue_frontend.js`

Expected: PASS with `Performance cue frontend checks passed.`

---

### Task 6: Regression Verification

**Files:**
- Read-only verification across changed frontend files.

- [x] **Step 1: Run the frontend Node test suite**

Run: `node scripts/run_node_tests.js`

Expected: all listed tests pass and output ends with `[OK] Node frontend tests complete.`

- [x] **Step 2: Run syntax checks for touched JavaScript**

Run:

```powershell
node --check web/performanceCueController.js
node --check web/live2dExpressionController.js
node --check web/ttsPlaybackController.js
node --check web/chat.js
node --check web/chatReplyController.js
node --check tests/test_performance_cue_frontend.js
```

Expected: each command exits 0 with no syntax error.

- [x] **Step 3: Run JSON checks required by the harness**

Run:

```powershell
python -m json.tool feature_list.json > $null
python -m json.tool package.json > $null
```

Expected: both commands exit 0.

- [x] **Step 4: Run diff whitespace check**

Run:

```powershell
git diff --check -- web/performanceCueController.js tests/test_performance_cue_frontend.js scripts/run_node_tests.js web/index.html web/live2dExpressionController.js web/ttsPlaybackController.js web/chat.js web/chatReplyController.js progress.md session-handoff.md
```

Expected: exits 0 with no whitespace errors.

- [x] **Step 5: Optional Electron smoke**

Executed with `node_modules\electron\dist\electron.exe --remote-debugging-port=9223 electron/main.js` for CDP inspection instead of the plain npm script.

Evidence:

- Backend `/config.json` became ready on `127.0.0.1:8123`.
- CDP found both `view=chat` and `view=model` pages on port `9223`.
- Model page reported `modelLoaded: true`, `ttsProvider: browser`, `speakingEnabled: true`.
- Triggered `speak("太好了！我们先这样！", { performanceCue })`; result returned `ok: true`.
- Happy/high cue applied during speech: `speechMotionStrength: 1.9`, `bodyBoost: 1.32`, `beatBoost: 1.42`, `expressionBoost: 1.3`, and `speechMotionBlend` peaked around `0.85`.
- Screenshot saved at `%USERPROFILE%\AppData\Local\Temp\ai_desktop_pet_smoke\character-performance-cue-model.png`.
- Electron was closed via CDP after smoke; 8123 and 9223 were no longer reachable.

Run: `npm run start:electron`

Manual checks:

1. Enable a TTS path that works on the machine.
2. Send `太好了！我们先这样！`
3. Confirm the model has visible face/body movement during speech, not only mouth movement.
4. Send `欸？真的假的？！`
5. Confirm the surprised response has a stronger pulse than neutral speech and then settles.
6. Send `我先想一下……`
7. Confirm thinking uses a calmer, curious rhythm.
8. Run `/ttsdebug` in the chat if available and confirm speech text does not contain metadata fields.

Expected: no renderer crash, no metadata spoken, old TTS fallback still speaks when server TTS is unavailable.

---

### Task 7: Harness State Update

**Files:**
- Modify: `progress.md`
- Modify: `session-handoff.md`

- [x] **Step 1: Update progress after implementation**

In `progress.md`, append a short entry under `## What Changed`:

```md
- Implemented `character-performance-cue-v1` frontend cue routing for Live2D speech/body/expression performance.
```

Under `## Verification Evidence`, append the exact commands run and their results from Task 6.

- [x] **Step 2: Update handoff**

In `session-handoff.md`, set the recommended next step to:

```md
Validate the character-performance cue in Electron with a working TTS provider, then decide whether to tune intensity values or move to `conversation-flow-v1`.
```

Also record any manual smoke limitation, for example:

```md
- Electron smoke was not run because TTS provider was unavailable in this session.
```

Only include the limitation line if it is true for that execution.

- [x] **Step 3: Run harness validation**

Run:

```powershell
node <codex-home>\skills\harness-creator\scripts\validate-harness.mjs --target <repo-root>
```

Expected: overall score remains `100/100`.

---

## Self-Review

- Spec coverage: runtime metadata wins when present; reply cue and text fallback keep old paths useful; all current emotions have profiles; body/expression/TTS are linked through `beginSpeechAnimation`; missing controller or missing cue returns old behavior.
- Placeholder scan: no deferred markers remain in this plan; every changed file has exact snippets or full file content.
- Type consistency: `performanceCue.speech.motionStrength`, `performanceCue.live2dMood`, `performanceCue.talkStyle`, and `performanceCue.voiceStyle` are created in Task 1 and used with the same names in later tasks.
- Safety: no backend metadata schema change; no new Live2D asset dependency; no private config or samples touched.

## Execution Notes

- Stage exact paths only. Do not use broad staging in this dirty worktree.
- If committing is approved, use exact-file staging:

```powershell
git add web/performanceCueController.js tests/test_performance_cue_frontend.js scripts/run_node_tests.js web/index.html web/live2dExpressionController.js web/ttsPlaybackController.js web/chat.js web/chatReplyController.js progress.md session-handoff.md
git commit -m "feat: add character performance cue routing"
```
