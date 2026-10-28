'use strict';
const assert=require('node:assert/strict');
const {createSpeech}=require('../web/avatar/vrmMotionNatural');
const {poseAt,createIntentDriver}=require('../web/avatar/vrmRenderer');
const speech=createSpeech({seed:9}), pitch=[], body=[],mouth=[];
for(let i=0;i<600;i++){
  const now=i*1000/60,level=i%15<7?1:0;
  const sample=speech.update(now,level,{id:'one sentence'});
  pitch.push(poseAt(now,{bodyEnvelope:sample.envelope,speechPitch:sample.pitch}).bones.head.x);
  body.push(sample.envelope);mouth.push(level);
  assert(sample.nods<=2);
}
function amplitude(values,hz){let re=0,im=0;values.forEach((v,i)=>{re+=v*Math.cos(2*Math.PI*hz*i/60);im+=v*Math.sin(2*Math.PI*hz*i/60);});return 2*Math.hypot(re,im)/values.length;}
assert(amplitude(pitch,4)<.003,'head must not follow 4Hz syllables');
assert(amplitude(body.slice(120),4)<.08,'body envelope must bridge syllable gaps');
let quiet;for(let i=600;i<=660;i++)quiet=speech.update(i*1000/60,0,{id:'one sentence'});
assert(quiet.envelope<.03,'release returns body to idle');
// Parameter-level mouth equality through the real driver, rather than only a helper.
const values={},driver=createIntentDriver({expressionManager:{getExpression:n=>n==='aa',setValue:(n,v)=>values[n]=v}});
mouth.forEach((level,i)=>{driver.update({now:i*1000/60,mouth:{open:level}});assert.equal(values.aa,level);});
const paused=createSpeech({seed:9});let n;
for(let i=0;i<1800;i++){const level=i<300||i>600?1:0;n=paused.update(i*1000/60,level,{id:'same utterance'});assert(n.nods<=2,'silence must not renew sentence budget');}
const seededA=createSpeech({seed:31}),seededB=createSpeech({seed:31});
for(let i=0;i<400;i++)assert.deepEqual(seededA.update(i*16,1,{id:1}),seededB.update(i*16,1,{id:1}));
console.log('VRM 4Hz speech body isolation, release, nod budget, seeded RNG and exact mouth preservation passed.');
