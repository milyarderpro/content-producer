import { spawn, spawnSync } from 'node:child_process';

import { describe, expect, it } from 'vitest';

function query(sql: string): string {
  const result = spawnSync('pnpm', ['exec', 'supabase', 'db', 'query', '--local', sql], {
    cwd: process.cwd(),
    encoding: 'utf8',
    env: { ...process.env, SUPABASE_TELEMETRY_DISABLED: '1' },
  });

  if (result.status !== 0) throw new Error(`${result.stderr}\n${result.stdout}`);
  return result.stdout;
}

function queryRows(sql: string): Array<Record<string, unknown>> {
  const response = JSON.parse(query(sql)) as { rows: Array<Record<string, unknown>> };
  return response.rows;
}

function concurrentQuery(sql: string): Promise<number | null> {
  return new Promise((resolve, reject) => {
    const child = spawn(
      'pnpm',
      ['exec', 'supabase', 'db', 'query', '--local', '--output-format', 'json', sql],
      {
        cwd: process.cwd(),
        env: { ...process.env, SUPABASE_TELEMETRY_DISABLED: '1' },
      },
    );
    child.once('error', reject);
    child.once('close', resolve);
  });
}

describe('Phase 4 checkpoint 4.6 trivia reservation and reuse', () => {
  it('reserves exact eligible sets atomically and enforces release, expiry, context, and reuse', () => {
    const suffix = `${process.pid}${Date.now()}`;

    expect(() =>
      query(`
        do $$
        #variable_conflict use_variable
        declare
          owner_id uuid := extensions.gen_random_uuid();
          actor_one uuid := '00000000-0000-4000-8000-000000000001';
          actor_two uuid := '00000000-0000-4000-8000-000000000002';
          token_one uuid := '00000000-0000-4000-8000-000000000011';
          token_two uuid := '00000000-0000-4000-8000-000000000012';
          token_three uuid := '00000000-0000-4000-8000-000000000013';
          workspace_id bigint;
          page_ids bigint[];
          page_one bigint;
          page_two bigint;
          page_three bigint;
          page_four bigint;
          post_one bigint;
          post_two bigint;
          facts uuid[];
          config_one_version integer;
          config_two_version integer;
          config_three_version integer;
          config_four_version integer;
          config_one_updated_at timestamptz;
          config_two_updated_at timestamptz;
          config_three_updated_at timestamptz;
          config_four_updated_at timestamptz;
          request_one jsonb;
          request_nine jsonb;
          snapshot jsonb;
          result record;
          ineligible_fact_public_id uuid;
          expired_at timestamptz := date_trunc('second', now() - interval '31 minutes');
          expired_until timestamptz := date_trunc('second', now() - interval '1 minute');
          source jsonb := '[{"schema_version":1,"url":"https://example.test/reservation","canonical_url":"https://example.test/reservation","title":"Reservation source","publisher":"Authority","tier":"A","source_type":"official","accessed_at":"2026-10-10T00:00:00Z","published_at":null,"updated_at":null,"as_of":null,"language":"en","supports":"Supports the complete proposition.","independence_group":"reservation"}]'::jsonb;
          review jsonb := '{"schema_version":1,"identity_schema_version":1,"reviewed_at":"2026-10-10T00:00:00Z","evaluator":"chatgpt","decisions":[]}'::jsonb;
          payload jsonb := '{"schema_version":1,"hook":"Did you know?","body":{},"cta":"Share this.","canva_copy":"Did you know? Share this.","caption":"Trivia.","hashtags":[],"render_style":"plain_lines","text_metrics":{}}'::jsonb;
          generation jsonb := '{"config_schema_version":1,"fact_count":{},"fact_count_applied":5,"fact_count_override":false,"text_budget":{},"fact_reuse_scope":"workspace_unique","profile_key":"fast_trivia","render_style":"plain_lines","target_markets":["US"],"locale":"en-US"}'::jsonb;
        begin
          insert into auth.users (
            instance_id, id, aud, role, email, encrypted_password,
            email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at
          ) values (
            '00000000-0000-0000-0000-000000000000', owner_id, 'authenticated', 'authenticated',
            'phase4-reservation-${suffix}@example.test', 'x', now(), '{}'::jsonb, '{}'::jsonb, now(), now()
          );
          insert into public.workspaces (owner_user_id, name, slug)
          values (owner_id, 'Reservation', 'phase4-reservation-${suffix}')
          returning id into workspace_id;
          insert into public.pages (workspace_id, name, slug)
          values
            (workspace_id, 'Reservation one', 'phase4-reservation-one-${suffix}'),
            (workspace_id, 'Reservation two', 'phase4-reservation-two-${suffix}'),
            (workspace_id, 'Reservation three', 'phase4-reservation-three-${suffix}'),
            (workspace_id, 'Reservation four', 'phase4-reservation-four-${suffix}');
          select array_agg(id order by id) into page_ids
          from public.pages where public.pages.workspace_id = workspace_id;
          page_one := page_ids[1];
          page_two := page_ids[2];
          page_three := page_ids[3];
          page_four := page_ids[4];
          insert into public.page_niche_configs (workspace_id, page_id, niche_key, config)
          values
            (workspace_id, page_one, 'trivia', internal.default_trivia_config_v1()),
            (workspace_id, page_two, 'trivia', internal.default_trivia_config_v1()),
            (workspace_id, page_three, 'trivia', jsonb_set(internal.default_trivia_config_v1(), '{fact_reuse_scope}', '"page_unique"')),
            (workspace_id, page_four, 'trivia', jsonb_set(internal.default_trivia_config_v1(), '{fact_reuse_scope}', '"page_unique"'));
          select config_schema_version, updated_at into config_one_version, config_one_updated_at from public.page_niche_configs where page_id = page_one and niche_key = 'trivia';
          select config_schema_version, updated_at into config_two_version, config_two_updated_at from public.page_niche_configs where page_id = page_two and niche_key = 'trivia';
          select config_schema_version, updated_at into config_three_version, config_three_updated_at from public.page_niche_configs where page_id = page_three and niche_key = 'trivia';
          select config_schema_version, updated_at into config_four_version, config_four_updated_at from public.page_niche_configs where page_id = page_four and niche_key = 'trivia';

          insert into public.trivia_facts (
            workspace_id, claim_text, normalized_claim, claim_hash, subject_key, relation_key,
            object_key, numbers, qualifiers, structured_key, structured_hash, topic_key,
            dedup_review_snapshot, source_data, verification_status, freshness_class,
            verified_at, expires_at
          )
          select
            workspace_id,
            format('Reservation fact %s.', value),
            'ignored', repeat('0', 64), format('reservation_subject_%s', value), 'has_count', value::text,
            jsonb_build_array(jsonb_build_object('value', value::text, 'unit', null, 'role', 'count')),
            '{"comparison_direction":"none"}'::jsonb, 'ignored', repeat('1', 64), 'animals',
            review, source, 'verified', 'stable', date_trunc('second', now() - interval '1 day'), date_trunc('second', now() + interval '30 days')
          from generate_series(1, 20) as value;
          select array_agg(public_id order by id) into facts
          from public.trivia_facts
          where public.trivia_facts.workspace_id = workspace_id;

          request_one := jsonb_build_array(jsonb_build_object('position', 1, 'fact_public_id', facts[1]::text));
          select * into result from internal.trivia_reserve_facts_v1(
            workspace_id, page_one, actor_one, token_one, config_one_version, config_one_updated_at,
            'workspace_unique', request_one, repeat('a', 64)
          );
          if result.reservation_token <> token_one
            or result.reserved_fact_public_ids <> array[facts[1]]
            or (select reservation_context -> 'ordered_fact_public_ids' = to_jsonb(array[facts[1]])
              and reservation_context ->> 'actor_user_id' = actor_one::text
              and reservation_context ->> 'fact_reuse_scope' = 'workspace_unique'
              and (reservation_context ->> 'ttl_minutes')::integer = 30
              and extract(epoch from (reserved_until - reserved_at)) = 1800
              from public.trivia_facts where public_id = facts[1]) is not true then
            raise exception 'single fact reservation context mismatch';
          end if;
          if internal.trivia_release_facts_v1(token_one, actor_one) <> 1
            or internal.trivia_release_facts_v1(token_one, actor_one) <> 0 then
            raise exception 'release was not idempotent';
          end if;

          select jsonb_agg(jsonb_build_object('position', ordinality, 'fact_public_id', public_id::text) order by ordinality)
          into request_nine
          from unnest(facts[1:9]) with ordinality as requested(public_id, ordinality);
          select * into result from internal.trivia_reserve_facts_v1(
            workspace_id, page_one, actor_one, token_one, config_one_version, config_one_updated_at,
            'workspace_unique', request_nine, repeat('b', 64)
          );
          if result.reserved_fact_public_ids <> facts[1:9]
            or (select count(*) from public.trivia_facts where reservation_token = token_one) <> 9 then
            raise exception 'nine fact reservation was not exact';
          end if;
          if internal.trivia_release_facts_v1(token_one, actor_one) <> 9 then
            raise exception 'nine fact release failed';
          end if;

          begin
            perform internal.trivia_reserve_facts_v1(workspace_id, page_one, actor_one, token_one, config_one_version, config_one_updated_at, 'workspace_unique', '[]'::jsonb, repeat('c', 64));
            raise exception 'empty reservation set accepted';
          exception when invalid_parameter_value then null;
          end;
          begin
            perform internal.trivia_reserve_facts_v1(workspace_id, page_one, actor_one, token_one, config_one_version, config_one_updated_at, 'workspace_unique', jsonb_build_array(jsonb_build_object('position', 1, 'fact_public_id', facts[1]::text), jsonb_build_object('position', 1, 'fact_public_id', facts[2]::text)), repeat('c', 64));
            raise exception 'duplicate reservation position accepted';
          exception when invalid_parameter_value then null;
          end;
          begin
            perform internal.trivia_reserve_facts_v1(workspace_id, page_one, actor_one, token_one, config_one_version, config_one_updated_at, 'workspace_unique', jsonb_build_array(jsonb_build_object('position', 2, 'fact_public_id', facts[1]::text)), repeat('c', 64));
            raise exception 'non-contiguous reservation position accepted';
          exception when invalid_parameter_value then null;
          end;
          begin
            perform internal.trivia_reserve_facts_v1(workspace_id, page_one, actor_one, token_one, config_one_version, config_one_updated_at, 'workspace_unique', (select jsonb_agg(jsonb_build_object('position', value, 'fact_public_id', facts[value]::text)) from generate_series(1, 10) as value), repeat('c', 64));
            raise exception 'ten fact reservation set accepted';
          exception when invalid_parameter_value then null;
          end;

          request_one := jsonb_build_array(jsonb_build_object('position', 1, 'fact_public_id', facts[2]::text));
          perform internal.trivia_reserve_facts_v1(workspace_id, page_one, actor_one, token_one, config_one_version, config_one_updated_at, 'workspace_unique', request_one, repeat('d', 64));
          begin
            perform internal.trivia_reserve_facts_v1(workspace_id, page_one, actor_two, token_one, config_one_version, config_one_updated_at, 'workspace_unique', request_one, repeat('d', 64));
            raise exception 'actor mismatch accepted';
          exception when check_violation then null;
          end;
          begin
            perform internal.trivia_reserve_facts_v1(workspace_id, page_one, actor_one, token_one, config_one_version, config_one_updated_at, 'workspace_unique', request_one, repeat('e', 64));
            raise exception 'request hash mismatch accepted';
          exception when check_violation then null;
          end;
          begin
            perform internal.trivia_reserve_facts_v1(workspace_id, page_one, actor_one, token_one, config_one_version + 1, config_one_updated_at, 'workspace_unique', request_one, repeat('d', 64));
            raise exception 'config mismatch accepted';
          exception when check_violation then null;
          end;
          begin
            perform internal.trivia_reserve_facts_v1(workspace_id, page_one, actor_one, token_one, config_one_version, config_one_updated_at, 'workspace_unique', jsonb_build_array(jsonb_build_object('position', 1, 'fact_public_id', facts[3]::text)), repeat('d', 64));
            raise exception 'fact-set mismatch accepted';
          exception when check_violation then null;
          end;
          begin
            perform internal.trivia_release_facts_v1(token_one, actor_two);
            raise exception 'non-owner release accepted';
          exception when check_violation then null;
          end;
          if (select reservation_token = token_one from public.trivia_facts where public_id = facts[2]) is not true then
            raise exception 'non-owner release changed another token';
          end if;
          perform internal.trivia_release_facts_v1(token_one, actor_one);

          perform internal.trivia_reserve_facts_v1(workspace_id, page_one, actor_one, token_one, config_one_version, config_one_updated_at, 'workspace_unique', jsonb_build_array(jsonb_build_object('position', 1, 'fact_public_id', facts[3]::text)), repeat('f', 64));
          begin
            perform internal.trivia_reserve_facts_v1(workspace_id, page_one, actor_two, token_two, config_one_version, config_one_updated_at, 'workspace_unique', jsonb_build_array(jsonb_build_object('position', 1, 'fact_public_id', facts[4]::text), jsonb_build_object('position', 2, 'fact_public_id', facts[3]::text)), repeat('1', 64));
            raise exception 'conflicting set accepted';
          exception when unique_violation then null;
          end;
          if (select reservation_status = 'available' from public.trivia_facts where public_id = facts[4]) is not true then
            raise exception 'conflicting set partially reserved';
          end if;
          perform internal.trivia_release_facts_v1(token_one, actor_one);

          perform internal.trivia_reserve_facts_v1(workspace_id, page_one, actor_one, token_one, config_one_version, config_one_updated_at, 'workspace_unique', jsonb_build_array(jsonb_build_object('position', 1, 'fact_public_id', facts[5]::text)), repeat('2', 64));
          update public.trivia_facts
          set reserved_at = expired_at,
              reserved_until = expired_until,
              reservation_context = jsonb_set(
                jsonb_set(reservation_context, '{reserved_at}', to_jsonb(to_char(expired_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'))),
                '{reserved_until}', to_jsonb(to_char(expired_until at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'))
              )
          where public_id = facts[5];
          perform internal.trivia_reserve_facts_v1(workspace_id, page_one, actor_two, token_two, config_one_version, config_one_updated_at, 'workspace_unique', jsonb_build_array(jsonb_build_object('position', 1, 'fact_public_id', facts[5]::text)), repeat('3', 64));
          if (select reservation_token = token_two and reservation_status = 'reserved' from public.trivia_facts where public_id = facts[5]) is not true then
            raise exception 'expired reservation was not reclaimed';
          end if;
          perform internal.trivia_release_facts_v1(token_two, actor_two);

          update public.trivia_facts set verified_at = date_trunc('second', now() - interval '2 days'), expires_at = date_trunc('second', now() - interval '1 day') where public_id = facts[6];
          update public.trivia_facts set verification_status = 'needs_review' where public_id = facts[7];
          update public.trivia_facts set verification_status = 'invalidated' where public_id = facts[8];
          update public.trivia_facts set verification_status = 'superseded' where public_id = facts[9];
          alter table public.trivia_facts disable trigger trivia_facts_validate_identity_source_freshness;
          update public.trivia_facts set source_data = '[{}]'::jsonb where public_id = facts[10];
          alter table public.trivia_facts enable trigger trivia_facts_validate_identity_source_freshness;
          update public.trivia_facts set verification_status = 'rejected' where public_id = facts[14];
          insert into public.trivia_facts (
            workspace_id, claim_text, normalized_claim, claim_hash, subject_key, relation_key,
            object_key, numbers, qualifiers, structured_key, structured_hash, topic_key,
            dedup_review_snapshot, source_data, verification_status, freshness_class,
            verified_at, expires_at, supersedes_fact_id, correction_reason, corrected_at
          )
          select
            workspace_id, 'Reservation lineage successor.', 'ignored', repeat('2', 64),
            'reservation_lineage_successor', 'has_count', '15',
            '[{"value":"15","unit":null,"role":"count"}]'::jsonb,
            '{"comparison_direction":"none"}'::jsonb, 'ignored', repeat('3', 64), 'animals',
            dedup_review_snapshot, source_data, 'verified', 'stable', verified_at, expires_at,
            id, 'Reservation lineage test.', now()
          from public.trivia_facts where public_id = facts[15];
          foreach ineligible_fact_public_id in array array[facts[6], facts[7], facts[8], facts[9], facts[10], facts[14], facts[15]] loop
            begin
              perform internal.trivia_reserve_facts_v1(workspace_id, page_one, actor_one, token_one, config_one_version, config_one_updated_at, 'workspace_unique', jsonb_build_array(jsonb_build_object('position', 1, 'fact_public_id', ineligible_fact_public_id::text)), repeat('4', 64));
              raise exception 'ineligible fact reserved';
            exception when check_violation then null;
            end;
          end loop;

          insert into public.posts (workspace_id, page_id, niche_key, format_key, topic_key, interaction_goal, content_payload, generation_snapshot, content_hash)
          values (workspace_id, page_one, 'trivia', 'single_subject_fast', 'animals', 'share', payload, generation, repeat('a', 64))
          returning id into post_one;
          select jsonb_build_object(
            'schema_version', 1, 'canonical_claim', claim_text, 'normalized_claim', normalized_claim,
            'normalization_version', normalization_version, 'claim_hash', claim_hash,
            'subject_key', subject_key, 'relation_key', relation_key, 'object_key', object_key,
            'numbers', numbers, 'qualifiers', qualifiers, 'ontology_version', ontology_version,
            'structured_key', structured_key, 'structured_hash', structured_hash,
            'structured_match_eligible', structured_match_eligible, 'topic_key', topic_key,
            'risk_class', risk_class, 'source_schema_version', 1, 'sources', source_data,
            'verification_status', verification_status,
            'verified_at', to_char(verified_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
            'as_of_date', coalesce(to_jsonb(as_of_date), 'null'::jsonb),
            'expires_at', to_char(expires_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
            'dedup_review_schema_version', (dedup_review_snapshot ->> 'schema_version')::integer
          ) into snapshot from public.trivia_facts where public_id = facts[11];
          insert into public.trivia_post_facts (workspace_id, page_id, post_id, fact_id, position, rendered_text, claim_hash_snapshot, source_snapshot, verified_at_snapshot)
          select workspace_id, page_one, post_one, id, 1, 'Workspace unique allocation.', claim_hash, snapshot, verified_at
          from public.trivia_facts where public_id = facts[11];
          begin
            perform internal.trivia_reserve_facts_v1(workspace_id, page_two, actor_one, token_one, config_two_version, config_two_updated_at, 'workspace_unique', jsonb_build_array(jsonb_build_object('position', 1, 'fact_public_id', facts[11]::text)), repeat('5', 64));
            raise exception 'workspace unique allocation did not block another Page';
          exception when unique_violation then null;
          end;
          update public.trivia_post_facts
          set allocation_state = 'released', released_at = now()
          where post_id = post_one;
          perform internal.trivia_reserve_facts_v1(workspace_id, page_two, actor_one, token_one, config_two_version, config_two_updated_at, 'workspace_unique', jsonb_build_array(jsonb_build_object('position', 1, 'fact_public_id', facts[11]::text)), repeat('5', 64));
          perform internal.trivia_release_facts_v1(token_one, actor_one);

          insert into public.posts (workspace_id, page_id, niche_key, format_key, topic_key, interaction_goal, content_payload, generation_snapshot, content_hash)
          values (workspace_id, page_three, 'trivia', 'single_subject_fast', 'animals', 'share', payload, generation, repeat('b', 64))
          returning id into post_two;
          select jsonb_build_object(
            'schema_version', 1, 'canonical_claim', claim_text, 'normalized_claim', normalized_claim,
            'normalization_version', normalization_version, 'claim_hash', claim_hash,
            'subject_key', subject_key, 'relation_key', relation_key, 'object_key', object_key,
            'numbers', numbers, 'qualifiers', qualifiers, 'ontology_version', ontology_version,
            'structured_key', structured_key, 'structured_hash', structured_hash,
            'structured_match_eligible', structured_match_eligible, 'topic_key', topic_key,
            'risk_class', risk_class, 'source_schema_version', 1, 'sources', source_data,
            'verification_status', verification_status,
            'verified_at', to_char(verified_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
            'as_of_date', coalesce(to_jsonb(as_of_date), 'null'::jsonb),
            'expires_at', to_char(expires_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
            'dedup_review_schema_version', (dedup_review_snapshot ->> 'schema_version')::integer
          ) into snapshot from public.trivia_facts where public_id = facts[12];
          insert into public.trivia_post_facts (workspace_id, page_id, post_id, fact_id, position, rendered_text, claim_hash_snapshot, source_snapshot, verified_at_snapshot)
          select workspace_id, page_three, post_two, id, 1, 'Page unique allocation.', claim_hash, snapshot, verified_at
          from public.trivia_facts where public_id = facts[12];
          perform internal.trivia_reserve_facts_v1(workspace_id, page_four, actor_one, token_one, config_four_version, config_four_updated_at, 'page_unique', jsonb_build_array(jsonb_build_object('position', 1, 'fact_public_id', facts[12]::text)), repeat('6', 64));
          perform internal.trivia_release_facts_v1(token_one, actor_one);
          begin
            perform internal.trivia_reserve_facts_v1(workspace_id, page_three, actor_one, token_one, config_three_version, config_three_updated_at, 'page_unique', jsonb_build_array(jsonb_build_object('position', 1, 'fact_public_id', facts[12]::text)), repeat('7', 64));
            raise exception 'page unique allocation did not block the target Page';
          exception when unique_violation then null;
          end;
          perform internal.trivia_reserve_facts_v1(workspace_id, page_one, actor_one, token_one, config_one_version, config_one_updated_at, 'workspace_unique', jsonb_build_array(jsonb_build_object('position', 1, 'fact_public_id', facts[13]::text)), repeat('8', 64));
          begin
            perform internal.trivia_reserve_facts_v1(workspace_id, page_four, actor_two, token_two, config_four_version, config_four_updated_at, 'page_unique', jsonb_build_array(jsonb_build_object('position', 1, 'fact_public_id', facts[13]::text)), repeat('9', 64));
            raise exception 'active reservation did not block another Page';
          exception when unique_violation then null;
          end;
          perform internal.trivia_release_facts_v1(token_one, actor_one);

          if has_function_privilege('authenticated', 'internal.trivia_reserve_facts_v1(bigint,bigint,uuid,uuid,integer,timestamptz,text,jsonb,text,integer)', 'execute')
            or has_function_privilege('anon', 'internal.trivia_release_facts_v1(uuid,uuid)', 'execute')
            or has_function_privilege('service_role', 'internal.trivia_clear_expired_reservation_v1(bigint)', 'execute')
            or has_function_privilege('public', 'internal.trivia_reservation_fact_public_ids_v1(jsonb)', 'execute')
            or to_regclass('public.trivia_facts_reservation_token_idx') is null
            or to_regclass('public.trivia_facts_reserved_until_idx') is null then
            raise exception 'reservation primitive privilege or catalog boundary failed';
          end if;

          delete from public.trivia_post_facts as usage where usage.workspace_id = workspace_id;
          delete from public.posts as post where post.workspace_id = workspace_id;
          delete from public.trivia_facts as fact where fact.workspace_id = workspace_id;
          delete from public.page_niche_configs as config where config.workspace_id = workspace_id;
          delete from public.pages as page where page.workspace_id = workspace_id;
          delete from public.workspaces where id = workspace_id;
          delete from auth.users where id = owner_id;
        end $$;
      `),
    ).not.toThrow();
  }, 60_000);

  it('allows one ten-session contender with no partial loser and independent facts proceed', async () => {
    const suffix = `${process.pid}${Date.now()}`;
    const slug = `phase4-race-${suffix}`;
    const source =
      '[{"schema_version":1,"url":"https://example.test/race","canonical_url":"https://example.test/race","title":"Race source","publisher":"Authority","tier":"A","source_type":"official","accessed_at":"2026-10-10T00:00:00Z","published_at":null,"updated_at":null,"as_of":null,"language":"en","supports":"Supports the complete proposition.","independence_group":"race"}]';
    const review =
      '{"schema_version":1,"identity_schema_version":1,"reviewed_at":"2026-10-10T00:00:00Z","evaluator":"chatgpt","decisions":[]}';

    try {
      query(`
        do $$
        declare owner_id uuid := extensions.gen_random_uuid(); w bigint; p bigint;
        begin
          insert into auth.users (instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
          values ('00000000-0000-0000-0000-000000000000',owner_id,'authenticated','authenticated','${slug}@example.test','x',now(),'{}','{}',now(),now());
          insert into public.workspaces (owner_user_id,name,slug) values (owner_id,'Reservation race','${slug}') returning id into w;
          insert into public.pages (workspace_id,name,slug) values (w,'Reservation race','${slug}-page') returning id into p;
          insert into public.page_niche_configs (workspace_id,page_id,niche_key,config) values (w,p,'trivia',internal.default_trivia_config_v1());
          insert into public.trivia_facts (workspace_id,claim_text,normalized_claim,claim_hash,subject_key,relation_key,object_key,numbers,qualifiers,structured_key,structured_hash,topic_key,dedup_review_snapshot,source_data,verification_status,freshness_class,verified_at,expires_at)
          select w,format('Race fact %s.',value),'ignored',repeat('0',64),format('race_subject_%s',value),'has_count',value::text,jsonb_build_array(jsonb_build_object('value',value::text,'unit',null,'role','count')),'{"comparison_direction":"none"}'::jsonb,'ignored',repeat('1',64),'animals','${review}'::jsonb,'${source}'::jsonb,'verified','stable',date_trunc('second',now()-interval '1 day'),date_trunc('second',now()+interval '30 days') from generate_series(1,12) as value;
        end $$;
      `);
      const [fixture] = queryRows(`
        select jsonb_build_object(
          'workspace_id', workspace.id,
          'page_id', page.id,
          'config_schema_version', config.config_schema_version,
          'config_updated_at', config.updated_at,
          'facts', (select jsonb_agg(public_id order by id) from public.trivia_facts where workspace_id = workspace.id)
        ) as fixture
        from public.workspaces as workspace
        join public.pages as page on page.workspace_id = workspace.id
        join public.page_niche_configs as config on config.page_id = page.id and config.niche_key = 'trivia'
        where workspace.slug = '${slug}'
      `);
      const values = fixture.fixture as Record<string, unknown>;
      const workspaceId = String(values.workspace_id);
      const pageId = String(values.page_id);
      const configVersion = String(values.config_schema_version);
      const configUpdatedAt = String(values.config_updated_at);
      const facts = values.facts as string[];
      const actor = '00000000-0000-4000-8000-000000000001';
      const reserveSql = (token: string, factIds: string[], requestHash: string) => {
        const requests = JSON.stringify(
          factIds.map((factPublicId, index) => ({
            position: index + 1,
            fact_public_id: factPublicId,
          })),
        ).replaceAll("'", "''");
        return `
          with timeout_settings as materialized (
            select set_config('lock_timeout', '2s', true), set_config('statement_timeout', '10s', true)
          ), reservation as materialized (
            select *
            from internal.trivia_reserve_facts_v1(
              ${workspaceId}, ${pageId}, '${actor}'::uuid, '${token}'::uuid,
              ${configVersion}, '${configUpdatedAt}'::timestamptz, 'workspace_unique',
              '${requests}'::jsonb, '${requestHash}'
            )
            where exists (select 1 from timeout_settings)
          )
          select reservation_token from reservation
        `;
      };
      const tokens = Array.from(
        { length: 10 },
        (_, index) => `00000000-0000-4000-8000-${String(index + 101).padStart(12, '0')}`,
      );
      const raceStartedAt = Date.now();
      const raceStatuses = await Promise.all(
        tokens.map((token, index) =>
          concurrentQuery(
            reserveSql(token, [facts[0], facts[index + 1]], `${index}`.padStart(64, 'a')),
          ),
        ),
      );
      expect(Date.now() - raceStartedAt).toBeLessThan(30_000);
      expect(raceStatuses.filter((status) => status === 0)).toHaveLength(1);

      const [raceResult] = queryRows(`
        select reservation_token::text, count(*)::integer as reserved_count
        from public.trivia_facts
        where workspace_id = ${workspaceId} and reservation_status = 'reserved'
        group by reservation_token
      `);
      expect(raceResult.reserved_count).toBe(2);
      const winnerToken = String(raceResult.reservation_token);
      query(`select internal.trivia_release_facts_v1('${winnerToken}'::uuid, '${actor}'::uuid)`);

      const nonContentionStatuses = await Promise.all([
        concurrentQuery(
          reserveSql('00000000-0000-4000-8000-000000000201', [facts[10]], 'b'.repeat(64)),
        ),
        concurrentQuery(
          reserveSql('00000000-0000-4000-8000-000000000202', [facts[11]], 'c'.repeat(64)),
        ),
      ]);
      expect(nonContentionStatuses).toEqual([0, 0]);
    } finally {
      query(`
        do $$
        declare w bigint := (select id from public.workspaces where slug = '${slug}'); u uuid := (select owner_user_id from public.workspaces where id = w);
        begin
          delete from public.trivia_facts where workspace_id = w;
          delete from public.page_niche_configs where workspace_id = w;
          delete from public.pages where workspace_id = w;
          delete from public.workspaces where id = w;
          delete from auth.users where id = u;
        end $$;
      `);
    }
  }, 90_000);
});
