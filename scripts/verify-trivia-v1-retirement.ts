import { readFileSync, writeFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { cleanup, draft, firstFact, reverify } from '../supabase/tests/database/helpers/trivia-v2.js';
import { fixture, json, row, rpc, session, sql, waitForSession } from '../supabase/tests/database/helpers/trivia-rpc.js';
import { request, save } from '../supabase/tests/database/helpers/post-rpc.js';

// Local-only two-stage upgrade check. The file contains synthetic fixture IDs only.
const fixturePath = 'artifacts/trivia-v1-retirement-fixture.json';
const retired = [
  'trivia_find_similar_facts', 'trivia_register_and_reserve_facts',
  'trivia_release_facts', 'save_post', 'revise_post',
];

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function inspect(): void {
  const functions = row<{ retired: number; maintenance_v1: number; maintenance_v2: number; native_v2: number }>(`
    select
      (select count(*)::integer from pg_proc p join pg_namespace n on n.oid=p.pronamespace
       where n.nspname='api' and p.proname=any(array[${retired.map((name) => `'${name}'`).join(',')}])) retired,
      (pg_catalog.to_regprocedure('api.trivia_reverify_fact(integer,uuid,uuid,uuid,timestamp with time zone,text,jsonb,text,date,timestamp with time zone,text,text)') is not null)::integer
        + (pg_catalog.to_regprocedure('api.trivia_correct_fact(integer,uuid,uuid,uuid,timestamp with time zone,text,text,jsonb,boolean)') is not null)::integer maintenance_v1,
      (pg_catalog.to_regprocedure('api.trivia_reverify_fact(integer,uuid,uuid,uuid,text,text,text)') is not null)::integer
        + (pg_catalog.to_regprocedure('api.trivia_correct_fact(integer,uuid,uuid,uuid,text,text,text,jsonb,boolean,text)') is not null)::integer maintenance_v2,
      (select count(*)::integer from pg_proc p join pg_namespace n on n.oid=p.pronamespace
       where n.nspname='api' and p.proname in ('trivia_find_similar_facts_v2','save_post_v2','revise_post_v2')) native_v2`);
  assert(functions.retired === 0, 'V1_RPC_STILL_PRESENT');
  assert(functions.maintenance_v1 === 0, 'V1_MAINTENANCE_STILL_PRESENT');
  assert(functions.maintenance_v2 === 2, 'V2_MAINTENANCE_MISSING');
  assert(functions.native_v2 === 3, 'V2_RPC_MISSING');
  for (const name of retired) {
    let rejected = false;
    try {
      sql(`select api.${name}(null);`);
    } catch {
      rejected = true;
    }
    assert(rejected, `DIRECT_RPC_ACCEPTED_${name}`);
  }
  const security = row<{ anon_grants: number; rls_disabled: number }>(`
    select
      (select count(*)::integer from information_schema.routine_privileges
       where routine_schema='api' and grantee='anon'
         and routine_name in ('trivia_find_similar_facts_v2','save_post_v2','revise_post_v2',
                              'trivia_reverify_fact','trivia_correct_fact')) anon_grants,
      (select count(*)::integer from pg_class c join pg_namespace n on n.oid=c.relnamespace
       where n.nspname='public' and c.relname in ('posts','trivia_facts','trivia_post_facts')
         and not c.relrowsecurity) rls_disabled`);
  assert(security.anon_grants === 0 && security.rls_disabled === 0, 'SECURITY_REGRESSION');
}

const mode = process.argv[2];
if (mode === 'inflight') {
  const name = `p8-retirement-${randomUUID()}`;
  const holder = session(`begin; set application_name='${name}';
    lock table public.posts in access share mode; select pg_sleep(8); commit;`);
  try {
    await waitForSession(name);
    let aborted = false;
    try {
      sql(`begin; lock table internal.operation_ledger, internal.trivia_reservation_sets,
        public.posts, public.trivia_facts, public.trivia_post_facts
        in access exclusive mode nowait; commit;`);
    } catch {
      aborted = true;
    }
    assert(aborted, 'IN_FLIGHT_LOCK_NOT_REJECTED');
    console.log('IN_FLIGHT_ABORT_PASS');
  } finally {
    const finished = await holder;
    assert(finished.code === 0, 'LOCK_HOLDER_FAILED');
  }
} else if (mode === 'seed') {
  const f = fixture();
  try {
    const legacyCall = save(f, request(f));
    const legacy = rpc(f, legacyCall).data.post as { post_public_id: string };
    const native = draft(f);
    writeFileSync(fixturePath, JSON.stringify({ f, legacyCall,
      legacy: legacy.post_public_id, native: native.post_public_id }));
    console.log('UPGRADE_SEED_PASS');
  } catch (error) {
    cleanup(f);
    throw error;
  }
} else if (mode === 'upgrade' || mode === 'clean') {
  inspect();
  const saved = mode === 'upgrade'
    ? JSON.parse(readFileSync(fixturePath, 'utf8')) as {
      f: ReturnType<typeof fixture>; legacyCall: string; legacy: string; native: string;
    }
    : null;
  const f = saved?.f ?? fixture();
  try {
    if (saved) {
      const existing = row<{ legacy: number; native: number }>(`
        select
          (select count(*)::integer from public.posts where public_id='${saved.legacy}') legacy,
          (select count(*)::integer from public.posts where public_id='${saved.native}') native`);
      assert(existing.legacy === 1 && existing.native === 1, 'UPGRADE_POSTS_LOST');
      let replayDenied = false;
      try {
        rpc(f, saved.legacyCall);
      } catch {
        replayDenied = true;
      }
      assert(replayDenied, 'RETIRED_V1_REPLAY_ACCEPTED');
      const read = rpc(f, `api.get_post(1,'${f.workspace}','${saved.legacy}')`);
      assert((read.data.post as { post_public_id: string }).post_public_id === saved.legacy,
        'LEGACY_READBACK_FAILED');
    }
    const nativeId = saved?.native ?? draft(f).post_public_id;
    const fact = firstFact(nativeId);
    assert(fact.id.length > 0, 'V2_FACT_MISSING');
    const lookup = rpc(f, `api.trivia_find_similar_facts_v2(2,'${f.workspace}','${f.page}',${json([
      { candidate_key: 'fresh', claim_text: fact.claim },
    ])})`);
    assert(lookup.response_schema_version === 2, 'V2_READ_FAILED');
    rpc(f, reverify(f, fact.id, fact.claim));
    let denied = false;
    try {
      rpc(f, `api.trivia_find_similar_facts_v2(2,'${f.workspace}','${f.page}',${json([
        { candidate_key: randomUUID(), claim_text: fact.claim },
      ])})`, f.other);
    } catch (error) {
      denied = String(error).includes('OWNER_ACCESS_REQUIRED');
    }
    assert(denied, 'OWNER_DENIAL_FAILED');
    console.log(mode === 'upgrade' ? 'UPGRADE_VERIFY_PASS' : 'CLEAN_INSTALL_VERIFY_PASS');
  } finally {
    cleanup(f);
  }
} else {
  throw new Error('Usage: seed | upgrade | clean | inflight');
}
