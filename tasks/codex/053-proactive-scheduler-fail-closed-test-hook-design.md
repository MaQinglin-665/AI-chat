# Task 053: proactive scheduler exception fail-closed 安全测试入口设计

## 背景

- Task 040~052 的 proactive scheduler 基线已合入 `main`。
- default-off、三层开关 polling、kill-switch runtime stop 已有运行态证据。
- 当前残余风险：缺少安全、可审计的异常注入入口，导致 exception fail-closed live event ordering 仍是 `partial`。

## A. 目标与非目标

### 目标
1. 设计一个仅用于本地调试的异常注入入口，用于验证 proactive scheduler 的 fail-closed 事件顺序。
2. 重点验证以下结论：
   - 出现 `proactive_scheduler_poll_failed`
   - 出现 `poll_exception_fail_closed`（对应 stop 原因）
   - 无失控重试
   - 无绕过 guard
   - 无自动截图/工具调用/读文件

### 非目标
1. 不改动生产调度行为。
2. 不为普通用户暴露触发入口。
3. 不新增后端 API 或远程触发机制。
4. 不新增任何自动 proactive 行为。

## B. 安全边界

1. 默认关闭（default-off）。
2. 仅允许 DevTools/debug bridge 或显式本地调试开关触发。
3. 不允许远程 API 直接触发异常注入。
4. 不允许持久化危险状态（页面刷新后应失效）。
5. 不允许影响正常用户消息链路。
6. 不允许直接调用 `requestAssistantReply`。
7. 不允许引入截图、工具调用、文件读取新路径。

## C. 候选方案比较

### 方案 1：DevTools-only debug bridge（推荐）
示例：
`window.__AI_CHAT_DEBUG_TTS__.injectProactiveSchedulerPollFailureOnce(reason)`

优点：
1. 只在当前页面内存生效，reload 即失效。
2. 不写入配置，不污染用户环境。
3. 不暴露后端 API，审计边界清晰。
4. 可做一次性注入（next poll only），便于验证事件顺序。

风险与控制：
1. 必须要求 debug bridge 已显式暴露才可用。
2. 必须自动清除一次性注入标记，避免重复触发。

### 方案 2：本地配置 flag
示例：
`conversation_mode.proactive_scheduler_debug_fail_next_poll=true`

优点：
1. 使用方式直观，便于人工复现实验步骤。

缺点：
1. 存在持久化风险，容易遗留到后续会话。
2. 更容易被误提交或误分享。
3. 需要额外配置加载与归一化边界，审计成本更高。

结论：不优先。

### 方案 3：测试环境 query/env flag
示例：
- query: `?proactive_fail_once=1`
- env: `TAFFY_PROACTIVE_FAIL_ONCE=1`

优点：
1. 对开发者较方便。

缺点：
1. 入口隐蔽，现场排查与审计成本高。
2. query/env 在多人协作时可追溯性较差。
3. 容易与其他调试参数叠加，增加误触风险。

结论：不优先。

## D. 推荐方案

推荐采用「DevTools-only debug bridge 一次性注入」。

建议行为：
1. 只影响下一次 polling check。
2. 注入后自动清除，不可持续生效。
3. 仅在 debug bridge 环境可调用。
4. 明确记录 debug event：
   - 注入已设置
   - 注入已消费
   - fail-closed 已触发

推荐接口草案：
- `injectProactiveSchedulerPollFailureOnce(reason = "manual_debug_injection")`
- `getProactiveSchedulerFailureInjectionState()`（只读）
- `clearProactiveSchedulerFailureInjection()`（手动撤销）

## E. 未来实现验收标准

1. 默认无新增行为。
2. 未调用 debug hook 时行为与当前版本完全一致。
3. 调用 hook 后，仅下一次 polling check 进入 fail-closed 路径：
   - `proactive_scheduler_poll_failed`
   - `proactive_scheduler_poll_stop`（timer active 时）
   - `proactivePollLastResult=failed`
4. hook 自动清除；再次注入必须手动调用。
5. 不引入截图/工具调用/文件读取路径。
6. 不引入 direct `requestAssistantReply` 新调用点。

## F. 明确不可接受方案

1. 暴露远程 HTTP API 来触发注入。
2. 默认开启注入开关。
3. 配置持久化后自动重复注入。
4. 注入逻辑绕过 scheduler/manual guard 链。
5. 注入时触发截图、工具调用、文件读取等高风险行为。

## G. 回滚策略

1. 删除 debug hook 代码可完全回滚该测试入口。
2. 关闭 debug bridge 可收口入口可见性。
3. 关闭任一三层开关（`enabled/proactive_enabled/proactive_scheduler_enabled`）可快速停用 proactive polling。

## H. 实施前人工确认清单

1. 该入口是否只在 DevTools/debug bridge 可见。
2. 是否确保页面刷新后注入状态清空。
3. 是否有单次消费机制。
4. 是否有可读 debug event 便于审计。
5. 是否保证默认配置行为不变。
