# Task 006: Character Runtime metadata opt-in response

## 任务背景

Task 005 已完成 Character Runtime 默认关闭的最小安全接入。  
当前需要在不改变默认行为的前提下，补充可选 metadata 返回能力，供后续前端/Live2D/TTS 接入准备。

## 本次目标

- 在 `character_runtime.enabled=true` 且 `character_runtime.return_metadata=true` 时，返回 `character_runtime` 字段。
- metadata 与 `reply` 解耦：不重复 `text` 字段。
- `/api/chat` 与 `/api/chat_stream` 的 done payload 都支持 opt-in metadata。

## 默认关闭策略

- 默认：`character_runtime.enabled=false`
- 默认：`character_runtime.return_metadata=false`
- 缺失配置、错误类型配置、解析异常：统一按关闭处理

## 允许修改范围

- `app.py`
- `tests/test_character_runtime_integration.py`
- `docs/character-runtime-integration-plan.md`
- `tasks/codex/006-runtime-metadata-opt-in.md`

## 禁止修改范围

- 不改前端（`web/`、`electron/`）
- 不接入 Live2D 动作执行
- 不接入 TTS `voice_style` 控制逻辑
- 不接入主动互动
- 不接入记忆系统
- 不新增依赖

## 实现说明

- 复用 `app.py` 中 `_apply_character_runtime_reply` 作为单一入口。
- metadata 字段命名为 `character_runtime`，仅在双开关开启时附加。
- metadata 从 `normalize_runtime_payload` 结果提取并扩展：
  - `emotion`
  - `action`（默认 `none`）
  - `intensity`（默认 `normal`）
  - `live2d_hint`（基于 `emotion_to_live2d_hint`）
  - `voice_style`
- 关闭路径保持原 response shape，不暴露 metadata。

## 测试说明

`tests/test_character_runtime_integration.py` 新增/更新覆盖：

1. 缺失 `character_runtime` 配置时，不返回 `character_runtime`。
2. `enabled=false` 时，不返回 `character_runtime`。
3. `enabled=true && return_metadata=false` 时，仅更新 `reply`，不返回 `character_runtime`。
4. `enabled=true && return_metadata=true` 时，返回 `character_runtime`。
5. metadata 不包含 `text`。
6. metadata 包含稳定字段（`emotion/action/intensity/live2d_hint/voice_style`）。
7. `/api/chat_stream` done payload 在 opt-in 时返回 `character_runtime`。
8. malformed config 按关闭处理，不返回 `character_runtime`。

## 风险

- 流式场景 metadata 只在 done 节点提供，delta 不承载 metadata。  
  该行为与当前前端兼容，不影响默认消费逻辑。

## 验收标准

- 默认行为完全不变
- metadata 为严格 opt-in
- `/api/chat` 与 `/api/chat_stream` 都支持
- 不改前端、不接入 Live2D/TTS 控制、不新增依赖
- 测试通过
