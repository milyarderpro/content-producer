import { writeFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { format, resolveConfig } from 'prettier';
import { goldCases } from '../fixtures/trivia/dedup-v1/gold-cases.js';
import { fixture, cleanup, rpc, json, quote, sql, source, digest } from './helpers/trivia-rpc.js';

describe('CR-016 source-free public gold retrieval', () => {
  it.each(['development', 'holdout'] as const)(
    'evaluates frozen %s pairs through authenticated api without automatic anti-merge signals',
    async (split) => {
      const f = fixture();
      const counts = {
        cases: 0,
        same: 0,
        same_found: 0,
        exact: 0,
        structured: 0,
        unsafe_auto_signals: 0,
      };
      try {
        for (const c of goldCases.filter((c) => c.split === split)) {
          const l = c.left;
          // Unverified fixture candidates are not production truths or registration proof.
          const id =
            sql(`insert into public.trivia_facts(workspace_id,claim_text,normalized_claim,claim_hash,
          subject_key,relation_key,object_key,numbers,qualifiers,structured_key,structured_hash,topic_key,dedup_review_snapshot,source_data)
          values((select id from public.workspaces where public_id='${f.workspace}'),${quote(l.claim_text)},'',repeat('0',64),
          ${quote(l.subject_key)},${quote(l.relation_key)},${quote(l.object_key)},${json(l.numbers)},${json(l.qualifiers)},'',repeat('0',64),
          ${quote(l.topic_key)},'{"schema_version":1,"identity_schema_version":1,"reviewed_at":"2026-10-12T00:00:00Z","evaluator":"chatgpt","decisions":[]}',
          ${json([source()])}) returning public_id::text`);
          const input = {
            ...c.right,
            candidate_key: 'public_gold',
            normalization_version: 1,
            ontology_version: 1,
            qualifiers: { negated: false, ...c.right.qualifiers },
          };
          const call = `api.trivia_find_similar_facts(1,'${f.workspace}','${f.page}',${json([input])},20)`;
          const result = rpc(f, call);
          expect(digest(rpc(f, call)), c.fixture_id).toBe(digest(result));
          const matches = (
            result.data.candidates as { matches: { fact_public_id: string; signals: string[] }[] }[]
          )[0]!.matches;
          const match = matches.find((x) => x.fact_public_id === id);
          counts.cases++;
          if (c.expected_decision === 'same') {
            counts.same++;
            expect(match, c.fixture_id).toBeDefined();
            if (match) counts.same_found++;
          }
          for (const signal of c.expected_signals.filter(
            (s) => s === 'exact_claim' || s === 'exact_structured',
          )) {
            expect(match?.signals, c.fixture_id).toContain(signal);
            if (signal === 'exact_claim') counts.exact++;
            else counts.structured++;
          }
          if (c.expected_decision !== 'same') {
            const unsafe = matches.some(
              (x) => x.signals.includes('exact_claim') || x.signals.includes('exact_structured'),
            );
            expect(unsafe, c.fixture_id).toBe(false);
            if (unsafe) counts.unsafe_auto_signals++;
          }
          expect(matches.every((x) => !x.signals.includes('source_overlap'))).toBe(true);
          sql(`delete from public.trivia_facts where public_id='${id}'`);
        }
        expect(counts.cases).toBe(split === 'development' ? 105 : 45);
        expect(counts.same_found).toBe(counts.same);
        const label = process.env.CR016_EVIDENCE_RUN;
        if (label === 'A' || label === 'B')
          writeFileSync(
            `docs/phase-5-batch-b-remediation-gold-${split}-${label}.json`,
            await format(JSON.stringify({ split, counts }), {
              ...(await resolveConfig('docs/phase-5-batch-b-remediation-gold-development-A.json')),
              parser: 'json',
            }),
          );
        console.info(`CR-016 public ${split}: ${JSON.stringify(counts)}`);
      } finally {
        cleanup(f);
      }
    },
    180_000,
  );
});
