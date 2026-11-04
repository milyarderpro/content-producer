-- Run only with psql -X -v ON_ERROR_STOP=1 -v workspace_public_id=...
--   -v backup_confirmed=on -f scripts/cutover-reset-content.sql
-- A failed assertion rolls back every delete. Never run via db reset --linked.
\if :{?workspace_public_id}
\else
  \echo 'workspace_public_id is required'
  \quit 2
\endif
\if :{?backup_confirmed}
\else
  \echo 'backup_confirmed=on is required'
  \quit 2
\endif
\if :backup_confirmed
\else
  \echo 'backup_confirmed must be on'
  \quit 2
\endif

begin;
set local lock_timeout = '5s';
set local statement_timeout = '90s';
select set_config('cutover.workspace_public_id', :'workspace_public_id', true);
lock table public.workspaces, public.niches, public.pages, public.page_niche_configs,
  public.content_plans, public.content_plan_items, public.posts, public.post_metrics,
  public.trivia_facts, public.trivia_fact_evidence_v2, public.trivia_post_facts,
  internal.operation_ledger, internal.rate_limit_buckets,
  internal.content_plan_item_events, internal.post_write_history,
  internal.trivia_reservation_sets, internal.trivia_fact_catalog_v2
  in access exclusive mode;

create temporary table cutover_preserved on commit drop as
select jsonb_build_object(
  'auth_user_ids', (select coalesce(jsonb_agg(id order by id), '[]'::jsonb) from auth.users),
  'workspaces', (select coalesce(jsonb_agg(to_jsonb(w) order by w.id), '[]'::jsonb) from public.workspaces w),
  'pages', (select coalesce(jsonb_agg(to_jsonb(p) order by p.id), '[]'::jsonb) from public.pages p),
  'page_niche_configs', (select coalesce(jsonb_agg(to_jsonb(c) order by c.id), '[]'::jsonb) from public.page_niche_configs c),
  'niches', (select coalesce(jsonb_agg(to_jsonb(n) order by n.key), '[]'::jsonb) from public.niches n)
) as value;

do $$
declare
  target bigint;
  t text;
  unexpected bigint;
  ids text[];
  tables text[] := array[
    'public.workspaces','public.niches','public.pages','public.page_niche_configs',
    'public.content_plans','public.content_plan_items','public.posts','public.post_metrics',
    'public.trivia_facts','public.trivia_fact_evidence_v2','public.trivia_post_facts',
    'internal.operation_ledger','internal.rate_limit_buckets',
    'internal.content_plan_item_events','internal.post_write_history',
    'internal.trivia_reservation_sets','internal.trivia_fact_catalog_v2'];
begin
  select id into target from public.workspaces
    where public_id = current_setting('cutover.workspace_public_id')::uuid;
  if target is null or (select count(*) from public.workspaces) <> 1
    or (select count(*) from auth.users) <> 1
    or not exists (select 1 from public.workspaces w join auth.users u on u.id=w.owner_user_id where w.id=target)
    or (select count(*) from public.niches where key='trivia') <> 1 then
    raise exception 'owner/workspace/niche scope changed';
  end if;

  select array_agg(n.nspname||'.'||c.relname order by n.nspname,c.relname)
    into ids from pg_class c join pg_namespace n on n.oid=c.relnamespace
    where n.nspname in ('public','internal') and c.relkind in ('r','p');
  if ids is distinct from (select array_agg(x order by x) from unnest(tables) x) then
    raise exception 'application table inventory changed';
  end if;
  if to_regclass('cron.job') is not null or to_regclass('pgmq.meta') is not null then
    raise exception 'job inventory changed';
  end if;

  foreach t in array array[
    'public.pages','public.page_niche_configs','public.content_plans',
    'public.content_plan_items','public.posts','public.post_metrics',
    'public.trivia_facts','public.trivia_fact_evidence_v2','public.trivia_post_facts',
    'internal.operation_ledger','internal.content_plan_item_events',
    'internal.post_write_history','internal.trivia_reservation_sets',
    'internal.trivia_fact_catalog_v2'] loop
    execute format('select count(*) from %s where workspace_id <> $1', t)
      into unexpected using target;
    if unexpected <> 0 then raise exception 'other owner rows in %', t; end if;
  end loop;
  if exists (select 1 from internal.rate_limit_buckets b
    where b.actor_user_id <> (select owner_user_id from public.workspaces where id=target))
    or exists (select 1 from internal.operation_ledger l
      where l.actor_user_id <> (select owner_user_id from public.workspaces where id=target)) then
    raise exception 'actor scope changed';
  end if;
  if exists (select 1 from internal.operation_ledger l
      where l.operation_name in ('create_page','update_page') and l.target_type is distinct from 'page')
    or exists (select 1 from internal.operation_ledger l where l.completed_at is null)
    or exists (select 1 from public.content_plan_items where claim_token is not null)
    or exists (select 1 from public.trivia_facts where reservation_token is not null
      or (reserved_until is not null and reserved_until > now()))
    or exists (select 1 from internal.trivia_reservation_sets where reserved_until > now()) then
    raise exception 'active work or ledger scope changed';
  end if;
  if exists (
    select 1 from (
      select public_id::text as id from public.posts
      union all select public_id::text from public.trivia_facts
      union all select public_id::text from public.content_plans
    ) content_ids
    where exists (select 1 from public.workspaces w where w.settings::text like '%'||content_ids.id||'%')
       or exists (select 1 from public.pages p where p.platform_config::text like '%'||content_ids.id||'%')
       or exists (select 1 from public.page_niche_configs c where c.config::text like '%'||content_ids.id||'%')
  ) then raise exception 'preserved config references content'; end if;
end $$;

delete from internal.content_plan_item_events;
delete from internal.post_write_history;
delete from public.post_metrics;
delete from public.trivia_post_facts;
delete from public.trivia_fact_evidence_v2;
delete from public.posts;
delete from public.content_plan_items;
delete from public.content_plans;
delete from internal.trivia_reservation_sets;
delete from public.trivia_facts;
delete from internal.operation_ledger where operation_name not in ('create_page','update_page');
delete from internal.trivia_fact_catalog_v2;

do $$
declare t text; n bigint; before_value jsonb; after_value jsonb;
begin
  foreach t in array array[
    'internal.content_plan_item_events','internal.post_write_history','public.post_metrics',
    'public.trivia_post_facts','public.trivia_fact_evidence_v2','public.posts',
    'public.content_plan_items','public.content_plans','internal.trivia_reservation_sets',
    'public.trivia_facts','internal.trivia_fact_catalog_v2'] loop
    execute format('select count(*) from %s',t) into n;
    if n <> 0 then raise exception 'content remains in %',t; end if;
  end loop;
  if exists (select 1 from internal.operation_ledger
      where operation_name not in ('create_page','update_page')) then
    raise exception 'content ledger remains';
  end if;
  select value into before_value from cutover_preserved;
  select jsonb_build_object(
    'auth_user_ids', (select coalesce(jsonb_agg(id order by id), '[]'::jsonb) from auth.users),
    'workspaces', (select coalesce(jsonb_agg(to_jsonb(w) order by w.id), '[]'::jsonb) from public.workspaces w),
    'pages', (select coalesce(jsonb_agg(to_jsonb(p) order by p.id), '[]'::jsonb) from public.pages p),
    'page_niche_configs', (select coalesce(jsonb_agg(to_jsonb(c) order by c.id), '[]'::jsonb) from public.page_niche_configs c),
    'niches', (select coalesce(jsonb_agg(to_jsonb(nic) order by nic.key), '[]'::jsonb) from public.niches nic)
  ) into after_value;
  if before_value is distinct from after_value then
    raise exception 'preserved identity/Page/config changed';
  end if;
end $$;
commit;
