# Session Handoff

## Latest Session Update: Light Utility Selection v1 (2026-08-09)

- The final `web/stageMotion.css` layer now owns the lower utility rail's selected feedback. Desktop hover/focus and expanded Scene/More use `#ffd3e5` with `#71334f`; do not restore the dark expanded-More treatment from `phosphorIcons.css`.
- Scene and More continue to derive their persistent state from `aria-expanded="true"`. Desktop has no persistent panel state, so its corresponding feedback is hover, keyboard focus, and press.
- Capsule rounding is intentionally forced in the final layer because an earlier sibling-divider rule sets utility buttons to square corners. Fine-pointer hover lifts by one pixel; reduced-motion removes the press transform.
- Continue using the user's risk-scaled verification rule for small UI corrections; do not repeat `scripts\\test-local.ps1` by default.

## Latest Session Update: State-Linked Stage Motion v1 (2026-08-08)

- Latest visual direction supersedes the earlier idle-motion notes: continuous `.stage-state-aurora` and `.composer-state-flow` layers are removed. Do not restore idle sweep or rim-breathing effects unless requested again.
- Keep actual audio feedback: `.stage-state-pulse` still animates only for listening/speaking, and the existing microphone meter remains unchanged.
- The top and lower-left mascot marks now compose existing Phosphor cat, star-four, and heart assets. Do not revert them to the angular Tabler cat.
- Day/dusk and night browser QA passed at the default desktop viewport. Both mascot marks are visible and readable; `.stage-state-aurora` and `.composer-state-flow` counts are zero, and the resting header/composer report no running animation.
- Real Electron feedback exposed and corrected a header regression: never restore the removed `.hero-card > :not(...) { position: relative; }` rule. It overrides the absolute positioning of `.hero-svg-ears` and creates a large pink artifact at the left of the header.
- The redundant `.hero-svg-ears` pair is now hidden in the final motion layer because it protruded into the native titlebar at the user's wide Electron size. The actual `.xinyu-stage-brand-mark` remains visible.
- Idle motion is intentionally visible now: both `.stage-state-aurora::before` and `.composer-state-flow::before` travel continuously, while their `::after` layers breathe at the rim. Active presence states only change the rhythm.
- Status: implementation, focused validation, and local browser QA are complete; restart Electron for subjective motion acceptance with the real backend states.
- `web/stageMotion.css` is the final stage-only motion layer. It reads the existing `body[data-presence]` values and microphone/input states; do not add a parallel JavaScript animation state machine.
- The header aurora and activity bars, plus the composer flow layer, are decorative and pointer-transparent. Real controls remain above them through explicit stacking.
- State rhythm is deliberate: idle is slow and quiet, listening is fastest, thinking is slower, and speaking is soft. Error is static rather than repeatedly shaking.
- The time chip animation must retain `translateX(-50%)` because the chip is centered with `left: 50%`.
- Reduced-motion users keep color and border state changes while looping and interaction transforms stop.
- Continue using risk-scaled checks for small UI work; do not rerun the full local gate unless the scope or risk changes.
- Focused stage tests, JSON validation, the repository secret scan, scoped whitespace checks, and 1280×720 visual QA passed. The static preview's expected `/config.json` error was not treated as a runtime regression.
- Post-feedback QA also passed at 1920×1080 and 700×900: the pink titlebar artifact is gone, there is no horizontal overflow, and both idle sweep transforms plus rim opacity values changed across two captured frames. Night listening showed the activity bars and active microphone correctly.

## Latest Session Update: Control-Center Readability and Navigation Fix v1 (2026-08-07)

- Status: implementation and focused verification complete; restart Electron and verify the real backend-connected control center visually.
- Root cause of the stuck sidebar was in `controlCenterShell.closeSurface`: `#qq-identity-close-btn` was absent, leaving QQ content above the newly selected page. Keep QQ in the unified close selector and keep the order as close current surface, then click the target launcher.
- `web/controlCenterPolish.css` loads last and is the authoritative readability layer for control-center content. It overrides legacy pale-blue checkbox rows and QQ chips without deleting their base styles.
- Night tokens use bright neutral text over warm berry-charcoal surfaces; day tokens use dark berry text over soft pink-white surfaces. Disabled controls remain visibly disabled without lowering text contrast to illegibility.
- Focused `test_control_center_frontend.js` and JavaScript syntax checks pass. `test_button_value_ui.js` currently has an unrelated pre-existing assertion mismatch for the memory-search placeholder copy; do not alter memory behavior as part of this control-center fix.
- Full static browser interaction was limited because `/config.json` is unavailable under a plain local file server, so final subjective visual acceptance should be done after restarting the real Electron app.

## Latest Session Update: Four-Phase Time Scene and Motion Layer v1 (2026-08-07)

- Status: implementation and local visual QA complete; restart Electron for subjective acceptance in the real desktop stage.
- Automatic scene boundaries are morning `05:00`, day `09:00`, dusk `17:00`, and night `20:00`. Manual selections persist until the user returns to Auto; do not restore the former next-day expiry behavior.
- The header now only reports the current scene and local time. The lower utility capsule owns the `场景` launcher and four-phase picker; the former `上手` launcher is intentionally absent, but the internal onboarding modal remains available to existing code paths.
- `web/sceneExperience.css` remains the final motion and atmosphere layer, while `night-room-v2.webp` is now the authoritative night illustration. It preserves the day room's composition so time changes feel like the same place rather than a different apartment.
- Night keeps `data-stage-room="night"` for dark UI and native titlebar compatibility and now displays `night-room-v2.webp` directly. The old `night-room-v1.webp` is retained but no longer referenced; do not delete it without explicit approval.
- The accepted night direction is a clear deep-blue starry exterior with cool window moonlight, restrained warm shelf lighting, and a bright Live2D character. Avoid reintroducing a heavy CSS color-grade over the generated artwork.
- `morning-room-v1.webp` and `dusk-room-v1.webp` are also authoritative generated time-scene assets. Morning is pale blue/pink dawn; dusk is coral/lavender sunset with warm shelves. All four backgrounds share the same room geometry and central Live2D-safe area.
- Scene switching now crossfades dedicated `.stage-room-background-morning`, `-day`, `-dusk`, and `-night` layers. Keep runtime tone/light overlays restrained so they do not flatten the painted source lighting.
- Compatibility: storage remains `taffy.stage-room.v1`, and legacy `auto`, `day`, and `night` values remain valid. `data-stage-room` still resolves to day/night for older Electron/titlebar and palette consumers; new styling should key from `data-stage-scene`.
- Verification is intentionally risk-scaled per user direction: focused Node frontend tests, JavaScript syntax checks, JSON validation, scoped diff checks, and the repository secret scan. Do not rerun the full local gate by default for this UI-only change.

## Latest Session Update: More Launcher Readability Fix (2026-08-07)

- Expanded More state now says `收起` and has an explicit accessible label. A dedicated high-contrast capsule rule prevents the dark-on-dark launcher text shown in the supplied night-stage screenshot.
- The desktop toggle is a contained 42-by-22px track with a true circular thumb and a fixed right inset. Keep this rule in the final `phosphorIcons.css` visual layer so lower-level control-center styles cannot reintroduce the overlap.
- Verification is intentionally risk-scaled: run `node tests/test_button_value_ui.js`, JSON validation, and `python scripts/check_secrets.py`; do not default to the full local gate for this small visual fix.

## Latest Session Update: Singing Feature Retirement (2026-08-07)

- User requested removal of all in-app singing functions. The more-menu controls, text-command interception, WAV picker IPC, loopback routes, and singing configuration were removed. Normal speech TTS is unchanged.
- Do not delete the separate authorized source material, external RVC prototype, models, indexes, or local audition output without a new explicit request. They remain outside the repository and are no longer wired into the desktop pet.

## Latest Session Update: Autonomous Desktop Awareness and Control v1 (2026-08-01)

- Status: implementation and full local validation complete; Electron restart and subjective desktop-use acceptance remain.
- New `desktop_agent.py` captures the monitor containing the mouse cursor only after the model calls `observe_screen`. Local thumbnail fingerprints can wake an optional autonomous consideration after a material scene change but are never uploaded on their own.
- `tools.py` now provides observation, desktop context, bounded window control, clipboard, and visible input adapters. The dynamic prompt block in `app.py` tells Xinyu only about currently enabled capabilities. The cloud vision response is compact, treats on-screen text as untrusted, and can leave the companion silent.
- `agent_actions.py` confirms window close, submission/send/login/payment/install/delete/unknown-target input, and unsafe Enter. Ordinary navigation, selection, playback, window control, drafting, and search remain autonomous. Do not weaken these checks by trusting a model-provided risk label.
- The current scene cache lives under ignored `.local-tools`; only model-selected, non-sensitive, rate-limited text observations can be saved by `obsidian_knowledge.py` to `D:\馨语记忆库`. Never persist raw screenshots, passwords, tokens, or API keys.
- Private `config.json` enables the feature for this user: `observe.autonomous_enabled=true`, `vision_model=gemini-3-flash`, and desktop tool flags. Public defaults/examples remain disabled. `config.local.json` still has an older `allow_shell=true` override; it was pre-existing and not expanded by this feature.
- Verification: cursor-screen capture and foreground-window context smoke passed; a real cloud-vision smoke returned structured scene data. Full `scripts\test-local.ps1` passed: `629` Python tests, all Node tests, Python syntax `146`, JavaScript syntax `169`, secret scan `637`; only existing pydub/audioop deprecation warning.
- Next session: restart Electron/Python service so new Electron and frontend code loads. With active companionship enabled, make a material screen change and wait through the two-minute cooldown; verify Xinyu may observe but does not have to comment. Then test one safe visible action and confirm a send/close action produces a confirmation card. Do not commit/push or touch unrelated dirty changes or `.bak` files.

## Latest Session Update: Social and Evolving Self Cognition v1 (2026-07-30)

- Status: implementation and focused verification complete.
- New module `social_cognition.py`; runtime data is local under `D:\馨语记忆库\09-社会关系`. The graph starts empty except for Xinyu's evolving self node and learns people from actual desktop/QQ interactions.
- Identity links are evidence-weighted: distinct accounts remain distinct by default; an explicit matching alias can associate them. Explicitly introduced friend/family/colleague relationships become graph edges.
- `app.py` injects a bounded current-person/self block and exposes `GET /api/social_cognition`; `memory.py` records social evidence asynchronously after eligible manual turns.
- Ordinary chat content is not duplicated into the graph; only explicit identity/relationship evidence is previewed. Preserve the existing knowledge, memory, relationship, QQ, and companion-life stores.
- Verification complete: focused suite `33 passed`; full Python suite `624 passed` across three command-window-safe partitions; all Node frontend tests passed; Python syntax `144`, JavaScript syntax `168`, secret scan `634`, JSON validation and scoped diff checks passed. Only the existing `pydub/audioop` deprecation warning remains.
- Do not commit/push or touch unrelated dirty changes and `.bak` files.

## QQ social identity cloud deployment checkpoint (2026-07-28)

- The existing Tencent Cloud AstrBot v4.25 + NapCat environment loads `astrbot_plugin_taffy_qq_bridge`; its compatibility fallback uses Quart when newer AstrBot web helpers are unavailable. Its plugin path is `/api/plug/astrbot_plugin_taffy_qq_bridge`.
- The local bridge supports `bridge_auth_mode: "tailnet"`: no bridge bearer secret is sent, but the cloud service must bind to localhost and be exposed exclusively by Tailscale Serve to a trusted tailnet. The old bearer-token mode remains compatible. The cloud plugin, compose override, and a persistent v4.25 dashboard middleware override are applied; only `/api/plug/astrbot_plugin_taffy_qq_bridge/*` is exempted while tailnet mode is active. A desktop read-only poll returned HTTP 200. Do not reuse any token previously shown in a terminal.
- Tencent Cloud console is authoritative for this instance's public IP: `175.178.199.245` (not the earlier, incorrect `.192.245` value). Its firewall already permits public TCP 80 and 443. The cloud Nginx has a timestamped backup and a validated HTTP ACME vhost for `175-178-199-245.nip.io`; it returns 404 locally as intended. The Certbot image is cached through the DaoCloud mirror, but ACME cannot issue for that `nip.io` hostname because Tencent domain protection returns an HTTP 566 web-block response. Leave this unused public ACME vhost in place until a user-controlled domain is available; do not use it for the QQ bridge.
- Tailscale v1.98.9 is installed and signed in on both the desktop and the cloud Ubuntu host. The desktop can reach AstrBot's plugin route through the server's Tailscale IPv4 and receives the expected 401 before AstrBot authentication. Use the private URL `http://<cloud-tailscale-ip>:6185/api/plug/astrbot_plugin_taffy_qq_bridge` in the QQ identity configuration; this traffic is encrypted by the tailnet and requires no public domain, HTTPS proxy, or public AstrBot-port firewall rule.
- No QQ message was sent. Do not inspect, echo, commit, or log any existing cloud secrets, QQ sessions, AstrBot key, or bridge token. Keep all existing dirty work and `.bak` files untouched; do not commit or push.

## Latest Session Update: Local RVC Singing Entry v1 (2026-07-28)

- Status: integrated locally and smoke-tested. The `更多 → 唱歌试音` button opens an Electron WAV picker, posts only its explicit local selection to the protected loopback backend, and plays the converted result from an external output directory.
- Main files: `singing.py`, `scripts/rvc_singing_convert.py`, `electron/main.js`, `electron/preload.js`, `web/singingController.js`, and `app.py`. The configured second singer is `singer_bv1vegq6zesq_v1.pth` with its own IVF210 index.
- RVC is still a 25-epoch PM-F0 preview model. Inputs must be clear WAV a cappella recordings. No source samples, weights, external paths, or user configuration may be committed. Qwen3-TTS remains stopped unless the user chooses to restart it.

## Current Work: Companion Life Growth and Meaningful Proactive Presence v2 (2026-07-28)

- Status: first implementation is complete and focused tests pass; manual runtime observation remains.
- New `companion_life.py` stores small local growth state inside `D:\馨语记忆库` and adds `08-内心日记`. It records only every sixth eligible interaction, so it does not simulate a dramatic internal monologue every turn.
- `app.py` injects soft long-term interests on normal chats and source-aware silence-or-share guidance for automatic chats. `memory.py` calls it asynchronously after a normal interaction.
- Do not turn this into a fixed persona rule or a timer. Next refinement should inspect real proactive messages, then improve source ranking, explicit user-edit control, and semantic topic extraction. Preserve all dirty changes and `.bak` files; do not commit/push.

## Latest Session Update: Obsidian Autonomous Knowledge Base v1 (2026-07-28)

- Status: implementation, real vault migration, and full local verification are complete.
- New module: `obsidian_knowledge.py`. It owns `D:\馨语记忆库`, an Obsidian-readable Markdown vault. Markdown is the editable source of truth; `.xinyu-knowledge-index.json` is a regenerable local retrieval cache and must not be hand-edited.
- Migration copied distilled core memory, profile/relationship summaries, and structured relationship state only. It intentionally did not copy the raw 600-item `memory.json` transcript. Existing memory files and every `.bak` file were left intact.
- Private `config.json` now contains an ignored `knowledge_base` section enabled for this user, with the vault path, four-item/520-character prompt budget, and opt-in background learning enabled. Do not expose or commit `config.json`.
- Chat prompt integration is in `app.py`; protected local APIs are `GET /api/knowledge/status`, `POST /api/knowledge/sync`, and `POST /api/knowledge/migrate`.
- Background learning currently uses only the small public Wikipedia random-summary endpoint, saves material as `unverified`, and sleeps a random 6-14 hours. It never runs in the chat request path. Broader search providers, semantic local embeddings/Qdrant indexing, an Obsidian UI panel, and autonomous personality-evolution promotion remain separate follow-up work.
- Verification: focused knowledge/memory/chat tests -> `72 passed`; full Python suite -> `601 passed` across three command-window-safe partitions; all Node frontend tests passed; Python syntax `135`, JavaScript syntax `165`, and secret scan `622` passed. The only warning was the existing third-party `pydub/audioop` deprecation.
- Preserve unrelated dirty work and all `.bak` files. Do not commit, push, or merge.

## Current Work: QQ Social Identity via AstrBot/OneBot v1 (2026-07-28)

- Status: the cloud text bridge is deployed and verified. The local QQ identity is configured and enabled with a user-provided private-contact allowlist, no groups, and text-only replies. Starting the desktop pet will begin inbound polling and may produce a reply to an eligible queued QQ message, so treat launch as an external-message activation step.
- Main files: `qq_identity.py`, `app.py`, `app_chat_route.py`, `web/qqIdentityController.js`, `web/qqIdentity.css`, `integrations/astrbot_plugin_taffy_qq_bridge/`, and `docs/qq-identity-astrbot.md`.
- Runtime contract: AstrBot/NapCat transports only. The desktop pet owns LLM/persona/memory; QQ-originated events cannot invoke local tools. Cloud messages queue during desktop downtime and expire locally after the configured age.
- Verification: focused QQ identity tests passed (`7 passed`), and the final `scripts\test-local.ps1` passed with `607` Python tests, all Node frontend tests, Python syntax `140` files, JavaScript syntax `166` files, and secret scan `628` files.
- Do not add tokens, QQ sessions, QR data, or the plugin `data/` queue to Git. Tailnet mode needs no bridge token; keep bearer tokens only for explicitly selected legacy token mode.
- Text is the only active QQ modality. Before enabling voice or autonomous proactive outreach, implement and manually test the OneBot media path and a delivery policy. Keep all existing unrelated dirty changes and `.bak` files intact; do not commit, push, or merge.

## Current Work: Authorized Singing Voice RVC Trial v1 (2026-07-28)

- User authorized two distinct singers for local training only. Use exclusively `D:\视频\03_素材库\01_音频\菲比\02_待人工筛选\BV1hPizBSE1K_人声训练片段_v3_14秒合规` and `D:\视频\03_素材库\01_音频\菲比\02_待人工筛选\BV1VeGq6ZEsq_人声训练片段_v3_14秒合规`. They are accompaniment-separated and must be trained as separate voices, never pooled.
- User approved temporarily stopping Qwen3-TTS to free GPU memory. The two local Qwen server processes were stopped; use `scripts\start-qwen3-tts.ps1` to restore it after the trial. Do not stop Electron or unrelated services.
- Use an external workspace for RVC runtime, copied inputs, checkpoints, models, indexes, and audition output. Do not commit voice samples, weights, checkpoints, paths, or credentials. The first pass is an evaluation of RVC conversion quality; it must not silently replace the existing speech-TTS provider.
- Status: complete preview trial. Separate local models: `assets\weights\singer_bv1hpizbse1k_e25.pth` plus its `IVF265` index, and `assets\weights\singer_bv1vegq6zesq_v1.pth` plus its `IVF210` index, all under `D:\AI\rvc_singing_runtime`. Both have a successful cross-conversion audition in `D:\AI\voice_auditions\rvc_singing_trials`.
- Quality boundary: these are only 25-epoch / about-three-minute-per-singer previews, trained with `pm` F0 after RMVPE download was unavailable. Do not claim final fidelity. Let the user listen first; then either continue the selected singer from its checkpoint with more epochs and preferably RMVPE, or collect more clean authorized source audio.
- Runtime state: user asked to close resource-heavy applications. Douyin, WeChat, Chrome, Wallpaper Engine, desktop-pet Electron processes, and paused Qwen download processes were closed. Qwen3-TTS remains stopped; do not automatically restart it. The user can later restore it with `scripts\start-qwen3-tts.ps1` after they choose to resume normal desktop-pet use.

## Latest Session Update: Local Desktop Agent Foundation v1 on 2026-07-28

- Status: implementation and full local verification complete.
- Existing `tools.py` was extended instead of replaced. The private runtime now enables existing file/search/image/safe-command tooling; `open_url` accepts only `http(s)` URLs, `launch_app` delegates local application/file/folder/registered-URI opening to the OS, and `delete_path` is confirmation-only.
- New `agent_actions.py` owns bounded local pending approvals plus audit events. The LLM can request an action but cannot self-approve it: overwrite, deletion, high-risk system commands, and future login/payment/submission adapters return a one-time confirmation ID, valid for 15 minutes.
- `POST /api/agent/confirm` redeems or cancels an approval under the existing API-token/origin guard; `GET /api/agent/actions` returns safe pending/audit state. `web/toolMetaView.js` now renders Confirm/Cancel buttons, and `web/chat.js` calls the protected confirmation route.
- Scope limitation: Playwright/browser-use/OpenHands were researched but not embedded yet. This slice opens URLs and lays the permission/execution contract; full DOM browsing, third-party login flows, and arbitrary desktop-app control need dedicated adapters and verification before being enabled.
- Verification: focused suite `139 passed`; full `scripts\test-local.ps1` passed with `590` Python tests, all Node frontend tests, Python syntax `130` files, JavaScript syntax `164` files, and secret scan `612` files. JSON validation and scoped `git diff --check` passed.
- Preserve all `.bak` files and unrelated dirty work. Do not commit, push, or merge.

## Latest Session Update: Xinyu Shared Experience Continuity v1 on 2026-07-28

- Status: implementation and full local verification complete.
- New file: `shared_experience.py`. It records only existing high-confidence episodic core-memory candidates that describe a concrete shared action, decision, milestone, or relationship-relevant event. No second extraction LLM call is made.
- Prompt behavior: regular turns see a shared moment only on lexical relevance. Proactive turns may see one most-recent moment only after the configured 24-hour recall cooldown, and the model is told not to turn it into a reminder or proof of closeness.
- Safety: local state is bounded to 36 records, de-duplicated, and rejects sensitive strings, markup/stage directions, garbled text, and low-signal non-episodic candidates.
- Private runtime change: `config.local.json` is set to Chinese-primary with a few natural English short words permitted, and the persona override no longer asks for English-first replies. Restart Electron to load this private configuration; do not commit it.
- Verification: focused suite `90 passed`; full `scripts\test-local.ps1` passed with `587` Python tests, all Node frontend tests, Python syntax `128` files, JavaScript syntax `164` files, and secret scan `610` files. `python -m json.tool config.example.json`, `python -m json.tool config.local.json`, and scoped `git diff --check` passed.
- Preserve all `.bak` files and unrelated dirty work. Do not commit, push, or merge.

## Latest Session Update: Xinyu Meaningful Surprise Character v1 (2026-07-28)

- User wants surprise, self-direction, and occasional original thoughts or news-like observations—not a deterministic quirky persona or cryptic non sequiturs. A plain "下午好" must not produce unexplained keyboard/cursor/pixel commentary.
- The effective ignored `config.local.json` prompt was replaced. It now allows meaningful independent ideas only when they have a clear premise, understandable value, and a real opening for conversation; it rejects deliberate topic loss, knowingly defended errors, forced incompleteness, invented current news, and ornamental desktop imagery.
- Default configuration and `companion_dialogue_policy.py` now mirror this direction. `character_brain.py` assigns `performance_bit=none` for plain/non-desktop messages, while preserving optional desktop flavor when the user actually discusses desktop objects or runtime behavior.
- Regression coverage verifies the default prompt, the model-direct policy, no forced greeting desktop bit, and preserved relevant desktop behavior. Focused `100` tests pass; full `scripts\test-local.ps1` passes with `584` Python tests, all Node tests, Python syntax `126`, JavaScript syntax `164`, and secret scan `608`. Only the existing pydub `audioop` deprecation warning remains.
- Reload the Python backend or restart Electron once after this change so it reads `config.local.json`. Do not commit `config.local.json`, unrelated dirty work, or any `.bak` file.

## Latest Session Update: Xinyu A2 Original Bilingual VoiceDesign v1 (2026-07-28)

- The accepted target is A2: the earlier clear and milk-sweet A direction, made only a tiny step more mature and a little more energetic. The user accepted its Chinese result and strongly preferred the English rendition.
- Default local runtime is now `D:\AI\models\Qwen3-TTS-12Hz-1.7B-VoiceDesign`, display voice `A2_Original`, port `9881`. Both the main `model.safetensors` and speech tokenizer were verified against official SHA-256 values before use.
- The service detects VoiceDesign from the loaded model path or an explicit `--mode`. VoiceDesign calls `generate_voice_design_streaming` with the bounded A2 instruction and fixed generation seed/settings. Legacy CustomVoice paths still call `generate_custom_voice_streaming` with supported speakers and `Ono_Anna`.
- Default `Auto` requests now infer monolingual Chinese or English from the actual text, reproducing the accepted language-specific pronunciation prompts. Explicit supported languages are canonicalized; arbitrary values cannot enter the instruction.
- Direct health reports CUDA, `voice_mode=voice_design`, `voice_design=true`, `speaker=A2_Original`, and streaming. Measured first audio: cold Chinese about `3146 ms`, warm Chinese about `359 ms`, warm English about `282 ms`. Language-aware local Whisper recovered the full smoke text; no smoke WAV clipped.
- A stable fixed seed and bounded description reduce drift but VoiceDesign is still generative, so native Electron listening should watch identity consistency across unrelated sentences and mixed-language turns. Only one large local TTS model should remain resident on the 8 GB GPU.
- Verification passes: focused `76` Python TTS/config tests plus Qwen, config-switch, stream-queue, and playback-start frontend checks; full `scripts\test-local.ps1` passed with `582` Python tests, all Node frontend tests, Python syntax `126`, JavaScript syntax `164`, and secret scan `608`. The only warning is the existing third-party pydub `audioop` deprecation.
- Preserve all unrelated dirty work and every `.bak` file. Do not commit or push.

## Latest Session Update: Semantic Emotive Voice and Live2D Performance Sync v1 (2026-07-27)

- The user selected a Neuro-sama-like direction: playful, cute, energetic, intentionally anime rather than human-realistic. Speech should continuously carry restrained body/head life; strong emotion actions may occur every `2-3 s` at meaningful highlights but must not repeat or steal focus.
- Replies now expose a compatible per-sentence `performance_segments` contract alongside the existing whole-turn plan. Supported semantic states are neutral, happy, playful, excited, shy, hurt, sad, anxious, angry, surprised, serious, and thinking.
- The segment cue now survives the complete path: semantic resolution -> numeric prosody and allowlisted Qwen fields -> synthesis -> real audible playback start -> expression/body/action. The prior serialized-request branch that replaced segment prosody with `null` is fixed.
- Qwen3-TTS 1.7B CustomVoice uses bounded fixed delivery instructions. 0.6B remains a valid low-latency fallback and never receives unsupported `instruct`. Prewarm audio is discarded when its text matches but its final semantic signature does not.
- Hiyori mappings use its verified expressions, motion groups, and parameter IDs only. Its parameter director owns semantic gesture cooldowns, so a rejected repeated action cannot fall through to a duplicate generic motion. No additional `requestAnimationFrame` or resident animation loop was added.
- Full `scripts\test-local.ps1` passes: `573` Python tests, all Node tests, Python syntax `126`, JavaScript syntax `163`, and secret scan `607`; only the existing pydub `audioop` deprecation warning remains.
- Current runtime is deliberately usable during the large model download: Qwen 0.6B is healthy on CUDA at `127.0.0.1:9881`, streaming enabled, `emotion_instruction=false`. ModelScope is downloading 1.7B into `D:\AI\models\Qwen3-TTS-12Hz-1.7B-CustomVoice`. When complete, stop the fallback service and run `scripts\start-qwen3-tts.ps1`; it automatically prefers that local 1.7B directory and health should report `emotion_instruction=true`.
- Required manual Electron pass after 1.7B activation: compare playful/serious/shy/hurt/surprised sentences, watch that expression changes begin with sound, interrupt a multi-sentence reply, repeat the same strong emotion, and judge latency/action density. Preserve unrelated dirty work and every `.bak`; do not commit or push.

## Latest Session Update: Punctuation-Only ASR Guard v1 (2026-07-27)

- The user confirmed that silence produced a visible user card containing only `。`, after which the LLM replied.
- Logs show an ASR result with `text_chars=1` followed by a chat request with `user_chars=1`; this was not a real semantic transcript.
- All frontend ASR entry paths now require at least one Unicode letter or number before live-turn classification. Pure punctuation cannot interrupt, enter a merge window, queue a voice turn, create a card, or call the LLM. The rejection is retained locally as `punctuation_only` debug evidence.
- Normal multilingual text, numbers, fillers such as `嗯`, and hidden paralinguistic cues remain compatible.
- Focused local/bilingual ASR, no-barge queue, and free-chat tests pass. The complete `scripts\test-local.ps1` gate passes with `563` Python tests, all Node frontend tests, Python syntax `125`, JavaScript syntax `163`, and secret scan `606`; the only warning is the existing pydub `audioop` deprecation. Restart Electron while leaving persistent SenseVoice/Qwen warm, then leave the microphone open briefly without speaking and confirm no card appears.
- Electron restarted successfully with root PID `100056` and backend PID `64696` listening on `127.0.0.1:8123`. Persistent SenseVoice `9890` remains ready and Qwen `9881` remains loaded on CUDA with streaming enabled.
- Preserve unrelated dirty work and every `.bak` file. Do not commit or push.

## Latest Session Update: Ordered Continuation Ownership Fix (2026-07-27)

- Real field failure: two spoken sentences led to three independent assistant cards; the first card was left as instant text without speech, the second was cut off midway, and the third took over.
- Logs showed three overlapping chat streams and two client-side aborts while Qwen synthesis remained healthy. The fault was renderer turn ownership, not ASR audio capture or Qwen generation.
- An ASR-confirmed ordinary continuation is now authoritative even if the prior turn is currently thinking or between audio segments. `requestAssistantReply()` no longer downgrades it using an instantaneous speaking check and no longer globally stops audio when that preserved chain happens to look idle.
- Explicit stop/correction requests still use the existing immediate cancellation path. Ordinary continuation cards remain independent visible records but their LLM/TTS work is delivered in order.
- Focused companion-turn, local-ASR, stream queue/completeness, server cancellation, and stage regressions pass. The complete `scripts\test-local.ps1` gate passes with `563` Python tests, all Node frontend tests, Python syntax `125`, JavaScript syntax `163`, and secret scan `606`; the only warning is the existing pydub `audioop` deprecation. Restart Electron and field-test three ordinary independent cards plus one explicit stop.
- Electron restarted successfully with root PID `106048` and backend PID `135684` listening on `127.0.0.1:8123`. Persistent SenseVoice `9890` remains ready on ONNX INT8 and Qwen `9881` remains loaded on CUDA with streaming enabled.
- Preserve unrelated dirty work and every `.bak` file. Do not commit or push.

## Latest Session Update: Speech Delivery Coherence v1 (2026-07-27)

- The user approved optimizing pause, subtitle sync, and delivery together. Target behavior is natural conversation, text slightly ahead of speech (`200-500 ms`), and cute/lively energy without forced verbal fillers. Voice/timbre work is explicitly deferred to the next goal.
- PCM streaming, HTML Audio, and AudioContext fallback now publish optional generation/session-fenced playback progress. Ordered continuation cards use the measured clock with a `350 ms` text lead instead of exposing the whole reply or relying only on fixed CSS duration.
- After prior speech ends, the next ordinary continuation adds only a cancellable `80-280 ms` punctuation/style-aware breath. Stop/correction behavior remains immediate and no older audio session is revived.
- Stable companion prewarm now uses the selected mood/style prosody rather than neutral synthesis, improving the handoff between its prefix and later tail without adding text.
- Focused regressions pass. The complete `scripts\test-local.ps1` gate passes with `563` Python tests, all Node frontend tests, Python syntax `125`, JavaScript syntax `163`, and secret scan `606`; the only warning is the existing third-party pydub `audioop` deprecation. Restart Electron without stopping the persistent SenseVoice/Qwen services, then field-test two ordinary consecutive replies: judge the boundary breath, whether text stays roughly one short phrase ahead, and whether the second opening sounds connected.
- Electron was restarted successfully: root PID `130416`, backend PID `61980`, listening on authenticated `127.0.0.1:8123`. SenseVoice `9890` remains `ready` on ONNX INT8 and Qwen `9881` remains loaded on CUDA with streaming enabled.
- Preserve all unrelated dirty work and `.bak` files. Do not commit or push.

## Latest Session Update: Ordered Continuation Delivery v1 (2026-07-27)

- The user confirmed that two ordinary assistant replies produced from continuous speech must both be spoken in order. Only an explicit stop or correction may cancel older queued speech. The second reply should carry a connected tone, and its text should appear progressively just ahead of its own audio.
- Root cause: assigning every new reply a fresh `streamSpeakSession` made the old session stale. Its visible text could finalize while queued audio was skipped in favor of the newer session.
- Substantive speech that began during assistant activity now carries an ordered-continuation marker through the ASR queue. It waits for the old model request, not the old audio, so the next LLM reply and Qwen prewarm can proceed while the earlier reply remains audible.
- The new reply does not reset the old stream queue. After the actual prior speech boundary, it activates its own session and immediately reuses prewarmed audio. A stuck playback state has a bounded 45-second handoff; semantic stop/correction retains the existing immediate abort path.
- Continuation text stays hidden while waiting. Actual playback start restarts the character reveal, with a longer bounded delay range for large deltas; finalization preserves the animation instead of replacing it with the full paragraph.
- Normal first-turn model-direct Qwen speech keeps its low-latency streamed-text path; only marked cross-reply continuation waits for prior audio.
- Focused regressions pass. The complete `scripts\test-local.ps1` gate passes with `563` Python tests, all Node frontend tests, Python syntax `125`, JavaScript syntax `163`, and secret scan `606`; the only warning is the existing third-party pydub `audioop` deprecation.
- Electron restarted successfully. The app listens on `127.0.0.1:8123`; persistent SenseVoice `9890` remains ready and Qwen `9881` remains loaded on CUDA.
- Field-test two ordinary continuation replies plus one explicit correction.
- Preserve all unrelated dirty work and `.bak` files. Do not commit or push.

## Latest Session Update: Natural Conversation Handoff v1 (2026-07-27)

- The user rejected one fixed interruption rule. Desired behavior is content-dependent, similar to natural conversation: some speech should stop the assistant immediately, some should wait for a meaningful sentence boundary, and short acknowledgements may not stop it at all.
- The cancellation path previously removed the unfinished assistant row. The TTS session was safely cancelled, but already visible/heard wording was absent from history, making the replacement reply feel like a new question-answer pair.
- A non-empty interrupted draft is now finalized synchronously with `…`, persisted before the replacement user turn, and protected from stale catch cleanup. The incomplete row has no rating controls. New stale audio remains cancelled exactly as before.
- Confirmed correction/stop kinds bypass protection; ordinary substantive speech can finish only the existing bounded key segment. Backchannels remain hidden. Sanitized interruption context tells the current LLM to infer the conversational relationship, avoid repeating heard wording, and choose among yield, integrate, briefly resume, answer latest, or abandon the old thought.
- The next assistant card remains a separate message but carries a continuation class with tighter spacing and quieter chrome.
- Older confirmed-speech callers without a semantic kind retain immediate interruption. The active local ASR path supplies typed semantic decisions, and the prompt still prioritizes a latest message that genuinely needs a direct response.
- Focused regressions pass. The complete `scripts\test-local.ps1` gate passes with `563` Python tests, all Node frontend tests, Python syntax `125`, JavaScript syntax `163`, and secret scan `606`; the only warning is the existing third-party pydub `audioop` deprecation.
- Electron restarted successfully. The app listens on `127.0.0.1:8123`; persistent SenseVoice `9890` remains ready and Qwen `9881` remains loaded on CUDA.
- Field-test one mid-sentence correction, one additive supplement, and one “嗯”.
- Preserve all unrelated dirty work and `.bak` files. Do not commit or push.

## Latest Session Update: Thinking-Phase Continuous Listening v1 (2026-07-27)

- The user confirmed the desired GPT-Live-like rule: the microphone remains active while the assistant thinks or speaks; substantive new speech replaces the stale turn, while short “嗯/哦/对” acknowledgements stay hidden and do not interrupt.
- The implementation was already present in `web/localAsrController.js` and `web/chatReplyController.js`, but the ignored active profile had `conversation_mode.interrupt_tts_on_user_speech=false`. That caused `sendAssistantTurn()` to suspend recognition as soon as `chatBusy` began.
- `config.local.json` now enables the existing full-duplex setting. Public defaults remain enabled, explicit legacy no-barge configurations remain compatible, and no private configuration is committed.
- `tests/test_local_asr_frontend.js` now proves with `chatBusy=true` that assistant thinking cannot acquire a microphone pause lease or stop recognition in full-duplex mode.
- Focused regressions passed. The complete `scripts\test-local.ps1` gate passed with `563` Python tests, all Node frontend tests, Python syntax `125`, JavaScript syntax `163`, and secret scan `606`; the only warning is the existing third-party pydub `audioop` deprecation.
- Electron restarted successfully with the corrected profile. The app is listening on `127.0.0.1:8123`; the independent SenseVoice `9890` service remains ready and Qwen `9881` remains loaded on CUDA.
- Field-test by speaking a substantive second sentence while the first turn shows thinking, then use a short “嗯” during speech to confirm it remains a hidden backchannel.
- Preserve all unrelated dirty work and `.bak` files. Do not commit or push.

## Latest Session Update: Voice-First Reply Latency v1 (2026-07-27)

- The user confirmed restart-to-first-ASR remains about one second, then selected the next target: actual streamed reply text should appear continuously, stay only slightly ahead of speech, and ideally begin with audio in `1–2 s`.
- Logs prove the bottleneck is the configured remote `claude-haiku-4-5-A` relay, not ASR or Qwen. Recent first deltas were `5.9–10.5 s`; SenseVoice was `135–567 ms`, and Qwen first chunks were `234–902 ms`.
- Minimal/full controlled probes were about `2.37 s` and `3.2–5.0 s` to first token. Other advertised relay routes were unavailable, returned no visible text, or were key-budget blocked, so do not silently switch the user's chat model.
- `conversation_mode.voice_low_latency_enabled=true` is enabled only in ignored `config.local.json`. Voice requests use the compact dialogue and character-brain blocks plus four recent history items; typed turns and legacy configs retain the full prompt.
- Prompt size measured about `4054` characters with four recent messages versus about `6997` for the prior zero-history full prompt. One real compact request reached first text in `2498 ms`; the external relay still prevents a truthful hard `1–2 s` guarantee.
- `web/chatMessageController.js` appends new characters in lightweight arrival spans, and `web/stage.css` supplies the subtle motion/caret plus reduced-motion fallback. Finalization flattens the text back to the normal stable message DOM.
- Qwen continues to start only from stable punctuation boundaries through the existing cancellable exactly-once stream queue. Do not re-enable the synthetic 850 ms waiting voice hint; it was intentionally disabled because it can race the real reply.
- Focused checks passed (`172` Python tests plus stage, companion-turn, and Qwen frontend checks). The complete `scripts/test-local.ps1` gate passed with `563` Python tests, all Node frontend tests, Python syntax `125`, JavaScript syntax `163`, and secret scan `606`; the only warning is the existing third-party pydub `audioop` deprecation.
- Restart Electron once for a real voice timing and visual pass. Preserve all unrelated dirty work and `.bak` files; do not commit or push.

## Latest Session Update: Persistent SenseVoice Service v1 (2026-07-27)

- The user restarted the desktop pet and initially saw a 100% peak with no visible transcript. Logs showed valid roughly 2.2-second PCM and successful 13/20-character recognition, but cold SenseVoice initialization delayed the first requests by about 60 and 37 seconds. After warmup, the user's real microphone transcript appeared in about one second.
- Final recognition now prefers an independent managed service at `127.0.0.1:9890`, so Electron restarts no longer unload the recognizer. The default runtime is official `funasr-onnx` SenseVoiceSmall INT8 in `D:\AI\sensevoice_runtime`; model weights stay in the user ModelScope cache.
- Warm adapter evidence is `394 ms` for the existing English reference sample. The ONNX service measured about `553 MB` working set and `1.26 GB` private memory; the rejected PyTorch persistent service reached about `5.15 GB` private memory.
- If the service is warming or unavailable, `local_asr_provider.py` immediately uses Vosk and does not cold-load an in-process model. Setting `sensevoice_service_enabled=false` preserves the legacy in-process route for old/private configurations.
- `app.schedule_local_asr_warmup()` probes, detached-starts, and polls the service without blocking the UI. The service is loopback-only, accepts bounded PCM in memory, serializes inference, and never persists microphone audio.
- Focused ASR/config/health/service validation passed (`79 passed`). The complete `scripts\test-local.ps1` gate passed with `559` Python tests, all Node frontend tests, Python syntax `125`, JavaScript syntax `163`, and secret scan `606`; the only warning is the existing third-party pydub `audioop` deprecation.
- The independent service remained `ready` with runtime `onnx-int8` on port `9890` after validation. Next field check: restart Electron without stopping the service, open the microphone immediately, and confirm the first natural Chinese/English phrase still appears in about one second.
- Preserve all unrelated dirty work and `.bak` files; do not commit or push.

## Latest Session Update: Semantic Full-Duplex Voice v1 (2026-07-26)

- The user accepted these rules: microphone capture remains active while ASR/LLM/TTS work; consecutive phrases are merged in order; “嗯嗯/哦/啊” are hidden backchannels; substantive speech, correction, negation, and stop commands interrupt immediately after semantic confirmation.
- `web/localAsrController.js` no longer interrupts on the first VAD frame. It publishes a non-destructive candidate, classifies the finalized transcript, retains recent backchannel tone privately, and calls the existing interruption boundary only for confirmed meaningful turns.
- A full-duplex burst uses a 520 ms final merge delay. If another utterance starts while a transcript is pending, the flush is held up to the existing 10-second sentence safety bound and rescheduled when the next final transcript arrives. Multiple parts remain ordered and enter one replacement assistant request.
- `web/chatReplyController.js` records `voice_barge_in_candidate` without stopping playback, while `confirmedTranscript=true` immediately aborts the active chat stream and TTS through the existing generation/session cancellation logic.
- Focused voice queue, ASR, character runtime, no-barge-in, bilingual, stream TTS, and cancellation regressions pass. The complete `scripts\test-local.ps1` gate passes with 550 Python tests, all Node frontend tests, 121 Python syntax files, 162 JavaScript syntax files, and 597 secret-scan files; the one warning is the third-party pydub `audioop` deprecation. Restart Electron, then field-test: start a long assistant reply, say “嗯嗯” once, and afterward interrupt with two connected phrases.
- Electron was restarted and `/api/asr/status` reached `provider=auto`, `status=ready`, `required=false`. The next required evidence is the user's real-microphone test of one backchannel followed by a two-phrase substantive interruption.
- Preserve all unrelated dirty work and `.bak` files. Do not commit, push, or change private keys/models/audio samples.

## Latest Session Update: Hidden Paralinguistic Understanding v1 (2026-07-26)

- The accepted behavior is hidden-only: nonsemantic sounds should affect the assistant's understanding but must not appear as synthetic user messages or be written into visible conversation memory.
- `local_asr_provider.py` now parses raw SenseVoice language, emotion, and acoustic-event tags before text cleanup. It also computes bounded voiced ratio and pitch stability, suppresses known subtitle-template hallucinations, and suppresses very short semantic guesses when stable voiced audio conflicts with a non-speech event.
- `app_asr_route.py` returns only allowlisted paralinguistic fields. `web/localAsrController.js` preserves those fields beside ordinary speech, or creates one hidden/nonremembered voice turn for a meaningful pure cue. `web/chatReplyController.js` and `app_chat_context.py` sanitize the metadata again and instruct the LLM to treat it as uncertain tone rather than literal words or a precise inferred intention.
- The real environment had FunASR 1.0.27 despite `requirements-asr.txt` requiring 1.3.22 or newer. It was upgraded to FunASR 1.3.29, fixing the cached SenseVoiceSmall class-registration failure. Cached model paths are selected directly to avoid repeated ModelScope update checks.
- The ignored private `config.json` now selects `provider=auto`, keeps Paraformer streaming disabled, and enables SenseVoice final refinement plus the existing loopback Whisper fallback. Do not commit this private configuration.
- A local 1.6-second humming-like smoke sample now returns no visible text and a hidden neutral/BGM/nonverbal cue. Cold initialization was about 14.7 seconds and hot inference about 0.36 seconds, so `app.schedule_local_asr_warmup()` loads SenseVoice on a daemon for non-Vosk profiles without disabling the microphone or blocking other UI.
- Electron was restarted after enabling the ignored local override. The authenticated status endpoint reached `provider=auto`, `status=ready`, and `required=false`; a hot authenticated PCM smoke completed in 0.466 seconds with no visible text and the expected hidden SenseVoice cue.
- Focused tests pass. The complete `scripts\test-local.ps1` gate passes with 550 Python tests, all Node frontend tests, 121 Python syntax files, 162 JavaScript syntax files, and 597 secret-scan files; the one warning is a third-party pydub `audioop` deprecation. Restart Electron, then ask the user to test one normal sentence followed by a separate 1-2 second hum. Do not claim arbitrary humming-intent understanding: the current layer recognizes uncertain tone/event/vocalization context.
- Preserve every unrelated dirty change and `.bak` file. Do not commit, push, or modify private model/audio assets.

## Latest Session Update: Voice Runtime Latency and Fallback Recovery v1 (2026-07-26)

- Latest runtime evidence at about 17:26 showed Vosk ready in roughly four seconds, followed by two successful `/api/asr_pcm` responses and no `/api/chat_stream`; both recognition results were therefore empty. The current problem is no longer a stuck HTTP request.
- `web/index.html`, `web/chatDom.js`, `web/stage.css`, and `web/localAsrController.js` add a composer-owned voice feedback pill that is independent of the icon-only microphone and the responsive-hidden header status. It shows initialization, listening, actual level movement, recognition, muted input, and a persistent empty-result warning.
- `app_asr_route.py` now emits safe numeric ASR performance diagnostics (`audio_ms`, RMS, peak, provider, text length, elapsed milliseconds) without logging or persisting microphone audio. Use the first new `[ASR][PERF]` line after restart to distinguish silent/wrong input from recognizer failure.
- `local_asr_provider.py` supports an explicitly enabled, loopback-only faster-whisper fallback after empty/failed Vosk recognition. The existing service at `127.0.0.1:9889` uses faster-whisper `small`, CPU int8, and was warmed successfully; its process working set was about 350 MB after warmup. The ignored `config.json` enables it, selects Chinese input, disables FunASR streaming/refinement, uses a 10-second sentence cap, and lowers the threshold to `0.0022`.
- Complete validation passes: `scripts\test-local.ps1` reports 546 Python tests, all Node frontend tests, 121 Python syntax files, 162 JavaScript syntax files, and 597 secret-scan files. The 39 warnings are existing third-party deprecations. Restart Electron once and ask for one natural sentence; do not claim field completion until the meter moves and a transcript appears.
- Electron was restarted once after validation. Read-only native visual QA confirmed the new idle voice label and meter track are visible in the real Live2D stage and do not overlap the composer or utility rail; no microphone input was activated by automation.
- Follow-up field evidence showed the first composer-relative feedback could still disappear at the user's full-screen/device-scale layout. `web/phosphorIcons.css` now supplies the final ID-specific, fixed-position visibility guarantee. `web/localAsrController.js` shows live percentage plus selected device and promotes muted/no-frame watchdog failures into the same visible surface.
- The follow-up screenshot had the microphone still open and generated no new `/api/asr_pcm`, so it proved that speech segmentation had not fired but did not yet prove submitted PCM was silent. The prior question about the header green dot was not diagnostic because that dot is not bound to `micLevel`. Use the new feedback text after the latest restart: percentage movement proves capture; “没有收到音频帧” proves the Web Audio callback is stalled; 0% with a named device proves frames exist but are effectively silent.
- The second correction was restarted and visually verified without activating the microphone. The complete gate remains green at 546 Python tests plus all Node, syntax, and secret checks.
- The user subsequently confirmed real speech now transcribes. The remaining complaint was aesthetic: the full-width “点击麦克风开始说话” track was visually heavy. `web/index.html`, `web/chatDom.js`, `web/localAsrController.js`, `web/stage.css`, and the final `web/phosphorIcons.css` now implement a hidden-when-closed compact waveform capsule with seven live level-driven colored bars, a small percentage, clear processing/error states, and reduced-motion behavior.
- The compact waveform preserves the viewport-level anti-clipping guarantee and device/error diagnostics through its title and status text. Complete validation remains 546 Python tests, all Node frontend tests, 121 Python syntax files, 162 JavaScript syntax files, and 597 secret-scan files.
- The user accepted immediate app startup with an explicit temporary voice-initialization state. `app.py` now tracks the Vosk warmup lifecycle and serves a path-free `/api/asr/status`; `web/localAsrController.js` polls it, disables only the microphone while warming, labels the button “语音初始化中”, and automatically restores “开麦: 关” plus a “语音已就绪” status when ready.
- Do not reintroduce a fixed user-facing wait. Other app features remain usable during warmup, and local Vosk opening is guarded until readiness is confirmed. The latest full gate passes with 542 Python tests, all Node frontend tests, 121 Python syntax files, 162 JavaScript syntax files, and 597 secret-scan files.
- Latest field retest is not yet accepted: the user restarted Electron, spoke naturally, waited, closed the microphone, and still saw no transcript. Runtime logs eventually recorded one `/api/asr_pcm` HTTP 200 at 16:54:09 after expensive SenseVoice/Vosk cold loading, so the request path existed but its latency and empty/unused result were unacceptable.
- `web/stage.css` now exposes the meter in the main `view-full` Live2D stage as a compact composer-adjacent pill. `web/localAsrController.js` retains RMS with manual-capture frames and trims long silence around the detected speech region before close-time transcription.
- The ignored `config.local.json` now uses `provider=vosk`, `final_refine_enabled=false`, `streaming_enabled=false`, and `speech_threshold=0.0022`. Public defaults remain compatible. `asr.preload_vosk_models()` and `app.schedule_local_asr_warmup()` load available configured Vosk models on a daemon after server startup, moving the one-time cold load out of the first utterance.
- Full validation passes with 541 Python tests, all Node frontend tests, 121 Python syntax files, 162 JavaScript syntax files, and 597 secret-scan files. Keep `voice-runtime-latency-recovery-v1` in progress until the user restarts, allows roughly 15 seconds for initial warmup, confirms visible meter movement, and receives a transcript.
- Real-user evidence confirmed that audio capture and transcription now work, but feedback and latency still felt wrong. The microphone meter was being hidden by `web/kawaiiTheme.css`, and the 2.2-second maximum capture forced a normal sentence into several `/api/asr_pcm` jobs. The meter is visible again; new defaults use a 10-second safety cap and a 420 ms Silero release window.
- `config.py`, `config.example.json`, the configuration UI, and troubleshooting docs carry the same new defaults. Explicit legacy values remain supported, and the sanitizer accepts up to 15 seconds. The ignored private profile opts into `max_speech_ms=10000`, `silero_vad_redemption_ms=420`, and keeps preview streaming disabled.
- The Silero regression is fixed and verified in the real Electron renderer. Root cause was CSP rejecting ONNX WebAssembly compilation; `web/index.html` now permits the narrow `'wasm-unsafe-eval'` source while continuing to reject general `'unsafe-eval'`.
- `web/sileroVadAdapter.js` reuses one loaded MicVAD controller, runs ORT WASM with one thread, cools down failed starts for 120 seconds, and preserves energy detection for any session where Silero was late or unavailable.
- `web/localAsrController.js` aborts stale streaming-preview fetches before final PCM transcription and waits only 450 ms for an already-running final result before using the bounded manual-close snapshot. This prevents the former request burst and duplicate aborted final requests.
- `local_asr_provider.py` records bounded model-load failures so repeated HTTP requests fall back to Vosk without repeating expensive FunASR initialization. `app_asr_route.py` treats renderer cancellation as a normal disconnected client rather than attempting a second socket write.
- The ignored `config.local.json` uses `streaming_enabled=false`, `final_refine_enabled=true`, and a 120-second model-failure cooldown for the user's lower-resource runtime. Do not commit that private file; public defaults still expose Paraformer streaming.
- Earlier native proof showed no Silero warning and HTTP 200 for the V5 model, ORT runtime, WASM, and VAD worklet. A later attempt to refresh the already-running Electron window was stopped after the captured handle rejected activation twice; restart the app before validating the visible meter and final timing with one natural 3–6 second sentence.
- Full validation passes with 540 Python tests, all Node frontend tests, 121 Python syntax files, 162 JavaScript syntax files, and 597 secret-scan files; 39 third-party deprecation warnings remain non-failing.
- Preserve all unrelated dirty changes and every `.bak` file. No commit, push, PR, merge, model asset, API key, or private voice sample was created. Resume the deferred progressive-disclosure frontend optimization only after the user confirms one real sentence transcribes promptly.

## Latest Session Update: Natural Companion and Voice Continuity v1 (2026-07-26)

- The combined companionship and voice-stability objective is code-complete. Default replies remain English. The preview and private local profiles enable bounded, low-frequency continuation; legacy configurations remain opt-in and the existing “主动陪伴” control can disable it for the current session.
- `web/sileroVadAdapter.js` integrates the permissively licensed `@ricky0123/vad-web` v5 model with the existing MediaStream. `web/localAsrController.js` uses its speech events when ready and otherwise retains energy VAD, FunASR/Vosk fallback, and one-shot manual-close transcription.
- `app.py` serves only fixed allowlisted VAD/ORT runtime assets below `/runtime/vad/`; traversal and unknown runtime names remain unavailable. The dependency versions are pinned in `package.json` and notices are recorded in `THIRD_PARTY_NOTICES.md`.
- `web/ttsPlaybackController.js` performs bounded same-voice GPT-SoVITS startup retries before any explicitly configured browser fallback. Do not weaken the existing turn/generation/segment ledger: it is the exactly-once boundary that prevents replay while recovering an undelivered tail.
- Complete validation passes: 538 Python tests, all Node frontend tests, 121 Python syntax files, 162 JavaScript syntax files, 597 secret-scan files, static VAD asset 200/404 probes, and zero npm audit vulnerabilities. The 39 warnings are non-failing third-party deprecations.
- Next recommended check is a native Electron listening session with the user's actual microphone and private GPT-SoVITS endpoint. Tune Silero positive/negative thresholds or the 720 ms redemption window only from observed clipped or prematurely split phrases.
- Preserve the large unrelated dirty worktree and every `.bak` file. `config.local.json` contains ignored private opt-in settings and must not be committed. No commit, push, PR, merge, model asset, API key, or private voice sample was created.

## Latest Session Update: Desktop Pet Presence Anchor Follow (2026-07-20)

- `web/live2dLayoutController.js` owns `syncPetPresenceAnchor()`, which converts renderer coordinates through the canvas client rect and publishes screen-space X/Y CSS variables only in the desktop model view.
- The helper runs after initial placement/clamping and in all model-position drag paths. It intentionally does not run from the idle-motion frame loop, so the badge follows deliberate placement without bobbing with subtle Live2D animation.
- `web/stage.css` places the fixed-size badge 10 px below `--pet-presence-y` and clamps it inside the viewport. Wheel zoom does not scale or resize the badge.
- `tests/test_drag_logic.js` covers the new screen-coordinate conversion and scale independence. Restart Electron and perform one native drag near the top and bottom edges for final hardware/window-scale visual confirmation; preserve unrelated work and every `.bak` file.
- Full validation passes: 533 Python tests, all Node frontend tests, 120 Python syntax files, 160 JavaScript syntax files, and 594 secret-scan files. No commit, push, or merge was made.

## Latest Session Update: Independent History Lanes and Compact Header (2026-07-20)

- `web/index.html` now contains `user-chat-log` and `assistant-chat-log` inside the existing `chat-log` shell. `web/chatDom.js` exposes them, and `web/chatMessageController.js` routes full-stage rows and time dividers by role while retaining the chronological shared log in `view-chat`.
- The full-stage lanes have independent `overflow-y`, contained wheel propagation, subtle interaction-only scrollbars, and a non-interactive center gap for Live2D. New messages auto-scroll only their own role lane. Existing stored history and sticker records require no migration.
- `web/phosphorIcons.css` reduces the large header to 76 px and pins every `.message-time` node to the card's upper-right corner with readable day/night contrast. The existing collapse control still hides and restores both lanes together.
- Browser verification covered desktop geometry, real left-lane wheel isolation, card timestamps including a sticker, collapse/expand, and the standalone chat fallback. Restart Electron before native review; preserve all unrelated dirty work and every `.bak` file.
- Complete verification passes: 533 Python tests, all Node frontend tests, 120 Python syntax files, 160 JavaScript syntax files, 594 secret-scan files, JSON parsing, and `git diff --check`. The browser surface was fixed at 1280 x 720; narrow-layout behavior remains covered by the existing CSS fallback and automated contracts but should receive a later native narrow-window visual pass if that layout becomes a priority.

## Latest Session Update: Selected Day Theme Sun Icon (2026-07-20)

- `web/index.html` already contained the local Phosphor `sun.svg`; the defect was a final CSS rule that hid all theme images and only restored the selected night icon. `web/phosphorIcons.css` now also restores the selected day icon.
- The day glyph is 17 x 17 px, white, centered beside the label with a 6 px gap, and uses a restrained berry drop shadow. Automatic mode and the selected-night moon treatment remain unchanged.
- Browser interaction verified day -> night -> day switching, correct `aria-pressed` state, visible icons in both selected states, and no horizontal overflow. `tests/test_stage_frontend.js` protects the asset and selector; the full local gate passes with 533 Python tests, all Node frontend tests, 120 Python syntax files, 160 JavaScript syntax files, and 594 secret-scan files.
- Restart Electron before reviewing this renderer-only update. Preserve all unrelated dirty work and every `.bak` file; no commit, push, or merge was made.

## Latest Session Update: More Launcher Readability Refinement (2026-07-20)

- The user screenshot exposed a real cascade bug: `controlCenter.css` supplied dark `--cc-ink` text while `kawaiiTheme.css` changed the More launcher to a dark berry surface. `web/phosphorIcons.css`, the final visual layer, now explicitly owns launcher text, icon, border, hover, focus, switch, and disabled-state contrast.
- Enabled buttons measure 14 px / 650 with `rgb(249, 229, 238)` text on the berry panel. Disabled Electron-only desktop actions remain readable but visibly secondary; section labels use 12 px / 750 and the launcher header uses a readable system font.
- Desktop browser verification measured a 560 x 314 launcher with zero overflow. The 390 px layout measured 366 x 511 and remained fully readable. The actual More → Schedule → Close interaction path passed.
- `tests/test_button_value_ui.js` now guards final-layer contrast ownership, readable label size, light action text, and a distinct disabled selector. Focused stage/control-center checks and the complete Node frontend suite pass.
- Restart Electron before native review. Preserve all unrelated dirty work and every `.bak` file; no commit, push, or merge was made.

## Latest Session Update: Voice Composer Proportion Refinement (2026-07-20)

- `web/phosphorIcons.css`, the intentional final visual layer, now overrides the large-screen composer to 960 x 74 with a 54 px microphone, 54 px input, and 94 x 54 send action. The three controls share one center line and use an 8 px gap.
- The microphone keeps the real local SVG state assets but no longer has a redundant inner ring. Closed day mode is a quiet white surface with a berry icon; closed night mode is dark rose; open mode remains clearly pink and illuminated.
- The input field has a calmer border/focus treatment, 32 px embedded attachment/sticker controls, and system text typography. Mobile uses a 362 x 64 shell at 390 px viewport width with zero body overflow.
- Browser verification covered desktop day/night and 390 x 844 day mode; input focus and typing work. Stage, stage-theme, control-center, and the complete Node suite pass, along with the secret scan, JSON parse, and `git diff --check`.
- Restart Electron before native review because this is a stylesheet-only renderer change. Preserve all unrelated dirty work and every `.bak` file; no commit, push, or merge was made.

## Latest Session Update: Desktop SVG States and Sticker Clearance (2026-07-20)

- `web/index.html` now uses real local SVG elements for the microphone's closed/open states, selected night moon, cat-ear marks, stage motifs, brand badge, and conversation identity. `web/localAsrController.js` updates `.mic-state-label`, `aria-label`, and `title` without replacing the icon nodes.
- `web/phosphorIcons.css` is still the last-loaded visual layer. At 1694 x 945 it measures the composer at 1020 x 90, microphone at 64 x 64, utility capsule at 330 x 59, with zero horizontal overflow. The utility remains at the lower right.
- Sticker cards are desktop-content-sized and `flex: 0 0 auto`; their images use `max-width: 100%`, intrinsic aspect ratio, and bounded height. The expanded conversation rail ends at y=751 while the utility capsule begins at y=762, so right-aligned content has an 11 px vertical safety gap.
- Browser interaction sent the built-in “惊讶” sticker through the real picker. Its 224 x 224 illustration was fully contained by a 253 x 274 card and did not overlap the utility capsule. Per the user's latest instruction, this follow-up intentionally did not reopen or retune mobile layouts.
- SVG sources are the official MIT-licensed Phosphor Core and Tabler Icons repositories; both licenses are stored beside the assets. Do not replace these icons with emoji or CSS-drawn glyphs.
- Verification passes: nine focused checks, the complete Node suite, `scripts\test-local.ps1` (533 Python tests, 120 Python syntax files, 160 JavaScript syntax files, 594 secret-scan files), four JSON parses, required ten-module Python compilation, 44 SVG XML parses, and `git diff --check`. The 40 warnings are third-party deprecations.
- Preserve all unrelated dirty work, every `.bak` file, centered Live2D behavior, configuration compatibility, and technical-message history isolation. No commit, push, or merge was made.

## Latest Session Update: Manual-close Voice Capture Fallback (2026-07-20)

- Field evidence from `/micdebug` showed the user intentionally uses the microphone as click-to-record: click once, speak, click again to finish. The previous close path only retained frames that VAD had already classified as speech, so a missed VAD decision produced no transcript.
- `web/localAsrController.js` now keeps a separate, bounded 30-second PCM capture for the active microphone session. On manual close, it force-transcribes that capture when no transcript was accepted; if normal VAD/streaming recognition already accepted speech, the full recording is not submitted again.
- `web/chatState.js` owns the bounded capture and duplicate-guard state. `tests/test_local_asr_frontend.js` covers a deliberately below-threshold recording, forced close snapshot, minimum duration, and duplicate prevention.
- The current merged config already has `asr.transcribe_on_close=true`. The complete local gate passes: 533 Python tests, all Node frontend tests, 120 Python syntax files, 160 JavaScript syntax files, 593 secret-scan files, and `git diff --check`.
- The user must restart Electron before retesting because these changes are in renderer JavaScript. Preserve all unrelated dirty changes and every `.bak` file; no commit, push, or merge was made.

## Latest Session Update: Reusable Rounded SVG Icons and Reference Fidelity (2026-07-20)

- `web/phosphorIcons.css` is the final visual layer. It maps local Phosphor SVGs to stage and control-center actions, repairs the microphone, and adds a native-aspect fidelity breakpoint without changing runtime behavior.
- `web/assets/icons/phosphor` contains 35 regular-weight SVGs, a reuse README, and the upstream MIT license. Source is the official `phosphor-icons/core` repository; do not replace these with emoji or platform-dependent font glyphs.
- The reported microphone collision is fixed by hiding the stage composer's legacy cat-ear pseudo-elements, clipping all button rings to one circular control, and overriding the legacy standalone-chat music-note rule with the same complete microphone SVG.
- Browser proof at 1694 x 945 measured: header 1658 x 88, message 456 x 118, composer 1040 x 104, utility rail 330 x 63, body overflow 0 x 0. Day, night, 1280 desktop, 390 mobile, 900 standalone chat, More, and model/voice control-center states were also inspected.
- Keep `phosphorIcons.css` after `kawaiiTheme.css` in `web/index.html`; the order is intentional because it resolves legacy high-specificity visual conflicts without altering feature JavaScript.
- Focused and complete verification passes: 533 Python tests, all Node frontend tests, 120 Python syntax files, 160 JavaScript syntax files, 593 secret-scan files, SVG XML validation, JSON validation, required Python compilation, and diff checks. The 40 Python warnings are third-party deprecations.
- Preserve all existing unrelated dirty work, every `.bak` file, the centered Live2D character, configuration compatibility, and technical-message history isolation. No commit, push, or merge was made.

## Latest Session Update: Hybrid Local Realtime ASR v1 (2026-07-19)

- `local_asr_provider.py` adds the optional local recognition provider: Paraformer produces bounded ordered partials and SenseVoiceSmall produces the final utterance, with lazy model loading, serialized inference, session expiry, and automatic Vosk fallback.
- `app_asr_route.py`, `app.py`, `config.py`, and `web/localAsrController.js` carry the new stream lifecycle without allowing renderer-selected model paths. Partial text only previews into an otherwise empty composer and cannot overwrite user typing or a newer microphone session.
- Health diagnostics, safe client configuration, Windows setup/model-preload scripts, example configuration, troubleshooting documentation, and focused Python/Node coverage were added. Raw microphone audio remains local and model assets remain outside the repository.
- The complete local gate passes: 533 Python tests, all Node frontend tests, 120 Python syntax files, 160 JavaScript syntax files, 590 secret-scan files, and `git diff --check`.
- Runtime installation is not complete in Electron's `.venv`: the NVIDIA CUDA PyTorch wheel download exceeded the available execution window and its scoped residual installer was stopped. The system Python has a CPU FunASR installation, but Electron intentionally continues selecting `.venv`; therefore Vosk remains active until `scripts\setup-local-asr.ps1 -Device cuda` completes successfully.
- Preserve all unrelated dirty changes and every `.bak` file. No model asset, private configuration, commit, push, or merge was added.

## Latest Session Update: Cute Anime Livestream Visual System (2026-07-19)

- The accepted concept remains in the local Codex generated-image cache (outside the repository). It establishes a friendly anime-livestream direction with a centered character, compact expressive header, conversation rail, utility cluster, and voice-first composer.
- `web/kawaiiTheme.css` applies the shared berry, sakura, cream, lilac, mint, and ink system to the complete stage, standalone chat, launcher, and all five control-center pages. It also supplies restrained code-native icons and motifs without adding a render loop.
- `web/xinyuDisplayFont.css` embeds a 19 KB offline WOFF2 subset as `Xinyu Kawaii Display`; `web/assets/fonts/ZCOOL-KuaiLe-OFL.txt` preserves the source font license. Body copy intentionally remains on the existing readable system stack.
- `web/controlCenterShell.js` now centers the selected narrow-screen navigation destination after the existing stable two-frame page handoff. All five destinations remain reachable at 390 px without exposing the stage or producing body overflow.
- Browser visual and interaction checks passed in 1694 x 945 day/night, 900 x 800 standalone chat, and 390 x 844 stage/control-center layouts. A typed draft survived page changes, advanced settings remained reachable, and the diagnostics destination revealed itself after navigation.
- Focused tests and the complete local gate pass: 533 Python tests, all Node frontend tests, 120 Python syntax files, 160 JavaScript syntax files, and 590 secret-scan files; 40 third-party deprecation warnings are non-failing. The already-running Electron renderer must be restarted to load the new stylesheet and embedded font before native visual acceptance.
- Preserve the current technical-message history isolation, every unrelated dirty change, and all `.bak` files. No commit, push, or merge was made.

## Latest Session Update: Control Center Continuity and Core-task Focus (2026-07-19)

- `web/controlCenterShell.js` now owns a persistent themed backplane, immediate navigation selection, a two-frame page-switch handoff, and visibility observation for schedule, persona, model/voice, memory, and diagnostics.
- Progressive disclosure now includes schedule execution type, persona interests/relationship details, memory undo/debug tools, the existing model/voice technical fields, and diagnostic raw reports. No feature or data binding was removed.
- `web/controlCenter.css` refines selected navigation, typography, spacing, radii, day/night materials, reduced motion, and narrow-screen action rows; `web/index.html` identifies the persona preferences section for disclosure.
- Browser visual and interaction checks passed in day, night, and 390 x 844 modes without horizontal overflow. Native Electron kept Live2D centered and switched model/voice to diagnostics over a continuous shell; because the existing renderer did not accept hot reload, final collapsed defaults were verified in the reloaded browser instead.
- Focused tests and the complete local gate pass: 524 Python tests, all Node frontend tests, 117 Python syntax files, 160 JavaScript syntax files, and 582 secret-scan files.
- Preserve the current technical-message history isolation: system diagnostics must not enter history, while ordinary chat, proactive companion replies, and reminders still do. Preserve all unrelated dirty work and every `.bak` file. No commit, push, or merge was made.

## Latest Session Update: Hiyori Motion Ownership and Stage Detail Refinement (2026-07-19)

- `web/hiyoriPerformanceDirector.js` no longer forces a minimum animation step. Mode/emotion/speech blends are refresh-rate independent, slower on release, and stable under duplicate same-time samples.
- `web/live2dExpressionController.js` now applies a smoothly reduced legacy-body compatibility gain only for Hiyori head/torso/shoulder channels, then restores full gain before the Hiyori director and listening layers. This prevents simultaneous full-amplitude motion systems from making the new gestures feel rigid.
- `web/stage.css` refines the accepted interface rather than changing topology: denser history cards, 58 px centered microphone, 90 px calmer send control, 940 px composer cap, and utility-lane clearance beginning at 1400 px.
- Focused automated tests and the complete local gate pass: 524 Python tests, all Node tests, Python syntax 117, JavaScript syntax 158, and secret scan 579. Next action: ask the user for one native Electron screenshot and motion judgment. Do not control the user's computer for visual inspection.
- Remaining risk: the preferred legacy/director mix is perceptual. If motion is still too strong or too quiet, tune the four ownership targets before altering authored action curves or renderer cadence.

## Latest Session Update: Live2D Wheel Hit-area Precision and State Recovery (2026-07-18)

- Completed `live2d-wheel-hit-area-v1`: `web/live2dLayoutController.js` now checks `isPointOverVisibleModelArea(e.clientX, e.clientY)` before consuming a wheel event, so the right history rail and other stage UI no longer resize the model.
- `tests/test_drag_logic.js` verifies both the conservative guard and that it precedes `e.preventDefault()`.
- Focused wheel/render/stage tests passed. The complete `scripts\test-local.ps1` gate passed before the external state-file overwrite: 524 Python tests, all Node tests, Python syntax 117, JavaScript syntax 158, secret scan 579, and clean diff check.
- Recovery note: `feature_list.json`, `progress.md`, and `session-handoff.md` were found as all-zero files after a concurrent external process stopped. They were rebuilt from `HEAD` and successful Codex patch logs. The files are readable and JSON-valid again, but some older uncommitted narrative may be absent.
- Manual verification remains user-driven: reload Electron, confirm wheel over history cards leaves model scale unchanged, then confirm wheel directly over visible Hiyori still scales within the existing bounds.
- Preserve all unrelated dirty work and `.bak` files; no commit, push, merge, model asset change, or renderer cadence change was made.

## Latest Session Update: Hiyori Native-motion Fluidity Parity (2026-07-17)

- Semantic nod, shake, lean, back-lean, and happy-bounce actions were lengthened and reshaped with zero-velocity curves to approach Hiyori's authored-motion fluidity.
- Speech uses a continuous energy drive and staggered head/shoulder/torso phase offsets rather than identical per-frame channel timing.
- Existing priorities, cooldowns, 190 ms interruption fade, fallback behavior, model assets, and frame cadence are preserved.

## Active Feature: Electron Stage Runtime Coordination v1 (2026-07-16)

- Status: in progress.
- Goal: run the real Electron app, inspect native stage/pet behavior, remove duplicate visible or high-frequency Live2D work, and polish issues found only in the native shell.
- Preserve: the accepted character-centered stage, transparent click-through desktop pet, speech/performance bridge, security defaults, and unrelated `.bak` files.
- Next step: launch the development Electron app, capture both native window states, then implement the smallest lifecycle coordination supported by observed evidence.

## Latest Completed Feature: Electron Stage Runtime Coordination v1 (2026-07-16)

- Status: complete and fully verified.
- Result: native stage and transparent pet surfaces now have an explicit renderer-ready lifecycle. Stage mode keeps the detached WebGL surface alive at zero opacity with its ticker stopped; `桌宠` or `Alt+Shift+P` minimizes the stage and resumes the pet without the blank-canvas failure observed during the first native pass.
- Restore path: a second app launch restores/focuses only the stage and returns the pet to its inactive state. Legacy narrow stage bounds migrate once through window layout version 2.
- Native evidence: real configured Hiyori rendering was inspected in the landscape stage, transparent desktop-pet mode with presence badge, and restored stage. No duplicate character was visually present in stage mode.
- Files touched for this feature: `electron/main.js`, `electron/preload.js`, `web/appStartupController.js`, `web/desktopControlBinder.js`, `web/index.html`, `web/chatDom.js`, `tests/test_stage_frontend.js`, `feature_list.json`, `progress.md`, and `session-handoff.md`.
- Verification: focused tests passed; full `scripts\test-local.ps1` passed with 524 Python tests, full Node suite, Python syntax 117 files, JavaScript syntax 152 files, and secret scan 572 files.
- Manual follow-up: with the selected LLM and TTS endpoints available, run one playful spoken turn and one serious spoken turn across stage/pet switching. Confirm audible continuity, subtitle timing, and model-specific clipping. Unrelated `.bak` files remain untouched.
- Next session recommendation: use the existing latency diagnostics to calibrate one complete real text-and-voice loop before introducing any new proactive behavior.

## Active Feature: Automatic TTS Failover and Recovery v1 (2026-07-16)

- Status: in progress.
- Goal: keep the companion audible when GPT-SoVITS is offline, avoid blocking each utterance on a known outage, and return to the configured provider after a bounded successful recovery attempt.
- UX contract: browser fallback and provider restoration are automatic; transitions use status text only and never open a modal.
- Safety boundary: public fallback remains default-off; no provider, permission, observation, tool, CORS, token, or security default changes.
- Next step: add circuit-state fields and sanitized recovery timing, update direct playback behavior, cover cancellation/stale/failure/recovery paths, then run the complete local verification gate.

## Latest Completed Feature: Automatic TTS Failover and Recovery v1 (2026-07-16)

- Status: complete and fully verified.
- Result: the personal profile now falls back from offline GPT-SoVITS to browser speech, suppresses repeated server waits for 15 seconds, and returns to GPT-SoVITS only after successful server audio playback. Realtime segment enqueueing respects the same circuit.
- UX: fallback/recovery uses brief status text only. There are no dialogs and no provider setting is rewritten.
- Files touched: `config.py`, `config.example.json`, `web/chatState.js`, `web/appConfigController.js`, `web/ttsPlaybackController.js`, `web/streamTtsQueueController.js`, `web/chat.js`, `tests/test_config_asr_defaults.py`, `tests/test_tts_failover_recovery_frontend.js`, `tests/test_stream_tts_queue_frontend.js`, `scripts/run_node_tests.js`, `feature_list.json`, `progress.md`, and `session-handoff.md`. Ignored `config.local.json` changed privately.
- Verification: focused tests passed; full `scripts\test-local.ps1` passed with 524 Python tests, full Node suite, Python syntax 117 files, JavaScript syntax 153 files, and secret scan 573 files. The restarted app loaded fallback=true and a 15-second recovery interval while GPT-SoVITS port 9880 remained offline.
- Manual follow-up: listen to one browser-fallback turn now, then start GPT-SoVITS and listen again after 15 seconds. Judge installed system-voice quality, first-sound delay, recovery status, subtitle timing, and Live2D mouth/motion sync.
- Next session recommendation: compare the same short playful and serious lines across browser and GPT-SoVITS using the existing latency diagnostics before tuning more timing constants.

## Active Feature: Live2D Render Performance v1 (2026-07-16)

- Status: in progress.
- Goal: improve perceived model smoothness before any further frontend restyle.
- Observed risk: PIXI Application rendering and pixi-live2d shared-ticker updates currently use separate clocks, so inactive surfaces may still update and the active surface can suffer unnecessary scheduling overhead.
- Preserve: current Hiyori asset, exaggerated motion settings, stage/pet lifecycle, drag/tap behavior, provider choices, and all privacy/security defaults.
- Next step: add one synchronized ticker path and lightweight native render telemetry, then measure the real Electron stage and run focused/full regressions.

## Latest Completed Feature: Stage-centered Companion Frontend v1 (2026-07-16)

- Status: complete and fully verified.
- Result: the main Electron window is now a character-first full Live2D stage with left/right conversation rails and a floating composer. The transparent desktop pet has coordinated presence/subtitle styling and remains click-through.
- Files touched for this feature: `electron/main.js`, `web/index.html`, `web/stage.css`, `web/chatDom.js`, `web/appStartupController.js`, `web/live2dLayoutController.js`, `tests/test_stage_frontend.js`, `tests/test_config_switch_frontend.js`, `scripts/run_node_tests.js`, and the three state artifacts.
- Browser verification: real Hiyori rendering and existing history were inspected at 1280x720; more drawer, sticker panel, text input, and model/voice settings opened successfully. Seven visible first-pass mismatches were corrected.
- Verification: `scripts\test-local.ps1` passed with 524 Python tests, the full Node suite, Python syntax 117, JavaScript syntax 152, and secret scan 572. Scoped and repository `git diff --check` passed.
- Manual follow-up: launch Electron and compare a playful spoken turn and serious spoken turn for clipping, subtitle placement, and whether the detached pet remains visually comfortable on the user's actual desktop. No model asset, provider, permission, observation, tool, or security default changed.

## Active Feature: Stage-centered Companion Frontend v1 (2026-07-16)

- Status: in progress.
- Accepted concept: the dark character-centered stage concept generated and approved in the current task.
- Goal: replace the narrow white chat panel with a dark character-first Live2D stage, orbit recent turns around the center, simplify the composer/control hierarchy, and coordinate the model-only desktop pet treatment.
- Preserve: all existing functional IDs, voice/chat workflows, transparent click-through pet behavior, security defaults, and unrelated `.bak` files.
- Next step: add the stage shell/CSS, adapt Electron chat bounds and view mode, then run browser fidelity and interaction checks before the full verification gate.

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

- Active feature: `stream-tts-delivery-completeness-v1`. Audit the existing realtime queue and final speech watchdog first; recovery may speak only the known-undelivered final tail, must never replay actual delivered segments, and must remain blocked for interrupted/stale sessions. Keep TTS provider, permissions, private configuration, and network behavior unchanged.

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

## Latest Session Update: Hiyori Daily Conversation Gestures v1 on 2026-07-19

- Status: implementation and focused verification complete; real Electron perceptual check remains.
- Files touched in this slice: `web/hiyoriPerformanceDirector.js`, `web/chat.js`, `tests/test_hiyori_performance_director_frontend.js`, `docs/hiyori-performance-director.md`, and the three state artifacts.
- Added restrained actions for attentive listening, single/double acknowledgement, gentle disagreement, thought entry/resolution, care, shyness, speech emphasis, and sentence release. Timeline cue aliases now reach the Hiyori semantic director; unsupported/non-Hiyori paths still use Cubism motions.
- Focused action, performance-cue, free-chat, stage, syntax, and scoped whitespace tests passed.
- The first full Node run exposed a brittle exact-source check for the formerly one-line `playEmotion` wrapper. The test now accepts the intentional multi-line Hiyori routing wrapper and still proves fallback delegation to `motionRuntimeController`.
- Full `scripts\test-local.ps1` passed with `524` Python tests, all Node frontend tests, Python syntax `117`, JavaScript syntax `158`, and secret scan `579`.
- Next session: have the user test natural daily chat in Electron and report which of listening, thought transition, care, emphasis, or sentence release is too weak/strong. Tune amplitudes from that evidence; do not add rig-dependent hand poses without a `.cmo3` source.

## Latest Session Update: Hiyori Transition Continuity Pass on 2026-07-19

- Status: implementation and full local verification complete; real Electron perceptual tuning remains.
- `web/hiyoriPerformanceDirector.js` now applies one elapsed-time critically damped mixer after all mode, emotion, speech, semantic-action, crossfade, and idle contributions are composed.
- Channel response is intentionally staggered: face/eyes respond first, head follows, torso/shoulder settle more slowly, and arms/hands/secondary motion are slowest. Speech raises head/torso response slightly without bypassing inertia.
- Tests cover the entire idle/listen/think/speak/idle chain, speech release momentum, duplicate timestamps, 60/120 Hz convergence, and existing semantic action behavior.
- No extra ticker, interval, renderer work, model asset, private configuration, or `.bak` file was added or changed.
- Full `scripts\test-local.ps1` passed with `524` Python tests, all Node frontend tests, Python syntax `117`, JavaScript syntax `158`, and secret scan `579`.
- Next session: use real Electron perception to tune only `channelResponseRate()` values if a transition is still too heavy or too loose.

## Latest Session Update: Stage Header Refinement v2 on 2026-07-19

- Status: complete, including iterative native Electron day/night verification.
- Accepted concept: `<CODEX_HOME>/generated_images/019f6ba6-9db1-7900-af62-ce3a41139137/exec-92d682e8-ad2b-4bc8-86b5-5c6ff9d6a6a3.png`.
- `electron/main.js` now uses a hidden title bar with native overlay controls; `electron/preload.js` and `web/stageThemeController.js` synchronize native symbol contrast with the effective room without changing room-selection behavior.
- `web/index.html` adds the app-owned draggable title surface. `web/stage.css` reduces the rail to 56px, removes sharp separators and white blocks, softens materials, and keeps the center selector fully visible inside the rail's containing block.
- Tests protect the integrated title surface, compact materials, centered selector, Electron overlay contract, and day/night title synchronization.
- Full local validation passed with `524` Python tests, all Node tests, Python syntax `117`, JavaScript syntax `158`, secret scan `579`, and clean scoped whitespace checks.
- Native Electron remains open in automatic room mode. Existing unrelated dirty work and `.bak` files were not modified.

## Latest Session Update: Stage Header Refinement v1 on 2026-07-19

- Status: complete, including native Electron screenshot review.
- Accepted concept: `<CODEX_HOME>/generated_images/019f6ba6-9db1-7900-af62-ce3a41139137/exec-fed49a89-bbe9-44fb-9fe0-e38eebb7b2c7.png`.
- `web/stage.css` now renders one coherent 70px top rail around the unchanged three-zone structure. Day/night materials, nested theme selector, left brand/status hierarchy, right enabled controls, and responsive spacing were refined.
- `tests/test_stage_frontend.js` now protects the unified rail, both material variants, centered selector, semantic status signal, and quiet day enabled state.
- Focused stage/theme/button tests and scoped whitespace checks passed.
- Full `scripts\test-local.ps1` passed with `524` Python tests, all Node frontend tests, Python syntax `117`, JavaScript syntax `158`, and secret scan `579`.
- Native Electron result: after the user explicitly authorized opening the app, the real 1290x860 day-stage window confirmed the 70px rail, outer margins, vertical centering, left density, centered theme switch, right-button weight, unobstructed Live2D subject, and non-overlapping bottom composer. The day palette is deliberately low-contrast and can be deepened later if the user wants a stronger visual hierarchy.
- Existing dirty work and `.bak` files must remain untouched.

## Latest Session Update: Unified Control Center UI v1 on 2026-07-19

- Status: complete, including Image2 concept selection, desktop/narrow browser QA, native Electron QA, and the full local gate.
- Concept reference: `C:/Users/MQL/.codex/generated_images/019f6ba6-9db1-7900-af62-ce3a41139137/exec-ff8dde34-20f4-466a-b0e7-67c449c31267.png`.
- Main implementation files: `web/controlCenter.css`, `web/controlCenterShell.js`, `web/index.html`, `web/diagnosticsRuntimeController.js`, `web/advancedActionBinder.js`, `web/chatDom.js`, `web/chat.js`, and `electron/main.js`.
- The More launcher and all five feature pages now use one refined warm translucent shell. Schedule, persona, model/voice, memory management, and diagnostics retain all existing controls and data behavior.
- Diagnostics opens a dedicated running/result page and continues to append its text report to chat. Desktop toggle buttons now expose their actual pressed state.
- Browser checks covered all five page routes and a 680x760 narrow layout. Native Electron checks covered stage launch, centered Live2D, the non-overlapping More launcher, and model/voice configuration rendering with real local values.
- Full validation passed: `524` Python tests, all Node tests (including the new control-center contract), Python syntax `117`, JavaScript syntax `160`, secret scan `582`, JSON checks, and `git diff --check`.
- The Electron process remains open for user review. Existing unrelated dirty work and every `.bak` file remain untouched; nothing was committed, pushed, or merged.

## Latest Session Update: Control Center Progressive Disclosure on 2026-07-19

- Status: implementation, browser fidelity loop, targeted tests, and full local gate complete.
- Accepted concept: `C:/Users/MQL/.codex/generated_images/019f6ba6-9db1-7900-af62-ce3a41139137/exec-67668576-1273-4369-a52e-d4cadf1b59bd.png`.
- Main files: `web/controlCenter.css`, `web/controlCenterShell.js`, `web/index.html`, `web/storageController.js`, `web/diagnosticsRuntimeController.js`, `web/advancedActionBinder.js`, `tests/test_control_center_frontend.js`, and `tests/test_config_switch_frontend.js`.
- Default control-center pages now prioritize common choices; technical configuration, bulk tools, relationship detail, and raw reports use a consistent `高级设置` disclosure. Day/night colors are explicit and no longer inherit washed-out legacy config surfaces.
- Navigation handoff has no delayed empty frame. Diagnostics stays inside its page and no longer writes technical status/report rows into chat; legacy self-check rows are filtered on history load.
- Browser proof: common/advanced states, day/night palettes, config-to-persona continuity, diagnostics isolation (`0` report rows before and after a real self-check), and 390x844 overflow metrics passed.
- Full gate: `524` Python tests, all Node tests, Python syntax `117`, JavaScript syntax `160`, secret scan `582`.
- Remaining manual check: reload the already-open native Electron stage and capture model/voice plus diagnostics. Computer Use selected the correct window but could not capture it because Windows did not report a foreground process id. Do not use stale coordinates.
- Existing unrelated dirty changes and all `.bak` files remain untouched; nothing was committed, pushed, or merged.

## Latest Session Update: Qwen3-TTS Low-Latency Trial v1 on 2026-07-27

- Status: implementation, isolated runtime installation, live CUDA service validation, project-adapter benchmarking, focused regressions, and the full local gate are complete. Real Electron listening remains.
- Runtime: `D:\AI\qwen3_tts_runtime\.venv` contains the optional runtime and the Hugging Face cache contains `Qwen/Qwen3-TTS-12Hz-0.6B-CustomVoice`. The repository contains no model weights or user voice samples. Start with `scripts\start-qwen3-tts.ps1`; default endpoint is `http://127.0.0.1:9881/v1/audio/speech`.
- Temporary voice: `Vivian`, chosen only for bilingual architecture/latency evaluation. Do not start formal Xinyu voice design, recording, cloning, or training until the user says the broader optimization phase is finished.
- Latency evidence after warmup: direct service Chinese first audio `214-388 ms`, English `241-330 ms`; calls through `tts.open_server_tts_stream` measured `331 ms` Chinese and `232 ms` English. Short total synthesis was roughly `1.0-1.7 s`.
- Resource boundary: with Qwen and the desktop workload active, GPU memory was about `6002/7900 MB`; do not keep GPT-SoVITS and Qwen resident together on this 8 GB laptop GPU. The GPT-SoVITS API on port `9880` was deliberately stopped for the trial; its config fields remain unchanged for rollback.
- Integration: Qwen uses the existing generation/session-fenced PCM stream queue, cancellation, actual-playback callbacks, and final delivery recovery. `web/chatReplyController.js` streams before companion finalization only for `qwen3_tts + model_direct_reply`; the backend contract proves final `spoken_text` equals emitted deltas. Other providers and reply pipelines still wait.
- Private runtime config now selects `qwen3_tts` with the local endpoint and Vivian. Restart the Electron app once so sanitized frontend state reloads; the already warmed Qwen service can stay running.
- Checks passed: Qwen Python suite plus related config/TTS/health tests (`48 passed`), Qwen frontend, character runtime, and realtime TTS queue checks. Full `scripts\test-local.ps1` passed with `553` Python tests, all Node frontend tests, Python syntax `123`, JavaScript syntax `163`, and secret scan `602`; JSON validation and scoped whitespace checks passed.
- Next: restart Electron once, then conduct a real listening pass for Chinese, English, mixed-language pronunciation, sentence joins, interruption cancellation, and UI/frame responsiveness. Preserve all `.bak` files and unrelated dirty work; do not commit or push.

## Latest Session Update: Technical Message History Isolation on 2026-07-19

- Status: implementation, browser interaction proof, focused tests, and full Node frontend suite complete.
- Main files: `web/chatMessageController.js`, `web/storageController.js`, `web/localCommandExecutor.js`, `web/configSwitchController.js`, `web/characterDiagnosticsController.js`, `web/appStartupController.js`, `web/live2dRuntimeController.js`, `web/chatReplyController.js`, `tests/test_control_center_frontend.js`, and `tests/test_character_runtime_frontend.js`.
- System/technical output is now explicitly transient and cannot be committed by the shared message controller. Legacy assistant-side diagnostic, test, debug, startup, and transport-error records are removed during history load.
- Ordinary conversation, proactive companion replies, emotion reports, and reminders remain normal history. Configuration tests continue to report inside the model/voice page instead of producing chat cards.
- Browser proof: `/ttsdebug` created one temporary system row, wrote neither command nor report to storage, and disappeared after reload (`systemRows=0`).
- Focused control-center, character-runtime, config-switch, JavaScript syntax, and full Node frontend tests passed. Full `scripts\\test-local.ps1` also passed with `524` Python tests, all Node frontend tests, Python syntax `117`, JavaScript syntax `160`, and secret scan `582`.
- Existing unrelated dirty changes and all `.bak` files remain untouched; nothing was committed, pushed, or merged.

## Latest Session Update: Inline Sticker and Translation Persistence v1 on 2026-07-27

- Status: implementation and full local verification complete. Electron has been restarted with the new renderer; user visual confirmation remains.
- `web/chatMessageController.js` now persists assistant translations on text records, restores them during history rendering, and backfills eligible old records through the existing translation service.
- Stickers related to a text turn now live in that text record's bounded `stickers` array and render after the words as `1.85em` inline images. Both user and assistant paths use the same rule. A small standalone fallback remains for sticker-only turns.
- `web/storageController.js` migrates legacy standalone stickers to the nearest prior same-role text record and persists the normalized history representation.
- `web/base.css`, `web/kawaiiTheme.css`, `web/stage.css`, and `web/phosphorIcons.css` provide the inline sticker treatment, compact fallback, and refined CJK-aware message typography without changing the existing stage layout or card architecture.
- Regression coverage is in `tests/test_sticker_frontend.js` and `tests/test_stage_frontend.js`. `node scripts\run_node_tests.js` passes, and `scripts\test-local.ps1` passes with `563` Python tests, all Node frontend tests, Python syntax `125`, JavaScript syntax `163`, and secret scan `606`.
- Preserve all `.bak` files and unrelated dirty work. Do not commit, push, or merge without an explicit later request.

## Latest Session Update: Behavior Director to Live2D Performance Bridge v1 on 2026-08-03

- 状态：候选基线；自动化验证已完成。真实 Electron 行为验收尚未进行，不能称为 personal stable 版本。
- New `web/behaviorPerformanceBridge.js` is the only behavior-presentation adapter. It validates a fixed `performance_intent`, de-duplicates monotonic trigger sequences in memory, and calls existing Hiyori semantic mode/action, expression pulse, and split-window phase interfaces only.
- Backend emits intents only for `micro_reaction/unanswered_voice_presence`, `prepare_proactive/grounded_life_material`, and `stay_quiet/post_tts_settle`; default-disabled and ordinary quiet decisions have no intent. The existing proactive poll applies the consumed decision; `/api/behavior/status` stays read-only.
- Priority: real user listening and actual reply/TTS semantic performance preempt behavior intents; settling performs only an idle handoff. No arbitrary Live2D Core parameter, motion path, model path, WebSocket, dependency, database, or background thread was introduced.
- Verification: `scripts\test-local.ps1` passed: `643` Python tests, all Node frontend tests, Python syntax `149`, JavaScript syntax `172`, and secret scan `643`.
- 待真实 Electron 验收（不可写为已通过）：自然聆听且嘴巴闭合；一次未回复语音微反应；准备姿态；TTS 语义接管；结束后回 idle；轮询不重播；自动主动发言不自循环；分窗口不双播；模型未加载或通信失败不影响聊天与语音。

## Latest Session Update: Event Ordering and Consumption Fix on 2026-08-03

- 状态：候选基线。
- 自动化测试与静态检查已通过。
- 真实 Electron 行为验收尚未进行。
- 当前不能称为 personal stable 版本。
- Changed runtime files: `companion_events.py`, `behavior_director.py`, `app.py`, and `web/chatReplyController.js`; tests: `tests/test_companion_events.py` and `tests/test_behavior_director_frontend.js`; state records updated as required.
- Semantics: sequence is process-local and monotonic; newest TTS event determines speaking/settle state; newest voice/reply order determines unanswered voice; only `/api/life/proactive` consumes a `prepare_proactive` trigger sequence.
- Verification: final full local gate `641 passed`, all Node tests, syntax `149/170`, secrets `641`; CI-style pytest also passed `641`; docs publish and `4` browser smoke tests passed. Linux runner was unavailable locally and no push was permitted, so remote Actions were not triggered.
- 待验收（不可写为已通过）：
  1. TTS 开始和结束后的实际冷却行为。
  2. 新语音被回复后不产生额外微反应。
  3. 相同桌面事件不会重复生成主动建议。
  4. 自动主动发言不会形成自循环。
  5. 多次查询行为状态不会提前消费主动建议。
- Remaining risk: process restart intentionally resets both event sequence and consumption cursor; an accepted trigger is at-most-once per process, so a crash between consumption and downstream dispatch may drop that suggestion rather than replay it.

## Latest Session Update: Companion Event Bus and Behavior Director v1 on 2026-08-02

- Status: first safe integration is complete and locally verified. `personal-stable-2026-08-02` remains the baseline tag before this work; the working branch now has uncommitted event-bus changes only.
- Main files: `companion_events.py`, `behavior_director.py`, `app.py`, `app_chat_route.py`, `config.py`, `config.example.json`, `tests/test_companion_events.py`, `tests/test_app_chat_route.py`, and state artifacts.
- Contract: events are bounded metadata only. The director does not execute actions; a suggestion is never authorization to send QQ, speak, use tools, or observe the desktop.
- Verification: focused backend suite `48 passed`; all Node tests, Python syntax `149`, JavaScript syntax `170`, and secret scan `641` passed. Full wrapper exceeded the 64-second external command cap after starting, so do not describe that wrapper as passed.
- Next session: live-test the active-companionship timing with the director explicitly enabled; tune only evidence-backed timing values. Preserve all `.bak` files and unrelated changes.

## Latest Session Update: Compact Character Prompt and Personality Calibration v1 on 2026-07-27

- Status: implementation, configured-provider probes, focused regressions, JSON checks, scoped whitespace checks, and the full local gate are complete.
- Files touched for this slice: `app.py`, `character_brain.py`, `character_brain_intent_strategy.py`, `companion_dialogue_policy.py`, `humanize.py`, `llm_runtime.py`, `config.py`, `config.example.json`, `config.preview.example.json`, `tests/test_character_brain.py`, `tests/test_natural_character_dialogue.py`, `tests/test_preview_experience_profile.py`, and the three state artifacts.
- Result: model-direct text and voice turns now receive a compact social director rather than the full performance-state dump. One canonical dialogue contract and one small turn-direction block replace overlapping language/style/humanization rules.
- Personality target: mischievous, opinionated, relevant but surprising, capable of sharp teasing, and quietly caring beneath pushback. Reply length and shape stay adaptive; no fixed one-to-three-sentence rule or compulsory joke/question pattern was introduced.
- Preserved: private configuration, manual persona, wakeup/profile memory, structured relationship state, relevant dynamic memory, experience feedback, safety boundaries, tool capability contracts, companion-turn metadata, Live2D/TTS performance metadata, and legacy non-model-direct behavior.
- Budget evidence: the same private no-history comfort probe moved from about `2053` to `1234` `cl100k_base` system tokens (`39.9%` reduction). Relevant coding memory can raise a turn to about `1547` tokens and remains intentionally available.
- Latency evidence: paired three-turn median moved from about `15.0 s` to `14.0 s`, but a minimal prompt still required roughly `16.2-18.0 s` to first content. Treat the configured upstream provider/stream path as the dominant remaining bottleneck.
- Provider limitation: Chinese input arrived at the configured upstream as question marks even with a minimal system prompt. Do not attribute Chinese nonsense replies to this prompt calibration; investigate provider/input compatibility as a separate feature if the user requests it.
- Verification: focused suite `315 passed`; full `scripts\test-local.ps1` passed with `575` Python tests, all Node frontend tests, Python syntax `126`, JavaScript syntax `163`, and secret scan `607`. JSON validation and scoped `git diff --check` passed.
- Next session: restart Electron and do a real English personality pass. If the user wants Chinese conversation, first open a separate provider/input-encoding investigation. Preserve all unrelated dirty work and every `.bak` file; nothing was committed or pushed.

## Latest Session Update: Semantic Emotive Hiyori Authored-Motion Sync v1 on 2026-07-27

- Status: implementation and full local verification complete; native Electron listening/visual acceptance remains.
- Core mapping: `EmotionShy -> m05`, `EmotionHappy -> m06`, `EmotionSurprised -> m07`, `EmotionPlayful -> m08`, `EmotionAngry -> m09`, and `EmotionSad -> m10`. The new names duplicate references to the existing verified local files; no third-party motion asset was imported.
- Runtime: `web/performanceCueController.js` resolves high-intensity emotion and compatible explicit actions deterministically. `web/chat.js` and `web/appStartupController.js` dispatch from actual playback start in same-window and split-window modes. `web/motionRuntimeController.js` owns keyed cooldown and playback-generation metadata.
- Layering: `web/live2dExpressionController.js` suppresses competing semantic one-shots for authored cues, reduces procedural head/body/arm gain during the measured motion window, preserves facial/speech detail, and stops the owned motion on interruption.
- Preview: in the Live2D renderer console, use `__TAFFY_HIYORI_MOTION_PREVIEW__.emotions` and `__TAFFY_HIYORI_MOTION_PREVIEW__.play("playful")` to audition one emotion. Normal cooldown rules still apply.
- Verification: authored-motion focused test, performance cue, continuous director, actual playback guard, the complete Node suite, model JSON, JavaScript syntax, scoped whitespace, and `scripts\test-local.ps1` all pass. Full gate totals: `575` Python tests; Python syntax `126`; JavaScript syntax `164`; secret scan `608`.
- Manual next step: restart/reload Electron, then test at least playful, surprised, happy, shy, angry, and sad speech plus one interruption. Pay special attention to long `m05` (8.57s) and `m06` (5.37s). If they overstay the spoken line, tune their trigger eligibility/cooldown or author shorter exported variants; do not abruptly crop the original motion without visual evidence.
- Preserve every `.bak` file and unrelated dirty change. Nothing was committed or pushed.

## Latest Session Update: Xinyu Stable Natural Emotion v5 on 2026-07-28

- Status: stable cute-baseline emotion profile implemented; three-emotion continuity audition and content checks complete; user listening confirmation remains.
- Runtime rule: V7's fictional five-to-seven-year-old cute lively identity is always the baseline. Emotion may add only small keyword, emphasis, pacing, and ending changes; it may not create a new persona or pitch range.
- All emotions were softened, `high` is capped at moderate, and dark/obsessive/possessive/sinister/yandere-like delivery is forbidden.
- Tested generation stability constants are temperature `0.72`, top-k `35`, top-p `0.9`, and repetition penalty `1.05`.
- Audition: `D:\AI\voice_auditions\xinyu_natural_emotion_v8\V8_stable_cute_natural_emotion.wav`, external to the repository. Playful, thinking, and warm-happy segments measured about `342/317/301 Hz` median voiced F0, retained their Chinese content, and produced no clipping.
- Verification: focused Qwen/TTS suite `25 passed`; full `scripts\test-local.ps1` passed with `577` Python tests, all Node frontend tests, Python syntax `126`, JavaScript syntax `164`, and secret scan `608`. JSON and scoped whitespace checks passed.
- Preserve every `.bak` file and unrelated dirty change. Nothing was committed or pushed.

## Latest Session Update: Xinyu Younger Cuter Child Voice v4 on 2026-07-28

- Status: complete and user-accepted. The formal 1.7B service now targets a fictional five-to-seven-year-old child voice; V7 audition and fixed-language bilingual checks are complete.
- Audition: `D:\AI\voice_auditions\xinyu_child_voice_v7\V7_younger_cuter_child.wav`, external to the repository. It is `11.0 s`, `24 kHz`, normalized to `-25.0 dBFS`, peaks at `-4.37 dBFS`, and has no clipped samples.
- Character sound: very small soft-light timbre, clean high placement, round innocent resonance, milk-sweet warmth, lively curiosity, tiny quick reactions, bouncy rhythm, bright pitch movement, and extra-cute endings.
- Guardrails remain: exact wording/order, stable pronunciation, no baby talk, harsh squeakiness, adult sultriness, inserted vocalizations, metallic texture, robotic delivery, or digital effects.
- Fixed-language Whisper recovered English exactly and Chinese substantially intact, with `啦`/`了` as the only notable normalization.
- Verification: focused Qwen/TTS suite `24 passed`; full `scripts\test-local.ps1` passed with `576` Python tests, all Node frontend tests, Python syntax `126`, JavaScript syntax `164`, and secret scan `608`. JSON and scoped whitespace checks passed.
- Preserve every `.bak` file and unrelated dirty change. Nothing was committed or pushed.

## Latest Session Update: Xinyu Young Lively Child Voice v3 on 2026-07-28

- Status: the formal profile and live 1.7B service now target a fictional nine-to-eleven-year-old child voice; final audition and language-aware content checks are complete; user listening confirmation remains.
- Audition: `D:\AI\voice_auditions\xinyu_child_voice_v6\V6_young_lively_child.wav`, external to the repository. It is `14.62 s`, `24 kHz`, normalized to `-25.0 dBFS`, peaks at `-3.15 dBFS`, and has no clipped samples.
- Character sound: small, light, clean high placement, rounded youthful resonance, milk-sweet warmth, lively curiosity, playful energy, buoyant rhythm, and expressive childlike endings.
- Guardrails: no baby talk, harsh squeakiness, nasality, adult sultriness, inserted humming/squeals/giggles/gasps, metallic texture, robotic delivery, or digital effects.
- QA: Chinese segments were substantially intact. English was exact when Whisper used explicit English mode; auto mode misclassified the strongly childlike English voice as Chinese, so acoustic validation should remain language-aware.
- Verification: focused Qwen/TTS suite `24 passed`; full `scripts\test-local.ps1` passed with `576` Python tests, all Node frontend tests, Python syntax `126`, JavaScript syntax `164`, and secret scan `608`. JSON and scoped whitespace checks passed.
- Preserve every `.bak` file and unrelated dirty change. Nothing was committed or pushed.

## Latest Session Update: Xinyu Exaggerated Anime Moe Voice v2 on 2026-07-28

- Status: high-intensity anime-moe delivery profile implemented; final audition and bilingual content checks complete; user listening confirmation remains.
- Audition: `D:\AI\voice_auditions\xinyu_anime_moe_v5\final\V5_final_exaggerated_anime_moe.wav`, external to the repository. It is `11.98 s`, `24 kHz`, normalized to `-25.0 dBFS`, peaks at `-6.18 dBFS`, and has no clipped samples.
- Runtime voice remains the original-character stack: Qwen3-TTS 1.7B CustomVoice + `Ono_Anna` + bounded project-owned delivery instruction. The stronger profile raises sweetness, youthfulness, anime intonation, bounce, and playful endings without importing or imitating an identifiable voice.
- Correctness guard: the instruction forbids added humming, squeals, giggles, gasps, filler vowels, metallic texture, and robotic effects. CustomVoice uses `non_streaming_mode=True` for official full-text conditioning while the HTTP response remains incremental PCM.
- Important diagnostic lesson: never pipe literal Chinese source through Windows PowerShell into Python for acoustic validation. Use Unicode escapes or a UTF-8 file. The earlier laughter-only results were generated from corrupted question-mark input; official Hugging Face SHA-256 checks for both model files passed.
- Local Whisper recovered the final Chinese lines substantially intact and the English line with one `think`/`thank` near-homophone. Manual listening is still required to judge whether the exaggeration level is desirable.
- Verification: focused Qwen/TTS suite `24 passed`; full `scripts\test-local.ps1` passed with `576` Python tests, all Node frontend tests, Python syntax `126`, JavaScript syntax `164`, and secret scan `608`. JSON and scoped whitespace checks passed.
- Preserve every `.bak` file and unrelated dirty change. Nothing was committed or pushed.

## Latest Session Update: Xinyu Childlike Original Voice v1 on 2026-07-27

- Status: implementation, focused tests, full local verification, and direct 1.7B service smoke checks are complete. Native Electron listening acceptance remains.
- Accepted acoustic target: `D:\AI\voice_auditions\xinyu_childlike_v4\B4_childlike_playful.wav` (external audition artifact, not packaged). It is an original childlike character direction rather than an imitation of an identifiable voice.
- Formal runtime: `Qwen3-TTS-12Hz-1.7B-CustomVoice`, speaker `Ono_Anna`, bounded childlike/nimble/playful delivery instruction, CUDA streaming, and semantic emotion instructions.
- Compatibility: legacy Qwen `default`/`auto` voice values map to `Ono_Anna`; explicit speaker choices still pass through; GPT-SoVITS, Browser TTS, and the Qwen 0.6B fallback were not removed.
- Direct service evidence: health reports `speaker=Ono_Anna` and `emotion_instruction=true`; warm first audio was about `392 ms` Chinese and `290 ms` English. Expect a one-time cold Chinese path warmup around four seconds after starting 1.7B.
- Verification: focused suite `24 passed`; Qwen frontend and config-switch tests passed; full `scripts\test-local.ps1` passed with `576` Python tests, all Node frontend tests, Python syntax `126`, JavaScript syntax `164`, and secret scan `608`. JSON and scoped whitespace checks passed.
- Next step: reload Electron, test several Chinese/English emotional turns, and judge identity consistency plus end-to-end completion latency. Keep only one local TTS engine resident on the 8 GB GPU.
- Preserve every `.bak` file and unrelated dirty change. Nothing was committed or pushed.

## Latest Session Update: Independent Conversation Lane Collapse v1 on 2026-07-28

- Status: implementation, persisted-state behavior, unread behavior, browser visual QA, frontend regressions, and the full local gate are complete.
- UX: model history is now the left lane with a left-edge arrow; user history is the right lane with a right-edge arrow. The controls stay available when their lane is hidden, and the existing whole-rail collapse remains unchanged.
- Behavior: lanes collapse independently, hidden lanes do not auto-expand for new messages, unread counts are bounded to `99`, and expanding clears the corresponding count. Conversation records and LLM history are never removed.
- Persistence: `web/storageController.js` stores `collapsed` and `unread` per role in `taffy_conversation_lane_state_v1`; malformed or legacy storage falls back safely.
- Message integration: normal messages, streamed assistant rows, and sticker events notify the lane once without counting restored history as new.
- Main files: `web/index.html`, `web/chatDom.js`, `web/chatState.js`, `web/storageController.js`, `web/desktopControlBinder.js`, `web/chatMessageController.js`, `web/chat.js`, `web/stage.css`, `web/phosphorIcons.css`, and `tests/test_stage_frontend.js`.
- Browser QA: both buttons were unique and operable; independent `aria-expanded` values and rail classes changed correctly; with both lanes collapsed, computed visibility was hidden and the stage background remained unobstructed.
- Full verification passed: `576` Python tests, all Node frontend tests, Python syntax `126`, JavaScript syntax `164`, and secret scan `608`.
- The temporary browser-QA backend was stopped after inspection. The separately running Qwen3-TTS service was not changed.
- Preserve unrelated dirty changes and all `.bak` files. Nothing was committed or pushed.

## Latest Session Update: Natural Voice Participation and Visible Thinking v1 on 2026-07-30

- Status: implementation and full local verification complete; live subjective microphone tuning remains.
- Behavior: when `natural_conversation.enabled=true` on a voice turn, Xinyu privately chooses a reply, quiet micro-reaction, deferred thought, or silence. Reply turns choose quick/normal/deep thinking depth; no-reply turns create no empty assistant card and no TTS request.
- Presentation: the existing pre-reaction and thinking performance phases remain visible while model output is buffered. A quiet reaction can enqueue a restrained listening/thinking motion. Existing full-duplex cancellation remains the interruption path.
- Privacy/continuity: private control tags are stripped server-side before chat, memory, and TTS. Non-replied speech keeps only a bounded in-memory ambient summary/topic hint with a configured TTL; it is not written as hidden chain-of-thought or raw long-term memory.
- Compatibility: tracked defaults remain disabled; the ignored private `config.local.json` is enabled. Typed chat and missing legacy settings keep the prior always-reply path.
- Main files: `natural_conversation.py`, `companion_dialogue_policy.py`, `app_chat_route.py`, `app_chat_context.py`, `config.py`, config examples, `docs/config.html`, `web/chatApi.js`, `web/chatReplyController.js`, `web/chatState.js`, `web/appConfigController.js`, and focused tests.
- Verification: `scripts\test-local.ps1` passed with `617` Python tests, all Node frontend tests, Python syntax `142`, JavaScript syntax `167`, and secret scan `631`; JSON and scoped whitespace checks passed.
- Next Session: restart/reload the local Python service and Electron renderer, then speak a small live matrix: direct question, casual statement, unfinished self-talk, humming/filler, emotional disclosure, and an interruption during a deep thinking pause. Tune delays or prompt wording only from observed behavior.
- Preserve all unrelated dirty changes and every `.bak` file. Nothing was committed or pushed.

## Latest Session Update: Qwen3-TTS Exclusive Managed Autostart on 2026-07-30

- Status: implementation, focused tests, full local validation, and real runtime lifecycle verification are complete.
- Behavior: with the private opt-in enabled, opening the desktop pet starts Qwen3-TTS and closing it stops only the Qwen process that Electron owns. The public default remains off for backward compatibility.
- Exclusivity: the managed launcher accepts only `qwen3_tts`; it contains no GPT-SoVITS `api_v2.py` launch path and never selects GPT as automatic fallback. Qwen failure continues into the existing browser-voice fallback and visible failure handling.
- Local runtime: the ignored private configuration uses `D:\AI\models\Qwen3-TTS-12Hz-1.7B-VoiceDesign`, `A2_Original`, and port `9881`. Health reported `model_loaded=true`, CUDA, VoiceDesign, streaming, and emotion-instruction support.
- Cleanup: the stale standalone GPT-SoVITS service from an older session was stopped; port `9880` remained free and did not return after Electron/Qwen restart.
- Main tracked files: `electron/main.js`, `config.py`, `config.example.json`, `config.preview.example.json`, `tests/test_qwen3_tts.py`, `tests/test_qwen3_tts_frontend.js`, and feature/session state documents.
- Verification: focused backend suite `40 passed`; Qwen frontend checks passed; full `scripts\test-local.ps1` passed with `620` Python tests, all Node frontend tests, Python syntax `142`, JavaScript syntax `168`, and secret scan `632`.
- Diagnostic note: the Qwen virtual environment inherits its Python 3.10 interpreter from a directory named `GPTSoVits`. This is only the interpreter origin; the actual service command is `qwen3_tts_server.py` and the loaded model is Qwen3-TTS.
- Preserve all unrelated dirty changes and every `.bak` file. Nothing was committed or pushed.

## Latest Session Update: Continuous Conversation Awareness on 2026-07-30

- Status: implementation, focused regressions, full local verification, and runtime restart are complete. `companion-life-growth-v2` is now marked complete.
- Behavior: with active companionship enabled, a quiet/deferred voice turn can remain as one short-lived candidate and be reconsidered after a natural delay. New user speech supersedes it; current user speech/typing and assistant thinking/speech defer it; disabling active companionship clears it.
- Model ownership: automatic reconsideration opts into the same private natural-participation contract, so Xinyu may speak, react, defer again, or stay silent. Silence is not counted as a proactive success and creates no visible card, TTS, or durable raw memory.
- Bounds: lightweight local pulses run at randomized 3.5–7.5 second intervals, but model calls occur only for a due candidate. Candidates expire after 90 seconds and repeated model defer is bounded.
- Main files: `natural_conversation.py`, `app_chat_route.py`, `web/autoChatController.js`, `web/chatReplyController.js`, `web/chatState.js`, `web/chat.js`, `tests/test_natural_conversation.py`, `tests/test_app_chat_route.py`, `tests/test_conversation_awareness_frontend.js`, and `scripts/run_node_tests.js`.
- Verification: focused backend suite `27 passed`; focused Node checks passed; full `scripts\test-local.ps1` passed with `619` Python tests, all Node tests, Python syntax `142`, JavaScript syntax `168`, and secret scan `632`. JSON and scoped whitespace checks passed.
- Runtime: new Electron PID `47924`, local backend PID `61912`, and `/healthz` returned `ok`; SenseVoice was preserved.
- Next Session: live-test with active companionship on: make a casual statement that earns silence/defer, wait up to 30 seconds, speak again during the wait, and observe whether Xinyu naturally drops, delays, or voices the afterthought. Tune only from real over-speaking, under-speaking, or interruption evidence.
- Preserve all unrelated dirty changes and every `.bak` file. Nothing was committed or pushed.

## Latest Session Update: Continuous Reply Voice and Live2D Face Sync v1 on 2026-07-30

- Status: implementation, focused regressions, and the full local gate are complete. Real Electron listening/visual acceptance remains.
- Root causes fixed:
  - local speech cues could expire without clearing the applied exp3 expression;
  - streaming Qwen PCM bypassed the analyser used by Live2D mouth motion;
  - model-direct streaming and voice timelines could split one reply into independent Qwen synthesis requests.
- Runtime behavior: Qwen now uses one finalized full-reply request by default, preserving one bounded emotion/style through-line and one character identity. Streaming audio remains incremental and cancellable after synthesis begins.
- Live2D behavior: PCM BufferSources connect to a reusable analyser, then the audio destination. Existing frame sampling drives `ParamMouthOpenY` from the audible waveform. Playback completion uses a 380ms expression release and restores `neutral`; cancellation/failure clears immediately.
- Compatibility: `tts.qwen3_tts_reply_continuity` defaults to `true`; set it to `false` only to restore legacy early sentence streaming. GPT-SoVITS segmented delivery is unchanged. No new animation loop, model asset, external motion, or runtime dependency was added.
- Verification: focused suites passed; full `scripts\test-local.ps1` passed with `620` Python tests, all Node frontend tests, Python syntax `142`, JavaScript syntax `168`, and secret scan `632`.
- Next session: reload Electron, then test one multi-clause reply similar to the reported screenshot, playful/happy and serious/sad contrasts, silent punctuation gaps, and interruption mid-speech. If the mouth is too weak/strong, tune analyser normalization rather than reintroducing synthetic-only cadence. If the voice is still discontinuous, capture the exact generated WAV and request metadata before changing the stable identity prompt.
- Preserve all unrelated dirty changes and every `.bak` file. Nothing was committed or pushed.

## Latest Session Update: Desktop Visible-Log Launcher v1 on 2026-08-07

- Status: complete. Desktop shortcut: `%USERPROFILE%\Desktop\馨语AI桌宠（日志启动）.lnk`.
- The shortcut opens Windows PowerShell with `-NoExit` and runs `scripts\start-desktop-pet.ps1`; the window intentionally remains visible for startup and failure diagnostics.
- The launcher validates required project files, `config.local.json` managed-Qwen settings, the repository npm runtime, and existing backend/Qwen health endpoints. It then invokes the existing `npm run start:electron` entry.
- Electron remains authoritative for the Python backend and Qwen3-TTS lifecycle, including existing-service reuse and single-instance behavior. No separate permanent service or startup task was introduced.
- Verification: `powershell -NoProfile -ExecutionPolicy Bypass -File scripts\start-desktop-pet.ps1 -CheckOnly` passed; the `.lnk` properties were read back successfully.
- Preserve all unrelated dirty changes and every `.bak` file. Nothing was committed or pushed.

## Latest Session Update: TTS Route Dispatch Integrity v1 on 2026-08-07

- Status: root cause fixed, Electron restarted, and real buffered/streaming Qwen requests verified.
- Symptom: renderer used browser speech even though Qwen was healthy. Backend logs showed `handle_tts_request() got an unexpected keyword argument 'process_desktop_qq_command_func'` and `handle_tts_stream_request() got an unexpected keyword argument 'publish_event_func'`.
- Fix: removed those unrelated dispatcher keywords from the two TTS calls in `app.py`. Added an AST/signature test in `tests/test_app_tts_route.py` to prevent future route-signature drift.
- Runtime proof: sanitized frontend config reports `provider=qwen3_tts`, stream playback and reply continuity enabled; Qwen health reports loaded CUDA VoiceDesign; authenticated `/api/tts_stream` and `/api/tts` both returned HTTP 200 `audio/wav` with `RIFF` headers.
- Electron was closed through `CloseMainWindow()` and relaunched through the desktop shortcut, so the active Python backend contains the fix.
- Verification: route-focused tests `7 passed`; the full Python (`644`) and complete Node stages passed. After a documentation-only path correction, the targeted secret scan passed across `641` files together with JSON, Python compile, and scoped whitespace checks; the redundant repeat of the full suites was stopped by user preference.
- Preserve unrelated dirty changes and every `.bak` file. Nothing was committed or pushed.

## Latest Session Update: Dynamic Sad Speech Eyes v1 on 2026-08-07

- Status: bounded visual fix and focused verification complete; native Electron observation remains.
- Root cause: sad speech stacked eyelid-closing values from the exp3 asset, runtime mood expression, and Hiyori director. The combined offset held both eyes at the screenshot's half-closed shape for the whole utterance.
- Fix: sad exp3 and director no longer own eyelid openness. Runtime sad eye softness is small and sinusoidally varied; dynamic blink/gaze remain active. Sadness still uses brows, mouth, cheek, head, shoulder, and body channels.
- Verification: performance cue and continuous director frontend tests passed; JS syntax, expression JSON, and scoped whitespace checks passed. Full gate intentionally omitted for this small visual-only change by user preference.
- Restart Electron before judging. Test the same sad multi-clause line and confirm the eyes remain mostly open, still blink, and do not lose the sad brow/posture read.
- Preserve unrelated dirty changes and every `.bak` file. Nothing was committed or pushed.

## Latest Session Update: VTuber Continuous Speech Body v1 on 2026-08-07

- Status: implementation and focused verification complete; native Electron visual acceptance remains.
- Direction: user chose continuous VTuber-like shoulder and upper-body rhythm rather than one or two larger gestures per reply.
- Runtime: Hiyori speak mode now has a stronger bounded posture; `speechDrive` keeps a higher floor and scales with real audio/body energy. Head, torso, shoulder, body depth, and subtle opposing arms move on related but non-identical phases.
- Safety/performance: uses the existing director sample inside the existing Live2D frame update. No additional animation loop, permanent timer, model asset, or dependency was added. Existing smoothing, cancellation, release, and one-shot cooldowns remain authoritative.
- Verification: focused Hiyori director and performance cue frontend tests passed; added range checks prove continuous torso/head/arm/shoulder presence. JS syntax and scoped whitespace checks passed. Full gate intentionally omitted for this small visual tuning.
- Restart Electron, then test one 10-15 second neutral reply and one energetic reply. Confirm continuous presence is obvious but not twitchy or stronger than facial/lip-sync communication.
- Preserve unrelated dirty changes and every `.bak` file. Nothing was committed or pushed.

## Latest Session Update: Human-Grounded Proactive Continuity v1 on 2026-08-07

- Status: implementation and focused regressions complete. The full local gate passed `646` Python tests and all relevant Node suites, but remains globally blocked by an unrelated existing stylesheet-order assertion in `test_config_switch_frontend.js`; the rest of the Node suites and all syntax/secret/JSON/whitespace checks passed separately. Native Electron conversational acceptance remains.
- The reported line, `Something shifted on your screen—want me to take a look, or are we good?`, came from a raw desktop fingerprint trigger combined with a hardcoded English, exactly-one-sentence automatic prompt. It was not grounded in an actual visual observation and could supersede the user's preceding conversational turn.
- Automatic scheduling now gives an unhandled latest user message priority. A visible assistant reply, silence, micro-reaction, or defer marks it handled; failed or missing completion leaves it available for a bounded continuity repair.
- Desktop changes now create only a private pending attention signal. The model may observe through the existing tools, remain silent, or mention something specific and grounded. Backend fail-closed parsing suppresses generic screen-change/status/permission-to-look output for `desktop_attention_wake` turns.
- Direct and automatic dialogue prompts now read instruction-like messages as social/human intent while preserving concrete task execution and every existing tool confirmation boundary. Automatic prompt language follows the recent conversation rather than forcing English.
- Manual acceptance still required after Electron reload: reproduce the Chinese prompt-like message, verify a natural reply; make a meaningless desktop change and verify silence; expose a concrete harmless error and judge any grounded observation; confirm intentional silence does not later repeat the same turn.
- Preserve unrelated dirty changes, private configuration, and every `.bak` file. Do not commit or push without a new explicit request.

## Latest Session Update: Galgame Dialogue v1 on 2026-09-05

- Status: implementation and focused verification complete. Branch: `codex/galgame-dialogue-v1`. Do not reset or broadly stage the worktree: it contains substantial pre-existing dirty work.
- User-facing behavior: enter via the new `Galgame` utility action, type freely, and click `▶` to stop the current voice immediately and show the next sentence. `语音：关` mutes only the active Galgame session. `返回舞台` cancels the active work and restores the normal desktop pet.
- Assets: `web/assets/galgame/` contains six processed transparent portraits. They retain the approved source RGB and use locally produced alpha. Reuse `night-room-v2.webp` until the user asks to build the deferred preset scene library.
- Reliability: `web/galgamePlayer.js` versions every run and sentence. `web/galgameController.js` guards exit, stale replies, IME, focus, keyboard navigation, mute and replacement. Chat integration suppresses normal whole-reply speech and auto-followups while this mode owns the turn.
- Validation: the two dedicated Galgame Node tests passed, selected chat/TTS/runtime Node tests passed, an IAB fixture traversed all six expressions, and authenticated local Qwen3-TTS returned `200 audio/wav` for an emotion-bearing request. The full Node runner is still blocked by the old stylesheet-order assertion in `test_config_switch_frontend.js`; preserve that unrelated failure.
- Before any later extension, decide whether to add a true model-produced per-sentence performance plan. Current `performance_segments` are a compatible deterministic plan with exact-text gating, not a claim of perfect semantic understanding. Do not commit or push without an explicit request.

## Latest Session Update: Unified Interaction Mind v1 on 2026-08-07

- Status: implementation and focused regressions complete. The full gate passed `652` Python tests and every relevant Node suite, then was globally blocked by an unrelated existing stylesheet-order assertion in `test_config_switch_frontend.js`; all later Node and static/security checks passed separately. Native Electron interaction acceptance remains.
- `interaction_mind.py` owns the bounded private cloud decision contract and compact interruption preference. It persists only `interruption_aversion`, a reason label, and timestamp in the existing vault; no hidden chain-of-thought or source utterance is stored.
- Active companionship now opens a cloud mind pulse after every handled human turn. The model owns semantic continuation and closure through `speak`, `ask_followup`, `interrupt`, `observe`, `recall`, `research`, `wait`, and `close`; local rules remain activity/cost/safety gates and candidate evidence.
- `POST /api/interaction/mind` calls the configured provider directly with no tools and no reply finalizer, parses a strict bounded decision, and exposes no private prompt or raw model reasoning. Visible generation remains the normal character path.
- Tool-seeking mind actions are optional proposals routed through existing tools and high-risk confirmations. Desktop change alone remains insufficient. Low confidence and malformed model output degrade to waiting.
- A high-confidence interruption can use the live ASR partial as grounding. Explicit requests to let the user finish raise the stored threshold; ordinary conversation is never copied into this preference file.
- Manual matrix: ordinary reply followed by relevant follow-up; naturally closed topic; model-selected wait then continuation; live speech that should and should not be interrupted; “让我说完”; useful versus useless desktop change; memory recall; web research; provider failure.
- Preserve unrelated dirty changes, private configuration, and every `.bak` file. Do not commit or push without a new explicit request.

## Latest Session Update: Long-Term Memory Manager v1 on 2026-08-07

- Status: implementation and focused automated verification complete; native Electron layout acceptance remains.
- Memory Management now opens on curated long-term memory rather than the audit candidate pool. It supports search, sorting, overview counts, manual creation, explicit edit mode, pinning, weighting, batch actions, and deletion.
- Existing audit behavior remains available as `待整理` and `整理记录`. Short-term memory and Debug are still code-compatible but hidden from the normal memory-management navigation.
- Core-memory create/edit/delete operations persist directly to the authoritative store and therefore affect the next relevant prompt. Manual creation reuses existing validation, locking, normalization, and atomic persistence; duplicate text is rejected.
- Knowledge retrieval now ignores non-authoritative Obsidian notes marked `origin: legacy_core_memory`, preventing a deleted or edited core memory from resurfacing through an old migration mirror. No vault notes were removed.
- Verification: focused Python memory and Obsidian suites passed (`53 passed`). The full gate passed all `648` Python tests and all Node suites except the unrelated pre-existing `test_config_switch_frontend.js` stylesheet-order assertion; all later Node suites passed separately. Python syntax (`147`), JavaScript syntax (`171`), secret scan (`644`), JSON, and scoped whitespace checks passed.
- The installed Windows UI-control runtime could list the Electron window but could not attach with its documented API, so visually inspect the freshly loaded drawer: default `长期记忆`, create form, edit/cancel mode, `待整理` switch, and narrow-window layout.
- Preserve unrelated dirty changes, private configuration, and every `.bak` file. Do not commit or push without a new explicit request.


## 2026-09-06 Galgame logic continuation
Completed `galgame-character-context-v2`; see latest progress entry for files and test evidence. Three personas now travel controller -> chat payload -> sanitized request config -> llm_runtime.build_reply_prompt. Per-sentence performance no longer disappears in chatApi; player respects canonical segment boundaries and preserves tails. Character changes cancel chat and voice and no longer crash on missing name ID. No modifications to other conversation's CSS/presentation files.
Next: `galgame-semantic-direction-v2` backlog is still outstanding. Design validated model scene/action decisions with finite asset IDs and manual lock, then incremental per-sentence transport/player (current player still begins after full reply). Existing `performance_segments` uses deterministic companion_performance_director, NOT model semantic reasoning. Current GPT/Claude asset coverage limits expressiveness. Integrate TaffyGalgamePresentation transitionCharacter after implementing preload/cancel-safe commit; module is currently not included in main script manifest. Keep external style work intact. One natural dialogue prompt-budget regression remains 709 vs <700, reproduced with personality hook disabled. No live provider/browser verification this turn. No push.


## Latest: 2026-09-06 semantic Galgame integration complete
Supersedes preceding backlog note: model JSONL director, sentence SSE metadata, incremental player, automatic/fixed scenes and preload-safe black character transition are implemented. See latest progress for exact file list and verification. Core path: llm_runtime -> galgame_director.directed_stream -> app_chat_route delta.galgame -> chatApi onDelta(text, segment) -> chatReplyController beginStream/finish -> galgamePlayer. Do not replace model plan with keyword director. No edits to external CSS/presentation module.
Next acceptance: run actual configured model and audible TTS through three personas, especially negation/comfort/hypothetical location and failures. Browser fixture confirms mechanics only. More GPT/Claude sprites remain an asset limitation, not something semantic logic can invent. Full regression known failures: prompt budget 709/<700, stylesheet ordering, local-ASR waveform markup. Preserve all unrelated dirty state and private .bak/config files. No push or deployment this session.


## Latest: live Galgame acceptance 2026-09-06
Ran real configured Terra on 5 synthetic scenarios; all post-fix schema and scene checks pass. Read docs/galgame-live-acceptance.md/json. Fixed Galgame output budget (ordinary 220 tokens too small for JSONL): direction_llm_config clones to 2048; first sentence timeout 45s; no hidden ordinary-chat retry after connected directed stream failure. New regression tests pass. Saved config untouched. Local TTS synthetic WAV valid (24kHz,3.36s) but not listened to. Further work should target full production UI/model/TTS listening and broaden GPT/Claude assets, not repeat this small isolated model test as proof of perfection. Prior full-suite unrelated failures remain. No commit/push.


## 2026-09-11 publication checkout
Prepared codex/desktop-companion-update-20260911 in D:/AI/galgame-publish-20260911 for user's expanded all-public-changes scope. Full gates pass (672 Python, Node all, website 4 browser tests, syntax and secrets). About/homepage/topics updated. README refreshed. Original checkout untouched. Pending push/PR; do not merge main automatically. See latest progress entry and docs/source-update-2026-09.md.


Publication completed 2026-09-11: code commit 101d3e0 pushed to origin/codex/desktop-companion-update-20260911; review PR https://github.com/MaQinglin-665/AI-chat/pull/209 created against main. No merge, installer or tag created. About/homepage/topics verified via GitHub API. Full local verification is recorded above.
