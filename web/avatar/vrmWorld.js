(function(root) {
  "use strict";
  const TUNING = Object.freeze({ seed: 218, activityMin: 60000, activityMax: 180000,
    resumeMin: 20000, resumeMax: 40000, speed: 0.48, radius: 0.22, blendMs: 700,
    turnSpeed: 1.8, returnDistance: 1.8, strideHz: 1.35, legSwing: 0.38, armSwing: 0.18,
    walkBounce: 0.006, cameraRate: 2.0, cameraTravel: 0.7, sitLower: 0.29,
    lookBackPeriod: 11, reachDuration: 3.0, poseSway: 0.025, readTurn: 0.12, reachHeight:.85, reachDistance:.5, kneeSwing: .45, armRest: 1.25,
    windowArm: -.9, windowArmSide: -.8, windowElbow: .4, windowHeadHz:.4, windowHeadYaw:.15,
    windowLookBackAt:8, windowLookBackYaw:1.1, windowHeadPitch:.08,
    readRightArm:-.95, readRightSide:.5, reachLift:.7, readRightElbow:-1.15,
    readLeftArm:-.75, readLeftSide:-.65, readLeftElbow:1.1, readHeadPitch:.25, pageHz:1.8,
    sitThigh:-1.42, sitKnee:1.35, sitSwayHz:.8, sitHeadHz:.7, sitHeadPitch:.12,
    sitLeftArm:-.7, sitLeftSide:-.6, sitLeftElbow:1.3, sitRightArm:-.9, sitRightSide:.7, sitRightElbow:-1.25,
    restOffset:-.6, deskOffset:.56, writeHz:3, writeWrist:.08, stretchHz:.5, stretchRaise:3.4, stretchChest:-.12,
    yawnArm:-.65, yawnSide:.8, yawnElbow:-1.8, yawnHead:-.12, humHz:2, humHip:.07, humHead:.1, humPhase:.4 });
  const MOTION = Object.freeze({ acceleration:.65, braking:.8, cornerMargin:.18, cornerTrim:.22,
    curveSamples:96, curveSpeedFactor:.75, maxPathTurnRate:2.2, turnDelay:.38, headDelay:.08, chestDelay:.19,
    speedVariation:.10, amplitudeVariation:.08, pauseMin:.12, pauseMax:.28,
    strideLength:.58, armLag:.55, hipRoll:.025, hipTwist:.045, headCompensation:.55,
    headTurn:.65, chestTurn:.30, gazeTurn:1, gazeRate:14, headRate:8, chestRate:5, turnLimit:.9, preparationLean:.05, kneeClearance:.045, footBlendSpeed:.15,
    cornerLookAhead:.15, brakeBuffer:.03, headingSlowAngle:.35, minSpeed:.0001, arrival:.00001, integrationStep:1/120, maxPoseStep:.08, maxBoneStep:.30 });
  const ease=t=>{t=Math.max(0,Math.min(1,t));return t*t*t*(t*(t*6-15)+10);};
  const angle=a=>Math.atan2(Math.sin(a),Math.cos(a));
  // Hand contacts in avatar-local metres; height ratios handle different avatars.
  const CONTACT = Object.freeze({ window:[[-.16,.9,.55]], books:[[-.13,.74,.30],[.13,.74,.30]],
    rest:[[-.14,.64,.25],[.14,.64,.25]], desk:[[-.11,.84,.12],[.14,.74,.48]],
    yawn:[[.02,.88,.12]], iterations:8, epsilon:.003 });
  const POINTS = Object.freeze({ accompany: [0, 0], window: [-1.35, -2.28], books: [1.45, -1.98],
    rest: [-1.22, -0.3], desk: [0.42, 0.15], stretch: [0, 0], yawn: [0, 0], hum: [0, 0] });
  const OBSTACLES = Object.freeze([
    { id: "shelf", x: 1.45, z: -2.65, w: 1.05, d: 0.36 },
    { id: "lamp", x: -2.35, z: -2.18, w: 0.35, d: 0.35 },
    { id: "plant", x: -2.55, z: -2.65, w: 0.3, d: 0.3 },
    { id: "sofa", x: -2.13, z: -0.3, w: 0.85, d: 1.7 },
    { id: "desk", x: 1.82, z: -0.15, w: 1.15, d: 0.65 },
    { id: "chair", x: 0.98, z: 0.15, w: 0.5, d: 0.5 }
  ]);
  const LIMITS = Object.freeze({ minX: -2.72, maxX: 2.72, minZ: -2.72, maxZ: 1.7 });
  const distance = (a,b) => Math.hypot(a[0]-b[0],a[1]-b[1]);
  function rect(o, margin = TUNING.radius) { return [o.x-o.w/2-margin,o.z-o.d/2-margin,o.x+o.w/2+margin,o.z+o.d/2+margin]; }
  function free(p, obstacles = OBSTACLES, limits = LIMITS) { return p[0]>=limits.minX && p[0]<=limits.maxX && p[1]>=limits.minZ && p[1]<=limits.maxZ && !obstacles.some(o=>{
    const r=rect(o);return p[0]>r[0]&&p[0]<r[2]&&p[1]>r[1]&&p[1]<r[3]; }); }
  function clear(a,b,obstacles=OBSTACLES) {
    // Slab intersection against inflated boxes, not frame-dependent point samples.
    return !obstacles.some(o=>{ const r=rect(o);let lo=0,hi=1;
      for(let k=0;k<2;k++){const d=b[k]-a[k];if(Math.abs(d)<1e-9){if(a[k]<=r[k]||a[k]>=r[k+2])return false;}
        else {const t1=(r[k]-a[k])/d,t2=(r[k+2]-a[k])/d;lo=Math.max(lo,Math.min(t1,t2));hi=Math.min(hi,Math.max(t1,t2));}}
      return lo<hi && hi>0 && lo<1; });
  }
  function path(start, end, obstacles=OBSTACLES, limits=LIMITS) {
    if(!free(start,obstacles,limits)||!free(end,obstacles,limits))return [];
    const nodes=[start,end];
    for(const o of obstacles){const r=rect(o,TUNING.radius+MOTION.cornerMargin);for(const p of [[r[0],r[1]],[r[2],r[1]],[r[0],r[3]],[r[2],r[3]]])if(free(p,obstacles,limits))nodes.push(p);}
    const costs=nodes.map(()=>Infinity), prev=[], done=new Set();costs[0]=0;
    while(done.size<nodes.length){let i=-1;nodes.forEach((_,j)=>{if(!done.has(j)&&(i<0||costs[j]<costs[i]))i=j;});
      if(i<0||!Number.isFinite(costs[i]))return [];if(i===1)break;done.add(i);
      nodes.forEach((p,j)=>{const c=costs[i]+distance(nodes[i],p);if(!done.has(j)&&c<costs[j]&&clear(nodes[i],p,obstacles)){costs[j]=c;prev[j]=i;}});
    }
    const result=[end];for(let i=1;i!==0;){i=prev[i];if(i===undefined)return [];result.unshift(nodes[i]);}return result;
  }
  // Quadratic corner arcs with collision-tested chords. Shrink the trim if space is tight.
  function smoothPath(points,obstacles=OBSTACLES,limits=LIMITS){
    if(points.length<3)return points.map(p=>[...p]);
    const result=[[...points[0]]];
    for(let i=1;i<points.length-1;i++){
      const a=points[i-1],b=points[i],c=points[i+1];let accepted=null;
      for(let trim=Math.min(MOTION.cornerTrim,distance(a,b)*.4,distance(b,c)*.4);trim>.0001;trim*=.5){
        const enter=b.map((v,k)=>v+(a[k]-v)*trim/distance(a,b)),exit=b.map((v,k)=>v+(c[k]-v)*trim/distance(b,c));
        const arc=Array.from({length:MOTION.curveSamples+1},(_,j)=>{const t=j/MOTION.curveSamples;return b.map((v,k)=>(1-t)**2*enter[k]+2*t*(1-t)*v+t*t*exit[k]);});
        const chain=[result.at(-1),...arc,c];
        if(arc.every(p=>free(p,obstacles,limits))&&chain.slice(1).every((p,j)=>clear(chain[j],p,obstacles))){accepted=arc;break;}
      }
      result.push(...(accepted||[[...b]]));
    }
    result.push([...points.at(-1)]);return result;
  }
  function rng(seed){let x=seed>>>0;return ()=>{x=(Math.imul(x,1664525)+1013904223)>>>0;return x/4294967296;};}
  function create({ seed=TUNING.seed, emit=()=>{}, layout={} }={}) {
    const points=layout.activityPoints||POINTS, obstacles=layout.obstacles||OBSTACLES, limits=layout.limits||LIMITS, cameras=layout.cameras;
    const random=rng(seed), range=(a,b)=>a+random()*(b-a);
    let position=[...points.accompany], yaw=0, name="accompany", previous="", phase="idle", route=[], last=null,
      now=0,next=range(TUNING.activityMin,TUNING.activityMax),began=0,blend=0,rawBlend=0,hold=0,busy=false,wait=0,poseName="accompany",poseAge=0,
      speed=0,travel=0,turnAge=0,turnDelta=0,headTurn=0,chestTurn=0,gazeYaw=0,pathYaw=0,
      variation={speed:1,amplitude:1,pause:0};
    const plan=end=>smoothPath(path(position,end,obstacles,limits),obstacles,limits).slice(1).filter(p=>distance(position,p)>MOTION.arrival);
    function event(stage, activity){emit({type:"activity",name:activity,stage});}
    function end(){if(name!=="accompany")event("end",name);}
    function begin(activity){if(!Object.hasOwn(points,activity))return false;
      const planned=path(position,points[activity],obstacles,limits);if(!planned.length)return false;
      end();previous=name;name=activity;route=plan(points[activity]);phase=route.length?"prepare":"activity";
      turnAge=0;variation={speed:range(1-MOTION.speedVariation,1+MOTION.speedVariation),amplitude:range(1-MOTION.amplitudeVariation,1+MOTION.amplitudeVariation),pause:range(MOTION.pauseMin,MOTION.pauseMax)};
      began=now;next=now+range(TUNING.activityMin,TUNING.activityMax);event("start",name);return true;}
    function interact(){
      if(!busy){wait=range(TUNING.resumeMin,TUNING.resumeMax);end();previous=name;name="accompany";
        route=distance(position,points.accompany)<=TUNING.returnDistance?plan(points.accompany):[];
        phase=route.length?"prepare":"respond";turnAge=0;}
      busy=true;hold=now+wait;
    }
    function choose(period){const choices=["window","books","rest","desk","stretch","yawn","hum"];
      const weights=period==="night"?[1,4,4,3,1,3,1]:[3,2,2,2,3,1,3];
      const list=choices.map((n,i)=>[n,n===name||n===previous?0:weights[i]]);let roll=random()*list.reduce((s,v)=>s+v[1],0);
      for(const [n,w] of list){roll-=w;if(roll<0)return n;}return "window";}
    function update(time, { interaction=false, period="night" }={}) {
      now=time;const dt=Math.max(0,Math.min((now-(last??now))/1000,.1));last=now;
      if(interaction)interact();else if(busy){busy=false;hold=now+wait;}
      if(!interaction&&hold&&now>=hold){hold=0;begin(choose(period));}
      else if(!interaction&&!hold&&now>=next)begin(choose(period));
      // Small fixed substeps keep acceleration and heading limits stable at 20/30 Hz.
      const count=Math.max(1,Math.ceil(dt/MOTION.integrationStep)),stepDt=dt/count;
      for(let step=0;step<count;step++){
        const canPose=!route.length&&speed<MOTION.minSpeed&&name!=="accompany";
        const samePose=poseName===name;
        const desired=canPose&&(samePose||rawBlend===0)?1:0;
        if(desired&&!samePose){poseName=name;began=now;}
        rawBlend+=Math.sign(desired-rawBlend)*Math.min(Math.abs(desired-rawBlend),stepDt*1000/TUNING.blendMs);
        blend=ease(rawBlend);poseAge=(now-began)/1000;
        let targetYaw=name==="accompany"?0:(cameras?.[name]?.yaw ?? {window:2.60,books:-2.60,rest:Math.PI/2,desk:Math.PI/2}[name]??0);
        if(route.length)targetYaw=Math.atan2(route[0][0]-position[0],route[0][1]-position[1]);
        pathYaw=targetYaw;turnAge+=stepDt;turnDelta=angle(targetYaw-yaw);
        gazeYaw+=angle(yaw+Math.max(-MOTION.turnLimit,Math.min(MOTION.turnLimit,turnDelta))*ease(turnAge/MOTION.headDelay)-gazeYaw)*(1-Math.exp(-MOTION.gazeRate*stepDt));
        headTurn+=(Math.max(-MOTION.turnLimit,Math.min(MOTION.turnLimit,turnDelta))*MOTION.headTurn*ease((turnAge-MOTION.headDelay)/(MOTION.turnDelay-MOTION.headDelay))-headTurn)*(1-Math.exp(-MOTION.headRate*stepDt));
        chestTurn+=(Math.max(-MOTION.turnLimit,Math.min(MOTION.turnLimit,turnDelta))*MOTION.chestTurn*ease((turnAge-MOTION.chestDelay)/(MOTION.turnDelay-MOTION.chestDelay))-chestTurn)*(1-Math.exp(-MOTION.chestRate*stepDt));
        if(turnAge>MOTION.turnDelay)yaw+=Math.sign(turnDelta)*Math.min(Math.abs(turnDelta),stepDt*TUNING.turnSpeed);
        const remaining=route.reduce((sum,p,i)=>sum+distance(i?route[i-1]:position,p),0);
        let wanted=route.length&&rawBlend===0&&turnAge>MOTION.turnDelay+variation.pause ? Math.min(TUNING.speed*variation.speed,Math.sqrt(2*MOTION.braking*remaining)):0;
        // Slow before curves: bound heading change per travelled metre, looking ahead through braking distance.
        let ahead=distance(position,route[0]||position),heading=targetYaw;
        for(let i=1;i<route.length && ahead<speed*speed/(2*MOTION.braking)+MOTION.cornerLookAhead;i++){
          const length=distance(route[i-1],route[i]),nextHeading=Math.atan2(route[i][0]-route[i-1][0],route[i][1]-route[i-1][1]);
          const curvature=Math.abs(angle(nextHeading-heading))/Math.max(length,.001);
          if(curvature>.001)wanted=Math.min(wanted,Math.sqrt((TUNING.turnSpeed*MOTION.curveSpeedFactor/curvature)**2+2*MOTION.braking*Math.max(0,ahead-MOTION.brakeBuffer)));
          ahead+=length;heading=nextHeading;
        }
        if(Math.abs(turnDelta)>MOTION.headingSlowAngle)wanted=0;
        const oldSpeed=speed,rate=wanted>speed?MOTION.acceleration:MOTION.braking;
        speed+=Math.sign(wanted-speed)*Math.min(Math.abs(wanted-speed),rate*stepDt);
        let move=Math.min(remaining,(oldSpeed+speed)*.5*stepDt);
        if(rawBlend>0)move=0;
        travel+=move;
        while(move>0&&route.length){const d=distance(position,route[0]);
          if(move>=d){position=[...route.shift()];move-=d;}
          else {position=position.map((v,i)=>v+(route[0][i]-v)*move/d);move=0;}
        }
        if(!route.length){speed=0;phase=name==="accompany"?"respond":"activity";}
        else phase=rawBlend>0?"rise":speed>MOTION.minSpeed?"walk":"prepare";
      }
      const moving=speed>MOTION.minSpeed;
      return {position:[...position],yaw,name,poseName,poseAge,phase,moving,blend,age:(now-began)/1000,time:now/1000,holdUntil:hold,
        speed,travel,gait:travel/MOTION.strideLength*Math.PI*2,variation:{...variation},headTurn,chestTurn,gazeYaw,pathYaw};
    }
    return { update, begin, interrupt:interact, snapshot:()=>({position:[...position],name,phase,route:route.map(p=>[...p]),holdUntil:hold}), dispose:end };
  }
  function pose(state,height=1.6,facing=1) {
    const bones={}, add=(n,v)=>bones[n]=v;const t=state.poseAge ?? state.age,s=Math.sin(state.gait??state.time*TUNING.strideHz*Math.PI*2);
    const activity=state.poseName || state.name;
    const walkWeight=Math.min(1,(state.speed??TUNING.speed)/TUNING.speed),amplitude=state.variation?.amplitude??1;
    let y=0,offset=[0,0],book=false;
    if(state.moving){
      for(const [side,sign] of [["left",1],["right",-1]]){
        add(side+"UpperLeg",{x:s*sign*TUNING.legSwing*facing});add(side+"LowerLeg",{x:Math.max(0,-s*sign)*TUNING.kneeSwing*facing});
        add(side+"UpperArm",{x:-Math.sin((state.gait||0)-MOTION.armLag)*sign*TUNING.armSwing*facing*amplitude,z:(side==="left"?-1:1)*TUNING.armRest*facing});}
      y=(1-Math.cos(2*(state.gait||0)))*.5*TUNING.walkBounce*walkWeight-MOTION.kneeClearance*ease(Math.min(1,(state.speed??TUNING.speed)/MOTION.footBlendSpeed));
      add("hips",{x:0,y:s*MOTION.hipTwist,z:s*MOTION.hipRoll,px:0,py:0});
      add("spine",{y:-s*MOTION.hipTwist,z:-s*MOTION.hipRoll});
      add("head",{x:0,y:0,z:-s*MOTION.hipRoll*MOTION.headCompensation});
    } else if(activity==="window"){
      add("leftUpperArm",{x:TUNING.windowArm*facing,z:TUNING.windowArmSide*facing});add("leftLowerArm",{y:TUNING.windowElbow*facing});
      add("head",{y:Math.sin(t*TUNING.windowHeadHz)*TUNING.windowHeadYaw+(TUNING.windowLookBackYaw*Math.sin(Math.PI*Math.max(0,(t%TUNING.lookBackPeriod-TUNING.windowLookBackAt)/(TUNING.lookBackPeriod-TUNING.windowLookBackAt)))**2),x:TUNING.windowHeadPitch*facing});
    } else if(activity==="books"){
      const reach=Math.max(0,1-t/TUNING.reachDuration);book=reach===0;
      add("rightUpperArm",{x:TUNING.readRightArm*facing,z:(TUNING.readRightSide-reach*TUNING.reachLift)*facing});add("rightLowerArm",{y:TUNING.readRightElbow*facing});
      add("leftUpperArm",{x:TUNING.readLeftArm*facing,z:TUNING.readLeftSide*facing});add("leftLowerArm",{y:TUNING.readLeftElbow*facing});add("head",{x:TUNING.readHeadPitch*facing});
      add("rightHand",{z:Math.sin(t*TUNING.pageHz)*TUNING.readTurn});
    } else if(activity==="rest"||activity==="desk"){
      y=-height*TUNING.sitLower;offset=activity==="rest"?[TUNING.restOffset,0]:[TUNING.deskOffset,0];
      for(const side of ["left","right"]){add(side+"UpperLeg",{x:TUNING.sitThigh*facing});add(side+"LowerLeg",{x:TUNING.sitKnee*facing});}
      add("hips",{y:0,z:Math.sin(t*TUNING.sitSwayHz)*TUNING.poseSway});
      add("leftUpperArm",{x:TUNING.sitLeftArm*facing,z:TUNING.sitLeftSide*facing});add("leftLowerArm",{y:TUNING.sitLeftElbow*facing});
      add("rightUpperArm",{x:TUNING.sitRightArm*facing,z:TUNING.sitRightSide*facing});add("rightLowerArm",{y:TUNING.sitRightElbow*facing});
      add("head",{x:TUNING.sitHeadPitch*facing,z:Math.sin(t*TUNING.sitHeadHz)*TUNING.poseSway});
      if(activity==="desk")add("rightHand",{z:Math.sin(t*TUNING.writeHz)*TUNING.writeWrist});
    } else if(activity==="stretch"){
      const rise=.5+.5*Math.sin(t*TUNING.stretchHz);add("leftUpperArm",{z:(-TUNING.armRest+rise*TUNING.stretchRaise)*facing});add("rightUpperArm",{z:(TUNING.armRest-rise*TUNING.stretchRaise)*facing});
      add("chest",{x:TUNING.stretchChest*rise*facing});
    } else if(activity==="yawn"){
      add("rightUpperArm",{x:TUNING.yawnArm*facing,z:TUNING.yawnSide*facing});add("rightLowerArm",{y:TUNING.yawnElbow*facing});add("head",{x:TUNING.yawnHead*facing});
    } else if(activity==="hum"){add("hips",{y:0,z:Math.sin(t*TUNING.humHz)*TUNING.humHip});add("head",{z:Math.sin(t*TUNING.humHz+TUNING.humPhase)*TUNING.humHead});}
    const hands={};
    if(!state.moving && CONTACT[activity]){
      CONTACT[activity].forEach((p,i)=>{const side=activity==="yawn"?"right":i===0?"left":"right";
        hands[side]=[p[0],activity==="window"?p[1]:activity==="desk"&&i===1?p[1]-y:p[1]*height,p[2]];
        if(activity==="books" && side==="right"){
          const reach=Math.max(0,1-t/TUNING.reachDuration);
          hands[side][1]+=(height*TUNING.reachHeight-hands[side][1])*reach;
          hands[side][2]+=(TUNING.reachDistance-hands[side][2])*reach;
        }
      });
    }
    return { bones, hands, turnHead:state.headTurn||0,turnChest:state.chestTurn||0,prepare:state.phase==="prepare"?MOTION.preparationLean*Math.sin(Math.min(1,state.age/(MOTION.turnDelay+MOTION.pauseMax))*Math.PI):0, y:y*(state.moving?1:state.blend),offset:offset.map(v=>v*state.blend),book,
      weight:state.moving?walkWeight:state.blend };
  }
  const api={MOTION,ease,angle,smoothPath,TUNING,CONTACT,POINTS,OBSTACLES,LIMITS,free,clear,path,create,pose,distance};root.XinyuVRMWorld=api;
  if(typeof module!=="undefined"&&module.exports)module.exports=api;
})(typeof window!=="undefined"?window:globalThis);
