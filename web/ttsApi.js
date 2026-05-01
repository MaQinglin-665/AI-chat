(function (root) {
  "use strict";

  function defaultPerfLog() {
    // optional hook
  }

  function nowMs() {
    if (root.performance && typeof root.performance.now === "function") {
      return root.performance.now();
    }
    return Date.now();
  }

  function wallMs() {
    return Date.now();
  }

  function waitMs(ms) {
    return new Promise((resolve) => {
      root.setTimeout(resolve, Math.max(0, Number(ms) || 0));
    });
  }

  function buildServerTTSPayload(cleanedText, opts = {}) {
    const payload = { text: String(cleanedText || "") };
    if (opts.voice) {
      payload.voice = String(opts.voice || "");
    }
    if (opts.prosody && typeof opts.prosody === "object") {
      const p = opts.prosody;
      if (Number.isFinite(Number(p.speed_ratio))) payload.speed_ratio = Number(p.speed_ratio);
      if (Number.isFinite(Number(p.pitch_ratio))) payload.pitch_ratio = Number(p.pitch_ratio);
      if (Number.isFinite(Number(p.volume_ratio))) payload.volume_ratio = Number(p.volume_ratio);
      if (typeof p.rate === "string" && p.rate.trim()) payload.rate = p.rate.trim();
      if (typeof p.pitch === "string" && p.pitch.trim()) payload.pitch = p.pitch.trim();
      if (typeof p.volume === "string" && p.volume.trim()) payload.volume = p.volume.trim();
    }
    return payload;
  }

  function isRetriableTTSError(err) {
    if (!err) {
      return false;
    }
    if (err.retriable === true) {
      return true;
    }
    const status = Number(err.httpStatus);
    if (Number.isFinite(status) && (status === 408 || status === 429 || status >= 500)) {
      return true;
    }
    const msg = String(err.message || "").toLowerCase();
    return msg.includes("timeout") || msg.includes("network");
  }

  function inferAudioMime(bytes, fallback = "application/octet-stream") {
    if (!bytes || typeof bytes.length !== "number") {
      return fallback;
    }
    if (
      bytes.length >= 12 &&
      bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
      bytes[8] === 0x57 && bytes[9] === 0x41 && bytes[10] === 0x56 && bytes[11] === 0x45
    ) {
      return "audio/wav";
    }
    if (bytes.length >= 4 && bytes[0] === 0x4f && bytes[1] === 0x67 && bytes[2] === 0x67 && bytes[3] === 0x53) {
      return "audio/ogg";
    }
    if (bytes.length >= 4 && bytes[0] === 0x66 && bytes[1] === 0x4c && bytes[2] === 0x61 && bytes[3] === 0x43) {
      return "audio/flac";
    }
    if (
      (bytes.length >= 3 && bytes[0] === 0x49 && bytes[1] === 0x44 && bytes[2] === 0x33) ||
      (bytes.length >= 2 && bytes[0] === 0xff && (bytes[1] === 0xfb || bytes[1] === 0xf3 || bytes[1] === 0xf2))
    ) {
      return "audio/mpeg";
    }
    return fallback;
  }

  async function normalizeAudioBlob(blob, context = {}) {
    if (!blob || blob.size === 0) {
      const err = new Error("TTS audio payload is empty");
      err.retriable = true;
      throw err;
    }
    const type = String(blob.type || "").toLowerCase();
    if (type.startsWith("audio/")) {
      return { blob, mime: type };
    }
    const buf = await blob.arrayBuffer();
    const bytes = new Uint8Array(buf);
    const mime = inferAudioMime(bytes, "application/octet-stream");
    const BlobImpl = context.Blob || root.Blob || Blob;
    return {
      blob: new BlobImpl([buf], { type: mime }),
      mime
    };
  }

  async function requestServerTTSBlob(text, prosody = null, requestOpts = {}) {
    const authFetch = requestOpts.authFetch;
    if (typeof authFetch !== "function") {
      throw new Error("authFetch is required");
    }
    const sanitizeSpeakText = typeof requestOpts.sanitizeSpeakText === "function"
      ? requestOpts.sanitizeSpeakText
      : (value) => String(value || "").trim();
    const cleaned = sanitizeSpeakText(text);
    if (!cleaned) {
      return null;
    }

    const perfLog = typeof requestOpts.perfLog === "function" ? requestOpts.perfLog : defaultPerfLog;
    const getNow = typeof requestOpts.now === "function" ? requestOpts.now : nowMs;
    const getWallNow = typeof requestOpts.wallNow === "function" ? requestOpts.wallNow : wallMs;
    const payload = buildServerTTSPayload(cleaned, {
      prosody,
      voice: requestOpts.voice
    });
    const perfTraceId = String(requestOpts.traceId || "").trim();
    const ttsReqStartedPerfMs = getNow();
    const ttsReqStartedWallMs = getWallNow();
    if (perfTraceId) {
      payload._perf_trace_id = perfTraceId;
      payload._perf_client_send_ts_ms = ttsReqStartedWallMs;
    }
    perfLog("tts", "request_start", {
      traceId: perfTraceId || "(none)",
      textChars: cleaned.length
    });

    const timeoutMs = Math.max(
      1500,
      Math.min(45000, Math.round(Number(requestOpts.timeoutMs) || 14000))
    );
    const AbortControllerImpl = requestOpts.AbortController || root.AbortController;
    const controller = (typeof AbortControllerImpl !== "undefined") ? new AbortControllerImpl() : null;
    let timeoutHandle = 0;
    if (controller) {
      timeoutHandle = root.setTimeout(() => controller.abort(), timeoutMs);
    }

    let resp;
    try {
      resp = await authFetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: controller ? controller.signal : undefined
      });
    } catch (err) {
      const msg = err?.name === "AbortError"
        ? `TTS request timeout (${timeoutMs}ms)`
        : String(err?.message || "TTS request failed");
      perfLog("tts", "request_fail", {
        traceId: perfTraceId || "(none)",
        elapsedMs: Math.round(getNow() - ttsReqStartedPerfMs),
        error: msg
      });
      const wrapped = new Error(msg);
      wrapped.retriable = true;
      throw wrapped;
    } finally {
      if (timeoutHandle) {
        root.clearTimeout(timeoutHandle);
      }
    }

    if (!resp.ok) {
      let detail = `HTTP ${resp.status}`;
      try {
        const data = await resp.json();
        if (data?.error) detail = data.error;
      } catch (_) {
        // ignore
      }
      const err = new Error(detail);
      err.httpStatus = resp.status;
      err.retriable = resp.status === 408 || resp.status === 429 || resp.status >= 500;
      perfLog("tts", "request_fail", {
        traceId: perfTraceId || "(none)",
        elapsedMs: Math.round(getNow() - ttsReqStartedPerfMs),
        status: Number(resp.status) || 0,
        error: detail
      });
      throw err;
    }

    const { blob, mime } = await normalizeAudioBlob(await resp.blob(), requestOpts);
    perfLog("tts", "response_ok", {
      traceId: perfTraceId || "(none)",
      elapsedMs: Math.round(getNow() - ttsReqStartedPerfMs),
      status: Number(resp.status) || 0,
      bytes: Number(blob.size) || 0,
      mime
    });
    return blob;
  }

  async function requestServerTTSBlobWithRetry(text, prosody = null, opts = {}) {
    const maxRetries = Math.max(0, Math.min(4, Math.round(Number(opts.retries) || 0)));
    const retryDelayMs = Math.max(
      60,
      Math.min(3000, Math.round(Number(opts.retryDelayMs) || 220))
    );
    const timeoutMs = Math.max(
      1500,
      Math.min(45000, Math.round(Number(opts.timeoutMs) || 14000))
    );
    const wait = typeof opts.wait === "function" ? opts.wait : waitMs;
    let attempt = 0;
    while (true) {
      try {
        return await requestServerTTSBlob(text, prosody, {
          ...opts,
          timeoutMs,
          traceId: opts.traceId
        });
      } catch (err) {
        if (attempt >= maxRetries || !isRetriableTTSError(err)) {
          throw err;
        }
        const nextWaitMs = Math.round(retryDelayMs * (1 + attempt * 0.85));
        if (typeof opts.onRetry === "function") {
          opts.onRetry({
            attempt: attempt + 1,
            nextWaitMs,
            error: err
          });
        }
        await wait(nextWaitMs);
        attempt += 1;
      }
    }
  }

  const api = {
    buildServerTTSPayload,
    inferAudioMime,
    isRetriableTTSError,
    normalizeAudioBlob,
    requestServerTTSBlob,
    requestServerTTSBlobWithRetry
  };

  const ns = (root.TaffyModules = root.TaffyModules || {});
  ns.ttsApi = api;

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
}(typeof globalThis !== "undefined" ? globalThis : window));
