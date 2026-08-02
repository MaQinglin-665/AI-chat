(function (root) {
  "use strict";

  function nowMs() {
    if (root.performance && typeof root.performance.now === "function") {
      return root.performance.now();
    }
    return Date.now();
  }

  function defaultPerfLog() {
    // optional hook
  }

  function buildChatRequestInit(payload, options = {}) {
    const init = {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    };
    if (options && options.signal) {
      init.signal = options.signal;
    }
    if (options && options.keepalive === true) {
      init.keepalive = true;
    }
    return init;
  }

  function isAbortLikeError(err, signal = null) {
    return err?.name === "AbortError"
      || (signal && signal.aborted === true)
      || /abort/i.test(String(err?.message || ""));
  }

  function makeAbortError() {
    const err = new Error("Chat request aborted");
    err.name = "AbortError";
    return err;
  }

  function throwIfAborted(signal) {
    if (signal && signal.aborted === true) {
      throw makeAbortError();
    }
  }

  function describeError(err) {
    return String(err?.message || err || "").trim();
  }

  function buildFallbackFailureError(primaryErr, fallbackErr) {
    const primary = describeError(primaryErr);
    const fallback = describeError(fallbackErr);
    if (primary && fallback && primary !== fallback) {
      return new Error(`流式聊天失败：${primary}；普通请求兜底也失败：${fallback}`);
    }
    return new Error(primary || fallback || "聊天请求失败");
  }

  function normalizeCompanionTurn(rawTurn, reply) {
    if (!rawTurn || typeof rawTurn !== "object" || Array.isArray(rawTurn)) {
      return null;
    }
    if (Number(rawTurn.version) !== 1) {
      return null;
    }
    const canonicalReply = typeof reply === "string" ? reply : "";
    const replyText = typeof rawTurn.reply_text === "string" ? rawTurn.reply_text : "";
    const spokenText = typeof rawTurn.spoken_text === "string" ? rawTurn.spoken_text : "";
    const id = String(rawTurn.id || "").trim();
    if (!canonicalReply.trim() || !id || replyText !== canonicalReply || spokenText !== canonicalReply) {
      return null;
    }
    const rawPerformance = rawTurn.performance;
    const performance = rawPerformance && typeof rawPerformance === "object" && !Array.isArray(rawPerformance)
      ? {
          emotion: String(rawPerformance.emotion || ""),
          action: String(rawPerformance.action || ""),
          intensity: String(rawPerformance.intensity || ""),
          voice_style: String(rawPerformance.voice_style || ""),
          source: String(rawPerformance.source || "")
        }
      : null;
    return {
      version: 1,
      id,
      reply_text: replyText,
      spoken_text: spokenText,
      mode: String(rawTurn.mode || "reply"),
      input_modality: String(rawTurn.input_modality || "text"),
      performance,
      source: String(rawTurn.source || "")
    };
  }

  function normalizeDeliveryId(value) {
    const deliveryId = typeof value === "string" ? value.trim() : "";
    return /^[A-Za-z0-9_-]{16,128}$/.test(deliveryId) ? deliveryId : "";
  }

  function normalizeConversationDecision(raw) {
    if (!raw || typeof raw !== "object" || Array.isArray(raw) || Number(raw.version) !== 1) {
      return null;
    }
    const mode = String(raw.mode || "").trim().toLowerCase();
    if (!["reply", "silence", "micro_reaction", "defer"].includes(mode)) {
      return null;
    }
    const thinkingLevel = ["quick", "normal", "deep"].includes(
      String(raw.thinking_level || "").trim().toLowerCase()
    )
      ? String(raw.thinking_level).trim().toLowerCase()
      : "normal";
    const reaction = ["thinking", "soft_ack", "curious", "concerned"].includes(
      String(raw.reaction || "").trim().toLowerCase()
    )
      ? String(raw.reaction).trim().toLowerCase()
      : "";
    return {
      version: 1,
      mode,
      thinking_level: thinkingLevel,
      thinking_delay_ms: Math.max(0, Math.min(5000, Math.round(Number(raw.thinking_delay_ms) || 0))),
      reaction
    };
  }

  async function attemptDeliveredTurnAck(authFetch, deliveryId, options = {}) {
    const safeDeliveryId = normalizeDeliveryId(deliveryId);
    if (!safeDeliveryId || typeof authFetch !== "function") {
      return { confirmed: false, retryable: false, outcome: "invalid" };
    }
    const AbortControllerImpl = root.AbortController;
    const timeoutMs = Math.max(800, Math.min(10000, Number(options.timeoutMs) || 4500));
    const keepalive = options.keepalive === true;
    const controller = !keepalive && typeof AbortControllerImpl === "function" ? new AbortControllerImpl() : null;
    const timer = controller ? setTimeout(() => controller.abort(), timeoutMs) : 0;
    try {
      const response = await authFetch(
        "/api/chat/delivery_ack",
        buildChatRequestInit({ delivery_id: safeDeliveryId }, {
          signal: controller?.signal || null,
          keepalive
        })
      );
      let payload = null;
      try {
        payload = await response?.json?.();
      } catch (_) {
        // An unparseable response can be a transient transport/proxy failure.
      }
      const outcome = String(payload?.status || "").trim().toLowerCase();
      if (response?.ok && payload?.ok === true && (outcome === "committed" || outcome === "already_committed")) {
        return { confirmed: true, retryable: false, outcome };
      }
      if (["invalid", "unknown", "expired", "evicted", "commit_failed"].includes(outcome)) {
        return { confirmed: false, retryable: false, outcome };
      }
      const status = Number(response?.status || 0);
      return {
        confirmed: false,
        retryable: status === 0 || status === 408 || status === 429 || status >= 500,
        outcome: outcome || (status ? `http_${status}` : "unconfirmed")
      };
    } catch (_) {
      return { confirmed: false, retryable: true, outcome: "network_error" };
    } finally {
      if (timer) {
        clearTimeout(timer);
      }
    }
  }

  async function acknowledgeDeliveredTurn(authFetch, deliveryId, options = {}) {
    const result = await attemptDeliveredTurnAck(authFetch, deliveryId, options);
    return result.confirmed === true;
  }

  function createDeliveredTurnAckQueue(options = {}) {
    const sender = typeof options.sender === "function"
      ? options.sender
      : async () => ({ confirmed: false, retryable: false, outcome: "sender_unavailable" });
    const now = typeof options.now === "function" ? options.now : () => Date.now();
    const scheduleTimeout = typeof options.setTimeout === "function" ? options.setTimeout : setTimeout;
    const cancelTimeout = typeof options.clearTimeout === "function" ? options.clearTimeout : clearTimeout;
    const report = typeof options.onResult === "function" ? options.onResult : () => {};
    const storageKey = String(options.storageKey || "taffy.delivery_receipts.v1");
    const maxEntries = Math.max(1, Math.min(8, Number(options.maxEntries) || 8));
    const maxAgeMs = Math.max(1000, Math.min(290000, Number(options.maxAgeMs) || 240000));
    const retryDelaysMs = Array.isArray(options.retryDelaysMs) && options.retryDelaysMs.length
      ? options.retryDelaysMs
      : [500, 1000, 2000, 4000, 8000, 15000, 30000];
    let storage = options.storage || null;
    if (!storage) {
      try {
        storage = root.sessionStorage || null;
      } catch (_) {
        storage = null;
      }
    }
    let jobs = [];
    let timer = 0;
    let inFlight = false;
    let disposed = false;

    function cleanJobs() {
      const cutoff = now() - maxAgeMs;
      jobs = jobs.filter((job) => (
        normalizeDeliveryId(job?.id)
        && Number(job?.queuedAt || 0) >= cutoff
      ));
    }

    function persist() {
      cleanJobs();
      if (!storage) return;
      try {
        if (jobs.length) {
          storage.setItem(storageKey, JSON.stringify(jobs.map((job) => ({
            id: job.id,
            queuedAt: Number(job.queuedAt) || now(),
            attempts: Math.max(0, Number(job.attempts) || 0),
            nextAt: Math.max(0, Number(job.nextAt) || 0)
          }))));
        } else {
          storage.removeItem(storageKey);
        }
      } catch (_) {
        // Storage can be unavailable in private/restricted renderer contexts.
      }
    }

    function restore() {
      if (!storage) return;
      try {
        const raw = storage.getItem(storageKey);
        const parsed = raw ? JSON.parse(raw) : [];
        if (!Array.isArray(parsed)) return;
        const cutoff = now() - maxAgeMs;
        const seen = new Set();
        jobs = parsed.filter((job) => {
          const id = normalizeDeliveryId(job?.id);
          const queuedAt = Number(job?.queuedAt || 0);
          if (!id || seen.has(id) || queuedAt < cutoff) return false;
          seen.add(id);
          return true;
        }).slice(-maxEntries).map((job) => ({
          id: normalizeDeliveryId(job.id),
          queuedAt: Number(job.queuedAt),
          attempts: Math.max(0, Number(job.attempts) || 0),
          nextAt: Math.max(0, Number(job.nextAt) || 0)
        }));
      } catch (_) {
        jobs = [];
      }
      persist();
    }

    function reportResult(result) {
      try {
        report({
          confirmed: result?.confirmed === true,
          retryable: result?.retryable === true,
          outcome: String(result?.outcome || "unconfirmed"),
          attempts: Math.max(0, Number(result?.attempts) || 0)
        });
      } catch (_) {
        // A diagnostics hook must never stop receipt delivery.
      }
    }

    function schedule() {
      if (disposed || inFlight) return;
      if (timer) {
        cancelTimeout(timer);
        timer = 0;
      }
      cleanJobs();
      if (!jobs.length) {
        persist();
        return;
      }
      const delay = Math.max(0, Number(jobs[0].nextAt || 0) - now());
      timer = scheduleTimeout(() => {
        timer = 0;
        runNext();
      }, delay);
    }

    async function runNext() {
      if (disposed || inFlight) return false;
      cleanJobs();
      const job = jobs[0];
      if (!job) {
        persist();
        return false;
      }
      if (Number(job.nextAt || 0) > now()) {
        schedule();
        return false;
      }
      if (now() - Number(job.queuedAt || 0) >= maxAgeMs) {
        jobs.shift();
        persist();
        reportResult({ confirmed: false, retryable: false, outcome: "client_expired", attempts: job.attempts });
        schedule();
        return false;
      }
      inFlight = true;
      job.attempts = Math.max(0, Number(job.attempts) || 0) + 1;
      persist();
      let result;
      try {
        result = await sender(job.id, { timeoutMs: 2200 });
      } catch (_) {
        result = { confirmed: false, retryable: true, outcome: "network_error" };
      }
      if (result === true) {
        result = { confirmed: true, retryable: false, outcome: "committed" };
      } else if (!result || typeof result !== "object") {
        result = { confirmed: false, retryable: true, outcome: "unconfirmed" };
      }
      inFlight = false;
      if (jobs[0]?.id !== job.id) {
        schedule();
        return false;
      }
      if (result.confirmed === true) {
        jobs.shift();
        persist();
        reportResult({ ...result, attempts: job.attempts });
        schedule();
        return true;
      }
      if (result.retryable !== true || now() - Number(job.queuedAt || 0) >= maxAgeMs) {
        jobs.shift();
        persist();
        reportResult({ ...result, attempts: job.attempts });
        schedule();
        return false;
      }
      const index = Math.min(Math.max(0, job.attempts - 1), retryDelaysMs.length - 1);
      job.nextAt = now() + Math.max(250, Number(retryDelaysMs[index]) || 1000);
      persist();
      schedule();
      return false;
    }

    function enqueue(deliveryId) {
      const id = normalizeDeliveryId(deliveryId);
      if (!id || disposed) return false;
      cleanJobs();
      if (jobs.some((job) => job.id === id)) return true;
      while (jobs.length >= maxEntries) {
        const dropped = jobs.shift();
        reportResult({ confirmed: false, retryable: false, outcome: "queue_evicted", attempts: dropped?.attempts || 0 });
      }
      jobs.push({ id, queuedAt: now(), attempts: 0, nextAt: now() });
      persist();
      schedule();
      return true;
    }

    function getPendingIds() {
      cleanJobs();
      persist();
      return jobs.map((job) => job.id);
    }

    function flushWithKeepalive() {
      if (disposed || inFlight || !jobs[0]) return false;
      const job = jobs[0];
      Promise.resolve(sender(job.id, { timeoutMs: 800, keepalive: true })).then((result) => {
        if (result?.confirmed === true && jobs[0]?.id === job.id) {
          jobs.shift();
          persist();
          reportResult({ ...result, attempts: job.attempts });
        }
      }, () => {});
      return true;
    }

    function dispose() {
      disposed = true;
      if (timer) {
        cancelTimeout(timer);
        timer = 0;
      }
    }

    restore();
    schedule();
    return { enqueue, getPendingIds, flushWithKeepalive, runNext, dispose };
  }

  function createStreamLineHandler(context) {
    const onDelta = typeof context.onDelta === "function" ? context.onDelta : () => {};
    const onCharacterRuntimeMetadata = typeof context.onCharacterRuntimeMetadata === "function"
      ? context.onCharacterRuntimeMetadata
      : () => {};
    const onCharacterBrainDecision = typeof context.onCharacterBrainDecision === "function"
      ? context.onCharacterBrainDecision
      : () => {};
    const onCompanionTurn = typeof context.onCompanionTurn === "function"
      ? context.onCompanionTurn
      : () => {};
    const onDeliveryId = typeof context.onDeliveryId === "function" ? context.onDeliveryId : () => {};
    const onConversationDecision = typeof context.onConversationDecision === "function"
      ? context.onConversationDecision
      : () => {};
    const perfHooks = context.perfHooks || null;
    const getNow = typeof context.now === "function" ? context.now : nowMs;

    let fullText = "";
    let doneReply = "";
    let companionTurn = null;
    let deliveryId = "";
    let seenFirstDelta = false;

    const handleDataLine = (line) => {
      if (!line || !line.startsWith("data:")) {
        return false;
      }
      const raw = line.slice(5).trim();
      if (!raw) {
        return false;
      }
      if (raw === "[DONE]") {
        return true;
      }
      let evt = null;
      try {
        evt = JSON.parse(raw);
      } catch (_) {
        return false;
      }
      if (evt.type === "error") {
        throw new Error(evt.error || "连接有点挤，请稍后再试。");
      }
      if (evt.type === "delta" && typeof evt.text === "string" && evt.text) {
        if (!seenFirstDelta) {
          seenFirstDelta = true;
          if (perfHooks && typeof perfHooks.onFirstDelta === "function") {
            perfHooks.onFirstDelta({ atPerfMs: getNow() });
          }
        }
        fullText += evt.text;
        onDelta(evt.text);
      }
      if (evt.type === "done" && typeof evt.reply === "string" && evt.reply.trim()) {
        doneReply = evt.reply;
      }
      if (evt.type === "done") {
        onConversationDecision(normalizeConversationDecision(evt.conversation_decision));
        const nextDeliveryId = normalizeDeliveryId(evt.delivery_id);
        if (nextDeliveryId && !deliveryId) {
          deliveryId = nextDeliveryId;
          onDeliveryId(deliveryId);
        }
        companionTurn = normalizeCompanionTurn(evt.turn, doneReply || fullText);
        onCharacterBrainDecision(evt.character_brain);
        if (companionTurn) {
          onCompanionTurn(companionTurn);
        } else {
          onCharacterRuntimeMetadata(evt.character_runtime);
        }
      }
      return evt.type === "done";
    };

    return {
      getFullText: () => fullText,
      getReply: () => doneReply || fullText,
      getCompanionTurn: () => companionTurn,
      getDeliveryId: () => deliveryId,
      hasSeenFirstDelta: () => seenFirstDelta,
      handleDataLine
    };
  }

  async function readStreamingReply(resp, context) {
    const reader = resp.body.getReader();
    const decoder = new TextDecoder("utf-8");
    const lineHandler = createStreamLineHandler(context);
    const firstDeltaTimeoutMs = Math.max(0, Math.round(Number(context.firstDeltaTimeoutMs) || 0));
    let buffer = "";

    const readNextChunk = async () => {
      if (!firstDeltaTimeoutMs || lineHandler.hasSeenFirstDelta()) {
        return await reader.read();
      }
      let timer = 0;
      try {
        return await Promise.race([
          reader.read(),
          new Promise((_, reject) => {
            timer = setTimeout(() => {
              reject(new Error(`LLM stream produced no text within ${firstDeltaTimeoutMs}ms`));
            }, firstDeltaTimeoutMs);
          })
        ]);
      } finally {
        if (timer) {
          clearTimeout(timer);
        }
      }
    };

    try {
      while (true) {
        const { value, done } = await readNextChunk();
        if (done) {
          break;
        }
        buffer += decoder.decode(value, { stream: true }).replace(/\r\n/g, "\n");

        let lineIndex = buffer.indexOf("\n");
        while (lineIndex >= 0) {
          const line = buffer.slice(0, lineIndex).trim();
          buffer = buffer.slice(lineIndex + 1);
          const isDone = lineHandler.handleDataLine(line);
          if (isDone) {
            return {
              reply: lineHandler.getReply(),
              companionTurn: lineHandler.getCompanionTurn(),
              deliveryId: lineHandler.getDeliveryId(),
              seenFirstDelta: lineHandler.hasSeenFirstDelta()
            };
          }
          lineIndex = buffer.indexOf("\n");
        }
      }

      const tail = buffer.trim();
      if (tail) {
        lineHandler.handleDataLine(tail);
      }
    } catch (err) {
      try {
        err.seenFirstDelta = lineHandler.hasSeenFirstDelta();
      } catch (_) {
        // ignore
      }
      if (!err.seenFirstDelta && typeof reader.cancel === "function") {
        try {
          await reader.cancel();
        } catch (_) {
          // ignore
        }
      }
      throw err;
    }
    return {
      reply: lineHandler.getReply(),
      companionTurn: lineHandler.getCompanionTurn(),
      deliveryId: lineHandler.getDeliveryId(),
      seenFirstDelta: lineHandler.hasSeenFirstDelta()
    };
  }

  async function streamAssistantReply(payload, onDelta, options = {}) {
    const authFetch = options.authFetch;
    if (typeof authFetch !== "function") {
      throw new Error("authFetch is required");
    }

    const perfHooks = options.perfHooks || null;
    const perfLog = typeof options.perfLog === "function" ? options.perfLog : defaultPerfLog;
    const getNow = typeof options.now === "function" ? options.now : nowMs;
    const firstDeltaTimeoutMs = Math.max(
      1500,
      Math.min(45000, Math.round(Number(options.firstDeltaTimeoutMs) || 12000))
    );
    const onCharacterRuntimeMetadata = typeof options.onCharacterRuntimeMetadata === "function"
      ? options.onCharacterRuntimeMetadata
      : () => {};
    const onCharacterBrainDecision = typeof options.onCharacterBrainDecision === "function"
      ? options.onCharacterBrainDecision
      : () => {};
    const onCompanionTurn = typeof options.onCompanionTurn === "function"
      ? options.onCompanionTurn
      : () => {};
    const onDeliveryId = typeof options.onDeliveryId === "function" ? options.onDeliveryId : () => {};
    const onConversationDecision = typeof options.onConversationDecision === "function"
      ? options.onConversationDecision
      : () => {};
    const signal = options.signal || null;
    const requestInit = buildChatRequestInit(payload, { signal });

    const fetchDirectChat = async (fallbackReason = "") => {
      throwIfAborted(signal);
      const directResp = await authFetch("/api/chat", requestInit);
      throwIfAborted(signal);
      if (perfHooks && typeof perfHooks.onApiHeaders === "function") {
        perfHooks.onApiHeaders({
          mode: fallbackReason ? `chat_fallback:${fallbackReason}` : "chat",
          status: Number(directResp.status) || 0,
          atPerfMs: getNow()
        });
      }
      const directData = await directResp.json();
      if (!directResp.ok) {
        throw new Error(directData.error || `HTTP ${directResp.status}`);
      }
      const text = String(directData.reply || "");
      const deliveryId = normalizeDeliveryId(directData?.delivery_id);
      const companionTurn = normalizeCompanionTurn(directData?.turn, text);
      onConversationDecision(normalizeConversationDecision(directData?.conversation_decision));
      onCharacterBrainDecision(directData?.character_brain);
      if (companionTurn) {
        onCompanionTurn(companionTurn);
      } else {
        onCharacterRuntimeMetadata(directData?.character_runtime);
      }
      if (text) {
        onDelta(text);
      }
      if (deliveryId) {
        onDeliveryId(deliveryId);
      }
      return text;
    };

    const fetchDirectChatOrThrowCombined = async (fallbackReason, primaryErr) => {
      if (isAbortLikeError(primaryErr, signal)) {
        throw primaryErr || makeAbortError();
      }
      try {
        return await fetchDirectChat(fallbackReason);
      } catch (fallbackErr) {
        if (isAbortLikeError(fallbackErr, signal)) {
          throw fallbackErr || makeAbortError();
        }
        throw buildFallbackFailureError(primaryErr, fallbackErr);
      }
    };

    if (options.preferStream === false) {
      perfLog("chat", "stream_disabled", {
        reason: "config"
      });
      return await fetchDirectChat("stream_disabled");
    }

    let resp;
    try {
      throwIfAborted(signal);
      resp = await authFetch("/api/chat_stream", requestInit);
      throwIfAborted(signal);
    } catch (err) {
      if (isAbortLikeError(err, signal)) {
        throw err || makeAbortError();
      }
      perfLog("chat", "stream_fallback", {
        reason: "stream_fetch_error",
        error: String(err?.message || err || "")
      });
      return await fetchDirectChatOrThrowCombined("stream_fetch_error", err);
    }

    if (perfHooks && typeof perfHooks.onApiHeaders === "function") {
      perfHooks.onApiHeaders({
        mode: "chat_stream",
        status: Number(resp.status) || 0,
        atPerfMs: getNow()
      });
    }

    if (!resp.ok) {
      let detail = `HTTP ${resp.status}`;
      try {
        const data = await resp.json();
        if (data?.error) {
          detail = data.error;
        }
      } catch (_) {
        // ignore
      }
      perfLog("chat", "stream_fallback", {
        reason: "stream_http_error",
        status: Number(resp.status) || 0
      });
      try {
        return await fetchDirectChat(`stream_http_${Number(resp.status) || 0}`);
      } catch (fallbackErr) {
        throw buildFallbackFailureError(new Error(detail), fallbackErr);
      }
    }

    if (!resp.body || typeof resp.body.getReader !== "function") {
      perfLog("chat", "stream_fallback", {
        reason: "stream_reader_unavailable"
      });
      return await fetchDirectChatOrThrowCombined(
        "stream_reader_unavailable",
        new Error("stream reader unavailable")
      );
    }

    try {
      const result = await readStreamingReply(resp, {
        onDelta,
        onCharacterRuntimeMetadata,
        onCharacterBrainDecision,
        onCompanionTurn,
        onDeliveryId,
        onConversationDecision,
        perfHooks,
        now: getNow,
        firstDeltaTimeoutMs
      });
      throwIfAborted(signal);
      return result.reply;
    } catch (err) {
      if (isAbortLikeError(err, signal)) {
        throw err || makeAbortError();
      }
      if (!err || err.seenFirstDelta !== true) {
        perfLog("chat", "stream_fallback", {
          reason: "stream_read_error_before_delta",
          error: String(err?.message || err || "")
        });
        return await fetchDirectChatOrThrowCombined("stream_read_error_before_delta", err);
      }
      throw err;
    }
  }

  const api = {
    buildChatRequestInit,
    normalizeCompanionTurn,
    normalizeConversationDecision,
    normalizeDeliveryId,
    attemptDeliveredTurnAck,
    acknowledgeDeliveredTurn,
    createDeliveredTurnAckQueue,
    createStreamLineHandler,
    readStreamingReply,
    streamAssistantReply
  };

  const ns = (root.TaffyModules = root.TaffyModules || {});
  ns.chatApi = api;

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
}(typeof globalThis !== "undefined" ? globalThis : window));
