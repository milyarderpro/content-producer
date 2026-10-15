// Phase 6.7: trivia facades; the Phase 5 public RPCs own semantic review, locks and ledger.
import * as z from 'npm:zod@4.3.6';
import type { McpServer } from '@modelcontextprotocol/server';
import type { RequestContext } from './auth.ts';
import { invoke } from './foundation.ts';
import { safeDetail } from './plan_claim.ts';

const uuid = z
  .string()
  .regex(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
const timestamp = z.string().datetime({ offset: true });
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const topic = z.enum([
  'animals',
  'pet_safety',
  'food_science',
  'food_storage_home',
  'practical_utility',
  'human_body',
  'nature_science',
  'geography',
  'history_origins',
  'inventions_everyday',
  'general_trivia',
]);
const qualifier = z.strictObject({
  negated: z.boolean(),
  comparison_direction: z.string().min(1).max(80).optional(),
  time: z.string().min(1).max(300).nullable().optional(),
  location: z.string().min(1).max(300).nullable().optional(),
  population: z.string().min(1).max(300).nullable().optional(),
  condition: z.string().min(1).max(300).nullable().optional(),
  method: z.string().min(1).max(300).nullable().optional(),
  scope: z.string().min(1).max(300).nullable().optional(),
  estimate: z.boolean().optional(),
});
const number = z.strictObject({
  value: z
    .string()
    .regex(/^-?(?:0|[1-9]\d*)(?:\.\d+)?$/)
    .max(80),
  unit: z.string().min(1).max(80).nullable(),
  role: z.string().min(1).max(80),
});
export const candidate = z.strictObject({
  candidate_key: z.string().regex(/^[A-Za-z0-9_-]{1,64}$/),
  claim_text: z.string().trim().min(1).max(500),
  subject_key: z.string().trim().min(1).max(120),
  relation_key: z.string().trim().min(1).max(120),
  object_key: z.string().trim().min(1).max(300),
  numbers: z.array(number).max(10),
  qualifiers: qualifier,
  topic_key: topic,
  normalization_version: z.literal(1),
  ontology_version: z.literal(1),
});
const difference = z.enum([
  'relation',
  'negation',
  'number',
  'unit',
  'time',
  'location',
  'population',
  'condition',
  'comparison_direction',
  'method',
  'scope',
  'other',
]);
const review = z
  .strictObject({
    candidate_fact_public_id: uuid.optional(),
    decision: z.enum(['same', 'distinct']),
    reason: z.string().trim().min(1).max(500),
    material_differences: z.array(difference).max(10),
  })
  .refine((d) => d.decision !== 'same' || d.candidate_fact_public_id !== undefined);
export const source = z.strictObject({
  schema_version: z.literal(1),
  url: z.url().startsWith('https://').max(2048),
  canonical_url: z.url().startsWith('https://').max(2048),
  title: z.string().trim().min(1).max(300),
  publisher: z.string().trim().min(1).max(200),
  tier: z.enum(['A', 'B', 'C', 'D']),
  source_type: z.enum([
    'official',
    'primary_paper',
    'dataset',
    'museum',
    'professional_association',
    'reputable_reference',
    'review_paper',
    'reputable_secondary',
    'social',
    'aggregator',
    'other',
  ]),
  accessed_at: timestamp,
  published_at: date.nullable().optional(),
  updated_at: date.nullable().optional(),
  as_of: z.string().max(100).nullable().optional(),
  language: z.string().min(1).max(35),
  supports: z.string().trim().min(1).max(500),
  independence_group: z.string().trim().min(1).max(120),
});
const fact = z.strictObject({
  position: z.number().int().min(1).max(9),
  candidate,
  dedup_reviews: z.array(review),
  sources: z.array(source).min(1).max(8),
  freshness_class: z.enum(['stable', 'periodic', 'volatile']),
  as_of_date: date.nullable(),
  requested_expires_at: timestamp,
  risk_class: z.enum(['standard', 'sensitive']),
  verification_note: z.string().trim().min(1).max(1000),
});
const common = { request_schema_version: z.literal(1), workspace_public_id: uuid };
const write = { ...common, operation_key: uuid };
const findInput = z
  .strictObject({
    ...common,
    page_public_id: uuid,
    candidates: z.array(candidate).min(1).max(9),
    max_matches_per_candidate: z.number().int().min(1).max(20).optional(),
  })
  .refine((x) => new Set(x.candidates.map((c) => c.candidate_key)).size === x.candidates.length);
const reserveInput = z
  .strictObject({
    ...write,
    page_public_id: uuid,
    reservation_token: uuid,
    expected_config_updated_at: timestamp,
    fact_reuse_scope: z.enum(['workspace_unique', 'page_unique']),
    reservation_ttl_minutes: z.number().int().min(5).max(120),
    facts: z.array(fact).min(1).max(9),
  })
  .refine(
    (x) =>
      x.facts.every((f, i) => f.position === i + 1) &&
      new Set(x.facts.map((f) => f.candidate.candidate_key)).size === x.facts.length,
  );
const releaseInput = z.strictObject({
  ...write,
  page_public_id: uuid,
  reservation_token: uuid,
  reason: safeDetail,
});
const envelope = <T extends z.ZodType>(data: T) =>
  z.strictObject({ response_schema_version: z.literal(1), data });
const signals = z.enum([
  'exact_claim',
  'exact_structured',
  'fts',
  'trigram',
  'entity',
  'numeric',
  'qualifier',
  'source_overlap',
]);
const score = z.strictObject({
  exact_claim: z.number(),
  exact_structured: z.number(),
  fts: z.number(),
  trigram: z.number(),
  entity: z.number(),
  numeric: z.number(),
  qualifier: z.number(),
  source_overlap: z.number().optional(),
});
const match = z.strictObject({
  fact_public_id: uuid,
  claim_text: z.string().min(1).max(500),
  status: z.enum(['needs_review', 'verified', 'rejected', 'invalidated', 'superseded']),
  freshness: z.strictObject({
    verified_at: timestamp.nullable(),
    expires_at: timestamp.nullable(),
    fact_updated_at: timestamp,
  }),
  topic_key: topic,
  signals: z.array(signals),
  score_components: score,
  material_identity: z.strictObject({
    subject_key: z.string(),
    relation_key: z.string(),
    object_key: z.string(),
    numbers: z.array(number).max(10),
    qualifiers: qualifier,
  }),
  reuse_eligibility: z.enum([
    'eligible',
    'page_blocked',
    'workspace_blocked',
    'actively_reserved',
    'not_eligible',
  ]),
  used_on_page_public_ids: z.array(uuid).max(50),
});
const findOutput = envelope(
  z.strictObject({
    candidates: z
      .array(
        z.strictObject({
          candidate_key: z.string().min(1).max(64),
          normalized_preview: z.string().max(500),
          matches: z.array(match).max(20),
          review_required: z.boolean(),
        }),
      )
      .min(1)
      .max(9),
  }),
);
const reserveOutput = envelope(
  z.strictObject({
    reservation_token: uuid,
    page_public_id: uuid,
    fact_reuse_scope: z.enum(['workspace_unique', 'page_unique']),
    reserved_until: timestamp,
    facts: z
      .array(
        z.strictObject({
          position: z.number().int().min(1).max(9),
          fact_public_id: uuid,
          canonical_claim: z.string().min(1).max(500),
          canonical_action: z.enum(['matched_existing', 'created_new', 'refreshed_existing']),
          verification_status: z.literal('verified'),
          expires_at: timestamp,
        }),
      )
      .min(1)
      .max(9),
    replayed: z.boolean(),
  }),
);
const releaseOutput = envelope(
  z.strictObject({
    released_fact_public_ids: z.array(uuid).max(9),
    already_inactive_count: z.number().int().min(0).max(9),
    replayed: z.boolean(),
  }),
);
const securitySchemes = [{ type: 'oauth2', scopes: ['openid', 'email'] }];
export const TRIVIA_FACT_TOOL_NAMES = [
  'trivia_find_similar_facts',
  'trivia_register_and_reserve_facts',
  'trivia_release_facts',
] as const;
export function registerTriviaFactTools(server: McpServer, context?: RequestContext): void {
  if (!context) return;
  const scoped = context;
  server.registerTool(
    'trivia_find_similar_facts',
    {
      title: 'Find similar trivia facts',
      description:
        'Use this after researching atomic candidate claims and before registering them. It returns exact, structured, and ranked semantic-review candidates plus reuse signals; it never decides paraphrase equivalence by itself.',
      inputSchema: findInput,
      outputSchema: findOutput,
      annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
      _meta: { securitySchemes },
    },
    (args) =>
      invoke(
        'trivia_find_similar_facts',
        scoped,
        {
          p_request_schema_version: args.request_schema_version,
          p_workspace_public_id: args.workspace_public_id,
          p_page_public_id: args.page_public_id,
          p_candidates: args.candidates,
          p_max_matches_per_candidate: args.max_matches_per_candidate ?? 10,
        },
        findOutput,
      ),
  );
  server.registerTool(
    'trivia_register_and_reserve_facts',
    {
      title: 'Register and reserve trivia facts',
      description:
        'Use this only after source verification and semantic dedup review. It atomically reuses or creates canonical facts and reserves the exact ordered set for one Page and one future post.',
      inputSchema: reserveInput,
      outputSchema: reserveOutput,
      annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
      _meta: { securitySchemes },
    },
    (args) =>
      invoke(
        'trivia_register_and_reserve_facts',
        scoped,
        {
          p_request_schema_version: args.request_schema_version,
          p_workspace_public_id: args.workspace_public_id,
          p_operation_key: args.operation_key,
          p_page_public_id: args.page_public_id,
          p_reservation_token: args.reservation_token,
          p_expected_config_updated_at: args.expected_config_updated_at,
          p_fact_reuse_scope: args.fact_reuse_scope,
          p_reservation_ttl_minutes: args.reservation_ttl_minutes,
          p_facts: args.facts,
        },
        reserveOutput,
      ),
  );
  server.registerTool(
    'trivia_release_facts',
    {
      title: 'Release reserved trivia facts',
      description:
        'Use this when a draft attempt is abandoned before save. It idempotently releases only facts still owned by the supplied reservation token; it never releases allocated or published facts.',
      inputSchema: releaseInput,
      outputSchema: releaseOutput,
      annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
      _meta: { securitySchemes },
    },
    (args) =>
      invoke(
        'trivia_release_facts',
        scoped,
        {
          p_request_schema_version: args.request_schema_version,
          p_workspace_public_id: args.workspace_public_id,
          p_operation_key: args.operation_key,
          p_page_public_id: args.page_public_id,
          p_reservation_token: args.reservation_token,
          p_reason: args.reason,
        },
        releaseOutput,
      ),
  );
}
