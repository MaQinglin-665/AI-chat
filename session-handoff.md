# Brain gesture vocabulary — 2026-10-27

Worktree D:/AI/ai_desktop_pet_vocab, branch codex/brain-gesture-vocab-v1, baseline origin/main 5669e8a. User asks draft PR only, no merge. No private config read/write, original ai_desktop_pet prohibited. No changes to VRM/Live2D renderers or mappings.

Protocol/controller/executor integration and tests implemented. Unified playGesture Promise + AbortSignal, capability-based gestures, directional Live2D lookAt, VRM legacy fallback. Backend preserves closed renderer reason codes. Report docs/avatar-brain-gesture-vocab.md.

First complete local gate passed 968 Python/3skip; then added reason preservation regression (4 targeted tests pass after correcting the test's internal storage key). Final full rerun crashed in existing Torch/transformers native model loading in test_obsidian_knowledge.py while recording. No knowledge product/test changes. Isolated rerun revealed C-temp disk exhaustion; using dedicated D TEMP/TMP yielded final full969 Python/3skip,82 Node,syntax/secrets pass. No unrelated test/product modifications.

Hiyori real daily five-minute recording completed (4 DeepSeek requests, five gesture ACKs completed, no real gaze actions); screenshot-at-end timeout, but entire331.52s WebM decodes. See report for usage/evidence limitations. Mao manifest not found outside prohibited original repo; asked user for accessible path; still pending. Do not silently skip this acceptance or claim complete. Raw/media evidence stays ignored.

Next: await Mao path for five-minute run and real gaze coverage; implementation published as draft only after push gates. If publishing before missing model is supplied, explicitly mark acceptance incomplete. Preserve main and all model/private files.
