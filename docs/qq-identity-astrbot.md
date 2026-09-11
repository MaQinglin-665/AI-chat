# QQ identity via AstrBot and OneBot

This optional integration gives the desktop pet a configured QQ identity. The
desktop pet remains the only conversation brain: its normal persona, memory,
LLM, and desktop TTS are used. AstrBot and NapCat/OneBot v11 are transport only.

## Behaviour

- The QQ identity page stores a QQ number, bridge URL, authentication mode,
  and allowlisted private contacts/groups in `config.local.json`. It is off by
  default.
- The configured QQ number is included in the pet's prompt as its own
  long-term social identity. QQ turns use the same personality and memory.
- The cloud plugin queues OneBot text events; the desktop polls and returns
  text replies. QQ-originated turns cannot invoke desktop tools, shell,
  browser, files, observation, payments, or account actions.
- When the desktop is offline it sends nothing. Queued messages are considered
  only after it returns and before the configured expiry time.
- A desktop-initiated QQ message requires an explicit user instruction and an
  allowlisted target with a recent routed QQ conversation.

## Tencent Cloud deployment

1. Use the existing NapCatQQ + OneBot v11 adapter and verify the QQ account is
   already logged in on the AstrBot host.
2. Copy `integrations/astrbot_plugin_taffy_qq_bridge` to AstrBot's plugin
   directory, excluding its generated `data/` folder, and restart AstrBot.
3. Choose one authentication mode:
   - `token` (default): set `TAFFY_QQ_BRIDGE_ENABLED=1` and a long random
     `TAFFY_QQ_BRIDGE_TOKEN` in the cloud environment. Put the token only in
     a desktop environment variable, never a repository, URL, shell history,
     or plugin-settings export.
   - `tailnet`: set `TAFFY_QQ_BRIDGE_ENABLED=1` and
     `TAFFY_QQ_BRIDGE_AUTH_MODE=tailnet`. This deliberately has no shared
     bridge token. Use it only when AstrBot binds to `127.0.0.1` and is exposed
     exclusively with Tailscale Serve to a trusted tailnet.
4. Connect the desktop and cloud host to the same Tailscale tailnet. Keep the
   AstrBot port private. For the installed AstrBot v4.25 deployment, configure
   the bridge base URL as the private Tailscale Serve HTTP URL followed by
   `/api/plug/astrbot_plugin_taffy_qq_bridge`.
   The v4.25 dashboard middleware normally protects `/api/plug/` with a WebUI
   session. In tailnet mode, deploy the narrowly scoped persistent override
   that exempts only this plugin's `/poll`, `/reply`, and `/send` routes; do
   not exempt the rest of `/api`. The override is safe only with the localhost
   bind and trusted-tailnet conditions from step 3.
5. In the QQ identity page, select the mode matching the cloud plugin, enter
   the private URL, add allowlisted contacts/groups, then enable the identity.
6. Send one message from each target to establish a safe route. Test a reply,
   then test one explicitly confirmed desktop message.

## Boundaries

- Default QQ replies are text. Voice input/output and scheduled autonomous
  outreach are not enabled in v0.1.
- NapCat is non-official software. Review applicable QQ platform rules,
  account-risk policy, and NapCat/AstrBot licences before deployment.
- Never place a token in the bridge URL. URLs containing credentials, query
  strings, or fragments are rejected by the desktop configuration sanitizer.
- Tailnet-only mode trades the per-bridge secret for trusted Tailscale-network
  membership. Do not use it when any untrusted device can access that tailnet.
