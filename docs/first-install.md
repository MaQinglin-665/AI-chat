# First Install Guide

本指南面向第一次从 GitHub 下载或克隆仓库的用户。当前项目仍是源码预览版，不是成熟的免安装 Windows installer。

## 目标

用尽量少的步骤完成：

1. 检查 Python / Node.js / npm。
2. 创建本地 `.venv` 并安装依赖。
3. 初始化 `config.json` 和 `.env`。
4. 应用当前预览体验配置。
5. 配置用户自己的 LLM provider / model / API key。
6. 跑一次首句 smoke check。
7. 启动 Electron 桌宠。

## 最省心入口

在仓库根目录双击：

```text
install_and_start.bat
```

或在 PowerShell 中运行：

```powershell
.\install_and_start.bat
```

这个入口会调用：

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\prepare-preview-environment.ps1 -RunLlmConfigure -RunSmoke -StartApp
```

它不是静默安装器。首次运行时可能会提示你：

- 安装缺失的 Python 3.10+ 或 Node.js 18+。
- 选择 LLM provider、base URL 和 model。
- 输入 API key。Key 会写入本地 `.env`，不会写入 `config.json`。

`-RunSmoke` 会在配置完成后发送一次很小的模型测试请求，用来提前发现模型名、API key、base URL 或网关兼容性问题。

## 更稳的分步路径

如果你想逐步排查，按这个顺序执行：

```powershell
.\prepare_preview_environment.bat
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\configure-llm.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\diagnose-llm-link.ps1 -SoftFail
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\first_chat_smoke.ps1
.\start_electron.bat
```

如果你只想安装依赖，不想应用预览角色配置：

```powershell
.\install_first_run.bat
```

## 常见阻塞

- `Python 3.10+ was not found`：安装 Python 3.10+，或允许脚本通过 winget 安装。
- `Node.js 18+ was not found`：安装 Node.js LTS，安装后重新打开 PowerShell。
- `No Live2D .model3.json found`：把 Live2D 模型放到 `web\models\`，并确认 `config.json` 的 `model_path`。
- `/api/llm_probe failed`：运行 `scripts\diagnose-llm-link.ps1 -SoftFail`，重点检查 API key、base URL、model 名称和模型响应时间。
- `npm install failed`：检查网络、代理或 npm 镜像。脚本默认使用 Electron 镜像降低下载失败概率。

## 安全默认值

首次安装路径不会默认开启：

- 桌面自动观察
- 截图上下文
- 用户文件读取
- 工具调用
- shell 执行

这些能力即使后续实现，也应该保持可配置、显式启用，并在高风险操作前要求用户确认。

## 反馈前请脱敏

提交 issue 或截图前，请移除：

- API key、token、Authorization header
- 原始 prompt / raw history
- 私有本地路径
- 私密桌面截图
- `config.local.json`、`.env`、完整运行日志中的敏感内容

安装问题可以使用 GitHub issue 里的 `First-Run Help` 模板。
