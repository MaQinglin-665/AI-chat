# Model Selection for Taffy Preview

Taffy does not ship with a built-in cloud model or API key. Each tester chooses their own model provider, endpoint, model name, and key.

This is intentional: model choice affects cost, privacy, latency, output quality, and whether the character feels like an AI VTuber instead of a slow chatbot.

## Supported Routes

- OpenAI-compatible cloud or relay endpoints that support `/v1/chat/completions`.
- DashScope / Qwen through its OpenAI-compatible endpoint.
- OpenAI API.
- Local Ollama models.

Do not put private API keys into `config.json`. Use `scripts\configure-llm.ps1`; it writes provider settings to `config.local.json` and stores keys in `.env`.

## What Makes a Good Taffy Model

For daily Taffy experience testing, prefer a model that:

- Passes `scripts\diagnose-llm-link.ps1`.
- Reaches at least 80% success in `scripts\model_acceptance_probe.py`.
- Usually replies in under 15 seconds.
- Returns visible English text reliably.
- Supports short, natural replies without heavy reasoning-only output.
- Does not require unusual request shapes beyond OpenAI-compatible chat completions.

A very smart but slow model can make Taffy feel less alive. For character tuning, a stable fast model is usually better than a large model that often stalls or returns empty text.

## Recommended Check Flow

After running `scripts\configure-llm.ps1`, run:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\diagnose-llm-link.ps1
python scripts\model_acceptance_probe.py --attempts 5 --timeout-sec 14 --soft-fail
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\first_chat_smoke.ps1
```

Interpretation:

- `diagnose-llm-link.ps1` should pass before you judge the app experience.
- If probe success is below 80%, fix the provider/model/key/base URL first.
- If normal replies exceed 15 seconds, switch to a faster model for daily testing.
- If the model returns empty text, try a non-reasoning model or reduce reasoning-heavy settings.

## Provider Notes

### OpenAI-Compatible Endpoints

Use this when your provider exposes an OpenAI-compatible `/v1/chat/completions` API.

Required inputs:

- provider: `openai-compatible`
- base URL: provider endpoint, usually ending in `/v1`
- model: exact provider model name
- API key env: for example `TAFFY_LLM_API_KEY`

If diagnostics say `remote_closed_connection`, the host is reachable but the gateway closed the socket during the chat request. That usually means the endpoint, model, compatibility layer, or provider stability needs review.

### DashScope / Qwen

Use the DashScope option when you want the built-in helper defaults for Qwen-compatible setup.

Required input:

- API key stored through `DASHSCOPE_API_KEY`

### OpenAI API

Use the OpenAI option when you want the official OpenAI endpoint.

Required input:

- API key stored through `OPENAI_API_KEY`

### Ollama

Use Ollama when you want a local model.

Requirements:

- Ollama is running.
- The model is pulled locally.
- Your hardware can reply quickly enough.

Example check:

```powershell
ollama list
ollama pull qwen2.5:7b
```

Local models may be private and cheap to run, but lower-end hardware can make replies too slow for a VTuber-style experience.

## Common Failures

- `api_key_missing`: configure an API key through `.env`, or choose a local provider that does not need one.
- `auth_rejected`: the key is invalid, expired, out of quota, or lacks access to the model.
- `model_not_found`: the model name is not available on that provider.
- `local_llm_service_unreachable`: local Ollama or another local server is not running.
- `remote_closed_connection`: the gateway is reachable but closes the OpenAI-compatible chat request.
- `provider_timeout`: the model or gateway is too slow for the configured timeout.
- `empty_model_text`: the model returned no visible text; try another model or reduce reasoning-heavy settings.

## Privacy Boundary

The diagnostic scripts are read-only. They do not print API key values, raw prompts, raw chat history, Authorization headers, or private local files.
