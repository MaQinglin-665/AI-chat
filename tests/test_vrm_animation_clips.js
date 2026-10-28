'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const C=require('../web/avatar/vrmAnimationClips'),N=require('../web/avatar/vrmMotionNatural');
const sandbox={console,AbortController,AbortSignal,ArrayBuffer,TextDecoder,TextEncoder,URL,Blob,fetch,Request,Headers,Response,
 ProgressEvent:class{constructor(type,values){this.type=type;Object.assign(this,values);}}};
vm.runInNewContext(fs.readFileSync(require.resolve('../web/vendor/vrm/vrm-vendor.js'),'utf8'),sandbox);
const T=sandbox.XinyuVRMVendor.THREE;
const scene=new T.Group(),source=new T.Group(),hips=new T.Bone();hips.name='pelvis';source.add(hips);
const target=new T.Bone();target.name='normalizedHips';scene.add(target);
const vrm={scene,meta:{metaVersion:'1'},humanoid:{getNormalizedBoneNode:n=>n==='hips'?target:null}};
const q=new T.Quaternion().setFromAxisAngle(new T.Vector3(1,0,0),.4);
const clip=new T.AnimationClip('Idle_Loop',1,[new T.QuaternionKeyframeTrack('pelvis.quaternion',[0,.5,1],[0,0,0,1,...q.toArray(),0,0,0,1])]);
const converted=C.retarget(clip,source,vrm,T);assert.equal(converted.tracks[0].name,'normalizedHips.quaternion');
// Actual driver + actual mixer: procedural speech does not accumulate on the
// authored pose, and the mouth is still exact while walking/sitting overlays run.
const R=require('../web/avatar/vrmRenderer');
const bones={};for(const name of Object.keys(R.poseAt(0).bones)){const n=new T.Bone();n.name='overlay_'+name;scene.add(n);bones[name]=n;}
let mouthValue=0;const layered={scene,meta:{metaVersion:'1'},humanoid:{getNormalizedBoneNode:n=>bones[n]},expressionManager:{getExpression:n=>n==='aa',setValue:(n,v)=>{if(n==='aa')mouthValue=v;}}};
const layerMixer=new T.AnimationMixer(scene),baseTrack=new T.QuaternionKeyframeTrack(bones.spine.name+'.quaternion',[0,1],[0,0,0,1,0,0,0,1]);
layerMixer.clipAction(new T.AnimationClip('base',1,[baseTrack])).play();const driver=R.createIntentDriver(layered);
for(const moving of [false,true])for(let i=0;i<900;i++){
 const level=i<600&&i%15<7?1:0;
 driver.update({now:(i+(moving?900:0))*1000/60,mouth:{open:level},worldState:{moving},applyClips:d=>layerMixer.update(d)});
 assert.equal(mouthValue,level);assert(Math.abs(bones.spine.rotation.x)<.2,'additive layer must not accumulate');
 assert(Number.isFinite(bones.head.rotation.x));
}
assert.equal(C.boneName('mixamorig:LeftArm'),'leftUpperArm');assert.equal(C.boneName('upperarm_l'),'leftUpperArm');
// Real AnimationMixer interpolation/crossfade rather than mocked action calls.
const mixer=new T.AnimationMixer(scene),a=mixer.clipAction(converted).play();mixer.update(.25);assert(Math.abs(target.rotation.x)>.1);
const opposite=converted.clone();opposite.name='opposite';for(let i=0;i<opposite.tracks[0].values.length;i+=4)opposite.tracks[0].values[i]*=-1;
const b=mixer.clipAction(opposite).play();b.crossFadeFrom(a,C.SETTINGS.fade,false);mixer.update(.1);
assert(a.getEffectiveWeight()>0&&a.getEffectiveWeight()<1);assert(b.getEffectiveWeight()>0&&b.getEffectiveWeight()<1);
mixer.update(.3);assert.equal(a.getEffectiveWeight(),0);assert.equal(b.getEffectiveWeight(),1);
const builtin=JSON.parse(fs.readFileSync(require.resolve('../web/assets/animations/quaternius-standard.gltf')));
for(const key of ['meshes','images','materials','skins'])assert(!builtin[key],'no model/texture redistribution');
const buffer=Buffer.from(builtin.buffers[0].uri.split(',')[1],'base64');
function values(i){const a=builtin.accessors[i],v=builtin.bufferViews[a.bufferView],offset=(v.byteOffset||0)+(a.byteOffset||0),n=a.count*({SCALAR:1,VEC3:3,VEC4:4}[a.type]);return Array.from({length:n},(_,j)=>buffer.readFloatLE(offset+4*j));}
for(const name of new Set(Object.values(C.POOLS).flat())){
 const animation=builtin.animations.find(a=>a.name===name);assert(animation,name);
 const spans=animation.samplers.map(s=>values(s.input).at(-1));assert(Math.max(...spans)<10,'no ten-second fixed pose clip');
 assert(animation.samplers.some(s=>{const v=values(s.output);return v.some((x,i)=>i>=4&&Math.abs(x-v[i%4])>.005);}),name+' must move');
}
for(let t=0;t<600;t+=10){const a=N.idleAt(t,77),b=N.idleAt(t+5,77);assert(Object.keys(a).some(k=>Math.abs(a[k]-b[k])>.001),'fallback must move in every ten-second window');}
(async()=>{
 // Parse the shipped glTF through the actual bundled loader, retarget it, and
 // exercise every activity for a minute. Check mapped body tracks, not source
 // translations that the renderer intentionally discards.
 const realScene=new T.Group(),mapped={};for(const node of builtin.nodes){const name=C.boneName(node.name||'');if(name&&!mapped[name]){const b=new T.Bone();b.name='real_'+name;realScene.add(b);mapped[name]=b;}}
 const realVrm={scene:realScene,meta:{metaVersion:'1'},humanoid:{getNormalizedBoneNode:n=>mapped[n]}};
 const bytes=fs.readFileSync(require.resolve('../web/assets/animations/quaternius-standard.gltf'));
 await C.load(C.BUILTIN,{vendor:sandbox.XinyuVRMVendor,vrm:realVrm,fetch:async()=>({ok:true,arrayBuffer:async()=>bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength)})}).catch(e=>{throw new Error('Real glTF loader: '+e.message);});
 const real=C.create({vendor:sandbox.XinyuVRMVendor,vrm:realVrm,fetch:async()=>({ok:true,arrayBuffer:async()=>bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),json:async()=>({clips:[]})})});await real.ready;
 assert.equal(real.metrics().clips,9);let clock=0;
 for(const mode of ['idle','walk','rest','desk','window','books','stretch','yawn','hum']){
  let movement=0,last=null;
  for(let i=0;i<3600;i++){
   const worldState={name:mode,phase:'activity',moving:mode==='walk',speed:.4,blend:1};
   real.update({now:clock,worldState},1/60);clock+=1000/60;
   const pose=Object.values(mapped).map(b=>b.quaternion.clone());
   if(last)movement+=pose.reduce((sum,q,j)=>sum+q.angleTo(last[j]),0);last=pose;
   if(i%600===599){assert(movement>.05,mode+' cannot freeze for ten seconds');movement=0;}
  }
 }
 real.dispose();assert.equal(real.metrics().clips,0);
 const fixtureVendor={THREE:T,GLTFLoader:class{async parseAsync(){return {scene:source,animations:[...new Set(Object.values(C.POOLS).flat())].map(name=>{const c=clip.clone();c.name=name;return c;})};}}};
 const goodFetch=async url=>({ok:true,arrayBuffer:async()=>new ArrayBuffer(0),json:async()=>({clips:[]})});
 const live=C.create({vendor:fixtureVendor,vrm,fetch:goodFetch,random:()=>.1});await live.ready;
 live.update({now:0},0);live.update({now:500},.5);assert(live.active());assert.equal(live.metrics().mode,'idle');
 const previousPose=target.quaternion.clone();live.update({now:501,worldState:{moving:true,speed:.4}},.001);
 assert(live.metrics().fade);assert(previousPose.angleTo(target.quaternion)<.03,'no hard cut at mode transition');
 live.update({now:900,worldState:{moving:true,speed:.4}},.399);assert(!live.metrics().fade);assert.equal(live.metrics().mode,'walk');
 live.update({now:1000,worldState:{name:'rest',poseName:'rest',blend:.4}},.1);assert.equal(live.metrics().mode,'enter');
 live.update({now:2000,worldState:{name:'rest',poseName:'rest',blend:1}},1);assert.equal(live.metrics().mode,'rest');
 live.update({now:2100,worldState:{name:'accompany',poseName:'rest',blend:.8,poseEnabled:false}},.1);assert.equal(live.metrics().mode,'exit');
 live.update({now:2600,worldState:{name:'accompany',poseName:'rest',blend:.2,poseEnabled:false}},.5);
 const authoredPose=target.quaternion.clone();target.rotation.x=2;
 live.update({now:2600,worldState:{name:'accompany',poseName:'rest',blend:.2,poseEnabled:false}},0);
 assert(target.quaternion.angleTo(authoredPose)<1e-6,'unchanged mixer sample must not inherit procedural contamination');
 live.dispose();assert.equal(live.metrics().clips,0);assert(!live.active());
 const controller=C.create({vendor:{THREE:T},vrm,fetch:async()=>{throw Error('missing')}});await controller.ready;
 assert.equal(controller.metrics().clips,0);controller.update({now:0},.016);assert(!controller.active());controller.dispose();controller.dispose();
 await assert.rejects(C.load('https://example.invalid/clip.fbx',{vendor:{},vrm}),/Non-local/);
 console.log('VRM retarget, real mixer crossfade, moving builtin loops, fallback, resource bounds and disposal passed.');
})().catch(e=>{console.error(e);process.exitCode=1;});
