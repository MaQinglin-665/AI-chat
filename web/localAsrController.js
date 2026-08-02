(function (root) {
  "use strict";

  const LOCAL_ASR_PRE_SPEECH_MS = 260;
  const LOCAL_ASR_MANUAL_CAPTURE_MAX_MS = 30000;
  const MAX_PENDING_LOCAL_ASR_UTTERANCES = 3;
  const FULL_DUPLEX_FINAL_MERGE_MS = 520;
  const FULL_DUPLEX_ACTIVE_SPEECH_HOLD_MS = 11000;
  const RECENT_BACKCHANNEL_TTL_MS = 12000;
  const NO_BARGE_IN_VOICE_QUEUE_RETRY_MS = 280;
  const NO_BARGE_IN_VOICE_QUEUE_MAX_WAIT_MS = 30000;
  const ASR_CONTEXT_TERMS = [
    { term: "ASR", aliases: ["a s r", "as r", "语音识别"] },
    { term: "LLM", aliases: ["l l m", "ll m", "大模型"] },
    { term: "TTS", aliases: ["t t s", "tt s", "语音合成"] },
    { term: "Live2D", aliases: ["live 2d", "live 2 d", "live to d", "live two d", "莱夫2d", "来福2d"] },
    { term: "GPT-SoVITS", aliases: ["gpt sovits", "gpt so vits", "gpt so vit s", "gpt so bits", "gpt sovit"] },
    { term: "Vosk", aliases: ["vosk", "沃斯克"] },
    { term: "Ollama", aliases: ["ollama", "欧拉马", "奥拉马"] },
    { term: "Qwen", aliases: ["qwen", "通义千问", "千问"] },
    { term: "DashScope", aliases: ["dash scope", "dashscope", "灵积"] },
    { term: "Neuro-sama", aliases: ["neuro sama", "neuro-sama", "neurosama"] }
  ];

  function createController(deps = {}) {
    const state = deps.state || {};
    const ui = deps.ui || {};
    const window = deps.windowObject || root;
    const navigator = deps.navigatorObject || root.navigator || {};
    const performance = deps.performanceObject || root.performance || { now: () => Date.now() };
    const authFetch = deps.authFetch;
    const setStatus = typeof deps.setStatus === "function" ? deps.setStatus : () => {};
    const clampNumber = typeof deps.clampNumber === "function" ? deps.clampNumber : (v, min, max) => Math.max(min, Math.min(max, Number(v) || 0));
    const applyAsrHotwordCorrections = typeof deps.applyAsrHotwordCorrections === "function" ? deps.applyAsrHotwordCorrections : (text) => String(text || "").trim();
    const requestAssistantReply = typeof deps.requestAssistantReply === "function" ? deps.requestAssistantReply : async () => false;
    const handleUserSpeechStart = typeof deps.handleUserSpeechStart === "function" ? deps.handleUserSpeechStart : () => false;
    const scheduleWakeWordStart = typeof deps.scheduleWakeWordStart === "function" ? deps.scheduleWakeWordStart : () => {};
    const stopWakeWordListener = typeof deps.stopWakeWordListener === "function" ? deps.stopWakeWordListener : () => {};
    const setupWakeWordRecognition = typeof deps.setupWakeWordRecognition === "function" ? deps.setupWakeWordRecognition : () => {};
    const btoa = window.btoa ? window.btoa.bind(window) : root.btoa;
    const AbortController = window.AbortController || root.AbortController;
    const Float32Array = window.Float32Array || root.Float32Array;
    const Int16Array = window.Int16Array || root.Int16Array;
    const Uint8Array = window.Uint8Array || root.Uint8Array;
    const sileroVadAdapter = (
      deps.sileroVadAdapter
      || root.TaffySileroVadAdapter
    )?.createController?.({
      state,
      windowObject: window,
      documentObject: deps.documentObject || root.document,
      setStatus
    }) || null;

    function getBrowserRecognitionLanguage() {
      // Keep browser fallback deterministic. Automatic Chinese/English selection
      // belongs to the local dual-Vosk route, not two simultaneous cloud listeners.
      return String(state.asrInputLanguageMode || "auto").trim().toLowerCase() === "en"
        ? "en-US"
        : "zh-CN";
    }

    function clearListeningPresenceReleaseTimer() {
      if (!state.listeningPresenceReleaseTimer) {
        return;
      }
      try {
        (window.clearTimeout || root.clearTimeout || clearTimeout)(state.listeningPresenceReleaseTimer);
      } catch (_) {
        // ignore timer cleanup failures
      }
      state.listeningPresenceReleaseTimer = 0;
    }

    function setListeningPresence(phase = "idle", opts = {}) {
      const requestedPhase = ["idle", "armed", "hearing", "release"].includes(String(phase || "").toLowerCase())
        ? String(phase || "idle").toLowerCase()
        : "idle";
      const sessionId = Number(opts.sessionId ?? opts.session_id ?? state.micSession ?? 0);
      const force = opts.force === true;
      if (!force && sessionId !== Number(state.micSession || 0)) {
        return false;
      }
      const canListen = state.micOpen === true && Number(state.micSuspendDepth || 0) <= 0;
      const nextPhase = requestedPhase !== "idle" && canListen ? requestedPhase : "idle";
      const nextSession = nextPhase === "idle" ? 0 : sessionId;
      const nextLevel = nextPhase === "hearing"
        ? clampNumber(Number(opts.level), 0, 1)
        : 0;
      const previousPhase = String(state.listeningPresencePhase || "idle");
      const previousSession = Number(state.listeningPresenceSession || 0);
      const previousLevel = Number(state.listeningPresenceLevel || 0);
      const changed = previousPhase !== nextPhase
        || previousSession !== nextSession
        || Math.abs(previousLevel - nextLevel) >= 0.025;
      if (!changed) {
        return false;
      }
      if (nextPhase !== "release") {
        clearListeningPresenceReleaseTimer();
      }
      state.listeningPresencePhase = nextPhase;
      state.listeningPresenceSession = nextSession;
      state.listeningPresenceLevel = nextLevel;
      state.listeningPresenceRevision = Math.max(0, Number(state.listeningPresenceRevision || 0)) + 1;
      state.listeningPresenceUpdatedAt = Date.now();
      if (nextPhase === "release") {
        const releaseRevision = Number(state.listeningPresenceRevision || 0);
        const releaseSession = nextSession;
        clearListeningPresenceReleaseTimer();
        state.listeningPresenceReleaseTimer = window.setTimeout(() => {
          state.listeningPresenceReleaseTimer = 0;
          if (
            Number(state.micSession || 0) !== releaseSession
            || Number(state.listeningPresenceSession || 0) !== releaseSession
            || Number(state.listeningPresenceRevision || 0) !== releaseRevision
            || String(state.listeningPresencePhase || "") !== "release"
            || state.micOpen !== true
            || Number(state.micSuspendDepth || 0) > 0
          ) {
            return;
          }
          setListeningPresence("armed", { sessionId: releaseSession });
        }, Math.max(180, Math.min(420, Number(opts.releaseMs) || 280)));
      }
      return true;
    }

    function clearListeningPresence(opts = {}) {
      clearListeningPresenceReleaseTimer();
      return setListeningPresence("idle", { ...opts, force: true, sessionId: 0 });
    }

    function clearMicQueueRetryTimer() {
      const timer = state.micQueueRetryTimer;
      if (!timer) {
        return;
      }
      try {
        (window.clearTimeout || root.clearTimeout || clearTimeout)(timer);
      } catch (_) {
        // ignore timer cleanup failures
      }
      state.micQueueRetryTimer = 0;
    }

    function updateMicMeter(levelOverride = null) {
      const hasLegacyMeter = Boolean(ui.micMeterWrap && ui.micMeterFill && ui.micMeterText);
      const hasStageMeter = Boolean(
        ui.stageVoiceFeedback && ui.stageVoiceFeedbackText && ui.stageVoiceMeterFill
      );
      if (!hasLegacyMeter && !hasStageMeter) {
        return;
      }
      if (!state.showMicMeter && hasLegacyMeter) {
        ui.micMeterWrap.style.display = "none";
      } else if (hasLegacyMeter) {
        ui.micMeterWrap.style.display = "flex";
      }

      let level = levelOverride;
      if (level == null || !Number.isFinite(Number(level))) {
        level = state.micLevel;
      }
      const v = Math.max(0, Math.min(1, Number(level) || 0));
      // `micLevel` is already a smoothed 0-1 signal estimate. Keep a very low
      // visual floor so quiet laptop microphone arrays still show activity.
      const visualFloor = 0.0015;
      const visualCeiling = 0.12;
      const visualLevel = v <= visualFloor
        ? 0
        : Math.min(1, (v - visualFloor) / (visualCeiling - visualFloor));
      const rawPct = Math.round(visualLevel * 100);
      const eased = Math.pow(visualLevel, 0.72);
      const displayPct = state.micOpen && state.micSuspendDepth <= 0 ? Math.round(eased * 100) : 0;
      const inputDevice = String(state.localAsrInputDeviceLabel || "").trim();
      const deviceSuffix = inputDevice ? ` · ${inputDevice.slice(0, 28)}` : "";
      let meterText = "";
      let stageText = "";
      let stageState = "idle";
      const warmupPending = (
        state.asrMode === "local_vosk"
        && state.localAsrWarmupRequired === true
        && state.localAsrWarmupStatus !== "ready"
      );
      if (warmupPending) {
        meterText = "初始化";
        stageText = state.localAsrWarmupStatus === "error"
          ? "语音初始化失败，请查看诊断信息"
          : "语音引擎初始化中…";
        stageState = state.localAsrWarmupStatus === "error" ? "error" : "warming";
      } else if (state.stageVoiceFeedbackMessage) {
        meterText = "无结果";
        stageText = state.stageVoiceFeedbackMessage;
        stageState = "error";
      } else if (state.stageVoiceRuntimeWarning) {
        meterText = "采音异常";
        stageText = `${state.stageVoiceRuntimeWarning}${deviceSuffix}`;
        stageState = "error";
      } else if (state.localAsrSending) {
        meterText = "识别中";
        stageText = "正在识别…";
        stageState = "processing";
      } else if (!state.micOpen) {
        meterText = "未开麦";
        stageText = "点击麦克风开始说话";
      } else if (state.micSuspendDepth > 0) {
        meterText = "暂停";
        stageText = "麦克风已暂停";
      } else if (state.asrMode === "local_vosk" && state.localAsrInputMuted) {
        meterText = "系统静音";
        stageText = `系统没有向应用提供麦克风声音${deviceSuffix}`;
        stageState = "error";
      } else if (rawPct < 8) {
        meterText = "静音";
        stageText = "聆听中";
        stageState = "listening";
      } else if (rawPct < 28) {
        meterText = "低";
        stageText = "音量偏低";
        stageState = "hearing";
      } else if (rawPct < 60) {
        meterText = "中";
        stageText = "聆听中";
        stageState = "hearing";
      } else {
        meterText = "高";
        stageText = "听清楚了";
        stageState = "hearing";
      }
      if (hasLegacyMeter) {
        ui.micMeterFill.style.width = `${displayPct}%`;
        ui.micMeterFill.style.opacity = displayPct > 0 ? "1" : "0";
        ui.micMeterText.textContent = meterText;
      }
      if (hasStageMeter) {
        ui.stageVoiceFeedback.hidden = state.micOpen !== true;
        ui.stageVoiceFeedback.dataset.state = stageState;
        ui.stageVoiceFeedbackText.textContent = stageText;
        ui.stageVoiceFeedback.title = inputDevice
          ? `当前输入设备: ${inputDevice}`
          : stageText;
        if (ui.stageVoiceLevelValue) {
          ui.stageVoiceLevelValue.textContent = stageState === "error" ? "!" : `${rawPct}%`;
        }
        const bars = ui.stageVoiceMeterFill.querySelectorAll?.("i") || [];
        const profiles = [0.48, 0.82, 0.64, 1, 0.72, 0.9, 0.54];
        const phase = Number(performance.now?.() || Date.now()) / 105;
        bars.forEach((bar, index) => {
          const motion = 0.76 + Math.sin(phase + index * 1.17) * 0.24;
          const height = 4 + (displayPct / 100) * 20 * profiles[index] * motion;
          bar.style.height = `${Math.max(4, height).toFixed(1)}px`;
        });
      }
    }

    function showEmptyTranscriptionFeedback() {
      state.stageVoiceFeedbackMessage = "没有识别到文字，请检查音量条后再说一次";
      setStatus("没有识别到文字，请检查麦克风输入");
      updateMicMeter(0);
    }

    function clearStageVoiceFeedbackMessage() {
      if (!state.stageVoiceFeedbackMessage) {
        return;
      }
      state.stageVoiceFeedbackMessage = "";
      updateMicMeter();
    }

    function updateMicButton() {
      if (!ui.micBtn) {
        return;
      }
      const setMicButtonLabel = (label) => {
        const labelNode = ui.micBtn.querySelector?.(".mic-state-label");
        if (labelNode) labelNode.textContent = label;
        else ui.micBtn.textContent = label;
        ui.micBtn.setAttribute?.("aria-label", label);
        ui.micBtn.setAttribute?.("title", label);
      };
      const micAvailable = state.recognitionAvailable || state.localAsrAvailable;
      const warmupPending = (
        state.asrMode === "local_vosk"
        && state.localAsrWarmupRequired === true
        && state.localAsrWarmupStatus !== "ready"
      );
      ui.micBtn.setAttribute?.("aria-pressed", state.micOpen ? "true" : "false");
      ui.micBtn.setAttribute?.(
        "aria-busy",
        state.micToggleBusy || warmupPending ? "true" : "false"
      );
      if (!micAvailable) {
        ui.micBtn.disabled = true;
        setMicButtonLabel("语音输入不可用");
        updateMicMeter(0);
        return;
      }
      if (warmupPending) {
        ui.micBtn.disabled = true;
        setMicButtonLabel(
          state.localAsrWarmupStatus === "error"
            ? "语音初始化失败"
            : "语音初始化中"
        );
        updateMicMeter(0);
        return;
      }
      ui.micBtn.disabled = false;
      if (!state.micOpen) {
        setMicButtonLabel("开麦: 关");
        updateMicMeter(0);
        return;
      }
      if (state.micSuspendDepth > 0) {
        setMicButtonLabel("开麦: 暂停");
        updateMicMeter(0);
        return;
      }
      if (state.asrMode === "local_vosk") {
        setMicButtonLabel(
          state.localAsrRunning && state.localAsrInputMuted
            ? "开麦: 静音"
            : state.localAsrRunning
              ? "开麦: 开"
              : "开麦: 连接中"
        );
        updateMicMeter();
        return;
      }
      setMicButtonLabel(state.recognitionActive ? "开麦: 开" : "开麦: 连接中");
      updateMicMeter();
    }

    function clearLocalAsrWarmupTimer() {
      if (!state.localAsrWarmupTimer) {
        return;
      }
      window.clearTimeout?.(state.localAsrWarmupTimer);
      state.localAsrWarmupTimer = 0;
    }

    async function refreshLocalAsrWarmupStatus() {
      if (state.localAsrWarmupRequired !== true || state.asrMode !== "local_vosk") {
        state.localAsrWarmupStatus = "not_required";
        clearLocalAsrWarmupTimer();
        updateMicButton();
        return true;
      }
      if (typeof authFetch !== "function") {
        state.localAsrWarmupStatus = "error";
        updateMicButton();
        return false;
      }
      try {
        const response = await authFetch("/api/asr/status");
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        const payload = await response.json();
        state.localAsrWarmupStatus = payload?.ready === true
          ? "ready"
          : String(payload?.status || "warming");
        if (state.localAsrWarmupStatus === "ready") {
          clearLocalAsrWarmupTimer();
          setStatus("语音已就绪");
          updateMicButton();
          return true;
        }
        if (state.localAsrWarmupStatus === "error") {
          clearLocalAsrWarmupTimer();
          setStatus("语音初始化失败，请查看诊断信息");
          updateMicButton();
          return false;
        }
      } catch (_) {
        state.localAsrWarmupStatus = "warming";
      }
      updateMicButton();
      clearLocalAsrWarmupTimer();
      state.localAsrWarmupTimer = window.setTimeout(
        () => void refreshLocalAsrWarmupStatus(),
        600
      );
      return false;
    }

    function startLocalAsrWarmupPolling() {
      clearLocalAsrWarmupTimer();
      if (state.localAsrWarmupRequired !== true || state.asrMode !== "local_vosk") {
        state.localAsrWarmupStatus = "not_required";
        updateMicButton();
        return false;
      }
      state.localAsrWarmupStatus = "warming";
      setStatus("语音初始化中，其他功能可正常使用");
      updateMicButton();
      void refreshLocalAsrWarmupStatus();
      return true;
    }

    function clearMicRestartTimer() {
      if (!state.micRestartTimer) {
        return;
      }
      clearTimeout(state.micRestartTimer);
      state.micRestartTimer = 0;
    }

    async function ensureMicPermission() {
      if (state.micPermissionGranted) {
        return true;
      }
      const media = navigator.mediaDevices;
      if (!media || typeof media.getUserMedia !== "function") {
        setStatus("当前环境不支持麦克风权限");
        return false;
      }
      try {
        const stream = await media.getUserMedia({ audio: true, video: false });
        for (const track of stream.getTracks()) {
          try {
            track.stop();
          } catch (_) {
            // ignore
          }
        }
        state.micPermissionGranted = true;
        return true;
      } catch (err) {
        const name = String(err?.name || "");
        if (name === "NotAllowedError" || name === "PermissionDeniedError") {
          setStatus("请允许麦克风权限后再开麦");
        } else if (name === "NotFoundError") {
          setStatus("未检测到麦克风设备");
        } else {
          setStatus("麦克风权限申请失败");
        }
        return false;
      }
    }

    function floatToInt16(floatArray) {
      const src = floatArray || new Float32Array(0);
      const out = new Int16Array(src.length);
      for (let i = 0; i < src.length; i++) {
        const s = Math.max(-1, Math.min(1, src[i]));
        out[i] = s < 0 ? Math.round(s * 32768) : Math.round(s * 32767);
      }
      return out;
    }

    function downsampleTo16k(floatArray, inputRate) {
      const src = floatArray || new Float32Array(0);
      const inRate = Number(inputRate) || 16000;
      if (!src.length) {
        return new Int16Array(0);
      }
      if (inRate <= 16000) {
        return floatToInt16(src);
      }
      const ratio = inRate / 16000;
      const outLen = Math.max(1, Math.floor(src.length / ratio));
      const out = new Int16Array(outLen);
      let pos = 0;
      for (let i = 0; i < outLen; i++) {
        const next = Math.min(src.length, Math.floor((i + 1) * ratio));
        let sum = 0;
        let count = 0;
        while (pos < next) {
          sum += src[pos];
          count += 1;
          pos += 1;
        }
        const avg = count > 0 ? sum / count : 0;
        const s = Math.max(-1, Math.min(1, avg));
        out[i] = s < 0 ? Math.round(s * 32768) : Math.round(s * 32767);
      }
      return out;
    }

    function pcmChunksToBase64(chunks) {
      if (!Array.isArray(chunks) || chunks.length === 0) {
        return "";
      }
      let totalSamples = 0;
      for (const ch of chunks) {
        totalSamples += ch?.length || 0;
      }
      if (totalSamples <= 0) {
        return "";
      }
      const bytes = new Uint8Array(totalSamples * 2);
      let offset = 0;
      for (const ch of chunks) {
        const arr = ch || new Int16Array(0);
        for (let i = 0; i < arr.length; i++) {
          const v = arr[i];
          bytes[offset++] = v & 0xff;
          bytes[offset++] = (v >> 8) & 0xff;
        }
      }
      let binary = "";
      const chunkSize = 0x8000;
      for (let i = 0; i < bytes.length; i += chunkSize) {
        const sub = bytes.subarray(i, i + chunkSize);
        binary += String.fromCharCode.apply(null, sub);
      }
      return btoa(binary);
    }

    function cleanAsrText(text, maxLen = 240) {
      let out = String(text || "").replace(/\s+/g, " ").trim();
      const limit = Math.max(24, Math.min(800, Math.round(Number(maxLen) || 240)));
      if (out.length > limit) {
        out = out.slice(0, limit).trim();
      }
      return out;
    }

    function hasAsrSemanticContent(text) {
      const cleaned = cleanAsrText(text, 300);
      return !!cleaned && /[\p{L}\p{N}]/u.test(cleaned);
    }

    function escapeRegExp(text) {
      return String(text || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    }

    function hasAsciiLetterOrDigit(text) {
      return /[A-Za-z0-9]/.test(String(text || ""));
    }

    function aliasToFlexiblePattern(alias) {
      const raw = String(alias || "").trim();
      if (!raw) {
        return "";
      }
      const compact = raw.replace(/\s+/g, "");
      if (/^[A-Za-z0-9]+$/.test(compact) && raw.includes(" ")) {
        return Array.from(compact).map((ch) => escapeRegExp(ch)).join("\\s*");
      }
      return escapeRegExp(raw).replace(/\\ /g, "\\s+");
    }

    function replaceContextAlias(text, alias, term) {
      let out = String(text || "");
      const pattern = aliasToFlexiblePattern(alias);
      if (!pattern || !term) {
        return out;
      }
      const needsBoundary = hasAsciiLetterOrDigit(alias);
      const re = new RegExp(
        needsBoundary ? `(^|[^A-Za-z0-9])(${pattern})(?=$|[^A-Za-z0-9])` : `(${pattern})`,
        "gi"
      );
      return out.replace(re, (...args) => {
        const prefix = needsBoundary ? args[1] : "";
        const match = needsBoundary ? args[2] : args[1];
        if (String(match || "").toLowerCase() === String(term || "").toLowerCase()) {
          return `${prefix}${match}`;
        }
        return `${prefix}${term}`;
      });
    }

    function addContextTerm(map, term, aliases = []) {
      const safeTerm = cleanAsrText(term, 48);
      if (!safeTerm || safeTerm.length < 2) {
        return;
      }
      const key = safeTerm.toLowerCase();
      if (!map.has(key)) {
        map.set(key, { term: safeTerm, aliases: [] });
      }
      const item = map.get(key);
      for (const alias of aliases) {
        const safeAlias = cleanAsrText(alias, 48);
        if (safeAlias && safeAlias.toLowerCase() !== key && !item.aliases.includes(safeAlias)) {
          item.aliases.push(safeAlias);
        }
      }
      if (/^[A-Za-z0-9.+_-]{2,24}$/.test(safeTerm)) {
        const spaced = Array.from(safeTerm.replace(/[-_.+]/g, "")).join(" ");
        if (spaced && spaced.toLowerCase() !== key && !item.aliases.includes(spaced)) {
          item.aliases.push(spaced);
        }
      }
    }

    function buildRecentAsrContextTerms() {
      const terms = new Map();
      for (const item of ASR_CONTEXT_TERMS) {
        addContextTerm(terms, item.term, item.aliases);
      }
      if (Array.isArray(state.asrHotwordRules)) {
        for (const rule of state.asrHotwordRules) {
          addContextTerm(terms, rule?.to, [rule?.from]);
        }
      }
      const recent = [
        ...(Array.isArray(state.history) ? state.history.slice(-12) : []),
        ...(Array.isArray(state.chatRecords) ? state.chatRecords.slice(-8) : [])
      ];
      for (const item of recent) {
        const text = cleanAsrText(item?.content || item?.text || "", 500);
        for (const match of text.matchAll(/\b[A-Za-z][A-Za-z0-9.+_-]{1,24}\b/g)) {
          const term = match[0];
          if (!/^(the|and|you|for|with|this|that|have|from|your|are|can|will)$/i.test(term)) {
            addContextTerm(terms, term, []);
          }
        }
      }
      return Array.from(terms.values());
    }

    function applyContextualAsrCorrections(text) {
      let out = cleanAsrText(text, 300);
      if (!out || state.asrSemanticCorrectionEnabled === false) {
        return out;
      }
      for (const item of buildRecentAsrContextTerms()) {
        for (const alias of item.aliases || []) {
          out = replaceContextAlias(out, alias, item.term);
        }
      }
      return cleanAsrText(out, 300);
    }

    function recordAsrCorrectionEvent(stage, payload = {}) {
      const confidence = Number(payload.confidence);
      const entry = {
        seq: Math.max(1, Math.round(Number(state.asrCorrectionSeq || 0)) + 1),
        atMs: Math.round(typeof performance.now === "function" ? performance.now() : Date.now()),
        stage: String(stage || "asr"),
        source: String(payload.source || ""),
        raw_text: cleanAsrText(payload.raw_text, 180),
        hotword_text: cleanAsrText(payload.hotword_text, 180),
        context_text: cleanAsrText(payload.context_text, 180),
        final_text: cleanAsrText(payload.final_text, 180),
        merged_parts: Math.max(1, Math.round(Number(payload.merged_parts || 1))),
        confidence: Number.isFinite(confidence) ? Math.max(0, Math.min(1, confidence)) : 1,
        confidence_reason: cleanAsrText(payload.confidence_reason, 80),
        needs_confirmation: payload.needs_confirmation === true,
        language_selection_ambiguous: payload.language_selection_ambiguous === true,
        detected_language: ["zh-CN", "en-US"].includes(String(payload.detected_language || ""))
          ? String(payload.detected_language)
          : "",
        turn_wait_reason: cleanAsrText(payload.turn_wait_reason, 80),
        held_for_more_speech: payload.held_for_more_speech === true,
        changed: payload.changed === true
      };
      state.asrCorrectionSeq = entry.seq;
      state.asrLastCorrectionDebug = entry;
      if (!Array.isArray(state.asrCorrectionEvents)) {
        state.asrCorrectionEvents = [];
      }
      state.asrCorrectionEvents.push(entry);
      if (state.asrCorrectionEvents.length > 60) {
        state.asrCorrectionEvents.splice(0, state.asrCorrectionEvents.length - 60);
      }
      return entry;
    }

    function getAsrLowConfidenceThreshold() {
      return clampNumber(Number(state.asrLowConfidenceThreshold ?? 0.48), 0.2, 0.9);
    }

    function assessAsrConfidence(rawText, finalText, opts = {}) {
      const raw = cleanAsrText(rawText, 300);
      const text = cleanAsrText(finalText, 300);
      const explicit = Number(opts.confidence);
      let score = Number.isFinite(explicit) && explicit > 0 ? Math.max(0, Math.min(1, explicit)) : 0.72;
      const reasons = [];
      if (!raw || !text) {
        return { score: 0, reason: "empty", needsConfirmation: false };
      }
      if (text.length <= 2) {
        score -= 0.35;
        reasons.push("very_short");
      } else if (text.length <= 6) {
        score -= 0.18;
        reasons.push("short");
      }
      const speechMs = Number(opts.speechMs || opts.speech_ms || 0);
      if (speechMs > 0 && speechMs < Math.max(120, Number(state.localAsrMinSpeechMs || 180) + 90)) {
        score -= 0.18;
        reasons.push("short_audio");
      }
      const peakRms = Number(opts.peakRms || opts.peak_rms || state.localAsrPeakRms || 0);
      const threshold = Number(state.localAsrSpeechThreshold || 0.0035);
      if (peakRms > 0 && threshold > 0 && peakRms < threshold * 1.45) {
        score -= 0.16;
        reasons.push("low_energy");
      }
      if (/^(um+|uh+|ah+|hmm+|\u55ef+|\u554a+|\u5443+)$/i.test(text.replace(/\s+/g, ""))) {
        score -= 0.3;
        reasons.push("filler_only");
      }
      if (raw !== text) {
        score += 0.06;
        reasons.push("corrected");
      }
      if (Number(opts.mergedParts || opts.merged_parts || 1) > 1) {
        score += 0.05;
        reasons.push("merged");
      }
      if (opts.languageSelectionAmbiguous === true) {
        score = Math.min(score, Math.max(0, getAsrLowConfidenceThreshold() - 0.02));
        reasons.push("language_selection_ambiguous");
      }
      score = Math.max(0, Math.min(1, score));
      const confirmEnabled = state.asrLowConfidenceConfirmEnabled !== false;
      return {
        score,
        reason: reasons.join(",") || "ok",
        needsConfirmation: confirmEnabled && score < getAsrLowConfidenceThreshold()
      };
    }

    function normalizeParalinguisticContext(value = null) {
      const raw = value && typeof value === "object" && !Array.isArray(value) ? value : null;
      if (!raw) {
        return null;
      }
      const allowedEmotions = new Set([
        "angry", "disgusted", "fearful", "happy", "neutral", "sad", "surprised", "unknown"
      ]);
      const allowedCues = new Set([
        "nonverbal_vocalization", "laughter", "crying", "cough", "sneeze", "breath"
      ]);
      const allowedEvents = new Set([
        "speech", "laughter", "crying", "cough", "sneeze", "breath", "applause", "bgm", "music"
      ]);
      const emotion = String(raw.emotion || "unknown").trim().toLowerCase();
      const cueType = String(raw.cue_type || raw.cueType || "").trim().toLowerCase();
      const events = (Array.isArray(raw.events) ? raw.events : [])
        .map((item) => String(item || "").trim().toLowerCase())
        .filter((item, index, all) => allowedEvents.has(item) && all.indexOf(item) === index)
        .slice(0, 6);
      const normalized = {
        emotion: allowedEmotions.has(emotion) ? emotion : "unknown",
        events,
        cue_type: allowedCues.has(cueType) ? cueType : "",
        voiced: raw.voiced === true,
        voiced_ratio: clampNumber(Number(raw.voiced_ratio ?? raw.voicedRatio ?? 0), 0, 1),
        pitch_stability: clampNumber(Number(raw.pitch_stability ?? raw.pitchStability ?? 0), 0, 1),
        meaningful: raw.meaningful === true
      };
      if (
        !normalized.meaningful
        && !normalized.cue_type
        && normalized.emotion === "unknown"
        && normalized.events.length === 0
      ) {
        return null;
      }
      return normalized;
    }

    function buildAsrConversationContext(debug = null, paralinguisticValue = null) {
      const safe = debug && typeof debug === "object" && !Array.isArray(debug) ? debug : null;
      const paralinguistic = normalizeParalinguisticContext(
        paralinguisticValue || safe?.paralinguistic
      );
      if ((!safe || safe.needs_confirmation !== true) && !paralinguistic) {
        return null;
      }
      const context = {
        version: 1,
        source: String(safe?.source || "voice_transcript"),
        raw_text: cleanAsrText(safe?.raw_text, 160),
        final_text: cleanAsrText(safe?.final_text, 160),
        confidence: Number(safe?.confidence || 0),
        reason: cleanAsrText(safe?.confidence_reason, 80),
        language_selection_ambiguous: safe?.language_selection_ambiguous === true,
        needs_confirmation: safe?.needs_confirmation === true
      };
      if (paralinguistic) {
        context.paralinguistic = paralinguistic;
      }
      return context;
    }

    function classifyLiveVoiceTurn(text) {
      const value = cleanAsrText(text, 120).toLowerCase();
      const compact = value.replace(/[\s,.!?，。！？、~～…-]+/g, "");
      if (!compact) {
        return { kind: "empty", interrupts: false };
      }
      if (/^(?:嗯+|唔+|哦+|噢+|喔+|唉+|诶+|欸+|呃+|额+|啊+|哈+|哼+|m+h+m+|h+m+|uh+h*|um+|ah+|oh+|mm+|mhm|uhhuh)$/i.test(compact)) {
        return { kind: "backchannel", interrupts: false };
      }
      if (
        /^(?:停|停下|停一下|别说了|等等|等一下|先别说|算了|不用了)$/i.test(compact)
        || /^(?:stop|wait|holdon|cancel|nevermind)$/i.test(compact)
      ) {
        return { kind: "stop", interrupts: true };
      }
      if (
        /^(?:不对|不是|不是这个|我不是说|我的意思是)/i.test(compact)
        || /^(?:no|wrong|notthat|imeant)/i.test(compact)
      ) {
        return { kind: "correction", interrupts: true };
      }
      return { kind: "substantive", interrupts: true };
    }

    function rememberVoiceBackchannel(value = null) {
      const cue = normalizeParalinguisticContext(value) || {
        emotion: "unknown",
        events: ["speech"],
        cue_type: "nonverbal_vocalization",
        voiced: true,
        voiced_ratio: 0,
        pitch_stability: 0,
        meaningful: true
      };
      state.recentVoiceBackchannel = cue;
      state.recentVoiceBackchannelAt = Date.now();
      return cue;
    }

    function consumeRecentVoiceBackchannel() {
      const cue = normalizeParalinguisticContext(state.recentVoiceBackchannel);
      const recordedAt = Number(state.recentVoiceBackchannelAt || 0);
      state.recentVoiceBackchannel = null;
      state.recentVoiceBackchannelAt = 0;
      if (!cue || !recordedAt || Date.now() - recordedAt > RECENT_BACKCHANNEL_TTL_MS) {
        return null;
      }
      return cue;
    }

    function prepareAsrTranscript(rawText, source = "voice_transcript", opts = {}) {
      const raw = cleanAsrText(rawText, 300);
      const hotword = applyAsrHotwordCorrections(raw);
      const context = applyContextualAsrCorrections(hotword || raw);
      const finalText = context || hotword || raw;
      const confidence = assessAsrConfidence(raw, finalText, opts);
      const debug = recordAsrCorrectionEvent("prepared", {
        source,
        raw_text: raw,
        hotword_text: hotword,
        context_text: context,
        final_text: finalText,
        confidence: confidence.score,
        confidence_reason: confidence.reason,
        needs_confirmation: confidence.needsConfirmation,
        language_selection_ambiguous: opts.languageSelectionAmbiguous === true,
        detected_language: opts.detectedLanguage,
        paralinguistic: normalizeParalinguisticContext(opts.paralinguistic),
        changed: finalText !== raw
      });
      return {
        text: finalText,
        raw,
        hotword,
        context,
        debug,
        source,
        asr_context: buildAsrConversationContext(debug, opts.paralinguistic)
      };
    }

    function getVoiceTurnMergeWindowMs() {
      return Math.round(clampNumber(Number(state.voiceTurnMergeWindowMs ?? 1200), 0, 2500));
    }

    function hasVoiceTurnBoundary(text) {
      const compact = cleanAsrText(text, 300);
      if (!compact) {
        return false;
      }
      if (/[.!?\u3002\uFF01\uFF1F]$/.test(compact)) {
        return true;
      }
      return /(\u5417|\u5462|\u5427|\u554a|\u5440|\u54e6|\u55ef|ok|okay|yes|no)$/i.test(compact.replace(/\s+/g, ""));
    }

    function isQuickCompleteVoiceTurn(text) {
      const compact = cleanAsrText(text, 80).toLowerCase().replace(/\s+/g, "");
      if (!compact) {
        return false;
      }
      const quick = new Set([
        "ok", "okay", "yes", "no", "yeah", "yep", "nope", "continue", "goon", "stop",
        "\u597d", "\u597d\u7684", "\u53ef\u4ee5", "\u884c", "\u5bf9", "\u4e0d\u5bf9", "\u4e0d\u662f",
        "\u7ee7\u7eed", "\u505c", "\u505c\u4e00\u4e0b", "\u505a\u5427", "\u4e0b\u4e00\u6b65"
      ]);
      return quick.has(compact);
    }

    function getIncompleteVoiceTurnReason(text) {
      if (state.voiceTurnHoldIncompleteEnabled === false) {
        return "";
      }
      const compact = cleanAsrText(text, 300);
      if (!compact || hasVoiceTurnBoundary(compact) || isQuickCompleteVoiceTurn(compact)) {
        return "";
      }
      const noSpace = compact.replace(/\s+/g, "");
      if (/(then|and|but|so|because|if|when|with|to|for|about|like|that)$/i.test(compact)) {
        return "trailing_connector";
      }
      if (/(\u7136\u540e|\u5c31\u662f|\u56e0\u4e3a|\u6240\u4ee5|\u5982\u679c|\u4f46\u662f|\u8fd8\u6709|\u6bd4\u5982|\u5173\u4e8e|\u90a3\u4e2a|\u8fd9\u4e2a)$/.test(noSpace)) {
        return "trailing_connector";
      }
      const words = compact.split(/\s+/).filter(Boolean);
      if (noSpace.length <= 12 || (words.length > 0 && words.length <= 4)) {
        return "short_fragment";
      }
      if (noSpace.length <= 24 && !/[,\uFF0C\u3001;\uFF1B]/.test(compact)) {
        return "no_terminal_short";
      }
      return "";
    }

    function getAsrMergeReason(prepared, opts = {}) {
      const mergeWindowMs = getVoiceTurnMergeWindowMs();
      if (mergeWindowMs <= 0) {
        return "";
      }
      if (state.micPendingTranscript) {
        return "pending_merge";
      }
      if (opts.forceMerge === true) {
        return "forced_merge";
      }
      const now = Date.now();
      if (
        opts.startedDuringAssistant === true
        || Number(state.fullDuplexVoiceBurstUntil || 0) > now
      ) {
        return "full_duplex_burst_merge";
      }
      if (now - Number(state.chatInterruptedAt || 0) < 3500) {
        return "barge_in_merge";
      }
      if (Number(state.protectedInterruptionUntil || 0) > now) {
        return "protected_speech_merge";
      }
      if (opts.allowWhenMicClosed === true) {
        return "";
      }
      return getIncompleteVoiceTurnReason(prepared?.text);
    }

    function joinVoiceTurnParts(parts) {
      return (Array.isArray(parts) ? parts : [])
        .map((part) => cleanAsrText(part, 180))
        .filter(Boolean)
        .join("，")
        .replace(/，{2,}/g, "，")
        .trim();
    }

    function isRecentBargeInVoiceTurn(waitReason = "") {
      const reason = String(waitReason || "");
      if (reason === "barge_in_merge" || reason === "protected_speech_merge") {
        return true;
      }
      const interruptedAt = Number(state.chatInterruptedAt || 0);
      return interruptedAt > 0 && Date.now() - interruptedAt < 7000;
    }

    function shouldDropUnreliableBargeInVoiceTurn(text, debug = null, waitReason = "") {
      if (String(waitReason || "") === "full_duplex_burst_merge") {
        return false;
      }
      if (!isRecentBargeInVoiceTurn(waitReason)) {
        return false;
      }
      const compact = cleanAsrText(text, 300);
      const noSpace = compact.replace(/\s+/g, "");
      if (!noSpace) {
        return true;
      }
      if (isQuickCompleteVoiceTurn(compact) || hasVoiceTurnBoundary(compact)) {
        return false;
      }
      const score = Number(debug?.confidence || 0);
      const needsConfirmation = debug?.needs_confirmation === true;
      if (noSpace.length <= 6) {
        return true;
      }
      return noSpace.length <= 10 && (needsConfirmation || (score > 0 && score < 0.58));
    }

    function queueAsrVoiceTurn(prepared, opts = {}) {
      const item = {
        text: cleanAsrText(prepared?.text, 300),
        source: String(opts.source || prepared?.source || "voice_transcript"),
        interruptReason: String(opts.interruptReason || opts.source || prepared?.source || "voice_transcript"),
        bargeInKind: String(opts.bargeInKind || ""),
        startedDuringAssistant: opts.startedDuringAssistant === true,
        allowWhenMicClosed: opts.allowWhenMicClosed === true,
        micSession: Number(state.micSession || 0),
        queuedAt: Date.now(),
        asr_debug: prepared?.debug || null,
        asr_context: prepared?.asr_context || buildAsrConversationContext(prepared?.debug)
      };
      if (!hasAsrSemanticContent(item.text)) {
        return false;
      }
      state.micQueueLastDroppedReason = "";
      state.micQueue.push(item);
      runMicQueue();
      return true;
    }

    function clearPendingMicTranscriptTimer() {
      if (state.micPendingTranscriptTimer) {
        clearTimeout(state.micPendingTranscriptTimer);
        state.micPendingTranscriptTimer = 0;
      }
    }

    function schedulePendingMicTranscriptFlush(delayMs) {
      clearPendingMicTranscriptTimer();
      const safeDelay = Math.max(80, Math.min(15000, Math.round(Number(delayMs) || 0)));
      state.micPendingTranscriptTimer = window.setTimeout(flushPendingMicTranscript, safeDelay);
      return state.micPendingTranscriptTimer;
    }

    function flushPendingMicTranscript() {
      clearPendingMicTranscriptTimer();
      const pending = state.micPendingTranscript;
      state.micPendingTranscript = null;
      state.micPendingTranscriptUpdatedAt = 0;
      if (!pending || !Array.isArray(pending.parts) || !pending.parts.length) {
        return false;
      }
      const raw = joinVoiceTurnParts(pending.rawParts);
      const hotword = joinVoiceTurnParts(pending.hotwordParts);
      const context = applyContextualAsrCorrections(joinVoiceTurnParts(pending.parts));
      const finalText = context || joinVoiceTurnParts(pending.parts);
      if (!hasAsrSemanticContent(finalText)) {
        recordAsrCorrectionEvent("dropped", {
          source: pending.source,
          raw_text: raw,
          hotword_text: hotword,
          context_text: context,
          final_text: finalText,
          merged_parts: pending.parts.length,
          confidence: 0,
          confidence_reason: "punctuation_only",
          needs_confirmation: false,
          language_selection_ambiguous: pending.languageSelectionAmbiguous === true,
          turn_wait_reason: "punctuation_only",
          changed: finalText !== raw || pending.parts.length > 1
        });
        return false;
      }
      const debug = recordAsrCorrectionEvent("merged", {
        source: pending.source,
        raw_text: raw,
        hotword_text: hotword,
        context_text: context,
        final_text: finalText,
        merged_parts: pending.parts.length,
        ...(() => {
          const confidence = assessAsrConfidence(raw, finalText, {
            mergedParts: pending.parts.length,
            languageSelectionAmbiguous: pending.languageSelectionAmbiguous === true
          });
          return {
            confidence: confidence.score,
            confidence_reason: confidence.reason,
            needs_confirmation: confidence.needsConfirmation,
            language_selection_ambiguous: pending.languageSelectionAmbiguous === true,
            turn_wait_reason: pending.waitReason || "pending_merge"
          };
        })(),
        changed: finalText !== raw || pending.parts.length > 1
      });
      if (shouldDropUnreliableBargeInVoiceTurn(finalText, debug, pending.waitReason)) {
        recordAsrCorrectionEvent("dropped", {
          source: pending.source,
          raw_text: raw,
          hotword_text: hotword,
          context_text: context,
          final_text: finalText,
          merged_parts: pending.parts.length,
          confidence: debug.confidence,
          confidence_reason: debug.confidence_reason,
          needs_confirmation: debug.needs_confirmation,
          language_selection_ambiguous: debug.language_selection_ambiguous === true,
          turn_wait_reason: "unreliable_barge_in_fragment",
          changed: finalText !== raw || pending.parts.length > 1
        });
        return false;
      }
      return queueAsrVoiceTurn(
        {
          text: finalText,
          debug,
          source: pending.source,
          asr_context: buildAsrConversationContext(debug, pending.paralinguistic)
        },
        {
          source: pending.source,
          interruptReason: pending.interruptReason,
          allowWhenMicClosed: pending.allowWhenMicClosed,
          bargeInKind: pending.bargeInKind,
          startedDuringAssistant: pending.startedDuringAssistant === true
        }
      );
    }

    function holdOrMergeAsrTranscript(prepared, opts = {}) {
      const now = Date.now();
      const mergeWindowMs = getVoiceTurnMergeWindowMs();
      const source = String(opts.source || prepared.source || "voice_transcript");
      const interruptReason = String(opts.interruptReason || source);
      const mergeReason = String(opts.mergeReason || "pending_merge");
      const pending = state.micPendingTranscript && typeof state.micPendingTranscript === "object"
        ? state.micPendingTranscript
        : {
            parts: [],
            rawParts: [],
            hotwordParts: [],
            source,
            interruptReason,
            bargeInKind: String(opts.bargeInKind || ""),
            startedDuringAssistant: opts.startedDuringAssistant === true,
            allowWhenMicClosed: opts.allowWhenMicClosed === true,
            languageSelectionAmbiguous: false,
            paralinguistic: null,
            waitReason: mergeReason
          };
      pending.parts.push(prepared.text);
      pending.rawParts.push(prepared.raw);
      pending.hotwordParts.push(prepared.hotword || prepared.raw);
      pending.source = source;
      pending.interruptReason = interruptReason;
      pending.bargeInKind = String(opts.bargeInKind || pending.bargeInKind || "");
      pending.startedDuringAssistant = pending.startedDuringAssistant || opts.startedDuringAssistant === true;
      pending.allowWhenMicClosed = pending.allowWhenMicClosed || opts.allowWhenMicClosed === true;
      pending.languageSelectionAmbiguous = pending.languageSelectionAmbiguous
        || prepared.debug?.language_selection_ambiguous === true;
      pending.paralinguistic = normalizeParalinguisticContext(
        prepared.asr_context?.paralinguistic || pending.paralinguistic
      );
      pending.waitReason = pending.waitReason || mergeReason;
      pending.updatedAt = now;
      state.micPendingTranscript = pending;
      state.micPendingTranscriptUpdatedAt = now;
      const dispatchDelay = mergeReason === "full_duplex_burst_merge"
        ? Math.min(mergeWindowMs || FULL_DUPLEX_FINAL_MERGE_MS, FULL_DUPLEX_FINAL_MERGE_MS)
        : mergeWindowMs;
      schedulePendingMicTranscriptFlush(dispatchDelay);
      recordAsrCorrectionEvent("merge_wait", {
        source,
        raw_text: joinVoiceTurnParts(pending.rawParts),
        hotword_text: joinVoiceTurnParts(pending.hotwordParts),
        context_text: joinVoiceTurnParts(pending.parts),
        final_text: joinVoiceTurnParts(pending.parts),
        merged_parts: pending.parts.length,
        confidence: prepared.debug?.confidence,
        confidence_reason: prepared.debug?.confidence_reason,
        needs_confirmation: prepared.debug?.needs_confirmation === true,
        language_selection_ambiguous: pending.languageSelectionAmbiguous === true,
        turn_wait_reason: mergeReason,
        held_for_more_speech: true,
        changed: pending.parts.length > 1
      });
      return true;
    }

    function sendAsrTranscript(text, opts = {}) {
      const cleanedText = cleanAsrText(text, 300);
      if (!hasAsrSemanticContent(cleanedText)) {
        recordAsrCorrectionEvent("dropped", {
          source: String(opts.source || "voice_transcript"),
          raw_text: cleanedText,
          hotword_text: cleanedText,
          context_text: "",
          final_text: cleanedText,
          confidence: 0,
          confidence_reason: "punctuation_only",
          needs_confirmation: false,
          turn_wait_reason: "punctuation_only",
          changed: false
        });
        return false;
      }
      const liveTurn = classifyLiveVoiceTurn(cleanedText);
      if (liveTurn.kind === "backchannel") {
        const cue = rememberVoiceBackchannel(opts.paralinguistic);
        if (state.chatBusy === true || isAssistantSpeechOrStreamActive()) {
          state.localAsrSessionTranscriptAccepted = true;
          return true;
        }
        return sendHiddenParalinguisticCue(cue, {
          source: "voice_backchannel",
          confidence: opts.confidence
        });
      }
      if (liveTurn.interrupts && state.conversationMode?.interruptTtsOnUserSpeech === true) {
        const assistantActive = state.chatBusy === true || isAssistantSpeechOrStreamActive();
        if (assistantActive || opts.startedDuringAssistant === true) {
          state.fullDuplexVoiceBurstUntil = Date.now() + 2500;
        }
        if (assistantActive) {
          handleUserSpeechStart({
            reason: liveTurn.kind === "stop"
              ? "voice_stop_command"
              : (liveTurn.kind === "correction" ? "voice_correction" : "voice_transcript_confirmed"),
            confirmedTranscript: true,
            kind: liveTurn.kind
          });
        }
      }
      const recentBackchannel = consumeRecentVoiceBackchannel();
      if (recentBackchannel && !opts.paralinguistic) {
        opts = { ...opts, paralinguistic: recentBackchannel };
      }
      const prepared = prepareAsrTranscript(cleanedText, opts.source || "voice_transcript", opts);
      if (!prepared.text) {
        return false;
      }
      const mergeReason = getAsrMergeReason(prepared, opts);
      let accepted = false;
      if (mergeReason) {
        accepted = holdOrMergeAsrTranscript(prepared, {
          ...opts,
          mergeReason,
          bargeInKind: liveTurn.kind
        });
      } else {
        accepted = queueAsrVoiceTurn(prepared, {
          ...opts,
          bargeInKind: liveTurn.kind
        });
      }
      if (accepted && String(opts.source || "voice_transcript").startsWith("voice")) {
        state.localAsrSessionTranscriptAccepted = true;
      }
      return accepted;
    }

    function sendHiddenParalinguisticCue(value, opts = {}) {
      const paralinguistic = normalizeParalinguisticContext(value);
      if (!paralinguistic || paralinguistic.meaningful !== true) {
        return false;
      }
      if (state.chatBusy === true || isAssistantSpeechOrStreamActive()) {
        rememberVoiceBackchannel(paralinguistic);
        state.localAsrSessionTranscriptAccepted = true;
        return true;
      }
      const source = String(opts.source || "voice_paralinguistic");
      const asrContext = buildAsrConversationContext(
        {
          source,
          raw_text: "",
          final_text: "",
          confidence: Number(opts.confidence || 0),
          confidence_reason: "nonverbal_audio",
          language_selection_ambiguous: false,
          needs_confirmation: false
        },
        paralinguistic
      );
      const item = {
        text: "[nonverbal vocalization]",
        source,
        interruptReason: source,
        allowWhenMicClosed: opts.allowWhenMicClosed === true,
        micSession: Number(state.micSession || 0),
        queuedAt: Date.now(),
        asr_debug: null,
        asr_context: asrContext,
        hiddenUser: true
      };
      state.micQueue.push(item);
      runMicQueue();
      return true;
    }

    async function transcribeLocalPcmChunks(chunks, signal = undefined, returnMetadata = false) {
      if (!Array.isArray(chunks) || chunks.length === 0) {
        return returnMetadata
          ? { text: "", confidence: 0, detectedLanguage: "", languageSelectionAmbiguous: false }
          : "";
      }
      const audio_base64 = pcmChunksToBase64(chunks);
      if (!audio_base64) {
        return returnMetadata
          ? { text: "", confidence: 0, detectedLanguage: "", languageSelectionAmbiguous: false }
          : "";
      }
      const resp = await authFetch("/api/asr_pcm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal,
        body: JSON.stringify({
          audio_base64,
          sample_rate: 16000
        })
      });
      if (!resp.ok) {
        let detail = `HTTP ${resp.status}`;
        try {
          const data = await resp.json();
          if (data?.error) detail = data.error;
        } catch (_) {
          // ignore
        }
        throw new Error(detail);
      }
      const data = await resp.json();
      const rawText = String(data?.raw_text || "").trim();
      const text = rawText || String(data?.text || "").trim();
      const detectedLanguage = ["zh-CN", "en-US"].includes(String(data?.detected_language || ""))
        ? String(data.detected_language)
        : "";
      const confidence = Number(data?.confidence);
      const result = {
        text,
        detectedLanguage,
        confidence: Number.isFinite(confidence) ? Math.max(0, Math.min(1, confidence)) : 0,
        languageSelectionAmbiguous: data?.language_selection_ambiguous === true
      };
      const paralinguistic = normalizeParalinguisticContext(data?.paralinguistic);
      if (paralinguistic) {
        result.paralinguistic = paralinguistic;
      }
      if (["sensevoice", "vosk", "whisper"].includes(String(data?.provider || ""))) {
        result.provider = String(data.provider);
      }
      if (Object.prototype.hasOwnProperty.call(data || {}, "fallback_used")) {
        result.fallbackUsed = data?.fallback_used === true;
      }
      return returnMetadata ? result : result.text;
    }

    function clearLocalAsrStreamingPreview() {
      const previous = String(state.localAsrStreamingPreviewText || "");
      if (
        state.localAsrStreamingPreviewOwned === true
        && ui.chatInput
        && String(ui.chatInput.value || "") === previous
      ) {
        ui.chatInput.value = "";
      }
      state.localAsrStreamingPreviewText = "";
      state.localAsrStreamingPreviewOwned = false;
    }

    function updateLocalAsrStreamingPreview(text, sessionId = null, expectedStreamId = "") {
      const token = sessionId == null ? state.micSession : Number(sessionId);
      const cleaned = cleanAsrText(text, 300);
      const activeStreamId = String(state.localAsrStreamingSessionId || "");
      if (
        !cleaned
        || token !== state.micSession
        || !state.micOpen
        || !ui.chatInput
        || (expectedStreamId && activeStreamId && activeStreamId !== expectedStreamId)
      ) {
        return false;
      }
      const previous = String(state.localAsrStreamingPreviewText || "");
      const current = String(ui.chatInput.value || "");
      if (state.localAsrStreamingPreviewOwned === true && current !== previous) {
        state.localAsrStreamingPreviewOwned = false;
        state.localAsrStreamingPreviewText = "";
        return false;
      }
      if (!state.localAsrStreamingPreviewOwned && current.trim()) {
        return false;
      }
      ui.chatInput.value = cleaned;
      state.localAsrStreamingPreviewText = cleaned;
      state.localAsrStreamingPreviewOwned = true;
      return true;
    }

    async function postLocalAsrStream(action, sessionId, chunks = [], signal = undefined) {
      const body = {
        action: String(action || ""),
        session_id: String(sessionId || "")
      };
      if (Array.isArray(chunks) && chunks.length) {
        body.audio_base64 = pcmChunksToBase64(chunks);
      }
      const resp = await authFetch("/api/asr_stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal,
        body: JSON.stringify(body)
      });
      if (!resp.ok) {
        throw new Error(`HTTP ${resp.status}`);
      }
      return resp.json();
    }

    function beginLocalAsrStreaming(sessionId = null) {
      const token = sessionId == null ? state.micSession : Number(sessionId);
      if (
        token !== state.micSession
        || !state.micOpen
        || state.asrStreamingEnabled === false
        || state.asrProvider === "vosk"
      ) {
        return false;
      }
      const streamId = `${token}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
      state.localAsrStreamingSessionId = streamId;
      state.localAsrStreamingEnabled = true;
      state.localAsrStreamingBuffers = [];
      state.localAsrStreamingBufferedMs = 0;
      state.localAsrStreamingAbortController = new AbortController();
      const streamController = state.localAsrStreamingAbortController;
      state.localAsrStreamingRequestChain = Promise.resolve()
        .then(() => postLocalAsrStream("start", streamId, [], streamController.signal))
        .then((data) => {
          if (state.localAsrStreamingSessionId === streamId && data?.enabled !== true) {
            state.localAsrStreamingEnabled = false;
          }
          return data;
        })
        .catch(() => {
          if (state.localAsrStreamingSessionId === streamId) {
            state.localAsrStreamingEnabled = false;
          }
          return null;
        });
      return true;
    }

    function flushLocalAsrStreamingChunk(isFinal = false, sessionId = null) {
      const token = sessionId == null ? state.micSession : Number(sessionId);
      const streamId = String(state.localAsrStreamingSessionId || "");
      if (!streamId || token !== state.micSession) {
        return false;
      }
      const chunks = Array.isArray(state.localAsrStreamingBuffers)
        ? state.localAsrStreamingBuffers.splice(0)
        : [];
      state.localAsrStreamingBufferedMs = 0;
      const action = isFinal ? "finish" : "append";
      if (!isFinal && !chunks.length) {
        return false;
      }
      const previousChain = state.localAsrStreamingRequestChain || Promise.resolve();
      const streamController = state.localAsrStreamingAbortController;
      state.localAsrStreamingRequestChain = previousChain
        .then((previous) => {
          if (previous?.enabled === false || streamController?.signal?.aborted) {
            return previous;
          }
          return postLocalAsrStream(action, streamId, chunks, streamController?.signal);
        })
        .then((data) => {
          if (data?.enabled === true && data?.partial_text) {
            updateLocalAsrStreamingPreview(data.partial_text, token, streamId);
          }
          if (data?.enabled === false && state.localAsrStreamingSessionId === streamId) {
            state.localAsrStreamingEnabled = false;
          }
          return data;
        })
        .catch(() => {
          if (state.localAsrStreamingSessionId === streamId) {
            state.localAsrStreamingEnabled = false;
          }
          return null;
        })
        .finally(() => {
          if (isFinal && state.localAsrStreamingAbortController === streamController) {
            state.localAsrStreamingAbortController = null;
          }
        });
      if (isFinal) {
        state.localAsrStreamingSessionId = "";
        state.localAsrStreamingEnabled = false;
        state.localAsrStreamingBuffers = [];
        state.localAsrStreamingBufferedMs = 0;
      }
      return true;
    }

    function queueLocalAsrStreamingFrame(pcm16, frameMs, sessionId = null) {
      const token = sessionId == null ? state.micSession : Number(sessionId);
      if (
        token !== state.micSession
        || !state.localAsrStreamingSessionId
        || !pcm16?.length
      ) {
        return false;
      }
      state.localAsrStreamingBuffers.push(pcm16);
      state.localAsrStreamingBufferedMs += Math.max(0, Number(frameMs) || 0);
      if (state.localAsrStreamingBufferedMs >= Math.max(320, Number(state.asrStreamChunkMs) || 600)) {
        flushLocalAsrStreamingChunk(false, token);
      }
      return true;
    }

    function cancelLocalAsrStreaming() {
      const streamId = String(state.localAsrStreamingSessionId || "");
      const streamController = state.localAsrStreamingAbortController;
      state.localAsrStreamingAbortController = null;
      if (streamController) {
        try {
          streamController.abort();
        } catch (_) {
          // ignore
        }
      }
      state.localAsrStreamingSessionId = "";
      state.localAsrStreamingEnabled = false;
      state.localAsrStreamingBuffers = [];
      state.localAsrStreamingBufferedMs = 0;
      state.localAsrStreamingRequestChain = null;
      clearLocalAsrStreamingPreview();
      if (streamId) {
        void postLocalAsrStream("cancel", streamId).catch(() => null);
      }
      return !!streamId;
    }

    function cancelLocalAsrRequest() {
      if (state.localAsrAbortController) {
        try {
          state.localAsrAbortController.abort();
        } catch (_) {
          // ignore
        }
      }
      state.localAsrAbortController = null;
      state.localAsrSending = false;
    }

    function updateLocalAsrMicLevelFromRms(rms) {
      const safeRms = Math.max(0, Number(rms) || 0);
      state.localAsrPeakRms = Math.max(Number(state.localAsrPeakRms) || 0, safeRms);
      const displayNoiseFloor = clampNumber(
        state.localAsrNoiseFloor * 1.15 + 0.0004,
        0.0004,
        0.018
      );
      const normalizedLevel = clampNumber((safeRms - displayNoiseFloor) / 0.025, 0, 1);
      const smoothing = normalizedLevel > state.micLevel ? 0.38 : 0.24;
      state.micLevel += (normalizedLevel - state.micLevel) * smoothing;
      if (state.micLevel < 0.01 && normalizedLevel <= 0.001) {
        state.micLevel = 0;
      }
      updateMicMeter(state.micLevel);
    }

    async function ensureAudioContextRunning(ctx) {
      if (!ctx || ctx.state !== "suspended" || typeof ctx.resume !== "function") {
        return true;
      }
      try {
        await ctx.resume();
      } catch (_) {
        // ignore; the caller will check the final state.
      }
      return ctx.state !== "suspended";
    }

    function stopLocalAsrMeter() {
      if (state.localAsrMeterRaf) {
        try {
          window.cancelAnimationFrame(state.localAsrMeterRaf);
        } catch (_) {
          // ignore
        }
        try {
          clearTimeout(state.localAsrMeterRaf);
        } catch (_) {
          // ignore
        }
      }
      state.localAsrMeterRaf = 0;
      state.localAsrMeterBuffer = null;
    }

    function startLocalAsrMeter(sessionId = null) {
      stopLocalAsrMeter();
      const token = sessionId == null ? state.micSession : Number(sessionId);
      const analyser = state.localAsrAnalyser;
      if (!analyser) {
        return;
      }
      const size = Math.max(32, Number(analyser.fftSize) || 512);
      state.localAsrMeterBuffer = new Uint8Array(size);
      const schedule =
        typeof window.requestAnimationFrame === "function"
          ? (fn) => window.requestAnimationFrame(fn)
          : (fn) => window.setTimeout(fn, 60);

      const tick = () => {
        if (token !== state.micSession || !state.micOpen || !state.localAsrAnalyser) {
          state.localAsrMeterRaf = 0;
          return;
        }
        const buffer = state.localAsrMeterBuffer;
        if (buffer && state.micSuspendDepth <= 0) {
          try {
            state.localAsrAnalyser.getByteTimeDomainData(buffer);
            let energy = 0;
            for (let i = 0; i < buffer.length; i++) {
              const n = (buffer[i] - 128) / 128;
              energy += n * n;
            }
            updateLocalAsrMicLevelFromRms(Math.sqrt(energy / buffer.length));
          } catch (_) {
            // ignore; the ASR frame path can still update the meter.
          }
        }
        state.localAsrMeterRaf = schedule(tick);
      };
      state.localAsrMeterRaf = schedule(tick);
    }

    function stopLocalAsrWatchdog() {
      if (state.localAsrWatchdogTimer) {
        clearInterval(state.localAsrWatchdogTimer);
      }
      state.localAsrWatchdogTimer = 0;
      state.localAsrNoFrameWarned = false;
      state.localAsrMutedWarned = false;
    }

    function startLocalAsrWatchdog(sessionId = null) {
      stopLocalAsrWatchdog();
      const token = sessionId == null ? state.micSession : Number(sessionId);
      state.localAsrLastFrameAt = performance.now();
      state.localAsrNoFrameWarned = false;
      state.localAsrMutedWarned = false;
      state.localAsrWatchdogTimer = window.setInterval(() => {
        if (token !== state.micSession || !state.micOpen || !state.localAsrRunning) {
          stopLocalAsrWatchdog();
          return;
        }
        if (state.micSuspendDepth > 0) {
          return;
        }
        const ctx = state.localAsrContext;
        if (ctx && ctx.state === "suspended" && typeof ctx.resume === "function") {
          ctx.resume().catch(() => {});
          return;
        }
        const startedAt = Number(state.localAsrStartedAt) || 0;
        const muted = isLocalAsrTrackMuted(state.localAsrStream) || state.localAsrInputMuted;
        if (muted) {
          state.localAsrInputMuted = true;
          state.stageVoiceRuntimeWarning = "麦克风轨道被系统静音";
          if (
            !state.localAsrMutedWarned &&
            startedAt > 0 &&
            performance.now() - startedAt > 1200
          ) {
            state.localAsrMutedWarned = true;
            setStatus("麦克风轨道被系统静音，请检查 Windows 输入设备、隐私权限或硬件静音键");
            updateMicButton();
          }
          return;
        }
        const lastFrameAt = Number(state.localAsrLastFrameAt) || 0;
        if (!state.localAsrNoFrameWarned && performance.now() - lastFrameAt > 2200) {
          state.localAsrNoFrameWarned = true;
          state.stageVoiceRuntimeWarning = "已开麦，但没有收到音频帧";
          setStatus("麦克风已开启，但没有收到音频，请检查系统输入设备");
          updateMicMeter(0);
          return;
        }
        const peakRms = Number(state.localAsrPeakRms) || 0;
        const lowLevelLine = Math.max(0.0018, (Number(state.localAsrSpeechThreshold) || 0.0035) * 0.55);
        if (
          !state.localAsrLowLevelWarned &&
          startedAt > 0 &&
          performance.now() - startedAt > 5500 &&
          peakRms > 0 &&
          peakRms < lowLevelLine
        ) {
          state.localAsrLowLevelWarned = true;
          if (!state.localAsrThresholdAutoAdjusted && state.localAsrSpeechThreshold > 0.0042) {
            const loweredThreshold = clampNumber(
              state.localAsrSpeechThreshold * 0.62,
              0.0022,
              0.0042
            );
            if (loweredThreshold < state.localAsrSpeechThreshold) {
              state.localAsrSpeechThreshold = loweredThreshold;
              state.localAsrThresholdAutoAdjusted = true;
              setStatus("麦克风输入偏低，已自动降低识别阈值一次");
              return;
            }
          }
          setStatus("麦克风输入音量很低，请检查系统输入设备或靠近麦克风");
        }
      }, 1200);
    }

    function resetLocalAsrPreSpeechBuffer() {
      state.localAsrPreSpeechBuffers = [];
      state.localAsrPreSpeechMs = 0;
    }

    function pushLocalAsrPreSpeechFrame(pcm16, frameMs) {
      if (!pcm16 || !pcm16.length) {
        return;
      }
      if (!Array.isArray(state.localAsrPreSpeechBuffers)) {
        state.localAsrPreSpeechBuffers = [];
      }
      state.localAsrPreSpeechBuffers.push({ pcm16, frameMs });
      state.localAsrPreSpeechMs = (Number(state.localAsrPreSpeechMs) || 0) + frameMs;
      while (
        state.localAsrPreSpeechBuffers.length > 0 &&
        state.localAsrPreSpeechMs > LOCAL_ASR_PRE_SPEECH_MS
      ) {
        const removed = state.localAsrPreSpeechBuffers.shift();
        state.localAsrPreSpeechMs = Math.max(
          0,
          (Number(state.localAsrPreSpeechMs) || 0) - (Number(removed?.frameMs) || 0)
        );
      }
    }

    function takeLocalAsrPreSpeechFrames() {
      if (!Array.isArray(state.localAsrPreSpeechBuffers) || !state.localAsrPreSpeechBuffers.length) {
        resetLocalAsrPreSpeechBuffer();
        return [];
      }
      const frames = state.localAsrPreSpeechBuffers
        .map((item) => item?.pcm16)
        .filter((chunk) => chunk && chunk.length);
      resetLocalAsrPreSpeechBuffer();
      return frames;
    }

    function resetLocalAsrManualCapture() {
      state.localAsrManualCaptureBuffers = [];
      state.localAsrManualCaptureMs = 0;
    }

    function pushLocalAsrManualCaptureFrame(pcm16, frameMs, rms = 0) {
      if (!pcm16 || !pcm16.length) {
        return;
      }
      if (!Array.isArray(state.localAsrManualCaptureBuffers)) {
        state.localAsrManualCaptureBuffers = [];
      }
      state.localAsrManualCaptureBuffers.push({
        pcm16,
        frameMs,
        rms: Math.max(0, Number(rms) || 0)
      });
      state.localAsrManualCaptureMs = (Number(state.localAsrManualCaptureMs) || 0) + frameMs;
      while (
        state.localAsrManualCaptureBuffers.length > 0
        && state.localAsrManualCaptureMs > LOCAL_ASR_MANUAL_CAPTURE_MAX_MS
      ) {
        const removed = state.localAsrManualCaptureBuffers.shift();
        state.localAsrManualCaptureMs = Math.max(
          0,
          (Number(state.localAsrManualCaptureMs) || 0) - (Number(removed?.frameMs) || 0)
        );
      }
    }

    function trimLocalAsrManualCaptureFrames(frames) {
      const source = Array.isArray(frames) ? frames.filter((item) => item?.pcm16?.length) : [];
      if (!source.length) {
        return [];
      }
      const peak = source.reduce(
        (value, item) => Math.max(value, Math.max(0, Number(item?.rms) || 0)),
        0
      );
      if (peak < 0.0015) {
        return source;
      }
      const speechFloor = Math.max(
        0.0012,
        Math.min(
          Math.max(0.0015, Number(state.localAsrSpeechThreshold) || 0.0035) * 0.72,
          peak * 0.45
        )
      );
      let first = source.findIndex((item) => (Number(item?.rms) || 0) >= speechFloor);
      let last = -1;
      for (let index = source.length - 1; index >= 0; index -= 1) {
        if ((Number(source[index]?.rms) || 0) >= speechFloor) {
          last = index;
          break;
        }
      }
      if (first < 0 || last < first) {
        return source;
      }
      let prePadMs = 260;
      while (first > 0 && prePadMs > 0) {
        first -= 1;
        prePadMs -= Math.max(0, Number(source[first]?.frameMs) || 0);
      }
      let postPadMs = 420;
      while (last + 1 < source.length && postPadMs > 0) {
        last += 1;
        postPadMs -= Math.max(0, Number(source[last]?.frameMs) || 0);
      }
      return source.slice(first, last + 1);
    }

    function resetLocalAsrUtteranceCapture() {
      state.localAsrBuffers = [];
      state.localAsrSpeeching = false;
      state.localAsrSpeechMs = 0;
      state.localAsrSilenceMs = 0;
      state.localAsrSpeechStartedDuringAssistant = false;
    }

    function queuePendingLocalAsrUtterance(utterance) {
      if (!utterance || !Array.isArray(utterance.chunks) || utterance.chunks.length <= 0) {
        return false;
      }
      if (!Array.isArray(state.localAsrPendingUtterances)) {
        state.localAsrPendingUtterances = [];
      }
      const queue = state.localAsrPendingUtterances;
      if (queue.length >= MAX_PENDING_LOCAL_ASR_UTTERANCES) {
        const tail = queue[queue.length - 1];
        if (tail && Array.isArray(tail.chunks)) {
          tail.chunks.push(...utterance.chunks);
          tail.speechMs = (Number(tail.speechMs) || 0) + (Number(utterance.speechMs) || 0);
          tail.peakRms = Math.max(Number(tail.peakRms) || 0, Number(utterance.peakRms) || 0);
          tail.startedDuringAssistant = (
            tail.startedDuringAssistant === true || utterance.startedDuringAssistant === true
          );
          return true;
        }
      }
      queue.push(utterance);
      return true;
    }

    async function transcribeQueuedLocalAsrUtterance(utterance, token) {
      if (!utterance || token !== state.micSession || !state.micOpen) {
        return false;
      }
      state.localAsrSending = true;
      const controller = new AbortController();
      state.localAsrAbortController = controller;
      try {
        const transcript = await transcribeLocalPcmChunks(utterance.chunks, controller.signal, true);
        if (token !== state.micSession || !state.micOpen) {
          return false;
        }
        if (!state.localAsrStreamingSessionId) {
          clearLocalAsrStreamingPreview();
        }
        if (transcript.text) {
          enqueueMicTranscript(transcript.text, token, {
            source: "voice_transcript",
            speechMs: utterance.speechMs,
            peakRms: utterance.peakRms,
            confidence: transcript.confidence,
            detectedLanguage: transcript.detectedLanguage,
            languageSelectionAmbiguous: transcript.languageSelectionAmbiguous,
            provider: transcript.provider,
            fallbackUsed: transcript.fallbackUsed,
            paralinguistic: transcript.paralinguistic,
            startedDuringAssistant: utterance.startedDuringAssistant === true
          });
        } else if (sendHiddenParalinguisticCue(transcript.paralinguistic, {
          source: "voice_paralinguistic",
          confidence: transcript.confidence
        })) {
          state.localAsrSessionTranscriptAccepted = true;
        } else {
          showEmptyTranscriptionFeedback();
          return false;
        }
        return true;
      } catch (err) {
        if (err?.name === "AbortError") {
          return false;
        }
        setStatus(`语音识别失败: ${err.message}`);
        return false;
      } finally {
        const ownsRequest = state.localAsrAbortController === controller;
        if (!ownsRequest) {
          return;
        }
        state.localAsrAbortController = null;
        state.localAsrSending = false;
        if (token !== state.micSession || !state.micOpen) {
          state.localAsrPendingUtterances = [];
          return;
        }
        const next = Array.isArray(state.localAsrPendingUtterances)
          ? state.localAsrPendingUtterances.shift()
          : null;
        if (next) {
          void transcribeQueuedLocalAsrUtterance(next, token);
        }
      }
    }

    async function flushLocalAsrUtterance(force = false, sessionId = null) {
      const token = sessionId == null ? state.micSession : Number(sessionId);
      if (token !== state.micSession || !Array.isArray(state.localAsrBuffers) || !state.localAsrBuffers.length) {
        return false;
      }
      const speechMs = Number(state.localAsrSpeechMs) || 0;
      if (!force && speechMs < state.localAsrMinSpeechMs) {
        cancelLocalAsrStreaming();
        resetLocalAsrUtteranceCapture();
        setListeningPresence("release", { sessionId: token });
        return false;
      }
      const utterance = {
        chunks: state.localAsrBuffers.slice(),
        speechMs,
        peakRms: Number(state.localAsrPeakRms) || 0,
        startedDuringAssistant: state.localAsrSpeechStartedDuringAssistant === true
      };
      // The final PCM request is authoritative. Cancel queued preview chunks so
      // they cannot delay or compete with the final transcription.
      cancelLocalAsrStreaming();
      resetLocalAsrUtteranceCapture();
      setListeningPresence("release", { sessionId: token });
      if (state.localAsrSending) {
        return queuePendingLocalAsrUtterance(utterance);
      }
      return transcribeQueuedLocalAsrUtterance(utterance, token);
    }

    function handleLocalAsrFrame(floatData, inputSampleRate, sessionId = null) {
      const token = sessionId == null ? state.micSession : Number(sessionId);
      if (token !== state.micSession || !state.micOpen) {
        return;
      }
      const pcm16 = downsampleTo16k(floatData, inputSampleRate);
      if (!pcm16.length) {
        return;
      }
      let energy = 0;
      for (let i = 0; i < pcm16.length; i++) {
        const n = pcm16[i] / 32768;
        energy += n * n;
      }
      const rms = Math.sqrt(energy / pcm16.length);
      const frameMs = (pcm16.length / 16000) * 1000;
      pushLocalAsrManualCaptureFrame(pcm16, frameMs, rms);
      updateLocalAsrMicLevelFromRms(rms);

      const baseThreshold = clampNumber(state.localAsrSpeechThreshold || 0.0035, 0.0015, 0.05);
      const adaptiveThreshold = Math.max(
        baseThreshold,
        clampNumber(state.localAsrNoiseFloor * 1.8 + 0.001, 0.0015, 0.02)
      );
      const isSpeech = state.sileroVadSessionEnabled === true && state.sileroVadReady === true
        ? state.sileroVadActive === true
        : rms >= adaptiveThreshold;

      if (isSpeech) {
        const listeningLevel = clampNumber(
          (rms - adaptiveThreshold) / Math.max(0.004, adaptiveThreshold * 5.5),
          0.18,
          1
        );
        if (!state.localAsrSpeeching) {
          beginLocalAsrStreaming(token);
          setListeningPresence("hearing", { sessionId: token, level: listeningLevel });
          state.localAsrSpeechStartedDuringAssistant = (
            state.chatBusy === true || isAssistantSpeechOrStreamActive()
          );
          handleUserSpeechStart({
            reason: "local_asr_speech_start",
            rms,
            confirmedTranscript: false
          });
          if (state.micPendingTranscript) {
            schedulePendingMicTranscriptFlush(FULL_DUPLEX_ACTIVE_SPEECH_HOLD_MS);
          }
          const preSpeechFrames = takeLocalAsrPreSpeechFrames();
          if (preSpeechFrames.length) {
            state.localAsrBuffers.push(...preSpeechFrames);
          }
        }
        setListeningPresence("hearing", { sessionId: token, level: listeningLevel });
        state.localAsrSpeeching = true;
        state.localAsrSpeechMs += frameMs;
        state.localAsrSilenceMs = 0;
        state.localAsrBuffers.push(pcm16);
        queueLocalAsrStreamingFrame(pcm16, frameMs, token);
        if (state.localAsrSpeechMs >= state.localAsrMaxSpeechMs) {
          flushLocalAsrUtterance(true, token);
        }
        return;
      }

      if (!state.localAsrSpeeching) {
        // Keep tracking environment noise to auto-adapt threshold.
        state.localAsrNoiseFloor = state.localAsrNoiseFloor * 0.94 + rms * 0.06;
        pushLocalAsrPreSpeechFrame(pcm16, frameMs);
      }

      if (!state.localAsrSpeeching) {
        return;
      }
      state.localAsrSilenceMs += frameMs;
      if (state.localAsrSilenceMs < state.localAsrSilenceTriggerMs) {
        setListeningPresence("release", { sessionId: token });
        state.localAsrBuffers.push(pcm16);
        queueLocalAsrStreamingFrame(pcm16, frameMs, token);
        return;
      }
      flushLocalAsrUtterance(false, token);
    }

    function clearLocalAsrGraph() {
      if (sileroVadAdapter) {
        void sileroVadAdapter.stop();
      }
      cancelLocalAsrStreaming();
      stopLocalAsrMeter();
      stopLocalAsrWatchdog();
      clearListeningPresence({ force: true });
      if (state.localAsrProcessor) {
        try {
          state.localAsrProcessor.disconnect();
        } catch (_) {
          // ignore
        }
      }
      if (state.localAsrAnalyser) {
        try {
          state.localAsrAnalyser.disconnect();
        } catch (_) {
          // ignore
        }
      }
      if (state.localAsrSource) {
        try {
          state.localAsrSource.disconnect();
        } catch (_) {
          // ignore
        }
      }
      if (state.localAsrContext) {
        try {
          state.localAsrContext.close();
        } catch (_) {
          // ignore
        }
      }
      if (state.localAsrStream) {
        for (const track of state.localAsrStream.getTracks()) {
          try {
            track.stop();
          } catch (_) {
            // ignore
          }
        }
      }
      state.localAsrStream = null;
      state.localAsrContext = null;
      state.localAsrSource = null;
      state.localAsrProcessor = null;
      state.localAsrAnalyser = null;
      state.localAsrLastFrameAt = 0;
      state.localAsrPeakRms = 0;
      state.localAsrStartedAt = 0;
      state.localAsrLowLevelWarned = false;
      state.localAsrThresholdAutoAdjusted = false;
      state.localAsrMutedWarned = false;
      state.localAsrInputDeviceId = "";
      state.localAsrInputDeviceLabel = "";
      state.localAsrInputMuted = false;
      state.stageVoiceRuntimeWarning = "";
      state.sileroVadReady = false;
      state.sileroVadActive = false;
      state.sileroVadSessionEnabled = false;
      state.localAsrRunning = false;
      state.localAsrSpeeching = false;
      state.localAsrSpeechMs = 0;
      state.localAsrSilenceMs = 0;
      state.localAsrLastSpeechInterruptAt = 0;
      state.localAsrBuffers = [];
      state.localAsrPendingUtterances = [];
      resetLocalAsrPreSpeechBuffer();
      resetLocalAsrManualCapture();
      state.localAsrSessionTranscriptAccepted = false;
      state.localAsrNoiseFloor = 0.0008;
      state.micLevel = 0;
      updateMicMeter(0);
    }

    function buildLocalAsrAudioConstraints(deviceId = "") {
      const audio = {
        channelCount: { ideal: 1 },
        sampleRate: { ideal: 16000 },
        latency: { ideal: 0 },
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true
      };
      const safeDeviceId = String(deviceId || "").trim();
      if (safeDeviceId) {
        audio.deviceId = { exact: safeDeviceId };
      }
      return { audio, video: false };
    }

    function getLocalAsrAudioTrack(stream) {
      return stream && typeof stream.getAudioTracks === "function"
        ? (stream.getAudioTracks()[0] || null)
        : null;
    }

    function getLocalAsrTrackLabel(stream) {
      return String(getLocalAsrAudioTrack(stream)?.label || "").trim();
    }

    function isLocalAsrTrackMuted(stream) {
      return !!getLocalAsrAudioTrack(stream)?.muted;
    }

    function isDisfavoredLocalAsrInputLabel(label) {
      return /stereo mix|loopback|what u hear|\u7acb\u4f53\u58f0\u6df7\u97f3/i.test(
        String(label || "")
      );
    }

    function scoreLocalAsrInputDevice(device) {
      const label = String(device?.label || "").toLowerCase();
      if (!label) {
        return 0;
      }
      let score = 0;
      if (/microphone|mic|\u9ea6\u514b\u98ce|\u9635\u5217/.test(label)) {
        score += 80;
      }
      if (/realtek|array/.test(label)) {
        score += 12;
      }
      if (/default|communications/.test(label)) {
        score -= 4;
      }
      if (/stereo mix|loopback|what u hear|\u7acb\u4f53\u58f0\u6df7\u97f3/.test(label)) {
        score -= 120;
      }
      return score;
    }

    function choosePreferredLocalAsrInputDevice(devices) {
      const inputs = Array.isArray(devices)
        ? devices.filter((device) => device && device.kind === "audioinput")
        : [];
      if (!inputs.length) {
        return null;
      }
      const ranked = inputs
        .map((device, index) => ({ device, index, score: scoreLocalAsrInputDevice(device) }))
        .sort((a, b) => (b.score - a.score) || (a.index - b.index));
      const best = ranked[0];
      return best && best.score > 0 ? best.device : null;
    }

    function rememberLocalAsrInputDevice(stream, devices = []) {
      const track = getLocalAsrAudioTrack(stream);
      const settings = track && typeof track.getSettings === "function" ? (track.getSettings() || {}) : {};
      state.localAsrInputDeviceId = String(settings.deviceId || "").trim();
      state.localAsrInputDeviceLabel = String(track?.label || "").trim();
      state.localAsrInputMuted = !!track?.muted;
      state.localAsrInputDeviceCandidates = Array.isArray(devices)
        ? devices
            .filter((device) => device && device.kind === "audioinput")
            .map((device) => String(device.label || "(hidden label)").trim())
            .filter(Boolean)
            .slice(0, 12)
        : [];
    }

    async function openPreferredLocalAsrStream(media) {
      let stream = await media.getUserMedia(buildLocalAsrAudioConstraints());
      let devices = [];
      try {
        devices = await media.enumerateDevices();
      } catch (_) {
        devices = [];
      }
      const currentTrack = getLocalAsrAudioTrack(stream);
      const currentSettings =
        currentTrack && typeof currentTrack.getSettings === "function"
          ? (currentTrack.getSettings() || {})
          : {};
      const currentDeviceId = String(currentSettings.deviceId || "").trim();
      const currentLabel = getLocalAsrTrackLabel(stream);
      if (!isDisfavoredLocalAsrInputLabel(currentLabel) && !isLocalAsrTrackMuted(stream)) {
        rememberLocalAsrInputDevice(stream, devices);
        return stream;
      }

      const inputs = Array.isArray(devices)
        ? devices.filter((device) => device && device.kind === "audioinput")
        : [];
      const ranked = inputs
        .map((device, index) => ({ device, index, score: scoreLocalAsrInputDevice(device) }))
        .sort((a, b) => (b.score - a.score) || (a.index - b.index));
      for (const item of ranked) {
        const candidate = item.device;
        const candidateDeviceId = String(candidate?.deviceId || "").trim();
        if (!candidateDeviceId || candidateDeviceId === currentDeviceId || item.score <= 0) {
          continue;
        }
        let candidateStream = null;
        try {
          candidateStream = await media.getUserMedia(
            buildLocalAsrAudioConstraints(candidateDeviceId)
          );
          if (
            isDisfavoredLocalAsrInputLabel(getLocalAsrTrackLabel(candidateStream)) ||
            isLocalAsrTrackMuted(candidateStream)
          ) {
            for (const track of candidateStream.getTracks()) {
              try {
                track.stop();
              } catch (_) {
                // ignore
              }
            }
            candidateStream = null;
            continue;
          }
          for (const track of stream.getTracks()) {
            try {
              track.stop();
            } catch (_) {
              // ignore
            }
          }
          stream = candidateStream;
          candidateStream = null;
          break;
        } catch (_) {
          if (candidateStream) {
            for (const track of candidateStream.getTracks()) {
              try {
                track.stop();
              } catch (_) {
                // ignore
              }
            }
          }
        }
      }
      rememberLocalAsrInputDevice(stream, devices);
      return stream;
    }

    async function startLocalAsrLoop(sessionId = null) {
      if (state.localAsrRunning) {
        return true;
      }
      const token = sessionId == null ? state.micSession : Number(sessionId);
      const media = navigator.mediaDevices;
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!media || typeof media.getUserMedia !== "function" || !AudioCtx) {
        setStatus("当前环境不支持本地语音识别");
        return false;
      }
      let stream = null;
      try {
        stream = await openPreferredLocalAsrStream(media);
      } catch (err) {
        const name = String(err?.name || "");
        if (name === "NotAllowedError" || name === "PermissionDeniedError") {
          setStatus("请允许麦克风权限后再开麦");
        } else {
          setStatus("麦克风开启失败");
        }
        return false;
      }
      if (token !== state.micSession || !state.micOpen) {
        for (const track of stream.getTracks()) {
          try {
            track.stop();
          } catch (_) {
            // ignore
          }
        }
        return false;
      }
      const audioTrack = stream.getAudioTracks()[0] || null;
      if (audioTrack) {
        audioTrack.onmute = () => {
          state.localAsrInputMuted = true;
          state.stageVoiceRuntimeWarning = "麦克风轨道被系统静音";
          if (token === state.micSession && state.micOpen) {
            setListeningPresence("release", { sessionId: token });
            setStatus("麦克风轨道被系统静音，请检查 Windows 输入设备、隐私权限或硬件静音键");
            updateMicButton();
          }
        };
        audioTrack.onunmute = () => {
          state.localAsrInputMuted = false;
          state.stageVoiceRuntimeWarning = "";
          if (token === state.micSession && state.micOpen) {
            setListeningPresence("armed", { sessionId: token });
            setStatus("开麦中...");
            updateMicButton();
          }
        };
        audioTrack.onended = () => {
          if (token === state.micSession && state.micOpen) {
            clearListeningPresence({ force: true });
            setStatus("麦克风输入已断开，请重新开麦");
          }
        };
      }

      const ctx = new AudioCtx();
      const contextReady = await ensureAudioContextRunning(ctx);
      if (!contextReady) {
        setStatus("麦克风音频未启动，请再点一次开麦");
        try {
          ctx.close();
        } catch (_) {
          // ignore
        }
        for (const track of stream.getTracks()) {
          try {
            track.stop();
          } catch (_) {
            // ignore
          }
        }
        return false;
      }

      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 512;
      analyser.smoothingTimeConstant = 0.65;
      const processor = ctx.createScriptProcessor(state.localAsrProcessorBufferSize || 2048, 1, 1);
      const sessionToken = token;
      processor.onaudioprocess = (evt) => {
        if (sessionToken !== state.micSession) {
          return;
        }
        if (!state.micOpen || state.micSuspendDepth > 0) {
          return;
        }
        state.localAsrLastFrameAt = performance.now();
        if (state.stageVoiceRuntimeWarning) {
          state.stageVoiceRuntimeWarning = "";
        }
        state.localAsrNoFrameWarned = false;
        const input = evt.inputBuffer.getChannelData(0);
        handleLocalAsrFrame(input, ctx.sampleRate, sessionToken);
      };
      source.connect(analyser);
      source.connect(processor);
      processor.connect(ctx.destination);
      if (sessionToken !== state.micSession || !state.micOpen) {
        try {
          processor.disconnect();
        } catch (_) {
          // ignore
        }
        try {
          analyser.disconnect();
        } catch (_) {
          // ignore
        }
        try {
          source.disconnect();
        } catch (_) {
          // ignore
        }
        try {
          ctx.close();
        } catch (_) {
          // ignore
        }
        for (const track of stream.getTracks()) {
          try {
            track.stop();
          } catch (_) {
            // ignore
          }
        }
        return false;
      }

      state.localAsrStream = stream;
      state.localAsrContext = ctx;
      state.localAsrSource = source;
      state.localAsrProcessor = processor;
      state.localAsrAnalyser = analyser;
      state.localAsrRunning = true;
      state.localAsrSpeeching = false;
      state.localAsrSpeechMs = 0;
      state.localAsrSilenceMs = 0;
      state.localAsrBuffers = [];
      state.localAsrPendingUtterances = [];
      resetLocalAsrPreSpeechBuffer();
      resetLocalAsrManualCapture();
      state.localAsrSessionTranscriptAccepted = false;
      state.localAsrNoiseFloor = 0.0008;
      state.localAsrLastFrameAt = performance.now();
      state.localAsrPeakRms = 0;
      state.localAsrStartedAt = performance.now();
      state.localAsrNoFrameWarned = false;
      state.localAsrLowLevelWarned = false;
      state.localAsrThresholdAutoAdjusted = false;
      state.localAsrMutedWarned = false;
      state.localAsrInputMuted = !!audioTrack?.muted;
      if (state.sileroVadEnabled === true && sileroVadAdapter) {
        state.sileroVadSessionEnabled = false;
        void sileroVadAdapter.start(stream, {
          onSpeechStart: () => {
            if (
              sessionToken !== state.micSession
              || !state.micOpen
              || state.sileroVadSessionEnabled !== true
            ) {
              return;
            }
            setListeningPresence("hearing", { sessionId: sessionToken, level: 0.72 });
          },
          onSpeechEnd: () => {
            if (
              sessionToken !== state.micSession
              || !state.micOpen
              || state.sileroVadSessionEnabled !== true
              || state.localAsrSpeeching !== true
            ) {
              return;
            }
            void flushLocalAsrUtterance(false, sessionToken);
          },
          onVADMisfire: () => {
            if (
              sessionToken !== state.micSession
              || !state.micOpen
              || state.sileroVadSessionEnabled !== true
            ) {
              return;
            }
            cancelLocalAsrStreaming();
            resetLocalAsrUtteranceCapture();
            setListeningPresence("release", { sessionId: sessionToken });
          },
          onUnavailable: () => {
            if (sessionToken === state.micSession) {
              state.sileroVadSessionEnabled = false;
            }
          }
        }).then((ready) => {
          if (
            ready === true
            && sessionToken === state.micSession
            && state.micOpen
            && state.localAsrSpeeching !== true
            && Number(state.localAsrManualCaptureMs || 0) < 120
          ) {
            state.sileroVadSessionEnabled = true;
          }
        });
      }
      startLocalAsrMeter(sessionToken);
      startLocalAsrWatchdog(sessionToken);
      setListeningPresence("armed", { sessionId: sessionToken });
      return true;
    }

    function stopLocalAsrLoop(forceFlush = false, sessionId = null) {
      if (forceFlush) {
        flushLocalAsrUtterance(true, sessionId);
      }
      cancelLocalAsrRequest();
      clearLocalAsrGraph();
    }

    function scheduleMicRecognitionStart(delayMs = 0) {
      if (state.asrMode === "local_vosk") {
        return;
      }
      clearMicRestartTimer();
      if (!state.micOpen || !state.recognition || state.micSuspendDepth > 0) {
        updateMicButton();
        return;
      }
      const backoff = Math.min(2500, 260 + state.micRetryCount * 320);
      const waitMs = Math.max(backoff, Math.max(0, Number(delayMs) || 0));
      state.micRestartTimer = window.setTimeout(() => {
        state.micRestartTimer = 0;
        if (!state.micOpen || !state.recognition || state.micSuspendDepth > 0) {
          updateMicButton();
          return;
        }
        try {
          state.recognition.start();
        } catch (_) {
          state.micRetryCount = Math.min(8, state.micRetryCount + 1);
          scheduleMicRecognitionStart(900);
        }
        updateMicButton();
      }, waitMs);
    }

    function stopMicLoop(manualClose = false) {
      clearMicRestartTimer();
      if (manualClose) {
        clearListeningPresence({ force: true });
        clearMicQueueRetryTimer();
        state.micSession += 1;
        state.micOpen = false;
        state.micSuspendDepth = 0;
        state.micRetryCount = 0;
        state.micQueue = [];
        clearPendingMicTranscriptTimer();
        state.micPendingTranscript = null;
        state.micPendingTranscriptUpdatedAt = 0;
        state.wakeCooldownUntil = Date.now() + 1200;
      }
      if (state.asrMode === "local_vosk") {
        stopLocalAsrLoop(false, state.micSession);
        if (manualClose) {
          scheduleWakeWordStart(420);
        }
        updateMicButton();
        return;
      }
      if (state.recognition) {
        try {
          if (manualClose && typeof state.recognition.abort === "function") {
            state.recognition.abort();
          } else {
            state.recognition.stop();
          }
        } catch (_) {
          // ignore
        }
      }
      if (manualClose) {
        state.recognitionActive = false;
        scheduleWakeWordStart(420);
      }
      updateMicButton();
    }

    async function startMicLoop() {
      stopWakeWordListener(true);
      clearMicQueueRetryTimer();
      state.micSession += 1;
      const token = state.micSession;
      state.micOpen = true;
      clearStageVoiceFeedbackMessage();
      state.micRetryCount = 0;
      state.micQueue = [];
      if (state.asrMode === "local_vosk") {
        const ok = await startLocalAsrLoop(token);
        if (token !== state.micSession || !state.micOpen) {
          stopLocalAsrLoop(false, state.micSession);
          scheduleWakeWordStart(420);
          updateMicButton();
          return;
        }
        if (!ok) {
          state.micOpen = false;
          scheduleWakeWordStart(420);
          updateMicButton();
          return;
        }
      } else {
        if (!state.recognition) {
          state.micOpen = false;
          scheduleWakeWordStart(420);
          updateMicButton();
          return;
        }
        const ok = await ensureMicPermission();
        if (!ok) {
          state.micOpen = false;
          scheduleWakeWordStart(420);
          updateMicButton();
          return;
        }
        scheduleMicRecognitionStart(0);
      }
      if (token === state.micSession && state.micOpen && state.micSuspendDepth <= 0) {
        setListeningPresence("armed", { sessionId: token });
      }
      updateMicButton();
    }

    function shouldKeepListeningDuringAssistant() {
      return state.micKeepListening === true
        && state.conversationMode?.interruptTtsOnUserSpeech === true;
    }

    function pauseMicForAssistant() {
      if (!(state.recognitionAvailable || state.localAsrAvailable) || !state.micOpen) {
        return false;
      }
      if (shouldKeepListeningDuringAssistant()) {
        updateMicButton();
        return false;
      }
      state.micSuspendDepth += 1;
      clearListeningPresence({ force: true });
      if (state.asrMode === "local_vosk") {
        updateMicButton();
        return true;
      }
      stopMicLoop(false);
      return true;
    }

    function resumeMicAfterAssistant() {
      if (!state.micOpen) {
        return false;
      }
      if (shouldKeepListeningDuringAssistant()) {
        updateMicButton();
        return false;
      }
      if (state.micSuspendDepth <= 0) {
        updateMicButton();
        return false;
      }
      state.micSuspendDepth -= 1;
      if (state.micSuspendDepth <= 0) {
        state.micSuspendDepth = 0;
        if (!(state.recognitionAvailable || state.localAsrAvailable)) {
          updateMicButton();
          return true;
        }
        if (state.asrMode === "local_vosk") {
          flushLocalAsrUtterance(true, state.micSession);
        } else {
          scheduleMicRecognitionStart(220);
        }
        setListeningPresence("armed", { sessionId: state.micSession });
      }
      updateMicButton();
      return true;
    }

    function enqueueMicTranscript(text, sessionId = null, opts = {}) {
      const token = sessionId == null ? state.micSession : Number(sessionId);
      if (token !== state.micSession || !state.micOpen) {
        return;
      }
      const cleaned = cleanAsrText(text, 300);
      if (!hasAsrSemanticContent(cleaned)) {
        return;
      }
      sendAsrTranscript(cleaned, {
        source: opts.source || "voice_transcript",
        interruptReason: "voice_transcript",
        ...(opts.interruptReason ? { interruptReason: opts.interruptReason } : {}),
        ...(Number.isFinite(Number(opts.confidence)) ? { confidence: Number(opts.confidence) } : {}),
        ...(opts.detectedLanguage ? { detectedLanguage: String(opts.detectedLanguage) } : {}),
        ...(opts.languageSelectionAmbiguous === true ? { languageSelectionAmbiguous: true } : {}),
        ...(Number(opts.speechMs || opts.speech_ms) > 0 ? { speechMs: Number(opts.speechMs || opts.speech_ms) } : {}),
        ...(Number(opts.peakRms || opts.peak_rms) > 0 ? { peakRms: Number(opts.peakRms || opts.peak_rms) } : {}),
        ...(opts.paralinguistic ? { paralinguistic: opts.paralinguistic } : {}),
        ...(opts.startedDuringAssistant === true ? { startedDuringAssistant: true } : {}),
        forceMerge: opts.forceMerge === true
      });
    }

    function isAssistantSpeechOrStreamActive() {
      const phase = String(state.speechPhase || "").trim().toLowerCase();
      return state.ttsContextSpeaking === true
        || state.streamSpeakWorking === true
        || phase === "speaking";
    }

    async function runMicQueue() {
      if (state.micQueueWorking) {
        return;
      }
      state.micQueueWorking = true;
      try {
        while (state.micQueue.length > 0) {
          const peek = state.micQueue[0];
          if (!state.micOpen && !(peek && typeof peek === "object" && peek.allowWhenMicClosed === true)) {
            clearMicQueueRetryTimer();
            state.micQueue = [];
            break;
          }
          const queuedSession = Number(peek?.micSession);
          if (
            peek && typeof peek === "object"
            && peek.allowWhenMicClosed !== true
            && Number.isFinite(queuedSession)
            && queuedSession !== Number(state.micSession || 0)
          ) {
            state.micQueue.shift();
            state.micQueueLastDroppedReason = "stale_mic_session";
            continue;
          }
          const allowVoiceInterrupt = state.conversationMode?.interruptTtsOnUserSpeech === true;
          const assistantTurnOrAudioActive = state.chatBusy === true || isAssistantSpeechOrStreamActive();
          const preservePriorSpeech = allowVoiceInterrupt
            && peek?.startedDuringAssistant === true
            && String(peek?.bargeInKind || "") === "substantive";
          if (preservePriorSpeech && state.chatBusy === true) {
            state.micQueueLastDeferredAt = Date.now();
            state.micQueueLastDeferredReason = "continuation_waiting_for_model";
            if (!state.micQueueRetryTimer) {
              const retryTimer = (window.setTimeout || root.setTimeout || setTimeout)(() => {
                if (state.micQueueRetryTimer !== retryTimer) {
                  return;
                }
                state.micQueueRetryTimer = 0;
                runMicQueue();
              }, Math.max(120, NO_BARGE_IN_VOICE_QUEUE_RETRY_MS));
              state.micQueueRetryTimer = retryTimer;
            }
            break;
          }
          if (!allowVoiceInterrupt && assistantTurnOrAudioActive) {
            const queuedAt = Number(peek?.queuedAt || Date.now());
            const waitedMs = Math.max(0, Date.now() - queuedAt);
            if (waitedMs >= NO_BARGE_IN_VOICE_QUEUE_MAX_WAIT_MS) {
              state.micQueue.shift();
              state.micQueueLastDroppedReason = "no_barge_in_wait_timeout";
              continue;
            }
            state.micQueueLastDeferredAt = Date.now();
            state.micQueueLastDeferredReason = state.chatBusy === true
              ? "assistant_turn_busy"
              : "assistant_audio_active";
            if (!state.micQueueRetryTimer) {
              const retryTimer = (window.setTimeout || root.setTimeout || setTimeout)(() => {
                if (state.micQueueRetryTimer !== retryTimer) {
                  return;
                }
                state.micQueueRetryTimer = 0;
                runMicQueue();
              }, Math.max(120, NO_BARGE_IN_VOICE_QUEUE_RETRY_MS));
              state.micQueueRetryTimer = retryTimer;
            }
            break;
          }
          clearMicQueueRetryTimer();
          const item = state.micQueue.shift();
          if (!item) {
            continue;
          }
          if (!state.micOpen && item.allowWhenMicClosed !== true) {
            continue;
          }
          const next = typeof item === "string" ? item : String(item.text || "").trim();
          if (!next) {
            continue;
          }
          ui.chatInput.value = "";
          await requestAssistantReply(next, {
            showUser: item?.hiddenUser !== true,
            rememberUser: item?.hiddenUser !== true,
            auto: false,
            inputModality: "voice",
            interruptTts: allowVoiceInterrupt && !preservePriorSpeech,
            interruptActive: allowVoiceInterrupt && !preservePriorSpeech,
            preservePriorSpeech,
            interruptReason: typeof item === "object" ? item.interruptReason || "voice_transcript" : "voice_transcript",
            asrContext: typeof item === "object" ? item.asr_context || null : null,
            speechTurnWaitMs: allowVoiceInterrupt ? undefined : NO_BARGE_IN_VOICE_QUEUE_MAX_WAIT_MS,
            silentError: false
          });
        }
      } finally {
        if (!state.micQueue.length) {
          clearMicQueueRetryTimer();
        }
        state.micQueueWorking = false;
      }
    }

    function setupSpeechRecognition() {
      const hasLocalAsr =
        !!(navigator.mediaDevices && typeof navigator.mediaDevices.getUserMedia === "function") &&
        !!(window.AudioContext || window.webkitAudioContext);
      state.localAsrAvailable = hasLocalAsr;

      const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!Recognition) {
        state.recognitionAvailable = false;
        state.recognition = null;
        if (hasLocalAsr) {
          state.asrMode = "local_vosk";
        }
        updateMicButton();
        return;
      }

      const recog = new Recognition();
      recog.lang = getBrowserRecognitionLanguage();
      recog.continuous = true;
      recog.interimResults = false;
      recog.maxAlternatives = 1;

      recog.onstart = () => {
        state.recognitionActive = true;
        state.micRetryCount = 0;
        if (state.micOpen && state.micSuspendDepth === 0) {
          setStatus("开麦中...");
        }
        updateMicButton();
      };
      recog.onerror = (event) => {
        state.recognitionActive = false;
        const code = String(event?.error || "");
        if (code === "not-allowed" || code === "service-not-allowed") {
          state.micOpen = false;
          setStatus("麦克风权限被拒绝");
        } else if (code === "audio-capture") {
          state.micRetryCount = Math.min(8, state.micRetryCount + 1);
          setStatus("麦克风不可用，请检查设备");
        } else if (code === "network") {
          state.micRetryCount = Math.min(8, state.micRetryCount + 1);
          setStatus("语音识别网络异常，正在重试");
        } else if (code && code !== "aborted" && code !== "no-speech") {
          state.micRetryCount = Math.min(8, state.micRetryCount + 1);
          setStatus("语音输入失败");
        }
        updateMicButton();
      };
      recog.onend = () => {
        state.recognitionActive = false;
        if (state.micOpen && state.micSuspendDepth === 0) {
          scheduleMicRecognitionStart(220);
          setStatus("开麦中...");
        } else {
          setStatus("待机");
        }
        updateMicButton();
      };
      recog.onresult = (event) => {
        for (let i = event.resultIndex || 0; i < (event.results?.length || 0); i++) {
          const result = event.results[i];
          if (!result || !result.isFinal) {
            continue;
          }
          const transcript = result?.[0]?.transcript?.trim();
          if (transcript) {
            enqueueMicTranscript(transcript, state.micSession, {
              source: "voice_transcript",
              confidence: Number(result?.[0]?.confidence || 0)
            });
          }
        }
      };

      state.recognition = recog;
      state.recognitionAvailable = true;
      if (state.localAsrAvailable) {
        // Prefer local Vosk ASR to avoid browser cloud recognition instability.
        state.asrMode = "local_vosk";
      } else {
        state.asrMode = "webspeech";
      }
      setupWakeWordRecognition(Recognition);
      updateMicButton();
    }

    function snapshotPendingLocalAsr() {
      if (
        state.localAsrSessionTranscriptAccepted !== true
        && Array.isArray(state.localAsrManualCaptureBuffers)
        && state.localAsrManualCaptureBuffers.length > 0
      ) {
        const captureFrames = trimLocalAsrManualCaptureFrames(
          state.localAsrManualCaptureBuffers
        );
        return {
          chunks: captureFrames
            .map((item) => item?.pcm16)
            .filter((chunk) => chunk && chunk.length),
          speechMs: captureFrames.reduce(
            (total, item) => total + Math.max(0, Number(item?.frameMs) || 0),
            0
          ),
          manualCapture: true
        };
      }
      const chunks = Array.isArray(state.localAsrBuffers) ? state.localAsrBuffers.slice() : [];
      const speechMs = Number(state.localAsrSpeechMs) || 0;
      return { chunks, speechMs };
    }

    async function waitLocalAsrSendingDone(timeoutMs = 450) {
      const started = Date.now();
      while (state.localAsrSending && Date.now() - started < timeoutMs) {
        await new Promise((resolve) => setTimeout(resolve, 40));
      }
      return state.localAsrSending !== true;
    }

    async function transcribeSnapshotAfterMicClose(snapshot) {
      if (!snapshot || !Array.isArray(snapshot.chunks) || snapshot.chunks.length === 0) {
        return false;
      }
      const minCloseMs = snapshot.manualCapture === true
        ? 90
        : Math.max(90, Math.min(state.localAsrMinSpeechMs || 180, 220));
      if ((Number(snapshot.speechMs) || 0) < minCloseMs) {
        return false;
      }
      try {
        const transcript = await transcribeLocalPcmChunks(snapshot.chunks, undefined, true);
        if (!transcript.text) {
          if (sendHiddenParalinguisticCue(transcript.paralinguistic, {
            source: "voice_close_paralinguistic",
            confidence: transcript.confidence,
            allowWhenMicClosed: true
          })) {
            return true;
          }
          showEmptyTranscriptionFeedback();
          return false;
        }
        const ok = sendAsrTranscript(transcript.text, {
          source: "voice_close_transcript",
          interruptReason: "voice_close_transcript",
          allowWhenMicClosed: true,
          speechMs: snapshot.speechMs,
          peakRms: state.localAsrPeakRms,
          confidence: transcript.confidence,
          detectedLanguage: transcript.detectedLanguage,
          languageSelectionAmbiguous: transcript.languageSelectionAmbiguous,
          paralinguistic: transcript.paralinguistic,
          forceMerge: false
        });
        if (!ok) {
          return false;
        }
        return true;
      } catch (err) {
        console.warn("transcribeSnapshotAfterMicClose failed:", err);
        return false;
      }
    }

    async function toggleMicOpen() {
      if (state.micToggleBusy) {
        return;
      }
      if (!(state.recognitionAvailable || state.localAsrAvailable)) {
        setStatus("语音输入不可用");
        return;
      }
      if (
        state.asrMode === "local_vosk"
        && state.localAsrWarmupRequired === true
        && state.localAsrWarmupStatus !== "ready"
      ) {
        setStatus("语音仍在初始化，请稍候");
        return;
      }
      state.micToggleBusy = true;
      try {
        if (state.micOpen) {
          let closeSnapshot = null;
          if (state.asrTranscribeOnClose && state.asrMode === "local_vosk") {
            cancelLocalAsrStreaming();
            await waitLocalAsrSendingDone(450);
            if (state.localAsrSessionTranscriptAccepted !== true) {
              closeSnapshot = snapshotPendingLocalAsr();
            }
          }
          stopMicLoop(true);
          if (closeSnapshot) {
            setStatus("关闭中，处理最后一句...");
            await transcribeSnapshotAfterMicClose(closeSnapshot);
          }
          setStatus("开麦已关闭");
          return;
        }
        await startMicLoop();
        if (state.micOpen) {
          if (state.asrMode === "local_vosk" && state.localAsrInputMuted) {
            setStatus("麦克风轨道被系统静音，请检查 Windows 输入设备、隐私权限或硬件静音键");
          } else {
            setStatus(state.micKeepListening ? "开麦已开启（通话模式）" : "开麦已开启");
          }
        }
      } finally {
        state.micToggleBusy = false;
        updateMicButton();
      }
    }


    return {
      updateMicMeter,
      updateMicButton,
      clearLocalAsrWarmupTimer,
      refreshLocalAsrWarmupStatus,
      startLocalAsrWarmupPolling,
      clearMicRestartTimer,
      setListeningPresence,
      clearListeningPresence,
      ensureMicPermission,
      floatToInt16,
      downsampleTo16k,
      pcmChunksToBase64,
      transcribeLocalPcmChunks,
      clearLocalAsrStreamingPreview,
      updateLocalAsrStreamingPreview,
      postLocalAsrStream,
      beginLocalAsrStreaming,
      flushLocalAsrStreamingChunk,
      queueLocalAsrStreamingFrame,
      cancelLocalAsrStreaming,
      cancelLocalAsrRequest,
      updateLocalAsrMicLevelFromRms,
      ensureAudioContextRunning,
      stopLocalAsrMeter,
      startLocalAsrMeter,
      stopLocalAsrWatchdog,
      startLocalAsrWatchdog,
      flushLocalAsrUtterance,
      handleLocalAsrFrame,
      trimLocalAsrManualCaptureFrames,
      clearLocalAsrGraph,
      buildLocalAsrAudioConstraints,
      getLocalAsrAudioTrack,
      getLocalAsrTrackLabel,
      isLocalAsrTrackMuted,
      isDisfavoredLocalAsrInputLabel,
      scoreLocalAsrInputDevice,
      choosePreferredLocalAsrInputDevice,
      rememberLocalAsrInputDevice,
      openPreferredLocalAsrStream,
      startLocalAsrLoop,
      stopLocalAsrLoop,
      scheduleMicRecognitionStart,
      stopMicLoop,
      startMicLoop,
      pauseMicForAssistant,
      resumeMicAfterAssistant,
      enqueueMicTranscript,
      sendAsrTranscript,
      sendHiddenParalinguisticCue,
      flushPendingMicTranscript,
      runMicQueue,
      setupSpeechRecognition,
      getBrowserRecognitionLanguage,
      snapshotPendingLocalAsr,
      waitLocalAsrSendingDone,
      transcribeSnapshotAfterMicClose,
      toggleMicOpen
    };
  }

  const api = { createController };
  root.TaffyLocalAsrController = api;
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof window !== "undefined" ? window : globalThis);
