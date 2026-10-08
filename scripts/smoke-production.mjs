// Opt-in production acceptance. Creates a clearly named test class and student.
// Credentials remain in an ignored local file; never print them or commit them.
import { readFile, appendFile } from 'node:fs/promises';
import { chromium, expect } from '@playwright/test';

if (process.env.PRODUCTION_SMOKE !== '1') throw new Error('Set PRODUCTION_SMOKE=1 to run this production write test');
const credentialFile = '.env.production.account.local';
const credentials = Object.fromEntries((await readFile(credentialFile, 'utf8')).trim().split(/\r?\n/).map(line => {
  const index = line.indexOf('='); return [line.slice(0, index), line.slice(index + 1)];
}));
const base = 'https://jakubzdankowski.github.io/platforma-python';
const browser = await chromium.launch();
const className = 'Test wdrożenia MVP';
const displayName = 'Uczeń testowy';
const username = credentials.SMOKE_STUDENT_USERNAME || 'test-wdrozenia';
try {
  const teacher = await browser.newPage();
  teacher.setDefaultTimeout(30_000);
  await teacher.goto(`${base}/login`);
  await teacher.getByLabel('Adres e-mail').fill(credentials.SUPABASE_TEACHER_EMAIL);
  await teacher.getByLabel('Hasło').fill(credentials.SUPABASE_TEACHER_PASSWORD);
  await teacher.getByRole('button', { name: 'Zaloguj się', exact: true }).click();
  await expect(teacher).toHaveURL(`${base}/teacher`, { timeout: 30_000 });
  console.log('Teacher login: OK');
  const existingClass = teacher.getByRole('link', { name: className, exact: true });
  await teacher.getByLabel('Nazwa klasy').waitFor();
  if (await existingClass.count()) await existingClass.click();
  else {
    await teacher.getByLabel('Nazwa klasy').fill(className);
    await teacher.getByRole('button', { name: 'Utwórz klasę', exact: true }).click();
  }
  await teacher.getByTestId('join-code').waitFor();
  const joinCode = await teacher.getByTestId('join-code').textContent();
  await teacher.getByRole('checkbox', { name: 'Pierwsza lekcja', exact: true }).check();
  await expect(teacher.getByRole('checkbox', { name: 'Pierwsza lekcja', exact: true })).toBeEnabled();
  let password = credentials.SMOKE_STUDENT_PASSWORD;
  if (!password) {
    await teacher.getByLabel('Imię widoczne dla nauczyciela').fill(displayName);
    await teacher.getByLabel('Nazwa użytkownika', { exact: true }).fill(username);
    await teacher.getByRole('button', { name: 'Utwórz konto', exact: true }).click();
    await teacher.getByTestId('issued-password').waitFor();
    password = await teacher.getByTestId('issued-password').textContent();
    await appendFile(credentialFile, `SMOKE_STUDENT_USERNAME=${username}\nSMOKE_STUDENT_PASSWORD=${password}\nSMOKE_CLASS_CODE=${joinCode}\n`);
  }
  console.log('Class, lesson assignment and student creation: OK');
  await teacher.getByRole('link', { name: 'Podgląd pracy klasy' }).click();
  await expect(teacher.getByTestId('live-connection')).toHaveText('Na żywo', { timeout: 30_000 });
  await teacher.getByRole('button', { name: `Podgląd: ${displayName}`, exact: true }).click();

  const studentContext = await browser.newContext();
  const student = await studentContext.newPage();
  student.setDefaultTimeout(60_000);
  await student.goto(`${base}/join`);
  await student.getByLabel('Kod klasy').fill(joinCode);
  await student.getByLabel('Nazwa użytkownika').fill(username);
  await student.getByLabel('Hasło').fill(password);
  await student.getByRole('button', { name: 'Zaloguj się', exact: true }).click();
  await student.getByRole('link', { name: 'Powitanie', exact: true }).click();
  const editor = student.getByRole('textbox', { name: 'Edytor kodu Python' });
  const code = `print("Wdrożenie działa — ${Date.now()}")`;
  await editor.fill(code);
  await expect(student.locator('.save-status')).toHaveText('Zapisano', { timeout: 15_000 });
  await expect(teacher.getByRole('textbox', { name: 'Kod Python ucznia (tylko do odczytu)' })).toHaveText(code, { timeout: 10_000 });
  console.log('Student login, autosave and teacher live view: OK');
  await student.getByRole('button', { name: 'Uruchom', exact: true }).click();
  await expect(student.getByTestId('stdout')).toContainText('Wdrożenie działa', { timeout: 60_000 });
  await student.reload();
  await expect(editor).toHaveText(code, { timeout: 30_000 });
  console.log('Python run and persistence after direct-URL refresh: OK');
  await student.getByRole('button', { name: 'Następne zadanie' }).click();
  await editor.fill('for i in range(4):\n    forward(100)\n    left(90)');
  await student.getByRole('button', { name: 'Uruchom', exact: true }).click();
  await expect(student.getByTestId('turtle-canvas')).toHaveAttribute('data-segments', '4', { timeout: 60_000 });
  await expect(student.locator('.save-status')).toHaveText('Zapisano', { timeout: 15_000 });
  await student.reload();
  await expect(editor).toHaveText('for i in range(4):\n    forward(100)\n    left(90)', { timeout: 30_000 });
  console.log('Turtle and saved code: OK');
  await student.getByRole('button', { name: 'Wyloguj się', exact: true }).click();
  await expect(student).toHaveURL(`${base}/join`);
  console.log('Logout: OK');
} finally {
  await browser.close();
}
