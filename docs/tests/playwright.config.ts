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
    // CI runners may expose only python3; keep python as fallback for local Windows setups.
    command: 'python3 -m http.server 5500 || python -m http.server 5500',
    cwd: '..',
    url: 'http://127.0.0.1:5500',
    reuseExistingServer: true,
    timeout: 60_000
  }
});
