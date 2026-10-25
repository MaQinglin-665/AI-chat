"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const observers = new Map();
function element(textContent="") {
  return {textContent, disabled:false, hidden:false, attrs:{}, setAttribute(k,v){this.attrs[k]=v;}, after(node){this.reason=node;}};
}
const speech=element("语音开"), lock=element("桌面锁定: 不可用"), name=element("馨语AI桌宠");
lock.disabled=true; speech.attrs["aria-pressed"]="true";
const nodes={"speak-btn":speech,"lock-btn":lock,"assistant-name":name};
vm.runInNewContext(fs.readFileSync("web/visualPolishController.js","utf8"),{
  document:{readyState:"complete",body:{classList:{add(){}}},getElementById:id=>nodes[id],createElement:()=>element(),querySelectorAll:()=>[]},
  MutationObserver:class {constructor(cb){this.cb=cb;}observe(el){observers.set(el,this.cb);}}
});
assert.equal(name.textContent,"馨语");
assert.equal(speech.textContent,"语音");
assert.equal(speech.attrs["aria-pressed"],"true");
speech.textContent="语音关"; speech.attrs["aria-pressed"]="false"; observers.get(speech)();
assert.equal(speech.textContent,"语音");
assert.equal(speech.attrs["aria-pressed"],"false", "presentation must not overwrite controller state");
assert.equal(lock.hidden,true); assert.equal(lock.reason.hidden,false);
lock.disabled=false;lock.textContent="桌面锁定: 开";lock.attrs["aria-pressed"]="true";observers.get(lock)();
assert.equal(lock.hidden,false);assert.equal(lock.reason.hidden,true);
name.textContent="自定义角色";observers.get(name)();assert.equal(name.textContent,"自定义角色");
// WCAG relative luminance, including muted copy on the raised surface.
const tokens=fs.readFileSync("web/tokens.css","utf8");
function luminance(token){const hex=tokens.match(new RegExp(`--${token}: #([0-9A-Fa-f]{6})`))[1];return [0,2,4].map(i=>parseInt(hex.slice(i,i+2),16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4).reduce((s,v,i)=>s+v*[.2126,.7152,.0722][i],0);}
for(const background of ["night-base","night-raised"]){const contrast=(luminance("ink-muted")+.05)/(luminance(background)+.05);assert.ok(contrast>=4.5);console.log(`${background} muted contrast ${contrast.toFixed(2)}:1`);}
console.log("visual presentation state and contrast checks passed");
