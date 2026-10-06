-- Development seed (Milestone 3). DEVELOPMENT PASSWORDS ONLY.
--
--   Teacher:  teacher@example.test / teacher-dev-password
--   Class:    Python 101, code PYTHON25
--   Students: ania / ania-dev-pass, kuba / kuba-dev-pass, ola / ola-dev-pass
--
-- Lessons and exercises from the spec's seed arrive with Milestone 4.
-- Profiles are created by the on_auth_user_created trigger from app_metadata.

create function pg_temp.seed_user(p_id uuid, p_email text, p_password text, p_app_meta jsonb)
returns void
language sql
as $$
  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, recovery_token, email_change_token_new, email_change,
    email_change_token_current, phone_change, phone_change_token, reauthentication_token
  ) values (
    '00000000-0000-0000-0000-000000000000', p_id, 'authenticated', 'authenticated', p_email,
    extensions.crypt(p_password, extensions.gen_salt('bf')), now(),
    '{"provider": "email", "providers": ["email"]}'::jsonb || p_app_meta, '{}'::jsonb, now(), now(),
    '', '', '', '', '', '', '', ''
  );
  insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  values (
    gen_random_uuid(), p_id, p_id::text,
    jsonb_build_object('sub', p_id::text, 'email', p_email, 'email_verified', true),
    'email', now(), now(), now()
  );
$$;

select pg_temp.seed_user(
  'a0000000-0000-4000-8000-000000000001', 'teacher@example.test', 'teacher-dev-password',
  '{"role": "teacher", "display_name": "Nauczyciel"}'
);

select pg_temp.seed_user(
  s.id,
  private.student_auth_email('a0000000-0000-4000-8000-000000000001', s.username),
  s.username || '-dev-pass',
  jsonb_build_object(
    'role', 'student',
    'username', s.username,
    'display_name', s.display_name,
    'created_by', 'a0000000-0000-4000-8000-000000000001'
  )
)
from (values
  ('b0000000-0000-4000-8000-000000000001'::uuid, 'ania', 'Ania'),
  ('b0000000-0000-4000-8000-000000000002'::uuid, 'kuba', 'Kuba'),
  ('b0000000-0000-4000-8000-000000000003'::uuid, 'ola', 'Ola')
) as s (id, username, display_name);

insert into public.classes (id, teacher_id, name, join_code)
values ('c0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', 'Python 101', 'PYTHON25');

insert into public.class_members (class_id, student_id)
select 'c0000000-0000-4000-8000-000000000001', p.id
from public.profiles p
where p.role = 'student';
