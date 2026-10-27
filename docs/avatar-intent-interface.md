# 角色表演意图接口（Avatar Intent Interface）v1

## 目的

让性格、记忆、表演决策这些上层逻辑**只写一次**，同时支持 Live2D（Hiyori、Mao）和 3D（VRM）两种渲染。

上层只发出"意图"，比如"开心，程度 0.7"或"说话手势：点头"；每种渲染器各自把意图翻译成自己模型的参数。**上层代码里不允许再出现 `ParamXxx` 这类 Live2D 参数名，也不允许出现 VRM 的表情名。**

## 词汇表（沿用现有代码中的名称）

| 类别 | 取值 | 来源 |
|---|---|---|
| `mode` | `idle` `listen` `think` `speak` | `hiyoriPerformanceDirector.js` 的 `MODES` |
| `delivery`（说话语气） | `neutral` `happy` `playful` `excited` `shy` `hurt` `sad` `anxious` `angry` `surprised` `serious` `thinking` | `DELIVERY_POSES` |
| `face`（面部情绪） | `neutral` `happy` `sad` `angry` `surprised` `thinking` `shy` `smug` `sleepy` | 在原有 `EMOTIONS` 基础上新增 `shy`、`smug`、`sleepy` |
| `speechGesture` | `nod` `small_nod` `question_tilt` `open_explain` `light_lift` `soft_lean` | `SPEECH_GESTURE_POSES` |
| `action`（一次性动作） | `nod` `nod_double` `shake` `attentive_tilt` `thoughtful_glance` `thought_resolve` `lean_forward` `lean_back` `care_lean` `shy_glance` `speak_emphasis` `sentence_release` `happy_bounce`，以及新增的 `wave` `stretch` `yawn` `poked` | `ACTION_SPECS`，加上新增项 |
| `vowel` | `a` `i` `u` `e` `o` 或 `null` | 新增 |

模型不支持的取值，由渲染器选择最接近的替代，或者直接忽略，**不能报错**。

Live2D 的可等待手势扩展、固定10词、结果状态及视线坐标约定见 [统一动作词表 v1](live2d-action-vocabulary.md)。原 `playAction` 和本页意图帧仍保持兼容；新执行器可 await `avatarRuntime.playGesture`，不需要知道模型参数名。

## 渲染器接口（JavaScript）

```js
const renderer = {
  kind: "live2d" | "vrm",
  async load(source /* { path, mapping } */) {},
  dispose() {},
  capabilities() {
    // 例：{ vowels: true, armGestures: ["wave", "open_explain"], fullBody: false,
    //      locomotion: false, faces: ["happy", ...], actions: [...] }
  },

  // 每帧调用（约 60Hz）。所有字段可选；缺省表示"保持或回到默认"。
  update(frame /* {
    now,                     // performance.now()
    mode,                    // idle | listen | think | speak
    delivery, deliveryIntensity,   // 0..1
    face, faceIntensity,           // 0..1
    gaze: { x, y } | null,          // -1..1，视线目标；null 表示自由眼动
    mouth: { open, vowel },         // open 0..1；vowel a/i/u/e/o/null
    speechGesture: { name, phase } | null,  // phase 0..1
    breath, energy,                 // 0..1
    blinkSuppressed                 // true 时由上层接管眨眼
  } */) {},

  // 一次性动作；返回 false 表示不支持，由上层另选
  playAction(name, { intensity = 1 } = {}) { return true; },
  stopAction() {},
};
```

## 模型映射文件

每个模型配一份映射文件，不把参数名写死在代码里：

```json
{
  "kind": "live2d",
  "model": "Mao/Mao.model3.json",
  "params": {
    "angleX": "ParamAngleX", "angleY": "ParamAngleY", "angleZ": "ParamAngleZ",
    "bodyX": "ParamBodyAngleX", "bodyY": "ParamBodyAngleY", "bodyZ": "ParamBodyAngleZ",
    "eyeBallX": "ParamEyeBallX", "eyeBallY": "ParamEyeBallY",
    "mouthOpen": "ParamA",
    "vowels": { "a": "ParamA", "i": "ParamI", "u": "ParamU", "e": "ParamE", "o": "ParamO" },
    "cheek": "ParamCheek", "breath": "ParamBreath"
  },
  "faces": { "happy": "exp_02", "angry": "exp_05" },
  "deliveryPoses": { "playful": { "angleZ": -4.2, "armL1": 0.5 } },
  "actions": { "happy_bounce": { "motion": ["TapBody", 2] } }
}
```

VRM 的映射：`faces` 对应 VRM 表情（`happy` `angry` `sad` `relaxed` `surprised`）；`vowels` 对应 `aa` `ih` `ou` `ee` `oh`；`actions` 对应 VRMA 或 Mixamo 动作文件。

## 模型文件存放

- 模型文件**一律不进仓库**。开发时放在 `models_local/`（加入 `.gitignore`）；用户安装后放在 `%LOCALAPPDATA%\XinyuDesktopPet\models\`。
- 配置：`"avatar": { "kind": "live2d" | "vrm", "path": "...", "mapping": "..." }`。旧配置中的 `model_path` 视为 `kind=live2d`，保持兼容。
- 界面上显示模型的署名和使用条件；VRoid Hub 的模型必须按平台规范展示"模型数据使用条件"。
