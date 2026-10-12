-- CR-015: complete existing signatures; no additional API function.
create or replace function internal.project_metric_source_v1(p_payload jsonb) returns jsonb
language sql stable security invoker set search_path='' as $$
  select pg_catalog.jsonb_build_object('source_type',p_payload->'source_type',
    'metric_definition_version',case when internal.metric_known_source_v1(p_payload) then 1 else null end,
    'source_reported_at',p_payload->'source_reported_at','timezone',p_payload->'timezone','note',p_payload->'note');
$$;
create function internal.metric_snapshot_v1(m public.post_metrics,post_uuid uuid,flags text[] default null) returns jsonb
language sql stable security invoker set search_path='' as $$
  select pg_catalog.jsonb_build_object('metric_snapshot_public_id',m.public_id,'post_public_id',post_uuid,
    'captured_at',internal.iso_timestamp_v1(m.captured_at),'metrics',internal.metric_numbers_v1(m),
    'source',internal.project_metric_source_v1(m.metrics_payload),'anomaly_flags',coalesce(flags,m.recorded_anomaly_flags),
    'created_at',internal.iso_timestamp_v1(m.created_at));
$$;
create or replace function internal.project_metric_snapshot_v1(p_public_id uuid,p_post_public_id uuid,p_captured_at timestamptz,
  p_views bigint,p_reach bigint,p_reactions bigint,p_likes bigint,p_comments bigint,p_shares bigint,p_saves bigint,p_follows bigint,
  p_watch_time_seconds numeric,p_average_watch_time_seconds numeric,p_metrics_payload jsonb,p_created_at timestamptz)
returns jsonb language sql stable security invoker set search_path='' as $$
  select pg_catalog.jsonb_build_object('metric_snapshot_public_id',p_public_id,'post_public_id',p_post_public_id,
    'captured_at',internal.iso_timestamp_v1(p_captured_at),'metrics',pg_catalog.jsonb_build_object('views',p_views,'reach',p_reach,
      'reactions',p_reactions,'likes',p_likes,'comments',p_comments,'shares',p_shares,'saves',p_saves,'follows',p_follows,
      'watch_time_seconds',p_watch_time_seconds,'average_watch_time_seconds',p_average_watch_time_seconds),
    'source',internal.project_metric_source_v1(p_metrics_payload),'anomaly_flags',coalesce(
      (select recorded_anomaly_flags from public.post_metrics where public_id=p_public_id),'{}'::text[]),
    'created_at',internal.iso_timestamp_v1(p_created_at));
$$;
create or replace function api.get_post_performance(p_request_schema_version integer,p_workspace_public_id uuid,p_post_public_id uuid,
  p_captured_from timestamptz default null,p_captured_to timestamptz default null,p_limit integer default 20,p_cursor text default null)
returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare w record; p public.posts; c record; cursor_time timestamptz; cursor_id bigint; snapshots jsonb; deltas jsonb;
  latest public.post_metrics; more boolean; last_time timestamptz; last_id bigint; from_time timestamptz; to_time timestamptz; state text; message text;
begin
  perform internal.assert_request_context_v1();
  if p_limit is null or p_limit not between 1 and 100
    or (p_captured_from is not null and not pg_catalog.isfinite(p_captured_from))
    or (p_captured_to is not null and not pg_catalog.isfinite(p_captured_to))
    or (p_captured_from is not null and p_captured_to is not null and p_captured_from>p_captured_to) then
    raise exception using errcode='P0001',message='VALIDATION_FAILED'; end if;
  perform internal.begin_read_v1(p_request_schema_version,'read'); select * into w from internal.resolve_workspace_owner_v1(p_workspace_public_id);
  select * into p from public.posts where workspace_id=w.workspace_id and public_id=p_post_public_id;
  if p.id is null then raise exception using errcode='P0001',message='POST_NOT_FOUND'; end if;
  if p.status not in ('posted','archived') then raise exception using errcode='P0001',message='POST_NOT_PUBLISHED'; end if;
  if p_cursor is not null then
    select * into c from internal.decode_read_cursor_v1(p_cursor,'metrics'); cursor_time:=c.sort_value::timestamptz; cursor_id:=c.tie_id;
    if not exists(select 1 from public.post_metrics where id=cursor_id and post_id=p.id and workspace_id=w.workspace_id
      and captured_at=cursor_time and (p_captured_from is null or captured_at>=p_captured_from)
      and (p_captured_to is null or captured_at<=p_captured_to)) then raise exception using errcode='P0001',message='VALIDATION_FAILED'; end if;
  end if;
  select * into latest from public.post_metrics where workspace_id=w.workspace_id and post_id=p.id
    and (p_captured_from is null or captured_at>=p_captured_from) and (p_captured_to is null or captured_at<=p_captured_to)
    order by captured_at desc,id desc limit 1;
  with history as (
    select m,pg_catalog.lag(m) over(order by m.captured_at,m.id) prior from public.post_metrics m
    where m.workspace_id=w.workspace_id and m.post_id=p.id and (p_captured_from is null or m.captured_at>=p_captured_from)
      and (p_captured_to is null or m.captured_at<=p_captured_to)
  ), page_plus as (
    select * from history where p_cursor is null or ((m).captured_at,(m).id)<(cursor_time,cursor_id)
      order by (m).captured_at desc,(m).id desc limit p_limit+1
  ), numbered as (select *,pg_catalog.row_number() over(order by (m).captured_at desc,(m).id desc) pos from page_plus)
  select coalesce(pg_catalog.jsonb_agg(internal.metric_snapshot_v1(m,p.public_id,internal.metric_flags_v1(m,prior,p.published_at))
      order by (m).captured_at desc,(m).id desc) filter(where pos<=p_limit),'[]'::jsonb),
    coalesce(pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object('from_captured_at',internal.iso_timestamp_v1((prior).captured_at),
      'to_captured_at',internal.iso_timestamp_v1((m).captured_at),'delta',internal.metric_delta_v1(m,prior),
      'negative_delta',internal.metric_negative_v1(internal.metric_delta_v1(m,prior)),
      'caveat','Cumulative snapshots are not summed; negative totals may reflect corrections. Average watch-time change is not cumulative gain.')
      order by (m).captured_at desc,(m).id desc) filter(where pos<=p_limit and (prior).id is not null
        and internal.metric_compatible_v1((m).metrics_payload,(prior).metrics_payload)),'[]'::jsonb),
    count(*)>p_limit,min((m).captured_at) filter(where pos<=p_limit),max((m).captured_at) filter(where pos<=p_limit),
    max((m).id) filter(where pos=p_limit),max((m).captured_at) filter(where pos=p_limit)
  into snapshots,deltas,more,from_time,to_time,last_id,last_time from numbered;
  return pg_catalog.jsonb_build_object('response_schema_version',1,'data',pg_catalog.jsonb_build_object('post_public_id',p.public_id,
    'observation_period',pg_catalog.jsonb_build_object('from',internal.iso_timestamp_v1(from_time),'to',internal.iso_timestamp_v1(to_time)),
    'metric_definition_version',case when internal.metric_known_source_v1(latest.metrics_payload) then 1 else null end,
    'snapshots',snapshots,'latest_snapshot',case when latest.id is not null then internal.metric_snapshot_v1(latest,p.public_id) else null end,
    'compatible_deltas',deltas,'next_cursor',case when more then internal.encode_read_cursor_v1('metrics',internal.iso_timestamp_v1(last_time),last_id) else null end,
    'has_more',more));
exception when query_canceled then perform internal.metric_raise_v1('57014','');
  when others then get stacked diagnostics state=returned_sqlstate,message=message_text;
    if state in ('22007','22008','22P02') then message:='VALIDATION_FAILED'; end if;
    perform internal.metric_raise_v1(state,message);
end; $$;

create function internal.metric_dimensions_v1(p public.posts,dimensions text[]) returns jsonb
language plpgsql immutable security invoker set search_path='' as $$
declare result jsonb:='{}'; d text; value jsonb;
begin
  foreach d in array dimensions loop
    value:=case d when 'topic' then pg_catalog.to_jsonb(p.topic_key) when 'format' then pg_catalog.to_jsonb(p.format_key)
      when 'interaction_goal' then pg_catalog.to_jsonb(p.interaction_goal) when 'profile' then p.generation_snapshot->'profile_key'
      when 'fact_count' then p.generation_snapshot->'fact_count_applied'
      when 'hook_pattern' then pg_catalog.to_jsonb(case
        when pg_catalog.lower(p.content_payload->>'hook') like 'did you know%' then 'did_you_know'
        when pg_catalog.strpos(p.content_payload->>'hook','?')>0 then 'question'
        when pg_catalog.strpos(pg_catalog.lower(p.content_payload->>'hook'),' vs ')>0 then 'comparison'
        when pg_catalog.strpos(pg_catalog.lower(p.content_payload->>'hook'),'myth')>0 then 'myth_vs_fact' else 'statement' end)
      when 'cta_pattern' then pg_catalog.to_jsonb(case
        when pg_catalog.strpos(pg_catalog.lower(p.content_payload->>'cta'),'share')>0 then 'share'
        when pg_catalog.strpos(pg_catalog.lower(p.content_payload->>'cta'),'save')>0 then 'save'
        when pg_catalog.strpos(pg_catalog.lower(p.content_payload->>'cta'),'comment')>0 then 'comment'
        when pg_catalog.strpos(pg_catalog.lower(p.content_payload->>'cta'),'follow')>0 then 'follow' else 'other' end) end;
    result:=result||pg_catalog.jsonb_build_object(d,value);
  end loop;
  return result;
end; $$;
create function internal.metric_median_v1(values_array numeric[]) returns numeric
language sql immutable security invoker set search_path='' as $$
  select case when pg_catalog.cardinality(values_array)>0 then
    (values_array[(pg_catalog.cardinality(values_array)+1)/2]+values_array[(pg_catalog.cardinality(values_array)+2)/2])/2 end;
$$;
create function internal.metric_insight_rows_v1(w bigint,page bigint,niche text,from_time timestamptz,to_time timestamptz,dimensions text[],metric text)
returns table(post_public_id uuid,dimension_values jsonb,source_type text,metric_value numeric,age_days numeric,captured_at timestamptz,excluded_reason text)
language sql stable security invoker set search_path='' as $$
  with observations as (
    select p,m,internal.metric_dimensions_v1(p,dimensions) dims,
      (internal.metric_numbers_v1(m)->>metric)::numeric val
    from public.posts p left join lateral (select x.* from public.post_metrics x where x.workspace_id=w and x.post_id=p.id
      and (from_time is null or x.captured_at>=from_time) and (to_time is null or x.captured_at<=to_time)
      order by x.captured_at desc,x.id desc limit 1) m on true
    where p.workspace_id=w and p.page_id=page and p.niche_key=niche
  ) select (p).public_id,dims,(m).metrics_payload->>'source_type',val,
    extract(epoch from ((m).captured_at-(p).published_at))/86400::numeric,(m).captured_at,
    case when (p).status not in ('posted','archived') then 'not_published'
      when (m).id is null then 'no_snapshot_in_period' when val is null then 'missing_metric'
      when not internal.metric_known_source_v1((m).metrics_payload) then 'unknown_source_or_definition'
      when exists(select 1 from pg_catalog.jsonb_each(dims) e where e.value='null'::jsonb) then 'missing_dimension'
      when (p).published_at is null or not pg_catalog.isfinite((p).published_at) or (m).captured_at<(p).published_at then 'invalid_observation_age'
      else null end from observations;
$$;
create or replace function api.get_performance_insights(p_request_schema_version integer,p_workspace_public_id uuid,p_page_public_id uuid,
  p_niche_key text,p_captured_from timestamptz default null,p_captured_to timestamptz default null,p_dimensions text[] default null,
  p_metric text default null,p_minimum_sample_size integer default 5,p_limit integer default 20)
returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare w record; p public.pages; n public.niches; c public.page_niche_configs; result jsonb;
begin
  perform internal.assert_request_context_v1();
  if p_niche_key is null or p_niche_key !~ '^[a-z][a-z0-9_]{1,49}$' or p_dimensions is null or pg_catalog.cardinality(p_dimensions) not between 1 and 5
    or (select count(distinct d) from pg_catalog.unnest(p_dimensions) d)<>pg_catalog.cardinality(p_dimensions)
    or exists(select 1 from pg_catalog.unnest(p_dimensions) d where d is null or d not in ('topic','format','interaction_goal','profile','fact_count','hook_pattern','cta_pattern'))
    or p_metric is null or p_metric not in ('views','reach','reactions','likes','comments','shares','saves','follows','watch_time_seconds','average_watch_time_seconds')
    or p_minimum_sample_size is null or p_minimum_sample_size not between 1 and 100 or p_limit is null or p_limit not between 1 and 50
    or (p_captured_from is not null and not pg_catalog.isfinite(p_captured_from)) or (p_captured_to is not null and not pg_catalog.isfinite(p_captured_to))
    or (p_captured_from is not null and p_captured_to is not null and p_captured_from>p_captured_to) then
    raise exception using errcode='P0001',message='VALIDATION_FAILED'; end if;
  perform internal.begin_read_v1(p_request_schema_version,'expensive_read'); select * into w from internal.resolve_workspace_owner_v1(p_workspace_public_id);
  select * into n from public.niches where key=p_niche_key;
  if n.id is null then perform internal.raise_read_error_v1('MODULE_NOT_FOUND'); end if;
  if n.status<>'active' then perform internal.raise_read_error_v1('MODULE_DISABLED'); end if;
  select * into p from public.pages where workspace_id=w.workspace_id and public_id=p_page_public_id;
  if p.id is null then perform internal.raise_read_error_v1('PAGE_NOT_FOUND'); end if;
  select * into c from public.page_niche_configs where workspace_id=w.workspace_id and page_id=p.id and niche_key=p_niche_key;
  if c.id is null or not c.is_enabled then perform internal.raise_read_error_v1('MODULE_DISABLED'); end if;
  if c.config_schema_version<>n.config_schema_version or c.config_schema_version<>1 then perform internal.raise_read_error_v1('CONFIG_SCHEMA_UNSUPPORTED'); end if;
  with rows as materialized (select * from internal.metric_insight_rows_v1(w.workspace_id,p.id,p_niche_key,p_captured_from,p_captured_to,p_dimensions,p_metric)),
  grouped as (
    select dimension_values,count(*) sample_size,count(distinct source_type) sources,
      pg_catalog.array_agg(metric_value order by metric_value) values_array,avg(metric_value) mean_value,min(metric_value) min_value,max(metric_value) max_value,
      pg_catalog.array_agg(age_days order by age_days) ages,min(age_days) min_age,max(age_days) max_age,min(captured_at) first_time,max(captured_at) last_time
    from rows where excluded_reason is null group by dimension_values
  ), groups as (
    select pg_catalog.jsonb_build_object('dimension_values',dimension_values,'sample_size',sample_size,
      'age_distribution',pg_catalog.jsonb_build_object('min_days',min_age,'median_days',internal.metric_median_v1(ages),'max_days',max_age),
      'metric_summary',case when sources=1 then pg_catalog.jsonb_build_object('median',internal.metric_median_v1(values_array),
        'mean',mean_value,'min',min_value,'max',max_value) else null end,
      'observed_period',pg_catalog.jsonb_build_object('from',internal.iso_timestamp_v1(first_time),'to',internal.iso_timestamp_v1(last_time)),
      'evidence_strength',case when sources<>1 or sample_size<p_minimum_sample_size then 'insufficient' else 'exploratory' end,
      'caveats',pg_catalog.jsonb_build_array('Descriptive early signal only, not a causal conclusion or winner.',
        'One latest observation per post; cumulative history is never summed.',
        'Post age, topic, design, distribution, timing and Page maturity confound comparisons.',
        case when sources<>1 then 'Mixed sources are incompatible for a combined metric summary.'
          when sample_size<p_minimum_sample_size then 'The requested minimum sample size was not met.' else 'No automated recommendation or configuration change is made.' end,
        'Future reported observations are unverified; missing observations and dimensions are excluded.')) obj,sample_size,dimension_values
    from grouped order by sample_size desc,dimension_values::text limit p_limit
  ) select pg_catalog.jsonb_build_object('response_schema_version',1,'data',pg_catalog.jsonb_build_object(
    'scope',pg_catalog.jsonb_build_object('workspace_public_id',p_workspace_public_id,'page_public_id',p_page_public_id,'niche_key',p_niche_key),
    'observation_period',pg_catalog.jsonb_build_object('requested_from',internal.iso_timestamp_v1(p_captured_from),'requested_to',internal.iso_timestamp_v1(p_captured_to),
      'observed_from',(select internal.iso_timestamp_v1(min(captured_at)) from rows where excluded_reason is null),
      'observed_to',(select internal.iso_timestamp_v1(max(captured_at)) from rows where excluded_reason is null)),
    'metric_definition_version',case when exists(select 1 from rows where excluded_reason is null) then 1 else null end,
    'eligible_post_count',(select count(*) from rows where excluded_reason is null),'excluded_post_count',(select count(*) from rows where excluded_reason is not null),
    'excluded_reasons',(select pg_catalog.jsonb_build_object('not_published',count(*) filter(where excluded_reason='not_published'),
      'no_snapshot_in_period',count(*) filter(where excluded_reason='no_snapshot_in_period'),'missing_metric',count(*) filter(where excluded_reason='missing_metric'),
      'unknown_source_or_definition',count(*) filter(where excluded_reason='unknown_source_or_definition'),
      'missing_dimension',count(*) filter(where excluded_reason='missing_dimension'),'invalid_observation_age',count(*) filter(where excluded_reason='invalid_observation_age')) from rows),
    'groups',coalesce((select pg_catalog.jsonb_agg(obj order by sample_size desc,dimension_values::text) from groups),'[]'::jsonb))) into result;
  return result;
end; $$;

grant create on schema internal to content_producer_api_owner;
do $$ declare r record; begin
  for r in select p.oid::regprocedure f from pg_catalog.pg_proc p join pg_catalog.pg_namespace n on n.oid=p.pronamespace
    where n.nspname='internal' and p.proname in ('metric_snapshot_v1','metric_dimensions_v1','metric_median_v1','metric_insight_rows_v1') loop
    execute pg_catalog.format('alter function %s owner to content_producer_api_owner',r.f);
    execute pg_catalog.format('revoke all on function %s from public,anon,authenticated,service_role',r.f);
  end loop;
end $$;
revoke create on schema internal from content_producer_api_owner;
