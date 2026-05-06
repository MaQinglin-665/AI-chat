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
d.grayAutoFollowupTrialAuditSummary();
d.grayAutoFollowupTrialPreRunChecklist();
d.grayAutoFollowupTrialTimeline();
d.grayAutoFollowupTrialOutcome();
d.grayAutoFollowupTrialGoNoGoDecision();
d.grayAutoFollowupTrialSignoffPackage();
d.grayAutoFollowupTrialCharacterCuePreview();
d.grayAutoFollowupTrialCharacterCueHandoffChecklist();
d.grayAutoFollowupTrialCharacterCueManualEmitStatus();
d.grayAutoFollowupTrialCharacterCueManualEmitRecap();
d.grayAutoFollowupTrialCharacterExpressionStrategyDraft();
d.grayAutoFollowupTrialCharacterExpressionStrategyReviewPackage();
d.grayAutoFollowupTrialCharacterAutoRuntimeSafetyPlan();
d.grayAutoFollowupTrialCharacterAutoRuntimeDryRun();
d.emitGrayAutoFollowupTrialCharacterCue({ confirm: "EMIT_GRAY_AUTO_TRIAL_CHARACTER_CUE" });
d.followupReadiness();
```

`grayAutoFollowupTrialRunbook()` is read-only. It returns this command list and the safety checklist, but it does not arm, disarm, stop, reset, start polling, or trigger follow-up.

## Readiness Panel Status Card

The follow-up readiness panel also includes a gray automatic trial status card.

- It summarizes preflight status, armed/polling state, session count, dry-run intent, blocked reasons, recent poll events, and the next safe step.
- It is read-only and refreshes with the rest of the readiness panel.
- It does not arm, disarm, stop, reset, start polling, trigger follow-up, or write config.

## Readiness Panel Control Area

The follow-up readiness panel now includes a controlled gray trial operation area.

- `Arm 试运行` requires the exact `ARM_GRAY_AUTO_TRIAL` phrase.
- `Emergency Stop` seals the current renderer session and stops polling.
- `Disarm` closes the in-memory gray trial gates and stops polling.
- `Reset Session` requires the exact `RESET_GRAY_AUTO_TRIAL_SESSION` phrase and does not start polling.
- `复制审计` copies a compact read-only audit summary.
- `复制时间线` copies the recent gray trial control and polling event timeline.
- `复制角色预览` copies the read-only character cue preview after an explicit user click.
- `复制接入检查` copies the read-only character cue handoff checklist after an explicit user click.
- `复制回看` copies the latest manual character cue emit recap after an explicit user click.
- `复制策略` copies the read-only character expression strategy draft after an explicit user click.
- `复制评审` copies the read-only character expression strategy review package after an explicit user click.
- `复制计划` copies the read-only automatic character runtime safety plan after an explicit user click.
- `复制 dry-run` copies the read-only automatic character runtime dry-run after an explicit user click.
- `试发角色cue` requires the exact `EMIT_GRAY_AUTO_TRIAL_CHARACTER_CUE` phrase and emits the current preview runtime cue once.

Use the panel controls only during a local controlled test. `Arm 试运行` can open the existing in-memory trial gates, so keep the app watched and use `Emergency Stop` first if anything feels wrong. `试发角色cue` can send one character runtime metadata update after confirmation, so use it only when you are watching the character. The buttons do not write config, add desktop observation, capture screenshots, read files, execute shell commands, call tools, call backend APIs, request LLM output, play TTS, start polling, or trigger follow-up.

## Pre-run Checklist And Timeline

Before a real controlled trial, check the readiness panel sections:

- `灰度试运行前检查` shows required items such as explicit arm, visible polling state, session cap, emergency stop, disarm, and manual watch.
- `灰度试运行时间线` summarizes recent arm, poll, trigger, stop, disarm, reset, and dry-run events.
- `灰度试运行结果判定` summarizes whether the latest visible trial looks not started, blocked, trigger blocked, successful, stopped, or disarmed.
- `灰度试运行 Go/No-Go` summarizes whether the visible state is safe to watch, blocked, no-go, or ready for post-success review.
- `灰度试运行签收包` provides a copyable manual review template for deciding whether the trial result can advance to the next phase.
- `灰度试运行角色表现预览` shows the expected low-interruption character cue after the current visible trial state.
- `灰度试运行角色接入前检查` shows whether the preview is shaped well enough for a later explicit implementation task.
- These sections are read-only and do not emit new events, arm, reset, start polling, trigger follow-up, or write config.

The character cue preview is intentionally one step before real role behavior. It calls the pure preview builder for a runtime-hint-shaped object, but it does not call `maybeEmitFollowupCharacterRuntimeHint()`, does not send TTS, does not move Live2D, does not start automatic follow-up, and does not write config.

The handoff checklist is also preview-only. It checks read-only boundaries, metadata shape, Go/No-Go visibility, manual sign-off state, and scheduler isolation, but it always keeps `readyForRuntimeEmission=false`.

The manual emit gate is the first controlled bridge from preview data into real character runtime metadata. It requires the exact confirmation phrase every time, records one audit event, and keeps automatic emission closed.

The manual emit recap is read-only. It summarizes the in-memory emit count, latest cue metadata, recent manual emit events, and the next review step, but it does not emit another cue.

The expression strategy draft is read-only. It maps visible trial decisions and outcomes to candidate low-interruption character expressions for review, but it does not emit runtime cues or enable automatic role behavior.

The strategy review package is read-only. It summarizes the draft strategy, manual emit recap, handoff checklist, missing review items, and Go/No-Go for a separate implementation task. It never approves automatic runtime by itself.

The automatic runtime safety plan is read-only. It lists gates, rollout stages, and the next planning action for a later separate implementation task, while keeping automatic runtime disabled.

The automatic runtime dry-run is read-only. It shows whether the current state would select a strategy rule and which blockers would prevent automatic emission. It always keeps `wouldEmit=false`.

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
