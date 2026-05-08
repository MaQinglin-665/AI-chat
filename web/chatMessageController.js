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
        .filter((item) => item && (item.role === "user" || item.role === "assistant"))
        .map((item) => ({
          role: item.role,
          content: String(item.content || "").trim()
        }))
        .filter((item) => item.content);
      const limit = Math.max(12, Number(state.historyMaxMessages) || 64);
      state.history = convo.slice(Math.max(0, convo.length - limit));
    }

    function normalizeChatRecord(item) {
      if (!item || typeof item !== "object") {
        return null;
      }
      const role = item.role === "user" ? "user" : "assistant";
      const content = String(item.content || "").trim();
      if (!content) {
        return null;
      }
      return {
        role,
        content,
        timestamp: parseMessageTimestamp(item.timestamp || item.created_at || item.time)
      };
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
      const cached = typeof deps.readChatTranslationCache === "function"
        ? deps.readChatTranslationCache(safe)
        : "";
      if (cached && cached !== safe) {
        translationEl.textContent = `\u4e2d\u8bd1\uff1a${cached}`;
        translationEl.hidden = false;
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
        if (!row.isConnected || row.dataset.translationReqId !== requestId) {
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
      });
    }

    function applyMessagePayload(row, text, options = {}) {
      const target = row?.querySelector(".content");
      if (!target) {
        return;
      }
      const payload = typeof deps.parseToolMetaFromText === "function"
        ? deps.parseToolMetaFromText(text)
        : { visibleText: String(text || ""), meta: null };
      target.textContent = String(payload.visibleText || "");
      if (row.classList.contains("assistant")) {
        if (typeof deps.renderToolMetaCards === "function") {
          deps.renderToolMetaCards(row, payload.meta);
        }
        _renderAssistantTranslation(row, payload.visibleText, options);
      } else {
        _clearMessageTranslation(row);
      }
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

    function createMessageRow(role, text, options = {}) {
      const row = documentObject.createElement("div");
      row.className = `message ${role}`;
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
      row.appendChild(timeEl);
      applyMessagePayload(row, text, {
        enableTranslation: options.enableTranslation !== false
      });
      if (options.hideTimestamp !== true) {
        setMessageTimestamp(row, options.timestamp || Date.now());
      }
      return row;
    }

    function setMessageText(row, text, options = {}) {
      applyMessagePayload(row, text, options);
      if (ui.chatLog) {
        ui.chatLog.scrollTop = ui.chatLog.scrollHeight;
      }
    }

    function commitMessageRecord(role, text, options = {}) {
      const content = String(text || "").trim();
      if (!content) {
        return null;
      }
      const timestamp = parseMessageTimestamp(options.timestamp);
      const record = { role: role === "user" ? "user" : "assistant", content, timestamp };
      const previous = state.chatRecords.length ? state.chatRecords[state.chatRecords.length - 1] : null;
      if (ui.chatLog && shouldInsertTimeDivider(previous?.timestamp || 0, timestamp)) {
        ui.chatLog.appendChild(createTimeDivider(timestamp));
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

    function appendMessage(role, text, options = {}) {
      const timestamp = parseMessageTimestamp(options.timestamp);
      const row = createMessageRow(role, text, {
        timestamp,
        hideTimestamp: options.hideTimestamp === true,
        enableTranslation: options.enableTranslation !== false
      });
      if (options.persist !== false) {
        commitMessageRecord(role, text, {
          timestamp,
          syncHistory: options.syncHistory === true
        });
      } else if (ui.chatLog && options.insertDivider && shouldInsertTimeDivider(options.previousTimestamp || 0, timestamp)) {
        ui.chatLog.appendChild(createTimeDivider(timestamp));
      }
      if (ui.chatLog) {
        ui.chatLog.appendChild(row);
        ui.chatLog.scrollTop = ui.chatLog.scrollHeight;
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
      setMessageText(row, content, {
        enableTranslation: options.enableTranslation !== false
      });
      setMessageTimestamp(row, timestamp);
      if (options.persist !== false) {
        const previous = state.chatRecords.length ? state.chatRecords[state.chatRecords.length - 1] : null;
        if (shouldInsertTimeDivider(previous?.timestamp || 0, timestamp)) {
          row.parentNode?.insertBefore(createTimeDivider(timestamp), row);
        }
        state.chatRecords.push({ role: role === "user" ? "user" : "assistant", content, timestamp });
        state.chatRecords = trimChatRecords(state.chatRecords);
        if (typeof deps.saveChatHistory === "function") {
          deps.saveChatHistory();
        }
        if (options.syncHistory === true) {
          syncConversationHistoryFromChatRecords();
        }
      }
      if (ui.chatLog) {
        ui.chatLog.scrollTop = ui.chatLog.scrollHeight;
      }
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
      ui.chatLog.innerHTML = "";
      let previousTs = 0;
      for (const item of state.chatRecords) {
        const timestamp = parseMessageTimestamp(item.timestamp);
        if (shouldInsertTimeDivider(previousTs, timestamp)) {
          ui.chatLog.appendChild(createTimeDivider(timestamp));
        }
        const row = createMessageRow(item.role, item.content, {
          timestamp,
          enableTranslation: false
        });
        ui.chatLog.appendChild(row);
        previousTs = timestamp;
      }
      ui.chatLog.scrollTop = ui.chatLog.scrollHeight;
    }

    function loadChatHistoryFromStorage() {
      if (typeof deps.storageController?.loadChatHistory === "function") {
        deps.storageController.loadChatHistory(state, {
          windowObject: deps.windowObject || root,
          normalizeChatRecord,
          parseMessageTimestamp,
          trimChatRecords,
          syncConversationHistoryFromChatRecords,
          renderChatHistoryFromState
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
      normalizeChatRecord,
      renderChatHistoryFromState,
      loadChatHistoryFromStorage,
      applyMessagePayload,
      setMessageTimestamp,
      resolveAssistantDisplayName,
      createMessageRow,
      setMessageText,
      commitMessageRecord,
      appendMessage,
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
