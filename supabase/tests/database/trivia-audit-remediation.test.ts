import { spawnSync } from 'node:child_process';

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

describe('Phase 4 Batch A audit remediation', () => {
  it('closes identity, source, review, and reservation-context validation gaps', () => {
    expect(() =>
      query(`
        do $$
        declare
          source_a jsonb := '[{"schema_version":1,"url":"https://example.test/a","canonical_url":"https://example.test/a","title":"A source","publisher":"Publisher","tier":"A","source_type":"official","accessed_at":"2026-10-09T00:00:00Z","published_at":null,"updated_at":null,"as_of":null,"language":"en","supports":"Supports the proposition.","independence_group":"one"}]'::jsonb;
          source_social_d jsonb := '[{"schema_version":1,"url":"https://example.test/social","canonical_url":"https://example.test/social","title":"Social source","publisher":"Publisher","tier":"D","source_type":"social","accessed_at":"2026-10-09T00:00:00Z","published_at":null,"updated_at":null,"as_of":null,"language":"en","supports":"Discovery only source.","independence_group":"social"}]'::jsonb;
          source_social_a jsonb := '[{"schema_version":1,"url":"https://example.test/social-a","canonical_url":"https://example.test/social-a","title":"Social source","publisher":"Publisher","tier":"A","source_type":"social","accessed_at":"2026-10-09T00:00:00Z","published_at":null,"updated_at":null,"as_of":null,"language":"en","supports":"Invalid classification.","independence_group":"social"}]'::jsonb;
          source_museum_b jsonb := '[{"schema_version":1,"url":"https://example.test/museum","canonical_url":"https://example.test/museum","title":"Museum source","publisher":"Publisher","tier":"B","source_type":"museum","accessed_at":"2026-10-09T00:00:00Z","published_at":null,"updated_at":null,"as_of":null,"language":"en","supports":"Institutional reference.","independence_group":"museum"}]'::jsonb;
          source_museum_a jsonb := '[{"schema_version":1,"url":"https://example.test/museum-a","canonical_url":"https://example.test/museum-a","title":"Museum source","publisher":"Publisher","tier":"A","source_type":"museum","accessed_at":"2026-10-09T00:00:00Z","published_at":null,"updated_at":null,"as_of":null,"language":"en","supports":"Invalid tier.","independence_group":"museum"}]'::jsonb;
          source_secondary_c jsonb := '[{"schema_version":1,"url":"https://example.test/secondary","canonical_url":"https://example.test/secondary","title":"Secondary source","publisher":"Publisher","tier":"C","source_type":"reputable_secondary","accessed_at":"2026-10-09T00:00:00Z","published_at":null,"updated_at":null,"as_of":null,"language":"en","supports":"Secondary reporting.","independence_group":"secondary"}]'::jsonb;
          duplicate_review jsonb := '{"schema_version":1,"identity_schema_version":1,"reviewed_at":"2026-10-09T00:00:00Z","evaluator":"chatgpt","decisions":[{"candidate_fact_public_id":"00000000-0000-4000-8000-000000000001","decision":"distinct","reason":"Material number differs.","material_differences":["number","number"]}]}'::jsonb;
          context jsonb := '{"schema_version":1,"actor_user_id":"00000000-0000-4000-8000-000000000001","workspace_id":1,"page_id":2,"niche_key":"trivia","fact_reuse_scope":"page_unique","config_schema_version":1,"config_updated_at":"2026-10-09T00:00:00Z","ordered_fact_public_ids":["00000000-0000-4000-8000-000000000002"],"request_hash":"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","ttl_minutes":30,"reserved_at":"2026-10-09T00:00:00Z","reserved_until":"2026-10-09T00:30:00Z"}'::jsonb;
        begin
          if internal.trivia_canonical_numbers_v2('[{"value":"1","unit":"km","role":"distance"}]'::jsonb) <> '[{"role":"distance","unit":"kilometer","value":"1"}]'::jsonb then raise exception 'known unit was not canonicalized'; end if;
          if internal.trivia_canonical_numbers_v2('[{"value":"1.0","unit":"metres","role":"distance"},{"value":"2","unit":"km","role":"distance"}]'::jsonb) <> internal.trivia_canonical_numbers_v2('[{"value":"2.00","unit":"kilometres","role":"distance"},{"value":"1","unit":"m","role":"distance"}]'::jsonb) then raise exception 'canonical number ordering or aliases diverged'; end if;
          if internal.trivia_canonical_numbers_v2('[{"value":"1","unit":"made_up","role":"distance"}]'::jsonb) is not null then raise exception 'unknown unit accepted'; end if;
          if internal.trivia_canonical_numbers_v2('[{"value":"42","unit":"miles","role":"distance"},{"value":"20","unit":"hours","role":"duration"},{"value":"8","unit":"mph","role":"speed"}]'::jsonb) <> '[{"role":"distance","unit":"mile","value":"42"},{"role":"duration","unit":"hour","value":"20"},{"role":"speed","unit":"mile_per_hour","value":"8"}]'::jsonb then raise exception 'CR-007 aliases were not canonicalized'; end if;
          if internal.trivia_canonical_numbers_v2('[{"value":"1","unit":"proportion","role":"share"}]'::jsonb) is not null then raise exception 'unlisted unit accepted'; end if;
          if internal.trivia_canonical_qualifiers_v3('has_count','{}') is not null or internal.trivia_canonical_qualifiers_v3('has_count','{"comparison_direction":"increase"}') is not null or internal.trivia_canonical_qualifiers_v3('reduces_or_increases_risk','{"comparison_direction":"none"}') is not null or internal.trivia_canonical_qualifiers_v3('reduces_or_increases_risk','{"comparison_direction":"increase"}') is null then raise exception 'comparison direction manifest invalid'; end if;
          if not internal.is_valid_source_evidence_v2(source_a) or not internal.is_valid_source_evidence_v2(source_social_d) or not internal.is_valid_source_evidence_v2(source_museum_b) or not internal.is_valid_source_evidence_v2(source_secondary_c) or internal.is_valid_source_evidence_v2(source_social_a) or internal.is_valid_source_evidence_v2(source_museum_a) then raise exception 'source tier mapping invalid'; end if;
          if internal.is_valid_dedup_review_snapshot_v2(duplicate_review) then raise exception 'duplicate material differences accepted'; end if;
          if not internal.is_valid_reservation_context_v1(context,1,2,'2026-10-09T00:00:00Z','2026-10-09T00:30:00Z') then raise exception 'valid reservation context rejected'; end if;
          if internal.is_valid_reservation_context_v1('{}'::jsonb,1,2,'2026-10-09T00:00:00Z','2026-10-09T00:30:00Z') then raise exception 'empty reservation context accepted'; end if;
        end $$;
      `),
    ).not.toThrow();
  }, 60_000);
});
