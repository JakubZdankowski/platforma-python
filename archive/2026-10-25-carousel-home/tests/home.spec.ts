import { expect, test } from '@playwright/test';

test('role choice remains available when the account module has stale routes', async ({ page }) => {
  // Reproduce an older lazy module whose wildcard renders the reported fallback.
  await page.route('**/src/app/AccountApp.tsx*', route => route.fulfill({
    contentType: 'application/javascript',
    body: 'export default function AccountApp() { return "Ta strona nie istnieje"; }',
  }));
  await page.goto('/sign-in');
  await expect(page.getByText('Ta strona nie istnieje', { exact: true })).toHaveCount(0);
  await expect(page.getByRole('navigation', { name: 'Wybierz sposób logowania' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Jestem uczniem' })).toHaveAttribute('href', '/join');
  await expect(page.getByRole('link', { name: 'Jestem nauczycielem' })).toHaveAttribute('href', '/login');
});

test('home showcases platform and header login opens role choice', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('region', { name: 'Zobacz platformę w działaniu' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Jestem uczniem' })).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'Jestem nauczycielem' })).toHaveCount(0);
  const screenshots = page.locator('.platform-carousel img');
  await expect(screenshots).toHaveCount(3);
  for (const image of await screenshots.all()) {
    await expect.poll(() => image.evaluate((element: HTMLImageElement) => element.naturalWidth)).toBeGreaterThan(0);
  }
  await page.getByRole('banner').getByRole('link', { name: 'Zaloguj się', exact: true }).click();
  await expect(page).toHaveURL(/\/sign-in$/);
  await expect(page.getByRole('navigation', { name: 'Wybierz sposób logowania' })).toBeVisible();
  await expect(page.getByRole('banner')).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'Jestem uczniem' })).toHaveAttribute('href', '/join');
  await page.getByRole('link', { name: 'Jestem nauczycielem' }).click();
  await expect(page).toHaveURL(/\/login$/);
  await page.goto('/sign-in');
  await page.getByRole('link', { name: 'Jestem uczniem' }).click();
  await expect(page).toHaveURL(/\/join$/);
  await expect(page.getByRole('textbox', { name: 'Edytor kodu Python' })).toHaveCount(0);
  await page.goto('/student/exercises/76cc40dc-27d5-402c-b445-52f98f74cec4');
  await expect(page).toHaveURL(/\/join$/);
  await page.goto('/sign-in');
  await page.getByRole('link', { name: 'Wróć na stronę główną' }).click();
  await expect(page).toHaveURL(/\/$/);
});

test('carousel rotates, pauses and supports manual navigation', async ({ page }) => {
  await page.clock.install();
  await page.goto('/');
  const count = page.locator('.platform-carousel-count');
  await expect(count).toHaveText('1 / 3');
  await page.clock.fastForward(6000);
  await expect(count).toHaveText('2 / 3');
  await page.getByRole('button', { name: 'Zatrzymaj pokaz' }).click();
  await page.mouse.move(0, 0);
  await page.getByRole('link', { name: 'Zaloguj się', exact: true }).focus();
  await page.clock.fastForward(12000);
  await expect(count).toHaveText('2 / 3');
  await page.getByRole('button', { name: 'Następny zrzut' }).click();
  await expect(count).toHaveText('3 / 3');
  await page.getByRole('button', { name: 'Wznów pokaz' }).click();
  await page.mouse.move(0, 0);
  await page.getByRole('link', { name: 'Zaloguj się', exact: true }).focus();
  await page.clock.fastForward(6000);
  await expect(count).toHaveText('1 / 3');
});

test('reduced motion disables automatic rotation', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.clock.install();
  await page.goto('/');
  await expect(page.locator('.platform-carousel-count')).toHaveText('1 / 3');
  await page.clock.fastForward(12000);
  await expect(page.locator('.platform-carousel-count')).toHaveText('1 / 3');
  await expect(page.getByRole('button', { name: 'Zatrzymaj pokaz' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Poprzedni zrzut' }).click();
  await expect(page.locator('.platform-carousel-count')).toHaveText('3 / 3');
});

test('home and role choice fit a narrow screen', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  for (const route of ['/', '/sign-in']) {
    await page.goto(route);
    await expect(page.getByRole('main')).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
});
