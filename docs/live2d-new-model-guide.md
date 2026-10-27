# 接入一个新 Live2D 模型

适用于当前统一 `avatarRuntime`。所有新 Live2D 仍由原 Pixi ticker/pre-Core 更新，不建立额外角色入口；模型区别写进映射，执行器只使用意图和[统一动作词表](live2d-action-vocabulary.md)。本指南依赖 #228/#229，按顺序合并。

## 1. 先确认素材权利

记录模型名称、作者、原始下载页、许可原文和取得日期。使用 CC0、按要求署名的 CC BY，或自己明确有权使用的素材；确认使用、修改、演示录像、比赛展示和分发分别允许。不能因为能下载或用于 VRChat，就推断可再分发。无法判断先请作者确认；本脚本不作许可判断。

Live2D Core/SDK 的许可与模型许可分别核对，沿用仓库 [THIRD_PARTY_NOTICES.md](../THIRD_PARTY_NOTICES.md) 的版本/来源和声明。不要用其他网站的 Core 替换仓库文件，也不要把模型本体加入 PR。官方示例的声明仍须保留；模板本身不授予模型权利。

## 2. 放入本地完整模型

```text
models_local/
  NewModel/
    NewModel.model3.json
    NewModel.moc3
    NewModel.2048/texture_00.png
    ...清单声明的 physics、pose、expressions、motions 等资源
```

保留原目录结构，文件名区分大小写。`models_local/` 已忽略，模型/贴图/moc3/录音/录像均不提交。不要使用链接或 junction 指到目录外。安全资源路由只读取配置模型清单及明确允许的资源；缺目录、清单或资源时页面会给出本地模型补齐指引，补齐后刷新。不要通过放宽路径或鉴权解决加载失败。

## 3. 复制映射模板并按真实参数填写

将 `web/avatar/mappings/template.json` 复制为 `web/avatar/mappings/new-model.json`，更改 id、model、metadata。`model` 是相对 `models_local/` 的清单位置，供本地批量校验定位；实际加载仍以本机 `avatar.path` 为准。

- `driver: "mapped"` 使用通用驱动；Hiyori 的历史表演层保留原方式，不把新模型塞进 Hiyori 判断。
- `params` 左侧是通用别名，右侧必须是本模型实际参数 ID。模板常见 ID 也需要核对，不存在的别名应删除或换成真实绑定；不能仅凭名字猜测。
- 普通嘴型用 `mouthOpen`；仅当模型有五个独立绑定通道时填写 `params.vowels` 的 a/i/u/e/o，并设 `capabilities.vowels: true`。缺少可靠元音时按张合回退；静音清零。不把近似元音估算当作识别准确率。
- `faces` 可映射清单的 expression Name。`modePoses` / `deliveryPoses` / `speechGesturePoses` 使用 params 的别名和有限数值，按模型真实范围选择小幅度。
- `parts` 保存实际部件 ID；`speechGestureEffects` 的 parts、可选振荡只引用这些别名。`partParameters` 用于 Cubism Pose 同名的虚拟部件状态参数，部件本身仍必须存在。不得在驱动代码里加“模型名是xxx”的分支。
- 旧 `actions` 可映射 `motion: ["动作组", 下标]`，下标从0开始；须在 `.model3.json` 的 Motions 组中存在。它使用原 playAction 接口，不把布尔请求成功当成 motion 播放完毕。
- `gestureVocabulary` 为新接口声明支持的词，只包含 face、预定义 speechGesture 或参数关键帧。模板仅实现 nod、shake_head、tilt_head、idle_reset；其余省略后返回 unsupported，不假装支持。各词范围见词表。关键帧进度从0到1严格递增、首尾偏移为0；禁止覆盖嘴型通道。
- metadata 填真实名称、作者、来源、署名及许可链接。元数据只用于展示，不能替代许可核对。

仅在自己的本机配置中设置（不要提交配置）：

```json
{
  "avatar": {
    "kind": "live2d",
    "path": "models_local/NewModel/NewModel.model3.json",
    "mapping": "web/avatar/mappings/new-model.json"
  }
}
```

删除 avatar 配置仍可走原 Hiyori `model_path` 兼容路径。不要把个人配置、API Key 或允许目录复制进测试/报告。

## 4. 先校验结构，再校验真实模型

```powershell
node scripts/validate_live2d_mapping.js --mapping web/avatar/mappings/new-model.json
node scripts/validate_live2d_mapping.js --mapping web/avatar/mappings/new-model.json --model models_local/NewModel/NewModel.model3.json
node scripts/validate_live2d_mapping.js --all
```

第一条只检查 JSON、别名、姿态、动作声明和词表时长/嘴型所有权，明确输出 `STRUCTURE_ONLY`、`modelChecked:false`；**不能据此声称参数在模型中存在**。

第二条使用仓库已有 Core 读取本地 moc3 的真实参数和部件 ID，再对照 manifest 的表情 Name、动作组/下标。缺文件、坏引用、越界或链接均报错，退出码1；成功退出0、`modelChecked:true`。它不会下载、联网、读应用配置或复制模型；只读取明确提供的模型和清单引用资源。声明的全部资源必须完整。错误只作诊断，不自动修改映射。

`--all` 检查仓库所有映射。Hiyori 使用仓库原有示例；其余按 mapping.model 在本地 models_local 中定位，找到才做实际模型检查。CI 没有私人/本地模型时仍检查结构并明确警告未检查引用存在性；不会上传或为测试下载模型。Linux Quality Checks 和 Windows Compatibility 均运行本脚本，Node 也测试不存在的参数、组、下标、表情、部件、非法嘴型动画及坏路径。`scripts/test-local.ps1` 同样调用它。

脚本不证明参数已绑定到可见网格、不评判动作语义或许可。必须继续检查实际画面和声音。

## 5. 跑回归与严格对照

```powershell
node tests/test_live2d_mao_sequence.js
node tests/test_live2d_gestures.js
node tests/test_live2d_mapping_validator.js
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/test-local.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/check_first_run_package.ps1
```

Mao 严格测试总是运行协议对照，本地有官方模型时再跑真实 Core 对照。Hiyori/Mao 的冻结参考见 `tests/fixtures/live2d-before-mapping/` 和 `mao-before-effects/`；不要为了通过测试改旧参考、筛掉调用或放宽容差。

新模型首次接入没有“改动前同一模型”的已批准基线，不能声称与 Hiyori 或 Mao 参数完全相同。先固定 Core 版本/哈希、输入序列、时间、随机数、参数/部件全量快照和**完整有序调用**，请作者确认画面与行为，再保存自己的映射/驱动代码参考及 SHA256（不保存模型）。以后仅平移映射时，用同一模型和 Core 分别运行冻结参考与新实现，对每帧的完整调用、参数和部件快照作 `assert.deepStrictEqual`；遇到不一致先解释原因，不用近似一致代替。新模型的专用对照测试应加入 Node runner；严格测试的真实模型部分仅在合法本地资源存在时执行，CI 的协议部分仍必须跑。

## 6. 实际验收与 PR

逐项看 idle/listen/think、张合/静音/元音回退、所有支持的表情和动作、手势中说话、连续/打断/停止/恢复、视线/屏幕坐标、原拖拽/穿透、缺模型提示，以及反复切换后实例、监听和 Blob 是否释放。录像标场景名，能看清口型，带声音；说明是受控演示还是原生真实语音，不能互相代替。窗口隐藏时不能让手势 Promise 永久等待。

每个 PR 说明改动、测试、录像链接、已知限制和依赖顺序。模型和媒体只保存在合法本地或授权审查附件，不进 git；不提交 config*.json、.env、memory 文件、日志或 Key。若需改统一入口/路由/ws，在 PR 单独说明范围与理由；不要改 VRM/场景/后端 brain。Linux/Windows CI 全绿后仍由作者 Windows 实机验收合并，不自己合并或 force/main push。


## 本次模板验证记录

## 长线阶段3完成检查点 — 模板与CI校验
新增docs/live2d-new-model-guide.md、mappings/template.json、scripts/validate_live2d_mapping.js及错误引用回归；Linux质量门禁、Windows兼容门禁和test-local都运行--all。无运行时/VRM/房间/后端brain/路由/ws改动。
校验1MiB JSON结构/别名/姿态/词表时长与口型所有权；显式模型或本地可用模型时用已有Core读取实际moc参数/部件，并检查清单表达式/动作组/下标/完整资源及路径边界。无本地模型时明确STRUCTURE_ONLY/modelChecked:false，不下载模型、不读取私人配置、不作许可判断。模板只是四词示例，未支持词省略后unsupported。
Verification Evidence：本机真实Hiyori/Mao引用全部通过；模板配真实Hiyori通过；故意不存在的Mao参数与动作组均按预期exit1。错误JSON/参数别名/组/下标/表情/部件/嘴型/路径/缺资源回归通过。完整test-local937Python/3skip/78Node，语法194/250，secrets866；首次运行包/必需JSON/py_compile通过，后增metadata错误断言单独通过。模板无模型只结构通过，明确未作模型检查。参考代码/模型资源/私密配置不新增提交。
阶段1 #2289406ea4、阶段2 #229da948e7当前Linux/WindowsCI均全成功，均未合并；229保留Draft给作者接口审阅。阶段3从229分支独立堆叠PR，按228→229→本PR顺序合并，父分支合并后同步main/调整base。录像复用前两阶段草稿审查附件（本PR无视觉变更），不声称新录制。下一步推送/创建PR/全CI后停下，作者验收合并，不force/mainpush。
