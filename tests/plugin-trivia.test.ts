import { existsSync, readFileSync, realpathSync } from 'node:fs';
import { dirname, join, resolve, sep } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = join(process.cwd(), 'plugin', 'skills', 'content-producer');
const niche = 'references/niches/trivia/';
const names = ['content-dna.md', 'formats.md', 'fact-checking.md',
  'dedup-ontology.md', 'quality-rubric.md'] as const;
const read = (path: string) => readFileSync(join(root, path), 'utf8');

describe('CR-059 trivia v2-only plugin guidance', () => {
  it('keeps all five niche references linked inside the package', () => {
    const skill = read('SKILL.md');
    for (const name of names) expect(skill).toContain('(' + niche + name + ')');
    for (const path of ['SKILL.md', ...names.map((name) => niche + name)]) {
      const parent = dirname(join(root, path));
      for (const match of read(path).matchAll(/\]\(([^)#]+\.md)(?:#[^)]*)?\)/g)) {
        const target = resolve(parent, match[1]);
        expect(target.startsWith(resolve(root) + sep)).toBe(true);
        expect(existsSync(target)).toBe(true);
        expect(realpathSync(target).startsWith(realpathSync(root) + sep)).toBe(true);
      }
    }
  });

  it('preserves Page-configured formats, profiles and hard copy budgets', () => {
    const formats = read(niche + 'formats.md');
    const keys = Array.from(formats.matchAll(/^### `([a-z_]+)`$/gm), (m) => m[1]);
    expect(keys).toEqual(['single_subject_fast', 'themed_utility',
      'emotional_animal_collection', 'comparison', 'myth_vs_fact']);
    for (const token of ['fast_trivia', 'practical_utility', '18 words/fact',
      '12 in hook', '14 in CTA', '100 Canva words', 'text_metrics']) {
      expect(formats).toContain(token);
    }
    expect(formats).toContain('follow the configured count');
    expect(formats).not.toContain('FACT_COUNT_BELOW_CONFIG_MIN');
  });

  it('requires real support and v2 semantic dedup without a reservation flow', () => {
    const sources = read(niche + 'fact-checking.md');
    const dedup = read(niche + 'dedup-ontology.md');
    const dna = read(niche + 'content-dna.md');
    expect(sources).toContain('one `source_url` is sufficient');
    expect(sources).toContain('Open and assess one real page');
    expect(sources).toContain('Do not fabricate sources');
    expect(dedup).toContain('trivia_find_similar_facts_v2');
    expect(dedup).toContain('SAME/DISTINCT/UNCERTAIN');
    expect(dedup).toContain('complete=false');
    expect(dedup).toContain('canonical ID');
    expect(dedup).toContain('no separate reserve token');
    expect(dna).toContain('en-US');
    expect(dna).toContain('topic_key');
  });

  it('keeps the three v2 editorial checks and separate owner approval', () => {
    const rubric = read(niche + 'quality-rubric.md');
    for (const key of ['meaning_preserved', 'caption_no_new_claim',
      'no_known_substantive_issue']) expect(rubric).toContain(key);
    expect(rubric).toContain('needs_revision');
    expect(rubric).toContain('get_post');
    expect(rubric).toContain('Explicit owner Setujui');
    expect(rubric).not.toContain('18-criterion');
  });
});
