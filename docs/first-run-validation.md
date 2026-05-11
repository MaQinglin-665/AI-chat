# First-Run Validation

本模板用于记录一次干净 Windows 首跑验收。它不是成熟商业产品认证，而是为了判断当前源码测试包是否已经达到“早期用户可跑、失败可排障、默认安全”的最低门槛。

建议每次准备公开 preview 前复制一份本模板内容到 release notes、issue、PR 描述或本地验收记录中。

## Scope

- Package/source:
- Installer:
- Commit / branch:
- Tester:
- Date:
- Machine:
- Windows version:
- Network notes:
- Python before install:
- Node before install:

## Package Preparation

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\package-source-test.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\check_first_run_package.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\check_installer_smoke.ps1
```

- [ ] Source-test zip created.
- [ ] Installer exe created.
- [ ] `SHA256SUMS.txt` created.
- [ ] Package does not include `.env`, `.venv`, `config.json`, `config.local.json`, logs, `node_modules`, or generated images.
- [ ] Package includes `install_and_start.bat`, `install_first_run.bat`, `docs\first-install.md`, `docs\installer.md`, `scripts\bootstrap-first-run.ps1`, `scripts\configure-llm.ps1`, and `scripts\first_chat_smoke.ps1`.

## Installer Install

Run from the release assets:

```powershell
Get-FileHash .\Xinyu-AI-Desktop-Pet-Setup-v1.4.0-preview.exe -Algorithm SHA256
Get-Content .\SHA256SUMS.txt
.\Xinyu-AI-Desktop-Pet-Setup-v1.4.0-preview.exe
```

Record:

- SHA256 matched: yes / no
- SmartScreen appeared: yes / no
- Installed without admin: yes / no
- Start Menu shortcut created: yes / no
- Desktop shortcut created: yes / no
- `install_and_start.bat` launched after install: yes / no

## Clean Install

Run from the extracted package:

```powershell
.\install_and_start.bat
```

Record:

- Bootstrap result: READY / ACTION / FAIL
- Python installed by user or winget:
- Node installed by user or winget:
- `.venv` created: yes / no
- `node_modules` installed: yes / no
- `config.json` created: yes / no
- `.env` created with `TAFFY_API_TOKEN`: yes / no
- Live2D `model_path` auto-detected: yes / no / manual
- Warnings:
- Blockers:

No-go if bootstrap cannot explain what the user must do next.

## LLM Configuration

Record:

- Configured by app wizard / configure-llm.ps1:
- Provider:
- Base URL:
- Model:
- API key env:
- API key stored in `.env`: yes / no
- API key absent from `config.json` and `config.local.json`: yes / no
- `/api/first_run/status` does not return key: yes / no
- `/api/first_run/configure_llm` requires token: yes / no
- Ollama running, if selected: yes / no / not applicable

No-go if the only working path requires putting a real API key into JSON.

## First Chat Smoke

For a real release decision, run at least one real LLM probe or chat request:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\first_chat_smoke.ps1
```

If avoiding provider usage during preliminary testing:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\first_chat_smoke.ps1 -SkipLlmProbe -SkipChat
```

Record:

- Preflight result:
- Backend started by smoke: yes / no, existing backend used:
- `/healthz`: pass / fail
- `/api/health`: pass / fail
- `/api/llm_probe`: pass / fail / skipped
- `/api/chat`: pass / fail / skipped
- Reply length:
- Errors or diagnostics:

No-go if real `/api/chat` cannot return a non-empty reply for the chosen release LLM profile.

## Desktop Launch

```powershell
.\start_electron.bat
```

- [ ] Electron windows open.
- [ ] Live2D model is visible.
- [ ] Chat UI can send a short message.
- [ ] First reply appears in the UI.
- [ ] Reply does not expose raw JSON, metadata, API key, token, or stack trace.
- [ ] 2-3 consecutive short messages do not hang or repeat the previous reply.
- [ ] Closing/relaunching does not leave confusing backend failures.

## Voice Baseline

- TTS provider:
- Browser TTS audible: yes / no / not tested
- Text chat remains usable if TTS fails: yes / no
- Long sentence playback complete: yes / no / not tested
- GPT-SoVITS tested: yes / no
- ASR tested: yes / no

## Safety Defaults

- [ ] `observe.attach_mode=manual`
- [ ] `observe.allow_auto_chat=false`
- [ ] `observe.auto_chat_enabled=false`
- [ ] `tools.enabled=false`
- [ ] `tools.allow_shell=false`
- [ ] No automatic desktop observation by default.
- [ ] No shell execution by default.
- [ ] No user file reads by default.

No-go if first-run instructions ask the user to relax these defaults.

## Decision

```text
Automated gate:
Package smoke:
Clean install:
LLM configuration:
First-chat smoke:
Desktop launch:
Voice baseline:
Safety defaults:

Allowed warnings:
Known issues:
Decision: go / no-go
Next fix:
```
