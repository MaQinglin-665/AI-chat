# Mao 本地接入与阶段 3 验收

Mao 与 Hiyori、VRM 共用 `avatarRuntime` 的配置选择、`frameFromState` 和 `avatar-intent` 事件。Live2D 继续使用原 Pixi ticker 与 pre-Core 更新位置，不增加写参数的 RAF。Hiyori 继续走原有映射和表演层；Mao 使用独立映射驱动。

## 配置

从 [Live2D 官方 SDK 下载页](https://www.live2d.com/en/sdk/download/web/)取得 Cubism SDK for Web，并阅读 SDK 与示例模型的使用条件。将 SDK 中 `Samples/Resources/Mao/` 的完整内容放在本机 `models_local/Mao/`，保留目录结构。

在本机 `config.local.json` 加入下列配置，其他设置保持原样：

```json
{
  "avatar": {
    "kind": "live2d",
    "path": "models_local/Mao/Mao.model3.json",
    "mapping": "web/avatar/mappings/mao.json"
  }
}
```

`models_local/` 已被 Git 忽略。安装版也可把模型放在 `%LOCALAPPDATA%/XinyuDesktopPet/models/`，将该绝对目录加入 `avatar.allowed_directories` 后填写模型路径。删除 `avatar` 配置即可恢复原 `model_path` / Hiyori 路径；两者同时存在时，明确填写的 `avatar.path` 优先。不要提交本机配置、模型、录音或截图。

## 嘴型、表情与动作

`vowelEstimator.js` 在已有音频分析器上平滑频谱，用两处包络峰与五个原型作保守比较。静音、平坦频谱、单峰、离原型过远或候选接近时输出 `null`，Mao 只按音量驱动张合，不猜元音。延迟队列对齐现有输出延迟；聊天窗口向模型窗口的原语音广播增加经过枚举校验的元音与置信度，旧包仍有效。隐藏且未加载模型的聊天窗口可通过公开配置中的映射名称启用分析。公开配置不返回本地模型路径或允许目录。

这是轻量启发式，测试合成频谱可验证分支正确，不能证明任意真实人声的音素准确率。浏览器自带 TTS 没有可读取的音频频谱时，播放生命周期与共享张合回退另放入从 main 建立的独立口型修复 PR；不属于 #217 的映射适配范围。渲染器显式收到元音意图时驱动映射的五个通道，静音清零。

| 意图 | 官方表情 |
| --- | --- |
| neutral / thinking | exp_01 |
| happy | exp_02 |
| sleepy | exp_03 |
| smug | exp_04 |
| sad | exp_05 |
| shy | exp_06 |
| surprised | exp_07 |
| angry | exp_08 |

表情从用户提供的官方资源读取，按 Add / Multiply / Overwrite 语义及强度应用，不把表情资源复制进代码。`thinking` 是中性表情加头部姿态的替代。

| 意图动作 | 官方动作位置 / 文件 |
| --- | --- |
| sentence_release | Idle[0] / mtn_01 |
| thoughtful_glance | Idle[1] / sample_01 |
| nod | TapBody[0] / mtn_02 |
| happy_bounce | TapBody[1] / mtn_03 |
| attentive_tilt | TapBody[2] / mtn_04 |
| speak_emphasis | TapBody[3] / special_01 |
| poked | TapBody[4] / special_02 |
| shy_glance | TapBody[5] / special_03 |

这些是与接口词汇相近的可用动作替代，不承诺每个官方动作都逐字表达对应语义。原生动作保留官方时长与幅度，`intensity` 用于程序手势；未映射动作返回 `false`。`wave` 使用额外程序手势，`open_explain`、`light_lift` 接收 `speechGesture`。手臂使用映射中的六个 A 臂参数与 A/B 部件可见性，幅度受原模型约束，挥手为小幅摆臂，不会把未绑定的关节当作完整人体骨骼。

## 资源边界与署名

新增的只读 `/api/avatar/live2d/` 路由位于原有来源和 API token 检查之后。只提供配置模型的清单及其声明的 moc、PNG、物理、姿态、表情和动作文件；拒绝越界、链接、junction、错误类型及未声明文件。清单限 1 MiB、引用数限 256、单资源限 64 MiB。请求方不能把任意磁盘路径当资源地址。

Pixi 自带加载器不支持附加 API token，因此 `live2dAssets.js` 通过原 `authFetch` 预读资源，创建仅在本页面有效的 Blob URL，在失败或销毁时释放。单个模型设置实例修正 Pixi 6 旧 URL 解析器对 Blob 地址的处理；显示库文件和文档供应商文件没有变化。旧安装页面需要与当前主分支相同的 `connect-src blob:` 策略，仍保留鉴权。

界面“模型 / 语音”面板显示 Mao 名称、Live2D Inc. 署名、官方来源、完整使用条件链接及模型声明。比赛材料应明确桌宠程序与适配实现由团队开发，Mao 是官方示例素材。

> This content uses sample data owned and copyrighted by Live2D Inc. The sample data are utilized in accordance with terms and conditions set by Live2D Inc. This content itself is created at the author’s sole discretion.

使用条件：[Free Material License](https://www.live2d.com/eula/live2d-free-material-license-agreement_en.html)、[Sample Model Terms](https://www.live2d.com/eula/live2d-sample-model-terms_en.html)。仓库仅保存映射及代码，不包含 Mao 模型资源。

## #217 合并前的历史验证证据

- `scripts/test-local.ps1`：849 Python 测试通过、3 跳过，66 个 Node 测试文件通过，Python184 / JS226 文件语法检查、807 文件密钥扫描通过。
- 同一个 Core 6 下 Hiyori 严格回归：Node 5280 帧 / 394224 次完整调用及参数、部件快照严格一致；真实 Pixi 浏览器 1030 帧 / 167741 次调用与快照严格一致，四组画布 PNG 哈希相同，十次重新加载清理通过。无容差放宽。
- 新 Node 测试覆盖五元音、静音、歧义回退、输出延迟、映射、动作、手臂、未知意图、鉴权预读及部分失败释放；Python 覆盖资源白名单、路径边界、链接、配置优先级及公开配置边界；语音桥测试覆盖元音、无效值与静音。
- `scripts/qa_live2d_mao.cjs`：使用本机官方模型与真实 Pixi/Core；5 嘴型、8 表情、3 手势共 16 张截图；五通道在实际 Core 计算前的参数逐项验证；八个原生动作实际加载并播放；未鉴权资源请求仍被拒绝，页面无脚本异常。
- 文档 `check:all` 四个浏览器冒烟通过。截图、详细日志及本机部署回滚副本均保存在仓库外。

Mao 浏览器验证需要自行下载模型，执行 `node scripts/qa_live2d_mao.cjs`。它是独立测试场景，截图不是用户桌面截屏。Windows 原应用中的拖拽、点击穿透、真实语音与动作观感仍由作者最终检查；PR 仅改为可审查，由作者合并。


## 2026-10-27 — 新 main 上的独立 Mao 验收

`friend/avatar-live2d-mao` 直接从作者合入 #217 后的 `origin/main 9d09edc` 建立。此前没有独立 Mao 分支或 fork；基础适配已在 main，本次仅补验收和复现问题修复，不包含未合并的 #226 共享口型改动。

- **发现并修复加载取消结果错误**：`load()` 等待映射期间调用 `dispose()`，原实现返回 `undefined`，而公共 runtime 仅把 `false` 视为加载失败；等待模型资源时取消，也会在资源到达后创建驱动并返回成功。现在在两次映射等待及模型资源等待后检查取消状态，明确返回 `false`；迟到资源只释放一次，不创建驱动。新增三个确定性回归，修复前可复现失败。正常 Pixi tick、pre-Core 更新顺序和参数数值不改。
- **真实模型验收加强**：五元音逐通道断言；无可靠元音/非法元音回退 A、静音五通道清零；8 个官方表情逐条核对实际 Core 调用的参数 ID、Blend 和值，并确认参数存在；3 个手势各取 0/.25/.5/.75/1 五个阶段，检查实际六个臂参数存在、在模型范围内、峰值移动、起落归位，解释/轻抬幅度不同。另验证 `wave` 一次性动作自然到期和 `stopAction` 归位，以及 8 个官方动作实际加载播放。
- **真实配置切换**：明确 `avatar` Mao 与旧 `model_path` Hiyori 连续往返两轮，检查映射/能力正确、旧模型和 Pixi 实例销毁、通道和意图监听各只剩一个。Mao 的 20 个 Blob 在切回 Hiyori 时归零；最后清理后模型、Blob、通道、resize/intent/unload 监听全部归零。配置只在独立测试页内存中构造，未读写私人配置。
- **本地证据**：20 张截图（5 元音、8 表情、3 手势、4 切换）与 `mao-evidence.json` 位于仓库外 `outputs/mao-acceptance/`，已查看画面。隔离测试页使用真实本地官方模型、Pixi/Core；资源预读采用测试页鉴权头，63 次授权请求成功、1 次未授权请求返回 401，零页面脚本异常。该头仅用于独立验收服务器，不能代替应用 API 的鉴权安全测试；后者由已有 Python 回归覆盖。
- **Verification Evidence**：`scripts/test-local.ps1` 全部通过：932 Python / 3 跳过、74 个 Node 文件，Python194 / JS243 语法、853 文件密钥扫描通过；`scripts/check_first_run_package.ps1`、必需 JSON/py_compile 通过。继承 main 的 Hiyori 严格测试随全量门禁通过（5280 帧/394224 调用/42 场景），未修改任何严格对照快照或基线。Python 资源路径、配置优先级测试已随全量执行；初次受限环境定向执行因临时目录权限失败，完整正常权限门禁中通过。

重跑真实模型验收前，须本地有官方 Mao 完整资源和原 Hiyori 示例（`web/models/hiyori_pro_t11/`）。执行 `node scripts/qa_live2d_mao.cjs`，或用 `AVATAR_QA_OUTPUT` 指定仓库外证据目录。模型均由使用者自行取得，不随 PR、测试或截图包分发。截图页保留 Live2D 署名；Mao 手势受模型绑定约束，是小幅摆臂。受控输入验收不代表真实人声元音识别率，也不是 Windows 原生拖拽/穿透/真实语音试听；这些仍由作者在 Windows 上检查，#226 另行试听合并。

修改仅为 `live2dRenderer.js` 取消检查、`test_live2d_mao.js` 回归、`qa_live2d_mao.cjs` 验收断言及本报告/三份状态记录。未改映射、Core、VRM/场景、对话、记忆、外部执行或本机安装；未提交模型、媒体、私密配置或 Key。正常推送独立 PR，由作者审查合并，不自行合并。


## 长线阶段1补齐 — 2026-10-27
- 手臂部件选择与摆动从 driver 的专用名字判断迁到 `mao.json` 的 `speechGestureEffects`，driver 只解释通用 parts/partParameters/oscillations。未改数值和调用顺序。
- 冻结 main9d09edc 的 driver/mapping 原字节及 SHA256；同组1440帧完整序列/全部参数与部件快照严格一致：CI协议25850调用，本机真实Core6/Mao181030调用，无容差。CI不下载Mao，本机模型存在才加跑真实模型；两类证据分开报告。旧Hiyori严格基线不变。
- 缺目录、清单、moc3、贴图、表情五种条件回归；前端在本地模型描述失败或资源加载失败时显示 models_local/清单/资源/avatar.path/刷新指引，返回null、保留聊天，不吞VRM错误。共享代码仅live2dRuntimeController的本地Live2D失败提示/短路，未改路由/ws或其他渲染器。
- 40秒/800帧/20fps本机真实Pixi/Core录像：idle/listen/think、五元音（放大口型）、3手势、8表情、真实指针拖拽/松手恢复。带本机SAPI场景/元音音轨；这是受控映射展示，不是原生Windows TTS延迟测量。画面含场景名和Live2D署名；没有模型/媒体进git。
- 全量scripts/test-local.ps1：937Python通过/3跳过，76Node文件，语法194/246，secrets859；首次运行包和必需JSON/py_compile通过。第一次全量发生一次无关external_agent HTTP本机连接中止，未改其代码；完整重跑通过。20截图/4切换/63授权/1拒绝/0页面错误及拖拽移动断言通过。
- 录像已作为原仓库的**草稿验收附件**保存，需作者登录并有仓库写权限查看；不发布产品release。链接：https://github.com/MaQinglin-665/AI-chat/releases/tag/untagged-d2ff791d304d9886571a
- 已知限制：合成频谱/受控元音不能证明真实人声识别率；Mao手势受原模型绑定约束；原生Windows穿透与真实语音仍由作者检查。#226独立且CI已绿，不混入本分支。
