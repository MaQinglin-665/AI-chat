# Task 039: Proactive scheduler design guard doc

## 背景
- Task 029~038 已完成 conversational follow-up 的配置、debug snapshot、planner、prompt draft、manual execution、失败恢复、smoke checklist、silence eligibility debug 与 manual silence dry-run。
- 当前仍无自动 proactive 触发。
- 在真正实现自动触发前，需要先明确安全边界、触发条件、冷却策略、回滚方式与验证标准，避免一次性引入过大风险。

## 目标
1. 新增 proactive scheduler guard 设计文档，明确默认 fail-closed 与低打扰原则。
2. 给后续 Task 040+ 提供可执行、可回归、可回滚的边界说明。
3. 仅做文档，不引入任何运行行为变更。

## 实施范围
- 新增：
  - `docs/proactive-scheduler-guard.md`
- 更新：
  - `docs/conversational-mode-design.md`（追加 Task 039 Landing Notes 并链接 guard 文档）

## 关键覆盖点
- 默认原则：默认关闭、显式双开关、禁止桌面/文件/隐私读取、禁止工具调用与 shell、禁止绕过 `skipDesktopAttach`。
- 触发前置条件：pending/topicHint/silence/cooldown/speaking/chatBusy/in-flight 全量门控。
- 冷却与频率：长冷却、窗口上限、成功与失败分流、用户输入重置、启动 warmup。
- 状态字段：触发时刻、尝试时刻、冷却截止、窗口计数、in-flight、阻塞原因、结果字段。
- scheduler 形态：首版仅低频 polling 或既有 heartbeat；单 tick 最多一次；复用现有 dryRun/manual guard。
- 配置建议：默认 false、布尔仅 JSON true 生效、保守 clamp 范围。
- 可观测性：snapshot/events/blockedReasons 可读，避免记录长 prompt 与隐私内容。
- 回滚策略：关闭 proactive 开关即可完全禁用；异常 fail closed；不影响手动入口。
- 验证计划：覆盖默认禁用、门控阻塞、冷却、失败恢复、隐私边界、手动入口可用性。
- 分阶段推进：Task 040~044 的最小可控拆分。

## 非目标
- 不改 `web/chat.js`
- 不改 `config.py`
- 不新增自动 proactive 触发
- 不新增 timer/scheduler 执行逻辑

## 验证
1. `git status --short` 仅出现 `docs/` 与 `tasks/codex/` 下文档改动。
2. `git diff --check` 无格式错误。
3. 人工阅读确认 guard 文档已覆盖 A~J 全部条目。

