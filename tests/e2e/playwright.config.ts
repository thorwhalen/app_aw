import { defineConfig, devices } from '@playwright/test'

/**
 * E2E test configuration for AW App
 */
export default defineConfig({
  testDir: './scenarios',
  fullyParallel: false, // Run tests sequentially to avoid conflicts
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1, // Single worker to avoid database conflicts
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['list'],
  ],
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  // Start services before running tests
  webServer: [
    {
      command: 'cd ../../backend && uvicorn app.main:app --port 8000',
      port: 8000,
      timeout: 120000,
      reuseExistingServer: !process.env.CI,
      env: {
        DATABASE_URL: 'sqlite+aiosqlite:///./test_aw_app.db',
        STORAGE_PATH: './test_data',
        DEBUG: 'true',
      },
    },
    {
      command: 'cd ../../frontend && npm run dev -- --port 3000',
      port: 3000,
      timeout: 120000,
      reuseExistingServer: !process.env.CI,
    },
  ],
})
