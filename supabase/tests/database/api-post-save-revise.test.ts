import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import {
  bindings,
  claim,
  cleanup,
  content,
  createPlan,
  expire,
  fixture,
  get,
  json,
  release,
  replayDigest,
  request,
  revise,
  row,
  rpc,
  rpcClaims,
  save,
  setReady,
  sql,
  state,
} from './helpers/post-rpc.js';
import { factInput, reserve, reverify, source } from './helpers/trivia-rpc.js';

describe('Checkpoint 5.6 public draft save/revise', () => {
  it('CORE-007 known plan claim token cannot escape through immutable public source metadata', () => {
    const f = fixture();
    try {
      const plan = createPlan(f, 1);
      const claimed = rpc(f, claim(f, plan.data.plan.plan_public_id)) as unknown as {
        data: { claimed_items: { item: { plan_item_public_id: string }; claim_token: string }[] };
      };
      const item = claimed.data.claimed_items[0]!;
      const r = request(f);
      r.plan = {
        plan_item_public_id: item.item.plan_item_public_id,
        claim_token: item.claim_token,
      };
      const fact = r.bindings[0]!;
      rpc(
        f,
        reverify(f, fact.fact_public_id, fact.rendered_text, undefined, undefined, [
          { ...source(), supports: item.claim_token },
        ]),
      );
      const before = state(f);
      expect(() => rpc(f, save(f, r))).toThrow(/^VALIDATION_FAILED$/);
      expect(state(f)).toBe(before);
      rpc(f, reverify(f, fact.fact_public_id, fact.rendered_text));
      expect(rpc(f, save(f, r)).data.plan?.progress.completed).toBe(1);
    } finally {
      cleanup(f);
    }
  }, 30_000);
  it('CORE-005 standalone save, authoritative evidence and exact replay after revision', () => {
    const f = fixture();
    try {
      const r = request(f);
      const expression = save(f, r);
      const first = rpc(f, expression);
      const p = first.data.post;
      expect(p.status).toBe('draft');
      expect(p.revision).toBe(1);
      expect(p.fact_bindings).toHaveLength(5);
      expect(p.system_checks.post_revision).toBe(1);
      expect(p.editorial_checks.content_hash).toBe(p.content_hash);
      expect(
        row<{ n: number }>(
          `select count(*) n from public.trivia_facts where reservation_token='${r.token}'`,
        ).n,
      ).toBe(0);
      r.content = { ...r.content, caption: 'A revised fixture framing.' };
      const revision = revise(f, p, r);
      const second = rpc(f, revision);
      expect(second.data.post.revision).toBe(2);
      expect(second.data.post.content_hash).not.toBe(p.content_hash);
      expect(replayDigest(rpc(f, expression) as never)).toBe(replayDigest(first as never));
      expect(replayDigest(rpc(f, revision) as never)).toBe(replayDigest(second as never));
      const before = state(f);
      r.content = { ...r.content, caption: 'Different request.' };
      expect(() => rpc(f, save(f, r))).toThrow(/^OPERATION_KEY_REUSED$/);
      expect(state(f)).toBe(before);
      expect(() => rpc(f, revise(f, p, r))).toThrow(/^REVISION_CONFLICT$/);
    } finally {
      cleanup(f);
    }
  }, 30_000);
  it('CORE-005 public plan claim/save completes exactly one item and preserves attempt history', () => {
    const f = fixture();
    try {
      const plan = createPlan(f, 2, ['2026-10-20T10:00:00Z', null]);
      const claimed = rpc(f, claim(f, plan.data.plan.plan_public_id)) as unknown as {
        data: { claimed_items: { item: { plan_item_public_id: string }; claim_token: string }[] };
      };
      const item = claimed.data.claimed_items[0]!;
      const r = request(f);
      r.plan = {
        plan_item_public_id: item.item.plan_item_public_id,
        claim_token: item.claim_token,
      };
      r.schedule = '2026-10-20T10:00:00Z';
      const wrong = { ...r, plan: { ...(r.plan as object), claim_token: randomUUID() } };
      const before = state(f);
      expect(() => rpc(f, save(f, wrong))).toThrow(/^PLAN_ITEM_CLAIM_MISMATCH$/);
      expect(state(f)).toBe(before);
      const result = rpc(f, save(f, r));
      expect(result.data.plan?.status).toBe('partially_completed');
      expect(result.data.plan?.progress.completed).toBe(1);
      expect(
        row<{ status: string; attempt_count: number; claim_token: null }>(
          `select status,attempt_count,claim_token from public.content_plan_items where public_id='${item.item.plan_item_public_id}'`,
        ),
      ).toEqual({ status: 'completed', attempt_count: 1, claim_token: null });
      expect(
        row<{ n: number }>(
          `select count(*) n from internal.content_plan_item_events where event_type='completed' and item_public_id='${item.item.plan_item_public_id}'`,
        ).n,
      ).toBe(1);
      expect(rpc(f, save(f, r)).data.replayed).toBe(true);
    } finally {
      cleanup(f);
    }
  }, 30_000);
  it('RPC-REVISE partial/full replacement, reordering and re-addition preserve snapshots/history', () => {
    const f = fixture();
    try {
      const r = request(f);
      let p = rpc(f, save(f, r)).data.post;
      const original = r.bindings;
      const snap = row<{ s: unknown }>(
        `select source_snapshot s from public.trivia_post_facts where post_id=(select id from public.posts where public_id='${p.post_public_id}') and position=1`,
      ).s;
      const fresh = bindings(f, 2);
      r.bindings = [...original.slice(0, 3), ...fresh.bindings].map((b, i) => ({
        ...b,
        position: i + 1,
      }));
      r.content = content(r.bindings);
      const replaced = rpc(f, revise(f, p, r, randomUUID(), fresh.token));
      p = replaced.data.post;
      expect(replaced.data.released_fact_public_ids).toHaveLength(2);
      expect(replaced.data.replaced_fact_public_ids).toHaveLength(2);
      expect(
        row<{ s: unknown }>(
          `select source_snapshot s from public.trivia_post_facts where post_id=(select id from public.posts where public_id='${p.post_public_id}') and is_current and position=1`,
        ).s,
      ).toEqual(snap);
      r.bindings = r.bindings.toReversed().map((b, i) => ({ ...b, position: i + 1 }));
      r.content = content(r.bindings);
      p = rpc(f, revise(f, p, r)).data.post;
      expect(get(f, p.post_public_id).fact_bindings.map((b) => b.fact_public_id)).toEqual(
        r.bindings.map((b) => b.fact_public_id),
      );
      expect(
        row<{ n: number }>(
          `select count(*) n from public.trivia_post_facts where post_id=(select id from public.posts where public_id='${p.post_public_id}') and not is_current`,
        ).n,
      ).toBe(2);
      const oldFact = original[3]!;
      const identity = row<Record<string, unknown>>(
        `select claim_text,subject_key,relation_key,object_key,numbers,qualifiers,topic_key,normalization_version,ontology_version from public.trivia_facts where public_id='${oldFact.fact_public_id}'`,
      );
      const token = randomUUID();
      rpc(
        f,
        reserve(
          f,
          [factInput({ ...identity, candidate_key: randomUUID().replaceAll('-', '') })],
          randomUUID(),
          token,
        ),
      );
      r.bindings = [...r.bindings.slice(0, 4), oldFact].map((b, i) => ({ ...b, position: i + 1 }));
      r.content = content(r.bindings);
      p = rpc(f, revise(f, p, r, randomUUID(), token)).data.post;
      expect(
        row<{ n: number }>(
          `select count(*) n from public.trivia_post_facts j join public.trivia_facts f on f.id=j.fact_id where j.post_id=(select id from public.posts where public_id='${p.post_public_id}') and f.public_id='${oldFact.fact_public_id}'`,
        ).n,
      ).toBe(2);
      const next = bindings(f, 5);
      r.bindings = next.bindings;
      r.content = content(r.bindings);
      p = rpc(f, revise(f, p, r, randomUUID(), next.token)).data.post;
      expect(p.fact_bindings).toHaveLength(5);
      const ready = setReady(f, p);
      r.content = { ...r.content, caption: 'Explicit revision of approved content.' };
      const revised = rpc(f, revise(f, ready, r));
      expect(revised.data.approval_invalidated).toBe(true);
      expect(revised.data.post.status).toBe('draft');
      expect(
        row<{ a: null }>(
          `select approval_snapshot a from public.posts where public_id='${p.post_public_id}'`,
        ).a,
      ).toBeNull();
    } finally {
      cleanup(f);
    }
  }, 40_000);
  it('CORE-007 history/ledger bounds, immutability, owner RLS and corrupted replay fail closed', () => {
    const f = fixture();
    try {
      const r = request(f);
      const expression = save(f, r);
      const saved = rpc(f, expression);
      const catalog = row<{
        api: number;
        private: boolean;
        immutable: boolean;
        bounded: boolean;
        no_tokens: boolean;
      }>(`select
        (select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='api') api,
        not has_table_privilege('authenticated','internal.post_write_history','SELECT,INSERT,UPDATE,DELETE') private,
        not has_table_privilege('content_producer_api_owner','internal.post_write_history','UPDATE,DELETE') immutable,
        (select bool_and(octet_length(response::text)<=524288 and octet_length(before_evidence::text)<=98304) from internal.post_write_history) bounded,
        not exists(select 1 from internal.operation_ledger where response_snapshot::text ~ '"(reservation_token|claim_token|content_payload|sources)"') no_tokens`);
      expect(catalog).toEqual({
        api: 33,
        private: true,
        immutable: true,
        bounded: true,
        no_tokens: true,
      });
      for (const role of ['anon', 'authenticated', 'service_role'])
        for (const operation of [
          'select * from public.posts',
          'select * from public.trivia_post_facts',
          'select * from internal.post_write_history',
          "select nextval('internal.post_write_history_id_seq')",
          "select internal.post_replay_v6(1,'save_post')",
        ]) {
          expect(() => sql(`begin; set local role ${role}; ${operation}; rollback;`)).toThrow();
        }
      const owner = (actor: string) =>
        sql(`begin; select set_config('request.jwt.claims',${json({ sub: actor, client_id: 'fixture', role: 'authenticated' })}::text,true);
        set local role content_producer_api_owner; select count(*) from internal.post_write_history;rollback;`)
          .split('\n')
          .at(-1);
      expect(owner(f.owner)).toBe('1');
      expect(owner(f.other)).toBe('0');
      expect(() =>
        sql(
          `update internal.post_write_history set response='{}' where post_id=(select id from public.posts where public_id='${saved.data.post.post_public_id}')`,
        ),
      ).toThrow(/^IMMUTABLE_HISTORY$/);
      sql(
        `update internal.operation_ledger set response_snapshot=jsonb_set(response_snapshot,'{history_public_id}',to_jsonb('${randomUUID()}'::text)) where operation_key='${r.key}'`,
      );
      expect(() => rpc(f, expression)).toThrow(/^INTERNAL_ERROR$/);
      const oversized = request(f);
      oversized.content = { ...oversized.content, caption: 'x'.repeat(17000) };
      expect(() => rpc(f, save(f, oversized))).toThrow(/^CONTENT_PAYLOAD_INVALID$/);
    } finally {
      cleanup(f);
    }
  }, 30_000);
  it('FACT-004/006 expired reservation/claim and stale evidence cannot leave a partial draft', () => {
    const f = fixture();
    try {
      const expired = request(f);
      for (const b of expired.bindings) expire(b.fact_public_id);
      const previous = state(f);
      expect(() => rpc(f, save(f, expired))).toThrow(/^FACT_RESERVATION_EXPIRED$/);
      expect(state(f)).toBe(previous);
      const plan = createPlan(f, 1);
      const claimed = rpc(f, claim(f, plan.data.plan.plan_public_id)) as unknown as {
        data: { claimed_items: { item: { plan_item_public_id: string }; claim_token: string }[] };
      };
      const item = claimed.data.claimed_items[0]!;
      const r = request(f);
      r.plan = {
        plan_item_public_id: item.item.plan_item_public_id,
        claim_token: item.claim_token,
      };
      sql(
        `update public.content_plan_items set claimed_at=clock_timestamp()-interval '31 minutes',claim_expires_at=clock_timestamp()-interval '1 minute' where public_id='${item.item.plan_item_public_id}'`,
      );
      expect(() => rpc(f, save(f, r))).toThrow(/^PLAN_ITEM_CLAIM_EXPIRED$/);
      const current = request(f);
      const p = rpc(f, save(f, current)).data.post;
      const snap = row<{ s: unknown }>(
        `select source_snapshot s from public.trivia_post_facts where post_id=(select id from public.posts where public_id='${p.post_public_id}') and position=1`,
      ).s;
      expect(() =>
        sql(
          `update public.trivia_post_facts set source_snapshot=jsonb_set(source_snapshot,'{canonical_claim}','"Rewrite history"') where post_id=(select id from public.posts where public_id='${p.post_public_id}') and position=1`,
        ),
      ).toThrow(/^MODULE_RELATION_INVALID$/);
      expect(
        row<{ s: unknown }>(
          `select source_snapshot s from public.trivia_post_facts where post_id=(select id from public.posts where public_id='${p.post_public_id}') and position=1`,
        ).s,
      ).toEqual(snap);
    } finally {
      cleanup(f);
    }
  }, 30_000);
  it('CORE-007 owner/client/schema/fact/config/CAS denial leaves no partial business mutation', () => {
    const f = fixture();
    try {
      const r = request(f);
      const expression = save(f, r);
      const before = state(f);
      const criteria = r.editorial.criteria as Record<string, unknown>[];
      expect(() =>
        rpc(
          f,
          save(f, {
            ...r,
            editorial: { ...r.editorial, criteria: [{ ...criteria[0], note: r.token }] },
          }),
        ),
      ).toThrow(/^VALIDATION_FAILED$/);
      expect(() => rpc(f, expression, f.other)).toThrow(/^OWNER_ACCESS_REQUIRED$/);
      expect(() => rpcClaims(expression, { sub: f.owner, role: 'authenticated' })).toThrow(
        /^OAUTH_CLIENT_REQUIRED$/,
      );
      expect(() =>
        rpcClaims(expression, { role: 'authenticated', client_id: randomUUID() }),
      ).toThrow(/^AUTH_REQUIRED$/);
      const bad = { ...r, configTime: '2000-01-01T00:00:00Z' };
      expect(() => rpc(f, save(f, bad))).toThrow(/^FACT_RESERVATION_CONTEXT_CHANGED$/);
      const wrong = {
        ...r,
        bindings: r.bindings.map((b, i) => (i === 0 ? { ...b, fact_public_id: randomUUID() } : b)),
      };
      expect(() => rpc(f, save(f, wrong))).toThrow(/^FACT_RESERVATION_MISMATCH$/);
      expect(state(f)).toBe(before);
      const p = rpc(f, expression).data.post;
      expect(() => rpc(f, revise(f, { ...p, content_hash: 'f'.repeat(64) }, r))).toThrow(
        /^CONTENT_HASH_CONFLICT$/,
      );
      sql(
        `update public.posts set status='discarded',discarded_at=now() where public_id='${p.post_public_id}'`,
      );
      expect(() => rpc(f, revise(f, p, r))).toThrow(/^INVALID_STATUS_TRANSITION$/);
    } finally {
      cleanup(f);
    }
  }, 30_000);
  it('RPC-ROLLBACK completion fault rolls back save/revise/history/plan and keeps reservation releasable', () => {
    const f = fixture();
    try {
      const r = request(f);
      const before = state(f);
      sql(`create function internal.test_post_completion_fault() returns trigger language plpgsql as $$begin raise exception 'TEST_POST_FAULT'; end$$;
        create trigger test_post_fault before insert on internal.post_write_history for each row execute function internal.test_post_completion_fault();`);
      try {
        expect(() => rpc(f, save(f, r))).toThrow(/^INTERNAL_ERROR$/);
        expect(state(f)).toBe(before);
      } finally {
        sql(
          'drop trigger test_post_fault on internal.post_write_history; drop function internal.test_post_completion_fault();',
        );
      }
      const p = rpc(f, save(f, r)).data.post;
      r.content = { ...r.content, caption: 'A faulted revision.' };
      const prior = state(f);
      sql(`create function internal.test_post_completion_fault() returns trigger language plpgsql as $$begin raise exception 'TEST_POST_FAULT'; end$$;
        create trigger test_post_fault before insert on internal.post_write_history for each row execute function internal.test_post_completion_fault();`);
      try {
        expect(() => rpc(f, revise(f, p, r))).toThrow(/^INTERNAL_ERROR$/);
        expect(state(f)).toBe(prior);
      } finally {
        sql(
          'drop trigger test_post_fault on internal.post_write_history; drop function internal.test_post_completion_fault();',
        );
      }
      const abandoned = request(f);
      const malformed = {
        ...abandoned,
        content: { ...abandoned.content, canva_copy: 'Wrong copy.' },
      };
      expect(() => rpc(f, save(f, malformed))).toThrow(/^CONTENT_RENDER_MISMATCH$/);
      expect(
        (
          rpc(f, release(f, abandoned.token)) as unknown as {
            data: { released_fact_public_ids: string[] };
          }
        ).data.released_fact_public_ids,
      ).toHaveLength(5);
    } finally {
      cleanup(f);
    }
  }, 40_000);
});
