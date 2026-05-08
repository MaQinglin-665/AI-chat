(function (root) {
  "use strict";

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
      let score = 0;
      if (lang === "zh-cn") score += 500;
      else if (lang.startsWith("zh")) score += 300;
      if (/natural|neural|online|xiaoxiao|xiaoyi|yunxi|yunyang|huihui/.test(name)) {
        score += 220;
      }
      if (/yaoyao/.test(name)) score += 90;
      if (/kangkang/.test(name)) score += 30;
      if (/huihui/.test(name)) score -= 20;
      if (/microsoft|edge|google/.test(name)) {
        score += 60;
      }
      if (/english|en-us|en-gb/.test(name + " " + lang)) {
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
      const fallbackZh = state.ttsVoices.find((v) => /^zh/i.test(String(v.lang || "")));
      const candidates = [];
      if (chosen) candidates.push(chosen);
      if (fallbackZh && (!chosen || fallbackZh.name !== chosen.name)) {
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

    return { initServerTTSVoices, scoreVoice, getSortedVoices, chooseTTSVoice, setActiveVoice, buildVoiceCandidates, initTTS, switchVoice };
  }

  const api = { createController };
  root.TaffyVoiceRuntimeController = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
