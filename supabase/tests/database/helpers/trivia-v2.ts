import { randomUUID } from 'node:crypto';
import { cleanup as legacyCleanup, json, quote, row, rpc, sql } from './trivia-rpc.js';
import type { TriviaFixture } from './trivia-rpc.js';
import { time } from './trivia-rpc.js';

export function cleanup(f: TriviaFixture): void {
  sql(`delete from internal.content_plan_item_events where workspace_id=(select id from public.workspaces where public_id='${f.workspace}');
    delete from internal.post_write_history where workspace_id=(select id from public.workspaces where public_id='${f.workspace}');
    delete from public.post_metrics where workspace_id=(select id from public.workspaces where public_id='${f.workspace}');
    delete from public.trivia_post_facts where workspace_id=(select id from public.workspaces where public_id='${f.workspace}');
    delete from public.posts where workspace_id=(select id from public.workspaces where public_id='${f.workspace}');
    delete from public.trivia_fact_evidence_v2 where workspace_id=(select id from public.workspaces where public_id='${f.workspace}');`);
  legacyCleanup(f);
}

export function draft(f: TriviaFixture, identities?: Array<{ fact_public_id: string; canonical_claim: string }>,
  fixtureLabel = 'Fixture jar') {
  const content = {
    schema_version: 2, hook: 'Fixture jars',
    body: { facts: Array.from({ length: 5 }, (_, i) => ({ position: i + 1,
      text: identities?.[i]?.canonical_claim ?? (fixtureLabel === 'Fixture jar'
        ? `${fixtureLabel} ${i + 1} has a blue lid.`
        : `${Array.from({ length: 7 }, () => randomUUID().slice(0, 8)).join(' ')}.`) })) },
    cta: 'Which jar stands out?', canva_copy: '', caption: 'Fixture only.',
    hashtags: ['#Fixture'], render_style: 'plain_lines', text_metrics: {},
  };
  content.canva_copy = [content.hook, ...content.body.facts.map(x => x.text), content.cta].join('\n\n');
  const facts = content.body.facts.map(x => ({ position: x.position,
    candidate_key: `jar_${x.position}`, claim_text: x.text,
    source_url: `https://example.org/fixture/jar-${x.position}`,
    dedup: { complete: true, decision: identities ? 'same' : 'distinct',
      fact_public_id: identities?.[x.position - 1]?.fact_public_id ?? null,
      reviews: [] as Array<{ fact_public_id: string; decision: string }> },
  }));
  const config = row<{ id: string }>(`select n.public_id id from public.page_niche_configs n
    join public.pages p on p.id=n.page_id where p.public_id='${f.page}'`).id;
  const read = rpc(f, `api.trivia_find_similar_facts_v2(2,'${f.workspace}','${f.page}',${json(
    facts.map(x => ({ candidate_key: x.candidate_key, claim_text: x.claim_text })),
  )})`);
  if (identities) {
    (read.data.candidates as Array<{ matches: Array<{ fact_public_id: string }> }>).forEach((c, i) => {
      facts[i]!.dedup.reviews = c.matches.map(x => ({ fact_public_id: x.fact_public_id,
        decision: x.fact_public_id === identities[i]!.fact_public_id ? 'same' : 'distinct' }));
    });
  } else {
    (read.data.candidates as Array<{ matches: Array<{ fact_public_id: string }> }>).forEach((c, i) => {
      facts[i]!.dedup.reviews = c.matches.map(x => ({ fact_public_id: x.fact_public_id,
        decision: 'distinct' }));
    });
  }
  const r = rpc(f, `api.save_post_v2(2,'${f.workspace}','${randomUUID()}','${f.page}',
    'trivia','${config}',${quote(f.configTime)},${quote(read.data.catalog_version as string)},2,
    'themed_utility','food_storage_home','save',null,null,${json(facts)},${json(content)},
    ${json({ meaning_preserved: 'pass', caption_no_new_claim: 'pass', no_known_substantive_issue: 'pass' })})`);
  return r.data.post as { post_public_id: string; content_hash: string; revision: number };
}

export function post(id: string) {
  return row<{ revision: number; content_hash: string; status: string; system_checks: unknown;
    editorial_checks: unknown; approval_snapshot: unknown; quality_status: string }>(
    `select revision,content_hash,status,system_checks,editorial_checks,approval_snapshot,
      quality_status from public.posts where public_id='${id}'`,
  );
}

export function approve(f: TriviaFixture, id: string, key = randomUUID(), explicit = true) {
  const p = post(id);
  return `api.approve_post(1,'${f.workspace}','${key}','${id}',${p.revision},
    '${p.content_hash}',${explicit},'{}',null)`;
}

export function publish(f: TriviaFixture, id: string, key = randomUUID(), explicit = true) {
  const p = post(id);
  // Synthetic publication metadata: no Facebook request or real-world assertion.
  return `api.mark_post_posted(1,'${f.workspace}','${key}','${id}',${p.revision},
    '${p.content_hash}','2026-11-01T00:00:00Z','fixture-only',
    'https://example.org/fixture/publication',${explicit})`;
}

export async function overlap(f: TriviaFixture, first: string, second: string) {
  const { callerStatement, session, waitForSession } = await import('./trivia-rpc.js');
  const a = `p5-holder-${randomUUID()}`;
  const b = `p5-waiter-${randomUUID()}`;
  const holder = session(`begin; set application_name='${a}';
    ${callerStatement(f.owner, first)} select pg_sleep(1.2); commit;`);
  await waitForSession(a);
  const waiter = session(`begin; set application_name='${b}';
    ${callerStatement(f.owner, second)} commit;`);
  await waitForSession(b, "wait_event_type='Lock'");
  return Promise.all([holder, waiter]);
}

export function firstFact(id: string) {
  return row<{ id: string; claim: string; url: string | null }>(`select f.public_id id,f.claim_text claim,e.source_url url
    from public.trivia_post_facts j join public.trivia_facts f on f.id=j.fact_id
    left join public.trivia_fact_evidence_v2 e on e.fact_id=f.id and e.workspace_id=f.workspace_id
    where j.post_id=(select id from public.posts where public_id='${id}') and j.is_current
    order by j.position limit 1`);
}

export function reverify(f: TriviaFixture, fact: string, claim: string,
  url = 'https://example.org/fixture/updated', expected = time(fact), key = randomUUID()) {
  return `api.trivia_reverify_fact(2,'${f.workspace}','${key}','${fact}',
    ${quote(expected)}::text,${quote(claim)},${quote(url)})`;
}

export function correct(f: TriviaFixture, fact: string, successor: unknown = null,
  catalog: string | null = null, expected = time(fact), key = randomUUID(), explicit = true) {
  return `api.trivia_correct_fact(2,'${f.workspace}','${key}','${fact}',${quote(expected)}::text,
    '${successor ? 'supersede' : 'invalidate'}','Owner confirms correction',
    ${successor ? json(successor) : 'null'},${explicit},${catalog === null ? 'null' : quote(catalog)})`;
}
