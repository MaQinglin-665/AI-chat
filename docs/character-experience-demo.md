# Character Experience Demo Notes

This demo pass focuses on character output language, voice matching, motion restraint, and low-frequency mood stickers.

## Reply Language

The main setting is `assistant_reply_language`.

Supported values:

- `zh`: default Simplified Chinese replies.
- `en`: force English replies.
- `ja`: force Japanese replies.
- `ko`: force Korean replies.
- `auto`: follow the user's main input language.

The chat input has a quick language menu, and the same setting is available in the model / voice configuration panel. Language rules are injected as private reply guidance and should not be explained to the user unless the user explicitly asks about language or translation.

## Voice Linkage

When `tts.auto_voice_by_reply_language` is true, saving or switching language recommends a matching browser / Edge voice:

- `zh`: `zh-CN-XiaoxiaoNeural`
- `en`: `en-US-AriaNeural`
- `ja`: `ja-JP-NanamiNeural`
- `ko`: `ko-KR-SunHiNeural`

For browser speech, Japanese and Korean modes fall back to an English voice when the matching local system voice is unavailable. GPT-SoVITS keeps its speaker setting, but updates `gpt_sovits_text_lang` to `zh`, `en`, `ja`, or `ko`.

## AI Mood Stickers

Built-in and imported sticker sending remain unchanged. Assistant mood stickers are separate:

- Controlled by `stickers.assistant_enabled`.
- Default chance is `0.18`.
- Default cooldown is `60000` ms.
- Skips automatic chat, comfort-heavy scenes, reminders, task/diagnostic/error-like replies, feedback, closing, and low-interruption check-ins.

The sticker panel shows a visible AI sticker toggle and the latest send/skip reason, so demo operators can explain why a sticker did or did not appear.

## Safety Boundary

This pass does not enable desktop observation, tool calling, shell execution, or file reads by default. Language, voice, and sticker controls are local configuration and frontend behavior only.

