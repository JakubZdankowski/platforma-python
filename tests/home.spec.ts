import { expect, test } from '@playwright/test';

test('home offers the two login roles without the archived carousel or return link', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Kurs programowania w języku Python' })).toBeVisible();
  const logo = page.getByRole('img', { name: 'Sky Blue', exact: true });
  await expect(logo).toBeVisible();
  await expect.poll(() => logo.evaluate((image: HTMLImageElement) => image.naturalWidth)).toBeGreaterThan(0);
  const links = page.getByRole('main').getByRole('link');
  await expect(links).toHaveText(['Jestem uczniem', 'Jestem nauczycielem']);
  await expect(links.nth(0)).toHaveClass(/button-primary/);
  await expect(links.nth(1)).toHaveClass(/button-secondary/);
  await expect(page.getByRole('link', { name: /Wróć na stronę główną/ })).toHaveCount(0);
  await expect(page.getByRole('banner')).toHaveCount(0);
  await expect(page.locator('.platform-carousel')).toHaveCount(0);
  await links.nth(1).click();
  await expect(page).toHaveURL(/\/login$/);
  await page.goto('/');
  await page.getByRole('link', { name: 'Jestem uczniem' }).click();
  await expect(page).toHaveURL(/\/join$/);
  await page.goto('/student/exercises/76cc40dc-27d5-402c-b445-52f98f74cec4');
  await expect(page).toHaveURL(/\/join$/);
});

test('home and old login-choice URL work without the account module', async ({ page }) => {
  await page.route('**/src/app/AccountApp.tsx*', route => route.fulfill({
    contentType: 'application/javascript',
    body: 'export default function AccountApp() { return "Ta strona nie istnieje"; }',
  }));
  for (const route of ['/', '/sign-in']) {
    await page.goto(route);
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByRole('navigation', { name: 'Wybierz sposób logowania' })).toBeVisible();
    await expect(page.getByText('Ta strona nie istnieje', { exact: true })).toHaveCount(0);
    await page.reload();
    await expect(page.getByRole('link', { name: 'Jestem uczniem' })).toBeVisible();
  }
});

test('new home fits a narrow screen', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await expect(page.getByRole('navigation', { name: 'Wybierz sposób logowania' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
