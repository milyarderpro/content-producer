-- Read-only local Phase 5 final surface evidence. Never calls a mutating RPC.
with expected as (
 select unnest(array['get_account_profile','get_workspace_context','list_pages','get_page_generation_context',
 'list_content_plans','get_content_plan','list_posts','get_post','get_post_performance','get_performance_insights',
 'create_page','update_page','create_content_plan','claim_content_plan_items','renew_content_plan_claim',
 'report_content_plan_item_failure','retry_content_plan_item','replace_discarded_plan_item','cancel_content_plan',
 'trivia_find_similar_facts','trivia_register_and_reserve_facts','trivia_release_facts','trivia_reverify_fact','trivia_correct_fact',
 'save_post','revise_post','reschedule_post','approve_post','revoke_post_approval','discard_post','mark_post_posted','archive_post','record_post_performance']) name
), api_functions as (
 select p.* from pg_catalog.pg_proc p join pg_catalog.pg_namespace n on n.oid=p.pronamespace where n.nspname='api'
), helpers as (
 select p.* from pg_catalog.pg_proc p join pg_catalog.pg_namespace n on n.oid=p.pronamespace where n.nspname='internal'
), tables as (
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
 union all (select name from expected except select proname::text from api_functions)) d),
 'overloaded_api_count',(select count(*) from (select proname from api_functions group by proname having count(*)<>1) d),
 'api_inventory',(select jsonb_agg(jsonb_build_object('name',proname,'signature',oid::regprocedure::text,
 'owner',pg_get_userbyid(proowner),'security_definer',prosecdef,'settings',proconfig) order by proname) from api_functions),
 'unsafe_api_count',(select count(*) from api_functions where proowner<>'content_producer_api_owner'::regrole or not prosecdef or not coalesce(proconfig @> array['search_path=""'],false)),
 'authenticated_api_execute_count',(select count(*) from api_functions where has_function_privilege('authenticated',oid,'execute')),
 'banned_api_execute_count',(select count(*) from api_functions p cross join callers c where c.role<>'authenticated' and has_function_privilege(c.role,p.oid,'execute')),
 'public_api_execute_count',(select count(*) from api_functions p cross join lateral aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) a where a.grantee=0),
 'caller_helper_execute_count',(select count(*) from helpers p cross join callers c where has_function_privilege(c.role,p.oid,'execute')),
 'public_helper_execute_count',(select count(*) from helpers p cross join lateral aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) a where a.grantee=0),
 'caller_table_privilege_count',(select count(*) from tables b cross join callers c where has_table_privilege(c.role,b.oid,'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER')),
 'caller_column_privilege_count',(select count(*) from tables b cross join callers c where has_any_column_privilege(c.role,b.oid,'SELECT,INSERT,UPDATE,REFERENCES')),
 'caller_sequence_privilege_count',(select count(*) from sequences s cross join callers c where has_sequence_privilege(c.role,s.oid,'USAGE,SELECT,UPDATE')),
 'public_table_privilege_count',(select count(*) from tables b cross join lateral aclexplode(coalesce(b.relacl,acldefault('r',b.relowner))) a where a.grantee=0),
 'public_sequence_privilege_count',(select count(*) from sequences b cross join lateral aclexplode(coalesce(b.relacl,acldefault('S',b.relowner))) a where a.grantee=0),
 'business_table_count',(select count(*) from tables),'rls_enabled_table_count',(select count(*) from tables where relrowsecurity),
 'tables_owned_by_api_owner',(select count(*) from tables where relowner='content_producer_api_owner'::regrole),
 'owner_role',(select jsonb_build_object('login',rolcanlogin,'superuser',rolsuper,'bypassrls',rolbypassrls,'inherit',rolinherit,
 'memberships',(select count(*) from pg_auth_members where member=r.oid),'api_create',has_schema_privilege(rolname,'api','create'),
 'internal_create',has_schema_privilege(rolname,'internal','create')) from pg_roles r where rolname='content_producer_api_owner'),
 'schemas',jsonb_build_object('authenticated_api_usage',has_schema_privilege('authenticated','api','usage'),
 'anon_api_usage',has_schema_privilege('anon','api','usage'),'authenticated_internal_usage',has_schema_privilege('authenticated','internal','usage')),
 'missing_owner_select_policy_count',(select count(*) from tables b where not exists(select 1 from pg_policy p where p.polrelid=b.oid and p.polcmd in ('r','*') and 'content_producer_api_owner'::regrole=any(p.polroles))),
 'unsafe_update_policy_count',(select count(*) from pg_policy p join tables b on b.oid=p.polrelid where p.polcmd='w' and (p.polqual is null or p.polwithcheck is null)),
 'policy_inventory',(select jsonb_agg(jsonb_build_object('table',b.oid::regclass::text,'name',p.polname,'command',p.polcmd,
 'roles',p.polroles,'using',pg_get_expr(p.polqual,p.polrelid),'check',pg_get_expr(p.polwithcheck,p.polrelid)) order by b.oid::regclass::text,p.polname) from pg_policy p join tables b on b.oid=p.polrelid),
 'unsafe_default_acl_count',(select count(*) from pg_default_acl d cross join lateral aclexplode(d.defaclacl) a
 where d.defaclrole in ('postgres'::regrole,'content_producer_api_owner'::regrole)
 and (d.defaclnamespace=0 or d.defaclnamespace in(select oid from pg_namespace where nspname in('public','api','internal')))
 and a.grantee in(0,'anon'::regrole,'authenticated'::regrole,'service_role'::regrole)),
 'private_definer_inventory',(select jsonb_agg(jsonb_build_object('signature',oid::regprocedure::text,'owner',pg_get_userbyid(proowner),'settings',proconfig) order by proname) from helpers where prosecdef),
 'metrics_owner_privileges',jsonb_build_object('select',has_table_privilege('content_producer_api_owner','public.post_metrics','SELECT'),
 'insert',has_table_privilege('content_producer_api_owner','public.post_metrics','INSERT'),
 'update',has_any_column_privilege('content_producer_api_owner','public.post_metrics','UPDATE'),
 'delete',has_table_privilege('content_producer_api_owner','public.post_metrics','DELETE'),
 'truncate',has_table_privilege('content_producer_api_owner','public.post_metrics','TRUNCATE')),
 'metrics_immutable_trigger',(select count(*) from pg_trigger where tgrelid='public.post_metrics'::regclass and tgname='post_metrics_immutable' and tgenabled='O'),
 'invalid_v8_ledger_count',(select count(*) from internal.operation_ledger l where l.operation_name='record_post_performance' and (
 l.completed_at is null or internal.has_exact_json_keys(l.response_snapshot,array['schema_version','operation_name','target_public_id','post_public_id','response_hash']) is distinct from true
 or l.response_snapshot->'schema_version' is distinct from '8'::jsonb or l.target_type is distinct from 'metric_snapshot'
 or octet_length(l.response_snapshot::text)>2048 or not exists(select 1 from public.post_metrics m join public.posts p on p.id=m.post_id and p.workspace_id=m.workspace_id and p.page_id=m.page_id
 where m.created_by_operation_id=l.id and m.workspace_id=l.workspace_id and m.public_id=l.target_public_id and m.public_id::text=l.response_snapshot->>'target_public_id'
 and p.public_id::text=l.response_snapshot->>'post_public_id' and l.response_snapshot->>'operation_name'=l.operation_name
 and l.response_snapshot->>'response_hash'=encode(extensions.digest(convert_to(internal.metric_response_v1(m,p.public_id)::text,'UTF8'),'sha256'),'hex')))),
 'invalid_v6_v7_operation_count',(select count(*) from internal.operation_ledger where (response_snapshot->'schema_version'='6'::jsonb and operation_name not in('save_post','revise_post','reschedule_post'))
 or (response_snapshot->'schema_version'='7'::jsonb and operation_name not in('approve_post','revoke_post_approval','discard_post','mark_post_posted','archive_post'))),
 'uncompleted_ledger_count',(select count(*) from internal.operation_ledger where completed_at is null),
 'leftover_fault_count',(select count(*) from helpers where proname like 'p55_%' or proname like 'p56_%' or proname like 'p57_%' or proname like 'p58_%' or proname like 'test_post_%'),
 'disabled_business_trigger_count',(select count(*) from pg_trigger t join tables b on b.oid=t.tgrelid where not t.tgisinternal and t.tgenabled<>'O'),
 'cleanup',jsonb_build_object('workspaces',(select count(*) from public.workspaces),'pages',(select count(*) from public.pages),
 'configs',(select count(*) from public.page_niche_configs),'plans',(select count(*) from public.content_plans),'items',(select count(*) from public.content_plan_items),
 'posts',(select count(*) from public.posts),'metrics',(select count(*) from public.post_metrics),'facts',(select count(*) from public.trivia_facts),'junctions',(select count(*) from public.trivia_post_facts),
 'post_history',(select count(*) from internal.post_write_history),'reservation_history',(select count(*) from internal.trivia_reservation_sets),'events',(select count(*) from internal.content_plan_item_events),
 'ledger',(select count(*) from internal.operation_ledger),'rate_buckets',(select count(*) from internal.rate_limit_buckets),
 'fixture_users',(select count(*) from auth.users where email like '%@example.test'))
) as audit;
