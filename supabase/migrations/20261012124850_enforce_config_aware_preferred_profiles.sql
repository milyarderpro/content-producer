-- CR-016 / P2-02: all preferred ranges are evaluated from locked config.
alter function internal.post_system_v1(jsonb,jsonb,text,integer) rename to post_system_base_v1;
create function internal.post_system_for_config_v1(c jsonb,s jsonb,h text,r integer,profiles jsonb) returns jsonb
language plpgsql volatile security invoker set search_path='' as $$
declare result jsonb; profile jsonb:=profiles->(s->>'profile_key'); m jsonb:=c->'text_metrics';
  n integer:=pg_catalog.jsonb_array_length(c#>'{body,facts}'); ok boolean;
begin
  if internal.has_exact_json_keys(profile,array['fact_count_min','fact_count_max','words_per_fact_min',
    'words_per_fact_max','total_words_min','total_words_max']) is distinct from true then
    raise exception using errcode='P0001',message='PROFILE_UNSUPPORTED'; end if;
  result:=internal.post_system_base_v1(c,s,h,r);
  ok:=n between (profile->>'fact_count_min')::integer and (profile->>'fact_count_max')::integer
    and (m->>'word_count')::integer between (profile->>'total_words_min')::integer and (profile->>'total_words_max')::integer
    and not exists(select 1 from pg_catalog.jsonb_array_elements(m->'fact_word_counts') x
      where (x#>>'{}')::integer not between (profile->>'words_per_fact_min')::integer and (profile->>'words_per_fact_max')::integer);
  return pg_catalog.jsonb_set(result,'{checks}',(select pg_catalog.jsonb_agg(case
    when value->>'id'='trivia.profile.preferred_band' then value||pg_catalog.jsonb_build_object(
      'status',case when ok then 'passed' else 'needs_review' end,'expected',profile)
    else value end order by ordinal) from pg_catalog.jsonb_array_elements(result->'checks') with ordinality x(value,ordinal)));
end; $$;
-- Legacy deterministic helper uses the frozen defaults (or supplied private config).
-- Public writers below always pass the locked Page config explicitly.
create function internal.post_system_v1(c jsonb,s jsonb,h text,r integer) returns jsonb
language sql volatile security invoker set search_path='' as $$
  select internal.post_system_for_config_v1(c,s,h,r,coalesce(s->'profiles',
    '{"fast_trivia":{"fact_count_min":7,"fact_count_max":8,"words_per_fact_min":8,"words_per_fact_max":11,"total_words_min":65,"total_words_max":85},
      "practical_utility":{"fact_count_min":5,"fact_count_max":6,"words_per_fact_min":10,"words_per_fact_max":14,"total_words_min":65,"total_words_max":85}}'::jsonb));
$$;
grant create on schema internal to content_producer_api_owner;
alter function internal.post_system_for_config_v1(jsonb,jsonb,text,integer,jsonb) owner to content_producer_api_owner;
alter function internal.post_system_v1(jsonb,jsonb,text,integer) owner to content_producer_api_owner;
revoke create on schema internal from content_producer_api_owner;
revoke all on function internal.post_system_for_config_v1(jsonb,jsonb,text,integer,jsonb) from public,anon,authenticated,service_role;
revoke all on function internal.post_system_v1(jsonb,jsonb,text,integer) from public,anon,authenticated,service_role;

do $$ declare src text; anchor text; begin
  src:=pg_catalog.pg_get_functiondef('api.save_post(integer,uuid,uuid,uuid,text,uuid,timestamptz,jsonb,timestamptz,integer,text,text,text,jsonb,jsonb,jsonb,jsonb)'::regprocedure);
  anchor:='internal.post_system_v1(content,s,p.content_hash,1)';
  if pg_catalog.strpos(src,anchor)=0 then raise exception 'Missing save system anchor'; end if;
  execute pg_catalog.replace(src,anchor,'internal.post_system_for_config_v1(content,s,p.content_hash,1,c.config->''profiles'')');
  src:=pg_catalog.pg_get_functiondef('api.revise_post(integer,uuid,uuid,uuid,integer,text,uuid,integer,text,text,text,jsonb,jsonb,jsonb,jsonb,text)'::regprocedure);
  anchor:='internal.post_system_v1(content,s,p.content_hash,p.revision)';
  if pg_catalog.strpos(src,anchor)=0 then raise exception 'Missing revision system anchor'; end if;
  execute pg_catalog.replace(src,anchor,'internal.post_system_for_config_v1(content,s,p.content_hash,p.revision,c.config->''profiles'')');
  src:=pg_catalog.pg_get_functiondef('internal.lifecycle_current_system_v1(public.posts)'::regprocedure);
  anchor:='internal.post_system_v1(content,g,p.content_hash,p.revision+1)';
  if pg_catalog.strpos(src,anchor)=0 then raise exception 'Missing lifecycle system anchor'; end if;
  execute pg_catalog.replace(src,anchor,'internal.post_system_for_config_v1(content,g,p.content_hash,p.revision+1,c.config->''profiles'')');
end $$;
