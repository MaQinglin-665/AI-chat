# 外部执行手（实验性，默认关闭）

当前只完成后端。控制中心入口、确认卡片展示和语音陪伴尚未接入；不要将这些前端能力视为可用。

## 安装与配置

最低接入基线为本机实测过的 **Codex CLI 0.164.0**。推荐独立安装，不覆盖其他应用使用的全局版本：

```powershell
npm install --prefix <独立工具目录> @openai/codex@0.164.0
```

将 `codex_path` 指向该安装的 `node_modules/.bin/codex.cmd`、`bin/codex.js` 或原生 `codex.exe`。空值先搜索 PATH 中的全局 codex；找不到或版本过低会给出可读提示，不自动安装升级，也不会悄悄切换到另一份安装。

在本机私人配置中设置（不要提交真实配置）：

```json
{
  "external_agent": {
    "enabled": false,
    "provider": "codex_cli",
    "api_key_env": "DEEPSEEK_API_KEY",
    "codex_path": "",
    "codex_home": "%LOCALAPPDATA%/XinyuDesktopPet/external-agent/codex",
    "model": "deepseek-flash",
    "allowed_roots": [],
    "max_minutes": 15,
    "plan_ttl_minutes": 15
  }
}
```

显式启用并添加实际存在的工作目录后才可创建任务。目录和计划路径经过规范化及符号链接解析；禁止磁盘根目录、用户主目录、系统目录、本项目及其上级目录，拒绝路径穿越和网络路径。批准时再次校验，防止等待期间授权范围或链接变化。`allowed_roots=[]` 一律拒绝任务。

`codex_home` 默认位于应用数据目录，必须与系统临时目录、仓库、授权工作目录及现有 `~/.codex` 分离。每个阶段创建专用子目录，写入无 Key 的 config.toml、官方模型目录快照与计划 schema；结束后清理该运行目录。不会改用户原有 Codex 配置。`preferred_auth_method` 不写入配置。

Key 优先从 `external_agent.api_key_env` 指定的环境变量读取，默认 `DEEPSEEK_API_KEY`；`.env` 由现有配置加载器读取。只有 `llm.base_url` 的主机名精确等于 `api.deepseek.com` 时，才允许回退到原有 `llm.api_key` 或 `llm.api_key_env`。聊天使用其他服务商时，其 Key 绝不会被本适配器复用。适配器不把 Key 写到新文件；模型请求只使用 DeepSeek 官方 HTTPS Responses 地址。执行环境过滤凭据类变量，Key 不传给命令行参数。

`max_minutes` 是每次规划/执行阶段的时限，`plan_ttl_minutes` 是批准窗口；两者须大于 0 且不超过 120 分钟。

## 接口与状态

所有接口遵守现有来源校验与 API token 设置；如果启用了 token，提供 `X-Taffy-Token`。功能关闭时以下接口返回 403。

| 接口 | 用途 |
| --- | --- |
| POST `/api/agent/task` | `{"goal":"任务描述","workdir":"绝对路径"}`，创建只读规划 |
| GET `/api/agent/task/<id>` | 查询状态、计划、警告计数和审批风险 |
| POST `/api/agent/task/<id>/approve` | 单次消费审批，开始执行 |
| POST `/api/agent/task/<id>/cancel` | 拒绝待批计划，或请求取消正在运行的任务 |

创建、批准与取消请求返回 202；取消返回时 `cancel_requested=true` 不代表清理已完成，应查询至 `cancelled`。重复批准拒绝；终态取消是幂等操作。阶段为 planning → awaiting_approval → executing → completed/failed/cancelled/expired，同一服务实例只有一个活动任务，等待审批也占用槽位；进程清理完成前不释放槽位。若进程清理失败，拒绝开始下一任务。

服务端公开 `create_task`、`get_task`、`approve`、`cancel`、`list_tasks`。状态仅保存在进程内（最多 100 项），重启后不能恢复旧审批执行；已有审批记录会按 TTL 过期。

## 审批、进度与诊断

规划使用 read-only、ephemeral 和 `--output-schema`，完整计划随查询结果返回。创建 `external_agent_task` 审批时，摘要列出修改和删除数量；`approval_warnings` 单独给出删除清单、高风险和网络需求，留给第 2 阶段展示。

规划使用 ephemeral，因此批准后新开 workspace-write exec，把批准的计划原文传入，要求只做已批准事项、遇到计划外操作停止。第 0 阶段验证的 resume 权限切换仍有效，但没有把不可恢复的 ephemeral 会话误当作可恢复会话。

进度只来自 command_execution、file_change、agent_message；不依赖可选的计划更新事件。item.error 记作非致命警告，顶层 error/turn.failed 判为任务失败。异常退出、缺少 turn.completed、无效计划、超时是独立失败原因；取消不是成功完成。

审计只记录目标摘要、状态和文件数量；事件总线只包含任务 id、阶段和计数，不包含模型消息、命令或文件内容。原始 stdout/stderr 不转发给 API、审计或应用日志，提供商错误转换为固定可读说明。

`GET /api/health` 的 checks.external_agent 以及 doctor 检查安装、版本、Key 是否配置、目录是否合法。不实际请求模型、不自动安装、不打印 Key；功能关闭时缺少 CLI 不影响其他功能启动。

## 取消与限制

Windows 沿用实测的 unelevated 沙箱和 never 审批策略。取消/超时调用 taskkill /PID /T /F，并用 Windows kill-on-close Job Object 作为子进程清理保护。CLI 版本、审批与沙箱约束不能由工作区配置放宽。本版本不在其他操作系统上开启真实执行。

沙箱验证证明了测试路径的写权限边界，**不等于完整的读取隔离**。unelevated 沙箱也不是网络隔离的最高强度实现。allowed_roots 限制任务入口和计划路径；本版本还要求模型不访问工作目录外的数据，但自然语言提示不是安全边界。只能用于可信的本机测试目录，不应授予含有敏感数据或不可信指令的目录。命令级的“只执行计划内容”仍依赖 CLI 对批准计划的遵守，不能据此保证任意生成命令完全无副作用。

将 enabled 改回 false 会拒绝新请求；对已经运行的任务应先调用取消接口并等待 cancelled，再关闭功能。不要直接删除仍有任务使用的 codex_home。

## 维护与证据

`external_agents/deepseek-models.json` 是第 0 阶段保存的 [DeepSeek 官方模型目录](https://api-docs.deepseek.com/quick_start/agent_integrations/codex/)原样快照，SHA256 为 `d19f90bfbde3d40172b74bb6c00949848fb6757b674be569d4d305a753a888e2`。每次运行复制它，不运行远端安装脚本；修改快照或升级 CLI 后应重新验证兼容性与沙箱。

第 0 阶段证据见 [验证报告](external-agent-codex-spike.md)。后端测试使用假的 CLI 回放真实 JSONL，补充顶层 error/turn.failed 注入，并覆盖拒绝、过期、取消、超时、路径链接、并发、禁用接口和 token/来源守卫。真实无效 Key 与合成文件整理结果在 progress.md 中记录。前端/语音验证不属于第 1 阶段，不宣称已经完成。
