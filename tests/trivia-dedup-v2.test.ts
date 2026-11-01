import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  evaluateRetrieval, holdoutSha256, loadDedupV2, summarizeCases, validateDedupV2,
  type DedupV2Case, type EvaluatedRun, type FixtureInputs, type RetrievalOutcome,
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
    expect(cases).toHaveLength(36);
    expect(summarizeCases(cases)).toMatchObject({
      total: 36, labels: { same: 18, distinct: 14, uncertain: 4 },
    });
    expect(cases.filter(c => c.split === 'development')).toHaveLength(24);
    expect(cases.filter(c => c.split === 'holdout')).toHaveLength(12);
    expect(cases.filter(c => c.reference.origin === 'legacy_v1')).toHaveLength(6);
    expect(cases.some(c => c.reference.evidence_expired_only)).toBe(true);
    for (const status of ['invalidated', 'superseded', 'rejected'] as const) {
      expect(cases.some(c => c.label === 'same' && c.reference.identity_status === status)).toBe(true);
    }
    expect(holdoutSha256(fixture().holdoutBytes)).toBe(fixture().holdoutChecksum.trim());
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
const mockCases = ['V2-001', 'V2-002', 'V2-003', 'V2-004', 'V2-006'].map(id => corpus.find(x => x.case_id === id)!);
const sha = 'a'.repeat(40);
function outcome(c: DedupV2Case, hit = false, complete = true, decision: 'same' | 'distinct' | 'uncertain' | null = null): RetrievalOutcome {
  return {
    case_id: c.case_id, run_id: 'MOCK-ONLY', backend_sha: sha,
    retrieval_version: 'mock-v2-not-a-backend', limit_k: 2, complete,
    reference_identity_id: 'db-' + c.reference.fixture_identity_id,
    visible_candidates: hit ? [{ identity_id: 'db-' + c.reference.fixture_identity_id, claim_text: c.reference.claim_text }] : [],
    automatic_identity_decision: decision,
  };
}
function mock(): EvaluatedRun {
  return {
    status: 'evaluated', run_id: 'MOCK-ONLY', backend_sha: sha,
    retrieval_version: 'mock-v2-not-a-backend', limit_k: 2,
    automatic_decisions_available: true,
    outcomes: [
      outcome(mockCases[0], true), outcome(mockCases[1], true),
      outcome(mockCases[2], false, false), outcome(mockCases[3], true, true, 'same'),
      outcome(mockCases[4], false),
    ],
  };
}
describe('P2-T2 evaluator unit tests (all outcomes MOCK; no DB)', () => {
  it('reports recall 2/3, false merge 1/1, incomplete and case IDs, with group breakdowns', () => {
    const report = evaluateRetrieval(mockCases, mock());
    expect(report.status).toBe('evaluated');
    if (report.status !== 'evaluated') throw new Error('unexpected NOT RUN');
    expect(report.overall.recall_at_k).toEqual({ numerator: 2, denominator: 3 });
    expect(report.overall.false_merge).toEqual({ numerator: 1, denominator: 1 });
    expect(report.overall.misses).toEqual(['V2-003']);
    expect(report.overall.false_merge_cases).toEqual(['V2-004']);
    expect(report.overall.incomplete_cases).toEqual(['V2-003']);
    expect(report.overall.uncertain).toBe(1);
    expect(report.overall.distinct_candidates_visible).toBe(1);
    expect(report.by_category.paraphrase.recall_at_k).toEqual({ numerator: 1, denominator: 1 });
    expect(report.by_origin).toHaveProperty('v2_native_synthetic');
    expect(report.by_identity_status).toHaveProperty('verified');
    expect(report.by_split).toHaveProperty('development');
  });
  it('is NOT RUN without actual outcomes and not zero false merges without automatic decisions', () => {
    expect(evaluateRetrieval(mockCases, { status: 'NOT RUN', reason: 'RPC v2 not implemented' })).toEqual({
      status: 'NOT RUN', reason: 'RPC v2 not implemented',
    });
    const data = mock();
    data.automatic_decisions_available = false;
    for (const x of data.outcomes) x.automatic_identity_decision = null;
    const report = evaluateRetrieval(mockCases, data);
    if (report.status !== 'evaluated') throw new Error('unexpected NOT RUN');
    expect(report.overall.false_merge).toEqual({ status: 'NOT RUN' });
  });
  it('rejects missing outcomes, duplicate outcome IDs, metadata mismatch and inconsistent decision availability', () => {
    const missing = mock();
    missing.outcomes.pop();
    expect(() => evaluateRetrieval(mockCases, missing)).toThrow(/missing or extra outcomes/);
    const duplicate = mock();
    duplicate.outcomes[1] = duplicate.outcomes[0];
    expect(() => evaluateRetrieval(mockCases, duplicate)).toThrow(/duplicate outcome/);
    const mismatched = mock();
    mismatched.outcomes[0].backend_sha = 'b'.repeat(40);
    expect(() => evaluateRetrieval(mockCases, mismatched)).toThrow(/metadata mismatch/);
    const noDecision = mock();
    noDecision.automatic_decisions_available = false;
    expect(() => evaluateRetrieval(mockCases, noDecision)).toThrow(/decision not available/);
  });
});
