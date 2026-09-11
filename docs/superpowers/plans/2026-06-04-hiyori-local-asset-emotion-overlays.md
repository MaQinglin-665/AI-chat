# Hiyori Local Asset Emotion Overlays Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Raise Hiyori's `thinking` and `angry` readability by adding Hiyori-matched local transparent overlay assets without replacing the character or editing `.moc3`.

**Architecture:** Add a small reusable emotion overlay controller, a Hiyori overlay manifest, and a non-interactive DOM layer above the Live2D canvas. Existing Live2D motion/expression remains the base; overlays provide the visible silhouette and semantic marks that the current Hiyori runtime resources cannot create alone.

**Tech Stack:** Electron, HTML/CSS overlay layer, CommonJS frontend controller tests, Live2D performance cue path, optional generated transparent PNG/WebP assets, CDP screenshot smoke.

---

## Quality Bar

- Use TDD for every behavior change.
- Do not commit third-party model files or unlicensed assets.
- Do not change the default character away from Hiyori.
- Do not modify `config.json`, `.env`, private voice samples, or API keys.
- Do not rely on "it should be visible"; final acceptance requires contact-sheet screenshots.
- Because this worktree is already dirty, do not commit unless the user explicitly asks after validation.

## File Structure

- Create: `web/hiyoriEmotionOverlayController.js`
  - Owns pure overlay manifest normalization, DOM binding, show/hide state, timeout cleanup, and debug state.
- Create: `web/assets/live2d-overlays/hiyori/manifest.json`
  - Maps logical overlay ids to local asset paths and placement classes.
- Create: `web/assets/live2d-overlays/hiyori/thinking-hand-chin.png`
  - Transparent Hiyori-style hand/near-face pose asset.
- Create: `web/assets/live2d-overlays/hiyori/thinking-ellipsis.png`
  - Small optional semantic mark.
- Create: `web/assets/live2d-overlays/hiyori/angry-fist.png`
  - Transparent Hiyori-style fist/tense-hand asset.
- Create: `web/assets/live2d-overlays/hiyori/angry-mark.png`
  - Small anger mark.
- Modify: `web/index.html`
  - Add `#live2d-emotion-overlay-layer` near the model canvas and load the new controller before `live2dExpressionController.js`.
- Modify: `web/desktop.css`
  - Add non-interactive overlay host, asset positioning, and entry/hold/exit animations.
- Modify: `web/live2dExpressionController.js`
  - Inject the overlay controller and call it from high `thinking`/`angry` cue paths.
- Modify: `web/chat.js`
  - Add `hiyoriEmotionOverlayController` to the Live2D expression controller dependencies.
- Modify: `tests/test_performance_cue_frontend.js`
  - Add manifest, DOM/CSS/source contract, controller behavior, and cue wiring tests.
- Modify: `scripts/run_node_tests.js`
  - Only if the new controller needs a separate dedicated test file; otherwise keep coverage in `tests/test_performance_cue_frontend.js`.
- Modify: `progress.md`
  - Record implementation evidence and screenshot paths.
- Modify: `session-handoff.md`
  - Record handoff, risks, and next step.

## Task 1: Overlay Manifest And Controller Contract

**Files:**
- Create: `web/hiyoriEmotionOverlayController.js`
- Create: `web/assets/live2d-overlays/hiyori/manifest.json`
- Modify: `tests/test_performance_cue_frontend.js`

- [ ] **Step 1: Add failing manifest assertions**

Add this block near the existing Hiyori model-resource checks in `tests/test_performance_cue_frontend.js`:

```js
const HIYORI_OVERLAY_MANIFEST = path.resolve(__dirname, "..", "web", "assets", "live2d-overlays", "hiyori", "manifest.json");
const HIYORI_OVERLAY_DIR = path.dirname(HIYORI_OVERLAY_MANIFEST);

{
  assert.ok(fs.existsSync(HIYORI_OVERLAY_MANIFEST), "Hiyori emotion overlay manifest should exist");
  const manifest = JSON.parse(fs.readFileSync(HIYORI_OVERLAY_MANIFEST, "utf8"));
  assert.strictEqual(manifest.version, 1, "Hiyori overlay manifest should use version 1");
  assert.strictEqual(manifest.character, "hiyori_pro_t11", "Hiyori overlay manifest should be scoped to the current model");
  for (const emotion of ["thinking", "angry"]) {
    assert.ok(Array.isArray(manifest.emotions?.[emotion]?.assets), `${emotion} overlay should define assets`);
    assert.ok(manifest.emotions[emotion].assets.length >= 2, `${emotion} overlay should include a gesture and a semantic mark`);
    for (const asset of manifest.emotions[emotion].assets) {
      assert.ok(asset.id && asset.file && asset.placement, `${emotion} overlay assets should include id, file, and placement`);
      const assetPath = path.resolve(HIYORI_OVERLAY_DIR, asset.file);
      assert.ok(assetPath.startsWith(HIYORI_OVERLAY_DIR), `${emotion} overlay assets should stay inside the hiyori overlay directory`);
      assert.ok(/\.(png|webp)$/i.test(asset.file), `${emotion}.${asset.id} should use a browser-displayable bitmap`);
    }
  }
}
```

- [ ] **Step 2: Verify RED**

Run:

```powershell
node tests\test_performance_cue_frontend.js
```

Expected: fail with `Hiyori emotion overlay manifest should exist`.

- [ ] **Step 3: Add minimal manifest**

Create `web/assets/live2d-overlays/hiyori/manifest.json`:

```json
{
  "version": 1,
  "character": "hiyori_pro_t11",
  "emotions": {
    "thinking": {
      "durationMs": 1900,
      "entry": "snap",
      "assets": [
        {
          "id": "thinking-hand-chin",
          "file": "thinking-hand-chin.png",
          "placement": "gesture thinking-hand-chin"
        },
        {
          "id": "thinking-ellipsis",
          "file": "thinking-ellipsis.png",
          "placement": "mark thinking-ellipsis"
        }
      ]
    },
    "angry": {
      "durationMs": 1700,
      "entry": "snap",
      "assets": [
        {
          "id": "angry-fist",
          "file": "angry-fist.png",
          "placement": "gesture angry-fist"
        },
        {
          "id": "angry-mark",
          "file": "angry-mark.png",
          "placement": "mark angry-mark"
        }
      ]
    }
  }
}
```

- [ ] **Step 4: Add failing controller API assertions**

Add this near the existing `require(...)` declarations in `tests/test_performance_cue_frontend.js`:

```js
const HIYORI_EMOTION_OVERLAY_CONTROLLER_JS = path.resolve(__dirname, "..", "web", "hiyoriEmotionOverlayController.js");
const hiyoriEmotionOverlayController = require(HIYORI_EMOTION_OVERLAY_CONTROLLER_JS);
assert.strictEqual(typeof hiyoriEmotionOverlayController.createController, "function");
```

Add this behavior block after the thinking-bubble behavior test:

```js
{
  let now = 2000;
  const children = [];
  const classNames = new Set();
  const fakeLayer = {
    hidden: true,
    replaceChildren(...nodes) {
      children.length = 0;
      children.push(...nodes);
    },
    classList: {
      add(name) { classNames.add(name); },
      remove(name) { classNames.delete(name); },
      contains(name) { return classNames.has(name); }
    },
    setAttribute(name, value) {
      this[name] = value;
    }
  };
  const fakeDocument = {
    createElement(tag) {
      return {
        tagName: tag.toUpperCase(),
        className: "",
        alt: "",
        src: "",
        dataset: {},
        setAttribute(name, value) {
          this[name] = value;
        }
      };
    },
    getElementById(id) {
      return id === "live2d-emotion-overlay-layer" ? fakeLayer : null;
    }
  };
  const state = {};
  const controller = hiyoriEmotionOverlayController.createController({
    state,
    documentObject: fakeDocument,
    performanceObject: { now: () => now },
    setTimeoutFn: (fn) => {
      state._overlayTimeout = fn;
      return 7;
    },
    clearTimeoutFn: () => {}
  });
  const result = controller.showEmotionOverlay("thinking", { intensity: "high", durationMs: 1800 });
  assert.strictEqual(result, true, "high thinking should show the Hiyori overlay");
  assert.strictEqual(fakeLayer.hidden, false, "showing the overlay should reveal the host");
  assert.ok(classNames.has("is-visible"), "showing the overlay should add is-visible");
  assert.ok(children.some((node) => node.dataset.assetId === "thinking-hand-chin"), "thinking overlay should include the hand-to-chin asset");
  assert.ok(children.some((node) => node.dataset.assetId === "thinking-ellipsis"), "thinking overlay should include the ellipsis asset");
  assert.strictEqual(state.hiyoriEmotionOverlayDebug?.emotion, "thinking", "overlay debug should record the active emotion");
  controller.clearEmotionOverlay();
  assert.strictEqual(fakeLayer.hidden, true, "clearing the overlay should hide the host");
  assert.strictEqual(children.length, 0, "clearing the overlay should remove asset nodes");
}
```

- [ ] **Step 5: Verify RED**

Run:

```powershell
node tests\test_performance_cue_frontend.js
```

Expected: fail with `Cannot find module ... hiyoriEmotionOverlayController.js`.

- [ ] **Step 6: Implement minimal controller**

Create `web/hiyoriEmotionOverlayController.js`:

```js
(function (root) {
  "use strict";

  const DEFAULT_MANIFEST = {
    version: 1,
    character: "hiyori_pro_t11",
    emotions: {
      thinking: {
        durationMs: 1900,
        entry: "snap",
        assets: [
          { id: "thinking-hand-chin", file: "thinking-hand-chin.png", placement: "gesture thinking-hand-chin" },
          { id: "thinking-ellipsis", file: "thinking-ellipsis.png", placement: "mark thinking-ellipsis" }
        ]
      },
      angry: {
        durationMs: 1700,
        entry: "snap",
        assets: [
          { id: "angry-fist", file: "angry-fist.png", placement: "gesture angry-fist" },
          { id: "angry-mark", file: "angry-mark.png", placement: "mark angry-mark" }
        ]
      }
    }
  };

  function createController(deps = {}) {
    const state = deps.state || {};
    const document = deps.documentObject || root.document;
    const performance = deps.performanceObject || root.performance || { now: () => Date.now() };
    const setTimeoutFn = deps.setTimeoutFn || root.setTimeout || setTimeout;
    const clearTimeoutFn = deps.clearTimeoutFn || root.clearTimeout || clearTimeout;
    const manifest = deps.manifest || DEFAULT_MANIFEST;
    const basePath = String(deps.basePath || "./assets/live2d-overlays/hiyori/");

    function getLayer() {
      try {
        return document?.getElementById?.("live2d-emotion-overlay-layer") || null;
      } catch (_) {
        return null;
      }
    }

    function clearEmotionOverlay() {
      if (state.hiyoriEmotionOverlayTimer) {
        clearTimeoutFn(state.hiyoriEmotionOverlayTimer);
        state.hiyoriEmotionOverlayTimer = 0;
      }
      const layer = getLayer();
      if (layer) {
        layer.hidden = true;
        layer.setAttribute?.("aria-hidden", "true");
        layer.classList?.remove?.("is-visible");
        layer.replaceChildren?.();
      }
      state.hiyoriEmotionOverlayActive = false;
      state.hiyoriEmotionOverlayDebug = null;
    }

    function showEmotionOverlay(emotion, opts = {}) {
      const key = String(emotion || "").trim().toLowerCase();
      const config = manifest.emotions?.[key];
      const layer = getLayer();
      if (!config || !layer) {
        state.hiyoriEmotionOverlayDebug = {
          emotion: key,
          ok: false,
          reason: !config ? "missing_emotion" : "missing_layer",
          at: performance.now()
        };
        return false;
      }
      if (opts.intensity && String(opts.intensity) !== "high") {
        clearEmotionOverlay();
        return false;
      }
      const nodes = [];
      for (const asset of config.assets || []) {
        const img = document.createElement("img");
        img.className = `hiyori-emotion-overlay-asset ${asset.placement || ""}`.trim();
        img.src = `${basePath}${asset.file}`;
        img.alt = "";
        img.dataset.assetId = asset.id;
        img.setAttribute?.("aria-hidden", "true");
        nodes.push(img);
      }
      layer.replaceChildren(...nodes);
      layer.hidden = false;
      layer.setAttribute?.("aria-hidden", "false");
      layer.classList?.add?.("is-visible");
      state.hiyoriEmotionOverlayActive = true;
      state.hiyoriEmotionOverlayDebug = {
        emotion: key,
        ok: true,
        assets: nodes.map((node) => node.dataset.assetId),
        at: performance.now()
      };
      const durationMs = Math.max(600, Math.min(3600, Number(opts.durationMs || config.durationMs) || 1600));
      state.hiyoriEmotionOverlayTimer = setTimeoutFn(clearEmotionOverlay, durationMs);
      return true;
    }

    return {
      clearEmotionOverlay,
      showEmotionOverlay
    };
  }

  const api = { createController, DEFAULT_MANIFEST };
  root.TaffyHiyoriEmotionOverlayController = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
```

- [ ] **Step 7: Verify GREEN**

Run:

```powershell
node tests\test_performance_cue_frontend.js
node --check web\hiyoriEmotionOverlayController.js
```

Expected: both pass.

## Task 2: DOM Host, Script Load, And CSS Layer

**Files:**
- Modify: `web/index.html`
- Modify: `web/desktop.css`
- Modify: `tests/test_performance_cue_frontend.js`

- [ ] **Step 1: Add failing source-contract checks**

Add this static block near the existing HTML/CSS source checks:

```js
{
  const indexHtml = fs.readFileSync(INDEX_HTML, "utf8");
  const css = fs.readFileSync(DESKTOP_CSS, "utf8");
  assert.ok(indexHtml.includes('id="live2d-emotion-overlay-layer"'), "model page should include the Hiyori emotion overlay host");
  assert.ok(
    indexHtml.indexOf("./hiyoriEmotionOverlayController.js") > indexHtml.indexOf("./performanceCueController.js"),
    "Hiyori overlay controller should load after performance cue code exists"
  );
  assert.ok(
    indexHtml.indexOf("./hiyoriEmotionOverlayController.js") < indexHtml.indexOf("./live2dExpressionController.js"),
    "Hiyori overlay controller should load before Live2D expression controller"
  );
  assert.ok(css.includes(".live2d-emotion-overlay-layer"), "desktop CSS should style the emotion overlay host");
  assert.ok(css.includes("pointer-events: none"), "emotion overlay CSS should keep the layer non-interactive");
  assert.ok(css.includes(".hiyori-emotion-overlay-asset.thinking-hand-chin"), "desktop CSS should position the thinking hand asset");
  assert.ok(css.includes(".hiyori-emotion-overlay-asset.angry-fist"), "desktop CSS should position the angry fist asset");
}
```

- [ ] **Step 2: Verify RED**

Run:

```powershell
node tests\test_performance_cue_frontend.js
```

Expected: fail on missing `live2d-emotion-overlay-layer`.

- [ ] **Step 3: Add DOM host and script**

In `web/index.html`, immediately after:

```html
<div id="thinking-cue-bubble" class="thinking-cue-bubble" aria-hidden="true" hidden>?</div>
```

add:

```html
<div id="live2d-emotion-overlay-layer" class="live2d-emotion-overlay-layer" aria-hidden="true" hidden></div>
```

In the scripts list, add after `performanceCueController.js` and before `live2dExpressionController.js`:

```html
<script src="./hiyoriEmotionOverlayController.js"></script>
```

- [ ] **Step 4: Add CSS host and placements**

Append to `web/desktop.css` near `.thinking-cue-bubble`:

```css
.live2d-emotion-overlay-layer {
  position: fixed;
  inset: 0;
  z-index: 29;
  pointer-events: none;
  opacity: 0;
  transform: translateY(0);
  transition: opacity 120ms ease;
}

.live2d-emotion-overlay-layer.is-visible {
  opacity: 1;
}

.hiyori-emotion-overlay-asset {
  position: fixed;
  display: block;
  pointer-events: none;
  user-select: none;
  -webkit-user-drag: none;
  transform-origin: center center;
  filter: drop-shadow(0 5px 8px rgba(28, 30, 45, 0.18));
}

.hiyori-emotion-overlay-asset.gesture {
  width: clamp(82px, 11vw, 148px);
}

.hiyori-emotion-overlay-asset.mark {
  width: clamp(34px, 5.2vw, 72px);
}

.hiyori-emotion-overlay-asset.thinking-hand-chin {
  left: clamp(42%, 49vw, 56%);
  top: clamp(36%, 45vh, 52%);
  transform: translate(-50%, -50%) rotate(-8deg) scale(0.96);
  animation: hiyoriThinkingHandSnap 680ms cubic-bezier(0.2, 0.9, 0.2, 1.08) both;
}

.hiyori-emotion-overlay-asset.thinking-ellipsis {
  left: clamp(52%, 58vw, 64%);
  top: clamp(25%, 31vh, 38%);
  transform: translate(-50%, -50%) rotate(-4deg);
  animation: hiyoriEmotionMarkPop 720ms ease both;
}

.hiyori-emotion-overlay-asset.angry-fist {
  left: clamp(37%, 43vw, 50%);
  top: clamp(45%, 54vh, 60%);
  transform: translate(-50%, -50%) rotate(-18deg) scale(0.98);
  animation: hiyoriAngryFistSnap 520ms cubic-bezier(0.2, 1.15, 0.25, 1) both;
}

.hiyori-emotion-overlay-asset.angry-mark {
  left: clamp(52%, 58vw, 65%);
  top: clamp(19%, 25vh, 34%);
  transform: translate(-50%, -50%) rotate(8deg);
  animation: hiyoriEmotionMarkPop 620ms ease both;
}

@keyframes hiyoriThinkingHandSnap {
  0% { opacity: 0; transform: translate(-46%, -42%) rotate(-24deg) scale(0.78); }
  46% { opacity: 1; transform: translate(-50%, -50%) rotate(-4deg) scale(1.08); }
  100% { opacity: 1; transform: translate(-50%, -50%) rotate(-8deg) scale(0.96); }
}

@keyframes hiyoriAngryFistSnap {
  0% { opacity: 0; transform: translate(-58%, -42%) rotate(-36deg) scale(0.72); }
  58% { opacity: 1; transform: translate(-50%, -50%) rotate(-12deg) scale(1.14); }
  100% { opacity: 1; transform: translate(-50%, -50%) rotate(-18deg) scale(0.98); }
}

@keyframes hiyoriEmotionMarkPop {
  0% { opacity: 0; transform: translate(-50%, -50%) scale(0.45) rotate(-12deg); }
  55% { opacity: 1; transform: translate(-50%, -50%) scale(1.18) rotate(7deg); }
  100% { opacity: 1; transform: translate(-50%, -50%) scale(1) rotate(0deg); }
}
```

- [ ] **Step 5: Verify GREEN**

Run:

```powershell
node tests\test_performance_cue_frontend.js
node --check web\hiyoriEmotionOverlayController.js
```

Expected: both pass.

## Task 3: Wire Overlay Controller Into Live2D Cues

**Files:**
- Modify: `web/live2dExpressionController.js`
- Modify: `web/chat.js`
- Modify: `tests/test_performance_cue_frontend.js`

- [ ] **Step 1: Add failing cue-wiring behavior tests**

Add this block after the controller unit block from Task 1:

```js
{
  let shown = [];
  const overlayController = {
    showEmotionOverlay(emotion, opts) {
      shown.push({ emotion, opts });
      return true;
    },
    clearEmotionOverlay() {
      shown.push({ clear: true });
    }
  };
  const controller = live2dExpressionController.createController({
    state: {},
    hiyoriEmotionOverlayController: overlayController,
    performanceObject: { now: () => 1000 },
    sanitizeSpeakText: (text) => String(text || "").trim(),
    normalizeTalkStyle: (style) => String(style || "neutral").trim() || "neutral",
    detectMood: () => "thinking",
    clampNumber: (value, min, max) => Math.max(min, Math.min(max, Number(value) || 0))
  });
  const thinkingCue = cueController.buildPerformanceCue({
    replyText: "我先想一下。",
    mood: "thinking",
    talkStyle: "clear",
    runtimeMetadata: { emotion: "thinking", action: "ponder", intensity: "high" }
  });
  controller.applySpeechPerformanceCue(thinkingCue);
  assert.strictEqual(shown[0]?.emotion, "thinking", "high thinking cue should show the Hiyori thinking overlay");
  assert.strictEqual(shown[0]?.opts?.intensity, "high", "thinking overlay should receive cue intensity");
  controller.clearSpeechPerformanceCue();
  assert.ok(shown.some((item) => item.clear), "clearing speech performance cue should clear the Hiyori overlay");

  shown = [];
  const angryCue = cueController.buildPerformanceCue({
    replyText: "不行。",
    mood: "idle",
    talkStyle: "steady",
    runtimeMetadata: { emotion: "angry", action: "shake_head", intensity: "high" }
  });
  controller.applySpeechPerformanceCue(angryCue);
  assert.strictEqual(shown[0]?.emotion, "angry", "high angry cue should reuse the Hiyori overlay mechanism");
}
```

Add this static source check near existing dependency-wiring checks:

```js
{
  const chatSource = fs.readFileSync(CHAT_JS, "utf8");
  const live2dSource = fs.readFileSync(LIVE2D_EXPRESSION_CONTROLLER_JS, "utf8");
  assert.ok(chatSource.includes("TaffyHiyoriEmotionOverlayController"), "chat should pass the Hiyori overlay controller into Live2D expression deps");
  assert.ok(live2dSource.includes("hiyoriEmotionOverlayController"), "Live2D expression controller should accept the Hiyori overlay dependency");
}
```

- [ ] **Step 2: Verify RED**

Run:

```powershell
node tests\test_performance_cue_frontend.js
```

Expected: fail because `showEmotionOverlay` is not called.

- [ ] **Step 3: Add dependency to expression controller**

In `web/live2dExpressionController.js`, near the dependency declarations, add:

```js
const hiyoriEmotionOverlayController = deps.hiyoriEmotionOverlayController || null;
```

Add helper functions near `setThinkingCueSymbolVisible`:

```js
function maybeShowHiyoriEmotionOverlay(normalized) {
  if (!hiyoriEmotionOverlayController || typeof hiyoriEmotionOverlayController.showEmotionOverlay !== "function") {
    return false;
  }
  const emotion = String(normalized?.emotion || "");
  if (!["thinking", "angry"].includes(emotion) || normalized?.intensity !== "high") {
    return false;
  }
  return hiyoriEmotionOverlayController.showEmotionOverlay(emotion, {
    intensity: normalized.intensity,
    durationMs: normalized.holdMs + 900,
    visibleMotion: normalized.visibleMotion,
    source: "performance_cue"
  });
}

function clearHiyoriEmotionOverlay() {
  if (hiyoriEmotionOverlayController && typeof hiyoriEmotionOverlayController.clearEmotionOverlay === "function") {
    hiyoriEmotionOverlayController.clearEmotionOverlay();
  }
}
```

Inside `applySpeechPerformanceCue(normalized)` after the thinking bubble visibility branch, call:

```js
maybeShowHiyoriEmotionOverlay(normalized);
```

Inside the invalid-cue branch and `clearSpeechPerformanceCue()`, call:

```js
clearHiyoriEmotionOverlay();
```

- [ ] **Step 4: Wire dependency from chat.js**

In `web/chat.js`, inside `getLive2DExpressionController()` dependency creation, pass:

```js
hiyoriEmotionOverlayController:
  typeof window.TaffyHiyoriEmotionOverlayController?.createController === "function"
    ? window.TaffyHiyoriEmotionOverlayController.createController({ state, documentObject: document, windowObject: window, performanceObject: performance })
    : null,
```

If `getLive2DExpressionController()` already uses a local object literal, add this property there without restructuring unrelated dependencies.

- [ ] **Step 5: Verify GREEN**

Run:

```powershell
node tests\test_performance_cue_frontend.js
node --check web\live2dExpressionController.js
node --check web\chat.js
```

Expected: all pass.

## Task 4: Create Reviewable Local Overlay Assets

**Files:**
- Create: `web/assets/live2d-overlays/hiyori/thinking-hand-chin.png`
- Create: `web/assets/live2d-overlays/hiyori/thinking-ellipsis.png`
- Create: `web/assets/live2d-overlays/hiyori/angry-fist.png`
- Create: `web/assets/live2d-overlays/hiyori/angry-mark.png`
- Modify: `tests/test_performance_cue_frontend.js`

- [ ] **Step 1: Add failing bitmap existence and transparency checks**

Extend the manifest asset loop from Task 1:

```js
assert.ok(fs.existsSync(assetPath), `missing Hiyori overlay asset: ${asset.file}`);
const bytes = fs.readFileSync(assetPath);
assert.ok(bytes.length >= 512, `${asset.file} should not be an empty stub file`);
const pngSignature = bytes.subarray(0, 8).toString("hex");
const webpSignature = bytes.subarray(8, 12).toString("ascii");
assert.ok(
  pngSignature === "89504e470d0a1a0a" || webpSignature === "WEBP",
  `${asset.file} should be a PNG or WebP bitmap`
);
```

- [ ] **Step 2: Verify RED**

Run:

```powershell
node tests\test_performance_cue_frontend.js
```

Expected: fail on `missing Hiyori overlay asset: thinking-hand-chin.png`.

- [ ] **Step 3: Generate or assemble first-pass transparent assets**

Use the installed `imagegen` skill if generating art. Required prompt direction:

```text
Create transparent-background 2D anime overlay assets that match a gentle Live2D schoolgirl desktop pet style.
Asset 1: one hand near chin / thinking pose, no full character, no face, just arm/hand sleeve segment, soft cel shading.
Asset 2: small ellipsis thought mark, blue-gray, soft outline.
Asset 3: clenched fist / tense forearm pose, no full character, matching sleeve and skin tone.
Asset 4: small red anger mark, anime style, transparent background.
Keep assets clean, readable at small size, and not photorealistic.
```

Save outputs exactly as:

```text
web/assets/live2d-overlays/hiyori/thinking-hand-chin.png
web/assets/live2d-overlays/hiyori/thinking-ellipsis.png
web/assets/live2d-overlays/hiyori/angry-fist.png
web/assets/live2d-overlays/hiyori/angry-mark.png
```

If image generation produces a sheet instead of separate transparent files, split/crop with a script, then visually inspect each file.

- [ ] **Step 4: Verify asset checks GREEN**

Run:

```powershell
node tests\test_performance_cue_frontend.js
python -m json.tool web\assets\live2d-overlays\hiyori\manifest.json
```

Expected: both pass.

- [ ] **Step 5: Create a local contact sheet for asset review**

Run a small local script or Node/Python image tool to create:

```text
%USERPROFILE%\AppData\Local\Temp\ai_desktop_pet_smoke\hiyori-overlay-assets-v1\asset-contact-sheet.png
```

Expected: each asset is visible, transparent, and not a full replacement character.

## Task 5: Electron/CDP Visual Smoke For Thinking And Angry

**Files:**
- Modify: `progress.md`
- Modify: `session-handoff.md`

- [ ] **Step 1: Launch Electron with CDP**

Run:

```powershell
$electron = Resolve-Path .\node_modules\electron\dist\electron.exe
$p = Start-Process -FilePath $electron -ArgumentList @('--remote-debugging-port=9223','electron/main.js') -WorkingDirectory (Get-Location) -WindowStyle Hidden -PassThru
$p.Id
```

Expected: Electron starts and `/json` becomes available on `127.0.0.1:9223`.

- [ ] **Step 2: Capture thinking overlay smoke**

Use CDP to:

1. Find the `view=model` page.
2. Evaluate a high `thinking` performance cue through `window.applySpeechPerformanceCue(...)` or `beginSpeechAnimation(..., { performanceCue })`.
3. Assert:

```js
window.__petState.hiyoriEmotionOverlayDebug.emotion === "thinking"
window.__petState.hiyoriEmotionOverlayDebug.assets.includes("thinking-hand-chin")
document.getElementById("live2d-emotion-overlay-layer").hidden === false
```

Capture:

```text
%USERPROFILE%\AppData\Local\Temp\ai_desktop_pet_smoke\hiyori-overlays-v1\thinking-entry.png
%USERPROFILE%\AppData\Local\Temp\ai_desktop_pet_smoke\hiyori-overlays-v1\thinking-hold.png
```

- [ ] **Step 3: Capture angry overlay smoke**

In the same model page, trigger a high `angry` cue and assert:

```js
window.__petState.hiyoriEmotionOverlayDebug.emotion === "angry"
window.__petState.hiyoriEmotionOverlayDebug.assets.includes("angry-fist")
document.getElementById("live2d-emotion-overlay-layer").hidden === false
```

Capture:

```text
%USERPROFILE%\AppData\Local\Temp\ai_desktop_pet_smoke\hiyori-overlays-v1\angry-entry.png
%USERPROFILE%\AppData\Local\Temp\ai_desktop_pet_smoke\hiyori-overlays-v1\angry-hold.png
```

- [ ] **Step 4: Build contact sheet**

Create:

```text
%USERPROFILE%\AppData\Local\Temp\ai_desktop_pet_smoke\hiyori-overlays-v1\hiyori-overlays-contact-sheet.png
```

Expected: idle, thinking entry/hold, and angry entry/hold are easy to compare.

- [ ] **Step 5: Clean up Electron**

Stop the Electron process launched in Step 1 and verify:

```powershell
$rows = Get-NetTCPConnection -LocalPort 8123,9223 -ErrorAction SilentlyContinue | Where-Object { $_.State -eq 'Listen' }
if ($rows) { $rows | Select-Object LocalPort,OwningProcess,State; exit 1 } else { 'no 8123/9223 listeners' }
```

Expected: `no 8123/9223 listeners`.

## Task 6: Final Verification And Handoff

**Files:**
- Modify: `progress.md`
- Modify: `session-handoff.md`

- [ ] **Step 1: Run full required checks**

Run:

```powershell
node tests\test_performance_cue_frontend.js
node scripts\run_node_tests.js
node --check web\hiyoriEmotionOverlayController.js
node --check web\live2dExpressionController.js
node --check web\chat.js
python -m json.tool config.example.json
python -m json.tool package.json
python -m json.tool feature_list.json
python -m json.tool web\assets\live2d-overlays\hiyori\manifest.json
python -m py_compile app.py config.py tts.py memory.py tools.py llm_client.py asr.py emotion.py humanize.py utils.py
git diff --check -- web\hiyoriEmotionOverlayController.js web\index.html web\desktop.css web\live2dExpressionController.js web\chat.js tests\test_performance_cue_frontend.js progress.md session-handoff.md docs\superpowers\specs\2026-06-04-hiyori-local-asset-emotion-overlays-design.md docs\superpowers\plans\2026-06-04-hiyori-local-asset-emotion-overlays.md
node %USERPROFILE%\.codex\skills\harness-creator\scripts\validate-harness.mjs --target D:\AI\ai_desktop_pet
```

Expected: all pass.

- [ ] **Step 2: Update progress and handoff**

In `progress.md`, add:

```text
- Hiyori local emotion overlay follow-up
  - Added Hiyori-specific transparent overlay mechanism for high `thinking` and `angry` cues.
  - `thinking` now uses a hand-to-chin local asset plus optional ellipsis mark.
  - `angry` reuses the same mechanism with fist and anger mark assets.
  - Electron/CDP screenshot contact sheet: `%USERPROFILE%\AppData\Local\Temp\ai_desktop_pet_smoke\hiyori-overlays-v1\hiyori-overlays-contact-sheet.png`.
  - Final verification: record each command from Task 6 Step 1 with its observed pass or fail result before marking this slice complete.
```

In `session-handoff.md`, add:

```text
- Hiyori local emotion overlay follow-up
  - Current status: set to `complete` only after Task 6 Step 1 and CDP smoke pass; otherwise set to `partial`.
  - Files touched: `web/hiyoriEmotionOverlayController.js`, `web/index.html`, `web/desktop.css`, `web/live2dExpressionController.js`, `web/chat.js`, `tests/test_performance_cue_frontend.js`, `web/assets/live2d-overlays/hiyori/manifest.json`, and the four overlay bitmap assets.
  - Screenshot evidence: `%USERPROFILE%\AppData\Local\Temp\ai_desktop_pet_smoke\hiyori-overlays-v1\hiyori-overlays-contact-sheet.png`.
  - Remaining risk: overlay placement/style may need human visual review.
  - Next step: user review of contact sheet.
```

- [ ] **Step 3: Final response contents**

Final response must include:

- Changed files.
- Test results.
- Screenshot/contact-sheet path.
- Whether Hiyori remains default.
- Whether any generated assets were added.
- Risks and next visual-review step.

## 2026-06-04 Visual QA Revision

The first generated hand/fist assets were rejected during live screenshot review because the body-part overlays looked detached from Hiyori. Supersede the earlier hand/fist steps with this final implementation direction:

- Replace `thinking-hand-chin.png` with `thinking-focus-lines.png`.
- Replace `angry-fist.png` with `angry-impact-lines.png`.
- Keep `thinking-ellipsis.png` and `angry-mark.png`.
- High `thinking` should suppress the old fixed `thinking-cue-bubble` when the Hiyori overlay is available.
- Final screenshot evidence should use the `hiyori-overlay-live-v4` set or later.
