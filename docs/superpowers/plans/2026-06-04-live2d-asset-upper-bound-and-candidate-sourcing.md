# Live2D Asset Upper Bound And Candidate Sourcing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Test both viable paths for improving emotion readability: Hiyori runtime-resource tuning and stronger local/online Live2D candidate evaluation.

**Architecture:** Keep repository defaults on Hiyori while evaluating stronger assets in a non-destructive local probe path. Treat `.moc3` as runtime output, not editable source; only `motion3.json`, `exp3.json`, `pose3.json`, and runtime parameter mapping are editable inside the current repo.

**Tech Stack:** Electron, Live2D Cubism runtime, Node frontend tests, CDP smoke screenshots, PowerShell, official Live2D sample packages.

---

### Task 1: Record Current Asset Boundary

**Files:**
- Modify: `progress.md`
- Modify: `session-handoff.md`

- [x] **Step 1: Inspect editable source availability**

Run:

```powershell
Get-ChildItem -Recurse -Filter *.cmo3 -File .
Get-ChildItem -Recurse -File web\models\hiyori_pro_t11 | Select-Object FullName,Length
```

Expected: no `.cmo3` files; Hiyori only has runtime files such as `.moc3`, textures, physics, pose, expressions, and motions.

- [x] **Step 2: Record the boundary**

Append to `progress.md` and `session-handoff.md` that true mesh/bone edits require a `.cmo3` source model or a replacement asset, while local Hiyori tuning remains limited to runtime resources.

### Task 2: Hiyori Upper-Bound Probe

**Files:**
- Modify: `tests/test_performance_cue_frontend.js`
- Modify: `web\models\hiyori_pro_t11\motion\hiyori_thinking_01.motion3.json`
- Modify: `web\live2dExpressionController.js`

- [x] **Step 1: Add a failing upper-bound guard**

Extend `tests/test_performance_cue_frontend.js` so the thinking motion and runtime accent must expose explicit upper-bound metadata:

```js
assert.ok(
  state.speechPerformanceAccentDebug?.thinkingUpperBoundProbe === true,
  "high thinking cue should mark the Hiyori upper-bound probe when using runtime-only resources"
);
```

- [x] **Step 2: Run the targeted test to verify RED**

Run:

```powershell
node tests\test_performance_cue_frontend.js
```

Expected: fail on the new upper-bound probe assertion.

- [x] **Step 3: Implement minimal upper-bound metadata**

In `web\live2dExpressionController.js`, add `thinkingUpperBoundProbe: true` to the existing `thinking` debug object. Do not add new model parameters unless visual smoke shows a clear gain over the current snap-jitter path.

- [x] **Step 4: Run targeted GREEN**

Run:

```powershell
node tests\test_performance_cue_frontend.js
```

Expected: pass.

### Task 3: Local Haru Candidate Probe

**Files:**
- Create or modify only if needed: `docs/live2d/models/haru_greeter_t03` remains source candidate; do not copy into `web/models` until visual smoke justifies it.
- Modify: `progress.md`
- Modify: `session-handoff.md`

- [x] **Step 1: Inspect candidate completeness**

Run:

```powershell
Get-ChildItem -Recurse -File docs\live2d\models\haru_greeter_t03 | Select-Object FullName,Length
python -m json.tool docs\live2d\models\haru_greeter_t03\haru_greeter_t03.model3.json
```

Expected: Haru has `.model3.json`, `.moc3`, textures, physics, pose, display info, and many `motion3.json` files. Expressions may be absent.

- [x] **Step 2: Capture a Haru local smoke without committing it as default**

Temporarily launch Electron with a local config override or CDP model path probe. Save screenshots under:

```text
%USERPROFILE%\AppData\Local\Temp\ai_desktop_pet_smoke\haru-candidate-v1\
```

Expected: screenshots compare Haru motion readability against the current Hiyori thinking snap path.

### Task 4: Online Candidate Sourcing

**Files:**
- Modify: `progress.md`
- Modify: `session-handoff.md`

- [x] **Step 1: Search official and clearly licensed sources**

Use official Live2D sample pages and GitHub-hosted official sample resources first. Candidate filter:

```text
model3.json + moc3 + textures + motions + expressions if available + physics if available + clear terms
```

- [x] **Step 2: Record candidate table**

Record candidates in `progress.md` with:

```text
name | source URL | package completeness | expression/motion strength | redistribution status | recommended next action
```

Expected: no third-party asset is committed unless the license allows redistribution and the user approves.

### Task 5: Verification

**Files:**
- Modify: `progress.md`
- Modify: `session-handoff.md`

- [x] **Step 1: Run targeted checks**

Run:

```powershell
node tests\test_performance_cue_frontend.js
node scripts\run_node_tests.js
python -m json.tool package.json
python -m json.tool feature_list.json
python -m py_compile app.py config.py tts.py memory.py tools.py llm_client.py asr.py emotion.py humanize.py utils.py
git diff --check -- web\live2dExpressionController.js tests\test_performance_cue_frontend.js progress.md session-handoff.md
```

Expected: all pass, or failures are recorded with exact reason.

- [x] **Step 2: Final decision note**

## Result Summary

- Hiyori source-model editing is blocked in this repository because no `.cmo3` source files are present. Current Hiyori work is bounded to runtime resources and controller-side parameter layering.
- Hiyori thinking now exposes `thinkingUpperBoundProbe: true` in the high-thinking debug payload so later harness checks remember that this is a runtime-only upper-bound path.
- Local `haru_greeter_t03` loads in the current Electron/Pixi runtime and has `Idle=6`, `Use=15`. Best observed motions were `m10` for visible arm spread and `m20/m19/m22` for smaller pose changes. It is usable as a local visual candidate but has no obvious expression pack in this local copy.
- Official `Live2D/CubismWebSamples` `Mao` was temporarily pulled into a temp directory and inspected. It has 8 expressions and strong `TapBody` motions, but direct loading in the current bundled `cubism4.min.js` runtime failed at `Live2DModel.from()` with `Unknown error`, so it is a stronger-resource candidate only after a runtime compatibility upgrade or older compatible export.
- No third-party or online model asset was committed. Temporary probe directories under `web/models/haru_greeter_t03_probe` and `web/models/mao_probe` were removed after smoke.

Record whether Hiyori runtime tuning is still worth continuing, whether Haru is a better local candidate, and which online candidates deserve a later import smoke.
