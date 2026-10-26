(function (root) {
  "use strict";
  function createRuntime(root) {
  const INPUT_HOLD_MS = 1000;
  const clamp = (v) => Math.max(0, Math.min(1, Number(v) || 0));
  function formatConditions(conditions = {}) {
    const labels = { licenseName: "许可证", allowedUserName: "可使用者", avatarPermission: "可使用者",
      violentUssageName: "暴力内容", sexualUssageName: "色情内容", commercialUssageName: "商业使用",
      commercialUsage: "商业使用", creditNotation: "署名要求", allowRedistribution: "再分发",
      modification: "修改", allowExcessivelyViolentUsage: "过度暴力内容", allowExcessivelySexualUsage: "色情内容",
      allowPoliticalOrReligiousUsage: "政治 / 宗教内容", allowAntisocialOrHateUsage: "反社会 / 仇恨内容",
      thirdPartyLicenses: "其他素材许可" };
    const values = { true: "允许", false: "不允许", Allow: "允许", Disallow: "不允许", Other: "作者自定义条件（请查看完整许可）",
      Everyone: "所有人", everyone: "所有人", OnlyAuthor: "仅作者", onlyAuthor: "仅作者", required: "必须署名",
      unnecessary: "无需署名", necessary: "必须署名", disallow: "不允许", allow: "允许", personalNonProfit: "仅个人非商业使用",
      personalProfit: "允许个人商业使用", corporation: "允许企业商业使用", prohibit: "禁止修改", allowModification: "允许修改" };
    const lines = Object.entries(conditions).filter(([key]) => labels[key]).map(([key, value]) => `${labels[key]}：${values[String(value)] ?? String(value)}`);
    // VRoid Hub encodes additional terms in its license URL. Display only explicit fields.
    try {
      const url = new URL(conditions.otherLicenseUrl);
      if (url.hostname === "hub.vroid.com" && url.pathname === "/license") {
        const terms = { allowed_to_use_user: "可使用者", characterization_allowed_user: "角色扮演使用者",
          corporate_commercial_use: "企业商业使用", personal_commercial_use: "个人商业使用",
          credit: "署名要求", modification: "修改", redistribution: "再分发",
          sexual_expression: "色情内容", violent_expression: "暴力内容" };
        lines.push("", "VRoid Hub 模型数据使用条件：");
        for (const [key, label] of Object.entries(terms)) {
          if (url.searchParams.has(key)) {
            const value = url.searchParams.get(key);
            lines.push(`${label}：${values[value] ?? value}`);
          }
        }
      }
    } catch (_) { /* Missing/non-URL license metadata is not an error. */ }
    return lines.join("\n");
  }
  async function describe() {
    const response = await (root.authFetch || root.fetch)("/api/avatar", { cache: "no-store" });
    if (!response.ok) throw new Error("角色模型无法读取，请检查模型路径和允许目录。");
    return response.json();
  }
  function showMetadata(info) {
    const panel = root.document?.getElementById("avatar-model-info");
    if (!panel) return;
    panel.hidden = info.kind !== "vrm" && !info.metadata;
    if (panel.hidden) return;
    const meta = info.metadata || {};
    panel.querySelector("[data-avatar-name]").textContent = meta.name || "未提供名称";
    panel.querySelector("[data-avatar-authors]").textContent = (meta.authors || []).join("、") || "未提供作者";
    const sources = panel.querySelector("[data-avatar-sources]");
    sources.replaceChildren();
    for (const value of [meta.source, ...(meta.references || [])]) {
      try {
        const url = new URL(value);
        if (!["http:", "https:"].includes(url.protocol)) continue;
        const a = root.document.createElement("a");
        a.href = url.href; a.textContent = url.href; a.target = "_blank"; a.rel = "noopener noreferrer";
        sources.append(a, root.document.createElement("br"));
      } catch (_) { /* Metadata is untrusted display data. */ }
    }
    if (!sources.childNodes.length) sources.textContent = "模型未提供来源链接";
    panel.querySelector("[data-avatar-conditions]").textContent =
      (meta.readme ? `${meta.readme}\n\n` : "") +
      (formatConditions(meta.conditions) || "未提供使用条件，请向作者核实。");
    const links = panel.querySelector("[data-avatar-license-links]");
    links.replaceChildren();
    for (const value of [meta.conditions?.licenseUrl, meta.conditions?.otherLicenseUrl, meta.conditions?.otherPermissionUrl]) {
      try {
        const url = new URL(value);
        if (!["http:", "https:"].includes(url.protocol)) continue;
        const a = root.document.createElement("a");
        a.href = url.href; a.textContent = "查看作者提供的完整使用条件"; a.target = "_blank"; a.rel = "noopener noreferrer";
        links.append(a, root.document.createElement("br"));
      } catch (_) { /* Do not turn arbitrary metadata into active links. */ }
    }
  }
  function frameFromState(state, now, wallNow = Date.now(), prepareMs = 1100) {
    const remote = state.uiView === "model";
    const fresh = !remote || (now - Number(state._broadcastSpeechUpdatedAt || 0) < 900);
    let level = fresh ? clamp(state.ttsAudioLevel) : 0;
    const analysed = remote ? state.ttsAudioAnalysisAvailable === true
      : !!state.ttsAudioAnalyser || (state.ttsPcmAudioAnalyserActive === true && !!state.ttsPcmAudioAnalyser);
    // Browser speech synthesis exposes no spectrum. Use its existing portable
    // mouth envelope only for mapped Live2D and only without real audio analysis;
    // genuine analysed silence must remain closed. Hiyori/VRM stay unchanged.
    if (fresh && state.avatarMapping?.driver === "mapped" && !analysed) level = Math.max(level, clamp(state.speechMouthOpen));
    const age = wallNow - Number(state.conversationLastAssistantAt || 0);
    const preparingSpeech = age >= 0 && age < prepareMs;
    return { now, preparingSpeech, mode: level > 0.02 ? "speak" : "idle",
      face: state.speechEmotionPose?.emotion || state.speechAnimMood || "neutral", faceIntensity: 0.6,
      mouth: { open: level, vowel: fresh && level > 0.02 && ["a", "i", "u", "e", "o"].includes(state.ttsVowel) ? state.ttsVowel : null } };
  }
  function normalizeSource(source, config = {}) {
    if (source?.kind === "vrm") return source;
    const avatar = config.avatar?.kind === "live2d" ? config.avatar : {};
    return { ...source, kind: "live2d", path: source?.path || avatar.path || config.model_path || "",
      mapping: source?.mapping || avatar.mapping || "/avatar/mappings/hiyori.json" };
  }
  async function start({ state, canvas, source, setStatus, live2dLifecycle }) {
    source = normalizeSource(source, state.config);
    root.document.body.dataset.avatarReady = "false";
    if (state.avatarRuntime) state.avatarRuntime.dispose();
    else state.avatarRenderer?.dispose();
    const factory = source.kind === "vrm" ? root.XinyuVRMRenderer : (root.XinyuLive2DRenderer
      || (typeof require === "function" ? require("./live2dRenderer.js") : null));
    const renderer = factory.createRenderer({ canvas, view: state.uiView, state, lifecycle: live2dLifecycle, host: root });
    try {
      if (await renderer.load(source) === false) { renderer.dispose(); return null; }
    } catch (error) { renderer.dispose(); throw error; }
    state.avatarRenderer = renderer;
    root.__xinyuAvatarRenderer = renderer;
    showMetadata({ ...source, metadata: source.metadata || renderer.metadata });
    const paintedPanel = root.document.getElementById("painted-scene-options");
    if (paintedPanel) paintedPanel.hidden = source.scene !== "painted" || state.uiView !== "full";
    const paintedControls = ["reflection", "grid"].map(name => {
      const input = root.document.getElementById("painted-" + name);
      if (!input) return null;
      let value = source.painted?.[name] ?? (name === "reflection");
      try { const saved = root.localStorage?.getItem("xinyu.painted." + name); if (saved !== null && saved !== undefined) value = saved === "true"; } catch (_) { /* Storage can be unavailable. */ }
      input.checked = value; renderer.setPaintedOptions?.({ [name]: value });
      const change = () => { renderer.setPaintedOptions?.({ [name]: input.checked });
        try { root.localStorage?.setItem("xinyu.painted." + name, String(input.checked)); } catch (_) { /* Session-only setting. */ } };
      input.addEventListener("change", change); return () => input.removeEventListener("change", change);
    });
    root.document.body.dataset.avatarKind = source.kind;
    if (state.uiView === "model") {
      root.document.documentElement.classList.add("transparent-mode", "alpha-true");
      root.document.body.classList.add("transparent-mode", "alpha-true");
    }
    let disposed = false, gaze = null, intent = {}, cursorBusy = false;
    let lastClickthrough = null, prepareUntil = 0, lastReplyAt = Number(state.conversationLastAssistantAt || 0);
    const clickthrough = value => {
      if (value !== lastClickthrough) { root.electronAPI?.setClickthrough?.(value); lastClickthrough = value; }
    };
    let dragging = false, inputUntil = 0;
    const input = e => { if(e.target?.id === "chat-input" || e.target?.closest?.("#send-btn")) inputUntil=root.performance.now()+INPUT_HOLD_MS; };
    for(const name of ["input","keydown","click"]) root.addEventListener(name,input);
    const pointer = (event) => {
      const rect = canvas.getBoundingClientRect();
      gaze = { x: ((event.clientX - rect.left) / rect.width - 0.5) * 2,
        y: (0.5 - (event.clientY - rect.top) / rect.height) * 2 };
      if (state.uiView === "model") clickthrough(!dragging && !renderer.hitTest?.(event.clientX, event.clientY));
    };
    const down = (event) => {
      if (event.button === 0 && !state.windowLocked && renderer.hitTest?.(event.clientX, event.clientY)) {
        dragging = true; root.electronAPI?.beginWindowDrag?.();
      }
    };
    const up = () => { dragging = false; root.electronAPI?.endWindowDrag?.(); };
    const leave = () => { gaze = null; };
    const apply = (data) => {
      if (!data || typeof data !== "object") return;
      if (data.prepare) prepareUntil = root.performance.now() + (renderer.prepareMs ?? factory.EXPRESSION?.prepareMs ?? 0);
      if (data.stop) renderer.stopAction();
      if (typeof data.action === "string") renderer.playAction(data.action, { intensity: data.intensity });
      if (data.frame && typeof data.frame === "object") intent = { ...data.frame };
    };
    const event = (e) => apply(e.detail);
    const channel = typeof root.BroadcastChannel === "function" ? new root.BroadcastChannel("xinyu-avatar-intent") : null;
    if (channel) channel.onmessage = (e) => apply(e.data);
    root.addEventListener("avatar-intent", event);
    if (!renderer.ownsPointer) {
      root.addEventListener("pointermove", pointer);
      root.addEventListener("pointerleave", leave);
      canvas.addEventListener("pointerdown", down); root.addEventListener("pointerup", up);
    }
    // Reuse the detached-window cursor bridge; no camera or desktop capture.
    const cursorTimer = !renderer.ownsPointer && state.uiView === "model" ? root.setInterval(async () => {
      if (disposed || cursorBusy || state.rendererSurfaceActive === false || state.uiView !== "model") return;
      const api = root.electronAPI;
      if (!api?.getCursorScreenPoint || !api?.getModelWindowBounds) return;
      cursorBusy = true;
      try {
        const [cursor, bounds] = await Promise.all([api.getCursorScreenPoint(), api.getModelWindowBounds()]);
        if (!disposed && cursor && bounds) pointer({ clientX: cursor.x - bounds.x, clientY: cursor.y - bounds.y });
      } catch (_) { /* Window may be closing. */ } finally { cursorBusy = false; }
    }, 100) : null;
    const produceFrame = now => {
      const prepareMs = renderer.prepareMs ?? factory.EXPRESSION?.prepareMs ?? 0;
      const replyAt = Number(state.conversationLastAssistantAt || 0);
      if (state.uiView !== "model" && replyAt !== lastReplyAt) {
        lastReplyAt = replyAt;
        if (frameFromState(state, now, Date.now(), prepareMs).preparingSpeech) channel?.postMessage({ prepare: true });
      }
      const frame = { ...frameFromState(state, now, Date.now(), prepareMs), gaze, ...intent, now };
      frame.preparingSpeech ||= now < prepareUntil;
      frame.interaction = now < inputUntil || state.chatBusy === true || ["hearing","release"].includes(state.listeningPresencePhase) || frame.mouth?.open > .02;
      return frame;
    };
    const stopClock = renderer.startClock?.(now => {
      const frame = produceFrame(now);
      if (renderer.ownsPointer) renderer.update(frame, { derived: true, overrides: intent });
      return frame;
    }, { state });
    if (!stopClock) { renderer.dispose(); throw new Error("Avatar renderer clock missing"); }

    const dispose = () => {
      if (disposed) return;
      for (const name of ["input","keydown","click"]) root.removeEventListener(name,input);
      paintedControls.forEach(cleanup => cleanup?.());
      disposed = true; stopClock(); root.clearInterval?.(cursorTimer); channel?.close();
      root.removeEventListener?.("avatar-intent", event); root.removeEventListener?.("beforeunload", dispose);
      if (!renderer.ownsPointer) {
        root.removeEventListener?.("pointermove", pointer); root.removeEventListener?.("pointerleave", leave);
        canvas.removeEventListener("pointerdown", down); root.removeEventListener?.("pointerup", up); up();
      }
      renderer.dispose();
      if (state.avatarRenderer === renderer) {
        state.avatarRenderer = null;
        root.document.body.dataset.avatarReady = "false";
      }
      if (root.__xinyuAvatarRenderer === renderer) root.__xinyuAvatarRenderer = null;
    };
    root.addEventListener("beforeunload", dispose, { once: true });
    if (source.kind === "vrm") setStatus?.("VRM 模型已就绪");
    root.document.body.dataset.avatarReady = "true";
    state.avatarRuntime = { renderer, dispose };
    return state.avatarRuntime;
  }
  function installPanel() {
    const panel = root.document?.getElementById("avatar-model-info");
    if (!panel) return;
    describe().then(info => showMetadata({ ...info, metadata: info.metadata || root.__xinyuAvatarRenderer?.metadata })).catch(() => {});
    panel.querySelectorAll("[data-avatar-action]").forEach((button) => button.addEventListener("click", () => {
      const data = { action: button.dataset.avatarAction };
      root.dispatchEvent(new CustomEvent("avatar-intent", { detail: data }));
      if (typeof root.BroadcastChannel === "function") {
        const channel = new root.BroadcastChannel("xinyu-avatar-intent"); channel.postMessage(data); channel.close();
      }
    }));
  }
  const api = { describe, showMetadata, formatConditions, frameFromState, normalizeSource, start, createRuntime, installPanel };
  return api;
  }
  const api = createRuntime(root);
  root.XinyuAvatarRuntime = api;
  if (root.document) root.document.addEventListener("DOMContentLoaded", () => api.installPanel(), { once: true });
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
