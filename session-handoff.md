# Session Handoff

## Current state — 2026-09-22

- 本轮 `daily-runtime-acceptance-v1` 限定范围审查及修复完成，active_task null；日常响应稳定性未判定通过。
- 目录 `D:/AI/ai_desktop_pet_harness_20260922`；分支 `codex/daily-runtime-acceptance-20260922`；基线 `6c85822`。
- 前轮本地提交：文档 732957b、Live2D f28553c、流完整性 887bc80、记忆日志 6c85822。均未推送/部署。

## Files touched / Evidence

- web/phosphorIcons.css：修复分离聊天窗口放大装饰图遮挡消息。
- scripts/electron_ui_smoke.js：适配独立自检面板、检查真实依赖与图片尺寸、重新读取流式最终回复、记录耗时。
- docs/daily-runtime-acceptance-2026-09-22.md 及三份状态文件：完整证据与限制。
- 生产 Electron 启动成功，真实 LLM 多轮返回、Qwen3-TTS 生成非静音音频，流中断后的新请求恢复成功；最终 Electron smoke ok=true。
- 全 Node 套件与 JS 语法通过。未修改 Python 运行时，不重复声称新的 Python 全量结果。
- 测试进程已关闭，8123/9881 无监听；本轮 config.json/.env 副本已删除。原日常工作区/凭据/记忆未覆盖。忽略目录 tmp_ui_smoke 保留本轮截图、合成测试音频及本地日志。

## Remaining acceptance

- 模型连接波动显著：曾约 10 秒断连，完整回复有约 10 秒到一分钟以上；最新轮 33.7 秒。单轮成功不能当作稳定验收。
- 比较模型/连接需用户选择，不永久改变日常模型。当前配置 character_runtime 未开启，本轮不证明全部动作联动在实际配置生效。
- 麦克风打断、人工听评、音画同步、小时级运行及安装包验收仍待完成。HTTP 取消测试不等于真实说话打断。
- 桌面控制工具初始化失败，用仓库 Electron 脚本验证并检查截图；脚本的窗口 IPC 是测试替身，生产窗口操作未全覆盖。
- QQ 和旧发布事项保持原状态；不要自动开展或覆盖原脏工作区。
