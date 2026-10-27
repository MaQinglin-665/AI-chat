# Third-Party Notices

This project is an early preview desktop AI pet experiment. The project source code is licensed under the repository `LICENSE` unless a file or asset says otherwise.

Some bundled runtime files, sample models, media, and generated/project assets keep their own terms. Do not assume the project MIT license gives permission to reuse every asset outside this repository.

This document is a practical release checklist, not legal advice. Before publishing a new preview package, verify any newly added asset has a clear source and redistribution boundary.

## Vendored Browser Runtime

| Paths | Component | Notice |
| --- | --- | --- |
| `web/vendor/pixi.min.js`, `docs/live2d/vendor/pixi.min.js` | PixiJS | PixiJS is distributed under the MIT license. Keep upstream license notices when redistributing. Source: https://github.com/pixijs/pixijs |
| `web/vendor/pixi-unsafe-eval.min.js` | `@pixi/unsafe-eval` 6.5.8 | Official PixiJS CSP compatibility patch, distributed under the MIT license. It replaces runtime-generated uniform sync functions so Pixi can run where `unsafe-eval` is blocked. Source: https://www.npmjs.com/package/@pixi/unsafe-eval |
| `web/vendor/cubism4.min.js` | pixi-live2d-display `0.4.0+ai-chat.core6.1` (local compatibility build) | Based on upstream `0.4.0` for PixiJS 6. Display integration: MIT, Copyright (c) 2020 Guan; embedded Cubism Framework: Live2D Open Software License. Sources: https://github.com/guansss/pixi-live2d-display/tree/v0.4.0 and https://www.live2d.com/eula/live2d-open-software-license-agreement_en.html . Local patch and limits below. |
| `docs/live2d/vendor/cubism4.min.js` | pixi-live2d-display `0.4.0` with embedded Cubism Framework | Existing docs copy remains unchanged. The integration and embedded Framework retain their respective upstream terms listed above. |
| `web/vendor/live2dcubismcore.min.js` | Live2D Cubism Core `06.00.0001` (SDK Web `5-r.5`) | Unmodified official minified Core; SHA256 `8741f739779b5d5210872bd3d7d99f0f1e56e6c87409e7d26d6bb4b80aa1ef47`. Live2D Proprietary Software License; distribution notice below. Source: https://www.live2d.com/en/sdk/download/web/ |
| `docs/live2d/vendor/live2dcubismcore.min.js` | Live2D Cubism Core `04.02.0002` | Existing documentation runtime remains unchanged, paired with the unpatched display library. SHA256 `29b32715c117b2c00ddd9e978cb0eb951105f56477b40f309d9feb3290bf1386`. Live2D Proprietary Software License. Source: https://www.live2d.com/en/sdk/about/ |

### Local PixiJS 6 / Core 6 compatibility patch

This is a project-maintained patch, not an upstream release or an upgrade to PixiJS 8. The original display bundle SHA256 is `af1267e6d52759b245766c578d905bfa025b532d5c3cc727c370957c4409e21b`. Reproduce it with `python scripts/patch_live2d_display_core6.py` on the original bundle; already-patched input is unchanged and unknown input is rejected.

The embedded Framework's `CubismModel.getDrawableRenderOrders()` keeps using `model.drawables.renderOrders` with older Core, and falls back to `model.renderOrders` with Core 6. No Core code, animation parameters, motion handling, shader or Pixi version is changed. Cubism 5.3 offscreen effects are unsupported by this compatibility build and produce a clear error; it is not a full Cubism 5.3 renderer. Local browser acceptance covers existing Hiyori and the official SDK's Mao sample, both without offscreen objects.

The official Cubism SDK for Web `5-r.5` contains Core `06.00.0001`. Source: https://www.live2d.com/en/sdk/download/web/ ; archive: https://cubism.live2d.com/sdk-web/bin/CubismSdkForWeb-5-r.5.zip (SHA256 `67064a7fb1812cf502f5c4a03bfe12cc638c75a621bb4acf06bb28763df06ba0`). The author approved including only the Web application's Core before stage 2 mapping work. Documentation Core/display stay unchanged; SDK samples and models are not included.

### Cubism Core redistribution notice

Live2D Cubism Core is Copyright (C) 2019 Live2D Inc. All rights reserved. The official file's copyright and license header is retained byte-for-byte. This component is **not** covered by the project's MIT license; use, copying and redistribution must comply with the [Live2D Proprietary Software License Agreement](https://www.live2d.com/eula/live2d-proprietary-software-license-agreement_en.html), including its protection and redistribution conditions. No broader rights or model redistribution permission are granted by this repository.

The supplied SDK's `Core/RedistributableFiles.txt` states that the following files are available for redistribution **under the terms of that agreement**: `live2dcubismcore.d.ts`, `live2dcubismcore.js`, and `live2dcubismcore.min.js`. Only the unmodified minified file is included here as part of the application's character-rendering functionality. Keep this notice and the embedded header with redistributed copies. Application publication requirements remain separate from this file's redistribution designation; see https://www.live2d.com/en/sdk/license/ .

The display integration's upstream MIT notice (the embedded Live2D Framework and Core retain their separate licenses):

```text
MIT License

Copyright (c) 2020 Guan

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

## Local VRM browser runtime

`web/vendor/vrm/vrm-vendor.js` bundles **three.js 0.180.0** (including GLTFLoader)
and **@pixiv/three-vrm 3.4.4**. Both are MIT licensed. Their full notices are
`web/vendor/vrm/THREE-LICENSE.txt` and `web/vendor/vrm/THREE-VRM-LICENSE.txt`.
Upstream sources: https://github.com/mrdoob/three.js/tree/r180 and
https://github.com/pixiv/three-vrm/tree/v3.4.4 . Packages were obtained from the npm
registry at these exact versions, not from a runtime CDN. Rebuild with
`scripts/build_vrm_vendor.cjs` and esbuild **0.25.11** (build-time only, MIT).
The browser loads only the bundled local file. No VRM/VRMA model data is bundled.
User models retain their own attribution and use restrictions, displayed from
VRM metadata and an optional adjacent README.txt; this project does not grant
rights to redistribute those models.

## Live2D Sample Models

| Paths | Asset | Notice |
| --- | --- | --- |
| `web/models/hiyori_pro_t11/`, `docs/live2d/models/hiyori_pro_t11/` | Live2D sample model Hiyori | Treat as Live2D sample data, not project-owned source code. Verify the current Live2D sample data terms before public redistribution. Source: https://www.live2d.com/en/learn/sample/ |
| `docs/live2d/models/haru_greeter_t03/` | Live2D sample model Haru | Treat as Live2D sample data, not project-owned source code. Verify the current Live2D sample data terms before public redistribution. Source: https://www.live2d.com/en/learn/sample/ |

## Project Media And Demo Assets

| Paths | Notice |
| --- | --- |
| `docs/assets/demo-*.mp4` | Demo captures for explaining the project preview. Do not reuse as generic stock media. |
| `web/assets/assistant_avatar_*.png`, `web/assets/reference_full.png`, `docs/assets/og-cover.png`, `docs/assets/favicon.svg` | Project preview / website assets. Treat as project-specific assets unless a separate source file states otherwise. |
| `tts_ref/README.md` | Placeholder documentation only. Local reference audio files are intentionally ignored and should not be committed. |

## Runtime Dependencies

Python and Node dependencies are installed from package managers during setup and are not vendored by this repository. Their licenses remain governed by their upstream packages.

Voice-boundary dependencies added for the optional local microphone path:

| Package | License | Purpose / source |
| --- | --- | --- |
| `@ricky0123/vad-web` | ISC | Browser microphone adapter for Silero VAD. Source: https://github.com/ricky0123/vad |
| `onnxruntime-web` | MIT | Local WebAssembly inference runtime used by the VAD adapter. Source: https://github.com/microsoft/onnxruntime |
| Silero VAD ONNX model distributed by `@ricky0123/vad-web` | MIT | Local voice-activity model. Source: https://github.com/snakers4/silero-vad |
| `faster-qwen3-tts` | MIT | Optional isolated CUDA streaming runtime for the Qwen3-TTS provider. It is installed separately and is not bundled. Source: https://github.com/andimarafioti/faster-qwen3-tts |
| Qwen3-TTS model/code | Apache-2.0 | Optional local TTS model family. Model weights are downloaded into the user's model cache and must not be committed or packaged. Source: https://github.com/QwenLM/Qwen3-TTS |
| `funasr-onnx` | MIT | Optional isolated ONNX runtime for the persistent loopback SenseVoice service. It is installed separately and is not bundled. Source: https://github.com/modelscope/FunASR |
| SenseVoice / SenseVoiceSmall-onnx | Model-specific upstream terms | Optional local ASR model. Weights are downloaded into the user's ModelScope cache and must not be committed or packaged. Verify the current model-card terms before redistribution. Source: https://github.com/FunAudioLLM/SenseVoice |

Useful references:

- Node package metadata: `package-lock.json`
- Python dependency list: `requirements.txt`, `requirements-dev.txt`, `requirements-asr.txt`, `requirements-asr-service.txt`
- Docs tooling metadata: `docs/package.json`, `docs/package-lock.json`

## Release Packaging Rule

### Optional local Mao sample model

Mao Niziiro is an official Live2D Inc. sample from Cubism SDK for Web 5-r.5, acquired from https://www.live2d.com/en/sdk/download/web/ . Model files are not included in this repository or its source packages. Local use follows the [Free Material License](https://www.live2d.com/eula/live2d-free-material-license-agreement_en.html) and [Sample Model Terms](https://www.live2d.com/eula/live2d-sample-model-terms_en.html); see [local setup and attribution](docs/avatar-live2d-mao.md). The local renderer displays the required sample-model credit and links. Mapping expression/motion names does not transfer ownership of the character to this project.

### KayKit: Furniture Bits 1.0 (FREE subset)

- Author: Kay Lousberg.
- Source: https://kaylousberg.itch.io/furniture-bits
- License: Creative Commons Zero 1.0 Universal (CC0); original `License.txt` is included unchanged.
- Location: `web/vendor/scenes/kaykit-furniture/`.
- Selected glTF models and their required binary meshes: decorated shelf, standing lamp, cactus,
  oval rug, pillow, table, chair, couch and two picture frames; one shared `furniturebits_texture.png`.
  The complete asset pack is not redistributed. These licensed room assets are distinct from private VRM avatars.

Preview source-test packages should include this notice file. Do not add new sample models, generated images, reference audio, screenshots, or demo videos to the package unless their source and redistribution boundary are recorded here.

## Stylized Hand-Painted room — OzerGokmen

This work is based on "Stylized Hand-Painted room" by OzerGokmen.
Source: https://sketchfab.com/3d-models/stylized-hand-painted-room-53f5744bfe89424995eed0cce43fb427
Author: https://sketchfab.com/OzerGokmen
License: Creative Commons Attribution 4.0 International (CC BY 4.0)
https://creativecommons.org/licenses/by/4.0/
Original author-supplied notice: license.txt. No endorsement by the original author is implied.

Changes in Xinyu (2026-10-26):
- Retain original scene.bin and 15 base-color textures byte-for-byte. All supplied images are 2048x2048; no resizing was required.
- Remove normal/metallic-roughness references from scene.gltf; omit those unused maps. Retained unused image slots redirect to a packaged base-color image.
- Runtime uniform scale 0.014 metres/source unit and floor offset -20.46 * 0.014 metres.
- Clone/transformed geometry for a cutaway: omit front/right shell and high ceiling triangles; omit the central coffee table and its small props to create a walking aisle.
- Replace PBR materials with unlit base-color materials; apply interpolated cool/night and warm/day tint. Tag window and pendant-light meshes as future bloom sources; no bloom effect yet.
- Add a separate CC0 KayKit chair. Character, camera, lights, paths and animation are application additions, not part of the original work.
- Original download outside the repository remains unchanged.

## AI-generated bedroom background images

Files: `web/assets/backgrounds/bedroom/{day,dusk,night}.webp`. User-provided AI-generated images, authorized by the user for repository publication and application packaging on 2026-10-26. Converted from local PNG originals to quality-90 WebP at 2560×1440; originals are not included. Provenance and SHA-256 manifest are beside the assets. This note does not independently verify the generating platform terms or assert a separate CC0 license. These images are unrelated to the CC BY 3D room preset `handpainted`.
