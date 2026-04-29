# Character Runtime Demo Prompt Examples

## Scope
Use these prompt examples for:
- local demo sessions
- on-device live demonstrations
- release material recording
- smoke test support
- manual verification after runtime-related changes

## Prerequisites
Before using these prompts, review:
- [Character Runtime Demo Enablement](./character-runtime-demo.md)
- [Character Runtime Safe Local Demo Config Guide](./character-runtime-safe-local-config.md)
- [Character Runtime Demo Smoke Test Checklist](./character-runtime-smoke-test.md)
- [Release Demo Recording Checklist](./release-demo-recording-checklist.md)

Important notes:
- runtime demo must be enabled according to the safe local config guide
- these prompts help trigger emotion/action tendencies; they do not guarantee strong visible feedback for every model resource set
- motion/expression strength depends on Live2D model resources and mappings
- `voice_style` currently does not change TTS behavior
- these prompts are for manual verification and recording support, not formal automated testing

## Prompt Groups

### A. Happy / Positive Feedback
Goal: encourage positive emotional response and friendly presentation.

Suggested user prompt:
- "你今天表现超稳，跟观众打个开心的招呼吧。"

Expected runtime tendency:
- emotion tends toward `happy`
- action may include greeting-style feedback (for example `wave`) depending on model output

Expected visual/audio notes:
- Live2D may show positive expression
- TTS should remain normal; no voice-style behavior change expected

Recording notes:
- good candidate for intro clips
- keep the final wording natural and short for cleaner subtitles

### B. Surprised
Goal: trigger a surprise-like reaction.

Suggested user prompt:
- "突发好消息：我们刚拿到一个演示机会，你第一反应是什么？"

Expected runtime tendency:
- emotion tends toward `surprised`
- action may pair with light thinking or gesture feedback

Expected visual/audio notes:
- expression can be subtle on some model packs
- weak visual intensity alone is not a runtime failure

Recording notes:
- use after baseline clip so contrast is easier to observe

### C. Annoyed / Angry-Safe Feedback
Goal: trigger mild annoyed feedback without unsafe or abusive content.

Suggested user prompt:
- "如果有人建议把报错全删掉当作修复，你会怎么吐槽他？"

Expected runtime tendency:
- emotion may lean toward `annoyed` (or angry-safe mapping)
- action may include rejection/disagreement style movement

Expected visual/audio notes:
- feedback should stay playful/teasing, not abusive
- TTS behavior should remain unchanged

Recording notes:
- avoid profanity, slurs, hate, or personal attacks
- keep this segment short to avoid over-aggressive public tone

### D. Thinking
Goal: trigger thinking-oriented response.

Suggested user prompt:
- "先想三秒：发布前最该优先检查的一件事是什么？"

Expected runtime tendency:
- emotion may move toward neutral/thinking-like state
- action may include `think` depending on model output

Expected visual/audio notes:
- thinking feedback can be subtle and still valid
- chat text should remain readable and natural

Recording notes:
- useful for demonstrating calm reasoning style

### E. Wave / Greeting Action
Goal: encourage greeting action in a friendly context.

Suggested user prompt:
- "请你向刚进来的新朋友挥手欢迎一下。"

Expected runtime tendency:
- action tends toward `wave`
- emotion often remains positive/neutral

Expected visual/audio notes:
- if mapped motion is missing, fallback behavior may be lightweight
- no crash or UI pollution should occur

Recording notes:
- capture one clean take with stable camera/window framing

### F. Shake_Head / Disagreement Action
Goal: encourage disagreement action with safe tone.

Suggested user prompt:
- "有人说发布前完全不用测试，你温和地否定一下。"

Expected runtime tendency:
- action tends toward `shake_head`
- emotion may be annoyed/neutral depending on reply style

Expected visual/audio notes:
- motion may degrade gracefully on limited model resources
- TTS and chat UI should stay stable

Recording notes:
- keep language constructive; avoid hostile framing

### G. Mixed Emotion/Action Prompts
Goal: exercise combined tendencies in one turn.

Suggested user prompt:
- happy + wave:
  - "今天状态很好，向大家开心地打个招呼。"
- surprised + think:
  - "突然收到一个未知需求，你先惊讶一下再思考如何处理。"
- annoyed + shake_head:
  - "听到明显不靠谱的建议后，先吐槽一句再摇头拒绝。"

Expected runtime tendency:
- mixed emotion/action combinations may appear
- exact output depends on model and mapping constraints

Expected visual/audio notes:
- one or both signals can be subtle; this is acceptable if chain stays stable
- `voice_style` should not be presented as active TTS control

Recording notes:
- run a private dry-run first and keep only stable takes for public clips

## Do Not Use for Public Demos
- prompts that expose privacy data, tokens, API keys, or private endpoints
- prompts that invite sensitive social/political controversy
- abusive, discriminatory, hateful, or extreme provocation prompts
- prompts that imply long-term memory or proactive interaction is already shipped
- prompts that imply `voice_style` already drives TTS voice behavior

## Recording Tips
- do one private trial before recording each prompt
- if motion is weak, switch prompt or use debug bridge for developer-only materials
- for primary promo assets, prioritize natural chat clips over DevTools clips
- keep at least one baseline normal-chat clip
- avoid showing failure states in public-facing materials
- align clip order and naming with:
  - [Release Demo Capture Plan](./release-demo-capture-plan.md)
