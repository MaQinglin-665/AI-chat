# 台词表演跟随播放生命周期（2026-10-02）

本轮目标是让现有语言、表情与身体动作在长句、分窗和打断时保持一致。基线 `c8bd774`，功能分支 `codex/speech-performance-lifecycle-20261002`；目录 `D:/AI/ai_desktop_pet_harness_20260922`。GitHub 检索及采用判断见[复用审查](github-speech-motion-reuse-2026-10-02.md)。

## 改变的行为

- 长句实际朗读期间，俏皮、害羞等细分语态不再因短固定期限提前消失。仅在播放开始时绑定本代语音，由真实播放状态延长有限期限；直接表演提示保持有限时长。
- 聊天窗没有模型时也会发布有效提示。模型窗接受同一提示的新鲜心跳时更新期限，避免中途丢失语态；仍按发送端期限过期，不因残留的“说话中”状态自行续期。续期不重复触发整段动作。
- 本地和分窗取消统一清理语音拥有的 authored / semantic 动作，以及旧句的动作冷却、签名和思考模式。惯性参数平滑回落；独立用户反应继续保留。
- 动作异步加载期间先登记待播放 ownership，使取消能重置 Cubism 的播放预约。迟到结果通过代次、请求 token 与模型引用校验，不再重新登记旧动作或继续尝试替代动作，也不能停止新句或用户接管的动作。
- 动作请求失败会释放待播放记录；独立动作只有成功接管后才移除旧 ownership，避免误停其他动作或漏停旧语音动作。

本轮参考上游事件与取消设计，在原生 JS 中修改现有模块。没有复制上游实现、引入依赖或改变人设、模型文件、LLM/TTS 配置。使用旧配置即可生效；其他模型保持现有姿态能力，Hiyori 专属表演仍受原动作幅度和嘴型控制边界约束。

## 修改文件

- `web/live2dExpressionController.js`：播放绑定、有限续期、统一释放与 authored ownership 清理。
- `web/hiyoriPerformanceDirector.js`：按来源撤销语音动作和语音思考模式，解除旧句冷却。
- `web/motionRuntimeController.js`：待播放记录、异步失效校验与成功接管规则。
- `web/appStartupController.js`、`web/chat.js`：发送端续期接线及接收端有界期限更新。
- `tests/test_speech_performance_lifecycle.js`、`scripts/run_node_tests.js`：20 项行为回归及门禁注册。
- `tests/live2d-expressive-fixture.html/js`：30 秒模拟播放、结束收势与真实取消顺序；保留原停顿和情绪选项。
- 研究报告、本文及 `feature_list.json`、`progress.md`、`session-handoff.md`：证据与续接状态。

## 验证证据

工作目录如上。

- 新的 20 项行为测试：以 `git show c8bd774` 的原始生产模块在内存加载，17 失败、3 通过；修复后 20 全部通过。覆盖持续 10 秒分窗心跳、停止心跳后 901ms 过期、远端取消、异步加载、同动作重播及失败路径。
- `PYTEST_DISABLE_PLUGIN_AUTOLOAD=1 powershell -NoProfile -ExecutionPolicy Bypass -File scripts/test-local.ps1`：完整门禁通过；Python 694 passed，90.48s，一项既有 audioop 弃用警告；全部 Node 套件、Python/JS 语法与敏感信息扫描通过。
- 末次 JS 失败路径修复后重新运行 `node scripts/run_node_tests.js`，全部通过；`python scripts/check_js_syntax.py` 189 文件通过，敏感信息扫描通过。Python 产品代码未修改，无需重复相同 Python 套件。
- 配置示例、package 与功能账本 JSON 解析，以及必需十模块 `py_compile` 通过。
- IAB 加载真实 Hiyori 和生产表达控制器：长句超过旧期限后仍保持 playful；模拟句中停顿时音量为 0、强调计数保持；打断后提示与动作释放，同一句可重新开始；正常结束后回到 neutral、音量 0、强调计数 0，身体偏移平滑回落。浏览器 warning/error 为空。

完整门禁 doctor 的两个提示：隔离工作区没有私人 `config.json`，本机 Node 25 超出其推荐的 20/22 LTS 范围。没有据此更改用户环境。

## 验收边界与下一步

浏览器使用真实模型和模拟播放／音量，不播放真实 TTS。分窗、异步和失败路径是实际生产控制器的行为测试；本轮没有真实 Electron 多窗口、麦克风打断、人工听评、小时级运行或安装包发布证据。暂不能据此宣称达到 Neuro-sama 的自然度。

当前模型通过 Cubism 公共 `stopAllMotions` 重置预约；旧适配器保留 `_stopAllMotions` 兜底。非标准模型适配器若不支持取消加载，仍需单独验收。

下一项建议围绕同一表演链路：先用固定疑问、安慰、兴奋台词做真实 TTS 听评，再参考 Soullink 的休息窗口和历史降重复，增加按分句选择的动作变化。本轮没有添加词级强制对齐或额外 LLM 动作规划请求。原日常脏工作区与私人配置保持原状。
