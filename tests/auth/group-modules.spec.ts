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
        await page.getByRole('link', {name:'Zobacz lekcje'}).click();
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
        await page.getByRole('checkbox', {name:'Moduł testowy',exact:true}).check();
        await expect(page.getByRole('checkbox', {name:'Moduł testowy',exact:true})).toBeEnabled();
        expect((await f.admin.from('group_module_assignments').select('class_id').eq('module_id',f.moduleId)).data).toHaveLength(2);
      }
    } finally {
      if(createdId) await f.admin.from('classes').delete().eq('id',createdId);
      await f.cleanup();
    }
  });
}
