import { defineConfig, devices } from '@playwright/test'

const baseURL = process.env.E2E_BASE_URL ?? 'https://usecognia.com.br'

export default defineConfig({
  testDir: './e2e',
  globalTeardown: './e2e/global-teardown.ts',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['html', { open: 'never' }], ['list']] : 'list',
  use: {
    baseURL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 7'] },
    },
  ],
})
