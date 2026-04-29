# Task 016：Character Runtime demo enablement docs

## 任务背景
Task 015 已补齐 Character Runtime 端到端验证文档。
本任务继续补齐「如何开启 demo」与「如何快速验证链路」的落地说明，降低开发者启用门槛。

## 本次目标
- 新增启用文档：`docs/character-runtime-demo.md`
- 说明 Character Runtime 默认关闭与开启方式
- 说明 metadata 返回、跨窗转发、Live2D 表情/动作反馈链路
- 提供 DevTools 手动验证命令与预期结果
- 补充常见问题边界（资源缺失、LLM 500、窗口/桥接误判）

## 约束
- 不做大功能
- 不改默认行为
- 不改后端 response shape
- 不改前端 UI
- 不改 Live2D 行为
- 不改 TTS 行为
- 不接记忆
- 不接主动互动
- 不新增依赖

## 关键说明点
1. `character_runtime.enabled=true` 才注入 runtime structured prompt contract
2. `character_runtime.return_metadata=true` 才返回可选 `character_runtime` metadata
3. metadata 由 chatWindow 处理后通过 `BroadcastChannel("taffy-character-runtime")` 转发到 modelWindow
4. emotion/action 在前端既有桥接中触发表情/动作尝试；unknown/none 安全跳过
5. 关闭开关可回退到默认行为

## 示例配置
```json
{
  "character_runtime": {
    "enabled": true,
    "return_metadata": true
  }
}
```

## DevTools 验证命令
```js
window.__AI_CHAT_DEBUG_CHARACTER_RUNTIME__.testEmotion("happy")
window.__AI_CHAT_DEBUG_CHARACTER_RUNTIME__.testAction("wave")
window.__AI_CHAT_DEBUG_CHARACTER_RUNTIME__.emit({
  emotion: "annoyed",
  action: "shake_head"
})
```

## 输出文档
- `docs/character-runtime-demo.md`
- `docs/character-runtime-integration-plan.md`（Task 016 落地补充）
- `README.md`（新增一个短入口链接）
