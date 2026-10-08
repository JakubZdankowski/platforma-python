import { expect, test } from '@playwright/test';
import { signInTeacher } from '../../src/auth/authService';
import { adminClient, anonClient, SEED } from '../db/localSupabase';

test('cancel keeps a lesson assigned; confirmation removes it', async ({ page }) => {
  const teacher = anonClient();
  const admin = adminClient();
  expect(await signInTeacher(teacher, SEED.teacher.email, SEED.teacher.password)).toBeNull();
  const teacherId = (await teacher.auth.getUser()).data.user!.id;
  const created = await teacher.from('classes').insert({ name: `Potwierdzenie ${Date.now()}` }).select('id').single();
  if (created.error) throw created.error;
  const classId = created.data.id;
  let lessonId: string | undefined;
  try {
    const lesson = await admin.from('lessons').insert({ teacher_id: teacherId, slug: `confirm-${Date.now()}`, title: 'Lekcja do potwierdzenia' }).select('id').single();
    if (lesson.error) throw lesson.error;
    lessonId = lesson.data.id;
    await page.goto('/login');
    await page.getByLabel('Adres e-mail').fill(SEED.teacher.email);
    await page.getByLabel('Hasło').fill(SEED.teacher.password);
    await page.getByRole('button', { name: 'Zaloguj się', exact: true }).click();
    await expect(page).toHaveURL(/\/teacher$/);
    await page.goto(`/teacher/classes/${classId}`);
    const checkbox = page.getByRole('checkbox', { name: 'Lekcja do potwierdzenia', exact: true });
    await checkbox.check();
    await expect(checkbox).toBeEnabled();
    page.once('dialog', async dialog => {
      expect(dialog.message()).toContain('Lekcja do potwierdzenia');
      expect(dialog.message()).toContain('możliwość zapisu');
      await dialog.dismiss();
    });
    await checkbox.click();
    await expect(checkbox).toBeChecked();
    // Browser login replaces the setup client's session; verification uses admin.
    const read = () => admin.from('assignments').select('lesson_id').eq('class_id', classId).eq('lesson_id', lessonId!);
    expect((await read()).data).toHaveLength(1);
    page.once('dialog', dialog => void dialog.accept());
    await checkbox.click();
    await expect(checkbox).not.toBeChecked();
    await expect(checkbox).toBeEnabled();
    expect((await read()).data).toHaveLength(0);
    await page.reload();
    await expect(checkbox).not.toBeChecked();
  } finally {
    await teacher.auth.signOut();
    if (lessonId) await admin.from('lessons').delete().eq('id', lessonId);
    await admin.from('classes').delete().eq('id', classId);
  }
});
