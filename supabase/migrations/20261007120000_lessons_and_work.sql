-- MVP step A: content is imported by the service role; browsers only assign
-- lessons and save their own work. Solutions never enter this schema.
create table public.lessons (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.profiles(id) on delete cascade,
  slug text not null check (slug ~ '^[a-z0-9][a-z0-9_-]*$'),
  title text not null check (length(btrim(title)) between 1 and 200),
  position integer not null default 0,
  unique (teacher_id, slug)
);
create table public.exercises (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  slug text not null check (slug ~ '^[a-z0-9][a-z0-9_-]*$'),
  title text not null check (length(btrim(title)) between 1 and 200),
  position integer not null default 0,
  instructions_markdown text not null,
  starter_code text not null,
  runtime_type text not null check (runtime_type in ('python-console', 'python-turtle')),
  unique (lesson_id, slug)
);
create table public.assignments (
  class_id uuid not null references public.classes(id) on delete cascade,
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  primary key (class_id, lesson_id)
);
create table public.student_work (
  student_id uuid not null references public.profiles(id) on delete cascade,
  exercise_id uuid not null references public.exercises(id) on delete cascade,
  code text not null,
  status text not null default 'not_started' check (status in ('not_started', 'in_progress')),
  last_edited_at timestamptz not null default now(),
  last_run_at timestamptz,
  last_run_success boolean,
  last_error_type text,
  last_error_summary text,
  primary key (student_id, exercise_id)
);
create index assignments_lesson_idx on public.assignments(lesson_id);
create index student_work_exercise_idx on public.student_work(exercise_id);

create function private.can_read_lesson(p_lesson_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.lessons l where l.id = p_lesson_id
    and (l.teacher_id = (select auth.uid()) or exists (
      select 1 from public.assignments a join public.class_members m on m.class_id = a.class_id
      where a.lesson_id = l.id and m.student_id = (select auth.uid())
    )))
$$;
create function private.can_work_exercise(p_exercise_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.exercises e
    join public.assignments a on a.lesson_id = e.lesson_id
    join public.class_members m on m.class_id = a.class_id
    join public.profiles p on p.id = m.student_id
    where e.id = p_exercise_id and p.id = (select auth.uid()) and p.role = 'student')
$$;
create function private.owns_student(p_student_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.profiles p where p.id = p_student_id
    and p.role = 'student' and p.created_by = (select auth.uid()))
$$;
revoke all on function private.can_read_lesson(uuid), private.can_work_exercise(uuid), private.owns_student(uuid) from public;
grant execute on function private.can_read_lesson(uuid), private.can_work_exercise(uuid), private.owns_student(uuid) to authenticated;

-- Integrity also applies to service-role imports and prevents cross-owner assignments.
create function private.check_lesson_owner()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if not exists (select 1 from public.profiles p where p.id = new.teacher_id and p.role = 'teacher') then
    raise exception 'lesson owner must be a teacher';
  end if;
  return new;
end $$;
create trigger lessons_check before insert or update on public.lessons
  for each row execute function private.check_lesson_owner();
create function private.check_assignment()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if not exists (select 1 from public.classes c join public.lessons l on l.teacher_id = c.teacher_id
    where c.id = new.class_id and l.id = new.lesson_id) then
    raise exception 'class and lesson must belong to the same teacher';
  end if;
  return new;
end $$;
create trigger assignments_check before insert or update on public.assignments
  for each row execute function private.check_assignment();
create function private.check_student_work()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if not exists (select 1 from public.profiles p where p.id = new.student_id and p.role = 'student') then
    raise exception 'work must belong to a student';
  end if;
  if tg_op = 'UPDATE' then
    if new.student_id is distinct from old.student_id or new.exercise_id is distinct from old.exercise_id then
      raise exception 'work identity cannot change';
    end if;
    if new.code is distinct from old.code then new.last_edited_at := now(); end if;
  else
    new.last_edited_at := now();
  end if;
  return new;
end $$;
create trigger student_work_check before insert or update on public.student_work
  for each row execute function private.check_student_work();
revoke all on function private.check_lesson_owner(), private.check_assignment(), private.check_student_work() from public;

alter table public.lessons enable row level security;
alter table public.exercises enable row level security;
alter table public.assignments enable row level security;
alter table public.student_work enable row level security;
revoke all on public.lessons, public.exercises, public.assignments, public.student_work from anon, authenticated;
grant all on public.lessons, public.exercises, public.assignments, public.student_work to service_role;
grant select on public.lessons, public.exercises, public.assignments, public.student_work to authenticated;
grant insert (class_id, lesson_id), delete on public.assignments to authenticated;
grant insert (student_id, exercise_id, code, status, last_run_at, last_run_success, last_error_type, last_error_summary),
  update (code, status, last_run_at, last_run_success, last_error_type, last_error_summary) on public.student_work to authenticated;

create policy "lessons: assigned student or owner reads" on public.lessons for select to authenticated
  using ((select private.can_read_lesson(id)));
create policy "exercises: assigned student or owner reads" on public.exercises for select to authenticated
  using ((select private.can_read_lesson(lesson_id)));
create policy "assignments: class teacher or member reads" on public.assignments for select to authenticated
  using ((select private.owns_class(class_id)) or (select private.is_class_member(class_id)));
create policy "assignments: teacher adds own lesson" on public.assignments for insert to authenticated
  with check ((select private.owns_class(class_id)) and exists (
    select 1 from public.lessons l where l.id = lesson_id and l.teacher_id = (select auth.uid())));
create policy "assignments: teacher removes" on public.assignments for delete to authenticated
  using ((select private.owns_class(class_id)));
create policy "work: own or managed student reads" on public.student_work for select to authenticated
  using (student_id = (select auth.uid()) or (select private.owns_student(student_id)));
create policy "work: student creates own assigned exercise" on public.student_work for insert to authenticated
  with check (student_id = (select auth.uid()) and (select private.can_work_exercise(exercise_id)));
create policy "work: student updates own assigned exercise" on public.student_work for update to authenticated
  using (student_id = (select auth.uid()) and (select private.can_work_exercise(exercise_id)))
  with check (student_id = (select auth.uid()) and (select private.can_work_exercise(exercise_id)));

alter publication supabase_realtime add table public.student_work;
