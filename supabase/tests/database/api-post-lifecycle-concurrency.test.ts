import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import {
  approve,
  archive,
  callerStatement,
  claim,
  cleanup,
  correct,
  createPlan,
  discard,
  evidence,
  fixture,
  get,
  lifecycleRpc,
  posted,
  publish,
  ready,
  replayDigest,
  request,
  reschedule,
  reverify,
  revise,
  revoke,
  row,
  rpc,
  save,
  session,
  state,
  time,
  usages,
  waitForSession,
} from './helpers/post-lifecycle.js';
import type { SessionResult } from './helpers/plan-lifecycle.js';
import type { LifecycleResponse } from './helpers/post-lifecycle.js';
const result = (r: SessionResult): LifecycleResponse =>
  JSON.parse(r.output.split('\n').find((x) => x.startsWith('{"__rpc_result":'))!)
    .__rpc_result as LifecycleResponse;

describe('Checkpoint 5.7 separate-session public lifecycle races', () => {
  it('CON-LIFECYCLE approve versus revise and discard versus reschedule BOTH orders retain one exact revision', async () => {
    const f = fixture();
    const running: Promise<SessionResult>[] = [];
    try {
      for (const pair of ['approve-revise', 'discard-reschedule'])
        for (const first of ['lifecycle', 'editing']) {
          const r = request(f);
          r.schedule = '2026-11-05T12:00:00Z';
          const p = rpc(f, save(f, r)).data.post;
          const calls = {
            lifecycle: pair === 'approve-revise' ? approve(f, p) : discard(f, p),
            editing: pair === 'approve-revise' ? revise(f, p, r) : reschedule(f, p, null),
          };
          const name = `p57-edit-${randomUUID()}`,
            waiterName = `p57-edit-wait-${randomUUID()}`;
          const holder = session(
            `begin;set application_name='${name}';${callerStatement(f.owner, calls[first as 'lifecycle' | 'editing'])}select pg_sleep(1.2);commit;`,
          );
          running.push(holder);
          await waitForSession(name);
          const waiter = session(
            `begin;set application_name='${waiterName}';${callerStatement(f.owner, calls[first === 'lifecycle' ? 'editing' : 'lifecycle'])}commit;`,
          );
          running.push(waiter);
          await waitForSession(waiterName, "wait_event_type='Lock'");
          const [h, w] = await Promise.all([holder, waiter]);
          expect(h.code).toBe(0);
          expect(w.error).toBe('REVISION_CONFLICT');
          const current = get(f, p.post_public_id);
          expect(current.revision).toBe(p.revision + 1);
          expect(current.status).toBe(
            first === 'editing' ? 'draft' : pair === 'approve-revise' ? 'ready' : 'discarded',
          );
          if (current.status === 'ready') lifecycleRpc(f, discard(f, current));
          else if (current.status === 'draft') lifecycleRpc(f, discard(f, current));
        }
    } finally {
      await Promise.allSettled(running);
      cleanup(f);
    }
  }, 55_000);

  it('CON-DISCARD-REPLACEMENT Page/slot gate serializes explicit replacement after discard without implicit plan mutation', async () => {
    const f = fixture();
    const running: Promise<SessionResult>[] = [];
    try {
      const plan = createPlan(f, 1, ['2026-11-06T12:00:00Z']);
      const claimed = rpc(f, claim(f, plan.data.plan.plan_public_id)) as unknown as {
        data: { claimed_items: { item: { plan_item_public_id: string }; claim_token: string }[] };
      };
      const item = claimed.data.claimed_items[0]!;
      const r = request(f);
      r.plan = {
        plan_item_public_id: item.item.plan_item_public_id,
        claim_token: item.claim_token,
      };
      r.schedule = '2026-11-06T12:00:00Z';
      const p = ready(f, rpc(f, save(f, r)).data.post);
      const replacement = `api.replace_discarded_plan_item(1,'${f.workspace}','${randomUUID()}','${item.item.plan_item_public_id}','${p.post_public_id}','Replace the abandoned output.',true)`;
      const before = state(f);
      expect(() => rpc(f, replacement)).toThrow(/^PLAN_ITEM_REPLACEMENT_BLOCKED$/);
      expect(state(f)).toBe(before);
      const holderName = `p57-discard-${randomUUID()}`,
        waiterName = `p57-replace-${randomUUID()}`;
      const holder = session(
        `begin;set application_name='${holderName}';${callerStatement(f.owner, discard(f, p))}select pg_sleep(1.3);commit;`,
      );
      running.push(holder);
      await waitForSession(holderName);
      const waiter = session(
        `begin;set application_name='${waiterName}';${callerStatement(f.owner, replacement)}commit;`,
      );
      running.push(waiter);
      await waitForSession(waiterName, "wait_event_type='Lock'");
      expect(
        row<{ n: number }>(
          `select count(*) n from pg_locks l join pg_stat_activity a on a.pid=l.pid where a.application_name='${holderName}' and l.locktype='advisory' and l.granted`,
        ).n,
      ).toBeGreaterThanOrEqual(12);
      const [h, w] = await Promise.all([holder, waiter]);
      expect(h.code).toBe(0);
      expect(w.code).toBe(0);
      expect(get(f, p.post_public_id).status).toBe('discarded');
      expect(
        row(
          `select status from public.content_plan_items where public_id='${item.item.plan_item_public_id}'`,
        ).status,
      ).toBe('pending');
      expect(
        (usages(p).junctions as Record<string, unknown>[]).every(
          (x) => x.allocation_state === 'released',
        ),
      ).toBe(true);
    } finally {
      await Promise.allSettled(running);
      cleanup(f);
    }
  }, 25_000);
  it('CON-FACT-APPROVAL correction/reverify versus approve/publish BOTH commit orders hold workspace/identity locks and preserve publication', async () => {
    const f = fixture();
    const running: Promise<SessionResult>[] = [];
    try {
      const deadlocks = row<{ n: number }>(
        'select deadlocks n from pg_stat_database where datname=current_database()',
      ).n;
      for (const factAction of ['correct', 'reverify'])
        for (const postAction of ['approve', 'publish'])
          for (const first of ['fact', 'post']) {
            const r = request(f);
            let p = rpc(f, save(f, r)).data.post;
            if (postAction === 'publish') p = ready(f, p);
            const fact = r.bindings[0]!;
            const snapshot = usages(p);
            const before = evidence(p);
            const calls = {
              fact:
                factAction === 'correct'
                  ? correct(f, fact.fact_public_id, null, time(fact.fact_public_id))
                  : reverify(f, fact.fact_public_id, fact.rendered_text),
              post: postAction === 'approve' ? approve(f, p) : publish(f, p),
            };
            const holderName = `p57-holder-${randomUUID()}`,
              waiterName = `p57-waiter-${randomUUID()}`;
            const holder = session(
              `begin;set application_name='${holderName}';${callerStatement(f.owner, calls[first as 'fact' | 'post'])}select pg_sleep(1.3);commit;`,
            );
            running.push(holder);
            await waitForSession(holderName);
            const waiter = session(
              `begin;set application_name='${waiterName}';${callerStatement(f.owner, calls[first === 'fact' ? 'post' : 'fact'])}commit;`,
            );
            running.push(waiter);
            await waitForSession(waiterName, "wait_event_type='Lock'");
            const locks = row<{ advisory: number; workspace_wait: boolean }>(`select
          (select count(*) from pg_locks l join pg_stat_activity a on a.pid=l.pid where a.application_name='${holderName}' and l.locktype='advisory' and l.granted) advisory,
          exists(select 1 from pg_locks l join pg_stat_activity a on a.pid=l.pid where a.application_name='${waiterName}' and not l.granted) workspace_wait`);
            expect(locks.advisory).toBeGreaterThanOrEqual(3);
            expect(locks.workspace_wait).toBe(true);
            const [h, w] = await Promise.all([holder, waiter]);
            expect(h.code).toBe(0);
            const current = get(f, p.post_public_id);
            if (factAction === 'correct') {
              if (first === 'fact') {
                expect(w.error).toBe('REVISION_CONFLICT');
                expect(current.status).toBe('draft');
                expect(current.revision).toBe(p.revision + 1);
              } else {
                expect(w.code).toBe(0);
                if (postAction === 'publish') {
                  expect(current.status).toBe('posted');
                  expect(current.revision).toBe(p.revision + 1);
                  const afterPublication = evidence(current);
                  const publishedUsages = usages(current);
                  expect(
                    (publishedUsages.junctions as Record<string, unknown>[]).map(
                      (x) => x.source_snapshot,
                    ),
                  ).toEqual(
                    (snapshot.junctions as Record<string, unknown>[]).map((x) => x.source_snapshot),
                  );
                  expect(current.editorial_checks).toEqual({
                    ...(before.editorial_checks as object),
                    post_revision: current.revision,
                  });
                  expect(replayDigest(lifecycleRpc(f, calls.post))).toBe(replayDigest(result(h)));
                  lifecycleRpc(f, archive(f, current));
                  expect(evidence(get(f, p.post_public_id))).toEqual(afterPublication);
                  expect(usages(current)).toEqual(publishedUsages);
                } else {
                  expect(current.status).toBe('draft');
                  expect(current.revision).toBe(p.revision + 2);
                  expect(evidence(current).approval_snapshot).toBeNull();
                }
              }
            } else {
              expect(w.code).toBe(0);
              expect(current.status).toBe(postAction === 'approve' ? 'ready' : 'posted');
              expect(current.revision).toBe(p.revision + 1);
              expect(
                (usages(current).junctions as Record<string, unknown>[]).map(
                  (x) => x.source_snapshot,
                ),
              ).toEqual(
                (snapshot.junctions as Record<string, unknown>[]).map((x) => x.source_snapshot),
              );
              if (postAction === 'publish') {
                const permanent = usages(current),
                  historical = evidence(current);
                rpc(f, reverify(f, fact.fact_public_id, fact.rendered_text));
                expect(usages(current)).toEqual(permanent);
                expect(evidence(current)).toEqual(historical);
              }
            }
            console.info(
              `CON-FACT ${factAction}/${postAction} ${first}-first: holder=${h.code}, waiter=${w.code === 0 ? 'success' : w.error}, final=${current.status}@${current.revision}`,
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
  }, 120_000);

  it('CON-REPLAY all five same-key concurrent calls have one mutation/history and original replay', async () => {
    const f = fixture();
    const running: Promise<SessionResult>[] = [];
    try {
      for (const builder of [approve, revoke, discard, publish, archive]) {
        let p = rpc(f, save(f, request(f))).data.post;
        if (builder === revoke || builder === publish || builder === archive) p = ready(f, p);
        if (builder === archive) p = posted(f, p);
        const call = builder(f, p);
        const historyBefore = row<{ n: number }>(
          `select count(*) n from internal.post_write_history where workspace_id=(select id from public.workspaces where public_id='${f.workspace}')`,
        ).n;
        const calls = [
          session(`begin;${callerStatement(f.owner, call)}commit;`),
          session(`begin;${callerStatement(f.owner, call)}commit;`),
        ];
        running.push(...calls);
        const responses = await Promise.all(calls);
        expect(responses.map((x) => x.code)).toEqual([0, 0]);
        const [a, b] = responses.map(result);
        expect([a!.data.replayed, b!.data.replayed].sort()).toEqual([false, true]);
        expect(replayDigest(a!)).toBe(replayDigest(b!));
        expect(get(f, p.post_public_id).revision).toBe(p.revision + 1);
        expect(
          row<{ n: number }>(
            `select count(*) n from internal.post_write_history where workspace_id=(select id from public.workspaces where public_id='${f.workspace}')`,
          ).n,
        ).toBe(historyBefore + 1);
      }
    } finally {
      await Promise.allSettled(running);
      cleanup(f);
    }
  }, 60_000);

  it('CON-LIFECYCLE publish versus revoke/discard BOTH orders and competing approvals have one legal CAS winner', async () => {
    const f = fixture();
    const running: Promise<SessionResult>[] = [];
    try {
      for (const competitor of [revoke, discard])
        for (const first of ['publish', 'competitor']) {
          const p = ready(f, rpc(f, save(f, request(f))).data.post);
          const calls = { publish: publish(f, p), competitor: competitor(f, p) };
          const name = `p57-cas-${randomUUID()}`;
          const holder = session(
            `begin;set application_name='${name}';${callerStatement(f.owner, calls[first as 'publish' | 'competitor'])}select pg_sleep(1.2);commit;`,
          );
          running.push(holder);
          await waitForSession(name);
          const waiterName = `p57-cas-wait-${randomUUID()}`;
          const waiter = session(
            `begin;set application_name='${waiterName}';${callerStatement(f.owner, calls[first === 'publish' ? 'competitor' : 'publish'])}commit;`,
          );
          running.push(waiter);
          await waitForSession(waiterName, "wait_event_type='Lock'");
          const [h, w] = await Promise.all([holder, waiter]);
          expect(h.code).toBe(0);
          expect(w.error).toBe('REVISION_CONFLICT');
          const current = get(f, p.post_public_id);
          expect(current.status).toBe(
            first === 'publish' ? 'posted' : competitor === revoke ? 'draft' : 'discarded',
          );
          expect(current.revision).toBe(p.revision + 1);
          expect(
            (usages(current).junctions as Record<string, unknown>[]).every(
              (x) =>
                x.allocation_state ===
                (first === 'publish'
                  ? 'published'
                  : competitor === discard
                    ? 'released'
                    : 'allocated'),
            ),
          ).toBe(true);
        }
      const p = rpc(f, save(f, request(f))).data.post;
      const twins = [
        session(`begin;${callerStatement(f.owner, approve(f, p))}commit;`),
        session(`begin;${callerStatement(f.owner, approve(f, p))}commit;`),
      ];
      running.push(...twins);
      const r = await Promise.all(twins);
      expect(r.filter((x) => x.code === 0)).toHaveLength(1);
      expect(r.find((x) => x.code !== 0)?.error).toBe('REVISION_CONFLICT');
    } finally {
      await Promise.allSettled(running);
      cleanup(f);
    }
  }, 65_000);

  it('DATABASE-BUSY lifecycle lock timeout and actual cancellation roll back completely, then same-key retry succeeds', async () => {
    const f = fixture();
    const running: Promise<SessionResult>[] = [];
    try {
      const p = rpc(f, save(f, request(f))).data.post;
      const call = approve(f, p);
      const before = state(f);
      const name = `p57-timeout-${randomUUID()}`;
      const holder = session(
        `begin;set application_name='${name}';select id from public.workspaces where public_id='${f.workspace}' for no key update;select pg_sleep(3.2);commit;`,
      );
      running.push(holder);
      await waitForSession(name);
      expect(() => lifecycleRpc(f, call)).toThrow(/^DATABASE_BUSY$/);
      expect(state(f)).toBe(before);
      await holder;
      const cancelName = `p57-cancel-${randomUUID()}`,
        waiterName = `p57-cancel-wait-${randomUUID()}`;
      const locker = session(
        `begin;set application_name='${cancelName}';select id from public.workspaces where public_id='${f.workspace}' for no key update;select pg_sleep(1.7);commit;`,
      );
      running.push(locker);
      await waitForSession(cancelName);
      const waiter = session(
        `begin;set application_name='${waiterName}';${callerStatement(f.owner, call)}commit;`,
      );
      running.push(waiter);
      await waitForSession(waiterName, "wait_event_type='Lock'");
      expect(
        row<{ ok: boolean }>(
          `select pg_cancel_backend(pid) ok from pg_stat_activity where application_name='${waiterName}'`,
        ).ok,
      ).toBe(true);
      const result = await waiter;
      expect(result.error).toBe('DATABASE_BUSY');
      expect(state(f)).toBe(before);
      await locker;
      expect(lifecycleRpc(f, call).data.revision).toBe(p.revision + 1);
      expect(lifecycleRpc(f, call).data.replayed).toBe(true);
      const readyPost = get(f, p.post_public_id);
      rpc(f, reschedule(f, readyPost, null));
    } finally {
      await Promise.allSettled(running);
      cleanup(f);
    }
  }, 30_000);
});
