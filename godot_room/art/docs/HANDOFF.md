# 本模块交接与验证

2026-11-01，分支friend/godot-room-art。初始e4526ba，已普通merge作者最新spike90fbedc，不重写作者行为提交。PR目标codex/godot-room-spike，保持Draft、作者合并。

## 改动边界

相对当前base仅art/新增场景、原创CC0几何/着色器、Marker/导航/灯光接口、离线验收脚本、8张实际PNG与文档；room.gd仅11行加载接线（包含原角色创建块提为spawn_actors）。companion/player/bridge/locomotion、后端、插件、模型、原动画、根状态文件零差异。用户限定目录优先于根AGENTS状态文件要求，交接放这里。导入工具造成的4个既有.import换行变化已还原，不提交这些噪声。

## Verification Evidence

- 同步90fbedc后完整scripts/test-local.ps1：1111Python通过/3跳过、86Node、202Python/271JS语法、secrets925及本机映射通过。公开JSON、必需py_compile、首次打包check_first_run_package和diff检查通过。较早e4526ba的1108Python不是最终证据，最终以1111项为准。
- Godot4.6.3 actual：art/tools/verify.gd通过，43个烘焙多边形，14个Marker从入口连通，584个0.30m胶囊路径采样无碰撞；非法灯光/画质值不改状态。verify显式同步导航服务器，不在网格尚未生效时假报不可达。
- 作者最新check_shared_goals.gd通过：相邻沙发、占用拒绝、用户打断、本地utility不抢运行中目标；check_navigation通过：位移3.389m后Sitting_Idle，起身Idle；check_player通过：弹簧臂靠墙缩短、跳跃顶点约0.909m并回第一人称。所有验收子进程清空TAFFY_API_TOKEN或不创建bridge，不调用LLM/后端。
- 实际截图8张，三预设固定#238机位、多个角度/站立/坐姿、真实NavigationMesh。PNG摘要见REVIEW。只用公开CC0 Shino；原嵌入贴图最大2K，无模型改动。坐姿镜头按Seat点校准原动画的髋部，不冒充已改主线入座算法。
- 三档性能真实RTX5060/Radeon610M，12秒采样，CPU测Godot实际子进程、GPU为引擎viewport GPU毫秒。短测波动与采样范围详见PERFORMANCE，不把console启动器0% CPU当实际CPU，不保证所有机器60fps。
- 新美术/截图约4MB，新增运行贴图0张；原始采样JSON、下载包、引擎、日志留仓库外，不提交导出包/录像/Key/私人配置。

## 已知限制与下一步

程序几何在_ready生成，编辑器tscn根场景没有预打包可拖动的家具子节点。仅平地导航，新增台阶/二层需改顶面过滤。主线接入Seat/Approach Marker后还应按身高校准坐姿、起身与占用点；当前截图不等于新版自动入座的完整视觉验收。性能仅离线单角色、未包含Electron/双角色/自主行为/后端长测。godot-vrm既有already_processed导入字典键诊断未修改插件。作者在自己的主线验收美术、三套灯光、Marker接入和实际行走后决定合并，本任务不合并。

最新提交CI在Draft PR Checks/说明，保持以最新head为准；所有进程和录制均应在交付前结束，本任务无录像。

## 后续polish任务（2026-11-01）

当前分支friend/godot-room-art-polish，从9368749新建，仅art/。原始Marker已冻结，三预设前后与小物图已保存。地板已证实为冷补光宽高光问题，不改光源/主线行为。43导航多边形、14交互点、584采样仍通过。详见[POLISH](POLISH.md)。用户反馈不限帧测试卡顿，已停止该方式，后续图形检查默认30fps，不再重复不限帧跑分。完整test-local已通过（1111 Python/3跳过、86 Node、202 Python/271 JS语法），公开JSON/py_compile通过；最终verify及主线导航/共享目标回归通过。PR和CI收尾中，最新CI见Draft PR Checks；禁止自行合并。
