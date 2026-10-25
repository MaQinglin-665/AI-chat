# 全新 Windows venv 依赖验证（2026-10-24）

## 环境与范围

- 从 `codex/developer-readiness-20261023` 的 `86a93ca` 新克隆，工作分支为 `codex/clean-dependency-validation-20261024`。
- Windows 11 x64，系统版本 10.0.26300；CPython 3.12.9；项目内 Node 22.23.4 / npm 10.9.9；Electron 39.8.10；pip 26.2.2。
- `.venv` 从零创建，`include-system-site-packages=false`；没有复制旧环境的包、配置、记忆或语音样本。下载使用了现有 wheel 缓存，因此这是干净 venv 验证，不是重装 Windows 或冷下载测试。
- 先按公开默认配置验证安装；随后经用户明确要求，仅在被 Git 忽略的本地配置中接入其现有 Harness 本机接口，补测真实模型。凭据和个人路径不进入本报告或提交。

## 实测结果与修复

原始 `requirements.txt` 的六个直接依赖能够在新 venv 安装，开发依赖也成功安装，未发现解析冲突或漏列的必需 Python 包。`pip check` 通过，`edge_tts`、`mem0`、`webview`、`qdrant_client`、`sentence_transformers`、`vosk` 和 `pytest` 均真实导入成功，不仅检查包是否存在。

安装和启动路径发现并修复：

1. **Node 路径不一致**：bootstrap 支持 `.local-tools/node22`，批处理启动入口仍直接调用全局 `node` / `npm`。新增 `scripts/start-electron.ps1`，复用既有 Node 解析器，并让批处理转交此入口。在没有全局 Node 的 PATH、带空格的临时目录中验证了项目内 Node、Electron 参数和错误退出码传递。
2. **PowerShell 5.1 的 JSON BOM**：自动选择唯一模型和应用预览配置使用 `Set-Content -Encoding UTF8`，会写出 BOM，Electron `JSON.parse` 报 `Unexpected token`。两处写入改为无 BOM UTF-8；回归测试调用实际 PowerShell 脚本/函数，重放后的两个配置可直接由 Node `JSON.parse` 读取，并保留已有模型选择等设置。
3. **安装成功不足以证明可运行**：bootstrap 现在在 pip 安装后执行依赖一致性和真实导入检查，损坏的原生导入、超时、测试依赖缺失会使安装返回失败。
4. **依赖可重现性**：`requirements-win-py312-constraints.txt` 记录本次成功环境的 84 个运行/开发依赖版本。`requirements.txt` 自动引用它；每条约束只匹配 Windows x64 / Python 3.12，不把本平台版本强加给其他系统或 Python。`--dry-run --ignore-installed` 重新解析的全部 84 个版本与实际安装一致。
5. Node 安装有 lockfile 时使用 `npm ci`；保留用户显式设置的 `ELECTRON_MIRROR`。本地检查优先使用项目 `.venv`，不要求先激活或依赖全局 pytest。

未新增第三方依赖，未修改运行时安全开关或聊天/角色行为。

## 复现命令

在新的 Windows x64 目录克隆对应分支，安装 Python 3.12 后：

```powershell
# 已有 Node 20/22 与 npm 时可跳过这一步；它只安装到当前项目目录。
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\install-node22-local.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\bootstrap-first-run.ps1 -Dev -SkipToolInstall
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\prepare-preview-environment.ps1 -SkipToolInstall -SkipPythonDeps -SkipNodeInstall
.venv\Scripts\python.exe scripts\check_python_dependencies.py --dev
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\test-local.ps1
.\start_electron.bat
```

若尚未配置自己的模型，preflight 提示缺少模型密钥是预期结果，不能因此宣称真实模型验收已完成。应用内完成配置后，可运行：

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\first_chat_smoke.ps1 -NoStartServer -Message "Please reply with OK only."
```

依赖解析复核命令（不安装或修改环境）：

```powershell
.venv\Scripts\python.exe -m pip install --dry-run --ignore-installed --report .local-dependency-resolution.locked.json -r requirements-dev.txt
```

更新约束时必须从新 venv 解析、实装并重跑导入及完整检查；不要从日常混用环境直接 freeze 覆盖。此文件是版本约束快照，未使用 wheel 哈希锁定，也未验证 Python 3.10/3.11/3.13、ARM64、Linux 或 macOS。可选 SenseVoice/FunASR 服务保持原有隔离安装方式，未纳入本次范围。

## Verification Evidence

- 原始运行依赖、开发依赖安装成功；修复后完整 `bootstrap-first-run.ps1 -Dev -SkipToolInstall` 成功执行依赖检查与 `npm ci`（87 个 Node 包）。
- `pip check` 无冲突；六个运行时模块和 pytest 导入通过；空环境解析与实际安装的 84 个版本一致。
- 首轮完整本地检查：738 个 Python 测试、全部 Node 测试、Python/JS 语法与 secret scan 通过；Python 有一条 Hugging Face Windows symlink 缓存警告。
- 新增/收窄的安装回归：9 passed（含两个 PowerShell 编码用例）。最终完整本地检查：**740 Python tests passed**（67.05s），全部 Node suites、165 个 Python 文件语法、191 个 JavaScript 文件语法与 714 个文本文件的 secret scan 通过。
- 文档贡献指南要求的 `npm --prefix docs run check:all` 通过：发布检查和 4 个真实 Chromium smoke tests（9.4s）。最初缺少 Playwright 浏览器，下载到项目内忽略目录后重跑通过；仅有环境颜色变量提示。
- 实际启动了新安装的 Electron 与其自身 venv 后端；首次模型配置向导可显示，健康接口正常。配置生成修复后，Node 可直接解析两个生成的 JSON。
- 用户授权复用本机 Harness 后：模型 probe 通过，`first_chat_smoke.ps1 -NoStartServer` 通过，`/api/chat` 返回 2 字符回复。smoke preflight 有 5 条警告：现有健康后端占用端口，以及预览配置的 4 条 opt-in 提示。未宣称零警告。

## 仍需单独处理

原起始分支的普通前端模式仍出现 `Cannot read properties of null (reading 'syncProactiveSchedulerPolling')`：运行时控制器未加载，独立于 Python 包安装和上述 BOM 问题。本 PR 记录该启动验收缺口，不包含聊天前端重构或角色功能修改。后端健康、模型 probe、真实首句通过，不等于普通前端全部可用。

未做蓝牙/有线音频、最小化嘴型、真实麦克风打断或小时级稳定性验收；也未构建或发布安装包。

## 文件与隐私边界

仅安装入口、依赖文件、针对性测试、开发说明和三个任务状态文件有意修改。`.venv`、`node_modules`、本地工具、生成的配置、`.env`、依赖解析报告、模型测试日志和运行时数据均保持忽略，不提交、不打包。未修改已有桌宠安装。
