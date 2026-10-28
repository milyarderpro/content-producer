// Synthetic MCP results. `visible` models what a host displays after a valid server reply.
// No production IDs, network connection, or business Write are used by these fixtures.
export const candidateKeys = ['ISSUE56_A', 'ISSUE56_B', 'ISSUE56_C'] as const;
export type CandidateKey = (typeof candidateKeys)[number];

export type MockMatch = {
  fact_public_id: string;
  claim_text: string;
  status: 'verified';
  freshness: { verified_at: string; expires_at: string; fact_updated_at: string };
  topic_key: 'nature_science';
  signals: ['entity'];
  score_components: {
    exact_claim: number;
    exact_structured: number;
    fts: number;
    trigram: number;
    entity: number;
    numeric: number;
    qualifier: number;
  };
  material_identity: {
    subject_key: string;
    relation_key: string;
    object_key: string;
    numbers: [];
    qualifiers: { negated: false; comparison_direction: 'none' };
  };
  reuse_eligibility: 'eligible';
  used_on_page_public_ids: [];
};

export type MockCandidate = {
  candidate_key: CandidateKey;
  normalized_preview: string;
  matches: MockMatch[];
  review_required: boolean;
};

export type FullResponse = {
  response_schema_version: 1;
  data: { candidates: [MockCandidate] };
};

export type Delivery = {
  server: FullResponse;
  visible: {
    response_schema_version: 1;
    data: { candidates: [Partial<MockCandidate>] };
  };
  display_truncated: boolean;
};

const stamp = '2026-10-28T00:00:00.000000+00:00';
const match = (index: number): MockMatch => {
  const same = index === 1;
  return {
    fact_public_id: `00000000-0000-4000-8000-${String(index).padStart(12, '0')}`,
    claim_text: same ? 'Saturn is a gas giant.' : `Synthetic unrelated claim ${index}.`,
    status: 'verified',
    freshness: { verified_at: stamp, expires_at: stamp, fact_updated_at: stamp },
    topic_key: 'nature_science',
    signals: ['entity'],
    score_components: {
      exact_claim: 0,
      exact_structured: 0,
      fts: 0,
      trigram: 0,
      entity: 0,
      numeric: 0,
      qualifier: 0,
    },
    material_identity: {
      subject_key: same ? 'saturn' : `synthetic_subject_${index}`,
      relation_key: same ? 'is_classified_as' : 'has_named_part_or_property',
      object_key: same ? 'gas_giant' : `synthetic_property_${index}`,
      numbers: [],
      qualifiers: { negated: false, comparison_direction: 'none' },
    },
    reuse_eligibility: 'eligible',
    used_on_page_public_ids: [],
  };
};

const candidates: Record<CandidateKey, MockCandidate> = {
  ISSUE56_A: {
    candidate_key: 'ISSUE56_A',
    normalized_preview: 'A complete response needs no review.',
    matches: [],
    review_required: false,
  },
  ISSUE56_B: {
    candidate_key: 'ISSUE56_B',
    normalized_preview: 'Saturn is a gas giant.',
    matches: Array.from({ length: 20 }, (_, i) => match(i + 1)),
    review_required: true,
  },
  ISSUE56_C: {
    candidate_key: 'ISSUE56_C',
    normalized_preview: 'A second complete response needs no review.',
    matches: [],
    review_required: false,
  },
};

export const fullDelivery = (key: CandidateKey): Delivery => {
  const server: FullResponse = {
    response_schema_version: 1,
    data: { candidates: [structuredClone(candidates[key])] },
  };
  return { server, visible: structuredClone(server), display_truncated: false };
};

export const clippedDelivery = (): Delivery => {
  const delivery = fullDelivery('ISSUE56_B');
  delivery.visible = {
    response_schema_version: 1,
    data: {
      candidates: [
        {
          candidate_key: 'ISSUE56_B',
          normalized_preview: delivery.server.data.candidates[0].normalized_preview,
          matches: delivery.server.data.candidates[0].matches.slice(0, 3),
          // The host view ends before review_required and the remaining matches.
        },
      ],
    },
  };
  delivery.display_truncated = true;
  return delivery;
};

export type Scenario = {
  name: string;
  responses: Record<CandidateKey, Delivery[]>;
};

export const scenarios: Scenario[] = [
  {
    name: 'complete-no-retry',
    responses: {
      ISSUE56_A: [fullDelivery('ISSUE56_A')],
      ISSUE56_B: [fullDelivery('ISSUE56_B')],
      ISSUE56_C: [fullDelivery('ISSUE56_C')],
    },
  },
  {
    name: 'clipped-targeted-retry',
    responses: {
      ISSUE56_A: [fullDelivery('ISSUE56_A')],
      ISSUE56_B: [clippedDelivery(), fullDelivery('ISSUE56_B')],
      ISSUE56_C: [fullDelivery('ISSUE56_C')],
    },
  },
  {
    name: 'clipped-twice-hold',
    responses: {
      ISSUE56_A: [fullDelivery('ISSUE56_A')],
      ISSUE56_B: [clippedDelivery(), clippedDelivery()],
      ISSUE56_C: [fullDelivery('ISSUE56_C')],
    },
  },
];
