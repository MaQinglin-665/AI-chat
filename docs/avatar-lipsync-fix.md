# 三种角色共用的口型时序修复

## 现象和测量边界

用户在本机系统语音播放时观察到：嘴巴先动，随后声音才到；长句尚未结束，嘴型已经冻结。当前未录得设备实际毫秒偏差，不能把主观听感当成精确测量。先前本机 Mao 原型加入 120ms 浏览器开始补偿后，用户反馈“基本对齐，结尾也跟上了”；120ms 是初始校准值，并非测得的原始偏差。

确定性控制器复现中，语音引擎可在实际 utterance.onstart 之前报告 speaking，旧路径此时嘴型已非零；句子预估时长用尽后 progress 被截到1.3，后半段嘴型不再变化。测试将分别量化已知250ms排队和120ms开始补偿，不宣称代表真实设备延迟。

## 原因和范围

- 全局 speechSynthesis.speaking 并不等同当前 utterance 的可听起点，旧的轮询兜底会提前启动动画。
- 旧口型曲线依赖估算句长并截断时间，无法覆盖实际更长的语音。真实结束、暂停、继续、错误和取消事件应拥有嘴型生命周期。
- VRM 公共帧只取分析器音量；系统语音没有 PCM/频谱，需通过同一帧和原有跨窗口广播传递保守的估计张合。

本 PR 直接从 main2b67452 创建，与 #217 的 Core/适配/Mao 提交分离。保留既有 AudioContext.outputLatency/baseLatency 的25ms下限/350ms上限、FFT1024、隐藏窗口16ms定时广播；不新增渲染时钟，不修改对话、记忆或外部执行。

## 验收安排（完成结果见后文）

三种真实本地模型的前后对比、长句/结束/暂停/取消/过期帧测试、完整本地门禁。Mao 尚属于 #217，验收页可使用固定 #217 文件的隔离组合环境，这些文件不会加入本 PR。

模型选用官方 CC0 的 Sendagaya Shino（千驮谷筱）：[官方总说明](https://vroid.pixiv.help/hc/en-us/articles/4402614652569)、[模型单独条款](https://vroid.pixiv.help/hc/en-us/articles/360013482714-Sendagaya-Shino)、[官方主页](https://hub.vroid.com/en/users/36144806)、[下载镜像](https://opengameart.org/content/vroid-studio-cc0-models)。模型及 source.json 放在被忽略的 models_local/，本 PR 不提交。

#217 的严格同输入参数序列是适配层平移的验收；本 PR 有意改变嘴型时机，不复制或放宽那套测试。最终报告将明确新加/更新的时序断言及原因。


## 实现结果（2026-10-26）

- `web/avatar/browserLipSync.js` 是共用的系统语音估计张合：等待实际开始，默认补偿120ms（`tts.browser_lip_sync_delay_ms`，0～500）；真实结束/错误/取消关闭，暂停/恢复及单调边界事件校准节奏，token/代次拒绝旧回调。没有事件时保留引擎状态兜底，采用至少300ms的保守开始门限；这仍是缺少PCM时的估计，不能保证逐音素同步。
- 原表达控制器仅在当前浏览器语音拥有嘴型时使用新信号；服务器音频开始会清除浏览器所有权。残留的旧分析器不能提前打开新的系统语音嘴型。`avatarRuntime.frameFromState` 将同一信号交给 VRM，未来 #217 的 Mao 同样使用这一行选择逻辑。
- 原 `taffy-speech` 广播增加经过布尔验证的 `browserMouthActive` 字段；开始/暂停/结束事件只唤醒原广播循环。实际长句持续播放时续期原500ms嘴型租约，避免独立模型窗口把超出估计时长的尾段帧丢掉。保留原有异步时钟换算、过期帧关闭及隐藏窗口16ms计时器，无新增渲染RAF。
- 原分析路径未修改：outputLatency优先、baseLatency回退，低于25ms忽略、最大350ms；FFT1024，音量历史延迟及静音尾段、finish清理仍由原测试验证。

## 三种真实模型对比

三个本机视频均为14.6秒、20fps、292帧，左右分别修改前/后，附同一段12.2秒本地中文系统语音。参考音轨在1370ms开始；事件为1000ms入队、1250ms onstart，并模拟120ms音频启动差。视频使用实际模型与实际控制器/驱动读取嘴型参数，时间由测试控制，并非原生应用的实时语音录屏或设备延迟测量。

| 模型 | 修改前 | 修改后 |
| --- | --- | --- |
| Hiyori | 语音张合信号1000ms已非零，比参考音轨早370ms；4～8秒信号变化范围0（冻结） | 首次采样到张合1400ms，比参考音轨晚30ms；尾段变化范围0.650747，实际模型嘴型也变化 |
| Mao | 无频谱时公共帧嘴型参数一直0 | 同一开始门限和连续尾段；实际ParamA随信号变化，结束为0 |
| VRM / Sendagaya Shino | 无频谱时aa参数一直0 | 同一开始门限和连续尾段；实际aa随信号变化，结束为0 |

20fps采样间隔50ms；上述370/30ms只描述这一确定性测试。Hiyori原表情/待机也会写入微小嘴部参数，不能把“参数首次非零”当作语音开始；上表使用共享语音张合信号衡量起点。三段均无页面错误，逐帧数据/截图及合成视频保留在仓库外 `outputs/lipsync-comparison/`，已查看等待、发声中和结尾画面。

Mao 由固定 `0c08c3d`（#217）的模型驱动/映射和Core6组成隔离组合验收页。此PR没有合并#217、复制其产品适配层或改变Core；两个版本的对比使用同一Core。作者合并#217后，整合时保留本PR的frameFromState嘴型选择，不能被旧的RMS-only那一行覆盖。

VRM本地文件：`models_local/Sendagaya_Shino.vrm`，SHA256 `f11b2648e7e588ae171ad1c32e465f84e5b130b1d1789e3a3702946c0981d2a9`。镜像ZIP SHA256 `ff85ff42c1d041fd66dabdb36761a98557d7b55199f635769f3698a41c0a3696`。官方模型专属页面明确CC0；镜像内嵌Hub条款链接原样保留，未修改资源。生产路径解析器已验证以下配置可读取本地模型，不改用户当前角色：

```json
{"avatar":{"kind":"vrm","path":"models_local/Sendagaya_Shino.vrm"}}
```

## 自动检查和测试变化

- 完整 `scripts/test-local.ps1`：**882 Python通过 / 3跳过；70 Node测试文件；Python190 / JS230个文件语法检查；秘密扫描824**。
- 首次运行打包、Docs四项浏览器检查、必需JSON/py_compile通过；模型/录像/私密配置/Key均未提交或打包。
- 新增 `test_browser_lip_sync.js`：三种配置的排队/实际开始/120ms门限、30秒长句、暂停/恢复/边界、结束/错误/取消/旧回调/代次、旧分析器、跨窗口时钟及长句租约、分析静音/过期包。新增Python配置六个边界用例。
- **未更新任何已有参数快照，未复制、删除或放宽#217的严格对照。** 现有 `test_lip_sync_bridge_frontend.js` 和 `test_split_window_speech_timebase_frontend.js` 保持原文件且通过。新的时序断言有意把浏览器“排队已开嘴/长句曲线固定”改为“等待开始门限/持续变化至实际结束”；这属于本PR行为变更。

## 复现和剩余检查

```powershell
node tests/test_browser_lip_sync.js
node tests/test_lip_sync_bridge_frontend.js
python -m pytest -q tests/test_browser_lip_sync_config.py
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/test-local.ps1
```

已有docs Playwright/Chromium及本地三种模型时，`node scripts/qa_shared_lipsync.cjs` 生成左右对比JPEG序列和JSON；可用环境变量LIPSYNC_QA_OUTPUT改变输出目录，LIPSYNC_QA_SMOKE=1仅检查加载，LIPSYNC_QA_MODELS选择模型，LIPSYNC_QA_BASE/ADAPTER指定已存在的Git参考。视频使用相同参考WAV补1370ms静音再与20fps图像序列合成；不向应用接入合成音轨。

本机已安装的Mao/120ms工作版本保持原样，没有把#217的回退版本覆盖安装。作者仍需在Windows原生应用听三种角色的实际设备声音，验证开始/结束与窗口切换；本次不声称完成该人工听感验收。不自行合并任一PR，不启动脑控第二期。


## 2026-10-27 — #217 已合并后的实际统一入口复验

#217由作者合并为main `9d09edc` 后，本分支正常merge为 `3aafe90`。旧文中的2b67452基线/0c08c3d临时组合页是历史验收；当前已直接使用main中的Hiyori/Mao/VRM真实代码，QA删除了Mao runtime字符串替换。PR相对当前main的产品diff仅包含共享口型修复及配置字段。

- 冲突为三份状态记录，以及avatarRuntime构造入口和appStartup两组互补字段。保留main统一工厂、渲染器自己的时钟、五元音字段与显式意图优先级，同时保留#226浏览器口型选择、事件唤醒和长句500ms租约。表达控制器自动合并后确认显式mouth意图优先于浏览器估计。
- 发现并修复组合边界：服务器音频切换到系统语音后，旧分析器的元音值可能残留。当前浏览器语音只产生张合、vowel=null；分析音频的五元音路径保持，广播的接收/发送和公共帧都有所有权判断。新增优先级和音频源切换回归，原FFT1024、25–350ms输出延迟、隐藏16ms计时器保留。
- 三种真实本地模型各292帧/14.6秒前后复验通过，实际模型参数持续变化且尾段信号范围0.650747，结束关闭，无页面错误。已查看发声中画面，视频重新合成在仓库外outputs/pr226-main217/，使用相同参考音轨和受控时钟；不是原生Windows设备延迟测量。Mao不再依赖未合并文件或临时覆盖。
- 完整scripts/test-local.ps1：**938Python通过/3跳过，75Node文件，语法Python195/JS246，秘密扫描858**；打包、必需JSON/py_compile通过。口型桥、跨窗口时钟、Mao映射/元音相关测试通过。
- **未更新任何已有参数快照**。新增/扩展的是test_browser_lip_sync.js对显式意图、浏览器元音置空、残留分析器、长句跨窗口租约等时序断言。main继承的严格映射测试原文件/基线保留，随完整门禁执行并通过，但不作为“有意改变嘴型时机后仍等价”的证明。test_lip_sync_bridge_frontend.js、test_split_window_speech_timebase_frontend.js与main逐字节相同。

后续正常push并等待该提交Linux/WindowsCI全部通过，用户将在自己的Windows实际听过后再由作者决定合并；不自行合并或更改本机安装。随后另从最新main建立friend/avatar-live2d-mao，用户已确认范围为真实五元音、8表情、3手势及配置切换验收/发现问题修复。Mao基础实现已在main，当前无fork远端，也没有曾经推送过独立Mao分支。
