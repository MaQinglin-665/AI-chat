# 第 1 阶段后端验收（2026-10-24）

范围：后端状态机、独立 CLI 调度、审批、审计、元数据事件、接口和诊断。未修改前端或语音，未开始第 2 阶段，未推送或创建 PR。

## 自动化

- 提交第 0 阶段前：scripts/test-local.ps1 通过，734 项 Python 测试及全部 Node 测试通过。
- 第 0 阶段独立提交：`12fb134`，`docs(external-agent): record Codex CLI 0.164.0 stage-0 verification`。
- 第 1 阶段最终 scripts/test-local.ps1：**764 passed**，Python 用时 91.04 秒；一项已有 audioop 弃用警告。脚本内实际运行 `node scripts/run_node_tests.js`，全部通过。
- 新增 30 项测试：真实 JSONL 经假 CLI 子进程回放；顶层 error/turn.failed 注入；item.error 不致命；异常行与未知事件；正常审批、重复批准、拒绝、过期、取消、超时、单活动任务；路径穿越、目录根、用户主目录、项目目录、符号链接；凭据不进入公开状态、事件、审计；配置关闭及 token/来源守卫。
- Python 语法检查 172 个文件，JavaScript 语法检查 191 个文件通过。
- config.example.json、package.json 解析与指定十个 Python 模块编译通过；差异空白检查通过；包含新增已暂存文件的密钥扫描通过。
- doctor 通过但有 3 个环境警告：没有私人 config.json、Node 25 非推荐 LTS、PATH 全局 Codex 0.133.0 低于门槛。全局安装保留不动；真实验收显式选择独立 0.164.0。

## 真实 CLI / DeepSeek

全部使用独立 Codex CLI **0.164.0**、非临时专用 CODEX_HOME、原样官方模型目录快照、Windows unelevated 沙箱。应用全局配置和真实私人文件不变。

| 用例 | 结果 | 证据 |
| --- | --- | --- |
| 无效 Key | 通过 | 从真实管理器创建只读规划，3.02 秒进入 failed；error.code=authentication_failed；返回“DeepSeek 身份验证失败，请检查 Key 是否有效。” |
| 凭据保密 | 通过 | 无效 Key 未出现在捕获的应用输出、公开状态、审计、事件及测试目录文件中；运行子目录残留数 0 |
| 合成文件整理 | 通过 | 真实规划 22.06 秒；批准前文件保持不变；批准后 alpha.txt、beta.txt 移至 txt 子目录且内容完全一致；总耗时 59.97 秒，24 个进度事件、0 个警告 |
| 真实执行取消 | 通过 | 使用固定合成计划，经过管理器的审批流程，由真实 CLI/DeepSeek 执行父子 Python 持续写入脚本；两个写入器计数增长后请求取消；进入 cancelled |
| 取消清理 | 通过 | 跟踪 12 个进程身份；取消后观察 10 秒，残留进程 0，工作目录新增写入 0 |

取消用例的规划是固定测试数据，**不是**真实模型规划；模型规划能力由独立的文件整理用例验证。两种用例分开记录，不把注入计划冒充真实规划。

真实无效 Key 用例通过后端的事件分类确认失败，没有向仓库保存未经处理的 provider 输出。顶层 error 和 turn.failed 两种格式分别由单元测试显式注入覆盖；不声称真实服务恰好返回过每一种格式。

## 文件与接口

- `external_agent.py`：单任务状态机、批准、拒绝/取消、到期、审计及事件转换。
- `external_agents/`：版本/配置/路径策略、Codex CLI 适配器、Windows 进程清理保护及官方模型目录快照。
- `app_external_agent.py`、app.py、app_get_routes.py：四个带现有鉴权守卫的任务接口。
- config.py、config.example.json：默认关闭的 external_agent 配置（包含独立 codex_home）。
- agent_actions.py：增加兼容旧调用方式的可选审批 TTL；companion_events.py：新增严格元数据任务事件。
- app_health.py、scripts/check_external_agent.py、scripts/doctor.ps1：版本门槛和配置诊断。
- tests/test_external_agent*.py、假 CLI 测试夹具：后端与真实事件回放测试。
- README、使用文档、feature_list、progress 和 handoff：阶段范围、证据和后续边界；旧交接已归档。

接口：POST /api/agent/task，GET /api/agent/task/<id>，POST /api/agent/task/<id>/approve，POST /api/agent/task/<id>/cancel。

配置：enabled、provider、codex_path、codex_home、model、allowed_roots、max_minutes、plan_ttl_minutes。功能保持默认关闭，旧配置无需新增字段即可继续使用原有功能。

## 剩余限制

- unelevated 沙箱已验证写权限，不是完整的目录读取隔离；“只做批准计划”依赖 CLI 遵守提示，不能当作任意命令的形式化约束。只适合可信本机测试目录。
- 网络需求可以进入审批风险信息，但不自动放宽沙箱网络权限；某些需要联网的命令会失败。尚未提供更强的网络隔离实现。
- 任务状态仅驻留当前进程；不支持重启恢复。规划 ephemeral，因此执行新开会话；不恢复一个并未持久化的规划会话。
- 进程清理的真实证据限于本机和观察时段；其他 Windows 策略环境、版本更新需要重验。非 Windows 真实执行默认拒绝。
- 尚未做前端卡片、语音播报、共享经历或真实 Electron 联调；留待用户确认第 2 阶段后再做。
