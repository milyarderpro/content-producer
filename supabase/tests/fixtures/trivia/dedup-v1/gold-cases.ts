import { readFileSync } from 'node:fs';

export type DedupDecision = 'same' | 'distinct' | 'review_required';
export type TriviaCandidateFixture = {
  claim_text: string;
  subject_key: string;
  relation_key: string;
  object_key: string;
  numbers: Array<{ value: string; unit: string | null; role: string }>;
  qualifiers: Record<string, string | boolean | null>;
  topic_key: string;
};
export type GoldCase = {
  fixture_id: string;
  fixture_manifest_version: 2;
  normalization_version: 1;
  ontology_version: 1;
  split: 'development' | 'holdout';
  primary_category: 'exact' | 'paraphrase' | 'alias_unit' | 'anti_duplicate' | 'risky_review';
  secondary_tags: string[];
  left: TriviaCandidateFixture;
  right: TriviaCandidateFixture;
  expected_decision: DedupDecision;
  expected_signals: string[];
  material_differences: string[];
  rationale: string;
  provenance_dataset: 'curious_mind' | 'dyk' | 'daily_facts';
  provenance_record_ids: string[];
  reviewer: 'ai';
  review_status: 'ai_reviewed';
};

function assertGoldCase(value: unknown, index: number): asserts value is GoldCase {
  if (!value || typeof value !== 'object')
    throw new Error(`Gold case ${index + 1} is not an object.`);
  const item = value as Record<string, unknown>;
  const required = [
    'fixture_id',
    'fixture_manifest_version',
    'normalization_version',
    'ontology_version',
    'split',
    'primary_category',
    'secondary_tags',
    'left',
    'right',
    'expected_decision',
    'expected_signals',
    'material_differences',
    'rationale',
    'provenance_dataset',
    'provenance_record_ids',
    'reviewer',
    'review_status',
  ];
  if (required.some((key) => !(key in item)))
    throw new Error(`Gold case ${index + 1} has missing fields.`);
  if (
    item.fixture_manifest_version !== 2 ||
    item.normalization_version !== 1 ||
    item.ontology_version !== 1 ||
    !['development', 'holdout'].includes(item.split as string) ||
    !['exact', 'paraphrase', 'alias_unit', 'anti_duplicate', 'risky_review'].includes(
      item.primary_category as string,
    ) ||
    !['same', 'distinct', 'review_required'].includes(item.expected_decision as string) ||
    !['curious_mind', 'dyk', 'daily_facts'].includes(item.provenance_dataset as string) ||
    item.reviewer !== 'ai' ||
    item.review_status !== 'ai_reviewed'
  )
    throw new Error(`Gold case ${index + 1} has an invalid enum.`);
  for (const side of ['left', 'right']) {
    const candidate = item[side] as Record<string, unknown>;
    if (
      !candidate ||
      typeof candidate !== 'object' ||
      [
        'claim_text',
        'subject_key',
        'relation_key',
        'object_key',
        'numbers',
        'qualifiers',
        'topic_key',
      ].some((key) => !(key in candidate))
    )
      throw new Error(`Gold case ${index + 1} has an invalid ${side} candidate.`);
  }
  if (
    typeof item.rationale !== 'string' ||
    item.rationale.trim().length < 30 ||
    !Array.isArray(item.provenance_record_ids) ||
    item.provenance_record_ids.length === 0
  )
    throw new Error(`Gold case ${index + 1} has incomplete editorial evidence.`);
}

const fixtureText = readFileSync(new URL('./cases.v1.jsonl', import.meta.url), 'utf8').trim();
export const goldCases = fixtureText.split('\n').map((line, index) => {
  const parsed: unknown = JSON.parse(line);
  assertGoldCase(parsed, index);
  return parsed;
});
