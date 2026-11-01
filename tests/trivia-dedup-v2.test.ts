import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  evaluateRetrieval, holdoutSha256, loadDedupV2, summarizeCases, validateDedupV2,
  type DedupV2Case, type EvaluatedRun, type FixtureInputs, type RetrievalOutcome,
  type IdentityReadback, type IdentityDecisionEvent,
} from './fixtures/trivia-dedup-v2.js';

const root = new URL('../supabase/tests/fixtures/trivia/dedup-v2/', import.meta.url);
function fixture(): FixtureInputs {
  return {
    developmentText: readFileSync(new URL('development.v1.jsonl', root), 'utf8'),
    holdoutBytes: readFileSync(new URL('holdout.v1.jsonl', root)),
    holdoutChecksum: readFileSync(new URL('holdout.sha256', root), 'utf8'),
    manifest: JSON.parse(readFileSync(new URL('manifest.v1.json', root), 'utf8')) as unknown,
  };
}
function changeFirst(input: FixtureInputs, edit: (value: Record<string, unknown>) => void): FixtureInputs {
  const rows = input.developmentText.trimEnd().split('\n').map(x => JSON.parse(x) as Record<string, unknown>);
  edit(rows[0]);
  return { ...input, developmentText: rows.map(x => JSON.stringify(x)).join('\n') + '\n' };
}
function changeHoldout(input: FixtureInputs, edit: (value: Record<string, unknown>) => void): FixtureInputs {
  const rows = input.holdoutBytes.toString('utf8').trimEnd().split('\n').map(x => JSON.parse(x) as Record<string, unknown>);
  edit(rows[0]);
  const bytes = Buffer.from(rows.map(x => JSON.stringify(x)).join('\n') + '\n', 'utf8');
  return { ...input, holdoutBytes: bytes, holdoutChecksum: holdoutSha256(bytes) + '\n' };
}

describe('P2-T2 dedup v2 corpus / integrity only, NOT retrieval', () => {
  it('validates every JSONL row, frozen SHA-256 bytes, labels and manifest dimensions', () => {
    const cases = loadDedupV2();
    expect(cases).toHaveLength(93);
    expect(summarizeCases(cases)).toMatchObject({
      total: 93, labels: { same: 49, distinct: 40, uncertain: 4 },
    });
    expect(cases.filter(c => c.split === 'development')).toHaveLength(60);
    expect(cases.filter(c => c.split === 'holdout')).toHaveLength(33);
    expect(cases.filter(c => c.reference.origin === 'legacy_v1')).toHaveLength(6);
    expect(cases.some(c => c.reference.evidence_expired_only)).toBe(true);
    for (const status of ['invalidated', 'superseded', 'rejected'] as const) {
      expect(cases.some(c => c.label === 'same' && c.reference.identity_status === status)).toBe(true);
    }
    expect(cases.filter(c => c.category === 'paraphrase')).toHaveLength(40);
    expect(cases.filter(c => c.category === 'hard_negative')).toHaveLength(40);
    const sameNegative = cases.filter(c => c.label === 'same' &&
      ['invalidated', 'superseded', 'rejected'].includes(c.reference.identity_status));
    expect(sameNegative).toHaveLength(18);
    for (const status of ['invalidated', 'superseded', 'rejected']) {
      expect(sameNegative.filter(c => c.reference.identity_status === status)).toHaveLength(6);
    }
    expect(cases.filter(c => c.reference.origin === 'v2_native_synthetic' &&
      c.reference.identity_status === 'verified')).toHaveLength(0);
    expect(cases.find(c => c.case_id === 'V2-036')?.label).toBe('uncertain');
    expect(holdoutSha256(fixture().holdoutBytes)).toBe(fixture().holdoutChecksum.trim());
  });

  it('shares one canonical fixture identity for V2-007 and V2-008 while retaining independent labels', () => {
    const all = loadDedupV2();
    const same = all.find(x => x.case_id === 'V2-007')!;
    const distinct = all.find(x => x.case_id === 'V2-008')!;
    expect(same.reference.fixture_identity_id).toBe('REF-V2-007');
    expect(distinct.reference.fixture_identity_id).toBe(same.reference.fixture_identity_id);
    expect(same.label).toBe('same');
    expect(distinct.label).toBe('distinct');
    expect(same.provenance).toEqual(distinct.provenance);
    expect(same.reference).toEqual(distinct.reference);
    expect(new Set(all.map(x => x.reference.fixture_identity_id)).size).toBe(92);
  });

  it('fails closed when a repeated reference has a different fixture identity or inconsistent status/provenance', () => {
    const input = fixture();
    const rows = input.developmentText.trimEnd().split('\n').map(x => JSON.parse(x) as DedupV2Case);
    const second = rows.find(x => x.case_id === 'V2-008')!;
    second.reference.fixture_identity_id = 'REF-V2-008';
    expect(() => validateDedupV2({ ...input,
      developmentText: rows.map(x => JSON.stringify(x)).join('\n') + '\n',
    })).toThrow(/repeated canonical reference split across identities/);
    second.reference.fixture_identity_id = 'REF-V2-007';
    second.reference.usage = 'none';
    expect(() => validateDedupV2({ ...input,
      developmentText: rows.map(x => JSON.stringify(x)).join('\n') + '\n',
    })).toThrow(/shared fixture identity inconsistent reference\/provenance/);
    second.reference.usage = 'published';
    second.provenance.v1_case_id = 'invented-v1-id';
    expect(() => validateDedupV2({ ...input,
      developmentText: rows.map(x => JSON.stringify(x)).join('\n') + '\n',
    })).toThrow(/shared fixture identity inconsistent reference\/provenance/);
  });

  it('rejects a v2-native verified row without legitimate v1 envelope', () => {
    const input = fixture();
    const changed = changeFirst(input, c => {
      const ref = c.reference as Record<string, unknown>;
      ref.identity_status = 'verified';
    });
    expect(() => validateDedupV2(changed)).toThrow(/native facts without valid v1 envelope/);
  });

  it('rejects byte-changed holdout even if the JSON would still parse', () => {
    const input = fixture();
    input.holdoutBytes = Buffer.from(input.holdoutBytes.toString('utf8').replace('clock', 'watch'), 'utf8');
    expect(() => validateDedupV2(input)).toThrow(/SHA-256 mismatch/);
  });
  it('rejects invalid JSONL and split mismatch', () => {
    const input = fixture();
    expect(() => validateDedupV2({ ...input, developmentText: '{bad}\n' })).toThrow(/invalid JSON/);
    expect(() => validateDedupV2(changeFirst(input, c => { c.split = 'holdout'; }))).toThrow(/wrong split/);
  });
  it('rejects duplicate case_id across splits', () => {
    const input = fixture();
    const holdoutID = JSON.parse(input.holdoutBytes.toString('utf8').split('\n')[0]) as DedupV2Case;
    const rows = input.developmentText.trimEnd().split('\n');
    const c = JSON.parse(rows[0]) as DedupV2Case;
    c.case_id = holdoutID.case_id;
    c.reference.fixture_identity_id = 'REF-' + c.case_id;
    rows[0] = JSON.stringify(c);
    expect(() => validateDedupV2({ ...input, developmentText: rows.join('\n') + '\n' })).toThrow(/duplicate case_id/);
  });
  it('rejects unordered duplicate pairs with different IDs', () => {
    const input = fixture();
    const rows = input.developmentText.trimEnd().split('\n').map(x => JSON.parse(x) as DedupV2Case);
    rows[1].reference.claim_text = rows[0].query_claim_text;
    rows[1].query_claim_text = rows[0].reference.claim_text;
    rows[1].category = 'exact';
    expect(() => validateDedupV2({ ...input, developmentText: rows.map(x => JSON.stringify(x)).join('\n') + '\n' })).toThrow(/duplicate unordered pair/);
  });
  it('rejects invalid label and distinct lacking a real difference', () => {
    const input = fixture();
    expect(() => validateDedupV2(changeFirst(input, c => { c.label = 'invented'; }))).toThrow(/invalid enum/);
    const rows = input.developmentText.trimEnd().split('\n').map(x => JSON.parse(x) as DedupV2Case);
    const negative = rows.find(x => x.label === 'distinct')!;
    negative.material_difference = null;
    expect(() => validateDedupV2({ ...input, developmentText: rows.map(x => JSON.stringify(x)).join('\n') + '\n' })).toThrow(/material_difference/);
  });
  it('rejects manifest miscounts and a holdout modified with recomputed hash but no matching manifest', () => {
    const input = fixture();
    const manifest = structuredClone(input.manifest) as Record<string, unknown>;
    const totals = manifest.totals as Record<string, unknown>;
    totals.total = 999;
    expect(() => validateDedupV2({ ...input, manifest })).toThrow(/manifest mismatch/);
    expect(() => validateDedupV2(changeHoldout(input, c => { c.label = 'distinct'; }))).toThrow(/category\/label mismatch/);
  });
});

const corpus = loadDedupV2();
const mockCases = ['V2-001', 'V2-002', 'V2-003', 'V2-004', 'V2-006']
  .map(id => corpus.find(x => x.case_id === id)!);
const sha = 'a'.repeat(40);
const uuid = (i: number) => '00000000-0000-4000-8000-' + String(i).padStart(12, '0');
function mockBindings(): IdentityReadback[] {
  return mockCases.map((c, i) => ({
    case_id: c.case_id,
    fixture_identity_id: c.reference.fixture_identity_id,
    fact_public_id: uuid(i + 1),
    readback_claim_text: c.reference.claim_text,
    readback_origin: c.reference.origin,
    readback_identity_status: c.reference.identity_status,
    readback_usage: c.reference.usage,
    source: 'mock_unit_test',
    readback_evidence_ref: 'MOCK-readback-' + c.case_id,
  }));
}
const none: IdentityDecisionEvent = {
  decision: 'none', actor: 'none', stage: 'none',
  target_fact_public_id: null, evidence_ref: null,
};
const sameTo = (id: string, actor: 'chatgpt' | 'backend' | 'reviewer' = 'chatgpt'):
  IdentityDecisionEvent => ({
    decision: 'same', actor, stage: 'read_review',
    target_fact_public_id: id, evidence_ref: 'MOCK-decision-trace',
  });
function outcome(c: DedupV2Case, hit = false, complete = true,
  event: IdentityDecisionEvent = none): RetrievalOutcome {
  const i = mockCases.findIndex(x => x.case_id === c.case_id);
  return {
    case_id: c.case_id, run_id: 'MOCK-ONLY', backend_sha: sha,
    retrieval_version: 'mock-v2-not-a-backend', limit_k: 2, complete,
    visible_candidates: hit ? [{ fact_public_id: uuid(i + 1), claim_text: c.reference.claim_text }] : [],
    decision_event: event,
  };
}
function mock(): EvaluatedRun {
  return {
    status: 'evaluated', evidence_kind: 'mock', run_id: 'MOCK-ONLY',
    backend_sha: sha, retrieval_version: 'mock-v2-not-a-backend',
    limit_k: 2, decision_capture: 'complete', identity_readbacks: mockBindings(),
    outcomes: [
      outcome(mockCases[0], true), outcome(mockCases[1], true),
      outcome(mockCases[2], false, false),
      outcome(mockCases[3], true, true, sameTo(uuid(4), 'backend')),
      outcome(mockCases[4], false),
    ],
  };
}
describe('P2-T2 evaluator unit tests (MOCK ONLY, not DB or retrieval v2)', () => {
  it('computes recall 2/3, distinct false merge 1/1, incomplete and group breakdowns', () => {
    const report = evaluateRetrieval(mockCases, mock());
    expect(report.status).toBe('evaluated');
    if (report.status !== 'evaluated') throw new Error('unexpected NOT RUN');
    expect(report.evidence_kind).toBe('mock');
    expect(report.overall.recall_at_k).toEqual({ numerator: 2, denominator: 3 });
    expect(report.overall.false_merge).toEqual({ numerator: 1, denominator: 1 });
    expect(report.overall.distinct_false_merge).toEqual({ numerator: 1, denominator: 1 });
    expect(report.overall.wrong_target_merge).toEqual({ status: 'NOT RUN' });
    expect(report.overall.misses).toEqual(['V2-003']);
    expect(report.overall.false_merge_cases).toEqual(['V2-004']);
    expect(report.overall.incomplete_cases).toEqual(['V2-003']);
    expect(report.overall.uncertain).toBe(1);
    expect(report.overall.distinct_candidates_visible).toBe(1);
    expect(report.by_category.paraphrase.recall_at_k).toEqual({ numerator: 1, denominator: 1 });
    expect(report.by_origin).toHaveProperty('v2_native_synthetic');
    expect(report.by_identity_status).toHaveProperty('needs_review');
    expect(report.by_split).toHaveProperty('development');
  });

  it('counts a same decision to the WRONG canonical target as false merge', () => {
    const run = mock();
    run.outcomes[0].decision_event = sameTo(uuid(99), 'reviewer');
    const report = evaluateRetrieval(mockCases, run);
    if (report.status !== 'evaluated') throw new Error('unexpected NOT RUN');
    expect(report.overall.false_merge).toEqual({ numerator: 2, denominator: 2 });
    expect(report.overall.wrong_target_merge).toEqual({ numerator: 1, denominator: 1 });
    expect(report.overall.wrong_target_cases).toEqual(['V2-001']);
    expect(report.overall.false_merge_cases).toEqual(['V2-001', 'V2-004']);
  });

  it('returns NOT RUN without genuine identity mapping or event capture', () => {
    expect(evaluateRetrieval(mockCases, {
      status: 'NOT RUN', reason: 'RPC v2 not implemented',
    })).toEqual({ status: 'NOT RUN', reason: 'RPC v2 not implemented' });
    const noBindings = mock();
    noBindings.identity_readbacks = null;
    expect(evaluateRetrieval(mockCases, noBindings)).toMatchObject({ status: 'NOT RUN' });
    const noDecision = mock();
    noDecision.decision_capture = 'unavailable';
    for (const x of noDecision.outcomes) x.decision_event = null;
    const report = evaluateRetrieval(mockCases, noDecision);
    if (report.status !== 'evaluated') throw new Error('unexpected NOT RUN');
    expect(report.overall.false_merge).toEqual({ status: 'NOT RUN' });
    expect(report.overall.recall_at_k).toEqual({ numerator: 2, denominator: 3 });
    const noActualEvents = mock();
    for (const x of noActualEvents.outcomes) x.decision_event = none;
    const noActual = evaluateRetrieval(mockCases, noActualEvents);
    if (noActual.status !== 'evaluated') throw new Error('unexpected NOT RUN');
    expect(noActual.overall.false_merge).toEqual({ status: 'NOT RUN' });
  });

  it('evaluates two cases referencing the same canonical ID with a single mapped public UUID', () => {
    const pairs = corpus.filter(x => ['V2-007', 'V2-008'].includes(x.case_id));
    const identity = uuid(71);
    const bindings: IdentityReadback[] = pairs.map(x => ({
      case_id: x.case_id, fixture_identity_id: x.reference.fixture_identity_id,
      fact_public_id: identity, readback_claim_text: x.reference.claim_text,
      readback_origin: x.reference.origin, readback_identity_status: x.reference.identity_status,
      readback_usage: x.reference.usage, source: 'mock_unit_test',
      readback_evidence_ref: 'MOCK-shared-fact-readback',
    }));
    const run: EvaluatedRun = {
      status: 'evaluated', evidence_kind: 'mock', run_id: 'MOCK-ONLY',
      backend_sha: sha, retrieval_version: 'mock-v2-not-a-backend', limit_k: 2,
      identity_readbacks: bindings, decision_capture: 'complete',
      outcomes: pairs.map(x => ({
        case_id: x.case_id, run_id: 'MOCK-ONLY', backend_sha: sha,
        retrieval_version: 'mock-v2-not-a-backend', limit_k: 2, complete: true,
        visible_candidates: [{ fact_public_id: identity, claim_text: x.reference.claim_text }],
        decision_event: none,
      })),
    };
    const report = evaluateRetrieval(pairs, run);
    if (report.status !== 'evaluated') throw new Error('unexpected NOT RUN');
    expect(report.overall.recall_at_k).toEqual({ numerator: 1, denominator: 1 });
    expect(report.overall.distinct_candidates_visible).toBe(1);
    run.identity_readbacks![1].fact_public_id = uuid(72);
    expect(() => evaluateRetrieval(pairs, run)).toThrow(/shared fixture identity mapped to two fact_public_id/);
  });

  it('rejects one fact_public_id assigned to different fixture identities', () => {
    const run = mock();
    run.identity_readbacks![1].fact_public_id = run.identity_readbacks![0].fact_public_id;
    expect(() => evaluateRetrieval(mockCases, run)).toThrow(/fact_public_id mapped to two fixture identities/);
  });

  it('rejects forged/cross-case identity mappings and incomplete readbacks', () => {
    const invalid = mock();
    invalid.identity_readbacks![0].fact_public_id = 'invented-reference-id';
    expect(() => evaluateRetrieval(mockCases, invalid)).toThrow(/invalid fact_public_id/);
    const wrong = mock();
    wrong.identity_readbacks![0].fixture_identity_id = 'REF-V2-999';
    expect(() => evaluateRetrieval(mockCases, wrong)).toThrow(/fixture identity mismatch/);
    const forged = mock();
    forged.identity_readbacks![0].readback_claim_text = 'This is not the gold fact.';
    expect(() => evaluateRetrieval(mockCases, forged)).toThrow(/readback claim mismatch/);
    const incomplete = mock();
    incomplete.identity_readbacks!.pop();
    expect(() => evaluateRetrieval(mockCases, incomplete)).toThrow(/incomplete identity readback/);
    const badSource = mock();
    badSource.evidence_kind = 'isolated_db';
    expect(() => evaluateRetrieval(mockCases, badSource)).toThrow(/wrong mapping evidence source/);
  });

  it('rejects missing/duplicate outcomes, invalid same targets and missing trace', () => {
    const missing = mock();
    missing.outcomes.pop();
    expect(() => evaluateRetrieval(mockCases, missing)).toThrow(/missing or extra outcomes/);
    const duplicate = mock();
    duplicate.outcomes[1] = duplicate.outcomes[0];
    expect(() => evaluateRetrieval(mockCases, duplicate)).toThrow(/duplicate outcome/);
    const wrongSha = mock();
    wrongSha.outcomes[0].backend_sha = 'b'.repeat(40);
    expect(() => evaluateRetrieval(mockCases, wrongSha)).toThrow(/metadata mismatch/);
    const invalidTarget = mock();
    invalidTarget.outcomes[3].decision_event = sameTo('not-a-uuid');
    expect(() => evaluateRetrieval(mockCases, invalidTarget)).toThrow(/same requires target/);
    const badActor = mock();
    badActor.outcomes[3].decision_event = { ...sameTo(uuid(4)), actor: 'none' };
    expect(() => evaluateRetrieval(mockCases, badActor)).toThrow(/decision actor/);
    const missingTrace = mock();
    missingTrace.outcomes[3].decision_event = null;
    expect(() => evaluateRetrieval(mockCases, missingTrace)).toThrow(/missing captured decision/);
    const unavailable = mock();
    unavailable.decision_capture = 'unavailable';
    expect(() => evaluateRetrieval(mockCases, unavailable)).toThrow(/decision must be null/);
  });
});
