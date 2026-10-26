'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const S=require('../web/avatar/vrmSeating'),F=require('../web/avatar/vrmFurniture');
const sandbox={console,AbortController};vm.runInNewContext(fs.readFileSync(require.resolve('../web/vendor/vrm/vrm-vendor.js'),'utf8'),sandbox);const T=sandbox.XinyuVRMVendor.THREE;
function fake(upper,lower,version){const root=new T.Group(),scene=new T.Group();root.add(scene);if(version==='0')scene.rotation.y=Math.PI;const bones={};
 function add(name,parent,p){const n=new T.Object3D();n.position.set(...p);parent.add(n);bones[name]=n;return n;}
 const hips=add('hips',scene,[0,upper+lower+.135,0]);
 for(const [side,x]of [['left',.08],['right',-.08]]){const thigh=add(side+'UpperLeg',hips,[x,-.035,0]);const knee=add(side+'LowerLeg',thigh,[0,-upper,0]);add(side+'Foot',knee,[0,-lower,0]);}
 return {root,vrm:{humanoid:{getNormalizedBoneNode:n=>bones[n]}}};}
for(const version of ['0','1'])for(const [upper,lower]of [[.34,.40],[.23,.23],[.52,.59]])for(const activity of ['rest','desk']){
 const {root,vrm}=fake(upper,lower,version);const profile=S.measure(T,vrm,root,0);root.rotation.y=S.SEATS[activity].yaw;
 const result=S.apply({T,vrm,avatarRoot:root,profile,activity,weight:1});const seat=S.SEATS[activity];
 assert(Math.abs(result.hip[0]-seat.hip[0])<1e-6);assert(Math.abs(result.hip[2]-seat.hip[1])<1e-6);
 assert(Math.abs(result.hip[1]-profile.padding-seat.surface)<1e-6,'pelvis contact matches seat');
 for(const side of ['left','right']){
  assert(Math.abs(result.legs[side].ankle[1]-result.legs[side].floor)<1e-6,'sole stays on floor for changed proportions');
  const a=vrm.humanoid.getNormalizedBoneNode(side+'UpperLeg').getWorldPosition(new T.Vector3()),b=vrm.humanoid.getNormalizedBoneNode(side+'LowerLeg').getWorldPosition(new T.Vector3()),c=vrm.humanoid.getNormalizedBoneNode(side+'Foot').getWorldPosition(new T.Vector3());
  assert(Math.abs(a.distanceTo(b)-upper)<1e-6);assert(Math.abs(b.distanceTo(c)-lower)<1e-6,'no stretching bones');
 }
}
const start=[0,1,3,0,1,0],end=[3,1,0,0,.5,0];assert.deepEqual(S.cameraBlend(start,end,0),start);assert.deepEqual(S.cameraBlend(start,end,1800),end);
for(let t=0;t<1800;t+=10){const p=S.cameraBlend(start,end,t);for(let i=0;i<6;i++)assert(p[i]>=Math.min(start[i],end[i])&&p[i]<=Math.max(start[i],end[i]));}
for(const [name,c]of Object.entries(S.CAMERAS)){const direction=Math.atan2(c.offset[0],c.offset[2]);assert(Math.cos(direction-c.yaw)>0,name+' face is visible from recommended camera');}
const shoulder=[1.1,.78,0],hand=[1.17,.82,.02],elbow=S.tableElbow(shoulder,hand,.21,.19,.74,[1,0]);assert(elbow);assert.equal(elbow[1],.74);
assert(Math.abs(new T.Vector3(...shoulder).distanceTo(new T.Vector3(...elbow))-.21)<1e-6);assert(Math.abs(new T.Vector3(...hand).distanceTo(new T.Vector3(...elbow))-.19)<1e-6);
assert.notDeepEqual(F.tintFor('sofa'),F.tintFor('rug'));assert(F.COLORS.woodMix>0);
console.log('[OK] Seat/floor contacts with VRM0/1 orientations and short/long legs, bone lengths, table elbow, medium cameras and easing.');

assert.equal(S.active({poseName:'rest',moving:true,blend:1}),null,'walking away must release seat constraints');
assert.equal(S.active({poseName:'rest',moving:false,blend:.5}),'rest');
assert(S.SETTINGS.backLimit+S.SETTINGS.glanceDuration<=8);assert.equal(S.glance(0),0);assert(S.glance(6.75)>.99);

assert.equal(S.tableElbow([0,2,0],[0,1,0],.2,.2,.74,[1,0]),null);

const layout=require('../web/avatar/vrmScene').layout();
for(const [id,name]of [['sofa-seat','rest'],['chair-seat','desk']]){const item=layout.items.find(i=>i.id===id);assert(Math.abs(item.position[1]+item.size[1]/2-S.SEATS[name].surface)<1e-6,'procedural fallback has the same seat surface');}
