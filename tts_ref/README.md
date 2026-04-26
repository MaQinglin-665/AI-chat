# Local TTS Reference Audio

This directory is intentionally kept out of git tracking for large/private audio assets.

Recommended usage:
- Put your local GPT-SoVITS reference audio files here (for example `taffy_ref.wav`).
- Keep these files local and do not commit them.
- Configure paths in `config.json` as needed:
  - `tts.gpt_sovits_ref_audio_path`
  - `tts.gpt_sovits_fallback_ref_audio_path`

If you need to share sample audio publicly, publish it as a release asset instead of committing it to the repository.
