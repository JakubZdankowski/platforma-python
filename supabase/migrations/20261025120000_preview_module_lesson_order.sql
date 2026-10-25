-- Resolve each lesson through the first assigned module in curriculum order.
-- LATERAL avoids duplicate exercises when several assignments grant access.
create or replace function public.class_student_exercises(p_class_id uuid)
returns table(student_id uuid, id uuid, title text, lesson_id uuid, lesson_title text, starter_code text, instructions_markdown text)
language sql stable security definer set search_path = '' as $$
  select cm.student_id, e.id, e.title, l.id, l.title, e.starter_code, e.instructions_markdown
  from public.class_members cm
  cross join public.lessons l
  join public.exercises e on e.lesson_id = l.id
  join lateral (
    select m.id as module_id, m.position as module_position, ml.position as lesson_position
    from public.module_lessons ml
    join public.modules m on m.id = ml.module_id
    where ml.lesson_id = l.id and (
      exists (select 1 from public.student_module_assignments a
        where a.module_id = ml.module_id and a.student_id = cm.student_id)
      or exists (select 1 from public.group_module_assignments a
        join public.class_members member on member.class_id = a.class_id
        where a.module_id = ml.module_id and member.student_id = cm.student_id)
    )
    order by m.position, m.id, ml.position
    limit 1
  ) curriculum on true
  where cm.class_id = p_class_id
    and private.is_current_session() and private.can_view_class(p_class_id)
    and l.publication_status = 'approved'
    and not e.is_hidden
  order by cm.student_id, curriculum.module_position, curriculum.module_id,
    curriculum.lesson_position, l.id, e.position, e.slug, e.id
$$;
