(function (root) {
  "use strict";
  function install() {
    if (!root.TaffyGalgamePlayer || document.getElementById("galgame-mode")) return;
    const launcher = document.createElement("button");
    launcher.id = "galgame-open"; launcher.type = "button"; launcher.textContent = "Galgame";
    document.querySelector(".utility-actions")?.append(launcher);
    const host = document.createElement("section");
    host.id = "galgame-mode"; host.hidden = true;
    host.setAttribute("role", "dialog"); host.setAttribute("aria-modal", "true"); host.setAttribute("aria-label", "Galgame 对话");
    host.innerHTML = `<header class="galgame-top"><strong id="galgame-title">深蓝 · 对话</strong><label class="galgame-character-label">角色<select id="galgame-character" aria-label="选择 Galgame 角色"><option value="deepblue">深蓝</option><option value="gpt">GPT</option><option value="claude">Claude</option></select></label><label class="galgame-scene-label">场景<select id="galgame-scene" aria-label="选择 Galgame 场景"><option value="night-room-v2">夜间房间</option><option value="bedroom-morning">晨间卧室</option><option value="classroom-day">晴日教室</option><option value="school-rooftop-sunset">黄昏天台</option><option value="cafe-rain">雨夜咖啡馆</option><option value="bookstore">暮色书店</option><option value="park-spring">春日公园</option><option value="city-street-night">夜晚街道</option><option value="beach-dawn">黎明海边</option><option value="shrine-autumn">秋日神社</option><option value="library-evening">夜读图书馆</option></select></label><button id="galgame-auto-scene" type="button" aria-pressed="true">场景：自动</button><button id="galgame-voice" type="button">语音：开</button><button id="galgame-exit" type="button">返回舞台</button></header>
      <img id="galgame-sprite" src="./assets/galgame/neutral.png" alt="深蓝，日常表情">
      <div class="galgame-dialogue"><strong id="galgame-name" class="galgame-name">深蓝</strong><div class="galgame-line"><p id="galgame-text">今天想和我聊些什么？</p><button id="galgame-next" type="button" aria-label="停止当前语音并进入下一句" disabled>▶</button></div>
      <span id="galgame-status" role="status">输入消息，开始对话</span><form id="galgame-form"><input id="galgame-input" aria-label="输入消息" placeholder="输入你想说的话…" autocomplete="off"><button type="submit">发送</button></form></div>`;
    document.body.append(host);
    const el = (id) => document.getElementById(id);
    let enabled = false, muted = false, speech = null, externalStop = null, submission = 0, character = "deepblue";
    let inertNodes = [];
    let scene = "night-room-v2", sceneLocked = false, sceneRevision = 0, characterRevision = 0, switching = false;
    const scenes = new Set(["night-room-v2", "bedroom-morning", "classroom-day", "school-rooftop-sunset", "cafe-rain", "bookstore", "park-spring", "city-street-night", "beach-dawn", "shrine-autumn", "library-evening"]);
    function loadImage(src) {
      return new Promise((resolve, reject) => {
        const image = new Image();
        const timeout = setTimeout(() => { image.onload = image.onerror = null; reject(new Error("图片加载超时")); }, 8000);
        image.onload = () => { clearTimeout(timeout); resolve(src); };
        image.onerror = () => { clearTimeout(timeout); reject(new Error("图片无法加载")); };
        image.src = src;
      });
    }
    async function applyScene(next, manual = false) {
      if (!scenes.has(next) || (!manual && sceneLocked)) return false;
      const ticket = ++sceneRevision;
      const file = next === "night-room-v2" ? "./assets/stage-rooms/night-room-v2.webp" : `./assets/galgame-scenes/${next}.webp`;
      try { await loadImage(file); } catch (_) { return false; }
      if (!enabled || ticket !== sceneRevision || (!manual && sceneLocked)) return false;
      scene = next;
      host.style.backgroundImage = `url('${file}')`;
      el("galgame-scene").value = scene;
      return true;
    }
    const names = { neutral: "日常", happy: "开心", shy: "害羞", confused: "疑惑", annoyed: "小生气", sad: "难过", playful: "俏皮", thinking: "思考", surprised: "惊讶", embarrassed: "不好意思", determined: "坚定", sleepy: "困倦", greeting: "招呼", listening: "倾听", celebrate: "庆祝", "celebrate-bright": "欢呼" };
    const actionSprites = new Set(["playful", "thinking", "surprised", "embarrassed", "determined", "sleepy", "greeting", "listening", "celebrate", "celebrate-bright"]);
    const characterNames = { deepblue: "深蓝", gpt: "GPT", claude: "Claude" };
    function spriteSource(emotion, selected = character) {
      emotion = Object.hasOwn(names, emotion) ? emotion : "neutral";
      if (selected !== "deepblue") {
        const supported = new Set(["happy", "thinking"]);
        return supported.has(emotion)
          ? `./assets/galgame-characters/${selected}/${emotion}.png`
          : `./assets/galgame-characters/${selected}/${selected === "claude" ? "neutral-v3" : "neutral-v2"}.png`;
      }
      if (["neutral", "happy", "thinking", "shy", "surprised", "sad"].includes(emotion)) {
        return `./assets/galgame-deepblue-v2/${emotion}-v2.png`;
      }
      return actionSprites.has(emotion) ? `./assets/galgame-actions/${emotion}.png` : `./assets/galgame/${emotion}.png`;
    }
    const player = root.TaffyGalgamePlayer.createPlayer({
      stop: () => externalStop?.(),
      scene: next => { if (next) void applyScene(next); },
      speak: (text, options) => muted ? true : speech?.(text, options),
      reducedMotion: () => root.matchMedia?.("(prefers-reduced-motion: reduce)").matches,
      render: (frame) => {
        el("galgame-text").textContent = frame.visible;
        const sprite = el("galgame-sprite");
        const src = spriteSource(frame.sprite || frame.emotion);
        if (sprite.getAttribute("src") !== src) sprite.src = src;
        sprite.alt = `${characterNames[character]}，${names[frame.emotion] || names.neutral}表情`;
        el("galgame-next").disabled = !frame.active || !!frame.waiting;
        el("galgame-status").textContent = frame.waiting ? "正在等待下一句…" : frame.active
          ? `${frame.index + 1} / ${frame.total}${frame.streaming ? '+' : ''} · 点击 ▶ 或按空格继续${!frame.streaming && frame.index + 1 === frame.total ? '，结束本轮' : ''}`
          : "本轮结束，继续输入消息吧";
      },
      voiceUnavailable: () => { if (!muted) el("galgame-status").textContent = "本句语音未播放，可继续阅读并点击下一句"; }
    });
    function exit() {
      if (!enabled) return;
      submission++; sceneRevision++; characterRevision++; switching = false;
      root.TaffyGalgamePresentation?.cancelCharacterTransition?.();
      player.cancel();
      root.interruptActiveChatTurn?.("galgame_exit", { bypassProtection: true });
      speech = null;
      externalStop = null;
      enabled = false; host.hidden = true;
      el("galgame-character").value = character;
      document.body.classList.remove("galgame-active");
      inertNodes.forEach(([node, prior]) => { node.inert = prior; }); inertNodes = [];
      launcher.focus();
    }
    launcher.addEventListener("click", () => {
      if (enabled) return;
      const petState = root.__petState || {};
      const assistantSpeaking = petState.ttsContextSpeaking === true
        || petState.streamSpeakWorking === true
        || String(petState.speechPhase || "").toLowerCase() === "speaking";
      if (petState.chatBusy || assistantSpeaking) {
        launcher.title = assistantSpeaking ? "当前语音结束后即可进入" : "当前对话结束后即可进入";
        return;
      }
      enabled = true; host.hidden = false;
      muted = petState.speakingEnabled === false;
      el("galgame-voice").textContent = muted ? "语音：关" : "语音：开";
      document.body.classList.add("galgame-active");
      inertNodes = Array.from(document.body.children).filter(n => n !== host && !["SCRIPT", "TEMPLATE", "LINK"].includes(n.tagName)).map(n => [n, n.inert]);
      inertNodes.forEach(([node]) => { node.inert = true; });
      el("galgame-input").focus();
      if (!sceneLocked && ["night-room-v2", "bedroom-morning"].includes(scene)) void applyScene(new Date().getHours() >= 6 && new Date().getHours() < 18 ? "bedroom-morning" : "night-room-v2");
      el("galgame-sprite").src = spriteSource("neutral");
      [...new Set(root.TaffyGalgamePlayer.EMOTIONS.map(key => spriteSource(key)))].forEach(src => { const img = new Image(); img.src = src; });
    });
    el("galgame-exit").addEventListener("click", exit);
    el("galgame-character")?.addEventListener("change", async (event) => {
      const requested = String(event.target.value || "deepblue");
      if (!Object.hasOwn(characterNames, requested) || (requested === character && !switching)) return;
      const ticket = ++characterRevision;
      submission++; sceneRevision++;
      player.cancel();
      root.interruptActiveChatTurn?.("galgame_character_change", { bypassProtection: true });
      speech = null; externalStop = null; switching = true;
      el("galgame-next").disabled = true;
      const commit = () => {
        if (!enabled || ticket !== characterRevision) return;
        character = requested;
        el("galgame-text").textContent = "今天想和我聊些什么？";
        el("galgame-status").textContent = "角色已切换，输入消息开始对话";
        el("galgame-title").textContent = `${characterNames[character]} · 对话`;
        el("galgame-sprite").src = spriteSource("neutral");
        el("galgame-sprite").alt = `${characterNames[character]}，日常表情`;
        el("galgame-name").textContent = characterNames[character];
      };
      try {
        const transition = root.TaffyGalgamePresentation?.transitionCharacter;
        if (transition) {
          const ok = await transition({load: () => loadImage(spriteSource("neutral", requested)), commit});
          if (!ok && enabled && ticket === characterRevision) {
            el("galgame-character").value = character;
            el("galgame-status").textContent = "角色图片加载失败，请重试";
          }
        } else commit();
      } finally { if (ticket === characterRevision) switching = false; }
    });
    el("galgame-scene")?.addEventListener("change", (event) => {
      const next = String(event.target.value || "");
      if (!scenes.has(next)) return;
      sceneLocked = true;
      el("galgame-auto-scene").textContent = "场景：固定";
      el("galgame-auto-scene").setAttribute("aria-pressed", "false");
      void applyScene(next, true).then(ok => { if (!ok && enabled) el("galgame-scene").value = scene; });
    });
    el("galgame-auto-scene")?.addEventListener("click", () => {
      sceneLocked = !sceneLocked; sceneRevision++;
      el("galgame-auto-scene").textContent = sceneLocked ? "场景：固定" : "场景：自动";
      el("galgame-auto-scene").setAttribute("aria-pressed", String(!sceneLocked));
    });
    el("galgame-next").addEventListener("click", player.next);
    el("galgame-voice").addEventListener("click", () => {
      muted = !muted; if (muted) player.stopVoice();
      el("galgame-voice").textContent = muted ? "语音：关" : "语音：开";
    });
    let composing = false;
    el("galgame-input").addEventListener("compositionstart", () => { composing = true; });
    el("galgame-input").addEventListener("compositionend", () => { composing = false; });
    el("galgame-input").addEventListener("keydown", event => {
      if (event.key === "Enter" && (composing || event.isComposing || event.keyCode === 229 || event.repeat)) event.preventDefault();
    });
    el("galgame-form").addEventListener("submit", async (event) => {
      event.preventDefault();
      const input = el("galgame-input"), text = input.value.trim();
      if (composing || switching || !text || !root.requestAssistantReply) return;
      const ticket = ++submission;
      sceneRevision++;
      player.cancel();
      input.value = "";
      el("galgame-text").textContent = "……";
      el("galgame-status").textContent = "正在思考…";
      el("galgame-next").disabled = true;
      try {
        const ok = await root.requestAssistantReply(text, { showUser: true, rememberUser: true, auto: false, interruptActive: true });
        if (enabled && ticket === submission && ok === false && !player.isPlaying()) el("galgame-status").textContent = "本次未收到回复，请稍后重试";
        else if (enabled && ticket === submission && !player.isPlaying() && el("galgame-text").textContent === "……") el("galgame-status").textContent = "对方暂时没有回应，你可以继续输入";
      } catch (_) { if (enabled && ticket === submission) el("galgame-status").textContent = "对话暂时无法连接，请返回舞台检查服务"; }
    });
    host.addEventListener("keydown", (event) => {
      if (event.isComposing || event.keyCode === 229) return;
      if (event.key === "Escape") { event.preventDefault(); exit(); }
      if (event.key === " " && event.target === host) { event.preventDefault(); if (!event.repeat) player.next(); }
      if (event.key === "Tab") {
        const nodes = Array.from(host.querySelectorAll("button:not(:disabled),input,select"));
        if (event.shiftKey && event.target === nodes[0]) { event.preventDefault(); nodes.at(-1).focus(); }
        else if (!event.shiftKey && event.target === nodes.at(-1)) { event.preventDefault(); nodes[0].focus(); }
      }
    });
    el("galgame-text").addEventListener("click", () => host.focus());
    host.tabIndex = -1;
    root.TaffyGalgame = {
      isActive: () => enabled,
      getContext: () => enabled ? { enabled: true, character, scene, scene_locked: sceneLocked, local_hour: new Date().getHours() } : null,
      beginStream: (options = {}) => {
        if (!enabled || switching || options.signal?.aborted) return null;
        speech = (part, o) => muted ? true : options.speak?.(part, { ...o, force: !muted });
        externalStop = typeof options.stop === "function" ? options.stop : null;
        return player.beginStream(options);
      },
      playReply: (text, options = {}) => {
        // A reply can resolve after the user has exited or sent a newer message.
        // Ignore it instead of reviving hidden speech with an old callback.
        if (!enabled || switching || options.signal?.aborted) return Promise.resolve(false);
        speech = (part, o) => muted ? true : options.speak?.(part, { ...o, force: !muted });
        externalStop = typeof options.stop === "function" ? options.stop : null;
        return player.play(text, options);
      },
      exit
    };
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", install, { once: true });
  else install();
})(window);
