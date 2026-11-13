// Inspector 2.5.0 accepts only argv JSON. Inject private input in memory after
// Node starts; npx and the OS process argument list never receive lease tokens.
import process from 'node:process';
import { lstatSync, readFileSync, realpathSync } from 'node:fs';
let entry = '';
try {
  entry = realpathSync(process.argv[1] ?? '').replaceAll('\\', '/');
} catch {
  /* not a file entrypoint */
}
if (
  entry.endsWith('/@modelcontextprotocol/inspector/clients/launcher/build/index.js') ||
  entry.endsWith('/@modelcontextprotocol/inspector/clients/cli/build/index.js')
) {
  const file = process.env.CP_INSPECTOR_ARGUMENT_FILE;
  if (file) {
    try {
      const stat = lstatSync(file);
      if (
        !stat.isFile() ||
        (stat.mode & 0o077) !== 0 ||
        stat.size > 256 * 1024 ||
        (typeof process.getuid === 'function' && stat.uid !== process.getuid())
      )
        throw new Error();
      const input = readFileSync(file, 'utf8');
      const value = JSON.parse(input);
      if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error();
      process.argv.push('--tool-args-json', input);
    } catch {
      throw new Error('INSPECTOR_INPUT_FILE_INVALID');
    }
  }
}
