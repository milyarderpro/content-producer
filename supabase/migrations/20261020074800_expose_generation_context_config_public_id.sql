-- CR-046: additive Page generation-context projection repair.
-- Preserve the audited owner-scoped function body, SECURITY DEFINER, signature,
-- grants and all other fields. This patch fails closed on unexpected SQL drift.
do $cr046$
declare
  v_function oid := pg_catalog.to_regprocedure(
    'api.get_page_generation_context(integer,uuid,uuid,text,integer,text,text,text,timestamp with time zone)'
  );
  v_definition text;
  v_anchor constant text := '''config'', v_page.config,';
begin
  if v_function is null then
    raise exception 'CR046_MISSING_GENERATION_CONTEXT_FUNCTION';
  end if;

  v_definition := pg_catalog.pg_get_functiondef(v_function);
  if pg_catalog.strpos(v_definition, 'config.public_id as config_public_id') = 0 then
    raise exception 'CR046_SOURCE_CONFIGURATION_ID_NOT_SELECTED';
  end if;
  if pg_catalog.length(v_definition) - pg_catalog.length(pg_catalog.replace(v_definition, v_anchor, ''))
      <> pg_catalog.length(v_anchor) then
    raise exception 'CR046_UNEXPECTED_GENERATION_CONTEXT_PROJECTION';
  end if;

  -- This is the only change to the existing versioned response: the actual
  -- config row ID selected by the Page+niche/owner-scoped read.
  v_definition := pg_catalog.replace(
    v_definition,
    v_anchor,
    '''config_public_id'', v_page.config_public_id, ' || v_anchor
  );
  execute v_definition;
end;
$cr046$;
