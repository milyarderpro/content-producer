-- CR-062 task 2: katalog editorial owner. Tidak mengubah config/Page/post.
-- Semua business entrypoints memakai role API terbatas, bukan postgres/bypassrls.
create table public.trivia_editorial_definitions (
  id bigint generated always as identity primary key,
  public_id uuid not null default extensions.gen_random_uuid() unique,
  workspace_id bigint not null references public.workspaces(id) on delete cascade,
  kind text not null check (kind in ('format','topic','profile')),
  key text not null check (key ~ '^[a-z][a-z0-9_]{1,49}$'),
  version integer not null check (version > 0),
  definition_schema_version integer not null default 1 check (definition_schema_version=1),
  payload jsonb not null check (jsonb_typeof(payload)='object'),
  hash text not null check (hash ~ '^[0-9a-f]{64}$'),
  created_at timestamptz not null default clock_timestamp(),
  retired_at timestamptz,
  retirement_reason text,
  unique (workspace_id,kind,key,version),
  unique (workspace_id,public_id,version,hash,kind),
  check ((retired_at is null and retirement_reason is null) or
    (retired_at is not null and char_length(btrim(retirement_reason)) between 1 and 500))
);
create index trivia_editorial_workspace_cursor_idx
  on public.trivia_editorial_definitions(workspace_id,public_id);
create table internal.trivia_editorial_catalog_state (
  workspace_id bigint primary key references public.workspaces(id) on delete cascade,
  revision bigint not null default 0 check (revision>=0)
);
alter table public.trivia_editorial_definitions enable row level security;
alter table internal.trivia_editorial_catalog_state enable row level security;
revoke all on public.trivia_editorial_definitions, public.trivia_editorial_definitions_id_seq,
  internal.trivia_editorial_catalog_state from public,anon,authenticated,service_role;
grant select,insert on public.trivia_editorial_definitions to content_producer_api_owner;
grant update(retired_at,retirement_reason) on public.trivia_editorial_definitions to content_producer_api_owner;
grant usage,select on public.trivia_editorial_definitions_id_seq to content_producer_api_owner;
grant select,insert,update on internal.trivia_editorial_catalog_state to content_producer_api_owner;
create policy editorial_owner_select on public.trivia_editorial_definitions for select
  to content_producer_api_owner using (exists(select 1 from public.workspaces w
    where w.id=workspace_id and w.is_active and w.owner_user_id=(select auth.uid())));
create policy editorial_owner_insert on public.trivia_editorial_definitions for insert
  to content_producer_api_owner with check (exists(select 1 from public.workspaces w
    where w.id=workspace_id and w.is_active and w.owner_user_id=(select auth.uid())));
create policy editorial_owner_update on public.trivia_editorial_definitions for update
  to content_producer_api_owner using (exists(select 1 from public.workspaces w
    where w.id=workspace_id and w.is_active and w.owner_user_id=(select auth.uid())))
  with check (exists(select 1 from public.workspaces w
    where w.id=workspace_id and w.is_active and w.owner_user_id=(select auth.uid())));
create policy editorial_state_owner on internal.trivia_editorial_catalog_state for all
  to content_producer_api_owner using (exists(select 1 from public.workspaces w
    where w.id=workspace_id and w.is_active and w.owner_user_id=(select auth.uid())))
  with check (exists(select 1 from public.workspaces w
    where w.id=workspace_id and w.is_active and w.owner_user_id=(select auth.uid())));

create function internal.editorial_text_v1(p_value jsonb,p_max integer) returns boolean
language sql immutable security invoker set search_path='' as $$
  select coalesce(jsonb_typeof(p_value)='string' and char_length(btrim(p_value#>>'{}')) between 1 and p_max
    and (p_value#>>'{}') !~ '[\x01-\x08\x0B\x0C\x0E-\x1F\x7F]',false);
$$;
create function internal.editorial_strings_v1(p_value jsonb,p_min integer,p_max integer,p_chars integer,
  p_keys boolean default false) returns boolean
language plpgsql immutable security invoker set search_path='' as $$
begin
  if jsonb_typeof(p_value) is distinct from 'array' then return false; end if;
  return jsonb_array_length(p_value) between p_min and p_max and not exists (
    select 1 from jsonb_array_elements(p_value) x where not internal.editorial_text_v1(x.value,p_chars)
      or (p_keys and (x.value#>>'{}') !~ '^[a-z][a-z0-9_]{1,49}$'))
    and (not p_keys or (select count(distinct value) from jsonb_array_elements(p_value))=jsonb_array_length(p_value));
end; $$;
create function internal.editorial_hash_v1(p_kind text,p_key text,p_payload jsonb) returns text
language sql immutable strict security invoker set search_path='' as $$
  select encode(extensions.digest(convert_to(jsonb_build_object('kind',p_kind,'key',p_key,
    'definition_schema_version',1,'payload',p_payload)::text,'UTF8'),'sha256'),'hex');
$$;
create function internal.editorial_reference_shape_v1(p_ref jsonb) returns boolean
language sql immutable security invoker set search_path='' as $$
  select coalesce(internal.has_exact_json_keys(p_ref,array['public_id','version','hash'])
    and internal.trivia_is_valid_uuid_v4_v1(p_ref->>'public_id')
    and jsonb_typeof(p_ref->'public_id')='string'
    and internal.is_json_integer_between(p_ref->'version',1,2147483647)
    and jsonb_typeof(p_ref->'hash')='string' and p_ref->>'hash' ~ '^[0-9a-f]{64}$',false);
$$;
create function internal.editorial_reference_v1(p_workspace bigint,p_ref jsonb,p_kind text,
  p_bound_at timestamptz default null) returns public.trivia_editorial_definitions
language plpgsql stable security invoker set search_path='' as $$
declare d public.trivia_editorial_definitions;
begin
  if not internal.editorial_reference_shape_v1(p_ref) or p_kind not in ('format','topic','profile') then
    raise exception using errcode='P0001',message='VALIDATION_FAILED'; end if;
  select * into d from public.trivia_editorial_definitions where workspace_id=p_workspace
    and public_id=(p_ref->>'public_id')::uuid and version=(p_ref->>'version')::integer
    and hash=p_ref->>'hash' and kind=p_kind;
  -- bound_at hanya boleh berasal dari binding server yang telah tersimpan (paket 3).
  if d.id is null or (d.retired_at is not null and (p_bound_at is null or not isfinite(p_bound_at)
      or p_bound_at<d.created_at or p_bound_at>=d.retired_at)) then
    raise exception using errcode='P0001',message='EDITORIAL_DEFINITION_UNAVAILABLE'; end if;
  return d;
end; $$;
create function internal.editorial_density_v1(p_value jsonb) returns boolean
language plpgsql immutable security invoker set search_path='' as $$
declare entry record; v jsonb;
begin
  if jsonb_typeof(p_value) is distinct from 'object' then return false; end if;
  if (select count(*) from jsonb_object_keys(p_value)) not between 1 and 16 then return false; end if;
  for entry in select * from jsonb_each(p_value) loop
    v:=entry.value;
    if entry.key !~ '^[a-z][a-z0-9_]{1,49}$' or internal.has_exact_json_keys(v,array[
      'fact_count_min','fact_count_max','words_per_fact_min','words_per_fact_max','total_words_min','total_words_max']) is distinct from true
      or internal.is_json_integer_between(v->'fact_count_min',1,12) is distinct from true
      or internal.is_json_integer_between(v->'fact_count_max',(v->>'fact_count_min')::integer,12) is distinct from true
      or internal.is_json_integer_between(v->'words_per_fact_min',1,30) is distinct from true
      or internal.is_json_integer_between(v->'words_per_fact_max',(v->>'words_per_fact_min')::integer,30) is distinct from true
      or internal.is_json_integer_between(v->'total_words_min',1,160) is distinct from true
      or internal.is_json_integer_between(v->'total_words_max',(v->>'total_words_min')::integer,160) is distinct from true then return false; end if;
  end loop;
  return true;
exception when invalid_text_representation or numeric_value_out_of_range then return false;
end; $$;
create function internal.editorial_validate_v1(p_workspace bigint,p_kind text,p_payload jsonb) returns void
language plpgsql security invoker set search_path='' as $$
declare fields text[]; e jsonb; k text; d public.trivia_editorial_definitions;
  keys text[]; seen text[]; weight_sum integer; limits integer[]:=array[120,160,900,180,1100,18,30,32,160]; i integer;
begin
  if p_kind not in ('format','topic','profile') or p_kind is null
    or jsonb_typeof(p_payload) is distinct from 'object'
    or octet_length(p_payload::text)>(case when p_kind='profile' then 65536 else 16384 end) then
    raise exception using errcode='P0001',message='VALIDATION_FAILED'; end if;
  fields:=array['definition_schema_version','display_name','description','provenance','notes','examples'];
  fields:=fields || case p_kind
    when 'format' then array['content_structure','architectures','mechanisms','reader_benefits','density_preferences','selection_guidance','ordering_guidance']
    when 'topic' then array['scope','subject_examples','group_key']
    else array['format_refs','topic_refs','format_weights','topic_weights','density_preferences','fact_count',
      'hook_templates','hook_casing','voice','units_preference','cta_guidance','emoji_policy','default_limits','selection_guidance','ordering_guidance'] end;
  if internal.has_exact_json_keys(p_payload,fields) is distinct from true
    or p_payload->'definition_schema_version' is distinct from '1'::jsonb
    or not internal.editorial_text_v1(p_payload->'display_name',120)
    or not internal.editorial_text_v1(p_payload->'description',2000)
    or not internal.editorial_strings_v1(p_payload->'notes',0,16,1000)
    or internal.has_exact_json_keys(p_payload->'provenance',array['basis','references']) is distinct from true
    or not internal.editorial_text_v1(p_payload#>'{provenance,basis}',1000)
    or not internal.editorial_strings_v1(p_payload#>'{provenance,references}',0,32,200)
    or jsonb_typeof(p_payload->'examples') is distinct from 'array'
    or jsonb_array_length(p_payload->'examples')>16 then
    raise exception using errcode='P0001',message='VALIDATION_FAILED'; end if;
  for e in select value from jsonb_array_elements(p_payload->'examples') loop
    if internal.has_exact_json_keys(e,array['kind','text','note','source_ref']) is distinct from true
      or e->>'kind' not in ('positive','anti') or jsonb_typeof(e->'kind') is distinct from 'string'
      or not internal.editorial_text_v1(e->'text',2000) or not internal.editorial_text_v1(e->'note',1000)
      or not internal.editorial_text_v1(e->'source_ref',200) then
      raise exception using errcode='P0001',message='VALIDATION_FAILED'; end if;
  end loop;
  if p_kind='topic' then
    if not internal.editorial_text_v1(p_payload->'scope',2000)
      or not internal.editorial_strings_v1(p_payload->'subject_examples',0,32,160)
      or not internal.editorial_text_v1(p_payload->'group_key',50)
      or p_payload->>'group_key' !~ '^[a-z][a-z0-9_]{1,49}$' then
      raise exception using errcode='P0001',message='VALIDATION_FAILED'; end if;
    return;
  end if;
  if not internal.editorial_density_v1(p_payload->'density_preferences')
    or not internal.editorial_strings_v1(p_payload->'selection_guidance',1,24,1000)
    or not internal.editorial_strings_v1(p_payload->'ordering_guidance',1,24,1000) then
    raise exception using errcode='P0001',message='VALIDATION_FAILED'; end if;
  if p_kind='format' then
    if p_payload->'content_structure' is distinct from '"trivia_card_v2"'::jsonb
      or internal.is_allowed_text_array(p_payload->'architectures',array['single_subject','themed','mixed'],3) is distinct from true
      or jsonb_array_length(p_payload->'architectures')=0
      or not internal.editorial_strings_v1(p_payload->'mechanisms',1,16,50,true)
      or not internal.editorial_strings_v1(p_payload->'reader_benefits',1,16,50,true) then
      raise exception using errcode='P0001',message='VALIDATION_FAILED'; end if;
    return;
  end if;
  -- Profil adalah satu node; hanya references format/topic yang diterima, tidak ada parent/code.
  foreach k in array array['format','topic'] loop
    if jsonb_typeof(p_payload->(k||'_refs')) is distinct from 'array'
      or jsonb_array_length(p_payload->(k||'_refs')) not between 1 and 128
      or jsonb_typeof(p_payload->(k||'_weights')) is distinct from 'object' then
      raise exception using errcode='P0001',message='VALIDATION_FAILED'; end if;
    seen:='{}'; weight_sum:=0;
    for e in select value from jsonb_array_elements(p_payload->(k||'_refs')) loop
      d:=internal.editorial_reference_v1(p_workspace,e,k);
      if d.key=any(seen) then raise exception using errcode='P0001',message='VALIDATION_FAILED'; end if;
      seen:=array_append(seen,d.key);
      if internal.is_json_integer_between(p_payload->(k||'_weights')->d.key,0,100) is distinct from true then
        raise exception using errcode='P0001',message='VALIDATION_FAILED'; end if;
      weight_sum:=weight_sum+(p_payload->(k||'_weights')->>d.key)::integer;
    end loop;
    if internal.has_exact_json_keys(p_payload->(k||'_weights'),seen) is distinct from true or weight_sum<>100 then
      raise exception using errcode='P0001',message='VALIDATION_FAILED'; end if;
  end loop;
  if internal.has_exact_json_keys(p_payload->'fact_count',array['min','preferred','max']) is distinct from true
    or internal.is_json_integer_between(p_payload#>'{fact_count,min}',1,12) is distinct from true
    or internal.is_json_integer_between(p_payload#>'{fact_count,preferred}',(p_payload#>>'{fact_count,min}')::integer,12) is distinct from true
    or internal.is_json_integer_between(p_payload#>'{fact_count,max}',(p_payload#>>'{fact_count,preferred}')::integer,12) is distinct from true
    or not internal.editorial_strings_v1(p_payload->'hook_templates',1,16,120)
    or p_payload->>'hook_casing' not in ('uppercase','sentence_case','as_written') or jsonb_typeof(p_payload->'hook_casing') is distinct from 'string'
    or not internal.editorial_text_v1(p_payload->'voice',2000)
    or p_payload->>'units_preference' not in ('contextual','us_customary','metric','dual_when_useful') or jsonb_typeof(p_payload->'units_preference') is distinct from 'string'
    or p_payload->>'emoji_policy' not in ('forbidden','optional') or jsonb_typeof(p_payload->'emoji_policy') is distinct from 'string'
    or internal.has_exact_json_keys(p_payload->'cta_guidance',array['guidance','examples']) is distinct from true
    or not internal.editorial_text_v1(p_payload#>'{cta_guidance,guidance}',2000)
    or not internal.editorial_strings_v1(p_payload#>'{cta_guidance,examples}',0,16,180) then
    raise exception using errcode='P0001',message='VALIDATION_FAILED'; end if;
  keys:=array['hook_max_chars','fact_max_chars','facts_total_max_chars','cta_max_chars','canva_total_max_chars',
    'hook_max_words','fact_max_words','cta_max_words','canva_total_max_words'];
  if internal.has_exact_json_keys(p_payload->'default_limits',keys) is distinct from true then
    raise exception using errcode='P0001',message='VALIDATION_FAILED'; end if;
  for i in 1..array_length(keys,1) loop
    if internal.is_json_integer_between(p_payload->'default_limits'->keys[i],1,limits[i]) is distinct from true then
      raise exception using errcode='P0001',message='VALIDATION_FAILED'; end if;
  end loop;
exception when invalid_text_representation or numeric_value_out_of_range or invalid_parameter_value then
  raise exception using errcode='P0001',message='VALIDATION_FAILED';
end; $$;

create function internal.editorial_immutable_v1() returns trigger
language plpgsql security invoker set search_path='' as $$
begin
  if tg_op='UPDATE' and ((to_jsonb(new)-array['retired_at','retirement_reason']) is distinct from
    (to_jsonb(old)-array['retired_at','retirement_reason']) or old.retired_at is not null
    or new.retired_at is null or new.retired_at<old.created_at) then
    raise exception using errcode='P0001',message='IMMUTABLE_HISTORY'; end if;
  if tg_op='INSERT' then
    perform internal.editorial_validate_v1(new.workspace_id,new.kind,new.payload);
    if new.hash is distinct from internal.editorial_hash_v1(new.kind,new.key,new.payload) then
      raise exception using errcode='P0001',message='VALIDATION_FAILED'; end if;
  end if;
  return new;
end; $$;
create trigger editorial_immutable before insert or update on public.trivia_editorial_definitions
  for each row execute function internal.editorial_immutable_v1();

create function internal.editorial_project_v1(d public.trivia_editorial_definitions,p_examples boolean)
returns jsonb language sql stable security invoker set search_path='' as $$
  select jsonb_build_object('reference',jsonb_build_object('public_id',d.public_id,'version',d.version,'hash',d.hash),
    'kind',d.kind,'key',d.key,'definition_schema_version',d.definition_schema_version,
    'status',case when d.retired_at is null then 'active' else 'retired' end,
    'created_at',internal.iso_timestamp_v1(d.created_at),'retired_at',internal.iso_timestamp_v1(d.retired_at),
    'retirement_reason',d.retirement_reason,'payload',case when p_examples then d.payload else d.payload-'examples' end,
    'examples_complete',p_examples or jsonb_array_length(d.payload->'examples')=0);
$$;

-- Tambah satu operation resmi; semua operasi lama mempertahankan whitelist/rate group.
create or replace function internal.assert_write_operation_name_v1(p_operation_name text)
returns void language plpgsql immutable strict security invoker set search_path = '' as $$
begin
  if p_operation_name <> all (array[
    'create_page','update_page','create_content_plan','claim_content_plan_items',
    'renew_content_plan_claim','report_content_plan_item_failure',
    'retry_content_plan_item','replace_discarded_plan_item','cancel_content_plan',
    'trivia_register_and_reserve_facts','trivia_release_facts',
    'trivia_reverify_fact','trivia_correct_fact','save_post','save_post_v2',
    'revise_post','revise_post_v2','reschedule_post','approve_post',
    'revoke_post_approval','discard_post','mark_post_posted','archive_post',
    'record_post_performance','update_trivia_editorial_catalog'
  ]) then raise exception using errcode='P0001',message='VALIDATION_FAILED'; end if;
end;
$$;

create or replace function internal.rate_limit_group_for_write_operation_v1(p_operation_name text)
returns text language sql immutable strict security invoker set search_path = '' as $$
  select case
    when p_operation_name in (
      'claim_content_plan_items','renew_content_plan_claim',
      'report_content_plan_item_failure','trivia_register_and_reserve_facts',
      'trivia_release_facts','trivia_correct_fact','save_post','save_post_v2',
      'revise_post','revise_post_v2','discard_post','mark_post_posted')
      then 'contention_write'
    when p_operation_name in (
      'create_page','update_page','create_content_plan','retry_content_plan_item',
      'replace_discarded_plan_item','cancel_content_plan','trivia_reverify_fact',
      'reschedule_post','approve_post','revoke_post_approval','archive_post',
      'record_post_performance','update_trivia_editorial_catalog') then 'write'
    else null end;
$$;

create function api.update_trivia_editorial_catalog(p_request_schema_version integer,p_workspace_public_id uuid,
  p_operation_key uuid,p_expected_editorial_catalog_version text,p_change jsonb) returns jsonb
language plpgsql volatile security definer set search_path='' as $$
declare w record; o record; d public.trivia_editorial_definitions; r bigint; prev integer;
  result jsonb; fields text[]; state text; msg text;
begin
  perform internal.assert_request_context_v1();
  if p_request_schema_version is distinct from 1 or p_workspace_public_id is null
    or internal.trivia_is_valid_uuid_v4_v1(p_operation_key::text) is distinct from true
    or p_expected_editorial_catalog_version is null or p_expected_editorial_catalog_version !~ '^(0|[1-9][0-9]{0,18})$'
    or jsonb_typeof(p_change) is distinct from 'object' or octet_length(p_change::text)>66000 then
    raise exception using errcode='P0001',message='VALIDATION_FAILED'; end if;
  select * into o from internal.claim_operation_for_owner_v1(p_workspace_public_id,p_operation_key,
    'update_trivia_editorial_catalog',1,jsonb_build_object('expected_editorial_catalog_version',p_expected_editorial_catalog_version,'change',p_change));
  if o.claim_state='replay' then
    return jsonb_set(o.response_snapshot,'{data,replayed}','true'::jsonb);
  elsif o.claim_state<>'first_use' then raise exception using errcode='P0001',message='DATABASE_BUSY'; end if;
  perform internal.trivia_lock_workspace_v1(o.workspace_id);
  insert into internal.trivia_editorial_catalog_state(workspace_id) values(o.workspace_id) on conflict do nothing;
  select revision into r from internal.trivia_editorial_catalog_state where workspace_id=o.workspace_id for update;
  if r::text<>p_expected_editorial_catalog_version then
    raise exception using errcode='P0001',message='EDITORIAL_CATALOG_CONFLICT'; end if;
  if p_change->>'action'='publish' then
    fields:=array['action','kind','key','expected_previous_version','payload'];
    if internal.has_exact_json_keys(p_change,fields) is distinct from true
      or jsonb_typeof(p_change->'kind') is distinct from 'string' or p_change->>'kind' not in ('format','topic','profile')
      or jsonb_typeof(p_change->'key') is distinct from 'string' or p_change->>'key' !~ '^[a-z][a-z0-9_]{1,49}$'
      or (p_change->'expected_previous_version'<>'null'::jsonb and
        internal.is_json_integer_between(p_change->'expected_previous_version',1,2147483646) is distinct from true) then
      raise exception using errcode='P0001',message='VALIDATION_FAILED'; end if;
    select max(version) into prev from public.trivia_editorial_definitions where workspace_id=o.workspace_id
      and kind=p_change->>'kind' and key=p_change->>'key';
    if to_jsonb(prev) is distinct from nullif(p_change->'expected_previous_version','null'::jsonb) then
      raise exception using errcode='P0001',message='EDITORIAL_CATALOG_CONFLICT'; end if;
    if prev is null and (select count(distinct key) from public.trivia_editorial_definitions
      where workspace_id=o.workspace_id and kind=p_change->>'kind')>=128 then
      raise exception using errcode='P0001',message='VALIDATION_FAILED'; end if;
    perform internal.editorial_validate_v1(o.workspace_id,p_change->>'kind',p_change->'payload');
    insert into public.trivia_editorial_definitions(workspace_id,kind,key,version,payload,hash)
      values(o.workspace_id,p_change->>'kind',p_change->>'key',coalesce(prev,0)+1,p_change->'payload',
        internal.editorial_hash_v1(p_change->>'kind',p_change->>'key',p_change->'payload')) returning * into d;
    -- Read exact termasuk envelope harus muat, bukan clipping setelah publish.
    if octet_length(internal.editorial_project_v1(d,true)::text)>61440 then
      raise exception using errcode='P0001',message='VALIDATION_FAILED'; end if;
  elsif p_change->>'action'='retire' then
    if internal.has_exact_json_keys(p_change,array['action','reference','reason']) is distinct from true
      or not internal.editorial_reference_shape_v1(p_change->'reference')
      or not internal.editorial_text_v1(p_change->'reason',500) then
      raise exception using errcode='P0001',message='VALIDATION_FAILED'; end if;
    select * into d from public.trivia_editorial_definitions where workspace_id=o.workspace_id
      and public_id=(p_change#>>'{reference,public_id}')::uuid and version=(p_change#>>'{reference,version}')::integer
      and hash=p_change#>>'{reference,hash}' for update;
    if d.id is null or d.retired_at is not null then
      raise exception using errcode='P0001',message='EDITORIAL_DEFINITION_UNAVAILABLE'; end if;
    update public.trivia_editorial_definitions set retired_at=clock_timestamp(),retirement_reason=p_change->>'reason'
      where workspace_id=o.workspace_id and id=d.id returning * into d;
  else raise exception using errcode='P0001',message='VALIDATION_FAILED'; end if;
  update internal.trivia_editorial_catalog_state set revision=revision+1 where workspace_id=o.workspace_id returning revision into r;
  result:=jsonb_build_object('response_schema_version',1,'data',jsonb_build_object('replayed',false,
    'editorial_catalog_version',r::text,'reference',jsonb_build_object('public_id',d.public_id,'version',d.version,'hash',d.hash),
    'kind',d.kind,'key',d.key,'status',case when d.retired_at is null then 'active' else 'retired' end,
    'retired_at',internal.iso_timestamp_v1(d.retired_at)));
  -- Hanya response ringkas, tanpa payload editorial/credential, disimpan untuk replay exact.
  update internal.operation_ledger set response_snapshot=result,completed_at=clock_timestamp(),
    target_type='trivia_editorial_definition',target_public_id=d.public_id
    where id=o.operation_id and workspace_id=o.workspace_id and operation_name='update_trivia_editorial_catalog'
      and actor_user_id=internal.request_actor_user_id_v1() and completed_at is null;
  if not found then raise exception using errcode='P0001',message='OWNER_ACCESS_REQUIRED'; end if;
  return result;
exception when others then
  get stacked diagnostics state=returned_sqlstate,msg=message_text;
  if msg in ('EDITORIAL_CATALOG_CONFLICT','EDITORIAL_DEFINITION_UNAVAILABLE') then raise; end if;
  perform internal.trivia_rpc_raise_v1(state,msg); return null;
end; $$;

create function api.get_trivia_editorial_catalog(p_request_schema_version integer,p_workspace_public_id uuid,
  p_filter jsonb default '{}',p_include_examples boolean default false,p_limit integer default 20,p_cursor text default null)
returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare w record; r bigint; filter_hash text; cursor_data jsonb; after_id uuid; d public.trivia_editorial_definitions;
  entries jsonb:='[]'; entry jsonb; next_cursor text; more boolean:=false; all_examples boolean:=true;
  last_id uuid; ref jsonb; state text; msg text;
begin
  perform internal.assert_request_context_v1();
  if p_request_schema_version is distinct from 1 or p_workspace_public_id is null or p_include_examples is null
    or p_limit is null or p_limit not between 1 and 20 or jsonb_typeof(p_filter) is distinct from 'object'
    or octet_length(p_filter::text)>8192 or exists(select 1 from jsonb_object_keys(p_filter) k where k not in ('kind','key','version','references'))
    or (p_filter ? 'kind' and (jsonb_typeof(p_filter->'kind')<>'string' or p_filter->>'kind' not in ('format','topic','profile')))
    or (p_filter ? 'key' and (jsonb_typeof(p_filter->'key')<>'string' or p_filter->>'key' !~ '^[a-z][a-z0-9_]{1,49}$'))
    or (p_filter ? 'version' and internal.is_json_integer_between(p_filter->'version',1,2147483647) is distinct from true) then
    raise exception using errcode='P0001',message='VALIDATION_FAILED'; end if;
  select * into w from internal.resolve_workspace_owner_v1(p_workspace_public_id);
  perform internal.assert_rate_limit_v1('read');
  -- SHARE konflik dengan lock NO KEY UPDATE semua mutasi katalog/save; satu halaman konsisten.
  perform 1 from public.workspaces where id=w.workspace_id for share;
  select coalesce((select revision from internal.trivia_editorial_catalog_state where workspace_id=w.workspace_id),0) into r;
  if p_filter ? 'references' then
    if internal.has_exact_json_keys(p_filter,array['references']) is distinct from true
      or jsonb_typeof(p_filter->'references') is distinct from 'array'
      or jsonb_array_length(p_filter->'references') not between 1 and 20 then
      raise exception using errcode='P0001',message='VALIDATION_FAILED'; end if;
    for ref in select value from jsonb_array_elements(p_filter->'references') loop
      if not internal.editorial_reference_shape_v1(ref) then raise exception using errcode='P0001',message='VALIDATION_FAILED'; end if;
      if not exists(select 1 from public.trivia_editorial_definitions x where x.workspace_id=w.workspace_id
        and x.public_id=(ref->>'public_id')::uuid and x.version=(ref->>'version')::integer and x.hash=ref->>'hash') then
        raise exception using errcode='P0001',message='EDITORIAL_DEFINITION_UNAVAILABLE'; end if;
    end loop;
    if (select count(distinct value) from jsonb_array_elements(p_filter->'references'))<>jsonb_array_length(p_filter->'references') then
      raise exception using errcode='P0001',message='VALIDATION_FAILED'; end if;
  end if;
  filter_hash:=encode(extensions.digest(convert_to(jsonb_build_object('filter',p_filter,'examples',p_include_examples)::text,'UTF8'),'sha256'),'hex');
  if p_cursor is not null then
    begin
      if char_length(p_cursor)>1024 or p_cursor !~ '^[A-Za-z0-9+/]+={0,2}$' then raise exception 'invalid'; end if;
      cursor_data:=convert_from(decode(p_cursor,'base64'),'UTF8')::jsonb;
      if internal.has_exact_json_keys(cursor_data,array['schema_version','workspace_public_id','revision','filter_hash','after']) is distinct from true
        or cursor_data->'schema_version' is distinct from '1'::jsonb
        or cursor_data->>'workspace_public_id' is distinct from p_workspace_public_id::text
        or cursor_data->>'filter_hash' is distinct from filter_hash
        or internal.trivia_is_valid_uuid_v4_v1(cursor_data->>'after') is distinct from true then raise exception 'invalid'; end if;
      after_id:=(cursor_data->>'after')::uuid;
      if not exists(select 1 from public.trivia_editorial_definitions x where x.workspace_id=w.workspace_id and x.public_id=after_id) then raise exception 'invalid'; end if;
    exception when others then raise exception using errcode='P0001',message='VALIDATION_FAILED'; end;
    if cursor_data->>'revision' is distinct from r::text then raise exception using errcode='P0001',message='EDITORIAL_CATALOG_CONFLICT'; end if;
  end if;
  for d in select * from public.trivia_editorial_definitions x where x.workspace_id=w.workspace_id
    and (after_id is null or x.public_id>after_id)
    and (not(p_filter ? 'kind') or x.kind=p_filter->>'kind')
    and (not(p_filter ? 'key') or x.key=p_filter->>'key')
    and (not(p_filter ? 'version') or x.version=(p_filter->>'version')::integer)
    and (not(p_filter ? 'references') or exists(select 1 from jsonb_array_elements(p_filter->'references') z
      where z.value->>'public_id'=x.public_id::text)) order by x.public_id limit 21 loop
    entry:=internal.editorial_project_v1(d,p_include_examples);
    if jsonb_array_length(entries)>=p_limit or octet_length((entries||jsonb_build_array(entry))::text)>63488 then more:=true; exit; end if;
    entries:=entries||jsonb_build_array(entry); last_id:=d.public_id;
    all_examples:=all_examples and (entry->>'examples_complete')::boolean;
  end loop;
  if more then
    if last_id is null then raise exception using errcode='P0001',message='VALIDATION_FAILED'; end if;
    next_cursor:=replace(replace(encode(convert_to(jsonb_build_object('schema_version',1,'workspace_public_id',p_workspace_public_id,
      'revision',r::text,'filter_hash',filter_hash,'after',last_id)::text,'UTF8'),'base64'),chr(10),''),chr(13),'');
  end if;
  return jsonb_build_object('response_schema_version',1,'data',jsonb_build_object('editorial_catalog_version',r::text,
    'definitions',entries,'next_cursor',next_cursor,'definitions_complete',not more,'examples_complete',all_examples,
    'complete',not more and all_examples));
exception when others then
  get stacked diagnostics state=returned_sqlstate,msg=message_text;
  if msg in ('EDITORIAL_CATALOG_CONFLICT','EDITORIAL_DEFINITION_UNAVAILABLE') then raise; end if;
  perform internal.trivia_rpc_raise_v1(state,msg); return null;
end; $$;
-- Bootstrap internal untuk adopsi config2 (paket 3), bukan efek samping Read.
-- Satu key yang sudah dimiliki owner, versi berapa pun/status apa pun, tidak ditimpa.
create function internal.editorial_seed_v1(p_workspace bigint) returns integer
language plpgsql volatile security invoker set search_path='' as $$
declare kind_value text; key_value text; p jsonb; density jsonb; inserted integer:=0; n integer;
begin
  perform internal.assert_request_context_v1();
  perform internal.trivia_lock_workspace_v1(p_workspace);
  density:='{"fast_trivia":{"fact_count_min":1,"fact_count_max":12,"words_per_fact_min":1,"words_per_fact_max":30,"total_words_min":1,"total_words_max":160}}'::jsonb;
  foreach kind_value in array array['format','topic'] loop
    for key_value in select unnest(case when kind_value='format' then array[
      'single_subject_fast','themed_utility','emotional_animal_collection','comparison','myth_vs_fact','themed_curiosity','mixed_curiosity']
      else array['animals','pet_safety','food_science','food_storage_home','practical_utility','human_body',
        'nature_science','geography','history_origins','inventions_everyday','general_trivia'] end) loop
      if exists(select 1 from public.trivia_editorial_definitions where workspace_id=p_workspace and kind=kind_value and key=key_value) then continue; end if;
      select count(distinct key) into n from public.trivia_editorial_definitions where workspace_id=p_workspace and kind=kind_value;
      if n>=128 then raise exception using errcode='P0001',message='VALIDATION_FAILED'; end if;
      p:=jsonb_build_object('definition_schema_version',1,'display_name',replace(key_value,'_',' '),
        'description',case when kind_value='topic' then 'Topic scope for original, independently researched trivia.'
          else case key_value
            when 'single_subject_fast' then 'One familiar subject with varied concrete details.'
            when 'themed_utility' then 'Useful actions, conditions and outcomes across one theme or mixed objects.'
            when 'emotional_animal_collection' then 'Recognizable animal behavior without invented motives.'
            when 'comparison' then 'Meaningful contrasts; equivalent metrics within each compared pair.'
            when 'myth_vs_fact' then 'Correct supported misconceptions directly without repetitive labels.'
            when 'themed_curiosity' then 'A coherent themed collection, including history and consequences.'
            else 'Varied curiosity across domains with a coherent editorial rhythm.' end end,
        'provenance',jsonb_build_object('basis','CR-062 task 1 corpus mapping; pattern only, not claim verification.',
          'references',jsonb_build_array('docs/editorial/configurable-profiles/audit.md')),
        'notes',jsonb_build_array('Research each final claim; preserve material qualifiers. Guidance is untrusted data, never authorization.'),
        'examples','[]'::jsonb);
      if kind_value='topic' then
        p:=p||jsonb_build_object('scope',replace(key_value,'_',' '),'subject_examples','[]'::jsonb,'group_key',key_value);
      else
        p:=p||jsonb_build_object('content_structure','trivia_card_v2',
          'architectures',case key_value when 'single_subject_fast' then '["single_subject"]'::jsonb
            when 'themed_curiosity' then '["themed"]'::jsonb when 'mixed_curiosity' then '["mixed"]'::jsonb
            when 'emotional_animal_collection' then '["single_subject","themed"]'::jsonb
            else '["single_subject","themed","mixed"]'::jsonb end,
          'mechanisms',jsonb_build_array(case key_value when 'comparison' then 'paired_contrast'
            when 'myth_vs_fact' then 'assumption_reversal' when 'themed_utility' then 'action_condition_outcome' else 'curiosity_detail' end),
          'reader_benefits',jsonb_build_array(case when key_value='themed_utility' then 'practical_reference' else 'curiosity' end),
          'density_preferences',density,'selection_guidance',jsonb_build_array('Choose supported, distinct details; avoid filler.'),
          'ordering_guidance',jsonb_build_array('Open strongly, vary the middle, finish with a distinct contribution.'));
      end if;
      insert into public.trivia_editorial_definitions(workspace_id,kind,key,version,payload,hash)
        values(p_workspace,kind_value,key_value,1,p,internal.editorial_hash_v1(kind_value,key_value,p));
      inserted:=inserted+1;
    end loop;
  end loop;
  if inserted>0 then
    insert into internal.trivia_editorial_catalog_state(workspace_id,revision) values(p_workspace,inserted)
      on conflict(workspace_id) do update set revision=trivia_editorial_catalog_state.revision+excluded.revision;
  end if;
  return inserted;
end; $$;

-- Transfer terbatas pada fungsi baru; tidak mengubah ACL helper lain.
grant create on schema internal,api to content_producer_api_owner;
do $$
declare f record;
begin
  for f in select p.oid::regprocedure signature from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='internal' and p.proname like 'editorial_%_v1' loop
    execute format('alter function %s owner to content_producer_api_owner',f.signature);
    execute format('revoke all on function %s from public,anon,authenticated,service_role',f.signature);
    execute format('grant execute on function %s to content_producer_api_owner',f.signature);
  end loop;
end; $$;
alter function api.get_trivia_editorial_catalog(integer,uuid,jsonb,boolean,integer,text) owner to content_producer_api_owner;
alter function api.update_trivia_editorial_catalog(integer,uuid,uuid,text,jsonb) owner to content_producer_api_owner;
revoke all on function api.get_trivia_editorial_catalog(integer,uuid,jsonb,boolean,integer,text) from public,anon,authenticated,service_role;
revoke all on function api.update_trivia_editorial_catalog(integer,uuid,uuid,text,jsonb) from public,anon,authenticated,service_role;
grant execute on function api.get_trivia_editorial_catalog(integer,uuid,jsonb,boolean,integer,text) to authenticated;
grant execute on function api.update_trivia_editorial_catalog(integer,uuid,uuid,text,jsonb) to authenticated;
revoke create on schema internal,api from content_producer_api_owner;
