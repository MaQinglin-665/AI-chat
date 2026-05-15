# Windows 安装器 / Windows Installer

本页说明首次公开发布的 Windows 在线引导安装器。它面向普通 Windows 10/11 用户；源码测试包仍保留给开发者和早期测试者。

English summary: the preview installer is unsigned and guided; verify SHA256 and configure your own model provider after first launch.

## 发布资产 / Release Assets

发布资产固定为：

- `Xinyu-AI-Desktop-Pet-Setup-v{version}.exe`
- `Xinyu-AI-Desktop-Pet-v{version}-windows-source-test.zip`
- `SHA256SUMS.txt`
- 中英双语 release notes

安装器未内置 Python、Node.js、云模型、托管 endpoint 或 API key。它复制项目文件、创建快捷方式，然后运行 `install_and_start.bat`，由现有 bootstrap 检查 Python / Node / npm，缺失时提示用户通过 winget 安装。

## Install Behavior

- 默认安装到当前用户目录：`%LOCALAPPDATA%\XinyuAI\DesktopPet`
- 不要求管理员权限。
- 创建开始菜单快捷方式和桌面快捷方式。
- 安装完成后启动 `install_and_start.bat`。
- 不写入 API key。
- 不修改 Windows 安全策略。
- 不默认开启桌面观察、截图、文件读取、工具调用或 shell 执行。

## SHA256 与 SmartScreen / SHA256 And SmartScreen

首发安装包允许未签名，因此 release 页面必须同时提供 SHA256。

用户校验示例：

```powershell
Get-FileHash .\Xinyu-AI-Desktop-Pet-Setup-v1.4.0-preview.exe -Algorithm SHA256
Get-Content .\SHA256SUMS.txt
```

只有当安装器来自本仓库 release 且 SHA256 与 `SHA256SUMS.txt` 匹配时，才建议继续。SmartScreen 出现未知发布者提醒是未签名预览包的预期现象，不应要求用户关闭 SmartScreen 或修改系统安全设置。

## Build Locally

需要先安装 NSIS。

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\build-installer.ps1
```

CI / smoke 路径：

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\check_installer_smoke.ps1 -Version ci-smoke
```

通过后，`dist\` 下应能看到 installer exe、source zip 和 `SHA256SUMS.txt`。
