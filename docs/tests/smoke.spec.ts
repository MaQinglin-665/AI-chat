import { expect, test } from '@playwright/test';

test('首页核心区加载正常', async ({ page }) => {
  await page.goto('/index.html');
  await expect(page).toHaveTitle(/馨语Ai桌宠/);
  await expect(page.locator('#hero .hero-title')).toHaveText(/馨语Ai桌宠/);
  await expect(page.locator('.feature-card')).toHaveCount(6);
  const changelogCount = await page.locator('#changelog .timeline li').count();
  expect(changelogCount).toBeGreaterThanOrEqual(8);
});

test('版本历史面板可打开并显示条目', async ({ page }) => {
  await page.goto('/index.html');
  await page.getByRole('button', { name: '版本历史' }).first().click();
  await expect(page.locator('#versionPanel.open')).toBeVisible();
  await expect(page.locator('#versionPanel .version-panel-list li').first()).toBeVisible();
});

test('运行时控制台按钮链路可用', async ({ page }) => {
  await page.goto('/config.html');
  await page.locator('.runtime-console-toggle').click();
  await expect(page.locator('#runtimeConsolePanel')).toBeVisible();

  await page.getByRole('button', { name: '清空' }).click();
  await expect(page.locator('.runtime-console-status')).toContainText('日志已清空');

  await page.getByRole('button', { name: '收起' }).click();
  await expect(page.locator('#runtimeConsolePanel')).toBeHidden();
});

test('配置页关键操作区存在', async ({ page }) => {
  await page.goto('/config.html');
  await expect(page.locator('#oneClickApplyBtn')).toBeVisible();
  await expect(page.locator('#checkConnectivityBtn')).toBeVisible();
  await expect(page.locator('#applyConfigToRuntimeBtn')).toBeVisible();
  await page.keyboard.press('Tab');
  await expect(page.locator('script[data-live2d-loaded="true"]')).toHaveCount(1);
});
