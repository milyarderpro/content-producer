-- Parenthesize JSON extraction before the JSONB subtraction operator.
do $$ declare d text; needle text:='v_response->''data''-''reservation_token'''; begin
  d:=pg_catalog.pg_get_functiondef('internal.trivia_complete_v5(bigint,text,uuid,jsonb)'::regprocedure);
  if pg_catalog.strpos(d,needle)=0 then raise exception 'UNEXPECTED_COMPLETION_DEFINITION'; end if;
  execute pg_catalog.replace(d,needle,'(v_response->''data'')-''reservation_token''');
end $$;
