-- CR-062 task5: config2 post transactions and immutable editorial snapshot3.
-- No owner-data rewrite. Legacy renderer/hash/ledger payloads remain unchanged.
create function internal.post_engine_rules_config2_v2(p_style text) returns jsonb
language sql immutable security invoker set search_path='' as $$
  select jsonb_build_object('config_schema_version',2,
    'fact_count',jsonb_build_object('mode','adaptive','min',1,'preferred',8,'max',12),
    'text_budget','{"hook_max_chars":120,"fact_max_chars":160,"facts_total_max_chars":900,"cta_max_chars":180,"canva_total_max_chars":1100,"hook_max_words":18,"fact_max_words":30,"cta_max_words":32,"canva_total_max_words":160}'::jsonb,
    'render_style',p_style,'caption',jsonb_build_object('max_chars',500),
    'hashtags',jsonb_build_object('min_count',0,'default_count',3,'max_count',5),
    'hard_limits',jsonb_build_object('emoji_policy','optional'));
$$;

create function internal.post_editorial_context_shape_config2_v2(x jsonb) returns boolean
language plpgsql immutable security invoker set search_path='' as $$
begin
  return coalesce(octet_length(x::text)<=8192
    and internal.has_exact_json_keys(x-'cta_actions',array['editorial_profile_ref','format_ref','topic_ref','architecture','profile_key','effective_rules_hash']) is true
    and internal.editorial_reference_shape_v1(x->'editorial_profile_ref') is true
    and internal.editorial_reference_shape_v1(x->'format_ref') is true
    and internal.editorial_reference_shape_v1(x->'topic_ref') is true
    and jsonb_typeof(x->'architecture')='string' and x->>'architecture' in ('single_subject','themed','mixed')
    and (x->'profile_key'='null'::jsonb or (jsonb_typeof(x->'profile_key')='string' and x->>'profile_key' ~ '^[a-z][a-z0-9_]{1,49}$'))
    and jsonb_typeof(x->'effective_rules_hash')='string' and x->>'effective_rules_hash' ~ '^[0-9a-f]{64}$',false);
exception when others then return false;
end; $$;

create function internal.post_prepare_config2_v2(c public.page_niche_configs,page public.pages,
  p_content jsonb,p_format text,p_topic text,p_goal text,p_context jsonb) returns jsonb
language plpgsql volatile security invoker set search_path='' as $$
declare resolved jsonb; rules jsonb; r jsonb; ctx jsonb; snap jsonb;
  f public.trivia_editorial_definitions; t public.trivia_editorial_definitions;
  p public.trivia_editorial_definitions; defs jsonb;
begin
  if c.config_schema_version<>2 or c.workspace_id<>page.workspace_id or c.page_id<>page.id
    or internal.post_editorial_context_shape_config2_v2(p_context) is distinct from true then
    raise exception using errcode='P0001',message='VALIDATION_FAILED'; end if;
  resolved:=internal.editorial_resolve_v2(c.workspace_id,c.config,c.editorial_bindings,p_format);
  rules:=resolved->'rules';
  if p_format is null or not(rules->'allowed_formats' ? p_format) then
    raise exception using errcode='P0001',message='FORMAT_UNSUPPORTED'; end if;
  if p_topic is null or not(rules->'allowed_topics' ? p_topic) then
    raise exception using errcode='P0001',message='TOPIC_UNSUPPORTED'; end if;
  if p_context->'editorial_profile_ref' is distinct from c.config->'editorial_profile_ref'
    or p_context->>'effective_rules_hash' is distinct from resolved->>'rules_hash' then
    raise exception using errcode='P0001',message='PAGE_VERSION_CONFLICT'; end if;
  if p_context->'format_ref' is distinct from rules->'format_reference'
    or not(c.config->'allowed_topic_refs' @> jsonb_build_array(p_context->'topic_ref')) then
    raise exception using errcode='P0001',message='EDITORIAL_DEFINITION_UNAVAILABLE'; end if;
  p:=internal.editorial_reference_v1(c.workspace_id,p_context->'editorial_profile_ref','profile',
    internal.editorial_bound_time_v2(c.editorial_bindings,'profile',p_context->'editorial_profile_ref'));
  f:=internal.editorial_reference_v1(c.workspace_id,p_context->'format_ref','format',
    internal.editorial_bound_time_v2(c.editorial_bindings,'format',p_context->'format_ref'));
  t:=internal.editorial_reference_v1(c.workspace_id,p_context->'topic_ref','topic',
    internal.editorial_bound_time_v2(c.editorial_bindings,'topic',p_context->'topic_ref'));
  if f.key is distinct from p_format or t.key is distinct from p_topic
    or not(f.payload->'architectures' ? (p_context->>'architecture')) then
    raise exception using errcode='P0001',message='EDITORIAL_DEFINITION_UNAVAILABLE'; end if;
  if p_context->'profile_key'<>'null'::jsonb
    and not(rules#>'{preferences,density_preferences}' ? (p_context->>'profile_key')) then
    raise exception using errcode='P0001',message='PROFILE_UNSUPPORTED'; end if;
  r:=internal.post_render_config2_v2(p_content,rules,p_goal,p_context->'cta_actions');
  ctx:=p_context||jsonb_build_object('cta_actions',r->'cta_actions');
  -- Effective rules contain profile preferences and selected format guidance;
  -- immutable references recover full examples. Topic scope is retained inline.
  defs:=jsonb_build_object(
    'profile',jsonb_build_object('reference',ctx->'editorial_profile_ref','key',p.key,'definition_schema_version',p.definition_schema_version),
    'format',jsonb_build_object('reference',ctx->'format_ref','key',f.key,'definition_schema_version',f.definition_schema_version),
    'topic',jsonb_build_object('reference',ctx->'topic_ref','key',t.key,'definition_schema_version',t.definition_schema_version,'payload',t.payload-'examples'));
  snap:=jsonb_build_object('schema_version',3,'content_schema_version',2,'config_schema_version',2,
    'config_public_id',c.public_id,'config_updated_at',internal.iso_timestamp_v1(c.updated_at),
    'fact_count',rules->'fact_count','fact_count_applied',jsonb_array_length(r#>'{content_payload,body,facts}'),
    'text_budget',rules->'text_budget','fact_reuse_scope',rules->'fact_reuse_scope',
    'profile_key',ctx->'profile_key','render_style',rules->'render_style','target_markets',to_jsonb(page.target_markets),
    'locale','en-US','line_width_chars',34,'target_video_seconds',13,'estimator_version',1,
    'editorial_context',ctx,'editorial_definitions',defs,'effective_rules',rules,'effective_rules_hash',resolved->'rules_hash',
    'cta',jsonb_build_object('text',r#>'{content_payload,cta}','placement',r#>'{content_payload,cta_placement}','actions',r->'cta_actions'));
  if octet_length(snap::text)>131072 then raise exception using errcode='P0001',message='CONFIG_INVALID'; end if;
  return jsonb_build_object('content',r->'content_payload','snapshot',snap);
end; $$;

create function internal.post_generation_config2_valid_v2(s jsonb) returns boolean
language plpgsql immutable security invoker set search_path='' as $$
declare k text; ctx jsonb:=s->'editorial_context'; rules jsonb:=s->'effective_rules'; d jsonb;
begin
  if octet_length(s::text)>131072
    or internal.has_exact_json_keys(s,array['schema_version','content_schema_version','config_schema_version','config_public_id','config_updated_at',
      'fact_count','fact_count_applied','text_budget','fact_reuse_scope','profile_key','render_style','target_markets','locale',
      'line_width_chars','target_video_seconds','estimator_version','editorial_context','editorial_definitions','effective_rules','effective_rules_hash','cta']) is distinct from true
    or s->'schema_version' is distinct from '3'::jsonb or s->'content_schema_version' is distinct from '2'::jsonb
    or s->'config_schema_version' is distinct from '2'::jsonb
    or internal.plan_is_uuid_v1(s->'config_public_id') is distinct from true
    or internal.trivia_is_valid_rfc3339_v1(s->>'config_updated_at') is distinct from true
    or s->>'config_updated_at' !~ '^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{6}Z$'
    or internal.post_editorial_context_shape_config2_v2(ctx) is distinct from true
    or s->'effective_rules_hash' is distinct from ctx->'effective_rules_hash'
    or rules->'config_schema_version' is distinct from '2'::jsonb
    or rules->'editorial_profile_ref' is distinct from ctx->'editorial_profile_ref'
    or rules->'format_reference' is distinct from ctx->'format_ref'
    or internal.editorial_count_v2(s->'fact_count') is distinct from true
    or internal.is_json_integer_between(s->'fact_count_applied',1,12) is distinct from true
    or s->>'fact_reuse_scope' not in ('workspace_unique','page_unique')
    or s->>'render_style' not in ('plain_lines','numbered') or s->>'locale' is distinct from 'en-US'
    or jsonb_typeof(s->'target_markets') is distinct from 'array' or jsonb_array_length(s->'target_markets')=0
    or s->'line_width_chars' is distinct from '34'::jsonb or s->'target_video_seconds' is distinct from '13'::jsonb
    or s->'estimator_version' is distinct from '1'::jsonb or s->'profile_key' is distinct from ctx->'profile_key'
    or (s->'profile_key'<>'null'::jsonb and not(rules#>'{preferences,density_preferences}' ? (s->>'profile_key')))
    or internal.has_exact_json_keys(s->'editorial_definitions',array['profile','format','topic']) is distinct from true
    or internal.has_exact_json_keys(s->'cta',array['text','placement','actions']) is distinct from true
    or s#>'{cta,actions}' is distinct from ctx->'cta_actions' then return false; end if;
  foreach k in array array['fact_count','text_budget','fact_reuse_scope','render_style','locale'] loop
    if s->k is distinct from rules->k then return false; end if;
  end loop;
  foreach k in array array['profile','format','topic'] loop
    d:=s#>array['editorial_definitions',k];
    if internal.has_exact_json_keys(d-(case when k='topic' then 'payload' else '' end),array['reference','key','definition_schema_version']) is distinct from true
      or d->'reference' is distinct from ctx->(case when k='profile' then 'editorial_profile_ref' else k||'_ref' end)
      or d->'definition_schema_version' is distinct from '1'::jsonb
      or d->>'key' !~ '^[a-z][a-z0-9_]{1,49}$' then return false; end if;
  end loop;
  return true;
exception when others then return false;
end; $$;

create function internal.post_bundle_config2_valid_v2(content jsonb,s jsonb,format_key text,topic_key text,goal text)
returns boolean language plpgsql immutable security invoker set search_path='' as $$
declare r jsonb;
begin
  if internal.post_generation_config2_valid_v2(s) is distinct from true
    or s#>>'{editorial_definitions,format,key}' is distinct from format_key
    or s#>>'{editorial_definitions,topic,key}' is distinct from topic_key then return false; end if;
  r:=internal.post_render_config2_v2(content,s->'effective_rules',goal,s#>'{editorial_context,cta_actions}');
  return content is not distinct from r->'content_payload'
    and s#>'{cta,text}' is not distinct from content->'cta'
    and s#>'{cta,placement}' is not distinct from content->'cta_placement'
    and s->'fact_count_applied' is not distinct from to_jsonb(jsonb_array_length(content#>'{body,facts}'));
exception when others then return false;
end; $$;

alter table public.posts alter column interaction_goal drop not null;
alter table public.posts add constraint posts_nullable_goal_config2_check check (
  interaction_goal is not null or (content_schema_version=2 and generation_snapshot->'schema_version'='3'::jsonb
    and generation_snapshot->'config_schema_version'='2'::jsonb) is true);
-- Source snapshot2 still represents a URL-backed fact, independently of Page config.
alter table public.trivia_post_facts drop constraint trivia_post_facts_rendered_text_check;
alter table public.trivia_post_facts add constraint trivia_post_facts_rendered_text_check check (
  rendered_text=btrim(rendered_text) and char_length(rendered_text) between 1 and 160
  and internal.post_words_v1(rendered_text)<=30
  and (snapshot_schema_version=2 or (char_length(rendered_text)<=90
    and cardinality(regexp_split_to_array(rendered_text,'[[:space:]]+'))<=18)));
alter table public.trivia_post_facts add constraint trivia_post_facts_position_ceiling_check
  check (position between 1 and case when snapshot_schema_version=2 then 12 else 9 end);

CREATE OR REPLACE FUNCTION internal.validate_post_row()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'pg_catalog', 'internal', 'public'
AS $function$
declare v_config jsonb;
begin
  if new.content_schema_version=2 then
    if (case when new.generation_snapshot->'schema_version'='3'::jsonb then
      internal.post_bundle_config2_valid_v2(new.content_payload,new.generation_snapshot,new.format_key,new.topic_key,new.interaction_goal)
      else internal.post_content_valid_v2(new.content_payload) end) is distinct from true
      or internal.post_generation_valid_v2(new.generation_snapshot) is distinct from true
      or (new.system_checks<>'{}'::jsonb and not (
        internal.post_evidence_valid_v2(new.system_checks,new.content_hash,case when new.status='archived' then new.revision-1 else new.revision end,false)
          is true
        or ((new.quality_status='failed' and new.status='draft' or new.status='discarded' and new.quality_status='pending' and new.published_at is null)
          and new.editorial_checks='{}'::jsonb
          and new.system_checks->>'overall_status'='failed'
          and internal.is_valid_system_checks_v1(new.system_checks,new.content_hash,new.revision)
            is true)))
      or (new.editorial_checks<>'{}'::jsonb and
        internal.post_evidence_valid_v2(new.editorial_checks,new.content_hash,case when new.status='archived' then new.revision-1 else new.revision end,true)
          is distinct from true)
      or (new.status not in ('draft','discarded') and
        (new.system_checks='{}'::jsonb or new.editorial_checks='{}'::jsonb)) then
      raise exception using errcode='23514',message='POST_SNAPSHOT_INVALID';
    end if;
  else
    if not internal.is_valid_post_payload_v1(new.content_payload,new.content_schema_version)
      or not internal.is_valid_generation_snapshot_v1(new.generation_snapshot) then
      raise exception using errcode='23514',message='POST_SNAPSHOT_INVALID';
    end if;
    if new.system_checks='{}'::jsonb then
      if new.status not in ('draft','discarded') then
        raise exception using errcode='23514',message='SYSTEM_EVIDENCE_REQUIRED'; end if;
    -- Preserve the archived-post revision binding from the existing Phase 5.7 guard.
    elsif not internal.is_valid_system_checks_v1(new.system_checks,new.content_hash,
      case when new.status='archived' and new.generation_snapshot ? 'schema_version'
        then new.revision-1 else new.revision end) then
      raise exception using errcode='23514',message='SYSTEM_EVIDENCE_INVALID';
    end if;
    if new.editorial_checks='{}'::jsonb then
      if new.status not in ('draft','discarded') then
        raise exception using errcode='23514',message='EDITORIAL_EVIDENCE_REQUIRED'; end if;
    elsif not internal.is_valid_editorial_checks_v1(new.editorial_checks,new.content_hash,
      case when new.status='archived' and new.generation_snapshot ? 'schema_version'
        then new.revision-1 else new.revision end) then
      raise exception using errcode='23514',message='EDITORIAL_EVIDENCE_INVALID';
    end if;
  end if;
  if new.generation_snapshot->'schema_version'='3'::jsonb then return new; end if;
  if new.interaction_goal is null then raise exception using errcode='23514',message='POST_CONFIG_SCOPE_INVALID'; end if;
  select config into v_config from public.page_niche_configs where
    workspace_id=new.workspace_id and page_id=new.page_id and niche_key=new.niche_key;
  if not (v_config->'allowed_formats' ? new.format_key)
    or not (v_config->'allowed_topics' ? new.topic_key)
    or not (v_config->'allowed_interaction_goals' ? new.interaction_goal) then
    raise exception using errcode='23514',message='POST_CONFIG_SCOPE_INVALID';
  end if;
  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION internal.post_generation_valid_v2(s jsonb)
 RETURNS boolean
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO ''
AS $function$
  select case when s->'schema_version'='3'::jsonb then internal.post_generation_config2_valid_v2(s) else internal.has_exact_json_keys(s,array['schema_version',
    'content_schema_version','config_schema_version','config_public_id',
    'config_updated_at','fact_count','fact_count_applied','text_budget',
    'fact_reuse_scope','profile_key','render_style','target_markets','locale',
    'line_width_chars','target_video_seconds']) is true
    and s->'schema_version'='2'::jsonb
    and s->'content_schema_version'='2'::jsonb
    and s->'config_schema_version'='1'::jsonb
    and internal.plan_is_uuid_v1(s->'config_public_id') is true
    and s->>'config_updated_at' ~
      '^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{6}Z$'
    and pg_catalog.jsonb_typeof(s->'fact_count')='object'
    and internal.is_json_integer_between(s->'fact_count_applied',1,9) is true
    and pg_catalog.jsonb_typeof(s->'text_budget')='object'
    and s->>'fact_reuse_scope' in ('workspace_unique','page_unique')
    and s->>'profile_key' in ('fast_trivia','practical_utility')
    and s->>'render_style' in ('plain_lines','numbered')
    and s->>'locale'='en-US'
    and pg_catalog.jsonb_typeof(s->'target_markets')='array'
    and s->'line_width_chars'='34'::jsonb
    and s->'target_video_seconds'='13'::jsonb end;
$function$
;

drop function api.save_post_v2(p_request_schema_version integer, p_workspace_public_id uuid, p_operation_key uuid, p_page_public_id uuid, p_niche_key text, p_config_public_id uuid, p_expected_config_updated_at text, p_expected_catalog_version text, p_content_schema_version integer, p_format_key text, p_topic_key text, p_interaction_goal text, p_scheduled_at timestamp with time zone, p_plan_item jsonb, p_facts jsonb, p_content_payload jsonb, p_editorial_checks jsonb);
CREATE OR REPLACE FUNCTION api.save_post_v2(p_request_schema_version integer, p_workspace_public_id uuid, p_operation_key uuid, p_page_public_id uuid, p_niche_key text, p_config_public_id uuid, p_expected_config_updated_at text, p_expected_catalog_version text, p_content_schema_version integer, p_format_key text, p_topic_key text, p_interaction_goal text DEFAULT NULL, p_scheduled_at timestamp with time zone DEFAULT NULL, p_plan_item jsonb DEFAULT NULL, p_facts jsonb DEFAULT NULL, p_content_payload jsonb DEFAULT NULL, p_editorial_checks jsonb DEFAULT NULL, p_editorial_context jsonb DEFAULT NULL)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare prepared jsonb; o record; c public.page_niche_configs; page public.pages;
  plan public.content_plans; item public.content_plan_items; post public.posts;
  fact public.trivia_facts; entry jsonb; content jsonb; snapshot jsonb;
  result jsonb; summary jsonb:='null'::jsonb; budget jsonb; metrics jsonb;
  resolved bigint[]:='{}'; selected bigint; seen_keys text[]:='{}';
  seen_normal text[]:='{}'; count_facts integer; i integer:=0;
  catalog bigint; editorial jsonb; systems jsonb;
  v_state text; v_message text;
begin
  perform internal.assert_request_context_v1();
  if p_request_schema_version is distinct from 2
    or p_content_schema_version is distinct from 2
    or p_niche_key is distinct from 'trivia'
    or p_workspace_public_id is null or p_page_public_id is null
    or p_config_public_id is null or p_operation_key is null
    or internal.trivia_is_valid_uuid_v4_v1(p_operation_key::text) is distinct from true
    or p_expected_config_updated_at is null
    or p_expected_config_updated_at !~
      '^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{6}(Z|[+-]\d{2}:\d{2})$'
    or internal.trivia_is_valid_rfc3339_v1(p_expected_config_updated_at)
      is distinct from true
    or p_expected_catalog_version !~ '^(0|[1-9][0-9]*)$'
    or pg_catalog.char_length(p_expected_catalog_version)>19
    or (p_scheduled_at is not null and not pg_catalog.isfinite(p_scheduled_at))
    or pg_catalog.jsonb_typeof(p_facts) is distinct from 'array'
    or pg_catalog.jsonb_array_length(p_facts) not between 1 and 12
    or internal.has_exact_json_keys(p_editorial_checks,array[
      'meaning_preserved','caption_no_new_claim','no_known_substantive_issue'])
      is distinct from true then
    raise exception using errcode='P0001',message='VALIDATION_FAILED';
  end if;
  if p_editorial_checks->>'meaning_preserved'<>'pass'
    or p_editorial_checks->>'caption_no_new_claim'<>'pass'
    or p_editorial_checks->>'no_known_substantive_issue'<>'pass' then
    raise exception using errcode='P0001',message='EDITORIAL_REVIEW_REQUIRED';
  end if;
  if p_plan_item is not null and p_plan_item<>'null'::jsonb and (
    internal.has_exact_json_keys(p_plan_item,array['plan_item_public_id','claim_token'])
      is distinct from true
    or internal.plan_is_uuid_v1(p_plan_item->'plan_item_public_id') is distinct from true
    or internal.plan_is_uuid_v1(p_plan_item->'claim_token') is distinct from true) then
    raise exception using errcode='P0001',message='VALIDATION_FAILED'; end if;
  count_facts:=pg_catalog.jsonb_array_length(p_facts);
  if p_editorial_context is null or p_editorial_context='null'::jsonb then
    content:=internal.post_render_v2(p_content_payload);
  else
    if internal.post_editorial_context_shape_config2_v2(p_editorial_context) is distinct from true then
      raise exception using errcode='P0001',message='VALIDATION_FAILED'; end if;
    content:=internal.post_render_config2_v2(p_content_payload,
      internal.post_engine_rules_config2_v2(p_content_payload->>'render_style'),
      p_interaction_goal,p_editorial_context->'cta_actions')->'content_payload';
  end if;
  if pg_catalog.jsonb_array_length(content#>'{body,facts}')<>count_facts then
    raise exception using errcode='P0001',message='MODULE_RELATION_INVALID'; end if;

  -- Claim first: a completed operation replays before any mutable config,
  -- catalog or claim/lease check. The semantic payload is never normalized by
  -- a JavaScript date conversion or changed on a retry.
  select * into o from internal.claim_operation_for_owner_v1(
    p_workspace_public_id,p_operation_key,'save_post_v2',2,
    pg_catalog.jsonb_build_object('page_public_id',p_page_public_id,
      'niche_key',p_niche_key,'config_public_id',p_config_public_id,
      'expected_config_updated_at',p_expected_config_updated_at,
      'expected_catalog_version',p_expected_catalog_version,
      'content_schema_version',2,'format_key',p_format_key,
      'topic_key',p_topic_key,'interaction_goal',p_interaction_goal,
      'scheduled_at',internal.iso_timestamp_v1(p_scheduled_at),
      'plan_item',coalesce(p_plan_item,'null'::jsonb),
      'facts',p_facts,'content_payload',content,
      'editorial_checks',p_editorial_checks)
      ||case when p_editorial_context is null or p_editorial_context='null'::jsonb then '{}'::jsonb
        else pg_catalog.jsonb_build_object('editorial_context',p_editorial_context) end);
  if o.claim_state='replay' then return internal.post_replay_v2(o.operation_id); end if;

  perform internal.trivia_lock_workspace_v1(o.workspace_id);
  c:=internal.trivia_lock_page_v1(o.workspace_id,p_page_public_id);
  select * into page from public.pages where workspace_id=o.workspace_id and id=c.page_id;
  if c.public_id is distinct from p_config_public_id
    or c.updated_at is distinct from p_expected_config_updated_at::timestamptz then
    raise exception using errcode='P0001',message='PAGE_VERSION_CONFLICT'; end if;
  select version into catalog from internal.trivia_fact_catalog_v2
    where workspace_id=o.workspace_id;
  if coalesce(catalog,0)::text is distinct from p_expected_catalog_version then
    raise exception using errcode='P0001',message='FACT_CATALOG_CONFLICT'; end if;
  if c.config_schema_version=2 then
    prepared:=internal.post_prepare_config2_v2(c,page,content,p_format_key,p_topic_key,p_interaction_goal,p_editorial_context);
    content:=prepared->'content'; snapshot:=prepared->'snapshot';
  else
    if p_editorial_context is not null and p_editorial_context<>'null'::jsonb then
      raise exception using errcode='P0001',message='VALIDATION_FAILED'; end if;
  if internal.is_valid_trivia_config_v1(c.config) is distinct from true then
    raise exception using errcode='P0001',message='CONFIG_INVALID'; end if;
  if p_format_key is null or not(c.config->'allowed_formats' ? p_format_key) then
    raise exception using errcode='P0001',message='FORMAT_UNSUPPORTED'; end if;
  if p_topic_key is null or not(c.config->'allowed_topics' ? p_topic_key) then
    raise exception using errcode='P0001',message='TOPIC_UNSUPPORTED'; end if;
  if p_interaction_goal is null
    or not(c.config->'allowed_interaction_goals' ? p_interaction_goal) then
    raise exception using errcode='P0001',message='VALIDATION_FAILED'; end if;
  if content->>'render_style' is distinct from c.config->>'render_style' then
    raise exception using errcode='P0001',message='CONTENT_RENDER_MISMATCH'; end if;
  if not (case c.config#>>'{fact_count,mode}'
      when 'fixed' then count_facts=(c.config#>>'{fact_count,value}')::integer
      else count_facts between (c.config#>>'{fact_count,min}')::integer
        and (c.config#>>'{fact_count,max}')::integer end) then
    raise exception using errcode='P0001',message='CONTENT_PAYLOAD_INVALID',
      detail='facts'; end if;
  budget:=c.config->'text_budget'; metrics:=content->'text_metrics';
  if (metrics->>'hook_chars')::integer>(budget->>'hook_max_chars')::integer
    or (metrics->>'cta_chars')::integer>(budget->>'cta_max_chars')::integer
    or (metrics->>'facts_total_chars')::integer>(budget->>'facts_total_max_chars')::integer
    or (metrics->>'canva_total_chars')::integer>(budget->>'canva_total_max_chars')::integer
    or exists(select 1 from pg_catalog.jsonb_array_elements(metrics->'fact_chars') x
      where (x.value#>>'{}')::integer>(budget->>'fact_max_chars')::integer)
    or pg_catalog.char_length(content->>'caption')>
      (c.config#>>'{caption,max_chars}')::integer
    or pg_catalog.jsonb_array_length(content->'hashtags') not between
      (c.config#>>'{hashtags,min_count}')::integer and
      (c.config#>>'{hashtags,max_count}')::integer then
    raise exception using errcode='P0001',message='CONTENT_BUDGET_EXCEEDED'; end if;

  end if;
  perform internal.post_lock_slots_v1(page.id,null,p_scheduled_at);
  if p_plan_item is not null and p_plan_item<>'null'::jsonb then
    select * into item from public.content_plan_items where workspace_id=o.workspace_id
      and public_id=(p_plan_item->>'plan_item_public_id')::uuid
      and page_id=page.id and niche_key='trivia';
    if item.id is null then
      raise exception using errcode='P0001',message='PLAN_ITEM_NOT_FOUND'; end if;
    select * into plan from public.content_plans where id=item.plan_id
      and workspace_id=o.workspace_id for update;
    select * into item from public.content_plan_items where id=item.id
      and workspace_id=o.workspace_id for update;
    if plan.status='cancelled' then
      raise exception using errcode='P0001',message='PLAN_STATUS_CONFLICT'; end if;
    perform internal.plan_assert_current_claim_v1(item,
      (p_plan_item->>'claim_token')::uuid);
    if item.scheduled_at is distinct from p_scheduled_at
      or (item.format_key is not null and item.format_key<>p_format_key)
      or (item.topic_key is not null and item.topic_key<>p_topic_key)
      or (item.interaction_goal is not null
        and item.interaction_goal<>p_interaction_goal) then
      raise exception using errcode='P0001',message='MODULE_RELATION_INVALID'; end if;
    if plan.plan_config ? 'context_snapshot' and
      (plan.plan_config#>>'{context_snapshot,niche_config,updated_at}')::timestamptz
        <>c.updated_at then
      raise exception using errcode='P0001',message='PAGE_VERSION_CONFLICT'; end if;
  end if;
  perform internal.assert_page_schedule_available(page.id,p_scheduled_at,item.id,null);

  -- Validate every final fact against the same locked catalog before the
  -- first identity is inserted; newly inserted facts need no invented reviews.
  for entry in select value from pg_catalog.jsonb_array_elements(p_facts) loop
    i:=i+1;
    if entry->>'candidate_key'=any(seen_keys)
      or internal.trivia_normalize_claim_v1(entry->>'claim_text')=any(seen_normal)
      or content#>>array['body','facts',(i-1)::text,'text'] is null then
      raise exception using errcode='P0001',message='FACT_REVIEW_REQUIRED',
        detail='facts['||i||']'; end if;
    seen_keys:=pg_catalog.array_append(seen_keys,entry->>'candidate_key');
    seen_normal:=pg_catalog.array_append(seen_normal,
      internal.trivia_normalize_claim_v1(entry->>'claim_text'));
    selected:=internal.post_fact_review_v2(o.workspace_id,entry,i);
    if selected is not null and selected=any(resolved) then
      raise exception using errcode='P0001',message='FACT_REVIEW_REQUIRED',
        detail='facts['||i||']'; end if;
    resolved:=pg_catalog.array_append(resolved,selected);
  end loop;

  if c.config_schema_version=1 then
  snapshot:=internal.post_generation_v2(c,page,content,
    case when p_format_key='themed_utility' then 'practical_utility'
      else 'fast_trivia' end);
  end if;
  insert into public.posts(workspace_id,page_id,niche_key,content_plan_item_id,
    created_by_operation_id,format_key,topic_key,interaction_goal,
    content_schema_version,content_payload,generation_snapshot,content_hash,scheduled_at)
  values(o.workspace_id,page.id,'trivia',item.id,o.operation_id,p_format_key,
    p_topic_key,p_interaction_goal,2,content,snapshot,pg_catalog.repeat('0',64),
    p_scheduled_at) returning * into post;
  i:=0;
  for entry in select value from pg_catalog.jsonb_array_elements(p_facts) loop
    i:=i+1;
    selected:=resolved[i];
    if selected is null then
      insert into public.trivia_facts(workspace_id,claim_text,normalized_claim,
        claim_hash,has_v1_envelope,subject_key,relation_key,object_key,numbers,
        qualifiers,ontology_version,structured_key,structured_hash,topic_key,
        dedup_review_snapshot,source_data,freshness_class,risk_class)
      values(o.workspace_id,entry->>'claim_text','',pg_catalog.repeat('0',64),
        false,null,null,null,null,null,null,null,null,null,null,null,null,null)
      returning * into fact;
    else
      select * into fact from public.trivia_facts where workspace_id=o.workspace_id
        and id=selected for update;
    end if;
    if fact.id is null or fact.verification_status in
      ('invalidated','superseded','rejected')
      or (fact.reservation_status='reserved'
        and fact.reserved_until>pg_catalog.clock_timestamp()) then
      raise exception using errcode='P0001',message='FACT_NOT_ELIGIBLE',
        detail='facts['||i||']'; end if;
    if exists(select 1 from public.trivia_post_facts u
      where u.workspace_id=o.workspace_id and u.fact_id=fact.id
        and u.is_current and u.allocation_state in ('allocated','published')
        and (c.config->>'fact_reuse_scope'='workspace_unique'
          or u.page_id=page.id)) then
      raise exception using errcode='P0001',message='FACT_REUSE_BLOCKED',
        detail='facts['||i||']'; end if;
    insert into public.trivia_fact_evidence_v2(workspace_id,fact_id,source_url)
      values(o.workspace_id,fact.id,entry->>'source_url')
      on conflict (workspace_id,fact_id) do nothing;
    insert into public.trivia_post_facts(workspace_id,page_id,post_id,fact_id,
      position,fact_role,rendered_text,claim_hash_snapshot,source_snapshot,
      verified_at_snapshot,snapshot_schema_version)
    values(o.workspace_id,page.id,post.id,fact.id,i,'general',
      content#>>array['body','facts',(i-1)::text,'text'],fact.claim_hash,
      pg_catalog.jsonb_build_object('schema_version',2,
        'canonical_claim',fact.claim_text,'source_url',entry->>'source_url'),
      null,2);
  end loop;
  post.content_hash:=internal.post_hash_v2(post);
  systems:=pg_catalog.jsonb_build_object('schema_version',2,
    'post_revision',1,'content_hash',post.content_hash,'overall_status','passed',
    'checks',pg_catalog.jsonb_build_array(
      pg_catalog.jsonb_build_object('id','trivia.facts.count_valid','status','passed'),
      pg_catalog.jsonb_build_object('id','trivia.render.exact_match','status','passed'),
      pg_catalog.jsonb_build_object('id','trivia.render.hard_budget','status','passed'),
      pg_catalog.jsonb_build_object('id','trivia.sources.url_valid','status','passed'),
      pg_catalog.jsonb_build_object('id','trivia.reuse.allowed','status','passed')));
  editorial:=pg_catalog.jsonb_build_object('schema_version',2,
    'post_revision',1,'content_hash',post.content_hash,'overall_status','passed',
    'checks',p_editorial_checks);
  update public.posts set content_hash=post.content_hash,system_checks=systems,
    editorial_checks=editorial,quality_status='passed'
    where id=post.id returning * into post;
  if item.id is not null then
    update public.content_plan_items set status='completed',
      completed_at=pg_catalog.clock_timestamp(),claim_token=null,
      claimed_at=null,claim_expires_at=null,claim_renewal_count=0,
      last_error_code=null,last_error_detail=null
      where id=item.id returning * into item;
    perform internal.plan_append_event_v1(o.operation_id,item,plan.public_id,
      'completed','in_progress');
    perform internal.plan_refresh_status_v1(plan.id);
    summary:=internal.plan_project_summary_v1(plan.id);
    summary:=pg_catalog.jsonb_build_object('plan_public_id',summary->'plan_public_id',
      'requested_count',summary->'requested_count','status',summary->'status',
      'progress',summary->'progress');
  end if;
  result:=pg_catalog.jsonb_build_object('response_schema_version',2,'data',
    pg_catalog.jsonb_build_object('post',pg_catalog.jsonb_build_object(
      'post_public_id',post.public_id,'page_public_id',page.public_id,
      'content_schema_version',2,'status','draft','revision',post.revision,
      'content_hash',post.content_hash),'plan',summary,'replayed',false));
  perform internal.post_complete_v2(o.operation_id,post,result);
  return result;
exception when query_canceled then
  perform internal.post_raise_v1('57014','');
when others then
  get stacked diagnostics v_state=returned_sqlstate,v_message=message_text;
  if v_message=any(array['FACT_CATALOG_CONFLICT','PAGE_VERSION_CONFLICT',
    'FACT_REVIEW_REQUIRED','EDITORIAL_REVIEW_REQUIRED','CONTENT_BUDGET_EXCEEDED','EDITORIAL_DEFINITION_UNAVAILABLE'])
    then raise; end if;
  perform internal.post_raise_v1(v_state,v_message);
end;
$function$
;
grant create on schema api to content_producer_api_owner;
alter function api.save_post_v2(integer,uuid,uuid,uuid,text,uuid,text,text,integer,text,text,text,timestamp with time zone,jsonb,jsonb,jsonb,jsonb,jsonb) owner to content_producer_api_owner;
revoke all on function api.save_post_v2(integer,uuid,uuid,uuid,text,uuid,text,text,integer,text,text,text,timestamp with time zone,jsonb,jsonb,jsonb,jsonb,jsonb) from public,anon,authenticated,service_role;
grant execute on function api.save_post_v2(integer,uuid,uuid,uuid,text,uuid,text,text,integer,text,text,text,timestamp with time zone,jsonb,jsonb,jsonb,jsonb,jsonb) to authenticated;
revoke create on schema api from content_producer_api_owner;

drop function api.revise_post_v2(p_request_schema_version integer, p_workspace_public_id uuid, p_operation_key uuid, p_post_public_id uuid, p_expected_revision integer, p_expected_content_hash text, p_config_public_id uuid, p_expected_config_updated_at text, p_expected_catalog_version text, p_content_schema_version integer, p_format_key text, p_topic_key text, p_interaction_goal text, p_facts jsonb, p_content_payload jsonb, p_editorial_checks jsonb, p_revision_reason text);
CREATE OR REPLACE FUNCTION api.revise_post_v2(p_request_schema_version integer, p_workspace_public_id uuid, p_operation_key uuid, p_post_public_id uuid, p_expected_revision integer, p_expected_content_hash text, p_config_public_id uuid, p_expected_config_updated_at text, p_expected_catalog_version text, p_content_schema_version integer, p_format_key text, p_topic_key text, p_interaction_goal text DEFAULT NULL, p_facts jsonb DEFAULT NULL, p_content_payload jsonb DEFAULT NULL, p_editorial_checks jsonb DEFAULT NULL, p_revision_reason text DEFAULT NULL, p_editorial_context jsonb DEFAULT NULL)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare prepared jsonb; o record; p public.posts; old public.posts; c public.page_niche_configs;
  page public.pages; fact public.trivia_facts; entry jsonb; content jsonb;
  snapshot jsonb; result jsonb; editorial jsonb; systems jsonb;
  resolved bigint[]:='{}'; selected bigint; seen_keys text[]:='{}';
  seen_normal text[]:='{}'; count_facts integer; i integer:=0;
  catalog bigint; v_state text; v_message text;
begin
  perform internal.assert_request_context_v1();
  if p_request_schema_version is distinct from 2
    or p_content_schema_version is distinct from 2
    or p_workspace_public_id is null or p_post_public_id is null
    or p_config_public_id is null or p_operation_key is null
    or internal.trivia_is_valid_uuid_v4_v1(p_operation_key::text) is distinct from true
    or p_expected_revision is null or p_expected_revision<1
    or p_expected_content_hash !~ '^[0-9a-f]{64}$'
    or p_expected_config_updated_at is null
    or p_expected_config_updated_at !~
      '^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{6}(Z|[+-]\d{2}:\d{2})$'
    or internal.trivia_is_valid_rfc3339_v1(p_expected_config_updated_at)
      is distinct from true
    or p_expected_catalog_version !~ '^(0|[1-9][0-9]*)$'
    or pg_catalog.char_length(p_expected_catalog_version)>19
    or pg_catalog.jsonb_typeof(p_facts) is distinct from 'array'
    or pg_catalog.jsonb_array_length(p_facts) not between 1 and 12
    or internal.has_exact_json_keys(p_editorial_checks,array[
      'meaning_preserved','caption_no_new_claim','no_known_substantive_issue'])
      is distinct from true
    or internal.plan_safe_reason_v1(pg_catalog.btrim(p_revision_reason))
      is distinct from true then
    raise exception using errcode='P0001',message='VALIDATION_FAILED';
  end if;
  if p_editorial_checks->>'meaning_preserved'<>'pass'
    or p_editorial_checks->>'caption_no_new_claim'<>'pass'
    or p_editorial_checks->>'no_known_substantive_issue'<>'pass' then
    raise exception using errcode='P0001',message='EDITORIAL_REVIEW_REQUIRED'; end if;
  count_facts:=pg_catalog.jsonb_array_length(p_facts);
  if p_editorial_context is null or p_editorial_context='null'::jsonb then
    content:=internal.post_render_v2(p_content_payload);
  else
    if internal.post_editorial_context_shape_config2_v2(p_editorial_context) is distinct from true then
      raise exception using errcode='P0001',message='VALIDATION_FAILED'; end if;
    content:=internal.post_render_config2_v2(p_content_payload,
      internal.post_engine_rules_config2_v2(p_content_payload->>'render_style'),
      p_interaction_goal,p_editorial_context->'cta_actions')->'content_payload';
  end if;
  if pg_catalog.jsonb_array_length(content#>'{body,facts}')<>count_facts then
    raise exception using errcode='P0001',message='MODULE_RELATION_INVALID'; end if;
  select * into o from internal.claim_operation_for_owner_v1(
    p_workspace_public_id,p_operation_key,'revise_post_v2',2,
    pg_catalog.jsonb_build_object('post_public_id',p_post_public_id,
      'expected_revision',p_expected_revision,
      'expected_content_hash',p_expected_content_hash,
      'config_public_id',p_config_public_id,
      'expected_config_updated_at',p_expected_config_updated_at,
      'expected_catalog_version',p_expected_catalog_version,
      'content_schema_version',2,'format_key',p_format_key,
      'topic_key',p_topic_key,'interaction_goal',p_interaction_goal,
      'facts',p_facts,'content_payload',content,
      'editorial_checks',p_editorial_checks,
      'revision_reason',pg_catalog.btrim(p_revision_reason))
      ||case when p_editorial_context is null or p_editorial_context='null'::jsonb then '{}'::jsonb
        else pg_catalog.jsonb_build_object('editorial_context',p_editorial_context) end);
  if o.claim_state='replay' then
    return internal.post_revise_replay_v2(o.operation_id); end if;

  perform internal.trivia_lock_workspace_v1(o.workspace_id);
  p:=internal.post_lock_target_v1(o.workspace_id,p_post_public_id);
  old:=p;
  if p.content_schema_version<>2 then
    raise exception using errcode='P0001',message='CONTENT_SCHEMA_UNSUPPORTED'; end if;
  if p.revision<>p_expected_revision then
    raise exception using errcode='P0001',message='REVISION_CONFLICT'; end if;
  if p.content_hash<>p_expected_content_hash then
    raise exception using errcode='P0001',message='CONTENT_HASH_CONFLICT'; end if;
  if p.status not in ('draft','ready') then
    raise exception using errcode='P0001',message='INVALID_STATUS_TRANSITION'; end if;
  select * into c from public.page_niche_configs where page_id=p.page_id
    and workspace_id=o.workspace_id and niche_key='trivia';
  select * into page from public.pages where id=p.page_id
    and workspace_id=o.workspace_id;
  if not page.is_active or not c.is_enabled then
    raise exception using errcode='P0001',message='MODULE_DISABLED'; end if;
  if c.public_id is distinct from p_config_public_id
    or c.updated_at is distinct from p_expected_config_updated_at::timestamptz then
    raise exception using errcode='P0001',message='PAGE_VERSION_CONFLICT'; end if;
  select version into catalog from internal.trivia_fact_catalog_v2
    where workspace_id=o.workspace_id;
  if coalesce(catalog,0)::text is distinct from p_expected_catalog_version then
    raise exception using errcode='P0001',message='FACT_CATALOG_CONFLICT'; end if;
  if c.config_schema_version=2 then
    prepared:=internal.post_prepare_config2_v2(c,page,content,p_format_key,p_topic_key,p_interaction_goal,p_editorial_context);
    content:=prepared->'content'; snapshot:=prepared->'snapshot';
  else
    if p_editorial_context is not null and p_editorial_context<>'null'::jsonb then
      raise exception using errcode='P0001',message='VALIDATION_FAILED'; end if;
  perform internal.post_assert_edit_v2(c,content,count_facts,p_format_key,
    p_topic_key,p_interaction_goal);
  end if;


  for entry in select value from pg_catalog.jsonb_array_elements(p_facts) loop
    i:=i+1;
    if entry->>'candidate_key'=any(seen_keys)
      or internal.trivia_normalize_claim_v1(entry->>'claim_text')=any(seen_normal)
      or content#>>array['body','facts',(i-1)::text,'text'] is null then
      raise exception using errcode='P0001',message='FACT_REVIEW_REQUIRED',
        detail='facts['||i||']'; end if;
    seen_keys:=pg_catalog.array_append(seen_keys,entry->>'candidate_key');
    seen_normal:=pg_catalog.array_append(seen_normal,
      internal.trivia_normalize_claim_v1(entry->>'claim_text'));
    selected:=internal.post_fact_review_v2(o.workspace_id,entry,i);
    if selected is not null and selected=any(resolved) then
      raise exception using errcode='P0001',message='FACT_REVIEW_REQUIRED',
        detail='facts['||i||']'; end if;
    resolved:=pg_catalog.array_append(resolved,selected);
  end loop;

  -- Every previous usage row remains immutable. Retained identities receive
  -- successor bindings too, so a draft-local URL update never edits history.
  update public.trivia_post_facts set allocation_state='released',
    released_at=pg_catalog.clock_timestamp(),is_current=false
    where workspace_id=o.workspace_id and post_id=p.id and is_current
      and allocation_state='allocated';
  i:=0;
  for entry in select value from pg_catalog.jsonb_array_elements(p_facts) loop
    i:=i+1; selected:=resolved[i];
    if selected is null then
      insert into public.trivia_facts(workspace_id,claim_text,normalized_claim,
        claim_hash,has_v1_envelope,subject_key,relation_key,object_key,numbers,
        qualifiers,ontology_version,structured_key,structured_hash,topic_key,
        dedup_review_snapshot,source_data,freshness_class,risk_class)
      values(o.workspace_id,entry->>'claim_text','',pg_catalog.repeat('0',64),
        false,null,null,null,null,null,null,null,null,null,null,null,null,null)
      returning * into fact;
    else
      select * into fact from public.trivia_facts where workspace_id=o.workspace_id
        and id=selected for update;
    end if;
    if fact.id is null or fact.verification_status in
      ('invalidated','superseded','rejected')
      or (fact.reservation_status='reserved'
        and fact.reserved_until>pg_catalog.clock_timestamp()) then
      raise exception using errcode='P0001',message='FACT_NOT_ELIGIBLE',
        detail='facts['||i||']'; end if;
    if exists(select 1 from public.trivia_post_facts u
      where u.workspace_id=o.workspace_id and u.fact_id=fact.id
        and u.is_current and u.allocation_state in ('allocated','published')
        and u.post_id<>p.id
        and (c.config->>'fact_reuse_scope'='workspace_unique'
          or u.page_id=p.page_id)) then
      raise exception using errcode='P0001',message='FACT_REUSE_BLOCKED',
        detail='facts['||i||']'; end if;
    insert into public.trivia_fact_evidence_v2(workspace_id,fact_id,source_url)
      values(o.workspace_id,fact.id,entry->>'source_url')
      on conflict (workspace_id,fact_id) do nothing;
    insert into public.trivia_post_facts(workspace_id,page_id,post_id,fact_id,
      position,fact_role,rendered_text,claim_hash_snapshot,source_snapshot,
      verified_at_snapshot,snapshot_schema_version)
    values(o.workspace_id,p.page_id,p.id,fact.id,i,'general',
      content#>>array['body','facts',(i-1)::text,'text'],fact.claim_hash,
      pg_catalog.jsonb_build_object('schema_version',2,
        'canonical_claim',fact.claim_text,'source_url',entry->>'source_url'),
      null,2);
  end loop;

  if c.config_schema_version=1 then
  snapshot:=internal.post_generation_v2(c,page,content,
    case when p_format_key='themed_utility' then 'practical_utility'
      else 'fast_trivia' end);
  end if;
  p.content_payload:=content; p.generation_snapshot:=snapshot;
  p.format_key:=p_format_key; p.topic_key:=p_topic_key;
  p.interaction_goal:=p_interaction_goal;
  p.content_hash:=internal.post_hash_v2(p);
  p.revision:=p.revision+1;
  systems:=pg_catalog.jsonb_build_object('schema_version',2,
    'post_revision',p.revision,'content_hash',p.content_hash,
    'overall_status','passed','checks',pg_catalog.jsonb_build_array(
      pg_catalog.jsonb_build_object('id','trivia.facts.count_valid','status','passed'),
      pg_catalog.jsonb_build_object('id','trivia.render.exact_match','status','passed'),
      pg_catalog.jsonb_build_object('id','trivia.render.hard_budget','status','passed'),
      pg_catalog.jsonb_build_object('id','trivia.sources.url_valid','status','passed'),
      pg_catalog.jsonb_build_object('id','trivia.reuse.allowed','status','passed')));
  editorial:=pg_catalog.jsonb_build_object('schema_version',2,
    'post_revision',p.revision,'content_hash',p.content_hash,
    'overall_status','passed','checks',p_editorial_checks);
  update public.posts set status='draft',revision=p.revision,
    format_key=p_format_key,topic_key=p_topic_key,interaction_goal=p_interaction_goal,
    content_payload=content,generation_snapshot=snapshot,content_hash=p.content_hash,
    system_checks=systems,editorial_checks=editorial,quality_status='passed',
    ready_at=null,approval_snapshot=null
    where id=p.id returning * into p;
  result:=pg_catalog.jsonb_build_object('response_schema_version',2,'data',
    pg_catalog.jsonb_build_object('post',pg_catalog.jsonb_build_object(
      'post_public_id',p.public_id,'page_public_id',page.public_id,
      'content_schema_version',2,'status','draft','revision',p.revision,
      'content_hash',p.content_hash),'plan','null'::jsonb,'replayed',false));
  perform internal.post_revise_complete_v2(o.operation_id,p,result,old,
    pg_catalog.btrim(p_revision_reason));
  return result;
exception when query_canceled then
  perform internal.post_raise_v1('57014','');
when others then
  get stacked diagnostics v_state=returned_sqlstate,v_message=message_text;
  if v_message=any(array['FACT_CATALOG_CONFLICT','PAGE_VERSION_CONFLICT',
    'FACT_REVIEW_REQUIRED','EDITORIAL_REVIEW_REQUIRED','CONTENT_BUDGET_EXCEEDED','EDITORIAL_DEFINITION_UNAVAILABLE'])
    then raise; end if;
  perform internal.post_raise_v1(v_state,v_message);
end;
$function$
;
grant create on schema api to content_producer_api_owner;
alter function api.revise_post_v2(integer,uuid,uuid,uuid,integer,text,uuid,text,text,integer,text,text,text,jsonb,jsonb,jsonb,text,jsonb) owner to content_producer_api_owner;
revoke all on function api.revise_post_v2(integer,uuid,uuid,uuid,integer,text,uuid,text,text,integer,text,text,text,jsonb,jsonb,jsonb,text,jsonb) from public,anon,authenticated,service_role;
grant execute on function api.revise_post_v2(integer,uuid,uuid,uuid,integer,text,uuid,text,text,integer,text,text,text,jsonb,jsonb,jsonb,text,jsonb) to authenticated;
revoke create on schema api from content_producer_api_owner;

CREATE OR REPLACE FUNCTION internal.lifecycle_current_system_v2(p posts)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare c public.page_niche_configs; page public.pages; j public.trivia_post_facts;
  f public.trivia_facts; content jsonb; prepared jsonb; n integer:=0; seen bigint[]:='{}';
begin
  select * into c from public.page_niche_configs where workspace_id=p.workspace_id
    and page_id=p.page_id and niche_key=p.niche_key;
  select * into page from public.pages where workspace_id=p.workspace_id and id=p.page_id;
  if p.niche_key<>'trivia' or page.id is null or not page.is_active
    or c.id is null or not c.is_enabled then
    raise exception using errcode='P0001',message='MODULE_DISABLED'; end if;
  if p.generation_snapshot->'schema_version'='3'::jsonb then
    if c.config_schema_version<>2 then raise exception using errcode='P0001',message='PAGE_VERSION_CONFLICT'; end if;
    prepared:=internal.post_prepare_config2_v2(c,page,p.content_payload,p.format_key,p.topic_key,p.interaction_goal,p.generation_snapshot->'editorial_context');
    content:=prepared->'content';
    if prepared->'snapshot' is distinct from p.generation_snapshot then
      raise exception using errcode='P0001',message='PAGE_VERSION_CONFLICT'; end if;
  else
    if c.config_schema_version<>1 then raise exception using errcode='P0001',message='PAGE_VERSION_CONFLICT'; end if;
  content:=internal.post_render_v2(p.content_payload);
  if content is distinct from p.content_payload then
    raise exception using errcode='P0001',message='CONTENT_RENDER_MISMATCH'; end if;
  perform internal.post_assert_edit_v2(c,content,
    pg_catalog.jsonb_array_length(content#>'{body,facts}'),p.format_key,p.topic_key,p.interaction_goal);
  if p.generation_snapshot->>'locale' is distinct from c.config#>>'{style,english_variant}'
    or p.generation_snapshot->>'profile_key' is distinct from
      (case when p.format_key='themed_utility' then 'practical_utility' else 'fast_trivia' end) then
    raise exception using errcode='P0001',message='QUALITY_SYSTEM_CHECK_FAILED'; end if;
  end if;
  for j in select * from public.trivia_post_facts where workspace_id=p.workspace_id
    and post_id=p.id and is_current order by position loop
    n:=n+1;
    select * into f from public.trivia_facts where workspace_id=p.workspace_id and id=j.fact_id;
    if j.position<>n or j.page_id<>p.page_id or j.snapshot_schema_version<>2
      or j.allocation_state<>'allocated' or f.id is null or f.id=any(seen)
      or j.rendered_text is distinct from content#>>array['body','facts',(n-1)::text,'text']
      or j.claim_hash_snapshot is distinct from f.claim_hash
      or j.source_snapshot->>'canonical_claim' is distinct from f.claim_text then
      raise exception using errcode='P0001',message='MODULE_RELATION_INVALID'; end if;
    seen:=pg_catalog.array_append(seen,f.id);
    if internal.has_exact_json_keys(j.source_snapshot,array[
      'schema_version','canonical_claim','source_url']) is distinct from true
      or j.source_snapshot->'schema_version' is distinct from '2'::jsonb
      or internal.trivia_web_source_url_v2(j.source_snapshot->>'source_url') is distinct from true then
      raise exception using errcode='P0001',message='FACT_SOURCE_INSUFFICIENT'; end if;
    if f.verification_status in ('invalidated','superseded','rejected')
      or exists(select 1 from public.trivia_facts sf where sf.workspace_id=p.workspace_id
        and sf.supersedes_fact_id=f.id and sf.verification_status in ('needs_review','verified'))
      or (f.reservation_status='reserved' and f.reserved_until>pg_catalog.clock_timestamp()) then
      raise exception using errcode='P0001',message='FACT_NOT_ELIGIBLE'; end if;
    if exists(select 1 from public.trivia_post_facts u where u.workspace_id=p.workspace_id
      and u.fact_id=f.id and u.post_id<>p.id and u.is_current
      and u.allocation_state in ('allocated','published')
      and (c.config->>'fact_reuse_scope'='workspace_unique' or u.page_id=p.page_id)) then
      raise exception using errcode='P0001',message='FACT_REUSE_BLOCKED'; end if;
  end loop;
  if n not between 1 and (case when p.generation_snapshot->'schema_version'='3'::jsonb then 12 else 9 end) or n<>pg_catalog.jsonb_array_length(content#>'{body,facts}') then
    raise exception using errcode='P0001',message='MODULE_RELATION_INVALID'; end if;
  if internal.post_hash_v2(p) is distinct from p.content_hash then
    raise exception using errcode='P0001',message='CONTENT_HASH_CONFLICT'; end if;
  if p.scheduled_at is not null and (exists(select 1 from public.posts pp
    where pp.page_id=p.page_id and pp.id<>p.id and pp.status<>'discarded' and pp.scheduled_at=p.scheduled_at)
    or exists(select 1 from public.content_plan_items i where i.page_id=p.page_id
      and i.id is distinct from p.content_plan_item_id and i.status<>'cancelled'
      and i.scheduled_at=p.scheduled_at)) then
    raise exception using errcode='P0001',message='SCHEDULE_CONFLICT'; end if;
  -- Only the revision binding changes; these are newly computed server results.
  return pg_catalog.jsonb_build_object('schema_version',2,'post_revision',p.revision+1,
    'content_hash',p.content_hash,'overall_status','passed','checks',pg_catalog.jsonb_build_array(
      pg_catalog.jsonb_build_object('id','trivia.facts.count_valid','status','passed'),
      pg_catalog.jsonb_build_object('id','trivia.render.exact_match','status','passed'),
      pg_catalog.jsonb_build_object('id','trivia.render.hard_budget','status','passed'),
      pg_catalog.jsonb_build_object('id','trivia.sources.url_valid','status','passed'),
      pg_catalog.jsonb_build_object('id','trivia.reuse.allowed','status','passed')));
end; $function$
;

CREATE OR REPLACE FUNCTION internal.lifecycle_response_valid_v1(name text, r jsonb)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE
 SET search_path TO ''
AS $function$
declare d jsonb:=r->'data'; a jsonb:=d->'approval'; x jsonb; keys text[]; ids text[];
begin
 if internal.has_exact_json_keys(r,array['response_schema_version','data']) is distinct from true
   or r->'response_schema_version' is distinct from '1'::jsonb or pg_catalog.octet_length(r::text)>65536
   or internal.plan_is_uuid_v1(d->'post_public_id') is distinct from true
   or internal.is_json_integer_between(d->'revision',2,2147483647) is distinct from true or d->'replayed' is distinct from 'false'::jsonb
   or r::text ~ '"(claim_token|reservation_token|access_token|refresh_token|workspace_id|page_id|post_id|fact_id|operation_id|actor_user_id)"[[:space:]]*:' then return false; end if;
 keys:=array['post_public_id','status','revision','replayed'];
 if name='approve_post' then
   keys:=keys||array['approval','recomputed_checks'];
   if d->>'status' is distinct from 'ready' or internal.has_exact_json_keys(a,array['approved_revision','content_hash','approved_at','accepted_warning_ids','warning_acceptance_reason']) is distinct from true
     or a->'approved_revision' is distinct from d->'revision' or a->>'content_hash' !~ '^[0-9a-f]{64}$'
     or pg_catalog.jsonb_typeof(a->'content_hash') is distinct from 'string' or internal.plan_is_time_v1(a->'approved_at') is distinct from true
     or pg_catalog.jsonb_typeof(a->'accepted_warning_ids') is distinct from 'array'
     or pg_catalog.jsonb_array_length(a->'accepted_warning_ids')>20
     or (case when d#>'{recomputed_checks,schema_version}'='2'::jsonb then internal.post_evidence_valid_v2(d->'recomputed_checks',a->>'content_hash',(d->>'revision')::integer,false) else internal.is_valid_system_checks_v1(d->'recomputed_checks',a->>'content_hash',(d->>'revision')::integer) end) is distinct from true then return false; end if;
   for x in select value from pg_catalog.jsonb_array_elements(a->'accepted_warning_ids') loop
     if pg_catalog.jsonb_typeof(x) is distinct from 'string' then return false; end if;
   end loop;
   select coalesce(pg_catalog.array_agg(value#>>'{}' order by value#>>'{}'),'{}') into ids from pg_catalog.jsonb_array_elements(a->'accepted_warning_ids');
   ids:=internal.lifecycle_ids_v1(ids); perform internal.lifecycle_reason_v1(ids,a->>'warning_acceptance_reason');
   if a->'accepted_warning_ids' is distinct from pg_catalog.to_jsonb(ids)
     or (a->'warning_acceptance_reason'<>'null'::jsonb and pg_catalog.jsonb_typeof(a->'warning_acceptance_reason') is distinct from 'string') then return false; end if;
 elsif name='revoke_post_approval' then
   keys:=keys||array['approval_revoked'];
   if d->>'status' is distinct from 'draft' or d->'approval_revoked' is distinct from 'true'::jsonb then return false; end if;
 elsif name='discard_post' then
   keys:=keys||array['released_fact_public_ids','plan_item'];
   if d->>'status' is distinct from 'discarded' then return false; end if;
   a:=d->'plan_item';
   if a<>'null'::jsonb and (internal.has_exact_json_keys(a,array['plan_item_public_id','replacement_eligible']) is distinct from true
     or internal.plan_is_uuid_v1(a->'plan_item_public_id') is distinct from true
     or pg_catalog.jsonb_typeof(a->'replacement_eligible') is distinct from 'boolean') then return false; end if;
 elsif name='mark_post_posted' then
   keys:=keys||array['published_at','platform_post_id','published_url','published_fact_public_ids'];
   if d->>'status' is distinct from 'posted' or internal.plan_is_time_v1(d->'published_at') is distinct from true
     or (d->'platform_post_id'<>'null'::jsonb and (pg_catalog.jsonb_typeof(d->'platform_post_id') is distinct from 'string'
       or pg_catalog.char_length(d->>'platform_post_id') not between 1 and 200 or d->>'platform_post_id' ~ '[[:cntrl:]]'))
     or (d->'published_url'<>'null'::jsonb and (pg_catalog.jsonb_typeof(d->'published_url') is distinct from 'string'
       or internal.lifecycle_url_v1(d->>'published_url') is distinct from true)) then return false; end if;
 elsif name='archive_post' then
   keys:=keys||array['archived_at'];
   if d->>'status' is distinct from 'archived' or internal.plan_is_time_v1(d->'archived_at') is distinct from true then return false; end if;
 else return false; end if;
 if name in ('discard_post','mark_post_posted') then
   a:=d->case when name='discard_post' then 'released_fact_public_ids' else 'published_fact_public_ids' end;
   if pg_catalog.jsonb_typeof(a) is distinct from 'array' or pg_catalog.jsonb_array_length(a) not between 1 and 12 then return false; end if;
   for x in select value from pg_catalog.jsonb_array_elements(a) loop if internal.plan_is_uuid_v1(x) is distinct from true then return false; end if; end loop;
   if (select count(distinct value) from pg_catalog.jsonb_array_elements(a))<>pg_catalog.jsonb_array_length(a) then return false; end if;
 end if;
 return internal.has_exact_json_keys(d,keys) is true;
exception when others then return false;
end; $function$
;

CREATE OR REPLACE FUNCTION api.get_post(p_request_schema_version integer, p_workspace_public_id uuid, p_post_public_id uuid, p_include_sources boolean DEFAULT true, p_include_checks boolean DEFAULT true, p_include_latest_metrics boolean DEFAULT false)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_context record;
  v_workspace record;
  v_post record;
  v_fact_bindings jsonb;
  v_fact_warnings jsonb;
  v_latest_metrics jsonb;
  v_plan_item_public_id uuid;
  v_content_payload jsonb;
  v_approval jsonb;
begin
  if p_include_sources is null
    or p_include_checks is null
    or p_include_latest_metrics is null then
    perform internal.raise_read_error_v1('VALIDATION_FAILED');
  end if;

  select * into v_context
  from internal.begin_read_v1(p_request_schema_version, 'read');
  select * into v_workspace
  from internal.resolve_workspace_owner_v1(p_workspace_public_id);

  select post.*, page.public_id as page_public_id
  into v_post
  from public.posts as post
  join public.pages as page
    on page.workspace_id = post.workspace_id
    and page.id = post.page_id
  where post.workspace_id = v_workspace.workspace_id
    and post.public_id = p_post_public_id;

  if not found then
    perform internal.raise_read_error_v1('POST_NOT_FOUND');
  end if;

  select item.public_id
  into v_plan_item_public_id
  from public.content_plan_items as item
  where item.workspace_id = v_post.workspace_id
    and item.id = v_post.content_plan_item_id;

  select coalesce(jsonb_agg(
    jsonb_build_object(
      'fact_public_id', fact.public_id,
      'position', usage.position,
      'fact_role', usage.fact_role,
      'rendered_text', usage.rendered_text,
      'allocation_state', usage.allocation_state,
      'source_snapshot', case
        when p_include_sources then case when v_post.content_schema_version=2 then usage.source_snapshot else internal.project_fact_source_snapshot_v1(usage.source_snapshot) end
        else null
      end
    ) - (case when p_include_sources then '' else 'source_snapshot' end) order by usage.position asc, usage.id asc
  ), '[]'::jsonb)
  into v_fact_bindings
  from public.trivia_post_facts as usage
  join public.trivia_facts as fact
    on fact.workspace_id = usage.workspace_id
    and fact.id = usage.fact_id
  where usage.workspace_id = v_post.workspace_id
    and usage.post_id = v_post.id and usage.is_current;

  select coalesce(jsonb_agg(jsonb_build_object(
    'fact_public_id', fact.public_id,
    'code', case
      when fact.verification_status in ('invalidated', 'superseded') then 'FACT_CORRECTION_CURRENT'
      when fact.verification_status <> 'verified' then 'FACT_NOT_VERIFIED'
      when fact.expires_at is null or fact.expires_at <= clock_timestamp() then 'FACT_FRESHNESS_EXPIRED'
      else 'FACT_WARNING'
    end,
    'message', case
      when fact.verification_status in ('invalidated', 'superseded') then 'The current fact has a correction or successor warning.'
      when fact.verification_status <> 'verified' then 'The current fact is not verified.'
      else 'The current fact freshness window has expired.'
    end
  ) order by usage.position asc), '[]'::jsonb)
  into v_fact_warnings
  from public.trivia_post_facts as usage
  join public.trivia_facts as fact
    on fact.workspace_id = usage.workspace_id
    and fact.id = usage.fact_id
  where usage.workspace_id = v_post.workspace_id
    and usage.post_id = v_post.id and usage.is_current
    and (case when v_post.content_schema_version=2 then fact.verification_status in ('invalidated','superseded','rejected') else (fact.verification_status <> 'verified' or fact.expires_at is null or fact.expires_at <= clock_timestamp()) end);

  v_content_payload := jsonb_build_object(
    'schema_version', v_post.content_payload -> 'schema_version',
    'hook', v_post.content_payload -> 'hook',
    'body', v_post.content_payload -> 'body',
    'cta', v_post.content_payload -> 'cta',
    'canva_copy', v_post.content_payload -> 'canva_copy',
    'caption', v_post.content_payload -> 'caption',
    'hashtags', v_post.content_payload -> 'hashtags',
    'render_style', v_post.content_payload -> 'render_style',
    'text_metrics', v_post.content_payload -> 'text_metrics'
  );

  if v_post.content_schema_version=2 then v_content_payload:=v_post.content_payload; end if; v_approval := case when v_post.approval_snapshot is null then null else jsonb_strip_nulls(jsonb_build_object(
    'status', 'approved',
    'revision', coalesce(v_post.approval_snapshot -> 'approved_revision',v_post.approval_snapshot -> 'revision'),
    'content_hash', v_post.approval_snapshot -> 'content_hash',
    'approved_at', v_post.approval_snapshot -> 'approved_at'
  )) end;

  if p_include_latest_metrics then
    select internal.project_metric_snapshot_v1(
      metric.public_id,
      v_post.public_id,
      metric.captured_at,
      metric.views,
      metric.reach,
      metric.reactions,
      metric.likes,
      metric.comments,
      metric.shares,
      metric.saves,
      metric.follows,
      metric.watch_time_seconds,
      metric.average_watch_time_seconds,
      metric.metrics_payload,
      metric.created_at
    )
    into v_latest_metrics
    from public.post_metrics as metric
    where metric.workspace_id = v_post.workspace_id
      and metric.post_id = v_post.id
    order by metric.captured_at desc, metric.id desc
    limit 1;
  end if;

  return jsonb_build_object(
    'response_schema_version', 1,
    'data', jsonb_build_object(
      'post', jsonb_build_object(
        'post_public_id', v_post.public_id,
        'page_public_id', v_post.page_public_id,
        'niche_key', v_post.niche_key,
        'status', v_post.status,
        'revision', v_post.revision,
        'content_hash', v_post.content_hash,
        'format_key', v_post.format_key,
        'topic_key', v_post.topic_key,
        'interaction_goal', v_post.interaction_goal,
        'scheduled_at', internal.iso_timestamp_v1(v_post.scheduled_at),
        'published_at', internal.iso_timestamp_v1(v_post.published_at),
        'content_payload', v_content_payload,
        'system_checks', case when v_post.content_schema_version=2 then case when p_include_checks then v_post.system_checks else null end else internal.project_check_snapshot_v1(v_post.system_checks, p_include_checks) end,
        'editorial_checks', case when v_post.content_schema_version=2 then case when p_include_checks then v_post.editorial_checks else null end else internal.project_check_snapshot_v1(v_post.editorial_checks, p_include_checks) end,
        'quality_status', v_post.quality_status,
        'fact_bindings', v_fact_bindings,
        'created_at', internal.iso_timestamp_v1(v_post.created_at),
        'updated_at', internal.iso_timestamp_v1(v_post.updated_at)
      ) || case when v_post.content_schema_version=2 then jsonb_build_object('content_schema_version',2) else '{}'::jsonb end
        ||case when v_post.generation_snapshot->'schema_version'='3'::jsonb
          then jsonb_build_object('generation_snapshot',v_post.generation_snapshot) else '{}'::jsonb end,
      'approval', v_approval,
      'plan_item_public_id', v_plan_item_public_id,
      'current_fact_warnings', v_fact_warnings,
      'latest_metrics', v_latest_metrics
    )
  );
end;
$function$
;

CREATE OR REPLACE FUNCTION api.list_posts(p_request_schema_version integer, p_workspace_public_id uuid, p_page_public_id uuid DEFAULT NULL::uuid, p_niche_key text DEFAULT NULL::text, p_statuses text[] DEFAULT NULL::text[], p_format_key text DEFAULT NULL::text, p_topic_key text DEFAULT NULL::text, p_scheduled_from timestamp with time zone DEFAULT NULL::timestamp with time zone, p_scheduled_to timestamp with time zone DEFAULT NULL::timestamp with time zone, p_created_from timestamp with time zone DEFAULT NULL::timestamp with time zone, p_created_to timestamp with time zone DEFAULT NULL::timestamp with time zone, p_query text DEFAULT NULL::text, p_limit integer DEFAULT 20, p_cursor text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_context record;
  v_workspace record;
  v_cursor record;
  v_cursor_sort timestamptz;
  v_cursor_id bigint;
  v_items jsonb;
  v_total bigint;
  v_has_more boolean;
  v_last_sort text;
  v_last_id bigint;
begin
  if p_limit is null
    or p_limit not between 1 and 50
    or (p_query is not null and (
      nullif(btrim(p_query), '') is null or char_length(btrim(p_query)) > 120
    ))
    or (p_niche_key is not null and p_niche_key !~ '^[a-z][a-z0-9_]{1,49}$')
    or (p_format_key is not null and p_format_key !~ '^[a-z][a-z0-9_]{1,79}$')
    or (p_topic_key is not null and p_topic_key !~ '^[a-z][a-z0-9_]{1,79}$')
    or (p_scheduled_from is not null and p_scheduled_to is not null and p_scheduled_from > p_scheduled_to)
    or (p_created_from is not null and p_created_to is not null and p_created_from > p_created_to)
    or (p_statuses is not null and (
      cardinality(p_statuses) = 0
      or exists (
        select 1 from unnest(p_statuses) as requested_status
        where requested_status not in ('draft', 'ready', 'posted', 'discarded', 'archived')
      )
    )) then
    perform internal.raise_read_error_v1('VALIDATION_FAILED');
  end if;

  select * into v_context
  from internal.begin_read_v1(p_request_schema_version, 'read');
  select * into v_workspace
  from internal.resolve_workspace_owner_v1(p_workspace_public_id);

  if p_niche_key is not null
    and not exists (select 1 from public.niches where key = p_niche_key) then
    perform internal.raise_read_error_v1('MODULE_NOT_FOUND');
  end if;

  if p_cursor is not null then
    select * into v_cursor
    from internal.decode_read_cursor_v1(p_cursor, 'posts');
    begin
      v_cursor_sort := v_cursor.sort_value::timestamptz;
      v_cursor_id := v_cursor.tie_id;
    exception when others then
      perform internal.raise_read_error_v1('VALIDATION_FAILED');
    end;
  end if;

  with ordered as (
    select
      post.*,
      row_number() over (order by post.updated_at desc, post.id desc) as row_number
    from public.posts as post
    where post.workspace_id = v_workspace.workspace_id
      and (p_page_public_id is null or exists (
        select 1 from public.pages as page
        where page.id = post.page_id and page.workspace_id = post.workspace_id and page.public_id = p_page_public_id
      ))
      and (p_niche_key is null or post.niche_key = p_niche_key)
      and (p_statuses is null or post.status = any(p_statuses))
      and (p_format_key is null or post.format_key = p_format_key)
      and (p_topic_key is null or post.topic_key = p_topic_key)
      and (p_scheduled_from is null or post.scheduled_at >= p_scheduled_from)
      and (p_scheduled_to is null or post.scheduled_at <= p_scheduled_to)
      and (p_created_from is null or post.created_at >= p_created_from)
      and (p_created_to is null or post.created_at <= p_created_to)
      and (p_query is null or position(lower(btrim(p_query)) in lower(coalesce(post.content_payload ->> 'hook', ''))) > 0)
      and (
        p_cursor is null
        or post.updated_at < v_cursor_sort
        or (post.updated_at = v_cursor_sort and post.id < v_cursor_id)
      )
  )
  select
    coalesce(jsonb_agg(
      jsonb_build_object(
        'post_public_id', ordered.public_id,
        'page_public_id', page.public_id,
        'niche_key', ordered.niche_key,
        'status', ordered.status,
        'revision', ordered.revision,
        'format_key', ordered.format_key,
        'topic_key', ordered.topic_key,
        'interaction_goal', ordered.interaction_goal,
        'scheduled_at', internal.iso_timestamp_v1(ordered.scheduled_at),
        'published_at', internal.iso_timestamp_v1(ordered.published_at),
        'quality_status', ordered.quality_status,
        'hook_preview', left(ordered.content_payload ->> 'hook', 120),
        'updated_at', internal.iso_timestamp_v1(ordered.updated_at)
      ) || case when ordered.content_schema_version=2 then jsonb_build_object('content_schema_version',2) else '{}'::jsonb end
        ||case when ordered.generation_snapshot->'schema_version'='3'::jsonb then jsonb_build_object(
          'editorial_context',ordered.generation_snapshot->'editorial_context') else '{}'::jsonb end order by ordered.updated_at desc, ordered.id desc
    ) filter (where ordered.row_number <= p_limit), '[]'::jsonb),
    count(*)
  into v_items, v_total
  from ordered
  join public.pages as page
    on page.workspace_id = ordered.workspace_id
    and page.id = ordered.page_id;

  v_has_more := v_total > p_limit;
  if v_has_more then
    select internal.iso_timestamp_v1(post.updated_at), post.id
    into v_last_sort, v_last_id
    from public.posts as post
    where post.workspace_id = v_workspace.workspace_id
      and (p_page_public_id is null or exists (
        select 1 from public.pages as page
        where page.id = post.page_id and page.workspace_id = post.workspace_id and page.public_id = p_page_public_id
      ))
      and (p_niche_key is null or post.niche_key = p_niche_key)
      and (p_statuses is null or post.status = any(p_statuses))
      and (p_format_key is null or post.format_key = p_format_key)
      and (p_topic_key is null or post.topic_key = p_topic_key)
      and (p_scheduled_from is null or post.scheduled_at >= p_scheduled_from)
      and (p_scheduled_to is null or post.scheduled_at <= p_scheduled_to)
      and (p_created_from is null or post.created_at >= p_created_from)
      and (p_created_to is null or post.created_at <= p_created_to)
      and (p_query is null or position(lower(btrim(p_query)) in lower(coalesce(post.content_payload ->> 'hook', ''))) > 0)
      and (
        p_cursor is null
        or post.updated_at < v_cursor_sort
        or (post.updated_at = v_cursor_sort and post.id < v_cursor_id)
      )
    order by post.updated_at desc, post.id desc
    offset p_limit - 1
    limit 1;
  end if;

  return jsonb_build_object(
    'response_schema_version', 1,
    'data', jsonb_build_object(
      'items', v_items,
      'next_cursor', case when v_has_more
        then internal.encode_read_cursor_v1('posts', v_last_sort, v_last_id)
        else null
      end,
      'has_more', v_has_more
    )
  );
end;
$function$
;

do $$ declare src text; anchor text; begin
  src:=pg_get_functiondef('api.get_performance_insights(integer,uuid,uuid,text,timestamptz,timestamptz,text[],text,integer,integer)'::regprocedure);
  anchor:='c.config_schema_version<>n.config_schema_version or c.config_schema_version<>1';
  if strpos(src,anchor)=0 then raise exception 'Missing insights config branch'; end if;
  execute replace(src,anchor,'not ((c.config_schema_version=1 and c.config_schema_version=n.config_schema_version) or (c.niche_key=''trivia'' and c.config_schema_version=2))');
end $$;
do $$ declare src text; anchor text:=$anchor$'QUALITY_EVIDENCE_STALE'$anchor$; begin
  src:=pg_get_functiondef('internal.post_raise_v1(text,text)'::regprocedure);
  if strpos(src,anchor)=0 then raise exception 'Missing post error allowlist'; end if;
  execute replace(src,anchor,$codes$'QUALITY_EVIDENCE_STALE','PAGE_VERSION_CONFLICT','EDITORIAL_DEFINITION_UNAVAILABLE'$codes$);
end $$;

-- New helper ownership/ACL; existing replaced functions keep their original owner.
grant create on schema internal to content_producer_api_owner;
do $$ declare r record; begin
  for r in select p.oid::regprocedure f from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='internal' and p.proname in ('post_engine_rules_config2_v2','post_editorial_context_shape_config2_v2',
      'post_prepare_config2_v2','post_generation_config2_valid_v2','post_bundle_config2_valid_v2') loop
    execute format('alter function %s owner to content_producer_api_owner',r.f);
    execute format('revoke all on function %s from public,anon,authenticated,service_role',r.f);
  end loop;
end $$;
revoke create on schema internal from content_producer_api_owner;
notify pgrst, 'reload schema';
