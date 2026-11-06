import { existsSync, readFileSync, realpathSync } from 'node:fs';
import { dirname, join, resolve, sep } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = join(process.cwd(), 'plugin', 'skills', 'content-producer');
const niche = 'references/niches/trivia/';
const names = ['content-dna.md', 'formats.md', 'fact-checking.md',
  'dedup-ontology.md', 'quality-rubric.md', 'reference-patterns.md', 'writing-playbook.md'] as const;
const read = (path: string) => readFileSync(join(root, path), 'utf8');

describe('CR-059 trivia v2-only plugin guidance', () => {
  it('keeps all seven niche references linked inside the package', () => {
    expect(names).toHaveLength(7);
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
const repoRoot = process.cwd();
const atlasPath = 'plugin/skills/content-producer/references/niches/trivia/reference-patterns.md';
const sourcesPath = 'docs/editorial/reference-example-sources.md';
const atlas = readFileSync(join(repoRoot, atlasPath), 'utf8');
const sources = readFileSync(join(repoRoot, sourcesPath), 'utf8');
const formats = new Set(['single_subject_fast', 'themed_utility',
  'emotional_animal_collection', 'comparison', 'myth_vs_fact']);
const profiles = new Set(['fast_trivia', 'practical_utility']);
const slug = (heading: string): string => heading.toLowerCase()
  .replace(/[^a-z0-9 -]/g, '').replaceAll(' ', '-');
const fail = (message: string): never => { throw new Error(message); };
function section(text: string, id: string): string {
  const match = new RegExp('^## ' + id + ' — [^\\n]+\\n([\\s\\S]*?)(?=^## |$(?![\\s\\S]))', 'm').exec(text);
  return match?.[1] ?? fail('missing example ' + id);
}
function copyOf(text: string): string {
  return /### Canva copy\n\n\x60\x60\x60text\n([\s\S]*?)\n\x60\x60\x60/.exec(text)?.[1]
    ?? fail('missing complete copy');
}

// Corpus integrity only: these checks cannot measure factual truth,
// naturalness, surprise or live generation. Those require D6 human review.
function validateCorpus(text: string, evidence: string): void {
  const ids = Array.from(text.matchAll(/^## (RP\d\d) — /gm), (m) => m[1]);
  if (ids.length !== 12 || new Set(ids).size !== 12) fail('twelve unique examples');
  const anchors = new Set(Array.from(text.matchAll(/^#{1,6} (.+)$/gm), (m) => slug(m[1])));
  for (const match of text.matchAll(/\]\(#([^)]+)\)/g)) {
    if (!anchors.has(match[1])) fail('broken internal link ' + match[1]);
  }
  const usedFormats = new Set<string>();
  const usedProfiles = new Set<string>();
  const provenance = new Set<string>();
  for (const filename of ['post-coriousmind.txt', 'post-dyk.txt', 'post-dailyfacts.txt']) {
    for (const line of readFileSync(join(repoRoot, 'dataset-reference', filename), 'utf8').split('\n')) {
      if (line.trim()) {
        const row = JSON.parse(line) as { account: string; id: string };
        provenance.add(row.account + ' ' + row.id);
      }
    }
  }
  for (let i = 1; i <= 12; i++) {
    const id = 'RP' + String(i).padStart(2, '0');
    const card = section(text, id);
    const format = /- Format: \x60([a-z_]+)\x60/.exec(card)?.[1] ?? '';
    const profile = /- Profile: \x60([a-z_]+)\x60/.exec(card)?.[1] ?? '';
    if (!formats.has(format) || !profiles.has(profile)) fail('unsupported routing');
    usedFormats.add(format); usedProfiles.add(profile);
    const pattern = /- Pattern: ([^\n]+)\./.exec(card)?.[1] ?? '';
    for (const item of pattern.split('; ')) {
      if (!provenance.has(item)) fail('invalid pattern provenance');
    }
    if (!pattern) fail('missing pattern provenance');
    const target = '#'+slug(/^(RP\d\d — .+)$/m.exec(
      text.slice(text.indexOf('## ' + id + ' — ') + 3))?.[1] ?? '');
    if (!text.includes('[' + id + '](' + target + ')')) fail('missing routing index');
    const copy = copyOf(card);
    const parts = copy.split('\n\n');
    const count = Number(/- Config: (\d+) facts/.exec(card)?.[1]);
    const facts = parts.slice(1, -1);
    if (parts[0] !== 'Did you know?' || count < 5 || count > 9 ||
      facts.length !== count || !parts.at(-1)?.trim()) fail('incomplete card');
    if (/https?:\/\/|\[[ x]\]|^\s*[-*] |\b(?:TODO|TBD|placeholder)\b|\.\.\.|[<>]/m.test(copy))
      fail('public copy contains source or placeholder');
    if (copy.length > 600 || facts.join('\n\n').length > 500 ||
      facts.some((f) => f.length > 90 || f.includes('\n')) ||
      (parts.at(-1)?.length ?? 0) > 50) fail('example character budget');
    if (copy.trim().split(/\s+/).length > 100 ||
      facts.some((f) => f.trim().split(/\s+/).length > 18)) fail('example word budget');
    for (const field of ['Opening', 'Middle', 'Closing', 'CTA', 'Limits not inherited']) {
      if (!card.includes('- ' + field + ': ')) fail('missing annotation ' + field);
    }
    const roles = Array.from(card.matchAll(/^\| F(\d+) \| [^|\n]+ \|$/gm), (m) => Number(m[1]));
    if (roles.join(',') !== facts.map((_, j) => j + 1).join(',')) fail('missing per-line role');
    const sourceSection = evidence.split('## ' + id + '\n')[1]?.split('\n## ')[0]
      ?? fail('missing source section');
    const sourceRows = Array.from(sourceSection.matchAll(/^\| F(\d+) \|.*$/gm));
    if (sourceRows.length !== count) fail('missing per-claim source');
    sourceRows.forEach((row, j) => {
      if (Number(row[1]) !== j + 1 || !/\[Sumber\]\(https:\/\/[^)]+\)/.test(row[0]))
        fail('invalid per-claim source');
      if (row[0].includes('dataset-reference')) fail('dataset is not fact evidence');
    });
  }
  if (usedFormats.size !== 5 || usedProfiles.size !== 2) fail('format/profile coverage');
  const antiIds = Array.from(text.matchAll(/^### (BA\d\d) — /gm), (m) => m[1]);
  if (antiIds.length < 6 || new Set(antiIds).size !== antiIds.length) fail('anti-example coverage');
  for (const id of antiIds) {
    const anti = text.split('### ' + id + ' — ')[1]?.split('\n### BA')[0] ?? '';
    if (!/Before — reject or revise:/.test(anti) ||
      !/\x60\x60\x60text\nDid you know\?|Useful produce facts/.test(anti) ||
      !/After: \[RP\d\d complete card\]\(#/.test(anti) ||
      !anti.includes('Decision: ')) fail('incomplete before/after pair');
  }
}

describe('CR-061 reference atlas integrity (SOURCE/FIXTURE, not semantic PASS)', () => {
  it('checks twelve complete routed cards, real pattern IDs, sources, annotations and six pairs', () => {
    expect(() => validateCorpus(atlas, sources)).not.toThrow();
  });
  it('rejects an example removed from the corpus', () => {
    const missing = atlas.replace(/^## RP12 — [\s\S]*?(?=^## Anti-examples)/m, '');
    expect(() => validateCorpus(missing, sources)).toThrow(/twelve unique examples/);
  });
  it('rejects a broken internal link rather than counting a routing label', () => {
    expect(() => validateCorpus(atlas.replace(/\]\(#rp01[^)]+\)/, '](#missing-card)'), sources))
      .toThrow(/broken internal link/);
  });
  it('rejects missing source evidence and source leakage into public copy', () => {
    expect(() => validateCorpus(atlas, sources.replace(/^\| F1 \|.*\n/m, '')))
      .toThrow(/missing per-claim source/);
    expect(() => validateCorpus(atlas.replace("An octopus's arms can taste what they touch.",
      "An octopus's arms can taste. https://example.org/source"), sources))
      .toThrow(/public copy contains/);
  });
  it('rejects incomplete copy, unsupported format and missing line annotation', () => {
    expect(() => validateCorpus(atlas.replace('Did you know?\n\n', ''), sources))
      .toThrow(/incomplete card/);
    expect(() => validateCorpus(atlas.replace('- Format: \x60single_subject_fast\x60',
      '- Format: \x60invented_format\x60'), sources)).toThrow(/unsupported routing/);
    expect(() => validateCorpus(atlas.replace(/^\| F1 \|.*\n/m, ''), sources))
      .toThrow(/missing per-line role/);
  });
  it('keeps the eight transfer subjects out of the positive-card subjects', () => {
    const headings = Array.from(atlas.matchAll(/^## RP\d\d — (.+)$/gm), (m) => m[1]).join('\n');
    expect(headings).not.toMatch(/elephant|teeth|rice|berries|leafy greens|Australia|Canadian|zipper|trees/i);
  });
});


describe('Saved-copy remediation guidance remains general and packaged', () => {
  it('audits boundaries after shortening and never delegates them to caption or internal subject', () => {
    const playbook = read(niche + 'writing-playbook.md').replace(/\s+/g, ' ');
    for (const rule of ['compare each final sentence', 'population of a superlative',
      'about/roughly', 'after the last shortening', 'not a substitute for a missing boundary'])
      expect(playbook).toContain(rule);
  });
  it('curates candidate pools and chooses a real device before locking batch formats', () => {
    const playbook = read(niche + 'writing-playbook.md').replace(/\s+/g, ' ');
    const format = read(niche + 'formats.md').replace(/\s+/g, ' ');
    expect(playbook).toContain('A supplied research pool is not a checklist');
    expect(playbook).toContain('shorter legal, varied set');
    expect(playbook).toContain('never reduce an explicit fixed count');
    expect(format).toContain('format_key: null');
    expect(format).toContain('varied facts alone do not make it comparison');
    expect(format).toContain('non-null existing item intent');
    expect(playbook).toContain('Define an unfamiliar named product or object');
    // Held-out evaluation answers and private QA identifiers must stay out of new guidance.
    const guidance = read('SKILL.md') + read(niche + 'writing-playbook.md');
    expect(guidance).not.toMatch(/chatgpt\.com\/c\/|pluginrel_|Hills Hoist|Whitcomb|Charon/);
  });
});
