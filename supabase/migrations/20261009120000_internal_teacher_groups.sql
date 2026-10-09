-- Apply after the module-based frontend is live. Students obtain material
-- access through private helpers; group names and membership are teacher-only.
drop policy "classes: teacher or member reads" on public.classes;
create policy "classes: teacher reads" on public.classes for select to authenticated
  using (teacher_id = (select auth.uid()));
drop policy "class_members: student or class teacher reads" on public.class_members;
create policy "class_members: teacher reads" on public.class_members for select to authenticated
  using ((select private.owns_class(class_id)));
drop policy "assignments: class teacher or member reads" on public.assignments;
create policy "assignments: teacher reads" on public.assignments for select to authenticated
  using ((select private.owns_class(class_id)));
