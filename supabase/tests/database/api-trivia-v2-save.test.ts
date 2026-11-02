import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { cancel, claim, createPlan, expire, fail, renew, retry } from './helpers/plan-lifecycle.js';
import { request as legacyPostRequest, save as legacyPostSave } from './helpers/post-rpc.js';
import { callerStatement, cleanup as triviaCleanup, correct, factInput, fixture, json, quote,
  release, reserve, reserved, row, rpc, secondPage, session, setReuse, sql, time, waitForSession,
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

  it('serializes v1 reservation and correction against v2 without partial posts', async () => {
    const f = fixture();
    try {
      const v = input(f, 'legacy');
      const legacy = factInput();
      const claim = (legacy.candidate as { claim_text: string }).claim_text;
      replaceClaim(v, 1, claim);
      reviewCurrent(f, v);
      const [v2First, v1Second] = await overlap(f, save(f, v), reserve(f, [legacy]));
      expect(v2First.code).toBe(0);
      expect(v1Second.error).toBe('FACT_REUSE_BLOCKED');
      expect(counts(f).posts).toBe(1);

      const legacy2 = factInput();
      const registered = rpc(f, reserve(f, [legacy2]));
      const factId = reserved(registered)[0]!.fact_public_id;
      const conflicting = input(f, 'reserved', true);
      replaceClaim(conflicting, 2, (legacy2.candidate as { claim_text: string }).claim_text);
      reviewCurrent(f, conflicting, [2]);
      expect(() => rpc(f, save(f, conflicting))).toThrow('FACT_NOT_ELIGIBLE');
      const token = registered.data.reservation_token as string;
      rpc(f, release(f, token));
      reviewCurrent(f, conflicting, [2]);
      const [correctFirst, saveSecond] = await overlap(f,
        correct(f, factId, null, time(factId)), save(f, conflicting));
      expect(correctFirst.code).toBe(0);
      expect(['FACT_CATALOG_CONFLICT', 'FACT_NOT_ELIGIBLE']).toContain(saveSecond.error);
      expect(counts(f).posts).toBe(1);
      expect(counts(f).usage).toBe(5);
    } finally { cleanup(f); }
  }, 40_000);

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

  it('orders v1 post write before v2 and v2 save before a later correction', async () => {
    const f = fixture();
    try {
      const deadlocks = row<{ n: number }>('select deadlocks n from pg_stat_database where datname=current_database()').n;
      const old = legacyPostRequest(f);
      const factId = old.bindings[0]!.fact_public_id;
      const claimText = row<{ claim: string }>(`select claim_text claim from public.trivia_facts where public_id='${factId}'`).claim;
      const v = input(f, 'post_v1', true);
      replaceClaim(v, 1, claimText);
      reviewCurrent(f, v, [1]);
      const [legacy, newer] = await overlap(f, legacyPostSave(f, old), save(f, v));
      expect(legacy.code).toBe(0);
      expect(['FACT_CATALOG_CONFLICT', 'FACT_REUSE_BLOCKED', 'FACT_NOT_ELIGIBLE']).toContain(newer.error);
      expect(counts(f).posts).toBe(1);

      const registered = rpc(f, reserve(f, [factInput()]));
      const availableId = reserved(registered)[0]!.fact_public_id;
      const token = registered.data.reservation_token as string;
      rpc(f, release(f, token));
      const availableClaim = row<{ claim: string }>(`select claim_text claim from public.trivia_facts
        where public_id='${availableId}'`).claim;
      const v2 = input(f, 'correct_after', true);
      replaceClaim(v2, 2, availableClaim);
      reviewCurrent(f, v2, [2]);
      const [saved, corrected] = await overlap(f, save(f, v2),
        correct(f, availableId, null, time(availableId)));
      expect(saved.code).toBe(0);
      expect(corrected.code).toBe(0);
      expect(counts(f).posts).toBe(2);
      expect(counts(f).usage).toBe(10);
      expect(row<{ quality: string; status: string }>(`select quality_status quality,status
        from public.posts where public_id='${(sessionResponse(saved)!.data.post as { post_public_id: string }).post_public_id}'`))
        .toEqual({ quality: 'failed', status: 'draft' });
      expect(row<{ n: number }>('select deadlocks n from pg_stat_database where datname=current_database()').n)
        .toBe(deadlocks);
    } finally { cleanup(f); }
  }, 40_000);
});

describe('P4-T3 revise and version-aware readback', () => {
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
