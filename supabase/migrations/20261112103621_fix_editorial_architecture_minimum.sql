-- CR-062: is_allowed_text_array argumen ketiga adalah minimum, bukan maksimum.
-- Seed format satu/dua architecture harus sah; uniqueness dan allowlist tetap berlaku.
create or replace function internal.editorial_validate_v1(p_workspace bigint,p_kind text,p_payload jsonb) returns void
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
      or internal.is_allowed_text_array(p_payload->'architectures',array['single_subject','themed','mixed'],1) is distinct from true
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
