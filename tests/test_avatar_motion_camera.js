'use strict';
const assert=require('node:assert/strict'),C=require('../web/avatar/vrmCamera'),W=require('../web/avatar/vrmWorld');
const layouts=[require('../web/avatar/vrmScene').layout(),require('../web/avatar/vrmHandpainted').layout()];
const maxDelta=values=>Math.max(...values.slice(1).map((v,i)=>Math.hypot(...v.map((x,j)=>x-values[i][j]))));
const initial=[0,1.5,3,0,1,0];
function noise(fps,locked){const camera=C.create(initial),old=[],modern=[];
 for(let i=0;i<=fps*20;i++){const t=i/fps,root=[Math.sin(t*1.3)*.008,Math.sin(t*.7)*.006],bounce=.016*Math.abs(Math.sin(t*1.35*2*Math.PI));
  old.push([root[0],1.5+bounce,3+root[1]]);
  modern.push(camera.update({now:t*1000,position:root,height:1,offset:[0,.5,3],key:'rest',locked}).slice(0,3));
 }return {before:maxDelta(old),after:maxDelta(modern)};}
const evidence={camera20:noise(20,false),camera30:noise(30,false),locked:noise(20,true)};
for(const result of Object.values(evidence))assert(result.after<C.SETTINGS.jitterLimit);
function transition(fps){const c=C.create(initial);for(let i=0;i<=fps*2;i++)c.update({now:i/fps*1000,position:[1,1],height:.8,offset:[3,.6,2],key:'desk',locked:true});return c.snapshot().value;}
assert(Math.hypot(...transition(20).map((v,i)=>v-transition(30)[i]))<1e-8,'exact spring independent of fixed fps');
const c=C.create(initial);let previous=initial,maxCameraStep=0;
for(let i=0;i<500;i++){const now=i<150?i*50:7500+(i-150)*1000/30;const p=c.update({now,position:[now*.0003,0],height:1,offset:[0,.5,3],key:'walk'});maxCameraStep=Math.max(maxCameraStep,Math.hypot(...p.map((v,j)=>v-previous[j])));previous=p;}
assert(maxCameraStep<.03,'no position/look-at jump switching frame rates');evidence.maxCameraStep=maxCameraStep;
let maxYawRate=0,maxPoseJump=0,maxRootStep=0,maxBoneStep=0;
for(const layout of layouts){
 const obstacles=layout.obstacles||W.OBSTACLES,limits=layout.limits||W.LIMITS,points=layout.activityPoints;
 for(const a of Object.values(points))for(const b of Object.values(points)){
  const route=W.smoothPath(W.path(a,b,obstacles,limits),obstacles,limits);assert(route.length);
  route.forEach(p=>assert(W.free(p,obstacles,limits)));route.slice(1).forEach((p,i)=>assert(W.clear(route[i],p,obstacles)));
 }
 function run(seed){const w=W.create({seed,layout}),trace=[];let prev=null,prevPose=null,prevBones=null;w.update(0);
  for(let t=50;t<=80000;t+=50){if(t===50)w.begin('rest');if(t===15000)w.begin('desk');if(t===35000)w.begin('window');if(t===55000)w.begin('books');
   const s=w.update(t,{interaction:t>=70000&&t<70500}),p=W.pose(s);trace.push(s);
   assert(W.free(s.position,obstacles,limits),'character remains outside inflated furniture');
   if(prev){const rate=Math.abs(W.angle(s.yaw-prev.yaw))/.05;maxYawRate=Math.max(maxYawRate,rate);assert(rate<=W.TUNING.turnSpeed+1e-8);
    maxRootStep=Math.max(maxRootStep,W.distance(s.position,prev.position));
    const jump=Math.abs(p.y-prevPose.y);maxPoseJump=Math.max(maxPoseJump,jump);assert(jump<W.MOTION.maxPoseStep,'no one-frame standing/sitting displacement');
    for(const k of ['headTurn','chestTurn'])assert(Math.abs(s[k]-prev[k])<.2,'turn layers are continuous');
   }
   const values={};for(const [bone,axes]of Object.entries(p.bones))for(const [axis,value]of Object.entries(axes))values[bone+'.'+axis]=value*p.weight;
   if(prevBones)for(const key of new Set([...Object.keys(values),...Object.keys(prevBones)]))maxBoneStep=Math.max(maxBoneStep,Math.abs((values[key]||0)-(prevBones[key]||0)));
   assert(maxBoneStep<W.MOTION.maxBoneStep,'no one-frame bone offset discontinuity at transitions');
   prevBones=values;prev=s;prevPose=p;
  }return trace;
 }
 const a=run(123);assert.deepEqual(a,run(123));assert.notDeepEqual(a,run(124));
 assert(a.some(s=>s.speed>0&&s.speed<W.TUNING.speed*.4),'accelerates');
 assert(a.some(s=>s.name==='rest'&&s.blend===1),'reaches seat');
 assert(a.some(s=>s.name==='desk'&&s.blend===1),'reaches desk');
}
evidence.maxYawRate=maxYawRate;evidence.maxPoseJump=maxPoseJump;evidence.maxRootStep=maxRootStep;evidence.maxBoneStep=maxBoneStep;
console.log('[OK] Camera dead zone/activity lock/20-30 fps, safe curves, heading bound, transition continuity and seeded traces.',JSON.stringify(evidence));

let maxPathRate=0;
for(const layout of layouts)for(const a of Object.values(layout.activityPoints))for(const b of Object.values(layout.activityPoints)){
 const w=W.create({layout:{...layout,activityPoints:{...layout.activityPoints,accompany:a,books:b}}});w.update(0);w.begin('books');let p=null,h=null;
 for(let t=25;t<45000;t+=25){const state=w.update(t);
  if(p&&state.speed>.08&&p.speed>.08){const next=Math.atan2(state.position[0]-p.position[0],state.position[1]-p.position[1]);
   if(h!==null)maxPathRate=Math.max(maxPathRate,Math.abs(W.angle(next-h))/.025);h=next;
  }else h=null;p=state;
 }
}
assert(maxPathRate<W.MOTION.maxPathTurnRate,'trajectory direction, not just body yaw, is bounded through all pairs of corners');
function movingCamera(fps){const camera=C.create(initial);for(let i=0;i<=fps*4;i++)camera.update({now:i/fps*1000,position:[i/fps*.3,0],height:1,offset:[0,.5,3],key:'travel'});return camera.snapshot().value;}
const a=movingCamera(20),b=movingCamera(30),fpsError=Math.hypot(...a.map((v,i)=>v-b[i]));assert(fpsError<C.SETTINGS.frameRateTolerance);
console.log('[OK] All-pairs trajectory max turn rate and moving 20/30 Hz delta:',JSON.stringify({maxPathRate,fpsError}));

const departure=W.create();departure.update(0);departure.begin('rest');let firstStep;
for(let t=25;t<5000;t+=25){const s=departure.update(t);if(s.moving){firstStep=s;break;}}
assert(firstStep);assert(Math.abs(W.angle(firstStep.pathYaw-firstStep.yaw))<=W.MOTION.headingSlowAngle,'finish layered initial turn before planting feet along the travel path');
