-- Private counters shared by all serverless instances. One row per account/API,
-- plus one global row; expired windows are reset in place (no unbounded history).
create table public.ai_request_quotas (
  subject text not null,
  endpoint text not null,
  minute_start timestamptz not null,
  minute_count integer not null,
  day_start timestamptz not null,
  day_count integer not null,
  primary key (subject, endpoint)
);
alter table public.ai_request_quotas enable row level security;
revoke all on public.ai_request_quotas from public, anon, authenticated;

create or replace function public.consume_ai_quota(p_user_id uuid, p_endpoint text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  minute_limit integer;
  day_limit integer;
  current_minute timestamptz := date_trunc('minute', now());
  current_day timestamptz := date_trunc('day', now() at time zone 'UTC') at time zone 'UTC';
  quota_subject text;
  quota_endpoint text;
begin
  if p_user_id is null or not exists (select 1 from auth.users where id = p_user_id) then
    raise exception 'Invalid account' using errcode = '22023';
  end if;
  if p_endpoint is null or p_endpoint not in ('ai-chat', 'ai-evaluate', 'tts') then
    raise exception 'Invalid endpoint' using errcode = '22023';
  end if;

  -- Always lock/update global first. A rejected account update raises and rolls
  -- back the entire RPC, including the global increment. UPSERT locks serialize
  -- concurrent requests, including requests arriving at different API instances.
  for i in 1..2 loop
    if i = 1 then
      quota_subject := 'global'; quota_endpoint := 'all';
      minute_limit := 300; day_limit := 10000;
    else
      quota_subject := p_user_id::text; quota_endpoint := p_endpoint;
      minute_limit := case p_endpoint when 'ai-chat' then 20 when 'ai-evaluate' then 30 else 60 end;
      day_limit := case p_endpoint when 'ai-chat' then 200 when 'ai-evaluate' then 400 else 1000 end;
    end if;
    insert into public.ai_request_quotas as q
      (subject, endpoint, minute_start, minute_count, day_start, day_count)
    values (quota_subject, quota_endpoint, current_minute, 1, current_day, 1)
    on conflict (subject, endpoint) do update set
      minute_start = current_minute,
      minute_count = case when q.minute_start = current_minute then q.minute_count + 1 else 1 end,
      day_start = current_day,
      day_count = case when q.day_start = current_day then q.day_count + 1 else 1 end
    where (q.minute_start <> current_minute or q.minute_count < minute_limit)
      and (q.day_start <> current_day or q.day_count < day_limit);
    if not found then
      raise exception 'AI request quota exceeded' using errcode = 'PT429';
    end if;
  end loop;
  return jsonb_build_object('allowed', true);
end;
$$;
revoke all on function public.consume_ai_quota(uuid, text) from public, anon, authenticated;
grant execute on function public.consume_ai_quota(uuid, text) to service_role;

-- Keep normal profile edits and existing roles intact, including admin profiles.
-- Only a trusted database/service role can assign or change a role. This trigger
-- is SECURITY INVOKER: current_user must be the writer, never the function owner.
create or replace function public.protect_profile_role()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if current_user not in ('postgres', 'service_role', 'supabase_admin') then
    if tg_op = 'INSERT' then
      if new.role is distinct from 'user' then
        raise exception 'Profile role is managed by an administrator' using errcode = '42501';
      end if;
    elsif new.role is distinct from old.role then
      raise exception 'Profile role is managed by an administrator' using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;
revoke all on function public.protect_profile_role() from public, anon, authenticated;
create trigger profiles_protect_role before insert or update on public.profiles
  for each row execute function public.protect_profile_role();
