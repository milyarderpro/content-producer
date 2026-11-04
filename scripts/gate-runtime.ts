import { execFileSync } from 'node:child_process';
import { appendFileSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { resolveRuntimeEvidence, type RuntimeSpecs } from './runtime-range.js';

/** Export only exact numeric versions after the existing G4 validator accepts them. */
export function runtimeJobOutputs(
  declared: RuntimeSpecs,
  actual: Parameters<typeof resolveRuntimeEvidence>[1],
): string {
  const { resolved } = resolveRuntimeEvidence(declared, actual);
  return `node=${resolved.node}\ndeno=${resolved.deno}\n`;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const outputPath = process.env.GITHUB_OUTPUT;
  if (!outputPath) throw new Error('RUNTIME_OUTPUT_PATH_MISSING');
  const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
  const command = (name: string, args: string[]) =>
    execFileSync(name, args, { encoding: 'utf8', maxBuffer: 16_384 });
  const output = runtimeJobOutputs(
    {
      nodeSelector: readFileSync('.nvmrc', 'utf8').trim(),
      nodeEngine: pkg.engines?.node ?? '',
      denoSelector: readFileSync('.deno-version', 'utf8').trim(),
    },
    {
      node: process.version,
      deno: command('deno', ['--version']),
      pnpm: command('pnpm', ['--version']),
      supabase: command('pnpm', ['exec', 'supabase', '--version']),
    },
  );
  appendFileSync(outputPath, output);
}
