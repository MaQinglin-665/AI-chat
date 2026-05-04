# Task 031: Open-loop follow-up planner skeleton

## 背景
- Task 028 完成了 conversational mode 方案设计。
- Task 029 完成了 `conversation_mode` 配置骨架（默认关闭）。
- Task 030 完成了 conversation mode debug snapshot 可见性。
- 本任务进入“最小行为前置阶段”：只做 follow-up planner 判定与记录，不触发主动发言。

## 目标
1. 增加最小 planner 状态：
   - `followupPending`
   - `followupReason`
   - `followupTopicHint`
   - `followupUpdatedAt`
2. 在 assistant 最终回复完成后，基于回复文本做保守 open-loop 判定：
   - 最后一句以问句结尾（`?` / `？`）
   - 或命中明确追问提示词（如“你觉得呢”“要不要”“要不要我继续”）
3. 判定结果仅写入 state/debug snapshot，不触发任何主动行为。
4. 当 `conversationMode.enabled !== true` 时，保持非 pending 并清空相关字段。

## 实施范围
- `web/chat.js`
  - 新增最小 helper：
    - `detectOpenLoopFollowup(text)`
    - `updateConversationFollowupState(assistantText)`
  - 在 assistant reply 最终收口（非 streaming delta）执行一次状态更新。
  - 在现有 debug snapshot 增加 follow-up 只读字段：
    - `pending`
    - `reason`
    - `topicHint`
    - `updatedAgeMs`
- `docs/conversational-mode-design.md`
  - 增加 Task 031 landing notes。

## 严格约束
- 不实现 proactive speech。
- 不实现 silence tick。
- 不实现 backchannel。
- 不实现 TTS interrupt 运行逻辑。
- 不触发主动 LLM 请求。
- 不改 LLM prompt。
- 不改 TTS/ASR/Live2D 行为。
- 不改后端。
- 不引入依赖。
- 不新增 UI、定时器、事件监听。

## 验证
1. `node --check web/chat.js`
2. `git diff --check`
3. 静态确认：
   - 无新增 fetch / LLM 请求
   - 无新增 speak/TTS 调用
   - 无新增 setInterval/setTimeout/requestAnimationFrame
   - 无新增 event listener
   - 默认 `conversationMode.enabled=false` 时不会 pending
4. 手动建议：
   - 默认配置聊天后：`window.__AI_CHAT_DEBUG_TTS__.snapshot().followup.pending` 应为 `false`
   - DevTools 临时设 `state.conversationMode.enabled = true`
   - 完成一轮带问句 assistant 回复后，`followup.pending` 应变为 `true`
