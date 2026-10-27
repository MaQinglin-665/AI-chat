"use strict";
// Local-only official model, real Pixi/Core rendering, authenticated resource
// bridge, isolated deterministic inputs. Screenshots are never Git assets.
const fs = require("fs"), path = require("path"), http = require("http"), assert = require("assert/strict");
const repo = path.resolve(__dirname, ".."), output = process.env.AVATAR_QA_OUTPUT || path.join(repo, "tmp_ui_smoke/avatar-live2d-mao");
process.env.PLAYWRIGHT_BROWSERS_PATH ||= path.join(repo, ".local-tools/playwright-browsers");
const { chromium } = require(path.join(repo, "docs/node_modules/@playwright/test"));
const modelRoot = path.join(repo, "models_local/Mao"), manifest = JSON.parse(fs.readFileSync(path.join(modelRoot, "Mao.model3.json")));
const mapping = JSON.parse(fs.readFileSync(path.join(repo, "web/avatar/mappings/mao.json")));
const refs = manifest.FileReferences;
const allowed = new Set(["Mao.model3.json", refs.Moc, refs.Physics, refs.Pose, ...refs.Textures,
  ...refs.Expressions.map(x => x.File), ...Object.values(refs.Motions).flat().map(x => x.File)]);
const html = `<!doctype html><meta charset="utf-8"><title>馨语桌宠 · Mao 接入验证</title>
<style>body{margin:0;background:#ede7f0;color:#30283a;font:18px system-ui}canvas{position:absolute;inset:0}aside{position:absolute;left:28px;top:20px;width:340px;z-index:1;line-height:1.7}h1{font-size:26px}output{white-space:pre-wrap}footer{position:absolute;bottom:12px;left:28px;font-size:12px;max-width:360px}</style>
<canvas id="live2d-canvas"></canvas><canvas id="mouth-zoom" width="270" height="210" style="display:none;inset:auto;left:28px;top:340px;border:1px solid #a99eaf"></canvas><aside><h1>馨语桌宠 · Mao</h1><p>Mao 官方模型本机接入验收<br>统一意图入口 / 原有 Pixi 时钟</p><output id="status">加载中…</output></aside><footer>模型 © Live2D Inc. / Mao Niziiro<br>使用遵循 Live2D Free Material License 与 Sample Model Terms。此处是本地独立验证场景。</footer>
<script>window.virtualNow=1000;Object.defineProperty(performance,'now',{value:()=>virtualNow});window.requestAnimationFrame=()=>1;window.cancelAnimationFrame=()=>{};
window.authFetch=(url,options={})=>fetch(url,{...options,headers:{...options.headers,'X-Local-Model-Test':'authenticated'}});
window.qaResources={blobs:new Set(),channels:new Set(),listeners:new Map()};
const createBlob=URL.createObjectURL.bind(URL),revokeBlob=URL.revokeObjectURL.bind(URL);
URL.createObjectURL=value=>{const url=createBlob(value);qaResources.blobs.add(url);return url;};
URL.revokeObjectURL=url=>{qaResources.blobs.delete(url);revokeBlob(url);};
const NativeChannel=BroadcastChannel;window.BroadcastChannel=class extends NativeChannel{
 constructor(...args){super(...args);qaResources.channels.add(this);}close(){qaResources.channels.delete(this);super.close();}};
const add=window.addEventListener.bind(window),remove=window.removeEventListener.bind(window);
window.addEventListener=(name,fn,...args)=>{if(['resize','avatar-intent','beforeunload'].includes(name)){
 if(!qaResources.listeners.has(name))qaResources.listeners.set(name,new Set());qaResources.listeners.get(name).add(fn);}return add(name,fn,...args);};
window.removeEventListener=(name,fn,...args)=>{qaResources.listeners.get(name)?.delete(fn);return remove(name,fn,...args);};</script>
${["vendor/pixi.min.js", "vendor/pixi-unsafe-eval.min.js", "vendor/live2dcubismcore.min.js", "vendor/cubism4.min.js", "avatar/live2dMapping.js", "avatar/vowelEstimator.js", "avatar/live2dAssets.js", "avatar/live2dModelDriver.js", "live2dLayoutController.js", "live2dRuntimeController.js", "avatar/live2dRenderer.js", "avatar/avatarRuntime.js"].map(f => `<script src="/${f}"></script>`).join("")}
<script>(async()=>{try{
const state={uiView:'full',config:{},baseTransform:{x:780,y:450,rotation:0},availableMotionGroups:[],ttsAudioLevel:0};
const layout=TaffyLive2DLayoutController.createController({state,windowObject:window,documentObject:document,performanceObject:performance});
const controller=TaffyLive2DRuntimeController.createController({state,windowObject:window,documentObject:document,setModelMotionDefinitions(m){state.availableMotionGroups=Object.keys(m.internalModel.motionManager.definitions);},
 attachDrag:layout.attachDrag,
 placeModel(){const m=state.model;m.anchor.set(.5,.5);m.scale.set(Math.min(570/m.width,820/m.height));m.position.set(780,450);state.baseTransform={x:780,y:450,rotation:0};},setStatus(t){document.getElementById('status').textContent=t;}});
state.avatarSource={kind:'live2d',path:'/api/avatar/live2d/Mao.model3.json',mapping:'/avatar/mappings/mao.json'};
await controller.initLive2D();if(!state.model)throw Error('Mao load failed');state.pixiApp.stop();
const core=state.model.internalModel.coreModel;
const writes=[];
for(const method of ['setParameterValueById','addParameterValueById','multiplyParameterValueById','setPartOpacityById']){
 const original=core[method];core[method]=function(...args){writes.push({method,args});return original.apply(this,args);};
}
let renderedValues;const coreUpdate=core._model.update.bind(core._model);core._model.update=()=>{
 renderedValues=Object.fromEntries(core._model.parameters.ids.map((id,i)=>[id,core._model.parameters.values[i]]));return coreUpdate();};
window.QA={state,core,step(frame,label){
 window.dispatchEvent(new CustomEvent('avatar-intent',{detail:{frame}}));
 for(let i=0;i<3;i++){virtualNow+=1000/60;state.model.update(1000/60);state.pixiApp.renderer.render(state.pixiApp.stage);}
 const zoom=document.getElementById('mouth-zoom');zoom.style.display=frame.mode==='speak'?'block':'none';
 if(frame.mode==='speak')zoom.getContext('2d').drawImage(state.pixiApp.view,735,225,90,70,0,0,270,210);
 document.getElementById('status').textContent=label+'\\n真实 Pixi/Core · 受控意图录像';
 return {x:state.model.x,y:state.model.y,dragging:!!state.dragData};
},async capture(frame,label){
 state.avatarRenderer.stopAction();state.model.internalModel.motionManager.stopAllMotions();
 window.dispatchEvent(new CustomEvent('avatar-intent',{detail:{frame}}));
 for(let i=0;i<45;i++){writes.length=0;virtualNow+=1000/60;state.model.update(1000/60);state.pixiApp.renderer.render(state.pixiApp.stage);}
 state.pixiApp.renderer.render(state.pixiApp.stage);document.getElementById('status').textContent='Core 06.00.0001\\n'+label+'\\n真实模型 / 显式测试意图';
 return {values:renderedValues,writes:[...writes]};
},async motion(name){
 state.avatarRenderer.stopAction();
 let pending;const original=state.model.motion;state.model.motion=function(...args){return pending=original.apply(this,args);};
 try{if(!state.avatarRenderer.playAction(name)||!await pending)throw Error('motion failed '+name);
 for(let i=0;i<25;i++){virtualNow+=1000/60;state.model.update(1000/60);state.pixiApp.renderer.render(state.pixiApp.stage);}return true;}
 finally{state.model.motion=original;}
},async waveAction(){
 state.avatarRenderer.stopAction();window.dispatchEvent(new CustomEvent('avatar-intent',{detail:{frame:{mouth:{open:0}}}}));
 if(!state.avatarRenderer.playAction('wave'))throw Error('wave action unsupported');
 const samples=[];
 for(let i=0;i<120;i++){virtualNow+=1000/60;state.model.update(1000/60);state.pixiApp.renderer.render(state.pixiApp.stage);samples.push(renderedValues.ParamArmRA01);}
 state.avatarRenderer.playAction('wave');virtualNow+=400;state.model.update(1000/60);state.pixiApp.renderer.render(state.pixiApp.stage);
 const beforeStop=renderedValues.ParamArmRA01;state.avatarRenderer.stopAction();virtualNow+=1000/60;state.model.update(1000/60);state.pixiApp.renderer.render(state.pixiApp.stage);
 return {samples,beforeStop,afterStop:renderedValues.ParamArmRA01};
},async switchConfig(kind){
 const previousModel=state.model,previousApp=state.pixiApp;
 delete state.avatarSource;
 state.config=kind==='mao'?{avatar:{kind:'live2d',path:'/api/avatar/live2d/Mao.model3.json',mapping:'web/avatar/mappings/mao.json'}}
 :{model_path:'/models/hiyori_pro_t11/hiyori_pro_t11.model3.json'};
 const runtime=await controller.initLive2D();
 if(!runtime||!state.model)throw Error('configuration switch failed: '+kind);
 state.pixiApp.stop();virtualNow+=1000/60;state.model.update(1000/60);state.pixiApp.renderer.render(state.pixiApp.stage);
 document.querySelector('h1').textContent='配置切换 · '+kind;
 document.querySelector('aside p').textContent=kind==='mao'?'明确 avatar 配置 / 官方 Mao':'旧 model_path 配置 / Hiyori';
 document.querySelector('footer').textContent='模型 © Live2D Inc. / '+(kind==='mao'?'Mao Niziiro':'Hiyori')+' · 官方示例素材，仅本地验收，程序与适配实现由团队开发';
 return {mapping:state.avatarMapping.id,capabilities:state.avatarRenderer.capabilities(),
 oldModelDestroyed:previousModel.transform===null,oldAppDestroyed:previousApp.renderer===null,
 blobs:qaResources.blobs.size,channels:qaResources.channels.size,
 listeners:Object.fromEntries([...qaResources.listeners].map(([name,set])=>[name,set.size]))};
},dispose(){state.avatarRuntime.dispose();state.avatarRuntime.dispose();return {
 blobs:qaResources.blobs.size,channels:qaResources.channels.size,model:state.model,
 listeners:Object.fromEntries([...qaResources.listeners].map(([name,set])=>[name,set.size]))};}};
window.QAReady=true;
}catch(e){window.QAError=e.stack;console.error(e);}})();</script>`;
let authorized = 0, rejected = 0;
const server = http.createServer((req, res) => {
  const url = new URL(req.url, "http://127.0.0.1"), name = decodeURIComponent(url.pathname);
  if (name === "/qa") { res.setHeader("Content-Type", "text/html; charset=utf-8"); res.end(html); return; }
  let file;
  if (name.startsWith("/api/avatar/live2d/")) {
    if (req.headers["x-local-model-test"] !== "authenticated") { rejected++; res.writeHead(401); res.end(); return; }
    const relative = name.slice("/api/avatar/live2d/".length);
    if (!allowed.has(relative)) { res.writeHead(404); res.end(); return; }
    authorized++; file = path.join(modelRoot, relative);
  } else {
    file = path.resolve(repo, "web", name.slice(1));
    if (!file.startsWith(path.join(repo, "web") + path.sep)) { res.writeHead(404); res.end(); return; }
  }
  if (!fs.existsSync(file)) { res.writeHead(404); res.end(); return; }
  res.setHeader("Content-Type", ({ ".js": "application/javascript", ".json": "application/json", ".png": "image/png" })[path.extname(file)] || "application/octet-stream");
  fs.createReadStream(file).pipe(res);
});
(async () => {
  fs.mkdirSync(output, { recursive: true }); await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  const browser = await chromium.launch({ headless: true, args: ["--use-angle=swiftshader", "--enable-webgl", "--ignore-gpu-blocklist"] });
  const evidence = { kind: "local-isolated-real-model", cases: [], errors: [] };
  try {
    const page = await browser.newPage({ viewport: { width: 1200, height: 900 } });
    page.on("console", msg => { if (msg.type() === "error" || msg.type() === "warning") console.log(msg.type(), msg.text()); });
    page.on("pageerror", e => evidence.errors.push(e.message));
    await page.goto(`http://127.0.0.1:${server.address().port}/qa`);
    await page.waitForFunction(() => window.QAReady || window.QAError, null, { timeout: 45000, polling: 100 });
    const error = await page.evaluate(() => window.QAError); assert.equal(error, undefined, error);
    // A direct unauthenticated model request must still fail.
    assert.equal(await page.evaluate(async () => (await fetch('/api/avatar/live2d/Mao.moc3')).status), 401);
    for (const vowel of ["a", "i", "u", "e", "o"]) {
      const { values } = await page.evaluate(vowel => QA.capture({ mouth: { open: .85, vowel } }, "五元音嘴型：" + vowel.toUpperCase()), vowel);
      for (const other of ["a", "i", "u", "e", "o"]) assert.equal(values["Param" + other.toUpperCase()], other === vowel ? Math.fround(.85) : 0);
      await page.screenshot({ path: path.join(output, `vowel-${vowel}.png`) }); evidence.cases.push({ name: `vowel-${vowel}`, values });
    }
    evidence.mouthFallback = [];
    for (const mouth of [{ open: .65, vowel: null }, { open: .65, vowel: "unknown" }, { open: 0, vowel: "i" }]) {
      const { values } = await page.evaluate(mouth => QA.capture({ mouth }, "静音 / 无可靠元音回退"), mouth);
      for (const other of ["a", "i", "u", "e", "o"]) assert.equal(values["Param" + other.toUpperCase()], other === "a" ? Math.fround(mouth.open) : 0);
      evidence.mouthFallback.push({ mouth, values });
    }
    for (const face of ["neutral", "happy", "sleepy", "smug", "sad", "shy", "surprised", "angry"]) {
      const { values, writes } = await page.evaluate(face => QA.capture({ face, faceIntensity: 1, mouth: { open: 0, vowel: null } }, "官方表情映射：" + face), face);
      const expression = refs.Expressions.find(item => item.Name === mapping.faces[face]);
      assert.ok(expression, `${face}: official expression must exist`);
      const parameters = JSON.parse(fs.readFileSync(path.join(modelRoot, expression.File))).Parameters;
      for (const item of parameters) {
        const method = item.Blend === "Multiply" ? "multiplyParameterValueById" : item.Blend === "Overwrite" ? "setParameterValueById" : "addParameterValueById";
        assert.ok(writes.some(write => write.method === method && write.args[0] === item.Id && write.args[1] === item.Value), `${face}: ${item.Id} must use official ${item.Blend} and value`);
        assert.ok(Object.hasOwn(values, item.Id), `${face}: ${item.Id} must exist in actual Core`);
      }
      await page.screenshot({ path: path.join(output, `face-${face}.png`) }); evidence.cases.push({ name: `face-${face}`, expression: expression.Name, checkedParameters: parameters.length, values });
    }
    for (const gesture of ["open_explain", "wave", "light_lift"]) {
      const { values } = await page.evaluate(name => QA.capture({ face: "happy", faceIntensity: .5, mouth: { open: 0 }, speechGesture: { name, phase: .5 } }, "手臂手势：" + name), gesture);
      await page.screenshot({ path: path.join(output, `gesture-${gesture}.png`) }); evidence.cases.push({ name: `gesture-${gesture}`, values });
    }
    evidence.motions = [];
    evidence.parameterRanges = await page.evaluate(() => {
      const p=QA.core._model.parameters;
      return Object.fromEntries(p.ids.map((id,i)=>[id,{min:p.minimumValues[i],max:p.maximumValues[i],default:p.defaultValues[i]}]));
    });
    evidence.gesturePhases = [];
    const armIds = ["armL1", "armL2", "armL3", "armR1", "armR2", "armR3"].map(alias => mapping.params[alias]);
    for (const name of ["open_explain", "wave", "light_lift"]) {
      const phases = [];
      for (const phase of [0, .25, .5, .75, 1]) {
        const { values } = await page.evaluate(([name, phase]) => QA.capture({ mouth: { open: 0 }, speechGesture: { name, phase } }, "手势起落：" + name), [name, phase]);
        const arms = armIds.map(id => values[id]);
        arms.forEach((value, i) => {
          const range = evidence.parameterRanges[armIds[i]];
          assert.ok(Number.isFinite(value) && value >= range.min && value <= range.max, `${name}: real arm range`);
          if (phase === 0 || phase === 1) assert.ok(Math.abs(value) < 1e-6, `${name}: arms return to rest`);
        });
        if (phase === .5) assert.ok(arms.some(value => Math.abs(value) > 1), `${name}: actual arms must move`);
        phases.push({ phase, arms });
      }
      evidence.gesturePhases.push({ name, phases });
    }
    assert.notDeepEqual(evidence.gesturePhases[0].phases[2].arms, evidence.gesturePhases[2].phases[2].arms, "explain and light lift have different amplitudes");
    for (const name of ["sentence_release", "thoughtful_glance", "nod", "happy_bounce", "attentive_tilt", "speak_emphasis", "poked", "shy_glance"]) {
      assert.equal(await page.evaluate(name => QA.motion(name), name), true); evidence.motions.push(name);
    }
    evidence.waveAction = await page.evaluate(() => QA.waveAction());
    assert.ok(Math.max(...evidence.waveAction.samples) > 20, "wave action raises actual arm");
    assert.ok(Math.abs(evidence.waveAction.samples.at(-1)) < 1e-6, "wave expires and releases arm");
    assert.ok(evidence.waveAction.beforeStop > 1); assert.ok(Math.abs(evidence.waveAction.afterStop) < 1e-6, "stopAction releases arm on next original Pixi update");
    if (process.argv.includes("--record")) {
      const framesDir = path.join(output, "recording"); fs.mkdirSync(framesDir, { recursive: true });
      evidence.recording = { fps: 20, frames: 800, duration: 40, scope: "Isolated real-model controlled input; audio is an aligned local demonstration track, not native speech recognition/latency evidence.", drag: [] };
      for (let index = 0; index < 800; index++) {
        const t = index / 20;
        let label = "idle / 待机", frame = { mode: "idle", face: "neutral", mouth: { open: 0 }, gaze: null };
        if (t >= 4 && t < 8) { label = "listen / 倾听"; frame.mode = "listen"; frame.gaze = { x: .3, y: .1 }; }
        else if (t >= 8 && t < 12) { label = "think / 思考"; frame.mode = "think"; frame.face = "thinking"; }
        else if (t >= 12 && t < 22) {
          const vowel = ["a", "i", "u", "e", "o"][Math.floor((t - 12) / 2)];
          label = "speak / 五元音 " + vowel.toUpperCase(); frame.mode = "speak";
          frame.mouth = { open: .3 + .6 * Math.abs(Math.sin((t - 12) * Math.PI * 3)), vowel };
        } else if (t >= 22 && t < 28) {
          const name = ["open_explain", "wave", "light_lift"][Math.floor((t - 22) / 2)];
          label = "gesture / " + name; frame.speechGesture = { name, phase: ((t - 22) % 2) / 2 };
        } else if (t >= 28 && t < 32) {
          frame.face = ["neutral", "happy", "sleepy", "smug", "sad", "shy", "surprised", "angry"][Math.floor((t - 28) * 2)];
          frame.faceIntensity = 1; label = "face / " + frame.face;
        } else if (t >= 32 && t < 36) {
          label = "drag / 原有拖拽逻辑";
          if (index === 640) { await page.mouse.move(780, 400); await page.mouse.down(); }
          await page.mouse.move(780 + 80 * Math.sin((t - 32) * Math.PI / 4), 400 + 25 * Math.sin((t - 32) * Math.PI / 2));
        } else if (t >= 36) {
          if (index === 720) await page.mouse.up();
          label = "restore / 松手恢复"; frame.gaze = { x: 0, y: 0 };
        }
        const sample = await page.evaluate(([frame, label]) => QA.step(frame, label), [frame, label]);
        if (t >= 32) evidence.recording.drag.push({ t, ...sample });
        await page.screenshot({ path: path.join(framesDir, `frame-${String(index).padStart(4, "0")}.jpg`), type: "jpeg", quality: 85 });
      }
      assert.ok(evidence.recording.drag.some(p => p.dragging), "recording exercised actual pointer drag");
      assert.ok(Math.max(...evidence.recording.drag.map(p => p.x)) - Math.min(...evidence.recording.drag.map(p => p.x)) > 20, "model actually moved");
      assert.equal(evidence.recording.drag.at(-1).dragging, false, "released after recording drag");
    }
    evidence.switches = [];
    for (const kind of ["hiyori", "mao", "hiyori", "mao"]) {
      const result = await page.evaluate(kind => QA.switchConfig(kind), kind);
      assert.equal(result.mapping, kind); assert.equal(result.capabilities.vowels, kind === "mao");
      assert.equal(result.oldModelDestroyed, true); assert.equal(result.oldAppDestroyed, true);
      assert.equal(result.channels, 1); assert.equal(result.listeners["avatar-intent"], 1); assert.equal(result.listeners.beforeunload, 1);
      if (kind === "hiyori") assert.equal(result.blobs, 0, "Mao blobs freed when returning to legacy Hiyori");
      else assert.ok(result.blobs > 0, "Mao config reload uses authenticated private blobs");
      await page.screenshot({ path: path.join(output, `switch-${evidence.switches.length + 1}-${kind}.png`) });
      evidence.switches.push({ kind, ...result });
    }
    evidence.cleanup = await page.evaluate(() => QA.dispose());
    assert.equal(evidence.cleanup.blobs, 0); assert.equal(evidence.cleanup.channels, 0); assert.equal(evidence.cleanup.model, null);
    assert.equal(evidence.cleanup.listeners["avatar-intent"], 0); assert.equal(evidence.cleanup.listeners.beforeunload, 0);
    assert.deepEqual(evidence.errors, []); evidence.authorizedResources = authorized; evidence.unauthorizedRejected = rejected;
    fs.writeFileSync(path.join(output, "mao-evidence.json"), JSON.stringify(evidence, null, 2));
    console.log(JSON.stringify({ captures: evidence.cases.length + evidence.switches.length, configSwitches: evidence.switches.length,
      authorizedResources: authorized, unauthorizedRejected: rejected, errors: evidence.errors }));
  } finally { await browser.close(); server.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; server.close(); });
