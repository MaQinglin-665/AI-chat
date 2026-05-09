# Third-Party Notices

This project is an early preview desktop AI pet experiment. The project source code is licensed under the repository `LICENSE` unless a file or asset says otherwise.

Some bundled runtime files, sample models, media, and generated/project assets keep their own terms. Do not assume the project MIT license gives permission to reuse every asset outside this repository.

This document is a practical release checklist, not legal advice. Before publishing a new preview package, verify any newly added asset has a clear source and redistribution boundary.

## Vendored Browser Runtime

| Paths | Component | Notice |
| --- | --- | --- |
| `web/vendor/pixi.min.js`, `docs/live2d/vendor/pixi.min.js` | PixiJS | PixiJS is distributed under the MIT license. Keep upstream license notices when redistributing. Source: https://github.com/pixijs/pixijs |
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

Useful references:

- Node package metadata: `package-lock.json`
- Python dependency list: `requirements.txt`, `requirements-dev.txt`
- Docs tooling metadata: `docs/package.json`, `docs/package-lock.json`

## Release Packaging Rule

Preview source-test packages should include this notice file. Do not add new sample models, generated images, reference audio, screenshots, or demo videos to the package unless their source and redistribution boundary are recorded here.
