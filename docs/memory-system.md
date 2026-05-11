# Memory System

本文说明当前记忆系统的工作机制和安全边界。它面向早期测试者和贡献者，描述的是 MVP / 开源孵化阶段的实现，不代表已经具备成熟商业产品级长期记忆。

## Current Shape

当前记忆分为三层：

- 原始对话记忆：`memory.json` 保存经过截断和归一化的用户/角色文本片段，用于显式记忆查询和摘要刷新。
- 画像与关系摘要：`memory_profile.json`、`memory_relationship.json`、`memory_summary.json` 保存从历史对话中提炼的轻量摘要。
- 学习池：`learning_candidates.json` 保存候选记忆，`learning_samples.json` 保存用户在记忆管理中晋升后的正式记忆。

候选池和正式池的边界很重要：候选记忆默认不影响后续回复；只有被用户在记忆管理里晋升到正式池后，才可能被少量注入 prompt。

## Candidate Extraction

普通聊天保存到原始记忆后，会异步尝试提炼一条候选记忆。这个过程不阻塞聊天回复。

候选提炼只读取当前轮的 `user` / `assistant` 文本，不读取桌面、文件、截图、工具结果或外部上传内容。提炼结果必须落在这些类别之一：

- `user_preference`
- `project_context`
- `relationship_style`
- `response_feedback`
- `stable_fact`

系统会跳过低信号内容，例如轻量问候、过短文本、自动对话、乱码、疑似 API key / token、本地路径、舞台化或不适合作为长期偏好的回复。明确的“记住”“以后你要”“我喜欢”“我不喜欢”会提高候选分，但仍然不会自动生效。

相似候选会合并，增加 `support_count`，并更新分数、置信度和时间戳。候选池默认最多保留 200 条，优先清理低分、低置信、较旧的候选。

## Prompt Injection

正式池由 `learning_samples.json` 提供。回复时只会选择与当前用户消息相关、分数和置信度达到阈值的少量正式记忆，默认最多 2 条。

相关配置位于 `memory`：

- `learning_samples_enabled`
- `learning_inject_count`
- `learning_min_score`
- `learning_min_confidence`
- `learning_candidates_enabled`
- `learning_candidate_max_items`
- `learning_candidate_min_score`
- `learning_candidate_min_confidence`

候选池永远不直接进入 prompt。把候选晋升到正式池前，用户可以在记忆管理中查看、删除、降权或撤销操作。

## Debug And Safety

`/api/memory/debug` 是只读调试接口，用来查看最近一次记忆选择和候选提炼状态。记忆管理 Debug 面板会展示：

- 最近正式池是否参与 prompt
- 被选中的正式记忆摘要
- 最近一次候选提炼的状态、跳过原因、类别、分数和置信度
- 候选池与正式池数量

调试输出应保持摘要化，不展示 API key、token、完整私密历史、完整 prompt、桌面截图、文件内容或敏感本地路径。

安全默认值保持不变：不自动观察桌面，不默认读取用户文件，不默认执行 shell，不默认启用工具调用。记忆系统只处理聊天文本，并且候选记忆在用户审核前不会影响角色回复。

## Validation

改动记忆系统后，建议至少运行：

```powershell
python -m pytest tests\test_memory_selection.py tests\test_api_health.py tests\test_character_brain.py -q
node scripts\run_node_tests.js
git diff --check
```

发布或分享源码测试包前，再运行：

```powershell
python scripts\check_python_syntax.py
python scripts\check_js_syntax.py
python scripts\check_secrets.py
python -m pytest -q
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\check_first_run_package.ps1
```
