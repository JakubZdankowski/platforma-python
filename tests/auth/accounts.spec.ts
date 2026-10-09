import { expect, test, type Page } from '@playwright/test';
import { SEED, adminClient } from '../db/localSupabase';

const run = Date.now().toString(36);

async function studentSignIn(page: Page, username: string, password: string, joinCode = SEED.joinCode) {
  await page.goto('/join');
  await page.getByLabel('Kod klasy').fill(joinCode);
  await page.getByLabel('Nazwa użytkownika').fill(username);
  await page.getByLabel('Hasło').fill(password);
  await page.getByRole('button', { name: 'Zaloguj się' }).click();
}

async function teacherSignIn(page: Page) {
  await page.goto('/login');
  await page.getByLabel('Adres e-mail').fill(SEED.teacher.email);
  await page.getByLabel('Hasło').fill(SEED.teacher.password);
  await page.getByRole('button', { name: 'Zaloguj się' }).click();
  await expect(page).toHaveURL(/\/teacher$/);
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
  await expect(page.getByRole('list', { name: 'Twoje klasy' })).toContainText(SEED.className);
  await expect(page.getByText('@students.invalid')).toHaveCount(0);
  await page.screenshot({ path: 'test-results/student-home.png', fullPage: true });

  await page.getByRole('link', { name: 'Strona startowa', exact: true }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole('heading', { name: 'Cześć, Ania!' })).toBeVisible();
  await expect(page.getByRole('link', { name: /Zaloguj/ })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Wyloguj się' })).toBeVisible();
  await page.reload();
  await page.getByRole('link', { name: 'Przejdź do moich klas →' }).click();
  await expect(page).toHaveURL(/\/student$/);

  await page.getByRole('button', { name: 'Wyloguj się' }).click();
  await expect(page).toHaveURL(/\/join$/);
  await page.goto('/student');
  await expect(page).toHaveURL(/\/join$/);
});

test('wrong credentials show one friendly message', async ({ page }) => {
  await studentSignIn(page, 'kuba', 'wrong-password');
  await expect(page.getByRole('alert')).toHaveText('Nie udało się zalogować. Sprawdź kod klasy, nazwę użytkownika i hasło.');
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
    await expect(page.getByText(`Zalogowano: ${name}`)).toBeVisible();
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

test('a teacher creates a student, who then signs in with the generated password', async ({ page, browser }) => {
  await teacherSignIn(page);
  const row = page.getByRole('row', { name: new RegExp(SEED.className) });
  await expect(row).toContainText(SEED.joinCode);
  await row.getByRole('link', { name: SEED.className }).click();

  await expect(page.getByRole('heading', { name: 'Uczniowie w klasie (3)' })).toBeVisible();
  await page.getByLabel('Imię widoczne dla nauczyciela').fill(`Łucja ${run}`);
  await expect(page.getByLabel('Nazwa użytkownika')).toHaveValue(`lucja-${run}`);
  await page.getByRole('button', { name: 'Utwórz konto' }).click();

  const password = (await page.getByTestId('issued-password').textContent()) ?? '';
  expect(password).toMatch(/^[a-hjkmnp-z2-9]{8}$/);
  await expect(page.getByRole('heading', { name: 'Uczniowie w klasie (4)' })).toBeVisible();
  await page.screenshot({ path: 'test-results/teacher-class.png', fullPage: true });

  const studentContext = await browser.newContext();
  const studentPage = await studentContext.newPage();
  await studentSignIn(studentPage, `lucja-${run}`, password);
  await expect(studentPage.getByRole('heading', { name: `Cześć, Łucja ${run}!` })).toBeVisible();
  await studentContext.close();

  page.once('dialog', (dialog) => void dialog.accept());
  await page.getByRole('button', { name: `Usuń z klasy: Łucja ${run}` }).click();
  await expect(page.getByRole('heading', { name: 'Uczniowie w klasie (3)' })).toBeVisible();
});

test('a teacher creates and renames a class', async ({ page }) => {
  await teacherSignIn(page);
  await page.getByLabel('Nazwa klasy').fill(`Klasa ${run}`);
  await page.getByRole('button', { name: 'Utwórz klasę' }).click();
  await expect(page.getByRole('heading', { name: `Klasa ${run}` })).toBeVisible();
  await expect(page.getByTestId('join-code')).toHaveText(/^[A-HJ-NP-Z2-9]{8}$/);

  await page.getByRole('button', { name: 'Zmień nazwę' }).click();
  await page.getByLabel('Nazwa klasy').fill(`Klasa ${run} B`);
  await page.getByRole('button', { name: 'Zapisz' }).click();
  await expect(page.getByRole('heading', { name: `Klasa ${run} B` })).toBeVisible();

  // Leave the shared seed teacher as it was.
  const admin = adminClient();
  await admin.from('classes').delete().like('name', `Klasa ${run}%`);
});

test('account screens fit a phone', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/join');
  await expect(page.getByRole('button', { name: 'Zaloguj się' })).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(0);
  await page.screenshot({ path: 'test-results/join-mobile.png', fullPage: true });
});
