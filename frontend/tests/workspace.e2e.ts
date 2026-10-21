import { test, expect, type Page } from '@playwright/test';
import { generateKeyPairSync, sign } from 'node:crypto';

async function openWorkspace(page: Page, path = '/workspace') {
  await page.goto(path);
  await expect(page.locator('#connection-text')).toHaveText('Connected');
  await expect(page.locator('#registry-agents .store-card')).toHaveCount(4);
}
async function navigate(page: Page, destination: string) {
  const menu = page.locator('#menu');
  if (await menu.isVisible()) await menu.click();
  await page.locator(`.nav-link[data-page="${destination}"]`).click();
  await expect(page.locator(`#page-${destination}`)).toBeVisible();
}

test('live startup, navigation, all agent graphs, keyboard controls, and responsive views', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await openWorkspace(page);
  await expect(page.locator('#run-label')).toHaveText('Run task');
  await page.locator('[data-network-agent="research-agent"]').click();
  await expect(page.locator('#network-inspector h2')).toHaveText('Research Specialist');
  await page.locator('#network-zoom-in').click();
  await page.locator('#network-reset').click();
  await page.locator('[data-network-agent="coding-agent"]').focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('#network-inspector h2')).toHaveText('Coding Specialist');
  await expect(page.locator('#history details')).toHaveCount(0);
  for (const [agent, nodes] of [
    ['coding-agent', 8],
    ['research-agent', 6],
    ['data-agent', 6],
    ['ops-agent', 8],
  ] as const) {
    await page.locator(`[data-workflow-agent="${agent}"]`).click();
    await expect(page.locator('.workflow-node')).toHaveCount(nodes);
    await page.locator('[data-workflow-node="model"]').click();
    await expect(page.locator('#workflow-inspector')).toContainText(agent);
    await page.locator('#workflow-inspector-close').click();
  }
  await page.keyboard.press('Control+k');
  await page.locator('#command-query').fill('Runtime');
  await page.locator('#command-query').press('Enter');
  await expect(page.locator('#page-runtime')).toBeVisible();
  await page.locator('#provider').selectOption('ollama');
  await expect(page.locator('#provider-command')).toContainText('--provider ollama');
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 950 });
    for (const destination of [
      'store',
      'workspace',
      'agents',
      'executions',
      'blackboard',
      'trust',
      'runtime',
    ]) {
      await navigate(page, destination);
      expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(
        false,
      );
    }
  }
  for (const [path, destination] of [
    ['/dashboard', 'workspace'],
    ['/store', 'store'],
    ['/installed', 'agents'],
    ['/blackboard', 'blackboard'],
    ['/execution-inspector', 'executions'],
    ['/agents', 'agents'],
    ['/trust', 'trust'],
    ['/runtime', 'runtime'],
  ]) {
    await openWorkspace(page, path);
    await expect(page.locator(`#page-${destination}`)).toBeVisible();
  }
  expect(errors).toEqual([]);
});

test('multi-agent execution streams outputs, sandbox evidence, receipt, and workflow states', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await openWorkspace(page);
  await page
    .locator('#task-input')
    .fill('Analyze CSV data and write Python code and summarize research findings');
  await page.locator('#preview-plan').click();
  await expect(page.locator('#dialog-body li')).toHaveCount(3);
  await page.locator('#plan-run').click();
  await expect(page.locator('#execution-status')).toHaveText('Completed');
  await navigate(page, 'executions');
  await expect(page.locator('#history details')).toHaveCount(1);
  await expect(page.locator('#sandbox-events details').first()).toBeVisible();
  await page.locator('#event-filter').selectOption('sandbox');
  await expect(page.locator('#full-events .event-row').first()).toBeVisible();
  await navigate(page, 'blackboard');
  await page.locator('#board-search').fill('research-agent');
  await expect(page.locator('#board-entries details')).toHaveCount(1);
  const download = page.waitForEvent('download');
  await page.locator('#export-board').click();
  expect((await download).suggestedFilename()).toBe('nexus-blackboard.json');
  await navigate(page, 'trust');
  await expect(page.locator('#receipt-list details')).toHaveCount(1);
  await navigate(page, 'workspace');
  await page.locator('[data-workflow-agent="research-agent"]').click();
  for (const step of ['route', 'model', 'publish', 'receipt'])
    await expect(page.locator(`[data-workflow-node="${step}"]`)).toHaveAttribute(
      'data-status',
      'completed',
    );
  for (const step of ['system', 'prompt'])
    await expect(page.locator(`[data-workflow-node="${step}"]`)).toHaveAttribute(
      'data-status',
      'pending',
    );
  expect(errors).toEqual([]);
});

test('opt-in preview runs offline and reconnects to live mode after reload', async ({
  page,
  context,
}) => {
  await openWorkspace(page);
  await navigate(page, 'runtime');
  await page.locator('#preview-mode').click();
  await expect(page.locator('#connection-text')).toHaveText('Preview mode');
  await context.setOffline(true);
  await navigate(page, 'workspace');
  await page.locator('#task-input').fill('Write a Python script');
  await page.locator('#run-task').click();
  await expect(page.locator('#execution-status')).toHaveText('Preview complete');
  await page.locator('[data-workflow-agent="coding-agent"]').click();
  await expect(page.locator('[data-workflow-node="heal"]')).toHaveAttribute(
    'data-status',
    'healed',
  );
  await context.setOffline(false);
  await page.reload();
  await expect(page.locator('#connection-text')).toHaveText('Connected');
  await expect(page.locator('#history details')).toHaveCount(0);
});

test('imports and verifies receipts while rejecting tampered signatures', async ({ page }) => {
  await openWorkspace(page, '/trust');
  const { publicKey, privateKey } = generateKeyPairSync('ed25519');
  const receipt = {
    task_id: 'e2e-task',
    payload_digest: 'b'.repeat(64),
    timestamp: '2026-10-21T13:00:00+00:00',
    public_key: publicKey.export({ type: 'spki', format: 'der' }).subarray(-32).toString('hex'),
    signature: '',
  };
  receipt.signature = sign(
    null,
    Buffer.from(`${receipt.task_id}:${receipt.payload_digest}:${receipt.timestamp}`),
    privateKey,
  ).toString('hex');
  const upload = async (data: typeof receipt) =>
    page
      .locator('#receipt-file')
      .setInputFiles({
        name: 'receipt.json',
        mimeType: 'application/json',
        buffer: Buffer.from(JSON.stringify(data)),
      });
  await upload(receipt);
  await page.locator('[data-verify-receipt="0"]').click();
  await expect(page.locator('#receipt-list')).toContainText('Signature verified');
  await upload({ ...receipt, payload_digest: 'c'.repeat(64) });
  await page.locator('[data-verify-receipt="0"]').click();
  await expect(page.locator('#receipt-list details').first()).toContainText('Verification failed');
});
