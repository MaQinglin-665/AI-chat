(function(root){
  "use strict";
  const BASE='/vendor/scenes/hand-painted-room/';
  // Original horizontal surfaces: floor 20.46, desk 73.63, sofa cushion 46.9 (source units).
  const SCALE=.014, FLOOR=20.46;
  const STYLE=Object.freeze({night:0x9aa3c5,day:0xfff3de,windowNight:0x566eab,windowDay:0xd9efff});
  const NAMES=['Book','Carpet','CupBoard','Fancyy2','Ground','Ivy_Rope','Light','material','Picture','Radio','Raf_01','Seat','Stand','Table_02','Vazo'];
  const FILES=new Set(['scene.gltf','scene.bin',...NAMES.map(n=>'textures/'+n+'_baseColor.'+(['Light','Stand'].includes(n)?'png':'jpeg'))]);
  const EXTRAS=[
    {id:'chair',file:'chair_A',p:[0,0,1.36],size:[.50,.86,.50],yaw:0}
  ];
  function layout(){return {
    bounds:{min:[-2,0,-2.52],max:[1.55,3.4,2.52]},limits:{minX:-1.70,maxX:1.30,minZ:-1.72,maxZ:1.72},
    activityPoints:{accompany:[0,0],window:[1.05,-1.50],books:[-.78,.1],rest:[0,-.64],desk:[.65,1.10],stretch:[0,0],yawn:[0,0],hum:[0,0]},
    obstacles:[{id:'sofa',x:0,z:-1.45,w:1.53,d:.92},{id:'cabinet',x:-1.64,z:.07,w:.62,d:2.46},
      {id:'plant',x:-1.57,z:-1.60,w:.69,d:.68},{id:'desk',x:0,z:1.70,w:1.44,d:.43},
      {id:'chair',x:0,z:1.36,w:.50,d:.50},{id:'stool',x:-1.58,z:1.65,w:.55,d:.55}],
    seats:{rest:{hip:[0,-1.48],yaw:0,surface:(46.9-FLOOR)*SCALE},desk:{hip:[0,1.36],yaw:0,surface:.342,table:(73.63-FLOOR)*SCALE}},
    cameras:{window:{offset:[-2.1,.5,2.6],height:.66,yaw:-2.0},books:{offset:[-.4,.5,3.7],height:.66,yaw:-1.15},
      rest:{offset:[.8,.60,3.8],height:.60,yaw:0},desk:{offset:[3,.65,2.6],height:.60,yaw:0},idle:{offset:[1.3,.45,3.5],height:.66,yaw:0}},
    models:EXTRAS,lights:{sun:[0,2.4,-2.55],lamps:[[0,2.5,0],[-1.55,1.4,-1.6],[1.28,1.2,0]]}
  };}
  function localURL(value,origin){const u=new URL(value,origin);if(u.origin!==new URL(origin).origin||u.search||u.hash||!u.pathname.startsWith(BASE)||!FILES.has(u.pathname.slice(BASE.length)))throw Error('Room resource outside local allowlist');return u.href;}
  // Cutaway removes front/right shell and ceiling; central coffee table and its props are removed for a walkable aisle.
  // Work on cloned, world-transformed geometry only. Original binary/texture files are preserved.
  function keepTriangle(name,x,y,z){
    if(name==='Windows' && z>0)return false;
    if(name==='Picture' && (z>1.72||x>1.42))return false;
    if(['Desk_02','Sheep','Vazoo2','Boook2'].includes(name) && x>-.65&&x<1.12&&z>-.70&&z<1.15)return false;
    return true;
  }
  function clip(poly,axis,limit){
    const out=[];for(let i=0;i<poly.length;i++){const a=poly[i],b=poly[(i+1)%poly.length],inside=a[axis]<=limit,next=b[axis]<=limit;
      if(inside)out.push(a);if(inside!==next){const t=(limit-a[axis])/(b[axis]-a[axis]);out.push(a.map((v,k)=>v+(b[k]-v)*t));}}
    return out;
  }
  function cutGeometry(T,g,name){
    const p=g.attributes.position,n=g.attributes.normal,uv=g.attributes.uv,values=[];
    for(let i=0;i<p.count;i+=3){let poly=[0,1,2].map(j=>[p.getX(i+j),p.getY(i+j),p.getZ(i+j),n.getX(i+j),n.getY(i+j),n.getZ(i+j),uv.getX(i+j),uv.getY(i+j)]);
      const center=[0,1,2].map(k=>poly.reduce((v,a)=>v+a[k]/3,0));if(!keepTriangle(name,...center))continue;
      if(name==='Ground' && center[1]>.06){
        const a=new T.Vector3(...poly[1]).sub(new T.Vector3(...poly[0])),b=new T.Vector3(...poly[2]).sub(new T.Vector3(...poly[0]));
        if(center[1]>1.8 && Math.abs(a.cross(b).normalize().y)>.15)continue;
        for(const [axis,limit] of [[0,1.42],[1,2.75],[2,1.72]])poly=clip(poly,axis,limit);
      }
      for(let j=1;j<poly.length-1;j++)values.push(poly[0],poly[j],poly[j+1]);
    }
    const result=new T.BufferGeometry();for(const [name,offset,size] of [['position',0,3],['normal',3,3],['uv',6,2]])result.setAttribute(name,new T.Float32BufferAttribute(values.flatMap(v=>v.slice(offset,offset+size)),size));return result;
  }
  async function load({vendor,scene,alive=()=>true,fetchModel}){
    const T=vendor.THREE,resources=new Set(),group=new T.Group(),materials=[],glows=[];let extras=null;
    const own=r=>{resources.add(r);return r;};
    const dispose=()=>{scene.remove(group);extras?.dispose();for(const r of resources)r.dispose?.();resources.clear();group.clear();};
    try{
      const manager=new T.LoadingManager();manager.setURLModifier(url=>localURL(url,root.location?.origin||'http://localhost'));
      const gltf=await(fetchModel?fetchModel():new vendor.GLTFLoader(manager).loadAsync(BASE+'scene.gltf'));
      gltf.scene.updateMatrixWorld(true);
      gltf.scene.traverse(n=>{if(n.geometry)own(n.geometry);for(const m of [].concat(n.material||[])){own(m);for(const v of Object.values(m))if(v?.isTexture)own(v);}});
      if(!alive()){dispose();return null;}
      const transform=new T.Matrix4().makeTranslation(0,-FLOOR*SCALE,0).multiply(new T.Matrix4().makeScale(SCALE,SCALE,SCALE));
      gltf.scene.traverse(n=>{if(!n.isMesh)return;const name=n.parent.name,g=own(n.geometry.index?n.geometry.toNonIndexed():n.geometry.clone());g.applyMatrix4(new T.Matrix4().multiplyMatrices(transform,n.matrixWorld));
        const cut=own(cutGeometry(T,g,name));
        const m=own(new T.MeshBasicMaterial({map:n.material.map,side:T.DoubleSide,transparent:n.material.transparent,alphaTest:n.material.alphaTest||0}));materials.push({m,window:name==='Windows'});
        const mesh=new T.Mesh(cut,m);mesh.name='handpainted-'+name;mesh.userData.bloomSource=['Windows','Cable'].includes(name);if(mesh.userData.bloomSource)glows.push(mesh);group.add(mesh);
      });
      extras=await root.XinyuVRMFurniture?.load({vendor,scene:group,items:EXTRAS,alive});
      if(!alive() || !extras){dispose();return null;}
      scene.add(group);
      return {group,glows,layout:layout(),update(day){for(const {m,window:w} of materials)m.color.setHex(w?STYLE.windowNight:STYLE.night).lerp(new T.Color(w?STYLE.windowDay:STYLE.day),day);},dispose};
    }catch(_){dispose();return null;}
  }
  const api={BASE,FILES,SCALE,FLOOR,STYLE,EXTRAS,layout,localURL,keepTriangle,clip,cutGeometry,load};root.XinyuVRMHandpainted=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
