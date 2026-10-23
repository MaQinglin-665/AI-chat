# 开发者源码试用

适用于 Windows 10/11、能使用 Git，并自行提供模型 API Key 的受邀测试者。
当前仓库是公开仓库；“邀请熟人试用”不等于“源码仅受邀者可见”。本轮没有修改仓库可见性或邀请成员。

## 安装与配置

1. 安装 Python 3.12、Node.js 与 Git。在新的目录克隆仓库，切换到分享者指定的已提交分支或提交。
2. 在仓库目录运行 `prepare_preview_environment.bat`，使用独立的 `.venv`，不要复用作者电脑的全局 Python 环境。
3. 运行 `powershell -NoProfile -ExecutionPolicy Bypass -File scripts/configure-llm.ps1`，填写自己的服务商、HTTPS API 地址、模型名和 API Key。本机 Ollama 等 loopback 服务可使用 HTTP。
4. 运行 `start_electron.bat`，先测试一条文本消息，再按需配置语音及 Live2D 素材。仓库里的模型路径可能仍是占位符；素材获取与授权见 [首次安装](first-install.md) 和 [第三方声明](../THIRD_PARTY_NOTICES.md)。
5. 遇到问题，记录系统版本、代码提交、服务商名称、错误提示；提交日志前删除凭据、聊天内容及个人路径。

Key 保存在本机 `.env`，其他本地覆盖写入 `config.local.json`。不要互相复制私人配置、记忆备份或声音样本。

## 本轮行为变化

- `llm.turn_timeout_sec` 默认 30 秒，约束首批流数据等待、非流式请求和重试预算。流开始后使用 `stream_idle_timeout_sec`（默认 15 秒）检测数据中断，另由 `stream_max_sec`（默认 180 秒）限制持续流时长。这里的“数据”是传输数据，不一定已经是可见台词；真实思考模型仍需实测。该预算不约束任意本地工具、记忆计算或 TTS 的执行时间。
- 连接失败不重试其他模型接口；收到部分文本后发生错误，也不重新生成一遍回复。系统会显示可读错误，不伪造模型回复或写入记忆。
- 本机、私有网段、链路本地、Tailscale/CGNAT `100.64/10` 和 `.local` 地址允许 HTTP。其他远程 HTTP 默认拦截，只有用户明确设置 `llm.allow_insecure_http: true` 才放行，并按主机记录一次警告；Key 和聊天内容此时不加密。连接测试使用相同策略。HTTPS 降级及跨主机重定向始终拒绝；优先使用服务商确认的 HTTPS 地址。
- 隐藏的 Live2D 窗口延后加载模型，首次切换可能稍有等待；两个窗口都使用过之后各保留自身渲染器，避免破坏透明窗口恢复。
- 调试面板脚本只在 `?dev=1` 或已有开发开关启用时加载。普通运行保留诊断接口及实际角色表演能力。
- 静态 JS/CSS/贴图可保存并重新验证缓存；API、配置和页面仍 `no-store`。开发时可设置 `TAFFY_DEV_NO_CACHE=1`。
- HTTP 访问日志默认关闭，可用 `TAFFY_HTTP_ACCESS_LOG=1` 输出至 stdout。Electron 后端日志每份最多约 2 MiB，保留一个同大小轮转文件。

## 验证与限制

直接依赖已固定版本。完整依赖解析结果和测试证据见 [修复审查](readiness-audit-20261023.md)。
本轮不发布安装包，不改变 `main`，不包含作者的真实模型 Key、私有模型文件或声音样本。
