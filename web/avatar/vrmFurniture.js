(function(root){
  "use strict";
  const COLORS=Object.freeze({sofa:0xb7a0ba,rug:0xd8cbdf,wood:0x877386,other:0xc6a8c8,softMix:.94,woodMix:.68,otherMix:.25});
  function tintFor(id){return /^sofa/.test(id)?[COLORS.sofa,COLORS.softMix]:/^rug/.test(id)?[COLORS.rug,COLORS.softMix]:/^(shelf|desk|chair|picture)/.test(id)?[COLORS.wood,COLORS.woodMix]:[COLORS.other,COLORS.otherMix];}
  const BASE="/vendor/scenes/kaykit-furniture/";
  const ITEMS=Object.freeze([
    ...Array.from({length:4},(_,i)=>({id:"shelf"+i,file:"shelf_B_large_decorated",p:[1.45,i*.45,-2.65],size:[1.05,.43,.28]})),
    {id:"lamp",file:"lamp_standing",p:[-2.35,0,-2.18],size:[.35,1.5,.35]},
    {id:"plant0",file:"cactus_medium_A",p:[-2.55,0,-2.65],size:[.28,.45,.28]},
    {id:"plant1",file:"cactus_medium_A",p:[2.12,.74,-.32],size:[.22,.35,.22]},
    {id:"rug",file:"rug_oval_A",p:[0,.005,0],size:[1.8,.025,1.2]},
    {id:"cushion",file:"pillow_A",p:[-2.13,.31,.2],size:[.4,.16,.35]},
    {id:"desk",file:"table_medium",p:[1.82,0,-.15],size:[1.15,.74,.65]},
    {id:"chair",file:"chair_A",p:[.98,0,.15],size:[.5,.86,.5],yaw:Math.PI/2},
    {id:"sofa",file:"couch",p:[-2.13,0,-.3],size:[1.7,.76,.85],yaw:Math.PI/2},
    {id:"picture0",file:"pictureframe_medium",p:[.25,1.92,-2.94],size:[.42,.34,.035]},
    {id:"picture1",file:"pictureframe_small_A",p:[.78,2.05,-2.94],size:[.25,.28,.035]}
  ]);
  const FILES=new Set([...ITEMS.flatMap(i=>[i.file+".gltf",i.file+".bin"]),"furniturebits_texture.png"]);
  function localURL(value,origin){const u=new URL(value,origin);
    if(u.origin!==new URL(origin).origin||u.search||u.hash||!u.pathname.startsWith(BASE)||!FILES.has(u.pathname.slice(BASE.length)))throw new Error("Scene resource outside local allowlist");
    return u.href;
  }
  function merge(T, geometries){const result=new T.BufferGeometry();
    for(const key of ["position","normal","uv","roomTint"]){const size=key==="uv"?2:key==="roomTint"?4:3,total=geometries.reduce((s,g)=>s+g.attributes.position.count,0),values=new Float32Array(total*size);let offset=0;
      for(const g of geometries){const attr=g.getAttribute(key);if(attr)values.set(attr.array,offset);offset+=g.attributes.position.count*size;}
      result.setAttribute(key,new T.BufferAttribute(values,size));}return result;
  }
  async function load({vendor,scene,ramp,alive=()=>true,fetchModel,items=ITEMS}){
    const T=vendor.THREE, pieces=[], originals=new Set(),textures=new Set();let atlas=null,merged=null,material=null;
    const disposeOriginal=()=>{for(const r of originals)r.dispose?.();for(const t of textures)if(t!==atlas)t.dispose();originals.clear();textures.clear();};
    try{
      const manager=new T.LoadingManager();manager.setURLModifier(url=>localURL(url,root.location?.origin||"http://localhost"));
      const loader=new vendor.GLTFLoader(manager);
      // Sequential loading shares one atlas material and bounds transient memory; fallback stays visible throughout.
      for(const item of items){
        const gltf=await (fetchModel?fetchModel(item):loader.loadAsync(BASE+item.file+".gltf"));
        const model=gltf.scene;model.updateMatrixWorld(true);
        model.traverse(n=>{if(n.geometry)originals.add(n.geometry);for(const m of [].concat(n.material||[])){originals.add(m);for(const v of Object.values(m))if(v?.isTexture)textures.add(v);if(!atlas&&m.map)atlas=m.map;}});
        if(!alive())throw new Error("Disposed scene");
        const bounds=new T.Box3().setFromObject(model),size=bounds.getSize(new T.Vector3()),center=bounds.getCenter(new T.Vector3());
        const scale=new T.Matrix4().makeScale(...item.size.map((v,i)=>v/Math.max([size.x,size.y,size.z][i],.001)));
        const normalize=new T.Matrix4().makeTranslation(-center.x,-bounds.min.y,-center.z);
        const placement=new T.Matrix4().makeTranslation(...item.p).multiply(new T.Matrix4().makeRotationY(item.yaw||0)).multiply(scale).multiply(normalize);
        model.traverse(n=>{if(!n.isMesh)return;const g=n.geometry.index?n.geometry.toNonIndexed():n.geometry.clone();g.applyMatrix4(new T.Matrix4().multiplyMatrices(placement,n.matrixWorld));const [hex,mix]=tintFor(item.id),color=new T.Color(hex),tints=new Float32Array(g.attributes.position.count*4);
          for(let i=0;i<g.attributes.position.count;i++)tints.set([color.r,color.g,color.b,mix],i*4);
          g.setAttribute("roomTint",new T.BufferAttribute(tints,4));pieces.push(g);});
      }
      merged=merge(T,pieces);material=new T.MeshToonMaterial({map:atlas,color:0xffffff,gradientMap:ramp || null});
      material.onBeforeCompile=shader=>{
        shader.vertexShader="attribute vec4 roomTint; varying vec4 vRoomTint;\n"+shader.vertexShader.replace("#include <begin_vertex>","#include <begin_vertex>\nvRoomTint=roomTint;");
        shader.fragmentShader="varying vec4 vRoomTint;\n"+shader.fragmentShader.replace("#include <map_fragment>","#include <map_fragment>\ndiffuseColor.rgb=mix(diffuseColor.rgb,vRoomTint.rgb*(0.35+dot(diffuseColor.rgb,vec3(0.2126,0.7152,0.0722))*0.9),vRoomTint.a);");
      };
      material.customProgramCacheKey=()=>"kaykit-room-palette-v1";
      const mesh=new T.Mesh(merged,material);scene.add(mesh);disposeOriginal();
      let disposed=false;return {mesh,dispose(){if(disposed)return;disposed=true;scene.remove(mesh);merged.dispose();material.dispose();atlas?.dispose();}};
    }catch(_){disposeOriginal();atlas?.dispose();merged?.dispose();material?.dispose();return null;}
    finally{for(const g of pieces)g.dispose();}
  }
  const api={COLORS,tintFor,BASE,ITEMS,FILES,localURL,load};root.XinyuVRMFurniture=api;
  if(typeof module!=="undefined"&&module.exports)module.exports=api;
})(typeof window!=="undefined"?window:globalThis);
