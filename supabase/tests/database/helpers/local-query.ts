import { spawn, spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

// Resolve a single, pinned local container before sending any SQL. A matching
// name alone is insufficient: check the configured port, network and volume.
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

const logSetup = "set log_min_error_statement='panic'; set log_parameter_max_length_on_error=0;";

function args(): string[] {
  return [
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
}

// Only expose a fixed error code or a SQL constraint identifier. Never include
// SQL, process arguments, stdout, or the raw server diagnostic in test output.
export function safeQueryError(output: string): string {
  if (/ERROR:\s+SCHEDULE_CONFLICT(?:\s|$)/.test(output)) return 'SCHEDULE_CONFLICT';
  const constraint = /(?:constraint|unique index) "([a-z][a-z0-9_]{0,62})"/.exec(output)?.[1];
  return constraint ? `LOCAL_TEST_QUERY_FAILED ${constraint}` : 'LOCAL_TEST_QUERY_FAILED';
}

export function localQuery(sql: string): string {
  const result = spawnSync('docker', args(), {
    input: `${logSetup}\n${sql}\n`,
    encoding: 'utf8',
  });
  if (result.error) throw new Error('LOCAL_TEST_PROCESS_FAILED');
  if (result.status !== 0)
    throw new Error(`Supabase local command failed: ${safeQueryError(result.stderr)}`);
  return result.stdout.trim();
}

export function localQueryRows(sql: string): Array<Record<string, unknown>> {
  const trimmed = sql.trim().replace(/;\s*$/, '');
  const output = localQuery(`select row_to_json(q) from (${trimmed}) q;`);
  if (!output) return [];
  return output.split('\n').map((line) => {
    try {
      const row: unknown = JSON.parse(line);
      if (isRecord(row)) return row;
    } catch {
      // Database values must not leak through a JSON parser diagnostic.
    }
    throw new Error('LOCAL_TEST_RESPONSE_INVALID');
  });
}

export function localQueryRow(sql: string): Record<string, unknown> {
  const rows = localQueryRows(sql);
  if (rows.length !== 1)
    throw new Error('Expected exactly one JSON row from the local database query.');
  return rows[0]!;
}

export function localQueryAsync(sql: string): Promise<{ code: number; output: string }> {
  // Each call owns a separate psql process/connection, preserving race tests.
  const targetArgs = args();
  return new Promise((resolve, reject) => {
    const child = spawn('docker', targetArgs, { stdio: ['pipe', 'pipe', 'pipe'] });
    let stderr = '';
    child.stderr.setEncoding('utf8');
    child.stderr.on('data', (chunk: string) => (stderr += chunk));
    child.stdout.resume();
    child.stdin.on('error', () => reject(new Error('LOCAL_TEST_PROCESS_FAILED')));
    child.once('error', () => reject(new Error('LOCAL_TEST_PROCESS_FAILED')));
    child.once('close', (code) =>
      resolve({ code: code ?? 1, output: code === 0 ? '' : safeQueryError(stderr) }),
    );
    child.stdin.end(`${logSetup}\n${sql}\n`);
  });
}
