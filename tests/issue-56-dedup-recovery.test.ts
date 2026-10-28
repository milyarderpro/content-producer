import { describe, expect, it } from 'vitest';
import {
  candidateKeys,
  scenarios,
  type CandidateKey,
  type Delivery,
  type MockCandidate,
  type MockMatch,
  type Scenario,
} from './fixtures/issue-56-dedup-recovery.js';

type Review = {
  candidate_fact_public_id: string;
  decision: 'same' | 'distinct';
  reason: string;
  material_differences: ('relation' | 'other')[];
};
type TraceEvent =
  | { event: 'READ'; key: CandidateKey; attempt: number; max_matches_per_candidate: 20 }
  | { event: 'OBSERVE'; key: CandidateKey; attempt: number; complete: boolean; missing: string[] }
  | { event: 'RETRY_REASON'; key: CandidateKey; missing: string[] }
  | { event: 'REVIEW'; key: CandidateKey; decisions: Review[] }
  | { event: 'HOLD'; incomplete_keys: CandidateKey[] }
  // Used only in negative controls. No business Write tool is called by this test.
  | { event: 'WRITE'; tool: 'trivia_register_and_reserve_facts' | 'save_post' };

const proposed = {
  subject_key: 'saturn',
  relation_key: 'is_classified_as',
  object_key: 'gas_giant',
};

// Only the host-visible view is inspected. The complete server payload is retained
// by the fixture solely to show that clipping is injected after the mock RPC boundary.
function missingFromVisible(key: CandidateKey, delivery: Delivery): string[] {
  const missing: string[] = [];
  if (delivery.display_truncated) missing.push('host display truncated');
  const visible = delivery.visible;
  if (visible.response_schema_version !== 1 || visible.data.candidates.length !== 1) {
    missing.push('one structured success candidate');
    return missing;
  }
  const candidate = visible.data.candidates[0];
  if (candidate.candidate_key !== key) missing.push('candidate_key mismatch');
  if (typeof candidate.review_required !== 'boolean') missing.push('review_required missing');
  if (!Array.isArray(candidate.matches)) {
    missing.push('matches missing');
  } else {
    for (const [index, match] of candidate.matches.entries()) {
      if (
        !match.fact_public_id ||
        !match.material_identity?.subject_key ||
        !match.material_identity.relation_key ||
        !match.material_identity.object_key ||
        !match.material_identity.qualifiers
      ) {
        missing.push(`match ${index + 1} ID/material identity missing`);
      }
    }
  }
  return missing;
}

class MockReadTool {
  private readonly counts = new Map<CandidateKey, number>();

  constructor(private readonly scenario: Scenario) {}

  read(key: CandidateKey, maxMatches: 20): Delivery {
    expect(maxMatches).toBe(20);
    const count = this.counts.get(key) ?? 0;
    const delivery = this.scenario.responses[key][count];
    if (!delivery) throw new Error(`Unexpected READ ${key} attempt ${count + 1}`);
    this.counts.set(key, count + 1);
    expect(delivery.server.response_schema_version).toBe(1);
    expect(delivery.server.data.candidates).toHaveLength(1);
    expect(delivery.server.data.candidates[0].candidate_key).toBe(key);
    return delivery;
  }
}

function makeReviews(candidate: MockCandidate): Review[] {
  return candidate.matches.map((match: MockMatch) => {
    const identity = match.material_identity;
    const same =
      identity.subject_key === proposed.subject_key &&
      identity.relation_key === proposed.relation_key &&
      identity.object_key === proposed.object_key;
    const material_differences: Review['material_differences'] = [];
    if (!same && identity.relation_key !== proposed.relation_key)
      material_differences.push('relation');
    if (
      !same &&
      (identity.subject_key !== proposed.subject_key || identity.object_key !== proposed.object_key)
    )
      material_differences.push('other');
    return {
      candidate_fact_public_id: match.fact_public_id,
      decision: same ? 'same' : 'distinct',
      reason: same
        ? 'The structured proposition is identical.'
        : 'The displayed structured relation, subject, or object differs.',
      material_differences,
    };
  });
}

function verifyReviews(candidate: MockCandidate, reviews: Review[]): void {
  expect(reviews).toHaveLength(candidate.matches.length);
  expect(new Set(reviews.map((review) => review.candidate_fact_public_id)).size).toBe(
    candidate.matches.length,
  );
  expect(reviews.map((review) => review.candidate_fact_public_id)).toEqual(
    candidate.matches.map((match) => match.fact_public_id),
  );
  for (const [index, review] of reviews.entries()) {
    const identity = candidate.matches[index].material_identity;
    expect(review.reason.length).toBeGreaterThan(0);
    if (review.decision === 'same') {
      expect(review.material_differences).toEqual([]);
    } else {
      expect(review.material_differences.length).toBeGreaterThan(0);
      if (review.material_differences.includes('relation')) {
        expect(identity.relation_key).not.toBe(proposed.relation_key);
      }
      if (review.material_differences.includes('other')) {
        expect(
          identity.subject_key !== proposed.subject_key ||
            identity.object_key !== proposed.object_key,
        ).toBe(true);
      }
    }
  }
}

function simulate(scenario: Scenario): TraceEvent[] {
  const tool = new MockReadTool(scenario);
  const trace: TraceEvent[] = [];
  const latest = new Map<CandidateKey, Delivery>();
  const incomplete = new Map<CandidateKey, string[]>();

  // Scripted reference procedure: the test does not invoke ChatGPT or the plugin host.
  for (const key of candidateKeys) {
    trace.push({ event: 'READ', key, attempt: 1, max_matches_per_candidate: 20 });
    const delivery = tool.read(key, 20);
    latest.set(key, delivery);
    const missing = missingFromVisible(key, delivery);
    trace.push({ event: 'OBSERVE', key, attempt: 1, complete: missing.length === 0, missing });
    if (missing.length) incomplete.set(key, missing);
  }

  for (const [key, missing] of incomplete) {
    trace.push({ event: 'RETRY_REASON', key, missing });
    trace.push({ event: 'READ', key, attempt: 2, max_matches_per_candidate: 20 });
    const delivery = tool.read(key, 20);
    latest.set(key, delivery);
    const secondMissing = missingFromVisible(key, delivery);
    trace.push({
      event: 'OBSERVE',
      key,
      attempt: 2,
      complete: secondMissing.length === 0,
      missing: secondMissing,
    });
    if (secondMissing.length) incomplete.set(key, secondMissing);
    else incomplete.delete(key);
  }

  if (incomplete.size) {
    trace.push({ event: 'HOLD', incomplete_keys: [...incomplete.keys()] });
    return trace;
  }

  for (const key of candidateKeys) {
    const candidate = latest.get(key)?.visible.data.candidates[0] as MockCandidate;
    if (!candidate.review_required) continue;
    const decisions = makeReviews(candidate);
    verifyReviews(candidate, decisions);
    trace.push({ event: 'REVIEW', key, decisions });
  }
  return trace;
}

function readKeys(trace: TraceEvent[]): string[] {
  return trace
    .filter((event) => event.event === 'READ')
    .map((event) => `${event.key}#${event.attempt}@${event.max_matches_per_candidate}`);
}

// Check the recorded behavior independently from the scripted procedure above.
// Negative controls below prove that this check catches unsafe traces.
function assertTraceContract(trace: TraceEvent[]): void {
  if (
    trace.some((event) => event.event === 'HOLD') &&
    trace.some((event) => event.event === 'WRITE')
  )
    throw new Error('Business Write is forbidden when the set is on HOLD');
  const states = new Map<
    CandidateKey,
    {
      reads: number;
      observations: number;
      complete?: boolean;
      missing: string[];
      reasonLogged: boolean;
    }
  >();
  let held = false;
  let reviewed = false;

  for (const [index, event] of trace.entries()) {
    if (event.event === 'WRITE') {
      throw new Error('Business Write is outside this READ-only fixture');
    }
    if (held) throw new Error('No event may follow HOLD');

    if (event.event === 'READ') {
      if (reviewed) throw new Error('READ after semantic review');
      if (event.max_matches_per_candidate !== 20) throw new Error('READ must request 20 matches');
      const state = states.get(event.key) ?? {
        reads: 0,
        observations: 0,
        missing: [],
        reasonLogged: false,
      };
      if (state.reads >= 2) throw new Error(`More than two READs for ${event.key}`);
      if (event.attempt !== state.reads + 1) throw new Error('READ attempt out of order');
      if (state.reads === 1) {
        if (state.observations !== 1 || state.complete !== false)
          throw new Error('Retry requires an observed incomplete first response');
        if (!state.reasonLogged) throw new Error('Retry requires a prior recorded reason');
      }
      state.reads++;
      states.set(event.key, state);
    } else if (event.event === 'OBSERVE') {
      const state = states.get(event.key);
      if (!state || state.reads !== event.attempt || state.observations !== event.attempt - 1)
        throw new Error('Observation must follow its READ');
      if (event.complete !== (event.missing.length === 0))
        throw new Error('Observation completeness contradicts missing fields');
      state.observations++;
      state.complete = event.complete;
      state.missing = event.missing;
    } else if (event.event === 'RETRY_REASON') {
      const state = states.get(event.key);
      if (
        !state ||
        state.reads !== 1 ||
        state.observations !== 1 ||
        state.complete !== false ||
        state.reasonLogged ||
        event.missing.length === 0 ||
        event.missing.some((reason) => !reason.trim()) ||
        JSON.stringify(event.missing) !== JSON.stringify(state.missing)
      )
        throw new Error('Retry reason must record the observed missing fields before READ #2');
      state.reasonLogged = true;
    } else if (event.event === 'REVIEW') {
      if (
        [...states.values()].some((state) => state.observations !== state.reads || !state.complete)
      )
        throw new Error('Semantic review requires complete responses for the whole set');
      reviewed = true;
    } else if (event.event === 'HOLD') {
      const incomplete = [...states.entries()]
        .filter(([, state]) => state.observations === state.reads && state.complete === false)
        .map(([key]) => key);
      if (reviewed || index !== trace.length - 1 || incomplete.length === 0)
        throw new Error('HOLD must be terminal and precede any review');
      if (JSON.stringify(event.incomplete_keys) !== JSON.stringify(incomplete))
        throw new Error('HOLD must name all incomplete candidates');
      held = true;
    }
  }

  if (candidateKeys.some((key) => !states.has(key)))
    throw new Error('Missing initial candidate READ');
  if ([...states.values()].some((state) => state.observations !== state.reads))
    throw new Error('Every READ needs an observation');
  if ([...states.values()].some((state) => state.complete === false) !== held)
    throw new Error('Incomplete result requires HOLD; complete result forbids HOLD');
}

function logEvidence(name: string, trace: TraceEvent[]): void {
  const compact = trace.map((event) => {
    if (event.event === 'READ') return `READ ${event.key}#${event.attempt}@20`;
    if (event.event === 'OBSERVE')
      return `OBSERVE ${event.key}#${event.attempt} ${event.complete ? 'complete' : event.missing.join('+')}`;
    if (event.event === 'RETRY_REASON')
      return `RETRY_REASON ${event.key} ${event.missing.join('+')}`;
    if (event.event === 'REVIEW') return `REVIEW ${event.key} ${event.decisions.length}/20`;
    if (event.event === 'HOLD') return `HOLD ${event.incomplete_keys.join(',')}`;
    return `WRITE ${event.tool}`;
  });
  console.info(`ISSUE56 ${name}: ${compact.join(' -> ')}`);
}

describe('Issue #56 local scripted dedup recovery with mock READ responses', () => {
  it('keeps complete responses to one READ each and reviews all required match IDs', () => {
    const trace = simulate(scenarios[0]);
    assertTraceContract(trace);
    expect(readKeys(trace)).toEqual(['ISSUE56_A#1@20', 'ISSUE56_B#1@20', 'ISSUE56_C#1@20']);
    expect(trace.filter((event) => event.event === 'RETRY_REASON')).toHaveLength(0);
    const review = trace.find((event) => event.event === 'REVIEW');
    expect(review?.event).toBe('REVIEW');
    if (review?.event === 'REVIEW') {
      expect(review.decisions).toHaveLength(20);
      expect(review.decisions.filter((decision) => decision.decision === 'same')).toHaveLength(1);
      expect(review.decisions.filter((decision) => decision.decision === 'distinct')).toHaveLength(
        19,
      );
      const candidate = scenarios[0].responses.ISSUE56_B[0].visible.data
        .candidates[0] as MockCandidate;
      expect(() => verifyReviews(candidate, review.decisions.slice(1))).toThrow();
    }
    expect(trace.some((event) => event.event === 'HOLD')).toBe(false);
    expect(() =>
      assertTraceContract([
        ...trace.slice(0, -1),
        { event: 'READ', key: 'ISSUE56_A', attempt: 2, max_matches_per_candidate: 20 },
        trace.at(-1)!,
      ]),
    ).toThrow(/Retry requires an observed incomplete first response/);
    logEvidence(scenarios[0].name, trace);
  });

  it('retries only the clipped candidate after recording a reason, then reviews it', () => {
    const trace = simulate(scenarios[1]);
    assertTraceContract(trace);
    expect(readKeys(trace)).toEqual([
      'ISSUE56_A#1@20',
      'ISSUE56_B#1@20',
      'ISSUE56_C#1@20',
      'ISSUE56_B#2@20',
    ]);
    const reasonIndex = trace.findIndex((event) => event.event === 'RETRY_REASON');
    const retryIndex = trace.findIndex((event) => event.event === 'READ' && event.attempt === 2);
    expect(reasonIndex).toBeGreaterThan(-1);
    expect(reasonIndex).toBeLessThan(retryIndex);
    expect(trace[reasonIndex]).toMatchObject({ event: 'RETRY_REASON', key: 'ISSUE56_B' });
    expect(() => assertTraceContract(trace.filter((_, index) => index !== reasonIndex))).toThrow(
      /prior recorded reason/,
    );
    expect(() =>
      assertTraceContract(
        trace.map((event) =>
          event.event === 'RETRY_REASON' ? { ...event, missing: [''] } : event,
        ),
      ),
    ).toThrow(/Retry reason must record/);
    const review = trace.find((event) => event.event === 'REVIEW');
    expect(review?.event).toBe('REVIEW');
    if (review?.event === 'REVIEW') expect(review.decisions).toHaveLength(20);
    expect(trace.some((event) => event.event === 'HOLD')).toBe(false);
    logEvidence(scenarios[1].name, trace);
  });

  it('holds the whole set when the targeted second view is still clipped', () => {
    const trace = simulate(scenarios[2]);
    assertTraceContract(trace);
    expect(readKeys(trace)).toEqual([
      'ISSUE56_A#1@20',
      'ISSUE56_B#1@20',
      'ISSUE56_C#1@20',
      'ISSUE56_B#2@20',
    ]);
    expect(trace.at(-1)).toEqual({ event: 'HOLD', incomplete_keys: ['ISSUE56_B'] });
    expect(trace.some((event) => event.event === 'REVIEW')).toBe(false);
    expect(() =>
      assertTraceContract([
        ...trace.slice(0, -1),
        { event: 'READ', key: 'ISSUE56_B', attempt: 3, max_matches_per_candidate: 20 },
        trace.at(-1)!,
      ]),
    ).toThrow(/More than two READs/);
    expect(() =>
      assertTraceContract([
        ...trace.slice(0, -1),
        { event: 'WRITE', tool: 'trivia_register_and_reserve_facts' },
        trace.at(-1)!,
      ]),
    ).toThrow(/Business Write is forbidden when the set is on HOLD/);
    expect(() => assertTraceContract([...trace, { event: 'WRITE', tool: 'save_post' }])).toThrow(
      /Business Write is forbidden when the set is on HOLD/,
    );
    logEvidence(scenarios[2].name, trace);
  });
});
