# Architecture Hygiene And Performance Plan

## Goal

Reduce high-risk backend coupling, remove avoidable helper duplication from large modules, and add repeatable architecture hygiene checks without changing public API behavior or local user configuration formats.

## Scope

- Keep all existing routes and payload shapes compatible.
- Keep GPT-SoVITS, Edge TTS, LLM, memory, and persona configuration compatible.
- Avoid touching private runtime files, local API keys, voice samples, memory stores, or generated model assets.
- Work in an isolated feature worktree and leave existing dirty worktrees untouched.

## Tasks

1. Extract memory/persona/learning review HTTP routes from `app.py` into a dedicated route module.
2. Extract WAV duration, trimming, concatenation, loudness, and degradation heuristics from `tts.py` into a focused audio utility module.
3. Add tests for the new route module and TTS audio utility module so behavior is pinned outside the large files.
4. Add an architecture hygiene audit script that reports oversized source files, ignored runtime artifacts, sensitive tracked paths, and optional sibling worktree inventory.
5. Extract memory debug snapshot shaping into a pure module after the first route/audio split is green.
6. Extract character-brain public snapshot and runtime metadata shaping into a pure module after memory snapshot extraction is green.
7. Document the current architecture composition, ownership boundaries, verification path, and next remaining high-risk targets.
8. Run syntax, frontend, pytest, JSON, py_compile, and the new audit checks.
9. Continuation after backend extraction: extract the low-risk frontend chat payload builder from `web/chatReplyController.js` with a dedicated Node test and no Live2D/TTS behavior changes.
10. Continue with follow-up readiness panel data shaping: extract pure panel model helpers from `web/followupReadinessPanelController.js` with a dedicated Node test and no DOM/action behavior changes.
11. Continue memory cleanup by extracting persona card and persona/relationship summary helpers into `memory_persona.py`, preserving compatibility wrappers in `memory.py`.
12. Extract core long-term memory classification, normalization, persistence, and similarity helpers into `memory_core.py` with direct tests.
13. Extract memory text hygiene and tokenization helpers into `memory_text.py` with direct tests.
14. Stop broad splitting when remaining large files require visual/browser coverage or side-effect orchestration changes rather than pure helper extraction.

## Non-Goals

- No broad frontend rewrite in this pass; frontend work is limited to isolated, testable helper extraction.
- No deletion of historical sibling worktrees.
- No push, PR, or main-branch change unless requested separately.
- No runtime performance benchmark claims without a running desktop app measurement.
