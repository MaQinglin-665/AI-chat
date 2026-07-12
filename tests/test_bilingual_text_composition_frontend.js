#!/usr/bin/env node
"use strict";

const assert = require("assert");
const path = require("path");

const binder = require(path.resolve(__dirname, "..", "web", "chatInputBinder.js"));

function createElement() {
  const handlers = new Map();
  return {
    addEventListener(type, handler) {
      const list = handlers.get(type) || [];
      list.push(handler);
      handlers.set(type, list);
    },
    dispatch(type, event = {}) {
      for (const handler of handlers.get(type) || []) {
        handler(event);
      }
    }
  };
}

{
  const chatInput = createElement();
  const sendBtn = createElement();
  const sends = [];
  binder.bindSendControls({ chatInput, sendBtn }, {
    sendChat: () => sends.push("send")
  });

  let prevented = false;
  chatInput.dispatch("compositionstart");
  chatInput.dispatch("keydown", {
    key: "Enter",
    isComposing: true,
    preventDefault: () => { prevented = true; }
  });
  assert.strictEqual(sends.length, 0, "Enter used to confirm an active IME candidate must not submit a partial chat turn");
  assert.strictEqual(prevented, false, "IME candidate confirmation should keep its native default behavior");

  chatInput.dispatch("compositionend");
  chatInput.dispatch("keydown", {
    key: "Enter",
    keyCode: 229,
    preventDefault: () => { prevented = true; }
  });
  assert.strictEqual(sends.length, 0, "Chromium's legacy 229 composition Enter must not submit after compositionend ordering races");

  prevented = false;
  chatInput.dispatch("keydown", {
    key: "Enter",
    preventDefault: () => { prevented = true; }
  });
  assert.strictEqual(sends.length, 1, "a normal finalized Enter should submit exactly once");
  assert.strictEqual(prevented, true, "only an actual keyboard submission should prevent the native Enter default");

  chatInput.dispatch("keydown", { key: "Enter", repeat: true });
  assert.strictEqual(sends.length, 1, "holding Enter must not issue repeated submissions or interrupt an active reply twice");

  sendBtn.dispatch("click");
  assert.strictEqual(sends.length, 2, "the explicit Send button should remain available after IME handling is added");
}

console.log("Bilingual text composition frontend checks passed.");
