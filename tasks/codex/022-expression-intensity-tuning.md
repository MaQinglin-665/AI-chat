# Task 022: Live2D expression intensity tuning

## Background
Task 009 connected runtime emotion hints to the Live2D expression layer.
Manual testing showed expression is present but still subtle, so this task focuses on tuning visible strength rather than changing the runtime contract.

## Goals
- Tune the current expression intensity so positive/negative cues are easier to notice in manual playback.
- Keep the change narrow and local to the existing Live2D expression path.
- Preserve the current behavior when Live2D is unavailable or expression support is disabled.

## Constraints
- No backend changes.
- No LLM prompt changes.
- No TTS changes.
- No new runtime metadata fields.
- No new dependencies.
- No unrelated motion/action refactor.

## Allowed scope
- `web/chat.js`
- `docs/character-runtime-integration-plan.md` (Task 022 landing notes)
- `tasks/codex/022-expression-intensity-tuning.md`

## Suggested tuning targets
- Expression pulse strength
- Mood hold duration
- Emotion-to-expression weighting
- Safe fallback for `idle/neutral` states

## Out of scope
- Action bridge changes
- Voice style changes
- Backend metadata schema changes
- Live2D model asset replacement
- Broader UI redesign

## Verification
- Manual check that speech-triggered expressions are visible but not exaggerated.
- Confirm idle return still works after speech ends.
- Confirm default behavior is unchanged when expression is disabled or the model is unavailable.
- Confirm no new errors in browser console during normal chat flow.

## Acceptance criteria
- Expression is more noticeable than the current baseline.
- The tuning stays local to the existing expression bridge.
- No regressions in chat text, TTS, or action behavior.
- No new dependencies or backend changes.
