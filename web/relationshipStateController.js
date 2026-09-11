(function (root) {
  "use strict";

  const PREFERENCE_KEYS = Object.freeze(["address", "reply_length", "advice_style", "teasing"]);
  const ENTRY_VALUES = Object.freeze({
    reply_length: new Set(["concise", "balanced", "detailed"]),
    advice_style: new Set(["ask_first", "direct", "comfort_first"]),
    teasing: new Set(["none", "gentle", "playful"])
  });
  const FAMILIARITY_LABELS = Object.freeze({
    new: "刚开始熟悉",
    known: "已经熟悉",
    familiar: "长期相处中"
  });

  function cleanText(value, maxLength = 80) {
    return String(value == null ? "" : value)
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, maxLength);
  }

  function normalizeEntry(raw) {
    if (!raw || typeof raw !== "object") return null;
    const key = cleanText(raw.key, 32).toLowerCase();
    if (!PREFERENCE_KEYS.includes(key)) return null;
    let value = cleanText(raw.value, key === "address" ? 40 : 32);
    if (key === "address") {
      if (!value) return null;
    } else {
      value = value.toLowerCase();
      if (!ENTRY_VALUES[key]?.has(value)) return null;
    }
    return {
      key,
      value,
      source: ["manual", "explicit_user"].includes(cleanText(raw.source, 32).toLowerCase())
        ? cleanText(raw.source, 32).toLowerCase()
        : "explicit_user",
      status: ["active", "pinned"].includes(cleanText(raw.status, 32).toLowerCase())
        ? cleanText(raw.status, 32).toLowerCase()
        : "active"
    };
  }

  function normalizeRelationshipState(raw) {
    const src = raw && typeof raw === "object" ? raw : {};
    const familiaritySource = src.familiarity && typeof src.familiarity === "object" ? src.familiarity : {};
    const eligibleTurns = Math.max(0, Math.min(1000000, Number.parseInt(familiaritySource.eligible_turns, 10) || 0));
    const familiarityLevel = ["new", "known", "familiar"].includes(cleanText(familiaritySource.level, 16))
      ? cleanText(familiaritySource.level, 16)
      : (eligibleTurns >= 30 ? "familiar" : eligibleTurns >= 6 ? "known" : "new");
    const entries = {};
    for (const rawEntry of Array.isArray(src.entries) ? src.entries : []) {
      const entry = normalizeEntry(rawEntry);
      if (entry) entries[entry.key] = entry;
    }
    return {
      revision: Math.max(0, Number.parseInt(src.revision, 10) || 0),
      enabled: src.enabled !== false,
      updated_at: cleanText(src.updated_at, 48),
      familiarity: {
        level: familiarityLevel,
        eligible_turns: eligibleTurns
      },
      entries: PREFERENCE_KEYS.filter((key) => entries[key]).map((key) => entries[key])
    };
  }

  function normalizeClientPayload(raw) {
    const src = raw && typeof raw === "object" ? raw : {};
    return {
      available: src.available !== false,
      state: normalizeRelationshipState(src.state)
    };
  }

  function getEntryValue(state, key) {
    const entry = normalizeRelationshipState(state).entries.find((item) => item.key === key);
    return entry ? entry.value : "";
  }

  function createController(deps = {}) {
    const ui = deps.ui || {};
    const authFetch = typeof deps.authFetch === "function" ? deps.authFetch : null;
    const setStatus = typeof deps.setStatus === "function" ? deps.setStatus : () => {};
    const confirmFunc = typeof deps.confirmFunc === "function"
      ? deps.confirmFunc
      : (typeof root.confirm === "function" ? root.confirm.bind(root) : () => true);
    let currentState = normalizeRelationshipState();
    let available = true;
    let busy = false;
    let bound = false;

    function editableNodes() {
      return [
        ui.relationshipStateEnabled,
        ui.relationshipStateAddress,
        ui.relationshipStateReplyLength,
        ui.relationshipStateAdviceStyle,
        ui.relationshipStateTeasing,
        ui.relationshipStateSaveBtn,
        ui.relationshipStateResetBtn
      ].filter(Boolean);
    }

    function setNotice(message) {
      const text = cleanText(message, 180);
      if (ui.relationshipStateStatus) ui.relationshipStateStatus.textContent = text;
      return text;
    }

    function applyControlState() {
      for (const node of editableNodes()) {
        node.disabled = !available || busy;
      }
      if (ui.relationshipStateReloadBtn) ui.relationshipStateReloadBtn.disabled = busy;
    }

    function render(payload) {
      const normalized = normalizeClientPayload(payload || { available, state: currentState });
      available = normalized.available;
      currentState = normalized.state;
      const familiarity = currentState.familiarity;
      const preferenceCount = currentState.entries.length;
      const label = FAMILIARITY_LABELS[familiarity.level] || FAMILIARITY_LABELS.new;

      if (ui.relationshipStateSummary) {
        ui.relationshipStateSummary.textContent = !available
          ? "互动关系功能尚未在本地配置中启用。"
          : `${label} · 已累计 ${familiarity.eligible_turns} 次真实互动${currentState.enabled ? "" : " · 当前已暂停"}`;
      }
      if (ui.relationshipStateUpdated) {
        const updated = currentState.updated_at ? `上次更新：${currentState.updated_at}` : "尚未保存互动偏好";
        ui.relationshipStateUpdated.textContent = available
          ? `${updated} · ${preferenceCount} 项偏好`
          : "在 config.local.json 启用 relationship_state 后可使用。";
      }
      if (ui.relationshipStateEnabled) ui.relationshipStateEnabled.checked = currentState.enabled;
      if (ui.relationshipStateAddress) ui.relationshipStateAddress.value = getEntryValue(currentState, "address");
      if (ui.relationshipStateReplyLength) ui.relationshipStateReplyLength.value = getEntryValue(currentState, "reply_length");
      if (ui.relationshipStateAdviceStyle) ui.relationshipStateAdviceStyle.value = getEntryValue(currentState, "advice_style");
      if (ui.relationshipStateTeasing) ui.relationshipStateTeasing.value = getEntryValue(currentState, "teasing");
      applyControlState();
      return currentState;
    }

    function setBusy(nextBusy) {
      busy = Boolean(nextBusy);
      applyControlState();
    }

    async function requestJson(url, options = {}) {
      if (!authFetch) throw new Error("互动关系服务不可用");
      const response = await authFetch(url, options);
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || payload?.ok === false) {
        throw new Error(cleanText(payload?.error, 160) || "互动关系请求失败");
      }
      return payload;
    }

    async function loadRelationshipState(options = {}) {
      const silent = options.silent === true;
      setBusy(true);
      try {
        const payload = await requestJson("/api/relationship_state", { cache: "no-store" });
        render(payload);
        if (!silent && !payload.available) {
          setNotice("互动关系尚未启用；现有人设卡和聊天仍可正常使用。");
        }
        return currentState;
      } catch (error) {
        available = false;
        applyControlState();
        const message = `读取互动关系失败：${error?.message || error}`;
        setNotice(message);
        setStatus(message);
        return null;
      } finally {
        setBusy(false);
      }
    }

    function collectEntriesFromForm() {
      const fieldMap = {
        address: ui.relationshipStateAddress,
        reply_length: ui.relationshipStateReplyLength,
        advice_style: ui.relationshipStateAdviceStyle,
        teasing: ui.relationshipStateTeasing
      };
      return PREFERENCE_KEYS
        .filter((key) => fieldMap[key])
        .map((key) => ({ key, value: cleanText(fieldMap[key].value, key === "address" ? 40 : 32) }));
    }

    async function saveRelationshipState() {
      if (!available) {
        setNotice("互动关系尚未启用，无法保存。\n");
        return false;
      }
      setBusy(true);
      try {
        const payload = await requestJson("/api/relationship_state/update", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "upsert",
            enabled: Boolean(ui.relationshipStateEnabled?.checked),
            entries: collectEntriesFromForm()
          })
        });
        render(payload);
        setNotice("互动偏好已保存，会在后续真实对话中生效。");
        setStatus("互动偏好已保存");
        return true;
      } catch (error) {
        const message = `保存互动偏好失败：${error?.message || error}`;
        setNotice(message);
        setStatus(message);
        return false;
      } finally {
        setBusy(false);
      }
    }

    async function resetRelationshipState() {
      if (!available) {
        setNotice("互动关系尚未启用，无法重置。\n");
        return false;
      }
      const accepted = confirmFunc(
        "重置互动关系会清除熟悉度和这里保存的互动偏好，不会删除聊天记录、人设卡或核心记忆。继续吗？"
      );
      if (!accepted) return false;
      setBusy(true);
      try {
        const payload = await requestJson("/api/relationship_state/update", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "reset" })
        });
        render(payload);
        setNotice("互动关系已重置；聊天记录和人设卡没有改动。");
        setStatus("互动关系已重置");
        return true;
      } catch (error) {
        const message = `重置互动关系失败：${error?.message || error}`;
        setNotice(message);
        setStatus(message);
        return false;
      } finally {
        setBusy(false);
      }
    }

    function bindRelationshipStateControls() {
      if (bound) return;
      bound = true;
      ui.relationshipStateReloadBtn?.addEventListener("click", () => { void loadRelationshipState(); });
      ui.relationshipStateSaveBtn?.addEventListener("click", () => { void saveRelationshipState(); });
      ui.relationshipStateResetBtn?.addEventListener("click", () => { void resetRelationshipState(); });
      for (const node of [
        ui.relationshipStateEnabled,
        ui.relationshipStateAddress,
        ui.relationshipStateReplyLength,
        ui.relationshipStateAdviceStyle,
        ui.relationshipStateTeasing
      ]) {
        node?.addEventListener("change", () => setNotice("修改后点击“保存互动偏好”才会生效。"));
      }
    }

    return {
      normalizeRelationshipState,
      render,
      loadRelationshipState,
      saveRelationshipState,
      resetRelationshipState,
      bindRelationshipStateControls,
      getCurrentState: () => normalizeRelationshipState(currentState)
    };
  }

  const api = {
    PREFERENCE_KEYS,
    normalizeRelationshipState,
    normalizeClientPayload,
    getEntryValue,
    createController
  };
  root.TaffyRelationshipStateController = api;
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof window !== "undefined" ? window : globalThis);
