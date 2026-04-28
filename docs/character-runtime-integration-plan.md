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
