# Release Demo Capture Plan

## Scope
Use this capture plan for:
- README GIF/short video material
- GitHub Release page material
- social media / short-form clips
- developer-facing demo clips
- internal retrospective material

## Prerequisites
Before recording, review:
- [Release Demo Recording Checklist](./release-demo-recording-checklist.md)
- [Character Runtime Demo Prompt Examples](./character-runtime-demo-prompts.md)
- [Character Runtime Safe Local Demo Config Guide](./character-runtime-safe-local-config.md)
- [Character Runtime Demo Smoke Test Checklist](./character-runtime-smoke-test.md)

Notes:
- this plan does not replace smoke test
- finish safe local config setup and smoke verification before capture
- prompts are suggestions; they do not guarantee strong visual feedback in every run
- `voice_style` currently does not change TTS behavior

## Local Directory and Naming Convention
Suggested local paths (do not commit raw captures by default):
- `captures/release-demo/YYYY-MM-DD/`
- `local-captures/release-demo/YYYY-MM-DD/`

Rules:
- do not commit raw recording material unless explicitly decided later
- do not include token/API key/private endpoint in any frame
- use file names with sequence + scene + usage tag, for example:
  - `01-startup-live2d-readme.mp4`
  - `02-baseline-chat-readme.mp4`
  - `03-runtime-happy-wave-social.mp4`

## Capture Plan Table
| ID | File name | Priority | Audience/use | Config state | Suggested prompt/input | What to capture | Pass criteria | Public-safe | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 01 | `01-startup-live2d-readme.mp4` | High | README / Release | baseline (runtime disabled) | app launch only | App startup and Live2D appears normally | No white-screen, no visible error, no sensitive info | Yes | Keep this clip short and stable |
| 02 | `02-baseline-chat-readme.mp4` | High | README / Release | runtime disabled | normal user Q&A | One baseline chat turn with readable reply | Reply normal, optional TTS normal, no raw JSON in chat UI | Yes | Keep subtitles/text readable |
| 03 | `03-runtime-happy-wave-social.mp4` | High | Social / Release | runtime enabled + metadata enabled | happy/wave prompt from prompt examples | Runtime chat with positive emotion + greeting action tendency | Reply text normal, emotion/action attempt visible, TTS stable | Yes | Prefer natural language tone |
| 04 | `04-runtime-surprised-think-devdemo.mp4` | Medium | Social / Developer demo | runtime enabled + metadata enabled | surprised/think prompt from prompt examples | Runtime response showing surprise or thinking tendency | Visible feedback or safe degradation, no crash | Yes | Subtle feedback is acceptable |
| 05 | `05-runtime-annoyed-shakehead-devdemo.mp4` | Medium | Developer demo / Optional social | runtime enabled + metadata enabled | annoyed-safe/shake_head prompt from prompt examples | Mild teasing rejection without aggression | No abusive content, no over-claim messaging | Conditional | Use only if tone remains safe |
| 06 | `06-tts-playback-release.mp4` | High | Release / README optional | baseline or runtime enabled | simple reply request | Reply followed by normal TTS playback | Audio plays normally, no claim that `voice_style` drives TTS | Yes | Keep ambient noise low |
| 07 | `07-debug-bridge-developer-only.mp4` | Medium | Developer-only | runtime enabled + metadata enabled | DevTools debug bridge commands | `testEmotion`/`testAction`/`emit` validation in DevTools | No red console errors, no crash | No | Do not use in primary promo assets |
| 08 | `08-restore-baseline-after-demo.mp4` | High | Internal / Developer | runtime disabled after demo | normal user Q&A after restart | Demo off -> restart -> baseline chat recovery | Metadata no longer affects default path | No | Keep as verification evidence |
| 09 | `09-failure-exclusion-checklist.mp4` | Medium | Internal checklist | any | review-only checklist | Internal exclusion review (not public clip) | Public package excludes `/api/chat` 500, red errors, white-screen, token leak, JSON pollution | No | Keep this clip private |

## Recommended Public Material Priorities
- README first-view: startup + Live2D + baseline chat
- Release page: baseline chat + runtime happy/wave + TTS playback
- social clips: short, natural, emotion/action visible, no DevTools
- developer demos: can include debug bridge, metadata checks, smoke process

## Post-Capture Acceptance Checks
- no sensitive information visible
- no failure-state footage included
- no over-claim wording in subtitles/voice/text
- audio playback quality is acceptable
- subtitles/chat text are clear
- baseline clip is included
- non-public material is isolated or removed from public package
