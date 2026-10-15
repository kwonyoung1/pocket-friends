import { defineConfig, devices } from '@playwright/test'
import { existsSync } from 'node:fs'
export default defineConfig({
  testDir: './cloud-tests', timeout: 45000, workers: 1,
  use: { baseURL: 'http://127.0.0.1:4185', trace: 'retain-on-failure', launchOptions: existsSync('/usr/bin/chromium') ? { executablePath: '/usr/bin/chromium', args: ['--no-sandbox'] } : {} },
  projects: [{ name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 1100 } } }, { name: 'mobile', use: { ...devices['iPhone 13'], defaultBrowserType: 'chromium' } }],
  webServer: { command: 'npm run dev -- --port 4185 --strictPort', url: 'http://127.0.0.1:4185', reuseExistingServer: false, env: { VITE_CLOUD_ENABLED: 'true', VITE_SUPABASE_URL: 'https://cloud-fixture.supabase.co', VITE_SUPABASE_ANON_KEY: 'sb_publishable_testfixture123456789' } },
})
