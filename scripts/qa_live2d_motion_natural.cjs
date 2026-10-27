"use strict";
// Isolated local official-model review. Never loads user config, app routes,
// dialogue, memory or the brain executor. Audio is prepared separately with SAPI.
const fs = require("node:fs"), path = require("node:path"), http = require("node:http"), assert = require("node:assert/strict"), cp = require("node:child_process");
const repo = path.resolve(__dirname, ".."), out = path.resolve(process.env.AVATAR_QA_OUTPUT || path.join(repo, "tmp_ui_smoke/live2d-motion-natural"));
const reference = process.env.LIVE2D_BASELINE_REF || "5669e8a";
assert.match(reference, /^[a-f0-9]{7,40}$/);
const sourceFiles = new Set(["avatar/live2dRenderer.js", "avatar/live2dGestures.js", "avatar/mappings/hiyori.json", "avatar/mappings/mao.json", "hiyoriPerformanceDirector.js", "live2dExpressionController.js", "live2dRuntimeController.js"]);
const before = new Map([...sourceFiles].map(file => [file, cp.execFileSync("git", ["show", `${reference}:web/${file}`], { cwd: repo })]));
process.env.PLAYWRIGHT_BROWSERS_PATH ||= path.join(repo, ".local-tools/playwright-browsers");
const { chromium } = require(path.join(repo, "docs/node_modules/@playwright/test"));
const smoke = process.argv.includes("--smoke"), selected = process.env.LIVE2D_QA_MODEL;
const models = selected ? [selected] : ["hiyori", "mao"];
assert.ok(models.every(m => ["hiyori", "mao"].includes(m)));
const timeline = JSON.parse(fs.readFileSync(path.join(out, "timeline.json"), "utf8"));
const modelRoot = path.join(repo, "models_local/Mao"), manifest = JSON.parse(fs.readFileSync(path.join(modelRoot, "Mao.model3.json")));
const refs = manifest.FileReferences;
const allowed = new Set(["Mao.model3.json", refs.Moc, refs.Physics, refs.Pose, ...refs.Textures,
  ...refs.Expressions.map(x => x.File), ...Object.values(refs.Motions).flat().map(x => x.File)].filter(Boolean));
function html(model, baseline) {
  return `<!doctype html><meta charset="utf-8"><title>Live2D 动作自然化对照</title>
<style>body{margin:0;background:#eeeaf2;color:#332d3b;font:17px system-ui}canvas{position:absolute;inset:0}aside{position:absolute;left:24px;top:20px;width:300px;z-index:1;line-height:1.7}h1{font-size:25px;margin:0}h2{font-size:21px;margin-top:12px}output{white-space:pre-wrap;font-variant-numeric:tabular-nums}footer{position:absolute;bottom:14px;left:24px;width:330px;font-size:12px;line-height:1.6}#clock{margin-top:12px}</style>
<canvas id="live2d-canvas"></canvas><canvas id="zoom" width="300" height="240" style="inset:auto;left:24px;top:300px;border:1px solid #c7bfd0"></canvas><aside><h1>馨语桌宠 · ${model === "mao" ? "Mao" : "Hiyori"}</h1><h2>${baseline ? "修改前 · main 5669e8a" : "修改后 · 自然化叠加"}</h2><output id="scene">加载中…</output><div id="clock"></div><output id="numbers"></output><p style="font-size:13px;margin-top:25px">头部细节（右侧同一画面放大）</p></aside>
<footer>模型 © Live2D Inc. / 官方示例<br>遵循 Free Material License 与 Sample Model Terms。<br>真实 Pixi/Core / 60Hz受控输入 · 本机SAPI音轨<br>口型来自同一音轨RMS；非原生设备时延测量。</footer>
<script>window.virtualNow=1000;Object.defineProperty(performance,'now',{value:()=>virtualNow});Date.now=()=>1793090000000+virtualNow;
let seed=8673;Math.random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
window.requestAnimationFrame=()=>1;window.cancelAnimationFrame=()=>{};
const nativeFetch=fetch.bind(window);window.fetch=(url,options)=>nativeFetch(${baseline ? "typeof url==='string'&&url.startsWith('/')&&!url.startsWith('/before/')?'/before'+url:url" : "url"},options);
window.authFetch=(url,options={})=>fetch(url,{...options,headers:{...options.headers,'X-Local-Model-Test':'authenticated'}});
</script>
${["vendor/pixi.min.js", "vendor/pixi-unsafe-eval.min.js", "vendor/live2dcubismcore.min.js", "vendor/cubism4.min.js", "avatar/live2dMapping.js", "avatar/browserLipSync.js", "avatar/live2dAssets.js", "avatar/live2dModelDriver.js", "avatar/live2dGestures.js", "hiyoriPerformanceDirector.js", "live2dExpressionController.js", "live2dLayoutController.js", "live2dRuntimeController.js", "avatar/live2dRenderer.js", "avatar/avatarRuntime.js"].map(file => `<script src="/${baseline ? "before/" : ""}${file}"></script>`).join("")}
<script>(async()=>{try{
const kind=${JSON.stringify(model)},timeline=${JSON.stringify(timeline)};
const state={uiView:'full',config:{},modelProfileName:kind==='hiyori'?'hiyori_pro_t11':'mao',baseTransform:{x:650,y:365,rotation:0},availableMotionGroups:[],ttsAudioLevel:0,
expressionEnabled:true,expressionStrength:1,motionEnabled:true,ttsPlaybackGeneration:1,speechMouthOpen:0,currentTalkStyle:'neutral'};
const expression=TaffyLive2DExpressionController.createController({state,hiyoriPerformanceDirector:TaffyHiyoriPerformanceDirector,
isSpeechMotionActive:()=>state.qaSpeaking,isSpeakingNow:()=>state.qaSpeaking});
const controller=TaffyLive2DRuntimeController.createController({state,windowObject:window,documentObject:document,
setModelMotionDefinitions(m){state.availableMotionGroups=Object.keys(m.internalModel.motionManager.definitions);},
applyStyleExpressionLayer:expression.applyStyleExpressionLayer,updateMicroMotionLayer:expression.updateMicroMotionLayer,
placeModel(){const m=state.model;m.anchor.set(.5,.5);m.scale.set(Math.min(490/m.width,670/m.height));m.position.set(650,365);state.baseTransform={x:650,y:365,rotation:0};}});
state.avatarSource={kind:'live2d',path:kind==='mao'?'/api/avatar/live2d/Mao.model3.json':'/models/hiyori_pro_t11/hiyori_pro_t11.model3.json',mapping:'/avatar/mappings/'+kind+'.json'};
await controller.initLive2D();if(!state.model)throw Error('model load failed');state.pixiApp.stop();
// Hold the authored-motion INPUT identical on both sides. Different random
// idle clips can contain different mouth curves, unrelated to speech timing.
const manager=state.model.internalModel.motionManager;
manager.startRandomMotion=(group,priority)=>manager.startMotion(group,0,priority);
manager.stopAllMotions();await state.model.motion('Idle',0,3);
const core=state.model.internalModel.coreModel;let values={};const originalUpdate=core._model.update.bind(core._model);
core._model.update=()=>{values=Object.fromEntries(core._model.parameters.ids.map((id,i)=>[id,core._model.parameters.values[i]]));return originalUpdate();};
const actions=new Set(),results=[];let current=-1,last=-1000/60;
window.QA={state,values:()=>values,history:()=>state.live2dNaturalContext,
step(ms){
 for(let time=last+1000/60;time<=ms+.001;time+=1000/60){
  virtualNow=1000+Math.max(0,time);
  const index=timeline.sentences.findIndex(s=>time>=s.startMs&&time<s.startMs+s.durationMs);
  if(index!==current){if(current>=0)expression.endSpeechAnimation();current=index;if(index>=0){state.ttsPlaybackGeneration++;expression.beginSpeechAnimation(timeline.sentences[index].text,'idle','neutral',{durationMs:timeline.sentences[index].durationMs,performanceCue:{emotion:'neutral',action:'none'}});}}
  const level=timeline.levels[Math.max(0,Math.min(timeline.levels.length-1,Math.floor(time/20)))]||0;
  state.qaSpeaking=index>=0;state.ttsAudioLevel=level;state.speechMouthOpen=level;
  const frame={mode:index>=0?'speak':'idle',mouth:{open:level,vowel:null},face:'neutral',faceIntensity:0};
  window.dispatchEvent(new CustomEvent('avatar-intent',{detail:{frame}}));
  for(const [at,name] of [[80000,'nod'],[80550,'wave'],[81100,'tilt_head']])if(time>=at&&!actions.has(name)){
   actions.add(name);state.avatarRuntime.playGesture(name).then(r=>results.push(r));}
  if(time>=85000&&!actions.has('official')){actions.add('official');state.avatarRenderer.playAction('sentence_release');}
  state.model.update(1000/60);
 }
 last=ms;state.pixiApp.renderer.render(state.pixiApp.stage);
 const zoom=document.getElementById('zoom');zoom.getContext('2d').clearRect(0,0,300,240);zoom.getContext('2d').drawImage(state.pixiApp.view,560,kind==='mao'?150:75,180,144,0,0,300,240);
 const scene=ms<30000?'待机 · 随机呼吸 / 环视 / 轻手势':ms<timeline.speechEndMs?'说话 · 四句话 / 同一音轨':ms<80000?'说完后自然恢复':ms<85000?'连续手势 · 点头 → 挥手 → 歪头':ms<90000?'官方动作 → 参数待机过渡':'回到待机';
 document.getElementById('scene').textContent=scene;
 document.getElementById('clock').textContent=(ms/1000).toFixed(1)+' / 120.0 秒';
 document.getElementById('numbers').textContent='头部 Y: '+Number(values.ParamAngleY||0).toFixed(2)+'°\\n身体 Y: '+Number(values.ParamBodyAngleY||0).toFixed(2)+'°';
 return {at:ms,angleY:values.ParamAngleY,angleZ:values.ParamAngleZ,bodyY:values.ParamBodyAngleY,mouth:kind==='mao'?values.ParamA:values.ParamMouthOpenY,results:[...results],natural:!!state.live2dNaturalContext};
}};QA.step(0);window.QAReady=true;
}catch(e){window.QAError=e.stack;console.error(e);}})();</script>`;
}
const server = http.createServer((req, res) => {
  const url = new URL(req.url, "http://localhost"), baseline = url.pathname.startsWith("/before/");
  const name = decodeURIComponent(baseline ? url.pathname.slice(7) : url.pathname);
  if (name === "/qa") { res.setHeader("Content-Type", "text/html; charset=utf-8"); res.end(html(url.searchParams.get("model"), baseline)); return; }
  let file;
  if (name.startsWith("/api/avatar/live2d/")) {
    const relative = name.slice(19);
    if (req.headers["x-local-model-test"] !== "authenticated" || !allowed.has(relative)) { res.writeHead(401); res.end(); return; }
    file = path.join(modelRoot, relative);
  } else {
    const rel = name.slice(1);
    if (baseline && before.has(rel)) { res.setHeader("Content-Type", rel.endsWith(".json") ? "application/json" : "application/javascript"); res.end(before.get(rel)); return; }
    file = path.resolve(repo, "web", rel);
    if (!file.startsWith(path.join(repo, "web") + path.sep)) { res.writeHead(404); res.end(); return; }
  }
  if (!fs.existsSync(file)) { res.writeHead(404); res.end(); return; }
  res.setHeader("Content-Type", ({ ".js": "application/javascript", ".json": "application/json", ".png": "image/png" })[path.extname(file)] || "application/octet-stream");
  fs.createReadStream(file).pipe(res);
});
(async () => {
  fs.mkdirSync(out, { recursive: true }); await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  const browser = await chromium.launch({ headless: true, args: ["--use-angle=swiftshader", "--enable-webgl", "--ignore-gpu-blocklist"] });
  const evidence = { baseline: reference, kind: "real-local-model-controlled-60Hz-with-same-SAPI-RMS", fps: 15, duration: 120, cases: [], errors: [] };
  try {
    for (const model of models) {
      const cases = await Promise.all([true, false].map(async baseline => {
        const name = model + (baseline ? "-before" : "-after"), directory = path.join(out, name); fs.mkdirSync(directory, { recursive: true });
        const page = await browser.newPage({ viewport: { width: 1000, height: 760 }, deviceScaleFactor: 1 });
        page.on("pageerror", error => evidence.errors.push({ name, message: error.message }));
        await page.route("**/*", route => /^(http:\/\/127\.0\.0\.1:|blob:|data:)/.test(route.request().url()) ? route.continue() : route.abort());
        await page.goto(`http://127.0.0.1:${server.address().port}/${baseline ? "before/" : ""}qa?model=${model}`);
        await page.waitForFunction(() => window.QAReady || window.QAError, null, { polling: 100, timeout: 60000 });
        assert.equal(await page.evaluate(() => window.QAError), undefined, name);
        return { page, name, directory, model, baseline, samples: [] };
      }));
      const indices = smoke ? [0, 150, 449, 600, 900, 1200, 1210, 1218, 1277, 1500, 1799] : Array.from({ length: 1800 }, (_, i) => i);
      for (const index of indices) {
        await Promise.all(cases.map(async item => {
          const sample = await item.page.evaluate(ms => QA.step(ms), index * 1000 / 15); item.samples.push(sample);
          if (!smoke) await item.page.screenshot({ path: path.join(item.directory, `frame-${String(index).padStart(4, "0")}.jpg`), type: "jpeg", quality: 82 });
          if ([0, 449, 600, 1200, 1210, 1218, 1277, 1799].includes(index)) await item.page.screenshot({ path: path.join(out, `${item.name}-${index}.png`) });
        }));
        if (!smoke && index % 150 === 0) console.log(`${model}: ${index}/1800`);
      }
      for (const item of cases) {
        assert.ok(item.samples.every(s => Number.isFinite(s.angleY) && Number.isFinite(s.mouth)), item.name + " finite Core parameters");
        assert.ok(item.samples.some(s => s.mouth > .05), item.name + " actual speaking mouth");
        assert.equal(item.samples.at(-1).natural, !item.baseline);
        evidence.cases.push({ name: item.name, frames: item.samples.length, samples: item.samples });
        await item.page.close();
      }
      assert.deepEqual(cases[1].samples.map(s => s.mouth), cases[0].samples.map(s => s.mouth), model + " actual Core mouth sequence must remain EXACT with the same audio/authored inputs");
    }
    assert.deepEqual(evidence.errors, []);
    fs.writeFileSync(path.join(out, smoke ? "smoke-evidence.json" : "recording-evidence.json"), JSON.stringify(evidence, null, 2));
    console.log(JSON.stringify({ cases: evidence.cases.map(c => ({ name: c.name, frames: c.frames })), pairedMouthExact: true, errors: evidence.errors.length }));
  } finally { await browser.close(); await new Promise(resolve => server.close(resolve)); }
})().catch(error => { console.error(error); process.exitCode = 1; server.close(); });
