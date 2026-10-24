# 协作者交接说明（更新于 2026-10-23，v1.4.0-preview.7 发布后）

给帮忙优化本项目的协作者和 Codex 使用。开始前先读仓库根目录的 `AGENTS.md` 和 `session-handoff.md`，并遵守 AGENTS.md 的规则：不直接修改 main，一次只做一个目标，不提交密钥或私人数据。

## 现在的状态

- **最新代码**：分支 `codex/developer-readiness-20261023`，即草稿 PR #210，和 `v1.4.0-preview.7` 指向同一个提交 `7f16520`。
- **main** 还停在 `2cf8d34`（preview.6），等作者实际验收后再合并 PR #210。
- **起点**：PR #210 合并前，从 `codex/developer-readiness-20261023` 新建工作分支；合并后改从 main 新建。

preview.7 已经包含以下内容，不要重复做：

| 提交 | 内容 |
|---|---|
| `863dd16` | 对话总时限、连接失败直接结束、`*.bak` 忽略、按需加载、日志轮转、拆分 GET 路由、固定直接依赖版本 |
| `1ae3b89` | 流式输出改用空闲超时（另有总上限）；本机和局域网允许 HTTP，其他地址需显式设置 `llm.allow_insecure_http`；新增诊断提示 |
| `be1e9f9` | 合并说话手势变化、有表现力的说话、聊天界面精修、流式稳定性 |
| `cba0fb2` | 窗口隐藏时嘴型广播改用定时器、analyser 窗口加到 1024、按设备输出延迟补偿 |
| `7f16520` | 默认使用 DeepSeek 官方 API（`https://api.deepseek.com`，`deepseek-flash`），发布 preview.7 |

> 以前这个目录里的 `patches/llm-transport-timing.patch` 和 `patches/lip-sync-bridge.patch` 已经分别提交为 `1ae3b89` 和 `cba0fb2`，**不要再应用**。

## 还没验收的（需要作者在 Windows 上实际操作）

1. 桌宠模式（聊天窗口最小化）下的嘴型和动作，蓝牙耳机和有线/外放各测一次。
2. 全新环境安装依赖，之前因为下载超时没跑完。
3. 小时级的稳定性和真实麦克风打断。

如果你的电脑能跑起来，可以帮忙做第 2 项，把结果写进 PR 描述。

## 可以接手的优化任务（按优先级）

每一项都单独开一个分支、单独发一个 PR。

1. **全新环境依赖验证**
   在干净的 Windows 环境（或新建的 venv）里，按 README 从零安装并启动一次，记录缺了哪些包、版本冲突和报错，然后修复安装脚本或 `requirements*.txt`。本次执行前只固定了直接依赖，间接依赖尚未锁定。
   2026-10-24 已在新的 Windows x64 / Python 3.12 venv 完成安装、真实导入、后端与首句验证，并补充此平台的间接依赖约束和安装入口修复；详见 [验证记录](../clean-dependency-validation-20261024.md)。普通前端仍有既有控制器加载错误，其他平台及听评未验收。
2. **拆分超大文件**
   `memory.py`（175KB）、`character_brain.py`（143KB）、`web/followupReadinessPanelController.js`（212KB）、`web/chat.js`（198KB）、`web/chatReplyController.js`（145KB）。每个 PR 只拆一个模块，只做机械移动，不改行为，现有测试必须全部通过。
3. **清理远端旧分支和 PR**
   远端约 22 个分支，大多是 4～5 月的；Dependabot 的 Electron 升级 PR 从 7 月开着。先用 `git log origin/main..<branch>` 确认每个分支有没有没合并的独有提交，列成清单交给作者确认，**不要自行删除**。Electron 升级单独评估、单独发 PR。
4. **声音情绪（需要先听评）**
   Qwen3-TTS 现在 `dynamic_emotion_instruction=false`，所有台词都是同一个语气。方案是按台词情绪传入语气指令，但必须先生成对比样本，交给作者听，确认音色稳定、延迟可以接受。不能直接默认开启。

## 边界

- 不要提交 `config.json`、`config.local.json`、`.env`、`memory_*.json`、`*.bak`、`tts_ref/` 里的声音样本、日志，以及任何 API Key。推送前运行 `python scripts\check_secrets.py`。
- 不要直接推送 main，不要强推，不要自动合并 PR。
- 测试需要真实模型时，请用你自己的 API Key，写在本机的 `.env` 里。
- 每次提交前运行 `powershell -NoProfile -ExecutionPolicy Bypass -File scripts\test-local.ps1`。PR 描述里写清楚哪些实测过，哪些只是自动化测试。
