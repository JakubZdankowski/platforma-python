import { expect, test, type Page } from '@playwright/test';
import { SEED, adminClient } from '../db/localSupabase';

const run = Date.now().toString(36);

async function studentSignIn(page: Page, username: string, password: string, _joinCode = SEED.joinCode) {
  await page.goto('/join');
  await page.getByLabel('Nazwa użytkownika').fill(username);
  await page.getByLabel('Hasło').fill(password);
  await page.getByRole('button', { name: 'Zaloguj się' }).click();
}

async function adminSignIn(page: Page) {
  await page.goto('/login');
  await page.getByLabel('Adres e-mail').fill(SEED.admin.email);
  await page.getByLabel('Hasło').fill(SEED.admin.password);
  await page.getByRole('button', { name: 'Zaloguj się' }).click();
  await expect(page).toHaveURL(/\/admin$/);
}

test.afterAll(async () => {
  const admin = adminClient();
  const { data } = await admin.from('profiles').select('id').like('username', `%-${run}`);
  for (const row of data ?? []) await admin.auth.admin.deleteUser(row.id);
});

test('the home page links to student sign-in', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('link', { name: 'Zaloguj się', exact: true }).click();
  await expect(page).toHaveURL(/\/join$/);
  await expect(page.getByRole('heading', { name: 'Zaloguj się' })).toBeVisible();
});

test('a student signs in with class code, username and password, then signs out', async ({ page }) => {
  await studentSignIn(page, 'ania', SEED.password('ania'), 'python25');
  await expect(page).toHaveURL(/\/student$/);
  await expect(page.getByRole('heading', { name: 'Cześć, Ania!' })).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Panel ucznia' })).toBeVisible();
  await expect(page.getByText('@students.invalid')).toHaveCount(0);
  await page.screenshot({ path: 'test-results/student-home.png', fullPage: true });

  await page.goto('/');
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole('heading', { name: 'Cześć, Ania!' })).toBeVisible();
  await expect(page.getByRole('link', { name: /Zaloguj/ })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Wyloguj się' })).toBeVisible();
  await page.reload();
  await page.getByRole('link', { name: 'Przejdź do pulpitu →' }).click();
  await expect(page).toHaveURL(/\/student$/);

  await page.getByRole('button', { name: 'Wyloguj się' }).click();
  await expect(page).toHaveURL(/\/join$/);
  await page.goto('/student');
  await expect(page).toHaveURL(/\/join$/);
});

test('wrong credentials show one friendly message', async ({ page }) => {
  await studentSignIn(page, 'kuba', 'wrong-password');
  await expect(page.getByRole('alert')).toHaveText('Nie udało się zalogować. Sprawdź nazwę użytkownika i hasło.');
  await expect(page.getByLabel('Hasło')).toHaveValue('');
  await expect(page).toHaveURL(/\/join$/);
});

test('three students in separate browsers each see only themselves', async ({ browser }) => {
  for (const username of SEED.students) {
    const context = await browser.newContext();
    const page = await context.newPage();
    await studentSignIn(page, username, SEED.password(username));
    const name = username.charAt(0).toUpperCase() + username.slice(1);
    await expect(page.getByRole('heading', { name: `Cześć, ${name}!` })).toBeVisible();
    await expect(page.locator('.dashboard-account')).toContainText(name);
    await context.close();
  }
});

test('route guards send users to the right screens', async ({ page }) => {
  await page.goto('/teacher');
  await expect(page).toHaveURL(/\/login$/);
  await studentSignIn(page, 'ola', SEED.password('ola'));
  await expect(page).toHaveURL(/\/student$/);
  await page.goto('/teacher');
  await expect(page).toHaveURL(/\/student$/);
});

test('admin creates a student, assigns a group and resets the password', async ({ page, browser }) => {
  await adminSignIn(page);
  await page.getByRole('link', { name: 'Konta', exact: true }).click();
  await page.getByLabel('Imię i nazwisko').fill(`Łucja ${run}`);
  await page.getByLabel('Nazwa użytkownika (3–30 znaków)').fill(`lucja-${run}`);
  await page.getByRole('button', { name: 'Utwórz konto' }).click();
  const issued = page.getByTestId('issued-password');
  await expect(issued).toBeVisible();
  const password = (await issued.textContent())!;
  expect(password).toMatch(/^[a-hjkmnp-z2-9]{8}$/);
  const studentContext = await browser.newContext();
  try {
    const studentPage = await studentContext.newPage();
    await studentSignIn(studentPage, `lucja-${run}`, password);
    await expect(studentPage.getByRole('heading', { name: `Cześć, Łucja ${run}!` })).toBeVisible();
    await page.getByRole('link', { name: 'Grupy', exact: true }).click();
    await page.getByRole('link', { name: SEED.className, exact: true }).click();
    const member=page.getByRole('checkbox',{name:`Łucja ${run} (lucja-${run})`,exact:true});
    await member.check(); await expect(member).toBeEnabled(); await expect(member).toBeChecked();
    await member.uncheck(); await expect(member).toBeEnabled(); await expect(member).not.toBeChecked();
    await page.getByRole('link', { name: 'Konta', exact: true }).click();
    const row=page.getByRole('row',{name:new RegExp(`Łucja ${run}`)});
    page.once('dialog',d=>void d.accept());
    await row.getByRole('button',{name:'Nowe hasło'}).click();
    await expect(issued).toBeVisible();
    expect(await issued.textContent()).not.toBe(password);
  } finally { await studentContext.close(); }
});

test('admin creates and renames a group', async ({ page }) => {
  await adminSignIn(page);
  await page.getByRole('link', { name: 'Grupy', exact: true }).click();
  await page.getByLabel('Nazwa grupy').fill(`Klasa ${run}`);
  await page.getByRole('button', { name: 'Utwórz grupę' }).click();
  await page.getByRole('link', { name: `Klasa ${run}`, exact:true }).click();
  await page.getByLabel('Nazwa grupy').fill(`Klasa ${run} B`);
  await page.getByRole('button', { name: 'Zapisz nazwę' }).click();
  await expect(page.getByRole('heading', { name: `Klasa ${run} B` })).toBeVisible();
  await adminClient().from('classes').delete().like('name', `Klasa ${run}%`);
});

test('account screens fit a phone', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/join');
  await expect(page.getByRole('button', { name: 'Zaloguj się' })).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(0);
  await page.screenshot({ path: 'test-results/join-mobile.png', fullPage: true });
});
