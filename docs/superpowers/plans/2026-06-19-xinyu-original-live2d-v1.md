# Xinyu Original Live2D V1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the first true original Live2D model pipeline for Xinyu Desktop Pet, from official editor setup and original character art through Cubism export and app loading.

**Architecture:** Keep all incomplete art, downloads, PSD attempts, and Cubism source work outside the repository in a dedicated workbench. Only validated runtime model assets and small repo documentation enter `D:\AI\ai_desktop_pet`. Use the app's existing `model_path` loading path and Live2D validation UI/API rather than adding a new model loader.

**Tech Stack:** Windows PowerShell, official Live2D Cubism Editor, built-in image generation, PNG/PSD layer assets, Electron, PIXI Live2D Cubism runtime, Node frontend checks, Python JSON validation.

---

## Scope Check

This plan spans tool setup, art generation, manual Cubism work, and app integration. The phases are sequential and each produces a testable artifact. The manual Cubism phase is explicit: do not fabricate `.moc3` or `.model3.json`; only integrate files exported by Cubism Editor.

## File Structure

Workbench, outside the repo:

```text
D:\AI\live2d_xinyu_original_v1_workbench\
  downloads\
  references\
  source-art\
  layers\
  psd\
  cubism-export\
  notes\
  tools\
```

Repository paths used after Cubism export:

```text
D:\AI\ai_desktop_pet\
  docs\live2d\xinyu-original-v1.md
  web\models\xinyu_original_v1\
    xinyu_original_v1.model3.json
    xinyu_original_v1.moc3
    xinyu_original_v1.2048\
      texture_00.png
```

Existing config path used for runtime loading:

```json
"model_path": "/models/xinyu_original_v1/xinyu_original_v1.model3.json"
```

## Task 1: Workbench And Tooling Setup

**Files:**
- Create: `D:\AI\live2d_xinyu_original_v1_workbench\downloads\`
- Create: `D:\AI\live2d_xinyu_original_v1_workbench\references\`
- Create: `D:\AI\live2d_xinyu_original_v1_workbench\source-art\`
- Create: `D:\AI\live2d_xinyu_original_v1_workbench\layers\`
- Create: `D:\AI\live2d_xinyu_original_v1_workbench\psd\`
- Create: `D:\AI\live2d_xinyu_original_v1_workbench\cubism-export\`
- Create: `D:\AI\live2d_xinyu_original_v1_workbench\notes\`
- Create: `D:\AI\live2d_xinyu_original_v1_workbench\tools\`
- Create: `D:\AI\live2d_xinyu_original_v1_workbench\notes\tooling.md`

- [ ] **Step 1: Create the workbench directories**

Run:

```powershell
$root = 'D:\AI\live2d_xinyu_original_v1_workbench'
$dirs = @(
  'downloads',
  'references',
  'source-art',
  'layers',
  'psd',
  'cubism-export',
  'notes',
  'tools'
)
foreach ($dir in $dirs) {
  New-Item -ItemType Directory -Force -Path (Join-Path $root $dir) | Out-Null
}
Get-ChildItem -LiteralPath $root -Directory | Select-Object Name
```

Expected: all eight directory names are listed.

- [ ] **Step 2: Record official tooling sources**

Create `D:\AI\live2d_xinyu_original_v1_workbench\notes\tooling.md` with this content:

```markdown
# Tooling

Date: 2026-06-19

## Official Live2D Sources

- Editor download page: https://www.live2d.com/en/cubism/download/editor/
- PSD import manual: https://docs.live2d.com/en/cubism-editor-manual/psd-import/
- MOC3 export manual: https://docs.live2d.com/en/cubism-editor-manual/export-moc3-motion3-files/

## Local Policy

- Keep installers and scratch files outside `D:\AI\ai_desktop_pet`.
- Do not use mirrored Cubism installers.
- Do not commit Cubism installer files.
- Do not commit incomplete generated layer attempts unless the user asks for an archive.
- The user must complete Cubism license, UAC, and installation wizard prompts.
```

- [ ] **Step 3: Verify the workbench is outside the repo**

Run:

```powershell
Resolve-Path 'D:\AI\live2d_xinyu_original_v1_workbench'
Resolve-Path 'D:\AI\ai_desktop_pet'
```

Expected: the two resolved paths are siblings under `D:\AI`, not nested.

## Task 2: Download And Launch Cubism Editor Installer

**Files:**
- Create: `D:\AI\live2d_xinyu_original_v1_workbench\downloads\Live2D_Cubism_Setup_release.exe`
- Modify: `D:\AI\live2d_xinyu_original_v1_workbench\notes\tooling.md`

- [ ] **Step 1: Open the official download page**

Use the browser or web tool to open:

```text
https://www.live2d.com/en/cubism/download/editor/
```

Select the Windows release installer, not the beta installer. Record the release version shown by the official page in `notes\tooling.md` under a new heading:

```markdown
## Downloaded Editor

- Selected channel: latest release version
- Platform: Windows
- Download source: official Live2D Cubism Editor download page
- Release version shown on page: recorded during download
- Local installer path: `D:\AI\live2d_xinyu_original_v1_workbench\downloads\Live2D_Cubism_Setup_release.exe`
```

- [ ] **Step 2: Download the official installer**

Download the installer from the official page and save or rename it to:

```text
D:\AI\live2d_xinyu_original_v1_workbench\downloads\Live2D_Cubism_Setup_release.exe
```

Do not use third-party mirrors. If the official page requires a browser-mediated download, use the browser download and then move or rename the resulting `.exe` into the workbench downloads folder.

- [ ] **Step 3: Verify the installer exists**

Run:

```powershell
$installer = 'D:\AI\live2d_xinyu_original_v1_workbench\downloads\Live2D_Cubism_Setup_release.exe'
Get-Item -LiteralPath $installer | Select-Object FullName,Length,LastWriteTime
```

Expected: one `.exe` file is listed with non-zero length.

- [ ] **Step 4: Check Authenticode signature**

Run:

```powershell
$installer = 'D:\AI\live2d_xinyu_original_v1_workbench\downloads\Live2D_Cubism_Setup_release.exe'
Get-AuthenticodeSignature -LiteralPath $installer | Format-List Status,SignerCertificate,Path
```

Expected: `Status` is `Valid`. If `Status` is not `Valid`, stop and ask the user before launching.

- [ ] **Step 5: Launch installer for user-controlled install**

Run:

```powershell
$installer = 'D:\AI\live2d_xinyu_original_v1_workbench\downloads\Live2D_Cubism_Setup_release.exe'
Start-Process -FilePath $installer
```

Expected: the Windows installer opens. The user completes license, install path, and UAC prompts manually.

- [ ] **Step 6: Verify Cubism Editor can be found after installation**

Run:

```powershell
$candidates = @(
  'C:\Program Files',
  'C:\Program Files (x86)',
  "$env:LOCALAPPDATA\Programs"
)
foreach ($base in $candidates) {
  if (Test-Path -LiteralPath $base) {
    Get-ChildItem -LiteralPath $base -Recurse -Filter '*Cubism*Editor*.exe' -File -ErrorAction SilentlyContinue |
      Select-Object -First 10 FullName,Length,LastWriteTime
  }
}
```

Expected: at least one Cubism Editor executable path is listed. If none is listed, ask the user where Cubism was installed.

## Task 3: Generate Original Front-Facing Character Art

**Files:**
- Create: `D:\AI\live2d_xinyu_original_v1_workbench\notes\art-prompt.md`
- Create: `D:\AI\live2d_xinyu_original_v1_workbench\source-art\xinyu_original_v1_front.png`
- Create: `D:\AI\live2d_xinyu_original_v1_workbench\notes\art-review.md`

- [ ] **Step 1: Record the generation prompt**

Create `D:\AI\live2d_xinyu_original_v1_workbench\notes\art-prompt.md` with:

```markdown
# Xinyu Original V1 Art Prompt

Use case: stylized-concept
Asset type: Live2D source character art
Primary request: Create an original front-facing half-body anime desktop companion character for a Live2D beginner rig.
Subject: A friendly young AI desktop pet character inspired by modern developer tools, not a copy of any existing character.
Pose: Near-front-facing, relaxed shoulders, arms visible but simple, hands not covering face or torso.
Style/medium: Clean 2D anime illustration suitable for Live2D layer separation, crisp edges, simple readable shapes.
Composition/framing: Half-body, centered, neutral pose, full head and upper body visible, generous transparent or plain background margin.
Design details: Short light hair with simple side pieces, teal/coral accent accessories, hoodie or light jacket, expressive but simple face.
Layering constraints: Eyes, brows, mouth, hair, face, neck, torso, and arms must be visually separable. Avoid complex overlapping fingers, loose strands, transparent glass, smoke, heavy shadows, or detailed patterns.
Color palette: Warm white, teal, coral, soft graphite, small blue accents.
Text: none.
Avoid: text, logo, watermark, brand marks, API keys, private config, scene background, laptop, UI panels, props, complex hands, extreme perspective.
```

- [ ] **Step 2: Generate the source art**

Use the built-in image generation tool with the prompt in `notes\art-prompt.md`. Save the selected result to:

```text
D:\AI\live2d_xinyu_original_v1_workbench\source-art\xinyu_original_v1_front.png
```

Expected: a single front-facing half-body character image suitable for beginner Live2D separation.

- [ ] **Step 3: Verify image dimensions and readability**

Run:

```powershell
Add-Type -AssemblyName System.Drawing
$path = 'D:\AI\live2d_xinyu_original_v1_workbench\source-art\xinyu_original_v1_front.png'
$img = [System.Drawing.Image]::FromFile($path)
$info = [pscustomobject]@{
  Path = $path
  Width = $img.Width
  Height = $img.Height
  PixelFormat = $img.PixelFormat.ToString()
  Length = (Get-Item -LiteralPath $path).Length
}
$img.Dispose()
$info | Format-List
```

Expected: image is readable, at least 1024 pixels on its long edge, and not empty.

- [ ] **Step 4: Record art review**

Create `D:\AI\live2d_xinyu_original_v1_workbench\notes\art-review.md` with:

```markdown
# Art Review

Selected source: `D:\AI\live2d_xinyu_original_v1_workbench\source-art\xinyu_original_v1_front.png`

## Pass Criteria

- Front-facing or near-front-facing: pass
- Half-body: pass
- No readable text/logo/watermark: pass
- Eyes visible and separable: pass
- Brows visible and separable: pass
- Mouth visible and simple enough for v1 mouth open: pass
- Hair silhouette simple enough for v1: pass
- Arms visible and not blocking the face: pass

## Known V1 Compromises

- Hidden areas behind hair and mouth may need rough repainting during layer separation.
- Hands and sleeves will be kept simple in the first rig.
- Physics can be limited to simple hair/body movement.
```

If a criterion is false after visual inspection, generate one corrected revision and overwrite `xinyu_original_v1_front.png` with the better image before continuing.

## Task 4: Prepare Layer Package

**Files:**
- Create: `D:\AI\live2d_xinyu_original_v1_workbench\layers\xinyu_original_v1_layers_manifest.json`
- Create: `D:\AI\live2d_xinyu_original_v1_workbench\notes\layer-checklist.md`
- Create: `D:\AI\live2d_xinyu_original_v1_workbench\layers\*.png`

- [ ] **Step 1: Create the layer manifest**

Create `D:\AI\live2d_xinyu_original_v1_workbench\layers\xinyu_original_v1_layers_manifest.json` with:

```json
{
  "model_id": "xinyu_original_v1",
  "source_image": "D:\\AI\\live2d_xinyu_original_v1_workbench\\source-art\\xinyu_original_v1_front.png",
  "canvas": {
    "width": 2048,
    "height": 2048
  },
  "layers": [
    { "name": "back_hair", "file": "back_hair.png", "required": true },
    { "name": "face_base", "file": "face_base.png", "required": true },
    { "name": "neck", "file": "neck.png", "required": true },
    { "name": "torso_clothes", "file": "torso_clothes.png", "required": true },
    { "name": "left_arm", "file": "left_arm.png", "required": true },
    { "name": "right_arm", "file": "right_arm.png", "required": true },
    { "name": "front_hair", "file": "front_hair.png", "required": true },
    { "name": "left_eye_white", "file": "left_eye_white.png", "required": true },
    { "name": "right_eye_white", "file": "right_eye_white.png", "required": true },
    { "name": "left_pupil", "file": "left_pupil.png", "required": true },
    { "name": "right_pupil", "file": "right_pupil.png", "required": true },
    { "name": "left_upper_eyelid", "file": "left_upper_eyelid.png", "required": true },
    { "name": "right_upper_eyelid", "file": "right_upper_eyelid.png", "required": true },
    { "name": "left_brow", "file": "left_brow.png", "required": true },
    { "name": "right_brow", "file": "right_brow.png", "required": true },
    { "name": "mouth_closed", "file": "mouth_closed.png", "required": true },
    { "name": "mouth_open", "file": "mouth_open.png", "required": true },
    { "name": "accessory", "file": "accessory.png", "required": false }
  ]
}
```

- [ ] **Step 2: Produce transparent layer PNGs**

Use image editing and local image processing to create one transparent PNG per manifest entry under:

```text
D:\AI\live2d_xinyu_original_v1_workbench\layers\
```

Each PNG must have the same canvas dimensions so Cubism can import layers aligned. Required file names:

```text
back_hair.png
face_base.png
neck.png
torso_clothes.png
left_arm.png
right_arm.png
front_hair.png
left_eye_white.png
right_eye_white.png
left_pupil.png
right_pupil.png
left_upper_eyelid.png
right_upper_eyelid.png
left_brow.png
right_brow.png
mouth_closed.png
mouth_open.png
```

The v1 layer package may be visually rough, but it must not be a single flattened image duplicated across all layers.

- [ ] **Step 3: Verify required layer files exist**

Run:

```powershell
$root = 'D:\AI\live2d_xinyu_original_v1_workbench\layers'
$required = @(
  'back_hair.png',
  'face_base.png',
  'neck.png',
  'torso_clothes.png',
  'left_arm.png',
  'right_arm.png',
  'front_hair.png',
  'left_eye_white.png',
  'right_eye_white.png',
  'left_pupil.png',
  'right_pupil.png',
  'left_upper_eyelid.png',
  'right_upper_eyelid.png',
  'left_brow.png',
  'right_brow.png',
  'mouth_closed.png',
  'mouth_open.png'
)
$missing = foreach ($file in $required) {
  $path = Join-Path $root $file
  if (-not (Test-Path -LiteralPath $path)) { $file }
}
if ($missing) {
  throw "Missing layer files: $($missing -join ', ')"
}
Get-ChildItem -LiteralPath $root -Filter *.png | Select-Object Name,Length
```

Expected: all required PNGs are listed and have non-zero length.

- [ ] **Step 4: Record separation limitations**

Create `D:\AI\live2d_xinyu_original_v1_workbench\notes\layer-checklist.md` with:

```markdown
# Layer Checklist

## Required Layers

- back_hair.png
- face_base.png
- neck.png
- torso_clothes.png
- left_arm.png
- right_arm.png
- front_hair.png
- left_eye_white.png
- right_eye_white.png
- left_pupil.png
- right_pupil.png
- left_upper_eyelid.png
- right_upper_eyelid.png
- left_brow.png
- right_brow.png
- mouth_closed.png
- mouth_open.png

## V1 Quality Notes

- Layer edges may need cleanup in Cubism or an image editor.
- Hidden face areas behind front hair can be approximate.
- Mouth-open interior can be simple dark fill for v1.
- Eye blink can be achieved with upper eyelid movement first; lower eyelid movement is not required in v1.
```

## Task 5: Build PSD Or Cubism-Importable Layer Bundle

**Files:**
- Create: `D:\AI\live2d_xinyu_original_v1_workbench\psd\xinyu_original_v1.psd`
- Create: `D:\AI\live2d_xinyu_original_v1_workbench\notes\psd-import.md`

- [ ] **Step 1: Attempt layered PSD assembly**

Use a local image editor or a verified Python PSD writer to assemble the layer PNGs into:

```text
D:\AI\live2d_xinyu_original_v1_workbench\psd\xinyu_original_v1.psd
```

The layer order from back to front must be:

```text
back_hair
neck
torso_clothes
left_arm
right_arm
face_base
left_eye_white
right_eye_white
left_pupil
right_pupil
left_upper_eyelid
right_upper_eyelid
left_brow
right_brow
mouth_closed
mouth_open
front_hair
accessory
```

- [ ] **Step 2: Verify PSD or prepare manual fallback bundle**

Run:

```powershell
$psd = 'D:\AI\live2d_xinyu_original_v1_workbench\psd\xinyu_original_v1.psd'
if (Test-Path -LiteralPath $psd) {
  Get-Item -LiteralPath $psd | Select-Object FullName,Length,LastWriteTime
} else {
  throw "Layered PSD was not produced. Use the PNG layer bundle in Cubism only if Cubism can create ArtMeshes from the imported source images on this installed version."
}
```

Expected: the PSD exists. If local PSD assembly fails, stop before Cubism import and ask the user whether to use Krita/Photoshop/CSP manually to save the layer bundle as PSD.

- [ ] **Step 3: Write Cubism import notes**

Create `D:\AI\live2d_xinyu_original_v1_workbench\notes\psd-import.md` with:

```markdown
# Cubism PSD Import Notes

PSD path: `D:\AI\live2d_xinyu_original_v1_workbench\psd\xinyu_original_v1.psd`

## Import

1. Open Live2D Cubism Editor.
2. Drag `xinyu_original_v1.psd` into the Modeling Workspace.
3. Choose "Create new model from PSD file".
4. Confirm that each PSD layer becomes an ArtMesh.

## First Rig Targets

- Eye open: `ParamEyeLOpen`, `ParamEyeROpen`
- Mouth open: `ParamMouthOpenY`
- Mouth form: `ParamMouthForm`
- Head: `ParamAngleX`, `ParamAngleY`, `ParamAngleZ`
- Body: `ParamBodyAngleX`, `ParamBodyAngleY`

## Export

Use `File -> Export for Embedded Use -> Export as MOC3 file`.
Export folder: `D:\AI\live2d_xinyu_original_v1_workbench\cubism-export\xinyu_original_v1\`
```

## Task 6: Manual Cubism Rig And Export Gate

**Files:**
- Create: `D:\AI\live2d_xinyu_original_v1_workbench\cubism-export\xinyu_original_v1\`
- Create by Cubism export: `D:\AI\live2d_xinyu_original_v1_workbench\cubism-export\xinyu_original_v1\xinyu_original_v1.model3.json`
- Create by Cubism export: `D:\AI\live2d_xinyu_original_v1_workbench\cubism-export\xinyu_original_v1\xinyu_original_v1.moc3`
- Create by Cubism export: `D:\AI\live2d_xinyu_original_v1_workbench\cubism-export\xinyu_original_v1\xinyu_original_v1.2048\texture_00.png`
- Create: `D:\AI\live2d_xinyu_original_v1_workbench\notes\cubism-export-checklist.md`

- [ ] **Step 1: Create the export checklist**

Create `D:\AI\live2d_xinyu_original_v1_workbench\notes\cubism-export-checklist.md` with:

```markdown
# Cubism Export Checklist

## Manual Editor Actions

- Import `D:\AI\live2d_xinyu_original_v1_workbench\psd\xinyu_original_v1.psd`.
- Confirm all required layers appear as ArtMeshes.
- Rig eye open parameters.
- Rig mouth open parameter.
- Rig light head angle parameters.
- Rig light body angle parameters.
- Create texture atlas.
- Export embedded MOC3 files into `D:\AI\live2d_xinyu_original_v1_workbench\cubism-export\xinyu_original_v1\`.

## Exported Runtime Files Required

- xinyu_original_v1.model3.json
- xinyu_original_v1.moc3
- xinyu_original_v1.2048\texture_00.png

## V1 Acceptance

- Model opens in Cubism without missing texture errors.
- Eye open parameters change visible eyelid state.
- Mouth open parameter changes visible mouth state.
- Head/body parameters cause subtle deformation.
```

- [ ] **Step 2: User completes Cubism manual rigging**

The user performs the Cubism Editor operations from the checklist. Codex waits for the user to report that export files are present.

- [ ] **Step 3: Verify exported runtime files**

Run:

```powershell
$export = 'D:\AI\live2d_xinyu_original_v1_workbench\cubism-export\xinyu_original_v1'
$required = @(
  'xinyu_original_v1.model3.json',
  'xinyu_original_v1.moc3',
  'xinyu_original_v1.2048\texture_00.png'
)
$missing = foreach ($file in $required) {
  $path = Join-Path $export $file
  if (-not (Test-Path -LiteralPath $path)) { $file }
}
if ($missing) {
  throw "Missing Cubism export files: $($missing -join ', ')"
}
python -m json.tool (Join-Path $export 'xinyu_original_v1.model3.json') > $null
Get-ChildItem -LiteralPath $export -Recurse -File | Select-Object FullName,Length
```

Expected: JSON validation passes and all required export files are listed.

## Task 7: Integrate Exported Model Into Repo

**Files:**
- Create: `D:\AI\ai_desktop_pet\web\models\xinyu_original_v1\`
- Create: `D:\AI\ai_desktop_pet\web\models\xinyu_original_v1\xinyu_original_v1.model3.json`
- Create: `D:\AI\ai_desktop_pet\web\models\xinyu_original_v1\xinyu_original_v1.moc3`
- Create: `D:\AI\ai_desktop_pet\web\models\xinyu_original_v1\xinyu_original_v1.2048\texture_00.png`
- Create: `D:\AI\ai_desktop_pet\docs\live2d\xinyu-original-v1.md`
- Modify: `D:\AI\ai_desktop_pet\progress.md`
- Modify: `D:\AI\ai_desktop_pet\session-handoff.md`

- [ ] **Step 1: Copy exported runtime files into `web\models`**

Run:

```powershell
$src = 'D:\AI\live2d_xinyu_original_v1_workbench\cubism-export\xinyu_original_v1'
$dst = 'D:\AI\ai_desktop_pet\web\models\xinyu_original_v1'
New-Item -ItemType Directory -Force -Path $dst | Out-Null
Copy-Item -LiteralPath (Join-Path $src 'xinyu_original_v1.model3.json') -Destination $dst -Force
Copy-Item -LiteralPath (Join-Path $src 'xinyu_original_v1.moc3') -Destination $dst -Force
New-Item -ItemType Directory -Force -Path (Join-Path $dst 'xinyu_original_v1.2048') | Out-Null
Copy-Item -LiteralPath (Join-Path $src 'xinyu_original_v1.2048\texture_00.png') -Destination (Join-Path $dst 'xinyu_original_v1.2048') -Force
Get-ChildItem -LiteralPath $dst -Recurse -File | Select-Object FullName,Length
```

Expected: copied model runtime files appear under `web\models\xinyu_original_v1`.

- [ ] **Step 2: Write repo documentation**

Create `D:\AI\ai_desktop_pet\docs\live2d\xinyu-original-v1.md` with:

````markdown
# Xinyu Original Live2D V1

This folder documents the first original Live2D runtime model for Xinyu Desktop Pet.

## Runtime Path

```json
"model_path": "/models/xinyu_original_v1/xinyu_original_v1.model3.json"
```

## Source Workbench

The editable workbench is outside the repository:

```text
D:\AI\live2d_xinyu_original_v1_workbench\
```

Do not commit installers, private samples, or unfinished scratch layers.

## V1 Rig Scope

- Eye open
- Mouth open
- Simple head movement
- Simple body movement

## Fallback

If this model fails to load, revert `model_path` to the previous working Live2D model path.
````

- [ ] **Step 3: Validate copied model JSON**

Run:

```powershell
python -m json.tool web\models\xinyu_original_v1\xinyu_original_v1.model3.json > $null
```

Expected: command exits with code 0.

- [ ] **Step 4: Record progress and handoff**

Append concise entries to `progress.md` and `session-handoff.md` stating:

```text
- Xinyu original Live2D v1 integration
  - Runtime assets copied to `web\models\xinyu_original_v1`.
  - Config path to test: `/models/xinyu_original_v1/xinyu_original_v1.model3.json`.
  - Source workbench remains outside the repository at `D:\AI\live2d_xinyu_original_v1_workbench`.
```

## Task 8: Runtime Validation

**Files:**
- Read: `D:\AI\ai_desktop_pet\web\models\xinyu_original_v1\xinyu_original_v1.model3.json`
- Read: `D:\AI\ai_desktop_pet\web\live2dRuntimeController.js`
- Modify: `D:\AI\ai_desktop_pet\progress.md`
- Modify: `D:\AI\ai_desktop_pet\session-handoff.md`

- [ ] **Step 1: Run static validation**

Run:

```powershell
python -m json.tool config.example.json > $null
python -m json.tool package.json > $null
python -m json.tool web\models\xinyu_original_v1\xinyu_original_v1.model3.json > $null
python -m py_compile app.py config.py tts.py memory.py tools.py llm_client.py asr.py emotion.py humanize.py utils.py
```

Expected: all commands exit with code 0.

- [ ] **Step 2: Launch the app for manual model-path test**

Run:

```powershell
npm run start:electron
```

Expected: Electron starts. Use the app's Model / Voice config panel, set Live2D `model_path` to:

```text
/models/xinyu_original_v1/xinyu_original_v1.model3.json
```

Then click the Live2D model check button.

- [ ] **Step 3: Confirm basic behavior**

Manual checks:

```text
1. Model appears in the model window.
2. Model does not show missing texture errors.
3. Speaking test visibly opens the mouth.
4. Idle or speaking motion produces light movement.
5. Reverting to the previous Hiyori path remains possible.
```

- [ ] **Step 4: Record validation evidence**

Append this shape to `progress.md`:

```text
- Xinyu original Live2D v1 validation
  - JSON validation: passed or failed with exact error.
  - Python compile gate: passed or failed with exact error.
  - Electron load test: passed or failed with exact error.
  - Manual checks: model display, texture load, mouth movement, idle/speech movement, fallback path.
```

## Task 9: Final Git Hygiene And Commit

**Files:**
- Stage only files belonging to this feature:
  - `docs\live2d\xinyu-original-v1.md`
  - `web\models\xinyu_original_v1\xinyu_original_v1.model3.json`
  - `web\models\xinyu_original_v1\xinyu_original_v1.moc3`
  - `web\models\xinyu_original_v1\xinyu_original_v1.2048\texture_00.png`
  - `progress.md`
  - `session-handoff.md`

- [ ] **Step 1: Inspect feature-only status**

Run:

```powershell
git status --short -- docs\live2d\xinyu-original-v1.md web\models\xinyu_original_v1 progress.md session-handoff.md
```

Expected: only feature-related files are listed in this scoped status.

- [ ] **Step 2: Check whitespace for feature files**

Run:

```powershell
git diff --check -- docs\live2d\xinyu-original-v1.md web\models\xinyu_original_v1 progress.md session-handoff.md
```

Expected: no whitespace errors.

- [ ] **Step 3: Commit feature files only**

Run:

```powershell
git add -- docs\live2d\xinyu-original-v1.md web\models\xinyu_original_v1\xinyu_original_v1.model3.json web\models\xinyu_original_v1\xinyu_original_v1.moc3 web\models\xinyu_original_v1\xinyu_original_v1.2048\texture_00.png progress.md session-handoff.md
git commit -m "feat: add xinyu original live2d v1 model"
```

Expected: commit succeeds and does not include installer files, workbench scratch files, `config.json`, `.env`, private samples, or unrelated dirty files.
