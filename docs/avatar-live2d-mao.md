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

这是轻量启发式，测试合成频谱可验证分支正确，不能证明任意真实人声的音素准确率。浏览器自带 TTS 没有可读取的音频频谱时会使用原有语音张合包络，语音桥同步“是否具有音频分析”的标记；真正有分析器时的静音不会被这个回退重新打开嘴巴，过期的远端包络也不会继续张嘴。该回退仅用于 Mao 的映射驱动路径。渲染器显式收到元音意图时驱动映射的五个通道，静音清零。

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

## 验证证据

- `scripts/test-local.ps1`：849 Python 测试通过、3 跳过，66 个 Node 测试文件通过，Python184 / JS226 文件语法检查、807 文件密钥扫描通过。
- 同一个 Core 6 下 Hiyori 严格回归：Node 5280 帧 / 394224 次完整调用及参数、部件快照严格一致；真实 Pixi 浏览器 1030 帧 / 167741 次调用与快照严格一致，四组画布 PNG 哈希相同，十次重新加载清理通过。无容差放宽。
- 新 Node 测试覆盖五元音、静音、歧义回退、输出延迟、映射、动作、手臂、未知意图、鉴权预读及部分失败释放；Python 覆盖资源白名单、路径边界、链接、配置优先级及公开配置边界；语音桥测试覆盖元音、无效值与静音。
- `scripts/qa_live2d_mao.cjs`：使用本机官方模型与真实 Pixi/Core；5 嘴型、8 表情、3 手势共 16 张截图；五通道在实际 Core 计算前的参数逐项验证；八个原生动作实际加载并播放；未鉴权资源请求仍被拒绝，页面无脚本异常。
- 文档 `check:all` 四个浏览器冒烟通过。截图、详细日志及本机部署回滚副本均保存在仓库外。

Mao 浏览器验证需要自行下载模型，执行 `node scripts/qa_live2d_mao.cjs`。它是独立测试场景，截图不是用户桌面截屏。Windows 原应用中的拖拽、点击穿透、真实语音与动作观感仍由作者最终检查；PR 仅改为可审查，由作者合并。
