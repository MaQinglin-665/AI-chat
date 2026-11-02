# 同室行动第二阶段 · Windows 实测

Godot 4.6.3、千驮谷筱和真实 DeepSeek。一次连续 305 秒的验收，只驱动用户的移动、坐起、视角和两条聊天输入。角色由真实意图接口和本地行为驱动。用户在 0:30–1:45 保持原地静止。录像位于本机忽略目录 `tmp_ui_smoke/godot-room-phase2-deepseek-30fps.mp4`，八张画面取自编码后的录像，见 [关键帧](docs/phase2/)。

## 决策和回执

房间意图显式选择一个身体动作（可以 idle），可附一句话和后续有序步骤。简短决策依据只用于诊断。每步开始和结束都有回执；失败和打断会清空余下步骤。Godot 在本地维护精力、无聊、好奇、亲近和独处需求，将近期活动、当前目标、上次移动时间及回执送入下一次决策。会话内传输变化字段；后端重建受限的模型上下文。用户发话先本地点头和注视，再等待意图。房间聊天读取同一目标和位置；普通桌宠请求走原有路径。小动作有随机冷却，只在没有目标时启动。靠近和离开事件要求用户自身移动跨过距离阈值，避免角色自己走动触发重复决策。

## 最终一轮数据

自主决定 9 次。首动作分类为 移动 6、坐 0、起身 2、看 1、待机 0、手势 0。另有 9 次同时说话。严格按首动作，移动占 6/9（67%）；包含后续移动步骤的决定为 8/9。两条用户指令与本地小动作均排除在这个分母之外。

自主目标的步骤终态回执（含失败）为 approach_user 4、go_to 6、sit_on 4、look_at 4、stand_up 2、gesture 4、idle 6。

- user 的多步目标共 2 个，completed 2（ok）。
- autonomous 的多步目标共 9 个，completed 8（ok），failed 1（unreachable）。

成功意图往返 P50 **2.18 秒**，P90 **3.11 秒**。上游首次内容中位数 1.75 秒，收完整个模型结果中位数 2.11 秒。流式接收后仍等完整 JSON 通过校验才执行。普通聊天另经现有聊天链路，回复分别用时 6.13, 5.47 秒。即时点头不计入模型延迟。

接口调用 room/intent:200 × 11、chat:200 × 2。本次账单用量 prompt_cache_hit_tokens 2560、prompt_cache_miss_tokens 4778、completion_tokens 768、total_tokens 8106。按本轮频率线性外推，约 153 次请求/小时，约 US$0.0140/小时（按输入缓存命中、未命中和输出每百万 token 分别 0.003、0.15 和 0.60 美元估算；按两倍单价则为 US$0.0280）。不同事件密度、聊天长度与价格会改变费用。[DeepSeek 官方计价](https://api-docs.deepseek.com/quick_start/pricing/)

## 验收时间线

时间以附近的五秒采样点标注。需求列依次是无聊、好奇、亲近，取值范围 0–1。

| 时间 | 发起方 | 实际计划 | 需求 | 终态及原因 | 行为依据与观察 |
|---|---|---|---|---| --- |
| 0:00 | autonomous | approach_user → go_to(sofa) → sit_on(sofa) → look_at(user) | 0.47 / 0.69 / 0.36 | completed ok | 用户进门，靠近迎接，再去沙发邀请同坐。 |
| 0:45 | autonomous | stand_up → go_to(user) → gesture → idle | 0.36 / 0.33 / 0.44 | completed ok | 用户仍站在原处，结束坐姿，靠近挥手。 |
| 1:15 | autonomous | go_to(sofa) → sit_on(sofa) → look_at(user) → idle | 0.29 / 0.26 / 0.51 | completed ok | 用户在附近，选择回到沙发坐着陪伴；与首次活动相似。 |
| 1:45 | user | stand_up → go_to(window) → look_at(window) → idle | 0.32 / 0.21 / 0.56 | completed ok | 用户要求看外面，起身走到窗边、望向窗外并停留。 |
| 2:15 | autonomous | go_to(user) → gesture → idle | 0.23 / 0.18 / 0.63 | completed ok | 亲近需求上升，从窗边回来向用户挥手。 |
| 2:25 | autonomous | approach_user → gesture → idle | 0.11 / 0.13 / 0.91 | failed unreachable | 用户坐下，尝试直接接近用户的位置，导航未抵达。 |
| 2:30 | autonomous | go_to(sofa) → sit_on(sofa) → look_at(user) → idle | 0.12 / 0.13 / 0.92 | completed ok | 上一步不可达，改走沙发前导航点，坐到旁边。 |
| 2:50 | user | go_to(user) → sit_on(sofa) → look_at(user) | 0.19 / 0.12 / 0.81 | completed ok | 用户要求同坐；当时已经相邻，确认位置、坐姿并面向用户。 |
| 3:10 | autonomous | look_at(user) → gesture → idle | 0.27 / 0.12 / 0.66 | completed ok | 保持坐姿，注视用户并点头。 |
| 4:00 | autonomous | approach_user → gesture → go_to(sofa) → sit_on(sofa) | 0.63 / 0.22 / 0.67 | completed ok | 用户起身，无聊和亲近需求均偏高；先靠近再回沙发，来回动机较弱。 |
| 4:10 | autonomous | stand_up → approach_user → idle | 0.11 / 0.09 / 0.69 | completed ok | 用户走远，亲近需求仍高，起身去找用户。 |
| 4:15 | utility | approach_user | 0.04 / 0.06 / 0.70 | completed ok | 本地亲近行为触发，已接近舒适距离，实际位移有限。 |
| 4:45 | utility | approach_user | 0.16 / 0.10 / 0.76 | completed ok | 冷却后再次触发亲近行为，实际位移有限。 |

## 验证与局限

- 两条聊天指令均有非空回复。窗边指令在角色行走时获得聊天回复，角色随后抵达并看向窗户。相邻座位指令返回聊天回复时，坐姿目标已完成。相邻座位用独立的落点和 Godot 物理场景测试核对。
- 录像为 960 × 540、30 fps、9,150 帧，完整解码通过。采集时有两个采样点沿用最近画面。站立自由时段确实出现自主起身；离开时她也选择跟过去。录像里每次自主决定仍都附了一句话。移动达标，但尚不能证明长期使用时会自然保持安静或活动足够多样。
- 修复过程中遇到过上游请求失败、模型输出简写与导航到沙发中心不可达。最终一轮全部 HTTP 请求成功，直接靠近已经坐着的用户仍有一次不可达，下一次决定读取失败回执后改为前往沙发并入座。两次本地接近用户是在舒适距离边缘，不能算作两次有效长距离移动。
- 房间聊天得到当前目标和步骤，并非口头描述的每一帧都准确：第二次气泡仍叙述“从窗边”过来，角色实际已提前入座。普通聊天文字慢于意图响应。Godot 退出时还有 ObjectDB 清理警告，单次录制无法判定长期内存趋势。
- 回归覆盖实验接口的启用条件、模型动作校验、增量状态、普通聊天隔离、共享目标、座位占用、相邻坐垫、用户打断及本地行为不能抢占目标。重放用户场景可用 `python godot_room/tools/run_room.py <Godot可执行文件> --phase2-tour`，在独立目录生成采样帧；决策取决于当时的真实模型返回。

完整本地检查通过：Python 1,111 项通过、3 项跳过；86 组 Node 测试、语法和秘密扫描通过。另行运行 Godot 无窗口共享目标测试并通过。
