# Task 007：Character Runtime structured LLM output prompt

## 任务背景
Task 005 已完成 Character Runtime 默认关闭接入；Task 006 已完成 metadata opt-in 返回。本任务在不改变默认行为的前提下，让 runtime 开启时 LLM 更稳定输出可解析结构。

## 本次目标
- `character_runtime.enabled=false`：保持原 prompt、原 LLM 输入、原 response shape。
- `character_runtime.enabled=true`：在调用 LLM 前追加结构化输出 contract。
- 输出仍由 `normalize_runtime_payload` 兜底解析，异常时不崩溃。

## 默认关闭策略
- `character_runtime.enabled` 默认 `false`。
- 缺失配置或配置异常按关闭处理。
- 关闭时不注入 structured prompt contract。

## 允许修改范围
- `app.py`（最小注入点）
- `tests/test_character_runtime_integration.py`（接入测试补充）
- `docs/character-runtime-integration-plan.md`（Task 007 落地补充）
- `tasks/codex/007-runtime-structured-llm-prompt.md`

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

## 实现说明
- 新增 helper：
  - `_build_character_runtime_prompt_contract()`：定义 structured JSON contract。
  - `_apply_character_runtime_prompt_contract(config, prompt)`：仅在 runtime enabled 时追加 contract。
- 在 `call_llm` 和 `call_llm_stream` 的 prompt 构造阶段调用上述 helper。
- contract 要求字段：`text`, `emotion`, `action`, `intensity`, `voice_style`。
- 不改变默认 reply 回写路径：最终仍由 `_apply_character_runtime_reply` + `normalize_runtime_payload` 处理。

## 测试说明
新增/补充集成测试覆盖：
1. enabled=false 时，传入 LLM 的 prompt 不包含 runtime contract。
2. enabled=true 时，传入 LLM 的 prompt 包含 JSON schema / runtime contract。
3. `/api/chat_stream` 关键路径在 enabled=true 时同样注入 contract。
4. 继续保留 Task 005/006 用例：默认行为不变、metadata opt-in、坏 JSON 安全兜底。

## 风险
- 模型可能不严格遵守 JSON contract；通过 `normalize_runtime_payload` 回退规避崩溃风险。
- contract 仅在 enabled=true 生效，避免影响现网默认行为。

## 验收标准
- 默认行为不变（enabled=false）。
- enabled=true 时已注入 structured prompt contract。
- 非 JSON/坏 JSON 仍安全回退，不产生 500。
- 不修改前端，不接 Live2D/TTS/主动互动/记忆。
- 不新增依赖，测试通过。
