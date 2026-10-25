import { expect, test } from '@playwright/test';
import { sessionFixture } from '../db/sessionFixture';

for (const role of ['admin', 'teacher'] as const) {
  test(`${role}: groups have schedules and independent reusable modules`, async ({ page }) => {
    const f = await sessionFixture(role);
    let createdId: string | undefined;
    try {
      await f.admin.from('classes').update({ meeting_day: 2, meeting_time: '17:30' }).eq('id', f.classId);
      await page.goto('/login');
      await page.getByLabel('Adres e-mail').fill(f.teacherEmail);
      await page.getByLabel('Hasło', {exact: true}).fill(f.password);
      await page.getByRole('button', { name: 'Zaloguj się', exact: true }).click();
      await expect(page).toHaveURL(new RegExp(`/${role}$`));
      await page.goto(`/${role}/classes/${f.classId}`);
      await expect(page.getByText('Wtorek, 17:30', {exact: true})).toBeVisible();
      await expect(page.getByRole('heading', {name:'Moduły grupy'})).toBeVisible();
      await expect(page.getByText('Moduł testowy', {exact:true})).toBeVisible();
      await page.screenshot({path:`test-results/${role}-group-modules.png`, fullPage:true});
      if (role === 'teacher') {
        await page.getByRole('link', {name:'Moduł testowy', exact:true}).click();
        await expect(page.getByRole('heading', {name:'Moduł testowy'})).toBeVisible();
        await expect(page.getByRole('link', {name:'Lekcja sesji'})).toBeVisible();
        await expect(page.getByRole('button', {name:'Zapisz moduł'})).toHaveCount(0);
      } else {
        await page.goto('/admin/groups');
        const form = page.locator('#new-group');
        await form.getByLabel('Nazwa grupy').fill('Grupa środowa');
        await form.getByLabel('Dzień tygodnia').selectOption('3');
        await form.getByLabel('Godzina (czas polski)').fill('16:15');
        await form.getByRole('button', {name:'Utwórz grupę',exact:true}).click();
        await expect(page.getByText('Środa, 16:15', {exact:true})).toBeVisible();
        createdId = (await f.admin.from('classes').select('id').eq('name','Grupa środowa').single()).data!.id;
        await page.goto(`/admin/classes/${createdId}`);
        await expect(page.getByText('Nie przypisano jeszcze modułów do tej grupy.')).toBeVisible();
        await page.getByLabel('Dodaj moduł', {exact:true}).selectOption(f.moduleId);
        await page.getByRole('button', {name:'Dodaj do grupy',exact:true}).click();
        await expect(page.getByText('Dodano moduł do grupy.', {exact:true})).toBeVisible();
        expect((await f.admin.from('group_module_assignments').select('class_id').eq('module_id',f.moduleId)).data).toHaveLength(2);
      }
    } finally {
      if(createdId) await f.admin.from('classes').delete().eq('id',createdId);
      await f.cleanup();
    }
  });
}

test('teacher dashboard adds and removes a module with readable mobile layout', async ({page}) => {
  const f = await sessionFixture();
  const other = await sessionFixture();
  try {
    await other.admin.from('modules').update({title:'Drugi moduł'}).eq('id',other.moduleId);
    await page.goto('/login');
    await page.getByLabel('Adres e-mail').fill(f.teacherEmail);
    await page.getByLabel('Hasło', {exact:true}).fill(f.password);
    await page.getByRole('button', {name:'Zaloguj się',exact:true}).click();
    await expect(page).toHaveURL(/\/teacher$/);
    await page.goto(`/teacher/classes/${f.classId}`);
    await page.getByLabel('Dodaj moduł', {exact:true}).selectOption(other.moduleId);
    await page.getByRole('button', {name:'Dodaj do grupy',exact:true}).click();
    await expect(page.getByRole('link', {name:'Drugi moduł'})).toBeVisible();
    await expect(page.getByText('Dodano moduł do grupy.', {exact:true})).toBeVisible();
    await page.screenshot({path:'test-results/teacher-group-dashboard.png',fullPage:true});
    await page.setViewportSize({width:390,height:844});
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    page.once('dialog',dialog=>dialog.accept());
    await page.getByRole('button', {name:'Odepnij ten moduł: Drugi moduł',exact:true}).click();
    await expect(page.getByRole('link', {name:'Drugi moduł'})).toHaveCount(0);
    await expect(page.getByText('Usunięto moduł z grupy.', {exact:true})).toBeVisible();
    expect((await f.admin.from('modules').select('id').eq('id',other.moduleId)).data).toHaveLength(1);
    await page.reload();
    await expect(page.getByRole('link', {name:'Moduł testowy',exact:true})).toBeVisible();
    await expect(page.getByRole('link', {name:'Drugi moduł'})).toHaveCount(0);
  } finally { await f.cleanup(); await other.cleanup(); }
});
