// CR-062: bounded transport shapes. Catalog lookup, precedence and permission stay in RPCs.
import * as z from 'npm:zod@4.3.6';
export const editorialKey = z.string().regex(/^[a-z][a-z0-9_]{1,49}$/);
export const editorialHash = z.string().regex(/^[0-9a-f]{64}$/);
export const editorialTime = z.string().datetime({ offset: true }).regex(
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{6}(Z|[+-]\d{2}:\d{2})$/,
);
const integer = (max: number, min = 1) => z.number().int().min(min).max(max);
// Zod 4.3.6 string.max counts UTF-16 units; SQL budgets count Unicode code points.
export const unicodeText = (max: number, min = 1) =>
  z.string().regex(new RegExp('^[\\s\\S]{' + min + ',' + max + '}$', 'u'));
// Validate the normalized post length without changing the caller payload.
// Raw transport stays bounded; canonicalization and all rendering remain SQL.
export const postInputText = (max: number, min = 1) =>
  z.string().max(16384).refine((value) => {
    const normalized = value.normalize('NFC').replaceAll('\r\n', '\n').replace(/ +\n/g, '\n')
      .trim();
    const length = Array.from(normalized).length;
    return length >= min && length <= max;
  }, `Use ${min}–${max} Unicode code points after server NFC/LF normalization`).describe(
    `Text: ${min}–${max} Unicode code points after server NFC/LF normalization; payload is passed unchanged.`,
  );
const text = unicodeText;
const strings = (max: number, chars: number, min = 0) => z.array(text(chars)).min(min).max(max);
export const editorialReference = z.strictObject({
  public_id: z.string().uuid({ version: 'v4' }),
  version: integer(2147483647),
  hash: editorialHash,
});
export const architecture = z.enum(['single_subject', 'themed', 'mixed']);
export const countConfig2 = z.discriminatedUnion('mode', [
  z.strictObject({ mode: z.literal('fixed'), value: integer(12) }),
  z.strictObject({
    mode: z.literal('adaptive'),
    min: integer(12),
    preferred: integer(12),
    max: integer(12),
  }),
]);
const countPreference = z.strictObject({
  min: integer(12),
  preferred: integer(12),
  max: integer(12),
});
export const budgetConfig2 = z.strictObject({
  hook_max_chars: integer(120),
  fact_max_chars: integer(160),
  facts_total_max_chars: integer(900),
  cta_max_chars: integer(180),
  canva_total_max_chars: integer(1100),
  hook_max_words: integer(18),
  fact_max_words: integer(30),
  cta_max_words: integer(32),
  canva_total_max_words: integer(160),
});
const densityValue = z.strictObject({
  fact_count_min: integer(12),
  fact_count_max: integer(12),
  words_per_fact_min: integer(30),
  words_per_fact_max: integer(30),
  total_words_min: integer(160),
  total_words_max: integer(160),
});
const map = <T extends z.ZodType>(value: T, max: number, min = 1) =>
  z.record(editorialKey, value).refine(
    (v) => Object.keys(v).length >= min && Object.keys(v).length <= max,
    'Map size exceeds its contract',
  );
export const densityMap = map(densityValue, 16);
export const editorialWeights = map(integer(100, 0), 128);
const caption = z.strictObject({ max_chars: integer(500) });
const hashtags = z.strictObject({
  min_count: integer(5, 0),
  default_count: integer(5, 0),
  max_count: integer(5, 0),
});
const reuse = z.enum(['workspace_unique', 'page_unique']);
const layout = z.enum(['plain_lines', 'numbered']);
const guidance = strings(24, 1000, 1);
const casing = z.enum(['uppercase', 'sentence_case', 'as_written']);
const units = z.enum(['contextual', 'us_customary', 'metric', 'dual_when_useful']);
const emoji = z.enum(['forbidden', 'optional']);
const ctaGuidance = z.strictObject({ guidance: text(2000), examples: strings(16, 180) });
const style = z.strictObject({
  hook_templates: strings(16, 120, 1),
  hook_casing: casing,
  voice: text(2000),
  units_preference: units,
  cta_guidance: ctaGuidance,
  emoji_policy: emoji,
});
export const planOverrideConfig2 = z.strictObject({
  profile_key: editorialKey.optional(),
  fact_count: countConfig2.optional(),
  render_style: layout.optional(),
  text_budget: budgetConfig2.partial().optional(),
  caption: caption.optional(),
  hashtags: hashtags.optional(),
}).refine(
  (v) => new TextEncoder().encode(JSON.stringify(v)).length <= 8192,
  'item_config exceeds 8 KiB',
);
export const triviaConfig2 = z.strictObject({
  config_schema_version: z.literal(2),
  editorial_profile_ref: editorialReference,
  allowed_format_refs: z.array(editorialReference).min(1).max(128).optional(),
  allowed_topic_refs: z.array(editorialReference).min(1).max(128).optional(),
  format_weights: editorialWeights.optional(),
  topic_weights: editorialWeights.optional(),
  fact_reuse_scope: reuse.optional(),
  overrides: z.strictObject({
    fact_count: countConfig2.optional(),
    text_budget: budgetConfig2.partial().optional(),
    render_style: layout.optional(),
    style: style.partial().optional(),
    density_preferences: densityMap.optional(),
    caption: caption.optional(),
    hashtags: hashtags.optional(),
  }).optional(),
}).refine(
  (v) => new TextEncoder().encode(JSON.stringify(v)).length <= 65536,
  'config exceeds 64 KiB',
);
const example = z.strictObject({
  kind: z.enum(['positive', 'anti']),
  text: text(2000),
  note: text(1000),
  source_ref: text(200),
});
const baseDefinition = {
  definition_schema_version: z.literal(1),
  display_name: text(120),
  description: text(2000),
  provenance: z.strictObject({ basis: text(1000), references: strings(32, 200) }),
  notes: strings(16, 1000),
  examples: z.array(example).max(16),
};
export const formatDefinition = z.strictObject({
  ...baseDefinition,
  content_structure: z.literal('trivia_card_v2'),
  architectures: z.array(architecture).min(1).max(3),
  mechanisms: z.array(editorialKey).min(1).max(16),
  reader_benefits: z.array(editorialKey).min(1).max(16),
  density_preferences: densityMap,
  selection_guidance: guidance,
  ordering_guidance: guidance,
});
export const topicDefinition = z.strictObject({
  ...baseDefinition,
  scope: text(2000),
  subject_examples: strings(32, 160),
  group_key: editorialKey,
});
export const profileDefinition = z.strictObject({
  ...baseDefinition,
  format_refs: z.array(editorialReference).min(1).max(128),
  topic_refs: z.array(editorialReference).min(1).max(128),
  format_weights: editorialWeights,
  topic_weights: editorialWeights,
  density_preferences: densityMap,
  fact_count: countPreference,
  ...style.shape,
  default_limits: budgetConfig2,
  selection_guidance: guidance,
  ordering_guidance: guidance,
});
const projection = {
  reference: editorialReference,
  key: editorialKey,
  definition_schema_version: z.literal(1),
  status: z.enum(['active', 'retired']),
  created_at: editorialTime,
  retired_at: editorialTime.nullable(),
  retirement_reason: text(500).nullable(),
  examples_complete: z.boolean(),
};
export const editorialDefinition = z.discriminatedUnion('kind', [
  z.strictObject({
    ...projection,
    kind: z.literal('format'),
    payload: formatDefinition.extend({ examples: baseDefinition.examples.optional() }),
  }),
  z.strictObject({
    ...projection,
    kind: z.literal('topic'),
    payload: topicDefinition.extend({ examples: baseDefinition.examples.optional() }),
  }),
  z.strictObject({
    ...projection,
    kind: z.literal('profile'),
    payload: profileDefinition.extend({ examples: baseDefinition.examples.optional() }),
  }),
]);
export const editorialRules = z.strictObject({
  config_schema_version: z.literal(2),
  editorial_profile_ref: editorialReference,
  format_reference: editorialReference.nullable(),
  allowed_formats: z.array(editorialKey).min(1).max(128),
  allowed_topics: z.array(editorialKey).min(1).max(128),
  format_weights: editorialWeights,
  topic_weights: editorialWeights,
  fact_count: countConfig2,
  text_budget: budgetConfig2,
  caption,
  hashtags,
  render_style: layout,
  fact_reuse_scope: reuse,
  locale: z.literal('en-US'),
  english_variant: z.literal('en-US'),
  hard_limits: z.strictObject({
    fact_count: countConfig2,
    text_budget: budgetConfig2,
    emoji_policy: emoji,
    caption,
    hashtags,
  }),
  preferences: style.extend({
    fact_count: countPreference,
    density_preferences: map(densityValue, 32),
    selection_guidance: guidance,
    ordering_guidance: guidance,
  }),
  profile_key: editorialKey.nullable(),
  format_guidance: formatDefinition.omit({ examples: true, density_preferences: true }).nullable(),
});
export const generationEditorialContext = z.strictObject({
  editorial_profile_ref: editorialReference,
  effective_rules_hash: editorialHash,
  profile: editorialDefinition.options[2],
  format_references: z.array(editorialReference).min(1).max(128),
  topic_references: z.array(editorialReference).min(1).max(128),
  definitions_complete: z.boolean(),
  examples_complete: z.boolean(),
  read_guidance: text(2000),
});
// Labels describe supplied metadata, never classify CTA text or restrict combinations.
export const ctaActions = z.array(text(80)).refine(
  (v) => new TextEncoder().encode(JSON.stringify(v)).length <= 4096,
  'CTA metadata exceeds 4 KiB',
).nullable();
export const postEditorialContext = z.strictObject({
  editorial_profile_ref: editorialReference,
  format_ref: editorialReference,
  topic_ref: editorialReference,
  architecture,
  profile_key: editorialKey.nullable(),
  effective_rules_hash: editorialHash,
  cta_actions: ctaActions.optional(),
});
export const ctaPlacement = z.discriminatedUnion('kind', [
  z.strictObject({ kind: z.literal('after_facts') }),
  z.strictObject({ kind: z.literal('after_fact'), position: integer(12) }),
]);
const intentGoal = z.enum(['share', 'save', 'comment', 'follow']).nullable();
export const postPlanContext = z.strictObject({
  plan_public_id: z.string().uuid(),
  plan_item_public_id: z.string().uuid(),
  item_config: planOverrideConfig2,
  intent_goal: intentGoal,
});
export const readPlanContext = postPlanContext.extend({
  status: z.enum(['pending', 'in_progress', 'completed', 'failed', 'cancelled']),
  plan_intent: text(1000),
  requires_review: z.boolean(),
  completed_historical: z.boolean(),
});
export const planPageReview = z.strictObject({
  plan_config_updated_at: editorialTime.nullable(),
  current_config_updated_at: editorialTime,
  requires_review: z.boolean(),
  completed_historical_count: z.number().int().min(0).max(100),
});
const definitionIdentity = z.strictObject({
  reference: editorialReference,
  key: editorialKey,
  definition_schema_version: z.literal(1),
});
export const editorialSnapshot = z.strictObject({
  schema_version: z.literal(3),
  content_schema_version: z.literal(2),
  config_schema_version: z.literal(2),
  config_public_id: z.string().uuid(),
  config_updated_at: editorialTime,
  fact_count: countConfig2,
  fact_count_applied: integer(12),
  text_budget: budgetConfig2,
  fact_reuse_scope: reuse,
  profile_key: editorialKey.nullable(),
  render_style: layout,
  target_markets: z.array(z.string().regex(/^[A-Z]{2}$/)).min(1).max(8),
  locale: z.literal('en-US'),
  line_width_chars: z.literal(34),
  target_video_seconds: z.literal(13),
  estimator_version: z.literal(1),
  editorial_context: postEditorialContext,
  editorial_definitions: z.strictObject({
    profile: definitionIdentity,
    format: definitionIdentity,
    topic: definitionIdentity.extend({ payload: topicDefinition.omit({ examples: true }) }),
  }),
  effective_rules: editorialRules,
  effective_rules_hash: editorialHash,
  cta: z.strictObject({ text: text(180), placement: ctaPlacement, actions: ctaActions }),
  plan_context: postPlanContext.optional(),
});
