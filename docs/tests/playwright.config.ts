import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: '.',
  testMatch: ['smoke.spec.ts'],
  timeout: 45_000,
  expect: {
    timeout: 10_000
  },
  use: {
    baseURL: 'http://127.0.0.1:5500',
    headless: true,
    viewport: { width: 1366, height: 900 }
  },
  reporter: [['list']],
  webServer: {
    // Use Node-based static server to avoid shell/python differences across runners.
    command: 'node tests/static-server.mjs',
    cwd: '..',
    url: 'http://127.0.0.1:5500',
    reuseExistingServer: true,
    timeout: 60_000
  }
});
