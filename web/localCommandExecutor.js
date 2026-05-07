(function (root) {
  "use strict";

  function getRest(command) {
    return String(command?.text || "").slice(String(command?.alias || "").length).trim();
  }

  function append(deps, text, options) {
    if (typeof deps.appendMessage === "function") {
      deps.appendMessage("assistant", text, options);
    }
  }

  function createLocalCommandHandlers(depsInput = {}) {
    const deps = depsInput && typeof depsInput === "object" ? depsInput : {};
    return {
      mic_debug: async () => {
        append(deps, await deps.buildMicDebugReport(), { enableTranslation: false });
      },
      tts_debug: () => {
        append(deps, deps.buildTTSDebugReport(), { enableTranslation: false });
      },
      doctor: async () => {
        await deps.runDoctorAndAppendReport();
      },
      tts_debug_on: () => {
        deps.toggleTTSDebugPanel(true);
        append(deps, "TTS debug panel enabled.", { enableTranslation: false });
      },
      tts_debug_off: () => {
        deps.toggleTTSDebugPanel(false);
        append(deps, "TTS debug panel disabled.", { enableTranslation: false });
      },
      followup_status: () => {
        deps.toggleFollowupReadinessPanel(true);
        append(deps, deps.buildFollowupReadinessReport(), { enableTranslation: false });
      },
      translate_debug: () => {
        append(deps, deps.buildTranslateDebugReport(), { enableTranslation: false });
      },
      translate_debug_on: () => {
        deps.toggleTranslateDebugPanel(true);
        append(deps, "Translation debug panel enabled.", { enableTranslation: false });
      },
      translate_debug_off: () => {
        deps.toggleTranslateDebugPanel(false);
        append(deps, "Translation debug panel disabled.", { enableTranslation: false });
      },
      memory_debug: async () => {
        try {
          const snapshot = await deps.reloadMemoryDebugData();
          append(deps, deps.buildMemoryDebugReport(snapshot), { enableTranslation: false });
        } catch (err) {
          append(deps, `Memory debug unavailable: ${err.message || err}`, { enableTranslation: false });
        }
      },
      emotion_report: async () => {
        const report = deps.buildEmotionReportText();
        append(deps, report);
        const prosody = deps.buildSpeakProsody(report, "idle", false, "steady");
        await deps.speak(report, { force: true, interrupt: true, prosody });
      },
      voice_test: async () => {
        await deps.runVoiceTestAndAppendReport();
      },
      character_rehearsal: async () => {
        await deps.runCharacterRehearsalAndAppendReport();
      },
      character_tuning: () => {
        deps.runCharacterTuningAndAppendReport();
      },
      character_feedback_good: () => {
        deps.recordCharacterPerformanceFeedback("good");
      },
      character_feedback_bad: () => {
        deps.recordCharacterPerformanceFeedback("bad");
      },
      character_workflow: () => {
        deps.appendCharacterWorkflowGuide();
      },
      reminder_list: () => {
        const items = deps.listPendingReminders();
        if (!items.length) {
          append(deps, "\u5f53\u524d\u6ca1\u6709\u5f85\u63d0\u9192\u4e8b\u9879\u3002");
          return;
        }
        const lines = items.slice(0, 12).map((x) => `#${x.id} ${deps.formatReminderTime(x.dueAt)} ${x.text}`);
        append(deps, `\u5f85\u63d0\u9192\u4e8b\u9879\uff1a\n${lines.join("\n")}`);
      },
      reminder_cancel: (command) => {
        const m = getRest(command).match(/^(\d{1,8})$/);
        if (!m) {
          append(deps, "\u683c\u5f0f\uff1a/\u53d6\u6d88\u63d0\u9192 123");
          return;
        }
        const ok = deps.removeReminderById(Number(m[1]));
        append(deps, ok ? "\u5df2\u53d6\u6d88\u63d0\u9192\u3002" : "\u672a\u627e\u5230\u8be5\u63d0\u9192 ID\u3002");
      },
      reminder_add: (command) => {
        const m = getRest(command).match(/^(\S+)\s+(.+)$/);
        if (!m) {
          append(deps, "\u683c\u5f0f\u793a\u4f8b\uff1a/\u63d0\u9192 10m \u5f00\u4f1a  \u6216  /\u63d0\u9192 21:30 \u559d\u6c34");
          return;
        }
        const dueAt = deps.parseReminderWhen(m[1]);
        const remindText = String(m[2] || "").trim();
        if (!dueAt || !remindText) {
          append(deps, "\u63d0\u9192\u65f6\u95f4\u683c\u5f0f\u65e0\u6548\u3002\u652f\u6301 10m / 30s / 21:30 / 2026-04-12 09:00");
          return;
        }
        const id = deps.addReminder(remindText, dueAt);
        append(deps, `\u597d\u7684\uff0c\u5df2\u8bbe\u7f6e\u63d0\u9192 #${id}\uff08${deps.formatReminderTime(dueAt)}\uff09\uff1a${remindText}`);
      }
    };
  }

  const api = {
    createLocalCommandHandlers
  };

  root.TaffyLocalCommandExecutor = api;
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : window);
