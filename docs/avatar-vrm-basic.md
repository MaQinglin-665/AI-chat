# VRM 基础渲染器

本功能仅提供本地 VRM 0.x / 1.0 渲染和基础表演，沿用
[Avatar Intent Interface v1](avatar-intent-interface.md)。未配置 `avatar`，
或继续使用旧 `model_path` 时，仍走原 Live2D 初始化流程。

## 启用与目录边界

在用户自行维护的本地配置中添加（示例，不是已修改的用户配置）：

```json
{
  "avatar": {
    "kind": "vrm",
    "path": "D:/MyAvatars/avatar.vrm",
    "allowed_directories": ["D:/MyAvatars"]
  }
}
```

仓库 `models_local/` 是默认允许且忽略的目录；其他目录必须显式加入
`avatar.allowed_directories`，且必须是绝对路径。安装后也可指定
`%LOCALAPPDATA%/XinyuDesktopPet/models/` 的展开后绝对路径。
路径中的 `..`、符号链接和 Windows junction/reparse point 被拒绝。
模型接口不接受请求传入的任意文件路径，只读取配置指定的 `.vrm`。
预留动画路径校验只接受 `.vrma`；基础版没有 VRMA 加载端点，也不执行外部动画。
GLB 必须内嵌资源，加载器拒绝外部纹理/缓冲区 URL。

`GET /api/avatar` 返回渲染类型、固定模型 URL、署名和许可信息；
`GET /api/avatar/model.vrm` 返回已配置模型。两个端点沿用现有 API 的来源与鉴权检查。
除模型外，仅将同目录下非链接的 `README.txt` 作为署名说明读取（最多 32 KiB），
不会提供任意文本文件下载。没有来源链接或许可字段时明确显示缺失，不推断授权。
控制中心“模型 / 语音”页显示模型信息与完整许可链接。

禁止提交或打包用户 VRM/VRMA；`.gitignore` 覆盖模型文件和本地模型目录。
不要把模型画面加入公开截图、文档或测试快照。源码包使用已有目录白名单和忽略规则，
不包含仓库外模型或 `models_local/`。

## 渲染与意图

- `web/avatar/vrmRenderer.js` 暴露 `createRenderer`，实现 load/dispose/capabilities/update/playAction/stopAction。
- 三方依赖固定为 three.js 0.180.0、@pixiv/three-vrm 3.4.4，本地 bundle 按需加载，不使用 CDN。
  许可证及重建方式见 THIRD_PARTY_NOTICES.md、scripts/build_vrm_vendor.cjs。
- 眨眼、鼠标视线、呼吸、轻微摇摆和库内 SpringBone 每帧更新；空闲 20 FPS、说话/显式动作 30 FPS；按画布大小限制 90 万渲染像素，最大 DPR 1.25。
  隐藏窗口暂停更新，dispose 释放纹理、几何体、渲染器和 WebGL context。
- mouth.open 复用现有音量值；vowel 为 null/缺省时驱动 aa，a/i/u/e/o 分别映射 aa/ih/ou/ee/oh。
- happy/angry/sad/surprised 对应同名表情；thinking/shy/sleepy 使用 relaxed，smug 使用 happy。
  不存在的表情与未知意图均忽略。capabilities 反映模型实际支持的表情与骨骼。
- 代码动作支持 wave、nod、small_nod、nod_double；stopAction 清除一次性动作。
  loadAnimation 为预留接口，当前返回 false。无外部动作文件依赖。
- load 的 mapping 可传内存对象覆盖 faces/vowels；基础版不读取任意 JSON 映射文件。
- `window` 的 `avatar-intent` 事件和 `xinyu-avatar-intent` BroadcastChannel 可传
  `{action:"wave"}`、`{stop:true}` 或 `{frame:{face:"happy",mouth:{open:0.5,vowel:"a"}}}`。
  `{frame:{}}` 清除测试覆盖。正常音量桥接不改变聊天、记忆、语音生成或外部执行逻辑。

## 验收证据与限制

自动化测试只用假的 VRM 或合成 GLB，覆盖意图、动作恢复、VRM0/1 坐标方向、
无元音回退、缺失表情、路径边界和元数据；不包含真实用户模型。
Windows 未授予创建符号链接权限时，该真实链接用例跳过，链接策略模拟用例继续运行；
Linux CI 可运行真实符号链接测试。

本机使用隔离 Electron 39.8.10 窗口及仅 Avatar 的测试服务验证了真实 VRM0 加载、
纹理、透明背景、待机、挥手、点头、音量桥接和署名界面。截图仅在忽略目录
`tmp_ui_smoke/avatar-vrm/`，不随代码提交。无 avatar 的 Hiyori 亦完成渲染回归。
真实 VRM1 模型未进行人工视觉验收；支持来自固定版本加载器及假模型测试。

性能：480×720 CSS 像素、DPR 1.5、32 个逻辑处理器，预热后每阶段采样 10 秒。
CPU 是 Electron app.getAppMetrics 的各进程 percentCPUUsage 求和；GPU 是 Windows
GPU Engine 浮点计数器中这些进程的 3D 引擎占用求和。

| 场景 | 平均 CPU | 平均 GPU 3D |
| --- | ---: | ---: |
| 待机 | 3.44% | 0.257% |
| 模拟说话音量输入 | 3.53% | 0.261% |

说话阶段通过已有 BroadcastChannel 注入起伏音量，未调用真实 LLM/TTS；不包含语音合成负载。
数字仅代表本机隔离窗口，不是所有模型/硬件的性能承诺。
现有模型窗口关闭时学习面板清理异常在 Hiyori 上也复现，本任务未改学习/记忆模块。
以上为基础版的历史隔离测试。完整桌宠主进程已在后续性能修复中实测，见 [性能与动作复测](avatar-vrm-performance.md)；真实聊天语音和用户视觉满意度仍留给 Windows 人工验收。

最终本地门禁：scripts/test-local.ps1 全部通过（825 passed、3 skipped；全部 Node、语法及秘密扫描通过）；scripts/check_first_run_package.ps1 通过。未修改默认配置或私人配置。
