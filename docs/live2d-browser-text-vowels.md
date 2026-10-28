# 浏览器语音下的 Live2D 文本元音

浏览器 SpeechSynthesis 不提供可读取的音频。此前 browser 语音统一输出 `vowel: null`，Mao 只动默认开合通道。本改动在声明 `capabilities.vowels: true` 的 Live2D 适配器中补上文本近似；没有音频分析，也不会联网查拼音。

## 实现和范围

- `browserLipSync.js` 保留 #226 的开合公式、rate、delayMs、播放所有权、暂停/恢复和结束逻辑；额外保存原生 boundary 的 `utterance.text / charIndex / charLength`。不改播放控制器。
- `pinyinVowels.js` 单独声明有注释的韵母映射。`browserTextVowels.js` 在 Live2D 的原 Pixi pre-Core 更新处选择元音，五通道交叉淡变80ms；通道权重和为1，开合量仍来自原帧。只有预测到标点时局部闭嘴。
- `live2dRenderer.js` 仅在映射声明 vowels 时加载本地数据/创建转换器。`live2dModelDriver.js` 只对内部 `source: browser-text` 的嘴型使用权重。Hiyori 不加载数据/转换器；分析音频的 TTS 继续使用原元音与有序参数写入。
- 独立模型窗口沿用 `taffy-speech` BroadcastChannel，新增可忽略的 `live2d-browser-text` 消息；每次最多8个当前词片段，每片最多32个 UTF-16 单元，不发整段朗读文本。接收方按既有 speech sender/generation/browser 所有权及900ms租约接受，使用墙钟换算独立窗口的 performance 时钟。
- **没有修改 avatarRuntime.js、appStartupController.js、VRM、房间、brain、执行器或对话/记忆代码**，没有第二条模型切换路径，也没有新增写模型参数的 RAF/定时器。QA 页面自己的绘制循环只用于录像放大镜。

## 时间和回退

1. 新词最早从收到 boundary 的 `performance.now() + delayMs` 开始。新词到达时保留较早的延迟计划，不能提前替换正在播放的旧词。
2. 已知 charLength 时在词中平均分配字；默认300ms/rate，后续用相邻 boundary 的时间和索引差校准，限制在140～450ms/rate。charLength 缺失时最多估计接下来4个字，遇标点停止，不跨标点猜下一句。每个新 boundary 都重新锚定。
3. 英文、数字、罕见字和未知读音返回 null，退回模型默认开合；标点输出闭嘴。暂停/恢复平移时间线，结束/取消沿用现有开合归零；新播放 generation 不继承旧词。
4. 只有已确认 boundary 的起点不早于对应事件及 delayMs；**没有音频就无法保证词内每个字与实际音素精确同步**。浏览器缺失 boundary 时退回只开合。数字没有转读法，多音字取单字常用读音。

韵母表包含任务要求的 a/ia/ua/ai/ao/an/ang→a，i/in/ing→i，u/ü/ou→u，e/ei/en/eng/ie/üe→e，o/uo/ong→o，并补足 iao、ian、uan、iang、uang、iong、er、iu/ui/un 等写法；ue/v 等拼写在映射文件中注明。

## 数据来源和体积

官方 [pinyin-pro](https://github.com/zh-lx/pinyin-pro) **3.29.5 / MIT**；下载的官方 npm 包内 package.json 与 LICENSE 均已核对，完整原 MIT 声明随数据保留，详见 [第三方声明](../THIRD_PARTY_NOTICES.md#pinyin-pro--offline-live2d-common-character-finals)。

只提取 GB2312 一级3755字的韵母，生成 JSON **11,763字节**。两份新运行时模块共6,599字节，原许可1,070字节；三份既有运行时文件的净增加3,791字节，运行时总增加 **23,223字节（22.68KiB，未压缩）**。构建/测试/说明/录像工具另计；完整拼音库和开发期录音工具不进入运行时依赖。生成脚本输入本地已解压官方包，无网络调用，结果 SHA-256 固定于第三方声明。

## 验证

- `tests/test_browser_text_vowels.js`：3755字、所有指定韵母与常见字、英文/数字/标点；三种rate与三种delay的稀疏词内分配、延迟下界、boundary校准/暂停/取消、新generation、80ms权重与跨窗口时钟/租约。
- 同一测试锁定 main42ae9ea 的 **14,400个原 browserLipSync 开合采样**，SHA-256 精确一致，不重新生成这个基线迁就实现。
- `tests/test_browser_text_vowels_renderer.js`：五通道、开合和权重、标点、内部临时帧不泄漏；非browser的完整有序写入与原driver一致，Hiyori不会加载元音模块。
- 原 `test_live2d_mapping_sequence.js` **5280帧/394224次有序写入**、Mao协议 **1440帧/25850次**、实际Core6/Mao **1440帧/181030次** 严格对照仍一致，旧fixtures/快照未改。
- 完整 `scripts/test-local.ps1`：1105 Python通过/3跳过，85 Node测试文件通过，语法/敏感信息/真实Hiyori与Mao映射检查通过。最终增量检查、首次运行包和CI结果记在 progress.md/PR。

## 六段真实浏览器有声录像

本机 Microsoft Huihui 中文语音通过真实浏览器 SpeechSynthesis 播放，用 WASAPI **系统输出回录**，不是麦克风、后配音或分析器驱动。三段文本各录前后一次，参数rate=.96、delay=120ms；画面含场景、文本、头部放大和A/I/U/E/O数值。每次有15～16条原生boundary，纯中文修改后五个通道均出现，修改前只有A。真实朗读的调度时长可能不同。

附件位于已有的[草稿验收资料](https://github.com/MaQinglin-665/AI-chat/releases/tag/untagged-d2ff791d304d9886571a)，**作者须登录具有写权限的账号**；未发布产品版本，录像不进入源码仓库：

| 场景 | 修改前 | 修改后 |
| --- | --- | --- |
| 纯中文 | [01 before](https://github.com/MaQinglin-665/AI-chat/releases/download/untagged-d2ff791d304d9886571a/text-vowels-20261028-01-chinese-before.mp4) | [01 after](https://github.com/MaQinglin-665/AI-chat/releases/download/untagged-d2ff791d304d9886571a/text-vowels-20261028-01-chinese-after.mp4) |
| 中英混合 | [02 before](https://github.com/MaQinglin-665/AI-chat/releases/download/untagged-d2ff791d304d9886571a/text-vowels-20261028-02-mixed-before.mp4) | [02 after](https://github.com/MaQinglin-665/AI-chat/releases/download/untagged-d2ff791d304d9886571a/text-vowels-20261028-02-mixed-after.mp4) |
| 数字/标点 | [03 before](https://github.com/MaQinglin-665/AI-chat/releases/download/untagged-d2ff791d304d9886571a/text-vowels-20261028-03-numbers-before.mp4) | [03 after](https://github.com/MaQinglin-665/AI-chat/releases/download/untagged-d2ff791d304d9886571a/text-vowels-20261028-03-numbers-after.mp4) |

录像脚本为 `scripts/qa_live2d_text_vowels.cjs`，需要本机已获许可的 models_local/Mao、项目Playwright、Windows本地中文语音；可选的 `record_browser_audio.py` 仅依赖独立安装的 PyAudioWPatch 0.2.12.9（Apache-2.0，开发期工具，未随应用打包）。用 AVATAR_QA_OUTPUT 指定本地输出目录、FFMPEG 指定编码器、PYTHON 指定录音工具Python。运行脚本**会从扬声器播放朗读**；再次录制前须提前告知本机使用者。`--smoke` 仅录一段修改后；检查已有MP4/ZIP不需要播放声音。

限制：词内音素未知、单字多音近似、常用字范围有限、英文/数字不推断元音。截图实际帧率随本机负载变化，录像用于看口型差异，不能当作精密端到端时延测量；准确效果仍由作者在Windows实际试听验收。模型文件只在 models_local，未提交或随ZIP分发。
