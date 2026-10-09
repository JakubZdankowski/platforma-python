import { expect, test } from '@playwright/test';

test('UI workshop previews, persists and exports CSS without modifying the app', async ({ page }) => {
  await page.goto('/ui');
  await expect(page.getByRole('heading', { name: 'Komponenty i wygląd' })).toBeVisible();
  await page.getByLabel('Tekst listy ćwiczeń', { exact: true }).fill('18');
  await page.getByRole('button', { name: 'Pierwsza lekcja', exact: true }).click();
  const current = page.locator('.ui-lab-lesson .exercise-picker-list button[aria-current=step]');
  await expect(current).toHaveCSS('font-size', '18px');
  await page.reload();
  await expect(page.getByLabel('Tekst listy ćwiczeń', { exact: true })).toHaveValue('18');
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Pobierz CSS' }).click();
  expect((await download).suggestedFilename()).toBe('platforma-ui.css');
  await page.getByLabel('Wąski ekran (390 px)').check();
  await page.getByRole('button', { name: 'Pierwsza lekcja', exact: true }).click();
  await page.screenshot({ path: 'test-results/ui-workshop.png', fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole('button', { name: 'Przywróć ustawienia' }).click();
  await expect(page.getByLabel('Tekst listy ćwiczeń', { exact: true })).toHaveValue('14');
});
