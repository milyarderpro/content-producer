import { existsSync, readFileSync, realpathSync } from 'node:fs';
import { dirname, join, resolve, sep } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = join(process.cwd(), 'plugin', 'skills', 'content-producer');
const niche = 'references/niches/trivia/';
const names = [
  'content-dna.md',
  'formats.md',
  'fact-checking.md',
  'dedup-ontology.md',
  'quality-rubric.md',
] as const;
const read = (path: string) => readFileSync(join(root, path), 'utf8');
const cases = (source: string) =>
  new Map(
    Array.from(source.matchAll(/^- `([A-Z]+-\d{2})` \| ([^\n]+)$/gm), (match) => {
      const fields = match[2].split(' | ');
      const outcome = fields.find((field) =>
        /^(ALLOW_WITH_VERIFICATION|SAME|DISTINCT|UNCERTAIN|HOLD|REVISE|REJECT)$/.test(field),
      );
      return [match[1], outcome] as const;
    }),
  );

describe('Phase 7.3 trivia editorial reference contract', () => {
  it('links all five niche documents from the skill, with contained valid cross-links', () => {
    const skill = read('SKILL.md');
    for (const name of names) {
      expect(skill).toContain('(' + niche + name + ')');
    }
    for (const path of ['SKILL.md', ...names.map((name) => niche + name)]) {
      const content = read(path);
      const parent = dirname(join(root, path));
      for (const match of content.matchAll(/\]\(([^)#]+\.md)(?:#[^)]*)?\)/g)) {
        const target = resolve(parent, match[1]);
        expect(target.startsWith(resolve(root) + sep)).toBe(true);
        expect(existsSync(target)).toBe(true);
        expect(realpathSync(target).startsWith(realpathSync(root) + sep)).toBe(true);
      }
    }
  });

  it('preserves exactly five frozen format keys and both profiles', () => {
    const formats = read(niche + 'formats.md');
    const frozen = readFileSync(join(process.cwd(), 'plans', 'trivia-content-dna.md'), 'utf8');
    const keys = [
      'single_subject_fast',
      'themed_utility',
      'emotional_animal_collection',
      'comparison',
      'myth_vs_fact',
    ];
    const headings = Array.from(formats.matchAll(/^### `([a-z_]+)`$/gm), (match) => match[1]);
    expect(headings).toEqual(keys);
    for (const key of keys) {
      expect(frozen).toContain(`### 8.${keys.indexOf(key) + 1} \`${key}\``);
    }
    for (const profile of ['fast_trivia', 'practical_utility']) {
      expect(formats).toContain(profile);
      expect(frozen).toContain(profile);
    }
    for (const budget of [
      '18 words/fact',
      '12 in hook',
      '14 in CTA',
      '100 Canva words',
      '28 estimated visual lines',
      'replay_ratio',
      'estimated_loops',
      '600',
      '500',
    ]) {
      expect(formats).toContain(budget);
    }
  });

  it('preserves niche style, topic inventory, anti-copying and evidence policy', () => {
    const dna = read(niche + 'content-dna.md');
    const evidence = read(niche + 'fact-checking.md');
    for (const topic of [
      'animals',
      'pet_safety',
      'human_body',
      'food_science',
      'food_storage_home',
      'practical_utility',
      'geography',
      'nature_science',
      'history_origins',
      'inventions_everyday',
      'general_trivia',
    ]) {
      expect(dna).toContain(String.fromCharCode(96) + topic + String.fromCharCode(96));
    }
    for (const term of ['en-US', 'conversational_credible', '176', 'not', 'approval']) {
      expect(dna.toLowerCase()).toContain(term.toLowerCase());
    }
    for (const evidenceRule of [
      'required_per_item',
      'one A or B',
      'one A plus independent A/B',
      '24 months',
      '12 months',
      '30 days',
      '90 days',
      '180 days',
      'independence_group',
      'as_of_date',
      'Tier D',
    ]) {
      expect(evidence).toContain(evidenceRule);
    }
    expect(evidence).toContain('trivia_reverify_fact');
    expect(evidence).toContain('trivia_correct_fact');
  });

  it('requires a structured evidence check before trivia reservation without rejecting one valid B source', () => {
    const evidence = read(niche + 'fact-checking.md');
    const sequence = read('references/core/tool-sequences.md');
    const flow = sequence.split('Single trivia post: ')[1]!.split('\n')[0]!;
    const beforeReserve = flow.split(' → trivia_register_and_reserve_facts')[0];
    expect(beforeReserve).toContain('check the complete structured evidence packet');
    for (const rule of [
      'literal HTTPS `url` and `canonical_url`',
      '`published_at`, `updated_at`, or source `as_of`, use `null`',
      'Pair `tier` with `source_type` exactly',
      'One valid Tier B source is enough for a `stable` + `standard` fact',
      '`sensitive` fact needs a Tier A source and two distinct',
      '`periodic` and `volatile` facts require a non-null fact-level `as_of_date`',
      '`holds_record_by_metric_as_of`',
      'hold that fact before the write',
    ]) {
      expect(evidence).toContain(rule);
    }
  });

  it('routes weak sources, stale records and sensitive claims away from approval', () => {
    const seen = cases(read(niche + 'fact-checking.md'));
    expect(seen.size).toBe(7);
    expect(seen.get('SRC-01')).toBe('REJECT');
    expect(seen.get('SRC-02')).toBe('HOLD');
    expect(seen.get('SRC-03')).toBe('HOLD');
    expect(seen.get('SRC-04')).toBe('REVISE');
    expect(seen.get('SRC-05')).toBe('REJECT');
    expect(seen.get('SRC-06')).toBe('REJECT');
    expect(seen.get('SRC-07')).toBe('ALLOW_WITH_VERIFICATION');
  });

  it('distinguishes paraphrase, anti-duplicate qualifiers and uncertainty', () => {
    const text = read(niche + 'dedup-ontology.md');
    const seen = cases(text);
    expect(seen.size).toBe(7);
    expect(seen.get('DUP-01')).toBe('SAME');
    expect(seen.get('DUP-02')).toBe('DISTINCT');
    expect(seen.get('DUP-03')).toBe('DISTINCT');
    expect(seen.get('DUP-04')).toBe('DISTINCT');
    expect(seen.get('DUP-05')).toBe('DISTINCT');
    expect(seen.get('DUP-06')).toBe('UNCERTAIN');
    expect(seen.get('DUP-07')).toBe('SAME');
    expect(text).toContain('trivia_find_similar_facts');
    expect(text).toContain('trivia_register_and_reserve_facts');
    expect(text).toContain('must **not be registered/reserved**');
    for (const relation of [
      'has_count',
      'has_measurement',
      'is_classified_as',
      'is_located_in',
      'originated_in_time_place',
      'has_named_part_or_property',
      'holds_record_by_metric_as_of',
      'can_perform',
      'behaves_as',
      'communicates_by',
      'affects',
      'causes',
      'reduces_or_increases_risk',
      'is_safe_or_toxic_for',
      'recommended_practice',
      'is_illegal_or_required_in',
      'is_best_or_safest',
    ]) {
      expect(text).toContain('`' + relation + '`');
    }
    expect(text).toContain('greets_via_trunk_touch');
    expect(text).toContain('do not assert');
    expect(text).toContain('**Do not** change a');
  });

  it('handles all formats, mismatched hooks, CTA pressure and critical quality failures', () => {
    const formatCases = cases(read(niche + 'formats.md'));
    expect(formatCases.size).toBe(7);
    for (let i = 1; i <= 5; i++) {
      expect(formatCases.get('FMT-0' + i)).toBe('ALLOW_WITH_VERIFICATION');
    }
    expect(formatCases.get('FMT-06')).toBe('REVISE');
    expect(formatCases.get('FMT-07')).toBe('REVISE');

    const rubric = read(niche + 'quality-rubric.md');
    const seen = cases(rubric);
    expect(seen.size).toBe(9);
    for (const [id, decision] of [
      ['QUAL-01', 'REJECT'],
      ['QUAL-02', 'HOLD'],
      ['QUAL-03', 'REJECT'],
      ['QUAL-04', 'REVISE'],
      ['QUAL-05', 'REVISE'],
      ['QUAL-06', 'REVISE'],
      ['QUAL-07', 'REVISE'],
      ['QUAL-08', 'HOLD'],
      ['QUAL-09', 'ALLOW_WITH_VERIFICATION'],
    ]) {
      expect(seen.get(id)).toBe(decision);
    }
    for (const criterion of [
      'trivia.meaning_preserved',
      'trivia.source_supported',
      'trivia.time_context_valid',
      'trivia.safety_appropriate',
      'trivia.caption_no_new_claim',
      'trivia.substantial_copying_absent',
    ]) {
      expect(rubric).toContain(criterion);
    }
    expect(rubric).toContain('content_hash');
    expect(rubric).toContain('express owner approval');
    expect(rubric).toContain('server');
  });
});
