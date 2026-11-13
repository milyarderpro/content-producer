-- CR-062 task 3: config2 dan resolusi profil Page. Tidak mengubah post/config1.
alter table public.page_niche_configs
  add column editorial_bindings jsonb not null default '[]',
  add column editorial_rules jsonb,
  add column editorial_rules_hash text,
  add constraint page_editorial_state_check check (
    (niche_key='trivia' and config_schema_version=2 and jsonb_typeof(editorial_bindings)='array'
      and jsonb_array_length(editorial_bindings) between 3 and 257
      and editorial_rules is not null and editorial_rules_hash is not null and jsonb_typeof(editorial_rules)='object' and editorial_rules_hash ~ '^[0-9a-f]{64}$')
    or ((niche_key<>'trivia' or config_schema_version<>2) and editorial_bindings='[]'::jsonb and editorial_rules is null and editorial_rules_hash is null)
  );

create function internal.editorial_config_input_v2(p jsonb) returns boolean
language plpgsql immutable security invoker set search_path='' as $$
begin
  if jsonb_typeof(p) is distinct from 'object' or octet_length(p::text)>65536
    or p->'config_schema_version' is distinct from '2'::jsonb
    or not internal.editorial_reference_shape_v1(p->'editorial_profile_ref')
    or exists(select 1 from jsonb_object_keys(p) k where k not in ('config_schema_version','editorial_profile_ref',
      'allowed_format_refs','allowed_topic_refs','format_weights','topic_weights','fact_reuse_scope','overrides'))
    or (p ? 'fact_reuse_scope' and (jsonb_typeof(p->'fact_reuse_scope')<>'string' or p->>'fact_reuse_scope' not in ('workspace_unique','page_unique')))
    or (p ? 'overrides' and jsonb_typeof(p->'overrides') is distinct from 'object') then return false; end if;
  return true;
end; $$;
create function internal.editorial_bound_time_v2(p_bindings jsonb,p_kind text,p_ref jsonb) returns timestamptz
language sql stable security invoker set search_path='' as $$
  select (value->>'bound_at')::timestamptz from jsonb_array_elements(p_bindings)
    where value->>'kind'=p_kind and value->'reference'=p_ref limit 1;
$$;
create function internal.editorial_count_v2(p jsonb) returns boolean
language plpgsql immutable security invoker set search_path='' as $$
begin
  if p->>'mode'='fixed' then
    return internal.has_exact_json_keys(p,array['mode','value']) is true
      and internal.is_json_integer_between(p->'value',1,12) is true;
  elsif p->>'mode'='adaptive' then
    return internal.has_exact_json_keys(p,array['mode','min','preferred','max']) is true
      and internal.is_json_integer_between(p->'min',1,12) is true
      and internal.is_json_integer_between(p->'preferred',(p->>'min')::integer,12) is true
      and internal.is_json_integer_between(p->'max',(p->>'preferred')::integer,12) is true;
  end if;
  return false;
exception when others then return false;
end; $$;
create function internal.editorial_resolve_v2(p_workspace bigint,p_input jsonb,
  p_old_bindings jsonb default '[]',p_format_key text default null,p_item jsonb default '{}') returns jsonb
language plpgsql volatile security invoker set search_path='' as $$
declare profile public.trivia_editorial_definitions; d public.trivia_editorial_definitions;
  selected public.trivia_editorial_definitions; old_time timestamptz; bindings jsonb:='[]';
  refs jsonb; ref jsonb; p jsonb; canonical jsonb; rules jsonb; preferences jsonb; density jsonb;
  overrides jsonb; budget jsonb; style jsonb; counts jsonb; page_counts jsonb; key_name text; kind_name text;
  choice_keys text[]; formats text[]; topics text[]; weights jsonb; total integer;
  ceiling jsonb:='{"hook_max_chars":120,"fact_max_chars":160,"facts_total_max_chars":900,"cta_max_chars":180,"canva_total_max_chars":1100,"hook_max_words":18,"fact_max_words":30,"cta_max_words":32,"canva_total_max_words":160}';
  caption jsonb:='{"max_chars":500}'; tags jsonb:='{"min_count":0,"default_count":3,"max_count":5}';
  render_style text:='plain_lines'; min_count integer; max_count integer; actual_min integer; actual_max integer;
begin
  if not internal.editorial_config_input_v2(p_input) or jsonb_typeof(p_old_bindings) is distinct from 'array'
    or jsonb_array_length(p_old_bindings)>257 or jsonb_typeof(p_item) is distinct from 'object'
    or octet_length(p_item::text)>8192 then raise exception using errcode='P0001',message='CONFIG_INVALID'; end if;
  ref:=p_input->'editorial_profile_ref'; old_time:=internal.editorial_bound_time_v2(p_old_bindings,'profile',ref);
  profile:=internal.editorial_reference_v1(p_workspace,ref,'profile',old_time); p:=profile.payload;
  bindings:=jsonb_build_array(jsonb_build_object('kind','profile','reference',ref,'bound_at',internal.iso_timestamp_v1(coalesce(old_time,clock_timestamp()))));
  overrides:=coalesce(p_input->'overrides','{}'::jsonb);
  if exists(select 1 from jsonb_each(overrides) x where x.key not in ('fact_count','text_budget','render_style','style','density_preferences','caption','hashtags') or x.value='null'::jsonb) then
    raise exception using errcode='P0001',message='CONFIG_INVALID'; end if;
  canonical:=jsonb_build_object('config_schema_version',2,'editorial_profile_ref',ref,
    'fact_reuse_scope',coalesce(p_input->>'fact_reuse_scope','workspace_unique'),'overrides',overrides);
  foreach kind_name in array array['format','topic'] loop
    refs:=coalesce(p_input->('allowed_'||kind_name||'_refs'),p->(kind_name||'_refs'));
    if jsonb_typeof(refs) is distinct from 'array' or jsonb_array_length(refs) not between 1 and 128 then
      raise exception using errcode='P0001',message='CONFIG_INVALID'; end if;
    choice_keys:='{}';
    for ref in select value from jsonb_array_elements(refs) loop
      old_time:=internal.editorial_bound_time_v2(p_old_bindings,kind_name,ref);
      d:=internal.editorial_reference_v1(p_workspace,ref,kind_name,old_time);
      if d.key=any(choice_keys) then raise exception using errcode='P0001',message='CONFIG_INVALID'; end if;
      choice_keys:=array_append(choice_keys,d.key);
      bindings:=bindings||jsonb_build_array(jsonb_build_object('kind',kind_name,'reference',ref,
        'bound_at',internal.iso_timestamp_v1(coalesce(old_time,clock_timestamp()))));
      if kind_name='format' and d.key=p_format_key then selected:=d; end if;
    end loop;
    weights:=p_input->(kind_name||'_weights');
    if weights is null then
      select coalesce(jsonb_object_agg(k,v),'{}') into weights from jsonb_each(p->(kind_name||'_weights')) x(k,v) where k=any(choice_keys);
    end if;
    if internal.has_exact_json_keys(weights,choice_keys) is distinct from true then raise exception using errcode='P0001',message='CONFIG_INVALID'; end if;
    total:=0;
    foreach key_name in array choice_keys loop
      if internal.is_json_integer_between(weights->key_name,0,100) is distinct from true then raise exception using errcode='P0001',message='CONFIG_INVALID'; end if;
      total:=total+(weights->>key_name)::integer;
    end loop;
    if total<>100 then raise exception using errcode='P0001',message='CONFIG_INVALID'; end if;
    canonical:=canonical||jsonb_build_object('allowed_'||kind_name||'_refs',refs,kind_name||'_weights',weights);
    if kind_name='format' then formats:=choice_keys; else topics:=choice_keys; end if;
  end loop;
  if p_format_key is not null and selected.id is null then raise exception using errcode='P0001',message='FORMAT_UNSUPPORTED'; end if;
  -- Default format di bawah preferensi profil, lalu override Page eksplisit.
  density:=coalesce(selected.payload->'density_preferences','{}'::jsonb)||(p->'density_preferences');
  if overrides ? 'density_preferences' then
    if not internal.editorial_density_v1(overrides->'density_preferences')
      or exists(select 1 from jsonb_object_keys(overrides->'density_preferences') k where not(p->'density_preferences' ? k)) then
      raise exception using errcode='P0001',message='CONFIG_INVALID'; end if;
    density:=density||(overrides->'density_preferences');
  end if;
  counts:=coalesce(overrides->'fact_count',jsonb_build_object('mode','adaptive','min',1,'preferred',(p#>>'{fact_count,preferred}')::integer,'max',12));
  if not internal.editorial_count_v2(counts) then raise exception using errcode='P0001',message='CONFIG_INVALID'; end if;
  budget:=p->'default_limits';
  if overrides ? 'text_budget' then
    if jsonb_typeof(overrides->'text_budget') is distinct from 'object'
      or exists(select 1 from jsonb_object_keys(overrides->'text_budget') k where not(ceiling ? k)) then raise exception using errcode='P0001',message='CONFIG_INVALID'; end if;
    budget:=budget||(overrides->'text_budget');
  end if;
  for key_name in select jsonb_object_keys(ceiling) loop
    if internal.is_json_integer_between(budget->key_name,1,(ceiling->>key_name)::integer) is distinct from true then raise exception using errcode='P0001',message='CONFIG_INVALID'; end if;
  end loop;
  style:=jsonb_build_object('hook_templates',p->'hook_templates','hook_casing',p->'hook_casing','voice',p->'voice',
    'units_preference',p->'units_preference','cta_guidance',p->'cta_guidance','emoji_policy',p->'emoji_policy');
  if overrides ? 'style' then
    if jsonb_typeof(overrides->'style') is distinct from 'object'
      or exists(select 1 from jsonb_each(overrides->'style') x where not(style ? x.key) or x.value='null'::jsonb) then raise exception using errcode='P0001',message='CONFIG_INVALID'; end if;
    style:=style||(overrides->'style');
  end if;
  if style->>'hook_casing' not in ('uppercase','sentence_case','as_written')
    or not internal.editorial_strings_v1(style->'hook_templates',1,16,120)
    or not internal.editorial_text_v1(style->'voice',2000)
    or style->>'units_preference' not in ('contextual','us_customary','metric','dual_when_useful')
    or style->>'emoji_policy' not in ('forbidden','optional')
    or internal.has_exact_json_keys(style->'cta_guidance',array['guidance','examples']) is distinct from true
    or not internal.editorial_text_v1(style#>'{cta_guidance,guidance}',2000)
    or not internal.editorial_strings_v1(style#>'{cta_guidance,examples}',0,16,180) then raise exception using errcode='P0001',message='CONFIG_INVALID'; end if;
  if overrides ? 'render_style' then render_style:=overrides->>'render_style'; end if;
  if render_style is null or render_style not in ('plain_lines','numbered') then raise exception using errcode='P0001',message='CONFIG_INVALID'; end if;
  if overrides ? 'caption' then caption:=overrides->'caption'; end if;
  if overrides ? 'hashtags' then tags:=overrides->'hashtags'; end if;
  if internal.has_exact_json_keys(caption,array['max_chars']) is distinct from true
    or internal.is_json_integer_between(caption->'max_chars',1,500) is distinct from true
    or internal.has_exact_json_keys(tags,array['min_count','default_count','max_count']) is distinct from true
    or internal.is_json_integer_between(tags->'min_count',0,5) is distinct from true
    or internal.is_json_integer_between(tags->'default_count',(tags->>'min_count')::integer,5) is distinct from true
    or internal.is_json_integer_between(tags->'max_count',(tags->>'default_count')::integer,5) is distinct from true then raise exception using errcode='P0001',message='CONFIG_INVALID'; end if;
  -- Item/instruksi hanya mempersempit izin Page; profile_key adalah density, bukan DNA.
  if exists(select 1 from jsonb_each(p_item) x where x.key not in ('profile_key','fact_count','render_style','text_budget','caption','hashtags') or x.value='null'::jsonb) then raise exception using errcode='P0001',message='CONFIG_INVALID'; end if;
  page_counts:=counts;
  if p_item ? 'profile_key' and (jsonb_typeof(p_item->'profile_key')<>'string' or not(p->'density_preferences' ? (p_item->>'profile_key'))) then raise exception using errcode='P0001',message='CONFIG_INVALID'; end if;
  if p_item ? 'fact_count' then
    if not internal.editorial_count_v2(p_item->'fact_count') then raise exception using errcode='P0001',message='CONFIG_INVALID'; end if;
    min_count:=case when counts->>'mode'='fixed' then (counts->>'value')::integer else (counts->>'min')::integer end;
    max_count:=case when counts->>'mode'='fixed' then (counts->>'value')::integer else (counts->>'max')::integer end;
    counts:=p_item->'fact_count';
    actual_min:=case when counts->>'mode'='fixed' then (counts->>'value')::integer else (counts->>'min')::integer end;
    actual_max:=case when counts->>'mode'='fixed' then (counts->>'value')::integer else (counts->>'max')::integer end;
    if actual_min<min_count or actual_max>max_count then raise exception using errcode='P0001',message='CONFIG_INVALID'; end if;
  end if;
  if p_item ? 'text_budget' then
    if jsonb_typeof(p_item->'text_budget') is distinct from 'object' then raise exception using errcode='P0001',message='CONFIG_INVALID'; end if;
    for key_name in select jsonb_object_keys(p_item->'text_budget') loop
      if not(budget ? key_name) or internal.is_json_integer_between(p_item->'text_budget'->key_name,1,(budget->>key_name)::integer) is distinct from true then raise exception using errcode='P0001',message='CONFIG_INVALID'; end if;
    end loop;
    budget:=budget||(p_item->'text_budget');
  end if;
  if p_item ? 'render_style' and p_item->>'render_style' is distinct from render_style then raise exception using errcode='P0001',message='CONFIG_INVALID'; end if;
  if p_item ? 'caption' then
    if internal.has_exact_json_keys(p_item->'caption',array['max_chars']) is distinct from true
      or internal.is_json_integer_between(p_item#>'{caption,max_chars}',1,(caption->>'max_chars')::integer) is distinct from true then raise exception using errcode='P0001',message='CONFIG_INVALID'; end if;
    caption:=p_item->'caption';
  end if;
  if p_item ? 'hashtags' then
    if internal.has_exact_json_keys(p_item->'hashtags',array['min_count','default_count','max_count']) is distinct from true
      or internal.is_json_integer_between(p_item#>'{hashtags,min_count}',(tags->>'min_count')::integer,(tags->>'max_count')::integer) is distinct from true
      or internal.is_json_integer_between(p_item#>'{hashtags,default_count}',(p_item#>>'{hashtags,min_count}')::integer,(tags->>'max_count')::integer) is distinct from true
      or internal.is_json_integer_between(p_item#>'{hashtags,max_count}',(p_item#>>'{hashtags,default_count}')::integer,(tags->>'max_count')::integer) is distinct from true then raise exception using errcode='P0001',message='CONFIG_INVALID'; end if;
    tags:=p_item->'hashtags';
  end if;
  preferences:=style||jsonb_build_object('fact_count',p->'fact_count','density_preferences',density,
    'selection_guidance',p->'selection_guidance','ordering_guidance',p->'ordering_guidance');
  rules:=jsonb_build_object('config_schema_version',2,'editorial_profile_ref',p_input->'editorial_profile_ref',
    'format_reference',case when selected.id is null then null else jsonb_build_object('public_id',selected.public_id,'version',selected.version,'hash',selected.hash) end,
    'allowed_formats',to_jsonb(formats),'allowed_topics',to_jsonb(topics),'format_weights',canonical->'format_weights','topic_weights',canonical->'topic_weights',
    'fact_count',counts,'text_budget',budget,'caption',caption,'hashtags',tags,'render_style',render_style,
    'fact_reuse_scope',canonical->'fact_reuse_scope','locale','en-US','english_variant','en-US',
    'hard_limits',jsonb_build_object('fact_count',page_counts,'text_budget',budget,'emoji_policy',style->'emoji_policy','caption',caption,'hashtags',tags),
    'preferences',preferences,'profile_key',p_item->>'profile_key',
    'format_guidance',case when selected.id is null then null else selected.payload-'examples'-'density_preferences' end);
  if octet_length(canonical::text)>65536 or octet_length(rules::text)>98304 then raise exception using errcode='P0001',message='CONFIG_INVALID'; end if;
  return jsonb_build_object('config',canonical,'bindings',bindings,'rules',rules,'rules_hash',encode(extensions.digest(convert_to(
    jsonb_build_object('config',canonical,'rules',rules)::text,'UTF8'),'sha256'),'hex'));
exception when invalid_text_representation or numeric_value_out_of_range or invalid_parameter_value then
  raise exception using errcode='P0001',message='CONFIG_INVALID';
end; $$;

create or replace function internal.validate_page_niche_config() returns trigger
language plpgsql security invoker set search_path='' as $$
declare resolved jsonb; old_bindings jsonb:='[]';
begin
  if new.niche_key<>'trivia' then return new; end if;
  if new.config_schema_version=1 then
    if internal.is_valid_trivia_config_v1(new.config) is distinct from true then raise exception using errcode='23514',message='TRIVIA_CONFIG_INVALID'; end if;
    new.editorial_bindings:='[]'; new.editorial_rules:=null; new.editorial_rules_hash:=null; return new;
  elsif new.config_schema_version<>2 then raise exception using errcode='23514',message='TRIVIA_CONFIG_INVALID'; end if;
  if tg_op='UPDATE' and old.config_schema_version=2 then
    old_bindings:=old.editorial_bindings;
    if new.config=old.config then
      new.editorial_bindings:=old.editorial_bindings; new.editorial_rules:=old.editorial_rules;
      new.editorial_rules_hash:=old.editorial_rules_hash; return new;
    end if;
  end if;
  resolved:=internal.editorial_resolve_v2(new.workspace_id,new.config,old_bindings);
  new.config:=resolved->'config'; new.editorial_bindings:=resolved->'bindings'; new.editorial_rules:=resolved->'rules';
  new.editorial_rules_hash:=resolved->>'rules_hash';
  if tg_op='UPDATE' then new.updated_at:=greatest(new.updated_at,old.updated_at+interval '1 microsecond'); end if;
  return new;
end; $$;

-- Bootstrap internal eksplisit; tidak dipanggil oleh Read atau mengubah Page otomatis.
create function internal.editorial_seed_profiles_v2(p_workspace bigint) returns integer
language plpgsql volatile security invoker set search_path='' as $$
declare templates constant jsonb:='{"curious_mind": {"definition_schema_version": 1, "display_name": "Curious Mind", "description": "Distinct reference-inspired editorial profile; original research and copy remain mandatory.", "provenance": {"basis": "CR-062 task1 account-specific adjudication and largest-remainder weights; pattern evidence only.", "references": ["curious_mind/POST-002", "curious_mind/POST-007", "curious_mind/POST-015"]}, "notes": ["55 raw / 51 account+ID records; OCR CTA POST-016/018/022 excluded; POST-047/052 duplicate copy is not independent.", "Examples below are structural templates with placeholders, not researched production facts.", "Count, words, surprise mix and ordering are preferences; explicit Page limits govern."], "examples": [{"kind": "positive", "text": "Did You Know?\n\n[A familiar food: unusual verified detail.]\n\n[A distinct everyday origin.]\n\nFollow for more everyday discoveries.", "note": "Original structural template inspired by the cited pattern; replace every bracket with researched original copy.", "source_ref": "curious_mind/POST-002"}, {"kind": "positive", "text": "Did You Know?\n\n[A body detail with its material qualifier.]\n\n[A different concrete ability.]\n\nFollow for more everyday discoveries.", "note": "Original structural template inspired by the cited pattern; replace every bracket with researched original copy.", "source_ref": "curious_mind/POST-007"}, {"kind": "positive", "text": "Did You Know?\n\n[Mixed verified details with a coherent rhythm.]\n\nFollow for more everyday discoveries.", "note": "Original structural template inspired by the cited pattern; replace every bracket with researched original copy.", "source_ref": "curious_mind/POST-015"}], "format_refs": [], "topic_refs": [], "format_weights": {"comparison": 0, "emotional_animal_collection": 0, "mixed_curiosity": 16, "myth_vs_fact": 0, "single_subject_fast": 39, "themed_curiosity": 43, "themed_utility": 2}, "topic_weights": {"animals": 14, "food_science": 13, "food_storage_home": 0, "general_trivia": 12, "geography": 12, "history_origins": 10, "human_body": 17, "inventions_everyday": 10, "nature_science": 10, "pet_safety": 2, "practical_utility": 0}, "density_preferences": {"fast_trivia": {"fact_count_min": 6, "fact_count_max": 10, "words_per_fact_min": 8, "words_per_fact_max": 11, "total_words_min": 70, "total_words_max": 95}, "practical_utility": {"fact_count_min": 5, "fact_count_max": 6, "words_per_fact_min": 10, "words_per_fact_max": 16, "total_words_min": 65, "total_words_max": 115}}, "fact_count": {"min": 6, "preferred": 8, "max": 10}, "hook_templates": ["Did You Know?", "DID YOU KNOW?", "Did you know?"], "hook_casing": "as_written", "voice": "Compact declarative American English; familiar subjects with weird concrete everyday details.", "units_preference": "contextual", "cta_guidance": {"guidance": "Follow is common; a topical teaser, comment keyword, save or double-tap may also fit. Never impose one formula or a primary goal.", "examples": ["Follow for more everyday discoveries.", "Want another unexpected detail? Follow for the next one."]}, "emoji_policy": "forbidden", "default_limits": {"hook_max_chars": 60, "fact_max_chars": 150, "facts_total_max_chars": 750, "cta_max_chars": 140, "canva_total_max_chars": 900, "hook_max_words": 18, "fact_max_words": 30, "cta_max_words": 32, "canva_total_max_words": 160}, "selection_guidance": ["Select varied, supported details with material qualifiers; no surprise quota or padding.", "Reference popularity is not fact verification or a promise of views."], "ordering_guidance": ["Open with a distinct contribution, vary the middle, and finish memorably without a universal escalation formula."]}, "dyk": {"definition_schema_version": 1, "display_name": "Dyk", "description": "Distinct reference-inspired editorial profile; original research and copy remain mandatory.", "provenance": {"basis": "CR-062 task1 account-specific adjudication and largest-remainder weights; pattern evidence only.", "references": ["dyk/POST-057", "dyk/POST-060", "dyk/POST-087", "dyk/POST-146"]}, "notes": ["103 account+ID records; three engagement nulls; rounded likes and reference claims are not causal or verified evidence.", "Examples below are structural templates with placeholders, not researched production facts.", "Count, words, surprise mix and ordering are preferences; explicit Page limits govern."], "examples": [{"kind": "positive", "text": "DID YOU KNOW\n\n[A concrete animal ability with a qualifier.]\n\n[A different observed behavior.]\n\nWhich detail stood out? Like the video if you enjoyed it.", "note": "Original structural template inspired by the cited pattern; replace every bracket with researched original copy.", "source_ref": "dyk/POST-057"}, {"kind": "positive", "text": "DID YOU KNOW\n\n[A paired contrast on an equivalent measure.]\n\n[A distinct verified consequence.]\n\nWhich detail stood out? Like the video if you enjoyed it.", "note": "Original structural template inspired by the cited pattern; replace every bracket with researched original copy.", "source_ref": "dyk/POST-060"}, {"kind": "positive", "text": "DID YOU KNOW\n\n[A themed ecological consequence, without invented causation.]\n\nWhich detail stood out? Like the video if you enjoyed it.", "note": "Original structural template inspired by the cited pattern; replace every bracket with researched original copy.", "source_ref": "dyk/POST-087"}], "format_refs": [], "topic_refs": [], "format_weights": {"comparison": 1, "emotional_animal_collection": 8, "mixed_curiosity": 9, "myth_vs_fact": 1, "single_subject_fast": 38, "themed_curiosity": 36, "themed_utility": 7}, "topic_weights": {"animals": 22, "food_science": 15, "food_storage_home": 0, "general_trivia": 4, "geography": 6, "history_origins": 10, "human_body": 12, "inventions_everyday": 10, "nature_science": 14, "pet_safety": 1, "practical_utility": 6}, "density_preferences": {"fast_trivia": {"fact_count_min": 5, "fact_count_max": 11, "words_per_fact_min": 8, "words_per_fact_max": 12, "total_words_min": 75, "total_words_max": 100}, "practical_utility": {"fact_count_min": 5, "fact_count_max": 6, "words_per_fact_min": 10, "words_per_fact_max": 16, "total_words_min": 65, "total_words_max": 115}}, "fact_count": {"min": 5, "preferred": 8, "max": 11}, "hook_templates": ["DID YOU KNOW", "DID YOU KNOW!"], "hook_casing": "uppercase", "voice": "Brief conversational American English; concrete abilities, emotion, consequences and useful details, without invented animal motives.", "units_preference": "contextual", "cta_guidance": {"guidance": "Questions and one or several invitations may fit; react/follow/comment/tag/share/save are descriptive examples, never an allowlist. Multiline CTA and placement between facts are supported.", "examples": ["Which detail stood out? Like the video if you enjoyed it.", "Like the video and tag a curious friend!", "Like the video, save it for later, and follow for more."]}, "emoji_policy": "optional", "default_limits": {"hook_max_chars": 60, "fact_max_chars": 150, "facts_total_max_chars": 750, "cta_max_chars": 140, "canva_total_max_chars": 900, "hook_max_words": 18, "fact_max_words": 30, "cta_max_words": 32, "canva_total_max_words": 160}, "selection_guidance": ["Select varied, supported details with material qualifiers; no surprise quota or padding.", "Reference popularity is not fact verification or a promise of views."], "ordering_guidance": ["Open with a distinct contribution, vary the middle, and finish memorably without a universal escalation formula."]}, "daily_facts": {"definition_schema_version": 1, "display_name": "Daily Facts", "description": "Distinct reference-inspired editorial profile; original research and copy remain mandatory.", "provenance": {"basis": "CR-062 task1 account-specific adjudication and largest-remainder weights; pattern evidence only.", "references": ["daily_facts/POST-158", "daily_facts/POST-163", "daily_facts/POST-164"]}, "notes": ["18 account+ID records; longer lines are a preference, not a universal word/count quota. No US-only topic requirement.", "Examples below are structural templates with placeholders, not researched production facts.", "Count, words, surprise mix and ordering are preferences; explicit Page limits govern."], "examples": [{"kind": "positive", "text": "Did you know?\n\n[A place detail with a short explanation of its scale.]\n\n[A distinct concrete geographic feature.]\n\nLike the facts? Like the video and follow for more!", "note": "Original structural template inspired by the cited pattern; replace every bracket with researched original copy.", "source_ref": "daily_facts/POST-158"}, {"kind": "positive", "text": "Did you know?\n\n[A researched storage action, its condition and useful outcome.]\n\n[A different food with its necessary qualifier.]\n\nLike the facts? Like the video and follow for more!", "note": "Original structural template inspired by the cited pattern; replace every bracket with researched original copy.", "source_ref": "daily_facts/POST-163"}, {"kind": "positive", "text": "Did you know?\n\n[Mixed everyday details in clear explanatory sentences.]\n\nLike the facts? Like the video and follow for more!", "note": "Original structural template inspired by the cited pattern; replace every bracket with researched original copy.", "source_ref": "daily_facts/POST-164"}], "format_refs": [], "topic_refs": [], "format_weights": {"comparison": 0, "emotional_animal_collection": 0, "mixed_curiosity": 22, "myth_vs_fact": 0, "single_subject_fast": 0, "themed_curiosity": 33, "themed_utility": 45}, "topic_weights": {"animals": 0, "food_science": 0, "food_storage_home": 28, "general_trivia": 22, "geography": 33, "history_origins": 0, "human_body": 0, "inventions_everyday": 0, "nature_science": 0, "pet_safety": 0, "practical_utility": 17}, "density_preferences": {"fast_trivia": {"fact_count_min": 5, "fact_count_max": 7, "words_per_fact_min": 12, "words_per_fact_max": 16, "total_words_min": 85, "total_words_max": 115}, "practical_utility": {"fact_count_min": 5, "fact_count_max": 6, "words_per_fact_min": 10, "words_per_fact_max": 16, "total_words_min": 65, "total_words_max": 115}}, "fact_count": {"min": 5, "preferred": 6, "max": 7}, "hook_templates": ["Did you know?"], "hook_casing": "sentence_case", "voice": "Concrete, orderly American English with slightly more explanatory sentences; places, storage and mixed everyday knowledge.", "units_preference": "contextual", "cta_guidance": {"guidance": "The repeated reference pattern combines like and follow without hierarchy. Original variations are allowed; no primary goal or mandatory combination.", "examples": ["Like the facts? Like the video and follow for more!"]}, "emoji_policy": "forbidden", "default_limits": {"hook_max_chars": 60, "fact_max_chars": 150, "facts_total_max_chars": 750, "cta_max_chars": 140, "canva_total_max_chars": 900, "hook_max_words": 18, "fact_max_words": 30, "cta_max_words": 32, "canva_total_max_words": 160}, "selection_guidance": ["Select varied, supported details with material qualifiers; no surprise quota or padding.", "Reference popularity is not fact verification or a promise of views."], "ordering_guidance": ["Open with a distinct contribution, vary the middle, and finish memorably without a universal escalation formula."]}}'::jsonb;
  item record; kind_name text; key_name text; refs jsonb; d public.trivia_editorial_definitions; payload jsonb; inserted integer:=0;
begin
  perform internal.editorial_seed_v1(p_workspace);
  for item in select * from jsonb_each(templates) loop
    if exists(select 1 from public.trivia_editorial_definitions where workspace_id=p_workspace and kind='profile' and key=item.key) then continue; end if;
    payload:=item.value;
    foreach kind_name in array array['format','topic'] loop
      refs:='[]';
      for key_name in select jsonb_object_keys(payload->(kind_name||'_weights')) order by 1 loop
        select * into d from public.trivia_editorial_definitions where workspace_id=p_workspace and kind=kind_name and key=key_name and version=1 and retired_at is null;
        if d.id is null then raise exception using errcode='P0001',message='EDITORIAL_DEFINITION_UNAVAILABLE'; end if;
        refs:=refs||jsonb_build_array(jsonb_build_object('public_id',d.public_id,'version',d.version,'hash',d.hash));
      end loop;
      payload:=payload||jsonb_build_object(kind_name||'_refs',refs);
    end loop;
    if (select count(distinct key) from public.trivia_editorial_definitions where workspace_id=p_workspace and kind='profile')>=128 then raise exception using errcode='P0001',message='VALIDATION_FAILED'; end if;
    insert into public.trivia_editorial_definitions(workspace_id,kind,key,version,payload,hash) values(p_workspace,'profile',item.key,1,payload,internal.editorial_hash_v1('profile',item.key,payload));
    inserted:=inserted+1;
  end loop;
  if inserted>0 then update internal.trivia_editorial_catalog_state set revision=revision+inserted where workspace_id=p_workspace; end if;
  return inserted;
end; $$;
create function internal.editorial_generation_v2(p_workspace bigint,p_page uuid,p_limit integer,
  p_topic text,p_format text,p_goal text) returns jsonb
language plpgsql volatile security invoker set search_path='' as $$
declare page public.pages; cfg public.page_niche_configs; resolved jsonb; profile public.trivia_editorial_definitions;
  recent jsonb; signals jsonb; enabled jsonb; eligible bigint; result jsonb;
begin
  perform 1 from public.workspaces where id=p_workspace for share;
  select * into page from public.pages where workspace_id=p_workspace and public_id=p_page;
  select * into cfg from public.page_niche_configs where workspace_id=p_workspace and page_id=page.id and niche_key='trivia';
  if page.id is null or not page.is_active then raise exception using errcode='P0001',message='PAGE_NOT_FOUND'; end if;
  if cfg.id is null or not cfg.is_enabled or cfg.config_schema_version<>2 then raise exception using errcode='P0001',message='MODULE_DISABLED'; end if;
  resolved:=internal.editorial_resolve_v2(p_workspace,cfg.config,cfg.editorial_bindings,p_format);
  if p_topic is not null and not(resolved#>'{rules,allowed_topics}' ? p_topic) then raise exception using errcode='P0001',message='TOPIC_UNSUPPORTED'; end if;
  profile:=internal.editorial_reference_v1(p_workspace,cfg.config->'editorial_profile_ref','profile',
    internal.editorial_bound_time_v2(cfg.editorial_bindings,'profile',cfg.config->'editorial_profile_ref'));
  select coalesce(jsonb_agg(jsonb_build_object('niche_key',niche_key,'is_enabled',is_enabled,'is_default',is_default,
    'config_schema_version',config_schema_version,'updated_at',internal.iso_timestamp_v1(updated_at)) order by niche_key),'[]') into enabled
    from public.page_niche_configs where workspace_id=p_workspace and page_id=page.id;
  select coalesce(jsonb_agg(jsonb_build_object('post_public_id',x.public_id,'status',x.status,'topic_key',x.topic_key,
    'format_key',x.format_key,'interaction_goal',x.interaction_goal,'hook',left(x.content_payload->>'hook',120),
    'cta',left(x.content_payload->>'cta',180),'scheduled_at',internal.iso_timestamp_v1(x.scheduled_at),
    'updated_at',internal.iso_timestamp_v1(x.updated_at)) order by x.updated_at desc,x.id desc),'[]') into recent
    from (select * from public.posts where workspace_id=p_workspace and page_id=page.id and niche_key='trivia' and status<>'discarded'
      and (p_topic is null or topic_key=p_topic) and (p_format is null or format_key=p_format)
      and (p_goal is null or interaction_goal=p_goal) order by updated_at desc,id desc limit p_limit) x;
  select coalesce(jsonb_agg(jsonb_build_object('format_key',format_key,'sample_size',sample_size,
    'observed_from',internal.iso_timestamp_v1(observed_from),'observed_to',internal.iso_timestamp_v1(observed_to),
    'median_views',median_views,'caveats',jsonb_build_array('Descriptive latest-snapshot signal only; not a causal conclusion.','Cumulative observations are not summed.')) order by sample_size desc,format_key),'[]') into signals
    from (with latest as (select distinct on (m.post_id) p.format_key,m.captured_at,m.views
      from public.post_metrics m join public.posts p on p.id=m.post_id and p.workspace_id=m.workspace_id and p.page_id=m.page_id
      where m.workspace_id=p_workspace and m.page_id=page.id and p.status in ('posted','archived')
      order by m.post_id,m.captured_at desc,m.id desc)
      select format_key,count(*) filter(where views is not null)::integer sample_size,min(captured_at) observed_from,
        max(captured_at) observed_to,percentile_cont(0.5) within group(order by views) filter(where views is not null) median_views
      from latest group by format_key having count(*) filter(where views is not null)>0) x;
  select count(*) into eligible from public.trivia_facts f where f.workspace_id=p_workspace and f.verification_status='verified'
    and f.expires_at>clock_timestamp() and f.reservation_status='available' and not exists(select 1 from public.trivia_post_facts u
      where u.workspace_id=f.workspace_id and u.fact_id=f.id and u.allocation_state in ('allocated','published')
        and (cfg.config->>'fact_reuse_scope'='workspace_unique' or u.page_id=page.id));
  result:=jsonb_build_object('response_schema_version',1,'data',jsonb_build_object(
    'page',jsonb_build_object('page_public_id',page.public_id,'name',page.name,'slug',page.slug,'timezone',page.timezone,
      'target_markets',to_jsonb(page.target_markets),'is_active',page.is_active,'enabled_niches',enabled,
      'created_at',internal.iso_timestamp_v1(page.created_at),'updated_at',internal.iso_timestamp_v1(page.updated_at)),
    'module',jsonb_build_object('niche_key','trivia','display_name','Trivia Facts','module_version',1,'status','active',
      'config_schema_version',2,'config_schema_versions',jsonb_build_array(1,2),'content_schema_versions',jsonb_build_array(2),
      'capabilities',jsonb_build_array('project_generation_context','validate_content_payload','render_content','find_similar_items',
        'reverify_sources','correct_items','project_performance_dimensions','editorial_catalog')),
    'config_public_id',cfg.public_id,'config',cfg.config,'generation_rules',resolved->'rules',
    'editorial_context',jsonb_build_object('editorial_profile_ref',cfg.config->'editorial_profile_ref','effective_rules_hash',resolved->'rules_hash',
      'profile',internal.editorial_project_v1(profile,true),'format_references',cfg.config->'allowed_format_refs',
      'topic_references',cfg.config->'allowed_topic_refs','definitions_complete',false,'examples_complete',false,
      'read_guidance','Read relevant exact format/topic definitions and examples through the bounded editorial catalog before composition.'),
    'reuse_policy',jsonb_build_object('scope',cfg.config->>'fact_reuse_scope','reservation_ttl_minutes',30,'requires_verified_facts',true,'eligible_fact_count',eligible),
    'recent_variety',recent,'performance_signals',signals,'context_version',jsonb_build_object('page_updated_at',internal.iso_timestamp_v1(page.updated_at),
      'config_updated_at',internal.iso_timestamp_v1(cfg.updated_at))));
  if octet_length(result::text)>262144 then raise exception using errcode='P0001',message='CONFIG_INVALID'; end if;
  return result;
end; $$;

-- Patch migration-only dengan anchor yang diwajibkan cocok tepat sekali.
-- Tidak memperkenalkan executor SQL dari payload user.
do $migration$
declare signature regprocedure; name_value text; source text; old text; replacement text;
begin
  foreach signature in array array[
    'api.create_page(integer,uuid,uuid,text,text,text,text[],text,integer,jsonb,boolean)'::regprocedure,
    'api.update_page(integer,uuid,uuid,uuid,timestamptz,jsonb,jsonb)'::regprocedure
  ] loop
    source:=pg_get_functiondef(signature); select proname into name_value from pg_proc where oid=signature;
    -- Semua Page Write mengambil lock workspace sebelum lock Page/config, seperti katalog/save.
    old:=E'  if v_claim.claim_state = ''first_use'' then\n';
    if (length(source)-length(replace(source,old,'')))/length(old)<>2 then raise exception 'EDITORIAL_PAGE_LOCK_ANCHOR_DRIFT'; end if;
    -- Hanya occurrence pertama menjalankan mutasi, occurrence kedua menutup ledger.
    source:=overlay(source placing old||E'    perform internal.trivia_lock_workspace_v1(v_claim.workspace_id);\n' from strpos(source,old) for length(old));
    if name_value='create_page' then
      old:='if p_config_schema_version is distinct from 1 then'; replacement:='if p_config_schema_version is null or p_config_schema_version not in (1,2) then';
      if strpos(source,old)=0 then raise exception 'EDITORIAL_CREATE_VERSION_DRIFT'; end if; source:=replace(source,old,replacement);
      old:='if p_config is null or not internal.is_valid_trivia_config_v1(p_config) then';
      replacement:='if p_config is null or not ((p_config_schema_version=1 and internal.is_valid_trivia_config_v1(p_config)) or (p_config_schema_version=2 and internal.editorial_config_input_v2(p_config))) then';
      if strpos(source,old)=0 then raise exception 'EDITORIAL_CREATE_SHAPE_DRIFT'; end if; source:=replace(source,old,replacement);
      old:='if v_niche.config_schema_version <> p_config_schema_version then';
      if strpos(source,old)=0 then raise exception 'EDITORIAL_CREATE_REGISTRY_DRIFT'; end if;
      source:=replace(source,old,'if v_niche.config_schema_version <> 1 then');
    else
      old:='internal.is_json_integer_between(p_niche_config_patch -> ''config_schema_version'', 1, 1)';
      if strpos(source,old)=0 then raise exception 'EDITORIAL_UPDATE_VERSION_DRIFT'; end if;
      source:=replace(source,old,'internal.is_json_integer_between(p_niche_config_patch -> ''config_schema_version'', 1, 2)');
      old:='if not internal.is_valid_trivia_config_v1(p_niche_config_patch -> ''config'') then';
      replacement:=$patch$if not (((p_niche_config_patch->>'config_schema_version')::integer=1 and internal.is_valid_trivia_config_v1(p_niche_config_patch->'config'))
        or ((p_niche_config_patch->>'config_schema_version')::integer=2 and internal.editorial_config_input_v2(p_niche_config_patch->'config')
          and (p_niche_config_patch->>'expected_config_updated_at') ~ '^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{6}(Z|[+-]\d{2}:\d{2})$')) then$patch$;
      if strpos(source,old)=0 then raise exception 'EDITORIAL_UPDATE_SHAPE_DRIFT'; end if; source:=replace(source,old,replacement);
      old:=E'      ''config_schema_version'', 1,\n';
      if strpos(source,old)=0 then raise exception 'EDITORIAL_UPDATE_CANONICAL_DRIFT'; end if;
      source:=replace(source,old,E'      ''config_schema_version'', (p_niche_config_patch->>''config_schema_version'')::integer,\n');
      old:='set config_schema_version = 1,';
      if strpos(source,old)=0 then raise exception 'EDITORIAL_UPDATE_STORAGE_DRIFT'; end if;
      source:=replace(source,old,'set config_schema_version = (p_niche_config_patch->>''config_schema_version'')::integer,');
      old:='if v_config_will_change and exists (';
      if strpos(source,old)=0 then raise exception 'EDITORIAL_UPDATE_ACTIVE_POST_DRIFT'; end if;
      source:=replace(source,old,'if v_config_will_change and (p_niche_config_patch->>''config_schema_version'')::integer=1 and exists (');
    end if;
    old:=E'  if v_claim.claim_state = ''first_use'' then\n    v_snapshot :=';
    if strpos(source,old)=0 then raise exception 'EDITORIAL_RESPONSE_ANCHOR_DRIFT'; end if;
    replacement:=$patch$  if v_config.config_schema_version=2 and v_result#>'{data,config}' is not null then
    v_result:=jsonb_set(v_result,'{data,config}',(v_result#>'{data,config}')||jsonb_build_object(
      'effective_rules',v_config.editorial_rules,'effective_rules_hash',v_config.editorial_rules_hash));
  end if;
  if v_claim.claim_state = 'first_use' then
    v_snapshot :=$patch$;
    source:=replace(source,old,replacement);
    source:=replace(source,'''CONFIG_SCHEMA_UNSUPPORTED'',', '''EDITORIAL_DEFINITION_UNAVAILABLE'', ''FORMAT_UNSUPPORTED'', ''CONFIG_SCHEMA_UNSUPPORTED'',');
    execute source;
  end loop;
  signature:='api.get_page_generation_context(integer,uuid,uuid,text,integer,text,text,text,timestamptz)'::regprocedure;
  source:=pg_get_functiondef(signature);
  old:='  if v_page.config_schema_version <> v_niche.config_schema_version';
  if strpos(source,old)=0 then raise exception 'EDITORIAL_CONTEXT_BRANCH_DRIFT'; end if;
  source:=replace(source,old,$patch$  if v_page.config_schema_version=2 then
    return internal.editorial_generation_v2(v_workspace.workspace_id,p_page_public_id,p_recent_post_limit,
      p_intent_topic_key,p_intent_format_key,p_intent_interaction_goal);
  end if;
  if v_page.config_schema_version <> v_niche.config_schema_version$patch$);
  source:=replace(source,'''config_schema_version'', v_niche.config_schema_version,',
    '''config_schema_version'', v_niche.config_schema_version, ''config_schema_versions'', jsonb_build_array(1,2),');
  source:=replace(source,'''content_schema_versions'', jsonb_build_array(v_niche.content_schema_version)',
    '''content_schema_versions'', jsonb_build_array(2)');
  execute source;
  signature:='api.get_workspace_context(integer,uuid)'::regprocedure; source:=pg_get_functiondef(signature);
  old:='''config_schema_versions'', jsonb_build_array(niche.config_schema_version)';
  if strpos(source,old)=0 then raise exception 'EDITORIAL_MODULE_VERSIONS_DRIFT'; end if;
  source:=replace(source,old,'''config_schema_versions'', case when niche.key=''trivia'' then jsonb_build_array(1,2) else jsonb_build_array(niche.config_schema_version) end');
  source:=replace(source,'''content_schema_versions'', jsonb_build_array(niche.content_schema_version)',
    '''content_schema_versions'', case when niche.key=''trivia'' then jsonb_build_array(2) else jsonb_build_array(niche.content_schema_version) end');
  execute source;
end;
$migration$;

grant create on schema internal to content_producer_api_owner;
do $$
declare f record;
begin
  for f in select p.oid::regprocedure signature from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='internal' and p.proname like 'editorial_%_v2' loop
    execute format('alter function %s owner to content_producer_api_owner',f.signature);
    execute format('revoke all on function %s from public,anon,authenticated,service_role',f.signature);
    execute format('grant execute on function %s to content_producer_api_owner',f.signature);
  end loop;
end; $$;
revoke create on schema internal from content_producer_api_owner;
-- CREATE OR REPLACE mempertahankan owner/ACL API dan trigger yang telah diaudit.
