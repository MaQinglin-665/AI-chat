(function (root) {
  "use strict";

  function createController(deps = {}) {
    const state = deps.state || {};
    const window = deps.windowObject || root;
    const console = deps.consoleObject || root.console || { warn() {} };
    const isServerTTSProvider = typeof deps.isServerTTSProvider === "function" ? deps.isServerTTSProvider : () => false;
    const buildSpeechDeliveryText = typeof deps.buildSpeechDeliveryText === "function" ? deps.buildSpeechDeliveryText : (text) => String(text || "").trim();
    const detectMood = typeof deps.detectMood === "function" ? deps.detectMood : () => "idle";
    const buildSpeakProsody = typeof deps.buildSpeakProsody === "function" ? deps.buildSpeakProsody : () => null;
    const recordTTSDebugEvent = typeof deps.recordTTSDebugEvent === "function" ? deps.recordTTSDebugEvent : () => {};
    const requestServerTTSBlob = typeof deps.requestServerTTSBlob === "function" ? deps.requestServerTTSBlob : async () => null;
    const setStatus = typeof deps.setStatus === "function" ? deps.setStatus : () => {};
    const playAudioBlob = typeof deps.playAudioBlob === "function" ? deps.playAudioBlob : async () => false;
    const isCurrentTTSPlaybackGeneration = typeof deps.isCurrentTTSPlaybackGeneration === "function" ? deps.isCurrentTTSPlaybackGeneration : () => true;
    const splitStreamSpeakSegments = typeof deps.splitStreamSpeakSegments === "function" ? deps.splitStreamSpeakSegments : () => ({ segments: [], rest: "" });
    const maybePlayTalkGesture = typeof deps.maybePlayTalkGesture === "function" ? deps.maybePlayTalkGesture : () => {};
    const buildStableSpeakText = typeof deps.buildStableSpeakText === "function" ? deps.buildStableSpeakText : (text) => String(text || "").trim();
    const sanitizeSpeakText = typeof deps.sanitizeSpeakText === "function" ? deps.sanitizeSpeakText : (text) => String(text || "").trim();
    const speak = typeof deps.speak === "function" ? deps.speak : async () => false;

    function shouldUseStreamSpeak() {
      return (
        state.speakingEnabled &&
        isServerTTSProvider(state.ttsProvider) &&
        state.streamSpeakEnabled
        && state.streamSpeakMode === "realtime"
        && (state.ttsProvider !== "gpt_sovits" || state.gptSovitsRealtimeTTS)
      );
    }

    function shouldSerializeStreamTTSRequests() {
      return state.ttsProvider === "gpt_sovits";
    }

    function ensureStreamSpeakBlobPromise(item) {
      if (!item) {
        return null;
      }
      if (item.blobPromise) {
        return item.blobPromise;
      }
      const prosody = shouldSerializeStreamTTSRequests()
        ? null
        : item.prosody || buildSpeakProsody(
          item.text,
          detectMood(item.text),
          true,
          item.style || state.currentTalkStyle || "neutral"
        );
      item.prosody = prosody;
      recordTTSDebugEvent("stream_request_start", {
        traceId: item.traceId,
        sessionId: item.sessionId,
        segmentId: item.segmentId,
        text: item.text
      });
      item.blobPromise = requestServerTTSBlob(item.text, prosody, {
        traceId: item.traceId || state.activePerfTraceId || ""
      }).then((blob) => {
        recordTTSDebugEvent("stream_request_ok", {
          traceId: item.traceId,
          sessionId: item.sessionId,
          segmentId: item.segmentId,
          text: item.text,
          blobBytes: Number(blob?.size || 0)
        });
        return blob;
      }).catch((err) => {
        recordTTSDebugEvent("stream_request_fail", {
          traceId: item.traceId,
          sessionId: item.sessionId,
          segmentId: item.segmentId,
          text: item.text,
          error: String(err?.message || err || "")
        });
        throw err;
      });
      return item.blobPromise;
    }

    function enqueueStreamSpeakSegment(text, sessionId, prosody = null, style = "neutral") {
      const cleaned = buildSpeechDeliveryText(text, detectMood(text), style, true);
      if (!cleaned) {
        return;
      }
      const item = {
        text: cleaned,
        sessionId,
        prosody,
        style,
        playbackGeneration: Number(state.ttsPlaybackGeneration || 0),
        blobPromise: null,
        segmentId: ++state.perfTtsSeq,
        traceId: state.activePerfTraceId || ""
      };
      state.streamSpeakQueue.push(item);
      state.streamSpeakLastEnqueueSession = sessionId;
      recordTTSDebugEvent("stream_enqueue", {
        traceId: item.traceId,
        sessionId,
        segmentId: item.segmentId,
        text: cleaned
      });
      if (!shouldSerializeStreamTTSRequests()) {
        ensureStreamSpeakBlobPromise(item);
      }
    }

    function dequeueStreamSpeakItem(sessionId) {
      if (!Array.isArray(state.streamSpeakQueue) || state.streamSpeakQueue.length <= 0) {
        return null;
      }
      for (let i = 0; i < state.streamSpeakQueue.length; i += 1) {
        const item = state.streamSpeakQueue[i];
        if (!item) {
          state.streamSpeakQueue.splice(i, 1);
          i -= 1;
          continue;
        }
        if (item.sessionId !== sessionId) {
          continue;
        }
        state.streamSpeakQueue.splice(i, 1);
        return item;
      }
      return null;
    }

    function hasQueuedStreamSpeakItem(sessionId) {
      return Array.isArray(state.streamSpeakQueue)
        && state.streamSpeakQueue.some((item) => item && item.sessionId === sessionId);
    }

    function discardQueuedStreamSpeakItems(sessionId) {
      if (!Array.isArray(state.streamSpeakQueue) || state.streamSpeakQueue.length <= 0) {
        return 0;
      }
      const before = state.streamSpeakQueue.length;
      state.streamSpeakQueue = state.streamSpeakQueue.filter(
        (item) => item && item.sessionId !== sessionId
      );
      return before - state.streamSpeakQueue.length;
    }

    function ensureStreamSpeakQueueRunning(sessionId, delayMs = 0) {
      const safeSession = Number(sessionId || 0);
      if (!safeSession || safeSession !== state.streamSpeakSession || !shouldUseStreamSpeak()) {
        return;
      }
      const delay = Math.max(0, Math.min(360, Math.round(Number(delayMs) || 0)));
      window.setTimeout(() => {
        if (safeSession !== state.streamSpeakSession || !shouldUseStreamSpeak()) {
          return;
        }
        if (!hasQueuedStreamSpeakItem(safeSession)) {
          return;
        }
        if (
          state.streamSpeakWorking
          && Number(state.streamSpeakWorkingSession || 0) === safeSession
        ) {
          ensureStreamSpeakQueueRunning(safeSession, 80);
          return;
        }
        if (
          state.streamSpeakWorking
          && Number(state.streamSpeakWorkingSession || 0) !== safeSession
        ) {
          recordTTSDebugEvent("stream_run_clear_stale_busy", {
            sessionId: safeSession,
            result: "stale_busy",
            error: String(state.streamSpeakWorkingSession || "")
          });
          state.streamSpeakWorking = false;
          state.streamSpeakWorkingSession = 0;
        }
        runStreamSpeakQueue();
      }, delay);
    }

    async function waitNextStreamSpeakItem(sessionId, waitMs = 0) {
      let item = dequeueStreamSpeakItem(sessionId);
      if (item || waitMs <= 0) {
        return item;
      }
      const end = Date.now() + Math.max(0, Number(waitMs) || 0);
      while (Date.now() < end) {
        if (sessionId !== state.streamSpeakSession) {
          return null;
        }
        await new Promise((resolve) => setTimeout(resolve, 18));
        item = dequeueStreamSpeakItem(sessionId);
        if (item) {
          return item;
        }
      }
      return null;
    }

    async function runStreamSpeakQueue() {
      if (state.streamSpeakWorking) {
        recordTTSDebugEvent("stream_run_skip_busy");
        return;
      }
      const activeSession = state.streamSpeakSession;
      state.streamSpeakWorking = true;
      state.streamSpeakWorkingSession = activeSession;
      recordTTSDebugEvent("stream_run_start", { sessionId: activeSession });
      try {
        if (!state.speakingEnabled || !isServerTTSProvider(state.ttsProvider)) {
          recordTTSDebugEvent("stream_run_disabled", { sessionId: activeSession });
          return;
        }

        const idleWaitMs = Math.max(30, Math.min(220, Number(state.streamSpeakIdleWaitMs) || 90));
        let current = await waitNextStreamSpeakItem(activeSession, state.chatBusy ? idleWaitMs : 60);
        if (!current) {
          recordTTSDebugEvent("stream_run_empty", { sessionId: activeSession });
          return;
        }

        while (current) {
          if (activeSession !== state.streamSpeakSession) {
            recordTTSDebugEvent("stream_session_changed", {
              sessionId: activeSession,
              result: "break"
            });
            break;
          }
          let currentBlob = null;
          try {
            currentBlob = await ensureStreamSpeakBlobPromise(current);
          } catch (err) {
            console.warn("Stream TTS fetch failed:", err);
            // Retry once without prosody to avoid provider-side parsing instability.
            try {
              recordTTSDebugEvent("stream_retry_no_prosody", {
                traceId: current.traceId,
                sessionId: activeSession,
                segmentId: current.segmentId,
                text: current.text,
                error: String(err?.message || err || "")
              });
              currentBlob = await requestServerTTSBlob(current.text, null, {
                traceId: current.traceId || state.activePerfTraceId || ""
              });
            } catch (retryErr) {
              console.warn("Stream TTS retry failed:", retryErr);
              recordTTSDebugEvent("stream_retry_fail", {
                traceId: current.traceId,
                sessionId: activeSession,
                segmentId: current.segmentId,
                text: current.text,
                error: String(retryErr?.message || retryErr || "")
              });
              setStatus("语音片段失败，已跳过");
              current = await waitNextStreamSpeakItem(activeSession, state.chatBusy ? idleWaitMs : 60);
              continue;
            }
          }
          if (!currentBlob) {
            recordTTSDebugEvent("stream_empty_blob", {
              traceId: current.traceId,
              sessionId: activeSession,
              segmentId: current.segmentId,
              text: current.text
            });
            current = await waitNextStreamSpeakItem(activeSession, 20);
            continue;
          }
          if (
            activeSession !== state.streamSpeakSession ||
            !isCurrentTTSPlaybackGeneration(current.playbackGeneration)
          ) {
            recordTTSDebugEvent("stream_stale_skip", {
              traceId: current.traceId,
              sessionId: activeSession,
              segmentId: current.segmentId,
              text: current.text,
              result: "stale"
            });
            break;
          }
          let next = dequeueStreamSpeakItem(activeSession);
          if (!next) {
            next = await waitNextStreamSpeakItem(activeSession, state.chatBusy ? idleWaitMs : 80);
          }
          if (next) {
            ensureStreamSpeakBlobPromise(next);
          }

          await playAudioBlob(currentBlob, {
            interrupt: false,
            text: current.text,
            mood: detectMood(current.text),
            style: current.style || state.currentTalkStyle || "neutral",
            perfTraceId: current.traceId || state.activePerfTraceId || "",
            segmentId: current.segmentId,
            sessionId: activeSession,
            playbackGeneration: current.playbackGeneration
          });
          current = next || await waitNextStreamSpeakItem(
            activeSession,
            state.chatBusy ? idleWaitMs : 180
          );
        }
        state.ttsServerAvailable = true;
      } catch (err) {
        console.warn("Stream speak queue failed:", err);
        recordTTSDebugEvent("stream_run_fail", {
          sessionId: activeSession,
          error: String(err?.message || err || "")
        });
      } finally {
        if (Number(state.streamSpeakWorkingSession || 0) === Number(activeSession || 0)) {
          state.streamSpeakWorking = false;
          state.streamSpeakWorkingSession = 0;
        }
        recordTTSDebugEvent("stream_run_done", { sessionId: activeSession });
        if (
          activeSession === state.streamSpeakSession
          && shouldUseStreamSpeak()
          && hasQueuedStreamSpeakItem(activeSession)
        ) {
          recordTTSDebugEvent("stream_run_restart", { sessionId: activeSession });
          window.setTimeout(() => runStreamSpeakQueue(), 0);
        } else if (
          activeSession !== state.streamSpeakSession
          && shouldUseStreamSpeak()
          && hasQueuedStreamSpeakItem(state.streamSpeakSession)
        ) {
          recordTTSDebugEvent("stream_run_handoff", { sessionId: state.streamSpeakSession });
          ensureStreamSpeakQueueRunning(state.streamSpeakSession, 0);
        }
      }
    }

    function feedStreamSpeakDelta(delta, sessionId, style = "neutral") {
      if (!shouldUseStreamSpeak()) {
        return;
      }
      if (sessionId !== state.streamSpeakSession) {
        return;
      }
      state.streamSpeakBuffer += String(delta || "");
      const parsed = splitStreamSpeakSegments(state.streamSpeakBuffer, false);
      state.streamSpeakBuffer = parsed.rest;
      for (const seg of parsed.segments) {
        const mood = detectMood(seg);
        const prosody = buildSpeakProsody(seg, mood, true, style);
        enqueueStreamSpeakSegment(seg, sessionId, prosody, style);
        maybePlayTalkGesture(seg, style);
      }
      if (parsed.segments.length) {
        ensureStreamSpeakQueueRunning(sessionId, 0);
      }
    }

    function flushStreamSpeak(sessionId, style = "neutral") {
      if (sessionId !== state.streamSpeakSession) {
        return;
      }
      const parsed = splitStreamSpeakSegments(state.streamSpeakBuffer, true);
      state.streamSpeakBuffer = "";
      for (const seg of parsed.segments) {
        const mood = detectMood(seg);
        const prosody = buildSpeakProsody(seg, mood, false, style);
        enqueueStreamSpeakSegment(seg, sessionId, prosody, style);
        maybePlayTalkGesture(seg, style);
      }
      if (parsed.segments.length) {
        ensureStreamSpeakQueueRunning(sessionId, 0);
      }
    }

    function scheduleFinalSpeechWatchdog({
      sessionId,
      text,
      mood = "idle",
      style = "neutral",
      traceId = ""
    } = {}) {
      const safeSession = Number(sessionId || 0);
      const safeText = buildStableSpeakText(text) || sanitizeSpeakText(text);
      if (!safeSession || !safeText || !shouldUseStreamSpeak()) {
        return;
      }
      const generation = Number(state.ttsPlaybackGeneration || 0);
      const startedAt = Number(state.ttsDebugAudioStartedAt || 0);
      window.setTimeout(async () => {
        if (
          safeSession !== state.streamSpeakSession
          || !isCurrentTTSPlaybackGeneration(generation)
          || state.streamSpeakPlayedSession === safeSession
        ) {
          return;
        }
        if (hasQueuedStreamSpeakItem(safeSession) || state.streamSpeakWorking) {
          ensureStreamSpeakQueueRunning(safeSession, 0);
          window.setTimeout(async () => {
            if (
              safeSession !== state.streamSpeakSession
              || !isCurrentTTSPlaybackGeneration(generation)
              || state.streamSpeakPlayedSession === safeSession
            ) {
              return;
            }
            recordTTSDebugEvent("final_watchdog_tts", {
              traceId,
              sessionId: safeSession,
              text: safeText,
              result: "fallback_after_queue_wait"
            });
            const prosody = buildSpeakProsody(safeText, mood, false, style);
            await speak(safeText, { prosody, interrupt: true, mood, style, perfTraceId: traceId, playbackGeneration: generation });
          }, 2200);
          return;
        }
        if (Number(state.ttsDebugAudioStartedAt || 0) > startedAt) {
          return;
        }
        recordTTSDebugEvent("final_watchdog_tts", {
          traceId,
          sessionId: safeSession,
          text: safeText,
          result: "fallback"
        });
        const prosody = buildSpeakProsody(safeText, mood, false, style);
        await speak(safeText, { prosody, interrupt: true, mood, style, perfTraceId: traceId, playbackGeneration: generation });
      }, 2600);
    }

    return {
      shouldUseStreamSpeak,
      shouldSerializeStreamTTSRequests,
      ensureStreamSpeakBlobPromise,
      enqueueStreamSpeakSegment,
      dequeueStreamSpeakItem,
      hasQueuedStreamSpeakItem,
      discardQueuedStreamSpeakItems,
      ensureStreamSpeakQueueRunning,
      waitNextStreamSpeakItem,
      runStreamSpeakQueue,
      feedStreamSpeakDelta,
      flushStreamSpeak,
      scheduleFinalSpeechWatchdog
    };
  }

  const api = { createController };
  root.TaffyStreamTtsQueueController = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
