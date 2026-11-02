-- CR-053 P5: shared lifecycle endpoints retain their wire v1 envelope, with
-- versioned check snapshots. No source fetch, v1 tier or expiry on v2 posts.
create or replace function internal.post_evidence_valid_v2(checks jsonb, hash text, revision integer,
  editorial boolean) returns boolean
language sql immutable security invoker set search_path='' as $$
  select internal.has_exact_json_keys(checks,array['schema_version','post_revision',
    'content_hash','overall_status','checks']) is true
    and checks->'schema_version'='2'::jsonb
    and checks->'post_revision'=pg_catalog.to_jsonb(revision)
    and checks->>'content_hash'=hash and checks->>'overall_status'='passed'
    and case when editorial then
      internal.has_exact_json_keys(checks->'checks',array['meaning_preserved',
        'caption_no_new_claim','no_known_substantive_issue']) is true
      and checks#>>'{checks,meaning_preserved}'='pass'
      and checks#>>'{checks,caption_no_new_claim}'='pass'
      and checks#>>'{checks,no_known_substantive_issue}'='pass'
    else pg_catalog.jsonb_typeof(checks->'checks')='array'
      and pg_catalog.jsonb_array_length(checks->'checks')=5
      and (select pg_catalog.array_agg(x->>'id' order by x->>'id')
        from pg_catalog.jsonb_array_elements(checks->'checks') x)=array[
          'trivia.facts.count_valid','trivia.render.exact_match',
          'trivia.render.hard_budget','trivia.reuse.allowed','trivia.sources.url_valid']
      and not exists(select 1 from pg_catalog.jsonb_array_elements(checks->'checks') x
        where internal.has_exact_json_keys(x,array['id','status']) is distinct from true
          or x->>'status' is distinct from 'passed') end;
$$;

do $$ declare src text; anchor text;
begin
  src:=pg_catalog.pg_get_functiondef('internal.lifecycle_response_valid_v1(text,jsonb)'::regprocedure);
  anchor:='internal.is_valid_system_checks_v1(d->''recomputed_checks'',a->>''content_hash'',(d->>''revision'')::integer)';
  if pg_catalog.strpos(src,anchor)=0 then raise exception 'Missing lifecycle response anchor'; end if;
  execute pg_catalog.replace(src,anchor,
    '(case when d#>''{recomputed_checks,schema_version}''=''2''::jsonb then '
    ||'internal.post_evidence_valid_v2(d->''recomputed_checks'',a->>''content_hash'',(d->>''revision'')::integer,false) '
    ||'else '||anchor||' end)');

  src:=pg_catalog.pg_get_functiondef('internal.validate_post_row()'::regprocedure);
  anchor:='new.content_hash,new.revision,';
  if pg_catalog.strpos(src,anchor)=0 then raise exception 'Missing v2 archive evidence anchor'; end if;
  execute pg_catalog.replace(src,anchor,
    'new.content_hash,case when new.status=''archived'' then new.revision-1 else new.revision end,');
end $$;
