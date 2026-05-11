#!/usr/bin/env node
"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");

const FIRST_RUN_JS = path.resolve(__dirname, "..", "web", "firstRunWizardController.js");
const INDEX_HTML = path.resolve(__dirname, "..", "web", "index.html");
const BASE_CSS = path.resolve(__dirname, "..", "web", "base.css");
const firstRun = require(FIRST_RUN_JS);

function createClassList() {
  const classes = new Set();
  return {
    contains(name) {
      return classes.has(name);
    },
    toggle(name, force) {
      if (force === true) {
        classes.add(name);
      } else if (force === false) {
        classes.delete(name);
      }
      return classes.has(name);
    }
  };
}

function createFakeDocument() {
  return {
    body: { classList: createClassList() },
    createElement(tag) {
      return { tagName: String(tag || "").toUpperCase(), value: "", textContent: "" };
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
    ownerDocument: documentObject,
    listeners: {},
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
      modal: createElement(doc),
      closeBtn: createElement(doc),
      saveBtn: createElement(doc),
      testBtn: createElement(doc),
      status: createElement(doc),
      provider: createElement(doc),
      baseUrl: createElement(doc),
      model: createElement(doc),
      apiKeyEnv: createElement(doc),
      apiKey: createElement(doc),
      summary: createElement(doc)
    }
  };
}

const STATUS_NEEDS_SETUP = {
  ok: true,
  first_run: {
    onboarding_completed: false,
    needs_first_run: true
  },
  llm: {
    configured: false,
    provider: "openai-compatible",
    base_url: "http://127.0.0.1:8000/v1",
    model: "gpt-4o-mini",
    api_key_env: "TAFFY_LLM_API_KEY",
    api_key_configured: false,
    api_key_returned: false
  },
  live2d: { ok: false },
  safety: { ok: true }
};

const STATUS_READY = {
  ok: true,
  first_run: {
    onboarding_completed: true,
    needs_first_run: false
  },
  llm: {
    configured: true,
    provider: "openai-compatible",
    base_url: "https://api.example.test/v1",
    model: "demo-model",
    api_key_env: "TAFFY_LLM_API_KEY",
    api_key_configured: true,
    api_key_returned: false
  },
  live2d: { ok: true },
  safety: { ok: true }
};

function testFormInitializationAndProviderDefaults() {
  const { doc, ui } = createUi();
  const controller = firstRun.createController({ documentObject: doc, ui, authFetch: async () => ({ ok: true, json: async () => STATUS_NEEDS_SETUP }) });

  controller.setFormFromStatus(STATUS_NEEDS_SETUP);

  assert.strictEqual(ui.provider.value, "openai-compatible");
  assert.strictEqual(ui.baseUrl.value, "http://127.0.0.1:8000/v1");
  assert.strictEqual(ui.model.value, "gpt-4o-mini");
  assert.strictEqual(ui.apiKeyEnv.value, "TAFFY_LLM_API_KEY");
  assert.strictEqual(ui.apiKey.value, "");
  assert.ok(controller.shouldOpenFromStatus(STATUS_NEEDS_SETUP));

  controller.applyProviderDefaults("ollama", { force: true });
  assert.strictEqual(ui.provider.value, "ollama");
  assert.strictEqual(ui.baseUrl.value, "http://127.0.0.1:11434");
  assert.strictEqual(ui.model.value, "qwen2.5:7b");
  assert.strictEqual(ui.apiKeyEnv.value, "");
}

function testOpenCloseLayerState() {
  const { doc, ui } = createUi();
  const controller = firstRun.createController({ documentObject: doc, ui, authFetch: async () => ({ ok: true, json: async () => STATUS_READY }) });

  controller.open();
  assert.strictEqual(ui.modal.hidden, false);
  assert.strictEqual(doc.body.classList.contains("first-run-open"), true);

  controller.close();
  assert.strictEqual(ui.modal.hidden, true);
  assert.strictEqual(doc.body.classList.contains("first-run-open"), false);
}

async function testSaveAndProbeUsesFirstRunApiWithoutReturningKey() {
  const { doc, ui } = createUi();
  const calls = [];
  let reloaded = 0;
  const controller = firstRun.createController({
    documentObject: doc,
    ui,
    loadConfig: async () => {
      reloaded += 1;
    },
    authFetch: async (url, init = {}) => {
      calls.push({ url, init, payload: init.body ? JSON.parse(init.body) : null });
      if (url === "/api/llm_probe") {
        return { ok: true, status: 200, json: async () => ({ ok: true, elapsed_ms: 42 }) };
      }
      return { ok: true, status: 200, json: async () => STATUS_READY };
    }
  });

  controller.setFormFromStatus(STATUS_NEEDS_SETUP);
  ui.baseUrl.value = "https://api.example.test/v1";
  ui.model.value = "demo-model";
  ui.apiKey.value = "sk-not-returned";

  await controller.saveAndProbe();

  assert.strictEqual(calls.length, 2);
  assert.strictEqual(calls[0].url, "/api/first_run/configure_llm");
  assert.strictEqual(calls[0].payload.provider, "openai-compatible");
  assert.strictEqual(calls[0].payload.api_key, "sk-not-returned");
  assert.strictEqual(calls[1].url, "/api/llm_probe");
  assert.strictEqual(ui.apiKey.value, "");
  assert.strictEqual(reloaded, 1);
  assert.ok(ui.status.textContent.includes("模型测试通过"));
}

async function testProbeFailureKeepsSavedStateReadable() {
  const { doc, ui } = createUi();
  const controller = firstRun.createController({
    documentObject: doc,
    ui,
    authFetch: async (url) => {
      if (url === "/api/llm_probe") {
        return { ok: false, status: 500, json: async () => ({ reason: "bad model" }) };
      }
      return { ok: true, status: 200, json: async () => STATUS_READY };
    }
  });

  controller.setFormFromStatus(STATUS_NEEDS_SETUP);
  await controller.saveAndProbe();

  assert.ok(ui.status.textContent.includes("已保存"));
  assert.ok(ui.status.textContent.includes("bad model"));
}

function testHtmlAndCssWired() {
  const html = fs.readFileSync(INDEX_HTML, "utf8");
  const css = fs.readFileSync(BASE_CSS, "utf8");
  for (const text of [
    "首次模型配置",
    "Provider 类型",
    "Base URL",
    "API key env 名称",
    "保存并测试",
    "./firstRunWizardController.js"
  ]) {
    assert.ok(html.includes(text), `first-run UI should include: ${text}`);
  }
  assert.ok(css.includes(".first-run-modal"), "first-run modal CSS should exist");
  assert.ok(css.includes("z-index: 10080"), "first-run modal should sit above other overlays");
}

async function main() {
  testFormInitializationAndProviderDefaults();
  testOpenCloseLayerState();
  testHtmlAndCssWired();
  await testSaveAndProbeUsesFirstRunApiWithoutReturningKey();
  await testProbeFailureKeepsSavedStateReadable();
  console.log("First-run frontend checks passed.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
