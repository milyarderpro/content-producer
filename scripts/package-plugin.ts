import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const manifestPath = join(process.cwd(), 'plugin', 'plugin.json');

try {
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as Record<string, unknown>;

  for (const field of ['$schema', 'name', 'version', 'description']) {
    if (typeof manifest[field] !== 'string' || manifest[field].length === 0) {
      throw new Error(`Plugin manifest requires a non-empty ${field} field.`);
    }
  }

  console.log(`Plugin manifest validated: ${manifest.name}@${manifest.version}`);
} catch (error) {
  if (error instanceof Error && error.message.includes('ENOENT')) {
    console.log('Plugin manifest is deferred until Phase 7.');
  } else {
    throw error;
  }
}
