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
    const playServerTTSStream = typeof deps.playServerTTSStream === "function"
      ? deps.playServerTTSStream
      : async () => ({ ok: false, started: false, cancelled: false });
    const isCurrentTTSPlaybackGeneration = typeof deps.isCurrentTTSPlaybackGeneration === "function" ? deps.isCurrentTTSPlaybackGeneration : () => true;
    const splitStreamSpeakSegments = typeof deps.splitStreamSpeakSegments === "function" ? deps.splitStreamSpeakSegments : () => ({ segments: [], rest: "" });
    const maybePlayTalkGesture = typeof deps.maybePlayTalkGesture === "function" ? deps.maybePlayTalkGesture : () => {};
    const buildStableSpeakText = typeof deps.buildStableSpeakText === "function" ? deps.buildStableSpeakText : (text) => String(text || "").trim();
    const sanitizeSpeakText = typeof deps.sanitizeSpeakText === "function" ? deps.sanitizeSpeakText : (text) => String(text || "").trim();
    const speak = typeof deps.speak === "function" ? deps.speak : async () => false;
    const shouldAttemptServerTTS = typeof deps.shouldAttemptServerTTS === "function"
      ? deps.shouldAttemptServerTTS
      : () => true;
    const markServerTTSRecovered = typeof deps.markServerTTSRecovered === "function"
      ? deps.markServerTTSRecovered
      : () => {};
    const createServerTTSRequestScope = typeof deps.createServerTTSRequestScope === "function"
      ? deps.createServerTTSRequestScope
      : () => null;
    const streamSpeakSettlementWaiters = new Map();

    function shouldUseStreamSpeak() {
      return (
        state.speakingEnabled &&
        isServerTTSProvider(state.ttsProvider) &&
        state.streamSpeakEnabled
        && state.streamSpeakMode === "realtime"
        && (state.ttsProvider !== "gpt_sovits" || state.gptSovitsRealtimeTTS)
        && shouldAttemptServerTTS()
      );
    }

    function shouldSerializeStreamTTSRequests() {
      return state.ttsProvider === "gpt_sovits" || state.ttsProvider === "qwen3_tts";
    }

    function getStreamSpeakDelivery(sessionId, playbackGeneration = state.ttsPlaybackGeneration, create = false) {
      const safeSession = Number(sessionId || 0);
      const safeGeneration = Number(playbackGeneration || 0);
      if (!safeSession) {
        return null;
      }
      const current = state.streamSpeakDelivery;
      if (
        current
        && Number(current.sessionId || 0) === safeSession
        && Number(current.playbackGeneration || 0) === safeGeneration
      ) {
        if (!Array.isArray(current.segments)) {
          current.segments = [];
        }
        return current;
      }
      if (!create) {
        return null;
      }
      const delivery = {
        sessionId: safeSession,
        playbackGeneration: safeGeneration,
        segments: [],
        finalized: false,
        finalizedAt: 0,
        terminalFailureSegmentId: 0,
        recoveryStarted: false,
        recoveryToken: 0,
        recoveryAttempts: 0,
        settled: false,
        settledAt: 0,
        settleReason: "",
        lastUpdatedAt: Date.now()
      };
      state.streamSpeakDelivery = delivery;
      return delivery;
    }

    function getDeliverySegment(delivery, segmentId) {
      if (!delivery || !Array.isArray(delivery.segments)) {
        return null;
      }
      const safeSegmentId = Number(segmentId || 0);
      return delivery.segments.find((segment) => Number(segment?.segmentId || 0) === safeSegmentId) || null;
    }

    function registerStreamSpeakDeliverySegment(item) {
      if (
        !item
        || Number(item.sessionId || 0) !== Number(state.streamSpeakSession || 0)
        || !isCurrentTTSPlaybackGeneration(item.playbackGeneration)
      ) {
        return null;
      }
      const delivery = getStreamSpeakDelivery(item.sessionId, item.playbackGeneration, true);
      if (!delivery) {
        return null;
      }
      let segment = getDeliverySegment(delivery, item.segmentId);
      if (!segment) {
        segment = {
          segmentId: Number(item.segmentId || 0),
          text: String(item.text || ""),
          status: "queued",
          playbackStarted: false,
          active: false,
          failure: ""
        };
        delivery.segments.push(segment);
      }
      delivery.lastUpdatedAt = Date.now();
      return segment;
    }

    function setStreamSpeakDeliveryStatus(item, status, opts = {}) {
      const delivery = getStreamSpeakDelivery(item?.sessionId, item?.playbackGeneration, false);
      const segment = getDeliverySegment(delivery, item?.segmentId);
      if (!delivery || !segment) {
        return null;
      }
      segment.status = String(status || segment.status || "queued");
      if (opts.playbackStarted === true) {
        segment.playbackStarted = true;
      }
      if (typeof opts.active === "boolean") {
        segment.active = opts.active;
      }
      if (opts.failure) {
        segment.failure = String(opts.failure);
      }
      delivery.lastUpdatedAt = Date.now();
      return { delivery, segment };
    }

    function markStreamSpeakDeliveryFailure(item, failure = "unknown") {
      const updated = setStreamSpeakDeliveryStatus(item, "failed", { active: false, failure });
      if (!updated) {
        return false;
      }
      const { delivery, segment } = updated;
      if (segment.playbackStarted) {
        segment.status = "failed_after_start";
        return false;
      }
      segment.status = "failed_before_start";
      if (!Number(delivery.terminalFailureSegmentId || 0)) {
        delivery.terminalFailureSegmentId = Number(segment.segmentId || 0);
      }
      return true;
    }

    function isStreamSpeakDeliveryBlocked(sessionId, playbackGeneration = state.ttsPlaybackGeneration) {
      const delivery = getStreamSpeakDelivery(sessionId, playbackGeneration, false);
      return !!delivery && (
        delivery.recoveryStarted === true
        || Number(delivery.terminalFailureSegmentId || 0) > 0
      );
    }

    function finalizeStreamSpeakDelivery(sessionId, playbackGeneration = state.ttsPlaybackGeneration) {
      const delivery = getStreamSpeakDelivery(sessionId, playbackGeneration, false);
      if (!delivery) {
        return null;
      }
      delivery.finalized = true;
      delivery.finalizedAt = Date.now();
      delivery.lastUpdatedAt = Date.now();
      return delivery;
    }

    function isStreamSpeakDeliveryComplete(delivery) {
      return !!delivery
        && delivery.finalized === true
        && Array.isArray(delivery.segments)
        && delivery.segments.length > 0
        && delivery.segments.every((segment) => segment?.playbackStarted === true);
    }

    function getStreamSpeakSettlementKey(sessionId, playbackGeneration) {
      const safeSession = Number(sessionId || 0);
      const safeGeneration = Number(playbackGeneration || 0);
      return safeSession > 0 ? `${safeSession}:${safeGeneration}` : "";
    }

    function resolveStreamSpeakSessionSettlement(sessionId, playbackGeneration, status = "completed") {
      const key = getStreamSpeakSettlementKey(sessionId, playbackGeneration);
      if (!key) {
        return false;
      }
      const waiters = streamSpeakSettlementWaiters.get(key);
      if (!waiters || !waiters.size) {
        streamSpeakSettlementWaiters.delete(key);
        return false;
      }
      streamSpeakSettlementWaiters.delete(key);
      const result = {
        status: String(status || "completed"),
        sessionId: Number(sessionId || 0),
        playbackGeneration: Number(playbackGeneration || 0)
      };
      for (const resolve of waiters) {
        try {
          resolve(result);
        } catch (_) {
          // One optional waiter must not prevent the remaining leases from settling.
        }
      }
      return true;
    }

    function markStreamSpeakDeliverySettled(delivery, status = "completed") {
      if (!delivery || delivery.settled === true) {
        return false;
      }
      delivery.settled = true;
      delivery.settledAt = Date.now();
      delivery.settleReason = String(status || "completed");
      delivery.lastUpdatedAt = Date.now();
      resolveStreamSpeakSessionSettlement(
        delivery.sessionId,
        delivery.playbackGeneration,
        delivery.settleReason
      );
      return true;
    }

    function isStreamSpeakDeliveryAudiblySettled(delivery) {
      if (
        !delivery
        || delivery.finalized !== true
        || delivery.recoveryStarted === true
        || Number(delivery.terminalFailureSegmentId || 0) > 0
        || !Array.isArray(delivery.segments)
        || !delivery.segments.length
      ) {
        return false;
      }
      return delivery.segments.every((segment) => {
        if (segment?.active === true) {
          return false;
        }
        const status = String(segment?.status || "");
        return status === "completed"
          || status === "completed_unobserved"
          || status === "failed_after_start";
      });
    }

    function maybeSettleFinalizedStreamSpeakDelivery(sessionId, playbackGeneration, status = "completed") {
      const delivery = getStreamSpeakDelivery(sessionId, playbackGeneration, false);
      if (!isStreamSpeakDeliveryAudiblySettled(delivery)) {
        return false;
      }
      if (hasQueuedStreamSpeakItem(sessionId)) {
        return false;
      }
      if (
        state.streamSpeakWorking === true
        && Number(state.streamSpeakWorkingSession || 0) === Number(sessionId || 0)
      ) {
        return false;
      }
      return markStreamSpeakDeliverySettled(delivery, status);
    }

    function waitForStreamSpeakSessionSettled(sessionId, playbackGeneration = state.ttsPlaybackGeneration, opts = {}) {
      const safeSession = Number(sessionId || 0);
      const safeGeneration = Number(playbackGeneration || 0);
      const signal = opts?.signal || null;
      if (!safeSession) {
        return Promise.resolve({ status: "not_tracked", sessionId: 0, playbackGeneration: safeGeneration });
      }
      if (signal?.aborted === true) {
        return Promise.resolve({ status: "cancelled", sessionId: safeSession, playbackGeneration: safeGeneration });
      }
      const delivery = getStreamSpeakDelivery(safeSession, safeGeneration, false);
      if (delivery?.settled === true) {
        return Promise.resolve({
          status: String(delivery.settleReason || "completed"),
          sessionId: safeSession,
          playbackGeneration: safeGeneration
        });
      }
      const key = getStreamSpeakSettlementKey(safeSession, safeGeneration);
      return new Promise((resolve) => {
        const settle = (result) => {
          if (signal && typeof signal.removeEventListener === "function") {
            try {
              signal.removeEventListener("abort", onAbort);
            } catch (_) {
              // ignore optional listener cleanup
            }
          }
          resolve(result);
        };
        const onAbort = () => {
          const waiters = streamSpeakSettlementWaiters.get(key);
          if (waiters) {
            waiters.delete(settle);
            if (!waiters.size) {
              streamSpeakSettlementWaiters.delete(key);
            }
          }
          settle({ status: "cancelled", sessionId: safeSession, playbackGeneration: safeGeneration });
        };
        let waiters = streamSpeakSettlementWaiters.get(key);
        if (!waiters) {
          waiters = new Set();
          streamSpeakSettlementWaiters.set(key, waiters);
        }
        waiters.add(settle);
        if (signal && typeof signal.addEventListener === "function") {
          try {
            signal.addEventListener("abort", onAbort, { once: true });
          } catch (_) {
            // A caller can still settle through normal queue completion.
          }
        }
        if (maybeSettleFinalizedStreamSpeakDelivery(safeSession, safeGeneration)) {
          return;
        }
        const currentDelivery = getStreamSpeakDelivery(safeSession, safeGeneration, false);
        if (currentDelivery?.settled === true) {
          settle({
            status: String(currentDelivery.settleReason || "completed"),
            sessionId: safeSession,
            playbackGeneration: safeGeneration
          });
        }
      });
    }

    function hasActiveStartedDeliverySegment(delivery) {
      return !!delivery && Array.isArray(delivery.segments)
        && delivery.segments.some((segment) => segment?.playbackStarted === true && segment?.active === true);
    }

    function getRecoverableStreamSpeakDeliveryText(delivery) {
      if (!delivery || !delivery.finalized || !Array.isArray(delivery.segments) || !delivery.segments.length) {
        return "";
      }
      const segments = delivery.segments.slice().sort((a, b) => (
        Number(a?.segmentId || 0) - Number(b?.segmentId || 0)
      ));
      const terminalSegmentId = Number(delivery.terminalFailureSegmentId || 0);
      let startIndex = -1;
      if (terminalSegmentId) {
        startIndex = segments.findIndex((segment) => Number(segment?.segmentId || 0) === terminalSegmentId);
        if (startIndex < 0 || segments.slice(startIndex + 1).some((segment) => segment?.playbackStarted === true)) {
          return "";
        }
      } else {
        for (let index = 0; index < segments.length; index += 1) {
          if (segments[index]?.playbackStarted === true) {
            startIndex = index + 1;
          }
        }
      }
      const tail = segments.slice(Math.max(0, startIndex));
      if (!tail.length || tail.some((segment) => segment?.playbackStarted === true)) {
        return "";
      }
      return buildStableSpeakText(tail.map((segment) => String(segment?.text || "")).join(" "))
        || sanitizeSpeakText(tail.map((segment) => String(segment?.text || "")).join(" "));
    }

    function isAbortError(err) {
      return err?.aborted === true || err?.name === "AbortError";
    }

    function isStreamSpeakRequestCancelled(item, err = null) {
      return item?.requestCancelled === true
        || item?.signal?.aborted === true
        || item?.requestScope?.signal?.aborted === true
        || isAbortError(err)
        || Number(item?.sessionId || 0) !== Number(state.streamSpeakSession || 0)
        || !isCurrentTTSPlaybackGeneration(item?.playbackGeneration);
    }

    function abortStreamSpeakItemRequest(item, reason = "discarded") {
      if (!item || item.requestCancelled === true) {
        return false;
      }
      item.requestCancelled = true;
      if (item.requestScope && typeof item.requestScope.abort === "function") {
        try {
          item.requestScope.abort(String(reason || "discarded"));
          return true;
        } catch (_) {
          // The caller signal or playback-generation registry can still stop it.
        }
      }
      return false;
    }

    function requestStreamSpeakBlob(item, prosody, kind = "stream") {
      const requestScope = createServerTTSRequestScope({
        signal: item?.signal || null,
        sessionId: Number(item?.sessionId || 0),
        playbackGeneration: Number(item?.playbackGeneration || state.ttsPlaybackGeneration || 0),
        traceId: item?.traceId || state.activePerfTraceId || "",
        kind
      });
      item.requestScope = requestScope || null;
      return requestServerTTSBlob(item.text, prosody, {
        traceId: item.traceId || state.activePerfTraceId || "",
        signal: requestScope?.signal || item.signal || null,
        requestScope,
        sessionId: Number(item.sessionId || 0),
        playbackGeneration: Number(item.playbackGeneration || state.ttsPlaybackGeneration || 0),
        kind
      }).finally(() => {
        if (requestScope?.signal?.aborted === true) {
          item.requestCancelled = true;
        }
        if (item.requestScope === requestScope) {
          item.requestScope = null;
        }
      });
    }

    function ensureStreamSpeakBlobPromise(item) {
      if (!item) {
        return null;
      }
      if (item.blobPromise) {
        return item.blobPromise;
      }
      // Serializing GPU-backed providers controls request concurrency only.
      // It must not erase the segment's semantic emotion or numeric prosody.
      const prosody = item.prosody || buildSpeakProsody(
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
      item.blobPromise = requestStreamSpeakBlob(item, prosody, "stream").then((blob) => {
        recordTTSDebugEvent("stream_request_ok", {
          traceId: item.traceId,
          sessionId: item.sessionId,
          segmentId: item.segmentId,
          text: item.text,
          blobBytes: Number(blob?.size || 0)
        });
        return blob;
      }).catch((err) => {
        const cancelled = isStreamSpeakRequestCancelled(item, err);
        recordTTSDebugEvent(cancelled ? "stream_request_cancelled" : "stream_request_fail", {
          traceId: item.traceId,
          sessionId: item.sessionId,
          segmentId: item.segmentId,
          text: item.text,
          result: cancelled ? "cancelled" : "failed",
          error: String(err?.message || err || "")
        });
        throw err;
      });
      // Prefetch starts before the queue necessarily awaits this promise. Keep a
      // passive observer so a discarded, aborted item never becomes an unhandled
      // rejection while retaining the original rejection for the queue.
      item.blobPromise.catch(() => {});
      return item.blobPromise;
    }

    function enqueueStreamSpeakSegment(text, sessionId, prosody = null, style = "neutral", playbackOptions = {}) {
      const cleaned = buildSpeechDeliveryText(text, detectMood(text), style, true);
      if (!cleaned) {
        return;
      }
      const performanceCue = typeof playbackOptions?.performanceCueForText === "function"
        ? playbackOptions.performanceCueForText(cleaned)
        : (playbackOptions?.performanceCue || null);
      const semanticProsody = performanceCue && typeof performanceCue === "object"
        ? {
            emotion: String(performanceCue.emotion || "neutral"),
            intensity: String(performanceCue.intensity || "medium"),
            voice_style: String(performanceCue.voiceStyle || "neutral")
          }
        : {};
      const item = {
        text: cleaned,
        sessionId,
        prosody: {
          ...(prosody && typeof prosody === "object" ? prosody : {}),
          ...semanticProsody
        },
        style,
        performanceCue,
        playbackGeneration: Number(state.ttsPlaybackGeneration || 0),
        blobPromise: null,
        onPlaybackStart: typeof playbackOptions?.onPlaybackStart === "function"
          ? playbackOptions.onPlaybackStart
          : null,
        onPlaybackProgress: typeof playbackOptions?.onPlaybackProgress === "function"
          ? playbackOptions.onPlaybackProgress
          : null,
        playbackStartNotified: false,
        signal: playbackOptions?.signal || null,
        requestScope: null,
        requestCancelled: false,
        segmentId: ++state.perfTtsSeq,
        traceId: state.activePerfTraceId || ""
      };
      state.streamSpeakQueue.push(item);
      registerStreamSpeakDeliverySegment(item);
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

    function notifyStreamSpeakPlaybackStart(item, event = {}) {
      if (!item || item.playbackStartNotified === true) {
        return false;
      }
      if (isStreamSpeakDeliveryBlocked(item.sessionId, item.playbackGeneration)) {
        recordTTSDebugEvent("stream_playback_start_recovery_blocked", {
          traceId: item?.traceId,
          sessionId: item?.sessionId,
          segmentId: item?.segmentId,
          text: item?.text || "",
          result: "recovery_blocked"
        });
        return false;
      }
      if (
        Number(item.sessionId || 0) !== Number(state.streamSpeakSession || 0)
        || !isCurrentTTSPlaybackGeneration(item.playbackGeneration)
      ) {
        recordTTSDebugEvent("stream_playback_start_stale", {
          traceId: item?.traceId,
          sessionId: item?.sessionId,
          segmentId: item?.segmentId,
          text: item?.text || "",
          result: "stale"
        });
        return false;
      }
      item.playbackStartNotified = true;
      const delivery = getStreamSpeakDelivery(item.sessionId, item.playbackGeneration, false);
      const priorSegment = getDeliverySegment(delivery, item.segmentId);
      const alreadyCompleted = String(priorSegment?.status || "").startsWith("completed");
      setStreamSpeakDeliveryStatus(item, alreadyCompleted ? priorSegment.status : "started", {
        playbackStarted: true,
        active: !alreadyCompleted
      });
      const playbackEvent = {
        ...event,
        sessionId: Number(item.sessionId || 0),
        segmentId: Number(item.segmentId || 0),
        playbackGeneration: Number(item.playbackGeneration || 0),
        text: item.text,
        performanceCue: item.performanceCue || null
      };
      recordTTSDebugEvent("stream_playback_start", {
        traceId: item.traceId,
        sessionId: item.sessionId,
        segmentId: item.segmentId,
        text: item.text,
        source: String(event?.source || "server_tts")
      });
      if (!item.performanceCue) {
        maybePlayTalkGesture(item.text, item.style || state.currentTalkStyle || "neutral");
      }
      if (typeof item.onPlaybackStart === "function") {
        try {
          item.onPlaybackStart(playbackEvent);
        } catch (_) {
          // Optional performance hooks must never prevent audible speech.
        }
      }
      return true;
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
      let discarded = 0;
      state.streamSpeakQueue = state.streamSpeakQueue.filter((item) => {
        if (!item || item.sessionId !== sessionId) {
          return !!item;
        }
        discarded += 1;
        abortStreamSpeakItemRequest(item, "queue_discarded");
        return false;
      });
      return discarded;
    }

    function ensureStreamSpeakQueueRunning(sessionId, delayMs = 0) {
      const safeSession = Number(sessionId || 0);
      if (!safeSession || safeSession !== state.streamSpeakSession || !shouldUseStreamSpeak()) {
        return;
      }
      if (isStreamSpeakDeliveryBlocked(safeSession)) {
        recordTTSDebugEvent("stream_run_delivery_blocked", {
          sessionId: safeSession,
          result: "delivery_blocked"
        });
        return;
      }
      const delay = Math.max(0, Math.min(360, Math.round(Number(delayMs) || 0)));
      window.setTimeout(() => {
        if (
          safeSession !== state.streamSpeakSession
          || !shouldUseStreamSpeak()
          || isStreamSpeakDeliveryBlocked(safeSession)
        ) {
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

    function resolveStreamSegmentPauseMs(item = null) {
      const text = String(item?.text || "").trim();
      const style = String(item?.style || state.currentTalkStyle || "neutral").trim().toLowerCase();
      const base = Math.max(30, Math.min(240, Number(state.streamInterSegmentPauseMs) || 95));
      let pause = base;
      if (/(?:\.{2,}|\u2026|\u3002{2,})$/.test(text)) {
        pause += 80;
      } else if (/[?\uFF1F]$/.test(text)) {
        pause += 35;
      } else if (/[!\uFF01]$/.test(text)) {
        pause -= 25;
      } else if (/[,\uFF0C\u3001;\uFF1B:]$/.test(text)) {
        pause -= 40;
      }
      if (["comfort", "soft", "warm"].includes(style)) {
        pause += 35;
      } else if (["playful", "cheerful", "teasing"].includes(style)) {
        pause -= 18;
      } else if (["clear", "steady", "serious"].includes(style)) {
        pause += 10;
      }
      return Math.max(30, Math.min(240, Math.round(pause)));
    }

    async function waitStreamSegmentPause(item, sessionId, elapsedMs = 0, requestedPauseMs = null) {
      const targetPause = Number.isFinite(Number(requestedPauseMs))
        ? Math.max(0, Number(requestedPauseMs))
        : resolveStreamSegmentPauseMs(item);
      const remaining = Math.max(0, targetPause - Math.max(0, Number(elapsedMs) || 0));
      if (!remaining) {
        return true;
      }
      const end = Date.now() + remaining;
      while (Date.now() < end) {
        if (
          Number(sessionId || 0) !== Number(state.streamSpeakSession || 0)
          || !isCurrentTTSPlaybackGeneration(item?.playbackGeneration)
          || item?.requestScope?.signal?.aborted === true
        ) {
          return false;
        }
        await new Promise((resolve) => setTimeout(resolve, Math.min(18, Math.max(1, end - Date.now()))));
      }
      return true;
    }

    async function runStreamSpeakQueue() {
      if (state.streamSpeakWorking) {
        recordTTSDebugEvent("stream_run_skip_busy");
        return;
      }
      const activeSession = state.streamSpeakSession;
      if (isStreamSpeakDeliveryBlocked(activeSession)) {
        recordTTSDebugEvent("stream_run_delivery_blocked", {
          sessionId: activeSession,
          result: "delivery_blocked"
        });
        return;
      }
      state.streamSpeakWorking = true;
      state.streamSpeakWorkingSession = activeSession;
      recordTTSDebugEvent("stream_run_start", { sessionId: activeSession });
      try {
        let requestCancelled = false;
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
          if (isStreamSpeakDeliveryBlocked(activeSession, current.playbackGeneration)) {
            recordTTSDebugEvent("stream_delivery_stop", {
              traceId: current.traceId,
              sessionId: activeSession,
              segmentId: current.segmentId,
              text: current.text,
              result: "delivery_blocked"
            });
            break;
          }
          if (Number(current.streamPacingPauseMs || 0) > 0) {
            setStreamSpeakDeliveryStatus(current, "requesting", { active: false });
            const pacingElapsedMs = Math.max(0, Number(current.streamPacingElapsedMs || 0));
            const pacingPauseMs = Math.max(0, Number(current.streamPacingPauseMs || 0));
            current.streamPacingPauseMs = 0;
            current.streamPacingElapsedMs = 0;
            if (!(await waitStreamSegmentPause(current, activeSession, pacingElapsedMs, pacingPauseMs))) {
              requestCancelled = true;
              break;
            }
          }
          const useIncrementalPcmStream = (
            state.ttsProvider === "gpt_sovits"
            && state.gptSovitsStreamPlayback === true
          ) || (
            state.ttsProvider === "qwen3_tts"
            && state.qwen3TtsStreamPlayback !== false
          );
          if (useIncrementalPcmStream) {
            setStreamSpeakDeliveryStatus(current, "requesting", { active: false });
            const streamResult = await playServerTTSStream(current.text, {
              interrupt: false,
              prosody: current.prosody || buildSpeakProsody(current.text, detectMood(current.text), false, current.style),
              mood: detectMood(current.text),
              style: current.style || state.currentTalkStyle || "neutral",
              performanceCue: current.performanceCue || null,
              perfTraceId: current.traceId || state.activePerfTraceId || "",
              segmentId: current.segmentId,
              sessionId: activeSession,
              playbackGeneration: current.playbackGeneration,
              signal: current.requestScope?.signal || null,
              onPlaybackStart: (event) => notifyStreamSpeakPlaybackStart(current, event),
              onPlaybackProgress: current.onPlaybackProgress
            });
            if (streamResult?.ok === true) {
              markServerTTSRecovered();
              setStreamSpeakDeliveryStatus(current, "completed", { active: false });
              const nextWaitStartedAt = Date.now();
              const next = dequeueStreamSpeakItem(activeSession) || await waitNextStreamSpeakItem(
                activeSession,
                state.chatBusy ? idleWaitMs : 180
              );
              if (next) {
                next.streamPacingPauseMs = resolveStreamSegmentPauseMs(current);
                next.streamPacingElapsedMs = Date.now() - nextWaitStartedAt;
              }
              current = next;
              continue;
            }
            if (streamResult?.cancelled === true) {
              requestCancelled = true;
              break;
            }
            if (streamResult?.started === true) {
              markStreamSpeakDeliveryFailure(current, "stream_playback_failed_after_start");
              break;
            }
            recordTTSDebugEvent("pcm_stream_queue_buffered_fallback", {
              traceId: current.traceId,
              sessionId: activeSession,
              segmentId: current.segmentId,
              result: "fallback_before_start",
              error: String(streamResult?.error || "")
            });
          }
          setStreamSpeakDeliveryStatus(current, "requesting", { active: false });
          let currentBlob = null;
          try {
            currentBlob = await ensureStreamSpeakBlobPromise(current);
          } catch (err) {
            if (isStreamSpeakRequestCancelled(current, err)) {
              requestCancelled = true;
              recordTTSDebugEvent("stream_request_cancelled", {
                traceId: current.traceId,
                sessionId: activeSession,
                segmentId: current.segmentId,
                text: current.text,
                result: "cancelled_before_retry",
                error: String(err?.message || err || "")
              });
              break;
            }
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
              currentBlob = await requestStreamSpeakBlob(current, null, "stream_retry_no_prosody");
            } catch (retryErr) {
              if (isStreamSpeakRequestCancelled(current, retryErr)) {
                requestCancelled = true;
                recordTTSDebugEvent("stream_request_cancelled", {
                  traceId: current.traceId,
                  sessionId: activeSession,
                  segmentId: current.segmentId,
                  text: current.text,
                  result: "cancelled_during_retry",
                  error: String(retryErr?.message || retryErr || "")
                });
                break;
              }
              console.warn("Stream TTS retry failed:", retryErr);
              recordTTSDebugEvent("stream_retry_fail", {
                traceId: current.traceId,
                sessionId: activeSession,
                segmentId: current.segmentId,
                text: current.text,
                error: String(retryErr?.message || retryErr || "")
              });
              setStatus("语音片段失败，已跳过");
              markStreamSpeakDeliveryFailure(current, "request_retry_failed");
              break;
            }
          }
          if (!currentBlob) {
            recordTTSDebugEvent("stream_empty_blob", {
              traceId: current.traceId,
              sessionId: activeSession,
              segmentId: current.segmentId,
              text: current.text
            });
            markStreamSpeakDeliveryFailure(current, "empty_blob");
            break;
          }
          if (
            activeSession !== state.streamSpeakSession ||
            !isCurrentTTSPlaybackGeneration(current.playbackGeneration)
          ) {
            requestCancelled = true;
            recordTTSDebugEvent("stream_stale_skip", {
              traceId: current.traceId,
              sessionId: activeSession,
              segmentId: current.segmentId,
              text: current.text,
              result: "stale"
            });
            break;
          }
          if (isStreamSpeakDeliveryBlocked(activeSession, current.playbackGeneration)) {
            recordTTSDebugEvent("stream_delivery_stop", {
              traceId: current.traceId,
              sessionId: activeSession,
              segmentId: current.segmentId,
              text: current.text,
              result: "delivery_blocked_after_request"
            });
            break;
          }
          setStreamSpeakDeliveryStatus(current, "ready", { active: false });
          let next = dequeueStreamSpeakItem(activeSession);
          if (!next) {
            next = await waitNextStreamSpeakItem(activeSession, state.chatBusy ? idleWaitMs : 80);
          }
          if (next) {
            ensureStreamSpeakBlobPromise(next);
          }

          const playingItem = current;
          let playbackOk = false;
          try {
            playbackOk = await playAudioBlob(currentBlob, {
              interrupt: false,
              text: playingItem.text,
              mood: detectMood(playingItem.text),
              style: playingItem.style || state.currentTalkStyle || "neutral",
              performanceCue: playingItem.performanceCue || null,
              perfTraceId: playingItem.traceId || state.activePerfTraceId || "",
              segmentId: playingItem.segmentId,
              sessionId: activeSession,
              playbackGeneration: playingItem.playbackGeneration,
              onPlaybackStart: (event) => notifyStreamSpeakPlaybackStart(playingItem, event),
              onPlaybackProgress: playingItem.onPlaybackProgress
            });
          } catch (err) {
            recordTTSDebugEvent("stream_playback_throw", {
              traceId: playingItem.traceId,
              sessionId: activeSession,
              segmentId: playingItem.segmentId,
              text: playingItem.text,
              error: String(err?.message || err || "")
            });
          }
          if (!playingItem.playbackStartNotified) {
            if (playbackOk) {
              // A player that reports completion without a start callback is
              // imperfect instrumentation, not proof that no sound was heard.
              // Preserve no-duplicate delivery by treating it as delivered.
              setStreamSpeakDeliveryStatus(playingItem, "completed_unobserved", {
                playbackStarted: true,
                active: false
              });
            } else {
              markStreamSpeakDeliveryFailure(playingItem, "playback_failed_before_start");
              break;
            }
          }
          if (!playbackOk) {
            markStreamSpeakDeliveryFailure(playingItem, "playback_failed_after_start");
          } else {
            markServerTTSRecovered();
            setStreamSpeakDeliveryStatus(playingItem, "completed", { active: false });
          }
          if (isStreamSpeakDeliveryBlocked(activeSession, playingItem.playbackGeneration)) {
            break;
          }
          if (next) {
            next.streamPacingPauseMs = resolveStreamSegmentPauseMs(playingItem);
            next.streamPacingElapsedMs = 0;
          }
          current = next || await waitNextStreamSpeakItem(
            activeSession,
            state.chatBusy ? idleWaitMs : 180
          );
        }
        if (!requestCancelled) {
          state.ttsServerAvailable = true;
        }
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
        const activeDelivery = state.streamSpeakDelivery;
        if (Number(activeDelivery?.sessionId || 0) === Number(activeSession || 0)) {
          const activeDeliveryGeneration = Number(activeDelivery?.playbackGeneration || 0);
          if (
            activeSession !== state.streamSpeakSession
            || !isCurrentTTSPlaybackGeneration(activeDeliveryGeneration)
          ) {
            resolveStreamSpeakSessionSettlement(activeSession, activeDeliveryGeneration, "cancelled");
          } else {
            maybeSettleFinalizedStreamSpeakDelivery(activeSession, activeDeliveryGeneration);
          }
        }
        recordTTSDebugEvent("stream_run_done", { sessionId: activeSession });
        if (
          activeSession === state.streamSpeakSession
          && shouldUseStreamSpeak()
          && !isStreamSpeakDeliveryBlocked(activeSession)
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

    function feedStreamSpeakDelta(delta, sessionId, style = "neutral", playbackOptions = {}) {
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
        enqueueStreamSpeakSegment(seg, sessionId, prosody, style, playbackOptions);
      }
      if (parsed.segments.length) {
        ensureStreamSpeakQueueRunning(sessionId, 0);
      }
    }

    function flushStreamSpeak(sessionId, style = "neutral", playbackOptions = {}) {
      if (sessionId !== state.streamSpeakSession) {
        return;
      }
      const parsed = splitStreamSpeakSegments(state.streamSpeakBuffer, true);
      state.streamSpeakBuffer = "";
      for (const seg of parsed.segments) {
        const mood = detectMood(seg);
        const prosody = buildSpeakProsody(seg, mood, false, style);
        enqueueStreamSpeakSegment(seg, sessionId, prosody, style, playbackOptions);
      }
      if (parsed.segments.length) {
        ensureStreamSpeakQueueRunning(sessionId, 0);
      }
    }

    async function recoverFinalStreamSpeakDelivery({
      sessionId,
      playbackGeneration,
      fallbackText,
      mood,
      style,
      traceId,
      onPlaybackStart,
      preserveTurnPlaybackGeneration = false,
      signal = null
    }) {
      const delivery = getStreamSpeakDelivery(sessionId, playbackGeneration, false);
      if (
        Number(sessionId || 0) !== Number(state.streamSpeakSession || 0)
        || !isCurrentTTSPlaybackGeneration(playbackGeneration)
        || delivery?.recoveryStarted === true
      ) {
        return false;
      }
      const recoveryText = delivery
        ? getRecoverableStreamSpeakDeliveryText(delivery)
        : (state.streamSpeakPlayedSession === Number(sessionId || 0) ? "" : fallbackText);
      if (!recoveryText) {
        recordTTSDebugEvent("stream_delivery_recovery_skip", {
          traceId,
          sessionId,
          result: delivery ? "no_safe_tail" : "already_played"
        });
        return false;
      }
      if (delivery) {
        delivery.recoveryStarted = true;
        delivery.recoveryToken = Math.max(0, Number(delivery.recoveryToken || 0)) + 1;
        delivery.lastUpdatedAt = Date.now();
      }
      const discarded = discardQueuedStreamSpeakItems(sessionId);
      recordTTSDebugEvent("final_watchdog_tts", {
        traceId,
        sessionId,
        text: recoveryText,
        result: delivery ? "tail_fallback" : "full_fallback"
      });
      recordTTSDebugEvent("stream_delivery_recovery", {
        traceId,
        sessionId,
        text: recoveryText,
        result: delivery ? "tail_fallback" : "full_fallback",
        blobBytes: discarded
      });
      const prosody = buildSpeakProsody(recoveryText, mood, false, style);
      return await speak(recoveryText, {
        prosody,
        interrupt: true,
        mood,
        style,
        perfTraceId: traceId,
        playbackGeneration,
        preserveTurnPlaybackGeneration: preserveTurnPlaybackGeneration === true,
        sessionId,
        onPlaybackStart,
        signal
      });
    }

    function scheduleFinalSpeechWatchdog({
      sessionId,
      text,
      mood = "idle",
      style = "neutral",
      traceId = "",
      onPlaybackStart = null,
      preserveTurnPlaybackGeneration = false,
      signal = null
    } = {}) {
      const safeSession = Number(sessionId || 0);
      const safeText = buildStableSpeakText(text) || sanitizeSpeakText(text);
      if (!safeSession || !safeText || !shouldUseStreamSpeak()) {
        return Promise.resolve({
          status: "not_tracked",
          sessionId: safeSession,
          playbackGeneration: Number(state.ttsPlaybackGeneration || 0)
        });
      }
      const generation = Number(state.ttsPlaybackGeneration || 0);
      const finalizedDelivery = finalizeStreamSpeakDelivery(safeSession, generation);
      if (!finalizedDelivery) {
        return Promise.resolve({
          status: "not_tracked",
          sessionId: safeSession,
          playbackGeneration: generation
        });
      }
      const settlement = waitForStreamSpeakSessionSettled(safeSession, generation, { signal });
      if (maybeSettleFinalizedStreamSpeakDelivery(safeSession, generation)) {
        return settlement;
      }
      const inspectDelivery = async (attempt = 0) => {
        if (
          signal?.aborted === true
          || safeSession !== state.streamSpeakSession
          || !isCurrentTTSPlaybackGeneration(generation)
        ) {
          resolveStreamSpeakSessionSettlement(safeSession, generation, "cancelled");
          return;
        }
        const delivery = getStreamSpeakDelivery(safeSession, generation, false);
        if (delivery?.recoveryStarted === true) {
          return;
        }
        if (isStreamSpeakDeliveryComplete(delivery)) {
          recordTTSDebugEvent("stream_delivery_complete", {
            traceId,
            sessionId: safeSession,
            result: "all_segments_started"
          });
          maybeSettleFinalizedStreamSpeakDelivery(safeSession, generation);
          return;
        }
        if (hasActiveStartedDeliverySegment(delivery)) {
          if (attempt < 72) {
            window.setTimeout(() => inspectDelivery(attempt + 1), 900);
          } else {
            recordTTSDebugEvent("stream_delivery_watchdog_active_timeout", {
              traceId,
              sessionId: safeSession,
              result: "active_audio_not_replayed"
            });
          }
          return;
        }
        const queueBusy = state.streamSpeakWorking === true
          && Number(state.streamSpeakWorkingSession || 0) === safeSession;
        const queuePending = hasQueuedStreamSpeakItem(safeSession) || queueBusy;
        const terminalFailure = Number(delivery?.terminalFailureSegmentId || 0) > 0;
        if (queuePending && !terminalFailure && attempt === 0) {
          ensureStreamSpeakQueueRunning(safeSession, 0);
          window.setTimeout(() => inspectDelivery(1), 2200);
          return;
        }
        try {
          await recoverFinalStreamSpeakDelivery({
            sessionId: safeSession,
            playbackGeneration: generation,
            fallbackText: safeText,
            mood,
            style,
            traceId,
            onPlaybackStart,
            preserveTurnPlaybackGeneration,
            signal
          });
          markStreamSpeakDeliverySettled(delivery, signal?.aborted === true ? "cancelled" : "recovered");
        } catch (_) {
          markStreamSpeakDeliverySettled(delivery, signal?.aborted === true ? "cancelled" : "recovery_failed");
        }
      };
      window.setTimeout(() => inspectDelivery(0), 2600);
      return settlement;
    }

    return {
      shouldUseStreamSpeak,
      shouldSerializeStreamTTSRequests,
      ensureStreamSpeakBlobPromise,
      enqueueStreamSpeakSegment,
      notifyStreamSpeakPlaybackStart,
      dequeueStreamSpeakItem,
      hasQueuedStreamSpeakItem,
      discardQueuedStreamSpeakItems,
      ensureStreamSpeakQueueRunning,
      waitNextStreamSpeakItem,
      resolveStreamSegmentPauseMs,
      waitStreamSegmentPause,
      runStreamSpeakQueue,
      feedStreamSpeakDelta,
      flushStreamSpeak,
      scheduleFinalSpeechWatchdog,
      waitForStreamSpeakSessionSettled
    };
  }

  const api = { createController };
  root.TaffyStreamTtsQueueController = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
