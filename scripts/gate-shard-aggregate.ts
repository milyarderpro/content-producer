import { readFileSync } from 'node:fs';
import { validateManifest, validateShards, validateShardProofs } from './gate-runner.js';

const read = (path: string) => JSON.parse(readFileSync(path, 'utf8'));
const manifest = read('scripts/gate-suite-manifest.json');
const pkg = read('package.json');
validateManifest(manifest, pkg.scripts);
const partitions = validateShards(read('scripts/gate-db-shards.json'), manifest);
const [sourcePath, onePath, twoPath, expectedSha] = process.argv.slice(2);
if (!sourcePath || !onePath || !twoPath || !expectedSha) throw new Error('SHARD_PROOF_MISSING');
const source = read(sourcePath);
const one = read(onePath);
const two = read(twoPath);
const fields = ['manifestSha256','lockSha256','inputsSha256','shardSha256'] as const;
if (source.status !== 'PASS' || source.mode !== 'source' || source.sha !== expectedSha ||
  !source.stages?.some((s: {name:string;status:string}) => s.name === 'source' && s.status === 'PASS') ||
  fields.some(f => !/^[0-9a-f]{64}$/.test(source[f]))) throw new Error('SOURCE_EVIDENCE_INVALID');
const count = validateShardProofs([one, two], expectedSha, {
  manifestSha256: source.manifestSha256,
  lockSha256: source.lockSha256,
  inputsSha256: source.inputsSha256,
  shardSha256: source.shardSha256,
}, partitions);
const required = ['locked-install','cli-help','start','reset','migration-names','mcp',
'audit-before','inspector','audit-after','database','migration-history','db-lint',
'security-advisors','audit-final','whitespace','cleanup'];
for (const proof of [one, two]) {
 if (proof.mode !== 'backend' || proof.evidence !== 'ACTIONS_EXACT_COMMIT_CONFIG' ||
   proof.configMode !== 'ACTIONS_EXACT_CONFIG' || proof.configOverlaySha256 !== null ||
   !required.every(name => proof.stages.some((s: {name:string;status:string}) => s.name === name && s.status === 'PASS')) ||
   !proof.stages.some((s: {name:string;status:string;count?:string}) => s.name === 'inspector' && s.count === '33 valid; 33 invalid; owner denial'))
   throw new Error('SHARD_STAGES_INVALID');
}
process.stdout.write('PASS: 41 disjoint database files, ' + count + ' cases, identical exact-SHA identity\\n');
