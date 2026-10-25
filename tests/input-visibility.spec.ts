import { expect, test } from '@playwright/test';

for (const viewport of [{ width: 1366, height: 768 }, { width: 390, height: 844 }]) {
  test(`inline input stays visible after long output at ${viewport.width}px`, async ({ page }) => {
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
    await expect(page.locator('.output-body .console-input')).toHaveCount(1);
    // The native caret starts immediately after the prompt's last character.
    const placement = await answer.evaluate(field => {
      const prompt = field.previousElementSibling!;
      const range = document.createRange();
      range.selectNodeContents(prompt);
      const lines = range.getClientRects();
      const last = lines[lines.length - 1]!;
      const input = field.getBoundingClientRect();
      return { gap: input.x - last.right, lineDifference: Math.abs(input.y - last.y) };
    });
    expect(Math.abs(placement.gap)).toBeLessThan(2);
    expect(placement.lineDifference).toBeLessThan(4);
    await expect.poll(async () => {
      const box = await answer.boundingBox();
      return !!box && box.x >= 0 && box.y >= 0
        && box.x + box.width <= viewport.width && box.y + box.height <= viewport.height;
    }).toBe(true);
    await page.screenshot({ path: `test-results/input-visible-${viewport.width}.png`, fullPage: true });
    await answer.fill('Ania');
    await answer.press('Enter');
    await expect(page.getByTestId('stdout')).toContainText('Podaj imię: Ania\nAnia\n');
    await expect(form).toHaveCount(0);
  });
}
