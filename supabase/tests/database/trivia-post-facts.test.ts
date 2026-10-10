import { spawnSync } from 'node:child_process';

import { describe, expect, it } from 'vitest';

function query(sql: string): void {
  const result = spawnSync('pnpm', ['exec', 'supabase', 'db', 'query', '--local', sql], {
    cwd: process.cwd(),
    encoding: 'utf8',
    env: { ...process.env, SUPABASE_TELEMETRY_DISABLED: '1' },
  });

  if (result.status !== 0) throw new Error(`${result.stderr}\n${result.stdout}`);
}

describe('Phase 4 checkpoint 4.5 trivia post-fact usage snapshots', () => {
  it('enforces scoped immutable fact usage and the closed caller boundary', () => {
    const suffix = `${process.pid}${Date.now()}`;

    expect(() =>
      query(`
        do $$
        declare
          owner_one uuid := extensions.gen_random_uuid();
          owner_two uuid := extensions.gen_random_uuid();
          workspace_one bigint;
          workspace_two bigint;
          page_one bigint;
          page_two bigint;
          post_one bigint;
          post_two bigint;
          post_three bigint;
          non_trivia_post bigint;
          fact_one bigint;
          fact_two bigint;
          fact_three bigint;
          usage_one bigint;
          usage_two bigint;
          snapshot_one jsonb;
          snapshot_two jsonb;
          snapshot_one_refreshed jsonb;
          snapshot_three jsonb;
          initial_snapshot jsonb;
          initial_source jsonb := '[{"schema_version":1,"url":"https://example.test/one","canonical_url":"https://example.test/one","title":"First authoritative source","publisher":"Authority","tier":"A","source_type":"official","accessed_at":"2026-10-09T00:00:00Z","published_at":null,"updated_at":null,"as_of":null,"language":"en","supports":"Supports the complete proposition.","independence_group":"one"}]'::jsonb;
          refreshed_source jsonb := '[{"schema_version":1,"url":"https://example.test/two","canonical_url":"https://example.test/two","title":"Replacement authoritative source","publisher":"Authority","tier":"A","source_type":"official","accessed_at":"2026-10-10T00:00:00Z","published_at":null,"updated_at":null,"as_of":null,"language":"en","supports":"Supports the complete proposition after refresh.","independence_group":"two"}]'::jsonb;
          review jsonb := '{"schema_version":1,"identity_schema_version":1,"reviewed_at":"2026-10-09T00:00:00Z","evaluator":"chatgpt","decisions":[]}'::jsonb;
          payload jsonb := '{"schema_version":1,"hook":"Did you know?","body":{"fact_public_id":"not-a-relational-link"},"cta":"Share this.","canva_copy":"Did you know? Share this.","caption":"Trivia.","hashtags":[],"render_style":"plain_lines","text_metrics":{}}'::jsonb;
          generation jsonb := '{"config_schema_version":1,"fact_count":{},"fact_count_applied":5,"fact_count_override":false,"text_budget":{},"fact_reuse_scope":"workspace_unique","profile_key":"fast_trivia","render_style":"plain_lines","target_markets":["US"],"locale":"en-US"}'::jsonb;
          hash text := repeat('a', 64);
        begin
          insert into auth.users (
            instance_id, id, aud, role, email, encrypted_password,
            email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at
          ) values
            ('00000000-0000-0000-0000-000000000000', owner_one, 'authenticated', 'authenticated', 'phase4-junction-one-${suffix}@example.test', 'x', now(), '{}'::jsonb, '{}'::jsonb, now(), now()),
            ('00000000-0000-0000-0000-000000000000', owner_two, 'authenticated', 'authenticated', 'phase4-junction-two-${suffix}@example.test', 'x', now(), '{}'::jsonb, '{}'::jsonb, now(), now());
          insert into public.workspaces (owner_user_id, name, slug)
          values (owner_one, 'Junction one', 'phase4-junction-one-${suffix}')
          returning id into workspace_one;
          insert into public.workspaces (owner_user_id, name, slug, is_active)
          values (owner_two, 'Junction two', 'phase4-junction-two-${suffix}', false)
          returning id into workspace_two;
          insert into public.pages (workspace_id, name, slug)
          values (workspace_one, 'Junction one', 'phase4-junction-one-page-${suffix}')
          returning id into page_one;
          insert into public.pages (workspace_id, name, slug)
          values (workspace_two, 'Junction two', 'phase4-junction-two-page-${suffix}')
          returning id into page_two;
          insert into public.page_niche_configs (workspace_id, page_id, niche_key, config)
          values (workspace_one, page_one, 'trivia', internal.default_trivia_config_v1()),
                 (workspace_two, page_two, 'trivia', internal.default_trivia_config_v1());

          insert into public.posts (
            workspace_id, page_id, niche_key, format_key, topic_key, interaction_goal,
            content_payload, generation_snapshot, content_hash
          ) values (
            workspace_one, page_one, 'trivia', 'single_subject_fast', 'animals', 'share', payload, generation, hash
          )
          returning id into post_one;
          insert into public.posts (
            workspace_id, page_id, niche_key, format_key, topic_key, interaction_goal,
            content_payload, generation_snapshot, content_hash
          ) values (
            workspace_one, page_one, 'trivia', 'single_subject_fast', 'animals', 'share', payload, generation, hash
          )
          returning id into post_two;
          insert into public.posts (
            workspace_id, page_id, niche_key, format_key, topic_key, interaction_goal,
            content_payload, generation_snapshot, content_hash
          ) values (
            workspace_two, page_two, 'trivia', 'single_subject_fast', 'animals', 'share', payload, generation, hash
          )
          returning id into post_three;

          insert into public.niches (key, name, status)
          values ('other_${suffix}', 'Temporary non trivia', 'development');
          insert into public.page_niche_configs (workspace_id, page_id, niche_key, config)
          values (workspace_one, page_one, 'other_${suffix}', internal.default_trivia_config_v1());
          insert into public.posts (
            workspace_id, page_id, niche_key, format_key, topic_key, interaction_goal,
            content_payload, generation_snapshot, content_hash
          ) values (
            workspace_one, page_one, 'other_${suffix}', 'single_subject_fast', 'animals', 'share', payload, generation, hash
          ) returning id into non_trivia_post;

          insert into public.trivia_facts (
            workspace_id, claim_text, normalized_claim, claim_hash, subject_key, relation_key,
            object_key, numbers, qualifiers, structured_key, structured_hash, topic_key,
            dedup_review_snapshot, source_data, verification_status, freshness_class,
            verified_at, expires_at
          ) values (
            workspace_one, 'Octopuses have three hearts.', 'ignored', repeat('0', 64), 'octopus', 'has_count', '3', '[{"value":"3","unit":null,"role":"count"}]', '{"comparison_direction":"none"}', 'ignored', repeat('1', 64), 'animals', review, initial_source, 'verified', 'stable', date_trunc('second', now() - interval '1 day'), date_trunc('second', now() + interval '30 days')
          )
          returning id into fact_one;
          insert into public.trivia_facts (
            workspace_id, claim_text, normalized_claim, claim_hash, subject_key, relation_key,
            object_key, numbers, qualifiers, structured_key, structured_hash, topic_key,
            dedup_review_snapshot, source_data, verification_status, freshness_class,
            verified_at, expires_at
          ) values (
            workspace_two, 'Bees have five eyes.', 'ignored', repeat('2', 64), 'bee', 'has_count', '5', '[{"value":"5","unit":null,"role":"count"}]', '{"comparison_direction":"none"}', 'ignored', repeat('3', 64), 'animals', review, initial_source, 'verified', 'stable', date_trunc('second', now() - interval '1 day'), date_trunc('second', now() + interval '30 days')
          )
          returning id into fact_two;
          insert into public.trivia_facts (
            workspace_id, claim_text, normalized_claim, claim_hash, subject_key, relation_key,
            object_key, numbers, qualifiers, structured_key, structured_hash, topic_key,
            dedup_review_snapshot, source_data, verification_status, freshness_class,
            verified_at, expires_at
          ) values (
            workspace_one, 'A squid has two fins.', 'ignored', repeat('4', 64), 'squid', 'has_count', '2', '[{"value":"2","unit":null,"role":"count"}]', '{"comparison_direction":"none"}', 'ignored', repeat('5', 64), 'animals', review, initial_source, 'verified', 'stable', date_trunc('second', now() - interval '1 day'), date_trunc('second', now() + interval '30 days')
          )
          returning id into fact_three;

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
          ) into snapshot_one
          from public.trivia_facts where id = fact_one;
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
          ) into snapshot_two
          from public.trivia_facts where id = fact_two;
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
          ) into snapshot_three
          from public.trivia_facts where id = fact_three;

          begin
            insert into public.trivia_post_facts (workspace_id, page_id, post_id, fact_id, position, rendered_text, claim_hash_snapshot, source_snapshot, verified_at_snapshot)
            values (workspace_one, page_one, post_one, fact_two, 1, 'Cross workspace fact.', snapshot_two ->> 'claim_hash', snapshot_two, (snapshot_two ->> 'verified_at')::timestamptz);
            raise exception 'cross-workspace fact link accepted';
          exception when foreign_key_violation then null;
          end;
          begin
            insert into public.trivia_post_facts (workspace_id, page_id, post_id, fact_id, position, rendered_text, claim_hash_snapshot, source_snapshot, verified_at_snapshot)
            values (workspace_two, page_two, post_three, fact_one, 1, 'Cross workspace post.', snapshot_one ->> 'claim_hash', snapshot_one, (snapshot_one ->> 'verified_at')::timestamptz);
            raise exception 'cross-workspace post link accepted';
          exception when foreign_key_violation then null;
          end;
          begin
            insert into public.trivia_post_facts (workspace_id, page_id, post_id, niche_key, fact_id, position, rendered_text, claim_hash_snapshot, source_snapshot, verified_at_snapshot)
            values (workspace_one, page_one, non_trivia_post, 'other_${suffix}', fact_one, 1, 'Non trivia post.', snapshot_one ->> 'claim_hash', snapshot_one, (snapshot_one ->> 'verified_at')::timestamptz);
            raise exception 'non-trivia post link accepted';
          exception when check_violation then null;
          end;

          insert into public.trivia_post_facts (
            workspace_id, page_id, post_id, fact_id, position, fact_role, rendered_text,
            claim_hash_snapshot, source_snapshot, verified_at_snapshot
          ) values (
            workspace_one, page_one, post_one, fact_one, 1, 'general', 'Octopuses have three hearts.',
            snapshot_one ->> 'claim_hash', snapshot_one, (snapshot_one ->> 'verified_at')::timestamptz
          ) returning id, source_snapshot into usage_one, initial_snapshot;
          if initial_snapshot <> snapshot_one
            or (select claim_hash_snapshot = source_snapshot ->> 'claim_hash'
              and verified_at_snapshot = (source_snapshot ->> 'verified_at')::timestamptz
              from public.trivia_post_facts where id = usage_one) is not true then
            raise exception 'snapshot projections do not match JSON evidence';
          end if;

          begin
            insert into public.trivia_post_facts (workspace_id, page_id, post_id, fact_id, position, rendered_text, claim_hash_snapshot, source_snapshot, verified_at_snapshot)
            values (workspace_one, page_one, post_one, fact_three, 1, 'Duplicate position.', snapshot_three ->> 'claim_hash', snapshot_three, (snapshot_three ->> 'verified_at')::timestamptz);
            raise exception 'duplicate position accepted';
          exception when unique_violation then null;
          end;
          begin
            insert into public.trivia_post_facts (workspace_id, page_id, post_id, fact_id, position, rendered_text, claim_hash_snapshot, source_snapshot, verified_at_snapshot)
            values (workspace_one, page_one, post_one, fact_one, 2, 'Duplicate fact.', snapshot_one ->> 'claim_hash', snapshot_one, (snapshot_one ->> 'verified_at')::timestamptz);
            raise exception 'duplicate fact accepted';
          exception when unique_violation then null;
          end;
          begin
            insert into public.trivia_post_facts (workspace_id, page_id, post_id, fact_id, position, fact_role, rendered_text, claim_hash_snapshot, source_snapshot, verified_at_snapshot)
            values (workspace_one, page_one, post_one, fact_three, 2, 'unsupported', 'Bad role.', snapshot_three ->> 'claim_hash', snapshot_three, (snapshot_three ->> 'verified_at')::timestamptz);
            raise exception 'invalid role accepted';
          exception when check_violation then null;
          end;
          begin
            insert into public.trivia_post_facts (workspace_id, page_id, post_id, fact_id, position, rendered_text, claim_hash_snapshot, source_snapshot, verified_at_snapshot)
            values (workspace_one, page_one, post_one, fact_three, 2, 'a b c d e f g h i j k l m n o p q r s', snapshot_three ->> 'claim_hash', snapshot_three, (snapshot_three ->> 'verified_at')::timestamptz);
            raise exception 'more than eighteen wording words accepted';
          exception when check_violation then null;
          end;
          begin
            insert into public.trivia_post_facts (workspace_id, page_id, post_id, fact_id, position, rendered_text, claim_hash_snapshot, source_snapshot, verified_at_snapshot)
            values (workspace_one, page_one, post_one, fact_three, 2, repeat('x', 91), snapshot_three ->> 'claim_hash', snapshot_three, (snapshot_three ->> 'verified_at')::timestamptz);
            raise exception 'oversized wording accepted';
          exception when check_violation then null;
          end;
          begin
            insert into public.trivia_post_facts (workspace_id, page_id, post_id, fact_id, position, rendered_text, claim_hash_snapshot, source_snapshot, verified_at_snapshot)
            values (workspace_one, page_one, post_one, fact_three, 2, 'Bad snapshot timestamp.', snapshot_three ->> 'claim_hash', jsonb_set(snapshot_three, '{verified_at}', '"2026-10-09 00:00:00+00"'), (snapshot_three ->> 'verified_at')::timestamptz);
            raise exception 'non-RFC3339 snapshot timestamp accepted';
          exception when check_violation then null;
          end;
          begin
            insert into public.trivia_post_facts (workspace_id, page_id, post_id, fact_id, position, allocation_state, published_at, rendered_text, claim_hash_snapshot, source_snapshot, verified_at_snapshot)
            values (workspace_one, page_one, post_one, fact_three, 2, 'allocated', now(), 'Invalid state shape.', snapshot_three ->> 'claim_hash', snapshot_three, (snapshot_three ->> 'verified_at')::timestamptz);
            raise exception 'invalid state/timestamp shape accepted';
          exception when check_violation then null;
          end;
          begin
            insert into public.trivia_post_facts (workspace_id, page_id, post_id, fact_id, position, rendered_text, claim_hash_snapshot, source_snapshot, verified_at_snapshot)
            values (workspace_one, page_one, post_one, fact_three, 2, 'Bad snapshot.', repeat('f', 64), snapshot_three, (snapshot_three ->> 'verified_at')::timestamptz);
            raise exception 'projection mismatch accepted';
          exception when check_violation then null;
          end;
          begin
            insert into public.trivia_post_facts (workspace_id, page_id, post_id, fact_id, position, rendered_text, claim_hash_snapshot, source_snapshot, verified_at_snapshot)
            values (workspace_one, page_one, post_one, fact_three, 2, 'Unknown snapshot key.', snapshot_three ->> 'claim_hash', snapshot_three || '{"unknown":true}'::jsonb, (snapshot_three ->> 'verified_at')::timestamptz);
            raise exception 'open snapshot schema accepted';
          exception when check_violation then null;
          end;
          begin
            insert into public.trivia_post_facts (workspace_id, page_id, post_id, fact_id, position, rendered_text, claim_hash_snapshot, source_snapshot, verified_at_snapshot)
            values (workspace_one, page_one, post_one, fact_three, 2, 'Wrong source snapshot.', snapshot_three ->> 'claim_hash', jsonb_set(snapshot_three, '{topic_key}', '"geography"'), (snapshot_three ->> 'verified_at')::timestamptz);
            raise exception 'snapshot/fact mismatch accepted';
          exception when check_violation then null;
          end;

          begin
            update public.trivia_facts set topic_key = 'geography' where id = fact_one;
            raise exception 'allocated usage allowed canonical meaning mutation';
          exception when check_violation then
            if sqlerrm <> 'TRIVIA_FACT_REFERENCED_MEANING_IMMUTABLE' then raise; end if;
          end;
          update public.trivia_facts set source_data = refreshed_source where id = fact_one;
          if (select source_snapshot = initial_snapshot and source_snapshot -> 'sources' <> source_data from public.trivia_post_facts join public.trivia_facts on trivia_facts.id = trivia_post_facts.fact_id where trivia_post_facts.id = usage_one) is not true then
            raise exception 'source refresh rewrote historical snapshot';
          end if;

          update public.trivia_post_facts
          set allocation_state = 'released', released_at = now()
          where id = usage_one;
          begin
            update public.trivia_facts set object_key = 'four' where id = fact_one;
            raise exception 'released usage allowed canonical meaning mutation';
          exception when check_violation then
            if sqlerrm <> 'TRIVIA_FACT_REFERENCED_MEANING_IMMUTABLE' then raise; end if;
          end;

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
          ) into snapshot_one_refreshed
          from public.trivia_facts where id = fact_one;
          insert into public.trivia_post_facts (
            workspace_id, page_id, post_id, fact_id, position, rendered_text,
            claim_hash_snapshot, source_snapshot, verified_at_snapshot
          ) values (
            workspace_one, page_one, post_two, fact_one, 1, 'Octopuses have three hearts.',
            snapshot_one_refreshed ->> 'claim_hash', snapshot_one_refreshed,
            (snapshot_one_refreshed ->> 'verified_at')::timestamptz
          ) returning id into usage_two;
          if (select count(*) from public.trivia_post_facts where page_id = page_one and fact_id = fact_one and allocation_state = 'released') <> 1 then
            raise exception 'released junction was not retained';
          end if;
          begin
            insert into public.trivia_post_facts (workspace_id, page_id, post_id, fact_id, position, rendered_text, claim_hash_snapshot, source_snapshot, verified_at_snapshot)
            values (workspace_one, page_one, post_one, fact_one, 2, 'Allocated duplicate on Page.', snapshot_one_refreshed ->> 'claim_hash', snapshot_one_refreshed, (snapshot_one_refreshed ->> 'verified_at')::timestamptz);
            raise exception 'allocated junction did not block Page uniqueness';
          exception when unique_violation then null;
          end;

          update public.trivia_post_facts
          set allocation_state = 'published', published_at = now()
          where id = usage_two;
          begin
            insert into public.trivia_post_facts (workspace_id, page_id, post_id, fact_id, position, rendered_text, claim_hash_snapshot, source_snapshot, verified_at_snapshot)
            values (workspace_one, page_one, post_one, fact_one, 2, 'Published duplicate on Page.', snapshot_one_refreshed ->> 'claim_hash', snapshot_one_refreshed, (snapshot_one_refreshed ->> 'verified_at')::timestamptz);
            raise exception 'published junction did not block Page uniqueness';
          exception when unique_violation then null;
          end;
          update public.trivia_facts set source_data = initial_source where id = fact_one;
          if (
            select source_snapshot = snapshot_one_refreshed
              and source_snapshot -> 'sources' <> source_data
            from public.trivia_post_facts
            join public.trivia_facts on trivia_facts.id = trivia_post_facts.fact_id
            where trivia_post_facts.id = usage_two
          ) is not true then
            raise exception 'source refresh rewrote published snapshot';
          end if;
          begin
            update public.trivia_post_facts set rendered_text = 'Changed published wording.' where id = usage_two;
            raise exception 'published wording changed';
          exception when check_violation then
            if sqlerrm <> 'TRIVIA_POST_FACT_PUBLISHED_IMMUTABLE' then raise; end if;
          end;
          begin
            update public.trivia_post_facts set allocation_state = 'released', released_at = now(), published_at = null where id = usage_two;
            raise exception 'published junction released';
          exception when check_violation then
            if sqlerrm <> 'TRIVIA_POST_FACT_PUBLISHED_IMMUTABLE' then raise; end if;
          end;
          begin
            update public.trivia_facts set numbers = '[{"value":"4","unit":null,"role":"count"}]'::jsonb where id = fact_one;
            raise exception 'published usage allowed canonical meaning mutation';
          exception when check_violation then
            if sqlerrm <> 'TRIVIA_FACT_REFERENCED_MEANING_IMMUTABLE' then raise; end if;
          end;

          insert into public.posts (
            workspace_id, page_id, niche_key, format_key, topic_key, interaction_goal,
            content_payload, generation_snapshot, content_hash
          ) values (
            workspace_one, page_one, 'trivia', 'single_subject_fast', 'animals', 'share',
            jsonb_set(payload, '{body,fact_public_id}', to_jsonb((select public_id::text from public.trivia_facts where id = fact_three))), generation, hash
          ) returning id into post_three;
          if exists (select 1 from public.trivia_post_facts where post_id = post_three) then
            raise exception 'JSON post body became relational fact membership';
          end if;
          insert into public.trivia_post_facts (
            workspace_id, page_id, post_id, fact_id, position, fact_role, rendered_text,
            claim_hash_snapshot, source_snapshot, verified_at_snapshot
          ) values (
            workspace_one, page_one, post_three, fact_three, 1, 'scientific',
            'a b c d e f g h i j k l m n o p q r',
            snapshot_three ->> 'claim_hash', snapshot_three, (snapshot_three ->> 'verified_at')::timestamptz
          );

          if not (select relrowsecurity from pg_class where oid = 'public.trivia_post_facts'::regclass)
            or has_table_privilege('anon', 'public.trivia_post_facts', 'select')
            or has_table_privilege('authenticated', 'public.trivia_post_facts', 'insert')
            or has_table_privilege('service_role', 'public.trivia_post_facts', 'select')
            or has_sequence_privilege('authenticated', 'public.trivia_post_facts_id_seq', 'usage')
            or has_function_privilege('authenticated', 'internal.is_valid_fact_usage_snapshot_v1(jsonb)', 'execute')
            or has_function_privilege('anon', 'internal.trivia_protect_referenced_fact_meaning_v1()', 'execute') then
            raise exception 'caller gained junction or helper access';
          end if;
          if to_regclass('public.trivia_post_facts_page_active_fact_unique_idx') is null
            or to_regclass('public.trivia_post_facts_fact_state_idx') is null
            or to_regclass('public.trivia_post_facts_page_state_recency_idx') is null
            or not exists (select 1 from pg_constraint where conname = 'trivia_post_facts_post_fk')
            or not exists (select 1 from pg_constraint where conname = 'trivia_post_facts_fact_fk')
            or not exists (select 1 from pg_trigger where tgname = 'trivia_post_facts_validate_usage_snapshot' and tgenabled = 'O') then
            raise exception 'junction catalog incomplete';
          end if;
          if (select count(*) from pg_tables where schemaname in ('public', 'internal') and tablename in (
            'workspaces', 'niches', 'pages', 'page_niche_configs', 'content_plans', 'content_plan_items',
            'posts', 'post_metrics', 'trivia_facts', 'trivia_post_facts', 'operation_ledger', 'rate_limit_buckets'
          )) <> 12
            or (select count(*) from pg_class join pg_namespace on pg_namespace.oid = pg_class.relnamespace
              where relkind = 'r' and relnamespace in ('public'::regnamespace, 'internal'::regnamespace)
                and relname in ('workspaces', 'niches', 'pages', 'page_niche_configs', 'content_plans', 'content_plan_items',
                  'posts', 'post_metrics', 'trivia_facts', 'trivia_post_facts', 'operation_ledger', 'rate_limit_buckets')
                and relrowsecurity) <> 12
            or (select count(*) from information_schema.routines where routine_schema = 'api') <> 0 then
            raise exception 'Phase 4 inventory or API boundary changed';
          end if;

          delete from public.trivia_post_facts where workspace_id in (workspace_one, workspace_two);
          delete from public.posts where workspace_id in (workspace_one, workspace_two);
          delete from public.page_niche_configs where workspace_id in (workspace_one, workspace_two);
          delete from public.trivia_facts where workspace_id in (workspace_one, workspace_two);
          delete from public.pages where id in (page_one, page_two);
          delete from public.workspaces where id in (workspace_one, workspace_two);
          delete from public.niches where key = 'other_${suffix}';
          delete from auth.users where id in (owner_one, owner_two);
        end $$;
      `),
    ).not.toThrow();
  }, 60_000);
});
