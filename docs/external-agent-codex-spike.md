# Codex CLI 外部执行手：第 0 阶段验证

日期：2026-10-24（America/Los_Angeles）。结论：**按用户修订后的必验范围，第 0 阶段通过。本次实测通过的最低接入版本为 Codex CLI 0.164.0。第 1、2 阶段尚未开始，须另行授权。**

## 最终验收与接入要求（当前有效结论）

用户明确将计划更新事件调整为可选、非阻塞，不再排查 update_plan；适配器计划来自 `--output-schema` 的结构化输出，进度来自 `command_execution`、`file_change`、`agent_message`。这些是后续接入要求，本轮没有实现适配器。

| 必验项 | 最终结果 |
| --- | --- |
| 独立 CLI 版本、参数和 resume 子命令 | 通过，绝对路径调用确认 0.164.0 |
| 原样 DeepSeek 官方目录、env_key、最小任务、结构化输出 | 通过 |
| 非临时 CODEX_HOME，helper binaries 警告消失 | 通过 |
| read-only 禁写 | 通过，真实命令 Access denied，文件不存在 |
| workspace-write 内部可写、越界禁写 | 通过，内部内容核对成功，外部文件不存在 |
| 只读会话以 workspace-write 恢复 | 通过，相同 thread_id，恢复后实际写入成功 |
| 命令、文件修改、代理消息的真实 JSONL | 通过，已脱敏保存；计划更新事件可选、非阻塞 |
| 运行中取消整个进程树，且写入停止 | 通过，见下方量化证据 |

最低版本要求为 `0.164.0`：这是本次实际通过的接入基线，不表示已枚举所有中间版本，也不保证所有更新版本、Windows 设备或沙箱实现都自动通过。全局 CLI 保持 `0.133.0`，未修改。原有用户 Codex 配置未修改。

### 取消验证：真实持续写入与进程树

在独立的合成测试工作目录中准备 180 秒脚本：父 Python 进程启动一个子 Python 进程，两者每秒分别更新自己的 heartbeat 文件。由使用 DeepSeek 的独立 CLI 在 workspace-write 沙箱中执行该脚本；未使用模拟 CLI。

宿主观察到两个文件的计数均已增长，确认不是仅启动后立即退出。结束前父计数由 0 增至 2、子计数由 0 增至 1；然后对本次 CLI launcher 根 PID 执行 `taskkill /PID <ROOT_PID> /T /F`，返回 0。仅针对该任务进程树，没有按进程名称结束其他 Codex 会话。

全过程记录到 13 个进程身份（包括已经自然结束的启动辅助进程）：node.exe、codex.exe、pwsh.exe、两个 Python 写入进程，以及 conhost/Git 辅助进程。以 PID 与创建时间共同确认身份，避免 PID 复用误判；另外检查包含本次唯一测试标记的命令行以发现脱离父树的进程。

取消后每秒检查一次，连续 **15 秒**：

- 本次任务的残留进程观察数：**0**；
- 工作目录文件集合、内容 SHA256、大小、修改时间变化：**0**；
- stdout/stderr 收集线程已结束，CLI launcher 已退出（被取消后的退出码为 1，不作为本次取消测试失败）；
- taskkill 返回码 **0**，测试控制器总结果 **passed=true**。

这是一次本机原生 Windows unelevated 沙箱下的进程树取消验证，不外推为任意脱离进程树的应用、其他设备或无限观察时长的保证。

### 事件解释及配置约束

1. **计划更新事件可选、非阻塞。** 计划由 `--output-schema` 返回的结构化结果提供，不依赖 update_plan/todo 事件；进度从 command_execution、file_change、agent_message 提取。
2. **事件层面，item.error 视为非致命警告；只有顶层 `type=error` 或 `type=turn.failed` 才算任务失败。** 不应把某个 item 的失败状态或沙箱拒绝自动当作整个 turn 失败。取消是单独的 cancelled 状态，不能因为没有 turn.completed 就当作完成。进程异常退出、超时和输出缺失仍须由后续适配器的生命周期规则处理，不能误报成功。
3. **从配置中删除 preferred_auth_method。** 已在本次专用 CODEX_HOME 的 config.toml 中删除；保留 forced_login_method、provider env_key。删除后真实取消任务日志中不再出现该设置被忽略的警告。Key 仍只从环境变量传入。
4. resume 的 --sandbox 与 -C 位于 exec 父命令位置；实际恢复成功的是非 ephemeral 只读会话，不能假设 ephemeral 规划可以恢复。

### 交付及证据边界

现有七份真实脱敏 JSONL，共 **59 条事件**，包括新增 `v0.164.0-cancellation.jsonl`。取消夹具在正在执行的 command_execution 事件处截断，这是强制取消的真实结果，不补造 turn.completed/cancelled。

原有 item.error 警告夹具保留供解析器验证。尚无专门诱发的顶层 error / turn.failed 真实样例；其分类要求已记录，但不能声称这两个分支已实测。本轮按用户指定的剩余必须项完成取消验证，未再扩大故障注入范围。

只修改报告、状态文件和夹具；独立测试配置的变更在仓库外。未改应用运行时代码，未提交、未推送，也未开始第 1 阶段。

## 第三轮：重试成功，事件覆盖未完成（历史结果，已由上述验收取代）

用户授权重试同一安装命令。本轮独立安装成功，完整路径调用确认 `codex-cli 0.164.0`。全局包仍为 `0.133.0`，未升级或改写。所有模型验证均通过独立安装的绝对路径启动，不依赖 PATH 中的全局 codex。

本机路径仅在这里记录以便复现，JSONL 夹具使用占位符：

```text
CLI wrapper: D:\AI\.tools\codex-cli\node_modules\.bin\codex.cmd
CLI launcher: D:\AI\.tools\codex-cli\node_modules\@openai\codex\bin\codex.js
CODEX_HOME: D:\AI\.tools\codex-home-spike
Disposable workspace: D:\AI\.tools\codex-spike-run-20261024\workspace
```

CLI wrapper 用于版本及帮助检查；模型验证用 node 加 CLI launcher 的完整路径启动。测试环境为 Windows 11 build 26200。配置 `windows.sandbox = "unelevated"`、`approval_policy = "never"`，没有使用 danger-full-access、approve-for-me 或提权重试。DeepSeek 官网模型目录代码块原样保存，未删除或替换任何字段；Key 仅通过环境变量传入 `env_key`，未写入配置、脚本或夹具。

| 本轮检查 | 结果 | 实际证据 |
| --- | --- | --- |
| 独立安装与版本 | 通过 | npm 成功安装两个包；绝对路径 `--version` 返回 0.164.0 |
| exec / resume 帮助 | 通过 | 所需参数和 resume 子命令存在 |
| 官方目录 + env_key + 最小任务 | 通过 | deepseek-flash 返回 `{"result":"STAGE0_OK"}`，退出码 0；`--output-schema`、`-o`、`--json`、`--ephemeral`、`--skip-git-repo-check`、`-C` 一并使用 |
| 非临时 CODEX_HOME | 通过本项 | 不再出现拒绝创建 helper binaries 的警告 |
| read-only 禁写 | 通过 | 实际 Set-Content 命令退出 1，Access denied；宿主检查目标文件不存在 |
| workspace-write 边界 | 通过 | 目录内 Set-Content 退出 0，文件内容 INSIDE_OK；同级 outside 目录写入退出 1、Access denied，目标不存在 |
| 只读会话恢复为 workspace-write | 通过 | 恢复相同 thread_id，实际 Set-Content 退出 0，宿主确认 RESUME_OK 文件存在 |
| 真实 JSONL 事件覆盖 | **未通过完整覆盖** | 已有 thread.started、turn.started/completed、item.started/completed，item 类型包括 command_execution、file_change、agent_message、error；没有计划更新事件，也尚无顶层 error / turn.failed 样例 |
| 取消进程树清理 | **未执行** | 在事件覆盖不满足要求后停止，不能用命令正常退出代替取消验证 |

### 当前停止点

请求模型先调用 update_plan，再通过 apply_patch 创建测试文件并读取验证。模型报告 `update_plan` 在该会话中不可用，改用普通文字描述计划；实际 JSONL 只有代理消息、文件修改和命令执行等事件。**代理消息不是计划更新事件，未伪造或转换成计划事件。**

模型报告不可用和本次未出现计划事件是实测事实；尚未检查实际下发的工具 schema，不能据此断言 CLI 在所有配置下均不支持计划工具。按用户“任何一项失败就停下来报告”的要求，未尝试改配置绕过，也未继续取消测试或故意触发顶层错误。

因此 `0.164.0` 是本轮**已验证可运行 DeepSeek、执行上述沙箱限制和恢复权限切换的版本**，仍不是“完整第 0 阶段已通过的最低版本”。后续若继续实现，应至少使用这份指定独立版本作为重验基线；在剩余验证通过前不得声称完整兼容。

### resume 调用形式和限制

```text
<ISOLATED_CODEX> exec --sandbox workspace-write -C <WORKSPACE> resume --skip-git-repo-check --json <READ_ONLY_THREAD_ID> <PROMPT>
```

`--sandbox` 与 `-C` 放在 resume 之前，作为 exec 父命令参数，实际成功生效。用于 resume 的只读会话**没有**加 `--ephemeral`；最小任务及其他一次性测试使用 ephemeral。未来不能假设 ephemeral 规划会话可恢复，本轮只验证持久化会话的恢复。

### 夹具与警告

`tests/fixtures/codex_exec/` 中保存六份真实脱敏 JSONL，共 55 条事件：minimal、read-only、read-only-language-mode、workspace-write、resume、events。thread_id 保留以证明同一会话恢复；Key 和本机绝对路径不在夹具中。逐行 JSON 解析、绝对路径模式检查和实际 Key 检查通过。

首次 read-only 测试用 .NET WriteAllText，被 PowerShell 受限语言模式拒绝，因此仅作为补充证据；改用标准 Set-Content 后得到实际路径 Access denied。没有仅凭语言模式限制宣称文件权限通过。

非阻塞警告保留披露：官方示例 preferred_auth_method 被 CLI 忽略（真实 item.error）；PowerShell shell snapshot 不支持；gpt-5.6-luna 元数据回退警告；插件 featured 列表请求 401。这些警告没有阻止所述 DeepSeek 测试成功，但不代表插件功能通过。item.error 不等于顶层 error 事件。

独立 CLI、无 Key 的专用配置及仅含合成内容的测试目录保留在仓库外，供后续确认后复验；未改写用户原有 Codex 配置。探测脚本生成时曾有路径转义语法错误，在启动 CLI 前修正，未作为产品失败证据或运行结果计入。

第 1、2 阶段均未开始。未提交、未推送。当前需用户确认如何继续排查计划事件覆盖，然后才能补齐错误事件及取消验证。

## 第二轮：隔离安装 0.164.0（历史结果）

用户授权只在仓库外安装 `@openai/codex@0.164.0`，保持全局安装不变；后续使用非系统临时目录的独立 CODEX_HOME。要求任何一项失败即停止，且不得提交、推送或自动开始第 1 阶段。

实际执行：

```powershell
npm install --prefix D:\AI\.tools\codex-cli @openai/codex@0.164.0 --no-audit --no-fund --fetch-retries=0 --fetch-timeout=30000
```

安装退出码 **1**：

```text
npm error code ENOTFOUND
npm error syscall getaddrinfo
npm error network request to https://registry.npmjs.org/@openai%2fcodex failed
npm error network reason: getaddrinfo ENOTFOUND registry.npmjs.org
```

**当前阻塞是本机无法解析 npm 官方 registry 域名。** 没有重试其他下载源、修改 DNS/代理或升级全局安装。安装命令的目标仅为独立 prefix；全局包的版本仍为 `0.133.0`。

本轮在安装失败后停止，未创建新的验证配置，未读取或传递 Key，未启动 DeepSeek 请求。以下事项全部未执行，不能沿用第一轮帮助检查作为新版本的验证结果：

- 独立 CLI 完整路径 `--version`、exec / resume 参数检查；
- 非临时 CODEX_HOME 下 helper binaries 警告是否消失；
- 原样官方模型目录加载、env_key 认证、最小任务及输出 schema；
- read-only 禁写和 workspace-write 越界禁写；
- 真实脱敏 JSONL 事件采集及取消后的进程树清理；
- 只读会话实际以 workspace-write 恢复。

`0.164.0` 目前仅是**指定待测版本**，不是“实测通过的最低版本”。本项目尚无通过完整第 0 阶段验证的最低 CLI 版本。待用户确认网络问题的处理方式后，重新安装指定版本并从头验证；第 1、2 阶段保持未开始。

以下为第一轮历史证据，不代表第二轮通过。

## 基线与范围

- PR #210 经 GitHub 连接器查询仍为 open / draft，未合并。远端 head 与本地 origin/codex/developer-readiness-20261023 一致：`86a93cae8762d3a4865b5eb19a792e79b21ca957`。
- 从该远端跟踪引用创建 `codex/external-agent-codex-cli-v1`，复用原本干净的 readiness checkout。未修改 main，未提交、推送或创建 PR。
- 本机 gh / git 远端查询遇到 GitHub DNS 解析失败；远端状态通过连接器独立核实。
- 本次仅验证第 0 阶段。用户明确要求报告后等待确认。

## 实测结果

| 检查 | 结果 | 证据与限制 |
| --- | --- | --- |
| CLI 版本 | 已确认 | `codex --version` 输出 `codex-cli 0.133.0` |
| exec 参数 | 帮助声明存在，运行未全面验证 | `--json`、`--sandbox`、`--output-schema`、`-o/--output-last-message`、`--ephemeral`、`--skip-git-repo-check`、`-C/--cd` 全部出现在 `codex exec --help` |
| resume | 子命令存在，恢复执行未验证 | `codex exec resume --help` 成功；其自身帮助不列出 `--sandbox` 或 `-C`，不能据此确定父命令选项或配置覆盖能否改变恢复会话的权限 |
| DeepSeek 最小任务 | **失败，启动阶段阻塞** | 原样读取官方网页模型目录，选择 deepseek-flash；CLI 无法解析目录中的 `max` 推理等级，退出码 1，stdout 为空，无最终响应文件 |
| 环境变量 Key | 配置已使用，认证未验证 | 已有 `DEEPSEEK_API_KEY` 仅传给子进程环境；provider 配置使用 `env_key`，未写 bearer token。失败发生在模型目录解析阶段，不能声称本机 env_key 认证已通过 |
| Windows read-only 禁写 | **未执行** | 按任务文件要求，在前项失败后停止；没有可证明禁写有效的证据 |
| Windows workspace-write 越界禁写 | **未执行** | 不得把当前聊天权限或帮助文本当作被测 CLI 的沙箱证据 |
| JSONL 事件夹具 | **未采集** | stdout 为空，没有真实 thread/turn/item/error JSONL；未伪造夹具 |
| 取消进程树 | **未执行** | 最小任务自行退出；不等于验证了运行中任务取消和子进程清理 |

## 失败详情

测试使用独立临时 CODEX_HOME 和空工作目录，不读取或修改用户原有 Codex 配置。官方目录原样使用，没有删掉不兼容字段或替换模型。

执行参数（路径以占位符表示）：

```text
codex exec --json --sandbox read-only --ephemeral --skip-git-repo-check -C <WORKSPACE> --output-schema <SCHEMA> -o <LAST_MESSAGE> <MINIMAL_PROMPT>
```

最小提示仅要求返回 `{"result":"STAGE0_OK"}`，禁止调用工具或读取文件。输出结构要求 result 为字符串。

配置选择 `wire_api = "responses"`、官方 `https://api.deepseek.com/`、`env_key = "DEEPSEEK_API_KEY"`，审批策略为 never，Windows 配置指定 unelevated；这些配置值不构成沙箱生效证据。

关键错误（已去除个人路径）：

```text
Error: failed to parse model_catalog_json path <MODEL_CATALOG> as JSON:
unknown variant `max`, expected one of `none`, `minimal`, `low`, `medium`, `high`, `xhigh`
```

另有启动警告：CLI 拒绝在 Windows 临时目录中的 CODEX_HOME 下创建 helper binaries。它与模型目录解析错误分别记录；本次无法确定其对后续命令执行的影响。

官方模型目录的 `minimal_client_version` 为 `0.144.0`，本机为 `0.133.0`。这是已确认的兼容性阻塞。没有调用成功的 DeepSeek 请求，不能判断 Key 有效性、模型可用性或计费情况。

## 后续边界

用户确认后，先解决 CLI 与官方目录兼容性，并为验证选择 CLI 支持的独立私有 CODEX_HOME 位置，再完整重跑第 0 阶段。不得通过删除模型目录字段、放开沙箱或沿用用户原有配置绕过本次失败。

只有真实模型最小任务、两种沙箱禁写、真实事件夹具及取消清理全部通过，并取得用户对后续阶段的确认后，才进入实现。第 1、2 阶段尚未开始。

## 来源

- [DeepSeek 官方 Codex 集成说明](https://api-docs.deepseek.com/quick_start/agent_integrations/codex/)
- [OpenAI Windows 沙箱说明](https://learn.chatgpt.com/docs/windows/windows-sandbox)：当前文档描述了比本机版本更新的实现，不能直接外推到 0.133.0。
- [OpenAI 配置参考](https://learn.chatgpt.com/docs/config-file/config-reference)：文档支持与本机实际认证成功是不同层次的证据。

验证范围仅为上述 CLI 启动探测和文档检查；没有应用运行时代码修改，无需将历史完整测试结果记作本次通过。

收尾检查：`git diff --check`、feature_list JSON 解析、`python scripts/check_secrets.py`（709 个文件）通过。未运行应用完整测试，因为本次只修改验证报告与状态文件。

临时 config.toml、models.json、schema.json 已逐文件删除，临时目录递归文件计数为 0；仅空目录保留。未向任何文件写入 Key。仓库外保留不含 Key 的本机探测脚本及脱敏失败结果，未加入 Git。整批递归清理命令曾被自动审批策略拒绝，随后仅删除明确列出的三个测试文件成功。
