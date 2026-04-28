# Task 004: Character Runtime Integration Plan

## 1) 任务背景

`character_runtime.py` 已在 Task 003 中完成骨架化，但尚未接入聊天主链路。  
本任务只做接入前调查与文档规划，不实现接入代码。

## 2) 调查目标

- 梳理现有聊天 -> LLM -> TTS -> Live2D 的实际调用链路。
- 找到可挂接 `CharacterRuntime` 的最小触点。
- 给出默认安全、可回滚、且不影响现有聊天体验的接入方案。

## 3) 允许修改范围

- 仅允许文档类文件改动。
- 允许新增/修改：
  - `docs/character-runtime-integration-plan.md`
  - `tasks/codex/004-runtime-integration-plan.md`

## 4) 禁止修改范围

- 不实现接入逻辑代码。
- 不修改业务主流程（包括但不限于 `app.py`、`llm_client.py`、`tts.py`、`web/`、`electron/`）。
- 不新增依赖，不修改安全默认值。

## 5) 需要检查的代码链路

- 前端聊天入口：`web/chat.js` -> `requestAssistantReply` / `streamAssistantReply`。
- 后端聊天入口：`app.py` -> `do_POST` -> `/api/chat` / `/api/chat_stream`。
- LLM 调用：`app.py` -> `call_llm` / `call_llm_stream` -> `llm_client.py`。
- TTS 路径：`web/chat.js` -> `speak` -> `/api/tts` -> `tts.py::synthesize_tts_audio`。
- Live2D 路径：`web/chat.js` -> `enqueueActionIntent` / `runActionQueue`。

## 6) 输出文档

- 交付文档：`docs/character-runtime-integration-plan.md`
- 核心结论：
  - 当前 runtime 模块未接入 `app.py` 主链路。
  - 接入触点优先为：`user_message`、`assistant_reply`、`tts_finished`。
  - 推荐“影子接入（默认关闭）”分阶段落地，先观测后驱动。

## 7) 下一步建议

1. Task 005 先做后端影子接入：默认关闭，仅记录 runtime 状态，不改变回复文本。  
2. 前端仅被动消费 `runtime_meta`（日志/调试展示），不替换现有动作与 TTS 逻辑。  
3. 等闭环稳定后，再引入 `tts_finished` 事件驱动与更细粒度策略开关。

## 验收清单

- [x] 已梳理聊天 -> LLM -> TTS -> Live2D 链路。
- [x] 已给出 Runtime 最小接入触点。
- [x] 已明确默认不影响现有聊天的策略（默认关闭 + 影子接入）。
- [x] 仅完成文档调查，不实现接入代码。
