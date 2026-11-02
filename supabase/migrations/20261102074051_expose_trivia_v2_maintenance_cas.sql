-- CR-056 accepted Read extension: public maintenance CAS from the same snapshot.
do $$ declare src text; anchor text;
begin
  src:=pg_catalog.pg_get_functiondef('api.trivia_find_similar_facts_v2(integer,uuid,uuid,jsonb)'::regprocedure);
  anchor:='''status'',chosen.verification_status,';
  if pg_catalog.strpos(src,anchor)=0 then raise exception 'Missing v2 match timestamp anchor'; end if;
  src:=pg_catalog.replace(src,anchor,anchor
    ||'''fact_updated_at'',internal.iso_timestamp_v1(chosen.updated_at),');
  anchor:='f.reservation_status, f.reserved_until,';
  if pg_catalog.strpos(src,anchor)=0 then raise exception 'Missing v2 ranked timestamp anchor'; end if;
  execute pg_catalog.replace(src,anchor,anchor||' f.updated_at,');
end $$;
