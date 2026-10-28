(function (root) {
  "use strict";
  // Visual approximation, not a phonetic transcription. Diphthongs use the
  // requested dominant shape; contracted iu/ui/un expand to iou/uei/uen.
  // pinyin-pro writes yue/xue finals as ue; v and ü represent the same vowel.
  const FINAL_VOWELS = Object.freeze({
    a: "a", ia: "a", ua: "a", ai: "a", uai: "a", ao: "a", iao: "a", an: "a", ian: "a", uan: "a", üan: "a", van: "a", ang: "a", iang: "a", uang: "a",
    i: "i", in: "i", ing: "i",
    u: "u", ü: "u", v: "u", ou: "u", iou: "u", iu: "u",
    e: "e", ê: "e", ei: "e", uei: "e", ui: "e", en: "e", uen: "e", un: "e", eng: "e", er: "e", ie: "e", üe: "e", ue: "e", ve: "e",
    o: "o", uo: "o", ong: "o", iong: "o", ueng: "o"
  });
  const punctuation = char => /[\s，。！？；：、,.!?;:…—“”‘’「」『』（）()\[\]{}"\-]/u.test(char);
  function fromFinal(final) { return FINAL_VOWELS[String(final || "").toLowerCase().replace(/[1-5]$/u, "")] || null; }
  function create(data) {
    const chars = new Map();
    for (const [final, text] of Object.entries(data.finals || {})) for (const char of text) chars.set(char, fromFinal(final));
    // English, numbers, rare characters and unknown readings keep opening only.
    return char => ({ vowel: chars.get(char) || null, closed: punctuation(char) });
  }
  const api = { FINAL_VOWELS, fromFinal, create, punctuation };
  root.XinyuPinyinVowels = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
