import { expect, test } from '@playwright/test';
import { sessionFixture } from '../db/sessionFixture';

test('copying approved material preserves the original and protects unsaved draft navigation', async ({ page }) => {
  const f = await sessionFixture();
  const original = await f.admin.from('exercises').select('*').eq('id', f.exerciseId).single();
  if (original.error) throw original.error;
  const lessonId = original.data.lesson_id;
  let copyId: string | undefined;
  try {
    await page.goto('/login');
    await page.getByLabel('Adres e-mail').fill(f.teacherEmail);
    await page.getByLabel('Hasło').fill(f.password);
    await page.getByRole('button', { name: 'Zaloguj się', exact: true }).click();
    await expect(page).toHaveURL('/teacher');
    await page.goto(`/teacher/materials/${lessonId}`);
    await expect(page.getByLabel('Tytuł lekcji')).not.toBeEditable();
    await page.getByRole('button', { name: 'Utwórz kopię do edycji', exact: true }).click();
    await expect(page.getByLabel('Tytuł lekcji')).toHaveValue('Lekcja sesji — kopia');
    await page.getByLabel('Instrukcja Markdown').fill('Changed draft instructions');

    page.once('dialog', dialog => dialog.dismiss());
    await page.getByRole('link', { name: '← Materiały', exact: true }).click();
    await expect(page).toHaveURL(`/teacher/materials/${lessonId}`);
    await expect(page.getByLabel('Instrukcja Markdown')).toHaveValue('Changed draft instructions');
    page.once('dialog', dialog => dialog.dismiss());
    await page.getByRole('button', { name: 'Usuń ćwiczenie', exact: true }).click();
    await expect(page.locator('.exercise-tab')).toHaveCount(1);

    await page.getByRole('button', { name: 'Zapisz szkic', exact: true }).click();
    await expect(page).not.toHaveURL(`/teacher/materials/${lessonId}`);
    await expect(page).toHaveURL(/\/teacher\/materials\/[0-9a-f-]+$/);
    copyId = new URL(page.url()).pathname.split('/').at(-1)!;
    await expect(page.getByLabel('Instrukcja Markdown')).toHaveValue('Changed draft instructions');
    const copied = await f.admin.from('exercises').select('*').eq('lesson_id', copyId).single();
    expect(copied.error).toBeNull();
    expect(copied.data).toMatchObject({ instructions_markdown: 'Changed draft instructions',
      starter_code: original.data.starter_code, runtime_type: original.data.runtime_type, is_hidden: original.data.is_hidden });
    expect(copied.data!.id).not.toBe(f.exerciseId);
    const unchanged = await f.admin.from('exercises').select('*').eq('id', f.exerciseId).single();
    expect(unchanged.error).toBeNull();
    expect(unchanged.data).toEqual(original.data);
    const lessons = await f.admin.from('lessons').select('id,publication_status').in('id', [lessonId, copyId]);
    expect(lessons.error).toBeNull();
    expect(lessons.data).toEqual(expect.arrayContaining([
      { id: lessonId, publication_status: 'approved' }, { id: copyId, publication_status: 'draft' },
    ]));
  } finally {
    if (copyId) await f.admin.from('lessons').delete().eq('id', copyId);
    await f.admin.from('lessons').delete().eq('id', lessonId);
    await f.cleanup();
  }
});
