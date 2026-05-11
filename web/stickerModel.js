(function (root) {
  "use strict";

  const DEFAULT_STICKER_BASE_PATH = "./assets/stickers/default";
  const DEFAULT_STICKER_MANIFEST_URL = `${DEFAULT_STICKER_BASE_PATH}/manifest.json`;
  const DEFAULT_MAX_USER_STICKERS = 80;
  const DEFAULT_MAX_STICKER_BYTES = 3 * 1024 * 1024;
  const STICKER_IMAGE_EXTS = ["png", "jpg", "jpeg", "webp", "gif"];

  const DEFAULT_STICKERS = [
    { id: "hello", label: "\u6253\u62db\u547c", mood: "happy", src: `${DEFAULT_STICKER_BASE_PATH}/hello.png` },
    { id: "happy", label: "\u5f00\u5fc3", mood: "happy", src: `${DEFAULT_STICKER_BASE_PATH}/happy.png` },
    { id: "love", label: "\u559c\u6b22", mood: "happy", src: `${DEFAULT_STICKER_BASE_PATH}/love.png` },
    { id: "sleepy", label: "\u56f0\u56f0", mood: "sleepy", src: `${DEFAULT_STICKER_BASE_PATH}/sleepy.png` },
    { id: "thinking", label: "\u601d\u8003", mood: "idle", src: `${DEFAULT_STICKER_BASE_PATH}/thinking.png` },
    { id: "surprised", label: "\u60ca\u8bb6", mood: "surprised", src: `${DEFAULT_STICKER_BASE_PATH}/surprised.png` },
    { id: "sad", label: "\u59d4\u5c48", mood: "sad", src: `${DEFAULT_STICKER_BASE_PATH}/sad.png` },
    { id: "cheer", label: "\u52a0\u6cb9", mood: "happy", src: `${DEFAULT_STICKER_BASE_PATH}/cheer.png` }
  ];

  function clampText(value, fallback = "", maxLen = 80) {
    const text = String(value || "").trim();
    return (text || fallback).slice(0, Math.max(1, Number(maxLen) || 80));
  }

  function getFileExt(name) {
    const safe = String(name || "").trim().toLowerCase();
    const index = safe.lastIndexOf(".");
    return index >= 0 && index < safe.length - 1 ? safe.slice(index + 1) : "";
  }

  function isStickerImageFile(file) {
    const type = String(file?.type || "").toLowerCase();
    if (type.startsWith("image/")) {
      return true;
    }
    return STICKER_IMAGE_EXTS.includes(getFileExt(file?.name));
  }

  function validateStickerFile(file, options = {}) {
    const maxBytes = Math.max(1, Number(options.maxBytes) || DEFAULT_MAX_STICKER_BYTES);
    const size = Math.max(0, Number(file?.size) || 0);
    const name = clampText(file?.name, "\u672a\u547d\u540d\u8868\u60c5\u5305", 160);
    if (!isStickerImageFile(file)) {
      return { ok: false, reason: "type", message: `\u5df2\u8df3\u8fc7\u975e\u56fe\u7247\u6587\u4ef6: ${name}` };
    }
    if (size > maxBytes) {
      return { ok: false, reason: "size", message: `\u8868\u60c5\u5305\u8fc7\u5927\u5df2\u8df3\u8fc7: ${name}` };
    }
    return { ok: true, name, size };
  }

  function readFileAsDataUrl(file, FileReaderCtor = root.FileReader) {
    return new Promise((resolve, reject) => {
      if (typeof FileReaderCtor !== "function") {
        reject(new Error("FileReader is unavailable"));
        return;
      }
      const reader = new FileReaderCtor();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = () => reject(reader.error || new Error("\u8bfb\u53d6\u8868\u60c5\u5305\u5931\u8d25"));
      reader.readAsDataURL(file);
    });
  }

  function normalizeDefaultSticker(item, index = 0) {
    if (!item || typeof item !== "object") {
      return null;
    }
    const id = clampText(item.id, `default_${index}`, 48).replace(/[^a-zA-Z0-9_-]/g, "_");
    const src = clampText(item.src || item.url, "", 260);
    if (!id || !src) {
      return null;
    }
    return {
      id,
      source: "default",
      label: clampText(item.label || item.name, id, 40),
      mood: clampText(item.mood, "idle", 32),
      url: src,
      name: clampText(item.name || item.label, id, 80),
      builtin: true
    };
  }

  function normalizeDefaultManifest(manifest) {
    const items = Array.isArray(manifest?.items) ? manifest.items : DEFAULT_STICKERS;
    return items.map((item, index) => normalizeDefaultSticker(item, index)).filter(Boolean);
  }

  function getDefaultStickers() {
    return normalizeDefaultManifest({ items: DEFAULT_STICKERS });
  }

  function normalizeUserSticker(input = {}) {
    const dataUrl = clampText(input.dataUrl || input.url, "", 4000000);
    const createdAt = Math.max(1, Math.round(Number(input.createdAt) || Date.now()));
    const id = clampText(input.id, `user_${createdAt}_${Math.random().toString(36).slice(2, 8)}`, 80)
      .replace(/[^a-zA-Z0-9_-]/g, "_");
    if (!dataUrl || !dataUrl.startsWith("data:image/")) {
      return null;
    }
    return {
      id,
      source: "user",
      label: clampText(input.label || input.name, "\u6211\u7684\u8868\u60c5\u5305", 40),
      name: clampText(input.name || input.label, "\u6211\u7684\u8868\u60c5\u5305", 120),
      mood: clampText(input.mood, "idle", 32),
      type: clampText(input.type, "image/png", 80),
      size: Math.max(0, Number(input.size) || 0),
      createdAt,
      dataUrl,
      url: dataUrl,
      builtin: false
    };
  }

  function buildStickerPrompt(sticker = {}) {
    const label = clampText(sticker.label || sticker.name, "\u53ef\u7231", 40);
    return `\u6211\u53d1\u9001\u4e86\u4e00\u4e2a\u300c${label}\u300d\u8868\u60c5\u5305\u3002\u8bf7\u50cf\u6b63\u5e38\u966a\u4f34\u5bf9\u8bdd\u4e00\u6837\uff0c\u7b80\u77ed\u81ea\u7136\u5730\u56de\u5e94\u6211\u7684\u5fc3\u60c5\u3002`;
  }

  function buildStickerDisplayText(sticker = {}) {
    const label = clampText(sticker.label || sticker.name, "\u8868\u60c5\u5305", 40);
    return `[\u8868\u60c5\u5305: ${label}]`;
  }

  function resolveStickerMessageRef(sticker = {}) {
    const source = sticker.source === "user" ? "user" : "default";
    return {
      id: clampText(sticker.id || sticker.stickerId, "", 80),
      source,
      label: clampText(sticker.label || sticker.name, "\u8868\u60c5\u5305", 40),
      name: clampText(sticker.name || sticker.label, "\u8868\u60c5\u5305", 80),
      mood: clampText(sticker.mood, "idle", 32)
    };
  }

  function moodToStickerIds(mood, text = "") {
    const safeMood = clampText(mood, "idle", 32).toLowerCase();
    const safeText = String(text || "").toLowerCase();
    if (safeMood === "sad" || safeText.includes("sorry") || safeText.includes("tired")) {
      return ["sad", "sleepy"];
    }
    if (safeMood === "surprised") {
      return ["surprised"];
    }
    if (safeMood === "angry") {
      return ["sad", "thinking"];
    }
    if (safeMood === "happy") {
      if (safeText.includes("love") || safeText.includes("\u559c\u6b22")) {
        return ["love", "happy", "cheer"];
      }
      return ["happy", "cheer", "love"];
    }
    if (safeText.includes("?") || safeText.includes("\uff1f")) {
      return ["thinking"];
    }
    return ["hello", "thinking"];
  }

  function pickStickerByMood(stickers, mood, text = "", randomFn = Math.random) {
    const list = Array.isArray(stickers) ? stickers : [];
    const ids = moodToStickerIds(mood, text);
    const candidates = list.filter((item) => ids.includes(String(item?.id || "")));
    const pool = candidates.length ? candidates : list;
    if (!pool.length) {
      return null;
    }
    const random = typeof randomFn === "function" ? randomFn : Math.random;
    const index = Math.max(0, Math.min(pool.length - 1, Math.floor(random() * pool.length)));
    return pool[index] || pool[0];
  }

  function getAssistantStickerDecision(input = {}) {
    if (input.enabled === false || input.auto === true) {
      return { ok: false, reason: input.enabled === false ? "disabled" : "auto_turn" };
    }
    const brain = input.characterBrain && typeof input.characterBrain === "object" ? input.characterBrain : {};
    const intent = clampText(input.intent || brain.intent, "", 40).toLowerCase();
    const text = String(input.text || "").toLowerCase();
    const seriousIntents = new Set(["comfort", "reminder", "feedback", "task_help", "closing", "low_interrupt_checkin"]);
    if (seriousIntents.has(intent)) {
      return { ok: false, reason: `scene_${intent}` };
    }
    if (
      input.diagnostic === true
      || input.tool === true
      || /\b(error|failed|failure|exception|traceback|diagnostic|doctor|api key|secret)\b/.test(text)
      || /(报错|错误|失败|故障|诊断|密钥|异常|崩溃)/.test(text)
    ) {
      return { ok: false, reason: "diagnostic_or_error" };
    }
    const now = Math.max(1, Number(input.now) || Date.now());
    const lastAt = Math.max(0, Number(input.lastAt) || 0);
    const cooldownMs = Math.max(0, Number(input.cooldownMs) || 60000);
    if (lastAt && now - lastAt < cooldownMs) {
      return { ok: false, reason: "cooldown", remainingMs: Math.max(0, cooldownMs - (now - lastAt)) };
    }
    const chance = Math.max(0, Math.min(1, Number(input.chance) || 0.18));
    const random = typeof input.random === "function" ? input.random : Math.random;
    const roll = random();
    if (roll >= chance) {
      return { ok: false, reason: "chance", roll, chance };
    }
    return { ok: true, reason: "ok", roll, chance };
  }

  function shouldSendAssistantSticker(input = {}) {
    return getAssistantStickerDecision(input).ok === true;
  }

  const api = {
    DEFAULT_MAX_STICKER_BYTES,
    DEFAULT_MAX_USER_STICKERS,
    DEFAULT_STICKER_MANIFEST_URL,
    DEFAULT_STICKERS,
    STICKER_IMAGE_EXTS,
    buildStickerDisplayText,
    buildStickerPrompt,
    getDefaultStickers,
    getFileExt,
    getAssistantStickerDecision,
    isStickerImageFile,
    moodToStickerIds,
    normalizeDefaultManifest,
    normalizeDefaultSticker,
    normalizeUserSticker,
    pickStickerByMood,
    readFileAsDataUrl,
    resolveStickerMessageRef,
    shouldSendAssistantSticker,
    validateStickerFile
  };

  root.TaffyStickerModel = api;

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof window !== "undefined" ? window : globalThis);
