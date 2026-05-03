(function (root) {
  "use strict";

  const TOOL_META_MARKER = "[[TAFFY_TOOL_META]]";
  const RUNTIME_METADATA_KEYS = "emotion|action|intensity|voice_style|live2d_hint";
  const RUNTIME_METADATA_PAIR_RE = new RegExp(
    `["']?\\b(${RUNTIME_METADATA_KEYS})\\b["']?\\s*[:=]\\s*["']?([A-Za-z][A-Za-z0-9_-]*)["']?`,
    "gi"
  );
  const RUNTIME_METADATA_ONLY_RE = new RegExp(
    `^[\\s,;|{}()[\\]"'\`:=_-]*(?:["']?\\b(?:${RUNTIME_METADATA_KEYS})\\b["']?\\s*(?:[:=]\\s*["']?[A-Za-z0-9_-]*)?[\\s,;|{}()[\\]"'\`:=_-]*)+$`,
    "i"
  );

  function parseToolMetaVisibleText(text) {
    const src = String(text || "");
    const idx = src.indexOf(TOOL_META_MARKER);
    if (idx < 0) {
      return stripRuntimeMetadataSuffix(src);
    }
    return stripRuntimeMetadataSuffix(src.slice(0, idx)).trimEnd();
  }

  function stripRuntimeMetadataSuffix(text) {
    const src = String(text || "").trim();
    if (!src) {
      return "";
    }
    const matches = Array.from(src.matchAll(RUNTIME_METADATA_PAIR_RE));
    RUNTIME_METADATA_PAIR_RE.lastIndex = 0;
    if (!matches.length) {
      const partialStart = findRuntimeMetadataPartialTailStart(src);
      if (partialStart >= 0) {
        return src.slice(0, partialStart).trim();
      }
      return src;
    }
    for (const first of matches) {
      const start = findRuntimeMetadataTailStart(src, Number(first.index || 0));
      const tail = src.slice(start).trim();
      const tailPairs = Array.from(tail.matchAll(RUNTIME_METADATA_PAIR_RE));
      RUNTIME_METADATA_PAIR_RE.lastIndex = 0;
      if (!tailPairs.length) {
        continue;
      }
      const remainder = tail
        .replace(RUNTIME_METADATA_PAIR_RE, "")
        .replace(/\b(emotion|action|intensity|voice_style|live2d_hint)\b/gi, "")
        .replace(/[\s,;|{}()[\]"'`。.!?！？:=-]+/g, "");
      RUNTIME_METADATA_PAIR_RE.lastIndex = 0;
      if (remainder) {
        continue;
      }
      const before = src.slice(0, start);
      const startsLine = start === 0 || /[\r\n]\s*$/.test(before);
      const followsSentence = /[.!?。！？]\s*$/.test(before);
      if (tailPairs.length < 2 && !startsLine && !followsSentence) {
        continue;
      }
      return before.trim();
    }
    return src;
  }

  function findRuntimeMetadataTailStart(src, pairStart) {
    const safeStart = Math.max(0, Number(pairStart) || 0);
    const prevNewline = Math.max(src.lastIndexOf("\n", safeStart - 1), src.lastIndexOf("\r", safeStart - 1));
    const lineStart = prevNewline >= 0 ? prevNewline + 1 : 0;
    if (/^[\s,;|{}()[\]"'`:=_-]*$/.test(src.slice(lineStart, safeStart))) {
      return lineStart;
    }
    const before = src.slice(0, safeStart);
    const sentenceTail = before.match(/([.!?\u3002\uff01\uff1f])[\s,;|{}()[\]"'`:=_-]*$/);
    if (sentenceTail) {
      return safeStart - sentenceTail[0].length + sentenceTail[1].length;
    }
    return safeStart;
  }

  function findRuntimeMetadataPartialTailStart(src) {
    const keyRe = new RegExp(`["']?\\b(?:${RUNTIME_METADATA_KEYS})\\b`, "ig");
    const matches = Array.from(src.matchAll(keyRe));
    if (!matches.length) {
      return -1;
    }
    for (const match of matches) {
      const start = findRuntimeMetadataTailStart(src, Number(match.index || 0));
      const before = src.slice(0, start);
      const startsLine = start === 0 || /[\r\n]\s*$/.test(before);
      const followsSentence = /[.!?\u3002\uff01\uff1f]\s*$/.test(before);
      if (!startsLine && !followsSentence) {
        continue;
      }
      const tail = src.slice(start).trim();
      if (RUNTIME_METADATA_ONLY_RE.test(tail)) {
        return start;
      }
    }
    return -1;
  }

  function isMostlyEnglishText(text) {
    const src = String(text || "");
    const cjk = (src.match(/[\u4e00-\u9fff]/g) || []).length;
    const latin = (src.match(/[A-Za-z]/g) || []).length;
    return latin >= 3 && cjk === 0;
  }

  function normalizeEnglishBoundaries(text) {
    return String(text || "")
      .replace(/([.!?])(?=[A-Z'"\u2018\u2019])/g, "$1 ")
      .replace(/([,;:])(?=[A-Za-z])/g, "$1 ")
      .replace(/\s+([.!?,;:])/g, "$1")
      .replace(/\s+/g, " ")
      .trim();
  }

  function joinSpeechPieces(pieces) {
    return (Array.isArray(pieces) ? pieces : [])
      .reduce((out, piece) => {
        const safe = String(piece || "").trim();
        if (!safe) {
          return out;
        }
        if (!out) {
          return safe;
        }
        if (/[A-Za-z0-9.!?,;:]$/.test(out) && /^[A-Za-z'"\u2018\u2019(]/.test(safe)) {
          return `${out} ${safe}`;
        }
        return `${out}${safe}`;
      }, "")
      .trim();
  }

  function sanitizeSpeakText(text) {
    const plain = parseToolMetaVisibleText(text);
    return String(plain || "")
      .replace(/https?:\/\/\S+/g, "")
      .replace(/[【】《》\[\]{}<>]/g, " ")
      .replace(/^\s*[-*]\s+/gm, "")
      .replace(/^\s*\d+[.)]\s+/gm, "")
      .replace(/([。！？!?，,])\1+/g, "$1")
      .replace(/([.!?])(?=[A-Z'"\u2018\u2019])/g, "$1 ")
      .replace(/([,;:])(?=[A-Za-z])/g, "$1 ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function insertNaturalPause(seg) {
    const src = String(seg || "").trim();
    if (!src) {
      return "";
    }
    if (isMostlyEnglishText(src)) {
      return normalizeEnglishBoundaries(src);
    }
    if (src.length < 24 || /[，,。！？!?]/.test(src)) {
      return src;
    }
    let pivot = Math.floor(src.length * 0.5);
    pivot = Math.max(7, Math.min(src.length - 6, pivot));
    return `${src.slice(0, pivot)}，${src.slice(pivot)}`;
  }

  function colloquializeSpeakText(text) {
    let out = String(text || "").trim();
    if (!out) {
      return "";
    }
    out = out
      .replace(/作为(?:一个)?AI[^，。！？!?]*[，。！？!?]?/gi, "")
      .replace(/根据你的描述/g, "按你刚说的")
      .replace(/您可以/g, "你可以")
      .replace(/可以考虑/g, "可以直接")
      .replace(/请注意[:：]?\s*/g, "要注意，")
      .replace(/\b您\b/g, "你")
      .replace(/首先[:：]?\s*/g, "先说重点，")
      .replace(/其次[:：]?\s*/g, "另外，")
      .replace(/最后[:：]?\s*/g, "最后，")
      .replace(/综上所述[:：]?\s*/g, "简单说，")
      .replace(/总而言之[:：]?\s*/g, "简单说，")
      .replace(/建议你/g, "你可以")
      .replace(/建议您/g, "你可以")
      .replace(/需要注意的是[:：]?\s*/g, "要注意，")
      .replace(/与此同时[:：]?\s*/g, "同时，")
      .replace(/因此[:：]?\s*/g, "所以，")
      .replace(/\s+/g, " ")
      .trim();
    return out;
  }

  function simplifySpeechDeliveryText(text, style = "neutral", streamMode = false) {
    let out = String(text || "").trim();
    if (!out) {
      return "";
    }
    out = out
      .replace(/[~～]/g, "")
      .replace(/[（(][^()（）\n]{0,24}[）)]/g, "")
      .replace(/[\u{1F300}-\u{1FAFF}]/gu, "")
      .replace(/^(嗨|嘿|诶|嗯|呐)[，,\s]+/g, "")
      .replace(/(我给你|给你)(倒|递|拿)?([^，。！？!?]{0,10})(可乐|咖啡|奶茶|热可可|水)/g, "")
      .replace(/(别|停止|算了|不要)([^，。！？!?]{0,12})/g, "")
      .replace(/(虚拟|电子|赛博)/g, "")
      .replace(/(哈哈|嘿嘿|哎呀|啦啦)/g, "")
      .replace(/总之[，。]?/g, "")
      .replace(/简单说[，。]?/g, "")
      .replace(/先说重点[，。]?/g, "")
      .replace(/\s+/g, " ")
      .replace(/，{2,}/g, "，")
      .replace(/[。！？!?]{2,}/g, "。")
      .trim();

    if (streamMode) {
      out = out
        .replace(/[，,]/g, "，")
        .replace(/[；;]/g, "；");
    }

    if (style === "clear") {
      out = out
        .replace(/你可以直接/g, "你直接")
        .replace(/你可以先/g, "你先");
    }

    out = out.replace(/^[，。！？!?]+|[，。！？!?]+$/g, "").trim();
    return out;
  }

  function tightenMinorSpeechPauses(text, streamMode = false) {
    let out = String(text || "").trim();
    if (!out) {
      return "";
    }
    if (!streamMode) {
      return out.replace(/\s+/g, " ").trim();
    }
    const compactLen = out.replace(/\s+/g, "").length;
    if (compactLen <= 10) {
      out = out.replace(/[，,、]/g, "");
    } else if (compactLen <= 18) {
      out = out.replace(/[，,、]/g, "，").replace(/，{2,}/g, "，");
    } else if (compactLen <= 28) {
      out = out.replace(/([，,、])(?=[^，,、。！？!?]{1,4}[。！？!?]?$)/g, "");
    }
    out = out.replace(/\s+/g, " ").trim();
    return out;
  }

  function buildSpeechDeliveryText(text, mood = "idle", style = "neutral", streamMode = false) {
    let spoken = sanitizeSpeakText(text);
    if (!spoken) {
      return "";
    }
    spoken = colloquializeSpeakText(spoken);
    spoken = simplifySpeechDeliveryText(spoken, style, streamMode);
    spoken = isMostlyEnglishText(spoken) ? normalizeEnglishBoundaries(spoken) : spoken;
    if (!spoken) {
      return "";
    }

    const pieces = spoken.match(/[^。！？!?]+[。！？!?]?/g) || [spoken];
    const normalized = pieces
      .map((p) => {
        const safe = String(p || "").trim();
        if (!safe) {
          return "";
        }
        if (streamMode) {
          const streamSafe = safe.replace(/[？！!?]/g, "。");
          return tightenMinorSpeechPauses(streamSafe, true);
        }
        return insertNaturalPause(safe);
      })
      .filter(Boolean);
    spoken = joinSpeechPieces(normalized);

    spoken = spoken
      .replace(/[（(][^（）()]{2,28}[）)]/g, "")
      .replace(/```[\s\S]*?```/g, "")
      .replace(/\s+/g, " ")
      .replace(/，{2,}/g, "，")
      .replace(/([。！？!?]){2,}/g, "$1")
      .trim();

    if (style === "clear") {
      spoken = spoken
        .replace(/我建议你/g, "你直接")
        .replace(/你可以考虑/g, "你直接")
        .replace(/一般来说[:：]?\s*/g, "");
    }

    if (isMostlyEnglishText(spoken)) {
      spoken = normalizeEnglishBoundaries(spoken);
      if (!/[.!?]$/.test(spoken)) {
        spoken += ".";
      }
      return tightenMinorSpeechPauses(spoken, streamMode);
    }

    if (!/[。！？!?]$/.test(spoken)) {
      spoken += "。";
    }
    return tightenMinorSpeechPauses(spoken, streamMode);
  }

  function buildStableSpeakText(text) {
    const base = sanitizeSpeakText(text);
    if (!base) {
      return "";
    }
    const compact = base.replace(/\s+/g, " ").trim();
    if (!compact || compact.length <= 2) {
      return "";
    }
    return tightenMinorSpeechPauses(compact, false);
  }

  function splitStreamSpeakSegments(buffer, options = {}) {
    const flush = options.flush === true;
    const style = String(options.style || "neutral");
    const provider = String(options.provider || "").toLowerCase();
    const isGptSovits = provider === "gpt_sovits";
    const raw = parseToolMetaVisibleText(buffer);
    const src = simplifySpeechDeliveryText(raw, style, true);
    const segments = [];
    if (!src) {
      return { segments, rest: "" };
    }

    const strongTerminal = "。！？!?\n";
    const softTerminal = "，,";
    const englishStream = isMostlyEnglishText(src);
    const minEnglishFirstSegmentLen = isGptSovits ? 30 : 18;
    let start = 0;

    for (let i = 0; i < src.length; i++) {
      const ch = src[i];
      const isStrong = strongTerminal.includes(ch) || (englishStream && ch === ".");
      const isSoft = softTerminal.includes(ch);
      if (!isStrong && !isSoft) {
        continue;
      }

      const piece = src.slice(start, i + 1).trim();
      const minLen = isStrong ? (isGptSovits ? 10 : 6) : (isGptSovits ? 44 : 28);
      if (!flush && englishStream && start === 0 && piece.length < minEnglishFirstSegmentLen) {
        continue;
      }
      if (piece.length >= minLen) {
        segments.push(piece);
        start = i + 1;
      }
    }

    let rest = src.slice(start);
    const hardCutThreshold = isGptSovits ? 96 : 56;
    if (!flush && rest.length > hardCutThreshold) {
      const hardCut = Math.min(isGptSovits ? 72 : 36, rest.length);
      let cut = -1;
      const minCut = isGptSovits ? 36 : 18;
      for (let i = hardCut - 1; i >= minCut; i--) {
        if ("，,。！？!? ".includes(rest[i])) {
          cut = i + 1;
          break;
        }
      }
      if (cut < 0) {
        cut = hardCut;
      }
      const chunk = rest.slice(0, cut).trim();
      if (chunk.length >= (isGptSovits ? 28 : 14)) {
        segments.push(chunk);
        rest = rest.slice(cut);
      }
    }

    if (flush) {
      const tail = rest.trim();
      if (tail.length >= 3) {
        segments.push(tail);
      }
      rest = "";
    }

    return { segments, rest };
  }

  function clampNumber(v, min, max) {
    return Math.min(max, Math.max(min, v));
  }

  function textJitter(text, scale = 0.02) {
    const src = String(text || "");
    if (!src) {
      return 0;
    }
    let hash = 0;
    for (let i = 0; i < src.length; i++) {
      hash = (hash * 131 + src.charCodeAt(i)) % 1000003;
    }
    const normalized = ((hash % 1000) / 999) * 2 - 1;
    return normalized * scale;
  }

  function buildSpeakProsody(text, mood, streamMode = false, style = "neutral") {
    const clean = String(text || "").replace(/\s+/g, " ").trim();
    const textLen = clean.length;
    const commaCount = (clean.match(/[，,、]/g) || []).length;
    const exclaimCount = (clean.match(/[!！]/g) || []).length;

    let speed = 1.04;
    let pitch = 0.99;
    let volume = 1.0;

    if (textLen > 36) speed -= 0.02;
    if (textLen < 12) speed += 0.02;
    if (commaCount >= 2) speed -= 0.01;
    if (exclaimCount >= 1) {
      speed += 0.01;
      volume += 0.02;
    }

    if (mood === "happy") {
      speed += 0.02;
      pitch += 0.02;
    } else if (mood === "sad") {
      speed -= 0.02;
      pitch -= 0.01;
    } else if (mood === "angry") {
      speed += 0.01;
      pitch -= 0.01;
      volume += 0.03;
    } else if (mood === "surprised") {
      speed += 0.02;
      pitch += 0.03;
    }

    if (/[?？]/.test(clean)) {
      pitch += 0.02;
    }
    if (/[!！]/.test(clean)) {
      pitch += 0.02;
    }

    if (style === "comfort") {
      speed -= 0.02;
      pitch -= 0.01;
      volume -= 0.02;
    } else if (style === "clear") {
      speed += 0.02;
      pitch -= 0.02;
    } else if (style === "playful") {
      speed += 0.02;
      pitch += 0.02;
      volume += 0.01;
    } else if (style === "steady") {
      speed -= 0.01;
      pitch -= 0.02;
      volume += 0.02;
    }

    speed += textJitter(clean, 0.004);
    pitch += textJitter(clean.split("").reverse().join(""), 0.004);

    if (streamMode && textLen > 0 && textLen < 18) {
      speed = Math.max(speed, 1.04);
    }

    speed = clampNumber(speed, 0.98, 1.16);
    pitch = clampNumber(pitch, 0.95, 1.07);
    volume = clampNumber(volume, 0.9, 1.08);

    const ratePercent = Math.round((speed - 1) * 100);
    const pitchHz = Math.round((pitch - 1) * 34);
    const volumePercent = Math.round((volume - 1) * 100);

    return {
      speed_ratio: Number(speed.toFixed(2)),
      pitch_ratio: Number(pitch.toFixed(2)),
      volume_ratio: Number(volume.toFixed(2)),
      rate: `${ratePercent >= 0 ? "+" : ""}${ratePercent}%`,
      pitch: `${pitchHz >= 0 ? "+" : ""}${pitchHz}Hz`,
      volume: `${volumePercent >= 0 ? "+" : ""}${volumePercent}%`
    };
  }

  const api = {
    buildSpeechDeliveryText,
    buildSpeakProsody,
    buildStableSpeakText,
    colloquializeSpeakText,
    insertNaturalPause,
    normalizeEnglishBoundaries,
    sanitizeSpeakText,
    simplifySpeechDeliveryText,
    splitStreamSpeakSegments,
    stripRuntimeMetadataSuffix,
    tightenMinorSpeechPauses
  };

  const ns = (root.TaffyModules = root.TaffyModules || {});
  ns.speechText = api;

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
}(typeof globalThis !== "undefined" ? globalThis : window));
