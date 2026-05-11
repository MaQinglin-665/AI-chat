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
      status: createElement(doc),
      keyStatus: createElement(doc),
      llmPreset: createElement(doc),
      llmBaseUrl: createElement(doc),
      llmModel: createElement(doc),
      llmApiKeyEnv: createElement(doc),
      llmApiKey: createElement(doc),
      ttsProvider: createElement(doc),
      ttsVoice: createElement(doc),
      replyLanguage: createElement(doc),
      ttsAutoVoice: createElement(doc),
      assistantStickerEnabled: createElement(doc),
      assistantStickerChance: createElement(doc),
      assistantStickerCooldown: createElement(doc),
      ttsBrowserFallback: createElement(doc),
      gptSovitsRow: createElement(doc),
      gptSovitsUrl: createElement(doc)
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
    }
  ],
  reply_languages: [
    { id: "zh", label: "中文" },
    { id: "en", label: "English" },
    { id: "ja", label: "日本語" },
    { id: "ko", label: "한국어" },
    { id: "auto", label: "自动跟随" }
  ],
  voice_by_reply_language: {
    zh: "zh-CN-XiaoxiaoNeural",
    en: "en-US-AriaNeural",
    ja: "ja-JP-NanamiNeural",
    ko: "ko-KR-SunHiNeural"
  },
  current: {
    assistant_reply_language: "ja",
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
      auto_voice_by_reply_language: true,
      allow_browser_fallback: true
    },
    stickers: {
      assistant_enabled: true,
      assistant_chance: 0.18,
      assistant_cooldown_ms: 60000
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
  assert.strictEqual(ui.replyLanguage.value, "ja");
  assert.strictEqual(ui.ttsAutoVoice.checked, true);
  assert.strictEqual(ui.assistantStickerEnabled.checked, true);

  controller.applyLlmPresetToForm("ollama");
  assert.strictEqual(ui.llmPreset.value, "ollama");
  assert.strictEqual(ui.llmBaseUrl.value, "http://127.0.0.1:11434");
  assert.strictEqual(ui.llmModel.value, "qwen2.5:7b");
  assert.strictEqual(ui.llmApiKeyEnv.value, "");

  controller.applyTtsPresetToForm("browser");
  assert.strictEqual(ui.ttsProvider.value, "browser");
  assert.strictEqual(ui.gptSovitsRow.hidden, true);
  controller.applyReplyLanguageToForm("ko");
  assert.strictEqual(ui.replyLanguage.value, "ko");
  assert.strictEqual(ui.ttsVoice.value, "ko-KR-SunHiNeural");
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
  ui.replyLanguage.value = "en";
  ui.assistantStickerEnabled.checked = false;
  ui.assistantStickerChance.value = "0.12";
  ui.assistantStickerCooldown.value = "90000";

  await controller.saveConfigSwitch();

  assert.strictEqual(calls.length, 1);
  assert.strictEqual(calls[0].url, "/api/config/switch");
  assert.strictEqual(calls[0].payload.llm.preset_id, "dashscope");
  assert.strictEqual(calls[0].payload.llm.api_key, "sk-not-returned");
  assert.strictEqual(calls[0].payload.tts.allow_browser_fallback, false);
  assert.strictEqual(calls[0].payload.assistant_reply_language, "en");
  assert.strictEqual(calls[0].payload.tts.auto_voice_by_reply_language, true);
  assert.strictEqual(calls[0].payload.stickers.assistant_enabled, false);
  assert.strictEqual(calls[0].payload.stickers.assistant_chance, 0.12);
  assert.strictEqual(calls[0].payload.stickers.assistant_cooldown_ms, 90000);
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
}

async function main() {
  testFormInitializationAndPresetSwitch();
  testOpenCloseModalLayerState();
  testModalCssLayer();
  testConfigSwitchStylesheetLoadedLast();
  testChineseUiCopy();
  await testSavePayloadAndReload();
  await testSaveErrorPropagates();
  console.log("Config switch frontend checks passed.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
