(function (root) {
  "use strict";

  const DEFAULT_STORAGE_KEY = "taffy_character_experience_v1";
  const MAX_FEEDBACKS = 24;
  const MAX_DIRECTIVES = 4;

  const ISSUE_LABELS = {
    liked_overall: "overall liked",
    style_mismatch: "text felt off-character",
    reply_too_long: "reply was too long",
    reply_too_generic: "reply felt too generic",
    motion_too_much: "motion felt too strong",
    motion_too_little: "motion felt too weak",
    voice_mismatch: "voice style felt wrong"
  };

  function getStorage(windowObject) {
    try {
      return windowObject?.localStorage || null;
    } catch (_) {
      return null;
    }
  }

  function safeParseJSON(raw, fallback) {
    try {
      const parsed = JSON.parse(String(raw || ""));
      return parsed == null ? fallback : parsed;
    } catch (_) {
      return fallback;
    }
  }

  function cleanText(value, maxLen = 120) {
    const text = String(value || "").replace(/\s+/g, " ").trim();
    if (!text) return "";
    return text.length > maxLen ? text.slice(0, maxLen - 1).trimEnd() + "..." : text;
  }

  function normalizeRating(value) {
    return value === "bad" ? "bad" : "good";
  }

  function inferIssue(feedback = {}) {
    const explicit = cleanText(feedback.issue || feedback.reason || feedback.note, 40)
      .toLowerCase()
      .replace(/\s+/g, "_");
    if (ISSUE_LABELS[explicit]) {
      return explicit;
    }
    if (normalizeRating(feedback.rating) === "good") {
      return "liked_overall";
    }
    const note = cleanText(feedback.note, 120).toLowerCase();
    if (/long|length|too_many|太长|太多/.test(note)) return "reply_too_long";
    if (/generic|robot|assistant|不像|客服|模板/.test(note)) return "reply_too_generic";
    if (/motion|action|动作/.test(note) && /much|strong|多|强|夸张/.test(note)) return "motion_too_much";
    if (/motion|action|动作/.test(note) && /little|weak|少|弱/.test(note)) return "motion_too_little";
    if (/voice|tts|声音|语音|声线/.test(note)) return "voice_mismatch";
    return "style_mismatch";
  }

  function normalizeFeedback(input = {}, now = Date.now()) {
    const rating = normalizeRating(input.rating);
    const issue = inferIssue({ ...input, rating });
    return {
      at: Math.max(0, Number(input.at) || now),
      rating,
      issue,
      label: cleanText(input.label || (rating === "good" ? "表现不错" : "需要调整"), 32),
      note: cleanText(input.note, 120),
      textPreview: cleanText(input.textPreview, 96),
      emotion: cleanText(input.emotion || "neutral", 32),
      action: cleanText(input.action || "none", 32),
      voiceStyle: cleanText(input.voiceStyle || "neutral", 32),
      applied: input.applied === true,
      source: cleanText(input.source || "assistant_reply", 40)
    };
  }

  function createEmptyProfile() {
    return {
      version: 1,
      updatedAt: 0,
      feedbacks: [],
      stats: { total: 0, good: 0, bad: 0 },
      styleDirectives: [],
      avoidDirectives: []
    };
  }

  function countIssues(feedbacks) {
    const counts = {};
    for (const item of feedbacks) {
      const issue = item?.issue || "";
      if (!issue) continue;
      counts[issue] = (counts[issue] || 0) + 1;
    }
    return counts;
  }

  function addDirective(items, text) {
    const normalized = cleanText(text, 160);
    if (normalized && !items.includes(normalized) && items.length < MAX_DIRECTIVES) {
      items.push(normalized);
    }
  }

  function buildDirectives(feedbacks) {
    const recent = Array.isArray(feedbacks) ? feedbacks.slice(0, MAX_FEEDBACKS) : [];
    const bad = recent.filter((item) => item?.rating === "bad");
    const good = recent.filter((item) => item?.rating === "good");
    const issues = countIssues(bad);
    const styleDirectives = [];
    const avoidDirectives = [];

    if (good.length >= 2) {
      addDirective(styleDirectives, "Keep the recent character tone that users marked as good; stay conversational and consistent.");
    }
    if ((issues.style_mismatch || 0) + (issues.reply_too_generic || 0) > 0) {
      addDirective(styleDirectives, "Make the reply feel like the same desktop character, not a generic assistant.");
      addDirective(avoidDirectives, "Avoid customer-service phrasing, markdown-heavy structure, and over-explaining your reasoning.");
    }
    if (issues.reply_too_long > 0) {
      addDirective(styleDirectives, "Prefer 1-3 natural short sentences unless the user explicitly asks for detail.");
      addDirective(avoidDirectives, "Avoid long numbered explanations for casual or emotional replies.");
    }
    if (issues.voice_mismatch > 0) {
      addDirective(styleDirectives, "Choose a voice_style that matches the emotion gently; calm replies should stay soft and steady.");
    }
    if (issues.motion_too_much > 0) {
      addDirective(styleDirectives, "Use lower intensity action cues for comfort, thinking, and normal chat.");
      addDirective(avoidDirectives, "Avoid excited or high-intensity action cues when the user is sad, tired, or asking calmly.");
    }
    if (issues.motion_too_little > 0) {
      addDirective(styleDirectives, "Let important emotional moments include a small visible action cue when safe.");
    }
    if (!styleDirectives.length && recent.length) {
      addDirective(styleDirectives, "Keep character continuity steady; tune tone, voice_style, and action cues based on recent feedback.");
    }
    return { styleDirectives, avoidDirectives };
  }

  function rebuildProfile(feedbacks = []) {
    const defaultAt = Date.now();
    const normalized = feedbacks
      .map((item) => normalizeFeedback(item, Number(item?.at) || defaultAt))
      .filter(Boolean)
      .sort((a, b) => b.at - a.at)
      .slice(0, MAX_FEEDBACKS);
    const stats = normalized.reduce((acc, item) => {
      acc.total += 1;
      if (item.rating === "bad") acc.bad += 1;
      else acc.good += 1;
      return acc;
    }, { total: 0, good: 0, bad: 0 });
    const directives = buildDirectives(normalized);
    return {
      version: 1,
      updatedAt: normalized[0]?.at || 0,
      feedbacks: normalized,
      stats,
      styleDirectives: directives.styleDirectives,
      avoidDirectives: directives.avoidDirectives
    };
  }

  function normalizeProfile(raw) {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
      return createEmptyProfile();
    }
    return rebuildProfile(Array.isArray(raw.feedbacks) ? raw.feedbacks : []);
  }

  function buildRequestProfile(profile) {
    const normalized = normalizeProfile(profile);
    if (!normalized.stats.total) {
      return null;
    }
    return {
      version: 1,
      updated_at: normalized.updatedAt,
      stats: normalized.stats,
      style_directives: normalized.styleDirectives.slice(0, MAX_DIRECTIVES),
      avoid_directives: normalized.avoidDirectives.slice(0, MAX_DIRECTIVES),
      recent_feedback: normalized.feedbacks.slice(0, 5).map((item) => ({
        rating: item.rating,
        issue: item.issue,
        emotion: item.emotion,
        action: item.action,
        voice_style: item.voiceStyle,
        applied: item.applied === true
      }))
    };
  }

  function buildProfileSummary(profile) {
    const normalized = normalizeProfile(profile);
    if (!normalized.stats.total) {
      return "\u89d2\u8272\u4f53\u9a8c\u6863\u6848\uff1a\u8fd8\u6ca1\u6709\u53cd\u9988\u8bb0\u5f55\u3002";
    }
    const lines = [
      `\u89d2\u8272\u4f53\u9a8c\u6863\u6848\uff1a${normalized.stats.total} \u6761\u53cd\u9988\uff08\u597d ${normalized.stats.good} / \u9700\u8c03\u6574 ${normalized.stats.bad}\uff09`,
      "\u4e0b\u8f6e\u8f7b\u91cf\u8c03\u6574\uff1a",
      ...(normalized.styleDirectives.length ? normalized.styleDirectives : ["Keep character continuity steady."]).map((item, index) => `${index + 1}. ${item}`)
    ];
    if (normalized.avoidDirectives.length) {
      lines.push("\u5c3d\u91cf\u907f\u514d\uff1a", ...normalized.avoidDirectives.map((item, index) => `${index + 1}. ${item}`));
    }
    return lines.join("\n");
  }

  function createController(deps = {}) {
    const state = deps.state || {};
    const windowObject = deps.windowObject || root;
    const storageKey = deps.storageKey || DEFAULT_STORAGE_KEY;

    function saveProfile(profile = state.characterExperienceProfile) {
      const normalized = normalizeProfile(profile);
      state.characterExperienceProfile = normalized;
      const storage = getStorage(windowObject);
      if (!storage) {
        return normalized;
      }
      try {
        storage.setItem(storageKey, JSON.stringify(normalized));
      } catch (_) {
        // Ignore quota/private-mode storage failures.
      }
      return normalized;
    }

    function loadProfile() {
      const storage = getStorage(windowObject);
      const parsed = storage ? safeParseJSON(storage.getItem(storageKey), null) : null;
      state.characterExperienceProfile = normalizeProfile(parsed);
      return state.characterExperienceProfile;
    }

    function recordFeedback(feedback) {
      const current = state.characterExperienceProfile || loadProfile();
      const normalized = normalizeFeedback(feedback);
      const profile = rebuildProfile([normalized, ...(current.feedbacks || [])]);
      saveProfile(profile);
      return {
        feedback: normalized,
        profile,
        requestProfile: buildRequestProfile(profile)
      };
    }

    function getRequestProfile() {
      return buildRequestProfile(state.characterExperienceProfile || loadProfile());
    }

    function getProfileSummary() {
      return buildProfileSummary(state.characterExperienceProfile || loadProfile());
    }

    return {
      loadProfile,
      saveProfile,
      recordFeedback,
      getRequestProfile,
      getProfileSummary
    };
  }

  const api = {
    DEFAULT_STORAGE_KEY,
    MAX_FEEDBACKS,
    ISSUE_LABELS,
    normalizeFeedback,
    normalizeProfile,
    rebuildProfile,
    buildRequestProfile,
    buildProfileSummary,
    createController
  };

  root.TaffyCharacterExperienceController = api;
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof window !== "undefined" ? window : globalThis);
