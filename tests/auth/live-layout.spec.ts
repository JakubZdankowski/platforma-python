import { expect, test } from '@playwright/test';
import { signInTeacher } from '../../src/auth/authService';
import { studentAuthEmail } from '../../supabase/functions/teacher-students/handler';
import { adminClient, anonClient, SEED } from '../db/localSupabase';

test('four students remain visible beside a tall read-only editor without scrolling the page', async ({ page }) => {
  const admin = adminClient();
  const teacher = anonClient();
  expect(await signInTeacher(teacher, SEED.teacher.email, SEED.teacher.password)).toBeNull();
  const teacherId = (await teacher.auth.getUser()).data.user!.id;
  const createdClass = await teacher.from('classes').insert({ name: `Układ podglądu ${Date.now()}` }).select('id').single();
  if (createdClass.error) throw createdClass.error;
  const classId = createdClass.data.id;
  const userIds: string[] = [];
  let lessonId: string | undefined;
  try {
    const lesson = await admin.from('lessons').insert({ teacher_id: teacherId, slug: `layout-${Date.now()}`, title: 'Lekcja testowa' }).select('id').single();
    if (lesson.error) throw lesson.error;
    lessonId = lesson.data.id;
    const exercise = await admin.from('exercises').insert({ lesson_id: lessonId, slug: 'exercise-01', title: 'Ćwiczenie testowe', position: 0, instructions_markdown: 'Test', starter_code: '', runtime_type: 'python-console' }).select('id').single();
    if (exercise.error) throw exercise.error;
    const assignment = await teacher.from('assignments').insert({ class_id: classId, lesson_id: lessonId });
    if (assignment.error) throw assignment.error;
    for (let i = 1; i <= 4; i++) {
      const username = `layout-${Date.now()}-${i}`;
      const user = await admin.auth.admin.createUser({ email: studentAuthEmail(teacherId, username), password: 'layout-test-password', email_confirm: true, app_metadata: { role: 'student', created_by: teacherId, username, display_name: `Uczeń układu ${i}` } });
      if (user.error) throw user.error;
      userIds.push(user.data.user.id);
      const member = await admin.from('class_members').insert({ class_id: classId, student_id: user.data.user.id });
      if (member.error) throw member.error;
      const work = await admin.from('student_work').insert({ student_id: user.data.user.id, exercise_id: exercise.data.id, code: Array.from({ length: 80 }, (_, line) => `print("uczeń ${i}, linia ${line + 1}")`).join('\n'), status: 'in_progress' });
      if (work.error) throw work.error;
    }
    await page.goto('/login');
    await page.getByLabel('Adres e-mail').fill(SEED.teacher.email);
    await page.getByLabel('Hasło').fill(SEED.teacher.password);
    await page.getByRole('button', { name: 'Zaloguj się', exact: true }).click();
    await expect(page).toHaveURL(/\/teacher$/);
    await page.goto(`/teacher/classes/${classId}/live`);
    for (let i = 1; i <= 4; i++) {
      const button = page.getByRole('button', { name: `Podgląd: Uczeń układu ${i}`, exact: true });
      await expect(button).toBeInViewport();
      await button.click();
      const editor = page.getByRole('textbox', { name: 'Kod Python ucznia (tylko do odczytu)' });
      await expect(editor).toContainText(`print("uczeń ${i}, linia 1")`);
      await expect(editor).toHaveAttribute('aria-readonly', 'true');
      expect(await page.evaluate(() => window.scrollY)).toBe(0);
      expect(await page.evaluate(() => document.documentElement.scrollHeight <= innerHeight + 1)).toBe(true);
      expect((await page.locator('.live-code-container').boundingBox())!.height).toBeGreaterThan(450);
    }
    await page.screenshot({ path: 'test-results/live-layout-desktop.png', fullPage: true });
    await page.setViewportSize({ width: 390, height: 844 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    expect((await page.locator('.live-viewer').boundingBox())!.height).toBeLessThanOrEqual(600);
    await page.screenshot({ path: 'test-results/live-layout-mobile.png', fullPage: true });
  } finally {
    await teacher.auth.signOut();
    for (const id of userIds) await admin.auth.admin.deleteUser(id);
    if (lessonId) await admin.from('lessons').delete().eq('id', lessonId);
    await admin.from('classes').delete().eq('id', classId);
  }
});
