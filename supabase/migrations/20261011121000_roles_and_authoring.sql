alter table public.profiles drop constraint profiles_role_fields;
alter table public.profiles add constraint profiles_role_fields check (
  (role = 'student' and username is not null and created_by is not null)
  or (role in ('teacher', 'admin') and username is null and created_by is null)
);

create function private.is_admin() returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.profiles where id = auth.uid() and role = 'admin')
$$;
create table public.class_teachers (
  class_id uuid not null references public.classes(id) on delete cascade,
  teacher_id uuid not null references public.profiles(id) on delete cascade,
  primary key(class_id, teacher_id)
);
insert into public.class_teachers select id, teacher_id from public.classes;
alter table public.class_teachers enable row level security;
grant select, insert, delete on public.class_teachers to authenticated;
grant all on public.class_teachers to service_role;
create policy "current account session required" on public.class_teachers as restrictive for all to authenticated
  using (private.is_current_session()) with check (private.is_current_session());
create policy "admin manages teachers" on public.class_teachers for all to authenticated
  using (private.is_admin()) with check (private.is_admin());
create policy "teacher reads assignments" on public.class_teachers for select to authenticated using (teacher_id = auth.uid());
create function private.can_view_class(p_class_id uuid) returns boolean language sql stable security definer set search_path = '' as $$
  select private.is_admin() or exists(select 1 from public.class_teachers where class_id = p_class_id and teacher_id = auth.uid())
$$;
create or replace function private.owns_class(p_class_id uuid) returns boolean language sql stable security definer set search_path = '' as $$
  select private.can_view_class(p_class_id)
$$;
create or replace function private.owns_student(p_student_id uuid) returns boolean language sql stable security definer set search_path = '' as $$
  select private.is_admin() or exists(select 1 from public.class_members m join public.class_teachers t using(class_id)
    where m.student_id = p_student_id and t.teacher_id = auth.uid())
$$;
create or replace function private.check_profile() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.role = 'student' and not exists(select 1 from public.profiles where id = new.created_by and role in ('teacher','admin')) then
    raise exception 'Student creator must be staff';
  end if;
  if tg_op = 'UPDATE' then
    if new.role is distinct from old.role or (new.created_by is distinct from old.created_by and coalesce(auth.role(),'') <> 'service_role') then
      raise exception 'Profile role and creator cannot change';
    end if;
    new.updated_at := now();
  end if;
  return new;
end $$;
create or replace function private.handle_new_user() returns trigger language plpgsql security definer set search_path = '' as $$
declare meta jsonb := coalesce(new.raw_app_meta_data, '{}'::jsonb); owner_id uuid;
begin
  if exists(select 1 from public.profiles where id = new.id) then return new; end if;
  if meta->>'role' in ('teacher','admin') then
    insert into public.profiles(id, role, display_name) values(new.id, (meta->>'role')::public.user_role,
      coalesce(nullif(btrim(meta->>'display_name'),''), split_part(new.email,'@',1)));
  elsif meta->>'role' = 'student' then
    owner_id := (meta->>'created_by')::uuid;
    if new.email is distinct from private.student_auth_email(owner_id, meta->>'username') then raise exception 'Unexpected student auth email'; end if;
    insert into public.profiles(id,role,display_name,username,created_by) values(new.id,'student',meta->>'display_name',meta->>'username',owner_id);
  end if;
  return new;
end $$;
create or replace function private.check_class_member() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if not exists(select 1 from public.profiles where id = new.student_id and role = 'student') then raise exception 'Member must be a student'; end if;
  return new;
end $$;
create function private.check_class_teacher() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if not exists(select 1 from public.profiles where id = new.teacher_id and role = 'teacher') then raise exception 'Assigned account must be a teacher'; end if;
  return new;
end $$;
create trigger check_class_teacher before insert or update on public.class_teachers for each row execute function private.check_class_teacher();

-- Replace every old management policy. Restrictive session policies stay intact.
do $$ declare p record; begin
  for p in select tablename, policyname from pg_policies where schemaname = 'public'
    and tablename in ('profiles','classes','class_members','assignments','modules','module_lessons','group_module_assignments','student_module_assignments')
    and permissive = 'PERMISSIVE' loop
    execute format('drop policy %I on public.%I', p.policyname, p.tablename);
  end loop;
end $$;
create policy "profiles visible to staff" on public.profiles for select to authenticated using(id = auth.uid() or private.is_admin() or (role = 'student' and private.owns_student(id)));
create policy "groups visible to staff" on public.classes for select to authenticated using(private.can_view_class(id));
create policy "members visible to staff" on public.class_members for select to authenticated using(private.can_view_class(class_id));
create policy "legacy assignments visible to staff" on public.assignments for select to authenticated using(private.can_view_class(class_id));
grant delete on public.classes to authenticated;
do $$ declare t text; begin
  foreach t in array array['classes','class_members','assignments','modules','module_lessons','group_module_assignments','student_module_assignments'] loop
    execute format('create policy "admin inserts" on public.%I for insert to authenticated with check (private.is_admin())',t);
    execute format('create policy "admin updates" on public.%I for update to authenticated using (private.is_admin()) with check (private.is_admin())',t);
    execute format('create policy "admin deletes" on public.%I for delete to authenticated using (private.is_admin())',t);
  end loop;
end $$;
create policy "modules visible" on public.modules for select to authenticated using(private.is_admin() or private.has_module_access(id) or exists(
  select 1 from public.group_module_assignments a where a.module_id = modules.id and private.can_view_class(a.class_id)));
create policy "module lessons visible" on public.module_lessons for select to authenticated using(private.is_admin() or private.has_module_access(module_id) or exists(
  select 1 from public.group_module_assignments a where a.module_id = module_lessons.module_id and private.can_view_class(a.class_id)));
create policy "group material access visible" on public.group_module_assignments for select to authenticated using(private.can_view_class(class_id));
create policy "individual material access visible" on public.student_module_assignments for select to authenticated using(private.is_admin() or student_id = auth.uid() or private.owns_student(student_id));

alter table public.lessons add column publication_status text not null default 'approved' check(publication_status in ('draft','pending','approved'));
alter table public.lessons alter column publication_status set default 'draft';
create or replace function private.check_lesson_owner() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if not exists(select 1 from public.profiles where id = new.teacher_id and role in ('teacher','admin')) then raise exception 'Lesson owner must be staff'; end if;
  if tg_op = 'UPDATE' and (new.id <> old.id or (new.teacher_id <> old.teacher_id and coalesce(auth.role(),'') <> 'service_role')) then raise exception 'Lesson identity cannot change'; end if;
  if current_user <> 'service_role' and auth.role() <> 'service_role' and not private.is_admin() then
    if new.teacher_id <> auth.uid() or new.publication_status = 'approved' then raise exception 'Only admin can approve'; end if;
    if tg_op = 'UPDATE' and old.publication_status = 'approved' then raise exception 'Approved lessons are immutable for teachers'; end if;
  end if;
  return new;
end $$;
create or replace function private.can_read_lesson(p_lesson_id uuid) returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.lessons l where l.id = p_lesson_id and
    (private.is_admin() or l.teacher_id = auth.uid() or (l.publication_status = 'approved' and exists(
      select 1 from public.module_lessons ml where ml.lesson_id = l.id and (private.has_module_access(ml.module_id) or exists(
        select 1 from public.group_module_assignments a where a.module_id = ml.module_id and private.can_view_class(a.class_id)))))))
$$;
create or replace function private.can_work_exercise(p_exercise_id uuid) returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.exercises e join public.lessons l on l.id=e.lesson_id join public.module_lessons ml on ml.lesson_id=l.id
    where e.id=p_exercise_id and l.publication_status='approved' and private.has_module_access(ml.module_id)
      and exists(select 1 from public.profiles where id=auth.uid() and role='student'))
$$;
-- Direct owner checks also cover INSERT ... RETURNING before a stable helper
-- can see the newly inserted row in its snapshot.
drop policy "lessons: assigned student or owner reads" on public.lessons;
create policy "lessons visible" on public.lessons for select to authenticated
  using(private.is_admin() or teacher_id=auth.uid() or private.can_read_lesson(id));
create function private.can_edit_lesson(p_lesson_id uuid) returns boolean language sql stable security definer set search_path = '' as $$
  select private.is_admin() or exists(select 1 from public.lessons where id=p_lesson_id and teacher_id=auth.uid() and publication_status='draft' and private.is_teacher())
$$;
grant insert(teacher_id,slug,title,position,publication_status), update(title,position,publication_status) on public.lessons to authenticated;
grant insert(lesson_id,slug,title,position,instructions_markdown,starter_code,runtime_type), update(title,position,instructions_markdown,starter_code,runtime_type) on public.exercises to authenticated;
create policy "staff creates lesson" on public.lessons for insert to authenticated with check(private.is_admin() or (private.is_teacher() and teacher_id=auth.uid() and publication_status='draft'));
create policy "staff edits lesson" on public.lessons for update to authenticated using(private.is_admin() or (private.is_teacher() and teacher_id=auth.uid() and publication_status='draft'))
  with check(private.is_admin() or (teacher_id=auth.uid() and publication_status in ('draft','pending')));
create policy "staff creates exercise" on public.exercises for insert to authenticated with check(private.can_edit_lesson(lesson_id));
create policy "staff edits exercise" on public.exercises for update to authenticated using(private.can_edit_lesson(lesson_id)) with check(private.can_edit_lesson(lesson_id));
-- Content relations no longer depend on which staff account created them.
create or replace function private.check_module_relations() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_table_name='modules' then
    if not exists(select 1 from public.profiles where id=new.teacher_id and role in ('teacher','admin')) then raise exception 'Module owner must be staff'; end if;
    if tg_op='UPDATE' and (new.id<>old.id or (new.teacher_id<>old.teacher_id and coalesce(auth.role(),'') <> 'service_role')) then raise exception 'Module identity cannot change'; end if;
  elsif tg_table_name='module_lessons' then
    if not exists(select 1 from public.lessons where id=new.lesson_id and publication_status='approved') then raise exception 'Only approved lessons can be assigned'; end if;
  elsif tg_table_name='student_module_assignments' then
    if not exists(select 1 from public.profiles where id=new.student_id and role='student') then raise exception 'Recipient must be a student'; end if;
  end if;
  return new;
end $$;
create or replace function private.check_assignment() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if not exists(select 1 from public.lessons where id=new.lesson_id and publication_status='approved') then raise exception 'Only approved lessons can be assigned'; end if;
  return new;
end $$;
revoke all on function private.is_admin(),private.can_view_class(uuid),private.can_edit_lesson(uuid),private.check_class_teacher() from public;
grant execute on function private.is_admin(),private.can_view_class(uuid),private.can_edit_lesson(uuid) to authenticated;

-- Transfer owned content before deleting staff, preserving students and work.
create function public.prepare_account_deletion(p_user_id uuid, p_admin_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not exists(select 1 from public.profiles where id=p_admin_id and role='admin')
    or not exists(select 1 from public.profiles where id=p_user_id and role in ('teacher','student')) then
    raise exception 'Invalid account deletion';
  end if;
  update public.profiles set created_by=p_admin_id where created_by=p_user_id;
  update public.classes set teacher_id=p_admin_id where teacher_id=p_user_id;
  update public.lessons l set teacher_id=p_admin_id, slug=case when exists(select 1 from public.lessons other where other.teacher_id=p_admin_id and other.slug=l.slug) then l.slug || '-' || replace(l.id::text,'-','') else l.slug end where teacher_id=p_user_id;
  update public.modules set teacher_id=p_admin_id where teacher_id=p_user_id;
end $$;
revoke all on function public.prepare_account_deletion(uuid,uuid) from public,anon,authenticated;
grant execute on function public.prepare_account_deletion(uuid,uuid) to service_role;

-- One transaction saves all exercises and the publication transition.
create function public.save_material(p_lesson_id uuid, p_title text, p_exercises jsonb, p_status text)
returns uuid language plpgsql security invoker set search_path = '' as $$
declare lesson_uuid uuid := p_lesson_id; item jsonb; n integer := 0; exercise_uuid uuid; current_status text;
begin
  if not private.is_current_session() or not (private.is_admin() or private.is_teacher()) then raise exception 'Forbidden'; end if;
  if p_status is null or p_status not in ('draft','pending','approved') or (p_status='approved' and not private.is_admin()) then raise exception 'Forbidden status'; end if;
  if length(btrim(p_title)) not between 1 and 200 or coalesce(jsonb_typeof(p_exercises),'') <> 'array' or jsonb_array_length(p_exercises) < 1 then raise exception 'Invalid material'; end if;
  if lesson_uuid is null then
    insert into public.lessons(teacher_id,slug,title,publication_status)
      values(auth.uid(),'lesson-' || replace(gen_random_uuid()::text,'-',''), btrim(p_title),'draft') returning id into lesson_uuid;
  else
    select publication_status into current_status from public.lessons where id=lesson_uuid for update;
    if current_status is null or (not private.is_admin() and (current_status <> 'draft' or not private.can_edit_lesson(lesson_uuid))) then raise exception 'Material is locked'; end if;
    update public.lessons set title=btrim(p_title),publication_status='draft' where id=lesson_uuid;
  end if;
  for item in select value from jsonb_array_elements(p_exercises) loop
    if length(btrim(item->>'title')) not between 1 and 200 or coalesce(length(btrim(item->>'markdown')),0)=0
      or item->>'runtime' not in ('python-console','python-turtle') then raise exception 'Invalid exercise'; end if;
    exercise_uuid := nullif(item->>'id','')::uuid;
    if exercise_uuid is null then
      insert into public.exercises(lesson_id,slug,title,position,instructions_markdown,starter_code,runtime_type)
        values(lesson_uuid,'exercise-' || replace(gen_random_uuid()::text,'-',''),btrim(item->>'title'),n,item->>'markdown',coalesce(item->>'code',''),item->>'runtime');
    else
      update public.exercises set title=btrim(item->>'title'),position=n,instructions_markdown=item->>'markdown',starter_code=coalesce(item->>'code',''),runtime_type=item->>'runtime'
        where id=exercise_uuid and lesson_id=lesson_uuid;
      if not found then raise exception 'Exercise not found'; end if;
    end if;
    n := n + 1;
  end loop;
  update public.lessons set publication_status=p_status where id=lesson_uuid;
  return lesson_uuid;
end $$;
revoke all on function public.save_material(uuid,text,jsonb,text) from public,anon;
grant execute on function public.save_material(uuid,text,jsonb,text) to authenticated;

create function public.admin_account_emails() returns table(id uuid,email text)
language sql stable security definer set search_path = '' as $$
  select u.id,u.email::text from auth.users u join public.profiles p on p.id=u.id
    where private.is_admin() and private.is_current_session() and p.role='teacher'
$$;
revoke all on function public.admin_account_emails() from public,anon;
grant execute on function public.admin_account_emails() to authenticated;

grant execute on function private.generate_join_code() to service_role;
