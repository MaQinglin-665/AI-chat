const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const executor=require('../web/avatar/avatarBrainExecutor.js');
const flush=()=>new Promise(r=>setImmediate(r));
async function rig(renderer){
 const acks=[],listeners={},events=[];
 const root={__xinyuAvatarRenderer:renderer,XinyuAvatarBrainExecutor:executor,document:{body:{dataset:{stageRoom:'day'}}},
  setTimeout,clearTimeout,setInterval:()=>0,clearInterval:()=>{},AbortController,CustomEvent:class{constructor(type,data){this.type=type;this.detail=data.detail;}},
  dispatchEvent:e=>events.push(e),addEventListener:(n,f)=>listeners[n]=f,removeEventListener:()=>{},
  authFetch:async(url,opts)=>{const b=JSON.parse(opts.body);if(url.endsWith('/ack'))acks.push(b);return {ok:true,json:async()=>url.endsWith('/world')?{enabled:true}:url.endsWith('/poll')?{plans:[]}:{ok:true}}}};
 vm.runInNewContext(fs.readFileSync(require.resolve('../web/avatar/avatarBrainController.js'),'utf8'),{window:root,AbortController,Date,Map,Promise,Error,JSON});
 const c=root.XinyuAvatarBrainController.start({state:{uiView:'full'},speak:async()=>true});await flush();
 return {c,acks,listeners};
}
(async()=>{
 let serial=1;
 for(const failure of ['expired','superseded_by_input','already_claimed','throw']){
  const debug=[];let executed=0;
  const e=executor.create({world:()=>({kind:'live2d',scene:'live2d',gestures:['nod'],places:[],activities:[]}),run:async()=>executed++,say:async()=>true,
   ack:async a=>{if(failure==='throw')throw Error('private message');return {ok:false,reason:failure};},debug:x=>debug.push(x)});
  e.enqueue({id:'d'.repeat(32),say:'private speech',actions:[{type:'gesture',name:'nod'}]});await flush();await flush();
  assert.equal(executed,0);assert.equal(e.busy(),false);assert.equal(debug[0].reason,failure==='throw'?'transport_error':failure);
  assert.deepEqual(e.diagnostics(),debug);assert(!JSON.stringify(debug).includes('private'));e.dispose();
 }

 async function execute(r,actions){r.c.executor.enqueue({id:(serial++).toString(16).padStart(32,'0'),actions});for(let i=0;i<20&&r.c.executor.busy();i++)await flush();return r.acks.filter(a=>a.outcomes).map(a=>a.outcomes[0]);}
 for(const [status,reason,expected] of [['completed',undefined,'completed'],['unsupported',undefined,'skipped'],['interrupted','replaced','interrupted'],['failed','clock_stalled','failed']]){
  const r=await rig({kind:'live2d',capabilities:()=>({actions:['old'],gestures:['nod']}),playGesture:async(n,{signal})=>{assert.equal(n,'nod');assert(signal instanceof AbortSignal);return {status,reason};},playAction:()=>assert.fail('legacy must not run')});
  assert.deepEqual(Array.from(r.c.snapshot().gestures),['nod']);
  const results=await execute(r,[{type:'gesture',name:'nod'},{type:'gesture',name:'unknown'}]);
  assert.equal(results[0].status,expected);if(reason)assert.equal(results[0].reason,reason);
  assert.equal(results[1].status,'skipped');assert.equal(results[1].reason,'unsupported');r.c.dispose();
 }
 const seen=[];const gaze=await rig({kind:'live2d',capabilities:()=>({gestures:[]}),lookAt:t=>(seen.push(t),{status:'completed'})});
 const directions=['left','right','up','down'];const outcomes=await execute(gaze,directions.map(target=>({type:'look_at',target})));
 assert.deepEqual(seen,directions);assert(outcomes.every(x=>x.status==='completed'));gaze.c.dispose();
 let aborted=false;const interrupt=await rig({kind:'live2d',capabilities:()=>({gestures:['nod']}),playGesture:(n,{signal})=>new Promise(resolve=>signal.addEventListener('abort',()=>{aborted=true;resolve({status:'interrupted',reason:'aborted'});})),stopAction:()=>{}});
 interrupt.c.executor.enqueue({id:'f'.repeat(32),actions:[{type:'gesture',name:'nod'}]});await flush();interrupt.listeners.input();await flush();await flush();
 assert(aborted);assert.equal(interrupt.acks.find(a=>a.outcomes).outcomes[0].status,'interrupted');interrupt.c.dispose();
 let played=0,stopped=0;const legacy=await rig({kind:'vrm',capabilities:()=>({actions:['nod']}),playAction:()=>{played++;return true;},stopAction:()=>stopped++});
 legacy.c.executor.enqueue({id:'e'.repeat(32),actions:[{type:'gesture',name:'nod'}]});await new Promise(r=>setTimeout(r,1950));
 assert.equal(played,1);assert.equal(stopped,1);assert.equal(legacy.acks.find(a=>a.outcomes).outcomes[0].status,'completed');legacy.c.dispose();
 console.log('Model vocabulary, Promise ACKs, unsupported, AbortSignal, gaze directions and VRM fallback passed.');
})().catch(e=>{console.error(e);process.exitCode=1;});
