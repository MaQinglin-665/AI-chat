# Task 043: Disabled-by-default proactive scheduler polling skeleton

## 背景
- Task 040：已落地 proactive scheduler 配置骨架。
- Task 041：已落地 scheduler state + debug snapshot。
- Task 042：已落地 DevTools-only manual scheduler tick。
- 当前仍无自动 polling/timer。

## 目标
1. 新增 disabled-by-default 的 proactive scheduler polling lifecycle skeleton。
2. polling 仅做 scheduler/silence 可见性检查与 debug event。
3. 不执行 follow-up，不调用 LLM/TTS 执行路径。

## 实施范围
- `config.example.json`
  - `conversation_mode` 新增：
    - `proactive_poll_interval_ms: 60000`
- `config.py`
  - `DEFAULT_CONFIG["conversation_mode"]` 新增同名字段。
  - `sanitize_client_config()` 输出并 clamp：
    - `30000..600000`，默认 `60000`
- `web/chat.js`
  - `state.conversationMode` 新增：
    - `proactivePollIntervalMs`
  - state 新增 polling lifecycle 字段：
    - `proactivePollTimerId`
    - `proactiveLastPollAt`
    - `proactivePollActive`
    - `proactivePollLastResult`
    - `proactivePollActiveIntervalMs`
  - 新增 helper：
    - `shouldEnableProactiveSchedulerPolling()`
    - `startProactiveSchedulerPolling()`
    - `stopProactiveSchedulerPolling(reason)`
    - `syncProactiveSchedulerPolling()`
    - `runProactiveSchedulerPollingCheck()`
  - `loadConfig()` 后调用 `syncProactiveSchedulerPolling()`。
  - `beforeunload` 增加 stop cleanup。
  - snapshot 可见性新增：
    - `pollingEnabled`
    - `pollIntervalMs`
    - `pollTimerActive`
    - `lastPollAgeMs`
    - `pollLastResult`
  - poll check 只记录事件：
    - `proactive_scheduler_poll_start`
    - `proactive_scheduler_poll_stop`
    - `proactive_scheduler_poll_blocked`
    - `proactive_scheduler_poll_ready`

## 非目标
- 不新增自动 proactive follow-up 触发
- 不调用 `runConversationSilenceFollowupDryRun`
- 不调用 `runConversationFollowupDebug`
- 不调用 `runProactiveSchedulerManualTick`
- 不调用 `requestAssistantReply` / `speak` / `fetch` / `authFetch`
- 不新增后端 API / UI
- 不改变 desktop capture / tool calling / file access 默认

## 验证
1. `python -m json.tool config.example.json`
2. `python -m py_compile config.py`
3. `node --check web/chat.js`
4. `git diff --check`
5. 静态确认：
   - 默认 `proactive_poll_interval_ms=60000`
   - clamp 为 `30000..600000`
   - 默认配置下 polling disabled，timer inactive
   - `setInterval` 仅在 `startProactiveSchedulerPolling`（受 gate 控制）
   - polling check 不调用任何 follow-up 执行函数
