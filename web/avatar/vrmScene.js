(function (root) {
  "use strict";
  // Coordinates are fractions of avatar height. Each item can later acquire its own asset factory.
  const ROOM = Object.freeze({ min: [-1.6, -0.06, -1.6], max: [1.6, 1.8, 1], transitionMs: 2500,
    seed: 216, fogNear: 3, fogFar: 7, shadowSize: [0.48, 0.28] });
  const PALETTE = Object.freeze({ wall: 0x9182ad, floor: 0x998695, wood: 0x8c718b,
    trim: 0xd8b7ce, curtain: 0x9e79ab, rug: 0xb096ba, leaf: 0x81a598, pot: 0xd5a7b2 });
  const LIGHTS = Object.freeze({
    night: { ambient: 0.38, ambientColor: 0x8c7bb8, sun: 0.8, sunColor: 0xabbfff, warm: 0.035, fog: 0x453c61 },
    day: { ambient: 0.65, ambientColor: 0xd6cce9, sun: 1.5, sunColor: 0xffe6c5, warm: 0, fog: 0xc2b9d2 }
  });
  function random(seed) { let x = seed >>> 0; return () => { x = (Math.imul(x, 1664525) + 1013904223) >>> 0; return x / 4294967296; }; }
  function enabled(view, scene) { return view === "full" && scene !== "none"; }
  function layout(seed = ROOM.seed) {
    const items = [], rand = random(seed);
    const add = (id, shape, position, size, color, extra = {}) => items.push({ id, shape, position, size, color, ...extra });
    const box = (id, p, s, c, extra) => add(id, "box", p, s, c, extra);
    box("floor", [0, -0.025, -0.3], [3.2, 0.05, 2.6], PALETTE.floor);
    // Back wall has an actual window opening; the shallow outdoor alcove stays inside scene bounds.
    box("wall-left", [-1.575, 0.85, -0.3], [0.05, 1.7, 2.6], PALETTE.wall);
    box("wall-back-right", [0.72, 0.85, -0.72], [1.76, 1.7, 0.05], PALETTE.wall);
    box("wall-back-left", [-1.405, 0.85, -0.72], [0.39, 1.7, 0.05], PALETTE.wall);
    box("wall-below-window", [-0.685, 0.255, -0.72], [1.05, 0.51, 0.05], PALETTE.wall);
    box("wall-above-window", [-0.685, 1.57, -0.72], [1.05, 0.26, 0.05], PALETTE.wall);
    box("skirting", [0, 0.05, -0.67], [3.1, 0.06, 0.04], PALETTE.trim);
    add("rug", "sphere", [0.05, 0.017, 0.02], [1.55, 0.025, 0.85], PALETTE.rug);
    for (const x of [-1.21, -0.16]) box("window-side-" + x, [x, 0.98, -0.67], [0.045, 0.98, 0.08], PALETTE.trim);
    for (const y of [0.51, 1.44]) box("window-rail-" + y, [-0.685, y, -0.67], [1.12, 0.045, 0.08], PALETTE.trim);
    box("window-mullion", [-0.685, 0.98, -0.66], [0.025, 0.92, 0.07], PALETTE.trim);
    box("window-crossbar", [-0.685, 0.98, -0.66], [1.05, 0.025, 0.07], PALETTE.trim);
    box("window-sill", [-0.685, 0.49, -0.61], [1.17, 0.045, 0.22], PALETTE.trim);
    box("curtain-rod", [-0.685, 1.51, -0.53], [1.3, 0.025, 0.025], PALETTE.wood);
    for (const side of [-1, 1]) for (let i = 0; i < 4; i++) {
      add("curtain-" + side + "-" + i, "cylinder", [-0.685 + side * (0.48 + i * 0.035), 0.99, -0.54], [0.065, 0.96, 0.08], PALETTE.curtain);
    }
    for (const [i, x] of [-1.08, -0.6, -0.23].entries()) {
      add("tree-trunk-" + i, "cylinder", [x, 0.57, -1.15], [0.035, 0.58, 0.035], PALETTE.wood);
      for (let j = 0; j < 4; j++) add("blossom-" + i + "-" + j, "sphere",
        [x + (rand() - 0.5) * 0.19, 0.85 + rand() * 0.16, -1.15 + (rand() - 0.5) * 0.14],
        [0.3, 0.24, 0.23], [0xde9db9, 0xeeb8ca, 0xc88daf][j % 3]);
    }
    for (const x of [0.35, 1.22]) box("shelf-side-" + x, [x, 0.71, -0.5], [0.05, 1.42, 0.31], PALETTE.wood);
    box("shelf-back", [0.785, 0.71, -0.64], [0.87, 1.42, 0.025], 0x6f5a7c);
    for (let row = 0; row < 4; row++) {
      const y = 0.07 + row * 0.34;
      box("shelf-" + row, [0.785, y, -0.48], [0.92, 0.045, 0.36], PALETTE.wood);
      box("strip-" + row, [0.785, y + 0.307, -0.325], [0.79, 0.012, 0.018], 0xffd9a8, { glow: true });
      for (let i = 0; i < 11; i++) {
        const h = 0.17 + rand() * 0.09;
        box("book-" + row + "-" + i, [0.405 + i * 0.071, y + 0.026 + h / 2, -0.45], [0.043 + rand() * 0.018, h, 0.17],
          [0xcc92ab, 0x8e9cba, 0xd5bb96, 0x9bb4a4, 0xad98c5][Math.floor(rand() * 5)]);
      }
    }
    box("shelf-top", [0.785, 1.43, -0.48], [0.95, 0.05, 0.37], PALETTE.wood);
    add("lamp-base", "cylinder", [0.2, 0.03, -0.25], [0.22, 0.04, 0.22], PALETTE.wood);
    add("lamp-stem", "cylinder", [0.2, 0.5, -0.25], [0.018, 0.94, 0.018], PALETTE.trim);
    add("lamp-shade", "shade", [0.2, 1.01, -0.25], [0.3, 0.23, 0.3], 0xe7becb);
    for (const [i, x, y, z] of [[0, -1.22, 0.12, -0.24], [1, 1.1, 1.54, -0.48]]) {
      add("pot-" + i, "cylinder", [x, y, z], [0.14, 0.17, 0.14], PALETTE.pot);
      for (let j = 0; j < 5; j++) add("leaf-" + i + "-" + j, "sphere",
        [x + Math.sin(j * 2) * 0.06, y + 0.13 + rand() * 0.04, z + Math.cos(j * 2) * 0.05], [0.1, 0.17, 0.08], PALETTE.leaf);
    }
    add("cushion", "sphere", [0.82, 0.10, 0.17], [0.42, 0.18, 0.32], 0xc997bd);
    return { bounds: { min: [...ROOM.min], max: [...ROOM.max] }, items };
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
  function create({ THREE: T, scene, height = 1.6, floorY = 0, period = "night", seed = ROOM.seed }) {
    const group = new T.Group(), resources = new Set();
    const own = value => { resources.add(value); return value; };
    group.scale.setScalar(height); group.position.y = floorY; scene.add(group);
    const ramp = own(new T.DataTexture(new Uint8Array([85, 85, 85, 255, 170, 170, 170, 255, 255, 255, 255, 255]), 3, 1));
    ramp.minFilter = ramp.magFilter = T.NearestFilter; ramp.needsUpdate = true;
    const toon = own(new T.MeshToonMaterial({ color: 0xffffff, gradientMap: ramp }));
    const glow = own(new T.MeshBasicMaterial({ color: 0xffd9a8 }));
    const rounded = own(new T.BoxGeometry(1, 1, 1, 3, 3, 3));
    const positions = rounded.attributes.position, v = new T.Vector3(), core = new T.Vector3();
    for (let i = 0; i < positions.count; i++) {
      v.fromBufferAttribute(positions, i); core.copy(v).clampScalar(-0.42, 0.42);
      v.sub(core).normalize().multiplyScalar(0.08).add(core); positions.setXYZ(i, v.x, v.y, v.z);
    }
    rounded.computeVertexNormals();
    const geometries = { box: rounded, sphere: own(new T.IcosahedronGeometry(0.5, 1)),
      cylinder: own(new T.CylinderGeometry(0.5, 0.5, 1, 10)), shade: own(new T.CylinderGeometry(0.32, 0.5, 1, 12)) };
    const batches = new Map();
    for (const item of layout(seed).items) {
      const key = item.shape + (item.glow ? "-glow" : "");
      if (!batches.has(key)) batches.set(key, []);
      batches.get(key).push(item);
    }
    const matrix = new T.Object3D();
    for (const items of batches.values()) {
      const mesh = new T.InstancedMesh(geometries[items[0].shape], items[0].glow ? glow : toon, items.length);
      items.forEach((item, index) => {
        matrix.position.set(...item.position); matrix.scale.set(...item.size); matrix.updateMatrix();
        mesh.setMatrixAt(index, matrix.matrix); mesh.setColorAt(index, new T.Color(item.glow ? 0xffffff : item.color));
      });
      mesh.instanceMatrix.needsUpdate = true; group.add(mesh); own(mesh);
    }
    const skyMaterial = own(new T.ShaderMaterial({ uniforms: { day: { value: period === "day" ? 1 : 0 } },
      vertexShader: "varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}",
      fragmentShader: `varying vec2 vUv; uniform float day;
        float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
        void main(){vec3 night=mix(vec3(.20,.12,.32),vec3(.035,.04,.13),vUv.y);
        vec3 blue=mix(vec3(.72,.77,.91),vec3(.26,.50,.78),vUv.y);
        vec2 grid=vUv*vec2(55.,40.);float star=step(.974,hash(floor(grid)))*(1.-smoothstep(.02,.11,length(fract(grid)-.5)));
        gl_FragColor=vec4(mix(night+star*.8,blue,day),1.);
        #include <colorspace_fragment>
        }` }));
    const sky = new T.Mesh(own(new T.PlaneGeometry(3.1, 1.7)), skyMaterial);
    sky.position.set(0, 0.85, -1.55); group.add(sky);
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
    const sun = new T.DirectionalLight(); sun.position.set(-height, floorY + height * 1.6, -height * 0.2);
    sun.target.position.set(0, floorY + height * 0.65, 0); scene.add(sun, sun.target);
    const lamps = [[0.75, 1.03, -0.29], [0.75, 0.37, -0.29], [0.2, 0.96, -0.25]].map(p => {
      const light = new T.PointLight(0xffd9a8, 0, height * 2, 2);
      light.position.set(p[0] * height, floorY + p[1] * height, p[2] * height); scene.add(light); return light;
    });
    const oldFog = scene.fog, oldBackground = scene.background;
    const fog = new T.Fog(LIGHTS.night.fog, height * ROOM.fogNear, height * ROOM.fogFar);
    scene.fog = fog; scene.background = new T.Color(LIGHTS.night.fog);
    const blend = transition(period), a = new T.Color(), b = new T.Color(); let disposed = false, day = 0;
    const color = (target, key, t) => target.copy(a.setHex(LIGHTS.night[key])).lerp(b.setHex(LIGHTS.day[key]), t);
    function update(nextPeriod, now) {
      if (disposed) return;
      day = blend(nextPeriod, now); skyMaterial.uniforms.day.value = day;
      const mix = key => LIGHTS.night[key] + (LIGHTS.day[key] - LIGHTS.night[key]) * day;
      ambient.intensity = mix("ambient"); color(ambient.color, "ambientColor", day);
      sun.intensity = mix("sun"); color(sun.color, "sunColor", day);
      lamps.forEach(l => { l.intensity = mix("warm") * height * height; });
      glow.color.setHex(0xffd9a8).multiplyScalar(1 - day * 0.65);
      color(fog.color, "fog", day); scene.background.copy(fog.color);
    }
    update(period, 0);
    return { update, metrics: () => ({ day, batches: batches.size, resources: resources.size }), dispose() {
      if (disposed) return; disposed = true;
      scene.remove(group, ambient, sun, sun.target, ...lamps); scene.fog = oldFog; scene.background = oldBackground;
      for (const resource of resources) resource.dispose?.(); resources.clear(); group.clear();
    } };
  }
  const api = { ROOM, PALETTE, LIGHTS, layout, enabled, transition, create };
  root.XinyuVRMScene = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
