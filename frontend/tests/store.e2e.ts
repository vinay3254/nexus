import { test, expect, type Page } from '@playwright/test';

async function navigate(page: Page, destination: string) {
  if (await page.locator('#menu').isVisible()) await page.locator('#menu').click();
  await page.locator(`.nav-link[data-page="${destination}"]`).click();
}

test('store discovery, publishing, install, direct execution, update, disable, and uninstall', async ({ page }, testInfo) => {
  const id = `review-${testInfo.project.name}-agent`;
  const name = `Reviewer ${testInfo.project.name}`;
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  await expect(page.locator('#page-store')).toBeVisible();
  await expect(page.locator('#connection-text')).toHaveText('Connected');
  await expect(page.locator('#store-grid [data-store-card="coding-agent"]')).toBeVisible();
  await page.locator('#store-search').fill('Research Specialist');
  await expect(page.locator('#store-grid .store-card')).toHaveCount(1);
  await page.locator('#store-category').selectOption('Data');
  await expect(page.locator('#store-grid .store-card')).toHaveCount(0);
  await page.locator('#store-search').fill('');
  await expect(page.locator('#store-grid .store-card')).toHaveCount(1);
  await page.locator('#store-category').selectOption('');
  await page.locator('#store-publish').click();
  const form = page.locator('#publish-agent-form');
  await form.locator('[name="name"]').fill(name);
  await form.locator('[name="publisher"]').fill('Workspace team');
  await form.locator('[name="id"]').fill(id);
  await form.locator('[name="category"]').selectOption('Development');
  await form.locator('[name="description"]').fill('Reviews supplied functions and explains concrete improvements.');
  await form.locator('[name="capabilities"]').fill('review, code');
  await form.locator('[name="system_prompt"]').fill('Review supplied code. Give specific, evidence-based suggestions.');
  await form.locator('[name="sample_task"]').fill('Review a Python function that adds two numbers.');
  await form.getByRole('button', { name: 'Publish agent', exact: true }).click();
  await expect(page.locator('#dialog-title')).toHaveText(name);
  await expect(page.locator('#dialog-body')).toContainText('Publisher name is self-declared');
  await page.locator('#dialog-body').getByRole('button', { name: 'Install agent', exact: true }).click();
  await expect(page.locator('#dialog-body').getByRole('button', { name: 'Run agent', exact: true })).toBeVisible();
  await page.locator('#dialog-body').getByRole('button', { name: 'Run agent', exact: true }).click();
  await expect(page.locator('#task-agent')).toHaveValue(id);
  await page.locator('#run-task').click();
  await expect(page.locator('#execution-status')).toHaveText('Completed');
  await expect(page.locator(`#workflow-tabs [data-workflow-agent="${id}"]`)).toBeVisible();
  await navigate(page, 'blackboard');
  await page.locator('#board-search').fill(id);
  await expect(page.locator('#board-entries')).toContainText(`${id}:output`);
  await navigate(page, 'agents');
  await page.locator('#agent-search').fill(name);
  await expect(page.locator('#registry-agents .store-card')).toHaveCount(1);
  await page.locator(`#registry-agents [data-store-agent="${id}"]`).last().click();
  await page.locator('#dialog-body').getByRole('button', { name: 'Publish new version' }).click();
  await page.locator('[name="version"]').fill('1.1.0');
  await page.locator('[name="system_prompt"]').fill('Review code with revised instructions and concise suggestions.');
  await page.locator('#publish-agent-form').getByRole('button', { name: 'Publish version' }).click();
  await expect(page.locator('#dialog-body')).toContainText('Update available');
  await expect(page.locator('#dialog-body')).toContainText('Currently installed instructions · v1.0.0');
  await page.locator('#dialog-body').getByRole('button', { name: 'Update to 1.1.0' }).click();
  await expect(page.locator('#dialog-body')).not.toContainText('Update available');
  await page.locator('#dialog-body').getByRole('button', { name: 'Disable', exact: true }).click();
  await expect(page.locator('#dialog-body').getByRole('button', { name: 'Enable', exact: true })).toBeVisible();
  await page.reload();
  await expect(page.locator('#registry-agents')).toContainText('Disabled');
  await page.locator(`#registry-agents [data-store-agent="${id}"]`).last().click();
  await page.locator('#dialog-body').getByRole('button', { name: 'Enable', exact: true }).click();
  const download = page.waitForEvent('download');
  await page.locator('#dialog-body').getByRole('button', { name: 'Export agent JSON' }).click();
  expect((await download).suggestedFilename()).toBe(`${id}-1.1.0.json`);
  await page.locator('#dialog-body').getByRole('button', { name: 'Uninstall', exact: true }).click();
  await page.locator('#dialog-body').getByRole('button', { name: 'Uninstall agent', exact: true }).click();
  await expect(page.locator('#dialog-body').getByRole('button', { name: 'Install agent', exact: true })).toBeVisible();
  await page.locator('#dialog-close').click();
  await expect(page.locator(`#registry-agents [data-store-card="${id}"]`)).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('JSON import reviews instructions before publishing and rejects false trust claims', async ({ page }, testInfo) => {
  await page.goto('/store');
  await expect(page.locator('#connection-text')).toHaveText('Connected');
  const definition = {
    id: `writer-${testInfo.project.name}-agent`, name: 'Draft Editor', publisher: 'My team', version: '1.0.0',
    category: 'Writing', capabilities: ['writing', 'editing'], description: 'Edits drafts for clear and concise wording.',
    system_prompt: 'Edit the supplied draft while preserving meaning.', sample_task: 'Edit this sentence: The report is very long.', timeout_secs: 45,
  };
  const upload = async (value: unknown) => page.locator('#store-file').setInputFiles({ name: 'agent.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(value)) });
  await upload({ ...definition, verified: true });
  await expect(page.locator('#toast')).toContainText('Unknown definition fields: verified');
  await expect(page.locator('#detail-dialog')).not.toBeVisible();
  await upload(definition);
  await expect(page.locator('[name="system_prompt"]')).toHaveValue(definition.system_prompt);
  await expect(page.locator('#store-grid')).not.toContainText(definition.id);
  await page.locator('#publish-agent-form button[type="submit"]').click();
  await expect(page.locator('#dialog-title')).toHaveText('Draft Editor');
  await expect(page.locator('#dialog-body')).toContainText('Not installed');
});
