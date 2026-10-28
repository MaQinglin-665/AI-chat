(function(root) {
  'use strict';
  const SPEECH = Object.freeze({attackMs:200, releaseMs:600, holdMs:180, threshold:.025,
    nodMinMs:650, nodMaxMs:1000, nodMin:.022, nodMax:.055, nodGapMs:1000});
  function random(seed) { let x=seed>>>0; return ()=>((x=(Math.imul(x,1664525)+1013904223)>>>0)/4294967296); }
  function noise(t,seed){
    const i=Math.floor(t),u=t-i,w=u*u*(3-2*u);
    const sample=n=>random((seed^Math.imul(n+1,0x9e3779b9))>>>0)()*2-1;
    return sample(i)*(1-w)+sample(i+1)*w;
  }
  function idleAt(t,seed){
    return {breath:Math.sin(t*1.3+noise(t/6,seed)*.7)*(.75+.2*noise(t/9,seed+1)),
      sway:noise(t/5,seed+2),headYaw:noise(t/3.7,seed+3),headPitch:noise(t/6.1,seed+4),
      headTilt:noise(t/4.9,seed+5),eyeX:noise(t/.9,seed+6)*.045,eyeY:noise(t/1.3,seed+7)*.018};
  }
  function createSpeech({seed=71439}={}) {
    const draw=random(seed), between=(a,b)=>a+(b-a)*draw();
    let last=null, voice=-Infinity, envelope=0, generation=null, index=-1, budget=0, limit=1, nod=null, next=Infinity;
    function sentence(now) { budget=0;limit=draw()<.65?1:2;next=now+between(250,700); }
    return {update(now,level,cue={},blocked=false) {
      const dt=Math.max(0,Math.min(100,now-(last??now)));last=now;
      if(cue.id!==generation){generation=cue.id;index=-1;voice=-Infinity;nod=null;sentence(now);}
      if(level>SPEECH.threshold){if(voice===-Infinity && next===Infinity)sentence(now);voice=now;}
      const voiced=now-voice<=SPEECH.holdMs;
      // Time constants chosen so 95% of the body transition completes in 200/600ms.
      envelope+=(Number(voiced)-envelope)*(1-Math.exp(-3*dt/(voiced?SPEECH.attackMs:SPEECH.releaseMs)));
      if(Number.isFinite(cue.index)&&cue.index>index){
        const span=String(cue.text||'').slice(Math.max(0,index),cue.index);
        if(/[。！？.!?]/.test(span))sentence(now);
        else if(/[,，;；:：]/.test(span)&&budget<limit)next=Math.max(now+between(100,350),next);
        index=cue.index;
      }
      if(blocked)nod=null;
      if(!blocked&&voiced&&!nod&&budget<limit&&now>=next){
        nod={start:now,duration:between(SPEECH.nodMinMs,SPEECH.nodMaxMs),amplitude:between(SPEECH.nodMin,SPEECH.nodMax)};
        budget++;next=now+nod.duration+SPEECH.nodGapMs+between(200,900);
      }
      let pitch=0;
      if(nod){const p=(now-nod.start)/nod.duration;if(p>=1)nod=null;else pitch=Math.sin(Math.PI*p)**2*nod.amplitude;}
      return {envelope,pitch,nods:budget,limit,active:!!nod||envelope>.01};
    }};
  }
  const api={SPEECH,random,noise,idleAt,createSpeech};root.XinyuVRMMotionNatural=api;
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
