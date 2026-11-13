import { strict as assert } from 'node:assert';
import { activeMcpToolNames } from './mcp-catalog-inventory.js';
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';

type CatalogFunction = {
  signature: string;
  owner: string;
  definer: boolean;
  settings: string[];
  source_sha256: string;
  acl: string;
};
type CatalogObject = {
  object: string;
  kind: string;
  owner: string;
  acl: string;
  rls: boolean;
  force_rls: boolean;
};
export type Catalog = { functions: CatalogFunction[]; objects: CatalogObject[] } & Record<
  string,
  unknown
>;
export type CatalogPin = {
  migrationCount: number;
  manifestSha256: string;
  sections: Record<string, string>;
};
const hash = (value: unknown): string =>
  createHash('sha256').update(JSON.stringify(value)).digest('hex');

export function migrationManifest(): { file: string; sha256: string }[] {
  return readdirSync('supabase/migrations')
    .filter((file) => file.endsWith('.sql'))
    .sort()
    .map((file) => ({
      file,
      sha256: createHash('sha256')
        .update(readFileSync(`supabase/migrations/${file}`))
        .digest('hex'),
    }));
}

export function catalogSections(catalog: Catalog): Record<string, string> {
  return Object.fromEntries(Object.entries(catalog).map(([name, value]) => [name, hash(value)]));
}

export function assertCatalogPin(
  catalog: Catalog,
  pin: CatalogPin,
  manifest = migrationManifest(),
): void {
  assert.equal(manifest.length, pin.migrationCount, 'CATALOG_MIGRATION_COUNT_DRIFT');
  assert.equal(hash(manifest), pin.manifestSha256, 'CATALOG_MIGRATION_SOURCE_DRIFT');
  assert.deepEqual(catalogSections(catalog), pin.sections, 'CATALOG_SCHEMA_SOURCE_OR_ACL_DRIFT');
}

export async function collectCatalog(): Promise<Catalog> {
  const { sql } = await import('../supabase/tests/database/helpers/plan-lifecycle.js');
  return JSON.parse(
    sql(`begin read only; ${readFileSync('scripts/trivia-v2-catalog.sql', 'utf8')} commit;`),
  ) as Catalog;
}

export async function runCatalogAudit(): Promise<void> {
  // Pure pin validation is also used by source CI, which has no Docker stack.
  // Resolve the guarded local target only when the database audit is invoked.
  const { row, sql } = await import('../supabase/tests/database/helpers/plan-lifecycle.js');
  const pin = JSON.parse(readFileSync('scripts/trivia-v2-catalog-pin.json', 'utf8')) as CatalogPin;
  const manifest = migrationManifest();
  const archived = JSON.parse(
    readFileSync('docs/phase-5-batch-b-remediation-final-catalog.json', 'utf8'),
  );
  assert.deepEqual(manifest.slice(0, 67), archived.manifest, 'ARCHIVED_MIGRATION_BASELINE_DRIFT');
  assert.deepEqual(
    row<{ versions: string[] }>(
      'select array_agg(version order by version) versions from supabase_migrations.schema_migrations',
    ).versions,
    manifest.map(({ file }) => file.slice(0, 14)),
    'APPLIED_MIGRATION_HISTORY_DRIFT',
  );
  const catalog = await collectCatalog();
  assertCatalogPin(catalog, pin, manifest);
  // Source-only deltas to the archived baseline are explicitly bounded. The
  // pinned final catalog validates their exact bytes; every other old function
  // must still match the archive, including its body and least-privilege ACL.
  const allowedSourceChanges = new Set([
    'api.get_post',
    'api.list_posts',
    'api.reschedule_post',
    'internal.assert_write_operation_name_v1',
    'internal.canonical_request_hash_v1',
    'internal.lifecycle_current_system_v1',
    'internal.lifecycle_effective_gate_v1',
    'internal.lifecycle_evidence_history_valid_v1',
    'internal.lifecycle_evidence_v1',
    'internal.lifecycle_raise_v1',
    'internal.lifecycle_response_valid_v1',
    'internal.plan_validate_event_v1',
    'internal.post_history_validate_v1',
    'internal.post_system_base_v1',
    'internal.post_usage_immutable_v1',
    'internal.rate_limit_group_for_write_operation_v1',
    'internal.trivia_fact_input_v1',
    'internal.trivia_resolve_fact_v1',
    'internal.trivia_resolve_fact_v2',
    'internal.trivia_response_valid_v5',
    'internal.trivia_rpc_raise_v1',
    'internal.validate_post_row',
  ]);
  // CR-062 tasks 3/5/6: reviewed config2 Page, plan, post and null-dimension paths.
  for (const name of [
    'api.claim_content_plan_items',
    'api.create_content_plan',
    'api.create_page',
    'api.get_content_plan',
    'api.get_performance_insights',
    'api.get_workspace_context',
    'api.update_page',
    'internal.metric_insight_rows_v1',
    'internal.plan_context_snapshot_v1',
    'internal.plan_is_item_v1',
    'internal.plan_raise_error_v1',
    'internal.post_raise_v1',
    'internal.validate_content_plan_config',
    'internal.validate_page_niche_config',
  ])
    allowedSourceChanges.add(name);
  const sourceDeltas: string[] = [];
  let replacedContext = 0;
  const retiredApi = new Set([
    'api.trivia_find_similar_facts',
    'api.trivia_register_and_reserve_facts',
    'api.trivia_release_facts',
    'api.save_post',
    'api.revise_post',
  ]);
  const retiredMaintenanceV1 = new Set(['api.trivia_reverify_fact', 'api.trivia_correct_fact']);
  const retiredSignatures: string[] = [];
  for (const previous of archived.extra.functions as CatalogFunction[]) {
    const current = catalog.functions.find(({ signature }) => signature === previous.signature);
    if (
      !current &&
      previous.signature ===
        'api.get_page_generation_context(integer,uuid,uuid,text,integer,text,text,text,timestamp with time zone)'
    ) {
      const replacement = catalog.functions.find(
        ({ signature }) => signature === previous.signature.slice(0, -1) + ',uuid)',
      );
      assert.ok(replacement, 'EDITORIAL_CONTEXT_SIGNATURE_REPLACEMENT_MISSING');
      assert.deepEqual(
        { ...replacement, signature: previous.signature, source_sha256: previous.source_sha256 },
        previous,
        'EDITORIAL_CONTEXT_METADATA_DRIFT',
      );
      replacedContext++;
      continue;
    }
    if (
      !current &&
      (retiredApi.has(previous.signature.split('(')[0]!) ||
        retiredMaintenanceV1.has(previous.signature.split('(')[0]!))
    ) {
      retiredSignatures.push(previous.signature);
      continue;
    }
    assert.ok(current, `ARCHIVED_FUNCTION_REMOVED:${previous.signature}`);
    const metadata = { ...current, source_sha256: previous.source_sha256 };
    if (previous.signature === 'internal.validate_page_niche_config()') {
      assert.deepEqual(current.settings, ['search_path=""'], 'EDITORIAL_CONFIG_SEARCH_PATH_DRIFT');
      metadata.settings = previous.settings; // only this explicit hardening changed metadata
    }
    assert.deepEqual(metadata, previous, `ARCHIVED_FUNCTION_METADATA_DRIFT:${previous.signature}`);
    if (current.source_sha256 !== previous.source_sha256) {
      assert.ok(
        allowedSourceChanges.has(previous.signature.split('(')[0]!),
        `UNREVIEWED_FUNCTION_SOURCE_DELTA:${previous.signature}`,
      );
      sourceDeltas.push(previous.signature);
    }
  }
  assert.equal(sourceDeltas.length, allowedSourceChanges.size);
  assert.equal(replacedContext, 1);
  assert.deepEqual(
    [...new Set(retiredSignatures.map((signature) => signature.split('(')[0]))].sort(),
    [...retiredApi, ...retiredMaintenanceV1].sort(),
    'RETIRED_V1_API_INVENTORY_DRIFT',
  );

  // Reuse every closed-grant/RLS/ledger/fixture invariant from the historical
  // SELECT-only query. Only its explicit API allowlist is extended for CR-053.
  let auditSql = readFileSync('docs/phase-5-8-catalog-audit.sql', 'utf8');
  for (const name of retiredApi) auditSql = auditSql.replace(`'${name.slice(4)}',`, '');
  auditSql = auditSql.replace(
    "'trivia_reverify_fact',",
    "'get_trivia_editorial_catalog','update_trivia_editorial_catalog','trivia_find_similar_facts_v2','save_post_v2','revise_post_v2','trivia_reverify_fact',",
  );
  const audit = JSON.parse(sql(`begin read only; ${auditSql} commit;`));
  const expectedNames = activeMcpToolNames();
  assert.equal(audit.api_function_count, expectedNames.length);
  assert.equal(audit.authenticated_api_execute_count, expectedNames.length);
  assert.equal(audit.business_table_count, 19);
  assert.equal(audit.rls_enabled_table_count, 19);
  // The legacy query counts overloads/names, not signature sets. Validate both
  // exactly here; all metadata/source/ACL is additionally covered by the pin.
  const api = catalog.functions.filter(({ signature }) => signature.startsWith('api.'));
  const names = api.map(({ signature }) => signature.slice(4, signature.indexOf('(')));
  assert.deepEqual([...names].sort(), expectedNames);
  assert.equal(new Set(names).size, expectedNames.length);
  assert.deepEqual(
    [...new Set(names.filter((name) => names.filter((n) => n === name).length > 1))].sort(),
    [],
  );
  assert.equal(audit.overloaded_api_count, 0);
  assert.equal(audit.allowlist_difference_count, 0);
  assert.equal(audit.metrics_immutable_trigger, 1);
  for (const [key, value] of Object.entries(audit)) {
    if (
      key.endsWith('_count') &&
      ![
        'api_function_count',
        'authenticated_api_execute_count',
        'business_table_count',
        'rls_enabled_table_count',
        'overloaded_api_count',
      ].includes(key)
    ) {
      assert.equal(value, 0, key);
    }
  }
  assert.deepEqual(
    audit.private_definer_inventory,
    [
      'internal.current_auth_uid_v1()',
      'internal.trivia_catalog_bump_v2(bigint)',
      'internal.trivia_catalog_config_hook_v2()',
      'internal.trivia_catalog_evidence_hook_v2()',
      'internal.trivia_catalog_fact_hook_v2()',
      'internal.trivia_catalog_usage_hook_v2()',
      'internal.trivia_require_native_evidence_v2()',
    ].map((signature) => ({ owner: 'postgres', settings: ['search_path=""'], signature })),
  );
  assert.deepEqual(audit.metrics_owner_privileges, {
    delete: false,
    insert: true,
    select: true,
    update: false,
    truncate: false,
  });
  for (const [name, value] of Object.entries(audit.cleanup))
    assert.equal(value, 0, `cleanup:${name}`);
  // Include the two new dependent tables and any future unexpected table in
  // cleanup, without accepting niches (the migration-created registry) as empty.
  for (const object of catalog.objects.filter(
    ({ kind, object }) => kind === 'r' && object !== 'niches' && object !== 'public.niches',
  )) {
    assert.match(object.object, /^(?:public\.|internal\.)?[a-z_][a-z_0-9]*$/);
    assert.equal(
      row<{ count: number }>(`select count(*)::integer count from ${object.object}`).count,
      0,
      `cleanup:${object.object}`,
    );
  }
  const extra = row<{
    users: number;
    storage: number;
    owner_auth: number;
    owner_role: Record<string, boolean | number>;
  }>(`select
    (select count(*)::integer from auth.users) users,
    (select count(*)::integer from storage.objects) storage,
    (select count(*)::integer from pg_class c join pg_namespace n on n.oid=c.relnamespace
      where n.nspname='auth' and c.relkind='r' and has_table_privilege('content_producer_api_owner',c.oid,'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER')) owner_auth,
    (select jsonb_build_object('login',rolcanlogin,'superuser',rolsuper,'createdb',rolcreatedb,'createrole',rolcreaterole,
      'replication',rolreplication,'bypassrls',rolbypassrls,'inherit',rolinherit,
      'memberships',(select count(*) from pg_auth_members where member=r.oid),
      'api_create',has_schema_privilege(rolname,'api','create'),'internal_create',has_schema_privilege(rolname,'internal','create'))
      from pg_roles r where rolname='content_producer_api_owner') owner_role`);
  assert.equal(extra.users, 0);
  assert.equal(extra.storage, 0);
  assert.equal(extra.owner_auth, 0);
  for (const [key, value] of Object.entries(extra.owner_role))
    assert.equal(value, key === 'memberships' ? 0 : false, key);
  // Preserve the legacy bound-history/token and least-privilege checks too.
  const legacy = JSON.parse(
    sql(`begin read only; ${readFileSync('docs/phase-5-7-catalog-audit.sql', 'utf8')} commit;`),
  );
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
  const old = JSON.parse(readFileSync('docs/phase-5-9-final-catalog.json', 'utf8'));
  assert.deepEqual(legacy.post_update_columns, old.legacy.post_update_columns);
  assert.deepEqual(legacy.junction_update_columns, old.legacy.junction_update_columns);
  assert.deepEqual(legacy.history_app_privileges, old.legacy.history_privileges);
  writeFileSync(
    'artifacts/phase-9-5-catalog.json',
    JSON.stringify(
      {
        migration_count: manifest.length,
        manifest,
        catalog,
        audit,
        legacy,
        extra,
        accepted_sections: pin.sections,
        archived_source_deltas: sourceDeltas,
        evidence: 'LOCAL_CATALOG_ONLY',
      },
      null,
      2,
    ),
  );
  console.info(
    `CR-062 catalog: ${manifest.length} source/applied migrations, ${expectedNames.length} RPC names/signatures, five v1 names absent, 19/19 RLS, exact schema/source/ACL and zero fixtures/faults: PASS.`,
  );
}
