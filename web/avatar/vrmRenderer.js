(function (root) {
  "use strict";
  // Radians and model-height ratios. Keep all motion/quality tuning here.
  const MOTION = Object.freeze({
    armDrop: 72 * Math.PI / 180, elbowBend: 0.18, elbowInward: 0.055, wristRelax: 0.065,
    chestBreath: 0.032, spineBreath: 0.018, chestExpansion: 0.009, shoulderRise: 0.0025,
    weightShift: 0.009, hipRoll: 0.018, spineCounter: 0.025,
    headYaw: 0.055, headPitch: 0.025, headTilt: 0.033, armSway: 0.023,
    smallTilt: 0.085, smallLook: 0.16, postureLift: 0.004, smallDuration: 2.8,
    smallPeriod: 14, smallJitter: 6, smallFirst: 8,
    speechNod: 0.07, speechLean: 0.055, speechArm: 0.028,
    waveLift: 2.45, waveElbow: 0.65, waveWrist: 0.32, nod: 0.25, smallNod: 0.12,
    chestSpeechRatio: 0.5, headYawSecondary: 0.4, headTiltSecondary: 0.3, postureCounterRatio: 0.3,
    gazeX: 0.5, gazeY: 0.3, gazeIdle: 0.12, gazeHeight: 0.9, gazeDistance: 2,
    seed: 23017
  });
  const QUALITY = Object.freeze({ pixelBudget: 900000, minDpr: 1, maxDpr: 1.25, idleFps: 20, activeFps: 30 });
  const CAMERA = Object.freeze({ fov: 27, eyeLift: 0.035, bottom: 0.40, top: 1.16, face: 0.91, faceScreenY: 1 / 3 });
  const STANCE = Object.freeze({ yaw: 15 * Math.PI / 180, headReturn: 0.9,
    hipShift: 0.012, hipTilt: 0.035, shoulderTilt: -0.025, shoulderDrop: 0.004,
    forwardArm: 0.14, forwardElbow: 0.18, fingerCurl: [0.13, 0.22, 0.30], thumbCurl: [0.08, 0.12, 0.16] });
  const EXPRESSION = Object.freeze({ idleSmile: 0.18, preparingSmile: 0.28, prepareMs: 1100,
    saccadePeriod: 3.7, saccadeHold: 0.32, saccadeTravel: 0.045, saccadeX: 0.045, saccadeY: 0.018 });
  const LIGHT = Object.freeze({
    room: { sky: 0x8c7bb8, ground: 0x30283d, ambient: 0.45, keyColor: 0xffd9a8, key: 0.85,
      fillColor: 0x8c7bb8, fill: 0.18, rimColor: 0xd496df, rim: 0.55, exposure: 0.86, saturation: 0.88 },
    pet: { sky: 0xffffff, ground: 0x6f7893, ambient: 0.55, keyColor: 0xffffff, key: 1.10,
      fillColor: 0xffffff, fill: 0.4, rimColor: 0xe5dff2, rim: 0.15, exposure: 1, saturation: 1 },
    keyPosition: [1, 1.6, 1.8], fillPosition: [-1.2, 1.2, 1.4], rimPosition: [-0.8, 1.3, -1.4],
    targetHeight: 0.8, luminance: [0.2126, 0.7152, 0.0722]
  });
  const FINGERS = Object.freeze(["Index", "Middle", "Ring", "Little"]);
  const PHALANGES = Object.freeze(["Proximal", "Intermediate", "Distal"]);
  function saccadeAt(seconds, seed = MOTION.seed) {
    const cycle = Math.floor(seconds / EXPRESSION.saccadePeriod);
    const age = seconds - cycle * EXPRESSION.saccadePeriod;
    const start = randomAt(seed, cycle + 2000) * (EXPRESSION.saccadePeriod - EXPRESSION.saccadeHold);
    const t = age - start;
    const weight = Math.max(0, Math.min(1, t / EXPRESSION.saccadeTravel,
      (EXPRESSION.saccadeHold - t) / EXPRESSION.saccadeTravel));
    return { x: (randomAt(seed, cycle + 3000) * 2 - 1) * EXPRESSION.saccadeX * weight,
      y: (randomAt(seed, cycle + 4000) * 2 - 1) * EXPRESSION.saccadeY * weight };
  }
  function gradeRoomMaterials(scene, preset) {
    if (preset.exposure === 1 && preset.saturation === 1) return;
    scene.traverse(node => { for (const material of [].concat(node.material || [])) {
      if (!material.isMToonMaterial) continue;
      const previous = material.onBeforeCompile;
      material.onBeforeCompile = function(shader, renderer) {
        previous.call(this, shader, renderer);
        shader.fragmentShader = shader.fragmentShader.replace("#include <tonemapping_fragment>",
          `gl_FragColor.rgb = mix(vec3(dot(gl_FragColor.rgb, vec3(${LIGHT.luminance.join(",")}))), gl_FragColor.rgb, ${preset.saturation.toFixed(4)}) * ${preset.exposure.toFixed(4)};\n#include <tonemapping_fragment>`);
      };
      material.customProgramCacheKey = () => `xinyu-room-${preset.exposure}-${preset.saturation}`;
      material.needsUpdate = true;
    }});
  }
  const VOWELS = { a: "aa", i: "ih", u: "ou", e: "ee", o: "oh" };
  const FACES = { happy: "happy", angry: "angry", sad: "sad", thinking: "relaxed",
    shy: "relaxed", smug: "happy", sleepy: "relaxed", surprised: "surprised" };
  const clamp = (n, min = 0, max = 1) => Math.max(min, Math.min(max, Number(n) || 0));

  function randomAt(seed, index) {
    let x = (seed ^ Math.imul(index + 1, 0x9e3779b9)) >>> 0;
    x ^= x >>> 16; x = Math.imul(x, 0x7feb352d); x ^= x >>> 15;
    x = Math.imul(x, 0x846ca68b); x ^= x >>> 16;
    return (x >>> 0) / 4294967296;
  }
  function smallMotionAt(seconds, seed = MOTION.seed) {
    const block = Math.floor((seconds - MOTION.smallFirst) / MOTION.smallPeriod);
    for (const i of [block, block - 1]) {
      if (i < 0) continue;
      const start = MOTION.smallFirst + i * MOTION.smallPeriod + randomAt(seed, i * 3) * MOTION.smallJitter;
      const phase = (seconds - start) / MOTION.smallDuration;
      if (phase >= 0 && phase <= 1) return {
        name: ["tilt", "look", "posture"][Math.floor(randomAt(seed, i * 3 + 1) * 3)],
        weight: Math.sin(phase * Math.PI) ** 2, direction: randomAt(seed, i * 3 + 2) < 0.5 ? -1 : 1, phase
      };
    }
    return null;
  }
  function poseAt(now, { seed = MOTION.seed, facing = 1, height = 1.6, level = 0, action = null } = {}) {
    const t = Math.max(0, now) / 1000, phase = randomAt(seed, 100) * Math.PI * 2;
    const breath = Math.sin(t * 1.6), sway = Math.sin(t * 0.42 + phase);
    const speech = clamp(level), small = smallMotionAt(t, seed);
    const pose = {};
    const node = n => (pose[n] ||= { x: 0, y: 0, z: 0, px: 0, py: 0, scaleY: 1 });
    node("hips").px = (STANCE.hipShift + sway * MOTION.weightShift) * height;
    node("hips").y = STANCE.yaw;
    node("hips").z = (STANCE.hipTilt + sway * MOTION.hipRoll) * facing;
    node("spine").z = (STANCE.shoulderTilt - sway * MOTION.spineCounter) * facing;
    node("spine").x = (breath * MOTION.spineBreath + speech * MOTION.speechLean) * facing;
    node("chest").x = (breath * MOTION.chestBreath + speech * MOTION.speechLean * MOTION.chestSpeechRatio) * facing;
    node("chest").scaleY = 1 + breath * MOTION.chestExpansion;
    node("head").y = -STANCE.yaw * STANCE.headReturn + (Math.sin(t * 0.51 + phase) + Math.sin(t * 0.83) * MOTION.headYawSecondary) * MOTION.headYaw;
    node("head").z = (Math.sin(t * 0.37) + Math.sin(t * 0.91 + phase) * MOTION.headTiltSecondary) * MOTION.headTilt;
    node("head").x = (Math.sin(t * 0.63 + phase) * MOTION.headPitch + Math.sin(t * 7.1) * speech * MOTION.speechNod) * facing;
    for (const [side, sign] of [["left", -1], ["right", 1]]) {
      node(side + "Shoulder").py = (breath * MOTION.shoulderRise - STANCE.shoulderDrop) * height;
      node(side + "UpperArm").z = sign * facing * (MOTION.armDrop + breath * MOTION.armSway + sway * MOTION.armSway * sign);
      node(side + "UpperArm").x = (Math.sin(t * 0.8 + sign) * MOTION.armSway + speech * MOTION.speechArm) * facing;
      node(side + "LowerArm").y = sign * MOTION.elbowBend * facing;
      node(side + "LowerArm").z = sign * MOTION.elbowInward * facing;
      node(side + "Hand").z = sign * MOTION.wristRelax * facing;
      if (side === "left") {
        node(side + "UpperArm").x -= STANCE.forwardArm * facing;
        node(side + "LowerArm").y = -sign * (MOTION.elbowBend + STANCE.forwardElbow) * facing;
      }
      for (const finger of FINGERS) PHALANGES.forEach((joint, index) => {
        node(side + finger + joint).z = sign * facing * STANCE.fingerCurl[index];
      });
      ["Metacarpal", "Proximal", "Distal"].forEach((joint, index) => {
        node(side + "Thumb" + joint).y = sign * facing * STANCE.thumbCurl[index];
      });
    }
    if (small) {
      const w = small.weight * small.direction;
      if (small.name === "tilt") node("head").z += w * MOTION.smallTilt;
      if (small.name === "look") node("head").y += w * MOTION.smallLook;
      if (small.name === "posture") {
        node("hips").py += small.weight * height * MOTION.postureLift;
        node("spine").z -= w * MOTION.smallTilt * MOTION.postureCounterRatio;
        node("leftShoulder").py += small.weight * height * MOTION.shoulderRise;
      }
    }
    if (action) {
      const p = clamp(action.phase), envelope = Math.sin(p * Math.PI) * clamp(action.intensity);
      if (action.name === "wave") {
        node("rightUpperArm").z -= MOTION.waveLift * envelope * facing;
        node("rightLowerArm").z -= MOTION.waveElbow * envelope * facing;
        node("rightHand").z += Math.sin(p * Math.PI * 8) * envelope * MOTION.waveWrist;
      } else {
        node("head").x += Math.sin(p * Math.PI * (action.name === "nod_double" ? 4 : 2)) * envelope
          * (action.name === "small_nod" ? MOTION.smallNod : MOTION.nod) * facing;
      }
    }
    return { bones: pose, smallMotion: small };
  }
  function pixelRatioFor(width, height, dpr = 1) {
    return Math.max(QUALITY.minDpr, Math.min(Math.max(0.1, dpr), QUALITY.maxDpr, Math.sqrt(QUALITY.pixelBudget / Math.max(1, width * height))));
  }
  function cameraFraming(minY, height, faceY = minY + height * CAMERA.face) {
    const span = height * (CAMERA.top - CAMERA.bottom);
    const distance = span / (2 * Math.tan(CAMERA.fov * Math.PI / 360));
    const cameraY = faceY + height * CAMERA.eyeLift;
    const tilt = Math.atan2(cameraY - faceY, distance) + Math.atan((0.5 - CAMERA.faceScreenY) * 2 * Math.tan(CAMERA.fov * Math.PI / 360));
    return { targetY: cameraY - distance * Math.tan(tilt), cameraY, distance };
  }
  function hitSegments(x, y, segments) {
    return segments.some(s => {
      const dx = s.bx - s.ax, dy = s.by - s.ay;
      const t = clamp(((x - s.ax) * dx + (y - s.ay) * dy) / (dx * dx + dy * dy || 1));
      return (x - s.ax - t * dx) ** 2 + (y - s.ay - t * dy) ** 2 <= s.radius ** 2;
    });
  }

  function createIntentDriver(vrm, mapping = {}, options = {}) {
    const vowels = { ...VOWELS, ...mapping.vowels }, faces = { ...FACES, ...mapping.faces };
    const expressions = vrm.expressionManager;
    const facing = vrm.meta?.metaVersion === "0" ? -1 : 1;
    const seed = options.seed ?? MOTION.seed, height = options.height || 1.6;
    const supports = name => typeof name === "string" && !!expressions?.getExpression?.(name);
    const set = (name, value) => { if (supports(name)) expressions.setValue(name, clamp(value)); };
    const bone = name => vrm.humanoid?.getNormalizedBoneNode?.(name);
    const names = Object.keys(poseAt(0).bones);
    const rest = new Map(names.map(name => [name, { rotation: bone(name)?.rotation?.clone?.(),
      position: bone(name)?.position?.clone?.(), scale: bone(name)?.scale?.clone?.() }]));
    const vowelNames = [...new Set(Object.values(vowels))], faceNames = [...new Set(Object.values(faces))];
    let action = null, lastNow = null, startedAt = null, lastSmallMotion = null;
    const supportedActions = ["nod", "small_nod", "nod_double", "wave"];
    function stopAction() { action = null; }
    function playAction(name, { intensity = 1 } = {}) {
      if (!supportedActions.includes(name) || !bone(name === "wave" ? "rightUpperArm" : "head")) return false;
      action = { name, intensity: clamp(intensity), start: null };
      return true;
    }
    function update(frame = {}) {
      const now = Number.isFinite(frame.now) ? frame.now : (lastNow ?? 0) + 16;
      if (startedAt === null) startedAt = now;
      const elapsed = Math.max(0, now - startedAt), delta = clamp((now - (lastNow ?? now)) / 1000, 0, 0.05);
      lastNow = now;
      if (action) {
        if (action.start === null) action.start = now;
        action.phase = (now - action.start) / (action.name === "wave" ? 1800 : 900);
        if (action.phase >= 1) stopAction();
      }
      const pose = poseAt(elapsed, { seed, facing, height, level: frame.mouth?.open || 0, action });
      lastSmallMotion = pose.smallMotion;
      for (const name of names) {
        const n = bone(name), base = rest.get(name), offset = pose.bones[name];
        if (!n || !base.rotation) continue;
        n.rotation.copy(base.rotation);
        if (base.position) n.position.copy(base.position);
        if (base.scale) n.scale.copy(base.scale);
        if (offset) {
          n.rotation.x += offset.x; n.rotation.y += offset.y; n.rotation.z += offset.z;
          if (base.position) { n.position.x += offset.px; n.position.y += offset.py; }
          if (base.scale) n.scale.y *= offset.scaleY;
        }
      }
      for (const name of vowelNames) set(name, 0);
      const mouth = frame.mouth || {};
      const vowel = mouth.vowel == null ? vowels.a : (Object.hasOwn(vowels, mouth.vowel) ? vowels[mouth.vowel] : null);
      if (vowel) set(vowel, mouth.open);
      for (const name of faceNames) set(name, 0);
      if (Object.hasOwn(faces, frame.face) && frame.face !== "neutral") set(faces[frame.face], frame.faceIntensity ?? 0.6);
      else if (!frame.face || frame.face === "neutral") set(supports("relaxed") ? "relaxed" : "happy",
        frame.preparingSpeech ? EXPRESSION.preparingSmile : EXPRESSION.idleSmile);
      const blinkCycle = Math.floor(elapsed / 4500);
      const blinkPhase = (elapsed - blinkCycle * 4500 - 2000 - randomAt(seed, blinkCycle + 1000) * 1200) / 160;
      set("blink", frame.blinkSuppressed || blinkPhase < 0 || blinkPhase > 1 ? 0 : Math.sin(blinkPhase * Math.PI));
      if (vrm.lookAt?.target?.position) {
        const gaze = frame.gaze, t = elapsed / 1000, glance = saccadeAt(t, seed);
        vrm.lookAt.target.position.set((gaze ? clamp(gaze.x, -1, 1) * MOTION.gazeX : 0) * height + glance.x * height,
          height * MOTION.gazeHeight + ((gaze ? clamp(gaze.y, -1, 1) * MOTION.gazeY : 0) + glance.y) * height, height * MOTION.gazeDistance);
      }
      if (frame.speechGesture && ["nod", "small_nod"].includes(frame.speechGesture.name) && bone("head")) {
        bone("head").rotation.x += Math.sin(clamp(frame.speechGesture.phase) * Math.PI) * MOTION.smallNod * facing;
      }
      vrm.update?.(delta);
    }
    return { update, playAction, stopAction, isAnimating: () => !!action,
      motionState: () => lastSmallMotion, capabilities: () => ({
        vowels: Object.values(vowels).every(supports), armGestures: bone("rightUpperArm") ? ["wave"] : [],
        fullBody: false, locomotion: false, faces: Object.keys(faces).filter(name => supports(faces[name])),
        actions: supportedActions.filter(name => !!bone(name === "wave" ? "rightUpperArm" : "head")), vrma: false
      }) };
  }

  function smoothCutoutEdges(scene, samples) {
    // MSAA alone smooths geometry, not alpha-tested hair/clothing textures.
    // Preserve authored colors/outlines and blended materials; soften only cutout coverage.
    scene.traverse(node => {
      for (const material of [].concat(node.material || [])) {
        if (material.alphaTest > 0 && !material.transparent && samples > 0) {
          material.alphaToCoverage = true;
          material.needsUpdate = true;
        }
      }
    });
  }

  function createRenderer(options = {}) {
    const vendor = options.vendor || root.XinyuVRMVendor;
    let vrm = null, driver = null, renderer = null, scene = null, camera = null, generation = 0;
    const canvas = options.canvas;
    let modelHeight = 1.6, hitAreas = [], loadMs = 0, loadedAt = 0, frames = 0;
    let projection = null;
    const hitBones = [
      ["head", "head", 0.075], ["neck", "hips", 0.10],
      ["leftUpperArm", "leftLowerArm", 0.045], ["leftLowerArm", "leftHand", 0.04],
      ["rightUpperArm", "rightLowerArm", 0.045], ["rightLowerArm", "rightHand", 0.04],
      ["hips", "leftUpperLeg", 0.09], ["hips", "rightUpperLeg", 0.09],
      ["leftUpperLeg", "leftLowerLeg", 0.06], ["leftLowerLeg", "leftFoot", 0.045],
      ["rightUpperLeg", "rightLowerLeg", 0.06], ["rightLowerLeg", "rightFoot", 0.045]
    ];
    function dispose() {
      generation += 1;
      driver?.stopAction();
      if (vrm) vendor.VRMUtils.deepDispose(vrm.scene);
      renderer?.dispose(); renderer?.forceContextLoss();
      vrm = driver = renderer = scene = camera = null;
      hitAreas = []; projection = null; frames = 0;
    }
    async function load(source = {}) {
      dispose();
      const mine = generation;
      const began = root.performance?.now?.() || 0;
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
      if (vrm.lookAt) { vrm.lookAt.target = new THREE.Object3D(); scene.add(vrm.lookAt.target); }
      camera = new THREE.PerspectiveCamera(CAMERA.fov, 1, 0.01, 100);
      const box = new THREE.Box3().setFromObject(vrm.scene);
      const height = Math.max(0.5, box.max.y - box.min.y);
      modelHeight = height; projection = new THREE.Vector3();
      const eye = vrm.humanoid?.getRawBoneNode?.("leftEye");
      const faceY = eye ? eye.getWorldPosition(projection).y : box.min.y + height * CAMERA.face;
      const framing = cameraFraming(box.min.y, height, faceY);
      camera.position.set(0, framing.cameraY, framing.distance);
      camera.lookAt(0, framing.targetY, 0);
      const preset = options.view === "full" ? LIGHT.room : LIGHT.pet;
      scene.add(new THREE.HemisphereLight(preset.sky, preset.ground, preset.ambient));
      for (const [position, color, intensity] of [
        [LIGHT.keyPosition, preset.keyColor, preset.key], [LIGHT.fillPosition, preset.fillColor, preset.fill],
        [LIGHT.rimPosition, preset.rimColor, preset.rim]
      ]) {
        const light = new THREE.DirectionalLight(color, intensity);
        light.position.set(height * position[0], box.min.y + height * position[1], height * position[2]);
        light.target.position.set(0, box.min.y + height * LIGHT.targetHeight, 0);
        light.castShadow = false; scene.add(light, light.target);
      }
      gradeRoomMaterials(vrm.scene, preset);
      renderer = new THREE.WebGLRenderer({ canvas, alpha: true, premultipliedAlpha: true, antialias: true, powerPreference: "low-power" });
      renderer.setClearColor(0x000000, 0);
      renderer.shadowMap.enabled = false;
      renderer.setPixelRatio(pixelRatioFor(canvas.clientWidth || 400, canvas.clientHeight || 600, root.devicePixelRatio || 1));
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      const gl = renderer.getContext();
      smoothCutoutEdges(vrm.scene, gl.getParameter(gl.SAMPLES));
      driver = createIntentDriver(vrm, source.mapping || {}, { height, seed: options.seed });
      loadedAt = root.performance?.now?.() || 0; loadMs = loadedAt - began;
    }
    function updateHitAreas(width, height) {
      const pixelsPerUnit = height / (2 * Math.tan(camera.fov * Math.PI / 360) * camera.position.z);
      const points = new Map();
      for (const [a, b] of hitBones) for (const name of [a, b]) {
        if (points.has(name)) continue;
        const node = vrm.humanoid?.getRawBoneNode?.(name);
        if (node) {
          node.getWorldPosition(projection); projection.project(camera);
          points.set(name, { x: (projection.x + 1) * width / 2, y: (1 - projection.y) * height / 2 });
        }
      }
      hitAreas = hitBones.flatMap(([a, b, radius]) => {
        const start = points.get(a), end = points.get(b);
        return start && end ? [{ ax: start.x, ay: start.y, bx: end.x, by: end.y, radius: radius * modelHeight * pixelsPerUnit }] : [];
      });
    }
    function update(frame) {
      if (!driver || !renderer) return;
      const width = Math.max(1, canvas.clientWidth || root.innerWidth || 400);
      const height = Math.max(1, canvas.clientHeight || root.innerHeight || 600);
      const ratio = pixelRatioFor(width, height, root.devicePixelRatio || 1);
      if (Math.abs(ratio - renderer.getPixelRatio()) > 0.001) renderer.setPixelRatio(ratio);
      if (canvas.width !== Math.floor(width * ratio) || canvas.height !== Math.floor(height * ratio)) {
        renderer.setSize(width, height, false); camera.aspect = width / height; camera.updateProjectionMatrix();
      }
      driver.update(frame); renderer.render(scene, camera); frames += 1;
      updateHitAreas(width, height);
    }
    function hitTest(x, y) {
      if (!vrm || !camera) return false;
      const rect = canvas.getBoundingClientRect();
      // Constant-size projected bone capsules, not per-triangle skinned mesh raycasts.
      return x >= rect.left && y >= rect.top && x <= rect.right && y <= rect.bottom
        && hitSegments(x - rect.left, y - rect.top, hitAreas);
    }
    return { kind: "vrm", load, dispose, update, hitTest,
      capabilities: () => driver?.capabilities() || { vowels: false, faces: [], actions: [], vrma: false },
      playAction: (...args) => driver?.playAction(...args) || false,
      stopAction: () => driver?.stopAction(),
      isAnimating: () => driver?.isAnimating() || false,
      metrics: () => ({ loadMs, loadedAt, frames, pixelRatio: renderer?.getPixelRatio(),
        antialias: renderer?.getContext().getContextAttributes()?.antialias,
        drawCalls: renderer?.info.render.calls, triangles: renderer?.info.render.triangles, smallMotion: driver?.motionState() }),
      // Reserved for a later animation loader; never silently fetch arbitrary files.
      loadAnimation: async () => false
    };
  }
  const api = { createRenderer, createIntentDriver, poseAt, smallMotionAt, randomAt,
    pixelRatioFor, cameraFraming, hitSegments, smoothCutoutEdges, saccadeAt, gradeRoomMaterials, STANCE, EXPRESSION, MOTION, QUALITY, CAMERA, LIGHT };
  root.XinyuVRMRenderer = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
