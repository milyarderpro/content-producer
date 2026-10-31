import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { isIP } from 'node:net';
import { describe, expect, it } from 'vitest';
import { contractSchema } from './fixtures/trivia-draft-v2-schema.js';
import { errorTaxonomy } from './fixtures/tool-errors-v2.js';
import {
  approvalRequest,
  batch,
  claimRequest,
  configTime,
  errorExample,
  errors,
  legacyError,
  legacyOutputUncertain,
  lostResponseReplay,
  newSaveExpired,
  partialProgress,
  planCreateRequest,
  reviseRequest,
  reviseResponse,
  rejectedExamples,
  single,
} from './fixtures/trivia-draft-v2.js';

type Schema = {
  $ref?: string;
  type?: string;
  const?: unknown;
  enum?: unknown[];
  oneOf?: Schema[];
  properties?: Record<string, Schema>;
  required?: string[];
  additionalProperties?: boolean;
  items?: Schema;
  minItems?: number;
  maxItems?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  format?: string;
  minimum?: number;
  maximum?: number;
};
type Group = { name: string; reads: string[]; writes: string[]; domain_codes: string[] };
type Taxonomy = {
  contract_version: string;
  categories: Record<string, string[]>;
  new_codes: Record<string, string>;
  existing_contract_codes: Record<string, string>;
  module_aliases: Record<string, string>;
  stages: string[];
  write_outcomes: string[];
  global_codes: string[];
  write_codes: string[];
  groups: Group[];
};
const root = process.cwd();
const definitions = contractSchema.$defs as Record<string, Schema>;
const taxonomy: Taxonomy = errorTaxonomy;
const categories = new Map(
  Object.entries(taxonomy.categories).flatMap(([category, codes]) =>
    codes.map((code) => [code, category] as const),
  ),
);
const reads = new Set(taxonomy.groups.flatMap((g) => g.reads));
const writes = new Set(taxonomy.groups.flatMap((g) => g.writes));

function localAddress(host: string): boolean {
  const mapped = /^::ffff:([a-f0-9]{1,4}):([a-f0-9]{1,4})$/.exec(host);
  if (mapped) {
    const high = Number.parseInt(mapped[1], 16);
    const low = Number.parseInt(mapped[2], 16);
    return localAddress([high >> 8, high & 255, low >> 8, low & 255].join('.'));
  }
  if (isIP(host) === 6) return host === '::' || host === '::1' || /^(fc|fd|fe[89ab])/i.test(host);
  if (isIP(host) !== 4) return false;
  const [a, b] = host.split('.').map(Number);
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168)
  );
}

function checkSourceUrl(text: string): void {
  const url = new URL(text);
  assert(['http:', 'https:'].includes(url.protocol));
  assert.equal(url.username + url.password, '');
  const host = url.hostname
    .replace(/^\[|\]$/g, '')
    .replace(/\.$/, '')
    .toLowerCase();
  assert(host.includes('.') || isIP(host) !== 0);
  assert(!/(^|\.)(localhost|local|internal)$/.test(host));
  assert(!localAddress(host));
}

// Test-only interpreter for exactly the JSON Schema keywords used in this fixture schema.
// NOT imported by the app, NOT a complete JSON Schema library, NOT a domain/RPC validator.
function check(value: unknown, schema: Schema): void {
  if (schema.$ref) {
    assert(schema.$ref.startsWith('#/$defs/'));
    const resolved = definitions[schema.$ref.slice('#/$defs/'.length)];
    assert(resolved);
    check(value, resolved);
    return;
  }
  if (schema.oneOf) {
    const matches = schema.oneOf.filter((branch) => {
      try {
        check(value, branch);
        return true;
      } catch {
        return false;
      }
    });
    assert.equal(matches.length, 1);
  }
  if ('const' in schema) assert.deepEqual(value, schema.const);
  if (schema.enum)
    assert(schema.enum.some((choice) => JSON.stringify(choice) === JSON.stringify(value)));
  if (schema.type === 'null') assert.equal(value, null);
  if (schema.type === 'boolean') assert.equal(typeof value, 'boolean');
  if (schema.type === 'integer') {
    assert(typeof value === 'number' && Number.isInteger(value));
    if (schema.minimum !== undefined) assert(value >= schema.minimum);
    if (schema.maximum !== undefined) assert(value <= schema.maximum);
  }
  if (schema.type === 'string') {
    assert.equal(typeof value, 'string');
    const text = value as string;
    if (schema.minLength !== undefined) assert([...text].length >= schema.minLength);
    if (schema.maxLength !== undefined) assert([...text].length <= schema.maxLength);
    if (schema.pattern) assert(new RegExp(schema.pattern).test(text));
    if (schema.format) {
      assert.equal(schema.format, 'source-web-url');
      checkSourceUrl(text);
    }
  }
  if (schema.type === 'array') {
    assert(Array.isArray(value));
    if (schema.minItems !== undefined) assert(value.length >= schema.minItems);
    if (schema.maxItems !== undefined) assert(value.length <= schema.maxItems);
    if (schema.items) for (const entry of value) check(entry, schema.items);
  }
  if (schema.type === 'object') {
    assert(value !== null && typeof value === 'object' && !Array.isArray(value));
    const object = value as Record<string, unknown>;
    for (const key of schema.required ?? []) assert(Object.hasOwn(object, key));
    for (const [key, entry] of Object.entries(object)) {
      const property = schema.properties?.[key];
      if (property) check(entry, property);
      else assert.notEqual(schema.additionalProperties, false);
    }
  }
}
function validate(name: string, value: unknown): void {
  assert(definitions[name]);
  check(value, definitions[name]);
}
function validateDiagnostic(response: ReturnType<typeof errorExample>): void {
  validate('errorResponse', response);
  const error = response.error;
  assert.equal(categories.get(error.code), error.category);
  assert(reads.has(error.tool) || writes.has(error.tool));
  if (reads.has(error.tool)) assert.equal(error.write_outcome, 'not_applicable');
  if (writes.has(error.tool) && ['rpc_transport', 'output'].includes(error.stage)) {
    assert.equal(error.write_outcome, 'unknown');
  }
  if (writes.has(error.tool) && ['input', 'auth', 'rate_limit'].includes(error.stage)) {
    assert.equal(error.write_outcome, 'not_started');
  }
  if (error.code === 'RATE_LIMITED') {
    assert('retry_after_seconds' in error);
    assert.equal(error.retryable, true);
  }
  assert(
    !/"(?:operation_key|claim_token|reservation_token|access_token|authorization|sql|payload|owner_user_id)"/i.test(
      JSON.stringify(response),
    ),
  );
}

describe('CR-053 P1 schema/fixture contracts — no tool or database calls', () => {
  it('checks every schema keyword/ref instead of silently accepting an unsupported rule', () => {
    const supported = new Set([
      '$ref',
      'type',
      'const',
      'enum',
      'oneOf',
      'properties',
      'required',
      'additionalProperties',
      'items',
      'minItems',
      'maxItems',
      'minLength',
      'maxLength',
      'pattern',
      'format',
      'minimum',
      'maximum',
    ]);
    function walk(schema: Schema): void {
      for (const keyword of Object.keys(schema)) assert(supported.has(keyword));
      if (schema.type)
        assert(['null', 'boolean', 'integer', 'string', 'array', 'object'].includes(schema.type));
      if (schema.format) assert.equal(schema.format, 'source-web-url');
      if (schema.$ref) assert(definitions[schema.$ref.slice('#/$defs/'.length)]);
      const pattern = schema.pattern;
      if (pattern) assert.doesNotThrow(() => new RegExp(pattern));
      for (const child of Object.values(schema.properties ?? {})) walk(child);
      for (const child of schema.oneOf ?? []) walk(child);
      if (schema.items) walk(schema.items);
    }
    Object.values(definitions).forEach(walk);
  });

  it('validates all three v2 requests and both save/revise success examples', () => {
    validate('findRequest', single.findRequest);
    validate('findResponse', single.findResponse);
    validate('saveRequest', single.request);
    validate('saveResponse', single.response);
    validate('reviseRequest', reviseRequest);
    validate('saveResponse', reviseResponse);
    expect(single.request.plan_item).toBeNull();
    expect(single.response.data.post.status).toBe('draft');
    expect(single.findRequest.candidates.length).toBeGreaterThan(single.request.facts.length);
  });

  it('pairs invalid URL, budget, editorial and stale-context requests with explicit diagnostics', () => {
    expect(() => validate('saveRequest', rejectedExamples.missingUrl.request)).toThrow();
    for (const name of [
      'longCaption',
      'editorialRevision',
      'staleConfig',
      'staleCatalog',
    ] as const) {
      validate('saveRequest', rejectedExamples[name].request);
      validateDiagnostic(rejectedExamples[name].response);
    }
    expect(
      rejectedExamples.longCaption.request.content_payload.caption.length -
        rejectedExamples.longCaption.page_caption_max_chars,
    ).toBe(20);
    expect(rejectedExamples.staleConfig.request.expected_config_updated_at).not.toBe(
      rejectedExamples.staleConfig.observed_config_updated_at,
    );
    expect(rejectedExamples.staleCatalog.request.expected_catalog_version).not.toBe(
      rejectedExamples.staleCatalog.observed_catalog_version,
    );
    expect(rejectedExamples.editorialRevision.request.editorial_checks.meaning_preserved).toBe(
      'needs_revision',
    );
    for (const name of ['staleRevision', 'staleHash'] as const) {
      validate('reviseRequest', rejectedExamples[name].request);
      validateDiagnostic(rejectedExamples[name].response);
    }
    expect(rejectedExamples.staleRevision.request.expected_revision).not.toBe(
      rejectedExamples.staleRevision.observed_revision,
    );
    expect(rejectedExamples.staleHash.request.expected_content_hash).not.toBe(
      rejectedExamples.staleHash.observed_content_hash,
    );
  });

  it('keeps the catalog from Read and all six config timestamp microseconds as text', () => {
    expect(single.request.expected_catalog_version).toBe(single.findResponse.data.catalog_version);
    expect(single.request.expected_config_updated_at).toBe(configTime);
    validate('timestamp', '2026-10-31T01:02:03Z');
    const rounded = { ...single.request, expected_config_updated_at: '2026-10-31T01:02:03.123Z' };
    expect(() => validate('saveRequest', rounded)).toThrow();
    expect(errors.catalog.error.code).toBe('FACT_CATALOG_CONFLICT');
    expect(errors.catalog.error.write_outcome).toBe('rolled_back');
    expect(reviseRequest.expected_catalog_version).toBe('43');
  });

  it('rejects old ontology/source/reservation payload fields and incomplete/uncertain final facts', () => {
    for (const extra of ['reservation_token', 'generation_snapshot', 'fact_bindings']) {
      expect(() =>
        validate('saveRequest', { ...single.request, [extra]: 'not-allowed' }),
      ).toThrow();
    }
    for (const extra of ['tier', 'expires_at', 'relation_key', 'sources', 'risk_class']) {
      const request = structuredClone(single.request);
      Object.assign(request.facts[0], { [extra]: 'not-allowed' });
      expect(() => validate('saveRequest', request)).toThrow();
    }
    for (const change of [
      { complete: false },
      { decision: 'uncertain' },
      { decision: 'same', fact_public_id: null },
    ]) {
      const request = structuredClone(single.request);
      Object.assign(request.facts[0].dedup, change);
      expect(() => validate('saveRequest', request)).toThrow();
    }
    const noUrl = structuredClone(single.request) as unknown as {
      facts: Record<string, unknown>[];
    };
    delete noUrl.facts[0].source_url;
    expect(() => validate('saveRequest', noUrl)).toThrow();
  });

  it('checks one URL and matching copy/source positions without pretending to research example.org', () => {
    const { request, readbackProjection: readback, response } = single;
    expect(request.facts).toHaveLength(5);
    expect(request.content_payload.canva_copy).toBe(
      [
        request.content_payload.hook,
        ...request.content_payload.body.facts.map((f) => f.text),
        request.content_payload.cta,
      ].join('\n\n'),
    );
    for (const [i, fact] of request.facts.entries()) {
      const url = new URL(fact.source_url);
      expect(url.protocol).toBe('https:');
      expect(url.hostname).toBe('example.org');
      expect(url.username + url.password).toBe('');
      expect(fact.position).toBe(i + 1);
      expect(readback.fact_bindings[i].source_snapshot.source_url).toBe(fact.source_url);
      expect(readback.fact_bindings[i].rendered_text).toBe(
        request.content_payload.body.facts[i].text,
      );
    }
    expect(readback.post_public_id).toBe(response.data.post.post_public_id);
    expect(readback.content_hash).toBe(response.data.post.content_hash);
    expect(readback.editorial_checks.post_revision).toBe(response.data.post.revision);
    expect(readback.editorial_checks.content_hash).toBe(response.data.post.content_hash);
    expect(Object.values(readback.editorial_checks.checks)).toEqual(['pass', 'pass', 'pass']);
  });

  it('rejects non-web, credential-bearing and local literal URLs while allowing public web forms', () => {
    for (const url of [
      'data:text/plain,x',
      'javascript:alert(1)',
      'https://user:pass@example.org/a',
      'http://localhost/a',
      'http://127.1/a',
      'http://10.0.0.1/a',
      'http://172.16.0.1/a',
      'http://192.168.1.1/a',
      'http://[::1]/a',
      'http://[::ffff:127.0.0.1]/a',
      'http://[fd00::1]/a',
    ]) {
      expect(() => validate('url', url)).toThrow();
    }
    for (const url of [
      'http://example.org/a',
      'https://example.org/a',
      'https://[2606:4700:4700::1111]/a',
    ]) {
      expect(() => validate('url', url)).not.toThrow();
    }
  });

  it('shows the three terminal historical statuses as ineligible and excluded final candidates', () => {
    for (const status of ['invalidated', 'superseded', 'rejected']) {
      const read = structuredClone(single.findResponse);
      read.data.candidates[5].matches[0].status = status;
      validate('findResponse', read);
      const excluded = read.data.candidates[5];
      expect(excluded.matches[0].reuse_eligibility).toBe('not_eligible');
      expect(single.request.facts.some((f) => f.candidate_key === excluded.candidate_key)).toBe(
        false,
      );
    }
    expect(single.request.facts[0].dedup.fact_public_id).toBe(
      single.findResponse.data.candidates[0].matches[0].fact_public_id,
    );
    const incomplete = structuredClone(single.findResponse);
    incomplete.data.candidates[0].complete = false;
    validate('findResponse', incomplete);
    // This checks the contrast in examples, not a retrieval algorithm or semantic decision engine.
    expect(incomplete.data.candidates[0].complete).not.toBe(single.request.facts[0].dedup.complete);
  });

  it('models five distinct drafts, claims, keys and readbacks under one unscheduled plan', () => {
    expect(planCreateRequest.request_schema_version).toBe(1);
    expect(planCreateRequest.items.map((item) => item.position)).toEqual([1, 2, 3, 4, 5]);
    expect(planCreateRequest.items.every((item) => item.scheduled_at === null)).toBe(true);
    expect(claimRequest.limit).toBe(1);
    expect(claimRequest.lease_minutes).toBe(30);
    const keys = new Set<string>();
    const posts = new Set<string>();
    const factIds = new Set<string>();
    for (const example of batch) {
      validate('saveRequest', example.request);
      validate('saveResponse', example.response);
      validate('findResponse', example.findResponse);
      keys.add(example.request.operation_key);
      posts.add(example.response.data.post.post_public_id);
      expect(example.request.expected_catalog_version).toBe(
        example.findResponse.data.catalog_version,
      );
      expect(example.request.plan_item).not.toBeNull();
      expect(example.readRequest.post_public_id).toBe(example.response.data.post.post_public_id);
      for (const binding of example.readbackProjection.fact_bindings)
        factIds.add(binding.fact_public_id);
    }
    expect(keys.size).toBe(5);
    expect(posts.size).toBe(5);
    expect(factIds.size).toBe(25);
    expect(batch[4].response.data.plan?.status).toBe('completed');
  });

  it('preserves three successful readbacks in a five-item partial result', () => {
    validate('planResult', partialProgress);
    expect(Object.values(partialProgress.progress).reduce((a, b) => a + b, 0)).toBe(5);
    expect(partialProgress.progress.completed).toBe(3);
    const completedIds = batch.slice(0, 3).map((example) => example.readRequest.post_public_id);
    expect(new Set(completedIds).size).toBe(3);
    expect(
      batch.slice(3).some((example) => completedIds.includes(example.readRequest.post_public_id)),
    ).toBe(false);
  });

  it('distinguishes committed same-key replay after claim expiry from a new expired-claim save', () => {
    validate('saveRequest', lostResponseReplay.request);
    validate('saveResponse', lostResponseReplay.response);
    expect(lostResponseReplay.observation.original_committed).toBe(true);
    expect(lostResponseReplay.observation.claim_expired_now).toBe(true);
    expect(lostResponseReplay.request).toEqual(batch[3].request);
    expect(lostResponseReplay.response.data.replayed).toBe(true);
    expect(lostResponseReplay.response.data.post).toEqual(batch[3].response.data.post);
    validate('saveRequest', newSaveExpired.request);
    validateDiagnostic(newSaveExpired.response);
    expect(newSaveExpired.observation.original_committed).toBe(false);
    expect(newSaveExpired.request.operation_key).not.toBe(lostResponseReplay.request.operation_key);
    expect(newSaveExpired.response.error.code).toBe('PLAN_ITEM_CLAIM_EXPIRED');
    expect(newSaveExpired.response.error.write_outcome).toBe('rolled_back');
  });

  it('retains all five canonical IDs for a same-meaning revision and keeps approval separate', () => {
    expect(reviseRequest.facts.map((f) => f.dedup.fact_public_id)).toEqual(
      single.readbackProjection.fact_bindings.map((f) => f.fact_public_id),
    );
    expect(reviseResponse.data.post.revision).toBe(2);
    expect(reviseResponse.data.post.status).toBe('draft');
    expect(approvalRequest.request_schema_version).toBe(1);
    expect(approvalRequest.explicit_approval).toBe(true);
    expect(approvalRequest.expected_content_hash).toBe(single.response.data.post.content_hash);
    expect(single.request).not.toHaveProperty('explicit_approval');
    const needsRevision = structuredClone(single.request);
    needsRevision.editorial_checks.meaning_preserved = 'needs_revision';
    validate('saveRequest', needsRevision);
    // Structurally valid attestation; the domain must reject it in Phase 4, not store a partial draft.
    expect(errors.editorial.error.code).toBe('QUALITY_EDITORIAL_INCOMPLETE');
  });
});

describe('P1 error taxonomy and legacy compatibility', () => {
  it('covers the registered catalog plus three planned v2 tools without duplicate or missing names', () => {
    const directory = join(root, 'supabase/functions/mcp');
    const registered = readdirSync(directory)
      .filter((name) => name.endsWith('.ts') && !name.endsWith('_test.ts'))
      .flatMap((name) => {
        const source = readFileSync(join(directory, name), 'utf8');
        const arrays = [
          ...source.matchAll(/export const \w+_TOOL_NAMES = \[([\s\S]*?)\] as const/g),
        ];
        return arrays.flatMap((array) =>
          [...array[1].matchAll(/'([a-z][a-z0-9_]+)'/g)].map((match) => match[1]),
        );
      });
    const names = taxonomy.groups.flatMap((g) => [...g.reads, ...g.writes]);
    expect(new Set(names).size).toBe(names.length);
    expect(new Set(names)).toEqual(
      new Set([...registered, 'trivia_find_similar_facts_v2', 'save_post_v2', 'revise_post_v2']),
    );
    expect(reads.size).toBe(12);
    expect(writes.size).toBe(24);
    for (const group of taxonomy.groups) {
      expect(group.domain_codes.length).toBeGreaterThan(0);
      for (const code of [...taxonomy.global_codes, ...taxonomy.write_codes, ...group.domain_codes])
        expect(categories.has(code)).toBe(true);
    }
  });

  it('categorizes every current v1 stable code and gives new codes an existing legacy fallback', () => {
    const source = readFileSync(join(root, 'supabase/functions/mcp/foundation.ts'), 'utf8');
    const block = source.match(/const safeErrors = \{([\s\S]*?)\n\} as const;/);
    assert(block);
    const legacy = new Set([...block[1].matchAll(/^ {2}([A-Z_]+):/gm)].map((m) => m[1]));
    const listed = Object.values(taxonomy.categories).flat();
    expect(new Set(listed).size).toBe(listed.length);
    expect(new Set(listed)).toEqual(
      new Set([
        ...legacy,
        ...Object.keys(taxonomy.new_codes),
        ...Object.keys(taxonomy.existing_contract_codes),
      ]),
    );
    for (const fallback of [
      ...Object.values(taxonomy.new_codes),
      ...Object.values(taxonomy.existing_contract_codes),
    ])
      expect(legacy.has(fallback)).toBe(true);
    for (const canonical of Object.values(taxonomy.module_aliases))
      expect(categories.has(canonical)).toBe(true);
    const sql = readFileSync(
      join(root, 'supabase/migrations/20261011164412_phase_5_6_post_transaction_foundation.sql'),
      'utf8',
    ).split('create function internal.post_raise_v1')[1];
    const allowed = sql.match(/if message=any\(array\[([\s\S]*?)\]\)/);
    assert(allowed);
    for (const [, code] of allowed[1].matchAll(/'([A-Z_]+)'/g))
      expect(categories.has(code)).toBe(true);
    validate('legacyErrorResponse', legacyError);
    validate('legacyErrorResponse', {
      ...legacyError,
      error: {
        ...legacyError.error,
        current: {
          post_public_id: single.response.data.post.post_public_id,
          status: 'draft',
          revision: 1,
        },
      },
    });
    validate('legacyErrorResponse', legacyOutputUncertain.structuredContent);
    expect(legacyOutputUncertain.structuredContent.error.code).toBe(
      taxonomy.new_codes.RPC_RESPONSE_INVALID,
    );
    expect(legacyOutputUncertain.content[0].text).toContain('save_post | output');
    expect(legacyOutputUncertain.content[0].text).toContain('unknown | diag-fixture-002');
    expect(legacyOutputUncertain.structuredContent.error).not.toHaveProperty('stage');
    expect(() => validate('errorResponse', legacyError)).toThrow();
    expect(() => validate('legacyErrorResponse', errors.reuse)).toThrow();
    expect(() =>
      validate('legacyErrorResponse', {
        ...legacyError,
        error: { ...legacyError.error, stage: 'domain' },
      }),
    ).toThrow();
  });

  it('does not narrow legacy public IDs to v4 while operation keys remain UUID v4', () => {
    const uuid7 = 'a0000000-0000-7000-8000-000000000001';
    validate('uuid', uuid7);
    expect(() => validate('operationKey', uuid7)).toThrow();
  });

  it.each(Object.entries(errors))('validates the %s diagnostic example', (_name, response) => {
    validateDiagnostic(response);
  });

  it('checks inherited auth/input/output coverage for every Read and Write, not just v2', () => {
    for (const group of taxonomy.groups) {
      for (const tool of [...group.reads, ...group.writes]) {
        const isWrite = writes.has(tool);
        for (const stage of ['input', 'auth', 'rate_limit', 'rpc_transport', 'output']) {
          const code =
            stage === 'auth'
              ? 'FORBIDDEN'
              : stage === 'input'
                ? 'VALIDATION_FAILED'
                : stage === 'rate_limit'
                  ? 'RATE_LIMITED'
                  : stage === 'output'
                    ? 'RPC_RESPONSE_INVALID'
                    : 'RPC_TIMEOUT';
          const outcome = !isWrite
            ? 'not_applicable'
            : ['rpc_transport', 'output'].includes(stage)
              ? 'unknown'
              : 'not_started';
          const response = errorExample(code, categories.get(code)!, stage, outcome, tool);
          if (code === 'RATE_LIMITED')
            Object.assign(response.error, { retryable: true, retry_after_seconds: 60 });
          validateDiagnostic(response);
        }
      }
    }
  });

  it('rejects invalid certainty, missing rate delay, private payload and a category that guesses the wrong cause', () => {
    const wrong = structuredClone(errors.timeout);
    wrong.error.write_outcome = 'rolled_back';
    expect(() => validateDiagnostic(wrong)).toThrow();
    const noDelay = structuredClone(errors.rate) as unknown as ReturnType<typeof errorExample>;
    Reflect.deleteProperty(noDelay.error, 'retry_after_seconds');
    expect(() => validateDiagnostic(noDelay)).toThrow();
    const secret = structuredClone(errors.unknown);
    Object.assign(secret.error, { operation_key: 'must-not-be-in-a-response' });
    expect(() => validateDiagnostic(secret)).toThrow();
    expect(() =>
      validateDiagnostic({
        ...errors.unknown,
        error: { ...errors.unknown.error, category: 'input' },
      }),
    ).toThrow();
  });

  it('keeps host denial as an observation without an invented MCP result', () => {
    const observation = {
      stage: 'host',
      reached_mcp: false,
      message: 'Host menolak sebelum tool dipanggil.',
    };
    expect(observation).not.toHaveProperty('structuredContent');
    expect(observation).not.toHaveProperty('response_schema_version');
    expect(() => validate('errorResponse', observation)).toThrow();
  });
});
