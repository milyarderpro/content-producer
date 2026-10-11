-- PL/pgSQL WHEN OTHERS deliberately excludes query_canceled. Map that condition
-- explicitly in each public entry point; the enclosing block rolls back the
-- ledger, events and business writes before exposing the safe retryable code.
do $$
declare v_function regprocedure; v_source text; v_old text;
begin
  for v_function in select p.oid::regprocedure from pg_catalog.pg_proc p
    join pg_catalog.pg_namespace n on n.oid=p.pronamespace where n.nspname='api' and p.proname=any(array[
      'claim_content_plan_items','renew_content_plan_claim','report_content_plan_item_failure',
      'retry_content_plan_item','replace_discarded_plan_item','cancel_content_plan'])
  loop
    v_source:=pg_catalog.pg_get_functiondef(v_function);
    v_old:='exception when others then';
    if pg_catalog.strpos(v_source,v_old)=0 then raise exception 'Missing cancellation handler anchor'; end if;
    v_source:=pg_catalog.replace(v_source,v_old,$edit$exception when query_canceled then
  raise exception using errcode='P0001',message='DATABASE_BUSY';
when others then$edit$);
    execute v_source;
  end loop;
end;
$$;
revoke all on all functions in schema api from public,anon,service_role;
