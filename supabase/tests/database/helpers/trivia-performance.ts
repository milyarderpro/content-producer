import { randomUUID } from 'node:crypto';
import {
  candidate,
  rpc,
  json,
  quote,
  row,
  sql,
  callerStatement,
  type TriviaFixture,
} from './trivia-rpc.js';

export function populateSearch(f: TriviaFixture) {
  const c = candidate();
  // Administrative native-v2 volume; all public measurements use the v2 Read RPC.
  sql(`with inserted as (
    insert into public.trivia_facts(workspace_id,claim_text,normalized_claim,claim_hash,
      has_v1_envelope,subject_key,relation_key,object_key,numbers,qualifiers,
      ontology_version,structured_key,structured_hash,topic_key,
      dedup_review_snapshot,source_data,freshness_class,risk_class,verification_status)
    select w.id,case when g=0 then ${quote(c.claim_text as string)}
      else 'Synthetic audit corpus entity '||g end,'',repeat('0',64),false,
      null,null,null,null,null,null,null,null,null,null,null,null,null,'needs_review'
    from public.workspaces w cross join generate_series(0,5000) g
    where w.public_id='${f.workspace}' returning workspace_id,id
  ) insert into public.trivia_fact_evidence_v2(workspace_id,fact_id,source_url)
    select workspace_id,id,'https://example.org/fixture/performance' from inserted;
    analyze public.trivia_facts;`);
  const scope = `(select id from public.workspaces where public_id='${f.workspace}')`;
  const fixtureDigest = () =>
    row<{ n: number; digest: string }>(`select count(*) n,
      md5(jsonb_agg(to_jsonb(f) order by id)::text) digest from public.trivia_facts f where workspace_id=${scope}`);
  const expression = (inputs: unknown[] = [c]) =>
    `api.trivia_find_similar_facts_v2(2,'${f.workspace}','${f.page}',${json(inputs.map((input) => {
      const item = input as { candidate_key: string; claim_text: string };
      return { candidate_key: item.candidate_key, claim_text: item.claim_text };
    }))})`;
  const results = () =>
    [
      c,
      {
        ...c,
        candidate_key: 'corpus_exact',
        claim_text: 'Synthetic audit corpus entity 42',
        subject_key: 'audit_entity_42',
      },
      {
        ...c,
        candidate_key: 'corpus_fts',
        claim_text: 'Synthetic audit corpus entity',
        subject_key: 'absent_entity',
      },
      {
        ...c,
        candidate_key: 'anti_number',
        object_key: '4',
        numbers: [{ value: '4', unit: 'count', role: 'count' }],
      },
    ].map((input) => rpc(f, expression([input])));
  const measure = (inputs: unknown[] = [c]) => {
    rpc(f, expression(inputs));
    const samples: number[] = [];
    for (let i = 0; i < 12; i++) {
      const start = performance.now();
      rpc(f, expression(inputs));
      samples.push(performance.now() - start);
    }
    const sorted = [...samples].sort((a, b) => a - b);
    return {
      n: samples.length,
      samples_ms: samples,
      p95_ms: sorted[Math.ceil(sorted.length * 0.95) - 1]!,
      target_ms: 3000,
    };
  };
  const publicPlan = () =>
    sql(`begin;${callerStatement(f.owner, 'true', randomUUID())}
      explain(analyze,buffers) select ${expression()};rollback;`)
      .split('\n')
      .filter((x) => !x.startsWith('{"__rpc_result":'))
      .join('\n');
  const helperPlan = () =>
    sql(`begin;${callerStatement(f.owner, 'true')}
      set local role content_producer_api_owner;
      explain(analyze,buffers) select * from internal.trivia_candidates_v3(${scope},
      internal.trivia_candidate_v1(${json(c)}),'[]',20);rollback;`)
      .split('\n')
      .filter((x) => !x.startsWith('{"__rpc_result":'))
      .join('\n');
  return { c, fixtureDigest, expression, results, measure, publicPlan, helperPlan };
}
