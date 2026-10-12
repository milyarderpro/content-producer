-- CR-014: exactly five explicit, individually allowlisted lifecycle operations.
create function api.approve_post(p_request_schema_version integer,p_workspace_public_id uuid,p_operation_key uuid,p_post_public_id uuid,
 p_expected_revision integer,p_expected_content_hash text,p_explicit_approval boolean,p_accepted_warning_ids text[],p_warning_acceptance_reason text default null)
returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare o record; p public.posts; old public.posts; ctx record; ids text[]; reason text; s jsonb; e jsonb; at_time timestamptz; state text; message text;
begin
 select * into ctx from internal.assert_request_context_v1();
 perform internal.plan_assert_write_input_v1(p_request_schema_version,p_workspace_public_id,p_operation_key,p_post_public_id);
 if p_expected_revision is null or p_expected_revision<1 or p_expected_content_hash is null or p_expected_content_hash !~ '^[0-9a-f]{64}$' then
   raise exception using errcode='P0001',message='VALIDATION_FAILED'; end if;
 if p_explicit_approval is distinct from true then raise exception using errcode='P0001',message='APPROVAL_REQUIRED'; end if;
 ids:=internal.lifecycle_ids_v1(p_accepted_warning_ids); reason:=internal.lifecycle_reason_v1(ids,p_warning_acceptance_reason);
 select * into o from internal.claim_operation_for_owner_v1(p_workspace_public_id,p_operation_key,'approve_post',1,
   pg_catalog.jsonb_build_object('post_public_id',p_post_public_id,'expected_revision',p_expected_revision,'expected_content_hash',p_expected_content_hash,
     'explicit_approval',true,'accepted_warning_ids',ids,'warning_acceptance_reason',reason));
 if o.claim_state='replay' then return internal.lifecycle_replay_v7(o.operation_id,'approve_post'); end if;
 perform internal.trivia_lock_workspace_v1(o.workspace_id); p:=internal.post_lock_target_v1(o.workspace_id,p_post_public_id); old:=p;
 if p.revision<>p_expected_revision then raise exception using errcode='P0001',message='REVISION_CONFLICT'; end if;
 if p.content_hash<>p_expected_content_hash then raise exception using errcode='P0001',message='CONTENT_HASH_CONFLICT'; end if;
 if p.status<>'draft' then raise exception using errcode='P0001',message='INVALID_STATUS_TRANSITION'; end if;
 perform internal.post_lock_facts_v1(o.workspace_id,'{}',p.id); perform internal.lifecycle_evidence_v1(p);
 s:=internal.lifecycle_current_system_v1(p);
 perform internal.lifecycle_effective_gate_v1(s,p.editorial_checks,p.generation_snapshot,ids,reason);
 e:=internal.lifecycle_rebind_v1(p.editorial_checks,p.revision+1); at_time:=pg_catalog.clock_timestamp();
 update public.posts set status='ready',revision=p.revision+1,quality_status='passed',ready_at=at_time,system_checks=s,editorial_checks=e,
   approval_snapshot=pg_catalog.jsonb_build_object('schema_version',1,'approved_by_user_id',ctx.actor_user_id,'approved_at',internal.iso_timestamp_v1(at_time),
     'approved_revision',p.revision+1,'content_hash',p.content_hash,'operation_id',o.operation_id,'accepted_warning_ids',ids,'warning_acceptance_reason',reason)
   where id=p.id and workspace_id=o.workspace_id returning * into p;
 return internal.lifecycle_complete_v7(o.operation_id,'approve_post',p,old,reason);
exception when query_canceled then perform internal.lifecycle_raise_v1('57014','');
 when others then get stacked diagnostics state=returned_sqlstate,message=message_text; perform internal.lifecycle_raise_v1(state,message);
end; $$;

create function api.revoke_post_approval(p_request_schema_version integer,p_workspace_public_id uuid,p_operation_key uuid,p_post_public_id uuid,
 p_expected_revision integer,p_expected_content_hash text,p_reason text,p_explicit_revocation boolean)
returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare o record; p public.posts; old public.posts; reason text:=pg_catalog.btrim(p_reason); state text; message text;
begin
 perform internal.assert_request_context_v1(); perform internal.plan_assert_write_input_v1(p_request_schema_version,p_workspace_public_id,p_operation_key,p_post_public_id);
 if p_expected_revision is null or p_expected_revision<1 or p_expected_content_hash is null or p_expected_content_hash !~ '^[0-9a-f]{64}$'
   or p_explicit_revocation is distinct from true or internal.plan_safe_reason_v1(reason) is distinct from true then
   raise exception using errcode='P0001',message='VALIDATION_FAILED'; end if;
 select * into o from internal.claim_operation_for_owner_v1(p_workspace_public_id,p_operation_key,'revoke_post_approval',1,
   pg_catalog.jsonb_build_object('post_public_id',p_post_public_id,'expected_revision',p_expected_revision,'expected_content_hash',p_expected_content_hash,
     'reason',reason,'explicit_revocation',true));
 if o.claim_state='replay' then return internal.lifecycle_replay_v7(o.operation_id,'revoke_post_approval'); end if;
 perform internal.trivia_lock_workspace_v1(o.workspace_id); p:=internal.post_lock_target_v1(o.workspace_id,p_post_public_id); old:=p;
 if p.revision<>p_expected_revision then raise exception using errcode='P0001',message='REVISION_CONFLICT'; end if;
 if p.content_hash<>p_expected_content_hash then raise exception using errcode='P0001',message='CONTENT_HASH_CONFLICT'; end if;
 if p.status<>'ready' then raise exception using errcode='P0001',message='INVALID_STATUS_TRANSITION'; end if;
 perform internal.post_lock_facts_v1(o.workspace_id,'{}',p.id); perform internal.lifecycle_evidence_v1(p); perform internal.lifecycle_approval_v1(p);
 update public.posts set status='draft',revision=p.revision+1,quality_status='pending',ready_at=null,approval_snapshot=null,
   system_checks=internal.lifecycle_rebind_v1(p.system_checks,p.revision+1),editorial_checks=internal.lifecycle_rebind_v1(p.editorial_checks,p.revision+1)
   where id=p.id and workspace_id=o.workspace_id returning * into p;
 return internal.lifecycle_complete_v7(o.operation_id,'revoke_post_approval',p,old,reason);
exception when query_canceled then perform internal.lifecycle_raise_v1('57014','');
 when others then get stacked diagnostics state=returned_sqlstate,message=message_text; perform internal.lifecycle_raise_v1(state,message);
end; $$;

create function api.discard_post(p_request_schema_version integer,p_workspace_public_id uuid,p_operation_key uuid,p_post_public_id uuid,
 p_expected_revision integer,p_reason text,p_explicit_discard boolean)
returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare o record; p public.posts; old public.posts; reason text:=pg_catalog.btrim(p_reason); at_time timestamptz; state text; message text;
begin
 perform internal.assert_request_context_v1(); perform internal.plan_assert_write_input_v1(p_request_schema_version,p_workspace_public_id,p_operation_key,p_post_public_id);
 if p_expected_revision is null or p_expected_revision<1 or p_explicit_discard is distinct from true
   or internal.plan_safe_reason_v1(reason) is distinct from true then raise exception using errcode='P0001',message='VALIDATION_FAILED'; end if;
 select * into o from internal.claim_operation_for_owner_v1(p_workspace_public_id,p_operation_key,'discard_post',1,
   pg_catalog.jsonb_build_object('post_public_id',p_post_public_id,'expected_revision',p_expected_revision,'reason',reason,'explicit_discard',true));
 if o.claim_state='replay' then return internal.lifecycle_replay_v7(o.operation_id,'discard_post'); end if;
 perform internal.trivia_lock_workspace_v1(o.workspace_id); p:=internal.post_lock_target_v1(o.workspace_id,p_post_public_id,null,true); old:=p;
 if p.revision<>p_expected_revision then raise exception using errcode='P0001',message='REVISION_CONFLICT'; end if;
 if p.status not in ('draft','ready') then raise exception using errcode='P0001',message='INVALID_STATUS_TRANSITION'; end if;
 perform internal.post_lock_facts_v1(o.workspace_id,'{}',p.id); perform internal.lifecycle_evidence_v1(p,true);
 if not exists(select 1 from public.trivia_post_facts where post_id=p.id and workspace_id=o.workspace_id and is_current)
   or exists(select 1 from public.trivia_post_facts where post_id=p.id and workspace_id=o.workspace_id and is_current and allocation_state<>'allocated') then
   raise exception using errcode='P0001',message='MODULE_RELATION_INVALID'; end if;
 at_time:=pg_catalog.clock_timestamp();
 update public.trivia_post_facts set allocation_state='released',released_at=at_time
   where post_id=p.id and workspace_id=o.workspace_id and is_current and allocation_state='allocated';
 update public.posts set status='discarded',revision=p.revision+1,quality_status='pending',ready_at=null,approval_snapshot=null,discarded_at=at_time,
   system_checks=internal.lifecycle_rebind_v1(p.system_checks,p.revision+1),editorial_checks=internal.lifecycle_rebind_v1(p.editorial_checks,p.revision+1)
   where id=p.id and workspace_id=o.workspace_id returning * into p;
 return internal.lifecycle_complete_v7(o.operation_id,'discard_post',p,old,reason);
exception when query_canceled then perform internal.lifecycle_raise_v1('57014','');
 when others then get stacked diagnostics state=returned_sqlstate,message=message_text; perform internal.lifecycle_raise_v1(state,message);
end; $$;

create function api.mark_post_posted(p_request_schema_version integer,p_workspace_public_id uuid,p_operation_key uuid,p_post_public_id uuid,
 p_expected_revision integer,p_expected_content_hash text,p_published_at timestamptz,p_platform_post_id text,p_published_url text,p_explicit_publication_confirmation boolean)
returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare o record; p public.posts; old public.posts; s jsonb; ids text[]; platform text:=pg_catalog.btrim(p_platform_post_id); state text; message text;
begin
 perform internal.assert_request_context_v1(); perform internal.plan_assert_write_input_v1(p_request_schema_version,p_workspace_public_id,p_operation_key,p_post_public_id);
 if p_expected_revision is null or p_expected_revision<1 or p_expected_content_hash is null or p_expected_content_hash !~ '^[0-9a-f]{64}$'
   or p_explicit_publication_confirmation is distinct from true or p_published_at is null or not pg_catalog.isfinite(p_published_at)
   or (platform is not null and (pg_catalog.char_length(platform) not between 1 and 200 or platform ~ '[[:cntrl:]]'))
   or internal.lifecycle_url_v1(p_published_url) is distinct from true then raise exception using errcode='P0001',message='VALIDATION_FAILED'; end if;
 select * into o from internal.claim_operation_for_owner_v1(p_workspace_public_id,p_operation_key,'mark_post_posted',1,
   pg_catalog.jsonb_build_object('post_public_id',p_post_public_id,'expected_revision',p_expected_revision,'expected_content_hash',p_expected_content_hash,
     'published_at',internal.iso_timestamp_v1(p_published_at),'platform_post_id',platform,'published_url',p_published_url,'explicit_publication_confirmation',true));
 if o.claim_state='replay' then return internal.lifecycle_replay_v7(o.operation_id,'mark_post_posted'); end if;
 perform internal.trivia_lock_workspace_v1(o.workspace_id); p:=internal.post_lock_target_v1(o.workspace_id,p_post_public_id); old:=p;
 if p.revision<>p_expected_revision then raise exception using errcode='P0001',message='REVISION_CONFLICT'; end if;
 if p.content_hash<>p_expected_content_hash then raise exception using errcode='P0001',message='CONTENT_HASH_CONFLICT'; end if;
 if p.status<>'ready' then raise exception using errcode='P0001',message='INVALID_STATUS_TRANSITION'; end if;
 perform internal.post_lock_facts_v1(o.workspace_id,'{}',p.id); perform internal.lifecycle_evidence_v1(p); perform internal.lifecycle_approval_v1(p);
 s:=internal.lifecycle_current_system_v1(p);
 select coalesce(pg_catalog.array_agg(value#>>'{}' order by value#>>'{}'),'{}') into ids from pg_catalog.jsonb_array_elements(p.approval_snapshot->'accepted_warning_ids');
 perform internal.lifecycle_effective_gate_v1(s,p.editorial_checks,p.generation_snapshot,ids,p.approval_snapshot->>'warning_acceptance_reason',false);
 update public.trivia_post_facts set allocation_state='published',published_at=p_published_at
   where post_id=p.id and workspace_id=o.workspace_id and is_current and allocation_state='allocated';
 update public.posts set status='posted',revision=p.revision+1,published_at=p_published_at,platform_post_id=platform,published_url=p_published_url,
   system_checks=s,editorial_checks=internal.lifecycle_rebind_v1(p.editorial_checks,p.revision+1),
   approval_snapshot=pg_catalog.jsonb_set(p.approval_snapshot,'{approved_revision}',pg_catalog.to_jsonb(p.revision+1))
   where id=p.id and workspace_id=o.workspace_id returning * into p;
 return internal.lifecycle_complete_v7(o.operation_id,'mark_post_posted',p,old);
exception when query_canceled then perform internal.lifecycle_raise_v1('57014','');
 when others then get stacked diagnostics state=returned_sqlstate,message=message_text; perform internal.lifecycle_raise_v1(state,message);
end; $$;

create function api.archive_post(p_request_schema_version integer,p_workspace_public_id uuid,p_operation_key uuid,p_post_public_id uuid,
 p_expected_revision integer,p_reason text,p_explicit_archive boolean)
returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare o record; p public.posts; old public.posts; reason text:=pg_catalog.btrim(p_reason); state text; message text;
begin
 perform internal.assert_request_context_v1(); perform internal.plan_assert_write_input_v1(p_request_schema_version,p_workspace_public_id,p_operation_key,p_post_public_id);
 if p_expected_revision is null or p_expected_revision<1 or p_explicit_archive is distinct from true
   or internal.plan_safe_reason_v1(reason) is distinct from true then raise exception using errcode='P0001',message='VALIDATION_FAILED'; end if;
 select * into o from internal.claim_operation_for_owner_v1(p_workspace_public_id,p_operation_key,'archive_post',1,
   pg_catalog.jsonb_build_object('post_public_id',p_post_public_id,'expected_revision',p_expected_revision,'reason',reason,'explicit_archive',true));
 if o.claim_state='replay' then return internal.lifecycle_replay_v7(o.operation_id,'archive_post'); end if;
 perform internal.trivia_lock_workspace_v1(o.workspace_id); p:=internal.post_lock_target_v1(o.workspace_id,p_post_public_id); old:=p;
 if p.revision<>p_expected_revision then raise exception using errcode='P0001',message='REVISION_CONFLICT'; end if;
 if p.status<>'posted' then raise exception using errcode='P0001',message='INVALID_STATUS_TRANSITION'; end if;
 perform internal.post_lock_facts_v1(o.workspace_id,'{}',p.id); perform internal.lifecycle_evidence_v1(p); perform internal.lifecycle_approval_v1(p);
 if exists(select 1 from public.trivia_post_facts where post_id=p.id and workspace_id=o.workspace_id and is_current and allocation_state<>'published') then
   raise exception using errcode='P0001',message='MODULE_RELATION_INVALID'; end if;
 update public.posts set status='archived',revision=p.revision+1,archived_at=pg_catalog.clock_timestamp()
   where id=p.id and workspace_id=o.workspace_id returning * into p;
 return internal.lifecycle_complete_v7(o.operation_id,'archive_post',p,old,reason);
exception when query_canceled then perform internal.lifecycle_raise_v1('57014','');
 when others then get stacked diagnostics state=returned_sqlstate,message=message_text; perform internal.lifecycle_raise_v1(state,message);
end; $$;

grant create on schema api to content_producer_api_owner;
do $$ declare r record; begin
 for r in select p.oid::regprocedure f from pg_catalog.pg_proc p join pg_catalog.pg_namespace n on n.oid=p.pronamespace
   where n.nspname='api' and p.proname in ('approve_post','revoke_post_approval','discard_post','mark_post_posted','archive_post') loop
   execute pg_catalog.format('alter function %s owner to content_producer_api_owner',r.f);
   execute pg_catalog.format('revoke all on function %s from public,anon,authenticated,service_role',r.f);
   execute pg_catalog.format('grant execute on function %s to authenticated',r.f);
 end loop;
end $$;
revoke create on schema api from content_producer_api_owner;
