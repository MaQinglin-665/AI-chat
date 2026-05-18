# 首次安装指南 / First Install Guide

本指南面向第一次从 GitHub release 下载的 Windows 用户。当前项目仍是 MVP preview，不是成熟商业产品；首发推荐使用 Windows 在线引导安装器，源码包保留给开发者和早期测试者。

English summary: use the Windows guided installer first, verify SHA256, then configure your own model provider in the in-app first-run wizard.

## 目标

用尽量少的步骤完成：

1. 检查 Python / Node.js / npm。
2. 创建本地 `.venv` 并安装依赖。
3. 初始化 `config.json` 和 `.env`。
4. 应用当前预览体验配置。
5. 启动 Electron 桌宠。
6. 在应用内首次配置向导里配置用户自己的 LLM provider / model / API key。

## 最省心入口：安装器 / Recommended Installer Path

在 release 页面下载：

```text
Xinyu-AI-Desktop-Pet-Setup-v1.4.0-preview.6.exe
SHA256SUMS.txt
```

安装器默认安装到当前用户目录，不需要管理员权限；安装后会创建开始菜单和桌面快捷方式，并启动 `install_and_start.bat`。安装器不内置 Python、Node.js、云模型、托管接口或 API key。

首发安装器未签名。运行前请校验 SHA256：

```powershell
Get-FileHash .\Xinyu-AI-Desktop-Pet-Setup-v1.4.0-preview.6.exe -Algorithm SHA256
Get-Content .\SHA256SUMS.txt
```

如果 Windows SmartScreen 出现未知发布者提醒，只有在文件来自本仓库 release 且 SHA256 匹配时才继续。

## 源码包入口

如果你下载的是源码测试 zip 或 clone 仓库，在根目录双击：

```text
install_and_start.bat
```

或在 PowerShell 中运行：

```powershell
.\install_and_start.bat
```

这个入口也是安装器完成复制后启动的脚本。它会调用：

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\prepare-preview-environment.ps1 -StartApp
```

它不是静默安装器。首次运行时可能会提示你：

- 安装缺失的 Python 3.10+ 或 Node.js 18+。
- 启动应用内首次配置向导。
- 在向导里选择 LLM provider、base URL 和 model。
- 输入 API key。Key 会写入本地 `.env`，不会写入 `config.json`。

如果需要高级排查，可以手动运行 `scripts\first_chat_smoke.ps1`。它会发送一次很小的模型测试请求，用来提前发现模型名、API key、base URL 或网关兼容性问题。

## 应用内首次配置 / In-App Model Setup

首次启动或 LLM 配置不完整时，聊天窗口会显示“首次模型配置”向导。默认 provider 是 `openai-compatible`，默认 API key env 名称是 `TAFFY_LLM_API_KEY`。

保存时：

- provider / base URL / model / API key env 写入 `config.local.json`
- 真实 API key 写入 `.env`
- 界面不会回显真实 key
- 保存后自动调用 `/api/llm_probe`，显示成功或可读失败原因

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

## 安全默认值 / Safety Defaults

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
