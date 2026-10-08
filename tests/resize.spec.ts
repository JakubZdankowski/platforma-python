import { expect, test, type Page } from '@playwright/test';

const handleName = 'Zmień szerokość edytora i podglądu (strzałki, Enter przywraca)';

async function widths(page: Page) {
  const editor = (await page.getByRole('region', { name: 'Twój kod' }).boundingBox())!;
  const output = (await page.getByRole('region', { name: 'Konsola' }).boundingBox())!;
  return { editor: editor.width, output: output.width };
}

function expectNear(actual: number, expected: number) {
  expect(Math.abs(actual - expected)).toBeLessThanOrEqual(1);
}

async function drag(page: Page, deltaX: number) {
  const box = (await page.getByRole('separator', { name: handleName }).boundingBox())!;
  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + deltaX, y, { steps: 8 });
  await page.mouse.up();
}

test('dragging the handle trades width between the editor and the console', async ({ page }) => {
  await page.goto('/tests/fixtures/playground.html');
  await page.getByRole('textbox', { name: 'Edytor kodu Python' }).fill('print("szerzej")');
  const before = await widths(page);

  await drag(page, -200);
  const wider = await widths(page);
  expect(wider.output - before.output).toBeGreaterThan(190);
  expect(wider.output - before.output).toBeLessThan(210);
  expect(Math.abs(wider.editor + wider.output - (before.editor + before.output))).toBeLessThanOrEqual(1);

  await drag(page, 2000);
  expectNear((await widths(page)).output, 260);
  await drag(page, -2000);
  expect((await widths(page)).editor).toBeGreaterThanOrEqual(319);

  await page.getByRole('separator', { name: handleName }).dblclick();
  expectNear((await widths(page)).output, before.output);
  await expect(page.getByRole('textbox')).toHaveText('print("szerzej")');
  await page.screenshot({ path: 'test-results/resize-console.png', fullPage: true });
});

test('the handle works with the keyboard', async ({ page }) => {
  await page.goto('/tests/fixtures/playground.html');
  const before = await widths(page);
  const handle = page.getByRole('separator', { name: handleName });
  await handle.focus();
  await handle.press('ArrowLeft');
  await handle.press('ArrowLeft');
  expectNear((await widths(page)).output, before.output + 48);
  await handle.press('ArrowRight');
  expectNear((await widths(page)).output, before.output + 24);
  await expect(handle).toHaveAttribute('aria-valuenow', /^\d+$/);
  await handle.press('Enter');
  expectNear((await widths(page)).output, before.output);
});

test('a wider output column enlarges the turtle drawing and the width survives switching exercises', async ({ page }) => {
  await page.setViewportSize({ width: 1600, height: 1000 });
  await page.goto('/tests/fixtures/playground.html');
  await page.getByRole('button', { name: 'Następne zadanie' }).click();
  const canvas = page.getByTestId('turtle-canvas');
  const before = (await canvas.boundingBox())!;
  await drag(page, -150);
  await expect.poll(async () => (await canvas.boundingBox())!.width).toBeGreaterThan(before.width + 100);
  const after = (await canvas.boundingBox())!;
  expect(Math.abs(after.width - after.height)).toBeLessThanOrEqual(1);
  const console = (await page.getByRole('region', { name: 'Konsola' }).boundingBox())!;
  expect(console.y + console.height).toBeLessThan(1000);
  expect(console.height).toBeGreaterThanOrEqual(110);

  await page.getByRole('button', { name: 'Uruchom', exact: true }).click();
  await page.getByRole('button', { name: 'Pomiń animację' }).click();
  await expect(canvas).toHaveAttribute('data-segments', '4');
  await page.screenshot({ path: 'test-results/resize-turtle.png', fullPage: true });

  const outputWidth = (await widths(page)).output;
  await page.getByRole('button', { name: 'Poprzednie zadanie' }).click();
  expectNear((await widths(page)).output, outputWidth);
});

test('the handle is hidden when panels are stacked', async ({ page }) => {
  await page.setViewportSize({ width: 900, height: 900 });
  await page.goto('/tests/fixtures/playground.html');
  await expect(page.getByRole('separator', { name: handleName })).toBeHidden();
});
