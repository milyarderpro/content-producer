/**
 * Audited, deliberately small numeric comparator subset for repository tool specs.
 * No implicit npm aliases, OR, prerelease, caret, tilde, wildcards or coercion.
 * The owner-supplied range strings are not rewritten.
 */
type Version = readonly [number, number, number];
export type RuntimeSpecs = {
  nodeSelector: string;
  nodeEngine: string;
  denoSelector: string;
};
export type RuntimeEvidence = {
  declared: RuntimeSpecs;
  effective: { node: string; deno: string };
  resolved: { node: string; deno: string; pnpm: string; supabase: string };
};
const fullPattern = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;
function numberVersion(input: string, actual: boolean): Version {
  if (actual && !fullPattern.test(input)) throw new Error('INVALID_RUNTIME_VERSION');
  if (!actual && !/^(0|[1-9]\d*)(?:\.(0|[1-9]\d*))?(?:\.(0|[1-9]\d*))?$/.test(input))
    throw new Error('INVALID_RUNTIME_SPEC');
  const parts = input.split('.').map(Number);
  if (parts.some(n => !Number.isSafeInteger(n) || n < 0)) throw new Error('INVALID_RUNTIME_SPEC');
  return [parts[0]!, parts[1] ?? 0, parts[2] ?? 0];
}
function compare(left: Version, right: Version): number {
  for (let i = 0; i < 3; i++) {
    if (left[i]! < right[i]!) return -1;
    if (left[i]! > right[i]!) return 1;
  }
  return 0;
}
export function matchesRuntimeRange(spec: string, actual: string): boolean {
  if (!spec.trim() || spec.trim() !== spec) throw new Error('INVALID_RUNTIME_SPEC');
  const version = numberVersion(actual, true);
  const clauses = spec.split(/ +/);
  if (!clauses.length) throw new Error('INVALID_RUNTIME_SPEC');
  return clauses.every(clause => {
    const match = /^(>=|<=|>|<|=)(\d+(?:\.\d+){0,2})$/.exec(clause);
    if (!match) throw new Error('INVALID_RUNTIME_SPEC');
    const threshold = numberVersion(match[2]!, false);
    const ordering = compare(version, threshold);
    switch (match[1]) {
      case '>=': return ordering >= 0;
      case '<=': return ordering <= 0;
      case '>': return ordering > 0;
      case '<': return ordering < 0;
      case '=': return ordering === 0;
      default: throw new Error('INVALID_RUNTIME_SPEC');
    }
  });
}

/** Owner baseline: reject unreviewed spec drift before claiming fixed effective ranges. */
export function assertRuntimeSpecs(specs: RuntimeSpecs): void {
  // The effective ranges reported below are exact only for this reviewed triple.
  // Example-version probes alone can miss a restrictive upper bound.
  if (specs.nodeSelector !== '>=22' || specs.nodeEngine !== '>=22 <25' ||
      specs.denoSelector !== '>=2.9.7') throw new Error('UNSAFE_RUNTIME_RANGE');
  const node = (v: string) =>
    matchesRuntimeRange(specs.nodeSelector, v) && matchesRuntimeRange(specs.nodeEngine, v);
  const deno = (v: string) => matchesRuntimeRange(specs.denoSelector, v);
  if (
    !node('22.0.0') || !node('23.0.0') || !node('24.99.99') ||
    node('21.99.99') || node('25.0.0') ||
    !deno('2.9.7') || !deno('2.10.0') || deno('2.9.6')
  ) throw new Error('UNSAFE_RUNTIME_RANGE');
}

export function resolveRuntimeEvidence(
  declared: RuntimeSpecs,
  outputs: { node: string; deno: string; pnpm: string; supabase: string },
): RuntimeEvidence {
  assertRuntimeSpecs(declared);
  const nodeMatch = /^v((?:0|[1-9]\d*)\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*))$/.exec(outputs.node.trim());
  const denoLine = outputs.deno.trim().split(/\r?\n/)[0] ?? '';
  const denoMatch = /^deno ((?:0|[1-9]\d*)\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*))(?: \([^()\r\n]+\))?$/.exec(denoLine);
  if (!nodeMatch || !denoMatch) throw new Error('INVALID_RUNTIME_OUTPUT');
  const node = nodeMatch[1]!, deno = denoMatch[1]!;
  if (
    !matchesRuntimeRange(declared.nodeSelector, node) ||
    !matchesRuntimeRange(declared.nodeEngine, node) ||
    !matchesRuntimeRange(declared.denoSelector, deno) ||
    Number(deno.split('.')[0]) !== 2 ||
    outputs.pnpm.trim() !== '10.33.2' ||
    outputs.supabase.trim() !== '2.120.0'
  ) throw new Error('TOOL_VERSION_MISMATCH');
  return {
    declared,
    effective: { node: '>=22.0.0 <25.0.0', deno: '>=2.9.7 <3.0.0' },
    resolved: { node, deno, pnpm: '10.33.2', supabase: '2.120.0' },
  };
}

/** This cross-shard check is supplementary to existing SHA/hash/manifest evidence. */
export function assertEquivalentRuntimeEvidence(
  source: RuntimeEvidence | null | undefined,
  first: RuntimeEvidence | null | undefined,
  second: RuntimeEvidence | null | undefined,
): void {
  if (!source || !first || !second) throw new Error('RUNTIME_EVIDENCE_MISSING');
  for (const record of [source, first, second]) {
    if (!record.declared || !record.resolved || !record.effective) throw new Error('RUNTIME_EVIDENCE_INVALID');
    const checked = resolveRuntimeEvidence(record.declared, {
      node: 'v' + record.resolved.node,
      deno: 'deno ' + record.resolved.deno,
      pnpm: record.resolved.pnpm,
      supabase: record.resolved.supabase,
    });
    if (JSON.stringify(checked) !== JSON.stringify(record))
      throw new Error('RUNTIME_EVIDENCE_INVALID');
  }
  if (JSON.stringify(source) !== JSON.stringify(first) ||
      JSON.stringify(source) !== JSON.stringify(second))
    throw new Error('RUNTIME_EVIDENCE_MISMATCH');
}
