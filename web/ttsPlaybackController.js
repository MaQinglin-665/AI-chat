(function (root) {
  "use strict";

  function createController(deps = {}) {
    const state = deps.state || {};
    const window = deps.windowObject || root;
    const console = deps.consoleObject || root.console || { warn() {} };
    const AbortControllerImpl = window.AbortController || root.AbortController;
    const performance = deps.performanceObject || window.performance || root.performance || { now: () => Date.now() };
    const wallNow = typeof deps.wallNow === "function" ? deps.wallNow : () => Date.now();
    const authFetch = typeof deps.authFetch === "function" ? deps.authFetch : async () => { throw new Error("authFetch is not available"); };
    const TTS_API = deps.ttsApi || {};
    const PCM_STREAM = deps.ttsPcmStream || root.TaffyTTSPcmStream || {};
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
    const triggerPerformanceCueMotion = typeof deps.triggerPerformanceCueMotion === "function"
      ? deps.triggerPerformanceCueMotion
      : () => false;
    const finishSpeechAnimation = typeof deps.finishSpeechAnimation === "function" ? deps.finishSpeechAnimation : () => {};
    const endSpeechAnimation = typeof deps.endSpeechAnimation === "function" ? deps.endSpeechAnimation : () => {};
    const showSubtitleText = typeof deps.showSubtitleText === "function" ? deps.showSubtitleText : () => {};
    const hideSubtitleText = typeof deps.hideSubtitleText === "function" ? deps.hideSubtitleText : () => {};
    const ensureTTSAudioAnalyser = typeof deps.ensureTTSAudioAnalyser === "function" ? deps.ensureTTSAudioAnalyser : () => false;
    const isCurrentTTSPlaybackGeneration = typeof deps.isCurrentTTSPlaybackGeneration === "function" ? deps.isCurrentTTSPlaybackGeneration : () => true;
    const buildSpeakProsody = typeof deps.buildSpeakProsody === "function" ? deps.buildSpeakProsody : () => null;
    const clampNumber = typeof deps.clampNumber === "function" ? deps.clampNumber : (v, min, max) => Math.min(max, Math.max(min, Number(v) || 0));

    function getServerRecoveryProbeIntervalMs() {
      return Math.max(
        5000,
        Math.min(120000, Math.round(Number(state.ttsServerRecoveryProbeIntervalMs) || 15000))
      );
    }

    function shouldAttemptServerTTS() {
      if (!state.serverTTSFallbackToBrowser || state.ttsServerFallbackActive !== true) {
        return true;
      }
      return wallNow() >= Math.max(0, Number(state.ttsServerNextRecoveryProbeAt) || 0);
    }

    function markServerTTSFallback(reason = "") {
      const wasActive = state.ttsServerFallbackActive === true;
      state.ttsServerFallbackActive = true;
      state.ttsServerAvailable = false;
      state.ttsServerNextRecoveryProbeAt = wallNow() + getServerRecoveryProbeIntervalMs();
      if (!wasActive) {
        setStatus("已临时切换到系统语音");
        recordTTSDebugEvent("server_tts_fallback_enter", {
          provider: String(state.ttsProvider || ""),
          reason: String(reason || state.ttsServerLastError || ""),
          nextProbeAt: Number(state.ttsServerNextRecoveryProbeAt || 0)
        });
      }
    }

    function markServerTTSRecovered() {
      const wasActive = state.ttsServerFallbackActive === true;
      state.ttsServerFallbackActive = false;
      state.ttsServerNextRecoveryProbeAt = 0;
      state.ttsServerAvailable = true;
      state.ttsServerFailStreak = 0;
      state.ttsServerLastError = "";
      if (wasActive) {
        setStatus("GPT-SoVITS 语音已恢复");
        recordTTSDebugEvent("server_tts_fallback_recovered", {
          provider: String(state.ttsProvider || "")
        });
      }
    }

    function getServerTTSRequestScopes() {
      if (!Array.isArray(state.ttsServerRequestScopes)) {
        state.ttsServerRequestScopes = [];
      }
      return state.ttsServerRequestScopes;
    }

    function normalizeRequestScopeNumber(value, fallback = 0) {
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : Number(fallback || 0);
    }

    function isServerTTSRequestCancelled(err = null, opts = {}) {
      return opts?.signal?.aborted === true
        || opts?.requestScope?.signal?.aborted === true
        || err?.aborted === true
        || err?.name === "AbortError";
    }

    function releaseServerTTSRequestScope(scope) {
      if (!scope || scope.released === true) {
        return false;
      }
      scope.released = true;
      if (typeof scope.removeParentAbortListener === "function") {
        try {
          scope.removeParentAbortListener();
        } catch (_) {
          // ignore
        }
        scope.removeParentAbortListener = null;
      }
      const scopes = getServerTTSRequestScopes();
      const index = scopes.indexOf(scope);
      if (index >= 0) {
        scopes.splice(index, 1);
      }
      return true;
    }

    function abortServerTTSRequestScope(scope, reason = "cancelled") {
      if (!scope || scope.released === true || scope.signal?.aborted === true) {
        return false;
      }
      scope.cancelReason = String(reason || "cancelled");
      try {
        scope.controller?.abort();
      } catch (_) {
        return false;
      }
      recordTTSDebugEvent("server_tts_request_cancelled", {
        requestId: Number(scope.id || 0),
        kind: String(scope.kind || "request"),
        sessionId: Number(scope.sessionId || 0),
        playbackGeneration: Number(scope.playbackGeneration || 0),
        reason: scope.cancelReason
      });
      return true;
    }

    function createServerTTSRequestScope(opts = {}) {
      if (typeof AbortControllerImpl !== "function") {
        return null;
      }
      let controller = null;
      try {
        controller = new AbortControllerImpl();
      } catch (_) {
        return null;
      }
      const parentSignal = opts.signal && typeof opts.signal === "object" ? opts.signal : null;
      const scope = {
        id: Math.max(0, Number(state.ttsServerRequestScopeSeq || 0)) + 1,
        kind: String(opts.kind || "request"),
        sessionId: normalizeRequestScopeNumber(opts.sessionId, 0),
        playbackGeneration: normalizeRequestScopeNumber(
          opts.playbackGeneration,
          state.ttsPlaybackGeneration || 0
        ),
        traceId: String(opts.traceId || state.activePerfTraceId || "").trim(),
        controller,
        signal: controller.signal,
        parentSignal,
        cancelReason: "",
        released: false,
        removeParentAbortListener: null,
        abort: null
      };
      scope.abort = (reason = "cancelled") => abortServerTTSRequestScope(scope, reason);
      state.ttsServerRequestScopeSeq = scope.id;
      const abortFromParent = () => abortServerTTSRequestScope(scope, "parent_cancelled");
      if (parentSignal?.aborted === true) {
        abortFromParent();
      } else if (typeof parentSignal?.addEventListener === "function") {
        parentSignal.addEventListener("abort", abortFromParent, { once: true });
        scope.removeParentAbortListener = () => {
          try {
            parentSignal.removeEventListener("abort", abortFromParent);
          } catch (_) {
            // ignore
          }
        };
      }
      getServerTTSRequestScopes().push(scope);
      return scope;
    }

    function abortServerTTSRequests(opts = {}) {
      const beforePlaybackGeneration = Number(opts.beforePlaybackGeneration);
      const targetSessionId = normalizeRequestScopeNumber(opts.sessionId, 0);
      const abortAll = opts.all === true;
      const reason = String(opts.reason || "cancelled");
      let aborted = 0;
      for (const scope of getServerTTSRequestScopes().slice()) {
        const staleGeneration = Number.isFinite(beforePlaybackGeneration)
          && Number(scope?.playbackGeneration || 0) < beforePlaybackGeneration;
        const matchingSession = targetSessionId > 0
          && Number(scope?.sessionId || 0) === targetSessionId;
        if ((abortAll || staleGeneration || matchingSession) && abortServerTTSRequestScope(scope, reason)) {
          aborted += 1;
        }
      }
      return aborted;
    }

    function getServerTTSRequestScope(requestOpts = {}) {
      const supplied = requestOpts.requestScope;
      if (supplied && typeof supplied === "object" && supplied.released !== true) {
        return supplied;
      }
      return createServerTTSRequestScope(requestOpts);
    }

    function beginSpeechPerformance(text, mood, style, opts = {}, context = {}) {
      const performanceCue = opts.performanceCue && typeof opts.performanceCue === "object"
        ? opts.performanceCue
        : null;
      const appliedPerformanceCue = beginSpeechAnimation(text, mood, style, opts);
      if (performanceCue && appliedPerformanceCue?.motionOwnership !== "semantic") {
        try {
          triggerPerformanceCueMotion(performanceCue, context);
        } catch (_) {
          // Motion playback is optional; speech should continue normally.
        }
      }
    }

    function advanceBrowserPlaybackToken() {
      const next = Math.max(0, Number(state.ttsBrowserPlaybackToken || 0)) + 1;
      state.ttsBrowserPlaybackToken = next;
      return next;
    }

    function getPlaybackCancelWaiters() {
      if (!Array.isArray(state.ttsPlaybackCancelWaiters)) {
        state.ttsPlaybackCancelWaiters = [];
      }
      return state.ttsPlaybackCancelWaiters;
    }

    function unregisterPlaybackCancelWaiter(waiter) {
      const waiters = getPlaybackCancelWaiters();
      const index = waiters.indexOf(waiter);
      if (index >= 0) {
        waiters.splice(index, 1);
      }
    }

    function registerPlaybackCancelWaiter(kind, cancel) {
      if (typeof cancel !== "function") {
        return () => {};
      }
      const waiter = {
        id: Math.max(0, Number(state.ttsPlaybackCancelWaiterSeq || 0)) + 1,
        kind: String(kind || "playback"),
        cancel,
        cancelled: false
      };
      state.ttsPlaybackCancelWaiterSeq = waiter.id;
      getPlaybackCancelWaiters().push(waiter);
      return () => unregisterPlaybackCancelWaiter(waiter);
    }

    function cancelPlaybackWaiters(reason = "cancelled") {
      for (const waiter of getPlaybackCancelWaiters().slice()) {
        if (!waiter || waiter.cancelled === true) {
          continue;
        }
        waiter.cancelled = true;
        try {
          waiter.cancel(String(reason || "cancelled"));
        } catch (_) {
          // Playback cancellation should be best-effort and never throw into turn cleanup.
        } finally {
          unregisterPlaybackCancelWaiter(waiter);
        }
      }
    }

    function stopCurrentMediaInPlace() {
      // The turn generation fences cross-turn playback. A separate browser
      // token keeps a cancelled utterance in this same turn from mutating a
      // newer segment after its delayed callbacks arrive.
      cancelPlaybackWaiters("playback_stopped");
      advanceBrowserPlaybackToken();
      state.ttsAudioPlaybackToken = Math.max(0, Number(state.ttsAudioPlaybackToken || 0)) + 1;
      state.streamSpeakPlayedSession = 0;
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

    function stopAllAudioPlayback() {
      state.ttsPlaybackGeneration = Number(state.ttsPlaybackGeneration || 0) + 1;
      abortServerTTSRequests({
        beforePlaybackGeneration: Number(state.ttsPlaybackGeneration || 0),
        reason: "playback_generation_advanced"
      });
      if (
        state.streamSpeakWorking
        && Number(state.streamSpeakWorkingSession || 0)
        && Number(state.streamSpeakWorkingSession || 0) !== Number(state.streamSpeakSession || 0)
      ) {
        state.streamSpeakWorking = false;
        state.streamSpeakWorkingSession = 0;
      }
      stopCurrentMediaInPlace();
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

        const browserPlaybackToken = advanceBrowserPlaybackToken();
        const isCurrentBrowserPlayback = () => (
          isCurrentTTSPlaybackGeneration(playbackGeneration)
          && Number(state.ttsBrowserPlaybackToken || 0) === browserPlaybackToken
        );
        const speechStyle = normalizeTalkStyle(opts.style || state.currentTalkStyle || "neutral");
        const speechMood = String(opts.mood || detectMood(cleaned) || "idle");
        const prosodyStyle = opts.voiceStyle || speechStyle;
        const speechPerformanceCue = opts.performanceCue && typeof opts.performanceCue === "object"
          ? opts.performanceCue
          : null;
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
        let unregisterCancelWaiter = null;
        let startupProbeTimer = 0;
        let startupDeadlineTimer = 0;
        const browserSetTimeout = typeof window.setTimeout === "function"
          ? window.setTimeout.bind(window)
          : root.setTimeout.bind(root);
        const browserClearTimeout = typeof window.clearTimeout === "function"
          ? window.clearTimeout.bind(window)
          : root.clearTimeout.bind(root);
        const clearStartupTimers = () => {
          if (startupProbeTimer) {
            browserClearTimeout(startupProbeTimer);
            startupProbeTimer = 0;
          }
          if (startupDeadlineTimer) {
            browserClearTimeout(startupDeadlineTimer);
            startupDeadlineTimer = 0;
          }
        };
        const settle = (ok) => {
          if (settled) {
            return false;
          }
          settled = true;
          clearStartupTimers();
          if (unregisterCancelWaiter) {
            unregisterCancelWaiter();
            unregisterCancelWaiter = null;
          }
          resolve(ok);
          return true;
        };
        unregisterCancelWaiter = registerPlaybackCancelWaiter("browser_tts", () => {
          settle(false);
        });
        const markBrowserSpeechStarted = (startSignal = "event") => {
          if (started || settled) {
            return started;
          }
          if (!isCurrentBrowserPlayback()) {
            settle(false);
            return false;
          }
          started = true;
          clearStartupTimers();
          state.ttsDebugAudioStartedAt = performance.now();
          state.ttsDebugAudioEndedAt = 0;
          perfLog("tts", "browser_play_start", {
            traceId: String(opts.perfTraceId || state.activePerfTraceId || ""),
            ttsProvider: "browser",
            startSignal
          });
          if (opts.sessionId) {
            state.streamSpeakPlayedSession = Number(opts.sessionId || 0);
          }
          if (typeof opts.onPlaybackStart === "function") {
            try {
              opts.onPlaybackStart({
              source: "browser_tts",
              playbackGeneration,
              browserPlaybackToken,
              sessionId: Number(opts.sessionId || 0)
            });
            } catch (_) {
              // Optional playback hooks must not interrupt speech.
            }
          }
          beginSpeechPerformance(cleaned, speechMood, speechStyle, {
            performanceCue: speechPerformanceCue
          }, {
            source: "browser_tts",
            playbackGeneration,
            browserPlaybackToken,
            sessionId: Number(opts.sessionId || 0)
          });
          showSubtitleText(cleaned);
          setStatus("语音中...");
          return true;
        };
        const probeBrowserSpeechStart = () => {
          startupProbeTimer = 0;
          if (started || settled) {
            return;
          }
          if (!isCurrentBrowserPlayback()) {
            settle(false);
            return;
          }
          if (window.speechSynthesis?.speaking === true) {
            markBrowserSpeechStarted("speaking_state");
            return;
          }
          startupProbeTimer = browserSetTimeout(probeBrowserSpeechStart, 60);
        };
        utterance.onstart = () => {
          markBrowserSpeechStarted("event");
        };
        utterance.onend = () => {
          if (settled) return;
          if (!isCurrentBrowserPlayback()) {
            settle(false);
            return;
          }
          if (voice?.name) {
            state.ttsLastGoodVoiceName = voice.name;
          }
          state.conversationLastTtsFinishedAt = Date.now();
          perfLog("tts", "browser_play_end", {
            traceId: String(opts.perfTraceId || state.activePerfTraceId || ""),
            result: "ok"
          });
          finishSpeechAnimation();
          hideSubtitleText();
          setStatus("待机");
          settle(true);
        };
        utterance.onerror = () => {
          if (settled) return;
          if (!isCurrentBrowserPlayback()) {
            settle(false);
            return;
          }
          endSpeechAnimation();
          perfLog("tts", "browser_play_end", {
            traceId: String(opts.perfTraceId || state.activePerfTraceId || ""),
            result: "fail"
          });
          hideSubtitleText();
          setStatus("语音失败");
          settle(false);
        };

        try {
          if (!isCurrentBrowserPlayback()) {
            settle(false);
            return;
          }
          window.speechSynthesis.resume();
          window.speechSynthesis.speak(utterance);
          // Chromium on Windows can occasionally start audible speech without
          // delivering onstart. Poll the authoritative speaking state so the
          // mouth/body performance still begins only after real playback.
          startupProbeTimer = browserSetTimeout(probeBrowserSpeechStart, 40);
          // Guard against engines that fail silently (no onstart fired).
          startupDeadlineTimer = browserSetTimeout(() => {
            if (settled) return;
            if (!isCurrentBrowserPlayback()) {
              settle(false);
              return;
            }
            if (!started) {
              endSpeechAnimation();
              try {
                window.speechSynthesis.cancel();
              } catch (_) {
                // ignore
              }
              settle(false);
            }
          }, 1800);
        } catch (_) {
          settle(false);
        }
      });
    }

    async function speakByBrowser(text, opts = {}) {
      const force = !!opts.force;
      const preserveTurnPlaybackGeneration = opts.preserveTurnPlaybackGeneration === true;
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
      if (preserveTurnPlaybackGeneration) {
        if (opts.interrupt === true) {
          stopCurrentMediaInPlace();
        }
      } else {
        stopAllAudioPlayback();
      }
      const playbackGeneration = Number(state.ttsPlaybackGeneration || 0);
      const candidates = buildVoiceCandidates();
      const browserTTSOptions = {
        force,
        playbackGeneration,
        prosody: opts.prosody || null,
        mood: opts.mood || "",
        style: opts.style || state.currentTalkStyle || "neutral",
        voiceStyle: opts.voiceStyle || "",
        performanceCue: opts.performanceCue || null,
        preserveTurnPlaybackGeneration,
        sessionId: Number(opts.sessionId || 0),
        onPlaybackStart: typeof opts.onPlaybackStart === "function" ? opts.onPlaybackStart : null
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
      const scope = getServerTTSRequestScope(requestOpts);
      try {
        return await TTS_API.requestServerTTSBlob(text, prosody, {
          authFetch,
          sanitizeSpeakText,
          perfLog,
          traceId: String(requestOpts.traceId || state.activePerfTraceId || "").trim(),
          timeoutMs: Math.max(
            1500,
            Math.min(90000, Math.round(Number(requestOpts.timeoutMs) || Number(state.ttsServerRequestTimeoutMs) || 14000))
          ),
          voice: state.ttsServerVoice,
          signal: scope?.signal || requestOpts.signal || null,
          now: () => performance.now(),
          wallNow: () => Date.now()
        });
      } finally {
        releaseServerTTSRequestScope(scope);
      }
    }

    async function playServerTTSStream(text, opts = {}) {
      const cleaned = sanitizeSpeakText(text);
      const playbackGeneration = Number(opts.playbackGeneration || state.ttsPlaybackGeneration || 0);
      const result = { ok: false, started: false, cancelled: false, error: "" };
      const streamProviderEnabled = (
        state.ttsProvider === "gpt_sovits"
        && state.gptSovitsStreamPlayback === true
      ) || (
        state.ttsProvider === "qwen3_tts"
        && state.qwen3TtsStreamPlayback !== false
      );
      if (
        !cleaned
        || !streamProviderEnabled
        || typeof TTS_API.requestServerTTSStream !== "function"
        || typeof PCM_STREAM.playPcmStream !== "function"
      ) {
        return result;
      }
      const scope = createServerTTSRequestScope({
        signal: opts.signal || null,
        kind: "pcm_stream",
        sessionId: Number(opts.sessionId || 0),
        playbackGeneration,
        traceId: String(opts.perfTraceId || state.activePerfTraceId || "")
      });
      let stream = null;
      let unregisterCancelWaiter = null;
      try {
        const sameVoiceRetries = state.preferVoiceConsistency === true
          ? Math.max(0, Math.min(4, Number(state.sameVoiceRetryCount) || 0))
          : 0;
        let requestAttempt = 0;
        while (!stream) {
          try {
            stream = await TTS_API.requestServerTTSStream(cleaned, opts.prosody || null, {
              authFetch,
              sanitizeSpeakText,
              traceId: String(opts.perfTraceId || state.activePerfTraceId || ""),
              timeoutMs: Number(state.ttsServerRequestTimeoutMs || 14000),
              voice: state.ttsServerVoice,
              signal: scope?.signal || opts.signal || null,
              wallNow: () => Date.now()
            });
          } catch (err) {
            if (
              isServerTTSRequestCancelled(err, { signal: scope?.signal || opts.signal })
              || requestAttempt >= sameVoiceRetries
            ) {
              throw err;
            }
            requestAttempt += 1;
            const delayMs = Math.max(
              80,
              Math.min(
                3000,
                Math.round((Number(state.ttsServerRetryDelayMs) || 220) * requestAttempt)
              )
            );
            recordTTSDebugEvent("pcm_stream_same_voice_retry", {
              traceId: String(opts.perfTraceId || state.activePerfTraceId || ""),
              sessionId: Number(opts.sessionId || 0),
              result: "retry",
              error: String(err?.message || err || ""),
              attempt: requestAttempt,
              delayMs
            });
            await new Promise((resolve) => window.setTimeout(resolve, delayMs));
          }
        }
        if (!stream || !isCurrentTTSPlaybackGeneration(playbackGeneration)) {
          result.cancelled = true;
          await stream?.close?.(true);
          return result;
        }
        const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
        if (!state.ttsAudioContext && AudioContextCtor) state.ttsAudioContext = new AudioContextCtor();
        const context = state.ttsAudioContext;
        if (!context) throw new Error("AudioContext is unavailable for streaming TTS");
        if (
          typeof context.createAnalyser === "function"
          && (!state.ttsPcmAudioAnalyser || state.ttsPcmAudioAnalyser.context !== context)
        ) {
          state.ttsPcmAudioAnalyser = context.createAnalyser();
          state.ttsPcmAudioAnalyser.fftSize = 256;
          state.ttsPcmAudioAnalyser.smoothingTimeConstant = 0.12;
          state.ttsPcmAudioAnalyserData = new Uint8Array(state.ttsPcmAudioAnalyser.frequencyBinCount);
          state.ttsPcmAudioAnalyser.connect(context.destination);
        }
        state.ttsPcmAudioAnalyserActive = !!state.ttsPcmAudioAnalyser;
        unregisterCancelWaiter = registerPlaybackCancelWaiter("pcm_stream", () => {
          result.cancelled = true;
          abortServerTTSRequestScope(scope, "playback_stopped");
          stream?.close?.(true);
        });
        const playback = await PCM_STREAM.playPcmStream(stream.reader, {
          audioContext: context,
          outputNode: state.ttsPcmAudioAnalyser || context.destination,
          source: `${state.ttsProvider}_pcm_stream`,
          signal: scope?.signal || stream.signal || opts.signal || null,
          onPlaybackStart: (event = {}) => {
            if (!isCurrentTTSPlaybackGeneration(playbackGeneration)) return;
            result.started = true;
            state.ttsContextSpeaking = true;
            state.streamSpeakPlayedSession = Number(opts.sessionId || 0);
            beginSpeechPerformance(cleaned, opts.mood || detectMood(cleaned), opts.style || state.currentTalkStyle || "neutral", {
              performanceCue: opts.performanceCue || null
            }, {
              source: `${state.ttsProvider}_pcm_stream`,
              playbackGeneration,
              sessionId: Number(opts.sessionId || 0)
            });
            showSubtitleText(cleaned);
            setStatus("语音中...");
            perfLog("tts", "pcm_stream_play_start", {
              traceId: String(opts.perfTraceId || state.activePerfTraceId || ""),
              ttsProvider: state.ttsProvider
            });
            opts.onPlaybackStart?.({
              ...event,
              playbackGeneration,
              sessionId: Number(opts.sessionId || 0)
            });
          },
          onPlaybackProgress: (event = {}) => {
            if (!isCurrentTTSPlaybackGeneration(playbackGeneration)) return;
            opts.onPlaybackProgress?.({
              ...event,
              text: cleaned,
              playbackGeneration,
              sessionId: Number(opts.sessionId || 0)
            });
          }
        });
        result.started = result.started || playback?.started === true;
        result.cancelled = result.cancelled || playback?.cancelled === true;
        result.ok = playback?.ok === true && isCurrentTTSPlaybackGeneration(playbackGeneration);
        if (result.ok) {
          state.conversationLastTtsFinishedAt = Date.now();
          finishSpeechAnimation();
          hideSubtitleText();
          setStatus("待机");
        } else if (result.started) {
          endSpeechAnimation();
          hideSubtitleText();
        }
        perfLog("tts", "pcm_stream_play_end", {
          traceId: String(opts.perfTraceId || state.activePerfTraceId || ""),
          result: result.ok ? "ok" : (result.cancelled ? "cancelled" : "fail")
        });
        return result;
      } catch (err) {
        result.cancelled = isServerTTSRequestCancelled(err, { signal: scope?.signal || opts.signal });
        result.error = String(err?.message || err || "");
        if (result.started) {
          endSpeechAnimation();
          hideSubtitleText();
        }
        recordTTSDebugEvent("pcm_stream_fail", {
          traceId: String(opts.perfTraceId || state.activePerfTraceId || ""),
          sessionId: Number(opts.sessionId || 0),
          result: result.cancelled ? "cancelled" : "fail",
          error: result.error
        });
        return result;
      } finally {
        state.ttsContextSpeaking = false;
        state.ttsPcmAudioAnalyserActive = false;
        if (unregisterCancelWaiter) unregisterCancelWaiter();
        await stream?.close?.(result.cancelled || !result.ok);
        releaseServerTTSRequestScope(scope);
      }
    }

    async function requestServerTTSBlobWithRetry(text, prosody = null, opts = {}) {
      if (typeof TTS_API.requestServerTTSBlobWithRetry !== "function") {
        throw new Error("ttsApi retry helper is not available");
      }
      const scope = getServerTTSRequestScope(opts);
      try {
        return await TTS_API.requestServerTTSBlobWithRetry(text, prosody, {
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
          signal: scope?.signal || opts.signal || null,
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
      } finally {
        releaseServerTTSRequestScope(scope);
      }
    }

    async function playAudioByContext(blob, debugContext = {}, onPlaybackStart = null, onPlaybackProgress = null) {
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
      let contextPlaybackCancelled = false;
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
        await new Promise((resolve) => {
          let resolved = false;
          let unregisterCancelWaiter = null;
          let contextProgressTimer = 0;
          const resolveOnce = () => {
            if (resolved) {
              return;
            }
            resolved = true;
            if (unregisterCancelWaiter) {
              unregisterCancelWaiter();
              unregisterCancelWaiter = null;
            }
            if (contextProgressTimer) {
              clearInterval(contextProgressTimer);
              contextProgressTimer = 0;
            }
            resolve();
          };
          unregisterCancelWaiter = registerPlaybackCancelWaiter("context_tts", () => {
            contextPlaybackCancelled = true;
            resolveOnce();
          });
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
          const contextStartedAt = Number(ctx.currentTime || 0);
          contextPlaybackStarted = true;
          state.ttsContextSpeaking = true;
          markedSpeaking = true;
          recordTTSDebugEvent("context_play_start", {
            ...debugContext,
            blobBytes: Number(blob?.size || arrayBuf.byteLength || 0),
            durationMs: Number.isFinite(Number(decoded.duration)) && decoded.duration > 0
              ? Math.round(decoded.duration * 1000)
              : -1
          });
          perfLog("tts", "context_play_start", {
            traceId: String(debugContext.traceId || state.activePerfTraceId || ""),
            ttsProvider: String(state.ttsProvider || "")
          });
          state.ttsDebugAudioStartedAt = performance.now();
          state.ttsDebugAudioEndedAt = 0;
          if (debugContext.sessionId) {
            state.streamSpeakPlayedSession = Number(debugContext.sessionId || 0);
          }
          if (typeof onPlaybackStart === "function") {
            try {
              onPlaybackStart({
                source: "context_tts",
                playbackGeneration,
                sessionId: Number(debugContext.sessionId || 0),
                durationMs
              });
            } catch (_) {
              // Optional playback hooks must not interrupt speech.
            }
          }
          if (typeof onPlaybackProgress === "function") {
            contextProgressTimer = window.setInterval(() => {
              if (resolved || !isCurrentTTSPlaybackGeneration(playbackGeneration)) return;
              const elapsedMs = Math.max(0, Math.min(
                durationMs,
                Math.round((Number(ctx.currentTime || 0) - contextStartedAt) * 1000)
              ));
              try {
                onPlaybackProgress({
                  source: "context_tts",
                  text: String(debugContext.speechText || debugContext.text || ""),
                  elapsedMs,
                  durationMs,
                  playbackGeneration,
                  sessionId: Number(debugContext.sessionId || 0)
                });
              } catch (_) {
                // Subtitle timing hooks must never interrupt audio.
              }
            }, 50);
          }
          const contextSpeechText = sanitizeSpeakText(debugContext.speechText || debugContext.text || "");
          if (contextSpeechText) {
            beginSpeechPerformance(
              contextSpeechText,
              String(debugContext.speechMood || detectMood(contextSpeechText) || "idle"),
              normalizeTalkStyle(debugContext.speechStyle || state.currentTalkStyle || "neutral"),
              {
                durationMs,
                performanceCue: debugContext.speechPerformanceCue || debugContext.performanceCue || null
              },
              {
                source: "context_tts",
                playbackGeneration,
                sessionId: Number(debugContext.sessionId || 0)
              }
            );
            showSubtitleText(contextSpeechText);
          }
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
        if (contextPlaybackCancelled || !contextPlaybackStarted || !isCurrentTTSPlaybackGeneration(playbackGeneration)) {
          recordTTSDebugEvent("context_stale_skip", {
            ...debugContext,
            result: contextPlaybackCancelled ? "cancelled" : "stale"
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
        perfLog("tts", "context_play_end", {
          traceId: String(debugContext.traceId || state.activePerfTraceId || ""),
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
      const speechPerformanceCue = opts.performanceCue && typeof opts.performanceCue === "object"
        ? opts.performanceCue
        : null;
      const onPlaybackStart = typeof opts.onPlaybackStart === "function"
        ? opts.onPlaybackStart
        : null;
      const onPlaybackProgress = typeof opts.onPlaybackProgress === "function"
        ? opts.onPlaybackProgress
        : null;
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
        let unregisterCancelWaiter = null;
        let failTimer = 0;
        let startupTimer = 0;
        let progressTimer = 0;
        let subtitleProgressTimer = 0;
        let fallbackSpeechStarted = false;
        let playbackStartNotified = false;
        const notifyPlaybackStart = (source) => {
          if (playbackStartNotified || typeof onPlaybackStart !== "function") {
            return;
          }
          playbackStartNotified = true;
          try {
            onPlaybackStart({
              source,
              playbackGeneration,
              sessionId: Number(debugContext.sessionId || 0),
              durationMs: Number.isFinite(Number(audio.duration)) && audio.duration > 0
                ? Math.round(audio.duration * 1000)
                : 0
            });
          } catch (_) {
            // Optional playback hooks must not interrupt speech.
          }
        };
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
        const contextPlaybackDebugContext = {
          ...debugContext,
          speechText,
          speechMood,
          speechStyle,
          speechPerformanceCue
        };
        const beginFallbackSpeech = () => {
          if (!isCurrentTTSPlaybackGeneration(playbackGeneration) || fallbackSpeechStarted) {
            return false;
          }
          fallbackSpeechStarted = true;
          recordTTSDebugEvent("audio_fallback_begin", {
            ...debugContext,
            durationMs: Number.isFinite(Number(audio.duration)) && audio.duration > 0
              ? Math.round(audio.duration * 1000)
              : -1,
            currentMs: Math.round(Number(audio.currentTime || 0) * 1000)
          });
          return true;
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
          if (unregisterCancelWaiter) {
            unregisterCancelWaiter();
            unregisterCancelWaiter = null;
          }
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
          if (subtitleProgressTimer) {
            clearInterval(subtitleProgressTimer);
            subtitleProgressTimer = 0;
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
          perfLog("tts", "audio_play_end", {
            traceId: String(perfTraceId || debugContext.traceId || state.activePerfTraceId || ""),
            result: ok ? "ok" : "fail"
          });
          try {
            URL.revokeObjectURL(url);
          } catch (_) {
            // ignore
          }
          setStatus(ok ? "待机" : "语音失败");
          resolve(ok);
        };
        unregisterCancelWaiter = registerPlaybackCancelWaiter("html_audio", () => {
          done(false);
        });
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
          const ok = await playAudioByContext(blob, contextPlaybackDebugContext, notifyPlaybackStart, onPlaybackProgress);
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
          notifyPlaybackStart("server_tts");
          if (state.ttsAudioContext && typeof state.ttsAudioContext.resume === "function") {
            state.ttsAudioContext.resume().catch(() => {});
          }
          if (progressTimer) {
            clearInterval(progressTimer);
            progressTimer = 0;
          }
          if (subtitleProgressTimer) {
            clearInterval(subtitleProgressTimer);
            subtitleProgressTimer = 0;
          }
          if (typeof onPlaybackProgress === "function") {
            subtitleProgressTimer = window.setInterval(() => {
              if (settled || !isCurrentHtmlAudioPlayback()) return;
              try {
                onPlaybackProgress({
                  source: "server_tts",
                  text: speechText,
                  elapsedMs: Math.max(0, Math.round(Number(audio.currentTime || 0) * 1000)),
                  durationMs: Number.isFinite(Number(audio.duration)) && audio.duration > 0
                    ? Math.round(audio.duration * 1000)
                    : 0,
                  playbackGeneration,
                  sessionId: Number(debugContext.sessionId || 0)
                });
              } catch (_) {
                // Subtitle timing hooks must never interrupt audio.
              }
            }, 50);
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
            const ok = await playAudioByContext(blob, contextPlaybackDebugContext, notifyPlaybackStart, onPlaybackProgress);
            done(!!ok);
          }, 650);
          beginSpeechPerformance(speechText, speechMood, speechStyle, {
            durationMs: Number.isFinite(Number(audio.duration)) && audio.duration > 0
              ? Math.round(audio.duration * 1000)
              : undefined,
            performanceCue: speechPerformanceCue
          }, {
            source: "server_tts",
            playbackGeneration,
            sessionId: debugContext.sessionId
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
            if (audio.paused && !audio.ended) {
              audio.play().catch(async () => {
                if (!isCurrentTTSPlaybackGeneration(playbackGeneration)) {
                  done(false);
                  return;
                }
                beginFallbackSpeech();
                const ok = await playAudioByContext(blob, contextPlaybackDebugContext, notifyPlaybackStart, onPlaybackProgress);
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
          const ok = await playAudioByContext(blob, contextPlaybackDebugContext, notifyPlaybackStart, onPlaybackProgress);
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
            const ok = await playAudioByContext(blob, contextPlaybackDebugContext, notifyPlaybackStart, onPlaybackProgress);
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
          advanceBrowserPlaybackToken();
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
        if (state.gptSovitsStreamPlayback === true && opts.allowStreamPlayback !== false) {
          const streamResult = await playServerTTSStream(cleaned, {
            ...opts,
            perfTraceId,
            playbackGeneration
          });
          if (streamResult.ok) return true;
          if (streamResult.cancelled) {
            if (opts.requestOutcome && typeof opts.requestOutcome === "object") opts.requestOutcome.cancelled = true;
            return false;
          }
          if (streamResult.started) {
            // Never replay an utterance after any streaming audio may have been heard.
            return false;
          }
          recordTTSDebugEvent("pcm_stream_buffered_fallback", {
            traceId: perfTraceId || "(none)",
            sessionId: Number(opts.sessionId || 0),
            result: "fallback_before_start",
            error: streamResult.error || ""
          });
        }
        const blob = await requestServerTTSBlobWithRetry(cleaned, opts.prosody || null, {
          retries: Number.isFinite(Number(opts.retries))
            ? Number(opts.retries)
            : Number(state.ttsServerRetryCount),
          retryDelayMs: Number(state.ttsServerRetryDelayMs),
          timeoutMs: Number(state.ttsServerRequestTimeoutMs),
          traceId: perfTraceId,
          signal: opts.signal || null,
          playbackGeneration,
          sessionId: Number(opts.sessionId || 0),
          kind: "direct"
        });
        if (isServerTTSRequestCancelled(null, opts)) {
          if (opts.requestOutcome && typeof opts.requestOutcome === "object") {
            opts.requestOutcome.cancelled = true;
          }
          recordTTSDebugEvent("speak_cancelled", {
            traceId: perfTraceId || "(none)",
            sessionId: Number(opts.sessionId || 0),
            playbackGeneration,
            result: "request_cancelled"
          });
          return false;
        }
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
          performanceCue: opts.performanceCue || null,
          perfTraceId,
          perfBlobReadyPerfMs: performance.now(),
          perfSpeakStartedPerfMs: speakStartedPerfMs,
          playbackGeneration,
          sessionId: Number(opts.sessionId || 0),
          onPlaybackStart: typeof opts.onPlaybackStart === "function" ? opts.onPlaybackStart : null,
          onPlaybackProgress: typeof opts.onPlaybackProgress === "function" ? opts.onPlaybackProgress : null
        });
      } catch (err) {
        if (isServerTTSRequestCancelled(err, opts)) {
          if (opts.requestOutcome && typeof opts.requestOutcome === "object") {
            opts.requestOutcome.cancelled = true;
          }
          recordTTSDebugEvent("speak_cancelled", {
            traceId: perfTraceId || "(none)",
            sessionId: Number(opts.sessionId || 0),
            playbackGeneration,
            result: "request_cancelled",
            error: String(err?.message || err || "")
          });
          return false;
        }
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
        if (!state.serverTTSFallbackToBrowser) {
          setStatus("语音服务未就绪");
        }
        return false;
      }
    }

    async function speak(text, opts = {}) {
      const requestOutcome = opts.requestOutcome && typeof opts.requestOutcome === "object"
        ? opts.requestOutcome
        : { cancelled: false };
      const speakOpts = {
        ...opts,
        requestOutcome,
        playbackGeneration: Number(opts.playbackGeneration || state.ttsPlaybackGeneration || 0)
      };
      if (isServerTTSProvider(state.ttsProvider)) {
        if (!shouldAttemptServerTTS()) {
          recordTTSDebugEvent("server_tts_recovery_probe_deferred", {
            provider: String(state.ttsProvider || ""),
            nextProbeAt: Number(state.ttsServerNextRecoveryProbeAt || 0)
          });
          return await speakByBrowser(text, speakOpts);
        }
        const ok = await speakByServer(text, speakOpts);
        if (ok) {
          markServerTTSRecovered();
          return true;
        }
        if (requestOutcome.cancelled === true || speakOpts.signal?.aborted === true) {
          recordTTSDebugEvent("speak_fallback_cancelled_skip", {
            traceId: String(speakOpts.perfTraceId || state.activePerfTraceId || "(none)"),
            text,
            result: "request_cancelled"
          });
          return false;
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
          state.ttsProvider === "qwen3_tts" ||
          lastErrLower.includes("connection failed") ||
          lastErrLower.includes("network") ||
          lastErrLower.includes("timeout") ||
          lastErrLower.includes("aborted") ||
          lastErrLower.includes("empty audio") ||
          /^http\s+5\d\d$/i.test(lastErr);
        if (immediateBrowserFallback) {
          markServerTTSFallback(lastErr);
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
        markServerTTSFallback(lastErr);
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
      createServerTTSRequestScope,
      abortServerTTSRequestScope,
      abortServerTTSRequests,
      requestServerTTSBlob,
      requestServerTTSBlobWithRetry,
      playServerTTSStream,
      playAudioByContext,
      playAudioBlob,
      shouldAttemptServerTTS,
      markServerTTSFallback,
      markServerTTSRecovered,
      speakByServer,
      speakByBrowser,
      speak
    };
  }

  const api = { createController };
  root.TaffyTTSPlaybackController = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
