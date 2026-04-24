alter table public.contact_messages enable row level security;

drop policy if exists contact_messages_insert_anon on public.contact_messages;
create policy contact_messages_insert_anon
  on public.contact_messages
  for insert
  to anon
  with check (user_id is null);

drop policy if exists contact_messages_insert_authenticated on public.contact_messages;
create policy contact_messages_insert_authenticated
  on public.contact_messages
  for insert
  to authenticated
  with check (user_id is null or user_id = auth.uid());
