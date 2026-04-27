import { expect, test } from '@playwright/test';

test('home renders core sections', async ({ page }) => {
  await page.goto('/index.html', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('#hero')).toBeVisible();
  await expect(page.locator('#hero .hero-title')).toBeVisible();
  await expect(page.locator('.feature-card')).toHaveCount(6);
  const changelogCount = await page.locator('#changelog .timeline li').count();
  expect(changelogCount).toBeGreaterThanOrEqual(8);
});

test('version panel opens and has items', async ({ page }) => {
  await page.goto('/index.html', { waitUntil: 'domcontentloaded' });
  await page.locator('.version-history-trigger').first().click();
  await expect(page.locator('#versionPanel.open')).toBeVisible();
  await expect(page.locator('#versionPanel .version-panel-list li').first()).toBeVisible();
});

test('runtime console basic actions work', async ({ page }) => {
  await page.goto('/config.html', { waitUntil: 'domcontentloaded' });
  await page.locator('.runtime-console-toggle').click();
  await expect(page.locator('#runtimeConsolePanel')).toBeVisible();

  const logEntries = page.locator('.runtime-console-log .runtime-console-entry');
  const actionButtons = page.locator('.runtime-console-actions .runtime-console-btn');

  await actionButtons.nth(1).click(); // clear
  await expect(logEntries).toHaveCount(0);

  await actionButtons.nth(2).click(); // collapse
  await expect(page.locator('#runtimeConsolePanel')).toBeHidden();
});

test('config page key actions exist', async ({ page }) => {
  await page.goto('/config.html', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('#oneClickApplyBtn')).toBeVisible();
  await expect(page.locator('#checkConnectivityBtn')).toBeVisible();
  await expect(page.locator('#applyConfigToRuntimeBtn')).toBeVisible();
  await expect(page.locator('script[data-live2d-loaded="true"]')).toHaveCount(1);
});
