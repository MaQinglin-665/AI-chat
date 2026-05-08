(function (root) {
  "use strict";

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
    const scheduleWakeWordStart = typeof deps.scheduleWakeWordStart === "function" ? deps.scheduleWakeWordStart : () => {};
    const stopWakeWordListener = typeof deps.stopWakeWordListener === "function" ? deps.stopWakeWordListener : () => {};
    const setupWakeWordRecognition = typeof deps.setupWakeWordRecognition === "function" ? deps.setupWakeWordRecognition : () => {};
    const btoa = window.btoa ? window.btoa.bind(window) : root.btoa;
    const AbortController = window.AbortController || root.AbortController;
    const Float32Array = window.Float32Array || root.Float32Array;
    const Int16Array = window.Int16Array || root.Int16Array;
    const Uint8Array = window.Uint8Array || root.Uint8Array;
    function updateMicMeter(levelOverride = null) {
      if (!ui.micMeterWrap || !ui.micMeterFill || !ui.micMeterText) {
        return;
      }
      if (!state.showMicMeter) {
        ui.micMeterWrap.style.display = "none";
        return;
      }
      ui.micMeterWrap.style.display = "flex";

      let level = levelOverride;
      if (level == null || !Number.isFinite(Number(level))) {
        level = state.micLevel;
      }
      const v = Math.max(0, Math.min(1, Number(level) || 0));
      const visualFloor = 0.025;
      const visualLevel = v <= visualFloor ? 0 : Math.min(1, (v - visualFloor) / (1 - visualFloor));
      const rawPct = Math.round(visualLevel * 100);
      const eased = Math.pow(visualLevel, 0.72);
      const displayPct = state.micOpen && state.micSuspendDepth <= 0 ? Math.round(eased * 100) : 0;
      ui.micMeterFill.style.width = `${displayPct}%`;
      ui.micMeterFill.style.opacity = displayPct > 0 ? "1" : "0";

      if (!state.micOpen) {
        ui.micMeterText.textContent = "未开麦";
      } else if (state.micSuspendDepth > 0) {
        ui.micMeterText.textContent = "暂停";
      } else if (state.asrMode === "local_vosk" && state.localAsrInputMuted) {
        ui.micMeterText.textContent = "系统静音";
      } else if (rawPct < 8) {
        ui.micMeterText.textContent = "静音";
      } else if (rawPct < 28) {
        ui.micMeterText.textContent = "低";
      } else if (rawPct < 60) {
        ui.micMeterText.textContent = "中";
      } else {
        ui.micMeterText.textContent = "高";
      }
    }

    function updateMicButton() {
      if (!ui.micBtn) {
        return;
      }
      const micAvailable = state.recognitionAvailable || state.localAsrAvailable;
      if (!micAvailable) {
        ui.micBtn.disabled = true;
        ui.micBtn.textContent = "语音输入不可用";
        updateMicMeter(0);
        return;
      }
      ui.micBtn.disabled = false;
      if (!state.micOpen) {
        ui.micBtn.textContent = "开麦: 关";
        updateMicMeter(0);
        return;
      }
      if (state.micSuspendDepth > 0) {
        ui.micBtn.textContent = "开麦: 暂停";
        updateMicMeter(0);
        return;
      }
      if (state.asrMode === "local_vosk") {
        ui.micBtn.textContent =
          state.localAsrRunning && state.localAsrInputMuted
            ? "开麦: 静音"
            : state.localAsrRunning
              ? "开麦: 开"
              : "开麦: 连接中";
        updateMicMeter();
        return;
      }
      ui.micBtn.textContent = state.recognitionActive ? "开麦: 开" : "开麦: 连接中";
      updateMicMeter();
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

    async function transcribeLocalPcmChunks(chunks, signal = undefined) {
      if (!Array.isArray(chunks) || chunks.length === 0) {
        return "";
      }
      const audio_base64 = pcmChunksToBase64(chunks);
      if (!audio_base64) {
        return "";
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
      return String(data?.text || "").trim();
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
          setStatus("麦克风已开启，但没有收到音频，请检查系统输入设备");
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

    async function flushLocalAsrUtterance(force = false, sessionId = null) {
      const token = sessionId == null ? state.micSession : Number(sessionId);
      if (token !== state.micSession) {
        return;
      }
      if (state.localAsrSending) {
        return;
      }
      if (!state.localAsrBuffers.length) {
        return;
      }
      const speechMs = state.localAsrSpeechMs;
      if (!force && speechMs < state.localAsrMinSpeechMs) {
        return;
      }
      const chunks = state.localAsrBuffers.slice();
      state.localAsrBuffers = [];
      state.localAsrSpeeching = false;
      state.localAsrSpeechMs = 0;
      state.localAsrSilenceMs = 0;
      state.localAsrSending = true;
      const controller = new AbortController();
      state.localAsrAbortController = controller;
      try {
        const text = await transcribeLocalPcmChunks(chunks, controller.signal);
        if (token !== state.micSession || !state.micOpen) {
          return;
        }
        if (text) {
          enqueueMicTranscript(text, token);
        }
      } catch (err) {
        if (err?.name === "AbortError") {
          return;
        }
        setStatus(`语音识别失败: ${err.message}`);
      } finally {
        if (state.localAsrAbortController === controller) {
          state.localAsrAbortController = null;
        }
        state.localAsrSending = false;
      }
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
      updateLocalAsrMicLevelFromRms(rms);

      const baseThreshold = clampNumber(state.localAsrSpeechThreshold || 0.0035, 0.0015, 0.05);
      const adaptiveThreshold = Math.max(
        baseThreshold,
        clampNumber(state.localAsrNoiseFloor * 1.8 + 0.001, 0.0015, 0.02)
      );
      const isSpeech = rms >= adaptiveThreshold;

      if (isSpeech) {
        state.localAsrSpeeching = true;
        state.localAsrSpeechMs += frameMs;
        state.localAsrSilenceMs = 0;
        state.localAsrBuffers.push(pcm16);
        if (state.localAsrSpeechMs >= state.localAsrMaxSpeechMs) {
          flushLocalAsrUtterance(true, token);
        }
        return;
      }

      if (!state.localAsrSpeeching) {
        // Keep tracking environment noise to auto-adapt threshold.
        state.localAsrNoiseFloor = state.localAsrNoiseFloor * 0.94 + rms * 0.06;
      }

      if (!state.localAsrSpeeching) {
        return;
      }
      state.localAsrSilenceMs += frameMs;
      if (state.localAsrSilenceMs < state.localAsrSilenceTriggerMs) {
        state.localAsrBuffers.push(pcm16);
        return;
      }
      flushLocalAsrUtterance(false, token);
    }

    function clearLocalAsrGraph() {
      stopLocalAsrMeter();
      stopLocalAsrWatchdog();
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
      state.localAsrRunning = false;
      state.localAsrSpeeching = false;
      state.localAsrSpeechMs = 0;
      state.localAsrSilenceMs = 0;
      state.localAsrBuffers = [];
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
          if (token === state.micSession && state.micOpen) {
            setStatus("麦克风轨道被系统静音，请检查 Windows 输入设备、隐私权限或硬件静音键");
            updateMicButton();
          }
        };
        audioTrack.onunmute = () => {
          state.localAsrInputMuted = false;
          if (token === state.micSession && state.micOpen) {
            setStatus("开麦中...");
            updateMicButton();
          }
        };
        audioTrack.onended = () => {
          if (token === state.micSession && state.micOpen) {
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
      state.localAsrNoiseFloor = 0.0008;
      state.localAsrLastFrameAt = performance.now();
      state.localAsrPeakRms = 0;
      state.localAsrStartedAt = performance.now();
      state.localAsrNoFrameWarned = false;
      state.localAsrLowLevelWarned = false;
      state.localAsrThresholdAutoAdjusted = false;
      state.localAsrMutedWarned = false;
      state.localAsrInputMuted = !!audioTrack?.muted;
      startLocalAsrMeter(sessionToken);
      startLocalAsrWatchdog(sessionToken);
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
        state.micSession += 1;
        state.micOpen = false;
        state.micSuspendDepth = 0;
        state.micRetryCount = 0;
        state.micQueue = [];
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
      state.micSession += 1;
      const token = state.micSession;
      state.micOpen = true;
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
      updateMicButton();
    }

    function pauseMicForAssistant() {
      if (!(state.recognitionAvailable || state.localAsrAvailable) || !state.micOpen) {
        return;
      }
      if (state.micKeepListening) {
        updateMicButton();
        return;
      }
      state.micSuspendDepth += 1;
      if (state.asrMode === "local_vosk") {
        updateMicButton();
        return;
      }
      stopMicLoop(false);
    }

    function resumeMicAfterAssistant() {
      if (!(state.recognitionAvailable || state.localAsrAvailable) || !state.micOpen) {
        return;
      }
      if (state.micKeepListening) {
        updateMicButton();
        return;
      }
      if (state.micSuspendDepth > 0) {
        state.micSuspendDepth -= 1;
      }
      if (state.micSuspendDepth <= 0) {
        state.micSuspendDepth = 0;
        if (state.asrMode === "local_vosk") {
          flushLocalAsrUtterance(true, state.micSession);
        } else {
          scheduleMicRecognitionStart(220);
        }
      }
      updateMicButton();
    }

    function enqueueMicTranscript(text, sessionId = null) {
      const token = sessionId == null ? state.micSession : Number(sessionId);
      if (token !== state.micSession || !state.micOpen) {
        return;
      }
      const cleaned = String(text || "").trim();
      if (!cleaned) {
        return;
      }
      const corrected = applyAsrHotwordCorrections(cleaned);
      state.micQueue.push(corrected || cleaned);
      runMicQueue();
    }

    async function runMicQueue() {
      if (state.micQueueWorking) {
        return;
      }
      state.micQueueWorking = true;
      try {
        while (state.micQueue.length > 0) {
          if (!state.micOpen) {
            state.micQueue = [];
            break;
          }
          if (state.chatBusy) {
            await new Promise((resolve) => setTimeout(resolve, 160));
            continue;
          }
          const next = state.micQueue.shift();
          if (!next) {
            continue;
          }
          ui.chatInput.value = "";
          await requestAssistantReply(next, {
            showUser: true,
            rememberUser: true,
            auto: false,
            silentError: false
          });
        }
      } finally {
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
      recog.lang = "zh-CN";
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
            enqueueMicTranscript(transcript, state.micSession);
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
      const chunks = Array.isArray(state.localAsrBuffers) ? state.localAsrBuffers.slice() : [];
      const speechMs = Number(state.localAsrSpeechMs) || 0;
      return { chunks, speechMs };
    }

    async function waitLocalAsrSendingDone(timeoutMs = 700) {
      const started = Date.now();
      while (state.localAsrSending && Date.now() - started < timeoutMs) {
        await new Promise((resolve) => setTimeout(resolve, 40));
      }
    }

    async function transcribeSnapshotAfterMicClose(snapshot) {
      if (!snapshot || !Array.isArray(snapshot.chunks) || snapshot.chunks.length === 0) {
        return false;
      }
      const minCloseMs = Math.max(90, Math.min(state.localAsrMinSpeechMs || 180, 220));
      if ((Number(snapshot.speechMs) || 0) < minCloseMs) {
        return false;
      }
      try {
        const text = await transcribeLocalPcmChunks(snapshot.chunks);
        const corrected = applyAsrHotwordCorrections(text);
        if (!corrected) {
          return false;
        }
        let spins = 0;
        while (state.chatBusy && spins < 50) {
          await new Promise((resolve) => setTimeout(resolve, 100));
          spins += 1;
        }
        if (state.chatBusy) {
          return false;
        }
        await requestAssistantReply(corrected, {
          showUser: true,
          rememberUser: true,
          auto: false,
          silentError: false
        });
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
      state.micToggleBusy = true;
      try {
        if (state.micOpen) {
          let closeSnapshot = null;
          if (state.asrTranscribeOnClose && state.asrMode === "local_vosk") {
            await waitLocalAsrSendingDone(700);
            closeSnapshot = snapshotPendingLocalAsr();
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
      clearMicRestartTimer,
      ensureMicPermission,
      floatToInt16,
      downsampleTo16k,
      pcmChunksToBase64,
      transcribeLocalPcmChunks,
      cancelLocalAsrRequest,
      updateLocalAsrMicLevelFromRms,
      ensureAudioContextRunning,
      stopLocalAsrMeter,
      startLocalAsrMeter,
      stopLocalAsrWatchdog,
      startLocalAsrWatchdog,
      flushLocalAsrUtterance,
      handleLocalAsrFrame,
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
      runMicQueue,
      setupSpeechRecognition,
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
