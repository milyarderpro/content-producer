-- CR-014: fail closed on NULL transition metadata, preserving v6's null branch.
alter table internal.post_write_history add constraint post_history_lifecycle_metadata_not_null check(
 operation_name in ('save_post','revise_post','reschedule_post') or
 (prior_status is not null and prior_revision is not null and prior_content_hash is not null));
do $$ declare src text; anchor text:='if p.id is null or l.id is null'; begin
 src:=pg_catalog.pg_get_functiondef('internal.lifecycle_history_validate_v1(internal.post_write_history)'::regprocedure);
 if pg_catalog.strpos(src,anchor)=0 then raise exception 'Missing lifecycle metadata anchor'; end if;
 execute pg_catalog.replace(src,anchor,$edit$if h.prior_status is null or h.prior_revision is null or h.prior_content_hash is null
   or internal.lifecycle_evidence_history_valid_v1(h) is distinct from true
   or p.id is null or l.id is null$edit$);
end $$;
create function internal.lifecycle_evidence_history_valid_v1(h internal.post_write_history) returns boolean
language plpgsql stable security invoker set search_path='' as $$
declare s jsonb:=h.before_evidence->'system_checks'; e jsonb:=h.before_evidence->'editorial_checks'; a jsonb:=h.before_evidence->'approval_snapshot';
begin
 if internal.has_exact_json_keys(h.before_evidence,array['system_checks','editorial_checks','approval_snapshot']) is distinct from true
   or pg_catalog.octet_length(h.before_evidence::text)>98304 then return false; end if;
 if (not(h.operation_name='discard_post' and s='{}'::jsonb) and internal.is_valid_system_checks_v1(s,h.prior_content_hash,h.prior_revision) is distinct from true)
   or (not(h.operation_name='discard_post' and e='{}'::jsonb) and internal.is_valid_editorial_checks_v1(e,h.prior_content_hash,h.prior_revision) is distinct from true) then return false; end if;
 if h.prior_status in ('ready','posted') and (pg_catalog.jsonb_typeof(a) is distinct from 'object' or pg_catalog.octet_length(a::text)>32768
   or a->'approved_revision' is distinct from pg_catalog.to_jsonb(h.prior_revision) or a->>'content_hash' is distinct from h.prior_content_hash) then return false; end if;
 return true;
exception when others then return false;
end; $$;
-- Replay also validates historical transition metadata; current business state is
-- intentionally not compared with the historical response.
do $$ declare src text; anchor text:='if h.id is null or l.target_public_id::text'; begin
 src:=pg_catalog.pg_get_functiondef('internal.lifecycle_replay_v7(bigint,text)'::regprocedure);
 if pg_catalog.strpos(src,anchor)=0 then raise exception 'Missing lifecycle replay metadata anchor'; end if;
 execute pg_catalog.replace(src,anchor,$edit$if h.prior_revision is null or h.prior_status is null or h.prior_content_hash is null
   or h.response#>'{data,revision}' is distinct from pg_catalog.to_jsonb(h.prior_revision+1)
   or internal.lifecycle_evidence_history_valid_v1(h) is distinct from true
   or ((name='approve_post' and h.prior_status='draft') or (name='revoke_post_approval' and h.prior_status='ready')
     or (name='discard_post' and h.prior_status in ('draft','ready')) or (name='mark_post_posted' and h.prior_status='ready')
     or (name='archive_post' and h.prior_status='posted')) is distinct from true
   or h.id is null or l.target_public_id::text$edit$);
end $$;
-- Preserve every published field, not merely copy/evidence, on archive.
do $$ declare src text; anchor text:='if old.status not in (''posted'',''archived'')'; begin
 src:=pg_catalog.pg_get_functiondef('internal.lifecycle_archive_guard_v1()'::regprocedure);
 if pg_catalog.strpos(src,anchor)=0 then raise exception 'Missing archive immutable field anchor'; end if;
 execute pg_catalog.replace(src,anchor,$edit$if (pg_catalog.to_jsonb(new)-array['status','revision','archived_at','updated_at'])
     is distinct from (pg_catalog.to_jsonb(old)-array['status','revision','archived_at','updated_at'])
     or (old.status='archived' and new.archived_at is distinct from old.archived_at)
     or old.status not in ('posted','archived')$edit$);
end $$;
grant create on schema internal to content_producer_api_owner;
alter function internal.lifecycle_evidence_history_valid_v1(internal.post_write_history) owner to content_producer_api_owner;
revoke all on function internal.lifecycle_evidence_history_valid_v1(internal.post_write_history) from public,anon,authenticated,service_role;
revoke create on schema internal from content_producer_api_owner;
