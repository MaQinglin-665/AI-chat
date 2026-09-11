# Hiyori All-Emotion Strong Expression Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Strengthen Hiyori's `happy`, `playful`, `surprised`, `sad`, `anxious`, and `neutral/idle` model reactions while preserving the recent smooth `angry` and readable `thinking` work.

**Architecture:** Extend the existing performance-cue pipeline instead of adding a new animation subsystem. Most work stays in `web/live2dExpressionController.js`, with regression coverage in `tests/test_performance_cue_frontend.js`; `surprised` may reuse the Hiyori overlay controller with one small head-adjacent symbol.

**Tech Stack:** Electron renderer JavaScript, Live2D/Pixi runtime parameters, Node-based frontend tests, Python/Pillow for deterministic small PNG overlay generation if the `surprised` symbol is added.

---

## File Map

- Modify: `tests/test_performance_cue_frontend.js`
  - Add reusable frame-sampling helpers for emotion strength and smoothness.
  - Add RED tests for `happy`, `playful`, `surprised`, `sad`, `anxious`, and `neutral/idle`.
  - Preserve existing `thinking` and `angry` regression coverage.
- Modify: `web/live2dExpressionController.js`
  - Strengthen per-emotion runtime accent branches.
  - Add smoother envelopes for `surprised`, `sad`, and `anxious`.
  - Improve neutral/idle micro-motion without increasing active cue jitter.
- Modify: `web/hiyoriEmotionOverlayController.js`
  - Add `surprised-spark` anchor only if Task 3 adds the small symbol overlay.
- Modify: `web/assets/live2d-overlays/hiyori/manifest.json`
  - Add `surprised` manifest entry only if Task 3 adds the small symbol overlay.
- Create: `web/assets/live2d-overlays/hiyori/surprised-spark.png`
  - Small transparent comic spark, no body part, no text.
- Modify: `progress.md`
  - Record the full-emotion strengthening result and visual evidence.
- Modify: `session-handoff.md`
  - Record touched files, test results, screenshot path, and remaining risks.

Do not touch model replacement assets, Cubism runtime files, LLM code, TTS code, API keys, private config, or user samples.

## Commit Policy

This workspace has a dirty tree. During execution, do not commit unless the user explicitly asks. If the user asks to commit, first run:

```powershell
git branch --show-current
git status --short
```

Abort any commit if the branch is `main` or if unrelated files would be staged.

---

### Task 1: Add Emotion Frame-Sampling Test Helpers

**Files:**
- Modify: `tests/test_performance_cue_frontend.js`

- [ ] **Step 1: Write the helper code near the first existing runtime-emotion test block**

Add this helper before the first test block that calls `beginSpeechAnimation(...)`:

```js
function createEmotionFrameSampler({ emotion, text, action = "none", style = "neutral", seed = 2.1 }) {
  let now = 1000;
  let frame = 0;
  const calls = [];
  const coreModel = {
    addParameterValueById(id, delta, weight) {
      calls.push({ frame, id, value: Number(delta) * Number(weight) });
    },
    setPartOpacityById(id, value) {
      calls.push({ frame, id, value: Number(value), part: true });
    }
  };
  const state = {
    expressionEnabled: true,
    model: { internalModel: { coreModel } },
    config: {},
    uiView: "model",
    currentTalkStyle: style,
    speechMouthOpen: 0,
    ttsAudioLevel: 0,
    microBreathSeed: seed,
    microNextBlinkAt: 999999,
    microNextGazeAt: 999999,
    microMotionLastAt: now - 16.6667,
    microGazeTargetX: 0,
    microGazeTargetY: 0,
    microGazeCurrentX: 0,
    microGazeCurrentY: 0,
    mouseGazeCurrentX: 0,
    mouseGazeCurrentY: 0
  };
  const controller = live2dExpressionController.createController({
    state,
    performanceObject: { now: () => now },
    isSpeechMotionActive: () => false,
    isSpeakingNow: () => false,
    sanitizeSpeakText: (value) => String(value || "").trim(),
    normalizeTalkStyle: (value) => String(value || "neutral").trim() || "neutral",
    detectMood: () => emotion,
    clampNumber: (value, min, max) => Math.max(min, Math.min(max, Number(value) || 0))
  });
  const cue = cueController.buildPerformanceCue({
    replyText: text,
    mood: emotion,
    talkStyle: style,
    runtimeMetadata: {
      emotion,
      action,
      intensity: "high"
    }
  });
  controller.beginSpeechAnimation(text, emotion, style, {
    durationMs: 2200,
    performanceCue: cue
  });
  function advanceFrames(count, stepMs = 33.333) {
    for (frame = 0; frame < count; frame += 1) {
      now += stepMs;
      controller.applyStyleExpressionLayer();
      controller.updateMicroMotionLayer();
    }
  }
  function weightedFrameValue(id, frameIndex) {
    return calls
      .filter((call) => call.id === id && call.frame === frameIndex && !call.part)
      .reduce((sum, call) => sum + call.value, 0);
  }
  function weightedMax(id) {
    return calls
      .filter((call) => call.id === id && !call.part)
      .reduce((max, call) => Math.max(max, Math.abs(call.value)), 0);
  }
  function weightedTotal(ids) {
    return ids.reduce(
      (sum, id) => sum + calls
        .filter((call) => call.id === id && !call.part)
        .reduce((inner, call) => inner + Math.abs(call.value), 0),
      0
    );
  }
  function maxFrameStep(id, frameCount = 36) {
    let maxStep = 0;
    for (let i = 1; i < frameCount; i += 1) {
      maxStep = Math.max(maxStep, Math.abs(weightedFrameValue(id, i) - weightedFrameValue(id, i - 1)));
    }
    return maxStep;
  }
  return { state, calls, cue, advanceFrames, weightedMax, weightedTotal, maxFrameStep };
}
```

- [ ] **Step 2: Run the existing targeted test to prove helper insertion is behavior-neutral**

Run:

```powershell
node tests\test_performance_cue_frontend.js
```

Expected: pass. If it fails, fix only syntax or placement errors in the helper before continuing.

---

### Task 2: Strengthen Happy and Playful Without Jitter

**Files:**
- Modify: `tests/test_performance_cue_frontend.js`
- Modify: `web/live2dExpressionController.js`

- [ ] **Step 1: Write RED tests for high `happy` and high `playful`**

Add this block after the existing high-happy cue test:

```js
{
  const happy = createEmotionFrameSampler({
    emotion: "happy",
    text: "太好了！这个结果我很喜欢！",
    action: "wave",
    style: "playful",
    seed: 1.3
  });
  happy.advanceFrames(36);
  assert.ok(
    happy.weightedTotal(["ParamBodyAngleY", "ParamShoulder", "ParamArmLA", "ParamArmRA", "ParamHandL", "ParamHandR"]) >= 64,
    "high happy should have stronger readable body, shoulder, arm, and hand motion"
  );
  assert.ok(
    happy.maxFrameStep("ParamAngleZ") <= 3.4 && happy.maxFrameStep("ParamBodyAngleZ") <= 3.6,
    "high happy should stay energetic without twitchy head/body frame jumps"
  );

  const playful = createEmotionFrameSampler({
    emotion: "playful",
    text: "嘿嘿，这里我有个小想法。",
    action: "wave",
    style: "playful",
    seed: 1.9
  });
  playful.advanceFrames(36);
  assert.ok(
    playful.weightedMax("ParamAngleX") >= 1.6 || playful.weightedMax("ParamEyeBallX") >= 0.32,
    "high playful should add an asymmetric teasing accent beyond happy bounce"
  );
  assert.ok(
    playful.weightedTotal(["ParamBodyAngleY", "ParamShoulder", "ParamArmLA", "ParamArmRA", "ParamHandL", "ParamHandR"]) >= 70,
    "high playful should be at least as lively as high happy"
  );
  assert.ok(
    playful.maxFrameStep("ParamAngleZ") <= 3.6 && playful.maxFrameStep("ParamBodyAngleZ") <= 3.8,
    "high playful should avoid rapid model-body twitching"
  );
}
```

- [ ] **Step 2: Run RED test**

Run:

```powershell
node tests\test_performance_cue_frontend.js
```

Expected: fail on one of the new happy/playful strength assertions.

- [ ] **Step 3: Implement happy/playful strengthening**

In `web/live2dExpressionController.js`, inside `applySpeechPerformanceAccent(...)`, update the `happy` / `playful` branch. Replace the current branch body with this stronger but bounded version:

```js
      if (emotion === "happy" || emotion === "playful") {
        const playfulGain = emotion === "playful" ? 1.16 : 1;
        const tease = emotion === "playful" ? Math.sin(now / 310 + seed * 1.21) : 0;
        safeAddParamValue(core, "ParamEyeLSmile", 0.98 * poseGain, 0.96);
        safeAddParamValue(core, "ParamEyeRSmile", 0.98 * poseGain, 0.96);
        safeAddParamValue(core, "ParamMouthForm", 0.92 * poseGain, 0.82);
        safeAddParamValue(core, "ParamCheek", 0.7 * poseGain, 0.88);
        safeAddParamValue(core, "ParamBrowLY", 0.26 * poseGain, 0.82);
        safeAddParamValue(core, "ParamBrowRY", 0.26 * poseGain, 0.82);
        safeAddParamValue(core, "ParamBodyAngleY", (0.72 + bounce * 0.76 + attackPop * 0.42) * poseGain * playfulGain, 0.48);
        safeAddParamValue(core, "ParamShoulder", (0.42 + bounce * 0.34 + attackPop * 0.18) * poseGain * playfulGain, 0.62);
        safeAddParamValue(core, "ParamAngleX", tease * 1.35 * poseGain, 0.34);
        safeAddParamValue(core, "ParamEyeBallX", tease * 0.26 * poseGain, 0.32);
        safeAddParamValue(core, "ParamArmLA", (-1.95 + armWave * 0.52 - tease * 0.32) * poseGain * playfulGain, 0.48);
        safeAddParamValue(core, "ParamArmRA", (1.68 - armWave * 0.48 + tease * 0.26) * poseGain * playfulGain, 0.48);
        safeAddParamValue(core, "ParamArmLB", (1.32 + bounce * 0.82 + attackPop * 0.22) * poseGain * playfulGain, 0.4);
        safeAddParamValue(core, "ParamArmRB", (-1.12 - bounce * 0.66 - attackPop * 0.18) * poseGain * playfulGain, 0.4);
        safeAddParamValue(core, "ParamHandL", (0.92 + bounce * 0.48) * poseGain * playfulGain, 0.58);
        safeAddParamValue(core, "ParamHandR", (-0.74 - bounce * 0.4) * poseGain * playfulGain, 0.58);
```

- [ ] **Step 4: Run GREEN test**

Run:

```powershell
node tests\test_performance_cue_frontend.js
```

Expected: pass or fail only on thresholds that reveal the snippet needs small numeric adjustment. If thresholds need adjustment, change only the happy/playful branch or the new threshold that is objectively too strict after inspecting weighted values.

---

### Task 3: Strengthen Surprised With Pop/Recoil and Small Symbol

**Files:**
- Modify: `tests/test_performance_cue_frontend.js`
- Modify: `web/live2dExpressionController.js`
- Modify: `web/hiyoriEmotionOverlayController.js`
- Modify: `web/assets/live2d-overlays/hiyori/manifest.json`
- Create: `web/assets/live2d-overlays/hiyori/surprised-spark.png`

- [ ] **Step 1: Write RED tests for surprised pop and overlay**

Add this block after the happy/playful block:

```js
{
  const surprised = createEmotionFrameSampler({
    emotion: "surprised",
    text: "欸？真的假的？！",
    action: "surprised",
    style: "clear",
    seed: 1.5
  });
  surprised.advanceFrames(36);
  assert.ok(
    surprised.weightedMax("ParamEyeLOpen") >= 0.7 && surprised.weightedMax("ParamEyeROpen") >= 0.7,
    "high surprised should create a readable wide-eye reaction"
  );
  assert.ok(
    surprised.weightedMax("ParamBodyAngleX") + surprised.weightedMax("ParamAngleY") >= 5.2,
    "high surprised should create a readable pop/recoil body reaction"
  );
  assert.ok(
    surprised.maxFrameStep("ParamBodyAngleX") <= 3.8 && surprised.maxFrameStep("ParamAngleY") <= 3.8,
    "high surprised should rebound smoothly instead of twitching"
  );
}

{
  const manifest = JSON.parse(fs.readFileSync(HIYORI_OVERLAY_MANIFEST, "utf8"));
  assert.ok(Array.isArray(manifest.emotions?.surprised?.assets), "surprised overlay should define assets");
  assert.ok(
    manifest.emotions.surprised.assets.some((asset) => asset.id === "surprised-spark"),
    "surprised overlay should include the lightweight spark asset"
  );
}
```

Also update the existing cue-overlay unit test block so it verifies `surprised`:

```js
  shown = [];
  const surprisedCue = cueController.buildPerformanceCue({
    replyText: "欸？真的假的？！",
    mood: "surprised",
    runtimeMetadata: { emotion: "surprised", action: "surprised", intensity: "high" }
  });
  controller.applySpeechPerformanceCue(surprisedCue);
  assert.strictEqual(shown[0]?.emotion, "surprised", "high surprised cue should use the Hiyori lightweight overlay mechanism");
```

- [ ] **Step 2: Run RED test**

Run:

```powershell
node tests\test_performance_cue_frontend.js
```

Expected: fail on missing `surprised` overlay manifest or missing overlay dispatch.

- [ ] **Step 3: Generate deterministic `surprised-spark.png`**

Run this one-off local asset script:

```powershell
@'
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter

out = Path(r"D:\AI\ai_desktop_pet\web\assets\live2d-overlays\hiyori\surprised-spark.png")
out.parent.mkdir(parents=True, exist_ok=True)
scale = 4
w, h = 180 * scale, 160 * scale
img = Image.new("RGBA", (w, h), (0, 0, 0, 0))
d = ImageDraw.Draw(img)
yellow = (255, 205, 72, 245)
orange = (232, 126, 42, 230)
white = (255, 255, 255, 235)
shadow = (22, 40, 78, 80)
cx, cy = 90 * scale, 78 * scale
points = []
for i in range(12):
    radius = (52 if i % 2 == 0 else 22) * scale
    angle = -1.5708 + i * 3.14159 / 6
    points.append((cx + int(radius * __import__("math").cos(angle)), cy + int(radius * __import__("math").sin(angle))))
shadow_points = [(x + 3 * scale, y + 4 * scale) for x, y in points]
d.polygon(shadow_points, fill=shadow)
d.polygon(points, fill=white)
inner = [(cx + int((x - cx) * 0.72), cy + int((y - cy) * 0.72)) for x, y in points]
d.polygon(inner, fill=yellow)
for x1, y1, x2, y2 in [(28, 124, 66, 100), (118, 112, 154, 136), (122, 36, 160, 22)]:
    d.line((x1*scale, y1*scale, x2*scale, y2*scale), fill=white, width=9*scale)
    d.line((x1*scale, y1*scale, x2*scale, y2*scale), fill=orange, width=5*scale)
img = img.filter(ImageFilter.GaussianBlur(radius=0.08 * scale))
img = img.resize((w // scale, h // scale), Image.Resampling.LANCZOS)
img.save(out)
print(out)
'@ | python -
```

- [ ] **Step 4: Add surprised to overlay manifest and default anchors**

In `web/assets/live2d-overlays/hiyori/manifest.json`, add:

```json
    "surprised": {
      "durationMs": 1250,
      "entry": "pop",
      "assets": [
        {
          "id": "surprised-spark",
          "file": "surprised-spark.png",
          "placement": "mark surprised-spark"
        }
      ]
    }
```

In `web/hiyoriEmotionOverlayController.js`, update `DEFAULT_MANIFEST` with the same `surprised` entry and add this anchor:

```js
    "surprised-spark": { x: 0.65, y: 0.12, width: 0.13, minWidth: 52, maxWidth: 86 },
```

- [ ] **Step 5: Wire high surprised to Hiyori overlay**

In `web/live2dExpressionController.js`, update `maybeShowHiyoriEmotionOverlay(...)`:

```js
  if (!["thinking", "angry", "surprised"].includes(emotion) || normalized?.intensity !== "high") {
    return false;
  }
```

- [ ] **Step 6: Strengthen surprised model-body branch**

Replace the `surprised` branch in `applySpeechPerformanceAccent(...)` with:

```js
      } else if (emotion === "surprised") {
        const recoil = Math.sin(clampNumber(phaseAge / 420, 0, 1) * Math.PI);
        const settle = Math.sin(now / 260 + seed * 0.6) * 0.18;
        safeAddParamValue(core, "ParamEyeLOpen", 0.9 * poseGain, 0.94);
        safeAddParamValue(core, "ParamEyeROpen", 0.9 * poseGain, 0.94);
        safeAddParamValue(core, "ParamBrowLY", 0.72 * poseGain, 0.9);
        safeAddParamValue(core, "ParamBrowRY", 0.72 * poseGain, 0.9);
        safeAddParamValue(core, "ParamBrowLForm", 0.34 * poseGain, 0.78);
        safeAddParamValue(core, "ParamBrowRForm", 0.34 * poseGain, 0.78);
        safeAddParamValue(core, "ParamMouthForm", -0.56 * poseGain, 0.78);
        safeDriveParamValue(core, "ParamMouthOpenY", clampNumber(0.42 * poseGain, 0, 0.92), 0.76);
        safeAddParamValue(core, "ParamAngleY", (-2.8 * recoil + settle) * poseGain, 0.58);
        safeAddParamValue(core, "ParamBodyAngleX", (-3.4 * recoil + settle * 0.8) * poseGain, 0.58);
        safeAddParamValue(core, "ParamShoulder", (0.42 + recoil * 0.34) * poseGain, 0.5);
        safeAddParamValue(core, "ParamArmLA", (-1.55 - recoil * 0.7) * poseGain, 0.38);
        safeAddParamValue(core, "ParamArmRA", (1.55 + recoil * 0.7) * poseGain, 0.38);
        safeAddParamValue(core, "ParamArmLB", (0.82 + recoil * 0.44) * poseGain, 0.34);
        safeAddParamValue(core, "ParamArmRB", (-0.82 - recoil * 0.44) * poseGain, 0.34);
        safeAddParamValue(core, "ParamHandL", 0.58 * poseGain, 0.44);
        safeAddParamValue(core, "ParamHandR", -0.58 * poseGain, 0.44);
```

- [ ] **Step 7: Run GREEN checks**

Run:

```powershell
node tests\test_performance_cue_frontend.js
python -m json.tool web\assets\live2d-overlays\hiyori\manifest.json
```

Expected: both pass.

---

### Task 4: Strengthen Sad and Anxious Without Shake

**Files:**
- Modify: `tests/test_performance_cue_frontend.js`
- Modify: `web/live2dExpressionController.js`

- [ ] **Step 1: Write RED tests for sad/anxious**

Add this block after the surprised tests:

```js
{
  const sad = createEmotionFrameSampler({
    emotion: "sad",
    text: "有点难过，我先慢一点。",
    action: "none",
    style: "comfort",
    seed: 2.4
  });
  sad.advanceFrames(36);
  assert.ok(
    sad.weightedMax("ParamAngleY") + sad.weightedMax("ParamBodyAngleX") + sad.weightedMax("ParamShoulder") >= 3.2,
    "high sad should create a readable lowered and inward pose"
  );
  assert.ok(
    sad.maxFrameStep("ParamAngleY") <= 2.2 && sad.maxFrameStep("ParamBodyAngleX") <= 2.2,
    "high sad should stay slow and non-jittery"
  );

  const anxious = createEmotionFrameSampler({
    emotion: "anxious",
    text: "这个地方可能不太妙，我有点担心。",
    action: "none",
    style: "comfort",
    seed: 2.8
  });
  anxious.advanceFrames(36);
  assert.ok(
    anxious.weightedMax("ParamShoulder") + anxious.weightedMax("ParamArmLB") + anxious.weightedMax("ParamArmRB") >= 2.8,
    "high anxious should create readable tense shoulder and arm posture"
  );
  assert.ok(
    anxious.maxFrameStep("ParamAngleZ") <= 2.4 && anxious.maxFrameStep("ParamBodyAngleZ") <= 2.4,
    "high anxious should read as held tension rather than vibration"
  );
}
```

- [ ] **Step 2: Run RED test**

Run:

```powershell
node tests\test_performance_cue_frontend.js
```

Expected: fail on one of the sad/anxious strength assertions.

- [ ] **Step 3: Add sad/anxious runtime accent branches**

In `applySpeechPerformanceAccent(...)`, before the final `else if (isBright)` branch, add explicit branches:

```js
      } else if (emotion === "sad" || emotion === "anxious") {
        const anxiousGain = emotion === "anxious" ? 1.14 : 1;
        const slowTension = Math.sin(now / 360 + seed * 0.72);
        const inward = 0.62 + bounce * 0.22;
        safeAddParamValue(core, "ParamEyeLSmile", -0.24 * poseGain, 0.6);
        safeAddParamValue(core, "ParamEyeRSmile", -0.24 * poseGain, 0.6);
        safeAddParamValue(core, "ParamBrowLY", emotion === "sad" ? -0.48 * poseGain : -0.22 * poseGain, 0.72);
        safeAddParamValue(core, "ParamBrowRY", emotion === "sad" ? -0.48 * poseGain : -0.22 * poseGain, 0.72);
        safeAddParamValue(core, "ParamBrowLForm", -0.36 * poseGain, 0.62);
        safeAddParamValue(core, "ParamBrowRForm", -0.36 * poseGain, 0.62);
        safeAddParamValue(core, "ParamMouthForm", -0.52 * poseGain, 0.72);
        safeAddParamValue(core, "ParamEyeBallY", -0.18 * poseGain, 0.42);
        safeAddParamValue(core, "ParamAngleY", (emotion === "sad" ? 2.2 : 1.2) * poseGain, 0.42);
        safeAddParamValue(core, "ParamBodyAngleX", (-1.75 - inward * 0.7) * poseGain, 0.42);
        safeAddParamValue(core, "ParamShoulder", (emotion === "sad" ? -0.36 : 0.42 + Math.abs(slowTension) * 0.16) * poseGain * anxiousGain, 0.5);
        safeAddParamValue(core, "ParamArmLA", (-0.72 - inward * 0.36) * poseGain * anxiousGain, 0.34);
        safeAddParamValue(core, "ParamArmRA", (0.72 + inward * 0.36) * poseGain * anxiousGain, 0.34);
        safeAddParamValue(core, "ParamArmLB", (emotion === "anxious" ? 1.15 + Math.abs(slowTension) * 0.42 : 0.52) * poseGain, 0.34);
        safeAddParamValue(core, "ParamArmRB", (emotion === "anxious" ? -1.15 - Math.abs(slowTension) * 0.42 : -0.52) * poseGain, 0.34);
        safeAddParamValue(core, "ParamHandL", (emotion === "anxious" ? 0.54 + Math.abs(slowTension) * 0.24 : 0.18) * poseGain, 0.36);
        safeAddParamValue(core, "ParamHandR", (emotion === "anxious" ? -0.54 - Math.abs(slowTension) * 0.24 : -0.18) * poseGain, 0.36);
```

- [ ] **Step 4: Run GREEN test**

Run:

```powershell
node tests\test_performance_cue_frontend.js
```

Expected: pass.

---

### Task 5: Improve Neutral/Idle Life Without Raising Distraction

**Files:**
- Modify: `tests/test_performance_cue_frontend.js`
- Modify: `web/live2dExpressionController.js`

- [ ] **Step 1: Write RED test for idle/neutral separation**

Add this block after sad/anxious tests:

```js
{
  let now = 1000;
  const calls = [];
  const coreModel = {
    addParameterValueById(id, delta, weight) {
      calls.push({ id, value: Number(delta) * Number(weight), at: now });
    }
  };
  const state = {
    expressionEnabled: true,
    model: { internalModel: { coreModel } },
    config: {},
    uiView: "model",
    currentTalkStyle: "neutral",
    speechMouthOpen: 0,
    ttsAudioLevel: 0,
    microBreathSeed: 1.1,
    microNextBlinkAt: 999999,
    microNextGazeAt: 999999,
    microMotionLastAt: now - 16.6667,
    microGazeTargetX: 0,
    microGazeTargetY: 0,
    microGazeCurrentX: 0,
    microGazeCurrentY: 0,
    mouseGazeCurrentX: 0,
    mouseGazeCurrentY: 0
  };
  const controller = live2dExpressionController.createController({
    state,
    performanceObject: { now: () => now },
    isSpeechMotionActive: () => false,
    isSpeakingNow: () => false,
    sanitizeSpeakText: (value) => String(value || "").trim(),
    normalizeTalkStyle: (value) => String(value || "neutral").trim() || "neutral",
    detectMood: () => "idle",
    clampNumber: (value, min, max) => Math.max(min, Math.min(max, Number(value) || 0))
  });
  for (let i = 0; i < 48; i += 1) {
    now += 83;
    controller.updateMicroMotionLayer();
  }
  const total = (id) => calls
    .filter((call) => call.id === id)
    .reduce((sum, call) => sum + Math.abs(call.value), 0);
  const max = (id) => calls
    .filter((call) => call.id === id)
    .reduce((best, call) => Math.max(best, Math.abs(call.value)), 0);
  assert.ok(
    total("ParamBodyAngleY") + total("ParamAngleY") >= 3.2,
    "neutral idle should have a visible low-distraction life layer"
  );
  assert.ok(
    max("ParamBodyAngleZ") <= 1.8 && max("ParamAngleZ") <= 1.6,
    "neutral idle should remain subtle and below active emotion motion"
  );
}
```

- [ ] **Step 2: Run RED test**

Run:

```powershell
node tests\test_performance_cue_frontend.js
```

Expected: fail on idle life total if current neutral is too static.

- [ ] **Step 3: Implement neutral/idle micro-life tuning**

In `updateMicroMotionLayer(...)`, adjust only the low-priority neutral/idle baseline values. The safe target is:

```js
const idleLifeGain = cueMotionActive ? 0.45 : 1;
safeAddParamValue(core, "ParamBodyAngleY", Math.sin(now / 1150 + seed * 0.3) * 0.38 * idleLifeGain, 0.18);
safeAddParamValue(core, "ParamAngleY", Math.sin(now / 980 + seed * 0.7) * 0.32 * idleLifeGain, 0.16);
safeAddParamValue(core, "ParamBodyAngleX", Math.sin(now / 1420 + seed * 0.5) * 0.22 * idleLifeGain, 0.14);
```

Place this near existing breathing/idle micro-motion logic, not inside active emotion cue branches.

- [ ] **Step 4: Run GREEN test**

Run:

```powershell
node tests\test_performance_cue_frontend.js
```

Expected: pass.

---

### Task 6: Electron/CDP Visual QA and Final Handoff

**Files:**
- Modify: `progress.md`
- Modify: `session-handoff.md`

- [ ] **Step 1: Run full local verification before visual QA**

Run:

```powershell
node tests\test_performance_cue_frontend.js
node scripts\run_node_tests.js
node --check web\live2dExpressionController.js
node --check tests\test_performance_cue_frontend.js
python -m json.tool config.example.json
python -m json.tool package.json
python -m json.tool feature_list.json
python -m json.tool web\assets\live2d-overlays\hiyori\manifest.json
python -m py_compile app.py config.py tts.py memory.py tools.py llm_client.py asr.py emotion.py humanize.py utils.py
```

Expected: all pass.

- [ ] **Step 2: Start Electron with CDP**

Run:

```powershell
$electron = Resolve-Path .\node_modules\electron\dist\electron.exe
$proc = Start-Process -FilePath $electron -ArgumentList @('--remote-debugging-port=9223','electron/main.js') -WorkingDirectory (Get-Location) -WindowStyle Hidden -PassThru
$proc.Id
```

Record the PID for cleanup.

- [ ] **Step 3: Capture model-page screenshots for all emotion groups**

Use the existing CDP pattern from prior smoke scripts. Trigger these cue payloads on the model page:

```js
[
  { name: "neutral", emotion: "neutral", text: "我在这里。", action: "none" },
  { name: "happy", emotion: "happy", text: "太好了！", action: "wave" },
  { name: "playful", emotion: "playful", text: "嘿嘿，我有个想法。", action: "wave" },
  { name: "surprised", emotion: "surprised", text: "欸？真的假的？！", action: "surprised" },
  { name: "sad", emotion: "sad", text: "有点难过。", action: "none" },
  { name: "anxious", emotion: "anxious", text: "我有点担心。", action: "none" },
  { name: "thinking", emotion: "thinking", text: "让我想一下。", action: "think" },
  { name: "angry", emotion: "angry", text: "不行，这个要修正。", action: "shake_head" }
]
```

Save screenshots under:

```text
%USERPROFILE%\AppData\Local\Temp\ai_desktop_pet_smoke\hiyori-all-emotions-v1\
```

Create a contact sheet:

```text
%USERPROFILE%\AppData\Local\Temp\ai_desktop_pet_smoke\hiyori-all-emotions-v1\all-emotions-contact-sheet.png
```

- [ ] **Step 4: Review the contact sheet before finalizing**

Open the contact sheet with `view_image`. Check:

- Happy/playful are visibly stronger than neutral.
- Surprised has a readable pop/spark and does not look detached.
- Sad/anxious are readable but not theatrical.
- Angry does not regress to twitching.
- Thinking overlay still appears and no external limb appears.

If any condition fails, fix the specific emotion branch and rerun Task 6 Step 1 plus Step 3.

- [ ] **Step 5: Cleanup Electron**

Run:

```powershell
Stop-Process -Id <PID_FROM_STEP_2> -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2
Get-NetTCPConnection -LocalPort 8123,9223 -State Listen -ErrorAction SilentlyContinue
```

Expected: no listener rows.

- [ ] **Step 6: Update handoff docs**

In `progress.md`, add:

```text
- Hiyori all-emotion strong expression follow-up
  - Result: complete after final verification passes.
  - Strengthened happy/playful/surprised/sad/anxious/neutral runtime model reactions.
  - Preserved thinking and angry recent behavior.
  - Contact sheet: %USERPROFILE%\AppData\Local\Temp\ai_desktop_pet_smoke\hiyori-all-emotions-v1\all-emotions-contact-sheet.png.
  - Verification: record exact commands and pass/fail results.
```

In `session-handoff.md`, add:

```text
- Hiyori all-emotion strong expression follow-up
  - Current status: set to complete only after full verification and visual QA pass.
  - Files touched: web\live2dExpressionController.js, tests\test_performance_cue_frontend.js, optional surprised overlay files, progress.md, session-handoff.md.
  - Screenshot evidence: %USERPROFILE%\AppData\Local\Temp\ai_desktop_pet_smoke\hiyori-all-emotions-v1\all-emotions-contact-sheet.png.
  - Risk: Hiyori's bundled model limits true hand/body expressiveness.
```

- [ ] **Step 7: Final verification**

Run:

```powershell
git diff --check -- web\live2dExpressionController.js web\hiyoriEmotionOverlayController.js web\assets\live2d-overlays\hiyori\manifest.json tests\test_performance_cue_frontend.js progress.md session-handoff.md docs\superpowers\specs\2026-06-04-hiyori-all-emotion-strong-expression-design.md docs\superpowers\plans\2026-06-04-hiyori-all-emotion-strong-expression.md
node %USERPROFILE%\.codex\skills\harness-creator\scripts\validate-harness.mjs --target D:\AI\ai_desktop_pet
```

Expected: diff check passes and harness remains `100/100`.

---

## Self-Review

- Spec coverage: happy/playful, surprised, sad/anxious, neutral/idle, thinking/angry preservation, smoothness guards, and Electron visual QA all map to plan tasks.
- Placeholder scan: no unresolved markers or incomplete task references are intentionally present.
- Type consistency: all plan snippets use existing names from `performanceCueController`, `live2dExpressionController`, `hiyoriEmotionOverlayController`, and `tests/test_performance_cue_frontend.js`.
- Scope check: model replacement, Cubism runtime upgrade, LLM, and TTS are excluded from this plan.
