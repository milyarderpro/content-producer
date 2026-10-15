import * as z from 'npm:zod@4.3.6';

const interactionGoal = z.enum(['share', 'save', 'comment', 'follow']);
const weight = z.number().int().min(0).max(100);
const profile = z.strictObject({
  fact_count_min: z.number().int().min(1).max(9),
  fact_count_max: z.number().int().min(1).max(9),
  words_per_fact_min: z.number().int().min(1).max(18),
  words_per_fact_max: z.number().int().min(1).max(18),
  total_words_min: z.number().int().min(1).max(500),
  total_words_max: z.number().int().min(1).max(500),
});

export const triviaConfig = z.strictObject({
  allowed_formats: z
    .array(
      z.enum([
        'single_subject_fast',
        'themed_utility',
        'emotional_animal_collection',
        'comparison',
        'myth_vs_fact',
      ]),
    )
    .min(1),
  format_weights: z.strictObject({
    single_subject_fast: weight,
    themed_utility: weight,
    emotional_animal_collection: weight,
    comparison: weight,
    myth_vs_fact: weight,
  }),
  allowed_topics: z
    .array(
      z.enum([
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
      ]),
    )
    .min(1),
  topic_group_weights: z.strictObject({
    animals_pet_safety: weight,
    human_body_food_myth: weight,
    practical_utility: weight,
    places_geography: weight,
    nature_space: weight,
    history_inventions_people: weight,
  }),
  fact_count: z.discriminatedUnion('mode', [
    z.strictObject({
      mode: z.literal('adaptive'),
      min: z.number().int().min(5).max(9),
      preferred: z.number().int().min(5).max(9),
      max: z.number().int().min(5).max(9),
    }),
    z.strictObject({
      mode: z.literal('fixed'),
      value: z.number().int().min(5).max(9),
    }),
  ]),
  profiles: z.strictObject({
    fast_trivia: profile,
    practical_utility: profile,
  }),
  fact_reuse_scope: z.enum(['workspace_unique', 'page_unique']),
  render_style: z.enum(['plain_lines', 'numbered']),
  allowed_interaction_goals: z.array(interactionGoal).min(1),
  text_budget: z.strictObject({
    hook_max_chars: z.number().int().min(1).max(90),
    fact_max_chars: z.number().int().min(1).max(90),
    facts_total_max_chars: z.number().int().min(1).max(500),
    cta_max_chars: z.number().int().min(1).max(100),
    canva_total_max_chars: z.number().int().min(1).max(600),
  }),
  caption: z.strictObject({
    max_chars: z.number().int().min(1).max(500),
  }),
  hashtags: z.strictObject({
    default_count: z.number().int().min(0).max(5),
    min_count: z.number().int().min(0).max(5),
    max_count: z.number().int().min(0).max(5),
  }),
  style: z.strictObject({
    english_variant: z.literal('en-US'),
    tone: z.literal('conversational_credible'),
    emoji_allowed: z.literal(false),
    regional_slang_allowed: z.literal(false),
  }),
});

export const triviaPlanItemConfig = z
  .strictObject({
    profile_key: z.enum(['fast_trivia', 'practical_utility']).optional(),
    fact_count: triviaConfig.shape.fact_count.optional(),
    render_style: triviaConfig.shape.render_style.optional(),
    text_budget: z
      .strictObject({
        hook_max_chars: triviaConfig.shape.text_budget.shape.hook_max_chars.optional(),
        fact_max_chars: triviaConfig.shape.text_budget.shape.fact_max_chars.optional(),
        facts_total_max_chars:
          triviaConfig.shape.text_budget.shape.facts_total_max_chars.optional(),
        cta_max_chars: triviaConfig.shape.text_budget.shape.cta_max_chars.optional(),
        canva_total_max_chars:
          triviaConfig.shape.text_budget.shape.canva_total_max_chars.optional(),
      })
      .optional(),
    caption: z
      .strictObject({
        max_chars: triviaConfig.shape.caption.shape.max_chars.optional(),
      })
      .optional(),
    hashtags: z
      .strictObject({
        default_count: triviaConfig.shape.hashtags.shape.default_count.optional(),
        min_count: triviaConfig.shape.hashtags.shape.min_count.optional(),
        max_count: triviaConfig.shape.hashtags.shape.max_count.optional(),
      })
      .optional(),
  })
  .refine(
    (value) => new TextEncoder().encode(JSON.stringify(value)).length <= 8 * 1024,
    'item_config must be at most 8 KiB',
  );

export const workspaceSettings = z.strictObject({
  schema_version: z.literal(1),
  reservation_ttl_minutes: z.number().int().min(5).max(120),
  default_post_status: z.literal('draft'),
  default_plan_chunk_size: z.number().int().min(1).max(5),
});
