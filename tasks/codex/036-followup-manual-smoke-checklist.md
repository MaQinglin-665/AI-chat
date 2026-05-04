# Task 036: Follow-up manual execution smoke checklist

## 背景
- Task 031~035 已完成 follow-up planner / debug / manual execution / guard polish。
- 当前仍未引入自动 proactive 触发，仅保留 DevTools 手动入口：
  - `window.__AI_CHAT_DEBUG_TTS__.conversationFollowup()`
  - `window.__AI_CHAT_DEBUG_TTS__.runConversationFollowup()`

## 目标
1. 新建可执行 smoke checklist 文档，供后续每次改 follow-up 链路时回归。
2. 覆盖默认禁用、eligible 构造、成功执行、失败恢复、安全边界、debug events、回归记录模板。
3. 仅文档改动，不改运行行为。

## 产出
- `docs/conversational-followup-smoke-checklist.md`
- `docs/conversational-mode-design.md`（Task 036 landing notes + 链接）

## 严格约束
- 不改 JS/Python
- 不引入自动 proactive 触发
- 不新增依赖
- 文档需中文、可执行、面向开源协作者

## 验证
1. `git status --short` 仅 docs/tasks 文档变更
2. `git diff --check` 通过
3. 人工阅读 checklist，确认覆盖以下项：
   - 前置条件
   - 默认禁用验证
   - pending/eligible 构造
   - 成功执行验证
   - 失败恢复验证
   - 隐私/安全验证
   - debug events 验证
   - 回归记录模板
