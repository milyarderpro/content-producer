-- Run after the single live v2 QA draft has been read back, using psql -X
-- -v ON_ERROR_STOP=1 and all three public IDs. No production action is implicit.
\if :{?workspace_public_id}
\else
  \echo 'workspace_public_id required'
  \quit 2
\endif
\if :{?qa_page_public_id}
\else
  \echo 'qa_page_public_id required'
  \quit 2
\endif
\if :{?qa_post_public_id}
\else
  \echo 'qa_post_public_id required'
  \quit 2
\endif

begin;
set local lock_timeout = '5s';
set local statement_timeout = '60s';
select set_config('cutover.workspace_public_id', :'workspace_public_id', true);
select set_config('cutover.qa_page_public_id', :'qa_page_public_id', true);
select set_config('cutover.qa_post_public_id', :'qa_post_public_id', true);
lock table public.workspaces, public.niches, public.pages, public.page_niche_configs,
  public.content_plans, public.content_plan_items, public.posts, public.post_metrics,
  public.trivia_facts, public.trivia_fact_evidence_v2, public.trivia_post_facts,
  internal.operation_ledger, internal.content_plan_item_events,
  internal.post_write_history, internal.trivia_reservation_sets,
  internal.trivia_fact_catalog_v2 in access exclusive mode;

create temporary table qa_preserved on commit drop as
select jsonb_build_object(
  'workspaces', (select coalesce(jsonb_agg(to_jsonb(w) order by w.id), '[]'::jsonb) from public.workspaces w),
  'pages', (select coalesce(jsonb_agg(to_jsonb(p) order by p.id), '[]'::jsonb) from public.pages p),
  'configs', (select coalesce(jsonb_agg(to_jsonb(c) order by c.id), '[]'::jsonb) from public.page_niche_configs c),
  'niches', (select coalesce(jsonb_agg(to_jsonb(nic) order by nic.key), '[]'::jsonb) from public.niches nic)
) as value;
create temporary table qa_target on commit drop as
select p.id post_id, p.workspace_id, p.page_id, p.public_id post_public_id
from public.posts p join public.workspaces w on w.id=p.workspace_id
join public.pages page on page.id=p.page_id
where w.public_id=current_setting('cutover.workspace_public_id')::uuid
  and page.public_id=current_setting('cutover.qa_page_public_id')::uuid
  and p.public_id=current_setting('cutover.qa_post_public_id')::uuid
  and p.content_schema_version=2 and p.status='draft';
create temporary table qa_facts on commit drop as
select distinct j.fact_id from public.trivia_post_facts j
join qa_target q on q.post_id=j.post_id;

do $$
begin
  if (select count(*) from qa_target) <> 1
    or (select count(*) from public.workspaces) <> 1
    or (select count(*) from public.posts) <> 1
    or exists (select 1 from public.trivia_post_facts j
      where j.post_id <> (select post_id from qa_target))
    or exists (select 1 from public.trivia_facts f
      where not exists (select 1 from qa_facts q where q.fact_id=f.id))
    or exists (select 1 from public.content_plans)
    or exists (select 1 from public.content_plan_items)
    or exists (select 1 from internal.content_plan_item_events)
    or exists (select 1 from internal.trivia_reservation_sets)
    or exists (select 1 from public.post_metrics m
      where m.post_id <> (select post_id from qa_target))
    or exists (select 1 from internal.post_write_history h
      where h.post_id <> (select post_id from qa_target))
    or exists (select 1 from internal.operation_ledger l
      where l.operation_name not in ('create_page','update_page')
      and (l.target_type is distinct from 'post'
        or l.target_public_id is distinct from (select post_public_id from qa_target))) then
    raise exception 'QA cleanup scope changed; no rows deleted';
  end if;
end $$;

delete from internal.post_write_history where post_id=(select post_id from qa_target);
delete from public.post_metrics where post_id=(select post_id from qa_target);
delete from public.trivia_post_facts where post_id=(select post_id from qa_target);
delete from public.trivia_fact_evidence_v2 where fact_id in (select fact_id from qa_facts);
delete from public.posts where id=(select post_id from qa_target);
delete from public.trivia_facts where id in (select fact_id from qa_facts);
delete from internal.operation_ledger where operation_name not in ('create_page','update_page')
  and target_type='post' and target_public_id=(select post_public_id from qa_target);
delete from internal.trivia_fact_catalog_v2
  where workspace_id=(select workspace_id from qa_target);

do $$
declare before_value jsonb; after_value jsonb;
begin
  if exists (select 1 from public.posts) or exists (select 1 from public.trivia_facts)
    or exists (select 1 from public.trivia_post_facts)
    or exists (select 1 from public.trivia_fact_evidence_v2)
    or exists (select 1 from public.post_metrics)
    or exists (select 1 from public.content_plans)
    or exists (select 1 from public.content_plan_items)
    or exists (select 1 from internal.content_plan_item_events)
    or exists (select 1 from internal.post_write_history)
    or exists (select 1 from internal.trivia_reservation_sets)
    or exists (select 1 from internal.trivia_fact_catalog_v2)
    or exists (select 1 from internal.operation_ledger
      where operation_name not in ('create_page','update_page')) then
    raise exception 'QA cleanup left content behind';
  end if;
  select value into before_value from qa_preserved;
  select jsonb_build_object(
    'workspaces', (select coalesce(jsonb_agg(to_jsonb(w) order by w.id), '[]'::jsonb) from public.workspaces w),
    'pages', (select coalesce(jsonb_agg(to_jsonb(p) order by p.id), '[]'::jsonb) from public.pages p),
    'configs', (select coalesce(jsonb_agg(to_jsonb(c) order by c.id), '[]'::jsonb) from public.page_niche_configs c),
    'niches', (select coalesce(jsonb_agg(to_jsonb(nic) order by nic.key), '[]'::jsonb) from public.niches nic)
  ) into after_value;
  if before_value is distinct from after_value then
    raise exception 'QA cleanup modified Page/config';
  end if;
end $$;
commit;
