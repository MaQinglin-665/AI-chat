# Contributing Guide

感谢你参与这个项目。

本项目是一个开源 Windows 桌面 AI 伙伴 / 桌面 AI VTuber 实验项目，欢迎围绕稳定性、体验和可扩展性持续贡献。

## Good First Contribution Areas

- 首次启动体验（First Run）和配置引导可用性
- 稳定性修复（崩溃、异常恢复、错误提示）
- Live2D 交互体验（动作、表情、状态反馈）
- 对话体验（低打扰策略、语气一致性、记忆可控性）
- 文档与示例（README、配置文档、排障说明）
- 自动化测试与 CI 质量保障

## Local Run

### Prerequisites

- Windows
- Python 3.10+
- Node.js

### Get The Source

推荐使用 Git 克隆当前 `main` 分支：

```powershell
cd D:\Hbuildrx
git clone https://github.com/MaQinglin-665/AI-chat.git AI-chat-main
cd AI-chat-main
```

如果 GitHub 连接不稳定，可以在项目首页使用 `Code` -> `Download ZIP` 下载 `main` 分支源码。不要把旧 Release 的源码包当作最新开发源码。

下载或解压后，先做完整性检查：

```powershell
dir electron
dir web
dir tests
dir scripts
dir package.json
```

如果 `tests`、`web` 或 `electron` 不存在，请重新下载 `main` 分支源码后再继续。

### Setup

```powershell
powershell -ExecutionPolicy Bypass -File scripts\doctor.ps1
powershell -ExecutionPolicy Bypass -File scripts\setup-dev.ps1
```

### Run (Desktop)

```powershell
start_electron.bat
```

或双击：`一键启动桌宠.vbs`

### Run (Web Debug)

```powershell
start.bat
```

## Local Validation Before PR

```powershell
powershell -ExecutionPolicy Bypass -File scripts\test-local.ps1
```

`test-local.ps1` 会依次运行 Python 测试、拖拽逻辑 JS 测试、Python/JS 语法检查和 secret 扫描。

如果改动了 docs：

```powershell
cd docs
npm run check:all
```

## Issue Guidelines

- 先搜索是否已有同类 Issue，避免重复。
- 标题清楚描述问题/需求，正文包含复现步骤与期望行为。
- Bug 建议附带：系统版本、日志片段、截图（脱敏后）。
- Feature 请求请说明用户场景与收益，避免只给实现方案。

## Pull Request Guidelines

- 使用小而聚焦的 PR，避免混入无关重构。
- 建议分支命名：`feat/<name>`、`fix/<name>`、`docs/<name>`、`chore/<name>`。
- Commit message 建议使用：`feat:` / `fix:` / `docs:` / `chore:` / `ci:`。
- PR 描述需包含：
  - 改了什么
  - 为什么改
  - 如何验证
  - 风险点与回滚方式

## Security-Sensitive Changes

以下改动请在 PR 中显式标注“Security Impact”：

- `tools.py` 中与命令执行、权限白名单、shell 开关相关逻辑
- 鉴权、Token、CORS、接口暴露范围
- 截图、语音、记忆数据的采集/存储/发送路径

必须遵守：

- 不提交真实密钥、Token、隐私语音样本或可识别个人信息
- 不默认放宽危险能力（特别是 shell 执行）
- 不修改安全默认值来“换取方便”

## Code of Collaboration

- 保持尊重、可复现、可审查。
- 如果你准备提交较大改动，请先开 Issue 对齐方向。
