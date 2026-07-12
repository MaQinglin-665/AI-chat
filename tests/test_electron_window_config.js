#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const assert = require("assert");

const MAIN_JS = path.resolve(__dirname, "..", "electron", "main.js");
const CONFIG_EXAMPLE_JSON = path.resolve(__dirname, "..", "config.example.json");

const mainSource = fs.readFileSync(MAIN_JS, "utf8");
const exampleConfig = JSON.parse(fs.readFileSync(CONFIG_EXAMPLE_JSON, "utf8"));

assert.strictEqual(
  exampleConfig.desktop && exampleConfig.desktop.always_on_top,
  false,
  "Default desktop.always_on_top should remain false"
);
assert.ok(
  mainSource.includes("function shouldKeepWindowsAlwaysOnTop()"),
  "Electron main should centralize always-on-top policy"
);
assert.ok(
  mainSource.includes("return desktopCfg.always_on_top === true;"),
  "Electron main should enable always-on-top only when config explicitly opts in"
);
assert.ok(
  mainSource.includes("const alwaysOnTop = shouldKeepWindowsAlwaysOnTop();"),
  "Model window should read always-on-top from config"
);
assert.ok(
  mainSource.includes("const modelWindowFocusable = alwaysOnTop ? false : true;"),
  "Model window should remain focusable when it is not always-on-top so drag can receive input"
);
assert.ok(
  mainSource.includes("alwaysOnTop,"),
  "BrowserWindow options should use the config-derived alwaysOnTop value"
);
assert.ok(
  mainSource.includes("focusable: modelWindowFocusable,"),
  "Model window focusable option should use the always-on-top-aware value"
);
assert.ok(
  mainSource.includes("win.setAlwaysOnTop(enabled"),
  "Post-create always-on-top call should use the config-derived value"
);
assert.ok(
  !mainSource.includes("alwaysOnTop: true"),
  "Model window should not hard-code alwaysOnTop: true"
);
assert.ok(
  !mainSource.includes("win.setAlwaysOnTop(true"),
  "Electron main should not hard-code setAlwaysOnTop(true)"
);

console.log("Electron window config checks passed.");
