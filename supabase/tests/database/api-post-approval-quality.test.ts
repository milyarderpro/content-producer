import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import {
  approve,
  archive,
  cleanup,
  configure,
  content,
  corruptEvidence,
  discard,
  evidence,
  fixture,
  get,
  lifecycleRpc,
  json,
  posted,
  publish,
  ready,
  replayDigest,
  request,
  reverify,
  source,
  row,
  rpc,
  save,
  sql,
  state,
  usages,
} from './helpers/post-lifecycle.js';
import type { Request } from './helpers/post-rpc.js';

function criterion(r: Request, id: string, status: string): void {
  r.editorial = {
    ...r.editorial,
    overall_status: status === 'pass' ? 'pass' : status,
    criteria: (r.editorial.criteria as Record<string, unknown>[]).map((c) =>
      c.id === id ? { ...c, status } : c,
    ),
  };
}
describe('Checkpoint 5.7 effective warning and current publication gate', () => {
  it('RPC-APPROVAL all-pass preferred content needs no warning acceptance and preserves null reason', () => {
    const f = fixture();
    try {
      const r = request(f, 7);
      r.bindings = r.bindings.map((x) => ({
        ...x,
        rendered_text: 'One two three four five six seven eight.',
      }));
      r.content = content(r.bindings);
      const p = rpc(f, save(f, r)).data.post;
      expect((p.content_payload.text_metrics as Record<string, unknown>).word_count).toBe(65);
      expect(() =>
        lifecycleRpc(f, approve(f, p, randomUUID(), ['trivia.profile.preferred_band'])),
      ).toThrow(/^WAIVER_NOT_ALLOWED$/);
      expect(() =>
        lifecycleRpc(f, approve(f, p, randomUUID(), [], 'Unneeded acceptance reason.')),
      ).toThrow(/^VALIDATION_FAILED$/);
      const result = lifecycleRpc(f, approve(f, p, randomUUID(), [], null));
      expect(result.data.approval.accepted_warning_ids).toEqual([]);
      expect(result.data.approval.warning_acceptance_reason).toBeNull();
      expect(posted(f, get(f, p.post_public_id)).status).toBe('posted');
    } finally {
      cleanup(f);
    }
  }, 20_000);
  it('FACT-SOURCE / FACT-INTEGRITY and hard readability are never exempted by accepted preferences', () => {
    const f = fixture();
    try {
      const r = request(f);
      const p = rpc(f, save(f, r)).data.post;
      const fact = r.bindings[0]!;
      // Controlled corrupt evidence fixture; domain decision is exercised through api.
      sql(`begin;alter table public.trivia_facts disable trigger trivia_facts_validate_identity_source_freshness;
        update public.trivia_facts set source_data=${json([{ ...source(), tier: 'C', source_type: 'reputable_secondary' }])} where public_id='${fact.fact_public_id}';
        alter table public.trivia_facts enable trigger trivia_facts_validate_identity_source_freshness;commit;`);
      const before = state(f);
      expect(() => lifecycleRpc(f, approve(f, p))).toThrow(/^FACT_SOURCE_INSUFFICIENT$/);
      expect(state(f)).toBe(before);
      rpc(f, reverify(f, fact.fact_public_id, fact.rendered_text));
      const readyPost = ready(f, p);
      sql(`begin;alter table public.trivia_facts disable trigger trivia_facts_validate_identity_source_freshness;
        update public.trivia_facts set source_data=${json([{ ...source(), tier: 'C', source_type: 'reputable_secondary' }])} where public_id='${fact.fact_public_id}';
        alter table public.trivia_facts enable trigger trivia_facts_validate_identity_source_freshness;commit;`);
      const publishBefore = state(f);
      expect(() => lifecycleRpc(f, publish(f, readyPost))).toThrow(/^FACT_SOURCE_INSUFFICIENT$/);
      expect(state(f)).toBe(publishBefore);
      lifecycleRpc(f, discard(f, readyPost));
      const dense = request(f);
      dense.bindings = dense.bindings.map((x) => ({
        ...x,
        rendered_text: Array(18).fill('a').join(' '),
      }));
      dense.content = content(dense.bindings);
      // Five hook words + five facts of 18 words + six CTA words = 101.
      dense.content.hook = 'Did you ever really know?';
      dense.content.canva_copy = [
        dense.content.hook,
        ...dense.bindings.map((x) => x.rendered_text),
        dense.content.cta,
      ].join('\n\n');
      const blocked = rpc(f, save(f, dense)).data.post;
      expect((blocked.content_payload.text_metrics as Record<string, unknown>).word_count).toBe(
        101,
      );
      const checks = blocked.system_checks.checks as Record<string, unknown>[];
      expect(checks.find((x) => x.id === 'trivia.render.component_budget')?.status).toBe('passed');
      expect(checks.find((x) => x.id === 'trivia.render.final_budget')?.status).toBe('passed');
      expect(checks.find((x) => x.id === 'trivia.readability.hard_limits')?.status).toBe('failed');
      expect(() => lifecycleRpc(f, approve(f, blocked))).toThrow(/^QUALITY_SYSTEM_CHECK_FAILED$/);
    } finally {
      cleanup(f);
    }
  }, 35_000);
  it('RPC-QUALITY-003 adaptive count waiver preserves failed check/rollup and requires both stored override and owner reason', () => {
    const f = fixture();
    try {
      for (const count of [1, 4]) {
        const r = request(f, count);
        r.generation = {
          ...r.generation,
          fact_count_override: true,
          override_reason: 'Use a concise reviewed collection.',
        };
        const p = rpc(f, save(f, r)).data.post;
        expect(p.quality_status).toBe('failed');
        const ids = ['FACT_COUNT_BELOW_CONFIG_MIN', 'trivia.profile.preferred_band'];
        const before = state(f);
        expect(() => lifecycleRpc(f, approve(f, p))).toThrow(/^WAIVER_NOT_ALLOWED$/);
        expect(() => lifecycleRpc(f, approve(f, p, randomUUID(), ids, null))).toThrow(
          /^VALIDATION_FAILED$/,
        );
        expect(state(f)).toBe(before);
        const key = randomUUID();
        const approved = lifecycleRpc(f, approve(f, p, key, ids));
        expect(replayDigest(lifecycleRpc(f, approve(f, p, key, [...ids].reverse())))).toBe(
          replayDigest(approved),
        );
        const checks = approved.data.recomputed_checks;
        expect(checks.overall_status).toBe('failed');
        expect(
          (checks.checks as Record<string, unknown>[]).find(
            (c) => c.id === 'trivia.facts.count_valid',
          ),
        ).toMatchObject({ severity: 'blocking', status: 'failed', actual: count });
        const current = get(f, p.post_public_id);
        expect(current.quality_status).toBe('passed');
        expect(evidence(current).generation_snapshot).toEqual(r.generation);
        lifecycleRpc(f, publish(f, current));
      }
      const r = request(f, 3);
      const before = state(f);
      expect(() => rpc(f, save(f, r))).toThrow(/^VALIDATION_FAILED$/);
      expect(state(f)).toBe(before);
    } finally {
      cleanup(f);
    }
  }, 40_000);

  it('QUALITY-005 fixed/above-max count and hard budgets cannot be waived; public discard can abandon failed drafts', () => {
    const f = fixture();
    try {
      for (const config of [
        { mode: 'fixed', value: 7 },
        { mode: 'adaptive', min: 5, max: 6, preferred: 5 },
      ]) {
        configure(f, { fact_count: config });
        const r = request(f, config.mode === 'fixed' ? 5 : 7);
        const p = rpc(f, save(f, r)).data.post;
        const before = state(f);
        expect(() =>
          lifecycleRpc(
            f,
            approve(f, p, randomUUID(), [
              'FACT_COUNT_BELOW_CONFIG_MIN',
              'trivia.profile.preferred_band',
            ]),
          ),
        ).toThrow(/^QUALITY_SYSTEM_CHECK_FAILED$/);
        expect(state(f)).toBe(before);
        lifecycleRpc(f, discard(f, p));
        expect(get(f, p.post_public_id).status).toBe('discarded');
      }
      configure(f, { fact_count: { mode: 'adaptive', min: 5, max: 9, preferred: 7 } });
      const r = request(f);
      r.content = { ...r.content, hook: 'A'.repeat(80) };
      r.content.canva_copy = [
        r.content.hook,
        ...r.bindings.map((x) => x.rendered_text),
        r.content.cta,
      ].join('\n\n');
      const p = rpc(f, save(f, r)).data.post;
      const before = state(f);
      expect(() => lifecycleRpc(f, approve(f, p))).toThrow(/^QUALITY_SYSTEM_CHECK_FAILED$/);
      expect(state(f)).toBe(before);
      lifecycleRpc(f, discard(f, p));
    } finally {
      cleanup(f);
    }
  }, 40_000);

  it('RPC-APPROVAL exact acceptance for every style ID preserves needs_review and rejects fail/unlisted/critical/incomplete', () => {
    const f = fixture();
    try {
      for (const id of [
        'trivia.variety_sufficient',
        'trivia.caption_supportive',
        'trivia.visual_rhythm_clear',
      ]) {
        const r = request(f);
        criterion(r, id, 'needs_review');
        const p = rpc(f, save(f, r)).data.post;
        expect(() => lifecycleRpc(f, approve(f, p))).toThrow(/^WAIVER_NOT_ALLOWED$/);
        const result = lifecycleRpc(
          f,
          approve(f, p, randomUUID(), [id, 'trivia.profile.preferred_band']),
        );
        const current = get(f, p.post_public_id);
        expect(
          (current.editorial_checks.criteria as Record<string, unknown>[]).find((c) => c.id === id)
            ?.status,
        ).toBe('needs_review');
        expect(current.editorial_checks.overall_status).toBe('needs_review');
        expect(current.quality_status).toBe('passed');
        expect(result.data.approval.accepted_warning_ids).toEqual(
          [id, 'trivia.profile.preferred_band'].sort(),
        );
        lifecycleRpc(f, publish(f, current));
        const failed = request(f);
        criterion(failed, id, 'fail');
        const blocked = rpc(f, save(f, failed)).data.post;
        expect(() =>
          lifecycleRpc(f, approve(f, blocked, randomUUID(), [id, 'trivia.profile.preferred_band'])),
        ).toThrow(/^QUALITY_EDITORIAL_INCOMPLETE$/);
      }
      for (const [id, status] of [
        ['trivia.meaning_preserved', 'fail'],
        ['trivia.source_supported', 'needs_review'],
        ['trivia.safety_appropriate', 'needs_review'],
        ['trivia.caption_no_new_claim', 'fail'],
        ['trivia.hook_honest', 'needs_review'],
      ]) {
        const r = request(f);
        criterion(r, id!, status!);
        const p = rpc(f, save(f, r)).data.post;
        const before = state(f);
        expect(() => lifecycleRpc(f, approve(f, p))).toThrow(/^QUALITY_EDITORIAL_INCOMPLETE$/);
        expect(state(f)).toBe(before);
      }
      const r = request(f);
      r.editorial.criteria = (r.editorial.criteria as unknown[]).slice(1);
      const p = rpc(f, save(f, r)).data.post;
      expect(() => lifecycleRpc(f, approve(f, p))).toThrow(/^QUALITY_EDITORIAL_INCOMPLETE$/);
    } finally {
      cleanup(f);
    }
  }, 80_000);

  it('WAIVER-NOT-ALLOWED duplicates, inactive/unknown IDs and invalid reasons cannot authorize readiness', () => {
    const f = fixture();
    try {
      const p = rpc(f, save(f, request(f))).data.post;
      const before = state(f);
      for (const ids of [
        [],
        ['unknown'],
        ['trivia.profile.preferred_band', 'trivia.profile.preferred_band'],
        ['trivia.profile.preferred_band', 'trivia.variety_sufficient'],
        Array(21).fill('unknown'),
      ])
        expect(() => lifecycleRpc(f, approve(f, p, randomUUID(), ids))).toThrow(
          /^WAIVER_NOT_ALLOWED$/,
        );
      for (const reason of [
        null,
        '',
        '   ',
        'x'.repeat(501),
        'Unsafe\nreason',
        `token ${randomUUID()}`,
      ])
        expect(() =>
          lifecycleRpc(f, approve(f, p, randomUUID(), ['trivia.profile.preferred_band'], reason)),
        ).toThrow(/^VALIDATION_FAILED$/);
      expect(state(f)).toBe(before);
      const key = randomUUID(),
        call = approve(f, p, key);
      lifecycleRpc(f, call);
      expect(() =>
        lifecycleRpc(
          f,
          approve(f, p, key, ['trivia.profile.preferred_band'], 'A different owner reason.'),
        ),
      ).toThrow(/^OPERATION_KEY_REUSED$/);
    } finally {
      cleanup(f);
    }
  }, 35_000);

  it('QUALITY-EVIDENCE-STALE malformed/hash/revision bindings and forged approval provenance are denied', () => {
    const f = fixture();
    try {
      const p = rpc(f, save(f, request(f))).data.post;
      for (const [system, editorial] of [
        [{}, p.editorial_checks],
        [p.system_checks, {}],
        [{ ...p.system_checks, content_hash: 'f'.repeat(64) }, p.editorial_checks],
        [p.system_checks, { ...p.editorial_checks, post_revision: 99 }],
        [p.system_checks, { ...p.editorial_checks, rubric_version: 2 }],
      ] as const) {
        sql(corruptEvidence(p, system, editorial));
        const before = state(f);
        expect(() => lifecycleRpc(f, approve(f, p))).toThrow(/^QUALITY_EVIDENCE_STALE$/);
        expect(state(f)).toBe(before);
      }
      sql(corruptEvidence(p, p.system_checks, p.editorial_checks));
      const current = ready(f, p);
      const original = evidence(current);
      for (const patch of [
        { approved_revision: 1 },
        { content_hash: 'f'.repeat(64) },
        { approved_by_user_id: f.other },
        { operation_id: 1 },
        { accepted_warning_ids: [] },
      ]) {
        sql(
          `update public.posts set approval_snapshot=${jsonFor({ ...(original.approval_snapshot as object), ...patch })} where public_id='${p.post_public_id}'`,
        );
        const before = state(f);
        expect(() => lifecycleRpc(f, publish(f, current))).toThrow(/^APPROVAL_STALE$/);
        expect(state(f)).toBe(before);
      }
      sql(
        `update public.posts set approval_snapshot=${jsonFor(original.approval_snapshot)} where public_id='${p.post_public_id}'`,
      );
      expect(posted(f, current).status).toBe('posted');
    } finally {
      cleanup(f);
    }
  }, 45_000);

  it('FACT-FRESHNESS publish checks immutable usage expiry even after successful public reverify', async () => {
    const f = fixture();
    try {
      const r = request(f),
        fact = r.bindings[0]!;
      const until = new Date(Date.now() + 6500).toISOString();
      rpc(
        f,
        reverify(f, fact.fact_public_id, fact.rendered_text).replace('2027-01-11T00:00:00Z', until),
      );
      const p = ready(f, rpc(f, save(f, r)).data.post);
      const snapshot = usages(p);
      rpc(f, reverify(f, fact.fact_public_id, fact.rendered_text));
      await new Promise((resolve) =>
        setTimeout(resolve, Math.max(0, Date.parse(until) - Date.now() + 150)),
      );
      const before = state(f);
      expect(() => lifecycleRpc(f, publish(f, p))).toThrow(/^FACT_FRESHNESS_EXPIRED$/);
      expect(state(f)).toBe(before);
      expect(usages(p)).toEqual(snapshot);
      lifecycleRpc(f, discard(f, p));
    } finally {
      cleanup(f);
    }
  }, 25_000);

  it('FACT-INTEGRITY current correction/source/config changes block approval/publish; archive keeps published history', () => {
    const f = fixture();
    try {
      const p = ready(f, rpc(f, save(f, request(f))).data.post);
      changeMarkets(['US', 'GB']);
      const before = state(f);
      expect(() => lifecycleRpc(f, publish(f, p))).toThrow(/^FACT_RESERVATION_CONTEXT_CHANGED$/);
      expect(state(f)).toBe(before);
      // A newly generated package uses the new config; old approved snapshot is not rewritten.
      const fresh = ready(f, rpc(f, save(f, request(f))).data.post);
      const published = posted(f, fresh);
      const historical = evidence(published),
        usage = usages(published);
      changeMarkets(['US']);
      lifecycleRpc(f, archive(f, published));
      expect(evidence(get(f, published.post_public_id))).toEqual(historical);
      expect(usages(published)).toEqual(usage);
      function changeMarkets(markets: string[]) {
        const t = row<{ t: string }>(
          `select internal.iso_timestamp_v1(updated_at) t from public.pages where public_id='${f.page}'`,
        ).t;
        rpc(
          f,
          `api.update_page(1,'${f.workspace}','${randomUUID()}','${f.page}','${t}',${jsonFor({ target_markets: markets })},null)`,
        );
      }
    } finally {
      cleanup(f);
    }
  }, 35_000);
});
// Fixture corruption only; payload is never exposed in failures or process argv.
function jsonFor(v: unknown): string {
  return `'${JSON.stringify(v).replaceAll("'", "''")}'::jsonb`;
}
