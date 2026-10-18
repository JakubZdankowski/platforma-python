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
    await expect(page.getByRole('heading', { name: 'Nowa grupa' })).toHaveCount(role === 'admin' ? 1 : 0);
    await page.screenshot({path:`test-results/${role}-groups-desktop.png`,fullPage:true});
    await page.setViewportSize({ width: 390, height: 844 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  });
}
