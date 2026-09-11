#!/usr/bin/env node
"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const read = (...parts) => fs.readFileSync(path.join(root, ...parts), "utf8");
const indexSource = read("web", "index.html");
const stageCss = read("web", "stage.css");
const kawaiiCss = read("web", "kawaiiTheme.css");
const phosphorCss = read("web", "phosphorIcons.css");
const sceneExperienceCss = read("web", "sceneExperience.css");
const displayFontCss = read("web", "xinyuDisplayFont.css");
const electronSource = read("electron", "main.js");
const startupSource = read("web", "appStartupController.js");
const layoutSource = read("web", "live2dLayoutController.js");
const localAsrSource = read("web", "localAsrController.js");
const chatSource = read("web", "chat.js");
const chatMessageSource = read("web", "chatMessageController.js");
const chatReplySource = read("web", "chatReplyController.js");

assert.ok(indexSource.includes('href="./stage.css"'), "stage stylesheet should load after the legacy component styles");
assert.ok(indexSource.includes('href="./kawaiiTheme.css"'), "the anime livestream visual layer should load after the structural styles");
assert.ok(indexSource.includes('href="./phosphorIcons.css"'), "the reusable rounded icon layer should load last");
assert.ok(indexSource.includes('href="./sceneExperience.css"'), "the four-phase scene experience should load as the final visual layer");
assert.ok(indexSource.includes('href="./xinyuDisplayFont.css"'), "the offline display font should be available");
assert.ok(indexSource.includes('class="kawaii-stage-decor"'), "the stage should expose restrained decorative motifs");
assert.ok(indexSource.includes('class="xinyu-stage-brand-mark"'), "the stage brand should use real reusable SVG assets");
assert.ok(indexSource.includes('src="./assets/icons/phosphor/moon-stars.svg"'), "night selection should expose a real moon-and-stars SVG");
assert.ok(indexSource.includes('src="./assets/icons/phosphor/sun.svg"'), "day selection should expose a real sun SVG");
assert.ok(phosphorCss.includes('button[data-stage-theme-mode="day"][aria-pressed="true"] img'), "the selected day mode should reveal its sun icon");
assert.ok(indexSource.includes('class="mic-state-icon mic-state-icon-off"'), "closed microphone should render a real slash SVG element");
assert.ok(indexSource.includes('class="mic-state-icon mic-state-icon-on"'), "open microphone should render a real microphone SVG element");
assert.ok(indexSource.includes('src="./assets/icons/tabler/cat.svg"'), "cat marks should use the reusable outline SVG selected for neon fidelity");
assert.ok(indexSource.includes('src="./assets/icons/phosphor/heart-straight.svg"'), "decorative hearts should use an SVG asset instead of a font glyph");
assert.ok(indexSource.includes('class="conversation-identity"'), "the conversation identity should be code-native copy with SVG cat and paw marks");
assert.ok(indexSource.includes('class="stage-scene"'), "the companion stage should have a non-interactive scene layer");
assert.ok(indexSource.includes('id="stage-time-status"'), "the header should expose the current scene and local time as passive status");
assert.ok(indexSource.includes('id="scene-btn"'), "the lower utility capsule should expose the scene picker");
assert.ok(!indexSource.includes('id="help-btn"'), "the former onboarding launcher should not compete with the scene picker");
assert.ok(indexSource.includes('id="stage-scene-menu"'), "the four-phase scene picker should be present in the stage markup");
assert.ok(indexSource.includes('id="pet-presence-mode"'), "the desktop pet should expose its current presence state");
assert.ok(indexSource.includes('id="pet-mode-btn"'), "the stage should offer an explicit transition back to desktop-pet mode");
assert.ok(indexSource.includes('class="row controls stage-composer"'), "the stage should expose one voice-first composer");
assert.ok(indexSource.includes('id="conversation-rail"'), "the stage should group history into one conversation rail");
assert.ok(indexSource.includes('id="user-chat-log"'), "the stage should expose an independent user history lane");
assert.ok(indexSource.includes('id="assistant-chat-log"'), "the stage should expose an independent assistant history lane");
assert.ok(indexSource.includes('id="conversation-collapse-btn"'), "the conversation rail should expose a real collapse control");
assert.ok(indexSource.includes('id="assistant-lane-toggle"'), "the left edge should expose a model-history collapse control");
assert.ok(indexSource.includes('id="user-lane-toggle"'), "the right edge should expose a user-history collapse control");
assert.ok(indexSource.includes('class="app-titlebar"'), "desktop full view should provide an integrated draggable title surface");
assert.ok(!indexSource.includes('class="chat-input-icons"'), "the input should not contain a decorative icon that competes with sticker action");
assert.ok(
  chatReplySource.includes("streamAppend: true")
    && chatMessageSource.includes('token.className = "stream-text-arrival"')
    && chatMessageSource.includes('row.classList.add("is-streaming")'),
  "assistant stream deltas should append as lightweight character arrivals instead of replacing the whole sentence"
);
assert.ok(
  stageCss.includes("@keyframes stream-text-arrive")
    && stageCss.includes("@keyframes stream-response-caret")
    && stageCss.includes("prefers-reduced-motion: reduce"),
  "streaming reply motion should feel continuous and retain a reduced-motion fallback"
);
assert.ok(
  chatReplySource.includes("finalizeInterruptedAssistantMessage")
    && chatReplySource.includes("interruptionFinalized")
    && chatMessageSource.includes("is-conversation-continuation")
    && stageCss.includes(".message.assistant.is-interrupted")
    && stageCss.includes(".message.assistant.is-conversation-continuation"),
  "interrupted assistant text should remain visible and the next reply should read as a softer continuation"
);
assert.ok(
  chatMessageSource.includes("Math.min(6000, animatedIndex * 55)")
    && chatMessageSource.includes("keepAnimatedStream")
    && chatMessageSource.includes("}, 6300)")
    && chatReplySource.includes("is-awaiting-speech")
    && stageCss.includes(".message.assistant.is-awaiting-speech .content"),
  "large streamed deltas should retain a progressive reveal instead of flattening into an instant final paragraph"
);

assert.ok(
  phosphorCss.includes("body.view-full .message.sticker-message")
    && phosphorCss.includes("max-width: 92px !important")
    && phosphorCss.includes("body.view-full .message.sticker-message .sticker-message-img")
    && phosphorCss.includes("max-width: 46px !important")
    && chatMessageSource.includes("inline-sticker-group"),
  "desktop stickers should stay inline with text and legacy sticker-only records should remain compact"
);
assert.ok(
  phosphorCss.includes("body.view-full .conversation-rail:not(.is-collapsed)")
    && phosphorCss.includes("bottom: 194px !important"),
  "the desktop conversation rail should stop above the lower-right utility capsule"
);

assert.ok(displayFontCss.includes('font-family: "Xinyu Kawaii Display"'), "the bundled font subset should have a stable family name");
assert.ok(displayFontCss.includes('data:font/woff2;base64,'), "the display subset should stay offline and CSP-compatible");
assert.ok(kawaiiCss.includes("--kawaii-pink: #f58ab7"), "the anime theme should define one restrained sakura accent");
assert.ok(kawaiiCss.includes("--xinyu-display"), "the visual layer should separate display and body typography");
assert.ok(kawaiiCss.includes("body.view-full #assistant-name::before"), "the stage brand should use the cat-ear waveform badge");
assert.ok(kawaiiCss.includes("body.view-full .conversation-rail::before"), "the conversation rail should expose a companion identity label");
assert.ok(kawaiiCss.includes("body.view-chat .panel"), "the standalone chat surface should share the same visual system");
assert.ok(kawaiiCss.includes("@media (prefers-reduced-motion: reduce)"), "decorative movement should honor reduced motion");
assert.ok(!/linear-gradient|radial-gradient/.test(kawaiiCss), "the new anime layer should use solid materials instead of gradient-heavy decoration");
assert.ok(phosphorCss.includes('--ph-microphone: url("./assets/icons/phosphor/microphone.svg")'), "the microphone should use the local reusable icon set");
assert.ok(phosphorCss.includes("width: 32px !important"), "the primary microphone glyph should remain complete and visually legible");
assert.ok(phosphorCss.includes("body.view-chat #mic-btn::before"), "standalone chat should override the legacy music-note microphone rule");
assert.ok(phosphorCss.includes('var(--ph-microphone-off)'), "the closed microphone should use a distinct slash SVG");
assert.ok(phosphorCss.includes('.stage-composer-mic[aria-pressed="true"] .mic-state-icon-on'), "the live microphone should swap to its dedicated SVG element");
assert.ok(phosphorCss.includes('.stage-composer-mic[aria-pressed="true"]'), "the live microphone should have an explicit illuminated state");
assert.ok(phosphorCss.includes("animation: xinyu-mic-live"), "the live microphone should use a restrained state glow");
assert.ok(phosphorCss.includes("grid-template-columns: 66px minmax(0, 1fr) 104px"), "native-aspect composer controls should keep balanced reference proportions");
assert.ok(phosphorCss.includes("min-height: 90px !important"), "native-aspect composer should remain wide without feeling overly thick");
assert.ok(phosphorCss.includes("width: calc(100vw - 24px) !important"), "mobile composer should override desktop subtraction and remain fully visible");
assert.ok(phosphorCss.includes("overflow: hidden !important"), "the microphone rings should stay clipped to one circular control");
assert.ok(phosphorCss.includes('body.view-full .panel > .row.controls:not(.action-buttons)::before'), "composer decorations should be explicitly controlled by the final icon layer");
assert.ok(phosphorCss.includes("display: none !important"), "misaligned composer cat ears should not sit above the microphone");
assert.ok(phosphorCss.includes("var(--ph-send)"), "the send action should use the same rounded icon language");
assert.ok(phosphorCss.includes("var(--ph-cat)"), "the desktop-pet action should use the reference's rounded cat icon");
assert.ok(phosphorCss.includes("body.view-full .chat-lane-user"), "the user history lane should own its left-side scroll region");
assert.ok(phosphorCss.includes("body.view-full .chat-lane-assistant"), "the assistant history lane should own its right-side scroll region");
assert.ok(
  phosphorCss.includes(".conversation-rail.is-assistant-lane-collapsed .chat-lane-assistant")
    && phosphorCss.includes(".conversation-rail.is-user-lane-collapsed .chat-lane-user")
    && phosphorCss.includes(".conversation-lane-unread"),
  "each edge control should hide only its own lane and retain an unread indicator"
);
assert.ok(
  chatMessageSource.includes("onConversationLaneMessage")
    && read("web", "storageController.js").includes("taffy_conversation_lane_state_v1"),
  "collapsed-lane notifications and persisted state should be wired into new messages"
);
assert.ok(phosphorCss.includes("overscroll-behavior: contain"), "each history lane should contain wheel scrolling independently");
assert.ok(phosphorCss.includes('body.view-full .message .message-time'), "every stage message type should share the visible top-right time treatment");
assert.ok(fs.existsSync(path.join(root, "web", "assets", "icons", "phosphor", "LICENSE.txt")), "the icon license should be bundled with the assets");

assert.ok(sceneExperienceCss.includes('body[data-stage-scene="morning"]'), "morning should have a dedicated lighting treatment");
assert.ok(sceneExperienceCss.includes('body[data-stage-scene="dusk"]'), "dusk should have a dedicated lighting treatment");
assert.ok(sceneExperienceCss.includes(".stage-scene-menu"), "the final visual layer should style the scene picker as a glass panel");
assert.ok(sceneExperienceCss.includes("@keyframes scene-motes-drift"), "the environment should expose ambient scene movement");
assert.ok(sceneExperienceCss.includes("@media (prefers-reduced-motion: reduce)"), "the richer scene motion should retain a reduced-motion fallback");

assert.ok(stageCss.includes("body.view-full .panel"), "full view should use the stage shell");
assert.ok(stageCss.includes("align-self: flex-start !important"), "user turns should remain independent left-side cards");
assert.ok(stageCss.includes("align-self: flex-end !important"), "assistant turns should remain independent right-side cards");
assert.ok(stageCss.includes("pointer-events: none"), "the shell should leave the central Live2D surface interactive");
assert.ok(stageCss.includes("@media (max-width: 820px)"), "the stage should provide a narrow-layout fallback");
assert.ok(stageCss.includes("prefers-reduced-motion"), "presence motion should honor reduced-motion preferences");
assert.ok(stageCss.includes('grid-template-columns: 58px minmax(0, 1fr) 90px'), "desktop composer should use the balanced microphone, input, and send hierarchy");
assert.ok(stageCss.includes('gap: 10px !important'), "floating history cards should keep the refined compact rhythm");
assert.ok(stageCss.includes('width: min(940px, calc(100vw - 330px))'), "wide stages should match the refined reference composer proportion");
assert.ok(stageCss.includes('@media (max-width: 1400px)'), "medium stages should move utility actions above the composer before overlap begins");
assert.ok(stageCss.includes('width: min(780px, calc(100vw - 360px))'), "native-width stages should preserve a separate utility lane");
assert.ok(stageCss.includes('.conversation-rail.is-collapsed'), "the unified conversation rail should have a compact collapsed state");
assert.ok(read("web", "desktopControlBinder.js").includes('matchMedia?.("(max-width: 820px)")'), "compact stages should start with history collapsed to protect the character");
assert.ok(stageCss.includes('.stage-composer-mic[aria-pressed="true"]'), "active microphone state should be visually explicit");
assert.ok(stageCss.includes('.primary-actions > button[aria-pressed="true"]'), "broadcast controls should expose selected state");
assert.ok(stageCss.includes('min-height: 56px !important'), "the refined header should use one compact full-width rail");
assert.ok(stageCss.includes('background: rgba(9, 13, 23, 0.72) !important'), "night header should use restrained ink glass");
assert.ok(stageCss.includes('background: rgba(251, 247, 245, 0.78) !important'), "day header should use translucent warm glass");
assert.ok(stageCss.includes('position: absolute'), "the theme selector should stay inside the header positioning context");
assert.ok(stageCss.includes('top: 9px'), "the theme selector should be vertically centered inside the compact rail");
assert.ok(stageCss.includes('body.desktop-mode.view-full .app-titlebar'), "the custom title surface should only appear in the Electron stage");
assert.ok(stageCss.includes('body.view-full #status::before'), "presence status should have a compact semantic signal");
assert.ok(stageCss.includes('body.view-full[data-stage-room="day"] .primary-actions > button[aria-pressed="true"]'), "day broadcast controls should have a quiet enabled state");
assert.ok(localAsrSource.includes('setAttribute?.("aria-pressed", state.micOpen ? "true" : "false")'), "microphone state should be announced to assistive technology");
assert.ok(chatSource.includes('setAttribute("aria-pressed", state.speakingEnabled ? "true" : "false")'), "speech output state should be announced to assistive technology");

assert.ok(electronSource.includes("Math.round(work.width * 0.82)"), "the Electron companion window should use a stage-sized default");
assert.ok(electronSource.includes('minWidth: 760'), "the stage should retain a usable minimum width");
assert.ok(electronSource.includes('backgroundColor: "#080d19"'), "Electron first paint should match the dark stage");
assert.ok(electronSource.includes('titleBarStyle: "hidden"'), "Electron should replace the mismatched native title strip");
assert.ok(electronSource.includes('ipcMain.on("window-titlebar-theme"'), "native window controls should adapt to the active room theme");
assert.ok(electronSource.includes("view=full"), "the Electron companion window should load the real Live2D stage");
assert.ok(electronSource.includes("WINDOW_LAYOUT_VERSION = 2"), "legacy narrow bounds should migrate once to the stage layout");
assert.ok(electronSource.includes("syncCompanionSurfaceVisibility"), "stage and desktop-pet surfaces should have an explicit lifecycle coordinator");
assert.ok(electronSource.includes("modelWindow.showInactive()"), "minimizing the stage should reveal the pet without stealing focus");
assert.ok(electronSource.includes("modelWindow.setOpacity(0)"), "the hidden pet should preserve its transparent WebGL surface");
assert.ok(!electronSource.includes("modelWindow.hide()"), "stage mode should not destroy the pet compositor surface through native hiding");
assert.ok(electronSource.includes('ipcMain.on("surface-renderer-ready"'), "the pet should not be suspended before Live2D initialization completes");
assert.ok(electronSource.includes('ipcMain.on("window-minimize"'), "the stage should expose a native minimize transition for pet mode");
assert.ok(electronSource.includes('if (chatWindow.isMinimized())'), "a second launch should restore the stage");
assert.ok(!electronSource.includes('const wins = [modelWindow, chatWindow]'), "a second launch should not force both Live2D surfaces visible");
assert.ok(electronSource.includes("!stageActive || !modelWindowReady"), "the pet should stay active until its renderer reports ready");
assert.ok(electronSource.includes("scheduleCompanionSurfaceVisibilitySync(40)"), "native minimize should sync after its window state settles");
assert.ok(electronSource.includes('win.webContents.send("surface-active-changed"'), "native visibility should reach the renderer");
assert.ok(startupSource.includes("broadcastSpeech: state.desktopMode === true"), "desktop full view should keep the detached pet performance in sync");
assert.ok(startupSource.includes("ticker.stop?.()"), "inactive Live2D surfaces should stop their render ticker");
assert.ok(startupSource.includes('addEventListener?.("visibilitychange"'), "document visibility should backstop native surface messages");
assert.ok(layoutSource.includes('state.uiView === "full" ? 0.86 : 0.76'), "full view should fit the real model between the broadcast bar and composer");
assert.ok(layoutSource.includes('model.x = w * 0.5'), "full view should center the real Live2D model");
assert.ok(layoutSource.includes('if (state.uiView !== "model")'), "the full Electron stage should never enable desktop click-through");
assert.ok(layoutSource.includes('window.electronAPI.setClickthrough(false);'), "the stage should explicitly keep native controls interactive");

const chatDom = require(path.join(root, "web", "chatDom.js"));
const desktopControlBinder = require(path.join(root, "web", "desktopControlBinder.js"));
const storageController = require(path.join(root, "web", "storageController.js"));
const presenceMode = { textContent: "" };
const body = { dataset: {} };
const documentObject = {
  body,
  getElementById(id) {
    return id === "pet-presence-mode" ? presenceMode : null;
  }
};
const status = { textContent: "", ownerDocument: documentObject };

chatDom.setStatus({ status }, "开麦已开启");
assert.strictEqual(status.textContent, "开麦已开启");
assert.strictEqual(presenceMode.textContent, "开麦已开启");
assert.strictEqual(body.dataset.presence, "listening");

chatDom.setStatus({ status }, "语音播放中");
assert.strictEqual(body.dataset.presence, "speaking");

chatDom.setStatus({ status }, "启动失败");
assert.strictEqual(body.dataset.presence, "error", "error status should take precedence over transitional wording");

let petModeClick = null;
let petModeKeydown = null;
let minimizeCalls = 0;
desktopControlBinder.bindUtilityControls({
  petModeBtn: {
    addEventListener(type, handler) {
      if (type === "click") petModeClick = handler;
    }
  }
}, {
  windowObject: {
    electronAPI: { minimizeWindow: () => { minimizeCalls += 1; } },
    addEventListener(type, handler) {
      if (type === "keydown") petModeKeydown = handler;
    }
  },
  setStatus() {}
});
petModeClick();
assert.strictEqual(minimizeCalls, 1, "pet-mode control should minimize the native stage exactly once");
let shortcutPrevented = false;
petModeKeydown({ altKey: true, shiftKey: true, key: "P", preventDefault: () => { shortcutPrevented = true; } });
assert.strictEqual(minimizeCalls, 2, "pet-mode keyboard shortcut should use the same native transition");
assert.strictEqual(shortcutPrevented, true);

const conversationClasses = new Set();
const conversationAttrs = { "aria-expanded": "true" };
let conversationClick = null;
desktopControlBinder.bindUtilityControls({
  conversationRail: {
    classList: {
      toggle(name, force) {
        if (force) conversationClasses.add(name);
        else conversationClasses.delete(name);
      }
    }
  },
  conversationCollapseBtn: {
    getAttribute(name) { return conversationAttrs[name] || null; },
    setAttribute(name, value) { conversationAttrs[name] = String(value); },
    addEventListener(type, handler) {
      if (type === "click") conversationClick = handler;
    }
  }
}, {
  windowObject: { addEventListener() {} }
});
conversationClick();
assert.strictEqual(conversationAttrs["aria-expanded"], "false", "conversation history should expose its collapsed state");
assert.strictEqual(conversationAttrs["aria-label"], "展开对话历史", "collapsed history should announce the expand action");
assert.strictEqual(conversationClasses.has("is-collapsed"), true, "conversation history should collapse into its edge control");
conversationClick();
assert.strictEqual(conversationAttrs["aria-expanded"], "true", "conversation history should expand on the next click");
assert.strictEqual(conversationClasses.has("is-collapsed"), false, "conversation history should restore the unified rail");

function createLaneToggle() {
  const attrs = {};
  const classes = new Set();
  const dataset = {};
  const badge = { textContent: "", hidden: true };
  let click = null;
  return {
    attrs,
    classes,
    dataset,
    badge,
    get click() { return click; },
    classList: {
      toggle(name, force) {
        if (force) classes.add(name);
        else classes.delete(name);
      }
    },
    setAttribute(name, value) { attrs[name] = String(value); },
    querySelector(selector) { return selector === ".conversation-lane-unread" ? badge : null; },
    addEventListener(type, handler) {
      if (type === "click") click = handler;
    }
  };
}

const laneStorageValues = new Map([
  [
    storageController.STORAGE_KEYS.conversationLaneState,
    JSON.stringify({
      collapsed: { assistant: true, user: false },
      unread: { assistant: 1, user: 0 }
    })
  ]
]);
const laneStorage = {
  getItem(key) { return laneStorageValues.get(key) || null; },
  setItem(key, value) { laneStorageValues.set(key, String(value)); }
};
const laneRailClasses = new Set();
const assistantLaneToggle = createLaneToggle();
const userLaneToggle = createLaneToggle();
const laneState = {};
const laneUi = {
  conversationRail: {
    classList: {
      toggle(name, force) {
        if (force) laneRailClasses.add(name);
        else laneRailClasses.delete(name);
      }
    }
  },
  assistantLaneToggle,
  userLaneToggle
};
const laneDeps = {
  state: laneState,
  windowObject: { localStorage: laneStorage },
  storageController
};
desktopControlBinder.bindConversationLaneControls(laneUi, laneDeps);
assert.strictEqual(assistantLaneToggle.attrs["aria-expanded"], "false", "saved model-lane collapse should restore on startup");
assert.strictEqual(assistantLaneToggle.badge.textContent, "1", "saved model unread count should restore");
assert.strictEqual(laneRailClasses.has("is-assistant-lane-collapsed"), true, "restored model history should stay hidden");
desktopControlBinder.noteConversationLaneMessage(laneUi, laneDeps, "assistant");
assert.strictEqual(assistantLaneToggle.badge.textContent, "2", "new model replies should increment the edge badge without expanding");
assert.strictEqual(assistantLaneToggle.attrs["aria-expanded"], "false", "new model replies must not auto-expand a collapsed lane");
assistantLaneToggle.click();
assert.strictEqual(assistantLaneToggle.attrs["aria-expanded"], "true", "clicking the model edge should restore its history");
assert.strictEqual(assistantLaneToggle.badge.hidden, true, "expanding a lane should clear its unread badge");
userLaneToggle.click();
desktopControlBinder.noteConversationLaneMessage(laneUi, laneDeps, "user");
assert.strictEqual(userLaneToggle.attrs["aria-expanded"], "false", "the user lane should collapse independently");
assert.strictEqual(userLaneToggle.badge.textContent, "1", "new user turns should be counted while their lane stays hidden");
const savedLaneState = JSON.parse(laneStorageValues.get(storageController.STORAGE_KEYS.conversationLaneState));
assert.deepStrictEqual(savedLaneState.collapsed, { assistant: false, user: true }, "both independent lane states should persist");

console.log("[OK] stage frontend contract tests passed");
