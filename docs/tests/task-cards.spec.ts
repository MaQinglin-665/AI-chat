import { expect, test } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const web = path.resolve(__dirname, '../../web');
const source = (name: string) => fs.readFileSync(path.join(web, name), 'utf8');
const makeTask = (status = 'awaiting_approval', count = 2) => ({
  id: 'a'.repeat(32), status, goal_summary: '整理课程资料', workdir: '演示目录/课程资料', created_at: 1793232000,
  progress_count: 3, cancel_requested: false, approval_warnings: { deletes: [], high_risk: false, needs_network: false },
  plan: { summary: '保留文件内容，整理到分类目录。', risk: 'low', needs_network: false, steps: ['检查文件', '分类整理', '核对变化'], commands: ['示例测试命令'],
    files_to_create: Array.from({ length: count }, (_, i) => `资料/课程${i}.txt`), files_to_delete: [], files_to_modify: [] }, planned_moves: []
});
async function setup(page: any, width = 900) {
  await page.setViewportSize({ width, height: 1000 });
  await page.setContent('<main id="chat-log" style="height:900px;overflow:auto;padding:16px"></main>');
  await page.addStyleTag({ content: source('tokens.css') + source('taskCards.css') });
  for (const name of ['taskCardModel.js', 'taskCardMascot.js', 'taskCardView.js']) await page.addScriptTag({ content: source(name) });
  await page.evaluate(() => {
    const w = window as any; w.actions = [];
    w.taskView = w.TaffyTaskCardView.createView({ actions: Object.fromEntries(['approve', 'cancel', 'refresh', 'create', 'hydrate', 'openManager'].map(key => [key, (...args: any[]) => w.actions.push([key, ...args])])) });
  });
}
async function render(page: any, task: any, errors = {}, busy = false) {
  await page.evaluate(({ task, errors, busy }: any) => (window as any).taskView.render({ tasks: [task], roots: ['演示目录/课程资料'], errors, busy }), { task, errors, busy });
}

test('task card is unique, preserves details/focus and safely renders external text', async ({ page }) => {
  await setup(page); const task = makeTask();
  task.plan.commands = ['<img src=x onerror=alert(1)>'];
  await render(page, task);
  await expect(page.locator('.task-card')).toHaveCount(1);
  await expect(page.locator('.task-card button', { hasText: '批准完整计划并执行' })).toBeVisible();
  await page.locator('.task-commands').evaluate((el: any) => { el.open = true; });
  await page.locator('.task-commands summary').focus();
  for (let i = 0; i < 30; i++) await render(page, { ...task, progress_count: i });
  await expect(page.locator('.task-card')).toHaveCount(1);
  await expect(page.locator('.task-commands')).toHaveAttribute('open', '');
  await expect(page.locator('.task-commands summary')).toBeFocused();
  await expect(page.locator('img')).toHaveCount(0);
  await expect(page.locator('.task-commands pre')).toHaveText('<img src=x onerror=alert(1)>');
  await expect(page.locator('.task-count[data-kind="delete"]')).not.toHaveClass(/is-danger/);
  await page.evaluate(() => { document.getElementById('chat-log')!.replaceChildren(); (window as any).taskView.mount(); });
  await expect(page.locator('.task-card')).toHaveCount(1);
});

test('large plan only approves in same-window complete details', async ({ page }) => {
  await setup(page); await render(page, makeTask('awaiting_approval', 11));
  await expect(page.locator('.task-card .task-file')).toHaveCount(5);
  await expect(page.locator('.task-card button', { hasText: '批准完整计划并执行' })).toHaveCount(0);
  await page.getByRole('button', { name: '✦ 查看完整清单并审批' }).click();
  await expect(page.getByRole('dialog', { name: '审批详情' })).toBeVisible();
  await expect(page.locator('.task-detail-panel .task-file')).toHaveCount(11);
  await page.locator('.task-detail-panel').getByRole('button', { name: '✦ 批准完整计划并执行' }).click();
  expect(await page.evaluate(() => (window as any).actions)).toEqual([['approve', 'a'.repeat(32)]]);
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: '✦ 查看完整清单并审批' })).toBeFocused();
});

test('narrow, long paths, errors and busy controls preserve the plan', async ({ page }) => {
  await setup(page, 390); const task = makeTask(); task.workdir = '演示目录/' + '很长的课程目录/'.repeat(12);
  await render(page, task); await expect(page.locator('.task-card')).toHaveAttribute('data-narrow', 'true');
  await expect(page.locator('.task-card button', { hasText: '批准完整计划并执行' })).toBeHidden();
  await page.getByRole('button', { name: '✦ 查看完整计划' }).click();
  await expect(page.locator('.task-detail-panel button', { hasText: '批准完整计划并执行' })).toBeVisible();
  await render(page, task, {}, true);
  await expect(page.locator('.task-detail-panel button', { hasText: '批准完整计划并执行' })).toBeDisabled();
  await render(page, task, { [task.id]: { status: 401, message: '身份验证未通过，审批没有成功。计划已保留。' } });
  await expect(page.locator('.task-detail-panel .task-error')).toContainText('身份验证未通过');
  await expect(page.locator('.task-detail-panel button', { hasText: '批准完整计划并执行' })).toHaveCount(0);
  await expect(page.locator('.task-detail-panel .task-file')).toHaveCount(2);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
});

test('animation stops for offscreen, reduced-motion and terminal cards', async ({ page }) => {
  await setup(page); await render(page, makeTask('executing'));
  await expect(page.locator('.task-card')).toHaveAttribute('data-animate', 'true');
  expect(await page.locator('.task-card').evaluate(el => el.getAnimations({ subtree: true }).length)).toBeGreaterThan(0);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(page.locator('.task-card')).toHaveAttribute('data-animate', 'false');
  expect(await page.locator('.task-card').evaluate(el => el.getAnimations({ subtree: true }).length)).toBe(0);
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.locator('.task-card').evaluate(el => { (el as HTMLElement).style.marginTop = '1800px'; });
  await expect(page.locator('.task-card')).toHaveAttribute('data-animate', 'false');
  await page.locator('.task-card').evaluate(el => { (el as HTMLElement).style.marginTop = '48px'; });
  for (const status of ['completed', 'failed', 'cancelled', 'expired']) {
    await render(page, makeTask(status)); await expect(page.locator('.task-card')).toHaveAttribute('data-animate', 'false');
    expect(await page.locator('.task-card').evaluate(el => el.getAnimations({ subtree: true }).length)).toBe(0);
  }
});

test('all states retain one card and serious warnings are never collapsed', async ({ page }) => {
  await setup(page, 390);
  for (const status of ['planning', 'awaiting_approval', 'executing', 'completed', 'failed', 'cancelled', 'expired', 'unknown']) {
    const task = makeTask(status);
    task.plan.risk = 'high'; task.plan.needs_network = true; task.plan.files_to_delete = ['obsolete.txt'];
    await render(page, task);
    await expect(page.locator('.task-card')).toHaveCount(1);
    await expect(page.locator('.task-warnings')).toContainText('将删除 1 项');
    await expect(page.locator('.task-warnings')).toContainText('高风险');
    await expect(page.locator('.task-warnings')).toContainText('需要联网');
    await expect(page.locator('.task-count[data-kind="delete"]')).toHaveClass(/is-danger/);
    await expect(page.locator('.task-progress')).toHaveAttribute('aria-live', 'off');
  }
  const task = { ...makeTask('executing'), cancel_requested: true };
  await render(page, task);
  await expect(page.locator('.task-status')).toHaveText('正在取消');
  await expect(page.getByRole('button', { name: '正在取消…' })).toBeDisabled();
});

test('large narrow previews exactly five items, with full details and no hidden approval', async ({ page }) => {
  await setup(page, 390); await render(page, makeTask('awaiting_approval', 12));
  await expect(page.locator('.task-card .task-file')).toHaveCount(5);
  await expect(page.locator('.task-card')).toContainText('还有 7 项');
  await expect(page.locator('.task-card button', { hasText: '批准完整计划并执行' })).toBeHidden();
  await page.getByRole('button', { name: '✦ 查看完整清单并审批' }).click();
  await expect(page.locator('.task-detail-panel .task-file')).toHaveCount(12);
});

test('lane remount and resized container keep task identity and plan text selection', async ({ page }) => {
  await setup(page); const task = makeTask(); await render(page, task);
  await page.locator('.task-directory .task-path').evaluate(el => {
    const range = document.createRange(); range.selectNodeContents(el);
    const selected = getSelection()!; selected.removeAllRanges(); selected.addRange(range);
  });
  await render(page, { ...task, progress_count: 99 });
  expect(await page.evaluate(() => getSelection()!.toString())).toBe(task.workdir);
  await page.evaluate(() => {
    document.body.classList.add('view-full');
    const lane = document.createElement('main'); lane.id = 'assistant-chat-log'; lane.style.width = '360px'; document.body.appendChild(lane);
    (window as any).taskView.mount();
  });
  await expect(page.locator('.task-card')).toHaveCount(1);
  await expect(page.locator('#assistant-chat-log .task-card')).toHaveCount(1);
  await expect(page.locator('.task-card')).toHaveAttribute('data-narrow', 'true');
});


test('review: delegation title and complete goal appear once in card and detail', async ({ page }) => {
  await setup(page, 390); const task = makeTask();
  task.goal_summary = '帮我把课程资料整理到分类目录，保留原文件内容。';
  await render(page, task);
  await expect(page.locator('.task-heading h3')).toHaveText('课程资料整理到分类目录');
  await expect(page.locator('.task-card .task-goal')).toHaveText(task.goal_summary);
  await page.getByRole('button', { name: '✦ 查看完整计划' }).click();
  await expect(page.locator('.task-detail-body h3')).toHaveText('课程资料整理到分类目录');
  await expect(page.locator('.task-detail-body .task-goal')).toHaveText(task.goal_summary);
  expect((await page.locator('.task-detail-body').innerText()).split(task.goal_summary)).toHaveLength(2);
});

test('review: expired and failed prioritize replanning; approval evidence survives terminal update', async ({ page }) => {
  await setup(page);
  for (const status of ['expired', 'failed']) {
    await render(page, makeTask(status));
    await expect(page.locator('.task-card .task-primary')).toHaveText('重新规划');
    await expect(page.getByRole('button', { name: '查看原计划', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: '查看已批准的计划', exact: true })).toHaveCount(0);
    await page.getByRole('button', { name: '查看原计划', exact: true }).click();
    await expect(page.locator('.task-detail-actions .task-primary')).toHaveText('重新规划');
    await page.keyboard.press('Escape');
  }
  await render(page, makeTask('executing'));
  await render(page, makeTask('failed'));
  await expect(page.getByRole('button', { name: '查看已批准的计划', exact: true })).toBeVisible();
  await expect(page.locator('.task-card .task-primary')).toHaveText('重新规划');
});

test('review: failed/cancelled illustration, conclusion and reason; errors use one visible list', async ({ page }) => {
  await setup(page);
  const task: any = makeTask('failed');
  task.error = { message: '目标目录已有同名文件。', detail: { message: '请检查目标路径后重新规划。' } };
  task.verification_error = '无法读取核对信息。';
  await render(page, task, { [task.id]: { status: 401, message: '身份验证未通过。' } });
  await expect(page.locator('.task-card .task-error')).toHaveCount(1);
  await expect(page.locator('.task-card .task-error li')).toHaveCount(4);
  await expect(page.locator('.task-conclusion')).toHaveText('这次没有完成任务。');
  await expect(page.locator('.task-reason')).toHaveText('目标目录已有同名文件。');
  expect(await page.locator('.task-card').evaluate(el => {
    const art = el.querySelector('.task-illustration')!, conclusion = el.querySelector('.task-conclusion')!, reason = el.querySelector('.task-reason')!;
    return art.nextElementSibling === conclusion && conclusion.nextElementSibling === reason && getComputedStyle(conclusion).fontWeight === '700';
  })).toBeTruthy();
  for (const status of ['failed', 'cancelled']) {
    await render(page, makeTask(status));
    await expect(page.locator('.task-conclusion')).toBeVisible();
    await expect(page.locator('.task-reason')).toBeVisible();
    await expect(page.locator('.task-card')).not.toContainText('执行结果需要核对');
    await expect(page.locator('.task-card .task-error')).toBeHidden();
  }
  for (const changes of [{ out_of_plan_count: 1 }, { planned_not_observed: { created: ['missing.txt'] } }]) {
    await render(page, { ...makeTask('failed'), changes });
    await expect(page.locator('.task-card .task-error')).toContainText('执行结果需要核对');
  }
  expect(await page.locator('.task-card').evaluate(el => getComputedStyle(el, '::before').content)).toBe('none');
});

test('review: narrow move paths keep source row and arrow/folder destination row', async ({ page }) => {
  await setup(page, 390); const task: any = makeTask();
  task.planned_moves = [{ from: '原路径/课程大纲.txt', to: '目标资料/课程大纲.txt' }];
  task.plan.files_to_create = [task.planned_moves[0].to];
  await render(page, task); await page.getByRole('button', { name: '✦ 查看完整计划' }).click();
  const row = page.locator('.task-detail-panel .task-file-move');
  await expect(row.locator('.task-file-source .task-path')).toHaveText(task.planned_moves[0].from);
  await expect(row.locator('.task-file-destination .task-file-arrow')).toHaveText('→');
  await expect(row.locator('.task-file-destination .task-icon-folder')).toBeVisible();
  await expect(row.locator('.task-file-destination .task-path')).toHaveText(task.planned_moves[0].to);
  expect(await row.evaluate(el => {
    const from = el.querySelector('.task-file-source')!.getBoundingClientRect(), to = el.querySelector('.task-file-destination')!.getBoundingClientRect();
    return to.top >= from.bottom && to.left === from.left && el.scrollWidth <= el.clientWidth;
  })).toBeTruthy();
});


test('polish: reason is shown once; extra error sentences and complete details survive', async ({ page }) => {
  await setup(page); const task: any = makeTask('failed');
  task.error = { message: '演示目标目录中已有同名文件。', detail: { message: '请检查目标路径。' } };
  await render(page, task);
  await expect(page.locator('.task-reason')).toHaveText(task.error.message);
  await expect(page.locator('.task-card .task-error')).not.toContainText(task.error.message);
  await expect(page.locator('.task-card .task-error')).toContainText('请检查目标路径。');
  expect((await page.locator('.task-card').innerText()).split(task.error.message)).toHaveLength(2);
  await page.getByRole('button', { name: '查看原计划', exact: true }).click();
  await expect(page.locator('.task-detail-panel .task-error')).toContainText(task.error.message);
  await page.keyboard.press('Escape');
  task.error = { message: '演示目标目录中已有同名文件。请检查目录后重新规划。' };
  await render(page, task);
  await expect(page.locator('.task-card .task-error')).toHaveText('请检查目录后重新规划。');
  task.error = { message: '演示目标目录中已有同名文件' };
  await render(page, task); await expect(page.locator('.task-card .task-error')).toBeHidden();
});

test('polish: task auth failure stays local while the original HTTP result is preserved', async ({ page }) => {
  await page.goto('/'); await setup(page);
  await page.addScriptTag({ content: source('apiClient.js') });
  await page.addScriptTag({ content: source('externalAgentController.js') });
  await page.evaluate(async (task: any) => {
    const w = window as any; w.taskView.dispose();
    const modal = document.createElement('section'); modal.id = 'external-agent-modal'; document.body.appendChild(modal);
    for (const id of ['btn', 'close', 'error', 'result', 'approve', 'cancel', 'create', 'goal', 'workdir']) {
      const el = document.createElement(id === 'workdir' ? 'select' : 'div'); el.id = 'external-agent-' + id; modal.appendChild(el);
    }
    w.feedback = []; w.requests = []; w.TaffyStageFeedback = { startupFailure: (value: any) => w.feedback.push(value) };
    w.localStorage?.clear();
    w.fetch = async (_url: any, init: any) => { w.requests.push(init); return init?.method ? { ok: false, status: 401, json: async () => ({ ok: false }) } : { ok: true, status: 200, json: async () => ({ ok: true, tasks: [task], allowed_roots: [task.workdir] }) }; };
    w.controller = w.TaffyExternalAgent.createController({ document, authFetch: w.authFetch, state: { speakingEnabled: false }, speak() {}, interval() {} });
    await w.controller.hydrate(); await w.controller.approve(task.id);
  }, makeTask());
  await expect(page.locator('.task-card .task-error')).toContainText('身份验证未通过');
  expect(await page.evaluate(() => (window as any).feedback)).toEqual([]);
  await page.evaluate(async () => { (window as any).fetch = async () => ({ status: 401 }); await (window as any).authFetch('/api/chat'); });
  expect(await page.evaluate(() => (window as any).feedback)).toEqual(['HTTP 401']);
});
