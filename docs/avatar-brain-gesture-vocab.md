# 大模型与 Live2D 统一动作词表接入

## 行为与边界
后端保留六个旧词，并允许 shake_head、think、happy、surprised、shy、sad、tilt_head、idle_reset。实际可选手势仍与当前世界状态的 gestures 取交集；前端 Live2D 只上报当前 mapping 的 capabilities().gestures，VRM 保留 actions。

Live2D look_at 接受 user/left/right/up/down；VRM room/handpainted 接受 user 和当前地点，其他场景只允许 user。模型提示明确说明这些限制。不增加系统或文件操作。

执行器优先等待 renderer.playGesture(name, {signal}) 的 Promise。completed 原样完成；unsupported 转为 skipped/unsupported；interrupted 和 failed 保持状态。输入打断通过 AbortSignal 传递到正在播放的手势。没有 playGesture 时保留 VRM 的 playAction 与旧等待路径，结束或取消均 stopAction。Live2D lookAt 同步返回结果也走相同回执归一化。后端只保存固定安全原因码，未知细节转 error，不记录任意错误文本。

没有修改 VRM 渲染器、Live2D 渲染器、mappings、默认配置或用户配置。

## 验证
Node 回归覆盖实际 controller + executor 集成：模型能力、四种 Promise 结果、未知词 skipped、输入 AbortSignal、四方向 lookAt、无 playGesture 的旧路径。Python 覆盖全部十四词、模型能力过滤、场景视线限制、提示说明和原因码保留/过滤。

真实验收使用独立内存配置、端口8191、环境变量 DeepSeek Key，daily 档；不读取私人配置。浏览器录像是实际页面与模型渲染，不等同于原生 Electron 验收，录像不含系统音频，不能作为听评证据。模型可以选择不输出动作，文字描述不计为完成回执。

Hiyori 本次实际录制窗口 300.906 秒，WebM 总长 331.52 秒（含加载及结束截图超时等待），完整解码通过。4 次普通聊天调用、0 次主动调用，开启 daily 但未加速或绕过日间频率限制。返回模型为 deepseek-flash；缓存命中输入 3456、未命中 751、输出 167，共 4374 tokens。非高峰估算 $0.000223218，高峰上界 $0.000446436。

两条计划共 wave/nod/think/happy/tilt_head 五步，均 completed；无 failed/skipped/interrupted 回执、无页面异常。另外两条聊天请求方向视线，但模型未输出动作，故没有真实 look_at 证据；四方向已由自动化集成测试覆盖。结束时 screenshot 超时，finally 关闭浏览器后录像完整保存，并从第20秒提取画面确认 Hiyori 与聊天可见；不能把截图超时隐藏为完美通过。

本地视频：`tmp_ui_smoke/vocab/hiyori-video/page@0f84fd999600e308a19b72169fa8e0c7.webm`。素材和响应记录全部被忽略。Mao 模型在允许的本地目录中未定位到，已向作者询问可访问路径；不会访问被禁止的原项目目录，也不会自行下载或提交模型。

费用按返回的 usage（包括缓存命中）估算。价格来源：[DeepSeek 官方定价](https://api-docs.deepseek.com/quick_start/pricing/)，2026-10-27 核对；deepseek-flash 每百万 token 非高峰输入未命中 $0.15、命中 $0.003、输出 $0.60；高峰为两倍。估算不替代账户账单。

### 本地门禁与环境限制
最终使用独立 D 盘 TEMP/TMP 运行完整 scripts/test-local.ps1：969 passed / 3 skipped，82 个 Node 测试文件、语法检查与秘密扫描通过。第一次完整门禁（新增原因码测试前）968/3通过；中间两次补跑分别出现 Torch 原生访问异常及 C 盘临时目录空间不足。没有修改知识检索代码、测试、快照或降低断言；转用 D 盘临时目录后全量通过。

Mao 五分钟验收尚未完成，草稿 PR 不代表双模型验收通过；待作者提供许可访问的 Mao.model3.json 路径后补齐。
