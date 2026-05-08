#!/usr/bin/env node
"use strict";

const fs = require("fs");
const http = require("http");
const path = require("path");
const { app, BrowserWindow, ipcMain } = require("electron");

const ROOT_DIR = path.resolve(__dirname, "..");
const BASE_URL = String(process.env.TAFFY_UI_SMOKE_BASE_URL || "http://127.0.0.1:8123").replace(/\/+$/, "");
const OUT_DIR = path.join(ROOT_DIR, "tmp_ui_smoke");
const TOKEN_HEADER = "X-Taffy-Token";

function getArgValue(name) {
  const idx = process.argv.indexOf(name);
  if (idx < 0 || idx + 1 >= process.argv.length) {
    return "";
  }
  return String(process.argv[idx + 1] || "").trim();
}

const CHAT_TEXT = getArgValue("--chat") || String(process.env.TAFFY_UI_SMOKE_CHAT_TEXT || "").trim();
const SKIP_CHAT = process.argv.includes("--skip-chat");

function readTextIfExists(filePath) {
  try {
    if (!fs.existsSync(filePath)) {
      return "";
    }
    return fs.readFileSync(filePath, "utf8");
  } catch (_) {
    return "";
  }
}

function readJsonIfExists(filePath) {
  try {
    const raw = readTextIfExists(filePath);
    return raw ? JSON.parse(raw.replace(/^\uFEFF/, "")) : {};
  } catch (_) {
    return {};
  }
}

function readEnvFileVar(name) {
  const key = String(name || "").trim();
  if (!key) {
    return "";
  }
  const raw = readTextIfExists(path.join(ROOT_DIR, ".env"));
  for (const line of raw.split(/\r?\n/)) {
    const text = line.trim();
    if (!text || text.startsWith("#")) {
      continue;
    }
    const normalized = text.startsWith("export ") ? text.slice(7).trim() : text;
    const idx = normalized.indexOf("=");
    if (idx <= 0 || normalized.slice(0, idx).trim() !== key) {
      continue;
    }
    let value = normalized.slice(idx + 1).trim();
    if (
      (value.startsWith("\"") && value.endsWith("\""))
      || (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    return value.trim();
  }
  return "";
}

function loadRuntimeConfig() {
  const base = readJsonIfExists(path.join(ROOT_DIR, "config.json"));
  const local = readJsonIfExists(path.join(ROOT_DIR, "config.local.json"));
  return { ...base, ...local, server: { ...(base.server || {}), ...(local.server || {}) } };
}

function resolveApiToken() {
  const cfg = loadRuntimeConfig();
  const server = cfg.server || {};
  const envName = String(server.api_token_env || "TAFFY_API_TOKEN").trim() || "TAFFY_API_TOKEN";
  return String(server.api_token || process.env[envName] || readEnvFileVar(envName) || "").trim();
}

function request(pathname, token = "") {
  return new Promise((resolve, reject) => {
    const url = new URL(pathname, BASE_URL);
    const headers = token ? { [TOKEN_HEADER]: token } : {};
    const req = http.get(url, { headers }, (res) => {
      const chunks = [];
      res.on("data", (chunk) => chunks.push(chunk));
      res.on("end", () => {
        resolve({
          statusCode: res.statusCode || 0,
          body: Buffer.concat(chunks).toString("utf8")
        });
      });
    });
    req.on("error", reject);
    req.setTimeout(5000, () => {
      req.destroy(new Error(`Request timed out: ${url.href}`));
    });
  });
}

async function requireBackendReady() {
  const healthz = await request("/healthz");
  if (healthz.statusCode !== 200) {
    throw new Error(`/healthz returned ${healthz.statusCode}`);
  }
}

function registerIpcHandlers() {
  const token = resolveApiToken();
  ipcMain.handle("get-api-token", async () => token);
  ipcMain.handle("window-lock-get", async () => false);
  ipcMain.handle("get-cursor-screen-point", async () => ({ x: 0, y: 0 }));
  ipcMain.handle("get-model-window-bounds", async () => null);
  ipcMain.handle("capture-desktop", async () => {
    throw new Error("Desktop capture is disabled in electron_ui_smoke.");
  });
  ipcMain.on("window-lock-set", () => {});
  ipcMain.on("window-move-by", () => {});
  ipcMain.on("window-resize", () => {});
  ipcMain.on("window-drag-begin", () => {});
  ipcMain.on("window-drag-end", () => {});
  ipcMain.on("set-ignore-mouse-events", () => {});
  ipcMain.on("window-set-clickthrough", () => {});
  ipcMain.on("subtitle-show", () => {});
  ipcMain.on("subtitle-hide", () => {});
  return token;
}

function createWindow(name, url, options = {}) {
  const win = new BrowserWindow({
    width: options.width || 900,
    height: options.height || 760,
    show: false,
    paintWhenInitiallyHidden: true,
    backgroundColor: options.backgroundColor || "#ffffff",
    webPreferences: {
      preload: path.join(ROOT_DIR, "electron", "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      backgroundThrottling: false,
      partition: `taffy-ui-smoke-${Date.now()}-${name}`
    }
  });
  win.setMenuBarVisibility(false);
  return win.loadURL(url).then(() => win);
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function evalIn(win, source) {
  return win.webContents.executeJavaScript(source, true);
}

async function poll(win, source, predicate, timeoutMs, label) {
  const start = Date.now();
  let last;
  while (Date.now() - start < timeoutMs) {
    last = await evalIn(win, source);
    if (predicate(last)) {
      return last;
    }
    await wait(250);
  }
  throw new Error(`${label} timed out. Last value: ${JSON.stringify(last).slice(0, 400)}`);
}

async function capture(win, fileName) {
  const image = await win.capturePage();
  const outPath = path.join(OUT_DIR, fileName);
  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(outPath, image.toPNG());
  return {
    file: outPath,
    size: image.getSize(),
    nonWhiteRatio: estimateNonWhiteRatio(image)
  };
}

function estimateNonWhiteRatio(image) {
  const size = image.getSize();
  const bitmap = image.toBitmap();
  if (!size.width || !size.height || !bitmap.length) {
    return 0;
  }
  const pixelCount = size.width * size.height;
  const step = Math.max(1, Math.floor(pixelCount / 12000));
  let checked = 0;
  let nonWhite = 0;
  for (let i = 0; i < pixelCount; i += step) {
    const offset = i * 4;
    const b = bitmap[offset];
    const g = bitmap[offset + 1];
    const r = bitmap[offset + 2];
    const a = bitmap[offset + 3];
    checked += 1;
    if (a > 8 && (r < 245 || g < 245 || b < 245)) {
      nonWhite += 1;
    }
  }
  return checked ? Number((nonWhite / checked).toFixed(4)) : 0;
}

async function getChatInfo(win) {
  return evalIn(win, `(() => {
    const byId = (id) => document.getElementById(id);
    const rect = (el) => {
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { width: Math.round(r.width), height: Math.round(r.height), x: Math.round(r.x), y: Math.round(r.y) };
    };
    return {
      title: document.title,
      status: byId("status")?.textContent?.trim() || "",
      chatInput: !!byId("chat-input"),
      sendBtn: !!byId("send-btn"),
      chatLog: !!byId("chat-log"),
      moreBtn: !!byId("more-btn"),
      doctorBtn: !!byId("doctor-btn"),
      brainDebugScript: !!window.TaffyCharacterBrainDebug,
      localCommandRegistry: !!window.TaffyLocalCommandRegistry,
      advancedHidden: !!byId("advanced-actions")?.hidden,
      onboardingHidden: !!byId("onboarding-modal")?.hidden,
      inputRect: rect(byId("chat-input")),
      logText: byId("chat-log")?.innerText?.slice(-1200) || ""
    };
  })()`);
}

async function dismissOnboarding(win) {
  for (let i = 0; i < 12; i += 1) {
    const done = await evalIn(win, `(() => {
      try { localStorage.setItem("taffy_onboarding_seen_v1", "true"); } catch (_) {}
      const modal = document.getElementById("onboarding-modal");
      const skip = document.getElementById("onboarding-skip-btn");
      if (!modal) return true;
      if (!modal.hidden && skip) skip.click();
      if (!modal.hidden) {
        modal.hidden = true;
        modal.style.display = "none";
        modal.setAttribute("hidden", "");
      }
      return !!modal.hidden || getComputedStyle(modal).display === "none";
    })()`);
    if (done) {
      return;
    }
    await wait(250);
  }
}

async function openMore(win) {
  await evalIn(win, `(() => {
    const more = document.getElementById("more-btn");
    const advanced = document.getElementById("advanced-actions");
    if (advanced && advanced.hidden && more) more.click();
    return !advanced?.hidden;
  })()`);
  await poll(
    win,
    `(() => !document.getElementById("advanced-actions")?.hidden)()`,
    Boolean,
    3000,
    "advanced actions"
  );
}

async function getAssistantMessages(win) {
  return evalIn(win, `(() => Array.from(document.querySelectorAll(".message.assistant .content"))
    .map((item) => item.innerText.trim())
    .filter(Boolean))()`);
}

async function sendInput(win, text) {
  const before = await getAssistantMessages(win);
  await evalIn(win, `((text) => {
    const input = document.getElementById("chat-input");
    const send = document.getElementById("send-btn");
    input.value = text;
    input.dispatchEvent(new Event("input", { bubbles: true }));
    send.click();
    return true;
  })(${JSON.stringify(text)})`);
  return before;
}

async function waitForAssistantMessage(win, beforeMessages, expectedText, timeoutMs, label) {
  return poll(
    win,
    `(() => Array.from(document.querySelectorAll(".message.assistant .content"))
      .map((item) => item.innerText.trim())
      .filter(Boolean))()`,
    (messages) => {
      const joined = Array.isArray(messages) ? messages.join("\\n") : "";
      if (expectedText) {
        return joined.includes(expectedText);
      }
      return Array.isArray(messages)
        && messages.length > (Array.isArray(beforeMessages) ? beforeMessages.length : 0)
        && String(messages[messages.length - 1] || "").trim().length > 4;
    },
    timeoutMs,
    label
  );
}

async function runChatSmoke(win, results) {
  if (!SKIP_CHAT && CHAT_TEXT) {
    const beforeChat = await sendInput(win, CHAT_TEXT);
    const messages = await waitForAssistantMessage(win, beforeChat, "", 60000, "normal chat reply");
    const lastAssistant = String(messages[messages.length - 1] || "");
    results.normalChat = {
      ok: !/^错误[:：]/.test(lastAssistant.trim()),
      lastAssistant: lastAssistant.slice(0, 1000)
    };
    results.screenshots.push(await capture(win, "chat-after-normal-message.png"));
  } else {
    results.normalChat = {
      ok: false,
      skipped: true,
      reason: "Pass --chat \"text\" or TAFFY_UI_SMOKE_CHAT_TEXT to run a real LLM chat turn."
    };
  }

  const beforeBrain = await sendInput(win, "/braindebug");
  const brainMessages = await waitForAssistantMessage(win, beforeBrain, "角色大脑状态", 8000, "/braindebug report");
  const brainText = brainMessages.join("\n");
  results.brainDebug = {
    ok: brainText.includes("角色大脑状态"),
    safeBoundary: brainText.includes("不会触发语音、动作、桌面观察、工具调用或 shell"),
    reportTail: brainText.slice(-1000)
  };

  const beforeDoctor = await sendInput(win, "/doctor");
  const doctorMessages = await waitForAssistantMessage(win, beforeDoctor, "链路自检完成", 15000, "/doctor report");
  const doctorText = doctorMessages.join("\n");
  results.doctor = {
    ok: doctorText.includes("链路自检完成"),
    tokenLeak: /(?:api[_-]?key|token)\s*[:=]\s*[\w.-]{12,}/i.test(doctorText),
    reportTail: doctorText.slice(-1000)
  };
}

async function runFeedbackSmoke(win, results) {
  await openMore(win);
  const beforeGood = await getAssistantMessages(win);
  await evalIn(win, `document.getElementById("character-feedback-good-btn")?.click(); true`);
  const goodMessages = await waitForAssistantMessage(win, beforeGood, "", 5000, "good feedback");

  const beforeBad = await getAssistantMessages(win);
  await evalIn(win, `document.getElementById("character-feedback-bad-btn")?.click(); true`);
  const badMessages = await waitForAssistantMessage(win, beforeBad, "", 5000, "bad feedback");
  const feedbackText = `${goodMessages.join("\n")}\n${badMessages.join("\n")}`;

  results.feedback = {
    goodResponded: goodMessages.length > beforeGood.length,
    badResponded: badMessages.length > beforeBad.length,
    hasNoPerformanceWarning: feedbackText.includes("还没有可评价的角色表现")
  };
}

async function getModelInfo(win) {
  return evalIn(win, `(() => {
    const canvas = document.getElementById("live2d-canvas");
    const rect = canvas ? canvas.getBoundingClientRect() : null;
    return {
      title: document.title,
      canvas: !!canvas,
      canvasWidth: canvas?.width || 0,
      canvasHeight: canvas?.height || 0,
      clientWidth: rect ? Math.round(rect.width) : 0,
      clientHeight: rect ? Math.round(rect.height) : 0,
      bodyText: document.body?.innerText?.trim().slice(0, 300) || "",
      status: document.getElementById("status")?.textContent?.trim() || ""
    };
  })()`);
}

async function main() {
  await requireBackendReady();
  const token = registerIpcHandlers();
  await app.whenReady();

  const results = {
    ok: true,
    baseUrl: BASE_URL,
    tokenPresent: !!token,
    chatTextSent: !!CHAT_TEXT && !SKIP_CHAT,
    screenshots: []
  };

  let chatWin;
  let modelWin;
  let exitCode = 1;
  try {
    chatWin = await createWindow("chat", `${BASE_URL}/?desktop=1&engine=electron&view=chat`, {
      width: 900,
      height: 820
    });
    await wait(1000);
    await dismissOnboarding(chatWin);
    await wait(500);
    results.chat = await getChatInfo(chatWin);
    results.screenshots.push(await capture(chatWin, "chat-initial.png"));

    await runChatSmoke(chatWin, results);
    await runFeedbackSmoke(chatWin, results);
    results.screenshots.push(await capture(chatWin, "chat-after-debug-feedback.png"));

    modelWin = await createWindow("model", `${BASE_URL}/?desktop=1&transparent=1&engine=electron&alpha_mode=truealpha&view=model`, {
      width: 520,
      height: 900,
      backgroundColor: "#ffffff"
    });
    await wait(2500);
    results.model = await getModelInfo(modelWin);
    const modelShot = await capture(modelWin, "model-window.png");
    results.screenshots.push(modelShot);
    results.model.nonWhiteRatio = modelShot.nonWhiteRatio;

    const failures = [];
    if (!results.chat.chatInput || !results.chat.sendBtn || !results.chat.chatLog) {
      failures.push("chat controls missing");
    }
    if (results.chatTextSent && !results.normalChat.ok) {
      failures.push("normal chat returned an error");
    }
    if (!results.brainDebug.ok || !results.brainDebug.safeBoundary) {
      failures.push("/braindebug report missing or unsafe");
    }
    if (!results.doctor.ok || results.doctor.tokenLeak) {
      failures.push("/doctor report missing or leaked sensitive token-like text");
    }
    if (!results.feedback.goodResponded || !results.feedback.badResponded) {
      failures.push("feedback buttons did not respond");
    }
    if (!results.model.canvas || results.model.clientWidth <= 0 || results.model.clientHeight <= 0) {
      failures.push("Live2D canvas missing or collapsed");
    }
    if (results.model.nonWhiteRatio <= 0.005) {
      failures.push("model screenshot appears blank");
    }
    results.ok = failures.length === 0;
    results.failures = failures;
    exitCode = results.ok ? 0 : 1;
  } finally {
    if (chatWin && !chatWin.isDestroyed()) {
      chatWin.destroy();
    }
    if (modelWin && !modelWin.isDestroyed()) {
      modelWin.destroy();
    }
  }

  console.log(JSON.stringify(results, null, 2));
  app.exit(exitCode);
  return exitCode;
}

main()
  .then((code) => {
    process.exitCode = code;
  })
  .catch((err) => {
    console.error(err && err.stack ? err.stack : String(err));
    app.exit(1);
  });
