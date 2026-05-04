# Task 050: Proactive scheduler DevTools event timeline capture

## 背景

- Task 049 已完成真实 Electron 启动验证，但运行态 DevTools 事件时间线仍未补齐。
- 本任务目标是补齐以下两条运行态证据，或如实记录阻塞：
  - kill-switch runtime event timeline
  - exception fail-closed runtime event timeline

## 执行元信息

- Date: 2026-05-04
- Tester: Codex
- Branch: `codex/proactive-scheduler-polling-skeleton`
- Baseline commit: `21a0b2a`
- OS: Windows
- Node: `v25.2.1`
- Python: `3.11.9`

## A. 基线检查

- `git status --short --branch` -> pass
- `git log --oneline -n 5` -> pass
- `node --check web/chat.js` -> pass
- `python -m py_compile config.py` -> pass
- `python -m json.tool config.example.json` -> pass
- `git diff --check` -> pass

## B. Electron 启动

操作：
1. 执行 `npm run start:electron`
2. 执行 `Get-Process -Name electron`

结果：
- Electron 启动命令执行成功。
- 进程列表可见多个 `electron` 进程。
- 结论：`Electron startup = pass`。

## C. DevTools Console 采集状态

目标采集命令：
- `window.__AI_CHAT_DEBUG_TTS__.snapshot().proactiveScheduler`
- `window.__AI_CHAT_DEBUG_TTS__.events()`

本次结果：
- 当前终端自动化环境可启动 Electron，但无法直接控制桌面窗口内的 DevTools Console 输入/读取。
- 本项目当前也未提供可直接复用的无依赖 DevTools 远程采集通道（本任务约束也不允许新增依赖）。
- 因此本次未能自动化拿到实时 Console 时间线，不伪造结果。

结论：`DevTools runtime capture = partial`。

## D. Kill-switch 运行态时间线（补录状态）

目标：
- 在三层开关开启且 polling active 后，关闭任一关键开关并记录：
  - snapshot: `pollTimerActive` / `pollLastResult` / `pollingEnabled` / `blockedReasons`
  - events: `proactive_scheduler_poll_stop` / `proactive_scheduler_poll_blocked`

本次结果：
- 因 C 阶段 DevTools 交互阻塞，本次未采集到运行态事件时间线。
- 静态路径仍可复核为存在（见 Task 047/048/049）。

结论：`kill-switch runtime timeline = partial`。

## E. Exception fail-closed 运行态时间线（补录状态）

目标：
- 通过 DevTools 临时方式构造异常（不提交代码）并记录：
  - events: `proactive_scheduler_poll_failed` / `proactive_scheduler_poll_stop`（如出现）
- 同时确认：无失控重试、无绕过 guard、无自动截图/工具调用/读文件。

本次结果：
- 因 C 阶段 DevTools 交互阻塞，本次未执行运行态异常注入与事件采集。
- 静态 fail-closed 分支仍可复核为存在（见 Task 047/048/049）。

结论：`exception fail-closed timeline = partial`。

## Overall Result

Overall result: partial

- Task 049 的 residual risk 本次尚未关闭。
- 改善点：确认了在当前基线下 Electron 可真实启动；未引入任何新的不安全能力路径。

## Residual Risks

- 仍缺少同机同会话的 DevTools 运行态事件时间线证据（Kill-switch / exception 两组）。

## Rollback Suggestion

1. 发现异常时优先关闭任一关键开关：
   - `conversation_mode.enabled=false`
   - `conversation_mode.proactive_enabled=false`
   - `conversation_mode.proactive_scheduler_enabled=false`
2. 必要时回退到 Task 043 的 polling-only 行为。
3. 保持 fail-closed 默认策略。

## 人工补录步骤（下一轮）

1. 在本机桌面打开 chat window DevTools Console。
2. 先执行：
   - `window.__AI_CHAT_DEBUG_TTS__.snapshot().proactiveScheduler`
   - `window.__AI_CHAT_DEBUG_TTS__.events()`
3. 打开三层开关并确认 `pollTimerActive=true`。
4. 执行 kill-switch：关闭任一开关并 reload/sync，记录：
   - snapshot 字段与 `proactive_scheduler_poll_stop`、`proactive_scheduler_poll_blocked` 事件顺序。
5. 执行异常注入（仅 DevTools 临时 patch，不改仓库代码），记录：
   - `proactive_scheduler_poll_failed`（以及 `poll_stop` 如出现）事件顺序。
6. 把实际时间线落库到 `docs/character-runtime-validation-log.md`，再评估是否可从 `partial` 升为 `pass`。
