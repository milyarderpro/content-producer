import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import {
  callerStatement,
  cancel,
  claim,
  cleanup,
  correct,
  createPlan,
  fixture,
  get,
  replayDigest,
  request,
  reschedule,
  revise,
  row,
  rpc,
  save,
  session,
  state,
  time,
  waitForSession,
  type Response,
} from './helpers/post-rpc.js';
import type { SessionResult } from './helpers/plan-lifecycle.js';
const responses = (r: SessionResult): Response[] =>
  r.output
    .split('\n')
    .filter((l) => l.startsWith('{"__rpc_result":'))
    .map((l) => (JSON.parse(l) as { __rpc_result: Response }).__rpc_result);

describe('Checkpoint 5.6 separate-session public RPC races', () => {
  it('CON-REPLAY / CON-REVISION duplicate save and concurrent CAS revision have one logical winner', async () => {
    const f = fixture();
    const running: Promise<SessionResult>[] = [];
    try {
      const r = request(f);
      const expression = save(f, r);
      const twins = Array.from({ length: 2 }, () =>
        session(`begin; ${callerStatement(f.owner, expression)} commit;`),
      );
      running.push(...twins);
      const result = await Promise.all(twins);
      expect(result.map((x) => x.code)).toEqual([0, 0]);
      const packages = result.map((x) => responses(x)[0]!);
      expect(packages.map((x) => x.data.replayed).sort()).toEqual([false, true]);
      expect(replayDigest(packages[0] as never)).toBe(replayDigest(packages[1] as never));
      const p = packages[0]!.data.post;
      const attempts = Array.from({ length: 2 }, () =>
        session(`begin; ${callerStatement(f.owner, revise(f, p, r))} commit;`),
      );
      running.push(...attempts);
      const revised = await Promise.all(attempts);
      expect(revised.filter((x) => x.code === 0)).toHaveLength(1);
      expect(revised.find((x) => x.code !== 0)?.error).toBe('REVISION_CONFLICT');
      expect(get(f, p.post_public_id).revision).toBe(2);
      expect(get(f, p.post_public_id).content_hash).toBe(p.content_hash);
    } finally {
      await Promise.allSettled(running);
      cleanup(f);
    }
  }, 30_000);
  it('CON-SAVE-CANCEL both public commit orders preserve exactly one legal plan/post/allocation outcome', async () => {
    const f = fixture();
    const running: Promise<SessionResult>[] = [];
    try {
      const deadlocks = row<{ n: number }>(
        'select deadlocks n from pg_stat_database where datname=current_database()',
      ).n;
      for (const first of ['save', 'cancel']) {
        const plan = createPlan(f, 2);
        const claimed = rpc(f, claim(f, plan.data.plan.plan_public_id)) as unknown as {
          data: { claimed_items: { item: { plan_item_public_id: string }; claim_token: string }[] };
        };
        const item = claimed.data.claimed_items[0]!;
        const r = request(f);
        r.plan = {
          plan_item_public_id: item.item.plan_item_public_id,
          claim_token: item.claim_token,
        };
        const expressions = { save: save(f, r), cancel: cancel(f, plan.data.plan.plan_public_id) };
        const holderName = `p56-h-${randomUUID()}`;
        const waiterName = `p56-w-${randomUUID()}`;
        const holder = session(
          `begin; set application_name='${holderName}'; ${callerStatement(f.owner, expressions[first as 'save' | 'cancel'])} select pg_sleep(1.3); commit;`,
        );
        running.push(holder);
        await waitForSession(holderName);
        const waiter = session(
          `begin; set application_name='${waiterName}'; ${callerStatement(f.owner, expressions[first === 'save' ? 'cancel' : 'save'])} commit;`,
        );
        running.push(waiter);
        await waitForSession(waiterName, "wait_event_type='Lock'");
        const [h, w] = await Promise.all([holder, waiter]);
        expect(h.code).toBe(0);
        if (first === 'save') {
          expect(w.code).toBe(0);
          expect(responses(h)[0]!.data.post.status).toBe('draft');
        } else {
          expect(w.error).toBe('PLAN_STATUS_CONFLICT');
        }
        const final = row<{
          posts: number;
          completed: number;
          cancelled: number;
          allocations: number;
        }>(`select
          (select count(*) from public.posts where content_plan_item_id=i.id) posts,
          case when i.status='completed' then 1 else 0 end completed,case when i.status='cancelled' then 1 else 0 end cancelled,
          (select count(*) from public.trivia_post_facts j join public.posts p on p.id=j.post_id where p.content_plan_item_id=i.id and j.allocation_state='allocated') allocations
          from public.content_plan_items i where i.public_id='${item.item.plan_item_public_id}'`);
        expect(final).toEqual(
          first === 'save'
            ? { posts: 1, completed: 1, cancelled: 0, allocations: 5 }
            : { posts: 0, completed: 0, cancelled: 1, allocations: 0 },
        );
      }
      expect(
        row<{ n: number }>(
          'select deadlocks n from pg_stat_database where datname=current_database()',
        ).n,
      ).toBe(deadlocks);
    } finally {
      await Promise.allSettled(running);
      cleanup(f);
    }
  }, 40_000);
  it('CON-SCHEDULE opposite-direction public reschedules share sorted two-slot locks without deadlock', async () => {
    const f = fixture();
    const running: Promise<SessionResult>[] = [];
    try {
      const a = request(f);
      a.schedule = '2026-10-26T10:00:00Z';
      const b = request(f);
      b.schedule = '2026-10-27T10:00:00Z';
      const pa = rpc(f, save(f, a)).data.post;
      const pb = rpc(f, save(f, b)).data.post;
      const deadlocks = row<{ n: number }>(
        'select deadlocks n from pg_stat_database where datname=current_database()',
      ).n;
      const twins = [
        session(`begin; ${callerStatement(f.owner, reschedule(f, pa, b.schedule))} commit;`),
        session(`begin; ${callerStatement(f.owner, reschedule(f, pb, a.schedule))} commit;`),
      ];
      running.push(...twins);
      const results = await Promise.all(twins);
      expect(results.map((x) => x.error)).toEqual(['SCHEDULE_CONFLICT', 'SCHEDULE_CONFLICT']);
      expect(get(f, pa.post_public_id).scheduled_at).toBe('2026-10-26T10:00:00.000000Z');
      expect(get(f, pb.post_public_id).revision).toBe(1);
      const name = `p56-slots-${randomUUID()}`;
      const held = session(
        `begin; set application_name='${name}'; ${callerStatement(f.owner, reschedule(f, pa, '2026-10-28T10:00:00Z'))} select pg_sleep(1.3); commit;`,
      );
      running.push(held);
      await waitForSession(name);
      expect(
        row<{ n: number }>(
          `select count(*) n from pg_locks l join pg_stat_activity a on a.pid=l.pid where a.application_name='${name}' and l.locktype='advisory' and l.granted`,
        ).n,
      ).toBeGreaterThanOrEqual(13);
      expect((await held).code).toBe(0);
      const moved = get(f, pa.post_public_id);
      const target = '2026-10-29T10:00:00Z';
      const keys = row<{
        lo: string;
        hi: string;
      }>(`select least(a,b)::text lo,greatest(a,b)::text hi from (
        select hashtextextended(p.page_id::text||':'||((extract(epoch from p.scheduled_at)*1000000)::bigint)::text,0) a,
        hashtextextended(p.page_id::text||':'||((extract(epoch from '${target}'::timestamptz)*1000000)::bigint)::text,0) b
        from public.posts p where p.public_id='${pa.post_public_id}') q`);
      const lockName = `p56-numeric-${randomUUID()}`;
      const moveName = `p56-moving-${randomUUID()}`;
      const highLocker = session(
        `begin;set application_name='${lockName}';select pg_advisory_xact_lock(${keys.hi});select pg_sleep(1.5);commit;`,
      );
      running.push(highLocker);
      await waitForSession(lockName);
      const publicMove = session(
        `begin;set application_name='${moveName}';${callerStatement(f.owner, reschedule(f, moved, target))}commit;`,
      );
      running.push(publicMove);
      await waitForSession(moveName, "wait_event_type='Lock'");
      const order = row<{
        low_held: boolean;
        high_waiting: boolean;
      }>(`select bool_or(k=${keys.lo} and granted) low_held,bool_or(k=${keys.hi} and not granted) high_waiting from (
        select (case when l.classid::bigint>=2147483648 then l.classid::bigint-4294967296 else l.classid::bigint end)*4294967296+l.objid::bigint k,l.granted
        from pg_locks l join pg_stat_activity a on a.pid=l.pid where a.application_name='${moveName}' and l.locktype='advisory') locks`);
      expect(order).toEqual({ low_held: true, high_waiting: true });
      expect((await highLocker).code).toBe(0);
      expect((await publicMove).code).toBe(0);
      expect(
        row<{ n: number }>(
          'select deadlocks n from pg_stat_database where datname=current_database()',
        ).n,
      ).toBe(deadlocks);
    } finally {
      await Promise.allSettled(running);
      cleanup(f);
    }
  }, 30_000);
  it('CON-CORRECTION save/revise versus correction, both orders, hold identity+lineage before facts', async () => {
    const f = fixture();
    const running: Promise<SessionResult>[] = [];
    try {
      const deadlocks = row<{ n: number }>(
        'select deadlocks n from pg_stat_database where datname=current_database()',
      ).n;
      for (const operation of ['save', 'revise'])
        for (const first of ['post', 'correct']) {
          const r = request(f);
          const p = operation === 'revise' ? rpc(f, save(f, r)).data.post : null;
          const fact = r.bindings[0]!.fact_public_id;
          const postExpression = p ? revise(f, p, r) : save(f, r);
          const correction = correct(f, fact, null, time(fact));
          const holderName = `p56-ident-${randomUUID()}`;
          const waiterName = `p56-correct-${randomUUID()}`;
          const holder = session(
            `begin; set application_name='${holderName}'; ${callerStatement(f.owner, first === 'post' ? postExpression : correction)} select pg_sleep(1.3); commit;`,
          );
          running.push(holder);
          await waitForSession(holderName);
          if (first === 'post')
            expect(
              row<{ n: number }>(
                `select count(*) n from pg_locks l join pg_stat_activity a on a.pid=l.pid where a.application_name='${holderName}' and l.locktype='advisory' and l.granted`,
              ).n,
            ).toBeGreaterThanOrEqual(11);
          const waiter = session(
            `begin; set application_name='${waiterName}'; ${callerStatement(f.owner, first === 'post' ? correction : postExpression)} commit;`,
          );
          running.push(waiter);
          await waitForSession(waiterName, "wait_event_type='Lock'");
          const [h, w] = await Promise.all([holder, waiter]);
          expect(h.code).toBe(0);
          if (first === 'post') {
            if (operation === 'save') {
              expect(w.error).toBe('FACT_CORRECTION_CONFLICT');
              rpc(f, correct(f, fact, null, time(fact)));
            } else {
              expect(w.error).toBe('');
              expect(w.code).toBe(0);
            }
            const post = responses(h)[0]!.data.post;
            const final = get(f, post.post_public_id);
            expect(final.status).toBe('draft');
            expect(final.quality_status).toBe('failed');
            expect(final.revision).toBe(post.revision + 1);
          } else {
            expect(w.error).toBe(
              operation === 'revise' ? 'REVISION_CONFLICT' : 'FACT_NOT_ELIGIBLE',
            );
          }
        }
      expect(
        row<{ n: number }>(
          'select deadlocks n from pg_stat_database where datname=current_database()',
        ).n,
      ).toBe(deadlocks);
    } finally {
      await Promise.allSettled(running);
      cleanup(f);
    }
  }, 55_000);
  it('DATABASE_BUSY held workspace and actual statement cancellation roll back and same-key retry succeeds', async () => {
    const f = fixture();
    const running: Promise<SessionResult>[] = [];
    try {
      const r = request(f);
      const expression = save(f, r);
      const prior = state(f);
      const name = `p56-busy-${randomUUID()}`;
      const holder = session(
        `begin; set application_name='${name}'; select id from public.workspaces where public_id='${f.workspace}' for no key update; select pg_sleep(3); commit;`,
      );
      running.push(holder);
      await waitForSession(name);
      expect(() => rpc(f, expression)).toThrow(/^DATABASE_BUSY$/);
      expect(state(f)).toBe(prior);
      expect((await holder).code).toBe(0);
      const p = rpc(f, expression).data.post;
      const before = state(f);
      const holderName = `p56-cancel-h-${randomUUID()}`;
      const waiterName = `p56-cancel-w-${randomUUID()}`;
      const held = session(
        `begin; set application_name='${holderName}'; select id from public.workspaces where public_id='${f.workspace}' for no key update; select pg_sleep(1.6); commit;`,
      );
      running.push(held);
      await waitForSession(holderName);
      const revision = revise(f, p, r);
      const waited = session(
        `begin; set application_name='${waiterName}'; ${callerStatement(f.owner, revision)} commit;`,
      );
      running.push(waited);
      await waitForSession(waiterName, "wait_event_type='Lock'");
      row(
        `select pg_cancel_backend(pid) from pg_stat_activity where application_name='${waiterName}'`,
      );
      expect((await waited).error).toBe('DATABASE_BUSY');
      expect(state(f)).toBe(before);
      expect((await held).code).toBe(0);
      expect(rpc(f, revision).data.post.revision).toBe(2);
    } finally {
      await Promise.allSettled(running);
      cleanup(f);
    }
  }, 35_000);
});
