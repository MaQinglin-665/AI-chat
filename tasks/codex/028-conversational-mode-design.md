# Task 028: Conversational mode design for low-interruption AI pet

## 背景
- 当前对话主链路偏单轮：用户输入 -> LLM 回复 -> TTS 播放 -> 结束。
- 项目方向希望逐步走向更自然的“桌面陪伴式流动对话”。
- 参考方向可借鉴 AI VTuber 交互节奏，但不做克隆/复刻叙述。

## 目标
1. 产出 `docs/conversational-mode-design.md`，定义从单轮问答到低打扰持续对话的设计方案。
2. 明确状态机、事件源、主动发言约束、语音策略、Live2D 联动边界。
3. 给出分阶段落地路线与验证方法，确保可执行、可回滚。

## 范围
- 新增 `tasks/codex/028-conversational-mode-design.md`
- 新增 `docs/conversational-mode-design.md`
- 仅文档，不修改代码

## 约束
- 不修改代码
- 不改后端
- 不改 TTS/ASR 行为
- 不改 Live2D 行为
- 不引入依赖
- 不加入桌面观察
- 不加入工具调用
- 文档语气保持现实、克制、可开源协作

## 必须覆盖
- 当前 chat/TTS/Live2D 对话链路现状
- 当前“一问一答”限制
- 目标体验：持续对话、短回应、追问、低打扰主动发言、语音打断/续话
- 对话状态机：
  - `idle`
  - `listening`
  - `thinking`
  - `speaking`
  - `followup_pending`
  - `ambient_ready`
  - `cooldown`
- 事件来源：
  - `user_message`
  - `assistant_reply`
  - `tts_started`
  - `tts_finished`
  - `silence_tick`
  - `open_loop_detected`
  - `emotion_signal`
- 主动发言策略约束（低频、可关闭、有冷却、无隐私默认读取）
- 语音模式策略（短回应/backchannel、打断降级、避免连续长篇自说自话）
- Live2D 联动边界（仅设计，不修改现有 expression/action bridge）
- 配置建议：
  - `conversation_mode.enabled`
  - `proactive_enabled`
  - `max_followups_per_window`
  - `silence_followup_min_ms`
  - `interrupt_tts_on_user_speech`
- 分阶段落地路线（Phase 1~4）
- 验证方式与风险

## 验证方式
- 文档审阅：
  - 是否覆盖全部必需主题
  - 是否明确“本任务不改行为”
  - 是否满足低打扰、安全默认、可关闭策略

## 验收标准
- 文档可直接作为后续任务拆解依据
- 对状态机与事件源定义清晰
- 对主动发言和语音打断策略具备明确边界与风控约束
