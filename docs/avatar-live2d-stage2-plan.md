# Live2D 阶段 2：统一入口接入方案（作者已确认）

2026-10-26 更新：作者已批准以下入口/时钟方案及独立提交 Web Core 6；实施和同一 Core 下严格对照结果见 [阶段 2 验证报告](avatar-live2d-stage2-verification.md)。以下背景保留方案提交时的结构诊断。

本方案基于 main `2356ddb` 合入后的 `97ceb92`。阶段 1 已获作者验收，本文只说明阶段 2 的最小结构调整；**尚未改动渲染实现，也未开始 Mao 的元音或手势适配**。

## 为什么先提交方案

按本轮要求：如果现有入口结构不适合直接接入 Live2D，先给作者修改方案，不直接大改。

当前存在以下实际耦合：

| 位置 | 现状 | 直接增加 `kind` 分支的影响 |
| --- | --- | --- |
| `web/avatar/avatarRuntime.js`，`start()` | 固定调用 `XinyuVRMRenderer.createRenderer` | 尚不是可选择两种渲染器的工厂 |
| 同文件，`tick()` / `apply()` | 帧率直接取 VRM 的 `QUALITY`，准备动作时间直接取 VRM 的 `EXPRESSION` | Live2D 会继承 VRM 的 20/30 FPS 和准备策略 |
| 同文件，指针处理 | 无条件调用 `hitTest`，ticker 无条件调用 `isAnimating` | 这些是 VRM 的扩展方法，不是意图接口 v1 的必需方法 |
| `web/live2dRuntimeController.js`，`initLive2D()` | 只有 VRM 会进入 `avatarRuntime.start()`；Live2D 继续独立初始化 | 简单添加新 renderer 文件不会使它真正走统一入口 |
| 同文件，`attachSynchronizedModelUpdate()` / `patchCoreModelUpdate()` | Pixi ticker 先更新模型，Core 更新前按既定顺序叠加表情和微动作 | 再由公共 RAF 直接更新参数，可能造成重复更新、叠加顺序改变和 Hiyori 行为变化 |
| `avatar_assets.py`，`/api/avatar` | Live2D 只返回 `{kind: "live2d"}`，没有 path/mapping | 需要在统一配置归一化中保留旧 `model_path`，而不是再增加一条选择路径 |

因此，先确认**谁拥有帧时钟、Core 参数写入及资源释放**，再进行映射平移。以下是建议边界，不是已经完成的实现。

## 建议修改

### 1. 在既有 avatarRuntime 内统一选择与事件

- 在 `avatarRuntime.start()` 内按归一化的 `source.kind` 选择 Live2D/VRM 工厂。没有 avatar 配置时，将旧 `state.config.model_path` 归一化为 Live2D source；不修改用户配置。
- `live2dRuntimeController.initLive2D()` 的两种类型都进入同一个 `avatarRuntime.start()`。原 Live2D 加载步骤通过窄范围生命周期回调交给适配层使用；不复制初始化代码，也不保留第二条 renderer 选择分支。
- 保留一份 `frameFromState`、一份 `avatar-intent` / `xinyu-avatar-intent` 订阅与一份清理逻辑。新增字段均使用意图接口 v1 的名称；显式事件覆盖仍使用相同规则，未知意图交给 renderer 安全忽略。
- 去掉公共代码对 `XinyuVRMRenderer.QUALITY/EXPRESSION` 的直接依赖，改由选中的渲染工厂提供内部运行策略。VRM 的当前值保持不变。

### 2. 分开帧来源与渲染器自己的时钟

- 公共 runtime 负责生成并合并意图帧；renderer 负责模型参数、自己的渲染资源与更新时序。
- VRM 继续沿用现有 RAF 与 20/30 FPS 限流，不变更房间、相机、站姿或准备表情。
- Live2D 继续使用原 Pixi 60 FPS ticker 和原更新优先级；**不另建一个负责写 Core 参数的 RAF**。
- 建议只增加内部的时钟订阅适配点：公共帧回调可以由 RAF 或 Pixi ticker 驱动，返回统一清理函数。它不新增对上层公开的意图字段，也不改变 renderer v1 的六个方法。
- Live2D 在原 `core.update()` 前的同一位置应用该帧，原“表情层 → 微动作层 → Core 更新”的顺序、delta 限制和拖拽门控保持不变。`update(frame)` 存储当帧语义，不允许公共 RAF 和 Pixi ticker 各写一次参数。
- `hitTest` / `isAnimating` 作为内部可选扩展处理；Live2D 保留原点击穿透、拖拽与布局逻辑，不能用一个永远 false 的降级替代真实命中行为。

### 3. 添加 Live2D 适配层与映射

- 新建 `web/avatar/live2dRenderer.js`，实现 `load/dispose/capabilities/update/playAction/stopAction`。
- `load` 接受 `{path,mapping}`，负责映射加载与原 Live2D 初始化生命周期；`dispose` 幂等地清理自己持有的 ticker、窗口监听、闲置动作和 Pixi 资源。
- 新建 `web/avatar/mappings/hiyori.json`，记录参数别名、现有表情/动作及所需姿态信息。路径只指向现有 Hiyori；不包含任何模型资源。
- `hiyoriPerformanceDirector.js` 和 `live2dExpressionController.js` 中的模型参数名改为从映射读取。只平移名称和查找方式，保留权重、默认值、随机调用顺序、时间常数和参数叠加顺序；不趁机拆分大文件。
- 对不支持的 face/action/gesture/vowel 使用已有安全回退，未知意图不报错。Hiyori 没有五元音能力时，`capabilities().vowels` 为 false。

## 拟改文件与边界

| 文件 | 计划内容 |
| --- | --- |
| `web/avatar/avatarRuntime.js` | renderer 工厂、统一 source、公共帧/事件、内部时钟订阅点及可选扩展 |
| `web/avatar/live2dRenderer.js`（新增） | Live2D v1 适配层，保留原生命周期时序 |
| `web/avatar/mappings/hiyori.json`（新增） | 现有 Hiyori 的参数映射 |
| `web/live2dRuntimeController.js` | 两种类型均进入统一入口；原加载、布局、拖拽回调交给适配层，不复制 |
| `web/hiyoriPerformanceDirector.js`、`web/live2dExpressionController.js` | 参数名称映射平移，不改变数值算法 |
| `web/index.html` | 如需，增加映射/适配层的本地脚本引用；不改变界面 |
| 现有/新增 Avatar Node 测试及测试 runner | 双 renderer 路由、共享帧/事件、生命周期、快照对照 |

本阶段不改 VRM 实现、房间或三方 bundle；不改对话、记忆、外部执行；不引入新的模型文件或依赖。
阶段 2 首先使用现有 Web 可访问的 Hiyori 和旧配置；若后续 `models_local` 的模型资源服务需要变更，应另列范围，不能把任意本地路径暴露到 HTTP。

## 验收与停止条件

1. 基线固定为 `97ceb92`。记录随机源、输入帧和时钟，覆盖待机/倾听/思考/说话、情绪、一次性动作、停顿/打断/恢复、拖拽和 authored motion 占用。
2. 用同一组输入对比修改前后的**完整参数写入序列和最终参数快照**，包括 set/add 类型、顺序、参数、值和权重；严格一致才接受映射平移。测试加载保存的旧实现作为对照，不手写另一份算法来充当“基线”。
3. 工厂测试确认 kind=live2d 只创建 Live2D、kind=vrm 只创建 VRM；旧 `model_path` 归一化兼容，二者使用同一 frameFromState 和意图事件订阅。restart/dispose 不残留 ticker、RAF 或监听器。
4. 原 VRM cadence、隐藏暂停、准备广播和房间生命周期测试保持通过。未知意图、缺失参数/表情/动作安全忽略。
5. 不同 Core 的截图、数值与 Node 结果单独报告，不能用视觉近似替代严格一致。作者已批准先独立提交 Web Core 6；文档目录的 Core/display 不变，映射严格对照统一在 Core 6 下进行。
6. 方案确认并完成实现后，运行完整本地门禁和适当的文档检查，推送 draft PR，停下等待 Windows 检查；不自行合并。

## 方案提交时的停止点（已获确认）

已同步 main，四个预计冲突均保留双方内容；Live2D 与 VRM 的许可条目、feature 条目、完整历史均已保留。四组目标 Node 验证通过。
方案提交时仅新增方案、Core 对照报告及状态记录，尚未实施 runtime 调整或映射平移。作者随后确认了这一边界；当前实施与验证状态以阶段 2 验证报告和最新 `session-handoff.md` 为准。
