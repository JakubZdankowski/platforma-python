import { expect, test, type Page } from '@playwright/test';
import { adminClient, SEED } from '../db/localSupabase';
async function login(page: Page, email: string, password: string, role: string) {
  await page.goto('/login'); await page.getByLabel('Adres e-mail').fill(email); await page.getByLabel('Hasło').fill(password);
  await page.getByRole('button',{name:'Zaloguj się',exact:true}).click(); await expect(page).toHaveURL(new RegExp(`/${role}$`));
}
test('teacher submits Markdown; admin approves and assigns it; student receives exercises', async ({ page, browser }) => {
  const service=adminClient(), suffix=Date.now().toString(36), title=`Lekcja zatwierdzania ${suffix}`;
  const context=await browser.newContext(), studentContext=await browser.newContext();
  let lessonId: string | undefined, moduleId: string | undefined;
  try {
    await login(page,SEED.teacher.email,SEED.teacher.password,'teacher');
    await page.getByRole('link',{name:'Pulpit',exact:true}).click();
    await expect(page.getByRole('button',{name:'Utwórz grupę'})).toHaveCount(0);
    await page.getByRole('link',{name:'Uczniowie',exact:true}).click();
    await expect(page.getByRole('button',{name:'Utwórz konto'})).toHaveCount(0);
    await page.getByRole('link',{name:'Materiały',exact:true}).click();
    await page.getByRole('link',{name:'Nowa lekcja'}).click();
    await page.getByLabel('Tytuł lekcji').fill(title);
    await page.getByLabel('Tytuł ćwiczenia').fill('Powitanie w Markdown');
    await page.getByLabel('Instrukcja Markdown').fill('## Twoje powitanie\n\n**Wypisz swoje imię.**');
    await expect(page.getByRole('region',{name:'Podgląd instrukcji'}).getByRole('heading',{name:'Twoje powitanie'})).toBeVisible();
    await page.getByRole('button',{name:'+ Ćwiczenie',exact:true}).click();
    await page.getByLabel('Tytuł ćwiczenia').fill('Drugie ćwiczenie');
    await page.getByRole('button',{name:'Zapisz szkic',exact:true}).click();
    await expect(page).toHaveURL(/\/teacher\/materials\/[0-9a-f-]+$/);
    lessonId=new URL(page.url()).pathname.split('/').at(-1)!;
    await expect(page.getByLabel('Tytuł lekcji')).toBeEditable();
    await page.getByRole('button',{name:'Wyślij do zatwierdzenia'}).click();
    await expect(page.getByText('Do zatwierdzenia',{exact:true})).toBeVisible();
    await expect(page.getByLabel('Instrukcja Markdown')).not.toBeEditable();
    await page.screenshot({path:'test-results/teacher-material-pending.png',fullPage:true});
    const adminPage=await context.newPage(); await login(adminPage,SEED.admin.email,SEED.admin.password,'admin');
    await adminPage.getByRole('link',{name:'Materiały',exact:true}).click();
    await adminPage.getByRole('link',{name:new RegExp(title)}).click();
    await adminPage.getByRole('button',{name:'Zatwierdź i zapisz'}).click();
    await expect(adminPage.getByText('Zatwierdzony',{exact:true})).toBeVisible();
    await adminPage.getByRole('link',{name:'Moduły i dostęp',exact:true}).click();
    await adminPage.getByLabel('Nazwa modułu').fill(title);
    await adminPage.getByRole('button',{name:'Utwórz moduł'}).click();
    await expect(adminPage).toHaveURL(/\/admin\/modules\/[0-9a-f-]+$/);
    moduleId=new URL(adminPage.url()).pathname.split('/').at(-1)!;
    const lesson=adminPage.getByRole('checkbox',{name:title,exact:true}); await lesson.check(); await expect(lesson).toBeEnabled();
    const group=adminPage.getByRole('checkbox',{name:SEED.className,exact:true}); await group.check(); await expect(group).toBeEnabled();
    const studentPage=await studentContext.newPage(); await studentPage.goto('/join');
    await studentPage.getByLabel('Nazwa użytkownika').fill('ania'); await studentPage.getByLabel('Hasło').fill(SEED.password('ania'));
    await studentPage.getByRole('button',{name:'Zaloguj się',exact:true}).click();
    await studentPage.getByRole('button',{name:title,exact:true}).click();
    await studentPage.getByRole('link',{name:new RegExp(title)}).click();
    await expect(studentPage.getByRole('textbox',{name:'Edytor kodu Python'})).toBeVisible();
    await expect(studentPage.getByRole('heading',{name:'Twoje powitanie'})).toBeVisible();
    await page.reload(); await expect(page.getByText('Zatwierdzony',{exact:true})).toBeVisible();
    await expect(page.getByLabel('Instrukcja Markdown')).not.toBeEditable();
    await page.setViewportSize({width:390,height:844});
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    await page.screenshot({path:'test-results/material-editor-mobile.png',fullPage:true});
  } finally {
    await context.close(); await studentContext.close();
    if (moduleId) await service.from('modules').delete().eq('id',moduleId);
    if (lessonId) await service.from('lessons').delete().eq('id',lessonId);
  }
});

test('admin creates, edits, assigns and deletes a teacher account', async ({ page, browser }) => {
  const service=adminClient(), suffix=Date.now().toString(36), name=`Nowy nauczyciel ${suffix}`, email=`teacher-ui-${suffix}@example.test`;
  const context=await browser.newContext();
  let userId: string | undefined;
  try {
    await login(page,SEED.admin.email,SEED.admin.password,'admin');
    await page.getByRole('link',{name:'Konta',exact:true}).click();
    await page.getByLabel('Rodzaj konta').selectOption('teacher');
    await page.getByLabel('Imię i nazwisko').fill(name); await page.getByLabel('Adres e-mail').fill(email);
    await page.getByRole('button',{name:'Utwórz konto'}).click();
    await expect(page.getByTestId('issued-password')).toBeVisible();
    const password=(await page.getByTestId('issued-password').textContent())!;
    userId=(await service.from('profiles').select('id').eq('display_name',name).single()).data!.id;
    const row=page.getByRole('row',{name:new RegExp(name)});
    await row.getByRole('button',{name:'Edytuj',exact:true}).click();
    await expect(page.getByLabel('Adres e-mail')).toHaveValue(email);
    await page.getByLabel('Imię i nazwisko').fill(`${name} poprawiony`);
    await page.getByLabel('Adres e-mail').fill(`edited-${email}`);
    await page.getByRole('button',{name:'Zapisz konto'}).click();
    await expect(row).toContainText(`edited-${email}`);
    await page.getByRole('link',{name:'Grupy',exact:true}).click(); await page.getByRole('link',{name:SEED.className,exact:true}).click();
    const member=page.getByRole('checkbox',{name:`${name} poprawiony`,exact:true}); await member.check(); await expect(member).toBeEnabled(); await expect(member).toBeChecked();
    const teacherPage=await context.newPage(); await login(teacherPage,`edited-${email}`,password,'teacher');
    await teacherPage.getByRole('link',{name:'Pulpit',exact:true}).click(); await expect(teacherPage.getByRole('link',{name:SEED.className,exact:true})).toBeVisible();
    await page.getByRole('link',{name:'Konta',exact:true}).click(); page.once('dialog',d=>void d.accept());
    await row.getByRole('button',{name:'Usuń',exact:true}).click(); await expect(row).toHaveCount(0);
    expect((await service.from('profiles').select('id').eq('id',userId)).data).toEqual([]);
    await page.setViewportSize({width:390,height:844});
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  } finally { await context.close(); if(userId) await service.auth.admin.deleteUser(userId); }
});
