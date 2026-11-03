# 温馨卧室美术模块

当前版本 bedroom-quality 基于 main 9194f8d，仅修改 art/。保留14组交互Marker、metadata、局部/世界位置、朝向和全部碰撞；未改 room.gd、角色、用户、语音、后端。历史接入和 #241 证据保留在 docs/REVIEW.md、POLISH.md、REVIEW-FOLLOWUP.md；当前结果以 [质感报告](docs/BEDROOM-QUALITY.md) 为准。

入口仍是 bedroom.tscn。bedroom.gd 构建原碰撞/Marker，再加载 quality/bedroom-static.scn 视觉层：CC0沙发/椅子/书桌、Poly Haven PBR地板/墙面/亚麻、原创褶皱床品/窗帘和镜框。quality_visuals=false保留原程序视觉，供离线生成器使用。材质和光照贴图已随仓库提供，运行时不下载、生成UV2或烘焙。

## 灯光、画质与操作

```gdscript
var art=load("res://art/bedroom.tscn").instantiate()
add_child(art)
art.set_lighting_preset("night") # day / dusk / night，三份独立LightmapGI
art.set_quality_profile("medium") # high / medium / low；balanced兼容为medium
art.quality_art.mirror.set_enabled(false) # 真实镜面开关
```

F6切换时段，F7切换画质，F8开关镜面，L开关台灯并播放轻点击声；文本输入获得焦点时不拦截按键。M仍由主线语音控制使用，美术不处理它。空间/时间/天气连续变化仍暂停，本周提供三档；主线已有的时段调用无需改动。

| 档位 | 光照/后期 | 镜面 | 内部3D分辨率 |
| --- | --- | --- | --- |
| high | 三套GI、角色探针、泛光、SSAO/SSIL、柔和体积窗光、暖调色 | 512×1024、最多15Hz | 宿主原比例 |
| medium（默认） | GI/探针、泛光、SSAO、调色 | 384×768、最多10Hz | 宿主原比例 |
| low | GI/探针、简化法线细节；关闭实时主光阴影、泛光、SSAO/SSIL/体积光 | 默认关闭；F8可开启192×384/5Hz | 宿主比例×0.70，2D文字不缩放 |

SSAO/SSIL/体积光仅Forward+使用；Mobile启动默认选low。移除美术场景会恢复宿主原3D缩放比例。镜面复用同一个World3D，反射实际角色；镜面自身不进反射相机。只在正面、6m内、进入视野且窗口未最小化时更新，不是预录视频。静态PBR ReflectionProbe只捕获一次，与镜面及角色的LightmapProbe是三种不同用途。

环境声音见 [音效说明](audio/README.md)：原创CC0合成底噪，默认极轻；QA统一设 XINYU_ART_MUTE=1 并用Dummy音频驱动，不会播放TTS/录音。台灯直射和灯罩发光可关闭，不把可开关的灯罩排入静态烘焙。

## 必须保留的交互标记

每个可交互StaticBody3D下有一个`Interaction: Marker3D`，并加入`room_interactions`组；`interaction_markers[id]`可直接索引。所有坐标metadata都是相对于该Interaction标记的局部坐标；应优先读取子Marker的global_transform，不能把局部坐标当成世界坐标。

| metadata | 类型 | 含义 |
| --- | --- | --- |
| id | String | 稳定物件ID，与objects键一致，不使用浮点/本地化名称 |
| affordances | Array[String] | sit、look、pick_up等能力；不凭名称猜行为 |
| approach | NodePath | 站立接近点子节点Approach |
| approach_position | Vector3 | Approach.position，方便只读检查 |
| seat | NodePath（可坐物件才有） | 落座子节点Seat |
| seat_position | Vector3 | 坐面接触点，不是角色根节点的高度 |
| seat_yaw | float（弧度） | 相对物件的朝向，Seat的+Z指向坐下后的前方 |

```gdscript
var marker = art.interaction_markers["sofa"]
var approach = marker.get_node(marker.get_meta("approach"))
var destination = approach.global_position
var seat = marker.get_node(marker.get_meta("seat"))
var contact = seat.global_transform # +Z为面朝方向；宿主按角色髋部/身高对齐
```

沙发sit/look；椅子sit/look；床沿look/sit；书本look/pick_up；其他物件look。不包含approve、执行命令或后端权限含义。marker不代表自动执行动作，动作选择、占用和状态仍由主线决定。

## 新增家具

1. 使用body(id, position, collision_size, affordances, collision_offset)创建静态实体；几何可以用g.box/cylinder/sphere或替换为许可允许的Mesh/子场景。
2. 补足碰撞包络（桌腿、床头等）；视觉与碰撞分开，避免把精细三角网格作为动态角色碰撞。
3. 调用interaction(body, approach_local, seat_contact_local, yaw)，地面接近点留在可行走区域，不能放在家具里面或仅放在座面上。
4. 为新增的可坐点填写Seat/朝向；不要在美术脚本中导入companion/player来实现行为。
5. 运行下述verify和既有check_navigation。若引入外部素材，先把来源/作者/许可及必要署名加入[素材清单](SOURCES.md)，只接受CC0或CC BY，不使用参考背景图像素、Booth或VRChat资产。

## 碰撞和导航

9×8m房间，角色胶囊半径0.27–0.30m。沿用0.375m导航烘焙半径（留出额外余量）、0.125m栅格、0.1m高度格、1.7m人物高度和0.2m最大攀爬。家具均为静态碰撞体，地毯厚度很低。中央通路和床/沙发前的通路保留；并非要求每个家具背后的缝隙都可通行。

bake_navigation从真实静态碰撞体烘焙，针对本场景的平地契约去除高度超过0.35m的家具顶面孤岛，避免导航把床和沙发顶部当步行区域。当前43个多边形；验证脚本显式等待导航服务器同步，14个接近点全部从入口连通，水平吸附误差≤0.10m，584次0.30m胶囊沿路径碰撞检查无穿透。导航表面约高于地板0.2m为Recast栅格结果；不把这个偏移强加给物理角色根节点。若增加楼梯/二层，必须替换平地过滤规则并重新验收。

## 本地验证和重新烘焙

```text
python godot_room/art/tools/validate_quality_assets.py
godot --headless --editor --path godot_room --import
godot --headless --audio-driver Dummy --path godot_room --script res://art/tools/verify.gd
godot --headless --audio-driver Dummy --path godot_room --script res://art/tools/check_interaction_contract.gd
```

verify同时运行quality_contract：CC0原始SHA256、2K上限、全部206个烘焙绑定、5个人物区域探针、三时段切换、画质/缩放恢复、镜面世界与防递归、台灯及输入焦点保护。原导航/交互契约继续校验14个接近点及584次胶囊路径采样；冻结的交互fixture不改。

重新制作资源：开发机需Godot 4.6.3编辑器、Python/Pillow（仅材质准备和资产QA使用，产品不依赖Pillow）。prepare_bake_project.py在指定仓库外目录创建隔离工程，只映射art/，不导入角色、私人模型或后端；Windows使用目录junction，烘焙产生的art资源会写回工作区。

```text
python godot_room/art/tools/prepare_pbr.py
python godot_room/art/tools/generate_audio.py
python godot_room/art/tools/prepare_bake_project.py <仓库外烘焙目录>
godot --headless --path <烘焙目录> --max-fps 30 --script res://art/tools/generate_quality.gd
godot --editor --path <烘焙目录> --max-fps 30 -- --quality-bake
```

生成器从原碰撞场景提取/替换视觉，ArrayMesh展开UV2（约0.07m/texel），三次反弹、Medium/128 rays、非方向性光照贴图与SH探针。最终每层atlas≤2048；EXR竖向打包多层，整体图高不代表单层贴图分辨率。**重新生成静态场景后必须重烘焙全部三套**，不可只替换scene保留旧的节点绑定。不要在运行中的产品里启用烘焙插件。

capture_quality_before.gd保护已有基线不覆盖；after工具生成真实Godot截图。基线来自未改视觉的9194f8d；对比同机位1280×720、FOV50、2×MSAA、medium。截图设 XINYU_ART_MUTE=1，限制30fps并自动退出。性能工具单独限制60fps，--output必须是绝对路径，示例及结果见质感报告；不再运行旧的无限帧benchmark工具。

## 与主线集成

objects、region、interaction_markers和灯光setter仍按原接口提供。美术不拥有玩家/角色时钟、行为、语音、LLM或网络，也不新增交互Marker。镜面相机只服务镜面视口，主相机仍属于主线。quality层不创建或更改角色；千驮谷筱只由离线截图/测量脚本实例化。现有安装的可选Room组件不会因本分支改动自动升级，作者验收后需按主线发布流程构建新组件。

[当前质感与性能报告](docs/BEDROOM-QUALITY.md) · [素材与许可](SOURCES.md) · [历史初次接入](docs/REVIEW.md) · [历史#241](docs/REVIEW-FOLLOWUP.md)
