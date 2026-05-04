# Task 040: Proactive scheduler config skeleton

## 背景
- Task 029~039 已完成 conversational follow-up 的配置、debug、manual 执行与 proactive 设计护栏文档。
- 当前仍未实现自动 proactive scheduler 触发。
- 在进入 scheduler 执行能力前，先补齐配置骨架与归一化，确保默认保守且可观测。

## 目标
1. 在 `conversation_mode` 下新增 proactive scheduler 配置字段，默认保守关闭/保守值。
2. 完成后端与前端的配置归一化和 clamp。
3. 让 debug snapshot 可见新字段，便于后续验证。
4. 不引入任何自动触发行为改动。

## 实施范围
- `config.example.json`
  - 新增：
    - `proactive_scheduler_enabled: false`
    - `proactive_cooldown_ms: 600000`
    - `proactive_warmup_ms: 120000`
    - `proactive_window_ms: 3600000`
- `config.py`
  - `DEFAULT_CONFIG.conversation_mode` 新增同名字段。
  - `sanitize_client_config()` 输出并归一化新字段。
  - 布尔门控：`proactive_scheduler_enabled` 仅 JSON `true` 生效。
  - 数值 clamp：
    - `proactive_cooldown_ms`: `60000..3600000`，默认 `600000`
    - `proactive_warmup_ms`: `30000..1800000`，默认 `120000`
    - `proactive_window_ms`: `600000..86400000`，默认 `3600000`
- `web/chat.js`
  - `state.conversationMode` 新增默认字段：
    - `proactiveSchedulerEnabled: false`
    - `proactiveCooldownMs: 600000`
    - `proactiveWarmupMs: 120000`
    - `proactiveWindowMs: 3600000`
  - `loadConfig()` 新增读取/归一化（布尔严格 `=== true`，数值同 clamp）。
  - `getTTSDebugSnapshot().conversationMode` 暴露新字段。
  - `buildConversationSilenceDebugSnapshot()` 增加只读 `proactiveSchedulerEnabled` 可见性。
- 文档
  - 更新 `docs/proactive-scheduler-guard.md`（Task 040 landing notes）
  - 更新 `docs/conversational-mode-design.md`（Task 040 landing notes）

## 非目标
- 不新增自动 proactive 触发
- 不新增 timer/listener/scheduler/tick
- 不新增 UI
- 不新增后端 API
- 不新增 `fetch`/`authFetch`/`requestAssistantReply`/`speak` 调用
- 不修改 desktop capture/tool calling/file access 默认行为

## 验证
1. `python -m json.tool config.example.json`
2. `python -m py_compile config.py`
3. `node --check web/chat.js`
4. `git diff --check`
5. 静态确认：
   - `proactive_scheduler_enabled` 默认 `false`
   - 非 JSON `true` 不会启用
   - 无新增 timer/listener/scheduler/tick 自动执行路径
   - `snapshot().conversationMode` 可见新字段
