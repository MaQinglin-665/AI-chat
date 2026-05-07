(function (root) {
  "use strict";

  function formatDuration(ms) {
    const value = Number(ms);
    if (!Number.isFinite(value) || value < 0) {
      return "n/a";
    }
    return `${Math.round(value)}ms`;
  }

  function formatCheckLine(label, check) {
    const ok = check?.ok === true;
    const status = ok ? "正常" : "异常";
    const duration = formatDuration(check?.elapsedMs);
    const detail = String(check?.detail || "").trim();
    const error = String(check?.error || "").trim();
    const suffix = error || detail || "无更多信息";
    return `${label}：${status}，用时 ${duration}。${suffix}`;
  }

  function formatBytes(bytes) {
    const value = Number(bytes);
    if (!Number.isFinite(value) || value <= 0) {
      return "";
    }
    if (value < 1024) {
      return `${Math.round(value)} B`;
    }
    if (value < 1024 * 1024) {
      return `${Math.round(value / 1024)} KB`;
    }
    return `${(value / 1024 / 1024).toFixed(1)} MB`;
  }

  function addUniqueAdvice(items, text) {
    const normalized = String(text || "").trim();
    if (normalized && !items.includes(normalized)) {
      items.push(normalized);
    }
  }

  function buildAdvice(checks, context = {}) {
    const advice = [];
    const failed = Array.isArray(checks) ? checks.filter((check) => check?.ok !== true) : [];
    if (!failed.length) {
      addUniqueAdvice(advice, "核心链路都正常。可以继续测试正常对话和语音效果；如果角色味道还不对，下一步再调人设、回复长度和语音风格。");
    }
    for (const check of failed) {
      const label = String(check?.label || "");
      const message = `${check?.error || ""} ${check?.detail || ""}`.toLowerCase();
      if (message.includes("invalid api token") || message.includes("401")) {
        addUniqueAdvice(advice, "鉴权失败。先刷新或重启应用；如果还失败，检查 server.require_api_token 和本地 token 环境变量。");
        continue;
      }
      if (message.includes("timeout")) {
        addUniqueAdvice(advice, `${label}超时。先确认对应服务没有卡住，必要时重启这一层，然后再点一次链路自检。`);
        continue;
      }
      if (label.includes("LLM") || label.includes("聊天")) {
        addUniqueAdvice(advice, "聊天模型异常。先检查 LLM 地址、模型名、API key 和后端控制台日志，再继续调角色效果。");
        continue;
      }
      if (label.includes("TTS") || label.includes("语音")) {
        if (String(context.ttsProvider || "").toLowerCase() === "gpt_sovits") {
          addUniqueAdvice(advice, "GPT-SoVITS 异常。确认 GPT-SoVITS API 已启动，并且地址和端口与配置一致，然后再点一次链路自检。");
        } else {
          addUniqueAdvice(advice, "语音异常。检查当前音色和 TTS provider 是否可用。");
        }
        continue;
      }
      if (label.includes("后端")) {
        addUniqueAdvice(advice, "后端异常。重启 Python 服务，并检查 config.json / config.local.json 是否有语法或路径问题。");
        continue;
      }
      addUniqueAdvice(advice, `${label}异常。先修这一层，再点一次链路自检。`);
    }
    if (context.streamEnabled === false) {
      addUniqueAdvice(advice, "当前已关闭流式聊天，会直接走普通聊天请求。这是为了避开某些模型流式接口长时间不返回内容的问题。");
    }
    if (context.speakingEnabled === false) {
      addUniqueAdvice(advice, "界面里的语音开关是关闭状态，因此现在只能检查请求，不能判断实际播放效果。");
    }
    return advice;
  }

  function buildReport(input = {}) {
    const checks = Array.isArray(input.checks) ? input.checks : [];
    const runtimeCfg = input.runtimeConfig || {};
    const okCount = checks.filter((item) => item.ok === true).length;
    const allOk = okCount === checks.length;
    const streamEnabled = input.streamEnabled !== false;
    const streamLine = streamEnabled
      ? "聊天模式：流式聊天已开启。"
      : "聊天模式：流式聊天已关闭，当前直接走普通聊天请求。";
    const runtimeLine = runtimeCfg.enabled === true
      ? `角色接入：已开启；情绪/动作元信息${runtimeCfg.return_metadata === true ? "会返回" : "不返回"}；回复 cue ${runtimeCfg.auto_apply_reply_cue === true ? "会自动应用" : "不会自动应用"}。`
      : "角色接入：未开启。";
    const advice = buildAdvice(checks, {
      ttsProvider: input.ttsProvider || "",
      streamEnabled,
      speakingEnabled: input.speakingEnabled === true
    });

    return [
      allOk ? "链路自检完成：核心功能正常。" : `链路自检完成：${checks.length - okCount} 项需要处理。`,
      "",
      "检查结果",
      ...checks.map((check) => formatCheckLine(check.label, check)),
      "",
      "当前配置",
      `语音服务：${String(input.ttsProvider || "unknown")}`,
      streamLine,
      runtimeLine,
      "",
      "下一步建议",
      ...advice.map((item, index) => `${index + 1}. ${item}`)
    ].join("\n");
  }

  function buildChatFailureHint(err) {
    const message = String(err?.message || err || "").trim() || "未知错误";
    const lower = message.toLowerCase();
    const likelyLayer = lower.includes("tts")
      ? "TTS"
      : lower.includes("token") || lower.includes("401")
        ? "鉴权"
        : lower.includes("stream")
          ? "LLM 流式"
          : "LLM";
    return [
      `错误: ${message}`,
      "",
      `建议: 这次看起来可能卡在 ${likelyLayer} 链路。`,
      "你可以点「更多 → 链路自检」，或输入 /doctor，让我自动检查 LLM、TTS、配置和角色接入状态。"
    ].join("\n");
  }

  const api = {
    formatDuration,
    formatCheckLine,
    formatBytes,
    buildAdvice,
    buildReport,
    buildChatFailureHint
  };

  root.TaffyDoctorDiagnostics = api;

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
}(typeof globalThis !== "undefined" ? globalThis : window));
