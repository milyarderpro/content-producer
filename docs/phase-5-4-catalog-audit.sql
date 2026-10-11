-- Read-only, token-free local Batch A evidence. Never project token columns.
-- pnpm exec supabase db query --local --file docs/phase-5-4-catalog-audit.sql
with expected as (
  select unnest(array['get_account_profile','get_workspace_context','list_pages',
    'get_page_generation_context','list_content_plans','get_content_plan','list_posts',
    'get_post','get_post_performance','get_performance_insights','create_page',
    'update_page','create_content_plan','claim_content_plan_items','renew_content_plan_claim',
    'report_content_plan_item_failure','retry_content_plan_item','replace_discarded_plan_item',
    'cancel_content_plan']) name
), api_functions as (
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
  select unnest(array['anon','authenticated','service_role']) role
), api_owner as (
  select * from pg_catalog.pg_roles where rolname='content_producer_api_owner'
)
select pg_catalog.jsonb_build_object(
  'api_function_count',(select count(*) from api_functions),
  'allowlist_difference_count',(select count(*) from (
    (select proname::text from api_functions except select name from expected)
    union all (select name from expected except select proname::text from api_functions)) differences),
  'overloaded_api_count',(select count(*) from (select proname from api_functions group by proname having count(*)<>1) overloaded),
  'api_inventory',(select jsonb_agg(jsonb_build_object('name',proname,'signature',oid::regprocedure::text,
    'owner',pg_catalog.pg_get_userbyid(proowner),'security_definer',prosecdef,'settings',proconfig,
    'authenticated_execute',has_function_privilege('authenticated',oid,'execute')) order by proname) from api_functions),
  'unsafe_api_count',(select count(*) from api_functions where proowner<>'content_producer_api_owner'::regrole or not prosecdef
    or not coalesce(proconfig @> array['search_path=""'],false)),
  'authenticated_api_execute_count',(select count(*) from api_functions where has_function_privilege('authenticated',oid,'execute')),
  'banned_api_execute_count',(select count(*) from api_functions p cross join callers c where c.role<>'authenticated' and has_function_privilege(c.role,p.oid,'execute')),
  'public_api_execute_count',(select count(*) from api_functions p cross join lateral aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) a where a.grantee=0 and a.privilege_type='EXECUTE'),
  'caller_helper_execute_count',(select count(*) from helpers p cross join callers c where has_function_privilege(c.role,p.oid,'execute')),
  'public_helper_execute_count',(select count(*) from helpers p cross join lateral aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) a where a.grantee=0 and a.privilege_type='EXECUTE'),
  'caller_table_privilege_count',(select count(*) from business b cross join callers c where has_table_privilege(c.role,b.oid,'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER')),
  'caller_column_privilege_count',(select count(*) from business b cross join callers c where has_any_column_privilege(c.role,b.oid,'SELECT,INSERT,UPDATE,REFERENCES')),
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
  'event_app_privileges',jsonb_build_object(
    'select',has_table_privilege('content_producer_api_owner','internal.content_plan_item_events','SELECT'),
    'insert',has_table_privilege('content_producer_api_owner','internal.content_plan_item_events','INSERT'),
    'update',has_table_privilege('content_producer_api_owner','internal.content_plan_item_events','UPDATE'),
    'delete',has_table_privilege('content_producer_api_owner','internal.content_plan_item_events','DELETE'),
    'post_id_lock_privilege',has_column_privilege('content_producer_api_owner','public.posts','id','UPDATE'),
    'post_status_write',has_column_privilege('content_producer_api_owner','public.posts','status','UPDATE')),
  'ledger_token_key_count',(select count(*) from internal.operation_ledger where response_snapshot::text ~ '"(claim_token|reservation_token|access_token|refresh_token)"[[:space:]]*:'),
  'ledger_claim_token_value_count',(select count(*) from internal.operation_ledger l join internal.content_plan_item_events e on e.operation_id=l.id
    where e.claim_token is not null and l.response_snapshot::text like '%'||e.claim_token::text||'%'),
  'leftover_fault_fixture_count',(select count(*) from helpers where proname like 'phase54_fault_%'),
  'uncompleted_ledger_count',(select count(*) from internal.operation_ledger where completed_at is null),
  'phase_5_6_rpc_count',(select count(*) from api_functions where proname in ('save_post','revise_post','reschedule_post')),
  'deferred_public_rpc_evidence',jsonb_build_object(
    'save_versus_cancel','DEFERRED — NOT PASSED; checkpoint 5.6',
    'opposite_direction_reschedule','DEFERRED — NOT PASSED; checkpoint 5.6')
) as audit;
