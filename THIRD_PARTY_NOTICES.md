# Third-Party Notices

This project is an early preview desktop AI pet experiment. The project source code is licensed under the repository `LICENSE` unless a file or asset says otherwise.

Some bundled runtime files, sample models, media, and generated/project assets keep their own terms. Do not assume the project MIT license gives permission to reuse every asset outside this repository.

This document is a practical release checklist, not legal advice. Before publishing a new preview package, verify any newly added asset has a clear source and redistribution boundary.

## Vendored Browser Runtime

| Paths | Component | Notice |
| --- | --- | --- |
| `web/vendor/pixi.min.js`, `docs/live2d/vendor/pixi.min.js` | PixiJS | PixiJS is distributed under the MIT license. Keep upstream license notices when redistributing. Source: https://github.com/pixijs/pixijs |
| `web/vendor/pixi-unsafe-eval.min.js` | `@pixi/unsafe-eval` 6.5.8 | Official PixiJS CSP compatibility patch, distributed under the MIT license. It replaces runtime-generated uniform sync functions so Pixi can run where `unsafe-eval` is blocked. Source: https://www.npmjs.com/package/@pixi/unsafe-eval |
| `web/vendor/cubism4.min.js`, `docs/live2d/vendor/cubism4.min.js` | Live2D Cubism Framework for Web | Governed by Live2D Cubism SDK terms. Keep Live2D notices and verify the current SDK agreement before redistribution. Source: https://www.live2d.com/en/sdk/download/web/ |
| `web/vendor/live2dcubismcore.min.js`, `docs/live2d/vendor/live2dcubismcore.min.js` | Live2D Cubism Core | Governed by Live2D Cubism SDK terms. Keep Live2D notices and verify the current SDK agreement before redistribution. Source: https://www.live2d.com/en/sdk/about/ |

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

Preview source-test packages should include this notice file. Do not add new sample models, generated images, reference audio, screenshots, or demo videos to the package unless their source and redistribution boundary are recorded here.
