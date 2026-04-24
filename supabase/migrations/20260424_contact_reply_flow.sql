create extension if not exists pgcrypto;

alter table public.contact_messages
  add column if not exists thread_key uuid;

alter table public.contact_messages
  add column if not exists user_id uuid references auth.users(id) on delete set null;

update public.contact_messages
set thread_key = gen_random_uuid()
where thread_key is null;

alter table public.contact_messages
  alter column thread_key set default gen_random_uuid();

alter table public.contact_messages
  alter column thread_key set not null;

create unique index if not exists contact_messages_thread_key_key
  on public.contact_messages(thread_key);

create index if not exists contact_messages_user_id_created_at_idx
  on public.contact_messages(user_id, created_at desc);

create table if not exists public.contact_message_replies (
  id uuid primary key default gen_random_uuid(),
  thread_key uuid not null references public.contact_messages(thread_key) on delete cascade,
  reply_text text not null,
  reply_channel text not null default 'telegram'
    check (reply_channel in ('telegram', 'gmail', 'site')),
  admin_chat_id text,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists contact_message_replies_thread_key_created_at_idx
  on public.contact_message_replies(thread_key, created_at);

create table if not exists public.telegram_reply_sessions (
  admin_chat_id text primary key,
  thread_key uuid not null references public.contact_messages(thread_key) on delete cascade,
  reply_mode text not null default 'site'
    check (reply_mode in ('site')),
  created_at timestamptz not null default timezone('utc', now()),
  expires_at timestamptz not null default timezone('utc', now()) + interval '15 minutes'
);

alter table public.contact_message_replies enable row level security;
alter table public.telegram_reply_sessions enable row level security;
