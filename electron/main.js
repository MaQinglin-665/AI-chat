const { app, BrowserWindow, ipcMain, screen, desktopCapturer, session, dialog } = require("electron");
const { spawn, spawnSync } = require("child_process");
const http = require("http");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");

const ROOT_DIR = path.resolve(__dirname, "..");
const SERVER_HOST = "127.0.0.1";
const SERVER_PORT = 8123;
const SERVER_URL = `http://${SERVER_HOST}:${SERVER_PORT}`;
const CONFIG_PATH = path.join(ROOT_DIR, "config.json");
const LOCAL_CONFIG_PATH = path.join(ROOT_DIR, "config.local.json");
const SERVER_OUT_LOG_PATH = path.join(ROOT_DIR, "server_out.log");
const SERVER_ERR_LOG_PATH = path.join(ROOT_DIR, "server_err.log");
const QWEN_TTS_OUT_LOG_PATH = path.join(ROOT_DIR, "qwen3_tts_out.log");
const QWEN_TTS_ERR_LOG_PATH = path.join(ROOT_DIR, "qwen3_tts_err.log");
const BACKEND_RESTART_EXIT_CODE = 75;
const BACKEND_RESTART_DELAY_MS = 700;
const BACKEND_RESTART_MAX_ATTEMPTS = 3;
const BACKEND_DIAGNOSTIC_TAIL_LINES = 18;
const BACKEND_DIAGNOSTIC_TAIL_CHARS = 2400;
const WINDOW_LAYOUT_VERSION = 2;
const AUTO_OPEN_DEVTOOLS = String(process.env.TAFFY_OPEN_DEVTOOLS || "").trim() === "1";
const LIVE2D_RENDER_DIAGNOSTICS = String(process.env.TAFFY_LIVE2D_DIAGNOSTICS || "").trim() === "1";

app.commandLine.appendSwitch("autoplay-policy", "no-user-gesture-required");
// Keep hardware acceleration ON by default for smoother Live2D animation.
// Allow manual opt-out in config when a specific machine has compositor issues.
const earlyRuntimeConfig = loadRuntimeConfig();
if (
  process.platform === "win32"
  && earlyRuntimeConfig?.desktop?.disable_hardware_acceleration === true
) {
  app.disableHardwareAcceleration();
}

let pythonProc = null;
let managedQwenTtsProc = null;
let pythonStdoutStream = null;
let pythonStderrStream = null;
let modelWindow = null;
let chatWindow = null;
let modelWindowReady = false;
let pendingSubtitle = null;
let persistedWindowState = { layoutVersion: 0, model: null, chat: null, locked: false };
let windowStateSaveTimer = null;
let windowLocked = false;
let isAppQuitting = false;
let backendFailureShown = false;
let backendRestartAttempts = 0;
let backendRestartTimer = null;
let pythonSessionMeta = null;
let backendRecentStdoutLines = [];
let backendRecentStderrLines = [];
const dragSessions = new Map();

const gotSingleInstanceLock = app.requestSingleInstanceLock();
if (!gotSingleInstanceLock) {
  app.quit();
  process.exit(0);
}

app.on("second-instance", () => {
  if (!chatWindow || chatWindow.isDestroyed()) {
    return;
  }
  try {
    if (chatWindow.isMinimized()) {
      chatWindow.restore();
    }
    chatWindow.show();
    chatWindow.focus();
    scheduleCompanionSurfaceVisibilitySync(0);
  } catch (_) {
    // ignore focus errors
  }
});

function appendServerLogLine(filePath, message) {
  try {
    const line = `[${new Date().toISOString()}] ${String(message || "").trim()}\n`;
    fs.appendFileSync(filePath, line, "utf8");
  } catch (_) {
    // ignore
  }
}

function logServerOut(message) {
  appendServerLogLine(SERVER_OUT_LOG_PATH, message);
}

function logServerErr(message) {
  appendServerLogLine(SERVER_ERR_LOG_PATH, message);
}

function openPythonLogStreams() {
  closePythonLogStreams();
  pythonStdoutStream = fs.createWriteStream(SERVER_OUT_LOG_PATH, { flags: "a" });
  pythonStderrStream = fs.createWriteStream(SERVER_ERR_LOG_PATH, { flags: "a" });
}

function closePythonLogStreams() {
  if (pythonStdoutStream) {
    try {
      pythonStdoutStream.end();
    } catch (_) {
      // ignore
    }
    pythonStdoutStream = null;
  }
  if (pythonStderrStream) {
    try {
      pythonStderrStream.end();
    } catch (_) {
      // ignore
    }
    pythonStderrStream = null;
  }
}

function truncateTail(text, maxChars = BACKEND_DIAGNOSTIC_TAIL_CHARS) {
  const safe = String(text || "");
  if (!safe) {
    return "";
  }
  if (safe.length <= maxChars) {
    return safe;
  }
  return safe.slice(safe.length - maxChars);
}

function pushRecentBackendLines(target, chunk) {
  if (!Array.isArray(target)) {
    return;
  }
  const text = String(chunk || "");
  if (!text) {
    return;
  }
  const lines = text.replace(/\r/g, "").split("\n");
  for (const rawLine of lines) {
    const line = String(rawLine || "").trim();
    if (!line) {
      continue;
    }
    target.push(line);
  }
  if (target.length > BACKEND_DIAGNOSTIC_TAIL_LINES) {
    target.splice(0, target.length - BACKEND_DIAGNOSTIC_TAIL_LINES);
  }
}

function resetBackendRecentBuffers() {
  backendRecentStdoutLines = [];
  backendRecentStderrLines = [];
}

function getBackendRecentOutputSummary() {
  const parts = [];
  if (backendRecentStderrLines.length) {
    parts.push(
      `[recent stderr]\n${truncateTail(backendRecentStderrLines.join("\n"))}`
    );
  }
  if (backendRecentStdoutLines.length) {
    parts.push(
      `[recent stdout]\n${truncateTail(backendRecentStdoutLines.join("\n"))}`
    );
  }
  return parts.join("\n\n").trim();
}

function buildBackendExitDiagnostic(code, signal) {
  const nowMs = Date.now();
  const meta = pythonSessionMeta || {};
  const startedAtMs = Number(meta.startedAtMs || 0);
  const uptimeMs = startedAtMs > 0 ? Math.max(0, nowMs - startedAtMs) : 0;
  const lines = [
    `[Electron] Python process exited (code=${code === null ? "null" : code}, signal=${signal || "none"})`,
    `[Electron] Backend session pid=${meta.pid || "unknown"}, started_at=${meta.startedAtIso || "unknown"}, uptime_ms=${uptimeMs}, executable=${meta.pythonExecutable || "unknown"}`,
  ];
  const recent = getBackendRecentOutputSummary();
  if (recent) {
    lines.push(recent);
  }
  return lines.join("\n");
}

function loadRuntimeConfig() {
  try {
    if (!fs.existsSync(CONFIG_PATH)) {
      return {};
    }
    const raw = fs.readFileSync(CONFIG_PATH, "utf8");
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch (err) {
    logServerErr(
      `[Electron] Failed to load config.json: ${err && err.stack ? err.stack : String(err)}`
    );
    return {};
  }
}

function readJsonObject(filePath) {
  try {
    if (!fs.existsSync(filePath)) {
      return {};
    }
    const parsed = JSON.parse(fs.readFileSync(filePath, "utf8"));
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? parsed
      : {};
  } catch (_) {
    return {};
  }
}

function getManagedTtsConfig() {
  const base = readJsonObject(CONFIG_PATH);
  const local = readJsonObject(LOCAL_CONFIG_PATH);
  const baseTts = base.tts && typeof base.tts === "object" ? base.tts : {};
  const localTts = local.tts && typeof local.tts === "object" ? local.tts : {};
  return { ...baseTts, ...localTts };
}

function getLoopbackHttpEndpoint(rawUrl) {
  try {
    const parsed = new URL(String(rawUrl || ""));
    const hostname = String(parsed.hostname || "").toLowerCase();
    if (
      parsed.protocol !== "http:"
      || !["127.0.0.1", "localhost", "::1"].includes(hostname)
    ) {
      return null;
    }
    const port = Number(parsed.port || 80);
    if (!Number.isInteger(port) || port < 1 || port > 65535) {
      return null;
    }
    return {
      hostname: hostname === "localhost" ? "127.0.0.1" : hostname,
      port,
      healthUrl: `${parsed.protocol}//${parsed.host}/health`,
    };
  } catch (_) {
    return null;
  }
}

function isHttpEndpointReady(url, timeoutMs = 650) {
  return new Promise((resolve) => {
    let settled = false;
    const finish = (value) => {
      if (settled) return;
      settled = true;
      resolve(value);
    };
    try {
      const req = http.get(url, (res) => {
        res.resume();
        finish(Number(res.statusCode || 0) >= 200 && Number(res.statusCode || 0) < 500);
      });
      req.setTimeout(Math.max(100, Number(timeoutMs) || 650), () => {
        req.destroy();
        finish(false);
      });
      req.on("error", () => finish(false));
    } catch (_) {
      finish(false);
    }
  });
}

function resolveManagedQwenRuntimeDir(ttsConfig) {
  const configured = String(ttsConfig?.qwen3_tts_runtime_dir || "").trim();
  if (configured) {
    return path.resolve(configured);
  }
  const workspaceRuntime = "D:\\AI\\qwen3_tts_runtime";
  if (process.platform === "win32" && fs.existsSync(workspaceRuntime)) {
    return workspaceRuntime;
  }
  const localAppData = String(process.env.LOCALAPPDATA || "").trim();
  return localAppData
    ? path.join(localAppData, "XinyuAI", "qwen3-tts")
    : "";
}

function resolveManagedQwenModel(ttsConfig) {
  const configured = String(ttsConfig?.qwen3_tts_model || "").trim();
  if (configured) {
    return configured;
  }
  const workspaceModel = "D:\\AI\\models\\Qwen3-TTS-12Hz-1.7B-VoiceDesign";
  if (process.platform === "win32" && fs.existsSync(workspaceModel)) {
    return workspaceModel;
  }
  return "Qwen/Qwen3-TTS-12Hz-1.7B-VoiceDesign";
}

async function startManagedLocalTtsService() {
  const ttsConfig = getManagedTtsConfig();
  const provider = String(ttsConfig.provider || "").trim().toLowerCase();
  if (ttsConfig.auto_start_local_provider !== true) {
    logServerOut("[Electron] Managed local TTS autostart is disabled.");
    return false;
  }
  if (provider !== "qwen3_tts") {
    logServerOut(
      `[Electron] Managed local TTS autostart skipped for provider=${provider || "unset"}; only qwen3_tts is allowed.`
    );
    return false;
  }
  const endpoint = getLoopbackHttpEndpoint(ttsConfig.qwen3_tts_api_url);
  if (!endpoint) {
    logServerErr("[Electron] Qwen3-TTS autostart requires a loopback http endpoint.");
    return false;
  }
  if (await isHttpEndpointReady(endpoint.healthUrl)) {
    logServerOut("[Electron] Qwen3-TTS is already reachable; leaving the external service untouched.");
    return true;
  }

  const runtimeDir = resolveManagedQwenRuntimeDir(ttsConfig);
  const pythonExecutable = runtimeDir
    ? path.join(runtimeDir, ".venv", process.platform === "win32" ? "Scripts" : "bin", process.platform === "win32" ? "python.exe" : "python")
    : "";
  const serverScript = path.join(ROOT_DIR, "scripts", "qwen3_tts_server.py");
  if (!pythonExecutable || !fs.existsSync(pythonExecutable) || !fs.existsSync(serverScript)) {
    logServerErr(
      "[Electron] Qwen3-TTS runtime is unavailable; the renderer may use browser speech fallback."
    );
    return false;
  }

  const args = [
    serverScript,
    "--model", resolveManagedQwenModel(ttsConfig),
    "--mode", "auto",
    "--speaker", String(ttsConfig.qwen3_tts_voice || "A2_Original"),
    "--language", "Auto",
    "--port", String(endpoint.port),
    "--chunk-size", String(Math.max(1, Math.min(12, Number(ttsConfig.qwen3_tts_chunk_size || 4)))),
  ];
  let outFd = null;
  let errFd = null;
  try {
    outFd = fs.openSync(QWEN_TTS_OUT_LOG_PATH, "a");
    errFd = fs.openSync(QWEN_TTS_ERR_LOG_PATH, "a");
    managedQwenTtsProc = spawn(pythonExecutable, args, {
      cwd: ROOT_DIR,
      env: { ...process.env, PYTHONUTF8: "1" },
      windowsHide: true,
      stdio: ["ignore", outFd, errFd],
    });
  } catch (err) {
    managedQwenTtsProc = null;
    logServerErr(`[Electron] Failed to start Qwen3-TTS: ${err?.message || String(err)}`);
    return false;
  } finally {
    if (outFd !== null) {
      try { fs.closeSync(outFd); } catch (_) {}
    }
    if (errFd !== null) {
      try { fs.closeSync(errFd); } catch (_) {}
    }
  }
  logServerOut(`[Electron] Started managed Qwen3-TTS process pid=${managedQwenTtsProc.pid || "unknown"}.`);
  managedQwenTtsProc.on("error", (err) => {
    logServerErr(`[Electron] Managed Qwen3-TTS process error: ${err?.message || String(err)}`);
    managedQwenTtsProc = null;
  });
  managedQwenTtsProc.on("exit", (code, signal) => {
    logServerOut(
      `[Electron] Managed Qwen3-TTS exited (code=${code === null ? "null" : code}, signal=${signal || "none"}).`
    );
    managedQwenTtsProc = null;
  });
  return true;
}

function stopManagedLocalTtsService() {
  if (!managedQwenTtsProc) {
    return false;
  }
  try {
    managedQwenTtsProc.kill();
  } catch (_) {
    // ignore shutdown races
  }
  managedQwenTtsProc = null;
  return true;
}

function readEnvFileVar(name) {
  const key = String(name || "").trim();
  if (!key) {
    return "";
  }
  const envPath = path.join(ROOT_DIR, ".env");
  try {
    if (!fs.existsSync(envPath)) {
      return "";
    }
    const raw = fs.readFileSync(envPath, "utf8");
    const lines = String(raw || "").split(/\r?\n/);
    for (const line of lines) {
      const text = String(line || "").trim();
      if (!text || text.startsWith("#")) {
        continue;
      }
      const normalized = text.startsWith("export ") ? text.slice(7).trim() : text;
      const idx = normalized.indexOf("=");
      if (idx <= 0) {
        continue;
      }
      const k = normalized.slice(0, idx).trim();
      if (k !== key) {
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
  } catch (err) {
    logServerErr(
      `[Electron] Failed to read .env for ${key}: ${err && err.stack ? err.stack : String(err)}`
    );
  }
  return "";
}

function resolveRuntimeApiToken() {
  const cfg = loadRuntimeConfig();
  const serverCfg = cfg && typeof cfg === "object" ? (cfg.server || {}) : {};
  const envName = String(serverCfg.api_token_env || "TAFFY_API_TOKEN").trim() || "TAFFY_API_TOKEN";
  const directToken = String(serverCfg.api_token || "").trim();
  if (directToken) {
    return directToken;
  }
  const envToken = String(process.env[envName] || "").trim();
  if (envToken) {
    return envToken;
  }
  return readEnvFileVar(envName);
}

function parsePythonVersion(versionOutput) {
  const text = String(versionOutput || "").trim();
  const match = text.match(/Python\s+(\d+)\.(\d+)(?:\.(\d+))?/i);
  if (!match) {
    return null;
  }
  return {
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3] || 0),
    raw: `${match[1]}.${match[2]}.${match[3] || 0}`,
  };
}

function probePythonExecutable(executable) {
  try {
    const result = spawnSync(executable, ["--version"], {
      encoding: "utf8",
      windowsHide: true,
    });
    if (result.error) {
      return {
        ok: false,
        reason: result.error.message || String(result.error),
      };
    }
    const combinedOutput = `${result.stdout || ""}\n${result.stderr || ""}`.trim();
    if (result.status !== 0) {
      return {
        ok: false,
        reason: `exit ${result.status}${combinedOutput ? `: ${combinedOutput}` : ""}`,
      };
    }
    const version = parsePythonVersion(combinedOutput);
    if (!version) {
      return {
        ok: false,
        reason: `unable to parse --version output: ${combinedOutput || "(empty)"}`,
      };
    }
    const supported = version.major > 3 || (version.major === 3 && version.minor >= 8);
    return {
      ok: true,
      supported,
      versionText: version.raw,
    };
  } catch (err) {
    return {
      ok: false,
      reason: err && err.message ? err.message : String(err),
    };
  }
}

function resolvePythonExecutable(runtimeConfig) {
  const configuredPython = String(runtimeConfig?.pythonPath || "").trim();
  if (configuredPython) {
    const probe = probePythonExecutable(configuredPython);
    if (!probe.ok) {
      throw new Error(
        `Configured pythonPath "${configuredPython}" is not runnable: ${probe.reason}`
      );
    }
    if (!probe.supported) {
      throw new Error(
        `Configured pythonPath "${configuredPython}" is Python ${probe.versionText}, requires 3.8+`
      );
    }
    logServerErr(
      `[Electron] Selected Python executable from config: ${configuredPython} (Python ${probe.versionText})`
    );
    return configuredPython;
  }

  const localVenvCandidates = process.platform === "win32"
    ? [path.join(ROOT_DIR, ".venv", "Scripts", "python.exe")]
    : [
        path.join(ROOT_DIR, ".venv", "bin", "python3"),
        path.join(ROOT_DIR, ".venv", "bin", "python"),
      ];
  const candidates = [...localVenvCandidates, "python3", "python"];
  const probeErrors = [];
  for (const candidate of candidates) {
    const probe = probePythonExecutable(candidate);
    if (!probe.ok) {
      probeErrors.push(`${candidate}: ${probe.reason}`);
      continue;
    }
    if (!probe.supported) {
      probeErrors.push(`${candidate}: Python ${probe.versionText} (<3.8)`);
      continue;
    }
    logServerErr(
      `[Electron] Selected Python executable: ${candidate} (Python ${probe.versionText})`
    );
    return candidate;
  }

  throw new Error(
    `No compatible Python 3.8+ executable found. Checked: ${probeErrors.join("; ")}`
  );
}

function getPathEnvKey(envObject) {
  const keys = Object.keys(envObject || {});
  const hit = keys.find((key) => String(key).toLowerCase() === "path");
  return hit || "Path";
}

function buildPythonProcessEnv(pythonExecutable) {
  const env = { ...process.env };
  const runtimeConfig = loadRuntimeConfig();
  const serverCfg = runtimeConfig && typeof runtimeConfig === "object"
    ? (runtimeConfig.server || {})
    : {};
  const apiTokenEnvName = String(serverCfg.api_token_env || "TAFFY_API_TOKEN").trim() || "TAFFY_API_TOKEN";
  const releaseMode = !!app.isPackaged;
  env.TAFFY_RELEASE_MODE = releaseMode ? "1" : "0";
  if (releaseMode) {
    const requireApiToken = serverCfg.require_api_token !== false;
    const explicitToken = String(serverCfg.api_token || "").trim();
    const envToken = String(env[apiTokenEnvName] || "").trim();
    const envFileToken = String(readEnvFileVar(apiTokenEnvName) || "").trim();
    if (requireApiToken && !explicitToken && !envToken && !envFileToken) {
      const generatedToken = crypto.randomBytes(24).toString("hex");
      env[apiTokenEnvName] = generatedToken;
      process.env[apiTokenEnvName] = generatedToken;
      logServerErr(`[Electron] Generated runtime API token for packaged mode (${apiTokenEnvName}).`);
    }
  }
  const pathKey = getPathEnvKey(env);
  const rawPath = String(env[pathKey] || "");
  const selected = String(pythonExecutable || "").replace(/\//g, "\\").toLowerCase();
  const usingGptSovitsPython = selected.includes("\\mini\\envs\\gptsovits\\");

  if (!rawPath) {
    return env;
  }

  const removed = [];
  const filtered = rawPath
    .split(";")
    .map((entry) => String(entry || "").trim())
    .filter(Boolean)
    .filter((entry) => {
      const normalized = entry.replace(/\//g, "\\").toLowerCase();
      const isGptSovitsLibraryPath =
        normalized.includes("\\mini\\envs\\gptsovits\\library\\bin")
        || normalized.includes("\\mini\\envs\\gptsovits\\library\\usr\\bin")
        || normalized.includes("\\mini\\envs\\gptsovits\\library\\mingw-w64\\bin");
      if (!isGptSovitsLibraryPath) {
        return true;
      }
      if (usingGptSovitsPython) {
        return true;
      }
      removed.push(entry);
      return false;
    });

  env[pathKey] = filtered.join(";");

  if (!usingGptSovitsPython) {
    delete env.CONDA_PREFIX;
    delete env.CONDA_DEFAULT_ENV;
    delete env.CONDA_PROMPT_MODIFIER;
    delete env.PYTHONHOME;
  }

  if (removed.length) {
    logServerErr(
      `[Electron] Sanitized PATH for backend Python; removed entries: ${removed.join(" | ")}`
    );
  }

  env.TAFFY_MANAGED_BY = "electron";

  return env;
}

function buildBackendCrashMessage(codeLabel, extraMessage = "") {
  let message =
    `馨语AI桌宠后端意外退出 (code: ${codeLabel})\n` +
    "请查看 server_err.log 了解详情。\n\n" +
    "常见原因：Python 版本不匹配、缺少依赖库。";
  if (extraMessage) {
    message += `\n${extraMessage}`;
  }
  return message;
}

function reportBackendFatal(message) {
  if (!backendFailureShown) {
    backendFailureShown = true;
    dialog.showErrorBox("馨语AI桌宠后端错误", message);
  }
  if (!isAppQuitting) {
    isAppQuitting = true;
    app.quit();
  }
}

function clearBackendRestartTimer() {
  if (backendRestartTimer) {
    clearTimeout(backendRestartTimer);
    backendRestartTimer = null;
  }
}

function scheduleBackendRestart(reasonLabel = "runtime-restart") {
  if (isAppQuitting) {
    return;
  }
  if (backendRestartAttempts >= BACKEND_RESTART_MAX_ATTEMPTS) {
    const reasonText = `Backend restart exceeded ${BACKEND_RESTART_MAX_ATTEMPTS} attempts. Check server_err.log.`;
    const recent = getBackendRecentOutputSummary();
    reportBackendFatal(
      buildBackendCrashMessage(
        reasonLabel,
        recent ? `${reasonText}\n${recent}` : reasonText
      )
    );
    return;
  }
  backendRestartAttempts += 1;
  const currentAttempt = backendRestartAttempts;
  clearBackendRestartTimer();
  logServerErr(
    `[Electron] Scheduling backend restart (${reasonLabel}), attempt ${currentAttempt}/${BACKEND_RESTART_MAX_ATTEMPTS}`
  );
  backendRestartTimer = setTimeout(async () => {
    backendRestartTimer = null;
    if (isAppQuitting) {
      return;
    }
    try {
      startPythonServer();
      await waitServerReady(20000);
      backendRestartAttempts = 0;
      logServerErr("[Electron] Backend restart completed.");
    } catch (err) {
      const detail = err && err.stack ? err.stack : String(err);
      const recent = getBackendRecentOutputSummary();
      const merged = recent ? `${detail}\n${recent}` : detail;
      reportBackendFatal(buildBackendCrashMessage("restart-failed", merged));
    }
  }, BACKEND_RESTART_DELAY_MS);
}

function clampNumber(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function getWindowStatePath() {
  return path.join(app.getPath("userData"), "window-state.json");
}

function readWindowStateFromDisk() {
  try {
    const file = getWindowStatePath();
    if (!fs.existsSync(file)) {
      return { layoutVersion: 0, model: null, chat: null, locked: false };
    }
    const raw = fs.readFileSync(file, "utf8");
    const data = JSON.parse(raw);
    if (!data || typeof data !== "object") {
      return { layoutVersion: 0, model: null, chat: null, locked: false };
    }
    return {
      layoutVersion: Math.max(0, Math.round(Number(data.layoutVersion) || 0)),
      model: data.model && typeof data.model === "object" ? data.model : null,
      chat: data.chat && typeof data.chat === "object" ? data.chat : null,
      locked: !!data.locked,
    };
  } catch (_) {
    return { layoutVersion: 0, model: null, chat: null, locked: false };
  }
}

function normalizeBounds(raw, fallback, minWidth, minHeight) {
  const src = raw && typeof raw === "object" ? raw : {};
  const x = Number.isFinite(Number(src.x)) ? Math.round(Number(src.x)) : fallback.x;
  const y = Number.isFinite(Number(src.y)) ? Math.round(Number(src.y)) : fallback.y;
  const widthBase = Number.isFinite(Number(src.width)) ? Math.round(Number(src.width)) : fallback.width;
  const heightBase = Number.isFinite(Number(src.height)) ? Math.round(Number(src.height)) : fallback.height;
  return {
    x,
    y,
    width: Math.max(minWidth, widthBase),
    height: Math.max(minHeight, heightBase),
  };
}

function fitBoundsToWorkArea(bounds, minWidth, minHeight) {
  const probe = {
    x: Number(bounds.x) || 0,
    y: Number(bounds.y) || 0,
    width: Math.max(1, Number(bounds.width) || minWidth),
    height: Math.max(1, Number(bounds.height) || minHeight),
  };
  const display = screen.getDisplayMatching(probe) || screen.getPrimaryDisplay();
  const work = display.workArea;
  const width = clampNumber(Math.round(probe.width), minWidth, Math.max(minWidth, work.width));
  const height = clampNumber(Math.round(probe.height), minHeight, Math.max(minHeight, work.height));
  const x = clampNumber(Math.round(probe.x), work.x, work.x + work.width - width);
  const y = clampNumber(Math.round(probe.y), work.y, work.y + work.height - height);
  return { x, y, width, height };
}

function getDefaultModelBounds() {
  const point = screen.getCursorScreenPoint();
  const display = screen.getDisplayNearestPoint(point) || screen.getPrimaryDisplay();
  const work = display.workArea;
  return { x: work.x, y: work.y, width: work.width, height: work.height };
}

function getDefaultChatBounds(modelBounds = null) {
  const work = screen.getPrimaryDisplay().workArea;
  const width = Math.min(1280, Math.max(860, Math.round(work.width * 0.82)));
  const height = Math.min(840, Math.max(600, Math.round(work.height * 0.86)));
  const x = Math.round(work.x + (work.width - width) / 2);
  const y = Math.round(work.y + (work.height - height) / 2);
  return { x, y, width, height };
}

function captureWindowBounds(win) {
  if (!win || win.isDestroyed()) {
    return null;
  }
  const [x, y] = win.getPosition();
  const [width, height] = win.getSize();
  return { x, y, width, height };
}

function writeWindowStateToDisk(payload) {
  try {
    const file = getWindowStatePath();
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, JSON.stringify(payload, null, 2), "utf8");
  } catch (_) {
    // ignore write errors
  }
}

function applyWindowLockToWindow(win) {
  if (!win || win.isDestroyed()) {
    return;
  }
  try {
    if (typeof win.setMovable === "function") {
      win.setMovable(!windowLocked);
    }
  } catch (_) {
    // ignore
  }
  try {
    if (typeof win.setResizable === "function") {
      win.setResizable(!windowLocked);
    }
  } catch (_) {
    // ignore
  }
}

function applyWindowLockToAllWindows() {
  applyWindowLockToWindow(modelWindow);
  applyWindowLockToWindow(chatWindow);
}

function shouldKeepWindowsAlwaysOnTop() {
  const desktopCfg = earlyRuntimeConfig && typeof earlyRuntimeConfig === "object"
    ? (earlyRuntimeConfig.desktop || {})
    : {};
  return desktopCfg.always_on_top === true;
}

function applyWindowAlwaysOnTop(win) {
  if (!win || win.isDestroyed()) {
    return;
  }
  const enabled = shouldKeepWindowsAlwaysOnTop();
  try {
    if (process.platform === "darwin") {
      win.setAlwaysOnTop(enabled, "screen-saver");
    } else {
      win.setAlwaysOnTop(enabled);
    }
  } catch (_) {
    try {
      win.setAlwaysOnTop(enabled);
    } catch (_) {
      // ignore
    }
  }
  if (enabled && process.platform === "darwin") {
    try {
      if (typeof win.setVisibleOnAllWorkspaces === "function") {
        win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
      }
    } catch (_) {
      // ignore
    }
  }
}

function broadcastWindowLockState() {
  const windows = [modelWindow, chatWindow];
  for (const win of windows) {
    if (!win || win.isDestroyed()) {
      continue;
    }
    try {
      win.webContents.send("window-lock-changed", !!windowLocked);
    } catch (_) {
      // ignore
    }
  }
}

function setWindowLocked(locked, opts = {}) {
  const next = !!locked;
  const broadcast = opts.broadcast !== false;
  const save = opts.save !== false;
  if (windowLocked === next) {
    if (broadcast) {
      broadcastWindowLockState();
    }
    return;
  }
  windowLocked = next;
  applyWindowLockToAllWindows();
  if (save) {
    scheduleSaveWindowState(0);
  }
  if (broadcast) {
    broadcastWindowLockState();
  }
}

function saveWindowStateNow() {
  const snapshot = {
    layoutVersion: WINDOW_LAYOUT_VERSION,
    model: captureWindowBounds(modelWindow) || persistedWindowState.model || null,
    chat: captureWindowBounds(chatWindow) || persistedWindowState.chat || null,
    locked: !!windowLocked,
  };
  persistedWindowState = snapshot;
  writeWindowStateToDisk(snapshot);
}

function scheduleSaveWindowState(delayMs = 120) {
  if (windowStateSaveTimer) {
    clearTimeout(windowStateSaveTimer);
    windowStateSaveTimer = null;
  }
  windowStateSaveTimer = setTimeout(() => {
    windowStateSaveTimer = null;
    saveWindowStateNow();
  }, Math.max(0, Number(delayMs) || 0));
}

async function captureDesktopDataUrl(win) {
  const cursorPoint = screen.getCursorScreenPoint();
  const display = screen.getDisplayNearestPoint(cursorPoint);
  // Keep screenshots lightweight for lower latency on CPU inference.
  const aspect = Math.max(0.5, Math.min(3, display.size.width / Math.max(1, display.size.height)));
  let width = 640;
  let height = Math.round(width / aspect);
  if (height < 300) {
    height = 300;
    width = Math.round(height * aspect);
  }
  width = Math.max(360, Math.min(960, width));
  height = Math.max(240, Math.min(540, height));
  const sources = await desktopCapturer.getSources({
    types: ["screen"],
    thumbnailSize: { width, height },
    fetchWindowIcons: false,
  });
  if (!sources.length) {
    throw new Error("No desktop source found.");
  }

  const displayId = String(display.id);
  const source =
    sources.find((item) => String(item.display_id || "") === displayId) || sources[0];
  if (!source.thumbnail || source.thumbnail.isEmpty()) {
    throw new Error("Desktop capture returned empty image.");
  }
  return source.thumbnail.toDataURL();
}

function waitServerReady(timeoutMs = 20000) {
  const start = Date.now();
  const probe = `${SERVER_URL}/config.json`;
  return new Promise((resolve, reject) => {
    const tick = () => {
      const req = http.get(probe, (res) => {
        res.resume();
        if (res.statusCode === 200) {
          resolve(true);
          return;
        }
        if (Date.now() - start > timeoutMs) {
          reject(new Error(`Server not ready (status=${res.statusCode})`));
          return;
        }
        setTimeout(tick, 250);
      });
      req.on("error", () => {
        if (Date.now() - start > timeoutMs) {
          reject(new Error("Server startup timed out"));
          return;
        }
        setTimeout(tick, 250);
      });
      req.setTimeout(2500, () => {
        req.destroy();
      });
    };
    tick();
  });
}

function startPythonServer() {
  if (pythonProc) {
    return;
  }
  resetBackendRecentBuffers();
  pythonSessionMeta = null;
  const runtimeConfig = loadRuntimeConfig();
  const pythonExecutable = resolvePythonExecutable(runtimeConfig);
  const pythonEnv = buildPythonProcessEnv(pythonExecutable);
  logServerOut("[Electron] Starting Python server...");
  logServerErr(`[Electron] Starting Python server with executable: ${pythonExecutable}`);
  openPythonLogStreams();

  pythonProc = spawn(pythonExecutable, ["app.py"], {
    cwd: ROOT_DIR,
    env: pythonEnv,
    windowsHide: true,
    stdio: ["ignore", "pipe", "pipe"],
  });
  pythonSessionMeta = {
    pid: pythonProc && typeof pythonProc.pid === "number" ? pythonProc.pid : null,
    startedAtMs: Date.now(),
    startedAtIso: new Date().toISOString(),
    pythonExecutable,
  };

  if (pythonProc.stdout && pythonStdoutStream) {
    pythonProc.stdout.pipe(pythonStdoutStream, { end: false });
    pythonProc.stdout.on("data", (chunk) => {
      pushRecentBackendLines(backendRecentStdoutLines, chunk);
    });
  }
  if (pythonProc.stderr && pythonStderrStream) {
    pythonProc.stderr.pipe(pythonStderrStream, { end: false });
    pythonProc.stderr.on("data", (chunk) => {
      pushRecentBackendLines(backendRecentStderrLines, chunk);
    });
  }

  pythonProc.on("error", (err) => {
    const detail = err && err.stack ? err.stack : String(err);
    logServerErr(`[Electron] Python process error: ${detail}`);
    pythonProc = null;
    closePythonLogStreams();
    if (isAppQuitting) {
      return;
    }
    reportBackendFatal(buildBackendCrashMessage("spawn-error"));
  });

  pythonProc.on("exit", (code, signal) => {
    logServerErr(buildBackendExitDiagnostic(code, signal));
    pythonProc = null;
    closePythonLogStreams();
    if (isAppQuitting) {
      return;
    }
    if (!signal && code === BACKEND_RESTART_EXIT_CODE) {
      scheduleBackendRestart("runtime-restart");
      return;
    }
    if (!signal && typeof code === "number" && code !== 0) {
      scheduleBackendRestart(`unexpected-exit-${code}`);
      return;
    }
    if (signal) {
      scheduleBackendRestart(`unexpected-signal-${signal}`);
      return;
    }
    if (typeof code === "number" && code !== 0) {
      const codeLabel = String(code);
      const detail = getBackendRecentOutputSummary();
      reportBackendFatal(buildBackendCrashMessage(codeLabel, detail));
    }
  });
}

function stopPythonServer() {
  clearBackendRestartTimer();
  if (!pythonProc) {
    closePythonLogStreams();
    return;
  }
  try {
    pythonProc.kill();
  } catch (_) {
    // ignore
  }
  pythonProc = null;
  closePythonLogStreams();
}

function createModelWindow() {
  const bounds = getDefaultModelBounds();
  const alwaysOnTop = shouldKeepWindowsAlwaysOnTop();
  const modelWindowFocusable = alwaysOnTop ? false : true;
  modelWindow = new BrowserWindow({
    width: bounds.width,
    height: bounds.height,
    x: bounds.x,
    y: bounds.y,
    title: "馨语AI桌宠 · Live2D",
    frame: false,
    transparent: true,
    hasShadow: false,
    backgroundColor: "#00000000",
    alwaysOnTop,
    skipTaskbar: true,
    focusable: modelWindowFocusable,
    resizable: false,
    show: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      backgroundThrottling: false,
    },
  });
  applyWindowLockToWindow(modelWindow);
  applyWindowAlwaysOnTop(modelWindow);
  modelWindow.setIgnoreMouseEvents(true, { forward: true });
  modelWindow.setMenuBarVisibility(false);
  modelWindow.on("page-title-updated", (event) => {
    event.preventDefault();
    modelWindow?.setTitle("馨语AI桌宠 · Live2D");
  });
  const renderDiagnosticsQuery = LIVE2D_RENDER_DIAGNOSTICS ? "&render_diagnostics=1" : "";
  modelWindow.loadURL(
    `${SERVER_URL}/?desktop=1&transparent=1&engine=electron&alpha_mode=truealpha&view=model${renderDiagnosticsQuery}`
  );
  modelWindow.webContents.on("did-finish-load", () => {
    try {
      modelWindow.webContents.send("window-lock-changed", !!windowLocked);
    } catch (_) {
      // ignore
    }
    syncCompanionSurfaceVisibility();
  });
  if (AUTO_OPEN_DEVTOOLS) {
    modelWindow.webContents.openDevTools({ mode: "detach" });
  }
  modelWindow.on("close", () => saveWindowStateNow());
  modelWindow.on("closed", () => {
    modelWindowReady = false;
    pendingSubtitle = null;
    modelWindow = null;
    if (chatWindow && !chatWindow.isDestroyed()) {
      chatWindow.close();
    }
  });
}

function createChatWindow() {
  const modelBounds =
    modelWindow && !modelWindow.isDestroyed()
      ? modelWindow.getBounds()
      : fitBoundsToWorkArea(
        normalizeBounds(persistedWindowState.model, getDefaultModelBounds(), 340, 560),
        340,
        560
      );
  const defaults = getDefaultChatBounds(modelBounds);
  const hasCurrentStageLayout = Number(persistedWindowState.layoutVersion || 0) >= WINDOW_LAYOUT_VERSION;
  const restored = hasCurrentStageLayout
    ? normalizeBounds(persistedWindowState.chat, defaults, 760, 560)
    : defaults;
  const bounds = fitBoundsToWorkArea(restored, 760, 560);
  chatWindow = new BrowserWindow({
    width: bounds.width,
    height: bounds.height,
    x: bounds.x,
    y: bounds.y,
    title: "馨语AI桌宠",
    minWidth: 760,
    minHeight: 560,
    frame: true,
    titleBarStyle: "hidden",
    titleBarOverlay: {
      color: "#00000000",
      symbolColor: "#665967",
      height: 30,
    },
    transparent: false,
    backgroundColor: "#080d19",
    resizable: true,
    show: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      backgroundThrottling: false,
    },
  });
  applyWindowLockToWindow(chatWindow);
  applyWindowAlwaysOnTop(chatWindow);
  chatWindow.setMenuBarVisibility(false);
  const renderDiagnosticsQuery = LIVE2D_RENDER_DIAGNOSTICS ? "&render_diagnostics=1" : "";
  chatWindow.loadURL(`${SERVER_URL}/?desktop=1&engine=electron&view=full${renderDiagnosticsQuery}`);
  chatWindow.webContents.on("did-finish-load", () => {
    try {
      chatWindow.webContents.send("window-lock-changed", !!windowLocked);
    } catch (_) {
      // ignore
    }
    syncCompanionSurfaceVisibility();
  });
  if (AUTO_OPEN_DEVTOOLS) {
    chatWindow.webContents.openDevTools({ mode: "detach" });
  }
  chatWindow.on("move", () => scheduleSaveWindowState(120));
  chatWindow.on("resize", () => scheduleSaveWindowState(120));
  chatWindow.on("show", () => scheduleCompanionSurfaceVisibilitySync(0));
  chatWindow.on("restore", () => scheduleCompanionSurfaceVisibilitySync(0));
  chatWindow.on("minimize", () => scheduleCompanionSurfaceVisibilitySync(40));
  chatWindow.on("hide", () => scheduleCompanionSurfaceVisibilitySync(40));
  chatWindow.on("close", () => saveWindowStateNow());
  chatWindow.on("closed", () => {
    chatWindow = null;
    if (modelWindow && !modelWindow.isDestroyed()) {
      modelWindow.close();
    }
  });
}

function setRendererSurfaceActive(win, active, allowBackgroundThrottling = false) {
  if (!win || win.isDestroyed()) {
    return;
  }
  try {
    if (allowBackgroundThrottling && typeof win.webContents?.setBackgroundThrottling === "function") {
      win.webContents.setBackgroundThrottling(!active);
    }
  } catch (_) {
    // ignore unsupported runtime toggles
  }
  try {
    win.webContents.send("surface-active-changed", !!active);
  } catch (_) {
    // renderer may still be loading
  }
}

function isChatStageActive() {
  return !!(
    chatWindow
    && !chatWindow.isDestroyed()
    && chatWindow.isVisible()
    && !chatWindow.isMinimized()
  );
}

function syncCompanionSurfaceVisibility() {
  const stageActive = isChatStageActive();
  const petActive = !stageActive || !modelWindowReady;
  if (modelWindow && !modelWindow.isDestroyed()) {
    try {
      if (petActive) {
        modelWindow.setOpacity(1);
        if (!modelWindow.isVisible()) {
          if (typeof modelWindow.showInactive === "function") {
            modelWindow.showInactive();
          } else {
            modelWindow.show();
          }
        }
      } else {
        // Keeping the transparent WebGL window alive avoids a blank Live2D
        // surface when Windows restores it after the stage is minimized.
        modelWindow.setOpacity(0);
      }
    } catch (_) {
      // ignore visibility races during startup/shutdown
    }
    setRendererSurfaceActive(modelWindow, petActive, true);
  }
  setRendererSurfaceActive(chatWindow, stageActive, false);
}

function scheduleCompanionSurfaceVisibilitySync(delayMs = 0) {
  setTimeout(() => syncCompanionSurfaceVisibility(), Math.max(0, Number(delayMs) || 0));
}

function createAppWindows() {
  createModelWindow();
  createChatWindow();
  syncCompanionSurfaceVisibility();
}

ipcMain.on("window-move-by", (event, dx, dy) => {
  if (windowLocked) {
    return;
  }
  const win = BrowserWindow.fromWebContents(event.sender);
  if (!win) {
    return;
  }
  const ix = Number.isFinite(Number(dx)) ? Math.round(Number(dx)) : 0;
  const iy = Number.isFinite(Number(dy)) ? Math.round(Number(dy)) : 0;
  if (ix === 0 && iy === 0) {
    return;
  }
  const [x, y] = win.getPosition();
  const [width, height] = win.getSize();
  const nextBounds = {
    x: x + ix,
    y: y + iy,
    width: Math.max(1, Number(width) || 1),
    height: Math.max(1, Number(height) || 1),
  };
  const display = screen.getDisplayMatching(nextBounds) || screen.getPrimaryDisplay();
  const work = display.workArea;
  const maxX = work.x + Math.max(0, work.width - nextBounds.width);
  const maxY = work.y + Math.max(0, work.height - nextBounds.height);
  const nx = clampNumber(nextBounds.x, work.x, maxX);
  const ny = clampNumber(nextBounds.y, work.y, maxY);
  win.setPosition(nx, ny, false);
});

ipcMain.on("window-set-clickthrough", (event, ignore) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (!win || win.isDestroyed()) return;
  try {
    if (ignore) {
      win.setIgnoreMouseEvents(true, { forward: true });
    } else {
      win.setIgnoreMouseEvents(false);
    }
  } catch (_) {}
});

ipcMain.on("window-resize", (event, w, h) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (!win || win.isDestroyed()) return;
  const iw = Math.max(200, Math.round(Number(w) || 390));
  const ih = Math.max(300, Math.round(Number(h) || 700));
  win.setSize(iw, ih);
});

ipcMain.on("set-ignore-mouse-events", (event, ignore, options) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (!win || win.isDestroyed()) return;
  try {
    win.setIgnoreMouseEvents(!!ignore, options || {});
  } catch (_) {
    // ignore - window may be closing
  }
});

ipcMain.on("window-lock-set", (_event, locked) => {
  setWindowLocked(locked);
});

ipcMain.on("window-minimize", (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (!win || win.isDestroyed() || win !== chatWindow) {
    return;
  }
  try {
    win.minimize();
  } catch (_) {
    // ignore shutdown races
  }
});

ipcMain.on("window-titlebar-theme", (event, rawTheme) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (!win || win.isDestroyed() || win !== chatWindow || typeof win.setTitleBarOverlay !== "function") {
    return;
  }
  const theme = String(rawTheme || "").trim().toLowerCase() === "night" ? "night" : "day";
  try {
    win.setTitleBarOverlay({
      color: "#00000000",
      symbolColor: theme === "night" ? "#d9d9e4" : "#5f5662",
      height: 30,
    });
  } catch (_) {
    // Ignore unsupported title-bar overlay updates on older Electron builds.
  }
});

ipcMain.on("surface-renderer-ready", (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win !== modelWindow || !modelWindow || modelWindow.isDestroyed()) {
    return;
  }
  modelWindowReady = true;
  if (pendingSubtitle) {
    const payload = pendingSubtitle;
    pendingSubtitle = null;
    try {
      modelWindow.webContents.send("subtitle-show", payload);
    } catch (_) {
      // ignore renderer shutdown races
    }
  }
  syncCompanionSurfaceVisibility();
});

ipcMain.on("live2d-render-metrics", (event, rawPayload) => {
  if (!LIVE2D_RENDER_DIAGNOSTICS) {
    return;
  }
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win !== modelWindow && win !== chatWindow) {
    return;
  }
  const payload = rawPayload && typeof rawPayload === "object" ? rawPayload : {};
  const safe = {
    surface: win === modelWindow ? "pet" : "stage",
    view: String(payload.view || "").slice(0, 16),
    fps: Math.max(0, Math.min(240, Number(payload.fps) || 0)),
    tickerFps: Math.max(0, Math.min(240, Number(payload.tickerFps) || 0)),
    rendererWidth: Math.max(0, Math.min(16384, Math.round(Number(payload.rendererWidth) || 0))),
    rendererHeight: Math.max(0, Math.min(16384, Math.round(Number(payload.rendererHeight) || 0))),
    resolution: Math.max(0.25, Math.min(4, Number(payload.resolution) || 1)),
    devicePixelRatio: Math.max(0.25, Math.min(4, Number(payload.devicePixelRatio) || 1)),
  };
  logServerOut(`[Live2D] Render metrics ${JSON.stringify(safe)}`);
});

ipcMain.handle("window-lock-get", async () => !!windowLocked);
ipcMain.handle("get-api-token", async () => resolveRuntimeApiToken());
ipcMain.handle("surface-active-get", async (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win === modelWindow) {
    return !!(modelWindow && !modelWindow.isDestroyed() && (!isChatStageActive() || !modelWindowReady));
  }
  if (win === chatWindow) {
    return isChatStageActive();
  }
  return true;
});

ipcMain.handle("get-cursor-screen-point", async () => {
  const point = screen.getCursorScreenPoint();
  return { x: point.x, y: point.y };
});

ipcMain.handle("get-model-window-bounds", async () => {
  if (!modelWindow || modelWindow.isDestroyed()) {
    return null;
  }
  const bounds = modelWindow.getBounds();
  return {
    x: bounds.x,
    y: bounds.y,
    width: bounds.width,
    height: bounds.height
  };
});

ipcMain.handle("capture-desktop", async (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  return await captureDesktopDataUrl(win);
});

ipcMain.on("subtitle-show", (_event, payload) => {
  if (!modelWindow || modelWindow.isDestroyed()) return;
  if (!modelWindowReady) {
    pendingSubtitle = payload;
    return;
  }
  pendingSubtitle = null;
  try {
    modelWindow.webContents.send("subtitle-show", payload);
  } catch (_) {}
});

ipcMain.on("subtitle-hide", (_event, payload) => {
  if (!modelWindow || modelWindow.isDestroyed()) return;
  try {
    modelWindow.webContents.send("subtitle-hide", payload);
  } catch (_) {}
});

app.on("before-quit", () => {
  isAppQuitting = true;
  if (windowStateSaveTimer) {
    clearTimeout(windowStateSaveTimer);
    windowStateSaveTimer = null;
  }
  saveWindowStateNow();
  stopManagedLocalTtsService();
  stopPythonServer();
});

app.on("window-all-closed", () => {
  app.quit();
});

app.whenReady().then(async () => {
  try {
    persistedWindowState = readWindowStateFromDisk();
    windowLocked = !!persistedWindowState.locked;
    const ses = session.defaultSession;
    ses.setPermissionCheckHandler((_webContents, permission) => {
      if (permission === "media" || permission === "microphone") {
        return true;
      }
      if (permission === "display-capture") {
        return true;
      }
      return false;
    });
    ses.setPermissionRequestHandler((_webContents, permission, callback, details) => {
      if (permission === "media") {
        const mediaTypes = Array.isArray(details?.mediaTypes) ? details.mediaTypes : [];
        if (mediaTypes.includes("audio")) {
          callback(true);
          return;
        }
      }
      if (permission === "display-capture") {
        callback(true);
        return;
      }
      callback(false);
    });

    await startManagedLocalTtsService();
    startPythonServer();
    await waitServerReady(20000);
    createAppWindows();
  } catch (err) {
    const detail = err && err.stack ? err.stack : String(err);
    console.error(err);
    logServerErr(`[Electron] Startup failure: ${detail}`);
    stopPythonServer();
    reportBackendFatal(
      buildBackendCrashMessage(
        "startup",
        `启动检查失败: ${err && err.message ? err.message : String(err)}`
      )
    );
  }
});
