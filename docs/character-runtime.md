# Character Runtime Skeleton

## 目标

`Character Runtime` 是一个独立骨架模块，用于统一调度角色在一次对话中的状态变化与动作指令。

本版本仅提供最小可测试结构，**不接入主流程**（不改 `app.py`/前端/Electron 路径）。

## 当前能力

- 事件输入模型：`RuntimeEvent`
- 指令输出模型：`RuntimeDirective`
- 角色状态快照：`CharacterState`
- 运行时调度器：`CharacterRuntime`
- 输入安全归一化：`normalize_runtime_payload`
- 情绪归一化：`normalize_emotion`
- 情绪到 Live2D hint 映射：`emotion_to_live2d_hint`

## 事件与状态

支持事件：

- `user_message`
- `assistant_reply`
- `tts_finished`
- `emotion_hint`
- `tick`（内部空闲轮询）

主要状态字段：

- `phase`: `idle` / `thinking` / `speaking`
- `emotion`: 标准情绪值（未知值回退 `neutral`）
- `voice_style`: 语音风格
- `motion_state`: `idle` / `listening` / `talking`
- `next_proactive_at`: 主动互动冷却门控时间戳

## 低打扰策略

- `low_interruption=True` 时，`tick` 不会触发主动互动指令。
- `low_interruption=False` 时，只有在 `idle` 且冷却到期后才会发出 `initiative/proactive_checkin`。

## 输入归一化规则

`normalize_runtime_payload` 支持：

- 普通文本字符串
- JSON 字符串（仅 object）
- `dict`
- 空输入 / 损坏 JSON 的安全兜底

兜底结果固定为：

```json
{
  "text": "",
  "emotion": "neutral",
  "voice_style": "neutral"
}
```

## 验证

运行：

```bash
python -m pytest tests/test_character_runtime.py -q
```

预期：全部通过。
