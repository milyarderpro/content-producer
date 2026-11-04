import { randomUUID } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import {
  candidate,
  cleanup,
  correct,
  digest,
  factInput,
  fixture,
  json,
  postFixture,
  quote,
  release,
  replayDigest,
  reserve,
  reserved,
  reverify,
  row,
  rpc,
  secondPage,
  sql,
  state,
  time,
} from './helpers/trivia-rpc.js';

describe('Checkpoint 5.5 public trivia reverify and correction', () => {
  it('RPC-CORRECT-001 proves exact microsecond/offset CAS, identity preservation, replay and semantic mismatch', () => {
    const f = fixture();
    try {
      const c = candidate();
      const r = rpc(f, reserve(f, [factInput(c)]));
      const fact = reserved(r)[0]!.fact_public_id;
      const beforeIdentity = row(
        `select claim_text,normalized_claim,claim_hash,structured_key,structured_hash from public.trivia_facts where public_id='${fact}'`,
      );
      const expected = time(fact);
      const stale = reverify(f, fact, String(c.claim_text), expected).replace(
        quote(expected),
        `(${quote(expected)}::timestamptz+interval '1 microsecond')`,
      );
      const before = state(f);
      expect(() => rpc(f, stale)).toThrow('FACT_CORRECTION_CONFLICT');
      expect(state(f)).toBe(before);
      const key = randomUUID();
      const expression = reverify(f, fact, String(c.claim_text), expected, key);
      const offsetExpression = expression.replace(
        quote(expected),
        `(${quote(expected)}::timestamptz at time zone 'UTC') at time zone 'UTC'`,
      );
      const refreshed = rpc(f, offsetExpression);
      expect(
        row(
          `select claim_text,normalized_claim,claim_hash,structured_key,structured_hash from public.trivia_facts where public_id='${fact}'`,
        ),
      ).toEqual(beforeIdentity);
      expect(refreshed.data.verification_status).toBe('verified');
      expect(refreshed.data.fact_updated_at).not.toBe(expected);
      expect(replayDigest(rpc(f, expression))).toBe(replayDigest(refreshed));
      expect(() => rpc(f, reverify(f, fact, 'Changed proposition.', expected, key))).toThrow(
        'OPERATION_KEY_REUSED',
      );
      expect(() => rpc(f, reverify(f, fact, 'Changed proposition.'))).toThrow(
        'FACT_CORRECTION_REQUIRED',
      );
      expect(() => rpc(f, expression, f.other)).toThrow('OWNER_ACCESS_REQUIRED');
      const correction = rpc(f, correct(f, fact));
      expect(correction.data.old_status).toBe('invalidated');
      expect(replayDigest(rpc(f, expression))).toBe(replayDigest(refreshed));
    } finally {
      cleanup(f);
    }
  }, 30_000);

  it('atomically corrects draft/ready across Pages while preserving posted/archived rows and every usage snapshot', () => {
    const f = fixture();
    try {
      const r = rpc(f, reserve(f));
      const fact = reserved(r)[0]!.fact_public_id;
      rpc(f, release(f, r.data.reservation_token as string));
      const draft = postFixture(f, fact);
      const ready = postFixture(secondPage(f), fact, 'ready');
      const posted = postFixture(secondPage(f), fact, 'posted');
      const archived = postFixture(secondPage(f), fact, 'archived');
      const published = digest(
        row(
          `select jsonb_agg(to_jsonb(p) order by id) rows from public.posts p where public_id in ('${posted}','${archived}')`,
        ),
      );
      const snapshots = digest(
        row(
          `select jsonb_agg(to_jsonb(j) order by id) rows from public.trivia_post_facts j where fact_id=(select id from public.trivia_facts where public_id='${fact}')`,
        ),
      );
      const expression = correct(f, fact);
      const first = rpc(f, expression);
      const affected = first.data.affected_posts as Record<
        string,
        { count: number; items: unknown[]; truncated: boolean }
      >;
      expect(
        Object.fromEntries(Object.entries(affected).map(([key, value]) => [key, value.count])),
      ).toEqual({ draft: 1, ready: 1, posted: 2 });
      const changed = JSON.parse(
        sql(`select jsonb_agg(jsonb_build_object('status',status,'revision',revision,'quality',quality_status,
        'approval',approval_snapshot,'ready',ready_at,'editorial',editorial_checks,'blocking',system_checks->'checks'->0->>'id') order by public_id)
        from public.posts where public_id in ('${draft}','${ready}')`),
      ) as unknown[];
      expect(changed).toEqual(
        Array(2).fill({
          status: 'draft',
          revision: 2,
          quality: 'failed',
          approval: null,
          ready: null,
          editorial: {},
          blocking: 'trivia.facts.current_verified',
        }),
      );
      expect(
        digest(
          row(
            `select jsonb_agg(to_jsonb(p) order by id) rows from public.posts p where public_id in ('${posted}','${archived}')`,
          ),
        ),
      ).toBe(published);
      expect(
        digest(
          row(
            `select jsonb_agg(to_jsonb(j) order by id) rows from public.trivia_post_facts j where fact_id=(select id from public.trivia_facts where public_id='${fact}')`,
          ),
        ),
      ).toBe(snapshots);
      const after = state(f);
      expect(replayDigest(rpc(f, expression))).toBe(replayDigest(first));
      expect(state(f)).toBe(after);
      expect(() =>
        rpc(
          f,
          expression.replace('Evidence requires correction.', 'A different correction reason.'),
        ),
      ).toThrow('OPERATION_KEY_REUSED');
      const review = rpc(f, `api.get_post(1,'${f.workspace}','${posted}',true,true,false)`);
      expect(JSON.stringify(review)).toContain('FACT_CORRECTION_CURRENT');
      expect(() => rpc(f, expression, f.other)).toThrow('OWNER_ACCESS_REQUIRED');
      expect(() => rpc(f, correct(f, fact, null, time(fact), randomUUID(), 'false'))).toThrow(
        'VALIDATION_FAILED',
      );
    } finally {
      cleanup(f);
    }
  }, 30_000);

  it('creates exactly one materially changed successor with safe historical replay and explicit correction validation', () => {
    const f = fixture();
    try {
      const c = candidate(3);
      const r = rpc(f, reserve(f, [factInput(c)]));
      const fact = reserved(r)[0]!.fact_public_id;
      const successor = factInput({
        ...c,
        candidate_key: 'corrected',
        claim_text: randomUUID().replaceAll('-', ''),
        object_key: '4',
        numbers: [{ value: '4', unit: 'count', role: 'count' }],
      });
      expect(() => rpc(f, correct(f, fact, factInput(c)))).toThrow('FACT_CORRECTION_REQUIRED');
      const expression = correct(f, fact, successor);
      const first = rpc(f, expression);
      expect(first.data.old_status).toBe('superseded');
      expect(first.data.successor_public_id).toBeTruthy();
      expect(
        row(
          `select verification_status status, (select count(*) from public.trivia_facts s where s.supersedes_fact_id=p.id) count from public.trivia_facts p where public_id='${fact}'`,
        ),
      ).toEqual({ status: 'superseded', count: 1 });
      expect(replayDigest(rpc(f, expression))).toBe(replayDigest(first));
      expect(() => rpc(f, correct(f, fact, successor))).toThrow('FACT_NOT_ELIGIBLE');
      expect(
        rpc(f, release(f, r.data.reservation_token as string)).data.already_inactive_count,
      ).toBe(1);
      const successorId = first.data.successor_public_id as string;
      const invalidate = correct(f, successorId);
      const second = rpc(f, invalidate);
      expect(replayDigest(rpc(f, invalidate))).toBe(replayDigest(second));
      expect(() => rpc(f, expression.replace("'supersede'", "'invalidate'"))).toThrow(
        'VALIDATION_FAILED',
      );
    } finally {
      cleanup(f);
    }
  });

  it('preserves post approvals and immutable evidence during same-meaning source refresh', () => {
    const f = fixture();
    try {
      const c = candidate();
      const r = rpc(f, reserve(f, [factInput(c)]));
      const fact = reserved(r)[0]!.fact_public_id;
      rpc(f, release(f, r.data.reservation_token as string));
      postFixture(f, fact, 'ready');
      postFixture(secondPage(f), fact, 'archived');
      const before = digest(
        row(`select (select jsonb_agg(to_jsonb(p) order by id) from public.posts p where workspace_id=w.id) posts,
        (select jsonb_agg(to_jsonb(j) order by id) from public.trivia_post_facts j where workspace_id=w.id) junctions from public.workspaces w where public_id='${f.workspace}'`),
      );
      const refreshed = rpc(f, reverify(f, fact, String(c.claim_text)));
      expect((refreshed.data.affected_posts as { ready: { count: number } }).ready.count).toBe(1);
      expect(
        digest(
          row(`select (select jsonb_agg(to_jsonb(p) order by id) from public.posts p where workspace_id=w.id) posts,
        (select jsonb_agg(to_jsonb(j) order by id) from public.trivia_post_facts j where workspace_id=w.id) junctions from public.workspaces w where public_id='${f.workspace}'`),
        ),
      ).toBe(before);
    } finally {
      cleanup(f);
    }
  });

  it('CORE-001 rolls back reverify and cross-Page correction at completion, then retries the identical operations', () => {
    const f = fixture();
    try {
      const c = candidate();
      const r = rpc(f, reserve(f, [factInput(c)]));
      const fact = reserved(r)[0]!.fact_public_id;
      rpc(f, release(f, r.data.reservation_token as string));
      postFixture(f, fact, 'ready');
      postFixture(secondPage(f), fact);
      for (const operation of ['reverify', 'correct']) {
        const expression =
          operation === 'reverify'
            ? reverify(f, fact, String(c.claim_text))
            : correct(f, fact, factInput());
        const before = state(f);
        sql(`create function internal.p55_correction_fault() returns trigger language plpgsql as $$ begin
          if new.workspace_id=(select id from public.workspaces where public_id='${f.workspace}') and new.completed_at is not null
            and new.operation_name in ('trivia_reverify_fact','trivia_correct_fact') then raise exception 'FAULT_NO_DETAIL'; end if; return new; end $$;
          create trigger p55_correction_fault before update on internal.operation_ledger for each row execute function internal.p55_correction_fault();`);
        try {
          expect(() => rpc(f, expression)).toThrow('INTERNAL_ERROR');
          expect(state(f)).toBe(before);
        } finally {
          sql(
            'drop trigger p55_correction_fault on internal.operation_ledger; drop function internal.p55_correction_fault();',
          );
        }
        expect(rpc(f, expression).data.replayed).toBe(false);
      }
    } finally {
      cleanup(f);
    }
  }, 20_000);

  it('caps affected summaries at 50 without capping mutation or exact counts', () => {
    const f = fixture();
    try {
      const r = rpc(f, reserve(f));
      const fact = reserved(r)[0]!.fact_public_id;
      rpc(f, release(f, r.data.reservation_token as string));
      const template = postFixture(f, fact);
      // Controlled fixture-only cloning of 50 additional Pages/posts and evidence.
      sql(`do $$ declare i integer; p public.posts; j public.trivia_post_facts; v_page_id bigint; v_post_id bigint;
        begin select * into p from public.posts where public_id='${template}'; select * into j from public.trivia_post_facts where post_id=p.id;
        for i in 1..50 loop
          insert into public.pages(workspace_id,name,slug) values(p.workspace_id,'Bounded fixture','p55-bound-'||extensions.gen_random_uuid()) returning id into v_page_id;
          insert into public.page_niche_configs(workspace_id,page_id,niche_key,config) values(p.workspace_id,v_page_id,'trivia',internal.default_trivia_config_v1());
          insert into public.posts(workspace_id,page_id,niche_key,format_key,topic_key,interaction_goal,content_payload,generation_snapshot,content_hash,system_checks,editorial_checks)
            values(p.workspace_id,v_page_id,p.niche_key,p.format_key,p.topic_key,p.interaction_goal,p.content_payload,p.generation_snapshot,p.content_hash,p.system_checks,p.editorial_checks) returning id into v_post_id;
          insert into public.trivia_post_facts(workspace_id,page_id,post_id,fact_id,position,rendered_text,claim_hash_snapshot,source_snapshot,verified_at_snapshot)
            values(p.workspace_id,v_page_id,v_post_id,j.fact_id,j.position,j.rendered_text,j.claim_hash_snapshot,j.source_snapshot,j.verified_at_snapshot);
        end loop; end $$;`);
      const result = rpc(f, correct(f, fact));
      const affected = (
        result.data.affected_posts as {
          draft: { count: number; items: unknown[]; truncated: boolean };
        }
      ).draft;
      expect(affected.count).toBe(51);
      expect(affected.items).toHaveLength(50);
      expect(affected.truncated).toBe(true);
      expect(
        row<{ count: number }>(
          `select count(*) count from public.posts where workspace_id=(select id from public.workspaces where public_id='${f.workspace}') and revision=2 and quality_status='failed'`,
        ).count,
      ).toBe(51);
    } finally {
      cleanup(f);
    }
  });

  it('fails closed on corrupted replay projections and hash collisions without exposing raw metadata', () => {
    const f = fixture();
    try {
      const c = candidate();
      const key = randomUUID();
      const expression = reserve(f, [factInput(c)], key);
      const r = rpc(f, expression);
      sql(
        `update internal.operation_ledger set response_snapshot=jsonb_set(response_snapshot,'{response,data,unexpected}','true') where operation_key='${key}';`,
      );
      expect(() => rpc(f, expression)).toThrow('INTERNAL_ERROR');
      const fact = reserved(r)[0]!.fact_public_id;
      const next = candidate();
      // Administrative corruption fixture; identity trigger restored in the same transaction.
      sql(`begin; alter table public.trivia_facts disable trigger trivia_facts_validate_identity_source_freshness;
        update public.trivia_facts set claim_hash=internal.trivia_claim_hash_v1(internal.trivia_normalize_claim_v1(${quote(String(next.claim_text))})) where public_id='${fact}';
        alter table public.trivia_facts enable trigger trivia_facts_validate_identity_source_freshness; commit;`);
      const before = state(f);
      expect(() => rpc(f, reserve(f, [factInput(next)]))).toThrow('FACT_HASH_COLLISION');
      expect(state(f)).toBe(before);
      expect(() =>
        rpc(
          f,
          `api.trivia_reverify_fact(1,'${f.workspace}','${randomUUID()}','${fact}',null,'x',${json([])},'stable',null,now(),'standard','note')`,
        ),
      ).toThrow('VALIDATION_FAILED');
    } finally {
      cleanup(f);
    }
  });
});
