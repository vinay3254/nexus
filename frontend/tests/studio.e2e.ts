import { test, expect } from '@playwright/test';

test('orbital overview drills into real capabilities, empty outputs, and workflow evidence', async ({ page }) => {
  await page.goto('/dashboard');
  await expect(page.locator('#connection-text')).toHaveText('Connected');
  await expect(page.locator('#network-overview')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('#network-inspector')).toBeHidden();
  await expect(page.locator('.nexus-nucleus')).toBeVisible();
  await expect(page.locator('.orbital-agent')).toHaveCount(4);
  await page.locator('#network-labels').click();
  await expect(page.locator('#network-graph')).toHaveClass(/show-labels/);
  await page.locator('[data-network-agent="research-agent"]').click();
  await expect(page.locator('#network-focus')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('#network-inspector h2')).toHaveText('Research Specialist');
  await expect(page.locator('.network-branch')).toHaveCount(4);
  await expect(page.locator('.fan-leaf')).toHaveCount(5);
  await expect(page.locator('#task-agent')).toHaveValue('research-agent');
  if (test.info().project.name === 'desktop') {
    await page.locator('[data-network-leaf="skill"]').first().click();
    await expect(page.locator('#dialog-title')).toHaveText('Declared capability');
    await page.locator('#dialog-close').click();
    await page.locator('g[data-network-branch="outputs"]').click();
    await expect(page.locator('.focused-network')).toContainText('Run this agent to create shared outputs.');
    await page.locator('g[data-network-branch="workflow"]').click();
    await expect(page.locator('.fan-leaf')).toHaveCount(6);
    await page.locator('[data-network-leaf="workflow"]').first().click();
    await expect(page.locator('#workflow-inspector')).toBeVisible();
  }
  await page.locator('#network-reset').click();
  await expect(page.locator('#network-inspector')).toBeHidden();
  await expect(page.locator('.orbital-agent')).toHaveCount(4);
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
  await expect(page.locator('.runtime-service')).toHaveCount(4);
  await page.locator('[data-network-service="blackboard"]').click();
  await expect(page.locator('#page-blackboard')).toBeVisible();
});

test('reduced motion, panning, zoom, reset, and task dock remain usable', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/dashboard');
  await expect(page.locator('.orbital-agent')).toHaveCount(4);
  expect(await page.locator('.orb-corona').first().evaluate((element) => getComputedStyle(element).animationName)).toBe('none');
  const camera = page.locator('#network-camera');
  const original = await camera.getAttribute('transform');
  await page.locator('#network-zoom-in').click();
  await expect(camera).not.toHaveAttribute('transform', original ?? '');
  await page.locator('#network-reset').click();
  await expect(camera).toHaveAttribute('transform', original ?? '');
  const viewport = await page.locator('#network-viewport').boundingBox();
  if (viewport) {
    await page.mouse.move(viewport.x + 20, viewport.y + 40);
    await page.mouse.down();
    await page.mouse.move(viewport.x + 75, viewport.y + 70, { steps: 5 });
    await page.mouse.up();
    await expect(camera).not.toHaveAttribute('transform', original ?? '');
  }
  await page.locator('#network-reset').click();
  await page.locator('#task-input').fill('Research and summarize SQLite');
  await page.locator('#preview-plan').click();
  await expect(page.locator('#dialog-title')).toHaveText('Execution plan');
  await page.locator('#dialog-close').click();
  await page.locator('#studio-evidence').click();
  await expect(page.locator('#agent-workflow')).toBeInViewport();
});
