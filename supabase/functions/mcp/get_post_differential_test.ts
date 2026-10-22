// Issue #40: compare real isolated SQL RPC JSON with the unchanged strict MCP
// output schema and the masking boundary. No production connection or tokens.
import type { RequestContext } from './auth.ts';
import { invoke } from './foundation.ts';
import { getPostOutputSchema } from './post_base.ts';

type Sample = {
  sources: boolean;
  checks: boolean;
  metrics: boolean;
  bytes?: number;
  sqlError?: boolean;
  rpc?: unknown;
};
const workspace = '44444444-4444-4444-8444-444444444444';
const context: RequestContext = {
  requestId: 'issue-40-isolated',
  actorUserId: '11111111-1111-4111-8111-111111111111',
  oauthClientId: '33333333-3333-4333-8333-333333333333',
  workspacePublicId: workspace,
  accessToken: 'local-fixture-only',
  supabaseUrl: 'http://127.0.0.1:54321',
  publishableKey: 'local-fixture-key',
};

function check(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}
Deno.test('Issue #40: eight SQL get_post projections retain strict MCP contract', async () => {
  const path = Deno.env.get('GET_POST_DIFFERENTIAL_FILE');
  check(path, 'MISSING_ISOLATED_SQL_MATRIX');
  const samples = JSON.parse(await Deno.readTextFile(path)) as Sample[];
  check(samples.length === 8, 'EXPECTED_EIGHT_FLAG_COMBINATIONS');
  const labels = new Set<string>();
  const failures: string[] = [];
  const original = globalThis.fetch;
  try {
    for (const sample of samples) {
      const label = `${Number(sample.sources)}${Number(sample.checks)}${Number(sample.metrics)}`;
      check(!labels.has(label), 'DUPLICATE_FLAG_COMBINATION');
      labels.add(label);
      if (sample.sqlError || !sample.rpc) {
        console.log(`get_post matrix ${label}: SQL_RPC_ERROR`);
        failures.push(label + ':SQL');
        continue;
      }
      const parsed = getPostOutputSchema.safeParse(sample.rpc);
      const issues = parsed.success
        ? []
        : parsed.error.issues.map((issue) => `${issue.path.join('.')}:${issue.code}`);
      // Paths and codes only; no values, source documents, SQL, JWT or response body.
      globalThis.fetch = (() =>
        Promise.resolve(
          new Response(JSON.stringify(sample.rpc), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          }),
        )) as typeof fetch;
      const response = await invoke(
        'get_post',
        context,
        {
          p_request_schema_version: 1,
          p_workspace_public_id: workspace,
          p_include_sources: sample.sources,
          p_include_checks: sample.checks,
          p_include_latest_metrics: sample.metrics,
        },
        getPostOutputSchema,
      );
      const adapterOk = !('isError' in response);
      console.log(
        `get_post matrix ${label}: sql=OK bytes=${sample.bytes ?? '?'} json=OK zod=${parsed.success ? 'OK' : 'FAIL'} adapter=${adapterOk ? 'OK' : 'MASKED'} paths=${issues.join(',') || '-'}`,
      );
      if (!parsed.success || !adapterOk) {
        failures.push(label + ':SCHEMA_OR_REDACTION');
        continue;
      }
      const post = parsed.data.data.post;
      check(post.fact_bindings.length === 7, label + ':SEVEN_ALLOCATIONS_REQUIRED');
      check(
        post.fact_bindings.every((binding) =>
          sample.sources
            ? (binding.source_snapshot?.sources.length ?? 0) > 0
            : !binding.source_snapshot,
        ),
        label + ':SOURCE_INCLUDE_EXCLUDE',
      );
      check(
        sample.checks
          ? post.system_checks !== null &&
              post.editorial_checks !== null &&
              Object.keys(post.system_checks).length > 0 &&
              Object.keys(post.editorial_checks).length > 0
          : post.system_checks === null && post.editorial_checks === null,
        label + ':CHECK_INCLUDE_EXCLUDE',
      );
      // Only source-enabled projections exercise this precise LIVE-shaped
      // mismatch: numeric structures, qualifiers, non-null update dates, and
      // both one- and two-source snapshots. No payload is logged.
      if (sample.sources && !sample.checks && !sample.metrics) {
        const snapshots = post.fact_bindings.map((binding) => binding.source_snapshot!);
        check(
          snapshots.filter((snapshot) => snapshot.numbers.length > 0).length >= 3,
          'SOURCE_VARIANT_NONEMPTY_NUMBERS',
        );
        check(
          snapshots.some((snapshot) => snapshot.qualifiers.estimate === true &&
            snapshot.qualifiers.method !== null),
          'SOURCE_VARIANT_ESTIMATE_METHOD',
        );
        check(
          snapshots.some((snapshot) => snapshot.qualifiers.time !== null &&
            snapshot.qualifiers.location !== null),
          'SOURCE_VARIANT_TIME_LOCATION',
        );
        check(
          snapshots.some((snapshot) => snapshot.sources.length === 2) &&
            snapshots.some((snapshot) => snapshot.sources.length === 1),
          'SOURCE_VARIANT_ONE_TWO_OFFICIAL_SOURCES',
        );
        check(
          snapshots.some((snapshot) =>
            snapshot.sources.some((source) => source.updated_at === '2026-09-22')
          ),
          'SOURCE_VARIANT_NON_NULL_UPDATE_DATE',
        );
      }
      check(post.status === 'draft' && post.revision === 1, label + ':UNCHANGED_DRAFT');
      check(parsed.data.data.approval === null, label + ':NO_APPROVAL');
      // No metrics exist for the draft: include_latest_metrics must still succeed.
      check(parsed.data.data.latest_metrics === null, label + ':NO_METRICS_FOR_DRAFT');
    }
  } finally {
    globalThis.fetch = original;
  }
  check(labels.size === 8, 'FLAG_MATRIX_INCOMPLETE');
  check(failures.length === 0, 'GET_POST_DIFFERENTIAL_FAILURE:' + failures.join(','));
});

// An independent PostgREST boundary: actual local owner JWT is used by the
// preceding Vitest fixture before teardown. Only ephemeral JSON is carried here.
Deno.test(
  'Issue #40: real authenticated PostgREST HTTP responses validate all eight outputs',
  async () => {
    const path = Deno.env.get('GET_POST_HTTP_DIFFERENTIAL_FILE');
    check(path, 'MISSING_REAL_HTTP_MATRIX');
    const captured = JSON.parse(await Deno.readTextFile(path)) as {
      cases: Array<Sample & { status: number; jsonValid: boolean }>;
      negative: { status: number; bytes: number; jsonValid: boolean };
    };
    check(captured.cases.length === 8, 'HTTP_EXPECTED_EIGHT_COMBINATIONS');
    const seen = new Set<string>();
    const failures: string[] = [];
    for (const sample of captured.cases) {
      const label = `${Number(sample.sources)}${Number(sample.checks)}${Number(sample.metrics)}`;
      check(!seen.has(label), 'HTTP_DUPLICATE_CASE');
      seen.add(label);
      const parsed = getPostOutputSchema.safeParse(sample.rpc);
      const paths = parsed.success
        ? []
        : parsed.error.issues.map((issue) => `${issue.path.join('.')}:${issue.code}`);
      // Only safe structural diagnostics. No JWT, raw response or source text.
      console.log(
        `get_post HTTP ${label}: status=${sample.status} bytes=${sample.bytes} json=${sample.jsonValid ? 'OK' : 'FAIL'} zod=${parsed.success ? 'OK' : 'FAIL'} paths=${paths.join(',') || '-'}`,
      );
      const bodyBytes = sample.bytes ?? Number.POSITIVE_INFINITY;
      if (sample.status !== 200 || !sample.jsonValid || bodyBytes > 256 * 1024 || !parsed.success) {
        failures.push(label);
        continue;
      }
      const data = parsed.data.data;
      const post = data.post;
      check(post.fact_bindings.length === 7, label + ':HTTP_SEVEN_BINDINGS');
      check(
        post.fact_bindings.every((binding) =>
          sample.sources
            ? (binding.source_snapshot?.sources.length ?? 0) > 0
            : !binding.source_snapshot,
        ),
        label + ':HTTP_SOURCE_VISIBILITY',
      );
      check(
        sample.checks
          ? post.system_checks !== null &&
              post.editorial_checks !== null &&
              Object.keys(post.system_checks).length > 0 &&
              Object.keys(post.editorial_checks).length > 0
          : post.system_checks === null && post.editorial_checks === null,
        label + ':HTTP_CHECK_VISIBILITY',
      );
      check(post.status === 'draft' && post.revision === 1, label + ':HTTP_DRAFT');
      check(data.approval === null && data.latest_metrics === null, label + ':HTTP_UNAPPROVED');
      const forbidden =
        /"(?:owner_user_id|oauth_client_id|reservation_token|claim_token|access_token|refresh_token|password|secret|internal_id)"\s*:/i;
      check(!forbidden.test(JSON.stringify(parsed.data)), label + ':HTTP_PRIVATE_FIELD');
    }
    console.log(
      `get_post HTTP foreign-owner: status=${captured.negative.status} bytes=${captured.negative.bytes} json=${captured.negative.jsonValid ? 'OK' : 'FAIL'}`,
    );
    check(
      captured.negative.status >= 400 && captured.negative.status < 500,
      'HTTP_CROSS_OWNER_DENIAL',
    );
    check(seen.size === 8 && failures.length === 0, 'HTTP_MATRIX_FAILURE:' + failures.join(','));
  },
);
