"use strict";
const assert = require("node:assert/strict"), B = require("../web/hiyoriBackdrop");
function node() {
  const classes = new Set(), handlers = {};
  return { dataset: {}, children: [], checked: false, hidden: false,
    classList: { contains: n => classes.has(n), add: n => classes.add(n), remove: n => classes.delete(n) },
    setAttribute() {}, removeAttribute(n) { delete this[n]; }, getBoundingClientRect() { return {}; },
    append(n) { this.children.push(n); n.parent = this; }, replaceChildren() { this.children = []; },
    remove() { if(this.parent)this.parent.children=this.parent.children.filter(n=>n!==this); },
    addEventListener(n,f) { handlers[n]=f; }, removeEventListener(n) { delete handlers[n]; }, emit(n) { handlers[n]?.(); } };
}
const body=node(), layer=node(), input=node(), panel=node(), doc=node();body.classList.add("view-full");body.dataset.stageScene="night";
doc.body=body;doc.getElementById=id=>({"hiyori-backdrop":layer,"hiyori-backdrop-enabled":input,"hiyori-backdrop-options":panel}[id]);
const images=[], saved=new Map(), timers=new Map();let nextTimer=0, disconnected=false;
const opts={ documentObject:doc, storage:{getItem:k=>saved.get(k),setItem:(k,v)=>saved.set(k,v)},
  ImageCtor:function(){const n=node();images.push(n);return n;},Observer:class{observe(){} disconnect(){disconnected=true;}},
  setTimer:f=>{timers.set(++nextTimer,f);return nextTimer;},clearTimer:id=>timers.delete(id)};
let c=B.create(opts);assert.equal(images.length,0);assert.equal(input.checked,false);
input.checked=true;input.emit("change");assert.equal(images.length,1);assert.equal(saved.get(B.STORAGE_KEY),"true");
images[0].onload();assert.equal(body.dataset.hiyoriBackdrop,"true");assert.equal(layer.children.length,1);
body.dataset.stageScene="dusk";doc.emit("taffy:stage-room-change");images[1].onload();assert.equal(layer.children.length,2);
body.dataset.stageScene="day";c.refresh();assert.equal(layer.children.length,1);const stale=images[2].onload;
input.checked=false;input.emit("change");stale();assert.equal(layer.children.length,0);assert.equal(body.dataset.hiyoriBackdrop,undefined);
input.checked=true;input.emit("change");images.at(-1).onerror();assert.equal(body.dataset.hiyoriBackdrop,undefined,'load failure restores original');
for(const unavailable of ['model','chat']){body.classList.remove('view-full');body.classList.add('view-'+unavailable);c.refresh();assert.equal(layer.children.length,0);body.classList.remove('view-'+unavailable);}
body.classList.add('view-full');body.dataset.avatarKind='vrm';c.refresh();assert.equal(panel.hidden,true);assert.equal(layer.children.length,0);
delete body.dataset.avatarKind;c.refresh();images.at(-1).onload();assert.equal(c.state().loaded,true);
body.classList.add('transparent-mode');c.refresh();assert.equal(layer.children.length,0);body.classList.remove('transparent-mode');
c.dispose();assert.equal(disconnected,true);assert.equal(timers.size,0);
c=B.create(opts);assert.equal(input.checked,true,'saved preference restored');c.dispose();
assert.equal(B.periodFor('morning'),'day');assert.equal(B.periodFor('night'),'night');assert.equal(B.periodFor('dusk'),'dusk');
const broken=B.create({...opts,storage:{getItem(){throw Error('blocked');}}});assert.equal(broken.state().enabled,false);broken.dispose();
console.log('[OK] Hiyori default-off, periods, bounded plates, stale loads, failed images, storage, pet/VRM isolation and disposal.');

const values={}, style={setProperty:(k,v)=>values[k]=v};
B.syncFoot({model:{x:500,y:700,height:600},renderer:{width:1000,height:800},canvas:{getBoundingClientRect:()=>({left:10,top:20,width:500,height:400})},style});
assert.equal(values['--hiyori-foot-x'],'260px');assert.equal(values['--hiyori-foot-y'],'361px');
assert.equal(values['--hiyori-shadow-width'],'45px');
assert(B.LOOKS.night.opacity<B.LOOKS.day.opacity);assert(B.LOOKS.dusk.width>B.LOOKS.day.width);assert(B.LOOKS.dusk.dx>0 && B.LOOKS.dusk.dy>0);
const fs=require('node:fs');const html=fs.readFileSync('web/index.html','utf8');
assert(html.indexOf('id="hiyori-backdrop-enabled"')>html.indexOf('id="config-switch-modal"'));
assert(!html.includes('使用手绘卧室背景'));
