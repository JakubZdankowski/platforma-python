import { expect, test, type Page } from '@playwright/test';

async function setCode(page: Page, code: string) {
  await page.getByRole('textbox', { name: 'Edytor kodu Python' }).fill(code);
}

async function run(page: Page, code: string) {
  await setCode(page, code);
  await page.getByRole('button', { name: 'Uruchom', exact: true }).click();
}

test.beforeEach(async ({ page }) => { await page.goto('/'); });

test('sample exercise works and all runtime assets stay on the application origin', async ({ page }) => {
  const unexpectedRequests: string[] = [];
  page.on('request', (request) => {
    if (!request.url().startsWith('http://127.0.0.1:4173/')) unexpectedRequests.push(request.url());
  });
  await expect(page.getByRole('heading', { name: 'Pierwszy program' })).toBeVisible();
  await page.getByRole('button', { name: 'Uruchom', exact: true }).click();
  await expect(page.getByTestId('stdout')).toHaveText('Hello!\n');
  await expect(page.getByRole('status')).toHaveText('Program zakończony');
  expect(unexpectedRequests).toEqual([]);
  await page.screenshot({ path: 'test-results/playground-desktop.png', fullPage: true });
});

test('acceptance program, Unicode, partial output and stderr are preserved exactly', async ({ page }) => {
  await run(page, 'name = "Kuba"\nprint("Hello", name)\nprint("ą ć ę ł ń ó ś ź ż", end="")\nimport sys\nsys.stderr.write("uwaga\\n")');
  await expect(page.getByTestId('stdout')).toHaveText('Hello Kuba\ną ć ę ł ń ó ś ź ż');
  await expect(page.getByTestId('stderr')).toHaveText('uwaga\n');
  await expect(page.getByRole('status')).toHaveText('Program zakończony');
  expect(await page.getByTestId('stdout').textContent()).toBe('Hello Kuba\ną ć ę ł ń ó ś ź ż');
  expect(await page.getByTestId('stderr').textContent()).toBe('uwaga\n');
});

test('shows syntax and runtime errors, then recovers', async ({ page }) => {
  await run(page, 'if True\n    print("hello")');
  await expect(page.getByTestId('python-error')).toContainText('SyntaxError');
  await expect(page.getByTestId('python-error')).toContainText('main.py');
  await run(page, 'print("przed błędem")\n1 / 0');
  await expect(page.getByTestId('python-error')).toContainText('ZeroDivisionError');
  await expect(page.getByTestId('stdout')).toHaveText('przed błędem\n');
  await run(page, 'print("działa")');
  await expect(page.getByTestId('stdout')).toHaveText('działa\n');
  await expect(page.getByTestId('python-error')).toHaveCount(0);
});

test('each execution uses a fresh namespace', async ({ page }) => {
  await run(page, 'secret = 123\nprint(secret)');
  await expect(page.getByRole('status')).toHaveText('Program zakończony');
  await run(page, 'print(secret)');
  await expect(page.getByTestId('python-error')).toContainText('NameError');
});

test('Stop interrupts an infinite loop, keeps edits, and restarts the worker', async ({ page }) => {
  await run(page, 'print("start", flush=True)\nwhile True:\n    pass');
  await expect(page.getByTestId('stdout')).toHaveText('start\n');
  // Editing during the loop proves that the UI thread remains responsive.
  await setCode(page, 'print("po zatrzymaniu")');
  await page.getByRole('button', { name: 'Zatrzymaj' }).click();
  await expect(page.getByRole('status')).toContainText('Program zatrzymany.');
  await expect(page.getByRole('textbox')).toHaveText('print("po zatrzymaniu")');
  await page.getByRole('button', { name: 'Uruchom', exact: true }).click();
  await expect(page.getByTestId('stdout')).toHaveText('po zatrzymaniu\n');
});

test('execution timeout terminates an infinite loop and permits the next run', async ({ page }) => {
  await run(page, 'while True:\n    pass');
  await expect(page.getByRole('status')).toContainText('po 10 sekundach', { timeout: 30_000 });
  await run(page, 'print("po limicie")');
  await expect(page.getByTestId('stdout')).toHaveText('po limicie\n');
});

test('output flood is bounded and Stop remains available', async ({ page }) => {
  await run(page, 'while True:\n    print("x" * 1000)');
  await expect(page.getByText('Wynik jest bardzo długi.', { exact: false })).toBeVisible();
  expect((await page.getByTestId('stdout').textContent())?.length).toBeLessThanOrEqual(50_000);
  await page.getByRole('button', { name: 'Zatrzymaj' }).click();
  await expect(page.getByRole('status')).toContainText('Program zatrzymany.');
});

test('failed runtime loading offers retry and keeps source', async ({ page }) => {
  await page.route('**/pyodide/pyodide.mjs', (route) => route.abort());
  await run(page, 'print("ponownie")');
  await expect(page.getByRole('status')).toContainText('Nie udało się uruchomić Pythona');
  await expect(page.getByRole('textbox')).toHaveText('print("ponownie")');
  await page.unroute('**/pyodide/pyodide.mjs');
  await page.getByRole('button', { name: 'Spróbuj ponownie' }).click();
  await expect(page.getByTestId('stdout')).toHaveText('ponownie\n');
});

test('Stop cancels initialization and a later run succeeds', async ({ page }) => {
  let release: (() => void) | undefined;
  const gate = new Promise<void>((resolve) => { release = resolve; });
  await page.route('**/pyodide/pyodide.mjs', async (route) => { await gate; await route.continue().catch(() => {}); });
  await run(page, 'print("gotowe")');
  await expect(page.getByRole('status')).toHaveText('Uruchamianie Pythona…');
  await page.getByRole('button', { name: 'Zatrzymaj' }).click();
  await expect(page.getByRole('status')).toContainText('Program zatrzymany.');
  release?.();
  await page.unroute('**/pyodide/pyodide.mjs');
  await page.getByRole('button', { name: 'Uruchom', exact: true }).click();
  await expect(page.getByTestId('stdout')).toHaveText('gotowe\n');
});

test('input has a readable unsupported message without a browser prompt', async ({ page }) => {
  page.on('dialog', () => { throw new Error('Unexpected blocking prompt'); });
  await run(page, 'name = input("Imię: ")');
  await expect(page.getByTestId('python-error')).toContainText('input() nie jest jeszcze dostępne');
});

test('keyboard run and language switching keep the code', async ({ page }) => {
  await setCode(page, 'print("skrót")');
  await page.getByRole('textbox').press('Control+Enter');
  await expect(page.getByTestId('stdout')).toHaveText('skrót\n');
  await page.getByRole('combobox').selectOption('en');
  await expect(page.getByRole('button', { name: 'Run', exact: true })).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page.getByRole('textbox', { name: 'Python code editor' })).toHaveText('print("skrót")');
});

test('layout fits a classroom laptop and reflows on a small screen', async ({ page }) => {
  const instructions = page.getByRole('complementary', { name: 'Twoje zadanie' });
  const editor = page.getByRole('region', { name: 'Twój kod' });
  const instructionsBox = await instructions.boundingBox();
  const editorBox = await editor.boundingBox();
  const consoleBox = await page.getByRole('region', { name: 'Konsola' }).boundingBox();
  expect(instructionsBox!.x + instructionsBox!.width).toBeLessThan(editorBox!.x);
  expect(editorBox!.x + editorBox!.width).toBeLessThan(consoleBox!.x);
  expect(editorBox!.y).toBe(consoleBox!.y);
  expect(consoleBox!.y + consoleBox!.height).toBeLessThan(768);
  await setCode(page, 'print("mój kod")');
  const collapseButton = page.getByRole('button', { name: 'Zwiń treść zadania' });
  await collapseButton.focus();
  await collapseButton.press('Enter');
  await expect(page.getByRole('button', { name: 'Rozwiń treść zadania' })).toHaveAttribute('aria-expanded', 'false');
  await expect(page.getByText('Uruchom program i sprawdź, co pojawi się w konsoli.')).toBeHidden();
  expect((await editor.boundingBox())!.width).toBeGreaterThan(editorBox!.width + 100);
  await expect(page.getByRole('textbox')).toHaveText('print("mój kod")');
  await page.screenshot({ path: 'test-results/playground-collapsed.png', fullPage: true });
  await page.getByRole('button', { name: 'Rozwiń treść zadania' }).press('Enter');
  await expect(page.getByRole('button', { name: 'Zwiń treść zadania' })).toHaveAttribute('aria-expanded', 'true');
  await expect(page.getByText('Uruchom program i sprawdź, co pojawi się w konsoli.')).toBeVisible();
  await page.setViewportSize({ width: 900, height: 900 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(900);
  await page.screenshot({ path: 'test-results/playground-tablet.png', fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  await page.getByRole('button', { name: 'Zwiń treść zadania' }).click();
  await expect(page.getByText('Uruchom program i sprawdź, co pojawi się w konsoli.')).toBeHidden();
  await page.getByRole('button', { name: 'Rozwiń treść zadania' }).click();
  await run(page, 'print("telefon")');
  await expect(page.getByTestId('stdout')).toHaveText('telefon\n');
  await page.screenshot({ path: 'test-results/playground-mobile.png', fullPage: true });
});
