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
