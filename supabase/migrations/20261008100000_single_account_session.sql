-- One winning session per account. Keep a tombstone after logout so an older
-- token cannot reclaim an account when the newer session disappears.
create table private.active_sessions (
  user_id uuid primary key references auth.users(id) on delete cascade,
  session_id uuid not null,
  created_at timestamptz not null
);
revoke all on private.active_sessions from public, anon, authenticated;
insert into private.active_sessions (user_id, session_id, created_at)
select distinct on (user_id) user_id, id, created_at from auth.sessions
order by user_id, created_at desc, id desc;

create function private.is_current_session()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from private.active_sessions a join auth.sessions s
      on s.id = a.session_id and s.user_id = a.user_id
    where a.user_id = (select auth.uid())
      and a.session_id::text = (select auth.jwt()->>'session_id')
  )
$$;
revoke all on function private.is_current_session() from public;
grant execute on function private.is_current_session() to authenticated;

create function public.is_current_session()
returns boolean language sql stable security definer set search_path = '' as $$
  select private.is_current_session()
$$;
revoke all on function public.is_current_session() from public, anon;
grant execute on function public.is_current_session() to authenticated;

create function public.claim_account_session()
returns boolean language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := auth.uid();
  v_session uuid := nullif(auth.jwt()->>'session_id', '')::uuid;
  v_created timestamptz;
  v_latest uuid;
begin
  if v_user is null or v_session is null then return false; end if;
  -- Serialize claims for this user; callers can only claim their signed JWT's
  -- session. Token refresh keeps the same session id and cannot steal it back.
  perform pg_advisory_xact_lock(hashtextextended(v_user::text, 0));
  select id into v_latest from auth.sessions where user_id = v_user
    order by created_at desc, id desc limit 1;
  if v_latest is distinct from v_session then return false; end if;
  select created_at into v_created from auth.sessions where id = v_session and user_id = v_user;
  if v_created is null then return false; end if;
  if exists (select 1 from private.active_sessions a where a.user_id = v_user
    and (a.created_at, a.session_id) > (v_created, v_session)) then return false; end if;
  insert into private.active_sessions (user_id, session_id, created_at)
    values (v_user, v_session, v_created)
    on conflict (user_id) do update set session_id = excluded.session_id, created_at = excluded.created_at;
  -- Cascading deletion removes old refresh tokens too.
  delete from auth.sessions where user_id = v_user and (created_at, id) < (v_created, v_session);
  return true;
end $$;
revoke all on function public.claim_account_session() from public, anon;
grant execute on function public.claim_account_session() to authenticated;

-- Restrictive policies compose with the existing ownership/assignment rules.
do $$
declare v_table text;
begin
  foreach v_table in array array['profiles','classes','class_members','lessons','exercises','assignments','student_work'] loop
    execute format('create policy "current account session required" on public.%I as restrictive for all to authenticated using ((select private.is_current_session())) with check ((select private.is_current_session()))', v_table);
  end loop;
end $$;
