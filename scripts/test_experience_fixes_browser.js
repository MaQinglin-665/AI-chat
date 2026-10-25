const {chromium}=require('playwright');
const assert=require('node:assert/strict');const fs=require('node:fs');
(async()=>{
const browser=await chromium.launch({channel:'msedge',headless:true});
try{
 const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 const cfg=JSON.parse(fs.readFileSync('config.example.json','utf8'));cfg.onboarding_completed=true;cfg.model_path='/models/hiyori_pro_t11/hiyori_pro_t11.model3.json';cfg.tts.provider='browser';
 await page.route('**/config.json',r=>r.fulfill({json:cfg}));
 for(const [width,height] of [[1024,768],[774,1208]]){
  await page.setViewportSize({width,height});await page.goto('http://127.0.0.1:8124/?view=full');await page.waitForTimeout(3500);
  await page.evaluate(()=>{document.querySelectorAll('#onboarding-modal,#first-run-modal').forEach(e=>e.hidden=true);localStorage.removeItem('xinyu.conversation.expanded');});
  assert.equal(await page.locator('#conversation-collapse-btn').getAttribute('aria-expanded'),'true');
  await page.evaluate(()=>{
   for(const [id,role,text] of [['user-chat-log','user','今天晚上吃什么好呢？'],['assistant-chat-log','assistant','我是馨语。今晚可以吃清汤面配鸡蛋，清淡又方便。\n如果想换口味，也可以做一碗蔬菜粥。']]){
    const row=document.createElement('div');row.className='message '+role;const content=document.createElement('span');content.className='content';content.textContent=text;row.append(content);document.getElementById(id).replaceChildren(row);
   }
  });
  await page.waitForTimeout(100);
  const lanes=await page.locator('#user-chat-log,#assistant-chat-log').evaluateAll(es=>es.map(e=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height,bottom:r.bottom};}));
  assert(lanes.every(r=>r.width>100&&r.height>40),JSON.stringify(lanes));
  if(width<=820){assert(lanes[0].bottom<=lanes[1].y || lanes[1].bottom<=lanes[0].y);assert(!(await page.locator('#pet-mode-btn').isVisible()));}
  await page.screenshot({path:`tmp_ui_smoke/task6/stage-${width}x${height}.png`});
  await page.locator('#conversation-collapse-btn').click();
  assert(await page.locator('#latest-stage-reply').isVisible());assert((await page.locator('#latest-stage-reply').textContent()).includes('清汤面'));
  await page.waitForTimeout(16000);assert(await page.locator('#latest-stage-reply').isVisible());
  await page.screenshot({path:`tmp_ui_smoke/task6/collapsed-${width}x${height}.png`});
  await page.reload();await page.waitForTimeout(1500);assert.equal(await page.locator('#conversation-collapse-btn').getAttribute('aria-expanded'),'false');
  await page.evaluate(()=>localStorage.removeItem('xinyu.conversation.expanded'));
 }
 await page.evaluate(()=>{
  const state={onboardingStepIndex:0};window.testGuideState=state;
  const guide=TaffyOnboardingController.createController({state,ui:TaffyChatDom.createUI(document),onboardingSteps:[{title:'先打个招呼',desc:'在底部输入一句话并发送。',tip:'发送后会自动进入下一步。'},{title:'看看回复',desc:'回复会显示在对话区。'}]});guide.openOnboardingModal();
 });
 await page.screenshot({path:'tmp_ui_smoke/task6/onboarding.png'});
 await page.evaluate(()=>document.dispatchEvent(new CustomEvent('xinyu:user-message')));assert.equal(await page.evaluate(()=>testGuideState.onboardingStepIndex),1);
 await page.evaluate(()=>document.getElementById('onboarding-modal').hidden=true);
 const task={id:'fixture',status:'awaiting_approval',workdir:'示例目录',planned_moves:[{from:'sales.csv',to:'data/sales.csv'}],plan:{summary:'移动示例文件，不删除文件。',steps:['创建目录并移动'],files_to_delete:['sales.csv'],files_to_create:['data','data/sales.csv'],files_to_modify:[],commands:['Move-Item sales.csv data/sales.csv'],risk:'low',needs_network:false}};
 await page.route('**/api/agent/task**',r=>r.fulfill({json:{ok:true,tasks:[task],task,allowed_roots:['示例目录']}}));
 await page.locator('#more-btn').click();await page.locator('#external-agent-btn').click();
 assert((await page.locator('#external-agent-result').textContent()).includes('sales.csv → data/sales.csv'));
 assert(!(await page.locator('#external-agent-result .external-agent-danger').allTextContents()).some(t=>t.includes('sales.csv')));
 assert.equal(await page.locator('#external-agent-result details').getAttribute('open'),null);
 await page.screenshot({path:'tmp_ui_smoke/task6/move-plan.png'});
 task.status='failed';task.error={message:'模型服务暂时不可用',detail:{type:'turn.failed',http_status:503,message:'HTTP 503 service unavailable'}};await page.waitForTimeout(1400);

 assert((await page.locator('.external-agent-state').textContent()).includes('503'));
 assert(!(await page.locator('#external-agent-create').isVisible()));
 assert(!(await page.locator('#external-agent-approve').isVisible()));
 assert(await page.locator('.external-agent-state button').isVisible());
 await page.screenshot({path:'tmp_ui_smoke/task6/failed-card.png'});
 assert.deepEqual(errors,[]);console.log('Experience browser matrix passed: visible reply, 16s persistence, stored collapse, narrow lanes, onboarding, move/failed cards.');
}finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
