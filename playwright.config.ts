import { defineConfig, devices } from '@playwright/test';

const port = 4173;
const baseURL = `http://localhost:${port}`;
const ci = Boolean(process.env.CI);

/**
 * The end-to-end and accessibility suite (e2e/). It runs against the production build, which is a
 * separate step (`npm run build`): the web server only previews it.
 */
export default defineConfig({
  testDir: 'e2e',
  fullyParallel: true,
  forbidOnly: ci,
  // A test that fails is a failure: a retry would hide a flaky one.
  retries: 0,
  reporter: ci ? [['list'], ['github']] : 'list',
  use: {
    baseURL,
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'desktop',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1300, height: 900 } },
    },
    {
      name: 'phone',
      use: { ...devices['Desktop Chrome'], viewport: { width: 360, height: 780 } },
    },
  ],
  webServer: {
    command: `npm run preview -w @btc/web -- --port ${port} --strictPort`,
    url: baseURL,
    // Never a server that is already running: it may be serving another checkout's build.
    reuseExistingServer: false,
  },
});
