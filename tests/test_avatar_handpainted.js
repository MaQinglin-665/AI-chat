'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const H=require('../web/avatar/vrmHandpainted'),W=require('../web/avatar/vrmWorld'),S=require('../web/avatar/vrmSeating'),R=require('../web/avatar/vrmScene');
const data=H.layout();assert.deepEqual(data,H.layout());
for(const c of Object.values(data.cameras))assert(Math.sin(c.yaw)*c.offset[0]+Math.cos(c.yaw)*c.offset[2]>0,'activity camera stays on the face side');
for(const p of Object.values(data.activityPoints)){
 assert(W.free(p,data.obstacles,data.limits));assert(p[0]>=data.bounds.min[0]&&p[0]<=data.bounds.max[0]);assert(p[1]>=data.bounds.min[2]&&p[1]<=data.bounds.max[2]);
 for(const q of Object.values(data.activityPoints)){const route=W.path(p,q,data.obstacles,data.limits);assert(route.length);for(let i=1;i<route.length;i++)assert(W.clear(route[i-1],route[i],data.obstacles));}
}
assert(Math.abs(data.seats.desk.table-.74438)<.0001);assert(Math.abs(data.seats.rest.surface-.37016)<.0001);
const a=W.create({layout:data,seed:7}),b=W.create({layout:data,seed:7});for(let t=0;t<600000;t+=100)assert.deepEqual(a.update(t),b.update(t));a.dispose();b.dispose();
const base=path.join(__dirname,'../web/vendor/scenes/hand-painted-room'),gltf=JSON.parse(fs.readFileSync(path.join(base,'scene.gltf'),'utf8'));
for(const file of H.FILES){assert(fs.existsSync(path.join(base,file)));assert(H.localURL(H.BASE+file,'http://localhost').startsWith('http://localhost/'));}
for(const image of gltf.images)assert(H.FILES.has(image.uri));for(const buffer of gltf.buffers)assert(H.FILES.has(buffer.uri));
for(const value of ['https://evil.example/scene.gltf',H.BASE+'../scene.gltf',H.BASE+'scene.gltf?x=1',H.BASE+'private.txt'])assert.throws(()=>H.localURL(value,'http://localhost'));
assert(H.clip([[0,0],[2,0],[2,2],[0,2]],0,1).every(p=>p[0]<=1));assert(!H.keepTriangle('Desk_02',0,.4,0));assert(H.keepTriangle('Desk_02',0,.744,1.7));
assert(fs.readFileSync(path.join(base,'license.txt'),'utf8').includes('CC-BY-4.0'));
const sandbox={console,AbortController};vm.runInNewContext(fs.readFileSync(require.resolve('../web/vendor/vrm/vrm-vendor'),'utf8'),sandbox);const T=sandbox.XinyuVRMVendor.THREE;
(async()=>{
 const scene=new T.Scene(),vendor={THREE:T,GLTFLoader:class{}},disposed=[];
 global.XinyuVRMFurniture={load:async()=>({dispose(){disposed.push('extra');}})};
 const make=()=>{const scene=new T.Group(),group=new T.Group();group.name='Windows';scene.add(group);const geometry=new T.BoxGeometry(10,10,10),material=new T.MeshBasicMaterial({map:new T.Texture()});for(const r of [geometry,material,material.map])r.addEventListener('dispose',()=>disposed.push(r));group.add(new T.Mesh(geometry,material));return {scene};};
 const result=await H.load({vendor,scene,fetchModel:async()=>make()});assert(result);assert.equal(scene.children.length,1);assert.equal(result.glows.length,1);result.update(0);const night=result.glows[0].material.color.getHex();result.update(1);assert.notEqual(result.glows[0].material.color.getHex(),night);result.dispose();assert.equal(scene.children.length,0);assert.equal(disposed.length,4);
 assert.equal(await H.load({vendor,scene,fetchModel:async()=>{throw Error('missing');}}),null);
 assert.equal(await H.load({vendor,scene,alive:()=>false,fetchModel:async()=>make()}),null);assert.equal(scene.children.length,0);
 // Shared lifecycle: unsuccessful preset preserves the complete KayKit fallback and its layout.
 for(const fail of [false,true])for(let i=0;i<3;i++){
  let released=0;const furniture={load:async()=>({mesh:new T.Group(),dispose(){released++;}})};
  const room=R.create({THREE:T,vendor,scene,preset:'handpainted',furnitureModule:furniture,handpaintedModule:{load:async()=>fail?null:{layout:data,glows:[],update(){},dispose(){released++;}}}});
  await room.ready;assert.equal(room.metrics().preset,fail?'room':'handpainted');if(!fail)assert.deepEqual(room.getLayout(),data);
  room.update('day',100);room.update('day',3000);assert.equal(room.metrics().day,1);room.dispose();assert.equal(scene.children.length,0);assert.equal(released,fail?1:2);
 }
 // A late async result cannot revive a disposed room.
 let finish,entered,lateDisposed=0;const started=new Promise(r=>entered=r),pending=new Promise(r=>finish=r),room=R.create({THREE:T,vendor,scene,preset:'handpainted',furnitureModule:{load:async()=>null},handpaintedModule:{load:()=>{entered();return pending;}}});
 await started;room.dispose();finish({dispose(){lateDisposed++;}});await room.ready;assert.equal(lateDisposed,1);assert.equal(scene.children.length,0);
 assert(!R.enabled('full','none'));assert(!R.enabled('model','handpainted'));
 console.log('[OK] Hand-painted local assets, measured layout/all-pairs paths, deterministic scheduling, day/night, fallback and async disposal.');
})().catch(e=>{console.error(e);process.exitCode=1;});
