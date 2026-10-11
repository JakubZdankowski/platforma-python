import { expect, test } from '@playwright/test';
import { adminClient, SEED } from '../db/localSupabase';

let groupId: string, lessonId: string, moduleId: string, exerciseId: string, teacherId: string;
const teacherEmail = `ui-audit-${Date.now()}@example.test`;
const teacherPassword = 'ui-audit-test-password';
const title = 'Audyt UI: bardzo długa nazwa materiału o zmiennych, obliczeniach i programowaniu w Pythonie';

test.beforeAll(async () => {
  const service = adminClient();
  const teacher = await service.auth.admin.createUser({ email: teacherEmail, password: teacherPassword, email_confirm: true, app_metadata: { role: 'teacher', display_name: 'Nauczyciel audytu UI' } });
  if (teacher.error) throw teacher.error;
  teacherId = teacher.data.user.id;
  const student = await service.from('profiles').select('id').eq('username', 'ania').single();
  if (student.error) throw student.error;
  const group = await service.from('classes').insert({ teacher_id: teacherId, name: title.slice(0, 80) }).select('id').single();
  if (group.error) throw group.error;
  groupId = group.data.id;
  const lesson = await service.from('lessons').insert({ teacher_id: teacherId, title, publication_status: 'approved', slug: `ui-audit-${Date.now()}` }).select('id').single();
  if (lesson.error) throw lesson.error;
  lessonId = lesson.data.id;
  const exercise = await service.from('exercises').insert({ lesson_id: lessonId, title, slug: 'ui-audit', starter_code: 'print("Cześć!")', instructions_markdown: '## Pierwszy program\n\nNapisz powitanie.\n\n- Użyj funkcji `print`.\n- Uruchom kod.', runtime_type: 'python-console' }).select('id').single();
  if (exercise.error) throw exercise.error;
  exerciseId = exercise.data.id;
  const module = await service.from('modules').insert({ title, teacher_id: teacherId }).select('id').single();
  if (module.error) throw module.error;
  moduleId = module.data.id;
  const results = await Promise.all([
    service.from('class_teachers').insert({ class_id: groupId, teacher_id: teacherId }),
    service.from('class_members').insert({ class_id: groupId, student_id: student.data.id }),
    service.from('module_lessons').insert({ module_id: moduleId, lesson_id: lessonId }),
    service.from('group_module_assignments').insert({ module_id: moduleId, class_id: groupId }),
    service.from('student_work').insert({ student_id: student.data.id, exercise_id: exerciseId, code: 'print("Cześć!")', status: 'in_progress' }),
  ]);
  for (const result of results) if (result.error) throw result.error;

});

test.afterAll(async () => {
  const service = adminClient();
  if (moduleId) await service.from('modules').delete().eq('id', moduleId);
  if (lessonId) await service.from('lessons').delete().eq('id', lessonId);
  if (groupId) await service.from('classes').delete().eq('id', groupId);
  if (teacherId) await service.auth.admin.deleteUser(teacherId);
});

for (const role of ['student', 'teacher', 'admin'] as const) {
  test(`all ${role} screens reflow with long titles`, async ({ page }) => {
    test.setTimeout(180_000);
    await page.goto(role === 'student' ? '/join' : '/login');
    await page.getByLabel(role === 'student' ? 'Nazwa użytkownika' : 'Adres e-mail').fill(role === 'student' ? 'ania' : role === 'teacher' ? teacherEmail : SEED.admin.email);
    await page.getByLabel('Hasło').fill(role === 'student' ? SEED.password('ania') : role === 'teacher' ? teacherPassword : SEED.admin.password);
    await page.getByRole('button', { name: 'Zaloguj się', exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`/${role}$`));
    const base = `/${role}`;
    const routes = role === 'student'
      ? [base, `${base}/materials?module=${moduleId}`, `${base}/help`, `${base}/exercises/${exerciseId}`]
      : [base, `${base}/groups`, `${base}/students`, `${base}/materials`, `${base}/materials/new`, `${base}/materials/${lessonId}`, `${base}/classes/${groupId}`, `${base}/classes/${groupId}/live`, ...(role === 'admin' ? [`${base}/modules`, `${base}/modules/${moduleId}`] : [])];
    for (const width of [390, 768, 1280, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      for (let index = 0; index < routes.length; index++) {
        await page.goto(routes[index]!);
        await expect(page.locator('main')).toBeVisible();
        await expect(page.locator('main h1')).toBeVisible();
        await expect(page.locator('main').getByText(/^(Wczytywanie|Ładowanie)/)).toHaveCount(0);
        await expect(page.locator('main [role="alert"]')).toHaveCount(0);
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${role} ${routes[index]} at ${width}px`).toBe(true);
        if (routes[index]!.endsWith('/live')) {
          const student = page.getByRole('button', { name: /Podgląd:/ }).first();
          await student.click();
          await expect(page.getByRole('textbox', { name: 'Kod Python ucznia (tylko do odczytu)' })).toBeVisible();
        }
        await page.screenshot({ path: `test-results/ui-audit/${role}-${index}-${width}.png`, fullPage: true });
      }
    }
  });
}
