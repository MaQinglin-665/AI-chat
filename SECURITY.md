# Security Policy

## Reporting a vulnerability

Please report security issues privately by contacting the maintainer before opening a public issue.

## Security defaults

- `tools.allow_shell` is disabled by default.
- CORS is limited to loopback origins by default (`localhost` / `127.0.0.1` / `::1`).
- You can enable API token protection for `/api/*` by setting:
  - `server.require_api_token = true`
  - `server.api_token_env = "TAFFY_API_TOKEN"`
  - environment variable `TAFFY_API_TOKEN`

## Secret handling

- Do not commit real keys in `config.json` or `.env`.
- Rotate any key that has ever been stored in local files or terminal history.
