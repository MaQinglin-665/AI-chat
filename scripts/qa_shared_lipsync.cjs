"use strict";
// Local-only deterministic playback comparison. No account, private config or
// remote TTS access. Real models stay ignored; #217 overlay never enters this PR.
const fs = require("node:fs"), path = require("node:path"), http = require("node:http");
const { execFileSync } = require("node:child_process"), assert = require("node:assert/strict");
const repo = path.resolve(__dirname, ".."), out = process.env.LIPSYNC_QA_OUTPUT || path.join(repo, "tmp_ui_smoke/shared-lipsync");
const baseRef = process.env.LIPSYNC_QA_BASE || "2b67452", adapterRef = process.env.LIPSYNC_QA_ADAPTER || "0c08c3d";
process.env.PLAYWRIGHT_BROWSERS_PATH ||= path.join(repo, ".local-tools/playwright-browsers");
const { chromium } = require(path.join(repo, "docs/node_modules/@playwright/test"));
const audioDuration = Number(process.env.LIPSYNC_QA_AUDIO_SECONDS || 12.199818594104308), fps = 20;
const models = (process.env.LIPSYNC_QA_MODELS || "hiyori,mao,vrm").split(",");
const cache = new Map();
function git(ref, file) {
  const key = ref + ":" + file;
  if (!cache.has(key)) cache.set(key, execFileSync("git", ["show", key], { cwd: repo, maxBuffer: 20 * 1024 * 1024 }));
  return cache.get(key);
}
function html(model, before) {
  const side = before ? "before" : "after";
  const files = ["hiyoriPerformanceDirector.js", "live2dExpressionController.js", "ttsPlaybackController.js", "avatar/avatarRuntime.js"];
  return `<!doctype html><meta charset="utf-8"><style>html,body{margin:0;background:#eee9f2;font:16px system-ui;color:#352c41}canvas{display:block;width:640px;height:570px}output{position:absolute;top:8px;left:16px;font-size:15px;white-space:pre-wrap}</style>
<canvas id="canvas" width="640" height="570"></canvas><output id="status">加载真实模型…</output>
<script>window.virtualNow=1000;Object.defineProperty(performance,'now',{value:()=>virtualNow});window.requestAnimationFrame=()=>1;window.cancelAnimationFrame=()=>{};
Object.defineProperty(window,'speechSynthesis',{value:{speaking:false,resume(){},cancel(){this.speaking=false},speak(u){this.speaking=true;window.utterance=u}}});
window.SpeechSynthesisUtterance=class{constructor(text){this.text=text}};</script>
${["vendor/pixi.min.js", "vendor/pixi-unsafe-eval.min.js", "vendor/live2dcubismcore.min.js", "vendor/cubism4.min.js", "vendor/vrm/vrm-vendor.js", "avatar/vrmRenderer.js", "avatar/live2dModelDriver.js"].map(f=>`<script src="/shared/${f}"></script>`).join("")}
${before ? "" : '<script src="/after/avatar/browserLipSync.js"></script>'}
${files.map(f=>`<script src="/${side}/${f}?model=${model}"></script>`).join("")}
<script>(async()=>{try{
const modelKind=${JSON.stringify(model)},before=${before},canvas=document.getElementById('canvas');
const state={uiView:'full',config:{tts:{browser_lip_sync_delay_ms:120}},ttsPlaybackGeneration:1,speakingEnabled:true,expressionEnabled:true,motionEnabled:true,expressionStrength:1,ttsAudioLevel:0,speechMouthOpen:0,speechMotionBlend:1,currentTalkStyle:'neutral',baseTransform:{x:320,y:600,rotation:0},availableMotionGroups:[],modelProfileName:'hiyori_pro_t11'};
const mouth=TaffyLive2DExpressionController.createController({state,windowObject:window,performanceObject:performance,isSpeakingNow:()=>speechSynthesis.speaking,isSpeechMotionActive:()=>speechSynthesis.speaking});
const timers=[];const host={speechSynthesis,Event,dispatchEvent:event=>window.dispatchEvent(event),setTimeout(fn,delay){timers.push({fn,delay});return timers.length},clearTimeout(){}};
const playback=TaffyTTSPlaybackController.createController({state,windowObject:host,performanceObject:performance,buildSpeakProsody:()=>({}),isCurrentTTSPlaybackGeneration:g=>g===state.ttsPlaybackGeneration,
beginSpeechAnimation:(text,mood,style)=>mouth.beginSpeechAnimation(text,mood,style,{durationMs:800}),finishSpeechAnimation:mouth.finishSpeechAnimation,endSpeechAnimation:mouth.endSpeechAnimation});
let draw,read;
if(modelKind==='vrm'){
 const {THREE,GLTFLoader,VRMLoaderPlugin,VRMUtils}=XinyuVRMVendor;
 const loader=new GLTFLoader();loader.register(p=>new VRMLoaderPlugin(p));
 const gltf=await loader.parseAsync(await(await fetch('/local/Sendagaya_Shino.vrm')).arrayBuffer(),'');const vrm=gltf.userData.vrm;VRMUtils.rotateVRM0(vrm);
 const scene=new THREE.Scene();scene.background=new THREE.Color('#eee9f2');scene.add(vrm.scene);
 scene.add(new THREE.HemisphereLight(0xffffff,0x707080,2));const light=new THREE.DirectionalLight(0xffffff,2);light.position.set(1,2,2);scene.add(light);
 const box=new THREE.Box3().setFromObject(vrm.scene),h=box.max.y-box.min.y;
 const camera=new THREE.PerspectiveCamera(28,640/570,.01,100);camera.position.set(0,h*.91,h*.8);camera.lookAt(0,h*.85,0);
 const renderer=new THREE.WebGLRenderer({canvas,antialias:true});renderer.setSize(640,570);renderer.setPixelRatio(1);
 const driver=XinyuVRMRenderer.createIntentDriver(vrm);
 draw=()=>{driver.update(XinyuAvatarRuntime.frameFromState(state,virtualNow));vrm.update(1/20);renderer.render(scene,camera)};
 read=()=>vrm.expressionManager.getValue('aa');
}else{
 const app=new PIXI.Application({view:canvas,width:640,height:570,backgroundAlpha:0,autoStart:false});
 const url=modelKind==='mao'?'/local/Mao/Mao.model3.json':'/hiyori/hiyori_pro_t11.model3.json';
 const model=await PIXI.live2d.Live2DModel.from(url,{autoUpdate:false,autoInteract:false});state.model=model;
 model.anchor.set(.5,.5);model.scale.set(1100/model.height);model.position.set(320,600);app.stage.addChild(model);app.stop();
 model.internalModel.motionManager.stopAllMotions();
 let driver;if(modelKind==='mao'){const mapping=await(await fetch('/shared/avatar/mappings/mao.json')).json();driver=XinyuLive2DModelDriver.create({model,mapping,now:()=>virtualNow})}
 const core=model.internalModel.coreModel,original=core._model.update.bind(core._model);let observed=0;
 core._model.update=()=>{if(driver)driver.update(XinyuAvatarRuntime.frameFromState(state,virtualNow));else{mouth.applyStyleExpressionLayer();mouth.updateMicroMotionLayer()}
  observed=core.getParameterValueById(modelKind==='mao'?'ParamA':'ParamMouthOpenY');return original()};
 draw=()=>{model.update(50);app.renderer.render(app.stage)};read=()=>observed;
}
let queued=false,probed=false,started=false,ended=false;
window.QA={step(t){virtualNow=1000+t;const start=1250,end=1370+${audioDuration}*1000;
 if(t>=1000&&!queued){queued=true;playback.speakOnceWithVoice('这是馨语桌宠的口型同步测试。请听这句稍长的话，观察嘴巴的开始和结尾，是否能够跟着语音继续变化。',null,{force:true,playbackGeneration:1})}
 if(t>=1040&&!probed){probed=true;timers.find(x=>x.delay===40)?.fn()}
 if(t>=start&&!started){started=true;utterance.onstart()}
 if(t>=end&&!ended){ended=true;speechSynthesis.speaking=false;utterance.onend()}
 const envelope=mouth.getSpeechAnimationMouthOpen();draw();
 const value=read();document.getElementById('status').textContent=(before?'修改前':'修改后')+' · '+modelKind+'\\n'+(t<1370?'参考音轨：等待':t<end?'参考音轨：播放中':'参考音轨：结束')+'\\n口型信号 '+envelope.toFixed(3)+' / 参数 '+Number(value).toFixed(3);
 return {t,envelope,value,phase:state.avatarBrowserSpeech?.phase||'legacy'};
}};QA.step(0);window.QAReady=true;
}catch(error){window.QAError=error.stack;console.error(error)}})();</script>`;
}
const server=http.createServer((req,res)=>{
 try{
  const url=new URL(req.url,'http://localhost'),parts=decodeURIComponent(url.pathname).split('/').filter(Boolean);
  if(parts.includes('..'))throw Error('Invalid local fixture path');
  let data,type='text/javascript';
  if(parts[0]==='page'){data=html(parts[1],url.searchParams.get('side')==='before');type='text/html;charset=utf-8'}
  else if(parts[0]==='compare'){const model=parts[1];assert(models.includes(model));data=`<!doctype html><meta charset="utf-8"><style>body{margin:0;background:#eee9f2;color:#352c41;font:18px system-ui}header{height:76px;padding:12px 24px;box-sizing:border-box}h1{font-size:22px;margin:0 0 4px}iframe{width:640px;height:570px;border:0}main{display:flex}footer{padding:12px 24px;font-size:14px}</style><header><h1>馨语桌宠 · ${model==='vrm'?'VRM / Sendagaya Shino':model==='mao'?'Mao':'Hiyori'} 口型前后对比</h1>相同参考语音与事件 · 左：修改前 / 右：修改后</header><main><iframe src="/page/${model}?side=before"></iframe><iframe src="/page/${model}?side=after"></iframe></main><footer>真实模型 / 确定性事件回放 + 本地系统语音参考音轨；非原生语音延迟测量。<br>${model==='vrm'?'Sendagaya Shino © pixiv / VRoid Project · CC0':'官方 Live2D 示例模型 © Live2D Inc.，仅本机测试'}</footer>`;type='text/html;charset=utf-8'}
  else if(parts[0]==='local'){const name=parts.slice(1).join('/');assert(name==='Sendagaya_Shino.vrm'||name.startsWith('Mao/'));data=fs.readFileSync(path.join(repo,'models_local',name));type=/\.json$/.test(name)?'application/json':/\.png$/.test(name)?'image/png':'application/octet-stream'}
  else if(parts[0]==='hiyori'){data=fs.readFileSync(path.join(repo,'web/models/hiyori_pro_t11',...parts.slice(1)));type=/\.json$/.test(req.url)?'application/json':/\.png$/.test(req.url)?'image/png':'application/octet-stream'}
  else if(parts[0]==='shared'){data=git(adapterRef,'web/'+parts.slice(1).join('/'));if(req.url.endsWith('.json'))type='application/json'}
  else if(parts[0]==='before'||parts[0]==='after'){
   const file='web/'+parts.slice(1).join('/'),before=parts[0]==='before';
   data=before?git(baseRef,file):fs.readFileSync(path.join(repo,file));
   if(file==='web/avatar/avatarRuntime.js'&&url.searchParams.get('model')==='mao'){
    data=git(adapterRef,file).toString();
    if(!before)data=data.replace('  function createRuntime(root) {','  function createRuntime(root) {\n  const browserLipSync = root.XinyuBrowserLipSync;').replace('const level = fresh ? clamp(state.ttsAudioLevel) : 0;','const level = fresh ? browserLipSync.mouthLevel(state, now, state.ttsAudioLevel) : 0;');
   }
  }else{res.writeHead(404);res.end();return}
  res.writeHead(200,{'Content-Type':type});res.end(data);
 }catch(error){res.writeHead(500);res.end(String(error.message))}
});
(async()=>{
 fs.mkdirSync(out,{recursive:true});await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const browser=await chromium.launch({headless:true,args:['--no-sandbox','--enable-unsafe-swiftshader']});
 const report={baseRef,adapterRef,audioDuration,fps,controlled:true,models:{}};
 try{
  for(const model of models){
   const page=await browser.newPage({viewport:{width:1280,height:720}}),errors=[];
   page.on('pageerror',error=>{errors.push(error.message);console.error(model,error.message)});
   await page.goto(`http://127.0.0.1:${server.address().port}/compare/${model}`);
   const frames=page.frames().filter(f=>f!==page.mainFrame());
   for(const frame of frames){await frame.waitForFunction(()=>window.QAReady||window.QAError,null,{timeout:60000,polling:100});assert.equal(await frame.evaluate(()=>window.QAError),undefined)}
   const directory=path.join(out,model);fs.mkdirSync(directory,{recursive:true});
   const samples=[],total=process.env.LIPSYNC_QA_SMOKE?1:Math.ceil((audioDuration+2.4)*fps);
   for(let i=0;i<total;i++){
    const pair=await Promise.all(frames.map(frame=>frame.evaluate(t=>QA.step(t),i*1000/fps)));samples.push(pair);
    await page.screenshot({path:path.join(directory,`frame-${String(i).padStart(4,'0')}.jpg`),type:'jpeg',quality:85});
    if(i%80===0)console.log(model,i+'/'+total);
   }
   assert.deepEqual(errors,[]);report.models[model]={samples,errors};
   if(total>1){
    const range=(side,from,to,key='envelope')=>{const values=samples.filter(pair=>pair[side].t>=from&&pair[side].t<=to).map(pair=>pair[side][key]);return Math.max(...values)-Math.min(...values)};
    assert(samples.filter(pair=>pair[1].t<1370).every(pair=>pair[1].envelope===0),'no early mouth before reference audio');
    assert(range(1,4000,8000)>.3,'long speech keeps varying');
    assert.equal(samples.at(-1)[1].envelope,0,'end closes');
    assert(range(1,4000,8000,'value')>.1,'real model mouth parameter varies');
    report.models[model].tailRangeBefore=range(0,4000,8000);report.models[model].tailRangeAfter=range(1,4000,8000);
   }
   await page.close();fs.writeFileSync(path.join(out,'evidence.json'),JSON.stringify(report,null,2));
  }
 }finally{await browser.close();await new Promise(resolve=>server.close(resolve))}
 console.log('Real-model deterministic before/after comparison passed.');
})().catch(error=>{console.error(error);server.close();process.exitCode=1});
