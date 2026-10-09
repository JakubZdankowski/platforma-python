import { expect, test } from '@playwright/test';
import { adminClient, SEED } from '../db/localSupabase';

test('teacher creates an independent student and assigns a module; student keeps saved code across revocation', async ({ page, browser }) => {
  const admin = adminClient();
  const suffix = Date.now().toString(36);
  const username = `material-${suffix}`;
  const displayName = `Uczeń modułów ${suffix}`;
  const title = `1. Podstawy Pythona ${suffix}`;
  let moduleId: string | undefined;
  let lessonId: string | undefined;
  const studentContext = await browser.newContext();
  try {
    await page.goto('/login');
    await page.getByLabel('Adres e-mail').fill(SEED.teacher.email);
    await page.getByLabel('Hasło').fill(SEED.teacher.password);
    await page.getByRole('button', { name: 'Zaloguj się', exact: true }).click();
    await expect(page).toHaveURL(/\/teacher$/);
    await page.getByRole('link', { name: 'Uczniowie', exact: true }).click();
    await page.getByLabel('Imię widoczne dla nauczyciela').fill(displayName);
    await page.getByLabel('Nazwa użytkownika').fill(username);
    await page.getByRole('button', { name: 'Utwórz konto' }).click();
    await expect(page.getByTestId('issued-password')).toBeVisible();
    const password = (await page.getByTestId('issued-password').textContent())!;
    const profile = await admin.from('profiles').select('id, created_by').eq('username', username).single();
    if (profile.error) throw profile.error;
    const studentId = profile.data.id;
    expect((await admin.from('class_members').select('id').eq('student_id', studentId)).data).toEqual([]);
    const studentPage = await studentContext.newPage();
    await studentPage.goto('/join');
    await expect(studentPage.getByLabel('Kod klasy')).toHaveCount(0);
    await studentPage.getByLabel('Nazwa użytkownika').fill(username);
    await studentPage.getByLabel('Hasło').fill(password);
    await studentPage.getByRole('button', { name: 'Zaloguj się', exact: true }).click();
    await expect(studentPage.getByText('Nie masz jeszcze materiałów')).toBeVisible();

    const lesson = await admin.from('lessons').insert({ teacher_id: profile.data.created_by!, slug: `module-${suffix}`, title: `Pierwsza lekcja ${suffix}` }).select('id').single();
    if (lesson.error) throw lesson.error;
    lessonId = lesson.data.id;
    const exercise = await admin.from('exercises').insert({ lesson_id: lessonId, slug: 'hello', title: 'Powitanie', instructions_markdown: 'Napisz powitanie.', starter_code: 'print("Cześć")', runtime_type: 'python-console' }).select('id').single();
    if (exercise.error) throw exercise.error;
    await page.getByRole('link', { name: 'Materiały', exact: true }).click();
    await page.getByLabel('Nazwa modułu').fill(title);
    await page.getByRole('button', { name: 'Utwórz moduł' }).click();
    await expect(page).toHaveURL(/\/teacher\/materials\/[^/]+$/);
    moduleId = new URL(page.url()).pathname.split('/').at(-1);
    await page.getByRole('checkbox', { name: `Pierwsza lekcja ${suffix}`, exact: true }).check();
    await expect(page.getByRole('checkbox', { name: `Pierwsza lekcja ${suffix}`, exact: true })).toBeEnabled();
    const direct = page.getByRole('checkbox', { name: `${displayName} (${username})`, exact: true });
    await direct.check();
    await expect(direct).toBeEnabled();
    await expect(direct).toBeChecked();
    await page.screenshot({ path: 'test-results/teacher-module-settings.png', fullPage: true });

    await studentPage.reload();
    const moduleButton = studentPage.getByRole('button', { name: title, exact: true });
    await expect(moduleButton).toHaveAttribute('aria-expanded', 'false');
    await expect(studentPage.getByRole('link', { name: /Powitanie/ })).toHaveCount(0);
    await moduleButton.click();
    await studentPage.getByRole('link', { name: `Pierwsza lekcja ${suffix}`, exact: false }).click();
    const editor = studentPage.getByRole('textbox', { name: 'Edytor kodu Python' });
    await expect(editor).toContainText('print("Cześć")');
    await editor.fill('print("Zachowana praca")');
    await expect(studentPage.locator('.save-status')).toHaveText('Zapisano');
    await studentPage.getByRole('link', { name: /Wszystkie lekcje/ }).click();
    await expect(studentPage).toHaveURL(new RegExp(`/student/materials\\?module=${moduleId}$`));
    await expect(studentPage.getByRole('button', { name: title })).toHaveAttribute('aria-expanded', 'true');
    await expect(studentPage.getByText('W trakcie', { exact: true })).toBeVisible();
    await studentPage.screenshot({ path: 'test-results/student-modules-expanded.png', fullPage: true });
    await studentPage.setViewportSize({ width: 390, height: 844 });
    expect(await studentPage.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await studentPage.screenshot({ path: 'test-results/student-modules-expanded-mobile.png', fullPage: true });

    page.once('dialog', (d) => void d.accept());
    await direct.uncheck();
    await expect(direct).toBeEnabled();
    await expect(direct).not.toBeChecked();
    await studentPage.reload();
    await expect(studentPage.getByText('Nie masz jeszcze materiałów')).toBeVisible();
    expect((await admin.from('student_work').select('code').eq('student_id', studentId).eq('exercise_id', exercise.data.id).single()).data?.code).toBe('print("Zachowana praca")');
  } finally {
    await studentContext.close();
    if (moduleId) await admin.from('modules').delete().eq('id', moduleId);
    if (lessonId) await admin.from('lessons').delete().eq('id', lessonId);
    const student = await admin.from('profiles').select('id').eq('username', username).maybeSingle();
    if (student.data) await admin.auth.admin.deleteUser(student.data.id);
  }
});

