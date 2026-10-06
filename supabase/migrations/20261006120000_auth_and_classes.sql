-- Milestone 3: teacher and student profiles, classes, class membership,
-- student login without an email address.
--
-- Authorization lives here (RLS, grants, triggers). The browser's idea of
-- the user's role is only used for navigation.

-- ---------------------------------------------------------------------------
-- Private helper schema (not exposed through the Data API)
-- ---------------------------------------------------------------------------

create schema private;
revoke all on schema private from public;
grant usage on schema private to authenticated, service_role;

create type public.user_role as enum ('teacher', 'student');

-- Internal Supabase Auth email of a student. Never shown to anyone.
-- Usernames are unique per teacher, so the teacher id is part of the address.
-- supabase/functions/teacher-students/handler.ts builds the same value and
-- private.handle_new_user() rejects any mismatch.
create function private.student_auth_email(p_teacher_id uuid, p_username text)
returns text
language sql
immutable
set search_path = ''
as $$
  select p_username || '.' || replace(p_teacher_id::text, '-', '') || '@students.invalid'
$$;

-- 8 characters without easily confused letters/digits (no I, O, 0, 1).
create function private.generate_join_code()
returns text
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  bytes bytea;
  code text;
begin
  loop
    bytes := uuid_send(gen_random_uuid());
    code := '';
    for i in 0..7 loop
      code := code || substr(alphabet, (get_byte(bytes, i) % 32) + 1, 1);
    end loop;
    exit when not exists (select 1 from public.classes c where c.join_code = code);
  end loop;
  return code;
end;
$$;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role public.user_role not null,
  display_name text not null,
  -- Students only: login name, unique among the students of one teacher.
  username text,
  -- Students only: the teacher who created (and manages) the account.
  created_by uuid references public.profiles (id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_display_name_valid
    check (char_length(display_name) between 1 and 60 and display_name = btrim(display_name)),
  constraint profiles_username_valid
    check (username is null or username ~ '^[a-z0-9][a-z0-9_-]{1,28}[a-z0-9]$'),
  constraint profiles_role_fields check (
    (role = 'student' and username is not null and created_by is not null)
    or (role = 'teacher' and username is null and created_by is null)
  )
);

create unique index profiles_teacher_username_key on public.profiles (created_by, username);

create table public.classes (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  name text not null,
  join_code text not null default private.generate_join_code(),
  created_at timestamptz not null default now(),
  constraint classes_name_valid check (char_length(name) between 1 and 80 and name = btrim(name)),
  constraint classes_join_code_valid check (join_code ~ '^[A-Z0-9]{4,12}$'),
  constraint classes_join_code_key unique (join_code)
);

create index classes_teacher_id_idx on public.classes (teacher_id);

create table public.class_members (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes (id) on delete cascade,
  student_id uuid not null references public.profiles (id) on delete cascade,
  joined_at timestamptz not null default now(),
  constraint class_members_class_student_key unique (class_id, student_id)
);

create index class_members_student_id_idx on public.class_members (student_id);

-- ---------------------------------------------------------------------------
-- Integrity triggers (apply to every role, including service_role)
-- ---------------------------------------------------------------------------

create function private.check_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.role = 'student' and not exists (
    select 1 from public.profiles p where p.id = new.created_by and p.role = 'teacher'
  ) then
    raise exception 'student profile must be created by a teacher';
  end if;
  if tg_op = 'UPDATE' then
    if new.role is distinct from old.role
      or new.username is distinct from old.username
      or new.created_by is distinct from old.created_by then
      raise exception 'role, username and owner of a profile cannot change';
    end if;
    new.updated_at := now();
  end if;
  return new;
end;
$$;

create trigger profiles_check
  before insert or update on public.profiles
  for each row execute function private.check_profile();

-- A class may only contain students created by the class's teacher.
-- Otherwise one teacher could gain access to another teacher's students.
create function private.check_class_member()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1
    from public.classes c
    join public.profiles p on p.id = new.student_id
    where c.id = new.class_id and p.role = 'student' and p.created_by = c.teacher_id
  ) then
    raise exception 'only students of the class teacher can join the class';
  end if;
  return new;
end;
$$;

create trigger class_members_check
  before insert or update on public.class_members
  for each row execute function private.check_class_member();

-- Profiles are created from app_metadata, which only the service role
-- (Edge Function, seed, admin script) can set. Users without a role get no
-- profile and therefore no access to classroom data.
-- Supabase Auth's admin createUser inserts the user first and writes
-- app_metadata in a follow-up UPDATE, so the trigger also runs on updates.
-- A profile is created once; later metadata changes never alter it.
create function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  meta jsonb := coalesce(new.raw_app_meta_data, '{}'::jsonb);
  owner_id uuid;
begin
  if exists (select 1 from public.profiles p where p.id = new.id) then
    return new;
  end if;
  if meta->>'role' = 'teacher' then
    insert into public.profiles (id, role, display_name)
    values (
      new.id,
      'teacher',
      coalesce(nullif(btrim(meta->>'display_name'), ''), split_part(new.email, '@', 1))
    );
  elsif meta->>'role' = 'student' then
    owner_id := (meta->>'created_by')::uuid;
    if new.email is distinct from private.student_auth_email(owner_id, meta->>'username') then
      raise exception 'unexpected student auth email';
    end if;
    insert into public.profiles (id, role, display_name, username, created_by)
    values (new.id, 'student', meta->>'display_name', meta->>'username', owner_id);
  end if;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert or update of raw_app_meta_data on auth.users
  for each row execute function private.handle_new_user();

-- ---------------------------------------------------------------------------
-- RLS helpers (security definer avoids recursive policy evaluation)
-- ---------------------------------------------------------------------------

create function private.is_teacher()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'teacher'
  )
$$;

create function private.owns_class(p_class_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.classes c where c.id = p_class_id and c.teacher_id = (select auth.uid())
  )
$$;

create function private.is_class_member(p_class_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.class_members m
    where m.class_id = p_class_id and m.student_id = (select auth.uid())
  )
$$;

revoke all on all functions in schema private from public;
grant execute on function
  private.is_teacher(),
  private.owns_class(uuid),
  private.is_class_member(uuid),
  private.generate_join_code()
  to authenticated;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.classes enable row level security;
alter table public.class_members enable row level security;

-- Nobody signed out can read or change classroom data.
revoke all on public.profiles, public.classes, public.class_members from anon, authenticated;
grant all on public.profiles, public.classes, public.class_members to service_role;

-- profiles: read own profile; teachers also read the students they manage.
-- No direct writes from the browser.
grant select on public.profiles to authenticated;

create policy "profiles: read own or managed students"
  on public.profiles for select to authenticated
  using (id = (select auth.uid()) or created_by = (select auth.uid()));

-- classes: teachers manage their own; students read classes they belong to.
-- Only the name is writable; owner and join code come from defaults.
grant select, insert (name), update (name) on public.classes to authenticated;

create policy "classes: teacher or member reads"
  on public.classes for select to authenticated
  using (teacher_id = (select auth.uid()) or (select private.is_class_member(id)));

create policy "classes: teacher creates own"
  on public.classes for insert to authenticated
  with check (teacher_id = (select auth.uid()) and (select private.is_teacher()));

create policy "classes: teacher renames own"
  on public.classes for update to authenticated
  using (teacher_id = (select auth.uid()))
  with check (teacher_id = (select auth.uid()));

-- class_members: students see their own memberships; the class teacher
-- sees, adds and removes members (check_class_member limits who).
grant select, insert (class_id, student_id), delete on public.class_members to authenticated;

create policy "class_members: student or class teacher reads"
  on public.class_members for select to authenticated
  using (student_id = (select auth.uid()) or (select private.owns_class(class_id)));

create policy "class_members: class teacher adds"
  on public.class_members for insert to authenticated
  with check ((select private.owns_class(class_id)));

create policy "class_members: class teacher removes"
  on public.class_members for delete to authenticated
  using ((select private.owns_class(class_id)));

-- ---------------------------------------------------------------------------
-- Student login
-- ---------------------------------------------------------------------------

-- Maps (class code, username) to the internal auth email used with
-- signInWithPassword. Always returns an address, even for an unknown class
-- or username, so the response does not reveal which accounts exist.
-- Password checking and sign-in rate limiting stay in Supabase Auth.
create function public.student_login_email(p_join_code text, p_username text)
returns text
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_username text := lower(btrim(coalesce(p_username, '')));
  v_teacher_id uuid;
begin
  if v_username ~ '^[a-z0-9][a-z0-9_-]{1,28}[a-z0-9]$' then
    select c.teacher_id into v_teacher_id
    from public.classes c
    join public.class_members m on m.class_id = c.id
    join public.profiles p on p.id = m.student_id
    where c.join_code = upper(btrim(coalesce(p_join_code, '')))
      and p.username = v_username
      and p.created_by = c.teacher_id;
  else
    v_username := 'unknown';
  end if;
  return private.student_auth_email(
    coalesce(v_teacher_id, '00000000-0000-0000-0000-000000000000'::uuid),
    v_username
  );
end;
$$;

revoke all on function public.student_login_email(text, text) from public;
grant execute on function public.student_login_email(text, text) to anon, authenticated;

-- Ends all sessions of a user (refresh tokens are removed with the sessions),
-- used after a teacher resets a student's password. Service role only.
-- Access tokens already issued stay valid until they expire (auth.jwt_expiry).
create function public.revoke_user_sessions(p_user_id uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  delete from auth.sessions where user_id = p_user_id
$$;

revoke all on function public.revoke_user_sessions(uuid) from public, anon, authenticated;
grant execute on function public.revoke_user_sessions(uuid) to service_role;
