(function(root){
  "use strict";
  const SETTINGS=Object.freeze({stride:.58,leadPhase:.75,lift:.055,reachMargin:.002,epsilon:.002,blendSpeed:.15, referenceLeg:.74});
  const ease=t=>t*t*(3-2*t);
  function create(){
    let feet=null,origin=0;
    return {reset(){feet=null;},apply({T,vrm,avatarRoot,profile,state,floorY=0,rotateTo}){
      if(!profile||!state.moving){feet=null;return null;}
      const bone=n=>vrm.humanoid.getNormalizedBoneNode(n),heading=state.pathYaw??state.yaw,forward=new T.Vector3(Math.sin(heading),0,Math.cos(heading));
      avatarRoot.updateMatrixWorld(true);
      if(!feet)origin=state.travel;
      feet ||= Object.fromEntries(['left','right'].map(side=>{
        const lateral=profile.legs[side].lateral;
        const anchor=new T.Vector3(state.position[0]+Math.cos(heading)*lateral,floorY+profile.legs[side].ankle,state.position[1]-Math.sin(heading)*lateral);
        return [side,{anchor,lateral,swing:false,cycle:-1}];
      }));
      const results={};
      for(const [side,shift] of [['left',0],['right',.5]]){
        const f=feet[side],p=profile.legs[side],upper=bone(side+'UpperLeg'),lower=bone(side+'LowerLeg'),foot=bone(side+'Foot');
        const legScale=(p.upper+p.lower)/SETTINGS.referenceLeg;
        const cycle=(state.travel-origin)/(SETTINGS.stride*legScale)+shift+.25,phase=cycle%1,swing=phase<.5;
        const landing=()=>new T.Vector3(state.position[0]+Math.cos(heading)*f.lateral,floorY+p.ankle,state.position[1]-Math.sin(heading)*f.lateral)
          .addScaledVector(forward,(SETTINGS.leadPhase-phase)*SETTINGS.stride*legScale);
        if(swing&&(!f.swing||f.cycle!==Math.floor(cycle))){f.start=f.anchor.clone();f.end=landing();f.startPhase=phase;}
        if(!swing&&f.swing)f.anchor.copy(f.end);
        f.swing=swing;f.cycle=Math.floor(cycle);
        const progress=swing?(phase-f.startPhase)/(.5-f.startPhase):0;
        const target=swing?f.start.clone().lerp(f.end,ease(progress)):f.anchor.clone();
        if(swing)target.y+=Math.sin(progress*Math.PI)**2*SETTINGS.lift;
        const hip=upper.getWorldPosition(new T.Vector3()),delta=target.clone().sub(hip),wanted=delta.length();
        const d=Math.max(Math.abs(p.upper-p.lower)+SETTINGS.reachMargin,Math.min(wanted,p.upper+p.lower-SETTINGS.reachMargin));
        const axis=delta.normalize(),along=(p.upper*p.upper-p.lower*p.lower+d*d)/(2*d),bend=Math.sqrt(Math.max(0,p.upper*p.upper-along*along));
        const perpendicular=forward.clone().addScaledVector(axis,-forward.dot(axis)).normalize();
        const knee=hip.clone().addScaledVector(axis,along).addScaledVector(perpendicular,bend),ankle=hip.clone().addScaledVector(axis,d);
        const weight=ease(Math.min(1,state.speed/SETTINGS.blendSpeed));
        knee.lerpVectors(lower.getWorldPosition(new T.Vector3()),knee,weight);ankle.lerpVectors(foot.getWorldPosition(new T.Vector3()),ankle,weight);
        rotateTo(T,upper,lower,knee);rotateTo(T,lower,foot,ankle);
        const flat=new T.Quaternion().setFromAxisAngle(new T.Vector3(0,1,0),state.yaw).multiply(p.footRotation);
        foot.quaternion.slerp(flat.premultiply(foot.parent.getWorldQuaternion(new T.Quaternion()).invert()),weight);foot.updateMatrixWorld(true);
        results[side]={stance:!swing,target:target.toArray(),ankle:foot.getWorldPosition(new T.Vector3()).toArray(),reachError:Math.abs(d-wanted)};
      }
      return results;
    }};
  }
  const api={SETTINGS,create};root.XinyuVRMLocomotion=api;
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
