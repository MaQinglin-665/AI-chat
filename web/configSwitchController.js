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
    },
    {
      id: "volcengine_tts",
      label: "Volcengine TTS",
      provider: "volcengine_tts",
      voice: "S_uos2AQPX1",
      api_url: "https://openspeech.bytedance.com/api/v1/tts",
      cluster: "volcano_icl"
    }
  ];

  const LIVE2D_CUSTOM_ID = "__custom_live2d__";

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
      testLive2dBtn: byId("config-switch-test-live2d-btn"),
      status: byId("config-switch-status"),
      keyStatus: byId("config-switch-key-status"),
      summaryLlm: byId("config-switch-summary-llm"),
      summaryTts: byId("config-switch-summary-tts"),
      summaryLive2d: byId("config-switch-summary-live2d"),
      llmPreset: byId("config-switch-llm-preset"),
      llmBaseUrl: byId("config-switch-llm-base-url"),
      llmModel: byId("config-switch-llm-model"),
      llmApiKeyEnv: byId("config-switch-llm-api-key-env"),
      llmApiKey: byId("config-switch-llm-api-key"),
      ttsProvider: byId("config-switch-tts-provider"),
      ttsVoice: byId("config-switch-tts-voice"),
      ttsStreamMode: byId("config-switch-tts-stream-mode"),
      ttsBrowserFallback: byId("config-switch-tts-browser-fallback"),
      gptSovitsRow: byId("config-switch-gpt-sovits-row"),
      gptSovitsUrl: byId("config-switch-gpt-sovits-url"),
      gptSovitsTimeoutRow: byId("config-switch-gpt-sovits-timeout-row"),
      gptSovitsTimeout: byId("config-switch-gpt-sovits-timeout"),
      volcengineUrlRow: byId("config-switch-volcengine-url-row"),
      volcengineUrl: byId("config-switch-volcengine-url"),
      volcengineClusterRow: byId("config-switch-volcengine-cluster-row"),
      volcengineCluster: byId("config-switch-volcengine-cluster"),
      live2dPreset: byId("config-switch-live2d-preset"),
      live2dModelPath: byId("config-switch-live2d-model-path"),
      live2dScale: byId("config-switch-live2d-scale"),
      live2dXRatio: byId("config-switch-live2d-x-ratio"),
      live2dYRatio: byId("config-switch-live2d-y-ratio"),
      live2dReport: byId("config-switch-live2d-report")
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

  function getNumberValue(node, fallback, min, max) {
    const num = Number(node?.value);
    const base = Number.isFinite(num) ? num : Number(fallback);
    return Math.max(Number(min), Math.min(Number(max), base));
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
    const playAudioBlob = typeof deps.playAudioBlob === "function"
      ? deps.playAudioBlob
      : async (blob) => {
          if (!blob || typeof root.Audio !== "function" || !root.URL?.createObjectURL) {
            return false;
          }
          const url = root.URL.createObjectURL(blob);
          try {
            const audio = new root.Audio(url);
            await audio.play();
            return true;
          } finally {
            root.setTimeout?.(() => root.URL.revokeObjectURL?.(url), 3000);
          }
        };
    const state = {
      summary: null,
      bound: false,
      lastValidatedLive2d: null
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

    function getLive2dModels() {
      return Array.isArray(state.summary?.live2d_models)
        ? state.summary.live2d_models.filter((item) => item && item.model_path)
        : [];
    }

    function findLlmPreset(id) {
      return getLlmPresets().find((item) => item.id === id) || DEFAULT_LLM_PRESETS[0];
    }

    function findTtsPreset(id) {
      return getTtsPresets().find((item) => item.id === id || item.provider === id) || DEFAULT_TTS_PRESETS[0];
    }

    function findLive2dModel(modelPath) {
      const path = clean(modelPath);
      return getLive2dModels().find((item) => clean(item.model_path) === path) || null;
    }

    function summarizeNamedItems(items, maxCount = 6) {
      if (!Array.isArray(items) || !items.length) {
        return "none";
      }
      const names = items
        .map((item) => {
          if (!item || typeof item !== "object") {
            return clean(item);
          }
          const name = clean(item.name);
          const count = Number(item.count);
          return count > 0 ? `${name}(${count})` : name;
        })
        .filter(Boolean);
      if (!names.length) {
        return "none";
      }
      const head = names.slice(0, maxCount).join(", ");
      return names.length > maxCount ? `${head}, +${names.length - maxCount}` : head;
    }

    function pickLive2dReportSource(path) {
      const live2dPath = clean(path);
      if (state.lastValidatedLive2d && clean(state.lastValidatedLive2d.model_path) === live2dPath) {
        return state.lastValidatedLive2d;
      }
      const current = state.summary?.current?.live2d;
      if (current && clean(current.model_path) === live2dPath) {
        return current;
      }
      return null;
    }

    function renderLive2dReport(live2d, draftPath = "") {
      if (!ui.live2dReport) {
        return;
      }
      const source = live2d && typeof live2d === "object" ? live2d : null;
      const path = clean(source?.model_path) || clean(draftPath);
      if (!source) {
        setText(
          ui.live2dReport,
          path
            ? "Live2D report: click Check model to inspect motion groups and expressions."
            : "Live2D report: choose a model to inspect motion groups and expressions."
        );
        ui.live2dReport.classList?.toggle("config-switch-live2d-report-warning", false);
        return;
      }
      const compatibility = source.compatibility && typeof source.compatibility === "object" ? source.compatibility : {};
      const missing = Array.isArray(compatibility.missing_motion_families)
        ? compatibility.missing_motion_families.filter(Boolean)
        : [];
      const warnings = Array.isArray(compatibility.warnings) ? compatibility.warnings.filter(Boolean) : [];
      const parts = [
        `Motion groups: ${summarizeNamedItems(source.motion_groups)}`,
        `Expressions: ${summarizeNamedItems(source.expressions)}`
      ];
      if (missing.length) {
        parts.push(`Missing families: ${missing.join(", ")}`);
      }
      if (warnings.length) {
        parts.push(`Warnings: ${warnings.join(", ")}`);
      }
      if (!missing.length && !warnings.length) {
        parts.push("Compatibility: ready");
      }
      setText(ui.live2dReport, parts.join("\n"));
      ui.live2dReport.classList?.toggle("config-switch-live2d-report-warning", missing.length > 0 || warnings.length > 0);
    }

    function updateLive2dReportFromForm() {
      const path = getValue(ui.live2dModelPath);
      renderLive2dReport(pickLive2dReportSource(path), path);
    }

    function buildLive2dOptions(currentPath = "") {
      const items = getLive2dModels().map((item) => ({
        id: clean(item.model_path),
        label: item.label || item.model_path,
        model_path: clean(item.model_path)
      }));
      const hasCurrent = currentPath && items.some((item) => item.model_path === currentPath);
      if (currentPath && !hasCurrent) {
        items.push({
          id: currentPath,
          label: `Current custom: ${currentPath}`,
          model_path: currentPath
        });
      }
      items.push({
        id: LIVE2D_CUSTOM_ID,
        label: "Custom path",
        model_path: ""
      });
      return items;
    }

    function updateTtsFields() {
      const provider = getValue(ui.ttsProvider) || "browser";
      const isGptSovits = provider === "gpt_sovits";
      const isVolcengine = provider === "volcengine_tts" || provider === "volcengine";
      if (ui.gptSovitsRow) {
        ui.gptSovitsRow.hidden = !isGptSovits;
      }
      if (ui.gptSovitsTimeoutRow) {
        ui.gptSovitsTimeoutRow.hidden = !isGptSovits;
      }
      if (ui.volcengineUrlRow) {
        ui.volcengineUrlRow.hidden = !isVolcengine;
      }
      if (ui.volcengineClusterRow) {
        ui.volcengineClusterRow.hidden = !isVolcengine;
      }
      const preset = findTtsPreset(provider);
      if (!getValue(ui.ttsVoice)) {
        setValue(ui.ttsVoice, preset.voice || "");
      }
      if (isGptSovits && !getValue(ui.gptSovitsUrl)) {
        setValue(ui.gptSovitsUrl, preset.gpt_sovits_api_url || "http://127.0.0.1:9880/tts");
      }
      if (isGptSovits && !getValue(ui.gptSovitsTimeout)) {
        setValue(ui.gptSovitsTimeout, "60");
      }
      if (isVolcengine && !getValue(ui.volcengineUrl)) {
        setValue(ui.volcengineUrl, preset.api_url || "https://openspeech.bytedance.com/api/v1/tts");
      }
      if (isVolcengine && !getValue(ui.volcengineCluster)) {
        setValue(ui.volcengineCluster, preset.cluster || "volcano_icl");
      }
      updateRuntimeSummary();
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
      updateRuntimeSummary();
    }

    function applyTtsPresetToForm(provider) {
      const preset = findTtsPreset(provider);
      if (!preset) {
        return;
      }
      setValue(ui.ttsProvider, preset.provider || preset.id || "browser");
      setValue(ui.ttsVoice, preset.voice || "");
      setValue(ui.gptSovitsUrl, preset.gpt_sovits_api_url || "");
      setValue(ui.gptSovitsTimeout, "60");
      setValue(ui.volcengineUrl, preset.api_url || "");
      setValue(ui.volcengineCluster, preset.cluster || "");
      updateTtsFields();
    }

    function applyLive2dPresetToForm(modelPath) {
      const path = clean(modelPath);
      if (!path || path === LIVE2D_CUSTOM_ID) {
        setValue(ui.live2dPreset, LIVE2D_CUSTOM_ID);
        updateRuntimeSummary();
        return;
      }
      setValue(ui.live2dPreset, path);
      setValue(ui.live2dModelPath, path);
      updateRuntimeSummary();
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

    function updateRuntimeSummary() {
      const llmPreset = findLlmPreset(getValue(ui.llmPreset) || "dashscope");
      const llmModel = getValue(ui.llmModel) || llmPreset?.model || "-";
      const ttsProvider = getValue(ui.ttsProvider) || "browser";
      const ttsPreset = findTtsPreset(ttsProvider);
      const ttsVoice = getValue(ui.ttsVoice) || ttsPreset?.voice || "-";
      const live2dPath = getValue(ui.live2dModelPath);
      const live2dModel = findLive2dModel(live2dPath);
      setText(ui.summaryLlm, `${llmPreset?.label || llmPreset?.id || "Custom"} / ${llmModel}`);
      setText(ui.summaryTts, `${ttsPreset?.label || ttsProvider} / ${ttsVoice}`);
      setText(ui.summaryLive2d, live2dModel?.label || live2dPath || "Not set");
      updateLive2dReportFromForm();
    }

    function setFormFromSummary(summary) {
      state.summary = summary && typeof summary === "object" ? summary : null;
      state.lastValidatedLive2d = null;
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
      const live2d = state.summary?.current?.live2d || {};
      const live2dPath = clean(live2d.model_path);
      setSelectOptions(
        ui.live2dPreset,
        buildLive2dOptions(live2dPath),
        (item) => item.id,
        (item) => item.label || item.model_path || item.id
      );
      setValue(ui.llmPreset, llm.preset_id || "dashscope");
      setValue(ui.llmBaseUrl, llm.base_url || findLlmPreset(llm.preset_id || "dashscope")?.base_url || "");
      setValue(ui.llmModel, llm.model || findLlmPreset(llm.preset_id || "dashscope")?.model || "");
      setValue(ui.llmApiKeyEnv, llm.api_key_env || findLlmPreset(llm.preset_id || "dashscope")?.api_key_env || "");
      setValue(ui.llmApiKey, "");
      setValue(ui.ttsProvider, tts.provider || "browser");
      setValue(ui.ttsVoice, tts.voice || findTtsPreset(tts.provider || "browser")?.voice || "");
      setValue(ui.gptSovitsUrl, tts.gpt_sovits_api_url || "http://127.0.0.1:9880/tts");
      setValue(ui.gptSovitsTimeout, tts.gpt_sovits_timeout_sec || "60");
      setValue(ui.ttsStreamMode, ["final_only", "realtime"].includes(tts.stream_mode) ? tts.stream_mode : "realtime");
      setValue(ui.volcengineUrl, tts.api_url || "https://openspeech.bytedance.com/api/v1/tts");
      setValue(ui.volcengineCluster, tts.cluster || "volcano_icl");
      setChecked(ui.ttsBrowserFallback, tts.allow_browser_fallback === true);
      setValue(ui.live2dPreset, findLive2dModel(live2dPath) ? live2dPath : LIVE2D_CUSTOM_ID);
      setValue(ui.live2dModelPath, live2dPath);
      setValue(ui.live2dScale, live2d.scale || 1);
      setValue(ui.live2dXRatio, live2d.x_ratio ?? 0.26);
      setValue(ui.live2dYRatio, live2d.y_ratio ?? 0.96);
      updateTtsFields();
      updateKeyStatus(true);
      updateRuntimeSummary();
    }

    function buildLive2dPayload() {
      const modelPath = getValue(ui.live2dModelPath).replace(/\\/g, "/");
      if (!modelPath || modelPath.toLowerCase().includes("your_model")) {
        return null;
      }
      return {
        model_path: modelPath,
        scale: getNumberValue(ui.live2dScale, 1, 0.1, 3),
        x_ratio: getNumberValue(ui.live2dXRatio, 0.26, 0, 1),
        y_ratio: getNumberValue(ui.live2dYRatio, 0.96, 0, 1)
      };
    }

    function buildPayload() {
      const payload = {
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
          stream_mode: getValue(ui.ttsStreamMode) || "realtime",
          gpt_sovits_api_url: getValue(ui.gptSovitsUrl),
          gpt_sovits_timeout_sec: getNumberValue(ui.gptSovitsTimeout, 60, 1, 180),
          api_url: getValue(ui.volcengineUrl),
          cluster: getValue(ui.volcengineCluster),
          allow_browser_fallback: ui.ttsBrowserFallback?.checked === true
        }
      };
      const live2d = buildLive2dPayload();
      if (live2d) {
        payload.live2d = live2d;
      }
      return payload;
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

    async function fetchAudioBlob(url, init = {}) {
      if (typeof authFetch !== "function") {
        throw new Error("authFetch is not available");
      }
      const resp = await authFetch(url, init);
      if (!resp.ok) {
        let detail = `HTTP ${resp.status}`;
        try {
          const data = await resp.json();
          detail = data?.error || data?.reason || detail;
        } catch (_) {
          // ignore
        }
        throw new Error(detail);
      }
      return resp.blob();
    }

    async function loadSwitchConfig() {
      setText(ui.status, "正在读取当前本地配置...");
      const data = await fetchJson("/api/config/switch", { cache: "no-store" });
      setFormFromSummary(data);
      setText(ui.status, "已就绪。");
      return data;
    }

    async function saveConfigSwitch() {
      setBusy([ui.saveBtn, ui.testLlmBtn, ui.testTtsBtn, ui.testLive2dBtn], true);
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
        const live2dHint = data.saved?.live2d ? " Live2D 模型保存成功，已加载的窗口刷新后会切换。" : "";
        setText(ui.status, data.reload?.ok === false ? `已保存，但重载需要检查：${data.reload.error || "重载失败"}` : `已保存并重载。${live2dHint}`);
        return data;
      } finally {
        setBusy([ui.saveBtn, ui.testLlmBtn, ui.testTtsBtn, ui.testLive2dBtn], false);
      }
    }

    async function testLlm() {
      setBusy([ui.testLlmBtn], true);
      setText(ui.status, "正在测试模型...");
      try {
        const payload = buildPayload();
        const data = await fetchJson("/api/config/switch/test_llm", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ llm: payload.llm })
        });
        const elapsed = Math.round(Number(data.elapsed_ms) || 0);
        setText(ui.status, data.ok === true ? `模型测试通过（${elapsed}ms）。` : "模型测试未返回文本。");
        appendMessage("assistant", `模型测试：${data.ok === true ? "通过" : "失败"}（${elapsed}ms）`, { enableTranslation: false });
        return data;
      } finally {
        setBusy([ui.testLlmBtn], false);
      }
    }

    async function testLive2d() {
      setBusy([ui.testLive2dBtn], true);
      setText(ui.status, "正在检查 Live2D 模型...");
      try {
        const data = await fetchJson("/api/config/switch/validate_live2d", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ live2d: buildLive2dPayload() || { model_path: getValue(ui.live2dModelPath) } })
        });
        const path = data.live2d?.model_path || getValue(ui.live2dModelPath);
        state.lastValidatedLive2d = data.live2d || null;
        renderLive2dReport(state.lastValidatedLive2d, path);
        setText(ui.status, `Live2D 模型路径可用：${path}。保存后刷新窗口即可切换。`);
        return data;
      } finally {
        setBusy([ui.testLive2dBtn], false);
      }
    }

    async function testTts() {
      setBusy([ui.testTtsBtn], true);
      setText(ui.status, "正在测试语音...");
      try {
        if ((getValue(ui.ttsProvider) || "browser") !== "browser") {
          const payload = buildPayload();
          const blob = await fetchAudioBlob("/api/config/switch/test_tts", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              tts: payload.tts,
              text: "这是一句语音测试。"
            })
          });
          await playAudioBlob(blob);
          setText(ui.status, "当前表单语音测试通过，已播放测试音频。");
          appendMessage("assistant", "语音测试通过：当前表单配置可以生成音频。", { enableTranslation: false });
          return { ok: true };
        }
        if (typeof runVoiceTestAndAppendReport === "function") {
          await runVoiceTestAndAppendReport();
          setText(ui.status, "浏览器语音测试已开始；保存后会使用当前浏览器语音配置。");
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
      ui.testLive2dBtn?.addEventListener("click", () => {
        testLive2d().catch((err) => {
          setText(ui.status, `Live2D 检查失败：${err?.message || err}`);
        });
      });
      ui.llmPreset?.addEventListener("change", () => applyLlmPresetToForm(getValue(ui.llmPreset)));
      ui.ttsProvider?.addEventListener("change", () => applyTtsPresetToForm(getValue(ui.ttsProvider)));
      ui.llmApiKeyEnv?.addEventListener("input", () => updateKeyStatus(false));
      ui.llmModel?.addEventListener("input", updateRuntimeSummary);
      ui.ttsVoice?.addEventListener("input", updateRuntimeSummary);
      ui.ttsStreamMode?.addEventListener("change", updateRuntimeSummary);
      ui.gptSovitsUrl?.addEventListener("input", updateRuntimeSummary);
      ui.gptSovitsTimeout?.addEventListener("input", updateRuntimeSummary);
      ui.volcengineUrl?.addEventListener("input", updateRuntimeSummary);
      ui.volcengineCluster?.addEventListener("input", updateRuntimeSummary);
      ui.live2dPreset?.addEventListener("change", () => applyLive2dPresetToForm(getValue(ui.live2dPreset)));
      ui.live2dModelPath?.addEventListener("input", () => {
        const path = getValue(ui.live2dModelPath);
        setValue(ui.live2dPreset, findLive2dModel(path) ? path : LIVE2D_CUSTOM_ID);
        updateRuntimeSummary();
      });
      ui.live2dScale?.addEventListener("input", updateRuntimeSummary);
      ui.live2dXRatio?.addEventListener("input", updateRuntimeSummary);
      ui.live2dYRatio?.addEventListener("input", updateRuntimeSummary);
      updateTtsFields();
    }

    return {
      applyLlmPresetToForm,
      applyLive2dPresetToForm,
      applyTtsPresetToForm,
      bind,
      buildLive2dPayload,
      buildPayload,
      close,
      loadSwitchConfig,
      open,
      saveConfigSwitch,
      setFormFromSummary,
      testLive2d,
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
