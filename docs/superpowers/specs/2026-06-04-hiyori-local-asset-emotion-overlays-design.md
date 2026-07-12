# Hiyori Local Asset Emotion Overlays Design

Last Updated: 2026-06-04

## Goal

Raise Hiyori's visible emotion ceiling without replacing the character. The first target is `thinking`; the same mechanism should then extend to `angry`.

The desired result is not another subtle Live2D parameter tweak. The user should be able to recognize the emotion in a still screenshot, closer to how `happy` already reads, while the character still looks like Hiyori.

## Scope

In scope:

- Keep the existing Hiyori model as the default character.
- Add local transparent overlay assets for Hiyori-specific hand/arm gestures and small emotion marks.
- Build a reusable runtime overlay layer that can show, animate, and hide those assets based on performance cues.
- First implement `thinking`, then reuse the same layer for `angry`.
- Preserve all existing Live2D motion, expression, TTS, LLM, and configuration compatibility.

Out of scope:

- Replacing Hiyori with Haru, Mao, or another character.
- Editing `.moc3` mesh/deformer data directly.
- Committing third-party or unlicensed model files.
- Requiring private config or provider credentials for validation.
- Making a full Live2D authoring pipeline in this slice.

## Design Decision

Use **Hiyori-matched transparent overlay assets** as the new ceiling layer.

The runtime will keep the existing Live2D model and add a small, positioned HTML/CSS overlay above the model canvas. This overlay can display hand-to-chin, crossed-arm, fist, question mark, anger mark, sweat, and impact-line assets. The assets should be lightweight PNG/WebP files with transparent backgrounds.

This is intentionally separate from Live2D `.motion3.json` and `.exp3.json`:

- Live2D motion/expression still handles subtle base movement.
- Overlay assets provide readable silhouette and semantic emotion.
- The controller coordinates both so the overlay does not feel detached from the model.

## Visual Direction

`thinking` should use:

- A Hiyori-style hand-to-chin or near-face hand pose.
- Slight head/body tilt from the existing runtime cue.
- The existing `?` bubble can remain, but the new hand pose becomes the primary read.
- Optional small ellipsis or spark mark if the hand pose alone is still unclear.

`angry` should use:

- A clenched fist or tense crossed-arm pose.
- A small anger mark near the head.
- Existing angry brow/mouth/runtime shake remains as base motion.
- Optional short impact-line jitter on entry.

The overlay should be more restrained than a sticker spam layer. It should read as a temporary animation pose attached to Hiyori, not as unrelated UI decoration.

## Architecture

### Assets

Add a local asset folder under the web app, for example:

```text
web/assets/live2d-overlays/hiyori/
```

Expected first assets:

```text
thinking-hand-chin.png
thinking-ellipsis.png
angry-fist.png
angry-mark.png
```

Exact filenames can change during implementation, but the runtime should treat assets through a small manifest so later assets can be swapped without editing controller logic.

### DOM Layer

Add a model overlay host to the model page:

```html
<div id="live2d-emotion-overlay-layer" aria-hidden="true"></div>
```

This host sits above `#live2d-canvas` and below normal controls/subtitle UI. It should not intercept pointer events.

### Controller

Create or extend a focused controller for emotion overlay state. Preferred shape:

```js
showEmotionOverlay("thinking", {
  intensity: "high",
  durationMs: 1800,
  entry: "snap",
  assets: ["thinking-hand-chin", "thinking-ellipsis"]
});
```

The existing `applySpeechPerformanceCue()` path should call this overlay controller when the normalized cue is high-value and emotion is `thinking` or `angry`.

### Positioning

The first implementation can use responsive CSS anchored to the model window rather than exact Live2D drawable coordinates. The overlay should be tuned against Hiyori's current model placement:

- thinking hand near lower face/chest
- angry fist near torso side
- marks near upper head

If the overlay drifts across window sizes, add a small placement table keyed by Hiyori profile and viewport class.

## Data Flow

1. Reply/runtime metadata produces a performance cue.
2. `applySpeechPerformanceCue()` normalizes emotion, intensity, and duration.
3. Existing Live2D runtime motion/expression still runs.
4. Emotion overlay controller receives `thinking` or `angry`.
5. Overlay layer shows the relevant transparent assets with CSS entry/hold/exit animation.
6. `clearSpeechPerformanceCue()` and cue timeout hide the overlay.

## Failure Handling

- If an overlay asset is missing, log debug state but do not crash.
- If the DOM host is missing, fall back to the existing Live2D-only cue path.
- If the cue is low intensity, do not show large overlay assets by default.
- If the model is not Hiyori, do not show Hiyori-specific assets unless explicitly allowed by profile config.

## Testing

Use TDD before production implementation.

Required tests:

- High `thinking` cue requests the Hiyori overlay controller with a hand-to-chin asset.
- `clearSpeechPerformanceCue()` hides the overlay.
- Non-`thinking` cues do not leave the thinking overlay visible.
- High `angry` cue uses the same overlay mechanism with angry assets.
- Overlay DOM exists in the model page and CSS keeps it non-interactive.
- Missing overlay host or missing assets degrades without throwing.

Visual verification:

- Electron/CDP screenshot for `thinking` high cue.
- Electron/CDP screenshot for `angry` high cue after the mechanism is reused.
- Contact sheet with idle, entry, hold, and exit frames.

## Acceptance Criteria

- Hiyori remains the default character.
- `thinking` is readable in a still screenshot without relying only on the `?` bubble.
- `angry` uses the same overlay mechanism after `thinking` proves the path.
- Existing Hiyori motion/expression files still validate as JSON.
- Node frontend tests pass.
- AGENTS-required JSON and Python compile checks pass.
- Harness validation remains 100/100.

## Risks

- Overlay art can look detached if style, scale, or placement does not match Hiyori.
- HTML overlays will not deform with Live2D perspective, so exaggerated body rotations may expose the trick.
- If generated art is used, it must be reviewed before adoption and should not introduce a character-style mismatch.
- This improves visible emotion readability but does not turn Hiyori into a fully re-authored Live2D model.

## Recommendation

Proceed with a narrow implementation plan:

1. Create a reusable Hiyori emotion overlay layer and manifest.
2. Generate or hand-assemble only the `thinking` hand-to-chin overlay first.
3. Wire it to high `thinking` cues with TDD.
4. Visual-smoke the result.
5. Reuse the same mechanism for `angry` with a fist/anger-mark overlay.

## 2026-06-04 Visual QA Revision

Electron screenshots showed that full external arm/fist bitmaps looked too much like pasted-on body parts and did not match Hiyori's existing sleeve, hand pose, or lighting. The implementation direction was narrowed after visual review:

- Do not attach full external limbs to Hiyori.
- `thinking` uses head-adjacent focus lines plus ellipsis, anchored to the current model box.
- `angry` uses a forehead anger mark plus small impact lines, anchored to the current model box.
- Model/body motion remains handled by the existing Live2D expression and motion parameter layers.
- The old fixed question-mark bubble is kept only as a fallback when the Hiyori overlay controller is unavailable.
