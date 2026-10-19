import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  generatePortableMcpConfig,
  MCP_SCHEMA,
  PLUGIN_SCHEMA,
  validatePluginRelativePath,
  validatePortableManifest,
  validatePortableMcpConfig,
} from '../scripts/plugin-config.js';

const root = join(process.cwd(), 'plugin');
const manifest = JSON.parse(readFileSync(join(root, 'plugin.json'), 'utf8')) as Record<
  string,
  unknown
>;
const connection = {
  serverName: 'content-producer',
  endpointUrl: 'https://mcp-fixture.integration-tools.net/functions/v1/mcp',
  authentication: { mode: 'none' },
};

describe('Phase 7.1 portable plugin manifest', () => {
  it('validates the real root manifest and portable identity/presentation metadata', () => {
    expect(() => validatePortableManifest(manifest, root)).not.toThrow();
    expect(manifest.$schema).toBe(PLUGIN_SCHEMA);
    expect(manifest).not.toHaveProperty('mcpServers');
    expect(manifest).not.toHaveProperty('skills');
  });

  it('rejects empty metadata, nonportable fields and incorrect schema', () => {
    const openaiInterface = (manifest.extensions as { 'com.openai': { interface: unknown } })[
      'com.openai'
    ].interface;
    for (const bad of [
      { ...manifest, name: '' },
      { ...manifest, description: ' ' },
      { ...manifest, $schema: 'unknown' },
      { ...manifest, mcpServers: {} },
      { ...manifest, version: 'latest' },
      {
        ...manifest,
        extensions: { 'com.openai': { interface: openaiInterface, apps: './invalid.json' } },
      },
    ]) {
      expect(() => validatePortableManifest(bad, root)).toThrow();
    }
  });

  it('rejects traversal, missing paths and symlinks escaping the plugin root', () => {
    expect(() => validatePluginRelativePath('../outside.png', root)).toThrow();
    expect(() => validatePluginRelativePath('./missing.png', root)).toThrow();
    expect(() => validatePluginRelativePath('/tmp/icon.png', root)).toThrow();
    const temp = mkdtempSync(join(tmpdir(), 'phase-7.1-'));
    const outside = join(temp, 'outside.png');
    writeFileSync(outside, 'fixture only');
    const symlinkPath = join(root, 'icon-phase-7.1-test.png');
    // No mutation of source-tree paths: test the path validator using a temp root.
    const pluginTemp = join(temp, 'plugin');
    mkdirSync(pluginTemp);
    symlinkSync(outside, join(pluginTemp, 'icon.png'));
    expect(() => validatePluginRelativePath('./icon.png', pluginTemp)).toThrow();
    expect(existsSync(symlinkPath)).toBe(false);
  });
});

describe('Phase 7.1 portable MCP generator', () => {
  it('produces one named streamable-http server with No-auth input', () => {
    const config = generatePortableMcpConfig(connection);
    expect(config).toEqual({
      $schema: MCP_SCHEMA,
      mcpServers: {
        'content-producer': {
          type: 'streamable-http',
          url: connection.endpointUrl,
        },
      },
    });
    expect(() => validatePortableMcpConfig(config)).not.toThrow();
    expect(JSON.stringify(config)).not.toMatch(/clientId|clientSecret|token|Authorization|oauth/i);
  });

  it('rejects missing data, credentials and OAuth input', () => {
    for (const bad of [
      {},
      { ...connection, serverName: '' },
      { ...connection, serverName: '../mcp' },
      { ...connection, authentication: {} },
      { ...connection, authentication: { mode: 'oauth' } },
      { ...connection, authentication: { mode: 'none', clientSecret: 'forbidden' } },
      { ...connection, oauth: { mode: 'discovery' } },
      { ...connection, registeredConnectionId: 'forbidden' },
    ]) {
      expect(() => generatePortableMcpConfig(bad)).toThrow();
    }
  });

  it('rejects insecure, placeholder or credential-bearing endpoint URLs', () => {
    for (const endpointUrl of [
      '',
      'http://mcp-fixture.integration-tools.net/mcp',
      'https://localhost/mcp',
      'https://127.0.0.1/mcp',
      'https://example.com/mcp',
      'https://mcp.example/mcp',
      'https://mcp.test/mcp',
      'https://user:pass@service.net/mcp',
      'https://service.net/mcp?token=x',
      'https://service.net/mcp#frag',
      'https://service.net/\\mcp',
      'https://service.net/${ENDPOINT}',
    ]) {
      expect(() => generatePortableMcpConfig({ ...connection, endpointUrl })).toThrow();
    }
  });

  it('rejects invalid portable configurations and validates final MCP source', () => {
    const generated = generatePortableMcpConfig(connection);
    expect(() =>
      validatePortableMcpConfig({
        ...generated,
        mcpServers: { x: { type: 'sse', url: connection.endpointUrl } },
      }),
    ).toThrow();
    expect(() =>
      validatePortableMcpConfig({
        ...generated,
        mcpServers: { x: { type: 'streamable-http', url: connection.endpointUrl, oauth: {} } },
      }),
    ).toThrow();
    // Legacy generator remains testable, but the 0.2.1 package uses a
    // registered MCP application instead of bundling another remote MCP.
    expect(existsSync(join(root, 'mcp.json'))).toBe(false);
    expect(existsSync(join(root, '.app.json'))).toBe(true);
  });
});
