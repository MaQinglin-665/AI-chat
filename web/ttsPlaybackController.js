(function (root) {
  "use strict";

  function createController(deps = {}) {
    const state = deps.state || {};
    const window = deps.windowObject || root;
    const console = deps.consoleObject || root.console || { warn() {} };
    const performance = deps.performanceObject || window.performance || root.performance || { now: () => Date.now() };
    const authFetch = typeof deps.authFetch === "function" ? deps.authFetch : async () => { throw new Error("authFetch is not available"); };
    const TTS_API = deps.ttsApi || {};
    const perfLog = typeof deps.perfLog === "function" ? deps.perfLog : () => {};
    const setStatus = typeof deps.setStatus === "function" ? deps.setStatus : () => {};
    const waitMs = typeof deps.waitMs === "function" ? deps.waitMs : (ms) => new Promise((resolve) => setTimeout(resolve, Math.max(0, Number(ms) || 0)));
    const sanitizeSpeakText = typeof deps.sanitizeSpeakText === "function" ? deps.sanitizeSpeakText : (text) => String(text || "").trim();
    const detectMood = typeof deps.detectMood === "function" ? deps.detectMood : () => "idle";
    const normalizeTalkStyle = typeof deps.normalizeTalkStyle === "function" ? deps.normalizeTalkStyle : (style) => String(style || "neutral").trim() || "neutral";
    const buildVoiceCandidates = typeof deps.buildVoiceCandidates === "function" ? deps.buildVoiceCandidates : () => [];
    const initTTS = typeof deps.initTTS === "function" ? deps.initTTS : () => {};
    const isServerTTSProvider = typeof deps.isServerTTSProvider === "function" ? deps.isServerTTSProvider : () => false;
    const recordTTSDebugEvent = typeof deps.recordTTSDebugEvent === "function" ? deps.recordTTSDebugEvent : () => {};
    const recordTTSAudioEvent = typeof deps.recordTTSAudioEvent === "function" ? deps.recordTTSAudioEvent : () => {};
    const beginSpeechAnimation = typeof deps.beginSpeechAnimation === "function" ? deps.beginSpeechAnimation : () => {};
    const finishSpeechAnimation = typeof deps.finishSpeechAnimation === "function" ? deps.finishSpeechAnimation : () => {};
    const endSpeechAnimation = typeof deps.endSpeechAnimation === "function" ? deps.endSpeechAnimation : () => {};
    const showSubtitleText = typeof deps.showSubtitleText === "function" ? deps.showSubtitleText : () => {};
    const hideSubtitleText = typeof deps.hideSubtitleText === "function" ? deps.hideSubtitleText : () => {};
    const ensureTTSAudioAnalyser = typeof deps.ensureTTSAudioAnalyser === "function" ? deps.ensureTTSAudioAnalyser : () => false;
    const isCurrentTTSPlaybackGeneration = typeof deps.isCurrentTTSPlaybackGeneration === "function" ? deps.isCurrentTTSPlaybackGeneration : () => true;
    const buildSpeakProsody = typeof deps.buildSpeakProsody === "function" ? deps.buildSpeakProsody : () => null;
    const clampNumber = typeof deps.clampNumber === "function" ? deps.clampNumber : (v, min, max) => Math.min(max, Math.max(min, Number(v) || 0));

    function stopAllAudioPlayback() {
      state.ttsPlaybackGeneration = Number(state.ttsPlaybackGeneration || 0) + 1;
      state.streamSpeakPlayedSession = 0;
      if (
        state.streamSpeakWorking
        && Number(state.streamSpeakWorkingSession || 0)
        && Number(state.streamSpeakWorkingSession || 0) !== Number(state.streamSpeakSession || 0)
      ) {
        state.streamSpeakWorking = false;
        state.streamSpeakWorkingSession = 0;
      }
      if ("speechSynthesis" in window) {
        try {
          window.speechSynthesis.cancel();
        } catch (_) {
          // ignore
        }
      }
      if (state.ttsAudio) {
        try {
          state.ttsAudio.pause();
          state.ttsAudio.currentTime = 0;
        } catch (_) {
          // ignore
        }
      }
      if (state.ttsContextBufferSource) {
        try {
          state.ttsContextBufferSource.onended = null;
          state.ttsContextBufferSource.stop(0);
        } catch (_) {
          // ignore
        }
        try {
          state.ttsContextBufferSource.disconnect();
        } catch (_) {
          // ignore
        }
        state.ttsContextBufferSource = null;
      }
      endSpeechAnimation();
      state.ttsAudioLevel = 0;
      state.ttsAudioRawLevel = 0;
      state.ttsAudioRms = 0;
      state.ttsContextSpeaking = false;
    }

    function speakOnceWithVoice(text, voice, opts = {}) {
      return new Promise((resolve) => {
        const force = typeof opts === "object" ? !!opts.force : !!opts;
        const playbackGeneration = Number(
          (typeof opts === "object" ? opts.playbackGeneration : 0) || state.ttsPlaybackGeneration || 0
        );
        if (!("speechSynthesis" in window)) {
          resolve(false);
          return;
        }
        if (!force && !state.speakingEnabled) {
          resolve(false);
          return;
        }
        const cleaned = String(text || "")
          .replace(/https?:\/\/\S+/g, "")
          .replace(/\s+/g, " ")
          .trim();
        if (!cleaned) {
          resolve(false);
          return;
        }

        const speechStyle = normalizeTalkStyle(opts.style || state.currentTalkStyle || "neutral");
        const speechMood = String(opts.mood || detectMood(cleaned) || "idle");
        const prosodyStyle = opts.voiceStyle || speechStyle;
        const prosody = opts.prosody && typeof opts.prosody === "object"
          ? opts.prosody
          : buildSpeakProsody(cleaned, speechMood, false, prosodyStyle);
        const speedRatio = Number(prosody.speed_ratio);
        const pitchRatio = Number(prosody.pitch_ratio);
        const volumeRatio = Number(prosody.volume_ratio);
        const utterance = new SpeechSynthesisUtterance(cleaned);
        if (voice) {
          utterance.voice = voice;
          utterance.lang = voice.lang || "zh-CN";
        } else {
          utterance.lang = "zh-CN";
        }
        utterance.rate = Number.isFinite(speedRatio)
          ? clampNumber(0.96 * speedRatio, 0.72, 1.32)
          : 0.96;
        utterance.pitch = Number.isFinite(pitchRatio)
          ? clampNumber(pitchRatio, 0.72, 1.35)
          : 1.0;
        utterance.volume = Number.isFinite(volumeRatio)
          ? clampNumber(volumeRatio, 0.45, 1.0)
          : 1.0;
        let started = false;
        let settled = false;
        utterance.onstart = () => {
          if (!isCurrentTTSPlaybackGeneration(playbackGeneration)) {
            try {
              window.speechSynthesis.cancel();
            } catch (_) {
              // ignore
            }
            return;
          }
          started = true;
          beginSpeechAnimation(cleaned, speechMood, speechStyle);
          showSubtitleText(cleaned);
          setStatus("语音中...");
        };
        utterance.onend = () => {
          if (settled) return;
          settled = true;
          if (!isCurrentTTSPlaybackGeneration(playbackGeneration)) {
            resolve(false);
            return;
          }
          if (voice?.name) {
            state.ttsLastGoodVoiceName = voice.name;
          }
          finishSpeechAnimation();
          hideSubtitleText();
          setStatus("待机");
          resolve(true);
        };
        utterance.onerror = () => {
          if (settled) return;
          settled = true;
          if (!isCurrentTTSPlaybackGeneration(playbackGeneration)) {
            resolve(false);
            return;
          }
          endSpeechAnimation();
          hideSubtitleText();
          setStatus("语音失败");
          resolve(false);
        };

        try {
          if (!isCurrentTTSPlaybackGeneration(playbackGeneration)) {
            resolve(false);
            return;
          }
          window.speechSynthesis.resume();
          window.speechSynthesis.speak(utterance);
          // Guard against engines that fail silently (no onstart fired).
          setTimeout(() => {
            if (settled) return;
            if (!isCurrentTTSPlaybackGeneration(playbackGeneration)) {
              settled = true;
              resolve(false);
              return;
            }
            if (!started) {
              settled = true;
              endSpeechAnimation();
              try {
                window.speechSynthesis.cancel();
              } catch (_) {
                // ignore
              }
              resolve(false);
            }
          }, 1800);
        } catch (_) {
          resolve(false);
        }
      });
    }

    async function speakByBrowser(text, opts = {}) {
      const force = !!opts.force;
      const requestedGeneration = Number(opts.playbackGeneration || state.ttsPlaybackGeneration || 0);
      if (!force && !state.speakingEnabled) {
        return false;
      }
      if (!("speechSynthesis" in window)) {
        return false;
      }
      if (!state.ttsReady) {
        initTTS();
      }

      if (!isCurrentTTSPlaybackGeneration(requestedGeneration)) {
        recordTTSDebugEvent("browser_stale_skip", {
          text,
          result: "stale"
        });
        return false;
      }
      stopAllAudioPlayback();
      const playbackGeneration = Number(state.ttsPlaybackGeneration || 0);
      const candidates = buildVoiceCandidates();
      const browserTTSOptions = {
        force,
        playbackGeneration,
        prosody: opts.prosody || null,
        mood: opts.mood || "",
        style: opts.style || state.currentTalkStyle || "neutral",
        voiceStyle: opts.voiceStyle || ""
      };
      for (const v of candidates) {
        const ok = await speakOnceWithVoice(text, v, browserTTSOptions);
        if (ok) {
          return true;
        }
      }
      return false;
    }

    function buildServerTTSPayload(cleanedText, opts = {}) {
      if (typeof TTS_API.buildServerTTSPayload === "function") {
        return TTS_API.buildServerTTSPayload(cleanedText, {
          ...opts,
          voice: state.ttsServerVoice
        });
      }
      return { text: String(cleanedText || "") };
    }

    function isRetriableTTSError(err) {
      if (typeof TTS_API.isRetriableTTSError === "function") {
        return TTS_API.isRetriableTTSError(err);
      }
      return false;
    }

    async function requestServerTTSBlob(text, prosody = null, requestOpts = {}) {
      if (typeof TTS_API.requestServerTTSBlob !== "function") {
        throw new Error("ttsApi request helper is not available");
      }
      return TTS_API.requestServerTTSBlob(text, prosody, {
        authFetch,
        sanitizeSpeakText,
        perfLog,
        traceId: String(requestOpts.traceId || state.activePerfTraceId || "").trim(),
        timeoutMs: Math.max(
          1500,
          Math.min(90000, Math.round(Number(requestOpts.timeoutMs) || Number(state.ttsServerRequestTimeoutMs) || 14000))
        ),
        voice: state.ttsServerVoice,
        now: () => performance.now(),
        wallNow: () => Date.now()
      });
    }

    async function requestServerTTSBlobWithRetry(text, prosody = null, opts = {}) {
      if (typeof TTS_API.requestServerTTSBlobWithRetry !== "function") {
        throw new Error("ttsApi retry helper is not available");
      }
      return TTS_API.requestServerTTSBlobWithRetry(text, prosody, {
        authFetch,
        sanitizeSpeakText,
        perfLog,
        traceId: opts.traceId,
        retries: Math.max(0, Math.min(4, Math.round(Number(opts.retries) || 0))),
        retryDelayMs: Math.max(
          60,
          Math.min(3000, Math.round(Number(opts.retryDelayMs) || Number(state.ttsServerRetryDelayMs) || 220))
        ),
        timeoutMs: Math.max(
          1500,
          Math.min(90000, Math.round(Number(opts.timeoutMs) || Number(state.ttsServerRequestTimeoutMs) || 14000))
        ),
        voice: state.ttsServerVoice,
        now: () => performance.now(),
        wallNow: () => Date.now(),
        wait: waitMs,
        onRetry: ({ attempt, nextWaitMs, error }) => {
          console.warn("Server TTS request retry", {
            attempt,
            nextWaitMs,
            reason: String(error?.message || error)
          });
        }
      });
    }

    async function playAudioByContext(blob, debugContext = {}) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx || !blob) {
        recordTTSDebugEvent("context_unavailable", debugContext);
        return false;
      }
      const playbackGeneration = Number(debugContext.playbackGeneration || state.ttsPlaybackGeneration || 0);
      if (!isCurrentTTSPlaybackGeneration(playbackGeneration)) {
        recordTTSDebugEvent("context_stale_skip", {
          ...debugContext,
          result: "stale"
        });
        return false;
      }
      let markedSpeaking = false;
      let fallbackTimer = 0;
      let source = null;
      let contextPlaybackStarted = false;
      try {
        if (!state.ttsDecodeContext || state.ttsDecodeContext.state === "closed") {
          state.ttsDecodeContext = new AudioCtx();
        }
        const ctx = state.ttsDecodeContext;
        if (ctx.state === "suspended") {
          await ctx.resume();
        }
        if (!isCurrentTTSPlaybackGeneration(playbackGeneration)) {
          recordTTSDebugEvent("context_stale_skip", {
            ...debugContext,
            result: "stale"
          });
          return false;
        }
        const arrayBuf = await blob.arrayBuffer();
        const decoded = await ctx.decodeAudioData(arrayBuf.slice(0));
        if (!isCurrentTTSPlaybackGeneration(playbackGeneration)) {
          recordTTSDebugEvent("context_stale_skip", {
            ...debugContext,
            result: "stale"
          });
          return false;
        }
          recordTTSDebugEvent("context_play_start", {
            ...debugContext,
            blobBytes: Number(blob?.size || arrayBuf.byteLength || 0),
            durationMs: Number.isFinite(Number(decoded.duration)) && decoded.duration > 0
              ? Math.round(decoded.duration * 1000)
              : -1
          });
          state.ttsDebugAudioStartedAt = performance.now();
          if (debugContext.sessionId) {
            state.streamSpeakPlayedSession = Number(debugContext.sessionId || 0);
          }
        source = ctx.createBufferSource();
        const gain = ctx.createGain();
        gain.gain.value = 1.0;
        source.buffer = decoded;
        state.ttsContextBufferSource = source;
        if (!state.ttsAudioAnalyser || state.ttsAudioAnalyser.context !== ctx) {
          state.ttsAudioAnalyser = ctx.createAnalyser();
          state.ttsAudioAnalyser.fftSize = 256;
          state.ttsAudioAnalyser.smoothingTimeConstant = 0.12;
          state.ttsAudioAnalyserData = new Uint8Array(state.ttsAudioAnalyser.frequencyBinCount);
        }
        source.connect(state.ttsAudioAnalyser);
        state.ttsAudioAnalyser.connect(gain);
        gain.connect(ctx.destination);
        state.ttsContextSpeaking = true;
        markedSpeaking = true;
        await new Promise((resolve) => {
          let resolved = false;
          const resolveOnce = () => {
            if (resolved) {
              return;
            }
            resolved = true;
            resolve();
          };
          source.onended = resolveOnce;
          const durationMs = Number.isFinite(Number(decoded.duration)) && decoded.duration > 0
            ? Math.round(decoded.duration * 1000)
            : 45000;
          fallbackTimer = window.setTimeout(resolveOnce, Math.min(180000, durationMs + 900));
          if (!isCurrentTTSPlaybackGeneration(playbackGeneration)) {
            recordTTSDebugEvent("context_stale_skip", {
              ...debugContext,
              result: "stale"
            });
            resolveOnce();
            return;
          }
          source.start(0);
          contextPlaybackStarted = true;
        });
        if (state.ttsContextBufferSource === source) {
          state.ttsContextBufferSource = null;
        }
        if (fallbackTimer) {
          clearTimeout(fallbackTimer);
          fallbackTimer = 0;
        }
        try {
          source.disconnect();
        } catch (_) {
          // ignore
        }
        if (!contextPlaybackStarted || !isCurrentTTSPlaybackGeneration(playbackGeneration)) {
          recordTTSDebugEvent("context_stale_skip", {
            ...debugContext,
            result: "stale"
          });
          return false;
        }
        state.ttsContextSpeaking = false;
        state.ttsAudioLevel = 0;
        state.ttsAudioRawLevel = 0;
        state.ttsAudioRms = 0;
        state.conversationLastTtsFinishedAt = Date.now();
        markedSpeaking = false;
        recordTTSDebugEvent("context_play_end", {
          ...debugContext,
          result: "ok"
        });
        return true;
      } catch (err) {
        if (fallbackTimer) {
          clearTimeout(fallbackTimer);
          fallbackTimer = 0;
        }
        if (markedSpeaking && isCurrentTTSPlaybackGeneration(playbackGeneration)) {
          state.ttsContextSpeaking = false;
        }
        if (source) {
          try {
            source.stop(0);
          } catch (_) {
            // ignore
          }
          try {
            source.disconnect();
          } catch (_) {
            // ignore
          }
        }
        if (state.ttsContextBufferSource === source) {
          state.ttsContextBufferSource = null;
        }
        if (isCurrentTTSPlaybackGeneration(playbackGeneration)) {
          state.ttsAudioLevel = 0;
          state.ttsAudioRawLevel = 0;
          state.ttsAudioRms = 0;
        }
        recordTTSDebugEvent("context_play_fail", {
          ...debugContext,
          result: "fail",
          error: String(err?.message || err || "")
        });
        return false;
      }
    }

    async function playAudioBlob(blob, opts = {}) {
      if (!blob) {
        return false;
      }
      const playbackGeneration = Number(opts.playbackGeneration || state.ttsPlaybackGeneration || 0);
      if (!isCurrentTTSPlaybackGeneration(playbackGeneration)) {
        recordTTSDebugEvent("audio_stale_skip", {
          traceId: String(opts.perfTraceId || state.activePerfTraceId || "").trim(),
          sessionId: Number(opts.sessionId || state.streamSpeakSession || 0),
          segmentId: Number(opts.segmentId || 0),
          text: opts.text || "",
          blobBytes: Number(blob?.size || 0),
          result: "stale"
        });
        return false;
      }
      const perfTraceId = String(opts.perfTraceId || state.activePerfTraceId || "").trim();
      const perfBlobReadyPerfMs = Number(opts.perfBlobReadyPerfMs) || 0;
      const perfSpeakStartedPerfMs = Number(opts.perfSpeakStartedPerfMs) || 0;
      const debugContext = {
        traceId: perfTraceId,
        sessionId: Number(opts.sessionId || state.streamSpeakSession || 0),
        segmentId: Number(opts.segmentId || 0),
        text: opts.text || "",
        blobBytes: Number(blob?.size || 0),
        playbackGeneration
      };
      recordTTSDebugEvent("audio_blob_ready", debugContext);
      if (!isCurrentTTSPlaybackGeneration(playbackGeneration)) {
        recordTTSDebugEvent("audio_stale_skip", {
          ...debugContext,
          result: "stale"
        });
        return false;
      }
      if (!state.ttsAudio) {
        state.ttsAudio = new Audio();
        state.ttsAudio.preload = "auto";
      }
      const audio = state.ttsAudio;
      ensureTTSAudioAnalyser(audio);
      audio.muted = false;
      audio.volume = 1.0;
      const speechText = sanitizeSpeakText(opts.text || "");
      const speechMood = String(opts.mood || detectMood(speechText) || "idle");
      const speechStyle = normalizeTalkStyle(opts.style || state.currentTalkStyle || "neutral");
      const url = URL.createObjectURL(blob);
      const audioPlaybackToken = Number(state.ttsAudioPlaybackToken || 0) + 1;
      state.ttsAudioPlaybackToken = audioPlaybackToken;
      if (opts.interrupt) {
        recordTTSDebugEvent("audio_interrupt", debugContext);
        try {
          audio.pause();
          audio.currentTime = 0;
        } catch (_) {
          // ignore
        }
      }
      return await new Promise((resolve) => {
        let settled = false;
        let failTimer = 0;
        let startupTimer = 0;
        let progressTimer = 0;
        let fallbackSpeechStarted = false;
        const isCurrentHtmlAudioPlayback = () => (
          Number(state.ttsAudioPlaybackToken || 0) === audioPlaybackToken
          && audio.src === url
        );
        const stopHtmlAudio = () => {
          if (!isCurrentHtmlAudioPlayback()) {
            return;
          }
          try {
            audio.pause();
            audio.currentTime = 0;
          } catch (_) {
            // ignore
          }
        };
        const beginFallbackSpeech = () => {
          if (!isCurrentTTSPlaybackGeneration(playbackGeneration)) {
            return;
          }
          if (fallbackSpeechStarted) {
            return;
          }
          fallbackSpeechStarted = true;
          recordTTSDebugEvent("audio_fallback_begin", {
            ...debugContext,
            durationMs: Number.isFinite(Number(audio.duration)) && audio.duration > 0
              ? Math.round(audio.duration * 1000)
              : -1,
            currentMs: Math.round(Number(audio.currentTime || 0) * 1000)
          });
          beginSpeechAnimation(speechText, speechMood, speechStyle, {
            durationMs: Number.isFinite(Number(audio.duration)) && audio.duration > 0
              ? Math.round(audio.duration * 1000)
              : undefined
          });
        };
        const armFailTimer = (ms) => {
          if (failTimer) {
            clearTimeout(failTimer);
            failTimer = 0;
          }
          const timeoutMs = Math.max(12000, Math.min(180000, Math.round(Number(ms) || 0)));
          failTimer = window.setTimeout(() => done(false), timeoutMs);
        };
        const done = (ok) => {
          if (settled) return;
          settled = true;
          if (failTimer) {
            clearTimeout(failTimer);
            failTimer = 0;
          }
          if (startupTimer) {
            clearTimeout(startupTimer);
            startupTimer = 0;
          }
          if (progressTimer) {
            clearInterval(progressTimer);
            progressTimer = 0;
          }
          if (!isCurrentTTSPlaybackGeneration(playbackGeneration) || !isCurrentHtmlAudioPlayback()) {
            recordTTSDebugEvent("audio_stale_skip", {
              ...debugContext,
              result: "stale"
            });
            try {
              URL.revokeObjectURL(url);
            } catch (_) {
              // ignore
            }
            resolve(false);
            return;
          }
          state.ttsContextSpeaking = false;
          state.ttsAudioLevel = 0;
          state.ttsAudioRawLevel = 0;
          state.ttsAudioRms = 0;
          state.ttsDebugAudioEndedAt = performance.now();
          state.conversationLastTtsFinishedAt = Date.now();
          state.ttsDebugAudioCurrentMs = Math.round(Number(audio.currentTime || 0) * 1000);
          if (ok) {
            finishSpeechAnimation();
          } else {
            stopHtmlAudio();
            endSpeechAnimation();
          }
          hideSubtitleText();
          recordTTSDebugEvent("audio_done", {
            ...debugContext,
            result: ok ? "ok" : "fail",
            durationMs: Number.isFinite(Number(audio.duration)) && audio.duration > 0
              ? Math.round(audio.duration * 1000)
              : -1,
            currentMs: Math.round(Number(audio.currentTime || 0) * 1000)
          });
          try {
            URL.revokeObjectURL(url);
          } catch (_) {
            // ignore
          }
          setStatus(ok ? "待机" : "语音失败");
          resolve(ok);
        };
        audio.onended = () => {
          if (!isCurrentHtmlAudioPlayback()) {
            done(false);
            return;
          }
          recordTTSAudioEvent("audio_ended_event", audio, debugContext);
          done(true);
        };
        audio.onerror = async () => {
          if (!isCurrentHtmlAudioPlayback()) {
            done(false);
            return;
          }
          recordTTSAudioEvent("audio_error", audio, debugContext, {
            error: String(audio.error?.message || audio.error?.code || "")
          });
          stopHtmlAudio();
          if (!isCurrentTTSPlaybackGeneration(playbackGeneration)) {
            done(false);
            return;
          }
          beginFallbackSpeech();
          const ok = await playAudioByContext(blob, debugContext);
          done(!!ok);
        };
        audio.oncanplay = () => recordTTSAudioEvent("audio_canplay", audio, debugContext);
        audio.onplaying = () => recordTTSAudioEvent("audio_playing", audio, debugContext);
        audio.onpause = () => {
          if (!settled && !audio.ended) {
            recordTTSAudioEvent("audio_pause", audio, debugContext);
          }
        };
        audio.onwaiting = () => recordTTSAudioEvent("audio_waiting", audio, debugContext);
        audio.onstalled = () => recordTTSAudioEvent("audio_stalled", audio, debugContext);
        audio.onsuspend = () => recordTTSAudioEvent("audio_suspend", audio, debugContext);
        audio.onplay = () => {
          if (!isCurrentTTSPlaybackGeneration(playbackGeneration) || !isCurrentHtmlAudioPlayback()) {
            stopHtmlAudio();
            done(false);
            return;
          }
          state.ttsDebugAudioStartedAt = performance.now();
          state.ttsDebugAudioEndedAt = 0;
          if (debugContext.sessionId) {
            state.streamSpeakPlayedSession = Number(debugContext.sessionId || 0);
          }
          recordTTSDebugEvent("audio_play_start", {
            ...debugContext,
            durationMs: Number.isFinite(Number(audio.duration)) && audio.duration > 0
              ? Math.round(audio.duration * 1000)
              : -1,
            currentMs: Math.round(Number(audio.currentTime || 0) * 1000)
          });
          if (perfTraceId) {
            perfLog("tts", "audio_play_start", {
              traceId: perfTraceId,
              fromBlobReadyMs: perfBlobReadyPerfMs ? Math.round(performance.now() - perfBlobReadyPerfMs) : -1,
              fromSpeakStartMs: perfSpeakStartedPerfMs ? Math.round(performance.now() - perfSpeakStartedPerfMs) : -1
            });
          }
          if (state.ttsAudioContext && typeof state.ttsAudioContext.resume === "function") {
            state.ttsAudioContext.resume().catch(() => {});
          }
          if (progressTimer) {
            clearInterval(progressTimer);
            progressTimer = 0;
          }
          // Some environments resolve play() but never advance currentTime.
          let lastProgressAt = performance.now();
          let lastCurrentTime = Number(audio.currentTime || 0);
          progressTimer = window.setInterval(async () => {
            if (settled) {
              return;
            }
            if (!isCurrentHtmlAudioPlayback()) {
              done(false);
              return;
            }
            const current = Number(audio.currentTime || 0);
            if (current > lastCurrentTime + 0.01) {
              lastCurrentTime = current;
              lastProgressAt = performance.now();
              return;
            }
            if (audio.paused || audio.ended) {
              return;
            }
            if (performance.now() - lastProgressAt < 2800) {
              return;
            }
            stopHtmlAudio();
            if (!isCurrentTTSPlaybackGeneration(playbackGeneration)) {
              done(false);
              return;
            }
            beginFallbackSpeech();
            const ok = await playAudioByContext(blob, debugContext);
            done(!!ok);
          }, 650);
          beginSpeechAnimation(speechText, speechMood, speechStyle, {
            durationMs: Number.isFinite(Number(audio.duration)) && audio.duration > 0
              ? Math.round(audio.duration * 1000)
              : undefined
          });
          showSubtitleText(speechText);
        };
        audio.onloadedmetadata = () => {
          if (!isCurrentTTSPlaybackGeneration(playbackGeneration) || !isCurrentHtmlAudioPlayback()) {
            stopHtmlAudio();
            done(false);
            return;
          }
          if (Number.isFinite(Number(audio.duration)) && audio.duration > 0) {
            state.ttsDebugAudioDurationMs = Math.round(audio.duration * 1000);
            recordTTSDebugEvent("audio_metadata", {
              ...debugContext,
              durationMs: Math.round(audio.duration * 1000)
            });
            armFailTimer(audio.duration * 1000 + 12000);
            beginSpeechAnimation(speechText, speechMood, speechStyle, {
              durationMs: Math.round(audio.duration * 1000)
            });
            if (audio.paused && !audio.ended) {
              audio.play().catch(async () => {
                if (!isCurrentTTSPlaybackGeneration(playbackGeneration)) {
                  done(false);
                  return;
                }
                beginFallbackSpeech();
                const ok = await playAudioByContext(blob, debugContext);
                done(!!ok);
              });
            }
          }
        };
        if (!isCurrentTTSPlaybackGeneration(playbackGeneration)) {
          done(false);
          return;
        }
        audio.src = url;
        audio.play().then(() => {
          if (startupTimer) {
            clearTimeout(startupTimer);
            startupTimer = 0;
          }
        }).catch(async () => {
          recordTTSDebugEvent("audio_play_rejected", debugContext);
          stopHtmlAudio();
          if (!isCurrentTTSPlaybackGeneration(playbackGeneration)) {
            done(false);
            return;
          }
          beginFallbackSpeech();
          const ok = await playAudioByContext(blob, debugContext);
          done(!!ok);
        });
        armFailTimer(45000);
        startupTimer = window.setTimeout(async () => {
          if (settled) {
            return;
          }
          if (audio.paused && !audio.ended && Number(audio.currentTime || 0) === 0) {
            recordTTSDebugEvent("audio_startup_stalled", debugContext);
            stopHtmlAudio();
            if (!isCurrentTTSPlaybackGeneration(playbackGeneration)) {
              done(false);
              return;
            }
            beginFallbackSpeech();
            const ok = await playAudioByContext(blob, debugContext);
            done(!!ok);
          }
        }, 3200);
      });
    }

    async function speakByServer(text, opts = {}) {
      const force = !!opts.force;
      const perfTraceId = String(opts.perfTraceId || state.activePerfTraceId || "").trim();
      const speakStartedPerfMs = performance.now();
      const playbackGeneration = Number(opts.playbackGeneration || state.ttsPlaybackGeneration || 0);
      if (!force && !state.speakingEnabled) {
        return false;
      }
      if ("speechSynthesis" in window) {
        try {
          window.speechSynthesis.cancel();
        } catch (_) {
          // ignore
        }
      }
      if (opts.interrupt && state.ttsAudio) {
        try {
          state.ttsAudio.pause();
          state.ttsAudio.currentTime = 0;
        } catch (_) {
          // ignore
        }
      }
      const cleaned = sanitizeSpeakText(text);
      if (!cleaned) {
        return false;
      }

      try {
        setStatus("语音中...");
        perfLog("tts", "speak_start", {
          traceId: perfTraceId || "(none)",
          textChars: cleaned.length
        });
        const blob = await requestServerTTSBlobWithRetry(cleaned, opts.prosody || null, {
          retries: Number.isFinite(Number(opts.retries))
            ? Number(opts.retries)
            : Number(state.ttsServerRetryCount),
          retryDelayMs: Number(state.ttsServerRetryDelayMs),
          timeoutMs: Number(state.ttsServerRequestTimeoutMs),
          traceId: perfTraceId
        });
        if (!isCurrentTTSPlaybackGeneration(playbackGeneration)) {
          recordTTSDebugEvent("speak_stale_skip", {
            traceId: perfTraceId || "(none)",
            text: cleaned,
            result: "stale"
          });
          return false;
        }
        return await playAudioBlob(blob, {
          interrupt: !!opts.interrupt,
          text: cleaned,
          mood: opts.mood || detectMood(cleaned),
          style: opts.style || state.currentTalkStyle || "neutral",
          perfTraceId,
          perfBlobReadyPerfMs: performance.now(),
          perfSpeakStartedPerfMs: speakStartedPerfMs,
          playbackGeneration
        });
      } catch (err) {
        if (!isCurrentTTSPlaybackGeneration(playbackGeneration)) {
          recordTTSDebugEvent("speak_stale_skip", {
            traceId: perfTraceId || "(none)",
            text: cleaned,
            result: "stale",
            error: String(err?.message || err || "")
          });
          return false;
        }
        perfLog("tts", "speak_fail", {
          traceId: perfTraceId || "(none)",
          elapsedMs: Math.round(performance.now() - speakStartedPerfMs),
          error: String(err?.message || err || "")
        });
        console.warn("Server TTS failed:", err);
        state.ttsServerAvailable = false;
        state.ttsServerFailStreak = Math.max(0, Number(state.ttsServerFailStreak) || 0) + 1;
        state.ttsServerLastError = String(err?.message || err || "");
        setStatus("语音服务未就绪");
        return false;
      }
    }

    async function speak(text, opts = {}) {
      const speakOpts = {
        ...opts,
        playbackGeneration: Number(opts.playbackGeneration || state.ttsPlaybackGeneration || 0)
      };
      if (isServerTTSProvider(state.ttsProvider)) {
        // Always retry even if a previous call failed - GPT-SoVITS may have started later.
        const ok = await speakByServer(text, speakOpts);
        if (ok) {
          state.ttsServerAvailable = true;
          state.ttsServerFailStreak = 0;
          state.ttsServerLastError = "";
          return true;
        }
        if (!isCurrentTTSPlaybackGeneration(speakOpts.playbackGeneration)) {
          recordTTSDebugEvent("speak_fallback_stale_skip", {
            traceId: String(speakOpts.perfTraceId || state.activePerfTraceId || "(none)"),
            text,
            result: "stale"
          });
          return false;
        }
        if (!state.serverTTSFallbackToBrowser) {
          return false;
        }
        const failThreshold = Math.max(
          1,
          Math.min(8, Math.round(Number(state.ttsServerFallbackFailThreshold) || 1))
        );
        const failStreak = Math.max(0, Number(state.ttsServerFailStreak) || 0);
        const lastErr = String(state.ttsServerLastError || "");
        const lastErrLower = lastErr.toLowerCase();
        const immediateBrowserFallback =
          state.ttsProvider === "gpt_sovits" ||
          lastErrLower.includes("connection failed") ||
          lastErrLower.includes("network") ||
          lastErrLower.includes("timeout") ||
          lastErrLower.includes("aborted") ||
          lastErrLower.includes("empty audio") ||
          /^http\s+5\d\d$/i.test(lastErr);
        if (immediateBrowserFallback) {
          console.warn("Server TTS immediate fallback -> browser TTS", {
            provider: state.ttsProvider,
            streak: failStreak,
            reason: lastErr
          });
          recordTTSDebugEvent("browser_fallback_start", {
            traceId: String(speakOpts.perfTraceId || state.activePerfTraceId || "(none)"),
            text,
            provider: state.ttsProvider,
            streak: failStreak,
            threshold: failThreshold,
            error: lastErr,
            timeoutMs: Number(state.ttsServerRequestTimeoutMs || 0)
          });
          return await speakByBrowser(text, {
            ...speakOpts,
            force: !!speakOpts.force,
            playbackGeneration: speakOpts.playbackGeneration
          });
        }
        const nonRetriableClientError =
          /^HTTP\s+4\d\d$/i.test(lastErr) && !/^HTTP\s+(408|429)$/i.test(lastErr);
        if (!nonRetriableClientError && failStreak < failThreshold) {
          console.warn("Server TTS failed but fallback is delayed", {
            streak: failStreak,
            threshold: failThreshold,
            provider: state.ttsProvider,
            reason: lastErr
          });
          setStatus(`TTS retrying (${failStreak}/${failThreshold})`);
          return false;
        }
        // Server TTS failed: fallback to browser speech when enabled.
        console.warn("Server TTS fallback -> browser TTS", {
          provider: state.ttsProvider,
          streak: failStreak,
          threshold: failThreshold,
          reason: lastErr
        });
        return await speakByBrowser(text, {
          ...speakOpts,
          force: !!speakOpts.force,
          playbackGeneration: speakOpts.playbackGeneration
        });
      }
      return await speakByBrowser(text, speakOpts);
    }

    return {
      stopAllAudioPlayback,
      speakOnceWithVoice,
      buildServerTTSPayload,
      isRetriableTTSError,
      requestServerTTSBlob,
      requestServerTTSBlobWithRetry,
      playAudioByContext,
      playAudioBlob,
      speakByServer,
      speakByBrowser,
      speak
    };
  }

  const api = { createController };
  root.TaffyTTSPlaybackController = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
