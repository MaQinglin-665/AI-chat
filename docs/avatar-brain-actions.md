# 大模型驱动 3D 行为：第一期后端

实验功能，默认关闭。本期只生成和校验计划；控制台调试入口不执行动作、不播放主动语音，
不改变现有随机日常。动作执行器、自适应帧率和真实 10 分钟验收属于第二期，等待 #217 合并。
`avatarRuntime.js`、`vrmRenderer.js` 均未修改。

## 配置与凭据

下面是配置格式说明，不需要修改用户的私人配置文件来运行测试：

```json
{"avatar":{"brain":{"enabled":false,"mode":"daily","daily_limit":24,"night_actions_only":true}}}
```

所有字段都有后端默认值，旧配置继续有效。使用现有 `llm` 的模型、服务地址和 `api_key_env`；
主动思考只使用环境变量里的 Key；移除内联 `api_key`，由现有客户端从环境变量取得凭据。
Key 只写在配置文件里、对应环境变量缺失时，主动思考无法调用模型，会静默返回空决定。
回复动作启用时也只使用环境变量；如果旧聊天仅有内联 Key 且对应环境变量缺失，
本轮不附加动作能力，继续原聊天流程。不会读取、复制或改写 `config.local.json`。

| 档位 | 最短调用间隔 | 滚动一小时调用上限 |
| --- | ---: | ---: |
| quiet | 900 秒 | 2 |
| daily | 300 秒 | 6 |
| streamer | 60 秒 | 20 |

`daily_limit` 默认 24，范围 0–96；0 禁用主动调用。以上限制叠加，模型的
`next_think_after_sec` 只能延后下一次调用，不能突破档位下限。失败、空决定也占一次额度。
限频状态保存在 `%LOCALAPPDATA%\XinyuDesktopPet\avatar-brain-usage.json`，重启不会清零。
每日计数按机器当地日期跨天重置；滚动一小时的时间戳不会因跨天被清空。
文件只含版本、日期、计数和时间戳，不含对话、记忆、路径或凭据；已加入忽略规则。
同目录锁文件配合原子替换，正常情况下多个实例共享额度。文件损坏、不可写或锁超时，
本进程退回内存计数，并只记录固定原因码；不重试覆盖损坏文件。此降级期间重启和多实例
无法保证共享限额，因此它不是账户级费用封顶。正常聊天不受影响。

## 接口

全部为 POST，沿用 `app.py` 的 Origin 和 `X-Taffy-Token` 校验；请求体最多 4096 UTF-8 字节。
超限返回 413，非法 JSON/场景返回 400。错误响应和日志均不包含原始请求、模型输出或异常详情。

- `/api/avatar/brain/world`：提交下例状态，返回规范化状态。只接收固定枚举和有界数值；
  未知字段丢弃，不能携带路径、Key、任意自由文本或私人配置。内部表示最多 768 字符。
- `/api/avatar/brain/think`：尝试一次主动思考；所有限频/忙碌检查仍生效，不能手动绕过。
  可带 `reason: idle | period_changed | user_returned`，其他值按 idle 处理。
- `/api/avatar/brain/poll`：获取尚在有效期内的计划；没有计划时返回空数组。
- `/api/avatar/brain/ack`：执行端确认接口，见“记忆”。**调试入口不调用它**。

```json
{
  "scene":"room", "position":[0,0], "activity":"accompany",
  "places":["accompany","window","books","rest","desk"],
  "activities":["window","books","rest","desk","stretch","yawn","hum"],
  "gestures":["nod","small_nod","nod_double","wave"],
  "period":"night", "idle_sec":600, "typing":false, "speaking":false,
  "events":[{"type":"activity","name":"window","stage":"end"}]
}
```

场景为 room/handpainted/none；位置单位米，夹在 ±20；idle_sec 为 0–86400。
地点/活动 ID 仅接受当前代码中的 accompany/window/books/rest/desk/stretch/yawn/hum，
动作还必须存在于本次世界状态声明的能力列表中。事件只保留最近 3 条；它们是上下文，
**不是动作已完成的确认回执**。当前渲染器的 start 事件可能表示开始前往活动点，不能据此推断已经抵达。

状态超过 90 秒没有更新、scene=none、输入中、说话中、聊天请求处理中，都不主动调用。
需至少空闲 30 秒；周期变化/用户回来可唤起思考，但仍受这个间隔及其他限额约束。
首次开启并提交世界状态后，后端每 5 秒检查一次；单次只允许一个主动调用在途。
网络调用在锁外运行，12 秒调用预算；期间发生输入、场景变化或关闭功能，旧结果丢弃。
输入和场景/时段变化还会清空旧计划；计划最多 16 个，5 分钟过期。

## 决定格式

```json
{
  "say":"我去窗边看看。",
  "emotion":"happy",
  "actions":[
    {"type":"go_to","target":"window"},
    {"type":"activity","name":"window","duration_sec":30},
    {"type":"look_at","target":"user"},
    {"type":"gesture","name":"nod"},
    {"type":"wait","duration_sec":10}
  ],
  "next_think_after_sec":300
}
```

还支持 `{"type":"sit"}`（世界必须声明 rest 或 desk）与 `{"type":"stand"}`。
emotion 沿用意图层的 neutral/happy/sad/angry/surprised/thinking/shy/smug/sleepy，
不暴露 VRM 骨骼或 MToon 名称。手势白名单为 nod/small_nod/nod_double/wave/stretch/yawn，
并与客户端声明能力取交集。每条计划最多前 8 项，单个活动/等待最多 120 秒，总计最多 300 秒。
无效条目单独丢弃；日志只记录固定原因码和丢弃数量。未知字段不会转发给执行端。
主动 say 最多 160 字符，夜晚且 night_actions_only=true 时强制清空。
不合法 JSON、超时、服务异常、空决定均静默返回 `decision:null`。

返回计划还含 `id`、`source: reply | proactive` 和 `status: planned`。没有任何工具分发、
系统命令、文件路径或外部执行入口；这里的 go_to 只是 3D 世界的地点枚举。

## 模型提示词与回复兼容

普通回复：保留现有人设、上下文、记忆、自然对话协议，在末尾追加短的世界状态与动作白名单。
要求模型先按原协议回答，随后可选输出 `<avatar-brain>{JSON}</avatar-brain>`。
这仍是原来那一次模型请求，**不增加一次动作推理请求**；为附注额外预留最多 512 输出 token。
增量过滤器在字符边界识别附注，普通流式文字继续输出；控制数据在 TTS、记忆和回复整理前移除。
`/api/chat` 的响应或 `/api/chat_stream` 的 done 事件附带 `avatar_brain` 计划。
没有附注时不增加响应字段，原文字（包括空白）保留；无效动作不影响文字。
回复计划的 say 总是清空，避免把已有回复再播一次。Galgame 和现有 auto 回复不附加这一协议。

主动思考：使用现有 `companion_dialogue_policy` 的语言/性格规则，再附加同一个动作规范和
规范化世界状态，要求只返回 JSON。追加最近 3 轮对话的摘录摘要（总计最多 300 字符），
及现有本地记忆检索选出的最多 2 条相关记忆（每条最多 120 字符）。沿用聊天历史与送达回执，
不额外调用模型生成摘要、不调用云记忆；无历史或检索失败时省略上下文。
进入提示词前整条排除疑似凭据、路径和私人配置，再截断；保守过滤可能略过正常技术话题。
这些内容标注为不可信上下文，不是指令。没有历史全文、桌面数据、任意配置或工具定义；
允许沉默。主动调用不会进入现有工具执行或回复修饰/重试推理链。
现有客户端对官方 DeepSeek 使用非思考模式。

## 记忆与第一期边界

决定发布后只存在有界内存队列，称为“计划”，不会写成经历。
原聊天文字仍使用原有送达回执与记忆流程。
未来执行端确认主动语音实际送达或某个动作完成时，提交：

```json
{"id":"后端返回的计划ID","speech_delivered":true,"action_indices":[0,1]}
```

只有该计划存在、未过期且对应项目尚未确认，才将简短话语/固定动作摘要写入现有
memory store；标注为 `avatar_world_confirmed` 和“非用户发言”。重复回执不重复写入。
不增加存储文件、数据库或用户偏好推断，遵守现有 memory.enabled、条数限制和删除机制。
执行回执是受 Token 保护的本地客户端声明，并不证明现实世界里发生了相应动作。
第一期的控制台调试不会确认送达，因此实际使用调试入口不会留下虚构经历。

## 最小调试入口

在应用控制台使用 `XinyuAvatarBrainDebug.send()` 发送当前状态；
`think()` 尝试受限主动思考，`poll()` 打印计划。
`start()` 每 30 秒发送并打印，`stop()` 移除计时器和监听。
加载脚本本身不发送请求、不启用功能；不提供执行或 ACK 操作。
状态只从现有渲染器 metrics/capabilities、布局、现有时段 dataset 和忙碌状态读取，
不会读取聊天输入正文、模型路径或私人配置。默认功能关闭时不会调用模型。

## Token 与费用估算（2026-10-26）

离线构造的完整主动提示词样本共 2429 字符，其中世界状态 302 字符；这不是服务端 tokenizer 实测。
估计每次约 700–1000 输入 token、100–250 输出 token；输出预算硬上限 480。
daily 最短 5 分钟且最多 6 次/小时，默认每天最多 24 次；真实次数为 **0–24**，
取决于是否开启、是否持续提供新鲜状态、忙碌程度和模型选择延后。8 小时在线也不能超过 24 次。

按官方 deepseek-flash 高峰、缓存未命中价格（输入 $0.30/百万、输出 $1.20/百万 token），
上述估算每次约 $0.00033–$0.00060；24 次约 **$0.0079–$0.0144/日**。
若每次按 1000 输入 + 480 输出预算计算，则约 $0.021/日。低峰价格减半，缓存命中可进一步降低。
来源：[DeepSeek 官方价格](https://api-docs.deepseek.com/quick_start/pricing/)。价格可能调整。
上表为第一期无上下文的估算。加入最多 540 字符的摘要和记忆后，保守估计每次输入
约 900–1600 token；沿用同一单价和 100–250 输出估算，每日 24 次约 $0.0094–$0.0187。
这不包含普通聊天、TTS、其他主动功能；没有真实账单或调用次数实测。

## 验证

Python 假模型覆盖世界状态过滤、格式/动作限额、各档位间隔与小时/每日上限、
忙碌/过期/关闭、并发和输入打断、无效格式与超时、昼夜动作限制、回执幂等和已有记忆开关；
完整回复 HTTP 路由与真实 llm_runtime 组合验证单次假调用、流式片段与无动作回退。
本地 HTTP 测试验证新接口沿用 Token/Origin 保护，并跑 world → think → poll → ACK。
Node 测试确认调试脚本默认不启动、不执行、不 ACK。
第一期原始验收 scripts/test-local.ps1：865 passed、3 skipped、1 warning，全部 Node、Python/JS 语法和秘密扫描通过；scripts/check_first_run_package.ps1 通过。本期未调用真实 DeepSeek，未做语音/动作/录像验收。

后端上下文与持久化增量：新增 32 项假模型/临时文件测试，覆盖摘要、无历史、现有记忆检索、
敏感内容过滤、送达回执、重启、跨天、损坏和不可写。完整门禁结果见 progress.md。
对话摘要仅缓存在服务内；重启后由现有聊天请求重新提供历史，不新增聊天记录存储。


## 修改文件

- 后端：新增 avatar_brain.py、avatar_brain_protocol.py、app_avatar_brain.py；接入 app.py、app_chat_route.py、llm_runtime.py；config.py 添加默认关闭的配置；memory.py、memory_store.py 复用并保留已确认事件的来源标记。
- 调试：web/avatar/avatarBrainDebug.js 与 web/index.html 单行接入，不修改渲染器和随机日常。
- 验证：两个 Python 测试文件、一个 Node 测试文件、scripts/run_node_tests.js 和 scripts/check_first_run_package.ps1。
- 文档状态：本报告、feature_list.json、progress.md、session-handoff.md 与上一份 handoff 的归档。
