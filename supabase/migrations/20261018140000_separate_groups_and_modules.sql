-- Groups organize people and their weekly meeting; modules organize reusable content.
-- Preserve all historical modules, links, memberships and student work.
alter table public.classes
  add column meeting_day smallint,
  add column meeting_time time without time zone,
  add constraint classes_meeting_pair check (
    (meeting_day is null and meeting_time is null) or
    (meeting_day is not null and meeting_time is not null and meeting_day between 1 and 7
      and extract(second from meeting_time) = 0)
  );
grant insert(meeting_day, meeting_time), update(meeting_day, meeting_time) on public.classes to authenticated;

-- Retire the rollout bridge: assigning a lesson must no longer manufacture a module
-- from a group or synchronize two independent concepts.
drop trigger bridge_legacy_assignment on public.assignments;
drop function private.bridge_legacy_assignment();
revoke insert, update, delete on public.assignments from authenticated;
comment on table public.assignments is 'Historical direct lesson assignments; material access uses modules and group_module_assignments.';
comment on column public.modules.legacy_class_id is 'Historical migration provenance only. Does not couple module identity, name or lifecycle to a group.';
comment on column public.classes.meeting_day is 'ISO weekday 1 (Monday) through 7 (Sunday); weekly meeting in Europe/Warsaw.';
comment on column public.classes.meeting_time is 'Weekly local meeting time in Europe/Warsaw, minute precision.';
