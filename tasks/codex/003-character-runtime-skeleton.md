# Task 003: Character Runtime Skeleton

## 背景

项目需要一个“角色运行时”层，把文本回复、情绪、语音风格、动作提示统一成可调度状态机。

该任务目标是先搭最小骨架，避免直接耦合到现有主流程，降低改动风险。

## 范围

- 新增独立模块：`character_runtime.py`
- 新增对应测试：`tests/test_character_runtime.py`
- 新增说明文档：`docs/character-runtime.md`
- 不接入 `app.py`、前端、Electron 主链路

## 已完成项

- 定义 `RuntimeEvent` / `RuntimeDirective` / `CharacterState`
- 实现 `CharacterRuntime`：
  - 事件队列
  - 单步调度 `run_once`
  - 状态快照 `snapshot`
  - channel hook 扩展点
  - 主动互动冷却与低打扰门控
- 实现输入归一化与安全兜底：
  - 普通文本
  - JSON 字符串
  - `dict`
  - 空输入/损坏 JSON 安全回退
- 实现情绪规范化与 `emotion_to_live2d_hint` 映射
- 补齐测试覆盖（含 8 类输入/兜底场景）

## 验收清单

- [x] 新增 `character_runtime.py`
- [x] 新增/补充 `tests/test_character_runtime.py`
- [x] 新增 `docs/character-runtime.md`
- [x] 新增 `tasks/codex/003-character-runtime-skeleton.md`
- [x] 不修改主流程关键文件
- [x] `python -m pytest tests/test_character_runtime.py -q` 通过

## 后续对接建议（非本任务）

- 在后续任务中，将 `assistant_reply` 与 `tts_finished` 的关键节点接入运行时。
- 将 `RuntimeDirective` 转接到现有 Live2D / TTS 控制器。
- 在低打扰模式下再叠加用户活跃度与时间窗策略。
