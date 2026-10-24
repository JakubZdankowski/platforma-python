import { expect, test } from '@playwright/test';

for (const width of [1366, 390]) {
  test(`changing exercises opens instructions at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    await page.goto('/tests/fixtures/playground.html');
    const instructions = page.getByRole('button', { name: 'Twoje zadanie', exact: true });
    const panel = page.locator('#lesson-side-panel');
    await instructions.click();
    await expect(panel).toBeHidden();
    await page.getByRole('button', { name: 'Następne zadanie', exact: true }).click();
    await expect(instructions).toHaveAttribute('aria-expanded', 'true');
    await expect(panel.locator('.markdown')).toBeVisible();
    await expect(panel.locator('.exercise-number')).toHaveText('Narysuj kwadrat');
    await page.getByRole('button', { name: 'Ćwiczenia w tej lekcji', exact: true }).click();
    await panel.getByRole('button', { name: 'Pierwszy program', exact: true }).click();
    await expect(instructions).toHaveAttribute('aria-expanded', 'true');
    await expect(panel.locator('.exercise-number')).toHaveText('Pierwszy program');
    await page.screenshot({ path: `test-results/exercise-actions-${width}.png`, fullPage: true });
  });
}

test('reset icon preserves confirmation and download is absent', async ({ page }) => {
  await page.goto('/tests/fixtures/playground.html');
  const editor = page.getByRole('textbox', { name: 'Edytor kodu Python' });
  await editor.fill('print("Moje zmiany")');
  const reset = page.locator('.reset-code-button');
  await expect(reset).toHaveAccessibleName('Przywróć kod początkowy');
  await expect(reset.locator('svg')).toBeVisible();
  await expect(reset).toHaveText('');
  await expect(page.getByRole('button', { name: /Pobierz.*kod/ })).toHaveCount(0);
  page.once('dialog', async dialog => { await dialog.dismiss(); });
  await reset.click();
  await expect(editor).toHaveText('print("Moje zmiany")');
  page.once('dialog', async dialog => { await dialog.accept(); });
  await reset.click();
  await expect(editor).toHaveText('print("Hello!")');
});
