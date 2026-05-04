# Task 049: Proactive scheduler runtime event capture (Electron/DevTools manual run)

## 背景

- Task 047 已完成静态联调审计，但结论为 `partial`。
- 残余风险是缺少 Electron/DevTools 运行态事件时间线证据：
  - Kill-switch 运行时 stop/blocked 时间线
  - 异常 fail-closed 时间线

## 本次执行目标

- 在不扩功能、不改默认安全配置的前提下，执行一次真实运行态补录。
- 优先记录可复现步骤、实际观察结果、阻塞点与回滚建议。

## 执行元信息

- Date: 2026-05-04
- Tester: Codex
- Branch: `codex/proactive-scheduler-polling-skeleton`
- Commit: `2cf51bd`
- OS: Windows
- Node: `v25.2.1`
- Python: `3.11.9`

## 基线检查

- `git status --short --branch` -> pass
- `git log --oneline -n 5` -> pass
- `node --check web/chat.js` -> pass
- `python -m py_compile config.py` -> pass
- `python -m json.tool config.example.json` -> pass
- `git diff --check` -> pass

## 运行态执行与观察

### B. 启动方式与 Electron 状态

操作步骤：
1. 读取 `package.json`，确认启动脚本为 `npm run start:electron`。
2. 执行 `npm run start:electron`。
3. 执行 `Get-Process -Name electron` 确认进程存在。

观察结果：
- 启动命令成功返回并拉起 Electron 进程。
- 进程列表可见多个 `electron` 子进程，确认“真实启动 Electron”成立。

结论：
- `Electron startup`: **pass**

### C. DevTools 事件采集（snapshot/events）

目标：
- 在 `chatWindow` DevTools Console 采集：
  - `window.__AI_CHAT_DEBUG_TTS__.snapshot().proactiveScheduler`
  - `window.__AI_CHAT_DEBUG_TTS__.events()`

本次实际：
- 当前执行环境可拉起应用进程，但缺少可脚本化的 DevTools 交互通道（无 `gh`/Playwright/CDP 现成通道，且本任务不新增依赖）。
- 因此无法在本次自动化回合内直接读取 Console 运行时值并落盘事件时间线。

结论：
- `DevTools runtime event capture`: **partial**

### D. Kill-switch 运行时补录

目标：
- 三层开关全开且 polling active 时，关闭任一关键开关并记录：
  - snapshot 字段（`pollTimerActive` / `pollLastResult` / `pollingEnabled` / `blockedReasons`）
  - 事件（`proactive_scheduler_poll_stop` / `proactive_scheduler_poll_blocked`）

本次实际：
- 因 C 阶段 DevTools 交互受限，无法完成“运行态开关切换 + 事件时间线”实测采集。
- 仅完成静态路径复核（事件名、分支逻辑、fail-closed stop 路径在代码中存在）。

结论：
- `Kill-switch runtime timeline`: **partial**

### E. 异常 fail-closed 运行时补录

目标：
- 在安全 debug 入口构造异常后，记录：
  - `proactive_scheduler_poll_failed`
  - `proactive_scheduler_poll_stop`（如适用）
- 同时确认：无失控重试、无绕过 guard、无自动截图/工具调用/读文件。

本次实际：
- 由于 DevTools 交互受限，本次未执行运行态异常注入。
- 仅完成静态路径复核：`poll_exception_fail_closed` stop 分支与 `proactive_scheduler_poll_failed` 事件上报码路径存在。

结论：
- `Fail-closed runtime timeline`: **partial**

## 安全边界复核（本次）

- 未修改默认安全配置。
- 未新增自动截图路径。
- 未新增自动工具调用路径。
- 未新增自动读用户文件路径。
- 未进行任何强推或历史重写。

## Overall Result

Overall result: **partial**

原因：
- 已完成真实 Electron 启动验证与全部基线命令校验。
- 但未能在当前自动化终端环境中直接执行 DevTools Console 操作，故 C/D 运行态事件时间线仍待人工补录。

## Residual Risks

- Kill-switch 与异常 fail-closed 的“真实运行态事件顺序证据”仍未在同一次会话中完整落库。

## Rollback Suggestion

1. 发现异常时，优先关闭任一关键开关：
   - `conversation_mode.enabled=false`
   - `conversation_mode.proactive_enabled=false`
   - `conversation_mode.proactive_scheduler_enabled=false`
2. 若需整体回退，回退到 Task 043 polling skeleton（无 limited auto trigger）基线。
3. 保持 fail-closed 默认策略。

## 后续人工补录建议（同机同会话）

1. 使用本机桌面打开 `chatWindow` DevTools。
2. 按 Task 046/047 模板依次执行 C/D 两组操作。
3. 记录关键字段与事件时间线后，更新 `docs/character-runtime-validation-log.md` 并将 Task 047/049 结论升格为 `pass`（若全部满足）。
