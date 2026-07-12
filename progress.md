# Progress

Last Updated: 2026-07-11

## Current Objective

`release-experience-alignment-v1` is complete. Select the next focused core-experience gap before expanding scope further.

## Current State

- Audit evidence: the selected GPT-SoVITS path has historically taken about 11–24 seconds for short replies, while the frontend waits for `fetch(...).blob()` before playback. The strict demo check also currently reports the local GPT-SoVITS endpoint as unavailable; text chat must remain usable when this happens.
- Active scope: start a cancellable server-TTS request for one complete stable draft sentence only while the opt-in companion-turn server-TTS path is active. Hold the audio until the canonical final turn confirms the exact prefix, then reuse it once and synthesize any remaining tail normally. Do not start Live2D/subtitles/motion during prefetch.
- Guardrails: mutable stream text must never be spoken; mismatch, cancellation, interruption, and failure must discard the prewarm safely; no memory, permission, desktop-observation, tool, or model-asset changes belong to this slice.
- `memory-continuity-v1`, `conversation-flow-v1`, and `character-performance-cue-v1` are complete.
- Current product direction: improve character feel by making reply emotion, TTS delivery, and Live2D body/expression performance work together.
- Implementation plan is saved at `docs/superpowers/plans/2026-06-03-character-performance-cue-v1.md`.
- Runtime code now routes one `performanceCue` through reply planning, TTS playback, chat-to-model desktop speech broadcast, and Live2D speech animation.
- Automated frontend verification passed, and Electron/CDP smoke verified the real `view=chat` -> `view=model` path receives the cue and can trigger visible Live2D accent motion.
- Human screenshot review found the first visible-accent pass still read as too static; the latest slice now uses the bundled model's built-in motions for readable emotion poses instead of relying only on parameter nudges.
- Online search and local inspection did not find a ready-made `hiyori_pro_t11` exp3 expression pack; the current slice adds handwritten local exp3 files while preserving the existing Hiyori appearance.
- Latest user-selected A-strength slice strengthens `angry` and `thinking` at both the exp3 resource layer and the runtime speech-accent layer, including arm/hand parameter linkage and stronger built-in motion ordering.
- User judged `thinking` was still not readable enough. The latest slice adds an explicit `?` thinking bubble overlay driven by high-`thinking` performance cues, so the emotion reads semantically rather than relying only on Live2D face/arm deformation.
- Follow-up learning from Live2D expression/motion docs: keep expression, motion, and semantic overlay roles separate. The latest fix stops routing `thinking` through the `surprised` mood expression path and gives `thinking` its own mood blend/style layer.
- Latest upper-bound pass adds a dedicated Hiyori `Thinking` motion group plus a high-`thinking` runtime B-arm pose, making the model visibly lift both hands instead of staying near idle.
- User selected B for the next enhancement: a Neuro-sama-like sudden reaction before the thinking hold. The latest slice adds an early snap/rebound to the `Thinking` motion, a runtime `snap_jitter` thinking accent, and a short pop+jitter bubble animation.
- Latest asset upper-bound probe confirmed the current Hiyori package has no editable `.cmo3` source file in this repository; further Hiyori work is bounded to runtime resources (`motion3.json`, `exp3.json`, part opacity, and controller-side parameter layering).
- Local `haru_greeter_t03` can load in the current runtime and has more built-in motions than Hiyori, but its local package has no obvious expression resources. Official `Mao` has stronger expression/motion resources but failed under the bundled `cubism4.min.js` runtime, so it requires a runtime-compatibility upgrade or compatible export before adoption.
- Hiyori all-emotion strong expression follow-up is complete for the runtime/resource path: `happy`, `playful`, `surprised`, `sad`, `anxious`, and `neutral/idle` were strengthened while preserving the recent `thinking` and smoothed `angry` behavior.
- Electron/CDP visual QA produced full and zoomed contact sheets at `%USERPROFILE%\AppData\Local\Temp\ai_desktop_pet_smoke\hiyori-all-emotions-v1\all-emotions-contact-sheet.png` and `%USERPROFILE%\AppData\Local\Temp\ai_desktop_pet_smoke\hiyori-all-emotions-v1\all-emotions-contact-sheet-zoom.png`.
- The worktree already had unrelated local modifications before this harness update; do not stage or revert unrelated files.

## What Changed

- Added state routing to `AGENTS.md`.
- Added feature tracker in `feature_list.json`.
- Added this restartable progress log.
- Added `session-handoff.md` for next-session recovery.
- Added `init.sh` as the harness verification entrypoint.
- Added `docs/superpowers/plans/2026-06-03-character-performance-cue-v1.md` for the next implementation slice.
- Implemented `character-performance-cue-v1` frontend cue routing for Live2D speech/body/expression performance.
- Added `web/performanceCueController.js` as the pure cue builder.
- Added `tests/test_performance_cue_frontend.js` and registered it in `scripts/run_node_tests.js`.
- Updated `web/index.html`, `web/live2dExpressionController.js`, `web/ttsPlaybackController.js`, `web/chat.js`, and `web/chatReplyController.js`.
- Updated `web/appStartupController.js` so desktop speech broadcast carries `performanceCue` to the model window.
- Added an explicit visible Live2D speech accent layer for high-energy cues, independent of TTS audio energy.
- Added speech cue emotion pose pinning and built-in motion dispatch for high-energy cues; happy/wave now prefers `FlickUp` with `Tap` fallback.
- Updated `tests/test_character_runtime_frontend.js` to keep the backend-runtime-metadata preference assertion aligned with the new cue layer.
- Added local `hiyori_pro_t11` exp3 files for `neutral`, `happy`, `playful`, `sad`, `anxious`, `angry`, `surprised`, and `thinking`.
- Registered those expression files in `web/models/hiyori_pro_t11/hiyori_pro_t11.model3.json`.
- Updated `web/live2dExpressionController.js` so `performanceCue` also calls the model-level `model.expression(...)` path and clears back toward `neutral`.
- Extended `tests/test_performance_cue_frontend.js` to validate hiyori expression resources and model-level expression dispatch.
- Strengthened the `angry` and `thinking` exp3 resources with bigger face, body, arm, and hand parameters.
- Strengthened runtime `angry` and `thinking` speech-performance accents so speaking cues can add arm/hand movement beyond the static expression overlay.
- Reordered high-intensity angry built-in motion dispatch to prefer `Tap@Body` before `FlickDown`, giving it a more body/arm-forward pose in the real desktop broadcast path.
- Added `#thinking-cue-bubble` to the model page, styled it in `web/desktop.css`, and wired it from `web/live2dExpressionController.js` so high-`thinking` cues show a short `?` thought bubble.
- Added a performance-cue motion order preserve option in `web/motionRuntimeController.js`, used by `web/appStartupController.js`, so explicit cue motion priorities are not reshuffled away from `Tap@Body`.
- Added `web/models/hiyori_pro_t11/motion/hiyori_thinking_01.motion3.json` and registered it as the `Thinking` motion group.
- Updated high-`thinking` motion dispatch to try `Thinking` before generic body motion fallbacks.
- Updated the runtime high-`thinking` accent to use the model's alternate B-arm part and real B-arm hand rotation parameters (`ParamHandLB/RB`) while suppressing the A-arm ghost.
- Strengthened the dedicated `Thinking` motion so visible head/body/arm pose starts inside the first 0.35 seconds instead of waiting for the hold.
- Added runtime high-`thinking` `snap_jitter` accent output with early side-snap, small jitter, and debug fields.
- Changed the `?` thought bubble animation from a simple looping float into a short pop followed by brief jitter.
- Extended frontend checks to guard early motion snap, runtime `snap_jitter`, and bubble jitter styling.
- Added `docs/superpowers/plans/2026-06-04-live2d-asset-upper-bound-and-candidate-sourcing.md` to record the Hiyori source boundary, Haru probe, and online candidate sourcing path.
- Added a `thinkingUpperBoundProbe: true` debug guard to high-`thinking` runtime accents so future tests remember the current Hiyori path is a runtime-only upper-bound probe.
- Temporarily smoke-tested local `haru_greeter_t03` and official `Live2D/CubismWebSamples` `Mao` without committing either asset or changing the default model.
- Added reusable emotion frame-sampling tests in `tests/test_performance_cue_frontend.js`, including strength and smoothness guards for high `happy`, `playful`, `surprised`, `sad`, `anxious`, and neutral/idle.
- Strengthened `web/live2dExpressionController.js` runtime accents for happy/playful body-arm motion, surprised pop/recoil, sad/anxious held poses, and neutral idle micro-life.
- Added a lightweight `surprised-spark` overlay asset under `web/assets/live2d-overlays/hiyori/`, registered it in the Hiyori overlay manifest and default overlay controller, and styled it in `web/desktop.css`.
- Stabilized emotion tests by making frame samplers set deterministic `speechAnimSeed`; this avoids random-seed false failures in smoothness checks.

## Verification Evidence

- Hiyori all-emotion strong expression verification
  - `node tests\test_performance_cue_frontend.js`
    - Result: passed.
  - `node scripts\run_node_tests.js`
    - Result: passed, ended with `[OK] Node frontend tests complete.`
  - `node --check web\live2dExpressionController.js; node --check web\hiyoriEmotionOverlayController.js; node --check tests\test_performance_cue_frontend.js`
    - Result: passed.
  - `python -m json.tool config.example.json > $null; python -m json.tool package.json > $null; python -m json.tool feature_list.json > $null; python -m json.tool web\assets\live2d-overlays\hiyori\manifest.json > $null`
    - Result: passed.
  - `python -m py_compile app.py config.py tts.py memory.py tools.py llm_client.py asr.py emotion.py humanize.py utils.py`
    - Result: passed.
  - Electron/CDP visual QA
    - Result: passed.
    - Full contact sheet: `%USERPROFILE%\AppData\Local\Temp\ai_desktop_pet_smoke\hiyori-all-emotions-v1\all-emotions-contact-sheet.png`.
    - Zoom contact sheet: `%USERPROFILE%\AppData\Local\Temp\ai_desktop_pet_smoke\hiyori-all-emotions-v1\all-emotions-contact-sheet-zoom.png`.
    - Electron PID `47508` was stopped after capture; 8123 and 9223 had no remaining listener rows.
  - `git diff --check -- web\live2dExpressionController.js web\hiyoriEmotionOverlayController.js web\desktop.css web\assets\live2d-overlays\hiyori\manifest.json tests\test_performance_cue_frontend.js progress.md session-handoff.md docs\superpowers\specs\2026-06-04-hiyori-all-emotion-strong-expression-design.md docs\superpowers\plans\2026-06-04-hiyori-all-emotion-strong-expression.md`
    - Result: passed.
  - `node %USERPROFILE%\.codex\skills\harness-creator\scripts\validate-harness.mjs --target D:\AI\ai_desktop_pet`
    - Result: passed, overall 100/100.
- `node <codex-home>\skills\harness-creator\scripts\validate-harness.mjs --target <repo-root>`
  - Result: passed, overall 100/100.
  - Subsystems: instructions 5/5, state 5/5, verification 5/5, scope 5/5, lifecycle 5/5.
- `python -m json.tool feature_list.json > $null`
  - Result: passed.
- `Test-Path docs\superpowers\plans\2026-06-03-character-performance-cue-v1.md`
  - Result: passed, returned `True`.
- `Select-String -Path docs\superpowers\plans\2026-06-03-character-performance-cue-v1.md -Pattern <plan-red-flags>`
  - Result: passed, no matches.
- `git diff --check -- docs/superpowers/plans/2026-06-03-character-performance-cue-v1.md progress.md session-handoff.md`
  - Result: passed.
- `node <codex-home>\skills\harness-creator\scripts\validate-harness.mjs --target <repo-root>`
  - Result: passed, overall 100/100.
- `node tests/test_performance_cue_frontend.js`
  - Result: passed.
- `node tests/test_character_runtime_frontend.js`
  - Result: passed after updating the source-contract assertion for `performanceCue`.
- `node scripts/run_node_tests.js`
  - Result: passed, ended with `[OK] Node frontend tests complete.`
- `node --check web/performanceCueController.js`
  - Result: passed.
- `node --check web/live2dExpressionController.js`
  - Result: passed.
- `node --check web/ttsPlaybackController.js`
  - Result: passed.
- `node --check web/chat.js`
  - Result: passed.
- `node --check web/chatReplyController.js`
  - Result: passed.
- `node --check tests/test_performance_cue_frontend.js`
  - Result: passed.
- `python -m json.tool feature_list.json > $null`
  - Result: passed.
- `python -m json.tool package.json > $null`
  - Result: passed.
- `git diff --check -- web/performanceCueController.js tests/test_performance_cue_frontend.js scripts/run_node_tests.js web/index.html web/live2dExpressionController.js web/ttsPlaybackController.js web/chat.js web/chatReplyController.js tests/test_character_runtime_frontend.js progress.md session-handoff.md docs/superpowers/plans/2026-06-03-character-performance-cue-v1.md`
  - Result: passed.
- `node %USERPROFILE%\.codex\skills\harness-creator\scripts\validate-harness.mjs --target D:\AI\ai_desktop_pet`
  - Result: passed, overall 100/100.
- `npm run start:electron`
  - Result: not used directly; Electron was launched with `node_modules\electron\dist\electron.exe --remote-debugging-port=9223 electron/main.js` for CDP inspection.
- Electron/CDP smoke
  - Result: passed.
  - Backend `/config.json` became ready on `127.0.0.1:8123`.
  - CDP found both `view=chat` and `view=model` pages on port `9223`.
  - Model page reported `modelLoaded: true`, `ttsProvider: browser`, `speakingEnabled: true`.
  - Triggered `speak("太好了！我们先这样！", { performanceCue })`; result returned `ok: true`.
  - Happy/high cue applied during speech: `speechMotionStrength: 1.9`, `bodyBoost: 1.32`, `beatBoost: 1.42`, `expressionBoost: 1.3`, and `speechMotionBlend` peaked around `0.85`.
  - Screenshot saved at `%USERPROFILE%\AppData\Local\Temp\ai_desktop_pet_smoke\character-performance-cue-model.png`.
  - Electron was closed via CDP after smoke; 8123 and 9223 were no longer reachable.
- Follow-up after human screenshot review
  - Root cause: the first smoke proved cue state changed, but the visible model barely moved because motion still depended on TTS speaking/audio state and the desktop model window did not receive the performance cue.
  - Added failing tests for visible accent motion without TTS audio, chat-to-model cue broadcast, and idempotent cue normalization.
  - `node tests/test_performance_cue_frontend.js`
    - Result: passed after fixes.
  - `node scripts/run_node_tests.js`
    - Result: passed, ended with `[OK] Node frontend tests complete.`
  - `node --check web/live2dExpressionController.js`
    - Result: passed.
  - `node --check web/appStartupController.js`
    - Result: passed.
  - `node --check web/chat.js`
    - Result: passed.
  - `node --check tests/test_performance_cue_frontend.js`
    - Result: passed.
  - `python -m json.tool config.example.json > $null`
    - Result: passed.
  - `python -m json.tool package.json > $null`
    - Result: passed.
  - `python -m json.tool feature_list.json > $null`
    - Result: passed.
  - `python -m py_compile app.py config.py tts.py memory.py tools.py llm_client.py asr.py emotion.py humanize.py utils.py`
    - Result: passed.
  - `git diff --check -- web/performanceCueController.js tests/test_performance_cue_frontend.js scripts/run_node_tests.js web/index.html web/live2dExpressionController.js web/ttsPlaybackController.js web/chat.js web/chatReplyController.js web/appStartupController.js tests/test_character_runtime_frontend.js progress.md session-handoff.md docs/superpowers/plans/2026-06-03-character-performance-cue-v1.md`
    - Result: passed.
  - Electron/CDP chat-to-model smoke
    - Result: passed.
    - Triggered high happy cue from the chat page and verified the model page received `visibleMotion: 3.2`.
    - Model page reported `cueMotionActive: true` with `speechPerformanceAccentDebug` on all sampled frames.
    - Accent output included body swing around `-5.531..3.843`, body lift around `1.112..2.951`, and shoulder lift around `0.319..0.958`.
  - Contact sheet saved at `%USERPROFILE%\AppData\Local\Temp\ai_desktop_pet_smoke\performance-broadcast-v5\contact-sheet.png`.
  - Electron was closed after smoke; 8123 and 9223 were no longer reachable.
- Second follow-up after human screenshot review
  - Root cause: the bundled `hiyori_pro_t11` model has no expression files, and parameter-only emotion is too subtle or gets overridden by the active Live2D motion/model state.
  - Model motion scan showed `FlickUp` and `Tap` are the most readable happy/energetic poses; `Flick@Body` and `FlickDown` are better for thinking/sad/low-energy variants.
  - Added failing frontend coverage for high happy/wave cue dispatching built-in motion through the desktop chat-to-model broadcast.
  - `node tests/test_performance_cue_frontend.js`
    - Result: passed after fixes.
  - Electron/CDP chat-to-model smoke v7
    - Result: passed.
    - Triggered high happy/wave cue from the chat page and verified the model page dispatched built-in motion group `FlickUp`.
  - Model page reported `cueMotionActive: true`, `visibleMotion: 3.2`, and `motionDispatch.source: performance_cue` on sampled frames.
  - Contact sheets saved at `%USERPROFILE%\AppData\Local\Temp\ai_desktop_pet_smoke\performance-motion-v7\upper-crop-sheet.png` and `%USERPROFILE%\AppData\Local\Temp\ai_desktop_pet_smoke\performance-motion-v7\full-crop-sheet.png`.
- Final verification after v7 built-in motion and harness update
  - `node --check web/live2dExpressionController.js web/appStartupController.js web/chat.js tests/test_performance_cue_frontend.js`
    - Result: passed.
  - `node tests/test_performance_cue_frontend.js`
    - Result: passed.
  - `node scripts/run_node_tests.js`
    - Result: passed, ended with `[OK] Node frontend tests complete.`
  - `python -m json.tool config.example.json`, `python -m json.tool package.json`, `python -m json.tool feature_list.json`
    - Result: passed.
  - `python -m py_compile app.py config.py tts.py memory.py tools.py llm_client.py asr.py emotion.py humanize.py utils.py`
    - Result: passed.
  - `git diff --check -- <touched feature files and harness docs>`
    - Result: passed.
  - `node %USERPROFILE%\.codex\skills\harness-creator\scripts\validate-harness.mjs --target D:\AI\ai_desktop_pet`
    - Result: passed, overall 100/100.
  - Smoke Electron processes launched for CDP verification were closed after validation.
- Multi-emotion follow-up smoke
  - Triggered `surprised`, `thinking`, `sad`, `anxious`, `angry`, and `playful` through the local chat-to-model `BroadcastChannel("taffy-speech")` path.
  - Smoke v2 confirmed built-in motion dispatches: `surprised -> Flick`, `thinking/sad -> Flick@Body`, `anxious/angry -> FlickDown`, `playful -> FlickUp`.
  - Contact sheet saved at `%USERPROFILE%\AppData\Local\Temp\ai_desktop_pet_smoke\performance-other-emotions-v2\combined-upper-overview.png`.
  - Visual result: `playful` is strong; `sad`, `thinking`, and `anxious` read as low/internal poses; `surprised` is modest but has readable open-mouth/alert expression; `angry` still reads weak/ambiguous on this model.
  - Added an angry speech-performance accent branch for lowered brow, tense mouth, head/body shake, and arm/hand emphasis, guarded by `tests/test_performance_cue_frontend.js`.
  - Smoke v3 after the angry accent branch still showed `angry` is visually limited on `hiyori_pro_t11`; the stronger `FlickUp` probe is more visible but reads too happy, so it was not adopted as the default angry mapping.
  - Contact sheets saved at `%USERPROFILE%\AppData\Local\Temp\ai_desktop_pet_smoke\performance-other-emotions-v3\combined-upper-overview.png` and `%USERPROFILE%\AppData\Local\Temp\ai_desktop_pet_smoke\performance-angry-flickup-probe\upper-crop-sheet.png`.
  - Final verification after multi-emotion tuning:
    - `node --check web/live2dExpressionController.js tests/test_performance_cue_frontend.js`: passed.
    - `node tests/test_performance_cue_frontend.js`: passed.
    - `node scripts/run_node_tests.js`: passed, ended with `[OK] Node frontend tests complete.`
    - JSON checks for `config.example.json`, `package.json`, and `feature_list.json`: passed.
    - Python compile checks for the required project modules: passed.
    - `git diff --check -- web/live2dExpressionController.js tests/test_performance_cue_frontend.js progress.md session-handoff.md`: passed.
    - Harness validation: passed, overall 100/100.
- Model/expression resource follow-up
  - Online check: the official Live2D sample page lists Hiyori Momose sample/runtime packages but does not list standalone `Expression data (exp3.json)` for Hiyori; broader search did not find `hiyori_pro_t11` exp3 files.
  - Added handwritten local exp3 resources under `web/models/hiyori_pro_t11/expressions/`.
  - `node tests/test_performance_cue_frontend.js`: passed.
  - `node scripts/run_node_tests.js`: passed, ended with `[OK] Node frontend tests complete.`
  - `node --check web/live2dExpressionController.js`: passed.
  - `node --check tests/test_performance_cue_frontend.js`: passed.
  - `python -m json.tool web\models\hiyori_pro_t11\hiyori_pro_t11.model3.json`: passed.
  - JSON checks for all `web\models\hiyori_pro_t11\expressions\*.exp3.json`: passed.
  - AGENTS JSON checks for `config.example.json`, `package.json`, and `feature_list.json`: passed.
  - AGENTS Python compile checks for required project modules: passed.
  - `git diff --check -- <hiyori expression resources, Live2D controller, performance cue test>`: passed.
  - Harness validation: passed, overall 100/100.
  - Electron/CDP smoke: passed. Model page loaded expression manager with `neutral/happy/playful/sad/anxious/angry/surprised/thinking`; `applySpeechPerformanceCue` selected `angry` and `happy` with `ok: true`.
  - Smoke screenshots saved under `%USERPROFILE%\AppData\Local\Temp\ai_desktop_pet_smoke\hiyori-exp3-v1\`.
- Angry/thinking A-strength follow-up
  - User selected A: stronger but still recoverable arm/hand linkage for `angry` and `thinking`.
  - Added static guards for strong `angry` brow/mouth/arm-hand resources and strong `thinking` head/eye/arm-hand resources.
  - Added dynamic guard for high-`thinking` runtime cue output and raised the high-`angry` arm/hand runtime threshold.
  - Added broadcast-source guard that high-`angry` tries built-in motion groups in `Tap@Body`, then `FlickDown` order.
  - `node tests/test_performance_cue_frontend.js`: passed.
  - `node --check web\appStartupController.js`: passed.
  - `node --check web\live2dExpressionController.js`: passed.
  - `node --check tests\test_performance_cue_frontend.js`: passed.
  - `node scripts\run_node_tests.js`: passed, ended with `[OK] Node frontend tests complete.`
  - JSON checks for `web\models\hiyori_pro_t11\expressions\angry.exp3.json` and `thinking.exp3.json`: passed.
  - Electron/CDP visual smoke generated the strength-v2 contact sheets and wrapper-motion frames.
  - Strength-v2 screenshots saved under `%USERPROFILE%\AppData\Local\Temp\ai_desktop_pet_smoke\hiyori-exp3-strength-v2\`.
  - Visual result: `thinking` now reads clearly stronger, including an arm/hand pose; `angry` face/body improved and real dispatch now uses `Tap@Body`, but the bundled model still limits how rage-like the hand/arm deformation can become.
  - Final validation after updating harness docs:
    - `node tests\test_performance_cue_frontend.js`: passed.
    - `node --check web\appStartupController.js`: passed.
    - `node --check web\live2dExpressionController.js`: passed.
    - `node --check tests\test_performance_cue_frontend.js`: passed.
    - `node scripts\run_node_tests.js`: passed, ended with `[OK] Node frontend tests complete.`
    - AGENTS JSON checks for `config.example.json`, `package.json`, and `feature_list.json`: passed.
    - Expression JSON checks for `angry.exp3.json` and `thinking.exp3.json`: passed.
    - AGENTS Python compile checks for required project modules: passed.
    - `git diff --check -- <A-strength touched files and harness docs>`: passed, with only Git's line-ending warning for `.gitignore`.
    - Harness validation: passed, overall 100/100.
- Thinking symbol follow-up
  - User judged the strengthened `thinking` pose still did not read as thinking.
- Added a visible `?` thought bubble overlay that is shown only for high-`thinking` performance cues and hidden for other cues or `clearSpeechPerformanceCue()`.
- Added tests that `thinking` reveals the bubble, non-`thinking` hides it, clear hides it, HTML contains the bubble node, and CSS defines the visible state.
- Added `preserveGroupOrder` support for performance-cue built-in motion dispatch so explicit `Tap@Body` priority is kept even after another motion was just played.
- Learned adjustment pass:
  - `thinking` no longer aliases to `surprised` for runtime mood expression.
  - `getSmoothedMoodExpression()` now tracks a separate `thinking` blend.
  - `applyStyleExpressionLayer()` consumes `thinkingBlend` with side glance, tilted head/body, and closed-mouth thinking cues instead of surprise-open-eye cues.
  - `ponder`, `thinking`, and `consider` action metadata normalize to the `think` action cue.
  - `node tests\test_performance_cue_frontend.js`: passed.
  - `node --check web\live2dExpressionController.js`, `web\appStartupController.js`, `web\motionRuntimeController.js`, and `tests\test_performance_cue_frontend.js`: passed.
  - Expression JSON checks for `angry.exp3.json` and `thinking.exp3.json`: passed.
  - Electron/CDP visual smoke confirmed `thinking-cue-bubble` exists, is visible, has text `?`, and `thinking` dispatches `Tap@Body`.
  - Electron/CDP v3 confirmed `moodExpressionWeightMood: "thinking"`, `moodExpressionRuntimeMood: "thinking"`, `surprised: 0`, and visible `?` bubble.
  - Latest screenshot saved at `%USERPROFILE%\AppData\Local\Temp\ai_desktop_pet_smoke\hiyori-thinking-symbol-v3\thinking-cue-symbol.png`.
  - Final validation after the learning-based adjustment:
    - `node tests\test_performance_cue_frontend.js`: passed.
    - `node --check web\performanceCueController.js`, `web\live2dExpressionController.js`, `web\appStartupController.js`, `web\motionRuntimeController.js`, and `tests\test_performance_cue_frontend.js`: passed.
    - `node scripts\run_node_tests.js`: passed, ended with `[OK] Node frontend tests complete.`
    - AGENTS JSON checks for `config.example.json`, `package.json`, and `feature_list.json`: passed.
    - Expression JSON checks for `angry.exp3.json` and `thinking.exp3.json`: passed.
    - AGENTS Python compile checks for required project modules: passed.
    - `git diff --check -- <thinking/angry cue files and harness docs>`: passed.
    - Harness validation: passed, overall 100/100.
    - Electron preview process was closed; ports `8123` and `9223` were confirmed closed.
- Thinking motion upper-bound follow-up
  - Added dedicated model motion resource `web\models\hiyori_pro_t11\motion\hiyori_thinking_01.motion3.json`.
  - Registered a `Thinking` motion group in `web\models\hiyori_pro_t11\hiyori_pro_t11.model3.json`.
  - Changed high-`thinking` performance-cue dispatch to prefer `Thinking`, then fall back to `Tap@Body`, `Flick@Body`, and `FlickDown`.
  - Runtime thinking accent now switches toward `PartArmB`, drives `ParamArmLB`, `ParamHandLB`, and `ParamHandRB`, and reduces `PartArmA` to `0.02` during the cue to avoid the old-arm ghost.
  - `node tests\test_performance_cue_frontend.js`: passed after RED/GREEN coverage for the `Thinking` motion group, B-arm hand rotation, and A-arm ghost guard.
  - `node --check web\live2dExpressionController.js`, `web\appStartupController.js`, and `tests\test_performance_cue_frontend.js`: passed.
  - JSON checks for `web\models\hiyori_pro_t11\hiyori_pro_t11.model3.json` and `web\models\hiyori_pro_t11\motion\hiyori_thinking_01.motion3.json`: passed.
  - `node scripts\run_node_tests.js`: passed, ended with `[OK] Node frontend tests complete.`
  - Electron visual smoke confirmed `lastDispatch.group: "Thinking"`, `PartArmA: 0.02`, `PartArmB: 0.881`, `ParamArmLB: 7.495`, `ParamHandLB: -7.582`, and visible `?` bubble.
  - Latest screenshot saved at `%USERPROFILE%\AppData\Local\Temp\ai_desktop_pet_smoke\hiyori-thinking-runtime-v2\thinking-runtime-peak.png`.
  - Final validation after handoff updates:
    - AGENTS JSON checks for `config.example.json`, `package.json`, and `feature_list.json`: passed.
    - AGENTS Python compile checks for required project modules: passed.
    - `git diff --check -- <thinking motion/resource/runtime/test/handoff files>`: passed.
    - Harness validation: passed, overall 100/100.
    - Port/process cleanup check returned no project Electron/Python process and no `8123`/`9223` listener rows.
- Thinking snap-jitter B follow-up
  - User selected B: Neuro-sama-like sudden reaction rather than a large theatrical movement.
  - Added failing coverage first:
    - `node tests\test_performance_cue_frontend.js`
    - Initial result: failed as expected on `Thinking motion should snap into a visible pose during the first 0.35s`.
  - Updated `web\models\hiyori_pro_t11\motion\hiyori_thinking_01.motion3.json` with early snap/rebound keyframes and corrected `Meta.TotalSegmentCount` / `Meta.TotalPointCount`.
  - Updated `web\live2dExpressionController.js` so high-`thinking` speech accents expose `thinkingReactionMode: "snap_jitter"` and add early `ParamAngleX` side-snap plus body/hand jitter.
  - Updated `web\desktop.css` so `#thinking-cue-bubble` pops once and briefly jitters instead of only floating.
  - Verification:
    - `node tests\test_performance_cue_frontend.js`: passed.
    - `node --check web\live2dExpressionController.js`: passed.
    - `node --check tests\test_performance_cue_frontend.js`: passed.
    - `python -m json.tool web\models\hiyori_pro_t11\motion\hiyori_thinking_01.motion3.json`: passed.
    - `python -m json.tool web\models\hiyori_pro_t11\hiyori_pro_t11.model3.json`: passed.
    - `node scripts\run_node_tests.js`: passed, ended with `[OK] Node frontend tests complete.`
    - AGENTS JSON checks for `config.example.json`, `package.json`, and `feature_list.json`: passed.
    - AGENTS Python compile checks for required project modules: passed.
    - `git diff --check -- <thinking snap touched files>`: passed.
  - Electron/CDP visual smoke:
    - Triggered a high-`thinking` cue directly on the model page.
    - Runtime confirmed `thinkingReactionMode: "snap_jitter"`, early `thinkingSnap: 0.895`, visible `?` bubble, `PartArmA: 0.02`, `PartArmB: 0.951`, and later hold/jitter frames with strong negative head/body/hand pose.
    - Screenshots saved under `%USERPROFILE%\AppData\Local\Temp\ai_desktop_pet_smoke\hiyori-thinking-snap-v1\`.
    - Review contact sheet saved at `%USERPROFILE%\AppData\Local\Temp\ai_desktop_pet_smoke\hiyori-thinking-snap-v1\thinking-snap-contact-sheet.png`.
    - Smoke process was closed after capture; follow-up port check showed no `8123` or `9223` listener.
- Live2D asset upper-bound and candidate sourcing follow-up
  - Hiyori source-resource boundary:
    - `Get-ChildItem -Recurse -Filter *.cmo3 -File .`: returned no `.cmo3` files.
    - Current Hiyori package remains runtime-only; true mesh/deformer/art changes require a source `.cmo3` or replacement asset.
  - TDD harness guard:
    - Added `thinkingUpperBoundProbe` assertion to `tests/test_performance_cue_frontend.js`.
    - Initial targeted test failed as expected on the missing debug field.
    - Added `thinkingUpperBoundProbe: true` in `web/live2dExpressionController.js`.
    - `node tests\test_performance_cue_frontend.js`: passed after fix.
  - Local Haru candidate:
    - `docs\live2d\models\haru_greeter_t03\haru_greeter_t03.model3.json`: JSON check passed.
    - Offline scoring found strongest local Haru motions: `haru_g_m20`, `haru_g_m19`, `haru_g_m10`, and `haru_g_m22`.
    - Electron/CDP probe loaded Haru successfully with `Idle=6`, `Use=15`.
    - Contact sheet saved at `%USERPROFILE%\AppData\Local\Temp\ai_desktop_pet_smoke\haru-candidate-v1\haru-contact-sheet.png`.
    - Visual read: `m10` gives the clearest arm spread; `m20/m19/m22` are usable but still not a decisive `thinking` replacement. Local copy lacks obvious expression files.
  - Online candidate sourcing:
    - Official Live2D sample page confirms many sample packages include runtime folders with `.moc3`, `.motion3.json`, `.model3.json`, physics/display files, and, for some models, `exp3.json`; it also requires the Free Material License Agreement and sample-data terms.
    - Candidate table:
      - `Epsilon` | `https://www.live2d.com/en/learn/sample/` | advertised as a standard model with tears, anger mark, and expression effects | promising for `angry` readability | license terms require review before redistribution | next action: manual download/probe only after approval.
      - `Haru` official sample | `https://www.live2d.com/en/learn/sample/` | supports arm and outfit changes plus audio | promising for body/arm readability | license terms require review before redistribution | next action: manual download/probe if we want a non-Hiyori avatar direction.
      - `Shizuku` | `https://www.live2d.com/en/learn/sample/` | described as having fine hand movements | promising for subtle hand emotion | license terms require review before redistribution | next action: probe only if current Cubism export is compatible.
      - `Koharu & Haruto` | `https://www.live2d.com/en/learn/sample/` | expression effects plus many large movements | strongest for exaggerated cute reactions, but SD-style | license terms require review before redistribution | next action: consider only if style change is acceptable.
      - `Mao` from `https://github.com/Live2D/CubismWebSamples` | 8 expressions, `Idle=2`, `TapBody=6` | strongest inspected metadata | official sample repo, but still subject to Live2D terms | next action: blocked until runtime compatibility is solved.
    - Official `Mao` probe:
      - Temporarily cloned `Live2D/CubismWebSamples` with sparse checkout to `%TEMP%\ai_desktop_pet_live2d_candidates`.
      - Static inspection confirmed 8 expressions and high-scoring `special_01/02/03` motions.
    - Runtime probe failed on `Live2DModel.from('/models/mao_probe/Mao.model3.json')` with `Unknown error` inside `vendor/cubism4.min.js`.
    - Decision: do not import Mao into the app until the bundled Cubism runtime is upgraded or an older compatible export is used.
    - Temporary probe directories `web\models\haru_greeter_t03_probe` and `web\models\mao_probe` were removed, and final port check returned no `8123` or `9223` listeners.
  - Final validation after recording the asset decision:
    - `node tests\test_performance_cue_frontend.js`: passed.
    - `node scripts\run_node_tests.js`: passed, ended with `[OK] Node frontend tests complete.`
    - `node --check web\live2dExpressionController.js`: passed.
    - `node --check tests\test_performance_cue_frontend.js`: passed.
    - JSON checks for `config.example.json`, `package.json`, `feature_list.json`, `web\models\hiyori_pro_t11\hiyori_pro_t11.model3.json`, and `web\models\hiyori_pro_t11\motion\hiyori_thinking_01.motion3.json`: passed.
    - AGENTS Python compile checks for required project modules: passed.
    - `git diff --check -- <asset-probe touched tracked paths>`: passed.
    - Trailing-whitespace checks for `progress.md`, `session-handoff.md`, and the asset-probe plan file: passed.
    - Harness validation: passed, overall 100/100.
    - Port cleanup check returned no `8123` or `9223` listeners.
- Hiyori local emotion overlay follow-up
  - Result: improved, with Hiyori kept as the default character.
  - Added a Hiyori-specific overlay manifest/controller for high-intensity `thinking` and `angry` performance cues.
  - Initial full hand/fist overlay assets were rejected in visual QA because they looked like pasted-on body parts.
  - Final assets avoid external limbs:
    - `thinking`: `thinking-focus-lines.png` plus `thinking-ellipsis.png`.
    - `angry`: `angry-impact-lines.png` plus `angry-mark.png`.
  - Overlay placement is anchored to the current Live2D model box instead of fixed viewport percentages.
  - High `thinking` suppresses the old fixed `?` bubble when the Hiyori overlay is available; the old bubble remains as a fallback.
  - Verification passed so far:
    - `node tests\test_performance_cue_frontend.js`
    - `node --check web\hiyoriEmotionOverlayController.js`
    - `node --check web\live2dExpressionController.js`
    - `node --check web\chat.js`
    - `python -m json.tool web\assets\live2d-overlays\hiyori\manifest.json`
  - Electron/CDP visual smoke:
    - `thinking` v4 screenshot: `%USERPROFILE%\AppData\Local\Temp\ai_desktop_pet_smoke\hiyori-overlay-live-v4\thinking-high.png`.
    - `angry` v4 screenshot: `%USERPROFILE%\AppData\Local\Temp\ai_desktop_pet_smoke\hiyori-overlay-live-v4\angry-high.png`.
    - Asset contact sheet: `%USERPROFILE%\AppData\Local\Temp\ai_desktop_pet_smoke\hiyori-overlay-assets-v2\asset-contact-sheet.png`.
- Angry model twitch follow-up
  - Result: improved model-body smoothness.
  - Root cause: high `angry` speech accent used high-frequency head/body counter-shake (`sin(now / 74)`) plus arm clench, which produced large 33ms frame-to-frame jumps.
  - Added regression coverage in `tests\test_performance_cue_frontend.js` to cap high-`angry` frame-to-frame jumps for head, body, and arm parameters.
  - Updated `web\live2dExpressionController.js` high-`angry` branch from rapid shake to slower held-tension motion.
  - Electron/CDP visual smoke contact sheet: `%USERPROFILE%\AppData\Local\Temp\ai_desktop_pet_smoke\hiyori-angry-smooth-v1\angry-smooth-contact-sheet.png`.
  - Verification passed so far:
    - `node tests\test_performance_cue_frontend.js`
- Reply/TTS/subtitle smoke on 2026-07-05
  - Result: current local project can produce a backend reply, browser TTS can be triggered from the frontend, and the subtitle layer displays the spoken text.
  - `powershell -NoProfile -ExecutionPolicy Bypass -File scripts\test-local.ps1`
    - Result: partial pass.
    - Python tests passed: `425 passed`.
    - Node frontend tests passed, including chat API, speech text, TTS API, character runtime, and performance cue checks.
    - Python syntax and JavaScript syntax checks passed.
    - Final `scripts\check_secrets.py` step failed on existing private local Windows paths in documentation/state files.
  - `powershell -NoProfile -ExecutionPolicy Bypass -File scripts\first_chat_smoke.ps1 -Message "请用一句中文回复：测试通过。" -NoStartServer`
    - Result: passed.
    - First-run preflight passed with 4 warnings.
    - Existing backend was reachable at the configured local server.
    - `/api/health` reported config, Live2D, server, and LLM basics OK.
    - `/api/llm_probe` returned text.
    - `/api/chat` returned a non-empty reply.
  - API health summary:
    - Result: passed.
    - Overall status `ok`; `config_load`, `live2d_model_path`, `server`, `llm`, and `tts` were true.
    - TTS provider was `browser`; no blocking readiness checks were reported.
  - Electron/CDP frontend smoke:
    - Result: passed.
    - Opened the model page against the existing backend without starting the Electron main process.
    - `window.speak("字幕和语音测试通过", { force: true, interrupt: true })` returned `true`.
    - `#subtitle-layer` became visible and `.subtitle-en` contained `字幕和语音测试通过`.
    - `speechSynthesis` reported no pending, paused, or speaking queue after the sample finished.
    - Temporary Electron/project backend processes were stopped after the smoke; no project `electron.exe` or `app.py` process was left running.
- GPT-SoVITS TTS routing fix on 2026-07-05
  - Result: fixed local TTS routing so the app uses GPT-SoVITS instead of browser speech.
  - Root cause: both base and local runtime config had `tts.provider` set to `browser`, so the frontend never attempted server TTS.
  - Updated local runtime config:
    - `tts.provider`: `gpt_sovits`
    - `tts.gpt_sovits_timeout_sec`: `120`
    - `tts.server_request_timeout_ms`: `120000`
    - `tts.allow_browser_fallback`: `false`
  - Direct GPT-SoVITS service probe:
    - `POST http://127.0.0.1:9880/tts` with a short English test returned `200`, `audio/wav`, and a RIFF/WAVE header.
  - Project backend verification:
    - `python -m json.tool config.local.json`: passed.
    - Merged config reported `tts.provider=gpt_sovits`, `gpt_sovits_timeout_sec=120`, and `allow_browser_fallback=false`.
    - `/api/tts` returned `200`, `audio/wav`, and a RIFF/WAVE header through the project backend.
    - `/config.json` exposed `tts.provider=gpt_sovits` to the frontend.
    - `/api/health` reported TTS provider `gpt_sovits`, server TTS provider true, browser fallback false, and no blocking readiness checks.
  - Electron/CDP frontend verification:
    - Started Electron with a temporary debug port.
    - Model page state reported `provider: gpt_sovits` and `window.electronAPI` available.
    - `window.speak("OK.", { force: true, interrupt: true })` returned `true`.
    - Frontend requested `/api/tts`, which returned `200`, `audio/wav`, and a RIFF/WAVE header.
    - Subtitle layer became visible and showed `OK.`.
    - Temporary Electron/project backend processes were stopped after the smoke; GPT-SoVITS itself remained running.
- Live2D model drag follow-up
  - Result: improved Electron model drag reliability.
  - User-reported issue: Live2D model could not be moved after launching the desktop app.
  - Diagnosis:
    - Backend health check was reachable at `/healthz`.
    - `%USERPROFILE%\AppData\Roaming\Electron\window-state.json` had `locked: false`, so the app was not blocked by the window lock.
    - The likely failure path was Electron transparent click-through: the model window starts with `setIgnoreMouseEvents(true, { forward: true })`, but the old frontend path only used in-page `mousemove` to turn click-through off near the visible model area.
  - Fix:
    - `web\live2dLayoutController.js` now keeps click-through disabled while model drag data exists, not only while subtitle/window dragging.
    - Added a cursor-position polling fallback that maps Electron screen cursor coordinates into the model window and updates click-through even when the transparent window does not receive `mousemove`.
    - `tests\test_drag_logic.js` now guards the new Electron click-through polling path.
  - Verification passed:
    - `node tests\test_drag_logic.js`
    - `node --check web\live2dLayoutController.js`
    - `node --check tests\test_drag_logic.js`
    - `node scripts\run_node_tests.js`
- Startup chat-window first-frame flash follow-up
  - Result: fixed the startup frames where the chat window briefly showed an oversized circular avatar/image layout before the final UI settled.
  - Diagnosis:
    - `web\index.html` initially rendered the chat panel before `chat.js` ran `applyDisplayModeFromUrl()`.
    - The existing large-avatar safety guard was scoped to `body.view-chat`, so the first paint could expose the raw hero avatar image before the `view-chat` class existed.
  - Fix:
    - Added an inline startup script at the start of `body` in `web\index.html` to apply `view-*`, `desktop-mode`, `transparent-mode`, and alpha classes before the panel DOM is parsed.
    - Added base `.panel .hero-avatar` and `.panel .hero-avatar > img` sizing guards in `web\base.css` so the avatar is constrained even before the final view-specific CSS takes over.
    - Added static frontend checks in `tests\test_first_run_frontend.js`.
  - Verification passed:
    - `node tests\test_first_run_frontend.js`
    - `node --check tests\test_first_run_frontend.js`
    - `node --check web\chat.js`
    - `node scripts\run_node_tests.js`
    - `git diff --check -- web\index.html web\base.css tests\test_first_run_frontend.js`
    - Local server check confirmed `/` serves the startup script and `/base.css` serves the avatar guard.
- Electron always-on-top config follow-up
  - Result: desktop windows now respect `desktop.always_on_top`, and the model remains draggable when the setting is false.
  - User-reported issue: Live2D model stayed above other pages/windows by default.
  - Diagnosis:
    - `config.json` and `config.example.json` already had `desktop.always_on_top: false`.
    - `electron\main.js` still hard-coded the model window as `alwaysOnTop: true` and called `setAlwaysOnTop(true)` for both model and chat windows.
    - Follow-up regression: after removing always-on-top, the model was not draggable because the model window still used `focusable: false`; on Windows, a transparent non-topmost non-focusable window is unreliable for mouse input.
  - Fix:
    - Added `shouldKeepWindowsAlwaysOnTop()` in `electron\main.js`.
    - `BrowserWindow` creation and post-create `setAlwaysOnTop(...)` now use the config-derived value.
    - Model window now uses `focusable: false` only when it is always-on-top; when it is not always-on-top, it is focusable so visible model areas can receive drag input.
    - Added `tests\test_electron_window_config.js` to guard against reintroducing hard-coded always-on-top behavior.
  - Verification passed:
    - `node tests\test_electron_window_config.js`
    - `node --check electron\main.js`
    - `node --check tests\test_electron_window_config.js`
    - `node tests\test_drag_logic.js`
    - `node scripts\run_node_tests.js`
    - Local config check confirmed `desktop.always_on_top = false`.
    - Electron app was restarted and `/healthz` returned 200.

## Risks

- Existing dirty worktree can make unrelated changes easy to mix into future commits.
- `init.sh` delegates to the existing PowerShell test workflow; on machines without PowerShell, use the documented targeted commands directly.
- Visual tuning is still subjective; CDP and contact-sheet evidence now show readable built-in action for happy/playful and partial coverage for several non-happy moods, but angry is not visually reliable with the bundled model.
- Because the bundled Live2D model lacks expression files, future emotion readability work should prefer known motion groups or a stronger avatar asset/runtime before spending more time on small parameter-only expression tuning.
- Handwritten exp3 files improve expression-manager coverage, but they are still parameter-only overlays on the existing `.moc3`; `angry` is more controllable now and has body/arm linkage, while `thinking` now uses a dedicated motion, runtime B-arm pose, and overlay symbol for clear semantic readability.
- The new B-arm thinking pose and snap-jitter timing are much more visible, but the exact silhouette is constrained by Hiyori's bundled alternate-arm artwork; it reads closer to "hesitating/thinking with a sudden reaction" than a true hand-to-chin pose.
- Replacing the model is now the higher-leverage route, but it has two separate risks: visual style drift and runtime/license compatibility. Haru is runtime-compatible but not clearly stronger for expressions; Mao is resource-strong but currently runtime-incompatible.
- Full chat-to-LLM reply smoke has now been run locally against the configured provider; future agents should still avoid exposing private runtime config or API keys.

## Next

1. Human-review `%USERPROFILE%\AppData\Local\Temp\ai_desktop_pet_smoke\haru-candidate-v1\haru-contact-sheet.png` against the current Hiyori thinking snap sheet.
2. Keep Hiyori as default for now unless the product direction accepts a character/style change.
3. If replacing assets, prefer a two-step spike: first upgrade/prove Cubism runtime compatibility with official sample assets, then manually probe official `Epsilon`, `Haru`, `Shizuku`, or `Koharu & Haruto` after license review.

## Model-Direct Reply Follow-up on 2026-07-05

- Result: local reply generation is now configured to bypass template-like character brain reply shaping and runtime metadata parsing.
- User direction: remove templated reply behavior and let the model produce the answer.
- Root cause of the irrelevant screenshot reply:
  - The exact line `Hm. The desktop air just shifted. Suspicious, but continue.` existed as a hard-coded casual fallback in `character_brain.py`.
  - `memory.json` also contained prior turns where `祝我好运哦` was paired with that irrelevant fallback, so history could reinforce the bad pattern.
  - The input was hand-typed, so ASR was not the cause for that example.
- Fix:
  - Added `character_runtime.model_direct_reply` and preserved it through `config.py`.
  - In model-direct mode, `app.py` no longer builds character brain decisions, no longer injects the character brain prompt block, and no longer returns character brain metadata.
  - In model-direct mode, `app_reply_pipeline.py` returns the raw model text without character runtime normalization, metadata merging, language guard rewrites, or character brain reply constraints.
  - `config.local.json` now sets `character_runtime.enabled=false`, `return_metadata=false`, `auto_apply_reply_cue=false`, and `model_direct_reply=true`.
  - Removed the temporary hard-coded good-luck fallback that had been added during diagnosis before the user clarified the desired direction.
- Verification:
  - `python -m pytest tests\test_app_reply_pipeline.py tests\test_character_brain.py tests\test_character_runtime_integration.py::test_character_runtime_settings_default_demo_stable_off tests\test_character_runtime_integration.py::test_character_runtime_settings_demo_stable_requires_runtime_enabled -q`
    - Result: passed, `61 passed`.
  - `python -m json.tool config.local.json > $null; python -m json.tool config.example.json > $null; python -m json.tool package.json > $null`
    - Result: passed.
  - `python -m py_compile app.py app_reply_pipeline.py config.py character_brain.py character_brain_intent_strategy.py`
    - Result: passed.
  - `git diff --check -- app.py app_reply_pipeline.py config.py character_brain.py character_brain_intent_strategy.py tests/test_app_reply_pipeline.py tests/test_character_brain.py config.local.json`
    - Result: passed.
  - Direct internal probe with real `load_config()`:
    - `model_direct_reply=True`, `runtime_enabled=False`.
    - `_build_base_prompt(...)` did not set `_character_brain_decision`.
    - The generated base prompt did not include the character brain block.
    - `_apply_character_brain_reply_text(...)` preserved `Good luck. I am with you.` unchanged.
    - `_build_character_brain_response_payload(...)` returned no payload.
  - Project was restarted; `/config.json` reported `tts.provider=gpt_sovits`, `character_runtime.enabled=false`, `model_direct_reply=true`, `return_metadata=false`, and `auto_apply_reply_cue=false`.
- Remaining manual check:
  - Command-line `/api/chat` verification was blocked by local API token mismatch (`Invalid API token`) when called outside Electron. The app itself uses Electron-authenticated requests; manually send `祝我好运哦` in the chat window to judge the model's actual content and provider latency.

## GPT-SoVITS Short English Stability Follow-up on 2026-07-05

- Result: reduced the GPT-SoVITS short-English artifact path that made `Alright, alright—I got it the first time. Go sleep.` sound like a long `aaa` before `Go sleep`.
- Diagnosis:
  - The GPT-SoVITS service on port `9880` became stuck during repeated probes and had to be restarted.
  - Direct comparison showed the dangerous path was an empty `prompt_text` candidate with the English reference audio:
    - Matching `prompt_text`, stable sampling: returned WAV in about 15.3s, `430124` bytes, about `6.72s`.
    - Empty `prompt_text`, higher sampling: returned WAV in about 44.8s, `1450284` bytes, about `22.66s`, consistent with long leading vocalization.
  - The screenshot sentence also contains an em dash and repeated `Alright`, which the current GPT-SoVITS model can vocalize poorly.
- Fix:
  - `config.py` default `tts.gpt_sovits_prefer_clean_prompt` is now `false`.
  - `tts.py` now defaults `gpt_sovits_prefer_clean_prompt` to `false` if not configured.
  - `config.local.json` now uses the matching English prompt text first, with more stable local sampling:
    - `gpt_sovits_prefer_clean_prompt=false`
    - `gpt_sovits_top_k=8`
    - `gpt_sovits_top_p=0.78`
    - `gpt_sovits_temperature=0.36`
    - `gpt_sovits_repetition_penalty=1.12`
    - `gpt_sovits_speed=0.95`
    - `gpt_sovits_timeout_sec=30`
    - `gpt_sovits_chunk_timeout_sec=15`
    - `gpt_sovits_chunk_max_candidates=1`
    - `server_request_timeout_ms=30000`
  - `tts.py` TTS-only text normalization now converts English dash pauses to normal sentence pauses and collapses repeated leading filler such as `Alright, alright` to one `Alright`.
- Verification:
  - `python -m pytest tests\test_tts_language.py tests\test_config_asr_defaults.py -q`
    - Result: passed, `23 passed`.
  - `python -m py_compile tts.py config.py`
    - Result: passed.
  - `python -m json.tool config.local.json > $null; python -m json.tool config.example.json > $null; python -m json.tool package.json > $null`
    - Result: passed.
  - `git diff --check -- tts.py config.py config.local.json tests/test_tts_language.py`
    - Result: passed.
  - Normalization probe:
    - Input: `Alright, alright—I got it the first time. Go sleep.`
    - TTS text: `Alright. I got it the first time. Go sleep.`
  - Short `Go sleep.` project-path synthesis after restart:
    - Result: returned WAV, `46398` bytes, about `0.724s` audio.
    - GPT-SoVITS still took about `24.2s`, so speed remains a model/service limitation.
- Restart:
  - Restarted GPT-SoVITS; it is listening on `127.0.0.1:9880`.
  - Restarted the desktop project; backend is listening on `127.0.0.1:8123`.
- Remaining risk:
  - GPT-SoVITS inference is still slow and can occasionally hang on short English. The new config limits wait time and avoids the empty-prompt artifact path, but manual listening in the app is still required.

## GPT-SoVITS Perceived Start-Speed Follow-up on 2026-07-05

- Result: enabled the existing realtime chat/TTS overlap path so GPT-SoVITS requests can begin before the whole assistant reply is finished.
- User priority: optimize time until the character starts speaking.
- Diagnosis:
  - Warm GPT-SoVITS direct requests for `Go sleep.` still took about `11.1s` to `13.5s` total.
  - `streaming_mode=1` reduced GPT-SoVITS time-to-first-byte to about `3ms` to `21ms`, but total WAV completion still took about `10.4s` to `11.2s`.
  - The current frontend uses `fetch(...).blob()` for `/api/tts`, so it cannot play GPT-SoVITS bytes until the response body is complete.
  - Existing frontend code already supports chat streaming plus stream TTS queueing; it had been disabled locally by `conversation_mode.chat_stream_enabled=false`, `tts.stream_mode=final_only`, and `tts.gpt_sovits_realtime_tts=false`.
- Fix:
  - Updated `config.local.json`:
    - `conversation_mode.chat_stream_enabled=true`
    - `tts.gpt_sovits_realtime_tts=true`
    - `tts.stream_mode=realtime`
    - `tts.stream_speak_idle_wait_ms=120`
    - `tts.gpt_sovits_streaming_mode=1`
  - This does not make a single GPT-SoVITS synthesis fast, but it overlaps LLM streaming with TTS generation so the first TTS request can start earlier.
- Verification:
  - `python -m json.tool config.local.json > $null; python -m json.tool config.example.json > $null; python -m json.tool package.json > $null`
    - Result: passed.
  - Config probe:
    - `chat_stream_enabled=True`
    - `gpt_sovits_realtime_tts=True`
    - `stream_mode=realtime`
    - `gpt_sovits_streaming_mode=1`
    - Client config exposes `gpt_sovits_realtime_tts=True`, `stream_mode=realtime`, and `chat_stream_enabled=True`.
  - `python -m pytest tests\test_config_asr_defaults.py tests\test_tts_language.py -q`
    - Result: passed, `23 passed`.
  - `node tests\test_chat_api_frontend.js`
    - Result: passed.
  - `node tests\test_character_runtime_frontend.js`
    - Result: passed.
  - `node --check web\appConfigController.js web\streamTtsQueueController.js web\chatReplyController.js`
    - Result: passed.
  - `git diff --check -- config.local.json progress.md session-handoff.md`
    - Result: passed.
  - Restarted the desktop project; `/config.json` reported `provider=gpt_sovits`, `stream_mode=realtime`, `gpt_sovits_realtime_tts=True`, `stream_speak_idle_wait_ms=120`, `server_request_timeout_ms=30000`, and `chat_stream_enabled=True`.
- Remaining risk:
  - True sub-second GPT-SoVITS playback would need a streaming audio playback path rather than `fetch(...).blob()`, or a faster TTS provider/model. The current change improves perceived latency by overlapping work, not by reducing GPT-SoVITS compute time.

## Frontend Runtime Efficiency v1 on 2026-07-10

- Result: completed view-aware script loading and idle speech-broadcast throttling while preserving the existing `/?view=model` and `/?view=chat` URLs.
- Loading changes:
  - `web/index.html` keeps the ordered script list in an inert template and loads it through `web/viewScriptLoader.js`.
  - Chat and combined views retain the complete ordered script list.
  - The default model view skips 50 chat-only or disabled-diagnostics scripts: 88 scripts / 1,742,867 bytes became 38 scripts / 618,298 bytes, reducing project JavaScript transfer by 1,124,569 bytes.
  - Model view with the existing developer flag enabled loads the complete manifest so diagnostics remain compatible.
  - Model startup reads runtime config without initializing chat history, reminders, proactive scheduling, persona, or chat controls.
- Idle runtime changes:
  - Active speech keeps frame-synchronous BroadcastChannel updates.
  - Idle state checks run every 250ms and unchanged payloads are not posted again.
  - The broadcast loop is idempotent and is cancelled/closed during `beforeunload`.
- Verification Evidence:
  - `node tests\test_frontend_runtime_efficiency.js` -> passed.
  - `node tests\test_performance_cue_frontend.js` -> passed.
  - `node scripts\run_node_tests.js` -> passed, all frontend tests.
  - `python scripts\check_js_syntax.py` -> passed, 132 files.
  - `node node_modules\electron\cli.js scripts\electron_ui_smoke.js --skip-chat` -> passed; chat status `待机`, model status `待机`, Live2D rendered with non-white ratio `0.1525`.
  - `powershell -NoProfile -ExecutionPolicy Bypass -File scripts\test-local.ps1` -> environment doctor passed; Python tests had the pre-existing MiMo auth-mock failure (`428 passed, 1 failed`) in `test_lightweight_llm_probe_allows_mimo_reasoning_budget`, so later steps did not run.
- Remaining risks:
  - The script loader intentionally uses parser-time `document.write` to preserve the legacy global-script order; a future module/bundler migration should replace this compatibility layer.
  - Manual observation of Task Manager over a longer idle session is still useful for measuring end-to-end CPU impact beyond the broadcast-loop regression test.

## Hermetic Test Stability v1 on 2026-07-10

- Result: removed the MiMo probe test's dependency on a workstation `OPENAI_API_KEY` without changing production authentication behavior.
- Change: `tests/test_character_runtime_integration.py` now supplies an explicit fake test key and asserts that the probe forwards it through the expected Authorization header.
- Verification Evidence:
  - Targeted MiMo/auth acceptance tests -> `20 passed`.
  - `python -m pytest -q` -> `429 passed`.
- Remaining risk: none identified; the fake credential exists only inside the mocked test path and is not a usable secret.

## Release Privacy Scan v1 on 2026-07-10

- Result: removed 61 user-specific Windows home paths from repository documentation/state evidence by replacing `C:\Users\<user>\` with `%USERPROFILE%\`.
- Secret and private-path detection rules were not relaxed.
- Verification Evidence:
  - `python scripts/check_secrets.py` -> passed, 536 files scanned.
  - `python -m pytest tests/test_check_secrets.py -q` -> `4 passed`, including the private-path rejection fixture.
  - `powershell -NoProfile -ExecutionPolicy Bypass -File scripts\test-local.ps1` -> complete pass: 429 Python tests, all Node tests, Python/JavaScript syntax and secret scan.
- Remaining risk: future verification logs must continue using `%USERPROFILE%` or another portable placeholder instead of a real username.

## Release Advisory Semantics v1 on 2026-07-10

- Result: default release validation no longer fails solely because an optional local demo service is offline.
- `scripts/check_release_readiness.ps1` now treats demo readiness as a warning by default and provides `-RequireDemoReadiness` for strict public-demo recording checks.
- User TTS provider and browser-fallback settings are not modified.
- Verification Evidence:
  - `python -m pytest tests/test_runtime_acceptance_scripts.py -q` -> `20 passed`.
  - Default release gate with `-SkipPackage -SkipInstaller` -> passed, including 430 Python tests, all Node tests, first-run preflight, character quality gate, and a non-blocking GPT-SoVITS advisory.
  - Direct `python scripts/check_demo_readiness.py` still exits non-zero while GPT-SoVITS is unavailable, preserving strict behavior.
- Remaining risk: a public demo should always use `-RequireDemoReadiness` or run the demo check directly.

## First-Run Package and Installer Verification on 2026-07-10

- Result: no additional packaging defects found.
- `scripts/check_first_run_package.ps1` passed: required files were present; private configs, `.env`, `node_modules`, logs and ignored probes were excluded; clean bootstrap, backend import, LLM configuration and safe defaults passed.
- `scripts/check_installer_smoke.ps1` passed: NSIS installer, source zip, checksums and release asset documentation were generated and validated.
- Remaining risk: these are build/smoke checks and do not replace a manual install/uninstall pass on a separate clean Windows account.

## Local HTTP Request Bounds v1 on 2026-07-10

- Result: all local POST routes now validate `Content-Length` before reading request bodies.
- Limits: chat/chat-stream 32 MB, ASR PCM JSON 8 MB, other JSON routes 2 MB.
- Invalid or negative lengths return 400; oversized bodies return 413 with the applicable limit.
- Existing API token and origin checks still run before body parsing.
- Verification Evidence:
  - `python -m py_compile app.py tests/test_character_runtime_integration.py` -> passed.
  - `python -m pytest tests/test_character_runtime_integration.py -q` -> `67 passed`, including raw-socket oversized and malformed length tests.
- Remaining risk: chat's 32 MB allowance intentionally supports current image attachments; future streaming uploads could reduce this further.

## Chat Developer Diagnostics Lazy Loading v1 on 2026-07-10

- Result: the 212,498-byte follow-up readiness panel controller no longer loads in normal chat sessions.
- The controller is installed by the existing developer feature loader when `?dev=1` or the existing local-storage flag is enabled.
- Normal mode uses a safe no-op proxy so core proactive scheduling and hidden diagnostic commands cannot crash when the panel is absent.
- Verification Evidence:
  - Full Node frontend suite passed.
  - Electron UI smoke passed: chat controls, learning/persona panels, doctor diagnostics and Live2D model all worked; chat/model status both reached `待机`.
- Remaining risk: the legacy panel API remains represented by many wrappers in `chat.js`; a later module-boundary refactor should move those wrappers with the panel.

## Renderer Content Security Policy v1 on 2026-07-10

- Result: chat/model renderers now use a restrictive CSP without `unsafe-eval`.
- The early inline view-class bootstrap moved to `web/earlyViewBootstrap.js`, allowing `script-src 'self'`.
- Pixi 6.5.8's official matching `@pixi/unsafe-eval` browser patch is vendored as a 3.9 KB runtime file and loaded immediately after Pixi; no npm runtime dependency was retained.
- `THIRD_PARTY_NOTICES.md` records the MIT-licensed compatibility patch.
- Verification Evidence:
  - Full Node frontend suite passed.
  - Electron UI smoke passed; chat and model reached `待机`, Live2D rendered with non-white ratio `0.1528`, and no CSP/unsafe-eval warning appeared.
- Remaining risk: the policy still permits inline styles because the existing UI updates style properties and uses legacy inline styling paths; scripts remain restricted to same-origin files.

## Electron Dependency Security v1 on 2026-07-10

- Result: upgraded Electron from 28.2.0 to the locked 39.8.10 patch release.
- The upgrade removes npm audit findings affecting old Electron releases, including high-severity use-after-free and renderer command-line injection advisories.
- Verification Evidence:
  - `npm audit --audit-level=high` -> 0 vulnerabilities.
  - Full Node frontend suite passed.
  - Electron UI smoke passed on Electron 39: transparent chat/model windows, preload bridge, panels and Live2D all worked.
- Remaining risk: this is a large Electron major-version jump even though current APIs passed smoke; installer/package smoke and a manual drag/audio check remain useful before release.

## Local Data Durability v1 on 2026-07-10

- Result: local JSON persistence now consistently falls back to a valid `.bak` when the primary file is missing or corrupt.
- Core memory, short-term memory and interaction memory use backup-aware reads.
- Generic JSON state saves use temporary-file replacement and retain the previous version; emotion state now uses this path instead of direct overwrite with swallowed errors.
- Existing JSON formats are unchanged.
- Verification Evidence:
  - `python -m py_compile memory.py memory_store.py emotion.py` -> passed.
  - `python -m pytest tests/test_memory_selection.py tests/test_emotion_persistence.py -q` -> `38 passed`.
- Remaining risk: backup recovery is intentionally read-only; the next successful save repairs the primary file, but the loader does not mutate files merely by reading them.

## Complete Audit Remediation Verification on 2026-07-10

- All code-level blockers identified in this audit sequence are implemented and verified.
- Final Verification Evidence:
  - `scripts/test-local.ps1` -> passed: 436 Python tests, all Node frontend tests, Python syntax 104 files, JavaScript syntax 134 files, secret scan 539 files.
  - `npm audit --audit-level=high` -> 0 vulnerabilities.
  - Electron 39 UI smoke -> passed with chat/model `待机`, Live2D rendered, CSP warning absent.
  - First-run source package smoke -> passed and includes `web/vendor/pixi-unsafe-eval.min.js`.
  - Installer smoke -> passed; installer exe, source zip, SHA256SUMS and release asset documentation validated.
  - JSON checks for `feature_list.json` and `package.json` -> passed.
  - `git diff --check` -> passed; only existing line-ending conversion warnings were reported.
- Environment-only advisory:
  - Local GPT-SoVITS on port 9880 was unavailable during checks. Default release validation now reports this without failing; strict public-demo readiness still correctly blocks until the service is started or the user selects browser TTS.

## Companion Turn Contract v1 Started on 2026-07-10

- Active feature changed from `character-performance-cue-v1` to `companion-turn-contract-v1` in `feature_list.json`.
- Scope: create a backward-compatible, versioned assistant-turn payload so the canonical model reply, subtitles, TTS, and Live2D performance use the same turn rather than independently rewriting or inferring state.
- Guardrails: preserve the current desktop-observation, tool-calling, privacy, and dependency defaults; defer additional Live2D asset work and relationship/memory changes to later features.
- Baseline: the existing worktree contains substantial pre-existing modifications and untracked feature files. No files were reverted or staged for this feature.

## Companion Turn Contract v1 Completed on 2026-07-10

- Result: model-direct replies now preserve the model-owned visible text through finalization, demo fallback, Character Runtime, and Character Brain route stages. Direct stream `delta` concatenation, final `reply`, `turn.reply_text`, and `turn.spoken_text` are identical.
- Added optional `companion_turn.enabled` (default `false`; enabled in the personal local configuration). It is independent from legacy `character_runtime` flags and exposes only a version, turn id, canonical text, modality, and allowlisted optional performance fields.
- The frontend validates the final `turn`, uses its performance plan over legacy/text inference when present, suppresses mutable realtime stream TTS for enabled turn mode, and starts final TTS/Live2D from the same canonical cue. Legacy/no-turn flow remains compatible.
- Files changed for this feature: `companion_turn_contract.py`, `app.py`, `app_chat_route.py`, `humanize.py`, `config.py`, `config.example.json`, `config.local.json`, `web/chatApi.js`, `web/chatReplyController.js`, `web/performanceCueController.js`, `web/appConfigController.js`, `web/chatState.js`, focused tests, and the Node test runner.
- Verification Evidence:
  - `python -m pytest tests/test_companion_turn_contract.py tests/test_app_chat_route.py tests/test_character_runtime_integration.py tests/test_app_reply_pipeline.py tests/test_reply_language_guard.py -q` -> `93 passed`.
  - `node tests/test_chat_api_frontend.js`, `node tests/test_performance_cue_frontend.js`, `node tests/test_companion_turn_contract_frontend.js`, and `node tests/test_character_runtime_frontend.js` -> passed.
  - `node scripts/run_node_tests.js` -> passed.
  - `powershell -NoProfile -ExecutionPolicy Bypass -File scripts\\test-local.ps1` -> passed: `446` Python tests, all Node frontend tests, Python syntax `106` files, JavaScript syntax `135` files, and secret scan `542` files.
  - JSON/compile checks and `git diff --check` -> passed (only existing line-ending advisory messages).
- Remaining risk: v1 deliberately delays server TTS until the final reply/turn arrives. A later version can restore lower-latency voice through non-retractable speech-segment events, not mutable raw deltas.

## Natural Character Dialogue v1 Started on 2026-07-10

- Active feature moved to `natural-character-dialogue-v1` after the turn contract completed.
- Scope: consolidate the current personal English companion prompt and remove random density/inner-state pressure in model-direct dialogue while retaining Chinese/English user input support and honest AI identity.
- Excluded: memory policy, relationship persistence, proactive behavior, desktop observation, tool use, permissions, and Live2D asset changes.

## Natural Character Dialogue v1 Completed on 2026-07-10

- Result: added one model-direct companion dialogue policy that supports Chinese or English input while keeping natural English output by default, permits Chinese only on a clear request, keeps humor/context grounded, and requires candid AI identity when identity or capability boundaries matter.
- Removed artificial direct-mode pressure: reply density no longer uses random roulette, emotion inner-state injection returns nothing, and both the runtime and inner-thought generator skip hidden thought generation for model-direct dialogue.
- Updated the personal local prompt from “do not say AI unless asked” to a candid AI-companion policy. Default/example prompts now also prohibit human impersonation while avoiding routine disclaimer boilerplate.
- Verification Evidence:
  - `python -m pytest tests/test_natural_character_dialogue.py tests/test_reply_language_guard.py tests/test_character_runtime_integration.py -q` -> `81 passed`.
  - Expanded targeted dialogue/contract suite -> `95 passed`.
  - `node scripts/run_node_tests.js` -> passed.
  - `powershell -NoProfile -ExecutionPolicy Bypass -File scripts\\test-local.ps1` -> passed: `452` Python tests, all Node frontend tests, Python syntax `108` files, JavaScript syntax `135` files, and secret scan `544` files.
  - JSON, Python compile, and `git diff --check` -> passed (only existing line-ending advisory messages).
- Remaining risk: legacy non-direct Character Brain and inner-thought paths intentionally retain their historical randomized behavior for compatibility. They are isolated from the personal model-direct configuration and should be retired or redesigned only in a separate legacy-path migration.

## Structured Relationship Growth v1 Started on 2026-07-10

- Active feature moved to `relationship-growth-v1` after the dialogue policy completed.
- Scope: local versioned relationship state, concise safe prompt snapshot, and user inspect/reset/correct controls for the personal companion.
- Excluded: desktop observation, tools, file/screenshot access, automated high-risk actions, and unreviewed free-text memory promotion.

## Structured Relationship Growth v1 Completed on 2026-07-10

- Result: the personal companion now has a separate, versioned `relationship_state.json` with atomic writes and backup recovery. It stores only a familiarity count plus four bounded interaction preferences: address, reply length, advice style, and teasing boundary.
- Safety: no chat transcript, screenshot, file path, secret, affinity score, romantic state, permission, desktop observation, tool access, or shell capability is stored or inferred. Only valid manual turns advance familiarity; clearly stated low-risk preferences can update the relevant field. Auto-chat never changes the state.
- Prompt behavior: model-direct and legacy paths receive a short structured snapshot only while the feature and local state are enabled. The current user message takes precedence, and the opaque legacy relationship summary is excluded when the structured feature is active.
- User experience: the existing Persona Card now shows local familiarity, editable preferences, pause/reload/save/reset controls, and an explicit reset boundary. Clearing a field and saving forgets that one preference; reset clears only this relationship state, not the Persona Card, core memories, or chat history.
- Files changed for this feature: `relationship_state.py`, `memory.py`, `app.py`, `config.py`, `config.example.json`, `config.local.json`, `.gitignore`, Persona Card frontend/controller files, focused Python/Node tests, and state artifacts.
- Verification Evidence:
  - `python -m pytest tests\test_relationship_state.py tests\test_api_health.py -q` -> `29 passed`.
  - `node tests\test_relationship_state_frontend.js` -> passed.
  - `python scripts\check_js_syntax.py` -> passed for `137` JavaScript files.
  - `powershell -NoProfile -ExecutionPolicy Bypass -File scripts\test-local.ps1` -> passed: `460` Python tests, all Node frontend tests, Python syntax `110` files, JavaScript syntax `137` files, and secret scan `548` files.
  - JSON validation for `config.example.json`, `package.json`, `feature_list.json`, and local config; scoped `git diff --check` -> passed.
- Manual check: visual inspection of the Persona Card confirmed the relationship section is scrollable and does not add a separate diagnostic page. A direct browser-only local page lacked the existing API token, so it correctly showed its request error without bypassing authentication; no security behavior was changed.

## Character Performance Cue v1 Resumed on 2026-07-10

- Active objective: use the already-stable companion turn contract to make speech-driven Live2D reactions more obvious, coherent, and recoverable during normal personal conversation.
- Scope: audit the existing cue-to-motion path and bundled Hiyori motions first; keep the current model, security defaults, text ownership, and user-controlled voice behavior intact.

## Character Performance Cue v1 Completed on 2026-07-10

- Result: reply performance is now selected by one shared cue-to-motion resolver in `web/performanceCueController.js`, so explicit actions are preserved across full and split-window Live2D views. Explicit `think` now selects the dedicated one-shot `Thinking` motion even at medium intensity.
- Timing: browser TTS dispatches the cue at `SpeechSynthesisUtterance.onstart`; server TTS dispatches it at `audio.onplay`; the AudioContext fallback dispatches it immediately after `source.start(0)`. Metadata arrival no longer starts the expression or action early. Text-only replies retain one local visual cue response.
- Model-direct companion turns now receive a conservative deterministic performance plan only for clear visible delivery signals. It does not alter or persist reply text, call another model, or override explicit runtime/brain metadata.
- Files changed: `companion_performance_director.py`, `companion_turn_contract.py`, performance/TTS/Live2D controllers, focused Python/Node regressions, and state artifacts.
- Verification Evidence:
  - `python -m pytest tests\test_companion_performance_director.py tests\test_companion_turn_contract.py tests\test_app_chat_route.py tests\test_character_runtime_integration.py -q` -> `89 passed`.
  - `node tests\test_performance_cue_frontend.js`, `node tests\test_character_runtime_frontend.js`, and `node tests\test_companion_turn_contract_frontend.js` -> passed.
  - `node scripts\run_node_tests.js` -> passed.
  - `powershell -NoProfile -ExecutionPolicy Bypass -File scripts\test-local.ps1` -> passed: `466` Python tests, all Node frontend tests, Python syntax `112` files, JavaScript syntax `137` files, and secret scan `550` files.
- Remaining manual check: validate the feel of the now-aligned timing in a normal personal voice session; it is not a security or correctness blocker.

## Conversation Flow v1 Started on 2026-07-10

- Active scope: improve continuity and recovery across text and voice without making the companion interruptive.
- Guardrails: preserve opt-in proactive behavior, existing cancellation paths, user-controlled settings, and fail-closed scheduling. Do not change memory policy, desktop observation, tools, permissions, or model assets in this feature.
- Next step: audit the existing follow-up, auto-chat, and voice-resume paths; choose one focused behavior with a regression test before implementation.

## Conversation Flow v1 Completed on 2026-07-10

- Result: no-barge-in voice mode now takes a per-turn microphone pause lease while the assistant is active, so ASR does not hear the assistant through external speakers. Each turn releases only its own lease, including stale/cancelled turns.
- Result: the shared four-minute automatic-companion speech gate now covers both scheduled auto-chat and post-turn thought bursts. It remains opt-in and also blocks while a request is in flight, while either speaker is active, or while the user is typing.
- Result: browser TTS now records its completion at `SpeechSynthesisUtterance.onend`; text-only replies record their visible-delivery completion. This gives text and voice the same guarded silence-follow-up baseline.
- Files changed: `web/localAsrController.js`, `web/chatReplyController.js`, `web/chatState.js`, `web/autoChatController.js`, `web/ttsPlaybackController.js`, focused frontend regressions, and state artifacts.
- Verification Evidence:
  - Targeted local-ASR, companion-turn, character-runtime, and performance-cue frontend tests passed.
  - `powershell -NoProfile -ExecutionPolicy Bypass -File scripts\\test-local.ps1` -> passed: `466` Python tests, all Node frontend tests, Python syntax `112` files, JavaScript syntax `137` files, and secret scan `550` files.
- Remaining manual check: with external speakers and `interrupt_tts_on_user_speech=false`, confirm the assistant does not self-interrupt while real user speech is still recognized after playback ends.

## Memory Continuity v1 Started on 2026-07-10

- Active scope: audit the actual short-term/long-term memory selection and learning-review paths before changing behavior.
- Guardrails: keep memory promotion user-reviewed, keep correction/forget paths explicit, and do not add desktop, file, screenshot, or tool access.

## Memory Continuity v1 — In Progress on 2026-07-10

- Implemented and verified in focused tests: pure `continue` / `next step` now refresh an existing actionable short-term anchor instead of becoming a generic task; generic legacy anchors are skipped; a valid short-term anchor prevents stale transcript/Mem0 expansion for the same follow-up.
- Implemented and verified in focused tests: the backend drops a trailing duplicate current-user history item before the LLM sees it, so normal client turns no longer present the current short reply twice.
- Implemented and verified in focused tests: correction/forget requests no longer append themselves to raw memory/Mem0; they add hash-only recall suppressions for matching old facts, archive matching reviewed learning samples, clear derived legacy summaries, and prevent a clear relationship-address request from being reinterpreted as a new address.
- Verification Evidence: `python -m pytest tests\test_memory_selection.py tests\test_relationship_state.py tests\test_app_chat_route.py -q` -> `57 passed`; `python -m py_compile memory.py memory_selection.py relationship_state.py app_chat_route.py` -> passed.
- Historical incident: while adding the first regression, an isolation gap cleared the local derived summary files `memory_summary.json`, `memory_profile.json`, and `memory_relationship.json`. Raw interaction memory, core/short memory, and structured relationship state were not changed. The summaries remain intentionally blank; rebuilding them would send local interaction history to the configured LLM and therefore still requires explicit user authorization.

## Memory Continuity v1 Completed on 2026-07-10

- Short follow-ups such as `continue` and `next step` now refresh the best existing short-term task anchor without creating or promoting generic task memories. If an actionable short-memory anchor exists, stale raw/Mem0 expansion is not mixed into that follow-up.
- The chat route removes only an accidental trailing duplicate of the current user message before model/history processing, so a normal short reply is no longer shown twice to the model.
- Correction and forget handling now uses hash-only, exact source-turn fingerprints rather than keyword tombstones. A correction suppresses only the source turn of a concrete core/short memory it changed; an explicit forget may suppress raw/Mem0 turns only when the requested literal occurs in that turn. Shared English/CJK phrases cannot hide unrelated memories.
- Reviewed learning samples are no longer silently archived by a correction or forget request. New learning candidates retain bounded source-turn hashes; a sample is temporarily excluded only when every known source turn is suppressed. Legacy reviewed samples without a reliable source hash stay untouched.
- Derived summaries are no longer cleared. A correction/forget advances a private suppression revision, making an older summary ineligible for prompt injection while preserving the file and its backup. A later refresh is accepted only if it was built against the same revision and uses suppression-filtered raw turns.
- Relationship continuity now deduplicates retry/fallback turns using a bounded hash-only interaction-id cache. Address parsing accepts clear declarative naming preferences and rejects questions, negations, conditionals, temporal phrases, and ambiguous forget requests.
- The full test gate did not modify the three intentionally blank derived-summary files.
- Verification Evidence:
  - `python -m pytest tests\test_memory_selection.py tests\test_relationship_state.py tests\test_app_chat_route.py -q` -> `66 passed`.
  - `python -m py_compile memory.py relationship_state.py app_chat_route.py` -> passed.
  - `powershell -NoProfile -ExecutionPolicy Bypass -File scripts\test-local.ps1` -> passed: `481` Python tests, all Node frontend tests, Python syntax `112` files, JavaScript syntax `137` files, and secret scan `550` files.
  - Scoped `git diff --check` and JSON validation passed.
- Remaining manual decision: rebuild the intentionally blank derived summaries only if the user explicitly authorizes sending the existing local interaction history to the configured LLM provider.

## Companion Speech Prewarm v1 Completed on 2026-07-11

- Result: opt-in model-direct companion turns using GPT-SoVITS now prewarm one complete stable draft sentence while the model reply continues streaming. Audio stays silent until the canonical final turn confirms the exact prefix, then that blob plays once and only the remaining tail is synthesized normally.
- Mismatch, failure, cancellation, interruption, and late audio are discarded. Caller cancellation now reaches the TTS request and cannot trigger a retry.
- Live2D performance, subtitle, and speech animation activation for the prewarmed prefix are tied to actual HTML audio `onplay` or AudioContext fallback start.
- Verification Evidence:
  - `node tests\test_tts_api_frontend.js`, `node tests\test_companion_turn_contract_frontend.js`, and `node tests\test_performance_cue_frontend.js` -> passed.
  - `node scripts\run_node_tests.js` -> passed.
  - `powershell -NoProfile -ExecutionPolicy Bypass -File scripts\test-local.ps1` -> passed: `481` Python tests, all Node frontend tests, Python syntax `112` files, JavaScript syntax `137` files, secret scan `550` files.
  - `python scripts\check_character_v1_4.py` -> passed: `166` character Python tests and all character/chat/speech/TTS frontend checks.
  - JSON validation and scoped `git diff --check` -> passed.
- Remaining manual risk: strict demo readiness still cannot live-measure GPT-SoVITS first sound until the local endpoint is running. This feature did not change the selected provider, browser fallback preference, or any safety default.

## Release Experience Alignment v1 Completed on 2026-07-11

- Result: `config.preview.example.json` now activates the same intended companion contract as the personal experience: Chinese or English input, natural English by default, candid AI identity when relevant, model-direct replies, canonical companion turns, structured relationship continuity, and streamed text delivery.
- Safety retained: the preview profile stays on browser TTS with fallback, manual desktop attachment, no automatic observation/proactive chat, and tools/shell disabled.
- First-run behavior: the preview merge still preserves existing LLM provider, endpoint, model, API-key environment variable, and direct API-key field; it does not write a new key.
- Verification Evidence:
  - `python -m pytest tests\test_preview_experience_profile.py tests\test_runtime_acceptance_scripts.py -q` -> `23 passed`.
  - Clean source-package first-run smoke (`scripts\check_first_run_package.ps1`) -> passed, including preview merge, preserved LLM settings, and safety-default checks.
  - `powershell` parse checks for the preview-apply and first-run scripts -> passed.
  - `powershell -NoProfile -ExecutionPolicy Bypass -File scripts\test-local.ps1` -> passed: `485` Python tests, all Node frontend tests, Python syntax `113` files, JavaScript syntax `137` files, secret scan `551` files.
  - Public encoding check, JSON validation, and scoped `git diff --check` -> passed.
- Remaining manual risk: a clean package still needs a real configured-model chat and human voice/Live2D review before it can be claimed as a final release demonstration.

## Current Objective: Private Bilingual Voice Input v1 Started on 2026-07-11

- Active feature: `bilingual-voice-input-v1`.
- Audit evidence: local PCM ASR uses one Chinese Vosk model; browser recognition and wake listening are fixed to `zh-CN`; the current CJK cleanup removes English spaces. English spoken input is therefore not equivalent to typed input.
- Intended change: add an optional, local-only Chinese/English Vosk pair with per-utterance automatic selection. No models will be downloaded, no audio will be uploaded, and private model paths will remain server-only.
- Known boundary: two monolingual models can choose one Chinese or English whole-utterance candidate; reliable within-utterance code-switching needs a deliberately supplied multilingual model or a different ASR engine and is out of scope.

## Private Bilingual Voice Input v1 Completed on 2026-07-11

- Result: local ASR now accepts an optional user-provided English Vosk model alongside the existing Chinese model. In `auto`, it evaluates one complete utterance with each available local model and returns exactly one candidate; Chinese-only installations keep their existing behavior.
- Stability: model instances are path-keyed and bounded to the two most recently used paths. Near-tied cross-model results keep the compatibility-first Chinese candidate and are marked low-confidence so the existing confirmation flow can ask before assuming intent.
- Privacy: model paths remain server-only. The request body cannot select a model, health output only reports language availability, and model load failures return path-free client errors. No models were downloaded, no browser/cloud fallback was newly enabled, and `config.local.json` was not changed.
- Browser boundary: browser wake recognition remains one language at a time; `auto` preserves Chinese wake behavior, while explicit `en` uses English browser recognition. Local automatic language choice starts after the microphone is opened.
- Verification Evidence:
  - `python -m pytest tests\test_asr.py tests\test_app_asr_route.py tests\test_config_asr_defaults.py tests\test_app_health_asr.py -q` -> `39 passed`.
  - `node tests\test_bilingual_local_asr_frontend.js` and `node tests\test_local_asr_frontend.js` -> passed.
  - `powershell -NoProfile -ExecutionPolicy Bypass -File scripts\test-local.ps1` -> passed: `505` Python tests, all Node frontend tests, Python syntax `115` files, JavaScript syntax `138` files, and secret scan `554` files.
  - `python scripts\check_encoding.py --public`, JSON validation, and scoped `git diff --check` -> passed.
- Remaining manual risk: this workspace does not contain a configured English Vosk model, so a real English microphone comparison must be performed after the user supplies their preferred local model. Rapid Chinese-English code switching remains intentionally unsupported by the two-monolingual-model path.

## Current Objective: Realtime TTS Performance Sync v1 Started on 2026-07-11

- Active feature: `realtime-tts-performance-sync-v1`.
- Audit evidence: the realtime stream queue currently triggers talk gestures at text enqueue while server TTS is still synthesizing; the final reply path also starts its speech timeline before actual stream playback. This is especially visible when GPT-SoVITS takes seconds to return audio.
- Intended change: preserve pre-reaction/thinking while speech is pending, but bind speaking motion, speech timeline, and post-settle timing to the first actual `onplay` / audio-context start event for the active stream session.
- Guardrails: no provider/configuration/permission changes; late, cancelled, failed, and stale audio must remain visually silent.

## Realtime TTS Performance Sync v1 Completed on 2026-07-11

- Result: queued realtime TTS no longer begins a talk gesture or semantic speech timeline when text is enqueued or a blob becomes ready. Those effects begin only at a real browser `onstart`, HTML audio `onplay`, or successful AudioContext `source.start` event.
- Direct and companion-turn paths: their speech timeline and fallback talk gesture now use the same actual-playback callback. A failed direct TTS request leaves the pending pre-reaction intact but cannot fake a speaking or settle phase. Text-only delivery still receives its intentionally non-audio visual response.
- Stream timing: if the first audio segment genuinely starts before the final semantic plan is available, the existing actual speech animation/gesture continues; the full plan joins the next real segment rather than replaying a visibly late speech-start pose. This remains valid after the text stream completes, until a newer turn supersedes the session.
- AudioContext safety: failed `source.start()` no longer marks audio as started, marks the stream as played, or suppresses the final speech watchdog.
- Known bounded follow-up: the watchdog currently guarantees that a stream has started at least once. A separate pending feature, `stream-tts-delivery-completeness-v1`, will address later queued-tail failures without replaying audio already heard.
- Verification Evidence:
  - `node tests\test_tts_playback_start_frontend.js`, `node tests\test_stream_tts_queue_frontend.js`, `node tests\test_companion_turn_contract_frontend.js`, and `node tests\test_performance_cue_frontend.js` -> passed.
  - `node scripts\run_node_tests.js` -> passed.
  - `powershell -NoProfile -ExecutionPolicy Bypass -File scripts\test-local.ps1` -> passed: `505` Python tests, all Node frontend tests, Python syntax `115` files, JavaScript syntax `140` files, and secret scan `556` files.
  - Scoped `git diff --check` -> passed for the touched synchronization files.
- Next active feature: `voice-listening-presence-v1`, focused on a restrained Live2D listening presence during microphone/VAD activity before the reply begins.

## Voice Listening Presence v1 Completed on 2026-07-11

- Result: opening the microphone now gives the Live2D companion a quiet, readable attentive pose before ASR finalization. Local VAD and browser recognition transition the session-bound state through `armed`, `hearing`, `release`, and `idle`; stale callbacks, mic pause/close, muted/disconnected tracks, and expired detached-window updates cannot revive an old pose.
- Performance boundary: the listening layer uses only eye, brow, gaze, head, body, and shoulder parameters, explicitly closes the mouth, and never triggers its own arm or hand gesture. Automatic idle, queued action-plan, direct motion-manager, and fallback transform motions are also deferred while the user is being heard. Explicit user taps and actual assistant audio remain available.
- Reliability: overlapping local ASR utterances are serialized instead of leaving VAD state/buffers attached to an earlier in-flight request. Detached model audio-priority state now expires when the sender stops updating, so a dead chat window cannot suppress listening indefinitely.
- Privacy: the split-window bridge carries only `{ version, sessionId, revision, phase }`; it never carries transcript text, raw audio, microphone level, or ASR confidence.
- Verification Evidence:
  - `node tests\test_local_asr_frontend.js`, `node tests\test_bilingual_local_asr_frontend.js`, `node tests\test_performance_cue_frontend.js`, `node tests\test_character_runtime_frontend.js`, and `node tests\test_frontend_runtime_efficiency.js` -> passed.
  - `node scripts\run_node_tests.js` -> passed.
  - `powershell -NoProfile -ExecutionPolicy Bypass -File scripts\test-local.ps1` -> passed: `505` Python tests, all Node frontend tests, Python syntax `115` files, JavaScript syntax `140` files, and secret scan `556` files.
- Remaining manual risk: the restrained pose values and release timing need a human microphone/Live2D feel check on the user's actual character scale and input device. No microphone data leaves the existing local path.

## Stream TTS Delivery Completeness v1 Completed on 2026-07-11

- Result: realtime TTS now keeps a per-session delivery ledger for every queued segment. It distinguishes queued/requesting/ready segments from a real playback start, normal completion, a failure before sound starts, and a failure after sound may have been heard.
- Recovery: after final stream text is known, the watchdog evaluates delivery completeness rather than the old "any segment started" flag. A failed or stalled tail recovers only the contiguous suffix that never began playback; previously audible text, including a partially heard failed segment, is never replayed.
- Stability: a pre-start failure stops later queue playback to preserve spoken order. A recovery token blocks queued, prefetched, and late callbacks from speaking old audio after the suffix fallback begins. Session and playback-generation checks prevent an interrupted or superseded turn from recovering into a new conversation.
- Compatibility: the original full-text fallback remains available only when no stream delivery ledger exists and no segment has played. Providers, browser fallback behavior, permissions, network policy, and private configuration were not changed.
- Verification Evidence:
  - `node tests\test_stream_tts_queue_frontend.js`, `node tests\test_stream_tts_delivery_completeness_frontend.js`, `node tests\test_tts_playback_start_frontend.js`, `node tests\test_companion_turn_contract_frontend.js`, `node tests\test_performance_cue_frontend.js`, and `node tests\test_character_runtime_frontend.js` -> passed.
  - `node scripts\run_node_tests.js` -> passed.
  - `powershell -NoProfile -ExecutionPolicy Bypass -File scripts\test-local.ps1` -> passed: `505` Python tests, all Node frontend tests, Python syntax `115` files, JavaScript syntax `141` files, and secret scan `557` files.
- Remaining manual risk: a real long GPT-SoVITS reply should be interrupted once during tail recovery to tune the bounded watchdog wait against the user's actual synthesis latency. The automated recovery path remains conservative: it prefers missing a partial audible fragment over replaying it.

## Current Objective: Bilingual Text Composition and Intentional Send v1 Started on 2026-07-11

- Audit evidence: the chat input currently submits on every `Enter` keydown, without `event.isComposing` or composition lifecycle handling. On Chinese IMEs, Enter may confirm a Pinyin candidate; sending at that moment can clear the unfinished input and create an accidental partial turn.
- Intended change: make keyboard submission composition-aware and once-only after intentional finalized Enter, while preserving the send button and ordinary Enter submission behavior. No conversation, model, provider, privacy, permission, or private-configuration behavior will change.

## Bilingual Text Composition and Intentional Send v1 Completed on 2026-07-11

- Result: chat input now tracks browser composition lifecycle. Enter used to confirm an active Chinese/Japanese/Korean IME candidate is ignored; Chromium's legacy `keyCode=229` ordering is also ignored. The input is neither cleared nor submitted until a normal finalized Enter occurs.
- Intentional send behavior: a normal non-repeating Enter submits once and prevents the native Enter default; held-key repeats cannot create duplicate/interruption turns. The Send button remains unchanged and available during/after composition.
- Verification Evidence:
  - `node tests\test_bilingual_text_composition_frontend.js` and `node scripts\run_node_tests.js` -> passed.
  - `powershell -NoProfile -ExecutionPolicy Bypass -File scripts\test-local.ps1` -> passed: `505` Python tests, all Node frontend tests, Python syntax `115` files, JavaScript syntax `142` files, and secret scan `558` files.
- Remaining manual risk: test Chinese Pinyin and Japanese/Korean IME candidate confirmation once in the user's normal Electron environment; the guard follows standard composition events and does not alter click-to-send.

## Current Objective: Generation- and Session-Bound Server TTS Cancellation v1 Started on 2026-07-11

- Audit evidence: interruption stops current playback but direct and realtime server synthesis requests do not consistently receive an AbortSignal. A slow obsolete GPT-SoVITS request can therefore continue consuming the local provider's single queue and delay the next user turn.
- Intended change: bind active direct/segmented/realtime synthesis requests to playback generation and stream session, abort them on interruption/new turn, and ensure cancellation never triggers stale retries, fallback speech, or provider-failure handling.

## Generation- and Session-Bound Server TTS Cancellation v1 Completed on 2026-07-11

- Result: every active client-side server-TTS request now receives a transient scope bound to its playback generation and, where available, stream session. Playback turnover and chat interruption abort only predecessor scopes; late cleanup cannot remove or cancel a newer request.
- Coverage: direct speech, companion prewarm, segmented prefetch/fallback, realtime stream fetches, no-prosody retries, queued-prefetch discard, final stream recovery, and latency hints now carry a cancellation signal. Voice-timeline pauses also settle immediately on interruption rather than waiting on a cleared timer.
- Cancellation semantics: caller abort is kept separate from provider failure. It does not retry, schedule stream recovery, increment the provider failure streak, mark the provider unavailable, or invoke browser-TTS fallback. Retry backoff and audio-body reads are abortable as well.
- Verification Evidence:
  - `node tests\test_server_tts_cancellation_frontend.js`, `node tests\test_tts_api_frontend.js`, `node tests\test_stream_tts_queue_frontend.js`, `node tests\test_stream_tts_delivery_completeness_frontend.js`, and `node tests\test_companion_turn_contract_frontend.js` -> passed.
  - `node scripts\run_node_tests.js` -> passed.
  - `powershell -NoProfile -ExecutionPolicy Bypass -File scripts\test-local.ps1` -> passed: `505` Python tests, all Node frontend tests, Python syntax `115` files, JavaScript syntax `143` files, and secret scan `559` files.
- Remaining boundary: the browser now promptly cancels its request, retry, and playback work. The existing Python route may still finish a synthesis already running inside the upstream GPT-SoVITS call; provider-side cancellation needs a separate, explicitly authorized backend protocol.

## Current Objective: Split-Window Speech Timebase and Stale-State Cleanup v1 Started on 2026-07-11

- Audit evidence: the chat-to-model speech bridge sends renderer-local `performance.now()` deadlines, while the model renderer compares them against its own unrelated `performance.now()` origin. A delayed or cross-window update can therefore appear already expired or indefinitely current, leaving Live2D visibly speaking or suppressing idle motion at the wrong time.
- Intended change: replace the cross-window timing representation with a shared timebase or duration-based contract, retain revision/session fencing, and make stale remote speech clear safely without touching active local audio.

## Split-Window Speech Timebase and Stale-State Cleanup v1 Completed on 2026-07-11

- Result: the speech bridge now uses a versioned renderer-independent contract: wall-clock expiries plus sender identity, monotonically increasing revision, session/generation context, and active heartbeat. The model window translates each accepted expiry into its own local performance clock; raw sender `performance.now()` deadlines no longer cross windows.
- Reliability: stale and already-expired packets are ignored, while older revisions cannot revive a completed turn. A dead sender clears only the model's mirrored speech state (mouth/audio projection, remote deadline, and remote cue expiry); it does not affect local full-window audio. Remote high-energy cues are applied once per speech identity, capped to their transmitted expiry, and cannot repeat on heartbeat updates.
- Verification Evidence:
  - `node tests\test_split_window_speech_timebase_frontend.js`, `node tests\test_performance_cue_frontend.js`, `node tests\test_frontend_runtime_efficiency.js`, and `node tests\test_character_runtime_frontend.js` -> passed.
  - `node scripts\run_node_tests.js` -> passed.
  - `powershell -NoProfile -ExecutionPolicy Bypass -File scripts\test-local.ps1` -> passed: `505` Python tests, all Node frontend tests, Python syntax `115` files, JavaScript syntax `144` files, and secret scan `560` files.
- Remaining manual risk: run one real Electron chat/model split-window speech cycle and close the chat window mid-release to tune the 900 ms mirrored-audio freshness threshold against the user's hardware. The bridge payload contains no transcript or raw audio.

## Current Objective: Local Speech Timebase Consistency v1 Started on 2026-07-11

- Audit evidence: local speech animation fields are written using `performance.now()`, while a few chat-turn and automatic-follow-up predicates compare them with `Date.now()`. That mismatch makes the visual release window appear already expired to those policy paths.
- Intended change: audit and align only the local timebase consumers, preserving actual audio priority, user interruption policy, and the completed split-window bridge contract.

## Local Speech Timebase Consistency v1 Completed on 2026-07-11

- Result: local chat-turn interruption, important-speech arbitration, auto-chat, and turn-interjection checks now compare the `speechAnimUntil` release window against the renderer's `performance.now()` clock. Actual audio, stream work, and the existing 80 ms release grace remain authoritative exactly as before.
- Long-uptime stability: protected-speech elapsed time now explicitly evaluates performance-clock audio/animation timestamps against the performance clock and the assistant-turn wall timestamp against wall time. It no longer guesses the source clock from a numeric threshold, avoiding a misclassification after a long-running renderer.
- Coverage: a focused divergent-clock regression verifies the user-speech interruption path, automatic companion gate, turn-interjection deferral, expiry behavior, app-level dependency injection, and the long-uptime protected-speech calculation.
- Verification Evidence:
  - `node tests\test_local_speech_timebase_frontend.js`, `node tests\test_companion_turn_contract_frontend.js`, `node tests\test_character_runtime_frontend.js`, and `node tests\test_split_window_speech_timebase_frontend.js` -> passed.
  - `node scripts\run_node_tests.js` -> passed.
  - `powershell -NoProfile -ExecutionPolicy Bypass -File scripts\test-local.ps1` -> passed: `505` Python tests, full Node suite, Python syntax `115` files, JavaScript syntax `145` files, and secret scan `561` files.
  - Scoped `git diff --check` -> passed.
- Remaining manual check: play one short real reply, begin speaking during its visible release tail, and confirm that the current interruption preference feels natural. The 80 ms grace remains intentionally non-blocking.

## Current Objective: No-Barge-In Voice Turn Queue v1 Started on 2026-07-11

- Audit evidence: `localAsrController` removes each finalized transcript from its queue before asking for a non-interrupting chat turn. If a previous assistant turn is still `chatBusy`, `chatReplyController` returns `false` immediately and the real user utterance is never retried.
- Intended change: retain only non-interrupting voice items while an existing assistant turn is busy, retry them in FIFO order with a bounded wait, and clear pending work on manual mic close/stale session. Barge-in-enabled voice turns must retain their current immediate interruption behavior.

## No-Barge-In Voice Turn Queue v1 Completed on 2026-07-11

- Result: a voice transcript finalized while no-barge-in mode is waiting on an active assistant turn now remains at the queue head instead of being removed and silently rejected. It retries after a short bounded delay, then dispatches in original FIFO order when the turn is idle.
- Safety: queued items carry their microphone session and wall-clock enqueue time. Manual mic close and new session start cancel pending retry work; stale sessions and a 30-second active-turn wait expire only the affected queued item. Existing barge-in voice turns still dispatch immediately with interruption enabled.
- Voice handoff: a deferred voice request now receives a bounded 30-second speech-turn wait so an audio-release window cannot immediately reject the retained transcript after the previous chat turn has become idle.
- Verification Evidence:
  - `node tests\test_no_barge_in_voice_turn_queue_frontend.js`, `node tests\test_local_asr_frontend.js`, `node tests\test_bilingual_local_asr_frontend.js`, `node tests\test_companion_turn_contract_frontend.js`, and `node tests\test_character_runtime_frontend.js` -> passed.
  - `node scripts\run_node_tests.js` -> passed.
  - `powershell -NoProfile -ExecutionPolicy Bypass -File scripts\test-local.ps1` -> passed: `505` Python tests, full Node suite, Python syntax `115` files, JavaScript syntax `146` files, and secret scan `562` files.
  - Scoped `git diff --check` and JavaScript syntax checks -> passed.
- Remaining manual check: with no-barge-in enabled, speak one sentence just as a prior reply begins/continues, then confirm it appears once after the reply finishes. Also close the mic during the wait once to confirm it does not send later.

## Current Objective: Split-Window Performance Phase Bridge v1 Started on 2026-07-11

- Audit evidence: Electron desktop mode separates chat and model renderers. The chat renderer executes early thinking/pre-reaction phases but has no Live2D model, while the model renderer receives only speech/listening bridge state. During an LLM/TTS delay, the desktop character can therefore appear inert even though the full view is expressive.
- Intended change: bridge a compact, safe non-speech phase with expiry/revision fencing to the detached model renderer. Reuse existing action/pulse fallbacks, never start a mouth/speech animation, and keep the full view local to avoid duplicate motion.

## Split-Window Performance Phase Bridge v1 Completed on 2026-07-11

- Result: desktop chat/model windows now mirror compact non-speech `pre_reaction` and bounded `thinking_wait` phases. A detached model receives only allowlisted action/pulse fields, a turn id, revision, and an absolute expiry; no user transcript, reply text, raw audio, prompt, or provider data crosses the bridge.
- Visible lifecycle: the pre-reaction begins before the model call; if first reply text is still absent after the existing 520 ms waiting threshold, the detached model receives one restrained thinking action. The phase is cleared on first visible text, latency-hint start, actual speech start, interruption, normal completion, sender shutdown, expiry, and a newer turn.
- Safety: receiver-side phase revisions prevent duplicate heartbeat replays and stale/reordered packets from reviving an old reaction. Phase dispatch uses the existing expression-pulse/action-plan path only; it never writes mouth, speech animation, or audio state. Full view keeps the action local and does not create a duplicate bridge dispatch.
- Verification Evidence:
  - `node tests\test_split_window_performance_phase_bridge_frontend.js`, `node tests\test_split_window_speech_timebase_frontend.js`, `node tests\test_companion_turn_contract_frontend.js`, `node tests\test_stream_tts_queue_frontend.js`, `node tests\test_tts_playback_start_frontend.js`, `node tests\test_performance_cue_frontend.js`, and `node tests\test_frontend_runtime_efficiency.js` -> passed.
  - `node scripts\run_node_tests.js` -> passed.
  - `powershell -NoProfile -ExecutionPolicy Bypass -File scripts\test-local.ps1` -> passed: `505` Python tests, full Node suite, Python syntax `115` files, JavaScript syntax `147` files, and secret scan `563` files.
  - Scoped `git diff --check` and JavaScript syntax checks -> passed.
- Remaining manual check: launch the real Electron desktop split view, send a prompt with a deliberately slow response, and confirm the model makes one readable early reaction/brief thinking beat before speech without duplicate or late motion after the reply begins.

## Current Objective: No-Barge-In Audio Lease Completeness v1 Started on 2026-07-11

- Audit evidence: a chat turn acquires its microphone pause lease before the model request, but the realtime stream path only queues TTS work and releases the lease when the LLM stream finishes. Queued server audio can therefore still be playing after `chatBusy` clears and the microphone reopens.
- Intended change: bind no-barge microphone release to the finalized realtime session/generation's actual delivery settlement or cancellation, and keep the deferred ASR queue behind any active assistant audio as a defensive second boundary. Direct/text-only/error paths must retain their current prompt release behavior.

## No-Barge-In Audio Lease Completeness v1 Completed on 2026-07-11

- Result: a realtime stream now owns its microphone pause lease until the finalized session/generation's queued audio has actually completed, safe tail recovery has returned, or the turn is cancelled. A playback-start callback alone cannot release the lease.
- Lifecycle: delivery settlement is maintained in a renderer-local session/generation waiter map rather than user-visible state. Normal queue completion, safe final-tail recovery, abort, stale session, and stale playback generation resolve only the matching waiter. A replacement turn keeps its own independent pause depth.
- Defense in depth: a no-barge ASR queue now also defers behind active assistant audio or realtime queue work after `chatBusy` clears, while barge-in remains immediate.
- Verification Evidence:
  - Focused stream delivery, companion-turn lease, and no-barge queue frontend tests -> passed.
  - `node scripts\run_node_tests.js` -> passed.
  - `powershell -NoProfile -ExecutionPolicy Bypass -File scripts\test-local.ps1` -> passed: `505` Python tests, all Node frontend tests, Python syntax `115` files, JavaScript syntax `147` files, and secret scan `563` files.
- Remaining manual check: with no-barge-in enabled and speakers in use, send a multi-sentence realtime reply, speak just before its last segment ends, and confirm the microphone stays suspended until the tail finishes without submitting the companion's own audio.

## Current Objective: Delivered-Turn Persistence v1 Started on 2026-07-11

- Audit evidence: backend chat routes persist assistant memory and relationship updates before the terminal JSON/SSE response is successfully delivered, while the renderer can cancel a stale turn and remove its unfinished row. This can make a reply the user never saw alter long-term familiarity, preferences, or later recall.
- Intended change: add a bounded one-shot local delivery acknowledgement for the terminal reply. Persist the assistant side only after the current renderer has finalized the visible assistant row; cancellation, failed terminal writes, stale callbacks, duplicates, unknown ids, and expiry must be safe no-ops.

## Delivered-Turn Persistence v1 Completed on 2026-07-11

- Result: receipt-aware desktop chat now delays assistant memory, relationship, and character-session advancement until the current visible assistant row is finalized. Legacy API clients that do not declare the capability retain their prior immediate-persistence behavior, so existing scripts do not silently stop learning.
- Delivery reliability: receipts serialize commit callbacks, keep a short bounded completed outcome for safe retry after a lost ACK response, distinguish `committed`/`already_committed` from unconfirmed outcomes, and serialize runtime reset behind any active commit. Concurrent character-session updates now perform their read/derive/write cycle atomically.
- Frontend behavior: ACKs use a bounded FIFO retry queue backed only by session-scoped opaque receipt IDs and scheduling metadata. Reload recovery and a page-close keepalive attempt are supported; a subsequent receipt-aware request sends bounded pending IDs so the server can commit an already-visible prior turn before planning the next one.
- Compatibility and documentation: `docs/delivery-receipt-protocol.md` documents the opt-in request capability, statuses, retry boundary, and privacy constraints. No reply text, prompt, audio, token, or desktop data is stored in the ACK queue.
- Verification Evidence:
  - Focused backend receipt/session/route/API/continuity suite -> `118 passed`.
  - `node tests\test_chat_api_frontend.js` and `node tests\test_companion_turn_contract_frontend.js` -> passed.
  - `node scripts\run_node_tests.js` -> passed.
  - `powershell -NoProfile -ExecutionPolicy Bypass -File scripts\test-local.ps1` -> passed: `519` Python tests, all Node frontend tests, Python syntax `117` files, JavaScript syntax `147` files, and secret scan `566` files.
- Remaining boundary: the pre-existing memory pipeline spans several local files and background extractors, so an exceptional mid-commit failure is reported as `commit_failed` and is deliberately not blindly replayed. A cross-store durable transaction journal would be a separate persistence feature; this slice prevents unseen replies and false ACK success without inventing a partial replay guarantee.

## Current Objective: Split-Window Speech Style Bridge v1 Started on 2026-07-11

- Audit evidence: the detached Electron model window already mirrors speech timing and mood, but does not receive the authoritative `speechAnimStyle` / `currentTalkStyle`. As a result, playful, comforting, steady, and clear spoken delivery can look neutral despite the main/full renderer having the right Live2D controls.
- Intended change: extend only the existing compact revisioned `taffy-speech` bridge with an allowlisted talk-style enum, apply it after existing stale/expiry validation, and cover the receiver-to-expression path. No text, audio, providers, prompts, private configuration, or model assets will cross the bridge.

## Split-Window Speech Style Bridge v1 Completed on 2026-07-11

- Result: the chat renderer now broadcasts only the existing allowlisted `neutral`, `playful`, `comfort`, `steady`, or `clear` speech style. The detached model applies a valid received value to both `speechAnimStyle` (mouth cadence) and `currentTalkStyle` (expression/body layer).
- Safety: style is applied only after the existing sender identity, revision, timestamp, and expiry checks. Missing/invalid values preserve the current style; stale and expired packets cannot revive it. A non-speaking packet may update style but cannot start mouth or speech motion.
- Verification Evidence:
  - `node tests\test_split_window_speech_timebase_frontend.js` and `node tests\test_performance_cue_frontend.js` -> passed.
  - `node scripts\run_node_tests.js` -> passed.
  - `powershell -NoProfile -ExecutionPolicy Bypass -File scripts\test-local.ps1` -> passed: `519` Python tests, all Node frontend tests, Python syntax `117` files, JavaScript syntax `147` files, and secret scan `566` files.
- Remaining manual check: run a real Electron chat/model split-window reply with a clearly playful and a clearly comforting delivery. Confirm the detached model's mouth cadence plus body/expression rhythm visibly differ without a late neutral flash at the speech tail.

## Current Objective: Per-Turn Browser Playback Generation Continuity v1 Started on 2026-07-11

- Audit evidence: Browser TTS increments `ttsPlaybackGeneration` when playback starts. The reply controller holds the previous generation for the whole turn, so actual Browser `onstart` callbacks can be rejected as stale; multi-segment voice timelines can also reject their later browser segments. This affects the default Browser TTS route and server-TTS fallback to Browser TTS, creating a text/voice and Live2D timing mismatch.
- Intended change: retain strict cross-turn cancellation fencing while making the expected Browser generation handoff continuous within one current turn/session. Cover direct, streamed fallback, and multi-segment voice timelines without changing providers, server behavior, or private configuration.

## Per-Turn Browser Playback Generation Continuity v1 Completed on 2026-07-11

- Result: Browser TTS now has a separate per-utterance playback token while the global `ttsPlaybackGeneration` remains the cross-turn cancellation lease. Chat-owned direct speech, segmented speech, latency hints, prewarm tails, and final stream fallback/recovery opt into preserving the current turn's generation, so valid Browser `onstart` callbacks can start the canonical Live2D speech timeline instead of being discarded as stale.
- Safety: default direct Browser calls still advance the global generation. Current-turn Browser speech uses token checks for `onstart`, `onend`, `onerror`, and silent-start watchdogs; interrupted or superseded callbacks settle as obsolete and cannot cancel newer speech. Server TTS invalidates any Browser token before calling `speechSynthesis.cancel()`.
- Verification Evidence:
  - `node tests\test_tts_playback_start_frontend.js` and `node tests\test_companion_turn_contract_frontend.js` -> passed.
  - `node scripts\run_node_tests.js` -> passed.
  - `powershell -NoProfile -ExecutionPolicy Bypass -File scripts\test-local.ps1` -> passed: `519` Python tests, full Node frontend suite, Python syntax `117` files, JavaScript syntax `147` files, and secret scan `566` files.
- Remaining boundary: this fixes valid same-turn Browser playback identity. A separate follow-up is now active for cancelled playback promise settlement, because stopped HTML/AudioContext/Browser playback can still leave some callers waiting for old callback timeouts.

## Current Objective: Cancelled Playback Promise Settlement v1 Started on 2026-07-11

- Audit evidence: cancellation currently stops media and invalidates tokens/generations, but some playback promises depend on native `onended`, `onerror`, or timeout callbacks that may not fire after manual stop/cancel. In no-barge-in flows, that can hold a chat-owned microphone pause lease until a watchdog window instead of settling promptly.
- Intended change: add explicit cancellation settlement for playback waiters while preserving session/generation fencing and without changing providers, backend routes, ASR, memory, permissions, private configuration, or model assets.

## Cancelled Playback Promise Settlement v1 Completed on 2026-07-11

- Result: Browser TTS, HTML audio, and AudioContext playback now register local cancellation waiters. `stopCurrentMediaInPlace()` resolves those waiters before cancelling speech synthesis, pausing HTML audio, or stopping an AudioContext buffer source, so interrupted/superseded playback promises no longer wait for missing native callbacks or long fallback timers.
- Safety: waiters unregister on normal success, failure, stale resolution, and cancellation. Cancelled Browser speech resolves through the same `settle(false)` path that cleans up the waiter; cancelled HTML audio revokes its object URL; cancelled AudioContext playback is explicitly reported as cancelled/stale and cannot be mistaken for successful audio. Newer current playback keeps its own token/generation checks.
- Verification Evidence:
  - `node tests\test_tts_playback_start_frontend.js` -> passed, including Browser, HTML audio, and AudioContext cancellation-settlement regressions.
  - `node scripts\run_node_tests.js` -> passed.
  - `powershell -NoProfile -ExecutionPolicy Bypass -File scripts\test-local.ps1` -> passed: `519` Python tests, full Node frontend suite, Python syntax `117` files, JavaScript syntax `147` files, and secret scan `566` files.
- Remaining manual check: in the real Electron app with no-barge-in enabled, interrupt a speaking reply and confirm the microphone resumes promptly without waiting for the old playback timeout. Also test one normal Browser TTS reply and one server-TTS fallback reply to confirm speech motion still starts on actual audio.

## Current Objective: Companion Experience Diagnostics v1 Started on 2026-07-12

- Audit evidence: chat and TTS already emit useful performance events, but they are fragmented across console logs and TTS debug events. There is no compact per-turn view of first headers, first visible text, reply readiness, TTS readiness, first audible playback, completion, or fallback/cancellation outcome during a real Electron session.
- Intended change: add a developer-only, bounded, text-free latency collector and panel using the existing performance events and developer lazy-loader. The normal view must not load it, and no conversation text, audio, prompts, credentials, local paths, or desktop data may be retained.

## Companion Experience Diagnostics v1 Completed on 2026-07-12

- Result: developer mode now exposes an `体验延迟` control and a compact recent-turn panel for API headers, first visible text, reply readiness, TTS response readiness, first actual Browser/HTML/AudioContext sound, and playback completion. The collector reuses the existing chat/TTS trace id and keeps at most 12 recent turns in renderer memory.
- Privacy and runtime boundary: only allowlisted timings, provider/mode enums, numeric status, and bounded outcome/fallback tokens are retained. Text, character counts, audio, prompts, credentials, model paths, and desktop data are discarded. The module is loaded only by the existing developer-feature loader; normal views do not install it.
- Playback behavior: Browser TTS, HTML audio, and AudioContext paths now emit diagnostic-only play-start/play-end performance events. Their existing generation/session checks, cancellation, playback, fallback, provider selection, and Live2D callbacks are unchanged.
- Verification Evidence:
  - `node tests\test_companion_experience_diagnostics_frontend.js`, `node tests\test_tts_playback_start_frontend.js`, `node tests\test_frontend_runtime_efficiency.js`, and `node tests\test_character_runtime_frontend.js` -> passed.
  - `node scripts\run_node_tests.js` -> passed, including the new diagnostics regression.
  - `powershell -NoProfile -ExecutionPolicy Bypass -File scripts\test-local.ps1` -> passed: `519` Python tests, the full Node frontend suite, Python syntax `117` files, JavaScript syntax `149` files, and secret scan `568` files.
  - JSON validation and scoped `git diff --check` -> passed.
- Remaining manual check: launch Electron with developer mode (`?dev=1` or the existing local developer flag), open `体验延迟`, and run one Browser TTS turn plus one GPT-SoVITS/fallback turn. Confirm the visible first-sound numbers match perceived delay. This slice intentionally does not persist or export measurements.
- Recommended next feature: use those real measurements to implement provider-capability-gated streaming audio playback without changing the user's provider choice or safety defaults.
