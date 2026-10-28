# Live2D 动作自然化

本分支从 main `5669e8a` 建立，仅处理 Live2D。Hiyori 原 micro-motion 的音量上升沿能每 126ms 产生一次 beatImpulse，director 还会检测音频 rise；这些信号进入头、身体、肩部通道，容易在说话时产生逐音节起伏。Mao 的 mapped driver 没有这条逐音节点头路径，不把它描述为同样的缺陷。

## 行为与所有权

- `live2dMotionNatural.js` 在原 Pixi **pre-Core** 钩子里准备身体状态，原层写完后平滑完整姿态；没有新增 RAF、写参数定时器或渲染入口。
- 身体使用 voiced-activity 包络：180ms 短保持跨过音节间隙，attack 200ms、release 600ms。Hiyori 关闭原上升沿 beat 和自动音频强调手势，以该包络驱动身体；Mao 仅增加映射声明的轻微说话姿态。原音频分析、播放、嘴型值和五元音均不改写。
- 自动点头只在播放开始或已到时的浏览器标点边界随机选择，单句最多 1～2 次。逗号也只能消耗当前句的预算；普通单词边界和 4Hz 音节不增加预算。缺少标点时间戳时，保守地把**整次 utterance 限制为最多两次**，停顿不重置预算，不猜测文本播放进度。
- 呼吸周期随机为 3.6～6.8s；头身漂移、眼球微动使用随机目标与随机持续时间的平滑轨迹。眨眼间隔随机为 2.4～6.2s；表情眼睑先平滑，再单独应用快速眨眼。长待机仍持续运动。
- 偶尔用本模型词表 `tilt_head` / `think` 的关键帧做约 24% 强度的轻手势，通常间隔 14～30s，相邻选择不同。显式手势、动作、拖拽、倾听、思考、聊天忙碌时不抢占；执行器调用的 Promise 不参与内部随机待机。
- 开启时暂时停用显示库内部固定正弦的 `breath` 和自动 `eyeBlink` 组件，由这一层统一负责随机呼吸与眨眼，避免重复驱动。**官方 motion、physics、pose、focus、Core 均保留**；关闭或 dispose 恢复原组件。不改 vendor 文件。
- 官方 motion、参数手势和表情最终共同经过 pre-Core 通道过渡；被替换的手势从**上一帧实际显示姿态**平滑进入下一姿态，不先写归零画面。Mao 手臂部件 opacity 同样淡入淡出。嘴型通道永远排除在过渡滤波之外。
- 新待机使用独立随机流，不消耗原有全局 Math.random；保留供嘴型使用的原 speechMotionBlend 生命周期，身体收尾不延长嘴型混合度。新增回归覆盖句间停顿/重新发声，避免只测连续音节而漏掉起落边界。

`playGesture` / `lookAt` 的参数、返回值、状态码、原时长和取消语义不变。`completed` 仍是映射窗口结束；视觉惯性可能继续短暂归位，不会延后 Promise 或阻塞下一条动作。视线覆盖和 `blinkSuppressed` 继续拥有对应控制权。

## 开关与映射

两份映射的 `naturalMotion.enabled` 默认 true；模型别名、身体通道、idlePose/speechPose/nodPose 和轻手势列表只写在映射中。新模型可省略整个字段，默认走原有路径。校验器拒绝嘴型通道、未知别名/手势、非法强度和过密的待机间隔。

关闭方式任选其一：

1. 在所用 `mappings/*.json` 设置 `naturalMotion.enabled: false`，重新加载模型。
2. 在持有应用 state 的开发环境设置 `state.live2dNaturalMotionEnabled = false`，下一 Pixi tick 关闭；它不是私人配置项，不需要改 config。

原“关闭动作/表情”开关也会禁用这一层。关闭状态不额外读写模型参数、不消耗随机数；严格基线以**从关闭状态重新加载、相同输入/随机种子/同一 Core**验证。开过叠加后再关闭不会倒退此前已经走过的动作历史。

## 回归与严格基线

`tests/test_live2d_motion_natural.js` 检查：

- 两模型真实驱动代码在每秒 4 次嘴型脉冲下，身体包络成为连续值；Hiyori 的 4Hz 头部分量明显抑制，Mao 不引入该分量；嘴型逐帧严格相同。
- 十分钟待机：呼吸周期、眨眼和轻手势间隔均非固定值，末段仍有移动；相同注入种子可复现，不同种子不同。
- 连续替换、停止、官方/参数姿态交接、表情眼睑和部件过渡没有零时差跳变；关闭后零额外参数调用，关闭/卸载恢复 SDK 组件。
- 错误映射拒绝嘴型所有权、未知通道、过频待机。

现有 `test_live2d_mapping_sequence.js` 仅在输入 state 中显式关闭叠加；**未修改 frozen reference、SHA、预期序列、阈值或快照**。Hiyori 仍逐项比较 5280 帧/394224 次完整有序调用和参数/部件快照；Mao 原协议 1440 帧/25850 次，具备本地模型时另跑真实 Core6 的 1440 帧/181030 次。CI 无 Mao 时明确只运行协议对照，不下载模型。

## 两分钟有声前后录像

每模型各两份 120 秒录像：0～30s 待机 → 四句相同 SAPI 语音 → 连续替换点头/挥手/歪头 → 官方动作/参数交接 → 回到待机。画面标出阶段、前后版本、头身角度，并放大头部。实际模型用 60Hz 原更新顺序，成片 15fps。口型取同一音轨的 20ms RMS 样本。为了把官方曲线作为相同输入，**两边都固定使用各自官方 Idle[0]**，排除随机选中不同动作片段自带嘴型曲线的干扰；生产环境仍保留原官方动作调度。成对录像的实际 Core 嘴型快照逐帧严格比较，不能用“近似相同”放过差异。属于真实 Pixi/Core 的受控回放，**不冒充 Windows 原生设备时延或真人主观验收**。

本地准备（Python/Node、Playwright 与浏览器沿用项目已有工具）：

```powershell
$review = Join-Path $env:TEMP 'Live2D-review'
python scripts/prepare_live2d_motion_qa.py $review
$env:AVATAR_QA_OUTPUT = $review
$env:LIVE2D_BASELINE_REF = '5669e8a'
node scripts/qa_live2d_motion_natural.cjs --smoke
node scripts/qa_live2d_motion_natural.cjs
```

基线脚本用 `git show` 读取该提交的原始 Live2D 文件；不切换用户 checkout。需要自行取得的官方 Hiyori 与 `models_local/Mao/` 完整资源；不读取应用 config、不启动后端 brain、不下载模型。音轨生成器只用本机 Windows SAPI，全部写入指定仓库外目录。用 ffmpeg 将每目录的 `frame-%04d.jpg` 以 15fps 与 `reference-120s.wav` 合成 H.264/AAC MP4；媒体不得加入 Git。

模型均为本机已有、获准使用的 Live2D 官方示例；画面保留 © Live2D Inc. 署名。沿用其 [Free Material License](https://www.live2d.com/eula/live2d-free-material-license-agreement_en.html) 与 [Sample Model Terms](https://www.live2d.com/eula/live2d-sample-model-terms_en.html)，录像不包含模型文件或 Core。

录像附件与最终检查结果在本 PR 中记录；由 qinglinMa 在 Windows 查看后决定合并，不自行合并。

## 范围和限制

没有改 `avatarRuntime.js`、VRM 渲染器、房间场景、后端 brain、执行器或音频/跨窗口协议。共享 Node runner 只登记本项 Live2D 测试；映射校验器只增加自然化字段的离线检查。既有官方 motion 里的作者曲线仍可能重复，随机叠加不会改写原模型；轻手势与小幅运动受模型绑定限制。没有可读浏览器标点事件时采用整次播放预算，宁可少点头；本 PR 不向执行器新增标点或动作协议。原生拖拽、穿透、实际语音和主观自然程度仍需作者实机验收。
