import { expect, test } from '@playwright/test';

test('student sidebar and full-width modules reveal lessons only after expansion', async ({ page }) => {
  await page.goto('/tests/fixtures/student-home.html');
  await expect(page.getByRole('navigation', { name: 'Panel ucznia' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Cześć, Ania!' })).toBeVisible();
  await expect(page.getByText('Kurs programowania w języku Python')).toHaveCount(0);
  await expect(page.locator('.module-lesson-list')).toHaveCount(0);
  const toggle = page.getByRole('button', { name: '1. Podstawy Pythona', exact: true });
  await expect(toggle).toHaveText('1. Podstawy Pythona');
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  await page.screenshot({ path: 'test-results/student-materials-desktop.png', fullPage: true });
  await toggle.click();
  await expect(page.getByRole('heading', { name: /Pierwsze kroki w Pythonie/ })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Inna klasa' })).toHaveCount(0);
  await expect(page.getByRole('link', { name: /Powitanie/ })).toHaveAttribute('href', '/student/exercises/hello');
  await toggle.click();
  await expect(page.locator('.module-lesson-list')).toHaveCount(0);
  await page.getByRole('button', { name: '2. Programowanie obiektowe', exact: true }).click();
  await expect(page.getByText('W tym module nie ma jeszcze dostępnych lekcji.')).toBeVisible();
  await page.getByRole('link', { name: 'Materiały', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Materiały', exact: true })).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: 'test-results/student-materials-mobile.png', fullPage: true });
});

test('empty materials and failed lessons have useful states', async ({ page }) => {
  await page.goto('/tests/fixtures/student-home.html?mode=empty');
  await expect(page.getByText('Nie masz jeszcze materiałów')).toBeVisible();
  await page.goto('/tests/fixtures/student-home.html?mode=error');
  await page.getByRole('button', { name: '1. Podstawy Pythona' }).click();
  await expect(page.getByRole('alert')).toBeVisible();
  await page.getByRole('button', { name: 'Spróbuj ponownie' }).click();
  await expect(page.getByRole('heading', { name: /Pierwsze kroki w Pythonie/ })).toBeVisible();
});
