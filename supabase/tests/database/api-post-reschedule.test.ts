import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import {
  cancel,
  claim,
  cleanup,
  createPlan,
  fixture,
  get,
  json,
  replayDigest,
  request,
  reschedule,
  revise,
  row,
  rpc,
  save,
  setReady,
  sql,
  state,
} from './helpers/post-rpc.js';
import { archive, discard, lifecycleRpc, posted } from './helpers/post-lifecycle.js';

describe('Checkpoint 5.6 public schedule-only revision', () => {
  it('CORE-003 archived posts still occupy slots; terminal targets reject schedule writes', () => {
    const f = fixture();
    try {
      const r = request(f);
      r.schedule = '2026-10-30T10:00:00Z';
      const published = posted(f, setReady(f, rpc(f, save(f, r)).data.post));
      lifecycleRpc(f, archive(f, published));
      const archived = get(f, published.post_public_id);
      const p = rpc(f, save(f, request(f))).data.post;
      const before = state(f);
      expect(() => rpc(f, reschedule(f, p, r.schedule))).toThrow(/^SCHEDULE_CONFLICT$/);
      expect(() => rpc(f, reschedule(f, archived, null))).toThrow(/^INVALID_STATUS_TRANSITION$/);
      expect(state(f)).toBe(before);
    } finally {
      cleanup(f);
    }
  }, 30_000);
  it('RPC-SCHEDULE linked move/clear changes both slots atomically and replays original schedule', () => {
    const f = fixture();
    try {
      const plan = createPlan(f, 2, ['2026-10-20T10:00:00Z', null]);
      const c = rpc(f, claim(f, plan.data.plan.plan_public_id)) as unknown as {
        data: { claimed_items: { item: { plan_item_public_id: string }; claim_token: string }[] };
      };
      const item = c.data.claimed_items[0]!;
      const r = request(f);
      r.plan = {
        plan_item_public_id: item.item.plan_item_public_id,
        claim_token: item.claim_token,
      };
      r.schedule = '2026-10-20T10:00:00Z';
      const p = rpc(f, save(f, r)).data.post;
      const expression = reschedule(f, p, '2026-10-21T10:00:00Z');
      const moved = rpc(f, expression);
      expect(moved.data.revision).toBe(2);
      expect(
        row<{ same: boolean }>(
          `select p.scheduled_at=i.scheduled_at same from public.posts p join public.content_plan_items i on i.id=p.content_plan_item_id where p.public_id='${p.post_public_id}'`,
        ).same,
      ).toBe(true);
      const after = get(f, p.post_public_id);
      expect(after.content_hash).toBe(p.content_hash);
      expect(after.content_payload).toEqual(p.content_payload);
      rpc(f, cancel(f, plan.data.plan.plan_public_id));
      const cleared = rpc(f, reschedule(f, after, null));
      expect(cleared.data.revision).toBe(3);
      expect(
        row<{ same: boolean }>(
          `select p.scheduled_at is null and i.scheduled_at is null same from public.posts p join public.content_plan_items i on i.id=p.content_plan_item_id where p.public_id='${p.post_public_id}'`,
        ).same,
      ).toBe(true);
      expect(replayDigest(rpc(f, expression) as never)).toBe(replayDigest(moved as never));
    } finally {
      cleanup(f);
    }
  }, 30_000);
  it('QUALITY-005 ready stays ready; evidence/approval carry original provenance across schedule revision', () => {
    const f = fixture();
    try {
      const p = setReady(f, rpc(f, save(f, request(f))).data.post);
      const original = row<{ a: Record<string, unknown>; e: unknown }>(
        `select approval_snapshot a,editorial_checks e from public.posts where public_id='${p.post_public_id}'`,
      );
      const expression = reschedule(f, p, '2026-10-23T12:00:00Z');
      const result = rpc(f, expression);
      expect(result.data.status).toBe('ready');
      const current = get(f, p.post_public_id);
      expect(current.content_hash).toBe(p.content_hash);
      expect(current.quality_status).toBe(p.quality_status);
      expect(current.editorial_checks).toEqual({
        ...p.editorial_checks,
        post_revision: p.revision + 1,
      });
      expect(
        row<{ s: unknown }>(
          `select system_checks s from public.posts where public_id='${p.post_public_id}'`,
        ).s,
      ).toEqual({ ...p.system_checks, post_revision: p.revision + 1 });
      expect(
        row<{ a: unknown }>(
          `select approval_snapshot a from public.posts where public_id='${p.post_public_id}'`,
        ).a,
      ).toEqual({ ...original.a, approved_revision: p.revision + 1 });
      expect(
        row<{ e: unknown }>(
          `select before_evidence->'editorial_checks' e from internal.post_write_history where operation_name='reschedule_post' and post_id=(select id from public.posts where public_id='${p.post_public_id}')`,
        ).e,
      ).toEqual(original.e);
      const before = state(f);
      expect(() => rpc(f, reschedule(f, p, null))).toThrow(/^REVISION_CONFLICT$/);
      expect(state(f)).toBe(before);
      expect(rpc(f, expression).data.replayed).toBe(true);
      sql(
        `update public.posts set approval_snapshot=jsonb_set(approval_snapshot,'{approved_revision}','1') where public_id='${p.post_public_id}'`,
      );
      expect(() => rpc(f, reschedule(f, current, null))).toThrow(/^APPROVAL_STALE$/);
    } finally {
      cleanup(f);
    }
  }, 30_000);
  it('CORE-003 conflict/new payload/non-owner/terminal and completion fault all roll back', () => {
    const f = fixture();
    try {
      const p = rpc(f, save(f, request(f))).data.post;
      const blocked = '2026-10-25T10:00:00Z';
      createPlan(f, 1, [blocked]);
      const before = state(f);
      expect(() => rpc(f, reschedule(f, p, blocked))).toThrow(/^SCHEDULE_CONFLICT$/);
      expect(state(f)).toBe(before);
      expect(() => rpc(f, reschedule(f, p, null), f.other)).toThrow(/^OWNER_ACCESS_REQUIRED$/);
      const key = randomUUID();
      rpc(f, reschedule(f, p, null, key));
      expect(() => rpc(f, reschedule(f, p, blocked, key))).toThrow(/^OPERATION_KEY_REUSED$/);
      const current = get(f, p.post_public_id);
      const previous = state(f);
      sql(`create function internal.test_post_completion_fault() returns trigger language plpgsql as $$begin raise exception 'TEST_POST_FAULT'; end$$;
        create trigger test_post_fault before insert on internal.post_write_history for each row execute function internal.test_post_completion_fault();`);
      try {
        expect(() => rpc(f, reschedule(f, current, null))).toThrow(/^INTERNAL_ERROR$/);
        expect(state(f)).toBe(previous);
      } finally {
        sql(
          'drop trigger test_post_fault on internal.post_write_history; drop function internal.test_post_completion_fault();',
        );
      }
      lifecycleRpc(f, discard(f, current));
      expect(() => rpc(f, reschedule(f, get(f, p.post_public_id), null))).toThrow(
        /^INVALID_STATUS_TRANSITION$/,
      );
    } finally {
      cleanup(f);
    }
  }, 30_000);
  it('QUALITY-005 draft missing/stale evidence is denied before rebinding with complete rollback', () => {
    const f = fixture();
    try {
      const p = rpc(f, save(f, request(f))).data.post;
      for (const evidence of [
        { system_checks: {}, editorial_checks: p.editorial_checks },
        { system_checks: p.system_checks, editorial_checks: {} },
        {
          system_checks: { ...p.system_checks, content_hash: 'f'.repeat(64) },
          editorial_checks: p.editorial_checks,
        },
        {
          system_checks: p.system_checks,
          editorial_checks: { ...p.editorial_checks, post_revision: 2 },
        },
      ]) {
        // Administrative corruption fixture; restore trigger before the public call.
        sql(`begin; alter table public.posts disable trigger posts_validate;
          update public.posts set system_checks=${json(evidence.system_checks)},editorial_checks=${json(evidence.editorial_checks)} where public_id='${p.post_public_id}';
          alter table public.posts enable trigger posts_validate; commit;`);
        const before = state(f);
        expect(() => rpc(f, reschedule(f, p, null))).toThrow(/^QUALITY_EVIDENCE_STALE$/);
        expect(state(f)).toBe(before);
      }
    } finally {
      cleanup(f);
    }
  }, 30_000);
  it('PERF-WRITE public bounded save/revise/reschedule p95 is below three seconds', () => {
    const f = fixture();
    try {
      const r = request(f);
      let p = rpc(f, save(f, r)).data.post;
      for (const operation of ['save', 'revise', 'reschedule']) {
        const samples: number[] = [];
        for (let i = 0; i < 12; i++) {
          // Reservation/config preparation is outside the measured write call.
          const expression =
            operation === 'save'
              ? save(f, request(f))
              : operation === 'revise'
                ? revise(f, p, r)
                : reschedule(f, p, null);
          const start = performance.now();
          const result = rpc(f, expression);
          samples.push(performance.now() - start);
          if (operation === 'revise') p = result.data.post;
          if (operation === 'reschedule') p = { ...p, revision: result.data.revision };
        }
        samples.sort((a, b) => a - b);
        const p95 = samples[Math.ceil(samples.length * 0.95) - 1]!;
        console.info(
          `PERF-WRITE ${operation}: 12 samples, local end-to-end p95=${p95.toFixed(1)}ms`,
        );
        expect(p95).toBeLessThan(3000);
      }
    } finally {
      cleanup(f);
    }
  }, 40_000);
});
