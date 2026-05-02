#!/usr/bin/env node
"use strict";

const { spawnSync } = require("child_process");
const path = require("path");

const root = path.resolve(__dirname, "..");
const tests = [
  "tests/test_api_client_frontend.js",
  "tests/test_character_runtime_frontend.js",
  "tests/test_chat_api_frontend.js",
  "tests/test_drag_logic.js",
  "tests/test_local_asr_frontend.js",
  "tests/test_speech_text_frontend.js",
  "tests/test_tts_api_frontend.js"
];

for (const test of tests) {
  console.log(`\n==> node ${test}`);
  const result = spawnSync(process.execPath, [test], {
    cwd: root,
    stdio: "inherit"
  });
  if (result.status !== 0) {
    process.exit(result.status || 1);
  }
}

console.log("\n[OK] Node frontend tests complete.");
