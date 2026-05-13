#!/usr/bin/env node
"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");

const CONFIG_SWITCH_JS = path.resolve(__dirname, "..", "web", "configSwitchController.js");
const CONFIG_SWITCH_CSS = path.resolve(__dirname, "..", "web", "configSwitch.css");
const INDEX_HTML = path.resolve(__dirname, "..", "web", "index.html");
const configSwitch = require(CONFIG_SWITCH_JS);

function createClassList() {
  const classes = new Set();
  return {
    add(name) {
      classes.add(name);
    },
    remove(name) {
      classes.delete(name);
    },
    contains(name) {
      return classes.has(name);
    },
    toggle(name, force) {
      if (force === true) {
        classes.add(name);
      } else if (force === false) {
        classes.delete(name);
      } else if (classes.has(name)) {
        classes.delete(name);
      } else {
        classes.add(name);
      }
      return classes.has(name);
    }
  };
}

function createFakeDocument() {
  return {
    body: {
      classList: createClassList()
    },
    createElement(tag) {
      return {
        tagName: String(tag || "").toUpperCase(),
        value: "",
        textContent: ""
      };
    }
  };
}

function createElement(documentObject, value = "") {
  return {
    value,
    checked: false,
    hidden: false,
    disabled: false,
    textContent: "",
    innerHTML: "",
    classList: createClassList(),
    ownerDocument: documentObject,
    children: [],
    listeners: {},
    appendChild(child) {
      this.children.push(child);
    },
    addEventListener(type, handler) {
      this.listeners[type] = handler;
    }
  };
}

function createUi() {
  const doc = createFakeDocument();
  return {
    doc,
    ui: {
      openBtn: createElement(doc),
      modal: createElement(doc),
      closeBtn: createElement(doc),
      saveBtn: createElement(doc),
      testLlmBtn: createElement(doc),
      testTtsBtn: createElement(doc),
      testLive2dBtn: createElement(doc),
      status: createElement(doc),
      keyStatus: createElement(doc),
      summaryLlm: createElement(doc),
      summaryTts: createElement(doc),
      summaryLive2d: createElement(doc),
      llmPreset: createElement(doc),
      llmBaseUrl: createElement(doc),
      llmModel: createElement(doc),
      llmApiKeyEnv: createElement(doc),
      llmApiKey: createElement(doc),
      ttsProvider: createElement(doc),
      ttsVoice: createElement(doc),
      ttsStreamMode: createElement(doc),
      ttsBrowserFallback: createElement(doc),
      gptSovitsRow: createElement(doc),
      gptSovitsUrl: createElement(doc),
      gptSovitsTimeoutRow: createElement(doc),
      gptSovitsTimeout: createElement(doc),
      volcengineUrlRow: createElement(doc),
      volcengineUrl: createElement(doc),
      volcengineClusterRow: createElement(doc),
      volcengineCluster: createElement(doc),
      live2dPreset: createElement(doc),
      live2dModelPath: createElement(doc),
      live2dScale: createElement(doc),
      live2dXRatio: createElement(doc),
      live2dYRatio: createElement(doc),
      live2dReport: createElement(doc)
    }
  };
}

const SUMMARY = {
  ok: true,
  llm_presets: [
    {
      id: "dashscope",
      label: "DashScope / Qwen",
      base_url: "https://dashscope.aliyuncs.com/compatible-mode/v1",
      model: "qwen-plus",
      api_key_env: "DASHSCOPE_API_KEY"
    },
    {
      id: "ollama",
      label: "Ollama local",
      base_url: "http://127.0.0.1:11434",
      model: "qwen2.5:7b",
      api_key_env: ""
    }
  ],
  tts_presets: [
    { id: "browser", provider: "browser", label: "Browser voice", voice: "zh-CN-XiaoxiaoNeural" },
    {
      id: "gpt_sovits",
      provider: "gpt_sovits",
      label: "GPT-SoVITS",
      voice: "default",
      gpt_sovits_api_url: "http://127.0.0.1:9880/tts"
    },
    {
      id: "volcengine_tts",
      provider: "volcengine_tts",
      label: "Volcengine TTS",
      voice: "S_uos2AQPX1",
      api_url: "https://openspeech.bytedance.com/api/v1/tts",
      cluster: "volcano_icl"
    }
  ],
  live2d_models: [
    {
      id: "/models/hiyori_pro_t11/hiyori_pro_t11.model3.json",
      label: "hiyori_pro_t11",
      model_path: "/models/hiyori_pro_t11/hiyori_pro_t11.model3.json"
    }
  ],
  current: {
    llm: {
      preset_id: "dashscope",
      base_url: "https://dashscope.aliyuncs.com/compatible-mode/v1",
      model: "qwen-plus",
      api_key_env: "DASHSCOPE_API_KEY",
      api_key_configured: true
    },
    tts: {
      provider: "gpt_sovits",
      voice: "default",
      gpt_sovits_api_url: "http://127.0.0.1:9880/tts",
      gpt_sovits_timeout_sec: 60,
      stream_mode: "realtime",
      allow_browser_fallback: true
    },
    live2d: {
      preset_id: "/models/hiyori_pro_t11/hiyori_pro_t11.model3.json",
      model_path: "/models/hiyori_pro_t11/hiyori_pro_t11.model3.json",
      scale: 1.1,
      x_ratio: 0.28,
      y_ratio: 0.94,
      motion_groups: [
        { name: "Idle", count: 3 },
        { name: "Tap@Body", count: 1 }
      ],
      expressions: [{ name: "smile", file: "expressions/smile.exp3.json" }],
      compatibility: {
        warnings: ["missing_motion_families"],
        missing_motion_families: ["speech"]
      }
    }
  }
};

function testFormInitializationAndPresetSwitch() {
  const { doc, ui } = createUi();
  const controller = configSwitch.createController({ documentObject: doc, ui, authFetch: async () => ({ ok: true, json: async () => SUMMARY }) });

  controller.setFormFromSummary(SUMMARY);

  assert.strictEqual(ui.llmPreset.value, "dashscope");
  assert.strictEqual(ui.llmBaseUrl.value, "https://dashscope.aliyuncs.com/compatible-mode/v1");
  assert.strictEqual(ui.llmApiKey.value, "");
  assert.ok(ui.keyStatus.textContent.includes("已检测到"));
  assert.strictEqual(ui.ttsProvider.value, "gpt_sovits");
  assert.strictEqual(ui.gptSovitsRow.hidden, false);
  assert.strictEqual(ui.gptSovitsTimeoutRow.hidden, false);
  assert.strictEqual(ui.volcengineUrlRow.hidden, true);
  assert.strictEqual(ui.ttsStreamMode.value, "realtime");
  assert.strictEqual(ui.live2dPreset.value, "/models/hiyori_pro_t11/hiyori_pro_t11.model3.json");
  assert.strictEqual(ui.live2dModelPath.value, "/models/hiyori_pro_t11/hiyori_pro_t11.model3.json");
  assert.strictEqual(ui.live2dScale.value, "1.1");
  assert.ok(ui.live2dReport.textContent.includes("Motion groups: Idle(3), Tap@Body(1)"));
  assert.ok(ui.live2dReport.textContent.includes("Missing families: speech"));
  assert.strictEqual(ui.live2dReport.classList.contains("config-switch-live2d-report-warning"), true);
  assert.ok(ui.summaryLlm.textContent.includes("qwen-plus"));
  assert.ok(ui.summaryTts.textContent.includes("GPT-SoVITS"));
  assert.ok(ui.summaryLive2d.textContent.includes("hiyori_pro_t11"));

  controller.applyLlmPresetToForm("ollama");
  assert.strictEqual(ui.llmPreset.value, "ollama");
  assert.strictEqual(ui.llmBaseUrl.value, "http://127.0.0.1:11434");
  assert.strictEqual(ui.llmModel.value, "qwen2.5:7b");
  assert.strictEqual(ui.llmApiKeyEnv.value, "");

  controller.applyTtsPresetToForm("browser");
  assert.strictEqual(ui.ttsProvider.value, "browser");
  assert.strictEqual(ui.gptSovitsRow.hidden, true);

  controller.applyTtsPresetToForm("volcengine_tts");
  assert.strictEqual(ui.ttsProvider.value, "volcengine_tts");
  assert.strictEqual(ui.volcengineUrlRow.hidden, false);
  assert.strictEqual(ui.volcengineCluster.value, "volcano_icl");

  controller.applyLive2dPresetToForm("/models/hiyori_pro_t11/hiyori_pro_t11.model3.json");
  assert.strictEqual(ui.live2dModelPath.value, "/models/hiyori_pro_t11/hiyori_pro_t11.model3.json");
}

async function testSavePayloadAndReload() {
  const { doc, ui } = createUi();
  const calls = [];
  let reloaded = 0;
  const controller = configSwitch.createController({
    documentObject: doc,
    ui,
    loadConfig: async () => {
      reloaded += 1;
    },
    authFetch: async (url, init = {}) => {
      calls.push({ url, init, payload: init.body ? JSON.parse(init.body) : null });
      return { ok: true, status: 200, json: async () => SUMMARY };
    }
  });

  controller.setFormFromSummary(SUMMARY);
  ui.llmApiKey.value = "sk-not-returned";
  ui.ttsBrowserFallback.checked = false;

  await controller.saveConfigSwitch();

  assert.strictEqual(calls.length, 1);
  assert.strictEqual(calls[0].url, "/api/config/switch");
  assert.strictEqual(calls[0].payload.llm.preset_id, "dashscope");
  assert.strictEqual(calls[0].payload.llm.api_key, "sk-not-returned");
  assert.strictEqual(calls[0].payload.tts.allow_browser_fallback, false);
  assert.strictEqual(calls[0].payload.tts.stream_mode, "realtime");
  assert.strictEqual(calls[0].payload.live2d.model_path, "/models/hiyori_pro_t11/hiyori_pro_t11.model3.json");
  assert.strictEqual(calls[0].payload.live2d.scale, 1.1);
  assert.strictEqual(reloaded, 1);
  assert.ok(ui.status.textContent.includes("已保存"));
}

async function testSaveErrorPropagates() {
  const { doc, ui } = createUi();
  const controller = configSwitch.createController({
    documentObject: doc,
    ui,
    authFetch: async () => ({ ok: false, status: 400, json: async () => ({ error: "bad config" }) })
  });

  controller.setFormFromSummary(SUMMARY);
  await assert.rejects(() => controller.saveConfigSwitch(), /bad config/);
}

async function testCurrentFormChecksUseDraftPayloads() {
  const { doc, ui } = createUi();
  const calls = [];
  const played = [];
  const controller = configSwitch.createController({
    documentObject: doc,
    ui,
    playAudioBlob: async (blob) => {
      played.push(blob);
      return true;
    },
    authFetch: async (url, init = {}) => {
      const payload = init.body ? JSON.parse(init.body) : null;
      calls.push({ url, init, payload });
      if (url === "/api/config/switch/test_llm") {
        return { ok: true, status: 200, json: async () => ({ ok: true, elapsed_ms: 12 }) };
      }
      if (url === "/api/config/switch/test_tts") {
        return { ok: true, status: 200, blob: async () => new Blob(["audio"], { type: "audio/mpeg" }) };
      }
      if (url === "/api/config/switch/validate_live2d") {
        return { ok: true, status: 200, json: async () => ({ ok: true, live2d: payload.live2d, reload_required: true }) };
      }
      return { ok: true, status: 200, json: async () => SUMMARY };
    }
  });

  controller.setFormFromSummary(SUMMARY);
  await controller.testLlm();
  await controller.testTts();
  await controller.testLive2d();

  assert.strictEqual(calls[0].url, "/api/config/switch/test_llm");
  assert.strictEqual(calls[0].payload.llm.model, "qwen-plus");
  assert.strictEqual(calls[0].payload.tts, undefined);
  assert.strictEqual(calls[0].payload.live2d, undefined);
  assert.strictEqual(calls[1].url, "/api/config/switch/test_tts");
  assert.strictEqual(calls[1].payload.tts.provider, "gpt_sovits");
  assert.strictEqual(calls[1].payload.llm, undefined);
  assert.strictEqual(calls[1].payload.live2d, undefined);
  assert.strictEqual(calls[1].payload.text, "这是一句语音测试。");
  assert.strictEqual(played.length, 1);
  assert.strictEqual(calls[2].url, "/api/config/switch/validate_live2d");
  assert.strictEqual(calls[2].payload.live2d.model_path, "/models/hiyori_pro_t11/hiyori_pro_t11.model3.json");
  assert.ok(ui.status.textContent.includes("Live2D"));
}

function testOpenCloseModalLayerState() {
  const { doc, ui } = createUi();
  const controller = configSwitch.createController({
    documentObject: doc,
    ui,
    authFetch: async () => ({ ok: true, status: 200, json: async () => SUMMARY })
  });

  controller.open();
  assert.strictEqual(ui.modal.hidden, false);
  assert.strictEqual(doc.body.classList.contains("config-switch-open"), true);

  controller.close();
  assert.strictEqual(ui.modal.hidden, true);
  assert.strictEqual(doc.body.classList.contains("config-switch-open"), false);
}

function testModalCssLayer() {
  const css = fs.readFileSync(CONFIG_SWITCH_CSS, "utf8");
  const modalBlock = css.match(/\.config-switch-modal\s*\{([\s\S]*?)\}/);
  const dialogBlock = css.match(/\.config-switch-dialog\s*\{([\s\S]*?)\}/);
  assert.ok(modalBlock, "config switch modal CSS block should exist");
  assert.ok(dialogBlock, "config switch dialog CSS block should exist");
  const zIndex = modalBlock[1].match(/z-index:\s*(\d+)/);
  assert.ok(zIndex, "config switch modal needs an explicit z-index");
  assert.ok(Number(zIndex[1]) > 9999, "config switch modal should sit above the subtitle layer");
  assert.ok(/pointer-events:\s*auto/.test(modalBlock[1]));
  assert.ok(/position:\s*relative/.test(dialogBlock[1]));
}

function testConfigSwitchStylesheetLoadedLast() {
  const html = fs.readFileSync(INDEX_HTML, "utf8");
  const stylesheetHrefs = Array.from(html.matchAll(/<link\s+[^>]*rel="stylesheet"[^>]*href="([^"]+)"/g))
    .map((match) => match[1]);
  assert.ok(stylesheetHrefs.includes("./base.css"), "base stylesheet should be present");
  assert.ok(stylesheetHrefs.includes("./configSwitch.css"), "config switch stylesheet should be linked");
  assert.strictEqual(stylesheetHrefs[stylesheetHrefs.length - 1], "./configSwitch.css");
}

function testLive2dReportCss() {
  const css = fs.readFileSync(CONFIG_SWITCH_CSS, "utf8");
  assert.ok(css.includes(".config-switch-live2d-report"), "Live2D compatibility report CSS should exist");
  assert.ok(css.includes(".config-switch-live2d-report-warning"), "Live2D warning report CSS should exist");
  assert.ok(/white-space:\s*pre-line/.test(css), "Live2D report should preserve line breaks");
}

function testChineseUiCopy() {
  const html = fs.readFileSync(INDEX_HTML, "utf8");
  for (const text of [
    "模型 / 语音配置",
    "聊天模型",
    "语音合成",
    "预设",
    "接口地址",
    "密钥变量名",
    "测试模型",
    "测试语音",
    "保存配置"
  ]) {
    assert.ok(html.includes(text), `config switch UI should include Chinese label: ${text}`);
  }
  for (const id of [
    "config-switch-summary-llm",
    "config-switch-summary-tts",
    "config-switch-summary-live2d",
    "config-switch-test-live2d-btn",
    "config-switch-tts-stream-mode",
    "config-switch-live2d-preset",
    "config-switch-live2d-model-path",
    "config-switch-live2d-report"
  ]) {
    assert.ok(html.includes(id), `config switch UI should include ${id}`);
  }
}

async function main() {
  testFormInitializationAndPresetSwitch();
  testOpenCloseModalLayerState();
  testModalCssLayer();
  testConfigSwitchStylesheetLoadedLast();
  testLive2dReportCss();
  testChineseUiCopy();
  await testSavePayloadAndReload();
  await testSaveErrorPropagates();
  await testCurrentFormChecksUseDraftPayloads();
  console.log("Config switch frontend checks passed.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
