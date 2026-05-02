# Voice Troubleshooting

本页专门排查语音输入（ASR / 麦克风）和语音输出（TTS）问题。项目仍处于 MVP / 开源孵化阶段，不同电脑的麦克风、浏览器权限、TTS 服务状态会明显影响体验。

## Quick Path

先按这个顺序检查：

1. 确认文本聊天可用。
2. 确认浏览器或 Electron 已允许麦克风权限。
3. 开麦后说一句较短的话，观察 Mic 条是否有波动。
4. 输入 `/micdebug`，查看 `peakRms`、`threshold`、`track`、`audioInputs`。
5. 查看 `server_err.log` 是否出现 `/api/asr_pcm`、`401`、`500`、`Vosk model not found`。

如果文本聊天不可用，请先回到 `docs/troubleshooting.md` 排查 LLM 和启动问题。

## Voice Input / ASR

### Mic meter does not move

- 现象：点击开麦后，Mic 条不动，`/micdebug` 中 `peakRms` 接近 `0.00000`。
- 检查：Windows 输入设备是否选对，浏览器/Electron 是否允许麦克风权限。
- 建议：先在系统录音机里确认麦克风有输入，再重启应用后重新开麦。
- 进一步检查：`/micdebug` 中 `track=none` 说明没有拿到音频轨道。

### Mic meter moves but nothing is transcribed

- 现象：Mic 条有波动，但没有文字进入输入框或聊天。
- 检查：`/micdebug` 中 `peakRms` 是否明显高于 `threshold`。
- 建议：靠近麦克风说一句短句；如果输入偏低，前端会自动降低识别阈值一次。
- 配置项：`config.json` 的 `asr.speech_threshold` 可适当降低，例如 `0.0035`。
- 风险：阈值过低会把风扇声、键盘声或环境噪声误判为说话。

### `/api/asr_pcm` returns 401

- 现象：`server_err.log` 中出现 `POST /api/asr_pcm HTTP/1.1" 401`。
- 原因：本地 API token 开启时，前端请求没有带正确 token，或浏览器缓存了旧 token。
- 建议：重启 Electron；必要时清理站点 localStorage 后重新打开。
- 检查：`web/apiClient.js` 应负责给 `/api/` 请求附加 `X-Taffy-Token`。

### `/api/asr_pcm` returns 500

- 现象：日志中出现 `/api/asr_pcm failed` 或前端提示 ASR 服务错误。
- 常见原因：Vosk 未安装、模型路径不存在、模型文件不完整、音频 payload 解码失败。
- 建议：先运行后端 ASR 路由测试，确认基础处理逻辑正常：

```powershell
python -m pytest -q tests/test_app_asr_route.py
```

### Vosk model not found

- 现象：日志中出现 `Vosk model not found`。
- 默认路径：
  - `models/vosk/vosk-model-cn-0.22`
  - `models/vosk/vosk-model-small-cn-0.22`
- 可选方案：设置环境变量 `VOSK_MODEL_PATH` 指向本地模型目录。
- 注意：模型目录需要包含 Vosk 解压后的完整结构，不只是 ZIP 文件。

### Recognition starts but stops after a while

- 现象：开麦后短时间可用，随后没有新转写。
- 检查：`/micdebug` 的 `lastFrameAgeMs` 是否持续变大。
- 建议：重新开麦；如果持续复现，检查系统是否切换了默认输入设备。
- 可能原因：蓝牙耳机断连、麦克风被其他软件独占、音频轨道 `ended`。

## Voice Output / TTS

### Browser TTS has no sound

- 检查：系统音量、应用音量混合器、浏览器是否允许播放声音。
- 建议：先把 `tts.provider` 设置为 `browser`，这是首跑最轻量的路径。
- 注意：不同 Windows 版本和语音包会影响可用 voice 列表。

### GPT-SoVITS service unavailable

- 现象：TTS 请求失败，日志中出现 GPT-SoVITS 连接错误。
- 检查：`tts.gpt_sovits_api_url` 是否指向正在运行的服务。
- 建议：确认 GPT-SoVITS 服务端口可访问，再启用该 provider。
- 首跑建议：先使用 browser TTS，等基础聊天稳定后再切换 GPT-SoVITS。

### TTS timeout or long delay

- 检查：`tts.gpt_sovits_timeout_sec` 和本地服务负载。
- 建议：降低单次回复长度，或使用 browser TTS 作为回退。
- 目标行为：TTS 失败不应阻塞文本聊天主流程。

## Recommended ASR Defaults

推荐先使用这组相对保守的 ASR 默认值，再根据实际麦克风调节：

```json
{
  "asr": {
    "show_mic_meter": true,
    "keep_listening": true,
    "transcribe_on_close": true,
    "min_speech_ms": 150,
    "silence_trigger_ms": 380,
    "max_speech_ms": 2200,
    "speech_threshold": 0.0035,
    "processor_buffer_size": 2048
  }
}
```

如果环境噪声很大，可以把 `speech_threshold` 调高；如果麦克风音量很低，可以小幅调低，但不建议低于 `0.0015`。

## Useful Logs And Commands

常用日志：

- `server_err.log`
- `server_out.log`
- `desktop_run.log`

常用检查：

```powershell
python scripts\first_run_check.py
python -m pytest -q tests/test_app_asr_route.py
node tests/test_api_client_frontend.js
```

前端调试命令：

```text
/micdebug
```

把 `/micdebug` 输出和 `server_err.log` 中对应时间段的错误放在一起看，通常可以区分是“没有麦克风输入”“ASR 请求失败”“Vosk 模型问题”还是“API token 问题”。
