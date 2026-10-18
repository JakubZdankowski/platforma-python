-- Teachers may manage material access only for their explicitly assigned groups.
create policy "teachers assign modules to own groups"
on public.group_module_assignments for insert to authenticated
with check (private.is_teacher() and private.can_view_class(class_id));
create policy "teachers detach modules from own groups"
on public.group_module_assignments for delete to authenticated
using (private.is_teacher() and private.can_view_class(class_id));

-- Expose a minimal catalogue, not other teachers' groups, students or lesson code.
create function public.group_module_catalog(p_class_id uuid)
returns table(id uuid, title text, "position" integer, lesson_count bigint)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not private.is_current_session() or not private.can_view_class(p_class_id)
    or not (private.is_admin() or private.is_teacher()) then
    raise exception 'Forbidden' using errcode = '42501';
  end if;
  return query select m.id, m.title, m.position, count(ml.lesson_id)
    from public.modules m left join public.module_lessons ml on ml.module_id = m.id
    group by m.id order by m.position, m.id;
end $$;
revoke all on function public.group_module_catalog(uuid) from public, anon;
grant execute on function public.group_module_catalog(uuid) to authenticated;
