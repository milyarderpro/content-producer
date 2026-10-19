import { createHash } from 'node:crypto';
import {
  copyFileSync,
  existsSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { validatePortableManifest } from './plugin-config.js';

const skillRoot = 'skills/content-producer/';
const registeredMcpAppId = 'asdk_app_6ad4ef8b42588191a749b8b9f356b662';
const core = ['workflow', 'lifecycle', 'tool-sequences', 'source-policy', 'output-contract'];
const trivia = ['content-dna', 'formats', 'fact-checking', 'dedup-ontology', 'quality-rubric'];

export const CANDIDATE_FILES = [
  'plugin.json',
  '.app.json',
  skillRoot + 'SKILL.md',
  ...core.map((name) => skillRoot + 'references/core/' + name + '.md'),
  ...trivia.map((name) => skillRoot + 'references/niches/trivia/' + name + '.md'),
].sort();

type FileRecord = { path: string; bytes: number; sha256: string };
export type CandidateIndex = { schema_version: 1; file_count: number; files: FileRecord[] };

function assertNoSymlinks(root: string): void {
  if (lstatSync(root).isSymbolicLink()) throw new Error('Symlink in package: ' + root);
  for (const entry of readdirSync(root, { withFileTypes: true })) {
    const path = join(root, entry.name);
    if (entry.isSymbolicLink()) throw new Error('Symlink in package: ' + path);
    if (entry.isDirectory()) assertNoSymlinks(path);
    else if (!entry.isFile()) throw new Error('Non-file package entry: ' + path);
  }
}

function listFiles(root: string, base = root): string[] {
  return readdirSync(root, { withFileTypes: true })
    .flatMap((entry) => {
      const path = join(root, entry.name);
      if (entry.isDirectory()) return listFiles(path, base);
      return [relative(base, path).split(sep).join('/')];
    })
    .sort();
}

function read(root: string, path: string): string {
  return readFileSync(join(root, path), 'utf8');
}

function expectTerms(text: string, terms: readonly string[], label: string): void {
  for (const term of terms) {
    if (!text.includes(term)) throw new Error(label + ' missing frozen policy term: ' + term);
  }
}

function checkLinks(root: string, relativePath: string): void {
  const content = read(root, relativePath);
  const base = dirname(resolve(root, relativePath));
  const canonicalRoot = realpathSync(root);
  for (const match of content.matchAll(/\]\(([^)]+)\)/g)) {
    const href = match[1].trim();
    if (href.startsWith('#') || /^https?:\/\//i.test(href) || /^mailto:/i.test(href)) continue;
    const target = href.split('#')[0];
    if (!target || /[%\\?#]/.test(target) || target.startsWith('/') || /^[a-z]+:/i.test(target)) {
      throw new Error('Unsafe reference link in ' + relativePath);
    }
    const destination = resolve(base, target);
    if (!destination.startsWith(canonicalRoot + sep) || !existsSync(destination)) {
      throw new Error('Broken or escaping reference in ' + relativePath + ': ' + target);
    }
    const actual = realpathSync(destination);
    if (!actual.startsWith(canonicalRoot + sep) || !lstatSync(destination).isFile()) {
      throw new Error('Reference is not a contained regular file: ' + relativePath);
    }
    const relativeTarget = relative(canonicalRoot, actual).split(sep).join('/');
    if (!CANDIDATE_FILES.includes(relativeTarget)) {
      throw new Error('Reference not included in candidate: ' + relativeTarget);
    }
  }
}

function checkSensitive(path: string, content: string): void {
  const forbidden = [
    /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
    /\b(?:gh[pousr]_[a-zA-Z0-9]{20,}|github_pat_[a-zA-Z0-9_]{20,}|sk-[a-zA-Z0-9_-]{20,}|sb_secret_[a-zA-Z0-9_-]{15,})\b/,
    /https?:\/\/[^\s/)]+:[^\s/@]+@[^\s/)]+/,
    /https:\/\/[a-z0-9.-]+\/functions\/v1\/mcp\b/i,
    /\b(?:SUPABASE_SERVICE_ROLE_KEY|GITHUB_TOKEN|CLIENT_SECRET|ACCESS_TOKEN)\s*[:=]\s*['"]?[a-zA-Z0-9_-]{12,}/i,
  ];
  if (forbidden.some((rule) => rule.test(content))) {
    throw new Error('Candidate contains credential or configured endpoint: ' + path);
  }
}

export function validatePluginSource(
  projectRoot: string,
  pluginRoot = join(projectRoot, 'plugin'),
): void {
  if (!existsSync(pluginRoot)) throw new Error('Required plugin root is missing.');
  assertNoSymlinks(pluginRoot);
  for (const path of CANDIDATE_FILES) {
    if (!existsSync(join(pluginRoot, path)))
      throw new Error('Required plugin file missing: ' + path);
    if (!lstatSync(join(pluginRoot, path)).isFile())
      throw new Error('Invalid plugin file: ' + path);
  }
  for (const deferred of ['mcp.json', '.mcp.json', 'connections.json', 'connection-mapping.json']) {
    if (existsSync(join(pluginRoot, deferred)))
      throw new Error('Deferred connection configuration is forbidden: ' + deferred);
  }

  const appContent = read(pluginRoot, '.app.json');
  const expectedApps = JSON.stringify({ apps: { 'content-producer': { id: registeredMcpAppId, required: true } } }, null, 2) + '\n';
  if (appContent !== expectedApps) {
    throw new Error('Registered app mapping must use the proven mcpku ID exclusively.');
  }

  const manifest = JSON.parse(read(pluginRoot, 'plugin.json')) as unknown;
  validatePortableManifest(manifest, pluginRoot);
  const presentation = (
    manifest as {
      extensions: { 'com.openai': { interface: Record<string, unknown> } };
    }
  ).extensions['com.openai'].interface;
  for (const key of ['composerIcon', 'logo', 'screenshots']) {
    const value = presentation[key];
    if (value !== undefined) {
      for (const asset of Array.isArray(value) ? value : [value]) {
        if (typeof asset !== 'string' || !CANDIDATE_FILES.includes(asset.replace(/^\.\//, ''))) {
          throw new Error('Manifest asset cannot be omitted from candidate: ' + String(key));
        }
      }
    }
  }

  const inputSchema = JSON.parse(
    readFileSync(join(projectRoot, 'plugin/schemas/mcp-connection-input.schema.json'), 'utf8'),
  ) as {
    $schema?: string;
    additionalProperties?: boolean;
    required?: string[];
    properties?: Record<
      string,
      {
        additionalProperties?: boolean;
        required?: string[];
        properties?: Record<string, { const?: string }>;
      }
    >;
  };
  if (
    inputSchema.$schema !== 'https://json-schema.org/draft/2020-12/schema' ||
    inputSchema.additionalProperties !== false ||
    JSON.stringify(inputSchema.required) !==
      JSON.stringify(['serverName', 'endpointUrl', 'authentication']) ||
    inputSchema.properties?.authentication?.additionalProperties !== false ||
    JSON.stringify(inputSchema.properties?.authentication?.required) !== JSON.stringify(['mode']) ||
    inputSchema.properties?.authentication?.properties?.mode?.const !== 'none'
  ) {
    throw new Error('MCP connection-input generator schema drift.');
  }

  const skill = read(pluginRoot, skillRoot + 'SKILL.md');
  if (!/^---\nname: content-producer\ndescription: [^\n]{70,}\n---\n/.test(skill)) {
    throw new Error('Invalid skill frontmatter.');
  }
  for (const path of CANDIDATE_FILES.filter(
    (name) => name.endsWith('.md') && name !== skillRoot + 'SKILL.md',
  )) {
    if (!skill.includes('(' + path.slice(skillRoot.length) + ')')) {
      throw new Error('SKILL.md does not link required reference ' + path);
    }
  }
  for (const path of CANDIDATE_FILES.filter((name) => name.endsWith('.md')))
    checkLinks(pluginRoot, path);

  const frozen = readFileSync(join(projectRoot, 'plans/tool-inventory.md'), 'utf8');
  const names = Array.from(
    frozen.matchAll(/^\|\s*\d+\s*\|\s*\x60([a-z_]+)\x60\s*\|/gm),
    (m) => m[1],
  );
  const sequence = read(pluginRoot, skillRoot + 'references/core/tool-sequences.md');
  const listed = Array.from(sequence.matchAll(/^\|\s*\d+\s*\|\s*([a-z_]+)\s*\|/gm), (m) => m[1]);
  if (names.length !== 33 || JSON.stringify(names) !== JSON.stringify(listed)) {
    throw new Error('Frozen 33-tool inventory order differs from packaged skill.');
  }

  const policy: Record<string, string[]> = {
    'core/workflow.md': ['maximum 3', '30-minute', 'save_post'],
    'core/lifecycle.md': [
      'explicit_approval=true',
      'OPERATION_KEY_REUSED',
      'expected_content_hash',
    ],
    'core/source-policy.md': ['independence_group', 'untrusted data'],
    'core/output-contract.md': ['CANVA COPY', 'FACEBOOK CAPTION', 'HASHTAGS', 'INFORMASI INTERNAL'],
    'niches/trivia/content-dna.md': ['en-US', 'approval', 'topic_key'],
    'niches/trivia/formats.md': [
      'single_subject_fast',
      'themed_utility',
      'emotional_animal_collection',
      'comparison',
      'myth_vs_fact',
      'fast_trivia',
      'practical_utility',
    ],
    'niches/trivia/fact-checking.md': [
      'Tier D',
      '24 months',
      '12 months',
      '30 days',
      '90 days',
      '180 days',
    ],
    'niches/trivia/dedup-ontology.md': [
      'SAME',
      'DISTINCT',
      'UNCERTAIN',
      'trivia_find_similar_facts',
    ],
    'niches/trivia/quality-rubric.md': [
      'trivia.meaning_preserved',
      'trivia.source_supported',
      'trivia.time_context_valid',
      'trivia.safety_appropriate',
      'trivia.caption_no_new_claim',
      'trivia.substantial_copying_absent',
      'express owner approval',
    ],
  };
  for (const [name, terms] of Object.entries(policy)) {
    expectTerms(read(pluginRoot, skillRoot + 'references/' + name), terms, name);
  }
  for (const path of CANDIDATE_FILES) checkSensitive(path, read(pluginRoot, path));
}

function fileIndex(root: string): CandidateIndex {
  const files = CANDIDATE_FILES.map((path) => {
    const data = readFileSync(join(root, path));
    return {
      path,
      bytes: data.byteLength,
      sha256: createHash('sha256').update(data).digest('hex'),
    };
  });
  return { schema_version: 1, file_count: files.length, files };
}

export function verifyCandidate(projectRoot: string, candidateRoot: string): CandidateIndex {
  validatePluginSource(projectRoot, candidateRoot);
  const actual = listFiles(candidateRoot);
  if (JSON.stringify(actual) !== JSON.stringify(CANDIDATE_FILES)) {
    throw new Error('Candidate file list differs from strict allowlist: ' + JSON.stringify(actual));
  }
  const sourceIndex = fileIndex(join(projectRoot, 'plugin'));
  const candidateIndex = fileIndex(candidateRoot);
  if (JSON.stringify(sourceIndex) !== JSON.stringify(candidateIndex)) {
    throw new Error('Candidate bytes/hashes differ from validated source.');
  }
  return candidateIndex;
}

export function createCandidate(projectRoot: string, candidateRoot: string): CandidateIndex {
  validatePluginSource(projectRoot);
  if (existsSync(candidateRoot)) rmSync(candidateRoot, { recursive: true, force: true });
  mkdirSync(candidateRoot, { recursive: true });
  for (const path of CANDIDATE_FILES) {
    mkdirSync(dirname(join(candidateRoot, path)), { recursive: true });
    copyFileSync(join(projectRoot, 'plugin', path), join(candidateRoot, path));
  }
  return verifyCandidate(projectRoot, candidateRoot);
}

export function saveCandidateIndex(path: string, index: CandidateIndex): void {
  writeFileSync(path, JSON.stringify(index, null, 2) + '\n', 'utf8');
}
