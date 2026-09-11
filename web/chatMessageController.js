(function (root) {
  "use strict";

  function createController(deps = {}) {
    const state = deps.state || {};
    const ui = deps.ui || {};
    const documentObject = deps.documentObject || root.document;
    const maxChatHistoryRecords = Math.max(1, Number(deps.maxChatHistoryRecords) || 240);
    let chatTranslationSeq = 0;

    function parseMessageTimestamp(value) {
      const num = Number(value);
      if (Number.isFinite(num) && num > 0) {
        return Math.round(num);
      }
      return Date.now();
    }

    function formatMessageTime(value) {
      const ts = parseMessageTimestamp(value);
      try {
        return new Intl.DateTimeFormat("zh-CN", {
          hour: "2-digit",
          minute: "2-digit"
        }).format(new Date(ts));
      } catch (_) {
        const d = new Date(ts);
        const hh = String(d.getHours()).padStart(2, "0");
        const mm = String(d.getMinutes()).padStart(2, "0");
        return `${hh}:${mm}`;
      }
    }

    function formatMessageDivider(value) {
      const ts = parseMessageTimestamp(value);
      const d = new Date(ts);
      const now = new Date();
      const sameYear = d.getFullYear() === now.getFullYear();
      const sameDay =
        d.getFullYear() === now.getFullYear()
        && d.getMonth() === now.getMonth()
        && d.getDate() === now.getDate();
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      const time = formatMessageTime(ts);
      if (sameDay) {
        return `\u4eca\u5929 ${time}`;
      }
      return sameYear ? `${month}-${day} ${time}` : `${d.getFullYear()}-${month}-${day} ${time}`;
    }

    function shouldInsertTimeDivider(previousTs, currentTs) {
      if (!previousTs) {
        return true;
      }
      const prev = new Date(parseMessageTimestamp(previousTs));
      const cur = new Date(parseMessageTimestamp(currentTs));
      const changedDay =
        prev.getFullYear() !== cur.getFullYear()
        || prev.getMonth() !== cur.getMonth()
        || prev.getDate() !== cur.getDate();
      if (changedDay) {
        return true;
      }
      return Math.abs(parseMessageTimestamp(currentTs) - parseMessageTimestamp(previousTs)) >= 5 * 60 * 1000;
    }

    function createTimeDivider(timestamp) {
      const divider = documentObject.createElement("div");
      divider.className = "message-divider";
      divider.textContent = formatMessageDivider(timestamp);
      divider.dataset.timestamp = String(parseMessageTimestamp(timestamp));
      return divider;
    }

    function shouldUseSeparateMessageLanes() {
      const bodyClassList = documentObject?.body?.classList;
      const isFullStage = bodyClassList && typeof bodyClassList.contains === "function"
        ? bodyClassList.contains("view-full")
        : true;
      return Boolean(isFullStage && ui.userChatLog && ui.assistantChatLog);
    }

    function getMessageLane(role) {
      if (shouldUseSeparateMessageLanes() && role === "user") {
        return ui.userChatLog;
      }
      if (shouldUseSeparateMessageLanes() && role !== "user") {
        return ui.assistantChatLog;
      }
      return ui.chatLog || null;
    }

    function getMessageLaneForRow(row, fallbackRole = "assistant") {
      const role = row?.classList?.contains?.("user") ? "user" : fallbackRole;
      return getMessageLane(role);
    }

    function scrollMessageLane(role) {
      const lane = getMessageLane(role);
      if (lane) {
        lane.scrollTop = lane.scrollHeight;
      }
    }

    function notifyConversationLaneMessage(row, role, text) {
      const content = String(text || "").trim();
      if (
        !row
        || !content
        || row.dataset?.messageCategory === "system"
        || row.dataset?.conversationLaneNotified === "1"
      ) {
        return false;
      }
      if (row.dataset) {
        row.dataset.conversationLaneNotified = "1";
      }
      if (typeof deps.onConversationLaneMessage === "function") {
        deps.onConversationLaneMessage(role === "user" ? "user" : "assistant");
      }
      return true;
    }

    function findPreviousRoleRecord(role) {
      const records = Array.isArray(state.chatRecords) ? state.chatRecords : [];
      for (let index = records.length - 1; index >= 0; index -= 1) {
        if (records[index]?.role === role) {
          return records[index];
        }
      }
      return null;
    }

    function appendTimeDivider(role, timestamp) {
      const lane = getMessageLane(role);
      if (lane) {
        lane.appendChild(createTimeDivider(timestamp));
      }
    }

    function trimChatRecords(records) {
      const list = Array.isArray(records) ? records : [];
      if (list.length <= maxChatHistoryRecords) {
        return list;
      }
      return list.slice(list.length - maxChatHistoryRecords);
    }

    function syncConversationHistoryFromChatRecords() {
      const records = Array.isArray(state.chatRecords) ? state.chatRecords : [];
      const convo = records
        .filter((item) => item && item.kind !== "sticker" && (item.role === "user" || item.role === "assistant"))
        .map((item) => ({
          role: item.role,
          content: String(item.content || "").trim()
        }))
        .filter((item) => item.content);
      const limit = Math.max(12, Number(state.historyMaxMessages) || 64);
      state.history = convo.slice(Math.max(0, convo.length - limit));
    }

    function normalizeStickerPayload(item) {
      const src = item && typeof item === "object" ? item : {};
      const sticker = src.sticker && typeof src.sticker === "object" ? src.sticker : src;
      const id = String(sticker.id || sticker.stickerId || src.stickerId || "").trim();
      const source = sticker.source === "user" || src.stickerSource === "user" ? "user" : "default";
      const label = String(sticker.label || sticker.name || src.stickerLabel || src.content || "\u8868\u60c5\u5305").trim().slice(0, 80);
      return {
        id,
        source,
        label: label || "\u8868\u60c5\u5305",
        name: String(sticker.name || label || "\u8868\u60c5\u5305").trim().slice(0, 120),
        mood: String(sticker.mood || src.stickerMood || "idle").trim().slice(0, 32),
        url: String(sticker.url || sticker.dataUrl || src.url || "").trim()
      };
    }

    function normalizeStoredTranslation(value) {
      return String(value || "").trim().slice(0, 1600);
    }

    function normalizeInlineStickers(value) {
      if (!Array.isArray(value)) {
        return [];
      }
      return value
        .map(normalizeStickerPayload)
        .filter((sticker) => sticker.id || sticker.url)
        .slice(-6);
    }

    function normalizeChatRecord(item) {
      if (!item || typeof item !== "object") {
        return null;
      }
      const role = item.role === "user" ? "user" : "assistant";
      if (item.kind === "sticker") {
        const sticker = normalizeStickerPayload(item);
        if (!sticker.id && !sticker.url) {
          return null;
        }
        const content = String(item.content || `[\u8868\u60c5\u5305: ${sticker.label}]`).trim();
        return {
          role,
          kind: "sticker",
          content,
          sticker,
          timestamp: parseMessageTimestamp(item.timestamp || item.created_at || item.time)
        };
      }
      const content = String(item.content || "").trim();
      if (!content) {
        return null;
      }
      const record = {
        role,
        content,
        timestamp: parseMessageTimestamp(item.timestamp || item.created_at || item.time)
      };
      const translation = normalizeStoredTranslation(item.translation);
      const stickers = normalizeInlineStickers(item.stickers);
      if (translation && translation !== content) {
        record.translation = translation;
      }
      if (stickers.length) {
        record.stickers = stickers;
      }
      return record;
    }

    function coalesceInlineStickerRecords(records) {
      const output = [];
      for (const item of Array.isArray(records) ? records : []) {
        if (item?.kind !== "sticker") {
          output.push(item);
          continue;
        }
        const target = [...output].reverse().find((candidate) => (
          candidate
          && candidate.kind !== "sticker"
          && candidate.role === item.role
          && String(candidate.content || "").trim()
        ));
        if (!target) {
          output.push(item);
          continue;
        }
        target.stickers = normalizeInlineStickers([
          ...(Array.isArray(target.stickers) ? target.stickers : []),
          item.sticker
        ]);
      }
      return output;
    }

    function _ensureMessageTranslationEl(row) {
      if (!row) {
        return null;
      }
      let el = row.querySelector(".content-translation");
      if (el) {
        return el;
      }
      el = documentObject.createElement("span");
      el.className = "content-translation";
      el.hidden = true;
      const timeEl = row.querySelector(".message-time");
      if (timeEl && timeEl.parentNode === row) {
        row.insertBefore(el, timeEl);
      } else {
        row.appendChild(el);
      }
      return el;
    }

    function _clearMessageTranslation(row) {
      const el = row?.querySelector(".content-translation");
      if (!el) {
        return;
      }
      el.textContent = "";
      el.hidden = true;
    }

    function _persistMessageTranslation(row, sourceText, translatedText) {
      const source = String(sourceText || "").trim();
      const translated = normalizeStoredTranslation(translatedText);
      if (!row || !source || !translated || translated === source) {
        return;
      }
      row.dataset.persistedTranslation = translated;
      const timestamp = parseMessageTimestamp(row.dataset.timestamp);
      const role = row.classList.contains("user") ? "user" : "assistant";
      const record = [...(Array.isArray(state.chatRecords) ? state.chatRecords : [])]
        .reverse()
        .find((item) => (
          item
          && item.kind !== "sticker"
          && item.role === role
          && String(item.content || "").trim() === source
          && parseMessageTimestamp(item.timestamp) === timestamp
        ));
      if (!record || record.translation === translated) {
        return;
      }
      record.translation = translated;
      if (typeof deps.saveChatHistory === "function") {
        deps.saveChatHistory();
      }
    }

    function _renderAssistantTranslation(row, visibleText, options = {}) {
      if (!row || !row.classList.contains("assistant")) {
        return;
      }
      if (options.enableTranslation === false) {
        _clearMessageTranslation(row);
        return;
      }
      const safe = String(visibleText || "").trim();
      const shouldShow = typeof deps.shouldShowAssistantTranslation === "function"
        ? deps.shouldShowAssistantTranslation(safe)
        : false;
      if (!shouldShow) {
        _clearMessageTranslation(row);
        return;
      }
      const translationEl = _ensureMessageTranslationEl(row);
      if (!translationEl) {
        return;
      }
      const stored = normalizeStoredTranslation(options.storedTranslation);
      if (stored && stored !== safe) {
        translationEl.textContent = `\u4e2d\u8bd1\uff1a${stored}`;
        translationEl.hidden = false;
        _persistMessageTranslation(row, safe, stored);
        return;
      }
      const cached = typeof deps.readChatTranslationCache === "function"
        ? deps.readChatTranslationCache(safe)
        : "";
      if (cached && cached !== safe) {
        translationEl.textContent = `\u4e2d\u8bd1\uff1a${cached}`;
        translationEl.hidden = false;
        _persistMessageTranslation(row, safe, cached);
        return;
      }
      const requestId = String(++chatTranslationSeq);
      row.dataset.translationReqId = requestId;
      row.dataset.translationSource = safe;
      translationEl.textContent = "\u4e2d\u8bd1\uff1a\u7ffb\u8bd1\u4e2d...";
      translationEl.hidden = false;
      const fetchChatTranslation = typeof deps.fetchChatTranslation === "function"
        ? deps.fetchChatTranslation
        : async () => "";
      fetchChatTranslation(safe).then((zh) => {
        if (row.isConnected === false || row.dataset.translationReqId !== requestId) {
          return;
        }
        const translated = String(zh || "").trim();
        if (!translated || translated === safe) {
          translationEl.textContent = "\u4e2d\u8bd1\uff1a\u7ffb\u8bd1\u6682\u65f6\u4e0d\u53ef\u7528";
          translationEl.hidden = false;
          return;
        }
        translationEl.textContent = `\u4e2d\u8bd1\uff1a${translated}`;
        translationEl.hidden = false;
        _persistMessageTranslation(row, safe, translated);
      });
    }

    function appendInlineSticker(target, stickerInput) {
      if (!target) {
        return null;
      }
      const sticker = resolveStickerPayload(stickerInput);
      let group = target.querySelector?.(".inline-sticker-group");
      if (!group) {
        group = documentObject.createElement("span");
        group.className = "inline-sticker-group";
        group.setAttribute("aria-label", "\u968f\u6587\u8868\u60c5");
        target.appendChild(group);
      }
      const url = String(sticker.url || sticker.dataUrl || "").trim();
      if (url) {
        const img = documentObject.createElement("img");
        img.className = "inline-sticker-img";
        img.alt = sticker.label || sticker.name || "\u8868\u60c5\u5305";
        img.src = url;
        group.appendChild(img);
        return img;
      }
      const missing = documentObject.createElement("span");
      missing.className = "inline-sticker-missing";
      missing.textContent = sticker.label ? `[\u8868\u60c5: ${sticker.label}]` : "\u8868\u60c5";
      group.appendChild(missing);
      return missing;
    }

    function applyMessagePayload(row, text, options = {}) {
      const target = row?.querySelector(".content");
      if (!target) {
        return;
      }
      const payload = typeof deps.parseToolMetaFromText === "function"
        ? deps.parseToolMetaFromText(text)
        : { visibleText: String(text || ""), meta: null };
      const visibleText = String(payload.visibleText || "");
      const currentText = String(target.dataset.messageText || target.textContent || "");
      const canAppendStream = (
        options.streamAppend === true
        && row.classList.contains("assistant")
        && visibleText.startsWith(currentText)
        && visibleText.length > currentText.length
        && typeof documentObject.createElement === "function"
        && typeof documentObject.createTextNode === "function"
        && typeof target.appendChild === "function"
      );
      if (canAppendStream) {
        const delta = visibleText.slice(currentText.length);
        let animatedIndex = 0;
        for (const character of Array.from(delta)) {
          if (/\s/.test(character)) {
            target.appendChild(documentObject.createTextNode(character));
            continue;
          }
          const token = documentObject.createElement("span");
          token.className = "stream-text-arrival";
          token.textContent = character;
          token.style.animationDelay = `${Math.min(6000, animatedIndex * 55)}ms`;
          token.addEventListener?.("animationend", () => {
            token.classList.add("is-settled");
          }, { once: true });
          target.appendChild(token);
          animatedIndex += 1;
        }
        row.classList.add("is-streaming");
      } else {
        target.textContent = visibleText;
        if (options.streamAppend !== true) {
          row.classList.remove("is-streaming");
        }
      }
      target.dataset.messageText = visibleText;
      if (options.streamAppend !== true) {
        for (const sticker of normalizeInlineStickers(options.stickers)) {
          appendInlineSticker(target, sticker);
        }
      }
      if (row.classList.contains("assistant")) {
        if (typeof deps.renderToolMetaCards === "function") {
          deps.renderToolMetaCards(row, payload.meta);
        }
        _renderAssistantTranslation(row, payload.visibleText, options);
      } else {
        _clearMessageTranslation(row);
      }
    }

    function resolveStickerPayload(sticker) {
      const base = normalizeStickerPayload(sticker);
      if (typeof deps.resolveStickerPayload === "function") {
        const resolved = deps.resolveStickerPayload(base);
        if (resolved && typeof resolved === "object") {
          return { ...base, ...resolved, url: resolved.url || resolved.dataUrl || base.url || "" };
        }
      }
      return base;
    }

    function applyStickerPayload(row, stickerInput) {
      const target = row?.querySelector(".content");
      if (!target) {
        return;
      }
      const sticker = resolveStickerPayload(stickerInput);
      row.classList.add("sticker-message");
      row.dataset.messageKind = "sticker";
      target.textContent = "";
      target.classList.add("sticker-content");
      const url = String(sticker.url || sticker.dataUrl || "").trim();
      if (url) {
        const img = documentObject.createElement("img");
        img.className = "sticker-message-img";
        img.alt = sticker.label || sticker.name || "\u8868\u60c5\u5305";
        img.src = url;
        target.appendChild(img);
      } else {
        const missing = documentObject.createElement("span");
        missing.className = "sticker-missing";
        missing.textContent = sticker.label ? `[\u8868\u60c5\u5305: ${sticker.label}]` : "\u8868\u60c5\u5305\u5df2\u79fb\u9664";
        target.appendChild(missing);
      }
      _clearMessageTranslation(row);
    }

    function setMessageTimestamp(row, timestamp) {
      const target = row?.querySelector(".message-time");
      if (!target) {
        return;
      }
      const ts = parseMessageTimestamp(timestamp);
      row.dataset.timestamp = String(ts);
      target.textContent = formatMessageTime(ts);
      target.hidden = false;
    }

    function resolveAssistantDisplayName(fallbackName = "Mochi") {
      const runtimeCfg = state.config?.character_runtime;
      if (runtimeCfg?.enabled === true) {
        const overrideCfg = runtimeCfg?.persona_override;
        const overrideName = String(overrideCfg?.name || "").trim();
        if (overrideCfg?.enabled === true && overrideName) {
          return overrideName;
        }
      }
      const configuredName = String(state.config?.assistant_name || "").trim();
      return configuredName || fallbackName;
    }

    function createAssistantFeedbackControls() {
      if (typeof deps.recordCharacterPerformanceFeedback !== "function") {
        return null;
      }
      const wrap = documentObject.createElement("div");
      wrap.className = "message-feedback";
      wrap.setAttribute("aria-label", "\u8bc4\u4ef7\u6700\u8fd1\u4e00\u6b21\u89d2\u8272\u8868\u73b0");
      const items = [
        { rating: "good", label: "\u8868\u73b0\u4e0d\u9519", title: "\u8bb0\u5f55\u6700\u8fd1\u4e00\u6b21\u89d2\u8272\u8868\u73b0\u4e0d\u9519" },
        { rating: "bad", label: "\u9700\u8981\u8c03\u6574", title: "\u8bb0\u5f55\u6700\u8fd1\u4e00\u6b21\u89d2\u8272\u8868\u73b0\u9700\u8981\u8c03\u6574" }
      ];
      for (const item of items) {
        const button = documentObject.createElement("button");
        button.type = "button";
        button.className = `message-feedback-btn is-${item.rating}`;
        button.dataset.feedback = item.rating;
        button.title = item.title;
        button.textContent = item.label;
        button.addEventListener("click", (event) => {
          if (event && typeof event.stopPropagation === "function") {
            event.stopPropagation();
          }
          const result = deps.recordCharacterPerformanceFeedback(item.rating);
          if (result && typeof deps.setStatus === "function") {
            deps.setStatus(item.rating === "good" ? "\u5df2\u8bb0\u5f55\uff1a\u8868\u73b0\u4e0d\u9519" : "\u5df2\u8bb0\u5f55\uff1a\u9700\u8981\u8c03\u6574");
          }
        });
        wrap.appendChild(button);
      }
      return wrap;
    }

    function createMessageRow(role, text, options = {}) {
      const row = documentObject.createElement("div");
      row.className = `message ${role}`;
      if (options.continuation === true) {
        row.classList.add("is-conversation-continuation");
      }
      if (options.kind === "sticker") {
        row.className += " sticker-message";
      }
      const assistantName = resolveAssistantDisplayName("Hiyori");
      const roleEl = documentObject.createElement("span");
      roleEl.className = "role";
      roleEl.textContent = role === "user" ? "\u4f60" : assistantName;
      const textEl = documentObject.createElement("span");
      textEl.className = "content";
      const timeEl = documentObject.createElement("span");
      timeEl.className = "message-time";
      timeEl.hidden = options.hideTimestamp === true;
      row.appendChild(roleEl);
      row.appendChild(textEl);
      if (role === "assistant" && options.kind !== "sticker" && options.enableFeedback !== false) {
        const feedbackEl = createAssistantFeedbackControls();
        if (feedbackEl) {
          row.appendChild(feedbackEl);
        }
      }
      row.appendChild(timeEl);
      row.dataset.timestamp = String(parseMessageTimestamp(options.timestamp || Date.now()));
      if (options.kind === "sticker") {
        applyStickerPayload(row, options.sticker || text);
      } else {
        applyMessagePayload(row, text, {
          enableTranslation: options.enableTranslation !== false,
          storedTranslation: options.storedTranslation,
          stickers: options.stickers
        });
      }
      if (options.hideTimestamp !== true) {
        setMessageTimestamp(row, options.timestamp || Date.now());
      }
      return row;
    }

    function setMessageText(row, text, options = {}) {
      applyMessagePayload(row, text, options);
      if (row?.parentNode) {
        notifyConversationLaneMessage(
          row,
          row.classList?.contains?.("user") ? "user" : "assistant",
          text
        );
      }
      const lane = getMessageLaneForRow(row);
      if (lane) lane.scrollTop = lane.scrollHeight;
    }

    function commitMessageRecord(role, text, options = {}) {
      const content = String(text || "").trim();
      if (!content) {
        return null;
      }
      const timestamp = parseMessageTimestamp(options.timestamp);
      const record = { role: role === "user" ? "user" : "assistant", content, timestamp };
      const translation = normalizeStoredTranslation(options.translation);
      const stickers = normalizeInlineStickers(options.stickers);
      if (translation && translation !== content) {
        record.translation = translation;
      }
      if (stickers.length) {
        record.stickers = stickers;
      }
      const previous = findPreviousRoleRecord(record.role);
      if (shouldInsertTimeDivider(previous?.timestamp || 0, timestamp)) {
        appendTimeDivider(record.role, timestamp);
      }
      state.chatRecords.push(record);
      state.chatRecords = trimChatRecords(state.chatRecords);
      if (typeof deps.saveChatHistory === "function") {
        deps.saveChatHistory();
      }
      if (options.syncHistory === true) {
        syncConversationHistoryFromChatRecords();
      }
      return record;
    }

    function commitStickerRecord(role, stickerInput, options = {}) {
      const sticker = normalizeStickerPayload(stickerInput);
      if (!sticker.id && !sticker.url) {
        return null;
      }
      const timestamp = parseMessageTimestamp(options.timestamp);
      const content = String(options.content || `[\u8868\u60c5\u5305: ${sticker.label}]`).trim();
      const record = {
        role: role === "user" ? "user" : "assistant",
        kind: "sticker",
        content,
        sticker: {
          id: sticker.id,
          source: sticker.source,
          label: sticker.label,
          name: sticker.name,
          mood: sticker.mood
        },
        timestamp
      };
      const previous = findPreviousRoleRecord(record.role);
      if (shouldInsertTimeDivider(previous?.timestamp || 0, timestamp)) {
        appendTimeDivider(record.role, timestamp);
      }
      state.chatRecords.push(record);
      state.chatRecords = trimChatRecords(state.chatRecords);
      if (typeof deps.saveChatHistory === "function") {
        deps.saveChatHistory();
      }
      return record;
    }

    function appendMessage(role, text, options = {}) {
      const timestamp = parseMessageTimestamp(options.timestamp);
      const isSystemMessage = options.category === "system";
      const row = createMessageRow(role, text, {
        timestamp,
        hideTimestamp: options.hideTimestamp === true,
        continuation: options.continuation === true,
        enableFeedback: options.enableFeedback !== false,
        enableTranslation: options.enableTranslation !== false,
        storedTranslation: options.storedTranslation,
        stickers: options.stickers
      });
      if (options.persist !== false && !isSystemMessage) {
        const record = commitMessageRecord(role, text, {
          timestamp,
          syncHistory: options.syncHistory === true,
          translation: options.storedTranslation || row.dataset.persistedTranslation,
          stickers: options.stickers
        });
        if (record && row.dataset.persistedTranslation && !record.translation) {
          record.translation = row.dataset.persistedTranslation;
          deps.saveChatHistory?.();
        }
      } else if (options.insertDivider && shouldInsertTimeDivider(options.previousTimestamp || 0, timestamp)) {
        appendTimeDivider(role, timestamp);
      }
      const lane = getMessageLane(role);
      if (lane) {
        if (isSystemMessage) row.dataset.messageCategory = "system";
        lane.appendChild(row);
        notifyConversationLaneMessage(row, role, text);
        scrollMessageLane(role);
      }
      return row;
    }

    function appendStickerMessage(role, sticker, options = {}) {
      const timestamp = parseMessageTimestamp(options.timestamp);
      const normalizedRole = role === "user" ? "user" : "assistant";
      const lane = getMessageLane(normalizedRole);
      const laneChildren = Array.from(lane?.children || []);
      const targetRow = laneChildren.reverse().find((candidate) => (
        candidate?.classList?.contains(normalizedRole)
        && candidate.dataset?.messageKind !== "sticker"
        && candidate.querySelector?.(".content")
      ));
      const targetRecord = [...(Array.isArray(state.chatRecords) ? state.chatRecords : [])]
        .reverse()
        .find((item) => item?.role === normalizedRole && item.kind !== "sticker" && String(item.content || "").trim());
      if (targetRow && targetRecord) {
        const resolved = normalizeStickerPayload(sticker);
        targetRecord.stickers = normalizeInlineStickers([
          ...(Array.isArray(targetRecord.stickers) ? targetRecord.stickers : []),
          resolved
        ]);
        appendInlineSticker(targetRow.querySelector(".content"), resolved);
        if (options.persist !== false && typeof deps.saveChatHistory === "function") {
          deps.saveChatHistory();
        }
        deps.onConversationLaneMessage?.(normalizedRole);
        scrollMessageLane(normalizedRole);
        return targetRow;
      }
      const row = createMessageRow(role, "", {
        kind: "sticker",
        sticker,
        timestamp,
        hideTimestamp: options.hideTimestamp === true,
        enableFeedback: false,
        enableTranslation: false
      });
      if (options.persist !== false) {
        commitStickerRecord(role, sticker, {
          timestamp,
          content: options.content
        });
      } else if (options.insertDivider && shouldInsertTimeDivider(options.previousTimestamp || 0, timestamp)) {
        appendTimeDivider(role, timestamp);
      }
      if (lane) {
        lane.appendChild(row);
        notifyConversationLaneMessage(row, normalizedRole, options.content || sticker?.label || "sticker");
        scrollMessageLane(role);
      }
      return row;
    }

    function finalizePendingMessageRow(row, role, text, options = {}) {
      if (!row) {
        return;
      }
      const content = String(text || "").trim();
      if (!content) {
        row.remove();
        return;
      }
      const timestamp = parseMessageTimestamp(options.timestamp);
      const contentTarget = row.querySelector?.(".content");
      const keepAnimatedStream = row.classList?.contains?.("is-streaming")
        && String(contentTarget?.textContent || "") === content;
      if (!keepAnimatedStream) {
        setMessageText(row, content, {
          enableTranslation: options.enableTranslation !== false
        });
      } else if (options.deferStreamFlatten !== true) {
        window.setTimeout(() => {
          if (!row.isConnected) {
            return;
          }
          setMessageText(row, content, {
            enableTranslation: options.enableTranslation !== false
          });
        }, 6300);
      }
      setMessageTimestamp(row, timestamp);
      if (options.persist !== false && options.category !== "system") {
        const normalizedRole = role === "user" ? "user" : "assistant";
        const previous = findPreviousRoleRecord(normalizedRole);
        if (shouldInsertTimeDivider(previous?.timestamp || 0, timestamp)) {
          row.parentNode?.insertBefore(createTimeDivider(timestamp), row);
        }
        const record = { role: normalizedRole, content, timestamp };
        const translation = normalizeStoredTranslation(row.dataset.persistedTranslation);
        if (translation && translation !== content) {
          record.translation = translation;
        }
        state.chatRecords.push(record);
        state.chatRecords = trimChatRecords(state.chatRecords);
        if (typeof deps.saveChatHistory === "function") {
          deps.saveChatHistory();
        }
        if (options.syncHistory === true) {
          syncConversationHistoryFromChatRecords();
        }
      }
      scrollMessageLane(role);
    }

    function rememberMessage(role, content, options = {}) {
      const timestamp = parseMessageTimestamp(options.timestamp);
      state.history.push({ role, content, timestamp });
      const limit = Math.max(12, Number(state.historyMaxMessages) || 64);
      if (state.history.length > limit) {
        state.history = state.history.slice(state.history.length - limit);
      }
    }

    function renderChatHistoryFromState() {
      if (!ui.chatLog) {
        return;
      }
      if (shouldUseSeparateMessageLanes()) {
        ui.userChatLog.innerHTML = "";
        ui.assistantChatLog.innerHTML = "";
      } else {
        ui.chatLog.innerHTML = "";
      }
      const previousTs = { user: 0, assistant: 0 };
      for (const item of state.chatRecords) {
        const timestamp = parseMessageTimestamp(item.timestamp);
        const role = item.role === "user" ? "user" : "assistant";
        if (shouldInsertTimeDivider(previousTs[role], timestamp)) {
          appendTimeDivider(role, timestamp);
        }
        const row = item.kind === "sticker"
          ? createMessageRow(item.role, item.content, {
            kind: "sticker",
            sticker: item.sticker,
            timestamp,
            enableFeedback: false,
            enableTranslation: false
          })
          : createMessageRow(item.role, item.content, {
            timestamp,
            enableFeedback: item.role === "assistant",
            enableTranslation: true,
            storedTranslation: item.translation,
            stickers: item.stickers
          });
        getMessageLane(role)?.appendChild(row);
        previousTs[role] = timestamp;
      }
      scrollMessageLane("user");
      scrollMessageLane("assistant");
    }

    function loadChatHistoryFromStorage() {
      if (typeof deps.storageController?.loadChatHistory === "function") {
        deps.storageController.loadChatHistory(state, {
          windowObject: deps.windowObject || root,
          normalizeChatRecord,
          coalesceInlineStickerRecords,
          parseMessageTimestamp,
          trimChatRecords,
          syncConversationHistoryFromChatRecords,
          renderChatHistoryFromState,
          saveChatHistory: deps.saveChatHistory
        });
      }
    }

    return {
      parseMessageTimestamp,
      formatMessageTime,
      formatMessageDivider,
      shouldInsertTimeDivider,
      createTimeDivider,
      trimChatRecords,
      syncConversationHistoryFromChatRecords,
      normalizeStickerPayload,
      normalizeInlineStickers,
      normalizeChatRecord,
      coalesceInlineStickerRecords,
      renderChatHistoryFromState,
      loadChatHistoryFromStorage,
      applyMessagePayload,
      applyStickerPayload,
      resolveStickerPayload,
      setMessageTimestamp,
      resolveAssistantDisplayName,
      createMessageRow,
      setMessageText,
      commitMessageRecord,
      commitStickerRecord,
      appendMessage,
      appendStickerMessage,
      finalizePendingMessageRow,
      rememberMessage
    };
  }

  const api = { createController };
  root.TaffyChatMessageController = api;
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof window !== "undefined" ? window : globalThis);
