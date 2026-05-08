(function (root) {
  "use strict";

  const SUBTITLE_MAX_CHARS = 320;
  const SUBTITLE_CACHE_LIMIT = 80;
  const SUBTITLE_SPEECH_RECHECK_MS = 1400;
  const SUBTITLE_HARD_MAX_MS = 90000;
  const SUBTITLE_AFTER_SPEECH_HOLD_MS = 2200;
  const SUBTITLE_PAGE_MIN_INTERVAL_MS = 1500;
  const SUBTITLE_PAGE_MAX_INTERVAL_MS = 3600;

  const subtitleTranslationCache = new Map();
  let subtitleTranslationAbortController = null;
  const subtitlePaging = {
    id: 0,
    enPages: [],
    zhPages: [],
    index: 0,
    intervalMs: 2200
  };

  function call(fn, ...args) {
    return typeof fn === "function" ? fn(...args) : undefined;
  }

  function isLikelyEnglish(text) {
    const letters = String(text).replace(/\s/g, "");
    if (!letters.length) {
      return false;
    }
    const ascii = Array.from(letters).filter((c) => c.charCodeAt(0) < 128).length;
    return ascii / letters.length > 0.70;
  }

  function subtitleDuration(text) {
    const safe = String(text || "").trim();
    const compact = safe.replace(/\s+/g, "");
    const words = safe.split(/\s+/).filter(Boolean).length;
    const weighted = isLikelyEnglish(safe)
      ? Math.max(words * 120, compact.length * 30)
      : compact.length * 45;
    return Math.min(Math.max(3800 + weighted, 4000), 10000);
  }

  function isSubtitleSpeechActive(deps = {}) {
    const state = deps.state || {};
    return !!call(deps.isSpeakingNow) || !!state.streamSpeakWorking || !!state.ttsContextSpeaking;
  }

  function splitSubtitlePages(text) {
    const src = String(text || "").replace(/\s+/g, " ").trim();
    if (!src) {
      return [];
    }
    const english = isLikelyEnglish(src);
    const limit = english ? 110 : 56;
    const rough = src.match(/[^.!?\u3002\uff01\uff1f\n]+[.!?\u3002\uff01\uff1f]?/g) || [src];
    const pages = [];
    let current = "";

    const pushPage = (value) => {
      const clean = String(value || "").trim();
      if (clean) {
        pages.push(clean);
      }
    };

    const pushWithChunking = (piece) => {
      const clean = String(piece || "").trim();
      if (!clean) {
        return;
      }
      if (clean.length <= limit) {
        pushPage(clean);
        return;
      }
      if (english) {
        const words = clean.split(/\s+/).filter(Boolean);
        let chunk = "";
        for (const w of words) {
          const next = chunk ? `${chunk} ${w}` : w;
          if (next.length <= limit) {
            chunk = next;
          } else {
            pushPage(chunk || w.slice(0, limit));
            chunk = w.length > limit ? w.slice(0, limit) : w;
          }
        }
        pushPage(chunk);
        return;
      }
      for (let i = 0; i < clean.length; i += limit) {
        pushPage(clean.slice(i, i + limit));
      }
    };

    for (const rawPiece of rough) {
      const piece = String(rawPiece || "").trim();
      if (!piece) {
        continue;
      }
      if (!current) {
        if (piece.length > limit) {
          pushWithChunking(piece);
          continue;
        }
        current = piece;
        continue;
      }
      const candidate = `${current} ${piece}`.replace(/\s+/g, " ").trim();
      if (candidate.length <= limit) {
        current = candidate;
        continue;
      }
      pushPage(current);
      if (piece.length > limit) {
        pushWithChunking(piece);
        current = "";
      } else {
        current = piece;
      }
    }
    pushPage(current);
    return pages.length ? pages : [src];
  }

  function subtitlePageCount() {
    return Math.max(
      1,
      Array.isArray(subtitlePaging.enPages) ? subtitlePaging.enPages.length : 0,
      Array.isArray(subtitlePaging.zhPages) ? subtitlePaging.zhPages.length : 0
    );
  }

  function pickSubtitlePage(pages, index) {
    if (!Array.isArray(pages) || !pages.length) {
      return "";
    }
    const safeIndex = Math.max(0, Math.min(pages.length - 1, Math.round(Number(index) || 0)));
    return String(pages[safeIndex] || "").trim();
  }

  function calcSubtitlePageInterval(fullText, pageCount) {
    const base = subtitleDuration(fullText) / Math.max(1, Number(pageCount) || 1);
    return Math.max(
      SUBTITLE_PAGE_MIN_INTERVAL_MS,
      Math.min(SUBTITLE_PAGE_MAX_INTERVAL_MS, Math.round(base))
    );
  }

  function stopSubtitlePaging(deps = {}) {
    const state = deps.state || {};
    if (state.subtitlePageTimer) {
      clearTimeout(state.subtitlePageTimer);
      state.subtitlePageTimer = 0;
    }
  }

  function scheduleSubtitleSafetyHide(id, baseDelayMs, deps = {}) {
    const state = deps.state || {};
    const startedAt = Date.now();
    const firstDelay = Math.max(3200, Math.round(Number(baseDelayMs) || 0));
    const tick = () => {
      if (id !== state.subtitleId) {
        return;
      }
      const elapsed = Date.now() - startedAt;
      if (isSubtitleSpeechActive(deps) && elapsed < SUBTITLE_HARD_MAX_MS) {
        state.subtitleHideTimer = setTimeout(tick, SUBTITLE_SPEECH_RECHECK_MS);
        return;
      }
      hideSubtitleText(deps);
    };
    state.subtitleHideTimer = setTimeout(tick, firstDelay);
  }

  function normalizeSubtitleText(rawText, deps = {}) {
    let out = typeof deps.sanitizeSpeakText === "function"
      ? deps.sanitizeSpeakText(rawText)
      : String(rawText || "").trim();
    out = String(out || "").replace(/^(?:en|english|\u539f\u6587)\s*[:\uff1a]\s*/i, "").trim();
    return out ? out.slice(0, SUBTITLE_MAX_CHARS) : "";
  }

  function readSubtitleTranslationCache(text) {
    const key = String(text || "").trim();
    if (!key || !subtitleTranslationCache.has(key)) {
      return "";
    }
    const hit = subtitleTranslationCache.get(key) || "";
    subtitleTranslationCache.delete(key);
    subtitleTranslationCache.set(key, hit);
    return String(hit || "").trim();
  }

  function writeSubtitleTranslationCache(text, translated) {
    const key = String(text || "").trim();
    const value = String(translated || "").trim();
    if (!key || !value) {
      return;
    }
    if (subtitleTranslationCache.has(key)) {
      subtitleTranslationCache.delete(key);
    }
    subtitleTranslationCache.set(key, value);
    while (subtitleTranslationCache.size > SUBTITLE_CACHE_LIMIT) {
      const oldestKey = subtitleTranslationCache.keys().next().value;
      if (!oldestKey) {
        break;
      }
      subtitleTranslationCache.delete(oldestKey);
    }
  }

  function abortSubtitleTranslation() {
    if (!subtitleTranslationAbortController) {
      return;
    }
    try {
      subtitleTranslationAbortController.abort();
    } catch (_) {
      // ignore
    }
    subtitleTranslationAbortController = null;
  }

  async function fetchTranslation(text, capturedId, deps = {}) {
    const safe = String(text || "").trim();
    const state = deps.state || {};
    if (!safe) {
      return "";
    }
    const cached = readSubtitleTranslationCache(safe) || call(deps.readChatTranslationCache, safe);
    if (cached) {
      writeSubtitleTranslationCache(safe, cached);
      return cached;
    }
    if (call(deps.isTranslationCircuitOpen) || capturedId !== state.subtitleId) {
      return "";
    }
    const translated = String(await call(deps.fetchChatTranslation, safe) || "").trim();
    if (capturedId !== state.subtitleId || !translated) {
      return "";
    }
    writeSubtitleTranslationCache(safe, translated);
    return translated;
  }

  function applySubtitleDOM(enText, zhText, deps = {}) {
    const documentObject = deps.documentObject || root.document;
    const layer = documentObject?.getElementById?.("subtitle-layer");
    if (!layer) {
      return;
    }
    const spanEn = layer.querySelector(".subtitle-en");
    const spanZh = layer.querySelector(".subtitle-zh");
    const en = String(enText || "").trim();
    const zh = String(zhText || "").trim();
    if (spanEn) {
      spanEn.textContent = en;
    }
    if (spanZh) {
      spanZh.textContent = zh;
    }
    layer.classList.toggle("subtitle-zh-ready", !!zh);
    layer.classList.remove("subtitle-hiding");
    layer.classList.add("subtitle-visible");
  }

  function emitSubtitleFrame(id, enText, zhText, deps = {}) {
    const state = deps.state || {};
    const windowObject = deps.windowObject || root;
    if (!state.subtitleEnabled) {
      clearSubtitleDOM(id, true, deps);
      return;
    }
    if (windowObject.electronAPI?.sendSubtitle) {
      windowObject.electronAPI.sendSubtitle({ id, en: enText, zh: zhText });
    } else {
      applySubtitleDOM(enText, zhText, deps);
    }
  }

  function renderSubtitlePage(id, deps = {}) {
    const state = deps.state || {};
    if (id !== state.subtitleId || subtitlePaging.id !== id) {
      return false;
    }
    const pageIndex = subtitlePaging.index;
    const en = pickSubtitlePage(subtitlePaging.enPages, pageIndex);
    const zh = pickSubtitlePage(subtitlePaging.zhPages, pageIndex);
    emitSubtitleFrame(id, en, zh, deps);
    return true;
  }

  function startSubtitlePaging(id, enText, zhText = "", preserveIndex = false, deps = {}) {
    const state = deps.state || {};
    stopSubtitlePaging(deps);
    const enPages = splitSubtitlePages(enText);
    const zhPages = splitSubtitlePages(zhText);
    const pageCount = Math.max(1, enPages.length, zhPages.length);
    const nextIndex = preserveIndex && subtitlePaging.id === id
      ? Math.max(0, Math.min(pageCount - 1, subtitlePaging.index))
      : 0;
    subtitlePaging.id = id;
    subtitlePaging.enPages = enPages;
    subtitlePaging.zhPages = zhPages;
    subtitlePaging.index = nextIndex;
    subtitlePaging.intervalMs = calcSubtitlePageInterval(enText, pageCount);
    renderSubtitlePage(id, deps);
    if (pageCount <= 1) {
      return;
    }
    const tick = () => {
      if (id !== state.subtitleId || subtitlePaging.id !== id) {
        return;
      }
      const total = subtitlePageCount();
      if (subtitlePaging.index >= total - 1) {
        return;
      }
      subtitlePaging.index += 1;
      renderSubtitlePage(id, deps);
      state.subtitlePageTimer = setTimeout(tick, subtitlePaging.intervalMs);
    };
    state.subtitlePageTimer = setTimeout(tick, subtitlePaging.intervalMs);
  }

  function clearSubtitleDOM(id, force = false, deps = {}) {
    const state = deps.state || {};
    const documentObject = deps.documentObject || root.document;
    if (!force && id !== state.subtitleId) {
      return;
    }
    stopSubtitlePaging(deps);
    state.subtitleHideTimer = 0;
    const layer = documentObject?.getElementById?.("subtitle-layer");
    if (!layer) {
      return;
    }
    layer.classList.remove("subtitle-visible");
    layer.classList.remove("subtitle-zh-ready");
    layer.classList.add("subtitle-hiding");
    setTimeout(() => {
      if (!force && id !== state.subtitleId) {
        return;
      }
      layer.classList.remove("subtitle-hiding");
      layer.classList.remove("subtitle-zh-ready");
      const spanEn = layer.querySelector(".subtitle-en");
      const spanZh = layer.querySelector(".subtitle-zh");
      if (spanEn) {
        spanEn.textContent = "";
      }
      if (spanZh) {
        spanZh.textContent = "";
      }
    }, 500);
  }

  function showSubtitleText(rawText, deps = {}) {
    const state = deps.state || {};
    if (!state.subtitleEnabled) {
      return;
    }
    const cleaned = normalizeSubtitleText(rawText, deps);
    if (!cleaned) {
      return;
    }

    abortSubtitleTranslation();
    if (state.subtitleHideTimer) {
      clearTimeout(state.subtitleHideTimer);
      state.subtitleHideTimer = 0;
    }

    state.subtitleId++;
    const id = state.subtitleId;
    startSubtitlePaging(id, cleaned, "", false, deps);
    scheduleSubtitleSafetyHide(id, subtitleDuration(cleaned), deps);

    if (cleaned.length >= 3) {
      fetchTranslation(cleaned, id, deps).then((zh) => {
        if (!zh || id !== state.subtitleId) {
          return;
        }
        startSubtitlePaging(id, cleaned, zh, true, deps);
      });
    }
  }

  function hideSubtitleText(deps = {}) {
    const state = deps.state || {};
    const windowObject = deps.windowObject || root;
    const id = state.subtitleId;
    abortSubtitleTranslation();
    stopSubtitlePaging(deps);
    if (state.subtitleHideTimer) {
      clearTimeout(state.subtitleHideTimer);
    }
    state.subtitleHideTimer = setTimeout(() => {
      if (id !== state.subtitleId) {
        return;
      }
      if (windowObject.electronAPI?.sendSubtitleHide) {
        windowObject.electronAPI.sendSubtitleHide({ id });
      } else {
        clearSubtitleDOM(id, true, deps);
      }
      state.subtitleHideTimer = setTimeout(() => clearSubtitleDOM(id, true, deps), 500);
      if (state.subtitleId === id) {
        state.subtitleId = id + 1;
      }
    }, SUBTITLE_AFTER_SPEECH_HOLD_MS);
  }

  const api = {
    subtitleDuration,
    isLikelyEnglish,
    splitSubtitlePages,
    readSubtitleTranslationCache,
    writeSubtitleTranslationCache,
    fetchTranslation,
    applySubtitleDOM,
    clearSubtitleDOM,
    showSubtitleText,
    hideSubtitleText,
    _debug: {
      subtitleTranslationCache,
      subtitlePaging
    }
  };

  root.TaffySubtitleController = api;

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof window !== "undefined" ? window : globalThis);
