(function (root) {
  "use strict";

  function createController(deps = {}) {
    const state = deps.state || {};
    const window = deps.windowObject || root;
    const navigatorObject = deps.navigatorObject || window.navigator || root.navigator || {};
    const performance = deps.performanceObject || window.performance || root.performance || { now: () => Date.now() };
    const authFetch = typeof deps.authFetch === "function" ? deps.authFetch : async () => { throw new Error("authFetch is not available"); };
    const debugPanelController = deps.debugPanelController || root.TaffyDebugPanelController || {};
    const doctorDiagnostics = deps.doctorDiagnostics || root.TaffyDoctorDiagnostics || {};
    const chatTranslationService = deps.chatTranslationService || root.TaffyChatTranslationService || {};
    const appendMessage = typeof deps.appendMessage === "function" ? deps.appendMessage : () => null;
    const setStatus = typeof deps.setStatus === "function" ? deps.setStatus : () => {};
    const isServerTTSProvider = typeof deps.isServerTTSProvider === "function" ? deps.isServerTTSProvider : () => false;
    const requestServerTTSBlob = typeof deps.requestServerTTSBlob === "function" ? deps.requestServerTTSBlob : async () => ({ size: 0 });
    const buildSpeakProsody = typeof deps.buildSpeakProsody === "function" ? deps.buildSpeakProsody : () => null;
    const createPerfTraceId = typeof deps.createPerfTraceId === "function" ? deps.createPerfTraceId : () => "";
    const buildTTSDebugReport = typeof deps.buildTTSDebugReport === "function" ? deps.buildTTSDebugReport : () => "TTS debug:\nrecentEvents=none";
    const isTranslationCircuitOpen = typeof deps.isTranslationCircuitOpen === "function" ? deps.isTranslationCircuitOpen : () => false;
    const chatTranslateTimeoutMs = Number(deps.chatTranslateTimeoutMs || 60000);
    const grayTrial = deps.grayTrial || {};

    function sanitizeTTSDebugText(text, maxLen = 96) {
      const safe = String(text || "").split(/\s+/).filter(Boolean).join(" ");
      if (safe.length <= maxLen) {
        return safe;
      }
      return `${safe.slice(0, Math.max(0, maxLen - 1))}...`;
    }

    function recordTTSDebugEvent(stage, payload = {}) {
      const now = performance.now();
      const entry = {
        seq: ++state.ttsDebugSeq,
        atMs: Math.round(now),
        ageMs: 0,
        stage: String(stage || "event"),
        traceId: String(payload.traceId || state.ttsDebugCurrentTraceId || state.activePerfTraceId || ""),
        sessionId: Number(payload.sessionId || state.ttsDebugCurrentSession || 0),
        segmentId: Number(payload.segmentId || state.ttsDebugCurrentSegmentId || 0),
        text: sanitizeTTSDebugText(payload.text || ""),
        queueLen: Array.isArray(state.streamSpeakQueue) ? state.streamSpeakQueue.length : 0,
        blobBytes: Number(payload.blobBytes || 0),
        durationMs: Number(payload.durationMs || -1),
        currentMs: Number(payload.currentMs || 0),
        result: String(payload.result || ""),
        error: String(payload.error || "")
      };
      state.ttsDebugLastEventAt = now;
      if (entry.text) {
        state.ttsDebugCurrentText = entry.text;
      }
      if (entry.traceId) {
        state.ttsDebugCurrentTraceId = entry.traceId;
      }
      if (entry.sessionId) {
        state.ttsDebugCurrentSession = entry.sessionId;
      }
      if (entry.segmentId) {
        state.ttsDebugCurrentSegmentId = entry.segmentId;
      }
      if (entry.blobBytes > 0) {
        state.ttsDebugCurrentBlobBytes = entry.blobBytes;
      }
      if (entry.durationMs >= 0) {
        state.ttsDebugAudioDurationMs = entry.durationMs;
      }
      if (entry.currentMs >= 0) {
        state.ttsDebugAudioCurrentMs = entry.currentMs;
      }
      if (entry.result) {
        state.ttsDebugLastResult = entry.result;
      }
      if (entry.error) {
        state.ttsDebugLastError = entry.error;
      }
      state.ttsDebugEvents.push(entry);
      if (state.ttsDebugEvents.length > 80) {
        state.ttsDebugEvents.splice(0, state.ttsDebugEvents.length - 80);
      }
      updateTTSDebugPanel();
      return entry;
    }

    function recordTTSAudioEvent(stage, audio, debugContext = {}, extra = {}) {
      recordTTSDebugEvent(stage, {
        ...debugContext,
        ...extra,
        durationMs: Number.isFinite(Number(audio?.duration)) && Number(audio.duration) > 0
          ? Math.round(Number(audio.duration) * 1000)
          : Number(extra.durationMs ?? -1),
        currentMs: Math.round(Number(audio?.currentTime || 0) * 1000)
      });
    }

    function updateTTSDebugPanel() {
      return typeof debugPanelController.updateDebugPanel === "function"
        ? debugPanelController.updateDebugPanel({
          state,
          documentObject: window.document,
          windowObject: window,
          id: "tts-debug-panel",
          title: "TTS Debug",
          width: 420,
          visibleKey: "ttsDebugVisible",
          panelKey: "ttsDebugPanel",
          bodyKey: "ttsDebugBody",
          timerKey: "ttsDebugRefreshTimer",
          buildReport: buildTTSDebugReport,
          onHide: () => {
            state.ttsDebugVisible = false;
            updateTTSDebugPanel();
          }
        })
        : null;
    }

    function toggleTTSDebugPanel(force = null) {
      return typeof debugPanelController.toggleDebugPanel === "function"
        ? debugPanelController.toggleDebugPanel({
          state,
          documentObject: window.document,
          windowObject: window,
          id: "tts-debug-panel",
          title: "TTS Debug",
          width: 420,
          visibleKey: "ttsDebugVisible",
          panelKey: "ttsDebugPanel",
          bodyKey: "ttsDebugBody",
          timerKey: "ttsDebugRefreshTimer",
          buildReport: buildTTSDebugReport,
          onHide: () => {
            state.ttsDebugVisible = false;
            updateTTSDebugPanel();
          }
        }, force)
        : false;
    }

    function sanitizeTranslateDebugText(text, maxLen = 96) {
      return sanitizeTTSDebugText(text, maxLen);
    }

    function recordTranslateDebugEvent(stage, payload = {}) {
      const now = performance.now();
      const entry = {
        seq: ++state.translateDebugSeq,
        atMs: Math.round(now),
        stage: String(stage || "event"),
        traceId: String(payload.traceId || state.translateDebugCurrentTraceId || ""),
        text: sanitizeTranslateDebugText(payload.text || ""),
        sourceChars: Number(payload.sourceChars || 0),
        translatedChars: Number(payload.translatedChars || 0),
        elapsedMs: Number(payload.elapsedMs || -1),
        status: Number(payload.status || 0),
        degraded: payload.degraded === true,
        fallback: payload.fallback === true,
        cache: String(payload.cache || ""),
        result: String(payload.result || ""),
        error: String(payload.error || "")
      };
      state.translateDebugLastEventAt = now;
      if (entry.traceId) {
        state.translateDebugCurrentTraceId = entry.traceId;
      }
      if (entry.text) {
        state.translateDebugCurrentText = entry.text;
      }
      if (entry.result) {
        state.translateDebugLastResult = entry.result;
      }
      if (entry.error) {
        state.translateDebugLastError = entry.error;
      }
      state.translateDebugEvents.push(entry);
      if (state.translateDebugEvents.length > 80) {
        state.translateDebugEvents.splice(0, state.translateDebugEvents.length - 80);
      }
      updateTranslateDebugPanel();
      return entry;
    }

    function getTranslateDebugSnapshot() {
      const serviceDebug = chatTranslationService._debug || {};
      const circuitState = serviceDebug.translationCircuitState || {};
      return {
        timeoutMs: chatTranslateTimeoutMs,
        cacheSize: Number(serviceDebug.chatTranslationCache?.size || 0),
        inFlight: Number(serviceDebug.translationInFlight?.size || 0),
        circuitOpen: isTranslationCircuitOpen(),
        circuitFailures: Number(circuitState.failures || 0),
        circuitCooldownMs: Math.max(0, Math.round(Number(circuitState.cooldownUntil || 0) - Date.now())),
        lastTraceId: state.translateDebugCurrentTraceId || "",
        lastText: state.translateDebugCurrentText || "",
        lastResult: state.translateDebugLastResult || "",
        lastError: state.translateDebugLastError || "",
        events: state.translateDebugEvents.slice()
      };
    }

    function buildTranslateDebugReport() {
      return typeof root.TaffyTranslateDebugReport?.buildReport === "function"
        ? root.TaffyTranslateDebugReport.buildReport(getTranslateDebugSnapshot(), performance.now())
        : "Translation debug:\nrecentEvents=none";
    }

    function updateTranslateDebugPanel() {
      return typeof debugPanelController.updateDebugPanel === "function"
        ? debugPanelController.updateDebugPanel({
          state,
          documentObject: window.document,
          windowObject: window,
          id: "translate-debug-panel",
          title: "Translation Debug",
          width: 430,
          visibleKey: "translateDebugVisible",
          panelKey: "translateDebugPanel",
          bodyKey: "translateDebugBody",
          timerKey: "translateDebugRefreshTimer",
          buildReport: buildTranslateDebugReport,
          onHide: () => {
            state.translateDebugVisible = false;
            updateTranslateDebugPanel();
          }
        })
        : null;
    }

    function toggleTranslateDebugPanel(force = null) {
      return typeof debugPanelController.toggleDebugPanel === "function"
        ? debugPanelController.toggleDebugPanel({
          state,
          documentObject: window.document,
          windowObject: window,
          id: "translate-debug-panel",
          title: "Translation Debug",
          width: 430,
          visibleKey: "translateDebugVisible",
          panelKey: "translateDebugPanel",
          bodyKey: "translateDebugBody",
          timerKey: "translateDebugRefreshTimer",
          buildReport: buildTranslateDebugReport,
          onHide: () => {
            state.translateDebugVisible = false;
            updateTranslateDebugPanel();
          }
        }, force)
        : false;
    }

    function formatDoctorBytes(bytes) {
      return typeof doctorDiagnostics.formatBytes === "function" ? doctorDiagnostics.formatBytes(bytes) : "";
    }

    async function runDoctorTimed(label, fn) {
      const started = performance.now();
      try {
        const result = await fn();
        return {
          label,
          ok: result?.ok !== false,
          elapsedMs: performance.now() - started,
          detail: result?.detail || "",
          error: ""
        };
      } catch (err) {
        return {
          label,
          ok: false,
          elapsedMs: performance.now() - started,
          detail: "",
          error: String(err?.message || err || "")
        };
      }
    }

    async function runDoctorJsonFetch(url, init = {}, timeoutMs = 12000) {
      const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
      let timer = 0;
      if (controller) {
        timer = window.setTimeout(() => controller.abort(), Math.max(1000, Math.round(Number(timeoutMs) || 12000)));
      }
      try {
        const resp = await authFetch(url, {
          ...init,
          signal: controller ? controller.signal : init.signal
        });
        let data = {};
        try {
          data = await resp.json();
        } catch (_) {
          data = {};
        }
        if (!resp.ok) {
          throw new Error(data?.error || `HTTP ${resp.status}`);
        }
        return data;
      } catch (err) {
        if (err?.name === "AbortError") {
          throw new Error(`timeout after ${Math.round(Number(timeoutMs) || 12000)}ms`);
        }
        throw err;
      } finally {
        if (timer) {
          window.clearTimeout(timer);
        }
      }
    }

    async function runDoctorDiagnostics() {
      const cfg = state.config || {};
      const conversationCfg = cfg.conversation_mode || {};
      const runtimeCfg = cfg.character_runtime || {};
      const ttsCfg = cfg.tts || {};
      const checks = [];

      checks.push(await runDoctorTimed("后端健康", async () => {
        const payload = await runDoctorJsonFetch("/api/health", { cache: "no-store" }, 8000);
        return {
          ok: payload?.ok === true,
          detail: payload?.ok === true ? "本地服务响应正常。" : "本地服务状态异常。"
        };
      }));

      checks.push(await runDoctorTimed("聊天模型", async () => {
        const payload = await runDoctorJsonFetch(
          "/api/chat",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              message: "Reply with OK only.",
              history: [],
              auto: false,
              force_tools: false
            })
          },
          22000
        );
        const reply = String(payload?.reply || "").trim();
        return {
          ok: !!reply,
          detail: reply ? "模型已经返回文本。" : "模型没有返回文本。"
        };
      }));

      checks.push(await runDoctorTimed("语音服务", async () => {
        if (!state.speakingEnabled) {
          return { ok: true, detail: "语音开关关闭，已跳过真实语音请求。" };
        }
        if (!isServerTTSProvider(state.ttsProvider)) {
          const available = typeof window.speechSynthesis !== "undefined";
          return {
            ok: available,
            detail: available ? "浏览器语音可用。" : "浏览器语音不可用。"
          };
        }
        const sample = "Doctor voice check.";
        const blob = await requestServerTTSBlob(
          sample,
          buildSpeakProsody(sample, "idle", false, "steady"),
          {
            timeoutMs: Math.min(22000, Math.max(2500, Number(state.ttsServerRequestTimeoutMs) || 14000)),
            traceId: createPerfTraceId("doctor-tts")
          }
        );
        const bytes = Number(blob?.size || 0);
        return {
          ok: bytes > 0,
          detail: bytes > 0
            ? `${state.ttsProvider} 已返回音频（约 ${formatDoctorBytes(bytes)}）。`
            : `${state.ttsProvider} 没有返回有效音频。`
        };
      }));

      return doctorDiagnostics.buildReport({
        checks,
        runtimeConfig: runtimeCfg,
        ttsProvider: ttsCfg.provider || state.ttsProvider || "",
        streamEnabled: conversationCfg.chat_stream_enabled !== false,
        speakingEnabled: state.speakingEnabled === true
      });
    }

    async function runDoctorAndAppendReport() {
      appendMessage("assistant", "正在自检聊天、语音和角色接入状态...", { enableTranslation: false });
      setStatus("链路自检中...");
      const row = appendMessage("assistant", await runDoctorDiagnostics(), { enableTranslation: false });
      row?.classList?.add("doctor-report");
    }

    function buildChatFailureDoctorHint(err) {
      return typeof doctorDiagnostics.buildChatFailureHint === "function"
        ? doctorDiagnostics.buildChatFailureHint(err)
        : `错误: ${err?.message || err || "未知错误"}`;
    }

    async function buildMicDebugReport() {
      const tracks =
        state.localAsrStream && typeof state.localAsrStream.getAudioTracks === "function"
          ? state.localAsrStream.getAudioTracks()
          : [];
      const ctx = state.localAsrContext;
      const now = performance.now();
      const lastFrameAt = Number(state.localAsrLastFrameAt) || 0;
      const frameAge = lastFrameAt > 0 ? Math.round(now - lastFrameAt) : -1;
      const peakRms = Number(state.localAsrPeakRms) || 0;
      const lines = [
        "Mic debug:",
        `mode=${state.asrMode}`,
        `micOpen=${state.micOpen}`,
        `localRunning=${state.localAsrRunning}`,
        `context=${ctx ? ctx.state : "none"}`,
        `sampleRate=${ctx ? ctx.sampleRate : "n/a"}`,
        `lastFrameAgeMs=${frameAge}`,
        `peakRms=${peakRms.toFixed(5)}`,
        `noiseFloor=${(Number(state.localAsrNoiseFloor) || 0).toFixed(5)}`,
        `threshold=${(Number(state.localAsrSpeechThreshold) || 0).toFixed(5)}`,
        `selectedInput=${state.localAsrInputDeviceLabel || "(unknown)"}`,
        `selectedInputMuted=${state.localAsrInputMuted}`
      ];
      if (Array.isArray(state.localAsrInputDeviceCandidates) && state.localAsrInputDeviceCandidates.length) {
        lines.push(`knownInputs=${state.localAsrInputDeviceCandidates.join(" | ")}`);
      }
      if (tracks.length) {
        for (const track of tracks) {
          const settings = typeof track.getSettings === "function" ? track.getSettings() || {} : {};
          lines.push(
            `track=${track.label || "(no label)"} enabled=${track.enabled} muted=${track.muted} ready=${track.readyState} channel=${settings.channelCount || "n/a"} device=${settings.deviceId || "default"}`
          );
        }
      } else {
        lines.push("track=none");
      }
      try {
        const devices =
          navigatorObject.mediaDevices && typeof navigatorObject.mediaDevices.enumerateDevices === "function"
            ? await navigatorObject.mediaDevices.enumerateDevices()
            : [];
        const inputs = devices.filter((device) => device.kind === "audioinput");
        if (inputs.length) {
          lines.push(`audioInputs=${inputs.map((device) => device.label || "(hidden label)").join(" | ")}`);
        } else {
          lines.push("audioInputs=none");
        }
      } catch (err) {
        lines.push(`audioInputsError=${err?.message || String(err)}`);
      }
      const hasMutedTrack = tracks.some((track) => !!track?.muted);
      if (state.localAsrInputMuted || hasMutedTrack) {
        lines.push("diagnosis=mic_track_muted");
        lines.push(
          "next=检查 Windows 设置 > 系统 > 声音 > 输入，确认当前麦克风未静音且测试条会动；再检查 隐私和安全性 > 麦克风 > 允许桌面应用"
        );
      } else if (state.localAsrRunning && peakRms <= 0) {
        lines.push("diagnosis=no_audio_level");
        lines.push("next=应用正在收音但音量为 0，请确认系统输入设备选中了真实麦克风");
      }
      return lines.join("\n");
    }

    function installTTSDebugBridge() {
      if (typeof window === "undefined") {
        return null;
      }
      const bridge = {
        snapshot: grayTrial.getTTSDebugSnapshot,
        report: buildTTSDebugReport,
        events: () => state.ttsDebugEvents.slice(),
        togglePanel: (force = null) => toggleTTSDebugPanel(force),
        grayAutoFollowupTrialPreflight: grayTrial.buildGrayAutoFollowupTrialPreflight,
        grayAutoFollowupTrialEvents: grayTrial.buildGrayAutoFollowupTrialEventSummary,
        grayAutoFollowupTrialSession: () => ({
          armed: state.grayAutoTrialArmed === true,
          polling: state.grayAutoTrialPolling === true,
          count: Number(state.grayAutoTrialSessionTriggerCount) || 0,
          max: Number(state.grayAutoTrialMaxTriggersPerSession) || 0
        }),
        armGrayAutoFollowupTrial: grayTrial.armGrayAutoTrialSession,
        stopGrayAutoFollowupTrial: grayTrial.stopGrayAutoTrialSession,
        disarmGrayAutoFollowupTrial: grayTrial.disarmGrayAutoTrialSession,
        resetGrayAutoFollowupTrialSession: grayTrial.resetGrayAutoTrialSessionTriggerCount,
        grayAutoFollowupTrialAuditSummary: grayTrial.buildGrayAutoTrialAuditSummary,
        grayAutoFollowupTrialPreRunChecklist: grayTrial.buildGrayAutoTrialPreRunChecklist,
        grayAutoFollowupTrialTimeline: grayTrial.buildGrayAutoTrialTimeline,
        grayAutoFollowupTrialOutcome: grayTrial.buildGrayAutoTrialOutcome,
        grayAutoFollowupTrialGoNoGoDecision: grayTrial.buildGrayAutoTrialGoNoGoDecision,
        grayAutoFollowupTrialSignoffPackage: grayTrial.buildGrayAutoTrialSignoffPackage,
        followupReadiness: grayTrial.buildFollowupReadinessReport
      };
      window.__AI_CHAT_DEBUG_TTS__ = bridge;
      return bridge;
    }

    function installTranslateDebugBridge() {
      if (typeof window === "undefined") {
        return null;
      }
      const bridge = {
        snapshot: () => getTranslateDebugSnapshot(),
        report: () => buildTranslateDebugReport(),
        events: () => state.translateDebugEvents.slice(),
        togglePanel: (force = null) => toggleTranslateDebugPanel(force)
      };
      window.__AI_CHAT_DEBUG_TRANSLATE__ = bridge;
      return bridge;
    }

    return {
      sanitizeTTSDebugText,
      recordTTSDebugEvent,
      recordTTSAudioEvent,
      updateTTSDebugPanel,
      toggleTTSDebugPanel,
      sanitizeTranslateDebugText,
      recordTranslateDebugEvent,
      getTranslateDebugSnapshot,
      buildTranslateDebugReport,
      updateTranslateDebugPanel,
      toggleTranslateDebugPanel,
      formatDoctorBytes,
      runDoctorTimed,
      runDoctorJsonFetch,
      runDoctorDiagnostics,
      runDoctorAndAppendReport,
      buildChatFailureDoctorHint,
      buildMicDebugReport,
      installTTSDebugBridge,
      installTranslateDebugBridge
    };
  }

  const api = { createController };
  root.TaffyDiagnosticsRuntimeController = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
