import { describe, expect, it } from 'vitest';
import renderFixtures from './fixtures/post-render-v1.json';
import {
  cleanup,
  content,
  fixture,
  json,
  request,
  row,
  rpc,
  save,
  sql,
} from './helpers/post-rpc.js';

describe('Checkpoint 5.6 canonical renderer/quality', () => {
  it('QUALITY-001 persisted golden fixtures and exact character/line/replay boundaries', () => {
    for (const golden of renderFixtures.golden) {
      const payload = content(
        golden.facts.map((text, i) => ({
          position: i + 1,
          fact_public_id: 'unused',
          fact_role: 'general',
          rendered_text: text,
        })),
        golden.style,
      );
      const rendered = row<{ r: { canva_copy: string; text_metrics: unknown } }>(
        `select internal.post_render_v1(${json(payload)}) r`,
      ).r;
      expect(rendered.canva_copy, golden.fixture_id).toBe(golden.expected_copy);
      expect(rendered.text_metrics, golden.fixture_id).toEqual(golden.expected_metrics);
    }
    for (const boundary of renderFixtures.boundaries) {
      const texts =
        boundary.fact_lengths?.map((n) => 'a'.repeat(n)) ??
        Array.from({ length: boundary.fact_count ?? 1 }, () =>
          boundary.words_per_fact
            ? Array.from({ length: boundary.words_per_fact }, () => 'a').join(' ')
            : 'a'.repeat(boundary.fact_chars!),
        );
      const payload = content(
        texts.map((text, i) => ({
          position: i + 1,
          fact_public_id: 'unused',
          fact_role: 'general',
          rendered_text: text,
        })),
      );
      const hook = boundary.hook_chars ? 'h'.repeat(boundary.hook_chars) : String(payload.hook);
      const cta = boundary.cta_words
        ? Array.from({ length: boundary.cta_words }, () => 'a').join(' ')
        : String(payload.cta);
      const input = { ...payload, hook, cta, canva_copy: [hook, ...texts, cta].join('\n\n') };
      if (boundary.expected_error) {
        expect(
          () => row(`select internal.post_render_v1(${json(input)}) r`),
          boundary.fixture_id,
        ).toThrow(boundary.expected_error);
      } else {
        const rendered = row<{ r: { text_metrics: Record<string, number> } }>(
          `select internal.post_render_v1(${json(input)}) r`,
        ).r;
        if (boundary.expected_line_count)
          expect(rendered.text_metrics.line_count, boundary.fixture_id).toBe(
            boundary.expected_line_count,
          );
        if (boundary.expected_word_count) {
          expect(rendered.text_metrics.word_count, boundary.fixture_id).toBe(
            boundary.expected_word_count,
          );
          expect(rendered.text_metrics.estimated_read_seconds, boundary.fixture_id).toBe(
            boundary.expected_read_seconds,
          );
          expect(rendered.text_metrics.replay_ratio, boundary.fixture_id).toBe(
            boundary.expected_ratio,
          );
        }
        if (boundary.expected_status) {
          const evidence = row<{ s: { checks: { id: string; status: string }[] } }>(
            `select internal.post_system_v1(internal.post_render_v1(${json(input)}),internal.default_trivia_config_v1()||'{"profile_key":"fast_trivia"}'::jsonb,repeat('0',64),1) s`,
          ).s;
          expect(
            evidence.checks.find((c) => c.id === 'trivia.readability.hard_limits')?.status,
            boundary.fixture_id,
          ).toBe(boundary.expected_status);
        }
      }
    }
  });
  it('QUALITY-001 golden plain/numbered metrics, Unicode words, wrapping and LF normalization', () => {
    const facts = [
      {
        position: 1,
        fact_public_id: 'unused',
        fact_role: 'general',
        rendered_text: "Café cats don't need mother-in-law trivia.",
      },
    ];
    for (const style of ['plain_lines', 'numbered']) {
      const p = content(facts, style);
      const rendered = row<{ r: Record<string, unknown> }>(
        `select internal.post_render_v1(${json(p)}) r`,
      ).r;
      expect(rendered.canva_copy).toBe(p.canva_copy);
      const m = rendered.text_metrics as Record<string, unknown>;
      expect(m.fact_word_counts).toEqual([6]);
      expect(m.facts_total_chars).toBe(
        facts[0]!.rendered_text.length + (style === 'numbered' ? 3 : 0),
      );
      expect(m.word_count).toBe(style === 'numbered' ? 16 : 15);
      expect(m.estimated_read_seconds).toBe(style === 'numbered' ? 5.9 : 5.6);
      expect(row<{ r: unknown }>(`select internal.post_render_v1(${json(rendered)}) r`).r).toEqual(
        rendered,
      );
      const decomposed = {
        ...p,
        hook: '  Did you know?  ',
        body: {
          subject: 'Cafe\u0301',
          facts: [{ position: 1, text: facts[0]!.rendered_text.replace('é', 'e\u0301') }],
        },
        canva_copy: ` ${String(p.canva_copy).replaceAll('\n', '\r\n').replace('é', 'e\u0301')}  `,
      };
      expect(
        row<{ r: { canva_copy: string } }>(`select internal.post_render_v1(${json(decomposed)}) r`)
          .r.canva_copy,
      ).toBe(p.canva_copy);
    }
    expect(row<{ n: number }>(`select internal.post_lines_v1('one two three four',7) n`).n).toBe(3);
    expect(
      row<{ n: number }>(`select internal.post_words_v1('naïve co-operate it’s café') n`).n,
    ).toBe(4);
    const base = content(facts);
    for (const bad of [
      'https://example.test',
      'www.example.test',
      'bad\ttext',
      'bad\u0001text',
      'bad\ntext',
      '```text',
      'Emoji 🐈',
      'hidden\u200btext',
      '[1] citation',
      '**bold**',
    ]) {
      expect(() => row(`select internal.post_render_v1(${json({ ...base, hook: bad })})`)).toThrow(
        /^CONTENT_PAYLOAD_INVALID$/,
      );
    }
    expect(() =>
      row(
        `select internal.post_render_v1(${json({ ...base, canva_copy: `${base.canva_copy}!` })})`,
      ),
    ).toThrow(/^CONTENT_RENDER_MISMATCH$/);
    expect(() =>
      row(`select internal.post_render_v1(${json({ ...base, text_metrics: { word_count: 1 } })})`),
    ).toThrow(/^CONTENT_PAYLOAD_INVALID$/);
  });
  it('RPC-BUDGET quality failures persist drafts; formats/profiles share server authority', () => {
    const f = fixture();
    try {
      for (const style of ['plain_lines', 'numbered']) {
        sql(
          `update public.page_niche_configs set config=jsonb_set(config,'{render_style}',${json(style)}) where page_id=(select id from public.pages where public_id='${f.page}')`,
        );
        f.configTime = row<{ t: string }>(
          `select internal.iso_timestamp_v1(updated_at) t from public.page_niche_configs where page_id=(select id from public.pages where public_id='${f.page}')`,
        ).t;
        for (const format of [
          'single_subject_fast',
          'themed_utility',
          'emotional_animal_collection',
          'comparison',
          'myth_vs_fact',
        ])
          for (const profile of ['fast_trivia', 'practical_utility']) {
            const r = request(f);
            r.format = format;
            r.generation.profile_key = profile;
            r.content = content(r.bindings, style);
            const p = rpc(f, save(f, r)).data.post;
            expect(p.status).toBe('draft');
            expect(p.system_checks.evaluator).toBe('server');
            expect((p.content_payload.text_metrics as Record<string, unknown>).word_count).toBe(
              style === 'numbered' ? 19 : 14,
            );
          }
      }
      sql(`update public.page_niche_configs set config=jsonb_set(config,'{text_budget,hook_max_chars}','5'::jsonb)
        where page_id=(select id from public.pages where public_id='${f.page}')`);
      f.configTime = row<{ t: string }>(
        `select internal.iso_timestamp_v1(updated_at) t from public.page_niche_configs where page_id=(select id from public.pages where public_id='${f.page}')`,
      ).t;
      const failing = request(f);
      failing.content = content(failing.bindings, 'numbered');
      const failed = rpc(f, save(f, failing)).data.post;
      expect(failed.quality_status).toBe('failed');
      expect(failed.system_checks.overall_status).toBe('failed');
    } finally {
      cleanup(f);
    }
  }, 60_000);
  it('QUALITY-003 editorial closed allowlist/severity and missing review cannot fabricate approval', () => {
    const f = fixture();
    try {
      const r = request(f);
      const criteria = r.editorial.criteria as Record<string, unknown>[];
      for (const editorial of [
        { ...r.editorial, post_revision: 1 },
        { ...r.editorial, criteria: [{ ...criteria[0], severity: 'noncritical' }] },
        { ...r.editorial, criteria: [criteria[0], criteria[0]] },
        { ...r.editorial, risk_flags: ['anything'] },
        { ...r.editorial, criteria: [{ ...criteria[0], id: 'unknown' }] },
      ]) {
        expect(() => rpc(f, save(f, { ...r, editorial }))).toThrow(/^VALIDATION_FAILED$/);
      }
      const pending = rpc(
        f,
        save(f, { ...r, editorial: { ...r.editorial, criteria: [criteria[0]] } }),
      ).data.post;
      expect(pending.quality_status).toBe('pending');
      expect(pending.status).toBe('draft');
      const next = request(f);
      next.editorial = {
        ...next.editorial,
        overall_status: 'needs_review',
        criteria: [{ ...criteria[0], status: 'needs_review' }],
      };
      expect(rpc(f, save(f, next)).data.post.quality_status).toBe('failed');
    } finally {
      cleanup(f);
    }
  }, 30_000);
  it('RPC-BUDGET independent final overflow and word/line/replay limits persist blocking draft checks', () => {
    const f = fixture();
    try {
      sql(`update public.page_niche_configs set config=jsonb_set(jsonb_set(config,'{text_budget,hook_max_chars}','90'),'{text_budget,cta_max_chars}','100')
        where page_id=(select id from public.pages where public_id='${f.page}')`);
      f.configTime = row<{ t: string }>(
        `select internal.iso_timestamp_v1(updated_at) t from public.page_niche_configs where page_id=(select id from public.pages where public_id='${f.page}')`,
      ).t;
      const r = request(f, 6);
      r.bindings = r.bindings.map((b) => ({ ...b, rendered_text: 'a'.repeat(80) }));
      r.content = content(r.bindings);
      r.content = {
        ...r.content,
        hook: 'h'.repeat(90),
        cta: 'c'.repeat(100),
        canva_copy: [
          'h'.repeat(90),
          ...r.bindings.map((b) => b.rendered_text),
          'c'.repeat(100),
        ].join('\n\n'),
      };
      const p = rpc(f, save(f, r)).data.post;
      const checks = p.system_checks.checks as { id: string; status: string }[];
      expect(checks.find((c) => c.id === 'trivia.render.component_budget')?.status).toBe('passed');
      expect(checks.find((c) => c.id === 'trivia.render.final_budget')?.status).toBe('failed');
      expect(p.quality_status).toBe('failed');
      const dense = request(f, 9);
      dense.bindings = dense.bindings.map((b) => ({
        ...b,
        rendered_text: Array.from({ length: 18 }, () => 'a').join(' '),
      }));
      dense.content = content(dense.bindings);
      const draft = rpc(f, save(f, dense)).data.post;
      const m = draft.content_payload.text_metrics as Record<string, number>;
      expect(m.word_count).toBeGreaterThan(100);
      expect(m.line_count).toBeGreaterThan(28);
      expect(m.replay_ratio).toBeGreaterThan(2.5);
      expect(m.estimated_loops).toBeGreaterThan(3);
      expect(draft.system_checks.overall_status).toBe('failed');
      expect(draft.status).toBe('draft');
      const bad = request(f);
      for (const payload of [
        { ...bad.content, hashtags: ['#Trivia', '#trivia'] },
        { ...bad.content, caption: 'https://example.test' },
        { ...bad.content, server_checks: { passed: true } },
        { ...bad.content, hashtags: ['#Viral'] },
      ]) {
        expect(() => rpc(f, save(f, { ...bad, content: payload }))).toThrow(
          /^CONTENT_PAYLOAD_INVALID$/,
        );
      }
    } finally {
      cleanup(f);
    }
  }, 30_000);
});
