# Live2D 统一动作词表 v1（先行接口约定）

本接口面向前端动作执行器，不包含后端 brain 调度。Hiyori 与 Mao 共享同一接口，通过各自 `mappings/*.json` 的 `gestureVocabulary` 决定支持范围。依赖阶段1 #228，当前 PR 先发布本约定再实现；作者可在 Draft PR 审阅。

## 调用与结果

```js
const renderer = state.avatarRenderer; // 来自原 avatarRuntime，不能另建模型入口
const result = await renderer.playGesture("nod", { intensity: 0.7, signal });
// { name: "nod", status: "completed", durationMs: 900 }
renderer.lookAt("user");
renderer.lookAt({ type: "screen", x: 800, y: 300 });
renderer.lookAt("reset");
```

`playGesture(name, options?)` 始终返回 Promise；未知名称、未加载、取消或资源错误均返回结构化结果，不向执行器抛异常。

| status | 含义 |
| --- | --- |
| completed | 映射声明的表现窗口执行完毕，或 idle_reset 已完成清理 |
| unsupported | 模型没有该词映射；立即返回，不打断现有动作 |
| interrupted | 被新受支持手势替换、stopAction、dispose 或 AbortSignal 取消 |
| failed | 输入无效、渲染器未就绪、映射无效、播放失败或时钟停滞；reason 给出稳定原因码 |

`intensity` 默认1，有限值限制到0..1；`signal` 可省略。每模型同时只保留一个手势。连续调用采用“最新受支持请求替换上一请求”，前一个 Promise 必须结束。超时保护在映射时长后额外1000ms内返回 failed/clock_stalled，避免隐藏/停止渲染后永久等待；定时器只结束请求，不写模型参数。动作与口型独立：不得把 mouth、vowel 或说话 mode 清零，不暂停 Pixi ticker。完成指表现窗口完成，不承诺语义层计划成功或真实世界动作完成。

## 固定词表

时长为模型映射的表现窗口，包含归位；参数关键帧以0..1的进度线性插值。面部强度用 sin² 包络淡入淡出。无对应资源的模型可省略词条并返回 unsupported，不能用另一个语义冒充支持。

| 词 | 含义 | 时长范围 |
| --- | --- | --- |
| nod | 一次轻点头 | 600–1600ms |
| shake_head | 左右摇头 | 800–2000ms |
| wave | 小幅挥手，受模型手臂绑定限制 | 1200–2400ms |
| think | 思考时的轻侧头与表情 | 1200–2400ms |
| happy | 开心表情与轻微上扬姿态 | 1000–2400ms |
| surprised | 短暂惊讶 | 600–1600ms |
| shy | 害羞、轻低头 | 1000–2200ms |
| sad | 难过、轻低头 | 1200–2600ms |
| tilt_head | 向一侧轻歪头再归位 | 800–2000ms |
| idle_reset | 结束本接口手势和视线覆盖，回到原有状态驱动；不结束说话 | 0ms（立即） |

v1 的两个模型均采用映射参数关键帧和可选 face，不改变官方动作资源的时长，也不把“动作已请求”当作官方 motion 已结束。原 `playAction` 继续用于已有一次性动作；此接口不替换它。

## lookAt(target)

同步返回 `{status:"completed"}` 或 `{status:"failed", reason:"invalid_target"|"not_ready"}`，不会阻塞。支持 `user` / `left` / `right` / `up` / `down` / `reset` 和 `{type:"screen",x,y}`。

- user：跟随本页已有鼠标视线状态；没有鼠标状态时取中心。保留原来的命中、拖拽和穿透路径。
- left/right/up/down：模型视线坐标的左/右/上/下，映射幅度由现有渲染层决定。
- screen：**浏览器 CSS 屏幕像素坐标**，减去窗口 screenX/screenY，再按模型 canvas 的 viewport 矩形归一化并限制在 -1..1。不是操作系统物理像素；高 DPI 调用者应先换算 CSS 坐标。
- reset：释放本接口视线覆盖，恢复原自由/鼠标视线。不会修改对话或正在播放的嘴型。

## 原统一入口与事件

`state.avatarRuntime.playGesture` / `.lookAt` 转发到当前渲染器。旧 `frameFromState`、`avatar-intent`、BroadcastChannel 和渲染器自己时钟保持原路径。可发送以下 fire-and-forget 事件：

```js
window.dispatchEvent(new CustomEvent("avatar-intent", { detail: { gesture: "nod" } }));
window.dispatchEvent(new CustomEvent("avatar-intent", { detail: { look_at: "left" } }));
// 同时兼容执行器消息 {type:"gesture",name:"nod"} / {type:"look_at",target:"user"}
```

需要判断完成/失败的执行器必须直接 await 当前 runtime/renderer 的方法；本 PR 不增加跨窗口 RPC/后端 ACK，不把上述单向事件当作完成确认。对未实现扩展的渲染器，公共转发返回 unsupported，不修改 VRM 实现。

## 映射格式

`gestureVocabulary` 的每个词声明 `durationMs`，可含 face、speechGesture（引用已有姿态）及 keyframes。关键帧 `at` 从0到1严格递增，`values` 只允许本映射 params 中的数值别名。开始和结束的参数偏移必须为0；禁止控制嘴型通道，以免手势冻结说话。idle_reset 的 durationMs 固定0。模型参数名、动作资源名不能放到执行器中。

```json
{
  "gestureVocabulary": {
    "nod": { "durationMs": 900, "keyframes": [
      { "at": 0, "values": { "angleY": 0 } },
      { "at": 0.45, "values": { "angleY": -7 } },
      { "at": 1, "values": { "angleY": 0 } }
    ] },
    "happy": { "durationMs": 1400, "face": "happy" },
    "idle_reset": { "durationMs": 0 }
  }
}
```

## 验收与边界

两个模型全部词条均须播放或及时 unsupported；覆盖连续调用、打断、取消、隐藏时钟超时、失败、卸载及说话期间连续口型。模型资源仅本地，录像只作审查附件。待实现与测试后在本节补具体证据；此文档初次提交不宣称功能已实现。
