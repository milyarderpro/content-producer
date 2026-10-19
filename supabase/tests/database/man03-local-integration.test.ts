import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';

import {
  cleanup,
  content,
  editorial,
  fixture,
  generation,
  get,
  row,
  rpc as postRpc,
  save,
  sql,
} from './helpers/post-rpc.js';
import {
  factInput,
  reserve,
  reserved,
  rpc as triviaRpc,
} from './helpers/trivia-rpc.js';

// Real PostgreSQL RPC integration, using a throwaway locally migrated Supabase
// database and owner-scoped fixture. Never contacts production.
describe('MAN-03 local NASA seven-fact reservation and draft', () => {
  it('rejects truncated CAS, reserves seven verified facts, saves one draft, and reads it back', () => {
    const f = fixture();
    try {
      // Fix the fixture to the production-like SIX fractional digits. Only the
      // local fixture transaction temporarily bypasses touch_updated_at.
      const expected = '2026-10-19T10:33:17.018070Z';
      sql(
        "begin; set local session_replication_role = replica; " +
        "update public.page_niche_configs set updated_at = '" + expected +
        "'::timestamptz where page_id = (select id from public.pages where public_id = '" +
        f.page + "'); commit;",
      );
      f.configTime = row<{ t: string }>(
        "select internal.iso_timestamp_v1(n.updated_at) t from public.page_niche_configs n " +
        "join public.pages p on p.id=n.page_id where p.public_id='" + f.page + "'",
      ).t;
      expect(f.configTime).toBe(expected);

      const claims = [
        { text: "The Moon's cycle has eight named phases.", relation: 'has_count',
          subject: 'moon_phase_cycle', object: 'named_phases',
          numbers: [{ value: '8', unit: 'count', role: 'count' }], nasa: 'phases' },
        { text: 'From new Moon to new Moon takes about 29.5 days.', relation: 'has_measurement',
          subject: 'moon_synodic_cycle', object: 'synodic_period',
          numbers: [{ value: '29.5', unit: 'day', role: 'duration' }], nasa: 'questions' },
        { text: 'The Moon orbits Earth once in about 27.3 days.', relation: 'has_measurement',
          subject: 'moon_orbit', object: 'sidereal_period',
          numbers: [{ value: '27.3', unit: 'day', role: 'duration' }], nasa: 'questions' },
        { text: "Earth's shadow does not cause ordinary lunar phases.", relation: 'causes',
          subject: 'earth_shadow', object: 'ordinary_lunar_phases',
          numbers: [], negated: true, nasa: 'questions' },
        { text: "The same Moon phase looks inverted between Earth's hemispheres.",
          relation: 'has_named_part_or_property', subject: 'lunar_phase_appearance',
          object: 'opposite_hemisphere_orientation', numbers: [],
          location: 'Northern and Southern hemispheres', nasa: 'questions' },
        { text: "During crescent phases, earthshine dimly lights the Moon's darkened nearside.",
          relation: 'has_named_part_or_property', subject: 'moon_crescent',
          object: 'earthshine_illumination', numbers: [],
          condition: 'crescent phases', nasa: 'phases' },
        { text: 'At most latitudes, first-quarter Moons rise around midday.',
          relation: 'has_named_part_or_property', subject: 'first_quarter_moon',
          object: 'approximately_midday_rise', numbers: [],
          location: 'most latitudes', nasa: 'phases' },
      ] as const;

      const input = claims.map((c, i) => {
        const base = {
          position: i + 1,
          candidate: {
            candidate_key: 'man03moon' + (i + 1),
            claim_text: c.text,
            subject_key: c.subject,
            relation_key: c.relation,
            object_key: c.object,
            numbers: c.numbers,
            qualifiers: {
              negated: 'negated' in c ? c.negated : false,
              comparison_direction: 'none',
              ...('location' in c ? { location: c.location } : {}),
              ...('condition' in c ? { condition: c.condition } : {}),
            },
            topic_key: 'nature_science',
            normalization_version: 1,
            ontology_version: 1,
          },
          dedup_reviews: [],
          freshness_class: 'stable',
          as_of_date: null,
          requested_expires_at: '2027-10-19T00:00:00Z',
          risk_class: 'standard',
          verification_note: 'Moon claim checked against its original NASA Science section.',
          sources: [
            {
              schema_version: 1,
              url: c.nasa === 'phases'
                ? 'https://science.nasa.gov/moon/moon-phases/'
                : 'https://science.nasa.gov/moon/top-moon-questions/',
              canonical_url: c.nasa === 'phases'
                ? 'https://science.nasa.gov/moon/moon-phases/'
                : 'https://science.nasa.gov/moon/top-moon-questions/',
              title: c.nasa === 'phases' ? 'Moon Phases' : 'Top Moon Questions',
              publisher: 'NASA',
              tier: 'A',
              source_type: 'official',
              accessed_at: '2026-10-19T13:53:21.846Z',
              published_at: null,
              updated_at: c.nasa === 'phases' ? '2026-08-03' : '2026-02-12',
              as_of: null,
              language: 'en-US',
              supports: 'NASA Science supports this specifically qualified Moon fact: ' + c.text,
              independence_group: 'nasa_science',
            },
          ],
        };
        expect(Object.keys(base.sources[0]).length).toBe(14);
        return base;
      });

      const reservationToken = randomUUID();
      const truncated = expected.replace('.018070Z', '.018Z');
      expect(() => triviaRpc(f, reserve(f, input, randomUUID(), reservationToken, truncated,
        'workspace_unique', 30))).toThrow('FACT_RESERVATION_CONTEXT_CHANGED');
      expect(
        row<{ n: number }>(
          "select count(*) n from public.trivia_facts where workspace_id = " +
          "(select id from public.workspaces where public_id='" + f.workspace + "')",
        ).n,
      ).toBe(0);

      const result = triviaRpc(
        f, reserve(f, input, randomUUID(), reservationToken, expected, 'workspace_unique', 30),
      );
      const facts = reserved(result);
      expect(facts).toHaveLength(7);
      expect(facts.every((fact) => fact.canonical_action === 'created_new')).toBe(true);
      expect(facts.map((fact) => fact.canonical_claim)).toEqual(claims.map((c) => c.text));

      const bindings = facts.map((fact, i) => ({
        position: i + 1,
        fact_public_id: fact.fact_public_id,
        fact_role: 'general',
        rendered_text: fact.canonical_claim,
      }));
      const payload = content(bindings);
      payload.body = { subject: 'Moon phases', facts: bindings.map((b) => ({
        position: b.position,
        text: b.rendered_text,
      })) };
      payload.hook = 'Seven facts about the Moon';
      payload.cta = 'Follow for more space facts.';
      payload.canva_copy = [payload.hook, ...bindings.map((b) => b.rendered_text), payload.cta]
        .join('\n\n');
      payload.caption = 'Seven NASA-backed facts about Moon phases, orbit, and earthshine.';
      payload.hashtags = ['#MoonFacts', '#Astronomy', '#Space'];

      const request = {
        token: reservationToken,
        bindings,
        content: payload,
        generation: generation(f, 7),
        editorial: editorial(),
        key: randomUUID(),
        plan: null,
        schedule: null,
        format: 'single_subject_fast',
        topic: 'nature_science',
        goal: 'follow',
        configTime: expected,
      };
      const saved = postRpc(f, save(f, request)).data.post;
      expect(saved.status).toBe('draft');
      expect(saved.revision).toBe(1);
      expect(saved.fact_bindings).toHaveLength(7);
      expect(saved.content_hash).toMatch(/^[0-9a-f]{64}$/);
      expect(saved.system_checks.post_revision).toBe(1);
      const reread = get(f, saved.post_public_id);
      expect(reread.content_hash).toBe(saved.content_hash);
      expect(reread.fact_bindings).toHaveLength(7);
      expect(reread.status).toBe('draft');
      expect(
        row<{ count: number }>(
          "select count(*) count from public.posts where workspace_id=" +
          "(select id from public.workspaces where public_id='" + f.workspace + "')",
        ).count,
      ).toBe(1);
      expect(
        row<{ count: number }>(
          "select count(*) count from public.trivia_post_facts j " +
          "join public.posts p on p.id=j.post_id where p.public_id='" + saved.post_public_id +
          "' and j.is_current",
        ).count,
      ).toBe(7);
    } finally {
      cleanup(f);
    }
  }, 45_000);
});
