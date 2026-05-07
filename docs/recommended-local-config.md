# Recommended Local Config Templates

本页提供可复制到 `config.local.json` 的本地推荐模板，用于复现当前 MVP 的稳定体验。

这些模板只面向本机测试和调味，不是发布默认值。仓库默认仍应保持低风险：不自动观察桌面、不启用工具调用、不执行 shell、不提交真实 API key。

## How To Use

1. 在仓库根目录创建或编辑 `config.local.json`。
2. 从下面选择一个模板复制进去。
3. 按你的本地环境修改 LLM、TTS、Live2D 路径。
4. 重启桌面端。
5. 先点 `更多 → 链路自检`，再测试聊天和语音。

`config.local.json` 已被 `.gitignore` 忽略，适合放本地覆盖项。提交前仍建议运行：

```powershell
git status --short
```

## Template A: Stable First Run

适合首次运行、排查基础链路、确认 Live2D/LLM/TTS 是否可用。语音使用浏览器 TTS，配置成本最低。

```json
{
  "llm": {
    "provider": "openai-compatible",
    "base_url": "https://dashscope.aliyuncs.com/compatible-mode/v1",
    "model": "qwen-plus",
    "api_key_env": "DASHSCOPE_API_KEY",
    "temperature": 0.42,
    "frequency_penalty": 0.55,
    "presence_penalty": 0.35,
    "max_output_tokens": 96,
    "verbosity": "low"
  },
  "conversation_mode": {
    "chat_stream_enabled": false
  },
  "tts": {
    "provider": "browser",
    "voice": "zh-CN-XiaoxiaoNeural",
    "allow_browser_fallback": true
  },
  "assistant_prompt": "你是桌宠 馨语AI桌宠。像真人朋友一样用自然中文短句聊天。默认只回复1到3句，尽量不超过80个中文字。优先直接回答，不要长篇抒情，不要鸡汤，不要模板化，不要提自己是AI。不要使用 Markdown、编号列表、标题或加粗符号。",
  "observe": {
    "attach_mode": "manual",
    "allow_auto_chat": false,
    "auto_chat_enabled": false
  },
  "tools": {
    "enabled": false,
    "allow_shell": false
  }
}
```

Why:
- `chat_stream_enabled=false` 避开部分 OpenAI-compatible provider 流式接口长时间不返回文本的问题。
- 浏览器 TTS 最容易确认“有声音”。
- 提示词限制 Markdown 和长段解释，更接近桌宠聊天。

## Template B: Local Character Closed Loop

适合你已经确认基础聊天可用，并希望验证“回复文本 -> 角色表现 -> 语音风格 -> 用户反馈 -> 调优建议”的闭环。

```json
{
  "llm": {
    "provider": "openai-compatible",
    "base_url": "https://dashscope.aliyuncs.com/compatible-mode/v1",
    "model": "qwen-plus",
    "api_key_env": "DASHSCOPE_API_KEY",
    "temperature": 0.42,
    "frequency_penalty": 0.55,
    "presence_penalty": 0.35,
    "max_output_tokens": 128,
    "verbosity": "low"
  },
  "conversation_mode": {
    "chat_stream_enabled": false
  },
  "character_runtime": {
    "enabled": true,
    "return_metadata": true,
    "demo_stable": false,
    "auto_apply_reply_cue": true
  },
  "tts": {
    "provider": "gpt_sovits",
    "gpt_sovits_api_url": "http://127.0.0.1:9880/tts",
    "gpt_sovits_timeout_sec": 90,
    "gpt_sovits_realtime_tts": false,
    "stream_mode": "final_only",
    "gpt_sovits_text_split_method": "cut0",
    "gpt_sovits_chunk_chars": 120,
    "gpt_sovits_chunk_timeout_sec": 25,
    "gpt_sovits_chunk_max_candidates": 2,
    "gpt_sovits_chunk_split_depth": 1,
    "gpt_sovits_enable_global_retry": true,
    "allow_browser_fallback": true,
    "gpt_sovits_ref_audio_path": "",
    "gpt_sovits_fallback_ref_audio_path": "tts_ref/taffy_ref.wav"
  },
  "motion": {
    "enabled": true,
    "speech_motion_strength": 1.35,
    "expression_enabled": true,
    "expression_strength": 1
  },
  "assistant_prompt": "你是桌宠 馨语AI桌宠。像住在桌面边上的朋友一样聊天：自然、简短、有一点俏皮，但不要表演过头。默认只回复1到3句，尽量不超过80个中文字。优先直接接住用户的话，不要长篇解释，不要鸡汤，不要模板化，不要说自己只是AI。不要使用 Markdown、编号列表、标题、加粗符号或项目符号。",
  "observe": {
    "attach_mode": "manual",
    "allow_auto_chat": false,
    "auto_chat_enabled": false
  },
  "tools": {
    "enabled": false,
    "allow_shell": false
  }
}
```

Why:
- `character_runtime.enabled=true` 和 `return_metadata=true` 打开角色接入层。
- `auto_apply_reply_cue=true` 让上一句回复的情绪/动作/语音风格应用到本地 Live2D/TTS 表现，便于闭环测试。
- GPT-SoVITS 使用 `final_only` 和较长 timeout，优先解决长句无声/超时，再考虑低延迟。
- 仍保持桌面观察、工具调用和 shell 执行关闭。

## Validation Flow

启动后按这个顺序测试：

1. `更多 → 链路自检`
2. `更多 → 测试语音`
3. `更多 → 角色试演`
4. 点 `表现不错` 或 `需要调整`
5. `更多 → 角色调优`
6. 发一句真实聊天，看顶部 `上一句角色表现`

也可以在聊天框输入：

```text
/角色流程
```

## When To Change What

- 回复像普通客服：优先改 `assistant_prompt`。
- 回复太长：调低 `llm.max_output_tokens`，并在 `assistant_prompt` 里限制 1 到 3 句。
- 长句无声：先确认 `tts.gpt_sovits_timeout_sec`、`stream_mode=final_only`、`gpt_sovits_chunk_chars`。
- 声音味道不对：优先换 `tts.gpt_sovits_ref_audio_path` 或 `tts.gpt_sovits_fallback_ref_audio_path`。
- 动作太弱：调 `motion.speech_motion_strength`。
- 表情太弱：调 `motion.expression_strength`。
- 回复 cue 没应用：检查 `character_runtime.auto_apply_reply_cue`。

## Rollback

如果测试后想回到默认保守模式，把本地覆盖改成：

```json
{
  "character_runtime": {
    "enabled": false,
    "return_metadata": false,
    "auto_apply_reply_cue": false
  },
  "conversation_mode": {
    "chat_stream_enabled": true
  },
  "tts": {
    "provider": "browser"
  },
  "observe": {
    "attach_mode": "manual",
    "allow_auto_chat": false,
    "auto_chat_enabled": false
  },
  "tools": {
    "enabled": false,
    "allow_shell": false
  }
}
```
