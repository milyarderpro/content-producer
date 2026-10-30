import { localQuery as query } from './helpers/local-query.js';
import { describe, expect, it } from 'vitest';

describe('Phase 4 checkpoint 4.2 trivia fact schema', () => {
  it('enforces canonical scope, lifecycle shape, and caller isolation', () => {
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
          fact_one bigint;
          successor_one bigint;
          review jsonb := '{"schema_version":1,"identity_schema_version":1,"reviewed_at":"2026-10-09T00:00:00Z","evaluator":"chatgpt","decisions":[]}'::jsonb;
          source jsonb := '[{"schema_version":1,"url":"https://example.test/source","canonical_url":"https://example.test/source","title":"Test source","publisher":"Test publisher","tier":"A","source_type":"official","accessed_at":"2026-10-09T00:00:00Z","published_at":null,"updated_at":null,"as_of":null,"language":"en","supports":"Supports the complete test proposition.","independence_group":"test-source"}]'::jsonb;
        begin
          insert into auth.users (
            instance_id, id, aud, role, email, encrypted_password,
            email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at
          ) values
            ('00000000-0000-0000-0000-000000000000', owner_one, 'authenticated', 'authenticated', 'phase4-fact-one-${suffix}@example.test', 'x', now(), '{}'::jsonb, '{}'::jsonb, now(), now()),
            ('00000000-0000-0000-0000-000000000000', owner_two, 'authenticated', 'authenticated', 'phase4-fact-two-${suffix}@example.test', 'x', now(), '{}'::jsonb, '{}'::jsonb, now(), now());

          insert into public.workspaces (owner_user_id, name, slug)
          values (owner_one, 'Trivia one', 'phase4-fact-one-${suffix}')
          returning id into workspace_one;
          insert into public.workspaces (owner_user_id, name, slug, is_active)
          values (owner_two, 'Trivia two', 'phase4-fact-two-${suffix}', false)
          returning id into workspace_two;
          insert into public.pages (workspace_id, name, slug)
          values (workspace_one, 'Trivia one', 'phase4-fact-one-page-${suffix}')
          returning id into page_one;
          insert into public.pages (workspace_id, name, slug)
          values (workspace_two, 'Trivia two', 'phase4-fact-two-page-${suffix}')
          returning id into page_two;

          insert into public.trivia_facts (
            workspace_id, claim_text, normalized_claim, claim_hash,
            subject_key, relation_key, object_key, numbers, qualifiers,
            structured_key, structured_hash, topic_key, dedup_review_snapshot, source_data
          ) values (
            workspace_one, 'Octopuses have three hearts.', 'octopuses have three hearts.', repeat('a', 64),
            'octopus', 'has_count', '3', '[]'::jsonb, '{"comparison_direction":"none"}'::jsonb,
            'subject=octopus', repeat('b', 64), 'animals', review, source
          ) returning id into fact_one;

          if (select public_id is not null and search_vector @@ plainto_tsquery('simple', 'octopus') from public.trivia_facts where id = fact_one) is not true then
            raise exception 'fact identity or generated search vector missing';
          end if;

          begin
            insert into public.trivia_facts (
              workspace_id, claim_text, normalized_claim, claim_hash,
              subject_key, relation_key, object_key, numbers, qualifiers,
              structured_key, structured_hash, topic_key, dedup_review_snapshot, source_data
            ) values (
              workspace_one, 'OCTOPUSES have three hearts!', 'duplicate current claim.', repeat('a', 64),
              'duplicate', 'has_count', '3', '[]'::jsonb, '{"comparison_direction":"none"}'::jsonb,
              'subject=duplicate', repeat('c', 64), 'animals', review, source
            );
            raise exception 'current claim hash duplicate accepted';
          exception when unique_violation then null;
          end;

          insert into public.trivia_facts (
            workspace_id, claim_text, normalized_claim, claim_hash,
            subject_key, relation_key, object_key, numbers, qualifiers,
            structured_key, structured_hash, topic_key, dedup_review_snapshot, source_data, verification_status
          ) values (
            workspace_one, 'OCTOPUSES have three hearts!', 'historical rejected claim.', repeat('a', 64),
            'historical', 'has_count', '3', '[]'::jsonb, '{"comparison_direction":"none"}'::jsonb,
            'subject=historical', repeat('d', 64), 'animals', review, source, 'rejected'
          );

          insert into public.trivia_facts (
            workspace_id, claim_text, normalized_claim, claim_hash,
            subject_key, relation_key, object_key, numbers, qualifiers,
            structured_key, structured_hash, structured_match_eligible, topic_key, dedup_review_snapshot, source_data
          ) values (
            workspace_one, 'Eligible structured claim.', 'eligible structured claim.', repeat('e', 64),
            'eligible', 'has_count', '3', '[{"value":"3","unit":null,"role":"count"}]'::jsonb, '{"comparison_direction":"none"}'::jsonb,
            'subject=eligible', repeat('f', 64), true, 'animals', review, source
          );
          begin
            insert into public.trivia_facts (
              workspace_id, claim_text, normalized_claim, claim_hash,
              subject_key, relation_key, object_key, numbers, qualifiers,
              structured_key, structured_hash, structured_match_eligible, topic_key, dedup_review_snapshot, source_data
            ) values (
              workspace_one, 'Second eligible structured claim.', 'second eligible structured claim.', repeat('1', 64),
              'eligible', 'has_count', '3', '[{"value":"3","unit":null,"role":"count"}]'::jsonb, '{"comparison_direction":"none"}'::jsonb,
              'subject=eligible-second', repeat('f', 64), true, 'animals', review, source
            );
            raise exception 'eligible structured duplicate accepted';
          exception when unique_violation then null;
          end;

          begin
            update public.trivia_facts set reservation_token = extensions.gen_random_uuid() where id = fact_one;
            raise exception 'available reservation shape accepted';
          exception when check_violation then null;
          end;
          begin
            update public.trivia_facts
            set reservation_status = 'reserved', reservation_token = '00000000-0000-4000-8000-000000000001',
                reserved_for_page_id = page_two, reserved_at = now(), reserved_until = now() + interval '30 minutes', reservation_context = '{}'::jsonb
            where id = fact_one;
            raise exception 'cross-workspace reservation page accepted';
          exception when foreign_key_violation or check_violation then null;
          end;
          begin
            update public.trivia_facts
            set reservation_status = 'reserved', reservation_token = '00000000-0000-5000-8000-000000000001',
                reserved_for_page_id = page_one, reserved_at = now(), reserved_until = now() + interval '30 minutes', reservation_context = '{}'::jsonb
            where id = fact_one;
            raise exception 'non-v4 reservation token accepted';
          exception when check_violation then null;
          end;
          begin
            update public.trivia_facts set supersedes_fact_id = fact_one where id = fact_one;
            raise exception 'self supersession accepted';
          exception when check_violation then null;
          end;

          insert into public.trivia_facts (
            workspace_id, claim_text, normalized_claim, claim_hash,
            subject_key, relation_key, object_key, numbers, qualifiers,
            structured_key, structured_hash, topic_key, dedup_review_snapshot, source_data,
            supersedes_fact_id, correction_reason, corrected_at
          ) values (
            workspace_one, 'Corrected octopus claim.', 'corrected octopus claim.', repeat('2', 64),
            'octopus', 'has_count', 'three', '[]'::jsonb, '{"comparison_direction":"none"}'::jsonb,
            'subject=octopus-corrected', repeat('3', 64), 'animals', review, source,
            fact_one, 'Canonical correction.', now()
          ) returning id into successor_one;
          begin
            insert into public.trivia_facts (
              workspace_id, claim_text, normalized_claim, claim_hash,
              subject_key, relation_key, object_key, numbers, qualifiers,
              structured_key, structured_hash, topic_key, dedup_review_snapshot, source_data,
              supersedes_fact_id, correction_reason, corrected_at
            ) values (
              workspace_one, 'Second corrected octopus claim.', 'second corrected octopus claim.', repeat('4', 64),
              'octopus', 'has_count', 'three', '[]'::jsonb, '{"comparison_direction":"none"}'::jsonb,
              'subject=octopus-corrected-second', repeat('5', 64), 'animals', review, source,
              fact_one, 'Second canonical correction.', now()
            );
            raise exception 'second current successor accepted';
          exception when unique_violation then null;
          end;

          if not (select relrowsecurity from pg_class where oid = 'public.trivia_facts'::regclass) then
            raise exception 'trivia facts RLS disabled';
          end if;
          if has_table_privilege('anon', 'public.trivia_facts', 'select')
            or has_table_privilege('authenticated', 'public.trivia_facts', 'insert')
            or has_table_privilege('service_role', 'public.trivia_facts', 'select')
            or has_sequence_privilege('authenticated', 'public.trivia_facts_id_seq', 'usage') then
            raise exception 'caller privilege granted';
          end if;
          if to_regclass('public.trivia_facts_current_claim_hash_key') is null
            or to_regclass('public.trivia_facts_current_eligible_structured_hash_key') is null
            or to_regclass('public.trivia_facts_current_successor_key') is null then
            raise exception 'required trivia fact index missing';
          end if;

          delete from public.trivia_facts where workspace_id in (workspace_one, workspace_two);
          delete from public.pages where id in (page_one, page_two);
          delete from public.workspaces where id in (workspace_one, workspace_two);
          delete from auth.users where id in (owner_one, owner_two);
        end $$;
      `),
    ).not.toThrow();
  }, 60_000);
});
