// Issue #40: diagnostic categories only; no values, credentials or untrusted key
// names in emitted logs. This test operates entirely on simulated responses.
import * as z from 'npm:zod@4.3.6';
import { emitGetPostDiagnostic, invoke } from './foundation.ts';
import type { RequestContext } from './auth.ts';

const workspace = '44444444-4444-4444-8444-444444444444';
const fakeJwt = 'SUPERSENSITIVE_TOKEN_DO_NOT_LOG';
const fakeValue = 'SUPERSENSITIVE_SOURCE_VALUE_DO_NOT_LOG';
const context: RequestContext = {
  requestId: 'UNTRUSTED_REQUEST_' + fakeJwt,
  actorUserId: '11111111-1111-4111-8111-111111111111',
  oauthClientId: '33333333-3333-4333-8333-333333333333',
  workspacePublicId: workspace,
  accessToken: fakeJwt,
  supabaseUrl: 'http://127.0.0.1:54321',
  publishableKey: 'SENSITIVE_KEY_DO_NOT_LOG',
};
const schema = z.strictObject({
  response_schema_version: z.literal(1),
  data: z.strictObject({
    post: z.strictObject({
      fact_bindings: z.array(
        z.strictObject({
          source_snapshot: z.strictObject({
            numbers: z.array(z.strictObject({ value: z.string(), unit: z.string().nullable() })),
          }),
        }),
      ),
    }),
  }),
});

function check(ok: unknown, label: string): asserts ok {
  if (!ok) throw new Error(label);
}
Deno.test(
  'Issue #40 diagnostics are opt-in, phase-aware, and redact all untrusted content',
  async () => {
    const originalFetch = globalThis.fetch;
    const originalInfo = console.info;
    const prior = Deno.env.get('MCP_GET_POST_DIAGNOSTICS');
    const logs: string[] = [];
    const allEmitted: string[] = [];
    console.info = (...args: unknown[]) => {
      const record = args.map(String).join(' ');
      logs.push(record);
      allEmitted.push(record);
    };
    const invokeFixture = async (response: () => Response | Promise<Response>) => {
      globalThis.fetch = (() => Promise.resolve(response())) as typeof fetch;
      return await invoke(
        'get_post',
        context,
        { p_request_schema_version: 1, p_workspace_public_id: workspace },
        schema,
      );
    };
    try {
      Deno.env.delete('MCP_GET_POST_DIAGNOSTICS');
      await invokeFixture(() => new Response(fakeValue, { status: 200 }));
      check(logs.at(0) === undefined, 'DIAGNOSTICS_MUST_BE_DEFAULT_OFF');

      Deno.env.set('MCP_GET_POST_DIAGNOSTICS', '1');
      const bad = await invokeFixture(
        () =>
          new Response(
            JSON.stringify({
              response_schema_version: 1,
              data: {
                post: {
                  fact_bindings: [
                    {
                      source_snapshot: {
                        numbers: [{ value: 42, unit: null, [fakeValue]: fakeValue }],
                      },
                    },
                  ],
                },
              },
            }),
            { status: 200 },
          ),
      );
      check('isError' in bad, 'STRICT_VALIDATION_MUST_STAY_MASKED');
      check(logs.at(0) !== undefined, 'INVALID_SCHEMA_EVENT_REQUIRED');
      const parsed = JSON.parse(logs[0]!) as {
        category: string;
        issues: Array<{ path: string; code: string }>;
        request_id: string;
        body_bytes: number;
        http_status: number;
      };
      check(parsed.category === 'invalid_schema', 'INVALID_SCHEMA_CATEGORY');
      check(parsed.issues[0]?.path.includes('source_snapshot.numbers.[]'), 'PATH_CLASSIFICATION');
      check(
        parsed.issues.every((issue) => !issue.path.includes(fakeValue)),
        'NO_RAW_ZOD_PATH',
      );
      check(parsed.body_bytes > 0 && parsed.http_status === 200, 'VALID_STATUS_BYTES');
      check(parsed.request_id === 'unavailable', 'UNTRUSTED_REQUEST_ID_REDACTED');

      logs.length = 0;
      const huge = await invokeFixture(
        () => new Response(fakeValue.repeat(20000), { status: 200 }),
      );
      check('isError' in huge, 'SIZE_LIMIT_STILL_ENFORCED');
      check(
        logs.some((record) => record.includes('response_too_large')),
        'SIZE_EVENT',
      );

      logs.length = 0;
      await invokeFixture(() => new Response('{', { status: 200 }));
      check(
        logs.some((record) => record.includes('invalid_json')),
        'JSON_EVENT',
      );

      logs.length = 0;
      await invokeFixture(() => new Response('{"message":"temporary"}', { status: 503 }));
      check(
        logs.some((record) => record.includes('rpc_http_error')),
        'HTTP_ERROR_EVENT',
      );

      logs.length = 0;
      emitGetPostDiagnostic('get_post', context, 'invalid_schema', 200, 10, [
        { code: fakeValue, path: [fakeValue, 0, 'source_snapshot', 'numbers'] },
      ]);
      check(logs.at(0) !== undefined, 'EXPLICIT_EVENT');
      check(logs[0]!.includes('[field]'), 'UNTRUSTED_KEYS_REDACTED');
      check(logs[0]!.includes('unknown'), 'UNTRUSTED_CODES_REDACTED');

      for (const line of allEmitted) {
        check(!line.includes(fakeJwt), 'JWT_NOT_LOGGED');
        check(!line.includes(fakeValue), 'CONTENT_NOT_LOGGED');
        check(!line.includes(context.publishableKey), 'API_KEY_NOT_LOGGED');
      }
    } finally {
      if (prior === undefined) Deno.env.delete('MCP_GET_POST_DIAGNOSTICS');
      else Deno.env.set('MCP_GET_POST_DIAGNOSTICS', prior);
      globalThis.fetch = originalFetch;
      console.info = originalInfo;
    }
  },
);
