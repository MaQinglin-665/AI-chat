# Hiyori / Core 6 本地对照报告（阶段 2 实现前）

日期：2026-10-26。基线：main `2356ddb` 合入当前分支后的 `97ceb92`。

## 结论

**Core 6 可以加载并绘制现有 Hiyori，63 个既有 Node 测试文件在两版 Core 文件下均通过，但不能据此声称与 Core 4 逐像素或数值完全一致。** 三组固定输入存在少量像素差异，详见下表。尚未实施阶段 2 的 renderer/mapping 改动，因此本报告不是适配层改动前后验收。

新 Core 未提交。比较 Node 测试时仅临时替换工作区文件，使用 `finally` 逐字节恢复；截图验证通过仅测试用请求拦截选择 SDK Core。仓库中的两份 Core、Hiyori 表演/表情代码均保持不变。

## 来源与环境

- 原 Core：版本整数 `67239938`（4.2.2），SHA256 `29b32715c117b2c00ddd9e978cb0eb951105f56477b40f309d9feb3290bf1386`。
- 新 Core：用户已确认许可后从 Live2D 官网下载的 SDK Web `5-r.5` 中的 `06.00.0001`，版本整数 `100663297`；SHA256 `8741f739779b5d5210872bd3d7d99f0f1e56e6c87409e7d26d6bb4b80aa1ef47`。没有使用第三方 Core。
- 两组均使用 PixiJS 6.5.8、当前兼容 display `0.4.0+ai-chat.core6.1` 和同一份 Hiyori。SDK 样例、模型、截图及原 Core 备份均在 Git 外。
- 实际浏览器为隔离 Chromium / SwiftShader，viewport 1150×850、DPR 1。使用仓库已有 `tests/live2d-expressive-fixture.html/js`；情绪动态检查为模拟音量，没有调用真实 LLM/TTS。
- 这是模型渲染夹具验证，**没有替代完整 Electron 桌宠、真实语音或 Windows 人工观感验收**；不将房间/VRM 的既有结果视为本次 Live2D 证据。

## Node 与浏览器结果

| 项目 | 原 Core | Core 6 |
| --- | --- | --- |
| `node scripts/run_node_tests.js` | 63 个文件，退出 0 | 63 个文件，退出 0 |
| Hiyori 载入、绘制 | 通过 | 通过 |
| 俏皮、思考、难过模拟语音联动 | 通过 | 通过 |
| 页面异常 | 0 | 0 |

Node 测试主要使用假模型/状态夹具，不能仅以测试通过证明实际 Core 6 图像相同。实际模型证据来自单独的浏览器检查。

原 Core 恢复后的完整合并门禁：`scripts/test-local.ps1` 通过，838 Python passed / 3 skipped、63 个 Node 文件、Python/JS 语法及密钥扫描通过。新增文档的 `npm --prefix docs run check:all` 通过，包含 4 项浏览器 smoke 检查。

## 固定输入的像素与数值比较

关闭新建对照模型的自动更新，重置参数到默认值；每次按同一顺序设置参数、调用 Core update 并渲染。每帧图像为 513×720，共 369,360 像素。以下“可见差异”用相同白底合成后比较 RGB 整数值；没有修改或美化原始截图。

固定输入图用于底层 Core 对照，没有运行完整的 idle/motion/pose3 叠加，因此不代表成品默认站姿。真实动态外观参照另存的情绪截图，不能用固定输入图替代桌宠视觉验收。

| 输入 | 参数（其他参数重置默认） | RGBA 不同像素 | 白底可见不同像素 | 占比 | 最大 RGB 通道差（0–255） |
| --- | --- | ---: | ---: | ---: | ---: |
| 0 | 默认参数 | 50 | 49 | 0.01327% | 5 |
| 1 | AngleX=15、AngleY=-12、MouthOpenY=0.7、BodyAngleY=4 | 14 | 13 | 0.00352% | 2 |
| 2 | EyeLOpen=0、EyeROpen=0、MouthOpenY=0.2、Breath=0.6 | 6 | 6 | 0.00162% | 2 |

三组参数、透明度与顶点坐标合计 17,544 个标量，最大绝对差为 `0.0000012069940567016602`。像素差异很小，但“不完全相同”是实际测量结果，不能写成严格一致。不能据此推广到其他模型、显卡、Cubism 5.3 离屏效果或长时间运行。

另一个独立控制组：旧 Core 下，原 upstream display 与当前兼容补丁的同三组固定输入像素快照完全一致。这验证补丁保留旧路径，不等同于证明 Core 4 与 Core 6 相同。

## 本地证据

证据位于仓库外 `outputs/avatar-live2d-stage2/`，不上传、不打包：

- `node-core4.log`、`node-core6.log`、`node-core-comparison.json`：Node 对比。
- `hiyori-patched-old-{idle,playful,thinking,sad}.png` 与 `hiyori-patched-new-*`：真实模型动态截图。
- `hiyori-fixed-old-{0,1,2}.png` 与 `hiyori-fixed-new-{0,1,2}.png`：固定输入原始 PNG。
- `core-patched-compatibility-evidence.json`：版本、源码哈希、浏览器异常、固定输入哈希和几何比较。
- `core4-core6-pixel-comparison.json`：原始 RGBA 与白底可见差异统计。

临时 Core 替换已恢复，Git 不包含新 Core 或模型。后续提交 Core 仍需作者确认；阶段 2 映射改动应先以同一 Core 的严格参数快照一致为验收，再将 Core 引擎版本差异单独评估。
