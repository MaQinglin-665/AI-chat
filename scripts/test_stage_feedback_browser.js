// Run against a static web/ server; uses synthetic API replies, never private data.
const { chromium } = require('playwright');
const assert = require('assert');
const fs = require('fs');
const path = require('path');
(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 774, height: 900 } });
    const cfg = JSON.parse(fs.readFileSync(path.join(__dirname, '../config.example.json'), 'utf8'));
    cfg.model_path = '/models/hiyori_pro_t11/hiyori_pro_t11.model3.json';
    cfg.onboarding_completed = true; cfg.tts.provider = 'browser';
    await page.route('**/config.json', r => r.fulfill({ contentType: 'application/json', body: JSON.stringify(cfg) }));
    await page.route('**/api/**', r => r.fulfill({ status: 401, contentType: 'application/json', body: '{"error":"Invalid API token."}' }));
    await page.goto(process.env.STAGE_SMOKE_URL || 'http://127.0.0.1:8125/?view=full');
    await page.waitForTimeout(4000);
    assert((await page.locator('#stage-feedback').textContent()).includes('访问令牌无效或缺失'));
    const out = path.join(__dirname, '../tmp_ui_smoke'); fs.mkdirSync(out, { recursive: true });
    await page.screenshot({ path: path.join(out, 'after-startup-auth.png') });
    await page.evaluate(() => {
      document.querySelectorAll('[id$="modal"]').forEach(e => e.hidden = true);
      document.getElementById('conversation-rail').className = 'conversation-rail';
      for (const [id, role] of [['user-chat-log', 'user'], ['assistant-chat-log', 'assistant']])
        document.getElementById(id).innerHTML = `<div class="message ${role}"><div class="content">${role === 'user' ? '你好，今天可以聊聊吗？' : '你好，我在这里。'}</div></div>`;
      TaffyStageFeedback.clear();
    });
    for (const width of [774, 516]) {
      await page.setViewportSize({ width, height: 900 });
      for (const id of ['assistant-chat-log', 'user-chat-log']) assert((await page.locator('#' + id).boundingBox()).height > 80);
      await page.screenshot({ path: path.join(out, `after-lanes-${width}.png`) });
      await page.locator('#conversation-rail').evaluate(e => e.classList.add('is-assistant-lane-collapsed'));
      assert.equal(await page.locator('#assistant-chat-log').boundingBox(), null);
      await page.locator('#conversation-rail').evaluate(e => e.classList.remove('is-assistant-lane-collapsed'));
    }
    await page.evaluate(() => { window.feedbackTestId = TaffyStageFeedback.begin(); });
    assert(await page.locator('#stage-feedback').isHidden());
    await page.waitForTimeout(650);
    assert((await page.locator('#stage-feedback').textContent()).includes('正在想'));
    await page.screenshot({ path: path.join(out, 'after-waiting.png') });
    await page.evaluate(() => TaffyStageFeedback.received(window.feedbackTestId));
    assert(await page.locator('#stage-feedback').isHidden());
    await page.evaluate(() => TaffyStageFeedback.failed(window.feedbackTestId, 'timeout'));
    await page.screenshot({ path: path.join(out, 'after-error.png') });
    assert(await page.locator('#stage-feedback-doctor').isVisible());
    await page.locator('#stage-feedback-dismiss').click();
    assert(await page.locator('#stage-feedback').isHidden());
    await page.evaluate(() => {
      const guide = TaffyOnboardingController.createController({ state: {}, ui: TaffyChatDom.createUI(document), onboardingSteps: [{ title: '先打个招呼', desc: '在输入框发一句话', tip: '可以直接输入' }, { title: '语音' }] });
      guide.openOnboardingModal();
    });
    await page.locator('#chat-input').click();
    await page.locator('#chat-input').fill('输入框没有被挡住');
    assert.equal(await page.locator('#chat-input').inputValue(), '输入框没有被挡住');
    assert(await page.locator('#onboarding-quick-btn').isHidden());
    assert(await page.locator('#onboarding-next-btn').isVisible());
    await page.screenshot({ path: path.join(out, 'after-onboarding-narrow.png') });
    console.log('Real browser: 774/516px lanes, collapse, stage states, startup 401 and unobstructed onboarding passed.');
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
