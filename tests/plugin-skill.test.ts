import { existsSync, readFileSync, realpathSync } from 'node:fs';
import { dirname, join, resolve, sep } from 'node:path';
import { describe, expect, it } from 'vitest';

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

  it('matches the exact frozen 33-tool inventory in order', () => {
    const inventory = readFileSync(join(process.cwd(), 'plans', 'tool-inventory.md'), 'utf8');
    const frozen = Array.from(
      inventory.matchAll(/^\|\s*\d+\s*\|\s*\x60([a-z_]+)\x60\s*\|/gm),
      (match) => match[1],
    );
    const listed = Array.from(
      read('references/core/tool-sequences.md').matchAll(/^\|\s*\d+\s*\|\s*([a-z_]+)\s*\|/gm),
      (match) => match[1],
    );
    expect(frozen).toHaveLength(33);
    expect(listed).toEqual(frozen);
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
      const invalid = content.replace(
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
