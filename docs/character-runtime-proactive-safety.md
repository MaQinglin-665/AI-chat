# Character Runtime Proactive Safety

## Scope

This document defines the safety boundary for future Character Runtime proactive behavior.

Current status: proactive Character Runtime scheduling is an experimental skeleton. It is not enabled by default and is not wired as a public default desktop behavior.

## Default Policy

Default behavior must remain quiet:

- no surprise proactive messages
- no automatic desktop observation
- no shell/tool execution
- no file reading
- no private screen capture
- no required `character_runtime` response field

Any proactive behavior must be explicitly enabled by configuration or a deliberate local debug/demo action.

## Required Gates

A proactive action may only be considered when all of these are true:

| Gate | Required state |
| --- | --- |
| Explicit proactive switch | enabled |
| Low-interruption guard | disabled for this experimental path |
| Runtime phase | `idle` |
| Recent user activity | outside the configured user idle window |
| Recent assistant activity | outside the configured assistant idle window |
| Cooldown | elapsed |
| User rollback | available immediately |

If any gate fails, runtime state should explain the block reason.

## Runtime Block Reasons

The runtime snapshot can expose safe diagnostic reasons:

| Reason | Meaning |
| --- | --- |
| `proactive_disabled` | explicit proactive switch is off |
| `low_interruption_enabled` | low-interruption mode is still blocking proactive actions |
| `phase_not_idle` | character is listening, thinking, or speaking |
| `recent_user_activity` | user was active too recently |
| `recent_assistant_activity` | assistant spoke too recently |
| `cooldown_active` | proactive cooldown has not elapsed |
| empty string | no current block after a proactive directive is emitted |

These reasons must not include user text, prompts, file paths, screenshots, API keys, or memory content.

## Developer Skeleton

The standalone `CharacterRuntime` scheduler supports an explicit proactive switch:

```python
runtime = CharacterRuntime(
    low_interruption=False,
    proactive_enabled=True,
    proactive_cooldown_sec=300,
    proactive_user_idle_sec=120,
    proactive_assistant_idle_sec=180,
)
```

This is for local development and tests. Do not treat this as a public default.

## Validation

Automated tests should verify:

- default runtime does not emit proactive directives
- low-interruption mode blocks proactive directives
- recent user activity blocks proactive directives
- recent assistant activity blocks proactive directives
- cooldown blocks repeat proactive directives
- emitted directives are explainable and contain no private data

Manual validation should record:

- proactive behavior was off in baseline config
- no proactive messages appeared during normal startup
- rollback switch was tested
- no desktop observation was enabled as part of proactive testing

Use:

- [Character Runtime Validation Log Template](./character-runtime-validation-log.md)
- [Character Runtime Demo Smoke Test Checklist](./character-runtime-smoke-test.md)

## Release Boundary

Do not describe proactive behavior as a mature companion feature until:

- default-off behavior is repeatedly verified
- triggers are documented and user-configurable
- privacy-sensitive inputs are opt-in and separately confirmed
- cooldown and recent-activity gates have tests
- rollback is visible and quick
- demo materials clearly label proactive behavior as experimental
