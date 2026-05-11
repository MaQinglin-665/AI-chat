(function (root) {
  "use strict";

  const PROVIDER_DEFAULTS = {
    "openai-compatible": {
      provider: "openai-compatible",
      base_url: "http://127.0.0.1:8000/v1",
      model: "gpt-4o-mini",
      api_key_env: "TAFFY_LLM_API_KEY"
    },
    openai: {
      provider: "openai",
      base_url: "https://api.openai.com/v1",
      model: "gpt-4o-mini",
      api_key_env: "OPENAI_API_KEY"
    },
    ollama: {
      provider: "ollama",
      base_url: "http://127.0.0.1:11434",
      model: "qwen2.5:7b",
      api_key_env: ""
    }
  };

  function clean(value) {
    return String(value || "").trim();
  }

  function createUI(documentObject) {
    const doc = documentObject || {};
    const byId = (id) => (typeof doc.getElementById === "function" ? doc.getElementById(id) : null);
    return {
      modal: byId("first-run-modal"),
      closeBtn: byId("first-run-close-btn"),
      saveBtn: byId("first-run-save-btn"),
      testBtn: byId("first-run-test-btn"),
      status: byId("first-run-status"),
      provider: byId("first-run-provider"),
      baseUrl: byId("first-run-base-url"),
      model: byId("first-run-model"),
      apiKeyEnv: byId("first-run-api-key-env"),
      apiKey: byId("first-run-api-key"),
      summary: byId("first-run-summary")
    };
  }

  function setText(node, text) {
    if (node) {
      node.textContent = String(text || "");
    }
  }

  function setValue(node, value) {
    if (node) {
      node.value = String(value || "");
    }
  }

  function getValue(node) {
    return clean(node?.value);
  }

  function setBusy(ui, busy) {
    for (const node of [ui.saveBtn, ui.testBtn, ui.closeBtn]) {
      if (node) {
        node.disabled = busy === true;
      }
    }
  }

  function normalizeProvider(value) {
    const provider = clean(value).toLowerCase().replace("_", "-");
    return Object.prototype.hasOwnProperty.call(PROVIDER_DEFAULTS, provider)
      ? provider
      : "openai-compatible";
  }

  function readStatusSummary(status) {
    const llm = status?.llm || {};
    const safety = status?.safety || {};
    const live2d = status?.live2d || {};
    const parts = [];
    parts.push(llm.configured ? "模型配置完整" : "模型配置待完成");
    parts.push(live2d.ok ? "Live2D 可用" : "Live2D 待检查");
    parts.push(safety.ok ? "安全默认值正常" : "安全默认值需复核");
    return parts.join(" · ");
  }

  function createController(deps = {}) {
    const documentObject = deps.documentObject || root.document;
    const ui = deps.ui || createUI(documentObject);
    const authFetch = deps.authFetch || root.authFetch || root.fetch?.bind(root);
    const loadConfig = deps.loadConfig || root.loadConfig;
    const setGlobalStatus = deps.setStatus || root.setStatus || (() => {});
    const state = {
      bound: false,
      status: null
    };

    function setModalOpenClass(isOpen) {
      documentObject?.body?.classList?.toggle("first-run-open", isOpen === true);
    }

    function open() {
      if (ui.modal) {
        ui.modal.hidden = false;
      }
      setModalOpenClass(true);
    }

    function close() {
      if (ui.modal) {
        ui.modal.hidden = true;
      }
      setModalOpenClass(false);
    }

    function shouldOpenFromStatus(status) {
      return status?.first_run?.needs_first_run === true || status?.llm?.configured !== true;
    }

    function applyProviderDefaults(providerValue, options = {}) {
      const provider = normalizeProvider(providerValue);
      const defaults = PROVIDER_DEFAULTS[provider] || PROVIDER_DEFAULTS["openai-compatible"];
      setValue(ui.provider, provider);
      if (options.force || !getValue(ui.baseUrl)) {
        setValue(ui.baseUrl, defaults.base_url);
      }
      if (options.force || !getValue(ui.model)) {
        setValue(ui.model, defaults.model);
      }
      if (options.force || !getValue(ui.apiKeyEnv)) {
        setValue(ui.apiKeyEnv, defaults.api_key_env);
      }
      if (provider === "ollama") {
        setValue(ui.apiKeyEnv, "");
      }
    }

    function setFormFromStatus(status) {
      state.status = status && typeof status === "object" ? status : null;
      const llm = state.status?.llm || {};
      const provider = normalizeProvider(llm.provider || "openai-compatible");
      setValue(ui.provider, provider);
      setValue(ui.baseUrl, llm.base_url || PROVIDER_DEFAULTS[provider].base_url);
      setValue(ui.model, llm.model || PROVIDER_DEFAULTS[provider].model);
      setValue(ui.apiKeyEnv, llm.api_key_env || PROVIDER_DEFAULTS[provider].api_key_env);
      setValue(ui.apiKey, "");
      setText(ui.summary, readStatusSummary(state.status));
      if (llm.api_key_configured) {
        setText(ui.status, `已检测到 ${llm.api_key_env || "API key"}，可直接测试模型。`);
      } else {
        setText(ui.status, "填写 provider、base URL、model 和 API key 后保存。");
      }
    }

    function buildPayload() {
      return {
        provider: normalizeProvider(getValue(ui.provider)),
        base_url: getValue(ui.baseUrl),
        model: getValue(ui.model),
        api_key_env: getValue(ui.apiKeyEnv),
        api_key: getValue(ui.apiKey)
      };
    }

    async function fetchJson(url, init = {}) {
      if (typeof authFetch !== "function") {
        throw new Error("authFetch is not available");
      }
      const resp = await authFetch(url, init);
      let data = {};
      try {
        data = await resp.json();
      } catch (_) {
        data = {};
      }
      if (!resp.ok) {
        throw new Error(data?.error || data?.reason || `HTTP ${resp.status}`);
      }
      return data;
    }

    async function loadStatus(options = {}) {
      const data = await fetchJson("/api/first_run/status", { cache: "no-store" });
      setFormFromStatus(data);
      if (options.autoOpen && shouldOpenFromStatus(data)) {
        open();
      }
      return data;
    }

    async function runLlmProbe() {
      setText(ui.status, "正在测试模型连接...");
      const data = await fetchJson("/api/llm_probe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ probe: "llm_lightweight" })
      });
      const elapsed = Math.round(Number(data.elapsed_ms) || 0);
      setText(ui.status, `模型测试通过${elapsed ? `（${elapsed}ms）` : ""}。`);
      return data;
    }

    async function saveAndProbe() {
      setBusy(ui, true);
      setText(ui.status, "正在保存首跑模型配置...");
      try {
        const data = await fetchJson("/api/first_run/configure_llm", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(buildPayload())
        });
        setFormFromStatus(data);
        setValue(ui.apiKey, "");
        if (typeof loadConfig === "function") {
          await loadConfig();
        }
        setGlobalStatus("首跑模型配置已保存");
        try {
          await runLlmProbe();
        } catch (probeError) {
          setText(ui.status, `已保存，但模型测试失败：${probeError?.message || probeError}`);
        }
        return data;
      } finally {
        setBusy(ui, false);
      }
    }

    function bind() {
      if (state.bound) {
        return;
      }
      state.bound = true;
      ui.closeBtn?.addEventListener("click", close);
      ui.provider?.addEventListener("change", () => applyProviderDefaults(getValue(ui.provider), { force: true }));
      ui.saveBtn?.addEventListener("click", () => {
        saveAndProbe().catch((err) => {
          setText(ui.status, `保存失败：${err?.message || err}`);
        });
      });
      ui.testBtn?.addEventListener("click", () => {
        runLlmProbe().catch((err) => {
          setText(ui.status, `模型测试失败：${err?.message || err}`);
        });
      });
    }

    return {
      applyProviderDefaults,
      bind,
      buildPayload,
      close,
      loadStatus,
      open,
      runLlmProbe,
      saveAndProbe,
      setFormFromStatus,
      shouldOpenFromStatus
    };
  }

  function boot() {
    const controller = createController();
    controller.bind();
    root.__firstRunWizardController = controller;
    window.setTimeout(() => {
      controller.loadStatus({ autoOpen: true }).catch(() => {});
    }, 320);
  }

  const api = {
    createController,
    createUI
  };

  root.TaffyFirstRunWizardController = api;
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }

  if (root.document && typeof root.document.addEventListener === "function") {
    if (root.document.readyState === "loading") {
      root.document.addEventListener("DOMContentLoaded", boot, { once: true });
    } else {
      boot();
    }
  }
})(typeof window !== "undefined" ? window : globalThis);
