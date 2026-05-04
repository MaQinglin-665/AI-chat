# Task 023: web/chat.js frontend boundary audit

## 背景
- Task 022（commit `0df0719`）已完成 Live2D expression 强度调优。
- 该任务暴露了 `web/chat.js` 体量过大、共享状态过多、职责边界不清的问题。
- 本任务只做前端边界审计与拆分路线文档，不做行为变更。

## 目标
1. 梳理 `web/chat.js` 主要责任区和关键入口。
2. 标注高耦合共享状态及读写路径。
3. 总结 Task 022 暴露的边界风险。
4. 给出低风险、可回滚、分阶段拆分路线。
5. 明确每阶段验证方式和禁止事项。

## 范围
- `web/chat.js`（仅审计，不修改）
- `docs/web-chat-boundary-audit.md`（新增）
- `tasks/codex/023-web-chat-boundary-audit.md`（本文件）

## 约束
- 不修改 `web/chat.js`。
- 不改后端、TTS、ASR、动作桥、模型资源。
- 不引入新依赖。
- 不做大规模重构。
- 文档结论必须诚实、具体、可执行。

## 交付物
- `docs/web-chat-boundary-audit.md` 包含：
  - 责任区划分（UI/chat、TTS/ASR、Live2D、Runtime bridge、cross-window sync、memory/reminder）。
  - 高耦合共享状态清单（含 `speechAnimMood`、`moodHoldUntil`、`moodExpression*`、`speechMouthOpen`、`speechAnimUntil`、`state.model`/`expressionEnabled`/`motionEnabled`）。
  - Task 022 暴露边界问题总结。
  - 四阶段低风险拆分路线、每阶段验证方式与禁止事项。

## 验证方式
- 仅文档审阅验证：
  - 术语、函数名、状态名与当前 `web/chat.js` 一致。
  - 责任区与行号引用可在源码定位。
  - 阶段拆分不包含运行行为修改承诺。

## 验收标准
- 审计文档覆盖目标中的全部要点。
- 拆分路线具备执行顺序、验证方法、禁止事项。
- 无代码行为变更、无新增依赖、无无关修改。
