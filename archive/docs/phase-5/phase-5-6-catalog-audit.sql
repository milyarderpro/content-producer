-- Read-only, token-free local checkpoint evidence.
-- pnpm exec supabase db query --local --file docs/phase-5-6-catalog-audit.sql
with expected as (
  select unnest(array['get_account_profile','get_workspace_context','list_pages','get_page_generation_context',
    'list_content_plans','get_content_plan','list_posts','get_post','get_post_performance','get_performance_insights',
    'create_page','update_page','create_content_plan','claim_content_plan_items','renew_content_plan_claim',
    'report_content_plan_item_failure','retry_content_plan_item','replace_discarded_plan_item','cancel_content_plan',
    'trivia_find_similar_facts','trivia_register_and_reserve_facts','trivia_release_facts','trivia_reverify_fact','trivia_correct_fact',
    'save_post','revise_post','reschedule_post']) name
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
), callers as (select unnest(array['anon','authenticated','service_role']) role)
select pg_catalog.jsonb_build_object(
  'api_function_count',(select count(*) from api_functions),
  'allowlist_difference_count',(select count(*) from (
    (select proname::text from api_functions except select name from expected)
    union all (select name from expected except select proname::text from api_functions)) differences),
  'overloaded_api_count',(select count(*) from (select proname from api_functions group by proname having count(*)<>1) overloaded),
  'api_inventory',(select jsonb_agg(jsonb_build_object('name',proname,'signature',oid::regprocedure::text,
    'owner',pg_get_userbyid(proowner),'security_definer',prosecdef,'settings',proconfig) order by proname) from api_functions),
  'unsafe_api_count',(select count(*) from api_functions where proowner<>'content_producer_api_owner'::regrole or not prosecdef or not coalesce(proconfig @> array['search_path=""'],false)),
  'authenticated_api_execute_count',(select count(*) from api_functions where has_function_privilege('authenticated',oid,'execute')),
  'banned_api_execute_count',(select count(*) from api_functions p cross join callers c where c.role<>'authenticated' and has_function_privilege(c.role,p.oid,'execute')),
  'public_api_execute_count',(select count(*) from api_functions p cross join lateral aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) a where a.grantee=0),
  'caller_helper_execute_count',(select count(*) from helpers p cross join callers c where has_function_privilege(c.role,p.oid,'execute')),
  'public_helper_execute_count',(select count(*) from helpers p cross join lateral aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) a where a.grantee=0),
  'caller_table_privilege_count',(select count(*) from business b cross join callers c where has_table_privilege(c.role,b.oid,'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER')),
  'caller_column_privilege_count',(select count(*) from business b cross join callers c where has_any_column_privilege(c.role,b.oid,'SELECT,INSERT,UPDATE,REFERENCES')),
  'caller_sequence_privilege_count',(select count(*) from sequences s cross join callers c where has_sequence_privilege(c.role,s.oid,'USAGE,SELECT,UPDATE')),
  'public_table_privilege_count',(select count(*) from business b cross join lateral aclexplode(coalesce(b.relacl,acldefault('r',b.relowner))) a where a.grantee=0),
  'public_sequence_privilege_count',(select count(*) from sequences b cross join lateral aclexplode(coalesce(b.relacl,acldefault('S',b.relowner))) a where a.grantee=0),
  'business_table_count',(select count(*) from business),
  'rls_enabled_table_count',(select count(*) from business where relrowsecurity),
  'tables_owned_by_api_owner',(select count(*) from business where relowner='content_producer_api_owner'::regrole),
  'owner_role',(select jsonb_build_object('login',rolcanlogin,'superuser',rolsuper,'bypassrls',rolbypassrls,'inherit',rolinherit,
    'memberships',(select count(*) from pg_auth_members where member=r.oid),
    'api_create',has_schema_privilege(rolname,'api','create'),'internal_create',has_schema_privilege(rolname,'internal','create'))
    from pg_roles r where rolname='content_producer_api_owner'),
  'missing_api_owner_select_policy_count',(select count(*) from business b where not exists(select 1 from pg_policy p where p.polrelid=b.oid and p.polcmd in ('r','*') and 'content_producer_api_owner'::regrole=any(p.polroles))),
  'unsafe_update_policy_count',(select count(*) from pg_policy p join business b on b.oid=p.polrelid where p.polcmd='w' and (p.polqual is null or p.polwithcheck is null)),
  'unsafe_explicit_default_acl_count',(select count(*) from pg_default_acl d cross join lateral aclexplode(d.defaclacl) a
    where d.defaclrole in ('postgres'::regrole,'content_producer_api_owner'::regrole)
      and (d.defaclnamespace=0 or d.defaclnamespace in(select oid from pg_namespace where nspname in('public','api','internal')))
      and a.grantee in(0,'anon'::regrole,'authenticated'::regrole,'service_role'::regrole)),
  'history_app_privileges',jsonb_build_object('select',has_table_privilege('content_producer_api_owner','internal.post_write_history','SELECT'),
    'insert',has_table_privilege('content_producer_api_owner','internal.post_write_history','INSERT'),
    'update',has_table_privilege('content_producer_api_owner','internal.post_write_history','UPDATE'),
    'delete',has_table_privilege('content_producer_api_owner','internal.post_write_history','DELETE'),
    'truncate',has_table_privilege('content_producer_api_owner','internal.post_write_history','TRUNCATE')),
  'history_enabled_triggers',(select jsonb_agg(tgname order by tgname) from pg_trigger where tgrelid='internal.post_write_history'::regclass and not tgisinternal and tgenabled='O'),
  'history_bound_violation_count',(select count(*) from internal.post_write_history where octet_length(response::text)>524288 or octet_length(before_evidence::text)>98304),
  'history_token_key_count',(select count(*) from internal.post_write_history where (before_evidence::text||response::text) ~ '"(claim_token|reservation_token|access_token|refresh_token)"[[:space:]]*:'),
  'history_current_token_value_count',(select count(*) from internal.post_write_history h where exists (
    select 1 from public.trivia_facts f where f.workspace_id=h.workspace_id and f.reservation_token is not null and strpos(h.response::text,f.reservation_token::text)>0)
    or exists(select 1 from public.content_plan_items i where i.workspace_id=h.workspace_id and i.claim_token is not null and strpos(h.response::text,i.claim_token::text)>0)),
  'ledger_token_key_count',(select count(*) from internal.operation_ledger where response_snapshot::text ~ '"(claim_token|reservation_token|access_token|refresh_token)"[[:space:]]*:'),
  'invalid_v6_ledger_count',(select count(*) from internal.operation_ledger l where l.response_snapshot->'schema_version'='6'::jsonb and (
    l.operation_name not in ('save_post','revise_post','reschedule_post') or octet_length(l.response_snapshot::text)>2048
    or not exists(select 1 from internal.post_write_history h where h.operation_id=l.id and h.workspace_id=l.workspace_id
      and h.actor_user_id=l.actor_user_id and h.operation_name=l.operation_name and h.public_id::text=l.response_snapshot->>'history_public_id'
      and l.response_snapshot->>'response_hash'=encode(extensions.digest(convert_to(h.response::text,'UTF8'),'sha256'),'hex')))),
  'uncompleted_ledger_count',(select count(*) from internal.operation_ledger where completed_at is null),
  'leftover_fault_fixture_count',(select count(*) from helpers where proname like 'p55_%' or proname like 'p56_%' or proname like 'test_post_%'),
  'disabled_business_trigger_count',(select count(*) from pg_trigger t join business b on b.oid=t.tgrelid where not t.tgisinternal and t.tgenabled<>'O'),
  'later_rpc_count',(select count(*) from api_functions where proname in('approve_post','revoke_post_approval','discard_post','mark_post_posted','archive_post','record_post_metrics','replace_post_metrics_snapshot')),
  'cleanup',jsonb_build_object('workspaces',(select count(*) from public.workspaces),'pages',(select count(*) from public.pages),
    'configs',(select count(*) from public.page_niche_configs),'plans',(select count(*) from public.content_plans),'items',(select count(*) from public.content_plan_items),
    'posts',(select count(*) from public.posts),'metrics',(select count(*) from public.post_metrics),'facts',(select count(*) from public.trivia_facts),'junctions',(select count(*) from public.trivia_post_facts),
    'post_history',(select count(*) from internal.post_write_history),'reservation_history',(select count(*) from internal.trivia_reservation_sets),'events',(select count(*) from internal.content_plan_item_events),
    'ledger',(select count(*) from internal.operation_ledger),'rate_buckets',(select count(*) from internal.rate_limit_buckets),
    'fixture_users',(select count(*) from auth.users where email like '%@example.test'))
) as audit;
