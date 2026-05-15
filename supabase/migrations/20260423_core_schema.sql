create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  avatar_url text,
  role text default 'user',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.game_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique,
  coins integer not null default 0 check (coins >= 0),
  selected_character text not null default 'fox'
    check (selected_character in ('fox', 'rabbit', 'robot')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint fk_user_id foreign key (user_id) references public.profiles(id) on delete cascade
);

create table if not exists public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  role text,
  message text not null,
  created_at timestamptz not null default timezone('utc', now())
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

drop trigger if exists game_progress_set_updated_at on public.game_progress;
create trigger game_progress_set_updated_at
  before update on public.game_progress
  for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
security definer
set search_path = public
language plpgsql
as $$
begin
  insert into public.profiles (id, full_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1))
  )
  on conflict (id) do nothing;

  insert into public.game_progress (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.game_progress enable row level security;
alter table public.contact_messages enable row level security;

drop policy if exists profiles_select_all on public.profiles;
create policy profiles_select_all
  on public.profiles
  for select
  to anon, authenticated
  using (true);

drop policy if exists profiles_insert_own on public.profiles;
create policy profiles_insert_own
  on public.profiles
  for insert
  to authenticated
  with check (id = auth.uid());

drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own
  on public.profiles
  for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

drop policy if exists game_progress_select_all on public.game_progress;
create policy game_progress_select_all
  on public.game_progress
  for select
  to anon, authenticated
  using (true);

drop policy if exists game_progress_insert_own on public.game_progress;
create policy game_progress_insert_own
  on public.game_progress
  for insert
  to authenticated
  with check (user_id = auth.uid());

drop policy if exists game_progress_update_own on public.game_progress;
create policy game_progress_update_own
  on public.game_progress
  for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
