#!/usr/bin/env node
"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(ROOT, file), "utf8");
const html = read("web/index.html");
const css = read("web/controlCenter.css");
const kawaiiCss = read("web/kawaiiTheme.css");
const phosphorCss = read("web/phosphorIcons.css");
const shellSource = read("web/controlCenterShell.js");
const diagnosticsSource = read("web/diagnosticsRuntimeController.js");
const chatSource = read("web/chat.js");
const chatDomSource = read("web/chatDom.js");
const binderSource = read("web/advancedActionBinder.js");
const messageSource = read("web/chatMessageController.js");
const localCommandSource = read("web/localCommandExecutor.js");
const configSwitchSource = read("web/configSwitchController.js");
const shell = require(path.join(ROOT, "web", "controlCenterShell.js"));
const storage = require(path.join(ROOT, "web", "storageController.js"));

function testUnifiedPageRegistry() {
  assert.deepStrictEqual(shell.PAGES.map((page) => page.key), [
    "schedule", "persona", "config", "qq", "memory", "doctor"
  ]);
  assert.strictEqual(shell.SURFACES.length, 6);
  for (const selector of [
    ".schedule-dialog", ".persona-dialog", ".config-switch-dialog",
    ".qq-identity-dialog", ".learning-review-drawer", ".doctor-dialog"
  ]) {
    assert.ok(shellSource.includes(selector), `${selector} should use the unified shell`);
  }
}

function testControlCenterMarkupAndLayering() {
  assert.ok(html.includes('href="./controlCenter.css"'));
  assert.ok(html.includes('src="./controlCenterShell.js"'));
  for (const id of [
    "doctor-modal", "doctor-dialog", "doctor-rerun-btn", "doctor-close-btn",
    "doctor-state-title", "doctor-state-copy", "doctor-report-output"
  ]) {
    assert.ok(html.includes(`id="${id}"`), `doctor page should include #${id}`);
    assert.ok(chatDomSource.includes(`getElementById("${id}")`), `chatDom should expose #${id}`);
  }
}

function testVisualSystemContract() {
  assert.ok(css.includes(".control-center-shell"));
  assert.ok(css.includes("grid-template-columns: 220px minmax(0, 1fr)"));
  assert.ok(css.includes(".control-center-nav-item[aria-current=\"page\"]"));
  assert.ok(css.includes(".learning-review-drawer.control-center-shell"));
  assert.ok(css.includes("body.view-full .advanced-actions"));
  assert.ok(css.includes("body[data-stage-room=\"night\"]"));
  assert.ok(css.includes("@media (max-width: 700px)"));
  assert.ok(css.includes("@media (prefers-reduced-motion: reduce)"));
  assert.ok(css.includes(".control-center-nav-list::-webkit-scrollbar"));
  assert.ok(css.includes("flex-wrap: nowrap !important"));
  assert.ok(css.includes("--cc-page: #1d1a20"), "night mode should use a deliberate warm charcoal surface");
  assert.ok(css.includes("background: var(--cc-page) !important"), "page bodies should not inherit washed-out legacy backgrounds");
  assert.ok(!/linear-gradient|radial-gradient/.test(css), "control center should use restrained flat translucent surfaces");
}

function testProgressiveDisclosureContract() {
  assert.deepStrictEqual(Object.keys(shell.PROGRESSIVE_PAGES), ["schedule", "config", "persona", "memory", "doctor"]);
  assert.ok(shellSource.includes("control-center-modebar"));
  assert.ok(shellSource.includes("control-center-advanced-toggle"));
  assert.ok(shellSource.includes('surface.dataset.advancedVisible = expanded ? "true" : "false"'));
  assert.ok(css.includes('.control-center-shell[data-advanced-visible="false"] .control-center-advanced'));
  for (const id of [
    "schedule-mode",
    "config-switch-llm-base-url", "config-switch-llm-api-key", "config-switch-tts-stream-mode",
    "config-switch-live2d-model-path", "config-switch-test-llm-btn", "config-switch-test-live2d-btn",
    "learning-review-undo-btn", "learning-tab-debug", "persona-preferences-section"
  ]) {
    const selector = id === "persona-preferences-section" ? `.${id}` : `#${id}`;
    assert.ok(shellSource.includes(selector), `${selector} should live under advanced settings by default`);
  }
  assert.ok(html.includes('id="config-switch-title">模型与语音</strong>'));
  assert.ok(html.includes('id="config-switch-test-tts-btn" type="button">试听声音</button>'));
  assert.ok(html.includes('id="config-switch-save-btn" class="config-switch-primary-btn" type="button">保存设置</button>'));
  assert.ok(html.includes("<span>当前角色</span>"));
  assert.ok(!shellSource.includes("setTimeout?.(() => documentObject.getElementById"), "page switching should not expose the stage for a frame");
}

function testContinuousPageShellContract() {
  assert.ok(shellSource.includes("control-center-backplane"));
  assert.ok(shellSource.includes("beginPageSwitch(documentObject, page.key)"));
  assert.ok(shellSource.includes("finishPageSwitch(documentObject)"));
  assert.ok(shellSource.includes('documentObject.body?.classList?.toggle("control-center-active", visible)'));
  assert.ok(shellSource.includes('observer.observe(node, { attributes: true, attributeFilter: ["hidden"] })'));
  assert.ok(shellSource.includes("scrollActiveNavigationIntoView(documentObject)"), "narrow navigation should reveal the newly active page");
  assert.ok(shellSource.includes('inline: "center"'), "active narrow navigation should center without changing page topology");
  assert.ok(css.includes(".control-center-backplane-shell"));
  assert.ok(css.includes("body.control-center-switching .control-center-shell"));
  assert.ok(css.includes("z-index: 119"), "stable backplane should stay directly below feature surfaces");
}

function testDoctorWorkflowContract() {
  for (const name of ["openDoctorPanel", "closeDoctorPanel", "setDoctorPanelState"]) {
    assert.ok(diagnosticsSource.includes(`function ${name}`), `diagnostics should implement ${name}`);
  }
  assert.ok(diagnosticsSource.includes('setDoctorPanelState("running"'));
  assert.ok(diagnosticsSource.includes('setDoctorPanelState("complete"'));
  assert.ok(diagnosticsSource.includes('setDoctorPanelState("error"'));
  assert.ok(binderSource.includes("ui.doctorRerunBtn"));
  assert.ok(binderSource.includes("ui.doctorCloseBtn"));
  assert.ok(binderSource.includes("deps.closeDoctorPanel"));
  assert.ok(!diagnosticsSource.includes('appendMessage("assistant", "正在自检聊天、语音和角色接入状态..."'));
  assert.ok(!diagnosticsSource.includes('row?.classList?.add("doctor-report")'));
  assert.ok(!binderSource.includes("Doctor failed:"), "doctor failures should stay in the self-check page, not chat history");
  assert.strictEqual(storage.isLegacyDoctorHistoryRecord({ role: "assistant", content: "正在自检聊天、语音和角色接入状态..." }), true);
  assert.strictEqual(storage.isLegacyDoctorHistoryRecord({ role: "assistant", content: "故障自检完成：全部正常" }), true);
  assert.strictEqual(storage.isLegacyDoctorHistoryRecord({ role: "assistant", content: "普通聊天内容" }), false);
}

function testSystemMessagesStayOutOfHistory() {
  assert.ok(messageSource.includes('const isSystemMessage = options.category === "system"'));
  assert.ok(messageSource.includes("options.persist !== false && !isSystemMessage"));
  assert.ok(localCommandSource.includes("function appendSystem"));
  assert.ok(localCommandSource.includes('category: "system"'));
  assert.ok(!configSwitchSource.includes('appendMessage("assistant", `模型测试：'));
  assert.ok(!configSwitchSource.includes('appendMessage("assistant", "语音测试通过：'));
  for (const content of [
    "模型测试：通过（20ms）",
    "语音测试通过：当前表单配置可以生成音频。",
    "TTS debug:\nrecentEvents=none",
    "启动错误: backend unavailable",
    "错误: Invalid API token."
  ]) {
    assert.strictEqual(storage.isSystemHistoryRecord({ role: "assistant", content }), true, `${content} should be filtered from history`);
  }
  assert.strictEqual(storage.isSystemHistoryRecord({ role: "assistant", content: "今天也辛苦了。" }), false);
  assert.strictEqual(storage.isSystemHistoryRecord({ role: "user", content: "错误: 我写错了。" }), false);
}

function testDesktopToggleSemantics() {
  assert.ok(chatSource.includes('ui.observeBtn.setAttribute("aria-pressed"'));
  assert.ok(chatSource.includes('ui.lockBtn.setAttribute("aria-pressed"'));
  assert.ok(chatSource.includes('ui.autoChatBtn.setAttribute("aria-pressed"'));
  assert.ok(css.includes('button[aria-pressed="true"]::after'));
}

function testKawaiiControlCenterTheme() {
  assert.ok(kawaiiCss.includes(".control-center-brand::before"), "control center brand should carry the cat-ear motif");
  assert.ok(kawaiiCss.includes('.control-center-nav-item[data-glyph="calendar"]'), "schedule should use the unified icon system");
  assert.ok(kawaiiCss.includes('.control-center-nav-item[data-glyph="person"]'), "persona should use the unified icon system");
  assert.ok(kawaiiCss.includes('.control-center-nav-item[data-glyph="voice"]'), "model and voice should use the unified icon system");
  assert.ok(phosphorCss.includes('.control-center-nav-item[data-glyph="message"]'), "QQ should use the reusable chat icon");
  assert.ok(kawaiiCss.includes('.control-center-nav-item[data-glyph="memory"]'), "memory should use the unified icon system");
  assert.ok(kawaiiCss.includes('.control-center-nav-item[data-glyph="shield"]'), "self-check should use the unified icon system");
  assert.ok(kawaiiCss.includes("flex: 0 0 auto !important"), "narrow control-center navigation should remain horizontally reachable");
  assert.ok(phosphorCss.includes('.control-center-nav-item[data-glyph="calendar"]'), "schedule should map to the reusable SVG library");
  assert.ok(phosphorCss.includes('.control-center-nav-item[data-glyph="person"]'), "persona should map to the reusable SVG library");
  assert.ok(phosphorCss.includes('.control-center-nav-item[data-glyph="voice"]'), "model and voice should map to the reusable SVG library");
  assert.ok(phosphorCss.includes('.control-center-nav-item[data-glyph="memory"]'), "memory should map to the reusable SVG library");
  assert.ok(phosphorCss.includes('.control-center-nav-item[data-glyph="shield"]'), "self-check should map to the reusable SVG library");
  assert.ok(phosphorCss.includes(".control-center-advanced-toggle-icon"), "advanced settings should reuse its existing icon slot without disturbing the text grid");
}

testUnifiedPageRegistry();
testControlCenterMarkupAndLayering();
testVisualSystemContract();
testProgressiveDisclosureContract();
testContinuousPageShellContract();
testDoctorWorkflowContract();
testSystemMessagesStayOutOfHistory();
testDesktopToggleSemantics();
testKawaiiControlCenterTheme();
console.log("[OK] Unified control center frontend checks passed.");
