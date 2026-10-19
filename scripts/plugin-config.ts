import { realpathSync, statSync } from 'node:fs';
import { isIP } from 'node:net';
import { resolve, sep } from 'node:path';

export const PLUGIN_SCHEMA = 'https://agent-plugins.org/schemas/1.0.0/plugin.schema.json';
export const MCP_SCHEMA = 'https://agent-plugins.org/schemas/1.0.0/mcp.schema.json';

type JsonObject = Record<string, unknown>;

export type PortableMcpConfig = {
  $schema: typeof MCP_SCHEMA;
  mcpServers: Record<string, { type: 'streamable-http'; url: string }>;
};

function object(value: unknown, label: string): JsonObject {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`${label} must be an object.`);
  }
  return value as JsonObject;
}

function keys(value: JsonObject, allowed: readonly string[], label: string): void {
  for (const key of Object.keys(value)) {
    if (!allowed.includes(key)) {
      throw new Error(`${label} contains unsupported field ${key}.`);
    }
  }
}

function nonEmpty(value: unknown, label: string): string {
  if (typeof value !== 'string' || !value.trim() || value.trim() !== value) {
    throw new Error(`${label} must be a non-empty, trimmed string.`);
  }
  return value;
}

function serverName(value: unknown): string {
  const name = nonEmpty(value, 'serverName');
  if (!/^[a-z][a-z0-9_-]{0,63}$/.test(name)) {
    throw new Error('serverName must be a safe lowercase identifier.');
  }
  return name;
}

function httpsEndpoint(value: unknown): string {
  const input = nonEmpty(value, 'endpointUrl');
  if (/[{}<>\\]/.test(input)) {
    throw new Error('endpointUrl must not contain template values or backslashes.');
  }
  let url: URL;
  try {
    url = new URL(input);
  } catch {
    throw new Error('endpointUrl must be a valid HTTPS URL.');
  }
  const host = url.hostname.toLowerCase().replace(/^\[|\]$/g, '');
  if (
    url.protocol !== 'https:' ||
    !host.includes('.') ||
    isIP(host) !== 0 ||
    host === 'localhost' ||
    host.endsWith('.localhost') ||
    host.endsWith('.example') ||
    host.endsWith('.test') ||
    host.endsWith('.invalid') ||
    /(^|\.)example\.(com|org|net)$/.test(host) ||
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    url.href !== input
  ) {
    throw new Error(
      'endpointUrl must be a canonical, public HTTPS MCP URL without credentials, query or fragment.',
    );
  }
  return input;
}

export function validatePluginRelativePath(value: unknown, pluginRoot: string): void {
  const path = nonEmpty(value, 'asset path');
  if (
    !path.startsWith('./') ||
    path.includes('\\') ||
    path
      .slice(2)
      .split('/')
      .some((part) => !part || part === '.' || part === '..')
  ) {
    throw new Error('Asset path must be a contained ./ path without traversal.');
  }
  const root = realpathSync(pluginRoot);
  let actual: string;
  try {
    actual = realpathSync(resolve(root, path));
  } catch {
    throw new Error('Asset path must reference an existing file.');
  }
  if (!actual.startsWith(root + sep) || !statSync(actual).isFile()) {
    throw new Error('Asset path must resolve to a file inside the plugin root.');
  }
}

export function validatePortableManifest(value: unknown, pluginRoot: string): void {
  const manifest = object(value, 'plugin manifest');
  keys(
    manifest,
    ['$schema', 'name', 'version', 'description', 'author', 'repository', 'extensions'],
    'plugin manifest',
  );
  if (manifest.$schema !== PLUGIN_SCHEMA) {
    throw new Error('Plugin manifest has an unsupported $schema.');
  }
  if (!/^[a-z0-9](?:[a-z0-9-]{0,62}[a-z0-9])?$/.test(nonEmpty(manifest.name, 'name'))) {
    throw new Error('Plugin name must be a portable identifier.');
  }
  if (!/^\d+\.\d+\.\d+$/.test(nonEmpty(manifest.version, 'version'))) {
    throw new Error('Plugin version must be semver.');
  }
  nonEmpty(manifest.description, 'description');
  if (manifest.repository !== undefined) {
    httpsEndpoint(manifest.repository);
  }
  if (manifest.author !== undefined) {
    const author = object(manifest.author, 'author');
    keys(author, ['name'], 'author');
    nonEmpty(author.name, 'author.name');
  }
  const extensions = object(manifest.extensions, 'extensions');
  keys(extensions, ['com.openai'], 'extensions');
  const openai = object(extensions['com.openai'], 'extensions.com.openai');
  keys(openai, ['interface', 'apps'], 'extensions.com.openai');
  if (openai.apps !== './.app.json') {
    throw new Error('OpenAI registered MCP app mapping must be ./\.app.json.');
  }
  validatePluginRelativePath(openai.apps, pluginRoot);
  const presentation = object(openai.interface, 'OpenAI interface');
  keys(
    presentation,
    [
      'displayName',
      'shortDescription',
      'developerName',
      'category',
      'capabilities',
      'composerIcon',
      'logo',
      'screenshots',
    ],
    'OpenAI interface',
  );
  for (const key of ['displayName', 'shortDescription', 'developerName', 'category']) {
    nonEmpty(presentation[key], key);
  }
  if (
    !Array.isArray(presentation.capabilities) ||
    !presentation.capabilities.length ||
    presentation.capabilities.some((item: unknown) => item !== 'Read' && item !== 'Write')
  ) {
    throw new Error('OpenAI capabilities must be Read and/or Write.');
  }
  for (const key of ['composerIcon', 'logo']) {
    if (presentation[key] !== undefined) {
      validatePluginRelativePath(presentation[key], pluginRoot);
    }
  }
  if (presentation.screenshots !== undefined) {
    if (!Array.isArray(presentation.screenshots)) {
      throw new Error('screenshots must be an array.');
    }
    for (const screenshot of presentation.screenshots) {
      validatePluginRelativePath(screenshot, pluginRoot);
    }
  }
}

export function validatePortableMcpConfig(value: unknown): asserts value is PortableMcpConfig {
  const config = object(value, 'MCP config');
  keys(config, ['$schema', 'mcpServers'], 'MCP config');
  if (config.$schema !== MCP_SCHEMA) {
    throw new Error('MCP config has an unsupported $schema.');
  }
  const servers = object(config.mcpServers, 'mcpServers');
  if (Object.keys(servers).length !== 1) {
    throw new Error('MVP MCP config requires exactly one named server.');
  }
  for (const [name, value] of Object.entries(servers)) {
    serverName(name);
    const server = object(value, 'MCP server');
    keys(server, ['type', 'url'], 'MCP server');
    if (server.type !== 'streamable-http') {
      throw new Error('MCP transport must be streamable-http.');
    }
    httpsEndpoint(server.url);
  }
}

export function generatePortableMcpConfig(input: unknown): PortableMcpConfig {
  const connection = object(input, 'connection input');
  keys(connection, ['serverName', 'endpointUrl', 'authentication'], 'connection input');
  const name = serverName(connection.serverName);
  const url = httpsEndpoint(connection.endpointUrl);
  const authentication = object(connection.authentication, 'authentication');
  keys(authentication, ['mode'], 'authentication');
  if (authentication.mode !== 'none') {
    throw new Error('Verified Phase 10.1 connection requires No authentication.');
  }
  // No-auth portable MCP omits OAuth extensions. This endpoint is public;
  // the server-side business-write latch remains closed by default.
  const result: PortableMcpConfig = {
    $schema: MCP_SCHEMA,
    mcpServers: { [name]: { type: 'streamable-http', url } },
  };
  validatePortableMcpConfig(result);
  return result;
}
