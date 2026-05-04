# Task 035: Follow-up execution guard polish

## 背景
- Task 034 已完成 manual-only follow-up execution。
- 现状问题：执行前会消费 pending；若请求失败，可能导致待续话状态丢失。

## 目标
1. 新建任务文档。
2. 强化执行 guard：
   - 执行前保存 pending 快照
   - 请求失败时恢复 pending
   - 请求成功时保持 pending 已消费
3. 扩展 debug 返回字段：
   - `restoredPending`
   - `consumedPending`
   - `endedAt`
   - `elapsedMs`
4. 增加 debug events：
   - `conversation_followup_not_eligible`
   - `conversation_followup_start`
   - `conversation_followup_success`
   - `conversation_followup_failed`
   - `conversation_followup_restore_pending`
5. 保持入口名不变：
   - `window.__AI_CHAT_DEBUG_TTS__.runConversationFollowup()`

## 实施范围
- `web/chat.js`
  - 新增 `snapshotConversationFollowupPending()`
  - 新增 `restoreConversationFollowupPending(snapshot)`
  - 改造 `runConversationFollowupDebug()` 增加失败恢复与详细返回字段
  - 复用 `recordTTSDebugEvent` 记录关键阶段
- `docs/conversational-mode-design.md`
  - 新增 Task 035 landing notes

## 严格约束
- 不新增自动触发（silence_tick/proactive loop）
- 不新增 timer/listener/UI
- 不绕过 eligibility guard
- 不新增后端 API
- 不改 LLM prompt 全局规则
- 不改 TTS/ASR/Live2D 行为

## 验证
1. `node --check web/chat.js`
2. `git diff --check`
3. 静态确认：
   - 不 eligible 时不发请求
   - 请求失败会恢复 pending（含原 `updatedAt`）
   - 请求成功会消费 pending
   - 仅 manual debug 入口触发执行
4. 手动建议：
   - 默认配置调用应返回 not_eligible 且记录对应 debug event
   - eligible 成功后 pending 被消费
   - 模拟失败后 pending 被恢复
