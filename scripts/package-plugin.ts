import { join } from 'node:path';
import { createCandidate, saveCandidateIndex } from './plugin-package.js';

const projectRoot = process.cwd();
const output = join(projectRoot, 'artifacts', 'plugin-candidate');
const index = createCandidate(projectRoot, output);
saveCandidateIndex(join(projectRoot, 'artifacts', 'plugin-candidate-filelist.json'), index);
console.log('Candidate validated and built: ' + index.file_count + ' allowlisted files.');
for (const file of index.files) console.log(file.sha256 + '  ' + file.path);
console.log('Candidate remains local/ignored; no final MCP connection, install or publish.');
