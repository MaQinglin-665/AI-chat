# Mao 严格对照基线

driver 与 mapping 是 main `9d09edc` 的原始字节，SHA256 记录在 provenance.json，不修改此基线来适配新实现。只含项目代码和参数映射，没有模型资源。

`test_live2d_mao_sequence.js` 始终逐帧比较完整参数调用及参数/部件快照。CI 不下载模型，执行资源无关协议对照；本机存在官方 `models_local/Mao/Mao.moc3` 时，额外在同一 Core 6 和 CubismModel 包装器上作真实 Mao 严格对照。没有浮点容差。
