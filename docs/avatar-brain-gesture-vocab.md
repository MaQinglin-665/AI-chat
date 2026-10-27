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

本地视频：`tmp_ui_smoke/vocab/hiyori-video/page@0f84fd999600e308a19b72169fa8e0c7.webm`。素材和响应记录全部被忽略。作者随后提供官方 Mao 模型并确认条款；复制到忽略的 models_local/Mao，只读源目录。实际模型映射校验 modelChecked:true，无错误或警告。

费用按返回的 usage（包括缓存命中）估算。价格来源：[DeepSeek 官方定价](https://api-docs.deepseek.com/quick_start/pricing/)，2026-10-27 核对；deepseek-flash 每百万 token 非高峰输入未命中 $0.15、命中 $0.003、输出 $0.60；高峰为两倍。估算不替代账户账单。

### 本地门禁与环境限制
最终使用独立 D 盘 TEMP/TMP 运行完整 scripts/test-local.ps1：969 passed / 3 skipped，82 个 Node 测试文件、语法检查与秘密扫描通过。第一次完整门禁（新增原因码测试前）968/3通过；中间两次补跑分别出现 Torch 原生访问异常及 C 盘临时目录空间不足。没有修改知识检索代码、测试、快照或降低断言；转用 D 盘临时目录后全量通过。

Mao 五分钟录像及短补查已完成，具体结果如下；保持草稿供作者检查，不宣称首轮行为全部成功。


## Mao 补充实测（2026-10-27）

源目录 D:/AI/local-models/live2d/Mao 只读复制到当前 worktree models_local/Mao，未用链接、未修改源文件、未提交模型。独立内存配置使用 avatar.path=models_local/Mao/Mao.model3.json、mapping=/avatar/mappings/mao.json，端口8192，daily 档；Key 仍只读环境变量。验收实例已停止，复制的模型随本 worktree 将来清理，源模型保留。

- 命令 `node scripts/validate_live2d_mapping.js --mapping web/avatar/mappings/mao.json --model models_local/Mao/Mao.model3.json` 返回 modelChecked:true、errors:[]、warnings:[]。
- 首轮录制300.817秒，文件304.52秒，完整解码通过；Mao画面与聊天可见，无页面异常。9次成功模型响应（4次聊天、4次翻译、1次主动思考），5753 tokens：命中4224、未命中1359、输出170，非高峰估算$0.000318522。模型多次返回 `<abstain /> </abstain>`，页面暴露该文本；第三条聊天产生 think/tilt_head 计划，但本轮没有终态ACK。主动思考返回 look_at user/tilt_head，未形成发布记录。仅凭这段录像不能认定执行通过；首轮未记录完整计划失效原因，原因尚未确定，不推断为渲染器故障。
- 为核对接口，另起同样配置的65.397秒补查，仅在忽略的测试服务加入只读轮询状态记录，产品代码未变。真实模型返回 wave → look_at left，执行器按序完成，两个completed/done回执被后端确认并记录。无页面错误，后台计划最终completed，typing/speaking/busy均已释放；模型只返回控制块，没有额外可见文本。1次调用1044 tokens（命中768、未命中226、输出50），估算$0.000066204。
- Mao两次总计10次成功模型响应，6797 tokens，约$0.000384726（高峰上界两倍）。这里区分聊天、翻译和主动请求，不将翻译调用藏在四次聊天之下。仅统计捕获到成功返回usage的请求；失败请求的实际计费以服务商账单为准。
- 无渲染器、映射或其他产品修复。本轮是浏览器实际模型/后端验收，不是原生Electron听评；视频无系统音轨。未补造或注入固定动作计划。

本地录像（不上传PR）：
- 五分钟：`tmp_ui_smoke/vocab/mao-video/page@8ebceefdcf6beeb2b914cf7354849a12.webm`
- 成功执行补查：`tmp_ui_smoke/vocab/mao-diag-video/page@9260882aa3976965fe2b6b20e2f32e00.webm`

原实现提交 e60b1bc 的Linux/Windows及其他CI全通过。此轮只更新验收文档，不修改已验证代码；首轮模型异常文本和未回执现象保留为验收限制，请作者看录像后决定后续处理。
