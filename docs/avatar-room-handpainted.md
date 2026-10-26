# 手绘房间预设 v1

`avatar.scene` 支持 `room`（默认 KayKit）、`handpainted`（手绘房间）、`none`（原 2D 背景）。
不修改私人配置或默认配置。用户在自己的 avatar 对象中将 scene 改为 handpainted 后重启即可；
渲染器既有 setScene 接口也支持三种预设的即时切换。本版不增加设置页选择器。
透明桌宠和 Live2D 不加载这两套房间。

## 素材与署名

Stylized Hand-Painted room，作者 OzerGokmen，原包 license.txt 确认 CC BY 4.0。
来源：https://sketchfab.com/3d-models/stylized-hand-painted-room-53f5744bfe89424995eed0cce43fb427
许可证：https://creativecommons.org/licenses/by/4.0/
原许可和修改清单见 web/vendor/scenes/hand-painted-room/{license.txt,ATTRIBUTION.md}；
THIRD_PARTY_NOTICES.md 同样注明作者、来源、许可和修改，不暗示作者背书。

原下载 45 张纹理均为 2048×2048，没有超尺寸图片，因此没有缩图。
只纳入 15 张原始底色图（逐字节保留）、原始 scene.bin 和调整后的 scene.gltf。
不加载法线、金属度/粗糙度图；glTF 中未使用的 image 槽指向已包含的底色图，保留原索引关系。
房间及许可约 12 MB。未纳入任何私人 VRM、截图、录像或配置。

## 米制换算与布局

先应用原 glTF 节点矩阵，再测量水平面。源地板为 y=20.46、桌面 y=73.63；
选择统一缩放 0.014 米/源单位，使书桌高 (73.63−20.46)×0.014=0.74438 米。
整个房间同倍率缩放，地面平移到 0，不单独拉伸家具。本素材没有床，未以不存在的床或门尺寸作依据。

| 参照物 | 源数据 | 米制结果 |
| --- | --- | --- |
| 书桌 | 台面 y=73.63，宽101.67、深30.03 | 高0.744，宽1.423、深0.420 |
| 沙发 | 宽109.42、顶部y=75、坐垫上表面y≈46.9 | 宽1.532、总高0.764、座面0.370 |
| 书柜 | 高102.47、沿墙宽174.8、深42.43 | 高1.435、宽2.447、深0.594 |
| 窗组件 | 竖向范围69.17～203.29 | 高1.878（包含窗框/窗台） |
| 原墙最高处 | y=263.22 | 离地3.399；展示剖面裁到2.75 |
| 补充椅子 | KayKit chair_A | 宽0.50、高0.86、深0.50；实测座面0.342 |

素材已有沙发、书柜、桌子和地毯，因此只补 KayKit 椅子，沿用紫褐色调。
原中央茶几及其小摆件在运行时移除，留出人物通道；前/右墙、屋顶做剖面裁剪。
裁剪对复制的三角形执行，UV/法线插值保留；没有改写原 scene.bin 和底色图。
窗、吊灯网格标记 userData.bloomSource 并由 metrics.bloomSources 暴露，尚未实现泛光后处理。

## 共用逻辑与回退

vrmHandpainted.js 只提供本地素材加载、布局、裁剪和材质调色。
vrmScene.js 共用生命周期、原有顶栏时段输入、2.5秒昼夜插值、人物灯光、接触阴影和释放；
vrmWorld.js 接受布局参数，共用调度、输入打断、路径算法与姿势；vrmSeating.js 共用测量/坐点解算；
vrmRenderer.js 读取预设的坐点/机位，桌面手部坐标随座位朝向变换，旧 room 保持原数值。

先保留完整 KayKit 房间。手绘素材和补充椅子全部加载成功后才换显示与活动布局；
任何依赖失败都保留 KayKit 和它的活动点，不会在旧房间里使用新坐点。
异步加载期间切场景会使结果失效并释放，不允许已销毁场景重新加入物体。
仅允许本站 /vendor/scenes/ 下明确列出的素材，无远端纹理、查询参数或用户路径加载。

可行走边界 x=[−1.70,1.30]、z=[−1.72,1.72]；按沙发、书柜、植物、书桌、椅子、小凳的实际占地定义碰撞框。
活动接近点与最终坐点分开。书桌椅子臀部位于 (0,1.36)，手肘可落到真实桌面前缘内；
沙发臀部位于 (0,−1.48)。碰撞膨胀仍用原0.22米角色半径，所有活动点两两路径测试。

## 昼夜与限制

保留手绘底色，使用 MeshBasicMaterial。夜晚乘偏冷、较暗的颜色，人物由室内灯和月光照亮；
白天恢复暖亮色，室内点光关闭。两者均可用，仍无法改变画在贴图里的阴影、窗外反光和明暗方向，
不宣称具有真实重打光。剖面外可见背景色；没有实时阴影/全身衣物碰撞。
窗边伸手和桌面平手的旧姿势改进仍是待办；本版不改动作类型或对话/记忆/外部执行代码。

## 验收

Node：本地依赖闭包/拒绝外域、活动点与路径、确定性调度、机位面向、两种模型比例的坐点、
昼夜参数、失败回退、销毁中加载完成和重复释放。
Python：API 只透传 room/handpainted/none，未知值回到 room。
安装源包检查递归比对房间素材、原许可和修改说明的哈希。

实际 Electron 截图仅在忽略目录 tmp_ui_smoke/avatar-vrm-polish/：
handpainted-compare-{room,handpainted}.png（同陪伴机位）、handpainted-wide-{night,day}.png、
handpainted-{window,books,rest,desk}.png；handpainted-tour.mp4 为35秒静音录像。
验收脚本只在测试内保持窗口渲染活动并提前选择活动，不改变正常1～3分钟调度，不修改私人配置。
真实模型为本地 VRM0；VRM1/长短腿使用假骨骼，未做真实 VRM1 外观或真实语音服务验收。
最终门禁和资源切换结果见 progress.md。

最终验证：scripts/test-local.ps1 通过（830 passed、3 skipped，全部 Node/语法/秘密扫描通过）；
scripts/check_first_run_package.ps1 通过，逐个核对新素材、许可、署名说明哈希。
真实 Electron 无页面异常，强制 scene.gltf 请求失败后回退 room。十次切换资源稳定：
KayKit 28 geometries / 47 textures；手绘 41 / 60。陪伴视角 draw call 36→42，活动视角38～47。
本轮没有重新测量 CPU/GPU 百分比，不把 draw call 数当作 GPU 占用证明。
