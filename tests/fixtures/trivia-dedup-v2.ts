import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

export type Split = 'development' | 'holdout';
export type Label = 'same' | 'distinct' | 'uncertain';
export type Category = 'exact' | 'paraphrase' | 'alias_unit' | 'hard_negative' | 'uncertain';
export type Origin = 'legacy_v1' | 'v2_native_synthetic';
export type IdentityStatus =
  | 'needs_review'
  | 'verified'
  | 'invalidated'
  | 'superseded'
  | 'rejected';
export type Usage = 'none' | 'draft' | 'published';

export type DedupV2Case = {
  case_id: string;
  split: Split;
  reference: {
    fixture_identity_id: string;
    claim_text: string;
    origin: Origin;
    identity_status: IdentityStatus;
    usage: Usage;
    evidence_expired_only: boolean;
  };
  query_claim_text: string;
  label: Label;
  category: Category;
  material_difference: string | null;
  rationale: string;
  provenance: { kind: 'synthetic' | 'v1_adapted'; v1_case_id: string | null };
};

export type Counts = {
  total: number;
  labels: Record<string, number>;
  categories: Record<string, number>;
  origins: Record<string, number>;
  identity_statuses: Record<string, number>;
  usages: Record<string, number>;
  expired_only: number;
};

export type DedupV2Manifest = {
  fixture_version: number;
  language: string;
  files: { development: string; holdout: string; holdout_checksum: string };
  hash_policy: string;
  label_definitions: Record<Label, string>;
  split_policy: string;
  splits: Record<Split, Counts>;
  totals: Counts;
};

export type FixtureInputs = {
  developmentText: string;
  holdoutBytes: Buffer;
  holdoutChecksum: string;
  manifest: unknown;
};

function ensure(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}
function record(value: unknown, path: string): Record<string, unknown> {
  ensure(value !== null && typeof value === 'object' && !Array.isArray(value), path + ': object required');
  return value as Record<string, unknown>;
}
function nonempty(value: unknown, path: string, min = 1): asserts value is string {
  ensure(typeof value === 'string' && value.trim().length >= min, path + ': nonempty string required');
}
function inSet(value: unknown, allowed: readonly string[], path: string): void {
  ensure(typeof value === 'string' && allowed.includes(value), path + ': invalid enum');
}
function exactKeys(obj: Record<string, unknown>, keys: readonly string[], path: string): void {
  ensure(
    Object.keys(obj).sort().join('|') === [...keys].sort().join('|'),
    path + ': unexpected or missing fields',
  );
}
function normalize(claim: string): string {
  return claim.toLocaleLowerCase('en-US').replace(/[^\p{L}\p{N}]+/gu, ' ').trim().replace(/\s+/g, ' ');
}
function pairKey(a: string, b: string): string {
  return [normalize(a), normalize(b)].sort().join('\u0000');
}
function jsonl(text: string, split: Split): unknown[] {
  ensure(text.endsWith('\n') && !text.endsWith('\n\n'), split + ': LF terminator required');
  ensure(!text.includes('\r'), split + ': CR not allowed');
  return text.slice(0, -1).split('\n').map((line, index) => {
    ensure(line.trim().length > 0, split + ': blank line ' + (index + 1));
    try {
      return JSON.parse(line) as unknown;
    } catch {
      throw new Error(split + ': invalid JSON at line ' + (index + 1));
    }
  });
}
function assertCase(value: unknown, split: Split): asserts value is DedupV2Case {
  const c = record(value, split + ' case');
  exactKeys(c, ['case_id', 'split', 'reference', 'query_claim_text', 'label', 'category', 'material_difference', 'rationale', 'provenance'], 'case');
  nonempty(c.case_id, 'case_id');
  ensure(/^V2-\d{3,}$/.test(c.case_id), 'case_id format');
  ensure(c.split === split, c.case_id + ': wrong split');
  inSet(c.label, ['same', 'distinct', 'uncertain'], c.case_id + ': label');
  inSet(c.category, ['exact', 'paraphrase', 'alias_unit', 'hard_negative', 'uncertain'], c.case_id + ': category');
  const labelForCategory: Record<Category, Label> = {
    exact: 'same', paraphrase: 'same', alias_unit: 'same', hard_negative: 'distinct', uncertain: 'uncertain',
  };
  ensure(labelForCategory[c.category as Category] === c.label, c.case_id + ': category/label mismatch');
  nonempty(c.query_claim_text, c.case_id + ': query');
  nonempty(c.rationale, c.case_id + ': rationale', 25);
  if (c.label === 'distinct') {
    nonempty(c.material_difference, c.case_id + ': distinct material_difference', 8);
  } else {
    ensure(c.material_difference === null, c.case_id + ': non-distinct cannot assert material_difference');
  }
  const ref = record(c.reference, c.case_id + ': reference');
  exactKeys(ref, ['fixture_identity_id', 'claim_text', 'origin', 'identity_status', 'usage', 'evidence_expired_only'], 'reference');
  nonempty(ref.fixture_identity_id, c.case_id + ': missing fixture identity');
  ensure(/^REF-V2-\d{3,}$/.test(ref.fixture_identity_id), c.case_id + ': invalid fixture identity format');
  nonempty(ref.claim_text, c.case_id + ': reference.claim_text');
  inSet(ref.origin, ['legacy_v1', 'v2_native_synthetic'], c.case_id + ': origin');
  inSet(ref.identity_status, ['needs_review', 'verified', 'invalidated', 'superseded', 'rejected'], c.case_id + ': identity_status');
  inSet(ref.usage, ['none', 'draft', 'published'], c.case_id + ': usage');
  ensure(typeof ref.evidence_expired_only === 'boolean', c.case_id + ': expired flag');
  ensure(!ref.evidence_expired_only || (ref.origin === 'legacy_v1' && ref.identity_status === 'verified'), c.case_id + ': expired-only must be verified legacy_v1');
  ensure(ref.origin !== 'v2_native_synthetic' || ref.identity_status !== 'verified', c.case_id + ': native facts without valid v1 envelope cannot be verified');
  const provenance = record(c.provenance, c.case_id + ': provenance');
  exactKeys(provenance, ['kind', 'v1_case_id'], 'provenance');
  inSet(provenance.kind, ['synthetic', 'v1_adapted'], c.case_id + ': provenance.kind');
  if (ref.origin === 'legacy_v1') {
    ensure(provenance.kind === 'v1_adapted', c.case_id + ': legacy provenance kind');
    nonempty(provenance.v1_case_id, c.case_id + ': legacy v1 id');
  } else {
    ensure(provenance.kind === 'synthetic' && provenance.v1_case_id === null, c.case_id + ': synthetic provenance');
  }
  ensure(normalize(ref.claim_text).length > 0 && normalize(c.query_claim_text as string).length > 0, c.case_id + ': empty normalized claim');
  if (c.category === 'paraphrase') {
    ensure(normalize(ref.claim_text) !== normalize(c.query_claim_text as string), c.case_id + ': punctuation-only is not a paraphrase');
  }
  if (c.label === 'distinct') {
    ensure(normalize(ref.claim_text) !== normalize(c.query_claim_text as string), c.case_id + ': distinct cannot be text-identical');
  }
}

function counter(cases: DedupV2Case[], key: (item: DedupV2Case) => string): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const item of cases) counts[key(item)] = (counts[key(item)] ?? 0) + 1;
  return Object.fromEntries(Object.entries(counts).sort(([a], [b]) => a.localeCompare(b)));
}
export function summarizeCases(cases: DedupV2Case[]): Counts {
  return {
    total: cases.length,
    labels: counter(cases, x => x.label),
    categories: counter(cases, x => x.category),
    origins: counter(cases, x => x.reference.origin),
    identity_statuses: counter(cases, x => x.reference.identity_status),
    usages: counter(cases, x => x.reference.usage),
    expired_only: cases.filter(x => x.reference.evidence_expired_only).length,
  };
}
function countsMatch(expected: unknown, actual: Counts, label: string): void {
  const parsed = record(expected, label);
  exactKeys(parsed, ['total', 'labels', 'categories', 'origins', 'identity_statuses', 'usages', 'expired_only'], label);
  for (const [key, value] of Object.entries(actual)) {
    ensure(JSON.stringify(parsed[key]) === JSON.stringify(value), label + ': manifest mismatch in ' + key);
  }
}

/** SHA-256 over the original bytes, including final LF; never JSON reserialize. */
export function holdoutSha256(bytes: Buffer): string {
  return createHash('sha256').update(bytes).digest('hex');
}
export function validateDedupV2(input: FixtureInputs): DedupV2Case[] {
  const manifest = record(input.manifest, 'manifest') as unknown as DedupV2Manifest;
  ensure(manifest.fixture_version === 1 && manifest.language === 'en-US', 'manifest version/language');
  ensure(
    manifest.files?.development === 'development.v1.jsonl' &&
    manifest.files?.holdout === 'holdout.v1.jsonl' &&
    manifest.files?.holdout_checksum === 'holdout.sha256',
    'manifest files',
  );
  ensure(typeof manifest.hash_policy === 'string' && typeof manifest.split_policy === 'string', 'manifest policies');
  ensure(/^[a-f0-9]{64}\n$/.test(input.holdoutChecksum), 'holdout checksum format');
  ensure(holdoutSha256(input.holdoutBytes) === input.holdoutChecksum.trim(), 'holdout SHA-256 mismatch');
  const development = jsonl(input.developmentText, 'development');
  const holdout = jsonl(input.holdoutBytes.toString('utf8'), 'holdout');
  const ids = new Set<string>(), pairs = new Set<string>();
  // One canonical fixture identity can be used by several editorial cases.
  // Its reference snapshot and provenance must be identical in a single seed/run.
  const referenceByIdentity = new Map<string, string>();
  const identityByReference = new Map<string, string>();

  for (const [split, rows] of [['development', development], ['holdout', holdout]] as const) {
    for (const row of rows) {
      assertCase(row, split);
      ensure(!ids.has(row.case_id), row.case_id + ': duplicate case_id');
      ids.add(row.case_id);
      const referenceKey = JSON.stringify([row.reference.claim_text, row.reference.origin,
        row.reference.identity_status, row.reference.usage, row.reference.evidence_expired_only,
        row.provenance.kind, row.provenance.v1_case_id]);
      const existingReference = referenceByIdentity.get(row.reference.fixture_identity_id);
      ensure(existingReference === undefined || existingReference === referenceKey,
        row.case_id + ': shared fixture identity inconsistent reference/provenance');
      const existingIdentity = identityByReference.get(referenceKey);
      ensure(existingIdentity === undefined || existingIdentity === row.reference.fixture_identity_id,
        row.case_id + ': repeated canonical reference split across identities');
      referenceByIdentity.set(row.reference.fixture_identity_id, referenceKey);
      identityByReference.set(referenceKey, row.reference.fixture_identity_id);
      const pair = pairKey(row.reference.claim_text, row.query_claim_text);
      ensure(!pairs.has(pair), row.case_id + ': duplicate unordered pair');
      pairs.add(pair);
    }
  }
  const d = development as DedupV2Case[], h = holdout as DedupV2Case[];
  countsMatch(manifest.splits?.development, summarizeCases(d), 'development');
  countsMatch(manifest.splits?.holdout, summarizeCases(h), 'holdout');
  countsMatch(manifest.totals, summarizeCases([...d, ...h]), 'total');
  return [...d, ...h];
}
const fixtureRoot = new URL('../../supabase/tests/fixtures/trivia/dedup-v2/', import.meta.url);
export function loadDedupV2(): DedupV2Case[] {
  return validateDedupV2({
    developmentText: readFileSync(new URL('development.v1.jsonl', fixtureRoot), 'utf8'),
    holdoutBytes: readFileSync(new URL('holdout.v1.jsonl', fixtureRoot)),
    holdoutChecksum: readFileSync(new URL('holdout.sha256', fixtureRoot), 'utf8'),
    manifest: JSON.parse(readFileSync(new URL('manifest.v1.json', fixtureRoot), 'utf8')) as unknown,
  });
}

/**
 * The independent DB harness must read back every seeded fact and provide these
 * bindings separately from retrieval outcomes. A caller-supplied "reference_identity_id"
 * in a retrieval outcome is deliberately not accepted.
 *
 * This structural validator checks a readback against the frozen fixture but
 * cannot authenticate the DB itself: production-quality evidence needs actual
 * isolated-stack readback logs and cleanup review outside this unit test.
 */
export type IdentityReadback = {
  case_id: string;
  fixture_identity_id: string;
  fact_public_id: string;
  readback_claim_text: string;
  readback_origin: Origin;
  readback_identity_status: IdentityStatus;
  readback_usage: Usage;
  source: 'isolated_db_readback' | 'mock_unit_test';
  readback_evidence_ref: string;
};
export type IdentityDecisionEvent = {
  decision: 'same' | 'distinct' | 'uncertain' | 'none';
  actor: 'chatgpt' | 'backend' | 'reviewer' | 'none';
  stage: 'read_review' | 'save_resolution' | 'revise_resolution' | 'registration' | 'none';
  target_fact_public_id: string | null;
  evidence_ref: string | null;
};
export type RetrievalOutcome = {
  case_id: string;
  run_id: string;
  backend_sha: string;
  retrieval_version: string;
  limit_k: number;
  complete: boolean;
  visible_candidates: Array<{ fact_public_id: string; claim_text: string }>;
  decision_event: IdentityDecisionEvent | null;
};
export type EvaluatedRun = {
  status: 'evaluated';
  evidence_kind: 'isolated_db' | 'mock';
  run_id: string;
  backend_sha: string;
  retrieval_version: string;
  limit_k: number;
  /** Missing bindings mean recall and false-merge are NOT RUN. */
  identity_readbacks: IdentityReadback[] | null;
  /** Complete means event capture (including explicit 'none') for every case. */
  decision_capture: 'complete' | 'unavailable';
  outcomes: RetrievalOutcome[];
};
export type NotRun = { status: 'NOT RUN'; reason: string };
export type Score = { numerator: number; denominator: number };
export type MaybeScore = Score | { status: 'NOT RUN' };
export type MetricGroup = {
  total: number;
  recall_at_k: Score;
  /** Wrong same targets, plus same decisions on distinct/uncertain cases. */
  false_merge: MaybeScore;
  distinct_false_merge: MaybeScore;
  wrong_target_merge: MaybeScore;
  decision_cases: number;
  incomplete: number;
  uncertain: number;
  misses: string[];
  false_merge_cases: string[];
  wrong_target_cases: string[];
  incomplete_cases: string[];
  distinct_candidates_visible: number;
};
export type EvaluationReport = {
  status: 'evaluated';
  evidence_kind: 'isolated_db' | 'mock';
  run_id: string;
  backend_sha: string;
  retrieval_version: string;
  limit_k: number;
  overall: MetricGroup;
  by_split: Record<string, MetricGroup>;
  by_category: Record<string, MetricGroup>;
  by_origin: Record<string, MetricGroup>;
  by_identity_status: Record<string, MetricGroup>;
};

function isPublicUuid(value: unknown): value is string {
  return typeof value === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function validateMappings(cases: DedupV2Case[], run: EvaluatedRun): Map<string, IdentityReadback> | null {
  if (run.identity_readbacks === null) return null;
  ensure(Array.isArray(run.identity_readbacks), 'identity_readbacks must be array or null');
  ensure(run.identity_readbacks.length === cases.length, 'incomplete identity readback mapping');
  const casesById = new Map(cases.map(c => [c.case_id, c]));
  const bindings = new Map<string, IdentityReadback>();
  const publicIdByFixture = new Map<string, string>();
  const fixtureByPublicId = new Map<string, string>();
  for (const binding of run.identity_readbacks) {
    const gold = casesById.get(binding.case_id);
    ensure(gold, 'readback unknown case_id');
    ensure(!bindings.has(binding.case_id), binding.case_id + ': duplicate readback mapping');
    ensure(binding.fixture_identity_id === gold.reference.fixture_identity_id, binding.case_id + ': fixture identity mismatch');
    ensure(isPublicUuid(binding.fact_public_id), binding.case_id + ': invalid fact_public_id');
    const existingPublicId = publicIdByFixture.get(binding.fixture_identity_id);
    ensure(existingPublicId === undefined || existingPublicId === binding.fact_public_id,
      binding.case_id + ': shared fixture identity mapped to two fact_public_id values');
    const existingFixtureId = fixtureByPublicId.get(binding.fact_public_id);
    ensure(existingFixtureId === undefined || existingFixtureId === binding.fixture_identity_id,
      binding.case_id + ': fact_public_id mapped to two fixture identities');
    publicIdByFixture.set(binding.fixture_identity_id, binding.fact_public_id);
    fixtureByPublicId.set(binding.fact_public_id, binding.fixture_identity_id);
    ensure(binding.readback_claim_text === gold.reference.claim_text, binding.case_id + ': DB readback claim mismatch');
    ensure(binding.readback_origin === gold.reference.origin, binding.case_id + ': DB readback origin mismatch');
    ensure(binding.readback_identity_status === gold.reference.identity_status, binding.case_id + ': DB readback status mismatch');
    ensure(binding.readback_usage === gold.reference.usage, binding.case_id + ': DB readback usage mismatch');
    ensure(binding.source === (run.evidence_kind === 'mock' ? 'mock_unit_test' : 'isolated_db_readback'), binding.case_id + ': wrong mapping evidence source');
    nonempty(binding.readback_evidence_ref, binding.case_id + ': missing DB readback evidence ref');
    bindings.set(binding.case_id, binding);
  }
  return bindings;
}

function validateEvent(event: IdentityDecisionEvent | null, run: EvaluatedRun, caseId: string): void {
  if (run.decision_capture === 'unavailable') {
    ensure(event === null, caseId + ': decision must be null if capture unavailable');
    return;
  }
  ensure(event && typeof event === 'object', caseId + ': missing captured decision event');
  inSet(event.decision, ['same', 'distinct', 'uncertain', 'none'], caseId + ': decision');
  if (event.decision === 'none') {
    ensure(event.actor === 'none' && event.stage === 'none' &&
      event.target_fact_public_id === null && event.evidence_ref === null,
    caseId + ': no-decision must not carry target or actor');
    return;
  }
  inSet(event.actor, ['chatgpt', 'backend', 'reviewer'], caseId + ': decision actor');
  inSet(event.stage, ['read_review', 'save_resolution', 'revise_resolution', 'registration'], caseId + ': decision stage');
  nonempty(event.evidence_ref, caseId + ': decision evidence ref');
  if (event.decision === 'same') {
    ensure(isPublicUuid(event.target_fact_public_id), caseId + ': same requires target fact_public_id');
  } else {
    ensure(event.target_fact_public_id === null, caseId + ': only same may have target fact_public_id');
  }
}

function scoreGroup(
  rows: DedupV2Case[],
  byId: Map<string, RetrievalOutcome>,
  mappings: Map<string, IdentityReadback>,
  k: number,
  decisionCapture: EvaluatedRun['decision_capture'],
): MetricGroup {
  const same = rows.filter(x => x.label === 'same');
  const distinct = rows.filter(x => x.label === 'distinct');
  const candidateVisible = (c: DedupV2Case) =>
    byId.get(c.case_id)!.visible_candidates.slice(0, k).some(
      y => y.fact_public_id === mappings.get(c.case_id)!.fact_public_id,
    );
  const misses = same.filter(x => !candidateVisible(x)).map(x => x.case_id);
  const reviewed = decisionCapture === 'complete'
    ? rows.filter(x => byId.get(x.case_id)!.decision_event?.decision !== 'none')
    : [];
  const sameDecisions = reviewed.filter(x => byId.get(x.case_id)!.decision_event!.decision === 'same');
  const falseMerges = sameDecisions.filter(x =>
    x.label !== 'same' ||
    byId.get(x.case_id)!.decision_event!.target_fact_public_id !== mappings.get(x.case_id)!.fact_public_id,
  ).map(x => x.case_id);
  const wrongTarget = sameDecisions.filter(x =>
    x.label === 'same' &&
    byId.get(x.case_id)!.decision_event!.target_fact_public_id !== mappings.get(x.case_id)!.fact_public_id,
  ).map(x => x.case_id);
  const reviewedDistinct = reviewed.filter(x => x.label === 'distinct');
  const distinctMerges = reviewedDistinct.filter(x => byId.get(x.case_id)!.decision_event!.decision === 'same');
  const incomplete = rows.filter(x => !byId.get(x.case_id)!.complete).map(x => x.case_id);
  const ratio = (numerator: number, denominator: number): MaybeScore =>
    denominator > 0 ? { numerator, denominator } : { status: 'NOT RUN' };
  return {
    total: rows.length,
    recall_at_k: { numerator: same.length - misses.length, denominator: same.length },
    false_merge: ratio(falseMerges.length, reviewed.length),
    distinct_false_merge: ratio(distinctMerges.length, reviewedDistinct.length),
    wrong_target_merge: ratio(wrongTarget.length, reviewed.filter(x => x.label === 'same').length),
    decision_cases: reviewed.length,
    incomplete: incomplete.length,
    uncertain: rows.filter(x => x.label === 'uncertain').length,
    misses,
    false_merge_cases: falseMerges,
    wrong_target_cases: wrongTarget,
    incomplete_cases: incomplete,
    distinct_candidates_visible: distinct.filter(candidateVisible).length,
  };
}
function groups(
  rows: DedupV2Case[],
  key: (x: DedupV2Case) => string,
  outcomes: Map<string, RetrievalOutcome>,
  mappings: Map<string, IdentityReadback>,
  run: EvaluatedRun,
): Record<string, MetricGroup> {
  const grouped: Record<string, DedupV2Case[]> = {};
  for (const c of rows) (grouped[key(c)] ??= []).push(c);
  return Object.fromEntries(Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b)).map(([label, group]) => [
    label, scoreGroup(group, outcomes, mappings, run.limit_k, run.decision_capture),
  ]));
}

/** No actual DB evidence exists in P2-T2. Tests use evidence_kind='mock' only. */
export function evaluateRetrieval(cases: DedupV2Case[], run: EvaluatedRun | NotRun): EvaluationReport | NotRun {
  if (run.status === 'NOT RUN') {
    nonempty(run.reason, 'NOT RUN reason');
    return { status: 'NOT RUN', reason: run.reason };
  }
  nonempty(run.run_id, 'run_id');
  ensure(/^[a-f0-9]{40}$/.test(run.backend_sha), 'backend_sha must be 40 hex chars');
  nonempty(run.retrieval_version, 'retrieval_version');
  ensure(Number.isInteger(run.limit_k) && run.limit_k > 0, 'limit_k invalid');
  inSet(run.evidence_kind, ['isolated_db', 'mock'], 'evidence_kind');
  inSet(run.decision_capture, ['complete', 'unavailable'], 'decision_capture');
  const mappings = validateMappings(cases, run);
  if (!mappings) return { status: 'NOT RUN', reason: 'Identity mappings from independent fixture readback unavailable' };
  ensure(run.outcomes.length === cases.length, 'missing or extra outcomes for evaluated run');
  const knownIds = new Set(cases.map(c => c.case_id)), byId = new Map<string, RetrievalOutcome>();
  for (const outcome of run.outcomes) {
    ensure(knownIds.has(outcome.case_id), 'unknown outcome case_id');
    ensure(!byId.has(outcome.case_id), 'duplicate outcome case_id');
    ensure(outcome.run_id === run.run_id && outcome.backend_sha === run.backend_sha &&
      outcome.retrieval_version === run.retrieval_version && outcome.limit_k === run.limit_k,
    outcome.case_id + ': outcome/run metadata mismatch');
    ensure(typeof outcome.complete === 'boolean', outcome.case_id + ': complete required');
    ensure(Array.isArray(outcome.visible_candidates), outcome.case_id + ': candidate array required');
    const seen = new Set<string>();
    for (const candidate of outcome.visible_candidates) {
      ensure(isPublicUuid(candidate.fact_public_id), outcome.case_id + ': candidate fact_public_id invalid');
      nonempty(candidate.claim_text, outcome.case_id + ': candidate claim');
      ensure(!seen.has(candidate.fact_public_id), outcome.case_id + ': repeated candidate fact_public_id');
      seen.add(candidate.fact_public_id);
    }
    validateEvent(outcome.decision_event, run, outcome.case_id);
    byId.set(outcome.case_id, outcome);
  }
  return {
    status: 'evaluated', evidence_kind: run.evidence_kind, run_id: run.run_id,
    backend_sha: run.backend_sha, retrieval_version: run.retrieval_version, limit_k: run.limit_k,
    overall: scoreGroup(cases, byId, mappings, run.limit_k, run.decision_capture),
    by_split: groups(cases, x => x.split, byId, mappings, run),
    by_category: groups(cases, x => x.category, byId, mappings, run),
    by_origin: groups(cases, x => x.reference.origin, byId, mappings, run),
    by_identity_status: groups(cases, x => x.reference.identity_status, byId, mappings, run),
  };
}
