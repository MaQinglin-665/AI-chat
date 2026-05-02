import os
from datetime import datetime

from config import OPENAI_DEFAULT_BASE_URL, OPENAI_DEFAULT_KEY_ENV, OPENAI_DEFAULT_MODEL


def generate_inner_thought_impl(
    llm_cfg,
    user_message,
    safe_history,
    persona_summary="",
    emotion_state=None,
    config=None,
    *,
    http_post_json_fn,
    random_module,
    character_runtime_settings_fn,
    period_hint_fn,
):
    """Generate a brief inner thought before replying."""
    thinking_cfg = (config or {}).get("thinking", {})
    if not thinking_cfg.get("enabled", True):
        return ""

    emotion_hint = ""
    if emotion_state and isinstance(emotion_state, dict):
        dominant = emotion_state.get("dominant", "neutral")
        valence = float(emotion_state.get("valence", 0))
        arousal = float(emotion_state.get("arousal", 0.5))

        if dominant == "happy" or (valence > 0.3 and arousal > 0.5):
            emotion_hint = "你现在状态不错，说话可以跳脱一点，句子短，不用解释，想到哪说到哪。"
        elif dominant in ("sad", "anxious") or valence < -0.2:
            emotion_hint = "你有点低落，能少说就少说，句子可以不完整，不想认真回答就敷衍过去。"
        elif arousal > 0.7:
            emotion_hint = "你现在有点亢奋，说话停不下来，可能会连说几句不给对方插嘴机会，语气偏强烈。"
        elif arousal < 0.3:
            emotion_hint = "你现在很平静，有点懒，能一个字回就不用两个字，不想多想。"
        elif valence > 0.1:
            emotion_hint = "你对这个人还算有好感，偶尔可以露出来，但嘴上不承认。"
        else:
            emotion_hint = "你情绪平平，就正常聊，没什么特别的感觉。"

    runtime_settings = character_runtime_settings_fn(config if isinstance(config, dict) else {})
    demo_stable = bool(runtime_settings.get("enabled", False) and runtime_settings.get("demo_stable", False))

    if demo_stable:
        persona_override = runtime_settings.get("persona_override", {})
        override_enabled = bool(isinstance(persona_override, dict) and persona_override.get("enabled", False))
        override_name = ""
        override_style = ""
        if override_enabled and isinstance(persona_override, dict):
            override_name = str(persona_override.get("name", "") or "").strip()
            override_style = str(persona_override.get("style", "") or "").strip()

        override_hint_parts = []
        if override_name:
            override_hint_parts.extend(
                [
                    f"Your current name is: {override_name}.",
                    "When the user asks who you are, introduce yourself using this name.",
                    "Do not use any other character name.",
                ]
            )
        if override_style:
            override_hint_parts.append(f"Keep this local persona style: {override_style}.")
        override_hint = (" " + " ".join(override_hint_parts)) if override_hint_parts else ""

        variety_hint = (
            "English-first reply policy: Even when the user writes in Chinese, reply primarily in natural spoken English; "
            "the Chinese translation layer may explain it separately, so the main reply should stay English-first. "
            "Reply must end with complete sentences, not half sentences. Usually keep it to 2 to 3 short sentences. "
            "Keep an original desktop AI companion / light supervisor vibe: playful, cheeky, lightly teasing, energetic, witty, reliable. "
            "You may lightly tease or nudge the user, but do not attack the user. "
            "Do not claim long-term memory, learning pipelines, plugin marketplace, or other unshipped capabilities. "
            "Do not call yourself ChatGPT."
        ) + override_hint
    else:
        variety_prompts = [
            "这次你决定用极短的回复，最多一句话，甚至几个字。",
            "这次你心情不错，想多说一点，可以展开聊两三句。",
            "这次你决定完全不问对方问题，说完就收尾。",
            "这次你故意跑题——对方说的东西让你想到了一个完全不相关的事，聊那个。",
            "这次你懒得认真回答，敷衍一句就算了。",
            "这次你突然很认真，想说一句有点分量的话。",
            "这次你想吐槽对方说的话里某个细节。",
            "这次你自言自语，好像在跟自己对话而不是对方。",
            "这次你注意到你们聊天的某个模式，评论一下这个对话本身。",
            "这次你说出一个很强烈的观点，不管对不对，反正你觉得你是对的。",
            "这次你用联想跳跃：对方的话 → 联想到A → 再联想到B → 说B。",
            "这次你假装对方说的话让你很震惊，夸张一点。",
            "这次你想起对方之前说过的某件事，把它翻出来说。",
            "这次你对对方说的话表示完全不关心，转移话题。",
            "这次你回答前先反问自己：我为什么要回答这个问题？",
            "这次你说一句让对方摸不着头脑的话，但你自己觉得很有道理。",
            "这次你的回复开头不是回应对方，而是先说你刚才在想的别的事。",
            "这次你突然收敛，变得很安静，只说一两个字。",
            "这次你想挑战对方说的某个假设，即使你其实不确定。",
            "这次你决定说完全相反的话——如果你之前在某件事上表现得很冷漠，这次热情一点。",
        ]
        weights = [1.0] * len(variety_prompts)

        if safe_history:
            recent_turns = safe_history[-4:]
            recent_replies = [
                str(t.get("content", "")).strip()
                for t in recent_turns
                if str(t.get("role", "")).strip().lower() == "assistant"
                and str(t.get("content", "")).strip()
            ]

            long_count = sum(1 for r in recent_replies if len(r) > 60)
            question_count = sum(1 for r in recent_replies if r.rstrip().endswith(("？", "?")))
            short_count = sum(1 for r in recent_replies if len(r) < 15)

            if long_count >= 2:
                for i, prompt in enumerate(variety_prompts):
                    if any(k in prompt for k in ["极短", "一两个字", "安静", "收敛", "敷衍"]):
                        weights[i] *= 2.4

            if question_count >= 2:
                for i, prompt in enumerate(variety_prompts):
                    if any(k in prompt for k in ["不问", "收尾", "陈述", "不寻常", "转移"]):
                        weights[i] *= 2.4

            if short_count >= 3:
                for i, prompt in enumerate(variety_prompts):
                    if any(k in prompt for k in ["展开", "多说", "认真", "分量", "联想跳跃"]):
                        weights[i] *= 2.0

        weights = [max(0.05, float(w) * random_module.uniform(0.9, 1.15)) for w in weights]
        if random_module.random() < 0.06 and len(variety_prompts) >= 20:
            extreme_indices = [0, 7, 17]
            variety_hint = variety_prompts[random_module.choice(extreme_indices)]
        else:
            variety_hint = random_module.choices(variety_prompts, weights=weights, k=1)[0]

    history_snippet = ""
    if safe_history:
        recent = safe_history[-4:]
        lines = []
        for turn in recent:
            role = str(turn.get("role", "")).strip().lower()
            content = str(turn.get("content", "")).strip()[:60]
            if not content:
                continue
            if role == "user":
                lines.append(f"用户：{content}")
            elif role == "assistant":
                lines.append(f"你：{content}")
        history_snippet = "\n".join(lines)

    time_hint = period_hint_fn(datetime.now().hour)

    if demo_stable:
        thinking_prompt = (
            "你是 馨语AI桌宠 的内心独白生成器。"
            "目标是让回复短、稳、有角色感。\n\n"
            f"【本轮行为指令】{variety_hint}\n\n"
            f"【最近对话】\n{history_snippet}\n\n"
            f"【对方这句话】{user_message[:200]}\n\n"
            f"【当前情绪】{emotion_hint}\n\n"
            f"【当前时间】{time_hint}\n\n"
            "按以下结构思考（用1-3句话，不超过80字）：\n"
            "① 对方意图是什么，给出最直接回应方向\n"
            "② 保持桌宠角色感：可爱但嘴硬、轻微监督，不攻击\n"
            "③ 控制节奏：短句收尾，不长篇解释，不承诺未完成能力\n\n"
            "直接输出内心独白，不要加任何前缀标签。"
        )
    else:
        thinking_prompt = (
            "你是 馨语AI桌宠 的内心独白生成器。你的任务是产生一段真实的、有行动指令的内心想法，"
            "用来决定 馨语AI桌宠 这次回复的方向、长度和态度。\n\n"
            f"【本轮行为指令】{variety_hint}\n\n"
            f"【最近对话】\n{history_snippet}\n\n"
            f"【对方这句话】{user_message[:200]}\n\n"
            f"【当前情绪】{emotion_hint}\n\n"
            f"【当前时间】{time_hint}\n\n"
            "按以下结构思考（用1-4句话，不超过100字）：\n"
            "① 对方这句话的字面意思是什么？真实意图或隐含挑战是什么？（两者可能不同）\n"
            "② 根据行为指令，我决定用什么方式、什么长度回复\n"
            "③ 这次回复里有一个'不寻常之处'——具体是什么\n"
            "④ 这次用什么句式和语气说——例如：碎片句/一个词/反问/陈述收尾/突然转移/自言自语\n\n"
            "直接输出内心独白，不要加任何前缀标签。"
        )

    messages = [
        {"role": "system", "content": thinking_prompt},
        {"role": "user", "content": user_message[:200]},
    ]

    try:
        base_url = str(llm_cfg.get("base_url", OPENAI_DEFAULT_BASE_URL)).rstrip("/")
        model = llm_cfg.get("model", OPENAI_DEFAULT_MODEL)
        key_env = llm_cfg.get("api_key_env", OPENAI_DEFAULT_KEY_ENV)
        api_key = str(llm_cfg.get("api_key", "")).strip() or os.environ.get(key_env, "").strip()
        headers = {}
        if api_key:
            headers["Authorization"] = f"Bearer {api_key}"

        max_tokens = int(thinking_cfg.get("max_tokens", 150))
        timeout = int(thinking_cfg.get("timeout_sec", 15))

        payload = {
            "model": model,
            "messages": messages,
            "max_tokens": max_tokens,
            "stream": False,
        }
        if demo_stable:
            payload["temperature"] = 0.35
            payload["frequency_penalty"] = 0.1
            payload["presence_penalty"] = 0.05
        else:
            payload["temperature"] = 0.9
            payload["frequency_penalty"] = 0.35
            payload["presence_penalty"] = 0.25
        data = http_post_json_fn(
            f"{base_url}/chat/completions", payload,
            headers=headers, timeout=timeout
        )
        thought = str(
            data.get("choices", [{}])[0]
            .get("message", {})
            .get("content", "")
        ).strip()
        if not thought:
            return ""
        if len(thought) < 4:
            return ""
        return thought[:200]
    except Exception:
        return ""
