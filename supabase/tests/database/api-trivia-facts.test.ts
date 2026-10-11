import { randomUUID } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import {
  candidate,
  cleanup,
  correct,
  digest,
  expire,
  factInput,
  fixture,
  json,
  postFixture,
  release,
  replayDigest,
  reserve,
  reserved,
  reverify,
  row,
  rpc,
  secondPage,
  setReuse,
  source,
  sql,
  state,
} from './helpers/trivia-rpc.js';

describe('Checkpoint 5.5 public trivia registration, search and release', () => {
  it('RPC-FACT-001 / CORE-001 preserves ordered reserve/release replay, token privacy and historical inactive binding', () => {
    const f = fixture();
    try {
      const token = randomUUID();
      const input = [
        factInput(candidate(2), 1),
        factInput(candidate(3), 2),
        factInput(candidate(4), 3),
      ];
      const key = randomUUID();
      const expression = reserve(f, input, key, token);
      const first = rpc(f, expression);
      expect(digest(first.data.reservation_token)).toBe(digest(token));
      expect(reserved(first).map((x) => x.canonical_action)).toEqual([
        'created_new',
        'created_new',
        'created_new',
      ]);
      expect(replayDigest(rpc(f, expression))).toBe(replayDigest(first));
      expect(() => rpc(f, reserve(f, input, key, randomUUID()))).toThrow('OPERATION_KEY_REUSED');
      const releaseExpression = release(f, token);
      const released = rpc(f, releaseExpression);
      expect(released.data.released_fact_public_ids).toHaveLength(3);
      expect(replayDigest(rpc(f, releaseExpression))).toBe(replayDigest(released));
      expect(() =>
        rpc(f, releaseExpression.replace('Abandon this attempt.', 'A different release reason.')),
      ).toThrow('OPERATION_KEY_REUSED');
      expect(rpc(f, release(f, token)).data.already_inactive_count).toBe(3);
      expect(replayDigest(rpc(f, expression))).toBe(replayDigest(first));
      expect(() => rpc(f, reserve(f, input, randomUUID(), token))).toThrow(
        'FACT_RESERVATION_EXPIRED',
      );
      const privacy = row<{ leaked: boolean; count: number }>(`select
        exists(select 1 from internal.operation_ledger where workspace_id=(select id from public.workspaces where public_id='${f.workspace}')
          and (response_snapshot::text like '%reservation_token%' or response_snapshot::text like '%${token}%')) leaked,
        (select count(*) from internal.trivia_reservation_sets where workspace_id=(select id from public.workspaces where public_id='${f.workspace}')) count`);
      expect(privacy).toEqual({ leaked: false, count: 1 });
      expect(rpc(f, release(f, randomUUID())).data.already_inactive_count).toBe(0);
    } finally {
      cleanup(f);
    }
  });

  it('RPC-DEDUP-001 returns deterministic capped source-free matches without business mutations or private fields', () => {
    const f = fixture();
    try {
      const c = candidate();
      const initial = rpc(f, reserve(f, [factInput(c)]));
      const expression = `api.trivia_find_similar_facts(1,'${f.workspace}','${f.page}',${json([c])},20)`;
      const before = state(f);
      const found = rpc(f, expression);
      expect(digest(found)).toBe(digest(rpc(f, expression)));
      expect(state(f)).toBe(before);
      const result = (
        found.data.candidates as {
          matches: {
            fact_public_id: string;
            signals: string[];
            score_components: Record<string, number>;
            freshness: unknown;
          }[];
        }[]
      )[0]!;
      expect(result.matches[0]!.fact_public_id).toBe(reserved(initial)[0]!.fact_public_id);
      expect(result.matches[0]!.signals).toContain('exact_claim');
      expect(result.matches[0]!.signals).not.toContain('source_overlap');
      expect(result.matches[0]!.score_components).not.toHaveProperty('source_overlap');
      expect(JSON.stringify(found)).not.toMatch(
        /reservation_token|workspace_id|source_data|actor_user_id/,
      );
      expect(() => rpc(f, expression, f.other)).toThrow('OWNER_ACCESS_REQUIRED');
      expect(() =>
        rpc(
          f,
          `api.trivia_find_similar_facts(1,'${f.workspace}','${f.page}',${json([{ ...c, invented: true }])},20)`,
        ),
      ).toThrow('VALIDATION_FAILED');
      expect(() =>
        rpc(f, `api.trivia_find_similar_facts(1,'${f.workspace}','${f.page}',${json([c])},21)`),
      ).toThrow('VALIDATION_FAILED');
      const other = fixture();
      try {
        expect(
          (
            rpc(
              other,
              `api.trivia_find_similar_facts(1,'${other.workspace}','${other.page}',${json([c])},20)`,
            ).data.candidates as { matches: unknown[] }[]
          )[0]!.matches,
        ).toHaveLength(0);
      } finally {
        cleanup(other);
      }
    } finally {
      cleanup(f);
    }
  });

  it('accepts nine explicitly discriminated same-topic members without invented intra-set reviews and obeys match caps', () => {
    const f = fixture();
    try {
      const base = candidate();
      const facts = Array.from({ length: 9 }, (_, i) =>
        factInput(
          {
            ...base,
            candidate_key: `batch_${i}`,
            claim_text: `The fixture species has ${i + 1} markers.`,
            object_key: String(i + 1),
            numbers: [{ value: String(i + 1), unit: 'count', role: 'count' }],
          },
          i + 1,
        ),
      );
      const r = rpc(f, reserve(f, facts));
      expect(reserved(r)).toHaveLength(9);
      expect(reserved(r).map((x) => x.canonical_action)).toEqual(Array(9).fill('created_new'));
      const found = rpc(
        f,
        `api.trivia_find_similar_facts(1,'${f.workspace}','${f.page}',${json([facts[0]!.candidate])},3)`,
      );
      expect((found.data.candidates as { matches: unknown[] }[])[0]!.matches).toHaveLength(3);
      expect(() => rpc(f, reserve(f, [...facts, factInput(candidate(), 10)]))).toThrow(
        'VALIDATION_FAILED',
      );
      expect(() => rpc(f, reserve(f, [factInput(candidate(), 2)]))).toThrow('VALIDATION_FAILED');
    } finally {
      cleanup(f);
    }
  }, 20_000);

  it('distinguishes exact, safe structured and reviewed same matches, refreshes expired evidence and rejects uncertain/unsafe duplicates', () => {
    const f = fixture();
    try {
      const c = candidate();
      const first = rpc(f, reserve(f, [factInput(c)]));
      rpc(f, release(f, first.data.reservation_token as string));
      const exact = rpc(f, reserve(f, [factInput(c)]));
      expect(reserved(exact)[0]!.canonical_action).toBe('matched_existing');
      rpc(f, release(f, exact.data.reservation_token as string));
      const structured = rpc(
        f,
        reserve(f, [factInput({ ...c, claim_text: randomUUID().replaceAll('-', '') })]),
      );
      expect(reserved(structured)[0]!.fact_public_id).toBe(reserved(first)[0]!.fact_public_id);
      rpc(f, release(f, structured.data.reservation_token as string));
      sql(
        `update public.trivia_facts set verified_at=now()-interval '1 year',expires_at=now()-interval '1 day' where public_id='${reserved(first)[0]!.fact_public_id}';`,
      );
      const refreshed = rpc(f, reserve(f, [factInput(c)]));
      expect(reserved(refreshed)[0]!.canonical_action).toBe('refreshed_existing');
      const duplicate = [factInput(c), factInput({ ...c, candidate_key: 'another' }, 2)];
      expect(() => rpc(f, reserve(f, duplicate))).toThrow('FACT_RESERVATION_CONFLICT');
      rpc(f, release(f, refreshed.data.reservation_token as string));
      expect(() => rpc(f, reserve(f, duplicate))).toThrow('FACT_RESERVATION_MISMATCH');
      const unsafe = {
        ...candidate(),
        relation_key: 'can_perform',
        numbers: [],
        object_key: 'action',
      };
      const old = rpc(f, reserve(f, [factInput(unsafe)]));
      rpc(f, release(f, old.data.reservation_token as string));
      const changed = { ...unsafe, claim_text: randomUUID().replaceAll('-', '') };
      expect(() => rpc(f, reserve(f, [factInput(changed)]))).toThrow('FACT_REVIEW_REQUIRED');
      const reviewed = {
        ...factInput(changed),
        dedup_reviews: [
          {
            candidate_fact_public_id: reserved(old)[0]!.fact_public_id,
            decision: 'same',
            reason: 'The complete proposition is unchanged.',
            material_differences: [],
          },
        ],
      };
      expect(reserved(rpc(f, reserve(f, [reviewed])))[0]!.fact_public_id).toBe(
        reserved(old)[0]!.fact_public_id,
      );
      expect(() =>
        rpc(
          f,
          reserve(f, [
            {
              ...reviewed,
              dedup_reviews: [
                {
                  candidate_fact_public_id: reserved(old)[0]!.fact_public_id,
                  decision: 'uncertain',
                  reason: 'Uncertain.',
                  material_differences: [],
                },
              ],
            },
          ]),
        ),
      ).toThrow('VALIDATION_FAILED');
    } finally {
      cleanup(f);
    }
  });

  it('checks strong review and actual material discriminators without auto-merging related claims', () => {
    const f = fixture();
    try {
      const c = candidate(3);
      const first = rpc(f, reserve(f, [factInput(c)]));
      rpc(f, release(f, first.data.reservation_token as string));
      const next = {
        ...c,
        candidate_key: 'next',
        claim_text: randomUUID().replaceAll('-', ''),
        object_key: '4',
        numbers: [{ value: '4', unit: 'count', role: 'count' }],
      };
      const x = factInput(next);
      expect(() =>
        rpc(f, reserve(f, [{ ...x, candidate: { ...next, claim_text: c.claim_text } }])),
      ).toThrow('FACT_REVIEW_REQUIRED');
      expect(() => rpc(f, reserve(f, [x]))).toThrow('FACT_REVIEW_REQUIRED');
      const review = {
        candidate_fact_public_id: reserved(first)[0]!.fact_public_id,
        decision: 'distinct',
        reason: 'The count differs.',
        material_differences: ['number'],
      };
      expect(() =>
        rpc(
          f,
          reserve(f, [
            { ...x, dedup_reviews: [{ ...review, material_differences: ['negation'] }] },
          ]),
        ),
      ).toThrow('FACT_REVIEW_REQUIRED');
      const distinct = rpc(f, reserve(f, [{ ...x, dedup_reviews: [review] }]));
      expect(reserved(distinct)[0]!.fact_public_id).not.toBe(reserved(first)[0]!.fact_public_id);
    } finally {
      cleanup(f);
    }
  });

  it('validates source/freshness/risk/versions and rolls back an entire set on conflict', () => {
    const f = fixture();
    try {
      const c = candidate();
      const first = rpc(f, reserve(f, [factInput(c)]));
      const before = state(f);
      expect(() => rpc(f, reserve(f, [factInput(candidate(), 1), factInput(c, 2)]))).toThrow(
        'FACT_RESERVATION_CONFLICT',
      );
      expect(state(f)).toBe(before);
      for (const [input, error] of [
        [{ ...factInput(), sources: [source('D')] }, 'FACT_SOURCE_INSUFFICIENT'],
        [{ ...factInput(), risk_class: 'sensitive' }, 'FACT_SOURCE_INSUFFICIENT'],
        [{ ...factInput(), freshness_class: 'periodic' }, 'FACT_SOURCE_INSUFFICIENT'],
        [
          { ...factInput(), requested_expires_at: '2020-01-01T00:00:00Z' },
          'FACT_FRESHNESS_EXPIRED',
        ],
        [factInput({ ...candidate(), ontology_version: 2 }), 'ONTOLOGY_VERSION_UNSUPPORTED'],
        [{ ...factInput(), invented: 1 }, 'VALIDATION_FAILED'],
      ] as const) {
        expect(() => rpc(f, reserve(f, [input]))).toThrow(error);
      }
      expect(state(f)).toBe(before);
      const sensitive = rpc(
        f,
        reserve(f, [
          {
            ...factInput(),
            risk_class: 'sensitive',
            sources: [source(), source('B', 'independent')],
            requested_expires_at: '2030-01-01T00:00:00Z',
          },
        ]),
      );
      expect(
        new Date(reserved(sensitive)[0]!.expires_at).getTime() - Date.now(),
      ).toBeLessThanOrEqual(180 * 86400_000);
      expect(() =>
        rpc(f, reserve(f, [factInput(c)], randomUUID(), randomUUID(), '2020-01-01T00:00:00Z')),
      ).toThrow('FACT_RESERVATION_CONTEXT_CHANGED');
      expect(() => rpc(f, release(f, first.data.reservation_token as string), f.other)).toThrow(
        'OWNER_ACCESS_REQUIRED',
      );
    } finally {
      cleanup(f);
    }
  });

  it('releases expired/config-changed/corrected sets without affecting allocation or another Page binding', () => {
    let f = fixture();
    try {
      const c = candidate();
      const first = rpc(f, reserve(f, [factInput(c)]));
      const fact = reserved(first)[0]!.fact_public_id;
      const other = secondPage(f);
      expect(() => rpc(other, release(other, first.data.reservation_token as string))).toThrow(
        'FACT_RESERVATION_MISMATCH',
      );
      expire(fact);
      expect(
        rpc(f, release(f, first.data.reservation_token as string)).data.already_inactive_count,
      ).toBe(1);
      const next = rpc(f, reserve(f, [factInput(c)]));
      f = setReuse(f, 'page_unique');
      expect(
        rpc(f, release(f, next.data.reservation_token as string)).data.released_fact_public_ids,
      ).toHaveLength(1);
      const last = rpc(
        f,
        reserve(f, [factInput(c)], randomUUID(), randomUUID(), f.configTime, 'page_unique'),
      );
      const post = postFixture(f, fact);
      const junction = row<{ hash: string }>(
        `select md5(to_jsonb(j)::text) hash from public.trivia_post_facts j where post_id=(select id from public.posts where public_id='${post}')`,
      ).hash;
      rpc(f, correct(f, fact));
      expect(
        rpc(f, release(f, last.data.reservation_token as string)).data.already_inactive_count,
      ).toBe(1);
      expect(
        row<{ hash: string }>(
          `select md5(to_jsonb(j)::text) hash from public.trivia_post_facts j where post_id=(select id from public.posts where public_id='${post}')`,
        ).hash,
      ).toBe(junction);
    } finally {
      cleanup(f);
    }
  });

  it('enforces workspace/page reuse and allows released junction history without erasing published usage', () => {
    let f = fixture();
    try {
      const c = candidate();
      const first = rpc(f, reserve(f, [factInput(c)]));
      const fact = reserved(first)[0]!.fact_public_id;
      rpc(f, release(f, first.data.reservation_token as string));
      const post = postFixture(f, fact, 'posted');
      const other = secondPage(f);
      expect(() => rpc(other, reserve(other, [factInput(c)]))).toThrow('FACT_REUSE_BLOCKED');
      f = setReuse(f, 'page_unique');
      expect(() =>
        rpc(f, reserve(f, [factInput(c)], randomUUID(), randomUUID(), f.configTime, 'page_unique')),
      ).toThrow('FACT_REUSE_BLOCKED');
      const target = setReuse(other, 'page_unique');
      const ok = rpc(
        target,
        reserve(
          target,
          [factInput(c)],
          randomUUID(),
          randomUUID(),
          target.configTime,
          'page_unique',
        ),
      );
      expect(reserved(ok)[0]!.fact_public_id).toBe(fact);
      rpc(target, release(target, ok.data.reservation_token as string));
      expect(
        row<{ s: string }>(
          `select allocation_state s from public.trivia_post_facts where post_id=(select id from public.posts where public_id='${post}')`,
        ).s,
      ).toBe('published');
    } finally {
      cleanup(f);
    }
  });

  it('CORE-001 rolls back reserve and release at ledger completion and safely retries the same key', () => {
    const f = fixture();
    try {
      const expression = reserve(f);
      const before = state(f);
      sql(`create function internal.p55_completion_fault() returns trigger language plpgsql as $$ begin
        if new.workspace_id=(select id from public.workspaces where public_id='${f.workspace}') and new.completed_at is not null
          and new.operation_name like 'trivia_%' then raise exception 'FAULT_NO_DETAIL'; end if; return new; end $$;
        create trigger p55_completion_fault before update on internal.operation_ledger for each row execute function internal.p55_completion_fault();`);
      try {
        expect(() => rpc(f, expression)).toThrow('INTERNAL_ERROR');
        expect(state(f)).toBe(before);
      } finally {
        sql(
          'drop trigger p55_completion_fault on internal.operation_ledger; drop function internal.p55_completion_fault();',
        );
      }
      const r = rpc(f, expression);
      const releaseExpression = release(f, r.data.reservation_token as string);
      const active = state(f);
      sql(`create function internal.p55_completion_fault() returns trigger language plpgsql as $$ begin
        if new.workspace_id=(select id from public.workspaces where public_id='${f.workspace}') and new.completed_at is not null
          and new.operation_name='trivia_release_facts' then raise exception 'FAULT_NO_DETAIL'; end if; return new; end $$;
        create trigger p55_completion_fault before update on internal.operation_ledger for each row execute function internal.p55_completion_fault();`);
      try {
        expect(() => rpc(f, releaseExpression)).toThrow('INTERNAL_ERROR');
        expect(state(f)).toBe(active);
      } finally {
        sql(
          'drop trigger p55_completion_fault on internal.operation_ledger; drop function internal.p55_completion_fault();',
        );
      }
      expect(rpc(f, releaseExpression).data.released_fact_public_ids).toHaveLength(1);
      expect(() => rpc(f, reverify(f, reserved(r)[0]!.fact_public_id, 'Meaning changed.'))).toThrow(
        'FACT_CORRECTION_REQUIRED',
      );
    } finally {
      cleanup(f);
    }
  });
});
