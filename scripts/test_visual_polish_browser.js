const {chromium}=require('playwright');
const fs=require('fs'); const assert=require('node:assert/strict');
(async()=>{
 const phase=process.argv[2]||'after';
 fs.mkdirSync('tmp_ui_smoke/visual-polish',{recursive:true});
 const browser=await chromium.launch({channel:'msedge',headless:true});
 for(const [width,height] of [[800,600],[1280,800],[1920,1080]]){
 const page=await browser.newPage({viewport:{width,height}});
 const cfg=JSON.parse(fs.readFileSync('config.example.json','utf8'));cfg.model_path='/models/hiyori_pro_t11/hiyori_pro_t11.model3.json';cfg.onboarding_completed=true;cfg.tts.provider='browser';
 await page.route('**/config.json',r=>r.fulfill({json:cfg}));
 const task={id:'visual-fixture',status:'awaiting_approval',workdir:'体验目录',plan:{summary:'整理示例笔记，等待批准后执行。',risk:'high',needs_network:true,steps:['检查笔记','整理文件'],files_to_delete:['旧笔记.txt'],files_to_modify:['README.md'],files_to_create:['笔记/今天.txt'],commands:['整理示例文件']}};
 await page.route('**/api/agent/task**',r=>r.fulfill({json:{ok:true,tasks:[task],task,allowed_roots:['体验目录']}}));
 if(phase==='before'){
  const cp=require('node:child_process');
  for(const file of ['index.html','controlCenterShell.js','galgameController.js','live2dLayoutController.js','scheduleFormModel.js','scheduleListView.js','configSwitchController.js']){
   const body=cp.execFileSync('git',['show','cf94872:web/'+file],{encoding:'utf8'});
   await page.route(file==='index.html'?'**/?view=full':'**/'+file,r=>r.fulfill({body,contentType:file.endsWith('.html')?'text/html':'application/javascript'}));
  }
 }
 await page.goto(process.env.VISUAL_POLISH_URL||'http://127.0.0.1:8124/?view=full');
 await page.waitForTimeout(4000);
 await page.evaluate(()=>{document.querySelectorAll('#onboarding-modal,#first-run-modal').forEach(x=>x.hidden=true);document.body.dataset.stageRoom='night';document.body.dataset.stageScene='night';});
 const shot=async name=>{await page.waitForTimeout(450);await page.screenshot({path:`tmp_ui_smoke/visual-polish/${phase}-${width}x${height}-${name}.png`});};
 await shot('stage');
 if(phase==='after'){
  for(const id of ['speak-btn','subtitle-toggle-btn','pet-mode-btn','scene-btn','more-btn','galgame-open']){const b=page.locator('#'+id);assert(await b.isVisible(),id);assert(await b.getAttribute('aria-label'),id);const rect=await b.boundingBox();assert(rect.y<100 && rect.x+rect.width<=width,id);}
  const b=page.locator('#speak-btn'),old=await b.getAttribute('aria-pressed');await b.click();assert.notEqual(await b.getAttribute('aria-pressed'),old);await b.click();
  assert.equal(await page.locator('.conversation-identity').isVisible(),false);
  await page.locator('#scene-btn').focus();await page.keyboard.press('Tab');assert.equal(await page.locator('#more-btn').evaluate(e=>getComputedStyle(e).outlineColor),'rgb(243, 194, 122)');
 }

 await page.locator('#more-btn').click();await shot('more');
 await page.locator('#config-switch-btn').click();await page.waitForTimeout(800);await shot('settings');
 if(phase==='after'){
  const body=page.locator('#config-switch-modal .config-switch-body');assert(await body.evaluate(e=>e.scrollWidth<=e.clientWidth+1));
  await page.locator('#config-switch-modal .control-center-advanced-toggle').click();
  for(const provider of ['browser','qwen3_tts','gpt_sovits','volcengine_tts']){
   await page.locator('#config-switch-tts-provider').selectOption(provider);
   assert.equal(await page.locator('#config-switch-qwen3-tts-timeout-row').isVisible(),provider==='qwen3_tts');
   assert.equal(await page.locator('#config-switch-gpt-sovits-timeout-row').isVisible(),provider==='gpt_sovits');
  }
  await page.locator('#config-switch-tts-provider').selectOption('browser');
  await page.locator('#config-switch-tts-provider').scrollIntoViewIfNeeded();await shot('settings-voice');
 }

 await page.locator('#config-switch-close-btn').click();
 await page.locator('#galgame-open').click();await shot('galgame');
 if(phase==='after'){
  assert.equal(await page.locator('#galgame-scene').evaluate(e=>getComputedStyle(e).appearance),'none');
  const v=page.locator('#galgame-voice'),old=await v.getAttribute('aria-pressed');await v.click();assert.notEqual(await v.getAttribute('aria-pressed'),old);
 }
await page.locator('#galgame-exit').click();
 if(!await page.locator('#external-agent-btn').isVisible())await page.locator('#more-btn').click();
 await page.locator('#external-agent-btn').click();await shot('approval');
 await page.locator('#external-agent-result').scrollIntoViewIfNeeded();await shot('approval-plan');
 await page.locator('#external-agent-approve').scrollIntoViewIfNeeded();await shot('approval-actions');
 if(phase==='after'){
 await page.emulateMedia({reducedMotion:'reduce'});
 assert.equal(await page.locator('.stage-scene-halo').evaluate(e=>getComputedStyle(e).animationName),'none');
 assert.equal(await page.locator('.stage-room-background').first().evaluate(e=>getComputedStyle(e).transitionDuration),'0s');
 }
 console.log(phase,width,height,'five views captured and verified');await page.close();
 }
 await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
