-- Enum values must be committed before the following migration uses them.
alter type public.user_role add value if not exists 'admin';
