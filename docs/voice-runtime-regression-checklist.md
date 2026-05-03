# Voice and Runtime Regression Checklist

> Purpose: keep the desktop pet voice loop stable while iterating on ASR, TTS, subtitles, Live2D motion, and Character Runtime.
>
> Use this checklist before merging changes that touch `web/chat.js`, `web/speechText.js`, TTS/ASR routes, `character_runtime.py`, prompt shaping, or local voice config.

## Scope

This checklist covers the current MVP voice path:

- microphone capture and local ASR
- user message -> LLM -> first visible reply
- streamed or final-only TTS
- subtitles and Chinese translation
- Live2D mouth/motion feedback
- Character Runtime metadata safety

It is not a full release checklist. For broader release validation, use `release-v1.2-checklist.md` and the Character Runtime validation docs.

## Before Testing

- Start from a clean branch or note any local-only config changes.
- Keep `config.local.json`, `config.json`, `.env`, logs, and generated audio out of commits.
- Confirm the app has restarted after frontend or backend changes.
- Confirm `/healthz` returns `200`.
- If using GPT-SoVITS, confirm the local service is listening on the configured port.
- Keep `tools.enabled=false` and `observe.attach_mode=manual` unless the test explicitly needs otherwise.

## Quick Commands

```powershell
python scripts/check_js_syntax.py
node scripts/run_node_tests.js
python -m pytest -q tests
python scripts/check_secrets.py
git diff --check
```

## Smoke Test Matrix

| Area | Test | Expected Result |
| --- | --- | --- |
| Startup | Launch with `start_electron.bat` | Model and chat windows open; backend health is OK. |
| Mic state | Click mic toggle | UI shows mic open; meter moves when speaking. |
| ASR | Say a short Chinese phrase | Text is transcribed once, not duplicated repeatedly. |
| Reply language | Send Chinese input while role is English-speaking | Main assistant reply stays English unless user asks for Chinese. |
| Translation | Enable translation | Chinese translation appears below English reply when available. |
| First voice | Send a normal short message | First audible response should start without an extra history-summary wait. |
| Long reply | Ask for a 2-3 sentence reply | TTS plays complete audio; no missing tail after first word. |
| Subtitle | Enable subtitles | Subtitle matches spoken user-facing text. |
| Runtime metadata | Trigger a reply that includes emotion/action intent | `emotion`, `action`, `voice_style`, JSON, or metadata suffixes are not shown or spoken. |
| Mouth motion | Watch during TTS | Mouth opens/closes with speech and returns idle after audio ends. |
| Voice stability | Test 2-3 replies in a row | Voice volume/timbre stays reasonably consistent. |
| Stop/restart | Restart runtime/app | New frontend/backend code is loaded; no stale script behavior remains. |

## Detailed Manual Cases

### 1. Microphone and ASR

1. Toggle mic on.
2. Say: `准备好了`.
3. Confirm:
   - mic meter moves;
   - ASR text appears;
   - one user message is sent;
   - app does not keep sending the same transcript.

If this fails, collect `/micdebug` output and check:

- selected input device
- `micOpen`
- `localRunning`
- `context=running`
- `lastFrameAgeMs`
- `peakRms`
- `threshold`

### 2. English Main Reply With Chinese Translation

1. Send: `什么意思`.
2. Confirm:
   - assistant main reply is English;
   - Chinese translation appears only as auxiliary text;
   - TTS speaks English, not the translation;
   - chat history stores the clean user-facing reply.

### 3. Runtime Metadata Leak Guard

Use a prompt likely to produce emotion/action intent, for example:

```text
我还没有午休呢
```

Confirm the following are not visible or spoken:

- `emotion: ...`
- `action: ...`
- `voice_style: ...`
- raw JSON such as `{"text": ...}`
- partial suffixes such as `emotion: thinking action:`

Check all three surfaces:

- assistant bubble
- desktop subtitle
- TTS audio

### 4. Long Sentence Speech Loop

Send a prompt that encourages a longer English reply:

```text
Tell me something encouraging in two or three sentences.
```

Confirm:

- there is no very long silent gap between sentence chunks;
- voice does not suddenly become very small or distant;
- final sentence is spoken;
- mouth returns idle after TTS ends.

### 5. Final-Only vs Realtime TTS

If changing `tts.stream_mode`, test both modes when practical:

- `final_only`: should wait for the final reply, then speak once.
- `realtime`: should start earlier, but must not speak runtime metadata or half-formed suffixes.

GPT-SoVITS realtime should avoid tiny standalone chunks that change voice quality.

## Debug Reports to Capture

When reporting a voice regression, include only non-secret debug text:

- `/micdebug`
- `/ttsdebug`
- `/translatedebug`
- relevant backend perf lines from `server_err.log`
- whether TTS provider is `browser` or `gpt_sovits`
- whether `stream_mode` is `final_only` or `realtime`

Do not include API keys, local tokens, full `.env`, or private desktop screenshots unless explicitly needed and reviewed.

## Pass Criteria

Before merging a voice/runtime change:

- automated checks pass;
- at least the smoke test matrix passes;
- no runtime metadata is visible or spoken;
- text chat still works if TTS/ASR fails;
- security defaults remain conservative;
- unrelated files are not modified.

## Known Risk Areas

- Streaming text can reach TTS before the final cleaned reply arrives.
- Frontend windows can keep stale JS until Electron is fully restarted.
- Local GPT-SoVITS settings strongly affect perceived voice quality.
- History and memory context can slow first token if too much is injected.
- Translation can be slower than reply/TTS; it should not block first voice.
