(function(root){
  "use strict";
  const LIMITS=Object.freeze({maxActions:8,maxDuration:120,maxQueue:8,stepTimeoutMs:60000,planTimeoutMs:240000,tickMs:50,gestureMs:1800});
  const movement=new Set(['go_to','activity','sit','stand']);
  const kinds=new Set([...movement,'gesture','look_at','wait']);
  function validate(a,world){
    if(!a || !kinds.has(a.type))return 'invalid';
    if(movement.has(a.type)&&!(world.kind==='vrm'&&['room','handpainted'].includes(world.scene)))return 'unsupported';
    if(a.type==='wait'&&['painted','live2d'].includes(world.scene))return 'unsupported';
    if(a.type==='go_to'&&!world.places.includes(a.target))return 'invalid';
    if(a.type==='activity'&&!world.activities.includes(a.name))return 'invalid';
    if(a.type==='gesture'&&!world.gestures.includes(a.name))return 'unsupported';
    if(a.type==='look_at'){
      const targets=world.kind==='live2d'?['user','left','right','up','down']:
        world.kind==='vrm'&&['room','handpainted'].includes(world.scene)?['user',...world.places]:['user'];
      if(!targets.includes(a.target))return 'invalid';
    }
    if(['activity','wait'].includes(a.type)&&(!Number.isFinite(a.duration_sec)||a.duration_sec<0||a.duration_sec>LIMITS.maxDuration))return 'invalid';
    return null;
  }
  function create({world,run,say,ack,control=()=>{},cancel=()=>{}}){
    let queue=[],seen=new Set(),current=null,draining=false,disposed=false;
    const emit=(id,index,status,reason)=>Promise.resolve(ack({id,outcomes:[{index,status,reason}]})).catch(()=>{});
    async function drain(){
      if(draining||disposed)return;draining=true;
      try{while(queue.length&&!disposed){
        const plan=queue.shift(), abort=new AbortController(), snapshot=world();
        current={plan,abort,done:new Set(),reason:'user_input'};
        const item=current;
        let claim;try{claim=await ack({id:plan.id,started:true});}catch(_){continue;}
        if(!claim?.ok)continue;
        if(abort.signal.aborted){
          for(let i=0;i<plan.actions.length;i++)await emit(plan.id,i,'interrupted',item.reason);
          if(plan.say)await emit(plan.id,-1,'interrupted',item.reason);
          continue;
        }
        const deadline=setTimeout(()=>{item.reason='timeout';abort.abort();cancel();},LIMITS.planTimeoutMs);
        control(true);
        const speech=plan.say ? (async()=>{
          let status='completed',reason='done';
          try{if(await say(plan.say,plan.emotion,abort.signal)===false){status='failed';reason='error';}}
          catch(_){status='failed';reason='error';}
          if(abort.signal.aborted){status='interrupted';reason=item.reason;}
          item.done.add(-1);await emit(plan.id,-1,status,reason);
        })():Promise.resolve();
        for(let i=0;i<plan.actions.length;i++){
          const action=plan.actions[i];
          if(abort.signal.aborted){await emit(plan.id,i,'interrupted',item.reason);continue;}
          const nowWorld=world();
          if(nowWorld.kind!==snapshot.kind||nowWorld.scene!==snapshot.scene){item.reason='scene_changed';abort.abort();await emit(plan.id,i,'interrupted',item.reason);continue;}
          const invalid=validate(action,nowWorld);
          if(invalid){await emit(plan.id,i,'skipped',invalid);continue;}
          let status='completed',reason='done';
          try{const result=await run(action,abort.signal);if(result===false){status='skipped';reason='unsupported';}
            else if(result&&typeof result==='object'){
              if(result.status==='unsupported'){status='skipped';reason='unsupported';}
              else if(['completed','interrupted','failed'].includes(result.status)){
                status=result.status;reason=typeof result.reason==='string'&&/^[a-z_]{1,48}$/.test(result.reason)?result.reason:status==='completed'?'done':'error';
              }else{status='failed';reason='invalid_result';}
            }}
          catch(error){status='failed';reason=error?.message==='timeout'?'timeout':'error';}
          if(abort.signal.aborted){status='interrupted';reason=item.reason;}
          item.done.add(i);await emit(plan.id,i,status,reason);
        }
        await speech;clearTimeout(deadline);control(false);current=null;
      }}finally{control(false);current=null;draining=false;}
    }
    return {enqueue(plan){
      if(disposed||!plan||typeof plan.id!=='string'||!/^[a-f0-9]{32}$/.test(plan.id)||seen.has(plan.id)||!Array.isArray(plan.actions)||plan.actions.length>LIMITS.maxActions||queue.length>=LIMITS.maxQueue)return false;
      seen.add(plan.id);if(seen.size>256)seen.delete(seen.values().next().value);
      queue.push({...plan,say:typeof plan.say==='string'?plan.say.slice(0,160):'',actions:plan.actions.slice()});void drain();return true;
    },interrupt(reason='user_input'){
      if(current){current.reason=reason;current.abort.abort();}
      for(const plan of queue){plan.actions.forEach((_,i)=>void emit(plan.id,i,'interrupted',reason));if(plan.say)void emit(plan.id,-1,'interrupted',reason);}
      queue=[];cancel();control(false);
    },dispose(){this.interrupt('disposed');disposed=true;},busy:()=>!!current||queue.length>0};
  }
  const api={create,validate,LIMITS};root.XinyuAvatarBrainExecutor=api;
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
