import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import {
  callerStatement,
  cancel,
  claim,
  cleanup,
  createFixture,
  createPlan,
  digest,
  eventCount,
  expire,
  fail,
  json,
  parseResponses,
  planExpression,
  renew,
  retry,
  row,
  rpc,
  session,
  sql,
  stateDigest,
  waitForSession,
  type SessionResult,
} from './helpers/plan-lifecycle.js';

describe('Checkpoint 5.4 separate-session public RPC concurrency', () => {
  it('CON-PLAN/REPLAY parallel workers receive different items and duplicate keys mutate only once', async () => {
    const f = createFixture();
    const running: Promise<SessionResult>[] = [];
    try {
      const p = createPlan(f, 6);
      const workers = Array.from({ length: 3 }, () =>
        session(
          `begin; ${callerStatement(f.owner, claim(f, p.data.plan.plan_public_id, 2))} commit;`,
        ),
      );
      running.push(...workers);
      const results = await Promise.all(workers);
      expect(results.map((r) => r.code)).toEqual([0, 0, 0]);
      const items = results.flatMap((r) =>
        parseResponses(r.output)[0]!.data.claimed_items.map((c) => c.item.plan_item_public_id),
      );
      expect(new Set(items).size).toBe(6);
      expect(eventCount(f)).toBe(6);
      const duplicatePlan = createPlan(f, 2);
      const expression = claim(f, duplicatePlan.data.plan.plan_public_id, 2);
      const twins = [
        session(`begin; ${callerStatement(f.owner, expression)} commit;`),
        session(`begin; ${callerStatement(f.owner, expression)} commit;`),
      ];
      running.push(...twins);
      const paired = await Promise.all(twins);
      expect(paired.map((r) => r.code)).toEqual([0, 0]);
      const responses = paired.map((r) => parseResponses(r.output)[0]!);
      expect(responses.map((r) => r.data.replayed).sort()).toEqual([false, true]);
      expect(digest(responses[0]!.data.claimed_items)).toBe(
        digest(responses[1]!.data.claimed_items),
      );
      expect(eventCount(f)).toBe(8);
      expect(
        row<{ one: boolean }>(`select bool_and(attempt_count=1) one from public.content_plan_items
        where plan_id=(select id from public.content_plans where public_id='${duplicatePlan.data.plan.plan_public_id}')`)
          .one,
      ).toBe(true);
    } finally {
      await Promise.allSettled(running);
      cleanup(f);
    }
  }, 30_000);

  it('CON-LEASE SKIP LOCKED bypasses a held first item while the public owner RPC claims the next item', async () => {
    const f = createFixture();
    const running: Promise<SessionResult>[] = [];
    try {
      const p = createPlan(f, 2);
      const name = `skip-${randomUUID()}`;
      const locker = session(`begin; set application_name='${name}';
        select id from public.content_plan_items where public_id='${p.data.items[0]!.plan_item_public_id}' for update;
        select pg_sleep(1.4); commit;`);
      running.push(locker);
      await waitForSession(name);
      const result = rpc(f, claim(f, p.data.plan.plan_public_id));
      expect(result.data.claimed_items.map((c) => c.item.position)).toEqual([2]);
      expect(result.data.remaining_claimable_count).toBe(1);
      expect(
        row<{ still_held: boolean }>(
          `select exists(select 1 from pg_stat_activity where application_name='${name}' and wait_event='PgSleep') still_held`,
        ).still_held,
      ).toBe(true);
      expect((await locker).code).toBe(0);
      expect(
        rpc(f, claim(f, p.data.plan.plan_public_id)).data.claimed_items.map((c) => c.item.position),
      ).toEqual([1]);
    } finally {
      await Promise.allSettled(running);
      cleanup(f);
    }
  }, 20_000);

  it('CON-PLAN different Pages progress independently while one public claim transaction holds its Page/plan', async () => {
    const f = createFixture();
    const running: Promise<SessionResult>[] = [];
    try {
      const config = row<{ config: unknown }>(
        `select internal.default_trivia_config_v1() config`,
      ).config;
      const pageResponse = rpc(
        f,
        `api.create_page(1,'${f.workspace}','${randomUUID()}','Second Page','${f.prefix}-second',
        'UTC',array['US'],'trivia',1,${json(config)},false)`,
      );
      const page = (pageResponse.data as unknown as { page: { page_public_id: string } }).page
        .page_public_id;
      const a = createPlan(f, 1);
      const b = rpc(f, planExpression(f, 1, [], page));
      const name = `page-${randomUUID()}`;
      const holder =
        session(`begin; set application_name='${name}'; ${callerStatement(f.owner, claim(f, a.data.plan.plan_public_id))}
        select pg_sleep(1.4); commit;`);
      running.push(holder);
      await waitForSession(name);
      expect(rpc(f, claim(f, b.data.plan.plan_public_id)).data.claimed_items.length).toBe(1);
      expect(
        row<{ independent: boolean }>(
          `select exists(select 1 from pg_stat_activity where application_name='${name}' and wait_event='PgSleep') independent`,
        ).independent,
      ).toBe(true);
      expect((await holder).code).toBe(0);
    } finally {
      await Promise.allSettled(running);
      cleanup(f);
    }
  }, 20_000);

  it('CON-PLAN claim-first and cancel-first RPC transactions wait in one direction and finish without deadlock', async () => {
    const f = createFixture();
    const running: Promise<SessionResult>[] = [];
    try {
      const deadlocks = row<{ count: number }>(
        `select deadlocks count from pg_stat_database where datname=current_database()`,
      ).count;
      for (const first of ['claim', 'cancel']) {
        const p = createPlan(f, 2);
        const holderName = `first-${randomUUID()}`;
        const waiterName = `second-${randomUUID()}`;
        const claimExpression = claim(f, p.data.plan.plan_public_id);
        const cancelExpression = cancel(f, p.data.plan.plan_public_id);
        const holder = session(`begin; set application_name='${holderName}';
          ${callerStatement(f.owner, first === 'claim' ? claimExpression : cancelExpression)} select pg_sleep(1.4); commit;`);
        running.push(holder);
        await waitForSession(holderName);
        const waiter = session(`begin; set application_name='${waiterName}';
          ${callerStatement(f.owner, first === 'claim' ? cancelExpression : claimExpression)} commit;`);
        running.push(waiter);
        await waitForSession(waiterName, "wait_event_type='Lock'");
        expect(
          row<{
            one_direction: boolean;
          }>(`select exists(select 1 from pg_stat_activity w join pg_stat_activity h
          on h.pid=any(pg_blocking_pids(w.pid)) where w.application_name='${waiterName}' and h.application_name='${holderName}') one_direction`)
            .one_direction,
        ).toBe(true);
        const [held, waited] = await Promise.all([holder, waiter]);
        expect(held.code).toBe(0);
        if (first === 'claim') {
          expect(waited.code).toBe(0);
          const old = parseResponses(held.output)[0]!.data.claimed_items[0]!;
          const before = stateDigest(f);
          expect(() => rpc(f, renew(f, old))).toThrow(/^PLAN_STATUS_CONFLICT$/);
          expect(stateDigest(f)).toBe(before);
        } else {
          expect(waited.error).toBe('PLAN_STATUS_CONFLICT');
        }
        const final = rpc(
          f,
          `api.get_content_plan(1,'${f.workspace}','${p.data.plan.plan_public_id}')`,
        );
        expect(final.data.plan.status).toBe('cancelled');
        expect(final.data.plan.progress).toEqual({
          pending: 0,
          in_progress: 0,
          completed: 0,
          failed: 0,
          cancelled: 2,
        });
      }
      expect(
        row<{ count: number }>(
          `select deadlocks count from pg_stat_database where datname=current_database()`,
        ).count,
      ).toBe(deadlocks);
    } finally {
      await Promise.allSettled(running);
      cleanup(f);
    }
  }, 30_000);

  it('CON-LEASE retry-first and claim-first races preserve attempts, and competing renewals have one winner', async () => {
    const f = createFixture();
    const running: Promise<SessionResult>[] = [];
    try {
      for (const first of ['retry', 'claim']) {
        const p = createPlan(f, 1);
        const c = rpc(f, claim(f, p.data.plan.plan_public_id)).data.claimed_items[0]!;
        rpc(f, fail(f, c));
        const retryExpression = retry(f, c.item.plan_item_public_id);
        const claimExpression = claim(f, p.data.plan.plan_public_id);
        const name = `retry-${randomUUID()}`;
        const holder = session(`begin; set application_name='${name}';
          ${callerStatement(f.owner, first === 'retry' ? retryExpression : claimExpression)} select pg_sleep(1.4); commit;`);
        running.push(holder);
        await waitForSession(name);
        const waiter = session(
          `begin; ${callerStatement(f.owner, first === 'retry' ? claimExpression : retryExpression)} commit;`,
        );
        running.push(waiter);
        const [held, waited] = await Promise.all([holder, waiter]);
        expect([held.code, waited.code]).toEqual([0, 0]);
        const current = row<{ status: string; attempt_count: number }>(
          `select status,attempt_count from public.content_plan_items where public_id='${c.item.plan_item_public_id}'`,
        );
        expect(current).toEqual(
          first === 'retry'
            ? { status: 'in_progress', attempt_count: 2 }
            : { status: 'pending', attempt_count: 1 },
        );
        if (first === 'claim')
          expect(parseResponses(held.output)[0]!.data.claimed_items.length).toBe(0);
      }
      const p = createPlan(f, 1);
      const c = rpc(f, claim(f, p.data.plan.plan_public_id)).data.claimed_items[0]!;
      const name = `renew-${randomUUID()}`;
      const holder = session(
        `begin; set application_name='${name}'; ${callerStatement(f.owner, renew(f, c))} select pg_sleep(1.4); commit;`,
      );
      running.push(holder);
      await waitForSession(name);
      const waiter = session(`begin; ${callerStatement(f.owner, renew(f, c))} commit;`);
      running.push(waiter);
      const [held, waited] = await Promise.all([holder, waiter]);
      expect(held.code).toBe(0);
      expect(waited.error).toBe('PLAN_CLAIM_RENEWAL_LIMIT');
      expect(
        row<{ attempt_count: number; claim_renewal_count: number }>(
          `select attempt_count,claim_renewal_count from public.content_plan_items where public_id='${c.item.plan_item_public_id}'`,
        ),
      ).toEqual({ attempt_count: 1, claim_renewal_count: 1 });
    } finally {
      await Promise.allSettled(running);
      cleanup(f);
    }
  }, 30_000);

  it('CON-LEASE reclaimed token rejects a waiting old renewal and lease expiry is rechecked after locks', async () => {
    const f = createFixture();
    const running: Promise<SessionResult>[] = [];
    try {
      const p = createPlan(f, 1);
      const c = rpc(f, claim(f, p.data.plan.plan_public_id)).data.claimed_items[0]!;
      expire(c);
      const name = `reclaim-${randomUUID()}`;
      const holder = session(
        `begin; set application_name='${name}'; ${callerStatement(f.owner, claim(f, p.data.plan.plan_public_id))} select pg_sleep(1.4); commit;`,
      );
      running.push(holder);
      await waitForSession(name);
      const old = session(`begin; ${callerStatement(f.owner, renew(f, c))} commit;`);
      running.push(old);
      expect((await holder).code).toBe(0);
      expect((await old).error).toBe('PLAN_ITEM_CLAIM_MISMATCH');
      const second = createPlan(f, 1);
      const sc = rpc(f, claim(f, second.data.plan.plan_public_id)).data.claimed_items[0]!;
      sql(
        `update public.content_plan_items set claim_expires_at=clock_timestamp()+interval '900 milliseconds' where public_id='${sc.item.plan_item_public_id}'`,
      );
      const lockName = `expiry-${randomUUID()}`;
      const locker = session(
        `begin; set application_name='${lockName}'; select id from public.pages where public_id='${f.page}' for update; select pg_sleep(1.4); commit;`,
      );
      running.push(locker);
      await waitForSession(lockName);
      const later = session(`begin; ${callerStatement(f.owner, renew(f, sc))} commit;`);
      running.push(later);
      expect((await locker).code).toBe(0);
      expect((await later).error).toBe('PLAN_ITEM_CLAIM_EXPIRED');
    } finally {
      await Promise.allSettled(running);
      cleanup(f);
    }
  }, 25_000);

  it('CON-SCHEDULE cancellation acquires sorted numeric slots before plan/item/post locks; freed slot races new plan legally', async () => {
    const f = createFixture();
    const running: Promise<SessionResult>[] = [];
    try {
      const schedules = ['2027-02-01T12:00:00Z', '2027-02-02T12:00:00Z'];
      const p = createPlan(f, 2, schedules);
      const { keys } = row<{
        keys: string[];
      }>(`select array_agg(k::text order by k) keys from (select hashtextextended(page_id::text||':'||
        ((extract(epoch from scheduled_at)*1000000)::bigint)::text,0) k from public.content_plan_items
        where plan_id=(select id from public.content_plans where public_id='${p.data.plan.plan_public_id}')) s`);
      const low = keys[0]!;
      const high = keys[1]!;
      const lockerName = `slot-${randomUUID()}`;
      const cancelName = `cancel-${randomUUID()}`;
      const locker = session(
        `begin; set application_name='${lockerName}'; select pg_advisory_xact_lock(${high}); select pg_sleep(1.4); commit;`,
      );
      running.push(locker);
      await waitForSession(lockerName);
      const cancellation = session(
        `begin; set application_name='${cancelName}'; ${callerStatement(f.owner, cancel(f, p.data.plan.plan_public_id))} commit;`,
      );
      running.push(cancellation);
      await waitForSession(cancelName, "wait_event_type='Lock'");
      const locks = row<{ lower_first: boolean; no_plan_item_post_lock: boolean }>(`select
        exists(select 1 from pg_locks l join pg_stat_activity a on a.pid=l.pid where a.application_name='${cancelName}'
          and l.locktype='advisory' and l.granted and l.classid::bigint=((${low}::bigint>>32)&4294967295)
          and l.objid::bigint=(${low}::bigint&4294967295)) lower_first,
        not exists(select 1 from pg_locks l join pg_stat_activity a on a.pid=l.pid where a.application_name='${cancelName}'
          and l.relation in ('public.content_plans'::regclass,'public.content_plan_items'::regclass,'public.posts'::regclass)
          and l.mode='RowShareLock') no_plan_item_post_lock`);
      expect(locks).toEqual({ lower_first: true, no_plan_item_post_lock: true });
      expect((await locker).code).toBe(0);
      expect((await cancellation).code).toBe(0);
      expect(rpc(f, planExpression(f, 2, schedules)).data.items.length).toBe(2);
      // A public cancellation held uncommitted races a public new plan, proving
      // that cross-table slot protection observes the committed cancelled state.
      const another = createPlan(f, 1, ['2027-02-03T12:00:00Z']);
      const holdName = `occupancy-${randomUUID()}`;
      const held = session(
        `begin; set application_name='${holdName}'; ${callerStatement(f.owner, cancel(f, another.data.plan.plan_public_id))} select pg_sleep(1.4); commit;`,
      );
      running.push(held);
      await waitForSession(holdName);
      const incoming = session(
        `begin; ${callerStatement(f.owner, planExpression(f, 1, ['2027-02-03T12:00:00Z']))} commit;`,
      );
      running.push(incoming);
      expect((await held).code).toBe(0);
      expect((await incoming).code).toBe(0);
      expect(
        row<{
          occupants: number;
        }>(`select count(*) occupants from public.content_plan_items where page_id=(select id from public.pages where public_id='${f.page}')
        and scheduled_at='2027-02-03T12:00:00Z' and status<>'cancelled'`).occupants,
      ).toBe(1);
    } finally {
      await Promise.allSettled(running);
      cleanup(f);
    }
  }, 30_000);

  it('SEC-BUSY a held Page beyond lock_timeout maps safely and rolls back the public mutation/ledger/event', async () => {
    const f = createFixture();
    const running: Promise<SessionResult>[] = [];
    try {
      const p = createPlan(f, 1);
      const name = `busy-${randomUUID()}`;
      const locker = session(
        `begin; set application_name='${name}'; select id from public.pages where public_id='${f.page}' for update; select pg_sleep(3); commit;`,
      );
      running.push(locker);
      await waitForSession(name);
      const expression = claim(f, p.data.plan.plan_public_id);
      const before = stateDigest(f);
      expect(() => rpc(f, expression)).toThrow(/^DATABASE_BUSY$/);
      expect(stateDigest(f)).toBe(before);
      expect((await locker).code).toBe(0);
      expect(rpc(f, expression).data.claimed_items.length).toBe(1);
    } finally {
      await Promise.allSettled(running);
      cleanup(f);
    }
  }, 20_000);
});
