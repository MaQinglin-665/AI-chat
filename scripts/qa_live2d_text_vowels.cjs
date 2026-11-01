"use strict";
// Optional real Windows browser-speech recording. No server, private config,
// dialogue, brain or model downloads. HTTP serves only web/ and local Mao refs.
const fs=require("node:fs"),path=require("node:path"),http=require("node:http"),cp=require("node:child_process"),assert=require("node:assert/strict"),readline=require("node:readline");
const repo=path.resolve(__dirname,".."), out=path.resolve(process.env.AVATAR_QA_OUTPUT||path.join(repo,"tmp_ui_smoke/text-vowels"));
const reference=process.env.LIVE2D_BASELINE_REF||"42ae9ea";assert.match(reference,/^[a-f0-9]{7,40}$/);
const before=new Map(["avatar/browserLipSync.js","avatar/live2dRenderer.js","avatar/live2dModelDriver.js"].map(file=>[file,cp.execFileSync("git",["show",`${reference}:web/${file}`],{cwd:repo})]));
process.env.PLAYWRIGHT_BROWSERS_PATH||=path.join(repo,".local-tools/playwright-browsers");
const {chromium}=require(path.join(repo,"docs/node_modules/@playwright/test"));
const smoke=process.argv.includes("--smoke");
const passages=[
 {name:"01-chinese",label:"纯中文 · 五元音",text:"阿姨，你去哪里？我们一起坐着喝茶，看看外面的月亮。"},
 {name:"02-mixed",label:"中英混合 · 英文只开合",text:"你好，Mao！今天一起学习 Live2D，听听 English 和中文。"},
 {name:"03-numbers",label:"数字和标点 · 数字只开合",text:"现在是2026年10月28日。请数一数：1、2、3，准备好了吗？"}
];
const root=path.join(repo,"models_local/Mao"),manifest=JSON.parse(fs.readFileSync(path.join(root,"Mao.model3.json"))),refs=manifest.FileReferences;
const allowed=new Set(["Mao.model3.json",refs.Moc,refs.Physics,refs.Pose,...refs.Textures,...refs.Expressions.map(x=>x.File),...Object.values(refs.Motions).flat().map(x=>x.File)].filter(Boolean));
function html(baseline,passage){return `<!doctype html><meta charset="utf-8"><title>Mao 浏览器文本元音验收</title>
<style>body{margin:0;background:#eeeaf2;color:#332d3b;font:18px system-ui}canvas{position:absolute;inset:0}aside{position:absolute;left:24px;top:20px;width:330px;line-height:1.7}h1{font-size:25px;margin:0}h2{font-size:22px}#status{font-weight:bold}output{font-variant-numeric:tabular-nums}footer{position:absolute;left:24px;bottom:16px;width:340px;font-size:12px}</style>
<canvas id="live2d-canvas"></canvas><canvas id="zoom" width="300" height="210" style="inset:auto;left:24px;top:365px;border:1px solid #c7bfd0"></canvas>
<aside><h1>馨语桌宠 · Mao</h1><h2>${baseline?"修改前 · browser 仅开合":"修改后 · 离线文本元音"}</h2><p>${passage.label}</p><p>${passage.text}</p><div id="status">模型加载中</div><output id="params"></output></aside>
<footer>官方 Mao © Live2D Inc. / 本地模型，未分发。<br>真实浏览器 SpeechSynthesis / 原生 boundary 事件<br>声音为本机系统输出回录；非音频驱动或后配音。<br>英文、数字及未知字退回只开合；元音是文本近似。</footer>
<script>const nativeFetch=fetch.bind(window);window.fetch=(url,opts)=>nativeFetch(${baseline?"typeof url==='string'&&url.startsWith('/')?'/before'+url:url":"url"},opts);window.authFetch=(url,opts={})=>fetch(url,{...opts,headers:{...opts.headers,'X-Local-Model-Test':'authenticated'}});</script>
${["vendor/pixi.min.js","vendor/pixi-unsafe-eval.min.js","vendor/live2dcubismcore.min.js","vendor/cubism4.min.js","avatar/live2dMapping.js","avatar/browserLipSync.js","avatar/live2dAssets.js","avatar/live2dModelDriver.js","avatar/live2dGestures.js","hiyoriPerformanceDirector.js","live2dExpressionController.js","live2dLayoutController.js","live2dRuntimeController.js","avatar/live2dRenderer.js","avatar/avatarRuntime.js","ttsPlaybackController.js"].map(file=>`<script src="/${baseline?"before/":""}${file}"></script>`).join("")}
<script>(async()=>{try{
const state={uiView:'full',config:{tts:{provider:'browser',browser_lip_sync_delay_ms:120}},modelProfileName:'mao',baseTransform:{x:665,y:360,rotation:0},availableMotionGroups:[],ttsAudioLevel:0,expressionEnabled:true,expressionStrength:1,motionEnabled:true,ttsPlaybackGeneration:1,ttsBrowserPlaybackToken:1,speechMouthOpen:0,currentTalkStyle:'neutral'};
const expression=TaffyLive2DExpressionController.createController({state,hiyoriPerformanceDirector:TaffyHiyoriPerformanceDirector,isSpeakingNow:()=>speechSynthesis.speaking,isSpeechMotionActive:()=>speechSynthesis.speaking});
const controller=TaffyLive2DRuntimeController.createController({state,windowObject:window,documentObject:document,setModelMotionDefinitions(m){state.availableMotionGroups=Object.keys(m.internalModel.motionManager.definitions)},applyStyleExpressionLayer:expression.applyStyleExpressionLayer,updateMicroMotionLayer:expression.updateMicroMotionLayer,placeModel(){const m=state.model;m.anchor.set(.5,.5);m.scale.set(Math.min(490/m.width,670/m.height));m.position.set(665,365);state.baseTransform={x:665,y:365,rotation:0}}});
state.avatarSource={kind:'live2d',path:'/api/avatar/live2d/Mao.model3.json',mapping:'/avatar/mappings/mao.json'};
await controller.initLive2D();if(!state.model)throw Error('Mao load failed');
let values={},events=[],started=0;const core=state.model.internalModel.coreModel,original=core._model.update.bind(core._model);
core._model.update=()=>{values=Object.fromEntries(core._model.parameters.ids.map((id,i)=>[id,core._model.parameters.values[i]]));return original()};
const playback=TaffyTTSPlaybackController.createController({state,windowObject:window,isCurrentTTSPlaybackGeneration:g=>g===state.ttsPlaybackGeneration,buildSpeakProsody:()=>({speed_ratio:1}),beginSpeechAnimation:expression.beginSpeechAnimation,finishSpeechAnimation:expression.finishSpeechAnimation,endSpeechAnimation:expression.endSpeechAnimation});
// Log native events without changing the actual playback controller callbacks.
const originalSpeak=speechSynthesis.speak.bind(speechSynthesis);speechSynthesis.speak=u=>{for(const type of ['start','boundary','pause','resume','end','error'])u.addEventListener(type,e=>events.push({type,index:e.charIndex,length:e.charLength,elapsed:e.elapsedTime,at:performance.now(),error:e.error}));originalSpeak(u)};
function paint(){const zoom=document.getElementById('zoom');zoom.getContext('2d').clearRect(0,0,300,210);zoom.getContext('2d').drawImage(state.pixiApp.view,565,150,200,140,0,0,300,210);document.getElementById('params').textContent=['A','I','U','E','O'].map(n=>n+': '+Number(values['Param'+n]||0).toFixed(2)).join('  ');requestAnimationFrame(paint)}paint();
window.QA={state,events,start(){started=performance.now();document.getElementById('status').textContent='待机 → 浏览器朗读';setTimeout(async()=>{const voices=speechSynthesis.getVoices();const voice=voices.find(v=>v.localService&&/^zh/i.test(v.lang));window.QAVoice=voice?.name||'zh-CN default';const ok=await playback.speakOnceWithVoice(${JSON.stringify(passage.text)},voice,{force:true,playbackGeneration:state.ttsPlaybackGeneration});if(!ok)window.QAError='browser speech failed';document.getElementById('status').textContent='朗读结束 · 恢复待机';setTimeout(()=>window.QADone=true,1500)},1500)},sample(){return {at:performance.now()-started,wall:Date.now(),mouth:Object.fromEntries(['A','I','U','E','O'].map(n=>[n,values['Param'+n]||0])),phase:state.avatarBrowserSpeech?.phase,index:state.avatarBrowserSpeech?.boundaryIndex}}};window.QAReady=true;
}catch(e){window.QAError=e.stack;console.error(e)}})()</script>`;}
const server=http.createServer((req,res)=>{
 const url=new URL(req.url,"http://localhost"),baseline=url.pathname.startsWith('/before/'),name=decodeURIComponent(baseline?url.pathname.slice(7):url.pathname);
 if(name==='/qa'){res.setHeader('Content-Type','text/html; charset=utf-8');res.end(html(baseline,passages[Number(url.searchParams.get('passage'))]));return}
 let file;
 if(name.startsWith('/api/avatar/live2d/')){const relative=name.slice(19);if(req.headers['x-local-model-test']!=='authenticated'||!allowed.has(relative)){res.writeHead(401);res.end();return}file=path.join(root,relative)}
 else{const relative=name.slice(1);if(baseline&&before.has(relative)){res.setHeader('Content-Type','application/javascript');res.end(before.get(relative));return}file=path.resolve(repo,'web',relative);if(!file.startsWith(path.join(repo,'web')+path.sep)){res.writeHead(404);res.end();return}}
 if(!fs.existsSync(file)){res.writeHead(404);res.end();return}res.setHeader('Content-Type',({'.js':'application/javascript','.json':'application/json','.png':'image/png'})[path.extname(file)]||'application/octet-stream');fs.createReadStream(file).pipe(res);
});
function startAudio(file){return new Promise((resolve,reject)=>{
 const child=cp.spawn(process.env.PYTHON||path.join(repo,'.venv/Scripts/python.exe'),[path.join(repo,'scripts/record_browser_audio.py'),file,path.join(out,'recording-tools')]);
 child.stderr.on('data',data=>process.stderr.write(data));child.once('error',reject);
 const lines=readline.createInterface({input:child.stdout});lines.once('line',line=>resolve({child,...JSON.parse(line)}));child.once('exit',code=>{if(code)reject(Error('audio recorder failed '+code))});
})}
(async()=>{
 fs.mkdirSync(out,{recursive:true});await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const browser=await chromium.launch({headless:true,args:['--use-angle=swiftshader','--enable-webgl','--ignore-gpu-blocklist','--autoplay-policy=no-user-gesture-required']});
 const evidence={baseline:reference,kind:'real-browser-SpeechSynthesis-native-boundaries-WASAPI-output-loopback',cases:[],errors:[]};
 try{for(const passage of (smoke?passages.slice(0,1):passages))for(const baseline of (smoke?[false]:[true,false])){
  const index=passages.indexOf(passage),name=passage.name+(baseline?'-before':'-after'),dir=path.join(out,name);fs.mkdirSync(dir,{recursive:true});
  const page=await browser.newPage({viewport:{width:1000,height:760},deviceScaleFactor:1});page.on('pageerror',e=>evidence.errors.push(e.message));
  await page.route('**/*',route=>/^http:\/\/127\.0\.0\.1:/.test(route.request().url())?route.continue():route.abort());
  await page.goto(`http://127.0.0.1:${server.address().port}/${baseline?'before/':''}qa?passage=${index}`);
  await page.waitForFunction(()=>window.QAReady||window.QAError,null,{timeout:60000});assert.equal(await page.evaluate(()=>window.QAError),undefined);
  const audio=await startAudio(path.join(out,name+'.wav'));await page.evaluate(()=>QA.start());
  const frames=[],samples=[];let frame=0;
  try{while(true){const start=Date.now();const sample=await page.evaluate(()=>QA.sample());samples.push(sample);const file=path.join(dir,`frame-${String(frame++).padStart(4,'0')}.jpg`);await page.screenshot({path:file,type:'jpeg',quality:85});frames.push({file,at:start});
   frames.at(-1).at=Date.now(); // Timestamp the captured image, not request start.
   const status=await page.evaluate(()=>({done:window.QADone,error:window.QAError}));assert.equal(status.error,undefined);if(status.done)break;if(frame>1000)throw Error('speech recording timeout');
   await new Promise(resolve=>setTimeout(resolve,Math.max(0,100-(Date.now()-start))));}
  }finally{audio.child.stdin.end('\n');await new Promise(resolve=>audio.child.once('exit',resolve));}
  const info=await page.evaluate(()=>({events:QA.events,voice:window.QAVoice}));await page.screenshot({path:path.join(out,name+'-final.png')});await page.close();
  assert.ok(info.events.some(e=>e.type==='boundary'));assert.ok(info.events.some(e=>e.type==='end'));assert.ok(samples.some(s=>s.mouth.A>.05));
  const record={name,text:passage.text,...info,frames:frames.length,start:frames[0].at,audioStart:audio.startedAt,samples};evidence.cases.push(record);
  fs.writeFileSync(path.join(out,name+'-evidence.json'),JSON.stringify(record,null,2));
  const concat=frames.map((item,i)=>`file '${path.basename(item.file)}'\nduration ${((frames[i+1]?.at??item.at+100)-item.at)/1000}`).join('\n')+`\nfile '${path.basename(frames.at(-1).file)}'\n`;
  fs.writeFileSync(path.join(dir,'frames.txt'),concat);
  if(process.env.FFMPEG){cp.execFileSync(process.env.FFMPEG,['-hide_banner','-loglevel','error','-y','-safe','0','-f','concat','-i',path.join(dir,'frames.txt'),'-ss',String(Math.max(0,(frames[0].at-audio.startedAt)/1000)),'-i',path.join(out,name+'.wav'),'-c:v','libopenh264','-b:v','1800k','-pix_fmt','yuv420p','-vsync','vfr','-c:a','aac','-b:a','128k','-shortest','-movflags','+faststart',path.join(out,name+'.mp4')]);}
  console.log(JSON.stringify({name,frames:frames.length,boundaries:info.events.filter(e=>e.type==='boundary').length,voice:info.voice}));
 }
 assert.deepEqual(evidence.errors,[]);fs.writeFileSync(path.join(out,smoke?'smoke-evidence.json':'recording-evidence.json'),JSON.stringify(evidence,null,2));
 }finally{await browser.close();await new Promise(resolve=>server.close(resolve))}
})().catch(e=>{console.error(e);process.exitCode=1;server.close()});
