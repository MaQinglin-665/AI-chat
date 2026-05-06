# Gray Automatic Follow-up Controlled Trial Runbook

This runbook is for local controlled testing only. Automatic follow-up remains default-off.

## Safety Rules

- Do not run this during normal use.
- Do not enable desktop observation, screenshots, file access, shell execution, tool calls, or backend APIs.
- Keep `gray_auto_trial_max_triggers_per_session=1` unless intentionally testing the cap.
- Use emergency stop first if anything feels wrong.
- Disarm after every trial.

## DevTools Commands

```js
const d = window.__AI_CHAT_DEBUG_TTS__;
d.grayAutoFollowupTrialPreflight();
d.grayAutoFollowupTrialSession();
d.grayAutoFollowupTrialEvents();
d.grayAutoFollowupTrialRunbook();
d.followupReadiness();
```

`grayAutoFollowupTrialRunbook()` is read-only. It returns this command list and the safety checklist, but it does not arm, disarm, stop, reset, start polling, or trigger follow-up.

## Readiness Panel Status Card

The follow-up readiness panel also includes a gray automatic trial status card.

- It summarizes preflight status, armed/polling state, session count, dry-run intent, blocked reasons, recent poll events, and the next safe step.
- It is read-only and refreshes with the rest of the readiness panel.
- It does not arm, disarm, stop, reset, start polling, trigger follow-up, or write config.

Arm only during a local controlled test:

```js
d.armGrayAutoFollowupTrial({ confirm: "ARM_GRAY_AUTO_TRIAL" });
```

Stop or disarm:

```js
d.stopGrayAutoFollowupTrial("manual_stop");
d.disarmGrayAutoFollowupTrial("manual_disarm");
```

Reset the session counter only when intentionally preparing another capped attempt:

```js
d.resetGrayAutoFollowupTrialSession();
```

## Trial Steps

1. Run `grayAutoFollowupTrialPreflight()` and record the status.
2. Confirm session cap is `1` with `grayAutoFollowupTrialSession()`.
3. Optional: run `grayAutoFollowupTrialRunbook()` and confirm it only returns guidance.
4. Arm with the exact confirmation phrase.
5. Watch `grayAutoFollowupTrialEvents()` for poll start, blocked, ready, or trigger events.
6. If one automatic trigger succeeds, confirm the cap stops further automatic polling.
7. Run `disarmGrayAutoFollowupTrial("trial_complete")`.
8. Confirm `followupReadiness()` shows `armed=false` and polling off.

## Success Criteria

- No automatic behavior happens before explicit arm.
- Existing guards still block when silence, cooldown, policy, busy/speaking, or window limits are not satisfied.
- At most one successful automatic trigger happens with the default session cap.
- Emergency stop and disarm both stop polling.
- No config file is written.

## Rollback

```js
d.stopGrayAutoFollowupTrial("rollback");
d.disarmGrayAutoFollowupTrial("rollback");
```

Restart the app if you want to clear all renderer-memory trial state.
