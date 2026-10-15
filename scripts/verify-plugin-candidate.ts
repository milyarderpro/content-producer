import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { verifyCandidate } from './plugin-package.js';

const projectRoot = process.cwd();
const index = verifyCandidate(projectRoot, join(projectRoot, 'artifacts', 'plugin-candidate'));
const saved = JSON.parse(
  readFileSync(join(projectRoot, 'artifacts', 'plugin-candidate-filelist.json'), 'utf8'),
) as unknown;
if (JSON.stringify(saved) !== JSON.stringify(index)) {
  throw new Error('Candidate file list/hash evidence is stale or altered.');
}
console.log('Verified generated candidate contents and hash report: ' + index.file_count + ' files.');
