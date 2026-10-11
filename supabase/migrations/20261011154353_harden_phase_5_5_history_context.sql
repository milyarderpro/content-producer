-- Explicitly correlate every history policy reference to the inserted row.
drop policy trivia_reservation_sets_api_owner_insert on internal.trivia_reservation_sets;
create policy trivia_reservation_sets_api_owner_insert on internal.trivia_reservation_sets
for insert to content_producer_api_owner with check (
  trivia_reservation_sets.actor_user_id=(select internal.request_actor_user_id_v1())
  and exists(select 1 from public.workspaces w where w.id=trivia_reservation_sets.workspace_id and w.is_active
    and w.owner_user_id=(select internal.request_actor_user_id_v1()))
  and exists(select 1 from internal.operation_ledger l where l.id=trivia_reservation_sets.operation_id
    and l.workspace_id=trivia_reservation_sets.workspace_id and l.actor_user_id=trivia_reservation_sets.actor_user_id
    and l.request_hash=trivia_reservation_sets.request_hash and l.operation_name='trivia_register_and_reserve_facts')
);
create function internal.trivia_history_ids_valid_v1(p_ids uuid[]) returns boolean
language sql immutable security invoker set search_path='' as $$
  select p_ids is not null and pg_catalog.cardinality(p_ids) between 1 and 9
    and (select count(distinct id) from pg_catalog.unnest(p_ids) id)=pg_catalog.cardinality(p_ids)
    and not exists(select 1 from pg_catalog.unnest(p_ids) id where id is null
      or id::text !~ '^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$');
$$;
grant create on schema internal to content_producer_api_owner;
alter function internal.trivia_history_ids_valid_v1(uuid[]) owner to content_producer_api_owner;
revoke create on schema internal from content_producer_api_owner;
revoke all on function internal.trivia_history_ids_valid_v1(uuid[]) from public,anon,authenticated,service_role;
alter table internal.trivia_reservation_sets add constraint trivia_history_ordered_ids_check
check(internal.trivia_history_ids_valid_v1(ordered_fact_public_ids));
