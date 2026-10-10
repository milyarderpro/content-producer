import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { gunzipSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';

import { goldCases } from '../fixtures/trivia/dedup-v1/gold-cases.js';

function query(sql: string): string {
  const result = spawnSync('pnpm', ['exec', 'supabase', 'db', 'query', '--local', sql], {
    cwd: process.cwd(),
    encoding: 'utf8',
    env: {
      ...process.env,
      SUPABASE_TELEMETRY_DISABLED: '1',
    },
  });

  if (result.status !== 0) throw new Error(`${result.stderr}\n${result.stdout}`);
  return result.stdout;
}

function sqlLiteral(value: string): string {
  return `'${value.replaceAll("'", "''")}'`;
}

describe('Phase 4 checkpoint 4.4 gold development gate', () => {
  it('returns deterministic, capped private candidates and retains its search indexes', () => {
    const suffix = `${process.pid}${Date.now()}`;

    expect(() =>
      query(`
        do $$
        declare
          owner_id uuid := extensions.gen_random_uuid();
          workspace_id_value bigint;
          exact_fact_id bigint;
          first_candidate_id bigint;
          candidate_count integer;
          second_run_candidate_ids bigint[];
          first_run_candidate_ids bigint[];
          review jsonb := '{"schema_version":1,"identity_schema_version":1,"reviewed_at":"2026-10-09T00:00:00Z","evaluator":"chatgpt","decisions":[]}'::jsonb;
          source jsonb := '[{"schema_version":1,"url":"https://example.test/candidate","canonical_url":"https://example.test/candidate","title":"Candidate source","publisher":"Test publisher","tier":"A","source_type":"official","accessed_at":"2026-10-09T00:00:00Z","published_at":null,"updated_at":null,"as_of":null,"language":"en","supports":"Supports the test proposition.","independence_group":"candidate-source"}]'::jsonb;
        begin
          insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
          values ('00000000-0000-0000-0000-000000000000', owner_id, 'authenticated', 'authenticated', 'phase4-candidate-${suffix}@example.test', 'x', now(), '{}'::jsonb, '{}'::jsonb, now(), now());
          insert into public.workspaces (owner_user_id, name, slug)
          values (owner_id, 'Candidate test', 'phase4-candidate-${suffix}')
          returning id into workspace_id_value;

          for i in 1..25 loop
            insert into public.trivia_facts (
              workspace_id, claim_text, normalized_claim, claim_hash,
              subject_key, relation_key, object_key, numbers, qualifiers,
              structured_key, structured_hash, topic_key, dedup_review_snapshot, source_data
            ) values (
              workspace_id_value, 'Test subject ' || i || ' has ' || i || ' markers', 'caller supplied', repeat('0', 64),
              'test-subject-' || i, 'has_count', i::text,
              jsonb_build_array(jsonb_build_object('value', i::text, 'unit', null, 'role', 'count')),
              '{"comparison_direction":"none"}'::jsonb, 'caller supplied', repeat('1', 64), 'animals', review, source
            ) returning id into exact_fact_id;
          end loop;

          select count(*), array_agg(fact_id)
          into candidate_count, first_run_candidate_ids
          from internal.trivia_find_candidates_v2(
            workspace_id_value,
            'animals',
            'Test subject 1 has 1 markers',
            'test-subject-1',
            'has_count',
            '1',
            '[{"value":"1","unit":null,"role":"count"}]'::jsonb,
            '{"comparison_direction":"none"}'::jsonb,
            source,
            100
          );
          select array_agg(fact_id)
          into second_run_candidate_ids
          from internal.trivia_find_candidates_v2(
            workspace_id_value,
            'animals',
            'Test subject 1 has 1 markers',
            'test-subject-1',
            'has_count',
            '1',
            '[{"value":"1","unit":null,"role":"count"}]'::jsonb,
            '{"comparison_direction":"none"}'::jsonb,
            source,
            100
          );
          select fact_id into first_candidate_id
          from internal.trivia_find_candidates_v2(
            workspace_id_value,
            'animals',
            'Test subject 1 has 1 markers',
            'test-subject-1',
            'has_count',
            '1',
            '[{"value":"1","unit":null,"role":"count"}]'::jsonb,
            '{"comparison_direction":"none"}'::jsonb,
            source,
            20
          )
          limit 1;

          if candidate_count <> 20 then raise exception 'candidate cap failed: %', candidate_count; end if;
          if first_run_candidate_ids is distinct from second_run_candidate_ids then raise exception 'candidate order was not deterministic'; end if;
          if first_candidate_id <> (select min(id) from public.trivia_facts where workspace_id = workspace_id_value) then raise exception 'exact candidate was not ranked first'; end if;
          if to_regclass('public.trivia_facts_search_vector_idx') is null
            or to_regclass('public.trivia_facts_normalized_claim_trgm_idx') is null
            or to_regclass('public.trivia_facts_workspace_verification_topic_idx') is null then
            raise exception 'candidate retrieval index missing';
          end if;
          if has_function_privilege('authenticated', 'internal.trivia_find_candidates_v2(bigint,text,text,text,text,text,jsonb,jsonb,jsonb,integer)', 'execute') then
            raise exception 'candidate helper became caller executable';
          end if;

          delete from public.trivia_facts where workspace_id = workspace_id_value;
          delete from public.workspaces where id = workspace_id_value;
          delete from auth.users where id = owner_id;
        end $$;
      `),
    ).not.toThrow();
  }, 60_000);

  it('validates fixture provenance, editorial evidence, quotas, and canonical unordered uniqueness', () => {
    expect(goldCases).toHaveLength(150);
    expect(goldCases.every((item) => item.fixture_manifest_version === 2)).toBe(true);
    expect(goldCases.filter((item) => item.split === 'development')).toHaveLength(105);
    expect(goldCases.filter((item) => item.split === 'holdout')).toHaveLength(45);
    for (const dataset of ['curious_mind', 'dyk', 'daily_facts']) {
      expect(goldCases.filter((item) => item.provenance_dataset === dataset)).toHaveLength(50);
    }
    expect(goldCases.filter((item) => item.primary_category === 'exact')).toHaveLength(30);
    expect(goldCases.filter((item) => item.primary_category === 'paraphrase')).toHaveLength(40);
    expect(goldCases.filter((item) => item.primary_category === 'alias_unit')).toHaveLength(20);
    expect(goldCases.filter((item) => item.primary_category === 'anti_duplicate')).toHaveLength(50);
    expect(goldCases.filter((item) => item.primary_category === 'risky_review')).toHaveLength(10);
    expect(new Set(goldCases.map((item) => item.fixture_id)).size).toBe(150);
    expect(
      goldCases.every((item) => item.reviewer === 'ai' && item.review_status === 'ai_reviewed'),
    ).toBe(true);
    expect(
      goldCases.every(
        (item) =>
          item.rationale.length >= 30 &&
          !/the same proposition is expressed as|equivalent measurement wording|different condition boundary|it remains uncertain whether/i.test(
            item.rationale,
          ),
      ),
    ).toBe(true);
    expect(
      goldCases.every(
        (item) =>
          ![
            item.left.subject_key,
            item.left.object_key,
            item.right.subject_key,
            item.right.object_key,
          ].some((key) => /^pattern-/i.test(key)),
      ),
    ).toBe(true);

    const deterministicSafeRelations = new Set([
      'has_count',
      'has_measurement',
      'is_classified_as',
      'is_located_in',
      'originated_in_time_place',
      'has_named_part_or_property',
      'holds_record_by_metric_as_of',
    ]);
    for (const fixture of goldCases) {
      if (fixture.expected_signals.includes('exact_structured')) {
        expect(deterministicSafeRelations.has(fixture.left.relation_key)).toBe(true);
        expect(fixture.left.relation_key).toBe(fixture.right.relation_key);
      }
    }

    const datasets = {
      curious_mind: 'dataset-reference/post-coriousmind.txt',
      dyk: 'dataset-reference/post-dyk.txt',
      daily_facts: 'dataset-reference/post-dailyfacts.txt',
    } as const;
    const recordIds = Object.fromEntries(
      Object.entries(datasets).map(([dataset, path]) => [
        dataset,
        new Set(
          readFileSync(resolve(process.cwd(), path), 'utf8')
            .split('\n')
            .flatMap((line) => {
              try {
                return [JSON.parse(line) as { id?: string }];
              } catch {
                return [];
              }
            })
            .flatMap((record) => (record.id ? [record.id] : [])),
        ),
      ]),
    ) as Record<keyof typeof datasets, Set<string>>;
    for (const fixture of goldCases) {
      expect(
        fixture.provenance_record_ids.every((id) => recordIds[fixture.provenance_dataset].has(id)),
      ).toBe(true);
    }

    const cases = sqlLiteral(
      JSON.stringify(
        goldCases.map((item) => ({
          fixture_id: item.fixture_id,
          left: item.left,
          right: item.right,
        })),
      ),
    );
    expect(() =>
      query(`
        do $$
        declare
          item jsonb;
          left_key text;
          right_key text;
          unordered_key text;
          seen_keys text[] := array[]::text[];
        begin
          for item in select value from jsonb_array_elements(${cases}::jsonb) loop
            left_key := internal.trivia_claim_hash_v1(internal.trivia_normalize_claim_v1(item->'left'->>'claim_text')) || ':' || internal.trivia_build_structured_key_v3(item->'left'->>'subject_key', item->'left'->>'relation_key', item->'left'->>'object_key', internal.trivia_canonical_numbers_v2(item->'left'->'numbers'), internal.trivia_canonical_qualifiers_v3(item->'left'->>'relation_key', item->'left'->'qualifiers'));
            right_key := internal.trivia_claim_hash_v1(internal.trivia_normalize_claim_v1(item->'right'->>'claim_text')) || ':' || internal.trivia_build_structured_key_v3(item->'right'->>'subject_key', item->'right'->>'relation_key', item->'right'->>'object_key', internal.trivia_canonical_numbers_v2(item->'right'->'numbers'), internal.trivia_canonical_qualifiers_v3(item->'right'->>'relation_key', item->'right'->'qualifiers'));
            if left_key is null or right_key is null then
              raise exception 'fixture % does not canonicalize under database v3 semantics', item->>'fixture_id';
            end if;
            unordered_key := least(left_key, right_key) || '||' || greatest(left_key, right_key);
            if unordered_key = any(seen_keys) then
              raise exception 'duplicate unordered canonical fixture pair: %', item->>'fixture_id';
            end if;
            seen_keys := array_append(seen_keys, unordered_key);
          end loop;
        end $$;
      `),
    ).not.toThrow();
  });

  it('binds the frozen holdout to its source-controlled checksum', () => {
    const expectedChecksum = readFileSync(
      resolve(import.meta.dirname, '../fixtures/trivia/dedup-v1/holdout.sha256'),
      'utf8',
    ).trim();
    const actualChecksum = createHash('sha256')
      .update(
        `${goldCases
          .filter((item) => item.split === 'holdout')
          .map((item) => JSON.stringify(item))
          .join('\n')}\n`,
      )
      .digest('hex');

    expect(actualChecksum).toBe(expectedChecksum);

    const frozenArtifact = readFileSync(
      resolve(import.meta.dirname, '../fixtures/trivia/dedup-v1/holdout.full.jsonl.gz.base64'),
      'utf8',
    ).trim();
    const expectedContent = `${goldCases
      .filter((item) => item.split === 'holdout')
      .map((item) => JSON.stringify(item))
      .join('\n')}\n`;
    expect(gunzipSync(Buffer.from(frozenArtifact, 'base64')).toString('utf8')).toBe(
      expectedContent,
    );
  });

  it('evaluates every development fixture through the private database helper', () => {
    const development = goldCases.filter((item) => item.split === 'development');
    const suffix = `${process.pid}${Date.now()}`;
    const cases = sqlLiteral(
      JSON.stringify(
        development.map((item) => ({
          fixture_id: item.fixture_id,
          expected_decision: item.expected_decision,
          expected_signals: item.expected_signals,
          material_differences: item.material_differences,
          left: item.left,
          right: item.right,
        })),
      ),
    );

    expect(() =>
      query(`
        do $$
        declare
          item jsonb;
          owner_id uuid;
          workspace_id_value bigint;
          left_fact_id bigint;
          exact_total integer := 0; exact_hit integer := 0;
          structured_total integer := 0; structured_hit integer := 0;
          candidate_total integer := 0; candidate_hit integer := 0;
          unsafe_total integer := 0; unsafe_actions integer := 0;
          source jsonb := '[{"schema_version":1,"url":"https://example.test/evaluator","canonical_url":"https://example.test/evaluator","title":"Evaluator source","publisher":"Test publisher","tier":"A","source_type":"official","accessed_at":"2026-10-09T00:00:00Z","published_at":null,"updated_at":null,"as_of":null,"language":"en","supports":"Supports the test proposition.","independence_group":"evaluator"}]'::jsonb;
          review jsonb := '{"schema_version":1,"identity_schema_version":1,"reviewed_at":"2026-10-09T00:00:00Z","evaluator":"chatgpt","decisions":[]}'::jsonb;
        begin
          for item in select value from jsonb_array_elements(${cases}::jsonb) loop
            begin
              owner_id := extensions.gen_random_uuid();
              insert into auth.users (instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
              values ('00000000-0000-0000-0000-000000000000',owner_id,'authenticated','authenticated','phase4-evaluator-${suffix}-'||replace(item->>'fixture_id','_','-')||'@example.test','x',now(),'{}','{}',now(),now());
              insert into public.workspaces(owner_user_id,name,slug)
              values(owner_id,'Evaluator','phase4-evaluator-${suffix}-'||substr(md5(item->>'fixture_id'),1,12))
              returning id into workspace_id_value;
              insert into public.trivia_facts (workspace_id,claim_text,normalized_claim,claim_hash,subject_key,relation_key,object_key,numbers,qualifiers,structured_key,structured_hash,topic_key,dedup_review_snapshot,source_data)
              values (workspace_id_value,item->'left'->>'claim_text','caller',repeat('0',64),item->'left'->>'subject_key',item->'left'->>'relation_key',item->'left'->>'object_key',item->'left'->'numbers',item->'left'->'qualifiers','caller',repeat('1',64),item->'left'->>'topic_key',review,source)
              returning id into left_fact_id;

              if item->'expected_signals' ? 'exact_claim' then
                exact_total := exact_total + 1;
                if exists (select 1 from internal.trivia_find_candidates_v2(workspace_id_value,item->'right'->>'topic_key',item->'right'->>'claim_text',item->'right'->>'subject_key',item->'right'->>'relation_key',item->'right'->>'object_key',item->'right'->'numbers',item->'right'->'qualifiers',source,20) result where result.fact_id=left_fact_id and result.signals ? 'exact_claim') then exact_hit := exact_hit + 1; end if;
              end if;
              if item->'expected_signals' ? 'exact_structured' then
                structured_total := structured_total + 1;
                if exists (select 1 from internal.trivia_find_candidates_v2(workspace_id_value,item->'right'->>'topic_key',item->'right'->>'claim_text',item->'right'->>'subject_key',item->'right'->>'relation_key',item->'right'->>'object_key',item->'right'->'numbers',item->'right'->'qualifiers',source,20) result where result.fact_id=left_fact_id and result.signals ? 'exact_structured') then structured_hit := structured_hit + 1; end if;
              end if;
              if item->>'expected_decision'='same' then
                candidate_total := candidate_total + 1;
                if exists (select 1 from internal.trivia_find_candidates_v2(workspace_id_value,item->'right'->>'topic_key',item->'right'->>'claim_text',item->'right'->>'subject_key',item->'right'->>'relation_key',item->'right'->>'object_key',item->'right'->'numbers',item->'right'->'qualifiers',source,20) result where result.fact_id=left_fact_id) then candidate_hit := candidate_hit + 1; end if;
              else
                unsafe_total := unsafe_total + 1;
                if exists (select 1 from internal.trivia_find_candidates_v2(workspace_id_value,item->'right'->>'topic_key',item->'right'->>'claim_text',item->'right'->>'subject_key',item->'right'->>'relation_key',item->'right'->>'object_key',item->'right'->'numbers',item->'right'->'qualifiers',source,20) result where result.signals ? 'exact_claim' or result.signals ? 'exact_structured') then unsafe_actions := unsafe_actions + 1; end if;
              end if;
              delete from public.trivia_facts where workspace_id=workspace_id_value;
              delete from public.workspaces where id=workspace_id_value;
              delete from auth.users where id=owner_id;
            exception when others then
              delete from public.trivia_facts where workspace_id=workspace_id_value;
              delete from public.workspaces where id=workspace_id_value;
              delete from auth.users where id=owner_id;
              raise;
            end;
          end loop;
          if exact_hit<>exact_total or structured_hit<>structured_total or candidate_hit<>candidate_total or unsafe_actions<>0 then
            raise exception 'development metrics failed exact precision/recall %/% structured precision %/% recall@20 %/% unsafe auto-action %/%',exact_hit,exact_total,structured_hit,structured_total,candidate_hit,candidate_total,unsafe_actions,unsafe_total;
          end if;
        end $$;
      `),
    ).not.toThrow();
  }, 60_000);

  it('uses the expected indexes in actual exact, structured, FTS, and trigram plans', () => {
    const suffix = `${process.pid}${Date.now()}`;
    const email = `phase4-plan-${suffix}@example.test`;
    const slug = `phase4-plan-${suffix}`;
    const source = `'[{"schema_version":1,"url":"https://example.test/plan","canonical_url":"https://example.test/plan","title":"Plan source","publisher":"Test publisher","tier":"A","source_type":"official","accessed_at":"2026-10-09T00:00:00Z","published_at":null,"updated_at":null,"as_of":null,"language":"en","supports":"Supports the test proposition.","independence_group":"plan"}]'::jsonb`;
    const review = `'{"schema_version":1,"identity_schema_version":1,"reviewed_at":"2026-10-09T00:00:00Z","evaluator":"chatgpt","decisions":[]}'::jsonb`;

    try {
      expect(query('show enable_seqscan')).toMatch(/on/i);
      query(`
        do $$
        declare owner_id uuid := extensions.gen_random_uuid(); workspace_id_value bigint;
        begin
          insert into auth.users (instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
          values ('00000000-0000-0000-0000-000000000000',owner_id,'authenticated','authenticated','${email}','x',now(),'{}','{}',now(),now());
          insert into public.workspaces(owner_user_id,name,slug) values(owner_id,'Plan assertion','${slug}') returning id into workspace_id_value;
          insert into public.trivia_facts (workspace_id,claim_text,normalized_claim,claim_hash,subject_key,relation_key,object_key,numbers,qualifiers,structured_key,structured_hash,topic_key,dedup_review_snapshot,source_data)
          select workspace_id_value,
            case i when 1 then 'exactplanunique-${suffix}' when 2 then 'planftsunique-${suffix}' when 3 then 'trigramraretoken-${suffix}' else 'plan corpus row '||i||' common words' end,
            'caller',repeat('0',64),'plan-subject-'||i,'has_count',i::text,jsonb_build_array(jsonb_build_object('value',i::text,'unit',null,'role','count')),'{"comparison_direction":"none"}','caller',repeat('1',64),'animals',${review},${source}
          -- Verified separately with default planner settings: 20,000 rows
          -- naturally select the trigram index while remaining CI-practical.
          from generate_series(1, 20000) as series(i);
          analyze public.trivia_facts;
        end $$;
      `);

      const base = `(select id from public.workspaces where slug=${sqlLiteral(slug)})`;
      const exactPlan = query(
        `explain (analyze, buffers) select id from public.trivia_facts where workspace_id=${base} and verification_status in ('needs_review','verified') and claim_hash=internal.trivia_claim_hash_v1(internal.trivia_normalize_claim_v1('exactplanunique-${suffix}')) and normalized_claim=internal.trivia_normalize_claim_v1('exactplanunique-${suffix}')`,
      );
      const structuredPlan = query(
        `explain (analyze, buffers) select id from public.trivia_facts where workspace_id=${base} and verification_status in ('needs_review','verified') and structured_match_eligible and structured_hash=internal.trivia_structured_hash_v1(internal.trivia_build_structured_key_v3('plan-subject-1','has_count','1','[{"value":"1","unit":null,"role":"count"}]'::jsonb,'{"comparison_direction":"none"}'::jsonb))`,
      );
      const ftsPlan = query(
        `explain (analyze, buffers) select id from public.trivia_facts where search_vector @@ plainto_tsquery('simple','planftsunique-${suffix}')`,
      );
      const trigramPlan = query(
        `explain (analyze, buffers) select id from public.trivia_facts where normalized_claim ilike '%trigramraretoken-${suffix}%'`,
      );

      expect(exactPlan).toContain('trivia_facts_current_claim_hash_key');
      expect(structuredPlan).toContain('trivia_facts_current_eligible_structured_hash_key');
      expect(ftsPlan).toContain('trivia_facts_search_vector_idx');
      expect(trigramPlan).toContain('trivia_facts_normalized_claim_trgm_idx');
    } finally {
      query(
        `do $$ begin delete from public.trivia_facts where workspace_id=(select id from public.workspaces where slug=${sqlLiteral(slug)}); delete from public.workspaces where slug=${sqlLiteral(slug)}; delete from auth.users where email=${sqlLiteral(email)}; end $$;`,
      );
    }
  }, 90_000);
});
