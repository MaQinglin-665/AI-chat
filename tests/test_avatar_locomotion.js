'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const S=require('../web/avatar/vrmSeating'),F=require('../web/avatar/vrmFurniture');
const sandbox={console,AbortController};vm.runInNewContext(fs.readFileSync(require.resolve('../web/vendor/vrm/vrm-vendor.js'),'utf8'),sandbox);const T=sandbox.XinyuVRMVendor.THREE;
function fake(upper,lower,version){const root=new T.Group(),scene=new T.Group();root.add(scene);if(version==='0')scene.rotation.y=Math.PI;const bones={};
 function add(name,parent,p){const n=new T.Object3D();n.position.set(...p);parent.add(n);bones[name]=n;return n;}
 const hips=add('hips',scene,[0,upper+lower+.135,0]);
 for(const [side,x]of [['left',.08],['right',-.08]]){const thigh=add(side+'UpperLeg',hips,[x,-.035,0]);const knee=add(side+'LowerLeg',thigh,[0,-upper,0]);add(side+'Foot',knee,[0,-lower,0]);}
 return {root,vrm:{humanoid:{getNormalizedBoneNode:n=>bones[n]}}};}
const L=require('../web/avatar/vrmLocomotion');
let maxError=0,maxSlide=0;
for(const version of ['0','1'])for(const [upper,lower]of [[.34,.40],[.23,.23],[.52,.59]]){
 const {root,vrm}=fake(upper,lower,version),profile=S.measure(T,vrm,root,0),solver=L.create();let previous=null;
 for(let i=0;i<240;i++){
  const travel=i/30*.3;root.position.set(0,-.035,travel);
  for(const side of ['left','right'])for(const part of ['UpperLeg','LowerLeg','Foot'])vrm.humanoid.getNormalizedBoneNode(side+part).quaternion.identity();
  const result=solver.apply({T,vrm,avatarRoot:root,profile,state:{moving:true,speed:.3,travel,yaw:0,position:[0,travel]},rotateTo:S.rotateTo});
  for(const side of ['left','right']){const r=result[side];maxError=Math.max(maxError,r.reachError);
   if(previous&&r.stance&&previous[side].stance){const slide=new T.Vector3(...r.ankle).distanceTo(new T.Vector3(...previous[side].ankle));maxSlide=Math.max(maxSlide,slide);}
  }previous=result;
 }
 solver.reset();assert.equal(solver.apply({T,vrm,avatarRoot:root,profile,state:{moving:false}}),null);
}
assert(maxSlide<L.SETTINGS.epsilon,`stance slide ${maxSlide}`);
assert(maxError<L.SETTINGS.epsilon,`unreachable ${maxError}`);
console.log('[OK] VRM0/1 short/long leg planted foot IK:',JSON.stringify({maxError,maxSlide}));

// Start from a previously posed thigh: landing width must still use the neutral measured rig.
{
 const {root,vrm}=fake(.34,.4,'0'),profile=S.measure(T,vrm,root,0),solver=L.create();
 vrm.humanoid.getNormalizedBoneNode('leftUpperLeg').rotation.z=.45;root.position.y=-.035;
 const result=solver.apply({T,vrm,avatarRoot:root,profile,state:{moving:true,speed:.01,travel:0,yaw:0,position:[0,0]},rotateTo:S.rotateTo});
 assert(Math.abs(result.left.target[0]-profile.legs.left.lateral)<1e-9,'do not measure foot width from the animated departure pose');
}
