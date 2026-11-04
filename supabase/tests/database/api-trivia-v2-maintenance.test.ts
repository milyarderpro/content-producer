import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { fixture, json, quote, row, rpc, state, time } from './helpers/trivia-rpc.js';
import { approve, cleanup, correct, draft, firstFact, overlap, post, publish, reverify } from './helpers/trivia-v2.js';

function snapshots(id: string) {
  return row(`select p.content_hash,p.content_payload,p.system_checks,p.editorial_checks,
    p.approval_snapshot,p.revision,p.status,
    (select jsonb_agg(to_jsonb(j) order by id) from public.trivia_post_facts j where j.post_id=p.id) usage
    from public.posts p where public_id='${id}'`);
}

describe('P5-T3 URL maintenance, CAS and immutable history', () => {
  it('refreshes canonical URL only, with CAS, same-meaning protection, replay and owner denial', () => {
    const f = fixture();
    try {
      const p = draft(f);
      rpc(f, approve(f, p.post_public_id));
      const fact = firstFact(p.post_public_id);
      const read = rpc(f, `api.trivia_find_similar_facts_v2(2,'${f.workspace}','${f.page}',${json([
        { candidate_key: 'maintenance', claim_text: fact.claim },
      ])})`);
      const match = (read.data.candidates as Array<{ matches: Array<{ fact_public_id: string; fact_updated_at: string }> }>)[0]!
        .matches.find(x => x.fact_public_id === fact.id)!;
      const expected = match.fact_updated_at;
      expect(expected).toMatch(/\.\d{6}Z$/);
      expect(expected).toBe(time(fact.id));
      const before = snapshots(p.post_public_id);
      const catalog = row<{ version: string }>(`select version::text from internal.trivia_fact_catalog_v2
        where workspace_id=(select id from public.workspaces where public_id='${f.workspace}')`).version;
      const expression = reverify(f, fact.id, fact.claim, 'https://example.org/fixture/updated', expected);
      expect(() => rpc(f, expression, f.other)).toThrow('OWNER_ACCESS_REQUIRED');
      expect(() => rpc(f, reverify(f, fact.id, 'A changed proposition'))).toThrow('FACT_CORRECTION_REQUIRED');
      expect(() => rpc(f, reverify(f, fact.id, fact.claim, 'http://localhost/a'))).toThrow('VALIDATION_FAILED');
      const result = rpc(f, expression);
      expect(result.response_schema_version).toBe(2);
      expect(result.data).toEqual(expect.objectContaining({ verification_status: 'needs_review',
        source_url: 'https://example.org/fixture/updated' }));
      expect(result.data).not.toHaveProperty('verified_at');
      expect(result.data).not.toHaveProperty('expires_at');
      expect(rpc(f, expression).data.replayed).toBe(true);
      expect(() => rpc(f, reverify(f, fact.id, fact.claim,
        'https://example.org/fixture/stale', expected))).toThrow('FACT_CORRECTION_CONFLICT');
      expect(snapshots(p.post_public_id)).toEqual(before);
      expect(firstFact(p.post_public_id).url).toBe('https://example.org/fixture/updated');
      expect(row<{ version: string }>(`select version::text from internal.trivia_fact_catalog_v2
        where workspace_id=(select id from public.workspaces where public_id='${f.workspace}')`).version).not.toBe(catalog);
      // Canonical refresh does not invalidate approval or require URL fetching.
      rpc(f, publish(f, p.post_public_id));
      const published = snapshots(p.post_public_id);
      rpc(f, reverify(f, fact.id, fact.claim, 'https://example.org/fixture/after-publication'));
      expect(snapshots(p.post_public_id)).toEqual(published);
    } finally { cleanup(f); }
  });

  it('invalidates mutable approvals and preserves posted/archived evidence', () => {
    for (const publishFirst of [false, true]) {
      const f = fixture();
      try {
        const p = draft(f);
        rpc(f, approve(f, p.post_public_id));
        if (publishFirst) {
          rpc(f, publish(f, p.post_public_id));
          rpc(f, `api.archive_post(1,'${f.workspace}','${randomUUID()}','${p.post_public_id}',3,'Archive fixture',true)`);
        }
        const before = snapshots(p.post_public_id);
        const fact = firstFact(p.post_public_id);
        const expression = correct(f, fact.id);
        const original = state(f);
        expect(() => rpc(f, correct(f, fact.id, null, null, time(fact.id), randomUUID(), false))).toThrow('VALIDATION_FAILED');
        expect(state(f)).toBe(original);
        const result = rpc(f, expression);
        expect(result.data.old_status).toBe('invalidated');
        expect(rpc(f, expression).data.replayed).toBe(true);
        if (publishFirst) expect(snapshots(p.post_public_id)).toEqual(before);
        else {
          expect(post(p.post_public_id)).toEqual(expect.objectContaining({ status: 'draft',
            revision: 3, approval_snapshot: null, quality_status: 'failed', editorial_checks: {} }));
          expect(() => rpc(f, approve(f, p.post_public_id))).toThrow('QUALITY_EVIDENCE_STALE');
          const discard = `api.discard_post(1,'${f.workspace}','${randomUUID()}','${p.post_public_id}',3,'Discard corrected fixture',true)`;
          expect(rpc(f, discard).data.status).toBe('discarded');
          expect(rpc(f, discard).data.replayed).toBe(true);
        }
        expect(() => rpc(f, reverify(f, fact.id, fact.claim))).toThrow('FACT_NOT_ELIGIBLE');
      } finally { cleanup(f); }
    }
  }, 20_000);

  it('supersedes only after current complete dedup, preserves lineage, and rolls back stale/conflicting successors', () => {
    const f = fixture();
    try {
      const p = draft(f);
      const fact = firstFact(p.post_public_id);
      const claim = 'Fixture ocean quartz has a green stripe.';
      const read = rpc(f, `api.trivia_find_similar_facts_v2(2,'${f.workspace}','${f.page}',${json([
        { candidate_key: 'successor', claim_text: claim },
      ])})`);
      const matches = (read.data.candidates as Array<{ matches: Array<{ fact_public_id: string }> }>)[0]!.matches;
      const successor = { position: 1, candidate_key: 'successor', claim_text: claim,
        source_url: 'https://example.org/fixture/successor', dedup: { complete: true,
          decision: 'distinct', fact_public_id: null,
          reviews: matches.map(x => ({ fact_public_id: x.fact_public_id, decision: 'distinct' })) } };
      const before = state(f);
      expect(() => rpc(f, correct(f, fact.id, successor, '0'))).toThrow('FACT_CATALOG_CONFLICT');
      expect(state(f)).toBe(before);
      expect(() => rpc(f, correct(f, fact.id, { ...successor, source_url: '' },
        read.data.catalog_version as string))).toThrow('VALIDATION_FAILED');
      expect(state(f)).toBe(before);
      const existing = row<{ id: string; claim: string }>(`select f.public_id id,f.claim_text claim
        from public.trivia_post_facts j join public.trivia_facts f on f.id=j.fact_id
        where j.post_id=(select id from public.posts where public_id='${p.post_public_id}') and j.position=2`);
      const sameRead = rpc(f, `api.trivia_find_similar_facts_v2(2,'${f.workspace}','${f.page}',${json([
        { candidate_key: 'existing', claim_text: existing.claim },
      ])})`);
      const sameMatches = (sameRead.data.candidates as Array<{ matches: Array<{ fact_public_id: string }> }>)[0]!.matches;
      const sameSuccessor = { ...successor, claim_text: existing.claim,
        dedup: { complete: true, decision: 'same', fact_public_id: existing.id,
          reviews: sameMatches.map(x => ({ fact_public_id: x.fact_public_id,
            decision: x.fact_public_id === existing.id ? 'same' : 'distinct' })) } };
      expect(() => rpc(f, correct(f, fact.id, sameSuccessor, sameRead.data.catalog_version as string)))
        .toThrow('FACT_CORRECTION_CONFLICT');
      expect(state(f)).toBe(before);
      const result = rpc(f, correct(f, fact.id, successor, read.data.catalog_version as string));
      expect(result.data.old_status).toBe('superseded');
      expect(row(`select f.public_id predecessor,s.public_id successor,s.has_v1_envelope,
        s.verified_at,s.expires_at from public.trivia_facts f join public.trivia_facts s
        on s.supersedes_fact_id=f.id where f.public_id='${fact.id}'`)).toEqual({ predecessor: fact.id,
        successor: result.data.successor_public_id, has_v1_envelope: false, verified_at: null, expires_at: null });
      const discovery = rpc(f, `api.trivia_find_similar_facts_v2(2,'${f.workspace}','${f.page}',${json([
        { candidate_key: 'old', claim_text: fact.claim },
      ])})`);
      expect((discovery.data.candidates as Array<{ matches: unknown[] }>)[0]!.matches)
        .toContainEqual(expect.objectContaining({ fact_public_id: fact.id, status: 'superseded', reuse_eligibility: 'not_eligible' }));
    } finally { cleanup(f); }
  });

  it('serializes competing URL refreshes with exact fact CAS in both commit orders', async () => {
    for (const reversed of [false, true]) {
      const f = fixture();
      try {
        const p = draft(f);
        const fact = firstFact(p.post_public_id);
        const expected = time(fact.id);
        const urls = ['https://example.org/fixture/first', 'https://example.org/fixture/second'];
        if (reversed) urls.reverse();
        const [a, b] = await overlap(f,
          reverify(f, fact.id, fact.claim, urls[0]!, expected),
          reverify(f, fact.id, fact.claim, urls[1]!, expected));
        expect(a.code).toBe(0);
        expect(b.error).toBe('FACT_CORRECTION_CONFLICT');
        expect(firstFact(p.post_public_id).url).toBe(urls[0]);
      } finally { cleanup(f); }
    }
  }, 30_000);
});

describe('P5-T2/T3 observable correction/approval/publication races for v2 content', () => {
    for (const operation of ['approve', 'publish']) {
      for (const correctionFirst of [true, false]) {
        it(`content v2: ${operation}, correction commits ${correctionFirst ? 'first' : 'second'}`, async () => {
          const f = fixture();
          try {
            const p = draft(f);
            const id = p.post_public_id;
            const approveExpression = () => approve(f, id);
            if (operation === 'publish') rpc(f, approveExpression());
            const fact = firstFact(id);
            const mutation = operation === 'approve' ? approveExpression() : publish(f, id);
            const correction = correct(f, fact.id);
            const [first, second] = await overlap(f,
              correctionFirst ? correction : mutation, correctionFirst ? mutation : correction);
            expect(first.code).toBe(0);
            if (correctionFirst) {
              expect(second.code).not.toBe(0);
              expect(second.error).toBe('REVISION_CONFLICT');
              expect(post(id).status).toBe('draft');
            } else {
              expect(second.code).toBe(0);
              expect(post(id).status).toBe(operation === 'publish' ? 'posted' : 'draft');
            }
            expect(row<{ status: string }>(`select verification_status status from public.trivia_facts
              where public_id=${quote(fact.id)}`).status).toBe('invalidated');
          } finally { cleanup(f); }
        }, 30_000);
      }
    }
});
