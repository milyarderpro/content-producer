-- Phase 3 contract correction: version constants must be JSON integers, not
-- merely values whose text representation equals "1".

create or replace function internal.is_valid_system_checks_v1(
  p_snapshot jsonb,
  p_content_hash text,
  p_revision integer
)
returns boolean
language plpgsql
stable
strict
set search_path = pg_catalog, internal
as $$
declare
  v_check jsonb;
begin
  if jsonb_typeof(p_snapshot) <> 'object' or octet_length(p_snapshot::text) > 32768
    or not internal.has_exact_json_keys(p_snapshot, array['schema_version', 'gate_version', 'evaluated_at', 'evaluator', 'post_revision', 'content_hash', 'config_version', 'renderer_version', 'overall_status', 'checks'])
    or not internal.is_json_integer_between(p_snapshot -> 'schema_version', 1, 1)
    or not internal.is_json_integer_between(p_snapshot -> 'gate_version', 1, 2147483647)
    or not internal.is_valid_timestamp_text(p_snapshot ->> 'evaluated_at')
    or p_snapshot ->> 'evaluator' <> 'server'
    or internal.json_integer_value(p_snapshot -> 'post_revision') <> p_revision
    or p_snapshot ->> 'content_hash' <> p_content_hash
    or not internal.is_json_integer_between(p_snapshot -> 'config_version', 1, 2147483647)
    or not internal.is_json_integer_between(p_snapshot -> 'renderer_version', 1, 2147483647)
    or p_snapshot ->> 'overall_status' not in ('passed', 'failed', 'needs_review')
    or jsonb_typeof(p_snapshot -> 'checks') <> 'array' or jsonb_array_length(p_snapshot -> 'checks') = 0 then
    return false;
  end if;

  for v_check in select value from jsonb_array_elements(p_snapshot -> 'checks') loop
    if not internal.has_exact_json_keys(v_check, array['id', 'severity', 'status', 'expected', 'actual', 'evidence'])
      or nullif(btrim(v_check ->> 'id'), '') is null
      or v_check ->> 'severity' not in ('blocking', 'warning')
      or v_check ->> 'status' not in ('passed', 'failed', 'needs_review')
      or jsonb_typeof(v_check -> 'expected') = 'null'
      or jsonb_typeof(v_check -> 'actual') = 'null'
      or jsonb_typeof(v_check -> 'evidence') <> 'array'
      or exists (
        select 1
        from jsonb_array_elements(v_check -> 'evidence') as entry
        where jsonb_typeof(entry) <> 'string'
          or nullif(btrim(entry #>> '{}'), '') is null
      ) then
      return false;
    end if;
  end loop;

  return true;
end;
$$;

create or replace function internal.is_valid_editorial_checks_v1(
  p_snapshot jsonb,
  p_content_hash text,
  p_revision integer
)
returns boolean
language plpgsql
stable
strict
set search_path = pg_catalog, internal
as $$
declare
  v_criterion jsonb;
begin
  if jsonb_typeof(p_snapshot) <> 'object' or octet_length(p_snapshot::text) > 32768
    or not (
      internal.has_exact_json_keys(p_snapshot, array['schema_version', 'rubric_version', 'evaluated_at', 'evaluator', 'post_revision', 'content_hash', 'overall_status', 'criteria', 'risk_flags'])
      or internal.has_exact_json_keys(p_snapshot, array['schema_version', 'rubric_version', 'evaluated_at', 'evaluator', 'evaluator_label', 'post_revision', 'content_hash', 'overall_status', 'criteria', 'risk_flags'])
    )
    or not internal.is_json_integer_between(p_snapshot -> 'schema_version', 1, 1)
    or not internal.is_json_integer_between(p_snapshot -> 'rubric_version', 1, 1)
    or not internal.is_valid_timestamp_text(p_snapshot ->> 'evaluated_at')
    or p_snapshot ->> 'evaluator' <> 'chatgpt'
    or (
      p_snapshot ? 'evaluator_label'
      and (
        jsonb_typeof(p_snapshot -> 'evaluator_label') <> 'string'
        or char_length(p_snapshot ->> 'evaluator_label') not between 1 and 120
      )
    )
    or internal.json_integer_value(p_snapshot -> 'post_revision') <> p_revision
    or p_snapshot ->> 'content_hash' <> p_content_hash
    or p_snapshot ->> 'overall_status' not in ('pass', 'fail', 'needs_review')
    or jsonb_typeof(p_snapshot -> 'criteria') <> 'array'
    or jsonb_array_length(p_snapshot -> 'criteria') not between 1 and 30
    or jsonb_typeof(p_snapshot -> 'risk_flags') <> 'array'
    or jsonb_array_length(p_snapshot -> 'risk_flags') > 20
    or exists (
      select 1
      from jsonb_array_elements(p_snapshot -> 'risk_flags') as flag
      where jsonb_typeof(flag) <> 'string'
        or nullif(btrim(flag #>> '{}'), '') is null
    ) then
    return false;
  end if;

  for v_criterion in select value from jsonb_array_elements(p_snapshot -> 'criteria') loop
    if not internal.has_exact_json_keys(v_criterion, array['id', 'severity', 'status', 'note', 'evidence_paths'])
      or nullif(btrim(v_criterion ->> 'id'), '') is null
      or v_criterion ->> 'severity' not in ('critical', 'noncritical')
      or v_criterion ->> 'status' not in ('pass', 'fail', 'needs_review')
      or jsonb_typeof(v_criterion -> 'note') <> 'string'
      or char_length(v_criterion ->> 'note') not between 1 and 500
      or jsonb_typeof(v_criterion -> 'evidence_paths') <> 'array'
      or jsonb_array_length(v_criterion -> 'evidence_paths') > 20
      or exists (
        select 1
        from jsonb_array_elements(v_criterion -> 'evidence_paths') as path
        where jsonb_typeof(path) <> 'string'
          or nullif(btrim(path #>> '{}'), '') is null
      ) then
      return false;
    end if;
  end loop;

  return true;
end;
$$;

revoke all on function internal.is_valid_system_checks_v1(jsonb, text, integer)
  from public, anon, authenticated, service_role;
revoke all on function internal.is_valid_editorial_checks_v1(jsonb, text, integer)
  from public, anon, authenticated, service_role;
