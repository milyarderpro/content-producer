import { cpSync, mkdtempSync, mkdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { CANDIDATE_FILES, createCandidate, validatePluginSource, verifyCandidate } from '../scripts/plugin-package.js';

const root = process.cwd();
const fixtures: string[] = [];
function setup(): string {
  const dir = mkdtempSync(join(tmpdir(), 'phase-7.4-'));
  fixtures.push(dir);
  cpSync(join(root, 'plugin'), join(dir, 'plugin'), { recursive: true });
  mkdirSync(join(dir, 'plans'));
  cpSync(join(root, 'plans/tool-inventory.md'), join(dir, 'plans/tool-inventory.md'));
  return dir;
}
function change(path: string, before: string, after: string): void {
  const original = readFileSync(path, 'utf8');
  if (!original.includes(before)) throw new Error('Bad test fixture: ' + before);
  writeFileSync(path, original.replace(before, after));
}
afterEach(() => {
  for (const dir of fixtures.splice(0)) rmSync(dir, { recursive: true, force: true });
});

describe('Phase 7.4 generated package and source safety', () => {
  it('validates manifest, generator schema, skill, references, policy and exact tool order', () => {
    expect(() => validatePluginSource(root)).not.toThrow();
    expect(CANDIDATE_FILES).toHaveLength(12);
    expect(CANDIDATE_FILES).not.toContain('mcp.json');
  });

  it('builds twelve allowlisted files and verifies actual candidate hashes', () => {
    const dir = setup();
    const out = join(dir, 'artifacts/plugin-candidate');
    const index = createCandidate(dir, out);
    expect(index.file_count).toBe(12);
    expect(index.files.every((entry) => entry.sha256.length === 64 && entry.bytes > 0)).toBe(true);
    expect(verifyCandidate(dir, out)).toEqual(index);
    expect(readFileSync(join(out, 'plugin.json'), 'utf8')).toBe(readFileSync(join(dir, 'plugin/plugin.json'), 'utf8'));
    writeFileSync(join(out, 'unexpected.json'), '{}');
    expect(() => verifyCandidate(dir, out)).toThrow(/strict allowlist/);
  });

  it('rejects a tampered candidate even when source remains valid', () => {
    const dir = setup();
    const out = join(dir, 'artifacts/plugin-candidate');
    createCandidate(dir, out);
    const skill = join(out, 'skills/content-producer/SKILL.md');
    writeFileSync(skill, readFileSync(skill, 'utf8') + '\nTampered content.\n');
    expect(() => verifyCandidate(dir, out)).toThrow(/hashes differ/);
  });

  it('rejects missing source, malformed input schema and unsafe reference links', () => {
    const dir = setup();
    const manifest = join(dir, 'plugin/plugin.json');
    rmSync(manifest);
    expect(() => validatePluginSource(dir)).toThrow(/Required plugin file/);
    cpSync(join(root, 'plugin/plugin.json'), manifest);
    const schema = join(dir, 'plugin/schemas/mcp-connection-input.schema.json');
    change(schema, '"discovery"', '"fabricated"');
    expect(() => validatePluginSource(dir)).toThrow(/schema drift/);
    cpSync(join(root, 'plugin/schemas/mcp-connection-input.schema.json'), schema);
    const skill = join(dir, 'plugin/skills/content-producer/SKILL.md');
    change(skill, '(references/core/workflow.md)', '(references/core/missing.md)');
    expect(() => validatePluginSource(dir)).toThrow();
    cpSync(join(root, 'plugin/skills/content-producer/SKILL.md'), skill);
    change(skill, '(references/core/workflow.md)', '(../../../../etc/passwd)');
    expect(() => validatePluginSource(dir)).toThrow();
  });

  it('rejects tool drift, loss of critical quality guidance and symlink escapes', () => {
    const dir = setup();
    const seq = join(dir, 'plugin/skills/content-producer/references/core/tool-sequences.md');
    change(seq, '|   1 | get_account_profile', '|   1 | list_pages        ');
    expect(() => validatePluginSource(dir)).toThrow(/inventory order/);
    cpSync(join(root, 'plugin/skills/content-producer/references/core/tool-sequences.md'), seq);
    const rubric = join(dir, 'plugin/skills/content-producer/references/niches/trivia/quality-rubric.md');
    change(rubric, 'trivia.source_supported', 'trivia.source_ignored');
    expect(() => validatePluginSource(dir)).toThrow(/frozen policy/);
    cpSync(join(root, 'plugin/skills/content-producer/references/niches/trivia/quality-rubric.md'), rubric);
    const outside = join(dir, 'outside.md');
    writeFileSync(outside, 'unsafe');
    symlinkSync(outside, join(dir, 'plugin/skills/content-producer/references/core/outside.md'));
    expect(() => validatePluginSource(dir)).toThrow(/Symlink/);
  });

  it('rejects final MCP config, embedded secrets and fictional MCP endpoints', () => {
    const dir = setup();
    const finalPath = join(dir, 'plugin/mcp.json');
    writeFileSync(finalPath, '{"mcpServers":{}}');
    expect(() => validatePluginSource(dir)).toThrow(/Deferred connection/);
    rmSync(finalPath);
    const workflow = join(dir, 'plugin/skills/content-producer/references/core/workflow.md');
    writeFileSync(workflow, readFileSync(workflow, 'utf8') + '\n-----BEGIN PRIVATE KEY-----');
    expect(() => validatePluginSource(dir)).toThrow(/credential/);
    cpSync(join(root, 'plugin/skills/content-producer/references/core/workflow.md'), workflow);
    writeFileSync(workflow, readFileSync(workflow, 'utf8') + '\nhttps://fake.example.net/functions/v1/mcp');
    expect(() => validatePluginSource(dir)).toThrow(/endpoint/);
  });
});
