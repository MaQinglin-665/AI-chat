# Task 017：Runtime demo smoke test checklist

## 任务背景
Task 016 已补齐 Character Runtime demo 启用说明。
本任务补一份发布前/演示前可快速执行的人工 smoke test checklist，降低回归漏检风险。

## 本次目标
- 新增 `docs/character-runtime-smoke-test.md`
- 覆盖 runtime 默认关闭与 demo 开启两条路径
- 提供 chatWindow DevTools debug bridge 命令清单
- 覆盖 chatWindow -> modelWindow 跨窗转发与 Live2D 反馈期望
- 提供常见失败归因与 Pass/Fail 记录模板

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

## 文档范围
1. Smoke test 适用场景与边界（非自动化、非完整 E2E 替代）
2. 前置条件与 demo 启用入口
3. Baseline（runtime disabled）检查项
4. Demo enabled 配置与 metadata 检查项
5. Debug bridge 命令验证
6. chatWindow -> modelWindow 跨窗检查
7. Live2D 表情/动作反馈期望
8. TTS 与聊天文本回归检查
9. 常见失败归因
10. Pass/Fail 记录模板

## 输出文件
- `docs/character-runtime-smoke-test.md`
- `docs/character-runtime-demo.md`（追加 smoke checklist 链接）
- `docs/character-runtime-integration-plan.md`（Task 017 Landing Notes）
