# Conversational Follow-up Manual Smoke Checklist

适用范围：Task 031~035 之后的 manual follow-up 链路回归。  
目标：验证 planner/debug/manual execution/guard 在不引入自动 proactive 的前提下可用且安全。

## 1. 前置条件

1. 工作区干净：`git status --short` 无未提交代码改动（文档草稿除外）。
2. 应用可启动，chatWindow 可打开 DevTools Console。
3. 明确当前测试模式：manual-only，不应存在自动 follow-up 循环。
4. 测试配置建议：
   - 默认回归先测 `conversation_mode.enabled=false`、`proactive_enabled=false`
   - 再切换到可触发配置（见第 3 节）
5. 安全注意：
   - manual follow-up 不应自动截图
   - 不应自动循环连续触发

## 2. 默认禁用验证

在 DevTools Console 执行：

```js
window.__AI_CHAT_DEBUG_TTS__.conversationFollowup()
window.__AI_CHAT_DEBUG_TTS__.runConversationFollowup()
```

期望：
1. `conversationFollowup()`：`eligible=false`
2. `runConversationFollowup()`：`ok=false`、`reason="not_eligible"`
3. `blockedReasons` 包含禁用类原因（通常含 `conversation_disabled`、`proactive_disabled`）

## 3. 构造 pending / eligible

优先方式（推荐）：
1. 通过自然对话让 assistant 输出未收口问句（question-tail / open-loop）
2. 再执行 `conversationFollowup()` 查看：
   - `pending` 相关状态成立
   - `topicHint` 非空
   - `promptDraft` 非空（若 eligible）

可选方式（仅调试）：
```js
state.conversationMode.enabled = true
state.conversationMode.proactiveEnabled = true
state.followupPending = true
state.followupReason = "question_tail"
state.followupTopicHint = "测试话题"
state.followupUpdatedAt = Date.now() - state.conversationMode.silenceFollowupMinMs - 1000
window.__AI_CHAT_DEBUG_TTS__.conversationFollowup()
```

期望：
1. `eligible=true`
2. `blockedReasons=[]`
3. `promptDraft` 为短、克制、可忽略的续话 seed

## 4. 成功执行验证

执行：

```js
await window.__AI_CHAT_DEBUG_TTS__.runConversationFollowup()
```

期望：
1. `ok=true`
2. `consumedPending=true`
3. `restoredPending=false`
4. 返回包含 `startedAt`、`endedAt`、`elapsedMs`
5. 再次执行不应重复触发同一条 pending（通常会变为 `not_eligible`）

## 5. 失败恢复验证

可通过临时断网/后端不可用/使请求失败来验证。

执行：

```js
await window.__AI_CHAT_DEBUG_TTS__.runConversationFollowup()
```

期望：
1. `ok=false`
2. `reason` 为失败类（如 `request_failed` / `request_exception`）
3. `restoredPending=true`
4. pending 状态恢复（含原 `updatedAt`）

## 6. 隐私与安全验证

检查点：
1. 即使 `promptDraft` 包含“桌面/屏幕/截图”等词，manual follow-up 也不应触发 desktop capture。
2. 不应出现额外工具调用、文件读取、shell 执行。
3. 不应引入自动 proactive 循环。

## 7. Debug Events 验证

执行：

```js
window.__AI_CHAT_DEBUG_TTS__.events().slice(-30)
```

检查是否出现：
1. `conversation_followup_not_eligible`
2. `conversation_followup_start`
3. `conversation_followup_success`
4. `conversation_followup_failed`
5. `conversation_followup_restore_pending`

说明：事件里不应塞入完整长 prompt，重点看 reason/topicHint 摘要与阶段是否正确。

## 8. 回归记录模板

```md
日期：
分支：
Commit：
测试配置：
- conversation_mode.enabled:
- conversation_mode.proactive_enabled:
- 其他关键开关：

测试结果：
1. 默认禁用验证：
2. eligible 构造：
3. 成功执行：
4. 失败恢复：
5. 安全检查（不截图/不工具调用）：
6. debug events：

异常备注：
```
