(function(root){
  "use strict";
  const SETTINGS=Object.freeze({pelvisPadding:.22, ankleMin:.035, kneeDrop:.025, footReach:.85,
    handSpread:.13, lapForward:.22, lapLift:.06, cameraMs:1800, backLimit:6, glanceDuration:1.5});
  // These are seat surfaces measured on the normalized KayKit meshes, not their bounding-box tops.
  const SEATS=Object.freeze({
    rest:{hip:[-2.10,-.3],yaw:Math.PI/2,surface:.310,front:-1.72},
    desk:{hip:[1.10,.15],yaw:Math.PI/2,surface:.342,table:.740}
  });
  const CAMERAS=Object.freeze({
    window:{offset:[3.4,.50,.55],height:.66,yaw:2.60},
    books:{offset:[-3.5,.50,.6],height:.66,yaw:-2.60},
    rest:{offset:[3.3,.60,1.9],height:.60,yaw:Math.PI/2},
    desk:{offset:[1.6,.65,3.2],height:.60,yaw:Math.PI/2},
    idle:{offset:[1.3,.45,3.5],height:.66,yaw:0}
  });
  const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
  // A reachable ankle on the floor; solve the knee by the law of cosines in the sagittal plane.
  function leg(upper,lower,hipY,ankleY){
    const drop=hipY-ankleY;
    const desired=upper*SETTINGS.footReach+Math.sqrt(Math.max(0,lower*lower-(drop-SETTINGS.kneeDrop)**2));
    const forward=Math.min(desired,Math.sqrt(Math.max(0,(upper+lower-.001)**2-drop*drop)));
    const d=Math.hypot(forward,drop),along=(upper*upper-lower*lower+d*d)/(2*d);
    const bend=Math.sqrt(Math.max(0,upper*upper-along*along));
    return {ankle:[forward,ankleY],knee:[along*forward/d+bend*drop/d,hipY-along*drop/d+bend*forward/d]};
  }
  function measure(T,vrm,avatarRoot,floorY){
    avatarRoot.updateMatrixWorld(true);
    const bone=n=>vrm.humanoid?.getNormalizedBoneNode?.(n),pos=n=>bone(n)?.getWorldPosition(new T.Vector3());
    const hips=pos('hips');if(!hips)return null;
    const legs={};
    for(const side of ['left','right']){
      const thigh=pos(side+'UpperLeg'),knee=pos(side+'LowerLeg'),ankle=pos(side+'Foot');if(!thigh||!knee||!ankle)return null;
      legs[side]={lateral:avatarRoot.worldToLocal(thigh.clone()).x,upper:thigh.distanceTo(knee),lower:knee.distanceTo(ankle),ankle:Math.max(SETTINGS.ankleMin,ankle.y-floorY),
        footRotation:bone(side+'Foot').getWorldQuaternion(new T.Quaternion())};
    }
    return {hipsY:hips.y,legs,padding:Math.min(legs.left.upper,legs.right.upper)*SETTINGS.pelvisPadding};
  }
  function rotateTo(T,node,end,target){
    const at=node.getWorldPosition(new T.Vector3()),a=end.getWorldPosition(new T.Vector3()).sub(at).normalize(),b=target.clone().sub(at).normalize();
    const parent=node.parent.getWorldQuaternion(new T.Quaternion()),q=new T.Quaternion().setFromUnitVectors(a,b);
    q.premultiply(parent.clone().invert()).multiply(parent);node.quaternion.premultiply(q);node.updateMatrixWorld(true);
  }
  function apply({T,vrm,avatarRoot,profile,activity,weight,floorY=0,seats=SEATS}){
    const seat=seats[activity];if(!seat||!profile||weight<=0)return null;
    const bone=n=>vrm.humanoid.getNormalizedBoneNode(n),hips=bone('hips');avatarRoot.updateMatrixWorld(true);
    const before=hips.getWorldPosition(new T.Vector3()),wanted=new T.Vector3(seat.hip[0],floorY+seat.surface+profile.padding,seat.hip[1]);
    avatarRoot.position.add(wanted.sub(before).multiplyScalar(weight));avatarRoot.updateMatrixWorld(true);
    const forward=new T.Vector3(Math.sin(seat.yaw),0,Math.cos(seat.yaw));
    const targets={};
    for(const side of ['left','right']){
      const upper=bone(side+'UpperLeg'),lower=bone(side+'LowerLeg'),foot=bone(side+'Foot'),start=upper.getWorldPosition(new T.Vector3()),p=profile.legs[side];
      const solve=leg(p.upper,p.lower,start.y-floorY,p.ankle);
      const knee=start.clone().addScaledVector(forward,solve.knee[0]);knee.y=floorY+solve.knee[1];
      const ankle=start.clone().addScaledVector(forward,solve.ankle[0]);ankle.y=floorY+p.ankle;
      const oldKnee=lower.getWorldPosition(new T.Vector3()),oldFoot=foot.getWorldPosition(new T.Vector3());
      knee.lerpVectors(oldKnee,knee,weight);ankle.lerpVectors(oldFoot,ankle,weight);
      rotateTo(T,upper,lower,knee);rotateTo(T,lower,foot,ankle);
      const flat=new T.Quaternion().setFromAxisAngle(new T.Vector3(0,1,0),seat.yaw).multiply(p.footRotation);
      flat.premultiply(foot.parent.getWorldQuaternion(new T.Quaternion()).invert());foot.quaternion.slerp(flat,weight);foot.updateMatrixWorld(true);
      targets[side]={knee:lower.getWorldPosition(new T.Vector3()).toArray(),ankle:foot.getWorldPosition(new T.Vector3()).toArray(),floor:floorY+p.ankle};
    }
    return {hip:hips.getWorldPosition(new T.Vector3()).toArray(),surface:floorY+seat.surface,padding:profile.padding,legs:targets};
  }
  function cameraBlend(start,end,elapsed){const t=clamp(elapsed/SETTINGS.cameraMs,0,1),w=t*t*(3-2*t);return start.map((v,i)=>v+(end[i]-v)*w);}
  function tableElbow(shoulder,hand,upper,lower,y,forward){
    if(Math.abs(shoulder[1]-y)>upper||Math.abs(hand[1]-y)>lower)return null;
    const a=Math.sqrt(Math.max(0,upper*upper-(shoulder[1]-y)**2)),b=Math.sqrt(Math.max(0,lower*lower-(hand[1]-y)**2));
    const dx=hand[0]-shoulder[0],dz=hand[2]-shoulder[2],d=Math.hypot(dx,dz);
    if(d<1e-6||d>a+b||d<Math.abs(a-b))return null;
    const along=(a*a-b*b+d*d)/(2*d),side=Math.sqrt(Math.max(0,a*a-along*along));
    const choices=[-1,1].map(sign=>[shoulder[0]+along*dx/d-sign*side*dz/d,y,shoulder[2]+along*dz/d+sign*side*dx/d]);
    return choices.sort((p,q)=>(q[0]*forward[0]+q[2]*forward[1])-(p[0]*forward[0]+p[2]*forward[1]))[0];
  }
  function active(state){return state && !state.moving && state.blend>0 && SEATS[state.poseName] ? state.poseName : null;}
  function glance(seconds){return Math.sin(clamp((seconds-SETTINGS.backLimit)/SETTINGS.glanceDuration,0,1)*Math.PI);}
  const api={active,glance,tableElbow,SETTINGS,SEATS,CAMERAS,leg,measure,apply,rotateTo,cameraBlend};root.XinyuVRMSeating=api;
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
