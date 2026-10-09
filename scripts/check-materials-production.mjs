// Read-only UI acceptance. Uses the designated deployment-test student only.
// Run with --env-file=.env.production.account.local; never prints credentials.
import assert from 'node:assert/strict';
import { chromium } from '@playwright/test';

const username = process.env.SMOKE_STUDENT_USERNAME;
const password = process.env.SMOKE_STUDENT_PASSWORD;
if (!username || !password) throw new Error('Missing deployment-test student credentials');
const base = 'https://jakubzdankowski.github.io/platforma-python';
const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 1366, height: 768 } });
  await page.goto(`${base}/join`);
  await page.getByLabel('Nazwa użytkownika').waitFor();
  assert.equal(await page.getByLabel('Kod klasy').count(), 0);
  await page.getByLabel('Nazwa użytkownika').fill(username);
  await page.getByLabel('Hasło').fill(password);
  await page.getByRole('button', { name: 'Zaloguj się', exact: true }).click();
  await page.getByRole('navigation', { name: 'Panel ucznia' }).waitFor();
  assert.equal(await page.getByText('Kurs programowania w języku Python').count(), 0);
  await page.getByRole('link', { name: 'Materiały', exact: true }).click();
  const module = page.locator('.material-toggle').first();
  await module.waitFor();
  assert.equal(await module.getAttribute('aria-expanded'), 'false');
  assert.equal(await page.locator('.module-exercises a').count(), 0);
  await page.screenshot({ path: 'test-results/production-materials-collapsed.png', fullPage: true });
  await module.click();
  await page.locator('.module-exercises a').first().waitFor();
  await page.reload();
  await page.locator('.module-exercises a').first().waitFor();
  assert.equal(await page.locator('.material-toggle').first().getAttribute('aria-expanded'), 'true');
  await page.screenshot({ path: 'test-results/production-materials-expanded.png', fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  await page.screenshot({ path: 'test-results/production-materials-mobile.png', fullPage: true });
  await page.getByRole('link', { name: 'Pomoc', exact: true }).click();
  await page.getByRole('heading', { name: 'Jak otworzyć zadanie?' }).waitFor();
  await page.getByRole('button', { name: 'Wyloguj się', exact: true }).click();
  await page.getByLabel('Nazwa użytkownika').waitFor();
  console.log('Production acceptance passed: independent login, sidebar, modules, expansion, reload, mobile, help and logout. No content or student work changed.');
} finally { await browser.close(); }
