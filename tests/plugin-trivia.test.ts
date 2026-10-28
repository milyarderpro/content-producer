import { existsSync, readFileSync, realpathSync } from 'node:fs';
import { dirname, join, resolve, sep } from 'node:path';
import { describe, expect, it } from 'vitest';
import { candidateKeys, scenarios, type Scenario } from './fixtures/issue-56-dedup-recovery.js';

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
      'Total estimated visual lines remain a server-reported metric',
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

  it('handles a complete no-review response without manufacturing semantic decisions', () => {
    const text = read(niche + 'dedup-ontology.md');
    const sequence = read('references/core/tool-sequences.md');
    const skill = read('SKILL.md');
    expect(skill).toContain('one proposed fact at a time with `max_matches_per_candidate: 20`');
    expect(text).toContain('**one proposed fact per READ**');
    expect(text).toContain('returns that one `candidate_key`');
    expect(text).toContain('`review_required` plus every returned match');
    expect(text).toContain('`review_required: false` and no candidate needs an explicit decision');
    expect(sequence).toContain('one fact per READ at `max_matches_per_candidate: 20`');
  });

  it('continues a clipped batch with targeted READs and holds an uninspectable fact before Write', () => {
    const text = read(niche + 'dedup-ontology.md');
    const sequence = read('references/core/tool-sequences.md');
    expect(text).toContain('narrower default of 10');
    expect(text).toContain('one-candidate follow-up READs for **every** unresolved position');
    expect(text).toContain("repeat only that same candidate's READ once");
    expect(text).toContain('hold the entire ordered set before Write');
    expect(text).toContain('Never lower `max_matches_per_candidate`');
    expect(text).toContain('Do not stop the workflow merely because the initial batch was long');
    expect(text).toContain('**not** a no-match result');
    expect(sequence).toContain('targeted one-fact READ for every unresolved position');
  });

  it('packages mandatory same-workflow recovery before HOLD for Issue #56 fixtures', () => {
    // These are source-instruction assertions and local mock views, not a host AI test.
    const unresolvedFirstView = (scenario: Scenario) =>
      candidateKeys.filter((key) => {
        const delivery = scenario.responses[key][0];
        const visible = delivery.visible.data.candidates[0];
        return delivery.display_truncated || typeof visible.review_required !== 'boolean';
      });
    expect(unresolvedFirstView(scenarios[0])).toEqual([]);
    expect(unresolvedFirstView(scenarios[1])).toEqual(['ISSUE56_B']);
    expect(unresolvedFirstView(scenarios[2])).toEqual(['ISSUE56_B']);
    expect(scenarios[1].responses.ISSUE56_B[1].display_truncated).toBe(false);
    expect(scenarios[2].responses.ISSUE56_B[1].display_truncated).toBe(true);

    const skill = read('SKILL.md');
    const ontology = read(niche + 'dedup-ontology.md');
    const sequence = read('references/core/tool-sequences.md');
    expect(skill).toContain('keep this workflow active and **call targeted');
    expect(skill).toContain('record the specific missing fields or clipping reason before retry');
    expect(skill).toContain('Do not end the turn by only listing incomplete candidates');
    expect(skill).toContain('Never repeat a candidate whose result is already complete');
    expect(skill).toContain('repeat only that candidate once');
    expect(skill).toContain('If the READ tool genuinely cannot be called');
    expect(ontology).toContain('The next action in this same workflow is a');
    expect(ontology).toContain('specific missing fields or clipping reason before each retry');
    expect(ontology).toContain('a recovery queue, **not** a final response');
    expect(ontology).toContain('without rereading complete ones');
    expect(ontology).toContain('retry that same candidate only once');
    expect(ontology).toContain('HOLD before every business Write only after');
    expect(sequence).toContain('starts an active recovery queue, not a final answer');
    expect(sequence).toContain('Record the missing fields or clipping reason before each retry');
    expect(sequence).toContain('call `trivia_find_similar_facts` next for each unresolved');
    expect(sequence).toContain('keep already complete candidates out of the queue');
    expect(sequence).toContain('Do not report only “incomplete” or enter HOLD');
    expect(sequence).toContain('After the second incomplete one-candidate view, HOLD');
    expect(sequence).toContain('If the tool actually cannot be called');
  });

  it('holds a complete review-required response until IDs, reasons and differences are supported', () => {
    const text = read(niche + 'dedup-ontology.md');
    const sequence = read('references/core/tool-sequences.md');
    expect(text).toContain('For each complete result with `review_required: true`');
    expect(text).toContain('decision for each returned match');
    expect(text).toContain('response does not label which individual matches are strong');
    expect(text).toContain(
      'its exact candidate ID, a concrete reason, and supported material differences',
    );
    expect(text).toContain('candidate evidence is not inspectable, hold');
    expect(text).toContain('Use `dedup_reviews: []` only');
    expect(text).toContain('An incomplete or uncertain review holds the set');
    expect(sequence).toContain(
      'semantic same/distinct/uncertain review with exact candidate IDs and reasons',
    );
    expect(sequence).toContain('Hold an incomplete or inconsistent set before reservation');
  });

  it('requires per-candidate material differences that match actual structured fields', () => {
    const text = read(niche + 'dedup-ontology.md');
    const sequence = read('references/core/tool-sequences.md');
    expect(text).toContain(
      'validate **each submitted review against the exact candidate returned by READ',
    );
    expect(text).toContain('`relation` only when `relation_key` differs');
    expect(text).toContain('`other` only when `subject_key` or `object_key` differs');
    expect(text).toContain('Do not copy one generic difference list across all matches');
    expect(text).toContain('material_differences: ["other"]');
    expect(text).toContain('**do not add `"relation"`**');
    expect(text).toContain('four asserted `"relation"`');
    expect(sequence).toContain('validate every submitted `material_differences` label');
  });

  it('calibrates first-draft interest and visual density without bypassing server metrics', () => {
    const dna = read(niche + 'content-dna.md');
    const formats = read(niche + 'formats.md');
    expect(dna).toContain('Before reserving the final ordered set');
    expect(dna).toContain('replace weak candidates while still in research');
    expect(dna).toContain('not a separate preview/GO checkpoint');
    expect(dna).toContain('classify each proposed line privately');
    expect(dna).toContain('replace a second obvious-filler line before reserving');
    expect(dna).toContain('not** a source for those claims');
    expect(formats).toContain('aim comfortably within the preferred word range');
    expect(formats).toContain('never supply calculated `text_metrics`');
    expect(formats).toContain('Preserve material qualifiers');
    const rubric = read(niche + 'quality-rubric.md');
    expect(rubric).toContain('judge the **whole first-draft collection**');
    expect(rubric).toContain('two or more obvious filler lines warrant `needs_review`');
    expect(rubric).toContain('useful novelty, not forced shock');
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
