# Live2D 阶段 2 实施与严格对照

2026-10-26。作者已批准 [统一入口方案](avatar-live2d-stage2-plan.md) 和独立提交 Web Core 6；本阶段完成后仍保持 #217 草稿，等待 Windows 实际观感验收。Mao 适配属于下一阶段。

## 实施边界

- Core 升级先独立提交为 `b39ab99`，版本 `06.00.0001`，SHA256 `8741f739779b5d5210872bd3d7d99f0f1e56e6c87409e7d26d6bb4b80aa1ef47`。来源、版权和 SDK 再分发声明见 `THIRD_PARTY_NOTICES.md`。`docs/live2d/vendor/` 两份运行库均未替换。
- `avatarRuntime.start()` 是两种角色共用的入口，统一配置归一化、`frameFromState`、`avatar-intent` 及 `xinyu-avatar-intent`。旧 `model_path` 继续作为 Live2D 路径；新的 Live2D path/mapping 可由 avatar 配置提供，路径仍须是现有 Web 服务可访问的模型资源。
- VRM 的原 RAF、20/30 FPS 节流和隐藏暂停平移到 VRM renderer；没有改变 VRM 姿态、房间或画质数值。`hitTest`、`isAnimating` 是可选扩展。
- 新 `live2dRenderer` 实现六个 v1 方法，使用原加载生命周期。共享帧回调在原 Pixi HIGH ticker 驱动的 Core 更新前调用，顺序仍为“表情层 → 微动作层 → Core 更新”。没有新增 Live2D 参数 RAF。
- 从 state 生成的公共帧是既有状态的语义描述；旧层继续读取其原有包络、动作占用和音频信息。内部调用的 `derived/overrides` 选项只将显式事件覆盖投影到旧层输入，避免把同一状态重复施加一次。直接调用 v1 `update(frame)` 时，传入的字段均视为显式意图。
- Hiyori 参数别名、部件、通道分组和原有姿态移入 `mappings/hiyori.json`。两个控制器不再写死模型参数 ID；分类和弹簧响应也随映射读取，改名后仍有效。不支持的取值安全忽略，Hiyori 不宣称五元音能力。
- Live2D 保留原命中、拖拽和穿透处理，只补充监听器、ticker 与 Pixi 生命周期清理，重载不会再叠加这些资源。

## 同一 Core 下的严格对照

所有本节测试都使用仓库同一份 Core 6 和打过兼容补丁的 display。旧控制器取自 **Core 独立提交完成、映射尚未开始的 `b39ab99`**，保存在 `tests/fixtures/live2d-before-mapping/`；`provenance.json` 记录原始 Git blob 的 SHA256。测试加载实际旧实现，不另写一套算法或用近似容差作为预期值。

| 验证 | 输入与实际执行路径 | 结果 |
| --- | --- | --- |
| Node 严格回归 | 实际 Core 6 WASM、实际 display 的 CubismModel、旧/新 runtime 的 Pixi ticker 回调和 Core 钩子；42 场景、5,280 帧 | 394,224 次完整调用记录（含 model/Core 更新标记）逐项严格相等；每帧参数及部件快照严格相等 |
| 浏览器完整管线 | 真实 Pixi Application + Hiyori + 物理/原生 Cubism 更新；固定随机源和时钟；10 场景、1,030 帧 | 167,741 次调用记录及每帧参数/部件快照严格相等，无页面错误 |
| 四组画布截图 | 同一浏览器环境、同一输入帧下的 idle、thinking、playful、sad | 每组前后 PNG 的 SHA256 完全相同 |
| 生命周期 | 真实模型在同一画布连续重载十次 | 原 Pixi renderer、ticker 被销毁；最终 model/app 引用清空 |
| 接口与映射 | 全部 ID 改名、缺失参数、未知意图、旧配置、共享事件、直接意图、十次订阅/清理 | Node 回归通过；Live2D 不注册公共 RAF 或替代指针处理 |

Node 场景覆盖待机、倾听、思考、12 种 delivery、13 个一次性动作、低/高幅度、静音、打断/恢复、播放代次变化、原生动作占用、拖拽、独立模型窗口和禁用表情。浏览器另包含实际加载的 Cubism 原生动作、非活跃暂停和拖拽释放。对比不使用数值容差、不省略权重或排序，也没有用最终快照代替完整序列。

此前 [Core 4/6 对照](avatar-live2d-core6-comparison.md) 的细小差异属于**不同 Core**之间的历史实验，不用于放宽本节验收。

## 复现

```powershell
node tests/test_live2d_avatar_adapter.js
node tests/test_live2d_mapping_sequence.js
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/test-local.ps1
```

浏览器辅助验收使用已有 docs 的 Playwright 开发依赖，不增加产品依赖。安装好 docs 依赖与 Chromium 后：

```powershell
node scripts/qa_live2d_adapter.cjs
```

脚本只访问自己的 localhost 验证页；默认将 PNG、证据和故障信息保存在已忽略的 `tmp_ui_smoke/avatar-live2d-stage2/`，也可用 `AVATAR_QA_OUTPUT` 指定仓库外目录。不会访问账号、真实 TTS、对话或用户配置。截图只保留在本机，不提交。

本轮本地截图和 `browser-exact-evidence.json` 保存在仓库外 `outputs/avatar-live2d-stage2-implementation/`；其中创作过程截图另整理到 `outputs/比赛材料/04_创作过程截图/`。

完整本地门禁结果见 `progress.md` 最新 Verification Evidence。剩余验收是作者在 Windows 桌面窗口检查 Hiyori 的实际观感、拖拽、穿透和模型窗口切换。PR 保持草稿；本阶段不提交模型/贴图/moc3，不涉及 Mao 元音、表情或手势接入，不改对话、记忆或 external_agent 实现。
