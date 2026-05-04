# Task 038: Manual silence follow-up dry-run

## 背景
- Task 029~037 已完成 follow-up 的配置、planner、manual execution、guard 与 silence debug 可见性。
- 当前仍无自动 proactive 触发。

## 目标
1. 新增 DevTools-only 手动入口：
   - `window.__AI_CHAT_DEBUG_TTS__.dryRunSilenceFollowup()`
2. 验证路径：
   - silence eligible 为 false 时：仅返回 blocked，不执行 follow-up
   - silence eligible 为 true 时：复用现有 `runConversationFollowupDebug()` 执行
3. 不引入任何自动触发/定时器/监听器/UI/后端改动。

## 实施范围
- `web/chat.js`
  - 新增 `runConversationSilenceFollowupDryRun()`
  - 在 `__AI_CHAT_DEBUG_TTS__` 导出 `dryRunSilenceFollowup`
  - blocked 事件：`conversation_silence_followup_blocked`
  - start 事件：`conversation_silence_followup_manual_start`
- `docs/conversational-mode-design.md`
  - 新增 Task 038 landing notes
- `docs/conversational-followup-smoke-checklist.md`
  - 增加 dry-run 手测步骤

## 非目标
- 不新增自动 proactive 触发
- 不新增 timer/listener/UI
- 不新增后端 API
- 不直接调用 `requestAssistantReply`（仅复用 `runConversationFollowupDebug`）

## 验证
1. `node --check web/chat.js`
2. `git diff --check`
3. 静态确认：
   - blocked 时不执行 follow-up
   - eligible 时复用 `runConversationFollowupDebug()`
   - 无新增 timer/listener/fetch/speak/requestAssistantReply 直接调用
4. 手测建议：
   - 默认配置下 `await dryRunSilenceFollowup()` 返回 `ok=false, reason="silence_not_eligible"`
   - 窗口未到时 blocked 且 events 含 `conversation_silence_followup_blocked`
   - 达到窗口后返回结果包含 `silenceDryRun=true`、`silenceEligibleAtStart=true`
