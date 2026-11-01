# 温馨卧室美术模块

基于Godot 4.6.3 / godot-vrm 2.1.0的独立房间美术。当前已普通merge最新spike90fbedc（作者自主行为第二期），保留全部作者改动。入口是[bedroom.tscn](bedroom.tscn)，由[bedroom.gd](bedroom.gd)构建圆角木家具、布艺、植物、窗景和照明；几何缓存/共享材质见[geometry.gd](geometry.gd)。不创建角色、相机、网络或行为计时器，不调用后端。

仅修改art/以及room.gd的11行最小加载接线。用户限定目录优先于根AGENTS状态文件要求，本任务进度、验证与交接记录在此目录，不修改根feature/progress/handoff。角色/行为代码继续由主线负责。

## 场景与灯光接口

```gdscript
var art = load("res://art/bedroom.tscn").instantiate()
art.lighting_preset = "night" # 也可在添加后调用setter
add_child(art)
art.set_lighting_preset("day") # day / dusk / night；未知值返回false且不改变状态
art.set_quality_profile("low") # balanced / low；low关闭主光实时阴影
```

三套环境/主光/补光/灯具/窗景一起切换。夜间是默认，暖色台灯、床头灯和落地灯；窗面使用不含HDR高亮的原创天空着色器，不再靠高能量窗面照亮人物。主光采用柔化的方向阴影，另一方向的补光保持角色正面可读。只一个光源投影，点光不投影，不启用SSAO/SDFGI/体积雾；没有动态灯光循环。

low只管理本模块主光阴影，不改变共享Viewport或全局项目设置。集显可用启动参数`--rendering-method mobile`；窗口分辨率/MSAA由宿主决定，低开销验收使用960×540/MSAA关闭。默认独显验收1280×720/2×MSAA/Forward+。没有自动更改显卡、驱动或系统电源设置。

可整体替换bedroom.tscn，也可在构建函数中替换单件家具。当前为确定性程序几何，场景树在_ready生成；编辑器静态场景文件只含根节点，细节不是手工可拖动的已打包子场景。若后续转成美术DCC/手工子场景，保留下面的接口即可。

## 与旧入口的兼容

- `region: NavigationRegion3D`为本模块的可行走区域。
- `objects: Dictionary<String, StaticBody3D>`保留原`sofa / chair / desk / shelf / book / window`ID，供当前player/companion/bridge读取；这些节点仍有affordances metadata。位置与原型主要家具一致，新增bed、bedside、plant、rug、floor_lamp等。
- room.gd在_ready优先加载此场景，采用region/objects，再调用原样移出的spawn_actors；旧方块房间作为无美术场景时的回退。释放未使用的旧region，避免孤立RID。
- **没有改变现有角色的坐姿算法。** 主线目前仍按旧body.position处理入座；新增Marker接口供主线下一步接入。坐姿截图只在离线美术验收中按Seat标记对齐公开模型，不代表已经修改了主线的自动入座算法。

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

沙发sit/look；椅子sit/look；书本look/pick_up；其他物件look。不包含approve、执行命令或后端权限含义。marker不代表自动执行动作，动作选择、占用和状态仍由主线决定。

## 新增家具

1. 使用body(id, position, collision_size, affordances, collision_offset)创建静态实体；几何可以用g.box/cylinder/sphere或替换为许可允许的Mesh/子场景。
2. 补足碰撞包络（桌腿、床头等）；视觉与碰撞分开，避免把精细三角网格作为动态角色碰撞。
3. 调用interaction(body, approach_local, seat_contact_local, yaw)，地面接近点留在可行走区域，不能放在家具里面或仅放在座面上。
4. 为新增的可坐点填写Seat/朝向；不要在美术脚本中导入companion/player来实现行为。
5. 运行下述verify和既有check_navigation。若引入外部素材，先把来源/作者/许可及必要署名加入[素材清单](SOURCES.md)，只接受CC0或CC BY，不使用参考背景图像素、Booth或VRChat资产。

## 碰撞和导航

9×8m房间，角色胶囊半径0.27–0.30m。沿用0.375m导航烘焙半径（留出额外余量）、0.125m栅格、0.1m高度格、1.7m人物高度和0.2m最大攀爬。家具均为静态碰撞体，地毯厚度很低。中央通路和床/沙发前的通路保留；并非要求每个家具背后的缝隙都可通行。

bake_navigation从真实静态碰撞体烘焙，针对本场景的平地契约去除高度超过0.35m的家具顶面孤岛，避免导航把床和沙发顶部当步行区域。当前43个多边形；验证脚本显式等待导航服务器同步，14个接近点全部从入口连通，水平吸附误差≤0.10m，584次0.30m胶囊沿路径碰撞检查无穿透。导航表面约高于地板0.2m为Recast栅格结果；不把这个偏移强加给物理角色根节点。若增加楼梯/二层，必须替换平地过滤规则并重新验收。

## 本地验收

以下只运行公开Shino、几何/导航/动画；不启动bridge、不读取Key、不连接后端。Godot可执行文件放仓库外，不提交下载包或导出包。

```text
godot --headless --editor --path godot_room --import
godot --headless --path godot_room --script res://art/tools/verify.gd
godot --headless --path godot_room --script res://check_navigation.gd
godot --path godot_room --position -16000,-16000 --script res://art/tools/capture.gd
godot --path godot_room --disable-vsync --script res://art/tools/benchmark.gd -- balanced dgpu
```

capture写8张实际引擎截图到art/docs，包含三套灯光同机位、多个室内角度、千驮谷筱坐姿和真实烘焙网格；不录视频/声音。坐姿演示沿用上游的Quaternius坐姿动画，只在验收脚本中按Seat点校准髋部。

[截图与同机位对照](docs/REVIEW.md)、[性能与体积](docs/PERFORMANCE.md)、[素材来源与许可](SOURCES.md)。预算：新房间不含任何贴图，所有新美术源文件/截图远低于30MB；原Shino嵌入贴图最大2048×2048，不新增/修改模型。

## 当前交接

任务A独立PR239已完成10/10 CI，本分支没有混入该PR的修改。本任务保持Draft、base为codex/godot-room-spike，由qinglinMa验收合并。未修改companion/player/bridge/locomotion、后端、根状态文件或私人配置。验证细节和限制见docs；Godot-vrm已知的导入字典键诊断属于上游spike，未借美术任务修改插件。

## 9368749之后的美术打磨

[最新同机位对照、地板诊断、交互契约和性能报告](docs/POLISH.md)。上面的REVIEW/PERFORMANCE保留为首次接入记录。polish只改art/，没有room.gd接线或Marker调整。新增植物和小物是家具表面的非交互装饰，不增加地面碰撞。新截图/诊断脚本默认30fps，不覆盖before证据。tools/fixtures/interaction-contract.json为冻结原契约，verify不会自动更新；以后主线批准变更时应审核旧值/新值再显式更新。
