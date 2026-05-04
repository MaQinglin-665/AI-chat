# Task 030: Conversation mode debug visibility

## 背景
- Task 028 已完成 conversational mode 方案设计。
- Task 029 已完成 `conversation_mode` 配置骨架与归一化，默认关闭且不触发任何新行为。
- 在进入 follow-up / open-loop 实现前，需要先提供开发期可见性，确认配置被正确加载。

## 目标
1. 新建本任务文档，记录范围与验证。
2. 在现有前端 debug/diagnostics 输出中，暴露 `state.conversationMode` 的只读快照。
3. 暴露字段包括：
   - `enabled`
   - `proactiveEnabled`
   - `maxFollowupsPerWindow`
   - `silenceFollowupMinMs`
   - `interruptTtsOnUserSpeech`
4. 仅增加可见性，不接入任何行为逻辑。

## 实施范围
- `web/chat.js`：
  - 复用现有 TTS debug snapshot 路径（`getTTSDebugSnapshot()`）。
  - 增加 `conversationMode` 只读快照字段。
- `docs/conversational-mode-design.md`：
  - 追加 Task 030 landing notes。

## 非目标（严格）
- 不实现 follow-up。
- 不实现 proactive speech。
- 不实现 silence tick。
- 不实现 backchannel。
- 不实现用户语音打断 TTS 的运行逻辑。
- 不改 LLM prompt。
- 不改 TTS/ASR/Live2D 行为。
- 不改后端逻辑。
- 不新增 UI 面板。

## 验证
1. `node --check web/chat.js`
2. `git diff --check`
3. 静态确认：
   - 仅只读 `state.conversationMode`
   - 无新增定时器/事件监听/主动触发逻辑
   - 默认聊天/TTS/ASR/Live2D 行为不变
4. 手动建议：
   - 在 DevTools 执行 `window.__AI_CHAT_DEBUG_TTS__.snapshot()`
   - 检查返回中 `conversationMode` 字段存在，且默认值为：
     - `enabled=false`
     - `proactiveEnabled=false`
     - `maxFollowupsPerWindow=1`
     - `silenceFollowupMinMs=180000`
     - `interruptTtsOnUserSpeech=false`
