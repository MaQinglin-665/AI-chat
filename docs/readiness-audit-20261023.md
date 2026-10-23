# 开发者分享前修复审查

基线：GitHub `main`，`2cf8d342592cdffdefa10067ff11dcbbfbd4a0a6`；GitHub 连接器已核对。修复在独立功能分支 `codex/developer-readiness-20261023`。

| 项目 | 处理与边界 |
| --- | --- |
| 1. LLM 长等待 | 共享 30 秒默认预算，覆盖网络连接、DNS 等待、持续慢速流、重试及回退；网络线程最多 8 个，超时线程只做网络工作，不能执行工具或写记忆。系统 DNS 无法强制取消，后台线程可能延迟退出。 |
| 2. 备份入库 | GitHub 基线已有 `*.bak`，补 `*.tmp`、轮转日志忽略规则；本机共享 Git exclude 也保护原工作区的七个备份，已逐一验证。 |
| 3. 明文 HTTP | 所有公共 LLM HTTP/流式传输入口拒绝远程明文、HTTPS 降级和跨主机重定向，本机 loopback 兼容。原中转端口的无凭据 TLS 探测失败，未擅自改写私人配置；服务商正确 HTTPS 地址仍待提供。 |
| 4. 重复加载 | 基线已有模型窗口脚本筛选，补排除语音 VAD、Galgame 和 QQ 控制器；两个窗口按可见状态延后模型加载，已加载的渲染器保留。 |
| 5. 调试脚本 | 四个较大调试控制器移入开发模式加载器，保留加载顺序与开发入口。 |
| 6. 缓存 | 公共静态资源使用可存储、需重新验证策略；API、配置、页面禁存储，开发模式可全面禁缓存。 |
| 7. 日志 | 正常连接关闭静默停止处理；访问日志按需写 stdout；Electron 后端日志按大小轮转。没有删除原工作区旧日志。 |
| 8. 大文件 | GET 分发移至 `app_get_routes.py`，网络预算和日志轮转独立成模块。没有为压低文件大小批量重写记忆或角色行为；后续仍可按功能逐步拆分。 |
| 9. 状态历史 | 已完成功能移入 `docs/archive/features-completed-2026-10-23.json`，完整进度和交接原文归档。主文件保留活动/未完成事项；AGENTS 改为按需读历史。 |
| 10. 工作区 | 删除 Git 跟踪且无引用的 `__head_memory.py`，可从基线恢复。核查 11 个 worktree，无失效注册；移除已合并、无改动且无忽略文件的 sticker worktree，保留分支可恢复；其他目录保留，清单见 inventory。投稿工具移入独立目录并保留旧启动兼容；散落文件移动记录在本机恢复清单。 |
| 11. 依赖 | 固定六个直接运行依赖，单独记录依赖解析验证；不把全局混杂环境的冲突包冒充为可靠锁文件。 |

## 验证证据

- Python 全量及新增预算、缓存、断连测试：最终结果见 `progress.md`。
- Node 全量与新增按需加载/日志轮转测试：最终结果在 `progress.md`。
- 真实云端对话、私人 TTS、有声听评和真实 Electron 两窗口视觉验收未执行，不等同于已验证这些体验。
- 原全局 Python 环境 `pip check` 有既有的 chromadb/gradio/torchmetrics 等依赖冲突；使用隔离环境安装，不能直接复制全局 freeze。

## 本机整理的恢复

`D:/AI/local-backups/workspace-organize-20261023/move-manifest.json` 记录每个源路径和目标路径。未删除音频、补丁或临时输出。
投稿工具的 `.env`、`.secrets`、jobs、logs、输入输出仍使用原父目录；旧 Python 启动入口保留，迁移前后 `publish.py --help` 通过。
worktree 的 merged 状态来自与已核实 `origin/main` 的祖先关系；它不能证明目录中的忽略文件可以删除。`git worktree prune` 只清理失效注册，不用于删除有内容的工作区。

- 干净依赖解析尝试：`pip install --dry-run --ignore-installed -r requirements.txt` 下载阶段因 files.pythonhosted.org 读取超时失败；未修改全局环境，不能声称干净安装通过。六个直接依赖版本来自现有环境，pytest 也已固定。

## 修改文件

- `.gitignore`
- `AGENTS.md`
- `README.md`
- `__head_memory.py`
- `app.py`
- `app_chat_route.py`
- `app_get_routes.py`
- `app_tts_route.py`
- `config.example.json`
- `docs/archive/2026-10-23-progress.md`
- `docs/archive/2026-10-23-session-handoff.md`
- `docs/archive/features-completed-2026-10-23.json`
- `docs/developer-sharing.md`
- `docs/readiness-audit-20261023.md`
- `docs/worktree-inventory-20261023.json`
- `electron/main.js`
- `electron/rotatingLog.js`
- `feature_list.json`
- `galgame_director.py`
- `llm_client.py`
- `llm_deadline.py`
- `llm_diagnostics.py`
- `llm_runtime.py`
- `llm_streaming.py`
- `llm_tool_calls.py`
- `progress.md`
- `requirements-dev.txt`
- `requirements.txt`
- `scripts/run_node_tests.js`
- `session-handoff.md`
- `tests/test_app_chat_route.py`
- `tests/test_app_tts_route.py`
- `tests/test_character_runtime_frontend.js`
- `tests/test_llm_deadline.py`
- `tests/test_performance_cue_frontend.js`
- `tests/test_readiness_http.py`
- `tests/test_readiness_resources.js`
- `tests/test_stage_frontend.js`
- `web/appStartupController.js`
- `web/devFeatureLoader.js`
- `web/index.html`
- `web/viewScriptLoader.js`
