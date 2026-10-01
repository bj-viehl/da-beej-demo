const { defineConfig, devices } = require('@playwright/test');

const PORT = process.env.AEM_PORT || 3000;

module.exports = defineConfig({
  testDir: './test',
  outputDir: './test-results',
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'playwright-report' }]],
  use: {
    baseURL: process.env.BASE_URL || `http://localhost:${PORT}`,
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'mobile', use: { ...devices['Desktop Chrome'], viewport: { width: 375, height: 667 } } },
    { name: 'tablet', use: { ...devices['Desktop Chrome'], viewport: { width: 768, height: 1024 } } },
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1200, height: 800 } } },
  ],
  // Content lives in da.live; `aem up` proxies it from the .aem.page preview.
  // Skipped when BASE_URL targets a remote preview.
  webServer: process.env.BASE_URL ? undefined : {
    command: 'npx aem up --no-open --html-folder drafts --forward-browser-logs',
    // port check (not url): a fresh DA repo may 404 on / until a homepage is authored
    port: Number(PORT),
    reuseExistingServer: true,
    timeout: 60_000,
  },
});
