# Task 029: Conversational mode config skeleton

## 背景
- Task 028 已产出 `docs/conversational-mode-design.md`，定义了低打扰流动对话方向。
- 本任务属于 Phase 1：只补配置骨架和读取归一化，默认关闭，不改变现有行为。

## 目标
1. 新增 `conversation_mode` 配置骨架（样例和默认配置）。
2. 在前后端配置读取链路中接入保守默认值与归一化。
3. 仅“读取并存储配置”，不接入任何主动对话触发逻辑。

## 配置字段（Phase 1）
- `conversation_mode.enabled`：默认 `false`
- `conversation_mode.proactive_enabled`：默认 `false`
- `conversation_mode.max_followups_per_window`：默认 `1`
- `conversation_mode.silence_followup_min_ms`：默认 `180000`
- `conversation_mode.interrupt_tts_on_user_speech`：默认 `false`

## 范围
- `config.example.json`
- `config.py`
- `web/chat.js`
- `docs/conversational-mode-design.md`（landing notes）

## 严格约束
- 默认行为必须完全不变。
- 不实现 follow-up / proactive speech / silence_tick / backchannel / TTS interrupt。
- 不改 LLM prompt，不改 TTS/ASR/Live2D 行为。
- 不引入依赖，不加入桌面观察或工具调用。

## 验证
1. `python -m json.tool config.example.json`
2. `node --check web/chat.js`
3. `python -m py_compile config.py`
4. `git diff --check`
5. 静态确认：
   - 所有新配置默认关闭或保守
   - 没有新增主动发言触发路径
   - 没有改变聊天、TTS、ASR、Live2D 默认行为

## 验收标准
- `conversation_mode` 配置在样例、后端 sanitize、前端 loadConfig 三处可见。
- 默认值全为保守值，运行行为等价于当前版本。
