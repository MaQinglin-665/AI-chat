(function (root) {
  "use strict";
  const pinyin = () => root.XinyuPinyinVowels || (typeof require === "function" ? require("./pinyinVowels.js") : null);
  const sync = () => root.XinyuBrowserLipSync || (typeof require === "function" ? require("./browserLipSync.js") : null);
  let ready;
  async function load(host = root) {
    if (typeof require === "function") return require("./data/pinyinCommon.json");
    return ready ||= (async () => {
      if (!pinyin()) await import("./pinyinVowels.js");
      const response = await host.fetch("/avatar/data/pinyinCommon.json", { cache: "force-cache" });
      if (!response.ok) throw Error("Local pinyin data could not be loaded");
      return response.json();
    })().catch(error => { ready = null; throw error; });
  }
  function target(plans, now, lookup) {
    const plan = [...(plans || [])].reverse().find(item => now >= item.at);
    if (!plan) return { vowel: null, closed: false };
    // A boundary is an audible lower bound. Forecast only its bounded word;
    // never advance into an unconfirmed next word. Without charLength, allow
    // four characters. Real boundaries replace the estimate after delayMs.
    const chars = Array.from(plan.text), index = Math.floor((now - plan.at) / plan.charMs);
    if (index >= chars.length) return { vowel: null, closed: !!chars.length && lookup(chars.at(-1)).closed };
    return lookup(chars[index]);
  }
  function create({ state, host = root, mapping, data }) {
    const lookup = pinyin().create(data), names = ["a", "i", "u", "e", "o"];
    const fallback = Object.entries(mapping.params?.vowels || {}).find(([, id]) => id === mapping.params.mouthOpen)?.[0] || "a";
    let channel, remote, lease, lastVowel, changedAt = 0, previous = {}, weights = {}, identity;
    const now = () => host.performance.now();
    const wall = () => host.Date?.now?.() ?? Date.now();
    if (state.uiView === "model" && typeof host.BroadcastChannel === "function") {
      channel = new host.BroadcastChannel("taffy-speech");
      channel.onmessage = ({ data: message }) => {
        if (message?.type === "speech") {
          if (lease && message.speechSentAtWallMs < lease.sentAt) return;
          lease = { sender: message.speechSenderId, generation: message.playbackGeneration,
            sentAt: message.speechSentAtWallMs, at: now(), active: message.browserMouthActive === true };
        } else if (message?.type === "live2d-browser-text") {
          if (typeof message.sender !== "string" || !Number.isFinite(message.generation) || !Number.isFinite(message.token)
            || !Number.isFinite(message.sentAt) || Math.abs(wall() - message.sentAt) > 10000
            || (remote && message.sentAt < remote.sentAt) || !Array.isArray(message.plans) || message.plans.length > 8
            || !message.plans.every(plan => typeof plan.text === "string" && plan.text.length <= 32
              && Number.isFinite(plan.at) && Math.abs(plan.at - message.sentAt) < 30000
              && Number.isFinite(plan.charMs) && plan.charMs >= 70 && plan.charMs <= 900)) return;
          remote = { ...message, plans: message.plans.map(plan => ({ ...plan, at: now() + plan.at - wall() })) };
        }
      };
    }
    function mouth(input, time = now()) {
      let timeline;
      if (state.uiView === "model") {
        if (!lease?.active || time - lease.at >= 900 || state.ttsBrowserMouthActive !== true) return null;
        timeline = remote?.sender === lease.sender && remote.generation === lease.generation ? remote : null;
      } else {
        timeline = sync()?.textTimeline(state);
        if (!timeline) return null;
      }
      const plans = timeline?.textBoundaries || timeline?.plans;
      const id = timeline && `${timeline.generation}:${timeline.token}`;
      if (identity !== id) { identity = id; weights = {}; lastVowel = undefined; }
      const active = timeline ? timeline.phase === "playing" : state.uiView === "model" && lease?.active;
      const spec = active ? target(plans, time, lookup) : { vowel: null, closed: false };
      const open = spec.closed ? 0 : input?.open || 0;
      const vowel = spec.vowel || fallback;
      if (vowel !== lastVowel) { previous = { ...weights }; changedAt = time; lastVowel = vowel; }
      const blend = Math.max(0, Math.min(1, (time - changedAt) / 80));
      // Crossfade shapes only; their sum is one, so #226's opening stays intact.
      const total = Object.values(previous).reduce((sum, value) => sum + value, 0);
      weights = Object.fromEntries(names.map(name => [name, total ? (previous[name] || 0) * (1 - blend) + (name === vowel ? blend : 0) : Number(name === vowel)]));
      return { open, vowel: open > .02 ? spec.vowel : null, source: "browser-text", weights };
    }
    return { mouth, dispose() { channel?.close(); remote = lease = null; } };
  }
  const api = { load, create, target };
  root.XinyuBrowserTextVowels = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
