# Xinyu Original Live2D v1 Design

Date: 2026-06-19

## Goal

Create a first original Live2D model path for Xinyu Desktop Pet, starting from a new front-facing half-body character design and ending with a Cubism-exported runtime model that can load in the existing app through `model_path`.

The first version prioritizes a working model over commercial-grade polish:

- Model displays in the Electron desktop window.
- Eye blink works.
- Mouth open parameter works with existing speech animation.
- Head and body have light motion suitable for idle/talking.
- Exported runtime files live under `web/models/xinyu_original_v1/`.
- Existing Hiyori model and configuration remain compatible.

## Non-Goals

- Do not replace Hiyori as a fallback model until the original model loads successfully.
- Do not attempt a full VTuber-grade rig in v1.
- Do not add unlicensed third-party model assets.
- Do not commit installers, private samples, generated workbench scratch files, or Cubism source files unless explicitly approved.
- Do not push or merge to `main`.

## Current Project Fit

The existing app loads Live2D from `config.json` via:

```json
"model_path": "/models/.../...model3.json"
```

The frontend loads that path with `Live2DModel.from(state.config.model_path)` in `web/live2dRuntimeController.js`. The config UI already has a Live2D model path field and a model validation endpoint. This means the original model integration can be scoped to asset placement, config switching, and validation.

The existing Hiyori model is runtime-only. It has `.moc3`, `.model3.json`, textures, physics, pose, motions, and local expression files, but no `.cmo3` source model. It should not be treated as editable source for an original character.

## Phases

### Phase 1: Tool Setup

Use the official Live2D Cubism Editor download page to confirm the current stable Windows installer before downloading. The installer can be downloaded and launched automatically, but the user must complete license/UAC/installation prompts.

The installer is kept outside the repository, for example under a local temporary or workbench downloads folder.

### Phase 2: Workbench

Create a project-external workbench:

```text
D:\AI\live2d_xinyu_original_v1_workbench\
  references\
  source-art\
  layers\
  cubism-export\
  notes\
```

The workbench is intentionally outside `D:\AI\ai_desktop_pet` so incomplete art, PSD-like intermediates, and installer artifacts do not pollute the repository.

### Phase 3: Original Character Art

Generate a new character image designed for Live2D rigging rather than reusing the earlier README showcase scene. The art should be:

- Front-facing or near-front-facing.
- Half-body.
- Symmetric enough for beginner rigging.
- Simple hair silhouette.
- Clear separated eyes, brows, mouth, face, neck, torso, arms, and clothing.
- No text, logo, watermark, API key, private config, or third-party brand mark.

### Phase 4: Layer Preparation

Prepare a first-pass layer package and layer checklist. Minimum layer groups:

- Face base
- Back hair
- Side/front hair pieces
- Left/right eye whites
- Left/right pupils
- Left/right upper eyelids
- Left/right lower eyelids
- Left/right brows
- Mouth closed/open parts or simple mouth shapes
- Neck
- Torso/clothing
- Left/right arms or sleeves
- Accessories, if simple

The v1 model can omit complex physics-only detail. Any layer requiring hidden-area repainting should be listed so the user can decide whether to accept rough v1 quality or invest more cleanup.

### Phase 5: Cubism Manual Rigging

In Cubism Editor, create the source model from the layer package and rig only the minimum parameter set:

- `ParamEyeLOpen`
- `ParamEyeROpen`
- `ParamMouthOpenY`
- `ParamMouthForm`
- `ParamAngleX`
- `ParamAngleY`
- `ParamAngleZ`
- `ParamBodyAngleX`
- `ParamBodyAngleY`
- Optional simple hair/body physics if the setup remains manageable

Export with `File -> Export for Embedded Use -> Export as MOC3 file`.

### Phase 6: Runtime Integration

Place the exported files under:

```text
D:\AI\ai_desktop_pet\web\models\xinyu_original_v1\
  xinyu_original_v1.model3.json
  xinyu_original_v1.moc3
  xinyu_original_v1.2048\
    texture_00.png
```

Optional files can be added if exported:

```text
  xinyu_original_v1.physics3.json
  xinyu_original_v1.pose3.json
  expressions\
  motion\
```

Then set:

```json
"model_path": "/models/xinyu_original_v1/xinyu_original_v1.model3.json"
```

The existing config UI should continue to allow reverting to Hiyori or any other valid model path.

## Validation

Run the smallest useful checks after each phase:

- Confirm the official installer download source before downloading.
- Confirm workbench files are outside the repository.
- Confirm generated art is suitable for split-layer work.
- Confirm exported `.model3.json` is valid JSON.
- Use the existing Live2D validation endpoint or UI check after placing exported files.
- Run the app and verify the model displays, blinks, and opens mouth during speech.

Before any push, keep the existing project rules:

```powershell
python -m json.tool config.example.json
python -m json.tool package.json
python -m py_compile app.py config.py tts.py memory.py tools.py llm_client.py asr.py emotion.py humanize.py utils.py
```

## Risks

- Cubism Editor rigging is interactive; Codex can prepare files and instructions, but the user must complete license/UAC/install prompts and may need to perform editor operations.
- AI-generated art is not a clean PSD by default. Layer extraction may require manual cleanup and repainting hidden areas.
- A first original model may load but look rough during deformation.
- Export compatibility depends on the app's bundled Cubism runtime. If the exported model fails to load, the next step is to inspect runtime errors and either adjust export settings or upgrade the runtime deliberately.
- The repository currently has unrelated local modifications. Any commits must stage only files belonging to this Live2D work.

## Approval

The user approved the all-in route on 2026-06-19 with the constraint that the first real version should be an original Live2D export, not just an occupied model slot with an existing placeholder.
