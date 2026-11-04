import { spawnSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { row, sql } from '../supabase/tests/database/helpers/plan-lifecycle.js';
import { fixture } from '../supabase/tests/database/helpers/trivia-rpc.js';
import { cleanup, draft } from '../supabase/tests/database/helpers/trivia-v2.js';

const script = readFileSync(
  fileURLToPath(new URL('./cutover-cleanup-qa.sql', import.meta.url)),
  'utf8',
);
function run(workspace: string, page: string, post: string) {
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
      `qa_page_public_id=${page}`,
      '-v',
      `qa_post_public_id=${post}`,
      '-f',
      '-',
    ],
    { input: script, encoding: 'utf8' },
  );
}
const content = () =>
  row<{ posts: number; facts: number; bindings: number; ledger: number }>(`
  select (select count(*) from public.posts) posts,
    (select count(*) from public.trivia_facts) facts,
    (select count(*) from public.trivia_post_facts) bindings,
    (select count(*) from internal.operation_ledger where operation_name not in ('create_page','update_page')) ledger`);
const preserved = () =>
  JSON.stringify(
    row(`select
  (select jsonb_agg(to_jsonb(w) order by id) from public.workspaces w) workspaces,
  (select jsonb_agg(to_jsonb(p) order by id) from public.pages p) pages,
  (select jsonb_agg(to_jsonb(c) order by id) from public.page_niche_configs c) configs`),
  );

if (
  content().posts !== 0 ||
  row<{ n: number }>('select count(*) n from public.workspaces').n !== 0
) {
  throw new Error('Fixture database must start empty');
}
const f = fixture();
try {
  const post = draft(f);
  sql(`delete from auth.users where id='${f.other}'`);
  const beforeContent = content();
  const beforePreserved = preserved();
  if (beforeContent.posts !== 1 || beforeContent.facts < 1 || beforeContent.bindings < 1) {
    throw new Error('QA fixture missing draft descendants');
  }
  const rejected = run(f.workspace, f.page, randomUUID());
  if (rejected.status === 0 || JSON.stringify(content()) !== JSON.stringify(beforeContent)) {
    throw new Error('Wrong QA ID was not rejected atomically');
  }
  const accepted = run(f.workspace, f.page, post.post_public_id);
  if (accepted.status !== 0) {
    throw new Error(
      `QA cleanup failed: ${accepted.stderr.split('\n').find((x) => x.includes('ERROR')) ?? 'unknown'}`,
    );
  }
  const after = content();
  if (after.posts !== 0 || after.facts !== 0 || after.bindings !== 0 || after.ledger !== 0) {
    throw new Error('QA content or descendants remain');
  }
  if (preserved() !== beforePreserved) throw new Error('Page/config changed');
  console.log('PASS exact QA ID cleanup, wrong ID rollback, zero content, Page/config unchanged');
} finally {
  cleanup(f);
}
