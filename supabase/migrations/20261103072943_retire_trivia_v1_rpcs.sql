-- CR-059: close the callable trivia v1 surface. Keep all shared internal
-- helpers, v2 RPCs, and version-neutral lifecycle/plan/metrics RPCs intact.
-- Run only after ingress has been quiesced. NOWAIT makes an active reader or
-- writer abort this migration instead of silently racing the cutover.
do $$
declare
  v_expected text[] := array[
    'api.trivia_find_similar_facts(integer,uuid,uuid,jsonb,integer)',
    'api.trivia_register_and_reserve_facts(integer,uuid,uuid,uuid,uuid,timestamp with time zone,text,integer,jsonb)',
    'api.trivia_release_facts(integer,uuid,uuid,uuid,uuid,text)',
    'api.save_post(integer,uuid,uuid,uuid,text,uuid,timestamp with time zone,jsonb,timestamp with time zone,integer,text,text,text,jsonb,jsonb,jsonb,jsonb)',
    'api.revise_post(integer,uuid,uuid,uuid,integer,text,uuid,integer,text,text,text,jsonb,jsonb,jsonb,jsonb,text)',
    'api.trivia_reverify_fact(integer,uuid,uuid,uuid,timestamp with time zone,text,jsonb,text,date,timestamp with time zone,text,text)',
    'api.trivia_correct_fact(integer,uuid,uuid,uuid,timestamp with time zone,text,text,jsonb,boolean)',
    'api.trivia_reverify_fact(integer,uuid,uuid,uuid,text,text,text)',
    'api.trivia_correct_fact(integer,uuid,uuid,uuid,text,text,text,jsonb,boolean,text)'
  ];
  v_signature text;
  v_actual_count integer;
begin
  perform pg_catalog.set_config('lock_timeout', '2s', true);

  select count(*) into v_actual_count
  from pg_catalog.pg_proc p
  join pg_catalog.pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'api' and p.proname in (
    'trivia_find_similar_facts', 'trivia_register_and_reserve_facts',
    'trivia_release_facts', 'save_post', 'revise_post',
    'trivia_reverify_fact', 'trivia_correct_fact');
  if v_actual_count <> 9 then
    raise exception 'Unexpected trivia v1 RPC signature count: %', v_actual_count;
  end if;
  foreach v_signature in array v_expected loop
    if pg_catalog.to_regprocedure(v_signature) is null then
      raise exception 'Missing expected trivia RPC signature: %', v_signature;
    end if;
  end loop;
  if pg_catalog.to_regprocedure('api.trivia_find_similar_facts_v2(integer,uuid,uuid,jsonb)') is null
    or pg_catalog.to_regprocedure('api.save_post_v2(integer,uuid,uuid,uuid,text,uuid,text,text,integer,text,text,text,timestamp with time zone,jsonb,jsonb,jsonb,jsonb)') is null
    or pg_catalog.to_regprocedure('api.revise_post_v2(integer,uuid,uuid,uuid,integer,text,uuid,text,text,integer,text,text,text,jsonb,jsonb,jsonb,text)') is null then
    raise exception 'Trivia v2 RPCs are incomplete; refusing v1 retirement';
  end if;

  execute 'lock table internal.operation_ledger, internal.trivia_reservation_sets,
    public.posts, public.trivia_facts, public.trivia_post_facts
    in access exclusive mode nowait';

  -- RESTRICT refuses to remove a dependency rather than dropping it silently.
  execute 'drop function api.trivia_find_similar_facts(integer,uuid,uuid,jsonb,integer) restrict';
  execute 'drop function api.trivia_register_and_reserve_facts(integer,uuid,uuid,uuid,uuid,timestamp with time zone,text,integer,jsonb) restrict';
  execute 'drop function api.trivia_release_facts(integer,uuid,uuid,uuid,uuid,text) restrict';
  execute 'drop function api.save_post(integer,uuid,uuid,uuid,text,uuid,timestamp with time zone,jsonb,timestamp with time zone,integer,text,text,text,jsonb,jsonb,jsonb,jsonb) restrict';
  execute 'drop function api.revise_post(integer,uuid,uuid,uuid,integer,text,uuid,integer,text,text,text,jsonb,jsonb,jsonb,jsonb,text) restrict';
  execute 'drop function api.trivia_reverify_fact(integer,uuid,uuid,uuid,timestamp with time zone,text,jsonb,text,date,timestamp with time zone,text,text) restrict';
  execute 'drop function api.trivia_correct_fact(integer,uuid,uuid,uuid,timestamp with time zone,text,text,jsonb,boolean) restrict';

  perform pg_catalog.pg_notify('pgrst', 'reload schema');
end $$;
