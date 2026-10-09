import { readFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';
import { sessionFixture } from '../db/sessionFixture';

test('a second browser logs the first out and preserves its unsaved code for download', async ({ page, context, browser }) => {
  const f = await sessionFixture();
  const other = await browser.newContext();
  try {
    const login = async (target: typeof page) => {
      await target.goto('/join');
      await target.getByLabel('Nazwa użytkownika').fill(f.username);
      await target.getByLabel('Hasło').fill(f.password);
      await target.getByRole('button', { name: 'Zaloguj się', exact: true }).click();
      await expect(target).toHaveURL(/\/student$/);
      await target.goto(`/student/exercises/${f.exerciseId}`);
      await expect(target.getByRole('textbox', { name: 'Edytor kodu Python' })).toHaveText('print("start")');
    };
    await login(page);
    await context.setOffline(true);
    await page.getByRole('textbox', { name: 'Edytor kodu Python' }).fill('print("Niezapisany kod pierwszej sesji")');
    const second = await other.newPage();
    await login(second);
    await second.getByRole('textbox', { name: 'Edytor kodu Python' }).fill('print("Kod nowej sesji")');
    await expect(second.locator('.save-status')).toHaveText('Zapisano');
    await context.setOffline(false);
    await expect(page).toHaveURL(/\/join$/);
    await expect(page.getByRole('alert')).toContainText('Sesja zakończona');
    const pending = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Pobierz zachowany kod .py' }).click();
    const download = await pending;
    expect(await readFile((await download.path())!, 'utf8')).toBe('print("Niezapisany kod pierwszej sesji")');
    expect((await f.admin.from('student_work').select('code').eq('student_id', f.studentId).single()).data?.code).toBe('print("Kod nowej sesji")');
    await expect(second.getByRole('textbox', { name: 'Edytor kodu Python' })).toHaveAttribute('aria-readonly', 'false');
    // Dismissing the warning keeps the recovered code and login screen intact.
    const warning = page.waitForEvent('dialog');
    // Reload waits for navigation that is deliberately cancelled below.
    const reload = page.reload({ timeout: 1500 }).catch(() => null);
    const dialog = await warning;
    expect(dialog.type()).toBe('beforeunload');
    await dialog.dismiss();
    await reload;
    await expect(page.getByRole('button', { name: 'Pobierz zachowany kod .py' })).toBeVisible();
  } finally {
    await context.setOffline(false);
    await other.close();
    await f.cleanup();
  }
});

test('tabs sharing a session have only one editor and load the latest code after the first closes', async ({ page, context }) => {
  const f = await sessionFixture();
  let second: typeof page | undefined;
  try {
    await page.goto('/join');
    await page.getByLabel('Nazwa użytkownika').fill(f.username);
    await page.getByLabel('Hasło').fill(f.password);
    await page.getByRole('button', { name: 'Zaloguj się', exact: true }).click();
    await expect(page).toHaveURL(/\/student$/);
    await page.goto(`/student/exercises/${f.exerciseId}`);
    const editor = page.getByRole('textbox', { name: 'Edytor kodu Python' });
    await expect(editor).toHaveText('print("start")');
    await editor.fill('print("Najnowsza wersja")');
    await expect(page.locator('.save-status')).toHaveText('Zapisano');
    second = await context.newPage();
    await second.goto(`/student/exercises/${f.exerciseId}`);
    await expect(second.getByRole('alert')).toContainText('otwarte w innej karcie');
    await expect(second.getByRole('textbox', { name: 'Edytor kodu Python' })).toHaveCount(0);
    await expect(editor).toHaveAttribute('aria-readonly', 'false');
    await page.close();
    await expect(second.getByRole('textbox', { name: 'Edytor kodu Python' })).toHaveText('print("Najnowsza wersja")');
    await second.getByRole('textbox', { name: 'Edytor kodu Python' }).fill('print("Druga karta")');
    await expect(second.locator('.save-status')).toHaveText('Zapisano');
  } finally {
    await second?.close();
    await f.cleanup();
  }
});
