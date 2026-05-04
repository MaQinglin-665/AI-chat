# Task 044: Limited auto trigger smoke for proactive scheduler

## 背景
- Task 040：配置骨架已落地（默认关闭）。
- Task 041：scheduler state + debug snapshot 已落地。
- Task 042：manual scheduler tick 已可复用 guard 路径。
- Task 043：polling skeleton 已落地（默认不启动、仅 check）。

## 目标
1. 在 polling 中增加 limited auto trigger smoke。
2. 仅在 `poll_ready` 时尝试触发。
3. 必须复用 `runProactiveSchedulerManualTick()` guard 路径。
4. 保持 fail closed 与默认关闭。

## 实施范围
- `web/chat.js`
  - 调整 `runProactiveSchedulerPollingCheck()`：
    - scheduler gate blocked：维持 blocked 事件与结果。
    - silence not ready：维持 blocked 事件与结果。
    - 仅在 `poll_ready` 时：
      - 调用 `runProactiveSchedulerManualTick()`
      - 成功记录 `proactive_scheduler_poll_trigger_success`
      - blocked 记录 `proactive_scheduler_poll_trigger_blocked`
    - 异常记录 `proactive_scheduler_poll_failed`，并 fail closed。
- 文档
  - `docs/proactive-scheduler-guard.md` 追加 Task 044 landing notes
  - `docs/conversational-mode-design.md` 追加 Task 044 landing notes
  - `docs/conversational-followup-smoke-checklist.md` 增补 Task 044 手测项

## 非目标
- 不修改默认开关行为（默认仍关闭）
- 不新增后端 API / UI
- 不新增依赖
- 不直接调用 `requestAssistantReply`
- 不新增桌面截图/工具调用/文件读取默认行为

## 验证
1. `node --check web/chat.js`
2. `python -m py_compile config.py`
3. `python -m json.tool config.example.json`
4. `git diff --check`
5. `git status --short --branch`
6. 静态确认：
   - 默认配置仍 fail closed
   - 仅 `poll_ready` 进入 manual tick guard 路径
   - blocked/异常路径不触发主动发言
