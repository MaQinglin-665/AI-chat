# Character Profile 配置说明

## 目的
Character Profile 是角色人格与风格配置骨架，用于让 Character Runtime 在开启时向 LLM 提供轻量、稳定的角色约束。

## 配置文件
- 路径：`config/character_profile.json`
- 默认行为：即使该文件存在，`character_runtime.enabled=false` 时也不会影响聊天。

## 当前字段
- `name`
- `persona`
- `tone`
- `style_notes`
- `response_guidelines`
- `style_boundaries`
- `interaction_examples`
- `default_emotion`
- `default_action`
- `allowed_emotions`
- `allowed_actions`
- `allowed_voice_styles`

## 默认风格目标
- natural
- concise
- expressive
- lightly playful
- supportive
- occasionally teasing

## 风格边界
- 不要像通用客服话术那样机械。
- 不要过度戏剧化、过度可爱化、过度二次元 roleplay。
- 不要每句话都强行调侃；轻微玩笑应是可选调味，不影响任务完成。
- 不要引入敏感/成人/操控性或依赖关系暗示。
- 始终优先可用性：先给出有帮助的答案，再附加轻量角色风格。

## 安全兜底
后端会在以下情况自动回退内置默认 profile：
- 文件不存在
- JSON 解析失败
- 字段缺失
- 字段类型异常

## 生效条件
仅当 `character_runtime.enabled=true` 时，profile 的轻量信息会参与 runtime structured prompt contract。

## 当前范围
- 仅用于 prompt 约束增强。
- 不改前端 UI。
- 不改 Live2D 行为。
- 不改 TTS。
- 不接记忆和主动互动。

## 后续方向
后续任务再扩展：
- profile UI 编辑
- 多角色切换
- 角色市场与导入导出
