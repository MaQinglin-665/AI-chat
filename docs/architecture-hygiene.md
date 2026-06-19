# Architecture Hygiene Notes

## Current Composition

- `app.py`: HTTP server entrypoint, security checks, health, runtime restart, character runtime preview, and delegation to route modules.
- `app_config_route.py`: config, first-run, config switch, probe, and TTS test routes.
- `app_memory_route.py`: persona card, learning review, core memory, short memory, and memory debug routes.
- `app_chat_route.py`: chat and streaming chat request handling.
- `app_tts_route.py`: TTS HTTP request extraction, response writing, and response perf logging.
- `tts.py`: TTS provider selection, provider-specific request construction, GPT-SoVITS request/retry/chunking strategy, and text normalization.
- `tts_audio.py`: WAV duration, trimming, concatenation, loudness normalization, amplitude/activity stats, and audio degradation heuristics.
- `memory.py`: memory orchestration, Mem0 integration, short-term memory mutation, learning review mutations, and prompt assembly.
- `memory_text.py`: memory text normalization, garbled/stagey/sensitive content checks, memory-query intent detection, and tokenization.
- `memory_core.py`: core long-term memory classification, normalization, persistence, backup writing, and similarity scoring.
- `memory_persona.py`: manual persona card normalization, legacy persona-field migration, persona/relationship summary persistence, and dialogue excerpt shaping.
- `memory_snapshot.py`: memory debug snapshot shaping, learning review status summaries, learning diagnostics, and compact memory/review payload items.
- `character_brain.py`: character decision making, intent continuity, prompt block construction, and reply constraint enforcement.
- `character_brain_snapshot.py`: public character-brain snapshot shaping and runtime metadata merge rules.
- `web/chat.js`: frontend orchestration surface for chat, voice, Live2D, settings, and runtime UI wiring.
- `web/chatApi.js`: chat request transport, streaming response parsing, and direct-chat fallback behavior.
- `web/chatPayloadBuilder.js`: chat request payload shaping, conversation interruption context, ASR confirmation context, and input modality normalization.
- `web/chatReplyController.js`: assistant turn lifecycle, UI row updates, TTS handoff, performance timeline handoff, and controller-level side effects.
- `web/followupReadinessPanelModel.js`: follow-up readiness panel data shaping for backend entry summaries, preview cards, manual confirmation state, and debug payloads.
- `web/followupReadinessPanelController.js`: follow-up readiness panel DOM/event orchestration, report assembly, manual confirmation actions, and gray-trial control wiring.

## Completed Route

1. Created an isolated feature worktree from `main` so existing dirty local work remains untouched.
2. Added a written implementation plan under `docs/superpowers/plans/`.
3. Moved memory/persona/learning review HTTP logic out of `app.py` into `app_memory_route.py`.
4. Moved WAV audio helpers out of `tts.py` into `tts_audio.py` while preserving imported private names for existing tests and debug usage.
5. Added direct unit coverage for the new memory route and audio modules.
6. Added `scripts/audit_architecture_hygiene.py` for repeatable read-only architecture and local hygiene reporting.
7. Moved memory debug snapshot shaping into `memory_snapshot.py` so debug/dashboard payloads are independently testable.
8. Moved character-brain public snapshot and runtime metadata merge shaping into `character_brain_snapshot.py`.
9. Moved frontend chat payload construction into `web/chatPayloadBuilder.js`, keeping `web/chatReplyController.js` focused on turn lifecycle and side effects.
10. Moved follow-up readiness panel data shaping into `web/followupReadinessPanelModel.js`, keeping the panel controller closer to DOM, async refresh, and explicit action handling.
11. Moved persona card and persona/relationship summary helpers into `memory_persona.py`, preserving old `memory.py` entrypoints for app compatibility.
12. Moved core long-term memory classification, normalization, read/write, backup, and similarity helpers into `memory_core.py`.
13. Moved memory text hygiene and tokenization helpers into `memory_text.py`, so memory storage, selection, and learning flows share the same pure text layer.

## Performance Impact

This pass improves maintainability and reduces hot-path coupling rather than claiming a measured runtime speedup. The practical performance benefit is that route dispatch and TTS audio processing now have narrower modules, which makes future targeted optimization safer:

- Memory/persona endpoints can be profiled without loading unrelated route code into the test surface.
- WAV trimming, joining, and loudness checks can be tuned independently from GPT-SoVITS request/retry code.
- Memory debug/reporting output can be changed and tested without running memory storage or learning mutation flows.
- Memory text filtering, core-memory scoring, and persona-card migration can be tested without touching live memory files.
- Character-brain runtime metadata can be tested without exercising the full decision and reply-repair pipeline.
- Chat request payload changes can now be tested with a small Node test instead of exercising the full assistant turn controller.
- Follow-up readiness panel state changes can now be tested without constructing DOM nodes or invoking panel button handlers.
- The architecture audit can keep large-file growth and local sensitive artifacts visible before releases.

Runtime claims such as startup time, first reply latency, first TTS audio time, and Live2D frame stability still require a live desktop/server benchmark.

## Remaining High-Risk Targets

- `web/chat.js` remains the largest active frontend orchestration file and should be split only with browser smoke coverage.
- `web/chatReplyController.js` is smaller after the payload split, but still combines assistant turn lifecycle, TTS handoff, performance timeline, and failure handling.
- `web/followupReadinessPanelController.js` is smaller after the model split, but still combines a large amount of DOM construction, gray-trial commands, and copy-button workflows.
- `memory.py` still combines Mem0 integration, short-term memory mutation, learning review mutation, prompt assembly, and background extraction scheduling.
- `character_brain.py` still combines intent scoring, prompt shaping, session state mutation, and character reply constraints.
- `web/base.css` remains a very large stylesheet; split only after visual regression checks are available.

## Reasonable Stop Line

The remaining large files are not all equal:

- `web/base.css` and `docs/css/style.css` are large stylesheets; splitting them without visual regression coverage risks layout drift more than it improves runtime behavior.
- `web/chat.js` is now mostly a global composition layer that wires extracted controllers and models. Further reduction should target a specific dependency cluster, not just line count.
- `web/followupReadinessPanelController.js` still has many gray-trial actions, but it already delegates substantial data shaping to model/view modules. The next worthwhile split needs browser-smoke coverage because it touches buttons, clipboard actions, and manual trial controls.
- `tests/test_character_runtime_frontend.js` is large test coverage, not production architecture. Splitting it is useful for maintainability but not part of runtime code cleanup.
- `memory.py` is still long, but the lowest-risk pure layers are now extracted. The remaining pieces have more side effects: Mem0 client lifecycle, learning review mutations, short-term memory consolidation, and background extraction.

## Verification

Run the normal gates plus the new architecture audit:

```powershell
python scripts/check_python_syntax.py
python scripts/check_js_syntax.py
node scripts/run_node_tests.js
python -m pytest -q
python scripts/audit_architecture_hygiene.py --include-siblings
python scripts/audit_architecture_hygiene.py --fail-on-sensitive
python -m json.tool config.example.json
python -m json.tool package.json
python -m py_compile app.py config.py tts.py memory.py tools.py llm_client.py asr.py emotion.py humanize.py utils.py
```
