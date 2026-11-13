-- CR-062 task4: retain privacy/artifact rules, allow emoji by effective policy.
-- v1 text privacy has an unconditional emoji ban and blocks emoji ZWJ; leave it intact.
create function internal.post_text_config2_v2(p_text text,p_line boolean default true)
returns text language plpgsql immutable security invoker set search_path='' as $$
declare t text;
begin
  if p_text is null then raise exception using errcode='P0001',message='CONTENT_PAYLOAD_INVALID'; end if;
  t:=pg_catalog.normalize(pg_catalog.replace(p_text,E'\r\n',E'\n'),'NFC');
  t:=pg_catalog.regexp_replace(t,E'[ ]+\n',E'\n','g');
  t:=pg_catalog.regexp_replace(t,'^[[:space:]]+|[[:space:]]+$','','g');
  if pg_catalog.replace(pg_catalog.replace(p_text,E'\r\n',E'\n'),E'\n','') ~ '[[:cntrl:]]'
    or (p_line and pg_catalog.strpos(t,E'\n')>0) then
    raise exception using errcode='P0001',message='CONTENT_PAYLOAD_INVALID'; end if;
  if t ~* '(https?://|www\.|```|<[^>]+>|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})'
    or t ~ '(\*\*|__|\[[0-9]+\]|turn[0-9]+search[0-9]+)'
    or t ~ ('['||pg_catalog.chr(8203)||pg_catalog.chr(8204)||pg_catalog.chr(8206)||pg_catalog.chr(8207)
      ||pg_catalog.chr(8234)||'-'||pg_catalog.chr(8238)||pg_catalog.chr(8294)||'-'||pg_catalog.chr(8297)
      ||pg_catalog.chr(65279)||']') then
    raise exception using errcode='P0001',message='CONTENT_PAYLOAD_INVALID'; end if;
  -- U+200D joins emoji sequences; it is preserved and counted, never silently removed.
  return t;
end; $$;

do $$ declare src text; old_name constant text:='internal.post_text_v1'; begin
  src:=pg_catalog.pg_get_functiondef('internal.post_render_config2_v2(jsonb,jsonb,text,jsonb)'::regprocedure);
  if (pg_catalog.length(src)-pg_catalog.length(pg_catalog.replace(src,old_name,'')))/pg_catalog.length(old_name)<>8 then
    raise exception 'Unexpected config2 text call inventory'; end if;
  execute pg_catalog.replace(src,old_name,'internal.post_text_config2_v2');
end $$;
grant create on schema internal to content_producer_api_owner;
alter function internal.post_text_config2_v2(text,boolean) owner to content_producer_api_owner;
revoke all on function internal.post_text_config2_v2(text,boolean) from public,anon,authenticated,service_role;
revoke create on schema internal from content_producer_api_owner;
