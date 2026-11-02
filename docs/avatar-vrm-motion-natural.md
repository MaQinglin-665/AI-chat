# VRM 动作自然化第一期

不改变 Live2D、brain 决策/回执或镜头算法。说话嘴型继续使用原始音频 level；身体使用独立的 200ms attack / 600ms release 包络（含 180ms 音节间保持）。有带时间的标点边界时每句随机轻点头 1–2 次；只有整段文本时保守地按整段限额，不假装知道每句的播放时间。

## 混合与活动

`vrmMotionNatural.js` 保存包络和独立种子的呼吸、重心、头眼微动参数。`vrmAnimationClips.js` 保存片段池、350ms crossfade、15–45s 换段和本地资源限制。Mixer 先输出作者的骨骼姿势，再加一次说话/手势差值和降权的待机层，最后做已有的脚底/座椅接触求解；不混合嘴型、根位移、表情轨道。

- 走路两个变体，单周期对应角色腿长缩放后的 0.58m 步幅；沿用距离驱动脚底锚点与减速，起步先转到路径方向。
- 坐下/起身为单次片段，匹配已有 700ms 座椅过渡；坐姿两段循环。所有片段交接 350ms 淡入淡出。
- 书架活动有三个可选片段；窗边、伸懒腰、打哈欠、哼歌没有本期合适的完整表演，使用两个轻待机片段并保留目标注视。不再使用扶头、双臂伸直、趴桌的静态手臂姿势。
- 片段播放和 crossfade 计为活动，继续使用原来的 60fps 通道；无可用片段时仍保留程序待机和原有空闲帧率策略。
- 手势被替换或中断时，用 350ms 淡出残余角度；执行器的取消/完成回执不等待这个视觉收尾。
- 循环尾部 150ms 用最短弧四元数插值对齐起点；不把任意长录制当成已清理的专业循环。

## 本地动作 / 自录接入

将已授权、已裁剪的文件放到仓库的 **`models_local/motions/`**（被忽略）。命名为 `活动__片段名.扩展名`，例如 `idle__my_idle.vrma`、`walk__my_walk.fbx`、`books__look.gltf`。

活动名：`idle`、`walk`、`sit`、`enter`、`exit`、`window`、`books`、`rest`、`desk`、`stretch`、`yawn`、`hum`。实际沙发选 `rest`，书桌选 `desk`。扩展名为小写 `.vrma`、`.fbx`、`.glb`、`.gltf`；片段名只用 ASCII 字母、数字、下划线、短横线。重载角色后识别；同活动本地片段优先，缺失/解析失败退回内置。

FBX/glTF 支持 Mixamo 和 Quaternius 的标准骨骼名与参考姿势；VRMA 使用 three-vrm-animation。非标准命名、任意 A-pose、无 hips、外部贴图/二进制引用均不保证兼容。glTF 必须内嵌资源；加载器禁止网络依赖。每文件上限 32MiB，目录最多 64 个文件，拒绝链接、路径穿越。只读取，不修改本地源文件。

长录制请先在 DCC 中：选取 2–8s 中性循环 → 校准 T-pose/比例 → 去根平移 → 清理孤立抖点 → 固定支撑脚并做 IK → 首尾姿势/速度对齐 → 导出内嵌骨骼动画。运行时会把循环限制为前 8s 并对齐尾部，但这只是兜底，不能自动识别最佳片段或修好全部抖动。`enter`/`exit` 为短单次动作，应事先裁到完整起止姿态。

## 来源、许可与分发边界（2026-10-28 核实）

内置仅使用 [Quaternius 官方 Universal Animation Library](https://quaternius.com/packs/universalanimationlibrary.html) 的 [itch 免费 Standard 包](https://quaternius.itch.io/universal-animation-library)，CC0 1.0。非 Pro/Source 付费包。原作者 Quaternius；官方页面列出的动画协作者 Gonzalo Furnier。无强制署名要求，仍保留以上署名及包内 License.txt（仅规范行尾空白）。下表每段均来自上述 Standard `Unreal-Godot/UAL1_Standard.glb`，同一 [CC0 许可](https://creativecommons.org/publicdomain/zero/1.0/)。

| 片段（每段均 CC0，Quaternius / Gonzalo Furnier） | 用途 |
| --- | --- |
| Idle_Loop | 基础待机、缺失降级 |
| Idle_Talking_Loop | 待机变化、轻交流动作 |
| Walk_Loop | 走路 |
| Walk_Formal_Loop | 走路变化 |
| Sitting_Enter | 坐下 |
| Sitting_Exit | 起身 |
| Sitting_Idle_Loop | 坐姿待机 |
| Sitting_Talking_Loop | 坐姿变化 |
| Interact | 书架轻互动 |

提取脚本 `scripts/extract_vrm_builtin_motion.py` 仅保留骨架和上述动画，不保留人物网格、skin、材质、贴图。源文件 SHA-256 在输出 glTF 的 extras 中。运行时只使用骨骼旋转，足部与根位置由房间约束负责。

- [CMU Graphics Lab](https://mocap.cs.cmu.edu/)：本期未下载、未接入、未提交，仅列候选，待用户决定。
- [万代南梦宫 Motiondataset 官方仓库](https://github.com/BandaiNamcoResearchInc/Bandai-Namco-Research-Motiondataset)：只支持用户自行准备的本地动作，未分发。**Dataset 1 为 CC BY-NC 4.0；Dataset 2 为 CC BY-NC-ND 4.0，不能把两者都视作可改编的 BY-NC。** 不把自动裁剪当作绕过 NC/ND 的授权；需自行核实所选具体文件。
- [Mixamo 官方 FAQ](https://helpx.adobe.com/creative-cloud/faq/mixamo-faq.html)：本地可选，未捆绑动画源文件，不把用于成品的许可解释为动画素材库再分发许可。
- [VRM 官方 VRMA 文档](https://vrm.dev/vrma/) 说明格式，不等于素材授权。[VRoid 官方七件套条款](https://booth.pm/ja/items/5512385) 限制以可提取/再利用动画的形式再分发，因此本项目只支持本地读取，不捆绑七件套。其商业使用署名为 `Character animation credits to pixiv Inc.'s VRoid Project`；用户仍需核对下载时条款。
- 新增解析库 `@pixiv/three-vrm-animation` 3.4.4 为 MIT；three.js FBXLoader 与已有 three.js 0.180.0 同为 MIT，许可保存在 vendor/vrm。重定向参考 [three-vrm 官方 Mixamo 示例](https://github.com/pixiv/three-vrm/blob/dev/packages/three-vrm/examples/humanoidAnimation/loadMixamoAnimation.js)（MIT）。

## CMU 候选（仅索引筛选，未看片段或承诺质量）

依据 [CMU 官方动作目录](https://mocap.cs.cmu.edu/search.php)，以下工作量是单个片段首次人工清理的估计，包含重定向、选段、首尾、去抖及脚底检查，不是已经完成的测量：

| 候选 | 目标 | 预计清理工作 |
| --- | --- | --- |
| 77_02 standing | 站立小动作 | 1–2 小时，找自然重心段、去脚滑 |
| 77_01 / 77_04 looking around | 环视/看东西 | 每段 1–3 小时，限制头部扭转、固定脚 |
| 42_01 stretch | 伸懒腰 | 2–4 小时，从整套伸展拆出短段、避开大幅腿动作 |
| 14_24 / 14_25 / 14_26 direct traffic, wave, point | 挥手 | 每段 2–4 小时，只取挥手部分，降幅、补中性起止 |
| 13_05 seated fidget | 坐姿小动作 | 2–4 小时，移除扶下巴长定格、适配沙发高度 |
| 86_09 walking/sitting/looking/standing | 连贯看向目标/起身 | 3–6 小时，长串动作切段、足部及座椅约束工作最多 |

本期不需要采用 CMU 才能运行，用户选定候选后再评估完整来源条款及视频、实际裁剪点。

## 验证

`node tests/test_vrm_motion_natural.js` 检查 4Hz 嘴型与头 pitch 解耦、release、句子限额及嘴型不变；`node tests/test_vrm_animation_clips.js` 使用真实 Three AnimationMixer 验证交叉淡化、模式转换、资源释放、片段缺失、每 10s 内的变化；`python -m pytest -q tests/test_avatar_motions.py` 验证本地目录边界。完整门禁使用 D 盘 TEMP/TMP。私人 VRM 的录像只保存在被忽略的 `tmp_ui_smoke/motion`，不上传到 PR。

2026-10-28：完整 `scripts/test-local.ps1` 通过，1109 Python passed / 3 skipped、85 个 Node 套件，语法、secrets、mapping 检查通过；`scripts/check_first_run_package.ps1` 通过并校验新增动画/解析代码/许可均入包。新增真实 glTF→重定向→Mixer 的九种活动各 60s 加速测试，每个 10s 窗口均有骨骼变化。真实 Standard FBX 在本地解析得到 43 段。Mixamo 实际文件、任意 VRM1/非标准骨架未做视觉保证。

两段约五分钟的对比均为同一个本地 VRM 的浏览器受控回放，基线 42ae9ea 与新实现使用同样四句本地 SAPI 合成音频和时间表；不是实际 LLM 会话或 Electron 全链路验收。没有改镜头；现有近景会裁掉站立人物的小腿，书架/沙发机位仍是原逻辑，取景需在单独镜头任务继续处理。

性能沿用 #231 的采样方法：1280×850、实际约 60fps，Chrome 进程 CPU 时间差 / 11s（单核满载为 100%），按这些 PID 汇总 Windows GPU 3D 引擎计数器，10 次、每次 1s；无录像、编码器或测试并行。Ryzen 9 8940HX / RTX 5060 Laptop，测试机器也有集成显卡，计数器为进程各 3D 引擎合计。

| 场景 | CPU 前→后（单核 %） | GPU 3D 前→后（%） | 实测 fps 前→后 |
| --- | --- | --- | --- |
| 站立，强制相同 60fps | 56.12 → 54.18 | 2.248 → 2.226 | 59.91 → 60.01 |
| 走路，包含转向与到达 | 56.61 → 57.34 | 1.981 → 1.934 | 60.03 → 60.07 |

短采样窗未见明显回退，不能据此声称节能。上述比较固定帧率；实际空闲时因持续播放内置片段，新实现会按要求保持 60fps，不能拿此表推断相对旧 25fps 空闲的耗电不变。
