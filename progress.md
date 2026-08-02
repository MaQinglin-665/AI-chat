# Progress

## Local RVC Singing Entry v1 (2026-07-28)

- Added a separate opt-in desktop entry: choose one local WAV a cappella vocal, convert it using the user-selected second authorized RVC model, then play the local WAV result. The authorized catalog maps `不说` and `雨爱` to their respective ordered vocal clips. It does not replace conversational Qwen3-TTS and does not upload source audio.
- Private `config.local.json` selects the second preview model and keeps all runtime, work, and result paths external to the repository. Public defaults remain disabled and path-free.
- The bridge stages the chosen source under an ASCII job directory to avoid RVC's Windows non-ASCII decoder limitation; original audio is never modified. A direct external-runtime smoke conversion completed successfully and wrote `integration-smoke.wav` outside the repository.

## QQ Social Identity via AstrBot/OneBot v1 (2026-07-28)

- Implemented the disabled-by-default desktop QQ identity layer and the transport-only AstrBot plugin skeleton for the existing Tencent Cloud AstrBot + NapCatQQ/OneBot v11 path.
- The desktop pet now receives the configured QQ number as its own persistent social identity in the LLM prompt. QQ replies use the normal project personality and memory, while every QQ-originated turn forces desktop tools, shell, browser, file/observation, payment, and account actions off.
- The cloud plugin queues text events; the desktop polls it, applies allowlists and offline-expiry, then relays a text response. The optional local audit/history is bounded, ignored by Git, visible in the QQ configuration page, and can be cleared locally.
- A clearly worded desktop instruction such as `给 QQ 1234567 发消息：晚上好` is an explicit-send path. It sends only to an allowlisted target with an already established route; no token is written into config or logs.
- Tencent Cloud bridge: the compatible plugin is installed, loaded, and verified through the private Tailscale Serve URL. A persistent, narrowly scoped AstrBot v4.25 dashboard override exempts only this bridge plugin's routes when `TAFFY_QQ_BRIDGE_AUTH_MODE=tailnet`; all other `/api` routes retain their normal authentication. The bridge token was removed from the cloud configuration. A read-only desktop-to-cloud `/poll` returned HTTP 200; no QQ message was sent and no credential was stored in the repository. The local QQ identity is configured with an explicit private-contact allowlist and text-only replies; launching the desktop pet is still an external-message activation step.
- QQ media and autonomous scheduled outreach remain deliberately off pending an end-to-end OneBot media workflow and a dedicated proactive-delivery policy.
- Verification: `python -m pytest -q tests/test_qq_identity.py` -> `7 passed`; final `scripts\test-local.ps1` -> `607 passed` Python tests, all Node frontend tests, Python syntax `140` files, JavaScript syntax `166` files, and secret scan `628` files.

## Authorized Singing Voice RVC Trial v1 (2026-07-28)

- User supplied two separately authorized, accompaniment-separated singing datasets outside the repository. The selected inputs are only the two `v3_14秒合规` directories under `D:\视频\03_素材库\01_音频\菲比\02_待人工筛选`; they contain different singers and must never be mixed.
- Scope is a bounded local RVC singing-voice conversion trial, not a replacement of the current Qwen3-TTS speech voice and not an embedded public voice-cloning feature. Runtime, copied training inputs, checkpoints, indexes, and audition outputs stay outside the Git repository.
- Qwen3-TTS was stopped with user approval before training because the 8 GB GPU had only about 1.4 GB free while it was active. After stopping its two local server processes, GPU usage fell to about 2.2 GB; Electron and unrelated services were left running.
- Completed two isolated 40 kHz RVC v1 preview models using only their respective user-designated datasets: `BV1hPizBSE1K` produced 70 valid training slices and `BV1VeGq6ZEsq` produced 59. Both F0 (`pm`) and HuBERT extraction completed with zero failures, and each model has a distinct FAISS index.
- The first 8 GB GPU attempt at batch 4 failed during CUDA CUBLAS. A batch-2 run later stalled under Windows virtual-memory pressure. After user-authorized closure of Douyin, WeChat, Chrome, Wallpaper Engine, the desktop pet, and paused Qwen download processes, each model completed a stable batch-1, 25-epoch preview run. This is a low-data audition baseline, not a production-quality final singer.
- External artifacts only: model weights and indexes are under `D:\AI\rvc_singing_runtime\assets`; copied datasets under `D:\AI\rvc_singing_workspace`; local cross-conversion auditions under `D:\AI\voice_auditions\rvc_singing_trials`. The first singer model required a one-time manual export from its saved `G_2333333.pth` checkpoint because the external RVC clone initially lacked `assets\weights`; the second model exported normally after that directory existed.
- Both local conversion smokes succeeded with the `pm` pitch method and their own indexes. First-model conversion measured feature/F0/synthesis at approximately `0.33/0.02/1.12s`; second-model conversion measured approximately `0.29/0.02/1.09s`. The first audition is 14.0 s, 40 kHz mono, and has no clipped samples.
- Qwen3-TTS and Electron remain stopped intentionally per the user’s latest resource-release direction. They were not replaced or reconfigured. The user should listen to the two audition WAVs before any further epoch training or runtime integration decision.

## Local Desktop Agent Foundation v1 (2026-07-28)

- Upgraded the existing LLM tool path into the first local desktop-Agent layer rather than importing a heavy full-agent runtime. This keeps current file/search/image/command compatibility and gives both typed and ASR-derived chat messages the same tool route when the provider supports function calling.
- Private runtime now enables the existing local tools and safe development-command allowlist. Added `open_url` (http/https only), `launch_app` (system-default local application/file/folder/URI opening), and `delete_path` (confirmation-only) adapters.
- A one-time, locally persisted approval record now gates file overwrite, deletion, high-risk system commands, and reserved future login/payment/external-submission actions. Confirmation IDs expire after 15 minutes, are single-use, and the backend records only a bounded local audit summary plus an argument digest.
- Chat tool cards show pending actions with Confirm/Cancel controls. The confirmation API remains protected by the existing loopback/token request guard.
- Verification: focused suite `139 passed`; full `scripts\test-local.ps1` passed with `590` Python tests, all Node frontend tests, Python syntax `130` files, JavaScript syntax `164` files, and secret scan `612` files. JSON validation and scoped whitespace checks passed.

## Xinyu Shared Experience Continuity v1 (2026-07-28)

- Added a small local `memory_shared_experiences.json` layer that only accepts concrete, episodic, shared milestones already extracted by the existing core-memory path. It does not add another LLM request, so local-model response latency is unchanged by this feature.
- Retrieval is relevant-by-default: regular replies receive a shared moment only when the current message overlaps it. Proactive turns can receive one recall at most once per configured 24-hour cooldown, with explicit prompt guidance to use it only when it creates a natural conversational opening.
- The layer rejects sensitive text, stage/control-like markup, malformed text, and duplicates. It remains bounded to 36 compact entries and is separate from raw transcript memory.
- The active private persona is now Chinese-primary and may use only a few natural English short words or tiny phrases; it no longer defaults to full English replies.
- Verification: focused suite `90 passed`; full `scripts\test-local.ps1` passed with `587` Python tests, all Node frontend tests, Python syntax `128` files, JavaScript syntax `164` files, and secret scan `610` files. JSON validation and scoped whitespace checks passed.

## Xinyu Meaningful Surprise Character v1 Implemented on 2026-07-28

- User feedback: the previous "古灵精怪" setting could answer a plain greeting with an unexplained line such as a keyboard judging the user's choices. The desired result is surprise and self-direction, not random opaque imagery or a fixed quirky routine.
- The active local `assistant_prompt` no longer directs unrelated association, deliberate topic loss, blindly defended errors, or forced incompleteness. It now permits independent observations, small ideas, and clearly framed news-like thoughts only when they have a comprehensible premise, meaning, and conversational opening.
- The default prompt and model-direct policy now use the same direction. They explicitly reject empty surrealism, invented current news, and forcing cursor/keyboard/pixel/process imagery merely to sound quirky.
- `character_brain.py` no longer assigns desktop performance bits to a plain greeting or ordinary non-desktop message. Relevant desktop conversations can still use that flavor; ordinary turns retain model-owned freedom instead of receiving a mechanical replacement template.
- Verification passes: focused `100` personality/config/contract tests, then full `scripts\test-local.ps1` with `584` Python tests, all Node frontend tests, Python syntax across `126` files, JavaScript syntax across `164` files, and secret scan across `608` files. The only warning is the existing third-party pydub `audioop` deprecation.
- The private active prompt changed only in ignored `config.local.json`; it was not staged, committed, or pushed. Preserve unrelated dirty work and every `.bak` file.

## Xinyu A2 Original Bilingual VoiceDesign v1 Implemented on 2026-07-28

- The user accepted the A2 Chinese voice and especially its English rendering: a clear, milk-sweet, deliberately anime-stylized child voice perceived around six to eight years old, only slightly more mature than the earlier A audition and with a small increase in sunny energy.
- Fresh Qwen3-TTS configuration, setup, frontend presets, and the start script now select `Qwen/Qwen3-TTS-12Hz-1.7B-VoiceDesign` with the stable display identity `A2_Original`.
- `scripts/qwen3_tts_server.py` automatically resolves `voice_design` versus legacy `custom_voice`. VoiceDesign uses `generate_voice_design_streaming`; an explicitly loaded CustomVoice model keeps `generate_custom_voice_streaming`, its supported speaker selection, and the `Ono_Anna` default.
- The A2 instruction is project-owned and bounded. Request emotion, style, voice, and arbitrary language text cannot become a free-form model prompt. Single-language Chinese and English are inferred from reply text so the live service uses the same language-specific pronunciation direction as the accepted auditions; mixed and other supported languages degrade to controlled `Auto` or canonical model language values.
- Runtime smoke evidence on the 8 GB RTX 5060 Laptop GPU: health reports `voice_mode=voice_design`, `speaker=A2_Original`, and CUDA streaming. Cold Chinese first audio was about `3146 ms`; after warmup Chinese was about `359 ms` and English about `282 ms`. Local Whisper recovered all Chinese and English smoke text, and the three WAVs had zero clipped samples.
- Audition and smoke artifacts remain outside the repository under `D:\AI\voice_auditions\voice_design_original_v13` and `D:\AI\voice_auditions\voice_design_integration_smoke`. Model weights remain outside the repository under `D:\AI\models`.
- Verification passes: focused `76` Python TTS/config tests plus Qwen, config-switch, stream-queue, and playback-start frontend checks; full `scripts\test-local.ps1` passed with `582` Python tests, all Node frontend tests, Python syntax across `126` files, JavaScript syntax across `164` files, and secret scan across `608` files. The only warning is the existing third-party pydub `audioop` deprecation.
- Preserve every `.bak` file and unrelated dirty change. Nothing was committed or pushed.

## Semantic Emotive Voice and Live2D Performance Sync v1 Implemented on 2026-07-27

- Accepted target: a playful, cute, energetic anime companion whose audible emotion and Hiyori body response follow the meaning of each sentence. Subtle head/body motion may remain continuous while speaking; strong actions are reserved for semantic highlights and remain cooldown-bound.
- `companion_performance_director.py` and `companion_turn_contract.py` now add a backward-compatible `performance_segments_version=1` contract. Happy, playful, excited, shy, hurt, sad, anxious, angry, surprised, serious, thinking, and neutral are inferred per visible sentence; no tag is inserted into reply text.
- The actual TTS queue no longer erases prosody when serializing GPU-backed requests. Each segment carries allowlisted emotion/intensity/voice style through `/api/tts`, Qwen/GPT synthesis, and its real audible playback callback. A prewarmed prefix is reused only when both canonical text and semantic delivery signature match.
- Qwen3-TTS 1.7B CustomVoice receives a fixed-vocabulary delivery instruction for the selected emotion, style, intensity, and pace. Arbitrary prompt text is never accepted. Explicit 0.6B configurations remain compatible and safely omit the unsupported instruction.
- Hiyori uses only verified expressions, motion groups, and parameters. New excited, shy, hurt, and serious poses are parameter-level variants over existing resources. Its semantic director owns strong actions and cooldown rejection, preventing a second generic Cubism motion or talk gesture from stacking on the same audible segment.
- No new animation loop was introduced. Existing render sampling drives continuous speech motion; stale sessions, cancellation, missing expressions/actions, non-Hiyori models, Browser TTS, and GPT-SoVITS retain safe fallback paths.
- Complete verification passes: `scripts\test-local.ps1` reports `573` Python tests, all Node frontend tests, Python syntax across `126` files, JavaScript syntax across `163` files, and secret scan across `607` files. The only warning is the existing third-party pydub `audioop` deprecation.
- Runtime activation: the cached 0.6B Qwen service is healthy on `127.0.0.1:9881` with CUDA streaming and `emotion_instruction=false`. The roughly 4.2 GB 1.7B CustomVoice weights are downloading in the background from ModelScope to `D:\AI\models\Qwen3-TTS-12Hz-1.7B-CustomVoice`; restart the service on that local model after completion to enable audible instruction control.
- Manual Electron confirmation remains necessary for voice quality, first-audio latency, expression readability, action frequency, and whether cross-sentence transitions feel playful without becoming distracting. Existing unrelated dirty work and every `.bak` file remain untouched; nothing was committed or pushed.

## Punctuation-Only ASR Guard v1 Completed on 2026-07-27

- Field report: with the microphone open and no intentional speech, SenseVoice returned one full-width Chinese period (`。`). The renderer accepted it as a substantive user turn, created a one-character card, and sent it to the LLM.
- Runtime evidence confirms the empty-audio hallucination path: `/api/asr_pcm` returned `text_chars=1`, followed by `/api/chat_stream` with `user_chars=1`.
- Root cause: the ASR frontend rejected only empty/whitespace strings. Live-turn classification ran before any semantic-content check, so punctuation alone could also interrupt an active thinking/speaking turn.
- `web/localAsrController.js` now requires at least one Unicode letter or number after cleanup. Punctuation-only output is dropped before semantic classification, interruption, pending merge, and microphone queue insertion, with a local `punctuation_only` debug reason.
- The guard is intentionally language-neutral: Chinese and other Unicode letters, Latin text, and numbers remain valid. Hidden paralinguistic metadata continues through its existing separate path.
- Focused local ASR, bilingual ASR, no-barge queue, and free-chat regressions pass. The complete `scripts\test-local.ps1` gate passes with `563` Python tests, all Node frontend tests, Python syntax across `125` files, JavaScript syntax across `163` files, and secret scan across `606` files. The only warning is the existing third-party pydub `audioop` deprecation.
- Existing unrelated dirty work and every `.bak` file remain untouched; nothing is committed or pushed.

## Ordered Continuation Ownership Regression Fixed on 2026-07-27

- Field evidence: two consecutive spoken sentences produced three independent assistant cards. When a newer card began generating, the first card lost its progressive reveal and never spoke; a third card then stopped the second card midway and took over TTS.
- Runtime evidence matched the report: three `/api/chat_stream` requests began within seconds, and the first two ended with `ConnectionAbortedError` after later turns replaced them. Qwen streaming itself opened and returned first chunks normally.
- Root cause: `requestAssistantReply()` accepted the ASR turn manager's explicit `preservePriorSpeech` marker only while `isAssistantSpeechActive()` happened to be true. During LLM-only thinking and tiny inter-segment silence it downgraded the continuation to an interrupting request. Initialization also called `stopAllAudioPlayback()` whenever that same instantaneous check looked idle, invalidating the older TTS generation.
- `web/chatReplyController.js` now treats the explicit ordered-continuation marker as delivery-chain ownership. It remains valid through thinking, queued synthesis, inter-segment silence, and active playback. Only non-preserved requests may execute the global stop path.
- Regression coverage now proves both boundaries: a continuation waits while prior audio is active, and the same marker cannot stop/invalidate the chain when the instantaneous renderer state is idle. Local ASR, stream delivery, cancellation, and stage tests remain green.
- The complete `scripts\test-local.ps1` gate passes with `563` Python tests, all Node frontend tests, Python syntax across `125` files, JavaScript syntax across `163` files, and secret scan across `606` files. The only warning is the existing third-party pydub `audioop` deprecation. Existing unrelated dirty work and `.bak` files remain untouched; nothing is committed or pushed.

## Speech Delivery Coherence v1 Completed on 2026-07-27

- Accepted target: optimize the three coupled issues together before separate voice/timbre work—natural pauses between consecutive replies, subtitle/audio alignment with text leading by `200-500 ms`, and a cute/lively but restrained delivery.
- Root cause: WebAudio already scheduled PCM against an exact clock, while the chat card only received a one-shot playback-start event. Continuation text therefore used a fixed CSS character estimate. Cross-reply ordering also began the next prewarmed clip immediately at the old audio boundary, and companion prewarm discarded the selected prosody.
- `web/ttsPcmStream.js` and `web/ttsPlaybackController.js` now expose safe playback progress from incremental PCM, HTML Audio `currentTime`, and decoded AudioContext fallback. Events are generation/session fenced and optional, so older callers remain compatible.
- Ordered continuation text now starts empty at actual playback, then reveals from the measured clock with a `350 ms` visual lead. The full canonical reply is restored only when speech delivery settles.
- The transition after prior audio uses a cancellable `80-280 ms` breathing beat derived from prior punctuation and current delivery style. Questions, ellipses, and soft delivery breathe longer; playful/exclamatory delivery stays tighter.
- Companion prewarm now retains the selected stable-prefix prosody. This improves tone continuity without inserting fake fillers, changing model wording, or pretending Qwen supports a separate pitch control when the current adapter primarily applies speed.
- Focused PCM-stream, stream-queue, playback-start, companion-turn, stage, Qwen, and speech-text tests pass. The complete `scripts\test-local.ps1` gate also passes with `563` Python tests, all Node frontend tests, Python syntax across `125` files, JavaScript syntax across `163` files, and secret scan across `606` files. The only warning is the existing third-party pydub `audioop` deprecation.
- Existing unrelated dirty work and `.bak` files remain untouched; nothing is committed or pushed. Voice/timbre selection remains the next separate goal after field confirmation.

## Ordered Continuation Delivery v1 Completed on 2026-07-27

- Field report: after several continuous user phrases, two assistant replies could be created, but the newer TTS session invalidated the first reply's queued audio. The first text appeared instantly, its speech was skipped, and only the newer reply was heard.
- Accepted rule: ordinary continuation replies must both play in order; only explicit stop/correction content may cancel older unplayed speech. Continuation wording and delivery should sound connected, and its text should reveal slightly ahead of its own audio rather than appearing as an instant paragraph.
- `web/localAsrController.js` now preserves the finalized semantic kind and whether the utterance began during assistant activity. Substantive continuation work waits only for the prior LLM turn to release `chatBusy`, then starts the next model request without interrupting active audio. Stop/correction behavior is unchanged.
- `web/chatReplyController.js` leaves the current TTS session intact for ordered continuation work, generates the next reply concurrently with prior playback, starts the existing companion/Qwen prewarm path, waits for the actual speech boundary, and only then atomically activates the new session. A 45-second safety boundary can force handoff only for a stuck playback state.
- Waiting continuation text is visually hidden. At actual playback start it replays through the existing streamed-character renderer; character delays now cover large single deltas, and finalization no longer immediately flattens a still-animating stream.
- Focused local-ASR, companion-turn, stage, stream-queue, delivery-completeness, and character-runtime tests pass.
- Compatibility evidence: ordinary first-turn model-direct Qwen replies still start from streamed text without waiting for the final companion envelope. Only an explicitly marked ordered continuation uses the prior-audio boundary.
- Complete verification passed: `scripts\test-local.ps1` reports `563` Python tests, all Node frontend tests, Python syntax `125`, JavaScript syntax `163`, and secret scan `606`. The only warning is the existing third-party pydub `audioop` deprecation.

## Natural Conversation Handoff v1 Completed on 2026-07-27

- Accepted behavior: keep separate messages but soften their visual separation; preserve already displayed assistant text with an ellipsis when interrupted; choose among immediate yield, bounded key-sentence completion, hidden acknowledgement, integration, or topic change from the content rather than one absolute rule.
- Root cause: the cancellation catch removed every unfinished assistant row. The old TTS queue was correctly cancelled, but the visible/heard fragment never entered history, so the replacement turn looked and sounded like an unrelated answer.
- `web/chatReplyController.js` now synchronously finalizes a non-empty active draft before aborting stale LLM/TTS work, removes incomplete feedback controls, remembers the heard fragment, and prevents stale cleanup from deleting it. The next request receives both ordered history and sanitized interruption context.
- Confirmed corrections and stop commands yield immediately. Ordinary substantive speech uses the existing bounded key-sentence arbitration, while short acknowledgements remain hidden backchannels. The current LLM receives the fast local reply policy as a hint and decides whether to integrate, resume briefly, answer the latest point, or leave the old thought unfinished without repeating heard wording.
- `web/chatMessageController.js` and `web/stage.css` retain separate records but give an interruption/replacement pair a tighter, quieter visual relationship.
- Focused free-chat, companion-turn, local-ASR, stage, and backend conversation-context tests passed.
- Compatibility retained: older confirmed-speech callers without a semantic `kind` still interrupt immediately, while the current ASR path supplies typed decisions for content-aware arbitration. The existing “answer the latest user message first when it needs a direct response” prompt contract remains intact.
- Complete verification passed: `scripts\test-local.ps1` reports `563` Python tests, all Node frontend tests, Python syntax `125`, JavaScript syntax `163`, and secret scan `606`. The only warning is the existing third-party pydub `audioop` deprecation.

## Thinking-Phase Continuous Listening v1 Completed on 2026-07-27

- Field evidence showed that opening the microphone during the assistant's thinking phase produced no new turn even though semantic full-duplex support was already implemented.
- Root cause: the ignored active `config.local.json` profile had `conversation_mode.interrupt_tts_on_user_speech=false`. `sendAssistantTurn()` therefore acquired a microphone pause lease as soon as `chatBusy` began, before any reply text or audio existed.
- The active private profile now enables the existing backward-compatible full-duplex setting. While thinking or speaking, short acknowledgements remain hidden backchannels; a semantically confirmed correction, stop command, or substantive phrase cancels stale LLM/TTS work and becomes the replacement turn.
- The frontend regression now explicitly runs with `chatBusy=true` and proves that the thinking phase neither increments the microphone suspension depth nor stops recognition. Legacy configurations that explicitly keep the setting disabled retain their deferred no-barge queue.
- Verification: focused local-ASR, free-chat, bilingual-ASR, and stream-TTS tests passed. `scripts\test-local.ps1` passed with `563` Python tests, all Node frontend tests, Python syntax `125`, JavaScript syntax `163`, and secret scan `606`; the only warning is the existing third-party pydub `audioop` deprecation.

## Voice-First Reply Latency v1 Started on 2026-07-27

- The accepted target is transcription-to-first-text/first-audio in roughly `1–2 s`, with text streaming continuously and staying only slightly ahead of speech.
- Runtime evidence places the dominant delay upstream: SenseVoice completed recent turns in about `135–567 ms` and Qwen first audio chunks in about `234–902 ms`, while the configured `claude-haiku-4-5-A` relay took about `5.9–10.5 s` to emit its first text delta.
- A controlled probe returned about `2.37 s` for a minimal prompt and `3.2–5.0 s` for the full prompt, proving that frontend animation alone cannot meet the target. Alternate routes on the same relay were unavailable, empty, or budget-blocked, so the private chat model was not changed silently.
- An opt-in voice-only prompt profile now keeps identity, relationship, continuity, safety, interruption, and reply-shape guidance while compacting duplicate dialogue/director metadata and limiting recent history to four items. The measured prompt fell from roughly `6997` characters with no history to `4054` characters with four recent items; one real compact probe reached first text in `2498 ms`.
- Assistant deltas now append character arrivals instead of repainting the entire message. A restrained rose caret communicates active streaming; day/night materials remain unchanged and reduced-motion disables the animations.
- Qwen still receives only stable speakable boundaries through the existing generation/session-fenced queue. No synthetic waiting phrase was added because it can race, interrupt, or duplicate the real reply.
- Focused validation passed (`172` Python tests plus stage, companion-turn, and Qwen frontend checks). The complete `scripts\test-local.ps1` gate passed with `563` Python tests, all Node frontend tests, Python syntax `125`, JavaScript syntax `163`, and secret scan `606`; the only warning is the existing third-party pydub `audioop` deprecation.
- One restarted Electron field timing and visual check remains. Existing unrelated dirty changes and all `.bak` files remain untouched; nothing is committed or pushed.

## Persistent SenseVoice Service v1 Completed on 2026-07-27

- Field evidence isolated the missing-transcript report to cold final recognition: the backend received valid roughly 2.2-second PCM and produced text, but the first two requests took about 60 and 37 seconds while SenseVoice initialized. Once warm, the user's real microphone transcript appeared in about one second.
- Final SenseVoice now runs as a managed, loopback-only persistent service on `127.0.0.1:9890`. It uses the official `funasr-onnx` SenseVoiceSmall INT8 path in an isolated `D:\AI\sensevoice_runtime` environment and remains warm when Electron restarts.
- While the service is starting or unavailable, the request immediately retains the existing Vosk fallback instead of cold-loading a second PyTorch model inside the desktop backend. Explicitly disabling the service preserves the legacy in-process behavior.
- Real adapter evidence: a cached English reference completed in `394 ms` after warmup. ONNX service working/private memory was approximately `553 MB / 1.26 GB`, compared with approximately `5.15 GB` private memory for the rejected persistent PyTorch experiment.
- The service accepts only bounded PCM JSON on loopback, serializes inference, never stores microphone audio, and does not expose its URL or model path in the client config. Model weights and the isolated runtime remain outside the repository.
- Focused ASR/config/health/service tests passed (`79 passed`). The complete `scripts\test-local.ps1` gate passed with `559` Python tests, all Node frontend tests, Python syntax across `125` files, JavaScript syntax across `163` files, and secret scan across `606` files. The only warning is the existing third-party pydub `audioop` deprecation.
- Existing unrelated dirty changes and all `.bak` files remain untouched; nothing is committed or pushed.

## Semantic Full-Duplex Voice v1 Completed on 2026-07-26

- The accepted interaction rule is GPT Live-like continuous listening with semantic interruption: short acknowledgements such as “嗯嗯/哦/啊” remain hidden and do not stop the assistant, while substantive speech, corrections, negation, and stop commands cancel the current LLM/TTS turn.
- Consecutive user phrases must be retained in order and merged rather than replacing an earlier phrase that is still transcribing or waiting for a response.
- Root cause fixed: local VAD previously called `handleUserSpeechStart()` on the first speech frame, so every vocal sound stopped the assistant before ASR could determine its meaning. Speech start now records only a candidate; final transcript classification decides whether to interrupt.
- `web/localAsrController.js` classifies compact Chinese/English backchannels, stop commands, corrections, and substantive speech. Backchannels are kept as recent hidden paralinguistic context. Confirmed interruptions use the existing abortable chat/TTS boundary, extend a bounded full-duplex burst, hold a pending transcript while new speech is active, and flush consecutive finalized phrases in order through one assistant request.
- `web/chatReplyController.js` now distinguishes an unconfirmed speech candidate from a semantically confirmed interruption. Only the confirmed path bypasses protected-sentence delay and immediately cancels the stale chat stream and audio.
- Focused local ASR, free-chat, character runtime, no-barge-in queue, bilingual ASR, stream TTS, and server TTS cancellation tests pass. The complete `scripts\test-local.ps1` gate passes with 550 Python tests, all Node frontend tests, 121 Python syntax files, 162 JavaScript syntax files, and 597 secret-scan files. The single warning remains the third-party pydub `audioop` deprecation.
- Electron was restarted after validation. The authenticated ASR status endpoint reached `provider=auto`, `status=ready`, and `required=false`, so the new semantic full-duplex controller and the warmed SenseVoice provider are active in the running desktop pet.

## Hidden Paralinguistic Understanding v1 Completed on 2026-07-26

- The user selected hidden-only handling for nonsemantic voice cues: humming, fillers, laughter, sigh-like vocalizations, and detected tone must inform the LLM without creating synthetic user chat cards or entering visible conversation memory.
- GitHub research found the smallest compatible path in the already-integrated SenseVoice stack rather than replacing the Electron voice architecture. SenseVoice provides ASR, speech emotion, and acoustic-event tags; emotion2vec remains a possible later classifier, while SoulX-Duplug and FireRedChat are references for the separate full-duplex phase.
- Root cause fixed: `local_asr_provider.py` previously passed SenseVoice output through rich transcription cleanup and discarded language, emotion, and event tags. The provider now returns a sanitized paralinguistic object and uses bounded voiced-ratio/pitch-stability analysis to distinguish stable nonverbal audio from ordinary semantic text.
- Subtitle-template hallucinations and very short text conflicting with stable voiced non-speech events are suppressed. `app_asr_route.py`, `web/localAsrController.js`, `web/chatReplyController.js`, and `app_chat_context.py` carry only allowlisted metadata into a private one-turn prompt. Pure nonverbal turns use a hidden placeholder internally with `showUser=false` and `rememberUser=false`.
- The installed FunASR 1.0.27 did not satisfy the existing `requirements-asr.txt` constraint and could not instantiate the cached `SenseVoiceSmall` class. The local environment was upgraded to FunASR 1.3.29. Cached model directories are now resolved directly to avoid repeated hub lookup latency.
- A deterministic 1.6-second humming-like smoke sample previously yielded a false short transcript plus a BGM tag. After the filter it yields empty visible text and hidden `nonverbal_vocalization` context. Cold import/model initialization took about 14.7 seconds, so non-Vosk profiles now warm SenseVoice on a daemon while the rest of the app remains usable; hot model inference for that sample was about 0.36 seconds.
- Electron was restarted with the ignored local override corrected to `provider=auto` and final refinement enabled. `/api/asr/status` reached `ready` without making warmup a microphone-blocking requirement. A real authenticated `/api/asr_pcm` request for the same synthetic hum completed in 0.466 seconds with `provider=sensevoice`, empty visible text, and the expected hidden nonverbal metadata.
- Focused provider, ASR route, chat-context, frontend, and JavaScript syntax tests pass. The complete `scripts\test-local.ps1` gate passes with 550 Python tests, all Node frontend tests, 121 Python syntax files, 162 JavaScript syntax files, and 597 secret-scan files. The single warning is a third-party Python 3.13 `audioop` deprecation from pydub.

## Voice Runtime Latency and Fallback Recovery v1 Field Retest in Progress on 2026-07-26

- The latest field report confirmed that the icon-only microphone exposed neither the readiness label nor the header-owned meter, while two `/api/asr_pcm` requests returned HTTP 200 with empty text. The main composer now owns an independent visible voice-status pill and level bar, including explicit initialization, listening, muted, recognizing, and empty-result states.
- The meter visualization now uses a sensitive low-floor signal range, and empty recognition can no longer disappear silently. The backend logs only numeric `audio_ms`, RMS, peak, provider, text length, and elapsed time for each final request; raw audio is never logged or persisted.
- The machine already had a loopback-only faster-whisper service on `127.0.0.1:9889`. An opt-in, backward-compatible fallback now invokes it only when Vosk returns empty or fails. Non-loopback URLs are rejected, the user's ignored local config enables this fallback, and the already-running `small` CPU model was warmed once in 8.9 seconds so Electron restarts do not reload it.
- The complete `scripts\test-local.ps1` gate passes with 546 Python tests, all Node frontend tests, 121 Python syntax files, 162 JavaScript syntax files, and 597 secret-scan files. The 39 warnings remain existing third-party FunASR/PyTorch deprecations. One restarted real-microphone confirmation remains.
- After the single required Electron restart, read-only native visual QA confirmed the composer-owned “点击麦克风开始说话” label and level track are visible above the input without covering the composer or utility rail. The microphone was not activated during automated visual QA.
- A full-screen user screenshot then showed the composer child could still disappear at the user's scaled desktop size. The final visual layer now anchors `#stage-voice-feedback` directly to the viewport with an ID-specific visibility guarantee. Runtime feedback includes smoothed level percentage and the selected input label, and the watchdog publishes a visible “已开麦，但没有收到音频帧” error after 2.2 seconds instead of writing only to the responsive-hidden header status.
- Electron was restarted again for this correction; native visual QA confirmed the viewport-owned idle feedback is visible. The complete gate still passes with 546 Python tests, all Node frontend tests, 121 Python syntax files, 162 JavaScript syntax files, and 597 secret-scan files.
- Real microphone field confirmation succeeded: spoken Chinese produced visible transcription again. Per user feedback, the full-width idle level track was then replaced with a compact mic-open-only waveform capsule. Seven mint, lilac, sakura, and peach bars derive their individual heights from the existing smoothed live level; a small tabular percentage remains, processing uses a restrained pulse, and reduced-motion users receive static transitions.
- The compact-waveform follow-up passes the complete gate unchanged at 546 Python tests, all Node frontend tests, 121 Python syntax files, 162 JavaScript syntax files, and 597 secret-scan files. The design skill guided this as a targeted evolution with the existing sakura palette and no new UI dependency.
- The accepted startup UX no longer asks the user to estimate a 15-second delay. `/api/asr/status` exposes only safe warmup state, the main renderer polls it through the authenticated API client, and the microphone button shows a disabled “语音初始化中” state until Vosk reports ready. It then enables itself and publishes “语音已就绪” while chat, Live2D, and the rest of the app remain usable throughout.
- Readiness and button-state regressions are covered. The latest complete gate passes with 542 Python tests, all Node frontend tests, 121 Python syntax files, 162 JavaScript syntax files, and 597 secret-scan files.
- The user's restarted main Live2D stage still produced no visible transcript. Fresh runtime evidence showed that the stage stylesheet—not the chat theme—still hid `#mic-meter-wrap`, and the first final request spent about 18 seconds loading SenseVoice and then the Chinese Vosk model before returning HTTP 200.
- The main stage now presents a compact live level meter above the composer. Manual-close capture records per-frame RMS and trims long leading/trailing silence with bounded speech padding before final Vosk recognition, improving click-to-record reliability after waiting.
- The ignored local runtime now selects Vosk directly, disables FunASR final refinement, and lowers the private energy threshold to `0.0022`. Public provider defaults and explicit legacy settings remain unchanged. A daemon warmup loads configured Vosk models after the local server starts so the first spoken phrase does not pay the full cold-load cost.
- Focused ASR, stage, config, route, and provider tests pass. The full local gate passes with 541 Python tests, all Node frontend tests, 121 Python syntax files, 162 JavaScript syntax files, and 597 secret-scan files. Final completion remains gated on one restarted real-microphone check showing both meter movement and a transcript.
- Follow-up testing with the user's real microphone showed that capture and transcription worked, but the active kawaii theme hid the level meter and the 2.2-second safety cap split a natural sentence into multiple queued final requests. The theme no longer suppresses the meter, the new default sentence cap is 10 seconds, and the configured Silero release window is reduced from 720 ms to 420 ms.
- Existing explicit user values remain valid: the public configuration sanitizer now accepts 1–15 second sentence caps, while missing values receive the new natural-speech default. The user's ignored local profile opts into the 10-second cap and 420 ms release window.
- Reproduced the reported Electron failure and used native DevTools to identify the exact Silero cause: ONNX Runtime downloaded its model and WASM successfully, but renderer CSP blocked WebAssembly compilation. The renderer now grants only `'wasm-unsafe-eval'`; ordinary JavaScript `'unsafe-eval'` remains forbidden.
- Silero now initializes successfully in the running Electron app. Native verification showed the microphone entering “开麦已开启（通话模式）” without the unavailable warning, and the backend served the model, ORT WASM, and `vad.worklet.bundle.min.js` with HTTP 200.
- The Silero controller and ONNX model are reused across microphone reopen cycles. Failed initialization enters a two-minute cooldown, and a detector that finishes warming after speech starts cannot replace energy detection halfway through the active recording.
- Final PCM transcription now cancels queued Paraformer preview work. This removes the observed burst of dozens of stale `/api/asr_stream` requests and prevents preview inference from delaying the authoritative result. Intentional renderer cancellation no longer causes the backend to write a second response to a closed socket.
- Failed FunASR model initialization is negatively cached for a bounded interval, so Vosk fallback is immediate instead of repeatedly loading or checking the same model. The ignored private local profile disables the extra Paraformer preview model while retaining SenseVoice final refinement and Vosk fallback; public defaults remain streaming-capable and backward compatible.
- Complete validation passes after the field-feedback adjustment: 540 Python tests, all Node frontend tests, 121 Python syntax files, 162 JavaScript syntax files, and 597 secret-scan files. The 39 warnings are existing third-party FunASR/PyTorch deprecations. Automated native activation could not refresh the already-running Electron window because its captured handle rejected activation twice, so restart Electron before the next real-microphone timing check.

## Natural Companion and Voice Continuity v1 Completed on 2026-07-26

- Kept English as the default reply language while enabling the accepted low-interruption companion profile: a warm-up period, a 15-minute cooldown, at most one optional follow-up per window, and the existing user-facing runtime off switch.
- Added optional local Silero VAD through `@ricky0123/vad-web` and ONNX Runtime Web. It shares the current microphone stream, improves speech-boundary decisions, preserves manual-close transcription, and deterministically falls back to the existing energy detector plus FunASR/Vosk paths when disabled or unavailable.
- Exposed only an explicit allowlist of local VAD runtime files from the backend. The real static-resource probe returned 200 for the bundle, model, ORT loader, and selected WASM file, and 404 for an unknown WASM filename.
- GPT-SoVITS stream startup now retries the same provider and voice before any configured browser fallback. The existing turn/generation/segment delivery ledger continues to recover only the undelivered tail, preventing replay of accepted audio.
- Added configuration controls, troubleshooting guidance, third-party notices, and regression coverage. Legacy configurations retain their previous behavior because optional Silero VAD and proactive follow-up remain disabled unless configured; the preview profile and private local profile opt into the accepted behavior.
- Verification passes: `scripts\test-local.ps1` completed with 538 Python tests, all Node frontend tests, 121 Python syntax files, 162 JavaScript syntax files, and 597 secret-scan files. Package installation reports zero npm vulnerabilities. The 39 warnings are existing third-party FunASR/PyTorch deprecations.
- Remaining validation is perceptual rather than structural: restart Electron and test a real microphone plus the configured private GPT-SoVITS service. The selected ONNX WASM is about 13.5 MB and the Silero model about 2.3 MB; threshold or redemption tuning should follow recorded field evidence.

## Desktop Pet Presence Anchor Follow Completed on 2026-07-20

- Fixed the model-only desktop view's presence badge, which previously published only an initial horizontal coordinate and remained pinned to `bottom: 24px` while the Live2D model moved.
- Added one renderer-to-screen anchor conversion that publishes both `--pet-presence-x` and `--pet-presence-y`. Initial placement, viewport clamping, Electron document-level dragging, browser dragging, and PIXI pointer dragging now share that update path.
- The badge is positioned 10 px below the model's foot anchor with viewport-edge clamping. Its dimensions are CSS-owned and never inherit the model scale, so wheel zoom changes only Live2D.
- Focused drag verification now includes coordinate conversion at a 2:1 renderer/CSS ratio and proves the model scale remains unchanged. Drag, stage, and Live2D render-performance tests pass.
- The complete local gate passes with 533 Python tests, all Node frontend tests, 120 Python syntax files, 160 JavaScript syntax files, and 594 secret-scan files; 40 third-party deprecation warnings remain non-failing.

## Independent History Lanes and Compact Header Completed on 2026-07-20

- Reduced the large desktop stage breakpoint from an 88 px application header to a calmer 76 px rail. Brand, presence, translation, theme, voice, and subtitle controls keep their existing information architecture while using tighter optical proportions.
- Split the full-stage history surface into dedicated user and assistant lanes. Each lane owns its vertical overflow, contains wheel propagation, reveals a restrained scrollbar only on interaction, and leaves the center Live2D area non-interactive to the history layer.
- Preserved the standalone chat window's chronological single-log behavior and all existing storage records. Text, sticker, image, and attachment message rows retain the same timestamp node; the final visual layer now pins it visibly to the card's upper-right corner in day and night themes.
- In-app browser verification at 1280 x 720 measured a 76 px header, two 345.6 px outer history lanes, no page overflow, and visible absolute-positioned timestamps. A real wheel gesture over the left lane moved it to `scrollTop=192.7` while the assistant lane and page remained at zero; collapse/expand and standalone-chat fallback also passed.
- Focused stage, sticker, and message-controller checks pass. The complete Node suite and `scripts\test-local.ps1` also pass with 533 Python tests, 120 Python syntax files, 160 JavaScript syntax files, and 594 secret-scan files; the 40 warnings remain third-party deprecations.

## Selected Day Theme Sun Icon Completed on 2026-07-20

- Fixed the final icon-layer selector that hid every theme glyph except the selected night state. The selected day state now reveals the existing local Phosphor `sun.svg` without changing theme behavior or adding a runtime asset.
- The sun renders as a centered 17 px white glyph with a restrained berry shadow inside the existing pink selected segment. Automatic mode remains text-only and the existing selected-night moon treatment is unchanged.
- In-app browser verification covered the real day -> night -> day path. The selected day button reported `aria-pressed=true`, a visible 17 x 17 sun, a 6 px icon-label gap, an 83.25 px segment, and zero horizontal page overflow.
- `tests/test_stage_frontend.js` now guards both the local sun asset and its selected-day visibility selector. The focused tests, complete Node suite, and `scripts\test-local.ps1` pass with 533 Python tests, 120 Python syntax files, 160 JavaScript syntax files, and 594 secret-scan files. Restart Electron before native review so the renderer reloads the final stylesheet.

## More Launcher Readability Refinement Completed on 2026-07-20

- Fixed the More launcher's critical contrast bug: enabled actions no longer inherit dark control-center ink on the dark berry panel. Their computed text color is now `rgb(249, 229, 238)` at 14 px / 650 weight instead of `rgb(62, 53, 66)` at 12 px / 400.
- Raised group-title contrast and line height, brightened the local SVG icons, increased action height to 56 px, and added restrained hover/focus feedback without changing labels, order, or behavior.
- Real desktop-only disabled actions remain readable at a deliberately reduced contrast while active controls and their switches retain full emphasis. The launcher expanded from 500 to 560 px on desktop for cleaner wrapping and collapses to one grouped column at 390 px.
- In-app browser verification covered the 900 x 700 desktop launcher and 390 x 844 mobile launcher with zero horizontal overflow. The real More → Schedule → Close path worked, and the complete Node frontend suite passes.

## Voice Composer Proportion Refinement Completed on 2026-07-20

- Preserved the existing sakura anime-livestream direction while reducing the large-screen composer from 1020 x 90 to 960 x 74. The microphone, input field, and send action now share a 54 px optical axis with an 8 px rhythm.
- Removed the microphone's redundant inner ring, reduced its SVG to 24 px, softened the closed state into a quiet white-and-berry day treatment and dark rose night treatment, and retained the unmistakable illuminated pink live state.
- The input surface uses a calmer border and focus ring, 32 px embedded attachment/sticker actions, and readable system typography. The send action is 94 x 54 with a restrained lift instead of competing with the input field.
- Browser verification covered 1920 x 1280 day/night and 390 x 844 day layouts. Desktop measurements matched the intended 960/74, 54, 775/54, and 94/54 geometry; mobile measured 362 x 64 with no horizontal overflow. Input focus and typing remained functional.
- Stage, theme, control-center, complete Node frontend, secret-scan, JSON, and `git diff --check` validation pass. The user must restart Electron to load the final CSS layer.

## Desktop SVG State, Sticker Containment, and Utility Clearance Completed on 2026-07-20

- Replaced the microphone's generated mask presentation with two real local SVG elements: `microphone-slash.svg` for closed and `microphone.svg` for open. The ASR controller now updates an accessible hidden label without deleting those SVG children; the live state retains a clear pink neon glow while the closed state is muted and unlit.
- Added reusable MIT-licensed Tabler cat artwork and expanded the local Phosphor subset for moon-and-stars, sun, info, music notes, lotus, star, heart, and related motifs. The desktop header ears, brand badge, conversation identity, and stage decorations now use those real SVG files instead of CSS-drawn characters.
- The first native desktop pass reduced the composer to a 1020 x 90 shell with a 64 px microphone, 62 px input, and 104 x 62 send action; the later voice-composer refinement above supersedes those dimensions. The 330 x 59 utility capsule remains anchored at the lower right.
- Sent sticker messages now opt out of flex shrinking, use a compact content-sized card, constrain the illustration to the card, and scroll normally with history. The desktop conversation rail ends above the utility capsule rather than continuing underneath it.
- Browser verification at 1694 x 945 used the real sticker picker and sent the built-in “惊讶” sticker. The resulting card measured 253 x 274 around a 224 x 224 image; containment was true, utility overlap was false, the rail-to-utility gap was 11 px, and horizontal body overflow was zero. Per user direction, no mobile visual pass was performed in this follow-up.
- Verification passes: nine focused desktop/frontend checks, the complete Node suite, and `scripts\test-local.ps1` with 533 Python tests, 120 Python syntax files, 160 JavaScript syntax files, and 594 secret-scan files. Four JSON files, the required ten Python modules, 44 SVG files, and `git diff --check` also validate successfully; 40 dependency deprecation warnings remain non-failing.

## Reusable Rounded SVG Icons and Reference-fidelity Pass Completed on 2026-07-20

- Selected the official MIT-licensed Phosphor regular icon family and bundled 35 reusable SVGs plus its license under `web/assets/icons/phosphor`. The app consumes them as local CSS masks, so night, day, hover, disabled, and selected states share the same assets without runtime network requests.
- Replaced mixed characters and one-off masks across the microphone, speech, captions, translation, attachment, sticker, send, desktop-pet, guide, more menu, five common feature entries, control-center navigation, section headings, advanced settings, refresh, save, edit, import, and related actions.
- Fixed the reported microphone defect. The two misplaced composer cat ears were removed, the overlarge lavender day-mode ring was eliminated, the SVG is now centered at 36 px inside the native 76 px button, and full-stage and standalone-chat views explicitly share the same microphone asset.
- At the accepted 1694 x 945 concept size, the header is 88 px, the message card is 456 x 118 px, the composer is 1040 x 104 px, and the 330 x 63 px utility rail sits directly above it. Browser measurements confirmed zero horizontal or vertical body overflow.
- Browser verification covered native-aspect day and night stages, 1280 x 720 desktop, 390 x 844 mobile, 900 x 800 standalone chat, the More launcher, and the model/voice control center. The active settings icon no longer disturbs the text grid and close controls render only one mark.
- Focused stage, theme, control-center, config-switch, and character-runtime tests pass. The complete local gate also passes: 533 Python tests, all Node frontend tests, 120 Python syntax files, 160 JavaScript syntax files, and 593 secret-scan files; 40 third-party deprecation warnings remain non-failing.

## Hybrid Local Realtime ASR v1 Completed on 2026-07-19

- Follow-up repair on 2026-07-20: click-to-record now retains a bounded 30-second manual capture independently of VAD. If the user clicks once to start and again to stop before any automatic transcript was accepted, the complete capture is force-transcribed; a session that already produced a transcript is not submitted twice.
- Added an optional local FunASR pipeline that uses Paraformer for ordered streaming previews while speech is in progress, then refines the completed utterance with SenseVoiceSmall before it enters the existing hotword, confidence, merge, interruption, and chat flow.
- Streaming previews are session-bounded and non-destructive: they never replace text the user typed manually, stale sessions cannot overwrite a newer utterance, and short/cancelled microphone turns release their server session.
- Startup and microphone availability do not depend on FunASR. Missing packages, unavailable models, device errors, and stream failures fall back to the existing Vosk recognizer without exposing model paths or accepting provider overrides from the renderer.
- Added safe ASR capability diagnostics, example configuration, a private Windows setup script, model preloading, and troubleshooting guidance. Model weights stay in the local model cache and are not part of the repository.
- Verification passes: 533 Python tests, all Node frontend tests, Python syntax for 120 files, JavaScript syntax for 160 files, secret scan for 593 files, and `git diff --check`.
- Local activation note: the existing Electron `.venv` does not yet contain PyTorch/FunASR because the CUDA wheel download exceeded the execution window. Until `scripts\setup-local-asr.ps1 -Device cuda` completes, Electron transparently continues using Vosk.

## Cute Anime Livestream Visual System Completed on 2026-07-19

- Produced and accepted a native-aspect visual concept, then implemented its cat-ear waveform identity, sakura and berry palette, soft cream surfaces, lilac and mint accents, and restrained heart, star, and music motifs across the stage, standalone chat, launcher, and control center.
- Added a 19 KB offline WOFF2 subset of ZCOOL KuaiLe under the local family name `Xinyu Kawaii Display`, with the OFL license stored beside the font assets. Expressive text uses the display face while messages, controls, and technical content retain readable system fonts.
- Preserved the real Live2D and room assets, centered character placement, existing actions and data bindings, day/night modes, progressive disclosure, configuration compatibility, and technical-message history isolation. Decorative movement remains CSS-only and respects reduced-motion preferences.
- Browser fidelity checks covered 1694 x 945 day and night stages, the 900 x 800 standalone chat, the 390 x 844 stage, and the 390 x 844 control center. Fixes included composer proportions, launcher clearance around the character, day-mode contrast, compact mobile branding, horizontal navigation reachability, and automatic reveal of the selected control-center destination.
- Focused frontend tests and the complete local gate pass: 533 Python tests, all Node frontend tests, 120 Python syntax files, 160 JavaScript syntax files, and 590 secret-scan files. The complete gate reported 40 non-failing third-party deprecation warnings.

## Control Center Continuity and Core-task Focus Completed on 2026-07-19

- Added a theme-aware control-center backplane and two-frame page handoff. Navigation now updates its selected state immediately while the next page opens over a stable shell, preventing the Live2D stage from flashing through during modal and drawer transitions.
- Extended progressive disclosure across all five pages. Schedule execution type, persona interests and relationship details, model and voice technical fields, memory filters/batch/debug/undo tools, and raw diagnostic reports stay available but no longer compete with the ordinary user's first task.
- Refined navigation selection, header type scale, line height, card radius, spacing, mobile overflow, and day/night contrast. The narrow layout keeps title controls and primary footer actions on one row and hides the native horizontal scrollbar while retaining scroll navigation.
- Browser verification passed for day, night, and 390 x 844 layouts with no body or dialog horizontal overflow; all five pages were switched and inspected. Native Electron preserved centered Live2D and switched continuously from model/voice to diagnostics without exposing the stage. The already-running Electron renderer could not hot-load this patch, so final progressive-disclosure styling was verified in the reloaded browser surface.
- Focused control-center, config-switch, character-runtime, and stage tests pass. The complete local gate also passes: 524 Python tests, all Node frontend tests, 117 Python syntax files, 160 JavaScript syntax files, and 582 secret-scan files.

## Hiyori Motion Ownership and Stage Detail Refinement Implemented on 2026-07-19

- Root cause selected from code evidence: Hiyori's new director was smooth in isolation, but the legacy speech/body layer still added full head, torso, and shoulder amplitudes in the same core-model update. Mode and speech smoothing also advanced by a forced minimum frame step, so duplicate samples or high-refresh displays could move faster than real time.
- Motion fix: director blending now advances strictly from elapsed wall time; listen/think/speak, emotion, and speech-drive transitions use slower independent attack/release curves; duplicate timestamps do not advance state; 60 Hz and 120 Hz simulations converge.
- Ownership fix: the legacy Hiyori body contribution now eases down to 16% during semantic gestures, 22% during speech, 30% during listen/think, and 58% at idle. The director and listening layers restore full gain afterward, while facial, hair, mouth, native Cubism motion, unsupported-model fallback, and renderer cadence remain unchanged.
- UI refinement: history cards use tighter 10 px rhythm, reduced padding and hover travel; the voice composer now uses a 58/1fr/90 hierarchy; the microphone glyph is optically centered at 20 px; send uses a calmer solid surface; medium-width utility controls move above the composer at 1400 px to prevent overlap.
- Focused Hiyori, character-runtime, render-performance, stage, theme, and diff checks pass. The complete local gate also passes: 524 Python tests, all Node frontend tests, 117 Python syntax files, 158 JavaScript syntax files, and 579 secret-scan files. Native visual acceptance remains pending because the user requested screenshot-driven review instead of computer control.

## Live2D Wheel Hit-area Precision and State-document Recovery Completed on 2026-07-18

- Model scaling now starts only when the wheel pointer is inside the existing conservative visible-character hotzone. The stage canvas may still span behind the conversation rail, but wheel input over history cards or surrounding controls returns before `preventDefault()` and cannot resize Hiyori.
- `tests/test_drag_logic.js` now locks the guard ordering so future refactors cannot expand the wheel target back to the full PIXI canvas.
- Focused verification passed: drag logic, Live2D render performance, stage frontend, and diff checks. The complete local gate also passed before the state documents were externally overwritten: 524 Python tests, all Node frontend tests, 117 Python syntax files, 158 JavaScript syntax files, 579 secret-scan files, and `git diff --check`.
- `feature_list.json`, `progress.md`, and `session-handoff.md` were later overwritten with all-zero bytes by a concurrent external process. They were reconstructed from the current branch plus successful local Codex patch logs. JSON validity is restored, but older uncommitted prose may not be byte-for-byte identical to the lost versions.
- Manual check: after reloading Electron, wheel over the right history cards should scroll normally without changing model scale; wheel directly over Hiyori's visible head, torso, or legs should retain bounded scaling.

## Hiyori Native-motion Fluidity Parity Completed on 2026-07-17

- Procedural semantic gestures now use longer zero-velocity curves closer to Hiyori's authored Cubism motion timing instead of short runtime pulses.
- Speech drive ramps in and out continuously, while head, shoulder, and torso channels use staggered phase timing to avoid rigid same-frame movement.
- Priority, cooldown, 190 ms interruption crossfade, Hiyori/built-in conflict handling, unsupported-model fallback, assets, and renderer cadence remain unchanged.
- Focused director tests cover 60 FPS continuity, bounded acceleration, phase leadership, and speech-drive attack/release.

## Current Objective: Electron Stage Runtime Coordination v1

- Status: in progress.
- Goal: inspect the actual Electron stage and transparent desktop-pet windows, then coordinate their lifecycle so only the appropriate Live2D surface is visually and computationally active.
- Success path: stage visible -> desktop pet hidden/throttled; stage minimized or hidden -> desktop pet visible/active; stage restored -> desktop pet returns to its background state without losing speech/presence continuity.

## Electron Stage Runtime Coordination v1 Completed on 2026-07-16

- Result: the real Electron shell now coordinates the full stage and transparent desktop-pet renderer. The stage opens at the migrated landscape bounds; minimizing through the `桌宠` control or `Alt+Shift+P` activates the click-through pet; a second launch restores and focuses only the stage.
- Rendering lifecycle: each renderer receives an explicit active-state message after Live2D initialization. Inactive PIXI tickers stop, the model window uses native background throttling, and the chat/voice runtime remains alive while minimized. The transparent WebGL window stays compositor-alive at zero opacity to avoid Windows returning a blank canvas after native hide/show.
- Native evidence: the configured Hiyori model was inspected in a 1270x836 character-centered stage, then visibly restored in the full-screen transparent pet layer with its `XINYU / 待机` presence badge. Restoring the stage hid the detached character without duplicate visible rendering.
- Compatibility: persisted narrow chat bounds migrate once through layout version 2. Existing control IDs, click-through behavior, provider choices, permissions, observation rules, tools, and security defaults remain unchanged.
- Files changed for this feature: `electron/main.js`, `electron/preload.js`, `web/appStartupController.js`, `web/desktopControlBinder.js`, `web/index.html`, `web/chatDom.js`, `tests/test_stage_frontend.js`, and the three state artifacts.
- Verification Evidence:
  - Focused stage/runtime/drag tests and JavaScript syntax checks passed.
  - Real Electron startup, stage-to-pet shortcut transition, transparent Live2D rendering, and second-instance stage restoration were inspected successfully.
  - `powershell -NoProfile -ExecutionPolicy Bypass -File scripts\test-local.ps1` passed: environment doctor clean, `524` Python tests, full Node frontend suite, Python syntax `117` files, JavaScript syntax `152` files, and secret scan `572` files.
- Remaining manual risk: native checks prove renderer visibility and motion continuity, but the configured LLM/TTS services were not used for a fresh spoken turn. Recheck one playful and one serious spoken reply when the selected endpoints are running, especially subtitle timing and whether the exaggerated motion clips on another Live2D model.
- Recommended next feature: calibrate the complete real conversation loop with measured first-text, first-sound, pause, interruption, expression, and motion evidence instead of adding another independent scheduler.

## Current Objective: Automatic TTS Failover and Recovery v1

- Status: in progress.
- User decision: when GPT-SoVITS is unavailable, automatically use browser speech; when it recovers, return automatically; show only concise status text and never a modal dialog.
- Observed evidence: the authenticated app backend is healthy, the private provider is GPT-SoVITS at `127.0.0.1:9880`, and no process is currently listening on port 9880. Existing browser fallback is implemented but disabled privately, and the server path retries every utterance after failure.
- Intended change: add a bounded provider circuit/recovery interval, preserve cancellation and playback-generation fences, enable fallback only in the ignored personal profile, and keep public defaults off.

## Automatic TTS Failover and Recovery v1 Completed on 2026-07-16

- Result: enabled browser-speech fallback in the ignored personal profile while keeping GPT-SoVITS as the selected provider. A genuine server failure now opens a bounded circuit, speaks through the browser, and defers further server attempts for 15 seconds instead of blocking every utterance on the known-offline endpoint.
- Recovery: after the interval, the next eligible utterance probes the configured server through normal synthesis. Only successful server audio playback closes the circuit and reports `GPT-SoVITS 语音已恢复`; failed probes extend the interval and continue browser speech.
- Realtime path: an open circuit disables realtime server-segment enqueueing for that turn, so the final speech path can use browser TTS. Successful streamed or buffered server playback also closes the circuit.
- UX and safety: transition feedback is status text only (`已临时切换到系统语音` / recovery text), with no modal. Cancellation and stale playback generations do not change provider health. Public fallback remains default-off; provider, observation, permission, tool, CORS, token, and security defaults are unchanged.
- Files changed for this feature: `config.py`, `config.example.json`, `web/chatState.js`, `web/appConfigController.js`, `web/ttsPlaybackController.js`, `web/streamTtsQueueController.js`, `web/chat.js`, `tests/test_config_asr_defaults.py`, `tests/test_tts_failover_recovery_frontend.js`, `tests/test_stream_tts_queue_frontend.js`, `scripts/run_node_tests.js`, and the three state artifacts. Ignored `config.local.json` was changed privately.
- Verification Evidence:
  - Focused failover, realtime queue, delivery completeness, cancellation, character runtime, config sanitization, JavaScript syntax, JSON, and diff checks passed.
  - `powershell -NoProfile -ExecutionPolicy Bypass -File scripts\test-local.ps1` passed: environment doctor clean, `524` Python tests, full Node suite, Python syntax `117` files, JavaScript syntax `153` files, and secret scan `573` files.
  - Electron was restarted and the merged profile reported `provider=gpt_sovits`, `allow_browser_fallback=true`, and `server_recovery_probe_interval_ms=15000`. Port 8123 was healthy; port 9880 remained offline as expected.
- Remaining manual risk: Windows browser voice quality and exact transition timing depend on installed system voices. When GPT-SoVITS is started, speak again after at least 15 seconds and confirm the first recovered utterance sounds correct and the status briefly reports restoration.
- Recommended next feature: measure one complete real LLM reply through browser fallback, then repeat with GPT-SoVITS online and use the existing diagnostics to compare first sound, pacing, subtitles, and Live2D synchronization.

## Current Objective: Live2D Render Performance v1

- Status: in progress.
- User evidence: the real stage screenshot looks visually static and the configured Live2D model feels very laggy in Electron.
- Audit evidence: each Live2D model currently defaults to the library's shared ticker while the PIXI Application owns a second ticker. Stopping the inactive application ticker therefore does not guarantee that hidden model parameter updates stop. The renderer also enables multisample antialiasing on a full-window canvas without an explicit GPU preference or recorded native FPS evidence.
- Intended change: synchronize model updates with the application ticker, disable redundant multisample antialiasing, request high-performance WebGL, expose bounded local render diagnostics, and validate the real stage before starting concept-review frontend work.
- Preserve: current visual contract, chat/voice/subtitle controls, click-through safety, local provider choices, and all privacy/security defaults.

## Latest Session Update: Stage-centered Companion Frontend v1 Completed on 2026-07-16

- The Electron companion window now opens as a centered, dark Live2D stage instead of a 430x700 white chat sidebar. Existing narrow persisted chat bounds migrate to the new stage default.
- The configured real Live2D model is centered and framed more strongly. User and assistant turns occupy left/right rails, keep the character lane clear, and fall back to wider readable cards at narrow widths.
- The composer floats below the character; microphone, voice, subtitles, help, more, attachments, stickers, settings, and feedback retain their existing IDs and workflows with a compact peripheral hierarchy.
- The transparent model-only desktop pet has a coordinated status pill, distinct idle/thinking/listening/speaking/error presence colors, improved subtitle treatment, and a status position that follows the model horizontally.
- Browser evidence: the real local app was inspected at 1280x720 with the configured Hiyori model. The first pass was corrected for hidden history, legacy white action chrome, weak real-model framing, legacy feedback colors, low stage/composer contrast, dense status treatment, and missing state differentiation. More, sticker, text input, and model/voice settings interactions were exercised successfully.
- Verification Evidence: `scripts\test-local.ps1` passed in one complete run: environment doctor clean; 524 Python tests; full Node frontend suite including the new stage contract; Python syntax 117 files; JavaScript syntax 152 files; secret scan 572 files. `git diff --check` also passed.
- Remaining manual risk: automated and browser checks cannot judge motion taste or the exact appearance of every third-party Live2D model. Validate one real spoken playful turn and one serious turn in Electron; reduce model scale only if a different model clips at the head or feet.

## Current Objective: Stage-centered Companion Frontend v1

- Status: in progress.
- Accepted visual contract: the dark character-centered stage concept generated and approved in the current task.
- Target topology: real Live2D character in the center, recent user/assistant turns on left/right rails, a floating bottom composer, compact peripheral status and controls, plus a coordinated transparent desktop-pet presence state.
- Intentional fidelity boundary: the generated high-detail anime character is reference-only. The implementation must frame and light the configured Live2D model well without pretending its source art is more detailed than it is.
- Preserve: existing control IDs and workflows, model/provider configuration, privacy/security defaults, and narrow-window accessibility.
- Verification plan: focused source/DOM tests, real browser desktop and narrow screenshots, at least five visible mismatch corrections, core send/mic/more/sticker/settings checks, then `scripts\test-local.ps1`.

# Progress

Last Updated: 2026-07-11

## Current Objective

`release-experience-alignment-v1` is complete. Select the next focused core-experience gap before expanding scope further.

## Current State

- Audit evidence: the selected GPT-SoVITS path has historically taken about 11–24 seconds for short replies, while the frontend waits for `fetch(...).blob()` before playback. The strict demo check also currently reports the local GPT-SoVITS endpoint as unavailable; text chat must remain usable when this happens.
- Active scope: start a cancellable server-TTS request for one complete stable draft sentence only while the opt-in companion-turn server-TTS path is active. Hold the audio until the canonical final turn confirms the exact prefix, then reuse it once and synthesize any remaining tail normally. Do not start Live2D/subtitles/motion during prefetch.
- Guardrails: mutable stream text must never be spoken; mismatch, cancellation, interruption, and failure must discard the prewarm safely; no memory, permission, desktop-observation, tool, or model-asset changes belong to this slice.
- `memory-continuity-v1`, `conversation-flow-v1`, and `character-performance-cue-v1` are complete.
- Current product direction: improve character feel by making reply emotion, TTS delivery, and Live2D body/expression performance work together.
- Implementation plan is saved at `docs/superpowers/plans/2026-06-03-character-performance-cue-v1.md`.
- Runtime code now routes one `performanceCue` through reply planning, TTS playback, chat-to-model desktop speech broadcast, and Live2D speech animation.
- Automated frontend verification passed, and Electron/CDP smoke verified the real `view=chat` -> `view=model` path receives the cue and can trigger visible Live2D accent motion.
- Human screenshot review found the first visible-accent pass still read as too static; the latest slice now uses the bundled model's built-in motions for readable emotion poses instead of relying only on parameter nudges.
- Online search and local inspection did not find a ready-made `hiyori_pro_t11` exp3 expression pack; the current slice adds handwritten local exp3 files while preserving the existing Hiyori appearance.
- Latest user-selected A-strength slice strengthens `angry` and `thinking` at both the exp3 resource layer and the runtime speech-accent layer, including arm/hand parameter linkage and stronger built-in motion ordering.
- User judged `thinking` was still not readable enough. The latest slice adds an explicit `?` thinking bubble overlay driven by high-`thinking` performance cues, so the emotion reads semantically rather than relying only on Live2D face/arm deformation.
- Follow-up learning from Live2D expression/motion docs: keep expression, motion, and semantic overlay roles separate. The latest fix stops routing `thinking` through the `surprised` mood expression path and gives `thinking` its own mood blend/style layer.
- Latest upper-bound pass adds a dedicated Hiyori `Thinking` motion group plus a high-`thinking` runtime B-arm pose, making the model visibly lift both hands instead of staying near idle.
- User selected B for the next enhancement: a Neuro-sama-like sudden reaction before the thinking hold. The latest slice adds an early snap/rebound to the `Thinking` motion, a runtime `snap_jitter` thinking accent, and a short pop+jitter bubble animation.
- Latest asset upper-bound probe confirmed the current Hiyori package has no editable `.cmo3` source file in this repository; further Hiyori work is bounded to runtime resources (`motion3.json`, `exp3.json`, part opacity, and controller-side parameter layering).
- Local `haru_greeter_t03` can load in the current runtime and has more built-in motions than Hiyori, but its local package has no obvious expression resources. Official `Mao` has stronger expression/motion resources but failed under the bundled `cubism4.min.js` runtime, so it requires a runtime-compatibility upgrade or compatible export before adoption.
- Hiyori all-emotion strong expression follow-up is complete for the runtime/resource path: `happy`, `playful`, `surprised`, `sad`, `anxious`, and `neutral/idle` were strengthened while preserving the recent `thinking` and smoothed `angry` behavior.
- Electron/CDP visual QA produced full and zoomed contact sheets at `%USERPROFILE%\AppData\Local\Temp\ai_desktop_pet_smoke\hiyori-all-emotions-v1\all-emotions-contact-sheet.png` and `%USERPROFILE%\AppData\Local\Temp\ai_desktop_pet_smoke\hiyori-all-emotions-v1\all-emotions-contact-sheet-zoom.png`.
- The worktree already had unrelated local modifications before this harness update; do not stage or revert unrelated files.

## What Changed

- Added state routing to `AGENTS.md`.
- Added feature tracker in `feature_list.json`.
- Added this restartable progress log.
- Added `session-handoff.md` for next-session recovery.
- Added `init.sh` as the harness verification entrypoint.
- Added `docs/superpowers/plans/2026-06-03-character-performance-cue-v1.md` for the next implementation slice.
- Implemented `character-performance-cue-v1` frontend cue routing for Live2D speech/body/expression performance.
- Added `web/performanceCueController.js` as the pure cue builder.
- Added `tests/test_performance_cue_frontend.js` and registered it in `scripts/run_node_tests.js`.
- Updated `web/index.html`, `web/live2dExpressionController.js`, `web/ttsPlaybackController.js`, `web/chat.js`, and `web/chatReplyController.js`.
- Updated `web/appStartupController.js` so desktop speech broadcast carries `performanceCue` to the model window.
- Added an explicit visible Live2D speech accent layer for high-energy cues, independent of TTS audio energy.
- Added speech cue emotion pose pinning and built-in motion dispatch for high-energy cues; happy/wave now prefers `FlickUp` with `Tap` fallback.
- Updated `tests/test_character_runtime_frontend.js` to keep the backend-runtime-metadata preference assertion aligned with the new cue layer.
- Added local `hiyori_pro_t11` exp3 files for `neutral`, `happy`, `playful`, `sad`, `anxious`, `angry`, `surprised`, and `thinking`.
- Registered those expression files in `web/models/hiyori_pro_t11/hiyori_pro_t11.model3.json`.
- Updated `web/live2dExpressionController.js` so `performanceCue` also calls the model-level `model.expression(...)` path and clears back toward `neutral`.
- Extended `tests/test_performance_cue_frontend.js` to validate hiyori expression resources and model-level expression dispatch.
- Strengthened the `angry` and `thinking` exp3 resources with bigger face, body, arm, and hand parameters.
- Strengthened runtime `angry` and `thinking` speech-performance accents so speaking cues can add arm/hand movement beyond the static expression overlay.
- Reordered high-intensity angry built-in motion dispatch to prefer `Tap@Body` before `FlickDown`, giving it a more body/arm-forward pose in the real desktop broadcast path.
- Added `#thinking-cue-bubble` to the model page, styled it in `web/desktop.css`, and wired it from `web/live2dExpressionController.js` so high-`thinking` cues show a short `?` thought bubble.
- Added a performance-cue motion order preserve option in `web/motionRuntimeController.js`, used by `web/appStartupController.js`, so explicit cue motion priorities are not reshuffled away from `Tap@Body`.
- Added `web/models/hiyori_pro_t11/motion/hiyori_thinking_01.motion3.json` and registered it as the `Thinking` motion group.
- Updated high-`thinking` motion dispatch to try `Thinking` before generic body motion fallbacks.
- Updated the runtime high-`thinking` accent to use the model's alternate B-arm part and real B-arm hand rotation parameters (`ParamHandLB/RB`) while suppressing the A-arm ghost.
- Strengthened the dedicated `Thinking` motion so visible head/body/arm pose starts inside the first 0.35 seconds instead of waiting for the hold.
- Added runtime high-`thinking` `snap_jitter` accent output with early side-snap, small jitter, and debug fields.
- Changed the `?` thought bubble animation from a simple looping float into a short pop followed by brief jitter.
- Extended frontend checks to guard early motion snap, runtime `snap_jitter`, and bubble jitter styling.
- Added `docs/superpowers/plans/2026-06-04-live2d-asset-upper-bound-and-candidate-sourcing.md` to record the Hiyori source boundary, Haru probe, and online candidate sourcing path.
- Added a `thinkingUpperBoundProbe: true` debug guard to high-`thinking` runtime accents so future tests remember the current Hiyori path is a runtime-only upper-bound probe.
- Temporarily smoke-tested local `haru_greeter_t03` and official `Live2D/CubismWebSamples` `Mao` without committing either asset or changing the default model.
- Added reusable emotion frame-sampling tests in `tests/test_performance_cue_frontend.js`, including strength and smoothness guards for high `happy`, `playful`, `surprised`, `sad`, `anxious`, and neutral/idle.
- Strengthened `web/live2dExpressionController.js` runtime accents for happy/playful body-arm motion, surprised pop/recoil, sad/anxious held poses, and neutral idle micro-life.
- Added a lightweight `surprised-spark` overlay asset under `web/assets/live2d-overlays/hiyori/`, registered it in the Hiyori overlay manifest and default overlay controller, and styled it in `web/desktop.css`.
- Stabilized emotion tests by making frame samplers set deterministic `speechAnimSeed`; this avoids random-seed false failures in smoothness checks.

## Verification Evidence

- Hiyori all-emotion strong expression verification
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
  - Subsystems: instructions 5/5, state 5/5, verification 5/5, scope 5/5, lifecycle 5/5.
- `python -m json.tool feature_list.json > $null`
  - Result: passed.
- `Test-Path docs\superpowers\plans\2026-06-03-character-performance-cue-v1.md`
  - Result: passed, returned `True`.
- `Select-String -Path docs\superpowers\plans\2026-06-03-character-performance-cue-v1.md -Pattern <plan-red-flags>`
  - Result: passed, no matches.
- `git diff --check -- docs/superpowers/plans/2026-06-03-character-performance-cue-v1.md progress.md session-handoff.md`
  - Result: passed.
- `node <codex-home>\skills\harness-creator\scripts\validate-harness.mjs --target <repo-root>`
  - Result: passed, overall 100/100.
- `node tests/test_performance_cue_frontend.js`
  - Result: passed.
- `node tests/test_character_runtime_frontend.js`
  - Result: passed after updating the source-contract assertion for `performanceCue`.
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
- `python -m json.tool feature_list.json > $null`
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
- Follow-up after human screenshot review
  - Root cause: the first smoke proved cue state changed, but the visible model barely moved because motion still depended on TTS speaking/audio state and the desktop model window did not receive the performance cue.
  - Added failing tests for visible accent motion without TTS audio, chat-to-model cue broadcast, and idempotent cue normalization.
  - `node tests/test_performance_cue_frontend.js`
    - Result: passed after fixes.
  - `node scripts/run_node_tests.js`
    - Result: passed, ended with `[OK] Node frontend tests complete.`
  - `node --check web/live2dExpressionController.js`
    - Result: passed.
  - `node --check web/appStartupController.js`
    - Result: passed.
  - `node --check web/chat.js`
    - Result: passed.
  - `node --check tests/test_performance_cue_frontend.js`
    - Result: passed.
  - `python -m json.tool config.example.json > $null`
    - Result: passed.
  - `python -m json.tool package.json > $null`
    - Result: passed.
  - `python -m json.tool feature_list.json > $null`
    - Result: passed.
  - `python -m py_compile app.py config.py tts.py memory.py tools.py llm_client.py asr.py emotion.py humanize.py utils.py`
    - Result: passed.
  - `git diff --check -- web/performanceCueController.js tests/test_performance_cue_frontend.js scripts/run_node_tests.js web/index.html web/live2dExpressionController.js web/ttsPlaybackController.js web/chat.js web/chatReplyController.js web/appStartupController.js tests/test_character_runtime_frontend.js progress.md session-handoff.md docs/superpowers/plans/2026-06-03-character-performance-cue-v1.md`
    - Result: passed.
  - Electron/CDP chat-to-model smoke
    - Result: passed.
    - Triggered high happy cue from the chat page and verified the model page received `visibleMotion: 3.2`.
    - Model page reported `cueMotionActive: true` with `speechPerformanceAccentDebug` on all sampled frames.
    - Accent output included body swing around `-5.531..3.843`, body lift around `1.112..2.951`, and shoulder lift around `0.319..0.958`.
  - Contact sheet saved at `%USERPROFILE%\AppData\Local\Temp\ai_desktop_pet_smoke\performance-broadcast-v5\contact-sheet.png`.
  - Electron was closed after smoke; 8123 and 9223 were no longer reachable.
- Second follow-up after human screenshot review
  - Root cause: the bundled `hiyori_pro_t11` model has no expression files, and parameter-only emotion is too subtle or gets overridden by the active Live2D motion/model state.
  - Model motion scan showed `FlickUp` and `Tap` are the most readable happy/energetic poses; `Flick@Body` and `FlickDown` are better for thinking/sad/low-energy variants.
  - Added failing frontend coverage for high happy/wave cue dispatching built-in motion through the desktop chat-to-model broadcast.
  - `node tests/test_performance_cue_frontend.js`
    - Result: passed after fixes.
  - Electron/CDP chat-to-model smoke v7
    - Result: passed.
    - Triggered high happy/wave cue from the chat page and verified the model page dispatched built-in motion group `FlickUp`.
  - Model page reported `cueMotionActive: true`, `visibleMotion: 3.2`, and `motionDispatch.source: performance_cue` on sampled frames.
  - Contact sheets saved at `%USERPROFILE%\AppData\Local\Temp\ai_desktop_pet_smoke\performance-motion-v7\upper-crop-sheet.png` and `%USERPROFILE%\AppData\Local\Temp\ai_desktop_pet_smoke\performance-motion-v7\full-crop-sheet.png`.
- Final verification after v7 built-in motion and harness update
  - `node --check web/live2dExpressionController.js web/appStartupController.js web/chat.js tests/test_performance_cue_frontend.js`
    - Result: passed.
  - `node tests/test_performance_cue_frontend.js`
    - Result: passed.
  - `node scripts/run_node_tests.js`
    - Result: passed, ended with `[OK] Node frontend tests complete.`
  - `python -m json.tool config.example.json`, `python -m json.tool package.json`, `python -m json.tool feature_list.json`
    - Result: passed.
  - `python -m py_compile app.py config.py tts.py memory.py tools.py llm_client.py asr.py emotion.py humanize.py utils.py`
    - Result: passed.
  - `git diff --check -- <touched feature files and harness docs>`
    - Result: passed.
  - `node %USERPROFILE%\.codex\skills\harness-creator\scripts\validate-harness.mjs --target D:\AI\ai_desktop_pet`
    - Result: passed, overall 100/100.
  - Smoke Electron processes launched for CDP verification were closed after validation.
- Multi-emotion follow-up smoke
  - Triggered `surprised`, `thinking`, `sad`, `anxious`, `angry`, and `playful` through the local chat-to-model `BroadcastChannel("taffy-speech")` path.
  - Smoke v2 confirmed built-in motion dispatches: `surprised -> Flick`, `thinking/sad -> Flick@Body`, `anxious/angry -> FlickDown`, `playful -> FlickUp`.
  - Contact sheet saved at `%USERPROFILE%\AppData\Local\Temp\ai_desktop_pet_smoke\performance-other-emotions-v2\combined-upper-overview.png`.
  - Visual result: `playful` is strong; `sad`, `thinking`, and `anxious` read as low/internal poses; `surprised` is modest but has readable open-mouth/alert expression; `angry` still reads weak/ambiguous on this model.
  - Added an angry speech-performance accent branch for lowered brow, tense mouth, head/body shake, and arm/hand emphasis, guarded by `tests/test_performance_cue_frontend.js`.
  - Smoke v3 after the angry accent branch still showed `angry` is visually limited on `hiyori_pro_t11`; the stronger `FlickUp` probe is more visible but reads too happy, so it was not adopted as the default angry mapping.
  - Contact sheets saved at `%USERPROFILE%\AppData\Local\Temp\ai_desktop_pet_smoke\performance-other-emotions-v3\combined-upper-overview.png` and `%USERPROFILE%\AppData\Local\Temp\ai_desktop_pet_smoke\performance-angry-flickup-probe\upper-crop-sheet.png`.
  - Final verification after multi-emotion tuning:
    - `node --check web/live2dExpressionController.js tests/test_performance_cue_frontend.js`: passed.
    - `node tests/test_performance_cue_frontend.js`: passed.
    - `node scripts/run_node_tests.js`: passed, ended with `[OK] Node frontend tests complete.`
    - JSON checks for `config.example.json`, `package.json`, and `feature_list.json`: passed.
    - Python compile checks for the required project modules: passed.
    - `git diff --check -- web/live2dExpressionController.js tests/test_performance_cue_frontend.js progress.md session-handoff.md`: passed.
    - Harness validation: passed, overall 100/100.
- Model/expression resource follow-up
  - Online check: the official Live2D sample page lists Hiyori Momose sample/runtime packages but does not list standalone `Expression data (exp3.json)` for Hiyori; broader search did not find `hiyori_pro_t11` exp3 files.
  - Added handwritten local exp3 resources under `web/models/hiyori_pro_t11/expressions/`.
  - `node tests/test_performance_cue_frontend.js`: passed.
  - `node scripts/run_node_tests.js`: passed, ended with `[OK] Node frontend tests complete.`
  - `node --check web/live2dExpressionController.js`: passed.
  - `node --check tests/test_performance_cue_frontend.js`: passed.
  - `python -m json.tool web\models\hiyori_pro_t11\hiyori_pro_t11.model3.json`: passed.
  - JSON checks for all `web\models\hiyori_pro_t11\expressions\*.exp3.json`: passed.
  - AGENTS JSON checks for `config.example.json`, `package.json`, and `feature_list.json`: passed.
  - AGENTS Python compile checks for required project modules: passed.
  - `git diff --check -- <hiyori expression resources, Live2D controller, performance cue test>`: passed.
  - Harness validation: passed, overall 100/100.
  - Electron/CDP smoke: passed. Model page loaded expression manager with `neutral/happy/playful/sad/anxious/angry/surprised/thinking`; `applySpeechPerformanceCue` selected `angry` and `happy` with `ok: true`.
  - Smoke screenshots saved under `%USERPROFILE%\AppData\Local\Temp\ai_desktop_pet_smoke\hiyori-exp3-v1\`.
- Angry/thinking A-strength follow-up
  - User selected A: stronger but still recoverable arm/hand linkage for `angry` and `thinking`.
  - Added static guards for strong `angry` brow/mouth/arm-hand resources and strong `thinking` head/eye/arm-hand resources.
  - Added dynamic guard for high-`thinking` runtime cue output and raised the high-`angry` arm/hand runtime threshold.
  - Added broadcast-source guard that high-`angry` tries built-in motion groups in `Tap@Body`, then `FlickDown` order.
  - `node tests/test_performance_cue_frontend.js`: passed.
  - `node --check web\appStartupController.js`: passed.
  - `node --check web\live2dExpressionController.js`: passed.
  - `node --check tests\test_performance_cue_frontend.js`: passed.
  - `node scripts\run_node_tests.js`: passed, ended with `[OK] Node frontend tests complete.`
  - JSON checks for `web\models\hiyori_pro_t11\expressions\angry.exp3.json` and `thinking.exp3.json`: passed.
  - Electron/CDP visual smoke generated the strength-v2 contact sheets and wrapper-motion frames.
  - Strength-v2 screenshots saved under `%USERPROFILE%\AppData\Local\Temp\ai_desktop_pet_smoke\hiyori-exp3-strength-v2\`.
  - Visual result: `thinking` now reads clearly stronger, including an arm/hand pose; `angry` face/body improved and real dispatch now uses `Tap@Body`, but the bundled model still limits how rage-like the hand/arm deformation can become.
  - Final validation after updating harness docs:
    - `node tests\test_performance_cue_frontend.js`: passed.
    - `node --check web\appStartupController.js`: passed.
    - `node --check web\live2dExpressionController.js`: passed.
    - `node --check tests\test_performance_cue_frontend.js`: passed.
    - `node scripts\run_node_tests.js`: passed, ended with `[OK] Node frontend tests complete.`
    - AGENTS JSON checks for `config.example.json`, `package.json`, and `feature_list.json`: passed.
    - Expression JSON checks for `angry.exp3.json` and `thinking.exp3.json`: passed.
    - AGENTS Python compile checks for required project modules: passed.
    - `git diff --check -- <A-strength touched files and harness docs>`: passed, with only Git's line-ending warning for `.gitignore`.
    - Harness validation: passed, overall 100/100.
- Thinking symbol follow-up
  - User judged the strengthened `thinking` pose still did not read as thinking.
- Added a visible `?` thought bubble overlay that is shown only for high-`thinking` performance cues and hidden for other cues or `clearSpeechPerformanceCue()`.
- Added tests that `thinking` reveals the bubble, non-`thinking` hides it, clear hides it, HTML contains the bubble node, and CSS defines the visible state.
- Added `preserveGroupOrder` support for performance-cue built-in motion dispatch so explicit `Tap@Body` priority is kept even after another motion was just played.
- Learned adjustment pass:
  - `thinking` no longer aliases to `surprised` for runtime mood expression.
  - `getSmoothedMoodExpression()` now tracks a separate `thinking` blend.
  - `applyStyleExpressionLayer()` consumes `thinkingBlend` with side glance, tilted head/body, and closed-mouth thinking cues instead of surprise-open-eye cues.
  - `ponder`, `thinking`, and `consider` action metadata normalize to the `think` action cue.
  - `node tests\test_performance_cue_frontend.js`: passed.
  - `node --check web\live2dExpressionController.js`, `web\appStartupController.js`, `web\motionRuntimeController.js`, and `tests\test_performance_cue_frontend.js`: passed.
  - Expression JSON checks for `angry.exp3.json` and `thinking.exp3.json`: passed.
  - Electron/CDP visual smoke confirmed `thinking-cue-bubble` exists, is visible, has text `?`, and `thinking` dispatches `Tap@Body`.
  - Electron/CDP v3 confirmed `moodExpressionWeightMood: "thinking"`, `moodExpressionRuntimeMood: "thinking"`, `surprised: 0`, and visible `?` bubble.
  - Latest screenshot saved at `%USERPROFILE%\AppData\Local\Temp\ai_desktop_pet_smoke\hiyori-thinking-symbol-v3\thinking-cue-symbol.png`.
  - Final validation after the learning-based adjustment:
    - `node tests\test_performance_cue_frontend.js`: passed.
    - `node --check web\performanceCueController.js`, `web\live2dExpressionController.js`, `web\appStartupController.js`, `web\motionRuntimeController.js`, and `tests\test_performance_cue_frontend.js`: passed.
    - `node scripts\run_node_tests.js`: passed, ended with `[OK] Node frontend tests complete.`
    - AGENTS JSON checks for `config.example.json`, `package.json`, and `feature_list.json`: passed.
    - Expression JSON checks for `angry.exp3.json` and `thinking.exp3.json`: passed.
    - AGENTS Python compile checks for required project modules: passed.
    - `git diff --check -- <thinking/angry cue files and harness docs>`: passed.
    - Harness validation: passed, overall 100/100.
    - Electron preview process was closed; ports `8123` and `9223` were confirmed closed.
- Thinking motion upper-bound follow-up
  - Added dedicated model motion resource `web\models\hiyori_pro_t11\motion\hiyori_thinking_01.motion3.json`.
  - Registered a `Thinking` motion group in `web\models\hiyori_pro_t11\hiyori_pro_t11.model3.json`.
  - Changed high-`thinking` performance-cue dispatch to prefer `Thinking`, then fall back to `Tap@Body`, `Flick@Body`, and `FlickDown`.
  - Runtime thinking accent now switches toward `PartArmB`, drives `ParamArmLB`, `ParamHandLB`, and `ParamHandRB`, and reduces `PartArmA` to `0.02` during the cue to avoid the old-arm ghost.
  - `node tests\test_performance_cue_frontend.js`: passed after RED/GREEN coverage for the `Thinking` motion group, B-arm hand rotation, and A-arm ghost guard.
  - `node --check web\live2dExpressionController.js`, `web\appStartupController.js`, and `tests\test_performance_cue_frontend.js`: passed.
  - JSON checks for `web\models\hiyori_pro_t11\hiyori_pro_t11.model3.json` and `web\models\hiyori_pro_t11\motion\hiyori_thinking_01.motion3.json`: passed.
  - `node scripts\run_node_tests.js`: passed, ended with `[OK] Node frontend tests complete.`
  - Electron visual smoke confirmed `lastDispatch.group: "Thinking"`, `PartArmA: 0.02`, `PartArmB: 0.881`, `ParamArmLB: 7.495`, `ParamHandLB: -7.582`, and visible `?` bubble.
  - Latest screenshot saved at `%USERPROFILE%\AppData\Local\Temp\ai_desktop_pet_smoke\hiyori-thinking-runtime-v2\thinking-runtime-peak.png`.
  - Final validation after handoff updates:
    - AGENTS JSON checks for `config.example.json`, `package.json`, and `feature_list.json`: passed.
    - AGENTS Python compile checks for required project modules: passed.
    - `git diff --check -- <thinking motion/resource/runtime/test/handoff files>`: passed.
    - Harness validation: passed, overall 100/100.
    - Port/process cleanup check returned no project Electron/Python process and no `8123`/`9223` listener rows.
- Thinking snap-jitter B follow-up
  - User selected B: Neuro-sama-like sudden reaction rather than a large theatrical movement.
  - Added failing coverage first:
    - `node tests\test_performance_cue_frontend.js`
    - Initial result: failed as expected on `Thinking motion should snap into a visible pose during the first 0.35s`.
  - Updated `web\models\hiyori_pro_t11\motion\hiyori_thinking_01.motion3.json` with early snap/rebound keyframes and corrected `Meta.TotalSegmentCount` / `Meta.TotalPointCount`.
  - Updated `web\live2dExpressionController.js` so high-`thinking` speech accents expose `thinkingReactionMode: "snap_jitter"` and add early `ParamAngleX` side-snap plus body/hand jitter.
  - Updated `web\desktop.css` so `#thinking-cue-bubble` pops once and briefly jitters instead of only floating.
  - Verification:
    - `node tests\test_performance_cue_frontend.js`: passed.
    - `node --check web\live2dExpressionController.js`: passed.
    - `node --check tests\test_performance_cue_frontend.js`: passed.
    - `python -m json.tool web\models\hiyori_pro_t11\motion\hiyori_thinking_01.motion3.json`: passed.
    - `python -m json.tool web\models\hiyori_pro_t11\hiyori_pro_t11.model3.json`: passed.
    - `node scripts\run_node_tests.js`: passed, ended with `[OK] Node frontend tests complete.`
    - AGENTS JSON checks for `config.example.json`, `package.json`, and `feature_list.json`: passed.
    - AGENTS Python compile checks for required project modules: passed.
    - `git diff --check -- <thinking snap touched files>`: passed.
  - Electron/CDP visual smoke:
    - Triggered a high-`thinking` cue directly on the model page.
    - Runtime confirmed `thinkingReactionMode: "snap_jitter"`, early `thinkingSnap: 0.895`, visible `?` bubble, `PartArmA: 0.02`, `PartArmB: 0.951`, and later hold/jitter frames with strong negative head/body/hand pose.
    - Screenshots saved under `%USERPROFILE%\AppData\Local\Temp\ai_desktop_pet_smoke\hiyori-thinking-snap-v1\`.
    - Review contact sheet saved at `%USERPROFILE%\AppData\Local\Temp\ai_desktop_pet_smoke\hiyori-thinking-snap-v1\thinking-snap-contact-sheet.png`.
    - Smoke process was closed after capture; follow-up port check showed no `8123` or `9223` listener.
- Live2D asset upper-bound and candidate sourcing follow-up
  - Hiyori source-resource boundary:
    - `Get-ChildItem -Recurse -Filter *.cmo3 -File .`: returned no `.cmo3` files.
    - Current Hiyori package remains runtime-only; true mesh/deformer/art changes require a source `.cmo3` or replacement asset.
  - TDD harness guard:
    - Added `thinkingUpperBoundProbe` assertion to `tests/test_performance_cue_frontend.js`.
    - Initial targeted test failed as expected on the missing debug field.
    - Added `thinkingUpperBoundProbe: true` in `web/live2dExpressionController.js`.
    - `node tests\test_performance_cue_frontend.js`: passed after fix.
  - Local Haru candidate:
    - `docs\live2d\models\haru_greeter_t03\haru_greeter_t03.model3.json`: JSON check passed.
    - Offline scoring found strongest local Haru motions: `haru_g_m20`, `haru_g_m19`, `haru_g_m10`, and `haru_g_m22`.
    - Electron/CDP probe loaded Haru successfully with `Idle=6`, `Use=15`.
    - Contact sheet saved at `%USERPROFILE%\AppData\Local\Temp\ai_desktop_pet_smoke\haru-candidate-v1\haru-contact-sheet.png`.
    - Visual read: `m10` gives the clearest arm spread; `m20/m19/m22` are usable but still not a decisive `thinking` replacement. Local copy lacks obvious expression files.
  - Online candidate sourcing:
    - Official Live2D sample page confirms many sample packages include runtime folders with `.moc3`, `.motion3.json`, `.model3.json`, physics/display files, and, for some models, `exp3.json`; it also requires the Free Material License Agreement and sample-data terms.
    - Candidate table:
      - `Epsilon` | `https://www.live2d.com/en/learn/sample/` | advertised as a standard model with tears, anger mark, and expression effects | promising for `angry` readability | license terms require review before redistribution | next action: manual download/probe only after approval.
      - `Haru` official sample | `https://www.live2d.com/en/learn/sample/` | supports arm and outfit changes plus audio | promising for body/arm readability | license terms require review before redistribution | next action: manual download/probe if we want a non-Hiyori avatar direction.
      - `Shizuku` | `https://www.live2d.com/en/learn/sample/` | described as having fine hand movements | promising for subtle hand emotion | license terms require review before redistribution | next action: probe only if current Cubism export is compatible.
      - `Koharu & Haruto` | `https://www.live2d.com/en/learn/sample/` | expression effects plus many large movements | strongest for exaggerated cute reactions, but SD-style | license terms require review before redistribution | next action: consider only if style change is acceptable.
      - `Mao` from `https://github.com/Live2D/CubismWebSamples` | 8 expressions, `Idle=2`, `TapBody=6` | strongest inspected metadata | official sample repo, but still subject to Live2D terms | next action: blocked until runtime compatibility is solved.
    - Official `Mao` probe:
      - Temporarily cloned `Live2D/CubismWebSamples` with sparse checkout to `%TEMP%\ai_desktop_pet_live2d_candidates`.
      - Static inspection confirmed 8 expressions and high-scoring `special_01/02/03` motions.
    - Runtime probe failed on `Live2DModel.from('/models/mao_probe/Mao.model3.json')` with `Unknown error` inside `vendor/cubism4.min.js`.
    - Decision: do not import Mao into the app until the bundled Cubism runtime is upgraded or an older compatible export is used.
    - Temporary probe directories `web\models\haru_greeter_t03_probe` and `web\models\mao_probe` were removed, and final port check returned no `8123` or `9223` listeners.
  - Final validation after recording the asset decision:
    - `node tests\test_performance_cue_frontend.js`: passed.
    - `node scripts\run_node_tests.js`: passed, ended with `[OK] Node frontend tests complete.`
    - `node --check web\live2dExpressionController.js`: passed.
    - `node --check tests\test_performance_cue_frontend.js`: passed.
    - JSON checks for `config.example.json`, `package.json`, `feature_list.json`, `web\models\hiyori_pro_t11\hiyori_pro_t11.model3.json`, and `web\models\hiyori_pro_t11\motion\hiyori_thinking_01.motion3.json`: passed.
    - AGENTS Python compile checks for required project modules: passed.
    - `git diff --check -- <asset-probe touched tracked paths>`: passed.
    - Trailing-whitespace checks for `progress.md`, `session-handoff.md`, and the asset-probe plan file: passed.
    - Harness validation: passed, overall 100/100.
    - Port cleanup check returned no `8123` or `9223` listeners.
- Hiyori local emotion overlay follow-up
  - Result: improved, with Hiyori kept as the default character.
  - Added a Hiyori-specific overlay manifest/controller for high-intensity `thinking` and `angry` performance cues.
  - Initial full hand/fist overlay assets were rejected in visual QA because they looked like pasted-on body parts.
  - Final assets avoid external limbs:
    - `thinking`: `thinking-focus-lines.png` plus `thinking-ellipsis.png`.
    - `angry`: `angry-impact-lines.png` plus `angry-mark.png`.
  - Overlay placement is anchored to the current Live2D model box instead of fixed viewport percentages.
  - High `thinking` suppresses the old fixed `?` bubble when the Hiyori overlay is available; the old bubble remains as a fallback.
  - Verification passed so far:
    - `node tests\test_performance_cue_frontend.js`
    - `node --check web\hiyoriEmotionOverlayController.js`
    - `node --check web\live2dExpressionController.js`
    - `node --check web\chat.js`
    - `python -m json.tool web\assets\live2d-overlays\hiyori\manifest.json`
  - Electron/CDP visual smoke:
    - `thinking` v4 screenshot: `%USERPROFILE%\AppData\Local\Temp\ai_desktop_pet_smoke\hiyori-overlay-live-v4\thinking-high.png`.
    - `angry` v4 screenshot: `%USERPROFILE%\AppData\Local\Temp\ai_desktop_pet_smoke\hiyori-overlay-live-v4\angry-high.png`.
    - Asset contact sheet: `%USERPROFILE%\AppData\Local\Temp\ai_desktop_pet_smoke\hiyori-overlay-assets-v2\asset-contact-sheet.png`.
- Angry model twitch follow-up
  - Result: improved model-body smoothness.
  - Root cause: high `angry` speech accent used high-frequency head/body counter-shake (`sin(now / 74)`) plus arm clench, which produced large 33ms frame-to-frame jumps.
  - Added regression coverage in `tests\test_performance_cue_frontend.js` to cap high-`angry` frame-to-frame jumps for head, body, and arm parameters.
  - Updated `web\live2dExpressionController.js` high-`angry` branch from rapid shake to slower held-tension motion.
  - Electron/CDP visual smoke contact sheet: `%USERPROFILE%\AppData\Local\Temp\ai_desktop_pet_smoke\hiyori-angry-smooth-v1\angry-smooth-contact-sheet.png`.
  - Verification passed so far:
    - `node tests\test_performance_cue_frontend.js`
- Reply/TTS/subtitle smoke on 2026-07-05
  - Result: current local project can produce a backend reply, browser TTS can be triggered from the frontend, and the subtitle layer displays the spoken text.
  - `powershell -NoProfile -ExecutionPolicy Bypass -File scripts\test-local.ps1`
    - Result: partial pass.
    - Python tests passed: `425 passed`.
    - Node frontend tests passed, including chat API, speech text, TTS API, character runtime, and performance cue checks.
    - Python syntax and JavaScript syntax checks passed.
    - Final `scripts\check_secrets.py` step failed on existing private local Windows paths in documentation/state files.
  - `powershell -NoProfile -ExecutionPolicy Bypass -File scripts\first_chat_smoke.ps1 -Message "请用一句中文回复：测试通过。" -NoStartServer`
    - Result: passed.
    - First-run preflight passed with 4 warnings.
    - Existing backend was reachable at the configured local server.
    - `/api/health` reported config, Live2D, server, and LLM basics OK.
    - `/api/llm_probe` returned text.
    - `/api/chat` returned a non-empty reply.
  - API health summary:
    - Result: passed.
    - Overall status `ok`; `config_load`, `live2d_model_path`, `server`, `llm`, and `tts` were true.
    - TTS provider was `browser`; no blocking readiness checks were reported.
  - Electron/CDP frontend smoke:
    - Result: passed.
    - Opened the model page against the existing backend without starting the Electron main process.
    - `window.speak("字幕和语音测试通过", { force: true, interrupt: true })` returned `true`.
    - `#subtitle-layer` became visible and `.subtitle-en` contained `字幕和语音测试通过`.
    - `speechSynthesis` reported no pending, paused, or speaking queue after the sample finished.
    - Temporary Electron/project backend processes were stopped after the smoke; no project `electron.exe` or `app.py` process was left running.
- GPT-SoVITS TTS routing fix on 2026-07-05
  - Result: fixed local TTS routing so the app uses GPT-SoVITS instead of browser speech.
  - Root cause: both base and local runtime config had `tts.provider` set to `browser`, so the frontend never attempted server TTS.
  - Updated local runtime config:
    - `tts.provider`: `gpt_sovits`
    - `tts.gpt_sovits_timeout_sec`: `120`
    - `tts.server_request_timeout_ms`: `120000`
    - `tts.allow_browser_fallback`: `false`
  - Direct GPT-SoVITS service probe:
    - `POST http://127.0.0.1:9880/tts` with a short English test returned `200`, `audio/wav`, and a RIFF/WAVE header.
  - Project backend verification:
    - `python -m json.tool config.local.json`: passed.
    - Merged config reported `tts.provider=gpt_sovits`, `gpt_sovits_timeout_sec=120`, and `allow_browser_fallback=false`.
    - `/api/tts` returned `200`, `audio/wav`, and a RIFF/WAVE header through the project backend.
    - `/config.json` exposed `tts.provider=gpt_sovits` to the frontend.
    - `/api/health` reported TTS provider `gpt_sovits`, server TTS provider true, browser fallback false, and no blocking readiness checks.
  - Electron/CDP frontend verification:
    - Started Electron with a temporary debug port.
    - Model page state reported `provider: gpt_sovits` and `window.electronAPI` available.
    - `window.speak("OK.", { force: true, interrupt: true })` returned `true`.
    - Frontend requested `/api/tts`, which returned `200`, `audio/wav`, and a RIFF/WAVE header.
    - Subtitle layer became visible and showed `OK.`.
    - Temporary Electron/project backend processes were stopped after the smoke; GPT-SoVITS itself remained running.
- Live2D model drag follow-up
  - Result: improved Electron model drag reliability.
  - User-reported issue: Live2D model could not be moved after launching the desktop app.
  - Diagnosis:
    - Backend health check was reachable at `/healthz`.
    - `%USERPROFILE%\AppData\Roaming\Electron\window-state.json` had `locked: false`, so the app was not blocked by the window lock.
    - The likely failure path was Electron transparent click-through: the model window starts with `setIgnoreMouseEvents(true, { forward: true })`, but the old frontend path only used in-page `mousemove` to turn click-through off near the visible model area.
  - Fix:
    - `web\live2dLayoutController.js` now keeps click-through disabled while model drag data exists, not only while subtitle/window dragging.
    - Added a cursor-position polling fallback that maps Electron screen cursor coordinates into the model window and updates click-through even when the transparent window does not receive `mousemove`.
    - `tests\test_drag_logic.js` now guards the new Electron click-through polling path.
  - Verification passed:
    - `node tests\test_drag_logic.js`
    - `node --check web\live2dLayoutController.js`
    - `node --check tests\test_drag_logic.js`
    - `node scripts\run_node_tests.js`
- Startup chat-window first-frame flash follow-up
  - Result: fixed the startup frames where the chat window briefly showed an oversized circular avatar/image layout before the final UI settled.
  - Diagnosis:
    - `web\index.html` initially rendered the chat panel before `chat.js` ran `applyDisplayModeFromUrl()`.
    - The existing large-avatar safety guard was scoped to `body.view-chat`, so the first paint could expose the raw hero avatar image before the `view-chat` class existed.
  - Fix:
    - Added an inline startup script at the start of `body` in `web\index.html` to apply `view-*`, `desktop-mode`, `transparent-mode`, and alpha classes before the panel DOM is parsed.
    - Added base `.panel .hero-avatar` and `.panel .hero-avatar > img` sizing guards in `web\base.css` so the avatar is constrained even before the final view-specific CSS takes over.
    - Added static frontend checks in `tests\test_first_run_frontend.js`.
  - Verification passed:
    - `node tests\test_first_run_frontend.js`
    - `node --check tests\test_first_run_frontend.js`
    - `node --check web\chat.js`
    - `node scripts\run_node_tests.js`
    - `git diff --check -- web\index.html web\base.css tests\test_first_run_frontend.js`
    - Local server check confirmed `/` serves the startup script and `/base.css` serves the avatar guard.
- Electron always-on-top config follow-up
  - Result: desktop windows now respect `desktop.always_on_top`, and the model remains draggable when the setting is false.
  - User-reported issue: Live2D model stayed above other pages/windows by default.
  - Diagnosis:
    - `config.json` and `config.example.json` already had `desktop.always_on_top: false`.
    - `electron\main.js` still hard-coded the model window as `alwaysOnTop: true` and called `setAlwaysOnTop(true)` for both model and chat windows.
    - Follow-up regression: after removing always-on-top, the model was not draggable because the model window still used `focusable: false`; on Windows, a transparent non-topmost non-focusable window is unreliable for mouse input.
  - Fix:
    - Added `shouldKeepWindowsAlwaysOnTop()` in `electron\main.js`.
    - `BrowserWindow` creation and post-create `setAlwaysOnTop(...)` now use the config-derived value.
    - Model window now uses `focusable: false` only when it is always-on-top; when it is not always-on-top, it is focusable so visible model areas can receive drag input.
    - Added `tests\test_electron_window_config.js` to guard against reintroducing hard-coded always-on-top behavior.
  - Verification passed:
    - `node tests\test_electron_window_config.js`
    - `node --check electron\main.js`
    - `node --check tests\test_electron_window_config.js`
    - `node tests\test_drag_logic.js`
    - `node scripts\run_node_tests.js`
    - Local config check confirmed `desktop.always_on_top = false`.
    - Electron app was restarted and `/healthz` returned 200.

## Risks

- Existing dirty worktree can make unrelated changes easy to mix into future commits.
- `init.sh` delegates to the existing PowerShell test workflow; on machines without PowerShell, use the documented targeted commands directly.
- Visual tuning is still subjective; CDP and contact-sheet evidence now show readable built-in action for happy/playful and partial coverage for several non-happy moods, but angry is not visually reliable with the bundled model.
- Because the bundled Live2D model lacks expression files, future emotion readability work should prefer known motion groups or a stronger avatar asset/runtime before spending more time on small parameter-only expression tuning.
- Handwritten exp3 files improve expression-manager coverage, but they are still parameter-only overlays on the existing `.moc3`; `angry` is more controllable now and has body/arm linkage, while `thinking` now uses a dedicated motion, runtime B-arm pose, and overlay symbol for clear semantic readability.
- The new B-arm thinking pose and snap-jitter timing are much more visible, but the exact silhouette is constrained by Hiyori's bundled alternate-arm artwork; it reads closer to "hesitating/thinking with a sudden reaction" than a true hand-to-chin pose.
- Replacing the model is now the higher-leverage route, but it has two separate risks: visual style drift and runtime/license compatibility. Haru is runtime-compatible but not clearly stronger for expressions; Mao is resource-strong but currently runtime-incompatible.
- Full chat-to-LLM reply smoke has now been run locally against the configured provider; future agents should still avoid exposing private runtime config or API keys.

## Next

1. Human-review `%USERPROFILE%\AppData\Local\Temp\ai_desktop_pet_smoke\haru-candidate-v1\haru-contact-sheet.png` against the current Hiyori thinking snap sheet.
2. Keep Hiyori as default for now unless the product direction accepts a character/style change.
3. If replacing assets, prefer a two-step spike: first upgrade/prove Cubism runtime compatibility with official sample assets, then manually probe official `Epsilon`, `Haru`, `Shizuku`, or `Koharu & Haruto` after license review.

## Model-Direct Reply Follow-up on 2026-07-05

- Result: local reply generation is now configured to bypass template-like character brain reply shaping and runtime metadata parsing.
- User direction: remove templated reply behavior and let the model produce the answer.
- Root cause of the irrelevant screenshot reply:
  - The exact line `Hm. The desktop air just shifted. Suspicious, but continue.` existed as a hard-coded casual fallback in `character_brain.py`.
  - `memory.json` also contained prior turns where `祝我好运哦` was paired with that irrelevant fallback, so history could reinforce the bad pattern.
  - The input was hand-typed, so ASR was not the cause for that example.
- Fix:
  - Added `character_runtime.model_direct_reply` and preserved it through `config.py`.
  - In model-direct mode, `app.py` no longer builds character brain decisions, no longer injects the character brain prompt block, and no longer returns character brain metadata.
  - In model-direct mode, `app_reply_pipeline.py` returns the raw model text without character runtime normalization, metadata merging, language guard rewrites, or character brain reply constraints.
  - `config.local.json` now sets `character_runtime.enabled=false`, `return_metadata=false`, `auto_apply_reply_cue=false`, and `model_direct_reply=true`.
  - Removed the temporary hard-coded good-luck fallback that had been added during diagnosis before the user clarified the desired direction.
- Verification:
  - `python -m pytest tests\test_app_reply_pipeline.py tests\test_character_brain.py tests\test_character_runtime_integration.py::test_character_runtime_settings_default_demo_stable_off tests\test_character_runtime_integration.py::test_character_runtime_settings_demo_stable_requires_runtime_enabled -q`
    - Result: passed, `61 passed`.
  - `python -m json.tool config.local.json > $null; python -m json.tool config.example.json > $null; python -m json.tool package.json > $null`
    - Result: passed.
  - `python -m py_compile app.py app_reply_pipeline.py config.py character_brain.py character_brain_intent_strategy.py`
    - Result: passed.
  - `git diff --check -- app.py app_reply_pipeline.py config.py character_brain.py character_brain_intent_strategy.py tests/test_app_reply_pipeline.py tests/test_character_brain.py config.local.json`
    - Result: passed.
  - Direct internal probe with real `load_config()`:
    - `model_direct_reply=True`, `runtime_enabled=False`.
    - `_build_base_prompt(...)` did not set `_character_brain_decision`.
    - The generated base prompt did not include the character brain block.
    - `_apply_character_brain_reply_text(...)` preserved `Good luck. I am with you.` unchanged.
    - `_build_character_brain_response_payload(...)` returned no payload.
  - Project was restarted; `/config.json` reported `tts.provider=gpt_sovits`, `character_runtime.enabled=false`, `model_direct_reply=true`, `return_metadata=false`, and `auto_apply_reply_cue=false`.
- Remaining manual check:
  - Command-line `/api/chat` verification was blocked by local API token mismatch (`Invalid API token`) when called outside Electron. The app itself uses Electron-authenticated requests; manually send `祝我好运哦` in the chat window to judge the model's actual content and provider latency.

## GPT-SoVITS Short English Stability Follow-up on 2026-07-05

- Result: reduced the GPT-SoVITS short-English artifact path that made `Alright, alright—I got it the first time. Go sleep.` sound like a long `aaa` before `Go sleep`.
- Diagnosis:
  - The GPT-SoVITS service on port `9880` became stuck during repeated probes and had to be restarted.
  - Direct comparison showed the dangerous path was an empty `prompt_text` candidate with the English reference audio:
    - Matching `prompt_text`, stable sampling: returned WAV in about 15.3s, `430124` bytes, about `6.72s`.
    - Empty `prompt_text`, higher sampling: returned WAV in about 44.8s, `1450284` bytes, about `22.66s`, consistent with long leading vocalization.
  - The screenshot sentence also contains an em dash and repeated `Alright`, which the current GPT-SoVITS model can vocalize poorly.
- Fix:
  - `config.py` default `tts.gpt_sovits_prefer_clean_prompt` is now `false`.
  - `tts.py` now defaults `gpt_sovits_prefer_clean_prompt` to `false` if not configured.
  - `config.local.json` now uses the matching English prompt text first, with more stable local sampling:
    - `gpt_sovits_prefer_clean_prompt=false`
    - `gpt_sovits_top_k=8`
    - `gpt_sovits_top_p=0.78`
    - `gpt_sovits_temperature=0.36`
    - `gpt_sovits_repetition_penalty=1.12`
    - `gpt_sovits_speed=0.95`
    - `gpt_sovits_timeout_sec=30`
    - `gpt_sovits_chunk_timeout_sec=15`
    - `gpt_sovits_chunk_max_candidates=1`
    - `server_request_timeout_ms=30000`
  - `tts.py` TTS-only text normalization now converts English dash pauses to normal sentence pauses and collapses repeated leading filler such as `Alright, alright` to one `Alright`.
- Verification:
  - `python -m pytest tests\test_tts_language.py tests\test_config_asr_defaults.py -q`
    - Result: passed, `23 passed`.
  - `python -m py_compile tts.py config.py`
    - Result: passed.
  - `python -m json.tool config.local.json > $null; python -m json.tool config.example.json > $null; python -m json.tool package.json > $null`
    - Result: passed.
  - `git diff --check -- tts.py config.py config.local.json tests/test_tts_language.py`
    - Result: passed.
  - Normalization probe:
    - Input: `Alright, alright—I got it the first time. Go sleep.`
    - TTS text: `Alright. I got it the first time. Go sleep.`
  - Short `Go sleep.` project-path synthesis after restart:
    - Result: returned WAV, `46398` bytes, about `0.724s` audio.
    - GPT-SoVITS still took about `24.2s`, so speed remains a model/service limitation.
- Restart:
  - Restarted GPT-SoVITS; it is listening on `127.0.0.1:9880`.
  - Restarted the desktop project; backend is listening on `127.0.0.1:8123`.
- Remaining risk:
  - GPT-SoVITS inference is still slow and can occasionally hang on short English. The new config limits wait time and avoids the empty-prompt artifact path, but manual listening in the app is still required.

## GPT-SoVITS Perceived Start-Speed Follow-up on 2026-07-05

- Result: enabled the existing realtime chat/TTS overlap path so GPT-SoVITS requests can begin before the whole assistant reply is finished.
- User priority: optimize time until the character starts speaking.
- Diagnosis:
  - Warm GPT-SoVITS direct requests for `Go sleep.` still took about `11.1s` to `13.5s` total.
  - `streaming_mode=1` reduced GPT-SoVITS time-to-first-byte to about `3ms` to `21ms`, but total WAV completion still took about `10.4s` to `11.2s`.
  - The current frontend uses `fetch(...).blob()` for `/api/tts`, so it cannot play GPT-SoVITS bytes until the response body is complete.
  - Existing frontend code already supports chat streaming plus stream TTS queueing; it had been disabled locally by `conversation_mode.chat_stream_enabled=false`, `tts.stream_mode=final_only`, and `tts.gpt_sovits_realtime_tts=false`.
- Fix:
  - Updated `config.local.json`:
    - `conversation_mode.chat_stream_enabled=true`
    - `tts.gpt_sovits_realtime_tts=true`
    - `tts.stream_mode=realtime`
    - `tts.stream_speak_idle_wait_ms=120`
    - `tts.gpt_sovits_streaming_mode=1`
  - This does not make a single GPT-SoVITS synthesis fast, but it overlaps LLM streaming with TTS generation so the first TTS request can start earlier.
- Verification:
  - `python -m json.tool config.local.json > $null; python -m json.tool config.example.json > $null; python -m json.tool package.json > $null`
    - Result: passed.
  - Config probe:
    - `chat_stream_enabled=True`
    - `gpt_sovits_realtime_tts=True`
    - `stream_mode=realtime`
    - `gpt_sovits_streaming_mode=1`
    - Client config exposes `gpt_sovits_realtime_tts=True`, `stream_mode=realtime`, and `chat_stream_enabled=True`.
  - `python -m pytest tests\test_config_asr_defaults.py tests\test_tts_language.py -q`
    - Result: passed, `23 passed`.
  - `node tests\test_chat_api_frontend.js`
    - Result: passed.
  - `node tests\test_character_runtime_frontend.js`
    - Result: passed.
  - `node --check web\appConfigController.js web\streamTtsQueueController.js web\chatReplyController.js`
    - Result: passed.
  - `git diff --check -- config.local.json progress.md session-handoff.md`
    - Result: passed.
  - Restarted the desktop project; `/config.json` reported `provider=gpt_sovits`, `stream_mode=realtime`, `gpt_sovits_realtime_tts=True`, `stream_speak_idle_wait_ms=120`, `server_request_timeout_ms=30000`, and `chat_stream_enabled=True`.
- Remaining risk:
  - True sub-second GPT-SoVITS playback would need a streaming audio playback path rather than `fetch(...).blob()`, or a faster TTS provider/model. The current change improves perceived latency by overlapping work, not by reducing GPT-SoVITS compute time.

## Frontend Runtime Efficiency v1 on 2026-07-10

- Result: completed view-aware script loading and idle speech-broadcast throttling while preserving the existing `/?view=model` and `/?view=chat` URLs.
- Loading changes:
  - `web/index.html` keeps the ordered script list in an inert template and loads it through `web/viewScriptLoader.js`.
  - Chat and combined views retain the complete ordered script list.
  - The default model view skips 50 chat-only or disabled-diagnostics scripts: 88 scripts / 1,742,867 bytes became 38 scripts / 618,298 bytes, reducing project JavaScript transfer by 1,124,569 bytes.
  - Model view with the existing developer flag enabled loads the complete manifest so diagnostics remain compatible.
  - Model startup reads runtime config without initializing chat history, reminders, proactive scheduling, persona, or chat controls.
- Idle runtime changes:
  - Active speech keeps frame-synchronous BroadcastChannel updates.
  - Idle state checks run every 250ms and unchanged payloads are not posted again.
  - The broadcast loop is idempotent and is cancelled/closed during `beforeunload`.
- Verification Evidence:
  - `node tests\test_frontend_runtime_efficiency.js` -> passed.
  - `node tests\test_performance_cue_frontend.js` -> passed.
  - `node scripts\run_node_tests.js` -> passed, all frontend tests.
  - `python scripts\check_js_syntax.py` -> passed, 132 files.
  - `node node_modules\electron\cli.js scripts\electron_ui_smoke.js --skip-chat` -> passed; chat status `待机`, model status `待机`, Live2D rendered with non-white ratio `0.1525`.
  - `powershell -NoProfile -ExecutionPolicy Bypass -File scripts\test-local.ps1` -> environment doctor passed; Python tests had the pre-existing MiMo auth-mock failure (`428 passed, 1 failed`) in `test_lightweight_llm_probe_allows_mimo_reasoning_budget`, so later steps did not run.
- Remaining risks:
  - The script loader intentionally uses parser-time `document.write` to preserve the legacy global-script order; a future module/bundler migration should replace this compatibility layer.
  - Manual observation of Task Manager over a longer idle session is still useful for measuring end-to-end CPU impact beyond the broadcast-loop regression test.

## Hermetic Test Stability v1 on 2026-07-10

- Result: removed the MiMo probe test's dependency on a workstation `OPENAI_API_KEY` without changing production authentication behavior.
- Change: `tests/test_character_runtime_integration.py` now supplies an explicit fake test key and asserts that the probe forwards it through the expected Authorization header.
- Verification Evidence:
  - Targeted MiMo/auth acceptance tests -> `20 passed`.
  - `python -m pytest -q` -> `429 passed`.
- Remaining risk: none identified; the fake credential exists only inside the mocked test path and is not a usable secret.

## Release Privacy Scan v1 on 2026-07-10

- Result: removed 61 user-specific Windows home paths from repository documentation/state evidence by replacing `C:\Users\<user>\` with `%USERPROFILE%\`.
- Secret and private-path detection rules were not relaxed.
- Verification Evidence:
  - `python scripts/check_secrets.py` -> passed, 536 files scanned.
  - `python -m pytest tests/test_check_secrets.py -q` -> `4 passed`, including the private-path rejection fixture.
  - `powershell -NoProfile -ExecutionPolicy Bypass -File scripts\test-local.ps1` -> complete pass: 429 Python tests, all Node tests, Python/JavaScript syntax and secret scan.
- Remaining risk: future verification logs must continue using `%USERPROFILE%` or another portable placeholder instead of a real username.

## Release Advisory Semantics v1 on 2026-07-10

- Result: default release validation no longer fails solely because an optional local demo service is offline.
- `scripts/check_release_readiness.ps1` now treats demo readiness as a warning by default and provides `-RequireDemoReadiness` for strict public-demo recording checks.
- User TTS provider and browser-fallback settings are not modified.
- Verification Evidence:
  - `python -m pytest tests/test_runtime_acceptance_scripts.py -q` -> `20 passed`.
  - Default release gate with `-SkipPackage -SkipInstaller` -> passed, including 430 Python tests, all Node tests, first-run preflight, character quality gate, and a non-blocking GPT-SoVITS advisory.
  - Direct `python scripts/check_demo_readiness.py` still exits non-zero while GPT-SoVITS is unavailable, preserving strict behavior.
- Remaining risk: a public demo should always use `-RequireDemoReadiness` or run the demo check directly.

## First-Run Package and Installer Verification on 2026-07-10

- Result: no additional packaging defects found.
- `scripts/check_first_run_package.ps1` passed: required files were present; private configs, `.env`, `node_modules`, logs and ignored probes were excluded; clean bootstrap, backend import, LLM configuration and safe defaults passed.
- `scripts/check_installer_smoke.ps1` passed: NSIS installer, source zip, checksums and release asset documentation were generated and validated.
- Remaining risk: these are build/smoke checks and do not replace a manual install/uninstall pass on a separate clean Windows account.

## Local HTTP Request Bounds v1 on 2026-07-10

- Result: all local POST routes now validate `Content-Length` before reading request bodies.
- Limits: chat/chat-stream 32 MB, ASR PCM JSON 8 MB, other JSON routes 2 MB.
- Invalid or negative lengths return 400; oversized bodies return 413 with the applicable limit.
- Existing API token and origin checks still run before body parsing.
- Verification Evidence:
  - `python -m py_compile app.py tests/test_character_runtime_integration.py` -> passed.
  - `python -m pytest tests/test_character_runtime_integration.py -q` -> `67 passed`, including raw-socket oversized and malformed length tests.
- Remaining risk: chat's 32 MB allowance intentionally supports current image attachments; future streaming uploads could reduce this further.

## Chat Developer Diagnostics Lazy Loading v1 on 2026-07-10

- Result: the 212,498-byte follow-up readiness panel controller no longer loads in normal chat sessions.
- The controller is installed by the existing developer feature loader when `?dev=1` or the existing local-storage flag is enabled.
- Normal mode uses a safe no-op proxy so core proactive scheduling and hidden diagnostic commands cannot crash when the panel is absent.
- Verification Evidence:
  - Full Node frontend suite passed.
  - Electron UI smoke passed: chat controls, learning/persona panels, doctor diagnostics and Live2D model all worked; chat/model status both reached `待机`.
- Remaining risk: the legacy panel API remains represented by many wrappers in `chat.js`; a later module-boundary refactor should move those wrappers with the panel.

## Renderer Content Security Policy v1 on 2026-07-10

- Result: chat/model renderers now use a restrictive CSP without `unsafe-eval`.
- The early inline view-class bootstrap moved to `web/earlyViewBootstrap.js`, allowing `script-src 'self'`.
- Pixi 6.5.8's official matching `@pixi/unsafe-eval` browser patch is vendored as a 3.9 KB runtime file and loaded immediately after Pixi; no npm runtime dependency was retained.
- `THIRD_PARTY_NOTICES.md` records the MIT-licensed compatibility patch.
- Verification Evidence:
  - Full Node frontend suite passed.
  - Electron UI smoke passed; chat and model reached `待机`, Live2D rendered with non-white ratio `0.1528`, and no CSP/unsafe-eval warning appeared.
- Remaining risk: the policy still permits inline styles because the existing UI updates style properties and uses legacy inline styling paths; scripts remain restricted to same-origin files.

## Electron Dependency Security v1 on 2026-07-10

- Result: upgraded Electron from 28.2.0 to the locked 39.8.10 patch release.
- The upgrade removes npm audit findings affecting old Electron releases, including high-severity use-after-free and renderer command-line injection advisories.
- Verification Evidence:
  - `npm audit --audit-level=high` -> 0 vulnerabilities.
  - Full Node frontend suite passed.
  - Electron UI smoke passed on Electron 39: transparent chat/model windows, preload bridge, panels and Live2D all worked.
- Remaining risk: this is a large Electron major-version jump even though current APIs passed smoke; installer/package smoke and a manual drag/audio check remain useful before release.

## Local Data Durability v1 on 2026-07-10

- Result: local JSON persistence now consistently falls back to a valid `.bak` when the primary file is missing or corrupt.
- Core memory, short-term memory and interaction memory use backup-aware reads.
- Generic JSON state saves use temporary-file replacement and retain the previous version; emotion state now uses this path instead of direct overwrite with swallowed errors.
- Existing JSON formats are unchanged.
- Verification Evidence:
  - `python -m py_compile memory.py memory_store.py emotion.py` -> passed.
  - `python -m pytest tests/test_memory_selection.py tests/test_emotion_persistence.py -q` -> `38 passed`.
- Remaining risk: backup recovery is intentionally read-only; the next successful save repairs the primary file, but the loader does not mutate files merely by reading them.

## Complete Audit Remediation Verification on 2026-07-10

- All code-level blockers identified in this audit sequence are implemented and verified.
- Final Verification Evidence:
  - `scripts/test-local.ps1` -> passed: 436 Python tests, all Node frontend tests, Python syntax 104 files, JavaScript syntax 134 files, secret scan 539 files.
  - `npm audit --audit-level=high` -> 0 vulnerabilities.
  - Electron 39 UI smoke -> passed with chat/model `待机`, Live2D rendered, CSP warning absent.
  - First-run source package smoke -> passed and includes `web/vendor/pixi-unsafe-eval.min.js`.
  - Installer smoke -> passed; installer exe, source zip, SHA256SUMS and release asset documentation validated.
  - JSON checks for `feature_list.json` and `package.json` -> passed.
  - `git diff --check` -> passed; only existing line-ending conversion warnings were reported.
- Environment-only advisory:
  - Local GPT-SoVITS on port 9880 was unavailable during checks. Default release validation now reports this without failing; strict public-demo readiness still correctly blocks until the service is started or the user selects browser TTS.

## Release Privacy Scan v1 on 2026-07-10

- Result: removed 61 user-specific Windows home paths from repository documentation/state evidence by replacing `C:\Users\<user>\` with `%USERPROFILE%\`.
- Secret and private-path detection rules were not relaxed.
- Verification Evidence:
  - `python scripts/check_secrets.py` -> passed, 536 files scanned.
  - `python -m pytest tests/test_check_secrets.py -q` -> `4 passed`, including the private-path rejection fixture.
  - `powershell -NoProfile -ExecutionPolicy Bypass -File scripts\test-local.ps1` -> complete pass: 429 Python tests, all Node tests, Python/JavaScript syntax and secret scan.
- Remaining risk: future verification logs must continue using `%USERPROFILE%` or another portable placeholder instead of a real username.

## Release Advisory Semantics v1 on 2026-07-10

- Result: default release validation no longer fails solely because an optional local demo service is offline.
- `scripts/check_release_readiness.ps1` now treats demo readiness as a warning by default and provides `-RequireDemoReadiness` for strict public-demo recording checks.
- User TTS provider and browser-fallback settings are not modified.
- Verification Evidence:
  - `python -m pytest tests/test_runtime_acceptance_scripts.py -q` -> `20 passed`.
  - Default release gate with `-SkipPackage -SkipInstaller` -> passed, including 430 Python tests, all Node tests, first-run preflight, character quality gate, and a non-blocking GPT-SoVITS advisory.
  - Direct `python scripts/check_demo_readiness.py` still exits non-zero while GPT-SoVITS is unavailable, preserving strict behavior.
- Remaining risk: a public demo should always use `-RequireDemoReadiness` or run the demo check directly.

## First-Run Package and Installer Verification on 2026-07-10

- Result: no additional packaging defects found.
- `scripts/check_first_run_package.ps1` passed: required files were present; private configs, `.env`, `node_modules`, logs and ignored probes were excluded; clean bootstrap, backend import, LLM configuration and safe defaults passed.
- `scripts/check_installer_smoke.ps1` passed: NSIS installer, source zip, checksums and release asset documentation were generated and validated.
- Remaining risk: these are build/smoke checks and do not replace a manual install/uninstall pass on a separate clean Windows account.

## Local HTTP Request Bounds v1 on 2026-07-10

- Result: all local POST routes now validate `Content-Length` before reading request bodies.
- Limits: chat/chat-stream 32 MB, ASR PCM JSON 8 MB, other JSON routes 2 MB.
- Invalid or negative lengths return 400; oversized bodies return 413 with the applicable limit.
- Existing API token and origin checks still run before body parsing.
- Verification Evidence:
  - `python -m py_compile app.py tests/test_character_runtime_integration.py` -> passed.
  - `python -m pytest tests/test_character_runtime_integration.py -q` -> `67 passed`, including raw-socket oversized and malformed length tests.
- Remaining risk: chat's 32 MB allowance intentionally supports current image attachments; future streaming uploads could reduce this further.

## Chat Developer Diagnostics Lazy Loading v1 on 2026-07-10

- Result: the 212,498-byte follow-up readiness panel controller no longer loads in normal chat sessions.
- The controller is installed by the existing developer feature loader when `?dev=1` or the existing local-storage flag is enabled.
- Normal mode uses a safe no-op proxy so core proactive scheduling and hidden diagnostic commands cannot crash when the panel is absent.
- Verification Evidence:
  - Full Node frontend suite passed.
  - Electron UI smoke passed: chat controls, learning/persona panels, doctor diagnostics and Live2D model all worked; chat/model status both reached `待机`.
- Remaining risk: the legacy panel API remains represented by many wrappers in `chat.js`; a later module-boundary refactor should move those wrappers with the panel.

## Renderer Content Security Policy v1 on 2026-07-10

- Result: chat/model renderers now use a restrictive CSP without `unsafe-eval`.
- The early inline view-class bootstrap moved to `web/earlyViewBootstrap.js`, allowing `script-src 'self'`.
- Pixi 6.5.8's official matching `@pixi/unsafe-eval` browser patch is vendored as a 3.9 KB runtime file and loaded immediately after Pixi; no npm runtime dependency was retained.
- `THIRD_PARTY_NOTICES.md` records the MIT-licensed compatibility patch.
- Verification Evidence:
  - Full Node frontend suite passed.
  - Electron UI smoke passed; chat and model reached `待机`, Live2D rendered with non-white ratio `0.1528`, and no CSP/unsafe-eval warning appeared.
- Remaining risk: the policy still permits inline styles because the existing UI updates style properties and uses legacy inline styling paths; scripts remain restricted to same-origin files.

## Electron Dependency Security v1 on 2026-07-10

- Result: upgraded Electron from 28.2.0 to the locked 39.8.10 patch release.
- The upgrade removes npm audit findings affecting old Electron releases, including high-severity use-after-free and renderer command-line injection advisories.
- Verification Evidence:
  - `npm audit --audit-level=high` -> 0 vulnerabilities.
  - Full Node frontend suite passed.
  - Electron UI smoke passed on Electron 39: transparent chat/model windows, preload bridge, panels and Live2D all worked.
- Remaining risk: this is a large Electron major-version jump even though current APIs passed smoke; installer/package smoke and a manual drag/audio check remain useful before release.

## Local Data Durability v1 on 2026-07-10

- Result: local JSON persistence now consistently falls back to a valid `.bak` when the primary file is missing or corrupt.
- Core memory, short-term memory and interaction memory use backup-aware reads.
- Generic JSON state saves use temporary-file replacement and retain the previous version; emotion state now uses this path instead of direct overwrite with swallowed errors.
- Existing JSON formats are unchanged.
- Verification Evidence:
  - `python -m py_compile memory.py memory_store.py emotion.py` -> passed.
  - `python -m pytest tests/test_memory_selection.py tests/test_emotion_persistence.py -q` -> `38 passed`.
- Remaining risk: backup recovery is intentionally read-only; the next successful save repairs the primary file, but the loader does not mutate files merely by reading them.

## Complete Audit Remediation Verification on 2026-07-10

- All code-level blockers identified in this audit sequence are implemented and verified.
- Final Verification Evidence:
  - `scripts/test-local.ps1` -> passed: 436 Python tests, all Node frontend tests, Python syntax 104 files, JavaScript syntax 134 files, secret scan 539 files.
  - `npm audit --audit-level=high` -> 0 vulnerabilities.
  - Electron 39 UI smoke -> passed with chat/model `待机`, Live2D rendered, CSP warning absent.
  - First-run source package smoke -> passed and includes `web/vendor/pixi-unsafe-eval.min.js`.
  - Installer smoke -> passed; installer exe, source zip, SHA256SUMS and release asset documentation validated.
  - JSON checks for `feature_list.json` and `package.json` -> passed.
  - `git diff --check` -> passed; only existing line-ending conversion warnings were reported.
- Environment-only advisory:
  - Local GPT-SoVITS on port 9880 was unavailable during checks. Default release validation now reports this without failing; strict public-demo readiness still correctly blocks until the service is started or the user selects browser TTS.

## Companion Turn Contract v1 Started on 2026-07-10

- Active feature changed from `character-performance-cue-v1` to `companion-turn-contract-v1` in `feature_list.json`.
- Scope: create a backward-compatible, versioned assistant-turn payload so the canonical model reply, subtitles, TTS, and Live2D performance use the same turn rather than independently rewriting or inferring state.
- Guardrails: preserve the current desktop-observation, tool-calling, privacy, and dependency defaults; defer additional Live2D asset work and relationship/memory changes to later features.
- Baseline: the existing worktree contains substantial pre-existing modifications and untracked feature files. No files were reverted or staged for this feature.

## Companion Turn Contract v1 Completed on 2026-07-10

- Result: model-direct replies now preserve the model-owned visible text through finalization, demo fallback, Character Runtime, and Character Brain route stages. Direct stream `delta` concatenation, final `reply`, `turn.reply_text`, and `turn.spoken_text` are identical.
- Added optional `companion_turn.enabled` (default `false`; enabled in the personal local configuration). It is independent from legacy `character_runtime` flags and exposes only a version, turn id, canonical text, modality, and allowlisted optional performance fields.
- The frontend validates the final `turn`, uses its performance plan over legacy/text inference when present, suppresses mutable realtime stream TTS for enabled turn mode, and starts final TTS/Live2D from the same canonical cue. Legacy/no-turn flow remains compatible.
- Files changed for this feature: `companion_turn_contract.py`, `app.py`, `app_chat_route.py`, `humanize.py`, `config.py`, `config.example.json`, `config.local.json`, `web/chatApi.js`, `web/chatReplyController.js`, `web/performanceCueController.js`, `web/appConfigController.js`, `web/chatState.js`, focused tests, and the Node test runner.
- Verification Evidence:
  - `python -m pytest tests/test_companion_turn_contract.py tests/test_app_chat_route.py tests/test_character_runtime_integration.py tests/test_app_reply_pipeline.py tests/test_reply_language_guard.py -q` -> `93 passed`.
  - `node tests/test_chat_api_frontend.js`, `node tests/test_performance_cue_frontend.js`, `node tests/test_companion_turn_contract_frontend.js`, and `node tests/test_character_runtime_frontend.js` -> passed.
  - `node scripts/run_node_tests.js` -> passed.
  - `powershell -NoProfile -ExecutionPolicy Bypass -File scripts\\test-local.ps1` -> passed: `446` Python tests, all Node frontend tests, Python syntax `106` files, JavaScript syntax `135` files, and secret scan `542` files.
  - JSON/compile checks and `git diff --check` -> passed (only existing line-ending advisory messages).
- Remaining risk: v1 deliberately delays server TTS until the final reply/turn arrives. A later version can restore lower-latency voice through non-retractable speech-segment events, not mutable raw deltas.

## Natural Character Dialogue v1 Started on 2026-07-10

- Active feature moved to `natural-character-dialogue-v1` after the turn contract completed.
- Scope: consolidate the current personal English companion prompt and remove random density/inner-state pressure in model-direct dialogue while retaining Chinese/English user input support and honest AI identity.
- Excluded: memory policy, relationship persistence, proactive behavior, desktop observation, tool use, permissions, and Live2D asset changes.

## Natural Character Dialogue v1 Completed on 2026-07-10

- Result: added one model-direct companion dialogue policy that supports Chinese or English input while keeping natural English output by default, permits Chinese only on a clear request, keeps humor/context grounded, and requires candid AI identity when identity or capability boundaries matter.
- Removed artificial direct-mode pressure: reply density no longer uses random roulette, emotion inner-state injection returns nothing, and both the runtime and inner-thought generator skip hidden thought generation for model-direct dialogue.
- Updated the personal local prompt from “do not say AI unless asked” to a candid AI-companion policy. Default/example prompts now also prohibit human impersonation while avoiding routine disclaimer boilerplate.
- Verification Evidence:
  - `python -m pytest tests/test_natural_character_dialogue.py tests/test_reply_language_guard.py tests/test_character_runtime_integration.py -q` -> `81 passed`.
  - Expanded targeted dialogue/contract suite -> `95 passed`.
  - `node scripts/run_node_tests.js` -> passed.
  - `powershell -NoProfile -ExecutionPolicy Bypass -File scripts\\test-local.ps1` -> passed: `452` Python tests, all Node frontend tests, Python syntax `108` files, JavaScript syntax `135` files, and secret scan `544` files.
  - JSON, Python compile, and `git diff --check` -> passed (only existing line-ending advisory messages).
- Remaining risk: legacy non-direct Character Brain and inner-thought paths intentionally retain their historical randomized behavior for compatibility. They are isolated from the personal model-direct configuration and should be retired or redesigned only in a separate legacy-path migration.

## Structured Relationship Growth v1 Started on 2026-07-10

- Active feature moved to `relationship-growth-v1` after the dialogue policy completed.
- Scope: local versioned relationship state, concise safe prompt snapshot, and user inspect/reset/correct controls for the personal companion.
- Excluded: desktop observation, tools, file/screenshot access, automated high-risk actions, and unreviewed free-text memory promotion.

## Structured Relationship Growth v1 Completed on 2026-07-10

- Result: the personal companion now has a separate, versioned `relationship_state.json` with atomic writes and backup recovery. It stores only a familiarity count plus four bounded interaction preferences: address, reply length, advice style, and teasing boundary.
- Safety: no chat transcript, screenshot, file path, secret, affinity score, romantic state, permission, desktop observation, tool access, or shell capability is stored or inferred. Only valid manual turns advance familiarity; clearly stated low-risk preferences can update the relevant field. Auto-chat never changes the state.
- Prompt behavior: model-direct and legacy paths receive a short structured snapshot only while the feature and local state are enabled. The current user message takes precedence, and the opaque legacy relationship summary is excluded when the structured feature is active.
- User experience: the existing Persona Card now shows local familiarity, editable preferences, pause/reload/save/reset controls, and an explicit reset boundary. Clearing a field and saving forgets that one preference; reset clears only this relationship state, not the Persona Card, core memories, or chat history.
- Files changed for this feature: `relationship_state.py`, `memory.py`, `app.py`, `config.py`, `config.example.json`, `config.local.json`, `.gitignore`, Persona Card frontend/controller files, focused Python/Node tests, and state artifacts.
- Verification Evidence:
  - `python -m pytest tests\test_relationship_state.py tests\test_api_health.py -q` -> `29 passed`.
  - `node tests\test_relationship_state_frontend.js` -> passed.
  - `python scripts\check_js_syntax.py` -> passed for `137` JavaScript files.
  - `powershell -NoProfile -ExecutionPolicy Bypass -File scripts\test-local.ps1` -> passed: `460` Python tests, all Node frontend tests, Python syntax `110` files, JavaScript syntax `137` files, and secret scan `548` files.
  - JSON validation for `config.example.json`, `package.json`, `feature_list.json`, and local config; scoped `git diff --check` -> passed.
- Manual check: visual inspection of the Persona Card confirmed the relationship section is scrollable and does not add a separate diagnostic page. A direct browser-only local page lacked the existing API token, so it correctly showed its request error without bypassing authentication; no security behavior was changed.

## Character Performance Cue v1 Resumed on 2026-07-10

- Active objective: use the already-stable companion turn contract to make speech-driven Live2D reactions more obvious, coherent, and recoverable during normal personal conversation.
- Scope: audit the existing cue-to-motion path and bundled Hiyori motions first; keep the current model, security defaults, text ownership, and user-controlled voice behavior intact.

## Character Performance Cue v1 Completed on 2026-07-10

- Result: reply performance is now selected by one shared cue-to-motion resolver in `web/performanceCueController.js`, so explicit actions are preserved across full and split-window Live2D views. Explicit `think` now selects the dedicated one-shot `Thinking` motion even at medium intensity.
- Timing: browser TTS dispatches the cue at `SpeechSynthesisUtterance.onstart`; server TTS dispatches it at `audio.onplay`; the AudioContext fallback dispatches it immediately after `source.start(0)`. Metadata arrival no longer starts the expression or action early. Text-only replies retain one local visual cue response.
- Model-direct companion turns now receive a conservative deterministic performance plan only for clear visible delivery signals. It does not alter or persist reply text, call another model, or override explicit runtime/brain metadata.
- Files changed: `companion_performance_director.py`, `companion_turn_contract.py`, performance/TTS/Live2D controllers, focused Python/Node regressions, and state artifacts.
- Verification Evidence:
  - `python -m pytest tests\test_companion_performance_director.py tests\test_companion_turn_contract.py tests\test_app_chat_route.py tests\test_character_runtime_integration.py -q` -> `89 passed`.
  - `node tests\test_performance_cue_frontend.js`, `node tests\test_character_runtime_frontend.js`, and `node tests\test_companion_turn_contract_frontend.js` -> passed.
  - `node scripts\run_node_tests.js` -> passed.
  - `powershell -NoProfile -ExecutionPolicy Bypass -File scripts\test-local.ps1` -> passed: `466` Python tests, all Node frontend tests, Python syntax `112` files, JavaScript syntax `137` files, and secret scan `550` files.
- Remaining manual check: validate the feel of the now-aligned timing in a normal personal voice session; it is not a security or correctness blocker.

## Conversation Flow v1 Started on 2026-07-10

- Active scope: improve continuity and recovery across text and voice without making the companion interruptive.
- Guardrails: preserve opt-in proactive behavior, existing cancellation paths, user-controlled settings, and fail-closed scheduling. Do not change memory policy, desktop observation, tools, permissions, or model assets in this feature.
- Next step: audit the existing follow-up, auto-chat, and voice-resume paths; choose one focused behavior with a regression test before implementation.

## Structured Relationship Growth v1 Completed on 2026-07-10

- Result: the personal companion now has a separate, versioned `relationship_state.json` with atomic writes and backup recovery. It stores only a familiarity count plus four bounded interaction preferences: address, reply length, advice style, and teasing boundary.
- Safety: no chat transcript, screenshot, file path, secret, affinity score, romantic state, permission, desktop observation, tool access, or shell capability is stored or inferred. Only valid manual turns advance familiarity; clearly stated low-risk preferences can update the relevant field. Auto-chat never changes the state.
- Prompt behavior: model-direct and legacy paths receive a short structured snapshot only while the feature and local state are enabled. The current user message takes precedence, and the opaque legacy relationship summary is excluded when the structured feature is active.
- User experience: the existing Persona Card now shows local familiarity, editable preferences, pause/reload/save/reset controls, and an explicit reset boundary. Clearing a field and saving forgets that one preference; reset clears only this relationship state, not the Persona Card, core memories, or chat history.
- Files changed for this feature: `relationship_state.py`, `memory.py`, `app.py`, `config.py`, `config.example.json`, `config.local.json`, `.gitignore`, Persona Card frontend/controller files, focused Python/Node tests, and state artifacts.
- Verification Evidence:
  - `python -m pytest tests\test_relationship_state.py tests\test_api_health.py -q` -> `29 passed`.
  - `node tests\test_relationship_state_frontend.js` -> passed.
  - `python scripts\check_js_syntax.py` -> passed for `137` JavaScript files.
  - `powershell -NoProfile -ExecutionPolicy Bypass -File scripts\test-local.ps1` -> passed: `460` Python tests, all Node frontend tests, Python syntax `110` files, JavaScript syntax `137` files, and secret scan `548` files.
  - JSON validation for `config.example.json`, `package.json`, `feature_list.json`, and local config; scoped `git diff --check` -> passed.
- Manual check: visual inspection of the Persona Card confirmed the relationship section is scrollable and does not add a separate diagnostic page. A direct browser-only local page lacked the existing API token, so it correctly showed its request error without bypassing authentication; no security behavior was changed.

## Character Performance Cue v1 Resumed on 2026-07-10

- Active objective: use the already-stable companion turn contract to make speech-driven Live2D reactions more obvious, coherent, and recoverable during normal personal conversation.
- Scope: audit the existing cue-to-motion path and bundled Hiyori motions first; keep the current model, security defaults, text ownership, and user-controlled voice behavior intact.

## Character Performance Cue v1 Completed on 2026-07-10

- Result: reply performance is now selected by one shared cue-to-motion resolver in `web/performanceCueController.js`, so explicit actions are preserved across full and split-window Live2D views. Explicit `think` now selects the dedicated one-shot `Thinking` motion even at medium intensity.
- Timing: browser TTS dispatches the cue at `SpeechSynthesisUtterance.onstart`; server TTS dispatches it at `audio.onplay`; the AudioContext fallback dispatches it immediately after `source.start(0)`. Metadata arrival no longer starts the expression or action early. Text-only replies retain one local visual cue response.
- Model-direct companion turns now receive a conservative deterministic performance plan only for clear visible delivery signals. It does not alter or persist reply text, call another model, or override explicit runtime/brain metadata.
- Files changed: `companion_performance_director.py`, `companion_turn_contract.py`, performance/TTS/Live2D controllers, focused Python/Node regressions, and state artifacts.
- Verification Evidence:
  - `python -m pytest tests\test_companion_performance_director.py tests\test_companion_turn_contract.py tests\test_app_chat_route.py tests\test_character_runtime_integration.py -q` -> `89 passed`.
  - `node tests\test_performance_cue_frontend.js`, `node tests\test_character_runtime_frontend.js`, and `node tests\test_companion_turn_contract_frontend.js` -> passed.
  - `node scripts\run_node_tests.js` -> passed.
  - `powershell -NoProfile -ExecutionPolicy Bypass -File scripts\test-local.ps1` -> passed: `466` Python tests, all Node frontend tests, Python syntax `112` files, JavaScript syntax `137` files, and secret scan `550` files.
- Remaining manual check: validate the feel of the now-aligned timing in a normal personal voice session; it is not a security or correctness blocker.

## Conversation Flow v1 Started on 2026-07-10

- Active scope: improve continuity and recovery across text and voice without making the companion interruptive.
- Guardrails: preserve opt-in proactive behavior, existing cancellation paths, user-controlled settings, and fail-closed scheduling. Do not change memory policy, desktop observation, tools, permissions, or model assets in this feature.
- Next step: audit the existing follow-up, auto-chat, and voice-resume paths; choose one focused behavior with a regression test before implementation.

## Conversation Flow v1 Completed on 2026-07-10

- Result: no-barge-in voice mode now takes a per-turn microphone pause lease while the assistant is active, so ASR does not hear the assistant through external speakers. Each turn releases only its own lease, including stale/cancelled turns.
- Result: the shared four-minute automatic-companion speech gate now covers both scheduled auto-chat and post-turn thought bursts. It remains opt-in and also blocks while a request is in flight, while either speaker is active, or while the user is typing.
- Result: browser TTS now records its completion at `SpeechSynthesisUtterance.onend`; text-only replies record their visible-delivery completion. This gives text and voice the same guarded silence-follow-up baseline.
- Files changed: `web/localAsrController.js`, `web/chatReplyController.js`, `web/chatState.js`, `web/autoChatController.js`, `web/ttsPlaybackController.js`, focused frontend regressions, and state artifacts.
- Verification Evidence:
  - Targeted local-ASR, companion-turn, character-runtime, and performance-cue frontend tests passed.
  - `powershell -NoProfile -ExecutionPolicy Bypass -File scripts\\test-local.ps1` -> passed: `466` Python tests, all Node frontend tests, Python syntax `112` files, JavaScript syntax `137` files, and secret scan `550` files.
- Remaining manual check: with external speakers and `interrupt_tts_on_user_speech=false`, confirm the assistant does not self-interrupt while real user speech is still recognized after playback ends.

## Memory Continuity v1 Started on 2026-07-10

- Active scope: audit the actual short-term/long-term memory selection and learning-review paths before changing behavior.
- Guardrails: keep memory promotion user-reviewed, keep correction/forget paths explicit, and do not add desktop, file, screenshot, or tool access.

## Memory Continuity v1 — In Progress on 2026-07-10

- Implemented and verified in focused tests: pure `continue` / `next step` now refresh an existing actionable short-term anchor instead of becoming a generic task; generic legacy anchors are skipped; a valid short-term anchor prevents stale transcript/Mem0 expansion for the same follow-up.
- Implemented and verified in focused tests: the backend drops a trailing duplicate current-user history item before the LLM sees it, so normal client turns no longer present the current short reply twice.
- Implemented and verified in focused tests: correction/forget requests no longer append themselves to raw memory/Mem0; they add hash-only recall suppressions for matching old facts, archive matching reviewed learning samples, clear derived legacy summaries, and prevent a clear relationship-address request from being reinterpreted as a new address.
- Verification Evidence: `python -m pytest tests\test_memory_selection.py tests\test_relationship_state.py tests\test_app_chat_route.py -q` -> `57 passed`; `python -m py_compile memory.py memory_selection.py relationship_state.py app_chat_route.py` -> passed.
- Historical incident: while adding the first regression, an isolation gap cleared the local derived summary files `memory_summary.json`, `memory_profile.json`, and `memory_relationship.json`. Raw interaction memory, core/short memory, and structured relationship state were not changed. The summaries remain intentionally blank; rebuilding them would send local interaction history to the configured LLM and therefore still requires explicit user authorization.

## Memory Continuity v1 Completed on 2026-07-10

- Short follow-ups such as `continue` and `next step` now refresh the best existing short-term task anchor without creating or promoting generic task memories. If an actionable short-memory anchor exists, stale raw/Mem0 expansion is not mixed into that follow-up.
- The chat route removes only an accidental trailing duplicate of the current user message before model/history processing, so a normal short reply is no longer shown twice to the model.
- Correction and forget handling now uses hash-only, exact source-turn fingerprints rather than keyword tombstones. A correction suppresses only the source turn of a concrete core/short memory it changed; an explicit forget may suppress raw/Mem0 turns only when the requested literal occurs in that turn. Shared English/CJK phrases cannot hide unrelated memories.
- Reviewed learning samples are no longer silently archived by a correction or forget request. New learning candidates retain bounded source-turn hashes; a sample is temporarily excluded only when every known source turn is suppressed. Legacy reviewed samples without a reliable source hash stay untouched.
- Derived summaries are no longer cleared. A correction/forget advances a private suppression revision, making an older summary ineligible for prompt injection while preserving the file and its backup. A later refresh is accepted only if it was built against the same revision and uses suppression-filtered raw turns.
- Relationship continuity now deduplicates retry/fallback turns using a bounded hash-only interaction-id cache. Address parsing accepts clear declarative naming preferences and rejects questions, negations, conditionals, temporal phrases, and ambiguous forget requests.
- The full test gate did not modify the three intentionally blank derived-summary files.
- Verification Evidence:
  - `python -m pytest tests\test_memory_selection.py tests\test_relationship_state.py tests\test_app_chat_route.py -q` -> `66 passed`.
  - `python -m py_compile memory.py relationship_state.py app_chat_route.py` -> passed.
  - `powershell -NoProfile -ExecutionPolicy Bypass -File scripts\test-local.ps1` -> passed: `481` Python tests, all Node frontend tests, Python syntax `112` files, JavaScript syntax `137` files, and secret scan `550` files.
  - Scoped `git diff --check` and JSON validation passed.
- Remaining manual decision: rebuild the intentionally blank derived summaries only if the user explicitly authorizes sending the existing local interaction history to the configured LLM provider.

## Companion Speech Prewarm v1 Completed on 2026-07-11

- Result: opt-in model-direct companion turns using GPT-SoVITS now prewarm one complete stable draft sentence while the model reply continues streaming. Audio stays silent until the canonical final turn confirms the exact prefix, then that blob plays once and only the remaining tail is synthesized normally.
- Mismatch, failure, cancellation, interruption, and late audio are discarded. Caller cancellation now reaches the TTS request and cannot trigger a retry.
- Live2D performance, subtitle, and speech animation activation for the prewarmed prefix are tied to actual HTML audio `onplay` or AudioContext fallback start.
- Verification Evidence:
  - `node tests\test_tts_api_frontend.js`, `node tests\test_companion_turn_contract_frontend.js`, and `node tests\test_performance_cue_frontend.js` -> passed.
  - `node scripts\run_node_tests.js` -> passed.
  - `powershell -NoProfile -ExecutionPolicy Bypass -File scripts\test-local.ps1` -> passed: `481` Python tests, all Node frontend tests, Python syntax `112` files, JavaScript syntax `137` files, secret scan `550` files.
  - `python scripts\check_character_v1_4.py` -> passed: `166` character Python tests and all character/chat/speech/TTS frontend checks.
  - JSON validation and scoped `git diff --check` -> passed.
- Remaining manual risk: strict demo readiness still cannot live-measure GPT-SoVITS first sound until the local endpoint is running. This feature did not change the selected provider, browser fallback preference, or any safety default.

## Release Experience Alignment v1 Completed on 2026-07-11

- Result: `config.preview.example.json` now activates the same intended companion contract as the personal experience: Chinese or English input, natural English by default, candid AI identity when relevant, model-direct replies, canonical companion turns, structured relationship continuity, and streamed text delivery.
- Safety retained: the preview profile stays on browser TTS with fallback, manual desktop attachment, no automatic observation/proactive chat, and tools/shell disabled.
- First-run behavior: the preview merge still preserves existing LLM provider, endpoint, model, API-key environment variable, and direct API-key field; it does not write a new key.
- Verification Evidence:
  - `python -m pytest tests\test_preview_experience_profile.py tests\test_runtime_acceptance_scripts.py -q` -> `23 passed`.
  - Clean source-package first-run smoke (`scripts\check_first_run_package.ps1`) -> passed, including preview merge, preserved LLM settings, and safety-default checks.
  - `powershell` parse checks for the preview-apply and first-run scripts -> passed.
  - `powershell -NoProfile -ExecutionPolicy Bypass -File scripts\test-local.ps1` -> passed: `485` Python tests, all Node frontend tests, Python syntax `113` files, JavaScript syntax `137` files, secret scan `551` files.
  - Public encoding check, JSON validation, and scoped `git diff --check` -> passed.
- Remaining manual risk: a clean package still needs a real configured-model chat and human voice/Live2D review before it can be claimed as a final release demonstration.

## Current Objective: Private Bilingual Voice Input v1 Started on 2026-07-11

- Active feature: `bilingual-voice-input-v1`.
- Audit evidence: local PCM ASR uses one Chinese Vosk model; browser recognition and wake listening are fixed to `zh-CN`; the current CJK cleanup removes English spaces. English spoken input is therefore not equivalent to typed input.
- Intended change: add an optional, local-only Chinese/English Vosk pair with per-utterance automatic selection. No models will be downloaded, no audio will be uploaded, and private model paths will remain server-only.
- Known boundary: two monolingual models can choose one Chinese or English whole-utterance candidate; reliable within-utterance code-switching needs a deliberately supplied multilingual model or a different ASR engine and is out of scope.

## Private Bilingual Voice Input v1 Completed on 2026-07-11

- Result: local ASR now accepts an optional user-provided English Vosk model alongside the existing Chinese model. In `auto`, it evaluates one complete utterance with each available local model and returns exactly one candidate; Chinese-only installations keep their existing behavior.
- Stability: model instances are path-keyed and bounded to the two most recently used paths. Near-tied cross-model results keep the compatibility-first Chinese candidate and are marked low-confidence so the existing confirmation flow can ask before assuming intent.
- Privacy: model paths remain server-only. The request body cannot select a model, health output only reports language availability, and model load failures return path-free client errors. No models were downloaded, no browser/cloud fallback was newly enabled, and `config.local.json` was not changed.
- Browser boundary: browser wake recognition remains one language at a time; `auto` preserves Chinese wake behavior, while explicit `en` uses English browser recognition. Local automatic language choice starts after the microphone is opened.
- Verification Evidence:
  - `python -m pytest tests\test_asr.py tests\test_app_asr_route.py tests\test_config_asr_defaults.py tests\test_app_health_asr.py -q` -> `39 passed`.
  - `node tests\test_bilingual_local_asr_frontend.js` and `node tests\test_local_asr_frontend.js` -> passed.
  - `powershell -NoProfile -ExecutionPolicy Bypass -File scripts\test-local.ps1` -> passed: `505` Python tests, all Node frontend tests, Python syntax `115` files, JavaScript syntax `138` files, and secret scan `554` files.
  - `python scripts\check_encoding.py --public`, JSON validation, and scoped `git diff --check` -> passed.
- Remaining manual risk: this workspace does not contain a configured English Vosk model, so a real English microphone comparison must be performed after the user supplies their preferred local model. Rapid Chinese-English code switching remains intentionally unsupported by the two-monolingual-model path.

## Current Objective: Private Bilingual Voice Input v1 Started on 2026-07-11

- Active feature: `bilingual-voice-input-v1`.
- Audit evidence: local PCM ASR uses one Chinese Vosk model; browser recognition and wake listening are fixed to `zh-CN`; the current CJK cleanup removes English spaces. English spoken input is therefore not equivalent to typed input.
- Intended change: add an optional, local-only Chinese/English Vosk pair with per-utterance automatic selection. No models will be downloaded, no audio will be uploaded, and private model paths will remain server-only.
- Known boundary: two monolingual models can choose one Chinese or English whole-utterance candidate; reliable within-utterance code-switching needs a deliberately supplied multilingual model or a different ASR engine and is out of scope.

## Private Bilingual Voice Input v1 Completed on 2026-07-11

- Result: local ASR now accepts an optional user-provided English Vosk model alongside the existing Chinese model. In `auto`, it evaluates one complete utterance with each available local model and returns exactly one candidate; Chinese-only installations keep their existing behavior.
- Stability: model instances are path-keyed and bounded to the two most recently used paths. Near-tied cross-model results keep the compatibility-first Chinese candidate and are marked low-confidence so the existing confirmation flow can ask before assuming intent.
- Privacy: model paths remain server-only. The request body cannot select a model, health output only reports language availability, and model load failures return path-free client errors. No models were downloaded, no browser/cloud fallback was newly enabled, and `config.local.json` was not changed.
- Browser boundary: browser wake recognition remains one language at a time; `auto` preserves Chinese wake behavior, while explicit `en` uses English browser recognition. Local automatic language choice starts after the microphone is opened.
- Verification Evidence:
  - `python -m pytest tests\test_asr.py tests\test_app_asr_route.py tests\test_config_asr_defaults.py tests\test_app_health_asr.py -q` -> `39 passed`.
  - `node tests\test_bilingual_local_asr_frontend.js` and `node tests\test_local_asr_frontend.js` -> passed.
  - `powershell -NoProfile -ExecutionPolicy Bypass -File scripts\test-local.ps1` -> passed: `505` Python tests, all Node frontend tests, Python syntax `115` files, JavaScript syntax `138` files, and secret scan `554` files.
  - `python scripts\check_encoding.py --public`, JSON validation, and scoped `git diff --check` -> passed.
- Remaining manual risk: this workspace does not contain a configured English Vosk model, so a real English microphone comparison must be performed after the user supplies their preferred local model. Rapid Chinese-English code switching remains intentionally unsupported by the two-monolingual-model path.

## Current Objective: Realtime TTS Performance Sync v1 Started on 2026-07-11

- Active feature: `realtime-tts-performance-sync-v1`.
- Audit evidence: the realtime stream queue currently triggers talk gestures at text enqueue while server TTS is still synthesizing; the final reply path also starts its speech timeline before actual stream playback. This is especially visible when GPT-SoVITS takes seconds to return audio.
- Intended change: preserve pre-reaction/thinking while speech is pending, but bind speaking motion, speech timeline, and post-settle timing to the first actual `onplay` / audio-context start event for the active stream session.
- Guardrails: no provider/configuration/permission changes; late, cancelled, failed, and stale audio must remain visually silent.

## Current Objective: Realtime TTS Performance Sync v1 Started on 2026-07-11

- Active feature: `realtime-tts-performance-sync-v1`.
- Audit evidence: the realtime stream queue currently triggers talk gestures at text enqueue while server TTS is still synthesizing; the final reply path also starts its speech timeline before actual stream playback. This is especially visible when GPT-SoVITS takes seconds to return audio.
- Intended change: preserve pre-reaction/thinking while speech is pending, but bind speaking motion, speech timeline, and post-settle timing to the first actual `onplay` / audio-context start event for the active stream session.
- Guardrails: no provider/configuration/permission changes; late, cancelled, failed, and stale audio must remain visually silent.

## Realtime TTS Performance Sync v1 Completed on 2026-07-11

- Result: queued realtime TTS no longer begins a talk gesture or semantic speech timeline when text is enqueued or a blob becomes ready. Those effects begin only at a real browser `onstart`, HTML audio `onplay`, or successful AudioContext `source.start` event.
- Direct and companion-turn paths: their speech timeline and fallback talk gesture now use the same actual-playback callback. A failed direct TTS request leaves the pending pre-reaction intact but cannot fake a speaking or settle phase. Text-only delivery still receives its intentionally non-audio visual response.
- Stream timing: if the first audio segment genuinely starts before the final semantic plan is available, the existing actual speech animation/gesture continues; the full plan joins the next real segment rather than replaying a visibly late speech-start pose. This remains valid after the text stream completes, until a newer turn supersedes the session.
- AudioContext safety: failed `source.start()` no longer marks audio as started, marks the stream as played, or suppresses the final speech watchdog.
- Known bounded follow-up: the watchdog currently guarantees that a stream has started at least once. A separate pending feature, `stream-tts-delivery-completeness-v1`, will address later queued-tail failures without replaying audio already heard.
- Verification Evidence:
  - `node tests\test_tts_playback_start_frontend.js`, `node tests\test_stream_tts_queue_frontend.js`, `node tests\test_companion_turn_contract_frontend.js`, and `node tests\test_performance_cue_frontend.js` -> passed.
  - `node scripts\run_node_tests.js` -> passed.
  - `powershell -NoProfile -ExecutionPolicy Bypass -File scripts\test-local.ps1` -> passed: `505` Python tests, all Node frontend tests, Python syntax `115` files, JavaScript syntax `140` files, and secret scan `556` files.
  - Scoped `git diff --check` -> passed for the touched synchronization files.
- Next active feature: `voice-listening-presence-v1`, focused on a restrained Live2D listening presence during microphone/VAD activity before the reply begins.

## Voice Listening Presence v1 Completed on 2026-07-11

- Result: opening the microphone now gives the Live2D companion a quiet, readable attentive pose before ASR finalization. Local VAD and browser recognition transition the session-bound state through `armed`, `hearing`, `release`, and `idle`; stale callbacks, mic pause/close, muted/disconnected tracks, and expired detached-window updates cannot revive an old pose.
- Performance boundary: the listening layer uses only eye, brow, gaze, head, body, and shoulder parameters, explicitly closes the mouth, and never triggers its own arm or hand gesture. Automatic idle, queued action-plan, direct motion-manager, and fallback transform motions are also deferred while the user is being heard. Explicit user taps and actual assistant audio remain available.
- Reliability: overlapping local ASR utterances are serialized instead of leaving VAD state/buffers attached to an earlier in-flight request. Detached model audio-priority state now expires when the sender stops updating, so a dead chat window cannot suppress listening indefinitely.
- Privacy: the split-window bridge carries only `{ version, sessionId, revision, phase }`; it never carries transcript text, raw audio, microphone level, or ASR confidence.
- Verification Evidence:
  - `node tests\test_local_asr_frontend.js`, `node tests\test_bilingual_local_asr_frontend.js`, `node tests\test_performance_cue_frontend.js`, `node tests\test_character_runtime_frontend.js`, and `node tests\test_frontend_runtime_efficiency.js` -> passed.
  - `node scripts\run_node_tests.js` -> passed.
  - `powershell -NoProfile -ExecutionPolicy Bypass -File scripts\test-local.ps1` -> passed: `505` Python tests, all Node frontend tests, Python syntax `115` files, JavaScript syntax `140` files, and secret scan `556` files.
- Remaining manual risk: the restrained pose values and release timing need a human microphone/Live2D feel check on the user's actual character scale and input device. No microphone data leaves the existing local path.

## Stream TTS Delivery Completeness v1 Completed on 2026-07-11

- Result: realtime TTS now keeps a per-session delivery ledger for every queued segment. It distinguishes queued/requesting/ready segments from a real playback start, normal completion, a failure before sound starts, and a failure after sound may have been heard.
- Recovery: after final stream text is known, the watchdog evaluates delivery completeness rather than the old "any segment started" flag. A failed or stalled tail recovers only the contiguous suffix that never began playback; previously audible text, including a partially heard failed segment, is never replayed.
- Stability: a pre-start failure stops later queue playback to preserve spoken order. A recovery token blocks queued, prefetched, and late callbacks from speaking old audio after the suffix fallback begins. Session and playback-generation checks prevent an interrupted or superseded turn from recovering into a new conversation.
- Compatibility: the original full-text fallback remains available only when no stream delivery ledger exists and no segment has played. Providers, browser fallback behavior, permissions, network policy, and private configuration were not changed.
- Verification Evidence:
  - `node tests\test_stream_tts_queue_frontend.js`, `node tests\test_stream_tts_delivery_completeness_frontend.js`, `node tests\test_tts_playback_start_frontend.js`, `node tests\test_companion_turn_contract_frontend.js`, `node tests\test_performance_cue_frontend.js`, and `node tests\test_character_runtime_frontend.js` -> passed.
  - `node scripts\run_node_tests.js` -> passed.
  - `powershell -NoProfile -ExecutionPolicy Bypass -File scripts\test-local.ps1` -> passed: `505` Python tests, all Node frontend tests, Python syntax `115` files, JavaScript syntax `141` files, and secret scan `557` files.
- Remaining manual risk: a real long GPT-SoVITS reply should be interrupted once during tail recovery to tune the bounded watchdog wait against the user's actual synthesis latency. The automated recovery path remains conservative: it prefers missing a partial audible fragment over replaying it.

## Current Objective: Bilingual Text Composition and Intentional Send v1 Started on 2026-07-11

- Audit evidence: the chat input currently submits on every `Enter` keydown, without `event.isComposing` or composition lifecycle handling. On Chinese IMEs, Enter may confirm a Pinyin candidate; sending at that moment can clear the unfinished input and create an accidental partial turn.
- Intended change: make keyboard submission composition-aware and once-only after intentional finalized Enter, while preserving the send button and ordinary Enter submission behavior. No conversation, model, provider, privacy, permission, or private-configuration behavior will change.

## Bilingual Text Composition and Intentional Send v1 Completed on 2026-07-11

- Result: chat input now tracks browser composition lifecycle. Enter used to confirm an active Chinese/Japanese/Korean IME candidate is ignored; Chromium's legacy `keyCode=229` ordering is also ignored. The input is neither cleared nor submitted until a normal finalized Enter occurs.
- Intentional send behavior: a normal non-repeating Enter submits once and prevents the native Enter default; held-key repeats cannot create duplicate/interruption turns. The Send button remains unchanged and available during/after composition.
- Verification Evidence:
  - `node tests\test_bilingual_text_composition_frontend.js` and `node scripts\run_node_tests.js` -> passed.
  - `powershell -NoProfile -ExecutionPolicy Bypass -File scripts\test-local.ps1` -> passed: `505` Python tests, all Node frontend tests, Python syntax `115` files, JavaScript syntax `142` files, and secret scan `558` files.
- Remaining manual risk: test Chinese Pinyin and Japanese/Korean IME candidate confirmation once in the user's normal Electron environment; the guard follows standard composition events and does not alter click-to-send.

## Current Objective: Generation- and Session-Bound Server TTS Cancellation v1 Started on 2026-07-11

- Audit evidence: interruption stops current playback but direct and realtime server synthesis requests do not consistently receive an AbortSignal. A slow obsolete GPT-SoVITS request can therefore continue consuming the local provider's single queue and delay the next user turn.
- Intended change: bind active direct/segmented/realtime synthesis requests to playback generation and stream session, abort them on interruption/new turn, and ensure cancellation never triggers stale retries, fallback speech, or provider-failure handling.

## Generation- and Session-Bound Server TTS Cancellation v1 Completed on 2026-07-11

- Result: every active client-side server-TTS request now receives a transient scope bound to its playback generation and, where available, stream session. Playback turnover and chat interruption abort only predecessor scopes; late cleanup cannot remove or cancel a newer request.
- Coverage: direct speech, companion prewarm, segmented prefetch/fallback, realtime stream fetches, no-prosody retries, queued-prefetch discard, final stream recovery, and latency hints now carry a cancellation signal. Voice-timeline pauses also settle immediately on interruption rather than waiting on a cleared timer.
- Cancellation semantics: caller abort is kept separate from provider failure. It does not retry, schedule stream recovery, increment the provider failure streak, mark the provider unavailable, or invoke browser-TTS fallback. Retry backoff and audio-body reads are abortable as well.
- Verification Evidence:
  - `node tests\test_server_tts_cancellation_frontend.js`, `node tests\test_tts_api_frontend.js`, `node tests\test_stream_tts_queue_frontend.js`, `node tests\test_stream_tts_delivery_completeness_frontend.js`, and `node tests\test_companion_turn_contract_frontend.js` -> passed.
  - `node scripts\run_node_tests.js` -> passed.
  - `powershell -NoProfile -ExecutionPolicy Bypass -File scripts\test-local.ps1` -> passed: `505` Python tests, all Node frontend tests, Python syntax `115` files, JavaScript syntax `143` files, and secret scan `559` files.
- Remaining boundary: the browser now promptly cancels its request, retry, and playback work. The existing Python route may still finish a synthesis already running inside the upstream GPT-SoVITS call; provider-side cancellation needs a separate, explicitly authorized backend protocol.

## Current Objective: Split-Window Speech Timebase and Stale-State Cleanup v1 Started on 2026-07-11

- Audit evidence: the chat-to-model speech bridge sends renderer-local `performance.now()` deadlines, while the model renderer compares them against its own unrelated `performance.now()` origin. A delayed or cross-window update can therefore appear already expired or indefinitely current, leaving Live2D visibly speaking or suppressing idle motion at the wrong time.
- Intended change: replace the cross-window timing representation with a shared timebase or duration-based contract, retain revision/session fencing, and make stale remote speech clear safely without touching active local audio.

## Split-Window Speech Timebase and Stale-State Cleanup v1 Completed on 2026-07-11

- Result: the speech bridge now uses a versioned renderer-independent contract: wall-clock expiries plus sender identity, monotonically increasing revision, session/generation context, and active heartbeat. The model window translates each accepted expiry into its own local performance clock; raw sender `performance.now()` deadlines no longer cross windows.
- Reliability: stale and already-expired packets are ignored, while older revisions cannot revive a completed turn. A dead sender clears only the model's mirrored speech state (mouth/audio projection, remote deadline, and remote cue expiry); it does not affect local full-window audio. Remote high-energy cues are applied once per speech identity, capped to their transmitted expiry, and cannot repeat on heartbeat updates.
- Verification Evidence:
  - `node tests\test_split_window_speech_timebase_frontend.js`, `node tests\test_performance_cue_frontend.js`, `node tests\test_frontend_runtime_efficiency.js`, and `node tests\test_character_runtime_frontend.js` -> passed.
  - `node scripts\run_node_tests.js` -> passed.
  - `powershell -NoProfile -ExecutionPolicy Bypass -File scripts\test-local.ps1` -> passed: `505` Python tests, all Node frontend tests, Python syntax `115` files, JavaScript syntax `144` files, and secret scan `560` files.
- Remaining manual risk: run one real Electron chat/model split-window speech cycle and close the chat window mid-release to tune the 900 ms mirrored-audio freshness threshold against the user's hardware. The bridge payload contains no transcript or raw audio.

## Current Objective: Local Speech Timebase Consistency v1 Started on 2026-07-11

- Audit evidence: local speech animation fields are written using `performance.now()`, while a few chat-turn and automatic-follow-up predicates compare them with `Date.now()`. That mismatch makes the visual release window appear already expired to those policy paths.
- Intended change: audit and align only the local timebase consumers, preserving actual audio priority, user interruption policy, and the completed split-window bridge contract.

## Local Speech Timebase Consistency v1 Completed on 2026-07-11

- Result: local chat-turn interruption, important-speech arbitration, auto-chat, and turn-interjection checks now compare the `speechAnimUntil` release window against the renderer's `performance.now()` clock. Actual audio, stream work, and the existing 80 ms release grace remain authoritative exactly as before.
- Long-uptime stability: protected-speech elapsed time now explicitly evaluates performance-clock audio/animation timestamps against the performance clock and the assistant-turn wall timestamp against wall time. It no longer guesses the source clock from a numeric threshold, avoiding a misclassification after a long-running renderer.
- Coverage: a focused divergent-clock regression verifies the user-speech interruption path, automatic companion gate, turn-interjection deferral, expiry behavior, app-level dependency injection, and the long-uptime protected-speech calculation.
- Verification Evidence:
  - `node tests\test_local_speech_timebase_frontend.js`, `node tests\test_companion_turn_contract_frontend.js`, `node tests\test_character_runtime_frontend.js`, and `node tests\test_split_window_speech_timebase_frontend.js` -> passed.
  - `node scripts\run_node_tests.js` -> passed.
  - `powershell -NoProfile -ExecutionPolicy Bypass -File scripts\test-local.ps1` -> passed: `505` Python tests, full Node suite, Python syntax `115` files, JavaScript syntax `145` files, and secret scan `561` files.
  - Scoped `git diff --check` -> passed.
  - `powershell -NoProfile -ExecutionPolicy Bypass -File scripts\test-local.ps1` -> passed: `524` Python tests, all Node frontend tests, Python syntax `117` files, JavaScript syntax `158` files, and secret scan `579` files.
- Remaining manual check: play one short real reply, begin speaking during its visible release tail, and confirm that the current interruption preference feels natural. The 80 ms grace remains intentionally non-blocking.

## Generation- and Session-Bound Server TTS Cancellation v1 Completed on 2026-07-11

- Result: every active client-side server-TTS request now receives a transient scope bound to its playback generation and, where available, stream session. Playback turnover and chat interruption abort only predecessor scopes; late cleanup cannot remove or cancel a newer request.
- Coverage: direct speech, companion prewarm, segmented prefetch/fallback, realtime stream fetches, no-prosody retries, queued-prefetch discard, final stream recovery, and latency hints now carry a cancellation signal. Voice-timeline pauses also settle immediately on interruption rather than waiting on a cleared timer.
- Cancellation semantics: caller abort is kept separate from provider failure. It does not retry, schedule stream recovery, increment the provider failure streak, mark the provider unavailable, or invoke browser-TTS fallback. Retry backoff and audio-body reads are abortable as well.
- Verification Evidence:
  - `node tests\test_server_tts_cancellation_frontend.js`, `node tests\test_tts_api_frontend.js`, `node tests\test_stream_tts_queue_frontend.js`, `node tests\test_stream_tts_delivery_completeness_frontend.js`, and `node tests\test_companion_turn_contract_frontend.js` -> passed.
  - `node scripts\run_node_tests.js` -> passed.
  - `powershell -NoProfile -ExecutionPolicy Bypass -File scripts\test-local.ps1` -> passed: `505` Python tests, all Node frontend tests, Python syntax `115` files, JavaScript syntax `143` files, and secret scan `559` files.
- Remaining boundary: the browser now promptly cancels its request, retry, and playback work. The existing Python route may still finish a synthesis already running inside the upstream GPT-SoVITS call; provider-side cancellation needs a separate, explicitly authorized backend protocol.

## Current Objective: Split-Window Speech Timebase and Stale-State Cleanup v1 Started on 2026-07-11

- Audit evidence: the chat-to-model speech bridge sends renderer-local `performance.now()` deadlines, while the model renderer compares them against its own unrelated `performance.now()` origin. A delayed or cross-window update can therefore appear already expired or indefinitely current, leaving Live2D visibly speaking or suppressing idle motion at the wrong time.
- Intended change: replace the cross-window timing representation with a shared timebase or duration-based contract, retain revision/session fencing, and make stale remote speech clear safely without touching active local audio.

## Split-Window Speech Timebase and Stale-State Cleanup v1 Completed on 2026-07-11

- Result: the speech bridge now uses a versioned renderer-independent contract: wall-clock expiries plus sender identity, monotonically increasing revision, session/generation context, and active heartbeat. The model window translates each accepted expiry into its own local performance clock; raw sender `performance.now()` deadlines no longer cross windows.
- Reliability: stale and already-expired packets are ignored, while older revisions cannot revive a completed turn. A dead sender clears only the model's mirrored speech state (mouth/audio projection, remote deadline, and remote cue expiry); it does not affect local full-window audio. Remote high-energy cues are applied once per speech identity, capped to their transmitted expiry, and cannot repeat on heartbeat updates.
- Verification Evidence:
  - `node tests\test_split_window_speech_timebase_frontend.js`, `node tests\test_performance_cue_frontend.js`, `node tests\test_frontend_runtime_efficiency.js`, and `node tests\test_character_runtime_frontend.js` -> passed.
  - `node scripts\run_node_tests.js` -> passed.
  - `powershell -NoProfile -ExecutionPolicy Bypass -File scripts\test-local.ps1` -> passed: `505` Python tests, all Node frontend tests, Python syntax `115` files, JavaScript syntax `144` files, and secret scan `560` files.
- Remaining manual risk: run one real Electron chat/model split-window speech cycle and close the chat window mid-release to tune the 900 ms mirrored-audio freshness threshold against the user's hardware. The bridge payload contains no transcript or raw audio.

## Current Objective: Local Speech Timebase Consistency v1 Started on 2026-07-11

- Audit evidence: local speech animation fields are written using `performance.now()`, while a few chat-turn and automatic-follow-up predicates compare them with `Date.now()`. That mismatch makes the visual release window appear already expired to those policy paths.
- Intended change: audit and align only the local timebase consumers, preserving actual audio priority, user interruption policy, and the completed split-window bridge contract.

## Local Speech Timebase Consistency v1 Completed on 2026-07-11

- Result: local chat-turn interruption, important-speech arbitration, auto-chat, and turn-interjection checks now compare the `speechAnimUntil` release window against the renderer's `performance.now()` clock. Actual audio, stream work, and the existing 80 ms release grace remain authoritative exactly as before.
- Long-uptime stability: protected-speech elapsed time now explicitly evaluates performance-clock audio/animation timestamps against the performance clock and the assistant-turn wall timestamp against wall time. It no longer guesses the source clock from a numeric threshold, avoiding a misclassification after a long-running renderer.
- Coverage: a focused divergent-clock regression verifies the user-speech interruption path, automatic companion gate, turn-interjection deferral, expiry behavior, app-level dependency injection, and the long-uptime protected-speech calculation.
- Verification Evidence:
  - `node tests\test_local_speech_timebase_frontend.js`, `node tests\test_companion_turn_contract_frontend.js`, `node tests\test_character_runtime_frontend.js`, and `node tests\test_split_window_speech_timebase_frontend.js` -> passed.
  - `node scripts\run_node_tests.js` -> passed.
  - `powershell -NoProfile -ExecutionPolicy Bypass -File scripts\test-local.ps1` -> passed: `505` Python tests, full Node suite, Python syntax `115` files, JavaScript syntax `145` files, and secret scan `561` files.
  - Scoped `git diff --check` -> passed.
- Remaining manual check: play one short real reply, begin speaking during its visible release tail, and confirm that the current interruption preference feels natural. The 80 ms grace remains intentionally non-blocking.

## Current Objective: No-Barge-In Voice Turn Queue v1 Started on 2026-07-11

- Audit evidence: `localAsrController` removes each finalized transcript from its queue before asking for a non-interrupting chat turn. If a previous assistant turn is still `chatBusy`, `chatReplyController` returns `false` immediately and the real user utterance is never retried.
- Intended change: retain only non-interrupting voice items while an existing assistant turn is busy, retry them in FIFO order with a bounded wait, and clear pending work on manual mic close/stale session. Barge-in-enabled voice turns must retain their current immediate interruption behavior.

## No-Barge-In Voice Turn Queue v1 Completed on 2026-07-11

- Result: a voice transcript finalized while no-barge-in mode is waiting on an active assistant turn now remains at the queue head instead of being removed and silently rejected. It retries after a short bounded delay, then dispatches in original FIFO order when the turn is idle.
- Safety: queued items carry their microphone session and wall-clock enqueue time. Manual mic close and new session start cancel pending retry work; stale sessions and a 30-second active-turn wait expire only the affected queued item. Existing barge-in voice turns still dispatch immediately with interruption enabled.
- Voice handoff: a deferred voice request now receives a bounded 30-second speech-turn wait so an audio-release window cannot immediately reject the retained transcript after the previous chat turn has become idle.
- Verification Evidence:
  - `node tests\test_no_barge_in_voice_turn_queue_frontend.js`, `node tests\test_local_asr_frontend.js`, `node tests\test_bilingual_local_asr_frontend.js`, `node tests\test_companion_turn_contract_frontend.js`, and `node tests\test_character_runtime_frontend.js` -> passed.
  - `node scripts\run_node_tests.js` -> passed.
  - `powershell -NoProfile -ExecutionPolicy Bypass -File scripts\test-local.ps1` -> passed: `505` Python tests, full Node suite, Python syntax `115` files, JavaScript syntax `146` files, and secret scan `562` files.
  - Scoped `git diff --check` and JavaScript syntax checks -> passed.
- Remaining manual check: with no-barge-in enabled, speak one sentence just as a prior reply begins/continues, then confirm it appears once after the reply finishes. Also close the mic during the wait once to confirm it does not send later.

## Current Objective: Split-Window Performance Phase Bridge v1 Started on 2026-07-11

- Audit evidence: Electron desktop mode separates chat and model renderers. The chat renderer executes early thinking/pre-reaction phases but has no Live2D model, while the model renderer receives only speech/listening bridge state. During an LLM/TTS delay, the desktop character can therefore appear inert even though the full view is expressive.
- Intended change: bridge a compact, safe non-speech phase with expiry/revision fencing to the detached model renderer. Reuse existing action/pulse fallbacks, never start a mouth/speech animation, and keep the full view local to avoid duplicate motion.

## Split-Window Performance Phase Bridge v1 Completed on 2026-07-11

- Result: desktop chat/model windows now mirror compact non-speech `pre_reaction` and bounded `thinking_wait` phases. A detached model receives only allowlisted action/pulse fields, a turn id, revision, and an absolute expiry; no user transcript, reply text, raw audio, prompt, or provider data crosses the bridge.
- Visible lifecycle: the pre-reaction begins before the model call; if first reply text is still absent after the existing 520 ms waiting threshold, the detached model receives one restrained thinking action. The phase is cleared on first visible text, latency-hint start, actual speech start, interruption, normal completion, sender shutdown, expiry, and a newer turn.
- Safety: receiver-side phase revisions prevent duplicate heartbeat replays and stale/reordered packets from reviving an old reaction. Phase dispatch uses the existing expression-pulse/action-plan path only; it never writes mouth, speech animation, or audio state. Full view keeps the action local and does not create a duplicate bridge dispatch.
- Verification Evidence:
  - `node tests\test_split_window_performance_phase_bridge_frontend.js`, `node tests\test_split_window_speech_timebase_frontend.js`, `node tests\test_companion_turn_contract_frontend.js`, `node tests\test_stream_tts_queue_frontend.js`, `node tests\test_tts_playback_start_frontend.js`, `node tests\test_performance_cue_frontend.js`, and `node tests\test_frontend_runtime_efficiency.js` -> passed.
  - `node scripts\run_node_tests.js` -> passed.
  - `powershell -NoProfile -ExecutionPolicy Bypass -File scripts\test-local.ps1` -> passed: `505` Python tests, full Node suite, Python syntax `115` files, JavaScript syntax `147` files, and secret scan `563` files.
  - Scoped `git diff --check` and JavaScript syntax checks -> passed.
- Remaining manual check: launch the real Electron desktop split view, send a prompt with a deliberately slow response, and confirm the model makes one readable early reaction/brief thinking beat before speech without duplicate or late motion after the reply begins.

## Current Objective: No-Barge-In Audio Lease Completeness v1 Started on 2026-07-11

- Audit evidence: a chat turn acquires its microphone pause lease before the model request, but the realtime stream path only queues TTS work and releases the lease when the LLM stream finishes. Queued server audio can therefore still be playing after `chatBusy` clears and the microphone reopens.
- Intended change: bind no-barge microphone release to the finalized realtime session/generation's actual delivery settlement or cancellation, and keep the deferred ASR queue behind any active assistant audio as a defensive second boundary. Direct/text-only/error paths must retain their current prompt release behavior.

## No-Barge-In Audio Lease Completeness v1 Completed on 2026-07-11

- Result: a realtime stream now owns its microphone pause lease until the finalized session/generation's queued audio has actually completed, safe tail recovery has returned, or the turn is cancelled. A playback-start callback alone cannot release the lease.
- Lifecycle: delivery settlement is maintained in a renderer-local session/generation waiter map rather than user-visible state. Normal queue completion, safe final-tail recovery, abort, stale session, and stale playback generation resolve only the matching waiter. A replacement turn keeps its own independent pause depth.
- Defense in depth: a no-barge ASR queue now also defers behind active assistant audio or realtime queue work after `chatBusy` clears, while barge-in remains immediate.
- Verification Evidence:
  - Focused stream delivery, companion-turn lease, and no-barge queue frontend tests -> passed.
  - `node scripts\run_node_tests.js` -> passed.
  - `powershell -NoProfile -ExecutionPolicy Bypass -File scripts\test-local.ps1` -> passed: `505` Python tests, all Node frontend tests, Python syntax `115` files, JavaScript syntax `147` files, and secret scan `563` files.
- Remaining manual check: with no-barge-in enabled and speakers in use, send a multi-sentence realtime reply, speak just before its last segment ends, and confirm the microphone stays suspended until the tail finishes without submitting the companion's own audio.

## Current Objective: Delivered-Turn Persistence v1 Started on 2026-07-11

- Audit evidence: backend chat routes persist assistant memory and relationship updates before the terminal JSON/SSE response is successfully delivered, while the renderer can cancel a stale turn and remove its unfinished row. This can make a reply the user never saw alter long-term familiarity, preferences, or later recall.
- Intended change: add a bounded one-shot local delivery acknowledgement for the terminal reply. Persist the assistant side only after the current renderer has finalized the visible assistant row; cancellation, failed terminal writes, stale callbacks, duplicates, unknown ids, and expiry must be safe no-ops.

## Delivered-Turn Persistence v1 Completed on 2026-07-11

- Result: receipt-aware desktop chat now delays assistant memory, relationship, and character-session advancement until the current visible assistant row is finalized. Legacy API clients that do not declare the capability retain their prior immediate-persistence behavior, so existing scripts do not silently stop learning.
- Delivery reliability: receipts serialize commit callbacks, keep a short bounded completed outcome for safe retry after a lost ACK response, distinguish `committed`/`already_committed` from unconfirmed outcomes, and serialize runtime reset behind any active commit. Concurrent character-session updates now perform their read/derive/write cycle atomically.
- Frontend behavior: ACKs use a bounded FIFO retry queue backed only by session-scoped opaque receipt IDs and scheduling metadata. Reload recovery and a page-close keepalive attempt are supported; a subsequent receipt-aware request sends bounded pending IDs so the server can commit an already-visible prior turn before planning the next one.
- Compatibility and documentation: `docs/delivery-receipt-protocol.md` documents the opt-in request capability, statuses, retry boundary, and privacy constraints. No reply text, prompt, audio, token, or desktop data is stored in the ACK queue.
- Verification Evidence:
  - Focused backend receipt/session/route/API/continuity suite -> `118 passed`.
  - `node tests\test_chat_api_frontend.js` and `node tests\test_companion_turn_contract_frontend.js` -> passed.
  - `node scripts\run_node_tests.js` -> passed.
  - `powershell -NoProfile -ExecutionPolicy Bypass -File scripts\test-local.ps1` -> passed: `519` Python tests, all Node frontend tests, Python syntax `117` files, JavaScript syntax `147` files, and secret scan `566` files.
- Remaining boundary: the pre-existing memory pipeline spans several local files and background extractors, so an exceptional mid-commit failure is reported as `commit_failed` and is deliberately not blindly replayed. A cross-store durable transaction journal would be a separate persistence feature; this slice prevents unseen replies and false ACK success without inventing a partial replay guarantee.

## Current Objective: Split-Window Speech Style Bridge v1 Started on 2026-07-11

- Audit evidence: the detached Electron model window already mirrors speech timing and mood, but does not receive the authoritative `speechAnimStyle` / `currentTalkStyle`. As a result, playful, comforting, steady, and clear spoken delivery can look neutral despite the main/full renderer having the right Live2D controls.
- Intended change: extend only the existing compact revisioned `taffy-speech` bridge with an allowlisted talk-style enum, apply it after existing stale/expiry validation, and cover the receiver-to-expression path. No text, audio, providers, prompts, private configuration, or model assets will cross the bridge.

## Split-Window Speech Style Bridge v1 Completed on 2026-07-11

- Result: the chat renderer now broadcasts only the existing allowlisted `neutral`, `playful`, `comfort`, `steady`, or `clear` speech style. The detached model applies a valid received value to both `speechAnimStyle` (mouth cadence) and `currentTalkStyle` (expression/body layer).
- Safety: style is applied only after the existing sender identity, revision, timestamp, and expiry checks. Missing/invalid values preserve the current style; stale and expired packets cannot revive it. A non-speaking packet may update style but cannot start mouth or speech motion.
- Verification Evidence:
  - `node tests\test_split_window_speech_timebase_frontend.js` and `node tests\test_performance_cue_frontend.js` -> passed.
  - `node scripts\run_node_tests.js` -> passed.
  - `powershell -NoProfile -ExecutionPolicy Bypass -File scripts\test-local.ps1` -> passed: `519` Python tests, all Node frontend tests, Python syntax `117` files, JavaScript syntax `147` files, and secret scan `566` files.
- Remaining manual check: run a real Electron chat/model split-window reply with a clearly playful and a clearly comforting delivery. Confirm the detached model's mouth cadence plus body/expression rhythm visibly differ without a late neutral flash at the speech tail.

## Current Objective: Per-Turn Browser Playback Generation Continuity v1 Started on 2026-07-11

- Audit evidence: Browser TTS increments `ttsPlaybackGeneration` when playback starts. The reply controller holds the previous generation for the whole turn, so actual Browser `onstart` callbacks can be rejected as stale; multi-segment voice timelines can also reject their later browser segments. This affects the default Browser TTS route and server-TTS fallback to Browser TTS, creating a text/voice and Live2D timing mismatch.
- Intended change: retain strict cross-turn cancellation fencing while making the expected Browser generation handoff continuous within one current turn/session. Cover direct, streamed fallback, and multi-segment voice timelines without changing providers, server behavior, or private configuration.

## Delivered-Turn Persistence v1 Completed on 2026-07-11

- Result: receipt-aware desktop chat now delays assistant memory, relationship, and character-session advancement until the current visible assistant row is finalized. Legacy API clients that do not declare the capability retain their prior immediate-persistence behavior, so existing scripts do not silently stop learning.
- Delivery reliability: receipts serialize commit callbacks, keep a short bounded completed outcome for safe retry after a lost ACK response, distinguish `committed`/`already_committed` from unconfirmed outcomes, and serialize runtime reset behind any active commit. Concurrent character-session updates now perform their read/derive/write cycle atomically.
- Frontend behavior: ACKs use a bounded FIFO retry queue backed only by session-scoped opaque receipt IDs and scheduling metadata. Reload recovery and a page-close keepalive attempt are supported; a subsequent receipt-aware request sends bounded pending IDs so the server can commit an already-visible prior turn before planning the next one.
- Compatibility and documentation: `docs/delivery-receipt-protocol.md` documents the opt-in request capability, statuses, retry boundary, and privacy constraints. No reply text, prompt, audio, token, or desktop data is stored in the ACK queue.
- Verification Evidence:
  - Focused backend receipt/session/route/API/continuity suite -> `118 passed`.
  - `node tests\test_chat_api_frontend.js` and `node tests\test_companion_turn_contract_frontend.js` -> passed.
  - `node scripts\run_node_tests.js` -> passed.
  - `powershell -NoProfile -ExecutionPolicy Bypass -File scripts\test-local.ps1` -> passed: `519` Python tests, all Node frontend tests, Python syntax `117` files, JavaScript syntax `147` files, and secret scan `566` files.
- Remaining boundary: the pre-existing memory pipeline spans several local files and background extractors, so an exceptional mid-commit failure is reported as `commit_failed` and is deliberately not blindly replayed. A cross-store durable transaction journal would be a separate persistence feature; this slice prevents unseen replies and false ACK success without inventing a partial replay guarantee.

## Current Objective: Split-Window Speech Style Bridge v1 Started on 2026-07-11

- Audit evidence: the detached Electron model window already mirrors speech timing and mood, but does not receive the authoritative `speechAnimStyle` / `currentTalkStyle`. As a result, playful, comforting, steady, and clear spoken delivery can look neutral despite the main/full renderer having the right Live2D controls.
- Intended change: extend only the existing compact revisioned `taffy-speech` bridge with an allowlisted talk-style enum, apply it after existing stale/expiry validation, and cover the receiver-to-expression path. No text, audio, providers, prompts, private configuration, or model assets will cross the bridge.

## Split-Window Speech Style Bridge v1 Completed on 2026-07-11

- Result: the chat renderer now broadcasts only the existing allowlisted `neutral`, `playful`, `comfort`, `steady`, or `clear` speech style. The detached model applies a valid received value to both `speechAnimStyle` (mouth cadence) and `currentTalkStyle` (expression/body layer).
- Safety: style is applied only after the existing sender identity, revision, timestamp, and expiry checks. Missing/invalid values preserve the current style; stale and expired packets cannot revive it. A non-speaking packet may update style but cannot start mouth or speech motion.
- Verification Evidence:
  - `node tests\test_split_window_speech_timebase_frontend.js` and `node tests\test_performance_cue_frontend.js` -> passed.
  - `node scripts\run_node_tests.js` -> passed.
  - `powershell -NoProfile -ExecutionPolicy Bypass -File scripts\test-local.ps1` -> passed: `519` Python tests, all Node frontend tests, Python syntax `117` files, JavaScript syntax `147` files, and secret scan `566` files.
- Remaining manual check: run a real Electron chat/model split-window reply with a clearly playful and a clearly comforting delivery. Confirm the detached model's mouth cadence plus body/expression rhythm visibly differ without a late neutral flash at the speech tail.

## Current Objective: Per-Turn Browser Playback Generation Continuity v1 Started on 2026-07-11

- Audit evidence: Browser TTS increments `ttsPlaybackGeneration` when playback starts. The reply controller holds the previous generation for the whole turn, so actual Browser `onstart` callbacks can be rejected as stale; multi-segment voice timelines can also reject their later browser segments. This affects the default Browser TTS route and server-TTS fallback to Browser TTS, creating a text/voice and Live2D timing mismatch.
- Intended change: retain strict cross-turn cancellation fencing while making the expected Browser generation handoff continuous within one current turn/session. Cover direct, streamed fallback, and multi-segment voice timelines without changing providers, server behavior, or private configuration.

## Per-Turn Browser Playback Generation Continuity v1 Completed on 2026-07-11

- Result: Browser TTS now has a separate per-utterance playback token while the global `ttsPlaybackGeneration` remains the cross-turn cancellation lease. Chat-owned direct speech, segmented speech, latency hints, prewarm tails, and final stream fallback/recovery opt into preserving the current turn's generation, so valid Browser `onstart` callbacks can start the canonical Live2D speech timeline instead of being discarded as stale.
- Safety: default direct Browser calls still advance the global generation. Current-turn Browser speech uses token checks for `onstart`, `onend`, `onerror`, and silent-start watchdogs; interrupted or superseded callbacks settle as obsolete and cannot cancel newer speech. Server TTS invalidates any Browser token before calling `speechSynthesis.cancel()`.
- Verification Evidence:
  - `node tests\test_tts_playback_start_frontend.js` and `node tests\test_companion_turn_contract_frontend.js` -> passed.
  - `node scripts\run_node_tests.js` -> passed.
  - `powershell -NoProfile -ExecutionPolicy Bypass -File scripts\test-local.ps1` -> passed: `519` Python tests, full Node frontend suite, Python syntax `117` files, JavaScript syntax `147` files, and secret scan `566` files.
- Remaining boundary: this fixes valid same-turn Browser playback identity. A separate follow-up is now active for cancelled playback promise settlement, because stopped HTML/AudioContext/Browser playback can still leave some callers waiting for old callback timeouts.

## Current Objective: Cancelled Playback Promise Settlement v1 Started on 2026-07-11

- Audit evidence: cancellation currently stops media and invalidates tokens/generations, but some playback promises depend on native `onended`, `onerror`, or timeout callbacks that may not fire after manual stop/cancel. In no-barge-in flows, that can hold a chat-owned microphone pause lease until a watchdog window instead of settling promptly.
- Intended change: add explicit cancellation settlement for playback waiters while preserving session/generation fencing and without changing providers, backend routes, ASR, memory, permissions, private configuration, or model assets.

## Cancelled Playback Promise Settlement v1 Completed on 2026-07-11

- Result: Browser TTS, HTML audio, and AudioContext playback now register local cancellation waiters. `stopCurrentMediaInPlace()` resolves those waiters before cancelling speech synthesis, pausing HTML audio, or stopping an AudioContext buffer source, so interrupted/superseded playback promises no longer wait for missing native callbacks or long fallback timers.
- Safety: waiters unregister on normal success, failure, stale resolution, and cancellation. Cancelled Browser speech resolves through the same `settle(false)` path that cleans up the waiter; cancelled HTML audio revokes its object URL; cancelled AudioContext playback is explicitly reported as cancelled/stale and cannot be mistaken for successful audio. Newer current playback keeps its own token/generation checks.
- Verification Evidence:
  - `node tests\test_tts_playback_start_frontend.js` -> passed, including Browser, HTML audio, and AudioContext cancellation-settlement regressions.
  - `node scripts\run_node_tests.js` -> passed.
  - `powershell -NoProfile -ExecutionPolicy Bypass -File scripts\test-local.ps1` -> passed: `519` Python tests, full Node frontend suite, Python syntax `117` files, JavaScript syntax `147` files, and secret scan `566` files.
- Remaining manual check: in the real Electron app with no-barge-in enabled, interrupt a speaking reply and confirm the microphone resumes promptly without waiting for the old playback timeout. Also test one normal Browser TTS reply and one server-TTS fallback reply to confirm speech motion still starts on actual audio.

## Current Objective: Companion Experience Diagnostics v1 Started on 2026-07-12

- Audit evidence: chat and TTS already emit useful performance events, but they are fragmented across console logs and TTS debug events. There is no compact per-turn view of first headers, first visible text, reply readiness, TTS readiness, first audible playback, completion, or fallback/cancellation outcome during a real Electron session.
- Intended change: add a developer-only, bounded, text-free latency collector and panel using the existing performance events and developer lazy-loader. The normal view must not load it, and no conversation text, audio, prompts, credentials, local paths, or desktop data may be retained.

## Companion Experience Diagnostics v1 Completed on 2026-07-12

- Result: developer mode now exposes an `体验延迟` control and a compact recent-turn panel for API headers, first visible text, reply readiness, TTS response readiness, first actual Browser/HTML/AudioContext sound, and playback completion. The collector reuses the existing chat/TTS trace id and keeps at most 12 recent turns in renderer memory.
- Privacy and runtime boundary: only allowlisted timings, provider/mode enums, numeric status, and bounded outcome/fallback tokens are retained. Text, character counts, audio, prompts, credentials, model paths, and desktop data are discarded. The module is loaded only by the existing developer-feature loader; normal views do not install it.
- Playback behavior: Browser TTS, HTML audio, and AudioContext paths now emit diagnostic-only play-start/play-end performance events. Their existing generation/session checks, cancellation, playback, fallback, provider selection, and Live2D callbacks are unchanged.
- Verification Evidence:
  - `node tests\test_companion_experience_diagnostics_frontend.js`, `node tests\test_tts_playback_start_frontend.js`, `node tests\test_frontend_runtime_efficiency.js`, and `node tests\test_character_runtime_frontend.js` -> passed.
  - `node scripts\run_node_tests.js` -> passed, including the new diagnostics regression.
  - `powershell -NoProfile -ExecutionPolicy Bypass -File scripts\test-local.ps1` -> passed: `519` Python tests, the full Node frontend suite, Python syntax `117` files, JavaScript syntax `149` files, and secret scan `568` files.
  - JSON validation and scoped `git diff --check` -> passed.
- Remaining manual check: launch Electron with developer mode (`?dev=1` or the existing local developer flag), open `体验延迟`, and run one Browser TTS turn plus one GPT-SoVITS/fallback turn. Confirm the visible first-sound numbers match perceived delay. This slice intentionally does not persist or export measurements.
- Recommended next feature: use those real measurements to implement provider-capability-gated streaming audio playback without changing the user's provider choice or safety defaults.

## Hiyori Daily Conversation Gestures v1 Started on 2026-07-19

- Goal: make routine conversation read as restrained companionship rather than a sequence of exaggerated reactions, using only parameters already present in the compiled Hiyori model.
- Added canonical director actions for a double acknowledgement, attentive listening tilt, thought entry and resolution, caring lean, shy glance, phrase emphasis, and sentence release. Existing nod, disagreement, forward/back lean, and happy bounce remain compatible.
- Timeline integration: recognized cues such as `head_tilt`, `side_eye`, `thinking_nod`, speech-start cues, `embarrassed_recovery`, and settle cues now stay on the Hiyori parameter director. Unsupported cues, `wave`, and non-Hiyori models retain the existing Cubism motion path.
- Motion quality: all new actions use zero-velocity quintic entry/exit curves, delayed head/body/shoulder follow-through, bounded amplitudes, existing priority/cooldown rules, and the established approximately 190 ms interruption crossfade.
- Model boundary: the repository has `.moc3` and existing parameter metadata but no `.cmo3`; the change cannot add deformation that is absent from the rig.
- Verification Evidence:
  - `node tests\test_hiyori_performance_director_frontend.js` -> passed.
  - `node tests\test_performance_cue_frontend.js` -> passed.
  - `node tests\test_free_chat_regression.js` -> passed.
  - `node tests\test_stage_frontend.js` -> passed.
  - `node --check web\hiyoriPerformanceDirector.js` and `node --check web\chat.js` -> passed.
  - Scoped `git diff --check` -> passed.
  - The first full Node run exposed an exact-source wrapper assertion for `playEmotion`; its contract check was updated to accept the intentional multi-line Hiyori routing wrapper while still requiring delegation to `motionRuntimeController`.
  - `node scripts\run_node_tests.js` -> passed after the intentional wrapper contract update.
  - `powershell -NoProfile -ExecutionPolicy Bypass -File scripts\test-local.ps1` -> passed: `524` Python tests, all Node frontend tests, Python syntax `117` files, JavaScript syntax `158` files, and secret scan `579` files.
- Manual follow-up: test one ordinary reply, one question, one comforting reply, and one sentence with emphasis in Electron; judge whether the new motion remains visible without overpowering Hiyori's original idle character.

## Hiyori Transition Continuity Pass on 2026-07-19

- Problem: individual poses and actions eased internally, but switching ownership between idle, listen, think, speak, and release could still remove one layer's channels in a single frame. That read as stiffness even when each isolated action curve was smooth.
- Result: the director now sends its final additive parameter set through an elapsed-time critically damped transition mixer. Face, head, torso/shoulder, arms/hands, and secondary-motion channels have tuned response rates so gaze and head lead while the body follows and settles.
- All hand-offs share the same inertia: idle micro-motion can fade under listening, thinking releases into audible speech, semantic actions retain the existing interruption crossfade, and speech shoulder/torso energy decays after audio ends instead of dropping immediately.
- Runtime properties: no new render loop or timer was added; duplicate timestamps do not advance channel state; absent parameters decay to zero and are pruned; long frame gaps are bounded; unsupported models remain on their original motion path.
- Verification Evidence:
  - `node tests\test_hiyori_performance_director_frontend.js` -> passed, including full mode-chain continuity, speech-to-idle momentum, duplicate-timestamp stability, and 60/120 Hz channel convergence.
  - `node tests\test_performance_cue_frontend.js` -> passed.
  - `node tests\test_live2d_render_performance_frontend.js` -> passed.
  - `node tests\test_free_chat_regression.js` -> passed.
  - JavaScript syntax and scoped `git diff --check` -> passed.
  - `powershell -NoProfile -ExecutionPolicy Bypass -File scripts\test-local.ps1` -> passed: `524` Python tests, all Node frontend tests, Python syntax `117` files, JavaScript syntax `158` files, and secret scan `579` files.
- Manual follow-up: compare the first 0.5 seconds of listening, thought-to-speech onset, adjacent speech accents, and the first second after speech ends. Remaining tuning should adjust response rates rather than adding more competing motion layers.

## Stage Header Refinement v2 Completed on 2026-07-19

- Accepted concept: `<CODEX_HOME>/generated_images/019f6ba6-9db1-7900-af62-ce3a41139137/exec-92d682e8-ad2b-4bc8-86b5-5c6ff9d6a6a3.png`.
- Replaced the mismatched Windows title strip with Electron's hidden title bar plus native overlay controls, an app-owned 30px drag surface, and day/night-aware control-symbol contrast.
- Reduced the control rail from 70px to 56px, tightened its top gap and outer margins, softened borders/shadows, removed hard status separators, and reduced icon/button proportions.
- Native fidelity loop fixed five visible mismatches: washed-out center control, clipped room selector, rectangular status blocks, disconnected title/header materials, and an unclear title icon. The clipped selector was caused by the glass rail creating a containing block and now uses rail-relative absolute centering.
- Electron interaction proof: Auto, Day, and Night remained accessible toggle buttons; Night switched the room, selected state, title surface, and native window symbols; Auto was restored after QA.
- Verification Evidence:
  - `node tests\test_stage_frontend.js` -> passed.
  - `node tests\test_stage_theme_frontend.js` -> passed.
  - `node tests\test_button_value_ui.js` -> passed.
  - `powershell -NoProfile -ExecutionPolicy Bypass -File scripts\test-local.ps1` -> passed: `524` Python tests, all Node frontend tests, Python syntax `117` files, JavaScript syntax `158` files, and secret scan `579` files.

## Stage Header Refinement v1 Started on 2026-07-19

- Direction: preserve the existing left identity/status, centered auto/day/night selector, and right voice/subtitle controls. Restyle only the top surface as a refined anime livestream companion header.
- Accepted concept reference: `<CODEX_HOME>/generated_images/019f6ba6-9db1-7900-af62-ce3a41139137/exec-fed49a89-bbe9-44fb-9fe0-e38eebb7b2c7.png`.
- Implementation: the three disconnected floating clusters now sit visually inside one 70px rail. Night uses restrained ink glass; day uses warm ivory glass. Brand/status spacing, the compact semantic status dot, theme-segment proportions, quiet enabled states, icon scale, hover depth, focus behavior, and 1040/820px fallbacks were retuned.
- Preservation: no HTML information architecture, click handler, room transition, Live2D layout, history card, composer, utility bar, renderer loop, or model asset changed.
- Verification Evidence:
  - `node tests\test_stage_frontend.js` -> passed.
  - `node tests\test_stage_theme_frontend.js` -> passed.
  - `node tests\test_button_value_ui.js` -> passed.
  - Scoped `git diff --check` -> passed.
  - `powershell -NoProfile -ExecutionPolicy Bypass -File scripts\test-local.ps1` -> passed: `524` Python tests, all Node frontend tests, Python syntax `117` files, JavaScript syntax `158` files, and secret scan `579` files.
- Native Electron verification: on 2026-07-19 the user explicitly authorized opening the app. The real `馨语AI桌宠` stage was restored through the existing second-instance path and captured at 1290x860 in day mode. The unified rail, three-zone alignment, responsive spacing, unobstructed Live2D center, non-overlapping composer/send control, and detached utility group all rendered correctly. Day material is intentionally soft; its reduced contrast remains a taste preference rather than a functional defect.

## Unified Control Center UI v1 Completed on 2026-07-19

- Accepted Image2 concept: `C:/Users/MQL/.codex/generated_images/019f6ba6-9db1-7900-af62-ce3a41139137/exec-ff8dde34-20f4-466a-b0e7-67c449c31267.png`.
- Result: the More launcher, schedule, persona, model/voice, memory management, and diagnostics now share one warm translucent day/night-aware control center. Existing fields, buttons, requests, storage, and fallback behavior remain in place.
- Information hierarchy: each feature page uses the same 220px navigation rail, compact header, restrained field/card density, scrollable content area, and stable action footer. Narrow windows switch to a horizontal feature rail without losing controls.
- Diagnostics: `故障自检` now opens a dedicated page with running, complete, and error states plus a readable report, while still appending the existing report to chat for compatibility.
- More launcher: code-native icons replace generic capsules, desktop controls expose `aria-pressed`, and the launcher is raised clear of the composer. No new animation loop or Live2D work was introduced.
- Fidelity pass fixed five visible mismatches: blue SaaS decoration leaking through model/voice, oversized schedule controls, bright memory statistic/empty blocks, mixed emoji iconography, and persona/detail colors that escaped the shared palette. The configuration footer status was also reduced to a quiet single-line indicator.
- Browser verification: desktop day/night layouts, all five navigation targets, real diagnostics output, and a 680x760 narrow-window pass were checked. The full workflow from More to model/voice and between all control-center pages remained interactive.
- Native Electron verification: the real 1300x860 stage kept Live2D centered; More opened without covering the composer; model/voice loaded the private local configuration in the new shell. The transparent Live2D renderer now has a distinct native title so the stage and renderer can be identified reliably without affecting rendering.
- Verification Evidence:
  - `node scripts\run_node_tests.js` -> passed, including `tests\test_control_center_frontend.js`.
  - `powershell -NoProfile -ExecutionPolicy Bypass -File scripts\test-local.ps1` -> passed: `524` Python tests, all Node frontend tests, Python syntax `117` files, JavaScript syntax `160` files, and secret scan `582` files.
  - JSON validation and `git diff --check` -> passed.
- Remaining risk: very long translated labels can still truncate in compact summary cells by design; the full value remains available in its editable field. No `.bak` file or unrelated dirty work was modified.

## Unified Control Center Progressive Disclosure Pass on 2026-07-19

- Accepted Image2 concept: `C:/Users/MQL/.codex/generated_images/019f6ba6-9db1-7900-af62-ce3a41139137/exec-67668576-1273-4369-a52e-d4cadf1b59bd.png`.
- Model/voice now defaults to three readable cards for chat model, voice, and Live2D role. API endpoints, keys, stream mode, timeouts, model paths, technical tests, summaries, and other secondary controls remain available under one `高级设置` disclosure.
- Persona, memory, and diagnostics use the same progressive-disclosure pattern. Persona's bulk/template footer, relationship detail, memory filters/batch tools, and the raw diagnostics report no longer compete with the first task.
- Day uses warm ivory surfaces with dark plum text; night uses explicit warm-charcoal page, card, and field colors with off-white text. Legacy model/voice backgrounds, borders, gradients, text shadows, and cramped two-column fields are overridden.
- Control-center navigation opens the target surface before closing the current one, removing the intermediate stage flash. The opaque control-center backdrop also prevents chat cards from showing around diagnostics.
- Diagnostics no longer appends its running state, report, or failures to chat. Legacy technical self-check records are filtered when chat history loads; ordinary diagnostic hints and ordinary conversation remain intact.
- Browser fidelity loop fixed: hidden common cards, inherited giant body border, clipped side-by-side values, overflowing advanced cards, cluttered persona actions, stage flash, and diagnostics chat pollution. Desktop day/night, advanced expansion, config-to-persona switching, diagnostics execution, and a 390x844 no-horizontal-overflow check passed.
- Native Electron window discovery found the correct `馨语AI桌宠` and `馨语AI桌宠 · Live2D` windows, but the Windows capture helper twice returned `foreground window did not report a process id`; no coordinate fallback was attempted. A native screenshot remains the only manual check.
- Verification Evidence:
  - `node scripts\\run_node_tests.js` -> passed.
  - `powershell -NoProfile -ExecutionPolicy Bypass -File scripts\\test-local.ps1` -> passed: `524` Python tests, all Node frontend tests, Python syntax `117` files, JavaScript syntax `160` files, and secret scan `582` files.
  - Focused control-center, character-runtime, JavaScript syntax, JSON, and scoped whitespace checks passed.
- No Live2D render loop, frame timing, model asset, private configuration, `.bak` file, or unrelated dirty work was changed.

## Technical Message History Isolation Pass on 2026-07-19

- Technical outputs now use an explicit `category: "system"` contract. The chat message controller refuses to persist that category even if a caller omits `persist: false`, providing a second guard at the history boundary.
- Model tests, voice tests, character rehearsals/tuning, command debug reports, startup errors, Live2D runtime notices, and chat transport errors may remain visible during the current session but do not enter chat history. Model/voice test outcomes remain available in their dedicated configuration status area.
- History loading filters legacy assistant-side technical records from earlier versions. The filter is role-aware, so user messages with similar wording are preserved.
- Normal user/assistant conversation, proactive companion replies, emotional companion responses, and reminders retain their existing persistence behavior.
- Browser interaction proof: running `/ttsdebug` produced one transient system row while both the command and report remained absent from storage; after reload the report was no longer visible and the system-row count returned to zero.
- Verification Evidence:
  - `node tests\\test_control_center_frontend.js` -> passed.
  - `node tests\\test_character_runtime_frontend.js` -> passed.
  - `node tests\\test_config_switch_frontend.js` -> passed.
  - `node scripts\\run_node_tests.js` -> passed.
  - `powershell -NoProfile -ExecutionPolicy Bypass -File scripts\\test-local.ps1` -> passed: `524` Python tests, all Node frontend tests, Python syntax `117` files, JavaScript syntax `160` files, and secret scan `582` files.
- No Live2D rendering/motion path, automatic companion behavior, reminder persistence, private configuration, `.bak` file, or unrelated dirty work was changed.

## Qwen3-TTS Low-Latency Trial v1 Completed on 2026-07-27

- Added optional `qwen3_tts` provider support across configuration sanitization, health checks, the TTS route, provider selection UI, frontend capability state, cancellable PCM playback, and server fallback handling. Existing GPT-SoVITS and Browser TTS settings remain valid and are not removed.
- Added an isolated `faster-qwen3-tts` FastAPI runtime plus setup/start scripts. Dependencies and the `Qwen/Qwen3-TTS-12Hz-0.6B-CustomVoice` weights stay outside the repository; `Vivian` is only the temporary bilingual evaluation voice.
- Removed a major model-direct latency gate for Qwen only: because the backend contract guarantees `spoken_text` is exactly the streamed visible reply, stable streamed sentence segments can start synthesis before the final companion performance envelope arrives. Non-model-direct and other-provider paths keep the conservative finalization gate.
- Target hardware evidence after CUDA Graph warmup on the RTX 5060 Laptop GPU: direct service Chinese first audio `214-388 ms`, English `241-330 ms`; project adapter Chinese `331 ms`, English `232 ms`. Whole short utterances completed in about `1.0-1.7 s`. The prior configured GPT-SoVITS baseline was about `1.4 s` Chinese and `4.3 s` English to first audio.
- Resource evidence: Qwen runtime plus the open desktop workload used about `6.0/8.0 GB` VRAM, leaving about `1.9 GB`. GPT-SoVITS was stopped before Qwen loading; the two local TTS engines should not be kept resident together on this machine.
- Verification passed: focused `48` Python tests across Qwen/config/TTS/health plus Qwen frontend, character-runtime, and realtime stream queue checks; full `scripts\test-local.ps1` then passed with `553` Python tests, all Node frontend tests, Python syntax for `123` files, JavaScript syntax for `163` files, and secret scan for `602` files. JSON validation and scoped `git diff --check` also passed.
- The private local provider was switched to Qwen while preserving all GPT-SoVITS fields for rollback. A full Electron restart is required to reload frontend provider state. Formal original Xinyu voice creation remains deferred until the remaining experience work is complete.
- Remaining manual risk: listen to several Chinese, English, and mixed-language turns in Electron and judge Vivian's pronunciation, expressiveness, segment joins, and sustained GPU responsiveness. This trial proves the architecture and latency, not the final character voice.

## Inline Sticker and Translation Persistence v1 Completed on 2026-07-27

- Successful assistant translations are now stored on the corresponding chat record. History restoration renders the stored translation immediately; eligible legacy records without one still use the existing translation service and save the result for later restarts.
- User and assistant stickers share one presentation rule: when related text exists, the sticker is stored on that text record and displayed after the words at `1.85em`, with a restrained arrival motion. Sticker-only legacy/fallback records remain supported but are capped at a compact icon-sized card.
- Legacy standalone sticker records are migrated to the nearest prior same-role text record during history loading. The migrated representation is saved, while the LLM history remains text-only.
- Chat body typography now uses a CJK-aware system stack, slightly improved weight, spacing, and line height. Character display typography and existing day/night card materials are unchanged.
- Verification:
  - `node tests\test_sticker_frontend.js` -> passed, including inline sticker, legacy migration, translation persistence, and restart restoration coverage.
  - `node scripts\run_node_tests.js` -> passed.
  - `powershell -NoProfile -ExecutionPolicy Bypass -File scripts\test-local.ps1` -> passed: `563` Python tests, all Node frontend tests, Python syntax `125` files, JavaScript syntax `163` files, and secret scan `606` files.
- Existing unrelated dirty changes and all `.bak` files were preserved; nothing was committed or pushed.
- Electron was restarted after validation. The app backend restarted with it, while the warmed SenseVoice and Qwen3-TTS services remained running.

## Compact Character Prompt and Personality Calibration v1 Completed on 2026-07-27

- Character direction: Xinyu now has one concise model-direct contract centered on mischievous unpredictability, relevant tangents, sharper but bounded teasing, and understated practical care. It explicitly avoids fixed joke, sentence-count, and habitual-question templates.
- Prompt budget: under the same private configuration and the same no-history comfort probe, the assembled system prompt fell from about `2053` to `1234` `cl100k_base` tokens (`39.9%`). A coding-achievement probe reached about `1547` tokens because relevant private memory was intentionally retained.
- Deduplication: model-direct turns no longer append a second language block or the older overlapping style plus humanization blocks. A small per-turn direction preserves contextual tone and recent-opening avoidance.
- Character brain: model-direct text and voice turns use a compact social director. Intent, topic continuity, barge-in policy, improv stance, chaos, delivery shape, banter, follow-up, safety, grounding, and the primary directive remain model-visible; full motion, voice, stage, and public performance metadata remain available to the runtime without being duplicated into the LLM prompt.
- Calibration: explicit completed-action statements such as fixing a bug now outrank generic task-help keyword matches, so the character celebrates with playful bite instead of treating the win as an unresolved support request.
- Compatibility: manual persona, wakeup/profile memory, structured relationship state, relevant memory recall, experience feedback, safety boundaries, tool definitions, companion-turn metadata, configured reply language, legacy non-model-direct behavior, and private configuration were preserved. No `.bak` file was touched.
- Config examples: the built-in and preview persona text now describes an original Xinyu who is opinionated, surprising but relevant, occasionally sharp, and quietly caring without claiming human senses or unavailable access.
- Configured-provider evidence:
  - Before: three ordinary no-history turns completed in about `12.4 s`, `15.0 s`, and `30.1 s`; first visible content was often delivered only at completion.
  - After: the same three probes completed in about `19.2 s`, `14.0 s`, and `13.8 s`. Median moved from about `15.0 s` to `14.0 s`, but the sample is too small and provider variance too high to claim a stable latency win.
  - A minimal 71-character system prompt still took about `16.2-18.0 s` to first content. The remaining long wait is therefore mainly upstream model/stream compatibility, not prompt length.
  - The configured upstream interpreted Chinese probe text as question marks even under the minimal prompt. English probes were used for personality QA; this provider/input compatibility issue was not mixed into the character-prompt change.
- Verification Evidence:
  - Focused character, prompt-budget, language, thought-burst, chat, memory, relationship, tool, history, and LLM suites -> `315 passed`.
  - `powershell -NoProfile -ExecutionPolicy Bypass -File scripts\test-local.ps1` -> passed: `575` Python tests, all Node frontend tests, Python syntax `126` files, JavaScript syntax `163` files, and secret scan `607` files.
  - `python -m json.tool feature_list.json`, `config.example.json`, and `config.preview.example.json` -> passed.
  - Scoped `git diff --check` -> passed.
- Remaining manual checks: restart Electron to load the Python changes, then compare several English daily-chat turns for teasing strength, relevant tangents, and quiet care. Chinese conversational quality cannot be judged reliably until the currently configured upstream stops converting Chinese input to question marks. Prompt trimming alone cannot remove its roughly ten-to-eighteen-second first-content delay.

## Semantic Emotive Hiyori Authored-Motion Sync v1 Completed on 2026-07-27

- Result: verified Hiyori motion assets now have deterministic semantic groups without adding or downloading unverified model files: shy `m05`, happy/excited `m06`, surprised `m07`, playful `m08`, angry `m09`, and sad/hurt/anxious `m10`. Explicit think, nod, wave/happy, and surprised actions retain dedicated authored paths.
- Trigger boundary: full-body motion is dispatched only from the existing real audible playback callback. Ordinary medium emotion remains on subtle expression/body linkage; full authored emotion motion requires a high-intensity cue or a compatible explicit action.
- Ownership: while an authored `.motion3.json` is active, it owns large head, torso, arm, and hand channels. The Hiyori parameter director remains at reduced gain for face and audible speech detail, avoiding the previous full-motion/semantic-pose conflict.
- Continuity and safety: per-motion cooldowns suppress repeats across consecutive segments; playback-generation ownership prevents stale retention; interruption stops the owned Cubism motion; missing named groups fall back to existing legacy groups; non-Hiyori behavior and old configuration remain unchanged.
- Developer preview: the Live2D renderer exposes `window.__TAFFY_HIYORI_MOTION_PREVIEW__.emotions` and `.play(emotion)` for isolated visual checks. This uses the normal motion dispatcher and adds no ticker, interval, or resident animation loop.
- Verification Evidence:
  - `node tests\test_hiyori_authored_motion_frontend.js` -> passed, covering asset registration, deterministic emotion mapping, explicit-action mapping, medium-intensity restraint, keyed cooldown, playback ownership, interruption, resource fallback, and reduced procedural channel gain.
  - `node tests\test_performance_cue_frontend.js`, `node tests\test_hiyori_performance_director_frontend.js`, and `node tests\test_tts_playback_start_frontend.js` -> passed.
  - `node scripts\run_node_tests.js` -> passed.
  - The first `scripts\test-local.ps1` attempt reached the command runner's 120-second limit without a test failure. A clean rerun completed successfully: `575` Python tests, all Node frontend tests, Python syntax `126` files, JavaScript syntax `164` files, and secret scan `608` files.
  - Scoped `git diff --check`, JavaScript syntax, and Hiyori model JSON validation passed.
- Manual Electron acceptance remains necessary: listen/watch playful, happy, shy, surprised, angry, and sad replies; judge whether `m05`/`m06` feel too long, whether speech expression remains readable over the motion, and whether interruption/following replies transition naturally on the real model. These are perceptual checks, not automatically provable.
- Existing unrelated dirty changes and all `.bak` files were preserved. Nothing was committed or pushed.

## Xinyu Stable Natural Emotion v5 Completed on 2026-07-28

- User feedback identified three related defects: emotion sounded theatrical, the cute pitch target was lost, and adjacent segments jumped enough to resemble different personas, sometimes with a yandere-like color.
- The accepted V7 five-to-seven-year-old cute lively baseline is now invariant. Emotion is a small accent on selected words or the ending rather than a replacement persona, pitch range, or acting performance.
- Every semantic emotion guide was softened. Even `high` intensity is capped at moderate readable variation; dark, obsessive, possessive, sinister, breathy-intimate, and yandere-like delivery are explicitly rejected.
- Cross-segment generation variance is reduced with tested settings: temperature `0.72`, top-k `35`, top-p `0.9`, and repetition penalty `1.05`. Official full-text CustomVoice conditioning and incremental PCM output remain enabled.
- Continuity audition: `D:\AI\voice_auditions\xinyu_natural_emotion_v8\V8_stable_cute_natural_emotion.wav` (external, not packaged), containing playful, thinking, and warm-happy segments. It is `13.08 s`, `24 kHz`, `-25.0 dBFS` RMS, `-6.54 dBFS` peak, and has zero clipping.
- Fixed-language Whisper recovered all three Chinese lines substantially intact. Median voiced F0 values were approximately `342`, `317`, and `301 Hz`, keeping the transitions inside one child-voice region rather than producing a large pitch/persona reset.
- Verification Evidence:
  - Focused Qwen/TTS route and language tests -> `25 passed`.
  - `powershell -NoProfile -ExecutionPolicy Bypass -File scripts\test-local.ps1` -> passed: `577` Python tests, all Node frontend tests, Python syntax `126` files, JavaScript syntax `164` files, and secret scan `608` files.
  - `feature_list.json`, `config.example.json`, and scoped `git diff --check` passed.
- Existing unrelated dirty changes and all `.bak` files were preserved. Nothing was committed or pushed.

## Xinyu Younger Cuter Child Voice v4 Completed on 2026-07-28

- The user selected the younger branch, moving the perceived fictional character age from roughly nine-to-eleven toward five-to-seven.
- User listening acceptance: V7 was explicitly approved as the formal voice on 2026-07-28. Further age reduction or pitch exaggeration is intentionally deferred to avoid harsh squeakiness and reduced intelligibility.
- The formal baseline now emphasizes an unmistakably little-child identity, very small soft-light timbre, clean higher placement, round innocent resonance, milk-sweet warmth, lively curiosity, tiny quick reactions, bright animated pitch movement, and extra-cute endings.
- Exact wording and steady pronunciation remain hard constraints. The profile still rejects baby talk, harsh squeakiness, nasality, adult sultriness, inserted vocalizations, metallic texture, robotic delivery, and digital effects.
- Final audition: `D:\AI\voice_auditions\xinyu_child_voice_v7\V7_younger_cuter_child.wav` (external, not packaged), `11.0 s`, `24 kHz`, `-25.0 dBFS` RMS, `-4.37 dBFS` peak, zero clipping.
- Fixed-language local Whisper recovered the English sentence exactly and both Chinese lines substantially intact; the only material normalization was sentence-final `啦` recognized as `了`.
- Verification Evidence:
  - Focused Qwen/TTS route and language tests -> `24 passed`.
  - `powershell -NoProfile -ExecutionPolicy Bypass -File scripts\test-local.ps1` -> passed: `576` Python tests, all Node frontend tests, Python syntax `126` files, JavaScript syntax `164` files, and secret scan `608` files.
  - `feature_list.json`, `config.example.json`, and scoped `git diff --check` passed.
- Existing unrelated dirty changes and all `.bak` files were preserved. Nothing was committed or pushed.

## Xinyu Young Lively Child Voice v3 Completed on 2026-07-28

- The user selected a clearly childlike fictional voice perceived around nine to eleven years old, rather than the prior exaggerated anime-girl direction.
- The formal delivery baseline now asks for a small light timbre, clean high placement, rounded youthful resonance, milk-sweet warmth, a cute smile, bright curiosity, playful reactions, buoyant rhythm, and expressive childlike endings.
- Stability boundaries remain explicit: exact wording and order, steady pronunciation, no baby talk, harsh squeakiness, nasality, adult sultriness, inserted vocalizations, metallic texture, robotic delivery, or digital effects.
- Final audition: `D:\AI\voice_auditions\xinyu_child_voice_v6\V6_young_lively_child.wav` (external, not packaged), `14.62 s`, `24 kHz`, `-25.0 dBFS` RMS, `-3.15 dBFS` peak, zero clipping.
- Language-aware local Whisper recovered both Chinese segments substantially intact and recovered the English sentence exactly when explicitly checked in English mode. Auto mode misclassified the high child voice as Chinese, so bilingual QA must force the expected language per segment.
- Verification Evidence:
  - Focused Qwen/TTS route and language tests -> `24 passed`.
  - `powershell -NoProfile -ExecutionPolicy Bypass -File scripts\test-local.ps1` -> passed: `576` Python tests, all Node frontend tests, Python syntax `126` files, JavaScript syntax `164` files, and secret scan `608` files.
  - `feature_list.json`, `config.example.json`, and scoped `git diff --check` passed.
- Existing unrelated dirty changes and all `.bak` files were preserved. Nothing was committed or pushed.

## Xinyu Exaggerated Anime Moe Voice v2 Completed on 2026-07-28

- Voice direction moved beyond the accepted B4 childlike baseline toward an unmistakably anime-style moe character: noticeably higher and sweeter placement, younger resonance, petite bright timbre, energetic pitch arcs, bouncy rhythm, playful openings, and animated sentence endings.
- Spoken-word integrity is a hard constraint. The delivery prompt explicitly forbids replacing or interrupting text with humming, squeals, giggles, gasps, or elongated filler vowels, while continuing to reject metallic, robotic, nasal, and harshly squeaky output.
- Qwen3-TTS now explicitly uses CustomVoice's official full-text conditioning mode (`non_streaming_mode=True`) while continuing to yield decoded PCM incrementally. A local diagnostic request may disable the semantic instruction without exposing arbitrary prompt text.
- Diagnostic correction: early Chinese probes were invalid because Windows PowerShell altered literal Chinese passed through stdin. SHA-256 checks proved both the 1.7B main weights and speech tokenizer exactly matched Hugging Face. Re-running with ASCII-safe Unicode escapes restored correct Chinese output.
- Final audition: `D:\AI\voice_auditions\xinyu_anime_moe_v5\final\V5_final_exaggerated_anime_moe.wav` (external, not packaged), `11.98 s`, `24 kHz`, `-25.0 dBFS` RMS, `-6.18 dBFS` peak, zero clipping.
- Local Whisper content check recovered both Chinese segments substantially intact and the English segment with one near-homophone (`think` read as `thank`). The output is suitable for user perceptual comparison; ASR is a guard, not a timbre judge.
- Verification Evidence:
  - Focused Qwen/TTS route and language tests -> `24 passed`.
  - `powershell -NoProfile -ExecutionPolicy Bypass -File scripts\test-local.ps1` -> passed: `576` Python tests, all Node frontend tests, Python syntax `126` files, JavaScript syntax `164` files, and secret scan `608` files.
  - `feature_list.json`, `config.example.json`, and scoped `git diff --check` passed.
- Existing unrelated dirty changes and all `.bak` files were preserved. Nothing was committed or pushed.

## Xinyu Childlike Original Voice v1 Completed on 2026-07-27

- The user accepted `D:\AI\voice_auditions\xinyu_childlike_v4\B4_childlike_playful.wav` as the formal character-voice target. The audition file remains outside the repository and is not packaged.
- Fresh Qwen3-TTS configuration now uses the complete 1.7B CustomVoice model with `Ono_Anna`. Legacy Qwen values `voice: "default"` and `voice: "auto"` resolve to the same accepted voice, while an explicitly selected supported speaker remains compatible.
- The bounded delivery profile preserves the accepted B4 traits: clearly young and childlike, small/light/rounded timbre, bright curiosity, playful confidence, cute smiling delivery, and nimble mischievous rhythm. It explicitly avoids breathy, squeaky, nasal, metallic, robotic, or theatrically exaggerated delivery.
- Existing semantic emotion, intensity, and voice-style controls extend the stable character baseline rather than replacing it. The 0.6B model remains a low-resource fallback but cannot reproduce the 1.7B natural-language delivery control exactly.
- Runtime verification:
  - Service health: CUDA model loaded, speaker `Ono_Anna`, streaming enabled, emotion instruction enabled.
  - Warm first audio: Chinese about `392 ms`; English about `290 ms`.
  - The first Chinese request after process start incurred a one-time language-path warmup of about `4.1 s`; short utterance completion remained variable at roughly `2.2-4.8 s`.
- Verification Evidence:
  - Focused Qwen/TTS tests -> `24 passed`; Qwen frontend and configuration-switch checks passed.
  - `powershell -NoProfile -ExecutionPolicy Bypass -File scripts\test-local.ps1` -> passed: `576` Python tests, all Node frontend tests, Python syntax `126` files, JavaScript syntax `164` files, and secret scan `608` files.
  - `config.example.json`, `feature_list.json`, and scoped `git diff --check` passed.
- Remaining perceptual check: after Electron reload, listen to several short/long Chinese, English, and mixed turns. Confirm that emotion changes retain the same character identity and that the longer 1.7B completion time remains acceptable in continuous conversation.
- Existing unrelated dirty changes and all `.bak` files were preserved. Nothing was committed or pushed.

## Independent Conversation Lane Collapse v1 Completed on 2026-07-28

- Added two persistent edge controls to the full Live2D stage: the left arrow controls model history and the right arrow controls user history.
- Each lane collapses independently. Hiding one side does not alter the other side, delete records, change LLM history, or disable incoming message rendering.
- A hidden lane stays hidden when new messages arrive. Its edge control gains a bounded unread count; expanding that lane clears the count.
- Collapse and unread state are stored under `taffy_conversation_lane_state_v1` and restored after Electron restarts. The existing whole-history collapse control remains available.
- The stage mapping now matches the controls: model messages occupy the left lane and user messages occupy the right lane. With both lanes hidden, the background and Live2D character remain unobstructed.
- Browser QA verified both controls, independent ARIA state, computed lane visibility, and the fully collapsed background at the real full-stage viewport. The browser-only persona warning was caused by the isolated QA page lacking Electron's local auth context and is unrelated to this feature.
- Verification:
  - `node tests\test_stage_frontend.js` -> passed.
  - `node scripts\run_node_tests.js` -> all frontend tests passed.
  - `powershell -NoProfile -ExecutionPolicy Bypass -File scripts\test-local.ps1` -> passed: `576` Python tests, all Node frontend tests, Python syntax `126` files, JavaScript syntax `164` files, and secret scan `608` files.
- Existing unrelated dirty changes and every `.bak` file were preserved. Nothing was committed or pushed.
## Obsidian Autonomous Knowledge Base v1 (2026-07-28, in progress)

- Created the separate local Obsidian-compatible vault at `D:\馨语记忆库`; it contains readable category folders, a system explanation, a change log, and a local retrieval index.
- Per the approved migration boundary, copied only distilled core memories, profile summary, relationship summary, and relationship state. The raw `memory.json` transcript pool was not copied, and no existing memory file or `.bak` was deleted.
- Added `obsidian_knowledge.py`: Markdown frontmatter is the editable source of truth; a lightweight local Chinese-aware keyword index refreshes after manual Obsidian changes and injects at most four bounded snippets into relevant non-lightweight chats.
- Unverified external material is written only to `06-待核实` with provenance. The free public-source learner is explicitly configuration-gated and runs outside chat/TTS request handling at a soft 6-14 hour cadence.
- Focused verification so far: `tests\\test_obsidian_knowledge.py`, `tests\\test_memory_selection.py`, and `tests\\test_app_chat_context.py` -> `55 passed`; Python compile, JSON validation, and scoped whitespace check passed.
- Remaining: full `scripts\\test-local.ps1` verification and a manual Electron restart/knowledge status check. Existing unrelated dirty changes and all `.bak` files remain preserved; nothing has been committed or pushed.

### Completion update

- The real vault migration completed successfully: `D:\馨语记忆库` now contains six indexed user/relationship/core-memory notes plus system documentation and a changelog. A regenerated local index intentionally excludes the system and changelog folders from retrieval.
- Automatic legacy-to-vault synchronization is debounced for ten seconds after a normal user interaction, keeping core-memory extraction and filesystem work off the reply path.
- Verification Evidence:
  - Focused knowledge, memory, chat-context, and chat-route suite -> `72 passed`.
  - Full Python suite was split only because the execution environment enforces a 64-second command window: `346 passed`, `122 passed` (one existing `pydub/audioop` deprecation warning), and `133 passed`, totaling `601 passed`.
  - `node scripts\\run_node_tests.js` -> passed.
  - `python scripts\\check_python_syntax.py` -> `135` files passed; `python scripts\\check_js_syntax.py` -> `165` files passed; `python scripts\\check_secrets.py` -> `622` files passed.
  - JSON validation and scoped `git diff --check` passed.
- Known v1 limits: retrieval is deliberately local Chinese-aware keyword matching rather than a newly downloaded embedding model; the first free learner source is Wikipedia random summaries and remains labelled `待核实`. Broader source adapters, semantic local embeddings/Qdrant, and a dedicated knowledge-management UI can be added later without changing the vault format.
- Feature status: complete. No commits or pushes were made; unrelated dirty changes and all `.bak` files were preserved.
## Companion Event Bus and Behavior Director v1 (2026-08-02, complete)

- Added `companion_events.py`: a process-local, bounded metadata-only event stream. It deliberately omits message content, screenshots, credentials, tool arguments, and raw desktop data.
- Added `behavior_director.py`: an explainable, non-executing suggestion layer. It can return `stay_quiet`, `micro_reaction`, or `prepare_proactive`; it respects active/just-finished TTS and requires existing companion-life material before suggesting proactive preparation.
- Integrated desktop chat (including voice modality and supplied desktop context), QQ inbound/reply turns, and actual frontend playback start/finish reporting. `GET /api/behavior/status` and authenticated `POST /api/behavior/event` expose only bounded diagnostics and accepted lifecycle metadata.
- Compatibility and safety: `behavior_director.enabled` defaults to `false`; it does not send a message, invoke an LLM, call a tool, observe the desktop, or bypass the existing companion-life/turn-taking/QQ gates.
- Verification Evidence: focused companion-event/chat/API tests passed (`48 passed`); all Node frontend tests passed; Python syntax `149`, JavaScript syntax `170`, and secret scan `641` files passed. The monolithic `scripts\test-local.ps1` exceeded this environment's 64-second external-command limit; its equivalent project checks were run successfully in a bounded invocation.
- When explicitly enabled, the existing proactive-material endpoint accepts only a grounded `prepare_proactive` suggestion; active speech or the post-TTS settle window can suppress an automatic attempt, but never create one. Remaining field work is subjective timing calibration with the existing turn-taking controller.

## Companion Life Growth and Meaningful Proactive Presence v2 (2026-07-28, in progress)

- Added `companion_life.py`. It keeps a local, inspectable `D:\馨语记忆库\.xinyu-life-state.json` and writes only one sparse daily-style reflection per six eligible conversations under `08-内心日记`; there is no hidden LLM reflection call and no per-turn fabricated emotion.
- Gradual recurring-topic signals are injected as soft growth context, not a replacement personality prompt. They can change over time and remain visible in the vault.
- Automatic companion turns now receive a source-aware directive: with no genuine context, remain quiet; with a recent reflection or recurring topic, optionally share one natural thought instead of a timer-shaped greeting.
- Focused verification: `tests\\test_companion_life.py`, knowledge, memory-selection, and chat-context tests -> `58 passed`; Python compile and scoped whitespace check passed.
- Remaining: inspect the real Electron proactive path over time and refine topic extraction / source ranking; preserve all unrelated dirty changes and `.bak` files. No commit or push.

## Natural Voice Participation and Visible Thinking v1 (2026-07-30, complete)

- Added a private model-owned voice participation contract: each enabled voice turn can choose `reply`, `micro_reaction`, `defer`, or `silence`, plus `quick`, `normal`, or `deep` thinking timing.
- `app_chat_route.py` buffers enabled voice output, strips all private control tags before chat/memory/TTS, and skips assistant delivery persistence when no spoken reply exists. Typed turns and legacy configurations remain unchanged because the public default is disabled.
- `web/chatApi.js` and `web/chatReplyController.js` accept the bounded decision metadata, finish silent turns without an empty assistant card or TTS error, keep Live2D thinking/quiet-reaction cues, and retain only a short-lived ambient residue for the next meaningful voice turn.
- Added configuration-center controls and enabled the feature only in the private ignored `config.local.json`; no key, token, session, or private prompt was added to tracked files.
- Verification Evidence:
  - Focused natural-conversation, route, context, character, ASR, streaming, and performance tests passed (`31 passed`, then `74 passed`, plus all selected Node checks).
  - `powershell -NoProfile -ExecutionPolicy Bypass -File scripts\test-local.ps1` passed: `617` Python tests, all Node frontend tests, Python syntax `142`, JavaScript syntax `167`, and secret scan `631`.
  - JSON validation and scoped `git diff --check` passed.
- Remaining field risk: the model may occasionally ignore the private tag and then safely falls back to an ordinary reply; the exact silence rate and thinking-delay feel require live microphone tuning with the configured provider. No dependency or third-party turn detector was added.
- No commits or pushes were made. Unrelated dirty changes and every `.bak` file were preserved.

## Qwen3-TTS Exclusive Managed Autostart v1 (2026-07-30, complete)

- Electron now starts the selected local Qwen3-TTS service only when `tts.auto_start_local_provider` is explicitly enabled. The tracked default remains `false`, so old and shared configurations keep their previous behavior.
- The managed path is hard-gated to `provider=qwen3_tts`, launches `scripts/qwen3_tts_server.py` directly, and never starts `api_v2.py` or chooses GPT-SoVITS as an automatic fallback. If Qwen is unavailable, the existing visible error path and configured browser speech fallback remain in control.
- Shutdown stops only the Qwen process owned by the current Electron instance. An already healthy external Qwen service is reused and left untouched.
- The ignored private configuration now enables managed autostart with the existing local `Qwen3-TTS-12Hz-1.7B-VoiceDesign` model and `A2_Original`. No credential, token, session, or private model asset was added to tracked files.
- Runtime verification: the stale standalone GPT-SoVITS `api_v2.py` process was stopped and port `9880` remained free. Restarting Electron produced a healthy Qwen service on `127.0.0.1:9881` with `model_loaded=true`, CUDA, VoiceDesign mode, and no GPT API process; closing Electron released the owned Qwen process.
- Verification Evidence:
  - Focused backend configuration and Qwen tests: `40 passed`; focused Qwen frontend test passed.
  - `scripts\test-local.ps1` passed: `620` Python tests, all Node frontend tests, Python syntax `142`, JavaScript syntax `168`, and secret scan `632`.
  - JSON validation and scoped `git diff --check` passed.
- Runtime note: the existing isolated Qwen virtual environment was originally created from a Python 3.10 installation located under a directory named `GPTSoVits`. That interpreter path may appear in the Windows process tree, but the launched entry point and loaded model are Qwen3-TTS; no GPT-SoVITS model or API service is started.
- No commits or pushes were made. Unrelated dirty changes and every `.bak` file were preserved.

## Continuous Conversation Awareness for Active Companionship (2026-07-30, complete)

- Extended the existing `companion-life-growth-v2` path instead of creating a competing proactive scheduler. The new lightweight awareness pulse exists only while the user-facing active-companionship switch is on and stops immediately when that switch is disabled.
- A voice turn that privately chose `silence`, `micro_reaction`, or `defer` can now leave one bounded, in-memory candidate. After a content-sensitive delay, and only while the user is not speaking or typing and Xinyu is not thinking or speaking, the candidate may be reconsidered.
- Reconsideration uses the same private `reply` / `micro_reaction` / `defer` / `silence` contract. A quiet result creates no assistant card, TTS request, proactive-success cooldown, raw transcript memory, or hidden chain-of-thought. Repeated defer is bounded and the candidate expires after 90 seconds or is superseded by newer user speech.
- Ordinary long-idle proactive checks now also retain the model's right to remain silent when natural conversation is enabled. Existing source-aware companion-life material, no-observation/no-tools guards, and the active-companionship hard gate remain authoritative.
- Added an inspectable developer summary and focused frontend/backend regressions covering private auto participation, silence accounting, expiry/supersession, and the disabled gate.
- Verification Evidence:
  - Focused backend natural-conversation and chat-route suite: `27 passed`.
  - Focused natural-conversation, awareness-loop, and character-runtime Node tests passed.
  - `powershell -NoProfile -ExecutionPolicy Bypass -File scripts\test-local.ps1` passed: `619` Python tests, all Node frontend tests, Python syntax `142`, JavaScript syntax `168`, and secret scan `632`.
  - `feature_list.json` validation and scoped `git diff --check` passed.
- Runtime: Electron and its local Python backend were restarted; `http://127.0.0.1:8123/healthz` returned `ok`. The separately running SenseVoice service was not stopped.
- Remaining field risk: subjective timing and model silence rate still depend on the configured provider. Live microphone testing should tune behavior from observed interruptions or over/under-speaking rather than lowering the hard activity gates.
- No commits or pushes were made. Unrelated dirty changes and every `.bak` file were preserved.

## Continuous Reply Voice and Live2D Face Sync v1 (2026-07-30, complete)

- Fixed the visible “stuck face” cause: an expired local speech performance cue now actively clears its exp3 expression. Audible completion bounds the remaining expression/pose hold to a 380ms release window and restores `neutral` instead of leaving the previous face locked.
- Qwen3-TTS streaming PCM now routes through a reusable Web Audio analyser before reaching the destination. The existing Live2D frame update samples that real waveform for mouth opening; no additional animation loop or permanent polling task was added.
- Qwen3-TTS now defaults to reply-level continuity. It waits for the finalized reply and sends one synthesis request instead of independently synthesizing voice-timeline sentences. The previous early sentence streaming remains available through `tts.qwen3_tts_reply_continuity=false`.
- The bounded CustomVoice instruction keeps the same character pitch center, resonance, timbre, and vocal age while allowing one reply-level emotional through-line. It explicitly treats punctuation as connected breaths rather than persona resets.
- Cancellation or PCM failure after audible playback begins now clears speech animation and subtitles. GPT-SoVITS segmented/prefetch behavior remains unchanged.
- Verification Evidence:
  - Focused Qwen, PCM streaming, performance cue, cancellation, failover, playback-start, TTS route/audio/language tests passed.
  - `scripts\test-local.ps1` passed: `620` Python tests, all Node frontend tests, Python syntax `142`, JavaScript syntax `168`, and secret scan `632`.
  - `feature_list.json` and `config.example.json` validate as JSON.
- Manual acceptance still required: reload Electron and listen/watch a multi-clause Chinese reply, a playful reply, a subdued reply, and one interrupted reply. Judge perceived identity continuity, emotional suitability, lip closure on pauses, and whether the face releases naturally.
- No commits or pushes were made. Unrelated dirty changes and every `.bak` file were preserved.
## Social and Evolving Self Cognition v1 Completed on 2026-07-30

- Added `social_cognition.py`, backed by `D:\馨语记忆库\09-社会关系\社会认知图.json`. It models people, accounts, explicit relationships, bounded identity evidence, interaction events, and Xinyu's evolving self narrative rather than requiring a fixed profile form for every person.
- Desktop and QQ accounts remain distinct until evidence links them. Repeated explicit aliases can associate accounts with one person; explicit introductions such as friend/family/colleague create confidence-scored relationship edges.
- Ordinary non-identity conversation text is not copied into the social graph. Only bounded explicit identity/relationship evidence is retained; existing conversation memory remains the separate source for dialogue history.
- Prompt integration injects only the current person's compact identity/relationship context plus Xinyu's current self-understanding and recent interests. Uncertain links remain guesses, and the model is told not to claim it consulted a hidden profile.
- Added authenticated local `GET /api/social_cognition` status. The real empty graph and self-understanding note were initialized without inventing people.
- Verification so far: focused social cognition, companion life, relationship state, QQ identity and chat-context tests -> `33 passed`; Python compile and scoped diff checks passed.
- Existing dirty work and every `.bak` file were preserved. Nothing was committed or pushed.

### Verification completion

- Full Python suite was partitioned only to stay below the execution environment's 64-second command window: `228 + 228 + 168 = 624 passed`; the only warning is the existing third-party `pydub/audioop` deprecation.
- `node scripts\run_node_tests.js` passed all frontend tests.
- Python syntax `144` files, JavaScript syntax `168` files, and secret scan `634` files passed.
- `feature_list.json`, `config.example.json`, and scoped `git diff --check` passed.
- Feature status remains complete; manual acceptance is to restart Electron, introduce a local/QQ identity naturally, and verify that related people are recalled without the assistant mentioning profiles or databases.

## Autonomous Desktop Awareness and Control v1 (2026-08-01)

- Added `desktop_agent.py`: Xinyu can inspect the monitor under the mouse cursor only when she chooses `observe_screen`. The local trigger compares a small fingerprint to notice scene changes, but it does not upload the frame; a cloud vision request happens only after the model selects observation.
- The vision call is prompt-injection aware and returns compact scene context. A successful check against the configured cloud vision model returned the current task and visible applications. Observation is contextual only: Xinyu may remain silent and do nothing.
- Latest context is a bounded ignored local cache. Only a model-selected, rate-limited, non-sensitive durable observation can become a text-only Obsidian note; screenshots and credential-like strings are never written to the vault.
- Added dynamic capability awareness to the character prompt and bounded desktop actions: inspect/focus/minimize/maximize windows, open existing apps/URLs, clipboard read/write, and visible click/type/key fallback. Closing windows, submission, message sending, login, payment, install, delete, unknown targets, and unsafe Enter use the existing one-time confirmation cards.
- Public examples remain disabled. The private runtime now explicitly enables autonomous observation, the cloud vision model, active-companionship wakeups, and desktop actions; shell behavior was left as the pre-existing private configuration.
- Verification Evidence:
  - Focused desktop-agent/config/chat-route suite: `49 passed`; local Windows capture confirmed the cursor display and foreground/window context.
  - Real cloud-vision smoke: structured scene result returned from the configured vision model without retaining a screenshot in long-term memory.
  - `powershell -NoProfile -ExecutionPolicy Bypass -File scripts\test-local.ps1` passed: `629` Python tests, all Node frontend tests, Python syntax `146`, JavaScript syntax `169`, and secret scan `637`.
  - `feature_list.json`, configuration JSON, and `git diff --check` passed.
- Manual acceptance: restart Electron, enable the private configuration, work on a visibly changing screen for several minutes, then check that Xinyu observes only when useful, stays quiet when appropriate, and requests confirmation before any consequential action. No commit or push was made; unrelated dirty changes and every `.bak` file remain untouched.
