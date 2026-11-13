import { acceptanceCases, runEditorialAcceptance } from './helpers/editorial-acceptance.js';
import { randomUUID } from 'node:crypto';
import * as ep from './helpers/editorial-post.js';
import { describe, expect, it } from 'vitest';
import { cancel, claim, createPlan, expire, fail, renew, retry } from './helpers/plan-lifecycle.js';
import { approve as approveV2, publish as publishV2 } from './helpers/trivia-v2.js';
import { callerStatement, cleanup as triviaCleanup, factInput, fixture, json, quote,
  release, reserve, row, rpc, secondPage, session, setReuse, sql, waitForSession,
} from './helpers/trivia-rpc.js';
import type { ClaimedItem, SessionResult } from './helpers/plan-lifecycle.js';

type Fixture = ReturnType<typeof fixture>;
type SaveInput = {
  key: string;
  time: string;
  catalog: string;
  config: string;
  format: string;
  topic: string;
  goal: string;
  plan: { plan_item_public_id: string; claim_token: string } | null;
  facts: Record<string, unknown>[];
  content: Record<string, unknown>;
  editorial: Record<string, string>;
};

function cleanup(f: Fixture): void {
  sql(`delete from internal.post_write_history where workspace_id=(select id from public.workspaces where public_id='${f.workspace}');
    delete from public.post_metrics where workspace_id=(select id from public.workspaces where public_id='${f.workspace}');
    delete from public.trivia_post_facts where workspace_id=(select id from public.workspaces where public_id='${f.workspace}');
    delete from public.posts where workspace_id=(select id from public.workspaces where public_id='${f.workspace}');
    delete from public.trivia_fact_evidence_v2 where workspace_id=(select id from public.workspaces where public_id='${f.workspace}');`);
  triviaCleanup(f);
}

function input(f: Fixture, label = 'blue', allowMatches = false): SaveInput {
  const config = row<{ id: string }>(`select n.public_id::text id from public.page_niche_configs n
    join public.pages p on p.id=n.page_id where p.public_id='${f.page}'`);
  const facts = Array.from({ length: 5 }, (_, i) => ({
    position: i + 1,
    candidate_key: `fixture_${label}_${i + 1}`,
    claim_text: `Fixture ${label} jar ${i + 1} has a blue lid.`,
    source_url: `https://example.org/fixture/${label}-jar-${i + 1}`,
    dedup: { complete: true, decision: 'distinct', fact_public_id: null, reviews: [] },
  }));
  const hook = 'Fixture jars';
  const cta = 'Which jar stands out?';
  const content = {
    schema_version: 2,
    hook,
    body: { facts: facts.map((x) => ({ position: x.position, text: x.claim_text })) },
    cta,
    canva_copy: [hook, ...facts.map((x) => x.claim_text), cta].join('\n\n'),
    caption: 'Fixture only.',
    hashtags: ['#Fixture'],
    render_style: 'plain_lines',
    text_metrics: {},
  };
  const read = rpc(f, `api.trivia_find_similar_facts_v2(2,'${f.workspace}','${f.page}',${json(
    facts.map((x) => ({ candidate_key: x.candidate_key, claim_text: x.claim_text })),
  )})`);
  expect((read.data.candidates as Array<{ complete: boolean; matches: unknown[] }>).every(
    (x) => x.complete && (allowMatches || x.matches.length === 0),
  )).toBe(true);
  return {
    key: randomUUID(), time: f.configTime, catalog: read.data.catalog_version as string,
    config: config.id, format: 'themed_utility', topic: 'food_storage_home', goal: 'save',
    plan: null, facts, content,
    editorial: {
      meaning_preserved: 'pass', caption_no_new_claim: 'pass',
      no_known_substantive_issue: 'pass',
    },
  };
}

function save(f: Fixture, v: SaveInput): string {
  return `api.save_post_v2(2,'${f.workspace}','${v.key}','${f.page}',
    'trivia','${v.config}',${quote(v.time)},${quote(v.catalog)},2,
    '${v.format}','${v.topic}','${v.goal}',null,${json(v.plan)},
    ${json(v.facts)},${json(v.content)},${json(v.editorial)})`;
}

function revise(f: Fixture, v: SaveInput, postId: string, revision: number,
  hash: string, reason = 'Improve the draft'): string {
  return `api.revise_post_v2(2,'${f.workspace}','${v.key}','${postId}',
    ${revision},'${hash}','${v.config}',${quote(v.time)},${quote(v.catalog)},2,
    '${v.format}','${v.topic}','${v.goal}',${json(v.facts)},${json(v.content)},
    ${json(v.editorial)},${quote(reason)})`;
}

function counts(f: Fixture) {
  return row<{ posts: number; facts: number; usage: number; evidence: number; completed: number }>(`select
    (select count(*) from public.posts where workspace_id=w.id) posts,
    (select count(*) from public.trivia_facts where workspace_id=w.id) facts,
    (select count(*) from public.trivia_post_facts where workspace_id=w.id) usage,
    (select count(*) from public.trivia_fact_evidence_v2 where workspace_id=w.id) evidence,
    (select count(*) from public.content_plan_items where workspace_id=w.id and status='completed') completed
    from public.workspaces w where w.public_id='${f.workspace}'`);
}

function sessionResponse(r: SessionResult) {
  const line = r.output.split('\n').find((x) => x.startsWith('{"__rpc_result":'));
  return line ? (JSON.parse(line) as { __rpc_result: ReturnType<typeof rpc> }).__rpc_result : null;
}

function replaceClaim(v: SaveInput, position: number, claim: string): void {
  v.facts[position - 1]!.claim_text = claim;
  (v.content.body as { facts: Array<{ text: string }> }).facts[position - 1]!.text = claim;
  v.content.canva_copy = [v.content.hook,
    ...(v.content.body as { facts: Array<{ text: string }> }).facts.map((x) => x.text),
    v.content.cta].join('\n\n');
}

function reviewCurrent(f: Fixture, v: SaveInput, samePositions: number[] = []): void {
  const candidates = v.facts.map((x) => ({ candidate_key: x.candidate_key, claim_text: x.claim_text }));
  const read = rpc(f, `api.trivia_find_similar_facts_v2(2,'${f.workspace}','${f.page}',${json(candidates)})`);
  v.catalog = read.data.catalog_version as string;
  (read.data.candidates as Array<{ matches: Array<{ fact_public_id: string; claim_text: string }> }>).forEach((c, i) => {
    const same = samePositions.includes(i + 1)
      ? c.matches.find((m) => m.claim_text === v.facts[i]!.claim_text) : undefined;
    if (samePositions.includes(i + 1)) expect(same).toBeDefined();
    v.facts[i]!.dedup = { complete: true, decision: same ? 'same' : 'distinct',
      fact_public_id: same?.fact_public_id ?? null,
      reviews: c.matches.map((m) => ({ fact_public_id: m.fact_public_id,
        decision: m.fact_public_id === same?.fact_public_id ? 'same' : 'distinct' })) };
  });
}

async function overlap(f: Fixture, first: string, second: string): Promise<[SessionResult, SessionResult]> {
  const holderName = `p4-holder-${randomUUID()}`;
  const waiterName = `p4-waiter-${randomUUID()}`;
  const holder = session(`begin; set application_name='${holderName}';
    ${callerStatement(f.owner, first)} select pg_sleep(1.2); commit;`);
  await waitForSession(holderName);
  const waiter = session(`begin; set application_name='${waiterName}';
    ${callerStatement(f.owner, second)} commit;`);
  await waitForSession(waiterName, "wait_event_type='Lock'");
  return Promise.all([holder, waiter]);
}

describe('P4-T1 atomic trivia v2 draft save', () => {
  it('creates one complete draft and replays the exact operation', () => {
    const f = fixture();
    try {
      const v = input(f);
      const first = rpc(f, save(f, v));
      expect(first.response_schema_version).toBe(2);
      expect(first.data.post).toEqual(expect.objectContaining({
        page_public_id: f.page, status: 'draft', revision: 1, content_schema_version: 2,
      }));
      const post = first.data.post as { post_public_id: string; content_hash: string };
      expect(post.content_hash).toMatch(/^[0-9a-f]{64}$/);
      expect(counts(f)).toEqual({ posts: 1, facts: 5, usage: 5, evidence: 5, completed: 0 });
      expect(row<{ status: string; quality: string; system_hash: string;
        editorial_hash: string; system_revision: number; editorial_revision: number;
        measured: boolean }>(`select status,quality_status quality,
          system_checks->>'content_hash' system_hash,
          editorial_checks->>'content_hash' editorial_hash,
          (system_checks->>'post_revision')::integer system_revision,
          (editorial_checks->>'post_revision')::integer editorial_revision,
          content_payload#>'{text_metrics,word_count}' is not null measured
          from public.posts where public_id='${post.post_public_id}'`)).toEqual({
        status: 'draft', quality: 'passed', system_hash: post.content_hash,
        editorial_hash: post.content_hash, system_revision: 1, editorial_revision: 1,
        measured: true,
      });
      const again = rpc(f, save(f, v));
      expect(again.data.replayed).toBe(true);
      expect((again.data.post as { post_public_id: string }).post_public_id).toBe(post.post_public_id);
    } finally { cleanup(f); }
  }, 30_000);

  it('rolls back URL, renderer, hard budget and editorial failures without partial rows', () => {
    const f = fixture();
    try {
      const base = input(f);
      const before = counts(f);
      const badUrl = structuredClone(base);
      badUrl.key = randomUUID();
      badUrl.facts[2] = { ...badUrl.facts[2], source_url: '' };
      expect(() => rpc(f, save(f, badUrl))).toThrow('VALIDATION_FAILED');
      expect(counts(f)).toEqual(before);

      const badCopy = structuredClone(base);
      badCopy.key = randomUUID();
      badCopy.content.canva_copy = 'Wrong rendered copy';
      expect(() => rpc(f, save(f, badCopy))).toThrow('CONTENT_RENDER_MISMATCH');
      expect(counts(f)).toEqual(before);

      const badBudget = structuredClone(base);
      badBudget.key = randomUUID();
      badBudget.content.hook = 'Fixture jars have exceptionally peculiar lids.';
      badBudget.content.canva_copy = [
        badBudget.content.hook,
        ...badBudget.facts.map((x) => x.claim_text),
        badBudget.content.cta,
      ].join('\n\n');
      expect(() => rpc(f, save(f, badBudget))).toThrow('CONTENT_BUDGET_EXCEEDED');
      expect(counts(f)).toEqual(before);

      const badEditorial = structuredClone(base);
      badEditorial.key = randomUUID();
      badEditorial.editorial.meaning_preserved = 'needs_revision';
      expect(() => rpc(f, save(f, badEditorial))).toThrow('EDITORIAL_REVIEW_REQUIRED');
      expect(counts(f)).toEqual(before);

      expect(() => rpc(f, save(f, base), f.other)).toThrow('OWNER_ACCESS_REQUIRED');
      expect(counts(f)).toEqual(before);
    } finally { cleanup(f); }
  }, 30_000);

  it('rejects stale catalog and config under workspace lock', () => {
    const f = fixture();
    try {
      const stale = input(f);
      sql(`with inserted as (
        insert into public.trivia_facts(workspace_id,claim_text,normalized_claim,
          claim_hash,has_v1_envelope,subject_key,relation_key,object_key,numbers,
          qualifiers,ontology_version,structured_key,structured_hash,topic_key,
          dedup_review_snapshot,source_data,freshness_class,risk_class)
        select id,'Unrelated moonstone fixture marker.','',repeat('0',64),false,
          null,null,null,null,null,null,null,null,null,null,null,null,null
        from public.workspaces where public_id='${f.workspace}'
        returning workspace_id,id
      ) insert into public.trivia_fact_evidence_v2(workspace_id,fact_id,source_url)
        select workspace_id,id,'https://example.org/fixture/unrelated' from inserted;`);
      const before = counts(f);
      expect(() => rpc(f, save(f, stale))).toThrow('FACT_CATALOG_CONFLICT');
      expect(counts(f)).toEqual(before);
      const current = input(f, 'copper', true);
      sql(`update public.page_niche_configs set updated_at=updated_at+interval '1 microsecond'
        where public_id='${current.config}'`);
      expect(() => rpc(f, save(f, current))).toThrow('PAGE_VERSION_CONFLICT');
      expect(counts(f)).toEqual(before);
    } finally { cleanup(f); }
  }, 30_000);

  it('completes a claimed plan item with its post and allocations in one commit', () => {
    const f = fixture();
    try {
      const plan = createPlan(f, 1);
      const claimed = rpc(f, claim(f, (plan.data.plan as { plan_public_id: string }).plan_public_id)) as unknown as {
        data: { claimed_items: Array<{ item: { plan_item_public_id: string }; claim_token: string }> };
      };
      const c = claimed.data.claimed_items[0]!;
      const v = input(f);
      v.format = 'single_subject_fast';
      v.topic = 'animals';
      v.goal = 'share';
      v.plan = { plan_item_public_id: c.item.plan_item_public_id, claim_token: c.claim_token };
      const result = rpc(f, save(f, v));
      expect((result.data.plan as { progress: { completed: number }; status: string }).progress.completed)
        .toBe(1);
      expect((result.data.plan as { status: string }).status).toBe('completed');
      expect(counts(f)).toEqual({ posts: 1, facts: 5, usage: 5, evidence: 5, completed: 1 });
      expect(row<{ events: number }>(`select count(*) events from internal.content_plan_item_events
        where item_public_id='${c.item.plan_item_public_id}' and event_type='completed'`).events)
        .toBe(1);
    } finally { cleanup(f); }
  }, 30_000);
});

describe('P4-T2 separate-session collisions and replay', () => {
  it('observes lock overlap for same-key replay and both commit orders of the same identity', async () => {
    const f = fixture();
    try {
      const deadlocks = row<{ n: number }>('select deadlocks n from pg_stat_database where datname=current_database()').n;
      const v = input(f, 'amber');
      const [a, b] = await overlap(f, save(f, v), save(f, v));
      expect([a.code, b.code]).toEqual([0, 0]);
      const first = sessionResponse(a)!;
      const replay = sessionResponse(b)!;
      expect(first.data.replayed).toBe(false);
      expect(replay.data.replayed).toBe(true);
      expect(replay.data.post).toEqual(first.data.post);
      expect(counts(f)).toEqual({ posts: 1, facts: 5, usage: 5, evidence: 5, completed: 0 });

      for (const winner of [0, 1]) {
        const left = input(f, `collision_${winner}`, true);
        reviewCurrent(f, left);
        const right = structuredClone(left);
        right.key = randomUUID();
        const expressions = [save(f, left), save(f, right)];
        const [held, waited] = await overlap(f, expressions[winner]!, expressions[1 - winner]!);
        expect(held.code).toBe(0);
        expect(sessionResponse(held)?.data.replayed).toBe(false);
        expect(waited.error).toBe('FACT_CATALOG_CONFLICT');
      }
      expect(counts(f)).toEqual({ posts: 3, facts: 15, usage: 15, evidence: 15, completed: 0 });
      expect(row<{ n: number }>('select deadlocks n from pg_stat_database where datname=current_database()').n)
        .toBe(deadlocks);
    } finally { cleanup(f); }
  }, 50_000);

  it('blocks overlapping fact sets across Pages, while another workspace has independent scope', async () => {
    const f = fixture();
    const other = fixture();
    try {
      const p2 = secondPage(f);
      const first = input(f, 'overlap');
      const second = input(p2, 'independent');
      replaceClaim(second, 3, first.facts[2]!.claim_text as string);
      reviewCurrent(p2, second);
      const [held, waited] = await overlap(f, save(f, first), save(p2, second));
      expect(held.code).toBe(0);
      expect(waited.error).toBe('FACT_CATALOG_CONFLICT');
      reviewCurrent(p2, second, [3]);
      second.key = randomUUID();
      expect(() => rpc(p2, save(p2, second))).toThrow('FACT_REUSE_BLOCKED');
      expect(counts(f)).toEqual({ posts: 1, facts: 5, usage: 5, evidence: 5, completed: 0 });

      const independent = input(other, 'overlap');
      expect(rpc(other, save(other, independent)).data.post).toEqual(expect.objectContaining({ status: 'draft' }));
      expect(counts(other)).toEqual({ posts: 1, facts: 5, usage: 5, evidence: 5, completed: 0 });
    } finally { cleanup(other); cleanup(f); }
  }, 35_000);

  it('allows page_unique reuse on another Page without duplicating canonical facts', () => {
    const base = fixture();
    try {
      const f = setReuse(base, 'page_unique');
      const second = setReuse(secondPage(f), 'page_unique');
      const first = input(f, 'shared');
      rpc(f, save(f, first));
      const repeat = input(second, 'shared', true);
      reviewCurrent(second, repeat, [1, 2, 3, 4, 5]);
      expect(rpc(second, save(second, repeat)).data.post).toEqual(expect.objectContaining({ status: 'draft' }));
      expect(counts(f)).toEqual({ posts: 2, facts: 5, usage: 10, evidence: 5, completed: 0 });
    } finally { cleanup(base); }
  }, 25_000);

  it('rejects retired v1 reservation and release without affecting v2 save', () => {
    const f = fixture();
    try {
      const before = counts(f);
      expect(() => rpc(f, reserve(f, [factInput()]))).toThrow('LOCAL_TEST_QUERY_FAILED');
      expect(() => rpc(f, release(f, randomUUID()))).toThrow('LOCAL_TEST_QUERY_FAILED');
      expect(counts(f)).toEqual(before);
      expect(rpc(f, save(f, input(f, 'v2-only'))).data.post).toEqual(
        expect.objectContaining({ status: 'draft' }),
      );
      expect(counts(f)).toEqual({ posts: 1, facts: 5, usage: 5, evidence: 5, completed: 0 });
    } finally { cleanup(f); }
  }, 25_000);

  it('keeps lost-response save certain on replay after claim is consumed; expired new claim rejects', async () => {
    const f = fixture();
    try {
      const plan = createPlan(f, 2);
      const planId = (plan.data.plan as { plan_public_id: string }).plan_public_id;
      const claimed = rpc(f, claim(f, planId, 2)) as unknown as {
        data: { claimed_items: Array<{ item: { plan_item_public_id: string }; claim_token: string }> };
      };
      const [firstItem, secondItem] = claimed.data.claimed_items;
      const v = input(f, 'lost');
      v.format = 'single_subject_fast'; v.topic = 'animals'; v.goal = 'share';
      v.plan = { plan_item_public_id: firstItem!.item.plan_item_public_id,
        claim_token: firstItem!.claim_token };
      const dispatch = await session(`begin; ${callerStatement(f.owner, save(f, v))} commit;`);
      expect(dispatch.code).toBe(0);
      const committedId = (sessionResponse(dispatch)!.data.post as { post_public_id: string }).post_public_id;
      // Simulate a transport that loses the response: retain only the operation key and payload.
      const prior = counts(f);
      const replay = rpc(f, save(f, v));
      expect(replay.data.replayed).toBe(true);
      expect((replay.data.post as { post_public_id: string }).post_public_id).toBe(committedId);
      expect(counts(f)).toEqual(prior);
      const newKeyForCompleted = structuredClone(v);
      newKeyForCompleted.key = randomUUID();
      reviewCurrent(f, newKeyForCompleted, [1, 2, 3, 4, 5]);
      expect(() => rpc(f, save(f, newKeyForCompleted))).toThrow('PLAN_ITEM_CLAIM_MISMATCH');
      expect(counts(f)).toEqual(prior);
      expect(row<{ n: number }>(`select count(*) n from internal.content_plan_item_events
        where item_public_id='${firstItem!.item.plan_item_public_id}' and event_type='completed'`).n).toBe(1);

      sql(`update public.content_plan_items set claimed_at=clock_timestamp()-interval '31 minutes',
        claim_expires_at=clock_timestamp()-interval '1 minute'
        where public_id='${secondItem!.item.plan_item_public_id}'`);
      const expired = input(f, 'expired', true);
      reviewCurrent(f, expired);
      expired.format = 'single_subject_fast'; expired.topic = 'animals'; expired.goal = 'share';
      expired.plan = { plan_item_public_id: secondItem!.item.plan_item_public_id,
        claim_token: secondItem!.claim_token };
      const before = counts(f);
      expect(() => rpc(f, save(f, expired))).toThrow('PLAN_ITEM_CLAIM_EXPIRED');
      expect(counts(f)).toEqual(before);
    } finally { cleanup(f); }
  }, 40_000);

  it('times out behind a held workspace lock and retries the same operation key safely', async () => {
    const f = fixture();
    try {
      const v = input(f, 'busy');
      const name = `p4-busy-${randomUUID()}`;
      const holder = session(`begin; set application_name='${name}';
        select id from public.workspaces where public_id='${f.workspace}' for no key update;
        select pg_sleep(2); commit;`);
      await waitForSession(name);
      const timedOut = await session(`begin; set local statement_timeout='250ms';
        ${callerStatement(f.owner, save(f, v))} commit;`);
      expect(timedOut.error).toBe('DATABASE_BUSY');
      expect(counts(f)).toEqual({ posts: 0, facts: 0, usage: 0, evidence: 0, completed: 0 });
      expect((await holder).code).toBe(0);
      expect(rpc(f, save(f, v)).data.replayed).toBe(false);
      expect(counts(f)).toEqual({ posts: 1, facts: 5, usage: 5, evidence: 5, completed: 0 });
    } finally { cleanup(f); }
  }, 30_000);

  it('rejects retired v1 post writes without affecting v2 draft creation', () => {
    const f = fixture();
    try {
      const legacyNames = row<{ n: number }>(`select count(*)::integer n from pg_proc p
        join pg_namespace ns on ns.oid=p.pronamespace where ns.nspname='api'
        and p.proname in ('save_post','revise_post')`).n;
      expect(legacyNames).toBe(0);
      expect(() => rpc(f, `api.save_post(1,'${f.workspace}')`)).toThrow('LOCAL_TEST_QUERY_FAILED');
      expect(() => rpc(f, `api.revise_post(1,'${f.workspace}')`)).toThrow('LOCAL_TEST_QUERY_FAILED');
      expect(counts(f).posts).toBe(0);
      expect((rpc(f, save(f, input(f, 'post_v2'))).data.post as { status: string }).status).toBe('draft');
      expect(counts(f).posts).toBe(1);
    } finally { cleanup(f); }
  }, 25_000);
});

describe('P4-T3 revise and version-aware readback', () => {
  it('keeps shared lifecycle, metrics and readback available for a v2 post', () => {
    const f = fixture();
    try {
      const created = rpc(f, save(f, input(f, 'shared')));
      const id = (created.data.post as { post_public_id: string }).post_public_id;
      rpc(f, approveV2(f, id));
      rpc(f, publishV2(f, id));
      const before = row<{ revision: number; content_hash: string }>(
        `select revision,content_hash from public.posts where public_id='${id}'`);
      const key = randomUUID();
      const metric = `api.record_post_performance(1,'${f.workspace}','${key}','${id}',
        '2026-11-03T00:00:00Z',${json({ views: 100, likes: 3 })},
        ${json({ source_type: 'facebook_ui', metric_definition_version: 1 })})`;
      const first = rpc(f, metric);
      expect(first.data.replayed).toBe(false);
      expect(rpc(f, metric).data.replayed).toBe(true);
      const history = rpc(f, `api.get_post_performance(1,'${f.workspace}','${id}',
        null,null,20,null)`);
      expect((history.data.snapshots as unknown[])).toHaveLength(1);
      const insights = rpc(f, `api.get_performance_insights(1,'${f.workspace}',
        '${f.page}','trivia',null,null,array['format']::text[],'views',5,20)`);
      expect(insights.response_schema_version).toBe(1);
      const read = rpc(f, `api.get_post(1,'${f.workspace}','${id}',true,true,true)`);
      expect((read.data.post as { content_schema_version: number }).content_schema_version).toBe(2);
      expect(row<{ revision: number; content_hash: string }>(
        `select revision,content_hash from public.posts where public_id='${id}'`)).toEqual(before);
    } finally { cleanup(f); }
  }, 30_000);

  it('revises a draft, preserves historical bindings, and reads current v2 evidence', () => {
    const f = fixture();
    try {
      const first = input(f, 'revise');
      const saved = rpc(f, save(f, first));
      const original = saved.data.post as { post_public_id: string; content_hash: string };
      const edit = structuredClone(first);
      edit.key = randomUUID();
      edit.facts[0]!.source_url = 'https://example.org/fixture/revise-updated-source';
      edit.content.caption = 'Fixture revised caption.';
      reviewCurrent(f, edit, [1, 2, 3, 4, 5]);
      const result = rpc(f, revise(f, edit, original.post_public_id, 1, original.content_hash));
      expect(result.data.post).toEqual(expect.objectContaining({
        revision: 2, status: 'draft', content_schema_version: 2,
      }));
      const revised = result.data.post as { content_hash: string };
      expect(revised.content_hash).not.toBe(original.content_hash);
      expect(rpc(f, revise(f, edit, original.post_public_id, 1, original.content_hash)).data.replayed)
        .toBe(true);
      const read = rpc(f, `api.get_post(1,'${f.workspace}','${original.post_public_id}',true,true,false)`);
      const post = read.data.post as Record<string, unknown>;
      expect(post.content_schema_version).toBe(2);
      expect(read.data.current_fact_warnings).toEqual([]);
      expect((post.content_payload as { caption: string }).caption).toBe('Fixture revised caption.');
      expect((post.editorial_checks as { checks: Record<string, string> }).checks.meaning_preserved)
        .toBe('pass');
      const bindings = post.fact_bindings as Array<{ allocation_state: string; source_snapshot: { source_url: string } }>;
      expect(bindings).toHaveLength(5);
      expect(bindings.filter((x) => x.allocation_state === 'allocated')).toHaveLength(5);
      expect(bindings.some((x) => x.source_snapshot.source_url.endsWith('updated-source'))).toBe(true);
      expect(row<{ n: number }>(`select count(*) n from public.trivia_post_facts
        where post_id=(select id from public.posts where public_id='${original.post_public_id}')
          and allocation_state='released' and not is_current`).n).toBe(5);
      expect(row<{ n: number }>(`select count(*) n from public.trivia_post_facts
        where post_id=(select id from public.posts where public_id='${original.post_public_id}')
          and source_snapshot->>'source_url'='https://example.org/fixture/revise-jar-1'`).n).toBe(1);
      expect(row<{ n: number }>(`select count(*) n from internal.post_write_history
        where post_id=(select id from public.posts where public_id='${original.post_public_id}')`).n).toBe(2);
      const listed = rpc(f, `api.list_posts(1,'${f.workspace}')`);
      expect((listed.data.items as Array<{ content_schema_version: number }>)[0]!.content_schema_version).toBe(2);
    } finally { cleanup(f); }
  }, 30_000);

  it('rejects stale revision/hash and releases unpublished allocations on discard', () => {
    const f = fixture();
    try {
      const first = input(f, 'discard');
      const saved = rpc(f, save(f, first));
      const post = saved.data.post as { post_public_id: string; content_hash: string };
      const edit = structuredClone(first);
      edit.key = randomUUID();
      reviewCurrent(f, edit, [1, 2, 3, 4, 5]);
      expect(() => rpc(f, revise(f, edit, post.post_public_id, 2, post.content_hash)))
        .toThrow('REVISION_CONFLICT');
      expect(() => rpc(f, revise(f, edit, post.post_public_id, 1, 'a'.repeat(64))))
        .toThrow('CONTENT_HASH_CONFLICT');
      expect(counts(f).usage).toBe(5);
      const discarded = rpc(f, `api.discard_post(1,'${f.workspace}','${randomUUID()}',
        '${post.post_public_id}',1,'Discard fixture',true)`);
      expect(discarded.data.status).toBe('discarded');
      expect(row<{ n: number }>(`select count(*) n from public.trivia_post_facts
        where post_id=(select id from public.posts where public_id='${post.post_public_id}')
          and allocation_state='allocated'`).n).toBe(0);
      expect(counts(f).usage).toBe(5);
    } finally { cleanup(f); }
  }, 30_000);

  it('replaces a changed claim and keeps schedule-only edits separate', () => {
    const f = fixture();
    try {
      const initial = input(f, 'meaning');
      const saved = rpc(f, save(f, initial));
      const post = saved.data.post as { post_public_id: string; content_hash: string };
      const edit = structuredClone(initial);
      edit.key = randomUUID();
      replaceClaim(edit, 5, 'Fixture purple jar 5 has a silver lid.');
      edit.facts[4]!.source_url = 'https://example.org/fixture/purple-jar-5';
      reviewCurrent(f, edit, [1, 2, 3, 4]);
      const revised = rpc(f, revise(f, edit, post.post_public_id, 1, post.content_hash));
      const current = revised.data.post as { content_hash: string };
      expect(counts(f)).toEqual({ posts: 1, facts: 6, usage: 10, evidence: 6, completed: 0 });
      const scheduled = rpc(f, `api.reschedule_post(1,'${f.workspace}','${randomUUID()}',
        '${post.post_public_id}',2,'2026-12-15T10:00:00Z','Schedule fixture')`);
      expect(scheduled.data.revision).toBe(3);
      expect(row<{ hash: string; schedule: string }>(`select content_hash hash,
        scheduled_at::text schedule from public.posts where public_id='${post.post_public_id}'`).hash)
        .toBe(current.content_hash);
      const read = rpc(f, `api.get_post(1,'${f.workspace}','${post.post_public_id}',true,true,false)`);
      expect((read.data.post as { revision: number }).revision).toBe(3);
    } finally { cleanup(f); }
  }, 30_000);

  it('returns a ready v2 draft to draft and invalidates its approval', () => {
    const f = fixture();
    try {
      const initial = input(f, 'ready');
      const saved = rpc(f, save(f, initial));
      const post = saved.data.post as { post_public_id: string; content_hash: string };
      sql(`update public.posts p set status='ready',ready_at=clock_timestamp(),
        approval_snapshot=jsonb_build_object('schema_version',1,
          'approved_revision',p.revision,'content_hash',p.content_hash,
          'approved_at',clock_timestamp())
        where public_id='${post.post_public_id}'`);
      const edit = structuredClone(initial);
      edit.key = randomUUID();
      edit.content.caption = 'Approved fixture revised.';
      reviewCurrent(f, edit, [1, 2, 3, 4, 5]);
      const result = rpc(f, revise(f, edit, post.post_public_id, 1, post.content_hash));
      expect(result.data.post).toEqual(expect.objectContaining({ status: 'draft', revision: 2 }));
      expect(row<{ status: string; approval: boolean; ready: boolean }>(`select status,
        approval_snapshot is null approval,ready_at is null ready from public.posts
        where public_id='${post.post_public_id}'`)).toEqual({
        status: 'draft', approval: true, ready: true,
      });
    } finally { cleanup(f); }
  }, 30_000);
});

describe('P4-T4 sequential draft plan and resume', () => {
  it('creates five themed drafts one at a time and resumes after partial failure and lost response', async () => {
    const f = fixture();
    try {
      const items = Array.from({ length: 5 }, (_, i) => ({
        position: i + 1, scheduled_at: null, topic_key: 'food_storage_home',
        format_key: 'themed_utility', interaction_goal: 'save', item_config: {},
      }));
      const create = `api.create_content_plan(1,'${f.workspace}','${randomUUID()}',
        '${f.page}','trivia',1,${json(items)},'Five food and home drafts.',null)`;
      const created = rpc(f, create);
      const planId = (created.data.plan as { plan_public_id: string }).plan_public_id;
      expect(rpc(f, create).data.replayed).toBe(true);
      const completed: string[] = [];
      const planRead = () => rpc(f, `api.get_content_plan(1,'${f.workspace}','${planId}')`);
      const next = () => (rpc(f, claim(f, planId, 1)).data.claimed_items as ClaimedItem[])[0]!;
      const draft = (item: ClaimedItem, n: number) => {
        const v = input(f, `batch_${n}`, n > 1);
        if (n > 1) reviewCurrent(f, v);
        v.plan = { plan_item_public_id: item.item.plan_item_public_id, claim_token: item.claim_token };
        return v;
      };
      for (let n = 1; n <= 3; n++) {
        const item = next();
        expect(item.item.position).toBe(n);
        const v = draft(item, n);
        const result = rpc(f, save(f, v));
        const id = (result.data.post as { post_public_id: string }).post_public_id;
        completed.push(id);
        expect((result.data.plan as { progress: { completed: number } }).progress.completed).toBe(n);
        expect((rpc(f, `api.get_post(1,'${f.workspace}','${id}')`).data.post as { status: string }).status)
          .toBe('draft');
      }
      expect((planRead().data.plan as { progress: { completed: number; pending: number } }).progress)
        .toEqual(expect.objectContaining({ completed: 3, pending: 2 }));
      const fourth = next();
      expect(fourth.item.position).toBe(4);
      rpc(f, fail(f, fourth));
      expect((planRead().data.plan as { progress: Record<string, number> }).progress)
        .toEqual(expect.objectContaining({ completed: 3, failed: 1, pending: 1 }));
      expect(() => rpc(f, `api.get_content_plan(1,'${f.workspace}','${planId}')`, f.other))
        .toThrow('OWNER_ACCESS_REQUIRED');
      expect(counts(f).posts).toBe(3);
      rpc(f, retry(f, fourth.item.plan_item_public_id));
      const reclaimed = next();
      expect(reclaimed.item.position).toBe(4);
      rpc(f, renew(f, reclaimed));
      const v4 = draft(reclaimed, 4);
      const dispatch = await session(`begin; ${callerStatement(f.owner, save(f, v4))} commit;`);
      expect(dispatch.code).toBe(0); // response deliberately ignored
      const fourthId = (planRead().data.items as Array<{
        position: number; active_post_public_id: string;
      }>).find((x) => x.position === 4)!.active_post_public_id;
      completed.push(fourthId);
      const beforeReplay = counts(f);
      const replay = rpc(f, save(f, v4));
      expect(replay.data.replayed).toBe(true);
      expect((replay.data.post as { post_public_id: string }).post_public_id).toBe(fourthId);
      expect(counts(f)).toEqual(beforeReplay);
      expect((rpc(f, `api.get_post(1,'${f.workspace}','${fourthId}')`).data.post as { status: string }).status)
        .toBe('draft');
      const fifth = next();
      expect(fifth.item.position).toBe(5);
      const v5 = draft(fifth, 5);
      completed.push((rpc(f, save(f, v5)).data.post as { post_public_id: string }).post_public_id);
      const final = planRead();
      expect((final.data.plan as { status: string; progress: Record<string, number> }).status).toBe('completed');
      expect((final.data.plan as { progress: Record<string, number> }).progress.completed).toBe(5);
      expect((final.data.items as Array<{ active_post_public_id: string }>).map((x) => x.active_post_public_id))
        .toEqual(completed);
      expect(row<{ n: number }>(`select count(*) n from public.posts where workspace_id=
        (select id from public.workspaces where public_id='${f.workspace}')
          and format_key='themed_utility' and topic_key='food_storage_home'
          and interaction_goal='save' and scheduled_at is null`).n).toBe(5);
    } finally { cleanup(f); }
  }, 70_000);

  it('reclaims an expired item across two chats and cancellation preserves completed drafts', async () => {
    const f = fixture();
    try {
      const plan = createPlan(f, 5);
      const planId = (plan.data.plan as { plan_public_id: string }).plan_public_id;
      const first = (rpc(f, claim(f, planId, 1)).data.claimed_items as ClaimedItem[])[0]!;
      expire(first);
      const secondSession = await session(`begin; ${callerStatement(f.owner, claim(f, planId, 1))} commit;`);
      expect(secondSession.code).toBe(0);
      const reclaimed = (sessionResponse(secondSession)!.data.claimed_items as ClaimedItem[])[0]!;
      expect(reclaimed.item.plan_item_public_id).toBe(first.item.plan_item_public_id);
      const stale = input(f, 'stale_claim');
      stale.format = 'single_subject_fast'; stale.topic = 'animals'; stale.goal = 'share';
      stale.plan = { plan_item_public_id: first.item.plan_item_public_id, claim_token: first.claim_token };
      expect(() => rpc(f, save(f, stale))).toThrow('PLAN_ITEM_CLAIM_MISMATCH');
      const valid = input(f, 'cancelled_plan', true);
      valid.format = 'single_subject_fast'; valid.topic = 'animals'; valid.goal = 'share';
      valid.plan = { plan_item_public_id: reclaimed.item.plan_item_public_id,
        claim_token: reclaimed.claim_token };
      const id = (rpc(f, save(f, valid)).data.post as { post_public_id: string }).post_public_id;
      const cancelled = rpc(f, cancel(f, planId));
      expect((cancelled.data.plan as { progress: Record<string, number> }).progress)
        .toEqual(expect.objectContaining({ completed: 1, cancelled: 4 }));
      expect(counts(f).posts).toBe(1);
      expect((rpc(f, `api.get_post(1,'${f.workspace}','${id}')`).data.post as { status: string }).status)
        .toBe('draft');
    } finally { cleanup(f); }
  }, 45_000);
});


// CR-062 task5: schema3 transactions and lifecycle on isolated owner fixtures.
describe('CR-062 editorial snapshot3 post workflow', () => {
  it.each([1, 10, 11, 12])('saves, reads, approves and publishes all %i positions with null goal', (n) => {
    const f = ep.editorialFixture();
    try {
      const v = ep.input(f, n); const p = ep.saved(f, v);
      expect(p.interaction_goal).toBeNull();
      expect(p.generation_snapshot).toMatchObject({ schema_version: 3, config_schema_version: 2,
        config_public_id: v.config, config_updated_at: v.time, profile_key: null,
        effective_rules_hash: v.context!.effective_rules_hash,
        editorial_definitions: { profile: { key: 'dyk' }, format: { key: v.format }, topic: { key: v.topic } } });
      expect(p.generation_snapshot.editorial_context.cta_actions).toBeNull();
      expect(p.fact_bindings).toHaveLength(n);
      expect(p.content_payload.body.facts).toEqual(v.content.body.facts);
      const approved = rpc(f, approveV2(f, p.post_public_id));
      expect(approved.data.status).toBe('ready');
      const posted = rpc(f, publishV2(f, p.post_public_id));
      expect(posted.data.published_fact_public_ids).toHaveLength(n);
      expect(ep.get(f, p.post_public_id).generation_snapshot).toEqual(p.generation_snapshot);
    } finally { cleanup(f); }
  }, 30_000);

  it.each(['curious_mind', 'dyk', 'daily_facts'])('keeps %s profile rules and original CTA on save/revise/readback', (profile) => {
    const f = ep.editorialFixture(profile);
    try {
      const v = ep.input(f, 6);
      v.content.cta = profile === 'daily_facts' ? 'Like the facts? Like the video and follow for more!'
        : profile === 'dyk' ? 'Which stood out? Like the video and tag a curious friend! ❤️'
        : 'Keep this one in mind. Follow for more discoveries.';
      ep.assemble(v.content);
      const p = ep.saved(f, v);
      expect(p.generation_snapshot.editorial_definitions.profile.key).toBe(profile);
      expect(p.content_payload.cta).toBe(v.content.cta);
      v.key = randomUUID(); v.goal = null; ep.review(f, v);
      const r = rpc(f, ep.revise(f, v, p));
      expect((r.data.post as { revision: number }).revision).toBe(2);
      expect(ep.get(f, p.post_public_id).interaction_goal).toBeNull();
    } finally { cleanup(f); }
  }, 30_000);

  it('retains multiline CTA before final fact, new labels and optional legacy annotation', () => {
    const f = ep.editorialFixture();
    try {
      const v = ep.input(f, 7); v.goal = 'follow';
      v.context!.cta_actions = ['react', 'tag', 'save', 'follow', 'send_to_a_friend'];
      v.content.cta = 'Like this?\nTag a friend.\nSave it.\nFollow for more! ❤️';
      v.content.cta_placement = { kind: 'after_fact', position: 6 }; ep.assemble(v.content);
      const p = ep.saved(f, v);
      expect(p.content_payload.cta).toBe(v.content.cta);
      expect(p.content_payload.canva_copy).toContain(v.content.cta + '\n\n' + v.facts[6]!.claim_text);
      expect(p.generation_snapshot.cta).toEqual({ text: v.content.cta, placement: v.content.cta_placement, actions: v.context!.cta_actions });
      expect(p.interaction_goal).toBe('follow');
      expect(p.generation_snapshot.editorial_context.cta_actions).toEqual(v.context!.cta_actions);
      const list = rpc(f, `api.list_posts(1,'${f.workspace}','${f.page}')`).data.items as Array<{ editorial_context: unknown; interaction_goal: string }>;
      expect(list[0]!.editorial_context).toEqual(p.generation_snapshot.editorial_context);
      expect(list[0]!.interaction_goal).toBe('follow');
      v.key = randomUUID(); delete v.goal; v.context!.cta_actions = []; ep.review(f, v);
      rpc(f, ep.revise(f, v, p));
      const revised = ep.get(f, p.post_public_id);
      expect(revised.interaction_goal).toBeNull();
      expect(revised.generation_snapshot.cta.actions).toEqual([]);
      expect(revised.content_hash).not.toBe(p.content_hash);
      expect(revised.fact_bindings.map(x => x.fact_public_id)).toEqual(p.fact_bindings.map(x => x.fact_public_id));
    } finally { cleanup(f); }
  }, 30_000);

  it('stores text above legacy length and 12 fact bindings, with server metrics authoritative', () => {
    const f = ep.editorialFixture();
    try {
      const v = ep.input(f, 12);
      v.facts[0]!.claim_text = 'x'.repeat(130);
      v.content.body.facts[0]!.text = v.facts[0]!.claim_text; ep.assemble(v.content); ep.review(f, v);
      const p = ep.saved(f, v);
      expect(p.fact_bindings[0]!.rendered_text).toHaveLength(130);
      expect(p.content_payload.text_metrics.fact_chars).toEqual([130, ...Array(11).fill(36)]);
      expect(p.fact_bindings[11]!.position).toBe(12);
      const bad = structuredClone(v); bad.key = randomUUID(); bad.content.text_metrics = { word_count: 1 };
      expect(() => rpc(f, ep.save(f, bad))).toThrow('CONTENT_PAYLOAD_INVALID');
    } finally { cleanup(f); }
  }, 30_000);

  it('rolls back stale versions, invalid references/architecture/labels and failed review atomically', () => {
    const f = ep.editorialFixture(); const foreign = ep.editorialFixture();
    try {
      const v = ep.input(f); const before = counts(f);
      const failures: Array<[string, (x: ep.Input) => void]> = [
        ['PAGE_VERSION_CONFLICT', x => { x.time = '2020-01-01T00:00:00.000000Z'; }],
        ['FACT_CATALOG_CONFLICT', x => { x.catalog = '999'; }],
        ['PAGE_VERSION_CONFLICT', x => { x.context!.effective_rules_hash = '0'.repeat(64); }],
        ['EDITORIAL_DEFINITION_UNAVAILABLE', x => { x.context!.format_ref = ep.definition(foreign, 'format', 'themed_curiosity').reference; }],
        ['EDITORIAL_DEFINITION_UNAVAILABLE', x => { x.context!.topic_ref = ep.definition(foreign, 'topic', 'nature_science').reference; }],
        ['PAGE_VERSION_CONFLICT', x => { x.context!.editorial_profile_ref = ep.definition(foreign, 'profile', 'dyk').reference; }],
        ['EDITORIAL_DEFINITION_UNAVAILABLE', x => { x.context!.architecture = 'single_subject'; }],
        ['PROFILE_UNSUPPORTED', x => { x.context!.profile_key = 'unregistered_density'; }],
        ['VALIDATION_FAILED', x => { x.context!.cta_actions = { primary: 'follow' }; }],
        ['VALIDATION_FAILED', x => { x.facts[0]!.dedup.complete = false; }],
        ['EDITORIAL_REVIEW_REQUIRED', x => { x.editorial.meaning_preserved = 'needs_revision'; }],
      ];
      for (const [error, mutate] of failures) {
        const bad = structuredClone(v); bad.key = randomUUID(); mutate(bad);
        expect(() => rpc(f, ep.save(f, bad))).toThrow(error);
        expect(counts(f)).toEqual(before);
      }
      const tooMany = ep.input(f, 13);
      expect(() => rpc(f, ep.save(f, tooMany))).toThrow('VALIDATION_FAILED');
      expect(counts(f)).toEqual(before);
      expect(row<{ n: number }>(`select count(*)::integer n from internal.operation_ledger l join public.workspaces w on w.id=l.workspace_id where w.public_id='${f.workspace}' and l.operation_name='save_post_v2'`).n).toBe(0);
      expect(() => rpc(f, ep.save(f, v), f.other)).toThrow('OWNER_ACCESS_REQUIRED');
    } finally { cleanup(f); cleanup(foreign); }
  }, 60_000);

  it('requires context for config2 and rejects it on config1 without opening legacy null goal', () => {
    const f = ep.editorialFixture(); const legacy = fixture();
    try {
      const v = ep.input(f, 5); const bad = structuredClone(v); delete bad.context;
      expect(() => rpc(f, ep.save(f, bad))).toThrow('VALIDATION_FAILED');
      const old = input(legacy);
      expect(() => rpc(legacy, save(legacy, old).slice(0, -1) + ',' + json(v.context) + ')')).toThrow('VALIDATION_FAILED');
      const original = save(legacy, old);
      const expression = original.replace("'food_storage_home','save'", "'food_storage_home',null");
      expect(expression).not.toBe(original);
      expect(() => rpc(legacy, expression)).toThrow('VALIDATION_FAILED');
      expect(counts(legacy).posts).toBe(0);
    } finally { cleanup(f); cleanup(legacy); }
  }, 30_000);

  it('replays exact successful save/revise before changed Page/catalog/retirement checks', () => {
    const f = ep.editorialFixture();
    try {
      const v = ep.input(f, 11); const first = rpc(f, ep.save(f, v));
      const p = ep.get(f, (first.data.post as { post_public_id: string }).post_public_id);
      const revision = structuredClone(v); revision.key = randomUUID(); revision.context!.cta_actions = ['new_action']; ep.review(f, revision);
      const revised = rpc(f, ep.revise(f, revision, p));
      const before = ep.get(f, p.post_public_id);
      ep.retire(f, v.context!.editorial_profile_ref);
      const c = ep.context(f); ep.updateConfig(f, { ...c.config, overrides: { fact_count: { mode: 'fixed', value: 1 } } });
      expect(rpc(f, ep.save(f, v)).data).toEqual({ ...first.data, replayed: true });
      expect(rpc(f, ep.revise(f, revision, p)).data).toEqual({ ...revised.data, replayed: true });
      expect(ep.get(f, p.post_public_id)).toEqual(before);
      const different = structuredClone(v); different.context!.cta_actions = [];
      expect(() => rpc(f, ep.save(f, different))).toThrow('OPERATION_KEY_REUSED');
      expect(() => rpc(f, ep.save(f, v), f.other)).toThrow('OWNER_ACCESS_REQUIRED');
    } finally { cleanup(f); }
  }, 30_000);

  it('keeps approval valid after new catalog versions and retirement of Page-bound definitions', () => {
    const f = ep.editorialFixture();
    try {
      const v = ep.input(f); const p = ep.saved(f, v);
      const d = ep.definition(f, 'profile', 'dyk');
      ep.publishDefinition(f, 'profile', 'dyk', { ...d.payload, voice: 'New immutable fixture voice.' }, 1);
      for (const ref of [v.context!.editorial_profile_ref, v.context!.format_ref, v.context!.topic_ref]) ep.retire(f, ref);
      expect(ep.context(f).editorial_context.editorial_profile_ref).toEqual(v.context!.editorial_profile_ref);
      expect(rpc(f, approveV2(f, p.post_public_id)).data.status).toBe('ready');
      expect(rpc(f, publishV2(f, p.post_public_id)).data.published_fact_public_ids).toHaveLength(12);
      expect(ep.get(f, p.post_public_id).generation_snapshot).toEqual(p.generation_snapshot);
    } finally { cleanup(f); }
  }, 30_000);

  it('requires explicit revision after Page adoption and preserves posted/archived provenance', () => {
    const f = ep.editorialFixture();
    try {
      const v = ep.input(f, 10); const p = ep.saved(f, v);
      const d = ep.definition(f, 'profile', 'dyk');
      const next = ep.publishDefinition(f, 'profile', 'dyk', { ...d.payload, voice: 'Updated fixture voice.' }, 1);
      const c = ep.context(f); ep.updateConfig(f, { ...c.config, editorial_profile_ref: next });
      expect(() => rpc(f, approveV2(f, p.post_public_id))).toThrow('PAGE_VERSION_CONFLICT');
      expect(ep.get(f, p.post_public_id).generation_snapshot).toEqual(p.generation_snapshot);
      const fresh = ep.context(f); v.key = randomUUID(); v.time = fresh.context_version.config_updated_at;
      v.context!.editorial_profile_ref = next; v.context!.effective_rules_hash = fresh.editorial_context.effective_rules_hash; ep.review(f, v);
      rpc(f, ep.revise(f, v, p));
      const revised = ep.get(f, p.post_public_id);
      expect(revised.generation_snapshot.editorial_definitions.profile.reference).toEqual(next);
      rpc(f, approveV2(f, p.post_public_id)); rpc(f, publishV2(f, p.post_public_id));
      const posted = ep.get(f, p.post_public_id);
      ep.updateConfig(f, { ...ep.context(f).config, editorial_profile_ref: d.reference });
      rpc(f, `api.archive_post(1,'${f.workspace}','${randomUUID()}','${p.post_public_id}',${posted.revision},'Archive fixture.',true)`);
      const archived = ep.get(f, p.post_public_id);
      expect(archived.status).toBe('archived');
      expect(archived.generation_snapshot).toEqual(posted.generation_snapshot);
      expect(archived.content_hash).toBe(posted.content_hash);
    } finally { cleanup(f); }
  }, 30_000);

  it('recomputes narrow budget/emoji policy for approval and publication without rewriting snapshot', () => {
    const f = ep.editorialFixture();
    try {
      const v = ep.input(f, 10); v.content.cta += ' ❤️'; ep.assemble(v.content);
      const p = ep.saved(f, v); rpc(f, approveV2(f, p.post_public_id));
      const c = ep.context(f); ep.updateConfig(f, { ...c.config, overrides: { style: { emoji_policy: 'forbidden' } } });
      expect(() => rpc(f, publishV2(f, p.post_public_id))).toThrow('PAGE_VERSION_CONFLICT');
      const ready = ep.get(f, p.post_public_id);
      expect(ready.status).toBe('ready'); expect(ready.generation_snapshot).toEqual(p.generation_snapshot);
      rpc(f, `api.revoke_post_approval(1,'${f.workspace}','${randomUUID()}','${p.post_public_id}',${ready.revision},'${ready.content_hash}','Review new rules.',true)`);
      const current = ep.get(f, p.post_public_id); const fresh = ep.context(f);
      v.key = randomUUID(); v.time = fresh.context_version.config_updated_at;
      v.context!.effective_rules_hash = fresh.editorial_context.effective_rules_hash; ep.review(f, v);
      expect(() => rpc(f, ep.revise(f, v, current))).toThrow('CONTENT_PAYLOAD_INVALID');
      ep.updateConfig(f, { ...ep.context(f).config, overrides: { fact_count: { mode: 'fixed', value: 1 } } });
      expect(() => rpc(f, approveV2(f, p.post_public_id))).toThrow('PAGE_VERSION_CONFLICT');
      expect(ep.get(f, p.post_public_id).status).toBe('draft');
    } finally { cleanup(f); }
  }, 30_000);

  it('returns ready to draft on revision and preserves immutable old bindings and CAS', () => {
    const f = ep.editorialFixture();
    try {
      const v = ep.input(f); const p = ep.saved(f, v); rpc(f, approveV2(f, p.post_public_id));
      const ready = ep.get(f, p.post_public_id); ep.review(f, v); v.key = randomUUID();
      expect(() => rpc(f, ep.revise(f, v, p))).toThrow('REVISION_CONFLICT');
      const wrong = { ...ready, content_hash: '0'.repeat(64) };
      expect(() => rpc(f, ep.revise(f, v, wrong))).toThrow('CONTENT_HASH_CONFLICT');
      rpc(f, ep.revise(f, v, ready));
      const revised = ep.get(f, p.post_public_id);
      expect(revised.status).toBe('draft'); expect(revised.revision).toBe(ready.revision + 1);
      expect(row<{ approval: unknown; all: number; old: number }>(`select approval_snapshot approval,
        (select count(*)::integer from public.trivia_post_facts where post_id=p.id) all,
        (select count(*)::integer from public.trivia_post_facts where post_id=p.id and not is_current) old from public.posts p where public_id='${p.post_public_id}'`)).toEqual({ approval: null, all: 24, old: 12 });
    } finally { cleanup(f); }
  }, 30_000);

  it('reschedules/revokes/discards all 12 facts and replays release IDs exactly', () => {
    const f = ep.editorialFixture();
    try {
      const p = ep.saved(f, ep.input(f));
      rpc(f, `api.reschedule_post(1,'${f.workspace}','${randomUUID()}','${p.post_public_id}',${p.revision},'2040-01-01T00:00:00Z','Fixture schedule.')`);
      const scheduled = ep.get(f, p.post_public_id);
      expect(scheduled.content_hash).toBe(p.content_hash); expect(scheduled.generation_snapshot).toEqual(p.generation_snapshot);
      rpc(f, approveV2(f, p.post_public_id)); const ready = ep.get(f, p.post_public_id);
      rpc(f, `api.revoke_post_approval(1,'${f.workspace}','${randomUUID()}','${p.post_public_id}',${ready.revision},'${ready.content_hash}','Fixture revoke.',true)`);
      const draft = ep.get(f, p.post_public_id); const key = randomUUID();
      const expression = `api.discard_post(1,'${f.workspace}','${key}','${p.post_public_id}',${draft.revision},'Fixture discard.',true)`;
      const r = rpc(f, expression);
      expect(r.data.released_fact_public_ids).toHaveLength(12);
      expect(rpc(f, expression).data).toEqual({ ...r.data, replayed: true });
      expect(ep.get(f, p.post_public_id).generation_snapshot).toEqual(p.generation_snapshot);
    } finally { cleanup(f); }
  }, 30_000);

  it('reads dynamic format/topic and null goal through existing metrics and insight dimensions', () => {
    const f = ep.editorialFixture();
    try {
      const format = ep.publishDefinition(f, 'format', 'new_curiosity', ep.definition(f, 'format', 'themed_curiosity').payload, null);
      const topic = ep.publishDefinition(f, 'topic', 'new_nature', ep.definition(f, 'topic', 'nature_science').payload, null);
      const c = ep.context(f); ep.updateConfig(f, { ...c.config, allowed_format_refs: [format], allowed_topic_refs: [topic], format_weights: { new_curiosity: 100 }, topic_weights: { new_nature: 100 } });
      const v = ep.input(f, 11, 'new_curiosity', 'new_nature'); v.context!.profile_key = 'fast_trivia';
      const p = ep.saved(f, v); rpc(f, approveV2(f, p.post_public_id)); rpc(f, publishV2(f, p.post_public_id));
      rpc(f, `api.record_post_performance(1,'${f.workspace}','${randomUUID()}','${p.post_public_id}','2026-11-02T01:00:00Z',${json({ views: 100 })},${json({ source_type: 'facebook_ui', metric_definition_version: 1 })})`);
      const metrics = rpc(f, `api.get_post_performance(1,'${f.workspace}','${p.post_public_id}')`);
      expect((metrics.data.snapshots as unknown[]).length).toBe(1);
      const insights = rpc(f, `api.get_performance_insights(1,'${f.workspace}','${f.page}','trivia',null,null,array['format','topic','interaction_goal','profile','fact_count'],'views',1,20)`);
      expect(JSON.stringify(insights.data)).toContain('new_curiosity');
      const dimensions = row<{ dimensions: unknown }>(`select internal.metric_dimensions_v1(p,array['format','topic','interaction_goal','profile','fact_count']) dimensions from public.posts p where public_id='${p.post_public_id}'`).dimensions;
      expect(dimensions).toEqual({ format: 'new_curiosity', topic: 'new_nature', interaction_goal: null, profile: 'fast_trivia', fact_count: 11 });
      expect(ep.get(f, p.post_public_id).generation_snapshot.editorial_context.profile_key).toBe('fast_trivia');
      const unclassified = ep.saved(f, ep.input(f, 10, 'new_curiosity', 'new_nature'));
      rpc(f, approveV2(f, unclassified.post_public_id));
      rpc(f, publishV2(f, unclassified.post_public_id).replace("'fixture-only'", 'null').replace("'https://example.org/fixture/publication'", 'null'));
      rpc(f, `api.record_post_performance(1,'${f.workspace}','${randomUUID()}','${unclassified.post_public_id}','2026-11-02T01:00:00Z',${json({ views: 200 })},${json({ source_type: 'facebook_ui', metric_definition_version: 1 })})`);
      const result = rpc(f, `api.get_performance_insights(1,'${f.workspace}','${f.page}','trivia',null,null,array['interaction_goal','profile'],'views',1,20)`).data;
      expect(result.eligible_post_count).toBe(2);
      expect((result.groups as Array<{ dimension_values: unknown }>).map(x => x.dimension_values))
        .toContainEqual({ interaction_goal: null, profile: null });

      expect(() => rpc(f, `api.get_performance_insights(1,'${f.workspace}','${f.page}','trivia',null,null,array['editorial_profile'],'views',1,20)`)).toThrow('VALIDATION_FAILED');
    } finally { cleanup(f); }
  }, 30_000);

  it('rejects malformed stored snapshot metadata and a content/CTA mismatch', () => {
    const f = ep.editorialFixture();
    try {
      const p = ep.saved(f, ep.input(f, 1));
      const valid = row<{ valid: boolean }>(`select internal.post_generation_valid_v2(generation_snapshot) valid from public.posts where public_id='${p.post_public_id}'`).valid;
      expect(valid).toBe(true);
      for (const expression of [
        "jsonb_set(generation_snapshot,'{editorial_definitions,profile,key}','null')",
        "jsonb_set(generation_snapshot,'{editorial_definitions,profile,key}','true')",
        "generation_snapshot#-'{editorial_definitions,topic,payload}'",
        "jsonb_set(generation_snapshot,'{editorial_context,architecture}','\"single_subject\"')",
        "jsonb_set(generation_snapshot,'{editorial_definitions,format,key}','\"unregistered_format\"')",
        "jsonb_set(generation_snapshot,'{fact_count_applied}','13')",
      ]) expect(row<{ valid: boolean }>(`select internal.post_generation_valid_v2(${expression}) valid from public.posts where public_id='${p.post_public_id}'`).valid).toBe(false);
      expect(row<{ valid: boolean }>(`select internal.post_bundle_config2_valid_v2(
        jsonb_set(content_payload,'{cta}','"Changed CTA"'),generation_snapshot,format_key,topic_key,interaction_goal) valid
        from public.posts where public_id='${p.post_public_id}'`).valid).toBe(false);
    } finally { cleanup(f); }
  }, 30_000);

  it('keeps exactly one eighteen-argument signature per writer and all new helpers private', () => {
    const result = row<{ writers: number; arity: boolean; api: number; helpers: number; private: boolean }>(`select
      (select count(*)::integer from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='api' and p.proname in ('save_post_v2','revise_post_v2')) writers,
      (select bool_and(p.pronargs=18 and p.prosecdef and r.rolname='content_producer_api_owner'
        and has_function_privilege('authenticated',p.oid,'execute') and not has_function_privilege('anon',p.oid,'execute') and not has_function_privilege('service_role',p.oid,'execute'))
        from pg_proc p join pg_namespace n on n.oid=p.pronamespace join pg_roles r on r.oid=p.proowner where n.nspname='api' and p.proname in ('save_post_v2','revise_post_v2')) arity,
      (select count(*)::integer from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='api') api,
      count(*)::integer helpers, bool_and(not p.prosecdef and r.rolname='content_producer_api_owner' and p.proconfig=array['search_path=""']
        and not exists(select 1 from (values('anon'),('authenticated'),('service_role')) c(role) where has_function_privilege(c.role,p.oid,'execute'))) private
      from pg_proc p join pg_namespace n on n.oid=p.pronamespace join pg_roles r on r.oid=p.proowner
      where n.nspname='internal' and p.proname in ('post_engine_rules_config2_v2','post_editorial_context_shape_config2_v2','post_prepare_config2_v2','post_generation_config2_valid_v2','post_bundle_config2_valid_v2')`);
    expect(result).toEqual({ writers: 2, arity: true, api: 33, helpers: 5, private: true });
  });

  it('serializes concurrent config2 saves at the workspace lock and rolls stale catalog back', async () => {
    const f = ep.editorialFixture();
    try {
      const a = ep.input(f); const b = ep.input(f);
      const results = await overlap(f, ep.save(f, a), ep.save(f, b));
      expect(results.map(x => x.code).sort()).toEqual([0, 3]);
      expect(counts(f).posts).toBe(1);
      expect(counts(f).usage).toBe(12);
      expect(results.some(x => x.error === 'FACT_CATALOG_CONFLICT')).toBe(true);
    } finally { cleanup(f); }
  }, 30_000);
});


// Cross-package acceptance adds to, rather than replaces, the task2–7 regressions.
describe('CR-062 task9 editorial matrix integration', () => {
  it.each(acceptanceCases)('$id: catalog → Page → plan/context → save/revise/readback → lifecycle/insights', (test) => {
    runEditorialAcceptance(test);
  }, 45_000);
});
