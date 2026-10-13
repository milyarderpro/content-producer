-- CR-016 / P2-01: explicit approval alone establishes passed. Historical response
-- validators retain the old passed draft shape; no ledger/history response is rewritten.
create or replace function internal.post_quality_v1(s jsonb,e jsonb) returns text
language sql immutable security invoker set search_path='' as $$
  select case when s->>'overall_status'<>'passed' or e->>'overall_status'<>'pass'
    or exists(select 1 from pg_catalog.jsonb_array_elements(e->'criteria') c where c->>'status'<>'pass')
    then 'failed' else 'pending' end;
$$;

-- Administrative, single-purpose migration repair, not an API/business helper.
-- It remains invoker-owned by the migration executor and is not granted to API owner.
create function internal.normalize_unapproved_drafts_v1() returns integer
language plpgsql security invoker set search_path='' as $$
declare w record; p public.posts; changed integer:=0;
begin
  if current_user<>'postgres' then raise exception 'ADMINISTRATIVE_REPAIR_ONLY'; end if;
  perform pg_catalog.set_config('lock_timeout','2s',true);
  for w in select ww.id from public.workspaces ww where exists(select 1 from public.posts pp
    where pp.workspace_id=ww.id and pp.status='draft' and pp.quality_status='passed' and pp.approval_snapshot is null)
    order by ww.id for no key update loop
    perform 1 from public.pages pg where pg.workspace_id=w.id and exists(select 1 from public.posts pp
      where pp.workspace_id=w.id and pp.page_id=pg.id and pp.status='draft' and pp.quality_status='passed'
      and pp.approval_snapshot is null) order by pg.id for update;
    perform 1 from public.content_plans cp where cp.workspace_id=w.id and exists(
      select 1 from public.content_plan_items ci join public.posts pp on pp.content_plan_item_id=ci.id
      where ci.plan_id=cp.id and pp.workspace_id=w.id and pp.status='draft' and pp.quality_status='passed'
      and pp.approval_snapshot is null) order by cp.id for update;
    perform 1 from public.content_plan_items ci where ci.workspace_id=w.id and exists(select 1 from public.posts pp
      where pp.content_plan_item_id=ci.id and pp.workspace_id=w.id and pp.status='draft' and pp.quality_status='passed'
      and pp.approval_snapshot is null) order by ci.id for update;
    for p in select pp.* from public.posts pp where pp.workspace_id=w.id and pp.status='draft'
      and pp.quality_status='passed' and pp.approval_snapshot is null order by pp.id for update loop
      if (p.system_checks<>'{}'::jsonb and internal.is_valid_system_checks_v1(p.system_checks,p.content_hash,p.revision) is distinct from true)
        or (p.editorial_checks<>'{}'::jsonb and internal.is_valid_editorial_checks_v1(p.editorial_checks,p.content_hash,p.revision) is distinct from true) then
        raise exception 'QUALITY_EVIDENCE_STALE'; end if;
      update public.posts pp set quality_status=internal.post_quality_v1(p.system_checks,p.editorial_checks),
        revision=p.revision+1,system_checks=internal.lifecycle_rebind_v1(p.system_checks,p.revision+1),
        editorial_checks=internal.lifecycle_rebind_v1(p.editorial_checks,p.revision+1)
        where pp.id=p.id and pp.status='draft' and pp.quality_status='passed' and pp.approval_snapshot is null;
      if found then changed:=changed+1; end if;
    end loop;
  end loop;
  return changed;
end; $$;
revoke all on function internal.normalize_unapproved_drafts_v1()
  from public,anon,authenticated,service_role,content_producer_api_owner;
do $$ declare n integer; begin
  n:=internal.normalize_unapproved_drafts_v1();
  raise notice 'CR-016 normalized % unapproved passed drafts; immutable replay preserved',n;
end $$;
