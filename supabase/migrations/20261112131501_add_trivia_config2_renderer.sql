-- CR-062 task4: private config2 renderer; config1 functions/bytes remain untouched.
-- Unicode Emoji 17.0 data, © 2025 Unicode, Inc.; https://www.unicode.org/license.txt
-- Source: https://www.unicode.org/Public/17.0.0/ucd/emoji/emoji-data.txt
-- Source SHA-256: 2cb2bb9455cda83e8481541ecf5b6dfda66a3bb89efa3fa7c5297eccf607b72b
-- Emoji property except ASCII keycap bases, plus keycap/emoji presentation marks.
-- Explicit policy: text-presentation pictographs also count; digits/#/* alone do not.
create function internal.post_has_emoji_config2_v2(p_text text) returns boolean
language sql immutable security invoker set search_path='' as $$
  select p_text collate "C" ~ U&'[\00A9\00AE\203C\2049\20E3\2122\2139\2194-\2199\21A9-\21AA\231A-\231B\2328\23CF\23E9-\23F3\23F8-\23FA\24C2\25AA-\25AB\25B6\25C0\25FB-\25FE\2600-\2604\260E\2611\2614-\2615\2618\261D\2620\2622-\2623\2626\262A\262E-\262F\2638-\263A\2640\2642\2648-\2653\265F-\2660\2663\2665-\2666\2668\267B\267E-\267F\2692-\2697\2699\269B-\269C\26A0-\26A1\26A7\26AA-\26AB\26B0-\26B1\26BD-\26BE\26C4-\26C5\26C8\26CE-\26CF\26D1\26D3-\26D4\26E9-\26EA\26F0-\26F5\26F7-\26FA\26FD\2702\2705\2708-\270D\270F\2712\2714\2716\271D\2721\2728\2733-\2734\2744\2747\274C\274E\2753-\2755\2757\2763-\2764\2795-\2797\27A1\27B0\27BF\2934-\2935\2B05-\2B07\2B1B-\2B1C\2B50\2B55\3030\303D\3297\3299\FE0F\+01F004\+01F0CF\+01F170-\+01F171\+01F17E-\+01F17F\+01F18E\+01F191-\+01F19A\+01F1E6-\+01F1FF\+01F201-\+01F202\+01F21A\+01F22F\+01F232-\+01F23A\+01F250-\+01F251\+01F300-\+01F321\+01F324-\+01F393\+01F396-\+01F397\+01F399-\+01F39B\+01F39E-\+01F3F0\+01F3F3-\+01F3F5\+01F3F7-\+01F4FD\+01F4FF-\+01F53D\+01F549-\+01F54E\+01F550-\+01F567\+01F56F-\+01F570\+01F573-\+01F57A\+01F587\+01F58A-\+01F58D\+01F590\+01F595-\+01F596\+01F5A4-\+01F5A5\+01F5A8\+01F5B1-\+01F5B2\+01F5BC\+01F5C2-\+01F5C4\+01F5D1-\+01F5D3\+01F5DC-\+01F5DE\+01F5E1\+01F5E3\+01F5E8\+01F5EF\+01F5F3\+01F5FA-\+01F64F\+01F680-\+01F6C5\+01F6CB-\+01F6D2\+01F6D5-\+01F6D8\+01F6DC-\+01F6E5\+01F6E9\+01F6EB-\+01F6EC\+01F6F0\+01F6F3-\+01F6FC\+01F7E0-\+01F7EB\+01F7F0\+01F90C-\+01F93A\+01F93C-\+01F945\+01F947-\+01F9FF\+01FA70-\+01FA7C\+01FA80-\+01FA8A\+01FA8E-\+01FAC6\+01FAC8\+01FACD-\+01FADC\+01FADF-\+01FAEA\+01FAEF-\+01FAF8]';
$$;

-- Internal LF is a real line, including empty lines. Legacy wrapping is unchanged.
create function internal.post_lines_config2_v2(p_text text,p_width integer) returns integer
language sql immutable security invoker set search_path='' as $$
  select sum(internal.post_lines_v1(line,p_width))::integer
  from pg_catalog.unnest(pg_catalog.string_to_array(p_text,E'\n')) line;
$$;

create function internal.post_render_config2_v2(p_payload jsonb,p_rules jsonb,
  p_interaction_goal text default null,p_cta_actions jsonb default null)
returns jsonb language plpgsql immutable security invoker set search_path='' as $$
declare
  ceiling constant jsonb:='{"hook_max_chars":120,"fact_max_chars":160,"facts_total_max_chars":900,"cta_max_chars":180,"canva_total_max_chars":1100,"hook_max_words":18,"fact_max_words":30,"cta_max_words":32,"canva_total_max_words":160}';
  budget jsonb:=p_rules->'text_budget'; counts jsonb:=p_rules->'fact_count';
  b jsonb; f jsonb; entry jsonb; placement jsonb; rendered jsonb; metrics jsonb; fingerprint jsonb;
  texts jsonb:='[]'; tags jsonb:='[]'; actions jsonb:=null;
  chars jsonb:='[]'; words jsonb:='[]'; lines jsonb:='[]';
  hook text; cta text; caption text; raw text; tag text; key_name text; block text:=''; copy text;
  fact_lines text[]:='{}'; i integer:=0; count_facts integer; cta_after integer;
  total_lines integer; cta_lines integer; read_seconds numeric; ratio numeric;
  emoji_policy text:=p_rules#>>'{hard_limits,emoji_policy}';
begin
  -- Rules must be server-resolved (task3); recheck all ceilings defensively.
  if p_rules->'config_schema_version' is distinct from '2'::jsonb
    or internal.has_exact_json_keys(budget,array['hook_max_chars','fact_max_chars','facts_total_max_chars','cta_max_chars','canva_total_max_chars','hook_max_words','fact_max_words','cta_max_words','canva_total_max_words']) is distinct from true
    or internal.editorial_count_v2(counts) is distinct from true
    or p_rules->>'render_style' is null or p_rules->>'render_style' not in ('plain_lines','numbered')
    or emoji_policy is null or emoji_policy not in ('forbidden','optional')
    or internal.has_exact_json_keys(p_rules->'caption',array['max_chars']) is distinct from true
    or internal.is_json_integer_between(p_rules#>'{caption,max_chars}',1,500) is distinct from true
    or internal.has_exact_json_keys(p_rules->'hashtags',array['min_count','default_count','max_count']) is distinct from true
    or internal.is_json_integer_between(p_rules#>'{hashtags,min_count}',0,5) is distinct from true
    or internal.is_json_integer_between(p_rules#>'{hashtags,default_count}',(p_rules#>>'{hashtags,min_count}')::integer,5) is distinct from true
    or internal.is_json_integer_between(p_rules#>'{hashtags,max_count}',(p_rules#>>'{hashtags,default_count}')::integer,5) is distinct from true then
    raise exception using errcode='P0001',message='CONFIG_INVALID';
  end if;
  for key_name in select pg_catalog.jsonb_object_keys(ceiling) loop
    if internal.is_json_integer_between(budget->key_name,1,(ceiling->>key_name)::integer) is distinct from true then
      raise exception using errcode='P0001',message='CONFIG_INVALID'; end if;
  end loop;
  if p_interaction_goal is not null and p_interaction_goal not in ('share','save','comment','follow') then
    raise exception using errcode='P0001',message='VALIDATION_FAILED'; end if;
  -- Labels are descriptive, unranked and never classified from the CTA text.
  -- A byte envelope bounds metadata transport; no semantic action-count ceiling.
  if p_cta_actions is not null and p_cta_actions<>'null'::jsonb then
    if pg_catalog.jsonb_typeof(p_cta_actions) is distinct from 'array'
      or pg_catalog.octet_length(p_cta_actions::text)>4096 then
      raise exception using errcode='P0001',message='VALIDATION_FAILED'; end if;
    actions:='[]';
    for entry in select value from pg_catalog.jsonb_array_elements(p_cta_actions) loop
      if pg_catalog.jsonb_typeof(entry) is distinct from 'string' then
        raise exception using errcode='P0001',message='VALIDATION_FAILED'; end if;
      raw:=internal.post_text_v1(entry#>>'{}');
      if pg_catalog.char_length(raw) not between 1 and 80 then
        raise exception using errcode='P0001',message='VALIDATION_FAILED'; end if;
      actions:=actions||pg_catalog.jsonb_build_array(raw);
    end loop;
  end if;
  if pg_catalog.jsonb_typeof(p_payload) is distinct from 'object' then
    raise exception using errcode='P0001',message='CONTENT_PAYLOAD_INVALID'; end if;
  if pg_catalog.octet_length(p_payload::text)>16384
    or internal.has_exact_json_keys(p_payload-'cta_placement',array['schema_version','hook','body','cta','canva_copy','caption','hashtags','render_style','text_metrics']) is distinct from true
    or p_payload->'schema_version' is distinct from '2'::jsonb
    or pg_catalog.jsonb_typeof(p_payload->'text_metrics') is distinct from 'object'
    or p_payload->'render_style' is distinct from p_rules->'render_style' then
    raise exception using errcode='P0001',message='CONTENT_PAYLOAD_INVALID'; end if;
  b:=p_payload->'body';
  if (internal.has_exact_json_keys(b,array['facts']) is distinct from true
    and internal.has_exact_json_keys(b,array['subject','facts']) is distinct from true)
    or pg_catalog.jsonb_typeof(b->'facts') is distinct from 'array' then
    raise exception using errcode='P0001',message='CONTENT_PAYLOAD_INVALID'; end if;
  count_facts:=pg_catalog.jsonb_array_length(b->'facts');
  if count_facts not between 1 and 12 then
    raise exception using errcode='P0001',message='CONTENT_PAYLOAD_INVALID'; end if;
  if (counts->>'mode'='fixed' and count_facts<>(counts->>'value')::integer)
    or (counts->>'mode'='adaptive' and count_facts not between (counts->>'min')::integer and (counts->>'max')::integer) then
    raise exception using errcode='P0001',message='CONTENT_BUDGET_EXCEEDED'; end if;
  placement:=coalesce(p_payload->'cta_placement','{"kind":"after_facts"}'::jsonb);
  if internal.has_exact_json_keys(placement,array['kind']) is true and placement->'kind'='"after_facts"'::jsonb then
    cta_after:=count_facts;
  elsif internal.has_exact_json_keys(placement,array['kind','position']) is true and placement->'kind'='"after_fact"'::jsonb
    and internal.is_json_integer_between(placement->'position',1,count_facts) is true then
    cta_after:=(placement->>'position')::integer;
  else raise exception using errcode='P0001',message='CONTENT_PAYLOAD_INVALID'; end if;
  if b ? 'subject' then
    if pg_catalog.jsonb_typeof(b->'subject') is distinct from 'string' then
      raise exception using errcode='P0001',message='CONTENT_PAYLOAD_INVALID'; end if;
    raw:=internal.post_text_v1(b->>'subject');
    if pg_catalog.char_length(raw) not between 1 and 120 then
      raise exception using errcode='P0001',message='CONTENT_PAYLOAD_INVALID'; end if;
    b:=pg_catalog.jsonb_set(b,'{subject}',pg_catalog.to_jsonb(raw));
  end if;
  foreach key_name in array array['hook','cta','caption','canva_copy'] loop
    if pg_catalog.jsonb_typeof(p_payload->key_name) is distinct from 'string' then
      raise exception using errcode='P0001',message='CONTENT_PAYLOAD_INVALID'; end if;
  end loop;
  hook:=internal.post_text_v1(p_payload->>'hook');
  cta:=internal.post_text_v1(p_payload->>'cta',false);
  caption:=internal.post_text_v1(p_payload->>'caption',false);
  if hook='' or cta='' then raise exception using errcode='P0001',message='CONTENT_PAYLOAD_INVALID'; end if;
  if pg_catalog.char_length(hook)>(budget->>'hook_max_chars')::integer
    or internal.post_words_v1(hook)>(budget->>'hook_max_words')::integer
    or pg_catalog.char_length(cta)>(budget->>'cta_max_chars')::integer
    or internal.post_words_v1(cta)>(budget->>'cta_max_words')::integer
    or pg_catalog.char_length(caption)>(p_rules#>>'{caption,max_chars}')::integer then
    raise exception using errcode='P0001',message='CONTENT_BUDGET_EXCEEDED'; end if;
  for f in select value from pg_catalog.jsonb_array_elements(b->'facts') loop
    i:=i+1;
    if internal.has_exact_json_keys(f,array['position','text']) is distinct from true
      or f->'position' is distinct from pg_catalog.to_jsonb(i)
      or pg_catalog.jsonb_typeof(f->'text') is distinct from 'string' then
      raise exception using errcode='P0001',message='CONTENT_PAYLOAD_INVALID'; end if;
    raw:=internal.post_text_v1(f->>'text');
    if raw='' then raise exception using errcode='P0001',message='CONTENT_PAYLOAD_INVALID'; end if;
    if pg_catalog.char_length(raw)>(budget->>'fact_max_chars')::integer
      or internal.post_words_v1(raw)>(budget->>'fact_max_words')::integer then
      raise exception using errcode='P0001',message='CONTENT_BUDGET_EXCEEDED'; end if;
    tag:=case p_payload->>'render_style' when 'numbered' then i::text||'. ' else '' end||raw;
    fact_lines:=pg_catalog.array_append(fact_lines,tag);
    block:=block||case when i>1 then E'\n\n' else '' end||tag;
    texts:=texts||pg_catalog.jsonb_build_array(pg_catalog.jsonb_build_object('position',i,'text',raw));
    chars:=chars||pg_catalog.jsonb_build_array(pg_catalog.char_length(raw));
    words:=words||pg_catalog.jsonb_build_array(internal.post_words_v1(raw));
    lines:=lines||pg_catalog.jsonb_build_array(internal.post_lines_config2_v2(tag,34));
  end loop;
  copy:=hook;
  for i in 1..count_facts loop
    copy:=copy||E'\n\n'||fact_lines[i];
    if i=cta_after then copy:=copy||E'\n\n'||cta; end if;
  end loop;
  if internal.post_text_v1(p_payload->>'canva_copy',false) is distinct from copy then
    raise exception using errcode='P0001',message='CONTENT_RENDER_MISMATCH'; end if;
  if pg_catalog.char_length(block)>(budget->>'facts_total_max_chars')::integer
    or pg_catalog.char_length(copy)>(budget->>'canva_total_max_chars')::integer
    or internal.post_words_v1(copy)>(budget->>'canva_total_max_words')::integer then
    raise exception using errcode='P0001',message='CONTENT_BUDGET_EXCEEDED'; end if;
  if pg_catalog.jsonb_typeof(p_payload->'hashtags') is distinct from 'array' then
    raise exception using errcode='P0001',message='CONTENT_PAYLOAD_INVALID'; end if;
  if pg_catalog.jsonb_array_length(p_payload->'hashtags') not between
    (p_rules#>>'{hashtags,min_count}')::integer and (p_rules#>>'{hashtags,max_count}')::integer then
    raise exception using errcode='P0001',message='CONTENT_BUDGET_EXCEEDED'; end if;
  for entry in select value from pg_catalog.jsonb_array_elements(p_payload->'hashtags') loop
    if pg_catalog.jsonb_typeof(entry) is distinct from 'string' then
      raise exception using errcode='P0001',message='CONTENT_PAYLOAD_INVALID'; end if;
    tag:=internal.post_text_v1(entry#>>'{}');
    if tag !~ '^#[[:alnum:]_]{1,60}$' or tag ~* '^#(viral|fyp)$'
      or exists(select 1 from pg_catalog.jsonb_array_elements_text(tags) v where pg_catalog.lower(v)=pg_catalog.lower(tag)) then
      raise exception using errcode='P0001',message='CONTENT_PAYLOAD_INVALID'; end if;
    tags:=tags||pg_catalog.jsonb_build_array(tag);
  end loop;
  if emoji_policy='forbidden' and internal.post_has_emoji_config2_v2(copy||caption||coalesce(b->>'subject','')||tags::text) then
    raise exception using errcode='P0001',message='CONTENT_PAYLOAD_INVALID'; end if;
  total_lines:=internal.post_lines_config2_v2(copy,34);
  cta_lines:=internal.post_lines_config2_v2(cta,34);
  read_seconds:=pg_catalog.round(internal.post_words_v1(copy)*0.3+0.35*(count_facts+2),1);
  ratio:=read_seconds/13;
  metrics:=pg_catalog.jsonb_build_object('hook_chars',pg_catalog.char_length(hook),'fact_chars',chars,'facts_total_chars',pg_catalog.char_length(block),
    'cta_chars',pg_catalog.char_length(cta),'canva_total_chars',pg_catalog.char_length(copy),'word_count',internal.post_words_v1(copy),'fact_word_counts',words,
    'line_count',total_lines,'fact_line_counts',lines,'hook_word_count',internal.post_words_v1(hook),'cta_word_count',internal.post_words_v1(cta),
    'hook_line_count',internal.post_lines_config2_v2(hook,34),'cta_line_count',cta_lines,'estimated_read_seconds',read_seconds,
    'replay_ratio',ratio,'estimated_loops',pg_catalog.ceil(ratio),'estimator_version',1,'line_width_chars',34,'target_video_seconds',13);
  if p_payload->'text_metrics'<>'{}'::jsonb and p_payload->'text_metrics' is distinct from metrics then
    raise exception using errcode='P0001',message='CONTENT_PAYLOAD_INVALID'; end if;
  rendered:=p_payload||pg_catalog.jsonb_build_object('hook',hook,'body',pg_catalog.jsonb_set(b,'{facts}',texts),'cta',cta,'canva_copy',copy,
    'caption',caption,'hashtags',tags,'text_metrics',metrics,'cta_placement',placement);
  fingerprint:=pg_catalog.jsonb_build_object('content_payload',rendered,'interaction_goal',p_interaction_goal,'cta_actions',actions);
  return fingerprint||pg_catalog.jsonb_build_object('readability','advisory','render_hash_version',1,'render_hash',
    pg_catalog.encode(extensions.digest(pg_catalog.convert_to('content-producer:render:config2:v1|'||fingerprint::text,'UTF8'),'sha256'),'hex'));
end; $$;

-- No table/grant/API mutation. Only the API owner can invoke these pure helpers.
grant create on schema internal to content_producer_api_owner;
alter function internal.post_has_emoji_config2_v2(text) owner to content_producer_api_owner;
alter function internal.post_lines_config2_v2(text,integer) owner to content_producer_api_owner;
alter function internal.post_render_config2_v2(jsonb,jsonb,text,jsonb) owner to content_producer_api_owner;
revoke all on function internal.post_has_emoji_config2_v2(text),
  internal.post_lines_config2_v2(text,integer),internal.post_render_config2_v2(jsonb,jsonb,text,jsonb)
  from public,anon,authenticated,service_role;
revoke create on schema internal from content_producer_api_owner;
