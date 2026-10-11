-- Checkpoint 5.4 / CR-011. No caller-facing routine in this migration.
-- Lock protocol: rate bucket -> ledger -> Page -> numeric schedule keys ->
-- plan -> items (claim position/id, cancellation id) -> posts -> append events.

grant update on public.content_plans, public.content_plan_items to content_producer_api_owner;
-- PostgreSQL row locks require UPDATE on at least one column. No post business
-- field can be updated by this checkpoint's role privileges or RPCs.
grant update(id) on public.posts to content_producer_api_owner;

create policy content_plans_api_owner_update_5_4 on public.content_plans
for update to content_producer_api_owner
using (exists (select 1 from public.workspaces w where w.id = content_plans.workspace_id
  and w.is_active and w.owner_user_id = (select internal.request_actor_user_id_v1())))
with check (exists (select 1 from public.workspaces w where w.id = content_plans.workspace_id
  and w.is_active and w.owner_user_id = (select internal.request_actor_user_id_v1())));
create policy content_plan_items_api_owner_update_5_4 on public.content_plan_items
for update to content_producer_api_owner
using (exists (select 1 from public.workspaces w where w.id = content_plan_items.workspace_id
  and w.is_active and w.owner_user_id = (select internal.request_actor_user_id_v1())))
with check (exists (select 1 from public.workspaces w where w.id = content_plan_items.workspace_id
  and w.is_active and w.owner_user_id = (select internal.request_actor_user_id_v1())));
create policy posts_api_owner_row_lock_5_4 on public.posts
for update to content_producer_api_owner
using (exists (select 1 from public.workspaces w where w.id=posts.workspace_id
  and w.is_active and w.owner_user_id=(select internal.request_actor_user_id_v1())))
with check (exists (select 1 from public.workspaces w where w.id=posts.workspace_id
  and w.is_active and w.owner_user_id=(select internal.request_actor_user_id_v1())));

create function internal.plan_assert_write_input_v1(p_version integer,p_workspace uuid,p_key uuid,p_target uuid)
returns void language plpgsql immutable security invoker set search_path = '' as $$
begin
  if p_version is distinct from 1 or p_workspace is null or p_key is null or p_target is null
    or p_workspace::text !~ '^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
    or p_key::text !~ '^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
    or p_target::text !~ '^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' then
    raise exception using errcode='P0001',message='VALIDATION_FAILED';
  end if;
end;
$$;

create function internal.plan_safe_reason_v1(p_reason text)
returns boolean language sql immutable security invoker set search_path = '' as $$
  select coalesce(p_reason = pg_catalog.btrim(p_reason)
    and pg_catalog.char_length(p_reason) between 1 and 500
    and p_reason !~ '[[:cntrl:]]'
    and p_reason !~* '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}'
    and p_reason !~* '(bearer[[:space:]]|eyJ[A-Za-z0-9_-]+\.|(token|secret|password|authorization|api[_-]?key)[[:space:]]*[:=]|SQLSTATE|CONTEXT:|DETAIL:|stack[[:space:]_-]*trace|select[[:space:]].*from[[:space:]]|insert[[:space:]]+into|update[[:space:]].*set[[:space:]]|delete[[:space:]]+from)', false);
$$;

create function internal.plan_failure_code_v1(p_code text)
returns boolean language sql immutable security invoker set search_path = '' as $$
  select coalesce(p_code = any(array['VALIDATION_FAILED','CONFIG_INVALID',
    'FACT_SOURCE_INSUFFICIENT','FACT_NOT_ELIGIBLE','FACT_FRESHNESS_EXPIRED',
    'FACT_REUSE_BLOCKED','FACT_RESERVATION_CONFLICT','FACT_RESERVATION_EXPIRED',
    'FACT_RESERVATION_CONTEXT_CHANGED','QUALITY_SYSTEM_CHECK_FAILED',
    'SCHEDULE_CONFLICT','DATABASE_BUSY','RATE_LIMITED','INTERNAL_ERROR']), false);
$$;

create table internal.content_plan_item_events (
  id bigint generated always as identity primary key,
  public_id uuid not null default extensions.gen_random_uuid() unique,
  workspace_id bigint not null,
  operation_id bigint not null,
  plan_id bigint not null,
  item_id bigint not null,
  page_id bigint not null,
  niche_key text not null,
  plan_public_id uuid not null,
  item_public_id uuid not null,
  actor_user_id uuid not null,
  oauth_client_id text not null,
  event_type text not null,
  before_status text not null,
  after_status text not null,
  attempt_count integer not null check (attempt_count >= 0),
  claim_token uuid,
  claimed_at timestamptz,
  claim_expires_at timestamptz,
  claim_renewal_count integer,
  reason text,
  failure_code text,
  failure_detail text,
  retry_recommended boolean,
  discarded_post_public_id uuid references public.posts(public_id) on delete restrict,
  created_at timestamptz not null default clock_timestamp(),
  constraint plan_events_operation_fk foreign key (workspace_id, operation_id)
    references internal.operation_ledger(workspace_id, id) on delete restrict,
  constraint plan_events_plan_fk foreign key (plan_id, workspace_id, page_id, niche_key)
    references public.content_plans(id, workspace_id, page_id, niche_key) on delete restrict,
  constraint plan_events_item_fk foreign key (item_id, workspace_id, page_id, niche_key)
    references public.content_plan_items(id, workspace_id, page_id, niche_key) on delete restrict,
  constraint plan_events_operation_item_key unique (workspace_id, operation_id, item_id),
  constraint plan_events_client_check check (char_length(oauth_client_id) between 1 and 512
    and oauth_client_id !~ '[[:cntrl:]]'),
  constraint plan_events_transition_check check (
    (event_type='claimed' and before_status='pending' and after_status='in_progress')
    or (event_type='reclaimed' and before_status='in_progress' and after_status='in_progress')
    or (event_type='renewed' and before_status='in_progress' and after_status='in_progress')
    or (event_type='failed' and before_status='in_progress' and after_status='failed')
    or (event_type='retried' and before_status='failed' and after_status='pending')
    or (event_type='replaced' and before_status='completed' and after_status='pending')
    or (event_type='cancelled' and before_status in ('pending','failed','in_progress') and after_status='cancelled')),
  constraint plan_events_claim_shape_check check (
    (event_type in ('claimed','reclaimed') and claim_token is not null
      and claimed_at is not null and claim_expires_at is not null and claim_expires_at=claimed_at+interval '30 minutes'
      and claim_renewal_count is not null and claim_renewal_count=0)
    or (event_type='renewed' and claim_token is null and claimed_at is not null
      and claim_expires_at is not null and claim_expires_at>claimed_at and claim_expires_at<=claimed_at+interval '60 minutes'
      and claim_renewal_count is not null and claim_renewal_count=1)
    or (event_type not in ('claimed','reclaimed','renewed') and claim_token is null
      and claimed_at is null and claim_expires_at is null and claim_renewal_count is null)),
  constraint plan_events_detail_shape_check check (
    (event_type='failed' and internal.plan_failure_code_v1(failure_code)
      and internal.plan_safe_reason_v1(failure_detail) and retry_recommended is not null)
    or (event_type<>'failed' and failure_code is null and failure_detail is null and retry_recommended is null)),
  constraint plan_events_reason_shape_check check (
    (event_type in ('retried','replaced','cancelled') and internal.plan_safe_reason_v1(reason))
    or (event_type not in ('retried','replaced','cancelled') and reason is null)),
  constraint plan_events_replacement_shape_check check (
    (event_type='replaced') = (discarded_post_public_id is not null))
);
create index plan_events_item_history_idx on internal.content_plan_item_events(workspace_id, item_id, id);
create index plan_events_plan_history_idx on internal.content_plan_item_events(workspace_id, plan_id, id);
alter table internal.content_plan_item_events enable row level security;
revoke all on internal.content_plan_item_events from public, anon, authenticated, service_role;
revoke all on sequence internal.content_plan_item_events_id_seq from public, anon, authenticated, service_role;
grant select, insert on internal.content_plan_item_events to content_producer_api_owner;
grant usage, select on sequence internal.content_plan_item_events_id_seq to content_producer_api_owner;

create policy plan_events_api_owner_select on internal.content_plan_item_events
for select to content_producer_api_owner
using (actor_user_id=(select internal.request_actor_user_id_v1())
  and exists (select 1 from public.workspaces w where w.id=content_plan_item_events.workspace_id
    and w.is_active and w.owner_user_id=(select internal.request_actor_user_id_v1())));
create policy plan_events_api_owner_insert on internal.content_plan_item_events
for insert to content_producer_api_owner
with check (actor_user_id=(select internal.request_actor_user_id_v1())
  and exists (select 1 from public.workspaces w where w.id=content_plan_item_events.workspace_id
    and w.is_active and w.owner_user_id=(select internal.request_actor_user_id_v1()))
  and exists (select 1 from internal.operation_ledger l
    where l.workspace_id=content_plan_item_events.workspace_id and l.id=content_plan_item_events.operation_id
      and l.actor_user_id=(select internal.request_actor_user_id_v1()) and l.completed_at is null));

create function internal.plan_validate_event_v1()
returns trigger language plpgsql security invoker set search_path = '' as $$
declare v_operation text;
begin
  if tg_op='UPDATE' then raise exception using errcode='P0001',message='INTERNAL_ERROR'; end if;
  select operation_name into v_operation from internal.operation_ledger
    where id=new.operation_id and workspace_id=new.workspace_id and actor_user_id=new.actor_user_id
      and completed_at is null;
  if v_operation is distinct from (case new.event_type
    when 'claimed' then 'claim_content_plan_items' when 'reclaimed' then 'claim_content_plan_items'
    when 'renewed' then 'renew_content_plan_claim' when 'failed' then 'report_content_plan_item_failure'
    when 'retried' then 'retry_content_plan_item' when 'replaced' then 'replace_discarded_plan_item'
    when 'cancelled' then 'cancel_content_plan' end)
    or not exists (select 1 from public.content_plan_items i join public.content_plans p on p.id=i.plan_id
      where i.id=new.item_id and i.plan_id=new.plan_id and i.workspace_id=new.workspace_id
        and i.public_id=new.item_public_id and p.public_id=new.plan_public_id
        and i.status=new.after_status and i.attempt_count=new.attempt_count)
    or (new.event_type='replaced' and not exists (select 1 from public.posts p
      where p.public_id=new.discarded_post_public_id and p.workspace_id=new.workspace_id
        and p.content_plan_item_id=new.item_id and p.status='discarded' and p.published_at is null)) then
    raise exception using errcode='P0001',message='INTERNAL_ERROR';
  end if;
  return new;
end;
$$;
create trigger plan_events_validate_insert before insert or update on internal.content_plan_item_events
for each row execute function internal.plan_validate_event_v1();

create function internal.plan_lock_target_v1(
  p_workspace_id bigint, p_plan_public_id uuid, p_item_public_id uuid, p_operation text
)
returns table(plan_id bigint, page_id bigint, item_id bigint)
language plpgsql volatile security invoker set search_path = '' as $$
declare v_plan public.content_plans; v_item public.content_plan_items; v_key bigint;
begin
  if p_item_public_id is not null then
    select * into v_item from public.content_plan_items i
      where i.workspace_id=p_workspace_id and i.public_id=p_item_public_id;
    if not found then raise exception using errcode='P0001',message='PLAN_ITEM_NOT_FOUND'; end if;
    select * into v_plan from public.content_plans p where p.workspace_id=p_workspace_id and p.id=v_item.plan_id;
  else
    select * into v_plan from public.content_plans p
      where p.workspace_id=p_workspace_id and p.public_id=p_plan_public_id;
  end if;
  if v_plan.id is null then raise exception using errcode='P0001',message='PLAN_NOT_FOUND'; end if;
  -- No business locks were taken during target discovery.
  perform 1 from public.pages p where p.workspace_id=p_workspace_id and p.id=v_plan.page_id for update;
  if not found then raise exception using errcode='P0001',message='PLAN_NOT_FOUND'; end if;
  if p_operation in ('cancel_content_plan','replace_discarded_plan_item') then
    for v_key in
      select distinct pg_catalog.hashtextextended(i.page_id::text || ':' ||
        ((extract(epoch from i.scheduled_at)*1000000)::bigint)::text,0) as lock_key
      from public.content_plan_items i where i.workspace_id=p_workspace_id and i.plan_id=v_plan.id
        and i.scheduled_at is not null
        and ((p_operation='cancel_content_plan' and i.status not in ('completed','cancelled'))
          or (p_operation='replace_discarded_plan_item' and i.id=v_item.id))
      order by lock_key
    loop
      perform pg_catalog.pg_advisory_xact_lock(v_key);
    end loop;
  end if;
  select * into v_plan from public.content_plans p
    where p.workspace_id=p_workspace_id and p.id=v_plan.id for update;
  if not found then raise exception using errcode='P0001',message='PLAN_NOT_FOUND'; end if;
  if v_plan.status='cancelled' then raise exception using errcode='P0001',message='PLAN_STATUS_CONFLICT'; end if;
  if p_operation='cancel_content_plan' and v_plan.status='completed' then
    raise exception using errcode='P0001',message='PLAN_STATUS_CONFLICT';
  end if;
  if p_item_public_id is not null and not exists (select 1 from public.content_plan_items i
    where i.workspace_id=p_workspace_id and i.id=v_item.id and i.plan_id=v_plan.id) then
    raise exception using errcode='P0001',message='PLAN_ITEM_NOT_FOUND';
  end if;
  plan_id:=v_plan.id; page_id:=v_plan.page_id; item_id:=v_item.id;
  return next;
end;
$$;

create function internal.plan_assert_current_claim_v1(p_item public.content_plan_items, p_claim_token uuid)
returns void language plpgsql volatile security invoker set search_path = '' as $$
begin
  if p_item.status is distinct from 'in_progress' or p_claim_token is null
    or p_item.claim_token is distinct from p_claim_token then
    raise exception using errcode='P0001',message='PLAN_ITEM_CLAIM_MISMATCH';
  end if;
  if p_item.claim_expires_at is null or p_item.claim_expires_at<=pg_catalog.clock_timestamp() then
    raise exception using errcode='P0001',message='PLAN_ITEM_CLAIM_EXPIRED';
  end if;
end;
$$;

create function internal.plan_refresh_status_v1(p_plan_id bigint, p_explicit_cancel boolean default false)
returns void language plpgsql volatile security invoker set search_path = '' as $$
declare v_plan public.content_plans; v_count record; v_status text;
begin
  select * into v_plan from public.content_plans where id=p_plan_id;
  select count(*) as total, count(*) filter(where status='pending') as pending,
    count(*) filter(where status='in_progress') as in_progress,
    count(*) filter(where status='completed') as completed,
    count(*) filter(where status='failed') as failed,
    count(*) filter(where status='cancelled') as cancelled
  into v_count from public.content_plan_items where plan_id=p_plan_id and workspace_id=v_plan.workspace_id;
  if v_plan.id is null or v_count.total<>v_plan.requested_count then
    raise exception using errcode='P0001',message='INTERNAL_ERROR';
  end if;
  v_status:=case
    when p_explicit_cancel or v_plan.cancelled_at is not null or v_plan.status='cancelled' then 'cancelled'
    when v_count.completed+v_count.cancelled=v_count.total then 'completed'
    when v_count.in_progress>0 then 'in_progress'
    when v_count.completed>0 and v_count.pending+v_count.failed>0 then 'partially_completed'
    when v_count.pending=0 and v_count.in_progress=0 and v_count.completed=0 and v_count.failed>0 then 'failed'
    else 'pending' end;
  update public.content_plans set status=v_status,
    started_at=case when v_count.in_progress>0 then coalesce(started_at,pg_catalog.clock_timestamp()) else started_at end,
    completed_at=case when v_status='completed' then coalesce(completed_at,pg_catalog.clock_timestamp()) else null end,
    cancelled_at=case when v_status='cancelled' then coalesce(cancelled_at,pg_catalog.clock_timestamp()) else null end
  where id=p_plan_id and workspace_id=v_plan.workspace_id;
end;
$$;

create function internal.plan_project_summary_v1(p_plan_id bigint)
returns jsonb language sql stable security invoker set search_path = '' as $$
  select pg_catalog.jsonb_build_object('plan_public_id',p.public_id,'name',p.name,
    'page_public_id',page.public_id,'niche_key',p.niche_key,'status',p.status,'requested_count',p.requested_count,
    'progress',pg_catalog.jsonb_build_object(
      'pending',count(*) filter(where i.status='pending'),'in_progress',count(*) filter(where i.status='in_progress'),
      'completed',count(*) filter(where i.status='completed'),'failed',count(*) filter(where i.status='failed'),
      'cancelled',count(*) filter(where i.status='cancelled')),
    'created_at',internal.iso_timestamp_v1(p.created_at),'updated_at',internal.iso_timestamp_v1(p.updated_at))
  from public.content_plans p join public.pages page on page.id=p.page_id and page.workspace_id=p.workspace_id
  join public.content_plan_items i on i.plan_id=p.id and i.workspace_id=p.workspace_id
  where p.id=p_plan_id group by p.id,page.public_id;
$$;

create function internal.plan_project_item_v1(p_item public.content_plan_items, p_plan_public_id uuid)
returns jsonb language sql stable security invoker set search_path = '' as $$
  select pg_catalog.jsonb_build_object('plan_item_public_id',p_item.public_id,'plan_public_id',p_plan_public_id,
    'position',p_item.position,'status',p_item.status,'scheduled_at',internal.iso_timestamp_v1(p_item.scheduled_at),
    'topic_key',p_item.topic_key,'format_key',p_item.format_key,'interaction_goal',p_item.interaction_goal,
    'item_config',p_item.item_config,'attempt_count',p_item.attempt_count,
    'claim_expires_at',internal.iso_timestamp_v1(p_item.claim_expires_at),
    'active_post_public_id',(select p.public_id from public.posts p where p.workspace_id=p_item.workspace_id
      and p.content_plan_item_id=p_item.id and p.status<>'discarded' order by p.id limit 1),
    'last_error',case when p_item.last_error_code is null then null else
      pg_catalog.jsonb_build_object('code',p_item.last_error_code,'detail',p_item.last_error_detail) end,
    'created_at',internal.iso_timestamp_v1(p_item.created_at),'updated_at',internal.iso_timestamp_v1(p_item.updated_at));
$$;

create function internal.plan_append_event_v1(
  p_operation_id bigint, p_item public.content_plan_items, p_plan_public_id uuid,
  p_event_type text, p_before_status text, p_reason text default null,
  p_failure_code text default null, p_failure_detail text default null,
  p_retry_recommended boolean default null, p_discarded_post_public_id uuid default null
)
returns uuid language plpgsql volatile security invoker set search_path = '' as $$
declare v_context record; v_public_id uuid;
begin
  select * into v_context from internal.assert_request_context_v1();
  insert into internal.content_plan_item_events(workspace_id,operation_id,plan_id,item_id,page_id,niche_key,
    plan_public_id,item_public_id,actor_user_id,oauth_client_id,event_type,before_status,after_status,attempt_count,
    claim_token,claimed_at,claim_expires_at,claim_renewal_count,reason,failure_code,failure_detail,retry_recommended,
    discarded_post_public_id)
  values(p_item.workspace_id,p_operation_id,p_item.plan_id,p_item.id,p_item.page_id,p_item.niche_key,
    p_plan_public_id,p_item.public_id,v_context.actor_user_id,v_context.oauth_client_id,p_event_type,p_before_status,
    p_item.status,p_item.attempt_count,
    case when p_event_type in ('claimed','reclaimed') then p_item.claim_token end,
    case when p_event_type in ('claimed','reclaimed','renewed') then p_item.claimed_at end,
    case when p_event_type in ('claimed','reclaimed','renewed') then p_item.claim_expires_at end,
    case when p_event_type in ('claimed','reclaimed','renewed') then p_item.claim_renewal_count end,
    p_reason,p_failure_code,p_failure_detail,p_retry_recommended,p_discarded_post_public_id)
  returning public_id into v_public_id;
  return v_public_id;
end;
$$;

create function internal.plan_is_uuid_v1(p_value jsonb)
returns boolean language sql immutable security invoker set search_path = '' as $$
  select coalesce(pg_catalog.jsonb_typeof(p_value)='string' and p_value #>> '{}' ~
    '^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$',false);
$$;
create function internal.plan_is_time_v1(p_value jsonb, p_nullable boolean default false)
returns boolean language sql immutable security invoker set search_path = '' as $$
  select coalesce((p_nullable and p_value='null'::jsonb) or
    (pg_catalog.jsonb_typeof(p_value)='string' and internal.is_valid_timestamp_text(p_value #>> '{}')),false);
$$;

create function internal.plan_is_summary_v1(p_value jsonb)
returns boolean language plpgsql immutable security invoker set search_path = '' as $$
declare v_key text; v_sum integer:=0;
begin
  if internal.has_exact_json_keys(p_value,array['plan_public_id','name','page_public_id','niche_key','status',
    'requested_count','progress','created_at','updated_at']) is distinct from true
    or not internal.plan_is_uuid_v1(p_value->'plan_public_id') or not internal.plan_is_uuid_v1(p_value->'page_public_id')
    or not (p_value->'name'='null'::jsonb or (pg_catalog.jsonb_typeof(p_value->'name')='string'
      and pg_catalog.char_length(p_value->>'name') between 1 and 120))
    or pg_catalog.jsonb_typeof(p_value->'niche_key') is distinct from 'string'
    or p_value->>'niche_key' !~ '^[a-z][a-z0-9_]{1,49}$'
    or pg_catalog.jsonb_typeof(p_value->'status') is distinct from 'string'
    or p_value->>'status' not in ('pending','in_progress','partially_completed','completed','failed','cancelled')
    or internal.is_json_integer_between(p_value->'requested_count',1,100) is distinct from true
    or not internal.plan_is_time_v1(p_value->'created_at') or not internal.plan_is_time_v1(p_value->'updated_at')
    or internal.has_exact_json_keys(p_value->'progress',array['pending','in_progress','completed','failed','cancelled']) is distinct from true then
    return false;
  end if;
  foreach v_key in array array['pending','in_progress','completed','failed','cancelled'] loop
    if internal.is_json_integer_between(p_value->'progress'->v_key,0,100) is distinct from true then return false; end if;
    v_sum:=v_sum+(p_value->'progress'->>v_key)::integer;
  end loop;
  return v_sum=(p_value->>'requested_count')::integer;
exception when others then return false;
end;
$$;

create function internal.plan_is_item_v1(p_value jsonb)
returns boolean language plpgsql immutable security invoker set search_path = '' as $$
declare v_key text;
begin
  if internal.has_exact_json_keys(p_value,array['plan_item_public_id','plan_public_id','position','status','scheduled_at',
    'topic_key','format_key','interaction_goal','item_config','attempt_count','claim_expires_at','active_post_public_id',
    'last_error','created_at','updated_at']) is distinct from true
    or not internal.plan_is_uuid_v1(p_value->'plan_item_public_id') or not internal.plan_is_uuid_v1(p_value->'plan_public_id')
    or internal.is_json_integer_between(p_value->'position',1,100) is distinct from true
    or pg_catalog.jsonb_typeof(p_value->'status') is distinct from 'string'
    or p_value->>'status' not in ('pending','in_progress','completed','failed','cancelled')
    or internal.is_json_integer_between(p_value->'attempt_count',0,2147483647) is distinct from true
    or pg_catalog.jsonb_typeof(p_value->'item_config') is distinct from 'object'
    or pg_catalog.octet_length((p_value->'item_config')::text)>8192
    or not internal.plan_is_time_v1(p_value->'scheduled_at',true)
    or not internal.plan_is_time_v1(p_value->'claim_expires_at',true)
    or not internal.plan_is_time_v1(p_value->'created_at') or not internal.plan_is_time_v1(p_value->'updated_at')
    or not (p_value->'active_post_public_id'='null'::jsonb or internal.plan_is_uuid_v1(p_value->'active_post_public_id')) then return false; end if;
  foreach v_key in array array['topic_key','format_key','interaction_goal'] loop
    if not (p_value->v_key='null'::jsonb or (pg_catalog.jsonb_typeof(p_value->v_key)='string'
      and pg_catalog.char_length(p_value->>v_key) between 1 and 120)) then return false; end if;
  end loop;
  if p_value->'last_error'<>'null'::jsonb and (internal.has_exact_json_keys(p_value->'last_error',array['code','detail']) is distinct from true
    or not internal.plan_failure_code_v1(p_value#>>'{last_error,code}')
    or not internal.plan_safe_reason_v1(p_value#>>'{last_error,detail}')) then return false; end if;
  return true;
exception when others then return false;
end;
$$;

create function internal.plan_is_response_v4(p_operation text, p_response jsonb)
returns boolean language plpgsql immutable security invoker set search_path = '' as $$
declare v_data jsonb; v_claim jsonb;
begin
  if internal.has_exact_json_keys(p_response,array['response_schema_version','data']) is distinct from true
    or p_response->'response_schema_version' is distinct from '1'::jsonb then return false; end if;
  v_data:=p_response->'data';
  if v_data->'replayed' is distinct from 'false'::jsonb then return false; end if;
  case p_operation
    when 'claim_content_plan_items' then
      if internal.has_exact_json_keys(v_data,array['plan_public_id','claimed_items','remaining_claimable_count','replayed']) is distinct from true
        or not internal.plan_is_uuid_v1(v_data->'plan_public_id')
        or internal.is_json_integer_between(v_data->'remaining_claimable_count',0,100) is distinct from true
        or pg_catalog.jsonb_typeof(v_data->'claimed_items') is distinct from 'array'
        or pg_catalog.jsonb_array_length(v_data->'claimed_items')>3 then return false; end if;
      for v_claim in select value from pg_catalog.jsonb_array_elements(v_data->'claimed_items') loop
        if internal.has_exact_json_keys(v_claim,array['item','claimed_at','claim_expires_at','claim_renewal_count']) is distinct from true
          or not internal.plan_is_item_v1(v_claim->'item') or v_claim#>>'{item,status}'<>'in_progress'
          or v_claim#>'{item,plan_public_id}' is distinct from v_data->'plan_public_id'
          or v_claim->'claim_renewal_count' is distinct from '0'::jsonb
          or not internal.plan_is_time_v1(v_claim->'claimed_at') or not internal.plan_is_time_v1(v_claim->'claim_expires_at')
          or v_claim#>'{item,claim_expires_at}' is distinct from v_claim->'claim_expires_at' then return false; end if;
      end loop;
    when 'renew_content_plan_claim' then
      if internal.has_exact_json_keys(v_data,array['plan_item_public_id','claim_expires_at','claim_renewal_count','replayed']) is distinct from true
        or not internal.plan_is_uuid_v1(v_data->'plan_item_public_id')
        or not internal.plan_is_time_v1(v_data->'claim_expires_at')
        or v_data->'claim_renewal_count' is distinct from '1'::jsonb then return false; end if;
    when 'report_content_plan_item_failure','retry_content_plan_item' then
      if internal.has_exact_json_keys(v_data,array['item','plan','replayed']) is distinct from true
        or not internal.plan_is_item_v1(v_data->'item') or not internal.plan_is_summary_v1(v_data->'plan')
        or v_data#>'{item,plan_public_id}' is distinct from v_data#>'{plan,plan_public_id}'
        or v_data#>>'{item,status}'<>(case when p_operation='retry_content_plan_item' then 'pending' else 'failed' end) then return false; end if;
    when 'replace_discarded_plan_item' then
      if internal.has_exact_json_keys(v_data,array['item','plan','replacement_history_public_id','replayed']) is distinct from true
        or not internal.plan_is_item_v1(v_data->'item') or not internal.plan_is_summary_v1(v_data->'plan')
        or v_data#>'{item,plan_public_id}' is distinct from v_data#>'{plan,plan_public_id}'
        or v_data#>>'{item,status}'<>'pending' or not internal.plan_is_uuid_v1(v_data->'replacement_history_public_id') then return false; end if;
    when 'cancel_content_plan' then
      if internal.has_exact_json_keys(v_data,array['plan','changed_count','preserved_completed_count','replayed']) is distinct from true
        or not internal.plan_is_summary_v1(v_data->'plan') or v_data#>>'{plan,status}'<>'cancelled'
        or internal.is_json_integer_between(v_data->'changed_count',0,100) is distinct from true
        or internal.is_json_integer_between(v_data->'preserved_completed_count',0,100) is distinct from true then return false; end if;
    else return false;
  end case;
  return true;
exception when others then return false;
end;
$$;

create function internal.plan_replay_operation_v4(p_operation_id bigint, p_operation text, p_snapshot jsonb)
returns jsonb language plpgsql volatile security invoker set search_path = '' as $$
declare v_response jsonb; v_ref jsonb; v_claim jsonb; v_event internal.content_plan_item_events;
  v_items jsonb:='[]'::jsonb; v_index integer:=0; v_ledger internal.operation_ledger;
begin
  if internal.has_exact_json_keys(p_snapshot,array['schema_version','operation_name','resources','response','claim_event_public_ids']) is distinct from true
    or p_snapshot->'schema_version' is distinct from '4'::jsonb
    or p_snapshot->>'operation_name' is distinct from p_operation
    or pg_catalog.octet_length(p_snapshot::text)>65536
    or pg_catalog.jsonb_typeof(p_snapshot->'claim_event_public_ids') is distinct from 'array'
    or p_snapshot::text ~ '"(claim_token|reservation_token|access_token|refresh_token|password|secret|internal_id|actor_user_id|source_data|content_payload)"[[:space:]]*:'
    or not internal.plan_is_response_v4(p_operation,p_snapshot->'response')
    or internal.is_safe_operation_response_snapshot_v2(p_operation,
      pg_catalog.jsonb_build_object('schema_version',1,'operation_name',p_operation,'resources',p_snapshot->'resources')) is distinct from true then
    raise exception using errcode='P0001',message='INTERNAL_ERROR';
  end if;
  select * into v_ledger from internal.operation_ledger where id=p_operation_id and operation_name=p_operation;
  if not found or v_ledger.actor_user_id is distinct from internal.request_actor_user_id_v1() then
    raise exception using errcode='P0001',message='OWNER_ACCESS_REQUIRED';
  end if;
  v_response:=p_snapshot->'response';
  if p_operation='claim_content_plan_items' then
    if pg_catalog.jsonb_array_length(p_snapshot->'claim_event_public_ids')<>
      pg_catalog.jsonb_array_length(v_response#>'{data,claimed_items}') then
      raise exception using errcode='P0001',message='INTERNAL_ERROR';
    end if;
    for v_ref in select value from pg_catalog.jsonb_array_elements(p_snapshot->'claim_event_public_ids') loop
      if not internal.plan_is_uuid_v1(v_ref) then raise exception using errcode='P0001',message='INTERNAL_ERROR'; end if;
      select * into v_event from internal.content_plan_item_events e where e.public_id=(v_ref#>>'{}')::uuid
        and e.workspace_id=v_ledger.workspace_id and e.operation_id=v_ledger.id and e.actor_user_id=v_ledger.actor_user_id
        and e.event_type in ('claimed','reclaimed');
      v_claim:=v_response#>'{data,claimed_items}'->v_index;
      if not found or v_event.plan_public_id::text is distinct from v_response#>>'{data,plan_public_id}'
        or v_event.item_public_id::text is distinct from v_claim#>>'{item,plan_item_public_id}'
        or internal.iso_timestamp_v1(v_event.claimed_at) is distinct from v_claim->>'claimed_at'
        or internal.iso_timestamp_v1(v_event.claim_expires_at) is distinct from v_claim->>'claim_expires_at'
        or v_event.attempt_count is distinct from (v_claim#>>'{item,attempt_count}')::integer then
        raise exception using errcode='P0001',message='INTERNAL_ERROR';
      end if;
      v_items:=v_items||pg_catalog.jsonb_build_array(v_claim||pg_catalog.jsonb_build_object('claim_token',v_event.claim_token));
      v_index:=v_index+1;
    end loop;
    v_response:=pg_catalog.jsonb_set(v_response,'{data,claimed_items}',v_items);
  elsif p_snapshot->'claim_event_public_ids'<>'[]'::jsonb then
    raise exception using errcode='P0001',message='INTERNAL_ERROR';
  end if;
  return pg_catalog.jsonb_set(v_response,'{data,replayed}','true'::jsonb);
end;
$$;

create function internal.plan_complete_operation_v4(
  p_operation_id bigint, p_operation text, p_plan_public_id uuid, p_response jsonb
)
returns void language plpgsql volatile security invoker set search_path = '' as $$
declare v_response jsonb:=p_response; v_refs jsonb:='[]'::jsonb; v_claim jsonb; v_event internal.content_plan_item_events;
  v_items jsonb:='[]'::jsonb; v_snapshot jsonb; v_replayed jsonb; v_actor uuid;
begin
  v_actor:=internal.request_actor_user_id_v1();
  if p_operation='claim_content_plan_items' then
    for v_claim in select value from pg_catalog.jsonb_array_elements(p_response#>'{data,claimed_items}') loop
      select * into v_event from internal.content_plan_item_events e where e.operation_id=p_operation_id
        and e.item_public_id=(v_claim#>>'{item,plan_item_public_id}')::uuid and e.actor_user_id=v_actor
        and e.event_type in ('claimed','reclaimed');
      if not found or v_claim->>'claim_token' is distinct from v_event.claim_token::text then
        raise exception using errcode='P0001',message='INTERNAL_ERROR';
      end if;
      v_refs:=v_refs||pg_catalog.jsonb_build_array(v_event.public_id);
      v_items:=v_items||pg_catalog.jsonb_build_array(v_claim-'claim_token');
    end loop;
    if (select count(*) from internal.content_plan_item_events where operation_id=p_operation_id)<>
      pg_catalog.jsonb_array_length(v_items) then raise exception using errcode='P0001',message='INTERNAL_ERROR'; end if;
    v_response:=pg_catalog.jsonb_set(v_response,'{data,claimed_items}',v_items);
  end if;
  v_snapshot:=pg_catalog.jsonb_build_object('schema_version',4,'operation_name',p_operation,
    'resources',pg_catalog.jsonb_build_array(pg_catalog.jsonb_build_object('resource_type','content_plan',
      'public_id',p_plan_public_id,'status','updated','occurred_at',internal.iso_timestamp_v1(pg_catalog.clock_timestamp()))),
    'response',v_response,'claim_event_public_ids',v_refs);
  -- The replay validator checks every immutable relation before completion too.
  v_replayed:=internal.plan_replay_operation_v4(p_operation_id,p_operation,v_snapshot);
  if pg_catalog.jsonb_set(v_replayed,'{data,replayed}','false'::jsonb) is distinct from p_response then
    raise exception using errcode='P0001',message='INTERNAL_ERROR';
  end if;
  update internal.operation_ledger set response_snapshot=v_snapshot,target_type='content_plan',
    target_public_id=p_plan_public_id,completed_at=pg_catalog.clock_timestamp()
    where id=p_operation_id and actor_user_id=v_actor and operation_name=p_operation and completed_at is null;
  if not found then raise exception using errcode='P0001',message='OWNER_ACCESS_REQUIRED'; end if;
end;
$$;

create function internal.plan_raise_error_v1(p_sqlstate text, p_message text)
returns void language plpgsql volatile security invoker set search_path = '' as $$
begin
  if p_sqlstate in ('40P01','40001','55P03','57014') then
    raise exception using errcode='P0001',message='DATABASE_BUSY';
  end if;
  if p_sqlstate='P0001' and p_message in ('AUTH_REQUIRED','OAUTH_CLIENT_REQUIRED','OWNER_ACCESS_REQUIRED',
    'OPERATION_KEY_REUSED','RATE_LIMITED','DATABASE_BUSY','VALIDATION_FAILED','PLAN_NOT_FOUND','PLAN_ITEM_NOT_FOUND',
    'PLAN_STATUS_CONFLICT','PLAN_ITEM_CLAIM_MISMATCH','PLAN_ITEM_CLAIM_EXPIRED','PLAN_CLAIM_RENEWAL_LIMIT',
    'PLAN_ITEM_REPLACEMENT_BLOCKED','POST_NOT_FOUND','SCHEDULE_CONFLICT','INTERNAL_ERROR') then
    raise exception using errcode='P0001',message=p_message;
  end if;
  raise exception using errcode='P0001',message='INTERNAL_ERROR';
end;
$$;

-- Transfer only the explicitly named new helpers; callers can execute none.
grant create on schema internal to content_producer_api_owner;
do $$
declare v_function regprocedure;
begin
  for v_function in select p.oid::regprocedure from pg_catalog.pg_proc p
    join pg_catalog.pg_namespace n on n.oid=p.pronamespace where n.nspname='internal' and p.proname=any(array[
      'plan_assert_write_input_v1','plan_safe_reason_v1','plan_failure_code_v1','plan_validate_event_v1','plan_lock_target_v1',
      'plan_assert_current_claim_v1','plan_refresh_status_v1','plan_project_summary_v1','plan_project_item_v1',
      'plan_append_event_v1','plan_is_uuid_v1','plan_is_time_v1','plan_is_summary_v1','plan_is_item_v1',
      'plan_is_response_v4','plan_replay_operation_v4','plan_complete_operation_v4','plan_raise_error_v1'])
  loop
    execute pg_catalog.format('alter function %s owner to content_producer_api_owner',v_function);
    execute pg_catalog.format('revoke all on function %s from public,anon,authenticated,service_role',v_function);
  end loop;
end;
$$;
revoke create on schema internal from content_producer_api_owner;
