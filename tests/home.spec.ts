import { expect, test } from '@playwright/test';

test('start page offers login and no anonymous exercise', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Twój pierwszy krok w Pythonie' })).toBeVisible();
  await expect(page.getByRole('textbox', { name: 'Edytor kodu Python' })).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'Zaloguj się jako uczeń →' })).toHaveAttribute('href', '/join');
  await expect(page.getByRole('link', { name: 'Zaloguj się jako nauczyciel →' })).toHaveAttribute('href', '/login');
  await page.getByRole('link', { name: 'Zaloguj się jako uczeń →' }).click();
  await expect(page).toHaveURL(/\/join$/);
  await expect(page.getByRole('textbox', { name: 'Edytor kodu Python' })).toHaveCount(0);
  await page.goto('/student/exercises/76cc40dc-27d5-402c-b445-52f98f74cec4');
  await expect(page).toHaveURL(/\/join$/);
  await expect(page.getByRole('textbox', { name: 'Edytor kodu Python' })).toHaveCount(0);
  await page.goto('/');
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
