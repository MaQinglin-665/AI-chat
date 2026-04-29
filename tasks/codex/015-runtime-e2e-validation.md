# Task 015：Character Runtime end-to-end validation

## 任务背景
Task 005-014 已完成 Character Runtime 的主链路能力：
- runtime prompt / normalize
- metadata opt-in response
- frontend metadata bridge
- chat -> model BroadcastChannel
- emotion/action to Live2D feedback
- debug bridge

本任务聚焦端到端验证文档与开发期检查，确保链路可重复验证。

## 本次目标
- 新增 E2E 验证文档：`docs/character-runtime-e2e-validation.md`
- 明确从 LLM 输出到 Live2D 反馈的验证路径与预期结果
- 明确默认关闭兼容性验证
- 明确已知限制与排障边界

## 约束
- 不做大功能
- 不改后端 response shape
- 不改前端 UI
- 不改 Live2D 行为
- 不改 TTS 行为
- 不接记忆
- 不接主动互动
- 不新增依赖

## 验证覆盖
1. runtime 默认关闭兼容性
2. runtime enabled 的 structured prompt 注入
3. metadata opt-in 返回条件
4. chatWindow metadata 接收
5. BroadcastChannel 跨窗转发
6. modelWindow emotion/action bridge
7. debug bridge 手动触发
8. runtime 关闭回滚行为

## 手动命令（chatWindow DevTools）
```js
window.__AI_CHAT_DEBUG_CHARACTER_RUNTIME__.testEmotion("happy")
window.__AI_CHAT_DEBUG_CHARACTER_RUNTIME__.testEmotion("annoyed")
window.__AI_CHAT_DEBUG_CHARACTER_RUNTIME__.testAction("wave")
window.__AI_CHAT_DEBUG_CHARACTER_RUNTIME__.emit({
  emotion: "surprised",
  action: "shake_head"
})
```

## 预期结果摘要
- happy: 尝试开心反馈
- annoyed: 走 angry/不爽反馈
- wave: 尝试动作或轻量 pulse
- unknown/none: 不报错
- chat text 不变
- TTS 不变

## 已知限制
- 暂无前端自动化测试命令
- Live2D 表现依赖模型资源
- motion 缺失时应安全降级
- LLM provider 故障导致 `/api/chat` 失败属于后端问题，不等同于 runtime frontend bridge 问题

## 输出文档
- `docs/character-runtime-e2e-validation.md`
- `docs/character-runtime-integration-plan.md`（Task 015 落地补充）
