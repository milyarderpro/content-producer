-- Phase 4 Batch A audit remediation. Additive only; no caller-facing RPCs.

create function internal.trivia_is_valid_uuid_v4_v1(p_value text)
returns boolean language plpgsql immutable strict set search_path = pg_catalog as $$
begin
  return p_value = lower(p_value)
    and p_value ~ '^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
    and p_value::uuid::text = p_value;
exception when others then return false;
end; $$;

create function internal.trivia_is_valid_rfc3339_v1(p_value text)
returns boolean language plpgsql stable strict set search_path = pg_catalog as $$
begin
  if p_value !~ '^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,6})?Z$' then return false; end if;
  perform p_value::timestamptz;
  return true;
exception when others then return false;
end; $$;

create function internal.trivia_canonical_numbers_v2(p_numbers jsonb)
returns jsonb language plpgsql immutable strict set search_path = pg_catalog, internal as $$
declare v_number jsonb; v_value text; v_unit text; v_role text; v_result jsonb;
begin
  if jsonb_typeof(p_numbers) <> 'array' or jsonb_array_length(p_numbers) > 10 then return null; end if;
  for v_number in select value from jsonb_array_elements(p_numbers) loop
    if not internal.has_exact_json_keys(v_number, array['value', 'unit', 'role'])
      or jsonb_typeof(v_number -> 'value') <> 'string'
      or jsonb_typeof(v_number -> 'role') <> 'string'
      or jsonb_typeof(v_number -> 'unit') not in ('string','null') then return null; end if;
    v_value := v_number ->> 'value'; v_role := v_number ->> 'role'; v_unit := lower(v_number ->> 'unit');
    v_unit := case v_unit
      when 'm' then 'meter' when 'meters' then 'meter' when 'metre' then 'meter' when 'metres' then 'meter'
      when 'km' then 'kilometer' when 'kilometers' then 'kilometer' when 'kilometre' then 'kilometer' when 'kilometres' then 'kilometer'
      when 'g' then 'gram' when 'grams' then 'gram' when 'kg' then 'kilogram' when 'kilograms' then 'kilogram'
      when '°c' then 'celsius' when 'c' then 'celsius' when '°f' then 'fahrenheit' when 'f' then 'fahrenheit'
      when '%' then 'percent' else v_unit end;
    if v_value !~ '^-?(0|[1-9][0-9]*)(\.[0-9]+)?$' or char_length(v_value) > 80
      or nullif(btrim(v_role),'') is null or char_length(v_role)>80
      or (v_unit is not null and v_unit not in ('count','meter','kilometer','gram','kilogram','celsius','fahrenheit','percent','year','day','hour','minute','second')) then return null; end if;
  end loop;
  select coalesce(jsonb_agg(jsonb_build_object('value', value ->> 'value', 'unit', case lower(value ->> 'unit')
    when 'm' then 'meter' when 'meters' then 'meter' when 'metre' then 'meter' when 'metres' then 'meter'
    when 'km' then 'kilometer' when 'kilometers' then 'kilometer' when 'kilometre' then 'kilometer' when 'kilometres' then 'kilometer'
    when 'g' then 'gram' when 'grams' then 'gram' when 'kg' then 'kilogram' when 'kilograms' then 'kilogram'
    when '°c' then 'celsius' when 'c' then 'celsius' when '°f' then 'fahrenheit' when 'f' then 'fahrenheit'
    when '%' then 'percent' else value ->> 'unit' end, 'role', value ->> 'role')
    order by value ->> 'role', coalesce(value ->> 'unit',''), (value ->> 'value')::numeric), '[]'::jsonb) into v_result from jsonb_array_elements(p_numbers) item(value);
  return v_result;
end; $$;

create function internal.trivia_canonical_qualifiers_v2(p_qualifiers jsonb)
returns jsonb language plpgsql immutable strict set search_path = pg_catalog as $$
declare v_key text; v_value jsonb; v_allowed text[] := array['negated','time','location','population','condition','method','scope','estimate','comparison_direction'];
begin
  if jsonb_typeof(p_qualifiers) <> 'object' or not (p_qualifiers - v_allowed = '{}'::jsonb)
    or jsonb_typeof(coalesce(p_qualifiers->'negated','false'::jsonb)) <> 'boolean'
    or jsonb_typeof(coalesce(p_qualifiers->'estimate','false'::jsonb)) <> 'boolean'
    or jsonb_typeof(coalesce(p_qualifiers->'comparison_direction','"none"'::jsonb)) <> 'string'
    or coalesce(p_qualifiers->>'comparison_direction','none') not in ('increase','decrease','greater_than','less_than','at_least','at_most','equal','none') then return null; end if;
  foreach v_key in array array['time','location','population','condition','method','scope'] loop
    v_value := p_qualifiers -> v_key;
    if v_value is not null and (jsonb_typeof(v_value) not in ('string','null') or (jsonb_typeof(v_value)='string' and (nullif(btrim(v_value #>> '{}'),'') is null or char_length(v_value #>> '{}') > 200))) then return null; end if;
  end loop;
  return jsonb_build_object('negated',coalesce(p_qualifiers->'negated','false'::jsonb),'time',coalesce(p_qualifiers->'time','null'::jsonb),'location',coalesce(p_qualifiers->'location','null'::jsonb),'population',coalesce(p_qualifiers->'population','null'::jsonb),'condition',coalesce(p_qualifiers->'condition','null'::jsonb),'method',coalesce(p_qualifiers->'method','null'::jsonb),'scope',coalesce(p_qualifiers->'scope','null'::jsonb),'estimate',coalesce(p_qualifiers->'estimate','false'::jsonb),'comparison_direction',coalesce(p_qualifiers->'comparison_direction','"none"'::jsonb));
end; $$;

create function internal.trivia_build_structured_key_v2(p_subject_key text,p_relation_key text,p_object_key text,p_numbers jsonb,p_qualifiers jsonb)
returns text language sql immutable strict set search_path = pg_catalog, internal as $$
  select concat_ws('|',
    'subject_key='||internal.trivia_hex_scalar_v1(p_subject_key),'subject_type='||internal.trivia_hex_scalar_v1('entity'),
    'relation_key='||internal.trivia_hex_scalar_v1(p_relation_key),'object_key='||internal.trivia_hex_scalar_v1(p_object_key),
    'object_type='||internal.trivia_hex_scalar_v1(case when p_relation_key in ('has_count','has_measurement','holds_record_by_metric_as_of') then 'value' else 'entity' end),
    'numbers='||internal.trivia_hex_scalar_v1(p_numbers::text),'comparison_direction='||internal.trivia_hex_scalar_v1(p_qualifiers->>'comparison_direction'),
    'negated='||internal.trivia_hex_scalar_v1(p_qualifiers->>'negated'),'time='||internal.trivia_hex_scalar_v1(coalesce(p_qualifiers->>'time','')),
    'location='||internal.trivia_hex_scalar_v1(coalesce(p_qualifiers->>'location','')),'population='||internal.trivia_hex_scalar_v1(coalesce(p_qualifiers->>'population','')),
    'condition='||internal.trivia_hex_scalar_v1(coalesce(p_qualifiers->>'condition','')),'method='||internal.trivia_hex_scalar_v1(coalesce(p_qualifiers->>'method','')),
    'estimate_or_range='||internal.trivia_hex_scalar_v1(p_qualifiers->>'estimate'),'scope='||internal.trivia_hex_scalar_v1(coalesce(p_qualifiers->>'scope','')));
$$;

create function internal.is_valid_source_evidence_v2(p_sources jsonb)
returns boolean language plpgsql stable strict set search_path = pg_catalog, internal as $$
declare s jsonb; k text; t text; tier text;
begin
  if jsonb_typeof(p_sources)<>'array' or jsonb_array_length(p_sources) not between 1 and 8 then return false; end if;
  for s in select value from jsonb_array_elements(p_sources) loop
    if not internal.has_exact_json_keys(s,array['schema_version','url','canonical_url','title','publisher','tier','source_type','accessed_at','published_at','updated_at','as_of','language','supports','independence_group'])
      or not internal.is_json_integer_between(s->'schema_version',1,1) or jsonb_typeof(s->'url')<>'string' or char_length(s->>'url') not between 1 and 2048 or s->>'url' !~ '^https://'
      or jsonb_typeof(s->'canonical_url')<>'string' or char_length(s->>'canonical_url') not between 1 and 2048 or s->>'canonical_url' !~ '^https://'
      or jsonb_typeof(s->'title')<>'string' or char_length(s->>'title') not between 1 and 300 or jsonb_typeof(s->'publisher')<>'string' or char_length(s->>'publisher') not between 1 and 200
      or not internal.trivia_is_valid_rfc3339_v1(s->>'accessed_at') or jsonb_typeof(s->'language')<>'string' or s->>'language' !~ '^[A-Za-z]{2,3}(-[A-Za-z0-9]{2,8})*$'
      or jsonb_typeof(s->'supports')<>'string' or char_length(s->>'supports') not between 1 and 500 or jsonb_typeof(s->'independence_group')<>'string' or char_length(s->>'independence_group') not between 1 and 120 then return false; end if;
    t:=s->>'source_type'; tier:=s->>'tier';
    if (tier='A' and t not in ('official','primary_paper','dataset','museum','professional_association')) or (tier='B' and t not in ('professional_association','reputable_reference','review_paper','reputable_secondary')) or (tier='C' and t not in ('reputable_reference','reputable_secondary')) or (tier='D' and t not in ('social','aggregator','other')) then return false; end if;
    foreach k in array array['published_at','updated_at'] loop if jsonb_typeof(s->k)='string' and not internal.trivia_is_valid_date_text_v1(s->>k) then return false; end if; end loop;
    if jsonb_typeof(s->'published_at') not in ('string','null') or jsonb_typeof(s->'updated_at') not in ('string','null') or jsonb_typeof(s->'as_of') not in ('string','null') or (jsonb_typeof(s->'as_of')='string' and char_length(s->>'as_of')>100) then return false; end if;
  end loop;
  return not exists(select 1 from jsonb_array_elements(p_sources) i(value) group by value->>'canonical_url' having count(*)>1);
end; $$;

create function internal.is_valid_dedup_review_snapshot_v2(p_snapshot jsonb)
returns boolean language plpgsql stable strict set search_path = pg_catalog, internal as $$
declare d jsonb;
begin
  if jsonb_typeof(p_snapshot)<>'object' or not (internal.has_exact_json_keys(p_snapshot,array['schema_version','identity_schema_version','reviewed_at','evaluator','decisions']) or internal.has_exact_json_keys(p_snapshot,array['schema_version','identity_schema_version','reviewed_at','evaluator','evaluator_label','decisions'])) or not internal.is_json_integer_between(p_snapshot->'schema_version',1,1) or not internal.is_json_integer_between(p_snapshot->'identity_schema_version',1,1) or not internal.trivia_is_valid_rfc3339_v1(p_snapshot->>'reviewed_at') or p_snapshot->>'evaluator'<>'chatgpt' or jsonb_typeof(p_snapshot->'decisions')<>'array' or jsonb_array_length(p_snapshot->'decisions')>20 then return false; end if;
  for d in select value from jsonb_array_elements(p_snapshot->'decisions') loop
    if not internal.has_exact_json_keys(d,array['candidate_fact_public_id','decision','reason','material_differences']) or not internal.trivia_is_valid_uuid_v4_v1(d->>'candidate_fact_public_id') or d->>'decision' not in ('same','distinct') or jsonb_typeof(d->'reason')<>'string' or char_length(d->>'reason') not between 1 and 500 or jsonb_typeof(d->'material_differences')<>'array' or jsonb_array_length(d->'material_differences')>10 or exists(select 1 from jsonb_array_elements_text(d->'material_differences') x(value) where x.value not in ('relation','negation','number','unit','time','location','population','condition','comparison_direction','method','scope','other')) or exists(select 1 from jsonb_array_elements_text(d->'material_differences') x(value) group by x.value having count(*)>1) then return false; end if;
  end loop; return true;
end; $$;

create function internal.is_valid_reservation_context_v1(p_context jsonb,p_workspace_id bigint,p_page_id bigint,p_reserved_at timestamptz,p_reserved_until timestamptz)
returns boolean language plpgsql stable strict set search_path = pg_catalog, internal as $$
declare n integer;
begin
  if jsonb_typeof(p_context)<>'object' or not internal.has_exact_json_keys(p_context,array['schema_version','actor_user_id','workspace_id','page_id','niche_key','fact_reuse_scope','config_schema_version','config_updated_at','ordered_fact_public_ids','request_hash','ttl_minutes','reserved_at','reserved_until']) or not internal.is_json_integer_between(p_context->'schema_version',1,1) or not internal.trivia_is_valid_uuid_v4_v1(p_context->>'actor_user_id') or (p_context->>'workspace_id') !~ '^[1-9][0-9]*$' or (p_context->>'page_id') !~ '^[1-9][0-9]*$' or (p_context->>'workspace_id')::bigint<>p_workspace_id or (p_context->>'page_id')::bigint<>p_page_id or p_context->>'niche_key'<>'trivia' or p_context->>'fact_reuse_scope' not in ('workspace_unique','page_unique') or not internal.is_json_integer_between(p_context->'config_schema_version',1,1) or not internal.trivia_is_valid_rfc3339_v1(p_context->>'config_updated_at') or p_context->>'request_hash' !~ '^[0-9a-f]{64}$' or not internal.is_json_integer_between(p_context->'ttl_minutes',5,120) or not internal.trivia_is_valid_rfc3339_v1(p_context->>'reserved_at') or not internal.trivia_is_valid_rfc3339_v1(p_context->>'reserved_until') or jsonb_typeof(p_context->'ordered_fact_public_ids')<>'array' or jsonb_array_length(p_context->'ordered_fact_public_ids') not between 1 and 9 then return false; end if;
  if abs(extract(epoch from ((p_context->>'reserved_at')::timestamptz-p_reserved_at)))>0.000001 or abs(extract(epoch from ((p_context->>'reserved_until')::timestamptz-p_reserved_until)))>0.000001 or p_reserved_until<=p_reserved_at or extract(epoch from (p_reserved_until-p_reserved_at))/60 <> (p_context->>'ttl_minutes')::integer then return false; end if;
  select count(*) into n from jsonb_array_elements_text(p_context->'ordered_fact_public_ids') x(value) where internal.trivia_is_valid_uuid_v4_v1(x.value); if n<>jsonb_array_length(p_context->'ordered_fact_public_ids') or n<>(select count(distinct value) from jsonb_array_elements_text(p_context->'ordered_fact_public_ids') x(value)) then return false; end if;
  return true;
end; $$;

create function internal.trivia_validate_fact_row_v2()
returns trigger language plpgsql set search_path=pg_catalog,internal,public as $$
declare ns jsonb; qs jsonb; source_count integer; independent_count integer; has_a boolean; requires_independent boolean; max_expiry timestamptz;
begin
  new.normalization_version:=1; new.ontology_version:=1; new.normalized_claim:=internal.trivia_normalize_claim_v1(new.claim_text);
  if char_length(new.normalized_claim) not between 1 and 500 or not internal.trivia_relation_is_known_v1(new.relation_key) then raise exception using errcode='23514',message='TRIVIA_ONTOLOGY_UNSUPPORTED'; end if;
  ns:=internal.trivia_canonical_numbers_v2(new.numbers); qs:=internal.trivia_canonical_qualifiers_v2(new.qualifiers); if ns is null or qs is null then raise exception using errcode='23514',message='TRIVIA_CANDIDATE_INVALID'; end if;
  new.numbers:=ns; new.qualifiers:=qs; new.claim_hash:=internal.trivia_claim_hash_v1(new.normalized_claim); new.structured_key:=internal.trivia_build_structured_key_v2(new.subject_key,new.relation_key,new.object_key,ns,qs); new.structured_hash:=internal.trivia_structured_hash_v1(new.structured_key); new.structured_match_eligible:=internal.trivia_structured_match_eligible_v1(new.relation_key,ns,qs,new.ontology_version);
  if not internal.is_valid_source_evidence_v2(new.source_data) then raise exception using errcode='23514',message='TRIVIA_SOURCE_INVALID'; end if;
  if not internal.is_valid_dedup_review_snapshot_v2(new.dedup_review_snapshot) then raise exception using errcode='23514',message='TRIVIA_DEDUP_REVIEW_INVALID'; end if;
  if new.reservation_status='reserved' and not internal.is_valid_reservation_context_v1(new.reservation_context,new.workspace_id,new.reserved_for_page_id,new.reserved_at,new.reserved_until) then raise exception using errcode='23514',message='TRIVIA_RESERVATION_CONTEXT_INVALID'; end if;
  if new.verification_status='verified' then
    select count(*),count(distinct value->>'independence_group'),bool_or(value->>'tier'='A') into source_count,independent_count,has_a from jsonb_array_elements(new.source_data) item(value) where value->>'tier' in ('A','B');
    requires_independent:=new.freshness_class in ('periodic','volatile') and (new.relation_key='holds_record_by_metric_as_of' or new.risk_class='sensitive');
    if source_count<1 or (new.risk_class='sensitive' and (not coalesce(has_a,false) or independent_count<2)) or (requires_independent and independent_count<2) or (new.freshness_class in ('periodic','volatile') and new.as_of_date is null) then raise exception using errcode='23514',message='TRIVIA_SOURCE_POLICY_FAILED'; end if;
    max_expiry:=case new.freshness_class when 'stable' then new.verified_at+interval '24 months' when 'periodic' then new.verified_at+interval '12 months' when 'volatile' then new.verified_at+case when new.review_note is null then interval '30 days' else interval '90 days' end end; if new.risk_class='sensitive' then max_expiry:=least(max_expiry,new.verified_at+interval '180 days'); end if;
    if new.verified_at is null or new.expires_at is null or new.expires_at<=new.verified_at or new.expires_at>max_expiry then raise exception using errcode='23514',message='TRIVIA_FRESHNESS_INVALID'; end if;
  end if; return new;
end; $$;

drop trigger trivia_facts_validate_identity_source_freshness on public.trivia_facts;
create trigger trivia_facts_validate_identity_source_freshness before insert or update on public.trivia_facts for each row execute function internal.trivia_validate_fact_row_v2();

create function internal.trivia_find_candidates_v2(p_workspace_id bigint,p_topic_key text,p_claim_text text,p_subject_key text,p_relation_key text,p_object_key text,p_numbers jsonb,p_qualifiers jsonb,p_sources jsonb,p_limit integer default 20)
returns table(fact_id bigint,fact_public_id uuid,verification_status text,normalized_claim text,signals jsonb,score_components jsonb)
language plpgsql stable strict set search_path=pg_catalog,internal,public,extensions as $$
declare n text; h text; nums jsonb; quals jsonb; sk text;
begin
  nums:=internal.trivia_canonical_numbers_v2(p_numbers); quals:=internal.trivia_canonical_qualifiers_v2(p_qualifiers); if nums is null or quals is null or not internal.is_valid_source_evidence_v2(p_sources) or p_topic_key not in ('animals','pet_safety','food_science','food_storage_home','practical_utility','human_body','nature_science','geography','history_origins','inventions_everyday','general_trivia') or not internal.trivia_relation_is_known_v1(p_relation_key) then raise exception using errcode='22023',message='TRIVIA_CANDIDATE_INPUT_INVALID'; end if;
  n:=internal.trivia_normalize_claim_v1(p_claim_text); h:=internal.trivia_claim_hash_v1(n); sk:=internal.trivia_build_structured_key_v2(p_subject_key,p_relation_key,p_object_key,nums,quals);
  return query with scored as (select f.*, f.claim_hash=h and f.normalized_claim=n exact_claim, f.structured_match_eligible and internal.trivia_structured_match_eligible_v1(p_relation_key,nums,quals,1) and f.structured_key=sk exact_structured, ts_rank_cd(f.search_vector,plainto_tsquery('simple',n)) fts_score, extensions.similarity(f.normalized_claim,n) trigram_score, f.subject_key=p_subject_key entity_match, f.relation_key=p_relation_key relation_match, f.numbers=nums numeric_match, f.qualifiers=quals qualifier_match, f.topic_key=p_topic_key topic_match, exists(select 1 from jsonb_array_elements(f.source_data) a(value) join jsonb_array_elements(p_sources) b(value) on a.value->>'canonical_url'=b.value->>'canonical_url') source_overlap from public.trivia_facts f where f.workspace_id=p_workspace_id and f.verification_status in ('needs_review','verified')) select f.id,f.public_id,f.verification_status,f.normalized_claim,jsonb_strip_nulls(jsonb_build_object('exact_claim',case when exact_claim then true end,'exact_structured',case when exact_structured then true end,'fts',case when fts_score>0 then true end,'trigram',case when trigram_score>=0.20 then true end,'entity',case when entity_match then true end,'relation',case when relation_match then true end,'numeric',case when numeric_match then true end,'qualifier',case when qualifier_match then true end,'topic',case when topic_match then true end,'source_overlap',case when source_overlap then true end)),jsonb_build_object('exact_claim',case when exact_claim then 1 else 0 end,'exact_structured',case when exact_structured then 1 else 0 end,'fts',round(fts_score::numeric,6),'trigram',round(trigram_score::numeric,6),'entity',case when entity_match then 1 else 0 end,'relation',case when relation_match then 1 else 0 end,'numeric',case when numeric_match then 1 else 0 end,'qualifier',case when qualifier_match then 1 else 0 end,'topic',case when topic_match then 1 else 0 end,'source_overlap',case when source_overlap then 1 else 0 end) from scored f where exact_claim or exact_structured or fts_score>0 or trigram_score>=0.20 or entity_match or numeric_match or qualifier_match or topic_match or source_overlap order by exact_claim desc,exact_structured desc,fts_score desc,trigram_score desc,f.public_id limit least(greatest(p_limit,1),20);
end; $$;

revoke all on all functions in schema internal from public, anon, authenticated, service_role;
