const vm = require('node:vm');
const fs = require('node:fs');
const assert = require('node:assert/strict');
(async () => {
  let next=0, disposed=0, updates=0;
  const raf=new Map(), timers=new Map(), intervals=new Map(), listeners=new Map();
  const add=(m,fn)=>{m.set(++next,fn);return next;};
  const root={document:{hidden:false,body:{dataset:{}},getElementById:()=>null,addEventListener:()=>{}},
    XinyuVRMRenderer:{QUALITY:{idleFps:20,activeFps:30},createRenderer:()=>({load:async()=>{},dispose:()=>disposed++,update:()=>updates++,isAnimating:()=>false,hitTest:()=>false})},
    addEventListener:(n,fn)=>{if(!listeners.has(n))listeners.set(n,new Set());listeners.get(n).add(fn);},
    removeEventListener:(n,fn)=>listeners.get(n)?.delete(fn),
    requestAnimationFrame:fn=>add(raf,fn),cancelAnimationFrame:id=>raf.delete(id),
    setTimeout:fn=>add(timers,fn),clearTimeout:id=>timers.delete(id),
    setInterval:fn=>add(intervals,fn),clearInterval:id=>intervals.delete(id)};
  const canvas={addEventListener:()=>{},removeEventListener:()=>{}};
  vm.runInNewContext(fs.readFileSync(require.resolve('../web/avatar/avatarRuntime.js'),'utf8'),{window:root});
  const state={uiView:'full',rendererSurfaceActive:true};
  const start=()=>root.XinyuAvatarRuntime.start({state,canvas,source:{kind:'vrm'}});
  const frame=now=>{const callbacks=[...raf.values()];raf.clear();callbacks.forEach(fn=>fn(now));};
  await start();
  assert.equal(root.document.body.dataset.avatarReady,"true");
  for(let t=0;t<=1000;t+=10)frame(t);
  assert.equal(updates,20);
  assert.equal(intervals.size,0,'full window does not poll detached cursor');
  state.rendererSurfaceActive=false;frame(1100);
  assert.equal(raf.size,0);assert.equal(timers.size,1);
  const before=updates;
  state.rendererSurfaceActive=true;
  const wakes=[...timers.values()];timers.clear();wakes.forEach(fn=>fn());frame(1400);
  assert.equal(updates,before+1);
  await start();assert.equal(disposed,1);assert.equal(raf.size,1);
  assert.equal(listeners.get('pointermove').size,1,'restart removes prior listeners');
  state.avatarRuntime.dispose();state.avatarRuntime.dispose();
  assert.equal(disposed,2);assert.equal(raf.size,0);assert.equal(timers.size,0);
  assert.equal(listeners.get('pointermove').size,0);
  console.log('VRM runtime idle cadence, inactive suspension, restart and disposal passed.');
})().catch(error=>{console.error(error);process.exitCode=1;});
