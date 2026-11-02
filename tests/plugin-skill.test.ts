import { existsSync, readFileSync, realpathSync } from 'node:fs';
import { dirname, join, resolve, sep } from 'node:path';
import { describe, expect, it } from 'vitest';
import { batch, single, lostResponseReplay, partialProgress } from './fixtures/trivia-draft-v2.js';

const root = join(process.cwd(), 'plugin', 'skills', 'content-producer');
const read = (path: string) => readFileSync(join(root, path), 'utf8');
const names = [
  'workflow.md',
  'lifecycle.md',
  'tool-sequences.md',
  'source-policy.md',
  'output-contract.md',
];

describe('Phase 7.2 core skill source contract', () => {
  it('parses skill name and descriptive activation metadata', () => {
    const skill = read('SKILL.md');
    const frontmatter = /^---\n([\s\S]+?)\n---\n/.exec(skill)?.[1];
    expect(frontmatter).toBeDefined();
    expect(frontmatter).toMatch(/^name: content-producer$/m);
    expect(frontmatter).toMatch(/^description: .{70,}$/m);
    expect(skill).toContain('Activate for user goals');
    expect(skill).toContain('Do not activate');
    expect(skill).toContain('Phase 10');
  });

  it('links five real core references without escaping the skill root', () => {
    const paths = ['SKILL.md', ...names.map((name) => 'references/core/' + name)];
    for (const name of names) {
      expect(read('SKILL.md')).toContain('(references/core/' + name + ')');
    }
    for (const path of paths) {
      const content = read(path);
      const base = dirname(join(root, path));
      for (const match of content.matchAll(/\]\(([^)#]+\.md)(?:#[^)]*)?\)/g)) {
        const target = resolve(base, match[1]);
        expect(target.startsWith(resolve(root) + sep)).toBe(true);
        expect(existsSync(target)).toBe(true);
        expect(realpathSync(target).startsWith(realpathSync(root) + sep)).toBe(true);
      }
    }
  });

  it('preserves the frozen 33 names in order and adds exactly the three CR-053 v2 tools', () => {
    const inventory = readFileSync(join(process.cwd(), 'plans', 'tool-inventory.md'), 'utf8');
    const frozen = Array.from(
      inventory.matchAll(/^\|\s*\d+\s*\|\s*\x60([a-z_]+)\x60\s*\|/gm),
      (match) => match[1],
    );
    const listed = Array.from(
      read('references/core/tool-sequences.md').matchAll(/^\|\s*\d+\s*\|\s*([a-z0-9_]+)\s*\|/gm),
      (match) => match[1],
    );
    expect(frozen).toHaveLength(33);
    expect(listed).toEqual([...frozen, 'trivia_find_similar_facts_v2', 'save_post_v2', 'revise_post_v2']);
  });

  it('covers clarification, retry, stale state and manual boundaries', () => {
    const sequences = read('references/core/tool-sequences.md');
    for (const id of [
      'EV-CL-001',
      'EV-CL-003',
      'EV-CL-006',
      'EV-RC-007',
      'EV-RC-009',
      'EV-RC-012',
      'EV-RC-021',
      'EV-RC-029',
      'EV-NG-001',
      'EV-NG-006',
      'EV-NG-011',
      'EV-RC-032',
    ]) {
      expect(sequences).toContain('| ' + id + ' |');
    }
    const lifecycle = read('references/core/lifecycle.md');
    expect(lifecycle).toContain('OPERATION_KEY_REUSED');
    expect(lifecycle).toContain('REVISION_CONFLICT');
    expect(lifecycle).toContain('explicit_correction=true');
    expect(lifecycle).toContain('same operation_key');
  });

  it('enforces server-authoritative metrics for post writes', () => {
    const docs = [read('SKILL.md'), read('references/core/workflow.md')];
    const rule = [
      'For `save_post` and `revise_post`,',
      'always send `content_payload.text_metrics: {}`.',
    ].join(' ');
    for (const content of docs) {
      expect(content).toContain(rule);
      expect(content).toContain(
        'Never calculate, guess, reuse, or fabricate pre-submit `text_metrics`',
      );
      expect(content).toContain('server-returned `text_metrics`');
      // Negative guard: fabricated client metrics must not match the rule.
      const invalid = content.replaceAll(
        'content_payload.text_metrics: {}',
        'content_payload.text_metrics: {"word_count":79}',
      );
      expect(invalid).not.toContain(rule);
    }
    const output = read('references/core/output-contract.md');
    expect(output).toContain('server-returned `text_metrics`');
    expect(output).toContain('never display pre-submit client estimates as authoritative');
  });

  it('preserves explicit saves, batch limits and separate copy sections', () => {
    const workflow = read('references/core/workflow.md');
    const output = read('references/core/output-contract.md');
    const sources = read('references/core/source-policy.md');
    expect(workflow).toContain('maximum 3');
    expect(workflow).toContain('30-minute');
    expect(workflow).toContain('report_content_plan_item_failure');
    expect(workflow).toContain('replace_discarded_plan_item');
    expect(output).toContain('CANVA COPY');
    expect(output).toContain('FACEBOOK CAPTION');
    expect(output).toContain('HASHTAGS');
    expect(output).toContain('INFORMASI INTERNAL');
    expect(output).toContain('unsaved');
    expect(output).toContain('manual');
    expect(sources).toContain('independence_group');
    expect(sources).toContain('required_per_item');
  });
});

describe('CR-053 P6 primary v2 instructions and scripted host fixtures (not live AI)', () => {
  it('makes v2 primary with scoped counts, URL research, replacement and mandatory readback', () => {
    const skill = read('SKILL.md').split('## Legacy v1 only')[0];
    const workflow = read('references/core/workflow.md').split('## Legacy v1 single post')[0];
    for (const term of ['save_post_v2', 'revise_post_v2', 'trivia_find_similar_facts_v2',
      'source_url', 'three', 'get_post', 'get_content_plan', 'same', 'before', 'one']) {
      expect((skill + workflow).toLowerCase()).toContain(term.toLowerCase());
    }
    for (const term of ['without a number means one', 'above 100 before Write',
      'exactly that many items', 'theme in `plan_intent`', 'claim one item',
      'before final copy', 'six-digit', 'No tier, expiry, ontology',
      'No year is mandatory', 'unknown', 'before changing facts',
      'HTTP 200', 'not Setujui/ready', 'never recreate completed', 'Indonesian']) {
      expect(skill.toLowerCase()).toContain(term.toLowerCase());
    }
    expect(skill.indexOf('trivia_find_similar_facts_v2')).toBeLessThan(skill.indexOf('save_post_v2'));
    const quality = read('references/niches/trivia/quality-rubric.md').split('## Legacy v1 only')[0];
    for (const criterion of ['meaning_preserved', 'caption_no_new_claim', 'no_known_substantive_issue']) {
      expect(quality).toContain(criterion);
    }
    expect(quality).toContain('Style/novelty suggestions are nonblocking');
    const source = read('references/niches/trivia/fact-checking.md').split('## Legacy v1 only')[0];
    expect(source).toContain('one `source_url` is sufficient');
    expect(source).toContain('topic category alone does not impose a two-source quota');
  });

  it('validates one/five-draft scripted host traces and rejects missing readback, reserve or duplicate completed output', () => {
    type Event = { tool: string; post?: string; payload?: typeof single.request };
    // Golden fixture sequences exercise the documented contract, not a ChatGPT
    // decision engine. Actual rendered host execution remains P7.
    const steps = (example: typeof single): Event[] => [
      { tool: 'trivia_find_similar_facts_v2' }, { tool: 'get_page_generation_context' },
      { tool: 'save_post_v2', post: example.response.data.post.post_public_id, payload: example.request },
      { tool: 'get_post', post: example.response.data.post.post_public_id },
    ];
    const verify = (events: Event[], expected: number, completed: string[] = []) => {
      const saves = events.filter(e => e.tool === 'save_post_v2');
      expect(saves).toHaveLength(expected);
      expect(new Set(saves.map(e => e.post)).size).toBe(expected);
      expect(events.some(e => e.tool.includes('reserve'))).toBe(false);
      for (const save of saves) {
        expect(completed).not.toContain(save.post);
        const i = events.indexOf(save);
        expect(events[i - 1].tool).toBe('get_page_generation_context');
        expect(events[i + 1]).toMatchObject({ tool: 'get_post', post: save.post });
        expect(save.payload?.request_schema_version).toBe(2);
        for (const fact of save.payload!.facts) {
          expect(fact.source_url).toMatch(/^https?:\/\//);
          expect(Object.keys(fact).sort()).toEqual(['candidate_key', 'claim_text', 'dedup', 'position', 'source_url']);
        }
      }
    };
    verify(steps(single), 1);
    expect(single.request.plan_item).toBeNull();
    const five: Event[] = [{ tool: 'create_content_plan' }, ...batch.flatMap(example => [
      { tool: 'claim_content_plan_items' }, ...steps(example), { tool: 'get_content_plan' },
    ])];
    verify(five, 5);
    const completed = batch.slice(0, 3).map(e => e.response.data.post.post_public_id);
    const resumed: Event[] = [{ tool: 'get_content_plan' }, ...batch.slice(3).flatMap(example => [
      { tool: 'claim_content_plan_items' }, ...steps(example), { tool: 'get_content_plan' },
    ])];
    verify(resumed, 2, completed);
    expect(resumed[0].tool).toBe('get_content_plan');
    expect(() => verify(steps(single).filter(e => e.tool !== 'get_post'), 1)).toThrow();
    expect(() => verify([{ tool: 'trivia_register_and_reserve_facts' }, ...steps(single)], 1)).toThrow();
    expect(() => verify(steps(batch[0]), 1, completed)).toThrow();
    expect(lostResponseReplay.request).toEqual(batch[3].request);
    expect(lostResponseReplay.response.data.post.post_public_id).toBe(batch[3].response.data.post.post_public_id);
    expect(partialProgress.progress.completed).toBe(completed.length);
  });

  it('separates public copy from internal evidence and reports Indonesian progress/unknown honestly', () => {
    const output = read('references/core/output-contract.md');
    for (const term of ['Diminta 5 draft; 3 terbukti', '2 tersisa', 'FACT_REUSE_BLOCKED',
      'Hasil Write belum', 'RPC_RESPONSE_INVALID', 'ID diagnostik', 'host refusal',
      'actions actually tried', 'HTTP 200', 'sources/checks']) expect(output).toContain(term);
    const fields = [single.request.content_payload.canva_copy, single.request.content_payload.caption,
      ...single.request.content_payload.hashtags].join('\n');
    expect(fields).not.toContain(single.request.facts[0].source_url);
    expect(fields).not.toContain(single.response.data.post.post_public_id);
    const sequence = read('references/core/tool-sequences.md');
    expect(sequence).toContain('36 tools, 12 Read/24 Write');
    expect(sequence).toContain('Shared reads/plan/lifecycle');
    expect(sequence).toContain('not deployment evidence');
  });
});
