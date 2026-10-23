# 开发路由与验证

入口规则以根 AGENTS.md 为准。本页保存仓库事实；Skill 负责流程，不固化版本、私有路径或测试数字。

## 按任务读取

| 目标 | 先读模块/证据 | 关键边界 |
| --- | --- | --- |
| LLM、主动对话 | app_chat_route.py、llm_runtime.py、natural_conversation.py、companion_dialogue_policy.py、web/autoChatController.js | 保留回退、沉默/延后语义与用户最新一轮优先级 |
| Galgame | galgame_context.py、galgame_director.py、web/chatApi.js、web/chatReplyController.js、web/galgamePlayer.js、web/galgameController.js | 模型逐句协议、资源白名单、手动场景锁、取消后不播放旧音频；验收边界见 docs/galgame-live-acceptance.md |
| Live2D/声音 | app_tts_route.py、tts.py、web/hiyoriPerformanceDirector.js、web/live2dExpressionController.js | 使用真实播放状态/音频能量，保留打断、表情释放与旧配置兼容 |
| 记忆 | memory.py、memory_store.py、memory_selection.py、obsidian_knowledge.py、web/learningReviewController.js | 删除后不可被旧镜像召回，不用私人记忆构造测试 |
| 首跑/配置/发布 | first_run.py、config.py、app_config_route.py、scripts/test-local.ps1、.github/workflows/ci.yml | 先读脚本再执行，源码合并不等于安装包发布 |
| QQ 桥接 | qq_identity.py、integrations/astrbot_plugin_taffy_qq_bridge/README.md、对应 feature | 外部实例验收仍未闭环；本地测试不证明云端成功，不得自行发送消息 |

## 验证矩阵

命令在选定仓库根目录执行。依赖缺失说明环境，不自动初始化私人运行配置。

| 改动 | 最小验证 | 补充证据 |
| --- | --- | --- |
| AGENTS、Skill、状态文档 | JSON 解析、链接/命令存在性、状态 ID 一致性、git diff --check、secret scan；Skill 的 quick_validate.py | 结构评分不证明实际任务质量 |
| Python | 相关 `tests/test_*.py` 的 pytest、`python scripts/check_python_syntax.py` | 跨模块契约再跑完整 Python 套件 |
| 前端行为 | 相关 `tests/test_*.js` 的 Node 测试、`python scripts/check_js_syntax.py` | UI/声音补浏览器或 Electron 操作，静态断言不替代视听验收 |
| 跨端/首跑/发布准备 | `powershell -NoProfile -ExecutionPolicy Bypass -File scripts/test-local.ps1` | 按 CI 补安装器/源码包检查，CI 状态独立核对 |
| docs 网站页面/工具 | `npm --prefix docs run check:all` | 需要 docs 依赖和 Playwright 浏览器；普通 Markdown 记录不自动要求网站回归 |

Python 和 Node 可独立运行：

```powershell
$env:PYTEST_DISABLE_PLUGIN_AUTOLOAD = '1'
python -m pytest -q tests
node scripts/run_node_tests.js
python scripts/check_python_syntax.py
python scripts/check_js_syntax.py
python scripts/check_secrets.py
```

逐项确认退出码，不因后续命令成功掩盖前面的失败。没有执行 doctor、安装器或网站检查时，不能把这些独立命令称为完整门禁通过。选择具体测试文件时先查 scripts/run_node_tests.js 与 tests 目录，不把通配占位当实际命令。

## Skill 路由

本机 `xinyu-project-workflow` 位于 Codex skills 根目录同名文件夹，用于此项目的接手、进度审查与开发验证。缺失时按 AGENTS.md 和本页执行，不阻塞任务。

- `harness-creator` 用于指导与状态体系审查，`skill-creator` 用于 Skill 修改。
- Live2D 运行时不是 Codex 动画宠物图集，不因“桌宠”一词调用 hatch-pet。
- 不因存在 UI 就启动整站重设计；B 站下载按用户要求使用 video-summarizer。
- 外部 Skill 只在实际能力缺口出现时查找，阅读内容和依赖后决定采用，不直接运行陌生安装脚本。

## 完成证据

交接记录日期、目标、仓库/分支/基线、修改文件、命令和结果、验收层级、剩余问题与下一步。complete 对应条目范围；代码完成仍需注明真实模型、听评、整机或外部服务验收限制，不用单一百分比概括项目。
