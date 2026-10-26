# VRM 程序生成房间 v1

完整窗口的 VRM 默认使用 3D 房间。`avatar.scene = "none"` 恢复原来的 VRM + 2D 背景；
省略或未知值采用 `room`。透明桌宠始终不创建房间；Hiyori 的渲染和背景路径不变。
用户自行维护本地配置，本次没有修改私人配置或默认配置文件。

## 实现边界

- `web/avatar/vrmScene.js` 独立拥有布局、灯光、雾、生成贴图与资源释放。
  `layout(seed)` 返回纯数据：每项有稳定 id、shape、position、size、color；坐标按人物高度归一化。
  家具布局生成与 Three 对象创建分开，后续可按 item id/shape 替换家具构造器，无需改角色渲染器。
- 圆角低多边形几何体与白色 Toon 材质按形状合批，颜色放进实例属性；共五个家具批次。
  三阶渐变与柔和接触阴影为 DataTexture，窗外渐变/星星由 shader 生成。无外部房间模型、纹理或字体。
- 两面墙、地板、窗框/窗帘、樱花团块、书架/固定种子书本、灯带、落地灯、盆栽、地毯和靠垫。
  保持原上半身至大腿构图；地板、接触阴影和低处家具在该构图中通常位于画面下方，非全景镜头。
- 一个窗边方向光、两个书架点光和一个灯罩内点光、弱紫色环境光。不开实时阴影。
  白天关闭三个暖色点光；窗外与灯光参数在 2.5 秒内平滑插值。房间模式不使用旧 2D 专用人物调色。
- 每帧读取现有 `stageThemeController` 写入的 `body.dataset.stageRoom`；
  自动时段、手动锁定、顶栏标签使用同一个控制器。晨间/白天/黄昏沿用其 day 分类，夜晚为 night。
- dispose 释放实例 GPU 缓冲、几何体、材质、生成贴图，并恢复原场景雾与背景。
  `vrmRenderer.setScene()` 支持在同一角色与 WebGL 上下文中切换，主要用于生命周期验收。

## 本机实测（2026-10-25）

Electron 39.8.10；真实本地 VRM0；完整窗口 1382×898 CSS 像素、渲染 DPR 1。
相同窗口/模型，预热 1.8 秒，待机采样约 10 秒。CPU 为 Electron 各进程占用求和，
GPU 为这些进程的 Windows GPU Engine 3D 计数器求和，内存为各进程工作集之和。
这不是所有模型/硬件的性能承诺；没有将 LLM 或 TTS 负载计入待机数据。

| 指标 | 旧 2D 背景 | 3D 房间夜晚 |
| --- | ---: | ---: |
| FPS | 20.00 | 19.97 |
| CPU | 4.45% | 3.85% |
| GPU 3D | 4.93% | 4.92% |
| Draw call | 28 | 34 |
| 三角形 | 85,121 | 95,359 |
| 进程工作集合计 | 974.9 MiB | 996.5 MiB |
| renderer.load 耗时 | 540 ms | 491 ms |

GPU 约为基线 1.00 倍，低于 1.5 倍预算；draw call 低于 120。
加载耗时差异属单次测量，不据此声称提速。

实际 WebGL 连续 room→none 切换 10 次：启用后几何体/纹理恒为 25/46，
释放后恒为 20/45。请求 GC 后 JS 堆在约 71.8–72.6 MiB 之间波动，
首次 72.38 MiB、末次 71.97 MiB，没有持续上涨；没有据此声称绝对不存在泄漏。
Node 测试另外使用固定版本 Three（不创建 WebGL）逐个确认所有生成资源收到 dispose，
十次后场景子节点数归零、雾和背景恢复。真实窗口采样阶段未收到 pageerror。

## 验收与私有截图

本机实际打开 Electron，检查了夜晚、白天、过渡、scene=none、透明桌宠和 Hiyori。
昼夜截图通过现有场景控制器切换，完成后恢复原场景偏好；Hiyori 通过仅测试请求拦截选择，
未修改本地配置。聊天内容在截图前隐藏。截图仅位于忽略目录 `tmp_ui_smoke/avatar-vrm-polish/`：

- `3d-before-full.png`：原场景
- `3d-final-full.png`：夜晚房间
- `3d-day.png`：白天房间
- `3d-transition.png`：夜→昼约 1.1 秒
- `3d-none.png`：恢复 2D 背景
- `3d-final-pet.png`：透明桌宠
- `3d-hiyori.png`：Hiyori 保持原背景

模型和截图不提交、不打包、不上传到 PR。真实 VRM1 外观、长时间运行和其他硬件仍需后续验证。
本次不更改对话、记忆、外部执行或 Live2D 渲染代码。草稿 PR 等待用户 Windows 视觉验收，不自动合并。

最终门禁：`scripts/test-local.ps1` 通过（829 passed、3 skipped，全部 Node/语法/秘密扫描通过）；
`scripts/check_first_run_package.ps1` 通过。提交前 JSON 与 py_compile 检查通过。
