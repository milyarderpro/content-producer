import { spawnSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';

function localQuery(query: string): void {
  const result = spawnSync('pnpm', ['exec', 'supabase', 'db', 'query', '--local', query], {
    cwd: process.cwd(),
    encoding: 'utf8',
    env: { ...process.env, SUPABASE_TELEMETRY_DISABLED: '1' },
    shell: process.platform === 'win32',
  });

  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`${result.stderr.trim()}\n${result.stdout.trim()}`);
}

describe('Phase 3 content plans and plan items', () => {
  it('enforces scoped plans, schedules, leases, and private privileges', () => {
    const suffix = `${process.pid}${Date.now()}`;

    expect(() =>
      localQuery(`
        do $$
        declare
          owner_one uuid := extensions.gen_random_uuid();
          owner_two uuid := extensions.gen_random_uuid();
          workspace_one bigint;
          workspace_two bigint;
          page_one bigint;
          page_two bigint;
          ledger_one bigint;
          ledger_two bigint;
          plan_one bigint;
          plan_two bigint;
          slot timestamptz := '2026-10-08 12:00:00+00';
        begin
          insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
          values
            ('00000000-0000-0000-0000-000000000000', owner_one, 'authenticated', 'authenticated', 'plan-one-${suffix}@example.test', 'not-used', now(), '{}'::jsonb, '{}'::jsonb, now(), now()),
            ('00000000-0000-0000-0000-000000000000', owner_two, 'authenticated', 'authenticated', 'plan-two-${suffix}@example.test', 'not-used', now(), '{}'::jsonb, '{}'::jsonb, now(), now());
          insert into public.workspaces (owner_user_id, name, slug) values (owner_one, 'Plan one', 'phase3-plan-one-${suffix}') returning id into workspace_one;
          insert into public.workspaces (owner_user_id, name, slug) values (owner_two, 'Plan two', 'phase3-plan-two-${suffix}') returning id into workspace_two;
          insert into public.pages (workspace_id, name, slug) values (workspace_one, 'Plan page one', 'phase3-plan-page-one-${suffix}') returning id into page_one;
          insert into public.pages (workspace_id, name, slug) values (workspace_two, 'Plan page two', 'phase3-plan-page-two-${suffix}') returning id into page_two;
          insert into public.page_niche_configs (workspace_id, page_id, niche_key, config) values (workspace_one, page_one, 'trivia', internal.default_trivia_config_v1());
          insert into public.page_niche_configs (workspace_id, page_id, niche_key, config) values (workspace_two, page_two, 'trivia', internal.default_trivia_config_v1());
          insert into internal.operation_ledger (workspace_id, actor_user_id, operation_key, operation_name, request_schema_version, request_hash)
          values (workspace_one, owner_one, extensions.gen_random_uuid(), 'create_plan.v1', 1, repeat('a', 64)) returning id into ledger_one;
          insert into internal.operation_ledger (workspace_id, actor_user_id, operation_key, operation_name, request_schema_version, request_hash)
          values (workspace_two, owner_two, extensions.gen_random_uuid(), 'create_plan.v1', 1, repeat('b', 64)) returning id into ledger_two;
          insert into public.content_plans (workspace_id, page_id, niche_key, created_by_operation_id, requested_count)
          values (workspace_one, page_one, 'trivia', ledger_one, 3) returning id into plan_one;
          insert into public.content_plan_items (workspace_id, plan_id, page_id, niche_key, position)
          values (workspace_one, plan_one, page_one, 'trivia', 1), (workspace_one, plan_one, page_one, 'trivia', 2), (workspace_one, plan_one, page_one, 'trivia', 3);
          if (select count(*) from public.content_plan_items where plan_id = plan_one) <> 3 then raise exception 'plan items missing'; end if;
          begin insert into public.content_plan_items (workspace_id, plan_id, page_id, niche_key, position) values (workspace_one, plan_one, page_one, 'trivia', 1); raise exception 'duplicate position accepted'; exception when unique_violation then null; end;
          begin insert into public.content_plan_items (workspace_id, plan_id, page_id, niche_key, position) values (workspace_two, plan_one, page_two, 'trivia', 4); raise exception 'cross-workspace item accepted'; exception when foreign_key_violation then null; end;
          begin insert into public.content_plans (workspace_id, page_id, niche_key, created_by_operation_id, requested_count) values (workspace_two, page_two, 'trivia', ledger_one, 1); raise exception 'cross-workspace audit accepted'; exception when foreign_key_violation then null; end;
          begin insert into public.content_plans (workspace_id, page_id, niche_key, requested_count) values (workspace_one, page_one, 'trivia', 0); raise exception 'zero count accepted'; exception when check_violation then null; end;
          begin insert into public.content_plans (workspace_id, page_id, niche_key, requested_count, plan_config) values (workspace_one, page_one, 'trivia', 1, '[]'::jsonb); raise exception 'array plan config accepted'; exception when check_violation then null; end;
          begin insert into public.content_plans (workspace_id, page_id, niche_key, requested_count, config_schema_version) values (workspace_one, page_one, 'trivia', 1, 0); raise exception 'zero plan schema accepted'; exception when check_violation then null; end;
          insert into public.content_plans (workspace_id, page_id, niche_key, requested_count) values (workspace_two, page_two, 'trivia', 1) returning id into plan_two;
          insert into public.content_plan_items (workspace_id, plan_id, page_id, niche_key, position, scheduled_at) values (workspace_one, plan_one, page_one, 'trivia', 4, slot);
          begin insert into public.content_plan_items (workspace_id, plan_id, page_id, niche_key, position, scheduled_at) values (workspace_one, plan_one, page_one, 'trivia', 5, slot); raise exception 'duplicate schedule accepted'; exception when unique_violation then null; end;
          update public.content_plan_items set status = 'cancelled' where plan_id = plan_one and position = 4;
          insert into public.content_plan_items (workspace_id, plan_id, page_id, niche_key, position, scheduled_at) values (workspace_one, plan_one, page_one, 'trivia', 5, slot);
          insert into public.content_plan_items (workspace_id, plan_id, page_id, niche_key, position, status, claim_token, claimed_at, claim_expires_at, claim_renewal_count) values (workspace_one, plan_one, page_one, 'trivia', 6, 'in_progress', extensions.gen_random_uuid(), now(), now() + interval '1 minute', 0);
          begin insert into public.content_plan_items (workspace_id, plan_id, page_id, niche_key, position, status) values (workspace_one, plan_one, page_one, 'trivia', 7, 'in_progress'); raise exception 'incomplete claim accepted'; exception when check_violation then null; end;
          begin insert into public.content_plan_items (workspace_id, plan_id, page_id, niche_key, position, claim_token) values (workspace_one, plan_one, page_one, 'trivia', 7, extensions.gen_random_uuid()); raise exception 'claim on pending accepted'; exception when check_violation then null; end;
          begin insert into public.content_plan_items (workspace_id, plan_id, page_id, niche_key, position, status, claim_token, claimed_at, claim_expires_at, claim_renewal_count) values (workspace_one, plan_one, page_one, 'trivia', 7, 'in_progress', extensions.gen_random_uuid(), now(), now(), 0); raise exception 'invalid expiry accepted'; exception when check_violation then null; end;
          begin insert into public.content_plan_items (workspace_id, plan_id, page_id, niche_key, position, status, claim_token, claimed_at, claim_expires_at, claim_renewal_count) values (workspace_one, plan_one, page_one, 'trivia', 7, 'in_progress', extensions.gen_random_uuid(), now(), now() + interval '1 minute', 2); raise exception 'invalid renewal accepted'; exception when check_violation then null; end;
          begin insert into public.content_plan_items (workspace_id, plan_id, page_id, niche_key, position) values (workspace_one, plan_one, page_one, 'trivia', 0); raise exception 'zero position accepted'; exception when check_violation then null; end;
          begin insert into public.content_plan_items (workspace_id, plan_id, page_id, niche_key, position, attempt_count) values (workspace_one, plan_one, page_one, 'trivia', 7, -1); raise exception 'negative attempts accepted'; exception when check_violation then null; end;
          begin insert into public.content_plan_items (workspace_id, plan_id, page_id, niche_key, position, item_config) values (workspace_one, plan_one, page_one, 'trivia', 7, '[]'::jsonb); raise exception 'array item config accepted'; exception when check_violation then null; end;
          begin insert into public.content_plan_items (workspace_id, plan_id, page_id, niche_key, position, created_by_operation_id) values (workspace_one, plan_one, page_one, 'trivia', 7, ledger_two); raise exception 'cross-workspace item audit accepted'; exception when foreign_key_violation then null; end;
          begin insert into public.content_plan_items (workspace_id, plan_id, page_id, niche_key, position, status) values (workspace_one, plan_one, page_one, 'trivia', 6, 'unknown'); raise exception 'invalid status accepted'; exception when check_violation then null; end;
          begin insert into public.content_plan_items (workspace_id, plan_id, page_id, niche_key, position, interaction_goal) values (workspace_one, plan_one, page_one, 'trivia', 6, 'click'); raise exception 'invalid interaction accepted'; exception when check_violation then null; end;
          if not (select relrowsecurity from pg_class where oid = 'public.content_plans'::regclass) then raise exception 'plans RLS disabled'; end if;
          if not (select relrowsecurity from pg_class where oid = 'public.content_plan_items'::regclass) then raise exception 'items RLS disabled'; end if;
          if has_table_privilege('authenticated', 'public.content_plans', 'select') or has_table_privilege('service_role', 'public.content_plan_items', 'select') then raise exception 'caller table privilege'; end if;
          delete from public.content_plan_items where plan_id in (plan_one, plan_two);
          delete from public.content_plans where id in (plan_one, plan_two);
          delete from internal.operation_ledger where id in (ledger_one, ledger_two);
          delete from public.page_niche_configs where page_id in (page_one, page_two);
          delete from public.pages where id in (page_one, page_two);
          delete from public.workspaces where id in (workspace_one, workspace_two);
          delete from auth.users where id in (owner_one, owner_two);
        end $$;
      `),
    ).not.toThrow();
  }, 60_000);
});
