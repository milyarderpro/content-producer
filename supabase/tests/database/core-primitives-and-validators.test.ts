import { describe, expect, it } from 'vitest';
import { json, row } from './helpers/trivia-rpc.js';

import { localQuery as query, localQueryAsync as queryAsync } from './helpers/local-query.js';

describe('Phase 3 core validators and private primitives', () => {
  it('validates versions and classifies private replay and schedule conflicts', () => {
    const suffix = `${process.pid}${Date.now()}`;
    expect(() =>
      query(`
      do $$ declare u uuid := extensions.gen_random_uuid(); other_actor uuid := extensions.gen_random_uuid(); w bigint; p bigint; plan bigint; item bigint; first_id bigint; state text; replay_snapshot jsonb; begin
        if not internal.is_valid_workspace_settings_v1('{"schema_version":1,"reservation_ttl_minutes":30,"default_post_status":"draft","default_plan_chunk_size":4}'::jsonb) then raise exception 'valid workspace settings rejected'; end if;
        if internal.is_valid_workspace_settings_v1('{"schema_version":1}'::jsonb) then raise exception 'incomplete workspace settings accepted'; end if;
        if not internal.is_valid_trivia_config_v1(internal.default_trivia_config_v1()) then raise exception 'valid trivia config rejected'; end if;
        if internal.is_valid_trivia_config_v1(internal.default_trivia_config_v1() || '{"unknown":true}'::jsonb) then raise exception 'unknown trivia key accepted'; end if;
        insert into auth.users (instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at) values ('00000000-0000-0000-0000-000000000000',u,'authenticated','authenticated','phase3-core-${suffix}@example.test','x',now(),'{}','{}',now(),now());
        insert into public.workspaces(owner_user_id,name,slug) values(u,'Core','phase3-core-${suffix}') returning id into w;
        insert into public.pages(workspace_id,name,slug) values(w,'Core','phase3-core-page-${suffix}') returning id into p;
        insert into public.page_niche_configs(workspace_id,page_id,niche_key,config) values(w,p,'trivia',internal.default_trivia_config_v1());
        insert into public.content_plans(workspace_id,page_id,niche_key,requested_count) values(w,p,'trivia',1) returning id into plan;
        insert into public.content_plan_items(workspace_id,plan_id,page_id,niche_key,position,scheduled_at) values(w,plan,p,'trivia',1,'2040-01-01 00:00+00') returning id into item;
        select claim_state, operation_id into state, first_id from internal.claim_operation(w,u,'00000000-0000-4000-8000-000000000001','save_post.v1',1,repeat('a',64));
        if state <> 'first_use' then raise exception 'first claim failed'; end if;
        create temporary table replay_mutation_markers (operation_id bigint primary key, marker text not null) on commit drop;
        insert into replay_mutation_markers(operation_id, marker) values(first_id, 'created-once');
        select claim_state into state from internal.claim_operation(w,u,'00000000-0000-4000-8000-000000000001','save_post.v1',1,repeat('a',64));
        if state <> 'in_progress' then raise exception 'in-progress replay failed'; end if;
        if (select count(*) from replay_mutation_markers where operation_id = first_id) <> 1 then raise exception 'in-progress replay duplicated mutation'; end if;
        update internal.operation_ledger set completed_at = now(), response_snapshot = '{"mutation_marker":"once"}'::jsonb where id = first_id;
        select claim_state, response_snapshot into state, replay_snapshot from internal.claim_operation(w,u,'00000000-0000-4000-8000-000000000001','save_post.v1',1,repeat('a',64));
        if state <> 'replay' or replay_snapshot <> '{"mutation_marker":"once"}'::jsonb then raise exception 'completed replay mismatch'; end if;
        if (select count(*) from internal.operation_ledger where workspace_id = w and operation_key = '00000000-0000-4000-8000-000000000001'::uuid) <> 1 then raise exception 'replay created another ledger row'; end if;
        if (select count(*) from replay_mutation_markers where operation_id = first_id) <> 1 then raise exception 'completed replay duplicated mutation'; end if;
        begin perform internal.claim_operation(w,u,'00000000-0000-4000-8000-000000000001','other.v1',1,repeat('a',64)); raise exception 'mismatch accepted'; exception when sqlstate 'P0001' then if sqlerrm <> 'OPERATION_KEY_REUSED' then raise; end if; end;
        begin perform internal.claim_operation(w,other_actor,'00000000-0000-4000-8000-000000000001','save_post.v1',1,repeat('a',64)); raise exception 'actor mismatch accepted'; exception when sqlstate 'P0001' then if sqlerrm <> 'OPERATION_KEY_REUSED' then raise; end if; end;
        begin perform internal.claim_operation(w,u,'00000000-0000-4000-8000-000000000001','save_post.v1',2,repeat('a',64)); raise exception 'schema mismatch accepted'; exception when sqlstate 'P0001' then if sqlerrm <> 'OPERATION_KEY_REUSED' then raise; end if; end;
        begin perform internal.claim_operation(w,u,'00000000-0000-4000-8000-000000000001','save_post.v1',1,repeat('b',64)); raise exception 'hash mismatch accepted'; exception when sqlstate 'P0001' then if sqlerrm <> 'OPERATION_KEY_REUSED' then raise; end if; end;
        begin perform internal.assert_page_schedule_available(p,'2040-01-01 00:00+00',null,null); raise exception 'cross-table schedule accepted'; exception when sqlstate 'P0001' then if sqlerrm <> 'SCHEDULE_CONFLICT' then raise; end if; end;
        if has_function_privilege('authenticated','internal.claim_operation(bigint,uuid,uuid,text,integer,text)','execute') or has_function_privilege('anon','internal.assert_page_schedule_available(bigint,timestamp with time zone,bigint,bigint)','execute') then raise exception 'caller helper privilege'; end if;
        delete from public.content_plan_items where id=item; delete from public.content_plans where id=plan; delete from internal.operation_ledger where id=first_id; delete from public.page_niche_configs where page_id=p; delete from public.pages where id=p; delete from public.workspaces where id=w; delete from auth.users where id=u;
      end $$;
    `),
    ).not.toThrow();
  }, 60_000);

  it('serializes cross-session Page schedule contention', async () => {
    const suffix = `${process.pid}${Date.now()}`;
    const slug = `phase3-lock-${suffix}`;
    query(
      `do $$ declare u uuid := extensions.gen_random_uuid(); w bigint; p bigint; begin insert into auth.users (instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at) values ('00000000-0000-0000-0000-000000000000',u,'authenticated','authenticated','${slug}@example.test','x',now(),'{}','{}',now(),now()); insert into public.workspaces(owner_user_id,name,slug) values(u,'Lock','${slug}') returning id into w; insert into public.pages(workspace_id,name,slug) values(w,'Lock','${slug}-page') returning id into p; insert into public.page_niche_configs(workspace_id,page_id,niche_key,config) values(w,p,'trivia',internal.default_trivia_config_v1()); insert into public.content_plans(workspace_id,page_id,niche_key,requested_count) values(w,p,'trivia',1); end $$;`,
    );
    const writePlanItem = `do $$ declare p bigint := (select pages.id from public.pages join public.workspaces on workspaces.id = pages.workspace_id where workspaces.slug = '${slug}'); plan_id bigint := (select content_plans.id from public.content_plans join public.pages on pages.id = content_plans.page_id where pages.id = p); begin perform internal.assert_page_schedule_available(p,'2041-01-01 00:00+00'); insert into public.content_plan_items(workspace_id,plan_id,page_id,niche_key,position,scheduled_at) select workspace_id,plan_id,p,'trivia',1,'2041-01-01 00:00+00' from public.pages where id=p; perform pg_sleep(1); end $$;`;
    const writePost = `do $$ declare p bigint := (select pages.id from public.pages join public.workspaces on workspaces.id = pages.workspace_id where workspaces.slug = '${slug}'); payload jsonb := '{"schema_version":1,"hook":"Did you know?","body":{},"cta":"Share this.","canva_copy":"Did you know? Share this.","caption":"Trivia.","hashtags":[],"render_style":"plain_lines","text_metrics":{}}'; snapshot jsonb := '{"config_schema_version":1,"fact_count":{},"fact_count_applied":5,"fact_count_override":false,"text_budget":{},"fact_reuse_scope":"workspace_unique","profile_key":"fast_trivia","render_style":"plain_lines","target_markets":["US"],"locale":"en-US"}'; begin perform internal.assert_page_schedule_available(p,'2041-01-01 00:00+00'); insert into public.posts(workspace_id,page_id,niche_key,format_key,topic_key,interaction_goal,scheduled_at,content_payload,generation_snapshot,content_hash) select workspace_id,p,'trivia','single_subject_fast','animals','share','2041-01-01 00:00+00',payload,snapshot,repeat('b',64) from public.pages where id=p; end $$;`;
    try {
      const first = queryAsync(writePlanItem);
      await new Promise((resolve) => setTimeout(resolve, 150));
      const second = queryAsync(writePost);
      const results = await Promise.all([first, second]);
      expect(results.filter((result) => result.code === 0)).toHaveLength(1);
      expect(results.find((result) => result.code !== 0)?.output).toContain('SCHEDULE_CONFLICT');
    } finally {
      query(
        `do $$ declare u uuid := (select owner_user_id from public.workspaces where slug = '${slug}'); w bigint := (select id from public.workspaces where slug = '${slug}'); begin delete from public.posts where workspace_id = w; delete from public.content_plan_items where workspace_id = w; delete from public.content_plans where workspace_id = w; delete from public.page_niche_configs where workspace_id = w; delete from public.pages where workspace_id = w; delete from public.workspaces where id = w; delete from auth.users where id = u; end $$;`,
      );
    }
  }, 60_000);

  it('permits independent slots and supports self-exclusion', () => {
    const suffix = `${process.pid}${Date.now()}`;
    expect(() =>
      query(`
        do $$ declare u uuid := extensions.gen_random_uuid(); w bigint; one_page bigint; two_page bigint; plan bigint; item bigint; begin
          insert into auth.users (instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at) values ('00000000-0000-0000-0000-000000000000',u,'authenticated','authenticated','phase3-slots-${suffix}@example.test','x',now(),'{}','{}',now(),now());
          insert into public.workspaces(owner_user_id,name,slug) values(u,'Slots','phase3-slots-${suffix}') returning id into w;
          insert into public.pages(workspace_id,name,slug) values(w,'One','phase3-slots-one-${suffix}') returning id into one_page;
          insert into public.pages(workspace_id,name,slug) values(w,'Two','phase3-slots-two-${suffix}') returning id into two_page;
          insert into public.page_niche_configs(workspace_id,page_id,niche_key,config) values(w,one_page,'trivia',internal.default_trivia_config_v1()),(w,two_page,'trivia',internal.default_trivia_config_v1());
          insert into public.content_plans(workspace_id,page_id,niche_key,requested_count) values(w,one_page,'trivia',1) returning id into plan;
          insert into public.content_plan_items(workspace_id,plan_id,page_id,niche_key,position,scheduled_at) values(w,plan,one_page,'trivia',1,'2043-01-01 00:00+00') returning id into item;
          perform internal.assert_page_schedule_available(two_page,'2043-01-01 00:00+00');
          perform internal.assert_page_schedule_available(one_page,'2043-01-01 01:00+00');
          perform internal.assert_page_schedule_available(one_page,'2043-01-01 00:00+00',item,null);
          begin perform internal.assert_page_schedule_available(one_page,'2043-01-01 00:00+00',null,null); raise exception 'other slot conflict accepted'; exception when sqlstate 'P0001' then if sqlerrm <> 'SCHEDULE_CONFLICT' then raise; end if; end;
          delete from public.content_plan_items where id=item; delete from public.content_plans where id=plan; delete from public.page_niche_configs where workspace_id=w; delete from public.pages where workspace_id=w; delete from public.workspaces where id=w; delete from auth.users where id=u;
        end $$;
      `),
    ).not.toThrow();
  }, 60_000);
});


// CR-062 task4: pure renderer fixtures, never production facts or owner writes.
const config2Ceiling = {
  hook_max_chars: 120, fact_max_chars: 160, facts_total_max_chars: 900,
  cta_max_chars: 180, canva_total_max_chars: 1100,
  hook_max_words: 18, fact_max_words: 30, cta_max_words: 32, canva_total_max_words: 160,
};
function renderRules(style = 'plain_lines', emoji = 'optional') {
  return {
    config_schema_version: 2, fact_count: { mode: 'adaptive', min: 1, preferred: 8, max: 12 },
    text_budget: { ...config2Ceiling }, render_style: style,
    caption: { max_chars: 500 }, hashtags: { min_count: 0, default_count: 3, max_count: 5 },
    hard_limits: { emoji_policy: emoji },
  };
}
function renderInput(facts = ['Cats can purr.', 'Birds can fly.'],
  cta = 'Share this with a curious friend.', hook = 'Did you know?',
  style = 'plain_lines', after?: number) {
  const lines = facts.map((text, i) => style === 'numbered' ? `${i + 1}. ${text}` : text);
  const parts = [hook];
  lines.forEach((line, i) => { parts.push(line); if (i + 1 === (after ?? lines.length)) parts.push(cta); });
  return {
    schema_version: 2, hook, body: { facts: facts.map((text, i) => ({ position: i + 1, text })) },
    cta, canva_copy: parts.join('\n\n'), caption: 'Fixture only.', hashtags: [] as string[],
    render_style: style, text_metrics: {} as Record<string, unknown>,
    ...(after === undefined ? {} : { cta_placement: { kind: 'after_fact', position: after } }),
  };
}
type RenderInput = ReturnType<typeof renderInput>;
type RenderRules = ReturnType<typeof renderRules>;
type RenderOutput = {
  content_payload: RenderInput & { cta_placement: { kind: string; position?: number } };
  cta_actions: string[] | null; interaction_goal: string | null;
  render_hash: string; render_hash_version: number; readability: string;
};
function renderExpression(payload: RenderInput, rules = renderRules(), goal?: string | null,
  actions?: unknown): string {
  const extra = goal === undefined && actions === undefined ? ''
    : `,${goal == null ? 'null' : "'" + goal + "'"},${actions === undefined ? 'null' : json(actions)}`;
  return `internal.post_render_config2_v2(${json(payload)},${json(rules)}${extra})`;
}
function render(payload = renderInput(), rules = renderRules(), goal?: string | null,
  actions?: unknown): RenderOutput {
  return row<{ rendered: RenderOutput }>(`select ${renderExpression(payload, rules, goal, actions)} rendered`).rendered;
}
function rejected(expression: string, error: string): void {
  expect(() => query(`do $$ begin
    begin perform ${expression}; raise exception 'FIXTURE_UNEXPECTED_ACCEPT';
    exception when sqlstate 'P0001' then if sqlerrm <> '${error}' then raise; end if; end;
  end $$;`)).not.toThrow();
}

describe('CR-062 config2 deterministic renderer and optional CTA metadata', () => {
  it.each([1, 10, 11, 12])('accepts %i facts independently of legacy count and profile preference', (n) => {
    const out = render(renderInput(Array.from({ length: n }, (_, i) => `Fixture ${i + 1}.`)));
    expect(out.content_payload.body.facts).toHaveLength(n);
    expect(out.content_payload.body.facts.at(-1)?.position).toBe(n);
    expect(out.interaction_goal).toBeNull();
    expect(out.cta_actions).toBeNull();
  });

  it('rejects zero, thirteen and malformed fact positions without truncating', () => {
    for (const n of [0, 13]) rejected(renderExpression(renderInput(Array.from({ length: n }, () => 'Fact.'))), 'CONTENT_PAYLOAD_INVALID');
    const bad = renderInput(); bad.body.facts[1]!.position = 1;
    rejected(renderExpression(bad), 'CONTENT_PAYLOAD_INVALID');
    const badText = renderInput(['One.\nTwo.']);
    rejected(renderExpression(badText), 'CONTENT_PAYLOAD_INVALID');
  });

  it('locks a golden copy, all metrics and render hash; SQL roundtrip stays exact', () => {
    const out = render();
    expect(out.content_payload.canva_copy).toBe('Did you know?\n\nCats can purr.\n\nBirds can fly.\n\nShare this with a curious friend.');
    expect(out.content_payload.text_metrics).toEqual({
      hook_chars: 13, fact_chars: [14, 14], facts_total_chars: 30, cta_chars: 33,
      canva_total_chars: 80, word_count: 15, fact_word_counts: [3, 3], line_count: 7,
      fact_line_counts: [1, 1], hook_word_count: 3, cta_word_count: 6,
      hook_line_count: 1, cta_line_count: 1, estimated_read_seconds: 5.9,
      replay_ratio: 0.45384615384615384, estimated_loops: 1, estimator_version: 1,
      line_width_chars: 34, target_video_seconds: 13,
    });
    expect(out.content_payload.cta_placement).toEqual({ kind: 'after_facts' });
    expect(out.render_hash).toBe('0ce7f7b7fd42237fb41b0292a5561bacaa6c0747bb238f5d2d3bac9c89b29ed3');
    const expression = renderExpression(renderInput());
    expect(row<{ same: boolean }>(`with r as (select ${expression} v) select v=
      internal.post_render_config2_v2(v->'content_payload',${json(renderRules())}) same from r`).same).toBe(true);
    const fake = renderInput(); fake.text_metrics = { word_count: 0 };
    rejected(renderExpression(fake), 'CONTENT_PAYLOAD_INVALID');
  });

  it('preserves numbered positions 10–12 and counts prefixes in full/block metrics', () => {
    const out = render(renderInput(Array(12).fill('Fact.'), 'Follow.', 'Know?', 'numbered'), renderRules('numbered'));
    expect(out.content_payload.canva_copy).toContain('10. Fact.\n\n11. Fact.\n\n12. Fact.');
    expect(out.content_payload.text_metrics.fact_chars).toEqual(Array(12).fill(5));
    expect(out.content_payload.text_metrics.facts_total_chars).toBe(121);
    expect(out.content_payload.text_metrics.word_count).toBe(26);
  });

  it.each([
    ['Daily Facts', 'Like the facts? Like the video and follow for more!'],
    ['DYK question + like', 'Which detail stood out? Like the video if you enjoyed it.'],
    ['DYK like + tag', 'Like the video and tag a curious friend!'],
    ['ambiguous unlabeled', 'Keep this one in mind.'],
    ['synthetic three-plus actions', 'Like the video, tag a friend, save it, and follow for more.'],
  ])('accepts %s CTA with no mandatory goal or labels', (_label, cta) => {
    const payload = renderInput(undefined, cta);
    const omitted = render(payload);
    const explicitNull = render(payload, renderRules(), null, null);
    expect(omitted).toEqual(explicitNull);
    expect(omitted.content_payload.cta).toBe(cta);
    expect(render(payload, renderRules(), 'save').content_payload.cta).toBe(cta);
  });

  it('preserves four CTA lines and blank lines between facts; counts only facts in block', () => {
    const cta = 'Like this?\nTag a friend.\nSave it.\nFollow for more!';
    const out = render(renderInput(undefined, cta, undefined, undefined, 1));
    expect(out.content_payload.canva_copy).toBe('Did you know?\n\nCats can purr.\n\nLike this?\nTag a friend.\nSave it.\nFollow for more!\n\nBirds can fly.');
    expect(out.content_payload.body.facts).toEqual(renderInput().body.facts);
    expect(out.content_payload.text_metrics).toEqual(expect.objectContaining({
      cta_chars: 50, cta_line_count: 4, line_count: 10, facts_total_chars: 30,
      canva_total_chars: 97, word_count: 19,
    }));
    const blank = render(renderInput(undefined, 'Like this?\n\nFollow.', undefined, undefined, 1));
    expect(blank.content_payload.cta).toBe('Like this?\n\nFollow.');
    expect(blank.content_payload.text_metrics.cta_line_count).toBe(3);
  });

  it('inserts CTA after fact six of seven without renumbering or losing final fact', () => {
    const facts = Array.from({ length: 7 }, (_, i) => `Fact ${i + 1}.`);
    const out = render(renderInput(facts, 'Like and follow.', 'Know?', 'numbered', 6), renderRules('numbered'));
    expect(out.content_payload.canva_copy).toContain('6. Fact 6.\n\nLike and follow.\n\n7. Fact 7.');
    expect(out.content_payload.body.facts.map((f) => f.position)).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(out.content_payload.text_metrics.facts_total_chars).toBe(82);
  });

  it('rejects unsupported placement and a copy assembled at a different placement', () => {
    for (const placement of [null, 'after_facts', { kind: 'before_hook' }, { kind: 'after_fact', position: 0 },
      { kind: 'after_fact', position: 3 }, { kind: 'after_fact', position: 1.5 },
      { kind: 'after_facts', position: 2 }, { kind: 'after_fact', position: 1, extra: true }]) {
      const bad = { ...renderInput(), cta_placement: placement } as unknown as RenderInput;
      rejected(renderExpression(bad), 'CONTENT_PAYLOAD_INVALID');
    }
    const wrong = renderInput(); Object.assign(wrong, { cta_placement: { kind: 'after_fact', position: 1 } });
    rejected(renderExpression(wrong), 'CONTENT_RENDER_MISMATCH');
  });

  it('accepts empty, incomplete, new and many descriptive labels without hierarchy', () => {
    const payload = renderInput(undefined, 'Like, save, follow and send this to a friend.');
    for (const actions of [[], ['tag'], ['react', 'save', 'follow', 'send_to_a_friend'],
      Array.from({ length: 40 }, (_, i) => `new_action_${i}`)]) {
      const out = render(payload, renderRules(), null, actions);
      expect(out.cta_actions).toEqual(actions);
      expect(out.interaction_goal).toBeNull();
    }
    expect(render(payload, renderRules(), null, [' future action ']).cta_actions).toEqual(['future action']);
    expect(render(payload).render_hash).not.toBe(render(payload, renderRules(), null, []).render_hash);
    expect(render(payload, renderRules(), 'comment', ['tag']).interaction_goal).toBe('comment');
    for (const actions of [{ primary: 'react' }, [''], [null], ['a'.repeat(81)], ['a'.repeat(4097)], ['two\nlines']]) {
      // Unsafe label text shares the text primitive's payload error; malformed metadata uses validation error.
      rejected(renderExpression(payload, renderRules(), null, actions),
        Array.isArray(actions) && actions[0] === 'two\nlines' ? 'CONTENT_PAYLOAD_INVALID' : 'VALIDATION_FAILED');
    }
    rejected(renderExpression(payload, renderRules(), 'react'), 'VALIDATION_FAILED');
  });

  it.each([
    ['hook', 120], ['fact', 160], ['cta', 180],
  ] as const)('enforces %s character ceiling exactly at %i', (component, max) => {
    const make = (n: number) => renderInput([component === 'fact' ? 'a'.repeat(n) : 'Fact.'],
      component === 'cta' ? 'a'.repeat(n) : 'Follow.', component === 'hook' ? 'a'.repeat(n) : 'Know?');
    expect(() => render(make(max))).not.toThrow();
    rejected(renderExpression(make(max + 1)), 'CONTENT_BUDGET_EXCEEDED');
  });

  it('enforces 900-character fact block and 1100-character full copy including separators', () => {
    const block = renderInput([...Array(5).fill('a'.repeat(160)), 'b'.repeat(90)], 'C', 'H');
    expect(render(block).content_payload.text_metrics.facts_total_chars).toBe(900);
    rejected(renderExpression(renderInput([...Array(5).fill('a'.repeat(160)), 'b'.repeat(91)], 'C', 'H')), 'CONTENT_BUDGET_EXCEEDED');
    const full = renderInput([...Array(4).fill('a'.repeat(158)), 'b'.repeat(156)], 'c'.repeat(180), 'h'.repeat(120));
    expect(render(full).content_payload.text_metrics.canva_total_chars).toBe(1100);
    rejected(renderExpression(renderInput([...Array(4).fill('a'.repeat(158)), 'b'.repeat(157)], 'c'.repeat(180), 'h'.repeat(120))), 'CONTENT_BUDGET_EXCEEDED');
  });

  it.each([['hook', 18], ['fact', 30], ['cta', 32]] as const)('enforces %s word ceiling exactly at %i', (component, max) => {
    const make = (n: number) => renderInput([component === 'fact' ? Array(n).fill('a').join(' ') : 'Fact.'],
      component === 'cta' ? Array(n).fill('a').join(' ') : 'Follow.',
      component === 'hook' ? Array(n).fill('a').join(' ') : 'Know?');
    expect(() => render(make(max))).not.toThrow();
    rejected(renderExpression(make(max + 1)), 'CONTENT_BUDGET_EXCEEDED');
  });

  it('enforces 160 full-copy words while replay/loops remain advisory', () => {
    const make = (ctaWords: number) => renderInput(Array(4).fill(Array(30).fill('a').join(' ')),
      Array(ctaWords).fill('a').join(' '), Array(18).fill('a').join(' '));
    const out = render(make(22));
    expect(out.content_payload.text_metrics.word_count).toBe(160);
    expect(out.content_payload.text_metrics.replay_ratio).toBeGreaterThan(2.5);
    expect(out.content_payload.text_metrics.estimated_loops).toBe(4);
    expect(out.readability).toBe('advisory');
    rejected(renderExpression(make(23)), 'CONTENT_BUDGET_EXCEEDED');
    const wrapped = render(renderInput(Array(5).fill('x'.repeat(150))));
    expect(wrapped.content_payload.text_metrics.line_count).toBeGreaterThan(28);
    expect(wrapped.content_payload.text_metrics.fact_line_counts).toEqual(Array(5).fill(5));
  });

  it('honors all nine narrower budgets, explicit Page count, caption and hashtags limits', () => {
    const payload = renderInput();
    const values: Record<keyof typeof config2Ceiling, number> = {
      hook_max_chars: 13, fact_max_chars: 14, facts_total_max_chars: 30,
      cta_max_chars: 33, canva_total_max_chars: 80,
      hook_max_words: 3, fact_max_words: 3, cta_max_words: 6, canva_total_max_words: 15,
    };
    for (const key of Object.keys(config2Ceiling) as Array<keyof typeof config2Ceiling>) {
      const rules = renderRules(); rules.text_budget[key] = values[key];
      expect(() => render(payload, rules)).not.toThrow();
      rules.text_budget[key]--;
      rejected(renderExpression(payload, rules), 'CONTENT_BUDGET_EXCEEDED');
      rules.text_budget[key] = config2Ceiling[key] + 1;
      rejected(renderExpression(payload, rules), 'CONFIG_INVALID');
    }
    const rules: Record<string, unknown> = renderRules(); rules.fact_count = { mode: 'fixed', value: 1 };
    rejected(renderExpression(payload, rules as RenderRules), 'CONTENT_BUDGET_EXCEEDED');
    const tight = renderRules(); tight.caption.max_chars = 12;
    rejected(renderExpression(payload, tight), 'CONTENT_BUDGET_EXCEEDED');
    tight.caption.max_chars = 13; expect(render(payload, tight).content_payload.caption).toBe('Fixture only.');
    tight.hashtags.min_count = 1;
    rejected(renderExpression(payload, tight), 'CONTENT_BUDGET_EXCEEDED');
    payload.hashtags = ['#Fixture']; expect(render(payload, tight).content_payload.hashtags).toEqual(['#Fixture']);
    payload.hashtags = ['#Fixture', '#fixture']; rejected(renderExpression(payload), 'CONTENT_PAYLOAD_INVALID');
  });

  it('normalizes NFC/CRLF deterministically and preserves Unicode emoji code points', () => {
    const cta = 'Like 👍🏽\nFollow 👩‍🔬 🇮🇩 1️⃣!';
    const raw = renderInput(['Café notes.'], cta);
    raw.canva_copy = raw.canva_copy.replaceAll('\n', '\r\n');
    raw.cta = raw.cta.replaceAll('\n', '\r\n');
    const out = render(raw);
    const normalized = render(renderInput(['Café notes.'], cta));
    expect(out).toEqual(normalized);
    expect(out.content_payload.cta).toBe(cta);
    expect(out.content_payload.text_metrics.cta_chars).toBe(Array.from(cta).length);
    expect(out.content_payload.text_metrics.canva_total_chars).toBe(Array.from(out.content_payload.canva_copy).length);
    expect(render(renderInput(['Café notes.'], cta + '!')).render_hash).not.toBe(out.render_hash);
  });

  it('applies forbidden emoji across every product text component without deleting it', () => {
    for (const emoji of ['👍', '👍🏽', '👩‍🔬', '🇮🇩', '1️⃣', '❤', '🫪']) {
      const payload = renderInput(undefined, `Like ${emoji}`);
      expect(render(payload).content_payload.cta).toBe(`Like ${emoji}`);
      rejected(renderExpression(payload, renderRules('plain_lines', 'forbidden')), 'CONTENT_PAYLOAD_INVALID');
    }
    for (const component of ['hook', 'fact', 'caption', 'subject']) {
      const payload = renderInput(component === 'fact' ? ['Fact 👍'] : undefined, undefined,
        component === 'hook' ? 'Know 👍' : undefined);
      if (component === 'caption') payload.caption += ' 👍';
      if (component === 'subject') Object.assign(payload.body, { subject: 'Subject 👍' });
      rejected(renderExpression(payload, renderRules('plain_lines', 'forbidden')), 'CONTENT_PAYLOAD_INVALID');
    }
    expect(() => render(renderInput(['Number 123, # and * stay text.']), renderRules('plain_lines', 'forbidden'))).not.toThrow();
  });

  it('keeps artifact/control/privacy denial under optional emoji policy', () => {
    for (const text of ['https://example.test', 'www.example.test', '<b>Follow</b>', '```copy```',
      '**Follow**', '__Follow__', 'Follow [1]', 'turn3search2',
      '00000000-0000-4000-8000-000000000001', 'Follow\tmore',
      'Follow\u200bmore', 'Follow\u200cmore', 'Follow\u200emore', 'Follow\u202emore',
      'Follow\u2066more', 'Follow\ufeffmore']) {
      rejected(renderExpression(renderInput(undefined, text)), 'CONTENT_PAYLOAD_INVALID');
    }
  });

  it('preserves config1 rendered bytes/hash and the three legacy function definitions', () => {
    const legacy = row<{ hash: string }>(`select encode(extensions.digest(internal.post_render_v2(${json(renderInput())})::text,'sha256'),'hex') hash`);
    expect(legacy.hash).toBe('d70383d39a1c7bcb29d0d82694cfb7f2ff964c71a0806a6e936df69ac3b0a6ba');
    expect(row<{ hashes: Record<string, string> }>(`select jsonb_object_agg(proname,encode(extensions.digest(pg_get_functiondef(oid),'sha256'),'hex')) hashes
      from pg_proc where oid in ('internal.post_render_v1(jsonb)'::regprocedure,'internal.post_render_v2(jsonb)'::regprocedure,'internal.post_hash_v2(public.posts)'::regprocedure)`).hashes).toEqual({
      post_hash_v2: '2a530305085ccf3c1b78bfc4da9ce1008b8be9e1a5ebac0a3446a6d9fee237b6',
      post_render_v1: '39d82659cac4cd6042707f317a34854f657a93b7ad20f2c0486b1cce047f517f',
      post_render_v2: 'cd523245aeeca73c8b38ab5891506d777cafd952ffd302e3c5da800bc989516d',
    });
    rejected(`internal.post_render_v2(${json(renderInput(Array(10).fill('Fact.')))})`, 'CONTENT_PAYLOAD_INVALID');
    rejected(`internal.post_render_v2(${json(renderInput(undefined, 'Like.\nFollow.'))})`, 'CONTENT_PAYLOAD_INVALID');
  });

  it('consumes actual resolved preset rules and keeps preferences advisory', () => {
    const payload = renderInput(undefined, 'Like the facts? Like the video and follow for more!');
    expect(() => query(`begin;
      do $$ declare u uuid:=extensions.gen_random_uuid(); w bigint; d public.trivia_editorial_definitions;
        resolved jsonb; rendered jsonb; begin
        insert into auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
          values('00000000-0000-0000-0000-000000000000',u,'authenticated','authenticated',u::text||'@example.test','x',now(),'{}','{}',now(),now());
        insert into public.workspaces(owner_user_id,name,slug) values(u,'Renderer fixture','render-'||u::text) returning id into w;
        perform set_config('request.jwt.claims',jsonb_build_object('sub',u,'role','authenticated','client_id','renderer-fixture')::text,true);
        set local role content_producer_api_owner;
        perform internal.editorial_seed_profiles_v2(w);
        for d in select * from public.trivia_editorial_definitions where workspace_id=w and kind='profile' loop
          resolved:=internal.editorial_resolve_v2(w,jsonb_build_object('config_schema_version',2,
            'editorial_profile_ref',jsonb_build_object('public_id',d.public_id,'version',d.version,'hash',d.hash)));
          rendered:=internal.post_render_config2_v2(${json(payload)},resolved->'rules');
          if rendered->'interaction_goal'<>'null'::jsonb or rendered#>'{content_payload,text_metrics,fact_chars}'<>'[14,14]'::jsonb then
            raise exception 'RESOLVED_RENDER_MISMATCH'; end if;
        end loop;
        if (select count(*) from public.trivia_editorial_definitions where workspace_id=w and kind='profile')<>3 then
          raise exception 'PRESET_FIXTURE_INCOMPLETE'; end if;
      end $$; rollback;`)).not.toThrow();
  });

  it('keeps new helpers private and immutable with no new public RPC', () => {
    const acl = row<{ helpers: number; private: boolean; api: number }>(`select
      count(*)::integer helpers, bool_and(not p.prosecdef and p.provolatile='i'
        and r.rolname='content_producer_api_owner' and p.proconfig=array['search_path=""']
        and not exists(select 1 from (values('anon'),('authenticated'),('service_role')) c(role)
          where has_function_privilege(c.role,p.oid,'execute'))) private,
      (select count(*)::integer from pg_proc a join pg_namespace n on n.oid=a.pronamespace where n.nspname='api') api
      from pg_proc p join pg_roles r on r.oid=p.proowner join pg_namespace n on n.oid=p.pronamespace
      where n.nspname='internal' and p.proname in ('post_has_emoji_config2_v2','post_lines_config2_v2','post_render_config2_v2','post_text_config2_v2')`);
    expect(acl).toEqual({ helpers: 4, private: true, api: 33 });
  });
});
