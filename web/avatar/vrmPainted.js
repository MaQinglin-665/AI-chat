(function (root) {
  "use strict";
  const PERIODS = Object.freeze(["night", "dusk", "day"]);
  const TIMING = Object.freeze({ fadeMs: 2600, duskStart: 17, duskEnd: 20, dayStart: 5 });
  // Normalized image coordinates survive replacement by higher-resolution exports.
  // All three bedroom plates share one perspective; keep entries separate for future plates.
  const bedroom = () => ({ aspect: 1672 / 941, anchor: [.56, .86], fov: 42,
    height: 1.92, distance: 4.6, pitch: 12, yaw: -40.5, gridYaw: 0 });
  const CALIBRATION = Object.freeze({ night: bedroom(), dusk: bedroom(), day: bedroom() });
  const LIGHTS = Object.freeze({
    night: { ambient: .48, ambientColor: 0x9586c4, key: 1.65, keyColor: 0xffbb7d,
      keyPosition: [2.3, 2.0, -.9], rim: 1.05, rimColor: 0x91baff, rimPosition: [-3, 2.5, -2], shadow: .30, reflection: .105 },
    dusk: { ambient: .65, ambientColor: 0xf1b1b6, key: 2.0, keyColor: 0xffbc78,
      keyPosition: [-3, 2.5, -1], rim: .32, rimColor: 0xffcfb3, rimPosition: [2, 2, 0], shadow: .32, reflection: .09 },
    day: { ambient: .85, ambientColor: 0xfff1e2, key: 1.7, keyColor: 0xfff1dc,
      keyPosition: [-3, 3.5, -1], rim: .25, rimColor: 0xd8e6ff, rimPosition: [2, 2, 0], shadow: .22, reflection: .075 }
  });
  const clamp = (v, lo = 0, hi = 1) => Math.max(lo, Math.min(hi, v));
  const smooth = t => { t = clamp(t); return t * t * (3 - 2 * t); };
  function periodAt(scene, hour = new Date().getHours()) {
    if (PERIODS.includes(scene)) return scene;
    if (scene === "morning") return "day";
    return hour >= TIMING.duskStart && hour < TIMING.duskEnd ? "dusk"
      : hour >= TIMING.dayStart && hour < TIMING.duskStart ? "day" : "night";
  }
  function cover(iw, ih, width, height, anchor = [.56, .86]) {
    if (![iw, ih, width, height].every(v => Number.isFinite(v) && v > 0)) throw Error("Invalid cover dimensions");
    const scale = Math.max(width / iw, height / ih), w = width / scale, h = height / scale;
    const x = clamp(anchor[0] * iw - w * .5, 0, iw - w);
    const y = clamp(anchor[1] * ih - h * .86, 0, ih - h);
    return { x, y, w, h, scale, anchor: [(anchor[0] * iw - x) / w, (anchor[1] * ih - y) / h],
      uv: [x / iw, 1 - (y + h) / ih, w / iw, h / ih] };
  }
  function localURL(period) {
    if (!PERIODS.includes(period)) throw Error("Unknown backdrop period");
    return `/api/avatar/backdrop/${period}.png`;
  }
  // Serialized two-slot ownership. Rapid changes coalesce; never load a third plate
  // while two images are fading. Failed images become the local placeholder.
  function createPlates({ load, initial = "night", release = item => item.texture.dispose() }) {
    let current = null, next = null, pending = false, dead = false, wanted = periodAt(initial);
    let requested = null, since = null, blend = 0, error = false;
    async function pump() {
      if (dead || pending || next || (current && requested === wanted)) return;
      const target = wanted; pending = true; requested = target;
      let item;
      try { item = await load(target); } catch (_) { error = true; pending = false; return; }
      pending = false;
      if (dead) { release(item); return; }
      if (!current) current = item; else { next = item; since = null; }
    }
    function update(target, now) {
      wanted = periodAt(target);
      if (next) {
        since ??= now; blend = smooth((now - since) / TIMING.fadeMs);
        if (blend === 1) { release(current); current = next; next = null; blend = 0; since = null; }
      }
      // A failed request stays on its fallback until another period is requested.
      if (!error || requested !== wanted) { error = false; void pump(); }
      return { current, next, blend, pending, error };
    }
    const ready = pump();
    return { ready, update, state: () => ({ current, next, blend, pending, error }), dispose() {
      if (dead) return; dead = true; if (current) release(current); if (next) release(next); current = next = null;
    } };
  }
  function stationaryPose(now, interaction, facing = 1) {
    if (interaction) return { bones: {}, hands: {}, weight: 0, y: 0, offset: [0, 0] };
    const cycle = Math.floor(now / 28000), age = now % 28000, weight = Math.sin(clamp((age - 18000) / 6500) * Math.PI) ** 2;
    const bones = cycle % 3 === 0 ? { head: { y: -.32, x: -.04 * facing }, spine: { y: -.06 } }
      : cycle % 3 === 1 ? { leftUpperArm: { z: .6 * facing }, rightUpperArm: { z: -.6 * facing }, chest: { x: -.08 * facing } }
        : { head: { z: .09 }, spine: { z: -.025 } };
    return { bones, hands: {}, weight, y: 0, offset: [0, 0] };
  }
  const vertex = "varying vec2 vUv; void main(){vUv=uv;gl_Position=vec4(position.xy,1.,1.);}";
  function create({ THREE: T, scene, floorY = 0, period = "night", settings = {}, fetch: fetcher = root.authFetch || root.fetch, loadTexture }) {
    let disposed = false, reflectionOn = settings.reflection !== false, state, crop, cameraData;
    const group = new T.Group(); group.name = "painted-backdrop"; scene.add(group);
    const resources = new Set(), own = item => { resources.add(item); return item; };
    const oldBackground = scene.background, oldFog = scene.fog; scene.background = null; scene.fog = null;
    const fallback = own(new T.DataTexture(new Uint8Array([110, 99, 119, 255]), 1, 1)); fallback.colorSpace = T.SRGBColorSpace; fallback.needsUpdate = true;
    const abort = new AbortController();
    async function decode(name) {
      let response, bitmap, actual = name;
      try { response = await fetcher(localURL(name), { signal: abort.signal, cache: "no-store" });
        if (!response.ok) throw Error("Backdrop unavailable");
        const result = response.headers?.get("X-Backdrop-Period"); if (PERIODS.includes(result)) actual = result;
        bitmap = await root.createImageBitmap(await response.blob(), { imageOrientation: "flipY", premultiplyAlpha: "none" });
      } catch (error) {
        if (abort.signal.aborted) throw error;
        response = await fetcher("/assets/painted-placeholder.png", { signal: abort.signal });
        if (!response.ok) throw Error("Placeholder unavailable");
        bitmap = await root.createImageBitmap(await response.blob(), { imageOrientation: "flipY", premultiplyAlpha: "none" });
      }
      const texture = new T.Texture(bitmap); texture.colorSpace = T.SRGBColorSpace; texture.needsUpdate = true;
      texture.generateMipmaps = false; texture.minFilter = T.LinearFilter;
      return { texture, period: actual, width: bitmap.width, height: bitmap.height, close: () => bitmap.close() };
    }
    const plates = createPlates({ load: loadTexture || decode, initial: period,
      release: item => { item.texture.dispose(); item.close?.(); } });
    const uniforms = { plateA: { value: fallback }, plateB: { value: fallback }, mixAmount: { value: 0 },
      cropA: { value: new T.Vector4(0, 0, 1, 1) }, cropB: { value: new T.Vector4(0, 0, 1, 1) } };
    const background = new T.Mesh(own(new T.PlaneGeometry(2, 2)), own(new T.ShaderMaterial({ uniforms, vertexShader: vertex,
      fragmentShader: `varying vec2 vUv; uniform sampler2D plateA,plateB; uniform vec4 cropA,cropB; uniform float mixAmount;
        void main(){gl_FragColor=mix(texture2D(plateA,cropA.xy+vUv*cropA.zw),texture2D(plateB,cropB.xy+vUv*cropB.zw),mixAmount);
        #include <colorspace_fragment>
        }`, depthTest: false, depthWrite: false })));
    background.frustumCulled = false; background.renderOrder = -100; group.add(background);
    const ambient = new T.AmbientLight(), key = new T.DirectionalLight(), rim = new T.DirectionalLight();
    group.add(ambient, key, key.target, rim, rim.target);
    const colorA = new T.Color(), colorB = new T.Color();
    const shadowMaterial = own(new T.ShaderMaterial({ transparent: true, depthWrite: false,
      uniforms: { strength: { value: .3 } }, vertexShader: "varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}",
      fragmentShader: "varying vec2 vUv;uniform float strength;void main(){float d=length((vUv-.5)*2.);gl_FragColor=vec4(.09,.055,.13,pow(max(0.,1.-d),2.)*strength);}" }));
    const shadow = new T.Mesh(own(new T.PlaneGeometry(1.25, 1.9)), shadowMaterial);
    shadow.rotation.x = -Math.PI / 2; shadow.position.y = floorY + .002; group.add(shadow);
    const feet = [-.09, .09].map(x => {
      const foot = new T.Mesh(own(new T.PlaneGeometry(.25, .4)), shadowMaterial);
      foot.rotation.x = -Math.PI / 2; foot.position.set(x, floorY + .003, 0); group.add(foot); return foot;
    });
    const grid = new T.GridHelper(16, 16, 0x44ffff, 0x44ffff); own(grid.geometry); own(grid.material);
    grid.position.y = floorY + .008; grid.material.transparent = true; grid.material.opacity = .45; grid.material.depthWrite = false;
    grid.visible = settings.grid === true; group.add(grid);
    let target = null;
    const reflectionUniforms = { image: { value: fallback }, pixel: { value: new T.Vector2(1 / 640, 1 / 360) },
      strength: { value: .1 }, footY: { value: .14 } };
    const reflection = new T.Mesh(own(new T.PlaneGeometry(2, 2)), own(new T.ShaderMaterial({
      transparent: true, depthTest: false, depthWrite: false, uniforms: reflectionUniforms, vertexShader: vertex,
      fragmentShader: `varying vec2 vUv;uniform sampler2D image;uniform vec2 pixel;uniform float strength,footY;
        void main(){vec4 c=vec4(0.);for(int x=-1;x<=1;x++){for(int y=-1;y<=1;y++){c+=texture2D(image,vUv+vec2(float(x),float(y))*pixel*1.4);}}
        c/=9.;float fade=clamp(1.-(footY-vUv.y)/.28,0.,1.);gl_FragColor=vec4(c.rgb,c.a*strength*fade*fade);
        #include <colorspace_fragment>
        }` })));
    reflection.frustumCulled = false; reflection.renderOrder = -90; group.add(reflection);
    function resizeCamera(camera, width, height) {
      const plate = state?.current, cal = CALIBRATION[plate?.period || periodAt(period)];
      const iw = plate?.width || 1672, ih = plate?.height || 941;
      crop = cover(iw, ih, width, height, cal.anchor);
      const yaw = cal.yaw * Math.PI / 180, pitch = cal.pitch * Math.PI / 180;
      camera.fov = cal.fov; camera.aspect = iw / ih; camera.clearViewOffset?.();
      camera.position.set(Math.sin(yaw) * cal.distance, floorY + cal.height, Math.cos(yaw) * cal.distance);
      camera.lookAt(camera.position.x - Math.sin(yaw), camera.position.y - Math.tan(pitch), camera.position.z - Math.cos(yaw));
      camera.updateMatrixWorld(true); camera.updateProjectionMatrix();
      const foot = new T.Vector3(0, floorY, 0).project(camera), m = camera.projectionMatrix.elements;
      // Shift the reference plate projection to the calibrated foot, then apply its exact cover crop.
      m[8] += foot.x - (2 * cal.anchor[0] - 1); m[9] += foot.y - (1 - 2 * cal.anchor[1]);
      const sx = iw / crop.w, sy = ih / crop.h;
      m[0] *= sx; m[8] = m[8] * sx - (iw - 2 * crop.x - crop.w) / crop.w;
      m[5] *= sy; m[9] = m[9] * sy - (2 * crop.y + crop.h - ih) / crop.h;
      camera.projectionMatrixInverse.copy(camera.projectionMatrix).invert();
      grid.rotation.y = cal.gridYaw; reflectionUniforms.footY.value = 1 - crop.anchor[1];
      cameraData = { position: camera.position.toArray(), fov: camera.fov, crop, calibration: cal };
      for (const [slot, item] of [["A", state?.current], ["B", state?.next || state?.current]]) {
        const c = cover(item?.width || 1672, item?.height || 941, width, height, CALIBRATION[item?.period || periodAt(period)].anchor);
        uniforms["crop" + slot].value.set(...c.uv);
      }
    }
    let illumination;
    function update(nextPeriod, now) {
      if (disposed) return;
      state = plates.update(nextPeriod, now);
      uniforms.plateA.value = state.current?.texture || fallback; uniforms.plateB.value = state.next?.texture || uniforms.plateA.value;
      uniforms.mixAmount.value = state.blend;
      const a = LIGHTS[state.current?.period || periodAt(period)], b = LIGHTS[state.next?.period || state.current?.period || periodAt(period)], t = state.blend;
      const mix = name => a[name] + (b[name] - a[name]) * t;
      const color = (out, name) => out.copy(colorA.setHex(a[name])).lerp(colorB.setHex(b[name]), t);
      ambient.intensity = mix("ambient"); color(ambient.color, "ambientColor");
      for (const [light, name] of [[key, "key"], [rim, "rim"]]) {
        light.intensity = mix(name); color(light.color, name + "Color");
        const p = a[name + "Position"].map((n, i) => n + (b[name + "Position"][i] - n) * t);
        light.position.set(p[0], floorY + p[1], p[2]); light.target.position.set(0, floorY + .8, 0);
      }
      shadowMaterial.uniforms.strength.value = mix("shadow");
      shadow.rotation.z = Math.atan2(-key.position.x, -key.position.z);
      shadow.position.x = -key.position.x * .065; shadow.position.z = -key.position.z * .065;
      reflectionUniforms.strength.value = mix("reflection"); reflection.visible = reflectionOn && !!target;
      illumination = { ambient: ambient.intensity, key: key.intensity, rim: rim.intensity, shadow: mix("shadow") };
    }
    function renderReflection(renderer, camera, avatar) {
      if (!reflectionOn || disposed) return;
      const size = renderer.getSize(new T.Vector2()), w = Math.min(960, Math.ceil(size.x / 2)), h = Math.max(1, Math.round(w * size.y / size.x));
      if (!target) target = new T.WebGLRenderTarget(w, h, { depthBuffer: true });
      if (target.width !== w || target.height !== h) target.setSize(w, h);
      reflectionUniforms.image.value = target.texture; reflectionUniforms.pixel.value.set(1 / w, 1 / h);
      const saved = { target: renderer.getRenderTarget(), scale: avatar.scale.y, y: avatar.position.y,
        background: scene.background, alpha: renderer.getClearAlpha(), color: renderer.getClearColor(new T.Color()) };
      const visible = [background, reflection, shadow, grid, ...feet].map(n => [n, n.visible]);
      try {
        visible.forEach(([n]) => { n.visible = false; });
        avatar.scale.y = -saved.scale; avatar.position.y = 2 * floorY - saved.y; avatar.updateMatrixWorld(true);
        scene.background = null; renderer.setRenderTarget(target); renderer.setClearColor(0, 0); renderer.clear(); renderer.render(scene, camera);
      } finally {
        avatar.scale.y = saved.scale; avatar.position.y = saved.y; avatar.updateMatrixWorld(true);
        scene.background = saved.background; renderer.setRenderTarget(saved.target); renderer.setClearColor(saved.color, saved.alpha);
        visible.forEach(([n, value]) => { n.visible = value; }); reflection.visible = true;
      }
    }
    update(period, 0);
    return { ready: plates.ready, update, resizeCamera, renderReflection,
      avatarYaw: () => CALIBRATION[state?.current?.period || periodAt(period)].yaw * Math.PI / 180,
      setFootPositions: points => feet.forEach((foot, i) => { if (points[i]) foot.position.set(points[i][0], floorY + .003, points[i][2]); }),
      getLayout: () => ({ activityPoints: {}, obstacles: [], stationary: true }),
      setOptions(value = {}) { if (typeof value.grid === "boolean") grid.visible = value.grid;
        if (typeof value.reflection === "boolean") { reflectionOn = value.reflection; reflection.visible = reflectionOn;
          if (!reflectionOn && target) { target.dispose(); target = null; reflectionUniforms.image.value = fallback; } } },
      metrics: () => ({ preset: "painted", period: state?.current?.period, next: state?.next?.period, blend: state?.blend,
        pending: state?.pending, error: state?.error, textures: Number(!!state?.current) + Number(!!state?.next),
        reflection: reflectionOn, grid: grid.visible, camera: cameraData, illumination }),
      dispose() { if (disposed) return; disposed = true; abort.abort(); plates.dispose(); target?.dispose(); target = null;
        scene.remove(group); group.clear(); scene.background = oldBackground; scene.fog = oldFog;
        resources.forEach(item => item.dispose()); resources.clear(); }
    };
  }
  const api = { PERIODS, TIMING, CALIBRATION, LIGHTS, periodAt, cover, localURL, smooth, createPlates, stationaryPose, create };
  root.XinyuVRMPainted = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
