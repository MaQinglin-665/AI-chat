# Task 013：Character Profile config foundation

## 任务背景
Task 007 已在 runtime enabled 时注入结构化 JSON 输出要求，Task 008-011 已完成前端 metadata/Live2D/调试链路。本任务补齐 Character Profile 配置骨架，为后续人格与风格管理打基础。

## 本次目标
- 新增 Character Profile 配置文件。
- 后端新增 profile 读取与默认兜底。
- 仅在 `character_runtime.enabled=true` 时，把 profile 的轻量人格信息并入 runtime prompt contract。

## 默认行为保证
- `character_runtime.enabled=false` 时，prompt 行为不变。
- profile 存在与否不影响普通聊天默认路径。

## 允许修改范围
- `app.py`
- `config/character_profile.json`
- `tests/test_character_runtime_integration.py`
- `docs/character-profile.md`
- `docs/character-runtime-integration-plan.md`
- `tasks/codex/013-character-profile-config-foundation.md`

## 禁止修改范围
- 前端 UI
- Live2D 行为
- TTS
- 记忆系统
- 主动互动
- 其他无关文件

## 实现说明
- 新增默认常量：`DEFAULT_CHARACTER_PROFILE`
- 新增读取路径：`CHARACTER_PROFILE_CONFIG_PATH`
- 新增 helper：
  - `_normalize_character_profile_string(...)`
  - `_normalize_character_profile_list(...)`
  - `_normalize_character_profile_config(...)`
  - `_load_character_profile_config(...)`
- 兜底策略：
  - 文件缺失 / JSON 损坏 / 字段缺失 / 类型异常 -> 回退默认值
- prompt 接入：
  - 在 `_build_character_runtime_prompt_contract()` 中注入 profile 的 name/persona/tone/style_notes 与 allowed 集合
  - 仅 runtime enabled 路径生效（`_apply_character_runtime_prompt_contract` 仍先判断 enabled）

## 测试说明
补充 `tests/test_character_runtime_integration.py` 覆盖：
1. runtime disabled 时不加载 profile。
2. runtime enabled 时 prompt 包含 profile name/persona/tone。
3. profile 缺失时回退默认。
4. profile JSON 损坏时回退默认。
5. profile 字段缺失时补默认。
6. profile 类型异常时补默认。
7. allowed_emotions/actions/voice_styles 能进入 prompt contract。
8. 既有纯文本回退与 `/api/chat_stream` 关键路径继续通过。

## 风险
- profile 文本过长会增加 prompt 长度；当前仅注入轻量字段并截取少量 style notes。

## 验收标准
- 默认行为不变。
- enabled=true 时 profile 参与 runtime prompt。
- profile 文件异常场景全部安全兜底。
- 不改前端、Live2D、TTS，不新增依赖。


