import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import {
  metricsFixture,
  cleanup,
  record,
  metricRpc,
  history,
  callerStatement,
  session,
  waitForSession,
  row,
  archive,
  get,
  metricState,
  sql,
} from './helpers/metrics-rpc.js';
import type { SessionResult } from './helpers/plan-lifecycle.js';
const result = (r: SessionResult) =>
  JSON.parse(r.output.split('\n').find((x) => x.startsWith('{"__rpc_result":'))!).__rpc_result as {
    data: { replayed: boolean };
  };
describe('5.8 public separate-session metrics races', () => {
  it('CON-METRIC duplicate key has one append; duplicate capture conflicts; distinct captures both commit', async () => {
    const { f, p } = metricsFixture();
    const running: Promise<SessionResult>[] = [];
    try {
      const call = record(f, p);
      let responses = await Promise.all(
        Array.from({ length: 10 }, () => {
          const r = session(`begin;${callerStatement(f.owner, call)}commit;`);
          running.push(r);
          return r;
        }),
      );
      expect(responses.every((r) => r.code === 0)).toBe(true);
      expect(responses.filter((r) => !result(r).data.replayed)).toHaveLength(1);
      expect(history(f, p).snapshots).toHaveLength(1);
      responses = await Promise.all(
        [1, 2].map(() => {
          const r = session(
            `begin;${callerStatement(f.owner, record(f, p, { views: 2 }, '2026-10-12T04:00:00Z'))}commit;`,
          );
          running.push(r);
          return r;
        }),
      );
      expect(responses.filter((r) => r.code === 0)).toHaveLength(1);
      expect(responses.find((r) => r.code !== 0)!.error).toBe('METRIC_SNAPSHOT_CONFLICT');
      responses = await Promise.all(
        [5, 6].map((hour) => {
          const r = session(
            `begin;${callerStatement(f.owner, record(f, p, { views: hour }, `2026-10-12T0${hour}:00:00Z`))}commit;`,
          );
          running.push(r);
          return r;
        }),
      );
      expect(responses.every((r) => r.code === 0)).toBe(true);
      expect(history(f, p).snapshots).toHaveLength(4);
      expect(get(f, p.post_public_id).revision).toBe(p.revision);
    } finally {
      await Promise.allSettled(running);
      cleanup(f);
    }
  }, 25_000);
  it('CON-METRIC record/archive both orders wait on workspace and preserve publication/snapshot', async () => {
    const { f, p } = metricsFixture();
    const running: Promise<SessionResult>[] = [];
    try {
      for (const first of ['metrics', 'archive']) {
        const target =
          first === 'metrics' ? p : (await import('./helpers/metrics-rpc.js')).published(f);
        const calls = { metrics: record(f, target), archive: archive(f, target) };
        const holderName = `p58-holder-${randomUUID()}`,
          waiterName = `p58-waiter-${randomUUID()}`;
        const holder = session(
          `begin;set application_name='${holderName}';${callerStatement(f.owner, calls[first as keyof typeof calls])}select pg_sleep(1.2);commit;`,
        );
        running.push(holder);
        await waitForSession(holderName);
        const waiter = session(
          `begin;set application_name='${waiterName}';${callerStatement(f.owner, calls[first === 'metrics' ? 'archive' : 'metrics'])}commit;`,
        );
        running.push(waiter);
        await waitForSession(waiterName, "wait_event_type='Lock'");
        expect((await Promise.all([holder, waiter])).every((r) => r.code === 0)).toBe(true);
        expect(get(f, target.post_public_id).status).toBe('archived');
        expect(history(f, target).snapshots).toHaveLength(1);
      }
    } finally {
      await Promise.allSettled(running);
      cleanup(f);
    }
  }, 25_000);
  it('DATABASE_BUSY held workspace timeout and cancellation rollback then same-key retry', async () => {
    const { f, p } = metricsFixture();
    const running: Promise<SessionResult>[] = [];
    try {
      for (const cancel of [false, true]) {
        const name = `p58-lock-${randomUUID()}`,
          wait = `p58-call-${randomUUID()}`;
        const call = record(
          f,
          p,
          { views: 1 },
          cancel ? '2026-10-12T04:00:00Z' : '2026-10-12T03:00:00Z',
        );
        const before = metricState(f);
        const holder = session(
          `begin;set application_name='${name}';select 1 from public.workspaces where public_id='${f.workspace}' for no key update;select pg_sleep(3);commit;`,
        );
        running.push(holder);
        await waitForSession(name);
        const waiter = session(
          `begin;set application_name='${wait}';${callerStatement(f.owner, call)}commit;`,
        );
        running.push(waiter);
        await waitForSession(wait, "wait_event_type='Lock'");
        if (cancel)
          sql(
            `select pg_cancel_backend(pid) from pg_stat_activity where application_name='${wait}'`,
          );
        expect((await waiter).error).toBe('DATABASE_BUSY');
        await holder;
        expect(metricState(f)).toEqual(before);
        expect(metricRpc(f, call).data.replayed).toBe(false);
        expect(metricRpc(f, call).data.replayed).toBe(true);
      }
      expect(
        row(`select count(*) n from internal.operation_ledger where completed_at is null`).n,
      ).toBe(0);
    } finally {
      await Promise.allSettled(running);
      cleanup(f);
    }
  }, 20_000);
});
