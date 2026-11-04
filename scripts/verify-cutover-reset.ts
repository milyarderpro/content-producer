import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import {
  createPlan,
  insertPost,
  row,
  sql,
} from '../supabase/tests/database/helpers/plan-lifecycle.js';
import { fixture } from '../supabase/tests/database/helpers/trivia-rpc.js';
import { cleanup, draft } from '../supabase/tests/database/helpers/trivia-v2.js';

const resetSql = readFileSync(
  fileURLToPath(new URL('./cutover-reset-content.sql', import.meta.url)),
  'utf8',
);
const counts = () =>
  row<{ posts: number; v1: number; v2: number; facts: number; plans: number; catalog: number }>(`
  select (select count(*) from public.posts) posts,
    (select count(*) from public.posts where content_schema_version=1) v1,
    (select count(*) from public.posts where content_schema_version=2) v2,
    (select count(*) from public.trivia_facts) facts,
    (select count(*) from public.content_plans) plans,
    (select count(*) from internal.trivia_fact_catalog_v2) catalog`);
const preserved = () =>
  row(`select
  (select jsonb_agg(to_jsonb(w) order by id) from public.workspaces w) workspaces,
  (select jsonb_agg(to_jsonb(p) order by id) from public.pages p) pages,
  (select jsonb_agg(to_jsonb(c) order by id) from public.page_niche_configs c) configs,
  (select jsonb_agg(to_jsonb(n) order by key) from public.niches n) niches`);
function run(workspace: string) {
  return spawnSync(
    'docker',
    [
      'exec',
      '-i',
      'supabase_db_content-producer',
      'psql',
      '-X',
      '-U',
      'postgres',
      '-d',
      'postgres',
      '-v',
      'ON_ERROR_STOP=1',
      '-v',
      `workspace_public_id=${workspace}`,
      '-v',
      'backup_confirmed=on',
      '-f',
      '-',
    ],
    { input: resetSql, encoding: 'utf8' },
  );
}

if (
  counts().posts !== 0 ||
  row<{ n: number }>('select count(*) n from public.workspaces').n !== 0
) {
  throw new Error('Fixture database must start empty');
}
const f = fixture();
try {
  const v2 = draft(f);
  const plan = createPlan(f, 1);
  const v1 = insertPost(plan.data.items[0]!.plan_item_public_id, 'draft');
  sql(`delete from auth.users where id='${f.other}'`);
  const beforeCounts = counts();
  if (beforeCounts.v1 !== 1 || beforeCounts.v2 !== 1 || beforeCounts.facts < 1) {
    throw new Error('Mixed v1/v2 fixture was not created');
  }
  const beforePreserved = preserved();

  sql(`insert into auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,
    raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
    values('00000000-0000-0000-0000-000000000000','${f.other}','authenticated','authenticated',
      '${f.other}@example.test','not-used',now(),'{}','{}',now(),now());
    insert into public.workspaces(owner_user_id,name,slug)
    values('${f.other}','Unexpected second workspace','cutover-scope-test')`);
  const rejected = run(f.workspace);
  if (rejected.status === 0 || counts().posts !== 2) {
    throw new Error('Changed-scope reset did not fail atomically');
  }
  sql(`delete from public.workspaces where slug='cutover-scope-test'`);
  sql(`delete from auth.users where id='${f.other}'`);
  if (JSON.stringify(preserved()) !== JSON.stringify(beforePreserved)) {
    throw new Error('Changed-scope attempt modified preserved data');
  }

  const accepted = run(f.workspace);
  if (accepted.status !== 0) {
    throw new Error(
      `Valid reset failed: ${accepted.stderr.split('\n').find((x) => x.includes('ERROR')) ?? 'unknown'}`,
    );
  }
  const afterCounts = counts();
  if (
    afterCounts.posts !== 0 ||
    afterCounts.facts !== 0 ||
    afterCounts.plans !== 0 ||
    afterCounts.catalog !== 0
  ) {
    throw new Error('Content remains after reset');
  }
  if (JSON.stringify(preserved()) !== JSON.stringify(beforePreserved)) {
    throw new Error('Preserved Page/config changed');
  }
  if (
    row<{ n: number }>(
      "select count(*) n from internal.operation_ledger where operation_name not in ('create_page','update_page')",
    ).n !== 0
  ) {
    throw new Error('Content operation ledger remains');
  }
  console.log(
    `PASS mixed v1/v2 reset; changed scope rolled back; Page/config unchanged; fixture IDs ${v1} ${v2.post_public_id}`,
  );
} finally {
  cleanup(f);
}
