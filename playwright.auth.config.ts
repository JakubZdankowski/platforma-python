import { defineConfig, devices } from '@playwright/test';
import { localKeys } from './tests/db/localSupabase';

// Browser tests for sign-in and class management against the local
// Supabase stack. Keys come from `supabase status`, so no .env is needed.
const { url, publishableKey } = localKeys();

export default defineConfig({
  testDir: './tests/auth',
  fullyParallel: false,
  workers: 1,
  timeout: 60_000,
  expect: { timeout: 15_000 },
  reporter: 'list',
  use: {
    baseURL: 'http://127.0.0.1:5174',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'], viewport: { width: 1366, height: 768 } } }],
  webServer: {
    command: 'node node_modules/vite/bin/vite.js --host 127.0.0.1 --port 5174 --strictPort',
    url: 'http://127.0.0.1:5174',
    reuseExistingServer: false,
    env: { VITE_SUPABASE_URL: url, VITE_SUPABASE_PUBLISHABLE_KEY: publishableKey },
  },
});
