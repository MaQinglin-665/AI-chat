(function (root) {
  "use strict";
  const VOWELS = { a: "aa", i: "ih", u: "ou", e: "ee", o: "oh" };
  const FACES = { happy: "happy", angry: "angry", sad: "sad", thinking: "relaxed",
    shy: "relaxed", smug: "happy", sleepy: "relaxed", surprised: "surprised" };
  const clamp = (n, min = 0, max = 1) => Math.max(min, Math.min(max, Number(n) || 0));

  function createIntentDriver(vrm, mapping = {}) {
    const vowels = { ...VOWELS, ...mapping.vowels };
    const faces = { ...FACES, ...mapping.faces };
    const expressions = vrm.expressionManager;
    // VRM0 normalized bones face -Z; rotateVRM0 rotates the scene, not these local axes.
    const facing = vrm.meta?.metaVersion === "0" ? -1 : 1;
    const supports = (name) => !!expressions?.getExpression?.(name);
    const set = (name, value) => { if (supports(name)) expressions.setValue(name, clamp(value)); };
    const bone = (name) => vrm.humanoid?.getNormalizedBoneNode?.(name);
    const bones = ["head", "chest", "spine", "leftUpperArm", "rightUpperArm", "rightLowerArm", "rightHand"];
    const rest = new Map(bones.map((name) => [name, bone(name)?.rotation?.clone?.()]));
    let action = null, lastNow = null, nextBlink = 2200, blinkStart = -1000;
    const supportedActions = ["nod", "small_nod", "nod_double", "wave"];
    function stopAction() { action = null; }
    function playAction(name, { intensity = 1 } = {}) {
      if (!supportedActions.includes(name)) return false;
      if (!bone(name === "wave" ? "rightUpperArm" : "head")) return false;
      action = { name, intensity: clamp(intensity), start: null };
      return true;
    }
    function update(frame = {}) {
      const now = Number.isFinite(frame.now) ? frame.now : (lastNow ?? 0) + 16;
      if (lastNow === null) nextBlink = now + 2200;
      const delta = clamp((now - (lastNow ?? now)) / 1000, 0, 0.05);
      lastNow = now;
      for (const name of bones) { if (rest.get(name)) bone(name).rotation.copy(rest.get(name)); }
      // A relaxed standing pose, applied to normalized bones (VRM0/1 independent).
      if (bone("leftUpperArm")) bone("leftUpperArm").rotation.z -= 1.15 * facing;
      if (bone("rightUpperArm")) bone("rightUpperArm").rotation.z += 1.15 * facing;
      const t = now / 1000;
      if (bone("chest")) bone("chest").rotation.x += Math.sin(t * 1.7) * 0.012;
      if (bone("spine")) bone("spine").rotation.z += Math.sin(t * 0.7) * 0.012;
      for (const name of new Set(Object.values(vowels))) set(name, 0);
      const mouth = frame.mouth || {};
      // Missing/null vowel uses the existing amplitude signal on aa.
      const vowel = mouth.vowel == null ? vowels.a : (Object.hasOwn(vowels, mouth.vowel) ? vowels[mouth.vowel] : null);
      if (vowel) set(vowel, mouth.open);
      for (const name of new Set(Object.values(faces))) set(name, 0);
      if (Object.hasOwn(faces, frame.face)) set(faces[frame.face], frame.faceIntensity ?? 0.6);
      if (now >= nextBlink) { blinkStart = now; nextBlink = now + 3200 + Math.random() * 1800; }
      const phase = (now - blinkStart) / 160;
      set("blink", frame.blinkSuppressed || phase < 0 || phase > 1 ? 0 : Math.sin(phase * Math.PI));
      if (vrm.lookAt?.target?.position) {
        const gaze = frame.gaze;
        vrm.lookAt.target.position.set(gaze ? clamp(gaze.x, -1, 1) * 0.8 : Math.sin(t * 0.35) * 0.2,
          1.4 + (gaze ? clamp(gaze.y, -1, 1) * 0.5 : 0), 3);
      }
      if (frame.speechGesture && ["nod", "small_nod"].includes(frame.speechGesture.name) && bone("head")) {
        bone("head").rotation.x += Math.sin(clamp(frame.speechGesture.phase) * Math.PI) * 0.15;
      }
      if (action) {
        if (action.start === null) action.start = now;
        const duration = action.name === "wave" ? 1800 : 900;
        const p = clamp((now - action.start) / duration);
        const envelope = Math.sin(p * Math.PI) * action.intensity;
        if (action.name === "wave") {
          bone("rightUpperArm").rotation.z -= 2.5 * envelope * facing;
          if (bone("rightLowerArm")) bone("rightLowerArm").rotation.z -= 0.7 * envelope * facing;
          if (bone("rightHand")) bone("rightHand").rotation.z += Math.sin(p * Math.PI * 8) * envelope * 0.4;
        } else if (bone("head")) {
          bone("head").rotation.x += Math.sin(p * Math.PI * (action.name === "nod_double" ? 4 : 2))
            * envelope * (action.name === "small_nod" ? 0.12 : 0.25);
        }
        if (p >= 1) stopAction();
      }
      vrm.update?.(delta); // includes constraints, expressions and SpringBone simulation
    }
    return { update, playAction, stopAction, capabilities: () => ({
      vowels: Object.values(vowels).every(supports), armGestures: bone("rightUpperArm") ? ["wave"] : [],
      fullBody: false, locomotion: false, faces: Object.keys(faces).filter((name) => supports(faces[name])),
      actions: supportedActions.filter((name) => !!bone(name === "wave" ? "rightUpperArm" : "head")), vrma: false
    }) };
  }

  function createRenderer(options = {}) {
    const vendor = options.vendor || root.XinyuVRMVendor;
    let vrm = null, driver = null, renderer = null, scene = null, camera = null, generation = 0;
    const canvas = options.canvas;
    function dispose() {
      generation += 1;
      driver?.stopAction();
      if (vrm) vendor.VRMUtils.deepDispose(vrm.scene);
      renderer?.dispose(); renderer?.forceContextLoss();
      vrm = driver = renderer = scene = camera = null;
    }
    async function load(source = {}) {
      dispose();
      const mine = generation;
      const { THREE, GLTFLoader, VRMLoaderPlugin, VRMUtils } = vendor;
      const fetcher = options.fetch || root.authFetch || root.fetch;
      const response = await fetcher(source.path, { cache: "no-store" });
      if (!response.ok) throw new Error("VRM model could not be read.");
      const buffer = await response.arrayBuffer();
      if (mine !== generation) return;
      const manager = new THREE.LoadingManager();
      manager.setURLModifier((url) => {
        if (/^(blob:|data:)/.test(url)) return url;
        throw new Error("External VRM resources are not allowed; use an embedded VRM.");
      });
      const loader = new GLTFLoader(manager);
      loader.register((parser) => new VRMLoaderPlugin(parser));
      const gltf = await loader.parseAsync(buffer, "");
      const loaded = gltf.userData.vrm;
      if (!loaded) { VRMUtils.deepDispose(gltf.scene); throw new Error("This file does not contain a VRM avatar."); }
      if (mine !== generation) { VRMUtils.deepDispose(loaded.scene); return; }
      vrm = loaded;
      VRMUtils.rotateVRM0(vrm);
      scene = new THREE.Scene();
      scene.add(vrm.scene);
      scene.add(new THREE.HemisphereLight(0xffffff, 0x778899, 2.0));
      const light = new THREE.DirectionalLight(0xffffff, 2.0);
      light.position.set(1, 2, 3); scene.add(light);
      if (vrm.lookAt) { vrm.lookAt.target = new THREE.Object3D(); scene.add(vrm.lookAt.target); }
      camera = new THREE.PerspectiveCamera(30, 1, 0.01, 100);
      const box = new THREE.Box3().setFromObject(vrm.scene);
      const height = Math.max(0.5, box.max.y - box.min.y);
      camera.position.set(0, box.min.y + height * 0.53, height * 2.25);
      camera.lookAt(0, box.min.y + height * 0.53, 0);
      renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: "low-power" });
      renderer.setClearColor(0x000000, 0);
      renderer.setPixelRatio(Math.min(root.devicePixelRatio || 1, 1.5));
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      driver = createIntentDriver(vrm, source.mapping || {});
    }
    function update(frame) {
      if (!driver || !renderer) return;
      const width = Math.max(1, canvas.clientWidth || root.innerWidth || 400);
      const height = Math.max(1, canvas.clientHeight || root.innerHeight || 600);
      const ratio = renderer.getPixelRatio();
      if (canvas.width !== Math.floor(width * ratio) || canvas.height !== Math.floor(height * ratio)) {
        renderer.setSize(width, height, false); camera.aspect = width / height; camera.updateProjectionMatrix();
      }
      driver.update(frame); renderer.render(scene, camera);
    }
    function hitTest(x, y) {
      if (!vrm || !camera) return false;
      const rect = canvas.getBoundingClientRect();
      const ray = new vendor.THREE.Raycaster();
      ray.setFromCamera(new vendor.THREE.Vector2((x - rect.left) / rect.width * 2 - 1,
        1 - (y - rect.top) / rect.height * 2), camera);
      return ray.intersectObject(vrm.scene, true).length > 0;
    }
    return { kind: "vrm", load, dispose, update, hitTest,
      capabilities: () => driver?.capabilities() || { vowels: false, faces: [], actions: [], vrma: false },
      playAction: (...args) => driver?.playAction(...args) || false,
      stopAction: () => driver?.stopAction(),
      // Reserved for a later animation loader; never silently fetch arbitrary files.
      loadAnimation: async () => false
    };
  }
  const api = { createRenderer, createIntentDriver };
  root.XinyuVRMRenderer = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
