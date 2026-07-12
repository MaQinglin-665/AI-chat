# Delivered-Turn Receipt Protocol

聊天接口支持一个可选的本地回执协议，用于让记忆、关系状态与角色会话状态只跟随用户已经看到的助手回复。

## Compatibility

这是能力协商，不是对现有 `/api/chat` 或 `/api/chat_stream` 的破坏性升级。

- 旧客户端不声明能力时，保持原有行为：后端在终端回复前尽力写入本地交互状态，响应中不含 `delivery_id`。
- 当前桌面客户端会在每个聊天请求中声明：

```json
{
  "client_capabilities": {
    "delivered_turn_receipt_v1": true
  }
}
```

只有声明该能力的请求会收到 `delivery_id`，并把助手侧持久化延迟到可见消息行完成后。

## Receipt-aware flow

1. `/api/chat` 的 JSON 响应或 `/api/chat_stream` 的最终 `done` 事件返回不透明的 `delivery_id`。
2. 客户端完成当前可见助手消息行后，向 `POST /api/chat/delivery_ack` 发送：

```json
{ "delivery_id": "opaque-receipt" }
```

3. 后端只会为同一回执执行一次提交。成功结果为：

```json
{ "ok": true, "status": "committed" }
```

4. 若客户端在收到响应后丢失了 ACK 响应，短期内重复 ACK 会收到：

```json
{ "ok": true, "status": "already_committed" }
```

这两个状态才表示已确认提交。`invalid`、`unknown`、`expired`、`evicted` 和 `commit_failed` 都不是成功，客户端不能把它们显示为已确认。

## Ordering and retry

- 当前桌面客户端仅把回执 ID 与重试调度元数据保存在会话存储中；不保存回复文本、历史、提示词、音频或 token。
- ACK 使用单飞行 FIFO 队列和有界退避；页面关闭时会再发一次小型 keepalive ACK。无法确认的回执不会影响已经显示的文本或语音体验。
- 后续 receipt-aware 聊天请求可附带最多 8 个 `pending_delivery_ids`。后端会先尝试提交这些已显示的旧回复，再规划新回复，以减少连续性状态的一回合滞后。
- 回执仅驻留在本地进程内，默认有效期为 5 分钟且队列有界。服务重启、超时或驱逐会选择“不写入”而不是假定用户已收到回复。

## Safety boundary

回执路由沿用现有本地 API 的 Origin 与 API token 校验。回执本身是随机不透明标识，不包含用户消息、模型回复、音频、桌面内容、配置路径或密钥。

