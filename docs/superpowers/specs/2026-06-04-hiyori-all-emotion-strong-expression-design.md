# Hiyori All-Emotion Strong Expression Design

## Context

The current Hiyori work has improved `thinking` and `angry`, but the model still has uneven emotion readability. The user approved a stronger direction for all emotion groups, with this implementation boundary:

- Strength target: close to the readability of the improved happy reaction.
- Primary mechanism: Live2D model parameters and existing motion/runtime layers.
- Secondary mechanism: lightweight symbol overlays only when they help readability.
- Do not add external full limbs, pasted-on arms, pasted-on fists, or large body-part bitmap assets.
- Avoid the previous high-frequency `angry` twitch problem.

This spec covers Hiyori only. It does not replace the model, upgrade Cubism runtime, change LLM prompting, or change TTS.

## Goals

1. Make all major emotion groups visibly distinct in still screenshots and short motion captures.
2. Keep actions readable without rapid frame-to-frame snapping.
3. Preserve Hiyori as the default character.
4. Reuse the existing performance cue, expression, runtime motion, and overlay architecture.
5. Add regression tests for both strength and smoothness before implementation.

## Emotion Groups

### Happy / Playful

`happy` and `playful` should feel lively and responsive, not just smile changes.

Expected behavior:

- Stronger upbeat body bounce and shoulder lift.
- Head/body rhythm that is energetic but not jittery.
- Small hand/arm accent through existing model parameters.
- `playful` should be a little more teasing/asymmetric than `happy`.
- No new overlay in v1 unless visual QA shows the body expression is still too weak.

Quality boundary:

- Motion should be visibly stronger than neutral idle.
- Motion should not produce frame-to-frame head/body jumps similar to the old angry issue.

### Surprised

`surprised` should be a short, obvious reaction.

Expected behavior:

- Fast but smooth pop: raised brows, wider eyes, slight body recoil, then settle.
- Strong initial body/head accent during the first few hundred milliseconds.
- Optional tiny head-side spark or exclamation-style mark if model-only reaction is not enough.

Quality boundary:

- The pop may be quick, but it must be single-direction/rebound, not repeated twitching.
- Overlay, if used, must be a small comic symbol near the head, not a large sticker.

### Sad / Anxious

`sad` and `anxious` should become more emotionally legible while staying quiet.

Expected behavior:

- `sad`: lower head/eyes, reduced energy, shoulders slightly down or inward.
- `anxious`: smaller tense pose, slight shoulder/hand tension, slower nervous micro-motion.
- Avoid visible shake loops. Nervousness should read as held tension, not vibration.
- No overlay by default in v1.

Quality boundary:

- These emotions should be readable in comparison contact sheets.
- They should remain low-distraction and should not become theatrical.

### Neutral / Idle

`neutral` and idle should feel more alive without becoming a performance.

Expected behavior:

- Slightly richer breathing/weight shift.
- More natural gaze and tiny head/body variation.
- No overlay.
- Must remain low-distraction during non-speaking idle.

Quality boundary:

- Idle motion should be visible in a time-lapse/contact sheet but subtle in normal use.
- It must not interfere with active speech/emotion cues.

### Existing Thinking / Angry

`thinking` and `angry` already have dedicated recent work.

Expected behavior:

- Preserve the current Hiyori overlay mechanism.
- Preserve the no-external-limb rule.
- Preserve the angry smoothness regression test.
- Only tune these if the shared refactor affects them or if a comparative smoke shows a regression.

## Architecture

Use the current pipeline:

```text
runtime metadata / text fallback
  -> performanceCueController.buildPerformanceCue()
  -> chat/live2d boundary
  -> live2dExpressionController.applySpeechPerformanceCue()
  -> applySpeechPerformanceAccent()
  -> applyStyleExpressionLayer() and updateMicroMotionLayer()
  -> optional Hiyori overlay controller
```

Implementation should stay focused in these areas:

- `web/performanceCueController.js` only if profile strength/hold timing needs adjustment.
- `web/live2dExpressionController.js` for model parameter changes, smoothness envelopes, and per-emotion accent logic.
- `web/hiyoriEmotionOverlayController.js` and `web/assets/live2d-overlays/hiyori/manifest.json` only if `surprised` receives a small symbol.
- `tests/test_performance_cue_frontend.js` for all new strength/smoothness guards.

Do not introduce a new animation subsystem for this slice.

## Component Design

### Emotion Accent Profiles

Each emotion group should have an explicit runtime accent shape:

- `happy`: rhythmic bounce.
- `playful`: rhythmic bounce plus asymmetry.
- `surprised`: short pop/recoil/settle.
- `sad`: slow downward/inward pose.
- `anxious`: slow tense pose with tiny non-jitter tension.
- `neutral`: richer idle baseline, lower priority than active cues.

If this creates duplication, add small local helper functions inside `live2dExpressionController.js` rather than a broad new abstraction.

### Smoothness Guard

For every strengthened emotion, tests should sample multiple short frames and compute weighted parameter deltas.

Guard categories:

- Head/body smoothness: `ParamAngleX/Y/Z`, `ParamBodyAngleX/Y/Z`.
- Arm/hand smoothness where applicable.
- Minimum visible effect where applicable.

This is the same pattern used for the angry twitch regression.

### Optional Overlay Guard

Only `surprised` is a candidate for a new symbol overlay in this slice.

Rules:

- Symbol must be small and head-adjacent.
- Symbol must be anchored to the model box, not fixed viewport percentages.
- No external body parts.
- Overlay must disappear automatically and not persist across unrelated cues.

## Testing Plan

Use TDD before production changes.

Required RED tests:

- High `happy` has stronger visible body/head/arm movement than neutral, with bounded frame jumps.
- High `playful` differs from `happy` with asymmetric or teasing emphasis.
- High `surprised` produces a readable short pop with bounded rebound.
- High `sad` produces downward/inward pose stronger than neutral without jitter.
- High `anxious` produces tense pose stronger than sad idle but without rapid shake.
- Neutral/idle micro-motion remains lower than active high-emotion cues.
- Existing `angry` smoothness test remains green.
- Existing `thinking` overlay and snap tests remain green.

Required command checks after implementation:

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
git diff --check -- web\live2dExpressionController.js tests\test_performance_cue_frontend.js progress.md session-handoff.md
node %USERPROFILE%\.codex\skills\harness-creator\scripts\validate-harness.mjs --target D:\AI\ai_desktop_pet
```

## Visual QA

Electron/CDP contact sheets are required before claiming success.

Minimum screenshots:

- `neutral/idle`.
- `happy`.
- `playful`.
- `surprised`.
- `sad`.
- `anxious`.
- Existing `thinking` and `angry` quick regression frames.

The contact sheet should compare still readability and short-frame smoothness. If a strengthened emotion looks pasted-on, twitchy, or stylistically detached, revise before final handoff.

## Risks

- Hiyori's bundled model has limited arm/hand deformation, so some emotions may remain less expressive than a source-model edit.
- Making every emotion stronger can reduce personality subtlety if the baseline becomes too theatrical.
- Parameter-only changes can conflict with existing built-in motions.
- Additional overlays can quickly become noisy if overused.

## Out of Scope

- Replacing Hiyori.
- Editing `.cmo3` source files.
- Adding full external limb or body-part assets.
- Upgrading Cubism runtime.
- Changing LLM emotion classification.
- Changing TTS voice/prosody behavior beyond already existing cue metadata.

## Acceptance Criteria

- All target emotion groups are stronger than the current baseline.
- No emotion introduces rapid model-body twitching.
- `happy/playful/surprised/sad/anxious/neutral` each have explicit test coverage.
- Existing `thinking` and `angry` behavior does not regress.
- Electron/CDP screenshots show readable differences between emotion groups.
- Hiyori remains the default character.
