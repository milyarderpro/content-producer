// CR-038: per-operation, short-lived, default-absent Phase 10.4 pilot permits.
// This is NOT HTTP authentication: the public no-auth endpoint remains a risk.
// Never place grant JSON, operation keys or reservation tokens in this repository.
const WORKSPACE = 'cad2885e-952e-41b3-9eae-d2d9d75d533d';
const PAGE = '37457236-17ec-4486-8880-6832460ae411';
const CONFIG_UPDATED_AT = '2026-10-19T10:33:17.018070Z';
const HEX64 = /^[a-f0-9]{64}$/;
const UUID4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const stages = {
  trivia_register_and_reserve_facts: 'MCP_MAN03_RESERVE_GRANT_JSON',
  save_post: 'MCP_MAN03_SAVE_GRANT_JSON',
  revise_post: 'MCP_MAN04_REVISE_GRANT_JSON',
  approve_post: 'MCP_MAN04_APPROVE_GRANT_JSON',
} as const;

type Stage = keyof typeof stages;
type Grant = Record<string, unknown>;
type Params = Record<string, unknown>;

function record(value: unknown): Params | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Params) : null;
}
function exactFields(value: Grant, required: string[]): boolean {
  return Object.keys(value).sort().join('|') === required.slice().sort().join('|');
}
function sorted(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sorted);
  const obj = record(value);
  return obj
    ? Object.fromEntries(
        Object.keys(obj)
          .sort()
          .map((key) => [key, sorted(obj[key])]),
      )
    : value;
}
async function digest(value: string): Promise<string> {
  const data = new Uint8Array(
    await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value)),
  );
  return Array.from(data, (byte) => byte.toString(16).padStart(2, '0')).join('');
}
async function matchesSecret(value: unknown, expected: unknown): Promise<boolean> {
  return (
    typeof value === 'string' &&
    UUID4.test(value) &&
    typeof expected === 'string' &&
    HEX64.test(expected) &&
    (await digest(value)) === expected
  );
}
function validExpiry(expiresAt: unknown, now: number): boolean {
  if (
    typeof expiresAt !== 'string' ||
    !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d+)?Z$/.test(expiresAt)
  )
    return false;
  const until = Date.parse(expiresAt);
  // Limit exposure to 2 hours, including against future-dated long-lived grants.
  return Number.isFinite(until) && until > now && until <= now + 2 * 60 * 60 * 1000;
}
function positions(items: unknown[], limit: number): boolean {
  return (
    items.length >= 5 &&
    items.length <= limit &&
    items.every((value, i) => record(value)?.position === i + 1)
  );
}
function serverScoped(params: Params): boolean {
  return (
    params.p_request_schema_version === 1 &&
    params.p_workspace_public_id === WORKSPACE &&
    typeof params.p_operation_key === 'string' &&
    UUID4.test(params.p_operation_key)
  );
}
function validReserve(params: Params): boolean {
  const facts = params.p_facts;
  if (
    params.p_page_public_id !== PAGE ||
    params.p_expected_config_updated_at !== CONFIG_UPDATED_AT ||
    params.p_fact_reuse_scope !== 'workspace_unique' ||
    params.p_reservation_ttl_minutes !== 30 ||
    !Array.isArray(facts) ||
    !positions(facts, 8)
  )
    return false;
  const ids = new Set<string>();
  for (const item of facts) {
    const fact = record(item);
    const candidate = record(fact?.candidate);
    const sources = fact?.sources;
    if (
      !candidate ||
      candidate.topic_key !== 'nature_science' ||
      candidate.normalization_version !== 1 ||
      candidate.ontology_version !== 1 ||
      typeof candidate.candidate_key !== 'string' ||
      ids.has(candidate.candidate_key) ||
      fact?.risk_class !== 'standard' ||
      fact?.freshness_class !== 'stable' ||
      !Array.isArray(sources) ||
      sources.length === 0 ||
      !sources.every((s: unknown) => {
        const source = record(s);
        if (!source || !['A', 'B'].includes(String(source.tier))) return false;
        try {
          return (
            new URL(String(source.canonical_url)).hostname.endsWith('.nasa.gov') &&
            new URL(String(source.url)).hostname.endsWith('.nasa.gov')
          );
        } catch {
          return false;
        }
      })
    )
      return false;
    ids.add(candidate.candidate_key);
  }
  return true;
}
function validSave(params: Params): boolean {
  const payload = record(params.p_content_payload);
  const body = record(payload?.body);
  const facts = body?.facts;
  const bindings = params.p_fact_bindings;
  const snapshot = record(params.p_generation_snapshot);
  const snapshotTextBudget = record(snapshot?.text_budget);
  const checks = record(params.p_editorial_checks);
  return (
    params.p_page_public_id === PAGE &&
    params.p_niche_key === 'trivia' &&
    params.p_expected_config_updated_at === CONFIG_UPDATED_AT &&
    params.p_plan_item === null &&
    params.p_scheduled_at === null &&
    params.p_content_schema_version === 1 &&
    params.p_format_key === 'single_subject_fast' &&
    params.p_topic_key === 'nature_science' &&
    params.p_interaction_goal === 'follow' &&
    !!payload &&
    payload.schema_version === 1 &&
    !!body &&
    Array.isArray(facts) &&
    positions(facts, 8) &&
    Array.isArray(bindings) &&
    bindings.length === facts.length &&
    bindings.every((x: unknown, i: number) => record(x)?.position === i + 1) &&
    !!snapshot &&
    snapshot.profile_key === 'fast_trivia' &&
    snapshot.config_updated_at === CONFIG_UPDATED_AT &&
    snapshot.fact_count_applied === facts.length &&
    snapshot.fact_reuse_scope === 'workspace_unique' &&
    snapshot.locale === 'en-US' &&
    snapshot.render_style === 'plain_lines' &&
    Array.isArray(snapshot.target_markets) &&
    JSON.stringify(snapshot.target_markets) === '["US"]' &&
    !!snapshotTextBudget &&
    !!checks &&
    checks.rubric_version === 1 &&
    ['pass', 'needs_review'].includes(String(checks.overall_status))
  );
}
function validRevise(params: Params, grant: Grant): boolean {
  const payload = record(params.p_content_payload);
  const snapshot = record(params.p_generation_snapshot);
  return (
    params.p_post_public_id === grant.post_public_id &&
    params.p_expected_revision === grant.expected_revision &&
    params.p_expected_content_hash === grant.expected_content_hash &&
    params.p_reservation_token === null &&
    params.p_content_schema_version === 1 &&
    params.p_format_key === 'single_subject_fast' &&
    params.p_topic_key === 'nature_science' &&
    params.p_interaction_goal === 'follow' &&
    !!payload &&
    payload.schema_version === 1 &&
    payload.hook === grant.approved_hook &&
    !!snapshot &&
    snapshot.profile_key === 'fast_trivia' &&
    snapshot.config_updated_at === CONFIG_UPDATED_AT &&
    Array.isArray(params.p_fact_bindings) &&
    Array.isArray(record(payload.body)?.facts) &&
    (record(payload.body)?.facts as unknown[]).length === params.p_fact_bindings.length
  );
}

/**
 * Every grant is a separate Edge-only JSON secret: operation key SHA-256,
 * max-two-hour UTC expiry and, for MAN-03, reservation-token SHA-256.
 * MAN-04 cannot be armed before the actual post ID and CAS are available.
 * APPROVE additionally pins SHA-256 of all canonical RPC parameters.
 */
export async function isApprovedPilot104Write(
  tool: string,
  params: Params,
  readEnv: (name: string) => string | undefined,
  now = Date.now(),
): Promise<boolean> {
  if (!Object.prototype.hasOwnProperty.call(stages, tool) || !serverScoped(params)) return false;
  const stage = tool as Stage;
  const raw = readEnv(stages[stage]);
  if (!raw || raw.length > 2048) return false;
  const grant: Grant | null = (() => {
    try {
      return record(JSON.parse(raw));
    } catch {
      return null;
    }
  })();
  if (
    !grant ||
    !validExpiry(grant.expires_at, now) ||
    !(await matchesSecret(params.p_operation_key, grant.operation_key_sha256))
  )
    return false;

  if (stage === 'trivia_register_and_reserve_facts' || stage === 'save_post') {
    if (
      !exactFields(grant, ['expires_at', 'operation_key_sha256', 'reservation_token_sha256']) ||
      !(await matchesSecret(params.p_reservation_token, grant.reservation_token_sha256))
    )
      return false;
    return stage === 'trivia_register_and_reserve_facts' ? validReserve(params) : validSave(params);
  }
  if (
    !UUID4.test(String(grant.post_public_id)) ||
    typeof grant.expected_revision !== 'number' ||
    !Number.isSafeInteger(grant.expected_revision) ||
    typeof grant.expected_content_hash !== 'string' ||
    !HEX64.test(grant.expected_content_hash)
  )
    return false;
  if (stage === 'revise_post') {
    return (
      exactFields(grant, [
        'expires_at',
        'operation_key_sha256',
        'post_public_id',
        'expected_revision',
        'expected_content_hash',
        'approved_hook',
      ]) &&
      typeof grant.approved_hook === 'string' &&
      grant.approved_hook.length > 0 &&
      grant.approved_hook.length <= 45 &&
      validRevise(params, grant)
    );
  }
  if (
    !exactFields(grant, [
      'expires_at',
      'operation_key_sha256',
      'post_public_id',
      'expected_revision',
      'expected_content_hash',
      'approved_rpc_sha256',
    ]) ||
    params.p_post_public_id !== grant.post_public_id ||
    params.p_expected_revision !== grant.expected_revision ||
    params.p_expected_content_hash !== grant.expected_content_hash ||
    params.p_explicit_approval !== true ||
    !Array.isArray(params.p_accepted_warning_ids) ||
    params.p_accepted_warning_ids.length !== 0 ||
    !HEX64.test(String(grant.approved_rpc_sha256))
  )
    return false;
  return (await digest(JSON.stringify(sorted(params)))) === grant.approved_rpc_sha256;
}
