alter table public.student_work drop constraint student_work_status_check;
alter table public.student_work add constraint student_work_status_check
  check (status in ('not_started', 'in_progress', 'completed'));
