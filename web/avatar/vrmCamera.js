(function(root) {
  "use strict";
  const SETTINGS = Object.freeze({ frequency: 4, deadZone: .28, maxDt: .1,
    settle: .00001, jitterLimit: .0001, frameRateTolerance: .006 });
  // Exact critically damped spring for a constant target over this interval.
  function spring(x, velocity, goal, dt) {
    const w=SETTINGS.frequency, offset=x-goal, c=velocity+w*offset, decay=Math.exp(-w*dt);
    return [goal+(offset+c*dt)*decay,(velocity-w*c*dt)*decay];
  }
  function create(initial) {
    let value=[...initial], velocity=initial.map(()=>0), goal=[...initial], key=null, anchor=null, last=null;
    return { update({now, position, height, offset, key: nextKey, locked=false}) {
      const dt=Math.max(0,Math.min(SETTINGS.maxDt,(now-(last??now))/1000));last=now;
      // position is the scheduler's horizontal root, never an animated bone or corrected mesh root.
      const changed=nextKey!==key;
      if(changed || !anchor){anchor=[...position];key=nextKey;}
      else if(!locked) {
        const dx=position[0]-anchor[0], dz=position[1]-anchor[1], d=Math.hypot(dx,dz);
        if(d>SETTINGS.deadZone){const t=(d-SETTINGS.deadZone)/d;anchor[0]+=dx*t;anchor[1]+=dz*t;}
      }
      if(changed || !locked) goal=[anchor[0]+offset[0],height+offset[1],anchor[1]+offset[2],anchor[0],height,anchor[1]];
      value=value.map((x,i)=>{
        const result=spring(x,velocity[i],goal[i],dt);velocity[i]=result[1];
        if(Math.abs(result[0]-goal[i])+Math.abs(result[1])<SETTINGS.settle){velocity[i]=0;return goal[i];}
        return result[0];
      });
      return [...value];
    }, snapshot:()=>({value:[...value],goal:[...goal],velocity:[...velocity]}) };
  }
  const api={SETTINGS,spring,create};root.XinyuVRMCamera=api;
  if(typeof module!=="undefined"&&module.exports)module.exports=api;
})(typeof window!=="undefined"?window:globalThis);
