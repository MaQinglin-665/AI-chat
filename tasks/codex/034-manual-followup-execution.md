# Task 034: Manual-only conversation follow-up execution

## 背景
- Task 029~033 已完成配置、可见性、planner、debug trigger 与 draft。
- 本任务进入第一个真实执行能力，但限定为 DevTools manual-only，不自动触发。

## 目标
1. 新建任务文档。
2. 在 `window.__AI_CHAT_DEBUG_TTS__` 增加：
   - `runConversationFollowup()`
3. 执行规则：
   - 先计算 plan（含 `promptDraft`）
   - 仅当 `eligible=true` 且 `promptDraft` 非空才执行
   - 否则返回 `{ ok:false, reason:"not_eligible", plan }`
4. eligible 时复用现有聊天入口 `requestAssistantReply`，不新增请求链路。
5. follow-up 输入标记为 debug/manual，不伪装真实用户输入。
6. 执行前消费当前 pending，避免同一条被重复手动触发。
7. 返回结果对象：
   - `ok`
   - `reason`
   - `plan`
   - `startedAt`

## 实施范围
- `web/chat.js`
  - 新增 `clearConversationFollowupPending(nowMs)`
  - 新增 `runConversationFollowupDebug()`
  - 在 `installTTSDebugBridge()` 暴露 `runConversationFollowup`
- `docs/conversational-mode-design.md`
  - 新增 Task 034 landing notes

## 严格约束
- 不实现 silence_tick 自动触发
- 不新增定时器
- 不新增事件监听
- 不新增 UI
- 不绕过 `conversationMode.enabled` / `proactiveEnabled`
- 不在不 eligible 时发请求
- 不新增后端 API
- 不改后端
- 不改全局 LLM prompt
- 不改 TTS/ASR/Live2D 行为

## 验证
1. `node --check web/chat.js`
2. `git diff --check`
3. 静态确认：
   - 只有 `runConversationFollowup()` 会触发执行
   - 无新增 timer/listener
   - 不 eligible 不发请求
   - 无新增后端接口
4. 手动建议：
   - 默认配置下：`runConversationFollowup()` 返回 `not_eligible`
   - 构造 eligible 条件后：只触发一次 follow-up
   - 再次调用：应因 pending 已清理而不重复同一条
