import { describe, expect, it } from 'vitest';

import {
  candidate,
  cleanup,
  factInput,
  fixture,
  json,
  postFixture,
  quote,
  release,
  reserve,
  reserved,
  row,
  rpc,
  sql,
  time,
} from './helpers/trivia-rpc.js';

function insertNative(workspace: string, claim: string, status = 'needs_review'): string {
  const url = 'https://example.org/fixture/source';
  sql(`with inserted as (
    insert into public.trivia_facts (
      workspace_id, claim_text, normalized_claim, claim_hash,
      has_v1_envelope, subject_key, relation_key, object_key, numbers,
      qualifiers, ontology_version, structured_key, structured_hash,
      topic_key, dedup_review_snapshot, source_data, freshness_class,
      risk_class, verification_status
    ) select w.id, ${quote(claim)}, '', repeat('0',64), false,
      null, null, null, null, null, null, null, null, null, null, null,
      null, null, ${quote(status)}
    from public.workspaces w where w.public_id='${workspace}'
    returning workspace_id, id
  ) insert into public.trivia_fact_evidence_v2(workspace_id,fact_id,source_url)
    select workspace_id,id,${quote(url)} from inserted;`);
  return row<{ id: string }>(
    `select public_id::text id from public.trivia_facts where workspace_id=(select id from public.workspaces where public_id='${workspace}') and claim_text=${quote(claim)}`,
  ).id;
}

function readV2(f: ReturnType<typeof fixture>, candidates: Array<{ candidate_key: string; claim_text: string }>) {
  return rpc(
    f,
    `api.trivia_find_similar_facts_v2(2,'${f.workspace}','${f.page}',${json(candidates)})`,
  );
}

describe('P3 trivia v2 canonical Read and additive schema', () => {
  it('uses the original fact ID, requires one URL, and isolates owner and v1 projection', () => {
    const f = fixture();
    const claim = 'Fixture blue marker rests on a clean shelf.';
    try {
      const id = insertNative(f.workspace, claim);
      const identity = row<{ count: number; public_id: string; has_v1_envelope: boolean }>(
        `select count(*)::integer count, max(fact_public_id::text) public_id,
          bool_and(has_v1_envelope) has_v1_envelope
         from internal.trivia_fact_identity_v2 where workspace_id=(select id from public.workspaces where public_id='${f.workspace}')`,
      );
      expect(identity).toEqual({ count: 1, public_id: id, has_v1_envelope: false });
      const result = readV2(f, [{ candidate_key: 'a', claim_text: claim }]);
      expect(result.response_schema_version).toBe(2);
      expect(readV2(f, [{ candidate_key: 'empty', claim_text: 'No matching cobalt river marker exists.' }]).data.candidates)
        .toEqual([{ candidate_key: 'empty', complete: true, matches: [] }]);
      expect(() => rpc(f, `api.trivia_find_similar_facts_v2(1,'${f.workspace}','${f.page}',${json([{ candidate_key: 'a', claim_text: claim }])})`))
        .toThrow('VALIDATION_FAILED');
      expect(result.data.catalog_version).toBe('1');
      expect(result.data.candidates).toEqual([
        {
          candidate_key: 'a',
          complete: true,
          matches: [
            {
              fact_public_id: id,
              claim_text: claim,
              status: 'needs_review',
              fact_updated_at: time(id),
              reuse_eligibility: 'eligible',
              used_on_page: false,
              used_in_workspace: false,
            },
          ],
        },
      ]);
      expect(() =>
        rpc(f, `api.trivia_find_similar_facts(1,'${f.workspace}','${f.page}',${json([{ ...candidate(), claim_text: claim }])},20)`),
      ).toThrow('FACT_REVIEW_REQUIRED');
      expect(() => readV2(f, [{ candidate_key: 'a', claim_text: claim }])).not.toThrow();
      expect(() =>
        rpc(f, `api.trivia_find_similar_facts_v2(2,'${f.workspace}','${f.page}',${json([{ candidate_key: 'a', claim_text: claim }])})`, f.other),
      ).toThrow('OWNER_ACCESS_REQUIRED');
      expect(() =>
        readV2(f, [{ candidate_key: 'a', claim_text: claim, extra: true } as never]),
      ).toThrow('VALIDATION_FAILED');
      const attached = rpc(f, reserve(f, [factInput({ ...candidate(), claim_text: claim })]));
      expect(reserved(attached)[0]).toEqual(
        expect.objectContaining({ fact_public_id: id, canonical_action: 'refreshed_existing' }),
      );
      expect(row<{ has_v1_envelope: boolean }>(
        `select has_v1_envelope from public.trivia_facts where public_id='${id}'`,
      ).has_v1_envelope).toBe(true);
      const legacyAfterAttachment = rpc(
        f,
        `api.trivia_find_similar_facts(1,'${f.workspace}','${f.page}',${json([{ ...candidate(), claim_text: claim }])},20)`,
      );
      expect(JSON.stringify(legacyAfterAttachment)).toContain(id);
      expect(readV2(f, [{ candidate_key: 'a', claim_text: claim }]).data.catalog_version).not.toBe('1');
    } finally {
      sql(`delete from public.trivia_fact_evidence_v2 where fact_id in (select id from public.trivia_facts where workspace_id=(select id from public.workspaces where public_id='${f.workspace}'));`);
      cleanup(f);
    }
  });

  it('keeps the in-place v1 mapping idempotent and protects native evidence', () => {
    const f = fixture();
    try {
      const v1 = rpc(f, reserve(f, [factInput(candidate())]));
      const originalId = reserved(v1)[0]!.fact_public_id;
      rpc(f, release(f, v1.data.reservation_token as string));
      postFixture(f, originalId, 'posted');
      const before = row<{ digest: string; facts: number; usage: number }>(`
        select
          (select encode(extensions.digest(string_agg(j.source_snapshot::text,',' order by j.id),'sha256'),'hex')
            from public.trivia_post_facts j where j.workspace_id=w.id) digest,
          (select count(*)::integer from internal.trivia_fact_identity_v2 i where i.workspace_id=w.id) facts,
          (select count(*)::integer from internal.trivia_fact_usage_v2 u where u.workspace_id=w.id) usage
        from public.workspaces w where w.public_id='${f.workspace}'`);
      // This is the data migration's retryable catalog seed; the identity and
      // usage mapping itself is an in-place projection of authoritative rows.
      for (let attempt = 0; attempt < 2; attempt += 1) {
        sql(`insert into internal.trivia_fact_catalog_v2(workspace_id,version)
          select id,0 from public.workspaces where public_id='${f.workspace}'
          on conflict(workspace_id) do nothing`);
      }
      const after = row<{ digest: string; facts: number; usage: number }>(`
        select
          (select encode(extensions.digest(string_agg(j.source_snapshot::text,',' order by j.id),'sha256'),'hex')
            from public.trivia_post_facts j where j.workspace_id=w.id) digest,
          (select count(*)::integer from internal.trivia_fact_identity_v2 i where i.workspace_id=w.id) facts,
          (select count(*)::integer from internal.trivia_fact_usage_v2 u where u.workspace_id=w.id) usage
        from public.workspaces w where w.public_id='${f.workspace}'`);
      expect(after).toEqual(before);
      expect(after).toEqual({ digest: before.digest, facts: 1, usage: 1 });
      expect(readV2(f, [{ candidate_key: 'legacy', claim_text: row<{ claim: string }>(`select claim_text claim from public.trivia_facts where public_id='${originalId}'`).claim }]).data.candidates)
        .toEqual([expect.objectContaining({ matches: [expect.objectContaining({ fact_public_id: originalId,
          used_in_workspace: true, reuse_eligibility: 'workspace_blocked' })] })]);
      expect(row<{ count: number }>(`select count(*)::integer count from public.trivia_facts
        where workspace_id=(select id from public.workspaces where public_id='${f.workspace}')`).count).toBe(1);
      expect(row<{ valid: boolean }>(`select internal.trivia_web_source_url_v2('http://127.0.0.1/private') valid`).valid).toBe(false);
      expect(row<{ valid: boolean }>(`select internal.trivia_web_source_url_v2('https://example.org/fact') valid`).valid).toBe(true);
      expect(() => sql(`insert into public.trivia_facts(workspace_id,claim_text,normalized_claim,claim_hash,
        has_v1_envelope,subject_key,relation_key,object_key,numbers,qualifiers,ontology_version,
        structured_key,structured_hash,topic_key,dedup_review_snapshot,source_data,freshness_class,
        risk_class,verification_status)
        select id,'Unattributed native fixture.','',repeat('0',64),false,
          null,null,null,null,null,null,null,null,null,null,null,null,null,'needs_review'
        from public.workspaces where public_id='${f.workspace}'`)).toThrow();
      expect(row<{ count: number }>(`select count(*)::integer count from public.trivia_facts
        where workspace_id=(select id from public.workspaces where public_id='${f.workspace}')`).count).toBe(1);
    } finally {
      cleanup(f);
    }
  });

  it('sees v1 usage, negative history, and an incomplete 21st match without rewriting old snapshots', () => {
    const f = fixture();
    try {
      const legacy = rpc(f, reserve(f, [factInput(candidate())]));
      const fact = reserved(legacy)[0]!.fact_public_id;
      rpc(f, release(f, legacy.data.reservation_token as string));
      postFixture(f, fact);
      const snapshotBefore = row<{ hash: string }>(
        `select encode(extensions.digest(string_agg(source_snapshot::text,',' order by id),'sha256'),'hex') hash
         from public.trivia_post_facts where workspace_id=(select id from public.workspaces where public_id='${f.workspace}')`,
      ).hash;
      const v1Claim = row<{ claim: string }>(`select claim_text claim from public.trivia_facts where public_id='${fact}'`).claim;
      const used = readV2(f, [{ candidate_key: 'legacy', claim_text: v1Claim }]);
      const legacyMatch = (used.data.candidates as Array<{ matches: Array<Record<string, unknown>> }>)[0]!.matches[0]!;
      expect(legacyMatch.fact_public_id).toBe(fact);
      expect(legacyMatch.used_on_page).toBe(true);
      expect(legacyMatch.used_in_workspace).toBe(true);
      expect(legacyMatch.reuse_eligibility).toBe('workspace_blocked');

      for (const [index, status] of ['invalidated', 'superseded', 'rejected'].entries()) {
        insertNative(f.workspace, `Fixture historical marker ${index} shares a shelf.`, status);
      }
      const history = readV2(f, [{ candidate_key: 'history', claim_text: 'Fixture historical marker shares a shelf.' }]);
      const matches = (history.data.candidates as Array<{ matches: Array<{ status: string; reuse_eligibility: string }> }>)[0]!.matches;
      for (const status of ['invalidated', 'superseded', 'rejected']) {
        expect(matches).toContainEqual(expect.objectContaining({ status, reuse_eligibility: 'not_eligible' }));
      }
      for (let index = 0; index < 21; index += 1) {
        insertNative(f.workspace, `Fixture capped marker ${index} shares one shelf.`);
      }
      const capped = readV2(f, [{ candidate_key: 'cap', claim_text: 'Fixture capped marker shares one shelf.' }]);
      const cappedCandidate = (capped.data.candidates as Array<{ complete: boolean; matches: unknown[] }>)[0]!;
      expect(cappedCandidate.complete).toBe(false);
      expect(cappedCandidate.matches).toHaveLength(20);
      const longClaim = `Fixture oversized marker shares one shelf ${'x'.repeat(420)}`;
      for (let index = 0; index < 21; index += 1) {
        insertNative(f.workspace, `${longClaim} ${index}`);
      }
      expect(() => readV2(f, Array.from({ length: 9 }, (_, index) => ({
        candidate_key: `big${index}`, claim_text: longClaim,
      })))).toThrow('FACT_REVIEW_REQUIRED');

      expect(row<{ hash: string }>(
        `select encode(extensions.digest(string_agg(source_snapshot::text,',' order by id),'sha256'),'hex') hash
         from public.trivia_post_facts where workspace_id=(select id from public.workspaces where public_id='${f.workspace}')`,
      ).hash).toBe(snapshotBefore);
    } finally {
      sql(`delete from public.trivia_fact_evidence_v2 where fact_id in (select id from public.trivia_facts where workspace_id=(select id from public.workspaces where public_id='${f.workspace}'));`);
      cleanup(f);
    }
  }, 20_000);
});
