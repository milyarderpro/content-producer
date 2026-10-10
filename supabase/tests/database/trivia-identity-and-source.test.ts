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

describe('Phase 4 checkpoint 4.3 identity and source policy', () => {
  it('derives deterministic identity and fails closed on invalid evidence', () => {
    const suffix = `${process.pid}${Date.now()}`;
    expect(() =>
      query(`
        do $$
        declare
          owner_id uuid := extensions.gen_random_uuid(); v_workspace_id bigint; fact_id bigint;
          review jsonb := '{"schema_version":1,"identity_schema_version":1,"reviewed_at":"2026-10-09T00:00:00Z","evaluator":"chatgpt","decisions":[]}'::jsonb;
          source_a jsonb := '[{"schema_version":1,"url":"https://example.test/a","canonical_url":"https://example.test/a","title":"Authoritative source","publisher":"Authority","tier":"A","source_type":"official","accessed_at":"2026-10-09T00:00:00Z","published_at":null,"updated_at":null,"as_of":null,"language":"en","supports":"Supports the complete proposition.","independence_group":"a"}]'::jsonb;
          source_sensitive jsonb := '[{"schema_version":1,"url":"https://example.test/a","canonical_url":"https://example.test/a","title":"Authoritative source","publisher":"Authority","tier":"A","source_type":"official","accessed_at":"2026-10-09T00:00:00Z","published_at":null,"updated_at":null,"as_of":null,"language":"en","supports":"Supports the complete proposition.","independence_group":"a"},{"schema_version":1,"url":"https://example.test/b","canonical_url":"https://example.test/b","title":"Independent source","publisher":"Independent authority","tier":"B","source_type":"professional_association","accessed_at":"2026-10-09T00:00:00Z","published_at":null,"updated_at":null,"as_of":null,"language":"en","supports":"Independently supports the proposition.","independence_group":"b"}]'::jsonb;
        begin
          if internal.trivia_normalize_claim_v1('OCTOPUSES  have three hearts!') <> 'octopus have 3 hearts' then raise exception 'normalization mismatch'; end if;
          if internal.trivia_normalize_claim_v1('Octopus has three hearts') = internal.trivia_normalize_claim_v1('Octopus does not have three hearts') then raise exception 'negation lost'; end if;
          if internal.trivia_claim_hash_v1('octopus have 3 hearts') !~ '^[0-9a-f]{64}$' then raise exception 'claim hash format'; end if;
          if not internal.trivia_relation_is_deterministic_safe_v1('has_count') or internal.trivia_relation_is_deterministic_safe_v1('causes') then raise exception 'relation classification mismatch'; end if;
          if internal.is_valid_source_evidence_v1('[{}]'::jsonb) then raise exception 'invalid source accepted'; end if;
          if not internal.is_valid_source_evidence_v1(source_a) or not internal.is_valid_dedup_review_snapshot_v1(review) then raise exception 'valid evidence rejected'; end if;

          insert into auth.users (instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
          values ('00000000-0000-0000-0000-000000000000',owner_id,'authenticated','authenticated','phase4-identity-${suffix}@example.test','x',now(),'{}','{}',now(),now());
          insert into public.workspaces(owner_user_id,name,slug) values(owner_id,'Identity','phase4-identity-${suffix}') returning id into v_workspace_id;
          insert into public.trivia_facts (
            workspace_id,claim_text,normalized_claim,claim_hash,subject_key,relation_key,object_key,numbers,qualifiers,structured_key,structured_hash,structured_match_eligible,topic_key,dedup_review_snapshot,source_data,verification_status,freshness_class,risk_class,verified_at,expires_at
          ) values (
            v_workspace_id,'OCTOPUSES have three hearts!','caller value',repeat('0',64),'octopus','has_count','3','[{"value":"3","unit":null,"role":"count"}]'::jsonb,'{"comparison_direction":"none"}'::jsonb,'caller key',repeat('1',64),false,'animals',review,source_a,'verified','stable','standard','2026-10-09T00:00:00Z','2027-01-01T00:00:00Z'
          ) returning id into fact_id;
          if (select normalized_claim = 'octopus have 3 hearts' and claim_hash = internal.trivia_claim_hash_v1('octopus have 3 hearts') and structured_match_eligible from public.trivia_facts where id=fact_id) is not true then raise exception 'caller derived values were trusted'; end if;
          begin
            insert into public.trivia_facts (workspace_id,claim_text,normalized_claim,claim_hash,subject_key,relation_key,object_key,numbers,qualifiers,structured_key,structured_hash,topic_key,dedup_review_snapshot,source_data,verification_status,freshness_class,risk_class,verified_at,expires_at)
            values (v_workspace_id,'Volatile record','x',repeat('2',64),'record','holds_record_by_metric_as_of','3','[{"value":"3","unit":null,"role":"count"}]'::jsonb,'{"comparison_direction":"equal"}'::jsonb,'x',repeat('3',64),'animals',review,source_a,'verified','volatile','standard','2026-10-09T00:00:00Z','2026-10-30T00:00:00Z');
            raise exception 'volatile fact without as_of accepted';
          exception when check_violation then if sqlerrm <> 'TRIVIA_SOURCE_POLICY_FAILED' then raise; end if;
          end;
          begin
            insert into public.trivia_facts (workspace_id,claim_text,normalized_claim,claim_hash,subject_key,relation_key,object_key,numbers,qualifiers,structured_key,structured_hash,topic_key,dedup_review_snapshot,source_data,verification_status,freshness_class,risk_class,verified_at,expires_at)
            values (v_workspace_id,'Sensitive fact','x',repeat('4',64),'sensitive','has_count','3','[{"value":"3","unit":null,"role":"count"}]'::jsonb,'{"comparison_direction":"none"}'::jsonb,'x',repeat('5',64),'animals',review,source_a,'verified','stable','sensitive','2026-10-09T00:00:00Z','2026-11-01T00:00:00Z');
            raise exception 'single-source sensitive fact accepted';
          exception when check_violation then if sqlerrm <> 'TRIVIA_SOURCE_POLICY_FAILED' then raise; end if;
          end;
          insert into public.trivia_facts (workspace_id,claim_text,normalized_claim,claim_hash,subject_key,relation_key,object_key,numbers,qualifiers,structured_key,structured_hash,topic_key,dedup_review_snapshot,source_data,verification_status,freshness_class,risk_class,verified_at,expires_at)
          values (v_workspace_id,'Sensitive fact with evidence','x',repeat('6',64),'sensitive','has_count','4','[{"value":"4","unit":null,"role":"count"}]'::jsonb,'{"comparison_direction":"none"}'::jsonb,'x',repeat('7',64),'animals',review,source_sensitive,'verified','stable','sensitive','2026-10-09T00:00:00Z','2026-11-01T00:00:00Z');
          if has_function_privilege('authenticated','internal.trivia_normalize_claim_v1(text)','execute') or has_function_privilege('anon','internal.is_valid_source_evidence_v1(jsonb)','execute') then raise exception 'caller helper executable'; end if;
          delete from public.trivia_facts where public.trivia_facts.workspace_id=v_workspace_id;
          delete from public.workspaces where id=v_workspace_id;
          delete from auth.users where id=owner_id;
        end $$;
      `),
    ).not.toThrow();
  }, 60_000);
});
