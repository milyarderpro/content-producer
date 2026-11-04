import { readFileSync } from 'node:fs';

import { expect } from 'vitest';

import { fixture, json, quote, row, rpc, sql } from './trivia-rpc.js';
import { cleanup } from './trivia-v2.js';

type CorpusCase = {
  case_id: string;
  reference: {
    fixture_identity_id: string;
    claim_text: string;
    origin: 'legacy_v1' | 'v2_native_synthetic';
    identity_status: string;
  };
  query_claim_text: string;
  label: 'same' | 'distinct' | 'uncertain';
  category: string;
};

export function verifyV2CorpusSplit(
  split: 'development' | 'holdout',
  expected: { cases: number; paraphrases: number; negativeHistory: number },
): void {
  const cases = readFileSync(
    `supabase/tests/fixtures/trivia/dedup-v2/${split}.v1.jsonl`, 'utf8',
  ).trim().split('\n').map((line) => JSON.parse(line) as CorpusCase);
  expect(cases).toHaveLength(expected.cases);
  expect(new Set(cases.map((item) => item.case_id).values()).size).toBe(expected.cases);
  const identities = [...new Map(cases.map((item) => [item.reference.fixture_identity_id, item])).values()];
  const f = fixture();
  try {
    const historical = identities.filter((item) => item.reference.origin === 'legacy_v1');
    const native = identities.filter((item) => item.reference.origin === 'v2_native_synthetic');
    const oldClaims = historical.map((item) => ({ claim_text: item.reference.claim_text }));
    sql(`insert into public.trivia_facts (
      workspace_id,claim_text,normalized_claim,claim_hash,subject_key,relation_key,
      object_key,numbers,qualifiers,structured_key,structured_hash,topic_key,
      dedup_review_snapshot,source_data,verification_status,freshness_class,
      verified_at,expires_at
    ) select w.id,x.claim_text,'',repeat('0',64),
      internal.trivia_normalize_claim_v1(x.claim_text),'has_count','1',
      '[{"value":"1","unit":"count","role":"count"}]'::jsonb,
      '{"negated":false,"comparison_direction":"none"}'::jsonb,'',repeat('0',64),
      'general_trivia',
      '{"schema_version":1,"identity_schema_version":1,"reviewed_at":"2026-10-09T00:00:00Z","evaluator":"chatgpt","decisions":[]}'::jsonb,
      '[{"schema_version":1,"url":"https://example.org/fixture/corpus","canonical_url":"https://example.org/fixture/corpus","title":"Historical corpus fixture","publisher":"Fixture","tier":"A","source_type":"official","accessed_at":"2026-10-09T00:00:00Z","published_at":null,"updated_at":null,"as_of":null,"language":"en","supports":"Local corpus fixture only.","independence_group":"fixture"}]'::jsonb,
      'verified','stable',now()-interval '1 day',now()+interval '30 days'
      from public.workspaces w
      cross join jsonb_to_recordset(${quote(JSON.stringify(oldClaims))}::jsonb)
        as x(claim_text text)
      where w.public_id='${f.workspace}';`);
    const newClaims = native.map((item) => ({
      claim_text: item.reference.claim_text,
      status: item.reference.identity_status,
    }));
    sql(`with inserted as (
      insert into public.trivia_facts (
        workspace_id,claim_text,normalized_claim,claim_hash,has_v1_envelope,
        subject_key,relation_key,object_key,numbers,qualifiers,ontology_version,
        structured_key,structured_hash,topic_key,dedup_review_snapshot,
        source_data,freshness_class,risk_class,verification_status
      ) select w.id,x.claim_text,'',repeat('0',64),false,
        null,null,null,null,null,null,null,null,null,null,null,null,null,x.status
        from public.workspaces w
        cross join jsonb_to_recordset(${quote(JSON.stringify(newClaims))}::jsonb)
          as x(claim_text text,status text)
        where w.public_id='${f.workspace}'
        returning workspace_id,id
    ) insert into public.trivia_fact_evidence_v2(workspace_id,fact_id,source_url)
      select workspace_id,id,'https://example.org/fixture/corpus' from inserted;`);
    const lookup = row<{ values: Array<{ public_id: string; claim_text: string }> }>(`
      select jsonb_agg(jsonb_build_object('public_id',public_id,'claim_text',claim_text)) values
      from public.trivia_facts where workspace_id=(select id from public.workspaces
        where public_id='${f.workspace}')`).values;
    expect(lookup).toHaveLength(identities.length);
    const byClaim = new Map(lookup.map((item) => [item.claim_text, item.public_id]));
    let paraphrases = 0;
    let negativeHistory = 0;
    for (let offset = 0; offset < cases.length; offset += 9) {
      const batch = cases.slice(offset, offset + 9);
      const result = rpc(f, `api.trivia_find_similar_facts_v2(2,'${f.workspace}','${f.page}',${json(
        batch.map((item) => ({ candidate_key: item.case_id, claim_text: item.query_claim_text })),
      )})`);
      expect(JSON.stringify(result.data)).not.toMatch(/"source(?:_url|_data)?"|https?:\/\//);
      const found = new Map((result.data.candidates as Array<{
        candidate_key: string;
        matches: Array<{ fact_public_id: string; status: string; reuse_eligibility: string }>;
      }>).map((item) => [item.candidate_key, item]));
      expect(found.size).toBe(batch.length);
      for (const item of batch) {
        const referenceId = byClaim.get(item.reference.claim_text);
        expect(referenceId, item.case_id).toBeDefined();
        const reference = found.get(item.case_id)?.matches.find((match) => match.fact_public_id === referenceId);
        if (item.category === 'paraphrase') {
          expect(reference, item.case_id).toBeDefined();
          paraphrases++;
        }
        if (item.label === 'same' && ['invalidated', 'superseded', 'rejected']
          .includes(item.reference.identity_status)) {
          expect(reference, item.case_id).toEqual(expect.objectContaining({
            status: item.reference.identity_status,
            reuse_eligibility: 'not_eligible',
          }));
          negativeHistory++;
        }
      }
    }
    expect(paraphrases).toBe(expected.paraphrases);
    expect(negativeHistory).toBe(expected.negativeHistory);
  } finally {
    cleanup(f);
  }
}
