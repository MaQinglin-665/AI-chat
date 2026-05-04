# Proactive Scheduler Guard（设计护栏草案）

本文档用于约束“自动 proactive 开口”在落地前后的安全边界与回滚边界。  
当前仓库处于 MVP / 开源孵化阶段，本设计以“默认关闭、低打扰、可回滚、可观测”为优先原则。

## 1. 默认原则（A）

1. 默认关闭：自动 proactive scheduler 必须默认禁用（fail closed）。
2. 双开关门控：仅在 `conversation_mode.enabled=true` 且 `proactive_enabled=true` 时才允许触发。
3. 数据边界：不读取桌面、文件或任何隐私数据。
4. 能力边界：不调用工具、不执行 shell。
5. 不绕过现有 `skipDesktopAttach`。
6. 运行态边界：在 TTS speaking、`chatBusy`、用户输入进行中时不得触发。
7. 反自激边界：不允许连续循环“自说自话”。

## 2. 触发前置条件（B）

自动触发前，以下条件必须同时满足：

1. `followupPending=true`。
2. 存在非空 `topicHint`。
3. silence eligibility 为 `true`。
4. 距离“最近一次用户输入”与“最近一次 TTS 完成”都达到 silence window。
5. 当前非 speaking、非 `chatBusy`。
6. 当前不存在进行中的 follow-up execution（`proactiveInFlight!==true`）。
7. 当前时间已超过冷却截止（满足 cooldown）。

任一条件不满足即阻塞，并记录可读 `blockedReason`。

## 3. 冷却与频率限制建议（C）

1. `proactiveCooldownMs` 默认建议不少于 10 分钟（`>=600000` ms）。
2. 每个窗口内触发次数受 `max_followups_per_window` 限制。
3. 单次成功后应消费 pending（清理 `followupPending`）或进入明确 cooldown，避免重复触发同一 pending。
4. 单次失败后可恢复 pending，但必须进入短 cooldown，避免失败重试循环。
5. 用户一旦有新输入，应重置或延后 proactive 计时。
6. 应用启动后需要 warmup 窗口，warmup 期间不主动说话。

## 4. 状态字段建议（D）

建议在 conversation follow-up/proactive debug state 中新增或保留以下字段：

1. `proactiveLastTriggeredAt`
2. `proactiveLastAttemptAt`
3. `proactiveCooldownUntil`
4. `proactiveWindowStartedAt`
5. `proactiveCountInWindow`
6. `proactiveInFlight`
7. `proactiveLastBlockedReason`
8. `proactiveLastResult`

字段要求：
- 时间字段统一毫秒时间戳（epoch ms）。
- `proactiveLastResult` 应为短枚举（如 `success`/`failed`/`blocked`），避免写入长文本。

## 5. Scheduler 形态建议（E）

1. 第一版仅使用低频 polling 或已有 heartbeat，不引入复杂 scheduler。
2. 不依赖隐藏的 `while(true)` 循环。
3. 每次 tick 只做 eligibility 检查，最多触发一次 follow-up。
4. 触发路径必须复用现有 dry-run/manual execution guard，不复制 `requestAssistantReply` 逻辑。
5. 所有 tick 判定与触发结果都写入 debug events（含 blocked/start/success/failed/cooldown）。

## 6. 配置建议（F）

建议配置字段：

1. `proactive_scheduler_enabled`（如新增，默认 `false`）
2. `proactive_cooldown_ms`
3. `proactive_warmup_ms`
4. `proactive_window_ms`
5. `max_followups_per_window`（复用现有字段）

约束建议：

1. 保守 clamp（示例建议）：
   - `proactive_cooldown_ms`：`600000`~`7200000`
   - `proactive_warmup_ms`：`60000`~`1800000`
   - `proactive_window_ms`：`600000`~`86400000`
   - `max_followups_per_window`：`1`~`3`
2. 布尔配置必须仅 JSON `true` 才启用（字符串 `"true"`、数字 `1` 不视为启用）。

## 7. Debug / Observability（G）

1. debug snapshot 应暴露 scheduler 当前状态（含 cooldown/window/in-flight/lastResult）。
2. debug events 至少包含：
   - `blocked`
   - `start`
   - `success`
   - `failed`
   - `cooldown`
3. `blockedReasons` 必须可读且可归类（如 `cooldown_active`、`silence_not_reached`、`chat_busy`）。
4. 不记录完整长 prompt，不记录隐私内容，不记录潜在敏感上下文原文。

## 8. 回滚策略（H）

1. 关闭 `proactive_enabled` 即完全禁用自动 proactive。
2. 若新增 `proactive_scheduler_enabled`，可与 `proactive_enabled` 分层禁用。
3. 任意异常路径应 fail closed（不触发自动回复）。
4. 不影响现有手动入口：
   - `runConversationFollowup`
   - `dryRunSilenceFollowup`

## 9. 验证计划（I）

最低验证清单：

1. 默认配置下无自动触发。
2. `enabled=false` 时不触发。
3. `proactive_enabled=false` 时不触发。
4. silence 不达标时不触发。
5. speaking/`chatBusy` 时不触发。
6. cooldown 窗口内不触发。
7. 成功后不重复触发同一 pending。
8. 失败后 pending 恢复，但不会紧密重试。
9. 不触发桌面截图、工具调用、文件访问。
10. 手动入口仍可用且行为不变。

## 10. 分阶段实现建议（J）

1. Task 040：scheduler config skeleton（默认关闭）。
2. Task 041：scheduler state + debug snapshot（只读可见性）。
3. Task 042：manual scheduler tick（DevTools-only）。
4. Task 043：disabled-by-default polling skeleton。
5. Task 044：limited auto trigger smoke + docs。

## 11. 落地约束摘要

在 Task 040~044 全阶段中，持续保持以下底线：

1. 不自动越权到桌面/文件/隐私读取。
2. 不引入默认开启的自动开口。
3. 不破坏现有 manual-only 调试入口与 guard。
4. 任意阶段都可通过配置开关快速回退到当前稳定行为。

