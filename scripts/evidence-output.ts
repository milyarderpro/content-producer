import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { format, resolveConfig } from 'prettier';

type EvidenceKind = 'search' | 'gold-development' | 'gold-holdout';

// Output baru terpisah dari snapshot historis yang menjadi input regresi.
export async function writeCr016Evidence(
  kind: EvidenceKind,
  value: unknown,
  label = process.env.CR016_EVIDENCE_RUN,
  root = process.cwd(),
): Promise<void> {
  if (label !== 'A' && label !== 'B') return;
  const directory = join(root, 'artifacts', 'cr016');
  const file = join(directory, `${kind}-${label}.json`);
  const output = await format(JSON.stringify(value), {
    ...(await resolveConfig(file)),
    parser: 'json',
  });
  await mkdir(directory, { recursive: true });
  await writeFile(file, output, 'utf8');
}
