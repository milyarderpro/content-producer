-- CR-015 accepted before CLI created this migration. Application append-only metrics.
alter table public.post_metrics add column recorded_anomaly_flags text[] not null default '{}';
alter table public.post_metrics add constraint post_metrics_recorded_flags_check check (
  recorded_anomaly_flags <@ array['negative_cumulative_delta','source_incompatible','source_metadata_missing',
    'capture_before_publication','capture_in_future']::text[]
  and array_position(recorded_anomaly_flags,null) is null and cardinality(recorded_anomaly_flags)<=5);

create function internal.metric_values_v1(input jsonb) returns jsonb
language plpgsql immutable security invoker set search_path='' as $$
declare k text; v jsonb; n numeric; result jsonb:='{}'; known boolean:=false;
begin
  if pg_catalog.jsonb_typeof(input) is distinct from 'object' or exists(
    select 1 from pg_catalog.jsonb_object_keys(input) key where key not in
    ('views','reach','reactions','likes','comments','shares','saves','follows','watch_time_seconds','average_watch_time_seconds')) then
    raise exception using errcode='P0001',message='VALIDATION_FAILED'; end if;
  foreach k in array array['views','reach','reactions','likes','comments','shares','saves','follows','watch_time_seconds','average_watch_time_seconds'] loop
    v:=input->k;
    if v is null or v='null'::jsonb then result:=result||pg_catalog.jsonb_build_object(k,null); continue; end if;
    if pg_catalog.jsonb_typeof(v) is distinct from 'number' then raise exception using errcode='P0001',message='VALIDATION_FAILED'; end if;
    n:=(v#>>'{}')::numeric;
    if n<0 or n::text in ('NaN','Infinity','-Infinity') then raise exception using errcode='P0001',message='VALIDATION_FAILED'; end if;
    if k not in ('watch_time_seconds','average_watch_time_seconds') and (n<>pg_catalog.trunc(n) or n>9223372036854775807::numeric) then
      raise exception using errcode='P0001',message='VALIDATION_FAILED'; end if;
    result:=result||pg_catalog.jsonb_build_object(k,pg_catalog.trim_scale(n)); known:=true;
  end loop;
  if not known or (result->'likes'<>'null'::jsonb and result->'reactions'<>'null'::jsonb
    and (result->>'likes')::numeric>(result->>'reactions')::numeric) then
    raise exception using errcode='P0001',message='VALIDATION_FAILED'; end if;
  return result;
exception when numeric_value_out_of_range then raise exception using errcode='P0001',message='VALIDATION_FAILED';
end; $$;

create function internal.metric_source_v1(input jsonb) returns jsonb
language plpgsql stable security invoker set search_path='' as $$
declare at_text text; zone text; note text;
begin
  if pg_catalog.jsonb_typeof(input) is distinct from 'object' or pg_catalog.octet_length(input::text)>4096
    or input->'metric_definition_version' is distinct from '1'::jsonb
    or input->>'source_type' is null or input->>'source_type' not in ('facebook_ui','facebook_export','user_reported','other')
    or exists(select 1 from pg_catalog.jsonb_object_keys(input) key where key not in
      ('source_type','metric_definition_version','source_reported_at','timezone','note')) then
    raise exception using errcode='P0001',message='VALIDATION_FAILED'; end if;
  if input ? 'source_reported_at' and input->'source_reported_at'<>'null'::jsonb then
    if pg_catalog.jsonb_typeof(input->'source_reported_at') is distinct from 'string'
      or internal.is_valid_timestamp_text(input->>'source_reported_at') is distinct from true then
      raise exception using errcode='P0001',message='VALIDATION_FAILED'; end if;
    at_text:=internal.iso_timestamp_v1((input->>'source_reported_at')::timestamptz);
  end if;
  if input ? 'timezone' and input->'timezone'<>'null'::jsonb then
    if pg_catalog.jsonb_typeof(input->'timezone') is distinct from 'string' or internal.is_valid_timezone_name(input->>'timezone') is distinct from true then
      raise exception using errcode='P0001',message='VALIDATION_FAILED'; end if;
    zone:=input->>'timezone';
  end if;
  if input ? 'note' and input->'note'<>'null'::jsonb then
    note:=pg_catalog.btrim(input->>'note');
    if pg_catalog.jsonb_typeof(input->'note') is distinct from 'string' or pg_catalog.char_length(note) not between 1 and 500
      or note ~ '[[:cntrl:]]' or note ~* '(bearer[[:space:]]|access_token|refresh_token|service_role)' then
      raise exception using errcode='P0001',message='VALIDATION_FAILED'; end if;
  end if;
  return pg_catalog.jsonb_build_object('source_type',input->>'source_type','metric_definition_version',1,
    'source_reported_at',at_text,'timezone',zone,'note',note);
end; $$;

create function internal.metric_known_source_v1(source jsonb) returns boolean
language sql stable security invoker set search_path='' as $$
  select coalesce(source->'metric_definition_version'='1'::jsonb and source->>'source_type' in
    ('facebook_ui','facebook_export','user_reported','other') and internal.is_valid_metrics_payload_v1(source),false);
$$;
create function internal.metric_compatible_v1(a jsonb,b jsonb) returns boolean
language sql stable security invoker set search_path='' as $$
  select internal.metric_known_source_v1(a) and internal.metric_known_source_v1(b)
    and a->'source_type'=b->'source_type' and a->'metric_definition_version'=b->'metric_definition_version';
$$;
create function internal.metric_numbers_v1(m public.post_metrics) returns jsonb
language sql immutable security invoker set search_path='' as $$
  select pg_catalog.jsonb_build_object('views',m.views,'reach',m.reach,'reactions',m.reactions,'likes',m.likes,
    'comments',m.comments,'shares',m.shares,'saves',m.saves,'follows',m.follows,
    'watch_time_seconds',m.watch_time_seconds,'average_watch_time_seconds',m.average_watch_time_seconds);
$$;
create function internal.metric_delta_v1(a public.post_metrics,b public.post_metrics) returns jsonb
language sql immutable security invoker set search_path='' as $$
  select pg_catalog.jsonb_build_object('views',a.views::numeric-b.views,'reach',a.reach::numeric-b.reach,
    'reactions',a.reactions::numeric-b.reactions,'likes',a.likes::numeric-b.likes,'comments',a.comments::numeric-b.comments,
    'shares',a.shares::numeric-b.shares,'saves',a.saves::numeric-b.saves,'follows',a.follows::numeric-b.follows,
    'watch_time_seconds',a.watch_time_seconds-b.watch_time_seconds,
    'average_watch_time_seconds',a.average_watch_time_seconds-b.average_watch_time_seconds);
$$;
create function internal.metric_negative_v1(d jsonb) returns boolean
language sql immutable security invoker set search_path='' as $$
  select exists(select 1 from pg_catalog.jsonb_each(d) e where e.key<>'average_watch_time_seconds'
    and pg_catalog.jsonb_typeof(e.value)='number' and (e.value#>>'{}')::numeric<0);
$$;
create function internal.metric_flags_v1(m public.post_metrics,prior public.post_metrics,published timestamptz) returns text[]
language plpgsql stable security invoker set search_path='' as $$
declare flags text[]:='{}';
begin
  if not internal.metric_known_source_v1(m.metrics_payload) then flags:=pg_catalog.array_append(flags,'source_metadata_missing'); end if;
  if prior.id is not null then
    if not internal.metric_compatible_v1(m.metrics_payload,prior.metrics_payload) then flags:=pg_catalog.array_append(flags,'source_incompatible');
    elsif internal.metric_negative_v1(internal.metric_delta_v1(m,prior)) then flags:=pg_catalog.array_append(flags,'negative_cumulative_delta'); end if;
  end if;
  if m.captured_at<published then flags:=pg_catalog.array_append(flags,'capture_before_publication'); end if;
  if m.captured_at>pg_catalog.statement_timestamp() then flags:=pg_catalog.array_append(flags,'capture_in_future'); end if;
  return array(select f from pg_catalog.unnest(flags) f order by f);
end; $$;
create function internal.metric_immutable_v1() returns trigger
language plpgsql security invoker set search_path='' as $$
begin raise exception using errcode='P0001',message='METRIC_SNAPSHOT_CONFLICT'; end; $$;
create trigger post_metrics_immutable before update on public.post_metrics for each row execute function internal.metric_immutable_v1();

create function internal.metric_response_v1(m public.post_metrics,post_uuid uuid) returns jsonb
language sql stable security invoker set search_path='' as $$
  select pg_catalog.jsonb_build_object('response_schema_version',1,'data',pg_catalog.jsonb_build_object(
    'metric_snapshot_public_id',m.public_id,'post_public_id',post_uuid,'captured_at',internal.iso_timestamp_v1(m.captured_at),
    'metrics',internal.metric_numbers_v1(m),'anomaly_flags',m.recorded_anomaly_flags,'replayed',false));
$$;
create function internal.metric_replay_v8(op bigint) returns jsonb
language plpgsql stable security invoker set search_path='' as $$
declare l internal.operation_ledger; m public.post_metrics; p public.posts; s jsonb; r jsonb;
begin
  select * into l from internal.operation_ledger where id=op and actor_user_id=internal.request_actor_user_id_v1(); s:=l.response_snapshot;
  if l.id is null or l.completed_at is null or l.operation_name is distinct from 'record_post_performance'
    or internal.has_exact_json_keys(s,array['schema_version','operation_name','target_public_id','post_public_id','response_hash']) is distinct from true
    or s->'schema_version' is distinct from '8'::jsonb or s->>'operation_name' is distinct from l.operation_name
    or l.target_type is distinct from 'metric_snapshot' or s->>'target_public_id' is distinct from l.target_public_id::text
    or pg_catalog.octet_length(s::text)>2048 then raise exception using errcode='P0001',message='INTERNAL_ERROR'; end if;
  select * into m from public.post_metrics where public_id=l.target_public_id and workspace_id=l.workspace_id and created_by_operation_id=l.id;
  select * into p from public.posts where id=m.post_id and workspace_id=m.workspace_id and page_id=m.page_id;
  if m.id is null or p.id is null or s->>'post_public_id' is distinct from p.public_id::text then
    raise exception using errcode='P0001',message='INTERNAL_ERROR'; end if;
  r:=internal.metric_response_v1(m,p.public_id);
  if pg_catalog.octet_length(r::text)>8192 or s->>'response_hash' is distinct from
    pg_catalog.encode(extensions.digest(pg_catalog.convert_to(r::text,'UTF8'),'sha256'),'hex') then
    raise exception using errcode='P0001',message='INTERNAL_ERROR'; end if;
  return pg_catalog.jsonb_set(r,'{data,replayed}','true'::jsonb);
end; $$;
create function internal.metric_complete_v8(op bigint,m public.post_metrics,post_uuid uuid) returns jsonb
language plpgsql volatile security invoker set search_path='' as $$
declare r jsonb; s jsonb;
begin
  if m.id is null or m.created_by_operation_id is distinct from op or not exists(select 1 from public.post_metrics x
    join public.posts p on p.id=x.post_id and p.workspace_id=x.workspace_id and p.page_id=x.page_id
    where x.id=m.id and x is not distinct from m and p.public_id=post_uuid) then
    raise exception using errcode='P0001',message='INTERNAL_ERROR'; end if;
  r:=internal.metric_response_v1(m,post_uuid);
  if pg_catalog.octet_length(r::text)>8192 then raise exception using errcode='P0001',message='INTERNAL_ERROR'; end if;
  s:=pg_catalog.jsonb_build_object('schema_version',8,'operation_name','record_post_performance','target_public_id',m.public_id,
    'post_public_id',post_uuid,'response_hash',pg_catalog.encode(extensions.digest(pg_catalog.convert_to(r::text,'UTF8'),'sha256'),'hex'));
  update internal.operation_ledger set response_snapshot=s,completed_at=pg_catalog.clock_timestamp(),target_type='metric_snapshot',target_public_id=m.public_id
    where id=op and workspace_id=m.workspace_id and actor_user_id=internal.request_actor_user_id_v1()
    and operation_name='record_post_performance' and completed_at is null;
  if not found then raise exception using errcode='P0001',message='INTERNAL_ERROR'; end if;
  return r;
end; $$;
create function internal.metric_raise_v1(state text,message text) returns void
language plpgsql stable security invoker set search_path='' as $$
declare code text:='INTERNAL_ERROR';
begin
  if state in ('40P01','40001','55P03','57014') then code:='DATABASE_BUSY';
  elsif message in ('AUTH_REQUIRED','OAUTH_CLIENT_REQUIRED','OWNER_ACCESS_REQUIRED','OPERATION_KEY_REUSED','RATE_LIMITED',
    'VALIDATION_FAILED','POST_NOT_FOUND','POST_NOT_PUBLISHED','METRIC_DEFINITION_AMBIGUOUS','METRIC_SNAPSHOT_CONFLICT') then code:=message;
  elsif state='23505' then code:='METRIC_SNAPSHOT_CONFLICT'; end if;
  raise exception using errcode='P0001',message=code;
end; $$;

grant insert on public.post_metrics to content_producer_api_owner;
grant usage on public.post_metrics_id_seq to content_producer_api_owner;
grant execute on function internal.is_valid_timestamp_text(text),internal.is_valid_timezone_name(text),internal.is_valid_metrics_payload_v1(jsonb)
  to content_producer_api_owner;
create policy post_metrics_api_owner_insert on public.post_metrics for insert to content_producer_api_owner
with check(exists(select 1 from public.workspaces w where w.id=post_metrics.workspace_id and w.is_active
  and w.owner_user_id=(select internal.current_auth_uid_v1())));
grant create on schema internal to content_producer_api_owner;
do $$ declare r record; begin
  for r in select p.oid::regprocedure f from pg_catalog.pg_proc p join pg_catalog.pg_namespace n on n.oid=p.pronamespace
    where n.nspname='internal' and p.proname in ('metric_values_v1','metric_source_v1','metric_known_source_v1','metric_compatible_v1',
    'metric_numbers_v1','metric_delta_v1','metric_negative_v1','metric_flags_v1','metric_immutable_v1','metric_response_v1',
    'metric_replay_v8','metric_complete_v8','metric_raise_v1') loop
    execute pg_catalog.format('alter function %s owner to content_producer_api_owner',r.f);
    execute pg_catalog.format('revoke all on function %s from public,anon,authenticated,service_role',r.f);
  end loop;
end $$;
revoke create on schema internal from content_producer_api_owner;
