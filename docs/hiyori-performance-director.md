# Hiyori performance director

`web/hiyoriPerformanceDirector.js` is the parameter-level performance layer for the bundled Hiyori profile. It complements Cubism motion playback; it does not change the model rig or add parameters that are absent from the compiled `.moc3`.

## Runtime ownership

- Built-in Cubism motions remain available for taps, unsupported gestures, and non-Hiyori models.
- Recognized Hiyori semantic cues stay on the performance director so built-in motions do not compete for head, torso, and shoulder parameters.
- Mode, emotion, speech, semantic action, and idle layers blend independently using elapsed wall time.
- Their final additive parameter channels pass through one elapsed-time critically damped transition mixer. Head, face, torso, shoulder, arm, hand, and secondary-motion channels use different response rates, so a layer can enter or disappear without a one-frame pose drop.
- Interrupted actions retain their sampled pose and fade out over about 190 ms.
- Unknown or unsupported action names fall back to the existing motion system.

## Daily conversation action library

The action library favors small amplitude, delayed body follow-through, and slow release:

| Canonical action | Main use | Common cue aliases |
| --- | --- | --- |
| `nod` | one restrained acknowledgement | `tiny_nod`, `ack_single`, `confirm` |
| `nod_double` | warmer or stronger acknowledgement | `tiny_victory_nod`, `ack_double` |
| `shake` | gentle disagreement | `shake_head`, `disagree_soft` |
| `attentive_tilt` | attentive listening | `head_tilt`, `listen_soft` |
| `thoughtful_glance` | enter thought with gaze leading the head | `side_eye`, `think_enter`, `think` |
| `thought_resolve` | return gaze and lightly confirm an answer | `thinking_nod`, `task_snap`, `answer_first` |
| `lean_forward` | direct emphasis | `emphasize`, `approach` |
| `lean_back` | restrained surprise or recoil | `surprised`, `recoil` |
| `care_lean` | calm concern or comfort | `eyes_down_soft`, `care`, `comfort` |
| `shy_glance` | embarrassed or affectionate recovery | `embarrassed_recovery`, `shy` |
| `speak_emphasis` | a small phrase-level torso accent | speech-start cues |
| `sentence_release` | shoulder and breath release after a phrase | settle and closing cues |
| `happy_bounce` | bounded positive celebration | `happy_idle`, `happy_pulse` |

Eight shuffled idle variants remain available between conversations, with immediate repetition prevention.

## Transition behavior

- Idle to listen keeps the previous micro-pose momentum while the attentive pose enters.
- Listen to think lets gaze lead before head, torso, and arm parameters settle.
- Think to speak releases the thinking pose while audible speech energy ramps in.
- Speech beats are filtered at a faster head response and a slower torso/arm response instead of moving every channel in lockstep.
- Speech to idle decays the remaining shoulder and torso energy rather than deleting it on the first silent frame.
- The transition solver advances from elapsed time, does not advance twice for a duplicate timestamp, and converges across 60 Hz and 120 Hz sampling.

## Model limitations

The repository includes the compiled Hiyori `.moc3`, motion JSON, display information, physics, and textures, but not the Cubism Editor `.cmo3` source. New curves can animate the existing head, face, torso, shoulder, arm, hand, leg, breath, hair, ribbon, and skirt parameters. New deformation or a hand pose that the current rig cannot form requires the original Cubism source and re-rigging.

## Verification

Run the focused director test:

```powershell
node tests\test_hiyori_performance_director_frontend.js
```

Run the repository gate:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\test-local.ps1
```
