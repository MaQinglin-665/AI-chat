# Task 057: Proactive follow-up policy presets

## Background

Task 056 polished the proactive follow-up prompt wording. The next small feature step is to
make the prompt seed slightly more context-aware, while keeping the proactive scheduler
guarded and conservative.

## Goal

1. Add a local-only follow-up policy classifier.
2. Expose the selected policy in the existing debug plan.
3. Let the prompt seed adapt wording for a few conservative policy types.
4. Add a fail-quiet policy for topics that look closed or explicitly ask not to continue.

## Policy types

1. `gentle_continue`
   - Default policy.
   - Continue with one short, natural sentence.
2. `light_question`
   - Used when the previous assistant reply ended with a question.
   - Allows at most one light follow-up question.
3. `soft_checkin`
   - Used when the previous assistant reply looked like it asked whether to continue.
   - Emphasizes optional continuation and no pressure.
4. `do_not_followup`
   - Used when the topic hint looks closed, such as "不用", "算了", "先这样", "晚安", or "不用回".
   - Blocks follow-up with `policy_do_not_followup`.

## Scope

- `web/chat.js`
  - Add `buildConversationFollowupPolicy(plan)`.
  - Add `followupPolicy` and `followupPolicyNote` to `buildConversationFollowupDebugPlan()`.
  - Add policy-specific wording to `buildConversationFollowupPromptDraft(plan)`.
- Documentation
  - Record Task 057 behavior and manual smoke checks.

## Non-goals

1. Do not add an LLM classifier.
2. Do not add config flags or dependencies.
3. Do not add timers, listeners, APIs, or UI.
4. Do not change scheduler gate, polling lifecycle, cooldown, window limit, kill-switch, or fail-closed behavior.
5. Do not add screenshot, tool-calling, shell execution, or file-reading behavior.

## Verification

1. `node --check web/chat.js`
2. `python -m py_compile config.py`
3. `python -m json.tool config.example.json`
4. `git diff --check`

## Manual smoke suggestion

In DevTools, construct a pending follow-up and inspect:

```js
window.__AI_CHAT_DEBUG_TTS__.conversationFollowup()
```

Expected:

1. Normal question-tail follow-ups show `followupPolicy="light_question"`.
2. Keyword-based continuation hints show `followupPolicy="soft_checkin"`.
3. Closed topics show `followupPolicy="do_not_followup"` and include `policy_do_not_followup` in `blockedReasons`.
4. `do_not_followup` returns an empty `promptDraft`.
5. No new automatic screenshot, tool call, file read, or direct request path exists.

