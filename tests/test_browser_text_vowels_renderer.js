"use strict";
const assert = require("node:assert/strict"), api = require("../web/avatar/live2dRenderer.js"), sync = require("../web/avatar/browserLipSync.js");
const driverApi = require("../web/avatar/live2dModelDriver.js"), mao = require("../web/avatar/mappings/mao.json");
(async () => {
  let now = 1000, before;
  const writes = [], state = { uiView: "full", ttsBrowserPlaybackToken: 1, ttsPlaybackGeneration: 1, live2dNaturalMotionEnabled: false };
  const core = Object.fromEntries(["setParameterValueById","addParameterValueById","multiplyParameterValueById","setPartOpacityById"].map(name=>[name,(...args)=>writes.push([name,...args])]));
  const model = { internalModel: { coreModel:core,motionManager:{stopAllMotions(){}} } };
  const host = { performance:{now:()=>now} };
  const renderer = api.createRenderer({state,host,lifecycle:{async load(spec){before=spec.beforeCoreUpdate;return {model,expressions:{},dispose(){}};}}});
  await renderer.load({mapping:mao});
  const frame={mouth:{open:.7,vowel:"i"}};
  renderer.update(frame);before(()=>{});
  const analysed=[...writes];writes.length=0;
  driverApi.create({mapping:mao,model,now:()=>now}).update(frame);
  assert.deepEqual(writes,analysed,"non-browser whole ordered write sequence unchanged");
  sync.begin(state,{token:1,generation:1,delayMs:120},0);sync.start(state,1,1000);
  sync.boundary(state,1,1000,{charIndex:0,charLength:5,utterance:{text:"阿姨去月我。"}});
  const seen = new Set();
  for(now=1121;now<2620;now+=10){
    writes.length=0;renderer.update(frame);before(()=>{});
    const channels=writes.filter(([method,id])=>method==='setParameterValueById'&&Object.values(mao.params.vowels).includes(id));
    assert.equal(channels.length,5,"one write per mapped vowel, no second parameter-writing clock");
    assert.ok(Math.abs(channels.reduce((sum,[,,value])=>sum+value,0)-.7)<1e-12,"opening preserved while shape crossfades");
    for(const [,id,value] of channels) if(value>.6)seen.add(id);
    assert.equal(state.avatarIntentFrame,frame,"temporary mouth frame does not leak to runtime or VRM");
  }
  assert.equal(seen.size,5);
  now=2621;writes.length=0;before(()=>{});
  assert.ok(writes.filter(([,id])=>Object.values(mao.params.vowels).includes(id)).every(([,,value])=>value===0),"punctuation closed");
  state.ttsPlaybackGeneration++;now=3000;writes.length=0;before(()=>{});
  assert.deepEqual(writes,analysed,"switching to analysed TTS immediately restores original ordered writes");
  renderer.dispose();
  const hiyori=require("../web/avatar/mappings/hiyori.json");let legacy=0;
  const disabled=api.createRenderer({state:{live2dNaturalMotionEnabled:false},host:{performance:{now:()=>0},
    XinyuBrowserTextVowels:{load(){throw Error("Hiyori must never load pinyin data or a text-vowel bridge")}}},
    lifecycle:{async load(spec){before=spec.beforeCoreUpdate;return {model,dispose(){}};}}});
  await disabled.load({mapping:hiyori});before(()=>legacy++);assert.equal(legacy,1);disabled.dispose();
  console.log("[OK] Live2D-only renderer opt-in, five smooth channels, same opening, punctuation, exact analysed-TTS write sequence and unchanged public intent frame");
})().catch(error=>{console.error(error);process.exitCode=1});
