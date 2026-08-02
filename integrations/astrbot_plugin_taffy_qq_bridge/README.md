# Taffy QQ Desktop Bridge

Install this directory into AstrBot's `data/plugins/` directory, then restart
AstrBot. It is a transport-only plugin: it never uses AstrBot's LLM, memory,
tools, or TTS for OneBot QQ events.

Set these environment variables on the Tencent Cloud AstrBot container, never
in this repository:

```text
TAFFY_QQ_BRIDGE_ENABLED=1
TAFFY_QQ_BRIDGE_TOKEN=<a long random secret>
```

Alternatively, an AstrBot service bound to `127.0.0.1` and exposed only by
Tailscale Serve to a trusted tailnet can use:

```text
TAFFY_QQ_BRIDGE_ENABLED=1
TAFFY_QQ_BRIDGE_AUTH_MODE=tailnet
```

Tailnet-only mode deliberately disables the bearer-token check. Never use it
for a public or LAN-reachable service.

The desktop pet's QQ control center uses the same token through its local
`.env` entry, normally `TAFFY_QQ_BRIDGE_TOKEN`, when token mode is selected.
For tailnet-only mode select `仅 Tailscale 私网` in the control center and do
not set a token. Enter the plugin's externally
reachable web-API base URL in that control center; it must be the base URL
whose child endpoints are `/poll`, `/reply`, and `/send`. Copy the actual URL
from the AstrBot plugin/web-API registration for the installed AstrBot version
instead of guessing a route prefix.

Keep the AstrBot dashboard behind HTTPS and restrict its public access. The
plugin itself still verifies the bearer token. NapCat and AstrBot credentials,
QR codes, sessions, and runtime queue data stay outside this repository.

Version 0.1 deliberately carries text only. It queues OneBot messages while
the desktop is unavailable and never invokes AstrBot's LLM, tools, memory, or
TTS. Do not expose this plugin before both the bearer token and a network
access policy are in place.
