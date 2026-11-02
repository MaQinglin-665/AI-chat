(function(root){
  'use strict';
  const SETTINGS=Object.freeze({fade:.35,minHold:15,maxHold:45,maxBytes:32*1024*1024,stride:.58,referenceLeg:.74,seatTransition:.7,maxLoop:8});
  const BUILTIN='/assets/animations/quaternius-standard.gltf';
  const POOLS=Object.freeze({idle:['Idle_Loop','Idle_Talking_Loop'],walk:['Walk_Loop','Walk_Formal_Loop'],
    sit:['Sitting_Idle_Loop','Sitting_Talking_Loop'],enter:['Sitting_Enter'],exit:['Sitting_Exit'],
    window:['Idle_Loop','Idle_Talking_Loop'],books:['Idle_Loop','Interact','Idle_Talking_Loop'],
    rest:['Sitting_Idle_Loop','Sitting_Talking_Loop'],desk:['Sitting_Idle_Loop','Sitting_Talking_Loop'],
    stretch:['Idle_Loop','Idle_Talking_Loop'],yawn:['Idle_Loop','Idle_Talking_Loop'],hum:['Idle_Loop','Idle_Talking_Loop']});
  const ALIASES={pelvis:'hips',Hips:'hips',spine_01:'spine',Spine:'spine',spine_02:'chest',Spine1:'chest',spine_03:'upperChest',Spine2:'upperChest',neck_01:'neck',Neck:'neck',Head:'head'};
  for(const [suffix,side,mix] of [['_l','left','Left'],['_r','right','Right']])for(const [q,m,v] of [
    ['clavicle','Shoulder','Shoulder'],['upperarm','Arm','UpperArm'],['lowerarm','ForeArm','LowerArm'],['hand','Hand','Hand'],
    ['thigh','UpLeg','UpperLeg'],['calf','Leg','LowerLeg'],['foot','Foot','Foot'],['ball','ToeBase','Toes']]){
    ALIASES[q+suffix]=side+v;ALIASES[mix+m]=side+v;
  }
  function boneName(name){return ALIASES[name.replace(/^mixamorig:?/,'')]||null;}
  function prepareLoop(clip,T,force=false){
    const copy=clip.clone();
    // Authored loops: blend the last 150ms to the first sample, with quaternion
    // shortest-arc interpolation. One-shot enter/exit clips retain their endpoints.
    if(!force&&!/Loop/i.test(copy.name))return copy;
    if(copy.duration>SETTINGS.maxLoop){copy.trim();for(const t of copy.tracks)t.trim(0,SETTINGS.maxLoop);copy.duration=SETTINGS.maxLoop;}
    for(const track of copy.tracks){
      if(!track.name.endsWith('.quaternion'))continue;
      const first=new T.Quaternion().fromArray(track.values,0),q=new T.Quaternion();
      for(let i=0;i<track.times.length;i++){
        const w=Math.max(0,(track.times[i]-(copy.duration-.15))/.15);
        if(w>0)q.fromArray(track.values,i*4).slerp(first,Math.min(1,w*w*(3-2*w))).normalize().toArray(track.values,i*4);
      }
    }
    return copy;
  }
  function releaseAsset(asset){
    const disposed=new Set();asset?.traverse(n=>{
      n.geometry?.dispose();for(const m of [].concat(n.material||[])){
        for(const value of Object.values(m))if(value?.isTexture&&!disposed.has(value)){disposed.add(value);value.dispose();}
        if(!disposed.has(m)){disposed.add(m);m.dispose();}
      }
    });
  }
  function retarget(clip,asset,vrm,T){
    asset.updateMatrixWorld(true);
    const tracks=[];
    for(const track of clip.tracks){
      const split=track.name.lastIndexOf('.'),raw=track.name.slice(0,split),property=track.name.slice(split+1);
      const name=boneName(raw),source=asset.getObjectByName(raw),target=name&&vrm.humanoid.getNormalizedBoneNode(name);
      if(!source||!target||property!=='quaternion')continue;
      const inverse=source.getWorldQuaternion(new T.Quaternion()).invert();
      const parent=source.parent.getWorldQuaternion(new T.Quaternion());
      const values=track.values.slice(),q=new T.Quaternion();
      for(let i=0;i<values.length;i+=4){q.fromArray(values,i).premultiply(parent).multiply(inverse).normalize();
        if(vrm.meta?.metaVersion==='0'){q.x=-q.x;q.z=-q.z;}q.toArray(values,i);}
      tracks.push(new T.QuaternionKeyframeTrack(target.name+'.quaternion',track.times.slice(),values));
    }
    if(!tracks.some(t=>t.name===vrm.humanoid.getNormalizedBoneNode('hips')?.name+'.quaternion'))throw Error('Animation lacks mapped hips');
    return prepareLoop(new T.AnimationClip(clip.name,clip.duration,tracks),T);
  }
  async function load(url,{vendor,vrm,fetch:fetcher=root.authFetch||root.fetch}){
    if(url!==BUILTIN&&!/^\/api\/avatar\/motions\/[a-zA-Z0-9_-]+\.(fbx|vrma|glb|gltf)$/.test(url))throw Error('Non-local animation URL');
    const response=await fetcher(url);if(!response.ok)throw Error('Animation unavailable');
    const data=await response.arrayBuffer();if(data.byteLength>SETTINGS.maxBytes)throw Error('Animation too large');
    const T=vendor.THREE,manager=new T.LoadingManager();
    manager.setURLModifier(u=>{if(u.startsWith('data:'))return u;throw Error('External animation resources are not allowed');});
    let asset;
    if(url.endsWith('.fbx')){asset=new vendor.FBXLoader(manager).parse(data,'');try{return asset.animations.map(c=>retarget(c,asset,vrm,T));}finally{releaseAsset(asset);}}
    const loader=new vendor.GLTFLoader(manager);
    if(url.endsWith('.vrma'))loader.register(parser=>new vendor.VRMAnimationLoaderPlugin(parser));
    const gltf=await loader.parseAsync(data,'');
    try{if(url.endsWith('.vrma'))return (gltf.userData.vrmAnimations||[]).map((a,i)=>{
      const c=vendor.createVRMAnimationClip(a,vrm);c.name='local-'+i;
      // Mouth/face and root translation stay owned by speech and the room solver.
      c.tracks=c.tracks.filter(t=>t.name.endsWith('.quaternion')&&vrm.humanoid.normalizedHumanBones&&Object.values(vrm.humanoid.normalizedHumanBones).some(b=>t.name===b.node.name+'.quaternion'));
      return c;
    });
    return gltf.animations.map(c=>retarget(c,gltf.scene,vrm,T));
    }finally{for(const scene of gltf.scenes||[gltf.scene])releaseAsset(scene);}
  }
  function create({vendor,vrm,random,fetch:fetcher}){
    const T=vendor.THREE,mixer=new T.AnimationMixer(vrm.scene),library=new Map(),local=new Map(),authored=new Map(),targets=new Map();
    let x=91347;const draw=random||(()=>((x=(Math.imul(x,1664525)+1013904223)>>>0)/4294967296));
    let disposed=false,current=null,previous=null,mode='',next=0,fadeEnd=0,now=0,last=null,failures=0;
    async function initialize(){
      try{for(const c of await load(BUILTIN,{vendor,vrm,fetch:fetcher}))if(!disposed)library.set(c.name,c);}catch(_){failures++;}
      try{const r=await fetcher('/api/avatar/motions');if(!r.ok)return;
        const catalog=await r.json();for(const item of (catalog.clips||[]).slice(0,64)){
          if(disposed)return;if(!POOLS[item.activity])continue;
          try{const clips=await load(item.url,{vendor,vrm,fetch:fetcher});if(disposed)return;
            for(const [i,original] of clips.entries()){
              if(!original.tracks.length||!Number.isFinite(original.duration)||original.duration<=0)continue;
              const c=prepareLoop(original,T,!['enter','exit'].includes(item.activity));
              const name=item.url+'#'+i;c.name=name;library.set(name,c);local.set(item.activity,[...(local.get(item.activity)||[]),name]);
            }
          }catch(_){failures++;}
        }
      }catch(_){/* Missing local library uses bundled clips. */}
    }
    function choose(frame){const w=frame.worldState;
      if(w?.moving)return 'walk';
      if(w?.phase==='rise'||(w?.blend>0&&w?.poseEnabled===false&&['rest','desk'].includes(w?.poseName)))return 'exit';
      if(w?.poseEnabled!==false&&['rest','desk'].includes(w?.poseName||w?.name))return w.blend<.95?'enter':w.poseName||w.name;
      return w?.poseEnabled!==false&&w?.phase==='activity'&&POOLS[w.name]?w.name:'idle';
    }
    function update(frame,delta){
      if(disposed)return;now=frame.now/1000;const wanted=choose(frame);
      if(wanted!==mode||now>=next){
        let pool=(local.get(wanted)||POOLS[wanted]||POOLS.idle).filter(n=>library.has(n));
        if(!pool.length)pool=POOLS.idle.filter(n=>library.has(n));
        const options=pool.filter(n=>n!==current?.getClip().name),available=options.length?options:pool;
        const clip=library.get(available[Math.floor(draw()*available.length)]);
        if(clip&&current?.getClip()!==clip){
          if(previous)previous.stop();previous=current;current=mixer.clipAction(clip);
          current.reset().setEffectiveTimeScale(1).setEffectiveWeight(1).play();
          const once=['enter','exit'].includes(wanted)&&(local.get(wanted)||POOLS[wanted]).includes(clip.name);
          current.setLoop(once?T.LoopOnce:T.LoopRepeat,once?1:Infinity);current.clampWhenFinished=once;
          if(once)current.setEffectiveTimeScale(clip.duration/SETTINGS.seatTransition);
          if(previous&&previous!==current)current.crossFadeFrom(previous,SETTINGS.fade,false);else current.fadeIn(SETTINGS.fade);
          if(previous===current)previous=null;
          fadeEnd=now+SETTINGS.fade;
        }
        mode=wanted;next=now+SETTINGS.minHold+draw()*(SETTINGS.maxHold-SETTINGS.minHold);
      }
      // Match one authored walking cycle to the existing distance-based foot solver.
      if(mode==='walk'&&current)current.setEffectiveTimeScale(Math.max(.01,(frame.worldState?.speed||0)*current.getClip().duration/(frame.walkStride||SETTINGS.stride)));
      // PropertyMixer skips unchanged samples. Restore its previous authored
      // output first, otherwise the preceding procedural writes replace static
      // tracks and the additive layer gets applied twice.
      for(const [node,q] of authored)node.quaternion.copy(q);
      mixer.update(delta);
      for(const action of [current,previous])for(const track of action?.getClip().tracks||[]){
        if(!targets.has(track.name))targets.set(track.name,vrm.scene.getObjectByName(track.name.slice(0,-'.quaternion'.length)));
        const node=targets.get(track.name);
        if(node){if(!authored.has(node))authored.set(node,node.quaternion.clone());else authored.get(node).copy(node.quaternion);}
      }
      if(previous&&now>=fadeEnd){
        previous.stop();previous=null;
        const owned=new Set(current.getClip().tracks.map(t=>targets.get(t.name)));
        for(const node of authored.keys())if(!owned.has(node))authored.delete(node);
      }
      last=now;
    }
    return {ready:initialize(),update,active:()=>!disposed&&(!!current||now<fadeEnd),
      metrics:()=>({clip:current?.getClip().name||null,mode,clips:library.size,failures,fade:!!previous,next}),
      dispose(){disposed=true;mixer.stopAllAction();mixer.uncacheRoot(vrm.scene);library.clear();local.clear();authored.clear();targets.clear();current=previous=null;}};
  }
  const api={SETTINGS,BUILTIN,POOLS,boneName,retarget,prepareLoop,load,create};root.XinyuVRMAnimationClips=api;
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
