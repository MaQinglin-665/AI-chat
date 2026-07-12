# Session Handoff

Last Updated: 2026-07-11

## Current Objective

No coding feature is currently active. The last two frontend speech-stability slices are complete; the recommended next step is a real Electron manual UX pass focused on Browser TTS/server fallback speech motion and no-barge-in interruption timing, then choose the next concrete audit slice from observed behavior.

## Latest Completed Feature: Cancelled Playback Promise Settlement v1

- Browser TTS, HTML audio, and AudioContext playback now register local cancellation waiters. `stopCurrentMediaInPlace()` resolves those waiters before cancelling/pausing/stopping native media, so interrupted or superseded playback promises do not wait for missing native callbacks or long fallback timers.
- Waiters unregister on normal success, failure, stale resolution, and cancellation. Cancelled Browser speech uses the same cleanup-aware settle path; cancelled HTML audio revokes its object URL; cancelled AudioContext playback is treated as cancelled/stale rather than successful audio.
- Full verification passed on 2026-07-11: `scripts\test-local.ps1` (`519` Python tests, full Node suite, Python syntax `117`, JavaScript syntax `147`, secret scan `566`).
- Manual check: with no-barge-in enabled, interrupt a real speaking reply and confirm the microphone resumes promptly without waiting for old playback timeouts.

## Latest Completed Feature: Per-Turn Browser Playback Generation Continuity v1

- Browser TTS now separates the global turn playback generation from a per-utterance Browser token. Chat-owned direct speech, segmented voice timelines, latency hints, prewarm tails, and final stream fallback/recovery preserve the current assistant turn generation while still rejecting interrupted or superseded callbacks.
- Stale Browser `onstart`, `onend`, `onerror`, and silent-start watchdog callbacks settle as obsolete and cannot cancel newer speech. Default non-turn Browser calls still advance the global generation. Server TTS invalidates Browser tokens before cancelling speech synthesis.
- Full verification passed on 2026-07-11: `scripts\test-local.ps1` (`519` Python tests, full Node suite, Python syntax `117`, JavaScript syntax `147`, secret scan `566`).
- Next boundary: stopped/cancelled playback promises can still depend on callbacks or timeouts that may not fire promptly, so cancellation settlement is the active follow-up.

## Latest Completed Feature: Split-Window Speech Style Bridge v1

- The compact revisioned `taffy-speech` bridge now carries only an allowlisted speech-style enum (`neutral`, `playful`, `comfort`, `steady`, or `clear`). The detached model maps a valid accepted value to both mouth cadence and expression/body style.
- Missing/invalid, stale, expired, and out-of-order packets cannot overwrite a newer style. A non-speaking packet may refresh style but cannot start mouth or speech motion; no transcript, audio, prompt, provider, private configuration, or model asset crosses the bridge.
- Full verification passed on 2026-07-11: `scripts\test-local.ps1` (`519` Python tests, full Node suite, Python syntax `117`, JavaScript syntax `147`, secret scan `566`).
- Manual check: test one clearly playful and one clearly comforting real split-window reply to ensure the detached model's cadence/expression differs without an end-of-speech neutral flash.

## Latest Completed Feature: Delivered-Turn Persistence v1

- Receipt-aware desktop requests now stage assistant memory, relationship, and character-session work until the current assistant row is visibly finalized. Legacy API clients retain immediate persistence unless they explicitly declare `delivered_turn_receipt_v1`.
- ACK commits are serialized and retain a short bounded completed outcome: only `committed` and `already_committed` are confirmed. Unknown, expired, evicted, invalid, and failed receipts are not silently reported as successful. Runtime reset waits for an in-flight receipt callback before clearing session state.
- The desktop client uses a session-scoped FIFO retry queue containing only opaque receipt IDs and timing metadata. It retries transient failures, restores after renderer reload, attempts a small keepalive ACK on page close, and includes bounded pending receipts in a later receipt-aware chat request as a continuity barrier.
- Full verification passed on 2026-07-11: `scripts\test-local.ps1` (`519` Python tests, full Node suite, Python syntax `117`, JavaScript syntax `147`, secret scan `566`).
- Remaining boundary: a rare exception within the pre-existing multi-file memory pipeline is reported as `commit_failed` and is not automatically replayed, because replay could duplicate a partial legacy side effect. A durable cross-store journal is a separate future persistence slice.

## Latest Completed Feature: No-Barge-In Audio Lease Completeness v1

- Realtime stream TTS now retains its chat-owned microphone pause lease until the session/generation's audible queued tail ends, recovery speech returns, or the turn is cancelled. A playback-start event is explicitly insufficient to release the microphone.
- Settlement is local, session/generation-bound, and one-shot. An interrupted stream releases only its own lease; a replacement turn remains paused under its own lease. No-barge ASR also holds queued transcripts behind active assistant audio/queue work even after `chatBusy` clears.
- Full verification passed on 2026-07-11: `scripts\test-local.ps1` (`505` Python tests, full Node suite, Python syntax `115`, JavaScript syntax `147`, secret scan `563`).
- Manual check: play a multi-sentence realtime reply through speakers with no-barge-in enabled, speak just before the final segment, and confirm no assistant audio becomes a user turn.

## Latest Completed Feature: Split-Window Performance Phase Bridge v1

- The chat renderer now sends a compact, revisioned, expiring `pre_reaction` or `thinking_wait` phase to the detached model renderer. It carries only allowlisted action/pulse metadata plus numeric turn/revision/expiry data—never transcript text, reply text, prompts, or audio.
- The model renderer applies the existing pulse/action-plan path once and never changes mouth, speech-animation, or audio state. Heartbeats do not replay the phase; stale/reordered/expired/cleared packets cannot revive it. Full view keeps its existing local-only reaction.
- The phase clears on first reply text, latency hint, actual speech, interruption, completion, sender shutdown, expiry, or a newer turn. Full verification passed on 2026-07-11: `scripts\test-local.ps1` (`505` Python tests, full Node suite, Python syntax `115`, JavaScript syntax `147`, secret scan `563`).
- Manual check: run a deliberately slow real Electron split-window reply and confirm a single early reaction/brief thinking beat before audio without late or duplicate motion.

## Latest Completed Feature: No-Barge-In Voice Turn Queue v1

- A transcript finalized during an active no-barge-in assistant turn now stays queued and retries in FIFO order once the chat turn is idle; it is no longer silently lost by an immediate `chatBusy` rejection.
- Pending work is session-bound and time-bounded. Manual mic close/new session cancels the timer and clears queued work; stale session and 30-second wait expiry discard only the affected queued transcript. Barge-in behavior is unchanged.
- Full verification passed on 2026-07-11: `scripts\test-local.ps1` (`505` Python tests, full Node suite, Python syntax `115`, JavaScript syntax `146`, secret scan `562`).
- Manual check: with no-barge-in active, speak at the start of a prior assistant reply and verify the transcript is sent once after it settles; close the mic once during the wait to verify it does not send later.

## Latest Completed Feature: Local Speech Timebase Consistency v1

- Chat interruption, important-speech arbitration, auto-chat, and turn-interjection checks now use the same renderer `performance.now()` clock as the local speech animation. The existing audio signals and 80 ms visual-release grace remain unchanged.
- Protected-speech elapsed time now uses explicit clock ownership rather than inferring clock type from a timestamp magnitude, avoiding a long-renderer-uptime edge case.
- Full verification passed on 2026-07-11: `scripts\test-local.ps1` (`505` Python tests, full Node suite, Python syntax `115`, JavaScript syntax `145`, secret scan `561`).
- Next manual check: start speaking during one real reply's visible release tail and confirm the current interruption preference feels natural.

## Latest Completed Feature: Split-Window Speech Timebase and Stale-State Cleanup v1

- The chat-to-model speech bridge now sends wall-clock expiries, sender identity, revisions, heartbeat, and session/generation context. The model renderer translates expiry into its own local performance clock instead of comparing incompatible renderer-local timestamps.
- Delayed, expired, and out-of-order speech packets cannot revive a previous turn. Dead sender state clears only remote mirrored mouth/audio/cue state and then releases idle motion; local full-window audio remains untouched.
- Full verification passed on 2026-07-11: `scripts\test-local.ps1` (`505` Python tests, full Node suite, Python syntax `115`, JavaScript syntax `144`, secret scan `560`).
- Manual follow-up: test one real split-window utterance and close the chat renderer during the release tail; the only adjustable runtime boundary is the existing 900 ms remote-audio freshness guard.

## Latest Completed Feature: Generation- and Session-Bound Server TTS Cancellation v1

- Active server-TTS requests are now tied to playback generation/session scopes and are aborted on interruption or a newer generation. Direct, segmented, companion-prewarm, realtime queue, retry, eager-prefetch discard, recovery, and latency-hint paths receive the signal.
- Cancellation is quiet: it cannot count as provider failure, trigger browser fallback, retry without prosody, or create a stream delivery failure/recovery. Retry backoff and late audio-body reads abort promptly.
- Full verification passed on 2026-07-11: `scripts\test-local.ps1` (`505` Python tests, full Node suite, Python syntax `115`, JavaScript syntax `143`, secret scan `559`).
- Residual boundary: this cancels client-side fetch/retry/playback promptly. The current backend/provider call can still finish a synthesis already executing upstream; do not claim provider-side job cancellation without a separately scoped backend protocol.

## Latest Completed Feature: Bilingual Text Composition and Intentional Send v1

- The chat input now ignores Enter while an IME composition is active, including Chromium's legacy `keyCode=229` composition signal. Confirming a Pinyin/CJK candidate can no longer clear or send a partial message.
- A normal non-repeating Enter still sends once and prevents the native default; held Enter cannot duplicate a turn. Click-to-send remains unchanged.
- Full verification passed on 2026-07-11: `scripts\test-local.ps1` (`505` Python tests, full Node suite, Python syntax `115`, JavaScript syntax `142`, secret scan `558`).

## Latest Completed Feature: Stream TTS Delivery Completeness v1

- Streamed speech now uses a session/generation-bound segment ledger rather than the old one-bit "some audio played" signal. It records actual starts separately from completed and failed items.
- If a later segment fails before it starts or remains stalled, the final watchdog recovers only the known unheard suffix. It never replays a segment that began playback, including a segment that later fails partway through.
- A pre-start failure stops later queue playback to preserve order. The idempotent recovery fence blocks prefetched, in-flight, and late queue callbacks from overlapping the suffix fallback.
- Session and playback-generation checks reject recovery after interruption, cancellation, or a newer turn.
- Full verification passed on 2026-07-11: `scripts\test-local.ps1` (`505` Python tests, full Node suite, Python syntax `115`, JavaScript syntax `141`, secret scan `557`).

## Latest Completed Feature: Voice Listening Presence v1

- The Live2D companion now enters a quiet `armed` presence when the microphone opens, a clearer `hearing` pose on local/browser speech detection, and a short `release` before returning to `armed`. Close, pause, mute/disconnect, cancellation, stale session, and stale detached bridge states clear safely.
- Listening uses a direct eye/brow/gaze/head/body/shoulder parameter layer, forces the mouth closed, and does not dispatch arm or hand motion. Actual assistant audio takes priority; after it stops, a pending listening pose can resume.
- Automatic idle/action-plan/direct/fallback motions are suppressed while listening is active, so existing bundled motions cannot override the calm listening silhouette. Explicit user taps remain available.
- Local ASR now serializes overlapping utterances so a second spoken phrase cannot leave VAD capture attached to the request already being transcribed.
- The detached-window bridge remains compact and transcript-free. Receiver-side audio priority expires after a short freshness window if the chat window disappears.
- Full verification passed on 2026-07-11: `scripts\test-local.ps1` (`505` Python tests, full Node suite, Python syntax `115`, JavaScript syntax `140`, secret scan `556`).

## Latest Completed Feature: Realtime TTS Performance Sync v1

- Queued/realtime text and ready blobs remain visually silent; speech gestures and semantic timelines start only after an actual playback callback.
- Direct, companion-turn, browser fallback, HTML audio, and AudioContext playback now share actual-start timing. A failed AudioContext `source.start()` cannot falsely mark a session as played.
- If first streamed audio begins before the final semantic plan exists, the plan waits for the next actual segment rather than visibly replaying a late speech-start pose. Session/generation checks still reject stale or superseded playback.
- Full verification passed on 2026-07-11: `scripts\test-local.ps1` (`505` Python tests, full Node suite, Python syntax `115`, JavaScript syntax `140`, secret scan `556`).
- Known follow-up is tracked as pending `stream-tts-delivery-completeness-v1`: recover a failed later stream tail without duplicating speech that already played.

## Current State

- No active feature is open after the latest speech-stability pass. Browser generation continuity and cancelled playback settlement are complete and fully verified.
- Next recommended work: run a real Electron split/full-window experience pass for Browser TTS, server-to-Browser fallback, no-barge-in interruption, and Live2D speech motion timing. Use the result to open the next small feature in `feature_list.json` before coding.

- Audit on 2026-07-11 found the most concrete daily-use gap is voice-start latency: GPT-SoVITS has measured short-reply synthesis at about 11–24 seconds, and the frontend waits for a complete response blob before it can play. The local strict demo check also reports GPT-SoVITS unreachable in the current environment; browser fallback and text chat must remain intact.
- Active feature guardrails: prewarm only for the existing opt-in companion-turn + server-TTS path; do not speak draft text; preserve subtitle, Live2D cue, and motion start at actual audio playback; discard prewarm audio on mismatch, cancellation, interruption, or failure. Do not modify memory, permissions, desktop observation, tools, or model assets.
- The user chose a full alignment harness: update `AGENTS.md` and add state, verification, and handoff files.
- `memory-continuity-v1`, `conversation-flow-v1`, and `character-performance-cue-v1` are complete.
- Conversation Flow v1 is complete: no-barge-in voice turns hold and release independent ASR pause leases; automatic companion speech uses one shared four-minute opt-in gate; browser TTS and text-only delivery now both establish the silence-follow-up timestamp.
- Memory Continuity v1 is complete: short follow-ups refresh an actionable anchor without writing generic tasks; the backend removes only a duplicate trailing current-user history item; correction/forget uses exact source-turn hashes rather than word overlap; reviewed learning samples are filtered only when all known source turns are suppressed; and stale summaries are invalidated without being deleted.
- Relationship continuity also has a bounded hash-only request-id dedupe cache, and address parsing now accepts only clear declarative naming preferences.
- The completed performance slice now uses one shared cue-to-motion resolver in both full and split-window views. Explicit actions (especially `think`) select the dedicated Hiyori motion before fallbacks; action dispatch waits for browser `onstart`, server `onplay`, or AudioContext `source.start` rather than metadata arrival. Text-only replies retain one local cue-driven expression/motion response.
- `relationship-growth-v1` is complete: `relationship_state.json` is local, versioned, backup-aware, transcript-free, and inspectable/editable/resettable in the existing Persona Card. It tracks only familiarity plus address, reply length, advice style, and teasing boundary; auto-chat does not modify it.
- `natural-character-dialogue-v1` is complete: model-direct prompt policy is bilingual-input/English-output and candid about AI identity; random density, inner-state, and hidden-thought pressure are disabled for model-direct dialogue.
- `companion-turn-contract-v1` is complete: direct model text is no longer rewritten by finalizer/demo/runtime/brain route stages; optional `turn` metadata now coordinates final TTS and Live2D without streaming stale text.
- `character-performance-cue-v1` has a stable technical cue layer and is now resumed for perceptual tuning after the turn contract and relationship state work.
- Product direction: a personal bilingual-input/English-output desktop companion with natural free-form dialogue, explicit AI identity, long-term relationship adaptation, and visibly expressive Live2D. This feature only establishes the reply/performance foundation; it does not add proactive behavior, desktop observation, tools, or new model assets.
- The next slice is performance-only: audit the cue-to-motion path and bundled Hiyori resources before making focused visible-motion adjustments. Keep text ownership, permission defaults, and the existing model asset boundary intact.
- The implementation plan for exaggerated but recoverable speaking performance is saved at `docs/superpowers/plans/2026-06-03-character-performance-cue-v1.md`.
- Runtime implementation is complete for the frontend cue layer and desktop chat-to-model cue broadcast.
- The first screenshot-reviewed visible-accent pass was still too subtle. Current fix now maps high-energy performance cues onto the bundled model's readable built-in motion groups.
- Multi-emotion smoke found that non-happy emotions are mixed: `playful` is strong, `sad/thinking/anxious` are moderately readable, `surprised` is modest, and `angry` remains weak on the bundled model.
- Online search did not find ready-made `hiyori_pro_t11` exp3 files, so the current slice adds handwritten local exp3 resources and wires `performanceCue` into `model.expression(...)`.
- The user then selected A-strength arm/hand linkage for `angry` and `thinking`. The latest slice strengthens both exp3 resources and runtime speech accents, and routes high-`angry` built-in motion through `Tap@Body` before `FlickDown`.
- The user later clarified that tutorial research should be used to adjust the local model, not handed back as reading material. The resulting local fix follows the Live2D expression/motion separation: `thinking` is no longer borrowed from the `surprised` runtime expression path.
- Automated frontend checks pass.
- Electron/CDP smoke passed and confirmed the model page now loads an expression manager with 8 Hiyori expressions; latest thinking-symbol screenshots show a clear `?` overlay plus independent `thinking` mood state.
- Latest upper-bound pass adds a dedicated Hiyori `Thinking` motion group and a high-`thinking` runtime B-arm pose. The current screenshot shows both hands lifted with the `?` bubble; runtime state confirmed `PartArmA: 0.02`, `PartArmB: 0.881`, `ParamArmLB: 7.495`, and `ParamHandLB: -7.582`.
- The user then chose B for further enhancement: a Neuro-sama-like sudden reaction. The latest slice makes `Thinking` snap within the first 0.35 seconds, adds runtime `thinkingReactionMode: "snap_jitter"`, and changes the `?` bubble to a short pop+jitter animation.
- Latest asset probe confirms Hiyori in this repo is runtime-only: no `.cmo3` source file was found. Hiyori can still be tuned through `motion3.json`, `exp3.json`, part opacity, and controller parameters, but true mesh/deformer edits require source assets or a model replacement.
- Local `haru_greeter_t03` is runtime-compatible and was smoke-tested without changing defaults. Official `Mao` has stronger expression/motion metadata but currently fails in the bundled `cubism4.min.js` runtime, so model replacement now depends on style choice plus runtime/license compatibility.
- Latest all-emotion strong-expression follow-up is complete for the runtime/resource path. It strengthens high `happy`, `playful`, `surprised`, `sad`, `anxious`, and neutral/idle while preserving high `thinking` and the smoothed high `angry` path.
- Latest visual evidence is saved at `%USERPROFILE%\AppData\Local\Temp\ai_desktop_pet_smoke\hiyori-all-emotions-v1\all-emotions-contact-sheet.png` and the zoomed sheet `%USERPROFILE%\AppData\Local\Temp\ai_desktop_pet_smoke\hiyori-all-emotions-v1\all-emotions-contact-sheet-zoom.png`.

## Files

- `AGENTS.md`: project instructions, startup workflow, scope, verification, done criteria, end-of-session routine.
- `feature_list.json`: active/backlog feature state and done criteria.
- `progress.md`: restartable progress and verification evidence.
- `session-handoff.md`: current handoff.
- `init.sh`: harness verification entrypoint.
- `docs/superpowers/plans/2026-06-03-character-performance-cue-v1.md`: implementation plan for the active feature.
- `docs/superpowers/plans/2026-06-04-live2d-asset-upper-bound-and-candidate-sourcing.md`: Hiyori source boundary, Haru probe, and online candidate sourcing plan/results.
- `web/performanceCueController.js`: pure performance cue builder.
- `companion_performance_director.py`: conservative post-reply, model-direct delivery planner; returns only fixed allowlisted performance fields for clear visible wording.
- `web/ttsPlaybackController.js`: now begins cue expression/motion at actual browser/server/AudioContext playback start, not at server-audio metadata.
- `web/appStartupController.js` and `web/chat.js`: reuse one cue-to-motion resolver across split-window and full-view Live2D paths.
- `tests/test_companion_performance_director.py`: regression coverage for direct-plan precedence, clear cues, and false-positive avoidance.
- `tests/test_performance_cue_frontend.js`: cue and source-wiring checks.
- `scripts/run_node_tests.js`: includes the new cue test.
- `web/index.html`: loads `performanceCueController.js` before performance timeline code.
- `web/live2dExpressionController.js`: stores and applies speech/body/expression cue tuning.
- `web/desktop.css`: styles the `thinking` cue bubble overlay.
- `web/models/hiyori_pro_t11/hiyori_pro_t11.model3.json`: registers local Hiyori exp3 expressions.
- `web/models/hiyori_pro_t11/expressions/*.exp3.json`: handwritten expression assets for the existing Hiyori model.
- `web/models/hiyori_pro_t11/motion/hiyori_thinking_01.motion3.json`: dedicated one-shot thinking motion resource.
- `web/models/hiyori_pro_t11/motion/hiyori_thinking_01.motion3.json`: now starts with an early snap/rebound before the thinking hold.
- `web/ttsPlaybackController.js`: carries cue through browser and server TTS playback.
- `web/appStartupController.js`: carries speech performance cue through the desktop `taffy-speech` broadcast and dispatches readable built-in motion groups for high-energy cues.
- `web/chat.js`: injects cue builder and Live2D cue applier into chat reply and startup deps.
- `web/chatReplyController.js`: builds one cue per assistant reply and passes it into timelines/TTS.
- `companion_turn_contract.py`: opt-in public turn schema with canonical reply/spoken text and a safe optional performance projection.
- `app_chat_route.py`: attaches `turn` to compatible chat responses and preserves direct-mode streamed text exactly.
- `memory.py`: source-hash correction/forget suppression, non-destructive derived-summary invalidation, short-follow-up continuity, and relationship interaction-id forwarding.
- `web/chatApi.js`: validates optional final turn envelopes and prevents duplicate legacy runtime dispatch.
- `web/chatReplyController.js`: delays real-time stream TTS when the local companion-turn contract is enabled, then starts TTS and Live2D from one final cue.
- `relationship_state.py`: bounded, recoverable local relationship-state schema, conservative preference parser, hash-only retry dedupe, API payloads, and prompt snapshot.
- `web/relationshipStateController.js`: Persona Card relationship controls with safe text rendering, save/reload/pause/reset behavior.
- `tests/test_relationship_state.py` and `tests/test_relationship_state_frontend.js`: persistence, prompt-boundary, API, and UI regressions.
- `tests/test_memory_selection.py` and `tests/test_app_chat_route.py`: source-hash memory safety, follow-up continuity, duplicate-history, and interaction-id forwarding regressions.
- `tests/test_companion_turn_contract.py` and `tests/test_companion_turn_contract_frontend.js`: direct/stream contract regressions.
- `tests/test_character_runtime_frontend.js`: updated backend-runtime-metadata source contract for the cue layer.
- `web/hiyoriEmotionOverlayController.js`: includes Hiyori semantic overlay defaults for thinking, angry, and surprised.
- `web/assets/live2d-overlays/hiyori/manifest.json`: local Hiyori overlay manifest, now including `surprised`.
- `web/assets/live2d-overlays/hiyori/surprised-spark.png`: lightweight surprised spark overlay, no external limbs.
- `docs/superpowers/specs/2026-06-04-hiyori-all-emotion-strong-expression-design.md`: approved all-emotion strengthening spec.
- `docs/superpowers/plans/2026-06-04-hiyori-all-emotion-strong-expression.md`: executed all-emotion strengthening plan.

## Blockers

- The three local derived summary files (`memory_summary.json`, `memory_profile.json`, and `memory_relationship.json`) remain intentionally blank after the earlier test-isolation incident. Raw interaction memory, core/short-term memory, and structured relationship state were not modified. Do not rebuild summaries without explicit user authorization because doing so sends local interaction history to the configured LLM provider.
- Human feel review may still be needed before judging the motion intensity as final, but the previous "screenshot almost static" issue is addressed in the real chat-to-model path.
- The bundled `hiyori_pro_t11` model now has local handwritten expression files, but they remain parameter-only overlays on the existing `.moc3`.
- `angry` should still not be marked visually complete without human review; the latest exp3/runtime/built-in-motion path makes it more controllable and body-forward, but the screenshot remains weaker than `happy/playful`.
- `thinking` now has semantic readability through a `?` overlay, independent mood blend, dedicated `Thinking` motion group, and runtime B-arm pose; the bundled model still cannot create a true hand-to-chin pose without source-model deformation or a stronger asset.
- `thinking` now has semantic readability plus a sudden reaction timing layer; still screenshots may understate the snap because the effect is temporal.
- Hiyori source-model editing is blocked unless a `.cmo3` source model is obtained.
- Haru is only a local candidate, not adopted as default. It has useful built-in motions but no obvious expression pack in the local copy.
- Official Mao should not be imported until runtime compatibility is addressed; direct `Live2DModel.from('/models/mao_probe/Mao.model3.json')` failed with `Unknown error` in `vendor/cubism4.min.js`.
- Full chat-to-LLM reply smoke was not run because it depends on external provider credentials and would use private runtime config.
- 2026-07-05 reply/TTS/subtitle smoke was run against the existing local backend. `/api/chat` returned a non-empty reply, API health reported browser TTS OK with no blocking checks, and Electron/CDP verified frontend `window.speak(...)` plus visible subtitle text.
- 2026-07-05 GPT-SoVITS routing fix: local runtime config now sets `tts.provider=gpt_sovits`, disables browser fallback, and increases GPT-SoVITS/server request timeouts. Direct GPT-SoVITS, backend `/api/tts`, `/config.json`, `/api/health`, and Electron/CDP frontend speak verification all confirmed server TTS now returns WAV audio.
- Hiyori's bundled model still limits true hand/body expressiveness. Current work uses parameter layers, part opacity, motion files, exp3 files, and lightweight semantic overlays; real mesh/deformer edits still require source model assets or a better replacement model.
- Human feel review is still useful for deciding whether happy/anxious should be pushed further; automated and visual checks now show readable separation, but Hiyori's pose range remains bounded by the model.
- The worktree contains unrelated local modifications that predate this harness update.
- No automated blocker for `natural-character-dialogue-v1`; first inspect and consolidate the existing local English persona prompt, reply-language block, and random density/inner-state helpers.
- Direct browser-only local-page verification lacks the existing API token and therefore cannot exercise authenticated relationship mutations; this correctly fails closed and does not affect the isolated API/UI tests or Electron's authenticated request path.

## Verification Evidence

- Structured Relationship Growth v1
  - `python -m pytest tests\test_relationship_state.py tests\test_api_health.py -q` -> `29 passed`.
  - `node tests\test_relationship_state_frontend.js` -> passed.
  - Full `scripts\test-local.ps1` gate -> passed: `460` Python tests, all Node tests, Python syntax `110` files, JavaScript syntax `137` files, and secret scan `548` files.
  - Persona Card visual inspection confirmed the relationship section is contained in the existing card and remains scrollable. No separate management page or authentication bypass was introduced.
- Hiyori all-emotion strong expression follow-up
  - Result: complete for the runtime/resource path.
  - `node tests\test_performance_cue_frontend.js`
    - Result: passed.
  - `node scripts\run_node_tests.js`
    - Result: passed, ended with `[OK] Node frontend tests complete.`
  - `node --check web\live2dExpressionController.js; node --check web\hiyoriEmotionOverlayController.js; node --check tests\test_performance_cue_frontend.js`
    - Result: passed.
  - `python -m json.tool config.example.json > $null; python -m json.tool package.json > $null; python -m json.tool feature_list.json > $null; python -m json.tool web\assets\live2d-overlays\hiyori\manifest.json > $null`
    - Result: passed.
  - `python -m py_compile app.py config.py tts.py memory.py tools.py llm_client.py asr.py emotion.py humanize.py utils.py`
    - Result: passed.
  - Electron/CDP visual QA
    - Result: passed.
    - Full contact sheet: `%USERPROFILE%\AppData\Local\Temp\ai_desktop_pet_smoke\hiyori-all-emotions-v1\all-emotions-contact-sheet.png`.
    - Zoom contact sheet: `%USERPROFILE%\AppData\Local\Temp\ai_desktop_pet_smoke\hiyori-all-emotions-v1\all-emotions-contact-sheet-zoom.png`.
    - Electron PID `47508` was stopped after capture; 8123 and 9223 had no remaining listener rows.
  - `git diff --check -- web\live2dExpressionController.js web\hiyoriEmotionOverlayController.js web\desktop.css web\assets\live2d-overlays\hiyori\manifest.json tests\test_performance_cue_frontend.js progress.md session-handoff.md docs\superpowers\specs\2026-06-04-hiyori-all-emotion-strong-expression-design.md docs\superpowers\plans\2026-06-04-hiyori-all-emotion-strong-expression.md`
    - Result: passed.
  - `node %USERPROFILE%\.codex\skills\harness-creator\scripts\validate-harness.mjs --target D:\AI\ai_desktop_pet`
    - Result: passed, overall 100/100.
- `node <codex-home>\skills\harness-creator\scripts\validate-harness.mjs --target <repo-root>`
  - Result: passed, overall 100/100.
- `python -m json.tool feature_list.json > $null`
  - Result: passed.
- `Test-Path docs\superpowers\plans\2026-06-03-character-performance-cue-v1.md`
  - Result: passed, returned `True`.
- `git diff --check -- docs/superpowers/plans/2026-06-03-character-performance-cue-v1.md progress.md session-handoff.md`
  - Result: passed.
- `node tests/test_performance_cue_frontend.js`
  - Result: passed.
- `node tests/test_character_runtime_frontend.js`
  - Result: passed.
- `node scripts/run_node_tests.js`
  - Result: passed, ended with `[OK] Node frontend tests complete.`
- `node --check web/performanceCueController.js`
  - Result: passed.
- `node --check web/live2dExpressionController.js`
  - Result: passed.
- `node --check web/ttsPlaybackController.js`
  - Result: passed.
- `node --check web/chat.js`
  - Result: passed.
- `node --check web/chatReplyController.js`
  - Result: passed.
- `node --check tests/test_performance_cue_frontend.js`
  - Result: passed.
- `python -m json.tool package.json > $null`
  - Result: passed.
- `git diff --check -- web/performanceCueController.js tests/test_performance_cue_frontend.js scripts/run_node_tests.js web/index.html web/live2dExpressionController.js web/ttsPlaybackController.js web/chat.js web/chatReplyController.js tests/test_character_runtime_frontend.js progress.md session-handoff.md docs/superpowers/plans/2026-06-03-character-performance-cue-v1.md`
  - Result: passed.
- `node %USERPROFILE%\.codex\skills\harness-creator\scripts\validate-harness.mjs --target D:\AI\ai_desktop_pet`
  - Result: passed, overall 100/100.
- `npm run start:electron`
  - Result: not used directly; Electron was launched with `node_modules\electron\dist\electron.exe --remote-debugging-port=9223 electron/main.js` for CDP inspection.
- Electron/CDP smoke
  - Result: passed.
  - Backend `/config.json` became ready on `127.0.0.1:8123`.
  - CDP found both `view=chat` and `view=model` pages on port `9223`.
  - Model page reported `modelLoaded: true`, `ttsProvider: browser`, `speakingEnabled: true`.
  - Triggered `speak("太好了！我们先这样！", { performanceCue })`; result returned `ok: true`.
  - Happy/high cue applied during speech: `speechMotionStrength: 1.9`, `bodyBoost: 1.32`, `beatBoost: 1.42`, `expressionBoost: 1.3`, and `speechMotionBlend` peaked around `0.85`.
  - Screenshot saved at `%USERPROFILE%\AppData\Local\Temp\ai_desktop_pet_smoke\character-performance-cue-model.png`.
  - Electron was closed via CDP after smoke; 8123 and 9223 were no longer reachable.
- Follow-up Electron/CDP chat-to-model smoke after human screenshot review
  - Result: passed.
  - Root causes fixed: no explicit visible accent layer, performance cue missing from desktop speech broadcast, and normalized cue strength getting downgraded on the model page.
  - Triggered high happy cue from the chat page and verified the model page received `visibleMotion: 3.2`.
  - Model page reported `cueMotionActive: true` with `speechPerformanceAccentDebug` on all sampled frames.
  - Contact sheet saved at `%USERPROFILE%\AppData\Local\Temp\ai_desktop_pet_smoke\performance-broadcast-v5\contact-sheet.png`.
  - Electron was closed after smoke; 8123 and 9223 were no longer reachable.
- Second follow-up Electron/CDP chat-to-model smoke after screenshot still looked static
  - Result: passed.
  - Root cause fixed: parameter-only emotion remained visually weak because the bundled model lacks expression files and active motion/model state can override low-level facial parameters.
  - Motion scan identified `FlickUp`/`Tap` as the readable happy/energetic built-in motion path.
  - Triggered high happy/wave cue from the chat page and verified the model page dispatched `FlickUp` with `source: performance_cue`.
  - Contact sheets saved at `%USERPROFILE%\AppData\Local\Temp\ai_desktop_pet_smoke\performance-motion-v7\upper-crop-sheet.png` and `%USERPROFILE%\AppData\Local\Temp\ai_desktop_pet_smoke\performance-motion-v7\full-crop-sheet.png`.
- Final verification after v7 built-in motion and harness update
  - Result: passed.
  - Covered JS syntax for touched files, `tests/test_performance_cue_frontend.js`, full `scripts/run_node_tests.js`, JSON checks, Python compile checks, `git diff --check`, and harness validation.
  - Smoke Electron processes launched for CDP verification were closed after validation.
- Multi-emotion follow-up smoke
  - Result: partial.
  - Triggered `surprised`, `thinking`, `sad`, `anxious`, `angry`, and `playful` locally through the chat-to-model speech broadcast.
  - Dispatches observed: `surprised -> Flick`, `thinking/sad -> Flick@Body`, `anxious/angry -> FlickDown`, `playful -> FlickUp`.
  - Added an angry accent branch and unit guard for lowered brow, tense mouth, head/body shake, and arm/hand emphasis.
  - Visual review after the branch still shows angry is weak/ambiguous on this model; `FlickUp` probe is visible but reads too happy.
  - Contact sheets: `%USERPROFILE%\AppData\Local\Temp\ai_desktop_pet_smoke\performance-other-emotions-v3\combined-upper-overview.png`, `%USERPROFILE%\AppData\Local\Temp\ai_desktop_pet_smoke\performance-angry-flickup-probe\upper-crop-sheet.png`.
  - Final verification passed: JS syntax, `tests/test_performance_cue_frontend.js`, full `scripts/run_node_tests.js`, JSON checks, Python compile checks, `git diff --check`, and harness validation 100/100.
- Model/expression resource follow-up
  - Result: partial but improved.
  - Online search and official sample-page review found no ready-made `hiyori_pro_t11` exp3 pack, so local handwritten exp3 files were added.
  - Added and registered 8 expressions: `neutral`, `happy`, `playful`, `sad`, `anxious`, `angry`, `surprised`, `thinking`.
  - Frontend cue path now calls `model.expression(...)` and records `state.live2dExpressionLast`.
  - Verification passed: `node tests/test_performance_cue_frontend.js`, `node scripts/run_node_tests.js`, JS syntax checks, model/expression JSON checks, AGENTS JSON checks, AGENTS Python compile checks, `git diff --check`, and harness validation 100/100.
  - Electron/CDP smoke confirmed expression manager names and `applySpeechPerformanceCue` selected `angry` and `happy` with `ok: true`.
  - Smoke screenshots: `%USERPROFILE%\AppData\Local\Temp\ai_desktop_pet_smoke\hiyori-exp3-v1\neutral.png`, `angry.png`, `happy.png`.
- Angry/thinking A-strength follow-up
  - Result: improved, with one remaining asset limit.
  - Strengthened `web\models\hiyori_pro_t11\expressions\angry.exp3.json` and `thinking.exp3.json` with larger face, body, arm, and hand parameters.
  - Strengthened runtime `angry` and `thinking` branches in `web/live2dExpressionController.js`, including arm/hand linkage during speech accents.
  - Changed high-`angry` built-in motion priority in `web/appStartupController.js` to `Tap@Body`, then `FlickDown`.
  - Verification passed: `node tests/test_performance_cue_frontend.js`, `node scripts/run_node_tests.js`, JS syntax checks, and expression JSON checks.
  - Electron/CDP wrapper smoke confirmed `angry` tries `Tap@Body` and `thinking` uses `Flick@Body`; both expression selections returned `ok: true`.
  - Strength-v2 screenshots: `%USERPROFILE%\AppData\Local\Temp\ai_desktop_pet_smoke\hiyori-exp3-strength-v2\contact-sheet-upper.png`, `contact-sheet-full.png`, `angry-wrapper-motion.png`, `thinking-wrapper-motion.png`.
  - Visual read: `thinking` is clearly stronger and has visible arm/hand posture; `angry` is stronger than before but still not a strong rage pose because the bundled model's arm/hand deformation is limited.
  - Final validation passed after handoff updates: targeted performance cue test, touched JS syntax checks, full `scripts/run_node_tests.js`, AGENTS JSON checks, expression JSON checks, AGENTS Python compile checks, `git diff --check`, and harness validation 100/100. `git diff --check` emitted only Git's line-ending warning for `.gitignore`.
- Live2D learning-based thinking follow-up
  - Result: improved.
  - User rejected the previous result because it did not read as `thinking`.
  - Added `#thinking-cue-bubble` and `web/desktop.css` styling for a visible `?` overlay when high-`thinking` cues are active.
  - `thinking` now uses its own runtime mood blend instead of aliasing into `surprised`.
  - `applyStyleExpressionLayer()` now consumes `thinkingBlend` with side glance, tilted head/body, and closed-mouth cues.
  - `ponder`, `thinking`, and `consider` action metadata now normalize to the `think` action cue.
  - `web/motionRuntimeController.js` supports `preserveGroupOrder`, and performance-cue dispatch uses it so explicit `Tap@Body` priority is kept.
  - Verification so far: `node tests/test_performance_cue_frontend.js` passed; touched JS syntax checks passed; expression JSON checks passed.
  - Electron/CDP v3 confirmed: bubble visible with text `?`, `moodExpressionWeightMood: "thinking"`, `moodExpressionRuntimeMood: "thinking"`, `surprised: 0`, and `Tap@Body` dispatch.
  - Latest screenshot: `%USERPROFILE%\AppData\Local\Temp\ai_desktop_pet_smoke\hiyori-thinking-symbol-v3\thinking-cue-symbol.png`.
  - Final validation passed: targeted performance cue test, touched JS syntax checks, full `scripts/run_node_tests.js`, AGENTS JSON checks, expression JSON checks, AGENTS Python compile checks, `git diff --check`, and harness validation 100/100.
  - Electron preview process was closed after validation; ports `8123` and `9223` were closed.
- Thinking motion upper-bound follow-up
  - Result: visibly improved.
  - Added `web\models\hiyori_pro_t11\motion\hiyori_thinking_01.motion3.json`.
  - Registered `Thinking` in `web\models\hiyori_pro_t11\hiyori_pro_t11.model3.json`.
  - High-`thinking` dispatch now tries `Thinking` before `Tap@Body`, `Flick@Body`, and `FlickDown`.
  - Runtime high-`thinking` accent switches toward `PartArmB`, drives `ParamArmLB`, `ParamHandLB`, and `ParamHandRB`, and suppresses `PartArmA` to avoid the old-arm ghost.
  - Verification passed so far: `node tests\test_performance_cue_frontend.js`, touched JS syntax checks, model/motion JSON checks, and full `node scripts\run_node_tests.js`.
  - Electron visual smoke confirmed `lastDispatch.group: "Thinking"`, `PartArmA: 0.02`, `PartArmB: 0.881`, `ParamArmLB: 7.495`, `ParamHandLB: -7.582`, and visible `?` bubble.
  - Latest screenshot: `%USERPROFILE%\AppData\Local\Temp\ai_desktop_pet_smoke\hiyori-thinking-runtime-v2\thinking-runtime-peak.png`.
  - Final validation after handoff updates passed: AGENTS JSON checks, AGENTS Python compile checks, targeted diff whitespace check, and harness validation 100/100.
  - Cleanup check returned no project Electron/Python process and no `8123`/`9223` listener rows.
- Thinking snap-jitter B follow-up
  - Result: improved timing/readability.
  - Added RED coverage first; `node tests\test_performance_cue_frontend.js` initially failed on `Thinking motion should snap into a visible pose during the first 0.35s`.
  - Updated the `Thinking` motion resource with early head/body/arm snap keyframes and corrected motion Meta totals.
  - Updated `web\live2dExpressionController.js` so high-`thinking` runtime accents expose `thinkingReactionMode: "snap_jitter"` and add early side-snap/jitter output.
  - Updated `web\desktop.css` so the `?` bubble pops and jitters briefly.
  - Verification passed: targeted performance cue test, touched JS syntax checks, model/motion JSON checks, full `node scripts\run_node_tests.js`, AGENTS JSON checks, AGENTS Python compile checks, and targeted `git diff --check`.
  - Electron/CDP smoke triggered high `thinking` on the model page and confirmed `thinkingReactionMode: "snap_jitter"`, early `thinkingSnap: 0.895`, visible `?` bubble, `PartArmA: 0.02`, and `PartArmB: 0.951`.
  - Screenshots: `%USERPROFILE%\AppData\Local\Temp\ai_desktop_pet_smoke\hiyori-thinking-snap-v1\thinking-snap-early.png`, `thinking-snap-hold.png`, `thinking-snap-jitter.png`, and `thinking-snap-contact-sheet.png`.
  - Smoke process was closed; port cleanup check showed no `8123`/`9223` listener.
- Live2D asset upper-bound and candidate sourcing follow-up
  - Result: decision-ready, no default model changed.
  - Hiyori resource boundary: no `.cmo3` files found in the repo, so true source-model edits are unavailable in the current checkout.
  - Added a frontend harness guard that high-`thinking` runtime output includes `thinkingUpperBoundProbe: true`.
  - Targeted TDD loop: `node tests\test_performance_cue_frontend.js` failed first on the missing field, then passed after adding the field to `web\live2dExpressionController.js`.
  - Local Haru probe:
    - `docs\live2d\models\haru_greeter_t03` has `.model3.json`, `.moc3`, textures, physics, pose, display info, and 15 `Use` motions.
    - Electron/CDP loaded the temporary Haru probe with `Idle=6`, `Use=15`.
    - Screenshot contact sheet: `%USERPROFILE%\AppData\Local\Temp\ai_desktop_pet_smoke\haru-candidate-v1\haru-contact-sheet.png`.
    - Visual read: `m10` is the most obvious arm-spread pose; the rest are smaller. Haru is compatible but not a clear thinking-expression upgrade by itself.
  - Online candidates from official sources:
    - Official Live2D sample page candidates worth later manual probe: `Epsilon` for anger/effects, `Haru` for arm/outfit changes, `Shizuku` for fine hand movements, `Koharu & Haruto` for exaggerated SD reactions.
    - `Mao` from `Live2D/CubismWebSamples` was temporarily cloned to `%TEMP%` and inspected. It has 8 expressions and strong `TapBody` motions, but current runtime loading failed with `Unknown error` inside `vendor/cubism4.min.js`.
  - Temporary `web\models\haru_greeter_t03_probe` and `web\models\mao_probe` directories were removed. Port cleanup returned no `8123`/`9223` listeners.
  - Final validation passed after recording the decision:
    - `node tests\test_performance_cue_frontend.js`
    - `node scripts\run_node_tests.js`
    - `node --check web\live2dExpressionController.js`
    - `node --check tests\test_performance_cue_frontend.js`
    - JSON checks for AGENTS-required files and touched Hiyori model/motion JSON
    - AGENTS Python compile checks for required modules
    - Targeted `git diff --check`
    - Trailing-whitespace checks for the updated handoff/progress/plan docs
    - Harness validation, overall 100/100
    - Port cleanup check for `8123`/`9223`
- Hiyori local emotion overlay follow-up
  - Current status: visually improved, final verification still needs the full AGENTS command set before push/PR.
  - Hiyori remains the default model.
  - Added files:
    - `web\hiyoriEmotionOverlayController.js`
    - `web\assets\live2d-overlays\hiyori\manifest.json`
    - `web\assets\live2d-overlays\hiyori\thinking-focus-lines.png`
    - `web\assets\live2d-overlays\hiyori\thinking-ellipsis.png`
    - `web\assets\live2d-overlays\hiyori\angry-impact-lines.png`
    - `web\assets\live2d-overlays\hiyori\angry-mark.png`
  - Updated files:
    - `web\index.html`
    - `web\desktop.css`
    - `web\live2dExpressionController.js`
    - `web\chat.js`
    - `tests\test_performance_cue_frontend.js`
  - Key decision: do not use pasted-on external limb assets. The first generated hand/fist assets were deleted after visual QA.
  - Screenshot evidence:
    - `%USERPROFILE%\AppData\Local\Temp\ai_desktop_pet_smoke\hiyori-overlay-live-v4\thinking-high.png`
    - `%USERPROFILE%\AppData\Local\Temp\ai_desktop_pet_smoke\hiyori-overlay-live-v4\angry-high.png`
    - `%USERPROFILE%\AppData\Local\Temp\ai_desktop_pet_smoke\hiyori-overlay-assets-v2\asset-contact-sheet.png`
  - Targeted verification already passed:
    - `node tests\test_performance_cue_frontend.js`
    - `node --check web\hiyoriEmotionOverlayController.js`
    - `node --check web\live2dExpressionController.js`
    - `node --check web\chat.js`
    - `python -m json.tool web\assets\live2d-overlays\hiyori\manifest.json`
- Angry model twitch follow-up
  - Current status: targeted fix implemented; final verification should be re-run if more files change.
  - User clarified the twitch was in the model body, not the red overlay.
  - Root cause: high-`angry` performance accent used rapid head/body/arm shake, especially `sin(now / 74)`.
  - Fix: changed the high-`angry` runtime accent to slower held tension with reduced frame-to-frame head/body/arm jumps.
  - Regression test: `tests\test_performance_cue_frontend.js` now samples 36 short frames and asserts high-`angry` head/body/arm deltas stay below twitch thresholds.
  - Screenshot evidence: `%USERPROFILE%\AppData\Local\Temp\ai_desktop_pet_smoke\hiyori-angry-smooth-v1\angry-smooth-contact-sheet.png`.
  - Targeted verification already passed:
    - `node tests\test_performance_cue_frontend.js`
- Reply/TTS/subtitle smoke on 2026-07-05
  - Current status: passed for the user's requested checks, with one unrelated validation failure.
  - `scripts\test-local.ps1` passed Python tests (`425 passed`), Node frontend tests, and Python/JavaScript syntax checks, then failed at `scripts\check_secrets.py` because existing documentation/state files contain private local Windows paths.
  - `scripts\first_chat_smoke.ps1 -Message "请用一句中文回复：测试通过。" -NoStartServer` passed against the existing backend.
  - API health returned status `ok`, TTS provider `browser`, and no blocking readiness checks.
  - Electron/CDP frontend smoke against the model page confirmed `window.speak(...)` returned `true`; `#subtitle-layer` became visible and contained `字幕和语音测试通过`.
  - Temporary Electron/project backend processes were stopped after the smoke; no project `electron.exe` or `app.py` process was left running.
- GPT-SoVITS routing fix on 2026-07-05
  - Current status: fixed and verified locally.
  - `config.local.json` now selects `gpt_sovits`, sets GPT-SoVITS timeout to 120 seconds, sets server request timeout to 120 seconds, and disables browser fallback.
  - Direct `POST` to the GPT-SoVITS `/tts` endpoint returned WAV audio.
  - Project `/api/tts` returned WAV audio through the backend.
  - `/config.json` exposed `provider: gpt_sovits`; `/api/health` reported TTS OK with browser fallback disabled.
  - Electron/CDP frontend smoke confirmed `window.speak("OK.")` requested `/api/tts`, received `200 audio/wav`, returned `true`, and showed the subtitle.
  - The temporary Electron/project backend test instance was stopped after verification; the GPT-SoVITS service on port 9880 was left running.
- Live2D model drag follow-up
  - Current status: targeted Electron click-through fix implemented and Node frontend tests passed.
  - User-reported issue: Live2D model could not be moved.
  - Window lock check: `%USERPROFILE%\AppData\Roaming\Electron\window-state.json` had `locked: false`.
  - Fix:
    - `web\live2dLayoutController.js` keeps click-through disabled while model drag data exists.
    - It also polls `getCursorScreenPoint()` plus `getModelWindowBounds()` to update hit testing while the transparent Electron model window is click-through.
  - Test coverage:
    - `tests\test_drag_logic.js` has static guards for the cursor polling fallback.
  - Verification passed:
    - `node tests\test_drag_logic.js`
    - `node --check web\live2dLayoutController.js`
    - `node --check tests\test_drag_logic.js`
    - `node scripts\run_node_tests.js`
- Startup chat-window first-frame flash follow-up
  - Current status: targeted startup paint fix implemented and Node frontend tests passed.
  - User-reported issue: when the desktop app starts, the first few frames can show a broken-looking chat layout with an oversized circular avatar/image.
  - Root cause: the panel DOM could paint before `chat.js` added `view-chat`/`view-model` classes, while avatar overflow guards were scoped to `body.view-chat`.
  - Fix:
    - `web\index.html` now applies URL-derived view/desktop/transparent classes in an inline script at the start of `body`.
    - `web\base.css` now constrains `.panel .hero-avatar` and its image before view-specific CSS applies.
    - `tests\test_first_run_frontend.js` checks the early startup script and base avatar guard.
  - Verification passed:
    - `node tests\test_first_run_frontend.js`
    - `node --check tests\test_first_run_frontend.js`
    - `node --check web\chat.js`
    - `node scripts\run_node_tests.js`
    - `git diff --check -- web\index.html web\base.css tests\test_first_run_frontend.js`
    - Local server content checks for `/` and `/base.css`.
- Electron always-on-top config follow-up
  - Current status: targeted Electron window policy fix implemented, drag regression patched, and app restarted.
  - User-reported issue: Live2D model stayed on top of other pages/windows by default.
  - Root cause: `config.json` had `desktop.always_on_top: false`, but `electron\main.js` hard-coded `alwaysOnTop: true` and `setAlwaysOnTop(true)`.
  - Follow-up regression: with always-on-top disabled, Live2D drag stopped working because the model window stayed `focusable: false`; on Windows, a transparent non-topmost non-focusable window does not reliably receive mouse input.
  - Fix:
    - `electron\main.js` now uses `shouldKeepWindowsAlwaysOnTop()` and enables always-on-top only when config explicitly sets `desktop.always_on_top` to `true`.
    - The model window is now focusable when it is not always-on-top, while staying non-focusable in the always-on-top pet mode.
    - `tests\test_electron_window_config.js` guards against hard-coded always-on-top behavior.
  - Verification passed:
    - `node tests\test_electron_window_config.js`
    - `node --check electron\main.js`
    - `node --check tests\test_electron_window_config.js`
    - `node tests\test_drag_logic.js`
    - `node scripts\run_node_tests.js`
    - Local config check confirmed `desktop.always_on_top = false`.
    - Electron app restart succeeded; `/healthz` returned 200.

## Recommended Next Step

Start `release-experience-alignment-v1`: align the documented preview profile with the personal bilingual-input, natural-English, candid-AI companion contract and add an automated regression for the preview profile. Keep the three derived summaries blank unless the user explicitly authorizes rebuilding them through the configured LLM.

## 2026-07-05 Model-Direct Reply Follow-up

Current status: targeted fix implemented and project restarted.

- User clarified the bad reply example came from hand-typed input, not ASR.
- Diagnosis found the screenshot reply text was a hard-coded casual fallback in `character_brain.py`, and similar bad pairings existed in `memory.json`.
- User then requested removing template-like behavior and fully handing replies to the model.
- `config.local.json` now sets `character_runtime.enabled=false`, `return_metadata=false`, `auto_apply_reply_cue=false`, and `model_direct_reply=true`.
- `config.py` now preserves `character_runtime.model_direct_reply`.
- `app.py` skips character brain decision creation, prompt block injection, and character brain response payloads when model-direct mode is enabled.
- `app_reply_pipeline.py` skips character runtime normalization/metadata and character brain/language post-processing when model-direct mode is enabled.
- The temporary good-luck hard-coded fallback added during diagnosis was removed from `character_brain.py`, `character_brain_intent_strategy.py`, and related tests.
- Verification passed:
  - `python -m pytest tests\test_app_reply_pipeline.py tests\test_character_brain.py tests\test_character_runtime_integration.py::test_character_runtime_settings_default_demo_stable_off tests\test_character_runtime_integration.py::test_character_runtime_settings_demo_stable_requires_runtime_enabled -q`
  - `python -m json.tool config.local.json > $null; python -m json.tool config.example.json > $null; python -m json.tool package.json > $null`
  - `python -m py_compile app.py app_reply_pipeline.py config.py character_brain.py character_brain_intent_strategy.py`
  - `git diff --check -- app.py app_reply_pipeline.py config.py character_brain.py character_brain_intent_strategy.py tests/test_app_reply_pipeline.py tests/test_character_brain.py config.local.json`
- Direct internal probe confirmed no character brain decision/prompt/payload is produced and reply text is preserved unchanged in model-direct mode.
- Project was restarted; `/config.json` confirmed `tts.provider=gpt_sovits`, `character_runtime.enabled=false`, `model_direct_reply=true`, `return_metadata=false`, and `auto_apply_reply_cue=false`.
- Manual chat-window validation is still recommended. Command-line `/api/chat` validation from PowerShell was blocked by a local API token mismatch (`Invalid API token`) outside Electron's authenticated request path.

## 2026-07-05 GPT-SoVITS Short English Stability Follow-up

Current status: targeted mitigation implemented, GPT-SoVITS and the project backend restarted.

- User reported the screenshot reply `Alright, alright—I got it the first time. Go sleep.` sounded like a long `aaa` before `Go sleep`.
- Diagnosis found GPT-SoVITS itself was unstable for this short English path:
  - Matching English `prompt_text` plus stable sampling returned a normal-sized WAV in about 15.3s.
  - Empty `prompt_text` with the same reference audio and hotter sampling returned a much longer WAV in about 44.8s, consistent with leading vocalization.
  - Repeated probes also caused the GPT-SoVITS service to hang; it was restarted.
- Fix:
  - `config.py` and `tts.py` now default `gpt_sovits_prefer_clean_prompt` to `false`.
  - `config.local.json` now keeps the matching English prompt text, lowers sampling randomness, uses one candidate, and caps GPT-SoVITS waits at 30s / chunk waits at 15s.
  - `tts.py` TTS-only normalization converts English dash pauses to normal sentence pauses and collapses repeated leading fillers such as `Alright, alright`.
- Verification passed:
  - `python -m pytest tests\test_tts_language.py tests\test_config_asr_defaults.py -q` -> `23 passed`.
  - `python -m py_compile tts.py config.py`
  - JSON checks for `config.local.json`, `config.example.json`, and `package.json`
  - `git diff --check -- tts.py config.py config.local.json tests/test_tts_language.py`
  - Normalization probe maps `Alright, alright—I got it the first time. Go sleep.` to `Alright. I got it the first time. Go sleep.`
  - Short `Go sleep.` synthesis returned a valid `0.724s` WAV, but still took about `24.2s`.
- Remaining manual check:
  - Ask the app to speak a similar sentence and listen for the leading `aaa`.
  - Speed is still not good; GPT-SoVITS can remain slow even after the artifact mitigation.

## 2026-07-05 GPT-SoVITS Perceived Start-Speed Follow-up

Current status: local realtime overlap path enabled and project backend restarted.

- User chose `出声速度` as the next priority.
- Measurement:
  - Warm direct GPT-SoVITS `Go sleep.` requests still took about `11.1s` to `13.5s` total.
  - `streaming_mode=1` made GPT-SoVITS start returning bytes almost immediately, but full response completion still took about `10.4s` to `11.2s`.
  - Current frontend `/api/tts` uses `fetch(...).blob()`, so it still waits for the full audio body before playback.
- Fix in `config.local.json`:
  - `conversation_mode.chat_stream_enabled=true`
  - `tts.gpt_sovits_realtime_tts=true`
  - `tts.stream_mode=realtime`
  - `tts.stream_speak_idle_wait_ms=120`
  - `tts.gpt_sovits_streaming_mode=1`
- Effect:
  - The app should now prefer `/api/chat_stream` and feed deltas into the existing stream TTS queue.
  - This overlaps LLM generation with GPT-SoVITS synthesis and should reduce perceived time-to-first-speech when the model reply streams sentence-by-sentence.
  - It does not solve GPT-SoVITS's intrinsic per-request compute latency.
- Verification passed:
  - JSON checks for `config.local.json`, `config.example.json`, and `package.json`
  - Config probe confirmed local/client realtime settings are visible.
  - `python -m pytest tests\test_config_asr_defaults.py tests\test_tts_language.py -q` -> `23 passed`
  - `node tests\test_chat_api_frontend.js`
  - `node tests\test_character_runtime_frontend.js`
  - `node --check web\appConfigController.js web\streamTtsQueueController.js web\chatReplyController.js`
  - `git diff --check -- config.local.json progress.md session-handoff.md`
- Restart:
  - Desktop project restarted; backend is listening on `127.0.0.1:8123`.
  - GPT-SoVITS remains listening on `127.0.0.1:9880`.
- Next possible deeper optimization:
  - Implement true streaming audio playback for GPT-SoVITS instead of waiting on `fetch(...).blob()`, or switch to a faster provider/model for short acknowledgement lines.

## 2026-07-10 Frontend Runtime Efficiency v1

Current status: complete and Electron-smoke verified.

- Files touched for this slice:
  - `feature_list.json`
  - `progress.md`
  - `session-handoff.md`
  - `web/index.html`
  - `web/viewScriptLoader.js`
  - `web/appStartupController.js`
  - `web/chat.js`
  - `tests/test_frontend_runtime_efficiency.js`
  - `scripts/run_node_tests.js`
- Outcome:
  - Model view now installs 38 of the 88 manifest scripts and skips about 1.12 MB of project JavaScript.
  - Chat view and developer-mode model view keep the full ordered manifest.
  - Idle speech broadcast no longer posts unchanged state at display refresh rate; active speech still uses animation frames.
- Verification:
  - Targeted runtime-efficiency and performance-cue tests passed.
  - Full Node frontend suite passed.
  - JavaScript syntax check passed for 132 files.
  - Electron UI smoke passed with both chat and Live2D model at `待机`.
  - Full local suite remains blocked by the unrelated pre-existing MiMo API-key mock failure (`428 passed, 1 failed`).
- Next session recommendation:
  - Resume `character-performance-cue-v1` as the active feature.
  - If optimizing frontend loading further, first split `web/chat.js` into true model/chat entry modules; do not enlarge the current exclusion list without Electron smoke coverage.

## 2026-07-10 Hermetic Test Stability v1

- Status: complete.
- File touched: `tests/test_character_runtime_integration.py` plus state artifacts.
- Verification: targeted auth/probe tests passed (`20 passed`); full Python suite passed (`429 passed`).
- Production API-key validation remains unchanged.

## 2026-07-10 Release Privacy Scan v1

- Status: complete.
- Sanitized 61 real Windows user-home references across `progress.md`, `session-handoff.md`, and Live2D plan/spec documents.
- Secret scan passed across 536 files; private-path fixture remains enforced.
- Full `scripts/test-local.ps1` gate passed.

## 2026-07-10 Release Advisory Semantics v1

- Status: complete.
- Default release gate now reports optional demo-service blockers as warnings; `-RequireDemoReadiness` preserves strict failure behavior.
- Runtime acceptance tests passed (`20 passed`), and the default release gate passed with GPT-SoVITS offline.

## 2026-07-10 First-Run Package and Installer Verification

- Source-package smoke passed, including clean bootstrap and safe-default validation.
- Installer smoke passed, including NSIS output, source zip, SHA256SUMS and release asset documentation.
- No package code changes were needed.

## 2026-07-10 Local HTTP Request Bounds v1

- Status: complete.
- `app.py` centralizes request-body validation with route-specific limits.
- Integration tests passed (`67 passed`), including 413 and invalid Content-Length behavior.

## 2026-07-10 Chat Developer Diagnostics Lazy Loading v1

- Status: complete.
- Default chat skips `followupReadinessPanelController.js` (212,498 bytes); developer mode still loads it through `devFeatureLoader.js`.
- Node suite and Electron UI smoke passed.

## 2026-07-10 Renderer Content Security Policy v1

- Status: complete.
- Added CSP without `unsafe-eval`, externalized early bootstrap, and vendored the official Pixi 6.5.8 CSP compatibility patch.
- Electron smoke passed with Live2D rendered and no CSP security warning.

## 2026-07-10 Electron Dependency Security v1

- Status: complete.
- Electron is locked to 39.8.10; npm audit reports 0 vulnerabilities.
- Full Node tests and Electron UI smoke passed.

## 2026-07-10 Local Data Durability v1

- Status: complete.
- Backup-aware reads now cover interaction, core, short-term and emotion state; emotion writes are atomic with previous-version backup.
- Targeted persistence tests passed (`38 passed`).
- `character-performance-cue-v1` is restored as the active feature after this audit sequence.

## 2026-07-10 Complete Audit Remediation Verification

- All implemented audit fixes passed the final local gate (`436` Python tests plus all frontend/syntax/privacy checks).
- npm audit reports 0 vulnerabilities; Electron 39 smoke passed.
- Source package and NSIS installer smoke checks passed after all changes.
- Only remaining advisory is external/local GPT-SoVITS availability; no code or safety default was changed to override the user's provider choice.

## Latest Session Update: Companion Speech Prewarm v1 Completed on 2026-07-11

- Result: opt-in model-direct companion turns using GPT-SoVITS can start one server-TTS request for a complete stable draft sentence while the model continues streaming. The audio remains silent until the canonical final turn confirms that exact prefix; then it plays once and only the remaining tail is synthesized normally.
- Safety and coherence: mismatched final text, failed requests, turn cancellation, user interruption, and late audio are discarded. Caller abort now propagates through the TTS API and cannot trigger a retry. Legacy and text-only paths remain unchanged.
- Performance alignment: the prewarmed prefix starts its timeline and talk gesture only from actual HTML audio `onplay` or AudioContext fallback start, never when a blob becomes ready.
- Verification: focused TTS/contract/performance tests, full Node suite, `scripts\test-local.ps1` (`481` Python tests, all Node/syntax/privacy checks), `scripts\check_character_v1_4.py` (`166` character Python tests plus frontend checks), JSON validation, and scoped `git diff --check` all passed.
- Remaining manual risk: the configured GPT-SoVITS endpoint was unavailable during strict demo readiness, so live first-sound timing still needs that user-selected service running.
- Next session: start `release-experience-alignment-v1`, aligning `config.preview.example.json` with the intended bilingual-input, natural-English, candid-AI companion contract and adding regression coverage. Do not rebuild the intentionally blank derived summaries without explicit user authorization.

## Latest Session Update: Release Experience Alignment v1 Completed on 2026-07-11

- `config.preview.example.json` now enables `assistant_reply_language: en`, model-direct reply handling, canonical companion turns, structured relationship state, and streamed text. Its prompt supports Chinese or English input, natural English by default, and candid AI identity when relevant.
- Browser TTS fallback, manual observation, no automatic/proactive desktop behavior, and disabled tools/shell remain explicit preview defaults.
- Added `tests\test_preview_experience_profile.py`, including a real temporary-config run of `apply-preview-experience-config.ps1` that proves all pre-existing LLM credentials are preserved while the current companion profile is merged.
- Verification: profile/acceptance tests, clean source-package first-run smoke, PowerShell parse checks, `scripts\test-local.ps1` (`485` Python tests plus all frontend/syntax/privacy checks), public encoding, JSON, and scoped diff checks passed.
- Next session recommendation: prioritize bilingual voice input. Current audit evidence says local/browser ASR remains Chinese-first, so English spoken input is not yet equivalent to the intended text experience. Keep derived summaries blank unless explicitly authorized to rebuild.

## Current Objective: Private Bilingual Voice Input v1

- Status: in progress.
- Scope: add optional local Chinese/English Vosk model configuration and whole-utterance auto selection; preserve the existing Chinese setup if no English model is configured.
- Safety boundaries: do not touch `config.local.json`, do not download models, do not expose local paths to the client, and do not enable browser/cloud ASR as a new fallback.
- Limitation to retain in user-facing docs: rapid Chinese-English code-switching inside one utterance is not guaranteed by two monolingual Vosk models.

## Latest Session Update: Private Bilingual Voice Input v1 Completed on 2026-07-11

- `asr.py` now supports optional local Chinese/English model paths, one whole-utterance auto choice, CJK-only spacing compaction, bounded two-model caching, and a conservative near-tie policy that enters the existing low-confidence confirmation path.
- `app_asr_route.py` passes only server-side ASR configuration to the structured transcriber. Request JSON cannot choose model paths; API and health payloads do not reveal private local paths.
- The frontend accepts safe language/confidence metadata and applies ambiguity to its existing confirmation flow. Explicit English browser recognition works when `input_language_mode` is `en`; automatic browser wake switching is deliberately not claimed.
- Files added for regression coverage: `tests\test_asr.py`, `tests\test_app_health_asr.py`, and `tests\test_bilingual_local_asr_frontend.js`.
- Verification: focused suite `39 passed`; full `scripts\test-local.ps1` passed with `505` Python tests, all Node frontend tests, syntax and secret checks; public encoding, JSON validation, and scoped diff check passed.
- Manual follow-up: install/configure a local English Vosk model in private `config.local.json`, then speak one full Chinese sentence and one full English sentence with the microphone open. Do not claim rapid code-switching support or enable browser/cloud fallback automatically.
- Recommended next feature: select the next remaining end-to-end experience gap from the current audit, prioritizing real configured-model conversation and voice/Live2D evidence rather than changing private settings or rebuilding derived summaries.

## Current Objective: Realtime TTS Performance Sync v1

- Status: in progress.
- Scope: fix the realtime queued server-TTS path so talk gesture and performance timeline begin only at real audible playback, using the existing `onPlaybackStart` contract already proven by the companion speech prewarm path.
- Preserve: pending/thinking pre-reaction, direct fallback, companion-turn behavior, user-selected provider/config, and all privacy/safety defaults.
- Test priority: no gesture/timeline on text enqueue or blob readiness; one start at actual playback; no start for stale/cancelled/failed segments.
## Current Objective: Companion Experience Diagnostics v1

- Status: complete; there is no active coding feature.
- Result: developer mode has a bounded, text-free recent-turn latency panel covering headers, first text, reply readiness, TTS readiness, first audible playback, and playback completion across Browser, HTML audio, and AudioContext paths.
- Files touched: `web/companionExperienceDiagnostics.js`, `web/devFeatureLoader.js`, `web/index.html`, `web/chatDom.js`, `web/advancedActionBinder.js`, `web/chat.js`, `web/ttsPlaybackController.js`, `tests/test_companion_experience_diagnostics_frontend.js`, `scripts/run_node_tests.js`, and the three state artifacts.
- Verification: targeted diagnostics/playback/lazy-loading tests, full Node suite, and `scripts\test-local.ps1` all passed (`519` Python tests; Python syntax `117`; JavaScript syntax `149`; secret scan `568`).
- Manual check: open a real Electron developer session, click `体验延迟`, and compare one Browser TTS and one GPT-SoVITS/fallback turn against perceived first sound. No measurements are persisted or exported.
- Next session recommendation: create one provider-capability-gated true-streaming-audio feature based on the measured bottleneck. Preserve provider choice, fallback policy, privacy/security defaults, and the existing actual-playback performance contract.
