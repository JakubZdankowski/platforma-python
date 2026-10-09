import { readFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';
import { adminClient, SEED } from '../db/localSupabase';

test('offline edits are protected, downloadable and retained after access is revoked', async ({ page, context }) => {
  const admin = adminClient();
  const classroom = (await admin.from('classes').select('id, teacher_id').eq('join_code', SEED.joinCode).single()).data!;
  const lesson = await admin.from('lessons').insert({ teacher_id: classroom.teacher_id, slug: `protection-${Date.now()}`, title: 'Ochrona pracy' }).select('id').single();
  if (lesson.error) throw lesson.error;
  const lessonId = lesson.data.id;
  try {
    const exercise = await admin.from('exercises').insert({ lesson_id: lessonId, slug: 'test', title: 'Kod ucznia', position: 1, instructions_markdown: 'Test', starter_code: 'print("start")', runtime_type: 'python-console' }).select('id').single();
    if (exercise.error) throw exercise.error;
    const assigned = await admin.from('assignments').insert({ class_id: classroom.id, lesson_id: lessonId });
    if (assigned.error) throw assigned.error;
    await page.goto('/join');
    await page.getByLabel('Nazwa użytkownika').fill('ania');
    await page.getByLabel('Hasło').fill(SEED.password('ania'));
    await page.getByRole('button', { name: 'Zaloguj się', exact: true }).click();
    await expect(page).toHaveURL(/\/student$/);
    await page.goto(`/student/exercises/${exercise.data.id}`);
    const editor = page.getByRole('textbox', { name: 'Edytor kodu Python' });
    await expect(editor).toHaveText('print("start")');
    await context.setOffline(true);
    await editor.fill('print("Moja praca — ąęł")');
    await expect(page.getByRole('alert')).toContainText('zmiany nie zostały zapisane');
    // Exercise the native close/refresh warning without abandoning the document.
    await page.evaluate(() => {
      const event = new Event('beforeunload', { cancelable: true });
      window.dispatchEvent(event);
      if (!event.defaultPrevented) throw new Error('Missing unsaved-work warning');
    });
    const downloaded = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Pobierz kod .py' }).click();
    const download = await downloaded;
    expect(download.suggestedFilename()).toBe('Kod ucznia.py');
    expect(await readFile((await download.path())!, 'utf8')).toBe('print("Moja praca — ąęł")');
    await context.setOffline(false);
    await expect(page.locator('.save-status')).toHaveText('Zapisano');
    await expect(page.getByRole('alert')).toHaveCount(0);
    expect(await page.evaluate(() => {
      const event = new Event('beforeunload', { cancelable: true });
      window.dispatchEvent(event);
      return event.defaultPrevented;
    })).toBe(false);
    await page.route('**/rest/v1/student_work?*', async route => {
      if (route.request().method() === 'PATCH') await route.fulfill({ status: 503, body: '{}' });
      else await route.continue();
    });
    await editor.fill('print("Niezapisane zmiany")');
    await expect(page.locator('.save-status')).toHaveText('Nie zapisano — ponawiam…');
    const removed = await admin.from('assignments').delete().eq('class_id', classroom.id).eq('lesson_id', lessonId);
    if (removed.error) throw removed.error;
    await expect(page.getByRole('alert')).toContainText('Dostęp do tej lekcji został odebrany');
    await expect(editor).toHaveText('print("Niezapisane zmiany")');
    await expect(editor).toHaveAttribute('aria-readonly', 'true');
    await expect(page.getByRole('button', { name: 'Uruchom', exact: true })).toBeDisabled();
    await expect(page.getByRole('button', { name: 'Pobierz kod .py' })).toBeEnabled();
    await page.unroute('**/rest/v1/student_work?*');
    await admin.from('assignments').insert({ class_id: classroom.id, lesson_id: lessonId });
    await expect(editor).toHaveAttribute('aria-readonly', 'false');
    await expect(page.getByRole('alert')).toHaveCount(0);
    await expect(page.locator('.save-status')).toHaveText('Zapisano');
  } finally {
    await context.setOffline(false);
    await page.goto('/student');
    await admin.from('lessons').delete().eq('id', lessonId);
  }
});
