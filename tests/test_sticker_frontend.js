#!/usr/bin/env node
"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

const ROOT = path.resolve(__dirname, "..");
const INDEX_HTML = path.join(ROOT, "web", "index.html");
const BASE_CSS = path.join(ROOT, "web", "base.css");
const CHAT_STATE_JS = path.join(ROOT, "web", "chatState.js");
const CHAT_DOM_JS = path.join(ROOT, "web", "chatDom.js");
const CHAT_INPUT_BINDER_JS = path.join(ROOT, "web", "chatInputBinder.js");
const CHAT_MESSAGE_CONTROLLER_JS = path.join(ROOT, "web", "chatMessageController.js");
const STICKER_MODEL_JS = path.join(ROOT, "web", "stickerModel.js");
const STICKER_STORE_JS = path.join(ROOT, "web", "stickerStore.js");
const STICKER_CONTROLLER_JS = path.join(ROOT, "web", "stickerController.js");
const MANIFEST_JSON = path.join(ROOT, "web", "assets", "stickers", "default", "manifest.json");

const html = fs.readFileSync(INDEX_HTML, "utf8");
const baseCssSource = fs.readFileSync(BASE_CSS, "utf8");
const chatStateSource = fs.readFileSync(CHAT_STATE_JS, "utf8");
const chatDomSource = fs.readFileSync(CHAT_DOM_JS, "utf8");
const chatInputBinderSource = fs.readFileSync(CHAT_INPUT_BINDER_JS, "utf8");
const chatMessageControllerSource = fs.readFileSync(CHAT_MESSAGE_CONTROLLER_JS, "utf8");

const stickerModel = require(STICKER_MODEL_JS);
const stickerStore = require(STICKER_STORE_JS);
const stickerController = require(STICKER_CONTROLLER_JS);
const chatMessageController = require(CHAT_MESSAGE_CONTROLLER_JS);

function readPngRgbaPixel(filePath, targetX, targetY) {
  const input = fs.readFileSync(filePath);
  assert.strictEqual(input.toString("ascii", 1, 4), "PNG", "sticker asset should be a PNG");
  let offset = 8;
  let width = 0;
  let height = 0;
  let colorType = 0;
  const idat = [];
  while (offset < input.length) {
    const length = input.readUInt32BE(offset);
    const type = input.toString("ascii", offset + 4, offset + 8);
    const data = input.subarray(offset + 8, offset + 8 + length);
    if (type === "IHDR") {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      colorType = data[9];
    } else if (type === "IDAT") {
      idat.push(data);
    } else if (type === "IEND") {
      break;
    }
    offset += length + 12;
  }
  assert.strictEqual(colorType, 6, "sticker PNGs should preserve RGBA alpha");
  const raw = zlib.inflateSync(Buffer.concat(idat));
  const bpp = 4;
  const stride = width * bpp;
  const rows = [];
  let p = 0;
  for (let y = 0; y < height; y += 1) {
    const filter = raw[p];
    p += 1;
    const row = Buffer.from(raw.subarray(p, p + stride));
    p += stride;
    const prev = rows[y - 1] || Buffer.alloc(stride);
    for (let x = 0; x < stride; x += 1) {
      const left = x >= bpp ? row[x - bpp] : 0;
      const up = prev[x] || 0;
      const upLeft = x >= bpp ? prev[x - bpp] || 0 : 0;
      let predict = 0;
      if (filter === 1) predict = left;
      if (filter === 2) predict = up;
      if (filter === 3) predict = Math.floor((left + up) / 2);
      if (filter === 4) {
        const pa = Math.abs(up - upLeft);
        const pb = Math.abs(left - upLeft);
        const pc = Math.abs(left + up - 2 * upLeft);
        predict = pa <= pb && pa <= pc ? left : (pb <= pc ? up : upLeft);
      }
      row[x] = (row[x] + predict) & 255;
    }
    rows.push(row);
  }
  const index = targetX * bpp;
  const row = rows[targetY];
  return {
    r: row[index],
    g: row[index + 1],
    b: row[index + 2],
    a: row[index + 3]
  };
}

function createClassList(el) {
  return {
    contains(name) {
      return String(el.className || "").split(/\s+/).includes(name);
    },
    add(name) {
      if (!this.contains(name)) {
        el.className = `${el.className || ""} ${name}`.trim();
      }
    },
    remove(name) {
      el.className = String(el.className || "")
        .split(/\s+/)
        .filter((item) => item && item !== name)
        .join(" ");
    }
  };
}

function createElement(tagName = "div") {
  const el = {
    tagName: String(tagName || "div").toUpperCase(),
    type: "",
    className: "",
    textContent: "",
    hidden: false,
    checked: false,
    src: "",
    alt: "",
    dataset: {},
    attributes: {},
    children: [],
    listeners: {},
    parentNode: null,
    appendChild(child) {
      child.parentNode = this;
      this.children.push(child);
      return child;
    },
    insertBefore(child, before) {
      child.parentNode = this;
      const index = this.children.indexOf(before);
      if (index >= 0) {
        this.children.splice(index, 0, child);
      } else {
        this.children.push(child);
      }
      return child;
    },
    setAttribute(name, value) {
      this.attributes[name] = String(value);
    },
    addEventListener(type, handler) {
      this.listeners[type] = handler;
    },
    querySelector(selector) {
      const className = selector.startsWith(".") ? selector.slice(1) : "";
      if (!className) {
        return null;
      }
      const stack = [...this.children];
      while (stack.length) {
        const item = stack.shift();
        if (String(item.className || "").split(/\s+/).includes(className)) {
          return item;
        }
        stack.push(...(item.children || []));
      }
      return null;
    }
  };
  el.classList = createClassList(el);
  return el;
}

function createDocument() {
  return { createElement };
}

function testDefaultStickerManifestAndAssets() {
  const manifest = JSON.parse(fs.readFileSync(MANIFEST_JSON, "utf8"));
  const stickers = stickerModel.normalizeDefaultManifest(manifest);
  assert.strictEqual(stickers.length, 8, "default sticker pack should include 8 stickers");
  for (const sticker of stickers) {
    const assetPath = path.join(ROOT, "web", sticker.url.replace(/^\.\//, ""));
    assert.ok(fs.existsSync(assetPath), `default sticker asset should exist: ${sticker.id}`);
  }
  const corner = readPngRgbaPixel(path.join(ROOT, "web", "assets", "stickers", "default", "cheer.png"), 0, 0);
  assert.strictEqual(corner.a, 0, "default stickers should have transparent corners for chat bubbles");
}

function testStickerHelpers() {
  assert.strictEqual(stickerModel.isStickerImageFile({ name: "a.webp", type: "" }), true);
  assert.strictEqual(stickerModel.isStickerImageFile({ name: "a.txt", type: "text/plain" }), false);
  assert.strictEqual(
    stickerModel.validateStickerFile({ name: "big.png", type: "image/png", size: 4 * 1024 * 1024 }).ok,
    false,
    "oversized imported stickers should be rejected"
  );
  assert.ok(
    stickerModel.buildStickerPrompt({ label: "\u5f00\u5fc3" }).includes("\u5f00\u5fc3"),
    "AI prompt should include the sticker label"
  );
  assert.strictEqual(
    stickerModel.shouldSendAssistantSticker({
      enabled: true,
      now: 1000,
      lastAt: 0,
      cooldownMs: 0,
      chance: 1,
      random: () => 0
    }),
    true,
    "assistant sticker helper should allow deterministic send in tests"
  );
}

function testStickerMessageHistoryStaysOutOfLlmHistory() {
  const state = { chatRecords: [], history: [] };
  const chatLog = createElement("div");
  const controller = chatMessageController.createController({
    state,
    ui: { chatLog },
    documentObject: createDocument(),
    resolveStickerPayload: (sticker) => ({
      ...sticker,
      url: "./assets/stickers/default/happy.png"
    })
  });

  controller.appendStickerMessage("user", {
    id: "happy",
    source: "default",
    label: "\u5f00\u5fc3"
  }, { timestamp: 1000 });
  controller.appendMessage("assistant", "\u597d\u8036", { timestamp: 1100, syncHistory: true });
  controller.syncConversationHistoryFromChatRecords();

  assert.strictEqual(state.chatRecords[0].kind, "sticker");
  assert.deepStrictEqual(state.history, [{ role: "assistant", content: "\u597d\u8036" }]);
  assert.ok(chatLog.children.some((child) => String(child.className || "").includes("sticker-message")));
}

async function testStickerControllerSendModes() {
  const state = {
    defaultStickers: stickerModel.getDefaultStickers(),
    userStickers: [],
    stickerRespondAfterSend: false,
    assistantStickerEnabled: true,
    assistantStickerChance: 1,
    assistantStickerCooldownMs: 0,
    assistantStickerLastAt: 0
  };
  const appended = [];
  const requests = [];
  const controller = stickerController.createController({
    state,
    ui: {},
    model: stickerModel,
    store: stickerStore,
    documentObject: createDocument(),
    windowObject: {},
    appendStickerMessage: (role, sticker) => appended.push({ role, sticker }),
    requestAssistantReply: async (text, opts) => {
      requests.push({ text, opts });
      return true;
    },
    setStatus: () => {}
  });

  await controller.sendSticker(state.defaultStickers[1]);
  assert.strictEqual(appended.length, 1, "pure visual sticker send should append one user sticker");
  assert.strictEqual(requests.length, 0, "pure visual sticker send should not call the LLM");

  controller.setStickerRespondAfterSend(true);
  await controller.sendSticker(state.defaultStickers[2]);
  assert.strictEqual(appended.length, 2, "responding sticker send should still append the visible sticker first");
  assert.strictEqual(requests.length, 1, "responding sticker send should call the assistant once");
  assert.strictEqual(requests[0].opts.showUser, false, "responding sticker send should not duplicate a user text bubble");

  const assistantSticker = controller.maybeSendAssistantMoodSticker({
    mood: "happy",
    text: "nice!",
    auto: false
  });
  assert.ok(assistantSticker, "assistant should be able to send a mood sticker");
  assert.strictEqual(appended[appended.length - 1].role, "assistant");
}

function testScriptAndDomWiring() {
  assert.ok(html.includes('id="sticker-panel"'), "index should include the sticker panel");
  assert.ok(html.includes('id="sticker-btn"'), "index should include a sticker button");
  assert.ok(chatStateSource.includes("defaultStickers: []"), "chat state should track default stickers");
  assert.ok(chatDomSource.includes("stickerPanel"), "chat DOM should expose sticker panel elements");
  assert.ok(chatInputBinderSource.includes("bindStickerControls"), "chat input binder should bind sticker controls");
  assert.ok(chatMessageControllerSource.includes('kind: "sticker"'), "chat history should support sticker records");
  assert.ok(
    /body\.view-chat \.chat-input-icon-btn:hover,[\s\S]*?transform: translateY\(-50%\);/.test(baseCssSource),
    "sticker icon hover should keep vertical centering instead of inheriting global button movement"
  );
  assert.ok(
    baseCssSource.includes("body.view-chat .sticker-item:hover")
      && /body\.view-chat \.sticker-item:hover \{[\s\S]*?transform: none;/.test(baseCssSource),
    "sticker card hover should not shift the grid"
  );
  assert.ok(
    /\.sticker-item-img \{[\s\S]*?background: transparent;/.test(baseCssSource)
      && /\.sticker-message-img \{[\s\S]*?filter: drop-shadow/.test(baseCssSource),
    "sticker previews and sent sticker messages should avoid flat color blocks"
  );
  assert.ok(
    /\.sticker-respond-toggle input\[type="checkbox"\] \{[\s\S]*?appearance: none;[\s\S]*?width: 18px;[\s\S]*?box-shadow: none;/.test(baseCssSource)
      && /\.sticker-respond-toggle input\[type="checkbox"\]:checked \{[\s\S]*?background: #2f74d6;/.test(baseCssSource),
    "sticker response checkbox should use compact custom styling instead of native long focus chrome"
  );
  assert.ok(
    html.indexOf('<script src="./stickerModel.js"></script>') < html.indexOf('<script src="./stickerController.js"></script>')
      && html.indexOf('<script src="./stickerController.js"></script>') < html.indexOf('<script src="./chat.js"></script>'),
    "sticker modules should load before chat.js"
  );
}

async function main() {
  testDefaultStickerManifestAndAssets();
  testStickerHelpers();
  testStickerMessageHistoryStaysOutOfLlmHistory();
  await testStickerControllerSendModes();
  testScriptAndDomWiring();
  console.log("Sticker frontend checks passed.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
