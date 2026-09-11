const assert = require('assert');
const fs = require('fs');
const vm = require('vm');
const {createInitialState} = require('../web/chatState');
const {createController} = require('../web/chatReplyController');
const galgamePlayer = require('../web/galgamePlayer');

function installGalgameControllerForTest() {
  class Node {
    constructor(tagName = 'div') {
      this.tagName = tagName.toUpperCase(); this.listeners = {}; this.attributes = {}; this.hidden = false; this.inert = false;
      this.classList = {add() {}, remove() {}}; this.style = {};
    }
    addEventListener(name, listener) { this.listeners[name] = listener; }
    setAttribute(name, value) { this.attributes[name] = String(value); }
    getAttribute(name) { return this.attributes[name] || null; }
    focus() {}
    querySelectorAll() { return []; }
  }
  const nodes = {};
  for (const id of ['galgame-auto-scene', 'galgame-character', 'galgame-scene', 'galgame-name', 'galgame-title', 'galgame-voice', 'galgame-exit', 'galgame-text', 'galgame-sprite', 'galgame-next', 'galgame-status', 'galgame-form', 'galgame-input']) nodes[id] = new Node();
  const body = new Node('body');
  body.children = [new Node('main')];
  body.append = (node) => { body.children.push(node); if (node.id) nodes[node.id] = node; };
  const document = {
    readyState: 'complete', body,
    createElement: (tagName) => new Node(tagName),
    getElementById: (id) => nodes[id] || null,
    querySelector: (selector) => selector === '.utility-actions' ? {append(node) { nodes[node.id] = node; }} : null
  };
  const window = {
    document, AbortController, TaffyGalgamePlayer: galgamePlayer,
    matchMedia: () => ({matches: true}), Image: class { set src(_value) { queueMicrotask(() => this.onload?.()); } },
    __petState: {speakingEnabled: true, chatBusy: false}, interruptActiveChatTurn() {}
  };
  vm.runInNewContext(fs.readFileSync('web/galgameController.js', 'utf8'), {window, document, Image: window.Image, Promise, console, setTimeout, clearTimeout});
  return {window, nodes};
}

async function main() {
  const state = createInitialState();
  state.history = [];
  state.conversationMode.chatStreamEnabled = true;
  let active = true, delivered = [], calls = 0, legacySpeech = 0;
  const windowObject = {setTimeout, clearTimeout, AbortController,
    TaffyGalgame: {isActive: () => active, getContext: () => ({enabled:true,character:"claude"}), playReply: async (text, options) => { delivered.push(text); assert(options.signal); return true; }},
    TaffyModules: {chatApi: {streamAssistantReply: async (payload) => { assert.strictEqual(payload.galgame.character, 'claude'); calls++; return '太好了！为什么呢？'; }}}};
  const controller = createController({state, ui: {},
    windowObject,
    appendMessage: () => ({dataset:{},classList:{add(){},remove(){}},querySelector(){return null;},remove(){}}),
    shouldUseStreamSpeak: () => true,
    speak: async () => { legacySpeech++; return true; }
  });
  assert.strictEqual(await controller.requestAssistantReply('测试', {interruptActive:false}), true);
  assert.deepStrictEqual(delivered, ['太好了！为什么呢？']);
  assert.strictEqual(legacySpeech, 0, 'do not auto-play the entire reply alongside Galgame');
  assert.strictEqual(await controller.requestAssistantReply('自动跟进', {auto:true}), false);
  assert.strictEqual(calls, 1, 'proactive requests cannot replace a manually read turn');
  let interruptedPlaybackSignal = null;
  windowObject.TaffyGalgame.playReply = (_text, options) => new Promise((resolve) => {
    interruptedPlaybackSignal = options.signal;
    options.signal.addEventListener('abort', () => resolve(false), {once: true});
  });
  const interruptedTurn = controller.requestAssistantReply('退出时取消', {interruptActive:false});
  while (!interruptedPlaybackSignal) await Promise.resolve();
  const ttsFinishedBeforeExit = state.conversationLastTtsFinishedAt;
  assert.strictEqual(controller.interruptActiveChatTurn('galgame_exit', {bypassProtection:true}), true);
  assert(interruptedPlaybackSignal.aborted);
  assert.strictEqual(await interruptedTurn, false, 'an exited Galgame turn must not report a stale success');
  assert.strictEqual(state.conversationLastTtsFinishedAt, ttsFinishedBeforeExit);
  active = false;
  const {window, nodes} = installGalgameControllerForTest();
  let staleSpeakCalls = 0;
  assert.strictEqual(await window.TaffyGalgame.playReply('迟到的旧回复。', {speak: () => { staleSpeakCalls++; }}), false);
  assert.strictEqual(staleSpeakCalls, 0, 'an old callback after exit must not start hidden TTS');
  window.__petState.ttsContextSpeaking = true;
  nodes['galgame-open'].listeners.click();
  assert.strictEqual(window.TaffyGalgame.isActive(), false, 'opening the mode must not overlap speech that outlived chatBusy');
  window.__petState.ttsContextSpeaking = false;
  nodes['galgame-open'].listeners.click();
  let stopped = 0, activeSignal = null;
  const activeReply = window.TaffyGalgame.playReply('正在播放。', {
    stop: () => { stopped++; },
    speak: (_part, options) => { activeSignal = options.signal; return new Promise(() => {}); }
  });
  await Promise.resolve();
  nodes['galgame-voice'].listeners.click();
  assert(activeSignal.aborted, 'muting in the UI must cancel the active TTS request');
  assert(stopped > 0, 'muting in the UI must stop active playback');
  window.TaffyGalgame.exit();
  assert.strictEqual(await activeReply, false);
  assert.strictEqual(await window.TaffyGalgame.playReply('退出后的回调。', {speak: () => { staleSpeakCalls++; }}), false);
  assert.strictEqual(staleSpeakCalls, 0);
  nodes['galgame-open'].listeners.click();
  assert.strictEqual(window.TaffyGalgame.isActive(), true, 'the mode must remain usable after exit and re-entry');
  const alreadyCancelled = new AbortController();
  alreadyCancelled.abort();
  assert.strictEqual(await window.TaffyGalgame.playReply('已取消的迟到回调。', {
    signal: alreadyCancelled.signal,
    speak: () => { staleSpeakCalls++; }
  }), false);
  assert.strictEqual(staleSpeakCalls, 0, 'an already-cancelled callback must not replace current player callbacks');
  let characterInterrupts = 0;
  window.interruptActiveChatTurn = (reason) => { if (reason === 'galgame_character_change') characterInterrupts++; };
  const beforeSwitch = window.TaffyGalgame.playReply('旧角色的话。', {speak:()=>new Promise(()=>{})});
  nodes['galgame-character'].listeners.change({target:{value:'claude'}});
  assert.strictEqual(await beforeSwitch, false);
  assert.strictEqual(characterInterrupts, 1);
  assert.strictEqual(nodes['galgame-name'].textContent, 'Claude');
  assert.strictEqual(window.TaffyGalgame.getContext().character, 'claude');
  nodes['galgame-character'].listeners.change({target:{value:'../../unknown'}});
  assert.strictEqual(window.TaffyGalgame.getContext().character, 'claude');
  let inputRequests = 0, preventedCompositionSubmit = 0;
  window.requestAssistantReply = async () => { inputRequests++; return false; };
  nodes['galgame-input'].value = '输入法候选';
  nodes['galgame-input'].listeners.compositionstart();
  nodes['galgame-input'].listeners.keydown({key: 'Enter', isComposing: true, keyCode: 229, repeat: false, preventDefault() { preventedCompositionSubmit++; }});
  await nodes['galgame-form'].listeners.submit({preventDefault() {}});
  assert.strictEqual(preventedCompositionSubmit, 1);
  assert.strictEqual(inputRequests, 0, 'committing an IME candidate must not submit a partial message');
  nodes['galgame-input'].listeners.compositionend();
  await nodes['galgame-form'].listeners.submit({preventDefault() {}});
  assert.strictEqual(inputRequests, 1, 'a completed IME composition must remain sendable');
  console.log('Galgame chat integration passed');
}
main().catch(e => {console.error(e);process.exitCode=1;});
