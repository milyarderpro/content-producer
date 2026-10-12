import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, writeFileSync, existsSync } from 'node:fs';
import { deepStrictEqual, strict as assert } from 'node:assert';
import { format } from 'prettier';
import { row, sql } from '../supabase/tests/database/helpers/plan-lifecycle.js';

// Local Docker database only. SELECT inspection; no business call or remote client.
const label = process.argv[2];
if (!['A', 'B', 'final'].includes(label ?? '')) throw new Error('Expected A, B or final.');
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
  `select array_agg(version order by version) versions from supabase_migrations.schema_migrations`,
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
deepStrictEqual(audit.metrics_owner_privileges, {
  select: true,
  insert: true,
  update: false,
  delete: false,
  truncate: false,
});
deepStrictEqual(audit.owner_role, {
  login: false,
  superuser: false,
  bypassrls: false,
  inherit: false,
  memberships: 0,
  api_create: false,
  internal_create: false,
});
for (const value of Object.values(audit.cleanup as Record<string, number>)) assert.equal(value, 0);
// Normalize reset-dependent role OIDs to stable names, preserving policy bodies.
const roleNames = row<{ roles: Record<string, string> }>(
  `select jsonb_object_agg(oid::text,rolname) roles from pg_roles`,
).roles;
for (const policy of audit.policy_inventory as { roles: string[] }[])
  policy.roles = policy.roles.map((id) => roleNames[id] ?? 'PUBLIC');
const old = JSON.parse(sql(readFileSync('docs/phase-5-7-catalog-audit.sql', 'utf8'))) as Record<
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
  assert.equal(old[key], 0, key);
const legacy = {
  history_privileges: old.history_app_privileges,
  post_update_columns: old.post_update_columns,
  junction_update_columns: old.junction_update_columns,
  history_triggers: old.history_enabled_triggers,
};
const environment = row(
  `select version() postgres,current_setting('enable_seqscan') enable_seqscan,current_setting('TimeZone') timezone`,
);
const evidence = {
  baseline: '05958bf',
  migration_count: manifest.length,
  manifest,
  applied,
  audit,
  legacy,
  environment,
};
if (label === 'B') {
  const first = JSON.parse(readFileSync('docs/phase-5-9-reset-A.json', 'utf8')) as typeof evidence;
  deepStrictEqual(
    evidence,
    first,
    'Independent reset B must reproduce source/history/normalized catalog A.',
  );
}
if (label === 'final' && existsSync('docs/phase-5-9-reset-B.json')) {
  const second = JSON.parse(readFileSync('docs/phase-5-9-reset-B.json', 'utf8')) as typeof evidence;
  deepStrictEqual(
    evidence,
    second,
    'Tests must leave the candidate catalog/source/cleanup unchanged.',
  );
}
writeFileSync(
  `docs/phase-5-9-${label === 'final' ? 'final-catalog' : `reset-${label}`}.json`,
  await format(JSON.stringify(evidence), { parser: 'json' }),
);
console.info(
  `Local ${label}: ${manifest.length} source/applied migrations, exact 33 RPCs, 15/15 RLS, denied caller privileges and zero fixtures; catalog proof saved.`,
);
