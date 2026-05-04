# Task 045: Proactive scheduler kill-switch smoke checks

## 背景
- Task 044 已落地 limited auto trigger smoke。
- 需要进一步验证“运行中紧急停用”的可控性，确保安全收口。

## 目标
1. 强化 polling 的 kill-switch 行为：任一关键开关关闭后快速停用。
2. 提升可观测性：stop/blocked 原因可诊断。
3. 异常路径 fail closed，不进入失控重试。

## 实施范围
- `web/chat.js`
  - 增加 polling gate 状态 helper（含 blockedReasons）。
  - `runProactiveSchedulerPollingCheck()` 在运行时 gate 失效时即时 stop 并记录原因。
  - `start/sync` 在 gate 不满足时记录 blocked 原因并确保 stop。
  - 异常路径 stop timer（fail closed）并记录失败事件。
  - `stop` 事件仅在活跃 timer 或 beforeunload 时写入，减少噪声。
- 文档
  - `docs/proactive-scheduler-guard.md` 追加 Task 045 Landing Notes
  - `docs/conversational-mode-design.md` 追加 Task 045 Landing Notes
  - `docs/conversational-followup-smoke-checklist.md` 增补 Task 045 kill-switch 手测步骤

## 非目标
- 不新增依赖
- 不新增 UI / 后端 API
- 不改变默认开关（默认仍关闭）
- 不新增截图/工具调用/文件读取路径
- 不绕过 manual/scheduler guard 直接触发回复

## 验证
1. `git status --short --branch`
2. `node --check web/chat.js`
3. `python -m py_compile config.py`
4. `python -m json.tool config.example.json`
5. `git diff --check`
6. 手测：
   - 运行中关闭任一关键开关 -> polling timer 停止 + 可诊断 stop/blocked 事件
   - 重新开启开关 -> polling 可恢复（受 guard）
   - 异常路径仅失败事件，不失控重试
