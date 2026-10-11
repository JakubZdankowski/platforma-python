-- Resolve the student's access, including individual assignments and other groups.
-- Staff may inspect only students in a group they can view, in an active session.
create function public.class_student_exercises(p_class_id uuid)
returns table(student_id uuid, id uuid, title text, lesson_id uuid, lesson_title text, starter_code text, instructions_markdown text)
language sql stable security definer set search_path = '' as $$
  select cm.student_id, e.id, e.title, l.id, l.title, e.starter_code, e.instructions_markdown
  from public.class_members cm
  cross join public.lessons l
  join public.exercises e on e.lesson_id = l.id
  where cm.class_id = p_class_id
    and private.is_current_session() and private.can_view_class(p_class_id)
    and l.publication_status = 'approved'
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
revoke all on function public.class_student_exercises(uuid) from public, anon;
grant execute on function public.class_student_exercises(uuid) to authenticated;
