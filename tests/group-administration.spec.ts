import { expect, test } from '@playwright/test';

test('admin can find members, add a pupil and cancel or confirm removal', async ({ page }) => {
  await page.goto('/tests/fixtures/staff-layout.html?mode=detail&scenario=roster');
  const students = page.locator('.group-roster').filter({ has: page.getByRole('heading', { name: /^Uczniowie/ }) });
  await expect(students.getByRole('checkbox').first()).toHaveAccessibleName(/Anna Testowa/);
  await students.getByRole('searchbox').fill('bartek');
  await expect(students.getByRole('checkbox')).toHaveCount(1);
  await students.getByRole('checkbox', { name: /Adam Nowy/ }).check();
  await expect(page.getByText('Dodano do grupy: Adam Nowy.', { exact: true })).toBeVisible();
  await students.getByRole('searchbox').fill('');
  await students.getByRole('combobox').selectOption('assigned');
  await expect(students.getByRole('checkbox')).toHaveCount(2);
  page.once('dialog', dialog => dialog.dismiss());
  await students.getByRole('checkbox', { name: /Anna Testowa/ }).click();
  await expect(students.getByRole('checkbox', { name: /Anna Testowa/ })).toBeChecked();
  page.once('dialog', async dialog => {
    expect(dialog.message()).toContain('zapisane prace pozostaną zachowane');
    await dialog.accept();
  });
  await students.getByRole('checkbox', { name: /Anna Testowa/ }).click();
  await expect(page.getByText('Usunięto z grupy: Anna Testowa.', { exact: true })).toBeVisible();
  await expect(students.getByRole('checkbox', { name: /Anna Testowa/ })).toHaveCount(0);
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: 'test-results/group-administration-mobile.png', fullPage: true });
});

test('a failed removal restores membership and explains recovery', async ({ page }) => {
  await page.goto('/tests/fixtures/staff-layout.html?mode=detail&scenario=save-error');
  const member = page.getByRole('checkbox', { name: /Anna Testowa/ });
  page.once('dialog', dialog => dialog.accept());
  await member.click();
  await expect(member).toBeChecked();
  await expect(page.getByText(/Nie zapisano przypisania: Anna Testowa/)).toBeVisible();
});

test('metadata save and teacher assignment give distinct confirmations', async ({ page }) => {
  await page.goto('/tests/fixtures/staff-layout.html?mode=detail&scenario=roster');
  await page.getByRole('textbox', { name: 'Nazwa grupy' }).fill('Nowa nazwa');
  await page.getByRole('button', { name: 'Zapisz grupę' }).click();
  await expect(page.getByRole('heading', { name: 'Nowa nazwa' })).toBeVisible();
  await expect(page.getByText('Zapisano nazwę i termin grupy.', { exact: true })).toBeVisible();
  await page.getByRole('checkbox', { name: /Jan Nauczyciel/ }).check();
  await expect(page.getByText('Dodano do grupy: Jan Nauczyciel.', { exact: true })).toBeVisible();
  page.once('dialog', dialog => dialog.dismiss());
  await page.getByRole('checkbox', { name: /Jan Nauczyciel/ }).click();
  await expect(page.getByRole('checkbox', { name: /Jan Nauczyciel/ })).toBeChecked();
  await page.screenshot({ path: 'test-results/group-administration-desktop.png', fullPage: true });
  page.once('dialog', async dialog => {
    expect(dialog.message()).toContain('Utraci dostęp do podglądu tej grupy');
    await dialog.accept();
  });
  await page.getByRole('checkbox', { name: /Jan Nauczyciel/ }).click();
  await expect(page.getByText('Usunięto z grupy: Jan Nauczyciel.', { exact: true })).toBeVisible();
  await expect(page.getByRole('checkbox', { name: /Jan Nauczyciel/ })).not.toBeChecked();
});
