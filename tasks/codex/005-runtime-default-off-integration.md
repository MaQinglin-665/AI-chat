# Task 005: Character Runtime 最小安全接入

## 任务背景

Task 003 已提供 `character_runtime.py` 骨架与测试。  
Task 004 完成了链路调查与接入规划。  
本任务进行第一次主链路接入，但必须默认关闭并保持兼容。

## 本次目标

- 在后端聊天回复链路接入 `normalize_runtime_payload`。
- 默认关闭 Character Runtime。
- 关闭时行为保持不变。
- 开启时只使用 `normalized.text` 作为最终回复文本。
- metadata 仅在显式开关开启时附加返回。

## 默认关闭策略

- 开关：`character_runtime.enabled`，默认 `false`。
- metadata 开关：`character_runtime.return_metadata`，默认 `false`。
- 缺失配置、配置类型异常或解析失败时均按关闭处理。

## 允许修改范围

- `app.py`
- `tests/test_character_runtime_integration.py`
- `docs/character-runtime-integration-plan.md`
- `tasks/codex/005-runtime-default-off-integration.md`

## 禁止修改范围

- `electron/`
- `web/`
- `tts.py`
- `tools.py`
- `.github/`
- `package.json`
- `requirements.txt`
- `README.md`
- `CHANGELOG.md`
- 不新增依赖，不改安全默认值。

## 实现说明

- 在 `app.py` 新增最小辅助函数：
  - `_parse_bool_flag`
  - `_get_character_runtime_settings`
  - `_apply_character_runtime_reply`
- 接入点：
  - `/api/chat`：`call_llm` 返回后发送 JSON 前。
  - `/api/chat_stream`：SSE `done` 发送前。
- 关闭时直通原回复文本，不改变响应结构。
- 开启时对 LLM 回复执行 `normalize_runtime_payload`，取 `normalized["text"]`。
- 归一化异常时回退原文本并记录简短日志。
- metadata 默认不返回；仅 `enabled=true && return_metadata=true` 时附加 `runtime` 字段。

## 测试说明

新增 `tests/test_character_runtime_integration.py`，覆盖：

1. 默认关闭时回复保持原样。
2. 开启后普通文本保持文本输出。
3. 开启后 JSON 字符串可提取 `normalized.text`。
4. 开启后坏 JSON 不崩溃并回退文本。
5. 开启后 dict 回复也最终返回纯文本（避免 TTS 收到对象）。
6. metadata 默认不返回。
7. metadata 开关开启时才返回 `runtime` 字段。

## 风险

- 流式模式下 `delta` 仍是原始流片段，归一化作用于 `done.reply` 最终值。  
  风险可接受，且不破坏现有前端流式消费方式。

## 验收标准

- Character Runtime 默认关闭。
- 关闭时现有行为不变（返回字段、TTS 输入、前端消费方式不变）。
- 开启时可稳定执行 `normalize_runtime_payload`。
- TTS 仍只消费字符串回复文本。
- metadata 默认关闭且为可选附加字段。
- 不修改前端、不接入 Live2D、不新增依赖、不改安全默认值。
