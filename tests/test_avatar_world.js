"use strict";
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const W=require('../web/avatar/vrmWorld'),F=require('../web/avatar/vrmFurniture');
assert.deepEqual(require('../web/avatar/vrmScene').layout().activityPoints,W.POINTS);
for(const [name,p] of Object.entries(W.POINTS))assert(W.free(p),name);
for(const a of Object.values(W.POINTS))for(const b of Object.values(W.POINTS)){
 const route=W.path(a,b);assert(route.length);assert.deepEqual(route[0],a);assert.deepEqual(route.at(-1),b);
 for(let i=1;i<route.length;i++)assert(W.clear(route[i-1],route[i]));
}
for(const item of F.ITEMS){const [x,y,z]=item.p,[w,h,d]=item.size;const rotated=!!item.yaw;
 assert(x-(rotated?d:w)/2>=-3&&x+(rotated?d:w)/2<=3&&y>=0&&y+h<=3&&z-(rotated?w:d)/2>=-3&&z+(rotated?w:d)/2<=2,item.id);
}
function sequence(seed){const events=[],w=W.create({seed,emit:e=>events.push(e)});for(let t=0;t<900000;t+=100)w.update(t);return events.filter(e=>e.stage==='start').map(e=>e.name);}
assert.deepEqual(sequence(17),sequence(17));assert.notDeepEqual(sequence(17),sequence(18));
const seq=sequence(17);assert(seq.length>=5);assert(seq.every((s,i)=>i===0||s!==seq[i-1]));
const events=[],world=W.create({emit:e=>events.push(e)});world.update(0);assert(world.begin('books'));let state;
for(let t=100;t<20000;t+=100)state=world.update(t);
assert.equal(state.name,'books');assert.equal(state.phase,'activity');assert.equal(W.pose(state).book,false);assert.deepEqual(W.pose(state).hands,{});
assert.deepEqual(W.pose(state),W.pose({...state}));
state=world.update(20000,{interaction:true});assert.equal(state.name,'accompany');assert(events.some(e=>e.stage==='end'&&e.name==='books'));
world.update(20100);const until=world.snapshot().holdUntil;assert(until>=40100&&until<=60100);
assert.equal(world.update(until-1).name,'accompany');const starts=events.filter(e=>e.stage==='start').length;
world.update(until);assert.equal(events.filter(e=>e.stage==='start').length,starts+1,'one resume, not duplicate activities');
const sitting=W.create();sitting.update(0);sitting.begin('rest');for(let t=100;t<=10000;t+=100)state=sitting.update(t);
assert(W.pose(state).y<0);const before=W.pose(state).y;state=sitting.update(10100,{interaction:true});assert(Math.abs(W.pose(state).y-before)<.05,'rise smoothly before walking');
assert(!state.moving);for(let t=10200;t<15000;t+=100)state=sitting.update(t,{interaction:true});assert(Math.abs(W.pose(state).y)<1e-9);
for(const value of ['https://evil.invalid/x.gltf','/vendor/scenes/../private.vrm',F.BASE+'../../secret',F.BASE+'couch.gltf?x=1',F.BASE+'unknown.gltf'])assert.throws(()=>F.localURL(value,'http://localhost:8124'));
for(const file of F.FILES){assert.equal(new URL(F.localURL(F.BASE+file,'http://localhost:8124')).pathname,F.BASE+file);assert(fs.existsSync(path.join(__dirname,'../web',F.BASE,file)));}
for(const file of F.FILES)if(file.endsWith('.gltf')){const json=JSON.parse(fs.readFileSync(path.join(__dirname,'../web',F.BASE,file),'utf8'));for(const resource of [...json.buffers,...json.images])assert(F.FILES.has(resource.uri));}
assert(/CC0/.test(fs.readFileSync(path.join(__dirname,'../web',F.BASE,'License.txt'),'utf8')));
const sandbox={console,AbortController};vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../web/vendor/vrm/vrm-vendor.js'),'utf8'),sandbox);const T=sandbox.XinyuVRMVendor.THREE;
(async()=>{
 const scene=new T.Scene(),vendor={THREE:T,GLTFLoader:class {}};
 assert.equal(await F.load({vendor,scene,fetchModel:async()=>{throw Error('missing');}}),null);assert.equal(scene.children.length,0);
 let released=0;const make=async()=>{const scene=new T.Group(),geometry=new T.BoxGeometry(),material=new T.MeshStandardMaterial({map:new T.Texture()});
 for(const resource of [geometry,material,material.map])resource.addEventListener('dispose',()=>released++);scene.add(new T.Mesh(geometry,material));return{scene};};
 const loaded=await F.load({vendor,scene,fetchModel:make});assert(loaded);assert.equal(scene.children.length,1);assert(loaded.mesh.material.isMeshToonMaterial);loaded.dispose();loaded.dispose();assert.equal(scene.children.length,0);assert.equal(released,F.ITEMS.length*3);
 const room=require('../web/avatar/vrmScene');const fallback=room.create({THREE:T,scene,vendor,furnitureModule:{load:async()=>null}});await fallback.ready;assert.equal(fallback.metrics().furnitureLoaded,false);assert(scene.children.some(n=>n.children?.some(m=>m.isInstancedMesh&&m.visible)));fallback.dispose();
 const cancelled=await F.load({vendor,scene,fetchModel:make,alive:()=>false});assert.equal(cancelled,null);assert.equal(scene.children.length,0);
 console.log('[OK] World bounds, all-pairs collision-free routes, seeded activities, interruption/resume, sitting transition, local asset allowlist, toon batching and fallback/disposal.');
})().catch(e=>{console.error(e);process.exitCode=1;});
