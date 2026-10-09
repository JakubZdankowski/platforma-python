import { expect, test } from '@playwright/test';
import { signInTeacher } from '../../src/auth/authService';
import { createStudent } from '../../src/classes/classService';
import { adminClient, anonClient, SEED } from '../db/localSupabase';

test('teacher watches saved student code within 3 seconds, read-only, and resyncs after disconnect', async ({ page, browser }) => {
  test.setTimeout(120_000);
  const admin = adminClient();
  const teacherClient = anonClient();
  expect(await signInTeacher(teacherClient, SEED.teacher.email, SEED.teacher.password)).toBeNull();
  const teacherId = (await teacherClient.auth.getUser()).data.user!.id;
  const run = Date.now().toString(36);
  const className = `Podgląd ${run}`;
  const classResult = await teacherClient.from('classes').insert({ name: className }).select('id, join_code').single();
  if (classResult.error) throw classResult.error;
  const classId = classResult.data.id;
  const userIds: string[] = [];
  let lessonId: string | undefined;
  const studentContext = await browser.newContext();
  try {
    const student = await createStudent(teacherClient, classId, `live-${run}`, 'Testowy uczeń');
    if (!student.ok) throw new Error('Could not create test student');
    userIds.push(student.value.studentId);
    const otherStudent = await createStudent(teacherClient, classId, `waiting-${run}`, 'Drugi uczeń');
    if (!otherStudent.ok) throw new Error('Could not create waiting student');
    userIds.push(otherStudent.value.studentId);
    const lesson = await admin.from('lessons').insert({ teacher_id: teacherId, slug: `live-${run}`, title: 'Lekcja podglądu' }).select('id').single();
    if (lesson.error) throw lesson.error;
    lessonId = lesson.data.id;
    const exercises = await admin.from('exercises').insert([
      { lesson_id: lessonId, slug: 'exercise-01', title: 'Pierwsze ćwiczenie', position: 0, instructions_markdown: 'Wypisz tekst.', starter_code: 'print("start")', runtime_type: 'python-console' },
      { lesson_id: lessonId, slug: 'exercise-02', title: 'Drugie ćwiczenie', position: 1, instructions_markdown: 'Wypisz drugi tekst.', starter_code: 'print("drugi")', runtime_type: 'python-console' },
    ]).select('id, position').order('position');
    if (exercises.error) throw exercises.error;
    expect((await teacherClient.from('assignments').insert({ class_id: classId, lesson_id: lessonId })).error).toBeNull();

    await page.goto('/login');
    await page.getByLabel('Adres e-mail').fill(SEED.teacher.email);
    await page.getByLabel('Hasło').fill(SEED.teacher.password);
    await page.getByRole('button', { name: 'Zaloguj się', exact: true }).click();
    await page.getByRole('link', { name: 'Grupy', exact: true }).click();
    await page.getByRole('link', { name: className, exact: true }).click();
    await page.getByRole('link', { name: 'Podgląd pracy klasy' }).click();
    await expect(page).toHaveURL(new RegExp(`/teacher/classes/${classId}/live$`));
    const connection = page.getByTestId('live-connection');
    await expect(connection).toHaveText('Na żywo');
    const row = page.getByTestId(`live-student-${student.value.studentId}`);
    const waitingRow = page.getByTestId(`live-student-${otherStudent.value.studentId}`);
    await expect(row).toContainText('nie zaczął');
    await expect(waitingRow).toContainText('nie zaczął');
    await page.getByRole('button', { name: 'Podgląd: Testowy uczeń', exact: true }).click();
    await expect(page.getByText('Uczeń nie otworzył jeszcze żadnego ćwiczenia.')).toBeVisible();

    const studentPage = await studentContext.newPage();
    await studentPage.goto('/join');
    await studentPage.getByLabel('Nazwa użytkownika').fill(student.value.username);
    await studentPage.getByLabel('Hasło').fill(student.value.password);
    await studentPage.getByRole('button', { name: 'Zaloguj się', exact: true }).click();
    await studentPage.getByRole('button', { name: className, exact: true }).click();
    await studentPage.getByRole('link', { name: /Lekcja podglądu/ }).click();
    const editor = studentPage.getByRole('textbox', { name: 'Edytor kodu Python' });
    await expect(editor).toHaveText('print("start")');
    const watched = page.getByRole('textbox', { name: 'Kod Python ucznia (tylko do odczytu)' });
    await expect(watched).toHaveText('print("start")');
    await editor.fill('print("Żółw i ąęł — zmiana na żywo")');
    await expect(watched).toHaveText('print("Żółw i ąęł — zmiana na żywo")', { timeout: 3000 });
    await expect(row).toContainText('pisze');
    await expect(waitingRow).toContainText('nie zaczął');
    await expect(watched).toHaveAttribute('aria-readonly', 'true');
    await expect(watched).toHaveAttribute('contenteditable', 'false');
    await watched.click();
    await page.keyboard.press('Control+End');
    await page.keyboard.type('HACK');
    await page.keyboard.press('Control+Enter');
    await expect(watched).toHaveText('print("Żółw i ąęł — zmiana na żywo")');
    await expect(page.getByRole('button', { name: 'Uruchom', exact: true })).toHaveCount(0);
    expect((await admin.from('student_work').select('code').eq('student_id', student.value.studentId).eq('exercise_id', exercises.data[0]!.id).single()).data?.code).toBe('print("Żółw i ąęł — zmiana na żywo")');

    await studentPage.getByRole('button', { name: 'Uruchom', exact: true }).click();
    await expect(row).toContainText('✓ Sukces');
    await editor.fill('1 / 0');
    await studentPage.getByRole('button', { name: 'Uruchom', exact: true }).click();
    await expect(row).toContainText('ZeroDivisionError');
    await expect(page.locator('#student-live-view')).toContainText('division by zero');
    await studentPage.getByRole('button', { name: 'Następne zadanie' }).click();
    await expect(editor).toHaveText('print("drugi")');
    await editor.fill('print("Drugi kod")');
    await expect(watched).toHaveText('print("Drugi kod")', { timeout: 3000 });
    await expect(row).toContainText('Drugie ćwiczenie');

    // Only the teacher disconnects: the student's independent browser keeps saving.
    await page.context().setOffline(true);
    await expect(connection).toHaveText('Połączenie utracone — ostatnia zapisana wersja');
    await editor.fill('print("Zapisane podczas rozłączenia")');
    await expect(studentPage.locator('.save-status')).toHaveText('Zapisano');
    await expect(watched).toHaveText('print("Drugi kod")');
    await page.context().setOffline(false);
    await expect(connection).toHaveText('Na żywo');
    await expect(watched).toHaveText('print("Zapisane podczas rozłączenia")');
    await expect(page.getByRole('combobox', { name: 'Język interfejsu' })).toHaveCount(0);
    await expect(connection).toHaveText('Na żywo');
    await expect(page.locator('#student-live-view .cm-content')).toHaveText('print("Zapisane podczas rozłączenia")');

    // Unavailable class URLs and student access are protected by existing RLS/guards.
    await page.goto(`/teacher/classes/${crypto.randomUUID()}/live`);
    await expect(page.getByRole('alert')).toHaveText('Ta grupa nie istnieje albo należy do innego nauczyciela.');
    await studentPage.goto(`/teacher/classes/${classId}/live`);
    await expect(studentPage).toHaveURL(/\/student$/);
  } finally {
    try { await page.context().setOffline(false); await studentContext.close(); }
    finally {
      for (const id of userIds) await admin.auth.admin.deleteUser(id);
      if (lessonId) await admin.from('lessons').delete().eq('id', lessonId);
      await admin.from('classes').delete().eq('id', classId);
    }
  }
});
