alter table public.profiles
  drop constraint if exists profiles_role_check;

alter table public.profiles
  add constraint profiles_role_check
  check (
    role is null
    or role in ('user', 'student', 'teacher', 'parent', 'admin')
  )
  not valid;
