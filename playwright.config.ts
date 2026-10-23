import { defineConfig, devices } from '@playwright/test';
import { existsSync } from 'node:fs';

const chromiumExecutable =
  process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE ||
  (existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : undefined);

export default defineConfig({
  testDir: './tests',
  testIgnore: [
    'database.spec.ts',
    'signin-errors.spec.ts',
    'photo-upload.spec.ts',
    'password-auth.spec.ts',
    'authenticator.spec.ts',
  ],
  outputDir: 'test-results/demo',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: 2,
  reporter: 'list',
  use: {
    baseURL: 'http://127.0.0.1:5173',
    timezoneId: 'America/Edmonton',
    launchOptions: { executablePath: chromiumExecutable },
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'desktop-chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile-chromium', use: { ...devices['Pixel 7'] } },
  ],
  webServer: {
    command: 'npm run dev -- --host 127.0.0.1',
    url: 'http://127.0.0.1:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
  },
});
