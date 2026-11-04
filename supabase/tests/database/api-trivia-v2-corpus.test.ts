import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import {
  fixture,
  json,
  quote,
  row,
  rpc,
  sql,
} from './helpers/trivia-rpc.js';
import { cleanup } from './helpers/trivia-v2.js';

type CorpusCase = {
  case_id: string;
  reference: {
    fixture_identity_id: string;
    claim_text: string;
    origin: 'legacy_v1' | 'v2_native_synthetic';
    identity_status: string;
    usage: 'none' | 'draft' | 'published';
  };
  query_claim_text: string;
  label: 'same' | 'distinct' | 'uncertain';
  category: string;
  provenance: { v1_case_id: string | null };
};

function loadJsonl<T>(path: string): T[] {
  return readFileSync(path, 'utf8')
    .trim()
    .split('\n')
    .map((line) => JSON.parse(line) as T);
}

const corpus = [
  ...loadJsonl<CorpusCase>('supabase/tests/fixtures/trivia/dedup-v2/development.v1.jsonl'),
  ...loadJsonl<CorpusCase>('supabase/tests/fixtures/trivia/dedup-v2/holdout.v1.jsonl'),
];
const legacyGold = new Map(
  loadJsonl<{ fixture_id: string; left: Record<string, unknown> }>(
    'supabase/tests/fixtures/trivia/dedup-v1/cases.v1.jsonl',
  ).map((item) => [item.fixture_id, item.left]),
);

function insertNativeBatch(workspace: string, identities: CorpusCase[]): void {
  const input = identities.map((item) => ({
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
      cross join jsonb_to_recordset(${quote(JSON.stringify(input))}::jsonb)
        as x(claim_text text,status text)
      where w.public_id='${workspace}'
      returning workspace_id,id
  ) insert into public.trivia_fact_evidence_v2(workspace_id,fact_id,source_url)
    select workspace_id,id,'https://example.org/fixture/corpus' from inserted;`);
}

function insertHistoricalBatch(workspace: string, identities: CorpusCase[]): void {
  const input = identities.map((item) => ({ claim_text: item.reference.claim_text }));
  sql(`insert into public.trivia_facts (
    workspace_id,claim_text,normalized_claim,claim_hash,subject_key,relation_key,
    object_key,numbers,qualifiers,structured_key,structured_hash,topic_key,
    dedup_review_snapshot,source_data,verification_status,freshness_class,
    verified_at,expires_at
  ) select w.id,x.claim_text,'',repeat('0',64),
    internal.trivia_normalize_claim_v1(x.claim_text),'has_count','1','[{"value":"1","unit":"count","role":"count"}]'::jsonb,
    '{"negated":false,"comparison_direction":"none"}'::jsonb,'',repeat('0',64),
    'general_trivia',
    '{"schema_version":1,"identity_schema_version":1,"reviewed_at":"2026-10-09T00:00:00Z","evaluator":"chatgpt","decisions":[]}'::jsonb,
    '[{"schema_version":1,"url":"https://example.org/fixture/corpus","canonical_url":"https://example.org/fixture/corpus","title":"Historical corpus fixture","publisher":"Fixture","tier":"A","source_type":"official","accessed_at":"2026-10-09T00:00:00Z","published_at":null,"updated_at":null,"as_of":null,"language":"en","supports":"Local corpus fixture only.","independence_group":"fixture"}]'::jsonb,
    'verified','stable',now()-interval '1 day',now()+interval '30 days'
    from public.workspaces w
    cross join jsonb_to_recordset(${quote(JSON.stringify(input))}::jsonb)
      as x(claim_text text)
    where w.public_id='${workspace}';`);
}

describe('P3 frozen dedup-v2 corpus on the canonical database', () => {
  it('preserves 92 IDs, finds 40/40 paraphrases and 18/18 negative history, and reports complete truthfully', () => {
    const f = fixture();
    try {
      const identities = [...new Map(corpus.map((item) => [item.reference.fixture_identity_id, item])).values()];
      expect(corpus).toHaveLength(93);
      expect(identities).toHaveLength(92);
      const legacy = identities.filter((item) => item.reference.origin !== 'v2_native_synthetic');
      for (const item of legacy) {
        const gold = legacyGold.get(item.provenance.v1_case_id!);
        expect(gold).toBeDefined();
        expect(gold!.claim_text).toBe(item.reference.claim_text);
      }
      // The archived test retains v1 registration. These five historical
      // envelopes are seeded directly to verify v2 reads across the cutover.
      insertHistoricalBatch(f.workspace, legacy);
      insertNativeBatch(f.workspace, identities.filter((item) => item.reference.origin === 'v2_native_synthetic'));
      const readback = row<{ identities: Array<{ claim_text: string; public_id: string; status: string; v1: boolean }> }>(
        `select jsonb_agg(jsonb_build_object('claim_text',f.claim_text,'public_id',f.public_id,
          'status',f.verification_status,'v1',f.has_v1_envelope) order by f.public_id) identities
         from public.trivia_facts f where f.workspace_id=(select id from public.workspaces where public_id='${f.workspace}')`,
      ).identities;
      expect(readback).toHaveLength(92);
      const byClaim = new Map(readback.map((item) => [item.claim_text, item]));
      for (const item of identities) {
        const found = byClaim.get(item.reference.claim_text);
        expect(found).toEqual(expect.objectContaining({ status: item.reference.identity_status }));
        expect(found!.v1).toBe(item.reference.origin !== 'v2_native_synthetic');
      }
      const oracleInput = corpus.map((item) => ({ case_id: item.case_id, claim: item.query_claim_text }));
      const oracle = row<{ results: Record<string, { total: number; ids: string[] }> }>(`
        select jsonb_object_agg(c.case_id,jsonb_build_object('total',m.total,'ids',m.ids)) results
        from jsonb_to_recordset(${quote(JSON.stringify(oracleInput))}::jsonb)
          as c(case_id text,claim text)
        cross join lateral (
          select count(*)::integer total,
            coalesce(jsonb_agg(r.public_id order by r.rn) filter(where r.rn<=20),'[]'::jsonb) ids
          from (
            select f.public_id,
              row_number() over(order by (f.normalized_claim=internal.trivia_normalize_claim_v1(c.claim)) desc,
                coalesce(ts_rank_cd(f.search_vector,plainto_tsquery('simple',internal.trivia_normalize_claim_v1(c.claim))),0) desc,
                coalesce(extensions.similarity(f.normalized_claim,internal.trivia_normalize_claim_v1(c.claim)),0) desc,
                f.public_id) rn
            from public.trivia_facts f
            where f.workspace_id=(select id from public.workspaces where public_id='${f.workspace}')
              and (f.normalized_claim=internal.trivia_normalize_claim_v1(c.claim)
                or ts_rank_cd(f.search_vector,plainto_tsquery('simple',internal.trivia_normalize_claim_v1(c.claim)))>0
                or extensions.similarity(f.normalized_claim,internal.trivia_normalize_claim_v1(c.claim))>=0.20)
          ) r
        ) m`,
      ).results;
      const found = new Map<string, { complete: boolean; matches: Array<{ fact_public_id: string; status: string; reuse_eligibility: string }> }>();
      const versions = new Set<string>();
      for (let offset = 0; offset < corpus.length; offset += 9) {
        const batch = corpus.slice(offset, offset + 9);
        const response = rpc(
          f,
          `api.trivia_find_similar_facts_v2(2,'${f.workspace}','${f.page}',${json(batch.map((item) => ({ candidate_key: item.case_id, claim_text: item.query_claim_text })))})`,
        );
        expect(JSON.stringify(response.data)).not.toMatch(/"source(?:_url|_data)?"|https?:\/\//);
        versions.add(response.data.catalog_version as string);
        for (const item of response.data.candidates as Array<{ candidate_key: string; complete: boolean; matches: Array<{ fact_public_id: string; status: string; reuse_eligibility: string }> }>) {
          found.set(item.candidate_key, item);
        }
      }
      expect(versions.size).toBe(1);
      expect(found.size).toBe(93);
      let paraphraseFound = 0;
      let negativeHistoryFound = 0;
      for (const item of corpus) {
        const actual = found.get(item.case_id)!;
        const expected = oracle[item.case_id]!;
        expect(actual.complete, item.case_id).toBe(expected.total <= 20);
        expect(actual.matches.map((match) => match.fact_public_id), item.case_id).toEqual(expected.ids);
        const referenceId = byClaim.get(item.reference.claim_text)!.public_id;
        const reference = actual.matches.find((match) => match.fact_public_id === referenceId);
        if (item.category === 'paraphrase' && reference) paraphraseFound += 1;
        if (item.label === 'same' && ['invalidated', 'superseded', 'rejected'].includes(item.reference.identity_status)) {
          expect(reference, item.case_id).toEqual(expect.objectContaining({
            status: item.reference.identity_status,
            reuse_eligibility: 'not_eligible',
          }));
          negativeHistoryFound += 1;
        }
      }
      expect(paraphraseFound).toBe(40);
      expect(negativeHistoryFound).toBe(18);
    } finally {
      cleanup(f);
    }
  }, 60_000);
});
