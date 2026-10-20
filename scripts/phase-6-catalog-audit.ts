import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { deepStrictEqual, strict as assert } from 'node:assert';
import { format, resolveConfig } from 'prettier';
import { row, sql } from '../supabase/tests/database/helpers/plan-lifecycle.js';

// SELECT-only audit: retain the accepted 67-migration CR-016 baseline.
// Pin the CR-021 OAuth hook (68th) and CR-046 projection fix (69th) independently,
// then prove their only allowed catalog differences before baseline comparison.
const expected = JSON.parse(
  readFileSync('docs/phase-5-batch-b-remediation-final-catalog.json', 'utf8'),
);
const baseline = expected.baseline;
assert.equal(expected.migration_count, 67);
assert.equal(expected.original_migration_count, 63);
const manifest = readdirSync('supabase/migrations')
  .filter((x) => x.endsWith('.sql'))
  .sort()
  .map((file) => ({
    file,
    sha256: createHash('sha256')
      .update(readFileSync(`supabase/migrations/${file}`))
      .digest('hex'),
  }));
assert.equal(manifest.length, 69);
deepStrictEqual(manifest.slice(0, 67), expected.manifest);
// Git blob hashes pin the exact bytes of each post-baseline migration, without
// editing either the accepted baseline or an already-applied migration.
deepStrictEqual(
  manifest.slice(67).map(({ file }) => {
    const body = readFileSync(`supabase/migrations/${file}`);
    return {
      file,
      git_blob_sha1: createHash('sha1')
        .update(`blob ${body.length}\0`)
        .update(body)
        .digest('hex'),
    };
  }),
  [
    {
      file: '20261016120000_add_mcp_oauth_resource_audience_hook.sql',
      git_blob_sha1: 'df0aa723c7eab77085f5badf532915258f719473',
    },
    {
      file: '20261020074800_expose_generation_context_config_public_id.sql',
      git_blob_sha1: '21101f64796019ce9ea97aee75b39874450c3631',
    },
  ],
);
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
assert.equal(audit.metrics_immutable_trigger, 1);
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
const hook = row<{
  owner: string;
  definer: boolean;
  settings: string[];
  auth_admin_execute: boolean;
  caller_execute: boolean;
  auth_admin_schema_usage: boolean;
}>(`select pg_get_userbyid(proowner) owner, prosecdef definer, proconfig settings,
  has_function_privilege('supabase_auth_admin',oid,'execute') auth_admin_execute,
  (has_function_privilege('anon',oid,'execute')
    or has_function_privilege('authenticated',oid,'execute')
    or has_function_privilege('service_role',oid,'execute')) caller_execute,
  has_schema_privilege('supabase_auth_admin','internal','usage') auth_admin_schema_usage
  from pg_proc where oid='internal.mcp_oauth_resource_audience_v1(jsonb)'::regprocedure`);
deepStrictEqual(hook, {
  owner: 'postgres',
  definer: false,
  settings: ['search_path=""'],
  auth_admin_execute: true,
  caller_execute: false,
  auth_admin_schema_usage: true,
});
const hookFunction = (extra.functions as { signature: string }[]).find(
  (x) => x.signature === 'internal.mcp_oauth_resource_audience_v1(jsonb)',
);
assert.ok(hookFunction, 'CR-021 hook is missing from catalog');
extra.functions = (extra.functions as { signature: string }[]).filter(
  (x) => x.signature !== 'internal.mcp_oauth_resource_audience_v1(jsonb)',
);
// CR-046 is permitted to add only the selected Page+niche config UUID key.
// Reverse exactly that projection on a READ-ONLY function definition to compare
// every other source byte, owner, security bit, SET option, and ACL against the
// accepted Phase 5/9 baseline; do not weaken the frozen snapshot.
const functionDefinition = row<{ definition: string }>(
  `select pg_catalog.pg_get_functiondef(
    'api.get_page_generation_context(integer,uuid,uuid,text,integer,text,text,text,timestamp with time zone)'::regprocedure
  ) definition`,
).definition;
const addedProjection = "'config_public_id', v_page.config_public_id, ";
assert.equal(
  functionDefinition.split(addedProjection).length,
  2,
  'CR-046 projection must appear exactly once in the canonical SQL definition',
);
const previousDefinition = functionDefinition.replace(addedProjection, '');
const currentSourceSha = createHash('sha256').update(functionDefinition).digest('hex');
const previousSourceSha = createHash('sha256').update(previousDefinition).digest('hex');
assert.notEqual(currentSourceSha, previousSourceSha);
const generationFunctions = (
  extra.functions as { signature: string; source_sha256: string }[]
).filter((x) => x.signature.startsWith('api.get_page_generation_context('));
assert.equal(generationFunctions.length, 1, 'Expected one generation-context RPC');
assert.equal(generationFunctions[0].source_sha256, currentSourceSha);
// The archived baseline comparison below must still match exactly.
generationFunctions[0].source_sha256 = previousSourceSha;
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
  migration_count: 67,
  manifest: manifest.slice(0, 67),
  applied: applied.slice(0, 67),
  audit,
  legacy: {
    post_update_columns: legacy.post_update_columns,
    junction_update_columns: legacy.junction_update_columns,
    history_privileges: legacy.history_app_privileges,
    history_triggers: legacy.history_enabled_triggers,
  },
  extra,
};
deepStrictEqual(
  evidence,
  expected,
  'Accepted 67-migration source, catalog, function definitions/ACL and cleanup must reproduce exactly.',
);
const file = 'artifacts/phase-9-5-catalog.json';
writeFileSync(
  file,
  await format(
    JSON.stringify({
      ...evidence,
      migration_count: manifest.length,
      manifest,
      applied,
      oauth_hook: { ...hook, function: hookFunction },
      config_public_id_projection: {
        signature: generationFunctions[0].signature,
        current_source_sha256: currentSourceSha,
        accepted_baseline_source_sha256: previousSourceSha,
        extra_projection: addedProjection,
      },
    }),
    { ...(await resolveConfig(file)), parser: 'json' },
  ),
);
console.info(
  'Phase 10.4 catalog: 69 source/applied migrations, 33 RPCs, 15/15 RLS, unchanged 67-migration baseline after exact CR-046 projection normalization, pinned CR-021/CR-046 migrations, private Auth hook, grants and zero fixtures/faults: PASS.',
);
