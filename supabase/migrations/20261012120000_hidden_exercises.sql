-- Hide exercises without deleting their content or student work.
alter table public.exercises add column is_hidden boolean not null default false;
grant insert(is_hidden), update(is_hidden) on public.exercises to authenticated;

-- Apply to all student SELECT paths, including embedded lesson queries and direct links.
create policy "hidden exercises unavailable to students" on public.exercises
  as restrictive for select to authenticated
  using (not is_hidden or (select private.is_admin()) or (select private.is_teacher()));

create or replace function private.can_work_exercise(p_exercise_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.exercises e join public.lessons l on l.id=e.lesson_id join public.module_lessons ml on ml.lesson_id=l.id
    where e.id=p_exercise_id and not e.is_hidden and l.publication_status='approved' and private.has_module_access(ml.module_id)
      and exists(select 1 from public.profiles where id=auth.uid() and role='student'))
$$;

create or replace function public.save_material(p_lesson_id uuid, p_title text, p_exercises jsonb, p_status text)
returns uuid language plpgsql security invoker set search_path = '' as $$
declare lesson_uuid uuid := p_lesson_id; item jsonb; n integer := 0; exercise_uuid uuid; current_status text;
begin
  if not private.is_current_session() or not (private.is_admin() or private.is_teacher()) then raise exception 'Forbidden'; end if;
  if p_status is null or p_status not in ('draft','pending','approved') or (p_status='approved' and not private.is_admin()) then raise exception 'Forbidden status'; end if;
  if length(btrim(p_title)) not between 1 and 200 or coalesce(jsonb_typeof(p_exercises),'') <> 'array' then raise exception 'Invalid material'; end if;
  if lesson_uuid is null then
    insert into public.lessons(teacher_id,slug,title,publication_status)
      values(auth.uid(),'lesson-' || replace(gen_random_uuid()::text,'-',''), btrim(p_title),'draft') returning id into lesson_uuid;
  else
    select publication_status into current_status from public.lessons where id=lesson_uuid for update;
    if current_status is null or (not private.is_admin() and (current_status <> 'draft' or not private.can_edit_lesson(lesson_uuid))) then raise exception 'Material is locked'; end if;
    update public.lessons set title=btrim(p_title),publication_status='draft' where id=lesson_uuid;
  end if;
  delete from public.exercises where lesson_id=lesson_uuid and id not in (
    select nullif(value->>'id','')::uuid from jsonb_array_elements(p_exercises) where nullif(value->>'id','') is not null
  );
  for item in select value from jsonb_array_elements(p_exercises) loop
    if length(btrim(item->>'title')) not between 1 and 200 or coalesce(length(btrim(item->>'markdown')),0)=0
      or item->>'runtime' not in ('python-console','python-turtle') then raise exception 'Invalid exercise'; end if;
    exercise_uuid := nullif(item->>'id','')::uuid;
    if exercise_uuid is null then
      insert into public.exercises(lesson_id,slug,title,position,instructions_markdown,starter_code,runtime_type,is_hidden)
        values(lesson_uuid,'exercise-' || replace(gen_random_uuid()::text,'-',''),btrim(item->>'title'),n,item->>'markdown',coalesce(item->>'code',''),item->>'runtime',coalesce((item->>'hidden')::boolean,false));
    else
      update public.exercises set title=btrim(item->>'title'),position=n,instructions_markdown=item->>'markdown',starter_code=coalesce(item->>'code',''),runtime_type=item->>'runtime',is_hidden=coalesce((item->>'hidden')::boolean,is_hidden)
        where id=exercise_uuid and lesson_id=lesson_uuid;
      if not found then raise exception 'Exercise not found'; end if;
    end if;
    n := n + 1;
  end loop;
  update public.lessons set publication_status=p_status where id=lesson_uuid;
  return lesson_uuid;
end $$;


create or replace function public.class_student_exercises(p_class_id uuid)
returns table(student_id uuid, id uuid, title text, lesson_id uuid, lesson_title text, starter_code text, instructions_markdown text)
language sql stable security definer set search_path = '' as $$
  select cm.student_id, e.id, e.title, l.id, l.title, e.starter_code, e.instructions_markdown
  from public.class_members cm
  cross join public.lessons l
  join public.exercises e on e.lesson_id = l.id
  where cm.class_id = p_class_id
    and private.is_current_session() and private.can_view_class(p_class_id)
    and l.publication_status = 'approved'
    and not e.is_hidden
    and exists (
      select 1 from public.module_lessons ml where ml.lesson_id = l.id and (
        exists (select 1 from public.student_module_assignments a
          where a.module_id = ml.module_id and a.student_id = cm.student_id)
        or exists (select 1 from public.group_module_assignments a
          join public.class_members m on m.class_id = a.class_id
          where a.module_id = ml.module_id and m.student_id = cm.student_id)
      )
    )
  order by l.position, l.slug, l.id, e.position, e.slug, e.id
$$;
