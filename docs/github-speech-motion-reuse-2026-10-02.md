# GitHub 语音与动作联动复用审查（2026-10-02）

结论：公开代码可用于改进馨语的分句播放、表演取消和动作变化；本轮研究不引入上游依赖。源码能力不等于 Neuro-sama 的完整体验，也不证明实际音画效果。以下固定提交，避免主分支后续变化影响判断。

| 仓库 | 审查 SHA | 源码许可与采用决策 |
| --- | --- | --- |
| moeru-ai/airi | `74ee76fbe328d8386c33a01f47d85e167333a046` | [MIT](https://github.com/moeru-ai/airi/blob/74ee76fbe328d8386c33a01f47d85e167333a046/LICENSE)；借鉴语音分段、播放事件和取消机制。 |
| Open-LLM-VTuber/Open-LLM-VTuber | `992309c0aa19845960228f880013d4685fde93b5` | [MIT](https://github.com/Open-LLM-VTuber/Open-LLM-VTuber/blob/992309c0aa19845960228f880013d4685fde93b5/LICENSE)；参考 Python 分句 TTS 的顺序管理。 |
| Open-LLM-VTuber/Open-LLM-VTuber-Web | `d176e7df2366952e3bacbf12cf9a8b18a4315932` | [自定义 Apache 2.0 附加条款](https://github.com/Open-LLM-VTuber/Open-LLM-VTuber-Web/blob/d176e7df2366952e3bacbf12cf9a8b18a4315932/LICENSE)；收费分发、服务和商业集成需另授权，暂不复制其前端。 |
| zeikar/charivo | `62f3a4369643d4e132cfc25104a15422e1155c05` | [MIT](https://github.com/zeikar/charivo/blob/62f3a4369643d4e132cfc25104a15422e1155c05/LICENSE)；借鉴真实播放生命周期和口型控制权。 |
| LeonaDavinci/soullink-emotion-sdk-live2d | `f8a075d92735ae4c2e8fb85937c969e0c180d9a0` | [MIT](https://github.com/LeonaDavinci/soullink-emotion-sdk-live2d/blob/f8a075d92735ae4c2e8fb85937c969e0c180d9a0/LICENSE)；借鉴能力过滤、休息窗口和动作降重复。 |

## 实际机制与局限

- **AIRI**：音频管线保留 turn/intent/segment 身份，分段合成后按顺序进入播放，转发开始、结束、打断事件，并用 AbortSignal 撤销旧任务。适合参考事件契约；移植其 TypeScript、Eventa 与调度依赖仍需适配，不是直接加载脚本。[语音管线](https://github.com/moeru-ai/airi/blob/74ee76fbe328d8386c33a01f47d85e167333a046/packages/pipelines-audio/src/speech-pipeline.ts#L65-L105)
- **Open-LLM-VTuber**：Python 可并行合成，用序号保持发送顺序，并把文本、音频、actions 放在同一 payload；Web 按音频任务设置表情并启动 Talk 动作。这是片段级联动，不能视为词级重音对齐；前端在音频实际开始前便设置动作。[后端队列](https://github.com/Open-LLM-VTuber/Open-LLM-VTuber/blob/992309c0aa19845960228f880013d4685fde93b5/src/open_llm_vtuber/conversations/tts_manager.py#L92-L109)、[前端播放](https://github.com/Open-LLM-VTuber/Open-LLM-VTuber-Web/blob/d176e7df2366952e3bacbf12cf9a8b18a4315932/src/renderer/src/hooks/utils/use-audio-task.ts#L128-L176)
- **Charivo**：PCM 按 AudioContext.currentTime 排队，generation 使旧回调失效；表情由 audio:start/end 保持和释放，静音时口型仍覆盖为关闭。普通 cascade 等完整回复后整段 TTS，所审查路径没有词级动作时间轴。[PCM 调度](https://github.com/zeikar/charivo/blob/62f3a4369643d4e132cfc25104a15422e1155c05/packages/tts/src/pcm-playback.ts#L104-L183)、[表情生命周期](https://github.com/zeikar/charivo/blob/62f3a4369643d4e132cfc25104a15422e1155c05/packages/render/src/render-manager.ts#L65-L89)
- **Soullink**：规划器按模型可用通道降级，用时长、音频峰值、情绪与历史选择动作，限制密度并保留休息时间；表演层不抢嘴和眨眼。lifecycleToken 只拒绝更小的 token，清空后同 token 迟到结果仍须宿主拦截。默认时钟是 RAF 墙钟，runtime-core 当前接旧 startSpeechMotion，不能称为开箱精确音画同步。[规划器](https://github.com/LeonaDavinci/soullink-emotion-sdk-live2d/blob/f8a075d92735ae4c2e8fb85937c969e0c180d9a0/packages/engine/src/speech/SpeechPerformancePlanner.ts#L724-L825)、[生命周期](https://github.com/LeonaDavinci/soullink-emotion-sdk-live2d/blob/f8a075d92735ae4c2e8fb85937c969e0c180d9a0/packages/engine/src/runtime/SoullinkRuntime.ts#L384-L428)

## 馨语采用顺序

保持原生 JS、Electron + Python 架构，在现有播放队列中为每段语音绑定身份；以实际播放进度推进该段动作，打断时同时撤销音频与表演。下一步再加入句间休息、近期同动作降权，以及按实际播放中的分句切换语义姿态。保留口型、眨眼和显式动作的控制优先级，不额外请求 LLM 规划每个动作。

本次只读源码与远端记录，未安装或执行上游测试。Charivo 此 HEAD 的 [CI 验证、覆盖率与包检查成功](https://github.com/zeikar/charivo/actions/runs/34346876433)；Soullink engine 标注 beta，fork 的 Actions/Release 记录为空，不能据 README 或 star 判断稳定。MIT 复用须保留版权及许可；模型、语音素材和 Cubism 授权独立，Charivo [渲染包明确为复合许可](https://github.com/zeikar/charivo/blob/62f3a4369643d4e132cfc25104a15422e1155c05/packages/render-live2d/LICENSE.md)。具体文件 LICENSE 优先于 GitHub API 的许可分类。
