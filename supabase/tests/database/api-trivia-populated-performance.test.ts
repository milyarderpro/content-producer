import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { writeCr016Evidence } from '../../../scripts/evidence-output.js';
import { fixture, cleanup, sql } from './helpers/trivia-rpc.js';
import { populateSearch } from './helpers/trivia-performance.js';

describe('CR-016 public populated retrieval', () => {
  it('P1-02 authenticated 5,001-fact public search p95 and normal-planner plans', async () => {
    const f = fixture();
    try {
      const harness = populateSearch(f);
      const before = harness.fixtureDigest();
      expect(before.n).toBe(5001);
      const timing = harness.measure();
      const plans = { public_rpc: harness.publicPlan(), private_diagnostic: harness.helperPlan() };
      expect(sql('show enable_seqscan')).toBe('on');
      expect(harness.fixtureDigest()).toEqual(before);
      const result = { fixture: before, timing, plans, enable_seqscan: 'on' };
      console.info(
        `CR-016 populated authenticated search p95=${timing.p95_ms.toFixed(1)}ms; n=12; rows=5001`,
      );
      await writeCr016Evidence('search', result);
      expect(timing.p95_ms).toBeLessThanOrEqual(3000);
      // A frozen source-controlled report remains historical; no overwrite.
      const historicalReport = new URL(
        '../fixtures/trivia/history/phase-5-9-performance-A.json',
        import.meta.url,
      );
      expect(existsSync(historicalReport)).toBe(true);
      expect(JSON.parse(readFileSync(historicalReport, 'utf8')).label).toBe('A');
    } finally {
      cleanup(f);
    }
  }, 120_000);
});
