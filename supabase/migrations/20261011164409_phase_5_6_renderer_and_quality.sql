-- CR-013: deterministic trivia renderer and authoritative quality evidence.
create function internal.post_text_v1(p_text text, p_line boolean default true)
returns text language plpgsql immutable security invoker set search_path='' as $$
declare t text;
begin
  if p_text is null then raise exception using errcode='P0001',message='CONTENT_PAYLOAD_INVALID'; end if;
  t:=pg_catalog.normalize(pg_catalog.replace(p_text,E'\r\n',E'\n'),'NFC');
  t:=pg_catalog.regexp_replace(t,E'[ ]+\n',E'\n','g');
  t:=pg_catalog.regexp_replace(t,'^[[:space:]]+|[[:space:]]+$','','g');
  -- Inspect original normalized input too: trimming must not erase forbidden controls.
  if pg_catalog.replace(pg_catalog.replace(p_text,E'\r\n',E'\n'),E'\n','') ~ '[[:cntrl:]]'
    or (p_line and pg_catalog.strpos(t,E'\n')>0) then
    raise exception using errcode='P0001',message='CONTENT_PAYLOAD_INVALID'; end if;
  if t ~* '(https?://|www\.|```|<[^>]+>|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})' then
    raise exception using errcode='P0001',message='CONTENT_PAYLOAD_INVALID'; end if;
  return t;
end; $$;

create function internal.post_words_v1(p_text text) returns integer
language sql immutable security invoker set search_path='' as $$
  select count(*)::integer from pg_catalog.regexp_matches(p_text,'[[:alnum:]]+([''’\-][[:alnum:]]+)*','g');
$$;
create function internal.post_lines_v1(p_text text,p_width integer) returns integer
language plpgsql immutable security invoker set search_path='' as $$
declare word text; used integer:=0; lines integer:=1;
begin
  foreach word in array pg_catalog.regexp_split_to_array(p_text,'[[:space:]]+') loop
    if pg_catalog.char_length(word)>p_width then
      if used>0 then lines:=lines+1; end if;
      lines:=lines+(pg_catalog.char_length(word)-1)/p_width; used:=1+(pg_catalog.char_length(word)-1)%p_width;
    elsif used=0 then used:=pg_catalog.char_length(word);
    elsif used+1+pg_catalog.char_length(word)<=p_width then used:=used+1+pg_catalog.char_length(word);
    else lines:=lines+1; used:=pg_catalog.char_length(word); end if;
  end loop;
  return lines;
end; $$;

create function internal.post_render_v1(p_payload jsonb) returns jsonb
language plpgsql immutable security invoker set search_path='' as $$
declare c jsonb; f jsonb; b jsonb; texts jsonb:='[]'; tags jsonb:='[]'; tag text;
  hook text; cta text; caption text; block text:=''; copy text; raw text; line text;
  chars jsonb:='[]'; words jsonb:='[]'; lines jsonb:='[]'; n integer; i integer:=0;
  total_lines integer; read_seconds numeric; ratio numeric; metrics jsonb;
begin
  if pg_catalog.octet_length(p_payload::text)>16384
    or internal.has_exact_json_keys(p_payload,array['schema_version','hook','body','cta','canva_copy','caption','hashtags','render_style','text_metrics']) is distinct from true
    or p_payload->'schema_version' is distinct from '1'::jsonb
    or pg_catalog.jsonb_typeof(p_payload->'text_metrics') is distinct from 'object'
    or p_payload->>'render_style' is null or p_payload->>'render_style' not in ('plain_lines','numbered') then
    raise exception using errcode='P0001',message='CONTENT_PAYLOAD_INVALID'; end if;
  b:=p_payload->'body';
  if (internal.has_exact_json_keys(b,array['facts']) is distinct from true
    and internal.has_exact_json_keys(b,array['subject','facts']) is distinct from true)
    or pg_catalog.jsonb_typeof(b->'facts') is distinct from 'array'
    or pg_catalog.jsonb_array_length(b->'facts') not between 1 and 9 then
    raise exception using errcode='P0001',message='CONTENT_PAYLOAD_INVALID'; end if;
  if b ? 'subject' then
    if pg_catalog.jsonb_typeof(b->'subject') is distinct from 'string' then raise exception using errcode='P0001',message='CONTENT_PAYLOAD_INVALID'; end if;
    raw:=internal.post_text_v1(b->>'subject');
    if pg_catalog.char_length(raw) not between 1 and 120 then raise exception using errcode='P0001',message='CONTENT_PAYLOAD_INVALID'; end if;
    b:=pg_catalog.jsonb_set(b,'{subject}',pg_catalog.to_jsonb(raw));
  end if;
  foreach tag in array array['hook','cta','caption','canva_copy'] loop
    if pg_catalog.jsonb_typeof(p_payload->tag) is distinct from 'string' then raise exception using errcode='P0001',message='CONTENT_PAYLOAD_INVALID'; end if;
  end loop;
  hook:=internal.post_text_v1(p_payload->>'hook'); cta:=internal.post_text_v1(p_payload->>'cta'); caption:=internal.post_text_v1(p_payload->>'caption',false);
  if pg_catalog.char_length(hook) not between 1 and 90 or pg_catalog.char_length(cta) not between 1 and 100
    or pg_catalog.char_length(caption) not between 1 and 1000 then raise exception using errcode='P0001',message='CONTENT_PAYLOAD_INVALID'; end if;
  total_lines:=internal.post_lines_v1(hook,34)+internal.post_lines_v1(cta,34);
  for f in select value from pg_catalog.jsonb_array_elements(b->'facts') loop
    i:=i+1;
    if internal.has_exact_json_keys(f,array['position','text']) is distinct from true
      or f->'position' is distinct from pg_catalog.to_jsonb(i) or pg_catalog.jsonb_typeof(f->'text') is distinct from 'string' then
      raise exception using errcode='P0001',message='CONTENT_PAYLOAD_INVALID'; end if;
    raw:=internal.post_text_v1(f->>'text');
    if pg_catalog.char_length(raw) not between 1 and 90 or internal.post_words_v1(raw)>18 then
      raise exception using errcode='P0001',message='CONTENT_PAYLOAD_INVALID'; end if;
    line:=case p_payload->>'render_style' when 'numbered' then i::text||'. ' else '' end||raw;
    block:=block||case when i>1 then E'\n\n' else '' end||line;
    texts:=texts||pg_catalog.jsonb_build_array(pg_catalog.jsonb_build_object('position',i,'text',raw));
    chars:=chars||pg_catalog.jsonb_build_array(pg_catalog.char_length(raw)); words:=words||pg_catalog.jsonb_build_array(internal.post_words_v1(raw));
    n:=internal.post_lines_v1(line,34); total_lines:=total_lines+n;
    lines:=lines||pg_catalog.jsonb_build_array(n);
  end loop;
  copy:=hook||E'\n\n'||block||E'\n\n'||cta; total_lines:=total_lines+i+1;
  if internal.post_text_v1(p_payload->>'canva_copy',false) is distinct from copy then
    raise exception using errcode='P0001',message='CONTENT_RENDER_MISMATCH'; end if;
  if pg_catalog.jsonb_typeof(p_payload->'hashtags') is distinct from 'array' or pg_catalog.jsonb_array_length(p_payload->'hashtags')>5 then
    raise exception using errcode='P0001',message='CONTENT_PAYLOAD_INVALID'; end if;
  for c in select value from pg_catalog.jsonb_array_elements(p_payload->'hashtags') loop
    if pg_catalog.jsonb_typeof(c) is distinct from 'string' then raise exception using errcode='P0001',message='CONTENT_PAYLOAD_INVALID'; end if;
    tag:=internal.post_text_v1(c#>>'{}');
    if tag !~ '^#[[:alnum:]_]{1,60}$' or tag ~* '^#(viral|fyp)$'
      or exists(select 1 from pg_catalog.jsonb_array_elements_text(tags) v where pg_catalog.lower(v)=pg_catalog.lower(tag)) then
      raise exception using errcode='P0001',message='CONTENT_PAYLOAD_INVALID'; end if;
    tags:=tags||pg_catalog.jsonb_build_array(tag);
  end loop;
  read_seconds:=pg_catalog.round(internal.post_words_v1(copy)*0.3+0.35*(i+2),1); ratio:=read_seconds/13;
  metrics:=pg_catalog.jsonb_build_object('hook_chars',pg_catalog.char_length(hook),'fact_chars',chars,'facts_total_chars',pg_catalog.char_length(block),
    'cta_chars',pg_catalog.char_length(cta),'canva_total_chars',pg_catalog.char_length(copy),'word_count',internal.post_words_v1(copy),'fact_word_counts',words,
    'line_count',total_lines,'fact_line_counts',lines,'hook_word_count',internal.post_words_v1(hook),'cta_word_count',internal.post_words_v1(cta),
    'hook_line_count',internal.post_lines_v1(hook,34),'cta_line_count',internal.post_lines_v1(cta,34),'estimated_read_seconds',read_seconds,
    'replay_ratio',ratio,'estimated_loops',pg_catalog.ceil(ratio));
  if p_payload->'text_metrics'<>'{}'::jsonb and p_payload->'text_metrics' is distinct from metrics then
    raise exception using errcode='P0001',message='CONTENT_PAYLOAD_INVALID'; end if;
  return p_payload||pg_catalog.jsonb_build_object('hook',hook,'body',pg_catalog.jsonb_set(b,'{facts}',texts),'cta',cta,'canva_copy',copy,
    'caption',caption,'hashtags',tags,'text_metrics',metrics);
end; $$;

create function internal.post_bindings_v1(p_bindings jsonb,p_content jsonb) returns jsonb
language plpgsql immutable security invoker set search_path='' as $$
declare b jsonb; result jsonb:='[]'; i integer:=0; ids uuid[]:='{}'; id uuid; t text;
begin
  if pg_catalog.jsonb_typeof(p_bindings) is distinct from 'array' or pg_catalog.jsonb_array_length(p_bindings) not between 1 and 9
    or pg_catalog.jsonb_array_length(p_bindings)<>pg_catalog.jsonb_array_length(p_content#>'{body,facts}') then
    raise exception using errcode='P0001',message='MODULE_RELATION_INVALID'; end if;
  for b in select value from pg_catalog.jsonb_array_elements(p_bindings) loop
    i:=i+1;
    if internal.has_exact_json_keys(b,array['position','fact_public_id','fact_role','rendered_text']) is distinct from true
      or b->'position' is distinct from pg_catalog.to_jsonb(i)
      or internal.trivia_is_valid_uuid_v4_v1(b->>'fact_public_id') is distinct from true
      or b->>'fact_role' is null or b->>'fact_role' not in ('general','myth_reversal','numeric_comparison','emotional','practical','scientific','visual')
      or pg_catalog.jsonb_typeof(b->'rendered_text') is distinct from 'string' then
      raise exception using errcode='P0001',message='MODULE_RELATION_INVALID'; end if;
    id:=(b->>'fact_public_id')::uuid; t:=internal.post_text_v1(b->>'rendered_text');
    if id=any(ids) or t is distinct from p_content#>>array['body','facts',(i-1)::text,'text'] then
      raise exception using errcode='P0001',message='MODULE_RELATION_INVALID'; end if;
    ids:=pg_catalog.array_append(ids,id); result:=result||pg_catalog.jsonb_build_array(b||pg_catalog.jsonb_build_object('rendered_text',t));
  end loop;
  return result;
end; $$;

create function internal.post_generation_shape_v1(s jsonb) returns boolean
language plpgsql immutable security invoker set search_path='' as $$
declare k text;
begin
  if pg_catalog.octet_length(s::text)>16384 or internal.has_exact_json_keys(s,array[
    'config_schema_version','fact_count','fact_count_applied','fact_count_override','text_budget','fact_reuse_scope','profile_key','render_style','target_markets','locale',
    'schema_version','module_version','content_schema_version','renderer_version','quality_gate_version','editorial_rubric_version','source_policy_version','dedup_contract_version',
    'config_public_id','config_updated_at','line_width_chars','target_video_seconds','override_reason']) is distinct from true then return false; end if;
  foreach k in array array['schema_version','module_version','config_schema_version','content_schema_version','renderer_version','quality_gate_version','editorial_rubric_version','source_policy_version','dedup_contract_version'] loop
    if s->k is distinct from '1'::jsonb then return false; end if;
  end loop;
  return internal.is_json_integer_between(s->'fact_count_applied',1,9) is true and pg_catalog.jsonb_typeof(s->'fact_count_override')='boolean'
    and s->'line_width_chars'='34'::jsonb and s->'target_video_seconds'='13'::jsonb
    and s->>'profile_key' in ('fast_trivia','practical_utility') and s->>'locale'='en-US'
    and internal.trivia_is_valid_uuid_v4_v1(s->>'config_public_id') is true
    and internal.trivia_is_valid_rfc3339_v1(s->>'config_updated_at') is true
    and (s->'override_reason'='null'::jsonb or internal.plan_safe_reason_v1(s->>'override_reason') is true);
exception when others then return false;
end; $$;
-- Keep the legacy reader unchanged, adding an explicit new closed branch.
alter function internal.is_valid_generation_snapshot_v1(jsonb) rename to is_valid_generation_snapshot_legacy_v1;
create function internal.is_valid_generation_snapshot_v1(p_snapshot jsonb) returns boolean
language sql immutable security invoker set search_path='' as $$
  select case when p_snapshot ? 'schema_version' then internal.post_generation_shape_v1(p_snapshot) is true
    else internal.is_valid_generation_snapshot_legacy_v1(p_snapshot) is true end;
$$;

create function internal.post_editorial_input_v1(s jsonb) returns jsonb
language plpgsql immutable security invoker set search_path='' as $$
declare c jsonb; id text; seen text[]:='{}'; path jsonb; critical text[]:=array['trivia.meaning_preserved','trivia.source_supported','trivia.time_context_valid',
 'trivia.safety_appropriate','trivia.caption_no_new_claim','trivia.substantial_copying_absent'];
 noncritical text[]:=array['trivia.hook_honest','trivia.collection_coherent','trivia.fact_atomic','trivia.surprise_substantive','trivia.variety_sufficient',
 'trivia.english_global_clear','trivia.number_context_clear','trivia.cta_goal_aligned','trivia.caption_supportive','trivia.hashtags_relevant','trivia.visual_rhythm_clear','trivia.format_conformant'];
begin
  if pg_catalog.octet_length(s::text)>32768 or (internal.has_exact_json_keys(s,array['rubric_version','overall_status','criteria','risk_flags']) is distinct from true
    and internal.has_exact_json_keys(s,array['rubric_version','evaluator_label','overall_status','criteria','risk_flags']) is distinct from true)
    or s->'rubric_version' is distinct from '1'::jsonb or s->>'overall_status' is null or s->>'overall_status' not in ('pass','fail','needs_review')
    or pg_catalog.jsonb_typeof(s->'criteria') is distinct from 'array' or pg_catalog.jsonb_array_length(s->'criteria') not between 1 and 30
    or pg_catalog.jsonb_typeof(s->'risk_flags') is distinct from 'array' or pg_catalog.jsonb_array_length(s->'risk_flags')>20 then
    raise exception using errcode='P0001',message='VALIDATION_FAILED'; end if;
  if s ? 'evaluator_label' and (pg_catalog.jsonb_typeof(s->'evaluator_label') is distinct from 'string'
    or pg_catalog.char_length(s->>'evaluator_label') not between 1 and 120 or s->>'evaluator_label' ~ '[[:cntrl:]]') then
    raise exception using errcode='P0001',message='VALIDATION_FAILED'; end if;
  for c in select value from pg_catalog.jsonb_array_elements(s->'criteria') loop
    id:=c->>'id';
    if internal.has_exact_json_keys(c,array['id','severity','status','note','evidence_paths']) is distinct from true
      or id is null or not(id=any(critical||noncritical)) or id=any(seen)
      or c->>'severity' is distinct from (case when id=any(critical) then 'critical' else 'noncritical' end)
      or c->>'status' is null or c->>'status' not in ('pass','fail','needs_review')
      or pg_catalog.jsonb_typeof(c->'note') is distinct from 'string' or pg_catalog.char_length(c->>'note') not between 1 and 500 or c->>'note' ~ '[[:cntrl:]]'
      or pg_catalog.jsonb_typeof(c->'evidence_paths') is distinct from 'array' or pg_catalog.jsonb_array_length(c->'evidence_paths')>20 then
      raise exception using errcode='P0001',message='VALIDATION_FAILED'; end if;
    for path in select value from pg_catalog.jsonb_array_elements(c->'evidence_paths') loop
      if pg_catalog.jsonb_typeof(path) is distinct from 'string' or path#>>'{}' !~ '^[A-Za-z0-9_.$:\[\]/-]{1,200}$' then
        raise exception using errcode='P0001',message='VALIDATION_FAILED'; end if;
    end loop;
    seen:=pg_catalog.array_append(seen,id);
  end loop;
  for c in select value from pg_catalog.jsonb_array_elements(s->'risk_flags') loop
    if pg_catalog.jsonb_typeof(c) is distinct from 'string' or c#>>'{}' not in ('safety','time_sensitive','source_uncertainty','meaning_uncertainty','copying_risk','caption_claim_risk') then
      raise exception using errcode='P0001',message='VALIDATION_FAILED'; end if;
  end loop;
  return s;
end; $$;

create function internal.post_system_v1(c jsonb,s jsonb,h text,r integer) returns jsonb
language plpgsql volatile security invoker set search_path='' as $$
declare checks jsonb:='[]'; key text; ok boolean; actual jsonb; budget jsonb:=s->'text_budget'; m jsonb:=c->'text_metrics'; n integer:=pg_catalog.jsonb_array_length(c#>'{body,facts}'); all_ok boolean:=true;
begin
  foreach key in array array['trivia.schema.config_supported','trivia.schema.content_supported','trivia.format.allowed','trivia.topic.allowed','trivia.profile.allowed',
    'trivia.facts.count_valid','trivia.facts.order_and_junction_match','trivia.facts.current_verified','trivia.facts.fresh','trivia.sources.policy_passed',
    'trivia.dedup.review_complete','trivia.reuse.allowed','trivia.reservation.converted','trivia.render.exact_match','trivia.render.component_budget',
    'trivia.render.final_budget','trivia.readability.hard_limits','trivia.output.no_prohibited_artifacts'] loop
    ok:=true; actual:='true'::jsonb;
    if key='trivia.facts.count_valid' then
      ok:=case s#>>'{fact_count,mode}' when 'fixed' then n=(s#>>'{fact_count,value}')::integer
        else n between (s#>>'{fact_count,min}')::integer and (s#>>'{fact_count,max}')::integer end;
      actual:=pg_catalog.to_jsonb(n);
    elsif key='trivia.render.component_budget' then
      ok:=(m->>'hook_chars')::integer<=(budget->>'hook_max_chars')::integer and (m->>'cta_chars')::integer<=(budget->>'cta_max_chars')::integer
        and (m->>'facts_total_chars')::integer<=(budget->>'facts_total_max_chars')::integer
        and not exists(select 1 from pg_catalog.jsonb_array_elements(m->'fact_chars') v where (v#>>'{}')::integer>(budget->>'fact_max_chars')::integer);
      actual:=m;
    elsif key='trivia.render.final_budget' then ok:=(m->>'canva_total_chars')::integer<=(budget->>'canva_total_max_chars')::integer; actual:=m->'canva_total_chars';
    elsif key='trivia.readability.hard_limits' then
      ok:=(m->>'word_count')::integer<=100 and (m->>'line_count')::integer<=28 and (m->>'hook_word_count')::integer<=12
        and (m->>'cta_word_count')::integer<=14 and (m->>'hook_line_count')::integer<=2 and (m->>'cta_line_count')::integer<=2
        and (m->>'replay_ratio')::numeric<=2.5 and (m->>'estimated_loops')::integer<=3
        and not exists(select 1 from pg_catalog.jsonb_array_elements(m->'fact_line_counts') v where (v#>>'{}')::integer>3);
      actual:=m;
    end if;
    all_ok:=all_ok and ok;
    checks:=checks||pg_catalog.jsonb_build_array(pg_catalog.jsonb_build_object('id',key,'severity','blocking','status',case when ok then 'passed' else 'failed' end,
      'expected',true,'actual',actual,'evidence',pg_catalog.jsonb_build_array('content_payload','generation_snapshot')));
  end loop;
  checks:=checks||pg_catalog.jsonb_build_array(pg_catalog.jsonb_build_object('id','trivia.profile.preferred_band','severity','warning',
    'status',case when (m->>'word_count')::integer between 65 and 85 and (case s->>'profile_key' when 'fast_trivia' then n between 7 and 8 else n between 5 and 6 end)
      then 'passed' else 'needs_review' end,'expected','preferred profile','actual',m,'evidence',pg_catalog.jsonb_build_array('content_payload.text_metrics')));
  return pg_catalog.jsonb_build_object('schema_version',1,'gate_version',1,'evaluated_at',internal.iso_timestamp_v1(pg_catalog.clock_timestamp()),'evaluator','server',
    'post_revision',r,'content_hash',h,'config_version',1,'renderer_version',1,'overall_status',case when all_ok then 'passed' else 'failed' end,'checks',checks);
end; $$;

create function internal.post_editorial_v1(s jsonb,h text,r integer) returns jsonb
language sql volatile security invoker set search_path='' as $$
  select s||pg_catalog.jsonb_build_object('schema_version',1,'evaluated_at',internal.iso_timestamp_v1(pg_catalog.clock_timestamp()),'evaluator','chatgpt','post_revision',r,'content_hash',h);
$$;
create function internal.post_quality_v1(s jsonb,e jsonb) returns text
language sql immutable security invoker set search_path='' as $$
 select case when s->>'overall_status'<>'passed' or e->>'overall_status'<>'pass'
    or exists(select 1 from pg_catalog.jsonb_array_elements(e->'criteria') c where c->>'status'<>'pass') then 'failed'
  when pg_catalog.jsonb_array_length(e->'criteria')<18 then 'pending' else 'passed' end;
$$;

-- Every new helper remains private; API owner needs only execution dependencies.
grant create on schema internal to content_producer_api_owner;
do $$ declare r record; begin
  for r in select p.oid::regprocedure f from pg_catalog.pg_proc p join pg_catalog.pg_namespace n on n.oid=p.pronamespace
    where n.nspname='internal' and (p.proname like 'post_%_v1' or p.proname='is_valid_generation_snapshot_v1') loop
    execute pg_catalog.format('alter function %s owner to content_producer_api_owner',r.f);
    execute pg_catalog.format('revoke all on function %s from public,anon,authenticated,service_role',r.f);
  end loop;
end $$;
revoke create on schema internal from content_producer_api_owner;
