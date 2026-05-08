(function (root) {
  "use strict";

  function createController(deps = {}) {
    const state = deps.state || {};
    const windowObject = deps.windowObject || root;
    const storageKey = deps.storageKey || "taffy_emotion_stats_v1";
    const safeParseJSON = typeof deps.safeParseJSON === "function"
      ? deps.safeParseJSON
      : (raw, fallback) => {
        try {
          return JSON.parse(raw);
        } catch (_) {
          return fallback;
        }
      };

    function loadEmotionStats() {
      const storage = windowObject.localStorage || root.localStorage;
      const raw = storage ? storage.getItem(storageKey) : "";
      const parsed = safeParseJSON(raw, { day: "", items: [] });
      const today = new Date().toISOString().slice(0, 10);
      if (!parsed || typeof parsed !== "object" || parsed.day !== today || !Array.isArray(parsed.items)) {
        state.emotionDayKey = today;
        state.emotionStats = [];
        return;
      }
      state.emotionDayKey = today;
      state.emotionStats = parsed.items
        .map((x) => ({
          mood: String(x?.mood || "idle"),
          ts: Number(x?.ts) || Date.now()
        }))
        .filter((x) => ["happy", "sad", "angry", "surprised", "idle"].includes(x.mood))
        .slice(-800);
    }

    function saveEmotionStats() {
      const storage = windowObject.localStorage || root.localStorage;
      if (!storage) {
        return;
      }
      try {
        storage.setItem(
          storageKey,
          JSON.stringify({
            day: state.emotionDayKey || new Date().toISOString().slice(0, 10),
            items: state.emotionStats || []
          })
        );
      } catch (_) {
        // ignore
      }
    }

    function recordEmotion(mood) {
      const today = new Date().toISOString().slice(0, 10);
      if (state.emotionDayKey !== today) {
        state.emotionDayKey = today;
        state.emotionStats = [];
      }
      const m = String(mood || "idle");
      state.emotionStats.push({ mood: m, ts: Date.now() });
      if (state.emotionStats.length > 1000) {
        state.emotionStats = state.emotionStats.slice(state.emotionStats.length - 1000);
      }
      saveEmotionStats();
    }

    function buildEmotionReportText() {
      if (!Array.isArray(state.emotionStats) || !state.emotionStats.length) {
        return "今天还没有足够的对话数据，先多聊几句我再给你情绪日报。";
      }
      const counts = { happy: 0, sad: 0, angry: 0, surprised: 0, idle: 0 };
      for (const item of state.emotionStats) {
        const mood = String(item?.mood || "idle");
        if (Object.prototype.hasOwnProperty.call(counts, mood)) {
          counts[mood] += 1;
        }
      }
      const label = {
        happy: "开心",
        sad: "低落",
        angry: "紧张",
        surprised: "惊讶",
        idle: "平稳"
      };
      const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
      const detail = Object.entries(counts)
        .filter(([, n]) => n > 0)
        .map(([k, n]) => `${label[k] || k}${n}`)
        .join("，");
      return `今日情绪日报：我回复里占比最高的是“${label[top[0]] || top[0]}”。统计：${detail}。`;
    }

    return {
      loadEmotionStats,
      saveEmotionStats,
      recordEmotion,
      buildEmotionReportText
    };
  }

  const api = { createController };
  root.TaffyEmotionStatsController = api;
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof window !== "undefined" ? window : globalThis);
