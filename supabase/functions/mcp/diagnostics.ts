// CR-053 P1 taxonomy. Only allowlisted context reaches responses or logs.
type Stage = 'input' | 'auth' | 'domain' | 'rate_limit' | 'rpc_transport' | 'output';
type FieldError = { path: string; code: string; message: string };
const reads = new Set(['get_account_profile', 'get_workspace_context', 'list_pages',
  'get_page_generation_context', 'list_content_plans', 'get_content_plan',
  'trivia_find_similar_facts', 'list_posts', 'get_post', 'get_post_performance',
  'get_performance_insights', 'trivia_find_similar_facts_v2', 'get_trivia_editorial_catalog']);
const aliases: Record<string, string> = {
  EDITORIAL_REVIEW_REQUIRED: 'QUALITY_EDITORIAL_INCOMPLETE',
  CONTENT_BUDGET_EXCEEDED: 'TEXT_BUDGET_EXCEEDED',
  RENDER_MISMATCH: 'CONTENT_RENDER_MISMATCH', DEDUP_REVIEW_REQUIRED: 'FACT_REVIEW_REQUIRED',
  RESERVATION_INVALID: 'FACT_RESERVATION_MISMATCH', SOURCE_POLICY_FAILED: 'FACT_SOURCE_INSUFFICIENT',
  MODULE_INVARIANT_FAILED: 'INTERNAL_ERROR',
};
const fallbacks: Record<string, string> = {
  FACT_URL_REQUIRED: 'FACT_SOURCE_INSUFFICIENT', FACT_URL_INVALID: 'FACT_SOURCE_INSUFFICIENT',
  FACT_CATALOG_CONFLICT: 'FACT_REVIEW_REQUIRED', FACT_SEARCH_INCOMPLETE: 'FACT_REVIEW_REQUIRED',
  RPC_TIMEOUT: 'DATABASE_UNAVAILABLE', RPC_NETWORK_ERROR: 'DATABASE_UNAVAILABLE',
  RPC_RESPONSE_TOO_LARGE: 'DATABASE_UNAVAILABLE', RPC_RESPONSE_INVALID: 'DATABASE_UNAVAILABLE',
  MODULE_VERSION_UNSUPPORTED: 'VALIDATION_FAILED', OAUTH_CLIENT_REQUIRED: 'AUTH_REQUIRED',
  TOKEN_INVALID: 'AUTH_REQUIRED', TOKEN_RESOURCE_MISMATCH: 'AUTH_REQUIRED',
  CONTENT_SCHEMA_UNSUPPORTED: 'VALIDATION_FAILED', FORMAT_UNSUPPORTED: 'VALIDATION_FAILED',
  TOPIC_UNSUPPORTED: 'VALIDATION_FAILED', PROFILE_UNSUPPORTED: 'VALIDATION_FAILED',
  RESERVATION_REQUIRED: 'FACT_RESERVATION_MISMATCH', FACT_NOT_FOUND: 'FACT_NOT_ELIGIBLE',
};
const extra: Record<string, readonly [string, boolean, string]> = {
  FACT_URL_REQUIRED: ['A source URL is required.', false, 'Supply one researched URL for the affected fact.'],
  FACT_URL_INVALID: ['The source URL is invalid.', false, 'Use one public http/https URL without credentials.'],
  FACT_CATALOG_CONFLICT: ['The fact catalog changed.', false, 'Repeat fact search and review before a new write; keep still-valid research.'],
  FACT_SEARCH_INCOMPLETE: ['Fact search is incomplete.', false, 'Replace this candidate and search the replacement before writing.'],
  RPC_TIMEOUT: ['The RPC response timed out.', true, 'Wait, then reconcile state or replay only the identical operation key and payload.'],
  RPC_NETWORK_ERROR: ['The RPC response was lost in transport.', true, 'Reconcile state or replay only the identical operation key and payload.'],
  RPC_RESPONSE_TOO_LARGE: ['The RPC response exceeded the size limit.', false, 'Reconcile the existing operation; provide the diagnostic ID for investigation.'],
  RPC_RESPONSE_INVALID: ['The RPC response did not match its contract.', false, 'Reconcile the existing operation; provide the diagnostic ID for investigation.'],
};
const access = new Set(['AUTH_REQUIRED', 'OWNER_ACCESS_REQUIRED', 'FORBIDDEN', 'PILOT_WRITE_LOCKED',
  'OAUTH_CLIENT_REQUIRED', 'TOKEN_INVALID', 'TOKEN_RESOURCE_MISMATCH']);
const input = new Set(['VALIDATION_FAILED', 'CONFIG_SCHEMA_UNSUPPORTED', 'MODULE_VERSION_UNSUPPORTED',
  'CONFIG_INVALID', 'METRIC_DEFINITION_AMBIGUOUS', 'CONTENT_PAYLOAD_INVALID', 'CONTENT_RENDER_MISMATCH',
  'TEXT_BUDGET_EXCEEDED', 'READABILITY_LIMIT_EXCEEDED', 'QUALITY_EDITORIAL_INCOMPLETE',
  'MODULE_RELATION_INVALID', 'WAIVER_NOT_ALLOWED', 'PLAN_LIMIT_EXCEEDED', 'ONTOLOGY_VERSION_UNSUPPORTED',
  'FACT_SOURCE_INSUFFICIENT', 'FACT_CORRECTION_REQUIRED', 'FACT_URL_REQUIRED', 'FACT_URL_INVALID',
  'CONTENT_SCHEMA_UNSUPPORTED', 'FORMAT_UNSUPPORTED', 'TOPIC_UNSUPPORTED', 'PROFILE_UNSUPPORTED', 'RESERVATION_REQUIRED']);
const transient = new Set(['RATE_LIMITED', 'DATABASE_BUSY', 'DATABASE_UNAVAILABLE', 'RPC_TIMEOUT', 'RPC_NETWORK_ERROR']);
export function normalizeDiagnosticCode(value: unknown, known: Record<string, unknown>): string | null {
  if (typeof value !== 'string') return null;
  const code = aliases[value] ?? value;
  return Object.hasOwn(known, code) || Object.hasOwn(extra, code) || Object.hasOwn(fallbacks, code) ? code : null;
}
export function diagnosticFailure(tool: string, version: number, rawCode: string,
  stage: Stage, known: Record<string, readonly (string | boolean)[]>,
  options: { fieldErrors?: FieldError[]; retryAfter?: number; dispatched?: boolean } = {}) {
  const code = normalizeDiagnosticCode(rawCode, known) ?? 'INTERNAL_ERROR';
  if (code === 'RATE_LIMITED') stage = 'rate_limit';
  else if (access.has(code)) stage = 'auth';
  else if (['RPC_TIMEOUT', 'RPC_NETWORK_ERROR'].includes(code)) stage = 'rpc_transport';
  else if (['RPC_RESPONSE_INVALID', 'RPC_RESPONSE_TOO_LARGE'].includes(code)) stage = 'output';
  const fallback = fallbacks[code] ?? code;
  const values = extra[code] ?? known[code] ?? known[fallback] ?? known.INTERNAL_ERROR;
  const read = reads.has(tool);
  const category = access.has(code) ? 'access_denied' : input.has(code) ? 'input' :
    transient.has(code) ? 'transient' : ['INTERNAL_ERROR', 'RPC_RESPONSE_INVALID', 'RPC_RESPONSE_TOO_LARGE'].includes(code)
      ? 'internal_unknown' : 'state_conflict';
  const unknown = options.dispatched && (stage === 'rpc_transport' || stage === 'output' || code === 'INTERNAL_ERROR' || code === 'DATABASE_UNAVAILABLE');
  const outcome = read ? 'not_applicable' : unknown ? 'unknown' :
    stage === 'domain' && !access.has(code) ? 'rolled_back' : 'not_started';
  let recovery = String(values?.[2] ?? 'Inspect the diagnostic ID.');
  if (unknown) recovery = read ? 'Retry this read within limits; provide the diagnostic ID if it persists.' :
    'Reconcile post/plan state first or replay only the original operation key and identical payload; do not start a new operation or switch versions.';
  else if (access.has(code)) recovery = code === 'AUTH_REQUIRED' ? 'Relink the authorized account.' : 'Stop this denied request; do not try another owner.';
  else if (code === 'FACT_REVIEW_REQUIRED') recovery = 'Review or replace the affected candidate. Use v2 only after runtime/tool/plugin availability is verified; reconcile any uncertain write first.';
  else if (code === 'FACT_REUSE_BLOCKED' || code === 'FACT_NOT_ELIGIBLE') recovery = 'Replace the affected candidate; research and search it again. Do not create a parallel identity or change Page to bypass reuse.';
  else if (code === 'PLAN_ITEM_CLAIM_EXPIRED') recovery = 'Read plan/post state and reconcile uncertain writes before reclaiming eligible work. Replay a successful save only with its identical key/payload.';
  else if (code === 'DATABASE_BUSY') recovery = read ? 'Retry this read within limits.' : 'Retry within limits with the same operation key and identical payload.';
  else if (code === 'RATE_LIMITED') recovery = options.retryAfter === undefined
    ? 'Exact remaining wait was not supplied; wait the full 60-second rate window before a bounded retry of the same request.'
    : 'Wait retry_after_seconds before a bounded retry of the same request; do not change an operation key to bypass the limit.';
  const diagnostic = {
    code, category, message: String(values?.[0] ?? 'The operation could not be confirmed.'), tool, stage,
    retryable: Boolean(values?.[1]), recovery, write_outcome: outcome,
    diagnostic_id: 'diag-' + crypto.randomUUID(),
    ...(options.fieldErrors?.length ? { field_errors: options.fieldErrors.slice(0, 20) } : {}),
    ...(code === 'RATE_LIMITED' ? { retry_after_seconds: Math.max(1, Math.min(3600, options.retryAfter ?? 60)) } : {}),
  };
  // Log no caller data, params, key, URL, SQL, raw upstream error or actor ID.
  console.info(JSON.stringify({ event: 'mcp_diagnostic', diagnostic_id: diagnostic.diagnostic_id,
    tool, stage, code, category, write_outcome: outcome }));
  const legacyCode = code === 'INTERNAL_ERROR' && stage === 'rpc_transport' ? 'DATABASE_UNAVAILABLE' : fallback;
  const legacy = { code: legacyCode, message: diagnostic.message, retryable: diagnostic.retryable,
    recovery, ...(diagnostic.field_errors ? { field_errors: diagnostic.field_errors } : {}),
    ...(diagnostic.retry_after_seconds ? { retry_after_seconds: diagnostic.retry_after_seconds } : {}) };
  return { isError: true as const,
    structuredContent: version === 2 ? { response_schema_version: 2, error: diagnostic } :
      { response_schema_version: 1, error: legacy },
    content: [{ type: 'text' as const, text: JSON.stringify(diagnostic) }] };
}

export function safeInputFields(issues: ReadonlyArray<{ path?: ReadonlyArray<unknown> }>): FieldError[] {
  return issues.slice(0, 20).map(issue => {
    const path = (issue.path ?? []).map(part => typeof part === 'number' && part >= 0 && part < 100
      ? `[${part}]` : typeof part === 'string' && /^[a-z][a-z0-9_]{0,49}$/.test(part) ? '.' + part : '')
      .join('').replace(/^\./, '').slice(0, 200) || 'arguments';
    return { path, code: 'VALIDATION_FAILED', message: 'Correct this field according to the tool schema.' };
  });
}

// Standard Schema wrapper: keep the original JSON Schema conversion and parsed
// data, replacing only validation-error text before the SDK can reflect it.
export function diagnosticInput(schema: unknown, tool: string) {
  const original = (schema as { '~standard'?: {
    validate: (value: unknown) => unknown; [key: string]: unknown;
  } })?.['~standard'];
  if (!original) return schema;
  return { '~standard': { ...original, validate: async (value: unknown) => {
    type Issue = { path?: ReadonlyArray<unknown>; errors?: Issue[][] };
    const result = await original.validate(value) as { value?: unknown; issues?: Issue[] };
    if (!result.issues) return result;
    const flatten = (issues: Issue[]): Issue[] => issues.flatMap(issue => {
      if (!Array.isArray(issue.errors)) return [issue];
      const applicable = issue.errors.filter(branch =>
        !branch.some(error => error.path?.[0] === 'request_schema_version'));
      return applicable.length === 1 ? flatten(applicable[0]) : [issue];
    });
    const issues = flatten(result.issues);
    const fields = safeInputFields(issues);
    const sourceIssue = fields.find(field => field.path.endsWith('source_url'));
    const missingSource = sourceIssue && issues.some(issue => {
      if (issue.path?.at(-1) !== 'source_url') return false;
      let at: unknown = value;
      for (const part of issue.path ?? []) {
        if (typeof part !== 'string' && typeof part !== 'number') return false;
        at = at && typeof at === 'object' ? (at as Record<string | number, unknown>)[part] : undefined;
      }
      return at === undefined || at === null || at === '';
    });
    const diagnostic = diagnosticFailure(tool, 1, sourceIssue
      ? missingSource ? 'FACT_URL_REQUIRED' : 'FACT_URL_INVALID' : 'VALIDATION_FAILED', 'input', {
      VALIDATION_FAILED: ['Input validation failed.', false, 'Correct the indicated fields and retry.'],
    }, { fieldErrors: fields });
    return { issues: [{ message: diagnostic.content[0].text }] };
  } } };
}
