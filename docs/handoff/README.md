# 协作者交接说明（2026-10-23）

给帮忙优化本项目的协作者和 Codex 使用。开始前先读仓库根目录的 `AGENTS.md`，并遵守它的规则：不直接修改 main，一次只做一个目标，不提交密钥或私人数据。

## 分支情况

| 分支 | 内容 |
|---|---|
| `main`（2cf8d34，2026-09-11） | 最后一个公开版本 v1.4.0-preview.6 |
| `codex/speech-gesture-variation-20261002` | 说话手势变化、有表现力的说话、聊天界面精修、流式稳定性、记忆日志读取优化 |
| `codex/developer-readiness-20261023` | 基于 main：对话超时与连接失败处理、备份文件忽略、按需加载、日志轮转、拆分 GET 路由、固定依赖版本 |

**起点**：从 `codex/developer-readiness-20261023` 新建你的工作分支。

## 按顺序要做的任务

### 任务 1：LLM 流式时限与 HTTP 放行规则

补丁：`docs/handoff/patches/llm-transport-timing.patch`，在 readiness 分支上直接 `git apply` 即可。

- **长回复被截断**：`llm_deadline.network_chunks` 把 30 秒当成整条流的总时长，长回复或推理模型会在中途被截断。改成三层时限：等首批数据用 `turn_timeout_sec`（30 秒），开始输出后用空闲超时 `stream_idle_timeout_sec`（15 秒），整条流另有总上限 `stream_max_sec`（180 秒）。
- **HTTPS 限制太死**：原来只放行本机地址。现在本机、局域网、Tailscale（100.64/10）、`.local` 地址默认放行；其他远程 HTTP 需要显式设置 `llm.allow_insecure_http`，开启后记录一次警告。HTTPS 跳转到 HTTP 一律拦截。设置页的连接测试也遵守同一条规则。
- **报错看不懂**：新增两条诊断提示：`llm_insecure_http_blocked`（HTTP 被拦截）和 `llm_stream_stalled`（输出中断）。
- 已验证：相关测试 48 项全部通过；全量 Python 测试新增 18 项，原有结果不变。

### 任务 2：合并动作分支，修复嘴型同步

1. 合并：`git merge --no-ff origin/codex/speech-gesture-variation-20261002`。冲突处理原则：
   - `web/appStartupController.js`：逐块合并，两边的改动都要保留。
   - `llm_runtime.py`：以 readiness 版本为准，它已经包含 harness 的逻辑并增加了 `LLMTransportError`。
   - `web/chatApi.js`：取 harness 版本。
   - `.gitignore`：两边条目取并集。
   - 状态文件（`AGENTS.md`、`progress.md`、`session-handoff.md`、`feature_list.json`）：用 readiness 的精简格式，把 harness 新增的功能条目补进去。
2. 嘴型补丁：`docs/handoff/patches/lip-sync-bridge.patch`。它是基于 harness 版本的文件生成的，合并后如果上下文对不上，用 `git apply --3way`。
   - **桌宠模式下嘴卡住**：聊天窗口最小化后，嘴型广播不再依赖 `requestAnimationFrame`，改用约 60Hz 的定时器（调度类型 `hidden_speech`）。
   - **嘴型抖动**：analyser 的 `fftSize` 从 256 改为 1024，缓冲区按 `fftSize` 分配。原来只读到约 2.7ms 的波形，嘴型跟着单个波形抖。
   - **嘴比声音早**：按 `AudioContext.outputLatency` 延迟读取音量，最多 350ms，用来补偿蓝牙耳机等设备的输出延迟。
   - 新增测试 `tests/test_lip_sync_bridge_frontend.js`（修改前失败、修改后通过），全部 54 个 Node 测试通过。

每一步完成后都要跑：

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\test-local.ps1
```

完成后发 PR 到 main，由项目作者审核合并。

## 后续可以优化的方向（按优先级排）

1. **两个窗口重复加载**：模型窗口（`view=model`）也加载了约 100 个脚本，其中包括调试面板（`followupDebugController.js`、`grayTrial*`、`performanceTimelineController.js`）。可以按 view 分别加载，调试面板只在开发模式下加载（参考 `web/devFeatureLoader.js`）。
2. **静态资源完全不缓存**：`app.py` 的 `end_headers` 给所有响应都加了 `no-store`。只需要对 `/api/` 禁缓存，或者只在开发模式下禁。
3. **超大文件拆分**：`memory.py`（175KB）、`character_brain.py`（143KB）、`app.py`、`web/chat.js`、`web/chatReplyController.js`、`web/followupReadinessPanelController.js`（212KB）。每次只拆一个模块，测试覆盖不变。
4. **声音情绪**：Qwen3-TTS 现在 `dynamic_emotion_instruction=false`，所有台词都是同一个语气。可以按台词情绪传入语气指令，但要先做听评，确认音色稳定、延迟可以接受，不能顺带直接开启。
5. **清理远端旧分支和 PR**：远端约 19 个 4～5 月的旧分支，Dependabot 的 Electron 升级 PR 从 7 月开着。每一项先确认没有未合并的独有提交再删。

## 边界

- 不要提交 `config.json`、`config.local.json`、`.env`、`memory_*.json`、`*.bak`、`tts_ref/` 里的声音样本、日志，以及任何 API Key。
- 不要直接推送 main，不要强推，不要自动合并 PR。
- 测试需要真实模型时，请用你自己的 API Key，写在本机的 `.env` 里，不要提交。
- Electron 实机、语音、嘴型的效果，最终需要在 Windows 上实际看和听才能验收，自动化测试不能代替。PR 描述里写清楚哪些已经实测、哪些还没有。
