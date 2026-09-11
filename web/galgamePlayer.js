(function (root) {
  "use strict";
  const EMOTIONS = ["neutral", "happy", "shy", "confused", "annoyed", "sad", "playful", "thinking", "surprised", "embarrassed", "determined", "sleepy", "greeting", "listening", "celebrate", "celebrate-bright"];
  function splitSentences(value) {
    // Keep punctuation and closing quotes; bound long unpunctuated model output.
    const parts = String(value || "").trim().match(/[^。！？!?\n]+[。！？!?]*[”’」』]*|[。！？!?]+/gu) || [];
    return parts.flatMap((part) => {
      const result = [];
      let chars = Array.from(part.trim());
      while (chars.length > 90) {
        let end = 90;
        for (let i = 89; i >= 30; i--) {
          if (/[，,；;\s]/u.test(chars[i])) { end = i + 1; break; }
        }
        result.push(chars.splice(0, end).join("").trim());
      }
      if (chars.length) result.push(chars.join(""));
      return result;
    }).filter(Boolean);
  }
  function emotionFor(text, fallback = "neutral") {
    const s = String(text || "");
    if (/庆祝|干杯|太棒了|好耶|赢了|\bcelebrate\b/iu.test(s)) return "celebrate";
    if (/欢迎|早上好|你好呀|再见|\bgreeting\b/iu.test(s)) return "greeting";
    if (/困|晚安|睡吧|打哈欠|\bsleepy\b/iu.test(s)) return "sleepy";
    if (/想想|思考|让我想|\bthinking\b/iu.test(s)) return "thinking";
    if (/惊讶|不会吧|真的假的|\bsurprised\b/iu.test(s)) return "surprised";
    if (/抱歉|对不起|不好意思|\bembarrassed\b/iu.test(s)) return "embarrassed";
    if (/加油|相信|一定可以|决定了|\bdetermined\b/iu.test(s)) return "determined";
    if (/听你说|我在听|慢慢说|\blistening\b/iu.test(s)) return "listening";
    if (/俏皮|逗你|开玩笑|\bplayful\b/iu.test(s)) return "playful";
    if (/害羞|脸红|别夸|羞|\bshy\b/iu.test(s)) return "shy";
    if (/难过|伤心|失落|遗憾|委屈|不开心|不高兴|\bsad\b/iu.test(s)) return "sad";
    if (/生气|气死|过分|可恶|哼[，。！!]|\bannoyed\b/iu.test(s) && !/别生气|不生气|没生气/u.test(s)) return "annoyed";
    if (/开心|高兴|太好了|哈哈|好耶|\bhappy\b/iu.test(s)) return "happy";
    if (/疑惑|不明白|为什么|怎么回事|[？?]|\bconfused\b/iu.test(s)) return "confused";
    const mapped = { angry: "annoyed", curious: "confused", surprised: "confused", cheerful: "happy", idle: "neutral" };
    const key = mapped[fallback] || fallback;
    return EMOTIONS.includes(key) ? key : "neutral";
  }
  function emotionForPerformance(performance, text, fallback = "neutral") {
    const source = String(performance?.emotion || "").trim().toLowerCase();
    const mapped = { angry: "annoyed", excited: "celebrate", hurt: "sad", anxious: "sad", serious: "determined" };
    const emotion = mapped[source] || source;
    // Actions only refine a compatible emotional state; a wave must not turn grief into joy.
    if (["neutral", "happy"].includes(emotion)) {
      if (performance?.action === "wave") return "greeting";
      if (performance?.action === "think") return "thinking";
    }
    return EMOTIONS.includes(emotion) ? emotion : emotionFor(text, fallback);
  }
  function performanceForSentence(segments, index, text) {
    const segment = Array.isArray(segments) ? segments[index] : null;
    // Only use a plan that still points to the exact finalized sentence.
    // Different client-side splitting must never apply a later line's pose.
    return segment && String(segment.text || "").trim() === String(text || "").trim()
      && segment.performance && typeof segment.performance === "object" ? segment.performance : null;
  }
  function playbackSegments(text, plan) {
    // Preserve exact server sentence boundaries (including English and long sentences).
    // Unplanned tails remain readable even when the bounded server plan stops early.
    const source = String(text || "");
    const result = [];
    let offset = 0;
    if (Array.isArray(plan)) {
      for (const segment of plan.slice(0, 24)) {
        const line = typeof segment?.text === "string" ? segment.text.trim() : "";
        if (!line) break;
        const start = source.indexOf(line, offset);
        if (start < 0 || source.slice(offset, start).trim()) break;
        result.push({ text: line, performance: segment.performance });
        offset = start + line.length;
      }
    }
    return result.concat(splitSentences(source.slice(offset)).map(line => ({ text: line, performance: null })));
  }
  function createPlayer(deps) {
    let run = null;
    let timer = null;
    let voice = null;
    let version = 0;
    const schedule = deps.schedule || setTimeout;
    const unschedule = deps.unschedule || clearTimeout;
    function stopVoice() {
      const activeVoice = voice;
      voice = null;
      activeVoice?.abort();
      deps.stop?.();
    }
    function stopSegment() {
      version++;
      if (timer !== null) unschedule(timer);
      timer = null;
      stopVoice();
    }
    function cancel() {
      if (!run) return;
      stopSegment();
      const previous = run;
      run = null;
      previous.signal?.removeEventListener("abort", cancel);
      previous.resolve(false);
    }
    function show() {
      stopSegment();
      const current = run;
      const token = version;
      const text = current.sentences[current.index];
      const chars = Array.from(text);
      let count = 0;
      const performance = performanceForSentence(current.performanceSegments, current.index, text);
      const emotion = emotionForPerformance(performance, text, current.emotion);
      deps.scene?.(current.performanceSegments[current.index]?.scene);
      const draw = () => {
        current.lastFrame = { text, visible: chars.slice(0, count).join(""), emotion, sprite: performance?.sprite,
          index: current.index, total: current.sentences.length, active: true, streaming: !current.finished };
        deps.render(current.lastFrame);
      };
      function tick() {
        if (run !== current || token !== version) return;
        count = Math.min(chars.length, count + 1);
        draw();
        if (count < chars.length) timer = schedule(tick, 32);
      }
      draw();
      if (deps.reducedMotion?.()) { count = chars.length; draw(); }
      else tick();
      voice = new AbortController();
      const signal = voice.signal;
      Promise.resolve().then(() => {
        if (signal.aborted || run !== current) return;
        return deps.speak(text, { signal, emotion });
      }).then((ok) => {
        if (run === current && token === version && ok === false) deps.voiceUnavailable?.();
      }).catch(() => {
        if (run === current && token === version && !signal.aborted) deps.voiceUnavailable?.();
      });
    }
    function next() {
      if (!run) return false;
      if (run.waiting) return false;
      if (run.index + 1 < run.sentences.length) { run.index++; show(); }
      else if (!run.finished) {
        stopSegment();
        run.waiting = true;
        deps.render({...run.lastFrame, visible: run.sentences[run.index], waiting: true});
      }
      else {
        const previous = run;
        stopSegment();
        run = null;
        previous.signal?.removeEventListener("abort", cancel);
        deps.render({ text: previous.sentences.at(-1), visible: previous.sentences.at(-1),
          sprite: previous.performanceSegments[previous.index]?.performance?.sprite,
          emotion: emotionForPerformance(performanceForSentence(previous.performanceSegments, previous.index, previous.sentences.at(-1)), previous.sentences.at(-1), previous.emotion),
          index: previous.index, total: previous.sentences.length, active: false });
        previous.resolve(true);
      }
      return true;
    }
    function play(text, options = {}) {
      cancel();
      const segments = playbackSegments(text, options.performanceSegments);
      const sentences = segments.map(segment => segment.text);
      if (!sentences.length || options.signal?.aborted) return Promise.resolve(false);
      return new Promise((resolve) => {
        run = { sentences, index: 0, resolve, emotion: options.emotion, signal: options.signal, performanceSegments: segments, finished: true };
        options.signal?.addEventListener("abort", cancel, { once: true });
        show();
      });
    }
    function beginStream(options = {}) {
      cancel();
      let current;
      const done = new Promise(resolve => {
        current = {sentences: [], performanceSegments: [], index: -1, resolve, signal: options.signal,
          emotion: options.emotion, finished: false, waiting: true};
        if (options.signal?.aborted) { resolve(false); return; }
        run = current;
        options.signal?.addEventListener("abort", cancel, {once:true});
      });
      return {
        done,
        append(segment) {
          if (run !== current || current.finished || !segment || segment.index !== current.sentences.length
            || typeof segment.text !== "string" || !segment.text.trim()) return false;
          current.sentences.push(segment.text);
          current.performanceSegments.push(segment);
          if (current.waiting) { current.waiting = false; current.index++; show(); }
          else if (current.lastFrame) deps.render({...current.lastFrame, total: current.sentences.length});
          return true;
        },
        finish(text) {
          if (run !== current) return false;
          if (current.sentences.join("").trim() !== String(text || "").trim()) { cancel(); return false; }
          current.finished = true;
          if (current.lastFrame) deps.render({...current.lastFrame, total: current.sentences.length, streaming: false});
          if (current.waiting) {
            current.waiting = false;
            if (!current.sentences.length) cancel();
            else next();
          }
          return true;
        },
        cancel() { if (run === current) cancel(); }
      };
    }
    return { play, beginStream, next, cancel, stopVoice, isPlaying: () => !!run };
  }
  const api = { EMOTIONS, splitSentences, emotionFor, emotionForPerformance, performanceForSentence, createPlayer };
  root.TaffyGalgamePlayer = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
