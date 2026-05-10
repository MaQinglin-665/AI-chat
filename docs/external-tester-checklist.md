# External Tester Checklist

Use this checklist when trying the Taffy v1.4 preview from a source test
package. It helps separate setup problems, model problems, and character
experience problems.

Please do not share API keys, tokens, raw prompts, raw history, private file
paths, or private desktop screenshots in public issues.

## Tester Environment

- Windows version:
- Python version:
- Node.js version:
- Launch path:
  - `prepare_preview_environment.bat`
  - `install_first_run.bat`
  - manual setup
- Package source:
  - GitHub Release source-test zip
  - `main` branch clone
  - other:

## Model Configuration

- Provider type:
  - OpenAI-compatible
  - OpenAI
  - DashScope/Qwen
  - Ollama
  - other:
- Model name:
- Base URL host only, no key:
- Did `scripts\diagnose-llm-link.ps1 -SoftFail` pass?
- Did model probe reach at least 80% success?
- Typical reply time:
  - under 5 seconds
  - 5-15 seconds
  - over 15 seconds
  - unstable / timeout

## First Run

- `prepare_preview_environment.bat` completed:
  - yes
  - no
  - not used
- `scripts\configure-llm.ps1` completed:
  - yes
  - no
  - not used
- `scripts\first_chat_smoke.ps1` completed:
  - yes
  - no
  - skipped LLM probe
  - skipped chat
- `start_electron.bat` opened the app:
  - yes
  - no

## UI Smoke

- Live2D model visible:
  - yes
  - no
- Text chat works:
  - yes
  - no
- Browser TTS speaks:
  - yes
  - no
- Long TTS reply finishes without losing the tail:
  - yes
  - no
- Mouth movement releases after speech:
  - yes
  - no
- Expression/motion returns to idle:
  - yes
  - no
- `/doctor` is readable and does not leak secrets:
  - yes
  - no
- `/braindebug` is read-only and does not trigger TTS/motion/tools:
  - yes
  - no

## Taffy Feeling

Try these English inputs:

```text
What are you doing?
This desk feels weird.
You were wrong.
I finished it.
I feel bad.
What next?
I'm going to sleep.
```

Mark what you noticed:

- Replies feel like Taffy, not a generic assistant:
  - yes
  - partly
  - no
- Replies stay in English:
  - yes
  - no
- Customer-service closers are rare:
  - yes
  - no
- Taffy does not over-ask follow-up questions:
  - yes
  - no
- Spontaneous replies are visible:
  - yes
  - no
- Spontaneous replies are not too noisy:
  - yes
  - no
- Motions match the text and voice:
  - yes
  - partly
  - no
- Comfort/task/closing scenes stay restrained:
  - yes
  - no

## Notes To Share

Useful details:

- The exact command that failed.
- The final error line.
- Redacted output from `scripts\diagnose-llm-link.ps1 -SoftFail`.
- Whether the failure happens before the app opens, after the app opens, during
  model probe, during TTS, or only during longer conversations.
- A short description of what felt generic, noisy, slow, or broken.

Do not share:

- API keys or tokens.
- Full `config.local.json`.
- Full `.env`.
- Raw private chat history.
- Private desktop screenshots.
