# AGENTS.md

## 项目与边界

馨语桌宠是 Windows Electron + Python + Live2D + LLM + TTS/ASR 的开源 MVP，目标是低打扰、可表达情绪的桌面伙伴。不要宣传为成熟商业产品或其他 AI VTuber 的复刻。中文文档应区分源码能力、已发布安装包与待验收体验。

- One feature at a time：只推进当前明确目标，不顺带重构、删除功能、增加依赖或改变安全默认值。
- 不直接修改或推送 main，不自动合并 PR，不强推。功能分支可自验收、提交、推送和创建 PR。
- 保留无关改动，不用 reset、clean、覆盖复制或自动 stash 清理用户工作区。
- Live2D、TTS、LLM、配置中心修改必须兼容旧配置，新选项提供安全默认值。
- 产品的桌面观察、截图、工具调用、shell、文件访问遵循现有 opt-in 授权边界，高风险操作保留用户确认。这不禁止开发 agent 阅读公开源码或运行验证。
- 不提交 config.json、config.local.json、.env、私人 memory_*.json、记忆 *.bak、tts_ref 用户样本、凭据或未授权模型。已有的脱敏 *.example.json 可维护。

## Startup workflow

1. 确认目标与验收标准；缺少关键信息时一次只问一个问题，能从仓库核实的信息先自行核实。
2. 核对 `git rev-parse --show-toplevel`、`git status --short --branch`、`git log -1 --oneline`、`git worktree list`。父目录未必是仓库，同名副本未必是最新代码。
3. 阅读本文件、README.md、package.json、session-handoff.md 和 progress.md 尾部。按任务读取 feature_list.json 对应条目、[开发路由与验证](docs/agent-workflow.md)及相关模块，避免默认加载整个历史日志。
4. 审查发布状态或选择新任务基线时先 `git fetch origin main`，再核对提交祖先关系；获取失败则明确只掌握本地缓存。日志、旧远端跟踪分支和目录名不能单独证明合并。
5. 在 main 或有大量无关改动的目录工作时，使用干净功能分支/worktree。修复未发布功能应基于所属分支，不机械地从 main 丢弃所需改动。
6. 当前目标写入 feature_list.json 的 `active_task`，工作项用 `in_progress`。历史未完事项不自动成为本次任务，也不擅自标为完成。

## State artifacts

- `feature_list.json`：状态、dependencies、scope、done_criteria；`active_task` 为当前任务 ID，无活动任务时为 null。complete 表示限定范围完成，不等于发布或完整体验验收。maintenance、retired 保留原语义。
- feature ID 必须唯一；新增前检查是否已有同一事项，结构评分不替代唯一性与状态一致性检查。
- `progress.md`：按时间追加工作与 Verification Evidence，不改写历史结果。
- `session-handoff.md`：一份当前摘要、Files touched、阻塞与 Next Session；旧内容归档并链接，避免多个矛盾的 Latest。
- `docs/ROADMAP.md`：产品阶段与验收方向，不作为实时完成账本。
- 本次审查见 [2026-09-22 项目审查](docs/project-audit-2026-09-22.md)。历史数字须连同日期、分支或提交引用。

## Verification commands

按 [验证矩阵](docs/agent-workflow.md#验证矩阵)选择检查。纯指导文档修改无需全部运行时回归；跨端契约或发布准备执行完整门禁：

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/test-local.ps1
```

`init.sh` 是 PowerShell 门禁的 Bash 包装，不是独立 Linux 验证环境。根 package.json 没有通用 test/lint/build 命令。

每次推送前必须运行，失败不得当作通过：

```powershell
python -m json.tool config.example.json
python -m json.tool package.json
python -m py_compile app.py config.py tts.py memory.py tools.py llm_client.py asr.py emotion.py humanize.py utils.py
```

同时检查 `git diff --check`、`python scripts/check_secrets.py` 和明确的暂存清单。高/中风险问题修复后才能推送，低风险建议在交付中说明。旧分支故障需在当前基线复现后才能称为现存问题。

## Definition of Done / End of Session

1. 对照当前任务 done_criteria，保留未完成的产品验收项。
2. 记录命令、工作目录、基线、结果、未执行检查及原因；区分静态检查、模拟测试、真实模型、听评、Electron 联调、CI 和发布。
3. 更新 status，清空已完成任务的 active_task，更新交接摘要与进度尾部。
4. 报告文件、测试、风险、无关改动保护及提交/推送情况。不把本地验证称为新 CI 或安装包验收。
