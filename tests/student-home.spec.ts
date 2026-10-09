import { expect, test } from '@playwright/test';

test('returning home keeps the student signed in and offers their classes', async ({ page }) => {
  await page.goto('/tests/fixtures/student-home.html');
  await page.getByRole('link', { name: 'Strona startowa', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Cześć, Ania!' })).toBeVisible();
  await expect(page.getByRole('link', { name: /Zaloguj/ })).toHaveCount(0);
  await expect(page.getByText('Przygotuj kod klasy', { exact: false })).toHaveCount(0);
  await page.getByRole('link', { name: 'Przejdź do moich klas →' }).click();
  await expect(page.getByRole('heading', { name: 'Twoje klasy' })).toBeVisible();
});

test('student chooses a class before seeing its assigned lessons', async ({ page }) => {
  await page.goto('/tests/fixtures/student-home.html');
  await expect(page.getByRole('heading', { name: 'Twoje klasy' })).toBeVisible();
  await expect(page.locator('.student-lessons')).toHaveCount(0);
  await page.screenshot({ path: 'test-results/student-home-desktop.png', fullPage: true });
  await page.getByRole('link', { name: /Python · grupa/ }).click();
  await expect(page.getByRole('heading', { name: 'Pierwsze kroki w Pythonie' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Inna klasa' })).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'Powitanie' })).toHaveAttribute('href', '/student/exercises/hello');
  await page.getByRole('link', { name: 'Wszystkie klasy' }).click();
  await expect(page.locator('.student-lessons')).toHaveCount(0);
  await page.getByRole('link', { name: /Koło programistyczne/ }).click();
  await expect(page.locator('.student-empty')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Powitanie' })).toHaveCount(0);
  await page.getByRole('link', { name: 'Wszystkie klasy' }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: 'test-results/student-home-mobile.png', fullPage: true });
});

test('empty membership and lesson errors have useful states', async ({ page }) => {
  await page.goto('/tests/fixtures/student-home.html?mode=empty');
  await expect(page.getByText('Poproś nauczyciela o dodanie Cię do klasy.')).toBeVisible();
  await page.goto('/tests/fixtures/student-home.html?mode=error');
  await page.getByRole('link', { name: /Python · grupa/ }).click();
  await expect(page.getByRole('alert')).toBeVisible();
  await page.getByRole('button', { name: /Ponów|Spróbuj/ }).click();
  await expect(page.getByRole('heading', { name: 'Pierwsze kroki w Pythonie' })).toBeVisible();
});
