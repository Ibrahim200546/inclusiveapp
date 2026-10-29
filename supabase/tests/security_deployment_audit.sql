-- Read-only deployment evidence. Does not read secret values or profile data.
begin transaction read only;

select schemaname, tablename, policyname, roles, cmd, qual, with_check
from pg_policies
where schemaname = 'public' and tablename in ('profiles', 'ai_request_quotas')
order by tablename, policyname;

select grantee, table_name, privilege_type
from information_schema.table_privileges
where table_schema = 'public' and table_name in ('profiles', 'ai_request_quotas')
order by table_name, grantee, privilege_type;

select grantee, column_name, privilege_type
from information_schema.column_privileges
where table_schema = 'public' and table_name = 'profiles'
order by grantee, column_name, privilege_type;

select t.tgname, t.tgenabled, n.nspname, p.proname, p.prosecdef, p.proconfig
from pg_trigger t
join pg_proc p on p.oid = t.tgfoid
join pg_namespace n on n.oid = p.pronamespace
where t.tgrelid = 'public.profiles'::regclass and not t.tgisinternal;

select n.nspname, p.proname, p.prosecdef, p.proconfig, p.proacl
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and (p.prosecdef or p.proname in ('consume_ai_quota', 'protect_profile_role'))
order by p.proname;

rollback;
