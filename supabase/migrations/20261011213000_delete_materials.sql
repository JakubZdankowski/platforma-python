grant delete on public.lessons, public.exercises to authenticated;
create policy "staff deletes lesson" on public.lessons for delete to authenticated using (private.can_edit_lesson(id));
create policy "staff deletes exercise" on public.exercises for delete to authenticated using (private.can_edit_lesson(lesson_id));
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

