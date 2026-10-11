import { expect, test } from '@playwright/test';

for (const width of [390, 768, 1280, 1440]) {
  test(`shared UI remains usable at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/ui');
    const preview = page.locator('.ui-lab-preview');
    const module = preview.getByRole('button', { name: '1. Podstawy Pythona', exact: true });
    await module.focus();
    await page.keyboard.press('Enter');
    await expect(module).toHaveAttribute('aria-expanded', 'true');
    await expect(preview.getByText('Pierwsza lekcja', { exact: true })).toBeVisible();
    const primary = preview.getByRole('button', { name: 'Uruchom', exact: true });
    await primary.focus();
    await expect(primary).toHaveCSS('outline-style', 'solid');
    await expect(primary).toHaveCSS('outline-width', '2px');
    const link = preview.getByRole('link', { name: 'Nowa lekcja', exact: true });
    await expect(link).toHaveCSS('text-decoration-line', 'none');
    await expect(link).toHaveCSS('color', await primary.evaluate(el => getComputedStyle(el).color));
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: `test-results/ui-audit/workshop-${width}.png`, fullPage: true });
  });
}

test('default text and control colors meet AA contrast', async ({ page }) => {
  await page.goto('/ui');
  const ratios = await page.evaluate(() => {
    const css = getComputedStyle(document.documentElement);
    const luminance = (key: string) => {
      const hex = css.getPropertyValue(key).trim().slice(1);
      const rgb = [0, 2, 4].map(i => Number.parseInt(hex.slice(i, i + 2), 16) / 255)
        .map(c => c <= .04045 ? c / 12.92 : ((c + .055) / 1.055) ** 2.4);
      return rgb[0]! * .2126 + rgb[1]! * .7152 + rgb[2]! * .0722;
    };
    const pairs = ['--text', '--text-muted', '--text-subtle', '--accent', '--success']
      .flatMap(text => ['--background', '--surface', '--surface-raised'].map(bg => [text, bg, 4.5] as const));
    pairs.push(['--on-accent', '--accent', 4.5], ['--danger', '--danger-surface', 4.5], ['--warning', '--warning-surface', 4.5]);
    return [...pairs, ['--border-control', '--surface-raised', 3] as const].map(([fg, bg, minimum]) => {
      const a = luminance(fg), b = luminance(bg);
      return { fg, bg, minimum, ratio: (Math.max(a, b) + .05) / (Math.min(a, b) + .05) };
    });
  });
  for (const { fg, bg, minimum, ratio } of ratios) expect(ratio, `${fg} on ${bg}`).toBeGreaterThanOrEqual(minimum);
});

test('the workshop uses the real editor and console with a readable shared code scale', async ({ page }) => {
  await page.goto('/ui');
  const editor = page.getByRole('textbox', { name: 'Przykładowy edytor kodu Python' });
  await editor.fill('print("Własny kod")');
  await expect(editor).toContainText('Własny kod');
  await expect(page.locator('.ui-lab-editor .cm-editor')).toHaveCSS('font-size', '16px');
  await expect(page.locator('.console-text')).toHaveCSS('font-size', '16px');
  await page.getByLabel('Stan konsoli').selectOption('error');
  await expect(page.getByTestId('python-error')).toContainText('ZeroDivisionError');
  await page.getByLabel('Stan konsoli').selectOption('empty');
  await expect(page.locator('.output-placeholder')).toBeVisible();
});

test('touch controls and 200 percent zoom preserve access to actions', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true });
  try {
    const page = await context.newPage();
    await page.goto('/ui');
    const preview = page.locator('.ui-lab-preview');
    for (const control of await preview.locator('.button').all()) {
      if (await control.isVisible()) expect((await control.boundingBox())!.height).toBeGreaterThanOrEqual(44);
    }
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.evaluate(() => { document.documentElement.style.zoom = '2'; });
    await preview.getByRole('button', { name: '1. Podstawy Pythona', exact: true }).click();
    await expect(preview.getByText('Pierwsza lekcja', { exact: true })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: 'test-results/ui-audit/workshop-zoom-200.png', fullPage: true });
  } finally { await context.close(); }
});
