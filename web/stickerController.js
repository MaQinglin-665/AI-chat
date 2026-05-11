(function (root) {
  "use strict";

  function call(fn, ...args) {
    return typeof fn === "function" ? fn(...args) : undefined;
  }

  function getModel(deps = {}) {
    return deps.model || root.TaffyStickerModel || {};
  }

  function getStore(deps = {}) {
    return deps.store || root.TaffyStickerStore || {};
  }

  function setHidden(el, hidden) {
    if (el) {
      el.hidden = !!hidden;
    }
  }

  function createController(deps = {}) {
    const state = deps.state || {};
    const ui = deps.ui || {};
    const documentObject = deps.documentObject || root.document;
    const windowObject = deps.windowObject || root;
    const model = getModel(deps);
    const store = getStore(deps);
    const fetchObject = deps.fetchObject || root.fetch;

    function getDefaultStickerList() {
      const loaded = Array.isArray(state.defaultStickers) ? state.defaultStickers : [];
      if (loaded.length) {
        return loaded;
      }
      return typeof model.getDefaultStickers === "function" ? model.getDefaultStickers() : [];
    }

    function getAllStickers() {
      return []
        .concat(getDefaultStickerList())
        .concat(Array.isArray(state.userStickers) ? state.userStickers : []);
    }

    function resolveStickerPayload(sticker = {}) {
      const ref = typeof model.resolveStickerMessageRef === "function"
        ? model.resolveStickerMessageRef(sticker)
        : {
          id: String(sticker.id || ""),
          source: sticker.source === "user" ? "user" : "default",
          label: String(sticker.label || sticker.name || "\u8868\u60c5\u5305")
        };
      const found = getAllStickers().find((item) => (
        String(item?.id || "") === String(ref.id || "")
        && String(item?.source || "default") === String(ref.source || "default")
      ));
      return found ? { ...ref, ...found, url: found.url || found.dataUrl || ref.url || "" } : { ...ref, url: sticker.url || sticker.dataUrl || "" };
    }

    function setStickerPanelOpen(open) {
      state.stickerPanelOpen = !!open;
      setHidden(ui.stickerPanel, !state.stickerPanelOpen);
      if (ui.stickerBtn) {
        ui.stickerBtn.setAttribute("aria-expanded", state.stickerPanelOpen ? "true" : "false");
      }
      if (state.stickerPanelOpen) {
        renderStickerPanel();
      }
    }

    function toggleStickerPanel() {
      setStickerPanelOpen(!state.stickerPanelOpen);
    }

    function closeStickerPanel() {
      setStickerPanelOpen(false);
    }

    function setStickerRespondAfterSend(value) {
      state.stickerRespondAfterSend = value === true;
      if (ui.stickerRespondToggle) {
        ui.stickerRespondToggle.checked = state.stickerRespondAfterSend === true;
      }
    }

    function formatAssistantStickerDebug(debug = {}) {
      const status = String(debug.status || "idle");
      const reason = String(debug.reason || "");
      if (status === "sent") {
        return `最近：已发送 ${debug.label || debug.stickerId || ""}`.trim();
      }
      if (status === "skipped") {
        const labels = {
          disabled: "已关闭",
          auto_turn: "自动对话跳过",
          cooldown: "冷却中",
          chance: "本次未触发",
          diagnostic_or_error: "诊断/错误场景跳过",
          no_sticker: "无可用表情"
        };
        return `最近：${labels[reason] || reason || "已跳过"}`;
      }
      return "最近：待机";
    }

    function updateAssistantStickerControls() {
      if (ui.assistantStickerToggle) {
        ui.assistantStickerToggle.checked = state.assistantStickerEnabled !== false;
      }
      if (ui.assistantStickerDebug) {
        ui.assistantStickerDebug.textContent = formatAssistantStickerDebug(state.assistantStickerLastDebug || {});
      }
    }

    function setAssistantStickerEnabled(value) {
      state.assistantStickerEnabled = value === true;
      updateAssistantStickerControls();
      call(deps.saveAssistantStickerSettings, {
        assistant_enabled: state.assistantStickerEnabled,
        assistant_chance: state.assistantStickerChance,
        assistant_cooldown_ms: state.assistantStickerCooldownMs
      });
    }

    async function loadDefaultStickers() {
      state.defaultStickers = typeof model.getDefaultStickers === "function" ? model.getDefaultStickers() : [];
      if (typeof fetchObject !== "function" || typeof model.normalizeDefaultManifest !== "function") {
        return state.defaultStickers;
      }
      try {
        const resp = await fetchObject(model.DEFAULT_STICKER_MANIFEST_URL || "./assets/stickers/default/manifest.json", {
          cache: "no-store"
        });
        if (!resp || !resp.ok || typeof resp.json !== "function") {
          return state.defaultStickers;
        }
        const loaded = model.normalizeDefaultManifest(await resp.json());
        if (loaded.length) {
          state.defaultStickers = loaded;
        }
      } catch (_) {
        // Keep bundled fallback metadata when manifest fetch is unavailable.
      }
      return state.defaultStickers;
    }

    async function loadUserStickers() {
      if (typeof store.loadUserStickers !== "function") {
        state.userStickers = [];
        return [];
      }
      try {
        const loaded = await store.loadUserStickers({ windowObject });
        state.userStickers = (Array.isArray(loaded) ? loaded : [])
          .map((item) => (typeof model.normalizeUserSticker === "function" ? model.normalizeUserSticker(item) : item))
          .filter(Boolean);
      } catch (_) {
        state.userStickers = [];
      }
      return state.userStickers;
    }

    async function initStickerPanel() {
      if (state.stickersInitialized) {
        renderStickerPanel();
        return;
      }
      state.stickersInitialized = true;
      setStickerRespondAfterSend(state.stickerRespondAfterSend === true);
      await loadDefaultStickers();
      await loadUserStickers();
      renderStickerPanel();
      call(deps.renderChatHistoryFromState);
    }

    function clearGrid(grid) {
      if (grid) {
        grid.innerHTML = "";
      }
    }

    function createStickerButton(sticker, source) {
      const item = documentObject.createElement("button");
      item.type = "button";
      item.className = `sticker-item sticker-item-${source}`;
      item.title = sticker.label || sticker.name || "\u8868\u60c5\u5305";

      const img = documentObject.createElement("img");
      img.className = "sticker-item-img";
      img.alt = sticker.label || sticker.name || "\u8868\u60c5\u5305";
      img.loading = "lazy";
      img.src = sticker.url || sticker.dataUrl || "";
      item.appendChild(img);

      const label = documentObject.createElement("span");
      label.className = "sticker-item-label";
      label.textContent = sticker.label || sticker.name || "\u8868\u60c5\u5305";
      item.appendChild(label);

      item.addEventListener("click", () => {
        sendSticker(sticker);
      });
      return item;
    }

    function renderGrid(grid, stickers, source) {
      clearGrid(grid);
      if (!grid) {
        return;
      }
      for (const sticker of stickers) {
        const wrap = documentObject.createElement("div");
        wrap.className = "sticker-cell";
        wrap.appendChild(createStickerButton(sticker, source));
        if (source === "user") {
          const del = documentObject.createElement("button");
          del.type = "button";
          del.className = "sticker-delete-btn";
          del.title = "\u5220\u9664\u8868\u60c5\u5305";
          del.textContent = "\u00d7";
          del.addEventListener("click", (event) => {
            if (event && typeof event.stopPropagation === "function") {
              event.stopPropagation();
            }
            deleteUserSticker(sticker.id);
          });
          wrap.appendChild(del);
        }
        grid.appendChild(wrap);
      }
    }

    function renderStickerPanel() {
      renderGrid(ui.stickerDefaultGrid, Array.isArray(state.defaultStickers) ? state.defaultStickers : [], "default");
      const userItems = Array.isArray(state.userStickers) ? state.userStickers : [];
      renderGrid(ui.stickerUserGrid, userItems, "user");
      setHidden(ui.stickerUserEmpty, userItems.length > 0);
      if (ui.stickerRespondToggle) {
        ui.stickerRespondToggle.checked = state.stickerRespondAfterSend === true;
      }
      updateAssistantStickerControls();
    }

    async function handleStickerImportFiles(fileList) {
      const files = Array.from(fileList || []);
      if (!files.length || state.stickerImportBusy) {
        return [];
      }
      const maxUserStickers = Math.max(1, Number(state.maxUserStickers) || model.DEFAULT_MAX_USER_STICKERS || 80);
      const existing = Array.isArray(state.userStickers) ? state.userStickers.slice() : [];
      const room = Math.max(0, maxUserStickers - existing.length);
      if (!room) {
        call(deps.setStatus, `\u6700\u591a\u53ef\u6536\u85cf ${maxUserStickers} \u4e2a\u8868\u60c5\u5305`);
        return [];
      }
      state.stickerImportBusy = true;
      const added = [];
      try {
        for (const file of files.slice(0, room)) {
          const valid = typeof model.validateStickerFile === "function"
            ? model.validateStickerFile(file, { maxBytes: model.DEFAULT_MAX_STICKER_BYTES })
            : { ok: true };
          if (!valid.ok) {
            call(deps.setStatus, valid.message || "\u8868\u60c5\u5305\u6587\u4ef6\u4e0d\u53ef\u7528");
            continue;
          }
          try {
            const dataUrl = await model.readFileAsDataUrl(file, windowObject.FileReader);
            const item = model.normalizeUserSticker({
              name: file.name,
              label: String(file.name || "").replace(/\.[^.]+$/, "") || "\u6211\u7684\u8868\u60c5\u5305",
              type: file.type || "image/png",
              size: file.size,
              dataUrl
            });
            if (!item) {
              call(deps.setStatus, `\u8868\u60c5\u5305\u8bfb\u53d6\u5931\u8d25: ${file.name || ""}`);
              continue;
            }
            if (typeof store.saveUserSticker === "function") {
              await store.saveUserSticker(item, { windowObject });
            }
            added.push(item);
          } catch (_) {
            call(deps.setStatus, `\u8868\u60c5\u5305\u8bfb\u53d6\u5931\u8d25: ${file.name || ""}`);
          }
        }
        if (added.length) {
          state.userStickers = existing.concat(added).slice(0, maxUserStickers);
          renderStickerPanel();
          call(deps.setStatus, `\u5df2\u6dfb\u52a0 ${added.length} \u4e2a\u8868\u60c5\u5305`);
        }
        return added;
      } finally {
        state.stickerImportBusy = false;
      }
    }

    async function deleteUserSticker(id) {
      const target = String(id || "").trim();
      if (!target) {
        return false;
      }
      if (typeof store.deleteUserSticker === "function") {
        try {
          await store.deleteUserSticker(target, { windowObject });
        } catch (_) {
          // The in-memory UI still removes the item even if persistence cleanup fails.
        }
      }
      state.userStickers = (Array.isArray(state.userStickers) ? state.userStickers : [])
        .filter((item) => String(item?.id || "") !== target);
      renderStickerPanel();
      call(deps.setStatus, "\u5df2\u5220\u9664\u8868\u60c5\u5305");
      return true;
    }

    async function sendSticker(stickerInput) {
      const sticker = resolveStickerPayload(stickerInput);
      if (!sticker || !sticker.id) {
        return false;
      }
      const timestamp = Date.now();
      state.lastUserMessageAt = timestamp;
      state.conversationLastUserAt = timestamp;
      call(deps.appendStickerMessage, "user", sticker, { timestamp, persist: true });
      closeStickerPanel();
      if (state.stickerRespondAfterSend !== true) {
        call(deps.setStatus, "\u8868\u60c5\u5305\u5df2\u53d1\u9001");
        return true;
      }
      if (state.chatBusy) {
        call(deps.setStatus, "AI \u6b63\u5728\u56de\u590d\uff0c\u8fd9\u5f20\u8868\u60c5\u5305\u5148\u53d1\u51fa\u5566");
        return true;
      }
      const prompt = typeof model.buildStickerPrompt === "function"
        ? model.buildStickerPrompt(sticker)
        : "\u6211\u53d1\u9001\u4e86\u4e00\u4e2a\u8868\u60c5\u5305\u3002";
      return await call(deps.requestAssistantReply, prompt, {
        showUser: false,
        rememberUser: true,
        auto: false,
        silentError: false,
        rememberContent: prompt
      });
    }

    function maybeSendAssistantMoodSticker(input = {}) {
      const stickers = Array.isArray(state.defaultStickers) && state.defaultStickers.length
        ? state.defaultStickers
        : (typeof model.getDefaultStickers === "function" ? model.getDefaultStickers() : []);
      const now = Date.now();
      const decision = typeof model.getAssistantStickerDecision === "function"
        ? model.getAssistantStickerDecision({
          enabled: state.assistantStickerEnabled !== false,
          auto: input.auto === true,
          now,
          lastAt: state.assistantStickerLastAt,
          cooldownMs: state.assistantStickerCooldownMs,
          chance: state.assistantStickerChance,
          mood: input.mood || "idle",
          text: input.text || "",
          characterBrain: input.characterBrain,
          intent: input.intent
        })
        : { ok: false, reason: "unsupported" };
      if (decision.ok !== true) {
        state.assistantStickerLastDebug = {
          status: "skipped",
          reason: decision.reason || "skipped",
          remainingMs: decision.remainingMs || 0,
          at: now
        };
        updateAssistantStickerControls();
        return null;
      }
      const sticker = typeof model.pickStickerByMood === "function"
        ? model.pickStickerByMood(stickers, input.mood || "idle", input.text || "")
        : stickers[0];
      if (!sticker) {
        state.assistantStickerLastDebug = { status: "skipped", reason: "no_sticker", at: now };
        updateAssistantStickerControls();
        return null;
      }
      state.assistantStickerLastAt = now;
      state.assistantStickerLastDebug = {
        status: "sent",
        reason: "ok",
        stickerId: sticker.id,
        label: sticker.label || sticker.name || "",
        at: now
      };
      call(deps.appendStickerMessage, "assistant", sticker, {
        timestamp: now,
        persist: true,
        enableFeedback: false
      });
      updateAssistantStickerControls();
      return sticker;
    }

    return {
      closeStickerPanel,
      deleteUserSticker,
      getAllStickers,
      handleStickerImportFiles,
      initStickerPanel,
      loadDefaultStickers,
      loadUserStickers,
      maybeSendAssistantMoodSticker,
      renderStickerPanel,
      resolveStickerPayload,
      sendSticker,
      setAssistantStickerEnabled,
      setStickerPanelOpen,
      setStickerRespondAfterSend,
      toggleStickerPanel
    };
  }

  const api = { createController };
  root.TaffyStickerController = api;

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof window !== "undefined" ? window : globalThis);
