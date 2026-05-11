(function (root) {
  "use strict";

  const DEFAULT_LLM_PRESETS = [
    {
      id: "dashscope",
      label: "DashScope / Qwen",
      provider: "openai-compatible",
      base_url: "https://dashscope.aliyuncs.com/compatible-mode/v1",
      model: "qwen-plus",
      api_key_env: "DASHSCOPE_API_KEY"
    },
    {
      id: "openai",
      label: "OpenAI",
      provider: "openai",
      base_url: "https://api.openai.com/v1",
      model: "gpt-4o-mini",
      api_key_env: "OPENAI_API_KEY"
    },
    {
      id: "ollama",
      label: "Ollama local",
      provider: "ollama",
      base_url: "http://127.0.0.1:11434",
      model: "qwen2.5:7b",
      api_key_env: ""
    },
    {
      id: "custom_openai_compatible",
      label: "Custom OpenAI-compatible",
      provider: "openai-compatible",
      base_url: "http://127.0.0.1:8000/v1",
      model: "gpt-4o-mini",
      api_key_env: "TAFFY_LLM_API_KEY"
    }
  ];

  const DEFAULT_TTS_PRESETS = [
    { id: "browser", label: "Browser voice", provider: "browser", voice: "zh-CN-XiaoxiaoNeural" },
    { id: "edge_tts", label: "Edge TTS", provider: "edge_tts", voice: "zh-CN-XiaoxiaoNeural" },
    {
      id: "gpt_sovits",
      label: "GPT-SoVITS",
      provider: "gpt_sovits",
      voice: "default",
      gpt_sovits_api_url: "http://127.0.0.1:9880/tts"
    }
  ];

  function clean(value) {
    return String(value || "").trim();
  }

  function createUI(documentObject) {
    const doc = documentObject || {};
    const byId = (id) => (typeof doc.getElementById === "function" ? doc.getElementById(id) : null);
    return {
      openBtn: byId("config-switch-btn"),
      modal: byId("config-switch-modal"),
      closeBtn: byId("config-switch-close-btn"),
      saveBtn: byId("config-switch-save-btn"),
      testLlmBtn: byId("config-switch-test-llm-btn"),
      testTtsBtn: byId("config-switch-test-tts-btn"),
      status: byId("config-switch-status"),
      keyStatus: byId("config-switch-key-status"),
      llmPreset: byId("config-switch-llm-preset"),
      llmBaseUrl: byId("config-switch-llm-base-url"),
      llmModel: byId("config-switch-llm-model"),
      llmApiKeyEnv: byId("config-switch-llm-api-key-env"),
      llmApiKey: byId("config-switch-llm-api-key"),
      ttsProvider: byId("config-switch-tts-provider"),
      ttsVoice: byId("config-switch-tts-voice"),
      ttsBrowserFallback: byId("config-switch-tts-browser-fallback"),
      gptSovitsRow: byId("config-switch-gpt-sovits-row"),
      gptSovitsUrl: byId("config-switch-gpt-sovits-url")
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

  function setChecked(node, value) {
    if (node) {
      node.checked = value === true;
    }
  }

  function setBusy(buttons, busy) {
    for (const button of buttons) {
      if (button) {
        button.disabled = busy === true;
      }
    }
  }

  function setSelectOptions(select, items, getValueFn, getLabelFn) {
    if (!select || !Array.isArray(items)) {
      return;
    }
    const current = select.value;
    select.innerHTML = "";
    for (const item of items) {
      const option = (select.ownerDocument || root.document).createElement("option");
      option.value = getValueFn(item);
      option.textContent = getLabelFn(item);
      select.appendChild(option);
    }
    if (items.some((item) => getValueFn(item) === current)) {
      select.value = current;
    }
  }

  function createController(deps = {}) {
    const documentObject = deps.documentObject || root.document;
    const ui = deps.ui || createUI(documentObject);
    const authFetch = deps.authFetch || root.authFetch || root.fetch?.bind(root);
    const loadConfig = deps.loadConfig || root.loadConfig;
    const setGlobalStatus = deps.setStatus || root.setStatus || (() => {});
    const appendMessage = deps.appendMessage || root.appendMessage || (() => {});
    const runVoiceTestAndAppendReport = deps.runVoiceTestAndAppendReport || root.runVoiceTestAndAppendReport;
    const state = {
      summary: null,
      bound: false
    };

    function setModalOpenClass(isOpen) {
      documentObject?.body?.classList?.toggle("config-switch-open", isOpen === true);
    }

    function getLlmPresets() {
      return Array.isArray(state.summary?.llm_presets) && state.summary.llm_presets.length
        ? state.summary.llm_presets
        : DEFAULT_LLM_PRESETS;
    }

    function getTtsPresets() {
      return Array.isArray(state.summary?.tts_presets) && state.summary.tts_presets.length
        ? state.summary.tts_presets
        : DEFAULT_TTS_PRESETS;
    }

    function findLlmPreset(id) {
      return getLlmPresets().find((item) => item.id === id) || DEFAULT_LLM_PRESETS[0];
    }

    function findTtsPreset(id) {
      return getTtsPresets().find((item) => item.id === id || item.provider === id) || DEFAULT_TTS_PRESETS[0];
    }

    function updateTtsFields() {
      const provider = getValue(ui.ttsProvider) || "browser";
      const isGptSovits = provider === "gpt_sovits";
      if (ui.gptSovitsRow) {
        ui.gptSovitsRow.hidden = !isGptSovits;
      }
      const preset = findTtsPreset(provider);
      if (!getValue(ui.ttsVoice)) {
        setValue(ui.ttsVoice, preset.voice || "");
      }
      if (isGptSovits && !getValue(ui.gptSovitsUrl)) {
        setValue(ui.gptSovitsUrl, preset.gpt_sovits_api_url || "http://127.0.0.1:9880/tts");
      }
    }

    function applyLlmPresetToForm(presetId) {
      const preset = findLlmPreset(presetId);
      if (!preset) {
        return;
      }
      setValue(ui.llmPreset, preset.id || "dashscope");
      setValue(ui.llmBaseUrl, preset.base_url || "");
      setValue(ui.llmModel, preset.model || "");
      setValue(ui.llmApiKeyEnv, preset.api_key_env || "");
      if (ui.llmApiKey) {
        ui.llmApiKey.value = "";
      }
      updateKeyStatus(false);
    }

    function applyTtsPresetToForm(provider) {
      const preset = findTtsPreset(provider);
      if (!preset) {
        return;
      }
      setValue(ui.ttsProvider, preset.provider || preset.id || "browser");
      setValue(ui.ttsVoice, preset.voice || "");
      setValue(ui.gptSovitsUrl, preset.gpt_sovits_api_url || "");
      updateTtsFields();
    }

    function updateKeyStatus(fromSummary = true) {
      const current = state.summary?.current?.llm || {};
      const envName = getValue(ui.llmApiKeyEnv) || current.api_key_env || "";
      const configured = current.api_key_configured === true;
      if (!fromSummary) {
        setText(ui.keyStatus, envName ? `当前密钥变量：${envName}。如需更换，可填写新的 API Key。` : "Ollama 本地模型不需要 API Key。");
        return;
      }
      if (!envName) {
        setText(ui.keyStatus, "当前预设不需要 API Key。");
      } else if (configured) {
        setText(ui.keyStatus, `已检测到 ${envName}。留空即可继续使用已有密钥。`);
      } else {
        setText(ui.keyStatus, `未检测到 ${envName}。填写后会保存到 .env。`);
      }
    }

    function setFormFromSummary(summary) {
      state.summary = summary && typeof summary === "object" ? summary : null;
      setSelectOptions(
        ui.llmPreset,
        getLlmPresets(),
        (item) => item.id,
        (item) => item.label || item.id
      );
      setSelectOptions(
        ui.ttsProvider,
        getTtsPresets(),
        (item) => item.provider || item.id,
        (item) => item.label || item.provider || item.id
      );
      const llm = state.summary?.current?.llm || {};
      const tts = state.summary?.current?.tts || {};
      setValue(ui.llmPreset, llm.preset_id || "dashscope");
      setValue(ui.llmBaseUrl, llm.base_url || findLlmPreset(llm.preset_id || "dashscope")?.base_url || "");
      setValue(ui.llmModel, llm.model || findLlmPreset(llm.preset_id || "dashscope")?.model || "");
      setValue(ui.llmApiKeyEnv, llm.api_key_env || findLlmPreset(llm.preset_id || "dashscope")?.api_key_env || "");
      setValue(ui.llmApiKey, "");
      setValue(ui.ttsProvider, tts.provider || "browser");
      setValue(ui.ttsVoice, tts.voice || findTtsPreset(tts.provider || "browser")?.voice || "");
      setValue(ui.gptSovitsUrl, tts.gpt_sovits_api_url || "http://127.0.0.1:9880/tts");
      setChecked(ui.ttsBrowserFallback, tts.allow_browser_fallback === true);
      updateTtsFields();
      updateKeyStatus(true);
    }

    function buildPayload() {
      return {
        llm: {
          preset_id: getValue(ui.llmPreset) || "dashscope",
          base_url: getValue(ui.llmBaseUrl),
          model: getValue(ui.llmModel),
          api_key_env: getValue(ui.llmApiKeyEnv),
          api_key: getValue(ui.llmApiKey)
        },
        tts: {
          provider: getValue(ui.ttsProvider) || "browser",
          voice: getValue(ui.ttsVoice),
          gpt_sovits_api_url: getValue(ui.gptSovitsUrl),
          allow_browser_fallback: ui.ttsBrowserFallback?.checked === true
        }
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

    async function loadSwitchConfig() {
      setText(ui.status, "正在读取当前本地配置...");
      const data = await fetchJson("/api/config/switch", { cache: "no-store" });
      setFormFromSummary(data);
      setText(ui.status, "已就绪。");
      return data;
    }

    async function saveConfigSwitch() {
      setBusy([ui.saveBtn, ui.testLlmBtn, ui.testTtsBtn], true);
      setText(ui.status, "正在保存本地配置...");
      try {
        const data = await fetchJson("/api/config/switch", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(buildPayload())
        });
        setFormFromSummary(data);
        if (typeof loadConfig === "function") {
          await loadConfig();
        }
        setGlobalStatus("模型 / 语音配置已保存");
        setText(ui.status, data.reload?.ok === false ? `已保存，但重载需要检查：${data.reload.error || "重载失败"}` : "已保存并重载。");
        return data;
      } finally {
        setBusy([ui.saveBtn, ui.testLlmBtn, ui.testTtsBtn], false);
      }
    }

    async function testLlm() {
      setBusy([ui.testLlmBtn], true);
      setText(ui.status, "正在测试模型...");
      try {
        const data = await fetchJson("/api/llm_probe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ probe: "llm_lightweight" })
        });
        const elapsed = Math.round(Number(data.elapsed_ms) || 0);
        setText(ui.status, data.ok === true ? `模型测试通过（${elapsed}ms）。` : "模型测试未返回文本。");
        appendMessage("assistant", `模型测试：${data.ok === true ? "通过" : "失败"}（${elapsed}ms）`, { enableTranslation: false });
        return data;
      } finally {
        setBusy([ui.testLlmBtn], false);
      }
    }

    async function testTts() {
      setBusy([ui.testTtsBtn], true);
      setText(ui.status, "正在测试语音...");
      try {
        if (typeof runVoiceTestAndAppendReport === "function") {
          await runVoiceTestAndAppendReport();
          setText(ui.status, "语音测试已开始，请在聊天记录中查看结果。");
          return { ok: true };
        }
        throw new Error("语音测试工具不可用");
      } finally {
        setBusy([ui.testTtsBtn], false);
      }
    }

    function open() {
      if (ui.modal) {
        ui.modal.hidden = false;
      }
      setModalOpenClass(true);
      loadSwitchConfig().catch((err) => {
        setText(ui.status, `读取失败：${err?.message || err}`);
      });
    }

    function close() {
      if (ui.modal) {
        ui.modal.hidden = true;
      }
      setModalOpenClass(false);
    }

    function bind() {
      if (state.bound) {
        return;
      }
      state.bound = true;
      ui.openBtn?.addEventListener("click", open);
      ui.closeBtn?.addEventListener("click", close);
      ui.saveBtn?.addEventListener("click", () => {
        saveConfigSwitch().catch((err) => {
          setText(ui.status, `保存失败：${err?.message || err}`);
        });
      });
      ui.testLlmBtn?.addEventListener("click", () => {
        testLlm().catch((err) => {
          setText(ui.status, `模型测试失败：${err?.message || err}`);
        });
      });
      ui.testTtsBtn?.addEventListener("click", () => {
        testTts().catch((err) => {
          setText(ui.status, `语音测试失败：${err?.message || err}`);
        });
      });
      ui.llmPreset?.addEventListener("change", () => applyLlmPresetToForm(getValue(ui.llmPreset)));
      ui.ttsProvider?.addEventListener("change", () => applyTtsPresetToForm(getValue(ui.ttsProvider)));
      ui.llmApiKeyEnv?.addEventListener("input", () => updateKeyStatus(false));
      updateTtsFields();
    }

    return {
      applyLlmPresetToForm,
      applyTtsPresetToForm,
      bind,
      buildPayload,
      close,
      loadSwitchConfig,
      open,
      saveConfigSwitch,
      setFormFromSummary,
      testLlm,
      testTts,
      updateTtsFields
    };
  }

  function boot() {
    const controller = createController();
    controller.bind();
    root.__configSwitchController = controller;
  }

  const api = {
    createController,
    createUI
  };

  root.TaffyConfigSwitchController = api;
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
