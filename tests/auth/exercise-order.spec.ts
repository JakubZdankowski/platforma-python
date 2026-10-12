import { expect, test } from '@playwright/test';
import { adminClient } from '../db/localSupabase';

test('teacher reorders whole exercises, preserves saved work and saves their order', async ({ page }) => {
  const service = adminClient();
  let lessonId: string | undefined;
  const suffix = Date.now().toString(36);
  const title = `Kolejność ćwiczeń ${suffix}`;
  const email = `exercise-order-${suffix}@example.test`;
  const password = `exercise-order-${suffix}-password`;
  const users: string[] = [];
  const tabs = page.locator('.exercise-tab');
  const earlier = page.getByRole('button', { name: 'Przesuń wcześniej', exact: true });
  const later = page.getByRole('button', { name: 'Przesuń później', exact: true });
  try {
    const teacher = await service.auth.admin.createUser({ email, password, email_confirm: true,
      app_metadata: { role: 'teacher', display_name: 'Test kolejności' } });
    if (teacher.error) throw teacher.error;
    users.push(teacher.data.user.id);
    const student = await service.auth.admin.createUser({ email: `order-${suffix}.${teacher.data.user.id.replaceAll('-', '')}@students.invalid`, password, email_confirm: true,
      app_metadata: { role: 'student', username: `order-${suffix}`, display_name: 'Uczeń testu kolejności', created_by: teacher.data.user.id } });
    if (student.error) throw student.error;
    users.push(student.data.user.id);
    await page.goto('/login');
    await page.getByLabel('Adres e-mail').fill(email);
    await page.getByLabel('Hasło').fill(password);
    await page.getByRole('button', { name: 'Zaloguj się', exact: true }).click();
    await expect(page).toHaveURL(/\/teacher$/);
    await page.goto('/teacher/materials/new');
    await page.getByLabel('Tytuł lekcji').fill(title);
    await expect(earlier).toBeDisabled();
    await expect(later).toBeDisabled();
    for (const [index, name] of ['A', 'B', 'C'].entries()) {
      if (index) await page.getByRole('button', { name: '+ Ćwiczenie', exact: true }).click();
      await page.getByLabel('Tytuł ćwiczenia', { exact: true }).fill(name);
      await page.getByLabel('Instrukcja Markdown').fill(`Instrukcja ${name}`);
      await page.getByLabel('Kod początkowy ucznia').fill(`print("${name}")`);
      await page.getByLabel('Środowisko').selectOption(name === 'B' ? 'python-turtle' : 'python-console');
    }
    await page.getByRole('button', { name: 'Zapisz szkic', exact: true }).click();
    await expect(page).toHaveURL(/\/teacher\/materials\/[0-9a-f-]+$/);
    lessonId = new URL(page.url()).pathname.split('/').at(-1)!;
    await expect(page.getByLabel('Tytuł lekcji')).toBeEditable();
    const original = await service.from('exercises').select('*').eq('lesson_id', lessonId).order('position');
    if (original.error) throw original.error;
    expect(original.data.map(e => e.title)).toEqual(['A', 'B', 'C']);
    const b = original.data[1]!;
    const work = await service.from('student_work').insert({ student_id: student.data.user.id, exercise_id: b.id, code: '# zachowana praca' });
    if (work.error) throw work.error;
    await tabs.nth(1).click();
    await page.getByLabel('Instrukcja Markdown').fill('Instrukcja B po edycji');
    await earlier.click();
    await expect(tabs).toHaveText(['1. B', '2. A', '3. C']);
    await expect(tabs.nth(0)).toHaveAttribute('aria-pressed', 'true');
    await expect(earlier).toBeDisabled();
    await expect(page.getByLabel('Instrukcja Markdown')).toHaveValue('Instrukcja B po edycji');
    await expect(page.getByLabel('Kod początkowy ucznia')).toHaveValue('print("B")');
    await expect(page.getByLabel('Środowisko')).toHaveValue('python-turtle');
    await later.click();
    await later.click();
    await expect(tabs).toHaveText(['1. A', '2. C', '3. B']);
    await expect(tabs.nth(2)).toHaveAttribute('aria-pressed', 'true');
    await expect(later).toBeDisabled();
    await page.route('**/rest/v1/rpc/save_material', route => route.fulfill({ status: 503, contentType: 'application/json', body: '{"message":"Temporary failure"}' }), { times: 1 });
    await page.getByRole('button', { name: 'Zapisz szkic', exact: true }).click();
    await expect(page.getByRole('status')).toContainText('Nie udało się zapisać lekcji');
    await expect(tabs).toHaveText(['1. A', '2. C', '3. B']);
    await page.getByRole('button', { name: 'Zapisz szkic', exact: true }).click();
    await expect(page.getByRole('status')).toContainText('Zapisano szkic');
    await expect(page.getByLabel('Tytuł lekcji')).toBeEditable();
    await page.reload();
    await expect(tabs).toHaveText(['1. A', '2. C', '3. B']);
    const saved = await service.from('exercises').select('*').eq('lesson_id', lessonId).order('position');
    if (saved.error) throw saved.error;
    expect(saved.data.map(e => e.id)).toEqual([original.data[0]!.id, original.data[2]!.id, b.id]);
    expect(saved.data.map(e => e.position)).toEqual([0, 1, 2]);
    expect(saved.data[2]).toMatchObject({ instructions_markdown: 'Instrukcja B po edycji', starter_code: b.starter_code, runtime_type: b.runtime_type });
    expect((await service.from('student_work').select('code').eq('exercise_id', b.id).eq('student_id', student.data.user.id).single()).data?.code).toBe('# zachowana praca');
    await page.setViewportSize({ width: 390, height: 844 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: 'test-results/exercise-order-mobile.png', fullPage: true });
    await page.getByRole('button', { name: 'Wyślij do zatwierdzenia', exact: true }).click();
    await expect(page.getByText('Do zatwierdzenia', { exact: true })).toBeVisible();
    await expect(earlier).toHaveCount(0);
    await expect(later).toHaveCount(0);
  } finally {
    if (lessonId) await service.from('lessons').delete().eq('id', lessonId);
    for (const id of users.reverse()) await service.auth.admin.deleteUser(id);
  }
});
