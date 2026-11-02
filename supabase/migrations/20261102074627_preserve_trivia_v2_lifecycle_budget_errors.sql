-- P5 current budget failures remain actionable at the shared RPC boundary.
do $$ declare src text; anchor text:='if message=any(array[';
begin
  src:=pg_catalog.pg_get_functiondef('internal.lifecycle_raise_v1(text,text)'::regprocedure);
  if pg_catalog.strpos(src,anchor)=0 then raise exception 'Missing lifecycle safe error allowlist'; end if;
  execute pg_catalog.replace(src,anchor,anchor||'''CONTENT_BUDGET_EXCEEDED'',');
end $$;
