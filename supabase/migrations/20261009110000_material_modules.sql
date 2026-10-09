create table public.modules (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  title text not null check (length(btrim(title)) between 1 and 200),
  position integer not null default 0,
  legacy_class_id uuid unique references public.classes(id) on delete set null
);
create table public.module_lessons (
  module_id uuid not null references public.modules(id) on delete cascade,
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  position integer not null default 0,
  primary key(module_id, lesson_id)
);
create table public.group_module_assignments (
  class_id uuid not null references public.classes(id) on delete cascade,
  module_id uuid not null references public.modules(id) on delete cascade,
  primary key(class_id, module_id)
);
create table public.student_module_assignments (
  student_id uuid not null references public.profiles(id) on delete cascade,
  module_id uuid not null references public.modules(id) on delete cascade,
  primary key(student_id, module_id)
);
create index modules_teacher_idx on public.modules(teacher_id);
create index module_lessons_lesson_idx on public.module_lessons(lesson_id);
create index group_modules_module_idx on public.group_module_assignments(module_id);
create index student_modules_module_idx on public.student_module_assignments(module_id);

create function private.owns_module(p_module_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.modules where id = p_module_id and teacher_id = (select auth.uid()))
$$;
create function private.has_module_access(p_module_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.student_module_assignments where module_id = p_module_id and student_id = (select auth.uid()))
    or exists(select 1 from public.group_module_assignments a join public.class_members m on m.class_id = a.class_id
      where a.module_id = p_module_id and m.student_id = (select auth.uid()))
$$;
revoke all on function private.owns_module(uuid), private.has_module_access(uuid) from public;
grant execute on function private.owns_module(uuid), private.has_module_access(uuid) to authenticated;

create function private.check_module_relations()
returns trigger language plpgsql security definer set search_path = '' as $$
declare owner_id uuid;
begin
  if tg_table_name = 'modules' then
    if not exists(select 1 from public.profiles where id = new.teacher_id and role = 'teacher') then raise exception 'Module owner must be a teacher'; end if;
    if tg_op = 'UPDATE' and (new.id <> old.id or new.teacher_id <> old.teacher_id) then raise exception 'Module identity cannot change'; end if;
    return new;
  end if;
  select teacher_id into owner_id from public.modules where id = new.module_id;
  if tg_table_name = 'module_lessons' then
    if not exists(select 1 from public.lessons where id = new.lesson_id and teacher_id = owner_id) then raise exception 'Lesson and module must have the same owner'; end if;
  elsif tg_table_name = 'group_module_assignments' then
    if not exists(select 1 from public.classes where id = new.class_id and teacher_id = owner_id) then raise exception 'Group and module must have the same owner'; end if;
  else
    if not exists(select 1 from public.profiles where id = new.student_id and role = 'student' and created_by = owner_id) then raise exception 'Student and module must have the same owner'; end if;
  end if;
  return new;
end $$;
revoke all on function private.check_module_relations() from public;

do $$ declare t text; begin
  foreach t in array array['modules','module_lessons','group_module_assignments','student_module_assignments'] loop
    execute format('create trigger check_module_relations before insert or update on public.%I for each row execute function private.check_module_relations()', t);
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon, authenticated', t);
    execute format('grant all on public.%I to service_role', t);
    execute format('grant select, delete on public.%I to authenticated', t);
    execute format('create policy "current account session required" on public.%I as restrictive for all to authenticated using ((select private.is_current_session())) with check ((select private.is_current_session()))', t);
  end loop;
end $$;
grant insert(title, position), update(title, position) on public.modules to authenticated;
grant insert(module_id, lesson_id, position), update(position) on public.module_lessons to authenticated;
grant insert(class_id, module_id) on public.group_module_assignments to authenticated;
grant insert(student_id, module_id) on public.student_module_assignments to authenticated;

create policy "modules read" on public.modules for select to authenticated using (teacher_id = (select auth.uid()) or private.has_module_access(id));
create policy "modules create" on public.modules for insert to authenticated with check (teacher_id = (select auth.uid()) and private.is_teacher());
create policy "modules update" on public.modules for update to authenticated using (teacher_id = (select auth.uid())) with check (teacher_id = (select auth.uid()));
create policy "modules delete" on public.modules for delete to authenticated using (teacher_id = (select auth.uid()));
create policy "module lessons read" on public.module_lessons for select to authenticated using (private.owns_module(module_id) or private.has_module_access(module_id));
create policy "module lessons create" on public.module_lessons for insert to authenticated with check (private.owns_module(module_id));
create policy "module lessons update" on public.module_lessons for update to authenticated using (private.owns_module(module_id)) with check (private.owns_module(module_id));
create policy "module lessons delete" on public.module_lessons for delete to authenticated using (private.owns_module(module_id));
create policy "group modules read" on public.group_module_assignments for select to authenticated using (private.owns_module(module_id));
create policy "group modules create" on public.group_module_assignments for insert to authenticated with check (private.owns_module(module_id) and private.owns_class(class_id));
create policy "group modules delete" on public.group_module_assignments for delete to authenticated using (private.owns_module(module_id));
create policy "student modules read" on public.student_module_assignments for select to authenticated using (private.owns_module(module_id) or student_id = (select auth.uid()));
create policy "student modules create" on public.student_module_assignments for insert to authenticated with check (private.owns_module(module_id) and private.owns_student(student_id));
create policy "student modules delete" on public.student_module_assignments for delete to authenticated using (private.owns_module(module_id));

-- One module per pre-existing class. Membership, content IDs, and work are untouched.
insert into public.modules(id, teacher_id, title, position, legacy_class_id)
  select id, teacher_id, name, row_number() over(partition by teacher_id order by created_at, id)::integer - 1, id from public.classes;
insert into public.module_lessons(module_id, lesson_id, position)
  select a.class_id, a.lesson_id, l.position from public.assignments a join public.lessons l on l.id = a.lesson_id;
insert into public.group_module_assignments(class_id, module_id) select id, id from public.classes;

-- During rollout old teacher clients can still assign/unassign lessons.
-- Legacy assignments never bypass module access: the access helpers below use only modules.
create function private.bridge_legacy_assignment()
returns trigger language plpgsql security definer set search_path = '' as $$
declare module_uuid uuid;
begin
  if tg_op = 'DELETE' then
    delete from public.module_lessons ml using public.modules m
      where ml.module_id = m.id and m.legacy_class_id = old.class_id and ml.lesson_id = old.lesson_id;
    return old;
  end if;
  insert into public.modules(teacher_id, title, legacy_class_id)
    select teacher_id, name, id from public.classes where id = new.class_id
    on conflict(legacy_class_id) do nothing;
  select id into module_uuid from public.modules where legacy_class_id = new.class_id;
  insert into public.module_lessons(module_id, lesson_id, position)
    select module_uuid, id, position from public.lessons where id = new.lesson_id on conflict do nothing;
  insert into public.group_module_assignments(class_id, module_id) values(new.class_id, module_uuid) on conflict do nothing;
  return new;
end $$;
revoke all on function private.bridge_legacy_assignment() from public;
create trigger bridge_legacy_assignment after insert or delete on public.assignments for each row execute function private.bridge_legacy_assignment();

create or replace function private.can_read_lesson(p_lesson_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.lessons l where l.id = p_lesson_id and
    (l.teacher_id = (select auth.uid()) or exists(select 1 from public.module_lessons ml where ml.lesson_id = l.id and private.has_module_access(ml.module_id))))
$$;
create or replace function private.can_work_exercise(p_exercise_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.exercises e join public.module_lessons ml on ml.lesson_id = e.lesson_id
    where e.id = p_exercise_id and private.has_module_access(ml.module_id)
    and exists(select 1 from public.profiles where id = (select auth.uid()) and role = 'student'))
$$;
