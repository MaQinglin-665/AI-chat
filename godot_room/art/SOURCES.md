# 素材来源与许可

本次没有下载外部家具或图片贴图。下表列出全部新美术来源：本PR的原创程序几何和着色器，AI辅助编写，维护者qinglinMa；按[CC0 1.0声明](LICENSE-CC0.txt)提供，可再分发。没有从网页参考图提取像素/网格，也没有引用Booth/VRChat资产。

| 素材 | 来源链接 | 作者/来源 | 许可 |
| --- | --- | --- | --- |
| 床、床头、床垫、枕头、条纹盖毯 | [build_bed](https://github.com/MaQinglin-665/AI-chat/blob/friend/godot-room-art/godot_room/art/bedroom.gd) | 本PR原创，AI辅助，qinglinMa维护 | CC0 1.0 |
| 沙发、厚坐垫、抱枕、流苏搭毯 | [build_sofa](https://github.com/MaQinglin-665/AI-chat/blob/friend/godot-room-art/godot_room/art/bedroom.gd) | 同上 | CC0 1.0 |
| 书桌、椅子、显示器、键盘、可拿书本 | [build_desk](https://github.com/MaQinglin-665/AI-chat/blob/friend/godot-room-art/godot_room/art/bedroom.gd) | 同上；无品牌标识 | CC0 1.0 |
| 书架、彩色书脊、装饰条 | [build_shelf](https://github.com/MaQinglin-665/AI-chat/blob/friend/godot-room-art/godot_room/art/bedroom.gd) | 同上 | CC0 1.0 |
| 窗框、窗台、褶皱窗帘 | [build_window](https://github.com/MaQinglin-665/AI-chat/blob/friend/godot-room-art/godot_room/art/bedroom.gd) | 同上 | CC0 1.0 |
| 床头柜、床头灯、台灯、三脚落地灯 | [bedroom.gd](https://github.com/MaQinglin-665/AI-chat/blob/friend/godot-room-art/godot_room/art/bedroom.gd) | 同上 | CC0 1.0 |
| 流苏地毯、植物/盆、墙面装饰画与灯串 | [build_rug / plant / wall_art](https://github.com/MaQinglin-665/AI-chat/blob/friend/godot-room-art/godot_room/art/bedroom.gd) | 同上 | CC0 1.0 |
| 木地板、墙身/护墙、顶面和圆角几何 | [geometry.gd](https://github.com/MaQinglin-665/AI-chat/blob/friend/godot-room-art/godot_room/art/geometry.gd) | 同上 | CC0 1.0 |
| 程序木纹（无贴图） | [wood.gdshader](https://github.com/MaQinglin-665/AI-chat/blob/friend/godot-room-art/godot_room/art/wood.gdshader) | 同上 | CC0 1.0 |
| 窗外天空、月亮、星点、山脊/城市光点（无贴图） | [window.gdshader](https://github.com/MaQinglin-665/AI-chat/blob/friend/godot-room-art/godot_room/art/window.gdshader) | 同上 | CC0 1.0 |

## 沿用spike的验收依赖（本PR不新增或修改）

| 内容 | 来源 | 作者/许可 |
| --- | --- | --- |
| 唯一验收角色Sendagaya Shino / 千驮谷筱 | [VRoid官方说明](https://vroid.pixiv.help/hc/en-us/articles/360013482714-Sendagaya-Shino)、[spike已有模型来源](https://github.com/madjin/vrm-samples/blob/master/vroid/beta/Sendagaya_Shino.vrm) | pixiv，CC0；模型嵌入licenseName=CC0已核对，不使用私人模型 |
| Idle / Sitting_Idle等上游动画 | [Quaternius Universal Animation Library](https://quaternius.itch.io/universal-animation-library)、[现有glTF分发](https://github.com/J-Ponzo/gltf-universal-animation-library) | Quaternius，CC0；沿用animations/LICENSE.txt |
| 引擎 | [Godot 4.6.3官方归档](https://godotengine.org/download/archive/4.6.3-stable/) / [许可证](https://godotengine.org/license/) | Godot贡献者，MIT；工具在仓库外 |
| VRM/MToon导入与着色器 | [godot-vrm 2.1.0](https://github.com/V-Sekai/godot-vrm/tree/v2.1.0-assetlib) | 上游MIT及已有随附声明，未改/未重许可 |

## 仅氛围参考

[已有day/dusk/night卧室背景](../../web/assets/backgrounds/bedroom/README.md)：qinglinMa的AI生成图，按用户要求仅参考温馨配色、布艺/木材、夜景与暖灯关系。不是本模块贴图或素材来源，没有把参考图复制到art/。新美术的CC0声明不适用于这些参考图或其他上游文件。

技术接口依据：[Godot导航烘焙](https://docs.godotengine.org/en/4.6/tutorials/navigation/navigation_using_navigationmeshes.html)、[光源](https://docs.godotengine.org/en/4.6/classes/class_light3d.html)、[渲染计时](https://docs.godotengine.org/en/4.6/classes/class_renderingserver.html)。这些链接用于说明API含义，不作为美术授权来源。

## 本次polish新增（9368749之后）

以下为本PR原创程序几何/着色器，AI辅助，qinglinMa维护；沿用[CC0 1.0](LICENSE-CC0.txt)。无下载素材、外部贴图或背景图像素。

| 内容 | 来源 | 作者/许可 |
| --- | --- | --- |
| 月夜山水、樱花枝、暮色山水五幅画 | [painting.gdshader](https://github.com/MaQinglin-665/AI-chat/blob/friend/godot-room-art-polish/godot_room/art/painting.gdshader) | 本PR原创、AI辅助，CC0 1.0 |
| 城市圆形光点与柔和光晕 | [window.gdshader](https://github.com/MaQinglin-665/AI-chat/blob/friend/godot-room-art-polish/godot_room/art/window.gdshader) | 同上 |
| 哑光地板、两盆植物、睡熊、茶杯/本子/笔 | [bedroom.gd](https://github.com/MaQinglin-665/AI-chat/blob/friend/godot-room-art-polish/godot_room/art/bedroom.gd) / [wood.gdshader](https://github.com/MaQinglin-665/AI-chat/blob/friend/godot-room-art-polish/godot_room/art/wood.gdshader) | 同上 |
| 前后、诊断和小物截图 | [polish/](docs/polish/) | 本模块原创场景及既有CC0 Shino的实际引擎画面，无私人桌面 |
