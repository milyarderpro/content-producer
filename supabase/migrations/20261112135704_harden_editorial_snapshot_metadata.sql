-- CR-062 task5: reject null/absent descriptive metadata in stored snapshot3.
-- This does not change valid server-built snapshots or the config1 branch.
do $$ declare src text; anchor text; replacement text; begin
  src:=pg_catalog.pg_get_functiondef('internal.post_generation_config2_valid_v2(jsonb)'::regprocedure);
  anchor:='if octet_length(s::text)>131072';
  if pg_catalog.strpos(src,anchor)=0 then raise exception 'Missing snapshot size anchor'; end if;
  src:=pg_catalog.replace(src,anchor,'if (octet_length(s::text)>131072');
  anchor:=$old$or s#>'{cta,actions}' is distinct from ctx->'cta_actions' then return false; end if;$old$;
  replacement:=$new$or s#>'{cta,actions}' is distinct from ctx->'cta_actions'
    or jsonb_typeof(s#>'{editorial_definitions,topic,payload}') is distinct from 'object'
    or not (coalesce(rules#>'{format_guidance,architectures}','[]'::jsonb) ? (ctx->>'architecture'))
    or not (rules->'allowed_formats' ? (s#>>'{editorial_definitions,format,key}'))
    or not (rules->'allowed_topics' ? (s#>>'{editorial_definitions,topic,key}'))
    ) is distinct from false then return false; end if;$new$;
  if pg_catalog.strpos(src,anchor)=0 then raise exception 'Missing snapshot CTA anchor'; end if;
  src:=pg_catalog.replace(src,anchor,replacement);
  anchor:=$old$or d->>'key' !~ '^[a-z][a-z0-9_]{1,49}$' then return false; end if;$old$;
  replacement:=$new$or jsonb_typeof(d->'key') is distinct from 'string'
      or d->>'key' !~ '^[a-z][a-z0-9_]{1,49}$' then return false; end if;$new$;
  if pg_catalog.strpos(src,anchor)=0 then raise exception 'Missing definition key anchor'; end if;
  src:=pg_catalog.replace(src,anchor,replacement);
  execute src;
end $$;
