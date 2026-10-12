import { expect, test, type Page } from '@playwright/test';

async function setCode(page: Page, code: string) {
  await page.getByRole('textbox', { name: 'Edytor kodu Python' }).fill(code);
}

async function run(page: Page, code: string) {
  await setCode(page, code);
  await page.getByRole('button', { name: 'Uruchom', exact: true }).click();
}

test.beforeEach(async ({ page }) => { await page.goto('/tests/fixtures/playground.html'); });

test('the general hint opens on request and closes when changing exercises', async ({ page }) => {
  const hint = page.locator('details.tip');
  await expect(hint).not.toHaveAttribute('open');
  await hint.locator('summary').click();
  await expect(hint).toHaveAttribute('open', '');
  await expect(hint.locator('p')).toBeVisible();
  await hint.locator('summary').click();
  await expect(hint.locator('p')).toBeHidden();
  await hint.locator('summary').focus();
  await page.keyboard.press('Enter');
  await expect(hint.locator('p')).toBeVisible();
  await page.getByRole('button', { name: 'Następne zadanie' }).click();
  await expect(hint).not.toHaveAttribute('open');
  await expect(hint.locator('p')).toBeHidden();
});

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

test('input accepts sequential answers, empty lines and Unicode without a browser prompt', async ({ page }) => {
  page.on('dialog', () => { throw new Error('Unexpected blocking prompt'); });
  await run(page, 'def ask():\n    return input("Imię: ")\nname = ask()\nprint(repr(name))\nfor i in range(2):\n    print(repr(input()))');
  const answer = page.getByRole('textbox', { name: 'Twoja odpowiedź', exact: true });
  await expect(answer).toBeFocused();
  await expect(page.getByTestId('stdout')).toHaveText('Imię: ');
  await page.screenshot({ path: 'test-results/input-console.png', fullPage: true });
  await answer.fill('  Łucja  ');
  await answer.press('Enter');
  await expect(answer).toBeFocused();
  await answer.press('Enter');
  await expect(answer).toBeFocused();
  await answer.fill('żółw');
  await page.getByRole('button', { name: 'Wyślij', exact: true }).click();
  await expect(page.getByRole('status')).toHaveText('Program zakończony');
  await expect(page.getByTestId('stdout')).toContainText("'  Łucja  '");
  await expect(page.getByTestId('stdout')).toContainText("''");
  await expect(page.getByTestId('stdout')).toContainText("'żółw'");
  await expect(answer).toHaveCount(0);
});

test('input waiting does not consume timeout and Stop permits another run', async ({ page }) => {
  await run(page, 'print(input("Dane: "))');
  const answer = page.getByRole('textbox', { name: 'Twoja odpowiedź', exact: true });
  await expect(answer).toBeVisible();
  await page.waitForTimeout(10_500);
  await expect(answer).toBeVisible();
  await expect(page.getByRole('button', { name: 'Uruchom', exact: true })).toBeDisabled();
  await page.getByRole('button', { name: 'Zatrzymaj', exact: true }).click();
  await expect(answer).toHaveCount(0);
  await run(page, 'print(int(input()) + 1)');
  await answer.fill('41');
  await answer.press('Enter');
  await expect(page.getByRole('status')).toHaveText('Program zakończony');
  await expect(page.getByTestId('stdout')).toHaveText('41\n42\n');
});

test('keyboard run keeps the code in the Polish interface', async ({ page }) => {
  await setCode(page, 'print("skrót")');
  await page.getByRole('textbox').press('Control+Enter');
  await expect(page.getByTestId('stdout')).toHaveText('skrót\n');
  await expect(page.getByRole('combobox', { name: 'Język interfejsu' })).toHaveCount(0);
  await expect(page.locator('html')).toHaveAttribute('lang', 'pl');
  await expect(page.getByRole('textbox', { name: 'Edytor kodu Python' })).toHaveText('print("skrót")');
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
  const collapseButton = page.getByRole('button', { name: 'Twoje zadanie', exact: true });
  await collapseButton.focus();
  await collapseButton.press('Enter');
  await expect(page.getByRole('button', { name: 'Twoje zadanie', exact: true })).toHaveAttribute('aria-expanded', 'false');
  await expect(page.getByText('Uruchom program i sprawdź, co pojawi się w konsoli.')).toBeHidden();
  expect((await editor.boundingBox())!.width).toBeGreaterThan(editorBox!.width + 100);
  await expect(page.getByRole('textbox')).toHaveText('print("mój kod")');
  await page.screenshot({ path: 'test-results/playground-collapsed.png', fullPage: true });
  await page.getByRole('button', { name: 'Twoje zadanie', exact: true }).press('Enter');
  await expect(page.getByRole('button', { name: 'Twoje zadanie', exact: true })).toHaveAttribute('aria-expanded', 'true');
  await expect(page.getByText('Uruchom program i sprawdź, co pojawi się w konsoli.')).toBeVisible();
  await page.setViewportSize({ width: 900, height: 900 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(900);
  await page.screenshot({ path: 'test-results/playground-tablet.png', fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  await page.getByRole('button', { name: 'Twoje zadanie', exact: true }).click();
  await expect(page.getByText('Uruchom program i sprawdź, co pojawi się w konsoli.')).toBeHidden();
  await page.getByRole('button', { name: 'Twoje zadanie', exact: true }).click();
  await run(page, 'print("telefon")');
  await expect(page.getByTestId('stdout')).toHaveText('telefon\n');
  await page.screenshot({ path: 'test-results/playground-mobile.png', fullPage: true });
});

test('input conversion errors recover and execution still times out after an answer', async ({ page }) => {
  await run(page, 'int(input("Liczba: "))');
  const answer = page.getByRole('textbox', { name: 'Twoja odpowiedź', exact: true });
  await answer.fill('abc');
  await answer.press('Enter');
  await expect(page.getByTestId('python-error')).toContainText('ValueError');
  await run(page, 'input()\nwhile True: pass');
  await answer.press('Enter');
  await expect(page.getByRole('status')).toContainText('po 10 sekundach', { timeout: 30_000 });
});

test('without JSPI ordinary code works and input explains browser requirements', async ({ page }) => {
  await page.route('**/pyodide/pyodide.mjs', async (route) => {
    const response = await route.fetch();
    await route.fulfill({ response, body: 'delete WebAssembly.Suspending; delete WebAssembly.promising;\n' + await response.text() });
  });
  await run(page, 'print("działa")');
  await expect(page.getByRole('status')).toHaveText('Program zakończony');
  await run(page, 'input()');
  await expect(page.getByTestId('python-error')).toContainText('WebAssembly JSPI');
  await expect(page.getByRole('textbox', { name: 'Twoja odpowiedź', exact: true })).toHaveCount(0);
});
