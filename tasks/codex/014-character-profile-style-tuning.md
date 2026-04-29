# Task 014：Character Profile prompt polish and style tuning

## 任务背景
Task 013 已建立 Character Profile 配置骨架与 runtime enabled 条件下的 prompt 注入。本任务继续优化 profile 默认设定和 structured prompt wording，使角色表达更自然、更像桌面伙伴，同时保持任务可用性和克制。

## 本次目标
- 优化 `config/character_profile.json` 默认角色设定。
- 优化 `app.py` 中 profile 注入 structured prompt 的描述规则。
- 保持默认关闭路径不变，仅在 `character_runtime.enabled=true` 生效。

## 默认行为保证
- `character_runtime.enabled=false` 时，不改变 prompt、返回结构与主流程行为。
- 不改前端 UI、Live2D、TTS。
- 不接记忆、不接主动互动。

## 允许修改范围
- `app.py`
- `config/character_profile.json`
- `tests/test_character_runtime_integration.py`
- `docs/character-profile.md`
- `docs/character-runtime-integration-plan.md`
- `tasks/codex/014-character-profile-style-tuning.md`

## 禁止修改范围
- 前端 UI
- Live2D 行为
- TTS
- 后端 response shape
- 记忆系统
- 主动互动
- 依赖项

## 实现说明
- Profile 新增轻量字段并保持简单：
  - `response_guidelines`
  - `style_boundaries`
  - `interaction_examples`
- 后端补齐兜底：
  - 缺失字段 -> 默认值
  - 类型异常 -> 默认值
- runtime prompt（仅 enabled=true 时）优化为：
  - 明确角色表达目标：自然、简洁、表达力、轻微玩笑、支持性。
  - 明确边界：不夸张、不强 roleplay、不每句调侃、不引入敏感依赖暗示。
  - 明确 JSON-only contract：仅 JSON 对象、无 Markdown code block、无额外解释。
  - 明确 emotion/action/voice_style 必须从 allowed 列表选择，拿不准时回退 neutral/none/neutral。

## 测试说明
更新 `tests/test_character_runtime_integration.py` 覆盖：
1. runtime disabled 时 prompt 不变。
2. runtime enabled 时 prompt 包含新的 style guidance。
3. 新增 profile 字段缺失时安全兜底。
4. 新增 profile 字段类型异常时安全兜底。
5. structured prompt 仍保持 JSON-only 约束。
6. structured prompt 仍包含 allowed_emotions/actions/voice_styles。
7. 既有普通文本兜底与 response shape 行为不变。

## 风险
- 风格规则过多会增加 prompt 长度；当前仅保留轻量 guidance（截断到少量条目）。

## 验收标准
- 默认行为不变。
- 仅 runtime enabled 路径受影响。
- profile 新字段具备完整兜底。
- 不改前端/Live2D/TTS，不新增依赖。
