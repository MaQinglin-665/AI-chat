"use strict";
// Local-only official model, real Pixi/Core rendering, authenticated resource
// bridge, isolated deterministic inputs. Screenshots are never Git assets.
const fs = require("fs"), path = require("path"), http = require("http"), assert = require("assert/strict");
const repo = path.resolve(__dirname, ".."), output = process.env.AVATAR_QA_OUTPUT || path.join(repo, "tmp_ui_smoke/avatar-live2d-mao");
process.env.PLAYWRIGHT_BROWSERS_PATH ||= path.join(repo, ".local-tools/playwright-browsers");
const { chromium } = require(path.join(repo, "docs/node_modules/@playwright/test"));
const modelRoot = path.join(repo, "models_local/Mao"), manifest = JSON.parse(fs.readFileSync(path.join(modelRoot, "Mao.model3.json")));
const refs = manifest.FileReferences;
const allowed = new Set(["Mao.model3.json", refs.Moc, refs.Physics, refs.Pose, ...refs.Textures,
  ...refs.Expressions.map(x => x.File), ...Object.values(refs.Motions).flat().map(x => x.File)]);
const html = `<!doctype html><meta charset="utf-8"><title>馨语桌宠 · Mao 接入验证</title>
<style>body{margin:0;background:#ede7f0;color:#30283a;font:18px system-ui}canvas{position:absolute;inset:0}aside{position:absolute;left:28px;top:20px;width:340px;z-index:1;line-height:1.7}h1{font-size:26px}output{white-space:pre-wrap}footer{position:absolute;bottom:12px;left:28px;font-size:12px;max-width:360px}</style>
<canvas id="live2d-canvas"></canvas><aside><h1>馨语桌宠 · Mao</h1><p>阶段 3 · 官方模型本机接入<br>统一意图入口 / 原有 Pixi 时钟</p><output id="status">加载中…</output></aside><footer>模型 © Live2D Inc. / Mao Niziiro<br>使用遵循 Live2D Free Material License 与 Sample Model Terms。此处是本地独立验证场景。</footer>
<script>window.virtualNow=1000;Object.defineProperty(performance,'now',{value:()=>virtualNow});window.requestAnimationFrame=()=>1;window.cancelAnimationFrame=()=>{};
window.authFetch=(url,options={})=>fetch(url,{...options,headers:{...options.headers,'X-Local-Model-Test':'authenticated'}});</script>
${["vendor/pixi.min.js", "vendor/pixi-unsafe-eval.min.js", "vendor/live2dcubismcore.min.js", "vendor/cubism4.min.js", "avatar/live2dMapping.js", "avatar/vowelEstimator.js", "avatar/browserLipSync.js", "avatar/live2dAssets.js", "avatar/live2dModelDriver.js", "live2dExpressionController.js", "ttsPlaybackController.js", "live2dRuntimeController.js", "avatar/live2dRenderer.js", "avatar/avatarRuntime.js"].map(f => `<script src="/${f}"></script>`).join("")}
<script>(async()=>{try{
const state={uiView:'full',config:{},baseTransform:{x:780,y:450,rotation:0},availableMotionGroups:[],ttsAudioLevel:0};
const controller=TaffyLive2DRuntimeController.createController({state,windowObject:window,documentObject:document,setModelMotionDefinitions(m){state.availableMotionGroups=Object.keys(m.internalModel.motionManager.definitions);},
 placeModel(){const m=state.model;m.anchor.set(.5,.5);m.scale.set(Math.min(570/m.width,820/m.height));m.position.set(780,450);state.baseTransform={x:780,y:450,rotation:0};},setStatus(t){document.getElementById('status').textContent=t;}});
state.avatarSource={kind:'live2d',path:'/api/avatar/live2d/Mao.model3.json',mapping:'/avatar/mappings/mao.json'};
await controller.initLive2D();if(!state.model)throw Error('Mao load failed');state.pixiApp.stop();
const core=state.model.internalModel.coreModel;
let renderedValues;const coreUpdate=core._model.update.bind(core._model);core._model.update=()=>{
 renderedValues=Object.fromEntries(core._model.parameters.ids.map((id,i)=>[id,core._model.parameters.values[i]]));return coreUpdate();};
window.QA={state,core,async capture(frame,label){
 state.avatarRenderer.stopAction();state.model.internalModel.motionManager.stopAllMotions();
 window.dispatchEvent(new CustomEvent('avatar-intent',{detail:{frame}}));
 for(let i=0;i<45;i++){virtualNow+=1000/60;state.model.update(1000/60);state.pixiApp.renderer.render(state.pixiApp.stage);}
 state.pixiApp.renderer.render(state.pixiApp.stage);document.getElementById('status').textContent='Core 06.00.0001\\n'+label+'\\n真实模型 / 显式测试意图';
 return renderedValues;
},async motion(name){
 state.avatarRenderer.stopAction();
 let pending;const original=state.model.motion;state.model.motion=function(...args){return pending=original.apply(this,args);};
 try{if(!state.avatarRenderer.playAction(name)||!await pending)throw Error('motion failed '+name);
 for(let i=0;i<25;i++){virtualNow+=1000/60;state.model.update(1000/60);state.pixiApp.renderer.render(state.pixiApp.stage);}return true;}
 finally{state.model.motion=original;}
},async browserPlayback(){
 const oldGetter=window.getSpeechAnimationMouthOpen;let utterance;
 const synthesis={speaking:false,resume(){},cancel(){this.speaking=false;},speak(value){utterance=value;this.speaking=true;}};
 const host={speechSynthesis:synthesis,setTimeout:()=>0,clearTimeout(){},XinyuBrowserLipSync};
 const mouth=TaffyLive2DExpressionController.createController({state,windowObject:host,performanceObject:performance,isSpeakingNow:()=>synthesis.speaking,isSpeechMotionActive:()=>synthesis.speaking});
 const playback=TaffyTTSPlaybackController.createController({state,windowObject:host,performanceObject:performance,
  isCurrentTTSPlaybackGeneration:value=>value===state.ttsPlaybackGeneration,buildSpeakProsody:()=>({}),
  beginSpeechAnimation:(text,mood,style)=>mouth.beginSpeechAnimation(text,mood,style,{durationMs:500}),
  finishSpeechAnimation:mouth.finishSpeechAnimation,endSpeechAnimation:mouth.endSpeechAnimation});
 const tick=()=>{virtualNow+=1000/60;state.model.update(1000/60);state.pixiApp.renderer.render(state.pixiApp.stage);return renderedValues.ParamA;};
 window.getSpeechAnimationMouthOpen=mouth.getSpeechAnimationMouthOpen;
 window.dispatchEvent(new CustomEvent('avatar-intent',{detail:{frame:{}}}));
 state.ttsPlaybackGeneration=42;state.speakingEnabled=true;
 try{
  const pending=playback.speakOnceWithVoice('Long actual speech, short animation estimate.',null,{force:true,playbackGeneration:42});
  const pendingMouth=tick();utterance.onstart();const guardedMouth=tick();
  virtualNow+=4000;const tail=[];for(let i=0;i<80;i++)tail.push(tick());
  utterance.onpause();const pausedMouth=tick();virtualNow+=500;utterance.onresume();
  synthesis.speaking=false;utterance.onend();const endedMouth=tick();await pending;
  return {pendingMouth,guardedMouth,tailVariation:Math.max(...tail)-Math.min(...tail),pausedMouth,endedMouth};
 }finally{window.getSpeechAnimationMouthOpen=oldGetter;}
}};
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
      const values = await page.evaluate(vowel => QA.capture({ mouth: { open: .85, vowel } }, "五元音嘴型：" + vowel.toUpperCase()), vowel);
      for (const other of ["a", "i", "u", "e", "o"]) assert.equal(values["Param" + other.toUpperCase()], other === vowel ? Math.fround(.85) : 0);
      await page.screenshot({ path: path.join(output, `vowel-${vowel}.png`) }); evidence.cases.push({ name: `vowel-${vowel}`, values });
    }
    for (const face of ["neutral", "happy", "sleepy", "smug", "sad", "shy", "surprised", "angry"]) {
      const values = await page.evaluate(face => QA.capture({ face, faceIntensity: 1, mouth: { open: 0, vowel: null } }, "官方表情映射：" + face), face);
      await page.screenshot({ path: path.join(output, `face-${face}.png`) }); evidence.cases.push({ name: `face-${face}`, values });
    }
    for (const gesture of ["open_explain", "wave", "light_lift"]) {
      const values = await page.evaluate(name => QA.capture({ face: "happy", faceIntensity: .5, mouth: { open: 0 }, speechGesture: { name, phase: .5 } }, "手臂手势：" + name), gesture);
      await page.screenshot({ path: path.join(output, `gesture-${gesture}.png`) }); evidence.cases.push({ name: `gesture-${gesture}`, values });
    }
    evidence.browserTtsFallback = await page.evaluate(async () => {
      QA.state.speechMouthOpen = .6; QA.state.ttsAudioLevel = 0;
      const browser = await QA.capture({}, '无频谱浏览器语音张合回退');
      QA.state.ttsAudioAnalyser = {};
      const silence = await QA.capture({}, '有音频分析时静音闭嘴');
      delete QA.state.ttsAudioAnalyser; QA.state.speechMouthOpen = 0;
      return { browserOpen: browser.ParamA, analysedSilence: silence.ParamA };
    });
    assert.equal(evidence.browserTtsFallback.browserOpen, Math.fround(.6));
    assert.equal(evidence.browserTtsFallback.analysedSilence, 0);
    evidence.motions = [];
    for (const name of ["sentence_release", "thoughtful_glance", "nod", "happy_bounce", "attentive_tilt", "speak_emphasis", "poked", "shy_glance"]) {
      assert.equal(await page.evaluate(name => QA.motion(name), name), true); evidence.motions.push(name);
    }
    evidence.browserPlayback = await page.evaluate(() => QA.browserPlayback());
    assert.equal(evidence.browserPlayback.pendingMouth, 0);
    assert.equal(evidence.browserPlayback.guardedMouth, 0);
    assert.ok(evidence.browserPlayback.tailVariation > .3);
    assert.equal(evidence.browserPlayback.pausedMouth, 0);
    assert.equal(evidence.browserPlayback.endedMouth, 0);
    await page.evaluate(() => { QA.state.avatarRuntime.dispose(); QA.state.avatarRuntime.dispose(); });
    assert.deepEqual(evidence.errors, []); evidence.authorizedResources = authorized; evidence.unauthorizedRejected = rejected;
    fs.writeFileSync(path.join(output, "mao-evidence.json"), JSON.stringify(evidence, null, 2));
    console.log(JSON.stringify({ captures: evidence.cases.length, authorizedResources: authorized, unauthorizedRejected: rejected, errors: evidence.errors }));
  } finally { await browser.close(); server.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; server.close(); });
