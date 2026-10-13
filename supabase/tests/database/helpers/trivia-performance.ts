import { randomUUID } from 'node:crypto';
import {
  candidate,
  factInput,
  reserve,
  release,
  rpc,
  json,
  row,
  sql,
  callerStatement,
  type TriviaFixture,
} from './trivia-rpc.js';

export function populateSearch(f: TriviaFixture) {
  const c = candidate();
  const first = rpc(f, reserve(f, [factInput(c)]));
  rpc(f, release(f, first.data.reservation_token as string));
  const id = (first.data.facts as { fact_public_id: string }[])[0]!.fact_public_id;
  // Administrative volume only; target registration/release and all measurements use api.
  sql(`insert into public.trivia_facts(workspace_id,claim_text,normalized_claim,claim_hash,
    subject_key,relation_key,object_key,numbers,qualifiers,structured_key,structured_hash,
    topic_key,dedup_review_snapshot,source_data)
    select workspace_id,'Synthetic audit corpus entity '||g,'',repeat('0',64),'audit_entity_'||g,
      relation_key,object_key,numbers,qualifiers,'',repeat('0',64),topic_key,dedup_review_snapshot,source_data
    from public.trivia_facts cross join generate_series(1,5000) g where public_id='${id}';
    analyze public.trivia_facts;`);
  const scope = `(select id from public.workspaces where public_id='${f.workspace}')`;
  const fixtureDigest = () =>
    row<{ n: number; digest: string }>(`select count(*) n,
      md5(jsonb_agg(to_jsonb(f) order by id)::text) digest from public.trivia_facts f where workspace_id=${scope}`);
  const expression = (inputs: unknown[] = [c]) =>
    `api.trivia_find_similar_facts(1,'${f.workspace}','${f.page}',${json(inputs)},20)`;
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
