(function (root) {
  "use strict";

  const QQ_ID_RE = /^[1-9][0-9]{4,19}$/;
  const AUDIT_CURSOR_KEY = "taffy_qq_identity_audit_cursor_v1";

  function clean(value) {
    return String(value || "").trim();
  }

  function createUI(documentObject) {
    const byId = (id) => documentObject?.getElementById?.(id) || null;
    return {
      openBtn: byId("qq-identity-btn"), modal: byId("qq-identity-modal"), closeBtn: byId("qq-identity-close-btn"),
      enabled: byId("qq-identity-enabled"), displayName: byId("qq-identity-display-name"), number: byId("qq-identity-number"),
      cloudUrl: byId("qq-identity-cloud-url"), authMode: byId("qq-identity-auth-mode"), tokenEnv: byId("qq-identity-token-env"), astrbotApiKeyEnv: byId("qq-identity-astrbot-api-key-env"), queueAge: byId("qq-identity-queue-age"),
      contactInput: byId("qq-identity-contact-input"), addContact: byId("qq-identity-add-contact"), contacts: byId("qq-identity-contacts"),
      groupInput: byId("qq-identity-group-input"), addGroup: byId("qq-identity-add-group"), groups: byId("qq-identity-groups"),
      quietEnabled: byId("qq-identity-quiet-enabled"), quietStart: byId("qq-identity-quiet-start"), quietEnd: byId("qq-identity-quiet-end"),
      cooldown: byId("qq-identity-cooldown"), dailyLimit: byId("qq-identity-daily-limit"),
      refreshBtn: byId("qq-identity-refresh-btn"), clearHistoryBtn: byId("qq-identity-clear-history-btn"), saveBtn: byId("qq-identity-save-btn"), status: byId("qq-identity-status"), audit: byId("qq-identity-audit")
    };
  }

  function numeric(node, fallback, min, max) {
    const value = Number(node?.value);
    return Math.max(min, Math.min(max, Number.isFinite(value) ? Math.round(value) : fallback));
  }

  function createController(deps = {}) {
    const documentObject = deps.documentObject || root.document;
    const ui = deps.ui || createUI(documentObject);
    const request = deps.authFetch || root.authFetch || root.fetch?.bind(root);
    const appendMessage = deps.appendMessage || root.appendMessage || (() => {});
    const state = { contacts: [], groups: [], bound: false, timer: null, lastAuditAt: 0 };

    function setStatus(text) { if (ui.status) ui.status.textContent = String(text || ""); }
    function setBusy(busy) { [ui.saveBtn, ui.refreshBtn, ui.clearHistoryBtn].forEach((button) => { if (button) button.disabled = busy === true; }); }
    function setModalClass(isOpen) { documentObject?.body?.classList?.toggle("config-switch-open", isOpen === true); }
    function uniqueIds(values) { return [...new Set((Array.isArray(values) ? values : []).map(clean).filter((value) => QQ_ID_RE.test(value)))]; }

    function renderIdList(node, values, type) {
      if (!node) return;
      node.innerHTML = "";
      if (!values.length) {
        const empty = documentObject.createElement("span");
        empty.className = "qq-identity-empty";
        empty.textContent = "暂未添加";
        node.appendChild(empty);
        return;
      }
      values.forEach((value) => {
        const chip = documentObject.createElement("span");
        chip.className = "qq-identity-id-chip";
        chip.textContent = value;
        const remove = documentObject.createElement("button");
        remove.type = "button";
        remove.title = "移除";
        remove.setAttribute("aria-label", `移除 ${value}`);
        remove.textContent = "×";
        remove.addEventListener("click", () => {
          state[type] = state[type].filter((item) => item !== value);
          renderIdList(node, state[type], type);
        });
        chip.appendChild(remove);
        node.appendChild(chip);
      });
    }

    function renderLists() { renderIdList(ui.contacts, state.contacts, "contacts"); renderIdList(ui.groups, state.groups, "groups"); }
    function addId(kind, input) {
      const value = clean(input?.value);
      if (!QQ_ID_RE.test(value)) { setStatus("请输入 5 至 20 位、首位非 0 的 QQ 号。 "); return; }
      state[kind] = uniqueIds([...state[kind], value]);
      if (input) input.value = "";
      renderLists();
    }

    async function fetchJson(path, init = {}) {
      if (typeof request !== "function") throw new Error("浏览器请求接口不可用");
      const response = await request(path, init);
      const data = await response.json().catch(() => ({}));
      if (!response.ok || data?.ok === false) throw new Error(String(data?.error || `请求失败 (${response.status})`));
      return data;
    }

    function setForm(identity) {
      const value = identity || {};
      if (ui.enabled) ui.enabled.checked = value.enabled === true;
      if (ui.displayName) ui.displayName.value = clean(value.display_name);
      if (ui.number) ui.number.value = clean(value.qq_number);
      if (ui.cloudUrl) ui.cloudUrl.value = clean(value.cloud_bridge_url);
      if (ui.authMode) ui.authMode.value = clean(value.bridge_auth_mode) === "tailnet" ? "tailnet" : "token";
      if (ui.tokenEnv) ui.tokenEnv.value = clean(value.bridge_token_env) || "TAFFY_QQ_BRIDGE_TOKEN";
      if (ui.astrbotApiKeyEnv) ui.astrbotApiKeyEnv.value = clean(value.astrbot_api_key_env) || "ASTRBOT_QQ_BRIDGE_API_KEY";
      if (ui.queueAge) ui.queueAge.value = String(value.max_queue_age_minutes ?? 1440);
      if (ui.quietEnabled) ui.quietEnabled.checked = value.quiet_hours?.enabled !== false;
      if (ui.quietStart) ui.quietStart.value = String(value.quiet_hours?.start_hour ?? 23);
      if (ui.quietEnd) ui.quietEnd.value = String(value.quiet_hours?.end_hour ?? 8);
      if (ui.cooldown) ui.cooldown.value = String(value.proactive_cooldown_minutes ?? 180);
      if (ui.dailyLimit) ui.dailyLimit.value = String(value.max_proactive_messages_per_day ?? 3);
      state.contacts = uniqueIds(value.allowed_contacts);
      state.groups = uniqueIds(value.allowed_groups);
      renderLists();
    }

    function buildPayload() {
      return { identity: {
        enabled: ui.enabled?.checked === true, display_name: clean(ui.displayName?.value), qq_number: clean(ui.number?.value),
        cloud_bridge_url: clean(ui.cloudUrl?.value).replace(/\/+$/, ""), bridge_auth_mode: ui.authMode?.value === "tailnet" ? "tailnet" : "token", bridge_token_env: clean(ui.tokenEnv?.value) || "TAFFY_QQ_BRIDGE_TOKEN",
        astrbot_api_key_env: clean(ui.astrbotApiKeyEnv?.value) || "ASTRBOT_QQ_BRIDGE_API_KEY",
        queue_max_age_minutes: numeric(ui.queueAge, 1440, 5, 10080), allowed_contacts: uniqueIds(state.contacts), allowed_groups: uniqueIds(state.groups),
        quiet_hours: { enabled: ui.quietEnabled?.checked === true, start_hour: numeric(ui.quietStart, 23, 0, 23), end_hour: numeric(ui.quietEnd, 8, 0, 23) },
        proactive_cooldown_minutes: numeric(ui.cooldown, 180, 5, 1440), max_proactive_messages_per_day: numeric(ui.dailyLimit, 3, 0, 30)
      } };
    }

    function renderAudit(items, bridge) {
      const audit = Array.isArray(items) ? items : [];
      if (ui.audit) {
        ui.audit.textContent = audit.length ? audit.slice(-60).map((item) => {
          const time = clean(item.at).replace("T", " ").replace(/\..*/, "");
          const thread = clean(item.group_id) || clean(item.sender_id) || "QQ";
          const incoming = clean(item.incoming_text);
          const outgoing = clean(item.outgoing_text);
          return `[${time || new Date(Number(item.timestamp || 0)).toLocaleString() || "--"}] ${thread} · ${clean(item.status) || "已处理"}\n${incoming ? `收：${incoming}\n` : ""}${outgoing ? `发：${outgoing}` : ""}`.trim();
        }).join("\n\n") : "尚未读取记录。";
      }
      if (bridge) {
        const base = bridge.last_error ? `桥接异常：${bridge.last_error}` : (bridge.running ? "本机桥接正在轮询云端队列。" : "桥接尚未启动。");
        setStatus(base);
      }
      audit.filter((item) => Number(item?.timestamp || 0) > state.lastAuditAt).forEach((item) => {
        const stamp = Number(item.timestamp || 0);
        state.lastAuditAt = Math.max(state.lastAuditAt, stamp);
        const thread = clean(item.group_id) || clean(item.sender_id) || "QQ";
        if (clean(item.incoming_text)) appendMessage("user", `[QQ ${thread}] ${clean(item.incoming_text)}`, { enableFeedback: false, syncHistory: false });
        if (clean(item.outgoing_text)) appendMessage("assistant", `[QQ] ${clean(item.outgoing_text)}`, { enableFeedback: false, syncHistory: false });
      });
      try { root.localStorage?.setItem(AUDIT_CURSOR_KEY, String(state.lastAuditAt || 0)); } catch (_) { /* non-critical */ }
    }

    async function load(showStatus = false) {
      const [identityResponse, historyResponse] = await Promise.all([fetchJson("/api/qq/identity"), fetchJson("/api/qq/identity/history")]);
      setForm(identityResponse.identity);
      renderAudit(historyResponse.items, identityResponse.runtime);
      if (showStatus) setStatus(identityResponse.identity?.enabled ? "已读取 QQ 身份与桥接状态。" : "QQ 身份尚未启用；保存后仍需在腾讯云部署桥接插件。 ");
      return identityResponse;
    }

    async function save() {
      setBusy(true);
      setStatus("正在保存 QQ 设置…");
      try {
        const response = await fetchJson("/api/qq/identity", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(buildPayload()) });
        setForm(response.identity);
        setStatus(response.identity?.enabled ? "QQ 设置已保存。桌宠仅会处理白名单会话。" : "QQ 设置已保存，当前仍处于关闭状态。");
        return response;
      } finally { setBusy(false); }
    }

    async function clearHistory() {
      if (typeof root.confirm === "function" && !root.confirm("确定清除这台电脑保存的 QQ 收发记录吗？这不会删除 QQ 中的消息。")) return;
      setBusy(true);
      try {
        await fetchJson("/api/qq/identity/history/clear", { method: "POST" });
        state.lastAuditAt = Date.now();
        if (ui.audit) ui.audit.textContent = "尚未读取记录。";
        try { root.localStorage?.setItem(AUDIT_CURSOR_KEY, String(state.lastAuditAt)); } catch (_) { /* non-critical */ }
        setStatus("已清除本机 QQ 收发记录。 ");
      } finally { setBusy(false); }
    }

    function open() { if (ui.modal) ui.modal.hidden = false; setModalClass(true); load(true).catch((error) => setStatus(`读取失败：${error?.message || error}`)); }
    function close() { if (ui.modal) ui.modal.hidden = true; setModalClass(false); }
    function bind() {
      if (state.bound) return;
      state.bound = true;
      try { state.lastAuditAt = Number(root.localStorage?.getItem(AUDIT_CURSOR_KEY) || 0) || 0; } catch (_) { /* non-critical */ }
      ui.openBtn?.addEventListener("click", open); ui.closeBtn?.addEventListener("click", close);
      ui.addContact?.addEventListener("click", () => addId("contacts", ui.contactInput)); ui.addGroup?.addEventListener("click", () => addId("groups", ui.groupInput));
      ui.contactInput?.addEventListener("keydown", (event) => { if (event.key === "Enter") { event.preventDefault(); addId("contacts", ui.contactInput); } });
      ui.groupInput?.addEventListener("keydown", (event) => { if (event.key === "Enter") { event.preventDefault(); addId("groups", ui.groupInput); } });
      ui.refreshBtn?.addEventListener("click", () => load(true).catch((error) => setStatus(`刷新失败：${error?.message || error}`)));
      ui.saveBtn?.addEventListener("click", () => save().catch((error) => setStatus(`保存失败：${error?.message || error}`)));
      ui.clearHistoryBtn?.addEventListener("click", () => clearHistory().catch((error) => setStatus(`清除失败：${error?.message || error}`)));
      state.timer = root.setInterval?.(() => { if (ui.modal?.hidden === false) load(false).catch(() => {}); }, 15000) || null;
    }
    return { bind, buildPayload, clearHistory, close, load, open, save, state };
  }

  const api = { createController, createUI };
  root.TaffyQQIdentityController = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (root.document?.addEventListener) {
    const boot = () => { const controller = createController(); controller.bind(); root.__qqIdentityController = controller; };
    if (root.document.readyState === "loading") root.document.addEventListener("DOMContentLoaded", boot, { once: true }); else boot();
  }
})(typeof window !== "undefined" ? window : globalThis);
