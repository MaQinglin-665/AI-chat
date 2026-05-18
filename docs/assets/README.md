# 演示素材说明（docs/assets）

网站首页默认优先展示当前界面预览：

- `preview-chat.png`：聊天窗口、语音、字幕、翻译与快捷操作预览
- `demo-overview.mp4`：48 秒公开 demo 视频，展示桌面角色、聊天窗口、TTS/字幕节奏和安全默认值说明
- `demo-overview-poster.png`：`demo-overview.mp4` 的网页 poster 图

旧版“对话与语音演示”模块曾读取以下 3 个视频文件：

- `demo-idle.mp4`：桌宠待机与跟随演示
- `demo-voice.mp4`：语音回复演示
- `demo-config.mp4`：配置中心操作演示

## 如何替换

1. 将你自己的录屏文件重命名为上述同名文件。
2. 覆盖到 `docs/assets/` 目录。
3. 刷新页面即可生效（建议 `Ctrl + F5` 强刷）。

## 推荐规格

- 分辨率：`1280x720` 或 `1920x1080`
- 时长：`6-20` 秒
- 编码：`H.264 (mp4)`
- 文件体积：单个建议不超过 `20MB`

`demo-idle.mp4`、`demo-voice.mp4`、`demo-config.mp4` 只作为旧版测试素材保留，不再在首页当作正式演示展示。

## 站点图标与分享图

- `favicon.svg`：浏览器标签页图标
- `preview-chat.png`：社交平台分享卡片默认封面（Open Graph / Twitter Card）
- `og-cover.png`：旧版分享图，保留兼容历史链接
