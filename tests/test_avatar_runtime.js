const vm = require('node:vm');
const fs = require('node:fs');
const assert = require('node:assert/strict');
(async () => {
  let next=0, disposed=0, updates=0, lastFrame, clock=1500;
  const posted=[];
  const raf=new Map(), timers=new Map(), intervals=new Map(), listeners=new Map();
  const add=(m,fn)=>{m.set(++next,fn);return next;};
  const root={document:{hidden:false,body:{dataset:{}},getElementById:()=>null,addEventListener:()=>{}},
    performance:{now:()=>clock},
    BroadcastChannel:class {postMessage(data){posted.push(data);}close(){}},
    XinyuVRMRenderer:{EXPRESSION:{prepareMs:1100},QUALITY:{idleFps:20,activeFps:30},createRenderer:()=>({load:async()=>{},dispose:()=>disposed++,update:f=>{updates++;lastFrame=f;},isAnimating:()=>false,hitTest:()=>false})},
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
  state.conversationLastAssistantAt=Date.now();frame(1500);
  assert.equal(posted.length,1);assert.equal(posted[0].prepare,true);
  frame(1600);assert.equal(posted.length,1,"reply preparation is broadcast once");
  for(const fn of listeners.get('input')) fn({target:{id:'chat-input'}});frame(1700);assert.equal(lastFrame.interaction,true);
  frame(2700);assert.equal(lastFrame.interaction,false);
  state.chatBusy=true;frame(2800);assert.equal(lastFrame.interaction,true);state.chatBusy=false;
  state.listeningPresencePhase='hearing';frame(2900);assert.equal(lastFrame.interaction,true);
  state.listeningPresencePhase='armed';frame(3000);assert.equal(lastFrame.interaction,false,'armed mic is not speech');
  clock=3100;for(const fn of listeners.get('click')) fn({target:{closest:()=>({})}});frame(3200);assert.equal(lastFrame.interaction,true);
  await start();assert.equal(disposed,1);assert.equal(raf.size,1);
  assert.equal(listeners.get('pointermove').size,1,'restart removes prior listeners');
  state.avatarRuntime.dispose();state.avatarRuntime.dispose();
  assert.equal(disposed,2);assert.equal(raf.size,0);assert.equal(timers.size,0);
  assert.equal(listeners.get('pointermove').size,0);for(const name of ['input','keydown','click'])assert.equal(listeners.get(name).size,0);
  console.log('VRM runtime idle cadence, inactive suspension, restart and disposal passed.');
})().catch(error=>{console.error(error);process.exitCode=1;});
