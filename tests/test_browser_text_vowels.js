"use strict";
const assert = require("node:assert/strict"), fs = require("node:fs"), vm = require("node:vm"), path = require("node:path");
const vowels = require("../web/avatar/pinyinVowels.js"), text = require("../web/avatar/browserTextVowels.js"), sync = require("../web/avatar/browserLipSync.js");
const data = require("../web/avatar/data/pinyinCommon.json"), mapping = require("../web/avatar/mappings/mao.json");
const lookup = vowels.create(data);
// Frozen main42ae9ea sample sequence: queued/start/boundary/pause/resume/end,
// four rates and three delays. New text metadata must not alter #226 opening.
{
  const state={ttsBrowserPlaybackToken:1,ttsPlaybackGeneration:1}, samples=[];
  for(const rate of [.5,.96,1.32,2])for(const delayMs of [0,120,500]){
    sync.begin(state,{token:1,generation:1,rate,delayMs},0);
    for(let at=0;at<12000;at+=10){
      if(at===200)sync.start(state,1,at);
      if([700,1400,3200,6000].includes(at))sync.boundary(state,1,at,{charIndex:at/100,charLength:2,utterance:{text:'阿姨去月我，阿姨去月我，阿姨去月我，阿姨去月我。'}});
      if(at===4000)sync.pause(state,1,at);if(at===4800)sync.resume(state,1,at);
      if(at===10000)sync.stop(state,1);samples.push(sync.sample(state,at));
    }
  }
  assert.equal(samples.length,14400);
  assert.equal(require("node:crypto").createHash("sha256").update(JSON.stringify(samples)).digest("hex"),
    "e9a78aab059653ac2a05a8ffac9a0cb210403189477475e252d0c53379021c1b", "exact main42ae9ea browser opening sequence");
}
assert.equal(Object.values(data.finals).join("").length, 3755);
for (const [vowel, finals] of Object.entries({ a: ["a","ia","ua","ai","ao","an","ang"], i: ["i","in","ing"], u: ["u","ü","ou"], e: ["e","ei","en","eng","ie","üe"], o: ["o","uo","ong"] })) {
  for (const final of finals) assert.equal(vowels.fromFinal(final), vowel, final);
}
for (const [char, vowel] of [["阿","a"],["姨","i"],["去","u"],["月","e"],["我","o"]]) assert.equal(lookup(char).vowel, vowel, char);
for (const char of ["A","1","𠀀"]) assert.deepEqual(lookup(char), { vowel: null, closed: false });
for (const char of ["，","。","!","?"]) assert.deepEqual(lookup(char), { vowel: null, closed: true });
let now = 0;
function local(rate = 1, delayMs = 120) {
  const state = { ttsBrowserPlaybackToken: 1, ttsPlaybackGeneration: 1 };
  const controller = text.create({ state, mapping, data, host: { performance: { now: () => now } } });
  sync.begin(state, { token: 1, generation: 1, rate, delayMs }, 0); sync.start(state, 1, 100);
  return { state, controller, boundary(at, index, length, utterance = "阿姨去月我。") {
    sync.boundary(state, 1, at, { charIndex: index, charLength: length, utterance: { text: utterance } });
  }, sample(at) { now = at; return controller.mouth({ open: sync.sample(state, at) }, at); } };
}
for (const rate of [.5, 1, 2]) for (const delayMs of [0, 120, 500]) {
  const h = local(rate, delayMs); h.boundary(150, 0, 5);
  const gate = 150 + delayMs, step = 300 / rate;
  assert.equal(h.sample(gate - 1).vowel, null, "no future vowel before audible boundary + delay");
  for (const [index, expected] of ["a","i","u","e","o"].entries()) assert.equal(h.sample(gate + index * step + 1).vowel, expected, "equal time allocation between sparse word boundaries");
  assert.equal(h.sample(gate + 5 * step + 1).open, 0, "punctuation closes only text-vowel mouth");
  assert.ok(sync.sample(h.state, gate + 5 * step + 1) > 0, "legacy opening generator remains unchanged");
}
{
  const h = local(); h.boundary(150, 0, 2); h.sample(300);
  h.boundary(900, 2, 3);
  assert.equal(h.sample(1019).vowel, null, "new word waits for delay, cannot overwrite still audible earlier plan");
  assert.equal(h.sample(1021).vowel, "u");
  assert.equal(h.state.avatarBrowserSpeech.charMs, 375, "observed preceding boundary spacing calibrates next word duration");
  const initial = h.sample(1101), midpoint = h.sample(1396);
  assert.ok(Math.abs(Object.values(initial.weights).reduce((a,b)=>a+b,0)-1)<1e-12);
  assert.ok(Object.values(midpoint.weights).every(v=>v>=0&&v<=1));
  sync.pause(h.state, 1, 1400); assert.equal(h.sample(1450).open, 0);
  const before = h.state.avatarBrowserSpeech.textBoundaries.at(-1).at;
  sync.resume(h.state, 1, 1800); assert.equal(h.state.avatarBrowserSpeech.textBoundaries.at(-1).at, before + 400);
  sync.stop(h.state, 1); assert.equal(h.sample(2000).open, 0);
  h.state.ttsPlaybackGeneration++; assert.equal(h.sample(2100), null, "server/new generation keeps original analyser vowel source");
}
{
  const h = local(); h.boundary(150, 0, 5); h.sample(271); h.sample(569);
  const changed = h.sample(571), middle = h.sample(611), settled = h.sample(651);
  assert.ok(changed.weights.a > .9 && changed.weights.i < .1, "transition starts from previous shape");
  assert.ok(middle.weights.a > .3 && middle.weights.i > .3, "80ms continuous crossfade");
  assert.equal(settled.weights.i, 1);
  h.boundary(1300, 1, 1); assert.equal(h.state.avatarBrowserSpeech.boundaryIndex, 1);
  h.boundary(1350, 0, 1); assert.equal(h.state.avatarBrowserSpeech.boundaryIndex, 1, "stale boundary ignored");
}
{
  const h = local(); h.boundary(150, 0, 0, "阿。姨去");
  assert.equal(h.state.avatarBrowserSpeech.textBoundaries[0].text, "阿。", "zero-length boundary cannot forecast across punctuation");
  assert.equal(h.sample(1000).open, 0);
}
// Real sender/receiver transport with unrelated performance clocks; no runtime
// or VRM changes, original speech lease remains authoritative.
{
  const packets = [], sender = { document: {}, performance: { now: () => 1000 }, Date: { now: () => 50000 },
    BroadcastChannel: class { postMessage(v) { packets.push(v); } close() {} } };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname,"../web/avatar/browserLipSync.js"),"utf8"), sender);
  const state = { ttsBrowserPlaybackToken: 1, ttsPlaybackGeneration: 1, _speechBroadcastSenderId: "test-sender" };
  sender.XinyuBrowserLipSync.begin(state,{token:1,generation:1,delayMs:120},0);
  sender.XinyuBrowserLipSync.start(state,1,1000);
  sender.XinyuBrowserLipSync.boundary(state,1,1000,{charIndex:0,charLength:2,utterance:{text:"阿姨。"}});
  assert.equal(packets.length,3); assert.equal(packets.at(-1).plans[0].at,50120);
  let receiver, time = 90000;
  const remoteState = { uiView:"model",ttsBrowserMouthActive:true };
  const remote = text.create({state:remoteState,mapping,data,host:{performance:{now:()=>time},Date:{now:()=>50000},
    BroadcastChannel:class{constructor(){receiver=this;}close(){this.closed=true;}}}});
  receiver.onmessage({data:packets.at(-1)});
  assert.doesNotThrow(()=>receiver.onmessage({data:{...packets.at(-1),plans:[null]}}),"malformed same-channel packet safely ignored");
  receiver.onmessage({data:{type:"speech",speechSenderId:"test-sender",playbackGeneration:1,speechSentAtWallMs:50000,browserMouthActive:true}});
  assert.equal(remote.mouth({open:.6},90119).vowel,null);
  assert.equal(remote.mouth({open:.6},90121).vowel,"a");
  assert.equal(remote.mouth({open:.6},90421).vowel,"i");
  assert.equal(remote.mouth({open:.6},90721).open,0);
  // Streaming chunks can reuse a generation. A new token without boundary
  // must clear the old punctuation, and fall back to opening rather than freeze.
  sender.XinyuBrowserLipSync.stop(state,1);
  state.ttsBrowserPlaybackToken=2;
  sender.XinyuBrowserLipSync.begin(state,{token:2,generation:1,delayMs:120},1000);
  sender.XinyuBrowserLipSync.start(state,2,1000);
  receiver.onmessage({data:packets.at(-1)});
  assert.equal(remote.mouth({open:.6},90721).open,.6,"new utterance without boundaries cannot inherit previous punctuation closure");
  assert.equal(remote.mouth({open:.6},90721).vowel,null);
  assert.equal(remote.mouth({open:.6},91001),null,"stale speech lease cannot revive a mouth");
  receiver.onmessage({data:{type:"speech",speechSenderId:"test-sender",playbackGeneration:2,speechSentAtWallMs:50010,browserMouthActive:false}});
  assert.equal(remote.mouth({open:.6},90100),null,"analysed remote TTS stays untouched");
  remote.dispose(); assert.equal(receiver.closed,true);
}
console.log("[OK] Offline3755 pinyin/finals; sparse delayed/rate-aware timing; punctuation, smooth weights, pause/cancel/server and cross-window clock/lease protection");
