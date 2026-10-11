import { randomUUID } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import {
  callerStatement,
  candidate,
  cleanup,
  correct,
  factInput,
  fixture,
  json,
  quote,
  release,
  reserve,
  reserved,
  reverify,
  row,
  rpc,
  session,
  sql,
  state,
  time,
  waitForSession,
} from './helpers/trivia-rpc.js';

describe('Checkpoint 5.5 authenticated trivia races and security', () => {
  it('CON-RESERVE-001 gives exactly one active owner to ten concurrent public reservation calls', async () => {
    const f = fixture();
    try {
      const input = [factInput(candidate())];
      const deadlocks = row<{ count: number }>(
        'select deadlocks count from pg_stat_database where datname=current_database()',
      ).count;
      const start = Date.now();
      const results = await Promise.all(
        Array.from({ length: 10 }, () =>
          session(`begin; ${callerStatement(f.owner, reserve(f, input))} commit;`),
        ),
      );
      expect(results.filter((r) => r.code === 0)).toHaveLength(1);
      expect(results.filter((r) => r.code !== 0).map((r) => r.error)).toEqual(
        Array(9).fill('FACT_RESERVATION_CONFLICT'),
      );
      expect(Date.now() - start).toBeLessThan(10_000);
      expect(
        row<{ count: number }>(
          'select deadlocks count from pg_stat_database where datname=current_database()',
        ).count,
      ).toBe(deadlocks);
      expect(
        row(`select count(*) facts,count(*) filter(where reservation_status='reserved') active,
        (select count(*) from internal.trivia_reservation_sets where workspace_id=f.workspace_id) sets
        from public.trivia_facts f where workspace_id=(select id from public.workspaces where public_id='${f.workspace}') group by workspace_id`),
      ).toEqual({ facts: 1, active: 1, sets: 1 });
    } finally {
      cleanup(f);
    }
  });

  it('serializes duplicate-key callers into mutation plus replay and overlapping sets into all-or-nothing', async () => {
    const f = fixture();
    try {
      const shared = factInput(candidate());
      const expression = reserve(f, [shared]);
      const duplicates = await Promise.all(
        Array.from({ length: 2 }, () =>
          session(`begin; ${callerStatement(f.owner, expression)} commit;`),
        ),
      );
      expect(duplicates.map((r) => r.code)).toEqual([0, 0]);
      expect(
        duplicates
          .map(
            (r) =>
              JSON.parse(r.output.split('\n').find((l) => l.startsWith('{"__rpc_result":'))!)
                .__rpc_result.data.replayed,
          )
          .sort(),
      ).toEqual([false, true]);
      const firstResult = JSON.parse(
        duplicates[0]!.output.split('\n').find((l) => l.startsWith('{"__rpc_result":'))!,
      ).__rpc_result as { data: { reservation_token: string } };
      rpc(f, release(f, firstResult.data.reservation_token));
      const overlap = await Promise.all([
        session(
          `begin; ${callerStatement(f.owner, reserve(f, [factInput(candidate(), 1), { ...shared, position: 2 }]))} commit;`,
        ),
        session(
          `begin; ${callerStatement(f.owner, reserve(f, [{ ...shared, position: 1 }, factInput(candidate(), 2)]))} commit;`,
        ),
      ]);
      expect(overlap.filter((r) => r.code === 0)).toHaveLength(1);
      expect(overlap.filter((r) => r.code !== 0).map((r) => r.error)).toEqual([
        'FACT_RESERVATION_CONFLICT',
      ]);
      expect(
        row<{ count: number }>(
          `select count(*) count from public.trivia_facts where workspace_id=(select id from public.workspaces where public_id='${f.workspace}')`,
        ).count,
      ).toBe(2);
    } finally {
      cleanup(f);
    }
  });

  it('gives one winner to competing reverify/correction CAS and exactly one direct successor', async () => {
    const f = fixture();
    try {
      const c = candidate();
      const first = rpc(f, reserve(f, [factInput(c)]));
      const fact = reserved(first)[0]!.fact_public_id;
      const expected = time(fact);
      const results = await Promise.all([
        session(
          `begin; ${callerStatement(f.owner, reverify(f, fact, String(c.claim_text), expected))} commit;`,
        ),
        session(
          `begin; ${callerStatement(f.owner, correct(f, fact, factInput(candidate()), expected))} commit;`,
        ),
      ]);
      expect(results.filter((r) => r.code === 0)).toHaveLength(1);
      expect(results.filter((r) => r.code !== 0).map((r) => r.error)).toEqual([
        'FACT_CORRECTION_CONFLICT',
      ]);
      const target = row<{ id: string }>(
        `select public_id::text id from public.trivia_facts where verification_status='verified' and (public_id='${fact}' or supersedes_fact_id=(select id from public.trivia_facts where public_id='${fact}'))`,
      ).id;
      const nextExpected = time(target);
      const corrections = await Promise.all(
        [4, 5].map((n) =>
          session(
            `begin; ${callerStatement(f.owner, correct(f, target, factInput(candidate(n)), nextExpected))} commit;`,
          ),
        ),
      );
      expect(corrections.filter((r) => r.code === 0)).toHaveLength(1);
      expect(corrections.filter((r) => r.code !== 0).map((r) => r.error)).toEqual([
        'FACT_CORRECTION_CONFLICT',
      ]);
      expect(
        row<{ count: number }>(
          `select count(*) count from public.trivia_facts where supersedes_fact_id=(select id from public.trivia_facts where public_id='${target}')`,
        ).count,
      ).toBe(1);
    } finally {
      cleanup(f);
    }
  });

  it('revalidates exact CAS after workspace waits and maps lock timeout safely without partial ledger state', async () => {
    const f = fixture();
    let holder: Promise<unknown> | undefined;
    try {
      const c = candidate();
      const r = rpc(f, reserve(f, [factInput(c)]));
      const fact = reserved(r)[0]!.fact_public_id;
      const expected = time(fact);
      const name = `p55-holder-${randomUUID()}`;
      const first = reverify(f, fact, String(c.claim_text), expected);
      holder = session(
        `begin; set application_name=${quote(name)}; ${callerStatement(f.owner, first)} select pg_sleep(0.7); commit;`,
      );
      await waitForSession(name);
      const second = await session(
        `begin; ${callerStatement(f.owner, correct(f, fact, null, expected))} commit;`,
      );
      await holder;
      expect(second.error).toBe('FACT_CORRECTION_CONFLICT');
      const timeoutName = `p55-lock-${randomUUID()}`;
      holder = session(
        `begin; set application_name=${quote(timeoutName)}; select id from public.workspaces where public_id='${f.workspace}' for no key update; select pg_sleep(2.8); commit;`,
      );
      await waitForSession(timeoutName);
      const expression = reverify(f, fact, String(c.claim_text));
      const before = state(f);
      expect(() => rpc(f, expression)).toThrow('DATABASE_BUSY');
      expect(state(f)).toBe(before);
      await holder;
      expect(rpc(f, expression).data.replayed).toBe(false);
    } finally {
      if (holder) await holder;
      cleanup(f);
    }
  }, 20_000);

  it('enforces auth/client/direct-table/helper/history denial, exact ACLs and rate limits for all five operations', () => {
    const f = fixture();
    try {
      const c = candidate();
      const expression = reserve(f, [factInput(c)]);
      for (const claims of [{ role: 'authenticated' }, { sub: f.owner, role: 'authenticated' }]) {
        expect(() =>
          sql(
            `begin; set local role authenticated; set local request.jwt.claims=${quote(JSON.stringify(claims))}; select ${expression}; rollback;`,
          ),
        ).toThrow('sub' in claims ? 'OAUTH_CLIENT_REQUIRED' : 'AUTH_REQUIRED');
      }
      for (const direct of [
        'select * from public.trivia_facts',
        'select * from internal.trivia_reservation_sets',
        'select internal.trivia_lock_workspace_v1(1)',
      ]) {
        expect(() =>
          sql(`begin; ${callerStatement(f.owner, 'true')} ${direct}; rollback;`),
        ).toThrow('LOCAL_TEST_QUERY_FAILED');
      }
      const r = rpc(f, expression);
      const fact = reserved(r)[0]!.fact_public_id;
      expect(() => rpc(f, expression, f.other)).toThrow('OWNER_ACCESS_REQUIRED');
      expect(() => rpc(f, reverify(f, fact, String(c.claim_text)), f.other)).toThrow(
        'OWNER_ACCESS_REQUIRED',
      );
      expect(() => rpc(f, correct(f, fact), f.other)).toThrow('OWNER_ACCESS_REQUIRED');
      const catalog = row(`select
        (select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='api') api,
        (select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='api' and (not p.prosecdef or p.proowner<>'content_producer_api_owner'::regrole or not p.proconfig @> array['search_path=""'])) unsafe,
        has_table_privilege('authenticated','internal.trivia_reservation_sets','select,insert,update,delete') caller,
        has_table_privilege('content_producer_api_owner','internal.trivia_reservation_sets','update,delete') rewrite`);
      expect(catalog).toEqual({ api: 24, unsafe: 0, caller: false, rewrite: false });
      const rateClient = randomUUID();
      const read = `api.trivia_find_similar_facts(1,'${f.workspace}','${f.page}',${json([c])},1)`;
      sql(`insert into internal.rate_limit_buckets(actor_user_id,oauth_client_id,limit_group,window_start,request_count)
        values('${f.owner}','${rateClient}','expensive_read',date_trunc('minute',now()),20);`);
      expect(() => rpc(f, read, f.owner, rateClient)).toThrow('RATE_LIMITED');
      expect(() =>
        rpc(
          f,
          `api.get_performance_insights(1,'${f.workspace}','${f.page}','trivia',null,null,array['topic'],'shares',5,20)`,
          f.owner,
          rateClient,
        ),
      ).toThrow('RATE_LIMITED');
      const group = randomUUID();
      sql(`insert into internal.rate_limit_buckets(actor_user_id,oauth_client_id,limit_group,window_start,request_count)
        values('${f.owner}','${group}','contention_write',date_trunc('minute',now()),20);`);
      const before = state(f);
      expect(() => rpc(f, release(f, r.data.reservation_token as string), f.owner, group)).toThrow(
        'RATE_LIMITED',
      );
      expect(state(f)).toBe(before);
    } finally {
      cleanup(f);
    }
  });

  it('maps active statement cancellation to DATABASE_BUSY and rolls back history and fact mutations', () => {
    const f = fixture();
    try {
      const expression = reserve(f);
      const before = state(f);
      sql(`create function internal.p55_statement_fault() returns trigger language plpgsql as $$ begin
        if new.workspace_id=(select id from public.workspaces where public_id='${f.workspace}') and new.completed_at is not null
          and new.operation_name='trivia_register_and_reserve_facts' then perform pg_sleep(0.5); end if; return new; end $$;
        create trigger p55_statement_fault before update on internal.operation_ledger for each row execute function internal.p55_statement_fault();`);
      try {
        expect(() =>
          sql(
            `begin; set local statement_timeout='150ms'; ${callerStatement(f.owner, expression)} commit;`,
          ),
        ).toThrow('DATABASE_BUSY');
        expect(state(f)).toBe(before);
      } finally {
        sql(
          'drop trigger p55_statement_fault on internal.operation_ledger; drop function internal.p55_statement_fault();',
        );
      }
      expect(rpc(f, expression).data.replayed).toBe(false);
    } finally {
      cleanup(f);
    }
  });

  it('keeps representative public candidate search and reserve below local p95 targets', () => {
    const f = fixture();
    try {
      const c = candidate();
      const r = rpc(f, reserve(f, [factInput(c)]));
      rpc(f, release(f, r.data.reservation_token as string));
      const samples: number[] = [];
      const expression = `api.trivia_find_similar_facts(1,'${f.workspace}','${f.page}',${json([c])},20)`;
      for (let i = 0; i < 12; i++) {
        const start = performance.now();
        rpc(f, expression);
        samples.push(performance.now() - start);
      }
      const p95Read = samples.sort((a, b) => a - b)[Math.ceil(samples.length * 0.95) - 1]!;
      const writes: number[] = [];
      for (let i = 0; i < 12; i++) {
        const start = performance.now();
        const r = rpc(f, reserve(f, [factInput(c)]));
        writes.push(performance.now() - start);
        rpc(f, release(f, r.data.reservation_token as string));
      }
      const p95Write = writes.sort((a, b) => a - b)[Math.ceil(writes.length * 0.95) - 1]!;
      // Only aggregate timings are emitted, never results or token values.
      console.info(
        `5.5 local public RPC p95: search=${Math.ceil(p95Read)}ms reserve=${Math.ceil(p95Write)}ms; n=12 each`,
      );
      expect(p95Read).toBeLessThanOrEqual(3000);
      expect(p95Write).toBeLessThanOrEqual(3000);
    } finally {
      cleanup(f);
    }
  }, 30_000);
});
