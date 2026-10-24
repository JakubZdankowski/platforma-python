import { expect, test } from '@playwright/test';

for (const viewport of [{ width: 1366, height: 768 }, { width: 390, height: 844 }]) {
  test(`input form stays fully visible after long output at ${viewport.width}px`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto('/tests/fixtures/playground.html');
    await page.getByRole('textbox', { name: 'Edytor kodu Python' }).fill(
      'for i in range(100):\n    print(i)\nname = input("Podaj imię: ")\nprint(name)',
    );
    await page.getByRole('button', { name: 'Uruchom', exact: true }).click();
    const answer = page.getByRole('textbox', { name: 'Twoja odpowiedź', exact: true });
    await expect(answer).toBeFocused();
    const form = page.locator('.console-input');
    await expect(form).toBeVisible();
    await expect(page.locator('.output-body .console-input')).toHaveCount(0);
    await expect.poll(async () => {
      const box = await form.boundingBox();
      return !!box && box.x >= 0 && box.y >= 0
        && box.x + box.width <= viewport.width && box.y + box.height <= viewport.height;
    }).toBe(true);
    await page.screenshot({ path: `test-results/input-visible-${viewport.width}.png`, fullPage: true });
    await answer.fill('Ania');
    await page.getByRole('button', { name: 'Wyślij', exact: true }).click();
    await expect(page.getByTestId('stdout')).toContainText('Ania');
    await expect(form).toHaveCount(0);
  });
}
