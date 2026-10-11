-- Read-only local evidence. Run with:
-- pnpm exec supabase db query --local --file docs/phase-5-3-catalog-audit.sql
with api_functions as (
  select p.* from pg_catalog.pg_proc p join pg_catalog.pg_namespace n on n.oid=p.pronamespace where n.nspname='api'
), helpers as (
  select p.* from pg_catalog.pg_proc p join pg_catalog.pg_namespace n on n.oid=p.pronamespace where n.nspname='internal'
), business as (
  select c.*,n.nspname from pg_catalog.pg_class c join pg_catalog.pg_namespace n on n.oid=c.relnamespace
  where n.nspname in ('public','internal') and c.relkind='r'
), sequences as (
  select c.* from pg_catalog.pg_class c join pg_catalog.pg_namespace n on n.oid=c.relnamespace
  where n.nspname in ('public','internal') and c.relkind='S'
), callers as (
  select unnest(array['anon','authenticated','service_role']) as role
), api_owner as (
  select * from pg_catalog.pg_roles where rolname='content_producer_api_owner'
)
select pg_catalog.jsonb_build_object(
  'api_function_count',(select count(*) from api_functions),
  'api_inventory',(select jsonb_agg(jsonb_build_object('name',proname,'owner',pg_catalog.pg_get_userbyid(proowner),
    'security_definer',prosecdef,'settings',proconfig,'authenticated_execute',has_function_privilege('authenticated',oid,'execute')) order by proname) from api_functions),
  'unsafe_api_count',(select count(*) from api_functions where proowner <> 'content_producer_api_owner'::regrole or not prosecdef
    or not coalesce(proconfig @> array['search_path=""'],false)),
  'authenticated_api_execute_count',(select count(*) from api_functions where has_function_privilege('authenticated',oid,'execute')),
  'banned_api_execute_count',(select count(*) from api_functions where has_function_privilege('anon',oid,'execute') or has_function_privilege('service_role',oid,'execute')),
  'public_api_execute_count',(select count(*) from api_functions p cross join lateral aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) a where a.grantee=0 and a.privilege_type='EXECUTE'),
  'caller_helper_execute_count',(select count(*) from helpers p cross join callers c where has_function_privilege(c.role,p.oid,'execute')),
  'public_helper_execute_count',(select count(*) from helpers p cross join lateral aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) a where a.grantee=0 and a.privilege_type='EXECUTE'),
  'caller_table_privilege_count',(select count(*) from business b cross join callers c where has_table_privilege(c.role,b.oid,'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER')),
  'public_table_privilege_count',(select count(*) from business b cross join lateral aclexplode(coalesce(b.relacl,acldefault('r',b.relowner))) a where a.grantee=0),
  'caller_sequence_privilege_count',(select count(*) from sequences s cross join callers c where has_sequence_privilege(c.role,s.oid,'USAGE,SELECT,UPDATE')),
  'public_sequence_privilege_count',(select count(*) from sequences s cross join lateral aclexplode(coalesce(s.relacl,acldefault('S',s.relowner))) a where a.grantee=0),
  'business_table_count',(select count(*) from business),
  'rls_enabled_table_count',(select count(*) from business where relrowsecurity),
  'tables_owned_by_api_owner',(select count(*) from business where relowner='content_producer_api_owner'::regrole),
  'owner_role',(select jsonb_build_object('login',rolcanlogin,'superuser',rolsuper,'bypassrls',rolbypassrls,'inherit',rolinherit,
    'memberships',(select count(*) from pg_auth_members where member=api_owner.oid),
    'api_create',has_schema_privilege(rolname,'api','create'),'internal_create',has_schema_privilege(rolname,'internal','create')) from api_owner),
  'missing_api_owner_select_policy_count',(select count(*) from business b where not exists (
    select 1 from pg_policy p where p.polrelid=b.oid and p.polcmd in ('r','*') and 'content_producer_api_owner'::regrole=any(p.polroles))),
  'unsafe_update_policy_count',(select count(*) from pg_policy p join business b on b.oid=p.polrelid
    where p.polcmd='w' and (p.polqual is null or p.polwithcheck is null)),
  'policy_inventory',(select jsonb_agg(jsonb_build_object('table',b.nspname||'.'||b.relname,'name',p.polname,'command',p.polcmd,
    'roles',(select jsonb_agg(pg_get_userbyid(role)) from unnest(p.polroles) role),
    'using',pg_get_expr(p.polqual,p.polrelid),'with_check',pg_get_expr(p.polwithcheck,p.polrelid)) order by b.relname,p.polname)
    from pg_policy p join business b on b.oid=p.polrelid),
  'unsafe_explicit_default_acl_count',(select count(*) from pg_default_acl d cross join lateral aclexplode(d.defaclacl) a
    where d.defaclrole in ('postgres'::regrole,'content_producer_api_owner'::regrole)
      and (d.defaclnamespace=0 or d.defaclnamespace in (select oid from pg_namespace where nspname in ('public','api','internal')))
      and a.grantee in (0,'anon'::regrole,'authenticated'::regrole,'service_role'::regrole)),
  'leftover_fault_fixture_count',(select count(*) from helpers where proname like 'phase53_fault_%'),
  'uncompleted_ledger_count',(select count(*) from internal.operation_ledger where completed_at is null)
) as audit;
