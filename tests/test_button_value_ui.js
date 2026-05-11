#!/usr/bin/env node
"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const INDEX_HTML = path.join(ROOT, "web", "index.html");
const BASE_CSS = path.join(ROOT, "web", "base.css");
const CHAT_DOM_JS = path.join(ROOT, "web", "chatDom.js");
const ADVANCED_ACTION_BINDER_JS = path.join(ROOT, "web", "advancedActionBinder.js");
const DESKTOP_CONTROL_BINDER_JS = path.join(ROOT, "web", "desktopControlBinder.js");
const CHAT_MESSAGE_CONTROLLER_JS = path.join(ROOT, "web", "chatMessageController.js");
const CHARACTER_TUNING_JS = path.join(ROOT, "web", "characterTuning.js");
const CHARACTER_DIAGNOSTICS_CONTROLLER_JS = path.join(ROOT, "web", "characterDiagnosticsController.js");

const html = fs.readFileSync(INDEX_HTML, "utf8");
const css = fs.readFileSync(BASE_CSS, "utf8");
const chatDomSource = fs.readFileSync(CHAT_DOM_JS, "utf8");
const advancedBinderSource = fs.readFileSync(ADVANCED_ACTION_BINDER_JS, "utf8");
const desktopBinderSource = fs.readFileSync(DESKTOP_CONTROL_BINDER_JS, "utf8");
const chatMessageControllerSource = fs.readFileSync(CHAT_MESSAGE_CONTROLLER_JS, "utf8");
const characterTuningSource = fs.readFileSync(CHARACTER_TUNING_JS, "utf8");
const characterDiagnosticsSource = fs.readFileSync(CHARACTER_DIAGNOSTICS_CONTROLLER_JS, "utf8");
const chatMessageController = require(CHAT_MESSAGE_CONTROLLER_JS);

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
    },
    toggle(name, force) {
      const shouldAdd = force === undefined ? !this.contains(name) : force === true;
      if (shouldAdd) {
        this.add(name);
      } else {
        this.remove(name);
      }
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

function testMainButtonSurface() {
  assert.ok(html.includes('id="translation-chip-btn"'), "translation chip should remain as the only translation toggle");
  assert.ok(!html.includes('id="translation-toggle-btn"'), "bottom duplicate translation button should be removed");
  assert.ok(!chatDomSource.includes("translationToggleBtn"), "chatDom should not keep a stale translation toggle reference");

  for (const text of ["模型 / 语音", "记忆管理", "故障自检", "桌面锁定", "观察桌面", "主动陪伴"]) {
    assert.ok(html.includes(text), `more panel should include clear label: ${text}`);
  }
  assert.ok(!html.includes('id="voice-test-btn"'), "voice test should no longer be a standalone more-panel button");
  assert.ok(html.includes('id="config-switch-test-tts-btn"'), "voice test should remain inside the model/voice panel");
  assert.ok(!chatDomSource.includes("voiceTestBtn"), "chatDom should not keep a stale voice test button reference");
  assert.ok(!advancedBinderSource.includes("ui.voiceTestBtn"), "advanced binder should not bind the removed voice test button");
}

function testDevAndFeedbackPlacement() {
  assert.ok(html.includes('class="advanced-actions-group advanced-actions-dev"'), "developer controls should be grouped");
  assert.ok(html.includes('id="character-rehearsal-btn" type="button" data-dev-feature="diagnostics"'));
  assert.ok(html.includes('id="character-tuning-btn" type="button" data-dev-feature="diagnostics"'));
  assert.ok(html.includes('id="followup-readiness-btn" type="button" data-dev-feature="diagnostics"'));

  assert.ok(!html.includes('id="character-feedback-good-btn"'), "global good feedback button should be removed");
  assert.ok(!html.includes('id="character-feedback-bad-btn"'), "global bad feedback button should be removed");
  assert.ok(chatMessageControllerSource.includes("message-feedback"), "assistant message rows should render feedback controls");
  assert.ok(chatMessageControllerSource.includes("recordCharacterPerformanceFeedback"), "message feedback should reuse existing character feedback logic");
}

function testSafetyCopyAndStyles() {
  assert.ok(desktopBinderSource.includes("观察桌面会在你明确开启后读取当前屏幕画面"), "desktop observation should ask for confirmation");
  assert.ok(desktopBinderSource.includes("主动陪伴会让桌宠低频主动开启话题"), "active companion mode should ask for confirmation");
  assert.ok(css.includes(".advanced-actions-group"), "more panel should have grouped styling");
  assert.ok(css.includes("body.view-chat [data-dev-feature][hidden]"), "hidden developer diagnostics should stay out of the default layout");
  assert.ok(css.includes("animation: none !important;"), "more panel should render at full opacity without animation flicker");
  assert.ok(css.includes(".message-feedback-btn"), "assistant feedback controls should have dedicated styling");
  assert.ok(css.includes("grid-template-columns: repeat(3, minmax(0, 1fr))"), "primary controls should use a cleaner three-button grid");

  const malformedContentLines = css.split(/\r?\n/).filter((line) => {
    if (!/content:\s*"/.test(line)) {
      return false;
    }
    const quoteCount = (line.match(/"/g) || []).length;
    return quoteCount % 2 !== 0 || !/"\s*(!important)?\s*;/.test(line);
  });
  assert.deepStrictEqual(malformedContentLines, [], "CSS content strings should not break later UI rules");
}

function testFeedbackCopyDoesNotPointToHiddenButtons() {
  assert.ok(!characterTuningSource.includes("下一步可以点“角色调优”"), "feedback copy should not point normal users to a hidden dev button");
  assert.ok(characterTuningSource.includes("更多 → 人设卡"), "feedback copy should offer the visible persona card path");
  assert.ok(characterDiagnosticsSource.includes("先正常聊一句，再在 AI 回复旁点"), "empty feedback state should explain the visible reply-level feedback flow");
  assert.ok(characterDiagnosticsSource.includes("enableFeedback: false"), "feedback system messages should not render another feedback control loop");
}

function testAssistantFeedbackButtonsCallExistingHandler() {
  const documentObject = { createElement };
  const calls = [];
  let status = "";
  const controller = chatMessageController.createController({
    state: { chatRecords: [], history: [] },
    ui: {},
    documentObject,
    recordCharacterPerformanceFeedback: (rating) => {
      calls.push(rating);
      return { ok: true };
    },
    setStatus: (message) => {
      status = message;
    }
  });

  const row = controller.createMessageRow("assistant", "你好呀");
  const feedback = row.querySelector(".message-feedback");
  assert.ok(feedback, "assistant message row should contain feedback controls");
  assert.strictEqual(feedback.children.length, 2);
  feedback.children[0].listeners.click({ stopPropagation() {} });
  feedback.children[1].listeners.click({ stopPropagation() {} });
  assert.deepStrictEqual(calls, ["good", "bad"]);
  assert.ok(status.includes("需要调整"));
}

function testMemoryAndPersonaSurfaces() {
  assert.ok(html.includes('id="learning-stat-candidates"'), "memory management should show candidate pool stats");
  assert.ok(html.includes('id="learning-stat-samples"'), "memory management should show official pool stats");
  assert.ok(html.includes('id="learning-stat-visible"'), "memory management should show filtered visible count");
  assert.ok(html.includes("搜索用户原话、回复或提炼记忆"), "memory management search should match actual pool content");
  assert.ok(!html.includes('id="learning-quick-inject"'), "memory management should hide engineering quick settings from normal users");
  assert.ok(!html.includes('id="learning-quick-support"'), "memory management should hide promotion support tuning from normal users");
  assert.ok(!html.includes("inject_count"), "memory management UI should not expose backend field names");
  assert.ok(!html.includes("promotion_min_support"), "memory management UI should not expose backend field names");

  for (const id of [
    "persona-character-name",
    "persona-user-alias",
    "persona-relationship-role",
    "persona-initiative-level",
    "persona-personality-tags",
    "persona-speaking-style",
    "persona-catchphrases"
  ]) {
    assert.ok(html.includes(`id="${id}"`), `persona card should include functional field: ${id}`);
  }
  assert.ok(!html.includes('id="persona-preview-btn"'), "persona card should remove the duplicate preview button");
  assert.ok(html.includes('id="persona-test-btn"'), "persona card should include a useful test prompt entry");
  assert.ok(!html.includes('class="persona-chip-row"'), "persona card should not show static non-interactive tags");
  assert.ok(!html.includes('class="persona-mini-preview"'), "persona card should not show a static preview that does not reflect real replies");
  assert.ok(css.includes(".learning-memory-overview"), "memory management should have dedicated overview styling");
  assert.ok(css.includes(".persona-basic-grid"), "persona card should use the redesigned functional layout");
  assert.ok(css.includes(".persona-advanced-details"), "persona card should tuck low-frequency identity text into an advanced section");
  assert.ok(css.includes("@media (max-width: 520px)"), "persona card should keep the avatar area compact in narrow windows");
  assert.ok(css.includes("grid-template-columns: 98px minmax(0, 1fr)"), "persona card should preserve a useful avatar/form split on narrow windows");
}

testMainButtonSurface();
testDevAndFeedbackPlacement();
testSafetyCopyAndStyles();
testFeedbackCopyDoesNotPointToHiddenButtons();
testAssistantFeedbackButtonsCallExistingHandler();
testMemoryAndPersonaSurfaces();

console.log("Button value UI checks passed.");
