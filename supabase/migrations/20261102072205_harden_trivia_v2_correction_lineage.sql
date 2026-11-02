-- The shared lineage constraint records the reason on successor and predecessor.
do $$ declare src text; anchor text;
begin
  src:=pg_catalog.pg_get_functiondef('api.trivia_correct_fact(integer,uuid,uuid,uuid,text,text,text,jsonb,boolean,text)'::regprocedure);
  anchor:='risk_class,supersedes_fact_id)';
  if pg_catalog.strpos(src,anchor)=0 then raise exception 'Missing successor lineage columns'; end if;
  src:=pg_catalog.replace(src,anchor,'risk_class,supersedes_fact_id,correction_reason,corrected_at)');
  anchor:='null,null,null,null,null,null,null,null,null,null,null,null,null,f.id)';
  if pg_catalog.strpos(src,anchor)=0 then raise exception 'Missing successor lineage values'; end if;
  execute pg_catalog.replace(src,anchor,
    'null,null,null,null,null,null,null,null,null,null,null,null,null,f.id,'
    ||'pg_catalog.btrim(p_correction_reason),pg_catalog.clock_timestamp())');
end $$;

-- A corrected draft can still be discarded explicitly, preserving failed
-- evidence in history. It cannot be approved using this maintenance exception.
create or replace function internal.lifecycle_evidence_v1(p public.posts,empty_allowed boolean default false)
returns void language plpgsql stable security invoker set search_path='' as $$
begin
  if p.content_schema_version=2 then
    if empty_allowed and p.status='draft' and p.quality_status='failed'
      and p.editorial_checks='{}'::jsonb
      and p.system_checks->>'overall_status'='failed'
      and internal.is_valid_system_checks_v1(p.system_checks,p.content_hash,p.revision) is true then
      return;
    end if;
    if internal.post_evidence_valid_v2(p.system_checks,p.content_hash,p.revision,false) is distinct from true
      or internal.post_evidence_valid_v2(p.editorial_checks,p.content_hash,p.revision,true) is distinct from true then
      raise exception using errcode='P0001',message='QUALITY_EVIDENCE_STALE'; end if;
    return;
  end if;
  if (not(empty_allowed and p.system_checks='{}') and internal.is_valid_system_checks_v1(p.system_checks,p.content_hash,p.revision) is distinct from true)
    or (not(empty_allowed and p.editorial_checks='{}') and internal.is_valid_editorial_checks_v1(p.editorial_checks,p.content_hash,p.revision) is distinct from true) then
    raise exception using errcode='P0001',message='QUALITY_EVIDENCE_STALE'; end if;
end $$;

do $$ declare src text; anchor text;
begin
  src:=pg_catalog.pg_get_functiondef('api.discard_post(integer,uuid,uuid,uuid,integer,text,boolean)'::regprocedure);
  anchor:='if p.content_schema_version=2 then '
    ||'if internal.post_evidence_valid_v2(p.system_checks,p.content_hash,p.revision,false) '
    ||'is distinct from true or internal.post_evidence_valid_v2('
    ||'p.editorial_checks,p.content_hash,p.revision,true) is distinct from true '
    ||'then raise exception using errcode=''P0001'',message=''EVIDENCE_INVALID''; end if; '
    ||'else perform internal.lifecycle_evidence_v1(p,true); end if;';
  if pg_catalog.strpos(src,anchor)=0 then raise exception 'Missing discard version evidence guard'; end if;
  execute pg_catalog.replace(src,anchor,'perform internal.lifecycle_evidence_v1(p,true);');
  src:=pg_catalog.pg_get_functiondef('internal.validate_post_row()'::regprocedure);
  anchor:='or (new.quality_status=''failed'' and new.status=''draft''';
  if pg_catalog.strpos(src,anchor)=0 then raise exception 'Missing corrected v2 row guard'; end if;
  execute pg_catalog.replace(src,anchor,
    'or ((new.quality_status=''failed'' and new.status=''draft'' '
    ||'or new.status=''discarded'' and new.quality_status=''pending'' and new.published_at is null)');
end $$;
