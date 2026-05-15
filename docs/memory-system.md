# Memory System

本文说明当前记忆系统的工作机制和安全边界。它面向早期测试者和贡献者，描述的是 MVP / 开源孵化阶段的实现，不代表已经具备成熟商业产品级长期记忆。

## Current Shape

当前记忆分为三层：

- 原始对话记忆：`memory.json` 保存经过截断和归一化的用户/角色文本片段，用于显式记忆查询和摘要刷新。
- 短期记忆：`memory_session.json` 保存当前会话的任务、话题、最近判断和未完成事项，会按轮数自然过期。
- 长期记忆：`memory_core.json` 保存结构化的稳定事实、事件、项目进展和关系信息，分为 `semantic` 与 `episodic` 两类。
- 画像与关系摘要：`memory_profile.json`、`memory_relationship.json`、`memory_summary.json` 保存从历史对话中提炼的轻量摘要。
- 互动偏好学习池：`learning_candidates.json` 保存候选互动偏好，`learning_samples.json` 保存用户在记忆管理中晋升后的正式偏好样本。

`learning_*` 的职责是“怎么说话”，例如短句、少套话、先给重点；它不是事实记忆。`memory_session.json` 负责“刚刚正在发生什么”，`memory_core.json` 负责“以后也值得记得什么”。

候选池和正式池的边界很重要：候选互动偏好默认不影响后续回复；只有被用户在记忆管理里晋升到正式池后，才可能被少量注入 prompt。真实长期记忆会经过独立的事实/事件过滤和相关性召回，不读取桌面、文件或工具结果。

## Short-Term Memory

短期记忆用于让角色理解“继续”“下一步”“好的做吧”这类短回复。它默认只从当前聊天轮次的用户文本和角色回复中生成，不读取桌面、文件、截图或工具结果。

短期记忆会保存：

- `current_topic`：当前正在讨论的话题。
- `current_task`：当前正在推进的任务。
- `recent_decision`：最近形成的判断或方向。
- `user_state`：短暂状态或情绪，只在当前会话附近使用。
- `open_loop`：尚未完成或需要回头处理的事项。

短期记忆按 `turn_index` 和 `ttl_turns` 过期，默认保留 16 轮左右。召回时它优先于长期记忆，用来保持当下任务连续性，但不会沉淀为长期事实。

相关配置位于 `memory`：

- `short_enabled`
- `short_max_items`
- `short_inject_count`
- `short_ttl_turns`
- `memory_consolidation_enabled`
- `memory_consolidation_min_support`
- `memory_conflict_protection_enabled`

短期记忆不会默认永久化所有临时上下文。只有当同一类当前任务 / 最近判断 / 未完成事项被重复支持，或文本显示已经完成、确认、修复、发布等稳定进展时，才会尝试沉淀到 `memory_core.json`。沉淀结果会记录在 Debug 面板的 `short.last_consolidation`，并且会在原短期条目上标记 `consolidated_at`，避免每一轮重复写入。

## Long-Term Memory

长期记忆目前保存为本地 `memory_core.json`，默认只从当前聊天轮次的用户文本和角色回复中提炼。它支持两种记忆类型：

- `semantic`：较稳定的事实，例如项目名称、用户明确要求记住的信息、长期关系上下文。
- `episodic`：发生过的事件或近期进展，例如“今天修复了 ASR 路由测试”或“下一阶段准备做记忆系统”。

每条长期记忆包含 `kind`、`category`、`text`、`importance`、`confidence`、`tags`、`origin` 和时间戳。召回时只会选择与当前消息相关、达到重要性和置信度阈值的少量记忆，默认最多 3 条。低信号寒暄、乱码、舞台动作文本、疑似密钥/token/敏感路径会被跳过。

记忆管理抽屉中的“短期记忆”和“长期记忆”页签可以查看、编辑、删除和升/降权这些条目。长期记忆还能固定；固定不会让记忆无条件进入每次回复，它只会在相关召回排序中提高优先级。删除只影响本地记忆 JSON，不会删除聊天历史或用户文件。

相关配置位于 `memory`：

- `core_enabled`
- `core_extraction_enabled`
- `core_max_items`
- `core_inject_count`
- `core_min_importance`
- `core_min_confidence`
- `memory_correction_enabled`

如果用户在聊天中明确表达“你记错了”“不对，应该是……”“忘掉/删除这条记忆”等纠错意图，系统会只在本地核心记忆和短期记忆中查找相关条目并更新或删除。纠错不会读取桌面、文件或工具结果；如果找不到足够相关的旧条目，普通纠错会作为一条新的核心记忆候选写入，忘记类指令则不会凭空删除无关内容。最近一次纠错结果会出现在 Debug 面板的 `core.last_correction`。

召回时会先尊重当前用户输入。如果当前这一轮是纠错、忘记、否定旧称呼/旧事实，或用户正在给出新的事实陈述，旧记忆需要达到更强相关性才会进入 prompt；明显冲突的候选会被跳过，并在 Debug 面板里以 `current_correction`、`current_forget_request`、`current_denies_memory_token` 或 `weak_match_current_assertion` 记录原因。

## Candidate Extraction

普通聊天保存到原始记忆后，会异步尝试提炼真实长期记忆和一条互动偏好候选。这个过程不阻塞聊天回复。

互动偏好候选提炼只读取当前轮的 `user` / `assistant` 文本，不读取桌面、文件、截图、工具结果或外部上传内容。提炼结果必须落在这些类别之一：

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

互动偏好候选池永远不直接进入 prompt。把候选晋升到正式池前，用户可以在记忆管理中查看、删除、降权或撤销操作。

## Debug And Safety

`/api/memory/debug` 是只读调试接口，用来查看最近一次记忆选择和候选提炼状态。记忆管理 Debug 面板会展示：

- 最近正式池是否参与 prompt
- 短期记忆数量、轮次、最近一次短期记忆更新结果
- 长期记忆数量、最近一次长期记忆提炼结果、最近保存的长期记忆摘要
- 被选中的正式记忆摘要
- 最近一次候选提炼的状态、跳过原因、类别、分数和置信度
- 候选池与正式池数量
- 审核与注入状态：候选池是否启用、正式池是否允许注入、当前有效注入上限、待审核数量、可参与 prompt 的正式记忆数量

调试接口中的 `learning.review_status` 是给开发和验收使用的状态摘要。关键字段包括：

- `pending_review_count`：仍在候选池、等待用户审核的候选数量。
- `active_sample_count`：正式池里未归档/未删除的记忆数量。
- `prompt_eligible_sample_count`：达到分数、置信度和状态要求，理论上可以参与 prompt 的正式记忆数量；实际是否注入仍取决于当前消息相关性。
- `prompt_injection_enabled` / `prompt_inject_effective_limit`：正式池注入是否打开，以及本次配置下的有效上限。
- `candidates_affect_prompt=false`：候选池不会直接影响回复。
- `requires_user_promotion=true`：候选必须经用户晋升后才可能进入正式池。
- `sensitive_filter_enabled=true`、`local_only=true`、`input_scope=chat_turn_text_only`：当前实现只处理聊天轮次文本，并保留敏感内容过滤。

短期 / 长期记忆管理接口：

- `GET /api/memory/short`：只读返回 `short_memories` 和统计信息。
- `POST /api/memory/short/update`：支持 `delete`、`clear`、`weight`、`edit`。编辑会重新做长度、乱码、敏感文本和舞台文本过滤。
- `GET /api/memory/core`：只读返回 `core_memories` 和统计信息。
- `POST /api/memory/core/update`：支持 `delete`、`pin`、`unpin`、`weight`、`edit`。编辑会重新做长度、乱码、敏感文本和舞台文本过滤。

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
