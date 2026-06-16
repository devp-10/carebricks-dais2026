import { test, expect } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

let testArtifactsDir: string;
let consoleErrors: string[] = [];
let pageErrors: string[] = [];
let failedRequests: string[] = [];

test('smoke test - planner app shell loads', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByRole('heading', { name: 'Medical Desert Planner' })).toBeVisible();
  await expect(page.getByLabel('Planner filters')).toBeVisible();
  await expect(page.getByLabel('Coverage map')).toBeVisible();
  await expect(page.getByLabel('District ranking')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Ranked districts' })).toBeVisible();
  await expect(page.getByRole('button', { name: /Scenario/i })).toBeVisible();
});

test.beforeEach(async ({ page }) => {
  consoleErrors = [];
  pageErrors = [];
  failedRequests = [];
  testArtifactsDir = join(process.cwd(), '.smoke-test');
  mkdirSync(testArtifactsDir, { recursive: true });

  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });

  page.on('pageerror', (error) => {
    pageErrors.push(`${error.message}\n${error.stack ?? ''}`);
  });

  page.on('requestfailed', (request) => {
    failedRequests.push(`${request.url()} - ${request.failure()?.errorText}`);
  });
});

test.afterEach(async ({ page }, testInfo) => {
  const testName = testInfo.title.replace(/ /g, '-').toLowerCase();
  await page.screenshot({
    path: join(testArtifactsDir, `${testName}-app-screenshot.png`),
    fullPage: true,
  });
  writeFileSync(
    join(testArtifactsDir, `${testName}-browser-events.txt`),
    [
      '=== Console Errors ===',
      ...consoleErrors,
      '\n=== Page Errors ===',
      ...pageErrors,
      '\n=== Failed Requests ===',
      ...failedRequests,
    ].join('\n'),
    'utf-8',
  );
  await page.close();
});
