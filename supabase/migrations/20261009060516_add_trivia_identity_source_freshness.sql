-- Phase 4, checkpoint 4.3: deterministic identity and evidence validation.
-- All functions are private internal helpers. No caller-facing RPC is created.

create function internal.trivia_normalize_claim_v1(p_claim text)
returns text
language plpgsql
immutable
strict
set search_path = pg_catalog
as $$
declare
  v_claim text;
begin
  v_claim := lower(btrim(normalize(p_claim, NFC)));
  v_claim := translate(v_claim, '‘’‚‛“”„‟–—−', '''''""""---');
  v_claim := regexp_replace(v_claim, '[[:space:]]+', ' ', 'g');
  v_claim := regexp_replace(v_claim, '[.!?]+$', '');
  v_claim := regexp_replace(v_claim, '\m(octopuses)\M', 'octopus', 'g');
  v_claim := regexp_replace(v_claim, '\m(kilometres)\M', 'kilometers', 'g');
  v_claim := regexp_replace(v_claim, '\m(metres)\M', 'meters', 'g');
  v_claim := regexp_replace(v_claim, '\m(three)\M', '3', 'g');
  return v_claim;
end;
$$;

create function internal.trivia_claim_hash_v1(p_normalized_claim text)
returns text
language sql
immutable
strict
set search_path = pg_catalog, extensions
as $$
  select encode(extensions.digest('trivia-claim:v1|' || p_normalized_claim, 'sha256'), 'hex');
$$;

create function internal.trivia_relation_is_known_v1(p_relation_key text)
returns boolean
language sql
immutable
strict
set search_path = pg_catalog
as $$
  select p_relation_key in (
    'has_count', 'has_measurement', 'is_classified_as', 'is_located_in',
    'originated_in_time_place', 'has_named_part_or_property', 'holds_record_by_metric_as_of',
    'can_perform', 'behaves_as', 'communicates_by', 'affects', 'causes',
    'reduces_or_increases_risk', 'is_safe_or_toxic_for', 'recommended_practice',
    'is_illegal_or_required_in', 'is_best_or_safest'
  );
$$;

create function internal.trivia_is_valid_date_text_v1(p_value text)
returns boolean
language plpgsql
stable
strict
set search_path = pg_catalog
as $$
begin
  if p_value !~ '^\d{4}-\d{2}-\d{2}$' then return false; end if;
  perform p_value::date;
  return true;
exception when others then
  return false;
end;
$$;

create function internal.trivia_is_valid_uuid_text_v1(p_value text)
returns boolean
language plpgsql
immutable
strict
set search_path = pg_catalog
as $$
begin
  perform p_value::uuid;
  return true;
exception when others then
  return false;
end;
$$;

create function internal.trivia_relation_is_deterministic_safe_v1(p_relation_key text)
returns boolean
language sql
immutable
strict
set search_path = pg_catalog
as $$
  select p_relation_key in (
    'has_count', 'has_measurement', 'is_classified_as', 'is_located_in',
    'originated_in_time_place', 'has_named_part_or_property', 'holds_record_by_metric_as_of'
  );
$$;

create function internal.trivia_canonical_numbers_v1(p_numbers jsonb)
returns jsonb
language plpgsql
immutable
strict
set search_path = pg_catalog
as $$
declare
  v_number jsonb;
  v_value text;
  v_unit text;
  v_role text;
  v_result jsonb;
begin
  if jsonb_typeof(p_numbers) <> 'array' or jsonb_array_length(p_numbers) > 10 then
    return null;
  end if;
  for v_number in select value from jsonb_array_elements(p_numbers) loop
    if not internal.has_exact_json_keys(v_number, array['value', 'unit', 'role'])
      or jsonb_typeof(v_number -> 'value') <> 'string'
      or jsonb_typeof(v_number -> 'role') <> 'string'
      or jsonb_typeof(v_number -> 'unit') not in ('string', 'null') then
      return null;
    end if;
    v_value := v_number ->> 'value';
    v_unit := v_number ->> 'unit';
    v_role := v_number ->> 'role';
    if v_value !~ '^-?(0|[1-9][0-9]*)(\.[0-9]+)?$'
      or char_length(v_value) > 80
      or nullif(btrim(v_role), '') is null or char_length(v_role) > 80
      or (v_unit is not null and (nullif(btrim(v_unit), '') is null or char_length(v_unit) > 80)) then
      return null;
    end if;
  end loop;
  select coalesce(jsonb_agg(jsonb_build_object(
    'value', value ->> 'value', 'unit', value -> 'unit', 'role', value ->> 'role'
  ) order by value ->> 'role', coalesce(value ->> 'unit', ''), (value ->> 'value')::numeric), '[]'::jsonb)
  into v_result
  from jsonb_array_elements(p_numbers) as item(value);
  return v_result;
end;
$$;

create function internal.trivia_canonical_qualifiers_v1(p_qualifiers jsonb)
returns jsonb
language plpgsql
immutable
strict
set search_path = pg_catalog
as $$
declare
  v_key text;
  v_value jsonb;
  v_allowed text[] := array['negated', 'time', 'location', 'population', 'condition', 'method', 'scope', 'estimate'];
begin
  if jsonb_typeof(p_qualifiers) <> 'object'
    or not (p_qualifiers - v_allowed = '{}'::jsonb)
    or jsonb_typeof(coalesce(p_qualifiers -> 'negated', 'false'::jsonb)) <> 'boolean'
    or jsonb_typeof(coalesce(p_qualifiers -> 'estimate', 'false'::jsonb)) <> 'boolean' then
    return null;
  end if;
  foreach v_key in array array['time', 'location', 'population', 'condition', 'method', 'scope'] loop
    v_value := p_qualifiers -> v_key;
    if v_value is not null and (
      jsonb_typeof(v_value) not in ('string', 'null')
      or (jsonb_typeof(v_value) = 'string' and (
        nullif(btrim(v_value #>> '{}'), '') is null or char_length(v_value #>> '{}') > 200
      ))
    ) then
      return null;
    end if;
  end loop;
  return jsonb_build_object(
    'negated', coalesce(p_qualifiers -> 'negated', 'false'::jsonb),
    'time', coalesce(p_qualifiers -> 'time', 'null'::jsonb),
    'location', coalesce(p_qualifiers -> 'location', 'null'::jsonb),
    'population', coalesce(p_qualifiers -> 'population', 'null'::jsonb),
    'condition', coalesce(p_qualifiers -> 'condition', 'null'::jsonb),
    'method', coalesce(p_qualifiers -> 'method', 'null'::jsonb),
    'scope', coalesce(p_qualifiers -> 'scope', 'null'::jsonb),
    'estimate', coalesce(p_qualifiers -> 'estimate', 'false'::jsonb)
  );
end;
$$;

create function internal.trivia_hex_scalar_v1(p_value text)
returns text
language sql
immutable
strict
set search_path = pg_catalog
as $$
  select encode(convert_to(p_value, 'UTF8'), 'hex');
$$;

create function internal.trivia_build_structured_key_v1(
  p_subject_key text,
  p_relation_key text,
  p_object_key text,
  p_numbers jsonb,
  p_qualifiers jsonb
)
returns text
language sql
immutable
strict
set search_path = pg_catalog, internal
as $$
  select concat_ws('|',
    'subject_key=' || internal.trivia_hex_scalar_v1(p_subject_key),
    'subject_type=' || internal.trivia_hex_scalar_v1('entity'),
    'relation_key=' || internal.trivia_hex_scalar_v1(p_relation_key),
    'object_key=' || internal.trivia_hex_scalar_v1(p_object_key),
    'object_type=' || internal.trivia_hex_scalar_v1(case when p_relation_key in ('has_count', 'has_measurement', 'holds_record_by_metric_as_of') then 'value' else 'entity' end),
    'numbers=' || internal.trivia_hex_scalar_v1(p_numbers::text),
    'comparison_direction=' || internal.trivia_hex_scalar_v1(''),
    'negated=' || internal.trivia_hex_scalar_v1(p_qualifiers ->> 'negated'),
    'time=' || internal.trivia_hex_scalar_v1(coalesce(p_qualifiers ->> 'time', '')),
    'location=' || internal.trivia_hex_scalar_v1(coalesce(p_qualifiers ->> 'location', '')),
    'population=' || internal.trivia_hex_scalar_v1(coalesce(p_qualifiers ->> 'population', '')),
    'condition=' || internal.trivia_hex_scalar_v1(coalesce(p_qualifiers ->> 'condition', '')),
    'method=' || internal.trivia_hex_scalar_v1(coalesce(p_qualifiers ->> 'method', '')),
    'estimate_or_range=' || internal.trivia_hex_scalar_v1(p_qualifiers ->> 'estimate'),
    'scope=' || internal.trivia_hex_scalar_v1(coalesce(p_qualifiers ->> 'scope', ''))
  );
$$;

create function internal.trivia_structured_hash_v1(p_structured_key text)
returns text
language sql
immutable
strict
set search_path = pg_catalog, extensions
as $$
  select encode(extensions.digest('trivia-structure:v1|' || p_structured_key, 'sha256'), 'hex');
$$;

create function internal.trivia_structured_match_eligible_v1(
  p_relation_key text,
  p_numbers jsonb,
  p_qualifiers jsonb,
  p_ontology_version integer
)
returns boolean
language sql
immutable
strict
set search_path = pg_catalog, internal
as $$
  select p_ontology_version = 1
    and internal.trivia_relation_is_deterministic_safe_v1(p_relation_key)
    and case p_relation_key
      when 'has_count' then jsonb_array_length(p_numbers) >= 1
      when 'has_measurement' then jsonb_array_length(p_numbers) >= 1
      when 'originated_in_time_place' then p_qualifiers ->> 'time' is not null and p_qualifiers ->> 'location' is not null
      when 'holds_record_by_metric_as_of' then jsonb_array_length(p_numbers) >= 1 and p_qualifiers ->> 'time' is not null
      else true
    end;
$$;

create function internal.is_valid_source_evidence_v1(p_sources jsonb)
returns boolean
language plpgsql
stable
strict
set search_path = pg_catalog, internal
as $$
declare
  v_source jsonb;
  v_key text;
begin
  if jsonb_typeof(p_sources) <> 'array' or jsonb_array_length(p_sources) not between 1 and 8 then return false; end if;
  for v_source in select value from jsonb_array_elements(p_sources) loop
    if not internal.has_exact_json_keys(v_source, array[
      'schema_version', 'url', 'canonical_url', 'title', 'publisher', 'tier', 'source_type',
      'accessed_at', 'published_at', 'updated_at', 'as_of', 'language', 'supports', 'independence_group'
    ])
      or not internal.is_json_integer_between(v_source -> 'schema_version', 1, 1)
      or jsonb_typeof(v_source -> 'url') <> 'string' or char_length(v_source ->> 'url') not between 1 and 2048 or v_source ->> 'url' !~ '^https://'
      or jsonb_typeof(v_source -> 'canonical_url') <> 'string' or char_length(v_source ->> 'canonical_url') not between 1 and 2048 or v_source ->> 'canonical_url' !~ '^https://'
      or jsonb_typeof(v_source -> 'title') <> 'string' or char_length(v_source ->> 'title') not between 1 and 300
      or jsonb_typeof(v_source -> 'publisher') <> 'string' or char_length(v_source ->> 'publisher') not between 1 and 200
      or v_source ->> 'tier' not in ('A', 'B', 'C', 'D')
      or v_source ->> 'source_type' not in ('official', 'primary_paper', 'dataset', 'museum', 'professional_association', 'reputable_reference', 'review_paper', 'reputable_secondary', 'social', 'aggregator', 'other')
      or not internal.is_valid_timestamp_text(v_source ->> 'accessed_at')
      or jsonb_typeof(v_source -> 'published_at') not in ('string', 'null')
      or jsonb_typeof(v_source -> 'updated_at') not in ('string', 'null')
      or jsonb_typeof(v_source -> 'as_of') not in ('string', 'null')
      or jsonb_typeof(v_source -> 'language') <> 'string' or char_length(v_source ->> 'language') not between 1 and 35 or v_source ->> 'language' !~ '^[A-Za-z]{2,3}(-[A-Za-z0-9]{2,8})*$'
      or jsonb_typeof(v_source -> 'supports') <> 'string' or char_length(v_source ->> 'supports') not between 1 and 500
      or jsonb_typeof(v_source -> 'independence_group') <> 'string' or char_length(v_source ->> 'independence_group') not between 1 and 120 then
      return false;
    end if;
    foreach v_key in array array['published_at', 'updated_at'] loop
      if jsonb_typeof(v_source -> v_key) = 'string' and (
        v_source ->> v_key !~ '^\d{4}-\d{2}-\d{2}$'
        or not internal.trivia_is_valid_date_text_v1(v_source ->> v_key)
      ) then return false; end if;
    end loop;
    if jsonb_typeof(v_source -> 'as_of') = 'string' and char_length(v_source ->> 'as_of') > 100 then return false; end if;
  end loop;
  return not exists (
    select 1 from jsonb_array_elements(p_sources) as item(value)
    group by value ->> 'canonical_url' having count(*) > 1
  );
end;
$$;

create function internal.is_valid_dedup_review_snapshot_v1(p_snapshot jsonb)
returns boolean
language plpgsql
stable
strict
set search_path = pg_catalog, internal
as $$
declare v_decision jsonb;
begin
  if jsonb_typeof(p_snapshot) <> 'object'
    or not (internal.has_exact_json_keys(p_snapshot, array['schema_version', 'identity_schema_version', 'reviewed_at', 'evaluator', 'decisions'])
      or internal.has_exact_json_keys(p_snapshot, array['schema_version', 'identity_schema_version', 'reviewed_at', 'evaluator', 'evaluator_label', 'decisions']))
    or not internal.is_json_integer_between(p_snapshot -> 'schema_version', 1, 1)
    or not internal.is_json_integer_between(p_snapshot -> 'identity_schema_version', 1, 1)
    or not internal.is_valid_timestamp_text(p_snapshot ->> 'reviewed_at')
    or p_snapshot ->> 'evaluator' <> 'chatgpt'
    or (p_snapshot ? 'evaluator_label' and (jsonb_typeof(p_snapshot -> 'evaluator_label') <> 'string' or char_length(p_snapshot ->> 'evaluator_label') not between 1 and 120))
    or jsonb_typeof(p_snapshot -> 'decisions') <> 'array' or jsonb_array_length(p_snapshot -> 'decisions') > 20 then return false; end if;
  for v_decision in select value from jsonb_array_elements(p_snapshot -> 'decisions') loop
    if not internal.has_exact_json_keys(v_decision, array['candidate_fact_public_id', 'decision', 'reason', 'material_differences'])
      or jsonb_typeof(v_decision -> 'candidate_fact_public_id') <> 'string' or not internal.trivia_is_valid_uuid_text_v1(v_decision ->> 'candidate_fact_public_id')
      or v_decision ->> 'decision' not in ('same', 'distinct')
      or jsonb_typeof(v_decision -> 'reason') <> 'string' or char_length(v_decision ->> 'reason') not between 1 and 500
      or jsonb_typeof(v_decision -> 'material_differences') <> 'array' or jsonb_array_length(v_decision -> 'material_differences') > 10
      or exists (select 1 from jsonb_array_elements_text(v_decision -> 'material_differences') value where value not in ('relation', 'negation', 'number', 'unit', 'time', 'location', 'population', 'condition', 'comparison_direction', 'method', 'scope', 'other')) then return false; end if;
  end loop;
  return true;
end;
$$;

create function internal.trivia_validate_fact_row_v1()
returns trigger
language plpgsql
set search_path = pg_catalog, internal, public
as $$
declare
  v_numbers jsonb;
  v_qualifiers jsonb;
  v_verified_source_count integer;
  v_independent_source_count integer;
  v_has_tier_a boolean;
  v_requires_independent boolean;
  v_max_expiry timestamptz;
begin
  new.normalization_version := 1;
  new.ontology_version := 1;
  new.normalized_claim := internal.trivia_normalize_claim_v1(new.claim_text);
  if char_length(new.normalized_claim) not between 1 and 500 then raise exception using errcode = '23514', message = 'TRIVIA_NORMALIZATION_INVALID'; end if;
  if not internal.trivia_relation_is_known_v1(new.relation_key) then raise exception using errcode = '23514', message = 'TRIVIA_ONTOLOGY_UNSUPPORTED'; end if;
  v_numbers := internal.trivia_canonical_numbers_v1(new.numbers);
  v_qualifiers := internal.trivia_canonical_qualifiers_v1(new.qualifiers);
  if v_numbers is null or v_qualifiers is null then raise exception using errcode = '23514', message = 'TRIVIA_CANDIDATE_INVALID'; end if;
  new.numbers := v_numbers;
  new.qualifiers := v_qualifiers;
  new.claim_hash := internal.trivia_claim_hash_v1(new.normalized_claim);
  new.structured_key := internal.trivia_build_structured_key_v1(new.subject_key, new.relation_key, new.object_key, new.numbers, new.qualifiers);
  new.structured_hash := internal.trivia_structured_hash_v1(new.structured_key);
  new.structured_match_eligible := internal.trivia_structured_match_eligible_v1(new.relation_key, new.numbers, new.qualifiers, new.ontology_version);
  if not internal.is_valid_source_evidence_v1(new.source_data) then raise exception using errcode = '23514', message = 'TRIVIA_SOURCE_INVALID'; end if;
  if not internal.is_valid_dedup_review_snapshot_v1(new.dedup_review_snapshot) then raise exception using errcode = '23514', message = 'TRIVIA_DEDUP_REVIEW_INVALID'; end if;
  if new.verification_status = 'verified' then
    select count(*), count(distinct value ->> 'independence_group'), bool_or(value ->> 'tier' = 'A')
    into v_verified_source_count, v_independent_source_count, v_has_tier_a
    from jsonb_array_elements(new.source_data) item(value) where value ->> 'tier' in ('A', 'B');
    v_requires_independent := new.freshness_class in ('periodic', 'volatile')
      and (new.relation_key = 'holds_record_by_metric_as_of' or new.risk_class = 'sensitive');
    if v_verified_source_count < 1
      or (new.risk_class = 'sensitive' and (not coalesce(v_has_tier_a, false) or v_independent_source_count < 2))
      or (v_requires_independent and v_independent_source_count < 2)
      or (new.freshness_class in ('periodic', 'volatile') and new.as_of_date is null) then
      raise exception using errcode = '23514', message = 'TRIVIA_SOURCE_POLICY_FAILED';
    end if;
    v_max_expiry := case new.freshness_class
      when 'stable' then new.verified_at + interval '24 months'
      when 'periodic' then new.verified_at + interval '12 months'
      when 'volatile' then new.verified_at + case when new.review_note is null then interval '30 days' else interval '90 days' end
    end;
    if new.risk_class = 'sensitive' then v_max_expiry := least(v_max_expiry, new.verified_at + interval '180 days'); end if;
    if new.verified_at is null or new.expires_at is null or new.expires_at <= new.verified_at or new.expires_at > v_max_expiry then
      raise exception using errcode = '23514', message = 'TRIVIA_FRESHNESS_INVALID';
    end if;
  end if;
  return new;
end;
$$;

create trigger trivia_facts_validate_identity_source_freshness
before insert or update on public.trivia_facts
for each row execute function internal.trivia_validate_fact_row_v1();

revoke all on function internal.trivia_normalize_claim_v1(text) from public, anon, authenticated, service_role;
revoke all on function internal.trivia_claim_hash_v1(text) from public, anon, authenticated, service_role;
revoke all on function internal.trivia_relation_is_known_v1(text) from public, anon, authenticated, service_role;
revoke all on function internal.trivia_is_valid_date_text_v1(text) from public, anon, authenticated, service_role;
revoke all on function internal.trivia_is_valid_uuid_text_v1(text) from public, anon, authenticated, service_role;
revoke all on function internal.trivia_relation_is_deterministic_safe_v1(text) from public, anon, authenticated, service_role;
revoke all on function internal.trivia_canonical_numbers_v1(jsonb) from public, anon, authenticated, service_role;
revoke all on function internal.trivia_canonical_qualifiers_v1(jsonb) from public, anon, authenticated, service_role;
revoke all on function internal.trivia_hex_scalar_v1(text) from public, anon, authenticated, service_role;
revoke all on function internal.trivia_build_structured_key_v1(text, text, text, jsonb, jsonb) from public, anon, authenticated, service_role;
revoke all on function internal.trivia_structured_hash_v1(text) from public, anon, authenticated, service_role;
revoke all on function internal.trivia_structured_match_eligible_v1(text, jsonb, jsonb, integer) from public, anon, authenticated, service_role;
revoke all on function internal.is_valid_source_evidence_v1(jsonb) from public, anon, authenticated, service_role;
revoke all on function internal.is_valid_dedup_review_snapshot_v1(jsonb) from public, anon, authenticated, service_role;
revoke all on function internal.trivia_validate_fact_row_v1() from public, anon, authenticated, service_role;
