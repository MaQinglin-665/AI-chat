# Task 046: Proactive scheduler controlled integration checkpoint

## 背景
- Task 044 已提供 limited auto trigger smoke。
- Task 045 已强化 kill-switch 与 fail-closed 收口。
- 当前阶段不扩功能，优先沉淀可复用的联调与验收记录。

## 目标
1. 固化 Task 044/045 的受控联调步骤与观察点。
2. 让结论可复现、可回滚、可审计。
3. 在不改变默认安全配置前提下给出“通过/未通过”判定模板。

## 范围
- 文档更新：
  - `docs/conversational-followup-smoke-checklist.md`
  - `docs/proactive-scheduler-guard.md`
  - `docs/conversational-mode-design.md`
  - `docs/character-runtime-validation-log.md`
- 本任务默认不改运行代码；若发现问题，仅允许最小修复并须说明原因。

## 验收覆盖面
1. 默认关闭回归：
   - 任一关键开关关闭时 polling inactive、无自动主动发言、事件可解释。
2. 三层开关联调：
   - 可见 `poll_start`，`poll_blocked/poll_ready` 与配置条件一致。
   - 仅 `poll_ready` 后才尝试 trigger（沿 manual tick guard 路径）。
3. Kill-switch 运行时验证：
   - polling active 期间关闭任一关键开关后 timer 停用。
   - `pollLastResult=disabled`，并有 stop/blocked 原因事件。
   - 重开三层开关后可恢复 polling（仍受 guard）。
4. 异常 fail-closed：
   - 仅失败/stop 事件，不失控重试，不绕过 guard。
5. 安全边界复核：
   - skipDesktopAttach 路径仍生效。
   - 无 direct `requestAssistantReply` 新增调用点。
   - 无自动截图/工具调用/读文件新增路径。

## 输出要求
- 记录模板包含：
  - 配置条件
  - 执行步骤
  - 观察事件
  - 预期/实际结果
  - 结论与残余风险
- 结论必须明确：通过 / 未通过 / 部分通过。

## 校验命令
1. `git status --short --branch`
2. `node --check web/chat.js`
3. `python -m py_compile config.py`
4. `python -m json.tool config.example.json`
5. `git diff --check`
