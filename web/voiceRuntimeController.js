(function (root) {
  "use strict";

  const VOICE_PREFS_BY_LANGUAGE = {
    zh: {
      voice: "zh-CN-XiaoxiaoNeural",
      names: ["xiaoxiao", "xiaoyi", "yunxi", "yunyang", "yunjian", "chinese"],
      langs: ["zh"]
    },
    en: {
      voice: "en-US-AriaNeural",
      names: ["aria", "jenny", "guy", "sonia", "english"],
      langs: ["en"]
    },
    ja: {
      voice: "ja-JP-NanamiNeural",
      names: ["nanami", "keita", "japanese"],
      langs: ["ja"],
      fallback: "en"
    },
    ko: {
      voice: "ko-KR-SunHiNeural",
      names: ["sunhi", "injoon", "korean"],
      langs: ["ko"],
      fallback: "en"
    }
  };

  function normalizeReplyLanguage(value) {
    const raw = String(value || "zh").trim().toLowerCase();
    if (["auto", "zh", "en", "ja", "ko"].includes(raw)) {
      return raw;
    }
    if (["zh-cn", "zh_cn", "cn", "chinese"].includes(raw)) return "zh";
    if (raw === "english") return "en";
    if (["jp", "japanese"].includes(raw)) return "ja";
    if (["kr", "korean"].includes(raw)) return "ko";
    return "zh";
  }

  function createController(deps = {}) {
    const state = deps.state || {};
    const ui = deps.ui || {};
    const window = deps.windowObject || root;
    const document = deps.documentObject || root.document;
    const SpeechSynthesisUtterance = deps.SpeechSynthesisUtterance || root.SpeechSynthesisUtterance;
    const setStatus = typeof deps.setStatus === "function" ? deps.setStatus : () => {};
    const isServerTTSProvider = typeof deps.isServerTTSProvider === "function" ? deps.isServerTTSProvider : () => false;
    const clampNumber = typeof deps.clampNumber === "function" ? deps.clampNumber : (v, min, max) => Math.min(max, Math.max(min, v));
    const normalizeTalkStyle = typeof deps.normalizeTalkStyle === "function" ? deps.normalizeTalkStyle : () => "neutral";
    const detectMood = typeof deps.detectMood === "function" ? deps.detectMood : () => "idle";
    const buildSpeakProsody = typeof deps.buildSpeakProsody === "function" ? deps.buildSpeakProsody : () => ({ speed_ratio: 1, pitch_ratio: 1, volume_ratio: 1 });
    const beginSpeechAnimation = typeof deps.beginSpeechAnimation === "function" ? deps.beginSpeechAnimation : () => {};
    const showSubtitleText = typeof deps.showSubtitleText === "function" ? deps.showSubtitleText : () => {};
    const finishSpeechAnimation = typeof deps.finishSpeechAnimation === "function" ? deps.finishSpeechAnimation : () => {};
    const hideSubtitleText = typeof deps.hideSubtitleText === "function" ? deps.hideSubtitleText : () => {};
    const endSpeechAnimation = typeof deps.endSpeechAnimation === "function" ? deps.endSpeechAnimation : () => {};
    const isCurrentTTSPlaybackGeneration = typeof deps.isCurrentTTSPlaybackGeneration === "function" ? deps.isCurrentTTSPlaybackGeneration : () => true;
    const updateReplyLanguageControls = typeof deps.updateReplyLanguageControls === "function" ? deps.updateReplyLanguageControls : () => {};

    function getTargetReplyLanguage() {
      const explicit = state.replyLanguage || state.config?.assistant_reply_language || "";
      if (!explicit) {
        const cfg = state.config?.tts || {};
        const voiceHints = [cfg.voice, ...(Array.isArray(cfg.voices) ? cfg.voices : [])]
          .map((item) => String(item || "").toLowerCase())
          .join(" ");
        if (/\bja[-_]|japanese|nanami|keita/.test(voiceHints)) return "ja";
        if (/\bko[-_]|korean|sunhi|injoon/.test(voiceHints)) return "ko";
        if (/\ben[-_]|english|aria|jenny|guy|sonia/.test(voiceHints)) return "en";
      }
      const lang = normalizeReplyLanguage(explicit || "zh");
      return lang === "auto" ? "zh" : lang;
    }

    function getPreferredVoiceNameForReplyLanguage(lang = getTargetReplyLanguage()) {
      return VOICE_PREFS_BY_LANGUAGE[normalizeReplyLanguage(lang)]?.voice || VOICE_PREFS_BY_LANGUAGE.zh.voice;
    }

    function voiceMatchesLanguage(voice, lang) {
      const pref = VOICE_PREFS_BY_LANGUAGE[normalizeReplyLanguage(lang)] || VOICE_PREFS_BY_LANGUAGE.zh;
      const name = String(voice?.name || voice || "").toLowerCase();
      const voiceLang = String(voice?.lang || "").toLowerCase();
      return pref.langs.some((prefix) => voiceLang.startsWith(prefix))
        || pref.names.some((marker) => name.includes(marker));
    }

    function initServerTTSVoices() {
      const cfg = state.config?.tts || {};
      const isVolcengine = state.ttsProvider === "volcengine_tts" || state.ttsProvider === "volcengine";
      const isGptSovits = state.ttsProvider === "gpt_sovits";
      const list = Array.isArray(cfg.voices) ? cfg.voices.filter(Boolean) : [];
      const fallback = (isVolcengine || isGptSovits)
        ? [cfg.voice]
        : [
          cfg.voice,
          "zh-CN-XiaoxiaoNeural",
          "zh-CN-XiaoyiNeural",
          "zh-CN-YunxiNeural",
          "zh-CN-YunjianNeural",
        ].filter(Boolean);
      const merged = [...list, ...fallback];
      const deduped = [...new Set(merged)];
      state.ttsServerVoices = deduped;
      const initVoice = cfg.voice || deduped[0] || null;
      const idx = deduped.findIndex((v) => v === initVoice);
      state.ttsServerVoiceIndex = idx >= 0 ? idx : 0;
      state.ttsServerVoice = deduped[state.ttsServerVoiceIndex] || null;
    }

    function scoreVoice(v) {
      const name = String(v?.name || "").toLowerCase();
      const lang = String(v?.lang || "").toLowerCase();
      const cfg = state.config?.tts || {};
      const targetLang = getTargetReplyLanguage();
      const targetPref = VOICE_PREFS_BY_LANGUAGE[targetLang] || VOICE_PREFS_BY_LANGUAGE.zh;
      const fallbackPref = VOICE_PREFS_BY_LANGUAGE[targetPref.fallback || ""];
      const preferredNames = [
        cfg.voice,
        ...(Array.isArray(cfg.voices) ? cfg.voices : [])
      ].map((item) => String(item || "").trim().toLowerCase()).filter(Boolean);
      const preferredLangs = [...new Set(preferredNames
        .map((item) => {
          const match = item.match(/\b([a-z]{2})(?:[-_][a-z]{2})?\b/i);
          return match ? match[1].toLowerCase() : "";
        })
        .filter(Boolean))];
      let score = 0;
      if (targetPref.langs.some((preferred) => lang.startsWith(preferred))) {
        score += 1200;
      }
      if (targetPref.names.some((marker) => name.includes(marker))) {
        score += 420;
      }
      if (fallbackPref && fallbackPref.langs.some((preferred) => lang.startsWith(preferred))) {
        score += 260;
      }
      if (preferredNames.some((preferred) => name === preferred || name.includes(preferred) || preferred.includes(name))) {
        score += 900;
      }
      if (preferredLangs.some((preferred) => lang.startsWith(preferred))) {
        score += 900;
      }
      if (targetLang === "zh" && lang === "zh-cn") score += 500;
      else if (targetLang === "zh" && lang.startsWith("zh")) score += 300;
      if (/natural|neural|online|xiaoxiao|xiaoyi|yunxi|yunyang|huihui/.test(name)) {
        score += 220;
      }
      if (/yaoyao/.test(name)) score += 90;
      if (/kangkang/.test(name)) score += 30;
      if (/huihui/.test(name)) score -= 20;
      if (/microsoft|edge|google/.test(name)) {
        score += 60;
      }
      if (targetLang !== "en" && targetPref.fallback !== "en" && /english|en-us|en-gb/.test(name + " " + lang)) {
        score -= 200;
      }
      return score;
    }

    function getSortedVoices() {
      if (!("speechSynthesis" in window)) {
        return [];
      }
      const voices = window.speechSynthesis.getVoices() || [];
      if (!voices.length) {
        return [];
      }
      return [...voices].sort((a, b) => scoreVoice(b) - scoreVoice(a));
    }

    function chooseTTSVoice() {
      const sorted = getSortedVoices();
      return sorted.length ? sorted[0] : null;
    }

    function setActiveVoice(index) {
      if (!state.ttsVoices.length) {
        state.ttsVoice = null;
        state.ttsVoiceIndex = -1;
        return;
      }
      const safe = ((index % state.ttsVoices.length) + state.ttsVoices.length) % state.ttsVoices.length;
      state.ttsVoiceIndex = safe;
      state.ttsVoice = state.ttsVoices[safe];
    }

    function buildVoiceCandidates() {
      const chosen = state.ttsVoice || chooseTTSVoice();
      const targetLang = getTargetReplyLanguage();
      const fallbackTarget = state.ttsVoices.find((v) => voiceMatchesLanguage(v, targetLang));
      const fallbackEn = state.ttsVoices.find((v) => voiceMatchesLanguage(v, "en"));
      const fallbackZh = state.ttsVoices.find((v) => voiceMatchesLanguage(v, "zh"));
      const candidates = [];
      if (chosen) candidates.push(chosen);
      if (fallbackTarget && (!chosen || fallbackTarget.name !== chosen.name)) {
        candidates.push(fallbackTarget);
      }
      if ((targetLang === "ja" || targetLang === "ko") && fallbackEn && !candidates.some((v) => v && v.name === fallbackEn.name)) {
        candidates.push(fallbackEn);
      }
      if (fallbackZh && !candidates.some((v) => v && v.name === fallbackZh.name)) {
        candidates.push(fallbackZh);
      }
      // null means use browser default voice
      candidates.push(null);
      return candidates;
    }

    function initTTS() {
      if (!("speechSynthesis" in window)) {
        state.ttsReady = false;
        ui.speakBtn.disabled = true;
        ui.speakBtn.textContent = "语音不可用";
        return;
      }

      const refresh = () => {
        const prevName = state.ttsVoice?.name || "";
        state.ttsVoices = getSortedVoices();
        let idx = state.ttsVoices.findIndex((v) => v.name === prevName);
        if (idx < 0) idx = 0;
        setActiveVoice(idx);
        state.ttsReady = true;
        updateReplyLanguageControls();
        if (ui.voiceNextBtn) {
          ui.voiceNextBtn.disabled = state.ttsVoices.length <= 1;
        }
        if (state.speakingEnabled) {
          ui.speakBtn.textContent = "语音开";
        } else {
          ui.speakBtn.textContent = "语音关";
        }
      };

      refresh();
      window.speechSynthesis.onvoiceschanged = refresh;

      // Warm up TTS engine so first sentence is less likely to be dropped.
      const warmup = () => {
        try {
          const u = new SpeechSynthesisUtterance("");
          window.speechSynthesis.speak(u);
          window.speechSynthesis.cancel();
        } catch (_) {
          // Ignore warmup failure.
        }
        document.removeEventListener("pointerdown", warmup);
        document.removeEventListener("keydown", warmup);
      };
      document.addEventListener("pointerdown", warmup, { once: true });
      document.addEventListener("keydown", warmup, { once: true });
    }

    function switchVoice() {
      if (isServerTTSProvider(state.ttsProvider)) {
        if (!state.ttsServerVoices.length) {
          setStatus("无可用服务端音色");
          return;
        }
        state.ttsServerVoiceIndex =
          (state.ttsServerVoiceIndex + 1) % state.ttsServerVoices.length;
        state.ttsServerVoice = state.ttsServerVoices[state.ttsServerVoiceIndex];
        setStatus(`音色: ${state.ttsServerVoice}`);
        return;
      }

      if (!state.ttsVoices.length) {
        setStatus("无可用音色");
        return;
      }
      setActiveVoice(state.ttsVoiceIndex + 1);
      const name = state.ttsVoice?.name || "未知";
      setStatus(`音色: ${name}`);
    }

    return {
      initServerTTSVoices,
      scoreVoice,
      getSortedVoices,
      chooseTTSVoice,
      setActiveVoice,
      buildVoiceCandidates,
      getPreferredVoiceNameForReplyLanguage,
      initTTS,
      switchVoice
    };
  }

  const api = { createController };
  root.TaffyVoiceRuntimeController = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
