// CR-026 owner-approved fixed production pilot. Never take write arguments from the browser.
// Exact JSON was reviewed in Issue #8 comment #6235723905.
export const approvedPilotPayload = {
  "request_schema_version": 1,
  "workspace_public_id": "cad2885e-952e-41b3-9eae-d2d9d75d533d",
  "operation_key": "b9f08c05-ee8e-4adf-8fe4-6c863128b9f7",
  "name": "Phase 9.5 Pilot - Trivia",
  "slug": "phase-9-5-pilot-trivia",
  "timezone": "America/New_York",
  "target_markets": [
    "US"
  ],
  "niche_key": "trivia",
  "config_schema_version": 1,
  "config": {
    "style": {
      "tone": "conversational_credible",
      "emoji_allowed": false,
      "english_variant": "en-US",
      "regional_slang_allowed": false
    },
    "caption": {
      "max_chars": 500
    },
    "hashtags": {
      "max_count": 5,
      "min_count": 0,
      "default_count": 3
    },
    "profiles": {
      "fast_trivia": {
        "fact_count_max": 8,
        "fact_count_min": 7,
        "total_words_max": 85,
        "total_words_min": 65,
        "words_per_fact_max": 11,
        "words_per_fact_min": 8
      },
      "practical_utility": {
        "fact_count_max": 6,
        "fact_count_min": 5,
        "total_words_max": 85,
        "total_words_min": 65,
        "words_per_fact_max": 14,
        "words_per_fact_min": 10
      }
    },
    "fact_count": {
      "max": 9,
      "min": 5,
      "mode": "adaptive",
      "preferred": 7
    },
    "text_budget": {
      "cta_max_chars": 50,
      "fact_max_chars": 90,
      "hook_max_chars": 45,
      "canva_total_max_chars": 600,
      "facts_total_max_chars": 500
    },
    "render_style": "plain_lines",
    "allowed_topics": [
      "animals",
      "pet_safety",
      "food_science",
      "food_storage_home",
      "practical_utility",
      "human_body",
      "nature_science",
      "geography",
      "history_origins",
      "inventions_everyday",
      "general_trivia"
    ],
    "format_weights": {
      "comparison": 15,
      "myth_vs_fact": 10,
      "themed_utility": 20,
      "single_subject_fast": 35,
      "emotional_animal_collection": 20
    },
    "allowed_formats": [
      "single_subject_fast",
      "themed_utility",
      "emotional_animal_collection",
      "comparison",
      "myth_vs_fact"
    ],
    "fact_reuse_scope": "workspace_unique",
    "topic_group_weights": {
      "nature_space": 10,
      "places_geography": 15,
      "practical_utility": 15,
      "animals_pet_safety": 30,
      "human_body_food_myth": 20,
      "history_inventions_people": 10
    },
    "allowed_interaction_goals": [
      "share",
      "save",
      "comment",
      "follow"
    ]
  },
  "make_default": true
};
