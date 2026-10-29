import { spawn, spawnSync } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

export type PlanItem = {
  plan_item_public_id: string;
  plan_public_id: string;
  position: number;
  status: string;
  attempt_count: number;
  claim_expires_at: string | null;
  active_post_public_id: string | null;
  last_error: { code: string; detail: string } | null;
};
export type Plan = {
  plan_public_id: string;
  status: string;
  progress: Record<string, number>;
  updated_at: string;
};
export type ClaimedItem = {
  item: PlanItem;
  claim_token: string;
  claimed_at: string;
  claim_expires_at: string;
  claim_renewal_count: number;
};
export type Response = {
  response_schema_version: number;
  data: {
    plan: Plan;
    item: PlanItem;
    items: PlanItem[];
    claimed_items: ClaimedItem[];
    plan_public_id: string;
    remaining_claimable_count: number;
    claim_expires_at: string;
    claim_renewal_count: number;
    replacement_history_public_id: string;
    changed_count: number;
    preserved_completed_count: number;
    replayed: boolean;
  };
};
export type Fixture = {
  owner: string;
  other: string;
  workspace: string;
  page: string;
  prefix: string;
};

export const quote = (value: string): string => `'${value.replaceAll("'", "''")}'`;
export const json = (value: unknown): string => `${quote(JSON.stringify(value))}::jsonb`;
export const digest = (value: unknown): string =>
  createHash('sha256').update(JSON.stringify(value)).digest('hex');

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function localDatabaseContainerId(): string {
  let config: string;
  try {
    config = readFileSync(join(process.cwd(), 'supabase', 'config.toml'), 'utf8');
  } catch {
    throw new Error('LOCAL_DATABASE_CONFIG_INVALID');
  }

  let section = '';
  let projectId: string | undefined;
  let dbPort: number | undefined;
  for (const rawLine of config.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const header = /^\[([^\]]+)\](?:\s*#.*)?$/.exec(line);
    if (header) {
      section = header[1]!;
      continue;
    }
    if (section === '' && /^project_id\s*=/.test(line)) {
      const match = /^project_id\s*=\s*(["'])([A-Za-z0-9][A-Za-z0-9_-]*)\1(?:\s*#.*)?$/.exec(line);
      if (projectId !== undefined || !match) throw new Error('LOCAL_DATABASE_CONFIG_INVALID');
      projectId = match[2];
    }
    if (section === 'db' && /^port\s*=/.test(line)) {
      const match = /^port\s*=\s*([0-9]+)(?:\s*#.*)?$/.exec(line);
      if (dbPort !== undefined || !match) throw new Error('LOCAL_DATABASE_CONFIG_INVALID');
      dbPort = Number(match[1]);
    }
  }
  if (!projectId || !Number.isInteger(dbPort) || dbPort! < 1 || dbPort! > 65535) {
    throw new Error('LOCAL_DATABASE_CONFIG_INVALID');
  }

  const name = `supabase_db_${projectId}`;
  const network = `supabase_network_${projectId}`;
  const inspected = spawnSync(
    'docker',
    [
      'inspect',
      '--format',
      '{{.Id}}|{{.Name}}|{{.State.Running}}|{{.HostConfig.NetworkMode}}|{{range $name, $_ := .NetworkSettings.Networks}}{{$name}},{{end}}|{{range .Mounts}}{{.Name}},{{end}}|{{json (index .NetworkSettings.Ports "5432/tcp")}}',
      name,
    ],
    { encoding: 'utf8' },
  );
  if (inspected.error || inspected.status !== 0) {
    throw new Error('LOCAL_DATABASE_TARGET_MISMATCH');
  }
  const fields = inspected.stdout.trim().split('|');
  if (fields.length !== 7) throw new Error('LOCAL_DATABASE_TARGET_MISMATCH');
  const [containerId, containerName, running, networkMode, attachedNetworks, volumes, ports] =
    fields;
  let bindings: unknown;
  try {
    bindings = JSON.parse(ports!);
  } catch {
    throw new Error('LOCAL_DATABASE_TARGET_MISMATCH');
  }
  if (
    !/^[0-9a-f]{64}$/.test(containerId!) ||
    containerName !== `/${name}` ||
    running !== 'true' ||
    networkMode !== network ||
    !attachedNetworks!.split(',').includes(network) ||
    !volumes!.split(',').includes(name) ||
    !Array.isArray(bindings) ||
    bindings.length === 0 ||
    !bindings.every((binding) => isRecord(binding) && binding.HostPort === String(dbPort))
  ) {
    throw new Error('LOCAL_DATABASE_TARGET_MISMATCH');
  }
  return containerId!;
}

// SQL containing ephemeral lease tokens travels on stdin, not process argv.
// Direct literal-SQL test sessions disable error-statement logging before caller
// role switch. Production PostgREST binds parameters; it does not need this test
// harness. Never include SQL, stdout or an unredacted error in thrown failures.
const psqlArgs = [
  'exec',
  '-i',
  localDatabaseContainerId(),
  'psql',
  '-X',
  '-U',
  'postgres',
  '-d',
  'postgres',
  '-v',
  'ON_ERROR_STOP=1',
  '-v',
  'VERBOSITY=terse',
  '-Atq',
];
const logSetup = "set log_min_error_statement='panic'; set log_parameter_max_length_on_error=0;";
export function safeError(output: string): string {
  const code = /ERROR:\s+([A-Z_]+)(?:\s|$)/.exec(output)?.[1];
  return code ?? 'LOCAL_TEST_QUERY_FAILED';
}
export function sql(sqlText: string): string {
  const result = spawnSync('docker', psqlArgs, {
    input: `${logSetup}\n${sqlText}`,
    encoding: 'utf8',
  });
  if (result.error) throw new Error('LOCAL_TEST_PROCESS_FAILED');
  if (result.status !== 0) throw new Error(safeError(result.stderr));
  return result.stdout.trim();
}
export function row<T = Record<string, unknown>>(query: string): T {
  return JSON.parse(sql(`select to_jsonb(q) from (${query}) q;`)) as T;
}
export function callerStatement(
  owner: string,
  expression: string,
  client: string = randomUUID(),
): string {
  return `set local role authenticated;
    do $context$ begin perform set_config('request.jwt.claims',
      ${quote(JSON.stringify({ sub: owner, role: 'authenticated', client_id: client }))},true); end $context$;
    select jsonb_build_object('__rpc_result',${expression});`;
}
export function parseResponses(output: string): Response[] {
  return output.split('\n').flatMap((line) => {
    if (!line.startsWith('{"__rpc_result":')) return [];
    return [(JSON.parse(line) as { __rpc_result: Response }).__rpc_result];
  });
}
export function rpc(f: Fixture, expression: string, owner = f.owner, client?: string): Response {
  const responses = parseResponses(
    sql(`begin; ${callerStatement(owner, expression, client)} commit;`),
  );
  if (responses.length !== 1) throw new Error('LOCAL_TEST_RESPONSE_MISSING');
  return responses[0]!;
}
export function rpcClaims(expression: string, claims: unknown): Response {
  const responses = parseResponses(
    sql(`begin; set local role authenticated;
    do $context$ begin perform set_config('request.jwt.claims',${quote(typeof claims === 'string' ? claims : JSON.stringify(claims))},true); end $context$;
    select jsonb_build_object('__rpc_result',${expression}); commit;`),
  );
  return responses[0]!;
}

export function createFixture(): Fixture {
  const f: Fixture = {
    owner: randomUUID(),
    other: randomUUID(),
    workspace: '',
    page: '',
    prefix: `p54-${randomUUID().slice(0, 12)}`,
  };
  try {
    sql(`insert into auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,
      raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
      select '00000000-0000-0000-0000-000000000000',u.id,'authenticated','authenticated',u.id||'@example.test',
        'not-used',now(),'{}','{}',now(),now() from (values ('${f.owner}'::uuid),('${f.other}'::uuid)) u(id);
      insert into public.workspaces(owner_user_id,name,slug) values('${f.owner}','Phase 5.4 fixture','${f.prefix}');`);
    f.workspace = row<{ id: string }>(
      `select public_id::text id from public.workspaces where owner_user_id='${f.owner}'`,
    ).id;
    const config = row<{ config: unknown }>(
      'select internal.default_trivia_config_v1() config',
    ).config;
    const created = rpc(
      f,
      `api.create_page(1,'${f.workspace}','${randomUUID()}','Lifecycle page','${f.prefix}-page',
      'UTC',array['US'],'trivia',1,${json(config)},true)`,
    );
    f.page = (created.data as unknown as { page: { page_public_id: string } }).page.page_public_id;
    return f;
  } catch (error) {
    cleanup(f);
    throw error;
  }
}
export function cleanup(f: Fixture): void {
  sql(`begin;
    delete from internal.content_plan_item_events where workspace_id in (select id from public.workspaces where owner_user_id='${f.owner}');
    delete from public.post_metrics where workspace_id in (select id from public.workspaces where owner_user_id='${f.owner}');
    delete from public.posts where workspace_id in (select id from public.workspaces where owner_user_id='${f.owner}');
    delete from public.content_plan_items where workspace_id in (select id from public.workspaces where owner_user_id='${f.owner}');
    delete from public.content_plans where workspace_id in (select id from public.workspaces where owner_user_id='${f.owner}');
    delete from public.page_niche_configs where workspace_id in (select id from public.workspaces where owner_user_id='${f.owner}');
    delete from public.pages where workspace_id in (select id from public.workspaces where owner_user_id='${f.owner}');
    delete from internal.operation_ledger where workspace_id in (select id from public.workspaces where owner_user_id='${f.owner}');
    delete from internal.rate_limit_buckets where actor_user_id in ('${f.owner}','${f.other}');
    delete from public.workspaces where owner_user_id='${f.owner}';
    delete from auth.users where id in ('${f.owner}','${f.other}'); commit;`);
}

export function planExpression(
  f: Fixture,
  count: number,
  schedules: (string | null)[] = [],
  page = f.page,
): string {
  const items = Array.from({ length: count }, (_, i) => ({
    position: i + 1,
    scheduled_at: schedules[i] ?? null,
    topic_key: 'animals',
    format_key: 'single_subject_fast',
    interaction_goal: 'share',
    item_config: {},
  }));
  return `api.create_content_plan(1,'${f.workspace}','${randomUUID()}','${page}','trivia',1,${json(items)},'Lifecycle test',null)`;
}
export function createPlan(f: Fixture, count: number, schedules: (string | null)[] = []): Response {
  return rpc(f, planExpression(f, count, schedules));
}
export function claim(f: Fixture, plan: string, limit = 1, key = randomUUID(), lease = 30): string {
  return `api.claim_content_plan_items(1,'${f.workspace}','${key}','${plan}',${limit},${lease})`;
}
export function renew(f: Fixture, item: ClaimedItem, key = randomUUID()): string {
  return `api.renew_content_plan_claim(1,'${f.workspace}','${key}','${item.item.plan_item_public_id}','${item.claim_token}')`;
}
export function fail(
  f: Fixture,
  item: ClaimedItem,
  key = randomUUID(),
  detail = 'Viable sources were insufficient.',
  code = 'FACT_SOURCE_INSUFFICIENT',
): string {
  return `api.report_content_plan_item_failure(1,'${f.workspace}','${key}','${item.item.plan_item_public_id}',
    '${item.claim_token}',${quote(code)},${quote(detail)},true)`;
}
export function retry(
  f: Fixture,
  item: string,
  key = randomUUID(),
  reason = 'Retry with improved sources.',
): string {
  return `api.retry_content_plan_item(1,'${f.workspace}','${key}','${item}',${quote(reason)})`;
}
export function replace(
  f: Fixture,
  item: string,
  post: string,
  key = randomUUID(),
  explicit = 'true',
): string {
  return `api.replace_discarded_plan_item(1,'${f.workspace}','${key}','${item}','${post}','Create a new replacement.',${explicit})`;
}
export function cancel(
  f: Fixture,
  plan: string,
  key = randomUUID(),
  explicit = 'true',
  reason = 'Cancel remaining work.',
): string {
  return `api.cancel_content_plan(1,'${f.workspace}','${key}','${plan}',${quote(reason)},${explicit})`;
}
export function expire(item: ClaimedItem): void {
  sql(`update public.content_plan_items set claimed_at=clock_timestamp()-interval '61 minutes',
    claim_expires_at=clock_timestamp()-interval '31 minutes' where public_id='${item.item.plan_item_public_id}';`);
}
export function stateDigest(f: Fixture): string {
  const data = row(`select
    (select coalesce(jsonb_agg(to_jsonb(p) order by id),'[]') from public.content_plans p where workspace_id=w.id) plans,
    (select coalesce(jsonb_agg(to_jsonb(i) order by id),'[]') from public.content_plan_items i where workspace_id=w.id) items,
    (select coalesce(jsonb_agg(to_jsonb(p) order by id),'[]') from public.posts p where workspace_id=w.id) posts,
    (select coalesce(jsonb_agg(to_jsonb(e) order by id),'[]') from internal.content_plan_item_events e where workspace_id=w.id) events,
    (select coalesce(jsonb_agg(to_jsonb(l) order by id),'[]') from internal.operation_ledger l where workspace_id=w.id) ledger
    from public.workspaces w where w.public_id='${f.workspace}'`);
  return digest(data);
}
export function replayDigest(response: Response): string {
  return digest({ ...response, data: { ...response.data, replayed: false } });
}
export function eventCount(f: Fixture): number {
  return row<{ count: number }>(`select count(*) count from internal.content_plan_item_events
    where workspace_id=(select id from public.workspaces where public_id='${f.workspace}')`).count;
}

// Completed/publication fixtures belong to checkpoints 5.6/5.7. They are NOT
// public save/discard/publish proofs. They let 5.4 test replacement eligibility.
export function insertPost(
  item: string,
  status = 'discarded',
  schedule: string | null = null,
): string {
  const published = status === 'posted' || status === 'archived';
  return (
    JSON.parse(
      sql(`with inserted as (
    insert into public.posts(workspace_id,page_id,niche_key,content_plan_item_id,format_key,topic_key,interaction_goal,
      status,quality_status,approval_snapshot,ready_at,published_at,discarded_at,archived_at,scheduled_at,
      content_payload,generation_snapshot,content_hash,system_checks,editorial_checks)
    select workspace_id,page_id,niche_key,id,'single_subject_fast','animals','share',${quote(status)},
      ${published || status === 'ready' ? "'passed','{}'::jsonb,now()" : "'pending',null,null"},
      ${published ? 'now()' : 'null'},${status === 'discarded' ? 'now()' : 'null'},${status === 'archived' ? 'now()' : 'null'},
      ${schedule ? `${quote(schedule)}::timestamptz` : 'null'},
      '{"schema_version":1,"hook":"Did you know?","body":{"facts":[]},"cta":"Share this.","canva_copy":"Did you know? Share this.","caption":"Trivia.","hashtags":[],"render_style":"plain_lines","text_metrics":{}}',
      '{"config_schema_version":1,"fact_count":{},"fact_count_applied":5,"fact_count_override":false,"text_budget":{},"fact_reuse_scope":"workspace_unique","profile_key":"fast_trivia","render_style":"plain_lines","target_markets":["US"],"locale":"en-US"}',repeat('d',64),
      '{"schema_version":1,"gate_version":1,"evaluated_at":"2026-10-10T09:00:00Z","evaluator":"server","post_revision":1,"content_hash":"dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd","config_version":1,"renderer_version":1,"overall_status":"passed","checks":[{"id":"schema.valid","severity":"blocking","status":"passed","expected":"valid","actual":"valid","evidence":["payload"]}]}',
      '{"schema_version":1,"rubric_version":1,"evaluated_at":"2026-10-10T09:00:00Z","evaluator":"chatgpt","post_revision":1,"content_hash":"dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd","overall_status":"pass","criteria":[{"id":"meaning.supported","severity":"critical","status":"pass","note":"Supported.","evidence_paths":["body"]}],"risk_flags":[]}'
      from public.content_plan_items where public_id='${item}' returning public_id
    ) select jsonb_build_object('id',public_id::text) from inserted`),
    ) as { id: string }
  ).id;
}
export function completeFixtureItem(item: string): void {
  sql(`update public.content_plan_items set status='completed',completed_at=now(),claim_token=null,claimed_at=null,
    claim_expires_at=null,claim_renewal_count=0 where public_id='${item}';`);
}

export type SessionResult = { code: number; output: string; error: string };
export function session(sqlText: string): Promise<SessionResult> {
  return new Promise((resolve, reject) => {
    const child = spawn('docker', psqlArgs);
    let output = '';
    let errors = '';
    child.stdout.on('data', (data: Buffer) => {
      output += data.toString();
    });
    child.stderr.on('data', (data: Buffer) => {
      errors += data.toString();
    });
    child.on('error', () => reject(new Error('LOCAL_TEST_PROCESS_FAILED')));
    child.on('close', (code) =>
      resolve({ code: code ?? 1, output, error: errors ? safeError(errors) : '' }),
    );
    child.stdin.end(`${logSetup}\n${sqlText}`);
  });
}
export async function waitForSession(
  name: string,
  condition = "wait_event='PgSleep'",
): Promise<void> {
  const deadline = Date.now() + 5000;
  while (Date.now() < deadline) {
    if (
      row<{ ready: boolean }>(
        `select exists(select 1 from pg_stat_activity where application_name=${quote(name)} and (${condition})) ready`,
      ).ready
    )
      return;
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
  throw new Error('LOCAL_TEST_BARRIER_TIMEOUT');
}
