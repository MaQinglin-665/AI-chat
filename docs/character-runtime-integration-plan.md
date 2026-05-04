# Character Runtime 接入前链路调查（Task 004）

## 目标与边界

本调查用于梳理现有聊天/LLM/TTS/Live2D 链路，并给出 **最小安全接入方案**。  
本文件不包含功能接入实现，不修改现有业务逻辑。

## 现状结论（TL;DR）

- `character_runtime.py` 已存在，但当前未被主链路引用（`app.py` 中无导入/调用）。
- 聊天主链路已经稳定分层：前端 `requestAssistantReply` -> `/api/chat(_stream)` -> `call_llm(_stream)` -> 前端 `speak` + 动作队列。
- 最小接入应先做“影子接入（shadow mode）”：默认关闭、只产出 runtime 观测数据，不改变回复文本、TTS、动作默认行为。

## 当前链路调查

### 1. 前端聊天入口

- 用户消息入口：`requestAssistantReply`  
  位置：[chat.js](/D:/AI/ai_desktop_pet/web/chat.js:9763)
- 发起后端请求：`streamAssistantReply`，优先 `/api/chat_stream`，必要时回退 `/api/chat`  
  位置：[chat.js](/D:/AI/ai_desktop_pet/web/chat.js:9651)
- 首个用户动作：`enqueueActionIntent("listen", ...)`  
  位置：[chat.js](/D:/AI/ai_desktop_pet/web/chat.js:9797)

### 2. 后端聊天入口

- POST 路由分发：`do_POST`  
  位置：[app.py](/D:/AI/ai_desktop_pet/app.py:2270)
- 聊天接口：`/api/chat` 与 `/api/chat_stream`  
  位置：[app.py](/D:/AI/ai_desktop_pet/app.py:2396)
- 同步聊天调用：`call_llm(...)`  
  位置：[app.py](/D:/AI/ai_desktop_pet/app.py:2643)
- 流式聊天调用：`call_llm_stream(...)` + SSE `delta/done`  
  位置：[app.py](/D:/AI/ai_desktop_pet/app.py:2587)

### 3. LLM 调用层

- OpenAI-compatible：`call_openai_compatible`  
  位置：[llm_client.py](/D:/AI/ai_desktop_pet/llm_client.py:109)
- Ollama：`call_ollama`  
  位置：[llm_client.py](/D:/AI/ai_desktop_pet/llm_client.py:182)
- 上层包装：`call_llm`（含 prompt 组装、工具分支、情绪更新）  
  位置：[app.py](/D:/AI/ai_desktop_pet/app.py:1114)
- 当前情绪更新点：`update_emotion_from_reply(...)`  
  位置：[app.py](/D:/AI/ai_desktop_pet/app.py:1188)

### 4. TTS 播放链路

- 后端 TTS 接口：`/api/tts` -> `synthesize_tts_audio`  
  位置：[app.py](/D:/AI/ai_desktop_pet/app.py:2441), [tts.py](/D:/AI/ai_desktop_pet/tts.py:1239)
- 前端统一播放入口：`speak(...)`  
  位置：[chat.js](/D:/AI/ai_desktop_pet/web/chat.js:9363)
- 浏览器 TTS 结束事件：`utterance.onend`  
  位置：[chat.js](/D:/AI/ai_desktop_pet/web/chat.js:7551)
- 音频播放结束事件：`audio.onended`  
  位置：[chat.js](/D:/AI/ai_desktop_pet/web/chat.js:9239)

### 5. Live2D / 动作表达链路

- 动作意图入队：`enqueueActionIntent`  
  位置：[chat.js](/D:/AI/ai_desktop_pet/web/chat.js:6981)
- 回复后动作触发：`enqueueActionIntent("reply", ...)`  
  位置：[chat.js](/D:/AI/ai_desktop_pet/web/chat.js:9906)
- 说话过程动作触发：`enqueueActionIntent("talk", ...)`  
  位置：[chat.js](/D:/AI/ai_desktop_pet/web/chat.js:8945)
- 动作执行器：`runActionQueue`  
  位置：[chat.js](/D:/AI/ai_desktop_pet/web/chat.js:6944)

## Runtime 事件映射可行性

现有 `character_runtime.py` 支持事件：

- `user_message`
- `assistant_reply`
- `tts_finished`
- `emotion_hint`
- `tick`

对应当前链路可挂点：

1. `user_message`：前端 `requestAssistantReply` 入参已可直接提供。  
2. `assistant_reply`：后端 `call_llm` 结果与前端 `visibleReply` 均可提供。  
3. `tts_finished`：前端 `utterance.onend` / `audio.onended` 已有稳定结束钩子。  
4. `emotion_hint`：后端 `update_emotion_from_reply` 产出的情绪状态可作为 hint 输入。  
5. `tick`：可由轻量定时器触发，但建议后置到后续任务，先不启用主动打扰。

## 最小安全接入方案（建议用于 Task 005）

### Phase A：后端影子接入（默认关闭）

- 新增配置开关：`character_runtime.enabled`（默认 `false`）。
- 在 `/api/chat` 与 `/api/chat_stream` 路径内部：
  - 请求开始：投递 `user_message`。
  - 生成回复后：投递 `assistant_reply`（带 `text/emotion/voice_style`）。
- `run_once()` 结果仅写入调试字段（例如 `runtime_meta`），不影响 `reply`。

安全收益：

- 不改默认行为。
- 可观测 runtime 状态迁移是否与现链路一致。
- 出现异常可完全降级为“无 runtime”。

### Phase B：前端被动消费（仍不改默认动作）

- 仅在收到 `runtime_meta` 时记录日志/开发面板展示，不改变 `enqueueActionIntent`。
- 保留当前动作/语音链路为主，runtime 指令仅做对照。

### Phase C：接入 `tts_finished`（最小闭环）

- 在 `utterance.onend` 与 `audio.onended` 触发时投递 `tts_finished`。
- 仍保持现有 UI/动作逻辑优先，runtime 只更新状态，不强制驱动前端行为。

## 风险与规避

- 风险：流式输出与最终回复文本可能不一致。  
  规避：只在 `done` 后投递 `assistant_reply`，避免中间态抖动。
- 风险：前端 TTS 双路径（Browser/Server）结束事件不统一。  
  规避：统一在 `speak` 成功返回后补一层收口事件。
- 风险：主动互动误触发影响低打扰体验。  
  规避：接入初期强制 `low_interruption=true`，且不启用 `tick` 自动触发。
- 风险：异常影响主回复链路。  
  规避：runtime 调用全程 `try/except`，失败只记日志不影响 API 返回。

## 下个任务建议验收项（接入实现时）

- 默认配置下，聊天回复/TTS/动作表现与当前版本一致。
- 开启 runtime 后，`user_message -> assistant_reply -> tts_finished` 状态闭环可观测。
- `/api/chat` 与 `/api/chat_stream` 均可稳定运行，无新增 5xx。
- 不新增依赖，不放宽安全默认值，不引入自动桌面观察。

## Task 005 落地补充（最小安全接入）

- 接入位置：`app.py` 的 `PetHandler.do_POST`，仅在 `/api/chat` 与 `/api/chat_stream` 的最终回复出口接入。
- 默认策略：`character_runtime.enabled=false`、`character_runtime.return_metadata=false`，缺失或异常配置均按关闭处理。
- 开启行为：调用 `normalize_runtime_payload(llm_reply)`，仅将 `normalized["text"]` 写回最终 `reply` 文本；不接入 Live2D、TTS voice_style、主动互动、记忆系统。
- 兼容性：关闭时保持原 response shape；开启且 `return_metadata=true` 时才附加可选 `runtime` 字段，旧前端可无感运行。
- 失败回退：归一化异常时回退原始回复文本，不抛出 500。

## Task 006 落地补充（metadata opt-in）

- metadata 字段名统一为 `character_runtime`（仅在 `enabled=true` 且 `return_metadata=true` 时返回）。
- 默认仍不返回 metadata，默认行为与 Task 005 保持一致。
- metadata 结构以 `normalize_runtime_payload` 结果为基础，且不包含 `text`，避免与 `reply` 重复。
- 当前稳定返回字段：`emotion`、`action`、`intensity`、`live2d_hint`、`voice_style`。
- `/api/chat` 与 `/api/chat_stream` done payload 均已支持 `character_runtime` opt-in 返回。
- 本任务未改前端、未接入 Live2D 动作执行、未接入 TTS voice_style 控制、未接入主动互动与记忆系统。

## Task 007 落地补充（structured LLM output prompt）
- 仅在 `character_runtime.enabled=true` 时启用结构化输出提示；默认关闭时不改 prompt、不改 LLM 输入、不改 response shape。
- 在 `app.py` 中新增最小 helper：
  - `_build_character_runtime_prompt_contract()`
  - `_apply_character_runtime_prompt_contract(config, prompt)`
- 接入点：`call_llm` 与 `call_llm_stream` 的 prompt 组装阶段，在语言规则合并后追加 contract（仅 enabled=true）。
- contract 要求模型尽量返回单个 JSON object（无 Markdown 代码块、无 JSON 外解释），字段包含 `text/emotion/action/intensity/voice_style`。
- 运行时仍通过 `normalize_runtime_payload` 兜底：即使模型返回普通文本或坏 JSON，也不会导致聊天崩溃。
- 本任务不改前端，不接 Live2D，不接 TTS voice_style，不接主动互动，不接记忆系统，不新增依赖。

## Task 008 落地补充（frontend metadata bridge）
- 本任务仅在前端建立 Character Runtime metadata bridge，不改后端 Character Runtime 行为，不改 LLM prompt，不改 TTS。
- 接入点位于 `web/chat.js` 的聊天响应接收链路：
  - `/api/chat` 非流式返回路径
  - `/api/chat_stream` done 事件路径
- 新增 helper：
  - `normalizeCharacterRuntimeMetadataForFrontend(raw)`
  - `handleCharacterRuntimeMetadata(raw)`
- helper 只做安全处理：
  - 仅接受 object（忽略 null/string/number/array）
  - 只提取 `emotion/action/intensity/live2d_hint/voice_style` 字段
  - 通过 `window.__AI_CHAT_LAST_CHARACTER_RUNTIME__` 暂存最新 metadata
  - 通过 `window.dispatchEvent(new CustomEvent("character-runtime:update", { detail }))` 分发无害事件
- 当响应中没有 `character_runtime` 时，前端行为完全不变。
- 本任务不驱动 Live2D、不改变 TTS、不改变聊天文本显示与默认 UI 行为。
- 后续 Task 009 再接 emotion -> Live2D 表情/动作映射。

## Task 009 落地补充（Live2D emotion expression bridge）
- 本任务只接 emotion -> Live2D expression bridge，不改后端 Character Runtime，不改 LLM prompt，不改 TTS。
- 复用 Task 008 的 `character-runtime:update` 事件，在前端新增监听并调用安全适配器。
- 新增 helper：
  - `normalizeRuntimeEmotionForLive2D(emotion)`
  - `applyCharacterRuntimeEmotionToLive2D(metadata)`
- 映射策略（保守）：
  - `happy/sad/angry/surprised` 直连
  - `annoyed -> angry`
  - `neutral/thinking/unknown -> idle`
- 适配方式：不调用动作系统，不处理 `action`，不处理 `voice_style`；仅更新现有表情层使用的 `speechAnimMood/moodHoldUntil`，并触发轻量 `triggerExpressionPulse`。
- 安全策略：
  - Live2D 未初始化（`state.model` 不可用）或 expression 关闭时直接跳过
  - 异常仅 `console.debug`，不影响聊天文本与 TTS 主链路
- 后续如模型资源提供稳定 expression API，可在该 bridge 内替换为显式 expression 调用。

## Task 010 落地补充（Live2D action motion bridge）
- 本任务仅接 `action -> Live2D motion/feedback`，不改后端 Character Runtime，不改 LLM prompt，不改 TTS，不处理 `voice_style`。
- 复用 `character-runtime:update` 事件，在前端新增 action 适配器，与 emotion 适配器并行执行，互不阻塞。
- 新增 helper：
  - `normalizeRuntimeActionForLive2D(action)`
  - `getLive2DMotionForAction(action)`
  - `applyCharacterRuntimeActionToLive2D(metadata)`
- action 映射（保守）：
  - `none` -> skip
  - `wave` -> 尝试 `Tap/FlickUp/Idle`
  - `nod` -> 尝试 `FlickDown/Idle`
  - `shake_head` -> 尝试 `Flick@Body/Flick/Idle`
  - `think` -> 尝试 `FlickDown/Idle`
  - `happy_idle` -> 尝试 `Idle/Tap`
  - `surprised` -> 尝试 `FlickUp/Tap/Idle`
  - unknown -> `none`
- 适配策略：
  - 优先调用现有 `tryBuiltInMotion(...)`
  - motion 不可用/失败时降级为轻量 `triggerExpressionPulse(...)`（若可用）
- 安全策略：
  - metadata/action 非法时直接跳过
  - Live2D 未初始化或 motion 关闭时直接跳过
  - 异常仅 `console.debug`，不影响聊天文本、表情主链路、TTS
- 本任务不处理 `voice_style`，不改变默认聊天显示，不新增依赖。

## Task 011 落地补充（Character Runtime frontend debug bridge）
- 本任务新增开发期 debug bridge，用于在前端手动验证 `character_runtime metadata -> character-runtime:update -> emotion/action Live2D bridge` 链路。
- 实现位置：`web/chat.js`，挂载 `window.__AI_CHAT_DEBUG_CHARACTER_RUNTIME__`。
- 提供方法：
  - `emit(metadata)`：安全派发 metadata（复用 `handleCharacterRuntimeMetadata` 和既有 `character-runtime:update` 事件）
  - `testEmotion(emotion)`：仅构造 emotion metadata
  - `testAction(action)`：仅构造 action metadata
  - `samples`：仅提供样例数据，不自动执行
- 设计原则：
  - 默认无害，不改默认聊天 UI
  - 不调用后端，不改 LLM prompt，不改 TTS
  - 非法输入（null/string/number/array）安全忽略
  - 不替代正式测试，仅辅助开发调试
- Console 示例：
  - `window.__AI_CHAT_DEBUG_CHARACTER_RUNTIME__.testEmotion("happy")`
  - `window.__AI_CHAT_DEBUG_CHARACTER_RUNTIME__.testAction("wave")`
  - `window.__AI_CHAT_DEBUG_CHARACTER_RUNTIME__.emit({ emotion: "annoyed", action: "shake_head" })`

## Task 012 落地补充（Character Runtime metadata cross-window bridge）
- 架构确认：`chatWindow` 与 `modelWindow` 为两个独立 `BrowserWindow` / renderer，`window.dispatchEvent("character-runtime:update")` 仅在当前窗口生效。
- 本任务在 `web/chat.js` 新增最小 BroadcastChannel 跨窗桥，channel 为 `taffy-character-runtime`。
- chat 窗口在 `handleCharacterRuntimeMetadata(...)` 正常本地处理后，额外广播：
  - `{ type: "character-runtime:update", metadata }`
- model 窗口安装 `installCharacterRuntimeWindowBridge()` 监听广播，收到后执行本地 `handleCharacterRuntimeMetadata(metadata, { broadcast: false })`，从而复用既有 emotion/action 事件链路并避免循环广播。
- 复用已有 metadata 安全裁剪逻辑：仅接受 object，忽略 null/string/number/array，仅透传 `emotion/action/intensity/live2d_hint/voice_style`。
- BroadcastChannel 不可用时安全降级为本地行为，不影响聊天文本、TTS 与主流程稳定性。
- 本任务不改后端 Character Runtime、不改 LLM prompt、不改 TTS、不改默认聊天 UI。
- Character Profile 配置基础工作顺延到 Task 013。

## Task 013 落地补充（Character Profile config foundation）
- 本任务新增 Character Profile 配置骨架：`config/character_profile.json`。
- 后端新增 profile 读取与默认兜底 helper：
  - `_normalize_character_profile_string(...)`
  - `_normalize_character_profile_list(...)`
  - `_normalize_character_profile_config(...)`
  - `_load_character_profile_config(...)`
- 兜底策略：
  - 文件不存在 -> 默认 profile
  - JSON 损坏 -> 默认 profile
  - 字段缺失 -> 默认值补齐
  - 类型异常 -> 默认值补齐
- 仅当 `character_runtime.enabled=true` 时，profile 轻量信息参与 runtime structured prompt contract；disabled 路径保持不变。
- runtime prompt 可注入字段：
  - `name/persona/tone/style_notes`
  - `allowed_emotions/allowed_actions/allowed_voice_styles`
- 本任务不改前端 UI，不改 Live2D，不改 TTS，不接记忆，不接主动互动，不新增依赖。
- 后续任务再扩展 profile UI、多角色与角色市场。

## Task 014 落地补充（Character Profile prompt polish and style tuning）
- 本任务聚焦 Character Profile 与 runtime structured prompt wording 优化，不改后端 response shape，不改前端 UI、Live2D、TTS。
- 默认行为保持不变：仅当 `character_runtime.enabled=true` 时注入 profile 风格 guidance；disabled 路径 prompt 与主流程不变。
- `config/character_profile.json` 新增轻量字段：
  - `response_guidelines`
  - `style_boundaries`
  - `interaction_examples`
- 后端 `app.py` 扩展 profile 归一化兜底：
  - 字段缺失 -> 默认值
  - 类型异常 -> 默认值
- runtime prompt 规则更清晰：
  - 保持 natural/concise/expressive，轻微 playful/teasing，但以任务可用性为先。
  - 避免 generic assistant 口吻，同时避免过度戏剧化、过度可爱或强 roleplay。
  - 禁止强制每句调侃与不当依赖暗示。
  - 继续要求 JSON-only 输出（无 Markdown code block、无 JSON 外解释）。
  - emotion/action/voice_style 仅可从 allowed 列表选择，不确定时回退 neutral/none/neutral。
- 本任务不接记忆、不接主动互动、不新增依赖。

## Task 015 落地补充（Character Runtime end-to-end validation）
- 本任务新增端到端验证文档：`docs/character-runtime-e2e-validation.md`，覆盖从 LLM 输出到 Live2D emotion/action 反馈的完整链路检查。
- 验证重点包括：
  - runtime 默认关闭兼容性（聊天/TTS/response shape 不变）
  - runtime enabled 时 structured JSON prompt 注入
  - `return_metadata=true` 时 metadata opt-in 返回
  - chatWindow metadata 接收
  - BroadcastChannel (`taffy-character-runtime`) 跨窗转发到 modelWindow
  - modelWindow emotion/action bridge 触发与安全降级
  - debug bridge 手动触发链路
  - 关闭 runtime 后恢复旧行为
- 文档包含 chatWindow DevTools 手动命令与预期结果，便于开发回归验证。
- 已知限制已注明：暂无前端自动化命令、Live2D 表现依赖模型资源、motion 缺失时安全降级、LLM provider 故障与 frontend bridge 问题边界。
- 本任务不改后端 response shape，不改前端 UI/Live2D/TTS，不接记忆/主动互动，不新增依赖。

## Task 016 Landing Notes (Character Runtime demo enablement docs)
- Added `docs/character-runtime-demo.md` as a developer-facing entry for enabling and validating the Character Runtime demo path.
- The guide documents that Character Runtime remains disabled by default, with config loaded from `config.example.json -> config.json -> config.local.json`.
- The guide shows the minimal demo config using `character_runtime.enabled=true` and `character_runtime.return_metadata=true`.
- The guide explains that the structured JSON prompt contract is only injected when runtime is enabled.
- The guide explains that `/api/chat` and `/api/chat_stream` may include optional `character_runtime` metadata only when metadata return is enabled.
- The guide documents the frontend boundary: `chatWindow` forwards runtime metadata to `modelWindow` through `BroadcastChannel("taffy-character-runtime")`; this channel only forwards metadata and does not replace the backend or TTS pipeline.
- The guide includes DevTools validation commands for `testEmotion`, `testAction`, and `emit`, and links to the Task 015 E2E validation document.
- The guide documents troubleshooting boundaries: missing Live2D motion resources can degrade safely, `/api/chat` 500 is usually an LLM provider/config/network issue, and an undefined debug bridge often means the wrong DevTools window or stale frontend code.
- This task does not change backend response defaults, frontend UI, Live2D behavior, TTS behavior, memory, proactive interaction, or dependencies.

## Task 017 Landing Notes (Runtime demo smoke test checklist)
- Added `docs/character-runtime-smoke-test.md` as a manual smoke test checklist for release/demo readiness and runtime-related regression checks.
- The checklist explicitly covers scope boundaries: it is a manual quick-check aid, not an automated suite and not a full E2E replacement.
- Added prerequisite checks for backend/frontend startup, provider readiness, Live2D model load, and `chatWindow` DevTools access.
- Added baseline disabled-path checks for `character_runtime.enabled=false` and `character_runtime.return_metadata=false` to confirm default compatibility.
- Added enabled-path checks for `enabled=true` and `return_metadata=true`, including metadata field expectations and fallback stability on non-JSON/bad-JSON model outputs.
- Added debug bridge command checks (`testEmotion`, `testAction`, `emit`) and cross-window forwarding checks through `BroadcastChannel("taffy-character-runtime")`.
- Added Live2D behavior expectations and safe-degradation notes for missing motion/expression resources.
- Added TTS/chat-text regression checks to ensure runtime metadata does not alter TTS behavior or pollute chat UI.
- Added common failure attribution guidance and a pass/fail recording table for repeatable manual verification.
- Updated `docs/character-runtime-demo.md` with a short link to the smoke checklist.
- This task does not change backend response defaults, frontend UI, Live2D behavior, TTS behavior, memory, proactive interaction, or dependencies.

## Task 018 Landing Notes (Character Runtime safe local demo config guide)
- Added `docs/character-runtime-safe-local-config.md` as a safety-focused local demo config guide for repeatable runtime demonstrations and pre-release validation.
- Clarified local/demo/release boundaries: runtime demo switches are local verification settings and must not be treated as default release behavior.
- Documented real config layering and override order (`config.example.json -> config.json -> config.local.json`) and highlighted local override hygiene.
- Added explicit preparation and cleanup checklists for recording/demo workflows, including baseline restore and commit-safety checks.
- Linked the new guide from demo and smoke-test docs for a consistent setup path.
- This task introduces no behavior changes and no code-path changes (backend response shape, frontend UI, Live2D behavior, TTS behavior, memory, proactive interaction, dependencies all unchanged).

## Task 019 Landing Notes (Release demo recording checklist)
- Added `docs/release-demo-recording-checklist.md` for pre-release recording workflows across README, Release page, social clips, and internal demo materials.
- Clarified required recording scenarios, per-clip verification intent, and post-recording baseline recovery checks.
- Clarified public messaging boundaries and exclusion rules for sensitive information and failure-state footage.
- Linked the release recording checklist from the safe local config guide as the main recording workflow entry point.
- No behavior changes and no code-path changes (backend response shape, frontend UI, Live2D behavior, TTS behavior, memory, proactive interaction, dependencies all unchanged).

## Task 020 Landing Notes (Runtime demo prompt examples)
- Added `docs/character-runtime-demo-prompts.md` as a reusable prompt reference for local demo, recording, smoke support, and runtime-related manual validation.
- Clarified prompt groups for emotion/action demo coverage, including happy, surprised, annoyed-safe, thinking, wave, shake_head, and mixed prompts.
- Clarified public demo prompt boundaries and recording safety guidance to avoid sensitive content and over-claim messaging.
- Linked prompt examples from the release demo recording checklist for a consistent recording workflow.
- No behavior changes and no code-path changes (backend response shape, frontend UI, Live2D behavior, TTS behavior, memory, proactive interaction, dependencies all unchanged).

## Task 021 Landing Notes (Release demo capture plan)
- Added `docs/release-demo-capture-plan.md` as an execution-oriented shot plan for release/demo capture workflows.
- Defined clip naming convention, audience/use mapping, config state, suggested input, and pass criteria in a reusable capture table.
- Clarified public-safe versus developer-only material boundaries and post-capture acceptance checks.
- Linked the capture plan from recording checklist and prompt examples to form a consistent recording workflow.
- No behavior changes and no code-path changes (backend response shape, frontend UI, Live2D behavior, TTS behavior, memory, proactive interaction, dependencies all unchanged).

## Task 022 Landing Notes (Live2D expression intensity tuning)
- Added `tasks/codex/022-expression-intensity-tuning.md` as a small polish task for making runtime-driven expressions more visible.
- The task stays inside the existing Live2D expression path and does not change backend metadata, LLM prompt, TTS, or the action bridge.
- The intended tuning surface is limited to expression pulse strength, mood hold timing, and related local weighting.
- Default fallback behavior remains unchanged when Live2D is unavailable or expression support is disabled.
- This task is a polish step only and does not widen scope into asset replacement or broader UI changes.
