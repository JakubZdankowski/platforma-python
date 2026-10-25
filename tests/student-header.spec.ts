import { expect, test } from '@playwright/test';

test('student shares the branded header and can sign out on desktop and mobile', async ({ page }) => {
  for (const width of [1366, 390]) {
    await page.setViewportSize({ width, height: 844 });
    await page.goto('/tests/fixtures/student-home.html?mode=header');
    const header = page.locator('.site-header');
    await expect(header.getByRole('img', { name: 'Sky Blue' })).toBeVisible();
    await expect(header.getByText('Ania', { exact: true })).toBeVisible();
    await expect(header.locator('.header-account-summary')).toHaveText('Ania (uczeń)');
    await expect(page.getByText('Wybierz moduł i wróć do programowania.')).toHaveCount(0);
    await expect(page.locator('.dashboard-sidebar')).toHaveCount(0);
    const help = header.getByRole('link', { name: 'Pomoc', exact: true });
    await expect(help).toBeVisible();
    await expect(help).toHaveText('');
    const signOut = header.getByRole('button', { name: 'Wyloguj się', exact: true });
    await expect(signOut).toBeVisible();
    expect(await header.evaluate(element => getComputedStyle(element).backgroundColor)).toBe('rgb(13, 44, 78)');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: `test-results/student-header-${width}.png`, fullPage: true });
    await help.click();
    await expect(page.getByRole('heading', { name: 'Pomoc', exact: true })).toBeVisible();
    await expect(header.locator('.brand')).toHaveAttribute('href', '/student');
    await header.locator('.brand').click();
    await expect(page.getByRole('heading', { name: 'Cześć, Ania!' })).toBeVisible();
    await signOut.click();
    await expect(page.getByRole('heading', { name: 'Logowanie ucznia' })).toBeVisible();
    await expect(header.locator('.brand')).toHaveAttribute('href', '/');
  }
});

test('teacher login logo leads to the teacher dashboard', async ({ page }) => {
  await page.goto('/login');
  await expect(page.locator('.site-header .brand')).toHaveAttribute('href', '/teacher');
});
