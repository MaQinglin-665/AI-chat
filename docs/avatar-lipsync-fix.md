# 三种角色共用的口型时序修复

## 现象和测量边界

用户在本机系统语音播放时观察到：嘴巴先动，随后声音才到；长句尚未结束，嘴型已经冻结。当前未录得设备实际毫秒偏差，不能把主观听感当成精确测量。先前本机 Mao 原型加入 120ms 浏览器开始补偿后，用户反馈“基本对齐，结尾也跟上了”；120ms 是初始校准值，并非测得的原始偏差。

确定性控制器复现中，语音引擎可在实际 utterance.onstart 之前报告 speaking，旧路径此时嘴型已非零；句子预估时长用尽后 progress 被截到1.3，后半段嘴型不再变化。测试将分别量化已知250ms排队和120ms开始补偿，不宣称代表真实设备延迟。

## 原因和范围

- 全局 speechSynthesis.speaking 并不等同当前 utterance 的可听起点，旧的轮询兜底会提前启动动画。
- 旧口型曲线依赖估算句长并截断时间，无法覆盖实际更长的语音。真实结束、暂停、继续、错误和取消事件应拥有嘴型生命周期。
- VRM 公共帧只取分析器音量；系统语音没有 PCM/频谱，需通过同一帧和原有跨窗口广播传递保守的估计张合。

本 PR 直接从 main2b67452 创建，与 #217 的 Core/适配/Mao 提交分离。保留既有 AudioContext.outputLatency/baseLatency 的25ms下限/350ms上限、FFT1024、隐藏窗口16ms定时广播；不新增渲染时钟，不修改对话、记忆或外部执行。

## 待完成的验收

三种真实本地模型的前后对比、长句/结束/暂停/取消/过期帧测试、完整本地门禁。Mao 尚属于 #217，验收页可使用固定 #217 文件的隔离组合环境，这些文件不会加入本 PR。

模型选用官方 CC0 的 Sendagaya Shino（千驮谷筱）：[官方总说明](https://vroid.pixiv.help/hc/en-us/articles/4402614652569)、[模型单独条款](https://vroid.pixiv.help/hc/en-us/articles/360013482714-Sendagaya-Shino)、[官方主页](https://hub.vroid.com/en/users/36144806)、[下载镜像](https://opengameart.org/content/vroid-studio-cc0-models)。模型及 source.json 放在被忽略的 models_local/，本 PR 不提交。

#217 的严格同输入参数序列是适配层平移的验收；本 PR 有意改变嘴型时机，不复制或放宽那套测试。最终报告将明确新加/更新的时序断言及原因。
