(function (root) {
  "use strict";

  const CHAT_TRANSLATE_TIMEOUT_MS = 60000;
  const CHAT_TRANSLATE_CACHE_LIMIT = 160;
  const TRANSLATE_CIRCUIT_FAILURE_THRESHOLD = 3;
  const TRANSLATE_CIRCUIT_BASE_COOLDOWN_MS = 12000;
  const TRANSLATE_CIRCUIT_MAX_COOLDOWN_MS = 90000;

  const chatTranslationCache = new Map();
  const translationInFlight = new Map();
  const translationCircuitState = {
    failures: 0,
    cooldownUntil: 0
  };

  function nowMs() {
    return Date.now();
  }

  function getPerformance(deps = {}) {
    return deps.performanceObject || root.performance || { now: () => nowMs() };
  }

  function recordDebug(deps, stage, payload) {
    if (typeof deps.recordDebug === "function") {
      deps.recordDebug(stage, payload);
    }
  }

  function normalizeKey(text) {
    const safe = String(text || "").replace(/\s+/g, " ").trim();
    if (!safe) {
      return "";
    }
    return safe
      .replace(/([A-Za-z0-9])([.!?])(?=[A-Za-z0-9])/g, "$1$2 ")
      .replace(/\s+([,.;:!?])/g, "$1")
      .replace(/([,.;:!?])\s+/g, "$1 ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function isLikelyEnglish(text) {
    const letters = String(text).replace(/\s/g, "");
    if (!letters.length) {
      return false;
    }
    const ascii = Array.from(letters).filter((c) => c.charCodeAt(0) < 128).length;
    return ascii / letters.length > 0.70;
  }

  function countCjkChars(text) {
    return (String(text || "").match(/[\u4e00-\u9fff]/g) || []).length;
  }

  function countLatinChars(text) {
    return (String(text || "").match(/[A-Za-z]/g) || []).length;
  }

  function isLikelyEnglishForChat(text) {
    const safe = String(text || "").trim();
    if (!safe) {
      return false;
    }
    const latinCount = (safe.match(/[A-Za-z]/g) || []).length;
    const cjkCount = (safe.match(/[\u4e00-\u9fff]/g) || []).length;
    if (latinCount < 6 || cjkCount > 0) {
      return false;
    }
    return isLikelyEnglish(safe);
  }

  function looksLikeBadTranslation(source, translated) {
    const src = String(source || "").trim();
    const out = String(translated || "").trim();
    if (!out) {
      return true;
    }
    if (!isLikelyEnglishForChat(src)) {
      return false;
    }
    const lower = out.toLowerCase();
    if (
      lower.includes("i'm mimo")
      || lower.includes("i am mimo")
      || lower.includes("xiaomi")
      || lower.includes("hyperos")
      || lower.includes("official ai assistant")
      || lower.includes("here to help")
      || lower.includes("i'll do my best")
      || lower.includes("i'm sorry")
    ) {
      return true;
    }
    const cjkCount = countCjkChars(out);
    if (cjkCount <= 0) {
      return true;
    }
    return countLatinChars(out) > Math.max(12, cjkCount * 2);
  }

  function shouldShowAssistantTranslation(text) {
    const safe = String(text || "").trim();
    if (!safe || safe.length < 4 || safe.includes("```")) {
      return false;
    }
    return isLikelyEnglishForChat(safe);
  }

  function normalizeAssistantVisibleText(text, deps = {}) {
    const safe = String(text || "").trim();
    if (!safe || !isLikelyEnglishForChat(safe)) {
      return safe;
    }
    const speechText = deps.speechText || {};
    if (typeof speechText.normalizeEnglishBoundaries === "function") {
      return speechText.normalizeEnglishBoundaries(safe);
    }
    return safe
      .replace(/([.!?])(?=[A-Z'"\u2018\u2019])/g, "$1 ")
      .replace(/([,;:])(?=[A-Za-z])/g, "$1 ")
      .replace(/\s+([.!?,;:])/g, "$1")
      .replace(/\s+/g, " ")
      .trim();
  }

  function readCache(text) {
    const key = normalizeKey(text);
    if (!key || !chatTranslationCache.has(key)) {
      return "";
    }
    const hit = chatTranslationCache.get(key) || "";
    chatTranslationCache.delete(key);
    chatTranslationCache.set(key, hit);
    return String(hit || "").trim();
  }

  function writeCache(text, translated) {
    const key = normalizeKey(text);
    const value = String(translated || "").trim();
    if (!key || !value || looksLikeBadTranslation(text, value)) {
      return;
    }
    if (chatTranslationCache.has(key)) {
      chatTranslationCache.delete(key);
    }
    chatTranslationCache.set(key, value);
    while (chatTranslationCache.size > CHAT_TRANSLATE_CACHE_LIMIT) {
      const oldestKey = chatTranslationCache.keys().next().value;
      if (!oldestKey) {
        break;
      }
      chatTranslationCache.delete(oldestKey);
    }
  }

  function isCircuitOpen() {
    return nowMs() < Number(translationCircuitState.cooldownUntil || 0);
  }

  function markFailure() {
    translationCircuitState.failures += 1;
    if (translationCircuitState.failures < TRANSLATE_CIRCUIT_FAILURE_THRESHOLD) {
      return;
    }
    const over = translationCircuitState.failures - TRANSLATE_CIRCUIT_FAILURE_THRESHOLD;
    const factor = Math.min(6, Math.max(0, over));
    const cooldownMs = Math.min(
      TRANSLATE_CIRCUIT_MAX_COOLDOWN_MS,
      TRANSLATE_CIRCUIT_BASE_COOLDOWN_MS * Math.pow(2, factor)
    );
    translationCircuitState.cooldownUntil = nowMs() + cooldownMs;
  }

  function markSuccess() {
    translationCircuitState.failures = 0;
    translationCircuitState.cooldownUntil = 0;
  }

  async function fetchTranslation(text, deps = {}) {
    const safe = String(text || "").trim();
    if (!safe) {
      return "";
    }
    const cacheKey = normalizeKey(safe);
    const cached = readCache(safe);
    if (cached) {
      recordDebug(deps, "cache_hit", {
        text: safe,
        sourceChars: safe.length,
        translatedChars: cached.length,
        cache: "hit",
        result: "ok"
      });
      return cached;
    }
    if (isCircuitOpen()) {
      recordDebug(deps, "circuit_open", {
        text: safe,
        sourceChars: safe.length,
        result: "skipped",
        error: "translation circuit cooldown"
      });
      return "";
    }
    const inFlight = translationInFlight.get(cacheKey);
    if (inFlight) {
      recordDebug(deps, "inflight_reuse", {
        text: safe,
        sourceChars: safe.length,
        result: "pending"
      });
      return inFlight;
    }
    const task = fetchTranslationUncached(safe, deps);
    translationInFlight.set(cacheKey, task);
    try {
      return await task;
    } finally {
      if (translationInFlight.get(cacheKey) === task) {
        translationInFlight.delete(cacheKey);
      }
    }
  }

  async function fetchTranslationUncached(safe, deps = {}) {
    const authFetch = deps.authFetch;
    if (typeof authFetch !== "function") {
      return "";
    }
    const performanceObject = getPerformance(deps);
    const controller = new AbortController();
    const traceId = typeof deps.createTraceId === "function"
      ? deps.createTraceId("translate")
      : `translate_${nowMs()}`;
    const startedPerfMs = performanceObject.now();
    const startedWallMs = nowMs();
    recordDebug(deps, "request_start", {
      traceId,
      text: safe,
      sourceChars: safe.length,
      cache: "miss"
    });
    const timeoutId = setTimeout(() => {
      try {
        controller.abort();
      } catch (_) {
        // ignore
      }
    }, CHAT_TRANSLATE_TIMEOUT_MS);
    try {
      const resp = await authFetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: safe,
          _perf_trace_id: traceId,
          _perf_client_send_ts_ms: startedWallMs
        }),
        signal: controller.signal
      });
      const elapsedMs = Math.round(performanceObject.now() - startedPerfMs);
      const responseTraceId =
        typeof resp.headers?.get === "function" ? String(resp.headers.get("X-Perf-Trace-Id") || "") : "";
      if (!resp.ok) {
        markFailure();
        let errorText = `HTTP ${resp.status}`;
        try {
          const errData = await resp.json();
          errorText = String(errData?.error || errorText);
        } catch (_) {
          // ignore
        }
        recordDebug(deps, "request_fail", {
          traceId: responseTraceId || traceId,
          text: safe,
          sourceChars: safe.length,
          elapsedMs,
          status: Number(resp.status) || 0,
          result: "http_error",
          error: errorText
        });
        return "";
      }
      const data = await resp.json();
      const translated = String(data?.translated || data?.translated_text || "").trim();
      const degraded = data?.degraded === true || data?.fallback === true;
      const badTranslation = looksLikeBadTranslation(safe, translated);
      if (degraded || badTranslation) {
        if (!badTranslation) {
          markFailure();
        }
        recordDebug(deps, "request_degraded", {
          traceId: responseTraceId || traceId,
          text: safe,
          sourceChars: safe.length,
          translatedChars: translated.length,
          elapsedMs,
          status: Number(resp.status) || 0,
          degraded: true,
          fallback: data?.fallback === true,
          result: badTranslation ? "invalid_translation" : "degraded",
          error: badTranslation ? "invalid translation result" : String(data?.error || "")
        });
        return "";
      }
      if (!translated) {
        markFailure();
        recordDebug(deps, "request_empty", {
          traceId: responseTraceId || traceId,
          text: safe,
          sourceChars: safe.length,
          elapsedMs,
          status: Number(resp.status) || 0,
          result: "empty"
        });
        return "";
      }
      markSuccess();
      writeCache(safe, translated);
      recordDebug(deps, "request_ok", {
        traceId: responseTraceId || traceId,
        text: safe,
        sourceChars: safe.length,
        translatedChars: translated.length,
        elapsedMs,
        status: Number(resp.status) || 0,
        result: "ok"
      });
      return translated;
    } catch (err) {
      if (!controller.signal.aborted || nowMs() >= translationCircuitState.cooldownUntil) {
        markFailure();
      }
      recordDebug(deps, "request_error", {
        traceId,
        text: safe,
        sourceChars: safe.length,
        elapsedMs: Math.round(performanceObject.now() - startedPerfMs),
        result: controller.signal.aborted ? "timeout" : "error",
        error: controller.signal.aborted
          ? `timeout ${CHAT_TRANSLATE_TIMEOUT_MS}ms`
          : String(err?.message || err || "")
      });
      return "";
    } finally {
      clearTimeout(timeoutId);
    }
  }

  const api = {
    CHAT_TRANSLATE_TIMEOUT_MS,
    normalizeKey,
    readCache,
    writeCache,
    fetchTranslation,
    isLikelyEnglishForChat,
    looksLikeBadTranslation,
    shouldShowAssistantTranslation,
    normalizeAssistantVisibleText,
    _debug: {
      chatTranslationCache,
      translationInFlight,
      translationCircuitState,
      isCircuitOpen
    }
  };

  root.TaffyChatTranslationService = api;

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof window !== "undefined" ? window : globalThis);
