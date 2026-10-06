import { expect, test, type Page } from '@playwright/test';

async function openTurtleExercise(page: Page) {
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Poprzednie zadanie' })).toBeDisabled();
  await page.getByRole('button', { name: 'Następne zadanie' }).click();
  await expect(page.getByRole('heading', { name: 'Narysuj kwadrat', level: 1 })).toBeVisible();
  await expect(page.getByRole('button', { name: '2. Narysuj kwadrat' })).toHaveAttribute('aria-current', 'step');
  await expect(page.getByRole('button', { name: 'Następne zadanie' })).toBeDisabled();
}

async function setSpeed(page: Page, speed: number) {
  await page.getByRole('slider', { name: 'Tempo' }).fill(String(speed));
}

async function run(page: Page, code: string) {
  await page.getByRole('textbox', { name: 'Edytor kodu Python' }).fill(code);
  await page.getByRole('button', { name: 'Uruchom', exact: true }).click();
}

/** Darkest-channel colour around a logical Turtle point (y up, origin in the centre). */
async function pixelAt(page: Page, x: number, y: number) {
  return page.getByTestId('turtle-canvas').evaluate((element, [logicalX, logicalY]) => {
    const canvas = element as HTMLCanvasElement;
    const scale = canvas.width / 400;
    const px = Math.round((logicalX! + 200) * scale);
    const py = Math.round((200 - logicalY!) * scale);
    const data = canvas.getContext('2d')!.getImageData(px - 2, py - 2, 5, 5).data;
    let best = [255, 255, 255];
    for (let i = 0; i < data.length; i += 4) {
      const pixel = [data[i]!, data[i + 1]!, data[i + 2]!];
      if (pixel[0]! + pixel[1]! + pixel[2]! < best[0]! + best[1]! + best[2]!) best = pixel;
    }
    return best;
  }, [x, y]);
}

const isInk = ([r, g, b]: number[]) => r! + g! + b! < 600;
const isPaper = ([r, g, b]: number[]) => r! + g! + b! > 750;

test('acceptance: the starter loop draws a square on the canvas', async ({ page }) => {
  await openTurtleExercise(page);
  await expect(page.getByRole('img', { name: 'Rysunek żółwia' })).toBeVisible();
  await expect(page.getByRole('textbox')).toHaveText('for i in range(4):    forward(100)    left(90)');
  await page.getByRole('button', { name: 'Uruchom', exact: true }).click();
  await expect(page.getByRole('status')).toHaveText('Program zakończony');
  await expect(page.getByTestId('turtle-canvas')).toHaveAttribute('data-segments', '4');
  await page.waitForFunction(() => new Promise((resolve) => requestAnimationFrame(() => resolve(true))));
  for (const [x, y] of [[50, 0], [100, 50], [50, 100], [0, 50]] as const) expect(isInk(await pixelAt(page, x, y))).toBe(true);
  expect(isPaper(await pixelAt(page, 50, 50))).toBe(true);
  expect(isPaper(await pixelAt(page, -50, -50))).toBe(true);
  await page.screenshot({ path: 'test-results/turtle-desktop.png', fullPage: true });
});

test('supports pen, colour, goto, circle and import styles', async ({ page }) => {
  await openTurtleExercise(page);
  await setSpeed(page, 10);
  await run(page, [
    'import turtle',
    'from turtle import penup, pendown',
    'penup()', 'goto(-150, 150)', 'pendown()',
    'color("red")', 'pensize(6)', 'forward(100)',
    'penup()', 'home()', 'pendown()',
    'turtle.color("blue")', 'turtle.circle(50)',
    'hideturtle()',
  ].join('\n'));
  await expect(page.getByRole('status')).toHaveText('Program zakończony');
  await expect(page.getByTestId('turtle-canvas')).toHaveAttribute('data-segments', '2');
  await page.waitForFunction(() => new Promise((resolve) => requestAnimationFrame(() => resolve(true))));
  const [r, g, b] = await pixelAt(page, -100, 150);
  expect(r).toBeGreaterThan(200);
  expect(g! + b!).toBeLessThan(120);
  const top = await pixelAt(page, 0, 100);
  expect(top[2]).toBeGreaterThan(150);
  expect(top[0]).toBeLessThan(100);
  expect(isPaper(await pixelAt(page, -175, 150))).toBe(true);
});

test('clear erases earlier lines and each run starts a fresh drawing', async ({ page }) => {
  await openTurtleExercise(page);
  await setSpeed(page, 10);
  await run(page, 'forward(100)\nclear()\nleft(90)\nforward(50)');
  await expect(page.getByRole('status')).toHaveText('Program zakończony');
  await expect(page.getByTestId('turtle-canvas')).toHaveAttribute('data-segments', '1');
  await run(page, 'print("bez rysowania")');
  await expect(page.getByTestId('stdout')).toHaveText('bez rysowania\n');
  await expect(page.getByTestId('turtle-canvas')).toHaveAttribute('data-segments', '0');
});

test('invalid Turtle arguments show readable Python errors', async ({ page }) => {
  await openTurtleExercise(page);
  await run(page, 'forward(50)\ncolor("nieznany")');
  await expect(page.getByTestId('python-error')).toContainText('bad color string');
  await expect(page.getByTestId('python-error')).toContainText('main.py", line 2');
  await expect(page.getByTestId('turtle-canvas')).toHaveAttribute('data-segments', '1');
  await run(page, 'forward("sto")');
  await expect(page.getByTestId('python-error')).toContainText('must be a number');
});

test('the turtle draws gradually and the console waits for it', async ({ page }) => {
  await openTurtleExercise(page);
  await setSpeed(page, 1);
  await run(page, 'print("start")\nforward(120)\nprint("koniec")');
  await expect(page.getByTestId('stdout')).toHaveText('start\n');
  await expect(page.getByRole('status')).toHaveText('Żółw rysuje…');
  await expect(page.getByRole('button', { name: 'Uruchom', exact: true })).toBeDisabled();
  await expect(page.getByTestId('turtle-canvas')).toHaveAttribute('data-segments', '0');
  await expect(page.getByTestId('stdout')).toHaveText('start\nkoniec\n', { timeout: 10_000 });
  await expect(page.getByTestId('turtle-canvas')).toHaveAttribute('data-segments', '1');
  await expect(page.getByRole('status')).toHaveText('Program zakończony');
  await expect(page.getByRole('button', { name: 'Pomiń animację' })).toBeDisabled();
});

test('Skip animation jumps to the finished drawing and output', async ({ page }) => {
  await openTurtleExercise(page);
  await setSpeed(page, 1);
  await run(page, 'forward(150)\nleft(90)\nforward(150)\nprint("gotowe")');
  await expect(page.getByRole('status')).toHaveText('Żółw rysuje…');
  await page.getByRole('button', { name: 'Pomiń animację' }).click();
  await expect(page.getByTestId('turtle-canvas')).toHaveAttribute('data-segments', '2');
  await expect(page.getByTestId('stdout')).toHaveText('gotowe\n');
  await expect(page.getByRole('status')).toHaveText('Program zakończony');
});

test('Stop ends the drawing and clears the turtle screen', async ({ page }) => {
  await openTurtleExercise(page);
  await setSpeed(page, 1);
  await run(page, 'for i in range(4):\n    forward(100)\n    left(90)\nprint("koniec")');
  await expect(page.getByRole('status')).toHaveText('Żółw rysuje…');
  await page.waitForTimeout(800);
  await page.getByRole('button', { name: 'Zatrzymaj' }).click();
  await expect(page.getByRole('status')).toContainText('Program zatrzymany.');
  await expect(page.getByTestId('turtle-canvas')).toHaveAttribute('data-segments', '0');
  await page.waitForFunction(() => new Promise((resolve) => requestAnimationFrame(() => resolve(true))));
  expect(isPaper(await pixelAt(page, 50, 0))).toBe(true);
  await expect(page.getByTestId('stdout')).toHaveCount(0);
  await setSpeed(page, 10);
  await run(page, 'forward(10)');
  await expect(page.getByTestId('turtle-canvas')).toHaveAttribute('data-segments', '1');
});

test('Stop interrupts an endless Turtle loop', async ({ page }) => {
  await openTurtleExercise(page);
  await run(page, 'while True:\n    forward(10)\n    left(10)');
  await expect(page.getByRole('status')).toHaveText('Żółw rysuje…');
  await page.getByRole('button', { name: 'Zatrzymaj' }).click();
  await expect(page.getByRole('status')).toContainText('Program zatrzymany.');
  await expect(page.getByTestId('turtle-canvas')).toHaveAttribute('data-segments', '0');
  await expect(page.getByRole('button', { name: 'Uruchom', exact: true })).toBeEnabled();
});


test('Turtle stays out of console exercises and switching keeps each exercise code', async ({ page }) => {
  await openTurtleExercise(page);
  await page.getByRole('textbox').fill('forward(20)');
  await page.getByRole('button', { name: 'Poprzednie zadanie' }).click();
  await expect(page.getByRole('button', { name: '1. Pierwszy program' })).toHaveAttribute('aria-current', 'step');
  await expect(page.getByRole('img', { name: 'Rysunek żółwia' })).toHaveCount(0);
  await expect(page.getByRole('textbox')).toHaveText('print("Hello!")');
  await run(page, 'forward(20)');
  await expect(page.getByTestId('python-error')).toContainText('NameError');
  await page.getByRole('button', { name: 'Następne zadanie' }).click();
  await expect(page.getByTestId('python-error')).toHaveCount(0);
  await expect(page.getByRole('textbox')).toHaveText('forward(20)');
});

test('Turtle layout fits laptop, tablet and phone widths', async ({ page }) => {
  await openTurtleExercise(page);
  const canvasBox = await page.getByTestId('turtle-canvas').boundingBox();
  const consoleBox = await page.getByRole('region', { name: 'Konsola' }).boundingBox();
  expect(canvasBox!.width).toBeGreaterThan(200);
  expect(Math.abs(canvasBox!.width - canvasBox!.height)).toBeLessThanOrEqual(1);
  expect(consoleBox!.y).toBeGreaterThan(canvasBox!.y + canvasBox!.height);
  expect(consoleBox!.y + consoleBox!.height).toBeLessThan(768);
  for (const [width, height] of [[900, 900], [390, 844]] as const) {
    await page.setViewportSize({ width, height });
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    const box = await page.getByTestId('turtle-canvas').boundingBox();
    expect(box!.width).toBeGreaterThan(200);
    expect(Math.abs(box!.width - box!.height)).toBeLessThanOrEqual(1);
  }
  await run(page, 'for i in range(4):\n    forward(100)\n    left(90)');
  await expect(page.getByTestId('turtle-canvas')).toHaveAttribute('data-segments', '4');
  await page.screenshot({ path: 'test-results/turtle-mobile.png', fullPage: true });
});
