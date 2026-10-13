import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { deepStrictEqual, strict as assert } from 'node:assert';
import { format, resolveConfig } from 'prettier';
import { row, sql } from '../supabase/tests/database/helpers/plan-lifecycle.js';

// Local container only, SELECT/catalog inspection. The old 5.9 artifacts are immutable.
const label = process.argv[2];
assert.ok(label && ['preflight', 'A', 'B', 'final'].includes(label));
const baseline = '289afe31d7700cdee962ce8e8d014c449100041c';
assert.equal(execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(), baseline);
const list = (path: string) =>
  execFileSync('git', ['ls-tree', '-r', '--name-only', baseline, path], { encoding: 'utf8' })
    .trim()
    .split('\n')
    .filter(Boolean);
const originalMigrations = list('supabase/migrations');
assert.equal(originalMigrations.length, 63);
const immutable = [
  ...originalMigrations,
  ...list('plans'),
  ...list('docs').filter((p) => /^docs\/phase-5-9-/.test(p)),
  'supabase/config.toml',
  'supabase/seed.sql',
];
for (const file of immutable)
  deepStrictEqual(
    readFileSync(file),
    execFileSync('git', ['show', `${baseline}:${file}`]),
    `Immutable baseline file ${file}`,
  );
const manifest = readdirSync('supabase/migrations')
  .filter((x) => x.endsWith('.sql'))
  .sort()
  .map((file) => ({
    file,
    sha256: createHash('sha256')
      .update(readFileSync(`supabase/migrations/${file}`))
      .digest('hex'),
  }));
const applied = row<{ versions: string[] }>(
  'select array_agg(version order by version) versions from supabase_migrations.schema_migrations',
).versions;
deepStrictEqual(
  applied,
  manifest.map((x) => x.file.slice(0, 14)),
);
const audit = JSON.parse(sql(readFileSync('docs/phase-5-8-catalog-audit.sql', 'utf8'))) as Record<
  string,
  unknown
>;
assert.equal(audit.api_function_count, 33);
assert.equal(audit.authenticated_api_execute_count, 33);
assert.equal(audit.business_table_count, 15);
assert.equal(audit.rls_enabled_table_count, 15);
for (const key of [
  'allowlist_difference_count',
  'overloaded_api_count',
  'unsafe_api_count',
  'banned_api_execute_count',
  'public_api_execute_count',
  'caller_helper_execute_count',
  'public_helper_execute_count',
  'caller_table_privilege_count',
  'caller_column_privilege_count',
  'caller_sequence_privilege_count',
  'public_table_privilege_count',
  'public_sequence_privilege_count',
  'tables_owned_by_api_owner',
  'missing_owner_select_policy_count',
  'unsafe_update_policy_count',
  'unsafe_default_acl_count',
  'invalid_v8_ledger_count',
  'invalid_v6_v7_operation_count',
  'uncompleted_ledger_count',
  'leftover_fault_count',
  'disabled_business_trigger_count',
])
  assert.equal(audit[key], 0, key);
const roles = row<{ roles: Record<string, string> }>(
  'select jsonb_object_agg(oid::text,rolname) roles from pg_roles',
).roles;
for (const p of audit.policy_inventory as { roles: string[] }[])
  p.roles = p.roles.map((x) => roles[x] ?? 'PUBLIC');
for (const value of Object.values(audit.cleanup as Record<string, number>)) assert.equal(value, 0);
deepStrictEqual(audit.private_definer_inventory, [
  { owner: 'postgres', settings: ['search_path=""'], signature: 'internal.current_auth_uid_v1()' },
]);
assert.match(
  sql("select prosrc from pg_proc where oid='internal.current_auth_uid_v1()'::regprocedure").trim(),
  /^select auth\.uid\(\);?$/i,
);
const legacy = JSON.parse(sql(readFileSync('docs/phase-5-7-catalog-audit.sql', 'utf8'))) as Record<
  string,
  unknown
>;
for (const key of [
  'invalid_v6_ledger_count',
  'invalid_v7_ledger_count',
  'history_bound_violation_count',
  'history_token_key_count',
  'history_current_token_value_count',
  'ledger_token_key_count',
  'uncompleted_ledger_count',
  'leftover_fault_fixture_count',
])
  assert.equal(legacy[key], 0, key);
const extra = row(`select
  (select count(*) from auth.users) auth_users,(select count(*) from storage.objects) storage_objects,
  (select count(*) from public.posts where status='draft' and quality_status='passed' and approval_snapshot is null) unapproved_passed_drafts,
  (select jsonb_build_object('login',rolcanlogin,'superuser',rolsuper,'createdb',rolcreatedb,'createrole',rolcreaterole,'replication',rolreplication,'bypassrls',rolbypassrls,'inherit',rolinherit,
    'memberships',(select count(*) from pg_auth_members where member=r.oid),'api_create',has_schema_privilege(rolname,'api','create'),'internal_create',has_schema_privilege(rolname,'internal','create'))
    from pg_roles r where rolname='content_producer_api_owner') owner_role,
  (select count(*) from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='auth'
    and has_table_privilege('content_producer_api_owner',c.oid,'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER')) owner_auth_privileges,
  (select jsonb_agg(jsonb_build_object('signature',p.oid::regprocedure::text,'owner',pg_get_userbyid(p.proowner),'definer',p.prosecdef,'settings',p.proconfig,
     'source_sha256',encode(extensions.digest(convert_to(pg_get_functiondef(p.oid),'UTF8'),'sha256'),'hex'),'acl',p.proacl::text) order by p.oid::regprocedure::text)
     from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname in('api','internal')) functions,
  (select jsonb_agg(jsonb_build_object('object',c.oid::regclass::text,'owner',pg_get_userbyid(c.relowner),'acl',c.relacl::text) order by c.oid::regclass::text)
     from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname in('public','internal') and c.relkind in('r','S')) objects,
  (select jsonb_build_object('owner',pg_get_userbyid(proowner),'definer',prosecdef,'settings',proconfig,'api_owner_execute',has_function_privilege('content_producer_api_owner',oid,'EXECUTE'))
    from pg_proc where oid='internal.normalize_unapproved_drafts_v1()'::regprocedure) normalization_helper,
  current_setting('enable_seqscan') enable_seqscan,version() postgres`);
for (const key of [
  'auth_users',
  'storage_objects',
  'unapproved_passed_drafts',
  'owner_auth_privileges',
])
  assert.equal(extra[key], 0, key);
deepStrictEqual(extra.normalization_helper, {
  owner: 'postgres',
  definer: false,
  settings: ['search_path=""'],
  api_owner_execute: false,
});
for (const [key, value] of Object.entries(extra.owner_role as Record<string, boolean | number>))
  assert.equal(value, key === 'memberships' ? 0 : false, key);
deepStrictEqual(audit.metrics_owner_privileges, {
  delete: false,
  insert: true,
  select: true,
  update: false,
  truncate: false,
});
const old = JSON.parse(readFileSync('docs/phase-5-9-final-catalog.json', 'utf8')) as {
  legacy: {
    post_update_columns: unknown;
    junction_update_columns: unknown;
    history_privileges: unknown;
  };
};
deepStrictEqual(legacy.post_update_columns, old.legacy.post_update_columns);
deepStrictEqual(legacy.junction_update_columns, old.legacy.junction_update_columns);
deepStrictEqual(legacy.history_app_privileges, old.legacy.history_privileges);
const evidence = {
  baseline,
  original_migration_count: 63,
  migration_count: manifest.length,
  manifest,
  applied,
  audit,
  legacy: {
    post_update_columns: legacy.post_update_columns,
    junction_update_columns: legacy.junction_update_columns,
    history_privileges: legacy.history_app_privileges,
    history_triggers: legacy.history_enabled_triggers,
  },
  extra,
};
if (label === 'B' || label === 'final')
  deepStrictEqual(
    evidence,
    JSON.parse(
      readFileSync(
        `docs/phase-5-batch-b-remediation-reset-${label === 'B' ? 'A' : 'B'}.json`,
        'utf8',
      ),
    ),
    'Source, normalized catalog, function definitions/ACL and cleanup must reproduce exactly.',
  );
const file = `docs/phase-5-batch-b-remediation-${label === 'final' ? 'final-catalog' : label === 'preflight' ? 'preflight' : `reset-${label}`}.json`;
writeFileSync(
  file,
  await format(JSON.stringify(evidence), { ...(await resolveConfig(file)), parser: 'json' }),
);
console.info(
  `CR-016 ${label}: ${manifest.length} source/applied migrations, 63 immutable old migrations, 33 RPCs, 15/15 RLS, minimum unchanged privileges, exact bridge/admin-helper boundary and zero data/faults.`,
);
