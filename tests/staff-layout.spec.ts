import { expect, test } from '@playwright/test';
for (const role of ['admin', 'teacher']) {
  test(`${role} uses the classroom layout on group pages`, async ({ page }) => {
    await page.goto(`/tests/fixtures/staff-layout.html?role=${role}`);
    await expect(page.getByText('Python 101')).toBeVisible();
    await expect(page.locator('.classroom-dashboard')).toBeVisible();
    const sidebar = page.locator('.dashboard-sidebar');
    const content = page.locator('.dashboard-content');
    const navBox = await sidebar.boundingBox();
    const contentBox = await content.boundingBox();
    expect(navBox!.y + navBox!.height).toBeLessThanOrEqual(contentBox!.y + 1);
    await expect(page.getByRole('heading', { name: 'Twoje grupy' })).toBeVisible();
    await expect(sidebar.getByRole('link', { name: 'Grupy', exact: true })).toHaveCount(role === 'admin' ? 1 : 0);
    await expect(page.getByRole('heading', { name: 'Nowa grupa' })).toHaveCount(role === 'admin' ? 1 : 0);
    await page.screenshot({path:`test-results/${role}-groups-desktop.png`,fullPage:true});
    await page.setViewportSize({ width: 390, height: 844 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  });
}

for (const role of ['admin', 'teacher']) {
  test(`${role} can inspect a student and open their work from a group`, async ({ page }) => {
    await page.goto(`/tests/fixtures/staff-layout.html?role=${role}&mode=detail`);
    await expect(page.getByRole('heading', { name: 'Python 101' })).toBeVisible();
    const preview = page.getByRole('link', { name: 'Podgląd pracy uczniów', exact: true });
    await expect(preview).toHaveClass(/button-primary/);
    await expect(page.locator('main > a')).toHaveCount(0);
    if (role === 'admin') {
    await expect(page.getByRole('link', { name: 'Podgląd pracy ucznia: Anna Testowa' })).toHaveAttribute('href', `/${role}/classes/python/live?student=ania`);
    await page.getByRole('button', { name: 'Informacje o uczniu: Anna Testowa' }).click();
    const dialog = page.getByRole('dialog', { name: 'Informacje o uczniu' });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText('Anna Testowa', {exact: true})).toBeVisible();
    await expect(dialog.getByText('ania', {exact: true})).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(dialog).not.toBeVisible();
    } else {
      await expect(page.getByRole('button', { name: 'Informacje o uczniu: Anna Testowa' })).toHaveCount(0);
      await expect(page.getByRole('searchbox')).toHaveCount(0);
      await expect(page.locator('.student-back')).toHaveCount(0);
      await expect(page.getByRole('link', { name: 'Podgląd pracy ucznia: Anna Testowa' })).toHaveCount(0);
      const modules = await page.locator('.group-modules-panel').boundingBox();
      const roster = await page.locator('.group-roster').boundingBox();
      expect(modules!.width).toBeGreaterThan(roster!.width);
      const reset = page.getByRole('button', { name: 'Zresetuj hasło: Anna Testowa', exact: true });
      page.once('dialog', dialog => dialog.dismiss());
      await reset.click();
      await expect(page.getByTestId('issued-student-password')).toHaveCount(0);
      page.once('dialog', dialog => dialog.accept());
      await reset.click();
      await expect(page.getByTestId('issued-student-password')).toHaveText('abcd2345');
      await page.getByRole('button', { name: 'Ukryj hasło' }).click();
      await expect(page.getByTestId('issued-student-password')).toHaveCount(0);
    }
    await page.screenshot({path:`test-results/${role}-group-detail.png`,fullPage:true});
  });
}

test('teacher can retry a password reset after a failure', async ({ page }) => {
  await page.goto('/tests/fixtures/staff-layout.html?role=teacher&mode=detail&scenario=password-error');
  const reset = page.getByRole('button', { name: 'Zresetuj hasło: Anna Testowa', exact: true });
  page.once('dialog', dialog => dialog.accept());
  await reset.click();
  await expect(page.getByRole('alert')).toHaveText('Nie udało się zmienić hasła. Spróbuj ponownie.');
  await expect(reset).toBeEnabled();
  await expect(page.getByTestId('issued-student-password')).toHaveCount(0);
});
