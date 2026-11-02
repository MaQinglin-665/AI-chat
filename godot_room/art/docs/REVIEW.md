# 实际引擎截图与同机位对照

2026-11-01，Godot4.6.3 / Forward+ / 1280×720 / 2×MSAA。均为真实引擎原始截图，无AI补绘/后处理，仅使用spike已有CC0千驮谷筱；不读取私人模型或配置。场景、材质和灯光为本PR原创程序美术。参考背景图未作为贴图。

## 三套光照：固定相机

相机(0,1.7,3.65)，目标(0,0.95,0)，垂直FOV50°；与#238的three.js/Godot对照机位完全相同。新图1280×720，原图960×540，宽高比一致；比较的是不同布景，不能当作相同材质的渲染器精度对比。

| day | dusk | night |
| --- | --- | --- |
| ![day](01-comparison-day.png) | ![dusk](01-comparison-dusk.png) | ![night](01-comparison-night.png) |

| #238 three.js | #238原Godot方块房间 | 本PR夜间美术 |
| --- | --- | --- |
| ![three.js](../../docs/spike/three-room.png) | ![原Godot](../../docs/spike/godot-room.png) | ![新夜间房间](01-comparison-night.png) |

窗面改为夜蓝天空/山脊/城市光点的低亮原创着色器，人物由主光+前补光照亮，暖点光只补局部。三套环境保留卡通角色；具体观感请qinglinMa检查。

## 家具、坐姿与导航

| 内容 | 实际截图 |
| --- | --- |
| 室内广角/角色站立 | ![广角](02-room-wide-night.png) |
| 床、布艺和左墙装饰 | ![床](03-bed-and-textiles.png) |
| 书桌椅、书架与植物 | ![书桌](04-desk-and-shelf.png) |
| 千驮谷筱在沙发上 | ![坐姿](05-shino-sofa-night.png) |
| 实际烘焙导航网格（仅此图隐藏视觉顶面，碰撞不改） | ![导航](06-baked-navigation.png) |

绿色半透明区域直接来自NavigationMesh顶点/多边形，不是示意图。床/沙发顶面孤岛已排除。坐姿截图在离线验收脚本中用原动画和Seat标记对齐髋部，**没有修改主线自动入座逻辑**。主线接入Marker后仍需按角色身高调校坐面接触和起身。

## 文件摘要

| 图片 | 字节数 | SHA256 |
| --- | ---: | --- |
| [01-comparison-day.png](01-comparison-day.png) | 384165 | `94ee62db9a352e6616fbe8f55170b4c37b2930be25244e6b6e65c1abbb571566` |
| [01-comparison-dusk.png](01-comparison-dusk.png) | 486062 | `c032d17eab6641d0b7e0002c422f8bec86b7398421b0751d74ef90a987ea2952` |
| [01-comparison-night.png](01-comparison-night.png) | 510944 | `d9f6cc5ee5c6edc02663c5d47776f64dc9a185b17c4296bc160700f2a0ef2523` |
| [02-room-wide-night.png](02-room-wide-night.png) | 529067 | `7c071a0e4974a18260b2d5ce82e486fba5af92ad8931bbc0a89024965dec7d0c` |
| [03-bed-and-textiles.png](03-bed-and-textiles.png) | 334936 | `f5dae28882552197cfa2af655888e9454fbc96c54c0237bb790edc8bdfb02151` |
| [04-desk-and-shelf.png](04-desk-and-shelf.png) | 561139 | `39dc3fb12047a98bfc10377b167d5d6f25e576410a32217adebc5c0e0b69dd3a` |
| [05-shino-sofa-night.png](05-shino-sofa-night.png) | 376433 | `dc7355fe3abe0ef9e38a005194c5edb7a6fe595273967f44c1c509e1071fcfb9` |
| [06-baked-navigation.png](06-baked-navigation.png) | 756896 | `dc1310583795cacaf391725d9a2e6d0b0757533ca5db29b15edc131fbeb717de` |
