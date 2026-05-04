# Task 033: Manual follow-up prompt draft

## 背景
- Task 029 完成 `conversation_mode` 配置骨架（默认关闭）。
- Task 030 完成 conversation mode debug snapshot。
- Task 031 完成 open-loop follow-up planner skeleton（只记录 pending）。
- Task 032 完成 manual debug trigger（只返回 eligible plan）。
- 本任务继续保持安全节奏：仅生成 manual-only follow-up prompt draft，不触发任何执行行为。

## 目标
1. 新建任务文档。
2. 扩展 `window.__AI_CHAT_DEBUG_TTS__.conversationFollowup()` 返回：
   - `promptDraft`
3. draft 仅基于现有 planner state 构造，不调用 LLM。
4. 仅当 `eligible=true` 时返回非空 `promptDraft`，否则返回空字符串。
5. draft 文本保持低打扰、可忽略、短输出导向，且明确：
   - 不读取桌面/文件/隐私数据
   - 不调用工具
   - 不做长篇解释

## 实施范围
- `web/chat.js`
  - 新增 helper：`buildConversationFollowupPromptDraft(plan)`
  - 在 `conversationFollowup()` 结果对象注入 `promptDraft`
- `docs/conversational-mode-design.md`
  - 新增 Task 033 landing notes

## 严格约束
- 不实现自动 proactive speech
- 不实现 silence_tick 自动触发
- 不实现 backchannel
- 不实现 TTS interrupt
- 不触发主动 LLM 请求
- 不调用 fetch/authFetch
- 不调用 speak/TTS
- 不改正式 LLM prompt
- 不改 TTS/ASR/Live2D 行为
- 不改后端
- 不引入依赖
- 不新增 UI/定时器/事件监听

## 验证
1. `node --check web/chat.js`
2. `git diff --check`
3. 静态确认：
   - 无新增 fetch/authFetch/LLM 请求
   - 无新增 speak/TTS 调用
   - 无新增 timer/listener
   - 正式 prompt 构造链路未变
4. 手动建议：
   - 默认配置下：`conversationFollowup()` 返回 `eligible=false` 且 `promptDraft=""`
   - 手动构造 eligible 条件后：返回非空 `promptDraft`
   - `promptDraft` 应短、克制，不含桌面观察或工具调用要求
