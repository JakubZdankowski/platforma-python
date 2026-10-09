import { execFileSync } from 'node:child_process';
import { cpSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, sep } from 'node:path';
import { expect, test } from '@playwright/test';
import { adminClient, localKeys, SEED } from '../db/localSupabase';

test('teacher assigns imported content; student code survives refresh, retries, navigation and reset', async ({ page, browser }) => {
  test.setTimeout(120_000);
  const admin = adminClient();
  // Identify the seed teacher by their class rather than their editable display name.
  const classRow = (await admin.from('classes').select('id, teacher_id').eq('join_code', SEED.joinCode).single()).data!;
  const keys = localKeys();
  const courseDirectory = mkdtempSync(join(tmpdir(), 'python-course-'));
  const slug = `lesson-${Date.now().toString(36)}`;
  const lessonTitle = `Pierwsza lekcja ${slug}`;
  cpSync('course-example/01-pierwsza-lekcja', join(courseDirectory, slug), { recursive: true });
  writeFileSync(join(courseDirectory, slug, 'lesson.md'), `---\ntitle: ${lessonTitle}\n---\n`);
  const sync = () => execFileSync(process.execPath, ['scripts/sync-content.mjs', courseDirectory], {
    encoding: 'utf8', env: { ...process.env, SUPABASE_URL: keys.url, SUPABASE_SECRET_KEY: keys.serviceKey, SUPABASE_TEACHER_ID: classRow.teacher_id },
  });
  let lessonId: string | undefined;
  const studentContext = await browser.newContext();
  try {
    sync();
    lessonId = (await admin.from('lessons').select('id').eq('teacher_id', classRow.teacher_id).eq('slug', slug).single()).data!.id;
    const original = (await admin.from('exercises').select('id').eq('lesson_id', lessonId).order('position')).data!;
    sync();
    expect((await admin.from('exercises').select('id').eq('lesson_id', lessonId).order('position')).data).toEqual(original);
    const studentPage = await studentContext.newPage();
    await studentPage.goto('/join');
    await studentPage.getByLabel('Nazwa użytkownika').fill('ania');
    await studentPage.getByLabel('Hasło').fill(SEED.password('ania'));
    await studentPage.getByRole('button', { name: 'Zaloguj się', exact: true }).click();
    await expect(studentPage).toHaveURL(/\/student$/);
    await expect(studentPage.getByRole('heading', { name: lessonTitle, exact: true })).toHaveCount(0);

    await page.goto('/login');
    await page.getByLabel('Adres e-mail').fill(SEED.teacher.email);
    await page.getByLabel('Hasło').fill(SEED.teacher.password);
    await page.getByRole('button', { name: 'Zaloguj się', exact: true }).click();
    await page.getByRole('link', { name: 'Materiały', exact: true }).click();
    await page.getByRole('link', { name: new RegExp(SEED.className) }).click();
    await page.getByRole('checkbox', { name: lessonTitle }).check();
    await expect(page.getByRole('checkbox', { name: lessonTitle })).toBeEnabled();
    await expect(page.getByRole('checkbox', { name: lessonTitle })).toBeChecked();
    await studentPage.reload();
    await studentPage.getByRole('button', { name: SEED.className, exact: true }).click();
    await studentPage.locator(`a[href="/student/exercises/${original[0]!.id}"]`).click();
    const editor = studentPage.getByRole('textbox', { name: 'Edytor kodu Python' });
    await expect(editor).toHaveText('print("Cześć!")');
    await editor.fill('print("Zapisane — ąęł")');
    await expect(studentPage.locator('.save-status')).toHaveText('Zapisano');
    await studentPage.reload();
    await expect(editor).toHaveText('print("Zapisane — ąęł")');

    // A failing save keeps the editor's code and retries the latest revision.
    await studentPage.route('**/rest/v1/student_work?*', async (route) => {
      if (route.request().method() === 'PATCH') await route.fulfill({ status: 503, body: '{}' }); else await route.continue();
    });
    await editor.fill('print("Po odzyskaniu połączenia")');
    await expect(studentPage.locator('.save-status')).toHaveText('Nie zapisano — ponawiam…');
    await expect(editor).toHaveText('print("Po odzyskaniu połączenia")');
    await studentPage.unroute('**/rest/v1/student_work?*');
    await expect(studentPage.locator('.save-status')).toHaveText('Zapisano');

    await editor.fill('print("Przed uruchomieniem")');
    await studentPage.getByRole('button', { name: 'Uruchom', exact: true }).click();
    await expect(studentPage.getByTestId('stdout')).toHaveText('Przed uruchomieniem\n');
    await expect.poll(async () => (await admin.from('student_work').select('last_run_success').eq('exercise_id', original[0]!.id).single()).data?.last_run_success).toBe(true);
    await editor.fill('1 / 0');
    await studentPage.getByRole('button', { name: 'Uruchom', exact: true }).click();
    await expect(studentPage.getByTestId('python-error')).toContainText('ZeroDivisionError');
    await expect.poll(async () => (await admin.from('student_work').select('last_error_type').eq('exercise_id', original[0]!.id).single()).data?.last_error_type).toBe('ZeroDivisionError');

    // Navigation flushes immediately, before the debounce timer expires.
    await editor.fill('print("Nawigacja")');
    await studentPage.getByRole('button', { name: 'Następne zadanie' }).click();
    await expect(studentPage.locator('.exercise-number')).toContainText('Kwadrat');
    await studentPage.getByRole('button', { name: 'Poprzednie zadanie' }).click();
    await expect(editor).toHaveText('print("Nawigacja")');
    await editor.fill('print("Lista ćwiczeń")');
    await studentPage.getByRole('button', { name: /Ćwiczenia ·/ }).click();
    await studentPage.locator('.exercise-picker-list').getByRole('button', { name: /Kwadrat/ }).click();
    await expect(studentPage.locator('.exercise-number')).toContainText('Kwadrat');
    await studentPage.getByRole('button', { name: /Ćwiczenia ·/ }).click();
    await studentPage.locator('.exercise-picker-list').getByRole('button').first().click();
    await expect(editor).toHaveText('print("Lista ćwiczeń")');
    await editor.fill('print("Nawigacja")');
    studentPage.once('dialog', (dialog) => void dialog.dismiss());
    await studentPage.getByRole('button', { name: 'Przywróć kod początkowy' }).click();
    await expect(editor).toHaveText('print("Nawigacja")');
    studentPage.once('dialog', (dialog) => void dialog.accept());
    await studentPage.getByRole('button', { name: 'Przywróć kod początkowy' }).click();
    await expect(studentPage.locator('.save-status')).toHaveText('Zapisano');
    await studentPage.reload();
    await expect(editor).toHaveText('print("Cześć!")');

    // A real pagehide flushes edits made immediately before refresh.
    await editor.fill('print("Szybkie odświeżenie")');
    studentPage.once('dialog', (dialog) => void dialog.accept());
    await studentPage.reload();
    await expect(editor).toHaveText('print("Szybkie odświeżenie")');
    await expect(studentPage.getByRole('combobox', { name: 'Język interfejsu' })).toHaveCount(0);
    await expect(studentPage.locator('.save-status')).toHaveText('Zapisano');
    await expect(studentPage.locator('.cm-content')).toHaveText('print("Szybkie odświeżenie")');
    page.once('dialog', (dialog) => void dialog.accept());
    await page.getByRole('checkbox', { name: lessonTitle }).uncheck();
    await expect(page.getByRole('checkbox', { name: lessonTitle })).toBeEnabled();
    await studentPage.reload();
    await expect(studentPage.getByRole('alert')).toHaveText('To ćwiczenie nie jest dostępne. Poproś nauczyciela o przypisanie lekcji.');
  } finally {
    try { await studentContext.close(); }
    finally {
      if (lessonId) await admin.from('lessons').delete().eq('id', lessonId);
      if (!resolve(courseDirectory).startsWith(resolve(tmpdir()) + sep)) throw new Error('Unexpected test course path');
      rmSync(courseDirectory, { recursive: true, force: true });
    }
  }
});
