# 2.5D 手绘背景（painted）

依赖 PR #220 的 handpainted 前置实现；两者是不同预设。默认仍为 room。
仅完整陪伴窗口的 VRM 启用 painted；透明桌宠、Live2D、none 和两个 3D 房间保留原行为。

## 本地配置与素材

在自己维护的 avatar 配置中设置（本任务不修改用户配置）：

```json
{
  "avatar": {
    "kind": "vrm",
    "path": "D:/MyAvatars/avatar.vrm",
    "scene": "painted",
    "backdrop": "D:/MyBackdrops/bedroom",
    "allowed_directories": ["D:/MyAvatars", "D:/MyBackdrops/bedroom"],
    "reflection": true,
    "backdrop_grid": false
  }
}
```

目录内只读取 night.png、dusk.png、day.png。模型路径和背景路径共用显式允许目录列表；
仓库 models_local 默认允许。拒绝目录越界、`..`、符号链接及 junction/reparse point。
API 只有三个固定图片端点，经过现有来源与 token 检查；不接受请求指定文件路径，也不向客户端暴露磁盘路径。
PNG 限制 64 MiB / 64M 像素。配置不合法不会读取其他目录。
缺图按请求时段优先、再 night/dusk/day 查找；灯光跟随实际返回图的时段。
全缺、请求失败或解码失败时用仓库的纯色占位 PNG。无 backdrop 配置同样使用占位图。

房间图片和 VRM 均由用户提供，未纳入仓库、源码包或 PR；没有推断 AI 图片的使用许可。
更换高清图片保持文件名和构图即可，重新进入场景后读取新文件；相机与锚点使用比例坐标，不依赖旧分辨率。
如果更换构图，须重新校准，不承诺自动估计透视。

## 透视与构图

参数集中于 web/avatar/vrmPainted.js 的 CALIBRATION，按三个时段分别保存。
当前共同参数：42° 垂直视场角、相机离地 1.92m、水平距离 4.6m、下俯 12°、方位 −40.5°；
人物脚下位于原图 (0.56, 0.86)。角色保留原模型米制尺寸，没有为了构图缩放骨骼。
以沙发坐垫约 0.45m 为比例参照；图片不包含真实相机标定数据，属于人工/地板线辅助的近似匹配。
长地板缝拟合的消失点约为原图 (−0.080, 0.339)，生成图的各条缝并非严格共点，不能声称逐像素重合。
调试网格每格 1m，供检查消失方向和地面接触；不表示每一条木板缝的实际间距都是 1m。

背景使用 cover：只等比放大和裁切，裁切围绕脚下锚点，三维相机使用完全相同的投影裁切。
全身在 1920×1080、1280×800、480×800 下保留；极端横向长条窗口不在本轮验收范围。
专用相机独立于 vrmRenderer 的原有相机对象，不改跟随与活动机位算法。

## 灯光、过渡与倒影

- 夜晚：右侧暖橙主光、左窗冷蓝轮廓光、紫色环境光。
- 黄昏：左窗暖橙主光、橙粉环境光。
- 白天：左窗暖白主光、偏暖环境光。

复用 stageThemeController 的 stageScene（包括手动选择），morning 映射 day；
控制器未提供时段时的备用边界位于 TIMING，黄昏 17:00–20:00，与现有控制器一致。
背景和灯光使用同一 2600ms smoothstep 进度。加载完成后才开始过渡，快速切换只保留最新目标，
待当前淡入完成再加载，最多两张解码背景图；不预加载三张大图。
缺图落到另一时段时，灯光跟随返回图，而非继续使用请求时段的灯光。

接触阴影由脚底两块较浓的柔和阴影及主光反方向的柔和椭圆组成，不是实时全身投影。
倒影通过镜像人物重新渲染到半分辨率、宽最多 960px 的离屏缓冲，九点采样轻微模糊，
越远离脚下越淡；没有模糊背景。关闭倒影立即释放缓冲，不再执行第二遍人物渲染。
控制中心“模型 / 语音”的当前角色信息区可关闭倒影、打开网格；偏好保存在当前浏览器配置中，
初始值来自 avatar.reflection / avatar.backdrop_grid，不写回私人配置文件。

### #221 人物融入修订

保留已验收的透视、比例和裁切。LIGHTS、LOOKS、SURFACE 集中保存全部新增调节参数。
灯位按专用相机坐标复核：黄昏窗光来自画面左后，柔影向右前延伸；夜晚主光来自画面右侧，
左后有冷蓝月光；白天左窗光较柔和。屏幕轮廓补光辅助 MToon 的光照，而非假称真实全局光照。

| 参数 | 夜晚 | 黄昏 | 白天 |
| --- | --- | --- | --- |
| 接触阴影强度 | 0.56 | 0.72 | 0.66 |
| 延伸柔影长度（米） | 1.35 | 2.50 | 1.60 |
| 倒影不透明度（淡出前） | 0.20 | 0.24 | 0.19 |
| 人物饱和度 | 0.90 | 0.92 | 0.94 |
| 人物线性曝光倍率 | 0.88 | 0.66 | 1.00 |

双脚接触层与延伸柔影分开，脚下较浓、向外连续衰减。倒影九点采样、向下线性渐淡，
按地板色调轻度染色。色彩参考来自背景原图归一化区域 x=0.46–0.66、y=0.76–0.92 的均值：
夜晚 RGB(132,68,65)，黄昏(230,121,56)，白天(238,184,130)。这些常量只作本组图片的调色依据，
更换构图后需要复核，不会自动扫描其他私人图片。

人物单独渲染到带 MSAA 的离屏缓冲，再做 0.75 CSS 像素柔化、低强度 4px 光晕及分时段调色。
透明边缘先按 alpha 还原颜色再合成，避免黑边；鞋底附近收掉轮廓光和光晕，以保留落地感。
背景不经过这套柔化/调色。灯光、调色、阴影和倒影仍共用 2600ms 过渡进度。
新增人物缓冲按实际绘制尺寸分配，切场景时释放；关闭倒影只释放倒影缓冲，人物柔化继续保留。
渲染器会在每一遍渲染后恢复人物可见性、镜像变换、目标缓冲和清屏状态，包括异常路径。
相较旧版多一个人物合成缓冲，增加显存占用；没有据此宣称所有显卡都零性能影响。

本轮只修改 vrmPainted.js、vrmRenderer.js 的绘制接点、test_avatar_painted.js、本说明和三个状态文件。
本地对比采用同模型、同尺寸、相同冻结姿势，修改前后各三张全图，另有每时段脚部和身体边缘的三倍局部图。
私有证据位于 tmp_ui_smoke/painted-polish；不上传到 PR。

无 3D 家具及行走路径。沿用基础呼吸、眨眼、小动作，并叠加原地看窗、伸展与轻微姿势变化；
输入/说话时退出这些背景专用小动作。空 activityPoints 会被调度器识别为静止场景。

## 合并接点与验证

共用文件的接点：

- avatar_assets.py / app_get_routes.py：painted 枚举、两个开关、三个鉴权后固定图片路由。
- vrmRenderer.js：独立 painted 实例/相机、帧更新、倒影调用和释放；原机位跟随逻辑不改。
- avatarRuntime.js / index.html：两个设置控件及监听器清理、模块加载。
- vrmWorld.js：显式空活动点的静止返回。
- stage.css：painted 隐藏旧舞台图，窄窗口不降低整个背景画布透明度。

自动化：tests/test_avatar_painted.js 验证 cover、锚点投影、全身边界、时段和灯光、
快速切换两图上限、失败回退、销毁后异步结果和十次释放；同时运行后端路径安全用例。
tests/test_avatar_backdrops.py 验证目录/链接边界、缺图回退、PNG 内容和固定路由的鉴权位置。
两个旧外部执行测试夹具改用临时 protected-project，允许所有测试文件留在工作区内；产品安全规则不变。

本地最终门禁、截图/录像和内存结果记录于 progress.md。所有私有证据在忽略目录 tmp_ui_smoke/painted，
不在公开文档嵌入模型截图。未进行真实语音服务、长时间运行或真实 VRM1 外观验收。

本任务相对 b22d4ef 的完整文件清单：

| 文件 | 改动 |
| --- | --- |
| avatar_backdrops.py；avatar_assets.py；app_get_routes.py | 本地图片安全读取、场景描述与固定路由 |
| web/avatar/vrmPainted.js；web/assets/painted-placeholder.png | 新场景及原创纯色测试占位图 |
| web/avatar/vrmRenderer.js；web/avatar/vrmWorld.js | 独立相机/渲染接点与空活动点处理 |
| web/avatar/avatarRuntime.js；web/index.html；web/stage.css | 设置控件、模块注册与背景样式 |
| tests/test_avatar_painted.js；tests/test_avatar_backdrops.py；tests/test_avatar_assets.py | 新场景、路径与枚举回归 |
| tests/test_external_agent.py；tests/test_external_agent_routes.py | 仅临时测试夹具隔离，未改外部执行产品代码 |
| scripts/run_node_tests.js；scripts/check_first_run_package.ps1 | 门禁注册、占位图打包完整性 |
| docs/avatar-room-painted.md；feature_list.json；progress.md；session-handoff.md | 使用说明、状态与验证证据 |
