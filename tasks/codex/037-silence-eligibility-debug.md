# Task 037: Silence eligibility debug snapshot

## 背景
- Task 029~036 已完成 conversational follow-up 配置、planner、debug、manual execution 与文档化。
- 当前仍无自动 proactive 触发。
- 进入下一步前，需要先补“沉默窗口 eligibility”的只读可见性。

## 目标
1. 新建任务文档。
2. 在前端 debug snapshot/manual debug helper 中增加 silence 只读字段。
3. 增加相关时间戳记录（用户输入、assistant 回复、TTS 结束）。
4. 仅做可见性，不新增自动触发，不调用 LLM/TTS。

## 实施范围
- `web/chat.js`
  - 新增 state 字段：
    - `conversationLastUserAt`
    - `conversationLastAssistantAt`
    - `conversationLastTtsFinishedAt`
  - 在已有路径更新时间戳：
    - 用户消息进入 `requestAssistantReply` 时
    - assistant 最终回复落地时
    - TTS 完成路径（HTML audio/context 结束）时
  - 新增 helper：
    - `buildConversationSilenceDebugSnapshot(nowMs)`
    - `buildConversationFollowupDebugView(nowMs)`
  - 在 `__AI_CHAT_DEBUG_TTS__.snapshot()` 与 `conversationFollowup()` 返回中增加 `silence` 只读信息。
- `docs/conversational-mode-design.md`
  - 新增 Task 037 landing notes。

## 建议字段（已覆盖）
- `lastUserAgeMs`
- `lastAssistantAgeMs`
- `lastTtsFinishedAgeMs`
- `silenceFollowupMinMs`
- `silenceWindowReached`
- `conversationEnabled`
- `proactiveEnabled`
- `followupPending`
- `chatBusy`
- `speaking`
- `eligibleForSilenceFollowup`
- `blockedReasons`

## 非目标
- 不新增自动 proactive 触发
- 不新增 timer/listener
- 不调用 `requestAssistantReply` / `speak`
- 不新增后端 API
- 不改变聊天/TTS/ASR/Live2D 运行行为

## 验证
1. `node --check web/chat.js`
2. `git diff --check`
3. 静态确认：
   - 无新增 timer/listener/fetch/speak/requestAssistantReply 调用
   - silence eligibility 仅在 debug 输出可见
4. 手动建议：
   - 默认配置下 `snapshot().silence.eligibleForSilenceFollowup=false`
   - 开启 conversation/proactive 并构造 pending 后，窗口未到时应包含 `*_not_reached`
   - 过窗后 `eligibleForSilenceFollowup` 可变 true，但不会自动触发回复
