import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(join(process.cwd(), path), 'utf8');
const map = JSON.parse(read('docs/phase-8/coverage-map.json')) as {
  classification: string;
  cases: { id: string; status: string; checkpoint: string }[];
  goals: { id: string }[];
  tools: {
    number: number;
    name: string;
    positive_path: string;
    boundary_path: string;
    status: string;
  }[];
  acceptance_criteria: {
    id: string;
    phase_8_status: string;
    production_scope: string;
  }[];
};

function ids(source: string, start: string, end: string, regex: RegExp): string[] {
  const first = source.indexOf(start);
  const last = source.indexOf(end, first + start.length);
  expect(first).toBeGreaterThanOrEqual(0);
  expect(last).toBeGreaterThan(first);
  return Array.from(source.slice(first, last).matchAll(regex), (match) => match[1]);
}

describe('Phase 8.0 contract coverage (design only)', () => {
  it('keeps 101 case IDs unique and unexecuted', () => {
    const frozen = ids(
      read('plans/use-case-inventory.md'),
      '## 9. Direct-request',
      '## 15. Expected behavior',
      /^\|\s*\x60(EV-(?:DR|IN|FU|CL|RC|NG)-\d{3})\x60\s*\|/gm,
    );
    const actual = map.cases.map((entry) => entry.id);
    expect(frozen).toHaveLength(101);
    expect(new Set(actual).size).toBe(101);
    expect(actual).toEqual(frozen);
    expect(map.cases.every((entry) => entry.status === 'NOT_EXECUTED')).toBe(true);
    expect(map.classification).toBe('DESIGN_COVERAGE_ONLY_NOT_EXECUTION_EVIDENCE');
    const counts = Object.fromEntries(
      ['DR', 'IN', 'FU', 'CL', 'RC', 'NG'].map((family) => [
        family,
        actual.filter((id) => id.startsWith('EV-' + family + '-')).length,
      ]),
    );
    expect(counts).toEqual({ DR: 21, IN: 12, FU: 10, CL: 8, RC: 36, NG: 14 });
    expect(new Set(map.cases.map((entry) => entry.checkpoint))).toEqual(
      new Set(['8.4', '8.5', '8.6', '8.7', '8.8', '8.9', '8.10', '8.11']),
    );
  });

  it('matches 31 goals and 33 contract tools with both mapped paths', () => {
    const inventory = read('plans/use-case-inventory.md');
    const goals = ids(
      inventory,
      '## 8. Supported use-case inventory',
      '## 9. Direct-request',
      /^\|\s*\x60(UC-[A-Z]+-\d{3})\x60\s*\|/gm,
    );
    const names = ids(
      read('plans/tool-inventory.md'),
      '## 7. Inventory final',
      '## 8. Contract identity',
      /^\|\s*\d+\s*\|\s*\x60([a-z_]+)\x60\s*\|/gm,
    );
    expect(goals).toHaveLength(31);
    expect(map.goals.map((entry) => entry.id)).toEqual(goals);
    expect(names).toHaveLength(33);
    expect(map.tools.map((entry) => entry.name)).toEqual(names);
    for (const [index, entry] of map.tools.entries()) {
      expect(entry.number).toBe(index + 1);
      expect(entry.positive_path.length).toBeGreaterThan(0);
      expect(entry.boundary_path.length).toBeGreaterThan(0);
      expect(entry.status).toBe('NOT_EXECUTED');
    }
  });

  it('maps 14 ACs without claiming ChatGPT or production acceptance', () => {
    const ac = ids(
      read('plans/acceptance-traceability.md'),
      '## 10. Acceptance criteria traceability',
      '## 11. Keputusan',
      /^\|\s*\x60(AC-\d{3})\x60\s*\|/gm,
    );
    expect(ac).toHaveLength(14);
    expect(map.acceptance_criteria.map((entry) => entry.id)).toEqual(ac);
    expect(map.acceptance_criteria.every((entry) => entry.phase_8_status === 'NOT_EVALUATED')).toBe(
      true,
    );
    for (const id of ['AC-001', 'AC-012']) {
      expect(map.acceptance_criteria.find((entry) => entry.id === id)?.production_scope).toBe(
        'DEFERRED-to-Phase-9/10',
      );
    }
    expect(read('docs/phase-8/preflight-8.0.md')).toContain('**Verdict: BLOCKED.**');
  });
});
