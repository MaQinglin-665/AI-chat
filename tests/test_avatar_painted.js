"use strict";
const assert = require("node:assert/strict"), fs = require("node:fs"), vm = require("node:vm");
const P = require("../web/avatar/vrmPainted"), W = require("../web/avatar/vrmWorld");
const sandbox = { console, AbortController }; vm.runInNewContext(fs.readFileSync(require.resolve("../web/vendor/vrm/vrm-vendor"), "utf8"), sandbox);
const T = sandbox.XinyuVRMVendor.THREE;
const flush = () => new Promise(resolve => setImmediate(resolve));
for (const size of [[1920,1080],[1280,800],[480,800],[320,900]]) {
  const c = P.cover(1672,941,...size);
  assert(c.x >= 0 && c.y >= 0 && c.x+c.w <= 1672+1e-8 && c.y+c.h <= 941+1e-8);
  assert(Math.abs(c.w/c.h-size[0]/size[1]) < 1e-10);
  assert(c.anchor[0] > .45 && c.anchor[0] < .6 && c.anchor[1] > .8 && c.anchor[1] < .91);
  const hd=P.cover(3344,1882,...size); assert.deepEqual(hd.anchor,c.anchor);
}
assert.throws(()=>P.cover(0,1,20,20));
for (const value of ["../day","day.png","night?path=secret","https://evil.example/day"]) assert.throws(()=>P.localURL(value));
assert.equal(P.periodAt("morning"),"day"); assert.equal(P.periodAt("auto",17),"dusk");
assert.equal(P.periodAt("auto",20),"night"); assert.equal(P.periodAt("auto",5),"day");
assert(P.LIGHTS.night.keyPosition[0]>0 && P.LIGHTS.night.rimPosition[0]<0);
assert(P.LIGHTS.day.keyPosition[0]<0 && P.LIGHTS.dusk.keyPosition[0]<0);
for(const period of P.PERIODS) assert(P.LIGHTS[period].reflection>=.15 && P.LIGHTS[period].reflection<=.25);
assert(P.SURFACE.softnessPx>=.5 && P.SURFACE.softnessPx<=1);
assert(P.LOOKS.night.contact<P.LOOKS.dusk.contact);
assert(P.LOOKS.dusk.shadowLength>P.LOOKS.day.shadowLength);
assert(P.LOOKS.dusk.exposure<P.LOOKS.day.exposure);
assert(P.LOOKS.dusk.leftRim>P.LOOKS.day.leftRim && P.LOOKS.night.rightRim>P.LOOKS.night.leftRim);
// Check light directions in the accepted camera coordinates, not only world X.
const yaw=P.CALIBRATION.dusk.yaw*Math.PI/180;
const screenDirection=([x,y,z])=>[x*Math.cos(yaw)-z*Math.sin(yaw),x*Math.sin(yaw)+z*Math.cos(yaw)];
const sunlight=screenDirection(P.LIGHTS.dusk.keyPosition);
assert(sunlight[0]<0 && sunlight[1]<0,"dusk light left/back; its shadow right/front");
assert(screenDirection(P.LIGHTS.night.keyPosition)[0]>0);
const stationary=W.create({layout:{activityPoints:{},obstacles:[]}});
for(let i=0;i<1000;i++){const s=stationary.update(i*10000);assert.deepEqual(s.position,[0,0]);assert.equal(s.moving,false);assert.equal(stationary.begin("window"),false);}
for(let t=0;t<200000;t+=500){const pose=P.stationaryPose(t,false);assert.equal(pose.y,0);assert.deepEqual(pose.offset,[0,0]);assert(pose.weight>=0 && pose.weight<=1);}
assert.equal(P.stationaryPose(22000,true).weight,0);
assert.equal(P.stationaryPose(50000,false,-1).bones.leftUpperArm.z,-P.stationaryPose(50000,false,1).bones.leftUpperArm.z);
(async()=>{
  let live=0,max=0,released=0,loaded=[];
  function plate(period){live++;max=Math.max(max,live);loaded.push(period);const texture=new T.Texture();let dead=false;
    texture.addEventListener("dispose",()=>{assert(!dead);dead=true;live--;released++;});return {texture,period,width:1672,height:941};}
  const slots=P.createPlates({load:async name=>plate(name)});await slots.ready;
  slots.update("day",0);await flush();assert.equal(live,2);
  assert.equal(slots.update("day",100).blend,0);assert.equal(slots.update("day",1400).blend,.5);
  slots.update("dusk",1500);assert.equal(live,2);assert.deepEqual(loaded,["night","day"]);
  slots.update("dusk",2700);await flush();assert.equal(live,2);assert.equal(max,2);
  slots.update("dusk",2800);slots.update("dusk",5400);slots.dispose();slots.dispose();assert.equal(live,0);assert.equal(released,3);
  let resolve;const pending=P.createPlates({load:()=>new Promise(r=>{resolve=r;})});pending.dispose();resolve(plate("night"));await pending.ready;assert.equal(live,0);
  let attempts=0;const failed=P.createPlates({load:async()=>{attempts++;throw Error("offline");}});await failed.ready;
  for(let i=0;i<20;i++)failed.update("night",i);assert.equal(attempts,1);failed.dispose();
  for(let cycle=0;cycle<10;cycle++){
    const scene=new T.Scene(),bg=new T.Color(0xff0000),fog=new T.Fog(0xff0000,1,10);scene.background=bg;scene.fog=fog;
    const room=P.create({THREE:T,scene,loadTexture:async name=>plate(name)});await room.ready;room.update("night",0);
    const camera=new T.PerspectiveCamera();
    for(const size of [[1920,1080],[1280,800],[480,800]]){
      room.resizeCamera(camera,...size);const foot=new T.Vector3(0,0,0).project(camera),head=new T.Vector3(0,1.8,0).project(camera);
      const c=room.metrics().camera.crop;
      assert(Math.abs((foot.x+1)/2-c.anchor[0])<1e-8);assert(Math.abs((1-foot.y)/2-c.anchor[1])<1e-8);
      assert(head.y<1 && head.y>foot.y,"full body remains on screen");
    }
    const night=room.metrics().illumination;room.update("day",100);await flush();room.update("day",200);room.update("day",1500);
    assert.equal(room.metrics().blend,.5);assert(Math.abs(room.metrics().illumination.key-(night.key+P.LIGHTS.day.key)/2)<1e-8);
    room.setOptions({reflection:false,grid:true});assert.equal(room.metrics().reflection,false);
    room.dispose();room.dispose();assert.equal(live,0);assert.equal(scene.children.length,0);assert.equal(scene.background,bg);assert.equal(scene.fog,fog);
  }
  let closed=0;
  global.createImageBitmap=async blob=>{if(blob==="broken")throw Error("decode failed");return {width:16,height:9,close(){closed++;}};};
  for(const bad of ["missing","broken"]){
    const requests=[],room=P.create({THREE:T,scene:new T.Scene(),fetch:async url=>{requests.push(url);return {
      ok:bad!=="missing"||url.includes("placeholder"),headers:{get:()=>"night"},
      blob:async()=>url.includes("placeholder")?"valid":"broken"};}});
    await room.ready;room.update("night",0);assert.equal(room.metrics().textures,1);
    assert.deepEqual(requests,[P.localURL("night"),"/assets/painted-placeholder.png"]);room.dispose();
  }
  assert.equal(closed,2);delete global.createImageBitmap;
  // Real Three render targets + a renderer spy: isolate the avatar, preserve
  // caller state on every pass/failure, release both GPU targets exactly once.
  const scene=new T.Scene(),avatar=new T.Group(),camera=new T.PerspectiveCamera();scene.add(avatar);
  const room=P.create({THREE:T,scene,loadTexture:async name=>plate(name)});await room.ready;room.update("night",0);
  room.resizeCamera(camera,1280,800);
  let bound=null,clearAlpha=.3,color=new T.Color(0x112233),calls=[],failAt=0;const targets=new Set(),disposed=new Map();
  const renderer={info:{render:{calls:4}},getSize:v=>v.set(1280,800),getDrawingBufferSize:v=>v.set(1600,1000),
    getRenderTarget:()=>bound,setRenderTarget:t=>{bound=t;if(t&&!targets.has(t)){targets.add(t);disposed.set(t,0);t.addEventListener("dispose",()=>disposed.set(t,disposed.get(t)+1));}},
    getClearAlpha:()=>clearAlpha,getClearColor:v=>v.copy(color),setClearColor:(v,a)=>{color.set(v);clearAlpha=a;},clear(){},
    render(){calls.push({bound,visible:avatar.visible,y:avatar.scale.y});if(failAt && calls.length===failAt)throw Error("render failed");}};
  room.render(renderer,camera,avatar);assert.equal(calls.length,3);
  assert.equal(calls[0].y,-1);assert.equal(calls[1].y,1);assert.equal(calls[2].visible,false);
  assert.equal(avatar.visible,true);assert.equal(avatar.scale.y,1);assert.equal(bound,null);assert.equal(clearAlpha,.3);
  assert.equal(color.getHex(),0x112233);assert.equal(targets.size,2);assert.deepEqual(room.metrics().surface.avatarTarget,[1600,1000]);
  room.setOptions({reflection:false});assert.equal([...disposed.values()].reduce((a,b)=>a+b),1);
  calls=[];room.render(renderer,camera,avatar);assert.equal(calls.length,2);assert.equal(targets.size,2);
  calls=[];failAt=1;assert.throws(()=>room.render(renderer,camera,avatar));assert.equal(bound,null);assert.equal(avatar.visible,true);assert.equal(clearAlpha,.3);
  calls=[];failAt=2;assert.throws(()=>room.render(renderer,camera,avatar));assert.equal(bound,null);assert.equal(avatar.visible,true);
  room.dispose();room.dispose();assert.equal([...disposed.values()].reduce((a,b)=>a+b),2);assert.equal(live,0);
  // Backend path/security cases run in the independent Python suite.
  console.log("[OK] Painted cover/anchor, camera projection, stationary poses, light transitions, bounded/late textures, fallback and render-target lifecycle.");
})().catch(error=>{console.error(error);process.exitCode=1;});
