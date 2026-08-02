# Voice Troubleshooting

本页专门排查语音输入（ASR / 麦克风）和语音输出（TTS）问题。项目仍处于 MVP / 开源孵化阶段，不同电脑的麦克风、浏览器权限、TTS 服务状态会明显影响体验。

## 没说话却识别出句号

本地模型偶尔可能在静音或极弱环境噪声上返回单独的 `。`、`.` 或其他纯标点。
前端会在语义分类之前丢弃这类结果：它不会显示用户消息、不会打断助手，也不会
请求大语言模型。调试状态会记录 `punctuation_only`。只要结果包含任意语言的
字母、汉字或数字，就仍按正常转录处理；语气声的隐藏上下文走独立通道，不受影响。

## 思考中无法继续说话

如果麦克风在助手进入“思考中”后停止接收新语音，请检查
`conversation_mode.interrupt_tts_on_user_speech`。设为 `true` 时，连续收音会贯穿
ASR、LLM 思考和 TTS 播放：简短的“嗯 / 哦 / 对”作为隐藏附和保留，确认后的
纠正、停止指令或有实际内容的新话会取消旧回复并开始新一轮。显式设为 `false`
仍保留旧的一问一答式兼容行为，新语音会等待当前助手轮次结束。

## 打断后像重新问答

语义全双工开启时，助手已经显示或说出的内容不会因下一句话而消失。未完成的
助手消息会以 `…` 收尾并保留，新的用户消息和助手回复仍是独立记录，但会以
更紧密的连续样式展示。纠正和停止指令会立即让助手停下；普通补充允许重要句子
在一个很短的有界时间内说完；“嗯 / 哦 / 对”等附和不会创建新的问答轮次。
下一轮会收到已经说出的片段，只补充尚未表达的内容，避免重新念一遍开头。

## 后一条语音跳过前一条

普通连续补充会保留语音顺序。后一条回复可以在前一条播放时完成模型生成和本地
语音预热，但不会创建一个抢占旧队列的播放会话；它只在前一条实际结束后切换并
紧接播放。明确的“停 / 算了 / 不对”仍会立即取消旧语音。

等待播放的后一条文字会暂时隐藏，实际开播时才逐字展开，显示进度略领先语音。
如果看到整段文字瞬间出现，请检查是否启用了系统的“减少动态效果”，以及该次
回复是否走了不支持流式播放的 TTS 回退路径。

连续轮次的顺序由 ASR 已确认的语义类型持有，不依赖某一帧是否恰好正在发声。
因此“思考中”、语音片段间的短暂无声以及实际播放都属于同一条有序交付链；
普通补充不能重置旧 TTS 会话。只有明确的停止或纠正仍会立即抢占。

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

- 现象：点击开麦后，输入框上方的语音状态条不动，`/micdebug` 中 `peakRms` 接近 `0.00000`。
- 检查：Windows 输入设备是否选对，浏览器/Electron 是否允许麦克风权限。
- 建议：先在系统录音机里确认麦克风有输入，再重启应用后重新开麦。
- 进一步检查：`/micdebug` 中 `track=none` 说明没有拿到音频轨道。
- 后端检查：新版本的 `[ASR][PERF]` 日志会给出 `audio_ms`、`rms` 和 `peak`，只记录数值，不保存录音。`peak` 接近零说明提交给识别器的音频本身是静音。

### Mic meter moves but nothing is transcribed

- 现象：Mic 条有波动，但没有文字进入输入框或聊天。
- 检查：`/micdebug` 中 `peakRms` 是否明显高于 `threshold`。
- 建议：靠近麦克风说一句短句；如果输入偏低，前端会自动降低识别阈值一次。
- 配置项：`config.json` 的 `asr.speech_threshold` 可适当降低，例如 `0.0035`。
- 风险：阈值过低会把风扇声、键盘声或环境噪声误判为说话。

### Vosk 返回空文字时使用本机 Whisper 兜底

- 适用：Vosk 请求成功但自然中文反复返回空文字，并且本机已有 OpenAI-compatible 的 Whisper 转写服务。
- 兜底只接受 `http://127.0.0.1`、`http://localhost` 或 `http://[::1]`，不会把麦克风音频发送到外网；默认关闭，不影响旧配置。
- 示例：

```json
{
  "asr": {
    "provider": "vosk",
    "whisper_fallback_enabled": true,
    "whisper_fallback_url": "http://127.0.0.1:9889",
    "whisper_fallback_timeout_sec": 20
  }
}
```

- 工作方式：先走低延迟 Vosk；只有 Vosk 返回空文字或异常时才提交同一段内存中的 PCM 到本机 Whisper。临时 WAV 由本机服务自行管理，桌宠不会写入或保留录音。

### 识别文字出现同音错字

- 现象：语音能进入聊天，但角色名、项目名或常用词经常被识别成同音字。
- 建议：先把高频误识别写入 `config.json` 的 `asr.hotword_replacements`，例如 `"心语": "馨语AI桌宠"`。
- 细节：热词替换会兼容 ASR 输出中的空格，例如 `心 语` 也会按 `心语` 处理。
- 风险：不要加入太短或太泛的替换词，否则可能把正常句子改错。

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

### 中英文离线语音输入

- 默认行为保持不变：中文本地模型可继续放在原有 `models/vosk` 目录，`input_language_mode` 默认为 `auto`。
- 若需要让角色自动在整句中文和整句英文之间选择，请自行准备一个本地英文 Vosk 模型，然后只在私有 `config.local.json` 中填写路径：

```json
{
  "asr": {
    "input_language_mode": "auto",
    "vosk_model_paths": {
      "en-US": "models/vosk/your-english-vosk-model"
    }
  }
}
```

- 不会自动下载模型，也不会把麦克风音频上传到新的服务；模型路径不会返回给前端或健康检查。
- `auto` 会让两个本地单语模型分别判断同一整句语音，然后只选择一个完整结果。它适合“这一句中文”或“这一句英文”，不会把两个转写硬拼在一起。
- 如果两个模型的结果过于接近，系统会保守地沿用中文候选，并把这一轮标为低置信度，让角色先确认内容而不是假装判断正确。
- 限制：快速的中英夹杂（例如一句中频繁切换语言）不能由两个单语模型可靠解决；这需要你明确提供多语模型或改用另一种识别引擎。
- 运行时最多保留两个最近使用的本地模型；修改模型路径后，下一次转写会按新路径懒加载，不会无限积累旧模型占用内存。
- 如果只想固定英文输入，可把 `input_language_mode` 改为 `en`；浏览器备用识别也会在下一次启动时使用 `en-US`，但浏览器识别是否联网取决于宿主浏览器，不会被本功能自动启用。
- 唤醒词仍使用浏览器的单一识别器：`auto` 为了保持旧行为会使用中文唤醒；需要可靠英文唤醒时请使用 `input_language_mode: "en"`，或手动开麦后使用本地双模型转写。不会同时启动中英文两个浏览器监听器。

### 本地 Paraformer + SenseVoice 高质量模式

项目支持一条完全本地的混合识别链路：Paraformer 在说话过程中提供增量文字，SenseVoiceSmall 在句尾使用完整音频复核；任一组件不可用时自动回退 Vosk。麦克风音频不会上传到云端。

SenseVoice 的情绪和声音事件标签会作为当前轮的隐藏上下文传给 LLM。笑声、
哭声、咳嗽、呼吸声和稳定哼声等纯非语言输入不会生成伪造的用户聊天消息，也
不会进入可见对话记忆。该提示只代表不确定的声学语气，不能可靠推断任意哼唱
背后的具体思想。普通句子仍显示识别文字，并可同时携带隐藏的情绪/事件提示。

启用 `conversation.interrupt_tts_on_user_speech` 后，麦克风会在助手生成和朗读时
继续采集。第一帧人声只登记为候选，不会立刻停止助手；句尾转写确认后，单独的
“嗯嗯、哦、啊”等作为隐藏附和保留，完整句子、纠正、否定或停止指令才会取消
当前 LLM/TTS。连续说出的多个片段会在短合并窗口内保持顺序并作为一轮发送。

首次安装运行时和模型：

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\setup-local-asr.ps1 -Device auto
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\setup-sensevoice-service.ps1
```

RTX 50 系显卡可以明确使用 CUDA：

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\setup-local-asr.ps1 -Device cuda
```

推荐配置：

```json
{
  "asr": {
    "provider": "auto",
    "streaming_enabled": true,
    "final_refine_enabled": true,
    "sensevoice_service_enabled": true,
    "sensevoice_service_managed": true,
    "sensevoice_service_runtime": "onnx",
    "stream_chunk_ms": 600
  }
}
```

默认最终识别由独立的 `127.0.0.1:9890` SenseVoice ONNX INT8 服务完成。
主程序会在服务缺失时自动启动它；服务进程独立于 Electron，关闭或重启桌宠不会
卸载已经预热的模型。`GET /health` 返回 `ready=true` 后，后续句子可直接使用热
模型。服务正在启动、模型下载失败或端口不可用时，当前句会立即回退 Vosk，不会
在主进程里再冷加载一份 PyTorch SenseVoice。

- 服务只绑定回环地址；PCM 通过内存中的 base64 JSON 传递，不写录音文件。
- ONNX 依赖安装在 `D:\AI\sensevoice_runtime` 的独立虚拟环境，避免改变主程序
  的 NumPy / PyTorch 依赖；模型权重只保存在用户 ModelScope 缓存，不进仓库。
- 目标机器实测热态英文转写约 `394 ms`；服务工作集约 `553 MB`、私有内存约
  `1.26 GB`。原进程内 PyTorch 路径曾占约 `5.15 GB` 私有内存，因此默认不再
  用它承担每次 Electron 启动后的首次识别。
- 旧配置仍兼容：显式设置 `sensevoice_service_enabled=false` 时，保留原来的
  进程内 FunASR/SenseVoice 行为；没有安装独立服务时仍可使用 Vosk。

可选的 Silero 智能断句直接复用 `@ricky0123/vad-web`，在 Electron
渲染端本地运行 ONNX 模型，不会上传麦克风音频。它只负责判断一句话的
开始和结束；转写仍由 FunASR 或 Vosk 完成：

```json
{
  "asr": {
    "silero_vad_enabled": true,
    "silero_vad_positive_threshold": 0.35,
    "silero_vad_negative_threshold": 0.22,
    "silero_vad_redemption_ms": 420
  }
}
```

- npm 依赖或本地 ONNX/WASM 资源缺失时，会自动继续使用原有能量阈值，不会让麦克风整体失效。
- Electron 页面必须在 `script-src` 中保留窄范围的 `'wasm-unsafe-eval'`，否则 ONNX
  模型文件虽然返回 200，WebAssembly 编译仍会被 CSP 拒绝。不要用更宽的
  `'unsafe-eval'` 代替。
- Silero 初始化完成得太晚或初始化失败时，当前麦克风会话会继续完整使用能量检测；
  不会在一句话中途切换检测器。成功初始化的模型会在后续开关麦克风时复用。
- 短停顿容易被切成两句时，先把 `silero_vad_redemption_ms` 调高到 `900`–`1200`。
- 环境噪声容易误触发时，可小幅提高 `silero_vad_positive_threshold`，不要同时大幅修改两个阈值。
- 模型与适配代码来自 `ricky0123/vad`（ISC）和 Silero VAD（MIT）；第三方许可仍需随发布包保留。

- `auto`：优先使用本地 FunASR，依赖或模型失败时回退 Vosk。
- `funasr_hybrid`：明确选择高质量模式，但仍保留 Vosk 故障回退。
- `vosk`：只使用旧的轻量识别链路，不加载 FunASR。
- 增量文字只会占用空输入框；如果用户已经打字或开始编辑，流式结果不会覆盖输入内容。
- 模型首次下载时间取决于网络。模型文件留在本机缓存，不属于仓库文件，也不应提交到 Git。
- 已缓存的 SenseVoice ONNX 模型会由独立服务复用。Electron 只检查服务健康
  状态，不会因为桌宠窗口重启而重新加载模型，也不要求用户等待固定倒计时。
- FunASR 模型加载失败后默认冷却 120 秒再重试，期间直接回退 Vosk，避免一个
  录音会话反复下载或初始化同一模型。可通过
  `asr.funasr_model_failure_retry_sec` 在 15–900 秒之间调整。
- `/micdebug` 会显示 `provider`、`streamingConfigured` 和 `streamingActive`，便于确认当前链路。

如果机器更看重资源占用和最终出字速度，不需要输入框里的 Paraformer 增量预览，
可以只在私有 `config.local.json` 中关闭流式预览：

```json
{
  "asr": {
    "streaming_enabled": false,
    "final_refine_enabled": true,
    "funasr_model_failure_retry_sec": 120
  }
}
```

这会避免常驻加载额外的流式模型；句尾仍由 SenseVoice 复核，失败时仍回退 Vosk。
公共示例继续保留流式能力，旧配置无需迁移。

### 转写很快，但文字和语音仍要等几秒

先查看 `server_err.log` 的同一条 trace：

- `[ASR][PERF] total_ms` 是最终转写耗时。
- `[CHAT_STREAM][PERF] first_delta_ms` 是聊天模型首段文字耗时。
- `[TTS_QWEN3_STREAM][PERF] first_chunk_ms` 是首个稳定短句送入 Qwen 后的首音频块耗时。

如果 ASR 和 Qwen 都低于一秒，而 `first_delta_ms` 仍为数秒，瓶颈在聊天模型或
OpenAI-compatible 中转，不在麦克风、文字动画或 TTS。语音轮可选择精简提示词：

```json
{
  "conversation_mode": {
    "voice_low_latency_enabled": true,
    "voice_prompt_max_history_messages": 4
  }
}
```

该模式只用于 `input_modality=voice`：保留角色身份、关系、近期连续性、安全边界、
打断策略和回复节奏，但删除重复的表演元数据，并只发送最近 2–8 条消息。手打消息
和旧配置保持完整提示词路径。当前目标机器上，零历史完整提示词约 `6997` 字符；
语音精简提示词连同 4 条近期历史约 `4054` 字符。

精简后当前 `claude-haiku-4-5-A` 中转实测首 token 约 `2.5 s`，Qwen 热态通常再需
约 `0.2–0.9 s` 才产生首音。它显著改善此前 `5.9–10.5 s` 的首 token 记录，但
外部中转仍可能波动，代码不能保证每次达到 `1–2 s`。若长期需要稳定低于两秒，
必须选择实测首 token 更快且质量可接受的模型/服务，而不是继续增加伪等待语或
让本地小模型和 Qwen 同时抢占显存。

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

如果更看重角色音色一致性而不是立即切换系统音色，可使用：

```json
{
  "tts": {
    "prefer_voice_consistency": true,
    "same_voice_retry_count": 2,
    "allow_browser_fallback": true
  }
}
```

这会先对同一 GPT-SoVITS 音色做有限重试；只有重试与完整尾句恢复均失败，
并且显式允许浏览器回退时，才会改用系统音色。已经开始播放的片段不会被
最终看门狗整段重播。
- 首跑建议：先使用 browser TTS，等基础聊天稳定后再切换 GPT-SoVITS。

### TTS timeout or long delay

- 检查：`tts.gpt_sovits_timeout_sec` 和本地服务负载。
- 建议：降低单次回复长度，或使用 browser TTS 作为回退。
- 目标行为：TTS 失败不应阻塞文本聊天主流程。

### Qwen3-TTS 低延迟试验模式

Qwen3-TTS 使用独立环境，避免它的 PyTorch / Transformers 依赖影响
SenseVoice、FunASR 或主服务：

```powershell
powershell -ExecutionPolicy Bypass -File scripts\setup-qwen3-tts.ps1
powershell -ExecutionPolicy Bypass -File scripts\start-qwen3-tts.ps1
```

然后在配置中心选择 `qwen3_tts`。默认服务地址为
`http://127.0.0.1:9881/v1/audio/speech`。正式馨语声线使用 1.7B
VoiceDesign 和项目内受控的原创 `A2_Original` 指令。目标听感约为 6–8 岁：
保留清亮、圆润、奶甜、幼态的二次元音色，只增加很轻微的成熟稳定度和一点
明亮元气，不使用成年媚态、气声、病娇式表演、刺耳尖音或电子质感，也禁止
擅自插入哼声、尖叫、笑声和拖长填充音。

服务会从单语文本自动识别中文或英文，使实际回复采用与验收试听一致的发音
方向；混合语言会安全回退到 `Auto`。请求中的任意语言字符串、情绪标签和
voice 名称都不能替换内部 A2 声线指令。

旧配置仍然兼容：显式加载名称中包含 `CustomVoice` 的模型时，服务自动切回
原来的 CustomVoice 生成路径，保留 `Ono_Anna` 和其他受支持预置说话人。

- Qwen3-TTS 与 GPT-SoVITS 同时驻留可能超过 8 GB 笔记本显存的舒适区；
  做 A/B 测试时只保留一个本地 TTS 模型常驻。
- CustomVoice / 0.6B 模型仍可作为兼容或低显存回退，但听感不会与正式
  A2 VoiceDesign 声线完全一致。
- 首次加载中文或英文路径会捕获 CUDA 图，可能出现数秒冷启动；热态首音
  通常明显更快。不要为此同时常驻第二个大型 TTS 模型。
- 首次安装会下载 CUDA PyTorch 和模型权重；不要把运行环境、模型缓存或
  生成声线提交到仓库。
- `/health` 可检查模型是否已加载，`/v1/audio/speech` 使用
  OpenAI-compatible WAV 流，桌宠仍通过自己的鉴权后端访问它。

### GPT-SoVITS sounds distorted, electric, or far away

- 现象：声音有电流音、尖锐爆点，或为了压制爆音后听起来像在远处。
- 检查：`server_err.log` 中的 `TTS_GPT_SOVITS` loudness 行，重点看 `rms_before`、`rms_after`、`peak_before`、`peak_after`。
- 当前推荐：默认 `gpt_sovits_max_rms` 为 `5000`，并且热峰值会被限制到安全峰值附近。
- 如果仍有电流音：优先检查 GPT-SoVITS 采样参数和 `gpt_sovits_ref_audio_path` 指向的 ref audio 是否本身峰值过高、噪声过重或接近削波。
- 如果声音过远：不要先改前端播放；先确认后端日志是否把 RMS 压得过低，再小幅调整 `gpt_sovits_max_rms`。
- 风险：`gpt_sovits_max_rms` 调太高可能放出热峰值和刺耳伪影；调太低会让声音变小、变远。

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
    "max_speech_ms": 10000,
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
### 可选：真正的流式播放

- 在确认使用本地 GPT-SoVITS `api_v2.py`，且其流式 WAV 响应为“一个 WAV 头 + signed 16-bit PCM”后，可在私人配置中设置 `tts.gpt_sovits_stream_playback=true`。
- Qwen3-TTS 试验服务对应 `tts.qwen3_tts_stream_playback=true`，并使用相同的可取消 PCM 调度器和回答代次隔离。

### 同一回复像多人、口型不跟音频或说完后表情不恢复

- 新配置 `tts.qwen3_tts_reply_continuity` 默认是 `true`。Qwen3-TTS 会等待最终回复，并把整段文本作为一次合成请求；这样相邻分句共享同一声线、情绪主线和上下文。只有兼容旧低延迟行为时才把它设为 `false`。
- Qwen3-TTS 的流式 PCM 会经过 Web Audio analyser 后再输出。Live2D 口型读取实际可听波形，不再只依赖文本节拍模拟。
- 实际播放结束后，当前 speech cue 会进入约 380ms 的释放窗并主动回到 `neutral`；取消、失败和旧播放代次也会清理说话状态。
- 修改配置后需要重启或重新加载 Electron renderer。用一条包含逗号、破折号和两到三句的完整回复测试连续性；同时观察口型是否随停顿闭合、说完后表情是否自然松开。
- 该开关默认关闭。启用后，项目使用 `/api/tts_stream` 边接收边通过 AudioContext 播放；流在首音前失败会回退到原有完整音频路径，首音后失败不会整句重播。
- 流式路径不会执行完整 WAV 路径的静音裁剪和响度归一化。如果参考音频容易产生拖音、过小或爆音，应保持该开关关闭并继续使用缓冲路径。
- 当前支持 GPT-SoVITS 与 Qwen3-TTS 的 PCM WAV 流；Ogg、AAC、MP3、浮点 PCM 和未知自定义流格式不会被当作兼容能力。
# Continuation subtitle timing and speech handoff

- Ordered continuation text follows the active audio clock and intentionally leads speech by about `350 ms`; it should not appear as a complete paragraph before playback.
- A normal reply-to-reply boundary includes a short adaptive breathing beat (`80-280 ms`). Explicit stop/correction speech still cancels immediately.
- PCM streaming, HTML Audio, and AudioContext fallback all provide the same optional progress contract. Missing progress support falls back safely and must not prevent audio playback.
- If timing still looks wrong, capture the TTS debug events around `ordered_continuation_breath`, `pcm_stream_play_start`, and `audio_play_start`, and note whether the provider used PCM streaming, HTML Audio, or AudioContext fallback.
