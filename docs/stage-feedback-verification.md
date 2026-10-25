# 舞台反馈与新手引导验证

## 修复与原因

- 窄屏 `.conversation-rail` 使用 top 与 bottom:auto，仅有 max-height；绝对定位且 inset:0 的 `.chat-log` 无法撑高父级，两个 grid 分行成为 0px。新增明确 height（仍限制最大高度），不更改折叠规则。Edge 实测 774px、516px 下从两栏均 0px 恢复到各 206px，可见最近一轮消息。
- 新 stageFeedbackController 独立于聊天记录。chatApi 负责请求生命周期，600ms 没首字显示等待，首字/成功/取消清除，错误保留提示；使用请求代次防止旧请求覆盖新状态。apiClient 最终失败和启动 catch 提供一次启动轻提示，未改变鉴权、刷新 token 或 HTTP 返回逻辑。
- 普通失败显示短说明和现有 doctor 按钮；401 显示“访问令牌无效或缺失”、api_token 和桌宠入口检查方法。没有关闭日常鉴权。
- 引导保留四步：首步改为输入框上方、不拦截背景点击的提示，自动聚焦输入框；隐藏冗余“立即体验”，每步只有继续/开始体验一个主按钮，高级配置与稍后再说为文字样式。首跑配置向导打开时收起另一引导，避免重叠。
- Galgame 的 ::before 原先继承 background:currentColor，却没有 --ph-icon；使用已有 Phosphor book 图标消除纯色方块。
- 模型原先脚底为视口高度 96.5%，与工具栏冲突。按输入区位置和工具栏留白重新计算脚底与缩放，不改变桌宠独立模型模式。
- 半透明：窄屏 CSS 明确设置 canvas opacity:0.82 和轻微 blur，是原有氛围效果；模型 alpha 始终为 1，没有发现加载 alpha 异常。因此保留该有意样式，不擅改模型或贴图。宽屏截图未复现同样的整体透明度。

## 可复现验证

Node 单元测试覆盖等待计时、首字清除、普通错误、401 文案、终态保留、手动关闭、过期请求隔离、启动提示只一次、doctor 入口及单主按钮引导。

`scripts/test_stage_feedback_browser.js` 对本地静态 web 服务运行真实 Edge 浏览器，使用合成 401 和配置响应，不读取私人数据、不请求真实模型。覆盖两个窄屏尺寸的布局、折叠、状态显示清除和输入框可点击。需要 Playwright 可用（本次使用本机提供的工作区运行库）；结果截图写入忽略目录 tmp_ui_smoke。

修复前截图通过 HEAD 的 HTML/CSS/相关控制器响应回放获得；修复后使用本分支。保留本地模型和相同合成消息：

- before/after-lanes-774.png、before/after-lanes-516.png
- before/after-stage.png（角色位置和 Galgame 图标）
- before/after-onboarding.png、after-onboarding-narrow.png
- after-startup-auth.png、after-waiting.png、after-error.png

上述文件均位于 `tmp_ui_smoke/`，不提交。脚本的真实浏览器布局验证与模型 API 实测不同；本任务未用这些合成响应声称真实对话成功。完整本地测试结果及体验实例信息见 progress.md / session-handoff.md。

## 隔离体验

scripts/isolated_experience.py 不加载日常 config.json、config.local.json 或 .env。它从默认配置构造独立设置，先重定向持久化路径，再导入后端模块，并检查记忆、关系、学习、审计等路径均位于新测试目录。知识库指向独立 vault；禁用桌面观察、通用工具和本地 GPU 服务。只对该回环实例关闭 require_api_token，DeepSeek Key 仅来自环境。外部任务仅授权六个合成文件所在的 workspace，Codex 配置与数据目录分离。

实例记录地址、PID、停止命令和持久化路径到仓库外 instance.json；启动后保持运行。收到“体验结束”后才停止并清理该目录。此任务只本地提交，不推送、不创建 PR。
