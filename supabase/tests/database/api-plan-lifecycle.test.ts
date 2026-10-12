import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import {
  cancel,
  claim,
  cleanup,
  completeFixtureItem,
  createFixture,
  createPlan,
  digest,
  eventCount,
  expire,
  fail,
  insertPost,
  json,
  renew,
  replace,
  replayDigest,
  retry,
  row,
  rpc,
  rpcClaims,
  sql,
  stateDigest,
  type Fixture,
  type Response,
} from './helpers/plan-lifecycle.js';

function denied(f: Fixture, expression: string, code: string, owner = f.owner): void {
  const before = stateDigest(f);
  expect(() => rpc(f, expression, owner)).toThrow(new RegExp(`^${code}$`));
  expect(stateDigest(f)).toBe(before);
}
function replay(f: Fixture, expression: string, initial: Response): void {
  const before = stateDigest(f);
  const repeated = rpc(f, expression);
  expect(repeated.data.replayed).toBe(true);
  // Digest comparisons keep lease tokens out of Vitest failure output too.
  expect(replayDigest(repeated)).toBe(replayDigest(initial));
  expect(stateDigest(f)).toBe(before);
}
function planStatus(f: Fixture, plan: string): string {
  return rpc(f, `api.get_content_plan(1,'${f.workspace}','${plan}')`).data.plan.status;
}

describe('Checkpoint 5.4 public plan lifecycle', () => {
  it('CORE-001/002 exact empty and 1/2/3-item replay retains original tokens after renewal, reclaim, failure and cancellation', () => {
    const f = createFixture();
    try {
      for (const count of [1, 2, 3]) {
        const p = createPlan(f, count + 1);
        const expression = claim(f, p.data.plan.plan_public_id, count);
        const initial = rpc(f, expression);
        expect(initial.data.claimed_items.length).toBe(count);
        expect(initial.data.claimed_items.map((c) => c.item.position)).toEqual(
          Array.from({ length: count }, (_, i) => i + 1),
        );
        expect(initial.data.remaining_claimable_count).toBe(1);
        expect(
          initial.data.claimed_items.every(
            (c) => c.item.attempt_count === 1 && c.claim_renewal_count === 0,
          ),
        ).toBe(true);
        for (const c of initial.data.claimed_items) {
          expect(Date.parse(c.claim_expires_at) - Date.parse(c.claimed_at)).toBe(30 * 60_000);
        }
        const first = initial.data.claimed_items[0]!;
        rpc(f, renew(f, first));
        replay(f, expression, initial);
        expire(first);
        const reclaimed = rpc(f, claim(f, p.data.plan.plan_public_id)).data.claimed_items[0]!;
        expect(reclaimed.item.attempt_count).toBe(2);
        expect(digest(reclaimed.claim_token)).not.toBe(digest(first.claim_token));
        replay(f, expression, initial);
        denied(f, renew(f, first), 'PLAN_ITEM_CLAIM_MISMATCH');
        denied(f, fail(f, first), 'PLAN_ITEM_CLAIM_MISMATCH');
        rpc(f, fail(f, reclaimed));
        replay(f, expression, initial);
        rpc(f, cancel(f, p.data.plan.plan_public_id));
        replay(f, expression, initial);
      }
      const p = createPlan(f, 1);
      const leased = rpc(f, claim(f, p.data.plan.plan_public_id)).data.claimed_items[0]!;
      const emptyExpression = claim(f, p.data.plan.plan_public_id, 3);
      const beforeEmpty = eventCount(f);
      const empty = rpc(f, emptyExpression);
      expect(empty.data.claimed_items.length).toBe(0);
      expect(empty.data.remaining_claimable_count).toBe(0);
      expect(eventCount(f)).toBe(beforeEmpty);
      rpc(f, fail(f, leased));
      rpc(f, retry(f, leased.item.plan_item_public_id));
      replay(f, emptyExpression, empty); // Still empty although item is now claimable.
      const security = row<{ token_leaks: number; incomplete: number; empty_refs: boolean }>(`select
        (select count(*) from internal.operation_ledger l join internal.content_plan_item_events e on e.operation_id=l.id
          where e.claim_token is not null and l.response_snapshot::text like '%'||e.claim_token::text||'%') token_leaks,
        (select count(*) from internal.operation_ledger where workspace_id=w.id and completed_at is null) incomplete,
        (select response_snapshot->'claim_event_public_ids'='[]'::jsonb from internal.operation_ledger
          where workspace_id=w.id and operation_key='${emptyExpression.split("'")[3]}') empty_refs
        from public.workspaces w where public_id='${f.workspace}'`);
      expect(security).toEqual({ token_leaks: 0, incomplete: 0, empty_refs: true });
    } finally {
      cleanup(f);
    }
  }, 90_000);

  it('CORE-002 renewal is one-time, no attempt increment, capped at initial +60 minutes and fails for expired claims', () => {
    const f = createFixture();
    try {
      const p = createPlan(f, 1);
      const c = rpc(f, claim(f, p.data.plan.plan_public_id)).data.claimed_items[0]!;
      const expression = renew(f, c);
      const renewed = rpc(f, expression);
      expect(renewed.data.claim_renewal_count).toBe(1);
      expect(Date.parse(renewed.data.claim_expires_at) - Date.parse(c.claimed_at)).toBe(
        60 * 60_000,
      );
      denied(f, renew(f, c), 'PLAN_CLAIM_RENEWAL_LIMIT');
      replay(f, expression, renewed);
      expect(
        row<{ attempts: number }>(
          `select attempt_count attempts from public.content_plan_items where public_id='${c.item.plan_item_public_id}'`,
        ).attempts,
      ).toBe(1);
      expire(c);
      denied(f, renew(f, c), 'PLAN_ITEM_CLAIM_EXPIRED');
      denied(f, fail(f, c), 'PLAN_ITEM_CLAIM_EXPIRED');
      replay(f, expression, renewed);
      const reclaimed = rpc(f, claim(f, p.data.plan.plan_public_id)).data.claimed_items[0]!;
      expect(reclaimed.item.attempt_count).toBe(2);
      expect(reclaimed.claim_renewal_count).toBe(0);
      const starts = row<{
        original: boolean;
      }>(`select started_at=(select claimed_at from internal.content_plan_item_events e
        where e.item_id=i.id and e.event_type='claimed' order by e.id limit 1) original
        from public.content_plan_items i where public_id='${c.item.plan_item_public_id}'`);
      expect(starts.original).toBe(true);
    } finally {
      cleanup(f);
    }
  }, 30_000);

  it('CORE-001/004 failure, retry and cancellation replay exact responses after later mutations; all six semantic mismatches reject', () => {
    const f = createFixture();
    try {
      const p = createPlan(f, 2);
      const claimKey = randomUUID();
      const claimed = rpc(f, claim(f, p.data.plan.plan_public_id, 1, claimKey)).data
        .claimed_items[0]!;
      denied(f, claim(f, p.data.plan.plan_public_id, 2, claimKey), 'OPERATION_KEY_REUSED');
      const renewKey = randomUUID();
      const renewedExpression = renew(f, claimed, renewKey);
      const renewed = rpc(f, renewedExpression);
      const wrong = { ...claimed, claim_token: randomUUID() };
      denied(f, renew(f, wrong, renewKey), 'OPERATION_KEY_REUSED');
      const failKey = randomUUID();
      const failedExpression = fail(f, claimed, failKey);
      const failed = rpc(f, failedExpression);
      expect(failed.data.item.status).toBe('failed');
      expect(failed.data.plan.status).toBe('pending'); // Pending+failed, no completed.
      denied(f, fail(f, claimed, failKey, 'A different failure.'), 'OPERATION_KEY_REUSED');
      const retryKey = randomUUID();
      const retryExpression = retry(f, claimed.item.plan_item_public_id, retryKey);
      const retried = rpc(f, retryExpression);
      expect(retried.data.item.status).toBe('pending');
      expect(retried.data.item.attempt_count).toBe(1);
      expect(retried.data.item.last_error).toBeNull();
      denied(
        f,
        retry(f, claimed.item.plan_item_public_id, retryKey, 'Different intent.'),
        'OPERATION_KEY_REUSED',
      );
      replay(f, failedExpression, failed);
      replay(f, renewedExpression, renewed);
      rpc(f, claim(f, p.data.plan.plan_public_id));
      replay(f, retryExpression, retried);
      const cancelKey = randomUUID();
      const cancelExpression = cancel(f, p.data.plan.plan_public_id, cancelKey);
      const cancelled = rpc(f, cancelExpression);
      expect(cancelled.data.changed_count).toBe(2);
      expect(cancelled.data.plan.status).toBe('cancelled');
      denied(
        f,
        cancel(f, p.data.plan.plan_public_id, cancelKey, 'true', 'Different intent.'),
        'OPERATION_KEY_REUSED',
      );
      replay(f, cancelExpression, cancelled);
      denied(f, cancel(f, p.data.plan.plan_public_id), 'PLAN_STATUS_CONFLICT');
      denied(f, claim(f, p.data.plan.plan_public_id), 'PLAN_STATUS_CONFLICT');
      denied(f, retry(f, claimed.item.plan_item_public_id), 'PLAN_STATUS_CONFLICT');
      const audit = row<{ failure_kept: boolean; cleared: boolean; audit_client: boolean }>(`select
        exists(select 1 from internal.content_plan_item_events where item_public_id='${claimed.item.plan_item_public_id}'
          and event_type='failed' and retry_recommended and failure_detail='Viable sources were insufficient.') failure_kept,
        not exists(select 1 from public.content_plan_items where plan_id=(select id from public.content_plans where public_id='${p.data.plan.plan_public_id}')
          and (claim_token is not null or claimed_at is not null or claim_expires_at is not null or claim_renewal_count<>0)) cleared,
        not exists(select 1 from internal.content_plan_item_events where workspace_id=(select id from public.workspaces where public_id='${f.workspace}')
          and (actor_user_id<>'${f.owner}' or oauth_client_id='')) audit_client`);
      expect(audit).toEqual({ failure_kept: true, cleared: true, audit_client: true });
      const completed = createPlan(f, 1);
      completeFixtureItem(completed.data.items[0]!.plan_item_public_id);
      const post = insertPost(completed.data.items[0]!.plan_item_public_id);
      sql(
        `update public.content_plans set status='completed',completed_at=now() where public_id='${completed.data.plan.plan_public_id}'`,
      );
      const replaceKey = randomUUID();
      const replaceExpression = replace(
        f,
        completed.data.items[0]!.plan_item_public_id,
        post,
        replaceKey,
      );
      const replaced = rpc(f, replaceExpression);
      denied(
        f,
        replace(f, completed.data.items[0]!.plan_item_public_id, randomUUID(), replaceKey),
        'OPERATION_KEY_REUSED',
      );
      rpc(f, claim(f, completed.data.plan.plan_public_id));
      replay(f, replaceExpression, replaced);
      denied(f, cancel(f, completed.data.plan.plan_public_id, claimKey), 'OPERATION_KEY_REUSED');
    } finally {
      cleanup(f);
    }
  }, 60_000);

  it('RPC-PLAN-TERM covers every aggregate precedence including mixed completed/cancelled and explicit cancellation preserving posts', () => {
    const f = createFixture();
    try {
      const p = createPlan(f, 3);
      expect(planStatus(f, p.data.plan.plan_public_id)).toBe('pending');
      completeFixtureItem(p.data.items[0]!.plan_item_public_id);
      const post = insertPost(p.data.items[0]!.plan_item_public_id, 'draft');
      const c = rpc(f, claim(f, p.data.plan.plan_public_id)).data.claimed_items[0]!;
      expect(planStatus(f, p.data.plan.plan_public_id)).toBe('in_progress'); // Wins over completed+pending.
      const failure = rpc(f, fail(f, c));
      expect(failure.data.plan.status).toBe('partially_completed'); // Completed+pending+failed.
      const retried = rpc(f, retry(f, c.item.plan_item_public_id));
      expect(retried.data.plan.status).toBe('partially_completed'); // Completed+pending.
      const postBefore = digest(
        row(`select to_jsonb(p) post from public.posts p where public_id='${post}'`),
      );
      const cancelled = rpc(f, cancel(f, p.data.plan.plan_public_id));
      expect(cancelled.data.plan.status).toBe('cancelled');
      expect(cancelled.data.plan.progress).toEqual({
        pending: 0,
        in_progress: 0,
        completed: 1,
        failed: 0,
        cancelled: 2,
      });
      expect(cancelled.data.changed_count).toBe(2);
      expect(cancelled.data.preserved_completed_count).toBe(1);
      expect(
        digest(row(`select to_jsonb(p) post from public.posts p where public_id='${post}'`)),
      ).toBe(postBefore);
      expect(
        row<{ kept: boolean }>(
          `select cancelled_at is not null and completed_at is null kept from public.content_plans where public_id='${p.data.plan.plan_public_id}'`,
        ).kept,
      ).toBe(true);

      const failedPlan = createPlan(f, 1);
      const fc = rpc(f, claim(f, failedPlan.data.plan.plan_public_id)).data.claimed_items[0]!;
      expect(rpc(f, fail(f, fc)).data.plan.status).toBe('failed');
      expect(rpc(f, retry(f, fc.item.plan_item_public_id)).data.plan.status).toBe('pending');

      const terminal = createPlan(f, 2);
      const tc = rpc(f, claim(f, terminal.data.plan.plan_public_id)).data.claimed_items[0]!;
      sql(
        `update public.content_plan_items set status='cancelled' where public_id='${terminal.data.items[1]!.plan_item_public_id}'`,
      );
      completeFixtureItem(tc.item.plan_item_public_id);
      insertPost(tc.item.plan_item_public_id);
      // Ordinary completion is a 5.6 write, so terminal history is an explicit
      // local fixture. This renewal proves active work wins over completed.
      const renewalTarget = createPlan(f, 2);
      const rc = rpc(f, claim(f, renewalTarget.data.plan.plan_public_id)).data.claimed_items[0]!;
      sql(
        `update public.content_plan_items set status='completed',completed_at=now() where public_id='${renewalTarget.data.items[1]!.plan_item_public_id}'`,
      );
      expect(rpc(f, renew(f, rc)).data.claim_renewal_count).toBe(1);
      expect(planStatus(f, renewalTarget.data.plan.plan_public_id)).toBe('in_progress');
      expect(rpc(f, fail(f, rc)).data.plan.status).toBe('partially_completed'); // Completed+failed.
      sql(
        `update public.content_plans set status='completed',completed_at=now() where public_id='${terminal.data.plan.plan_public_id}'`,
      );
      denied(f, cancel(f, terminal.data.plan.plan_public_id), 'PLAN_STATUS_CONFLICT');
      const empty = rpc(f, claim(f, terminal.data.plan.plan_public_id));
      expect(empty.data.claimed_items.length).toBe(0);
      const replacement = rpc(
        f,
        replace(
          f,
          tc.item.plan_item_public_id,
          row<{ id: string }>(
            `select public_id::text id from public.posts where content_plan_item_id=(select id from public.content_plan_items where public_id='${tc.item.plan_item_public_id}')`,
          ).id,
        ),
      );
      expect(replacement.data.plan.status).toBe('pending'); // Pending+cancelled.
      for (const statuses of [
        ['completed', 'completed'],
        ['completed', 'cancelled'],
        ['cancelled', 'cancelled'],
      ]) {
        const fixturePlan = createPlan(f, 2);
        fixturePlan.data.items.forEach((i, index) =>
          sql(`update public.content_plan_items set status='${statuses[index]}'
          where public_id='${i.plan_item_public_id}'`),
        );
        // Fixture-only invocation tests the future-save aggregate branch; it
        // is not public save_post evidence. Public claim must preserve it empty.
        sql(`select internal.plan_refresh_status_v1((select id from public.content_plans
          where public_id='${fixturePlan.data.plan.plan_public_id}'))`);
        expect(planStatus(f, fixturePlan.data.plan.plan_public_id)).toBe('completed');
        const beforeEvents = eventCount(f);
        expect(
          rpc(f, claim(f, fixturePlan.data.plan.plan_public_id)).data.claimed_items.length,
        ).toBe(0);
        expect(eventCount(f)).toBe(beforeEvents);
        expect(
          row<{
            completed: boolean;
          }>(`select completed_at is not null and cancelled_at is null completed
          from public.content_plans where public_id='${fixturePlan.data.plan.plan_public_id}'`)
            .completed,
        ).toBe(true);
      }
      const legacy = createPlan(f, 1);
      sql(
        `update public.content_plans set status='completed',completed_at=now() where public_id='${legacy.data.plan.plan_public_id}'`,
      );
      const emptyLegacy = rpc(f, claim(f, legacy.data.plan.plan_public_id));
      expect(emptyLegacy.data.claimed_items.length).toBe(0);
      expect(emptyLegacy.data.remaining_claimable_count).toBe(0);
      expect(
        row<{ status: string }>(
          `select status from public.content_plan_items where public_id='${legacy.data.items[0]!.plan_item_public_id}'`,
        ).status,
      ).toBe('pending');
    } finally {
      cleanup(f);
    }
  }, 45_000);

  it('CORE-004 replacement requires explicit intent and all discarded pre-publication history; never restores or deletes old outputs', () => {
    const f = createFixture();
    try {
      for (const status of ['draft', 'ready', 'posted', 'archived']) {
        const p = createPlan(f, 1);
        const id = p.data.items[0]!.plan_item_public_id;
        completeFixtureItem(id);
        const discarded = insertPost(id);
        insertPost(id, status);
        denied(f, replace(f, id, discarded), 'PLAN_ITEM_REPLACEMENT_BLOCKED');
      }
      const p = createPlan(f, 1, ['2027-01-01T12:00:00Z']);
      const id = p.data.items[0]!.plan_item_public_id;
      const c = rpc(f, claim(f, p.data.plan.plan_public_id)).data.claimed_items[0]!;
      completeFixtureItem(id);
      const first = insertPost(id, 'discarded', '2027-01-01T12:00:00Z');
      insertPost(id);
      expect(
        row<{ status: string }>(
          `select status from public.content_plan_items where public_id='${id}'`,
        ).status,
      ).toBe('completed');
      denied(f, replace(f, id, first, randomUUID(), 'false'), 'VALIDATION_FAILED');
      denied(f, replace(f, id, first, randomUUID(), 'null'), 'VALIDATION_FAILED');
      denied(f, replace(f, id, randomUUID()), 'POST_NOT_FOUND');
      const otherPlan = createPlan(f, 1);
      completeFixtureItem(otherPlan.data.items[0]!.plan_item_public_id);
      const unrelated = insertPost(otherPlan.data.items[0]!.plan_item_public_id);
      denied(f, replace(f, id, unrelated), 'PLAN_ITEM_REPLACEMENT_BLOCKED');
      // A standalone unrelated post on the old slot must block replacement.
      const collision = insertPost(
        otherPlan.data.items[0]!.plan_item_public_id,
        'draft',
        '2027-01-01T12:00:00Z',
      );
      denied(f, replace(f, id, first), 'SCHEDULE_CONFLICT');
      sql(`delete from public.posts where public_id='${collision}'`);
      const expression = replace(f, id, first);
      const replaced = rpc(f, expression);
      expect(replaced.data.item.status).toBe('pending');
      expect(replaced.data.item.attempt_count).toBe(c.item.attempt_count);
      expect(replaced.data.item.active_post_public_id).toBeNull();
      expect(
        row<{ kept: number }>(
          `select count(*) kept from public.posts where content_plan_item_id=(select id from public.content_plan_items where public_id='${id}') and status='discarded'`,
        ).kept,
      ).toBe(2);
      expect(
        row<{ reference: boolean }>(`select exists(select 1 from internal.content_plan_item_events
        where public_id='${replaced.data.replacement_history_public_id}' and event_type='replaced' and discarded_post_public_id='${first}') reference`)
          .reference,
      ).toBe(true);
      denied(f, replace(f, id, first), 'PLAN_STATUS_CONFLICT');
      const next = rpc(f, claim(f, p.data.plan.plan_public_id)).data.claimed_items[0]!;
      expect(next.item.attempt_count).toBe(2);
      replay(f, expression, replaced);
      rpc(f, cancel(f, p.data.plan.plan_public_id));
      denied(f, replace(f, id, first), 'PLAN_STATUS_CONFLICT');
    } finally {
      cleanup(f);
    }
  }, 45_000);

  it('SEC/INPUT validates all six contexts, bounds, safe details and illegal transitions with full rollback', () => {
    const f = createFixture();
    try {
      const p = createPlan(f, 2);
      const c = rpc(f, claim(f, p.data.plan.plan_public_id)).data.claimed_items[0]!;
      const operations = [
        claim(f, p.data.plan.plan_public_id),
        renew(f, c),
        fail(f, c),
        retry(f, c.item.plan_item_public_id),
        replace(f, c.item.plan_item_public_id, randomUUID()),
        cancel(f, p.data.plan.plan_public_id),
      ];
      for (const expression of operations) {
        denied(f, expression, 'OWNER_ACCESS_REQUIRED', f.other);
        expect(() => rpcClaims(expression, { role: 'authenticated', client_id: 'test' })).toThrow(
          /^AUTH_REQUIRED$/,
        );
        expect(() => rpcClaims(expression, { sub: f.owner, role: 'authenticated' })).toThrow(
          /^OAUTH_CLIENT_REQUIRED$/,
        );
        expect(() => rpcClaims(expression, 'invalid-json')).toThrow(/^AUTH_REQUIRED$/);
        denied(f, expression.replace('(1,', '(2,'), 'VALIDATION_FAILED');
      }
      denied(f, claim(f, p.data.plan.plan_public_id, 0), 'VALIDATION_FAILED');
      denied(f, claim(f, p.data.plan.plan_public_id, 4), 'VALIDATION_FAILED');
      denied(f, claim(f, p.data.plan.plan_public_id, 1, randomUUID(), 60), 'VALIDATION_FAILED');
      denied(
        f,
        claim(f, p.data.plan.plan_public_id, 1, 'aaaaaaaa-aaaa-1aaa-8aaa-aaaaaaaaaaaa'),
        'VALIDATION_FAILED',
      );
      denied(f, claim(f, randomUUID()), 'PLAN_NOT_FOUND');
      denied(f, retry(f, randomUUID()), 'PLAN_ITEM_NOT_FOUND');
      denied(f, retry(f, c.item.plan_item_public_id), 'PLAN_STATUS_CONFLICT');
      denied(f, renew(f, { ...c, claim_token: randomUUID() }), 'PLAN_ITEM_CLAIM_MISMATCH');
      denied(f, fail(f, { ...c, claim_token: randomUUID() }), 'PLAN_ITEM_CLAIM_MISMATCH');
      for (const detail of [
        '',
        'x'.repeat(501),
        'Bearer private-value',
        'token=private-value',
        c.claim_token,
        'SQLSTATE 23505',
        'select password from accounts',
        'unsafe\nline',
      ]) {
        denied(f, fail(f, c, randomUUID(), detail), 'VALIDATION_FAILED');
        denied(f, retry(f, c.item.plan_item_public_id, randomUUID(), detail), 'VALIDATION_FAILED');
      }
      denied(
        f,
        fail(f, c, randomUUID(), 'Safe detail.', 'UNREGISTERED_ERROR'),
        'VALIDATION_FAILED',
      );
      denied(f, fail(f, c).replace(',true)', ',null)'), 'VALIDATION_FAILED');
      denied(f, cancel(f, p.data.plan.plan_public_id, randomUUID(), 'false'), 'VALIDATION_FAILED');
      denied(f, cancel(f, p.data.plan.plan_public_id, randomUUID(), 'null'), 'VALIDATION_FAILED');
      const failed = rpc(f, fail(f, c, randomUUID(), '  Safe bounded detail.  '));
      expect(failed.data.item.last_error?.detail).toBe('Safe bounded detail.');
      denied(f, fail(f, c), 'PLAN_ITEM_CLAIM_MISMATCH');
      denied(f, renew(f, c), 'PLAN_ITEM_CLAIM_MISMATCH');
    } finally {
      cleanup(f);
    }
  }, 45_000);

  it('SEC-GRANT event history is owner-RLS, app-append-only, and absent from every caller/helper surface', () => {
    const f = createFixture();
    try {
      const p = createPlan(f, 1);
      rpc(f, claim(f, p.data.plan.plan_public_id));
      for (const role of ['authenticated', 'anon', 'service_role']) {
        for (const expression of [
          'select * from internal.content_plan_item_events',
          "select nextval('internal.content_plan_item_events_id_seq')",
          'select internal.plan_project_summary_v1(1)',
        ]) {
          expect(() => sql(`begin; set local role ${role}; ${expression}; rollback;`)).toThrow();
        }
      }
      const ownerAccess = row<{
        owner_rows: number;
        immutable: boolean;
        no_delete: boolean;
        no_unplanned_post_write: boolean;
        no_plan_post_mutation: boolean;
      }>(`select
        (select count(*) from internal.content_plan_item_events where workspace_id=(select id from public.workspaces where public_id='${f.workspace}')) owner_rows,
        not has_table_privilege('content_producer_api_owner','internal.content_plan_item_events','UPDATE') immutable,
        not has_table_privilege('content_producer_api_owner','internal.content_plan_item_events','DELETE') no_delete,
        -- CR-012/013/014 cumulative columns: correction, post writes and lifecycle.
        not exists(select 1 from pg_attribute a where a.attrelid='public.posts'::regclass and a.attnum>0 and not a.attisdropped
          and a.attname not in ('id','status','quality_status','revision','ready_at','approval_snapshot','system_checks','editorial_checks',
            'format_key','topic_key','interaction_goal','content_schema_version','content_payload','generation_snapshot','content_hash','scheduled_at',
            'published_at','platform_post_id','published_url','discarded_at','archived_at')
          and has_column_privilege('content_producer_api_owner','public.posts',a.attname,'UPDATE')) no_unplanned_post_write,
        not exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace
          where ((n.nspname='internal' and p.proname like 'plan_%') or (n.nspname='api' and p.proname in
            ('claim_content_plan_items','renew_content_plan_claim','report_content_plan_item_failure','retry_content_plan_item','replace_discarded_plan_item','cancel_content_plan')))
            and p.prosrc ~* 'update[[:space:]]+public[.]posts') no_plan_post_mutation`);
      expect(ownerAccess).toEqual({
        owner_rows: 1,
        immutable: true,
        no_delete: true,
        no_unplanned_post_write: true,
        no_plan_post_mutation: true,
      });
      expect(
        sql(`begin; do $$ begin perform set_config('request.jwt.claims',${json({ sub: f.owner, role: 'authenticated', client_id: 'owner' })}::text,true); end $$;
        set local role content_producer_api_owner; select count(*) from internal.content_plan_item_events; rollback;`),
      ).toBe('1');
      expect(
        sql(`begin; do $$ begin perform set_config('request.jwt.claims',${json({ sub: f.other, role: 'authenticated', client_id: 'other' })}::text,true); end $$;
        set local role content_producer_api_owner; select count(*) from internal.content_plan_item_events; rollback;`),
      ).toBe('0');
      expect(() =>
        sql(
          `update internal.content_plan_item_events set reason='Rewrite.' where item_public_id='${p.data.items[0]!.plan_item_public_id}'`,
        ),
      ).toThrow(/^INTERNAL_ERROR$/);
    } finally {
      cleanup(f);
    }
  }, 30_000);

  it('RPC-ROLLBACK each operation rolls back item/event/plan/ledger when completion fails; cancellation has no partial item set', () => {
    const f = createFixture();
    const functionName = `phase54_fault_${randomUUID().replaceAll('-', '')}`;
    try {
      const p = createPlan(f, 3);
      const c = rpc(f, claim(f, p.data.plan.plan_public_id)).data.claimed_items[0]!;
      const completed = createPlan(f, 1);
      completeFixtureItem(completed.data.items[0]!.plan_item_public_id);
      const post = insertPost(completed.data.items[0]!.plan_item_public_id);
      const failedPlan = createPlan(f, 1);
      const fc = rpc(f, claim(f, failedPlan.data.plan.plan_public_id)).data.claimed_items[0]!;
      rpc(f, fail(f, fc));
      const targets = [
        claim(f, p.data.plan.plan_public_id),
        renew(f, c),
        fail(f, c),
        retry(f, fc.item.plan_item_public_id),
        replace(f, completed.data.items[0]!.plan_item_public_id, post),
        cancel(f, p.data.plan.plan_public_id),
      ];
      sql(`create function internal.${functionName}() returns trigger language plpgsql set search_path='' as $$
        begin if new.workspace_id=(select id from public.workspaces where public_id='${f.workspace}') and new.completed_at is not null
          and new.operation_name in ('claim_content_plan_items','renew_content_plan_claim','report_content_plan_item_failure',
            'retry_content_plan_item','replace_discarded_plan_item','cancel_content_plan') then
          raise exception using errcode='P0001',message='injected private database fault'; end if; return new; end $$;
        revoke all on function internal.${functionName}() from public,anon,authenticated,service_role;
        create trigger ${functionName} before update on internal.operation_ledger for each row execute function internal.${functionName}();`);
      for (const expression of targets) denied(f, expression, 'INTERNAL_ERROR');
      sql(
        `drop trigger ${functionName} on internal.operation_ledger; drop function internal.${functionName}();`,
      );
      // Each same logical key is reusable after its failed transaction.
      for (const expression of targets) expect(rpc(f, expression).data.replayed).toBe(false);
    } finally {
      sql(
        `drop trigger if exists ${functionName} on internal.operation_ledger; drop function if exists internal.${functionName}();`,
      );
      cleanup(f);
    }
  }, 45_000);

  it('CORE-008 both write groups enforce rate limits without mutations and return bounded retry recovery', () => {
    const f = createFixture();
    try {
      const p = createPlan(f, 1);
      for (const [group, maximum, expression] of [
        ['contention_write', 20, claim(f, p.data.plan.plan_public_id)],
        ['write', 30, cancel(f, p.data.plan.plan_public_id)],
      ] as const) {
        const client = randomUUID();
        sql(`insert into internal.rate_limit_buckets(actor_user_id,oauth_client_id,limit_group,window_start,request_count)
          select '${f.owner}','${client}','${group}',
          (date_trunc('minute',clock_timestamp() at time zone 'UTC') at time zone 'UTC')+offsets.delta,${maximum}
          from (values(interval '0 minutes'),(interval '1 minute')) offsets(delta)`);
        const before = stateDigest(f);
        expect(() => rpc(f, expression, f.owner, client)).toThrow(/^RATE_LIMITED$/);
        expect(stateDigest(f)).toBe(before);
      }
      expect(
        row<{ bounded: boolean }>(
          `select (internal.safe_error_response_v1('RATE_LIMITED',5000)->>'retry_after_seconds')::integer between 1 and 60 bounded`,
        ).bounded,
      ).toBe(true);
    } finally {
      cleanup(f);
    }
  }, 30_000);

  it('CORE-001 closed replay rejects unknown nested overrides, duplicate event references and foreign-operation history', () => {
    const f = createFixture();
    try {
      const p = createPlan(f, 2);
      const key = randomUUID();
      const expression = claim(f, p.data.plan.plan_public_id, 2, key);
      const initial = rpc(f, expression);
      const original = row<{ snapshot: unknown }>(
        `select response_snapshot snapshot from internal.operation_ledger where operation_key='${key}'`,
      ).snapshot;
      for (const altered of [
        `jsonb_set(response_snapshot,'{response,data,claimed_items,0,item,item_config}', '{"unknown_override":"untrusted text"}')`,
        `jsonb_set(response_snapshot,'{response,data,claimed_items,0,item,interaction_goal}', '"invented_goal"')`,
        `jsonb_set(response_snapshot,'{claim_event_public_ids}',jsonb_build_array(response_snapshot#>'{claim_event_public_ids,0}',response_snapshot#>'{claim_event_public_ids,0}'))`,
      ]) {
        sql(
          `update internal.operation_ledger set response_snapshot=${altered} where operation_key='${key}'`,
        );
        denied(f, expression, 'INTERNAL_ERROR');
        sql(
          `update internal.operation_ledger set response_snapshot=${json(original)} where operation_key='${key}'`,
        );
      }
      const other = createPlan(f, 1);
      rpc(f, claim(f, other.data.plan.plan_public_id));
      sql(`update internal.operation_ledger set response_snapshot=jsonb_set(response_snapshot,'{claim_event_public_ids,0}',
        (select to_jsonb(public_id) from internal.content_plan_item_events where plan_public_id='${other.data.plan.plan_public_id}' limit 1))
        where operation_key='${key}'`);
      denied(f, expression, 'INTERNAL_ERROR');
      sql(
        `update internal.operation_ledger set response_snapshot=${json(original)} where operation_key='${key}'`,
      );
      replay(f, expression, initial);
    } finally {
      cleanup(f);
    }
  }, 30_000);

  it('SEC-OWNER an authorized second workspace cannot discover foreign plan/item/post existence', () => {
    const f = createFixture();
    const other = createFixture();
    try {
      const p = createPlan(f, 1);
      const c = rpc(f, claim(f, p.data.plan.plan_public_id)).data.claimed_items[0]!;
      for (const [expression, code] of [
        [claim(other, p.data.plan.plan_public_id), 'PLAN_NOT_FOUND'],
        [cancel(other, p.data.plan.plan_public_id), 'PLAN_NOT_FOUND'],
        [renew(other, c), 'PLAN_ITEM_NOT_FOUND'],
        [fail(other, c), 'PLAN_ITEM_NOT_FOUND'],
        [retry(other, c.item.plan_item_public_id), 'PLAN_ITEM_NOT_FOUND'],
        [replace(other, c.item.plan_item_public_id, randomUUID()), 'PLAN_ITEM_NOT_FOUND'],
      ] as const)
        denied(other, expression, code);
      completeFixtureItem(c.item.plan_item_public_id);
      const foreign = insertPost(c.item.plan_item_public_id);
      const local = createPlan(other, 1);
      completeFixtureItem(local.data.items[0]!.plan_item_public_id);
      insertPost(local.data.items[0]!.plan_item_public_id);
      denied(
        other,
        replace(other, local.data.items[0]!.plan_item_public_id, foreign),
        'POST_NOT_FOUND',
      );
    } finally {
      cleanup(other);
      cleanup(f);
    }
  }, 30_000);

  it('SEC-BUSY query cancellation maps to DATABASE_BUSY and rolls back even after event insertion', () => {
    const f = createFixture();
    const name = `phase54_fault_${randomUUID().replaceAll('-', '')}`;
    try {
      const p = createPlan(f, 1);
      sql(`create function internal.${name}() returns trigger language plpgsql set search_path='' as $$
        begin if new.workspace_id=(select id from public.workspaces where public_id='${f.workspace}')
          and new.operation_name='claim_content_plan_items' and new.completed_at is not null then
          perform pg_catalog.pg_sleep(0.5); end if; return new; end $$;
        revoke all on function internal.${name}() from public,anon,authenticated,service_role;
        create trigger ${name} before update on internal.operation_ledger for each row execute function internal.${name}();`);
      const before = stateDigest(f);
      const expression = claim(f, p.data.plan.plan_public_id);
      // Arm an actual statement timer before SELECT starts. SET LOCAL inside a
      // function records the write GUC but does not arm an already-started query.
      expect(() =>
        sql(`begin; set statement_timeout='150ms'; set local role authenticated;
        do $$ begin perform set_config('request.jwt.claims',${json({ sub: f.owner, role: 'authenticated', client_id: randomUUID() })}::text,true); end $$;
        select ${expression}; commit;`),
      ).toThrow(/^DATABASE_BUSY$/);
      expect(stateDigest(f)).toBe(before);
      sql(`drop trigger ${name} on internal.operation_ledger; drop function internal.${name}();`);
      expect(rpc(f, expression).data.claimed_items.length).toBe(1);
    } finally {
      sql(
        `drop trigger if exists ${name} on internal.operation_ledger; drop function if exists internal.${name}();`,
      );
      cleanup(f);
    }
  }, 30_000);
});
