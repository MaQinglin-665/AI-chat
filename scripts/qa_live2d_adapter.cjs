"use strict";
const fs=require('fs'),path=require('path'),http=require('http'),assert=require('assert/strict'),crypto=require('crypto');
const repo=path.resolve(__dirname,'..'),out=process.env.AVATAR_QA_OUTPUT||path.join(repo,'tmp_ui_smoke/avatar-live2d-stage2');
if (!process.env.PLAYWRIGHT_BROWSERS_PATH && fs.existsSync(path.join(repo,'.local-tools/playwright-browsers'))) process.env.PLAYWRIGHT_BROWSERS_PATH=path.join(repo,'.local-tools/playwright-browsers');
const {chromium}=require(path.join(repo,'docs/node_modules/@playwright/test'));
const pageHtml=before=>`<!doctype html><meta charset="utf-8"><title>Live2D 阶段2严格对照</title>
<style>body{margin:0;background:#eee9f1;color:#30283a;font:18px system-ui}canvas{position:absolute;inset:0}aside{position:absolute;left:28px;top:22px;max-width:330px;z-index:1;line-height:1.7}h1{font-size:25px}output{white-space:pre-wrap}</style>
<canvas id="live2d-canvas"></canvas><aside><h1>馨语桌宠 · 阶段 2</h1><p>${before?'映射平移前（保存的旧实现）':'统一入口 + Live2D 映射适配层'}</p><p>同一 Core 6 · 同一输入和时钟<br>完整参数写入序列严格对照</p><output id="status">正在加载真实 Hiyori…</output></aside>
<script>window.virtualNow=1000; Object.defineProperty(performance,'now',{value:()=>window.virtualNow}); Date.now=()=>1792972800000+window.virtualNow;
let seed=9173;Math.random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
window.requestAnimationFrame=()=>1;window.cancelAnimationFrame=()=>{};
</script>
${['vendor/pixi.min.js','vendor/pixi-unsafe-eval.min.js','vendor/live2dcubismcore.min.js','vendor/cubism4.min.js','avatar/live2dMapping.js','hiyoriPerformanceDirector.js','live2dExpressionController.js','live2dLayoutController.js','live2dRuntimeController.js','avatar/live2dRenderer.js','avatar/avatarRuntime.js'].map(file=>`<script src="/${before?'baseline/':''}${file}"></script>`).join('')}
<script>
(async()=>{try{
await XinyuLive2DMapping.ready();
const state={uiView:'full',config:{model_path:'/models/hiyori_pro_t11/hiyori_pro_t11.model3.json'},modelProfileName:'hiyori_pro_t11',baseTransform:{x:750,y:430,rotation:0},availableMotionGroups:[],expressionEnabled:true,motionEnabled:true,expressionStrength:1,currentTalkStyle:'neutral',ttsAudioLevel:0,speechMouthOpen:0,ttsPlaybackGeneration:1};
let speaking=false,writes=[];
const controller=TaffyLive2DExpressionController.createController({state,hiyoriPerformanceDirector:TaffyHiyoriPerformanceDirector,isSpeechMotionActive:()=>speaking,isSpeakingNow:()=>speaking});
const layout=TaffyLive2DLayoutController.createController({state,windowObject:window,documentObject:document,performanceObject:performance});
const runtime=TaffyLive2DRuntimeController.createController({state,windowObject:window,documentObject:document,
applyStyleExpressionLayer:controller.applyStyleExpressionLayer,updateMicroMotionLayer:controller.updateMicroMotionLayer,
attachDrag:layout.attachDrag,setupClickthroughHitTest:layout.setupClickthroughHitTest,
placeModel(){const m=state.model;m.scale.set(Math.min(520/m.width,760/m.height));m.anchor.set(.5,.5);m.position.set(750,440);state.baseTransform={x:750,y:440,rotation:0};},
setModelMotionDefinitions(model){state.availableMotionGroups=Object.keys(model.internalModel.motionManager.definitions);},setStatus(text){document.getElementById('status').textContent=text;}});
await runtime.initLive2D();state.pixiApp.stop();
const core=state.model.internalModel.coreModel;
for(const name of ['addParameterValueByIndex','addParameterValueById','setParameterValueByIndex','setParameterValueById','multiplyParameterValueByIndex','multiplyParameterValueById','setPartOpacityById','setPartOpacityByIndex']){
 if(typeof core[name]!=='function')continue;const original=core[name];core[name]=function(...args){writes.push([name,...args]);return original.apply(this,args);};}
const modelUpdate=state.model.update;state.model.update=function(...args){writes.push(['model.update',...args]);return modelUpdate.apply(this,args);};
window.QA={state,controller,core,
async motion(){await state.model.motion(state.availableMotionGroups[0],0,3);state.hiyoriAuthoredMotionUntil=virtualNow+3000;state.hiyoriAuthoredMotion={playbackGeneration:state.ttsPlaybackGeneration};},
run({name,count,begin,action,mode,drag,active=true,holdSpeech=false}){
 if(begin){speaking=true;controller.beginSpeechAnimation('Let us think, pause, and answer!', 'idle','neutral',{durationMs:30000,performanceCue:{emotion:begin,action:'none',speech:{holdMs:500}}});}
 else if(!holdSpeech)speaking=false;
 if(action)controller.triggerSemanticAction(action,{now:virtualNow,force:true});
 state.dragData=drag?{}:null;state.rendererSurfaceActive=active;
 const frames=[];
 for(let i=0;i<count;i++){window.virtualNow+=1000/60;state.ttsAudioLevel=speaking&&i%60<20?.85:0;if(mode)controller.requestPerformanceMode(mode,{now:virtualNow,holdMs:100});
 writes=[];state.pixiApp.ticker.update(virtualNow);frames.push({writes,parameters:Array.from(core._model.parameters.values),parts:Array.from(core._model.parts.opacities)});}
 state.pixiApp.renderer.render(state.pixiApp.stage);
 document.getElementById('status').textContent=['Core 06.00.0001','场景：'+name,'同一时钟、相同输入','本次累计：'+Math.round((virtualNow-1000)*.06)+' 帧'].join(String.fromCharCode(10));return frames;}
};window.QAReady=true;
}catch(e){window.QAError=e.stack;console.error(e);}})();</script>`;
const server=http.createServer((req,res)=>{
 const url=new URL(req.url,'http://127.0.0.1'),baseline=url.pathname.startsWith('/baseline/');
 if(url.pathname==='/qa'){res.setHeader('content-type','text/html; charset=utf-8');res.end(pageHtml(url.searchParams.has('before')));return;}
 let rel=decodeURIComponent(url.pathname).replace(/^\/baseline\//,'/').replace(/^\//,'');
 let base=path.join(repo,'web');
 if(baseline&&['hiyoriPerformanceDirector.js','live2dExpressionController.js','live2dRuntimeController.js'].includes(rel))base=path.join(repo,'tests/fixtures/live2d-before-mapping');
 const file=path.resolve(base,rel);if(!file.startsWith(base+path.sep)||!fs.existsSync(file)){res.writeHead(404);res.end();return;}
 res.setHeader('content-type',({'.js':'application/javascript','.json':'application/json','.png':'image/png'})[path.extname(file)]||'application/octet-stream');fs.createReadStream(file).pipe(res);
});
(async()=>{fs.mkdirSync(out,{recursive:true});await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));let browser;const evidence={core:'06.00.0001',reference:'b39ab99',cases:[],errors:[]};
try{browser=await chromium.launch({headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const pages=[];for(const before of [true,false]){const ctx=await browser.newContext({viewport:{width:1150,height:850},deviceScaleFactor:1});const page=await ctx.newPage();
 page.on('pageerror',e=>{evidence.errors.push(e.stack);console.error(e.stack);});await page.route('**/*',route=>route.request().url().startsWith('http://127.0.0.1:')||route.request().url().startsWith('data:')?route.continue():route.abort());
 await page.goto('http://127.0.0.1:'+server.address().port+'/qa'+(before?'?before':''),{waitUntil:'networkidle'});
 await page.waitForFunction(()=>window.QAReady||window.QAError,null,{polling:100,timeout:30000});assert.equal(await page.evaluate(()=>window.QAError),undefined);pages.push(page);}
let frames=0,writes=0;for(const scenario of [{name:'idle',count:180},{name:'listen',count:90,mode:'listen'},{name:'thinking',count:90,mode:'think'},
{name:'playful',count:180,begin:'playful'},{name:'sad',count:120,begin:'sad'},{name:'action',count:120,action:'nod_double'},{name:'authored motion',count:120,begin:'thinking',native:true},{name:'drag',count:20,drag:true},{name:'inactive',count:20,active:false},{name:'release',count:90}]){
 if(scenario.native)for(const page of pages)await page.evaluate(()=>QA.motion());
 const a=await pages[0].evaluate(input=>QA.run(input),scenario),b=await pages[1].evaluate(input=>QA.run(input),scenario);
 assert.deepEqual(b,a,'strict full Pixi/Core write mismatch: '+scenario.name);frames+=a.length;writes+=a.reduce((sum,frame)=>sum+frame.writes.length,0);
 if(['idle','thinking','playful','sad'].includes(scenario.name)){const hashes=[];for(let i=0;i<2;i++){
 await pages[i].locator('aside').evaluate(el=>el.style.visibility='hidden');
 const png=await pages[i].locator('canvas').screenshot({path:path.join(out,scenario.name+(i?'-after':'-before')+'.png'),timeout:15000});hashes.push(crypto.createHash('sha256').update(png).digest('hex'));
 await pages[i].locator('aside').evaluate(el=>el.style.visibility='visible');
 await pages[i].screenshot({path:path.join(out,scenario.name+(i?'-after-process':'-before-process')+'.png')});}
 assert.equal(hashes[0],hashes[1],'canvas PNG differs: '+scenario.name);evidence.cases.push({name:scenario.name,pngSha256:hashes[0],exact:true});}
 console.log('EXACT '+scenario.name+' '+a.length+' frames');}
// Optional dedicated inspection recording, separate from strict assertions.
// Fixed logical steps are paced in wall time; this is visual review, not an FPS
// benchmark or native Windows desktop/audio capture.
if(process.env.AVATAR_QA_RECORD==='1'){
 const context=await browser.newContext({viewport:{width:1150,height:850},deviceScaleFactor:1,
  recordVideo:{dir:path.join(out,'recording'),size:{width:1150,height:850}}});
 const page=await context.newPage();
 page.on('pageerror',error=>evidence.errors.push(error.stack));
 await page.goto('http://127.0.0.1:'+server.address().port+'/qa',{waitUntil:'networkidle'});
 await page.waitForFunction(()=>window.QAReady||window.QAError,null,{polling:100,timeout:30000});
 assert.equal(await page.evaluate(()=>window.QAError),undefined);
 await page.evaluate(()=>{document.querySelector('h1').textContent='Hiyori · #217 检查录像';
  document.querySelector('aside p').textContent='最新 main 合并后 · 原 Pixi 时钟 / Core6';});
 const scenes=[{name:'待机 / idle',seconds:3},{name:'倾听 / listen',seconds:3,mode:'listen'},
  {name:'思考 / think',seconds:3,mode:'think'},{name:'说话 / playful',seconds:5,begin:'playful'},
  {name:'点头 / nod_double',seconds:3,action:'nod_double'},{name:'官方动作 / authored motion',seconds:4,native:true},
  {name:'拖拽期间 / drag guard',seconds:2,drag:true},{name:'恢复 / release',seconds:3}];
 for(const scene of scenes)await page.evaluate(async(scene)=>{
  if(scene.native)await QA.motion();
  for(let i=0;i<scene.seconds*30;i++){
   QA.run({...scene,count:2,begin:i===0?scene.begin:undefined,action:i===0?scene.action:undefined,
    holdSpeech:!!scene.begin,active:true});
   await new Promise(resolve=>setTimeout(resolve,33));
  }
 },scene);
 const video=page.video();await context.close();await video.saveAs(path.join(out,'hiyori-pr217-inspection.webm'));
 evidence.recording={file:'hiyori-pr217-inspection.webm',scenes,scope:'Silent controlled real-Pixi/Core Hiyori inspection; isolated browser, not native desktop or real speech capture.'};
}
// Reload the real renderer ten times on the same canvas, exercising texture,
// model, ticker and DOM cleanup rather than only a fake renderer lifecycle.
evidence.reloads=await pages[1].evaluate(async()=>{
 const state=QA.state,controller=QA.controller;
 const layout=TaffyLive2DLayoutController.createController({state,windowObject:window,documentObject:document,performanceObject:performance});
 let disposedApps=0;
 const runtime=TaffyLive2DRuntimeController.createController({state,windowObject:window,documentObject:document,
  applyStyleExpressionLayer:controller.applyStyleExpressionLayer,updateMicroMotionLayer:controller.updateMicroMotionLayer,
  attachDrag:layout.attachDrag,setupClickthroughHitTest:layout.setupClickthroughHitTest,setModelMotionDefinitions(){},
  placeModel(){const m=state.model;m.scale.set(Math.min(520/m.width,760/m.height));m.anchor.set(.5,.5);m.position.set(750,440);}});
 for(let i=0;i<10;i++){
  const previous=state.pixiApp,oldTicker=previous.ticker;
  await runtime.initLive2D();state.pixiApp.stop();window.virtualNow+=1000/60;state.pixiApp.ticker.update(virtualNow);
  if(previous.renderer!==null)throw Error('old Pixi renderer still retained');
  if(oldTicker._head!==null)throw Error('old ticker still retained');
  if(document.body.dataset.avatarReady!=='true')throw Error('reload failed');
  disposedApps++;
 }
 state.avatarRuntime.dispose();
 if(state.model!==null||state.pixiApp!==null)throw Error('Live2D references retained after dispose');
 return disposedApps;
});
assert.deepEqual(evidence.errors,[]);evidence.frames=frames;evidence.writes=writes;evidence.exact=true;
fs.writeFileSync(path.join(out,'browser-exact-evidence.json'),JSON.stringify(evidence,null,2));console.log(JSON.stringify({frames,writes,exact:true}));
}catch(e){fs.writeFileSync(path.join(out,'browser-failure.txt'),String(e.stack));throw e;}finally{await browser?.close();server.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
