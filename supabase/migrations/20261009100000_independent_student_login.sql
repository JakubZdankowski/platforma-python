-- Additive rollout: existing class-code login remains available to old clients.
-- Abort on conflicts instead of silently renaming an existing account.
do $$ begin
  if exists (select 1 from public.profiles where role = 'student' group by username having count(*) > 1) then
    raise exception 'Duplicate student usernames: prepare an explicit login migration first';
  end if;
end $$;
create unique index profiles_student_username_key on public.profiles(username) where role = 'student';

create function public.student_login_address(p_username text)
returns text language sql stable security definer set search_path = '' as $$
  select coalesce(
    (select u.email from public.profiles p join auth.users u on u.id = p.id
      where p.role = 'student' and p.username = lower(btrim(coalesce(p_username, '')))),
    'unknown.00000000000000000000000000000000@students.invalid'
  )
$$;
revoke all on function public.student_login_address(text) from public;
grant execute on function public.student_login_address(text) to anon, authenticated;
