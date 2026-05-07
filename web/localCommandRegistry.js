(function (root) {
  "use strict";

  const EXACT_COMMANDS = [
    { kind: "mic_debug", aliases: ["/micdebug"] },
    { kind: "tts_debug", aliases: ["/ttsdebug"] },
    { kind: "doctor", aliases: ["/doctor", "/自检"] },
    { kind: "tts_debug_on", aliases: ["/ttsdebug on"] },
    { kind: "tts_debug_off", aliases: ["/ttsdebug off"] },
    { kind: "followup_status", aliases: ["/followupstatus"] },
    { kind: "translate_debug", aliases: ["/translatedebug"] },
    { kind: "translate_debug_on", aliases: ["/translatedebug on"] },
    { kind: "translate_debug_off", aliases: ["/translatedebug off"] },
    { kind: "memory_debug", aliases: ["/memorydebug"] },
    { kind: "emotion_report", aliases: ["/情绪日报"] },
    { kind: "voice_test", aliases: ["/测试语音", "/testvoice"] },
    { kind: "character_rehearsal", aliases: ["/角色试演", "/roletest", "/rehearse"] },
    { kind: "character_tuning", aliases: ["/角色调优", "/tune", "/tuning", "/tunecue"] },
    { kind: "character_feedback_good", aliases: ["/表现不错", "/goodcue"] },
    { kind: "character_feedback_bad", aliases: ["/需要调整", "/badcue"] },
    { kind: "character_workflow", aliases: ["/角色流程", "/roleflow"] },
    { kind: "reminder_list", aliases: ["/提醒列表"] }
  ];

  const PREFIX_COMMANDS = [
    { kind: "reminder_cancel", prefix: "/取消提醒" },
    { kind: "reminder_add", prefix: "/提醒" }
  ];

  function normalizeCommandText(input) {
    return String(input || "").trim();
  }

  function normalizeComparableText(input) {
    return normalizeCommandText(input).toLowerCase();
  }

  function findExactCommand(text) {
    const normalized = normalizeCommandText(text);
    const comparable = normalizeComparableText(text);
    for (const command of EXACT_COMMANDS) {
      for (const alias of command.aliases) {
        const aliasText = normalizeCommandText(alias);
        if (aliasText === normalized || aliasText.toLowerCase() === comparable) {
          return {
            kind: command.kind,
            text: normalized,
            alias: aliasText,
            matchType: "exact"
          };
        }
      }
    }
    return null;
  }

  function findPrefixCommand(text) {
    const normalized = normalizeCommandText(text);
    for (const command of PREFIX_COMMANDS) {
      if (normalized.startsWith(command.prefix)) {
        return {
          kind: command.kind,
          text: normalized,
          alias: command.prefix,
          matchType: "prefix"
        };
      }
    }
    return null;
  }

  function matchLocalCommand(input) {
    const text = normalizeCommandText(input);
    if (!text.startsWith("/")) {
      return {
        kind: "",
        text,
        alias: "",
        matchType: "none"
      };
    }
    return findExactCommand(text) || findPrefixCommand(text) || {
      kind: "",
      text,
      alias: "",
      matchType: "unknown"
    };
  }

  const api = {
    EXACT_COMMANDS,
    PREFIX_COMMANDS,
    normalizeCommandText,
    matchLocalCommand
  };

  root.TaffyLocalCommandRegistry = api;
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : window);
