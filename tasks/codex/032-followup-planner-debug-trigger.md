# Task 032: Follow-up planner manual debug trigger

## 背景
- Task 028 完成 conversational mode 设计文档。
- Task 029 完成 `conversation_mode` 配置骨架（默认关闭）。
- Task 030 完成 conversation mode debug snapshot 可见性。
- Task 031 完成 open-loop follow-up planner skeleton（仅记录 pending/reason/topicHint）。
- 本任务继续保持保守节奏：只增加 DevTools 手动 debug trigger，不触发任何主动行为。

## 目标
1. 新建本任务文档。
2. 在现有 `window.__AI_CHAT_DEBUG_TTS__` 增加手动方法：
   - `conversationFollowup()`
3. 该方法只返回计划对象，不触发行为，字段包括：
   - `eligible`
   - `reason`
   - `topicHint`
   - `updatedAgeMs`
   - `conversationEnabled`
   - `proactiveEnabled`
   - `silenceFollowupMinMs`
   - `blockedReasons`
4. eligibility 保守规则：
   - `conversationMode.enabled === true`
   - `conversationMode.proactiveEnabled === true`
   - `followupPending === true`
   - `topicHint` 非空
   - 非 `chatBusy`
   - 非 `speaking`
   - `updatedAgeMs >= silenceFollowupMinMs`

## 实施范围
- `web/chat.js`
  - 新增只读 helper：`buildConversationFollowupDebugPlan(nowMs)`
  - 在 `installTTSDebugBridge()` 增加 `conversationFollowup` 导出
- `docs/conversational-mode-design.md`
  - 增加 Task 032 landing notes

## 严格约束
- 不实现 proactive speech
- 不实现 silence_tick
- 不实现 backchannel
- 不实现 TTS interrupt
- 不触发主动 LLM 请求
- 不改 LLM prompt
- 不改 TTS/ASR/Live2D 行为
- 不改后端
- 不引入依赖
- 不新增 UI
- 不新增定时器
- 不新增事件监听

## 验证
1. `node --check web/chat.js`
2. `git diff --check`
3. 静态确认：
   - 无新增 fetch/authFetch/LLM 请求
   - 无新增 speak/TTS 调用
   - 无新增 setInterval/setTimeout/requestAnimationFrame
   - 无新增 event listener
   - debug 方法只读 state，不修改状态
4. 手动建议：
   - 默认调用 `window.__AI_CHAT_DEBUG_TTS__.conversationFollowup()` 应 `eligible=false`，并包含 `conversation_disabled`、`proactive_disabled`
   - DevTools 临时设置：
     - `state.conversationMode.enabled = true`
     - `state.conversationMode.proactiveEnabled = true`
     - `state.followupPending = true`
     - `state.followupTopicHint = "测试话题"`
     - `state.followupUpdatedAt = Date.now() - state.conversationMode.silenceFollowupMinMs - 1000`
   - 再调用应返回 `eligible=true`
