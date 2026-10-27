(function(root){
  "use strict";
  const SETTINGS=Object.freeze({pollMs:2000,requestMs:5000,inputHoldMs:1500,speechTimeoutMs:60000,maxPendingAcks:128});
  function start({state,speak,stopSpeech}){
    let disposed=false,enabled=false,polling=false,lastInput=Date.now(),inputUntil=0,events=[],timer,lastScene=null;
    const pending=new Map(),renderer=()=>root.__xinyuAvatarRenderer;
    function snapshot(){
      const r=renderer(),m=r?.metrics?.()||{},w=m.world||{},layout=r?.worldLayout?.()||{};
      const scene=r?.kind==='live2d'?'live2d':m.room?.preset||'none';
      const places=['room','handpainted'].includes(scene)?Object.keys(layout.activityPoints||{}):[];
      return {kind:r?.kind||'none',scene,position:w.position||[0,0],activity:w.name||'accompany',places,
        activities:places.filter(x=>x!=='accompany'),gestures:(r?.kind==='live2d'?r?.capabilities?.().gestures:r?.capabilities?.().actions)||[],
        period:root.document.body.dataset.stageRoom||'night',idle_sec:Math.floor((Date.now()-lastInput)/1000),
        typing:Date.now()<inputUntil,speaking:!!(state.chatBusy||state.ttsContextSpeaking||state.streamSpeakWorking||state.speechPhase==='speaking'),events};
    }
    async function request(endpoint,body){
      const abort=new AbortController(),timeout=root.setTimeout(()=>abort.abort(),SETTINGS.requestMs);
      try{const response=await root.authFetch('/api/avatar/brain/'+endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),signal:abort.signal});
        if(!response.ok)throw Error('request');return await response.json();
      }finally{root.clearTimeout(timeout);}
    }
    async function ack(body){
      if(body.started)return request('ack',body);
      const key=body.id+':'+body.outcomes[0].index;
      if(pending.size<SETTINGS.maxPendingAcks)pending.set(key,body);
      try{const result=await request('ack',body);pending.delete(key);return result;}catch(_){return null;}
    }
    function until(check,signal,timeout){
      return new Promise((resolve,reject)=>{
        const started=Date.now();let t;
        const finish=(error,value)=>{root.clearTimeout(t);signal.removeEventListener('abort',aborted);error?reject(error):resolve(value);};
        const aborted=()=>finish(Error('interrupted'));
        const tick=()=>{if(signal.aborted)return aborted();if(Date.now()-started>=timeout)return finish(Error('timeout'));
          let value;try{value=check();}catch(error){return finish(error);}if(value)return finish(null,true);t=root.setTimeout(tick,50);};
        signal.addEventListener('abort',aborted,{once:true});tick();
      });
    }
    const wait=(ms,signal)=>{const end=Date.now()+ms;return until(()=>Date.now()>=end,signal,ms+1000);};
    function intent(frame){root.dispatchEvent(new root.CustomEvent('avatar-intent',{detail:{frame}}));}
    const executor=root.XinyuAvatarBrainExecutor.create({world:snapshot,ack,
      control:on=>renderer()?.setBrainControl?.(on),
      cancel:()=>{renderer()?.interruptBrain?.();renderer()?.stopAction?.();intent({gaze:{x:0,y:0}});stopSpeech?.();},
      async say(text,emotion,signal){
        intent({face:emotion,faceIntensity:.4});
        let done=false,result=false;
        Promise.resolve().then(()=>speak(text,{mood:emotion})).then(value=>{result=value;done=true;},()=>{done=true;});
        try{await until(()=>done,signal,SETTINGS.speechTimeoutMs);return result;}finally{if(!done||signal.aborted)stopSpeech?.();}
      },
      async run(action,signal){
        const r=renderer();if(!r)return false;
        if(['go_to','activity','sit','stand'].includes(action.type)){
          if(!r.beginWorldAction?.(action))return false;
          await until(()=>r.worldActionDone?.(action),signal,60000);
          if(action.type==='activity')await wait(action.duration_sec*1000,signal);
          return true;
        }
        if(action.type==='wait')return wait(action.duration_sec*1000,signal);
        if(action.type==='gesture'){
          if(typeof r.playGesture==='function')return await r.playGesture(action.name,{signal});
          if(!r.playAction?.(action.name))return false;
          try{await wait(1800,signal);return true;}finally{r.stopAction?.();}
        }
        if(action.type==='look_at'){
          if(r.kind==='live2d')return r.lookAt?.(action.target)||{status:'unsupported'};
          if(r.kind==='vrm'&&['room','handpainted'].includes(snapshot().scene)){
            if(!r.lookAtWorld?.(action.target))return false;await wait(400,signal);return true;
          }
          const point=r.worldLayout?.()?.activityPoints?.[action.target],pos=snapshot().position;
          intent({gaze:point?{x:Math.max(-1,Math.min(1,point[0]-pos[0])),y:0}:{x:0,y:0}});
          await wait(400,signal);return true;
        }
        return false;
      }});
    function input(){lastInput=Date.now();inputUntil=lastInput+SETTINGS.inputHoldMs;if(executor.busy())executor.interrupt();void poll();}
    function event(e){const d=e.detail||{};if(d.type==='activity')events=[...events.slice(-2),{type:'activity',name:d.name,stage:d.stage}];}
    async function poll(){
      if(disposed||polling||!renderer()||!['full','model'].includes(state.uiView))return;
      polling=true;
      try{
        for(const [key,body] of pending){const response=await request('ack',body);if(response)pending.delete(key);}
        const current=snapshot(),scene=current.kind+':'+current.scene;
        if(lastScene!==null&&scene!==lastScene&&executor.busy())executor.interrupt('scene_changed');lastScene=scene;
        const result=await request('world',current);
        enabled=result.enabled===true;
        if(!enabled){if(executor.busy())executor.interrupt('disabled');return;}
        const plans=await request('poll',{});
        if(Date.now()>=inputUntil&&!disposed)for(const plan of plans.plans||[])executor.enqueue(plan);
      }catch(_){/* No model/network error UI; random life continues. */}
      finally{polling=false;}
    }
    for(const name of ['input','keydown','pointerdown'])root.addEventListener(name,input);
    root.addEventListener('avatar-world-event',event);
    timer=root.setInterval(poll,SETTINGS.pollMs);void poll();
    return {snapshot,poll,executor,dispose(){disposed=true;root.clearInterval(timer);executor.dispose();
      for(const name of ['input','keydown','pointerdown'])root.removeEventListener(name,input);
      root.removeEventListener('avatar-world-event',event);}};
  }
  root.XinyuAvatarBrainController={start,SETTINGS};
  if(typeof module!=='undefined'&&module.exports)module.exports={start,SETTINGS};
})(typeof window!=='undefined'?window:globalThis);
