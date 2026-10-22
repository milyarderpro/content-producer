-- CR-049 / Issue #40: preserve mandatory nested null evidence fields.
-- Repro: jsonb_strip_nulls(jsonb_build_object(... 'source_snapshot', ...))
-- recursively removes numbers[*].unit when its JSON value is null. Strict
-- sourceSnapshot requires that *present* nullable field. Keep top-level
-- omission of source_snapshot for include_sources=false without deep stripping.
-- Keep original RPC signature, grants, SECURITY DEFINER, and owner scope.
do $migration$
declare
  source_definition text;
  open_anchor constant text := 'jsonb_strip_nulls(jsonb_build_object(';
  close_anchor constant text := E'end\n    )) order by usage.position asc, usage.id asc';
begin
  source_definition := pg_catalog.pg_get_functiondef(
    'api.get_post(integer,uuid,uuid,boolean,boolean,boolean)'::pg_catalog.regprocedure
  );
  if pg_catalog.strpos(source_definition, open_anchor) = 0
    or pg_catalog.strpos(source_definition, close_anchor) = 0
    or pg_catalog.strpos(
      pg_catalog.substr(
        source_definition,
        pg_catalog.strpos(source_definition, open_anchor) + pg_catalog.length(open_anchor)
      ),
      open_anchor
    ) <> 0 then
    raise exception 'UNEXPECTED_GET_POST_SOURCE_PROJECTION';
  end if;

  source_definition := pg_catalog.replace(
    source_definition, open_anchor, 'jsonb_build_object('
  );
  source_definition := pg_catalog.replace(
    source_definition,
    close_anchor,
    E'end\n    ) - (case when p_include_sources then '''' else ''source_snapshot'' end) order by usage.position asc, usage.id asc'
  );
  execute source_definition;
end
$migration$;
