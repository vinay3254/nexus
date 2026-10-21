import { defineConfig, devices } from '@playwright/test';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const storeDirectory = mkdtempSync(join(tmpdir(), 'nexus-store-test-'));
process.on('exit', () => rmSync(storeDirectory, { recursive: true, force: true }));

export default defineConfig({
  testDir: './tests',
  testMatch: '**/*.e2e.ts',
  workers: 1,
  timeout: 30_000,
  use: {
    baseURL: 'http://127.0.0.1:8769',
    trace: 'retain-on-failure',
    launchOptions: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE
      ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE }
      : {},
  },
  projects: [
    {
      name: 'desktop',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 1050 } },
    },
    {
      name: 'mobile',
      use: { ...devices['Desktop Chrome'], viewport: { width: 390, height: 844 } },
    },
  ],
  webServer: {
    env: { NEXUS_STORE_PATH: join(storeDirectory, 'store.sqlite3') },
    command: 'uv run nexus serve --mock-llm --port 8769',
    cwd: fileURLToPath(new URL('..', import.meta.url)),
    url: 'http://127.0.0.1:8769/health',
    reuseExistingServer: false,
    timeout: 30_000,
  },
});
