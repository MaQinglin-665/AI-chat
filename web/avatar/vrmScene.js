(function (root) {
  "use strict";
  // All positions and sizes are metres, independent of the avatar's height.
  // Bounds include the outdoor alcove; the interior back wall is at z=-3.
  const ROOM = Object.freeze({ min: [-3, -0.06, -8.1], max: [3, 3, 2], transitionMs: 2500,
    seed: 216, fogNear: 1, fogFar: 14, shadowSize: [0.65, 0.38], saturation: 0.80 });
  const FURNITURE = Object.freeze({
    window: { position: [-1.35, 1.6, -3], size: [1.2, 1.4, 0.12], sill: 0.9 },
    shelf: { position: [1.45, 0.9, -2.65], size: [1.05, 1.8, 0.32] },
    lamp: { position: [-2.35, 0.75, -2.18], size: [0.35, 1.5, 0.35] },
    rug: { position: [0, 0.014, -0.1], size: [1.8, 0.025, 1.2] },
    cushion: { position: [-2.13, .48, .2], size: [0.45, 0.2, 0.4] }
  });
  const PALETTE = Object.freeze({ wall: 0xc5bccd, floor: 0xb8a79e, wood: 0xa58e99,
    trim: 0xe5d5da, curtain: 0xb9a2c2, rug: 0xb9a8c0, leaf: 0x8ba592, pot: 0xd5b3b9 });
  const LIGHTS = Object.freeze({
    night: { ambient: 0.38, ambientColor: 0x8c7bb8, sun: 0.8, sunColor: 0xabbfff, warm: 0.10, fog: 0x665c7c },
    day: { ambient: 1.3, ambientColor: 0xfff0dd, sun: 2.1, sunColor: 0xffe4b9, warm: 0, fog: 0xded2c7 }
  });
  function random(seed) { let x = seed >>> 0; return () => { x = (Math.imul(x, 1664525) + 1013904223) >>> 0; return x / 4294967296; }; }
  function enabled(view, scene) { return view === "full" && scene !== "none"; }
  function layout(seed = ROOM.seed) {
    const items = [], rand = random(seed);
    const add = (id, shape, position, size, color, extra = {}) => items.push({ id, shape, position, size, color, ...extra });
    // Structural panels have square seams so sky cannot leak between rounded corners.
    const box = (id, p, s, c, extra) => add(id, /^(wall|floor|ceiling|skirting)/.test(id) ? "panel" : "box", p, s, c, extra);
    box("floor", [0, -0.025, -0.5], [6, 0.05, 5], PALETTE.floor);
    box("wall-left", [-2.975, 1.35, -0.5], [0.05, 2.7, 5], PALETTE.wall);
    box("wall-back-right", [1.125, 1.35, -3], [3.75, 2.7, 0.06], PALETTE.wall);
    box("wall-back-left", [-2.475, 1.35, -3], [1.05, 2.7, 0.06], PALETTE.wall);
    box("wall-below-window", [-1.35, 0.45, -3], [1.2, 0.9, 0.06], PALETTE.wall);
    box("wall-above-window", [-1.35, 2.5, -3], [1.2, 0.4, 0.06], PALETTE.wall);
    box("ceiling-edge", [0, 2.65, -2.85], [5.9, 0.08, 0.3], PALETTE.trim);
    box("ceiling", [0, 2.74, -0.5], [6, 0.08, 5], PALETTE.trim);
    box("skirting", [0, 0.06, -2.94], [5.9, 0.12, 0.04], PALETTE.trim);
    add("rug", "sphere", FURNITURE.rug.position, FURNITURE.rug.size, PALETTE.rug);
    const [wx, wy, wz] = FURNITURE.window.position;
    const [ww, wh] = FURNITURE.window.size;
    for (const x of [wx - ww / 2, wx + ww / 2]) box("window-side-" + x, [x, wy, wz + 0.06], [0.045, wh, 0.12], PALETTE.trim);
    for (const y of [wy - wh / 2, wy + wh / 2]) box("window-rail-" + y, [wx, y, wz + 0.06], [ww + 0.045, 0.045, 0.12], PALETTE.trim);
    box("window-mullion", [wx, wy, wz + 0.08], [0.025, wh, 0.07], PALETTE.trim);
    box("window-crossbar", [wx, wy, wz + 0.08], [ww, 0.025, 0.07], PALETTE.trim);
    box("window-sill", [wx, FURNITURE.window.sill - 0.025, wz + 0.14], [1.3, 0.05, 0.28], PALETTE.trim);
    box("curtain-rod", [wx, 2.4, -2.75], [1.6, 0.025, 0.025], PALETTE.wood);
    for (const side of [-1, 1]) for (let i = 0; i < 4; i++) {
      add("curtain-" + side + "-" + i, "cylinder", [wx + side * (0.61 + i * 0.04), 1.59, -2.77], [0.065, 1.56, 0.08], PALETTE.curtain);
    }
    for (const [i, x] of [-2.6, -1.9, -1.2].entries()) {
      add("tree-trunk-" + i, "cylinder", [x, 0.2, -6.5], [0.05, 0.4, 0.05], PALETTE.wood);
      for (let j = 0; j < 4; j++) add("blossom-" + i + "-" + j, "sphere",
        [x + (rand() - 0.5) * 0.23, 0.43 + rand() * 0.16, -6.5 + (rand() - 0.5) * 0.18],
        [0.5, 0.38, 0.45], 0xffb7cf, { blossom: true });
    }
    const [sx, sy, sz] = FURNITURE.shelf.position, [sw, sh, sd] = FURNITURE.shelf.size;
    for (const x of [sx - sw / 2 + 0.025, sx + sw / 2 - 0.025]) box("shelf-side-" + x, [x, sy, sz], [0.05, sh, sd], PALETTE.wood);
    box("shelf-back", [sx, sy, sz - sd / 2], [sw, sh, 0.025], 0x94838f);
    for (let row = 0; row < 4; row++) {
      const y = 0.08 + row * 0.42;
      box("shelf-" + row, [sx, y, sz], [sw, 0.04, sd], PALETTE.wood);
      box("strip-" + row, [sx, y + 0.38, sz + sd / 2 - 0.015], [0.94, 0.012, 0.018], 0xffd9a8, { glow: true });
      for (let i = 0; i < 11; i++) {
        const h = 0.2 + rand() * 0.08;
        box("book-" + row + "-" + i, [sx - 0.44 + i * 0.085, y + 0.02 + h / 2, sz + 0.02], [0.035 + rand() * 0.025, h, 0.18],
          [0xcc92ab, 0x8e9cba, 0xd5bb96, 0x9bb4a4, 0xad98c5][Math.floor(rand() * 5)]);
      }
    }
    box("shelf-top", [sx, sh - 0.02, sz], [sw, 0.04, sd], PALETTE.wood);
    const [lx, , lz] = FURNITURE.lamp.position;
    add("lamp-base", "cylinder", [lx, 0.025, lz], [0.28, 0.05, 0.28], PALETTE.wood);
    add("lamp-stem", "cylinder", [lx, 0.68, lz], [0.02, 1.31, 0.02], PALETTE.trim);
    add("lamp-shade", "shade", [lx, 1.37, lz], [0.35, 0.26, 0.35], 0xe7cebf);
    for (const [i, x, y, z] of [[0, -2.5, 0.12, -2.6], [1, 2.12, .86, -.32]]) {
      add("pot-" + i, "cylinder", [x, y, z], [0.2, 0.2, 0.2], PALETTE.pot);
      for (let j = 0; j < 5; j++) add("leaf-" + i + "-" + j, "sphere",
        [x + Math.sin(j * 2) * 0.08, y + 0.18 + rand() * 0.04, z + Math.cos(j * 2) * 0.07], [0.14, 0.24, 0.1], PALETTE.leaf);
    }
    add("cushion", "sphere", FURNITURE.cushion.position, FURNITURE.cushion.size, 0xc997bd);
    // Whole-object fallback remains visible until every selected local asset is ready.
    box("desk-top", [1.82,.71,-.15], [1.15,.06,.65], PALETTE.wood);
    for(const x of [1.32,2.32]) for(const z of [-.4,.1]) box("desk-leg-"+x+"-"+z,[x,.35,z],[.06,.7,.06],PALETTE.wood);
    box("chair-seat",[.98,.43,.15],[.5,.08,.5],PALETTE.wood);
    box("chair-back",[.76,.67,.15],[.06,.38,.5],PALETTE.wood);
    for(const x of [.79,1.17]) for(const z of [-.04,.34]) box("chair-leg-"+x+"-"+z,[x,.21,z],[.05,.42,.05],PALETTE.wood);
    box("sofa-seat",[-2.13,.27,-.3],[.85,.46,1.7],PALETTE.curtain);
    box("sofa-back",[-2.48,.58,-.3],[.15,.36,1.7],PALETTE.curtain);
    for(const z of [-1.08,.48]) box("sofa-arm-"+z,[-2.13,.56,z],[.85,.22,.14],PALETTE.curtain);
    box("picture0",[.25,2.09,-2.94],[.42,.34,.035],PALETTE.trim);
    box("picture1",[.78,2.19,-2.94],[.25,.28,.035],PALETTE.curtain);
    for(const item of items) item.furniture = /^(shelf|book|strip|lamp|pot|leaf|rug|cushion|desk|chair|sofa|picture)/.test(item.id);
    return { bounds: { min: [...ROOM.min], max: [...ROOM.max] }, items, models: root.XinyuVRMFurniture?.ITEMS || [], activityPoints: root.XinyuVRMWorld?.POINTS || {}, obstacles: root.XinyuVRMWorld?.OBSTACLES || [] };
  }
  function transition(initial = "night") {
    let value = initial === "day" ? 1 : 0, from = value, target = value, start = 0;
    return (period, now) => {
      const next = period === "day" ? 1 : 0;
      if (next !== target) { from = value; target = next; start = now; }
      const t = Math.max(0, Math.min(1, (now - start) / ROOM.transitionMs));
      value = from + (target - from) * t * t * (3 - 2 * t);
      return value;
    };
  }
  function create({ THREE: T, scene, floorY = 0, period = "night", seed = ROOM.seed, vendor, furnitureModule = root.XinyuVRMFurniture }) {
    const group = new T.Group(), resources = new Set();
    const own = value => { resources.add(value); return value; };
    group.position.y = floorY; scene.add(group);
    const ramp = own(new T.DataTexture(new Uint8Array([85, 85, 85, 255, 170, 170, 170, 255, 255, 255, 255, 255]), 3, 1));
    ramp.minFilter = ramp.magFilter = T.NearestFilter; ramp.needsUpdate = true;
    const toon = own(new T.MeshToonMaterial({ color: 0xffffff, gradientMap: ramp }));
    const blossoms = own(new T.MeshToonMaterial({ color: 0xffffff, gradientMap: ramp,
      emissive: 0xffb7cf, emissiveIntensity: 0.22, fog: false }));
    const glow = own(new T.MeshBasicMaterial({ color: 0xffd9a8 }));
    const rounded = own(new T.BoxGeometry(1, 1, 1, 3, 3, 3));
    const positions = rounded.attributes.position, v = new T.Vector3(), core = new T.Vector3();
    for (let i = 0; i < positions.count; i++) {
      v.fromBufferAttribute(positions, i); core.copy(v).clampScalar(-0.42, 0.42);
      v.sub(core).normalize().multiplyScalar(0.08).add(core); positions.setXYZ(i, v.x, v.y, v.z);
    }
    rounded.computeVertexNormals();
    const geometries = { box: rounded, panel: own(new T.BoxGeometry(1, 1, 1)), sphere: own(new T.IcosahedronGeometry(0.5, 1)),
      cylinder: own(new T.CylinderGeometry(0.5, 0.5, 1, 10)), shade: own(new T.CylinderGeometry(0.32, 0.5, 1, 12)) };
    const batches = new Map(), fallback = [];
    for (const item of layout(seed).items) {
      const key = (item.furniture ? "furniture-" : "") + item.shape + (item.glow ? "-glow" : item.blossom ? "-blossom" : "");
      if (!batches.has(key)) batches.set(key, []);
      batches.get(key).push(item);
    }
    const matrix = new T.Object3D();
    for (const items of batches.values()) {
      const mesh = new T.InstancedMesh(geometries[items[0].shape], items[0].glow ? glow : items[0].blossom ? blossoms : toon, items.length);
      items.forEach((item, index) => {
        matrix.position.set(...item.position); matrix.scale.set(...item.size); matrix.updateMatrix();
        const color = new T.Color(item.glow ? 0xffffff : item.color);
        if (!item.glow && !item.blossom) color.lerp(new T.Color().setScalar(color.r * 0.2126 + color.g * 0.7152 + color.b * 0.0722), 1 - ROOM.saturation);
        mesh.setMatrixAt(index, matrix.matrix); mesh.setColorAt(index, color);
      });
      if(items[0].furniture) fallback.push(mesh);
      mesh.instanceMatrix.needsUpdate = true; group.add(mesh); own(mesh);
    }
    const skyMaterial = own(new T.ShaderMaterial({ uniforms: { day: { value: period === "day" ? 1 : 0 } },
      vertexShader: "varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}",
      fragmentShader: `varying vec2 vUv; uniform float day;
        float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
        float cloud(vec2 p,vec2 c){vec2 d=(p-c)*vec2(1.,1.67);return 1.-smoothstep(.052,.060,length(d));}
        void main(){vec3 night=mix(vec3(.20,.12,.32),vec3(.035,.04,.13),vUv.y);
        vec3 blue=mix(vec3(.72,.77,.91),vec3(.26,.50,.78),vUv.y);
        vec2 grid=vUv*vec2(68.,42.);float h=hash(floor(grid));float radius=mix(.07,.22,hash(floor(grid)+17.));
        float star=step(.88,h)*(1.-smoothstep(radius*.3,radius,length(fract(grid)-.5)));
        float moon=1.-smoothstep(.054,.057,length((vUv-vec2(.19,.66))*vec2(1.67,1.)));
        float clouds=max(max(cloud(vUv,vec2(.10,.64)),cloud(vUv,vec2(.15,.66))),cloud(vUv,vec2(.19,.63)));
        clouds=max(clouds,max(cloud(vUv,vec2(.32,.78)),cloud(vUv,vec2(.37,.77))));
        blue=mix(blue,vec3(.96,.94,.91),clouds*.9);
        night=mix(night+star*.8,vec3(.95,.89,.73),moon);
        gl_FragColor=vec4(mix(night,blue,day),1.);
        #include <colorspace_fragment>
        }` }));
    const sky = new T.Mesh(own(new T.PlaneGeometry(5, 3)), skyMaterial);
    sky.position.set(-0.5, 1.5, -8); group.add(sky);
    // A simple window-shaped sunlight projection: no shadow map or external texture.
    const sunPatchMaterial = own(new T.MeshBasicMaterial({ color: 0xffe3a6, transparent: true, depthWrite: false, side: T.DoubleSide, opacity: 0 }));
    const patchGeometry = own(new T.BufferGeometry());
    patchGeometry.setAttribute("position", new T.Float32BufferAttribute([
      -1.45, 0.033, -2.1, -0.35, 0.033, -2.1, 0.55, 0.033, -0.45, -0.55, 0.033, -0.45
    ], 3));
    patchGeometry.setIndex([0, 1, 2, 0, 2, 3]); patchGeometry.computeVertexNormals();
    group.add(new T.Mesh(patchGeometry, sunPatchMaterial));
    const pixels = new Uint8Array(64 * 64 * 4);
    for (let y = 0; y < 64; y++) for (let x = 0; x < 64; x++) {
      const i = (y * 64 + x) * 4, radius = Math.hypot((x - 31.5) / 31.5, (y - 31.5) / 31.5);
      pixels[i] = 35; pixels[i + 1] = 23; pixels[i + 2] = 50;
      pixels[i + 3] = Math.round(Math.max(0, 1 - radius) ** 2 * 100);
    }
    const shadowMap = own(new T.DataTexture(pixels, 64, 64)); shadowMap.needsUpdate = true;
    const shadow = new T.Mesh(own(new T.PlaneGeometry(...ROOM.shadowSize)),
      own(new T.MeshBasicMaterial({ map: shadowMap, transparent: true, depthWrite: false })));
    shadow.rotation.x = -Math.PI / 2; shadow.position.y = 0.035; group.add(shadow);
    const ambient = new T.AmbientLight(); scene.add(ambient);
    const sun = new T.DirectionalLight(); sun.position.set(-1.35, floorY + 2.3, -3);
    sun.target.position.set(0, floorY + 0.6, 0); scene.add(sun, sun.target);
    const lamps = [[1.45, 1.3, -2.46], [1.45, 0.46, -2.46], [-2.35, 1.36, -2.18]].map(p => {
      const light = new T.PointLight(0xffd9a8, 0, 4, 2);
      light.position.set(p[0], floorY + p[1], p[2]); scene.add(light); return light;
    });
    const oldFog = scene.fog, oldBackground = scene.background;
    const fog = new T.Fog(LIGHTS.night.fog, ROOM.fogNear, ROOM.fogFar);
    scene.fog = fog; scene.background = new T.Color(LIGHTS.night.fog);
    const blend = transition(period), a = new T.Color(), b = new T.Color(); let disposed = false, day = 0;
    const color = (target, key, t) => target.copy(a.setHex(LIGHTS.night[key])).lerp(b.setHex(LIGHTS.day[key]), t);
    function update(nextPeriod, now, cameraZ = 2.5) {
      if (disposed) return;
      day = blend(nextPeriod, now); skyMaterial.uniforms.day.value = day;
      // Keep depth separation anchored to the avatar plane, including inspection pullbacks.
      fog.near = Math.max(0, cameraZ) + ROOM.fogNear; fog.far = Math.max(0, cameraZ) + ROOM.fogFar;
      const mix = key => LIGHTS.night[key] + (LIGHTS.day[key] - LIGHTS.night[key]) * day;
      ambient.intensity = mix("ambient"); color(ambient.color, "ambientColor", day);
      sun.intensity = mix("sun"); color(sun.color, "sunColor", day);
      lamps.forEach(l => { l.intensity = mix("warm"); });
      blossoms.emissiveIntensity = 0.22 - day * 0.12;
      sunPatchMaterial.opacity = day * 0.32;
      glow.color.setHex(0xffd9a8).multiplyScalar(1 - day * 0.65);
      color(fog.color, "fog", day); scene.background.copy(fog.color);
    }
    let furniture = null;
    const ready = vendor && furnitureModule ? furnitureModule.load({vendor,scene:group,ramp,alive:()=>!disposed}).then(result=>{
      if(disposed) { result?.dispose(); return false; }
      furniture=result; if(result) fallback.forEach(mesh=>{mesh.visible=false;}); return !!result;
    }) : Promise.resolve(false);
    update(period, 0);
    return { update, ready, setAvatarPosition(x,z) { shadow.position.x=x; shadow.position.z=z; }, metrics: () => ({ day, furnitureLoaded: !!furniture, batches: batches.size, resources: resources.size }), dispose() {
      if (disposed) return; disposed = true; furniture?.dispose();
      scene.remove(group, ambient, sun, sun.target, ...lamps); scene.fog = oldFog; scene.background = oldBackground;
      for (const resource of resources) resource.dispose?.(); resources.clear(); group.clear();
    } };
  }
  const api = { ROOM, FURNITURE, PALETTE, LIGHTS, layout, enabled, transition, create };
  root.XinyuVRMScene = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
