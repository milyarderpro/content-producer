import { describe, expect, it } from 'vitest';

import { fixture, json, quote, row, rpc, sql, time } from './helpers/trivia-rpc.js';
import { approve, cleanup, draft, firstFact, publish } from './helpers/trivia-v2.js';

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
  it('uses the original fact ID, requires one URL, isolates owner, and rejects retired v1 Read', () => {
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
        rpc(f, `api.trivia_find_similar_facts(1,'${f.workspace}','${f.page}',${json([{ candidate_key: 'a', claim_text: claim }])},20)`),
      ).toThrow('LOCAL_TEST_QUERY_FAILED');
      expect(() => readV2(f, [{ candidate_key: 'a', claim_text: claim }])).not.toThrow();
      expect(() =>
        rpc(f, `api.trivia_find_similar_facts_v2(2,'${f.workspace}','${f.page}',${json([{ candidate_key: 'a', claim_text: claim }])})`, f.other),
      ).toThrow('OWNER_ACCESS_REQUIRED');
      expect(() =>
        readV2(f, [{ candidate_key: 'a', claim_text: claim, extra: true } as never]),
      ).toThrow('VALIDATION_FAILED');
      expect(row<{ has_v1_envelope: boolean }>(
        `select has_v1_envelope from public.trivia_facts where public_id='${id}'`,
      ).has_v1_envelope).toBe(false);
    } finally {
      cleanup(f);
    }
  });

  it('keeps the in-place v2 mapping idempotent and protects native evidence', () => {
    const f = fixture();
    try {
      const p = draft(f);
      const originalId = firstFact(p.post_public_id).id;
      rpc(f, approve(f, p.post_public_id));
      rpc(f, publish(f, p.post_public_id));
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
      expect(after).toEqual({ digest: before.digest, facts: 5, usage: 5 });
      expect(readV2(f, [{ candidate_key: 'current', claim_text: row<{ claim: string }>(`select claim_text claim from public.trivia_facts where public_id='${originalId}'`).claim }]).data.candidates)
        .toEqual([expect.objectContaining({ matches: expect.arrayContaining([expect.objectContaining({ fact_public_id: originalId,
          used_in_workspace: true, reuse_eligibility: 'workspace_blocked' })]) })]);
      expect(row<{ count: number }>(`select count(*)::integer count from public.trivia_facts
        where workspace_id=(select id from public.workspaces where public_id='${f.workspace}')`).count).toBe(5);
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
        where workspace_id=(select id from public.workspaces where public_id='${f.workspace}')`).count).toBe(5);
    } finally {
      cleanup(f);
    }
  });

  it('sees v2 usage, negative history, and an incomplete 21st match without rewriting snapshots', () => {
    const f = fixture();
    try {
      const p = draft(f);
      const fact = firstFact(p.post_public_id).id;
      const snapshotBefore = row<{ hash: string }>(
        `select encode(extensions.digest(string_agg(source_snapshot::text,',' order by id),'sha256'),'hex') hash
         from public.trivia_post_facts where workspace_id=(select id from public.workspaces where public_id='${f.workspace}')`,
      ).hash;
      const claim = row<{ claim: string }>(`select claim_text claim from public.trivia_facts where public_id='${fact}'`).claim;
      const used = readV2(f, [{ candidate_key: 'current', claim_text: claim }]);
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
      cleanup(f);
    }
  }, 20_000);
});

// CR-062 task 2: canonical editorial catalog Read/versioning and its owner
// publication boundary. Kept in the existing v2 Read suite; every case runs in G4.
type EditorialRef = { public_id: string; version: number; hash: string };
type EditorialDefinition = {
  reference: EditorialRef; kind: string; key: string; status: string;
  created_at: string; retired_at: string | null; examples_complete: boolean;
  payload: Record<string, unknown>;
};
type EditorialData = {
  editorial_catalog_version: string; reference: EditorialRef;
  status: string; replayed: boolean; definitions: EditorialDefinition[];
  next_cursor: string | null; complete: boolean; definitions_complete: boolean;
  examples_complete: boolean;
};
const editorialDensity = {
  fast_trivia: { fact_count_min: 1, fact_count_max: 12, words_per_fact_min: 1,
    words_per_fact_max: 30, total_words_min: 1, total_words_max: 160 },
};
function editorialPayload(kind = 'format'): Record<string, unknown> {
  const common = { definition_schema_version: 1, display_name: 'Original fixture',
    description: 'Synthetic editorial pattern, not factual production copy.',
    provenance: { basis: 'Isolated test fixture.', references: ['fixture:cr062'] },
    notes: [], examples: [{ kind: 'positive', text: 'Original researched copy belongs here.',
      note: 'Pattern only.', source_ref: 'fixture:example' }] };
  if (kind === 'topic') return { ...common, scope: 'Familiar objects.',
    subject_examples: ['Objects'], group_key: 'general_trivia' };
  return { ...common, content_structure: 'trivia_card_v2', architectures: ['single_subject', 'themed', 'mixed'],
    mechanisms: ['curiosity_detail'], reader_benefits: ['curiosity'], density_preferences: editorialDensity,
    selection_guidance: ['Choose supported details.'], ordering_guidance: ['Vary the middle.'] };
}
function editorialChange(kind: string, key: string, payload = editorialPayload(kind), previous: number | null = null) {
  return { action: 'publish', kind, key, expected_previous_version: previous, payload };
}
function editorialRead(f: ReturnType<typeof fixture>, filter: unknown = {}, examples = true, limit = 20, cursor: string | null = null) {
  return rpc(f, `api.get_trivia_editorial_catalog(1,'${f.workspace}',${json(filter)},${examples},${limit},${cursor ? quote(cursor) : 'null'})`).data as unknown as EditorialData;
}
function editorialWriteExpression(f: ReturnType<typeof fixture>, change: unknown, version: string, key: string) {
  return `api.update_trivia_editorial_catalog(1,'${f.workspace}','${key}',${quote(version)},${json(change)})`;
}
function editorialWrite(f: ReturnType<typeof fixture>, change: unknown, version = editorialRead(f).editorial_catalog_version, key = crypto.randomUUID()) {
  return rpc(f, editorialWriteExpression(f, change, version, key)).data as unknown as EditorialData;
}
function editorialInternal(f: ReturnType<typeof fixture>, expression: string) {
  return sql(`begin; select set_config('request.jwt.claims',${json({ sub: f.owner, role: 'authenticated', client_id: 'editorial-fixture' })}::text,true);
    set local role content_producer_api_owner; select jsonb_build_object('result',${expression}); commit;`)
    .split('\n').filter((line) => line.startsWith('{"result":')).map((line) => JSON.parse(line) as { result: unknown })[0]!.result;
}
function editorialProfile(format: EditorialRef, topic: EditorialRef, formatKey = 'custom_format', topicKey = 'custom_topic') {
  const common = editorialPayload();
  return { definition_schema_version: 1, display_name: 'Custom explicit profile', description: common.description,
    provenance: common.provenance, notes: [], examples: common.examples,
    format_refs: [format], topic_refs: [topic], format_weights: { [formatKey]: 100 }, topic_weights: { [topicKey]: 100 },
    density_preferences: editorialDensity, fact_count: { min: 1, preferred: 8, max: 12 },
    hook_templates: ['Did you know?'], hook_casing: 'as_written', voice: 'Conversational, concrete and explanatory.',
    units_preference: 'contextual', cta_guidance: { guidance: 'One or several natural invitations, no hierarchy.',
      examples: ['Like the video, save it for later, and follow for more.'] }, emoji_policy: 'optional',
    default_limits: { hook_max_chars: 60, fact_max_chars: 150, facts_total_max_chars: 750, cta_max_chars: 140,
      canva_total_max_chars: 900, hook_max_words: 18, fact_max_words: 30, cta_max_words: 32, canva_total_max_words: 160 },
    selection_guidance: ['Each fact contributes.'], ordering_guidance: ['Distinct closing detail.'] };
}
function editorialState(f: ReturnType<typeof fixture>) {
  return row(`select
    (select count(*) from public.trivia_editorial_definitions d where d.workspace_id=w.id) definitions,
    (select revision::text from internal.trivia_editorial_catalog_state s where s.workspace_id=w.id) revision,
    (select count(*) from internal.operation_ledger l where l.workspace_id=w.id) ledger
    from public.workspaces w where w.public_id='${f.workspace}'`);
}

describe('CR-062 owner editorial catalog (config2 storage, not Page adoption)', () => {
  it('publishes dynamic keys, returns exact immutable references and honest example completeness', () => {
    const f = fixture();
    try {
      expect(editorialRead(f).editorial_catalog_version).toBe('0');
      const saved = editorialWrite(f, editorialChange('format', 'historical_curiosities'));
      expect(saved.reference.hash).toMatch(/^[0-9a-f]{64}$/);
      expect(saved.reference.version).toBe(1);
      const full = editorialRead(f, { references: [saved.reference] });
      expect(full.complete).toBe(true);
      expect(full.definitions[0]!.payload).toEqual(editorialPayload());
      const summary = editorialRead(f, {}, false);
      expect(summary.complete).toBe(false);
      expect(summary.definitions_complete).toBe(true);
      expect(summary.examples_complete).toBe(false);
      expect(summary.definitions[0]!.payload).not.toHaveProperty('examples');
      expect(JSON.stringify(full)).not.toMatch(/operation_key|operation_id|workspace_id|actor_user_id/);
      expect(() => sql(`update public.trivia_editorial_definitions set payload='{}' where public_id='${saved.reference.public_id}'`)).toThrow('IMMUTABLE_HISTORY');
    } finally { cleanup(f); }
  });

  it('denies cross-owner, anonymous, service-role and direct table/helper access', () => {
    const f = fixture();
    try {
      const saved = editorialWrite(f, editorialChange('topic', 'private_topic'));
      for (const expression of [`api.get_trivia_editorial_catalog(1,'${f.workspace}')`,
        editorialWriteExpression(f, { action: 'retire', reference: saved.reference, reason: 'No longer selected.' }, '1', crypto.randomUUID())]) {
        expect(() => rpc(f, expression, f.other)).toThrow('OWNER_ACCESS_REQUIRED');
        for (const role of ['anon', 'service_role']) expect(() => sql(`begin;set local role ${role};select ${expression};commit;`)).toThrow();
      }
      for (const role of ['anon', 'authenticated', 'service_role']) {
        expect(() => sql(`begin;set local role ${role};select * from public.trivia_editorial_definitions;commit;`)).toThrow();
        expect(() => sql(`begin;set local role ${role};select internal.editorial_seed_v1(1);commit;`)).toThrow();
      }
      expect(row<{ denied: boolean }>(`select not has_sequence_privilege('authenticated','public.trivia_editorial_definitions_id_seq','USAGE') denied`).denied).toBe(true);
      expect(row<{ rls: boolean }>(`select bool_and(relrowsecurity) rls from pg_class where oid in
        ('public.trivia_editorial_definitions'::regclass,'internal.trivia_editorial_catalog_state'::regclass)`).rls).toBe(true);
    } finally { cleanup(f); }
  });

  it('rejects unregistered structures, fields, type confusion, excessive nesting and text bounds atomically', () => {
    const f = fixture();
    try {
      const before = editorialState(f);
      for (const payload of [null, [], { ...editorialPayload(), code: 'return true' },
        { ...editorialPayload(), content_structure: 'interactive_quiz' },
        { ...editorialPayload(), architectures: [] }, { ...editorialPayload(), examples: null },
        { ...editorialPayload(), description: 'x'.repeat(2001) },
        { ...editorialPayload(), density_preferences: { nested: { parent: { parent: {} } } } },
        { ...editorialPayload(), notes: Array.from({ length: 17 }, () => 'Too many.') }]) {
        expect(() => editorialWrite(f, editorialChange('format', 'bad_format', payload as Record<string, unknown>), '0')).toThrow('VALIDATION_FAILED');
        expect(editorialState(f)).toEqual(before);
      }
    } finally { cleanup(f); }
  });

  it('validates profile references, graph direction, dynamic weight keys and hard ceilings', () => {
    const f = fixture(); const other = fixture();
    try {
      const format = editorialWrite(f, editorialChange('format', 'custom_format')).reference;
      const topic = editorialWrite(f, editorialChange('topic', 'custom_topic')).reference;
      const foreign = editorialWrite(other, editorialChange('topic', 'foreign_topic')).reference;
      const p = editorialProfile(format, topic);
      const before = editorialState(f);
      for (const [payload, code] of [
        [{ ...p, topic_refs: [foreign] }, 'EDITORIAL_DEFINITION_UNAVAILABLE'],
        [{ ...p, format_refs: [topic] }, 'EDITORIAL_DEFINITION_UNAVAILABLE'],
        [{ ...p, format_refs: [{ ...format, hash: '0'.repeat(64) }] }, 'EDITORIAL_DEFINITION_UNAVAILABLE'],
        [{ ...p, format_refs: [format, format] }, 'VALIDATION_FAILED'],
        [{ ...p, format_weights: { unknown_format: 100 } }, 'VALIDATION_FAILED'],
        [{ ...p, topic_weights: { custom_topic: -1 } }, 'VALIDATION_FAILED'],
        [{ ...p, default_limits: { ...p.default_limits, fact_max_chars: 161 } }, 'VALIDATION_FAILED'],
        [{ ...p, parent_profile: format }, 'VALIDATION_FAILED'],
        [{ ...p, format_refs: Array.from({ length: 129 }, () => format) }, 'VALIDATION_FAILED'],
      ] as const) {
        expect(() => editorialWrite(f, editorialChange('profile', 'bad_profile', payload), '2')).toThrow(code);
        expect(editorialState(f)).toEqual(before);
      }
      const saved = editorialWrite(f, editorialChange('profile', 'explicit_custom', p));
      expect(editorialRead(f, { references: [saved.reference] }).definitions[0]!.payload).toEqual(p);
    } finally { cleanup(f); cleanup(other); }
  });

  it('allows registered zero-weight choices and extra density keys without runtime code', () => {
    const f = fixture();
    try {
      const first = editorialWrite(f, editorialChange('format', 'custom_format')).reference;
      const second = editorialWrite(f, editorialChange('format', 'future_format')).reference;
      const topic = editorialWrite(f, editorialChange('topic', 'custom_topic')).reference;
      const p = { ...editorialProfile(first, topic), format_refs: [first, second],
        format_weights: { custom_format: 100, future_format: 0 },
        density_preferences: { ...editorialDensity, explanatory_custom: editorialDensity.fast_trivia } };
      editorialWrite(f, editorialChange('profile', 'future_profile', p));
      expect(editorialRead(f, { kind: 'profile' }).definitions[0]!.payload).toEqual(p);
    } finally { cleanup(f); }
  });

  it('increments versions with both CAS checks and preserves old payload/hash and Page config', () => {
    const f = fixture();
    try {
      const before = row(`select config,updated_at::text from public.page_niche_configs where page_id=(select id from public.pages where public_id='${f.page}')`);
      const original = editorialPayload();
      const one = editorialWrite(f, editorialChange('format', 'custom_format', original));
      expect(() => editorialWrite(f, editorialChange('format', 'custom_format'), '0')).toThrow('EDITORIAL_CATALOG_CONFLICT');
      expect(() => editorialWrite(f, editorialChange('format', 'custom_format'), '1')).toThrow('EDITORIAL_CATALOG_CONFLICT');
      const changed = { ...original, description: 'A new immutable version.' };
      const two = editorialWrite(f, editorialChange('format', 'custom_format', changed, 1), '1');
      expect(two.reference.version).toBe(2);
      expect(two.reference.hash).not.toBe(one.reference.hash);
      expect(editorialRead(f, { references: [one.reference] }).definitions[0]!.payload).toEqual(original);
      expect(row(`select config,updated_at::text from public.page_niche_configs where page_id=(select id from public.pages where public_id='${f.page}')`)).toEqual(before);
    } finally { cleanup(f); }
  });

  it('retirement blocks new references while old bound versions and identical replay remain available', () => {
    const f = fixture();
    try {
      const change = editorialChange('format', 'custom_format'); const key = crypto.randomUUID();
      const original = editorialWrite(f, change, '0', key);
      const bound = row<{ t: string }>('select internal.iso_timestamp_v1(clock_timestamp()) t').t;
      const retired = editorialWrite(f, { action: 'retire', reference: original.reference, reason: 'Prefer the next version.' }, '1');
      expect(retired.status).toBe('retired');
      expect(editorialRead(f, { references: [original.reference] }).definitions[0]!.status).toBe('retired');
      expect(() => editorialInternal(f, `to_jsonb(internal.editorial_reference_v1((select id from public.workspaces where public_id='${f.workspace}'),${json(original.reference)},'format'))`)).toThrow('EDITORIAL_DEFINITION_UNAVAILABLE');
      expect(editorialInternal(f, `(internal.editorial_reference_v1((select id from public.workspaces where public_id='${f.workspace}'),${json(original.reference)},'format',${quote(bound)}::timestamptz)).hash`)).toBe(original.reference.hash);
      expect(editorialWrite(f, change, '0', key)).toEqual({ ...original, replayed: true });
      const topic = editorialWrite(f, editorialChange('topic', 'custom_topic')).reference;
      expect(() => editorialWrite(f, editorialChange('profile', 'new_binding', editorialProfile(original.reference, topic)))).toThrow('EDITORIAL_DEFINITION_UNAVAILABLE');
      const newer = editorialWrite(f, editorialChange('format', 'custom_format', editorialPayload(), 1));
      expect(newer.reference.version).toBe(2);
    } finally { cleanup(f); }
  });

  it('replays the exact original result and rejects key reuse or a different owner before replay', () => {
    const f = fixture();
    try {
      const key = crypto.randomUUID(); const change = editorialChange('topic', 'replay_topic');
      const one = editorialWrite(f, change, '0', key);
      expect(editorialWrite(f, change, '0', key)).toEqual({ ...one, replayed: true });
      expect(() => editorialWrite(f, { ...change, key: 'other_topic' }, '0', key)).toThrow('OPERATION_KEY_REUSED');
      expect(() => rpc(f, editorialWriteExpression(f, change, '0', key), f.other)).toThrow('OWNER_ACCESS_REQUIRED');
      expect(editorialState(f)).toMatchObject({ definitions: 1, revision: '1' });
    } finally { cleanup(f); }
  });

  it('serializes two publication sessions at the same catalog revision without partial ledger state', async () => {
    const f = fixture();
    try {
      const { callerStatement, session, waitForSession } = await import('./helpers/plan-lifecycle.js');
      const name = `editorial-cas-${crypto.randomUUID()}`;
      const a = session(`begin;set application_name=${quote(name)};${callerStatement(f.owner,
        editorialWriteExpression(f, editorialChange('topic', 'first_topic'), '0', crypto.randomUUID()))}select pg_sleep(0.5);commit;`);
      await waitForSession(name);
      const b = session(`begin;${callerStatement(f.owner,
        editorialWriteExpression(f, editorialChange('topic', 'second_topic'), '0', crypto.randomUUID()))}commit;`);
      const [one, two] = await Promise.all([a, b]);
      expect(one.code).toBe(0); expect(two.error).toBe('EDITORIAL_CATALOG_CONFLICT');
      expect(editorialState(f)).toMatchObject({ definitions: 1, revision: '1', ledger: 2 });
    } finally { cleanup(f); }
  });

  it('serializes duplicate simultaneous operation keys into one immutable version', async () => {
    const f = fixture();
    try {
      const { callerStatement, session, waitForSession } = await import('./helpers/plan-lifecycle.js');
      const expression = editorialWriteExpression(f, editorialChange('topic', 'same_topic'), '0', crypto.randomUUID());
      const name = `editorial-replay-${crypto.randomUUID()}`;
      const a = session(`begin;set application_name=${quote(name)};${callerStatement(f.owner, expression)}select pg_sleep(0.5);commit;`);
      await waitForSession(name);
      const b = session(`begin;${callerStatement(f.owner, expression)}commit;`);
      const [one, two] = await Promise.all([a, b]);
      expect(one.code).toBe(0); expect(two.code).toBe(0);
      expect(two.output).toContain('"replayed": true');
      expect(editorialState(f)).toMatchObject({ definitions: 1, revision: '1', ledger: 2 });
    } finally { cleanup(f); }
  });

  it('seeds idempotently without overwriting owner data, retired keys, or config1', () => {
    const f = fixture();
    try {
      const owned = editorialWrite(f, editorialChange('format', 'single_subject_fast'));
      editorialWrite(f, { action: 'retire', reference: owned.reference, reason: 'Owner chose a different style.' });
      const config = row(`select config,updated_at::text from public.page_niche_configs where page_id=(select id from public.pages where public_id='${f.page}')`);
      const expression = `internal.editorial_seed_v1((select id from public.workspaces where public_id='${f.workspace}'))`;
      expect(editorialInternal(f, expression)).toBe(17);
      const state = editorialState(f);
      expect(editorialInternal(f, expression)).toBe(0);
      expect(editorialState(f)).toEqual(state);
      expect(editorialRead(f, { key: 'single_subject_fast' }).definitions).toHaveLength(1);
      expect(editorialRead(f, { key: 'single_subject_fast' }).definitions[0]!.reference).toEqual(owned.reference);
      expect(row(`select config,updated_at::text from public.page_niche_configs where page_id=(select id from public.pages where public_id='${f.page}')`)).toEqual(config);
    } finally { cleanup(f); }
  });

  it('paginates without duplicates, binds cursors to workspace/filter/revision, and bounds output', () => {
    const f = fixture();
    try {
      editorialInternal(f, `internal.editorial_seed_v1((select id from public.workspaces where public_id='${f.workspace}'))`);
      let page = editorialRead(f, {}, true, 3); const firstCursor = page.next_cursor!;
      const ids = page.definitions.map((d) => d.reference.public_id);
      while (page.next_cursor) {
        page = editorialRead(f, {}, true, 3, page.next_cursor);
        ids.push(...page.definitions.map((d) => d.reference.public_id));
        expect(Buffer.byteLength(JSON.stringify(page))).toBeLessThan(65536);
      }
      expect(ids).toHaveLength(18); expect(new Set(ids).size).toBe(18); expect(page.complete).toBe(true);
      expect(() => editorialRead(f, { kind: 'topic' }, true, 3, firstCursor)).toThrow('VALIDATION_FAILED');
      editorialWrite(f, editorialChange('topic', 'additional_topic'));
      expect(() => editorialRead(f, {}, true, 3, firstCursor)).toThrow('EDITORIAL_CATALOG_CONFLICT');
      for (const filter of [{ references: [] }, { kind: null }, { key: null }, { version: null }, { unknown: true }]) {
        expect(() => editorialRead(f, filter)).toThrow('VALIDATION_FAILED');
      }
    } finally { cleanup(f); }
  });

  it('splits large pages by bytes and never truncates examples or individual definitions', () => {
    const f = fixture();
    try {
      const large = { ...editorialPayload(), notes: Array.from({ length: 12 }, () => 'x'.repeat(1000)) };
      for (let i = 0; i < 6; i++) editorialWrite(f, editorialChange('format', `large_format_${i}`, large));
      const first = editorialRead(f); expect(first.definitions.length).toBeLessThan(6);
      expect(first.definitions_complete).toBe(false); expect(first.next_cursor).not.toBeNull();
      expect(first.definitions.every((d) => JSON.stringify(d.payload) === JSON.stringify(first.definitions[0]!.payload))).toBe(true);
      expect(first.definitions[0]!.payload).toEqual(large);
      expect(Buffer.byteLength(JSON.stringify(first))).toBeLessThan(65536);
      const formatRef = editorialRead(f, { key: 'large_format_0' }).definitions[0]!.reference;
      const topicRef = editorialWrite(f, editorialChange('topic', 'custom_topic')).reference;
      const tooLargeToRead = { ...editorialProfile(formatRef, topicRef, 'large_format_0'),
        notes: Array.from({ length: 16 }, () => 'n'.repeat(1000)),
        examples: Array.from({ length: 16 }, () => ({ kind: 'positive', text: 'x'.repeat(2000),
          note: 'n'.repeat(700), source_ref: 's'.repeat(100) })) };
      const bytes = Buffer.byteLength(JSON.stringify(tooLargeToRead));
      expect(bytes).toBeGreaterThan(61440); expect(bytes).toBeLessThan(65536);
      const before = editorialState(f);
      expect(() => editorialWrite(f, editorialChange('profile', 'too_large_to_read', tooLargeToRead))).toThrow('VALIDATION_FAILED');
      expect(editorialState(f)).toEqual(before); // rollback after insert/projection check, including ledger.
      expect(() => editorialWrite(f, editorialChange('format', 'oversized_format', {
        ...large, examples: Array.from({ length: 16 }, () => ({ kind: 'positive', text: 'x'.repeat(2000), note: 'n', source_ref: 'fixture:oversized' })),
      }))).toThrow('VALIDATION_FAILED');
    } finally { cleanup(f); }
  });

  it('bounds key capacity and rejects bad references, malformed cursors and invalid versions', () => {
    const f = fixture();
    try {
      const payload = editorialPayload('topic');
      sql(`insert into public.trivia_editorial_definitions(workspace_id,kind,key,version,payload,hash)
        select w.id,'topic','capacity_'||n,1,${json(payload)},internal.editorial_hash_v1('topic','capacity_'||n,${json(payload)})
        from public.workspaces w cross join generate_series(1,128) n where w.public_id='${f.workspace}'`);
      expect(() => editorialWrite(f, editorialChange('topic', 'extra_topic'), '0')).toThrow('VALIDATION_FAILED');
      expect(editorialWrite(f, editorialChange('topic', 'capacity_1', payload, 1), '0').reference.version).toBe(2);
      expect(() => editorialRead(f, { references: [{ public_id: crypto.randomUUID(), version: 1, hash: '0'.repeat(64) }] })).toThrow('EDITORIAL_DEFINITION_UNAVAILABLE');
      expect(() => editorialRead(f, {}, true, 20, 'broken-cursor')).toThrow('VALIDATION_FAILED');
      for (const key of ['x', 'UpperCase', 'x'.repeat(51)]) expect(() => editorialWrite(f, editorialChange('topic', key))).toThrow('VALIDATION_FAILED');
      for (const version of ['-1', '01', '9223372036854775808', 'wrong']) expect(() => editorialWrite(f, editorialChange('topic', 'valid_key'), version)).toThrow(/VALIDATION_FAILED|EDITORIAL_CATALOG_CONFLICT/);
    } finally { cleanup(f); }
  });
});
