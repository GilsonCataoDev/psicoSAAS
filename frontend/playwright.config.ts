import { defineConfig, devices } from '@playwright/test'

const useLocalServer = process.env.PLAYWRIGHT_LOCAL === 'true'
const baseURL = process.env.E2E_BASE_URL
  ?? (useLocalServer ? 'http://127.0.0.1:4173' : 'https://usecognia.com.br')

export default defineConfig({
  testDir: './e2e',
  globalTeardown: './e2e/global-teardown.ts',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['html', { open: 'never' }], ['list']] : 'list',
  webServer: useLocalServer ? {
    command: 'npm run preview:dist',
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
  } : undefined,
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
