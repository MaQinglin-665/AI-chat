# Task 018：Character Runtime safe local demo config guide

## 任务背景
Task 017 已提供 smoke test checklist。
本任务补充“安全本地 demo 配置”文档，帮助开发者和维护者在演示、录制、发布前验证时稳定开启 runtime，同时避免误改默认行为或误提交本地配置。

## 本次目标
- 新增 `docs/character-runtime-safe-local-config.md`
- 明确本地 demo 与 release 默认配置边界
- 明确配置来源与覆盖顺序（以项目真实机制为准）
- 提供录制前检查与录制后清理步骤
- 补充常见风险与误判

## 约束
- 只做文档，不改代码逻辑
- 不改默认行为
- 不改后端 response shape
- 不改前端 UI
- 不改 Live2D 行为
- 不改 TTS 行为
- 不接记忆
- 不接主动互动
- 不新增依赖
- 不新增会被默认加载且易误导的配置文件

## 核心说明点
1. demo 配置仅用于本地验证，不是 release 默认值
2. 仅 `enabled=true` 时注入 runtime structured prompt
3. 仅 `return_metadata=true` 时返回可选 `character_runtime` metadata
4. metadata 不应包含 `text`
5. `voice_style` 目前不改变 TTS 行为
6. 演示结束后应恢复 baseline 并检查 `git status`

## 输出文件
- `docs/character-runtime-safe-local-config.md`
- `docs/character-runtime-demo.md`（追加 safe config guide 链接）
- `docs/character-runtime-smoke-test.md`（追加 safe config guide 链接）
- `docs/character-runtime-integration-plan.md`（Task 018 Landing Notes）
